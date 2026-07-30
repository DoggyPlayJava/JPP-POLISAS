import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Globe, Sparkles, ChevronDown, ChevronUp, Flag, X, Award, Star } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';

export interface FiraMegaBannerProps {
  onClose?: () => void;
}

export function FiraMegaBanner({ onClose }: FiraMegaBannerProps) {
  const [clickCount, setClickCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('jpp_fira_banner_dismissed') === 'true';
  });

  // Parallax Setup
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["6deg", "-6deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-6deg", "6deg"]);

  useEffect(() => {
    if (!isHovered) {
      const cx = animate(x, [-0.1, 0.1, -0.1], { duration: 8, ease: "easeInOut", repeat: Infinity });
      const cy = animate(y, [-0.08, 0.08, -0.08], { duration: 10, ease: "easeInOut", repeat: Infinity });
      return () => { cx.stop(); cy.stop(); };
    }
  }, [isHovered, x, y]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    sessionStorage.setItem('jpp_fira_banner_dismissed', 'true');
    setIsDismissed(true);
    if (onClose) onClose();
  };

  const fireConfetti = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('medium');
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#ffd700', '#f59e0b', '#c0c0c0', '#ffffff']
    });
  };

  const handleSecretClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    const next = clickCount + 1;
    setClickCount(next);

    if (next >= 5) {
      triggerHaptic('heavy');
      confetti({
        particleCount: 250,
        spread: 140,
        origin: { y: 0.5 },
        colors: ['#ffd700', '#fbbf24', '#f59e0b', '#ffffff', '#e2e8f0'],
        zIndex: 2000
      });
      setClickCount(0);
    }
  };

  if (isDismissed) return null;

  const achievements = [
    { title: 'Autonomous Car Challenge (Race)', medal: '🥈 Perak', cat: 'Race' },
    { title: 'Autonomous Car Challenge (Urban)', medal: '🥈 Perak', cat: 'Urban' },
    { title: 'Autonomous Car Challenge (Advanced Urban)', medal: '🥈 Perak', cat: 'Advanced Urban' },
    { title: 'Autonomous Car Challenge (Best United Technical)', medal: '🥇 Emas', cat: 'Best Technical' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      className="w-full max-w-4xl perspective-[1000px] my-6 mx-auto"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          background: 'linear-gradient(135deg, #090600 0%, #1a1200 45%, #050300 100%)',
          minHeight: 280
        }}
        className="relative rounded-[2.5rem] overflow-hidden border border-amber-500/30 shadow-[0_25px_60px_rgba(245,158,11,0.22)] text-left group transition-all duration-500"
      >
        <style>{`
          @keyframes fira-shimmer-sweep {
            0% { transform: translateX(-150%) skewX(-20deg); }
            15%, 100% { transform: translateX(250%) skewX(-20deg); }
          }
          @keyframes fira-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>

        {/* Shimmer Sweep Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent opacity-60 pointer-events-none z-0" style={{ animation: 'fira-shimmer-sweep 7s infinite ease-in-out', animationDelay: '1s' }} />

        {/* Dot Matrix Texture & Glows */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(245,158,11,0.25) 0%, transparent 65%)' }} />

        {/* Top Marquee Ticker */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-amber-950/60 border-b border-amber-500/20 overflow-hidden z-20 flex items-center backdrop-blur-md">
          <div className="whitespace-nowrap flex items-center gap-12 text-[10px] font-black uppercase tracking-[0.25em] text-amber-200" style={{ animation: 'fira-marquee 22s linear infinite', width: '200%' }}>
            <span>🏆 31ST FIRA ROBOWORLD CUP & SUMMIT 2026 • ONTARIO, CANADA 🇨🇦🇲🇾</span>
            <span>🥈 KEDUA DUNIA (SILVER RANK #2) — MALAYSIA POLYCC (POLISAS)</span>
            <span>🥇 1 EMAS 🥈 4 PERAK • AUTONOMOUS CAR CHALLENGE (PRO)</span>
            <span>🏆 31ST FIRA ROBOWORLD CUP & SUMMIT 2026 • ONTARIO, CANADA 🇨🇦🇲🇾</span>
            <span>🥈 KEDUA DUNIA (SILVER RANK #2) — MALAYSIA POLYCC (POLISAS)</span>
            <span>🥇 1 EMAS 🥈 4 PERAK • AUTONOMOUS CAR CHALLENGE (PRO)</span>
          </div>
        </div>

        {/* Top Status Bar & Actions */}
        <div className="flex items-center justify-between px-6 md:px-8 pt-12 pb-2 relative z-30">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">Pencapaian Antarabangsa</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fireConfetti}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase tracking-wider hover:bg-amber-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              Sambut! 🎉
            </button>
            <button
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full bg-slate-900/80 hover:bg-red-500/20 border border-slate-700/80 text-slate-400 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer"
              title="Tutup Banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Centerpiece Hero Section */}
        <div className="px-6 md:px-8 pt-2 pb-6 text-center space-y-4 relative z-30">
          <div
            onClick={handleSecretClick}
            className="text-5xl sm:text-6xl cursor-pointer hover:scale-110 active:scale-95 transition-transform inline-block"
            style={{ filter: 'drop-shadow(0 0 25px rgba(245,158,11,0.6))' }}
            title={clickCount > 0 ? `${5 - clickCount}x lagi!` : 'Tekan 5x untuk Kejutan!'}
          >
            🏆
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <span>31st FIRA Roboworld Cup & Summit 2026</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">Ontario, Canada 🇨🇦🇲🇾</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
              Kontijen <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">Malaysia Polycc (POLISAS)</span>
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto font-medium">
              Naib Juara Dunia bagi Kategori <span className="text-amber-300 font-bold">Autonomous Car Challenge (Pro)</span> bertanding menentang 6 pasukan robotik terbaik dunia.
            </p>
          </div>

          {/* Sleek Medal Stats Bar */}
          <div className="inline-flex items-center gap-4 px-6 py-2.5 rounded-full bg-black/60 border border-amber-500/30 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Kedua Dunia (Silver) 🥈</span>
            </div>
            <div className="w-[1px] h-4 bg-amber-500/30" />
            <div className="flex items-center gap-3 text-xs font-bold text-slate-200">
              <span className="text-amber-400 font-black">🥇 1 Emas</span>
              <span className="text-slate-300 font-black">🥈 4 Perak</span>
            </div>
          </div>

          {/* Minimalist Sub-event Tag Bar & Expand Button */}
          <div className="pt-2 flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {achievements.map((a, i) => (
                <span key={i} className="px-3 py-1 rounded-lg bg-amber-950/40 border border-amber-500/20 text-[11px] font-semibold text-slate-300 backdrop-blur-sm">
                  {a.cat}: <strong className="text-amber-300">{a.medal}</strong>
                </span>
              ))}
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400/80 hover:text-amber-300 transition-colors pt-1 cursor-pointer"
            >
              <span>{showDetails ? 'Sembunyi Perincian' : 'Lihat Perincian Keputusan Rasmi'}</span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Expandable Details Drawer */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden pt-4 text-left"
              >
                <div className="p-4 rounded-2xl bg-black/70 border border-amber-500/20 space-y-2 text-xs text-slate-300">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    Keputusan Rasmi Autonomous Car Challenge (Pro):
                  </div>
                  <ul className="space-y-1.5 pl-2">
                    <li className="flex items-center justify-between border-b border-white/5 pb-1">
                      <span>🥈 1) Autonomous Car Challenge (Race)</span>
                      <span className="font-bold text-slate-200">Pingat Perak</span>
                    </li>
                    <li className="flex items-center justify-between border-b border-white/5 pb-1">
                      <span>🥈 2) Autonomous Car Challenge (Urban)</span>
                      <span className="font-bold text-slate-200">Pingat Perak</span>
                    </li>
                    <li className="flex items-center justify-between border-b border-white/5 pb-1">
                      <span>🥈 3) Autonomous Car Challenge (Advanced Urban)</span>
                      <span className="font-bold text-slate-200">Pingat Perak</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>🥇 4) Autonomous Car Challenge (Best United Technical Challenge)</span>
                      <span className="font-bold text-amber-300">Pingat Emas</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
