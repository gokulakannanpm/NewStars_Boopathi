import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  AlertCircle,
  Send,
  Sparkles
} from 'lucide-react';
import { api } from '../../api/client';
import { Event, StudentQuestion } from '../../api/types';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

export const QuestionsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'answered' | 'call'>('all');
  const [loading, setLoading] = useState(true);

  // Answer Modal
  const [selectedQ, setSelectedQ] = useState<StudentQuestion | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isPublicFaq, setIsPublicFaq] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const toast = useToast();

  const loadData = async () => {
    try {
      const evs = await api.getEvents({ limit: 20 });
      const items = evs.items || [];
      setEvents(items);
      if (items.length > 0) {
        const targetId = selectedEventId || items[0].id;
        setSelectedEventId(targetId);
        const qs = await api.getQuestions(targetId);
        setQuestions(qs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectEvent = async (id: string) => {
    setSelectedEventId(id);
    setLoading(true);
    try {
      const qs = await api.getQuestions(id);
      setQuestions(qs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAnswerModal = (q: StudentQuestion) => {
    setSelectedQ(q);
    setAnswerText(q.answer || '');
    setIsPublicFaq(q.is_public_faq || true);
  };

  const handleSendAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQ || !answerText.trim()) return;
    setSubmitting(true);
    try {
      const updated = await api.answerQuestion(selectedQ.id, {
        answer: answerText.trim(),
        status: 'answered',
        is_public_faq: isPublicFaq,
      });
      toast.success('Response posted and notification dispatched to participant!');
      setQuestions((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setSelectedQ(null);
    } catch {
      toast.error('Could not submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = questions.filter((q) => {
    if (filter === 'pending') return q.status === 'pending';
    if (filter === 'answered') return q.status === 'answered';
    if (filter === 'call') return q.call_requested;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">
            Student Inquiries & Mediator Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Address student inquiries, schedule phone callbacks, and publish public event FAQs
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Filter Event:</span>
          <select
            value={selectedEventId}
            onChange={(e) => handleSelectEvent(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-hidden max-w-xs truncate cursor-pointer shadow-2xs"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold max-w-md">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 rounded-lg transition-colors ${
            filter === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
          }`}
        >
          All Questions ({questions.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`flex-1 py-1.5 rounded-lg transition-colors ${
            filter === 'pending' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
          }`}
        >
          Unanswered ({questions.filter((q) => q.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('call')}
          className={`flex-1 py-1.5 rounded-lg transition-colors ${
            filter === 'call' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
          }`}
        >
          Call Requests ({questions.filter((q) => q.call_requested).length})
        </button>
        <button
          onClick={() => setFilter('answered')}
          className={`flex-1 py-1.5 rounded-lg transition-colors ${
            filter === 'answered' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
          }`}
        >
          Answered
        </button>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-24 bg-white rounded-2xl border border-slate-200" />
          <div className="h-24 bg-white rounded-2xl border border-slate-200" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3 shadow-xs">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 font-heading">
            No questions in this view
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All student inquiries for this event have been addressed or none have been submitted yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-indigo-300 transition-all space-y-3 text-xs"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{q.question}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      q.status === 'answered'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {q.status}
                    </span>
                    {q.is_public_faq && (
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                        Public FAQ
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>Asked by: <strong>{q.student_name}</strong> ({q.student_email})</span>
                    <span>• {new Date(q.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenAnswerModal(q)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors shrink-0 shadow-2xs"
                >
                  {q.answer ? 'Edit Response' : 'Answer Question'}
                </button>
              </div>

              {q.call_requested && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2.5 text-amber-900 text-xs">
                  <Phone className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Callback Requested:</strong> Student requested telephone assistance for slot: <em>{q.call_slot || 'Callback ASAP'}</em>
                  </span>
                </div>
              )}

              {q.answer && (
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Convener Answer ({q.answered_by})
                  </span>
                  <p className="text-slate-800 leading-relaxed">{q.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Answer Modal */}
      {selectedQ && (
        <Modal
          isOpen={!!selectedQ}
          onClose={() => setSelectedQ(null)}
          title="Draft Organizer Answer"
          subtitle={`Replying to ${selectedQ.student_name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSendAnswer} className="space-y-4 text-xs">
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Question</span>
              <p className="text-slate-900 font-medium">{selectedQ.question}</p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Official Convener Response</label>
              <textarea
                rows={4}
                required
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Draft authoritative reply regarding schedule, venue rules, or hardware..."
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-hidden focus:border-indigo-500 text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="public-faq"
                checked={isPublicFaq}
                onChange={(e) => setIsPublicFaq(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="public-faq" className="text-xs text-slate-800 font-medium cursor-pointer">
                Publish as Public FAQ on Event Page for all prospective participants
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedQ(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Publishing...' : 'Dispatch Response'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
