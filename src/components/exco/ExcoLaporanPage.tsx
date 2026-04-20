// ============================================================
// ExcoLaporanPage — Template Universal untuk Laporan Exco JPP
// Guna sama mekanisma dengan LaporanPage.tsx
// Beza: query exco_unit (bukan club_id), auto-PDF key guna auto_pdf_{excoUnit}
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, RefreshCw, Lock, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { LaporanPreviewModal } from '@/components/reports/LaporanPreviewModal';
import { StatusChip } from '@/components/ui/StatusChip';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ms } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { pdf } from '@react-pdf/renderer';
import { LaporanPDFTemplate } from '@/components/reports/LaporanPDFTemplate';
import { uploadPdfToDrive } from '@/lib/driveUpload';
import { JPP_EXCO_POSITIONS, JPP_MT_POSITIONS } from '@/types';
import { useJppConfig } from '@/contexts/JppConfigContext';

// ─── PROPS ───────────────────────────────────────────────────────────────────
interface Props {
  excoUnit:   string;  // e.g. 'KEBAJIKAN'
  themeColor: string;
  excoLabel:  string;  // e.g. 'Exco Kebajikan & Pengaduan Awam'
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export function ExcoLaporanPage({ excoUnit, themeColor, excoLabel }: Props) {
  const { user, profile, isSuperAdmin } = useAuth();
  const { positionLabels } = useJppConfig();

  // ── Access ─────────────────────────────────────────────────────────────────
  const jppPos  = profile?.jpp_position as string | undefined;
  const jppUnit = profile?.jpp_unit as string | undefined;

  // Semua ahli exco dalam unit, MT yang oversee, atau SuperAdmin boleh submit
  const isExcoMember  = jppUnit === excoUnit && JPP_EXCO_POSITIONS.includes(jppPos as any);
  const isMTOversee   = JPP_MT_POSITIONS.includes(jppPos as any);
  const canSubmit     = isExcoMember || isMTOversee || isSuperAdmin;

  // ── State ─────────────────────────────────────────────────────────────────
  const [allowAutoPdf, setAllowAutoPdf]     = useState(true);
  const [targetMonth, setTargetMonth]       = useState(format(new Date(), 'yyyy-MM'));
  const [submitting, setSubmitting]         = useState(false);
  const [progress, setProgress]             = useState(0);
  const [reports, setReports]               = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [filterTab, setFilterTab]           = useState<'aktif' | 'arkib'>('aktif');
  const [previewData, setPreviewData]       = useState<any[]>([]);
  const [isPreviewOpen, setIsPreviewOpen]   = useState(false);
  const [jppLogoBase64, setJppLogoBase64]   = useState<string | undefined>(undefined);
  const [mtReviewer, setMtReviewer]         = useState<{ name: string; role: string } | null>(null);

  // ── Derived values ─────────────────────────────────────────────────────────
  const monthLabel = format(parseISO(`${targetMonth}-01`), 'MMMM yyyy', { locale: ms }).toUpperCase();

  // Jawatan penuh: "KETUA EXCO KELAB, PERSATUAN & PERPADUAN"
  const positionLabel = jppPos
    ? (positionLabels[jppPos] || jppPos).toUpperCase()
    : 'AHLI EXCO';
  // Gabung jawatan + nama unit exco supaya jadi "KETUA EXCO KELAB, PERSATUAN DAN PERPADUAN"
  const submitterRoleLabel = `${positionLabel} ${excoLabel.toUpperCase()}`;

  // Manual upload
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('club_reports')
      .select('*')
      .eq('exco_unit', excoUnit)
      .order('created_at', { ascending: false });
    if (!error) setReports(data || []);
    setLoading(false);
  };

  // ── Helper: URL → Base64 ─────────────────────────────────────────────────
  const urlToBase64 = async (url: string): Promise<string | undefined> => {
    try {
      const res  = await fetch(url);
      const blob = await res.blob();
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { return undefined; }
  };

  useEffect(() => {
    // Check auto-PDF toggle
    const checkSetting = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', `auto_pdf_${excoUnit}`)
        .single();
      if (data !== null) setAllowAutoPdf(data.value === true || data.value === 'true');
    };

    // Load JPP logo as base64 untuk PDF
    const loadJppLogo = async () => {
      const b64 = await urlToBase64('/Logo-JPP-Laporan.jpg');
      setJppLogoBase64(b64);
    };

    // Fetch MT yang oversees unit exco ini via jpp_mt_assignments table
    // (MT members mungkin tidak ada jpp_unit diset ke unit spesifik dalam profiles)
    const fetchMtReviewer = async () => {
      // Pendekatan 1: cari via jpp_mt_assignments (cara betul)
      const { data: assignData } = await supabase
        .from('jpp_mt_assignments')
        .select('mt_user_id')
        .eq('unit', excoUnit)
        .limit(1)
        .maybeSingle();

      if (assignData?.mt_user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, jpp_position')
          .eq('id', assignData.mt_user_id)
          .maybeSingle();

        if (profileData) {
          const roleLabel = positionLabels[profileData.jpp_position as string]
            || profileData.jpp_position
            || 'Majlis Tertinggi';
          setMtReviewer({ name: profileData.full_name || '—', role: roleLabel });
          return;
        }
      }

      // Fallback: cari dalam profiles (cara lama — jika ada jpp_unit diset)
      const mtPositions = ['YDP','TIMBALAN_YDP','NAIB_YDP','SETIAUSAHA_KERJA','SETIAUSAHA_KEHORMAT','BENDAHARI'];
      const { data } = await supabase
        .from('profiles')
        .select('full_name, jpp_position')
        .eq('jpp_unit', excoUnit)
        .in('jpp_position', mtPositions)
        .limit(1)
        .maybeSingle();
      if (data) {
        const roleLabel = positionLabels[data.jpp_position as string]
          || data.jpp_position
          || 'Majlis Tertinggi';
        setMtReviewer({ name: data.full_name || '—', role: roleLabel });
      }
    };

    checkSetting();
    loadJppLogo();
    fetchMtReviewer();
    loadReports();
  }, [excoUnit]);

  // ── Fetch preview data ────────────────────────────────────────────────────
  const fetchReportData = async (): Promise<any[]> => {
    const start = startOfMonth(parseISO(`${targetMonth}-01`)).toISOString();
    const end   = endOfMonth(parseISO(`${targetMonth}-01`)).toISOString();

    const { data: acts } = await supabase
      .from('club_activities')
      .select('id, title, description, status, start_date, end_date, location, budget, tindakan, image_urls')
      .eq('exco_unit', excoUnit)
      .eq('status', 'selesai')
      .eq('is_archived', false)
      .gte('start_date', start)
      .lte('start_date', end)
      .order('start_date', { ascending: true });

    if (!acts || acts.length === 0) return [];

    // Normalize ke format LaporanPDFTemplate
    return acts.map((a: any) => ({
      ...a,
      _source: 'aktiviti_exco',
    }));
  };

  // ── Auto-generate preview ─────────────────────────────────────────────────
  const handleAutoGenerateTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await fetchReportData();
      if (data.length === 0) {
        toast.error('Tiada aktiviti selesai pada bulan ini.');
        return;
      }
      setPreviewData(data);
      setIsPreviewOpen(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Confirm & generate PDF (dipanggil oleh LaporanPreviewModal.onSubmit) ──
  const handleConfirmGenerate = async () => {
    if (!user || previewData.length === 0) return;
    setSubmitting(true);
    setProgress(10);
    // NOTA: Modal menutup sendiri (onClose) selepas fungsi ini selesai.

    try {
      setProgress(40);

      const doc = (
        <LaporanPDFTemplate
          clubName={excoLabel}
          monthYear={monthLabel}
          activities={previewData}
          submitterName={profile?.full_name || undefined}
          submitterRole={submitterRoleLabel}
          submitterUnit={excoLabel}
          presidenName={mtReviewer?.name || '( Tiada MT Ditetapkan )'}
          reviewerRole={mtReviewer?.role || 'MAJLIS TERTINGGI'}
          reviewerUnit="JAWATANKUASA PERWAKILAN PELAJAR"
          clubLogoUrl={jppLogoBase64}
          isExco={true}
        />
      );

      const blob = await pdf(doc).toBlob();
      setProgress(70);

      const fileName = `Auto_Laporan_${excoUnit}_${targetMonth}_${Date.now()}`;
      const pdfFile  = new File([blob], `${fileName}.pdf`, { type: 'application/pdf' });
      const url      = await uploadPdfToDrive(pdfFile, `exco_${excoUnit.toLowerCase()}` as any, fileName);
      setProgress(90);

      const { error: dbError } = await supabase.from('club_reports').insert({
        exco_unit:    excoUnit,
        club_id:      null,
        submitted_by: user.id,
        report_type:  'Laporan Aktiviti',
        file_url:     url,
        file_name:    `Laporan Bulanan ${excoLabel} - ${monthLabel}.pdf`,
        status:       'Menunggu',
        is_archived:  false,
      });
      if (dbError) throw dbError;

      toast.success('Laporan berjaya dijana dan dihantar!');
      loadReports();
    } catch (err: any) {
      toast.error('Ralat: ' + err.message);
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  };

  // ── Manual upload ─────────────────────────────────────────────────────────
  const validateFile = (f: File) => {
    if (f.type !== 'application/pdf') { toast.error('Hanya fail PDF dibenarkan.'); return false; }
    if (f.size > 25 * 1024 * 1024) { toast.error('Fail terlalu besar. Had: 25MB'); return false; }
    return true;
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;
    setSubmitting(true); setProgress(20);
    try {
      const ts         = Date.now();
      const customName = `${excoUnit}_LaporanManual_${ts}`;
      setProgress(50);
      const url = await uploadPdfToDrive(file, `exco_${excoUnit.toLowerCase()}` as any, customName);
      setProgress(80);
      const { error } = await supabase.from('club_reports').insert({
        exco_unit:    excoUnit,
        club_id:      null,
        submitted_by: user.id,
        report_type:  'Laporan Aktiviti',
        file_url:     url,
        file_name:    file.name,
        status:       'Menunggu',
        is_archived:  false,
      });
      if (error) throw error;
      toast.success('Laporan dihantar!');
      setFile(null);
      loadReports();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false); setProgress(0);
    }
  };

  // ── Guard ─────────────────────────────────────────────────────────────────
  const activeReports  = reports.filter(r => !r.is_archived);
  const archivedRecs   = reports.filter(r => r.is_archived);
  const displayReports = filterTab === 'arkib' ? archivedRecs : activeReports;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: `${themeColor}20`, color: themeColor }}
            >
              {excoUnit}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 text-white/40">
              Laporan Exco
            </span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white leading-tight">Laporan</h1>
          <p className="text-sm text-white/40 mt-1 font-medium">{excoLabel}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Form submit */}
          <div className="lg:col-span-2">
            <div className="rounded-[2rem] p-6 bg-white/[0.03] border border-white/[0.06] space-y-6">
              <h2 className="font-black text-sm uppercase tracking-widest text-white/60">Hantar Laporan</h2>

              {!canSubmit ? (
                <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                  <div className="w-14 h-14 rounded-[1.5rem] bg-white/[0.04] flex items-center justify-center">
                    <Lock className="w-6 h-6 text-white/15" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Akses Terhad</p>
                  <p className="text-xs text-white/15 font-medium max-w-[200px] leading-relaxed">
                    Hanya Ketua Exco atau MT yang mengesahkan boleh menghantar laporan.
                  </p>
                </div>
              ) : (
                <>
                  {/* Auto-PDF section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5" style={{ color: themeColor }} />
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: themeColor }}>
                        Jana AutoPDF
                      </p>
                    </div>

                    {!allowAutoPdf && !isSuperAdmin ? (
                      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                        <Lock className="w-8 h-8 text-rose-400/50 mx-auto mb-2" />
                        <p className="text-xs font-black uppercase tracking-widest text-rose-400 leading-tight">
                          Janaan PDF Ditutup Sementara
                        </p>
                        <p className="text-[10px] text-rose-400/60 mt-1.5 font-medium leading-relaxed">
                          MT telah menutup fungsi ini buat masa ini.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleAutoGenerateTransition} className="space-y-3">
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[11px] text-white/30 font-medium">
                          Sistem akan menarik aktiviti 'Selesai' untuk bulan dipilih dan menjana PDF secara automatik.
                        </div>
                        <Input
                          type="month"
                          value={targetMonth}
                          onChange={e => setTargetMonth(e.target.value)}
                          className="h-12 rounded-2xl bg-white/[0.05] border-white/[0.07] text-white font-bold"
                        />
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="w-full h-12 font-black text-[10px] uppercase tracking-widest text-white rounded-2xl hover:scale-[1.02] active:scale-95 transition-all"
                          style={{ background: themeColor }}
                        >
                          {submitting ? 'Memuatkan...' : 'Pratonton & Jana'}
                        </Button>
                      </form>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/[0.05]" />
                    <span className="text-[10px] font-black uppercase text-white/20">atau</span>
                    <div className="flex-1 h-px bg-white/[0.05]" />
                  </div>

                  {/* Manual upload */}
                  <form onSubmit={handleManualSubmit} className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Muat Naik Manual (PDF)</p>
                    <div
                      onClick={() => fileRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f && validateFile(f)) setFile(f); }}
                      className={cn(
                        'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
                        dragOver ? 'border-white/30 bg-white/[0.05]' : file ? 'border-white/20 bg-white/[0.03]' : 'border-white/[0.07] bg-transparent hover:border-white/20'
                      )}
                    >
                      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f && validateFile(f)) setFile(f); }} />
                      {file
                        ? <p className="font-bold text-xs truncate" style={{ color: themeColor }}>{file.name}</p>
                        : <p className="text-xs font-medium text-white/25">Klik atau seret PDF di sini</p>
                      }
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting || !file}
                      variant="outline"
                      className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white/60 border-white/[0.1] hover:border-white/30 hover:text-white"
                    >
                      {submitting ? 'Memuat Naik...' : 'Hantar Laporan Manual'}
                    </Button>
                  </form>

                  {submitting && <Progress value={progress} className="h-1" />}
                </>
              )}
            </div>
          </div>

          {/* Right: Reports list */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-black uppercase tracking-widest text-white/60">Rekod Laporan</h2>
              <button
                onClick={loadReports}
                className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3 h-3" /> Segarkan
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 p-1 rounded-2xl bg-white/[0.03] w-fit border border-white/[0.05]">
              {(['aktif', 'arkib'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={cn(
                    'px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                    filterTab === tab ? 'text-white' : 'text-white/30 hover:text-white/50'
                  )}
                  style={filterTab === tab ? { background: themeColor } : {}}
                >
                  {tab === 'aktif' ? 'Semasa' : 'Arkib'}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 rounded-2xl bg-white/[0.03] animate-pulse border border-white/[0.04]" />
                ))}
              </div>
            ) : displayReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-white/[0.05] rounded-[2rem] gap-3">
                <FileText className="w-8 h-8 text-white/10" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                  Tiada Rekod Di {filterTab === 'aktif' ? 'Semasa' : 'Arkib'}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {displayReports.map(r => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className={cn(
                        'rounded-[1.5rem] p-5 border flex gap-4',
                        r.is_archived ? 'bg-white/[0.02] border-white/[0.04] opacity-70' : 'bg-white/[0.03] border-white/[0.06]'
                      )}>
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${themeColor}15` }}
                        >
                          <FileText className="w-5 h-5" style={{ color: themeColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-black text-sm text-white leading-tight line-clamp-1">{r.file_name}</p>
                            <StatusChip status={r.status} size="sm" />
                          </div>
                          <p className="text-[10px] text-white/25 font-bold uppercase tracking-widest mt-1">
                            {format(new Date(r.created_at), 'dd MMM yyyy, h:mm a')}
                          </p>
                          {r.status === 'Ditolak' && r.admin_feedback && !r.is_archived && (
                            <div className="mt-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-0.5">Nota Penolakan MT</p>
                              <p className="text-xs text-rose-300/70 italic font-medium">{r.admin_feedback}</p>
                            </div>
                          )}
                          <a
                            href={r.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-bold uppercase tracking-widest underline underline-offset-2 mt-2 inline-block"
                            style={{ color: themeColor }}
                          >
                            Lihat Fail
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ── Live PDF Preview Modal ───────────────────────────────── */}
        {isPreviewOpen && (
          <LaporanPreviewModal
            clubName={excoLabel}
            monthYear={monthLabel}
            activities={previewData}
            submitterName={profile?.full_name || undefined}
            submitterRole={submitterRoleLabel}
            submitterUnit={excoLabel}
            presidenName={mtReviewer?.name || '( Tiada MT Ditetapkan )'}
            reviewerRole={mtReviewer?.role || 'MAJLIS TERTINGGI'}
            reviewerUnit="JAWATANKUASA PERWAKILAN PELAJAR"
            clubLogoUrl={jppLogoBase64}
            isExco={true}
            fileName={`Laporan_${excoUnit}_${targetMonth}`}
            onClose={() => setIsPreviewOpen(false)}
            onSubmit={handleConfirmGenerate}
          />
        )}
      </div>
    </div>
  );
}
