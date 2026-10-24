import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  Clock,
  RotateCcw,
  Sparkles,
  Camera,
  CameraOff,
  Video,
  UserCheck
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../api/client';
import { Event, EventRegistration } from '../../api/types';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

export const AttendancePage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [registrants, setRegistrants] = useState<EventRegistration[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attended' | 'registered'>('all');
  const [loading, setLoading] = useState(true);

  // Scan Mode: 'camera' vs 'manual'
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // QR Token manual check-in input
  const [tokenInput, setTokenInput] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any>(null);

  // Team Check-in Modal
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamData, setTeamData] = useState<any | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [confirmingTeam, setConfirmingTeam] = useState(false);

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

  const processCheckin = async (rawToken: string) => {
    const token = rawToken.trim();
    if (!token) return;
    setCheckingIn(true);
    try {
      const res = await api.checkinAttendee(token, false, 'attended');
      setLastScanResult(res);

      if (res.is_team) {
        setTeamData(res);
        const eligible = (res.members || [])
          .filter((m: any) => m.eligible)
          .map((m: any) => m.registration_id);
        setSelectedMemberIds(eligible);
        setTeamModalOpen(true);
        toast.info(`Team pass detected: ${res.team_name}. Review members to verify.`);
      } else if (res.already_checked_in) {
        toast.info(res.message);
      } else {
        toast.success(res.message);
      }

      setTokenInput('');
      // Refresh attendee ledger
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

  const handleCheckinToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    await processCheckin(tokenInput);
  };

  const startCamera = async (cameraId?: string) => {
    setCameraError(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError('No active camera detected. Please use manual token entry.');
        return;
      }
      setCameras(devices);
      const targetCam = cameraId || selectedCameraId || devices[0].id;
      setSelectedCameraId(targetCam);

      const scanner = new Html5Qrcode('evehub-qr-reader');
      html5QrCodeRef.current = scanner;

      await scanner.start(
        targetCam,
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;
          await processCheckin(decodedText);
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 2000);
        },
        () => {
          // ignore frame decode misses
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error(err);
      setCameraError(err.message || 'Camera permission denied or camera device unavailable.');
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          html5QrCodeRef.current?.clear();
        });
      }
    };
  }, []);

  const handleConfirmTeamCheckin = async () => {
    if (!selectedMemberIds.length || !teamData) return;
    setConfirmingTeam(true);
    try {
      const res = await api.teamCheckin(teamData.event_id || selectedEventId, selectedMemberIds);
      toast.success(res.message);
      setTeamModalOpen(false);
      setTeamData(null);
      if (selectedEventId) {
        const regs = await api.getEventRegistrants(selectedEventId);
        setRegistrants(regs);
      }
    } catch (err: any) {
      toast.error(err.message || 'Team check-in failed');
    } finally {
      setConfirmingTeam(false);
    }
  };

  const handleManualToggle = async (reg: EventRegistration) => {
    const nextStatus = reg.attendance_status === 'attended' ? 'registered' : 'attended';
    try {
      await api.checkinAttendee(reg.id, true, nextStatus);
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
      (r.qr_checkin_token && r.qr_checkin_token.toLowerCase().includes(search.toLowerCase())) ||
      (r.team_name && r.team_name.toLowerCase().includes(search.toLowerCase()));
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
            Live camera QR scanning, bulk team check-in, duplicate protection & verified attendance minting
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

      {/* QR Scanner & Verification Console */}
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
              Scan attendee QR passes using your camera or enter verification codes manually for atomic gate check-in.
            </p>
          </div>

          <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Verified Attendees</span>
              <span className="text-base font-bold text-emerald-400">
                {totalAttended} / {registrants.length}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-700" />
            <div>
              <span className="text-slate-400 block text-[10px]">Turnout Rate</span>
              <span className="text-base font-bold text-white">{attendanceRate}%</span>
            </div>
          </div>
        </div>

        {/* Scan Mode Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => {
              setScanMode('camera');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
              scanMode === 'camera'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Camera Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setScanMode('manual');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
              scanMode === 'manual'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Manual Token Entry</span>
          </button>
        </div>

        {/* Camera Viewfinder View */}
        {scanMode === 'camera' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                {cameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedCameraId(newId);
                      if (isScanning) {
                        stopCamera().then(() => startCamera(newId));
                      }
                    }}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-hidden"
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Camera ${c.id.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                )}

                {isScanning ? (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="bg-rose-600/90 hover:bg-rose-600 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <CameraOff className="w-4 h-4" />
                    <span>Stop Camera</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Camera Scanner</span>
                  </button>
                )}
              </div>

              {isScanning && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Camera Active — Hold QR pass in front of lens</span>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Video Scanner Element */}
            <div className={`relative bg-slate-950 rounded-2xl border border-slate-800 p-2 overflow-hidden max-w-sm mx-auto ${!isScanning ? 'hidden' : ''}`}>
              <div id="evehub-qr-reader" className="w-full rounded-xl overflow-hidden" />
              {checkingIn && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center text-white text-xs font-semibold gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Token...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual Token Entry Form */}
        {scanMode === 'manual' && (
          <form onSubmit={handleCheckinToken} className="flex gap-2">
            <div className="flex-1 flex items-center gap-3 bg-slate-800 rounded-2xl border border-slate-700 px-4 py-3 text-white">
              <QrCode className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                required
                placeholder="Type or paste token e.g. EVH-CHK-XXXX or EVH-TEAM-XXXX..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full text-xs sm:text-sm bg-transparent outline-hidden font-mono tracking-wider placeholder:text-slate-500 uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={checkingIn}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-6 py-3 rounded-2xl transition-colors shadow-sm shrink-0 flex items-center gap-2"
            >
              {checkingIn ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify Entry</span>
              )}
            </button>
          </form>
        )}

        {/* Scan outcome feedback card */}
        {lastScanResult && !lastScanResult.is_team && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-in fade-in duration-150 ${
              lastScanResult.already_checked_in
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                : lastScanResult.success
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
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

      {/* Team Check-in Confirmation Modal */}
      <Modal
        isOpen={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        title={`Team Attendance Verification: ${teamData?.team_name || 'Team'}`}
        subtitle={`Select eligible members to mark attendance for ${teamData?.team_name}`}
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-indigo-900">
            <div>
              <span className="font-bold text-xs">Team ID: {teamData?.team_id}</span>
              <span className="text-[11px] text-indigo-700 block mt-0.5">
                Total Members: {teamData?.total_members} • Eligible for Check-in: {teamData?.eligible_count}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const eligible = (teamData?.members || [])
                  .filter((m: any) => m.eligible)
                  .map((m: any) => m.registration_id);
                setSelectedMemberIds(eligible);
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
            >
              Select All Eligible
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {(teamData?.members || []).map((m: any) => {
              const isSelected = selectedMemberIds.includes(m.registration_id);
              return (
                <div
                  key={m.registration_id}
                  className={`p-3 flex items-center justify-between transition-colors ${
                    !m.eligible ? 'bg-slate-50 opacity-70' : isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      disabled={!m.eligible}
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMemberIds([...selectedMemberIds, m.registration_id]);
                        } else {
                          setSelectedMemberIds(selectedMemberIds.filter((id) => id !== m.registration_id));
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">{m.student_name}</span>
                      <span className="text-slate-500 text-[11px] block">{m.student_email} • {m.student_college || 'Student'}</span>
                    </div>
                  </div>

                  <div>
                    {m.attendance_status === 'attended' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Already Checked In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-medium">
                        Eligible
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTeamModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={confirmingTeam || selectedMemberIds.length === 0}
              onClick={handleConfirmTeamCheckin}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-colors shadow-xs flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {confirmingTeam
                  ? 'Confirming...'
                  : `Check In Selected Members (${selectedMemberIds.length})`}
              </span>
            </button>
          </div>
        </div>
      </Modal>

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
                <th className="pb-3">QR Pass / Team</th>
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
                  <td className="py-3">
                    <div className="font-mono font-medium text-indigo-700">
                      {reg.qr_checkin_token || 'N/A'}
                    </div>
                    {reg.team_name && (
                      <div className="text-[10px] text-purple-700 font-sans font-medium flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{reg.team_name}</span>
                      </div>
                    )}
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
