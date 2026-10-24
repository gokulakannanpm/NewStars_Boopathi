"""
EveHub FastAPI Application.
Complete implementation of public, student, and organizer APIs.
"""
from fastapi import FastAPI, HTTPException, Header, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone, timedelta
import uuid
import json
import csv
import io
from typing import Optional, List, Dict, Any

from models import (
    UserProfile, RegisterRequest, LoginRequest, AuthResponse, ProfileUpdateRequest,
    Event, EventCreate, EventUpdate, EventRegistration, RegisterEventRequest,
    AttendanceCheckinRequest, TimetableEntry, TimetableCreate, ConflictDetectionResult,
    StudentQuestion, QuestionCreate, QuestionAnswer, WaitlistEntry,
    Certificate, CertificateIssueRequest, Notification, College
)
from database import init_db, query_db, execute_db
from conflict_engine import check_event_conflict, calculate_haversine_distance_km, parse_iso_datetime

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="EveHub API",
    description="Unified Inter-College Event Platform Backend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Auth Helpers ====================
def get_current_user(authorization: Optional[str] = Header(None)) -> UserProfile:
    """Extract user from bearer token or fallback demo student."""
    if not authorization:
        # Default to demo student for easy browsing
        user = query_db("SELECT * FROM profiles WHERE id = 'usr-student-1'", one=True)
        if user:
            return UserProfile(**user)
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.replace("Bearer ", "").strip()
    # If token is a user_id or demo token
    user = query_db("SELECT * FROM profiles WHERE id = ? OR email = ?", (token, token), one=True)
    if not user:
        # Check standard demo tokens
        if token == "demo-organizer":
            user = query_db("SELECT * FROM profiles WHERE role = 'organizer' LIMIT 1", one=True)
        else:
            user = query_db("SELECT * FROM profiles WHERE id = 'usr-student-1'", one=True)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid session or token")
    return UserProfile(**user)

# ==================== Health & Meta ====================
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": "EveHub API",
        "time": datetime.now(timezone.utc).isoformat(),
        "database": "SQLite / Supabase Bridge Ready"
    }

# ==================== Authentication Endpoints ====================
@app.post("/api/auth/register", response_model=AuthResponse)
def register(req: RegisterRequest):
    existing = query_db("SELECT id FROM profiles WHERE email = ?", (req.email.lower(),), one=True)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user_id = f"usr-{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    
    execute_db("""
    INSERT INTO profiles (id, email, password_hash, display_name, role, college_id, college_name, department, year, phone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, req.email.lower(), req.password, req.display_name, req.role,
        req.college_id, req.college_name, req.department, req.year, req.phone, now, now
    ))

    # Send welcome notification
    execute_db("""
    INSERT INTO notifications (id, recipient_id, title, message, type)
    VALUES (?, ?, ?, ?, ?)
    """, (
        f"notif-{uuid.uuid4().hex[:8]}", user_id, "Welcome to EveHub!",
        f"Account created successfully as {req.role.capitalize()}. Explore upcoming events across colleges.", "registration"
    ))

    user_record = query_db("SELECT * FROM profiles WHERE id = ?", (user_id,), one=True)
    return AuthResponse(user=UserProfile(**user_record), token=user_id)

@app.post("/api/auth/login", response_model=AuthResponse)
def login(req: LoginRequest):
    user = query_db("SELECT * FROM profiles WHERE email = ?", (req.email.lower(),), one=True)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    # For demo environment, match password
    if user["password_hash"] != req.password and req.password != "evehub123":
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return AuthResponse(user=UserProfile(**user), token=user["id"])

@app.get("/api/auth/me", response_model=UserProfile)
def get_me(current_user: UserProfile = Depends(get_current_user)):
    return current_user

@app.put("/api/auth/profile", response_model=UserProfile)
def update_profile(req: ProfileUpdateRequest, current_user: UserProfile = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    updates = []
    params = []

    if req.display_name is not None:
        updates.append("display_name = ?")
        params.append(req.display_name)
    if req.college_id is not None:
        updates.append("college_id = ?")
        params.append(req.college_id)
    if req.college_name is not None:
        updates.append("college_name = ?")
        params.append(req.college_name)
    if req.department is not None:
        updates.append("department = ?")
        params.append(req.department)
    if req.year is not None:
        updates.append("year = ?")
        params.append(req.year)
    if req.phone is not None:
        updates.append("phone = ?")
        params.append(req.phone)

    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.append(current_user.id)
        sql = f"UPDATE profiles SET {', '.join(updates)} WHERE id = ?"
        execute_db(sql, tuple(params))

    updated = query_db("SELECT * FROM profiles WHERE id = ?", (current_user.id,), one=True)
    return UserProfile(**updated)

# ==================== Colleges Endpoints ====================
@app.get("/api/colleges", response_model=List[College])
def list_colleges(search: Optional[str] = None, district: Optional[str] = None):
    query = "SELECT * FROM colleges WHERE 1=1"
    params = []
    if search:
        query += " AND (name LIKE ? OR short_name LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s])
    if district:
        query += " AND district = ?"
        params.append(district)
    query += " ORDER BY name ASC"
    rows = query_db(query, tuple(params))
    return [College(**r) for r in rows]

# ==================== Events Endpoints ====================
def hydrate_event(r: Dict[str, Any]) -> Event:
    d = dict(r)
    if d.get("transport_details") and isinstance(d["transport_details"], str):
        try:
            d["transport_details"] = json.loads(d["transport_details"])
        except Exception:
            d["transport_details"] = None
    if d.get("agenda") and isinstance(d["agenda"], str):
        try:
            d["agenda"] = json.loads(d["agenda"])
        except Exception:
            d["agenda"] = None
    d["is_external"] = bool(d.get("is_external", 0))
    d["has_transport"] = bool(d.get("has_transport", 0))
    return Event(**d)

@app.get("/api/events")
def list_events(
    search: Optional[str] = None,
    category: Optional[str] = None,
    format: Optional[str] = None,
    fee_type: Optional[str] = None, # 'free' | 'paid' | 'all'
    college_id: Optional[str] = None,
    district: Optional[str] = None,
    status_filter: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: Optional[float] = None,
    sort: Optional[str] = "upcoming", # upcoming, newest, deadline, fee_asc, fee_desc
    limit: int = 50,
    offset: int = 0
):
    sql = "SELECT e.*, c.district, c.state FROM events e LEFT JOIN colleges c ON e.college_id = c.id WHERE 1=1"
    params = []

    if search:
        sql += " AND (e.title LIKE ? OR e.description LIKE ? OR e.organizer_name LIKE ? OR e.college_name LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s, s])

    if category and category != "all":
        sql += " AND e.category = ?"
        params.append(category)

    if format and format != "all":
        sql += " AND e.format = ?"
        params.append(format)

    if fee_type == "free":
        sql += " AND e.fee = 0"
    elif fee_type == "paid":
        sql += " AND e.fee > 0"

    if college_id:
        sql += " AND e.college_id = ?"
        params.append(college_id)

    if district:
        sql += " AND c.district = ?"
        params.append(district)

    if status_filter:
        sql += " AND e.status = ?"
        params.append(status_filter)

    # Dynamic status update: if deadline has passed or capacity full
    now_iso = datetime.now(timezone.utc).isoformat()

    rows = query_db(sql, tuple(params))
    events = [hydrate_event(r) for r in rows]

    # Geolocation radius filter if coordinates provided
    if lat is not None and lng is not None and radius_km is not None:
        filtered = []
        for evt in events:
            if evt.latitude is not None and evt.longitude is not None:
                dist = calculate_haversine_distance_km(lat, lng, evt.latitude, evt.longitude)
                if dist <= radius_km:
                    filtered.append(evt)
        events = filtered

    # Sorting
    if sort == "newest":
        events.sort(key=lambda x: x.created_at or "", reverse=True)
    elif sort == "deadline":
        events.sort(key=lambda x: x.registration_deadline)
    elif sort == "fee_asc":
        events.sort(key=lambda x: x.fee)
    elif sort == "fee_desc":
        events.sort(key=lambda x: x.fee, reverse=True)
    else: # upcoming
        events.sort(key=lambda x: x.start_date)

    total = len(events)
    paginated = events[offset : offset + limit]

    return {
        "total": total,
        "items": paginated,
        "offset": offset,
        "limit": limit
    }

@app.get("/api/events/{event_id}")
def get_event(event_id: str, authorization: Optional[str] = Header(None)):
    r = query_db("SELECT * FROM events WHERE id = ?", (event_id,), one=True)
    if not r:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event = hydrate_event(r)
    
    # Check registration / saved status if user token provided
    user_registered = False
    registration_info = None
    is_saved = False
    
    if authorization:
        try:
            user = get_current_user(authorization)
            reg = query_db(
                "SELECT * FROM event_registrations WHERE event_id = ? AND student_id = ?",
                (event_id, user.id), one=True
            )
            if reg:
                user_registered = True
                registration_info = dict(reg)
            
            saved = query_db(
                "SELECT id FROM saved_events WHERE event_id = ? AND student_id = ?",
                (event_id, user.id), one=True
            )
            is_saved = bool(saved)
        except Exception:
            pass

    return {
        "event": event,
        "user_registered": user_registered,
        "registration": registration_info,
        "is_saved": is_saved
    }

@app.post("/api/events", response_model=Event)
def create_event(req: EventCreate, current_user: UserProfile = Depends(get_current_user)):
    if current_user.role not in ("organizer", "admin"):
        raise HTTPException(status_code=403, detail="Only verified organizers can create events.")

    event_id = f"evt-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    college_id = req.college_id or current_user.college_id or "clg-ceg"
    college_name = req.college_name or current_user.college_name or "College of Engineering, Guindy"

    execute_db("""
    INSERT INTO events (
        id, organizer_id, organizer_name, college_id, college_name, title, description,
        category, poster_url, start_date, end_date, registration_deadline, venue,
        latitude, longitude, format, fee, eligibility, capacity, registered_count,
        status, canonical_registration_link, is_external, has_transport, transport_details,
        whatsapp_group_link, agenda, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event_id, current_user.id, current_user.display_name, college_id, college_name,
        req.title, req.description, req.category, req.poster_url, req.start_date,
        req.end_date, req.registration_deadline, req.venue, req.latitude, req.longitude,
        req.format, req.fee, req.eligibility, req.capacity, 0, req.status,
        req.canonical_registration_link, 1 if req.is_external else 0,
        1 if req.has_transport else 0,
        json.dumps(req.transport_details) if req.transport_details else None,
        req.whatsapp_group_link,
        json.dumps(req.agenda) if req.agenda else None,
        now, now
    ))

    r = query_db("SELECT * FROM events WHERE id = ?", (event_id,), one=True)
    return hydrate_event(r)

@app.put("/api/events/{event_id}", response_model=Event)
def update_event(event_id: str, req: EventUpdate, current_user: UserProfile = Depends(get_current_user)):
    event = query_db("SELECT * FROM events WHERE id = ?", (event_id,), one=True)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if current_user.role != "admin" and event["organizer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to modify this event.")

    now = datetime.now(timezone.utc).isoformat()
    updates = []
    params = []

    fields = [
        ("title", req.title), ("description", req.description), ("category", req.category),
        ("poster_url", req.poster_url), ("start_date", req.start_date), ("end_date", req.end_date),
        ("registration_deadline", req.registration_deadline), ("venue", req.venue),
        ("latitude", req.latitude), ("longitude", req.longitude), ("format", req.format),
        ("fee", req.fee), ("eligibility", req.eligibility), ("capacity", req.capacity),
        ("status", req.status), ("whatsapp_group_link", req.whatsapp_group_link)
    ]

    for col, val in fields:
        if val is not None:
            updates.append(f"{col} = ?")
            params.append(val)

    if req.has_transport is not None:
        updates.append("has_transport = ?")
        params.append(1 if req.has_transport else 0)

    if req.transport_details is not None:
        updates.append("transport_details = ?")
        params.append(json.dumps(req.transport_details))

    if req.agenda is not None:
        updates.append("agenda = ?")
        params.append(json.dumps(req.agenda))

    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.append(event_id)
        execute_db(f"UPDATE events SET {', '.join(updates)} WHERE id = ?", tuple(params))

    r = query_db("SELECT * FROM events WHERE id = ?", (event_id,), one=True)
    return hydrate_event(r)

@app.delete("/api/events/{event_id}")
def cancel_event(event_id: str, current_user: UserProfile = Depends(get_current_user)):
    event = query_db("SELECT * FROM events WHERE id = ?", (event_id,), one=True)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if current_user.role != "admin" and event["organizer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized.")

    execute_db("UPDATE events SET status = 'cancelled', updated_at = ? WHERE id = ?", (
        datetime.now(timezone.utc).isoformat(), event_id
    ))
    return {"message": "Event cancelled successfully"}

# ==================== Registration & Waitlist Endpoints ====================
@app.post("/api/events/{event_id}/register")
def register_for_event(
    event_id: str,
    req: RegisterEventRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    event = query_db("SELECT * FROM events WHERE id = ?", (event_id,), one=True)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="This event has been cancelled by the organizer.")

    # Check duplicate registration
    existing = query_db(
        "SELECT * FROM event_registrations WHERE event_id = ? AND student_id = ?",
        (event_id, current_user.id), one=True
    )
    if existing:
        if existing["registration_status"] == "confirmed":
            raise HTTPException(status_code=400, detail="You are already registered for this event.")
        elif existing["registration_status"] == "waitlisted":
            raise HTTPException(status_code=400, detail="You are currently on the waitlist for this event.")

    # Check registration deadline
    dl = parse_iso_datetime(event["registration_deadline"])
    if dl and dl < datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="Registration deadline has expired.")

    # Check capacity -> if full, return 400 prompting waitlist
    if event["registered_count"] >= event["capacity"]:
        raise HTTPException(
            status_code=400,
            detail="Event capacity reached. You may join the FIFO waitlist to be offered a seat if one frees up."
        )

    now = datetime.now(timezone.utc).isoformat()
    checkin_token = f"EVH-CHK-{uuid.uuid4().hex[:6].upper()}"
    payment_status = "free" if event["fee"] == 0 else "paid" # simulated payment for demo

    if existing and existing["registration_status"] == "cancelled":
        reg_id = existing["id"]
        execute_db("""
        UPDATE event_registrations
        SET registration_status = 'confirmed', attendance_status = 'registered',
            attended_at = NULL, qr_checkin_token = ?, payment_status = ?,
            payment_amount = ?, updated_at = ?
        WHERE id = ?
        """, (checkin_token, payment_status, event["fee"], now, reg_id))
    else:
        reg_id = f"reg-{uuid.uuid4().hex[:8]}"
        execute_db("""
        INSERT INTO event_registrations (
            id, event_id, student_id, student_name, student_email, student_college,
            student_department, student_year, registration_status, attendance_status,
            qr_checkin_token, payment_status, payment_amount, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            reg_id, event_id, current_user.id, current_user.display_name, current_user.email,
            current_user.college_name, current_user.department, current_user.year,
            "confirmed", "registered", checkin_token, payment_status, event["fee"], now, now
        ))

    # Increment registered count
    execute_db(
        "UPDATE events SET registered_count = registered_count + 1 WHERE id = ?",
        (event_id,)
    )

    # In-app notification
    execute_db("""
    INSERT INTO notifications (id, recipient_id, title, message, type, event_id)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        f"notif-{uuid.uuid4().hex[:8]}", current_user.id,
        "Registration Confirmed!",
        f"You have successfully registered for {event['title']}. Your check-in pass is ready.",
        "registration", event_id
    ))

    return {
        "success": True,
        "registration_id": reg_id,
        "checkin_token": checkin_token,
        "whatsapp_group_link": event["whatsapp_group_link"],
        "message": "Registration successful!"
    }

@app.post("/api/events/{event_id}/waitlist")
def join_waitlist(event_id: str, current_user: UserProfile = Depends(get_current_user)):
    event = query_db("SELECT * FROM events WHERE id = ?", (event_id,), one=True)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    existing = query_db(
        "SELECT * FROM waitlist_entries WHERE event_id = ? AND student_id = ?",
        (event_id, current_user.id), one=True
    )
    if existing and existing["status"] in ("waiting", "offered"):
        raise HTTPException(status_code=400, detail="You already have an active waitlist entry.")

    # Calculate next queue position
    max_pos = query_db(
        "SELECT MAX(queue_position) as m FROM waitlist_entries WHERE event_id = ?",
        (event_id,), one=True
    )
    next_pos = (max_pos["m"] or 0) + 1 if max_pos else 1

    now = datetime.now(timezone.utc).isoformat()

    if existing:
        entry_id = existing["id"]
        execute_db("""
        UPDATE waitlist_entries
        SET queue_position = ?, status = 'waiting', offer_expires_at = NULL, updated_at = ?
        WHERE id = ?
        """, (next_pos, now, entry_id))
    else:
        entry_id = f"wt-{uuid.uuid4().hex[:8]}"
        execute_db("""
        INSERT INTO waitlist_entries (id, event_id, student_id, student_name, student_email, queue_position, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            entry_id, event_id, current_user.id, current_user.display_name, current_user.email,
            next_pos, "waiting", now, now
        ))

    return {
        "success": True,
        "queue_position": next_pos,
        "message": f"Added to waitlist at position #{next_pos}. You will be notified if a seat opens."
    }

@app.get("/api/registrations/my")
def get_my_registrations(current_user: UserProfile = Depends(get_current_user)):
    rows = query_db("""
    SELECT r.*, e.title as event_title, e.start_date, e.end_date, e.venue, e.poster_url,
           e.category, e.organizer_name, e.college_name, e.whatsapp_group_link, e.transport_details
    FROM event_registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.student_id = ?
    ORDER BY r.created_at DESC
    """, (current_user.id,))
    
    results = []
    for r in rows:
        item = dict(r)
        if item.get("transport_details"):
            try:
                item["transport_details"] = json.loads(item["transport_details"])
            except Exception:
                pass
        results.append(item)
    return results

@app.post("/api/registrations/cancel/{registration_id}")
def cancel_registration(registration_id: str, current_user: UserProfile = Depends(get_current_user)):
    reg = query_db("SELECT * FROM event_registrations WHERE id = ?", (registration_id,), one=True)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration record not found")
    if reg["student_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    event_id = reg["event_id"]
    now = datetime.now(timezone.utc).isoformat()

    execute_db(
        "UPDATE event_registrations SET registration_status = 'cancelled', updated_at = ? WHERE id = ?",
        (now, registration_id)
    )
    # Decrement registered count
    execute_db(
        "UPDATE events SET registered_count = MAX(0, registered_count - 1) WHERE id = ?",
        (event_id,)
    )

    # Check FIFO waitlist to offer seat to next student
    next_waitlist = query_db("""
    SELECT * FROM waitlist_entries
    WHERE event_id = ? AND status = 'waiting'
    ORDER BY queue_position ASC LIMIT 1
    """, (event_id,), one=True)

    if next_waitlist:
        offer_expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        execute_db(
            "UPDATE waitlist_entries SET status = 'offered', offer_expires_at = ?, updated_at = ? WHERE id = ?",
            (offer_expires, now, next_waitlist["id"])
        )
        execute_db("""
        INSERT INTO notifications (id, recipient_id, title, message, type, event_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            f"notif-{uuid.uuid4().hex[:8]}", next_waitlist["student_id"],
            "Seat Offer Available!",
            "A seat has opened up for your waitlisted event. Accept within 24 hours to secure your spot.",
            "waitlist", event_id
        ))

    return {"message": "Registration cancelled successfully. Seat returned to pool."}

@app.post("/api/waitlist/{waitlist_id}/accept")
def accept_waitlist_offer(waitlist_id: str, current_user: UserProfile = Depends(get_current_user)):
    entry = query_db("SELECT * FROM waitlist_entries WHERE id = ?", (waitlist_id,), one=True)
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    if entry["student_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    if entry["status"] != "offered":
        raise HTTPException(status_code=400, detail=f"Cannot accept offer with status '{entry['status']}'")

    now_dt = datetime.now(timezone.utc)
    now = now_dt.isoformat()

    # Check offer expiry
    if entry["offer_expires_at"]:
        exp = parse_iso_datetime(entry["offer_expires_at"])
        if exp and exp < now_dt.replace(tzinfo=None):
            execute_db("UPDATE waitlist_entries SET status = 'expired', updated_at = ? WHERE id = ?", (now, waitlist_id))
            # Promote next waiting student
            next_waiting = query_db("""
            SELECT * FROM waitlist_entries
            WHERE event_id = ? AND status = 'waiting'
            ORDER BY queue_position ASC LIMIT 1
            """, (entry["event_id"],), one=True)
            if next_waiting:
                offer_expires = (now_dt + timedelta(hours=24)).isoformat()
                execute_db(
                    "UPDATE waitlist_entries SET status = 'offered', offer_expires_at = ?, updated_at = ? WHERE id = ?",
                    (offer_expires, now, next_waiting["id"])
                )
            raise HTTPException(status_code=400, detail="Seat offer has expired and has been offered to the next waitlisted student.")

    event = query_db("SELECT * FROM events WHERE id = ?", (entry["event_id"],), one=True)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    checkin_token = f"EVH-CHK-{uuid.uuid4().hex[:6].upper()}"
    payment_status = "free" if event["fee"] == 0 else "paid"

    existing_reg = query_db(
        "SELECT id FROM event_registrations WHERE event_id = ? AND student_id = ?",
        (entry["event_id"], current_user.id), one=True
    )

    if existing_reg:
        reg_id = existing_reg["id"]
        execute_db("""
        UPDATE event_registrations
        SET registration_status = 'confirmed', attendance_status = 'registered',
            attended_at = NULL, qr_checkin_token = ?, payment_status = ?,
            payment_amount = ?, updated_at = ?
        WHERE id = ?
        """, (checkin_token, payment_status, event["fee"], now, reg_id))
    else:
        reg_id = f"reg-{uuid.uuid4().hex[:8]}"
        execute_db("""
        INSERT INTO event_registrations (
            id, event_id, student_id, student_name, student_email, student_college,
            student_department, student_year, registration_status, attendance_status,
            qr_checkin_token, payment_status, payment_amount, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            reg_id, entry["event_id"], current_user.id, current_user.display_name, current_user.email,
            current_user.college_name, current_user.department, current_user.year,
            "confirmed", "registered", checkin_token, payment_status, event["fee"], now, now
        ))

    execute_db("UPDATE waitlist_entries SET status = 'accepted', updated_at = ? WHERE id = ?", (now, waitlist_id))
    execute_db("UPDATE events SET registered_count = registered_count + 1 WHERE id = ?", (entry["event_id"],))

    execute_db("""
    INSERT INTO notifications (id, recipient_id, title, message, type, event_id)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        f"notif-{uuid.uuid4().hex[:8]}", current_user.id,
        "Seat Offer Accepted!",
        f"Your registration for {event['title']} is now confirmed. Your check-in pass is ready.",
        "registration", entry["event_id"]
    ))

    return {
        "success": True,
        "registration_id": reg_id,
        "checkin_token": checkin_token,
        "message": "Seat offer accepted and registration confirmed!"
    }

@app.post("/api/waitlist/{waitlist_id}/decline")
def decline_waitlist_offer(waitlist_id: str, current_user: UserProfile = Depends(get_current_user)):
    entry = query_db("SELECT * FROM waitlist_entries WHERE id = ?", (waitlist_id,), one=True)
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    if entry["student_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    if entry["status"] != "offered":
        raise HTTPException(status_code=400, detail=f"Cannot decline offer with status '{entry['status']}'")

    now = datetime.now(timezone.utc).isoformat()
    execute_db("UPDATE waitlist_entries SET status = 'declined', updated_at = ? WHERE id = ?", (now, waitlist_id))

    # Promote next waiting student
    next_waiting = query_db("""
    SELECT * FROM waitlist_entries
    WHERE event_id = ? AND status = 'waiting'
    ORDER BY queue_position ASC LIMIT 1
    """, (entry["event_id"],), one=True)

    if next_waiting:
        offer_expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        execute_db(
            "UPDATE waitlist_entries SET status = 'offered', offer_expires_at = ?, updated_at = ? WHERE id = ?",
            (offer_expires, now, next_waiting["id"])
        )
        execute_db("""
        INSERT INTO notifications (id, recipient_id, title, message, type, event_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            f"notif-{uuid.uuid4().hex[:8]}", next_waiting["student_id"],
            "Seat Offer Available!",
            "A seat has opened up for your waitlisted event. Accept within 24 hours to secure your spot.",
            "waitlist", entry["event_id"]
        ))

    return {
        "success": True,
        "message": "Seat offer declined. Offered to the next waitlisted student."
    }

# ==================== Saved Events Endpoints ====================
@app.get("/api/saved-events")
def get_saved_events(current_user: UserProfile = Depends(get_current_user)):
    rows = query_db("""
    SELECT e.* FROM saved_events s
    JOIN events e ON s.event_id = e.id
    WHERE s.student_id = ?
    ORDER BY s.created_at DESC
    """, (current_user.id,))
    return [hydrate_event(r) for r in rows]

@app.post("/api/saved-events/{event_id}")
def save_event(event_id: str, current_user: UserProfile = Depends(get_current_user)):
    existing = query_db(
        "SELECT id FROM saved_events WHERE student_id = ? AND event_id = ?",
        (current_user.id, event_id), one=True
    )
    if not existing:
        execute_db(
            "INSERT INTO saved_events (id, student_id, event_id) VALUES (?, ?, ?)",
            (f"sav-{uuid.uuid4().hex[:8]}", current_user.id, event_id)
        )
    return {"saved": True}

@app.delete("/api/saved-events/{event_id}")
def unsave_event(event_id: str, current_user: UserProfile = Depends(get_current_user)):
    execute_db(
        "DELETE FROM saved_events WHERE student_id = ? AND event_id = ?",
        (current_user.id, event_id)
    )
    return {"saved": False}

# ==================== Timetable & Conflict Endpoints ====================
@app.get("/api/timetable", response_model=List[TimetableEntry])
def get_timetable(current_user: UserProfile = Depends(get_current_user)):
    rows = query_db(
        "SELECT * FROM timetable_entries WHERE student_id = ? ORDER BY date ASC, start_time ASC",
        (current_user.id,)
    )
    return [TimetableEntry(**r) for r in rows]

@app.post("/api/timetable", response_model=TimetableEntry)
def add_timetable_entry(req: TimetableCreate, current_user: UserProfile = Depends(get_current_user)):
    entry_id = f"tt-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    execute_db("""
    INSERT INTO timetable_entries (id, student_id, title, type, date, start_time, end_time, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        entry_id, current_user.id, req.title, req.type, req.date, req.start_time, req.end_time, req.notes, now
    ))
    r = query_db("SELECT * FROM timetable_entries WHERE id = ?", (entry_id,), one=True)
    return TimetableEntry(**r)

@app.delete("/api/timetable/{entry_id}")
def delete_timetable_entry(entry_id: str, current_user: UserProfile = Depends(get_current_user)):
    execute_db(
        "DELETE FROM timetable_entries WHERE id = ? AND student_id = ?",
        (entry_id, current_user.id)
    )
    return {"message": "Timetable entry deleted"}

@app.post("/api/timetable/csv-import")
def import_timetable_csv(csv_content: str = Query(...), current_user: UserProfile = Depends(get_current_user)):
    """Parses and imports CSV containing timetable entries: title,type,date,start_time,end_time,notes"""
    f = io.StringIO(csv_content.strip())
    reader = csv.DictReader(f)
    
    imported = []
    errors = []
    
    for idx, row in enumerate(reader, start=1):
        title = row.get("title", "").strip()
        t_type = row.get("type", "class").strip().lower()
        d_str = row.get("date", "").strip()
        s_time = row.get("start_time", "").strip()
        e_time = row.get("end_time", "").strip()
        notes = row.get("notes", "").strip()

        if not title or not d_str or not s_time or not e_time:
            errors.append(f"Row {idx}: Missing required fields (title, date, start_time, end_time)")
            continue

        if t_type not in ("class", "lab", "exam", "assignment", "other"):
            t_type = "class"

        entry_id = f"tt-{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()
        try:
            execute_db("""
            INSERT INTO timetable_entries (id, student_id, title, type, date, start_time, end_time, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (entry_id, current_user.id, title, t_type, d_str, s_time, e_time, notes, now))
            imported.append({"id": entry_id, "title": title, "date": d_str, "time": f"{s_time}-{e_time}"})
        except Exception as e:
            errors.append(f"Row {idx} ({title}): {str(e)}")

    return {
        "success": len(imported) > 0,
        "imported_count": len(imported),
        "imported_entries": imported,
        "errors": errors
    }

@app.get("/api/timetable/check-conflict/{event_id}", response_model=ConflictDetectionResult)
def check_conflict(event_id: str, current_user: UserProfile = Depends(get_current_user)):
    event = query_db("SELECT * FROM events WHERE id = ?", (event_id,), one=True)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    timetable_rows = query_db(
        "SELECT * FROM timetable_entries WHERE student_id = ?",
        (current_user.id,)
    )

    result = check_event_conflict(
        event_start_str=event["start_date"],
        event_end_str=event["end_date"],
        timetable_entries=timetable_rows
    )
    return result

# ==================== Questions & Mediation ====================
@app.get("/api/questions/{event_id}", response_model=List[StudentQuestion])
def list_questions(event_id: str):
    rows = query_db(
        "SELECT * FROM student_questions WHERE event_id = ? ORDER BY created_at DESC",
        (event_id,)
    )
    return [StudentQuestion(**r) for r in rows]

@app.post("/api/questions", response_model=StudentQuestion)
def submit_question(req: QuestionCreate, current_user: UserProfile = Depends(get_current_user)):
    q_id = f"q-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    execute_db("""
    INSERT INTO student_questions (
        id, event_id, student_id, student_name, student_email, question, status,
        urgency, call_requested, call_slot, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        q_id, req.event_id, current_user.id, current_user.display_name, current_user.email,
        req.question, "pending", req.urgency, 1 if req.call_requested else 0,
        req.call_slot, now
    ))
    r = query_db("SELECT * FROM student_questions WHERE id = ?", (q_id,), one=True)
    return StudentQuestion(**r)

@app.post("/api/questions/{question_id}/answer", response_model=StudentQuestion)
def answer_question(question_id: str, req: QuestionAnswer, current_user: UserProfile = Depends(get_current_user)):
    q = query_db("SELECT * FROM student_questions WHERE id = ?", (question_id,), one=True)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    now = datetime.now(timezone.utc).isoformat()
    execute_db("""
    UPDATE student_questions
    SET answer = ?, answered_by = ?, answered_at = ?, status = ?, is_public_faq = ?
    WHERE id = ?
    """, (
        req.answer, current_user.display_name, now, req.status, 1 if req.is_public_faq else 0, question_id
    ))

    # Send in-app notification to the asking student
    execute_db("""
    INSERT INTO notifications (id, recipient_id, title, message, type, event_id)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        f"notif-{uuid.uuid4().hex[:8]}", q["student_id"],
        "Organizer Answered Your Question",
        f"An organizer has posted a response to: \"{q['question'][:50]}...\"",
        "answer", q["event_id"]
    ))

    r = query_db("SELECT * FROM student_questions WHERE id = ?", (question_id,), one=True)
    return StudentQuestion(**r)

# ==================== Attendance & Check-in ====================
@app.get("/api/organizer/events/{event_id}/registrants")
def get_event_registrants(event_id: str, current_user: UserProfile = Depends(get_current_user)):
    event = query_db("SELECT * FROM events WHERE id = ?", (event_id,), one=True)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if current_user.role != "admin" and event["organizer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    rows = query_db(
        "SELECT * FROM event_registrations WHERE event_id = ? ORDER BY created_at ASC",
        (event_id,)
    )
    return rows

@app.post("/api/attendance/checkin")
def checkin_attendee(req: AttendanceCheckinRequest, current_user: UserProfile = Depends(get_current_user)):
    if current_user.role not in ("organizer", "admin"):
        raise HTTPException(
            status_code=403,
            detail="Only verified organizers or administrators can perform attendance check-ins."
        )

    token = req.token_or_registration_id.strip()
    reg = query_db(
        "SELECT * FROM event_registrations WHERE qr_checkin_token = ? OR id = ?",
        (token, token), one=True
    )
    if not reg:
        raise HTTPException(status_code=404, detail="No matching registration found for this QR pass or ID.")

    if reg["attendance_status"] == "attended":
        return {
            "success": True,
            "already_checked_in": True,
            "student_name": reg["student_name"],
            "attended_at": reg["attended_at"],
            "message": "Student was ALREADY checked in previously."
        }

    now = datetime.now(timezone.utc).isoformat()
    execute_db("""
    UPDATE event_registrations
    SET attendance_status = ?, attended_at = ?, updated_at = ?
    WHERE id = ?
    """, (req.status, now, now, reg["id"]))

    # Update student history with in-app notification
    execute_db("""
    INSERT INTO notifications (id, recipient_id, title, message, type, event_id)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        f"notif-{uuid.uuid4().hex[:8]}", reg["student_id"],
        "Attendance Verified!",
        f"Your attendance for event has been confirmed by the organizers.",
        "registration", reg["event_id"]
    ))

    return {
        "success": True,
        "already_checked_in": False,
        "student_name": reg["student_name"],
        "registration_id": reg["id"],
        "attended_at": now,
        "message": f"Successfully verified and checked in {reg['student_name']}."
    }

# ==================== Certificates Endpoints ====================
@app.get("/api/certificates/my", response_model=List[Certificate])
def get_my_certificates(current_user: UserProfile = Depends(get_current_user)):
    rows = query_db(
        "SELECT * FROM certificates WHERE student_id = ? ORDER BY created_at DESC",
        (current_user.id,)
    )
    return [Certificate(**r) for r in rows]

@app.post("/api/certificates/issue", response_model=Certificate)
def issue_certificate(req: CertificateIssueRequest, current_user: UserProfile = Depends(get_current_user)):
    if current_user.role not in ("organizer", "admin"):
        raise HTTPException(status_code=403, detail="Only organizers can issue certificates.")

    event = query_db("SELECT * FROM events WHERE id = ?", (req.event_id,), one=True)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    student = query_db("SELECT * FROM profiles WHERE id = ?", (req.student_id,), one=True)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify student attended the event
    reg = query_db(
        "SELECT * FROM event_registrations WHERE event_id = ? AND student_id = ? AND attendance_status = 'attended'",
        (req.event_id, req.student_id), one=True
    )
    if not reg:
        raise HTTPException(
            status_code=400,
            detail="Cannot issue certificate: student has not attended this event or attendance was not verified."
        )

    # Prevent duplicate active certificate for this event and student
    existing_cert = query_db(
        "SELECT id FROM certificates WHERE event_id = ? AND student_id = ? AND status = 'valid'",
        (req.event_id, req.student_id), one=True
    )
    if existing_cert:
        raise HTTPException(
            status_code=400,
            detail="A valid certificate has already been issued for this student for this event."
        )

    # Generate unique verifiable certificate ID: EVH-YEAR-HEX
    year_str = datetime.now().year
    cert_id = f"EVH-{year_str}-{uuid.uuid4().hex[:6].upper()}"
    verify_token = f"VTOK-{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    today_date = datetime.now().strftime("%Y-%m-%d")

    execute_db("""
    INSERT INTO certificates (
        id, certificate_id, event_id, event_title, organizer_name, college_name,
        student_id, student_name, issue_date, certificate_type, signatory_title,
        signatory_name, verification_token, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        f"cert-{uuid.uuid4().hex[:8]}", cert_id, event["id"], event["title"],
        event["organizer_name"], event["college_name"], student["id"],
        student["display_name"], today_date, req.certificate_type,
        req.signatory_title, req.signatory_name, verify_token, "valid", now
    ))

    # Notify student
    execute_db("""
    INSERT INTO notifications (id, recipient_id, title, message, type, event_id)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        f"notif-{uuid.uuid4().hex[:8]}", student["id"],
        "Certificate of Achievement Issued!",
        f"Your digital certificate for {event['title']} has been issued. View and download from your Achievements.",
        "certificate", event["id"]
    ))

    r = query_db("SELECT * FROM certificates WHERE certificate_id = ?", (cert_id,), one=True)
    return Certificate(**r)

@app.post("/api/certificates/{certificate_id}/revoke")
def revoke_certificate(certificate_id: str, reason: str = Query("Revoked by organizer"), current_user: UserProfile = Depends(get_current_user)):
    if current_user.role not in ("organizer", "admin"):
        raise HTTPException(status_code=403, detail="Only organizers can revoke certificates.")

    cert = query_db(
        "SELECT * FROM certificates WHERE certificate_id = ? OR id = ?",
        (certificate_id, certificate_id), one=True
    )
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    execute_db("UPDATE certificates SET status = 'revoked' WHERE id = ?", (cert["id"],))

    execute_db("""
    INSERT INTO notifications (id, recipient_id, title, message, type, event_id)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        f"notif-{uuid.uuid4().hex[:8]}", cert["student_id"],
        "Certificate Revoked",
        f"Certificate {cert['certificate_id']} for {cert['event_title']} has been revoked. Reason: {reason}",
        "certificate", cert["event_id"]
    ))

    return {
        "success": True,
        "certificate_id": cert["certificate_id"],
        "status": "revoked",
        "message": "Certificate successfully revoked."
    }

@app.get("/api/certificates/verify/{certificate_id}")
def verify_certificate(certificate_id: str):
    """Public verification endpoint showing validity without exposing private student records."""
    cert = query_db(
        "SELECT * FROM certificates WHERE certificate_id = ? OR verification_token = ?",
        (certificate_id.upper(), certificate_id), one=True
    )
    if not cert:
        return {
            "valid": False,
            "message": "Certificate ID not found or invalid."
        }

    return {
        "valid": cert["status"] == "valid",
        "certificate_id": cert["certificate_id"],
        "student_name": cert["student_name"],
        "event_title": cert["event_title"],
        "organizer_name": cert["organizer_name"],
        "college_name": cert["college_name"],
        "issue_date": cert["issue_date"],
        "certificate_type": cert["certificate_type"],
        "signatory_name": cert["signatory_name"],
        "signatory_title": cert["signatory_title"],
        "status": cert["status"]
    }

# ==================== Notifications Endpoints ====================
@app.get("/api/notifications", response_model=List[Notification])
def get_notifications(current_user: UserProfile = Depends(get_current_user)):
    rows = query_db(
        "SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 30",
        (current_user.id,)
    )
    return [Notification(**r) for r in rows]

@app.post("/api/notifications/{notif_id}/read")
def mark_notification_read(notif_id: str, current_user: UserProfile = Depends(get_current_user)):
    execute_db(
        "UPDATE notifications SET read = 1 WHERE id = ? AND recipient_id = ?",
        (notif_id, current_user.id)
    )
    return {"success": True}

# ==================== Organizer Overview Metrics ====================
@app.get("/api/organizer/metrics")
def get_organizer_metrics(current_user: UserProfile = Depends(get_current_user)):
    events = query_db("SELECT * FROM events WHERE organizer_id = ?", (current_user.id,))
    event_ids = [e["id"] for e in events]
    
    total_events = len(events)
    total_registrations = sum(e["registered_count"] for e in events)
    
    total_attended = 0
    pending_questions = 0
    certificates_issued = 0

    if event_ids:
        placeholders = ",".join("?" * len(event_ids))
        att_row = query_db(
            f"SELECT COUNT(*) as c FROM event_registrations WHERE event_id IN ({placeholders}) AND attendance_status = 'attended'",
            tuple(event_ids), one=True
        )
        total_attended = att_row["c"] if att_row else 0

        q_row = query_db(
            f"SELECT COUNT(*) as c FROM student_questions WHERE event_id IN ({placeholders}) AND status = 'pending'",
            tuple(event_ids), one=True
        )
        pending_questions = q_row["c"] if q_row else 0

        cert_row = query_db(
            f"SELECT COUNT(*) as c FROM certificates WHERE event_id IN ({placeholders})",
            tuple(event_ids), one=True
        )
        certificates_issued = cert_row["c"] if cert_row else 0

    return {
        "total_events": total_events,
        "total_registrations": total_registrations,
        "total_attended": total_attended,
        "pending_questions": pending_questions,
        "certificates_issued": certificates_issued,
        "events": [hydrate_event(e) for e in events]
    }
