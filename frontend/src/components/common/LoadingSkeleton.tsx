import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className = '',
}) => {
  return (
    <div className={`space-y-4 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-slate-200/70 h-24 rounded-xl w-full" />
      ))}
    </div>
  );
};

export const EventCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs animate-pulse">
      <div className="h-44 bg-slate-200" />
      <div className="p-5 space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-4 w-20 bg-slate-200 rounded-full" />
          <div className="h-4 w-16 bg-slate-200 rounded-full" />
        </div>
        <div className="h-6 w-3/4 bg-slate-200 rounded-md" />
        <div className="h-4 w-1/2 bg-slate-100 rounded-md" />
        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
          <div className="h-4 w-24 bg-slate-200 rounded-md" />
          <div className="h-4 w-12 bg-slate-200 rounded-md" />
        </div>
      </div>
    </div>
  );
};
