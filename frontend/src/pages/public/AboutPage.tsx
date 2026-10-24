import React from 'react';
import { ShieldCheck, Clock, Award, Building2, CheckCircle2 } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest font-heading">
          Institutional Platform Architecture
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading">
          About EveHub
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          EveHub was engineered to eliminate fragmentation in inter-collegiate competitions, replacing scattered social media posters and unverified forms with trusted university infrastructure.
        </p>
      </div>

      {/* Core Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <Clock className="w-6 h-6 text-indigo-600" />
          <h3 className="font-semibold text-base text-slate-900 font-heading">
            Deterministic Conflict Detection
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Rather than relying on vague AI guesses, EveHub runs mathematical interval intersection checks between verified exam, lab, and class schedules against event dates.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <h3 className="font-semibold text-base text-slate-900 font-heading">
            Zero-Trust Venue Verification
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Attendance check-ins require authorized institutional tokens. Student self-reporting is rejected; only authorized faculty or student conveners can verify physical attendance.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <Award className="w-6 h-6 text-sky-600" />
          <h3 className="font-semibold text-base text-slate-900 font-heading">
            Verifiable Digital Credentials
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every issued certificate carries an immutable, cryptographically verifiable ID that can be independently validated by employers or admissions boards worldwide.
          </p>
        </div>
      </div>

      {/* Transparency & Integrity Policies */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
        <h2 className="text-xl font-bold text-slate-900 font-heading">
          Integrity & Governance Standards
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-600 leading-relaxed">
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Verified Event Host Authorization
            </h4>
            <p>
              Only designated faculty coordinators and verified student body leads can publish listings. EveHub enforces strict role permissions preventing student escalation to organizer privileges.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Transparent Seat Recovery & FIFO Queue
            </h4>
            <p>
              Capacity limits are strictly enforced. When an attendee cancels with adequate notice, the seat is released strictly in timestamped First-In-First-Out (FIFO) order to waitlisted candidates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
