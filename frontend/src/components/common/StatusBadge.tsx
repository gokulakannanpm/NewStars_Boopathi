import React from 'react';
import { EventStatus } from '../../api/types';

interface StatusBadgeProps {
  status: EventStatus;
  className?: string;
}

const STATUS_CONFIG: Record<EventStatus, { label: string; style: string; dot: string }> = {
  open: {
    label: 'Open for Registration',
    style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  closing_soon: {
    label: 'Closing Soon',
    style: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500 animate-pulse',
  },
  waitlist: {
    label: 'Waitlist Active',
    style: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
  },
  closed: {
    label: 'Registration Closed',
    style: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  cancelled: {
    label: 'Cancelled',
    style: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
  draft: {
    label: 'Draft',
    style: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.style} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
