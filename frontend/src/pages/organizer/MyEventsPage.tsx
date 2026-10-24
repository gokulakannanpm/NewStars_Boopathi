import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Plus, Users, QrCode, ExternalLink, Trash2, Edit } from 'lucide-react';
import { api } from '../../api/client';
import { Event } from '../../api/types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CategoryBadge } from '../../components/common/CategoryBadge';
import { useToast } from '../../context/ToastContext';

export const MyEventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchEvents = async () => {
    try {
      const res = await api.getEvents({ limit: 50 });
      setEvents(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCancelEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to mark this event as Cancelled?')) return;
    try {
      await api.cancelEvent(id);
      toast.success('Event status updated to Cancelled');
      await fetchEvents();
    } catch {
      toast.error('Could not cancel event');
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">
            My Managed Events
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active competitions, symposiums, and masterclasses under your institutional administration
          </p>
        </div>

        <Link
          to="/organizer/create-event"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Event</span>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-28 bg-white rounded-2xl border border-slate-200" />
          <div className="h-28 bg-white rounded-2xl border border-slate-200" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3 shadow-xs">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 font-heading">
            No events published yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Publish your first inter-collegiate symposium or hackathon to begin collecting verified registrations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-indigo-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <CategoryBadge category={evt.category} />
                  <StatusBadge status={evt.status} />
                  <span className="text-[11px] text-slate-400 capitalize">• {evt.format} format</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 font-heading">
                  {evt.title}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span>Start: {new Date(evt.start_date).toLocaleDateString()}</span>
                  <span>Venue: {evt.venue}</span>
                  <span>Fee: {evt.fee === 0 ? 'Free' : `₹${evt.fee}`}</span>
                  <span className="font-semibold text-slate-700">
                    Registrations: {evt.registered_count} / {evt.capacity}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <Link
                  to="/organizer/attendance"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan Attendance</span>
                </Link>

                <Link
                  to={`/events/${evt.id}`}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Public View</span>
                </Link>

                {evt.status !== 'cancelled' && (
                  <button
                    onClick={() => handleCancelEvent(evt.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Cancel Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
