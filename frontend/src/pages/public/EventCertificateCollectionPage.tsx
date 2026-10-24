import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Award,
  ShieldCheck,
  Search,
  ExternalLink,
  Copy,
  Share2,
  Calendar,
  Building,
  CheckCircle2,
  ArrowLeft,
  Users
} from 'lucide-react';
import { api } from '../../api/client';
import { EventCertificateCollection } from '../../api/types';
import { useToast } from '../../context/ToastContext';

export const EventCertificateCollectionPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [collection, setCollection] = useState<EventCertificateCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    api.getCertificateCollection(eventId)
      .then(setCollection)
      .catch((err) => {
        console.error(err);
        setError('Certificate directory not found or no certificates published yet.');
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Collection link copied to clipboard!');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Official Event Certificates for ${collection?.event_title || 'EveHub Event'} have been published!\nCheck and verify your credential here: ${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const filteredCerts = collection?.certificates.filter((cert) => {
    const q = searchQuery.toLowerCase();
    return (
      cert.student_name.toLowerCase().includes(q) ||
      cert.certificate_id.toLowerCase().includes(q) ||
      cert.certificate_type.toLowerCase().includes(q)
    );
  }) || [];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading institutional certificate collection...</p>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
          <Award className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 font-heading">
          Certificate Collection Unavailable
        </h2>
        <p className="text-xs text-slate-500">
          {error || 'This event has not published verified certificates yet.'}
        </p>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Browse Active Events</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb / Back button */}
      <div>
        <Link
          to={`/events/${collection.event_id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Event Details</span>
        </Link>
      </div>

      {/* Hero Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Institutional Credential Registry</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
              {collection.event_title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <div className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-indigo-500" />
                <span className="font-medium text-slate-800">{collection.college_name}</span>
              </div>
              {collection.completed_at && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Concluded: {new Date(collection.completed_at).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-slate-900">{collection.total_issued} Certificates Published</span>
              </div>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Link</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share to WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Privacy & Anti-Tamper Notice */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 text-xs text-slate-600 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-slate-900 block">Public Verification Directory:</span>
            This official index allows students, recruiters, and institutions to verify issued credentials using the public EveHub verification engine. Student contact details are kept private. Students can download high-resolution PDF credentials securely by signing into their EveHub Student Profile.
          </div>
        </div>
      </div>

      {/* Search and Table of Issued Certificates */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Issued Credential Registry ({filteredCerts.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Search by student name or unique certificate verification identifier
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or ID..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {filteredCerts.length === 0 ? (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-bold text-sm text-slate-900">No credentials found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No issued certificates matched your search term "{searchQuery}".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Participant Name</th>
                  <th className="pb-3">Certificate Type</th>
                  <th className="pb-3">Issue Date</th>
                  <th className="pb-3">Verification ID</th>
                  <th className="pb-3 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCerts.map((cert) => (
                  <tr key={cert.certificate_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 font-semibold text-slate-900">
                      {cert.student_name}
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        {cert.certificate_type}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500">
                      {new Date(cert.issue_date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5">
                      <span className="font-mono font-semibold text-slate-800 text-[11px]">
                        {cert.certificate_id}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        to={`/verify-certificate/${cert.certificate_id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold text-xs px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        <span>Verify Credential</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
