import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit3,
  QrCode,
  Key,
  Trophy,
  Scan,
  Award,
  ShieldCheck,
  Copy,
  Check,
  Calendar,
  MapPin,
  Users,
  User,
  RefreshCw,
  X,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Gift,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { EmsLuckyDrawModal } from '@/components/ems/EmsLuckyDrawModal';
import {
  fetchEmsEvents,
  createJuryCode,
  resolveTieWinner,
  generateEmsCertificates,
  fetchEmsLeaderboard,
  toggleJuryCodeActive,
  deleteJuryCode,
  completeEmsEvent,
  EmsLeaderboardItem,
} from '@/lib/ems';
import { supabase } from '@/lib/supabase';
import type { EmsEvent, EmsJuryCode } from '@/types';

export function EmsDashboardPage() {
  const navigate = useNavigate();
  const {
    isSuperAdmin,
    isJppMember,
    isPresident,
    isMT: isClubMt,
    isAdvisor: isClubAdvisor,
    profile,
  } = useAuth();

  const isStaff = profile?.role === 'STAFF' || profile?.role === 'PENSYARAH';
  const canCreateEvent = isSuperAdmin || isJppMember || isPresident || isClubMt || isClubAdvisor || isStaff;

  const [events, setEvents] = useState<(EmsEvent & { creator?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Modals state
  const [qrModalEvent, setQrModalEvent] = useState<EmsEvent | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Jury Code Modal State
  const [juryModalEvent, setJuryModalEvent] = useState<EmsEvent | null>(null);
  const [juryCodes, setJuryCodes] = useState<EmsJuryCode[]>([]);
  const [loadingJuryCodes, setLoadingJuryCodes] = useState(false);
  const [juryForm, setJuryForm] = useState({
    code: '',
    jury_name: '',
    organization: '',
    assigned_categories: '',
    assigned_booths: '',
  });
  const [isSubmittingJury, setIsSubmittingJury] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Tie Breaker Modal State
  const [tieModalEvent, setTieModalEvent] = useState<EmsEvent | null>(null);
  const [leaderboard, setLeaderboard] = useState<EmsLeaderboardItem[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
  const [isResolvingTie, setIsResolvingTie] = useState(false);

  // Cert generation & Completion loading state per event
  const [generatingCertId, setGeneratingCertId] = useState<string | null>(null);
  const [completingCertId, setCompletingCertId] = useState<string | null>(null);

  const handleGenerateCertificates = async (eventId: string) => {
    try {
      setGeneratingCertId(eventId);
      const certs = await generateEmsCertificates(eventId);
      toast.success(`Berjaya menjana ${certs.length} e-sijil secara automatik!`);
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menjana e-sijil.');
    } finally {
      setGeneratingCertId(null);
    }
  };

  const handleCompleteEvent = async (eventId: string) => {
    try {
      setCompletingCertId(eventId);
      await completeEmsEvent(eventId);
      toast.success('Acara ditanda SELESAI & e-sijil berjaya dijana!');
      loadEvents();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menandakan acara selesai.');
    } finally {
      setCompletingCertId(null);
    }
  };

  // Lucky Draw Modal State
  const [luckyDrawModalOpen, setLuckyDrawModalOpen] = useState(false);
  const [selectedLuckyDrawEvent, setSelectedLuckyDrawEvent] = useState<EmsEvent | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchEmsEvents(activeTab);
      setEvents(data);
    } catch (err: any) {
      console.error('[EMS] Error loading events:', err);
      toast.error(`Gagal memuatkan acara: ${err?.message || 'Ralat tidak diketahui'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [activeTab]);

  // Load Jury Codes when modal opens
  const openJuryModal = async (event: EmsEvent) => {
    setJuryModalEvent(event);
    const randomCode = 'JURI-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    setJuryForm({
      code: randomCode,
      jury_name: '',
      organization: '',
      assigned_categories: '',
      assigned_booths: '',
    });
    try {
      setLoadingJuryCodes(true);
      const { data, error } = await supabase
        .from('ems_jury_codes')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setJuryCodes(data || []);
    } catch (err: any) {
      toast.error('Gagal memuatkan senarai kod juri');
    } finally {
      setLoadingJuryCodes(false);
    }
  };

  const handleCreateJuryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!juryModalEvent) return;
    if (!juryForm.code.trim()) {
      toast.error('Sila masukkan kod juri.');
      return;
    }

    try {
      setIsSubmittingJury(true);
      const categoriesArray = juryForm.assigned_categories
        ? juryForm.assigned_categories.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;
      const boothsArray = juryForm.assigned_booths
        ? juryForm.assigned_booths.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      const created = await createJuryCode(juryModalEvent.id, {
        code: juryForm.code,
        jury_name: juryForm.jury_name,
        organization: juryForm.organization,
        assigned_categories: categoriesArray,
        assigned_booths: boothsArray,
      });

      toast.success(`Kod Juri ${created.code} berjaya dicipta!`);
      setJuryCodes((prev) => [created, ...prev]);

      // Reset form with new code suggestion
      const newRandomCode = 'JURI-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      setJuryForm({
        code: newRandomCode,
        jury_name: '',
        organization: '',
        assigned_categories: '',
        assigned_booths: '',
      });
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mencipta kod juri');
    } finally {
      setIsSubmittingJury(false);
    }
  };

  // Open Tie Breaker Modal
  const openTieModal = async (event: EmsEvent) => {
    setTieModalEvent(event);
    setSelectedWinnerId('');
    try {
      setLoadingLeaderboard(true);
      const data = await fetchEmsLeaderboard(event.id);
      setLeaderboard(data);
      const tiedWinner = data.find((d) => d.is_tie_winner);
      if (tiedWinner) {
        setSelectedWinnerId(tiedWinner.participant.id);
      }
    } catch (err: any) {
      toast.error('Gagal memuatkan papan kedudukan');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleResolveTie = async () => {
    if (!tieModalEvent || !selectedWinnerId) {
      toast.error('Sila pilih pasukan/peserta pemenang.');
      return;
    }
    try {
      setIsResolvingTie(true);
      await resolveTieWinner(tieModalEvent.id, selectedWinnerId);
      toast.success('Keputusan tie-breaker berjaya dikemaskini!');
      setTieModalEvent(null);
      loadEvents();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menetapkan pemenang seret');
    } finally {
      setIsResolvingTie(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">Draf</span>;
      case 'PENDING_APPROVAL':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">Menunggu Kelulusan</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Diluluskan</span>;
      case 'ACTIVE':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Sedang Berlangsung</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">Selesai</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Ditolak</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  const registrationUrl = (eventId: string) => `${window.location.origin}/ems/e/${eventId}/register`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 pb-28 md:pb-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Pengurusan Acara & Pertandingan (EMS)
              </h1>
              <p className="text-sm text-slate-400">
                Papan pemuka pengurusan acara, penjanaan kod juri, QR pendaftaran & e-sijil.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedLuckyDrawEvent(null);
              setLuckyDrawModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-xs uppercase tracking-wider"
          >
            <Gift className="w-4 h-4 text-slate-950" />
            <span>Cabutan Bertuah 🎰</span>
          </button>
          {canCreateEvent && (
            <button
              onClick={() => navigate('/ems/event/new')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>Cipta Acara Baharu</span>
            </button>
          )}
        </div>
      </div>

      {/* Super Admin Approval Access Banner */}
      {isSuperAdmin && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-amber-200">Semakan Kelulusan Acara HQ (Super Admin)</h3>
              <p className="text-xs text-amber-300/80">
                Anda mempunyai akses pentadbir mutlak untuk meneliti dan meluluskan borang acara baharu.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/ems/approvals')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md shrink-0"
          >
            Semakan Kelulusan HQ
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
        {[
          { key: 'ALL', label: 'Semua Acara' },
          { key: 'PENDING_APPROVAL', label: 'Pending Kelulusan' },
          { key: 'APPROVED', label: 'Diluluskan' },
          { key: 'DRAFT', label: 'Draf' },
          { key: 'COMPLETED', label: 'Selesai' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Event Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-indigo-400" />
          <p className="text-sm font-semibold">Memuatkan senarai acara...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/50 border border-slate-800 rounded-3xl text-center">
          <AlertCircle className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Tiada Acara Dijumpai</h3>
          <p className="text-xs text-slate-400 max-w-md mb-6">
            Belum ada acara yang didaftarkan untuk status ini. Sila cipta acara baharu untuk memulakan pengurusan pertandingan.
          </p>
          {canCreateEvent && (
            <button
              onClick={() => navigate('/ems/event/new')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all"
            >
              + Cipta Acara Baharu
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-indigo-500/5 space-y-4"
            >
              <div>
                {/* Status & Mode */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {getStatusBadge(event.status)}
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-slate-800 text-slate-300">
                    {event.event_mode === 'TEAM' ? 'Pasukan / Booth' : 'Individu'}
                  </span>
                </div>

                {/* Title & Category */}
                <h2 className="text-lg font-bold text-white line-clamp-2 mb-1">{event.title}</h2>
                {event.category && (
                  <span className="inline-block text-xs font-semibold text-indigo-400 mb-3">
                    {event.category}
                  </span>
                )}

                {/* Description */}
                {event.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {event.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                  {event.event_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{new Date(event.event_date).toLocaleString('ms-MY')}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.creator?.full_name && (
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Anjuran: {event.creator.full_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-800 pt-4 space-y-2">
                {canCreateEvent ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => navigate(`/ems/event/${event.id}/edit`)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Sunting</span>
                      </button>

                      <button
                        onClick={() => setQrModalEvent(event)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-xs transition-all"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Pautan QR</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openJuryModal(event)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs transition-all"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Jana Kod Juri</span>
                      </button>

                      <button
                        onClick={() => navigate(`/ems/leaderboard/${event.id}`)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 font-semibold text-xs border border-indigo-800/50 transition-all"
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>Leaderboard</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => navigate(`/ems/checkin/${event.id}`)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold text-xs transition-all"
                      >
                        <Scan className="w-3.5 h-3.5" />
                        <span>Check-In</span>
                      </button>

                      <button
                        onClick={() => openTieModal(event)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold text-xs transition-all"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Tie-Breaker</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedLuckyDrawEvent(event);
                        setLuckyDrawModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 text-amber-300 border border-amber-500/30 font-semibold text-xs transition-all"
                    >
                      <Gift className="w-4 h-4 text-amber-400" />
                      <span>Roda Cabutan Bertuah</span>
                    </button>

                    {event.status === 'APPROVED' && (
                      <button
                        onClick={() => handleCompleteEvent(event.id)}
                        disabled={completingCertId === event.id}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {completingCertId === event.id ? 'Menanda Selesai...' : 'Tanda Acara Selesai (COMPLETED)'}
                        </span>
                      </button>
                    )}

                    {event.status === 'COMPLETED' && (
                      <button
                        onClick={() => handleGenerateCertificates(event.id)}
                        disabled={generatingCertId === event.id}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-teal-600/20 disabled:opacity-50"
                      >
                        <Award className="w-4 h-4" />
                        <span>
                          {generatingCertId === event.id ? 'Menjana E-Sijil...' : 'Jana E-Sijil'}
                        </span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => navigate(`/ems/e/${event.id}/register`)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Daftar Peserta</span>
                      </button>

                      <button
                        onClick={() => navigate(`/ems/leaderboard/${event.id}`)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-xs border border-slate-700 transition-all"
                      >
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>Lihat Keputusan</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedLuckyDrawEvent(event);
                        setLuckyDrawModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 text-amber-300 border border-amber-500/30 font-semibold text-xs transition-all"
                    >
                      <Gift className="w-4 h-4 text-amber-400" />
                      <span>Roda Cabutan Bertuah</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. Modal QR Code Pendaftaran */}
      {/* ============================================================ */}
      {qrModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => {
                setQrModalEvent(null);
                setCopiedLink(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-white">QR Code Pendaftaran</h3>
              <p className="text-xs text-slate-400">{qrModalEvent.title}</p>
            </div>

            {/* QR Code Render */}
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner">
              <QRCodeSVG
                value={registrationUrl(qrModalEvent.id)}
                size={200}
                bgColor="#FFFFFF"
                fgColor="#0F172A"
                level="H"
              />
              <p className="text-[10px] text-slate-500 font-mono mt-3 text-center break-all">
                {registrationUrl(qrModalEvent.id)}
              </p>
            </div>

            {/* Copy Link Button */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(registrationUrl(qrModalEvent.id));
                setCopiedLink(true);
                toast.success('Pautan pendaftaran disalin!');
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Berjaya Disalin!' : 'Salin Pautan Pendaftaran'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. Modal Jana Kod Juri */}
      {/* ============================================================ */}
      {juryModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl my-8 relative">
            <button
              onClick={() => setJuryModalEvent(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Key className="w-5 h-5" />
                <h3 className="text-xl font-bold text-white">Jana Kod Akses Juri</h3>
              </div>
              <p className="text-xs text-slate-400">Acara: {juryModalEvent.title}</p>
            </div>

            {/* Form Cipta Kod Juri */}
            <form onSubmit={handleCreateJuryCode} className="space-y-4 border-b border-slate-800 pb-6">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Kod Akses Juri <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={juryForm.code}
                    onChange={(e) => setJuryForm({ ...juryForm, code: e.target.value.toUpperCase() })}
                    placeholder="Contoh: JURI-101"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm uppercase focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const rnd = 'JURI-' + Math.random().toString(36).substring(2, 6).toUpperCase();
                      setJuryForm({ ...juryForm, code: rnd });
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Auto
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nama Juri</label>
                  <input
                    type="text"
                    value={juryForm.jury_name}
                    onChange={(e) => setJuryForm({ ...juryForm, jury_name: e.target.value })}
                    placeholder="e.g. Dr. Ahmad Hassan"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Organisasi / Jabatan</label>
                  <input
                    type="text"
                    value={juryForm.organization}
                    onChange={(e) => setJuryForm({ ...juryForm, organization: e.target.value })}
                    placeholder="e.g. JTM POLISAS"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Kategori Ditugaskan (Asingkan dengan koma)
                </label>
                <input
                  type="text"
                  value={juryForm.assigned_categories}
                  onChange={(e) => setJuryForm({ ...juryForm, assigned_categories: e.target.value })}
                  placeholder="e.g. Inovasi, Keusahawanan"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Booth Ditugaskan (Asingkan dengan koma)
                </label>
                <input
                  type="text"
                  value={juryForm.assigned_booths}
                  onChange={(e) => setJuryForm({ ...juryForm, assigned_booths: e.target.value })}
                  placeholder="e.g. Booth 1, Booth 2"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingJury}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {isSubmittingJury ? 'Mencipta Kod Juri...' : '+ Cipta Kod Juri'}
              </button>
            </form>

            {/* Senarai Kod Juri Sedia Ada */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Senarai Kod Juri Aktif ({juryCodes.length})
              </h4>
              {loadingJuryCodes ? (
                <p className="text-xs text-slate-500 animate-pulse">Memuatkan kod juri...</p>
              ) : juryCodes.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Belum ada kod juri dicipta.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {juryCodes.map((j) => (
                    <div
                      key={j.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400 text-sm">
                            {j.code}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                              (j.is_active ?? true)
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {(j.is_active ?? true) ? 'Aktif' : 'Nyahaktif'}
                          </span>
                        </div>
                        {j.jury_name && (
                          <span className="text-slate-300 block mt-0.5">{j.jury_name}</span>
                        )}
                        {j.organization && (
                          <span className="text-[10px] text-slate-500 block">{j.organization}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const newActive = !(j.is_active ?? true);
                              await toggleJuryCodeActive(j.id, newActive);
                              setJuryCodes((prev) =>
                                prev.map((item) =>
                                  item.id === j.id ? { ...item, is_active: newActive } : item
                                )
                              );
                              toast.success(
                                `Kod Juri ${j.code} kini ${newActive ? 'Aktif' : 'Nyahaktif'}`
                              );
                            } catch (err: any) {
                              toast.error(err.message || 'Gagal mengubah status kod juri');
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                            (j.is_active ?? true)
                              ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30'
                          }`}
                        >
                          {(j.is_active ?? true) ? 'Nyahaktif' : 'Aktifkan'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(j.code);
                            setCopiedCodeId(j.id);
                            toast.success(`Kod ${j.code} disalin!`);
                            setTimeout(() => setCopiedCodeId(null), 2000);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] flex items-center gap-1 transition-all"
                        >
                          {copiedCodeId === j.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedCodeId === j.id ? 'Disalin' : 'Salin'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`Adakah anda pasti untuk memadam kod juri ${j.code}?`))
                              return;
                            try {
                              await deleteJuryCode(j.id);
                              setJuryCodes((prev) => prev.filter((item) => item.id !== j.id));
                              toast.success(`Kod Juri ${j.code} berjaya dipadam!`);
                            } catch (err: any) {
                              toast.error(err.message || 'Gagal memadam kod juri');
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                          title="Padam Kod Juri"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. Modal Tie-Breaker (Pemenang Seret) */}
      {/* ============================================================ */}
      {tieModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setTieModalEvent(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-rose-400 mb-1">
                <Trophy className="w-5 h-5" />
                <h3 className="text-xl font-bold text-white">Penentuan Pemenang (Tie-Breaker)</h3>
              </div>
              <p className="text-xs text-slate-400">
                Pilih pemenang manual bagi pasukan/peserta yang mempunyai keputusan markah terikat.
              </p>
            </div>

            {loadingLeaderboard ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                Memuatkan kedudukan keputusan...
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                Tiada peserta berdaftar ditemui untuk acara ini.
              </p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {leaderboard.map((item) => {
                  const isSelected = selectedWinnerId === item.participant.id;
                  return (
                    <div
                      key={item.participant.id}
                      onClick={() => setSelectedWinnerId(item.participant.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-950/60 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">
                            {item.participant.team_name || item.participant.leader_name}
                          </span>
                          {item.is_tied && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              Terikat (Tie)
                            </span>
                          )}
                          {item.is_tie_winner && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Pemenang Disahkan
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Ketua: {item.participant.leader_name} | Markah Purata: {item.average_score}
                        </p>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-600 text-white'
                            : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTieModalEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResolveTie}
                disabled={isResolvingTie || !selectedWinnerId}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {isResolvingTie ? 'Menyimpan...' : 'Sahkan Pemenang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lucky Draw Wheel Modal */}
      <EmsLuckyDrawModal
        isOpen={luckyDrawModalOpen}
        onClose={() => setLuckyDrawModalOpen(false)}
        eventId={selectedLuckyDrawEvent?.id}
        eventTitle={selectedLuckyDrawEvent?.title}
      />
    </div>
  );
}
