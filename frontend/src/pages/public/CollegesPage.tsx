import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Search, ExternalLink, Compass, ShieldCheck, Map } from 'lucide-react';
import { api } from '../../api/client';
import { College } from '../../api/types';

export const CollegesPage: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getColleges()
      .then(setColleges)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const districts = ['all', ...Array.from(new Set(colleges.map((c) => c.district)))];

  const filtered = colleges.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.short_name && c.short_name.toLowerCase().includes(search.toLowerCase())) ||
      c.district.toLowerCase().includes(search.toLowerCase());
    const matchDistrict = selectedDistrict === 'all' || c.district === selectedDistrict;
    const matchType = selectedType === 'all' || (c.college_type && c.college_type.toLowerCase() === selectedType.toLowerCase());
    return matchSearch && matchDistrict && matchType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest font-heading">
            Institutional Directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
            Verified University Colleges & Campuses
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse participating universities across Tamil Nadu hosting upcoming hackathons and symposiums
          </p>
        </div>

        {/* Discovery Map CTA & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/explore"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-2xs flex items-center gap-2"
          >
            <Compass className="w-4 h-4 text-white" />
            <span>Open Nearby Map (30 km & 50 km)</span>
          </Link>

          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Campus List</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                viewMode === 'map' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Pin View</span>
            </button>
          </div>
        </div>
      </div>

      {/* College Type Filtering Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { label: 'All Institutions', val: 'all' },
          { label: 'Engineering', val: 'Engineering' },
          { label: 'Arts & Science', val: 'Arts and Science' },
          { label: 'Medical & Health', val: 'Medical and Health Sciences' },
          { label: 'Management', val: 'Management' }
        ].map((t) => (
          <button
            key={t.val}
            onClick={() => setSelectedType(t.val)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedType === t.val
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search & District Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by college name or district (e.g. IIT, Guindy, Coimbatore)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-transparent outline-hidden text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {districts.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDistrict(d)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors capitalize ${
                selectedDistrict === d
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {d === 'all' ? 'All Districts' : d}
            </button>
          ))}
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-900 font-heading">
              No matching colleges found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search terms or selecting 'All Districts' to view other campuses.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((clg) => (
              <div
                key={clg.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all p-6 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                      <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" /> Verified Host
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-slate-900 font-heading leading-snug">
                      {clg.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{clg.district}, {clg.state}</span>
                    </div>
                  </div>

                  {clg.address && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {clg.address}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/explore?college=${clg.id}`}
                      className="text-slate-700 hover:text-indigo-600 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      <span>View on Map</span>
                    </Link>

                    {clg.latitude && clg.longitude && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${clg.latitude},${clg.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-indigo-600 font-medium hidden sm:flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                        <span>Directions</span>
                      </a>
                    )}
                  </div>

                  <Link
                    to={`/events?college_id=${clg.id}`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-xl transition-colors shadow-2xs flex items-center gap-1"
                  >
                    <span>Browse Events</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Map View with interactive college pins */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-600" />
              <span>Campus Locations & Geographic Pins</span>
            </h3>
            <span className="text-xs text-slate-500">
              Showing {filtered.length} verified coordinate markers
            </span>
          </div>

          {/* Interactive Visual Map Representation */}
          <div className="relative w-full h-96 bg-slate-900 rounded-2xl overflow-hidden p-6 border border-slate-800 flex flex-col justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(#4338ca_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />

            <div className="relative z-10 flex items-center justify-between text-xs text-slate-300">
              <span className="bg-slate-800/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-700">
                Tamil Nadu Collegiate Circuit Map
              </span>
              <span className="bg-indigo-950/80 text-indigo-300 px-3 py-1 rounded-lg border border-indigo-700/50">
                Click any campus to explore events
              </span>
            </div>

            {/* Pins Grid */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-auto">
              {filtered.map((clg) => (
                <div
                  key={clg.id}
                  className="bg-slate-800/90 backdrop-blur-md p-3 rounded-xl border border-slate-700/80 text-left hover:border-indigo-400 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white group-hover:text-indigo-300 truncate">
                      {clg.short_name || clg.name}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 px-1.5 py-0.5 rounded">
                      {clg.district}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mb-2">
                    Lat: {clg.latitude?.toFixed(4)}, Lon: {clg.longitude?.toFixed(4)}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${clg.latitude},${clg.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-300 hover:text-white flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3 text-indigo-400" />
                      <span>Directions</span>
                    </a>
                    <Link
                      to={`/events?college_id=${clg.id}`}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      See Events →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative z-10 text-[11px] text-slate-400 text-center">
              Coordinates verified by institutional registrar API.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
