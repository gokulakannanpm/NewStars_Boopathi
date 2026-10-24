import {
  UserProfile, College, Event, EventRegistration, TimetableEntry,
  ConflictDetectionResult, StudentQuestion, Certificate, NotificationItem, OrganizerMetrics,
  TransportAskAIResult, TeamCheckinResolution, TeamCheckinResponse, BulkCertificateIssueResult, EventCertificateCollection
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('evehub_token') || 'usr-student-1';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      errorMsg = errData.detail || errData.message || errorMsg;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    return request<{ user: UserProfile; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(data: any) {
    return request<{ user: UserProfile; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMe() {
    return request<UserProfile>('/api/auth/me');
  },

  async updateProfile(data: Partial<UserProfile>) {
    return request<UserProfile>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Colleges
  async getColleges(params?: { search?: string; district?: string }) {
    const sp = new URLSearchParams();
    if (params?.search) sp.append('search', params.search);
    if (params?.district) sp.append('district', params.district);
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return request<College[]>(`/api/colleges${query}`);
  },

  // Events
  async getEvents(params?: {
    search?: string;
    category?: string;
    format?: string;
    fee_type?: string;
    college_id?: string;
    district?: string;
    status_filter?: string;
    lat?: number;
    lng?: number;
    radius_km?: number;
    sort?: string;
    limit?: number;
    offset?: number;
  }) {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          sp.append(k, String(v));
        }
      });
    }
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return request<{ total: number; items: Event[]; offset: number; limit: number }>(`/api/events${query}`);
  },

  async getEvent(id: string) {
    return request<{
      event: Event;
      user_registered: boolean;
      registration?: EventRegistration;
      is_saved: boolean;
    }>(`/api/events/${id}`);
  },

  async createEvent(data: any) {
    return request<Event>('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateEvent(id: string, data: any) {
    return request<Event>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async cancelEvent(id: string) {
    return request<{ message: string }>(`/api/events/${id}`, {
      method: 'DELETE',
    });
  },

  // Registration & Waitlist
  async registerForEvent(eventId: string, options?: { notes?: string; is_team?: boolean; team_name?: string }) {
    return request<{
      success: boolean;
      registration_id: string;
      checkin_token: string;
      is_team?: boolean;
      team_name?: string;
      team_qr_token?: string;
      whatsapp_group_link?: string;
      message: string;
    }>(`/api/events/${eventId}/register`, {
      method: 'POST',
      body: JSON.stringify({ confirm_terms: true, ...options }),
    });
  },

  async joinWaitlist(eventId: string) {
    return request<{ success: boolean; queue_position: number; message: string }>(
      `/api/events/${eventId}/waitlist`,
      { method: 'POST' }
    );
  },

  async getMyRegistrations() {
    return request<EventRegistration[]>('/api/registrations/my');
  },

  async cancelRegistration(registrationId: string) {
    return request<{ message: string }>(`/api/registrations/cancel/${registrationId}`, {
      method: 'POST',
    });
  },

  // Saved Events
  async getSavedEvents() {
    return request<Event[]>('/api/saved-events');
  },

  async saveEvent(eventId: string) {
    return request<{ saved: boolean }>(`/api/saved-events/${eventId}`, {
      method: 'POST',
    });
  },

  async unsaveEvent(eventId: string) {
    return request<{ saved: boolean }>(`/api/saved-events/${eventId}`, {
      method: 'DELETE',
    });
  },

  // Timetable & Conflict
  async getTimetable() {
    return request<TimetableEntry[]>('/api/timetable');
  },

  async addTimetableEntry(data: {
    title: string;
    type: string;
    date: string;
    start_time: string;
    end_time: string;
    notes?: string;
  }) {
    return request<TimetableEntry>('/api/timetable', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteTimetableEntry(id: string) {
    return request<{ message: string }>(`/api/timetable/${id}`, {
      method: 'DELETE',
    });
  },

  async importTimetableCsv(csvText: string) {
    const sp = new URLSearchParams({ csv_content: csvText });
    return request<{
      success: boolean;
      imported_count: number;
      imported_entries: any[];
      errors: string[];
    }>(`/api/timetable/csv-import?${sp.toString()}`, {
      method: 'POST',
    });
  },

  async checkConflict(eventId: string) {
    return request<ConflictDetectionResult>(`/api/timetable/check-conflict/${eventId}`);
  },

  // Questions
  async getQuestions(eventId: string) {
    return request<StudentQuestion[]>(`/api/questions/${eventId}`);
  },

  async submitQuestion(data: {
    event_id: string;
    question: string;
    urgency?: string;
    call_requested?: boolean;
    call_slot?: string;
  }) {
    return request<StudentQuestion>('/api/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async answerQuestion(id: string, data: { answer: string; status?: string; is_public_faq?: boolean }) {
    return request<StudentQuestion>(`/api/questions/${id}/answer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Attendance
  async getEventRegistrants(eventId: string) {
    return request<EventRegistration[]>(`/api/organizer/events/${eventId}/registrants`);
  },

  async checkinAttendee(tokenOrId: string, manual = false, status = 'attended') {
    return request<{
      success: boolean;
      is_team?: boolean;
      already_checked_in?: boolean;
      student_name?: string;
      registration_id?: string;
      attended_at?: string;
      team_id?: string;
      team_name?: string;
      event_id?: string;
      members?: any[];
      total_members?: number;
      eligible_count?: number;
      message: string;
    }>('/api/attendance/checkin', {
      method: 'POST',
      body: JSON.stringify({ token_or_registration_id: tokenOrId, manual, status }),
    });
  },

  async teamCheckin(eventId: string, registrationIds: string[]) {
    return request<TeamCheckinResponse>('/api/attendance/team-checkin', {
      method: 'POST',
      body: JSON.stringify({ event_id: eventId, registration_ids: registrationIds }),
    });
  },

  async completeEvent(eventId: string) {
    return request<{ success: boolean; message: string; event: Event }>(`/api/events/${eventId}/complete`, {
      method: 'POST',
    });
  },

  // Uploads & AI Assistants
  async uploadPoster(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('evehub_token') || 'usr-student-1';
    const res = await fetch(`${API_BASE}/api/upload/poster`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Poster upload failed');
    }
    return res.json() as Promise<{ success: boolean; url: string; filename: string; size: number }>;
  },

  async uploadTransportPdf(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('evehub_token') || 'usr-student-1';
    const res = await fetch(`${API_BASE}/api/upload/transport-pdf`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Transport PDF upload failed');
    }
    return res.json() as Promise<{ success: boolean; url: string; filename: string; size: number }>;
  },

  async askAiTransport(eventId: string, query: string) {
    return request<TransportAskAIResult>('/api/transport/ask-ai', {
      method: 'POST',
      body: JSON.stringify({ event_id: eventId, query }),
    });
  },

  // Certificates
  async getMyCertificates() {
    return request<Certificate[]>('/api/certificates/my');
  },

  async issueCertificate(data: {
    event_id: string;
    student_id: string;
    certificate_type?: string;
    signatory_name?: string;
    signatory_title?: string;
  }) {
    return request<Certificate>('/api/certificates/issue', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async bulkIssueCertificates(data: {
    event_id: string;
    certificate_type?: string;
    signatory_name?: string;
    signatory_title?: string;
    template_id?: string;
  }) {
    return request<BulkCertificateIssueResult>('/api/certificates/bulk-issue', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCertificateCollection(eventId: string) {
    return request<EventCertificateCollection>(`/api/certificates/collection/${eventId}`);
  },

  async verifyCertificate(certId: string) {
    return request<{
      valid: boolean;
      message?: string;
      certificate_id?: string;
      student_name?: string;
      event_title?: string;
      organizer_name?: string;
      college_name?: string;
      issue_date?: string;
      certificate_type?: string;
      signatory_name?: string;
      signatory_title?: string;
      status?: string;
    }>(`/api/certificates/verify/${certId}`);
  },

  // Notifications
  async getNotifications() {
    return request<NotificationItem[]>('/api/notifications');
  },

  async markNotificationRead(id: string) {
    return request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'POST',
    });
  },

  // Organizer Metrics
  async getOrganizerMetrics() {
    return request<OrganizerMetrics>('/api/organizer/metrics');
  },
};

