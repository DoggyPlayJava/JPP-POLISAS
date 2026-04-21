import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, BarChart3, Calendar, Users, ChevronRight,
  Medal, Flame, Star, Zap, Shield, Target, Activity
} from 'lucide-react';
import { useSupsas } from '@/contexts/SupsasContext';
import { cn } from '@/lib/utils';

// ─── Countdown Hook ───────────────────────────────────────────
function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, started: false, ended: false });

  useEffect(() => {
    if (!targetDate) return;
    const calc = () => {
      const now = Date.now();
      const target = new Date(targetDate).getTime();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, started: diff < 0, ended: diff < -86400000 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        started: false,
        ended: false,
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

// ─── CountdownBlock ───────────────────────────────────────────
function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent" />
        <AnimatePresence mode="wait">
          <motion.span
            key={value}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative z-10 text-2xl sm:text-3xl md:text-4xl font-black text-white tabular-nums"
          >
            {String(value).padStart(2, '0')}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-2 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{label}</span>
    </div>
  );
}

// ─── Medal Podium mini-widget ─────────────────────────────────
function MiniPodium({ tally }: { tally: any[] }) {
  const top3 = tally.slice(0, 3);
  const heights = ['h-16', 'h-12', 'h-10'];
  const golds = ['🥇', '🥈', '🥉'];
  if (top3.length === 0) return null;
  return (
    <div className="flex items-end justify-center gap-2 mt-6">
      {[top3[1], top3[0], top3[2]].map((k, idx) => {
        if (!k) return <div key={idx} className="w-20" />;
        const actualRank = idx === 1 ? 0 : idx === 0 ? 1 : 2;
        return (
          <motion.div
            key={k.kontingen_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: actualRank * 0.15 }}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-lg">{golds[actualRank]}</span>
            <div className="text-[10px] font-black text-white text-center max-w-[72px] truncate">{k.short_code}</div>
            <div
              className={cn(
                'w-16 sm:w-20 rounded-t-2xl flex items-center justify-center text-xs font-black transition-all',
                heights[actualRank],
                actualRank === 0 ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                  : actualRank === 1 ? 'bg-gradient-to-t from-slate-500 to-slate-300 shadow-[0_0_15px_rgba(148,163,184,0.3)]'
                  : 'bg-gradient-to-t from-orange-700 to-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.3)]'
              )}
              style={{ borderTop: `2px solid ${k.color}40` }}
            >
              <span className="text-white font-black text-sm">{k.gold}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────
export function SupsasLandingPage() {
  const navigate = useNavigate();
  const { edition, kontingen, sports, medalTally, isLoading, isLive } = useSupsas();
  const countdown = useCountdown(edition?.start_date ?? null);

  // ── No active edition ──
  if (!isLoading && !edition) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-8"
        >
          <Trophy className="w-10 h-10 text-amber-400/60" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight"
        >
          SUPSAS
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-white/40 text-lg font-medium max-w-md"
        >
          Sistem Sukan Polisas sedang dalam persediaan. Nantikan edisi yang akan datang!
        </motion.p>
      </div>
    );
  }

  const QUICK_LINKS = [
    { label: 'Kedudukan Live', desc: 'Papan markah medal masa nyata', icon: BarChart3, path: '/supsas/scoreboard', color: 'amber' },
    { label: 'Jadual Pertandingan', desc: 'Semak perlawanan & keputusan', icon: Calendar, path: '/supsas/jadual', color: 'blue' },
    { label: 'Sukan & Acara', desc: `${sports.length} sukan dipertandingkan`, icon: Trophy, path: '/supsas/sukan', color: 'emerald' },
    { label: 'Kontinjen', desc: `${kontingen.length} jabatan bersaing`, icon: Users, path: '/supsas/kontinjen', color: 'violet' },
  ];

  const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    amber:   { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400',  glow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]' },
    blue:    { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   glow: 'shadow-[0_0_30px_rgba(59,130,246,0.15)]' },
    emerald: { bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',text: 'text-emerald-400',glow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]' },
    violet:  { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', glow: 'shadow-[0_0_30px_rgba(139,92,246,0.15)]' },
  };

  return (
    <div className="min-h-screen pb-24">
      {/* ── Hero Section ── */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 py-20 overflow-hidden text-center">
        {/* Decorative rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1 + i * 0.05, 1], opacity: [0.06, 0.12, 0.06] }}
              transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
              className="absolute rounded-full border border-amber-500/20"
              style={{ width: `${24 + i * 18}vw`, height: `${24 + i * 18}vw`, maxWidth: `${300 + i * 200}px`, maxHeight: `${300 + i * 200}px` }}
            />
          ))}
        </div>

        {/* Edition badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 backdrop-blur-md mb-8"
        >
          {isLive ? (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          ) : (
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">
            {isLive ? 'Sedang Berlangsung · ' : ''}{edition?.name}
          </span>
        </motion.div>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-5xl sm:text-7xl md:text-[8rem] xl:text-[10rem] font-black tracking-[-0.04em] leading-none text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/20 mb-4"
        >
          SUPSAS
        </motion.h1>

        {/* Tagline */}
        {edition?.tagline && (
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-base sm:text-xl text-amber-300/70 font-black uppercase tracking-[0.3em] mb-10"
          >
            {edition.tagline}
          </motion.p>
        )}

        {/* Countdown or Live state */}
        {isLive ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-4 mb-12"
          >
            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-red-500/20 border border-red-500/30">
              <Flame className="w-5 h-5 text-red-400 animate-pulse" />
              <span className="text-sm font-black uppercase tracking-widest text-red-300">Acara Sedang Berlangsung</span>
              <Flame className="w-5 h-5 text-red-400 animate-pulse" />
            </div>
            <MiniPodium tally={medalTally} />
          </motion.div>
        ) : !countdown.ended && edition?.start_date ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-6 mb-12"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Bermula dalam</p>
            <div className="flex items-end gap-3 sm:gap-4">
              <CountdownBlock value={countdown.days}    label="Hari" />
              <span className="text-2xl font-black text-white/20 pb-6">:</span>
              <CountdownBlock value={countdown.hours}   label="Jam" />
              <span className="text-2xl font-black text-white/20 pb-6">:</span>
              <CountdownBlock value={countdown.minutes} label="Minit" />
              <span className="text-2xl font-black text-white/20 pb-6">:</span>
              <CountdownBlock value={countdown.seconds} label="Saat" />
            </div>
          </motion.div>
        ) : null}

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <button
            onClick={() => navigate('/supsas/scoreboard')}
            className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black uppercase text-sm tracking-widest hover:scale-105 active:scale-[0.98] transition-all duration-300 shadow-[0_0_40px_rgba(245,158,11,0.4)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Lihat Kedudukan
            </span>
          </button>
          <button
            onClick={() => navigate('/supsas/jadual')}
            className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-black uppercase text-sm tracking-widest hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-300 backdrop-blur-md flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Jadual Pertandingan
          </button>
        </motion.div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y border-white/5 bg-white/[0.02] px-4 py-5 overflow-hidden">
        <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap">
          {[
            { icon: Users, value: kontingen.length, label: 'Kontinjen' },
            { icon: Trophy, value: sports.length, label: 'Sukan' },
            { icon: Medal, value: medalTally.reduce((a, k) => a + k.total_medals, 0), label: 'Medal Diraih' },
            { icon: Star, value: edition?.edition_year ?? '—', label: 'Edisi' },
          ].map(({ icon: Icon, value, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Icon className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xl font-black text-white leading-none">{value}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">{label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Quick Links ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-400/60 mb-3">Navigasi Pantas</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Semua Data. Masa Nyata.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {QUICK_LINKS.map((link, i) => {
            const c = colorMap[link.color];
            return (
              <motion.button
                key={link.path}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                onClick={() => navigate(link.path)}
                className={cn(
                  'group relative p-6 rounded-[2rem] border text-left transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]',
                  c.bg, c.border, c.glow,
                  'hover:bg-white/5'
                )}
              >
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110', c.bg, c.border)}>
                  <link.icon className={cn('w-6 h-6', c.text)} />
                </div>
                <h3 className="text-base font-black text-white mb-1">{link.label}</h3>
                <p className="text-xs text-white/40 font-medium leading-relaxed">{link.desc}</p>
                <ChevronRight className={cn('absolute bottom-5 right-5 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1', c.text)} />
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ── Live Medal Snapshot (if edition is live or has results) ── */}
      {medalTally.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-400/60 mb-1">Papan Markah</p>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Kedudukan Terkini</h2>
            </div>
            <button
              onClick={() => navigate('/supsas/scoreboard')}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
            >
              Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {medalTally.slice(0, 5).map((k, i) => (
              <motion.div
                key={k.kontingen_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.08 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer"
                onClick={() => navigate('/supsas/scoreboard')}
              >
                {/* Rank */}
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0',
                  i === 0 ? 'bg-amber-500/30 text-amber-400' :
                  i === 1 ? 'bg-slate-500/30 text-slate-300' :
                  i === 2 ? 'bg-orange-700/30 text-orange-400' :
                             'bg-white/5 text-white/40'
                )}>
                  {i + 1}
                </div>
                {/* Color dot & name */}
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: k.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white text-sm truncate">{k.name}</p>
                  <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{k.short_code}</p>
                </div>
                {/* Medal counts */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {[{ emoji: '🥇', count: k.gold }, { emoji: '🥈', count: k.silver }, { emoji: '🥉', count: k.bronze }].map(({ emoji, count }) => (
                    <div key={emoji} className="flex items-center gap-1">
                      <span className="text-sm">{emoji}</span>
                      <span className="text-sm font-black text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
