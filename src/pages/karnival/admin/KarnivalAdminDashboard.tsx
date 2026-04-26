import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKarnival } from '@/contexts/KarnivalContext';
import { supabase } from '@/lib/supabase';
import {
  Trophy, Users, QrCode, BarChart3, Loader2, RefreshCw,
  TrendingUp, Zap, Activity, Monitor, ExternalLink, Crown,
} from 'lucide-react';

interface Stats {
  totalVotes: number;
  totalVoters: number;
  totalBooths: number;
  totalCategories: number;
  topBooth: string | null;
  topBoothVotes: number;
  recentVotesPerMin: number;
}

interface TopBooth {
  name: string;
  votes: number;
  category: string;
}

export function KarnivalAdminDashboard() {
  const { edition, categories, booths, isActive, votingOpen, lastUpdated, refetch } = useKarnival();
  const [stats, setStats]     = useState<Stats | null>(null);
  const [topList, setTopList] = useState<TopBooth[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow]         = useState(new Date());

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchStats = useCallback(async () => {
    if (!edition) return;
    setLoading(true);

    const [{ count: totalVotes }, { count: totalVoters }, { data: topData }] = await Promise.all([
      supabase.from('karnival_votes_v2').select('*', { count: 'exact', head: true }).eq('edition_id', edition.id),
      supabase.from('karnival_votes_v2').select('voter_id', { count: 'exact', head: true }).eq('edition_id', edition.id),
      supabase.from('karnival_votes_v2').select('booth_id, karnival_booths!inner(kelab_name, karnival_categories!inner(name))').eq('edition_id', edition.id),
    ]);

    // Recent votes in last 5 min
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const { count: recentCount } = await supabase
      .from('karnival_votes_v2')
      .select('*', { count: 'exact', head: true })
      .eq('edition_id', edition.id)
      .gte('created_at', fiveMinAgo);

    const countMap: Record<string, { name: string; count: number; category: string }> = {};
    for (const v of (topData ?? []) as any[]) {
      const id  = v.booth_id;
      const name = v.karnival_booths?.kelab_name ?? '?';
      const cat  = v.karnival_booths?.karnival_categories?.name ?? '';
      if (!countMap[id]) countMap[id] = { name, count: 0, category: cat };
      countMap[id].count++;
    }
    const sorted = Object.values(countMap).sort((a, b) => b.count - a.count);
    const top5: TopBooth[] = sorted.slice(0, 5).map(b => ({ name: b.name, votes: b.count, category: b.category }));

    setStats({
      totalVotes:       totalVotes ?? 0,
      totalVoters:      totalVoters ?? 0,
      totalBooths:      booths.length,
      totalCategories:  categories.length,
      topBooth:         sorted[0]?.name ?? null,
      topBoothVotes:    sorted[0]?.count ?? 0,
      recentVotesPerMin: Math.round((recentCount ?? 0) / 5),
    });
    setTopList(top5);
    setLoading(false);
  }, [edition, booths.length, categories.length]);

  useEffect(() => { fetchStats(); }, [fetchStats, lastUpdated]);

  if (!edition) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Trophy className="w-20 h-20 text-white/10 mb-6" />
        <p className="text-white/40 font-black text-2xl">Tiada Edisi Karnival</p>
        <p className="text-white/25 text-sm mt-3">Pergi ke tab "Edisi" untuk mencipta edisi baharu</p>
      </div>
    );
  }

  const bigStats = [
    {
      label: 'JUMLAH UNDI',
      value: stats?.totalVotes ?? 0,
      icon: BarChart3,
      color: '#a78bfa',
      glow: 'rgba(167,139,250,0.3)',
      bg: 'rgba(139,92,246,0.08)',
      border: 'rgba(139,92,246,0.25)',
      suffix: 'undi',
    },
    {
      label: 'PENGUNDI UNIK',
      value: stats?.totalVoters ?? 0,
      icon: Users,
      color: '#60a5fa',
      glow: 'rgba(96,165,250,0.3)',
      bg: 'rgba(59,130,246,0.08)',
      border: 'rgba(59,130,246,0.25)',
      suffix: 'pelajar',
    },
    {
      label: 'BOOTH AKTIF',
      value: stats?.totalBooths ?? 0,
      icon: QrCode,
      color: '#34d399',
      glow: 'rgba(52,211,153,0.3)',
      bg: 'rgba(16,185,129,0.08)',
      border: 'rgba(16,185,129,0.25)',
      suffix: 'booth',
    },
    {
      label: 'UNDI / MINIT',
      value: stats?.recentVotesPerMin ?? 0,
      icon: Activity,
      color: '#fb923c',
      glow: 'rgba(251,146,60,0.3)',
      bg: 'rgba(249,115,22,0.08)',
      border: 'rgba(249,115,22,0.25)',
      suffix: '/min',
    },
  ];

  const rankMedals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  return (
    <div className="space-y-6 pb-8">

      {/* ── HEADER BAR ─────────────────────────────────────────────── */}
      <div
        className="rounded-3xl p-6 flex items-center justify-between gap-4 flex-wrap"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(109,40,217,0.08) 100%)',
          border: '1px solid rgba(139,92,246,0.25)',
          boxShadow: '0 0 60px rgba(139,92,246,0.1)',
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}
          >
            🎪
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <p className="text-2xl font-black text-white tracking-tight">{edition.name}</p>
              {isActive && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-violet-600/20 border border-violet-500/30 text-violet-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  LIVE
                </span>
              )}
              {votingOpen && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-600/20 border border-emerald-500/30 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Undi Dibuka
                </span>
              )}
            </div>
            {edition.tagline && <p className="text-sm text-white/40 font-medium">{edition.tagline}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live clock */}
          <div className="text-right hidden sm:block">
            <p className="text-2xl font-black text-white tabular-nums tracking-tight">
              {now.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
              {now.toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={() => { refetch(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/[0.1] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── BIG STAT CARDS ─────────────────────────────────────────── */}
      {loading && !stats ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {bigStats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-3xl p-6 flex flex-col justify-between min-h-[160px]"
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                boxShadow: `0 0 40px ${s.glow}`,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{s.label}</p>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.border}` }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
              </div>
              <div>
                <p
                  className="text-5xl font-black leading-none tabular-nums"
                  style={{ color: s.color, textShadow: `0 0 30px ${s.glow}` }}
                >
                  {s.value.toLocaleString()}
                </p>
                <p className="text-xs font-bold text-white/20 mt-2 uppercase tracking-widest">{s.suffix}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── TOP 5 BOOTHS + LCD BUTTON ──────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Top 5 leaderboard */}
        <div
          className="lg:col-span-2 rounded-3xl p-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <p className="text-sm font-black uppercase tracking-widest text-white/70">Booth Teratas</p>
            </div>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-white/30" />}
          </div>

          <div className="space-y-3">
            {topList.length === 0 && !loading && (
              <p className="text-center text-white/20 text-sm py-8">Tiada undi lagi</p>
            )}
            {topList.map((b, i) => {
              const pct = stats?.totalVotes ? Math.round((b.votes / stats.totalVotes) * 100) : 0;
              const isFirst = i === 0;
              return (
                <motion.div
                  key={b.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    background: isFirst ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.03)',
                    border: isFirst ? '1px solid rgba(251,191,36,0.2)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {/* Progress bar background */}
                  <div
                    className="absolute inset-0 transition-all duration-1000"
                    style={{
                      width: `${pct}%`,
                      background: isFirst
                        ? 'linear-gradient(90deg, rgba(251,191,36,0.12), transparent)'
                        : 'linear-gradient(90deg, rgba(139,92,246,0.08), transparent)',
                      borderRadius: 'inherit',
                    }}
                  />
                  <div className="relative flex items-center gap-4 px-5 py-3.5">
                    <span className="text-2xl w-8 text-center flex-shrink-0">{rankMedals[i]}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-black text-sm truncate ${isFirst ? 'text-amber-300' : 'text-white'}`}>{b.name}</p>
                      {b.category && <p className="text-[10px] text-white/30 font-medium mt-0.5 truncate">{b.category}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xl font-black tabular-nums ${isFirst ? 'text-amber-300' : 'text-white/70'}`}>
                        {b.votes.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-white/25 font-bold">{pct}%</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right panel — LCD & realtime */}
        <div className="flex flex-col gap-4">

          {/* LCD Button — CTA utama */}
          <a
            href="/karnival/scoreboard?fullscreen=1"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center justify-center gap-3 p-8 rounded-3xl transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(109,40,217,0.1) 100%)',
              border: '1px solid rgba(139,92,246,0.35)',
              boxShadow: '0 0 50px rgba(139,92,246,0.15)',
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{ background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(139,92,246,0.4)' }}
            >
              <Monitor className="w-8 h-8 text-violet-300" />
            </div>
            <div>
              <p className="text-base font-black text-white">Papan Markah LCD</p>
              <p className="text-xs text-white/40 mt-1">Buka fullscreen untuk LCD display</p>
            </div>
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-violet-600 text-white group-hover:bg-violet-500 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
              Buka Sekarang
            </div>
          </a>

          {/* Realtime status */}
          <div
            className="rounded-3xl p-5 flex flex-col gap-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <p className="text-xs font-black uppercase tracking-widest text-white/50">Realtime</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Aktif</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/30 font-medium">Kemas kini terakhir</p>
                <p className="text-xs font-black text-white/60 tabular-nums">
                  {lastUpdated
                    ? lastUpdated.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : '—'}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/30 font-medium">Status undi</p>
                <p className={`text-xs font-black ${votingOpen ? 'text-emerald-400' : 'text-red-400'}`}>
                  {votingOpen ? 'Dibuka' : 'Ditutup'}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/30 font-medium">Kategori</p>
                <p className="text-xs font-black text-white/60">{categories.length} kategori</p>
              </div>
            </div>
          </div>

          {/* Top booth hero card */}
          {stats?.topBooth && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-3xl p-5 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(180,83,9,0.05) 100%)',
                border: '1px solid rgba(251,191,36,0.2)',
                boxShadow: '0 0 30px rgba(251,191,36,0.08)',
              }}
            >
              <p className="text-3xl mb-2">🥇</p>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/60 mb-1">Booth Paling Popular</p>
              <p className="text-base font-black text-amber-300 leading-tight">{stats.topBooth}</p>
              <p className="text-xs text-amber-500/40 font-bold mt-1">{stats.topBoothVotes.toLocaleString()} undi</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
