import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Trophy, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { useSupsas, SupsasMedalTally } from '@/contexts/SupsasContext';
import { cn } from '@/lib/utils';

// ─── Confetti (CSS-only burst on update) ─────────────────────
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm pointer-events-none"
      style={{ backgroundColor: color, top: '50%', left: '50%' }}
      initial={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
      animate={{
        opacity: 0, scale: 0.5,
        x: (Math.random() - 0.5) * 300,
        y: (Math.random() - 0.5) * 300,
        rotate: Math.random() * 720,
      }}
      transition={{ duration: 1.5, delay, ease: 'easeOut' }}
    />
  );
}

function CelebrationBurst({ trigger }: { trigger: number }) {
  const [particles, setParticles] = useState<{ id: number; delay: number; color: string }[]>([]);
  const colors = ['#FFD700', '#FFF', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444'];

  useEffect(() => {
    if (trigger === 0) return;
    const ps = Array.from({ length: 30 }, (_, i) => ({
      id: Date.now() + i,
      delay: i * 0.03,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(ps);
    const t = setTimeout(() => setParticles([]), 2500);
    return () => clearTimeout(t);
  }, [trigger]);

  if (particles.length === 0) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden flex items-center justify-center">
      {particles.map((p) => <ConfettiParticle key={p.id} delay={p.delay} color={p.color} />)}
    </div>
  );
}

// ─── Medal Cell ───────────────────────────────────────────────
function MedalCell({ count, type }: { count: number; type: 'gold' | 'silver' | 'bronze' }) {
  const styles = {
    gold:   'text-amber-400   bg-amber-500/10  border-amber-500/20',
    silver: 'text-slate-300   bg-slate-500/10  border-slate-500/20',
    bronze: 'text-orange-400  bg-orange-700/10 border-orange-700/20',
  };
  const emojis = { gold: '🥇', silver: '🥈', bronze: '🥉' };
  return (
    <div className={cn(
      'flex items-center justify-center gap-1.5 w-16 sm:w-20 h-10 rounded-xl border font-black text-base transition-all',
      styles[type],
      count > 0 ? 'opacity-100' : 'opacity-25'
    )}>
      <span className="text-sm">{emojis[type]}</span>
      <span>{count}</span>
    </div>
  );
}

// ─── Rank badge ───────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)] flex-shrink-0">
      <Trophy className="w-4 h-4 text-black" />
    </div>
  );
  if (rank === 2) return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-black text-slate-800">2</span>
    </div>
  );
  if (rank === 3) return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-black text-white">3</span>
    </div>
  );
  return (
    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-black text-white/40">{rank}</span>
    </div>
  );
}

// ─── Tally Row ────────────────────────────────────────────────
function TallyRow({ entry, rank, isTV }: { entry: SupsasMedalTally; rank: number; isTV: boolean }) {
  const isTop3 = rank <= 3;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border transition-all duration-300',
        isTop3
          ? 'bg-gradient-to-r from-white/5 to-transparent border-white/10 hover:border-white/20'
          : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10',
        rank === 1 && 'shadow-[0_0_30px_rgba(245,158,11,0.1)]'
      )}
    >
      {/* Rank */}
      <RankBadge rank={rank} />

      {/* Color indicator */}
      <div
        className="w-1 h-10 rounded-full flex-shrink-0 hidden sm:block"
        style={{ backgroundColor: entry.color, boxShadow: `0 0 10px ${entry.color}60` }}
      />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-black text-white truncate leading-none mb-0.5 transition-all',
          isTV ? 'text-2xl' : 'text-sm sm:text-base'
        )}>
          {entry.name}
        </p>
        <p className={cn(
          'font-black uppercase tracking-widest text-white/30 truncate',
          isTV ? 'text-sm' : 'text-[9px] sm:text-[10px]'
        )}>
          {entry.short_code}
        </p>
      </div>

      {/* Medals */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <MedalCell count={entry.gold}   type="gold" />
        <MedalCell count={entry.silver} type="silver" />
        <MedalCell count={entry.bronze} type="bronze" />
      </div>

      {/* Total */}
      <div className="hidden sm:flex flex-col items-center w-14 flex-shrink-0">
        <span className={cn('font-black text-white', isTV ? 'text-3xl' : 'text-xl')}>{entry.total_medals}</span>
        <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Jumlah</span>
      </div>
    </motion.div>
  );
}

// ─── Main Scoreboard ──────────────────────────────────────────
export function SupsasScoreboardPage() {
  const { edition, medalTally, sports, isLive, refetch } = useSupsas();
  const [isTV, setIsTV] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [celebTrigger, setCelebTrigger] = useState(0);
  const [filterSport, setFilterSport] = useState<string>('all');
  const prevTallyRef = useRef<SupsasMedalTally[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Detect ranking changes → trigger celebration
  useEffect(() => {
    if (medalTally.length === 0) return;
    if (prevTallyRef.current.length > 0) {
      const changed = medalTally.some((entry, i) => {
        const prev = prevTallyRef.current[i];
        return !prev || prev.gold !== entry.gold || prev.silver !== entry.silver || prev.bronze !== entry.bronze;
      });
      if (changed) {
        setCelebTrigger(c => c + 1);
        setLastUpdate(new Date());
      }
    }
    prevTallyRef.current = medalTally;
  }, [medalTally]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // TV mode: fullscreen
  useEffect(() => {
    if (isTV) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      if (document.fullscreenElement) document.exitFullscreen?.();
    }
  }, [isTV]);

  const displayTally = medalTally.length > 0 ? medalTally : [];

  return (
    <>
      <CelebrationBurst trigger={celebTrigger} />

      <div className={cn(
        'min-h-screen pb-24 transition-all duration-500',
        isTV && 'fixed inset-0 z-[100] bg-[#050A14] overflow-auto pb-0'
      )}>
        {/* ── Header ── */}
        <div className={cn('px-4 sm:px-6 md:px-12 pt-8 pb-6', isTV && 'pt-6 pb-4')}>
          <div className="max-w-5xl mx-auto">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h1 className={cn('font-black text-white leading-none', isTV ? 'text-4xl' : 'text-2xl sm:text-3xl')}>
                      Papan Markah Medal
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-0.5">
                      {edition?.name} · Dikemas kini setiap 30 saat
                    </p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {/* Live indicator */}
                <div className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border',
                  isLive
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-white/5 border-white/10'
                )}>
                  {isLive ? (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-white/20" />
                  )}
                  <span className={cn('text-[9px] font-black uppercase tracking-widest', isLive ? 'text-red-400' : 'text-white/30')}>
                    {isLive ? 'Live' : 'Tidak Aktif'}
                  </span>
                </div>

                {/* Refresh */}
                <button
                  onClick={handleRefresh}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                </button>

                {/* TV mode */}
                <button
                  onClick={() => setIsTV(!isTV)}
                  className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-xl border transition-all',
                    isTV
                      ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                      : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                  )}
                  title={isTV ? 'Keluar TV Mode' : 'TV Mode'}
                >
                  {isTV ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Last update */}
            <p className="text-[9px] font-bold text-white/20 mt-3">
              Terakhir dikemas kini: {lastUpdate.toLocaleTimeString('ms-MY')}
            </p>
          </div>
        </div>

        {/* ── Table ── */}
        <div className={cn('px-4 sm:px-6 md:px-12', isTV && 'px-8')}>
          <div className="max-w-5xl mx-auto">
            {/* Column headers */}
            <div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 mb-3">
              <div className="w-9" /> {/* rank */}
              <div className="w-1 hidden sm:block" /> {/* color bar */}
              <div className="flex-1">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Kontinjen</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {['🥇 Emas', '🥈 Perak', '🥉 Gangsa'].map((label) => (
                  <div key={label} className="w-16 sm:w-20 text-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20">{label}</span>
                  </div>
                ))}
              </div>
              <div className="hidden sm:block w-14 text-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Jumlah</span>
              </div>
            </div>

            {/* Rows */}
            {displayTally.length === 0 ? (
              <div className="text-center py-24">
                <Trophy className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/30 font-black uppercase tracking-widest text-sm">
                  Belum ada keputusan direkod
                </p>
                <p className="text-white/20 text-xs mt-2">Papan markah akan dikemas kini sebaik keputusan dimasukkan</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-2 sm:space-y-3">
                  {displayTally.map((entry, i) => (
                    <TallyRow key={entry.kontingen_id} entry={entry} rank={i + 1} isTV={isTV} />
                  ))}
                </div>
              </AnimatePresence>
            )}

            {/* Legend */}
            {!isTV && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 opacity-40">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/60">
                  Ranking dikira berdasarkan: Emas → Perak → Gangsa
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── TV mode footer ── */}
        {isTV && (
          <div className="fixed bottom-0 inset-x-0 flex items-center justify-between px-8 py-4 bg-[#050A14]/80 backdrop-blur-xl border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <span className="font-black text-white text-lg uppercase tracking-widest">SUPSAS — {edition?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {isLive && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
              <span className="text-sm font-black uppercase tracking-widest text-white/40">
                {new Date().toLocaleTimeString('ms-MY')}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
