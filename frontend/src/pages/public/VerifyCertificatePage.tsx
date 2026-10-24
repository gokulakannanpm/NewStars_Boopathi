import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Award, ShieldCheck, AlertCircle, Search, CheckCircle2, XCircle, Building2, Calendar } from 'lucide-react';
import { api } from '../../api/client';

export const VerifyCertificatePage: React.FC = () => {
  const { certId } = useParams<{ certId?: string }>();
  const navigate = useNavigate();

  const [inputCode, setInputCode] = useState(certId || 'EVH-2026-IIT099');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchVerification = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await api.verifyCertificate(code.trim());
      setResult(res);
    } catch {
      setResult({ valid: false, message: 'Verification server currently unreachable.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (certId) {
      setInputCode(certId);
      fetchVerification(certId);
    } else {
      fetchVerification('EVH-2026-IIT099');
    }
  }, [certId]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      navigate(`/verify-certificate/${inputCode.trim()}`);
      fetchVerification(inputCode.trim());
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center mx-auto">
          <Award className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
          Public Certificate & Credential Validator
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Verify authentic university-issued certificates of excellence and participation without logging in.
        </p>
      </div>

      {/* Code Input Form */}
      <form onSubmit={handleLookup} className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex-1 flex items-center gap-2.5 px-3 py-2 bg-slate-50 rounded-xl">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Enter certificate ID e.g. EVH-2026-IIT099..."
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            className="w-full text-xs font-mono bg-transparent outline-hidden text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-2xs shrink-0"
        >
          {loading ? 'Verifying...' : 'Validate Code'}
        </button>
      </form>

      {/* Verification Card Result */}
      {result && (
        <div className="animate-in fade-in zoom-in-95 duration-200">
          {result.valid ? (
            /* VALID CERTIFICATE RECORD */
            <div className="bg-white rounded-3xl border border-emerald-200 shadow-md overflow-hidden">
              <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                  <span className="font-semibold text-sm">Authentic Institutional Credential</span>
                </div>
                <span className="text-xs font-mono bg-emerald-700/80 px-2.5 py-0.5 rounded-md border border-emerald-500">
                  {result.certificate_id}
                </span>
              </div>

              <div className="p-8 space-y-6">
                <div className="text-center space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-widest font-mono">
                    Official Certification
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 font-heading">
                    Certificate of {result.certificate_type}
                  </h3>
                  <p className="text-sm font-semibold text-indigo-700">{result.event_title}</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Recipient Name</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">{result.student_name}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Issuing Institution</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">{result.college_name}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Authorized Convener</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {result.signatory_name} ({result.signatory_title})
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Issue Date</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{result.issue_date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Backed by physical check-in audit & EveHub cryptographic registry.</span>
                </div>
              </div>
            </div>
          ) : (
            /* INVALID / REVOKED CERTIFICATE */
            <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Certificate Could Not Be Verified
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {result.message || 'No record exists for this certificate identifier. It may have been revoked, mistyped, or never issued.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
