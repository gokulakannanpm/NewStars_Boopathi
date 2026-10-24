import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ShieldCheck,
  Bookmark,
  Share2,
  Bus,
  MessageCircle,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Phone
} from 'lucide-react';
import { api } from '../../api/client';
import { Event, ConflictDetectionResult, StudentQuestion } from '../../api/types';
import { CategoryBadge } from '../../components/common/CategoryBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConflictAlert } from '../../components/event/ConflictAlert';
import { TransportInfoCard } from '../../components/event/TransportInfoCard';
import { RegistrationModal } from '../../components/event/RegistrationModal';
import { WaitlistModal } from '../../components/event/WaitlistModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [userRegistered, setUserRegistered] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);

  // Conflict Engine
  const [conflictResult, setConflictResult] = useState<ConflictDetectionResult | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);

  // Q&A
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [requestCall, setRequestCall] = useState(false);
  const [callSlot, setCallSlot] = useState('');
  const [submittingQ, setSubmittingQ] = useState(false);

  const fetchEventData = async () => {
    if (!id) return;
    try {
      const res = await api.getEvent(id);
      setEvent(res.event);
      setUserRegistered(res.user_registered);
      setIsSaved(res.is_saved);

      // Check conflict if logged in
      setCheckingConflict(true);
      api.checkConflict(id)
        .then(setConflictResult)
        .catch(() => {})
        .finally(() => setCheckingConflict(false));

      // Fetch Questions
      api.getQuestions(id).then(setQuestions).catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id, user]);

  const handleBookmarkToggle = async () => {
    if (!event) return;
    try {
      if (isSaved) {
        await api.unsaveEvent(event.id);
        setIsSaved(false);
        toast.info('Event removed from saved list');
      } else {
        await api.saveEvent(event.id);
        setIsSaved(true);
        toast.success('Event bookmarked!');
      }
    } catch {
      toast.error('Could not update saved status');
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !newQuestionText.trim()) return;
    setSubmittingQ(true);
    try {
      const q = await api.submitQuestion({
        event_id: event.id,
        question: newQuestionText.trim(),
        call_requested: requestCall,
        call_slot: requestCall ? callSlot || 'Requested slot callback' : undefined,
      });
      setQuestions((prev) => [q, ...prev]);
      setNewQuestionText('');
      setRequestCall(false);
      setCallSlot('');
      toast.success('Question submitted to event organizers!');
    } catch (err: any) {
      toast.error(err.message || 'Could not submit question');
    } finally {
      setSubmittingQ(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading event details...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 font-heading">Event Not Found</h2>
        <p className="text-xs text-slate-500">The requested event listing does not exist or has been removed.</p>
        <Link to="/events" className="inline-block bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl">
          Browse All Events
        </Link>
      </div>
    );
  }

  const isFull = event.registered_count >= event.capacity;
  const seatsLeft = Math.max(0, event.capacity - event.registered_count);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-slate-900">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/events" className="hover:text-slate-900">Events</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 font-medium truncate max-w-xs">{event.title}</span>
      </nav>

      {/* Hero Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left: Poster */}
        <div className="lg:col-span-5 relative bg-slate-950 min-h-[300px] lg:min-h-full">
          <img
            src={event.poster_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'}
            alt={event.title}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          <div className="absolute top-4 left-4 flex gap-2">
            <CategoryBadge category={event.category} />
          </div>
        </div>

        {/* Right: Event Header Details */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1.5 font-heading">
                <span>{event.college_name}</span>
              </span>
              <StatusBadge status={event.status} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading leading-tight">
              {event.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {event.description}
            </p>

            {/* Quick logistics bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Date & Schedule</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(event.start_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {new Date(event.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Campus Venue</span>
                  <span className="font-semibold text-slate-900 block">{event.venue}</span>
                  {event.latitude && event.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 text-[11px] inline-flex items-center gap-1 font-medium mt-0.5"
                    >
                      <span>Get Google Maps Directions</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Primary Action Row */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Participation Fee</span>
              <span className="text-xl font-bold text-slate-900 font-heading">
                {event.fee === 0 ? 'Free Entry' : `₹${event.fee}`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleBookmarkToggle}
                className={`p-2.5 rounded-xl border transition-colors ${
                  isSaved
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title={isSaved ? 'Remove from Saved' : 'Save Event'}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>

              {userRegistered ? (
                <button
                  onClick={() => setRegModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>View Verified Pass</span>
                </button>
              ) : isFull ? (
                <button
                  onClick={() => setWaitlistModalOpen(true)}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span>Join Priority Waitlist</span>
                </button>
              ) : event.is_external && event.canonical_registration_link ? (
                <a
                  href={event.canonical_registration_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
                >
                  <span>Register on Host Site</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <button
                  onClick={() => setRegModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
                >
                  <span>Register for Event</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>

            {event.is_external && (
              <div className="w-full mt-2 p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between gap-3">
                <span className="font-medium">
                  Institutional External Event: Official registration is managed on the host institution's portal.
                </span>
                {event.canonical_registration_link && (
                  <a
                    href={event.canonical_registration_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-amber-950 underline shrink-0 inline-flex items-center gap-1"
                  >
                    Host Portal <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid: Details, Agenda, Transport, Timetable Conflict */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Agenda, Description, Q&A */}
        <div className="lg:col-span-8 space-y-8">
          {/* Timetable Conflict Guard Banner */}
          {checkingConflict ? (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2 text-xs text-slate-500 animate-pulse">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Checking your student timetable for interval overlaps...</span>
            </div>
          ) : conflictResult ? (
            <ConflictAlert result={conflictResult} />
          ) : null}

          {/* Detailed Agenda Timeline */}
          {event.agenda && event.agenda.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Event Schedule & Agenda</span>
              </h3>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {event.agenda.map((item, idx) => (
                  <div key={idx} className="relative group">
                    <span className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white ring-2 ring-indigo-100" />
                    <span className="text-xs font-bold text-indigo-700 font-mono block">
                      {item.time}
                    </span>
                    <span className="text-xs text-slate-800 font-medium block mt-0.5">
                      {item.activity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participation Terms & Eligibility */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Eligibility & Guidelines
            </h3>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>Eligibility:</strong> {event.eligibility}
              </p>
              <p>
                <strong>Check-in Requirement:</strong> Attendees must present their EveHub digital QR token at the registration desk. Physical or digital certificates will be unlocked only upon verified scan.
              </p>
              <p>
                <strong>Cancellation Window:</strong> If you cannot attend, release your seat at least 24 hours prior so waitlisted peers can attend.
              </p>
            </div>
          </div>

          {/* Student Q&A and Organizer Support */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>Student Q&A Desk</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct questions to event conveners and read verified replies
                </p>
              </div>
            </div>

            {/* Question Submission Form */}
            <form onSubmit={handleAskQuestion} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-semibold text-slate-800 block">
                Have a question about rules, equipment, or logistics?
              </label>
              <textarea
                rows={2}
                required
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="Type your question here (e.g. Will hardware kits or GPU access be provided on site?)..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white outline-hidden focus:border-indigo-500 text-slate-900"
              />

              {/* Call request option */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="req-call"
                    checked={requestCall}
                    onChange={(e) => setRequestCall(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <label htmlFor="req-call" className="text-[11px] text-slate-700 cursor-pointer flex items-center gap-1">
                    <Phone className="w-3 h-3 text-indigo-600" />
                    <span>Request direct phone callback for urgent clarification</span>
                  </label>
                </div>

                {requestCall && (
                  <input
                    type="text"
                    placeholder="Preferred time (e.g. 4 PM - 5 PM)"
                    value={callSlot}
                    onChange={(e) => setCallSlot(e.target.value)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 bg-white outline-hidden"
                  />
                )}

                <button
                  type="submit"
                  disabled={submittingQ}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shrink-0 shadow-2xs"
                >
                  {submittingQ ? 'Submitting...' : 'Post Question'}
                </button>
              </div>
            </form>

            {/* List of existing questions and answers */}
            <div className="space-y-3 pt-2">
              {questions.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No questions posted yet. Be the first to ask!</p>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-900">{q.question}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        q.status === 'answered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {q.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Asked by {q.student_name}</span>
                      {q.call_requested && (
                        <span className="text-indigo-600 font-medium flex items-center gap-1">
                          • <Phone className="w-3 h-3" /> Call Requested ({q.call_slot || 'Callback'})
                        </span>
                      )}
                    </div>

                    {q.answer && (
                      <div className="mt-2 pt-2 border-t border-slate-100 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/60">
                        <div className="font-semibold text-xs text-indigo-950 flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Organizer Response ({q.answered_by})</span>
                        </div>
                        <p className="text-xs text-indigo-900 leading-relaxed">{q.answer}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Transport, Organizer, WhatsApp */}
        <div className="lg:col-span-4 space-y-6">
          {/* Official WhatsApp Community Widget */}
          {userRegistered && event.whatsapp_group_link && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-900">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider font-heading">
                  Attendee WhatsApp Group
                </h4>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Connect with organizers and teammates for day-of-event logistics.
              </p>
              <a
                href={event.whatsapp_group_link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <span>Join Official WhatsApp Group</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* College Transport Card */}
          <TransportInfoCard transport={event.transport_details} />

          {/* Capacity Snapshot Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs text-xs">
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-heading flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Registration Capacity</span>
            </h4>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Confirmed Attendees:</span>
              <span className="font-bold text-slate-900">
                {event.registered_count} / {event.capacity}
              </span>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round((event.registered_count / event.capacity) * 100))}%` }}
              />
            </div>

            <div className="text-[11px] text-slate-500 pt-1">
              Registration deadline: <strong>{new Date(event.registration_deadline).toLocaleDateString()}</strong>
            </div>
          </div>

          {/* Host University Authority */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs text-xs">
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-heading flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Host Institution</span>
            </h4>
            <div className="font-semibold text-slate-900">{event.college_name}</div>
            <div className="text-slate-500">Organized by {event.organizer_name}</div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Institutional Digital Signature Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Registration & Waitlist Modals */}
      <RegistrationModal
        isOpen={regModalOpen}
        onClose={() => setRegModalOpen(false)}
        event={event}
        onSuccess={() => {
          fetchEventData();
        }}
      />

      <WaitlistModal
        isOpen={waitlistModalOpen}
        onClose={() => setWaitlistModalOpen(false)}
        event={event}
        onSuccess={() => {
          fetchEventData();
        }}
      />
    </div>
  );
};
