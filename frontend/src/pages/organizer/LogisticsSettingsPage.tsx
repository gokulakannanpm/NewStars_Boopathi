import React, { useState } from 'react';
import { Settings, Bus, MapPin, Phone, ShieldCheck, Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const LogisticsSettingsPage: React.FC = () => {
  const toast = useToast();

  const [helpline, setHelpline] = useState('+91 44 2235 7000');
  const [medicalRoom, setMedicalRoom] = useState('University Health Centre (Near Gate 3)');
  const [transitNotice, setTransitNotice] = useState('Shuttle buses will depart strictly on schedule. Attendees must show verified EveHub QR pass before boarding.');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    toast.success('Logistics parameters updated across all active events!');
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 font-heading">
          Campus Logistics & Safety Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure university transport shuttles, emergency helplines, and gate access protocols
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5 text-xs">
        <div>
          <label className="font-semibold text-slate-700 block mb-1">Emergency Event Helpline</label>
          <input
            type="text"
            required
            value={helpline}
            onChange={(e) => setHelpline(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden focus:border-indigo-500 text-slate-900"
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Campus First Aid & Medical Station</label>
          <input
            type="text"
            value={medicalRoom}
            onChange={(e) => setMedicalRoom(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden text-slate-900"
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Transit & Boarding Notice</label>
          <textarea
            rows={3}
            value={transitNotice}
            onChange={(e) => setTransitNotice(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden text-slate-900 leading-relaxed"
          />
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Changes take effect immediately on participant passes.
          </span>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
          >
            {saved ? <Check className="w-4 h-4" /> : null}
            <span>{saved ? 'Saved' : 'Save Logistics Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
