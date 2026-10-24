import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Award, Download, Share2, ShieldCheck, Check, ExternalLink } from 'lucide-react';
import { Certificate } from '../../api/types';
import { useToast } from '../../context/ToastContext';

interface CertificateCardProps {
  certificate: Certificate;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({ certificate }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  const verifyUrl = `${window.location.origin}/verify-certificate/${certificate.certificate_id}`;

  useEffect(() => {
    QRCode.toDataURL(verifyUrl, {
      width: 140,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then(setQrDataUrl).catch(() => {});
  }, [verifyUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    toast.success('Public verification link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Page dimensions: 297mm x 210mm
      const pageWidth = 297;
      const pageHeight = 210;

      // Background border
      doc.setDrawColor(79, 70, 229); // Brand Indigo
      doc.setLineWidth(3);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

      // Institution / Platform Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(certificate.college_name.toUpperCase(), pageWidth / 2, 35, { align: 'center' });

      doc.setFontSize(13);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('IN COLLABORATION WITH EVEHUB VERIFIED COLLEGIATE NETWORK', pageWidth / 2, 43, { align: 'center' });

      // Certificate Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(79, 70, 229);
      doc.text(`CERTIFICATE OF ${certificate.certificate_type.toUpperCase()}`, pageWidth / 2, 65, { align: 'center' });

      // Body text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.setTextColor(71, 85, 105);
      doc.text('This is to certify that', pageWidth / 2, 80, { align: 'center' });

      // Student Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(15, 23, 42);
      doc.text(certificate.student_name, pageWidth / 2, 95, { align: 'center' });

      // Event details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.setTextColor(71, 85, 105);
      doc.text(`has successfully participated in and verified attendance at`, pageWidth / 2, 108, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text(certificate.event_title, pageWidth / 2, 120, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text(`Organized by ${certificate.organizer_name} • Issued on ${certificate.issue_date}`, pageWidth / 2, 130, { align: 'center' });

      // Signatory Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(certificate.signatory_name, 55, 165, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(certificate.signatory_title, 55, 172, { align: 'center' });

      // QR Code
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', pageWidth - 70, 145, 30, 30);
      }
      doc.setFontSize(9);
      doc.text(`Verification ID: ${certificate.certificate_id}`, pageWidth - 55, 182, { align: 'center' });

      // Save
      doc.save(`${certificate.certificate_id}-${certificate.student_name.replace(/\s+/g, '_')}.pdf`);
      toast.success('Certificate PDF downloaded successfully!');
    } catch {
      toast.error('Could not generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow overflow-hidden">
      {/* Certificate Header Banner */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white text-center relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <span className="text-[11px] font-mono tracking-widest text-indigo-300 uppercase">
            {certificate.college_name}
          </span>
          <h3 className="text-xl font-bold font-heading text-white">
            Certificate of {certificate.certificate_type}
          </h3>
          <p className="text-xs text-slate-300 font-medium">{certificate.event_title}</p>
        </div>
      </div>

      {/* Certificate Body */}
      <div className="p-6 space-y-5 text-center">
        <div>
          <span className="text-xs text-slate-400 uppercase tracking-wider block">Awarded to</span>
          <span className="text-lg font-bold text-slate-900 font-heading block mt-0.5">
            {certificate.student_name}
          </span>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-slate-600 py-2 border-y border-slate-100">
          <div>
            <span className="text-slate-400 block text-[11px]">Issue Date</span>
            <span className="font-semibold text-slate-800">{certificate.issue_date}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Authorized Signatory</span>
            <span className="font-semibold text-slate-800">{certificate.signatory_name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Credential Status</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified
            </span>
          </div>
        </div>

        {/* QR Code and Certificate ID */}
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-left space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">
              Unique Verification Code
            </span>
            <span className="text-sm font-mono font-bold text-indigo-700">
              {certificate.certificate_id}
            </span>
            <span className="text-[11px] text-slate-500 block">
              Publicly verifiable without student login
            </span>
          </div>

          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="Certificate Verification QR"
              className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-200 shrink-0"
            />
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Exporting...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 rounded-xl transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Link Copied' : 'Share Link'}</span>
          </button>

          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium py-2 px-3 rounded-xl border border-slate-200 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Verify Live</span>
          </a>
        </div>
      </div>
    </div>
  );
};
