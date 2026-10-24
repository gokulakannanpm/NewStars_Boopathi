import React, { useState, useEffect } from 'react';
import { User, Building, GraduationCap, Phone, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { College } from '../../api/types';

export const StudentProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [colleges, setColleges] = useState<College[]>([]);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [collegeId, setCollegeId] = useState(user?.college_id || '');
  const [collegeName, setCollegeName] = useState(user?.college_name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [year, setYear] = useState(user?.year || '3rd Year');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getColleges().then(setColleges).catch(console.error);
  }, []);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setCollegeId(user.college_id || '');
      setCollegeName(user.college_name || '');
      setDepartment(user.department || '');
      setYear(user.year || '3rd Year');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleCollegeChange = (id: string) => {
    setCollegeId(id);
    const found = colleges.find((c) => c.id === id);
    if (found) setCollegeName(found.name);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName,
        college_id: collegeId,
        college_name: collegeName,
        department,
        year,
        phone,
      });
      toast.success('Profile details updated successfully!');
    } catch {
      toast.error('Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 font-heading">
          Student Profile & Institutional Affiliation
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          These details are used to verify eligible participation and appear on your digital certificates
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5 text-xs">
        <div>
          <label className="font-semibold text-slate-700 block mb-1">Full Legal Name</label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 text-slate-900 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Email (Authenticated)</label>
          <input
            type="email"
            disabled
            value={user?.email || ''}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-500 bg-slate-100 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Enrolled College / University</label>
          <select
            value={collegeId}
            onChange={(e) => handleCollegeChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-hidden bg-slate-50/50 cursor-pointer"
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
            <label className="font-semibold text-slate-700 block mb-1">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-hidden bg-slate-50/50"
              placeholder="e.g. Dept of IT"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Academic Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-hidden bg-slate-50/50 cursor-pointer"
            >
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="Final Year">Final Year</option>
              <option value="Postgraduate">Postgraduate</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Emergency / Contact Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-hidden bg-slate-50/50"
            placeholder="+91 98765 43210"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-colors shadow-2xs"
          >
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
