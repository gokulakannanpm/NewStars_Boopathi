import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Radio,
  Compass,
  Building2,
  Sparkles,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../api/client';
import { EventRegistration, Certificate, TimetableEntry, Event, College } from '../../api/types';
import { useAuth } from '../../context/AuthContext';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [nearbyColleges, setNearbyColleges] = useState<College[]>([]);
  const [liveEvents, setLiveEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const savedLat = localStorage.getItem('evehub_search_lat') || '12.7508';
        const savedLng = localStorage.getItem('evehub_search_lng') || '80.1970';
        const nowIso = new Date().toISOString();

        const [regs, certs, tt, saved, nearby, allEvts] = await Promise.all([
          api.getMyRegistrations(),
          api.getMyCertificates(),
          api.getTimetable(),
          api.getSavedEvents(),
          api.getNearbyColleges({
            lat: parseFloat(savedLat),
            lng: parseFloat(savedLng),
            radius_km: 30
          }).catch(() => []),
          api.getEvents({ limit: 30 }).catch(() => ({ items: [] }))
        ]);

        setRegistrations(regs);
        setCertificates(certs);
        setTimetable(tt);
        setSavedEvents(saved);
        setNearbyColleges(nearby);

        // Filter events strictly happening right now based on timestamps
        const live = (allEvts.items || []).filter(
          (e: Event) => e.start_date <= nowIso && e.end_date >= nowIso
        );
        setLiveEvents(live);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const confirmedPasses = registrations.filter((r) => r.registration_status === 'confirmed');
  const totalLiveNearby = nearbyColleges.reduce((sum, c) => sum + (c.live_events_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Signature Nearby Map Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/60">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>SIGNATURE DISCOVERY MAP</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-indigo-200 border border-white/10">
                <span>30 km Radius Active</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
              Hyperlocal Campus Discovery
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/80 mt-2 leading-relaxed">
              Explore {nearbyColleges.length > 0 ? `${nearbyColleges.length} collegiate campuses` : 'nearby colleges'} within 30 km of your location. Instantly see hackathons and technical symposiums happening right now with live radar tracking.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02]"
              >
                <Compass className="w-4 h-4 text-white" />
                <span>Launch Interactive Discovery Map</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/explore?radius=50"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/15 transition-colors"
              >
                <span>Expand to 50 km</span>
              </Link>
            </div>
          </div>

          {/* Quick Nearby Campus Badge Strip */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 w-full lg:w-72 shrink-0">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-200 mb-2.5 pb-2 border-b border-white/10">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Nearby Campuses</span>
              </span>
              <span className="text-emerald-400">{nearbyColleges.length} Found</span>
            </div>

            <div className="space-y-2">
              {nearbyColleges.slice(0, 3).map((clg) => (
                <div
                  key={clg.id}
                  onClick={() => navigate(`/explore?college=${clg.id}`)}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/15 transition-colors cursor-pointer text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-white truncate text-[11px]">
                      {clg.short_name || clg.name}
                    </div>
                    <div className="text-[10px] text-indigo-200/70 truncate">
                      {clg.college_type}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-[11px] font-bold text-amber-300">
                      {clg.distance_km} km
                    </span>
                    {(clg.live_events_count || 0) > 0 && (
                      <span className="block text-[9px] font-bold text-rose-400 animate-pulse">
                        🔴 LIVE
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/explore"
              className="mt-3 block text-center text-[11px] font-bold text-indigo-300 hover:text-white transition-colors"
            >
              View all on interactive map →
            </Link>
          </div>
        </div>
      </div>

      {/* Happening Right Now Section */}
      {liveEvents.length > 0 && (
        <div className="bg-white rounded-3xl border border-rose-200/80 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 font-heading">
                    Happening Right Now
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified collegiate competitions and events in progress at neighboring campuses
                </p>
              </div>
            </div>

            <Link
              to="/explore"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Explore on Map</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => navigate(`/events/${evt.id}`)}
                className="p-4 rounded-2xl border border-rose-200 bg-rose-50/30 hover:bg-rose-50/70 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                      {evt.college_name}
                    </span>
                    <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {evt.fee === 0 ? 'FREE' : `₹${evt.fee}`}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {evt.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-rose-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate max-w-[200px]">{evt.venue}</span>
                  </div>

                  <span className="font-bold text-rose-700 inline-flex items-center gap-1">
                    <span>View Event</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
