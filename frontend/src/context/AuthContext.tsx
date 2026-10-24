import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, RoleType } from '../api/types';
import { api } from '../api/client';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  role: RoleType | 'guest';
  login: (email: string, pass: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: 'student' | 'organizer') => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUser = async () => {
    try {
      const u = await api.getMe();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If no token stored, default to student demo token for frictionless preview
    if (!localStorage.getItem('evehub_token')) {
      localStorage.setItem('evehub_token', 'usr-student-1');
    }
    fetchUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.login(email, pass);
      localStorage.setItem('evehub_token', res.token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: any) => {
    setLoading(true);
    try {
      const res = await api.register(data);
      localStorage.setItem('evehub_token', res.token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('evehub_token');
    setUser(null);
  };

  const switchDemoRole = async (targetRole: 'student' | 'organizer') => {
    setLoading(true);
    const token = targetRole === 'organizer' ? 'usr-organizer-1' : 'usr-student-1';
    localStorage.setItem('evehub_token', token);
    try {
      const u = await api.getMe();
      setUser(u);
    } catch {
      // fallback mock user
      if (targetRole === 'organizer') {
        setUser({
          id: 'usr-organizer-1',
          email: 'organizer@evehub.in',
          display_name: 'Dr. Arun Kumar (Convener)',
          role: 'organizer',
          college_id: 'clg-ceg',
          college_name: 'College of Engineering, Guindy',
          department: 'Computer Science & Engineering',
          year: 'Faculty',
          phone: '+91 94440 12345'
        });
      } else {
        setUser({
          id: 'usr-student-1',
          email: 'student@evehub.in',
          display_name: 'Gokul Kannan',
          role: 'student',
          college_id: 'clg-ssn',
          college_name: 'SSN College of Engineering',
          department: 'Information Technology',
          year: '3rd Year',
          phone: '+91 98765 43210'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    const updated = await api.updateProfile(data);
    setUser(updated);
  };

  const role = user ? user.role : 'guest';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        role,
        login,
        signup,
        logout,
        switchDemoRole,
        updateProfile,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
