import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Bus, Bookmark, Users, ExternalLink } from 'lucide-react';
import { Event } from '../../api/types';
import { CategoryBadge } from './CategoryBadge';
import { StatusBadge } from './StatusBadge';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

interface EventCardProps {
  event: Event;
  isSavedInitial?: boolean;
  onBookmarkToggle?: (eventId: string, saved: boolean) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isSavedInitial = false,
  onBookmarkToggle,
}) => {
  const [isSaved, setIsSaved] = useState(isSavedInitial);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    try {
      if (isSaved) {
        await api.unsaveEvent(event.id);
        setIsSaved(false);
        toast.info('Event removed from saved list');
        onBookmarkToggle?.(event.id, false);
      } else {
        await api.saveEvent(event.id);
        setIsSaved(true);
        toast.success('Event saved to your bookmarks!');
        onBookmarkToggle?.(event.id, true);
      }
    } catch {
      toast.error('Could not update saved status');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const seatsLeft = Math.max(0, event.capacity - event.registered_count);
  const fillPercent = Math.min(100, Math.round((event.registered_count / event.capacity) * 100));

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden relative">
      {/* Poster / Image Header */}
      <div className="relative h-44 w-full bg-slate-900 overflow-hidden shrink-0">
        <img
          src={
            event.poster_url ||
            'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'
          }
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 opacity-90 group-hover:opacity-100"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

        {/* Category & Status overlay */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
          <CategoryBadge category={event.category} />
        </div>

        {/* Bookmark action */}
        <button
          onClick={handleBookmark}
          disabled={saving}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-colors ${
            isSaved
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white/80 hover:bg-white text-slate-700'
          }`}
          title={isSaved ? 'Remove Bookmark' : 'Save Event'}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        {/* Transport & Format indicator pills at bottom of poster */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 font-medium">
            <span className="capitalize">{event.format} Event</span>
            {event.has_transport && (
              <span className="flex items-center gap-1 text-emerald-300 border-l border-white/20 pl-1.5">
                <Bus className="w-3 h-3" /> Shuttle
              </span>
            )}
          </div>
          <div className="bg-slate-900/80 backdrop-blur-md px-2.5 py-0.5 rounded-md font-semibold text-white border border-white/10">
            {event.fee === 0 ? 'Free Entry' : `₹${event.fee}`}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-xs font-medium text-indigo-700 mb-1 flex items-center gap-1 line-clamp-1">
            <span>{event.college_name}</span>
          </div>

          <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {event.title}
          </h3>

          <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Logistics metadata */}
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium truncate">{formatDate(event.start_date)}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>

          {/* Capacity Progress Bar */}
          <div className="pt-1">
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {event.registered_count} / {event.capacity} registered
              </span>
              <span
                className={`font-semibold ${
                  seatsLeft <= 5 ? 'text-amber-600' : 'text-slate-600'
                }`}
              >
                {seatsLeft === 0 ? 'Full' : `${seatsLeft} seats left`}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  fillPercent >= 100
                    ? 'bg-rose-500'
                    : fillPercent >= 80
                    ? 'bg-amber-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer Card Actions */}
        <div className="mt-4 pt-3 flex items-center justify-between">
          <StatusBadge status={event.status} />

          <Link
            to={`/events/${event.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors py-1 px-2.5 rounded-lg hover:bg-indigo-50"
          >
            <span>Details</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
