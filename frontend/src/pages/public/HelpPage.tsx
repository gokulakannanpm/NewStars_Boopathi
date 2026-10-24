import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Mail, Phone, MessageSquare } from 'lucide-react';

const FAQS = [
  {
    q: 'How does the Timetable Conflict Detection engine work?',
    a: 'EveHub allows students to input or CSV-import their academic calendar (classes, labs, and exams). When you browse or attempt to register for an event, our engine calculates mathematical interval overlaps between event hours and your commitments, returning whether a conflict exists, no conflict exists, or if timetable information is incomplete.',
  },
  {
    q: 'Can I register for an event if a schedule conflict is detected?',
    a: 'Yes. EveHub will present a clear warning outlining the exact conflicting commitment and overlap duration. You may proceed after explicitly acknowledging the warning, empowering you to make an informed academic decision.',
  },
  {
    q: 'How do seat offers work when an event is full?',
    a: 'When an event reaches full capacity, you can join the FIFO (First-In-First-Out) priority waitlist. If a registered attendee cancels, EveHub automatically offers the seat to the next student in line with a 24-hour acceptance window before it advances to the next person.',
  },
  {
    q: 'How do I obtain my participation or achievement certificate?',
    a: 'Certificates are not issued merely for registering. After attending the event in person and having your QR pass scanned by the event organizers, your verified attendance is recorded. The organizers then issue digital certificates which you can preview, download as a PDF, or verify via a public URL.',
  },
  {
    q: 'Are external registration links supported?',
    a: 'Yes. For events hosted on external platforms (such as Unstop or college portals), EveHub clearly indicates the listing as an external event and redirects you to the canonical registration URL without falsely claiming registration was finalized on EveHub.',
  },
];

export const HelpPage: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-slate-900 font-heading">
          Help & Frequently Asked Questions
        </h1>
        <p className="text-sm text-slate-600">
          Answers to common questions regarding timetable intelligence, registrations, and certificate validation.
        </p>
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-colors"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full text-left p-5 flex items-center justify-between gap-4 font-semibold text-sm text-slate-900 hover:text-indigo-600"
              >
                <span>{faq.q}</span>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-indigo-600 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Contact & Support Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <h3 className="font-bold text-base text-slate-900 font-heading">
          Need Direct Organizer Assistance?
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          For questions regarding specific competitions, use the "Ask a Question" or "Request Call Slot" action located directly on any event detail page.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600" />
            <span>support@evehub.in</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-indigo-600" />
            <span>+91 44 2235 7000 (Helpline)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
