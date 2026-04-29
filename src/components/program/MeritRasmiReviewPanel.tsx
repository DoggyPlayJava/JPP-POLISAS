/**
 * MeritRasmiReviewPanel.tsx
 * Panel dual-review untuk merit_program_applications.
 *
 * Aliran:
 *   Kelab submit → pending
 *   → Akademik: vouch / not_vouch   (supporter role)
 *   → Kediaman: fully_approved / rejected  (kuasa mutlak)
 *   → Trigger auto-credit merit_eakademik kepada semua attendees
 *
 * Props:
 *   reviewerUnit  — 'AKADEMIK' | 'KEDIAMAN'
 *   themeColor    — hex warna panel
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';
import {
  Trophy, CheckCircle2, XCircle, Clock, ThumbsUp, ThumbsDown,
  Loader2, RefreshCw, AlertCircle, Users, CalendarDays, Info,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { hexToRgba, cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Application {
  id: string;
  program_id: string;
  program_type: 'takwim' | 'aktiviti';
  program_title: string;
  applied_by: string;
  merit_value: number;
  justification: string | null;
  status: string;
  akademik_reviewer_id: string | null;
  akademik_reviewed_at: string | null;
  akademik_vouch_notes: string | null;
  kediaman_reviewer_id: string | null;
  kediaman_reviewed_at: string | null;
  kediaman_notes: string | null;
  reject_reason: string | null;
  created_at: string;
  applicant?: { full_name: string; matric_no: string; avatar_url: string };
  attendee_count?: number;
}

interface Props {
  reviewerUnit: 'AKADEMIK' | 'KEDIAMAN';
  themeColor: string;
}

// ─── Status helpers ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:             { label: 'Menunggu',          color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  akademik_vouched:    { label: 'Akademik Vouched',  color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  akademik_not_vouched:{ label: 'Tidak Divouched',   color: '#f43f5e', bg: 'rgba(244,63,94,0.1)'  },
  fully_approved:      { label: 'Diluluskan',        color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  rejected:            { label: 'Ditolak',           color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function MeritRasmiReviewPanel({ reviewerUnit, themeColor }: Props) {
  const { user, profile } = useAuth();
  const [apps, setApps]           = useState<Application[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});

  // Which statuses to show depends on reviewer unit
  const pendingStatuses = reviewerUnit === 'AKADEMIK'
    ? ['pending']
    : ['akademik_vouched', 'akademik_not_vouched', 'pending'];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('merit_program_applications')
        .select(`
          *,
          applicant:applied_by(full_name, matric_no, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Dapatkan bilangan attendees per program
      const enriched: Application[] = await Promise.all(
        (data || []).map(async (app: any) => {
          const { count } = await supabase
            .from('program_attendees')
            .select('*', { count: 'exact', head: true })
            .eq('program_id', app.program_id)
            .in('status', ['attended', 'walk_in']);
          return { ...app, attendee_count: count ?? 0 };
        })
      );

      setApps(enriched);
    } catch (e: any) {
      toast.error('Gagal memuatkan permohonan: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleAkademikVouch = async (app: Application, vouched: boolean) => {
    if (saving) return;
    setSaving(app.id);
    const newStatus = vouched ? 'akademik_vouched' : 'akademik_not_vouched';
    const note = noteInput[app.id] || '';

    try {
      const { error } = await supabase.from('merit_program_applications').update({
        status: newStatus,
        akademik_reviewer_id: user?.id,
        akademik_reviewed_at: new Date().toISOString(),
        akademik_vouch_notes: note || null,
      }).eq('id', app.id);
      if (error) throw error;

      // Log ke merit_review_log
      await supabase.from('merit_review_log').insert({
        application_id: app.id,
        reviewer_id: user?.id,
        reviewer_unit: 'AKADEMIK',
        action: vouched ? 'vouched' : 'not_vouched',
        notes: note || null,
      });

      toast.success(vouched ? '✅ Permohonan di-vouch!' : '❌ Permohonan tidak di-vouch.');
      setExpanded(null);
      setNoteInput(prev => { const n = { ...prev }; delete n[app.id]; return n; });
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const handleKediamanDecide = async (app: Application, approved: boolean) => {
    if (saving) return;
    setSaving(app.id);
    const note = noteInput[app.id] || '';

    try {
      const newStatus = approved ? 'fully_approved' : 'rejected';
      const { error: updateErr } = await supabase.from('merit_program_applications').update({
        status: newStatus,
        kediaman_reviewer_id: user?.id,
        kediaman_reviewed_at: new Date().toISOString(),
        kediaman_notes: approved ? (note || null) : null,
        reject_reason: !approved ? (note || 'Ditolak oleh Exco Kediaman.') : null,
      }).eq('id', app.id);
      if (updateErr) throw updateErr;

      // Log
      await supabase.from('merit_review_log').insert({
        application_id: app.id,
        reviewer_id: user?.id,
        reviewer_unit: 'KEDIAMAN',
        action: approved ? 'approved' : 'rejected',
        notes: note || null,
      });

      // Auto-credit merit_eakademik kepada semua attendees jika approved
      if (approved) {
        const { data: attendees } = await supabase
          .from('program_attendees')
          .select('user_id')
          .eq('program_id', app.program_id)
          .in('status', ['attended', 'walk_in'])
          .eq('merit_rasmi_credited', false);

        if (attendees && attendees.length > 0) {
          // Credit each attendee
          for (const att of attendees) {
            await supabase.rpc('increment_merit_by_source', {
              p_user_id: att.user_id,
              p_points: app.merit_value,
              p_source: 'PROGRAM_RASMI',
            });
            await supabase.from('merit_transactions').insert({
              user_id: att.user_id,
              points: app.merit_value,
              reason: `Merit Rasmi: ${app.program_title}`,
              source: 'PROGRAM_RASMI',
              reference_id: app.program_id,
              actor_name: profile?.full_name || 'Exco Kediaman',
            });
          }
          // Mark credited
          await supabase.from('program_attendees')
            .update({ merit_rasmi_credited: true })
            .eq('program_id', app.program_id)
            .in('status', ['attended', 'walk_in']);

          toast.success(`✅ Diluluskan! ${attendees.length} peserta dikreditkan ${app.merit_value} merit rasmi.`);
        } else {
          toast.success('✅ Diluluskan! (Tiada peserta hadir untuk dikreditkan)');
        }
      } else {
        toast.success('Permohonan ditolak.');
      }

      setExpanded(null);
      setNoteInput(prev => { const n = { ...prev }; delete n[app.id]; return n; });
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  // ─── Filtered lists ──────────────────────────────────────────────────────────
  const pending  = apps.filter(a => pendingStatuses.includes(a.status));
  const resolved = apps.filter(a => {
    if (reviewerUnit === 'AKADEMIK') return ['akademik_vouched','akademik_not_vouched'].includes(a.status);
    return ['fully_approved','rejected'].includes(a.status);
  });

  const formatDT = (d: string) => {
    try { return format(parseISO(d), "d MMM yyyy, h:mm a", { locale: ms }); }
    catch { return d; }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: themeColor }}>
            {reviewerUnit === 'AKADEMIK' ? 'Exco Akademik — Voucher' : 'Exco Kediaman — Kuasa Mutlak'}
          </p>
          <h3 className="text-xl font-black text-white mt-0.5">Permohonan Merit Rasmi</h3>
        </div>
        <button
          onClick={load}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: hexToRgba(themeColor, 0.08), color: themeColor }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: hexToRgba(themeColor, 0.06), border: `1px solid ${hexToRgba(themeColor, 0.2)}` }}>
        <Info size={14} style={{ color: themeColor }} className="shrink-0 mt-0.5" />
        <p className="text-[10px] text-white/50 leading-relaxed">
          {reviewerUnit === 'AKADEMIK'
            ? 'Sebagai Exco Akademik, anda berperanan sebagai Supporter (Voucher). Vouch bermakna anda menyokong permohonan ini untuk dipertimbangkan oleh Exco Kediaman. Kuasa mutlak kelulusan adalah pada Exco Kediaman.'
            : 'Sebagai Exco Kediaman, anda mempunyai kuasa mutlak untuk meluluskan atau menolak permohonan merit rasmi. Merit akan dikreditkan secara automatik kepada semua peserta yang hadir sebaik sahaja anda meluluskan.'
          }
        </p>
      </div>

      {loading ? (
        <LoadingSkeleton themeColor={themeColor} />
      ) : (
        <>
          {/* ── Pending Applications ── */}
          <Section title={`Menunggu Tindakan (${pending.length})`} color={themeColor} count={pending.length}>
            {pending.length === 0 ? (
              <EmptyState label="Tiada permohonan menunggu tindakan" />
            ) : (
              pending.map(app => (
                <AppCard
                  key={app.id}
                  app={app}
                  themeColor={themeColor}
                  reviewerUnit={reviewerUnit}
                  expanded={expanded === app.id}
                  saving={saving === app.id}
                  noteValue={noteInput[app.id] || ''}
                  onToggle={() => setExpanded(expanded === app.id ? null : app.id)}
                  onNoteChange={(v) => setNoteInput(prev => ({ ...prev, [app.id]: v }))}
                  onAkademikVouch={handleAkademikVouch}
                  onKediamanDecide={handleKediamanDecide}
                  formatDT={formatDT}
                />
              ))
            )}
          </Section>

          {/* ── History ── */}
          {resolved.length > 0 && (
            <Section title={`Sejarah (${resolved.length})`} color="rgba(255,255,255,0.2)" count={resolved.length} collapsed>
              {resolved.map(app => (
                <AppCardHistory key={app.id} app={app} reviewerUnit={reviewerUnit} formatDT={formatDT} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

// ─── Application Card (actionable) ───────────────────────────────────────────
function AppCard({ app, themeColor, reviewerUnit, expanded, saving, noteValue, onToggle, onNoteChange, onAkademikVouch, onKediamanDecide, formatDT }: any) {
  const cfg = STATUS_CFG[app.status] || STATUS_CFG.pending;
  const canAct = reviewerUnit === 'AKADEMIK'
    ? app.status === 'pending'
    : ['akademik_vouched', 'akademik_not_vouched', 'pending'].includes(app.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.5rem] overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Card header */}
      <button onClick={onToggle} className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors">
        {/* Merit badge */}
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: hexToRgba(themeColor, 0.12) }}>
          <Trophy size={16} style={{ color: themeColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-black text-white leading-snug line-clamp-1">{app.program_title}</p>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
              style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[10px] font-bold text-white/40">{app.program_type === 'takwim' ? 'Takwim Rasmi' : 'Aktiviti Kelab'}</span>
            <span className="flex items-center gap-1 text-[10px] font-black" style={{ color: themeColor }}>
              <Trophy size={9} /> +{app.merit_value} merit
            </span>
            {app.attendee_count > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-white/40">
                <Users size={9} /> {app.attendee_count} peserta hadir
              </span>
            )}
          </div>
          <p className="text-[9px] text-white/30 mt-0.5">{app.applicant?.full_name} · {formatDT(app.created_at)}</p>
        </div>

        {expanded ? <ChevronUp size={13} className="text-white/30 shrink-0 mt-1" /> : <ChevronDown size={13} className="text-white/30 shrink-0 mt-1" />}
      </button>

      {/* Expanded detail + actions */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>

              {/* Justification */}
              {app.justification && (
                <div className="mt-3 p-3 rounded-2xl bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase text-white/30 mb-1">Justifikasi Permohonan</p>
                  <p className="text-[11px] text-white/60">{app.justification}</p>
                </div>
              )}

              {/* Akademik vouch status (for Kediaman view) */}
              {reviewerUnit === 'KEDIAMAN' && (
                <div className="p-3 rounded-2xl" style={{ background: app.status === 'akademik_vouched' ? 'rgba(99,102,241,0.08)' : 'rgba(244,63,94,0.06)', border: `1px solid ${app.status === 'akademik_vouched' ? 'rgba(99,102,241,0.2)' : 'rgba(244,63,94,0.15)'}` }}>
                  <p className="text-[9px] font-black uppercase mb-1" style={{ color: app.status === 'akademik_vouched' ? '#6366f1' : '#f43f5e' }}>
                    {app.status === 'akademik_vouched' ? '✅ Disokong oleh Akademik' : app.status === 'pending' ? '⏳ Belum disemak Akademik' : '❌ Tidak disokong Akademik'}
                  </p>
                  {app.akademik_vouch_notes && <p className="text-[10px] text-white/50">{app.akademik_vouch_notes}</p>}
                </div>
              )}

              {/* Note input */}
              {canAct && (
                <textarea
                  value={noteValue}
                  onChange={e => onNoteChange(e.target.value)}
                  placeholder={reviewerUnit === 'AKADEMIK' ? 'Nota vouch (pilihan)...' : 'Nota keputusan (pilihan)...'}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-2xl text-[11px] font-medium outline-none resize-none bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 focus:border-white/25 transition-all"
                />
              )}

              {/* Action buttons */}
              {canAct && (
                <div className="flex gap-2">
                  {reviewerUnit === 'AKADEMIK' ? (
                    <>
                      <button
                        onClick={() => onAkademikVouch(app, true)}
                        disabled={!!saving}
                        className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-2xl text-[10px] font-black uppercase tracking-wide text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                        style={{ background: '#6366f1' }}
                      >
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <ThumbsUp size={13} />}
                        Vouch
                      </button>
                      <button
                        onClick={() => onAkademikVouch(app, false)}
                        disabled={!!saving}
                        className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-2xl text-[10px] font-black uppercase tracking-wide text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                        style={{ background: '#64748b' }}
                      >
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <ThumbsDown size={13} />}
                        Tidak Vouch
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onKediamanDecide(app, true)}
                        disabled={!!saving}
                        className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-2xl text-[10px] font-black uppercase tracking-wide text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                        style={{ background: '#10b981' }}
                      >
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        Lulus & Kredit Merit
                      </button>
                      <button
                        onClick={() => onKediamanDecide(app, false)}
                        disabled={!!saving}
                        className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-2xl text-[10px] font-black uppercase tracking-wide text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                        style={{ background: '#ef4444' }}
                      >
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                        Tolak
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── History Card ─────────────────────────────────────────────────────────────
function AppCardHistory({ app, reviewerUnit, formatDT }: any) {
  const cfg = STATUS_CFG[app.status] || STATUS_CFG.pending;
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-white/70 truncate">{app.program_title}</p>
        <p className="text-[9px] text-white/30">
          +{app.merit_value} merit ·{' '}
          {reviewerUnit === 'AKADEMIK' && app.akademik_reviewed_at ? formatDT(app.akademik_reviewed_at) : ''}
          {reviewerUnit === 'KEDIAMAN' && app.kediaman_reviewed_at ? formatDT(app.kediaman_reviewed_at) : ''}
        </p>
      </div>
      <Trophy size={13} style={{ color: cfg.color, opacity: 0.7 }} />
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, color, count, children, collapsed = false }: any) {
  const [open, setOpen] = useState(!collapsed);
  return (
    <div className="space-y-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left">
        <p className="text-[10px] font-black uppercase tracking-widest flex-1" style={{ color }}>
          {title}
        </p>
        {open ? <ChevronUp size={13} style={{ color }} /> : <ChevronDown size={13} style={{ color }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-8 text-center">
      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-white/10" />
      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{label}</p>
    </div>
  );
}

function LoadingSkeleton({ themeColor }: { themeColor: string }) {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 rounded-[1.5rem] animate-pulse" style={{ background: hexToRgba(themeColor, 0.04) }} />
      ))}
    </div>
  );
}
