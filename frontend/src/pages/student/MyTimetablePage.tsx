import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Upload,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { api } from '../../api/client';
import { TimetableEntry, ConflictDetectionResult, Event } from '../../api/types';
import { Modal } from '../../components/common/Modal';
import { ConflictAlert } from '../../components/event/ConflictAlert';
import { useToast } from '../../context/ToastContext';

export const MyTimetablePage: React.FC = () => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Entry Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'class' | 'lab' | 'exam' | 'assignment' | 'other'>('exam');
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('11:00');
  const [newNotes, setNewNotes] = useState('');
  const [adding, setAdding] = useState(false);

  // CSV Import Modal
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  // Live Conflict Checker Sandbox
  const [selectedEventId, setSelectedEventId] = useState('');
  const [testConflictResult, setTestConflictResult] = useState<ConflictDetectionResult | null>(null);
  const [testingConflict, setTestingConflict] = useState(false);

  const toast = useToast();

  const loadTimetable = async () => {
    try {
      const [tt, evs] = await Promise.all([
        api.getTimetable(),
        api.getEvents({ limit: 10 }),
      ]);
      setEntries(tt);
      setEvents(evs.items || []);
      if (evs.items && evs.items.length > 0 && !selectedEventId) {
        setSelectedEventId(evs.items[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDate || !newStartTime || !newEndTime) {
      toast.error('Please fill all required fields');
      return;
    }
    setAdding(true);
    try {
      await api.addTimetableEntry({
        title: newTitle,
        type: newType,
        date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
        notes: newNotes,
      });
      toast.success('Commitment added to timetable!');
      setAddModalOpen(false);
      setNewTitle('');
      setNewNotes('');
      await loadTimetable();
    } catch (err: any) {
      toast.error(err.message || 'Could not add entry');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await api.deleteTimetableEntry(id);
      toast.info('Entry deleted');
      setEntries((prev) => prev.filter((item) => item.id !== id));
    } catch {
      toast.error('Could not delete entry');
    }
  };

  const handleImportCsv = async () => {
    if (!csvText.trim()) {
      toast.error('Please paste CSV content');
      return;
    }
    setImporting(true);
    try {
      const res = await api.importTimetableCsv(csvText);
      setImportResult(res);
      if (res.imported_count > 0) {
        toast.success(`Successfully imported ${res.imported_count} commitments!`);
        await loadTimetable();
      }
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleTestConflict = async () => {
    if (!selectedEventId) return;
    setTestingConflict(true);
    try {
      const res = await api.checkConflict(selectedEventId);
      setTestConflictResult(res);
    } catch (err: any) {
      toast.error(err.message || 'Check failed');
    } finally {
      setTestingConflict(false);
    }
  };

  const sampleCsvTemplate = `title,type,date,start_time,end_time,notes
Operating Systems Mid-Term,exam,2026-10-28,09:00,12:00,Hall 401 Hall Ticket Required
Cloud Computing Lab,lab,2026-10-29,14:00,16:30,Experiment 6 Submission
VLSI Design Lecture,class,2026-10-30,10:00,11:00,Main Auditorium`;

  return (
    <div className="space-y-8">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">
            My Timetable & Conflict Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain your academic exams and labs. EveHub runs interval intersection math to prevent accidental event clashes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCsvText(sampleCsvTemplate);
              setImportResult(null);
              setCsvModalOpen(true);
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Commitment</span>
          </button>
        </div>
      </div>

      {/* Live Conflict Testing Simulator Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Test Schedule Conflict Detector Against Any Event
            </h2>
          </div>
          <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            Deterministic Math
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
          Select an upcoming collegiate event to instantly execute EveHub's conflict algorithm against your enrolled commitments.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-hidden cursor-pointer"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({new Date(e.start_date).toLocaleDateString()} {new Date(e.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </option>
            ))}
          </select>

          <button
            onClick={handleTestConflict}
            disabled={testingConflict || !selectedEventId}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-2xs shrink-0 flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>{testingConflict ? 'Evaluating Intervals...' : 'Check For Overlaps'}</span>
          </button>
        </div>

        {testConflictResult && (
          <div className="pt-2 animate-in fade-in duration-200">
            <ConflictAlert result={testConflictResult} />
          </div>
        )}
      </div>

      {/* Enrolled Timetable Entries */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 font-heading">
            Enrolled Academic Commitments ({entries.length})
          </h2>
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-16 bg-slate-100 rounded-xl" />
            <div className="h-16 bg-slate-100 rounded-xl" />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <Clock className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Your timetable is currently empty
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your examination schedules or upload a CSV to activate automated conflict detection for registrations.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-xs transition-all flex items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      entry.type === 'exam'
                        ? 'bg-rose-100 text-rose-800'
                        : entry.type === 'lab'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {entry.type}
                    </span>
                    <span className="font-semibold text-slate-900 text-sm">{entry.title}</span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {entry.date}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {entry.start_time} - {entry.end_time}
                    </span>
                    {entry.notes && (
                      <span className="text-slate-400 italic truncate max-w-xs">
                        {entry.notes}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Delete Entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Academic Commitment"
        subtitle="Used for automatic conflict detection during registration"
        maxWidth="md"
      >
        <form onSubmit={handleAddEntry} className="space-y-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">Commitment Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Distributed Systems Final Exam"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 text-slate-900 bg-slate-50/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-700 block mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-hidden bg-slate-50/50 cursor-pointer"
              >
                <option value="exam">Examination</option>
                <option value="lab">Lab Assessment</option>
                <option value="class">Mandatory Class</option>
                <option value="assignment">Project Review</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">Date</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-hidden bg-slate-50/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-700 block mb-1">Start Time (24h)</label>
              <input
                type="time"
                required
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-hidden bg-slate-50/50"
              />
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">End Time (24h)</label>
              <input
                type="time"
                required
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-hidden bg-slate-50/50"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1">Notes / Hall (Optional)</label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Hall 302, Dept of CSE"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-hidden bg-slate-50/50"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              {adding ? 'Saving...' : 'Save Commitment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal with Preview and Error Reporting */}
      <Modal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        title="Import Timetable from CSV"
        subtitle="Upload or paste academic schedule in CSV format"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">
              CSV Content (Headers: title,type,date,start_time,end_time,notes)
            </label>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full font-mono text-[11px] p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-hidden focus:border-indigo-500"
            />
          </div>

          {importResult && (
            <div className="space-y-2">
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-900">
                  <span className="font-semibold block mb-1">Validation Errors:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {importResult.errors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {importResult.imported_entries && importResult.imported_entries.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-900">
                  <span className="font-semibold block mb-1">
                    Successfully Imported {importResult.imported_entries.length} Rows:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {importResult.imported_entries.map((item: any, i: number) => (
                      <span key={i} className="bg-white border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                        {item.title} ({item.date})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex gap-3">
            <button
              onClick={() => setCsvModalOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors"
            >
              Done
            </button>
            <button
              disabled={importing}
              onClick={handleImportCsv}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              {importing ? 'Importing Rows...' : 'Confirm & Import CSV'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
