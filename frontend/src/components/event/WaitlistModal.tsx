import React, { useState } from 'react';
import { Users, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Event } from '../../api/types';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onSuccess: () => void;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  isOpen,
  onClose,
  event,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [joinedPosition, setJoinedPosition] = useState<number | null>(null);
  const toast = useToast();

  const handleJoin = async () => {
    setSubmitting(true);
    try {
      const res = await api.joinWaitlist(event.id);
      setJoinedPosition(res.queue_position);
      toast.success(res.message);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Could not join waitlist');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={joinedPosition ? 'Added to Waitlist!' : `Join Waitlist: ${event.title}`}
      subtitle={`${event.college_name} • Capacity ${event.capacity} Filled`}
      maxWidth="md"
    >
      {joinedPosition ? (
        <div className="text-center py-2 space-y-4">
          <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-900 font-heading">
              You are Queue Position #{joinedPosition}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              If a registered attendee cancels, EveHub's automated seat recovery algorithm will offer the seat to you in strict First-In-First-Out (FIFO) sequence.
            </p>
          </div>

          <div className="bg-sky-50 rounded-xl p-3 text-xs text-sky-900 border border-sky-200 text-left">
            <span className="font-semibold block mb-0.5">Seat Offer Terms:</span>
            When offered a released seat, you will receive an in-app and email alert with a 24-hour acceptance window before it advances to the next student in line.
          </div>

          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
          >
            Understood
          </button>
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-200 text-amber-950 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-xs">Capacity Limit Reached</span>
              All {event.capacity} seats for this event have been claimed. You can enter the priority waitlist free of charge.
            </div>
          </div>

          <div className="space-y-2 text-slate-600 leading-relaxed text-[11px]">
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Deterministic FIFO Order:</strong> Queue position is strictly timestamped. No user can skip the waitlist queue.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Automated Seat Recovery:</strong> Seats surrendered via verified student cancellations are immediately unlocked.
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={submitting}
              onClick={handleJoin}
              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              {submitting ? 'Joining Queue...' : 'Join FIFO Waitlist'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
