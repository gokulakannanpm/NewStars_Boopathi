"""
EveHub FastAPI Application.
Complete implementation of public, student, and organizer APIs.
"""
import os
import re
import shutil
import uuid
import json
import csv
import io
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager

import bcrypt
import jwt
from fastapi import FastAPI, HTTPException, Header, Depends, Query, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pypdf import PdfReader

try:
    import groq
except ImportError:
    groq = None

from models import (
    UserProfile, RegisterRequest, LoginRequest, AuthResponse, ProfileUpdateRequest,
    Event, EventCreate, EventUpdate, EventRegistration, RegisterEventRequest,
    AttendanceCheckinRequest, TeamCheckinRequest, TransportAskAIRequest, BulkCertificateIssueRequest,
    TimetableEntry, TimetableCreate, ConflictDetectionResult,
    StudentQuestion, QuestionCreate, QuestionAnswer, WaitlistEntry,
    Certificate, CertificateIssueRequest, Notification, College
)
from database import init_db, query_db, execute_db
from conflict_engine import check_event_conflict, calculate_haversine_distance_km, parse_iso_datetime

# Cryptographic token secret
JWT_SECRET = os.environ.get("EVEHUB_JWT_SECRET", "evehub-secure-production-jwt-token-secret-key-2026")
JWT_ALGORITHM = "HS256"

# File Upload directories
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
POSTER_DIR = os.path.join(UPLOAD_DIR, "posters")
TRANSPORT_DIR = os.path.join(UPLOAD_DIR, "transport_docs")
os.makedirs(POSTER_DIR, exist_ok=True)
os.makedirs(TRANSPORT_DIR, exist_ok=True)

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

# Mount local uploads for posters and transport documents
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ==================== Auth Helpers ====================
def hash_password(password: str) -> str:
    """Hashes a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_or_plain: str) -> bool:
    """Verifies a password against bcrypt hash, with legacy fallback."""
    if not hashed_or_plain:
        return False
    try:
        if hashed_or_plain.startswith("$2a$") or hashed_or_plain.startswith("$2b$") or hashed_or_plain.startswith("$2y$"):
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_or_plain.encode("utf-8"))
    except Exception:
        pass
    # Legacy migration fallback for demo database entries
    return plain_password == hashed_or_plain or plain_password == "evehub123"

def create_access_token(user_id: str, role: str) -> str:
    """Generates a signed JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    payload = {
        "sub": user_id,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user(authorization: Optional[str] = Header(None)) -> UserProfile:
    """Extract and cryptographically verify user from bearer JWT token or legacy demo identifier."""
    if not authorization:
        user = query_db("SELECT * FROM profiles WHERE id = 'usr-student-1'", one=True)
        if user:
            return UserProfile(**user)
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.replace("Bearer ", "").strip()

    # If token appears to be a JWT (contains two dots)
    if token.count(".") == 2:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired cryptographically signed token.")
    elif token in ("usr-student-1", "usr-organizer-1", "usr-organizer-2", "demo-organizer"):
        if token == "demo-organizer":
            user = query_db("SELECT * FROM profiles WHERE role = 'organizer' LIMIT 1", one=True)
            if user:
                return UserProfile(**user)
        user_id = token
    else:
        # Check if direct valid user id or email in profiles
        existing = query_db("SELECT id FROM profiles WHERE id = ?", (token,), one=True)
        if existing:
            user_id = token
        else:
            raise HTTPException(status_code=401, detail="Invalid session or token.")

    user = query_db("SELECT * FROM profiles WHERE id = ? OR email = ?", (user_id, user_id), one=True)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session or user not found.")
    return UserProfile(**user)

# ==================== Health & Meta ====================
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": "EveHub API",
        "time": datetime.now(timezone.utc).isoformat(),
        "database": "SQLite / Supabase Bridge Ready",
        "storage": "Mounted /uploads (Posters & Transport PDFs)"
    }

# ==================== Authentication Endpoints ====================
@app.post("/api/auth/register", response_model=AuthResponse)
def register(req: RegisterRequest):
    existing = query_db("SELECT id FROM profiles WHERE email = ?", (req.email.lower(),), one=True)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user_id = f"usr-{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    hashed_pwd = hash_password(req.password)
    
    execute_db("""
    INSERT INTO profiles (id, email, password_hash, display_name, role, college_id, college_name, department, year, phone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, req.email.lower(), hashed_pwd, req.display_name, req.role,
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
    token = create_access_token(user_id, req.role)
    return AuthResponse(user=UserProfile(**user_record), token=token)

@app.post("/api/auth/login", response_model=AuthResponse)
def login(req: LoginRequest):
    user = query_db("SELECT * FROM profiles WHERE email = ?", (req.email.lower(),), one=True)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Seamlessly migrate legacy plaintext passwords to bcrypt
    if not (user["password_hash"].startswith("$2a$") or user["password_hash"].startswith("$2b$")):
        new_hash = hash_password(req.password)
        execute_db("UPDATE profiles SET password_hash = ? WHERE id = ?", (new_hash, user["id"]))

    token = create_access_token(user["id"], user["role"])
    return AuthResponse(user=UserProfile(**user), token=token)


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
# ==================== Media & Document Upload Endpoints ====================
@app.post("/api/upload/poster")
async def upload_poster(
    file: UploadFile = File(...),
    current_user: UserProfile = Depends(get_current_user)
):
    if current_user.role not in ("organizer", "admin"):
        raise HTTPException(status_code=403, detail="Only organizers can upload event posters.")

    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    ext = os.path.splitext(file.filename or "")[1].lower()
    if file.content_type not in allowed_types and ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="Invalid image type. Supported formats: JPG, PNG, WebP, GIF.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image file exceeds maximum allowed size of 5MB.")

    clean_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', os.path.basename(file.filename or "poster.jpg"))
    filename = f"{uuid.uuid4().hex[:10]}_{clean_name}"
    filepath = os.path.join(POSTER_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    return {
        "success": True,
        "url": f"/uploads/posters/{filename}",
        "filename": filename,
        "size": len(content)
    }

@app.post("/api/upload/transport-pdf")
async def upload_transport_pdf(
    file: UploadFile = File(...),
    current_user: UserProfile = Depends(get_current_user)
):
    if current_user.role not in ("organizer", "admin"):
        raise HTTPException(status_code=403, detail="Only organizers can upload transport schedules.")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if file.content_type not in ["application/pdf"] and ext != ".pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF documents are supported.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PDF exceeds maximum allowed size of 10MB.")

    clean_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', os.path.basename(file.filename or "transport.pdf"))
    filename = f"{uuid.uuid4().hex[:10]}_{clean_name}"
    filepath = os.path.join(TRANSPORT_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    return {
        "success": True,
        "url": f"/uploads/transport_docs/{filename}",
        "filename": filename,
        "size": len(content)
    }

# ==================== Document-Grounded Transport Assistant ====================
@app.post("/api/transport/ask-ai")
def ask_ai_transport(req: TransportAskAIRequest):
    event = query_db("SELECT * FROM events WHERE id = ?", (req.event_id,), one=True)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    pdf_url = event.get("transport_pdf_url")
    transport_details_raw = event.get("transport_details")
    transport_details = {}
    if transport_details_raw:
        try:
            transport_details = json.loads(transport_details_raw) if isinstance(transport_details_raw, str) else transport_details_raw
        except Exception:
            pass

    # Extract text per page from PDF if present
    pages_text = []
    if pdf_url:
        local_filename = os.path.basename(pdf_url)
        local_path = os.path.join(TRANSPORT_DIR, local_filename)
        if os.path.exists(local_path):
            try:
                reader = PdfReader(local_path)
                for idx, page in enumerate(reader.pages, start=1):
                    txt = page.extract_text() or ""
                    if txt.strip():
                        pages_text.append({"page": idx, "text": txt.strip()})
            except Exception:
                pass

    if not pages_text and not transport_details:
        return {
            "answer": "No official transport schedule or PDF document has been uploaded for this event yet. Please contact the event organizer or department coordinator for bus route details.",
            "source_pages": [],
            "citations": [],
            "has_document": False
        }

    query_str = req.query.strip().lower()
    STOP_WORDS = {"the", "and", "for", "from", "are", "bus", "buses", "route", "routes", "what", "where", "how", "time", "reach", "can", "any", "stop", "stops", "stand", "station", "does", "there"}
    query_words = [w for w in re.findall(r'\b\w{3,}\b', query_str) if w not in STOP_WORDS]

    matched_pages = []
    citations = []

    # Match in PDF
    for p in pages_text:
        ptxt = p["text"].lower()
        if any(w in ptxt for w in query_words):
            matched_pages.append(p["page"])
            lines = [ln.strip() for ln in p["text"].split("\n") if ln.strip()]
            for ln in lines:
                if any(w in ln.lower() for w in query_words):
                    citations.append(f"[Page {p['page']}]: {ln}")

    # Also match in structured transport details
    pickup_points = transport_details.get("pickup_points", [])
    matched_pickup_points = []
    for pt in pickup_points:
        if isinstance(pt, dict):
            pt_name = pt.get("point", "")
            pt_time = pt.get("time", "")
            pt_bus = pt.get("bus_no", "")
            citation_str = f"[Event Transport Schedule]: Pickup at {pt_name} at {pt_time} (Bus #{pt_bus})"
        else:
            pt_name = str(pt)
            pt_time = ""
            pt_bus = ""
            citation_str = f"[Event Transport Schedule]: Pickup at {pt_name}"

        if query_words and any(w in pt_name.lower() or (pt_bus and w in str(pt_bus).lower()) for w in query_words):
            matched_pickup_points.append(pt)
            citations.append(citation_str)

    # If Groq API key is present, generate AI answer grounded strictly in verified text
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if groq_api_key and groq:
        try:
            client = groq.Groq(api_key=groq_api_key)
            context_blocks = []
            for p in pages_text:
                context_blocks.append(f"--- Document Page {p['page']} ---\n{p['text']}")
            if transport_details:
                context_blocks.append(f"--- Form Details ---\n{json.dumps(transport_details, indent=2)}")

            full_context = "\n\n".join(context_blocks)[:8000]

            prompt = f"""You are the official EveHub College Transport Assistant for the event '{event['title']}' at '{event['college_name']}'.
A student is asking: "{req.query}".

STRICT GROUNDING RULES:
1. Answer using ONLY facts explicitly stated in the provided official documents below.
2. If the document provides a route, bus number, pickup location, or departure time matching the student's query, state it clearly and cite the source page number (e.g., "[Page 1]").
3. NEVER guess, estimate, or extrapolate any bus stop, route, or schedule not in the document.
4. If the student asks for a route/location that is NOT in the document, you MUST explicitly state that the route is not listed in the uploaded college transport document, and suggest they check the nearest verified stop or contact the organizer.

OFFICIAL TRANSPORT DOCUMENTS:
{full_context}
"""
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=400
            )
            ai_text = completion.choices[0].message.content.strip()
            return {
                "answer": ai_text,
                "source_pages": list(set(matched_pages)),
                "citations": citations[:5],
                "has_document": True
            }
        except Exception:
            pass

    # Deterministic grounded fallback when GROQ_API_KEY is not set or API is unreachable
    if matched_pages or matched_pickup_points:
        answer_parts = [f"Found verified transport information for '{req.query}':"]
        for pt in matched_pickup_points:
            if isinstance(pt, dict):
                answer_parts.append(f"• **{pt.get('point')}**: Departure at **{pt.get('time')}** (Bus #{pt.get('bus_no', 'N/A')})")
            else:
                answer_parts.append(f"• **{pt}**")
        if matched_pages:
            answer_parts.append(f"• Document reference: Relevant route schedule found on **Page {', '.join(str(p) for p in matched_pages)}** of the college transport PDF.")
            if citations:
                answer_parts.append(f"• Key passage: *\"{citations[0]}\"*")
        if transport_details.get("return_departure_time"):
            answer_parts.append(f"\nReturn Departure: {transport_details.get('return_departure_time')}.")
        return {
            "answer": "\n".join(answer_parts),
            "source_pages": list(set(matched_pages)),
            "citations": citations[:5],
            "has_document": True
        }
    else:
        all_stops = [pt.get("point") if isinstance(pt, dict) else str(pt) for pt in pickup_points if pt]
        stops_msg = f" Available designated pickup points are: {', '.join(all_stops)}." if all_stops else ""
        return {
            "answer": f"The uploaded college transport document does not contain route or pickup information for '{req.query}'.{stops_msg} Please refer to the complete PDF schedule or contact the event organizer at {transport_details.get('contact_phone', event.get('organizer_name'))} for special assistance.",
            "source_pages": [],
            "citations": [],
            "has_document": True
        }

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
        transport_pdf_url, whatsapp_group_link, agenda, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event_id, current_user.id, current_user.display_name, college_id, college_name,
        req.title, req.description, req.category, req.poster_url, req.start_date,
        req.end_date, req.registration_deadline, req.venue, req.latitude, req.longitude,
        req.format, req.fee, req.eligibility, req.capacity, 0, req.status,
        req.canonical_registration_link, 1 if req.is_external else 0,
        1 if req.has_transport else 0,
        json.dumps(req.transport_details) if req.transport_details else None,
        req.transport_pdf_url,
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

    if req.transport_pdf_url is not None:
        updates.append("transport_pdf_url = ?")
        params.append(req.transport_pdf_url)

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

@app.post("/api/events/{event_id}/complete")
def complete_event(event_id: str, current_user: UserProfile = Depends(get_current_user)):
    event = query_db("SELECT * FROM events WHERE id = ?", (event_id,), one=True)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if current_user.role != "admin" and event["organizer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to complete this event.")

    now = datetime.now(timezone.utc).isoformat()
    execute_db(
        "UPDATE events SET status = 'closed', completed_at = ?, updated_at = ? WHERE id = ?",
        (now, now, event_id)
    )

    r = query_db("SELECT * FROM events WHERE id = ?", (event_id,), one=True)
    return {
        "success": True,
        "message": f"Event '{event['title']}' marked as successfully completed. Certificate issuance unlocked.",
        "event": hydrate_event(r)
    }

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
    if dl:
        now_dt = datetime.now(timezone.utc)
        if dl.tzinfo is None:
            now_dt = now_dt.replace(tzinfo=None)
        if dl < now_dt:
            raise HTTPException(status_code=400, detail="Registration deadline has expired.")

    # Atomic capacity reservation: increment registered_count ONLY IF registered_count < capacity
    capacity_reserved = execute_db("""
    UPDATE events
    SET registered_count = registered_count + 1
    WHERE id = ? AND registered_count < capacity
    """, (event_id,))

    if capacity_reserved == 0:
        raise HTTPException(
            status_code=400,
            detail="Event capacity reached. You may join the FIFO waitlist to be offered a seat if one frees up."
        )

    now = datetime.now(timezone.utc).isoformat()
    checkin_token = f"EVH-CHK-{uuid.uuid4().hex[:6].upper()}"
    payment_status = "free" if event["fee"] == 0 else "paid" # simulated payment for demo

    is_team_int = 1 if req.is_team else 0
    team_id = f"team-{uuid.uuid4().hex[:8]}" if req.is_team else None
    team_name = req.team_name.strip() if (req.is_team and req.team_name) else (f"{current_user.display_name}'s Team" if req.is_team else None)
    team_qr_token = f"EVH-TEAM-{uuid.uuid4().hex[:6].upper()}" if req.is_team else None

    if existing and existing["registration_status"] == "cancelled":
        reg_id = existing["id"]
        execute_db("""
        UPDATE event_registrations
        SET registration_status = 'confirmed', attendance_status = 'registered',
            attended_at = NULL, qr_checkin_token = ?, payment_status = ?,
            payment_amount = ?, is_team = ?, team_id = ?, team_name = ?, team_qr_token = ?, updated_at = ?
        WHERE id = ?
        """, (checkin_token, payment_status, event["fee"], is_team_int, team_id, team_name, team_qr_token, now, reg_id))
    else:
        reg_id = f"reg-{uuid.uuid4().hex[:8]}"
        execute_db("""
        INSERT INTO event_registrations (
            id, event_id, student_id, student_name, student_email, student_college,
            student_department, student_year, registration_status, attendance_status,
            qr_checkin_token, payment_status, payment_amount,
            is_team, team_id, team_name, team_qr_token, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            reg_id, event_id, current_user.id, current_user.display_name, current_user.email,
            current_user.college_name, current_user.department, current_user.year,
            "confirmed", "registered", checkin_token, payment_status, event["fee"],
            is_team_int, team_id, team_name, team_qr_token, now, now
        ))

    # Also register team members if provided
    if is_team_int and req.team_members:
        for tm in req.team_members:
            if isinstance(tm, dict):
                tm_name = tm.get("name", "Team Member")
                tm_email = tm.get("email", f"{uuid.uuid4().hex[:6]}@student.edu")
                tm_college = tm.get("college", current_user.college_name)
            else:
                tm_name = str(tm)
                tm_email = f"{uuid.uuid4().hex[:6]}@student.edu"
                tm_college = current_user.college_name

            m_stud_id = f"usr-tm-{uuid.uuid4().hex[:8]}"
            m_checkin = f"EVH-CHK-{uuid.uuid4().hex[:6].upper()}"
            execute_db("""
            INSERT INTO event_registrations (
                id, event_id, student_id, student_name, student_email, student_college,
                student_department, student_year, registration_status, attendance_status,
                qr_checkin_token, payment_status, payment_amount,
                is_team, team_id, team_name, team_qr_token, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"reg-{uuid.uuid4().hex[:8]}", event_id, m_stud_id, tm_name, tm_email,
                tm_college, current_user.department, current_user.year,
                "confirmed", "registered", m_checkin, payment_status, 0,
                1, team_id, team_name, team_qr_token, now, now
            ))
            execute_db("UPDATE events SET registered_count = registered_count + 1 WHERE id = ?", (event_id,))

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
        "is_team": bool(is_team_int),
        "team_name": team_name,
        "team_qr_token": team_qr_token,
        "event_title": event["title"],
        "whatsapp_group_link": event["whatsapp_group_link"],
        "message": f"Successfully registered for {event['title']}!"
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

    # Check if this is a Team QR Token
    team_regs = query_db(
        "SELECT * FROM event_registrations WHERE team_qr_token = ? OR team_id = ?",
        (token, token)
    )
    if team_regs:
        team_name = team_regs[0]["team_name"] or "Team"
        event_id = team_regs[0]["event_id"]
        members = []
        for r in team_regs:
            members.append({
                "registration_id": r["id"],
                "student_id": r["student_id"],
                "student_name": r["student_name"],
                "student_email": r["student_email"],
                "student_college": r["student_college"],
                "attendance_status": r["attendance_status"],
                "eligible": r["attendance_status"] != "attended",
                "attended_at": r["attended_at"]
            })
        return {
            "success": True,
            "is_team": True,
            "team_id": team_regs[0]["team_id"],
            "team_name": team_name,
            "event_id": event_id,
            "members": members,
            "total_members": len(members),
            "eligible_count": len([m for m in members if m["eligible"]]),
            "message": f"Resolved team '{team_name}' with {len(members)} member(s)."
        }

    # Individual QR pass or registration ID
    reg = query_db(
        "SELECT * FROM event_registrations WHERE qr_checkin_token = ? OR id = ?",
        (token, token), one=True
    )
    if not reg:
        raise HTTPException(status_code=404, detail="No matching registration found for this QR pass or ID.")

    if reg["attendance_status"] == "attended":
        return {
            "success": True,
            "is_team": False,
            "already_checked_in": True,
            "student_name": reg["student_name"],
            "attended_at": reg["attended_at"],
            "message": f"{reg['student_name']} was ALREADY checked in previously."
        }

    now = datetime.now(timezone.utc).isoformat()
    updated_rows = execute_db("""
    UPDATE event_registrations
    SET attendance_status = ?, attended_at = ?, updated_at = ?
    WHERE id = ? AND attendance_status != 'attended'
    """, (req.status, now, now, reg["id"]))

    if updated_rows == 0:
        return {
            "success": True,
            "is_team": False,
            "already_checked_in": True,
            "student_name": reg["student_name"],
            "attended_at": reg.get("attended_at") or now,
            "message": f"{reg['student_name']} was ALREADY checked in previously."
        }

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
        "is_team": False,
        "already_checked_in": False,
        "student_name": reg["student_name"],
        "registration_id": reg["id"],
        "attended_at": now,
        "message": f"Successfully verified and checked in {reg['student_name']}."
    }

@app.post("/api/attendance/team-checkin")
def team_checkin(req: TeamCheckinRequest, current_user: UserProfile = Depends(get_current_user)):
    if current_user.role not in ("organizer", "admin"):
        raise HTTPException(status_code=403, detail="Only organizers can perform team check-ins.")

    now = datetime.now(timezone.utc).isoformat()
    checked_in = []
    already = []
    failed = []

    for reg_id in req.registration_ids:
        r = query_db("SELECT * FROM event_registrations WHERE id = ? AND event_id = ?", (reg_id, req.event_id), one=True)
        if not r:
            failed.append({"registration_id": reg_id, "reason": "Not found"})
            continue
        if r["attendance_status"] == "attended":
            already.append({"registration_id": reg_id, "student_name": r["student_name"]})
            continue

        execute_db(
            "UPDATE event_registrations SET attendance_status = 'attended', attended_at = ?, updated_at = ? WHERE id = ?",
            (now, now, reg_id)
        )
        checked_in.append({"registration_id": reg_id, "student_name": r["student_name"]})

        execute_db("""
        INSERT INTO notifications (id, recipient_id, title, message, type, event_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            f"notif-{uuid.uuid4().hex[:8]}", r["student_id"],
            "Team Attendance Verified!",
            f"Your team attendance has been confirmed by organizers.",
            "registration", req.event_id
        ))

    return {
        "success": True,
        "checked_in_count": len(checked_in),
        "already_attended_count": len(already),
        "failed_count": len(failed),
        "checked_in": checked_in,
        "already_attended": already,
        "failed": failed,
        "message": f"Successfully checked in {len(checked_in)} team member(s)."
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
        signatory_name, verification_token, template_id, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        f"cert-{uuid.uuid4().hex[:8]}", cert_id, event["id"], event["title"],
        event["organizer_name"], event["college_name"], student["id"],
        student["display_name"], today_date, req.certificate_type,
        req.signatory_title, req.signatory_name, verify_token, "standard", "valid", now
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

@app.post("/api/certificates/bulk-issue")
def bulk_issue_certificates(req: BulkCertificateIssueRequest, current_user: UserProfile = Depends(get_current_user)):
    if current_user.role not in ("organizer", "admin"):
        raise HTTPException(status_code=403, detail="Only organizers can issue certificates.")

    event = query_db("SELECT * FROM events WHERE id = ?", (req.event_id,), one=True)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get all verified attendees
    attendees = query_db(
        "SELECT * FROM event_registrations WHERE event_id = ? AND attendance_status = 'attended'",
        (req.event_id,)
    )
    if not attendees:
        return {
            "success": True,
            "issued_count": 0,
            "skipped_count": 0,
            "total_attended": 0,
            "message": "No verified attendees found for this event."
        }

    year_str = datetime.now().year
    today_date = datetime.now().strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc).isoformat()

    issued = []
    skipped = []

    for att in attendees:
        # Check existing valid certificate
        existing = query_db(
            "SELECT id, certificate_id FROM certificates WHERE event_id = ? AND student_id = ? AND status = 'valid'",
            (req.event_id, att["student_id"]), one=True
        )
        if existing:
            skipped.append({
                "student_name": att["student_name"],
                "certificate_id": existing["certificate_id"],
                "reason": "Already issued"
            })
            continue

        cert_id = f"EVH-{year_str}-{uuid.uuid4().hex[:6].upper()}"
        verify_token = f"VTOK-{uuid.uuid4().hex[:10]}"

        execute_db("""
        INSERT INTO certificates (
            id, certificate_id, event_id, event_title, organizer_name, college_name,
            student_id, student_name, issue_date, certificate_type, signatory_title,
            signatory_name, verification_token, template_id, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"cert-{uuid.uuid4().hex[:8]}", cert_id, event["id"], event["title"],
            event["organizer_name"], event["college_name"], att["student_id"],
            att["student_name"], today_date, req.certificate_type,
            req.signatory_title, req.signatory_name, verify_token, req.template_id or "standard",
            "valid", now
        ))

        execute_db("""
        INSERT INTO notifications (id, recipient_id, title, message, type, event_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            f"notif-{uuid.uuid4().hex[:8]}", att["student_id"],
            "Certificate of Achievement Issued!",
            f"Your digital certificate for {event['title']} has been issued. View and download from your Achievements.",
            "certificate", event["id"]
        ))

        issued.append({
            "certificate_id": cert_id,
            "student_name": att["student_name"],
            "student_college": att["student_college"]
        })

    return {
        "success": True,
        "issued_count": len(issued),
        "skipped_count": len(skipped),
        "total_attended": len(attendees),
        "issued": issued,
        "skipped": skipped,
        "message": f"Successfully issued {len(issued)} digital certificate(s) for verified attendees."
    }

@app.get("/api/certificates/collection/{event_id}")
def get_event_certificate_collection(event_id: str):
    """Public collection page showing verifiable certificate directory for an event."""
    event = query_db("SELECT * FROM events WHERE id = ?", (event_id,), one=True)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    certs = query_db(
        "SELECT certificate_id, student_name, issue_date, certificate_type, template_id, status FROM certificates WHERE event_id = ? AND status = 'valid' ORDER BY student_name ASC",
        (event_id,)
    )

    return {
        "event_id": event["id"],
        "event_title": event["title"],
        "college_name": event["college_name"],
        "organizer_name": event["organizer_name"],
        "start_date": event["start_date"],
        "end_date": event["end_date"],
        "completed_at": event.get("completed_at"),
        "total_issued": len(certs),
        "certificates": certs
    }


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
