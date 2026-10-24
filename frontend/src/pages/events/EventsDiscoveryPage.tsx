import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  MapPin,
  Calendar,
  Compass,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  Bus,
  Map
} from 'lucide-react';
import { api } from '../../api/client';
import { Event, College, EventCategory, EventFormat } from '../../api/types';
import { EventCard } from '../../components/common/EventCard';
import { EventCardSkeleton } from '../../components/common/LoadingSkeleton';

const CATEGORIES: EventCategory[] = [
  'Hackathon',
  'Technical',
  'Workshop',
  'Cultural',
  'Sports',
  'Symposium',
  'Management',
];

export const EventsDiscoveryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [events, setEvents] = useState<Event[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters from searchParams or defaults
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || 'all';
  const format = searchParams.get('format') || 'all';
  const feeType = searchParams.get('fee_type') || 'all';
  const collegeId = searchParams.get('college_id') || '';
  const district = searchParams.get('district') || '';
  const sort = searchParams.get('sort') || 'upcoming';
  const radiusKm = searchParams.get('radius_km') || '';

  // User location mock coords (Chennai Central area by default)
  const [userLocationEnabled, setUserLocationEnabled] = useState(false);

  useEffect(() => {
    api.getColleges().then(setColleges).catch(console.error);
  }, []);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const params: any = {
          search: search || undefined,
          category: category !== 'all' ? category : undefined,
          format: format !== 'all' ? format : undefined,
          fee_type: feeType !== 'all' ? feeType : undefined,
          college_id: collegeId || undefined,
          district: district || undefined,
          sort,
          limit: 30,
        };

        if (userLocationEnabled && radiusKm) {
          // Chennai center approx lat/lng
          params.lat = 13.0827;
          params.lng = 80.2707;
          params.radius_km = Number(radiusKm);
        }

        const res = await api.getEvents(params);
        setEvents(res.items || []);
        setTotalCount(res.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [search, category, format, feeType, collegeId, district, sort, radiusKm, userLocationEnabled]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handleResetFilters = () => {
    setSearchParams({});
    setUserLocationEnabled(false);
  };

  const hasActiveFilters =
    search ||
    category !== 'all' ||
    format !== 'all' ||
    feeType !== 'all' ||
    collegeId ||
    district ||
    radiusKm;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest font-heading">
            Live Collegiate Circuit
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
            Discover Inter-College Events
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Showing {totalCount} verified hackathons, symposiums, and sports tournaments
          </p>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-slate-500 font-medium">Sort by:</span>
          <select
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-hidden focus:border-indigo-500 cursor-pointer shadow-2xs"
          >
            <option value="upcoming">Upcoming Date</option>
            <option value="deadline">Registration Deadline</option>
            <option value="newest">Newest Added</option>
            <option value="fee_asc">Fee: Free to Lowest</option>
            <option value="fee_desc">Fee: Highest First</option>
          </select>
        </div>
      </div>

      {/* Main Filter Control Panel */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200/80">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by event title, topic, college, or organizer..."
            value={search}
            onChange={(e) => updateParam('search', e.target.value)}
            className="w-full text-xs sm:text-sm bg-transparent outline-hidden text-slate-900 placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => updateParam('search', '')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => updateParam('category', 'all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              category === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => updateParam('category', cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                category === cat
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Secondary Filters row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Format */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Event Format</label>
            <select
              value={format}
              onChange={(e) => updateParam('format', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="all">All Formats</option>
              <option value="offline">Offline / On-Campus</option>
              <option value="online">Online / Virtual</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          {/* Fee Type */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Registration Fee</label>
            <select
              value={feeType}
              onChange={(e) => updateParam('fee_type', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="all">All (Free & Paid)</option>
              <option value="free">Free Events Only</option>
              <option value="paid">Paid Events</option>
            </select>
          </div>

          {/* College Filter */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Host College</label>
            <select
              value={collegeId}
              onChange={(e) => updateParam('college_id', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-hidden cursor-pointer truncate"
            >
              <option value="">All Campuses</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.short_name || c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Distance Radius */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Distance Filter</label>
            <select
              value={radiusKm}
              onChange={(e) => {
                updateParam('radius_km', e.target.value);
                if (e.target.value) setUserLocationEnabled(true);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="">Any Distance</option>
              <option value="15">Within 15 km</option>
              <option value="30">Within 30 km</option>
              <option value="50">Within 50 km</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end col-span-2 sm:col-span-1">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      ) : events.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-4 shadow-xs">
          <Compass className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 font-heading">
            No matching events found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            There are currently no events matching your active filters. Try broadening your criteria or resetting filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-2xs"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
};
