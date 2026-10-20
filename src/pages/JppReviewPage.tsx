/**
 * JppReviewPage — SUPER_ADMIN_JPP only.
 * Lists all reports from all clubs.
 * Actions: Review (→ Dalam Semakan) | Approve | Decline (mandatory feedback).
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, CheckCircle2, XCircle, Clock, FileText,
  MessageSquare, Download, Search, Filter,
  RefreshCw, AlertTriangle, Lock, Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  ClubReport, ReportStatus, ReportType,
  REPORT_STATUS_COLORS, REPORT_STATUS_LABELS, REPORT_TYPE_LABELS,
  ALL_CLUBS,
} from '@/types';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

// ── Status icon map ──────────────────────────────────────────
const STATUS_ICON: Record<ReportStatus, React.ReactNode> = {
  'Menunggu':      <Clock className="w-3.5 h-3.5" />,
  'Dalam Semakan': <Eye className="w-3.5 h-3.5" />,
  'Diluluskan':    <CheckCircle2 className="w-3.5 h-3.5" />,
  'Ditolak':       <XCircle className="w-3.5 h-3.5" />,
};

const ALL_STATUSES: ReportStatus[] = ['Menunggu', 'Dalam Semakan', 'Diluluskan', 'Ditolak'];

export function JppReviewPage() {
  const { t } = useTranslation();
  const { user, isSuperAdmin } = useAuth();

  // ── Access guard — non-admins see a lock screen ──────────
  if (!isSuperAdmin) {
    return (
      <div className="page-container flex flex-col items-center justify-center h-96 gap-5 text-center">
        <div className="w-20 h-20 rounded-[2rem] bg-rose-500/10 flex items-center justify-center">
          <Lock className="w-10 h-10 text-rose-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-primary">{t('jpp:review_access_denied_title', 'Akses Ditolak')}</h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">
            {t('jpp:review_access_denied_desc', 'Halaman ini hanya untuk Super Admin JPP. Sila hubungi pentadbir sistem.')}
          </p>
        </div>
      </div>
    );
  }

  // ── State ──────────────────────────────────────────────────
  const [reports, setReports]           = useState<ClubReport[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'Semua'>('Semua');
  const [filterType, setFilterType]     = useState<ReportType | 'Semua'>('Semua');
  const [filterClub, setFilterClub]     = useState<string>('Semua');

  // Decision dialog
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [target, setTarget]           = useState<ClubReport | null>(null);
  const [decision, setDecision]       = useState<'Diluluskan' | 'Ditolak' | null>(null);
  const [feedback, setFeedback]       = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Load ───────────────────────────────────────────────────
  const load = async () => {
    setIsLoading(true);
    try {
      // Super admin sees ALL clubs — no clubId filter
      const { data } = await supabase
        .from('club_reports')
        .select('*')
        .order('created_at', { ascending: false });
      setReports((data ?? []) as unknown as ClubReport[]);
    } catch (e) {
      console.error(e);
      toast.error(t('jpp:review_load_failed', 'Gagal memuatkan laporan.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Action: Set to "Dalam Semakan" ─────────────────────────
  const handleStartReview = async (report: ClubReport) => {
    if (!user) return;
    try {
      await supabase.from('club_reports').update({
        status:      'Dalam Semakan',
        reviewed_by: user.id,
      }).eq('id', report.id);
      toast.success(t('jpp:review_now_in_review', 'Laporan "{{title}}" kini dalam semakan.', { title: report.title }));
      load();
    } catch {
      toast.error(t('jpp:review_status_update_failed', 'Gagal mengemaskini status.'));
    }
  };

  // ── Open decision dialog ───────────────────────────────────
  const openDecision = (report: ClubReport, d: 'Diluluskan' | 'Ditolak') => {
    setTarget(report);
    setDecision(d);
    setFeedback('');
    setDialogOpen(true);
  };

  // ── Confirm decision ───────────────────────────────────────
  const confirmDecision = async () => {
    if (!target || !decision || !user) return;
    if (decision === 'Ditolak' && !feedback.trim()) {
      toast.error(t('jpp:review_feedback_mandatory', 'Maklum balas WAJIB diisi apabila menolak laporan.'));
      return;
    }
    setIsProcessing(true);
    try {
      await supabase.from('club_reports').update({
        status:         decision,
        admin_feedback: feedback.trim() || null,
        reviewed_by:    user.id,
        reviewed_at:    new Date().toISOString(),
      }).eq('id', target.id);
      await supabase.from('club_logs').insert({
        club_id: (target as any).club_id ?? (target as any).club_id,
        user_id: user.id,
        type:    decision === 'Diluluskan' ? 'report_approved' : 'report_declined',
        content: decision === 'Diluluskan'
          ? `Laporan "${target.title}" telah diluluskan oleh JPP.`
          : `Laporan "${target.title}" telah ditolak. Sebab: ${feedback.trim()}`,
      });
      toast.success(decision === 'Diluluskan'
        ? t('jpp:review_approved_toast', '✓ Laporan diluluskan.')
        : t('jpp:review_declined_toast', '✗ Laporan ditolak.'));
      setDialogOpen(false);
      setTarget(null);
      setDecision(null);
      load();
    } catch {
      toast.error(t('jpp:review_save_failed', 'Gagal menyimpan keputusan.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Filter ─────────────────────────────────────────────────
  const filtered = reports.filter(r => {
    const clubName = ALL_CLUBS.find(c => c.id === (r as any).club_id)?.name ?? (r as any).club_id;
    const matchSearch = (
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      clubName.toLowerCase().includes(search.toLowerCase()) ||
      (r as any).file_name.toLowerCase().includes(search.toLowerCase())
    );
    const matchStatus = filterStatus === 'Semua' || r.status === filterStatus;
    const matchType   = filterType   === 'Semua' || r.type   === filterType;
    const matchClub   = filterClub   === 'Semua' || (r as any).club_id === filterClub;
    return matchSearch && matchStatus && matchType && matchClub;
  });

  // ── Stats ──────────────────────────────────────────────────
  const counts = {
    total:    reports.length,
    pending:  reports.filter(r => r.status === 'Menunggu').length,
    review:   reports.filter(r => r.status === 'Dalam Semakan').length,
    approved: reports.filter(r => r.status === 'Diluluskan').length,
    declined: reports.filter(r => r.status === 'Ditolak').length,
  };

  const actionRequired = counts.pending + counts.review;

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="page-container space-y-10">

      {/* ── Header ──────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Badge className="mb-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-accent/12 text-accent border-none">
          {t('jpp:review_badge_super_admin', 'Super Admin JPP · Semua Kelab')}
        </Badge>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-black tracking-tighter gradient-text">{t('jpp:review_page_title', 'Semakan Laporan JPP')}</h1>
            <p className="text-muted-foreground mt-1 font-medium max-w-xl">
              {t('jpp:review_page_desc', 'Semak, luluskan atau tolak laporan yang diserahkan oleh semua kelab Polisas.')}
              {actionRequired > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 font-black text-rose-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {t('jpp:review_action_required', '{{count}} laporan memerlukan tindakan.', { count: actionRequired })}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={load}
            className="h-10 px-5 rounded-xl font-bold text-xs uppercase tracking-widest border-border/60 gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('jpp:review_reload_btn', 'Muat Semula')}
          </Button>
        </div>
      </motion.div>

      {/* ── Stats row ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        className="grid grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {[
          { key: 'Jumlah', label: t('jpp:review_stat_total', 'Jumlah'),       val: counts.total,    bg: 'bg-muted/50',   text: 'text-foreground' },
          { key: 'Menunggu', label: t('jpp:review_stat_pending', 'Menunggu'),     val: counts.pending,  bg: 'bg-amber-500/10',    text: 'text-amber-600 dark:text-amber-400'  },
          { key: 'Dalam Semakan', label: t('jpp:review_stat_in_review', 'Dalam Semakan'),val: counts.review,   bg: 'bg-blue-500/10',     text: 'text-blue-600 dark:text-blue-400'   },
          { key: 'Diluluskan', label: t('jpp:review_stat_approved', 'Diluluskan'),   val: counts.approved, bg: 'bg-emerald-500/10',  text: 'text-emerald-600 dark:text-emerald-400' },
          { key: 'Ditolak', label: t('jpp:review_stat_declined', 'Ditolak'),      val: counts.declined, bg: 'bg-rose-500/10',     text: 'text-rose-600 dark:text-rose-400'   },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + i * 0.05 }}>
            <Card
              className={cn('bento-card border-none cursor-pointer transition-all', filterStatus === (s.key === 'Jumlah' ? 'Semua' : s.key) ? 'ring-2 ring-primary/30' : '')}
              onClick={() => {
                if (s.key === 'Jumlah') setFilterStatus('Semua');
                else setFilterStatus(s.key as ReportStatus);
              }}
            >
              <CardContent className="p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{s.label}</p>
                <p className={cn('text-3xl font-black tracking-tighter mt-1', s.text)}>{s.val}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Filter bar ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-accent transition-colors" />
          <Input
            placeholder={t('jpp:review_search_placeholder', 'Cari tajuk, kelab atau nama fail...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-11 h-11 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40"
          />
        </div>
        {/* Club filter */}
        <Select value={filterClub} onValueChange={setFilterClub}>
          <SelectTrigger className="h-11 rounded-xl bg-muted/40 border-border/60 w-full sm:w-44 font-bold text-sm">
            <Building2 className="w-3.5 h-3.5 mr-2 text-muted-foreground/50" />
            <SelectValue placeholder={t('jpp:review_filter_all_clubs', 'Semua Kelab')} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl shadow-xl border-border/60 max-h-60">
            <SelectItem value="Semua">{t('jpp:review_filter_all_clubs', 'Semua Kelab')}</SelectItem>
            {ALL_CLUBS.map(c => (
              <SelectItem key={c.id} value={c.id} className="rounded-lg font-medium">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Type filter */}
        <Select value={filterType} onValueChange={v => setFilterType(v as any)}>
          <SelectTrigger className="h-11 rounded-xl bg-muted/40 border-border/60 w-full sm:w-44 font-bold text-sm">
            <SelectValue placeholder={t('jpp:review_filter_all_types', 'Semua Jenis')} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl shadow-xl border-border/60">
            <SelectItem value="Semua">{t('jpp:review_filter_all_types', 'Semua Jenis')}</SelectItem>
            <SelectItem value="Aktiviti">{t('jpp:review_type_monthly', 'Laporan Bulanan')}</SelectItem>
            <SelectItem value="Kewangan">{t('jpp:review_type_financial', 'Laporan Kewangan')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Status filter chips ─────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'Semua', label: t('jpp:review_filter_all_statuses', 'Semua') },
          { key: 'Menunggu', label: t('jpp:review_stat_pending', 'Menunggu') },
          { key: 'Dalam Semakan', label: t('jpp:review_stat_in_review', 'Dalam Semakan') },
          { key: 'Diluluskan', label: t('jpp:review_stat_approved', 'Diluluskan') },
          { key: 'Ditolak', label: t('jpp:review_stat_declined', 'Ditolak') },
        ] as const).map(s => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(s.key as any)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border',
              filterStatus === s.key
                ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                : 'bg-muted/60 text-muted-foreground/60 border-border/50 hover:border-primary/30 hover:bg-muted'
            )}
          >
            {s.key !== 'Semua' && STATUS_ICON[s.key as ReportStatus]}
            {s.label}
            {s.key !== 'Semua' && (
              <span className="ml-0.5 font-black">
                ({reports.filter(r => r.status === s.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Reports list ───────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-primary/15 rounded-2xl" />
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-2xl animate-spin" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 animate-pulse">
            {t('jpp:review_loading_text', 'Memuatkan Laporan...')}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center space-y-4">
          <FileText className="w-14 h-14 text-muted-foreground/20 mx-auto" />
          <p className="font-bold text-muted-foreground/40">{t('jpp:review_empty_text', 'Tiada laporan ditemui.')}</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map((report, idx) => (
              <ReviewReportRow
                key={report.id}
                report={report}
                idx={idx}
                onStartReview={handleStartReview}
                onDecision={openDecision}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* ── Decision Dialog ────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!isProcessing) setDialogOpen(v); }}>
        <DialogContent className="rounded-3xl border-border/60 shadow-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className={cn(
              'text-xl font-black tracking-tight flex items-center gap-2',
              decision === 'Ditolak' ? 'text-rose-700' : 'text-emerald-700'
            )}>
              {decision === 'Diluluskan'
                ? <><CheckCircle2 className="w-5 h-5" /> {t('jpp:review_dialog_approve_title', 'Luluskan Laporan')}</>
                : <><XCircle className="w-5 h-5" /> {t('jpp:review_dialog_decline_title', 'Tolak Laporan')}</>}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {target?.title}
              <span className="mx-2">·</span>
              <span className="font-bold text-accent">
                {target ? ALL_CLUBS.find(c => c.id === (target as any).club_id)?.name : ''}
              </span>
            </DialogDescription>
          </DialogHeader>

          {target && (
            <div className="space-y-5 py-2">
              {/* Report summary card */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{target.title}</p>
                    <p className="text-[10px] font-bold text-muted-foreground/50 mt-0.5">
                      {REPORT_TYPE_LABELS[target.type]} · {format(parseISO((target as any).created_at), 'd MMM yyyy', { locale: ms })}
                    </p>
                  </div>
                  <a href={(target as any).file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm"
                      className="h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-accent hover:bg-accent/8 gap-1">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </Button>
                  </a>
                </div>
              </div>

              <Separator className="bg-border/40" />

              {/* Feedback textarea */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {t('jpp:review_dialog_feedback_label', 'Maklum Balas JPP')}
                  {decision === 'Ditolak' && (
                    <span className="text-rose-500 ml-1">{t('jpp:review_dialog_feedback_required_note', '* (WAJIB untuk penolakan)')}</span>
                  )}
                </Label>
                <Textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder={
                    decision === 'Ditolak'
                      ? t('jpp:review_dialog_decline_placeholder', 'Nyatakan sebab penolakan dan perkara yang perlu diperbetulkan...')
                      : t('jpp:review_dialog_approve_placeholder', 'Maklum balas tambahan (pilihan)...')
                  }
                  rows={4}
                  className={cn(
                    'rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 resize-none',
                    decision === 'Ditolak' && !feedback.trim() ? 'border-rose-300 focus-visible:ring-rose-300/40' : ''
                  )}
                  disabled={isProcessing}
                />
                {decision === 'Ditolak' && !feedback.trim() && (
                  <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {t('jpp:review_dialog_feedback_warning', 'Maklum balas wajib diisi untuk penolakan laporan.')}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isProcessing}
              className="rounded-xl font-bold text-xs uppercase tracking-widest border-border/60"
            >
              {t('jpp:review_dialog_cancel', 'Batal')}
            </Button>
            <Button
              onClick={confirmDecision}
              disabled={isProcessing || (decision === 'Ditolak' && !feedback.trim())}
              className={cn(
                'rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg gap-2 transition-all active:scale-95',
                decision === 'Diluluskan'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
              )}
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('jpp:review_dialog_processing', 'Memproses...')}
                </>
              ) : decision === 'Diluluskan' ? (
                <><CheckCircle2 className="w-4 h-4" /> {t('jpp:review_dialog_confirm_approve', 'Sahkan Kelulusan')}</>
              ) : (
                <><XCircle className="w-4 h-4" /> {t('jpp:review_dialog_confirm_decline', 'Sahkan Penolakan')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Report row sub-component ─────────────────────────────────
interface ReviewRowProps {
  key?: any;
  report: ClubReport;
  idx: number;
  onStartReview: (r: ClubReport) => void;
  onDecision: (r: ClubReport, d: 'Diluluskan' | 'Ditolak') => void;
}

function ReviewReportRow({ report, idx, onStartReview, onDecision }: ReviewRowProps) {
  const { t } = useTranslation();
  const [showFeedback, setShowFeedback] = useState(false);
  const club = ALL_CLUBS.find(c => c.id === (report as any).club_id);
  const clubInitials = (club?.shortName ?? (report as any).club_id.slice(0, 3)).toUpperCase();

  const isPending  = report.status === 'Menunggu';
  const isReview   = report.status === 'Dalam Semakan';
  const isActionable = isPending || isReview;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03 }}
      exit={{ opacity: 0, scale: 0.97 }}
      layout
    >
      <Card className={cn(
        'bento-card border-none overflow-hidden group transition-all duration-200',
        isActionable ? 'hover:shadow-md hover:shadow-primary/8 hover:border-primary/15' : ''
      )}>
        {/* Priority left border for pending items */}
        {isPending && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-[2.5rem]" />
        )}
        {isReview && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-[2.5rem]" />
        )}

        <CardContent className="p-5 pl-6">
          <div className="flex items-start gap-4">
            {/* Club avatar */}
            <Avatar className="h-11 w-11 rounded-xl ring-2 ring-border/30 flex-shrink-0">
              <AvatarFallback
                className="font-black text-xs text-white rounded-xl"
                style={{ background: club ? `${(report as any).club_id === 'club_pepka' ? '#8B1A1A' : (report as any).club_id === 'club_elektron' ? '#1A3A8B' : '#1A6B3A'}` : '#8B1A1A' }}
              >
                {clubInitials.slice(0, 3)}
              </AvatarFallback>
            </Avatar>

            {/* Main info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start flex-wrap gap-x-2 gap-y-1">
                <h3 className="font-black text-sm tracking-tight">{report.title}</h3>
                <Badge className={cn(
                  'text-[9px] font-black uppercase tracking-wide px-2 py-0.5 border-none flex items-center gap-1 flex-shrink-0',
                  REPORT_STATUS_COLORS[report.status]
                )}>
                  {STATUS_ICON[report.status]}
                  {report.status === 'Menunggu' ? t('jpp:review_stat_pending', 'Menunggu') :
                   report.status === 'Dalam Semakan' ? t('jpp:review_stat_in_review', 'Dalam Semakan') :
                   report.status === 'Diluluskan' ? t('jpp:review_stat_approved', 'Diluluskan') :
                   t('jpp:review_stat_declined', 'Ditolak')}
                </Badge>
              </div>

              <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5">
                <span className="text-[11px] font-black uppercase tracking-widest text-accent">
                  {club?.name ?? (report as any).club_id}
                </span>
                <span className="text-[10px] text-muted-foreground/40">·</span>
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                  report.type === 'Kewangan' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                )}>
                  {report.type === 'Kewangan' ? t('jpp:review_type_financial', 'Laporan Kewangan') : t('jpp:review_type_monthly', 'Laporan Bulanan')}
                </span>
                <span className="text-[10px] text-muted-foreground/40">·</span>
                <span className="text-[10px] text-muted-foreground/60 font-medium">
                  {format(parseISO((report as any).created_at), 'd MMM yyyy, HH:mm', { locale: ms })}
                </span>
                <span className="text-[10px] text-muted-foreground/40 truncate max-w-[160px]">
                  · {(report as any).file_name}
                </span>
              </div>

              {/* Previous feedback summary */}
              {(report as any).admin_feedback && (
                <button
                  onClick={() => setShowFeedback(!showFeedback)}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 hover:text-accent transition-colors mt-1"
                >
                  <MessageSquare className="w-3 h-3" />
                  {showFeedback ? t('jpp:review_hide_feedback', 'Sembunyikan maklum balas') : t('jpp:review_show_feedback', 'Lihat maklum balas JPP')}
                </button>
              )}
              <AnimatePresence>
                {showFeedback && (report as any).admin_feedback && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={cn(
                      'mt-2 px-3 py-2.5 rounded-xl border text-xs leading-relaxed font-medium',
                      report.status === 'Ditolak'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    )}>
                      <span className="font-black uppercase tracking-widest text-[9px] block mb-1">
                        {t('jpp:review_feedback_heading', 'Maklum Balas JPP')}
                        {(report as any).reviewed_at && ` · ${format(parseISO((report as any).reviewed_at), 'd MMM yyyy', { locale: ms })}`}
                      </span>
                      {(report as any).admin_feedback}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* View PDF */}
              <a href={(report as any).file_url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon"
                  className="h-9 w-9 rounded-xl hover:bg-primary/8 transition-all"
                  title={t('jpp:review_btn_open_pdf', 'Buka PDF')}>
                  <Eye className="w-4 h-4 text-muted-foreground/60" />
                </Button>
              </a>

              {/* Download PDF */}
              <a href={(report as any).file_url} download={(report as any).file_name} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon"
                  className="h-9 w-9 rounded-xl hover:bg-primary/8 transition-all"
                  title={t('jpp:review_btn_download_pdf', 'Muat turun PDF')}>
                  <Download className="w-4 h-4 text-muted-foreground/60" />
                </Button>
              </a>

              {/* Review button — only for Menunggu */}
              {isPending && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStartReview(report)}
                  className="h-9 rounded-xl font-bold text-[10px] uppercase tracking-widest border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 gap-1.5 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {t('jpp:review_btn_review', 'Semak')}
                </Button>
              )}

              {/* Approve / Decline — for Menunggu and Dalam Semakan */}
              {isActionable && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onDecision(report, 'Diluluskan')}
                    className="h-9 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 gap-1.5 transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('jpp:review_btn_approve', 'Lulus')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onDecision(report, 'Ditolak')}
                    className="h-9 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200 gap-1.5 transition-all active:scale-95"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    {t('jpp:review_btn_decline', 'Tolak')}
                  </Button>
                </>
              )}

              {/* Final status badge for resolved reports */}
              {!isActionable && (
                <div className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest',
                  report.status === 'Diluluskan' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                )}>
                  {STATUS_ICON[report.status]}
                  {report.status === 'Diluluskan' ? t('jpp:review_stat_approved', 'Diluluskan') : t('jpp:review_stat_declined', 'Ditolak')}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
