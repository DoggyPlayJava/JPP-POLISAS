import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn, hexToRgba } from '@/lib/utils';
import {
  Trophy, Star, BookOpen, FileCheck2, Clock, CheckCircle,
  XCircle, ArrowRight, Plus, TrendingUp, Zap, Award,
  GraduationCap,
} from 'lucide-react';
import { useNavigate as useNav } from 'react-router-dom';

const THEME = '#818CF8';

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub, onClick, delay = 0 }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={cn(
        'rounded-[1.75rem] p-5 border border-white/[0.06] bg-white/[0.03] flex flex-col gap-3 backdrop-blur-sm',
        onClick && 'cursor-pointer hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300'
      )}
    >
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{ background: hexToRgba(color, 0.15), color }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-3xl font-black text-white leading-none">{value}</p>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35 mt-1">{label}</p>
        {sub && <p className="text-[10px] text-white/20 font-medium mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ─── Quick Action ─────────────────────────────────────────────
function QuickAction({ label, desc, icon: Icon, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all text-left group"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
        style={{ background: hexToRgba(color, 0.15), color }}
      >
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-white">{label}</p>
        <p className="text-[10px] text-white/30 font-medium mt-0.5 line-clamp-1">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────
export function AkademikDashboard() {
  const { profile } = useAuth();
  const navigate    = useNavigate();

  const [stats, setStats] = useState({
    totalPencapaian: 0,
    disahkan:        0,
    menunggu:        0,
    ditolak:         0,
    meritAkademik:   0,
    meritQr:         0,
    latestHpnm:      null as number | null,
  });
  const [recentPencapaian, setRecentPencapaian] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const [pencRes, cgpaRes, meritTxRes, qrRes] = await Promise.all([
        supabase
          .from('akademik_pencapaian')
          .select('id, nama_pencapaian, jenis, peringkat, status, merit_auto, merit_override, created_at, akademik_sijil_categories(name, icon, color)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('akademik_cgpa_records')
          .select('hpnm, semester, tahun')
          .eq('user_id', profile.id)
          .eq('is_user_verified', true)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('merit_transactions')
          .select('points, source')
          .eq('user_id', profile.id)
          .eq('source', 'AKADEMIK'),
        supabase
          .from('merit_transactions')
          .select('points')
          .eq('user_id', profile.id)
          .eq('source', 'QR_SCAN'),
      ]);

      const pencs = pencRes.data || [];
      const meritAkademik = (meritTxRes.data || []).reduce((s, r) => s + (r.points || 0), 0);
      const meritQr       = (qrRes.data || []).reduce((s, r) => s + (r.points || 0), 0);

      setStats({
        totalPencapaian: pencs.length,
        disahkan:        pencs.filter(p => p.status === 'DISAHKAN').length,
        menunggu:        pencs.filter(p => p.status === 'MENUNGGU').length,
        ditolak:         pencs.filter(p => p.status === 'DITOLAK').length,
        meritAkademik,
        meritQr,
        latestHpnm:      cgpaRes.data?.[0]?.hpnm ?? null,
      });
      setRecentPencapaian(pencs.slice(0, 4));
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    MENUNGGU:  { label: 'Menunggu', color: '#F59E0B', bg: '#F59E0B15', icon: Clock },
    DISAHKAN:  { label: 'Disahkan', color: '#10B981', bg: '#10B98115', icon: CheckCircle },
    DITOLAK:   { label: 'Ditolak',  color: '#EF4444', bg: '#EF444415', icon: XCircle },
  };

  const totalMerit = (profile?.merit || 0);

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-[1.75rem] bg-white/[0.03] animate-pulse border border-white/[0.04]" />
          ))}
        </div>
        <div className="h-64 rounded-[2rem] bg-white/[0.03] animate-pulse border border-white/[0.04]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-1">Akademik</p>
          <h1 className="text-2xl font-black text-white leading-tight">
            Selamat Datang,{' '}
            <span style={{ color: THEME }}>{profile?.full_name?.split(' ')[0]}</span>
          </h1>
          <p className="text-xs text-white/40 font-medium mt-1">
            Portal akademik peribadi anda — rekod pencapaian, HPNM & merit
          </p>
        </motion.div>
      </div>

      {/* ── Hero Merit Banner ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-[2rem] p-6 border border-white/[0.06]"
        style={{ background: `linear-gradient(135deg, ${hexToRgba(THEME, 0.15)}, ${hexToRgba('#60A5FA', 0.08)})` }}
      >
        <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at 20% 50%, ${THEME}, transparent 60%)` }} />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mb-1">Jumlah Merit Keseluruhan</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black text-white">{totalMerit}</span>
              <span className="text-sm font-black text-white/40 mb-1">merit</span>
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="text-[10px] font-bold text-white/30">
                📚 Akademik: <span className="text-white/50 font-black">{stats.meritAkademik}</span>
              </span>
              <span className="text-[10px] font-bold text-white/30">
                📱 QR Scan: <span className="text-white/50 font-black">{stats.meritQr}</span>
              </span>
              {stats.latestHpnm !== null && (
                <span className="text-[10px] font-bold text-white/30">
                  🎓 HPNM: <span className="font-black" style={{ color: THEME }}>{stats.latestHpnm.toFixed(2)}</span>
                </span>
              )}
            </div>
          </div>
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{ background: hexToRgba(THEME, 0.2), color: THEME, boxShadow: `0 8px 32px ${hexToRgba(THEME, 0.3)}` }}
          >
            <GraduationCap className="w-8 h-8" />
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pencapaian" value={stats.totalPencapaian} icon={Trophy}      color={THEME}      delay={0.0} onClick={() => navigate('/akademik/pencapaian')} />
        <StatCard label="Disahkan"  value={stats.disahkan}        icon={CheckCircle}  color="#10B981"    delay={0.06} />
        <StatCard label="Menunggu"  value={stats.menunggu}        icon={Clock}        color={stats.menunggu > 0 ? '#F59E0B' : '#94A3B8'} delay={0.12} />
        <StatCard
          label="HPNM Terkini"
          value={stats.latestHpnm !== null ? stats.latestHpnm.toFixed(2) : '—'}
          icon={BookOpen}
          color="#60A5FA"
          delay={0.18}
          onClick={() => navigate('/akademik/cgpa')}
        />
      </div>

      {/* ── Alert: ditolak ── */}
      {stats.ditolak > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20"
        >
          <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-black text-rose-400 uppercase tracking-widest">
              {stats.ditolak} pencapaian ditolak
            </p>
            <p className="text-[11px] text-rose-300/60 font-medium mt-0.5">
              Sila semak nota penolakan dan hantar semula.
            </p>
          </div>
          <button
            onClick={() => navigate('/akademik/pencapaian')}
            className="text-[10px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 transition-colors shrink-0"
          >
            Semak →
          </button>
        </motion.div>
      )}

      {/* ── Recent + Quick Actions ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Pencapaian Terkini */}
        <div className="rounded-[2rem] bg-white/[0.02] border border-white/[0.05] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">
              Pencapaian Terkini
            </h3>
            <button
              onClick={() => navigate('/akademik/pencapaian')}
              className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity"
              style={{ color: THEME }}
            >
              Semua <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentPencapaian.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Trophy className="w-8 h-8 mx-auto text-white/10" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/15">
                Belum ada pencapaian
              </p>
              <button
                onClick={() => navigate('/akademik/pencapaian')}
                className="text-[10px] font-black uppercase tracking-wider text-white/25 hover:text-white/50 underline underline-offset-2 transition-all"
              >
                + Tambah Sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentPencapaian.map(p => {
                const sc = statusConfig[p.status] || statusConfig.MENUNGGU;
                const StatusIcon = sc.icon;
                const cat = (p as any).akademik_sijil_categories;
                return (
                  <div
                    key={p.id}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all"
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                      style={{ background: cat ? `${cat.color}20` : `${THEME}20` }}
                    >
                      {cat?.icon || '🏆'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white leading-tight line-clamp-1">{p.nama_pencapaian}</p>
                      <p className="text-[9px] text-white/30 font-bold mt-0.5">
                        {p.jenis} · {p.peringkat}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full"
                        style={{ background: sc.bg, color: sc.color }}
                      >
                        {sc.label}
                      </span>
                      {p.status === 'DISAHKAN' && (
                        <span className="text-[8px] font-black text-white/30">
                          +{p.merit_override ?? p.merit_auto} merit
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-[2rem] bg-white/[0.02] border border-white/[0.05] p-5 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Tindakan Pantas</h3>
          <div className="space-y-2.5">
            <QuickAction
              label="Tambah Pencapaian / Sijil"
              desc="Rekod anugerah, sijil atau pencapaian baru"
              icon={Plus}
              color={THEME}
              onClick={() => navigate('/akademik/pencapaian')}
            />
            <QuickAction
              label="Upload Slip HPNM"
              desc="Muat naik slip markah PDF untuk kesan CGPA"
              icon={BookOpen}
              color="#60A5FA"
              onClick={() => navigate('/akademik/cgpa')}
            />
            <QuickAction
              label="Merit Saya"
              desc="Semak semua transaksi merit & breakdown"
              icon={Star}
              color="#F59E0B"
              onClick={() => navigate('/akademik/merit')}
            />
            <QuickAction
              label="Scan QR Merit"
              desc="Scan kod QR aktiviti untuk dapatkan merit"
              icon={Zap}
              color="#34D399"
              onClick={() => navigate('/akademik/qr')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
