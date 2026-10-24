import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, MessageCircle, AlertCircle, ArrowRight, ShieldCheck, Ticket } from 'lucide-react';
import { Event, ConflictDetectionResult } from '../../api/types';
import { Modal } from '../common/Modal';
import { ConflictAlert } from './ConflictAlert';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onSuccess: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  event,
  onSuccess,
}) => {
  const { user } = useAuth();
  const toast = useToast();

  const [checkingConflict, setCheckingConflict] = useState(true);
  const [conflictResult, setConflictResult] = useState<ConflictDetectionResult | null>(null);
  const [acknowledgedConflict, setAcknowledgedConflict] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Success state
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [checkinToken, setCheckinToken] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [whatsappLink, setWhatsappLink] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen && event) {
      setCheckingConflict(true);
      setRegisteredSuccess(false);
      setAcknowledgedConflict(false);
      setAgreeTerms(false);

      api.checkConflict(event.id)
        .then((res) => {
          setConflictResult(res);
        })
        .catch(() => {
          setConflictResult({
            status: 'unknown',
            message: 'Unable to query timetable. Proceeding with registration.',
            conflicting_entries: [],
            overlapping_intervals: [],
          });
        })
        .finally(() => {
          setCheckingConflict(false);
        });
    }
  }, [isOpen, event]);

  const handleRegister = async () => {
    if (conflictResult?.status === 'conflict' && !acknowledgedConflict) {
      toast.error('Please acknowledge the timetable schedule conflict to proceed.');
      return;
    }
    if (!agreeTerms) {
      toast.error('Please accept the event participation terms.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.registerForEvent(event.id);
      setCheckinToken(res.checkin_token);
      setWhatsappLink(res.whatsapp_group_link || event.whatsapp_group_link);

      // Generate QR Code data URL
      const qrUrl = await QRCode.toDataURL(res.checkin_token, {
        width: 240,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setQrDataUrl(qrUrl);
      setRegisteredSuccess(true);
      toast.success('Registration Confirmed! Your check-in pass is ready.');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const hasConflict = conflictResult?.status === 'conflict';
  const canSubmit = agreeTerms && (!hasConflict || acknowledgedConflict);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={registeredSuccess ? 'Registration Confirmed!' : `Register for ${event.title}`}
      subtitle={
        registeredSuccess
          ? 'Present this verified QR pass to the organizers upon arrival.'
          : `${event.college_name} • ${event.venue}`
      }
      maxWidth="lg"
    >
      {registeredSuccess ? (
        /* ==================== Success / Pass View ==================== */
        <div className="text-center py-2 space-y-5">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-900 font-heading">
              You are officially registered!
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Your attendance will be verified by the organizers using this tamper-evident token to unlock your certificate.
            </p>
          </div>

          {/* QR Code Pass Box */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="EveHub Check-in QR"
                className="w-48 h-48 mx-auto rounded-lg bg-white p-2 shadow-xs"
              />
            )}
            <div className="mt-3">
              <span className="text-[11px] text-slate-400 font-mono tracking-wider uppercase block">
                Check-in Token
              </span>
              <span className="text-sm font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-200">
                {checkinToken}
              </span>
            </div>
          </div>

          {/* WhatsApp Group Link Post-Registration */}
          {whatsappLink && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-left flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-emerald-950 block">
                    Official Event WhatsApp Community
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    Connect with fellow participants & receive live announcements.
                  </span>
                </div>
              </div>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-colors"
              >
                Join Group
              </a>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2.5 rounded-xl transition-colors"
            >
              Close Pass
            </button>
            <a
              href="/student/registrations"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View in My Registrations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : (
        /* ==================== Registration Form View ==================== */
        <div className="space-y-4 text-xs">
          {/* Student Profile Snapshot */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Participant Name</span>
              <span className="font-semibold text-slate-900 text-xs">{user?.display_name}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-medium">Enrolled College</span>
              <span className="font-semibold text-slate-900 text-xs truncate max-w-[180px] block">
                {user?.college_name || 'Verified Institution'}
              </span>
            </div>
          </div>

          {/* Timetable Conflict Engine Check */}
          {checkingConflict ? (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3 animate-pulse">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              <span className="text-slate-600 font-medium">
                Analyzing timetable for schedule conflicts...
              </span>
            </div>
          ) : conflictResult ? (
            <ConflictAlert
              result={conflictResult}
              acknowledged={acknowledgedConflict}
              onAcknowledge={() => setAcknowledgedConflict(!acknowledgedConflict)}
            />
          ) : null}

          {/* Event fee & seats info */}
          <div className="flex justify-between items-center py-2 border-y border-slate-100 text-xs">
            <span className="text-slate-600 font-medium">Registration Fee:</span>
            <span className="font-bold text-slate-900 text-sm">
              {event.fee === 0 ? 'Free of Charge' : `₹${event.fee} (Demo Sim)`}
            </span>
          </div>

          {/* Important Terms & Transparent Seat Policies */}
          <div className="space-y-2 pt-1 text-slate-600 text-[11px] leading-relaxed">
            <p className="flex items-start gap-1.5 text-slate-700">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Attendance Verified Issuance:</strong> Digital certificates of participation or excellence are issued strictly upon verified venue check-in by event organizers.
              </span>
            </p>
            <p className="flex items-start gap-1.5 text-slate-500">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>Cancellation Policy:</strong> Cancellations must be requested at least 24 hours prior to release seats to waitlisted students.
              </span>
            </p>
          </div>

          {/* Terms checkbox */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              type="checkbox"
              id="agree-terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="agree-terms" className="text-xs text-slate-800 font-medium cursor-pointer">
              I confirm my attendance and agree to the institutional participation rules.
            </label>
          </div>

          {/* Form Actions */}
          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={handleRegister}
              className={`flex-1 font-semibold py-2.5 rounded-xl text-white transition-all flex items-center justify-center gap-2 ${
                canSubmit && !submitting
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-xs'
                  : 'bg-slate-300 cursor-not-allowed text-slate-500'
              }`}
            >
              {submitting ? 'Confirming Registration...' : 'Complete Registration'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
