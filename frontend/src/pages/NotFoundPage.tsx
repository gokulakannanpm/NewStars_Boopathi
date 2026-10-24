import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
          <Compass className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 font-heading">Page Not Found</h1>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          The route you are navigating to does not exist or has been relocated.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
};
