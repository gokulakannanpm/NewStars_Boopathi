import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../api/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: (RoleType | 'guest')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Validating authorization...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user && role === 'guest') {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Role restriction
  if (allowedRoles && !allowedRoles.includes(role)) {
    // If student trying to access organizer, redirect to student dashboard
    if (role === 'student') {
      return <Navigate to="/student/dashboard" replace />;
    }
    // If organizer trying to access student, redirect to organizer dashboard
    if (role === 'organizer') {
      return <Navigate to="/organizer/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
