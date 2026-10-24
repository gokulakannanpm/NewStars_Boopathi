import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  CalendarDays,
  QrCode,
  MapPin,
  Clock,
  Bus,
  MessageCircle,
  AlertCircle,
  X,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { api } from '../../api/client';
import { EventRegistration } from '../../api/types';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

export const MyRegistrationsPage: React.FC = () => {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'waitlisted' | 'cancelled'>('confirmed');
  const [loading, setLoading] = useState(true);

  // Selected Pass Modal
  const [selectedPass, setSelectedPass] = useState<EventRegistration | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');

  // Cancel Confirmation Modal
  const [cancelTarget, setCancelTarget] = useState<EventRegistration | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const toast = useToast();

  const loadRegistrations = async () => {
    try {
      const res = await api.getMyRegistrations();
      setRegistrations(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  const openPassModal = async (pass: EventRegistration) => {
    setSelectedPass(pass);
    if (pass.qr_checkin_token) {
      const url = await QRCode.toDataURL(pass.qr_checkin_token, {
        width: 240,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setQrUrl(url);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.cancelRegistration(cancelTarget.id);
      toast.success('Registration cancelled. Seat returned to student waitlist.');
      setCancelTarget(null);
      await loadRegistrations();
    } catch (err: any) {
      toast.error(err.message || 'Could not cancel registration');
    } finally {
      setCancelling(false);
    }
  };

  const filtered = registrations.filter((r) => {
    if (filter === 'all') return true;
    return r.registration_status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">
            My Registrations & Passes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your verified event access tokens, transport details, and attendance
          </p>
        </div>

        {/* Status Filters */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'confirmed' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Confirmed Passes
          </button>
          <button
            onClick={() => setFilter('waitlisted')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'waitlisted' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Waitlisted
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All History
          </button>
        </div>
      </div>

      {/* Registrations List */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-28 bg-white rounded-2xl border border-slate-200" />
          <div className="h-28 bg-white rounded-2xl border border-slate-200" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3">
          <CalendarDays className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 font-heading">
            No registrations found in this category
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not have any {filter} events at the moment. Browse the events directory to register.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((reg) => (
            <div
              key={reg.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-all p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              {/* Event & Institution Details */}
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-indigo-700 font-heading">
                    {reg.college_name}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    reg.registration_status === 'confirmed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : reg.registration_status === 'waitlisted'
                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {reg.registration_status}
                  </span>
                  {reg.attendance_status === 'attended' && (
                    <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      ✓ Attended & Verified
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 font-heading">
                  {reg.event_title}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                    <span>{reg.start_date ? new Date(reg.start_date).toLocaleDateString() : 'Upcoming'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{reg.venue}</span>
                  </div>
                  {reg.transport_details?.available && (
                    <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium text-[11px]">
                      <Bus className="w-3 h-3" />
                      <span>Shuttle Available</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Area */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                {reg.whatsapp_group_link && reg.registration_status === 'confirmed' && (
                  <a
                    href={reg.whatsapp_group_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                    title="Join WhatsApp Group"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}

                {reg.registration_status === 'confirmed' && (
                  <button
                    onClick={() => openPassModal(reg)}
                    className="flex-1 md:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Open QR Pass</span>
                  </button>
                )}

                {reg.registration_status === 'confirmed' && (
                  <button
                    onClick={() => setCancelTarget(reg)}
                    className="text-slate-400 hover:text-rose-600 text-xs font-medium px-2 py-2 transition-colors"
                    title="Cancel Registration"
                  >
                    Cancel Pass
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Pass Inspection Modal */}
      {selectedPass && (
        <Modal
          isOpen={!!selectedPass}
          onClose={() => setSelectedPass(null)}
          title="Verified Attendance Pass"
          subtitle={selectedPass.event_title}
          maxWidth="md"
        >
          <div className="text-center py-2 space-y-4">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 inline-block shadow-inner">
              {qrUrl && (
                <img
                  src={qrUrl}
                  alt="Check-in QR"
                  className="w-52 h-52 mx-auto rounded-xl bg-white p-2 shadow-xs"
                />
              )}
              <div className="mt-3">
                <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase block">
                  Organizer Check-in Token
                </span>
                <span className="text-base font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-200 block mt-1">
                  {selectedPass.qr_checkin_token}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-900">{selectedPass.student_name}</p>
              <p className="text-slate-500">{selectedPass.student_college} • {selectedPass.student_department}</p>
              <div className="pt-2 text-[11px] text-emerald-700 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Present this screen at the reception desk for instant check-in.</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPass(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </Modal>
      )}

      {/* Cancel Confirmation Dialog */}
      {cancelTarget && (
        <Modal
          isOpen={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          title="Confirm Registration Cancellation"
          subtitle={cancelTarget.event_title}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-rose-50 rounded-xl p-3 border border-rose-200 text-rose-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                Cancelling will permanently revoke your QR entry pass and immediately award this seat to the next student in the FIFO waitlist.
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCancelTarget(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors"
              >
                Keep Pass
              </button>
              <button
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {cancelling ? 'Releasing...' : 'Confirm Release'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
