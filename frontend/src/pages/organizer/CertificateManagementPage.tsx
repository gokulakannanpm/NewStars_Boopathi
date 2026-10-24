import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  UserCheck,
  Plus,
  ExternalLink,
  RefreshCw,
  Share2,
  Copy,
  Eye,
  FileCheck2,
  AlertTriangle,
  Sparkles,
  QrCode
} from 'lucide-react';
import { api } from '../../api/client';
import { Event, EventRegistration, Certificate, CertificateType } from '../../api/types';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

interface TemplateOption {
  id: string;
  name: string;
  description: string;
  borderStyle: string;
  badgeStyle: string;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'template_institutional',
    name: 'Institutional Crest Edition (Formal)',
    description: 'Traditional academic certificate with crest header and formal typography',
    borderStyle: 'border-double border-4 border-indigo-900/40 bg-white',
    badgeStyle: 'bg-indigo-950 text-indigo-100',
  },
  {
    id: 'template_modern',
    name: 'Modern Minimalist Tech (Clean Slate)',
    description: 'Sleek contemporary tech symposium certificate with monospace verification code',
    borderStyle: 'border border-slate-300 bg-linear-to-b from-white to-slate-50',
    badgeStyle: 'bg-slate-900 text-slate-100',
  },
  {
    id: 'template_gold',
    name: 'Prestige Gold Honors (Excellence Seal)',
    description: 'High-distinction award layout with gold accent trims and presidential endorsement',
    borderStyle: 'border-2 border-amber-400 bg-amber-50/20',
    badgeStyle: 'bg-amber-600 text-white',
  },
];

export const CertificateManagementPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [registrants, setRegistrants] = useState<EventRegistration[]>([]);
  const [issuedCerts, setIssuedCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState('template_institutional');
  const [previewTemplateOpen, setPreviewTemplateOpen] = useState(false);

  // Bulk issuance state
  const [bulkIssuing, setBulkIssuing] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Mint Individual Certificate Modal
  const [targetStudent, setTargetStudent] = useState<EventRegistration | null>(null);
  const [certType, setCertType] = useState<CertificateType>('Participation');
  const [signatoryName, setSignatoryName] = useState('Dr. Arun Kumar');
  const [signatoryTitle, setSignatoryTitle] = useState('Convener & Head of Department');
  const [issuing, setIssuing] = useState(false);

  const toast = useToast();

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const loadData = async (targetId?: string) => {
    setLoading(true);
    try {
      const evs = await api.getEvents({ limit: 50 });
      const items = evs.items || [];
      setEvents(items);

      const activeId = targetId || selectedEventId || (items.length > 0 ? items[0].id : '');
      if (activeId) {
        setSelectedEventId(activeId);
        const [regs, certs] = await Promise.all([
          api.getEventRegistrants(activeId),
          api.getMyCertificates(), // in demo mode fetches available certs
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
      const [regs, certs] = await Promise.all([
        api.getEventRegistrants(id),
        api.getMyCertificates(),
      ]);
      setRegistrants(regs);
      setIssuedCerts(certs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Complete Event Action
  const handleCompleteEvent = async () => {
    if (!selectedEventId) return;
    setCompleting(true);
    try {
      const res = await api.completeEvent(selectedEventId);
      toast.success(`Event marked completed! Verified attendance records preserved for distribution.`);
      setEvents((prev) => prev.map((e) => (e.id === res.event.id ? res.event : e)));
      setCompleteModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not conclude event');
    } finally {
      setCompleting(false);
    }
  };

  // Bulk Issue Certificates
  const handleBulkIssue = async () => {
    if (!selectedEventId) return;
    setBulkIssuing(true);
    try {
      const res = await api.bulkIssueCertificates({
        event_id: selectedEventId,
        template_id: selectedTemplate,
        certificate_type: certType,
        signatory_name: signatoryName,
        signatory_title: signatoryTitle,
      });

      toast.success(
        `Bulk issuance completed! ${res.issued_count} new certificate(s) generated. ${res.skipped_count} already had active credentials.`
      );

      // Refresh certificates
      const updatedCerts = await api.getMyCertificates();
      setIssuedCerts(updatedCerts);
    } catch (err: any) {
      toast.error(err.message || 'Bulk issuance failed');
    } finally {
      setBulkIssuing(false);
    }
  };

  // Individual Issue Certificate
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

  // Calculations
  const eligibleAttendees = registrants.filter((r) => r.attendance_status === 'attended');
  const issuedForThisEvent = issuedCerts.filter((c) => c.event_id === selectedEventId);
  const unissuedAttendees = eligibleAttendees.filter(
    (att) => !issuedForThisEvent.some((c) => c.student_id === att.student_id)
  );

  const collectionUrl = `${window.location.origin}/certificates/collection/${selectedEventId}`;

  const copyCollectionLink = () => {
    navigator.clipboard.writeText(collectionUrl);
    toast.success('Collection link copied to clipboard!');
  };

  const shareCollectionWhatsApp = () => {
    const text = encodeURIComponent(
      `Official event certificates for ${selectedEvent?.title || 'EveHub Event'} have been published!\nVerify and view credentials: ${collectionUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const activeTemplate = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];

  return (
    <div className="space-y-6">
      {/* Header and Event Selector */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">
            Certificate & Credential Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mint tamper-proof verifiable digital certificates for physically checked-in attendees
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
                {e.title} {e.completed_at ? '(Completed)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lifecycle Status & Bulk Actions Bar */}
      {selectedEvent && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                    selectedEvent.completed_at || selectedEvent.status === 'closed'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {selectedEvent.completed_at ? 'Concluded / Closed' : selectedEvent.status}
                </span>
                <span className="text-xs text-slate-400">• {selectedEvent.venue}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 font-heading mt-1">
                {selectedEvent.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Event Completion Button */}
              {!selectedEvent.completed_at && selectedEvent.status !== 'closed' ? (
                <button
                  onClick={() => setCompleteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors shadow-2xs"
                >
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  <span>Conclude Event</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-2 rounded-xl border border-purple-200">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span>
                    Concluded on{' '}
                    {selectedEvent.completed_at
                      ? new Date(selectedEvent.completed_at).toLocaleDateString()
                      : 'Completed'}
                  </span>
                </div>
              )}

              {/* Share Public Collection Button */}
              <button
                onClick={() => setShareModalOpen(true)}
                className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors border border-indigo-200 shadow-2xs"
              >
                <Share2 className="w-4 h-4 text-indigo-600" />
                <span>Share Collection Link</span>
              </button>
            </div>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Registrants
              </span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">
                {registrants.length}
              </span>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                Verified Gate Check-ins
              </span>
              <span className="text-xl font-bold text-emerald-950 mt-1 block">
                {eligibleAttendees.length}
              </span>
            </div>

            <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
              <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
                Credentials Issued
              </span>
              <span className="text-xl font-bold text-indigo-950 mt-1 block">
                {issuedForThisEvent.length}
              </span>
            </div>

            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100">
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
                Pending Issuance
              </span>
              <span className="text-xl font-bold text-amber-950 mt-1 block">
                {unissuedAttendees.length}
              </span>
            </div>
          </div>

          {/* Certificate Template & Bulk Issuance Controls */}
          <div className="p-5 bg-linear-to-r from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Certificate Template & Distribution Policy</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure institutional layout and issue credentials in bulk to all verified gate attendees.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTemplateOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-white px-3 py-2 rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-colors shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Template Layout</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TEMPLATES.map((tmpl) => (
                <label
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                    selectedTemplate === tmpl.id
                      ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-white/60 hover:bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{tmpl.name}</span>
                      {selectedTemplate === tmpl.id && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{tmpl.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <span className="font-semibold text-slate-800">Signatory:</span>
                <span>{signatoryName} ({signatoryTitle})</span>
              </div>

              <button
                onClick={handleBulkIssue}
                disabled={bulkIssuing || unissuedAttendees.length === 0}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs transition-all ${
                  bulkIssuing || unissuedAttendees.length === 0
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {bulkIssuing
                    ? 'Generating Credentials...'
                    : `Bulk Issue to All Verified Attendees (${unissuedAttendees.length})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Eligible Attendees Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Verified Physical Attendees ({eligibleAttendees.length})
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
                  const existingCert = issuedForThisEvent.find(
                    (c) => c.student_id === att.student_id
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
                          <div className="inline-flex items-center gap-2">
                            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold text-[11px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Issued ({existingCert.certificate_id})</span>
                            </span>
                            <Link
                              to={`/verify-certificate/${existingCert.certificate_id}`}
                              target="_blank"
                              className="text-slate-400 hover:text-indigo-600 p-1"
                              title="Verify Certificate"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        ) : (
                          <button
                            onClick={() => setTargetStudent(att)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
                          >
                            Mint Individual
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

      {/* Template Preview Modal */}
      {previewTemplateOpen && (
        <Modal
          isOpen={previewTemplateOpen}
          onClose={() => setPreviewTemplateOpen(false)}
          title="Certificate Template Preview"
          subtitle={`Layout: ${activeTemplate.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* The Rendered Certificate Card */}
            <div className={`p-8 rounded-2xl text-center space-y-4 ${activeTemplate.borderStyle}`}>
              <div className="flex justify-between items-center px-4">
                <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400">
                  EveHub Verified Credential
                </span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${activeTemplate.badgeStyle}`}>
                  Certificate of Participation
                </span>
              </div>

              <div className="pt-2">
                <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
                  This certifies that
                </p>
                <h3 className="text-2xl font-bold font-heading text-slate-900 mt-1">
                  Priya Sundaram
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Department of Computer Science & Engineering
                </p>
              </div>

              <div className="py-2">
                <p className="text-xs text-slate-500">has successfully attended and participated in</p>
                <h4 className="text-base font-bold text-indigo-950 font-heading mt-0.5">
                  {selectedEvent?.title || 'National Level Hackathon 2026'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Held at {selectedEvent?.college_name || 'College of Engineering, Guindy'} on{' '}
                  {new Date().toLocaleDateString()}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-left px-4">
                <div>
                  <span className="block text-xs font-bold text-slate-900">{signatoryName}</span>
                  <span className="block text-[10px] text-slate-500">{signatoryTitle}</span>
                </div>

                <div className="text-right">
                  <span className="block font-mono text-[10px] font-bold text-slate-800">
                    ID: EVH-2026-X89K2
                  </span>
                  <span className="block text-[9px] text-emerald-600 font-semibold flex items-center gap-0.5 justify-end">
                    <ShieldCheck className="w-3 h-3 inline" /> Cryptographically Grounded
                  </span>
                </div>
              </div>
            </div>

            {/* Documented Placeholders Info */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <span className="font-semibold text-slate-900 block">Supported Placeholders:</span>
              <p className="text-[11px] leading-relaxed">
                <code className="bg-white px-1 py-0.5 rounded border text-indigo-700">{"{student_name}"}</code>,{' '}
                <code className="bg-white px-1 py-0.5 rounded border text-indigo-700">{"{event_title}"}</code>,{' '}
                <code className="bg-white px-1 py-0.5 rounded border text-indigo-700">{"{certificate_id}"}</code>,{' '}
                <code className="bg-white px-1 py-0.5 rounded border text-indigo-700">{"{issue_date}"}</code>,{' '}
                <code className="bg-white px-1 py-0.5 rounded border text-indigo-700">{"{signatory_name}"}</code>,{' '}
                <code className="bg-white px-1 py-0.5 rounded border text-indigo-700">{"{verification_url}"}</code>
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewTemplateOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Share Collection Modal */}
      {shareModalOpen && (
        <Modal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          title="Share Certificate Collection"
          subtitle="Publish verifiable credential index for attendee groups"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Share this official verification collection with participants via your event WhatsApp group. Attendees can locate their cryptographic verification ID and access credentials. Private contact details are never exposed.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-slate-700 truncate">{collectionUrl}</span>
              <button
                onClick={copyCollectionLink}
                className="shrink-0 bg-white hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold shadow-2xs flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={shareCollectionWhatsApp}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Share to WhatsApp Group</span>
              </button>

              <Link
                to={`/certificates/collection/${selectedEventId}`}
                target="_blank"
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-center"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Public Page</span>
              </Link>
            </div>
          </div>
        </Modal>
      )}

      {/* Conclude Event Confirmation Modal */}
      {completeModalOpen && (
        <Modal
          isOpen={completeModalOpen}
          onClose={() => setCompleteModalOpen(false)}
          title="Conclude Event & Lock Attendance"
          subtitle="Mark event as finished to finalize institutional credentials"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Important Lifecycle Action:</span>
                Concluding this event closes active registrations and locks verified gate attendance. Historical records remain fully preserved and tamper-proof.
              </div>
            </div>

            <p className="text-slate-600">
              Are you sure you want to mark <span className="font-bold text-slate-900">"{selectedEvent?.title}"</span> as Concluded?
            </p>

            <div className="pt-3 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setCompleteModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteEvent}
                disabled={completing}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-2xs"
              >
                {completing ? 'Concluding Event...' : 'Confirm & Conclude'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Mint Individual Certificate Modal */}
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
