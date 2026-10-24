import React, { useState, useEffect } from 'react';
import { Bookmark, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Event } from '../../api/types';
import { EventCard } from '../../components/common/EventCard';
import { EventCardSkeleton } from '../../components/common/LoadingSkeleton';

export const SavedEventsPage: React.FC = () => {
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = async () => {
    try {
      const res = await api.getSavedEvents();
      setSavedEvents(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const handleBookmarkToggle = (eventId: string, saved: boolean) => {
    if (!saved) {
      setSavedEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 font-heading">
          Saved & Bookmarked Events
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Competitions and workshops you've earmarked for future registration
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      ) : savedEvents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-4 shadow-xs">
          <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 font-heading">
            No saved events yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Click the bookmark icon on any event card to save it here for quick access later.
          </p>
          <Link
            to="/events"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-2xs"
          >
            Discover Events
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedEvents.map((evt) => (
            <EventCard
              key={evt.id}
              event={evt}
              isSavedInitial={true}
              onBookmarkToggle={handleBookmarkToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};
