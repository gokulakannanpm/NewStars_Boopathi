from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime

# ==================== User & Auth Models ====================
RoleType = Literal["student", "organizer", "admin"]

class UserProfile(BaseModel):
    id: str
    email: str
    display_name: str
    role: RoleType = "student"
    college_id: Optional[str] = None
    college_name: Optional[str] = None
    department: Optional[str] = None
    year: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str
    role: RoleType = "student"
    college_id: Optional[str] = None
    college_name: Optional[str] = None
    department: Optional[str] = None
    year: Optional[str] = None
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    user: UserProfile
    token: str

class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    college_id: Optional[str] = None
    college_name: Optional[str] = None
    department: Optional[str] = None
    year: Optional[str] = None
    phone: Optional[str] = None

# ==================== College Models ====================
class College(BaseModel):
    id: str
    name: str
    short_name: Optional[str] = None
    district: str
    state: str = "Tamil Nadu"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    verified: bool = True
    address: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None

# ==================== Event Models ====================
EventCategory = Literal["Technical", "Hackathon", "Symposium", "Workshop", "Cultural", "Sports", "Management"]
EventStatus = Literal["draft", "open", "closing_soon", "waitlist", "closed", "cancelled"]
EventFormat = Literal["offline", "online", "hybrid"]

class TransportDetails(BaseModel):
    available: bool = False
    pickup_points: List[str] = []
    departure_time: Optional[str] = None
    return_time: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None

class Event(BaseModel):
    id: str
    organizer_id: str
    organizer_name: str
    college_id: str
    college_name: str
    title: str
    description: str
    category: EventCategory
    poster_url: Optional[str] = None
    start_date: str  # ISO-8601 string
    end_date: str    # ISO-8601 string
    registration_deadline: str
    venue: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    format: EventFormat = "offline"
    fee: int = 0  # in INR (0 = free)
    eligibility: str = "All engineering & arts students"
    capacity: int = 100
    registered_count: int = 0
    status: EventStatus = "open"
    canonical_registration_link: Optional[str] = None
    is_external: bool = False
    has_transport: bool = False
    transport_details: Optional[Dict[str, Any]] = None
    transport_pdf_url: Optional[str] = None
    whatsapp_group_link: Optional[str] = None
    agenda: Optional[List[Dict[str, str]]] = None
    completed_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class EventCreate(BaseModel):
    title: str
    description: str
    category: EventCategory
    poster_url: Optional[str] = None
    start_date: str
    end_date: str
    registration_deadline: str
    venue: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    format: EventFormat = "offline"
    fee: int = 0
    eligibility: str = "Open to all enrolled college students"
    capacity: int = 100
    college_id: Optional[str] = None
    college_name: Optional[str] = None
    is_external: bool = False
    canonical_registration_link: Optional[str] = None
    has_transport: bool = False
    transport_details: Optional[Dict[str, Any]] = None
    transport_pdf_url: Optional[str] = None
    whatsapp_group_link: Optional[str] = None
    agenda: Optional[List[Dict[str, str]]] = None
    status: EventStatus = "open"

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[EventCategory] = None
    poster_url: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    registration_deadline: Optional[str] = None
    venue: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    format: Optional[EventFormat] = None
    fee: Optional[int] = None
    eligibility: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[EventStatus] = None
    has_transport: Optional[bool] = None
    transport_details: Optional[Dict[str, Any]] = None
    transport_pdf_url: Optional[str] = None
    whatsapp_group_link: Optional[str] = None
    agenda: Optional[List[Dict[str, str]]] = None
    completed_at: Optional[str] = None

# ==================== Registration & Attendance ====================
RegistrationStatus = Literal["confirmed", "waitlisted", "cancelled"]
AttendanceStatus = Literal["registered", "attended", "absent", "excused"]

class EventRegistration(BaseModel):
    id: str
    event_id: str
    student_id: str
    student_name: str
    student_email: str
    student_college: Optional[str] = None
    student_department: Optional[str] = None
    student_year: Optional[str] = None
    registration_status: RegistrationStatus = "confirmed"
    attendance_status: AttendanceStatus = "registered"
    attended_at: Optional[str] = None
    qr_checkin_token: Optional[str] = None
    payment_status: str = "free"
    payment_amount: int = 0
    is_team: bool = False
    team_id: Optional[str] = None
    team_name: Optional[str] = None
    team_qr_token: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

class RegisterEventRequest(BaseModel):
    confirm_terms: bool = True
    notes: Optional[str] = None
    is_team: bool = False
    team_name: Optional[str] = None
    team_members: Optional[List[Any]] = None

class AttendanceCheckinRequest(BaseModel):
    token_or_registration_id: str
    manual: bool = False
    status: AttendanceStatus = "attended"

class TeamCheckinRequest(BaseModel):
    event_id: str
    team_id: Optional[str] = None
    registration_ids: List[str]

class TransportAskAIRequest(BaseModel):
    event_id: str
    query: str

class BulkCertificateIssueRequest(BaseModel):
    event_id: str
    certificate_type: Literal["Participation", "Excellence", "Winner", "Runner-up", "Organizer"] = "Participation"
    signatory_name: str = "Dr. Arun Kumar"
    signatory_title: str = "Convener & Head of Department"
    template_id: Optional[str] = "standard"

# ==================== Timetable & Conflict Detection ====================
class TimetableEntry(BaseModel):
    id: str
    student_id: str
    title: str
    type: Literal["class", "lab", "exam", "assignment", "other"] = "class"
    date: str       # YYYY-MM-DD
    start_time: str # HH:MM
    end_time: str   # HH:MM
    notes: Optional[str] = None
    created_at: Optional[str] = None

class TimetableCreate(BaseModel):
    title: str
    type: Literal["class", "lab", "exam", "assignment", "other"] = "class"
    date: str
    start_time: str
    end_time: str
    notes: Optional[str] = None

class ConflictDetectionResult(BaseModel):
    status: Literal["conflict", "no_conflict", "unknown"]
    message: str
    conflicting_entries: List[Dict[str, Any]] = []
    overlapping_intervals: List[str] = []

# ==================== Student Questions & Organizer Support ====================
QuestionStatus = Literal["pending", "in_progress", "answered", "escalated"]
UrgencyLevel = Literal["normal", "urgent", "safety"]

class StudentQuestion(BaseModel):
    id: str
    event_id: str
    student_id: str
    student_name: str
    student_email: Optional[str] = None
    question: str
    status: QuestionStatus = "pending"
    urgency: UrgencyLevel = "normal"
    answer: Optional[str] = None
    answered_by: Optional[str] = None
    answered_at: Optional[str] = None
    is_public_faq: bool = False
    call_requested: bool = False
    call_slot: Optional[str] = None
    created_at: str

class QuestionCreate(BaseModel):
    event_id: str
    question: str
    urgency: UrgencyLevel = "normal"
    call_requested: bool = False
    call_slot: Optional[str] = None

class QuestionAnswer(BaseModel):
    answer: str
    status: QuestionStatus = "answered"
    is_public_faq: bool = False

# ==================== Waitlist Models ====================
class WaitlistEntry(BaseModel):
    id: str
    event_id: str
    student_id: str
    student_name: str
    student_email: str
    queue_position: int
    status: Literal["waiting", "offered", "accepted", "declined", "expired"] = "waiting"
    offer_expires_at: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

# ==================== Certificate Models ====================
CertificateType = Literal["Participation", "Excellence", "Winner", "Runner-up", "Organizer"]

class Certificate(BaseModel):
    id: str
    certificate_id: str  # Unique code e.g. EVH-2026-X99
    event_id: str
    event_title: str
    organizer_name: str
    college_name: str
    student_id: str
    student_name: str
    issue_date: str
    certificate_type: CertificateType = "Participation"
    signatory_title: str
    signatory_name: str
    verification_token: str
    status: Literal["valid", "revoked", "reissued"] = "valid"
    reissued_to: Optional[str] = None
    created_at: str

class CertificateIssueRequest(BaseModel):
    event_id: str
    student_id: str
    certificate_type: CertificateType = "Participation"
    signatory_name: str = "Dr. K. Senthil Kumar"
    signatory_title: str = "Dean & Convener"

# ==================== Notification Models ====================
class Notification(BaseModel):
    id: str
    recipient_id: str
    title: str
    message: str
    type: str
    event_id: Optional[str] = None
    read: bool = False
    channel: str = "in_app"
    created_at: str
