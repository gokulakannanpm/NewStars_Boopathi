import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Compass,
  Building2,
  Calendar,
  CheckCircle2,
  Bell,
  Menu,
  X,
  UserCheck,
  ShieldAlert,
  ChevronDown,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { NotificationItem } from '../../api/types';

export const Navbar: React.FC = () => {
  const { user, role, switchDemoRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const location = useLocation();

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

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Banner: Quick Role Switcher for seamless evaluation */}
      <div className="bg-slate-900 text-white px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300 font-medium">Demo Mode Active:</span>
            <span className="font-semibold text-white">
              {role === 'organizer'
                ? 'Organizer Portal (Dr. Arun Kumar, CEG)'
                : 'Student Portal (Gokul Kannan, SSN)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 hidden sm:inline">Switch Perspective:</span>
            <button
              onClick={() => switchDemoRole('student')}
              className={`px-2.5 py-0.5 rounded-md font-medium text-[11px] transition-colors ${
                role === 'student'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Student View
            </button>
            <button
              onClick={() => switchDemoRole('organizer')}
              className={`px-2.5 py-0.5 rounded-md font-medium text-[11px] transition-colors ${
                role === 'organizer'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Organizer View
            </button>
          </div>
        </div>
      </div>

      {/* Main Public / Unified Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1 font-heading">
                Eve<span className="text-indigo-600">Hub</span>
              </span>
              <span className="block text-[10px] text-slate-500 font-medium tracking-wide -mt-1">
                Unified Collegiate Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              to="/events"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/events')
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Discover Events
            </Link>

            <Link
              to="/colleges"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/colleges')
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Colleges
            </Link>

            <Link
              to="/verify-certificate/EVH-2026-IIT099"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/verify-certificate')
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Verify Certificate
            </Link>

            <Link
              to="/about"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/about')
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              About
            </Link>

            <Link
              to="/help"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/help')
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Help & FAQ
            </Link>
          </nav>

          {/* Right Area: Notifications + App Entry Button */}
          <div className="flex items-center gap-3">
            {/* Notifications Menu */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification popover */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="font-semibold text-sm text-slate-900">Notifications</span>
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
                      <p className="text-xs text-slate-400 py-4 text-center">No notifications yet.</p>
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

            {/* Direct Dashboard Entry based on role */}
            {role === 'organizer' ? (
              <Link
                to="/organizer/dashboard"
                className="hidden sm:inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-xs transition-all"
              >
                <span>Organizer Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/student/dashboard"
                className="hidden sm:inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-xs transition-all"
              >
                <span>Student Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-6 space-y-2">
          <Link
            to="/events"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Discover Events
          </Link>
          <Link
            to="/colleges"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Colleges
          </Link>
          <Link
            to="/verify-certificate/EVH-2026-IIT099"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Verify Certificate
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            About
          </Link>
          <Link
            to="/help"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Help & FAQ
          </Link>
          <div className="pt-2 border-t border-slate-100">
            {role === 'organizer' ? (
              <Link
                to="/organizer/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center block bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm"
              >
                Go to Organizer Dashboard
              </Link>
            ) : (
              <Link
                to="/student/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center block bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm"
              >
                Go to Student Dashboard
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
