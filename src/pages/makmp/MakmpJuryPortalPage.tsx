import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Shield,
  KeyRound,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Filter,
  Sparkles,
  AlertTriangle,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Eye,
  Check,
  X,
  Award,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Building,
  FileCheck,
  Download,
  History,
} from 'lucide-react';
import {
  verifyJuryPin,
  fetchJuryAwardApplications,
  saveJuryAwardReview,
  markAwardInReview,
  unlockAwardReview,
  fetchReviewLog,
  calculateSuggestedMerit,
  PERINGKAT_OPTIONS,
  PENCAPAIAN_TYPE_OPTIONS,
} from '@/lib/makmp';
import type {
  MakmpJuryPin,
  MakmpEdition,
  MakmpSubmissionAward,
  MakmpSubmissionItem,
  MakmpSubmissionStatus,
  MakmpPeringkat,
  MakmpPencapaianType,
} from '@/types';
import { MakmpJppChrome, MakmpJppHeader } from '@/components/makmp/MakmpJppChrome';

const CANNED_REJECTION_REASONS = [
  'Fail laporan / sijil kabur atau tidak dapat dibaca.',
  'Laporan tidak mengikut templat rasmi yang ditetapkan.',
  'Sijil bukan atas nama pemohon atau nombor matrik tidak sepadan.',
  'Tiada bukti sokongan (seperti penyata jualan, SSM, atau foto pelaksanaan).',
  'Peringkat atau status pencapaian tidak sepadan dengan dokumen sokongan.',
  'Program/aktiviti diadakan di luar tempoh pengajian POLISAS yang sah.',
  'Dokumen telah dituntut sebelum ini atau mengandungi maklumat pendua.',
  'Penyertaan tidak memenuhi syarat kelayakan kategori anugerah ini.',
];

function getEmbeddableCertUrl(url: string): { embedUrl: string; isImage: boolean } {
  if (!url) return { embedUrl: '', isImage: false };
  const lower = url.toLowerCase();
  const isImg =
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.includes('/image');

  // Gantikan /view kepada /preview bagi pautan Google Drive untuk elak sekatan X-Frame-Options
  if (url.includes('drive.google.com/file/d/') && url.includes('/view')) {
    return { embedUrl: url.replace('/view', '/preview'), isImage: false };
  }
  return { embedUrl: url, isImage: isImg };
}

export default function MakmpJuryPortalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPin = searchParams.get('pin') || '';

  // Auth / PIN State
  const [pinInput, setPinInput] = useState(urlPin);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [juryPin, setJuryPin] = useState<MakmpJuryPin | null>(null);
  const [edition, setEdition] = useState<MakmpEdition | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // Multi-Award Applications Queue
  const [awardApplications, setAwardApplications] = useState<MakmpSubmissionAward[]>([]);
  const [loadingAwards, setLoadingAwards] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategoryGroup, setFilterCategoryGroup] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Review Workbench Modal
  const [activeAward, setActiveAward] = useState<MakmpSubmissionAward | null>(null);
  const [reviewItems, setReviewItems] = useState<
    Array<{
      id: string;
      document_type?: string;
      merit_awarded: number;
      is_verified: boolean;
      peringkat: MakmpPeringkat;
      pencapaian_type: MakmpPencapaianType;
    }>
  >([]);
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [reviewToast, setReviewToast] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [reviewLog, setReviewLog] = useState<any[]>([]);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);

  // Fullscreen Preview & Zoom State
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Semak PIN dari sessionStorage atau URL semasa mula
  useEffect(() => {
    const savedPin = sessionStorage.getItem('makmp_jury_pin') || urlPin;
    if (savedPin) {
      setPinInput(savedPin);
      handleVerifyPin(savedPin);
    }
  }, []);

  const handleVerifyPin = async (pinToTest: string) => {
    const clean = pinToTest.trim();
    if (!clean) return;

    setIsVerifyingPin(true);
    setPinError(null);

    try {
      const res = await verifyJuryPin(clean);
      if (!res.isValid || !res.pinData || !res.edition) {
        setPinError(res.message || 'Kod PIN tidak sah.');
        sessionStorage.removeItem('makmp_jury_pin');
      } else {
        setJuryPin(res.pinData);
        setEdition(res.edition);
        sessionStorage.setItem('makmp_jury_pin', clean);
        loadApplications(res.edition.id, res.pinData.assigned_categories || [], res.pinData.pin_code);
      }
    } catch (err: any) {
      setPinError('Ralat sambungan: ' + err.message);
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const loadApplications = async (editionId: string, assignedCats: string[], pinCode?: string) => {
    setLoadingAwards(true);
    try {
      const data = await fetchJuryAwardApplications(editionId, assignedCats, pinCode);
      setAwardApplications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAwards(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('makmp_jury_pin');
    setJuryPin(null);
    setEdition(null);
    setAwardApplications([]);
    setActiveAward(null);
  };

  // Buka dialog semakan bagi permohonan anugerah terpilih
  const handleOpenReview = (awApp: MakmpSubmissionAward) => {
    setActiveAward(awApp);
    setReviewNotes(awApp.review_notes || '');
    setRejectionReason(awApp.rejection_reason || '');

    // Bila juri buka anugerah yang masih MENUNGGU, auto tanda DALAM_SEMAKAN
    // supaya student nampak permohonan mereka sedang disemak (bukan terus
    // lompat MENUNGGU -> DISAHKAN/DITOLAK).
    if (awApp.status === 'MENUNGGU') {
      markAwardInReview(awApp.id, juryPin?.pin_code).then((ok) => {
        if (ok) {
          setAwardApplications((prev) =>
            prev.map((a) => (a.id === awApp.id ? { ...a, status: 'DALAM_SEMAKAN' as MakmpSubmissionStatus } : a))
          );
        }
      });
    }

    const items = (awApp.items || []).map((item) => ({
      id: item.id,
      document_type: item.document_type || 'SIJIL',
      merit_awarded: item.merit_awarded > 0 ? item.merit_awarded : (item.merit_suggested || 3),
      // Untuk award yang BELUM selesai disemak, default tick = true (mudahkan juri).
      // Untuk award yang dah DISAHKAN/DITOLAK, hormati is_verified sebenar dari DB
      // supaya refresh tak auto-accept semula dokumen yang di-untick.
      is_verified:
        awApp.status === 'DISAHKAN' || awApp.status === 'DITOLAK'
          ? item.is_verified === true
          : true,
      peringkat: item.peringkat,
      pencapaian_type: item.pencapaian_type,
    }));
    setReviewItems(items);

    if (awApp.items && awApp.items.length > 0) {
      setSelectedDocUrl(awApp.items[0].drive_view_url);
    } else {
      setSelectedDocUrl(null);
    }

    // Load log buka semula bagi award ini (untuk tunjuk kepada juri)
    fetchReviewLog(awApp.id).then((log) => setReviewLog(log)).catch(() => setReviewLog([]));
  };

  // Kemaskini matriks / status verifikasi item
  const handleUpdateItemReview = (
    id: string,
    field: 'merit_awarded' | 'is_verified' | 'peringkat' | 'pencapaian_type',
    value: any
  ) => {
    setReviewItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'peringkat' || field === 'pencapaian_type') {
          updated.merit_awarded = calculateSuggestedMerit(
            field === 'peringkat' ? value : item.peringkat,
            field === 'pencapaian_type' ? value : item.pencapaian_type
          );
        }
        return updated;
      })
    );
  };

  // Jumlah merit semasa semakan
  const currentTotalMerit = reviewItems
    .filter((i) => i.is_verified)
    .reduce((sum, i) => sum + (Number(i.merit_awarded) || 0), 0);

  // Simpan Keputusan & Auto-pindah ke Permohonan Seterusnya
  const handleSaveDecision = async (status: MakmpSubmissionStatus) => {
    if (!activeAward || !activeAward.submission) return;

    // LOCK: elak re-edit award yang dah selesai disemak (DISAHKAN/DITOLAK).
    if (activeAward.status === 'DISAHKAN' || activeAward.status === 'DITOLAK') {
      alert('Permohonan ini telah selesai disemak dan dikunci. Hubungi pentadbir untuk sebarang pembetulan.');
      return;
    }

    const finalReason = rejectionReason.trim() || reviewNotes.trim() || (status === 'DITOLAK' ? 'Penyertaan tidak memenuhi syarat kelayakan kategori anugerah ini.' : '');

    if (status === 'DITOLAK' && !finalReason) {
      alert('Sila pilih atau tulis sebab penolakan permohonan.');
      return;
    }

    setIsSavingReview(true);
    try {
      const res = await saveJuryAwardReview({
        awardApplicationId: activeAward.id,
        submissionId: activeAward.submission.id,
        pinId: juryPin?.id,
        pinCode: juryPin?.pin_code,
        status,
        reviewNotes,
        rejectionReason: finalReason,
        items: reviewItems.map((r) => ({
          id: r.id,
          merit_awarded: r.merit_awarded,
          is_verified: r.is_verified,
        })),
      });

      if (!res.success) {
        alert('Gagal menyimpan keputusan: ' + res.message);
        return;
      }

      setReviewToast(
        `Permohonan "${activeAward.award?.name}" bagi ${activeAward.submission.full_name} telah ${
          status === 'DISAHKAN' ? 'DILULUSKAN' : 'DITOLAK'
        }.`
      );
      setTimeout(() => setReviewToast(null), 3000);

      // Kemaskini state senarai permohonan anugerah
      const updatedList = awardApplications.map((a) =>
        a.id === activeAward.id
          ? {
              ...a,
              status,
              total_merit_granted: status === 'DISAHKAN' ? currentTotalMerit : 0,
              review_notes: reviewNotes,
              rejection_reason: status === 'DITOLAK' ? rejectionReason : null,
            }
          : a
      );
      setAwardApplications(updatedList);

      // 1-Click Fast Navigation ke permohonan belum selesai seterusnya
      const currentIndex = updatedList.findIndex((a) => a.id === activeAward.id);
      const nextPending = updatedList
        .slice(currentIndex + 1)
        .concat(updatedList.slice(0, currentIndex))
        .find((a) => a.status === 'MENUNGGU' || a.status === 'DALAM_SEMAKAN');

      if (nextPending) {
        handleOpenReview(nextPending);
      } else {
        setActiveAward(null);
      }
    } catch (err: any) {
      alert('Ralat: ' + err.message);
    } finally {
      setIsSavingReview(false);
    }
  };

  // Buka semula semakan (juri boleh unlock sendiri, direkod dalam log)
  const handleUnlockReview = async () => {
    if (!activeAward) return;
    if (!unlockReason.trim()) {
      alert('Sila nyatakan sebab membuka semula (untuk rekod log).');
      return;
    }

    setIsUnlocking(true);
    try {
      const res = await unlockAwardReview(juryPin?.pin_code || '', activeAward.id, unlockReason.trim());
      if (!res.success) {
        alert('Gagal membuka semula: ' + res.message);
        return;
      }

      setShowUnlockDialog(false);
      setUnlockReason('');
      setReviewToast(`Permohonan "${activeAward.award?.name}" telah dibuka semula untuk semakan (kali ke-${res.unlockCount ?? '?'}).`);
      setTimeout(() => setReviewToast(null), 4000);

      // Muat semula senarai + log
      await loadApplications(edition?.id || '', juryPin?.assigned_categories || [], juryPin?.pin_code);
      const log = await fetchReviewLog(activeAward.id);
      setReviewLog(log);

      // Kemaskini status activeAward ke DALAM_SEMAKAN supaya form boleh edit semula
      setActiveAward((prev) => (prev ? { ...prev, status: 'DALAM_SEMAKAN' as MakmpSubmissionStatus } : prev));
    } catch (err: any) {
      alert('Ralat: ' + err.message);
    } finally {
      setIsUnlocking(false);
    }
  };

  // Tapis kategori yang ada dalam senarai juri
  const uniqueCategoryGroups = Array.from(
    new Set(awardApplications.map((a) => a.award?.category_group).filter(Boolean))
  );

  // Filter queue
  const filteredAwards = awardApplications.filter((a) => {
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    if (filterCategoryGroup !== 'ALL' && a.award?.category_group !== filterCategoryGroup) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const sub = a.submission;
      const aw = a.award;
      return (
        (sub?.full_name || '').toLowerCase().includes(q) ||
        (sub?.matric_no || '').toLowerCase().includes(q) ||
        (sub?.tracking_code || '').toLowerCase().includes(q) ||
        (aw?.name || '').toLowerCase().includes(q) ||
        (a.entity_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ==========================================================================
  // JIKA BELUM VERIFIKASI PIN
  // ==========================================================================
  if (!juryPin || !edition) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-6 md:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Portal Pegawai Penilai MAKMP</h1>
            <p className="text-xs text-slate-400">
              Sila masukkan Kod PIN 6-Digit yang diperuntukkan bagi kategori anugerah anda untuk memulakan semakan.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyPin(pinInput);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kod PIN Juri (6-Digit)
              </label>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-2xl tracking-widest font-mono text-amber-400 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            {pinError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingPin || !pinInput.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm hover:brightness-110 shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isVerifyingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Sahkan PIN & Masuk</span>
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center">
            <Link to="/makmp" className="text-xs text-slate-500 hover:text-slate-300 transition">
              ← Kembali ke Borang Pelajar MAKMP
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // DASHBOARD JURI YANG SAH
  // ==========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">

      <MakmpJppHeader subtitle="Portal Juri" />
      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs shadow-inner">
              JURI
            </div>
            <div>
              <div className="font-bold text-xs md:text-sm text-white flex items-center gap-2">
                <span>{juryPin.jury_name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono border border-slate-700">
                  MAKMP {edition.year}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span>{juryPin.organization || 'Panel Penilai Rasmi'}</span>
                <span>•</span>
                <span className="text-amber-400 font-medium">
                  {juryPin.assigned_categories?.includes('ALL')
                    ? 'Semua Kategori'
                    : juryPin.assigned_categories?.join(', ')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadApplications(edition.id, juryPin.assigned_categories || [], juryPin.pin_code)}
              title="Muat Semula Senarai"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAwards ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-semibold hover:bg-rose-900/60 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pt-6 pb-28 md:pb-12 space-y-6">
        {/* Toast Notifikasi */}
        {reviewToast && (
          <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 shadow-xl animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{reviewToast}</span>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {['ALL', 'MENUNGGU', 'DALAM_SEMAKAN', 'DISAHKAN', 'DITOLAK'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  filterStatus === st
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'Semua Status' : st}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Filter Category Group dropdown jika ada pelbagai */}
            {uniqueCategoryGroups.length > 1 && (
              <select
                value={filterCategoryGroup}
                onChange={(e) => setFilterCategoryGroup(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 transition"
              >
                <option value="ALL">Semua Kumpulan Kategori</option>
                {uniqueCategoryGroups.map((grp) => (
                  <option key={grp} value={grp as string}>
                    {grp}
                  </option>
                ))}
              </select>
            )}

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Calon / Matrik / Anugerah..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Senarai Queue Permohonan Anugerah */}
        {loadingAwards ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Memuat turun permohonan anugerah pelajar...</p>
          </div>
        ) : filteredAwards.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
            <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">Tiada Permohonan Anugerah Dijumpai</h3>
            <p className="text-xs text-slate-500 mt-1">
              {filterStatus !== 'ALL'
                ? `Tiada rekod dengan status "${filterStatus}".`
                : 'Belum ada pelajar yang memohon bagi kategori anugerah yang diperuntukkan kepada anda.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAwards.map((awApp) => {
              const sub = awApp.submission;
              const aw = awApp.award;
              const docCount = (awApp.items || []).length;
              const isReportType = aw?.doc_requirement_type === 'REPORT_AND_EVIDENCE';

              return (
                <div
                  key={awApp.id}
                  data-testid="jury-award-card"
                  data-tracking-code={sub?.tracking_code || ''}
                  onClick={() => handleOpenReview(awApp)}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 cursor-pointer transition shadow-sm hover:shadow-xl space-y-3 group"
                >
                  {/* Top Bar: Tracking code + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-amber-400">
                      {sub?.tracking_code || 'MAKMP-2026'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        awApp.status === 'DISAHKAN'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : awApp.status === 'DITOLAK'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      }`}
                    >
                      {awApp.status}
                    </span>
                  </div>

                  {/* Award Name & Group */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {aw?.category_group || 'ANUGERAH MAKMP'}
                    </div>
                    <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition line-clamp-1 mt-0.5">
                      {aw?.name}
                    </h4>
                  </div>

                  {/* Candidate / Entity Details */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                    <div className="text-xs font-semibold text-white truncate">
                      {sub?.full_name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {sub?.matric_no} • {sub?.department}
                    </div>

                    {awApp.entity_name && (
                      <div className="text-[11px] text-purple-300 pt-1 border-t border-slate-800/60 flex items-center gap-1.5">
                        <Building className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {awApp.entity_name} {awApp.applicant_role ? `(${awApp.applicant_role})` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer Stats */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      {isReportType ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-medium">
                          Laporan & Bukti
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                          Matriks Sijil
                        </span>
                      )}
                      <span>{docCount} Dokumen</span>
                    </div>

                    {awApp.status === 'DISAHKAN' ? (
                      <span className="font-bold text-emerald-400">+{awApp.total_merit_granted} Merit</span>
                    ) : (
                      <span className="text-slate-500 text-[11px] flex items-center gap-0.5 group-hover:text-amber-400 transition">
                        Semak <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ==================================================================== */}
      {/* MODAL / SPLIT-VIEW REVIEW WORKBENCH                                  */}
      {/* ==================================================================== */}
      {activeAward && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-7xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header Dialog */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-400">
                    {activeAward.submission?.tracking_code}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
                    {activeAward.award?.category_group}
                  </span>
                  {activeAward.award?.target_type === 'ENTITY' && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {activeAward.entity_name || 'Entiti / Projek'}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white">
                  {activeAward.award?.name} — {activeAward.submission?.full_name} ({activeAward.submission?.matric_no})
                </h3>
              </div>

              <button
                onClick={() => setActiveAward(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split View Content */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-y-auto">
              {/* Sebelah Kiri: Preview Dokumen / Laporan / Sijil */}
              <div className="p-4 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col bg-slate-950/60">
                {/* Dokumen Tab Switcher */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-[70%]">
                    {(activeAward.items || []).map((doc, idx) => (
                      <button
                        key={doc.id || idx}
                        type="button"
                        onClick={() => setSelectedDocUrl(doc.drive_view_url)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                          selectedDocUrl === doc.drive_view_url
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800/80 text-slate-300 hover:text-white'
                        }`}
                      >
                        {doc.source === 'E_AKADEMIK' ? (
                          <Sparkles className="w-3 h-3" />
                        ) : (
                          <FileText className="w-3 h-3" />
                        )}
                        <span>
                          {doc.document_type === 'LAPORAN'
                            ? `1. Laporan PDF`
                            : `${idx + 1}. ${doc.document_type || 'Dokumen'}`}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedDocUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsFullscreenPreview(true)}
                          className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition flex items-center gap-1"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden sm:inline">Skrin Penuh</span>
                        </button>
                        <a
                          href={selectedDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Tab Asal</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Info Templat Laporan jika ada */}
                {activeAward.award?.template_url && (
                  <div className="mb-2 p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/20 text-sky-200 text-xs flex items-center justify-between gap-2">
                    <span className="text-[11px] truncate">
                      Templat Rasmi: {activeAward.award.template_name || 'Format Laporan Standard'}
                    </span>
                    <a
                      href={activeAward.award.template_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-[10px] shrink-0 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Rujuk Templat</span>
                    </a>
                  </div>
                )}

                {/* Viewer Box */}
                <div className="flex-1 min-h-[360px] lg:min-h-[500px] rounded-xl border border-slate-800 overflow-hidden bg-slate-900 flex items-center justify-center relative">
                  {selectedDocUrl ? (
                    (() => {
                      const { embedUrl, isImage } = getEmbeddableCertUrl(selectedDocUrl);
                      if (isImage) {
                        return (
                          <div
                            className="w-full h-full flex items-center justify-center p-2 overflow-auto bg-slate-950 cursor-pointer"
                            onClick={() => setIsFullscreenPreview(true)}
                            title="Klik untuk skrin penuh"
                          >
                            <img
                              src={selectedDocUrl}
                              alt="Dokumen"
                              className="max-w-full max-h-[480px] object-contain rounded shadow-lg hover:scale-[1.02] transition"
                            />
                          </div>
                        );
                      }
                      return (
                        <iframe
                          src={embedUrl}
                          title="Pratonton Dokumen"
                          className="w-full h-full border-none"
                          allow="autoplay"
                        />
                      );
                    })()
                  ) : (
                    <div className="text-center text-slate-500 text-xs">
                      Pilih dokumen dari senarai di atas untuk memulakan semakan.
                    </div>
                  )}
                </div>
              </div>

              {/* Sebelah Kanan: Semakan Item & Keputusan */}
              <div className="p-5 overflow-y-auto space-y-6">
                {/* Header Maklumat Anugerah */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Syarat Anugerah:</span>
                    <span className="text-xs font-bold text-amber-400">
                      Maksimum Merit: {activeAward.award?.max_merit || 50} Mata
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeAward.award?.doc_instructions || 'Sila semak dokumen sokongan yang dimuat naik.'}
                  </p>
                </div>

                {/* Senarai Dokumen / Sijil untuk Semakan */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Item Dokumen / Sijil ({reviewItems.length})
                    </h4>
                    <div className="text-xs font-bold text-amber-400">
                      Jumlah Merit Dinilai: {currentTotalMerit} Mata
                    </div>
                  </div>

                  <div className="space-y-4">
                    {activeAward.items?.map((item, idx) => {
                      const rItem = reviewItems.find((r) => r.id === item.id) || {
                        document_type: item.document_type || 'SIJIL',
                        merit_awarded: item.merit_suggested,
                        is_verified: true,
                        peringkat: item.peringkat,
                        pencapaian_type: item.pencapaian_type,
                      };

                      const isReportDoc = item.document_type === 'LAPORAN';

                      return (
                        <div
                          key={item.id}
                          className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 text-xs font-bold flex items-center justify-center mt-0.5 shrink-0">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                      item.document_type === 'LAPORAN'
                                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                        : item.document_type === 'BUKTI_SOKONGAN'
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    }`}
                                  >
                                    {item.document_type || 'SIJIL'}
                                  </span>
                                  {item.source === 'E_AKADEMIK' && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                      <Sparkles className="w-2.5 h-2.5" />
                                      <span>e-Akademik</span>
                                    </span>
                                  )}
                                  <span className="font-bold text-xs text-white">
                                    {item.nama_pencapaian}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                  Tuntutan Calon: {item.peringkat} • {item.pencapaian_type}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedDocUrl(item.drive_view_url)}
                              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-400 transition flex items-center gap-1 shrink-0"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat</span>
                            </button>
                          </div>

                          {/* Controls Penilaian Juri */}
                          {isReportDoc ? (
                            /* Layout Khas Laporan Projek */
                            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-300 font-medium">Markah Merit Laporan Projek:</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={activeAward.award?.max_merit || 50}
                                    value={rItem.merit_awarded}
                                    onChange={(e) =>
                                      handleUpdateItemReview(
                                        item.id,
                                        'merit_awarded',
                                        Number(e.target.value) || 0
                                      )
                                    }
                                    className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-center font-bold text-amber-400 text-xs"
                                  />
                                  <span className="text-slate-500 text-xs">/ {activeAward.award?.max_merit || 50}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Matriks Sijil Standard (Peringkat & Tahap) */
                            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">
                                  Peringkat Sah
                                </label>
                                <select
                                  value={rItem.peringkat}
                                  onChange={(e) =>
                                    handleUpdateItemReview(
                                      item.id,
                                      'peringkat',
                                      e.target.value as MakmpPeringkat
                                    )
                                  }
                                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                                >
                                  {PERINGKAT_OPTIONS.map((p) => (
                                    <option key={p.value} value={p.value}>
                                      {p.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">
                                  Tahap Sah
                                </label>
                                <select
                                  value={rItem.pencapaian_type}
                                  onChange={(e) =>
                                    handleUpdateItemReview(
                                      item.id,
                                      'pencapaian_type',
                                      e.target.value as MakmpPencapaianType
                                    )
                                  }
                                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                                >
                                  {PENCAPAIAN_TYPE_OPTIONS.map((pt) => (
                                    <option key={pt.value} value={pt.value}>
                                      {pt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Checkbox Pengesahan Dokumen */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                            <label className="flex items-center gap-2 cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={rItem.is_verified}
                                onChange={(e) =>
                                  handleUpdateItemReview(item.id, 'is_verified', e.target.checked)
                                }
                                className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700"
                              />
                              <span className={rItem.is_verified ? 'text-white' : 'text-slate-500'}>
                                {rItem.is_verified ? 'Dokumen Sah Diterima' : 'Dokumen Tidak Diterima'}
                              </span>
                            </label>

                            <div className="text-xs font-bold text-amber-400">
                              +{rItem.is_verified ? rItem.merit_awarded : 0} Merit
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Canned Rejection Reasons & Catatan */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Pilihan Cepat Sebab Tolak (jika menolak):
                    </label>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 transition"
                    >
                      <option value="">-- Pilih Sebab Penolakan Rasmi --</option>
                      {CANNED_REJECTION_REASONS.map((r, i) => (
                        <option key={i} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Catatan Tambahan Penilai:
                    </label>
                    <textarea
                      rows={2}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Catatan juri atau ulasan kepada calon..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                {/* Tindakan Keputusan (1-Click Review & Next) */}
                <div className="pt-2 flex flex-col gap-3">
                  {activeAward.status === 'DISAHKAN' || activeAward.status === 'DITOLAK' ? (
                    <div className="space-y-3">
                      {/* Sejarah buka semula (jika ada) */}
                      {reviewLog.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <History className="w-3.5 h-3.5 text-amber-400" />
                            <span>Sejarah Buka Semula ({reviewLog.length})</span>
                          </div>
                          {reviewLog.map((log, i) => (
                            <div key={log.id || i} className="text-xs text-slate-300 flex items-start gap-2">
                              <span className="text-amber-400 font-mono shrink-0">#{log.unlock_count}</span>
                              <span>
                                {log.jury_name || log.admin_name || 'Pentadbir'} — {log.previous_status} → DALAM_SEMAKAN
                                {log.reason ? ` • "${log.reason}"` : ''}
                                <span className="block text-[10px] text-slate-500">
                                  {new Date(log.created_at).toLocaleString('ms-MY')}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center gap-2 text-xs text-slate-300">
                        <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          Permohonan ini telah {activeAward.status === 'DISAHKAN' ? 'disahkan' : 'ditolak'}. Anda boleh buka semula jika perlu semakan semula.
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isUnlocking}
                        onClick={() => setShowUnlockDialog(true)}
                        className="w-full py-3 px-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold text-xs hover:bg-amber-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Buka Semula Semakan</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        disabled={isSavingReview}
                        onClick={() => handleSaveDecision('DITOLAK')}
                        className="flex-1 py-3 px-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 font-bold text-xs hover:bg-rose-900/80 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Tolak Anugerah Ini</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSavingReview}
                        onClick={() => handleSaveDecision('DISAHKAN')}
                        className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSavingReview ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>1-Click Sahkan & Seterusnya (+{currentTotalMerit} Merit)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* FULLSCREEN LIGHTBOX DOCUMENT VIEWER                                  */}
      {/* ==================================================================== */}
      {isFullscreenPreview && selectedDocUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col p-3 sm:p-6 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white shrink-0">
            <div className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm">Pemeriksaan Dokumen Skrin Penuh</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 3))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono flex items-center gap-1"
                title="Besarkan"
              >
                <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Zoom In</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono flex items-center gap-1"
                title="Kecilkan"
              >
                <ZoomOut className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Zoom Out</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Reset
              </button>
              <a
                href={selectedDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Tab Asal</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setIsFullscreenPreview(false);
                  setZoomLevel(1);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto p-2 sm:p-4">
            {getEmbeddableCertUrl(selectedDocUrl).isImage ? (
              <img
                src={selectedDocUrl}
                alt="Dokumen Fullscreen"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                className="max-w-full max-h-[85vh] object-contain transition-transform duration-150 rounded-lg shadow-2xl"
              />
            ) : (
              <iframe
                src={getEmbeddableCertUrl(selectedDocUrl).embedUrl}
                title="Fullscreen Dokumen"
                className="w-full h-full border-none rounded-xl bg-slate-900"
                allow="autoplay"
              />
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* DIALOG BUKA SEMULA SEMAKAN (JURI)                                    */}
      {/* ==================================================================== */}
      {showUnlockDialog && activeAward && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  Buka Semula Semakan
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {activeAward.award?.name} — {activeAward.submission?.full_name}
                </p>
              </div>
              <button
                onClick={() => { setShowUnlockDialog(false); setUnlockReason(''); }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Sebab Buka Semula (wajib — direkod dalam log):
              </label>
              <textarea
                rows={3}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="cth: Tersilap menandakan dokumen sah, perlu semak semula sijil #2..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
              ⚠️ Buka semula akan menolak semula merit (jika telah disahkan) dan reset semua tanda dokumen. Tindakan ini akan direkod dalam log sejarah semakan.
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowUnlockDialog(false); setUnlockReason(''); }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isUnlocking || !unlockReason.trim()}
                onClick={handleUnlockReview}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUnlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Buka Semula</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <MakmpJppChrome />
    </div>
  );
}
