import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarPlus,
  Calendar,
  QrCode,
  MessageSquare,
  Award,
  Settings,
  Building,
  ShieldCheck
} from 'lucide-react';
import { OrganizerNavbar } from '../common/OrganizerNavbar';
import { Footer } from '../common/Footer';
import { useAuth } from '../../context/AuthContext';

export const OrganizerLayout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { label: 'Organizer Overview', path: '/organizer/dashboard', icon: LayoutDashboard },
    { label: 'My Managed Events', path: '/organizer/events', icon: Calendar },
    { label: 'Create New Event', path: '/organizer/create-event', icon: CalendarPlus },
    { label: 'Attendance & QR Check-in', path: '/organizer/attendance', icon: QrCode },
    { label: 'Student Questions & Q&A', path: '/organizer/questions', icon: MessageSquare },
    { label: 'Certificate Management', path: '/organizer/certificates', icon: Award },
    { label: 'Logistics & Settings', path: '/organizer/logistics', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <OrganizerNavbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Organizer Sidebar */}
          <aside className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs sticky top-24">
              {/* Organizer credentials card */}
              <div className="pb-4 mb-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-slate-900 truncate">
                    {user?.display_name || 'Convener'}
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                    <Building className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="truncate">{user?.college_name || 'Anna University CEG'}</span>
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
                          ? 'bg-slate-900 text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Verified Authority Pill */}
              <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Verified Institutional Admin</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Authorized to issue tamper-proof certificates & scan attendance.
                </p>
              </div>
            </div>
          </aside>

          {/* Organizer Content Area */}
          <section className="lg:col-span-9">
            <Outlet />
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};
