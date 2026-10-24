-- =========================================================
-- EveHub Supabase / PostgreSQL Database Schema
-- Production-ready schema with RLS, Constraints, and Indexes
-- =========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COLLEGES TABLE
CREATE TABLE IF NOT EXISTS public.colleges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT,
    district TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'Tamil Nadu',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    verified BOOLEAN NOT NULL DEFAULT TRUE,
    address TEXT,
    logo_url TEXT,
    website TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PROFILES TABLE (Linked with Supabase auth.users or standalone)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'organizer', 'admin')),
    college_id TEXT REFERENCES public.colleges(id) ON DELETE SET NULL,
    college_name TEXT,
    department TEXT,
    year TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT PRIMARY KEY,
    organizer_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organizer_name TEXT NOT NULL,
    college_id TEXT NOT NULL REFERENCES public.colleges(id) ON DELETE RESTRICT,
    college_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Technical', 'Hackathon', 'Symposium', 'Workshop', 'Cultural', 'Sports', 'Management')),
    poster_url TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    registration_deadline TIMESTAMPTZ NOT NULL,
    venue TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    format TEXT NOT NULL CHECK (format IN ('offline', 'online', 'hybrid')),
    fee INTEGER NOT NULL DEFAULT 0,
    eligibility TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    registered_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'closing_soon', 'waitlist', 'closed', 'cancelled')),
    canonical_registration_link TEXT,
    is_external BOOLEAN NOT NULL DEFAULT FALSE,
    has_transport BOOLEAN NOT NULL DEFAULT FALSE,
    transport_details JSONB,
    whatsapp_group_link TEXT,
    agenda JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. EVENT REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    student_college TEXT,
    student_department TEXT,
    student_year TEXT,
    registration_status TEXT NOT NULL CHECK (registration_status IN ('confirmed', 'waitlisted', 'cancelled')),
    attendance_status TEXT NOT NULL CHECK (attendance_status IN ('registered', 'attended', 'absent', 'excused')),
    attended_at TIMESTAMPTZ,
    qr_checkin_token TEXT UNIQUE,
    payment_status TEXT NOT NULL DEFAULT 'free' CHECK (payment_status IN ('free', 'paid', 'pending', 'refunded')),
    payment_amount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_student_event UNIQUE (event_id, student_id)
);

-- 5. SAVED EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.saved_events (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_student_saved_event UNIQUE (student_id, event_id)
);

-- 6. STUDENT TIMETABLE ENTRIES
CREATE TABLE IF NOT EXISTS public.timetable_entries (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('class', 'lab', 'exam', 'assignment', 'other')),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. STUDENT QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.student_questions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_email TEXT,
    question TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'answered', 'escalated')),
    urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'safety')),
    answer TEXT,
    answered_by TEXT,
    answered_at TIMESTAMPTZ,
    is_public_faq BOOLEAN NOT NULL DEFAULT FALSE,
    call_requested BOOLEAN NOT NULL DEFAULT FALSE,
    call_slot TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. WAITLIST ENTRIES TABLE (FIFO)
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    queue_position INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('waiting', 'offered', 'accepted', 'declined', 'expired')),
    offer_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_waitlist_per_student UNIQUE (event_id, student_id)
);

-- 9. CERTIFICATES TABLE
CREATE TABLE IF NOT EXISTS public.certificates (
    id TEXT PRIMARY KEY,
    certificate_id TEXT UNIQUE NOT NULL,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    event_title TEXT NOT NULL,
    organizer_name TEXT NOT NULL,
    college_name TEXT NOT NULL,
    student_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    issue_date DATE NOT NULL,
    certificate_type TEXT NOT NULL CHECK (certificate_type IN ('Participation', 'Excellence', 'Winner', 'Runner-up', 'Organizer')),
    signatory_title TEXT NOT NULL,
    signatory_name TEXT NOT NULL,
    verification_token TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'revoked', 'reissued')),
    reissued_to TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    channel TEXT NOT NULL DEFAULT 'in_app',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events (start_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events (status);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events (category);
CREATE INDEX IF NOT EXISTS idx_events_college ON public.events (college_id);
CREATE INDEX IF NOT EXISTS idx_registrations_student ON public.event_registrations (student_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON public.event_registrations (event_id);
CREATE INDEX IF NOT EXISTS idx_timetable_student ON public.timetable_entries (student_id, date);
CREATE INDEX IF NOT EXISTS idx_certificates_cert_id ON public.certificates (certificate_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_event_queue ON public.waitlist_entries (event_id, queue_position);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_id, read);

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow public read of published events and verified colleges
CREATE POLICY "Public read events" ON public.events FOR SELECT USING (status != 'draft');
CREATE POLICY "Public read colleges" ON public.colleges FOR SELECT USING (true);
CREATE POLICY "Public verify certificates" ON public.certificates FOR SELECT USING (true);
