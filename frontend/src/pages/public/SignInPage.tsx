import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const SignInPage: React.FC = () => {
  const [email, setEmail] = useState('student@evehub.in');
  const [password, setPassword] = useState('evehub123');
  const [loading, setLoading] = useState(false);

  const { login, switchDemoRole } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Signed in successfully!');
      if (email.includes('organizer')) {
        navigate('/organizer/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoStudent = async () => {
    await switchDemoRole('student');
    toast.success('Signed in as Gokul Kannan (Student)');
    navigate('/student/dashboard');
  };

  const handleDemoOrganizer = async () => {
    await switchDemoRole('organizer');
    toast.success('Signed in as Dr. Arun Kumar (Organizer)');
    navigate('/organizer/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Welcome to EveHub
          </h2>
          <p className="text-xs text-slate-500">
            Sign in to access conflict-free registrations and verified credentials
          </p>
        </div>

        {/* Demo Fast-Login Strip */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
          <span className="text-[11px] font-semibold text-slate-700 block text-center uppercase tracking-wider">
            Instant Demo Sign-in
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDemoStudent}
              className="bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>Student Portal</span>
            </button>
            <button
              type="button"
              onClick={handleDemoOrganizer}
              className="bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Organizer Portal</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-slate-900 outline-hidden bg-slate-50/50"
              placeholder="e.g. student@evehub.in"
            />
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-slate-900 outline-hidden bg-slate-50/50"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Don't have an account yet?{' '}
          <Link to="/signup" className="text-indigo-600 font-semibold hover:underline">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
};
