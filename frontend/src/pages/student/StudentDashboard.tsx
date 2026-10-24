import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  Award,
  Bookmark,
  ArrowRight,
  ShieldCheck,
  QrCode,
  MapPin,
  AlertTriangle,
  Bus
} from 'lucide-react';
import { api } from '../../api/client';
import { EventRegistration, Certificate, TimetableEntry, Event } from '../../api/types';
import { useAuth } from '../../context/AuthContext';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();

  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [regs, certs, tt, saved] = await Promise.all([
          api.getMyRegistrations(),
          api.getMyCertificates(),
          api.getTimetable(),
          api.getSavedEvents(),
        ]);
        setRegistrations(regs);
        setCertificates(certs);
        setTimetable(tt);
        setSavedEvents(saved);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const confirmedPasses = registrations.filter((r) => r.registration_status === 'confirmed');

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest font-heading">
            Student Control Center
          </span>
          <h1 className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
            Welcome back, {user?.display_name || 'Gokul'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enrolled at {user?.college_name || 'SSN College of Engineering'} • {user?.department || 'Information Technology'}
          </p>
        </div>

        <Link
          to="/events"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-2xs flex items-center gap-2"
        >
          <span>Discover Competitions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Confirmed Passes</span>
            <CalendarDays className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading">
            {confirmedPasses.length}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">
            Active QR Passes
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Timetable Entries</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading">
            {timetable.length}
          </div>
          <div className="text-[11px] text-indigo-600 mt-1 font-medium">
            Guard Monitoring Active
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Earned Certificates</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading">
            {certificates.length}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">
            Verified Credentials
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Saved Bookmarks</span>
            <Bookmark className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading">
            {savedEvents.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tracked Opportunities
          </div>
        </div>
      </div>

      {/* Confirmed Passes Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-heading">
              Upcoming Registered Passes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ready for venue check-in verification
            </p>
          </div>
          <Link
            to="/student/registrations"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>View All Registrations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {confirmedPasses.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
            You haven't registered for any events yet. Explore events to claim your spot!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {confirmedPasses.map((pass) => (
              <div
                key={pass.id}
                className="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-indigo-700 font-medium">{pass.college_name}</span>
                    <span className="bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                      Confirmed
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 font-heading line-clamp-1">
                    {pass.event_title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{pass.venue}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <div className="font-mono text-indigo-700 font-semibold">
                    {pass.qr_checkin_token}
                  </div>
                  <Link
                    to="/student/registrations"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Open QR Pass</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timetable Conflict Alert Preview */}
      <div className="bg-indigo-50/70 rounded-3xl border border-indigo-200/80 p-6 sm:p-8 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-indigo-950">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base font-heading">
              Academic Timetable & Schedule Protection
            </h3>
          </div>
          <Link
            to="/student/timetable"
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
          >
            Manage Timetable →
          </Link>
        </div>

        <p className="text-xs text-indigo-900/80 leading-relaxed max-w-2xl">
          EveHub actively monitors your {timetable.length} enrolled commitments (such as internal assessment tests and mandatory labs) against event dates.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          {timetable.slice(0, 3).map((tt) => (
            <div key={tt.id} className="bg-white rounded-xl p-3 border border-indigo-100 shadow-2xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 block">
                {tt.type} • {tt.date}
              </span>
              <span className="font-semibold text-slate-900 block mt-0.5 truncate">
                {tt.title}
              </span>
              <span className="text-slate-500 text-[11px] block mt-1">
                {tt.start_time} - {tt.end_time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
