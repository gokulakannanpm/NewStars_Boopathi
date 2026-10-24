import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { College } from '../../api/types';

export const SignUpPage: React.FC = () => {
  const [role, setRole] = useState<'student' | 'organizer'>('student');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [year, setYear] = useState('3rd Year');
  const [phone, setPhone] = useState('');
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.getColleges().then((res) => {
      setColleges(res);
      if (res.length > 0) {
        setCollegeId(res[0].id);
        setCollegeName(res[0].name);
      }
    }).catch(() => {});
  }, []);

  const handleCollegeChange = (id: string) => {
    setCollegeId(id);
    const found = colleges.find((c) => c.id === id);
    if (found) {
      setCollegeName(found.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup({
        email,
        password,
        display_name: displayName,
        role,
        college_id: collegeId,
        college_name: collegeName,
        department,
        year: role === 'student' ? year : 'Faculty Coordinator',
        phone,
      });
      toast.success('Account created successfully!');
      if (role === 'organizer') {
        navigate('/organizer/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Create an EveHub Account
          </h2>
          <p className="text-xs text-slate-500">
            Join verified collegiate discovery network across institutions
          </p>
        </div>

        {/* Role Toggle */}
        <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`py-2 rounded-lg transition-all ${
              role === 'student' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Student Account
          </button>
          <button
            type="button"
            onClick={() => setRole('organizer')}
            className={`py-2 rounded-lg transition-all ${
              role === 'organizer' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Organizer / Convener
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">Full Legal Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 text-xs text-slate-900 bg-slate-50/50 outline-hidden"
              placeholder="e.g. Ananya Sharma"
            />
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1">Official / College Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 text-xs text-slate-900 bg-slate-50/50 outline-hidden"
              placeholder="e.g. ananya@psgtech.ac.in"
            />
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 text-xs text-slate-900 bg-slate-50/50 outline-hidden"
              placeholder="Minimum 6 characters"
            />
          </div>

          {/* College Dropdown */}
          <div>
            <label className="font-medium text-slate-700 block mb-1">Affiliated College / University</label>
            <select
              value={collegeId}
              onChange={(e) => handleCollegeChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 text-xs text-slate-900 bg-slate-50/50 outline-hidden cursor-pointer"
            >
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.district})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-700 block mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50/50 outline-hidden"
                placeholder="Dept of CSE"
              />
            </div>
            <div>
              <label className="font-medium text-slate-700 block mb-1">
                {role === 'student' ? 'Academic Year' : 'Designation'}
              </label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50/50 outline-hidden"
                placeholder={role === 'student' ? '3rd Year' : 'Faculty Convener'}
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1">Contact Phone (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50/50 outline-hidden"
              placeholder="+91 98765 00000"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/signin" className="text-indigo-600 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
