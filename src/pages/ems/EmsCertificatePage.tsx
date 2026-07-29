import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PDFViewer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  CheckCircle2,
  Award,
  Download,
  Share2,
  Search,
  Calendar,
  Building2,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  EmsCertData,
  EmsCertificateDocument,
  EmsCertificateDownloadLink,
} from '@/components/ems/EmsCertificateTemplate';

export const EmsCertificatePage: React.FC = () => {
  const { certId } = useParams<{ certId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [certData, setCertData] = useState<EmsCertData | null>(null);
  const [searchSerial, setSearchSerial] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (!certId) {
      setLoading(false);
      return;
    }
    fetchCertDetails(certId);
  }, [certId]);

  const fetchCertDetails = async (idOrSerial: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch certificate record by ID or serial number
      const { data: cert, error: certErr } = await supabase
        .from('ems_certificates')
        .select('id, event_id, participant_id, jury_code_id, cert_type, cert_serial, qr_code_url, created_at')
        .or(`id.eq.${idOrSerial},cert_serial.eq.${idOrSerial}`)
        .maybeSingle();

      if (certErr) throw certErr;

      if (!cert) {
        setErrorMsg('Sijil tidak dijumpai dalam rekod rasmi JPP-POLISAS.');
        setCertData(null);
        setLoading(false);
        return;
      }

      // 2. Concurrently fetch event, participant, and jury details (following DEV_GUIDELINE rules)
      const [eventRes, participantRes, juryRes] = await Promise.all([
        supabase
          .from('ems_events')
          .select('id, title, event_date, category, location, status')
          .eq('id', cert.event_id)
          .maybeSingle(),
        cert.participant_id
          ? supabase
              .from('ems_participants')
              .select('id, leader_name, team_name, matrix_no, category_name, participant_type')
              .eq('id', cert.participant_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        cert.jury_code_id
          ? supabase
              .from('ems_jury_codes')
              .select('id, jury_name, organization, code')
              .eq('id', cert.jury_code_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      const event = eventRes.data;
      const participant = participantRes.data;
      const jury = juryRes.data;

      // Determine Recipient Name & Subtext
      let recipientName = 'Penerima Sijil';
      let recipientSubtext = '';

      if (participant) {
        recipientName = participant.team_name
          ? `${participant.leader_name} (${participant.team_name})`
          : participant.leader_name;
        
        if (participant.matrix_no) {
          recipientSubtext = `No. Matrik: ${participant.matrix_no}`;
        } else if (participant.category_name) {
          recipientSubtext = `Kategori: ${participant.category_name}`;
        } else {
          recipientSubtext = `Peserta Acara`;
        }
      } else if (jury) {
        recipientName = jury.jury_name || 'Juri Penilai';
        recipientSubtext = jury.organization
          ? `Organisasi: ${jury.organization}`
          : 'Juri Penilai POLISAS';
      }

      const formattedDate = event?.event_date
        ? new Date(event.event_date).toLocaleDateString('ms-MY', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : new Date(cert.created_at).toLocaleDateString('ms-MY', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

      const verificationUrl = `${window.location.origin}/ems/cert/${cert.cert_serial}`;

      // Generate QR Code Data URL for embedding in PDF and display
      let qrCodeDataUrl = cert.qr_code_url || '';
      try {
        qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: 300,
          margin: 1,
          color: { dark: '#0F172A', light: '#FFFFFF' },
        });
      } catch (qrErr) {
        console.warn('QR Code generation failed:', qrErr);
      }

      const builtCertData: EmsCertData = {
        id: cert.id,
        cert_serial: cert.cert_serial,
        cert_type: cert.cert_type,
        recipient_name: recipientName,
        recipient_subtext: recipientSubtext,
        event_title: event?.title || 'Program / Acara JPP POLISAS',
        event_date: formattedDate,
        award_title: cert.cert_type === 'WINNER' ? 'Pemenang Utam / Anugerah Cemerlang' : undefined,
        qr_code_url: qrCodeDataUrl,
        verification_url: verificationUrl,
      };

      setCertData(builtCertData);
    } catch (err: any) {
      console.error('Fetch cert details error:', err);
      setErrorMsg(err.message || 'Gagal memproses pengesahan sijil.');
      setCertData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchSerial.trim()) return;
    navigate(`/ems/cert/${searchSerial.trim()}`);
  };

  const handleCopyLink = () => {
    if (!certData?.verification_url) return;
    navigator.clipboard.writeText(certData.verification_url);
    setCopied(true);
    toast.success('Pautan pengesahan disalin ke papan keratan!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getCertTypeBadge = (type: string) => {
    switch (type) {
      case 'WINNER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Award className="w-3.5 h-3.5" /> Sijil Anugerah Pemenang
          </span>
        );
      case 'JURY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <ShieldCheck className="w-3.5 h-3.5" /> Sijil Penghargaan Juri
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Sijil Penyertaan Rasmi
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 pb-28 md:pb-8">
      {/* ── Navbar Public Branding ── */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="font-black tracking-wider text-sm sm:text-base text-white flex items-center gap-1.5">
                POLISAS <span className="text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">E-Sijil</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Portal Pengesahan Digital JPP POLISAS</p>
            </div>
          </div>


          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari No. Siri Sijil..."
                  value={searchSerial}
                  onChange={(e) => setSearchSerial(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700/70 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors w-48"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors"
              >
                Semak
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium animate-pulse">
              Memproses pengesahan e-sijil digital...
            </p>
          </div>
        ) : errorMsg || !certData ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto py-12 px-6 rounded-3xl bg-slate-900/80 border border-slate-800 text-center flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Sijil Tidak Dijumpai</h2>
            <p className="text-sm text-slate-400 mb-6 max-w-md">
              {errorMsg || 'Nombor siri atau ID sijil yang anda masukkan tidak wujud dalam pangkalan data rasmi JPP POLISAS.'}
            </p>

            <form onSubmit={handleSearchSubmit} className="w-full max-w-md flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Masukkan No. Siri Sijil (cth: CERT-EMS-2026-P1-12345)"
                value={searchSerial}
                onChange={(e) => setSearchSerial(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors"
              >
                Cari
              </button>
            </form>

            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Utama
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* ── Status Verification Card ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl shadow-emerald-950/20"
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sijil Sah & Berdaftar di Sistem JPP-POLISAS
                    </span>
                    {getCertTypeBadge(certData.cert_type)}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                    {certData.recipient_name}
                  </h1>
                  {certData.recipient_subtext && (
                    <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500" /> {certData.recipient_subtext}
                    </p>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  <EmsCertificateDownloadLink
                    certData={certData}
                    fileName={`Sijil_${certData.cert_serial}.pdf`}
                    className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:brightness-110 transition-all cursor-pointer"
                  >
                    {({ loading }) => (
                      <>
                        <Download className="w-4 h-4" />
                        {loading ? 'Menjana PDF...' : 'Muat Turun Sijil PDF'}
                      </>
                    )}
                  </EmsCertificateDownloadLink>

                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                    {copied ? 'Disalin!' : 'Kongsi Pautan'}
                  </button>

                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {showPreview ? 'Sembunyi PDF' : 'Papar PDF'}
                  </button>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" /> Acara / Program
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-slate-200 line-clamp-2">
                    {certData.event_title}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> No. Siri Rasmi
                  </p>
                  <p className="text-xs sm:text-sm font-mono font-bold text-amber-400 flex items-center justify-between">
                    <span>{certData.cert_serial}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(certData.cert_serial);
                        toast.success('No. siri disalin!');
                      }}
                      className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-400" /> Tarikh Sijil
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-slate-200">
                    {certData.event_date || 'Julai 2026'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1">
                      Pengesahan QR
                    </p>
                    <p className="text-[11px] text-emerald-400 font-semibold">Digital Verified</p>
                  </div>
                  {certData.qr_code_url && (
                    <img
                      src={certData.qr_code_url}
                      alt="QR Code"
                      className="w-10 h-10 rounded-lg border border-slate-700 bg-white p-0.5"
                    />
                  )}
                </div>
              </div>
            </motion.div>

            {/* ── Embedded PDF Previewer ── */}
            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl"
                >
                  <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" /> Pratinjau Sijil Digital (PDF)
                    </h3>
                    <EmsCertificateDownloadLink
                      certData={certData}
                      fileName={`Sijil_${certData.cert_serial}.pdf`}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      {({ loading }) => (loading ? 'Menjana...' : 'Muat Turun PDF →')}
                    </EmsCertificateDownloadLink>
                  </div>

                  <div className="w-full h-[600px] bg-slate-950 relative">
                    <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                      <EmsCertificateDocument certData={certData} />
                    </PDFViewer>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 bg-slate-950 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Jawatankuasa Perwakilan Pelajar POLISAS. Hak Cipta Terelihara.</p>
        <p className="mt-1 text-[11px]">Sistem Pengurusan Acara (EMS) & Generator Sijil Digital @react-pdf/renderer</p>
      </footer>
    </div>
  );
};
