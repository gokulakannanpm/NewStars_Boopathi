import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarPlus,
  Users,
  QrCode,
  MessageSquare,
  Award,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building
} from 'lucide-react';
import { api } from '../../api/client';
import { OrganizerMetrics } from '../../api/types';
import { useAuth } from '../../context/AuthContext';

export const OrganizerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<OrganizerMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrganizerMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Organizer Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest font-heading">
            Institutional Control Center
          </span>
          <h1 className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
            {user?.display_name || 'Organizer Portal'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {user?.college_name || 'College of Engineering, Guindy (Anna University)'} • Verified Convener
          </p>
        </div>

        <Link
          to="/organizer/create-event"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-2xs flex items-center gap-2"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Publish New Event</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Published Events</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading">
            {metrics?.total_events ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Active Collegiate Listings
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Registrations</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading">
            {metrics?.total_registrations ?? 0}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">
            Across All Campuses
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Pending Inquiries</span>
            <MessageSquare className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading">
            {metrics?.pending_questions ?? 0}
          </div>
          <div className="text-[11px] text-amber-600 mt-1 font-medium">
            Awaiting Convener Answer
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Credentials Issued</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading">
            {metrics?.certificates_issued ?? 0}
          </div>
          <div className="text-[11px] text-purple-600 mt-1 font-medium">
            Verified Digital Certificates
          </div>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/organizer/attendance"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-900 font-heading">
              On-Venue QR Scanner
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Check-in attendees & prevent duplicate entries
            </p>
          </div>
        </Link>

        <Link
          to="/organizer/questions"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-900 font-heading">
              Student Q&A Desk
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Answer participant questions & manage calls
            </p>
          </div>
        </Link>

        <Link
          to="/organizer/certificates"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-900 font-heading">
              Issue Certificates
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate tamper-proof PDF credentials
            </p>
          </div>
        </Link>
      </div>

      {/* Managed Events Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Managed Event Listings
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time capacity tracking and attendee administration
            </p>
          </div>
          <Link
            to="/organizer/events"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {metrics?.events && metrics.events.length > 0 ? (
          <div className="space-y-4">
            {metrics.events.map((evt) => (
              <div
                key={evt.id}
                className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-indigo-700 font-mono text-[11px]">
                      {evt.category}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{new Date(evt.start_date).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 font-heading">
                    {evt.title}
                  </h3>
                  <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                    <span>Venue: {evt.venue}</span>
                    <span>Fee: {evt.fee === 0 ? 'Free' : `₹${evt.fee}`}</span>
                  </div>
                </div>

                {/* Capacity progress */}
                <div className="w-full md:w-56 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Registrations:</span>
                    <span className="font-bold text-slate-900">
                      {evt.registered_count} / {evt.capacity}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round((evt.registered_count / evt.capacity) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto pt-2 md:pt-0">
                  <Link
                    to="/organizer/attendance"
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                  >
                    Attendance
                  </Link>
                  <Link
                    to={`/events/${evt.id}`}
                    className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                  >
                    Public View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
            No events published yet. Click "Publish New Event" to create your first collegiate event!
          </div>
        )}
      </div>
    </div>
  );
};
