import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useKarnival } from '@/contexts/KarnivalContext';
import { supabase } from '@/lib/supabase';
import { Trophy, RefreshCw, Play, Pause, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

interface BoothResult {
  booth_id: string;
  booth_name: string;
  booth_number: string | null;
  image_url: string | null;
  total_votes: number;
}

const ROTATE_MS = 60_000; // 1 minit

// Podium medal config
const MEDALS = [
  {
    rank: 1, emoji: '🥇', label: '1ST',
    color: '#fbbf24', glow: 'rgba(251,191,36,0.5)',
    bg: 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(180,83,9,0.10) 100%)',
    border: 'rgba(251,191,36,0.35)', barFrom: '#f59e0b', barTo: '#fbbf24',
    textColor: 'text-amber-300', numColor: '#fbbf24',
  },
  {
    rank: 2, emoji: '🥈', label: '2ND',
    color: '#cbd5e1', glow: 'rgba(203,213,225,0.4)',
    bg: 'linear-gradient(135deg, rgba(203,213,225,0.12) 0%, rgba(148,163,184,0.06) 100%)',
    border: 'rgba(203,213,225,0.25)', barFrom: '#94a3b8', barTo: '#cbd5e1',
    textColor: 'text-slate-300', numColor: '#cbd5e1',
  },
  {
    rank: 3, emoji: '🥉', label: '3RD',
    color: '#fb923c', glow: 'rgba(251,146,60,0.4)',
    bg: 'linear-gradient(135deg, rgba(251,146,60,0.14) 0%, rgba(194,65,12,0.07) 100%)',
    border: 'rgba(251,146,60,0.25)', barFrom: '#ea580c', barTo: '#fb923c',
    textColor: 'text-orange-300', numColor: '#fb923c',
  },
];

export function KarnivalScoreboard() {
  const [searchParams] = useSearchParams();
  const isFullscreen = searchParams.get('fullscreen') === '1';

  const { edition, categories, isLoading: ctxLoading } = useKarnival();
  const [catIndex, setCatIndex]     = useState(0);
  const [prevIndex, setPrevIndex]   = useState<number | null>(null);
  const [direction, setDirection]   = useState<1 | -1>(1); // 1 = forward, -1 = back
  const [announcing, setAnnouncing] = useState(false); // fullscreen category reveal
  const [results,    setResults]    = useState<BoothResult[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [autoPlay,   setAutoPlay]   = useState(true);
  const [lastFetch,  setLastFetch]  = useState<Date | null>(null);
  const [rotateMs,   setRotateMs]   = useState(ROTATE_MS);
  const [now,        setNow]        = useState(new Date());

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [announceKey, setAnnounceKey] = useState(0); // force re-trigger on same cat

  // Helper: change category with direction tracking + announce overlay
  const goTo = useCallback((next: number, dir: 1 | -1) => {
    setDirection(dir);
    setPrevIndex(catIndex);
    setCatIndex(next);
    setAnnounceKey(k => k + 1);
    // Flash full-screen category announcement for 1.8s
    setAnnouncing(true);
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnouncing(false), 1800);
  }, [catIndex]);

  useEffect(() => () => { if (announceTimer.current) clearTimeout(announceTimer.current); }, []);

  const activeCat = categories[catIndex] ?? null;
  const maxVotes  = results[0]?.total_votes ?? 1;

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch results
  const fetchResults = useCallback(async () => {
    if (!edition || !activeCat) return;
    setLoading(true);
    const { data } = await supabase.rpc('get_karnival_booth_votes', {
      p_edition_id:  edition.id,
      p_category_id: activeCat.id,
    });
    setResults((data ?? []) as BoothResult[]);
    setLastFetch(new Date());
    setLoading(false);
  }, [edition, activeCat]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => fetchResults(), 30_000);
    return () => clearInterval(id);
  }, [fetchResults]);

  // Auto-rotate + countdown ring
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!autoPlay || categories.length <= 1) return;

    setRotateMs(ROTATE_MS);
    timerRef.current = setInterval(() => {
      setCatIndex(i => {
        const next = (i + 1) % categories.length;
        setDirection(1);
        setPrevIndex(i);
        setAnnouncing(true);
        if (announceTimer.current) clearTimeout(announceTimer.current);
        announceTimer.current = setTimeout(() => setAnnouncing(false), 1800);
        return next;
      });
      setRotateMs(ROTATE_MS);
    }, ROTATE_MS);

    countdownRef.current = setInterval(() => {
      setRotateMs(m => Math.max(0, m - 100));
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoPlay, categories.length]);

  const rotateProgress = 1 - rotateMs / ROTATE_MS; // 0→1
  const circumference  = 2 * Math.PI * 18;

  if (ctxLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050f]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-violet-500" />
          <p className="text-white/30 font-black text-xs uppercase tracking-widest">Memuatkan...</p>
        </div>
      </div>
    );
  }

  const top3    = results.slice(0, 3);
  const rest    = results.slice(3);

  return (
    <div className={`min-h-screen bg-[#05050f] flex flex-col select-none ${isFullscreen ? 'overflow-hidden' : ''}`}>

      {/* ── Ambient background ──────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[30%] w-[700px] h-[700px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(219,39,119,0.10) 0%, transparent 70%)' }} />
        <div className="absolute top-[40%] left-[-5%] w-[400px] h-[400px] rounded-full blur-[80px]"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)' }} />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '36px 36px' }} />
        {/* Horizontal scanline */}
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)' }} />
      </div>

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <header className="relative z-20 px-6 md:px-10 py-4"
        style={{ borderBottom: '1px solid rgba(139,92,246,0.15)', background: 'rgba(5,5,15,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="grid grid-cols-3 items-center gap-4">

          {/* Left: branding */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-xl md:text-2xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(109,40,217,0.6))', border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 0 30px rgba(139,92,246,0.3)' }}>
              🎪
            </div>
            <div className="min-w-0 hidden sm:block">
              <h1 className="text-base md:text-xl font-black text-white tracking-tight leading-none truncate">
                {edition?.name ?? 'Karnival JPP'}
              </h1>
              {edition?.tagline && (
                <p className="text-[10px] text-violet-300/50 font-medium mt-0.5 tracking-wide truncate">{edition.tagline}</p>
              )}
            </div>
          </div>

          {/* Center: live badge + clock — truly centered */}
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <Zap className="w-3 h-3 text-violet-400" />
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-violet-300">Keputusan Langsung</span>
            </div>
            <p className="text-xl md:text-3xl font-black text-white tabular-nums tracking-tight">
              {now.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>

          {/* Right: controls */}
          <div className="flex items-center justify-end gap-1.5 md:gap-2">
            <button onClick={() => { const prev = catIndex; const next = (catIndex - 1 + categories.length) % categories.length; goTo(next, -1); setAutoPlay(false); }}
              className="p-2 md:p-2.5 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {/* Auto-rotate ring button */}
            <button onClick={() => setAutoPlay(v => !v)}
              className="relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl transition-all hover:bg-white/[0.06]"
              style={{ border: `1px solid ${autoPlay ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}` }}
              title={autoPlay ? 'Henti auto-rotate' : 'Mula auto-rotate'}>
              {autoPlay && categories.length > 1 && (
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="2.5" />
                  <circle cx="22" cy="22" r="18" fill="none" stroke="#7c3aed" strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - rotateProgress)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
                </svg>
              )}
              {autoPlay ? <Pause className="w-4 h-4 text-violet-400 relative z-10" /> : <Play className="w-4 h-4 text-white/40 relative z-10" />}
            </button>

            <button onClick={() => { const next = (catIndex + 1) % categories.length; goTo(next, 1); setAutoPlay(false); }}
              className="p-2 md:p-2.5 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <button onClick={fetchResults}
              className="p-2 md:p-2.5 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* ── CATEGORY PILLS ──────────────────────────────────────── */}
      <div className="relative z-10 px-6 md:px-10 py-3 flex items-center gap-2 overflow-x-auto"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {categories.map((cat, i) => (
          <button key={cat.id}
            onClick={() => { goTo(i, i > catIndex ? 1 : -1); setAutoPlay(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all flex-shrink-0"
            style={i === catIndex ? {
              background: 'linear-gradient(135deg, rgba(139,92,246,0.5), rgba(109,40,217,0.3))',
              border: '1px solid rgba(139,92,246,0.6)',
              boxShadow: '0 0 20px rgba(139,92,246,0.3)',
              color: 'white',
            } : {
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.4)',
            }}>
            <span className="text-base">{cat.icon_emoji}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* ── FULLSCREEN CATEGORY ANNOUNCEMENT OVERLAY ─────────────── */}
      <AnimatePresence>
        {announcing && activeCat && (
          <motion.div
            key={`announce-${announceKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
            style={{ background: 'rgba(5,5,15,0.92)', backdropFilter: 'blur(12px)' }}
          >
            {/* Radial glow */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse at 50% 50%, rgba(109,40,217,0.35) 0%, transparent 65%)'
            }} />
            {/* Horizontal scan line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-0 top-1/2 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.8), transparent)' }}
            />
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.1, opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center gap-4"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                className="text-6xl md:text-8xl"
                style={{ filter: 'drop-shadow(0 0 40px rgba(139,92,246,0.8))' }}
              >
                {activeCat.icon_emoji}
              </motion.span>
              <div className="text-center">
                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-violet-400/70 mb-2">Kategori Seterusnya</p>
                <h2 className="text-4xl md:text-7xl font-black text-white tracking-tight"
                  style={{ textShadow: '0 0 60px rgba(139,92,246,0.6)' }}>
                  {activeCat.name}
                </h2>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN SCOREBOARD ─────────────────────────────────────── */}
      <main className="relative z-10 flex-1 px-4 md:px-10 py-6 pb-10" style={{ overflow: 'hidden' }}>
        <AnimatePresence mode="wait" custom={direction}>
          {activeCat && (
            <motion.div
              key={activeCat.id}
              custom={direction}
              variants={{
                enter: (dir: number) => ({ x: dir * 120, opacity: 0, scale: 0.97 }),
                center: { x: 0, opacity: 1, scale: 1 },
                exit:  (dir: number) => ({ x: dir * -120, opacity: 0, scale: 0.97 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
                  {/* Category title with pulse animation */}
                  <div className="text-center mb-8">
                    <motion.div
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 18 }}
                      className="inline-flex items-center gap-3 px-6 py-2 rounded-full mb-3"
                      style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                      <span className="text-2xl">{activeCat.icon_emoji}</span>
                      <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">{activeCat.name}</h2>
                    </motion.div>
                    {activeCat.description && (
                      <p className="text-sm text-white/30 font-medium">{activeCat.description}</p>
                    )}
                  </div>

              {loading && results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <RefreshCw className="w-10 h-10 animate-spin text-violet-500" />
                  <p className="text-white/25 font-black text-xs uppercase tracking-widest">Memuatkan keputusan...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-24">
                  <Trophy className="w-20 h-20 text-white/10 mx-auto mb-4" />
                  <p className="text-white/25 font-black text-lg">Belum ada undi lagi</p>
                  <p className="text-white/15 text-sm mt-2">Undi pertama akan muncul di sini</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* ── TOP 3 PODIUM ROW ── */}
                  {top3.length > 0 && (
                    <div className={`grid gap-4 mb-6 ${top3.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' : top3.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-3'}`}>
                      {top3.map((booth, i) => {
                        const medal = MEDALS[i];
                        const pct   = (booth.total_votes / maxVotes) * 100;
                        return (
                          <motion.div
                            key={booth.booth_id}
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="relative rounded-3xl overflow-hidden p-5 flex flex-col items-center text-center"
                            style={{
                              background: medal.bg,
                              border: `1px solid ${medal.border}`,
                              boxShadow: `0 0 40px ${medal.glow}, inset 0 1px 0 ${medal.border}`,
                            }}
                          >
                            {/* Shimmer top line */}
                            <div className="absolute inset-x-0 top-0 h-px"
                              style={{ background: `linear-gradient(90deg, transparent, ${medal.color}80, transparent)` }} />

                            {/* Crown glow for 1st */}
                            {i === 0 && (
                              <div className="absolute inset-0 opacity-30 pointer-events-none"
                                style={{ background: `radial-gradient(ellipse at 50% 0%, ${medal.glow} 0%, transparent 60%)` }} />
                            )}

                            <div className="relative">
                              {/* Medal emoji */}
                              <div className="text-4xl md:text-6xl mb-2 filter"
                                style={{ filter: `drop-shadow(0 0 16px ${medal.color})` }}>
                                {medal.emoji}
                              </div>

                              {/* Booth image */}
                              {booth.image_url ? (
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden mx-auto mb-3"
                                  style={{ boxShadow: `0 0 0 2px ${medal.border}` }}>
                                  <img src={booth.image_url} alt={booth.booth_name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                </div>
                              ) : (
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                                  style={{ background: `${medal.border}`, border: `1px solid ${medal.border}` }}>
                                  <span className="text-3xl">🏪</span>
                                </div>
                              )}

                              {/* Name */}
                              {booth.booth_number && (
                                <p className="text-[10px] font-black uppercase tracking-widest mb-0.5"
                                  style={{ color: `${medal.color}80` }}>{booth.booth_number}</p>
                              )}
                              <p className={`text-base md:text-xl font-black leading-tight mb-3 ${medal.textColor}`}>
                                {booth.booth_name}
                              </p>

                              {/* Votes */}
                              <motion.p
                                key={booth.total_votes}
                                initial={{ scale: 1.2, opacity: 0.5 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-3xl md:text-5xl font-black tabular-nums leading-none"
                                style={{ color: medal.numColor, textShadow: `0 0 30px ${medal.glow}` }}>
                                {booth.total_votes.toLocaleString()}
                              </motion.p>
                              <p className="text-[10px] font-bold uppercase tracking-widest mt-1"
                                style={{ color: `${medal.color}50` }}>undi</p>

                              {/* Mini progress bar */}
                              <div className="mt-3 h-1.5 rounded-full w-full overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 + i * 0.1 }}
                                  className="h-full rounded-full"
                                  style={{ background: `linear-gradient(90deg, ${medal.barFrom}, ${medal.barTo})` }} />
                              </div>
                              <p className="text-[10px] text-right font-black mt-1" style={{ color: `${medal.color}60` }}>
                                {Math.round(pct)}%
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── RANK 4+ LIST ── */}
                  {rest.length > 0 && (
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 px-2 mb-3">Penyertaan Lain</p>
                      {rest.map((booth, i) => {
                        const rank = i + 4;
                        const pct  = (booth.total_votes / maxVotes) * 100;
                        return (
                          <motion.div
                            key={booth.booth_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                            className="relative rounded-2xl overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            {/* Progress bg */}
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.4 + i * 0.05 }}
                              className="absolute inset-y-0 left-0 rounded-2xl"
                              style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.10), transparent)' }} />

                            <div className="relative flex items-center gap-4 px-5 py-3.5">
                              <span className="text-sm font-black text-white/20 w-6 text-center flex-shrink-0">{rank}</span>
                              {booth.image_url ? (
                                <img src={booth.image_url} alt={booth.booth_name}
                                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0" loading="lazy" decoding="async" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-violet-600/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-lg">🏪</span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                {booth.booth_number && (
                                  <span className="text-[9px] font-black text-violet-400/50 mr-1.5">{booth.booth_number}</span>
                                )}
                                <p className="font-black text-sm md:text-base text-white truncate">{booth.booth_name}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <motion.p
                                  key={booth.total_votes}
                                  initial={{ scale: 1.1, opacity: 0.5 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="text-lg md:text-2xl font-black text-violet-300 tabular-nums">
                                  {booth.total_votes.toLocaleString()}
                                </motion.p>
                                <p className="text-[9px] text-white/20 font-bold uppercase">{Math.round(pct)}%</p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="relative z-20 px-6 md:px-10 py-3 flex items-center justify-between flex-wrap gap-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(5,5,15,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">JPP POLISAS · Karnival {edition?.name}</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-white/25 font-medium">
          {lastFetch && (
            <span>Kemas kini: {lastFetch.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          )}
          {autoPlay && categories.length > 1 && (
            <span className="text-violet-400/50 font-black">
              ↻ Auto-rotate · {Math.ceil(rotateMs / 1000)}s
            </span>
          )}
          {/* Category dots */}
          <div className="flex items-center gap-1">
            {categories.map((_, i) => (
              <div key={i} className="rounded-full transition-all duration-500"
                style={{
                  width: i === catIndex ? 16 : 5, height: 5,
                  background: i === catIndex ? '#7c3aed' : 'rgba(255,255,255,0.15)',
                }} />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
