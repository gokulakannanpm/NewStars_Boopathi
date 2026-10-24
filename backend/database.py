"""
Database layer for EveHub.
Provides clean SQLite persistence with optional Supabase client bridge.
"""
import sqlite3
import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from seed_data import (
    get_demo_colleges,
    get_demo_users,
    get_demo_events,
    get_demo_timetable,
    get_demo_registrations,
    get_demo_certificates,
    get_demo_questions
)

DB_PATH = os.getenv("DATABASE_FILE", str(Path(__file__).parent / "evehub.db"))

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.executescript("""
    CREATE TABLE IF NOT EXISTS colleges (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        short_name TEXT,
        district TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'Tamil Nadu',
        latitude REAL,
        longitude REAL,
        verified INTEGER NOT NULL DEFAULT 1,
        address TEXT,
        website TEXT
    );

    CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('student', 'organizer', 'admin')),
        college_id TEXT,
        college_name TEXT,
        department TEXT,
        year TEXT,
        phone TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        organizer_id TEXT NOT NULL,
        organizer_name TEXT NOT NULL,
        college_id TEXT NOT NULL,
        college_name TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        poster_url TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        registration_deadline TEXT NOT NULL,
        venue TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        format TEXT NOT NULL DEFAULT 'offline',
        fee INTEGER NOT NULL DEFAULT 0,
        eligibility TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        registered_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'open',
        canonical_registration_link TEXT,
        is_external INTEGER NOT NULL DEFAULT 0,
        has_transport INTEGER NOT NULL DEFAULT 0,
        transport_details TEXT, -- JSON string
        transport_pdf_url TEXT,
        whatsapp_group_link TEXT,
        agenda TEXT,            -- JSON string
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS event_registrations (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        student_email TEXT NOT NULL,
        student_college TEXT,
        student_department TEXT,
        student_year TEXT,
        registration_status TEXT NOT NULL DEFAULT 'confirmed',
        attendance_status TEXT NOT NULL DEFAULT 'registered',
        attended_at TEXT,
        qr_checkin_token TEXT UNIQUE,
        payment_status TEXT NOT NULL DEFAULT 'free',
        payment_amount INTEGER NOT NULL DEFAULT 0,
        is_team INTEGER NOT NULL DEFAULT 0,
        team_id TEXT,
        team_name TEXT,
        team_qr_token TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (event_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS saved_events (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (student_id, event_id)
    );

    CREATE TABLE IF NOT EXISTS timetable_entries (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_questions (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        student_email TEXT,
        question TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        urgency TEXT NOT NULL DEFAULT 'normal',
        answer TEXT,
        answered_by TEXT,
        answered_at TEXT,
        is_public_faq INTEGER NOT NULL DEFAULT 0,
        call_requested INTEGER NOT NULL DEFAULT 0,
        call_slot TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS waitlist_entries (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        student_email TEXT NOT NULL,
        queue_position INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'waiting',
        offer_expires_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (event_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS certificates (
        id TEXT PRIMARY KEY,
        certificate_id TEXT UNIQUE NOT NULL,
        event_id TEXT NOT NULL,
        event_title TEXT NOT NULL,
        organizer_name TEXT NOT NULL,
        college_name TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        issue_date TEXT NOT NULL,
        certificate_type TEXT NOT NULL DEFAULT 'Participation',
        signatory_title TEXT NOT NULL,
        signatory_name TEXT NOT NULL,
        verification_token TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'valid',
        reissued_to TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        recipient_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        event_id TEXT,
        read INTEGER NOT NULL DEFAULT 0,
        channel TEXT NOT NULL DEFAULT 'in_app',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Safe column migrations for existing databases
    for table, col, col_type in [
        ("colleges", "college_type", "TEXT DEFAULT 'Engineering'"),
        ("colleges", "logo_url", "TEXT"),
        ("colleges", "source_url", "TEXT"),
        ("events", "transport_pdf_url", "TEXT"),
        ("events", "completed_at", "TEXT"),
        ("event_registrations", "is_team", "INTEGER NOT NULL DEFAULT 0"),
        ("event_registrations", "team_id", "TEXT"),
        ("event_registrations", "team_name", "TEXT"),
        ("event_registrations", "team_qr_token", "TEXT"),
        ("certificates", "template_id", "TEXT DEFAULT 'standard'")
    ]:
        try:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        except Exception:
            pass

    # Ensure all demo colleges with verified coordinates, college_type, and provenance source_url are present
    for clg in get_demo_colleges():
        cur.execute("""
        INSERT OR REPLACE INTO colleges (id, name, short_name, district, state, college_type, latitude, longitude, verified, address, website, source_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            clg["id"], clg["name"], clg.get("short_name"), clg["district"], clg.get("state", "Tamil Nadu"),
            clg.get("college_type", "Engineering"), clg.get("latitude"), clg.get("longitude"),
            clg.get("verified", 1), clg.get("address"), clg.get("website"), clg.get("source_url")
        ))

    # Synchronize demo student profile to canonical Sri Sairam Engineering College
    cur.execute("""
    UPDATE profiles
    SET college_id = 'clg-sairam-eng', college_name = 'Sri Sairam Engineering College'
    WHERE id = 'usr-student-1';
    """)

    # Ensure demo events with fresh live/upcoming timestamps are present
    for evt in get_demo_events():
        cur.execute("""
        INSERT OR REPLACE INTO events (
            id, organizer_id, organizer_name, college_id, college_name, title, description,
            category, poster_url, start_date, end_date, registration_deadline, venue,
            latitude, longitude, format, fee, eligibility, capacity, registered_count,
            status, canonical_registration_link, is_external, has_transport, transport_details,
            whatsapp_group_link, agenda
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            evt["id"], evt["organizer_id"], evt["organizer_name"], evt["college_id"], evt["college_name"],
            evt["title"], evt["description"], evt["category"], evt.get("poster_url"), evt["start_date"],
            evt["end_date"], evt["registration_deadline"], evt["venue"], evt.get("latitude"), evt.get("longitude"),
            evt.get("format", "offline"), evt.get("fee", 0), evt.get("eligibility", ""), evt.get("capacity", 100),
            evt.get("registered_count", 0), evt.get("status", "open"), evt.get("canonical_registration_link"),
            evt.get("is_external", 0), evt.get("has_transport", 0),
            json.dumps(evt["transport_details"]) if evt.get("transport_details") else None,
            evt.get("whatsapp_group_link"),
            json.dumps(evt["agenda"]) if evt.get("agenda") else None
        ))

    # Seed users and timetable if empty
    user_count = cur.execute("SELECT COUNT(*) FROM profiles").fetchone()[0]
    if user_count == 0:
        # Users
        for usr in get_demo_users():
            cur.execute("""
            INSERT INTO profiles (id, email, password_hash, display_name, role, college_id, college_name, department, year, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                usr["id"], usr["email"], usr["password_hash"], usr["display_name"], usr["role"],
                usr["college_id"], usr["college_name"], usr["department"], usr["year"], usr["phone"]
            ))

        # Timetable
        for tt in get_demo_timetable():
            cur.execute("""
            INSERT INTO timetable_entries (id, student_id, title, type, date, start_time, end_time, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tt["id"], tt["student_id"], tt["title"], tt["type"], tt["date"],
                tt["start_time"], tt["end_time"], tt["notes"]
            ))

        # Registrations
        for reg in get_demo_registrations():
            cur.execute("""
            INSERT INTO event_registrations (
                id, event_id, student_id, student_name, student_email, student_college,
                student_department, student_year, registration_status, attendance_status,
                attended_at, qr_checkin_token, payment_status, payment_amount, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                reg["id"], reg["event_id"], reg["student_id"], reg["student_name"], reg["student_email"],
                reg["student_college"], reg["student_department"], reg["student_year"], reg["registration_status"],
                reg["attendance_status"], reg["attended_at"], reg["qr_checkin_token"], reg["payment_status"],
                reg["payment_amount"], reg["created_at"]
            ))

        # Certificates
        for cert in get_demo_certificates():
            cur.execute("""
            INSERT INTO certificates (
                id, certificate_id, event_id, event_title, organizer_name, college_name,
                student_id, student_name, issue_date, certificate_type, signatory_title,
                signatory_name, verification_token, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cert["id"], cert["certificate_id"], cert["event_id"], cert["event_title"], cert["organizer_name"],
                cert["college_name"], cert["student_id"], cert["student_name"], cert["issue_date"],
                cert["certificate_type"], cert["signatory_title"], cert["signatory_name"],
                cert["verification_token"], cert["status"], cert["created_at"]
            ))

        # Questions
        for q in get_demo_questions():
            cur.execute("""
            INSERT INTO student_questions (
                id, event_id, student_id, student_name, student_email, question, status,
                urgency, answer, answered_by, answered_at, is_public_faq, call_requested,
                call_slot, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                q["id"], q["event_id"], q["student_id"], q["student_name"], q["student_email"],
                q["question"], q["status"], q["urgency"], q["answer"], q["answered_by"],
                q["answered_at"], q["is_public_faq"], q["call_requested"], q["call_slot"], q["created_at"]
            ))

        # Welcome notification
        cur.execute("""
        INSERT INTO notifications (id, recipient_id, title, message, type, event_id, read)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            "notif-welcome",
            "usr-student-1",
            "Welcome to EveHub!",
            "Your profile is active. Check your timetable conflict detector before registering for upcoming events.",
            "registration",
            None,
            0
        ))

    conn.commit()
    conn.close()

# Helper query wrappers
def query_db(query: str, args: tuple = (), one: bool = False) -> Any:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(query, args)
    rv = cur.fetchall()
    conn.close()
    if not rv:
        return None if one else []
    return (dict(rv[0])) if one else [dict(r) for r in rv]

def execute_db(query: str, args: tuple = ()) -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(query, args)
    conn.commit()
    count = cur.rowcount
    conn.close()
    return count

# Automatically initialize on import
try:
    init_db()
except Exception as e:
    print(f"Database auto-init notice: {e}")

