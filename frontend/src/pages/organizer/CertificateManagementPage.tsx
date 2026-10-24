import React, { useState, useEffect } from 'react';
import { Award, ShieldCheck, CheckCircle2, UserCheck, Plus, ExternalLink, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { Event, EventRegistration, Certificate, CertificateType } from '../../api/types';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

export const CertificateManagementPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [registrants, setRegistrants] = useState<EventRegistration[]>([]);
  const [issuedCerts, setIssuedCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  // Mint Certificate Modal
  const [targetStudent, setTargetStudent] = useState<EventRegistration | null>(null);
  const [certType, setCertType] = useState<CertificateType>('Participation');
  const [signatoryName, setSignatoryName] = useState('Dr. Arun Kumar');
  const [signatoryTitle, setSignatoryTitle] = useState('Convener & Head of Department');
  const [issuing, setIssuing] = useState(false);

  const toast = useToast();

  const loadData = async () => {
    try {
      const evs = await api.getEvents({ limit: 20 });
      const items = evs.items || [];
      setEvents(items);
      if (items.length > 0) {
        const targetId = selectedEventId || items[0].id;
        setSelectedEventId(targetId);
        const [regs, certs] = await Promise.all([
          api.getEventRegistrants(targetId),
          api.getMyCertificates(), // demo all certs
        ]);
        setRegistrants(regs);
        setIssuedCerts(certs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectEvent = async (id: string) => {
    setSelectedEventId(id);
    setLoading(true);
    try {
      const regs = await api.getEventRegistrants(id);
      setRegistrants(regs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent) return;
    setIssuing(true);
    try {
      const newCert = await api.issueCertificate({
        event_id: selectedEventId,
        student_id: targetStudent.student_id,
        certificate_type: certType,
        signatory_name: signatoryName,
        signatory_title: signatoryTitle,
      });
      toast.success(`Issued ${certType} Certificate (${newCert.certificate_id}) for ${targetStudent.student_name}!`);
      setIssuedCerts((prev) => [newCert, ...prev]);
      setTargetStudent(null);
    } catch (err: any) {
      toast.error(err.message || 'Could not issue certificate');
    } finally {
      setIssuing(false);
    }
  };

  // Eligible attendees are those with verified attendance
  const eligibleAttendees = registrants.filter((r) => r.attendance_status === 'attended');

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">
            Certificate & Credential Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mint tamper-proof digital certificates for verified physical attendees
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Select Event:</span>
          <select
            value={selectedEventId}
            onChange={(e) => handleSelectEvent(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-hidden max-w-xs truncate cursor-pointer shadow-2xs"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Issuance Guidelines Alert */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-950 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold block">Institutional Credential Standard:</span>
          Certificates can only be generated for students who possess a verified venue check-in token. Each credential generates a cryptographic verification ID (e.g. EVH-2026-XXXX) accessible globally without requiring login.
        </div>
      </div>

      {/* Eligible Attendees Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Eligible Verified Attendees ({eligibleAttendees.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Participants whose physical gate check-in has been confirmed by event staff
            </p>
          </div>
        </div>

        {eligibleAttendees.length === 0 ? (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-12 text-center space-y-2">
            <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-bold text-sm text-slate-900">No checked-in attendees yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Scan attendee QR entry passes at the venue gate to mark them eligible for certificate issuance.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Participant Name</th>
                  <th className="pb-3">Institution & Dept</th>
                  <th className="pb-3">Verified Check-in Time</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {eligibleAttendees.map((att) => {
                  const existingCert = issuedCerts.find(
                    (c) => c.student_id === att.student_id && c.event_id === selectedEventId
                  );
                  return (
                    <tr key={att.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 font-semibold text-slate-900">
                        {att.student_name}
                      </td>
                      <td className="py-3 text-slate-500">
                        {att.student_college || 'Anna University'} • {att.student_department}
                      </td>
                      <td className="py-3 text-slate-500">
                        {att.attended_at ? new Date(att.attended_at).toLocaleTimeString() : 'Verified'}
                      </td>
                      <td className="py-3 text-right">
                        {existingCert ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold text-[11px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Issued ({existingCert.certificate_id})</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => setTargetStudent(att)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
                          >
                            Mint Certificate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mint Certificate Modal */}
      {targetStudent && (
        <Modal
          isOpen={!!targetStudent}
          onClose={() => setTargetStudent(null)}
          title="Issue Digital Certificate"
          subtitle={`Recipient: ${targetStudent.student_name}`}
          maxWidth="md"
        >
          <form onSubmit={handleIssueCertificate} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Certificate Type</label>
              <select
                value={certType}
                onChange={(e) => setCertType(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-hidden font-medium cursor-pointer"
              >
                <option value="Participation">Certificate of Participation</option>
                <option value="Excellence">Certificate of Excellence</option>
                <option value="Winner">Certificate of Winner (1st Prize)</option>
                <option value="Runner-up">Certificate of Runner-up (2nd Prize)</option>
                <option value="Organizer">Certificate of Organizing Committee</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Authorized Signatory Name</label>
              <input
                type="text"
                required
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Signatory Title</label>
              <input
                type="text"
                required
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-hidden text-slate-900"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setTargetStudent(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={issuing}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-2xs"
              >
                {issuing ? 'Minting Credential...' : 'Mint & Dispatch Credential'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
