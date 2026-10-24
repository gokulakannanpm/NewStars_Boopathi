import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  Clock,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { api } from '../../api/client';
import { Event, EventRegistration } from '../../api/types';
import { useToast } from '../../context/ToastContext';

export const AttendancePage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [registrants, setRegistrants] = useState<EventRegistration[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attended' | 'registered'>('all');
  const [loading, setLoading] = useState(true);

  // QR Token manual check-in input
  const [tokenInput, setTokenInput] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any>(null);

  const toast = useToast();

  const loadData = async () => {
    try {
      const res = await api.getEvents({ limit: 20 });
      const items = res.items || [];
      setEvents(items);
      if (items.length > 0) {
        const targetId = selectedEventId || items[0].id;
        setSelectedEventId(targetId);
        const regs = await api.getEventRegistrants(targetId);
        setRegistrants(regs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectEvent = async (id: string) => {
    setSelectedEventId(id);
    setLoading(true);
    setLastScanResult(null);
    try {
      const regs = await api.getEventRegistrants(id);
      setRegistrants(regs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckinToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setCheckingIn(true);
    try {
      const res = await api.checkinAttendee(tokenInput.trim(), false, 'attended');
      setLastScanResult(res);
      if (res.already_checked_in) {
        toast.info(res.message);
      } else {
        toast.success(res.message);
      }
      setTokenInput('');
      // Refresh registrants
      if (selectedEventId) {
        const regs = await api.getEventRegistrants(selectedEventId);
        setRegistrants(regs);
      }
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
      setLastScanResult({ success: false, message: err.message });
    } finally {
      setCheckingIn(false);
    }
  };

  const handleManualToggle = async (reg: EventRegistration) => {
    const nextStatus = reg.attendance_status === 'attended' ? 'registered' : 'attended';
    try {
      const res = await api.checkinAttendee(reg.id, true, nextStatus);
      toast.success(`Updated attendance for ${reg.student_name}`);
      if (selectedEventId) {
        const regs = await api.getEventRegistrants(selectedEventId);
        setRegistrants(regs);
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not update status');
    }
  };

  const filteredRegistrants = registrants.filter((r) => {
    const matchSearch =
      r.student_name.toLowerCase().includes(search.toLowerCase()) ||
      r.student_email.toLowerCase().includes(search.toLowerCase()) ||
      (r.qr_checkin_token && r.qr_checkin_token.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || r.attendance_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalAttended = registrants.filter((r) => r.attendance_status === 'attended').length;
  const attendanceRate = registrants.length > 0 ? Math.round((totalAttended / registrants.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Title & Event Picker */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">
            On-Venue Attendance & Check-in Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Scan attendee QR tokens, prevent duplicate entries, and mint attendance records
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Active Event:</span>
          <select
            value={selectedEventId}
            onChange={(e) => handleSelectEvent(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-hidden focus:border-indigo-500 shadow-2xs max-w-xs truncate cursor-pointer"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* QR Scanner / Fast-Entry Input Console */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold font-heading text-white">
                Live QR Token Scanner & Verification Console
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Scan barcode / QR pass or type token code (e.g. EVH-CHK-XXXX) for zero-trust gate validation.
            </p>
          </div>

          <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Verified Attendees</span>
              <span className="text-base font-bold text-emerald-400">{totalAttended} / {registrants.length}</span>
            </div>
            <div className="h-6 w-px bg-slate-700" />
            <div>
              <span className="text-slate-400 block text-[10px]">Turnout Rate</span>
              <span className="text-base font-bold text-white">{attendanceRate}%</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleCheckinToken} className="flex gap-2">
          <div className="flex-1 flex items-center gap-3 bg-slate-800 rounded-2xl border border-slate-700 px-4 py-3 text-white">
            <QrCode className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              required
              placeholder="Scan QR code or enter token e.g. EVH-CHK-KURUKS-9081..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full text-xs sm:text-sm bg-transparent outline-hidden font-mono tracking-wider placeholder:text-slate-500 uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={checkingIn}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-6 py-3 rounded-2xl transition-colors shadow-sm shrink-0"
          >
            {checkingIn ? 'Verifying...' : 'Verify Entry'}
          </button>
        </form>

        {/* Scan feedback card */}
        {lastScanResult && (
          <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-in fade-in duration-150 ${
            lastScanResult.already_checked_in
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              : lastScanResult.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}>
            {lastScanResult.already_checked_in ? (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : lastScanResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <span className="font-semibold block">{lastScanResult.message}</span>
              {lastScanResult.student_name && (
                <span className="text-slate-300 block text-[11px]">
                  Participant: <strong>{lastScanResult.student_name}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Registrants Table & Audit Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Registered Attendee Ledger ({registrants.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time attendance statuses with operator override audit tracking
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-1.5 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter attendees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent outline-hidden text-slate-900 text-xs w-36"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-hidden cursor-pointer"
            >
              <option value="all">All Registrants</option>
              <option value="attended">Attended Only</option>
              <option value="registered">Registered / Pending</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="pb-3">Attendee Name</th>
                <th className="pb-3">Institution & Dept</th>
                <th className="pb-3">QR Token</th>
                <th className="pb-3">Registration Status</th>
                <th className="pb-3">Verified Attendance</th>
                <th className="pb-3 text-right">Gate Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRegistrants.map((reg) => (
                <tr key={reg.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 font-semibold text-slate-900">
                    <div>{reg.student_name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{reg.student_email}</div>
                  </td>
                  <td className="py-3 text-slate-500">
                    <div>{reg.student_college || 'SSN CE'}</div>
                    <div className="text-[10px] text-slate-400">{reg.student_department}</div>
                  </td>
                  <td className="py-3 font-mono font-medium text-indigo-700">
                    {reg.qr_checkin_token || 'N/A'}
                  </td>
                  <td className="py-3">
                    <span className="capitalize font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                      {reg.registration_status}
                    </span>
                  </td>
                  <td className="py-3">
                    {reg.attendance_status === 'attended' ? (
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Attended
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Not Checked In</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleManualToggle(reg)}
                      className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-colors ${
                        reg.attendance_status === 'attended'
                          ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                      }`}
                    >
                      {reg.attendance_status === 'attended' ? 'Mark Absent' : 'Check In'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
