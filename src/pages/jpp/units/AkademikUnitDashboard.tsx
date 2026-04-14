import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { hexToRgba } from '@/lib/utils';
import {
  Trophy, Users, Star, CheckCircle, XCircle, Clock,
  Settings, LayoutDashboard, QrCode, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, Shield,
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
  const PERINGKAT = ['ANTARABANGSA', 'KEBANGSAAN', 'NEGERI', 'DAERAH', 'DALAMAN'];

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
        // Insert merit transaction — note: column is 'amount' (not 'points')
        const { error: txErr } = await supabase.from('merit_transactions').insert({
          user_id:      item.user_id,
          club_id:      null,
          amount:       merit,          // ← betul: 'amount', bukan 'points'
          reason:       `Pencapaian Akademik: ${item.nama_pencapaian}`,
          actor_name:   'Exco Akademik',
          source:       'AKADEMIK',
          reference_id: id,
        });
        if (txErr) throw new Error(`Insert merit_transactions gagal: ${txErr.message}`);

        // Increment merit in profiles — note: param is 'target_user_id' (not 'uid')
        const { error: rpcErr } = await supabase.rpc('increment_merit', {
          target_user_id: item.user_id,  // ← betul: 'target_user_id', bukan 'uid'
          delta:          merit,
        });
        if (rpcErr) throw new Error(`RPC increment_merit gagal: ${rpcErr.message}`);
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

// ─── Tab definition ───────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview',     icon: LayoutDashboard },
  { id: 'semak',       label: 'Semak',        icon: Trophy },
  { id: 'qr',          label: 'QR Merit',     icon: QrCode },
  { id: 'merit-config',label: 'Tetapan Merit',icon: Settings },
];

// ─── Main Admin Dashboard ─────────────────────────────────────
export function AkademikUnitDashboard() {
  const { profile, isSuperAdmin } = useAuth();
  const [tab, setTab]     = useState('overview');
  const [stats, setStats] = useState({ menunggu: 0, disahkan: 0, ditolak: 0, totalMerit: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const jppPos = profile?.jpp_position as string | undefined;
  const isMT   = JPP_MT_POSITIONS.includes(jppPos as any);

  useEffect(() => {
    Promise.all([
      supabase.from('akademik_pencapaian').select('status'),
      supabase.from('merit_transactions').select('points').eq('source', 'AKADEMIK'),
    ]).then(([pencRes, meritRes]) => {
      const pencs = pencRes.data || [];
      const merits = meritRes.data || [];
      setStats({
        menunggu:   pencs.filter(p => p.status === 'MENUNGGU').length,
        disahkan:   pencs.filter(p => p.status === 'DISAHKAN').length,
        ditolak:    pencs.filter(p => p.status === 'DITOLAK').length,
        totalMerit: merits.reduce((s, m) => s + (m.points || 0), 0),
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
          // Hide Tetapan Merit tab from MT users (read-only via the panel itself)
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all"
              style={tab === t.id
                ? { background: `${THEME}20`, borderColor: THEME, color: THEME }
                : { background: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
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
          {tab === 'semak'        && <PencapaianReviewPanel />}
          {tab === 'qr'           && <QrMeritManager themeColor={THEME} />}
          {tab === 'merit-config' && <MeritConfigPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
