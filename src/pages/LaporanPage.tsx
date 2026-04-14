import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, RefreshCw, Lock, BookOpen, Users, Calendar, Award, Zap, CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LaporanPreviewModal } from '@/components/reports/LaporanPreviewModal';
import { StatusChip } from '@/components/ui/StatusChip';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useReports } from '@/hooks/useReports';
import { ALL_CLUBS } from '@/types';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ms } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/components/ui/empty';
import { pdf } from '@react-pdf/renderer';
import { LaporanPDFTemplate } from '@/components/reports/LaporanPDFTemplate';
import { normalizeReportData } from '@/lib/report-utils';
import { uploadPdfToDrive } from '@/lib/driveUpload';

const ALL_DOC_TYPES = [
  { value: 'Laporan Aktiviti', label: 'Laporan Bulanan (Auto-Jana)', icon: Zap },
  { value: 'Laporan Kewangan', label: 'Laporan Kewangan', icon: FileText },
  { value: 'Takwim Aktiviti', label: 'Takwim Aktiviti', icon: Calendar },
  { value: 'Profil Ahli', label: 'Profil Ahli Kelab', icon: Users },
  { value: 'Struktur Jawatan', label: 'Struktur Jawatan', icon: Award },
  { value: 'Carta Organisasi', label: 'Carta Organisasi', icon: Users },
  { value: 'Perlembagaan', label: 'Perlembagaan Kelab (Presiden)', icon: BookOpen },
];

const MAX_MB = 25;

export function LaporanPage() {
  const { user, profile, isSuperAdmin, isPresident, isMT, selectedClubId } = useAuth();
  // Role kini dari context (berubah mengikut kelab yang dipilih)
  const canSubmit = isPresident || isMT;

  const [reportType, setReportType] = useState<string>('Laporan Aktiviti');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [targetMonth, setTargetMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const effectiveClubId = selectedClubId ?? profile?.club_id;
  const { reports, loading, refresh: loadReports } = useReports(effectiveClubId || undefined);
  const [filterTab, setFilterTab] = useState<'aktif' | 'arkib'>('aktif');
  const [allowAutoPdf, setAllowAutoPdf] = useState(true);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [logoData, setLogoData] = useState<string | undefined>(undefined);

  // ── Derived values ────────────────────────────────────────────────
  const monthLabel = format(parseISO(`${targetMonth}-01`), 'MMMM yyyy', { locale: ms }).toUpperCase();
  const submitterRole = isPresident ? 'PRESIDEN' : isMT ? 'MAJLIS TERTINGGI JPP' : ((profile as any)?.club_role || 'SETIAUSAHA');

  const clubName = effectiveClubId
    ? ALL_CLUBS.find(c => c.id === effectiveClubId)?.name ?? effectiveClubId
    : '—';

  // --- HELPER FUNCTION UNTUK FILTER JENIS DOKUMEN ---
  const availableDocTypes = ALL_DOC_TYPES.filter(doc => {
    if (doc.value === 'Perlembagaan' && !isPresident) return false;
    return true;
  });

  useEffect(() => {
    const checkSettings = async () => {
      const { data: setting } = await supabase.from('system_settings').select('value').eq('key', 'allow_auto_pdf').single();
      if (setting !== null) setAllowAutoPdf(setting.value);
    };
    checkSettings();
  }, []);

  const validateFile = (f: File): boolean => {
    if (f.type !== 'application/pdf') { toast.error('Hanya fail PDF dibenarkan.'); return false; }
    if (f.size > MAX_MB * 1024 * 1024) { toast.error(`Fail terlalu besar. Had: ${MAX_MB}MB`); return false; }
    return true;
  };

  const urlToBase64 = async (url: string): Promise<string | undefined> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Gagal tukar gambar ke Base64:", e);
      return undefined;
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user || !effectiveClubId) return;
    setSubmitting(true); setProgress(20);
    try {
      const ts = Date.now();
      const customName = `${effectiveClubId}_${reportType.replace(/\s+/g, '_')}_${ts}`;
      
      setProgress(50);
      const url = await uploadPdfToDrive(file, effectiveClubId as any, customName);
      setProgress(80);

      const { error: dbError } = await supabase.from('club_reports').insert({
        club_id: effectiveClubId,
        submitted_by: user.id,
        report_type: reportType,
        file_url: url,
        file_name: `${reportType} - ${file.name}`,
        status: 'Menunggu',
        is_archived: false,
      });
      if (dbError) throw dbError;
      toast.success('Berjaya dihantar!');
      setFile(null); loadReports();
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); setProgress(0); }
  };

  const fetchReportData = async () => {
    if (!user || !effectiveClubId) return [];

    try {
      const { data: clubDB } = await supabase
        .from('clubs')
        .select('logo_url')
        .eq('id', effectiveClubId)
        .single();

      if (clubDB?.logo_url) {
        const b64 = await urlToBase64(clubDB.logo_url);
        setLogoData(b64);
      }

      const start = startOfMonth(parseISO(`${targetMonth}-01`)).toISOString();
      const end = endOfMonth(parseISO(`${targetMonth}-01`)).toISOString();

      const { data: acts } = await supabase
        .from('club_activities')
        .select('id, title, description, status, start_date, end_date, location, budget, tindakan, image_urls')
        .eq('club_id', effectiveClubId).eq('status', 'selesai')
        .eq('is_archived', false)
        .gte('start_date', start).lte('start_date', end)
        .order('start_date', { ascending: true });

      // DIOPTIMUM: Guna programs.club_id terus, fallback ke memberIds
      let rawPrograms: any[] = [];
      const { data: progByClub } = await supabase
        .from('programs')
        .select('id, nama_program, deskripsi, tarikh_mula, tarikh_tamat, location, budget, tindakan, image_urls')
        .eq('club_id', effectiveClubId)
        .eq('status', 'COMPLETED')
        .eq('is_archived', false)
        .gte('tarikh_tamat', start)
        .lte('tarikh_tamat', end)
        .order('tarikh_mula', { ascending: true });

      if (progByClub && progByClub.length > 0) {
        rawPrograms = progByClub;
      } else {
        // Fallback: lookup via memberIds (data lama)
        const { data: members } = await supabase.from('profiles').select('id').eq('club_id', effectiveClubId);
        const memberIds = members?.map((m: any) => m.id) || [];
        if (memberIds.length > 0) {
          const { data: progData } = await supabase
            .from('programs')
            .select('id, nama_program, deskripsi, tarikh_mula, tarikh_tamat, location, budget, tindakan, image_urls')
            .in('user_id', memberIds)
            .eq('status', 'COMPLETED')
            .eq('is_archived', false)
            .gte('tarikh_tamat', start)
            .lte('tarikh_tamat', end)
            .order('tarikh_mula', { ascending: true });
          rawPrograms = progData || [];
        }
      }

      return normalizeReportData(acts || [], rawPrograms);
    } catch (err: any) {
      console.error('Error fetching report data:', err);
      throw err;
    }
  };

  const handleAutoGenerateTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await fetchReportData();
      if (data.length === 0) {
        toast.error("Tiada aktiviti atau program selesai pada bulan ini.");
        setSubmitting(false);
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

  const handleConfirmGenerate = async () => {
    if (!user || !effectiveClubId || previewData.length === 0) return;
    setSubmitting(true);
    setProgress(10);
    // NOTA: Modal menutup sendiri (onClose) selepas fungsi ini selesai.

    try {
      setProgress(40);

      const doc = (
        <LaporanPDFTemplate
          clubName={clubName}
          monthYear={monthLabel}
          activities={previewData}
          presidenName={profile.full_name || "PRESIDEN KELAB"}
          reviewerRole="PRESIDEN"
          reviewerUnit={clubName}
          clubLogoUrl={logoData}
        />
      );

      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      setProgress(70);

      const fileName = `Auto_Laporan_${targetMonth}_${Date.now()}`;
      // Tukar Blob kepada File untuk Edge Function
      const pdfFile = new File([blob], `${fileName}.pdf`, { type: 'application/pdf' });
      
      const url = await uploadPdfToDrive(pdfFile, effectiveClubId as any, fileName);
      setProgress(90);

      const { error: dbError } = await supabase.from('club_reports').insert({
        club_id: effectiveClubId,
        submitted_by: user.id,
        report_type: 'Laporan Aktiviti',
        file_url: url,
        file_name: `Laporan Bulanan - ${monthLabel}.pdf`,
        status: 'Menunggu',
        is_archived: false
      });

      if (dbError) throw dbError;

      toast.success('Laporan berjaya dijana!');
      loadReports();
    } catch (err: any) {
      toast.error('Ralat: ' + err.message);
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  };

  if (!canSubmit) return <div className="p-20 text-center"><Lock className="mx-auto mb-4 opacity-20" /> Akses Terhad.</div>;

  return (
    <div className="page-container space-y-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Badge className="mb-3 bg-primary/10 text-primary border-none">{clubName}</Badge>
        <h1 className="text-5xl font-black tracking-tighter gradient-text">Pusat Dokumen</h1>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <Card className="lg:col-span-2 bento-card border-none">
          <CardHeader><CardTitle>Pengurusan Laporan</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="rounded-xl bg-muted/40 h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableDocTypes.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2"><t.icon className="w-4 h-4" />{t.label}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {reportType === 'Laporan Aktiviti' ? (
              !allowAutoPdf && !isSuperAdmin ? (
                <div className="bg-rose-500/10 p-8 rounded-[2rem] text-center border-2 border-dashed border-rose-500/20">
                  <Lock className="w-10 h-10 text-rose-500/50 mx-auto mb-3" />
                  <p className="text-sm font-black text-rose-600 uppercase tracking-widest leading-tight">Sistem Janaan Ditutup</p>
                  <p className="text-[10px] text-rose-500/80 mt-2 font-bold max-w-[200px] mx-auto leading-relaxed">Fungsi janaan Auto-PDF ditutup sementara waktu oleh pihak JPP bagi mengelakkan lambakan laporan salah.</p>
                </div>
              ) : (
                <form onSubmit={handleAutoGenerateTransition} className="space-y-4">
                  <div className="bg-emerald-500/10 p-4 rounded-xl text-xs text-emerald-600 font-medium">Sistem akan menarik data aktiviti 'Selesai' dan menjana PDF secara automatik.</div>
                  <Input type="month" value={targetMonth} onChange={e => setTargetMonth(e.target.value)} className="h-12 rounded-xl" />
                  <Button type="submit" disabled={submitting} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">{submitting ? 'Memuatkan...' : 'Pratonton & Jana'}</Button>
                </form>
              )
            ) : (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f && validateFile(f)) setFile(f); }}
                  className={cn("border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all", dragOver ? "border-primary bg-primary/10" : file ? "border-primary/50 bg-primary/10" : "border-border bg-muted/20")}
                >
                  <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f && validateFile(f)) setFile(f); }} />
                  {file ? <p className="font-bold text-sm truncate text-blue-500">{file.name}</p> : <p className="text-sm font-medium text-muted-foreground">Klik atau seret PDF di sini</p>}
                </div>
                <Button type="submit" disabled={submitting || !file} className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest bg-primary text-primary-foreground shadow-xl">
                  {submitting ? 'Memuat Naik...' : 'Hantar Dokumen'}
                </Button>
              </form>
            )}
            {submitting && <Progress value={progress} className="h-1.5" />}
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black">Rekod Dokumen</h2>
            <Button variant="ghost" size="sm" onClick={loadReports} className="text-xs font-bold uppercase tracking-widest text-accent"><RefreshCw className="w-3 h-3 mr-2" /> Segarkan</Button>
          </div>
          
          <div className="flex gap-2 mb-4 bg-muted/30 p-1 rounded-2xl w-full max-w-[300px]">
             <Button
                variant={filterTab === 'aktif' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterTab('aktif')}
                className="flex-1 rounded-xl text-xs font-bold uppercase tracking-widest"
             >
                Semasa
             </Button>
             <Button
                variant={filterTab === 'arkib' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterTab('arkib')}
                className="flex-1 rounded-xl text-xs font-bold uppercase tracking-widest"
             >
                Arkib Laporan
             </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10 opacity-40"><RefreshCw className="w-6 h-6 animate-spin" /></div>
          ) : reports.filter(r => filterTab === 'arkib' ? r.is_archived : !r.is_archived).length === 0 ? (
            <Empty className="py-20 rounded-[3rem] border-dashed border-2 bg-card shadow-sm">
              <EmptyMedia variant="icon">
                <FileText className="w-8 h-8" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle className="text-sm font-black uppercase tracking-widest">Tiada Rekod Di {filterTab === 'aktif' ? 'Semasa' : 'Arkib'}</EmptyTitle>
                <EmptyDescription className="text-xs">
                  {filterTab === 'aktif' ? 'Sila hantar laporan manual atau jana laporan bulanan.' : 'Tiada dokumen yang diarkibkan untuk kohort lepas.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <AnimatePresence mode="popLayout">
              {reports.filter(r => filterTab === 'arkib' ? r.is_archived : !r.is_archived).map((r) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <Card className={cn("bento-card border-none p-5", r.is_archived && "opacity-70 grayscale-[20%] border-border/50")}>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-primary" /></div>
                          <div>
                            <div className="flex items-center gap-2">
                               <p className="font-bold text-sm">{r.file_name}</p>
                               {r.is_archived && <Badge variant="outline" className="text-[9px] uppercase">Arkib</Badge>}
                            </div>
                            <p className="text-[10px] opacity-50 uppercase tracking-widest font-black mt-1">{format(new Date(r.created_at), 'dd MMM yyyy, h:mm a')}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <StatusChip status={r.status} size="sm" />
                          <a href={r.file_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary underline tracking-widest uppercase">LIHAT FAIL</a>
                        </div>
                      </div>
                      {r.status === 'Ditolak' && r.admin_feedback && !r.is_archived && (
                        <div className="mt-1 p-3 bg-rose-50/50 border border-rose-100/50 rounded-xl">
                          <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Nota Penolakan JPP</p>
                          <p className="text-xs font-semibold text-rose-700 italic">{r.admin_feedback}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Live PDF Preview Modal ──────────────────────────── */}
      {isPreviewOpen && (
        <LaporanPreviewModal
          clubName={clubName}
          monthYear={monthLabel}
          activities={previewData}
          submitterName={profile?.full_name || undefined}
          submitterRole={submitterRole}
          submitterUnit={clubName}
          presidenName={profile?.full_name || 'PRESIDEN KELAB'}
          reviewerRole="PRESIDEN"
          reviewerUnit={clubName}
          clubLogoUrl={logoData}
          fileName={`Laporan_${effectiveClubId}_${targetMonth}`}
          onClose={() => setIsPreviewOpen(false)}
          onSubmit={handleConfirmGenerate}
        />
      )}
    </div>
  );
}