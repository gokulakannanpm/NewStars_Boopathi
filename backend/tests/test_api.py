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
    # Test valid check-in with token EVH-CHK-KURUKS-9081 (pre-seeded)
    res = client.post("/api/attendance/checkin", json={
        "token_or_registration_id": "EVH-CHK-KURUKS-9081",
        "manual": False,
        "status": "attended"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "Gokul Kannan" in data["student_name"]

    # Duplicate check-in should indicate already checked in
    res2 = client.post("/api/attendance/checkin", json={
        "token_or_registration_id": "EVH-CHK-KURUKS-9081",
        "manual": False,
        "status": "attended"
    })
    assert res2.status_code == 200
    assert res2.json()["already_checked_in"] is True
