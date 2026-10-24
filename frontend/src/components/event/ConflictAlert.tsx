import React from 'react';
import { AlertTriangle, CheckCircle, HelpCircle, Clock } from 'lucide-react';
import { ConflictDetectionResult } from '../../api/types';

interface ConflictAlertProps {
  result: ConflictDetectionResult;
  onAcknowledge?: () => void;
  acknowledged?: boolean;
}

export const ConflictAlert: React.FC<ConflictAlertProps> = ({
  result,
  onAcknowledge,
  acknowledged = false,
}) => {
  if (result.status === 'no_conflict') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">No Timetable Conflicts Detected</h4>
            <p className="mt-0.5 text-xs text-emerald-700 leading-relaxed">
              {result.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === 'unknown') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-800">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Schedule Check Inconclusive</h4>
            <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
              {result.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Conflict Detected
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-amber-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-amber-900">
              Timetable Conflict Detected!
            </h4>
            <span className="text-xs font-semibold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
              {result.conflicting_entries.length} Overlapping Commitment(s)
            </span>
          </div>

          <p className="mt-1 text-xs text-amber-800 leading-relaxed">
            This event overlaps with existing commitments in your student timetable:
          </p>

          {/* List of overlapping commitments */}
          <ul className="mt-2 space-y-1.5 bg-white/70 rounded-lg p-2.5 border border-amber-200">
            {result.conflicting_entries.map((entry, idx) => (
              <li key={idx} className="text-xs text-slate-800 flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900">{entry.title}</span>
                  <span className="text-slate-500 block text-[11px]">
                    Date: {entry.date} | Schedule: {entry.start_time} - {entry.end_time} ({entry.overlap_minutes} mins overlap)
                  </span>
                  {entry.notes && (
                    <span className="text-slate-400 italic text-[10px] block">
                      Note: {entry.notes}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {onAcknowledge && (
            <div className="mt-3 pt-2 border-t border-amber-200 flex items-center gap-2">
              <input
                type="checkbox"
                id="ack-conflict"
                checked={acknowledged}
                onChange={onAcknowledge}
                className="rounded border-amber-400 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="ack-conflict" className="text-xs font-medium text-amber-900 cursor-pointer">
                I understand there is an academic overlap and wish to register anyway.
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
