export type RoleType = 'student' | 'organizer' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: RoleType;
  college_id?: string;
  college_name?: string;
  department?: string;
  year?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface College {
  id: string;
  name: string;
  short_name?: string;
  district: string;
  state: string;
  latitude?: number;
  longitude?: number;
  verified: boolean;
  address?: string;
  logo_url?: string;
  website?: string;
}

export type EventCategory =
  | 'Technical'
  | 'Hackathon'
  | 'Symposium'
  | 'Workshop'
  | 'Cultural'
  | 'Sports'
  | 'Management';

export type EventStatus =
  | 'draft'
  | 'open'
  | 'closing_soon'
  | 'waitlist'
  | 'closed'
  | 'cancelled';

export type EventFormat = 'offline' | 'online' | 'hybrid';

export interface TransportDetails {
  available: boolean;
  pickup_points: string[];
  departure_time?: string;
  return_time?: string;
  contact_person?: string;
  contact_phone?: string;
  notes?: string;
}

export interface EventAgendaItem {
  time: string;
  activity: string;
}

export interface Event {
  id: string;
  organizer_id: string;
  organizer_name: string;
  college_id: string;
  college_name: string;
  title: string;
  description: string;
  category: EventCategory;
  poster_url?: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  venue: string;
  latitude?: number;
  longitude?: number;
  format: EventFormat;
  fee: number;
  eligibility: string;
  capacity: number;
  registered_count: number;
  status: EventStatus;
  canonical_registration_link?: string;
  is_external: boolean;
  has_transport: boolean;
  transport_details?: TransportDetails;
  whatsapp_group_link?: string;
  agenda?: EventAgendaItem[];
  created_at?: string;
  updated_at?: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_college?: string;
  student_department?: string;
  student_year?: string;
  registration_status: 'confirmed' | 'waitlisted' | 'cancelled';
  attendance_status: 'registered' | 'attended' | 'absent' | 'excused';
  attended_at?: string;
  qr_checkin_token?: string;
  payment_status: string;
  payment_amount: number;
  created_at: string;
  event_title?: string;
  start_date?: string;
  end_date?: string;
  venue?: string;
  poster_url?: string;
  category?: EventCategory;
  organizer_name?: string;
  college_name?: string;
  whatsapp_group_link?: string;
  transport_details?: TransportDetails;
}

export interface TimetableEntry {
  id: string;
  student_id: string;
  title: string;
  type: 'class' | 'lab' | 'exam' | 'assignment' | 'other';
  date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  created_at?: string;
}

export interface ConflictDetectionResult {
  status: 'conflict' | 'no_conflict' | 'unknown';
  message: string;
  conflicting_entries: Array<{
    id: string;
    title: string;
    type: string;
    date: string;
    start_time: string;
    end_time: string;
    notes?: string;
    overlap_start: string;
    overlap_end: string;
    overlap_minutes: number;
  }>;
  overlapping_intervals: string[];
}

export interface StudentQuestion {
  id: string;
  event_id: string;
  student_id: string;
  student_name: string;
  student_email?: string;
  question: string;
  status: 'pending' | 'in_progress' | 'answered' | 'escalated';
  urgency: 'normal' | 'urgent' | 'safety';
  answer?: string;
  answered_by?: string;
  answered_at?: string;
  is_public_faq: boolean;
  call_requested: boolean;
  call_slot?: string;
  created_at: string;
}

export type CertificateType = 'Participation' | 'Excellence' | 'Winner' | 'Runner-up' | 'Organizer';

export interface Certificate {
  id: string;
  certificate_id: string;
  event_id: string;
  event_title: string;
  organizer_name: string;
  college_name: string;
  student_id: string;
  student_name: string;
  issue_date: string;
  certificate_type: CertificateType;
  signatory_title: string;
  signatory_name: string;
  verification_token: string;
  status: 'valid' | 'revoked' | 'reissued';
  reissued_to?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  type: string;
  event_id?: string;
  read: boolean;
  channel: string;
  created_at: string;
}

export interface OrganizerMetrics {
  total_events: number;
  total_registrations: number;
  total_attended: number;
  pending_questions: number;
  certificates_issued: number;
  events: Event[];
}
