import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  ShieldCheck,
  Clock,
  Award,
  Sparkles,
  ArrowRight,
  Building2,
  CheckCircle,
  TrendingUp,
  MapPin,
  Flame,
  Bus,
  Radio
} from 'lucide-react';
import { api } from '../../api/client';
import { Event, College, EventCategory } from '../../api/types';
import { EventCard } from '../../components/common/EventCard';
import { CategoryBadge } from '../../components/common/CategoryBadge';
import { EventCardSkeleton } from '../../components/common/LoadingSkeleton';

const CATEGORIES: { label: EventCategory; desc: string; count: string }[] = [
  { label: 'Hackathon', desc: '36h to 48h hardware & software challenges', count: '12 Active' },
  { label: 'Technical', desc: 'Paper presentations & algorithmic sprints', count: '18 Active' },
  { label: 'Workshop', desc: 'Hands-on EV, AI & Cloud native masterclasses', count: '15 Active' },
  { label: 'Cultural', desc: 'Inter-collegiate battle of bands & arts', count: '8 Active' },
  { label: 'Sports', desc: 'State-level basketball, badminton & athletic meets', count: '6 Active' },
  { label: 'Symposium', desc: 'Departmental national flagship conferences', count: '14 Active' },
];

export const LandingPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [closingSoonEvents, setClosingSoonEvents] = useState<Event[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const [eventsRes, collegesRes] = await Promise.all([
          api.getEvents({ limit: 12 }),
          api.getColleges(),
        ]);
        const items = eventsRes.items || [];
        setFeaturedEvents(items.slice(0, 6));
        setClosingSoonEvents(items.filter((e) => e.status === 'closing_soon' || e.registered_count >= e.capacity * 0.8).slice(0, 3));
        setColleges(collegesRes.slice(0, 6));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/events');
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 text-white pt-16 pb-20 lg:pt-24 lg:pb-32">
        {/* Subtle patterned background */}
        <div className="absolute inset-0 bg-[radial-gradient(#312e81_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Institutional Trust Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-950/80 border border-indigo-500/30 px-4 py-1.5 rounded-full text-xs text-indigo-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verified Inter-Collegiate Event Network • Zero Schedule Clashes</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto font-heading leading-tight">
            Discover Collegiate Events with{' '}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 via-sky-300 to-indigo-200">
              Deterministic Conflict Guard
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Browse hackathons, technical symposiums, workshops, and sports meets across top universities.
            Verify timetable availability before registering, obtain verified QR passes, and earn tamper-evident digital certificates.
          </p>

          {/* Unified Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl flex flex-col sm:flex-row gap-2"
          >
            <div className="flex-1 flex items-center gap-3 px-3 py-2 bg-white rounded-xl text-slate-900">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search by event title, topic, or college (e.g. Robotics, IIT, Hackathon)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs sm:text-sm bg-transparent outline-hidden text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
            >
              <span>Explore Events</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Signature Nearby Map Callout */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-bold transition-all shadow-md backdrop-blur-md hover:scale-105"
            >
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Explore Nearby Campus Discovery Map (30 km & 50 km)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Metrics bar */}
          <div className="pt-8 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto text-left">
            <div>
              <div className="text-2xl font-bold text-white font-heading">17+</div>
              <div className="text-xs text-slate-400 mt-0.5">Verified Campus Institutions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-indigo-400 font-heading">100%</div>
              <div className="text-xs text-slate-400 mt-0.5">Deterministic Overlap Math</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400 font-heading">Instant</div>
              <div className="text-xs text-slate-400 mt-0.5">Secure QR Check-in Tokens</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-sky-400 font-heading">Tamper-Proof</div>
              <div className="text-xs text-slate-400 mt-0.5">Publicly Verifiable Credentials</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-heading">
              Browse by Event Category
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Filter verified competitions and workshops tailored to your academic interests
            </p>
          </div>
          <Link
            to="/events"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>View All Categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              to={`/events?category=${cat.label}`}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 hover:border-indigo-400 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <CategoryBadge category={cat.label} />
                  <span className="text-[11px] font-medium text-slate-400 group-hover:text-indigo-600 transition-colors">
                    {cat.count}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {cat.label}s & Competitions
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{cat.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-medium text-indigo-600 gap-1">
                <span>Browse {cat.label}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Events Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider font-heading">
                Hand-Picked Collegiate Flagships
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 font-heading">
              Featured Events Open for Registration
            </h2>
          </div>
          <Link
            to="/events"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Explore All Events</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* Deadlines Closing Soon Banner */}
      {closingSoonEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-2 text-amber-800">
              <Flame className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-base sm:text-lg font-heading">
                Registration Deadlines Closing Soon
              </h3>
            </div>
            <p className="text-xs text-amber-900/80 mb-6 max-w-xl">
              Capacity is nearing full limit for these high-demand university symposiums. Secure your seat before the waitlist engages.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {closingSoonEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white rounded-xl p-4 border border-amber-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[11px] font-medium text-amber-800 block mb-1">
                      {evt.college_name}
                    </span>
                    <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">
                      {evt.title}
                    </h4>
                    <span className="text-xs text-slate-500 block mt-1">
                      Venue: {evt.venue}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700">
                      {evt.capacity - evt.registered_count} seats remaining
                    </span>
                    <Link
                      to={`/events/${evt.id}`}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Register Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Participating Colleges Directory Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-heading">
              Participating University Colleges
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Explore host campuses, campus directions, and official event listings
            </p>
          </div>
          <Link
            to="/colleges"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>View All Colleges</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {colleges.map((clg) => (
            <Link
              key={clg.id}
              to={`/events?college_id=${clg.id}`}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                    {clg.name}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{clg.district}, {clg.state}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium text-[11px] border border-emerald-200/60">
                  Verified Partner
                </span>
                <span className="font-medium text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  <span>View Events</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Value Pillars Section: Student & Organizer */}
      <section className="bg-slate-100/70 border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
              Why Premier Universities Trust EveHub
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              Replacing chaotic Google Forms and unverified paper passes with a unified collegiate standard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 font-heading">
                Deterministic Timetable Guard
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Before completing registration, our interval math engine checks your internal exam and lab schedule to alert you of overlaps before they happen.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 font-heading">
                Verified Venue QR Passes
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Organizers scan tamper-proof QR tokens directly at entry gates. Duplicate check-ins are mathematically prevented with full audit logs.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 font-heading">
                Tamper-Proof Certificates
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Certificates are issued strictly upon confirmed attendance records. Each certificate contains a unique verification ID verifiable by employers worldwide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-linear-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-3xl p-8 sm:p-12 text-white text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-extrabold font-heading">
              Ready to Expand Your Academic & Technical Horizon?
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed font-normal">
              Join thousands of engineering and arts students competing across university boundaries. No fake listings, no dead links.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/events"
                className="w-full sm:w-auto bg-white text-indigo-700 hover:bg-indigo-50 font-semibold px-6 py-3 rounded-xl text-xs sm:text-sm transition-colors shadow-md"
              >
                Browse All Events
              </Link>
              <Link
                to="/signup"
                className="w-full sm:w-auto bg-indigo-900/60 hover:bg-indigo-900 text-white font-semibold px-6 py-3 rounded-xl text-xs sm:text-sm transition-colors border border-indigo-400/40"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
