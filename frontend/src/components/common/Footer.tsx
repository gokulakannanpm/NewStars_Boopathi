import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Award, Calendar, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white font-heading">
                Eve<span className="text-indigo-400">Hub</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unified inter-collegiate event discovery platform. Streamlined registrations, conflict-free timetable intelligence, and tamper-evident digital certificates.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 w-fit">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Verified Collegiate Network</span>
            </div>
          </div>

          {/* Student Hub Links */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-4 font-heading">
              Student Platform
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/events" className="hover:text-white transition-colors">
                  Browse Inter-College Events
                </Link>
              </li>
              <li>
                <Link to="/student/timetable" className="hover:text-white transition-colors">
                  My Timetable & Conflict Engine
                </Link>
              </li>
              <li>
                <Link to="/student/registrations" className="hover:text-white transition-colors">
                  Registered Passes & QR Entry
                </Link>
              </li>
              <li>
                <Link to="/student/certificates" className="hover:text-white transition-colors">
                  Digital Certificate Wallet
                </Link>
              </li>
              <li>
                <Link to="/student/saved" className="hover:text-white transition-colors">
                  Bookmarked Events
                </Link>
              </li>
            </ul>
          </div>

          {/* Organizer Hub Links */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-4 font-heading">
              Organizers & Faculty
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/organizer/dashboard" className="hover:text-white transition-colors">
                  Organizer Control Center
                </Link>
              </li>
              <li>
                <Link to="/organizer/create-event" className="hover:text-white transition-colors">
                  Publish Collegiate Event
                </Link>
              </li>
              <li>
                <Link to="/organizer/attendance" className="hover:text-white transition-colors">
                  On-Venue QR Check-In Scanner
                </Link>
              </li>
              <li>
                <Link to="/organizer/questions" className="hover:text-white transition-colors">
                  Student Q&A & Support Desk
                </Link>
              </li>
              <li>
                <Link to="/organizer/certificates" className="hover:text-white transition-colors">
                  Credential & Certificate Issuance
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Transparency */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-4 font-heading">
              Verification & Policy
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/verify-certificate/EVH-2026-IIT099" className="hover:text-white transition-colors flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Public Certificate Validator</span>
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About Our Architecture
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-white transition-colors">
                  Seat Recovery & Waitlist Terms
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-white transition-colors">
                  Transport Logistics Disclosure
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 EveHub. All verified collegiate events and institutional trademarks belong to their respective universities.</p>
          <div className="flex gap-6">
            <Link to="/about" className="hover:text-slate-400">Privacy Policy</Link>
            <Link to="/help" className="hover:text-slate-400">Cancellation Terms</Link>
            <Link to="/help" className="hover:text-slate-400">Security Audit</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
