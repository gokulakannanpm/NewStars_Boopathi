import React from 'react';
import { Bus, Clock, Phone, MapPin, AlertCircle } from 'lucide-react';
import { TransportDetails } from '../../api/types';

interface TransportInfoCardProps {
  transport?: TransportDetails;
}

export const TransportInfoCard: React.FC<TransportInfoCardProps> = ({ transport }) => {
  if (!transport || !transport.available) {
    return (
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-xs text-slate-500 flex items-center gap-3">
        <Bus className="w-5 h-5 text-slate-400 shrink-0" />
        <div>
          <span className="font-semibold text-slate-700 block">No College Transport Provided</span>
          Participants are requested to arrange their own transit to the venue.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 shadow-xs overflow-hidden">
      <div className="bg-indigo-50/70 px-5 py-3 border-b border-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bus className="w-4 h-4 text-indigo-600" />
          <h4 className="font-semibold text-xs text-indigo-950 uppercase tracking-wider font-heading">
            Official College Shuttle Service
          </h4>
        </div>
        <span className="text-[11px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
          Free for Registered Students
        </span>
      </div>

      <div className="p-5 space-y-4 text-xs">
        {/* Pickup Points */}
        {transport.pickup_points && transport.pickup_points.length > 0 && (
          <div>
            <span className="text-slate-500 font-medium block mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              Designated Pickup Points:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {transport.pickup_points.map((pt, i) => (
                <span
                  key={i}
                  className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md text-xs font-medium"
                >
                  {pt}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Departure & Return Timings */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div>
            <span className="text-slate-500 font-medium block mb-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> Departure:
            </span>
            <span className="font-semibold text-slate-900">{transport.departure_time || '07:30 AM'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block mb-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> Return:
            </span>
            <span className="font-semibold text-slate-900">{transport.return_time || '08:00 PM'}</span>
          </div>
        </div>

        {/* Contact Coordinator */}
        {transport.contact_person && (
          <div className="pt-2 border-t border-slate-100 text-slate-600 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-[11px] font-medium">{transport.contact_person}</span>
          </div>
        )}

        {/* Special Instructions Note */}
        {transport.notes && (
          <div className="bg-amber-50 rounded-xl p-3 text-[11px] text-amber-900 border border-amber-200 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>{transport.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
};
