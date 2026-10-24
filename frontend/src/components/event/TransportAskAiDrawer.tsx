import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bus,
  FileText,
  AlertCircle,
  CheckCircle2,
  MapPin,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { api } from '../../api/client';
import { TransportAskAIResult } from '../../api/types';

interface TransportAskAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  collegeName: string;
  transportPdfUrl?: string;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  citations?: string[];
  sourcePages?: number[];
  time: string;
}

export const TransportAskAiDrawer: React.FC<TransportAskAiDrawerProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  collegeName,
  transportPdfUrl,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: `Hello! I am your AI Transport Assistant for ${eventTitle} at ${collegeName}. Ask me about verified pickup points, bus routes, stops, and schedules grounded in the college's official transport document.`,
      time: 'Just now',
    },
  ]);

  if (!isOpen) return null;

  const handleSend = async (questionText?: string) => {
    const q = (questionText || query).trim();
    if (!q || loading) return;

    const userMsg: Message = {
      sender: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res: TransportAskAIResult = await api.askAiTransport(eventId, q);
      const assistantMsg: Message = {
        sender: 'assistant',
        text: res.answer,
        citations: res.citations,
        sourcePages: res.source_pages,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: err.message || 'Unable to retrieve route info right now. Please check the schedule directly.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    'Which bus stops near Central Railway Station?',
    'What is the morning pickup time from Tambaram?',
    'Is there a shuttle from Guindy Metro?',
    'When does the return bus leave after the event?',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 text-slate-800">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm font-heading">Transport Route Assistant</h3>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Document Grounded
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-xs">{eventTitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Context Banner */}
        <div className="px-5 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-900">
            <Bus className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-medium text-[11px]">
              Grounded in official college schedule
            </span>
          </div>

          {transportPdfUrl && (
            <a
              href={transportPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Original PDF</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 space-y-2 shadow-2xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200'
                }`}
              >
                <div className="whitespace-pre-line text-xs font-normal">{m.text}</div>

                {/* Source Citations */}
                {m.citations && m.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/80 text-[11px] space-y-1">
                    <span className="font-semibold text-slate-700 block text-[10px] uppercase tracking-wider">
                      Verified Document Citations:
                    </span>
                    {m.citations.map((c, i) => (
                      <div
                        key={i}
                        className="bg-white/80 p-1.5 rounded-lg border border-slate-200 text-slate-600 font-mono text-[10px]"
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{m.time}</span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-medium p-3 bg-indigo-50 rounded-xl border border-indigo-100 w-fit">
              <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>Searching transport document passages...</span>
            </div>
          )}
        </div>

        {/* Suggested Queries */}
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          <span className="text-[10px] text-slate-500 font-semibold block mb-1.5">
            Quick Queries:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sampleQuestions.map((sq, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(sq)}
                className="bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] transition-colors text-left"
              >
                {sq}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 border-t border-slate-200 bg-white flex gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about a bus stop, route, or timing..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-hidden focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl transition-colors font-semibold text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};
