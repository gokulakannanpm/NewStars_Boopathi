import React, { useState, useEffect } from 'react';
import { Award, ShieldCheck, Download, Share2, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '../../api/client';
import { Certificate, EventRegistration } from '../../api/types';
import { CertificateCard } from '../../components/certificate/CertificateCard';

export const CertificatesPage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [certs, regs] = await Promise.all([
          api.getMyCertificates(),
          api.getMyRegistrations(),
        ]);
        setCertificates(certs);
        setRegistrations(regs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 font-heading">
          Certificates & Achievement Wallet
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tamper-evident digital credentials issued upon verified physical attendance at host campuses
        </p>
      </div>

      {/* Trust Notice */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-900">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold block text-slate-900">
            Cryptographic Integrity Guarantee:
          </span>
          EveHub certificates cannot be self-claimed. They are minted by authorized collegiate conveners strictly after scanning your venue check-in token. Each credential carries a globally verifiable public token.
        </div>
      </div>

      {/* Certificate Cards Grid */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-44 bg-white rounded-2xl border border-slate-200" />
        </div>
      ) : certificates.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3 shadow-xs">
          <Award className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 font-heading">
            No certificates issued yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Once you attend an event and the organizers confirm your attendance check-in, your verifiable certificate will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <CertificateCard key={cert.id} certificate={cert} />
          ))}
        </div>
      )}

      {/* Event Attendance History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 font-heading">
          Participation & Attendance Records
        </h2>
        <p className="text-xs text-slate-500">
          Audit ledger tracing registration, physical check-in, and certificate issuance states
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="pb-3">Event Title</th>
                <th className="pb-3">College Host</th>
                <th className="pb-3">Registration Status</th>
                <th className="pb-3">Attendance</th>
                <th className="pb-3">Credential</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {registrations.map((reg) => {
                const hasCert = certificates.some((c) => c.event_id === reg.event_id);
                return (
                  <tr key={reg.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 font-semibold text-slate-900">{reg.event_title}</td>
                    <td className="py-3 text-slate-500">{reg.college_name}</td>
                    <td className="py-3">
                      <span className="capitalize font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                        {reg.registration_status}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                        reg.attendance_status === 'attended'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {reg.attendance_status}
                      </span>
                    </td>
                    <td className="py-3">
                      {hasCert ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" /> Issued
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Pending Attendance</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
