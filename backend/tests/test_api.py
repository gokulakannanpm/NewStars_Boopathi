import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app
from conflict_engine import check_event_conflict, calculate_haversine_distance_km

client = TestClient(app)

def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "EveHub" in data["app"]

def test_list_colleges():
    res = client.get("/api/colleges")
    assert res.status_code == 200
    colleges = res.json()
    assert len(colleges) >= 5
    names = [c["short_name"] for c in colleges]
    assert "IIT Madras" in names or "CEG Anna Univ" in names

def test_list_events_filtering():
    res = client.get("/api/events?category=Hackathon")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    for item in data["items"]:
        assert item["category"] == "Hackathon"

def test_haversine_distance():
    # Distance between IIT Madras (12.9915, 80.2337) and Anna Univ CEG (13.0109, 80.2354) is ~2-3 km
    dist = calculate_haversine_distance_km(12.9915, 80.2337, 13.0109, 80.2354)
    assert 1.5 <= dist <= 3.5

def test_conflict_detection_math():
    # Test 1: Overlapping intervals
    # Event: 2026-10-28 09:00 to 17:00
    # Class: 2026-10-28 10:00 to 12:00 -> CONFLICT
    timetable = [{
        "id": "t1",
        "title": "Database Exam",
        "date": "2026-10-28",
        "start_time": "10:00",
        "end_time": "12:00"
    }]
    res = check_event_conflict("2026-10-28T09:00:00", "2026-10-28T17:00:00", timetable)
    assert res.status == "conflict"
    assert len(res.conflicting_entries) == 1
    assert "Database Exam" in res.overlapping_intervals[0]

    # Test 2: Non-overlapping interval (Exact boundary: class ends 09:00, event starts 09:00)
    timetable_boundary = [{
        "id": "t2",
        "title": "Morning PT",
        "date": "2026-10-28",
        "start_time": "08:00",
        "end_time": "09:00"
    }]
    res_boundary = check_event_conflict("2026-10-28T09:00:00", "2026-10-28T17:00:00", timetable_boundary)
    assert res_boundary.status == "no_conflict"

    # Test 3: Malformed date -> unknown
    res_malformed = check_event_conflict("invalid-date", "2026-10-28T17:00:00", timetable)
    assert res_malformed.status == "unknown"

def test_public_certificate_verification():
    from database import execute_db
    execute_db("UPDATE certificates SET status = 'valid' WHERE certificate_id = 'EVH-2026-IIT099'")

    # Pre-seeded certificate EVH-2026-IIT099
    res = client.get("/api/certificates/verify/EVH-2026-IIT099")
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert data["certificate_id"] == "EVH-2026-IIT099"
    assert "IIT Madras" in data["college_name"]
    assert data["student_name"] == "Gokul Kannan"

    # Non-existent certificate
    res_fake = client.get("/api/certificates/verify/EVH-FAKE-000")
    assert res_fake.status_code == 200
    assert res_fake.json()["valid"] is False

def test_attendance_checkin():
    from database import execute_db
    # Ensure un-checked-in registration with token EVH-CHK-KURUKS-9081 exists
    execute_db("""
    UPDATE event_registrations
    SET attendance_status = 'registered', attended_at = NULL, qr_checkin_token = 'EVH-CHK-KURUKS-9081'
    WHERE id = 'reg-1'
    """)

    organizer_headers = {"Authorization": "Bearer usr-organizer-1"}
    # Test valid check-in with token EVH-CHK-KURUKS-9081 (pre-seeded) as authorized organizer
    res = client.post("/api/attendance/checkin", json={
        "token_or_registration_id": "EVH-CHK-KURUKS-9081",
        "manual": False,
        "status": "attended"
    }, headers=organizer_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "Gokul Kannan" in data["student_name"]

    # Duplicate check-in should indicate already checked in
    res2 = client.post("/api/attendance/checkin", json={
        "token_or_registration_id": "EVH-CHK-KURUKS-9081",
        "manual": False,
        "status": "attended"
    }, headers=organizer_headers)
    assert res2.status_code == 200
    assert res2.json()["already_checked_in"] is True

def test_attendance_role_authorization():
    # Calling checkin as student must return 403 Forbidden
    student_headers = {"Authorization": "Bearer usr-student-1"}
    res = client.post("/api/attendance/checkin", json={
        "token_or_registration_id": "EVH-CHK-KURUKS-9081",
        "manual": False,
        "status": "attended"
    }, headers=student_headers)
    assert res.status_code == 403
    assert "Only verified organizers" in res.json()["detail"]

def test_reregistration_after_cancellation():
    from database import execute_db
    headers = {"Authorization": "Bearer usr-student-1"}
    event_id = "evt-psg-kriya-ev"

    # Reset any lingering registration from previous test runs and ensure available capacity
    execute_db("DELETE FROM event_registrations WHERE event_id = ? AND student_id = 'usr-student-1'", (event_id,))
    execute_db("UPDATE events SET registered_count = 50 WHERE id = ?", (event_id,))

    # Step 1: Register for event
    res1 = client.post(f"/api/events/{event_id}/register", json={}, headers=headers)
    assert res1.status_code == 200
    reg_id = res1.json()["registration_id"]

    # Step 2: Cancel registration
    res2 = client.post(f"/api/registrations/cancel/{reg_id}", headers=headers)
    assert res2.status_code == 200

    # Step 3: Re-register (must succeed without sqlite3.IntegrityError)
    res3 = client.post(f"/api/events/{event_id}/register", json={}, headers=headers)
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["success"] is True
    assert data3["registration_id"] == reg_id
    assert data3["checkin_token"].startswith("EVH-CHK-")

def test_certificate_attendance_eligibility_and_revocation():
    from database import execute_db
    org_headers = {"Authorization": "Bearer usr-organizer-1"}

    # Attempt to issue certificate to student who did not attend event evt-shaastra-ai
    res = client.post("/api/certificates/issue", json={
        "event_id": "evt-shaastra-ai",
        "student_id": "usr-student-1",
        "certificate_type": "Excellence",
        "signatory_title": "HOD CSE",
        "signatory_name": "Dr. Ramanathan"
    }, headers=org_headers)
    assert res.status_code == 400
    assert "has not attended this event" in res.json()["detail"]

    # Test revocation of pre-seeded certificate EVH-2026-IIT099
    res_revoke = client.post("/api/certificates/EVH-2026-IIT099/revoke?reason=Audit+Test+Revocation", headers=org_headers)
    assert res_revoke.status_code == 200
    assert res_revoke.json()["status"] == "revoked"

    # Verify public verification now reflects revoked status
    res_verify = client.get("/api/certificates/verify/EVH-2026-IIT099")
    assert res_verify.status_code == 200
    assert res_verify.json()["valid"] is False
    assert res_verify.json()["status"] == "revoked"

    # Restore validity for EVH-2026-IIT099 to keep public verification tests idempotent
    execute_db("UPDATE certificates SET status = 'valid' WHERE certificate_id = 'EVH-2026-IIT099'")

def test_waitlist_offer_accept_and_decline():
    from database import query_db, execute_db
    student_headers = {"Authorization": "Bearer usr-student-1"}
    event_id = "evt-ssn-cloud-devops"

    # Clean previous test entries for this event
    execute_db("DELETE FROM waitlist_entries WHERE event_id = ? AND student_id = 'usr-student-1'", (event_id,))
    execute_db("DELETE FROM event_registrations WHERE event_id = ? AND student_id = 'usr-student-1'", (event_id,))

    # 1. Join waitlist for event
    join_res = client.post(f"/api/events/{event_id}/waitlist", headers=student_headers)
    assert join_res.status_code == 200

    # 2. Query waitlist entry from DB
    entry = query_db("SELECT id FROM waitlist_entries WHERE event_id = ? AND student_id = 'usr-student-1'", (event_id,), one=True)
    assert entry is not None
    wt_id = entry["id"]

    # Manually promote to 'offered' to test accept workflow
    execute_db("UPDATE waitlist_entries SET status = 'offered' WHERE id = ?", (wt_id,))

    # Accept the offer
    accept_res = client.post(f"/api/waitlist/{wt_id}/accept", headers=student_headers)
    assert accept_res.status_code == 200
    assert accept_res.json()["success"] is True
    assert accept_res.json()["checkin_token"].startswith("EVH-CHK-")
