import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  LayoutDashboard,
  Calendar,
  CalendarPlus,
  QrCode,
  MessageSquare,
  Award,
  Settings,
  ShieldCheck,
  Building,
  Bell,
  LogOut,
  ExternalLink,
  Menu,
  X,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { NotificationItem } from '../../api/types';

export const OrganizerNavbar: React.FC = () => {
  const { user, role, switchDemoRole, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      api.getNotifications().then(setNotifications).catch(() => {});
    }
  }, [user, location.pathname]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    for (const n of notifications.filter((item) => !item.read)) {
      await api.markNotificationRead(n.id).catch(() => {});
    }
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const handleSignOut = () => {
    logout();
    navigate('/signin');
  };

  const navLinks = [
    { label: 'Overview', path: '/organizer/dashboard', icon: LayoutDashboard },
    { label: 'Events', path: '/organizer/events', icon: Calendar },
    { label: 'Create Event', path: '/organizer/create-event', icon: CalendarPlus },
    { label: 'Attendance & QR', path: '/organizer/attendance', icon: QrCode },
    { label: 'Q&A', path: '/organizer/questions', icon: MessageSquare },
    { label: 'Certificates', path: '/organizer/certificates', icon: Award },
    { label: 'Logistics', path: '/organizer/logistics', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Banner: Organizer Security & Perspective Switcher */}
      <div className="bg-slate-900 text-white px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300 font-medium">Organizer Administration:</span>
            <span className="font-semibold text-white truncate">
              {user?.display_name || 'Dr. Arun Kumar'} ({user?.college_name || 'CEG, Anna University'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 hidden sm:inline">Perspective:</span>
            <button
              onClick={() => switchDemoRole('student')}
              className={`px-2.5 py-0.5 rounded-md font-medium text-[11px] transition-colors ${
                role === 'student'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Switch to Student View
            </button>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-emerald-500/30 hidden md:inline">
              Verified Convener
            </span>
          </div>
        </div>
      </div>

      {/* Main Organizer Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Identifier */}
          <div className="flex items-center gap-6">
            <Link to="/organizer/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs group-hover:bg-slate-800 transition-colors">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1 font-heading">
                  Eve<span className="text-indigo-600">Hub</span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded-md ml-1 border border-slate-200">
                    Organizer
                  </span>
                </span>
                <span className="block text-[10px] text-slate-400 font-medium -mt-1">
                  Institutional Control Center
                </span>
              </div>
            </Link>

            {/* Desktop Organizer Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      active
                        ? 'text-white bg-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Area */}
          <div className="flex items-center gap-3">
            {/* Direct Link to Public Verifier */}
            <Link
              to="/verify-certificate"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Open Public Credential Verifier"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Verifier</span>
            </Link>

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="font-semibold text-sm text-slate-900">Organizer Alerts</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No alerts at this time.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl text-xs transition-colors ${
                            n.read ? 'bg-slate-50 text-slate-600' : 'bg-indigo-50/60 text-slate-900 font-medium'
                          }`}
                        >
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                            {n.title}
                          </div>
                          <p className="mt-0.5 text-slate-600 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Organizer User Badge & Sign Out */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <span className="block text-xs font-semibold text-slate-900 leading-tight">
                  {user?.display_name || 'Dr. Arun Kumar'}
                </span>
                <span className="block text-[10px] text-slate-500 leading-tight">
                  {user?.department || 'CSE Dept'}
                </span>
              </div>

              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Sign out of Organizer Console"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-1">
          <div className="px-3 py-2 bg-slate-50 rounded-xl mb-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-900 block">{user?.display_name || 'Dr. Arun Kumar'}</span>
            <span>{user?.college_name || 'CEG, Anna University'}</span>
          </div>

          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium ${
                  active ? 'bg-slate-900 text-white font-semibold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-100 mt-2 flex flex-col gap-2">
            <Link
              to="/verify-certificate"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 py-2 rounded-xl"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Credential Verifier</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 py-2 rounded-xl"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
