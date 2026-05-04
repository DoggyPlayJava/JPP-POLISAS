// ============================================================
// ExcoSemakanLaporanPage — Halaman MT untuk semak laporan exco
// Bergaya SemakanLaporanPage, distrip untuk konteks exco sahaja
// RBAC: hanya MT yang oversee unit tersebut atau SuperAdmin
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, FileText, RefreshCw, Lock,
  Clock, ExternalLink, MessageSquare, Archive, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { sendNotificationToUser } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { JPP_MT_POSITIONS } from '@/types';
import { UNIT_CFG } from '@/pages/jpp/jppConfig';

// ─── TYPES ───────────────────────────────────────────────────────────────────
type ActionType = 'Diluluskan' | 'Ditolak';

interface ExcoReport {
  id:           string;
  exco_unit:    string;
  file_name:    string;
  file_url:     string;
  report_type:  string;
  status:       string;
  submitted_by: string;
  admin_feedback: string | null;
  created_at:   string;
  is_archived:  boolean;
  submitter?: { full_name: string };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export function ExcoSemakanLaporanPage() {
  const { unitCode }          = useParams<{ unitCode: string }>();
  const { user, isSuperAdmin, profile } = useAuth();
  const navigate              = useNavigate();

  // Normalize unitCode
  const excoUnit = unitCode?.toUpperCase() || '';
  const unitCfg  = UNIT_CFG[excoUnit];
  const themeColor = unitCfg?.color || '#6366f1';
  const excoLabel  = unitCfg?.label || excoUnit;

  // ── Access Guard ──────────────────────────────────────────────────────────
  const jppPos = profile?.jpp_position as string | undefined;
  const jppUnit = profile?.jpp_unit as string | undefined;
  const isJppMT  = JPP_MT_POSITIONS.includes(jppPos as any);
  const isYDP    = jppPos === 'YDP' || jppPos === 'YANG_DIPERTUA';
  const hasAccess = isJppMT || isSuperAdmin || isYDP;

  // ── State ─────────────────────────────────────────────────────────────────
  const [reports, setReports]               = useState<ExcoReport[]>([]);
  const [loading, setLoading]               = useState(true);
  const [filterTab, setFilterTab]           = useState<'Menunggu' | 'Diluluskan' | 'Ditolak'>('Menunggu');
  const [showArchived, setShowArchived]     = useState(false);
  const [autoPdfEnabled, setAutoPdfEnabled] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{
    open: boolean; type: ActionType | null; report: ExcoReport | null;
  }>({ open: false, type: null, report: null });
  const [remarks, setRemarks]           = useState('');
  const [submitting, setSubmitting]     = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    if (!excoUnit) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('club_reports')
      .select(`
        *,
        submitter:profiles!submitted_by(full_name)
      `)
      .eq('exco_unit', excoUnit)
      .order('created_at', { ascending: false });

    if (!error) setReports((data || []) as ExcoReport[]);
    setLoading(false);
  }, [excoUnit]);

  const loadSettings = useCallback(async () => {
    if (!excoUnit) return;
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', `auto_pdf_${excoUnit}`)
      .single();
    if (data !== null) setAutoPdfEnabled(data.value === true || data.value === 'true');
  }, [excoUnit]);

  useEffect(() => { loadReports(); loadSettings(); }, [loadReports, loadSettings]);

  // ── Toggle Auto PDF ───────────────────────────────────────────────────────
  const toggleAutoPdf = async () => {
    if (!excoUnit) return;
    setSettingsLoading(true);
    const newVal = !autoPdfEnabled;
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: `auto_pdf_${excoUnit}`, value: newVal }, { onConflict: 'key' });
      
      if (error) throw error;
      setAutoPdfEnabled(newVal);
      toast.success(`Janaan Auto-PDF ${newVal ? 'DIBUKA' : 'DITUTUP'} untuk ${excoLabel}`);
    } catch (err: any) {
      toast.error('Ralat mengemas kini tetapan: ' + err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  // ── Action ────────────────────────────────────────────────────────────────
  const handleAction = async () => {
    if (!actionDialog.report || !actionDialog.type || !user) return;
    if (actionDialog.type === 'Ditolak' && !remarks.trim()) {
      toast.error('Sila masukkan nota penolakan.');
      return;
    }
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('club_reports')
        .update({
          status:         actionDialog.type,
          admin_feedback: remarks.trim() || null,
          is_archived:    actionDialog.type === 'Diluluskan',
        })
        .eq('id', actionDialog.report.id);
      if (updateError) throw updateError;

      // Hantar notifikasi kepada penghantar laporan (In-App + Push)
      try {
        await sendNotificationToUser(actionDialog.report.submitted_by, {
          type:     actionDialog.type === 'Diluluskan' ? 'REPORT_APPROVED' : 'REPORT_REJECTED',
          title:    actionDialog.type === 'Diluluskan'
            ? `Laporan ${excoLabel} Diluluskan`
            : `Laporan ${excoLabel} Ditolak`,
          message: actionDialog.type === 'Diluluskan'
            ? `Laporan anda bertajuk "${actionDialog.report.file_name}" telah diluluskan oleh MT.`
            : `Laporan "${actionDialog.report.file_name}" telah ditolak. Nota: ${remarks}`,
          module: 'EKPP',
          link: `/exco/${excoUnit.toLowerCase()}/laporan`,
        });
      } catch {}

      toast.success(
        actionDialog.type === 'Diluluskan'
          ? 'Laporan diluluskan dan diarkibkan!'
          : 'Laporan ditolak dan penghantar dimaklumkan.'
      );
      setActionDialog({ open: false, type: null, report: null });
      setRemarks('');
      loadReports();
    } catch (err: any) {
      toast.error(err.message || 'Ralat memproses tindakan.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtered ──────────────────────────────────────────────────────────────
  const active   = reports.filter(r => !r.is_archived);
  const archived = reports.filter(r => r.is_archived);

  const filteredActive = active.filter(r => r.status === filterTab);
  const counts = {
    Menunggu:   active.filter(r => r.status === 'Menunggu').length,
    Diluluskan: active.filter(r => r.status === 'Diluluskan').length,
    Ditolak:    active.filter(r => r.status === 'Ditolak').length,
  };

  // ── Access Guard Render ───────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0f] gap-6 text-center px-6">
        <div className="w-20 h-20 rounded-[2rem] bg-rose-500/10 flex items-center justify-center">
          <Lock className="text-rose-400 w-9 h-9" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">Akses Terhad</h2>
        <p className="text-sm text-white/30 font-medium max-w-xs">
          Halaman ini hanya untuk MT yang mengesahkan unit {excoLabel} dan Admin JPP.
        </p>
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-white/30 hover:text-white text-xs font-black uppercase tracking-widest"
        >
          ← Kembali
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

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
              Semak Laporan
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white">Semakan Laporan</h1>
              <p className="text-sm text-white/40 mt-1 font-medium">{excoLabel}</p>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex-1 min-w-[120px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">Janaan Auto-PDF</p>
                <p className="text-[10px] text-white/30 font-medium leading-tight">Benarkan Exco jana PDF automatik</p>
              </div>
              <button
                onClick={toggleAutoPdf}
                disabled={settingsLoading}
                className={cn(
                  'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all w-16 text-center',
                  autoPdfEnabled
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20',
                  settingsLoading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {autoPdfEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'Menunggu',   label: 'Menunggu',   count: counts.Menunggu,   color: '#f59e0b', bg: '#f59e0b15' },
            { key: 'Diluluskan', label: 'Diluluskan', count: counts.Diluluskan, color: '#10b981', bg: '#10b98115' },
            { key: 'Ditolak',    label: 'Ditolak',    count: counts.Ditolak,    color: '#ef4444', bg: '#ef444415' },
          ].map(stat => (
            <button
              key={stat.key}
              onClick={() => setFilterTab(stat.key as any)}
              className={cn(
                'rounded-[1.5rem] p-4 border text-left transition-all',
                filterTab === stat.key ? 'border-white/20' : 'border-white/[0.05]'
              )}
              style={{ background: filterTab === stat.key ? stat.bg : 'rgba(255,255,255,0.02)' }}
            >
              <p className="text-2xl font-black" style={{ color: filterTab === stat.key ? stat.color : '#ffffff40' }}>
                {stat.count}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-0.5">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Reports list */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40">
              Laporan {filterTab}
            </h2>
            <button
              onClick={loadReports}
              className="text-[10px] font-black uppercase tracking-widest text-white/25 hover:text-white/50 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3 h-3" /> Segarkan
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-24 rounded-2xl bg-white/[0.03] animate-pulse border border-white/[0.04]" />
              ))}
            </div>
          ) : filteredActive.length === 0 ? (
            <div className="py-16 rounded-[2rem] border-2 border-dashed border-white/[0.05] flex flex-col items-center justify-center gap-3 text-center">
              <FileText className="w-8 h-8 text-white/10" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                Tiada laporan {filterTab.toLowerCase()}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {filteredActive.map(report => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <ExcoReportCard
                      report={report}
                      themeColor={themeColor}
                      showActions={filterTab === 'Menunggu'}
                      onApprove={() => setActionDialog({ open: true, type: 'Diluluskan', report })}
                      onReject={() => setActionDialog({ open: true, type: 'Ditolak', report })}
                    />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Archived section */}
        {archived.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/25 hover:text-white/50 transition-all"
            >
              <Archive className="w-3.5 h-3.5" />
              Arkib Laporan ({archived.length})
              {showArchived ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <AnimatePresence>
              {showArchived && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  {archived.map(report => (
                    <ExcoReportCard
                      key={report.id}
                      report={report}
                      themeColor={themeColor}
                      showActions={false}
                      onApprove={() => {}}
                      onReject={() => {}}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={open => !open && setActionDialog({ open: false, type: null, report: null })}>
        <DialogContent className="rounded-[2rem] border-none bg-[#0f0f17] max-w-md p-0 overflow-hidden">
          <DialogHeader
            className="p-6 text-white"
            style={{ background: actionDialog.type === 'Diluluskan' ? '#10b98120' : '#ef444420' }}
          >
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              {actionDialog.type === 'Diluluskan'
                ? <><CheckCircle2 className="w-5 h-5 text-emerald-400" /> Lulus Laporan</>
                : <><XCircle className="w-5 h-5 text-rose-400" /> Tolak Laporan</>
              }
            </DialogTitle>
            {actionDialog.report && (
              <p className="text-[11px] text-white/50 font-medium mt-1 leading-relaxed">
                {actionDialog.report.file_name}
              </p>
            )}
          </DialogHeader>

          <div className="p-6 space-y-4">
            {actionDialog.type === 'Ditolak' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Nota Penolakan *
                </label>
                <Textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Nyatakan sebab penolakan dengan jelas..."
                  className="rounded-2xl bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20 font-medium resize-none min-h-[100px]"
                />
              </div>
            )}

            {actionDialog.type === 'Diluluskan' && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-emerald-400 font-medium">
                  Laporan akan diluluskan, diarkibkan, dan penghantar akan menerima notifikasi.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 border-t border-white/[0.06] gap-3">
            <Button
              variant="ghost"
              onClick={() => { setActionDialog({ open: false, type: null, report: null }); setRemarks(''); }}
              className="font-black text-[10px] uppercase tracking-widest text-white/30 hover:text-white rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleAction}
              disabled={submitting}
              className={cn(
                'flex-1 h-11 rounded-xl font-black text-[10px] uppercase tracking-widest text-white',
                actionDialog.type === 'Diluluskan' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
              )}
            >
              {submitting
                ? 'Memproses...'
                : actionDialog.type === 'Diluluskan' ? 'Sahkan & Lulus' : 'Sahkan & Tolak'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── CARD ────────────────────────────────────────────────────────────────────
function ExcoReportCard({ report, themeColor, showActions, onApprove, onReject }: {
  report: ExcoReport;
  themeColor: string;
  showActions: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const statusColors: Record<string, { text: string; bg: string }> = {
    'Menunggu':   { text: '#f59e0b', bg: '#f59e0b15' },
    'Diluluskan': { text: '#10b981', bg: '#10b98115' },
    'Ditolak':    { text: '#ef4444', bg: '#ef444415' },
  };
  const sc = statusColors[report.status] || statusColors['Menunggu'];

  return (
    <div className={cn(
      'rounded-[1.5rem] p-5 border flex gap-4',
      report.is_archived ? 'bg-white/[0.02] border-white/[0.04] opacity-60' : 'bg-white/[0.03] border-white/[0.06]'
    )}>
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${themeColor}15` }}
      >
        <FileText className="w-5 h-5" style={{ color: themeColor }} />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="font-black text-sm text-white leading-tight line-clamp-2">{report.file_name}</p>
          <span
            className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0"
            style={{ background: sc.bg, color: sc.text }}
          >
            {report.status}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-bold text-white/25">
          {report.submitter?.full_name && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {report.submitter.full_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(report.created_at), 'd MMM yyyy', { locale: ms })}
          </span>
        </div>

        {report.admin_feedback && report.status === 'Ditolak' && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <p className="text-[10px] text-rose-400/70 italic font-medium">{report.admin_feedback}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <a
            href={report.file_url}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-opacity hover:opacity-70"
            style={{ color: themeColor }}
          >
            <ExternalLink className="w-3 h-3" /> Buka Fail
          </a>

          {showActions && (
            <div className="flex gap-2 ml-auto">
              <button
                onClick={onReject}
                className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                Tolak
              </button>
              <button
                onClick={onApprove}
                className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                Lulus
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
