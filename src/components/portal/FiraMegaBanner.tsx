import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Globe, Sparkles, Car, Star, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { triggerHaptic } from '@/lib/utils';

export function FiraMegaBanner() {
  const [clickCount, setClickCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // 3D Parallax Setup
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);

  useEffect(() => {
    if (!isHovered) {
      const cx = animate(x, [-0.1, 0.1, -0.1], { duration: 7, ease: "easeInOut", repeat: Infinity });
      const cy = animate(y, [-0.08, 0.08, -0.08], { duration: 9, ease: "easeInOut", repeat: Infinity });
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

  const fireConfetti = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('medium');
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#ffd700', '#f59e0b', '#c0c0c0', '#ffffff', '#e2e8f0']
    });
  };

  const handleEasterEgg = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    if (nextCount >= 5) {
      triggerHaptic('heavy');
      confetti({
        particleCount: 250,
        spread: 140,
        origin: { y: 0.5 },
        colors: ['#ffd700', '#fbbf24', '#f59e0b', '#ffffff', '#94a3b8'],
        zIndex: 2000
      });
      setClickCount(0);
    }
  };

  const achievements = [
    { title: 'Autonomous Car Challenge (Race)', medal: '🥈 Perak', desc: 'Perlumbaan Kepantasan Otonomi', border: 'border-slate-400/30 bg-slate-900/60' },
    { title: 'Autonomous Car Challenge (Urban)', medal: '🥈 Perak', desc: 'Pemanduan Bandar Berhalangan', border: 'border-slate-400/30 bg-slate-900/60' },
    { title: 'Autonomous Car Challenge (Advanced Urban)', medal: '🥈 Perak', desc: 'Navigasi Kompleks Bandaraya', border: 'border-slate-400/30 bg-slate-900/60' },
    { title: 'Autonomous Car Challenge (Best United Technical)', medal: '🥇 Emas', desc: 'Cabaran Teknikal Terbaik Dunia', border: 'border-amber-400/60 bg-gradient-to-br from-amber-500/20 to-yellow-950/40 text-amber-300' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto perspective-[1000px] my-6">
      <motion.div
        style={{ rotateX, rotateY }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative rounded-[2.5rem] p-6 md:p-8 overflow-hidden border border-amber-500/40 shadow-[0_20px_60px_rgba(245,158,11,0.25)] text-left group transition-all duration-500"
      >
        {/* Background Gradient & Animated Sheen */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-950/70 via-[#070500] to-slate-950 pointer-events-none" />
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.15),transparent_60%)] pointer-events-none" />

        {/* Top Badges & Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md backdrop-blur-md">
              <Globe className="w-4 h-4 text-amber-400 animate-spin-slow" />
              Pencapaian Antarabangsa 2026
            </Badge>
            <Badge className="bg-slate-900/80 text-slate-200 border border-slate-700/80 px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md">
              <Flag className="w-3.5 h-3.5 text-red-500" />
              Ontario, Canada 🇨🇦🇲🇾
            </Badge>
          </div>

          <button
            onClick={fireConfetti}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer z-20"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            Sambut Lagi! 🎉
          </button>
        </div>

        {/* Main Banner Title & Hero Rank */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-8 relative z-10">
          <div className="lg:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-2 text-amber-400 font-extrabold text-sm tracking-wide">
              <Trophy className="w-5 h-5 text-yellow-400 animate-bounce" />
              31st FIRA Roboworld Cup & Summit 2026
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Kontijen <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">Malaysia Polycc (POLISAS)</span> Naib Juara Dunia! 🥈
            </h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Mewakili Negara Malaysia di pentas dunia Ontario, Canada dan bertanding menentang 6 pasukan robotik terbaik dunia dalam kategori <span className="font-bold text-amber-300">Autonomous Car Challenge (Pro)</span>.
            </p>
          </div>

          {/* Hero World Rank Card with Easter Egg */}
          <motion.div
            onClick={handleEasterEgg}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="lg:col-span-4 p-6 rounded-3xl bg-gradient-to-b from-amber-500/25 via-amber-950/40 to-black border-2 border-amber-400/50 text-center space-y-3 relative overflow-hidden shadow-2xl cursor-pointer group/egg"
          >
            <div className="absolute top-2 right-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
              {clickCount > 0 ? `${5 - clickCount}x klik lagi! 🚀` : 'Tekan Untuk Combo! 🔥'}
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-amber-300/90 flex items-center justify-center gap-1.5 pt-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
              Overall Rank in the World
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
            </div>
            <div className="text-3xl md:text-4xl font-black text-white flex items-center justify-center gap-2 drop-shadow-[0_4px_12px_rgba(245,158,11,0.5)]">
              <span>Kedua Dunia</span>
              <span className="text-3xl">🥈</span>
            </div>
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-950/80 border border-amber-500/40 text-xs font-bold text-slate-100 shadow-inner">
              <span className="text-amber-400 font-extrabold">🥇 1 Emas</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-200 font-extrabold">🥈 4 Perak</span>
            </div>
          </motion.div>
        </div>

        {/* 4 Category Breakdown Cards */}
        <div className="space-y-3 relative z-10">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Car className="w-4 h-4 text-amber-400" />
            Keputusan Rasmi Autonomous Car Challenge (Pro) — Total 4 Acara
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {achievements.map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4, scale: 1.02 }}
                className={`p-4 rounded-2xl border ${item.border} backdrop-blur-xl flex flex-col justify-between space-y-3 shadow-lg transition-all`}
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-100 leading-snug">
                    {item.title}
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">
                    {item.desc}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Keputusan</span>
                  <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-black/60 border border-white/15 shadow-sm">
                    {item.medal}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
