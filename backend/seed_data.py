"""
High-quality seed data for EveHub demonstration.
Features realistic colleges, events across categories, transport schedules,
timetable entries with a real conflict case, questions, and verifiable certificates.
"""
from datetime import datetime, timedelta, timezone

NOW = datetime.now(timezone.utc)

def get_demo_colleges():
    return [
        {
            "id": "clg-ceg",
            "name": "College of Engineering, Guindy (Anna University)",
            "short_name": "CEG Anna Univ",
            "district": "Chennai",
            "state": "Tamil Nadu",
            "latitude": 13.0109,
            "longitude": 80.2354,
            "verified": 1,
            "address": "12, Sardar Patel Rd, Guindy, Chennai, Tamil Nadu 600025",
            "website": "https://ceg.annauniv.edu"
        },
        {
            "id": "clg-iitm",
            "name": "Indian Institute of Technology Madras (IIT Madras)",
            "short_name": "IIT Madras",
            "district": "Chennai",
            "state": "Tamil Nadu",
            "latitude": 12.9915,
            "longitude": 80.2337,
            "verified": 1,
            "address": "IIT P.O., Chennai, Tamil Nadu 600036",
            "website": "https://www.iitm.ac.in"
        },
        {
            "id": "clg-psg",
            "name": "PSG College of Technology",
            "short_name": "PSG Tech",
            "district": "Coimbatore",
            "state": "Tamil Nadu",
            "latitude": 11.0245,
            "longitude": 76.9946,
            "verified": 1,
            "address": "Avinashi Rd, Peelamedu, Coimbatore, Tamil Nadu 641004",
            "website": "https://www.psgtech.edu"
        },
        {
            "id": "clg-ssn",
            "name": "SSN College of Engineering",
            "short_name": "SSN CE",
            "district": "Chengalpattu",
            "state": "Tamil Nadu",
            "latitude": 12.7508,
            "longitude": 80.1970,
            "verified": 1,
            "address": "Old Mahabalipuram Rd, Kalavakkam, Tamil Nadu 603110",
            "website": "https://www.ssn.edu.in"
        },
        {
            "id": "clg-nitt",
            "name": "National Institute of Technology Tiruchirappalli (NIT Trichy)",
            "short_name": "NIT Trichy",
            "district": "Tiruchirappalli",
            "state": "Tamil Nadu",
            "latitude": 10.7607,
            "longitude": 78.8143,
            "verified": 1,
            "address": "Tanjore Main Rd, NH67, Tiruchirappalli, Tamil Nadu 620015",
            "website": "https://www.nitt.edu"
        },
        {
            "id": "clg-vit",
            "name": "Vellore Institute of Technology (VIT)",
            "short_name": "VIT Vellore",
            "district": "Vellore",
            "state": "Tamil Nadu",
            "latitude": 12.9692,
            "longitude": 79.1559,
            "verified": 1,
            "address": "Near Katpadi Rd, Vellore, Tamil Nadu 632014",
            "website": "https://vit.ac.in"
        }
    ]

def get_demo_users():
    return [
        {
            "id": "usr-student-1",
            "email": "student@evehub.in",
            "password_hash": "evehub123", # demo mode hash
            "display_name": "Gokul Kannan",
            "role": "student",
            "college_id": "clg-ssn",
            "college_name": "SSN College of Engineering",
            "department": "Information Technology",
            "year": "3rd Year",
            "phone": "+91 98765 43210"
        },
        {
            "id": "usr-organizer-1",
            "email": "organizer@evehub.in",
            "password_hash": "evehub123",
            "display_name": "Dr. Arun Kumar (Convener)",
            "role": "organizer",
            "college_id": "clg-ceg",
            "college_name": "College of Engineering, Guindy",
            "department": "Computer Science & Engineering",
            "year": "Faculty",
            "phone": "+91 94440 12345"
        },
        {
            "id": "usr-organizer-2",
            "email": "shaastra@iitm.ac.in",
            "password_hash": "evehub123",
            "display_name": "Shaastra Core Team",
            "role": "organizer",
            "college_id": "clg-iitm",
            "college_name": "Indian Institute of Technology Madras",
            "department": "Student Affairs Council",
            "year": "Core Committee",
            "phone": "+91 98888 77777"
        }
    ]

def get_demo_events():
    d1 = (NOW + timedelta(days=3)).strftime("%Y-%m-%d")
    d2 = (NOW + timedelta(days=5)).strftime("%Y-%m-%d")
    d3 = (NOW + timedelta(days=8)).strftime("%Y-%m-%d")
    d4 = (NOW + timedelta(days=12)).strftime("%Y-%m-%d")
    d5 = (NOW + timedelta(days=16)).strftime("%Y-%m-%d")

    return [
        {
            "id": "evt-shaastra-ai",
            "organizer_id": "usr-organizer-2",
            "organizer_name": "Shaastra IIT Madras",
            "college_id": "clg-iitm",
            "college_name": "Indian Institute of Technology Madras (IIT Madras)",
            "title": "Shaastra 2026: AI & Edge Robotics Hackathon",
            "description": "A 36-hour flagship hackathon challenging engineering students across India to build edge-optimized computer vision and autonomous robotics solutions. Mentored by IIT faculty and industry leaders.",
            "category": "Hackathon",
            "poster_url": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
            "start_date": f"{d1}T09:00:00",
            "end_date": f"{d1}T21:00:00",
            "registration_deadline": f"{d1}T06:00:00",
            "venue": "IC&SR Auditorium & Robotics Labs, IIT Madras Campus",
            "latitude": 12.9915,
            "longitude": 80.2337,
            "format": "offline",
            "fee": 0,
            "eligibility": "B.E/B.Tech/M.Tech students (Teams of 2 to 4)",
            "capacity": 150,
            "registered_count": 82,
            "status": "open",
            "canonical_registration_link": None,
            "is_external": 0,
            "has_transport": 1,
            "transport_details": {
                "available": True,
                "pickup_points": ["Chennai Central Railway Station (Bay 4)", "Guindy Metro Station Exit B", "Tambaram Bus Stand"],
                "departure_time": "07:30 AM",
                "return_time": "09:30 PM",
                "contact_person": "Student Transport Lead: Karthik (+91 98401 23456)",
                "notes": "College ID and registration confirmation pass mandatory to board the shuttle."
            },
            "whatsapp_group_link": "https://chat.whatsapp.com/EveHubDemoShaastra2026",
            "agenda": [
                {"time": "09:00 AM", "activity": "Inauguration & Problem Statement Briefing"},
                {"time": "10:30 AM", "activity": "Hacking Commences & Mentor Check-in 1"},
                {"time": "02:00 PM", "activity": "Hardware Testbench Access"},
                {"time": "06:30 PM", "activity": "Final Code Freeze & Jury Demos"},
                {"time": "08:00 PM", "activity": "Awards & Certificate Presentation"}
            ]
        },
        {
            "id": "evt-kurukshetra-ceg",
            "organizer_id": "usr-organizer-1",
            "organizer_name": "Dr. Arun Kumar (Convener)",
            "college_id": "clg-ceg",
            "college_name": "College of Engineering, Guindy (Anna University)",
            "title": "Kurukshetra '26: International Techno-Management Fest",
            "description": "UNESCO-patronized technical symposium bringing together 3000+ innovators across cyber security, blockchain architectures, algorithmic trading, and robotics challenges.",
            "category": "Technical",
            "poster_url": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
            "start_date": f"{d2}T09:30:00",
            "end_date": f"{d2}T17:30:00",
            "registration_deadline": f"{d2}T08:00:00",
            "venue": "Vivekananda Auditorium & Turing Hall, CEG Campus",
            "latitude": 13.0109,
            "longitude": 80.2354,
            "format": "offline",
            "fee": 250,
            "eligibility": "Open to all verified college undergraduates and postgraduates",
            "capacity": 300,
            "registered_count": 210,
            "status": "open",
            "canonical_registration_link": None,
            "is_external": 0,
            "has_transport": 1,
            "transport_details": {
                "available": True,
                "pickup_points": ["Koyambedu CMBT", "Airport Metro Exit", "Central Station"],
                "departure_time": "08:00 AM",
                "return_time": "06:30 PM",
                "contact_person": "CEG Hospitality Desk (+91 94441 99999)",
                "notes": "EveHub verified ticket will be scanned at Guindy main gate."
            },
            "whatsapp_group_link": "https://chat.whatsapp.com/EveHubDemoKurukshetra26",
            "agenda": [
                {"time": "09:30 AM", "activity": "Keynote: Decentralized Compute in 2026"},
                {"time": "11:00 AM", "activity": "Track 1: Algorithmic CodeSprint"},
                {"time": "02:00 PM", "activity": "Track 2: Smart Contract Security Audit"},
                {"time": "04:30 PM", "activity": "Valedictory & Prize Distribution"}
            ]
        },
        {
            "id": "evt-psg-kriya-ev",
            "organizer_id": "usr-organizer-1",
            "organizer_name": "PSG Tech Student Council",
            "college_id": "clg-psg",
            "college_name": "PSG College of Technology",
            "title": "Kriya 2026: Battery Management & EV Powertrain Workshop",
            "description": "Hands-on industrial masterclass on Lithium-Iron Phosphate (LFP) thermal runaway prevention, CAN bus communication, and BMS firmware development with hardware simulator rigs.",
            "category": "Workshop",
            "poster_url": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80",
            "start_date": f"{d3}T10:00:00",
            "end_date": f"{d3}T16:00:00",
            "registration_deadline": f"{d3}T07:00:00",
            "venue": "Automotive Research Centre, PSG Tech Peelamedu, Coimbatore",
            "latitude": 11.0245,
            "longitude": 76.9946,
            "format": "offline",
            "fee": 350,
            "eligibility": "Mechanical, Electrical, Electronics, and Automobile Engineering students",
            "capacity": 60,
            "registered_count": 58,
            "status": "closing_soon",
            "canonical_registration_link": None,
            "is_external": 0,
            "has_transport": 0,
            "transport_details": None,
            "whatsapp_group_link": "https://chat.whatsapp.com/EveHubDemoPSGKriyaEV",
            "agenda": [
                {"time": "10:00 AM", "activity": "Principles of Lithium Cell Chemistry & Aging"},
                {"time": "11:30 AM", "activity": "Lab Session: BMS State of Charge (SoC) Algorithms"},
                {"time": "02:00 PM", "activity": "CAN-Bus Packet Sniffing & Fault Diagnosis"},
                {"time": "03:45 PM", "activity": "Certification Evaluation Quiz"}
            ]
        },
        {
            "id": "evt-ssn-cloud-devops",
            "organizer_id": "usr-organizer-1",
            "organizer_name": "SSN IEEE Student Branch",
            "college_id": "clg-ssn",
            "college_name": "SSN College of Engineering",
            "title": "Invente '26: Production Kubernetes & Cloud-Native Security",
            "description": "Comprehensive workshop on container orchestration, GitOps with ArgoCD, and zero-trust cloud infrastructure. Certified participation with verified credentials.",
            "category": "Workshop",
            "poster_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
            "start_date": f"{d4}T10:00:00",
            "end_date": f"{d4}T15:30:00",
            "registration_deadline": f"{d4}T09:00:00",
            "venue": "SSN Central Computing Facility (Lab 3) & Online Stream",
            "latitude": 12.7508,
            "longitude": 80.1970,
            "format": "hybrid",
            "fee": 150,
            "eligibility": "Students with basic Linux and Docker familiarity",
            "capacity": 100,
            "registered_count": 45,
            "status": "open",
            "canonical_registration_link": None,
            "is_external": 0,
            "has_transport": 1,
            "transport_details": {
                "available": True,
                "pickup_points": ["Thiruvanmiyur Bus Depot", "Sholinganallur Junction", "Kelambakkam"],
                "departure_time": "08:15 AM",
                "return_time": "04:30 PM",
                "contact_person": "SSN Bus Coordinator (+91 94444 88888)",
                "notes": "Route 24 SSN Express bus available."
            },
            "whatsapp_group_link": "https://chat.whatsapp.com/EveHubDemoSSNInvente",
            "agenda": [
                {"time": "10:00 AM", "activity": "K8s Architecture & Pod Scheduling Deep Dive"},
                {"time": "12:00 PM", "activity": "Hands-on Cluster Deployment"},
                {"time": "02:00 PM", "activity": "Vulnerability Scanning & Network Policies"}
            ]
        },
        {
            "id": "evt-nitt-fest-cultural",
            "organizer_id": "usr-organizer-1",
            "organizer_name": "Festember Student Committee",
            "college_id": "clg-nitt",
            "college_name": "National Institute of Technology Tiruchirappalli (NIT Trichy)",
            "title": "Festember '26: South India's Largest Collegiate Cultural Fest",
            "description": "Annual inter-collegiate festival hosting battle of the bands, classical solo competitions, theatrical performances, and celebrity pro-shows. Free entry for all verified collegiate participants.",
            "category": "Cultural",
            "poster_url": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
            "start_date": f"{d5}T16:00:00",
            "end_date": f"{d5}T22:30:00",
            "registration_deadline": f"{d5}T12:00:00",
            "venue": "NITT Golden Rock Amphitheatre, Tiruchirappalli",
            "latitude": 10.7607,
            "longitude": 78.8143,
            "format": "offline",
            "fee": 0,
            "eligibility": "All college students with valid student identity card",
            "capacity": 500,
            "registered_count": 340,
            "status": "open",
            "canonical_registration_link": None,
            "is_external": 0,
            "has_transport": 0,
            "transport_details": None,
            "whatsapp_group_link": "https://chat.whatsapp.com/EveHubDemoNITTFest",
            "agenda": [
                {"time": "04:00 PM", "activity": "Stage 1: Eastern Acoustic Ensemble"},
                {"time": "06:30 PM", "activity": "Stage 2: Western Group Dance Finalists"},
                {"time": "08:30 PM", "activity": "Headliner Concert: Progressive Fusion Night"}
            ]
        },
        {
            "id": "evt-vit-sports-olympiad",
            "organizer_id": "usr-organizer-1",
            "organizer_name": "VIT Directorate of Physical Education",
            "college_id": "clg-vit",
            "college_name": "Vellore Institute of Technology (VIT)",
            "title": "Riviera '26: All-India Collegiate Basketball & Badminton Trophy",
            "description": "National level collegiate sporting championship with certified referees, official scorekeepers, and Olympic-grade synthetic indoor courts.",
            "category": "Sports",
            "poster_url": "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80",
            "start_date": f"{d2}T08:00:00",
            "end_date": f"{d2}T18:00:00",
            "registration_deadline": f"{d2}T05:00:00",
            "venue": "VIT Indoor Sports Complex, Vellore Campus",
            "latitude": 12.9692,
            "longitude": 79.1559,
            "format": "offline",
            "fee": 100,
            "eligibility": "University & College sports teams",
            "capacity": 120,
            "registered_count": 120,
            "status": "waitlist", # Full capacity to showcase FIFO waitlist!
            "canonical_registration_link": None,
            "is_external": 0,
            "has_transport": 0,
            "transport_details": None,
            "whatsapp_group_link": "https://chat.whatsapp.com/EveHubDemoVITSports",
            "agenda": [
                {"time": "08:00 AM", "activity": "Captains Briefing & Draw Reveal"},
                {"time": "09:00 AM", "activity": "Preliminary Knockout Rounds"},
                {"time": "03:00 PM", "activity": "Semi-Finals & Championship Match"}
            ]
        }
    ]

def get_demo_timetable():
    d1 = (NOW + timedelta(days=3)).strftime("%Y-%m-%d")
    d3 = (NOW + timedelta(days=8)).strftime("%Y-%m-%d")
    return [
        {
            "id": "tt-1",
            "student_id": "usr-student-1",
            "title": "Continuous Assessment Exam: Database Management Systems",
            "type": "exam",
            "date": d1, # Intentionally matches Shaastra Hackathon day!
            "start_time": "10:00",
            "end_time": "12:00",
            "notes": "Hall 402, Dept of IT. Strict attendance mandatory."
        },
        {
            "id": "tt-2",
            "student_id": "usr-student-1",
            "title": "Advanced Operating Systems Lab",
            "type": "lab",
            "date": d1,
            "start_time": "14:00",
            "end_time": "16:00",
            "notes": "Linux kernel module compilation assessment."
        },
        {
            "id": "tt-3",
            "student_id": "usr-student-1",
            "title": "Machine Learning Lecture",
            "type": "class",
            "date": d3,
            "start_time": "08:30",
            "end_time": "09:30",
            "notes": "Transformer attention mechanism lecture."
        }
    ]

def get_demo_registrations():
    return [
        {
            "id": "reg-1",
            "event_id": "evt-kurukshetra-ceg",
            "student_id": "usr-student-1",
            "student_name": "Gokul Kannan",
            "student_email": "student@evehub.in",
            "student_college": "SSN College of Engineering",
            "student_department": "Information Technology",
            "student_year": "3rd Year",
            "registration_status": "confirmed",
            "attendance_status": "registered",
            "attended_at": None,
            "qr_checkin_token": "EVH-CHK-KURUKS-9081",
            "payment_status": "paid",
            "payment_amount": 250,
            "created_at": (NOW - timedelta(days=1)).isoformat()
        }
    ]

def get_demo_certificates():
    return [
        {
            "id": "cert-1",
            "certificate_id": "EVH-2026-IIT099",
            "event_id": "evt-shaastra-ai",
            "event_title": "Shaastra 2026: AI & Edge Robotics Hackathon",
            "organizer_name": "Shaastra IIT Madras",
            "college_name": "Indian Institute of Technology Madras (IIT Madras)",
            "student_id": "usr-student-1",
            "student_name": "Gokul Kannan",
            "issue_date": (NOW - timedelta(days=10)).strftime("%Y-%m-%d"),
            "certificate_type": "Excellence",
            "signatory_title": "Dean of Academic Research & Convener",
            "signatory_name": "Dr. V. Kamakoti",
            "verification_token": "VERIFY-SHAAS-AI-99X",
            "status": "valid",
            "created_at": (NOW - timedelta(days=10)).isoformat()
        }
    ]

def get_demo_questions():
    return [
        {
            "id": "q-1",
            "event_id": "evt-shaastra-ai",
            "student_id": "usr-student-1",
            "student_name": "Gokul Kannan",
            "student_email": "student@evehub.in",
            "question": "Will NVIDIA Jetson development boards or Raspberry Pi 5 kits be provided at the venue, or should teams bring their own hardware?",
            "status": "answered",
            "urgency": "normal",
            "answer": "Yes, each shortlisted team will be provided one NVIDIA Jetson Orin Nano Developer Kit and basic sensor peripherals at the venue. You are also welcome to bring your own sensors and laptops.",
            "answered_by": "Shaastra Technical Committee",
            "answered_at": (NOW - timedelta(hours=5)).isoformat(),
            "is_public_faq": 1,
            "call_requested": 0,
            "call_slot": None,
            "created_at": (NOW - timedelta(hours=8)).isoformat()
        },
        {
            "id": "q-2",
            "event_id": "evt-kurukshetra-ceg",
            "student_id": "usr-student-1",
            "student_name": "Gokul Kannan",
            "student_email": "student@evehub.in",
            "question": "Is overnight accommodation available for students arriving from other districts like Coimbatore and Madurai?",
            "status": "pending",
            "urgency": "normal",
            "answer": None,
            "answered_by": None,
            "answered_at": None,
            "is_public_faq": 0,
            "call_requested": 1,
            "call_slot": "Tomorrow 4:00 PM - 4:30 PM",
            "created_at": (NOW - timedelta(hours=2)).isoformat()
        }
    ]
