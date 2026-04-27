import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '@/lib/utils';

export interface SupsasMegaBannerProps {
  supsasEdition: any;
}

export function SupsasMegaBanner({ supsasEdition }: SupsasMegaBannerProps) {
  const navigate = useNavigate();
  const [supsasCountdown, setSupsasCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0, expired: false });
  const [clickCount, setClickCount] = useState(0);

  // Parallax Setup
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleSecretClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    setClickCount(c => c + 1);
    if (clickCount + 1 >= 5) {
      triggerHaptic('heavy');
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#b45309', '#ffffff'],
        zIndex: 1000,
      });
      setClickCount(0);
    }
  };

  useEffect(() => {
    if (!supsasEdition?.start_date) return;
    const target = new Date(supsasEdition.start_date).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setSupsasCountdown({ days: 0, hours: 0, mins: 0, secs: 0, expired: true });
        return;
      }
      setSupsasCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [supsasEdition?.start_date]);

  return (
    <motion.div
      key="supsas-mega-banner"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      className="w-full max-w-4xl perspective-[1000px]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        onClick={() => { triggerHaptic('light'); navigate('/supsas'); }}
        className="relative cursor-pointer rounded-[2.2rem] overflow-hidden transition-shadow duration-500 hover:shadow-[0_20px_50px_rgba(245,158,11,0.2)] text-left ring-1 ring-amber-500/20"
        style={{
          background: 'linear-gradient(135deg, #030d1a 0%, #1a0d00 50%, #0a0500 100%)',
          animation: 'supsas-glow-pulse 3s ease-in-out infinite',
          minHeight: 260,
          rotateX,
          rotateY,
          transformStyle: "preserve-3d"
        }}
      >
        <style>{`
          @keyframes supsas-shimmer-sweep {
            0% { transform: translateX(-150%) skewX(-20deg); }
            15%, 100% { transform: translateX(250%) skewX(-20deg); }
          }
          @keyframes supsas-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
        
        {/* Continuous Shimmer Sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent opacity-50 pointer-events-none z-0" style={{ animation: 'supsas-shimmer-sweep 6s infinite ease-in-out', animationDelay: '1s' }} />

        <div className="absolute inset-0 opacity-[0.04] translate-z-[10px]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="absolute inset-0 pointer-events-none translate-z-[20px]" style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(245,158,11,0.3) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 pointer-events-none translate-z-[20px]" style={{ background: 'radial-gradient(ellipse at 80% 100%, rgba(180,83,9,0.2) 0%, transparent 50%)' }} />

        {/* Live Status Marquee */}
        <div className="absolute top-0 left-0 right-0 h-7 bg-amber-900/40 border-b border-amber-500/20 overflow-hidden z-20 flex items-center backdrop-blur-md">
          <div className="whitespace-nowrap flex items-center gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200" style={{ animation: 'supsas-marquee 20s linear infinite', width: '200%' }}>
            <span>🏆 {supsasEdition?.name ?? 'SUPSAS'} MEMBAWA SEMANGAT KESUKANAN!</span>
            <span>🏅 SOKONG KONTINJEN ANDA SEKARANG</span>
            <span>🔥 ACARA SUKAN SEDANG BERLANGSUNG</span>
            <span>🏆 {supsasEdition?.name ?? 'SUPSAS'} MEMBAWA SEMANGAT KESUKANAN!</span>
            <span>🏅 SOKONG KONTINJEN ANDA SEKARANG</span>
            <span>🔥 ACARA SUKAN SEDANG BERLANGSUNG</span>
          </div>
        </div>

        <div className="flex items-center justify-between px-7 pt-12 pb-0 relative z-30 translate-z-[30px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-300">Sedang Berlangsung</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
            🏆 SUPSAS
          </span>
        </div>

        <div className="px-7 pt-5 pb-8 text-center space-y-4 relative z-30 translate-z-[40px]">
          <div 
            onClick={handleSecretClick}
            className="text-5xl sm:text-6xl cursor-help hover:scale-110 active:scale-95 transition-transform" 
            style={{ filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.6))' }}
          >
            🏆
          </div>
          <div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight"
              style={{
                backgroundImage: 'linear-gradient(90deg, #fbbf24, #ffffff, #f59e0b, #fbbf24)',
                backgroundSize: '300% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'supsas-gradient-shift 4s linear infinite',
              }}
            >
              {supsasEdition?.name ?? 'SUPSAS'}
            </h2>
            {supsasEdition?.start_date && (
              <p className="text-sm text-white/50 font-medium mt-2 tracking-wide">
                {new Date(supsasEdition.start_date).toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          {supsasEdition?.start_date && !supsasCountdown.expired && (
            <div className="inline-flex items-center gap-1 px-5 py-2.5 rounded-2xl" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <LucideIcons.Clock className="w-3.5 h-3.5 text-amber-400 mr-1" />
              <span className="text-xs text-white/60 font-medium">Bermula dalam</span>
              {[{ v: supsasCountdown.days, l: 'h' }, { v: supsasCountdown.hours, l: 'j' }, { v: supsasCountdown.mins, l: 'm' }, { v: supsasCountdown.secs, l: 's' }].map(({ v, l }) => (
                <span key={l} className="flex items-baseline gap-0.5">
                  <span className="text-lg font-black text-white tabular-nums">{String(v).padStart(2, '0')}</span>
                  <span className="text-[10px] text-white/40 font-bold">{l}</span>
                </span>
              ))}
            </div>
          )}
          {supsasEdition?.is_active && supsasCountdown.expired && (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" /></span>
              <span className="text-xs text-amber-300 font-black">Sedang Berlangsung!</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1 translate-z-[50px]">
            <button onClick={e => { e.stopPropagation(); triggerHaptic('medium'); navigate('/supsas/scoreboard'); }}
              className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 relative"
              style={{ background: 'linear-gradient(135deg, #b45309, #f59e0b)', boxShadow: '0 8px 30px rgba(245,158,11,0.35)', color: '#000' }}>
              <LucideIcons.BarChart3 className="w-4 h-4" /> Papan Markah
            </button>
            <button onClick={e => { e.stopPropagation(); triggerHaptic('light'); navigate('/supsas/jadual'); }}
              className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 relative"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
              <LucideIcons.CalendarDays className="w-4 h-4" /> Jadual
            </button>
            <button onClick={e => { e.stopPropagation(); triggerHaptic('light'); navigate('/supsas'); }}
              className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 relative"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
              <LucideIcons.Trophy className="w-4 h-4" /> Laman SUPSAS
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
