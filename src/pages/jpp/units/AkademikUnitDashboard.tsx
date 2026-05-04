import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { hexToRgba } from '@/lib/utils';
import {
  Trophy, Users, Star, CheckCircle, XCircle, Clock,
  Settings, LayoutDashboard, QrCode, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, Shield, Unlock, BarChart3,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';
import { QrMeritManager } from '@/pages/akademik/AkademikQrScan';
import { JPP_MT_POSITIONS } from '@/types';

const THEME = '#818CF8';

// ─── Merit Config Panel (SUPER_ADMIN only) ────────────────────
function MeritConfigPanel() {
  const [config, setConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { isSuperAdmin } = useAuth();

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
    const key = `${jenis}_${peringkat}`;
    setSaving(key);
    const { error } = await supabase
      .from('akademik_merit_config')
      .update({ merit_value: value })
      .eq('jenis', jenis)
      .eq('peringkat', peringkat);
    if (error) toast.error('Gagal kemaskini.'); else {
      setConfig(prev => prev.map(c => c.jenis === jenis && c.peringkat === peringkat ? { ...c, merit_value: value } : c));
      toast.success('Nilai merit dikemaskini!');
    }
    setSaving(null);
  };

  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center space-y-3">
        <Shield className="w-8 h-8 mx-auto text-white/15" />
        <p className="text-xs font-black uppercase tracking-widest text-white/20">
          Akses Terhad — SUPER_ADMIN_JPP sahaja
        </p>
        <p className="text-[10px] text-white/15">Hanya SUPER_ADMIN_JPP boleh mengubah nilai merit. Anda boleh melihat tetapi tidak boleh mengubah nilai ini.</p>
        {/* Read-only table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 font-black text-white/25 uppercase tracking-wider">Peringkat</th>
                {JENIS.map(j => <th key={j} className="py-2 px-3 font-black text-white/25 uppercase tracking-wider">{j}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={4} className="text-center py-4 text-white/20">Memuatkan...</td></tr> : PERINGKAT.map(p => (
                <tr key={p} className="border-t border-white/[0.04]">
                  <td className="py-2 pr-4 font-black text-white/40">{p}</td>
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

  if (loading) return <div className="h-48 rounded-2xl bg-white/[0.03] animate-pulse border border-white/[0.04]" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-amber-400" />
        <p className="text-[11px] font-black text-amber-400/70 uppercase tracking-widest">Admin Only — Nilai Merit</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left p-4 font-black text-white/30 uppercase tracking-wider text-[10px]">Peringkat</th>
              {JENIS.map(j => <th key={j} className="p-4 font-black text-white/30 uppercase tracking-wider text-[10px]">{j}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERINGKAT.map(p => (
              <tr key={p} className="border-t border-white/[0.04]">
                <td className="p-4 font-black text-white/60 text-[11px]">{p}</td>
                {JENIS.map(j => {
                  const key = `${j}_${p}`;
                  const val = getValue(j, p);
                  return (
                    <td key={j} className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => updateValue(j, p, Math.max(0, val - 1))}
                          className="w-6 h-6 rounded-lg bg-white/[0.04] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all flex items-center justify-center font-black text-sm">
                          −
                        </button>
                        <span className="w-8 text-center font-black text-sm" style={{ color: THEME }}>
                          {saving === key ? <Loader2 className="w-3 h-3 animate-spin inline" /> : val}
                        </span>
                        <button onClick={() => updateValue(j, p, val + 1)}
                          className="w-6 h-6 rounded-lg bg-white/[0.04] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all flex items-center justify-center font-black text-sm">
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
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'MENUNGGU' | 'SEMUA'>('MENUNGGU');
  const [reviewing, setReviewing] = useState<string | null>(null);

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
      if (!item) throw new Error('Item tidak dijumpai.');

      // Update status pencapaian
      const { error: updateErr } = await supabase.from('akademik_pencapaian').update({
        status,
        verified_at: new Date().toISOString(),
        rejection_reason: reason || null,
      }).eq('id', id);
      if (updateErr) throw new Error(`Kemaskini status gagal: ${updateErr.message}`);

      if (status === 'DISAHKAN') {
        // Insert merit transaction with correct 'points' column
        const { error: txErr } = await supabase.from('merit_transactions').insert({
          user_id:      item.user_id,
          club_id:      null,
          points:       merit,
          reason:       `Pencapaian Akademik: ${item.nama_pencapaian}`,
          actor_name:   'Exco Akademik',
          source:       'AKADEMIK',
          reference_id: id,
        });
        if (txErr) throw new Error(`Insert merit_transactions gagal: ${txErr.message}`);

        // Increment merit_akademik split + total merit
        const { error: rpcErr } = await supabase.rpc('increment_merit_by_source', {
          p_uid:   item.user_id,
          p_delta: merit,
          p_src:   'AKADEMIK',
        });
        if (rpcErr) throw new Error(`RPC increment_merit_by_source gagal: ${rpcErr.message}`);
      }

      toast.success(status === 'DISAHKAN' ? `✅ Disahkan! +${merit} merit diberikan.` : 'Pencapaian ditolak.');
      load();
    } catch (e: any) {
      console.error('[handleVerify] error:', e);
      toast.error(e.message || 'Ralat semasa mengesahkan pencapaian.');
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
              : { background: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }
            }>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/[0.03] animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <CheckCircle className="w-8 h-8 mx-auto text-white/10" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
            Tiada pencapaian {filter === 'MENUNGGU' ? 'menunggu semakan' : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const cat = item.akademik_sijil_categories;
            const profile = item.profiles;
            const merit = item.merit_override ?? item.merit_auto;
            return (
              <div key={item.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ background: cat ? `${cat.color}20` : `${THEME}15` }}>
                    {cat?.icon || '🏆'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white line-clamp-1">{item.nama_pencapaian}</p>
                    <p className="text-[10px] text-white/40 font-bold mt-0.5">
                      {profile?.full_name} · {profile?.department?.toUpperCase()} · {profile?.matric_no}
                    </p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white/[0.05] text-white/40">{item.jenis}</span>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white/[0.05] text-white/40">{item.peringkat}</span>
                      <span className="text-[9px] font-black" style={{ color: THEME }}>+{merit} merit</span>
                    </div>
                  </div>
                  {item.drive_view_url && (
                    <a href={item.drive_view_url} target="_blank" rel="noopener noreferrer"
                      className="text-[9px] font-black text-white/30 hover:text-white/60 underline shrink-0 transition-colors">
                      Lihat Sijil
                    </a>
                  )}
                </div>

                {item.status === 'MENUNGGU' && (
                  <div className="flex gap-2 pt-1 border-t border-white/[0.04]">
                    <button
                      onClick={() => handleVerify(item.id, 'DISAHKAN', merit)}
                      disabled={reviewing === item.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 transition-all"
                    >
                      {reviewing === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Sahkan (+{merit} merit)
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt(`Sebab penolakan untuk "${item.nama_pencapaian}":`);
                        if (reason !== null) handleVerify(item.id, 'DITOLAK', 0, reason);
                      }}
                      disabled={reviewing === item.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-500/15 border border-rose-500/25 text-rose-400 hover:bg-rose-500/25 disabled:opacity-50 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Tolak
                    </button>
                  </div>
                )}
                {item.status !== 'MENUNGGU' && (
                  <div className="pt-1 border-t border-white/[0.04]">
                    <span className={`text-[9px] font-black uppercase ${item.status === 'DISAHKAN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.status}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Unlock Requests Review Panel ────────────────────────────
function UnlockRequestsPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState<string | null>(null);

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
        supabase.from('akademik_pencapaian').select('id, nama_pencapaian, jenis, peringkat').in('id', pencIds),
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

      toast.success(decision === 'DILULUSKAN'
        ? '✅ Diluluskan! Pelajar mempunyai 48 jam untuk edit/padam.'
        : '❌ Permohonan ditolak.');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Ralat.');
    } finally { setActing(null); }
  };

  const pending = requests.filter(r => r.status === 'MENUNGGU');
  const done    = requests.filter(r => r.status !== 'MENUNGGU');

  const RequestCard = ({ req }: { req: any }) => (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${THEME}15`, color: THEME }}>
          <Unlock className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white line-clamp-1">{req.pencapaian?.nama_pencapaian ?? '—'}</p>
          <p className="text-[10px] text-white/40 font-bold mt-0.5">
            {req.profile?.full_name} · {req.profile?.department?.toUpperCase()}
          </p>
          <p className="text-[10px] text-amber-300/80 font-medium mt-1 bg-amber-500/10 rounded-lg px-2 py-1 border border-amber-500/15">
            📝 Sebab: {req.reason}
          </p>
        </div>
        <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase ${
          req.status === 'MENUNGGU'   ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
          req.status === 'DILULUSKAN' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
          'bg-rose-500/15 text-rose-400 border border-rose-500/20'
        }`}>{req.status}</span>
      </div>
      {req.status === 'MENUNGGU' && (
        <div className="flex gap-2 border-t border-white/[0.04] pt-3">
          <button
            onClick={() => handleDecision(req, 'DILULUSKAN')}
            disabled={acting === req.id}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 transition-all"
          >
            {acting === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Luluskan (48 jam)
          </button>
          <button
            onClick={() => {
              const note = prompt('Nota penolakan:');
              if (note !== null) handleDecision(req, 'DITOLAK', note);
            }}
            disabled={acting === req.id}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase bg-rose-500/15 border border-rose-500/25 text-rose-400 hover:bg-rose-500/25 disabled:opacity-50 transition-all"
          >
            <XCircle className="w-3.5 h-3.5" /> Tolak
          </button>
        </div>
      )}
      {req.reviewer_note && (
        <p className="text-[9px] text-white/30 italic border-t border-white/[0.04] pt-2">Nota: {req.reviewer_note}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/[0.03] animate-pulse" />)}</div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-400/60">Menunggu ({pending.length})</p>
              {pending.map(r => <RequestCard key={r.id} req={r} />)}
            </div>
          )}
          {pending.length === 0 && (
            <div className="py-12 text-center">
              <Unlock className="w-8 h-8 mx-auto text-white/10 mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Tiada permohonan buka kunci menunggu</p>
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Selesai ({done.length})</p>
              {done.map(r => <RequestCard key={r.id} req={r} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab definition ───────────────────────────────────────────
const TABS = [
  { id: 'overview',     label: 'Overview',       icon: LayoutDashboard },
  { id: 'semak',        label: 'Semak',          icon: Trophy },
  { id: 'buka-kunci',   label: 'Buka Kunci',     icon: Unlock },
  { id: 'qr',           label: 'QR Merit',       icon: QrCode },

  { id: 'merit-config', label: 'Tetapan Merit',  icon: Settings },
];

// ─── Main Admin Dashboard ─────────────────────────────────────
export function AkademikUnitDashboard() {
  const { profile, isSuperAdmin } = useAuth();
  const [tab, setTab]     = useState('overview');
  const [stats, setStats] = useState({ menunggu: 0, disahkan: 0, ditolak: 0, totalMerit: 0, pendingUnlock: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const jppPos = profile?.jpp_position as string | undefined;
  const isMT   = JPP_MT_POSITIONS.includes(jppPos as any);

  useEffect(() => {
    Promise.all([
      supabase.from('akademik_pencapaian').select('status'),
      supabase.from('merit_transactions').select('points').eq('source', 'AKADEMIK'),
      supabase.from('akademik_unlock_requests').select('id').eq('status', 'MENUNGGU'),
    ]).then(([pencRes, meritRes, unlockRes]) => {
      const pencs = pencRes.data || [];
      const merits = meritRes.data || [];
      setStats({
        menunggu:     pencs.filter(p => p.status === 'MENUNGGU').length,
        disahkan:     pencs.filter(p => p.status === 'DISAHKAN').length,
        ditolak:      pencs.filter(p => p.status === 'DITOLAK').length,
        totalMerit:   merits.reduce((s, m) => s + (m.points || 0), 0),
        pendingUnlock:(unlockRes.data || []).length,
      });
      setLoadingStats(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon;
          const badgeCount = t.id === 'buka-kunci' ? stats.pendingUnlock : t.id === 'semak' ? stats.menunggu : 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all relative"
              style={tab === t.id
                ? { background: `${THEME}20`, borderColor: THEME, color: THEME }
                : { background: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {badgeCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Menunggu Semak', value: stats.menunggu, color: '#F59E0B', icon: Clock },
                  { label: 'Disahkan',        value: stats.disahkan, color: '#10B981', icon: CheckCircle },
                  { label: 'Ditolak',         value: stats.ditolak,  color: '#EF4444', icon: XCircle },
                  { label: 'Merit Diagih',    value: stats.totalMerit, color: THEME,   icon: Star },
                ].map(({ label, value, color, icon: Icon }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-[1.5rem] p-4 border border-white/[0.06] bg-white/[0.03]"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: hexToRgba(color, 0.15) }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <p className="text-2xl font-black text-white">{loadingStats ? '—' : value}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1">{label}</p>
                  </motion.div>
                ))}
              </div>
              {stats.menunggu > 0 && (
                <div
                  className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15 transition-all"
                  onClick={() => setTab('semak')}
                >
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <p className="text-xs font-black text-amber-300">
                    {stats.menunggu} pencapaian menunggu semakan — klik untuk semak
                  </p>
                </div>
              )}
            </div>
          )}
              {tab.startsWith('semak')       && <PencapaianReviewPanel />}
              {tab === 'buka-kunci'          && <UnlockRequestsPanel />}
              {tab === 'qr'                  && <QrMeritManager themeColor={THEME} />}

              {tab === 'merit-config'        && <MeritConfigPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
