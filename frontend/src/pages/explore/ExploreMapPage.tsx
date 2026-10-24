import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import {
  MapPin,
  Compass,
  Navigation,
  Search,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  SlidersHorizontal,
  AlertCircle,
  Radio,
  CheckCircle2,
  Sparkles,
  Info,
  ChevronDown,
  Layers,
  X
} from 'lucide-react';
import { api } from '../../api/client';
import { College, CollegeEventsGrouped, CollegeType, Event } from '../../api/types';
import { useAuth } from '../../context/AuthContext';

// Regional campus hub presets for instant switching & manual fallback
interface CampusHubPreset {
  name: string;
  shortLabel: string;
  lat: number;
  lng: number;
  description: string;
}

const REGIONAL_HUBS: CampusHubPreset[] = [
  {
    name: 'West Tambaram / Sri Sairam Campus Hub',
    shortLabel: 'Sairam / Tambaram',
    lat: 12.9602,
    lng: 80.0574,
    description: 'Sai Leo Nagar, West Tambaram & Kundrathur corridor'
  },
  {
    name: 'SSN College / OMR Tech Corridor',
    shortLabel: 'SSN / OMR',
    lat: 12.7508,
    lng: 80.1970,
    description: 'Kalavakkam, IT Expressway & Siruseri tech hub'
  },
  {
    name: 'Anna University (CEG) / Guindy Central',
    shortLabel: 'CEG / Guindy',
    lat: 13.0109,
    lng: 80.2354,
    description: 'Central Chennai, Guindy & Sardar Patel Road'
  },
  {
    name: 'SRM Institute / Kattankulathur',
    shortLabel: 'SRM / Chengalpattu',
    lat: 12.8231,
    lng: 80.0444,
    description: 'Kattankulathur & Vandalur university hub'
  },
  {
    name: 'MCC / Tambaram GST Corridor',
    shortLabel: 'MCC / Tambaram',
    lat: 12.9229,
    lng: 80.1235,
    description: 'Tambaram East & Southern Chennai corridor'
  },
  {
    name: 'Sriperumbudur / SVCE & Saveetha',
    shortLabel: 'Sriperumbudur',
    lat: 12.9866,
    lng: 79.9719,
    description: 'Pennalur, Thandalam & Sriperumbudur industrial belt'
  },
  {
    name: 'Chennai Central / Presidency & Law',
    shortLabel: 'Chennai Central',
    lat: 13.0825,
    lng: 80.2783,
    description: 'Chepauk, Marina Beach & Central Chennai cluster'
  },
  {
    name: 'Coimbatore Tech Hub (PSG Tech)',
    shortLabel: 'Coimbatore',
    lat: 11.0245,
    lng: 76.9946,
    description: 'Peelamedu & Western industrial campus cluster'
  },
  {
    name: 'NIT Tiruchirappalli (NIT Trichy)',
    shortLabel: 'NIT Trichy',
    lat: 10.7607,
    lng: 78.8143,
    description: 'Tanjore Main Road & Central Tamil Nadu cluster'
  }
];

const COLLEGE_TYPES: { label: string; value: string }[] = [
  { label: 'All Institutions', value: 'all' },
  { label: 'Engineering', value: 'Engineering' },
  { label: 'Arts & Science', value: 'Arts & Science' },
  { label: 'Medical & Health Sciences', value: 'Medical & Health Sciences' },
  { label: 'Law', value: 'Law' },
  { label: 'Management', value: 'Management' }
];

export const ExploreMapPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search Origin Coordinates
  // Defaults to West Tambaram / Sri Sairam Campus (student profile default) or saved in localStorage
  const savedLat = localStorage.getItem('evehub_search_lat');
  const savedLng = localStorage.getItem('evehub_search_lng');
  const savedLocationName = localStorage.getItem('evehub_search_name');

  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number }>({
    lat: savedLat ? parseFloat(savedLat) : 12.9602,
    lng: savedLng ? parseFloat(savedLng) : 80.0574
  });
  const [locationLabel, setLocationLabel] = useState<string>(
    savedLocationName || 'West Tambaram / Sri Sairam Campus Hub'
  );

  // Filters State
  const initialRadius = searchParams.get('radius') === '50' ? 50 : 30;
  const [radiusKm, setRadiusKm] = useState<30 | 50>(initialRadius);

  // Default to Engineering if student course is engineering, else all
  const initialType = searchParams.get('type') || (user?.department?.toLowerCase().includes('engineer') || user?.department?.toLowerCase().includes('technology') ? 'Engineering' : 'all');
  const [selectedType, setSelectedType] = useState<string>(initialType);

  const [keyword, setKeyword] = useState<string>('');
  const [hubSearchQuery, setHubSearchQuery] = useState<string>('');

  // Data State
  const [colleges, setColleges] = useState<College[]>([]);
  const [loadingColleges, setLoadingColleges] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(searchParams.get('college') || null);
  const [collegeDetails, setCollegeDetails] = useState<CollegeEventsGrouped | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'happening_now' | 'starting_soon' | 'upcoming' | 'past'>('happening_now');

  // UI State
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState<boolean>(!savedLat);
  const [tileError, setTileError] = useState<boolean>(false);
  const [markerError, setMarkerError] = useState<boolean>(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState<boolean>(false);

  // Leaflet references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const collegeMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  // Update URL params
  const updateUrlParams = useCallback((newParams: Record<string, string | null>) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === null || v === '' || v === 'all') {
        updated.delete(k);
      } else {
        updated.set(k, v);
      }
    });
    setSearchParams(updated, { replace: true });
  }, [searchParams, setSearchParams]);

  // Fetch Nearby Colleges from Backend
  const fetchNearbyColleges = useCallback(async () => {
    setLoadingColleges(true);
    setApiError(null);
    try {
      const data = await api.getNearbyColleges({
        lat: searchCenter.lat,
        lng: searchCenter.lng,
        radius_km: radiusKm,
        college_type: selectedType === 'all' ? undefined : selectedType,
        search: keyword.trim() || undefined
      });
      setColleges(data);
    } catch (err: any) {
      console.error('Failed to fetch nearby colleges:', err);
      setApiError(err?.message || 'Unable to connect to nearby campus discovery service. Please check your network or backend server.');
      setColleges([]);
    } finally {
      setLoadingColleges(false);
    }
  }, [searchCenter, radiusKm, selectedType, keyword]);

  useEffect(() => {
    fetchNearbyColleges();
  }, [fetchNearbyColleges]);

  // Fetch Selected College Events
  const fetchCollegeEvents = useCallback(async (collegeId: string) => {
    setLoadingDetails(true);
    try {
      const grouped = await api.getCollegeEventsGrouped(collegeId);
      setCollegeDetails(grouped);

      // Auto-select the most exciting tab with events
      if (grouped.counts.happening_now > 0) {
        setActiveTab('happening_now');
      } else if (grouped.counts.starting_soon > 0) {
        setActiveTab('starting_soon');
      } else if (grouped.counts.upcoming > 0) {
        setActiveTab('upcoming');
      } else {
        setActiveTab('past');
      }
    } catch (err) {
      console.error('Failed to fetch college events:', err);
      setCollegeDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCollegeId) {
      fetchCollegeEvents(selectedCollegeId);
      updateUrlParams({ college: selectedCollegeId });
    } else {
      setCollegeDetails(null);
      updateUrlParams({ college: null });
    }
  }, [selectedCollegeId, fetchCollegeEvents, updateUrlParams]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: [searchCenter.lat, searchCenter.lng],
      zoom: radiusKm === 30 ? 11 : 10,
      zoomControl: false,
      attributionControl: true
    });

    // Add zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add OpenStreetMap tiles
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    tileLayer.on('tileerror', () => {
      setTileError(true);
    });

    tileLayer.addTo(map);

    // Map click handler to set search origin anywhere
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSearchCenter({ lat, lng });
      setLocationLabel(`Custom Pin (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
      localStorage.setItem('evehub_search_lat', String(lat));
      localStorage.setItem('evehub_search_lng', String(lng));
      localStorage.setItem('evehub_search_name', `Pin (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Search Origin Marker & Radius Circle on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Update center marker
    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove();
    }

    const centerIcon = L.divIcon({
      className: 'custom-center-marker',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-8 h-8 rounded-full bg-indigo-500/30 animate-ping"></div>
          <div class="w-5 h-5 rounded-full bg-indigo-600 border-2 border-white shadow-lg flex items-center justify-center">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    centerMarkerRef.current = L.marker([searchCenter.lat, searchCenter.lng], {
      icon: centerIcon,
      zIndexOffset: 500
    }).addTo(map);

    centerMarkerRef.current.bindTooltip(
      `<div class="font-semibold text-xs py-0.5 px-1">📍 Search Center: ${locationLabel}</div>`,
      { direction: 'top', offset: [0, -10] }
    );

    // Update radius boundary circle
    if (radiusCircleRef.current) {
      radiusCircleRef.current.remove();
    }

    radiusCircleRef.current = L.circle([searchCenter.lat, searchCenter.lng], {
      radius: radiusKm * 1000,
      color: '#4f46e5',
      weight: 1.5,
      dashArray: '6, 6',
      fillColor: '#6366f1',
      fillOpacity: 0.06
    }).addTo(map);

    // Fly to new center smoothly
    map.flyTo([searchCenter.lat, searchCenter.lng], radiusKm === 30 ? 11 : 10, {
      duration: 0.8
    });
  }, [searchCenter, radiusKm, locationLabel]);

  // Update College Markers on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing college markers
    collegeMarkersRef.current.forEach((marker) => marker.remove());
    collegeMarkersRef.current.clear();

    colleges.forEach((clg) => {
      if (clg.latitude === undefined || clg.longitude === undefined || clg.latitude === null || clg.longitude === null) {
        return;
      }

      const isSelected = selectedCollegeId === clg.id;
      const hasLive = (clg.live_events_count || 0) > 0;
      const hasUpcoming = (clg.upcoming_events_count || 0) > 0;

      // Color coding & badge
      let markerBg = 'bg-slate-700';
      let pulseClass = '';
      let badgeHtml = '';

      if (hasLive) {
        markerBg = 'bg-rose-600';
        pulseClass = 'evehub-marker-live';
        badgeHtml = `<span class="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 bg-rose-500 text-white font-extrabold text-[9px] rounded-full border border-white shadow-xs animate-bounce">${clg.live_events_count} LIVE</span>`;
      } else if (hasUpcoming) {
        markerBg = 'bg-indigo-600';
        badgeHtml = `<span class="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 bg-indigo-500 text-white font-bold text-[9px] rounded-full border border-white shadow-xs">${clg.upcoming_events_count}</span>`;
      }

      const selectedRing = isSelected
        ? 'ring-4 ring-amber-400 scale-115 shadow-xl z-50'
        : 'hover:scale-110 shadow-md';

      const customIcon = L.divIcon({
        className: 'custom-college-marker',
        html: `
          <div class="relative flex items-center justify-center w-9 h-9 transition-transform duration-200 ${selectedRing}">
            <div class="w-8 h-8 rounded-full ${markerBg} ${pulseClass} text-white flex items-center justify-center border-2 border-white shadow">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            ${badgeHtml}
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([clg.latitude, clg.longitude], {
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : hasLive ? 800 : 200
      }).addTo(map);

      // Tooltip preview
      marker.bindTooltip(
        `
        <div class="p-1 min-w-[160px] text-left">
          <div class="font-bold text-xs text-slate-900">${clg.short_name || clg.name}</div>
          <div class="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <span>${clg.college_type || 'Engineering'}</span>
            <span>•</span>
            <span class="font-semibold text-indigo-600">${clg.distance_km} km</span>
          </div>
          ${
            hasLive
              ? `<div class="mt-1 text-[10px] text-rose-600 font-bold flex items-center gap-1">🔴 ${clg.live_events_count} Event(s) happening now!</div>`
              : hasUpcoming
              ? `<div class="mt-1 text-[10px] text-indigo-600 font-semibold">${clg.upcoming_events_count} upcoming event(s)</div>`
              : `<div class="mt-1 text-[10px] text-slate-400">No events right now</div>`
          }
        </div>
        `,
        { direction: 'top', offset: [0, -12] }
      );

      marker.on('click', () => {
        setSelectedCollegeId(clg.id);
        setMobilePanelOpen(true);
        map.flyTo([clg.latitude!, clg.longitude!], 13, { duration: 0.6 });
      });

      collegeMarkersRef.current.set(clg.id, marker);
    });
  }, [colleges, selectedCollegeId]);

  // Pan to selected college if it changes
  const handleSelectCollege = (clg: College) => {
    setSelectedCollegeId(clg.id);
    setMobilePanelOpen(true);
    if (clg.latitude && clg.longitude && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([clg.latitude, clg.longitude], 13, { duration: 0.6 });
    }
  };

  // Browser Geolocation
  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Please select a campus hub below.');
      setShowLocationPicker(true);
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setSearchCenter({ lat: latitude, lng: longitude });
        setLocationLabel('My Current GPS Location');
        setShowPermissionPrompt(false);
        setShowLocationPicker(false);
        localStorage.setItem('evehub_search_lat', String(latitude));
        localStorage.setItem('evehub_search_lng', String(longitude));
        localStorage.setItem('evehub_search_name', 'My GPS Location');
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        setLocationError(
          err.code === 1
            ? 'Location access was denied. Please choose one of the regional campus hubs below.'
            : 'Unable to retrieve location coordinates. Choose a preset hub below.'
        );
        setShowLocationPicker(true);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Handle Preset Hub Selection
  const selectPresetHub = (hub: CampusHubPreset) => {
    setSearchCenter({ lat: hub.lat, lng: hub.lng });
    setLocationLabel(hub.name);
    setShowLocationPicker(false);
    setShowPermissionPrompt(false);
    localStorage.setItem('evehub_search_lat', String(hub.lat));
    localStorage.setItem('evehub_search_lng', String(hub.lng));
    localStorage.setItem('evehub_search_name', hub.name);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-100">
      {/* Top Controls Bar */}
      <div className="bg-white border-b border-slate-200/90 px-4 py-2.5 z-20 shadow-xs shrink-0">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Location & Recenter Control */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLocationPicker(!showLocationPicker)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/50 text-xs font-medium text-slate-800 transition-colors shadow-2xs"
              >
                <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="font-semibold text-slate-900 truncate max-w-[180px] sm:max-w-[220px]">
                  {locationLabel}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Location Selector Dropdown */}
              {showLocationPicker && (
                <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                      Select Campus Discovery Area
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Geolocation Button */}
                  <div className="py-3 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={requestCurrentLocation}
                      disabled={isLocating}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                      <span>{isLocating ? 'Locating Your Device...' : 'Use My Exact Browser Location'}</span>
                    </button>
                    {locationError && (
                      <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{locationError}</span>
                      </p>
                    )}
                  </div>

                  {/* Search Locality or Campus Hub */}
                  <div className="pt-2.5 pb-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={hubSearchQuery}
                        onChange={(e) => setHubSearchQuery(e.target.value)}
                        placeholder="Search city, locality or campus hub..."
                        className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Regional Campus Hub Presets */}
                  <div className="pt-2.5">
                    <p className="text-[11px] font-medium text-slate-500 mb-2 flex items-center justify-between">
                      <span>Regional Campus Centers:</span>
                      <span className="text-[10px] text-slate-400">Click to center</span>
                    </p>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {REGIONAL_HUBS.filter(h =>
                        !hubSearchQuery.trim() ||
                        h.name.toLowerCase().includes(hubSearchQuery.toLowerCase()) ||
                        h.description.toLowerCase().includes(hubSearchQuery.toLowerCase()) ||
                        h.shortLabel.toLowerCase().includes(hubSearchQuery.toLowerCase())
                      ).map((hub) => (
                        <button
                          key={hub.name}
                          type="button"
                          onClick={() => selectPresetHub(hub)}
                          className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-start justify-between gap-2 ${
                            locationLabel === hub.name
                              ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-900">{hub.name}</div>
                            <div className="text-[10px] text-slate-500">{hub.description}</div>
                          </div>
                          {locationLabel === hub.name && (
                            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={requestCurrentLocation}
              title="Recenter to my location"
              className="p-1.5 rounded-lg border border-slate-200 hover:border-indigo-400 bg-white text-slate-600 hover:text-indigo-600 shadow-2xs transition-colors"
            >
              <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>

          {/* Radius Selector: 30 km vs 50 km (Mandatory Core Feature) */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase px-2 tracking-wide hidden sm:inline">
              Radius:
            </span>
            <button
              type="button"
              onClick={() => {
                setRadiusKm(30);
                updateUrlParams({ radius: '30' });
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                radiusKm === 30
                  ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 km <span className="text-[10px] font-normal opacity-80">(Default)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRadiusKm(50);
                updateUrlParams({ radius: '50' });
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                radiusKm === 50
                  ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              50 km
            </button>
          </div>

          {/* College Type Filtering */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {COLLEGE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setSelectedType(t.value);
                  updateUrlParams({ type: t.value === 'all' ? null : t.value });
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedType === t.value
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search campus..."
              className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Left Side / Collapsible Panel */}
        <div
          className={`w-full md:w-[420px] lg:w-[460px] bg-white border-r border-slate-200 flex flex-col z-10 transition-all duration-300 ${
            mobilePanelOpen
              ? 'absolute md:relative inset-x-0 bottom-0 top-1/3 md:top-0 h-auto md:h-full shadow-2xl md:shadow-none'
              : 'hidden md:flex h-full'
          }`}
        >
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            {selectedCollegeId ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedCollegeId(null);
                  setCollegeDetails(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to nearby campuses ({colleges.length})</span>
              </button>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">
                    Nearby Campus Discovery
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {colleges.length} {colleges.length === 1 ? 'Campus' : 'Campuses'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Within {radiusKm} km of {locationLabel.split('/')[0].trim()}
                </p>
              </div>
            )}

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setMobilePanelOpen(false)}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Panel Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* View A: Selected College Details & Grouped Events */}
            {selectedCollegeId ? (
              loadingDetails ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-xs text-slate-500 font-medium">Loading verified campus events...</p>
                </div>
              ) : collegeDetails ? (
                <div className="space-y-4">
                  {/* College Header Card */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-indigo-100 text-indigo-800 mb-1.5">
                          {collegeDetails.college.college_type || 'Engineering'}
                        </span>
                        <h2 className="font-bold text-base text-slate-900 leading-snug">
                          {collegeDetails.college.name}
                        </h2>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{collegeDetails.college.address || collegeDetails.college.district}</span>
                        </div>
                      </div>
                      {(() => {
                        const dist = colleges.find(c => c.id === collegeDetails.college.id)?.distance_km ?? collegeDetails.college.distance_km;
                        return dist !== undefined && dist !== null ? (
                          <div className="text-right shrink-0">
                            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-extrabold bg-indigo-600 text-white shadow-2xs">
                              {dist} km
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-0.5 font-medium">
                              from search center
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {collegeDetails.college.website && (
                        <a
                          href={collegeDetails.college.website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                        >
                          <span>Official Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {collegeDetails.college.source_url && (
                        <a
                          href={collegeDetails.college.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:underline"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified Provenance</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Event Categorization Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setActiveTab('happening_now')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'happening_now'
                          ? 'bg-white text-rose-700 shadow-2xs border border-rose-100'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                      <span>Live Now</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-extrabold">
                        {collegeDetails.counts.happening_now}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('starting_soon')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'starting_soon'
                          ? 'bg-white text-amber-700 shadow-2xs border border-amber-100'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Soon</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-extrabold">
                        {collegeDetails.counts.starting_soon}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('upcoming')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'upcoming'
                          ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-100'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Upcoming</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-extrabold">
                        {collegeDetails.counts.upcoming}
                      </span>
                    </button>

                    {collegeDetails.counts.past > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('past')}
                        className={`py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all ${
                          activeTab === 'past'
                            ? 'bg-white text-slate-800 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Past ({collegeDetails.counts.past})
                      </button>
                    )}
                  </div>

                  {/* Tab Event Items */}
                  <div className="space-y-3">
                    {/* Live Happening Now Tab */}
                    {activeTab === 'happening_now' && (
                      collegeDetails.happening_now.length > 0 ? (
                        collegeDetails.happening_now.map((evt) => (
                          <EventCardItem key={evt.id} event={evt} isLive={true} />
                        ))
                      ) : (
                        <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <Radio className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <h4 className="font-bold text-xs text-slate-800">
                            No Live Events Happening Right Now
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                            There are currently no active hackathons or symposium sessions in progress at {collegeDetails.college.short_name || collegeDetails.college.name}.
                          </p>
                          {collegeDetails.counts.upcoming > 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveTab('upcoming')}
                              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                            >
                              <span>View {collegeDetails.counts.upcoming} upcoming scheduled events</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )
                    )}

                    {/* Starting Soon Tab */}
                    {activeTab === 'starting_soon' && (
                      collegeDetails.starting_soon.length > 0 ? (
                        collegeDetails.starting_soon.map((evt) => (
                          <EventCardItem key={evt.id} event={evt} isStartingSoon={true} />
                        ))
                      ) : (
                        <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <h4 className="font-bold text-xs text-slate-800">
                            No Events Starting Within 24 Hours
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Browse upcoming events for next week.
                          </p>
                        </div>
                      )
                    )}

                    {/* Upcoming Tab */}
                    {activeTab === 'upcoming' && (
                      collegeDetails.upcoming.length > 0 ? (
                        collegeDetails.upcoming.map((evt) => (
                          <EventCardItem key={evt.id} event={evt} />
                        ))
                      ) : (
                        <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <h4 className="font-bold text-xs text-slate-800">
                            No Upcoming Events Scheduled
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Check back soon or explore other neighboring colleges.
                          </p>
                        </div>
                      )
                    )}

                    {/* Past Tab */}
                    {activeTab === 'past' && (
                      collegeDetails.past.length > 0 ? (
                        collegeDetails.past.map((evt) => (
                          <EventCardItem key={evt.id} event={evt} isPast={true} />
                        ))
                      ) : (
                        <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <p className="text-xs text-slate-500">No past archives available.</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs">
                  College data not found.
                </div>
              )
            ) : (
              /* View B: List of All Nearby Colleges */
              loadingColleges ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-xs text-slate-500 font-medium">Discovering campuses within {radiusKm} km...</p>
                </div>
              ) : colleges.length > 0 ? (
                <div className="space-y-2.5">
                  {colleges.map((clg) => (
                    <div
                      key={clg.id}
                      onClick={() => handleSelectCollege(clg)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                        selectedCollegeId === clg.id
                          ? 'bg-indigo-50/70 border-indigo-400 shadow-xs ring-2 ring-indigo-200'
                          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                              {clg.college_type || 'Engineering'}
                            </span>
                            {clg.verified && (
                              <span title="Verified Campus">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1 truncate">
                            {clg.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {clg.address || clg.district}
                          </p>
                        </div>

                        {/* Distance Badge */}
                        <div className="text-right shrink-0">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-200">
                            {clg.distance_km} km
                          </span>
                        </div>
                      </div>

                      {/* Event Status Badges */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {(clg.live_events_count || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                              <Radio className="w-3 h-3" />
                              <span>{clg.live_events_count} Live Now</span>
                            </span>
                          ) : null}

                          {(clg.upcoming_events_count || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700">
                              <Calendar className="w-3 h-3 text-indigo-500" />
                              <span>{clg.upcoming_events_count} upcoming</span>
                            </span>
                          ) : (clg.live_events_count || 0) === 0 ? (
                            <span className="text-[11px] text-slate-400">No active events</span>
                          ) : null}
                        </div>

                        <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-0.5 hover:underline">
                          <span>Explore</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : apiError ? (
                <div className="p-8 text-center bg-rose-50/60 rounded-xl border border-rose-200">
                  <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                  <h4 className="font-bold text-sm text-rose-900">
                    Failed to Load Nearby Campuses
                  </h4>
                  <p className="text-xs text-rose-700 mt-1 max-w-xs mx-auto">
                    {apiError}
                  </p>
                  <button
                    type="button"
                    onClick={() => fetchNearbyColleges()}
                    className="mt-4 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Retry Discovery</span>
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="font-bold text-sm text-slate-800">
                    No Campuses Found Within {radiusKm} km
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Try expanding the search radius to 50 km, switching the college type filter, or searching another campus hub.
                  </p>
                  {radiusKm === 30 && (
                    <button
                      type="button"
                      onClick={() => setRadiusKm(50)}
                      className="mt-4 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      Expand Radius to 50 km
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Side / Map Surface */}
        <div className="flex-1 relative h-full">
          {/* Map Container */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Map Status Notification */}
          {(tileError || markerError) && (
            <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 z-20 bg-amber-600/95 text-white text-xs font-medium px-3.5 py-2.5 rounded-xl shadow-lg flex items-center justify-between gap-3 max-w-md backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-200" />
                <span>Map visual rendering limited. The campus list and event explorer on the left are fully interactive.</span>
              </div>
              <button
                type="button"
                onClick={() => { setTileError(false); setMarkerError(false); }}
                className="text-amber-200 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Floating Map Legend & Status (Bottom Left) */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md rounded-xl p-3 border border-slate-200/90 shadow-lg hidden sm:block text-xs max-w-xs pointer-events-auto">
            <h5 className="font-bold text-[11px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Map Legend ({radiusKm} km Boundary)</span>
            </h5>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-rose-600 border border-white shadow-2xs animate-pulse"></div>
                <span className="text-slate-700 font-medium">Happening Right Now (Live Beacon)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-indigo-600 border border-white shadow-2xs"></div>
                <span className="text-slate-700 font-medium">Upcoming Events Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-slate-600 border border-white shadow-2xs"></div>
                <span className="text-slate-700 font-medium">College Campus (No active events)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-dashed border-indigo-700"></div>
                <span className="text-slate-700 font-medium">Search Center Origin</span>
              </div>
            </div>
            <p className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
              💡 Tip: Click anywhere on the map to set a new search location.
            </p>
          </div>

          {/* Mobile Bottom Bar (Drawer Toggle) */}
          <div className="md:hidden absolute bottom-4 inset-x-4 z-10">
            <button
              type="button"
              onClick={() => setMobilePanelOpen(!mobilePanelOpen)}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>
                  {selectedCollegeId
                    ? 'View Campus Events'
                    : `Show Nearby Campuses (${colleges.length})`}
                </span>
              </div>
              <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
                {radiusKm} km radius
              </span>
            </button>
          </div>

          {/* Fallback Tile Error Notice */}
          {tileError && (
            <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 z-20 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 shadow-lg max-w-sm flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Offline map tile fallback:</span> OpenStreetMap tiles may take a moment to load under slow networks. All college coordinates and listings remain fully functional.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permission Explanation Banner (First Visit) */}
      {showPermissionPrompt && (
        <div className="fixed bottom-6 right-6 max-w-md z-50 bg-white rounded-2xl border border-indigo-200 shadow-2xl p-5 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                Discover Campuses Near You
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                EveHub calculates geographic distances to colleges within 30 km or 50 km so you can discover live hackathons and events right around your campus.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={requestCurrentLocation}
                  disabled={isLocating}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {isLocating ? 'Locating...' : 'Enable Geolocation'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    selectPresetHub(REGIONAL_HUBS[0]);
                    setShowPermissionPrompt(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Use Sairam / Tambaram Hub
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component: Clean Event Card for College Drawer
interface EventCardItemProps {
  event: Event;
  isLive?: boolean;
  isStartingSoon?: boolean;
  isPast?: boolean;
}

const EventCardItem: React.FC<EventCardItemProps> = ({
  event,
  isLive,
  isStartingSoon,
  isPast
}) => {
  const navigate = useNavigate();

  // Format dates
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <div
      onClick={() => navigate(`/events/${event.id}`)}
      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
        isLive
          ? 'bg-rose-50/40 border-rose-300 hover:border-rose-400 hover:shadow-xs'
          : isStartingSoon
          ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400 hover:shadow-xs'
          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isLive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                <Radio className="w-3 h-3" />
                <span>HAPPENING NOW</span>
              </span>
            ) : isStartingSoon ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                <Clock className="w-3 h-3" />
                <span>STARTING TODAY</span>
              </span>
            ) : null}

            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
              {event.category}
            </span>

            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
              {event.fee === 0 ? 'FREE' : `₹${event.fee}`}
            </span>
          </div>

          <h4 className="font-bold text-sm text-slate-900 mt-1.5 leading-snug line-clamp-2">
            {event.title}
          </h4>
        </div>
      </div>

      {/* Date, Time, Venue */}
      <div className="mt-2.5 space-y-1 text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {formatDate(event.start_date)} • {formatTime(event.start_date)} - {formatTime(event.end_date)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{event.venue}</span>
        </div>
      </div>

      {/* Action footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
        <div className="text-[10px] text-slate-500">
          <span className="font-semibold text-slate-700">{event.registered_count}</span>
          <span> / {event.capacity} registered</span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/events/${event.id}`);
          }}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
            isLive
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
          }`}
        >
          <span>{isLive ? 'Join / View Live' : 'View & Register'}</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
