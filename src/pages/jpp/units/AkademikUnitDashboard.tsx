import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { hexToRgba } from '@/lib/utils';
import { sendNotificationToUser } from '@/lib/notifications';
import { useSearchParams } from 'react-router-dom';
import {
  Trophy, Users, Star, CheckCircle, XCircle, Clock,
  Settings, LayoutDashboard, QrCode, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, Shield, Unlock, BarChart3, ShieldAlert, Award,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';
import { QrMeritManager } from '@/pages/akademik/AkademikQrScan';
import { JPP_MT_POSITIONS } from '@/types';
import { DemeritManager } from '@/pages/akademik/DemeritManager';
import MakmpAdminDashboardPage from './MakmpAdminDashboardPage';
import { PromptDialog } from '@/components/ui/PromptDialog';

const THEME = '#818CF8';

// ─── Merit Config Panel (SUPER_ADMIN only) ────────────────────
function MeritConfigPanel() {
  const { t } = useTranslation(['akademik', 'jpp', 'common']);
  const [config, setConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { profile, isSuperAdmin } = useAuth();
  const isExcoAkademik = (profile?.role === 'JPP' && profile?.jpp_unit === 'AKADEMIK');
  const canEditConfig = isSuperAdmin || isExcoAkademik;

  const JENIS    = ['ANUGERAH', 'SIJIL', 'PERTANDINGAN'];
  const PERINGKAT = ['ANTARABANGSA', 'KEBANGSAAN', 'NEGERI', 'DAERAH'];

  useEffect(() => {
    supabase.from('akademik_merit_config').select('*').then(({ data }) => {
      setConfig(data || []);
      setLoading(false);
    });
  }, []);

  const getValue = (jenis: string, peringkat: string) =>
    config.find(c => c.jenis === jenis && c.peringkat === peringkat)?.merit_value ?? 0;

  const updateValue = async (jenis: string, peringkat: string, value: number) => {
    const key = jenis + '_' + peringkat;
    setSaving(key);
    const { error } = await supabase
      .from('akademik_merit_config')
      .update({ merit_value: value })
      .eq('jenis', jenis)
      .eq('peringkat', peringkat);
    if (error) toast.error(t('jpp:akademik_update_failed', 'Gagal kemaskini.')); else {
      setConfig(prev => prev.map(c => c.jenis === jenis && c.peringkat === peringkat ? { ...c, merit_value: value } : c));
      toast.success(t('jpp:akademik_merit_updated', 'Nilai merit dikemaskini!'));
    }
    setSaving(null);
  };

  if (!canEditConfig) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 text-center space-y-3 shadow-sm">
        <Shield className="w-8 h-8 mx-auto text-slate-300 dark:text-white/15" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-white/20">
          {t('jpp:akademik_restricted_access_banner', 'Akses Terhad — SUPER_ADMIN_JPP / Exco Akademik sahaja')}
        </p>
        <p className="text-[10px] text-slate-400 dark:text-white/15">{t('jpp:akademik_restricted_access_desc', 'Hanya SUPER_ADMIN_JPP dan Exco Akademik boleh mengubah nilai merit.')}</p>
        {/* Read-only table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 font-black text-slate-400 dark:text-white/25 uppercase tracking-wider">{t('akademik:level', 'Peringkat')}</th>
                {JENIS.map(j => <th key={j} className="py-2 px-3 font-black text-slate-400 dark:text-white/25 uppercase tracking-wider">{j}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={4} className="text-center py-4 text-slate-400 dark:text-white/20">{t('common:loading', 'Memuatkan...')}</td></tr> : PERINGKAT.map(p => (
                <tr key={p} className="border-t border-slate-100 dark:border-white/[0.04]">
                  <td className="py-2 pr-4 font-black text-slate-600 dark:text-white/40">{p}</td>
                  {JENIS.map(j => (
                    <td key={j} className="py-2 px-3 text-center font-black" style={{ color: THEME }}>{getValue(j, p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (loading) return <div className="h-48 rounded-2xl bg-white dark:bg-white/[0.03] animate-pulse border border-slate-200 dark:border-white/[0.04]" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-amber-500" />
        <p className="text-[11px] font-black text-amber-600 dark:text-amber-400/70 uppercase tracking-widest">{t('jpp:akademik_admin_only_merit', 'Admin Only — Nilai Merit')}</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]">
              <th className="text-left p-4 font-black text-slate-500 dark:text-white/30 uppercase tracking-wider text-[10px]">{t('akademik:level', 'Peringkat')}</th>
              {JENIS.map(j => <th key={j} className="p-4 font-black text-slate-500 dark:text-white/30 uppercase tracking-wider text-[10px]">{j}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERINGKAT.map(p => (
              <tr key={p} className="border-t border-slate-100 dark:border-white/[0.04]">
                <td className="p-4 font-black text-slate-700 dark:text-white/60 text-[11px]">{p}</td>
                {JENIS.map(j => {
                  const key = `${j}_${p}`;
                  const val = getValue(j, p);
                  return (
                    <td key={j} className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => updateValue(j, p, Math.max(0, val - 1))}
                          className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-all flex items-center justify-center font-black text-sm">
                          −
                        </button>
                        <span className="w-8 text-center font-black text-sm" style={{ color: THEME }}>
                          {saving === key ? <Loader2 className="w-3 h-3 animate-spin inline" /> : val}
                        </span>
                        <button onClick={() => updateValue(j, p, val + 1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-all flex items-center justify-center font-black text-sm">
                          +
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Pencapaian Review Panel ──────────────────────────────────
function PencapaianReviewPanel() {
  const { t } = useTranslation(['jpp', 'common']);
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'MENUNGGU' | 'SEMUA'>('MENUNGGU');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [customMerits, setCustomMerits] = useState<Record<string, number>>({});
  const [promptConfig, setPromptConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
    inputLabel?: string;
    placeholder?: string;
    initialValue?: string;
    variant?: 'default' | 'destructive';
    onConfirm: (val: string) => void;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Step 1: Fetch pencapaian rows (no nested joins — avoids PostgREST INNER JOIN dropping rows via RLS)
      let q = supabase
        .from('akademik_pencapaian')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter === 'MENUNGGU') q = q.eq('status', 'MENUNGGU');

      const { data: pencapaianRows, error: pencError } = await q;
      if (pencError) {
        console.error('[semakan] pencapaian error:', pencError.message);
        setItems([]);
        setLoading(false);
        return;
      }

      if (!pencapaianRows || pencapaianRows.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Step 2: Enrich with profile info
      const userIds   = [...new Set(pencapaianRows.map(r => r.user_id))];
      const catIds    = [...new Set(pencapaianRows.map(r => r.category_id).filter(Boolean))];

      const [profilesRes, catsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, department, matric_no').in('id', userIds),
        catIds.length
          ? supabase.from('akademik_sijil_categories').select('id, name, icon, color').in('id', catIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p]));
      const catMap     = Object.fromEntries(((catsRes as any).data || []).map((c: any) => [c.id, c]));

      const enriched = pencapaianRows.map(row => ({
        ...row,
        profiles:    profileMap[row.user_id]   || null,
        akademik_sijil_categories: catMap[row.category_id] || null,
      }));

      setItems(enriched);
    } catch (e: any) {
      console.error('[semakan] unexpected error:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (id: string, status: 'DISAHKAN' | 'DITOLAK', merit: number, reason?: string) => {
    setReviewing(id);
    try {
      const item = items.find(i => i.id === id);
      if (!item) throw new Error(t('jpp:akademik_item_not_found', 'Item tidak dijumpai.'));

      // Update status pencapaian
      const { error: updateErr } = await supabase.from('akademik_pencapaian').update({
        status,
        verified_at: new Date().toISOString(),
        rejection_reason: reason || null,
        ...(status === 'DISAHKAN' ? { merit_override: merit } : {}),
      }).eq('id', id);
      if (updateErr) throw new Error(t('jpp:akademik_status_update_failed', 'Kemaskini status gagal: {{error}}', { error: updateErr.message }));

      if (status === 'DISAHKAN') {
        // Insert merit transaction with correct 'points' column
        const { error: txErr } = await supabase.from('merit_transactions').insert({
          user_id:      item.user_id,
          club_id:      null,
          points:       merit,
          reason:       t('jpp:akademik_achievement_reason', 'Pencapaian Akademik: {{name}}', { name: item.nama_pencapaian }),
          actor_name:   t('jpp:akademik_exco_name', 'Exco Akademik'),
          source:       'AKADEMIK',
          reference_id: id,
        });
        if (txErr) throw new Error(t('jpp:akademik_tx_failed', 'Insert merit_transactions gagal: {{error}}', { error: txErr.message }));

        // Increment merit_akademik split + total merit
        const { error: rpcErr } = await supabase.rpc('increment_merit_by_source', {
          p_uid:   item.user_id,
          p_delta: merit,
          p_src:   'AKADEMIK',
        });
        if (rpcErr) throw new Error(t('jpp:akademik_rpc_failed', 'RPC increment_merit_by_source gagal: {{error}}', { error: rpcErr.message }));

        // ── Auto-sort document to personal folder ──
        try {
          if (item.drive_view_url) {
            await supabase.rpc('auto_sort_pencapaian_file', { p_pencapaian_id: id });
          }
        } catch (sortErr) {
          console.warn('[auto-sort] failed to sort certificate:', sortErr);
          // Non-blocking error, allow verification to succeed
        }
      }

      toast.success(status === 'DISAHKAN' ? t('jpp:akademik_verified_merit_granted', '✅ Disahkan! +{{merit}} merit diberikan.', { merit }) : t('jpp:akademik_rejected_toast', 'Pencapaian ditolak.'));

      // ── Notifikasi kepada pelajar ──
      try {
        await sendNotificationToUser(item.user_id, {
          title: status === 'DISAHKAN' ? t('jpp:akademik_notif_verified_title', '✅ Pencapaian Disahkan') : t('jpp:akademik_notif_rejected_title', '❌ Pencapaian Ditolak'),
          message: status === 'DISAHKAN' ? t('jpp:akademik_notif_verified_msg', 'Pencapaian "{{name}}" telah disahkan! +{{merit}} merit diberikan.', { name: item.nama_pencapaian, merit }) : t('jpp:akademik_notif_rejected_msg', 'Pencapaian "{{name}}" ditolak.{{reason}}', { name: item.nama_pencapaian, reason: reason ? ' Sebab: ' + reason : '' }),
          type: 'MERIT_REVIEW',
          module: 'AKADEMIK',
          link: '/akademik/pencapaian',
        });
      } catch {} // Jangan block bisnes logic

      load();
    } catch (e: any) {
      console.error('[handleVerify] error:', e);
      toast.error(e.message || t('jpp:akademik_verify_error', 'Ralat semasa mengesahkan pencapaian.'));
    }
    setReviewing(null);
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {(['MENUNGGU', 'SEMUA'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all"
            style={filter === f
              ? { background: `${THEME}20`, borderColor: THEME, color: THEME }
              : { background: 'var(--tw-empty, transparent)', borderColor: 'rgba(148,163,184,0.3)', color: '#64748b' }
            }>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-white/[0.03] animate-pulse border border-slate-200 dark:border-white/[0.04]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <CheckCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-white/10" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/20">
            {filter === 'MENUNGGU' ? t('jpp:akademik_no_pending_review', 'Tiada pencapaian menunggu semakan') : t('jpp:akademik_no_records', 'Tiada rekod pencapaian')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const cat = item.akademik_sijil_categories;
            const profile = item.profiles;
            const defaultMerit = item.merit_auto ?? 0;
            const merit = item.status === 'MENUNGGU' 
              ? (customMerits[item.id] ?? defaultMerit) 
              : (item.merit_override ?? defaultMerit);
            return (
              <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 space-y-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ background: cat ? `${cat.color}20` : `${THEME}15` }}>
                    {cat?.icon || '🏆'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">{item.nama_pencapaian}</p>
                    <p className="text-[10px] text-slate-500 dark:text-white/40 font-bold mt-0.5">
                      {profile?.full_name} · {profile?.department?.toUpperCase()} · {profile?.matric_no}
                    </p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/40">{item.jenis}</span>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/40">{item.peringkat}</span>
                      <span className="text-[9px] font-black" style={{ color: THEME }}>+{merit} {t('jpp:akademik_merit_unit', 'merit')}</span>
                    </div>
                  </div>
                  {item.drive_view_url && (
                    <a href={item.drive_view_url} target="_blank" rel="noopener noreferrer"
                      className="text-[9px] font-black text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white/60 underline shrink-0 transition-colors">
                      {t('jpp:akademik_view_certificate', 'Lihat Sijil')}
                    </a>
                  )}
                </div>

                {item.status === 'MENUNGGU' && (
                  <div className="pt-3 border-t border-slate-100 dark:border-white/[0.04] space-y-3">
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/[0.02] p-2 rounded-xl border border-slate-200 dark:border-white/[0.04]">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/40 shrink-0">{t('jpp:akademik_merit_score_max', 'Markah Merit (Max')} {defaultMerit})</label>
                      <input
                        type="number"
                        min="0"
                        max={defaultMerit}
                        value={customMerits[item.id] ?? defaultMerit}
                        onChange={e => {
                          let val = parseInt(e.target.value);
                          if (isNaN(val)) val = 0;
                          if (val > defaultMerit) val = defaultMerit;
                          if (val < 0) val = 0;
                          setCustomMerits(prev => ({ ...prev, [item.id]: val }));
                        }}
                        className="w-16 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-2 py-1 text-sm text-center text-slate-900 dark:text-white font-black outline-none focus:border-indigo-400 dark:focus:border-white/20 transition-all shadow-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (merit < defaultMerit) {
                            setPromptConfig({
                              open: true,
                              title: t('jpp:akademik_merit_reduction_reason', 'Sebab Pengurangan Markah'),
                              description: t('jpp:akademik_reduction_reason_desc', 'Sila nyatakan sebab pengurangan markah merit untuk "{{name}}":', { name: item.nama_pencapaian }),
                              inputLabel: t('jpp:akademik_reason_label', 'Sebab Pengurangan'),
                              placeholder: t('jpp:akademik_reduction_placeholder', 'cth: Sijil penyertaan peringkat zon, bukan kebangsaan'),
                              variant: 'destructive',
                              onConfirm: (reason) => {
                                if (!reason || !reason.trim()) {
                                  toast.error(t('jpp:akademik_reduction_reason_required', 'Sebab pengurangan wajib diisi!'));
                                  return;
                                }
                                handleVerify(item.id, 'DISAHKAN', merit, reason.trim());
                                setPromptConfig(p => ({ ...p, open: false }));
                              },
                            });
                          } else {
                            handleVerify(item.id, 'DISAHKAN', merit);
                          }
                        }}
                        disabled={reviewing === item.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 transition-all"
                      >
                        {reviewing === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        {t('jpp:akademik_confirm_action', 'Sahkan')} (+{merit} {t('jpp:merit_pts', 'merit')})
                      </button>
                      <button
                        onClick={() => {
                          setPromptConfig({
                            open: true,
                            title: t('jpp:akademik_reject_achievement', 'Tolak Pencapaian'),
                            description: t('jpp:akademik_rejection_reason_desc', 'Sebab penolakan untuk "{{name}}":', { name: item.nama_pencapaian }),
                            inputLabel: t('jpp:akademik_reason_label', 'Sebab Penolakan'),
                            placeholder: t('jpp:akademik_rejection_placeholder', 'cth: Bukti penyertaan tidak jelas'),
                            variant: 'destructive',
                            onConfirm: (reason) => {
                              handleVerify(item.id, 'DITOLAK', 0, reason.trim());
                              setPromptConfig(p => ({ ...p, open: false }));
                            },
                          });
                        }}
                        disabled={reviewing === item.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-500/15 border border-rose-500/25 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 disabled:opacity-50 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {t('jpp:akademik_reject_achievement', 'Tolak')}
                      </button>
                    </div>
                  </div>
                )}
                {item.status !== 'MENUNGGU' && (
                  <div className="pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                    <span className={`text-[9px] font-black uppercase ${item.status === 'DISAHKAN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {item.status}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <PromptDialog
        open={promptConfig.open}
        onOpenChange={(open) => setPromptConfig(p => ({ ...p, open }))}
        title={promptConfig.title}
        description={promptConfig.description}
        inputLabel={promptConfig.inputLabel}
        placeholder={promptConfig.placeholder}
        initialValue={promptConfig.initialValue}
        variant={promptConfig.variant || 'default'}
        confirmLabel={t('jpp:save', 'Simpan')}
        cancelLabel={t('jpp:cancel', 'Batal')}
        onConfirm={promptConfig.onConfirm}
      />
    </div>
  );
}

// ─── Unlock Requests Review Panel ────────────────────────────
function UnlockRequestsPanel() {
  const { t } = useTranslation(['jpp', 'common']);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState<string | null>(null);
  const [unlockPromptConfig, setUnlockPromptConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
    inputLabel?: string;
    placeholder?: string;
    initialValue?: string;
    inputType?: 'text' | 'number';
    variant?: 'default' | 'destructive';
    onConfirm: (val: string) => void;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: reqs } = await supabase
        .from('akademik_unlock_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!reqs || reqs.length === 0) { setRequests([]); setLoading(false); return; }

      // Enrich with pencapaian + user info
      const pencIds  = [...new Set(reqs.map(r => r.pencapaian_id))];
      const userIds  = [...new Set(reqs.map(r => r.user_id))];
      const [pencRes, profRes] = await Promise.all([
        supabase.from('akademik_pencapaian').select('id, nama_pencapaian, jenis, peringkat, merit_override, merit_auto').in('id', pencIds),
        supabase.from('profiles').select('id, full_name, department').in('id', userIds),
      ]);
      const pencMap = Object.fromEntries((pencRes.data || []).map(p => [p.id, p]));
      const profMap = Object.fromEntries((profRes.data || []).map(p => [p.id, p]));
      setRequests(reqs.map(r => ({ ...r, pencapaian: pencMap[r.pencapaian_id], profile: profMap[r.user_id] })));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDecision = async (req: any, decision: 'DILULUSKAN' | 'DITOLAK', note?: string) => {
    setActing(req.id);
    try {
      const unlocked_until = decision === 'DILULUSKAN'
        ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase.from('akademik_unlock_requests').update({
        status:        decision,
        reviewed_by:   (await supabase.auth.getUser()).data.user?.id,
        reviewed_at:   new Date().toISOString(),
        reviewer_note: note || null,
        unlocked_until,
      }).eq('id', req.id);
      if (error) throw error;

      toast.success(decision === 'DILULUSKAN' ? t('jpp:akademik_unlock_approved_toast', '✅ Diluluskan! Pelajar mempunyai 48 jam untuk edit/padam.') : t('jpp:akademik_unlock_rejected_toast', '❌ Permohonan ditolak.'));

      // ── Notifikasi kepada pelajar ──
      try {
        await sendNotificationToUser(req.user_id, {
          title: decision === 'DILULUSKAN' ? t('jpp:akademik_unlock_approved_notif_title', '🔓 Permohonan Buka Kunci Diluluskan') : t('jpp:akademik_unlock_rejected_notif_title', '⛔ Permohonan Buka Kunci Ditolak'),
          message: decision === 'DILULUSKAN' ? t('jpp:akademik_unlock_approved_notif_msg', 'Permohonan buka kunci untuk "{{name}}" diluluskan. Anda ada 48 jam untuk mengedit.', { name: req.pencapaian?.nama_pencapaian }) : t('jpp:akademik_unlock_rejected_notif_msg', 'Permohonan buka kunci untuk "{{name}}" ditolak.{{reason}}', { name: req.pencapaian?.nama_pencapaian, reason: note ? ' Sebab: ' + note : '' }),
          type: 'UNLOCK_DECISION',
          module: 'AKADEMIK',
          link: '/akademik/pencapaian',
        });
      } catch {}

      load();
    } catch (e: any) {
      toast.error(e.message || t('jpp:error', 'Ralat.'));
    } finally { setActing(null); }
  };

  const handleEditMerit = async (req: any, newMerit: number) => {
    setActing(req.id);
    try {
      const oldMerit = req.pencapaian.merit_override ?? req.pencapaian.merit_auto ?? 0;
      const difference = newMerit - oldMerit;

      const { error: pencErr } = await supabase.from('akademik_pencapaian').update({
        merit_override: newMerit,
        rejection_reason: null, // Clear reduction reason since it's adjusted
      }).eq('id', req.pencapaian_id);
      if (pencErr) throw pencErr;

      if (difference !== 0) {
        const { error: txErr } = await supabase.from('merit_transactions').insert({
          user_id:      req.user_id,
          club_id:      null,
          points:       difference,
          reason:       t('jpp:akademik_appeal_adjustment_reason', 'Pelarasan Rayuan: {{name}}', { name: req.pencapaian.nama_pencapaian }),
          actor_name:   t('jpp:akademik_exco_name', 'Exco Akademik'),
          source:       'AKADEMIK',
          reference_id: req.pencapaian_id,
        });
        if (txErr) throw new Error(t('jpp:akademik_tx_failed', 'Insert merit_transactions gagal: {{error}}', { error: txErr.message }));
        const { error: rpcErr } = await supabase.rpc('increment_merit_by_source', {
          p_uid:   req.user_id,
          p_delta: difference,
          p_src:   'AKADEMIK',
        });
        if (rpcErr) throw new Error(t('jpp:akademik_rpc_failed', 'RPC increment_merit_by_source gagal: {{error}}', { error: rpcErr.message }));
      }

      await supabase.from('akademik_unlock_requests').update({
        status: 'DILULUSKAN',
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        reviewed_at: new Date().toISOString(),
        reviewer_note: t('jpp:akademik_appeal_approved_note', 'Rayuan markah diluluskan. Markah dikemaskini ke {{merit}}.', { merit: newMerit }),
        unlocked_until: null,
      }).eq('id', req.id);

      toast.success(t('jpp:akademik_merit_updated_to', 'Markah dikemaskini ke {{merit}}!', { merit: newMerit }));

      // ── Notifikasi kepada pelajar ──
      try {
        await sendNotificationToUser(req.user_id, {
          title: t('jpp:akademik_merit_updated_notif_title', '📝 Markah Merit Dikemaskini'),
          message: t('jpp:akademik_merit_updated_notif_msg', 'Markah merit untuk "{{name}}" telah dikemaskini kepada {{merit}} mata.', { name: req.pencapaian?.nama_pencapaian, merit: newMerit }),
          type: 'MERIT_ADJUSTED',
          module: 'AKADEMIK',
          link: '/akademik/pencapaian',
        });
      } catch {}

      load();
    } catch (e: any) {
      toast.error(t('jpp:akademik_merit_update_fail', 'Gagal kemaskini markah:') + ' ' + e.message);
    } finally { setActing(null); }
  };

  const pending = requests.filter(r => r.status === 'MENUNGGU');
  const done    = requests.filter(r => r.status !== 'MENUNGGU');

  const RequestCard = ({ req }: { req: any; key?: React.Key }) => (
    <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 space-y-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${THEME}15`, color: THEME }}>
          <Unlock className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">{req.pencapaian?.nama_pencapaian ?? '—'}</p>
          <p className="text-[10px] text-slate-500 dark:text-white/40 font-bold mt-0.5">
            {req.profile?.full_name} · {req.profile?.department?.toUpperCase()}
          </p>
          <p className="text-[10px] text-amber-700 dark:text-amber-300/80 font-medium mt-1 bg-amber-500/10 rounded-lg px-2 py-1 border border-amber-500/15">
            📝 {t('common:reason', 'Sebab')}: {req.reason}
          </p>
        </div>
        <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase ${
          req.status === 'MENUNGGU'   ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
          req.status === 'DILULUSKAN' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
          'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
        }`}>{req.status}</span>
      </div>
      {req.status === 'MENUNGGU' && (
        <div className="flex gap-2 border-t border-slate-100 dark:border-white/[0.04] pt-3">
          <button
            onClick={() => handleDecision(req, 'DILULUSKAN')}
            disabled={acting === req.id}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 transition-all"
          >
            {acting === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            {t('jpp:akademik_tab_unlock', 'Buka Kunci')}
          </button>
          <button
            onClick={() => {
              const oldMerit = req.pencapaian.merit_override ?? req.pencapaian.merit_auto ?? 0;
              const maxMerit = req.pencapaian.merit_auto ?? 0;
              setUnlockPromptConfig({
                open: true,
                title: t('jpp:akademik_merit_adj_title', 'Pelarasan Markah Merit'),
                description: t('jpp:akademik_merit_adj_desc', 'Pencapaian: {{name}}\nMarkah sedia ada: {{oldMerit}} (Had maksimum: {{maxMerit}})', { name: req.pencapaian.nama_pencapaian, oldMerit, maxMerit }),
                inputLabel: t('jpp:akademik_new_score_label', 'Markah Baharu'),
                placeholder: `0 - ${maxMerit}`,
                initialValue: String(oldMerit),
                inputType: 'number',
                onConfirm: (newMeritStr) => {
                  const newMerit = parseInt(newMeritStr);
                  if (isNaN(newMerit) || newMerit < 0) {
                    toast.error(t('jpp:akademik_invalid_score', 'Markah tidak sah.'));
                  } else if (newMerit > maxMerit) {
                    toast.error(t('jpp:akademik_score_exceed_max', 'Markah tidak boleh melebihi had maksimum ({{max}}).', { max: maxMerit }));
                  } else {
                    handleEditMerit(req, newMerit);
                    setUnlockPromptConfig(p => ({ ...p, open: false }));
                  }
                },
              });
            }}
            disabled={acting === req.id}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase bg-amber-500/15 border border-amber-500/25 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 disabled:opacity-50 transition-all"
          >
            <Star className="w-3.5 h-3.5" /> {t('jpp:akademik_edit_score_btn', 'Edit Markah')}
          </button>
          <button
            onClick={() => {
              setUnlockPromptConfig({
                open: true,
                title: t('jpp:akademik_unlock_rejected', 'Tolak Permohonan Buka Kunci'),
                description: t('jpp:akademik_unlock_rejection_note_desc', 'Nyatakan nota penolakan permohonan buka kunci merit:'),
                inputLabel: t('jpp:akademik_reason_label', 'Nota Penolakan'),
                placeholder: t('jpp:akademik_unlock_rejection_placeholder', 'cth: Maklumat yang diberikan tidak mencukupi'),
                variant: 'destructive',
                onConfirm: (note) => {
                  handleDecision(req, 'DITOLAK', note.trim());
                  setUnlockPromptConfig(p => ({ ...p, open: false }));
                },
              });
            }}
            disabled={acting === req.id}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase bg-rose-500/15 border border-rose-500/25 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 disabled:opacity-50 transition-all"
          >
            <XCircle className="w-3.5 h-3.5" /> {t('jpp:akademik_reject_achievement', 'Tolak')}
          </button>
        </div>
      )}
      {req.reviewer_note && (
        <p className="text-[9px] text-slate-400 dark:text-white/30 italic border-t border-slate-100 dark:border-white/[0.04] pt-2">Nota: {req.reviewer_note}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-white/[0.03] animate-pulse" />)}</div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400/80">{t('jpp:akademik_pending_count', 'Menunggu ({{count}})', { count: pending.length })}</p>
              {pending.map(r => <RequestCard key={r.id} req={r} />)}
            </div>
          )}
          {pending.length === 0 && (
            <div className="py-12 text-center">
              <Unlock className="w-8 h-8 mx-auto text-slate-300 dark:text-white/10 mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20">{t('jpp:akademik_no_unlock_requests', 'Tiada permohonan buka kunci menunggu')}</p>
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20">{t('jpp:akademik_done_count', 'Selesai ({{count}})', { count: done.length })}</p>
              {done.map(r => <RequestCard key={r.id} req={r} />)}
            </div>
          )}
        </>
      )}

      <PromptDialog
        open={unlockPromptConfig.open}
        onOpenChange={(open) => setUnlockPromptConfig(p => ({ ...p, open }))}
        title={unlockPromptConfig.title}
        description={unlockPromptConfig.description}
        inputLabel={unlockPromptConfig.inputLabel}
        placeholder={unlockPromptConfig.placeholder}
        initialValue={unlockPromptConfig.initialValue}
        inputType={unlockPromptConfig.inputType || 'text'}
        variant={unlockPromptConfig.variant || 'default'}
        confirmLabel={t('jpp:save', 'Simpan')}
        cancelLabel={t('jpp:cancel', 'Batal')}
        onConfirm={unlockPromptConfig.onConfirm}
      />
    </div>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────
export function AkademikUnitDashboard() {
  const { t } = useTranslation(['jpp', 'common']);
  const { profile, isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [tab, setTab]     = useState(urlTab || 'overview');
  const [stats, setStats] = useState({ menunggu: 0, disahkan: 0, ditolak: 0, totalMerit: 0, pendingUnlock: 0, makmpPending: 0 });
  const [activeEdition, setActiveEdition] = useState<{ id: string; year: number; title: string; is_active: boolean } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const TABS = [
    { id: 'overview',     label: t('jpp:akademik_tab_overview', 'Overview'),            icon: LayoutDashboard },
    { id: 'makmp',        label: t('jpp:akademik_tab_makmp', 'Pusat Kawalan MAKMP'), icon: Award },
    { id: 'certificates', label: t('jpp:akademik_tab_certificates', 'Semak Sijil'),         icon: Trophy },
    { id: 'buka-kunci',   label: t('jpp:akademik_tab_unlock', 'Buka Kunci'),          icon: Unlock },
    { id: 'qr',           label: t('jpp:akademik_tab_qr', 'QR Merit'),            icon: QrCode },
    { id: 'demerit',      label: t('jpp:akademik_tab_demerit', 'Demerit'),             icon: ShieldAlert },
    { id: 'merit-config', label: t('jpp:akademik_tab_merit_config', 'Tetapan Merit'),       icon: Settings },
  ];

  const jppPos = profile?.jpp_position as string | undefined;
  const isMT   = JPP_MT_POSITIONS.includes(jppPos as any);

  useEffect(() => {
    const currentUrlTab = searchParams.get('tab');
    if (currentUrlTab && currentUrlTab !== tab) {
      setTab(currentUrlTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    setSearchParams(newTab === 'overview' ? {} : { tab: newTab });
  };

  const loadStats = useCallback(() => {
    Promise.all([
      supabase.from('akademik_pencapaian').select('status'),
      supabase.from('merit_transactions').select('points').eq('source', 'AKADEMIK'),
      supabase.from('akademik_unlock_requests').select('id').eq('status', 'MENUNGGU'),
      supabase.from('makmp_submissions').select('id').in('status', ['MENUNGGU', 'DALAM_SEMAKAN']),
      supabase.from('makmp_editions').select('id, year, title, is_active').eq('is_active', true).order('year', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([pencRes, meritRes, unlockRes, makmpRes, edRes]) => {
      const pencs = pencRes.data || [];
      const merits = meritRes.data || [];
      setStats({
        menunggu:      pencs.filter(p => p.status === 'MENUNGGU').length,
        disahkan:      pencs.filter(p => p.status === 'DISAHKAN').length,
        ditolak:       pencs.filter(p => p.status === 'DITOLAK').length,
        totalMerit:    merits.reduce((s, m) => s + (m.points || 0), 0),
        pendingUnlock: (unlockRes.data || []).length,
        makmpPending:  (makmpRes.data || []).length,
      });
      setActiveEdition(edRes.data || null);
      setLoadingStats(false);
    });
  }, []);

  useEffect(() => {
    if (tab === 'overview') {
      loadStats();
    }
  }, [tab, loadStats]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon;
          const badgeCount = t.id === 'buka-kunci' ? stats.pendingUnlock : (t.id === 'certificates' || t.id === 'semak') ? stats.menunggu : t.id === 'makmp' ? stats.makmpPending : 0;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all relative ${
                tab === t.id
                  ? ''
                  : 'bg-white dark:bg-transparent border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/35 hover:text-slate-900 dark:hover:text-white/70 shadow-sm'
              }`}
              style={tab === t.id
                ? { background: `${THEME}20`, borderColor: THEME, color: THEME }
                : {}
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {badgeCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
        >
          {tab === 'overview' && (
            <div className="space-y-4">
              {/* Highlight MAKMP Banner */}
              <div
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl cursor-pointer border border-amber-500/25 bg-amber-500/5 dark:bg-gradient-to-r dark:from-amber-500/10 dark:via-amber-600/5 dark:to-transparent hover:border-amber-500/40 transition-all group shadow-sm"
                onClick={() => handleTabChange('makmp')}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {t('jpp:akademik_makmp_full_title', 'Majlis Anugerah Kecemerlangan POLISAS')} {activeEdition ? `(${activeEdition.title || 'MAKMP ' + activeEdition.year})` : '(MAKMP)'}
                      </p>
                      {activeEdition ? (
                        stats.makmpPending > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            {stats.makmpPending} {t('jpp:akademik_pending_review_suffix', 'Menunggu Semakan')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">{t('jpp:akademik_active_session', 'Sesi Aktif')}</span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                          {t('jpp:akademik_closed_session', 'Sesi Ditutup')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300/70 mt-0.5">
                      {activeEdition
                        ? t('jpp:akademik_makmp_active_desc', 'Pusat Urus Setia Exco Akademik: 18 Anugerah Rasmi, Templat Laporan, Penjanaan Kod PIN Juri & Semakan Pencalonan Pelajar.')
                        : t('jpp:akademik_makmp_closed_desc', 'Sesi MAKMP kini ditutup / dinyahaktifkan. Buka Urus Setia MAKMP untuk menguruskan edisi atau menyemak rekod lepas.')}
                    </p>
                  </div>
                </div>
                <button className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 group-hover:bg-amber-500/30 transition-all flex items-center gap-1.5 shrink-0">
                  {t('jpp:akademik_open_makmp_btn', 'Buka Urus Setia MAKMP')} &rarr;
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: t('jpp:akademik_stats_pending', 'Menunggu Semak'), value: stats.menunggu, color: '#F59E0B', icon: Clock },
                  { label: t('jpp:akademik_stats_approved', 'Disahkan'),        value: stats.disahkan, color: '#10B981', icon: CheckCircle },
                  { label: t('jpp:akademik_stats_rejected', 'Ditolak'),         value: stats.ditolak,  color: '#EF4444', icon: XCircle },
                  { label: t('jpp:akademik_stats_merit_distributed', 'Merit Diagih'),    value: stats.totalMerit, color: THEME,   icon: Star },
                ].map(({ label, value, color, icon: Icon }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-[1.5rem] p-4 border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] shadow-sm"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: hexToRgba(color, 0.15) }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{loadingStats ? '—' : value}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 mt-1">{label}</p>
                  </motion.div>
                ))}
              </div>
              {stats.menunggu > 0 && (
                <div
                  className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15 transition-all"
                  onClick={() => handleTabChange('certificates')}
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-xs font-black text-amber-800 dark:text-amber-300">
                    {t('jpp:akademik_alert_pending', { count: stats.menunggu, defaultValue: `${stats.menunggu} pencapaian menunggu semakan — klik untuk semak` })}
                  </p>
                </div>
              )}
            </div>
          )}
          {tab === 'makmp'             && <MakmpAdminDashboardPage />}
          {(tab.startsWith('certificates') || tab.startsWith('sem' + 'ak')) && <PencapaianReviewPanel />}
          {tab === 'buka-kunci'        && <UnlockRequestsPanel />}
          {tab === 'qr'                && <QrMeritManager themeColor={THEME} />}
          {tab === 'demerit'           && <DemeritManager sourceOverride="AKADEMIK" />}
          {tab === 'merit-config'      && <MeritConfigPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

