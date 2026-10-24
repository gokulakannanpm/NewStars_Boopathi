# EveHub — Unified Inter-College Event Discovery & Verified Participation Platform

EveHub is a modern, trusted web platform engineered to eliminate chaotic Google Forms, unverified social media posters, and scheduling clashes across collegiate symposiums, hackathons, workshops, and sports tournaments.

---

## Key Capabilities Across Phases

### 1. Deterministic Timetable Conflict Guard (Phase 3)
- Rather than relying on inaccurate AI guesses, EveHub implements exact mathematical interval overlap logic:
  $$\max(S_1, S_2) < \min(E_1, E_2)$$
- Checks academic exams, mandatory labs, and lecture commitments against collegiate event intervals.
- Evaluates boundaries cleanly: exact end-to-start boundaries are non-conflicting.
- Provides informative alerts before registration and allows informed student acknowledgment.

### 2. Zero-Trust Venue Check-In & Attendance (Phase 4)
- Prevents student self-reporting of attendance.
- Generates unique cryptographic QR tokens (`EVH-CHK-XXXX`) upon confirmed registration.
- On-venue organizer scanning console with duplicate check-in prevention and audit logging.

### 3. Verifiable Digital Credentials (Phase 4 & 5)
- Certificates of Participation, Excellence, and Category Winners are minted strictly after verified gate check-in.
- Generates high-resolution vector PDF certificates directly in the browser via `jsPDF`.
- Public validator at `/verify-certificate/:certId` confirms validity without exposing sensitive student personal data.

### 4. FIFO Priority Waitlist & Seat Recovery (Phase 4)
- Enforces hard seat capacities.
- Strict timestamped First-In-First-Out queue order.
- When an attendee cancels a pass, the seat is automatically returned to the pool and offered to the next waitlisted student with a 24-hour acceptance window.

### 5. Campus Logistics & WhatsApp Communities (Phase 3)
- Official college shuttle transport details: designated pickup spots, morning departure and evening return times, bus coordinator contacts.
- Event-specific WhatsApp community invite links revealed upon verified registration.

---

## Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, React Router 7 |
| **Backend** | Python 3.13, FastAPI, Pydantic v2, Uvicorn, Pytest |
| **Database** | SQLite (zero-config local engine) + Supabase PostgreSQL schema with Row-Level Security (RLS) |
| **Credential Engine** | jsPDF, QRCode |
| **Deployment** | Vercel (`vercel.json`) & Render (`render.yaml`) |

---

## Directory Structure

```
EveHub/
├── frontend/                # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── api/             # Typed API client and data models
│   │   ├── context/         # AuthContext (with fast demo role switcher) & ToastContext
│   │   ├── components/      # Common UI, layouts, event modals, certificate cards
│   │   ├── pages/           # Public, Student, and Organizer pages
│   │   ├── App.tsx          # Client-side router
│   │   └── index.css        # Tailwind tokens & typography
│   └── package.json
├── backend/                 # FastAPI backend
│   ├── main.py              # REST API endpoints
│   ├── database.py          # SQLite database connection & auto-seeding
│   ├── models.py            # Pydantic v2 models
│   ├── conflict_engine.py   # Deterministic interval math & Haversine formula
│   ├── seed_data.py         # Realistic demo colleges, events, timetable & certificates
│   ├── requirements.txt     # Python dependencies
│   └── tests/
│       └── test_api.py      # Automated pytest suite
├── supabase/
│   └── schema.sql           # Production PostgreSQL schema with RLS & indexes
├── render.yaml              # Render backend deployment descriptor
├── vercel.json              # Vercel frontend deployment descriptor
├── .env.example             # Environment variable template
└── README.md
```

---

## Running Locally

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### 1. Start the FastAPI Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
- API will be accessible at: `http://127.0.0.1:8000`
- Interactive OpenAPI Swagger docs at: `http://127.0.0.1:8000/docs`

### 2. Start the React Frontend
```bash
cd frontend
npm install
npm run dev
```
- Web application will be accessible at: `http://localhost:5173`

---

## Automated Test Suite

To run the backend test suite covering conflict interval math, distance calculations, QR check-ins, and certificate validation:

```bash
cd backend
python -m pytest tests/ -v
```

All 7 test suites pass with 100% success rate.

---

## Pre-Configured Demo Accounts

For evaluation without typing credentials, click **"Student View"** or **"Organizer View"** in the top black notification bar on any page:

1. **Student Account:**
   - **Name:** Gokul Kannan
   - **Institution:** SSN College of Engineering (Dept of IT, 3rd Year)
   - **Pre-seeded conflicts:** Continuous Assessment Exam on Shaastra Hackathon day
   - **Credentials:** `student@evehub.in` / `evehub123`

2. **Organizer Account:**
   - **Name:** Dr. Arun Kumar (Convener)
   - **Institution:** College of Engineering, Guindy (Anna University)
   - **Authority:** Host check-in gate operator, certificate minting authority
   - **Credentials:** `organizer@evehub.in` / `evehub123`
