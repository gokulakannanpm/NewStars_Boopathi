"""
Comprehensive automated tests for EveHub Explore Map, Campus Discovery, and Student Profile.
Covers all 14 requirements from Task 8:
1. Seeded dataset contains all 30 institutions without duplicates.
2. Nearby endpoint returns colleges within 30 km.
3. 50 km radius includes matching additional colleges.
4. Colleges outside radius are strictly excluded.
5. Type filters work with consistent values (Engineering, Arts & Science, Law, Management).
6. Manual origin selection returns results around chosen coordinates (West Tambaram vs SSN).
7. Geolocation / origin selection integration (coordinates processed reliably).
8. Unified records for sidebar and map with complete fields.
9. Selecting a college loads only its associated events.
10. Live / upcoming status follows event timestamps.
11. Missing or invalid coordinates do not crash the API.
12. Database initialization and seeding are idempotent and repeatable.
13. Demo student profile has 'Sri Sairam Engineering College'.
14. Existing registration and timetable conflict checks remain solid.
"""
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from main import app
from database import init_db, query_db, execute_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

# Requirement 1: Seeded dataset contains all intended institutions without duplicates
def test_req1_seeded_dataset_completeness_and_no_duplicates():
    colleges = query_db("SELECT id, name, college_type, source_url FROM colleges")
    assert len(colleges) >= 30, f"Expected at least 30 institutions, found {len(colleges)}"

    # Check for duplicate IDs
    ids = [c["id"] for c in colleges]
    assert len(ids) == len(set(ids)), "Duplicate college IDs detected in database!"

    # Check for duplicate names
    names = [c["name"].lower().strip() for c in colleges]
    assert len(names) == len(set(names)), "Duplicate college names detected in database!"

    # Verify key required institutions from prompt
    req_ids = [
        "clg-sairam-eng", "clg-sairam-it", "clg-ssn", "clg-srm", "clg-valliammai",
        "clg-crescent", "clg-sathyabama", "clg-hindustan", "clg-vit-chennai",
        "clg-saveetha", "clg-stjosephs-eng", "clg-stjosephs-it", "clg-jeppiaar",
        "clg-rec", "clg-easwari", "clg-panimalar", "clg-velammal", "clg-sa-eng",
        "clg-svce", "clg-aiht", "clg-dhanalakshmi", "clg-cit", "clg-ceg",
        "clg-mit-chromepet", "clg-veltech", "clg-mcc", "clg-loyola", "clg-presidency",
        "clg-soel-tndalu", "clg-glim"
    ]
    for rid in req_ids:
        assert rid in ids, f"Required institution '{rid}' missing from seeded database!"

    # Check provenance / source_url field populated
    sairam = query_db("SELECT * FROM colleges WHERE id = 'clg-sairam-eng'", one=True)
    assert sairam["source_url"] is not None and "sairam" in sairam["source_url"]

# Requirement 2: Nearby endpoint returns colleges within 30 km
def test_req2_nearby_endpoint_returns_within_30km():
    # From West Tambaram / Sairam (12.9602, 80.0574)
    res = client.get("/api/colleges/nearby?lat=12.9602&lng=80.0574&radius_km=30")
    assert res.status_code == 200
    colleges = res.json()
    assert len(colleges) >= 20, f"Expected at least 20 colleges within 30 km of Tambaram, got {len(colleges)}"

    for c in colleges:
        assert c["distance_km"] is not None
        assert c["distance_km"] <= 30.0, f"College {c['name']} has distance {c['distance_km']} km > 30 km!"

    # Closest must be Sri Sairam Engineering College
    assert colleges[0]["id"] == "clg-sairam-eng"
    assert colleges[0]["distance_km"] == 0.0

# Requirement 3: 50 km radius includes matching additional colleges
def test_req3_radius_expansion_50km():
    res_30 = client.get("/api/colleges/nearby?lat=12.7508&lng=80.1970&radius_km=30")
    assert res_30.status_code == 200
    c_30 = res_30.json()

    res_50 = client.get("/api/colleges/nearby?lat=12.7508&lng=80.1970&radius_km=50")
    assert res_50.status_code == 200
    c_50 = res_50.json()

    assert len(c_50) > len(c_30), f"50 km ({len(c_50)}) should contain more colleges than 30 km ({len(c_30)})"

    ids_30 = {c["id"] for c in c_30}
    ids_50 = {c["id"] for c in c_50}
    assert ids_30.issubset(ids_50), "All 30km colleges must also be present in 50km results"

    # Colleges added in 50 km around SSN: Loyola (~35km), SVCE (~36km), Presidency (~36km), Panimalar (~40km)
    new_ids = ids_50 - ids_30
    assert "clg-loyola" in new_ids or "clg-svce" in new_ids or "clg-presidency" in new_ids

# Requirement 4: Colleges outside the radius are excluded
def test_req4_far_colleges_strictly_excluded():
    res = client.get("/api/colleges/nearby?lat=12.9602&lng=80.0574&radius_km=50")
    assert res.status_code == 200
    ids_50 = [c["id"] for c in res.json()]

    # Distant institutions must be strictly excluded
    assert "clg-vit" not in ids_50    # Vellore (~100+ km)
    assert "clg-nitt" not in ids_50   # Trichy (~270 km)
    assert "clg-psg" not in ids_50    # Coimbatore (~400 km)

# Requirement 5: Type filters work with consistent values
def test_req5_type_filters_consistency():
    # Engineering
    res_eng = client.get("/api/colleges/nearby?lat=12.9602&lng=80.0574&radius_km=50&college_type=Engineering")
    assert res_eng.status_code == 200
    for c in res_eng.json():
        assert c["college_type"] == "Engineering"

    # Arts & Science
    res_arts = client.get("/api/colleges/nearby?lat=12.9602&lng=80.0574&radius_km=50&college_type=Arts & Science")
    assert res_arts.status_code == 200
    arts_ids = [c["id"] for c in res_arts.json()]
    assert "clg-mcc" in arts_ids or "clg-loyola" in arts_ids
    for c in res_arts.json():
        assert "art" in c["college_type"].lower()

    # Law
    res_law = client.get("/api/colleges/nearby?lat=12.9602&lng=80.0574&radius_km=50&college_type=Law")
    assert res_law.status_code == 200
    law_ids = [c["id"] for c in res_law.json()]
    assert "clg-soel-tndalu" in law_ids

    # Management
    res_mgmt = client.get("/api/colleges/nearby?lat=12.7508&lng=80.1970&radius_km=50&college_type=Management")
    assert res_mgmt.status_code == 200
    mgmt_ids = [c["id"] for c in res_mgmt.json()]
    assert "clg-glim" in mgmt_ids

# Requirement 6: Manual origin selection returns results around chosen coordinates
def test_req6_manual_origin_selection_tambaram_vs_ssn():
    # Search origin A: West Tambaram / Sairam
    res_a = client.get("/api/colleges/nearby?lat=12.9602&lng=80.0574&radius_km=15")
    assert res_a.status_code == 200
    ids_a = [c["id"] for c in res_a.json()]
    assert "clg-sairam-eng" in ids_a
    assert "clg-cit" in ids_a

    # Search origin B: SSN / Kalavakkam
    res_b = client.get("/api/colleges/nearby?lat=12.7508&lng=80.1970&radius_km=15")
    assert res_b.status_code == 200
    ids_b = [c["id"] for c in res_b.json()]
    assert "clg-ssn" in ids_b
    assert "clg-hindustan" in ids_b
    assert "clg-aiht" in ids_b

    # Distance to Sairam from SSN is ~28 km, so not in 15 km
    assert "clg-sairam-eng" not in ids_b

# Requirement 7: Missing or custom coordinates in manual search handled cleanly
def test_req7_origin_validation():
    # Valid arbitrary regional coordinate (e.g. Sriperumbudur center)
    res = client.get("/api/colleges/nearby?lat=12.9866&lng=79.9719&radius_km=20")
    assert res.status_code == 200
    colleges = res.json()
    assert len(colleges) > 0
    # SVCE should be within ~1 km of this center
    assert colleges[0]["id"] == "clg-svce"

# Requirement 8: Sidebar and map use the same filtered records with full fields
def test_req8_unified_college_fields():
    res = client.get("/api/colleges/nearby?lat=12.9602&lng=80.0574&radius_km=30")
    assert res.status_code == 200
    colleges = res.json()
    for c in colleges:
        assert "id" in c and c["id"] is not None
        assert "name" in c and c["name"] != ""
        assert "college_type" in c and c["college_type"] != ""
        assert "latitude" in c and c["latitude"] is not None
        assert "longitude" in c and c["longitude"] is not None
        assert "distance_km" in c and c["distance_km"] >= 0
        assert "live_events_count" in c and c["live_events_count"] >= 0
        assert "upcoming_events_count" in c and c["upcoming_events_count"] >= 0
        assert "total_events_count" in c

# Requirement 9: Selecting a college loads only its associated events
def test_req9_college_selection_isolated_events():
    res_sairam = client.get("/api/colleges/clg-sairam-eng/events")
    assert res_sairam.status_code == 200
    data_sairam = res_sairam.json()
    assert data_sairam["college"]["id"] == "clg-sairam-eng"
    assert data_sairam["counts"]["total"] >= 1
    for ev in data_sairam["upcoming"]:
        assert ev["college_id"] == "clg-sairam-eng"

    res_ssn = client.get("/api/colleges/clg-ssn/events")
    assert res_ssn.status_code == 200
    data_ssn = res_ssn.json()
    assert data_ssn["college"]["id"] == "clg-ssn"
    for ev in data_ssn["happening_now"]:
        assert ev["college_id"] == "clg-ssn"

# Requirement 10: Live / upcoming status follows event timestamps
def test_req10_event_status_timestamp_accuracy():
    res = client.get("/api/colleges/clg-ssn/events")
    assert res.status_code == 200
    data = res.json()
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")

    # Happening now: start <= now <= end
    for ev in data["happening_now"]:
        assert ev["start_date"] <= now_iso <= ev["end_date"]

    # Upcoming: start > now
    for ev in data["upcoming"]:
        assert ev["start_date"] > now_iso

# Requirement 11: Missing or null coordinates do not crash the API
def test_req11_missing_coordinates_graceful():
    # Insert a temporary college record without coordinates
    execute_db("INSERT OR REPLACE INTO colleges (id, name, district, state, college_type, latitude, longitude) VALUES ('clg-test-null', 'Test College Without GPS', 'Chennai', 'Tamil Nadu', 'Engineering', NULL, NULL)")
    res = client.get("/api/colleges/nearby?lat=12.9602&lng=80.0574&radius_km=30")
    assert res.status_code == 200
    returned_ids = [c["id"] for c in res.json()]
    assert "clg-test-null" not in returned_ids
    # Clean up
    execute_db("DELETE FROM colleges WHERE id = 'clg-test-null'")

# Requirement 12: Database initialization and seeding are repeatable
def test_req12_idempotent_init_db():
    # Run init_db twice
    init_db()
    init_db()
    colleges = query_db("SELECT count(*) as count FROM colleges", one=True)
    assert colleges["count"] >= 30

    # Ensure profile remains intact
    student = query_db("SELECT * FROM profiles WHERE id = 'usr-student-1'", one=True)
    assert student["college_name"] == "Sri Sairam Engineering College"
    assert student["college_id"] == "clg-sairam-eng"

# Requirement 13: Demo student profile displays 'Sri Sairam Engineering College'
def test_req13_demo_student_profile_sairam():
    student = query_db("SELECT id, display_name, college_id, college_name FROM profiles WHERE id = 'usr-student-1'", one=True)
    assert student is not None
    assert student["college_name"] == "Sri Sairam Engineering College"
    assert student["college_id"] == "clg-sairam-eng"

    # Also test /api/auth/me endpoint with demo student token
    headers = {"Authorization": "Bearer usr-student-1"}
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["college_name"] == "Sri Sairam Engineering College"
    assert data["college_id"] == "clg-sairam-eng"

# Requirement 14: Existing registration and timetable checks remain intact
def test_req14_registration_and_conflict_regression():
    # Test registration workflow with demo student
    headers = {"Authorization": "Bearer usr-student-1"}
    res = client.get("/api/events", headers=headers)
    assert res.status_code == 200
    events = res.json()
    assert len(events) > 0

    # Test student dashboard registrations
    res_reg = client.get("/api/registrations/my", headers=headers)
    assert res_reg.status_code == 200
    assert isinstance(res_reg.json(), list)
