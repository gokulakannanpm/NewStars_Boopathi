import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Award, Clock, Users, ArrowRight } from 'lucide-react';
import { api } from '../../api/client';
import { NotificationItem } from '../../api/types';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id: string) => {
    await api.markNotificationRead(id).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'certificate':
        return <Award className="w-4 h-4 text-emerald-600" />;
      case 'waitlist':
        return <Users className="w-4 h-4 text-sky-600" />;
      case 'answer':
        return <CheckCircle2 className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 font-heading">
          Notifications & Activity Alerts
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time updates regarding registrations, timetable warnings, Q&A responses, and certificates
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 bg-white rounded-2xl border border-slate-200" />
          <div className="h-16 bg-white rounded-2xl border border-slate-200" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3 shadow-xs">
          <Bell className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 font-heading">
            No notifications yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You're all caught up! New event updates and certificate releases will be delivered here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && handleMarkRead(n.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                n.read
                  ? 'bg-white border-slate-200 text-slate-600'
                  : 'bg-indigo-50/50 border-indigo-200 shadow-2xs text-slate-900'
              }`}
            >
              <div className="p-2 rounded-xl bg-white border border-slate-200 shrink-0">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-xs text-slate-900">{n.title}</h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
              </div>

              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 mt-2 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
