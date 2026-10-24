import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  Bookmark,
  Award,
  Bell,
  User,
  Compass,
  GraduationCap,
  MapPin
} from 'lucide-react';
import { Navbar } from '../common/Navbar';
import { Footer } from '../common/Footer';
import { useAuth } from '../../context/AuthContext';

export const StudentLayout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { label: 'Overview', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Explore Nearby Map', path: '/explore', icon: MapPin },
    { label: 'Discover Events', path: '/events', icon: Compass },
    { label: 'My Registrations', path: '/student/registrations', icon: CalendarDays },
    { label: 'My Timetable', path: '/student/timetable', icon: Clock },
    { label: 'Saved Events', path: '/student/saved', icon: Bookmark },
    { label: 'Certificates & History', path: '/student/certificates', icon: Award },
    { label: 'Notifications', path: '/student/notifications', icon: Bell },
    { label: 'Profile & College', path: '/student/profile', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Student Sidebar */}
          <aside className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs sticky top-24">
              {/* Student identity card */}
              <div className="pb-4 mb-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                  {user?.display_name?.charAt(0) || 'S'}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-slate-900 truncate">
                    {user?.display_name || 'Student Portal'}
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                    <GraduationCap className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="truncate">{user?.college_name || 'SSN College'}</span>
                  </div>
                </div>
              </div>

              {/* Navigation items */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Conflict Engine Badge */}
              <div className="mt-6 pt-4 border-t border-slate-100 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/60">
                <div className="text-[11px] font-semibold text-indigo-950 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Timetable Guard</span>
                </div>
                <p className="text-[11px] text-indigo-700/80 mt-1 leading-snug">
                  Automatic conflict check active before event registration.
                </p>
              </div>
            </div>
          </aside>

          {/* Student Content Area */}
          <section className="lg:col-span-9">
            <Outlet />
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};
