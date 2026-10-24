import os
import io
import time
import pytest
import concurrent.futures
from fastapi.testclient import TestClient
from main import app, create_access_token, JWT_SECRET, JWT_ALGORITHM
import database as db
import jwt

client = TestClient(app)

def test_bcrypt_hashing_and_jwt_security():
    """Verify passwords are authenticated via bcrypt and tokens are signed HS256 JWTs."""
    # 1. Login with demo student (password: evehub123)
    resp = client.post("/api/auth/login", json={"email": "student@evehub.in", "password": "evehub123"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    token = data["token"]

    # 2. Decode JWT to verify cryptographic signature
    decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    assert decoded["sub"] == "usr-student-1"
    assert decoded["role"] == "student"
    assert "exp" in decoded

    # 3. Tampered JWT should fail
    tampered_token = token[:-4] + "fake"
    bad_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert bad_resp.status_code == 401

def test_role_enforcement_and_security_boundaries():
    """Verify that student role is forbidden from performing organizer administrative operations."""
    student_headers = {"Authorization": "Bearer usr-student-1"}

    # Attempt to complete an event as student
    r1 = client.post("/api/events/evt-kurukshetra-ceg/complete", headers=student_headers)
    assert r1.status_code == 403

    # Attempt to bulk issue certificates as student
    r2 = client.post("/api/certificates/bulk-issue", json={
        "event_id": "evt-kurukshetra-ceg",
        "template_id": "template_institutional",
        "certificate_type": "Participation",
        "signatory_name": "Dr. Arun",
        "signatory_title": "Convener"
    }, headers=student_headers)
    assert r2.status_code == 403

    # Attempt to check in an attendee as student
    r3 = client.post("/api/attendance/checkin", json={
        "token_or_registration_id": "EVH-CHK-KURUKS-9081",
        "manual": False,
        "status": "attended"
    }, headers=student_headers)
    assert r3.status_code == 403

    # Attempt to upload transport PDF as student
    r4 = client.post("/api/upload/transport-pdf", files={
        "file": ("test.pdf", b"%PDF-1.4...", "application/pdf")
    }, headers=student_headers)
    assert r4.status_code == 403

def test_file_upload_validation_and_rejection():
    """Verify file upload rejection for disallowed types and oversized payloads."""
    organizer_headers = {"Authorization": "Bearer usr-organizer-1"}

    # 1. Disallowed file extension (.sh) for poster
    bad_file = io.BytesIO(b"echo 'malicious script'")
    r_bad = client.post(
        "/api/upload/poster",
        files={"file": ("hack.sh", bad_file, "text/x-shellscript")},
        headers=organizer_headers
    )
    assert r_bad.status_code == 400
    assert "Invalid image type" in r_bad.json()["detail"]

    # 2. Oversized poster file (> 5MB)
    huge_data = b"0" * (5 * 1024 * 1024 + 1024)
    r_huge = client.post(
        "/api/upload/poster",
        files={"file": ("huge.png", io.BytesIO(huge_data), "image/png")},
        headers=organizer_headers
    )
    assert r_huge.status_code == 400
    assert "exceeds maximum allowed size" in r_huge.json()["detail"] or "5MB" in r_huge.json()["detail"]

def test_concurrent_registrations_last_available_seat():
    """
    Stress / Concurrency test:
    Create a micro-capacity event with capacity=1.
    Dispatch 5 concurrent registration requests simultaneously using thread pool.
    Verify: exactly 1 gets confirmed, 4 get waitlisted, capacity is not violated.
    """
    organizer_headers = {"Authorization": "Bearer usr-organizer-1"}

    # Create event with capacity 1
    create_payload = {
        "title": "High Concurrency Seminar",
        "description": "Testing atomic race condition on capacity.",
        "category": "Technical",
        "format": "offline",
        "start_date": "2026-11-20T10:00:00Z",
        "end_date": "2026-11-20T12:00:00Z",
        "registration_deadline": "2026-11-19T23:59:59Z",
        "venue": "Lab 1",
        "capacity": 1,
        "fee": 0
    }
    r = client.post("/api/events", json=create_payload, headers=organizer_headers)
    assert r.status_code == 200, r.text
    created_event_id = r.json()["id"]

    # Seed 5 temporary student users in profiles table
    conn = db.get_connection()
    c = conn.cursor()
    student_ids = []
    for i in range(5):
        s_id = f"usr-conc-stud-{i}-{int(time.time()*1000)}"
        student_ids.append(s_id)
        c.execute("""
            INSERT OR REPLACE INTO profiles (id, email, password_hash, display_name, role, college_id, college_name)
            VALUES (?, ?, ?, ?, 'student', 'clg-ssn', 'SSN College')
        """, (s_id, f"{s_id}@test.in", "hash", f"Student {i}"))
    conn.commit()
    conn.close()

    # Function to register
    def register_worker(stud_id):
        worker_client = TestClient(app)
        res = worker_client.post(
            f"/api/events/{created_event_id}/register",
            json={"ticket_type": "standard"},
            headers={"Authorization": f"Bearer {stud_id}"}
        )
        return stud_id, res.status_code, res.json()

    # Run simultaneously with 5 threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(register_worker, sid) for sid in student_ids]
        results = [f.result() for f in futures]

    confirmed_count = 0
    capacity_full_count = 0
    for sid, status_code, body in results:
        if status_code == 200:
            confirmed_count += 1
        elif status_code == 400 and "capacity reached" in str(body):
            capacity_full_count += 1

    # Exactly 1 student confirmed the single seat, remaining 4 rejected by atomic capacity lock
    assert confirmed_count == 1, f"Expected 1 confirmed seat, got {confirmed_count}"
    assert capacity_full_count == 4, f"Expected 4 capacity reached rejections, got {capacity_full_count}"

    # Verify event registered_count in db equals capacity (1)
    ev_resp = client.get(f"/api/events/{created_event_id}")
    assert ev_resp.json()["event"]["registered_count"] == 1

def test_concurrent_qr_scans_same_attendee():
    """
    Concurrency test:
    Simultaneous QR scans for the exact same attendee token.
    Verify: exactly 1 records attendance; the other detects already attended.
    """
    organizer_headers = {"Authorization": "Bearer usr-organizer-1"}

    # Register an attendee for an event
    event_id = "evt-kurukshetra-ceg"
    student_id = f"usr-scan-test-{int(time.time()*1000)}"

    conn = db.get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT OR REPLACE INTO profiles (id, email, password_hash, display_name, role, college_id, college_name)
        VALUES (?, ?, 'hash', 'Scan Test User', 'student', 'clg-ssn', 'SSN')
    """, (student_id, f"{student_id}@scan.in"))
    conn.commit()
    conn.close()

    reg_resp = client.post(
        f"/api/events/{event_id}/register",
        json={"ticket_type": "standard"},
        headers={"Authorization": f"Bearer {student_id}"}
    )
    assert reg_resp.status_code == 200, reg_resp.text
    token = reg_resp.json()["checkin_token"]

    def scan_worker():
        worker_client = TestClient(app)
        return worker_client.post(
            "/api/attendance/checkin",
            json={"token_or_registration_id": token, "event_id": event_id, "manual": False, "status": "attended"},
            headers=organizer_headers
        )

    # Fire 2 simultaneous checkin scans
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(scan_worker)
        f2 = executor.submit(scan_worker)
        r1 = f1.result()
        r2 = f2.result()

    assert r1.status_code == 200
    assert r2.status_code == 200
    data1 = r1.json()
    data2 = r2.json()

    # One must be newly recorded, one must be already checked in
    statuses = [data1.get("already_checked_in", False), data2.get("already_checked_in", False)]
    assert statuses.count(False) == 1, "Exactly one scan must record first-time attendance"
    assert statuses.count(True) == 1, "The simultaneous scan must detect duplicate attendance"

def test_team_checkin_resolution_and_bulk_checkin():
    """
    Verify Team Check-in workflow:
    - Register a team with 3 members
    - Resolve team token via /api/attendance/checkin
    - Check-in team members via /api/attendance/team-checkin
    - Re-checkin detects already attended members
    """
    organizer_headers = {"Authorization": "Bearer usr-organizer-1"}
    event_id = "evt-kurukshetra-ceg"

    # Register team
    team_lead_id = f"usr-tlead-{int(time.time()*1000)}"
    conn = db.get_connection()
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO profiles (id, email, password_hash, display_name, role) VALUES (?, ?, 'h', 'Team Lead', 'student')",
              (team_lead_id, f"{team_lead_id}@lead.in"))
    conn.commit()
    conn.close()

    team_members = [
        {"name": "Member One", "email": "m1@test.com", "college": "SSN"},
        {"name": "Member Two", "email": "m2@test.com", "college": "SSN"},
    ]
    reg_resp = client.post(
        f"/api/events/{event_id}/register",
        json={"ticket_type": "team", "is_team": True, "team_name": "RoboRaiders", "team_members": team_members},
        headers={"Authorization": f"Bearer {team_lead_id}"}
    )
    assert reg_resp.status_code == 200, reg_resp.text
    reg_data = reg_resp.json()
    assert reg_data["is_team"] is True
    team_qr = reg_data["team_qr_token"]
    assert team_qr is not None

    # Resolve team QR token
    resolve_resp = client.post(
        "/api/attendance/checkin",
        json={"token_or_registration_id": team_qr, "event_id": event_id},
        headers=organizer_headers
    )
    assert resolve_resp.status_code == 200, resolve_resp.text
    res_data = resolve_resp.json()
    assert res_data["is_team"] is True
    assert res_data["team_name"] == "RoboRaiders"
    members = res_data["members"]
    assert len(members) == 3  # lead + 2 members

    # Perform atomic team checkin for all 3
    reg_ids = [m["registration_id"] for m in members]
    team_checkin_resp = client.post(
        "/api/attendance/team-checkin",
        json={"event_id": event_id, "team_id": res_data["team_id"], "registration_ids": reg_ids},
        headers=organizer_headers
    )
    assert team_checkin_resp.status_code == 200, team_checkin_resp.text
    tc_data = team_checkin_resp.json()
    assert tc_data["checked_in_count"] == 3
    assert tc_data["already_attended_count"] == 0

    # Repeat team checkin: all should now be already attended
    repeat_resp = client.post(
        "/api/attendance/team-checkin",
        json={"event_id": event_id, "team_id": res_data["team_id"], "registration_ids": reg_ids},
        headers=organizer_headers
    )
    assert repeat_resp.status_code == 200, repeat_resp.text
    rep_data = repeat_resp.json()
    assert rep_data["checked_in_count"] == 0
    assert rep_data["already_attended_count"] == 3

def test_event_completion_and_public_certificate_collection():
    """
    Verify Event Completion lifecycle and public certificate collection directory:
    - Mark event complete -> status = 'closed', completed_at set
    - Bulk issue certificates to verified attendees
    - Public collection page endpoint returns issued certificates without student emails
    """
    organizer_headers = {"Authorization": "Bearer usr-organizer-1"}
    event_id = "evt-kurukshetra-ceg"

    # Conclude event
    comp_resp = client.post(f"/api/events/{event_id}/complete", headers=organizer_headers)
    assert comp_resp.status_code == 200, comp_resp.text
    event_data = comp_resp.json()["event"]
    assert event_data["status"] == "closed"
    assert event_data["completed_at"] is not None

    # Bulk issue certificates
    bulk_resp = client.post(
        "/api/certificates/bulk-issue",
        json={
            "event_id": event_id,
            "template_id": "template_modern",
            "certificate_type": "Participation",
            "signatory_name": "Dr. Arun Kumar",
            "signatory_title": "Convener & HOD"
        },
        headers=organizer_headers
    )
    assert bulk_resp.status_code == 200, bulk_resp.text
    bulk_data = bulk_resp.json()
    assert bulk_data["success"] is True

    # Public collection query
    pub_col_resp = client.get(f"/api/certificates/collection/{event_id}")
    assert pub_col_resp.status_code == 200, pub_col_resp.text
    col_data = pub_col_resp.json()
    assert col_data["event_id"] == event_id
    assert col_data["total_issued"] >= 1
    # Check certificate data does not expose email
    for item in col_data["certificates"]:
        assert "certificate_id" in item
        assert "student_name" in item
        assert "email" not in item
        assert "student_email" not in item

def test_transport_ask_ai_groundedness():
    """
    Verify Transport Ask AI answers:
    - Questions matching scheduled bus points return verified stops and page citations.
    - Questions about non-existent locations clearly state lack of information and do not invent stops.
    """
    # 1. Ask about existing known point (e.g. Tambaram)
    r1 = client.post("/api/transport/ask-ai", json={
        "event_id": "evt-shaastra-ai",
        "query": "What is the pickup timing at Tambaram bus stop?"
    })
    assert r1.status_code == 200, r1.text
    d1 = r1.json()
    assert d1["has_document"] is True
    assert "tambaram" in d1["answer"].lower()

    # 2. Ask about an unserved, non-existent landmark (e.g. Singapore or Kanyakumari)
    r2 = client.post("/api/transport/ask-ai", json={
        "event_id": "evt-shaastra-ai",
        "query": "Does the bus go to Kanyakumari Lighthouse?"
    })
    assert r2.status_code == 200, r2.text
    d2 = r2.json()
    # Must refuse / state not found in route schedule rather than inventing a route
    assert "does not contain" in d2["answer"].lower() or "not found" in d2["answer"].lower() or "no specific route" in d2["answer"].lower() or "not listed" in d2["answer"].lower()
