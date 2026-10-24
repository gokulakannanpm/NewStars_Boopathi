import React from 'react';
import { EventCategory } from '../../api/types';

interface CategoryBadgeProps {
  category: EventCategory;
  className?: string;
}

const CATEGORY_STYLES: Record<EventCategory, string> = {
  Hackathon: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Technical: 'bg-blue-50 text-blue-700 border-blue-200',
  Symposium: 'bg-purple-50 text-purple-700 border-purple-200',
  Workshop: 'bg-amber-50 text-amber-800 border-amber-200',
  Cultural: 'bg-rose-50 text-rose-700 border-rose-200',
  Sports: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Management: 'bg-teal-50 text-teal-700 border-teal-200',
};

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, className = '' }) => {
  const style = CATEGORY_STYLES[category] || 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase ${style} ${className}`}
    >
      {category}
    </span>
  );
};
