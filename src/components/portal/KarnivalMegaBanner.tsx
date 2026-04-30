import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '@/lib/utils';

export interface KarnivalMegaBannerProps {
  karnivalStatus: any;
}

export function KarnivalMegaBanner({ karnivalStatus }: KarnivalMegaBannerProps) {
  const navigate = useNavigate();
  const [karnivalCountdown, setKarnivalCountdown] = useState({ h: 0, m: 0, s: 0, expired: false });
  const [clickCount, setClickCount] = useState(0);

  // Parallax Setup
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const [isHovered, setIsHovered] = useState(false);

  // Automated Breathing Parallax for Mobile (and when not hovered on desktop)
  useEffect(() => {
    if (!isHovered) {
      const cx = animate(x, [-0.15, 0.15, -0.15], { duration: 8, ease: "easeInOut", repeat: Infinity });
      const cy = animate(y, [-0.1, 0.1, -0.1], { duration: 10, ease: "easeInOut", repeat: Infinity });
      return () => { cx.stop(); cy.stop(); };
    }
  }, [isHovered, x, y]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    // Normalize to [-0.5, 0.5]
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // x and y will be picked up by the breathing animation naturally
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
        colors: ['#c084fc', '#f472b6', '#fbbf24', '#a855f7'],
        zIndex: 1000,
      });
      setClickCount(0);
    }
  };

  useEffect(() => {
    if (!karnivalStatus?.endDate) return;
    const tick = () => {
      const diff = new Date(karnivalStatus.endDate!).getTime() - Date.now();
      if (diff <= 0) { setKarnivalCountdown(c => ({ ...c, expired: true })); return; }
      setKarnivalCountdown({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [karnivalStatus?.endDate]);

  return (
    <motion.div
      key="karnival-top-banner"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      className="w-full max-w-4xl perspective-[1000px]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        onClick={() => { triggerHaptic('light'); navigate('/karnival'); }}
        className="group relative cursor-pointer rounded-[2.2rem] overflow-hidden transition-shadow duration-500 hover:shadow-[0_20px_50px_rgba(139,92,246,0.4)] text-left ring-1 ring-violet-500/30"
        style={{
          background: 'linear-gradient(135deg, #0a0018 0%, #1e0840 40%, #0f0025 100%)',
          animation: 'karnival-glow-pulse 3s ease-in-out infinite',
          minHeight: 280,
          rotateX,
          rotateY,
          transformStyle: "preserve-3d"
        }}
      >
        <style>{`
          @keyframes shimmer-sweep {
            0% { transform: translateX(-150%) skewX(-20deg); }
            100% { transform: translateX(250%) skewX(-20deg); }
          }
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .chromatic-hover:hover {
            text-shadow: 2px 0 0 rgba(255,0,0,0.8), -2px 0 0 rgba(0,255,255,0.8);
          }
        `}</style>
        
        {/* Continuous Shimmer Sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50 pointer-events-none z-0" style={{ animation: 'shimmer-sweep 6s infinite ease-in-out' }} />

        <div className="absolute inset-0 opacity-[0.04] translate-z-[10px]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="absolute inset-0 pointer-events-none translate-z-[20px]" style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(139,92,246,0.35) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 pointer-events-none translate-z-[20px]" style={{ background: 'radial-gradient(ellipse at 20% 100%, rgba(219,39,119,0.15) 0%, transparent 50%)' }} />

        {/* Dynamic Glass Refraction Overlay */}
        <motion.div 
          className="absolute inset-0 pointer-events-none z-10 opacity-40 mix-blend-overlay"
          style={{
            background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.3) 25%, transparent 30%)',
            backgroundSize: '200% 200%',
            backgroundPosition: useTransform(x, val => `${(val + 0.5) * 100}% ${(val + 0.5) * 100}%`),
          }}
        />

        {/* Live Status Marquee with Strobe Effect */}
        <div className="absolute top-0 left-0 right-0 h-7 bg-violet-900/40 border-b border-violet-500/20 overflow-hidden z-20 flex items-center backdrop-blur-md">
          <div className="whitespace-nowrap flex items-center gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-violet-200" style={{ animation: 'marquee 20s linear infinite', width: '200%', textShadow: '0 0 8px rgba(192,132,252,0.8), 0 0 20px rgba(192,132,252,0.4)' }}>
            <span className="animate-pulse">🔥 {karnivalStatus?.name} SEDANG BERLANGSUNG!</span>
            <span>🎪 JUALAN MAKANAN DISKAUN 20% DI GERAI JPP!</span>
            <span className="animate-pulse">🏆 UNDIAN BOOTH TERBUKA SEKARANG</span>
            <span className="animate-pulse">🔥 {karnivalStatus?.name} SEDANG BERLANGSUNG!</span>
            <span>🎪 JUALAN MAKANAN DISKAUN 20% DI GERAI JPP!</span>
            <span className="animate-pulse">🏆 UNDIAN BOOTH TERBUKA SEKARANG</span>
          </div>
        </div>

        <div className="flex items-center justify-between px-7 pt-12 pb-0 relative z-30 translate-z-[50px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-violet-500" /></span>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-violet-300 drop-shadow-[0_0_5px_rgba(192,132,252,0.8)]">Sedang Berlangsung</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full backdrop-blur-md" style={{ background: 'rgba(139,92,246,0.2)', color: '#c084fc', border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 0 15px rgba(139,92,246,0.3)' }}>🎪 Karnival JPP</span>
        </div>

        <div className="px-7 pt-5 pb-8 text-center space-y-4 relative z-30 translate-z-[80px]">
          <motion.div 
            onClick={handleSecretClick}
            whileHover={{ scale: 1.15, rotate: 10, filter: 'drop-shadow(0 0 30px rgba(168,85,247,0.8))' }}
            whileTap={{ scale: 0.9 }}
            className="text-6xl sm:text-7xl cursor-help inline-block origin-center" 
            style={{ filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.6))' }}
          >
            🎪
          </motion.div>
          <div>
            <h2 className="text-4xl sm:text-6xl font-black tracking-tight chromatic-hover transition-all duration-300"
              style={{ backgroundImage: 'linear-gradient(90deg, #c084fc, #f472b6, #fbbf24, #a855f7, #c084fc)', backgroundSize: '300% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradient-shift 4s linear infinite' }}>
              {karnivalStatus?.name}
            </h2>
            {karnivalStatus?.tagline && <p className="text-sm text-white/50 font-medium mt-2 tracking-wide">{karnivalStatus.tagline}</p>}
          </div>
          {karnivalStatus?.endDate && !karnivalCountdown.expired && (
            <div className="inline-flex items-center gap-1 px-5 py-2.5 rounded-2xl" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <LucideIcons.Clock className="w-3.5 h-3.5 text-violet-400 mr-1" />
              <span className="text-xs text-white/60 font-medium">Undi ditutup dalam</span>
              {[{ v: karnivalCountdown.h, l: 'j' }, { v: karnivalCountdown.m, l: 'm' }, { v: karnivalCountdown.s, l: 's' }].map(({ v, l }) => (
                <span key={l} className="flex items-baseline gap-0.5"><span className="text-lg font-black text-white tabular-nums">{String(v).padStart(2, '0')}</span><span className="text-[10px] text-white/40 font-bold">{l}</span></span>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1 translate-z-[100px]">
            <motion.button onClick={e => { e.stopPropagation(); triggerHaptic('medium'); navigate('/karnival'); }}
              whileHover={{ 
                scale: 1.05, 
                //@ts-ignore
                x: x.get() * 20, 
                //@ts-ignore
                y: y.get() * 20 
              }}
              whileTap={{ scale: 0.95 }}
              className="group flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 8px 30px rgba(139,92,246,0.4)', color: 'white' }}>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] skew-x-[-20deg] group-hover:animate-[shimmer-sweep_1.5s_infinite]" />
              <LucideIcons.QrCode className="w-4 h-4 relative z-10" /> <span className="relative z-10">Undi Booth Sekarang</span>
            </motion.button>
            <motion.button onClick={e => { e.stopPropagation(); triggerHaptic('light'); navigate('/karnival/scoreboard'); }}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(139,92,246,0.2)' }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest relative"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#c084fc' }}>
              <LucideIcons.Trophy className="w-4 h-4" /> Papan Markah
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
