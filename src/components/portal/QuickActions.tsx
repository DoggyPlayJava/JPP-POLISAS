import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HeartHandshake, MessageSquarePlus, ArrowRight, Layers, QrCode, Crown, CalendarDays } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { PolymartServiceModal } from './PolymartServiceModal';

export interface QuickActionsProps {
  isSuperAdmin: boolean;
  isModuleEnabled: (id: string) => boolean;
  polyMartStats: any;
  hasKebajikanAccess: boolean;
  kbStats: any;
  isJPPMode: boolean;
  karnivalActive?: boolean;
  supsasActive?: boolean;
}

// Custom hook for Holographic Tilt Effect
function useHolographicTilt() {
  const ref = useRef<HTMLButtonElement | HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = x;
  const mouseYSpring = y;

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);
  const shineOpacity = useTransform(mouseYSpring, [-0.5, 0.5], [0.1, 0.5]);
  const shineY = useTransform(mouseYSpring, [-0.5, 0.5], ["-100%", "200%"]);
  const shineX = useTransform(mouseXSpring, [-0.5, 0.5], ["-100%", "200%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { ref, rotateX, rotateY, shineOpacity, shineX, shineY, handleMouseMove, handleMouseLeave };
}

export function QuickActions({
  isSuperAdmin,
  isModuleEnabled,
  polyMartStats,
  hasKebajikanAccess,
  kbStats,
  isJPPMode,
  karnivalActive,
  supsasActive
}: QuickActionsProps) {
  const navigate = useNavigate();
  const [showPolymartModal, setShowPolymartModal] = useState(false);

  // Holographic hooks for all 4 boxes
  const polyServicesTilt = useHolographicTilt();
  const kebajikanTilt = useHolographicTilt();
  const qrTilt = useHolographicTilt();
  const takwimTilt = useHolographicTilt();
  const jppTilt = useHolographicTilt();

  // Helper to determine active skin classes
  const getSkinClasses = (baseClasses: string, karnivalColor: string, supsasGradient: string, index: number) => {
    if (karnivalActive) {
      return cn(
        "bg-[#0a0a0a] border-2",
        karnivalColor === 'pink' && "border-pink-500/50 hover:shadow-[0_0_30px_rgba(236,72,153,0.4)]",
        karnivalColor === 'cyan' && "border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]",
        karnivalColor === 'purple' && "border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]",
        karnivalColor === 'amber' && "border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]"
      );
    }
    if (supsasActive) {
      // Metallic finishes based on row/index
      const isGold = index === 1;
      const isSilver = index === 2;
      return cn(
        "border shadow-2xl relative overflow-hidden",
        isGold ? "border-yellow-400/50 shadow-[0_10px_30px_rgba(234,179,8,0.3)]" :
        isSilver ? "border-slate-300/50 shadow-[0_10px_30px_rgba(148,163,184,0.3)]" :
        "border-orange-400/50 shadow-[0_10px_30px_rgba(249,115,22,0.3)]"
      );
    }
    return baseClasses;
  };

  const getSupsasMetallicBackground = (index: number) => {
    if (!supsasActive) return null;
    const isGold = index === 1;
    const isSilver = index === 2;
    const gradient = isGold 
      ? "linear-gradient(135deg, #FFF3CD 0%, #EAB308 30%, #A16207 60%, #EAB308 80%, #FEF08A 100%)"
      : isSilver
      ? "linear-gradient(135deg, #F8FAFC 0%, #94A3B8 30%, #475569 60%, #94A3B8 80%, #F1F5F9 100%)"
      : "linear-gradient(135deg, #FFEDD5 0%, #F97316 30%, #9A3412 60%, #F97316 80%, #FDBA74 100%)";
    return (
      <div className="absolute inset-0 opacity-20 mix-blend-color-burn dark:mix-blend-color-dodge z-0 pointer-events-none" style={{ background: gradient }} />
    );
  };

  const renderHologramGlare = (tiltHook: any, karnivalColor: string) => {
    if (karnivalActive) {
      return (
        <motion.div
          className="absolute inset-0 z-20 pointer-events-none mix-blend-color-dodge rounded-[inherit]"
          style={{
            background: `radial-gradient(circle at center, ${
              karnivalColor === 'pink' ? 'rgba(236,72,153,0.8)' : 
              karnivalColor === 'cyan' ? 'rgba(6,182,212,0.8)' : 
              karnivalColor === 'purple' ? 'rgba(168,85,247,0.8)' : 
              'rgba(245,158,11,0.8)'
            } 0%, transparent 50%)`,
            opacity: tiltHook.shineOpacity,
            x: tiltHook.shineX,
            y: tiltHook.shineY,
          }}
        />
      );
    }
    if (supsasActive) {
      return (
        <motion.div
          className="absolute inset-0 z-20 pointer-events-none rounded-[inherit]"
          style={{
            background: `linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.8) 25%, transparent 30%)`,
            backgroundSize: '200% 200%',
            opacity: tiltHook.shineOpacity,
            x: tiltHook.shineX,
            mixBlendMode: 'overlay'
          }}
        />
      );
    }
    return null;
  };

  const wrapWithTilt = (tiltHook: any, children: React.ReactNode, isButton = true, onClick?: () => void, className?: string, disabled?: boolean) => {
    const Component = isButton ? motion.button : motion.div;
    return (
      <Component
        ref={tiltHook.ref}
        onMouseMove={tiltHook.handleMouseMove}
        onMouseLeave={tiltHook.handleMouseLeave}
        onClick={onClick}
        disabled={disabled}
        style={{ rotateX: (karnivalActive || supsasActive) ? tiltHook.rotateX : 0, rotateY: (karnivalActive || supsasActive) ? tiltHook.rotateY : 0, transformStyle: "preserve-3d" }}
        className={className}
      >
        {children}
      </Component>
    );
  };

  return (
    <>
      <PolymartServiceModal isOpen={showPolymartModal} onClose={() => setShowPolymartModal(false)} />
      <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto w-full relative z-10"
      style={{ perspective: 1000 }}
    >
      {/* ── BENTO 1: PolyServices (Large / Wide) ── */}
      {isModuleEnabled('keusahawanan') || isSuperAdmin ? (
        wrapWithTilt(polyServicesTilt, (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/15 to-amber-400/0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out z-0" />
            {getSupsasMetallicBackground(1)}
            {renderHologramGlare(polyServicesTilt, 'amber')}
            
            <div className="absolute -top-4 -right-4 opacity-10 group-hover:opacity-[0.15] transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 pointer-events-none z-0">
              <Layers className={cn("w-40 h-40", karnivalActive ? "text-amber-500" : supsasActive ? "text-yellow-600" : "text-amber-500")} />
            </div>

            <div className="relative z-10" style={{ transform: (karnivalActive || supsasActive) ? "translateZ(30px)" : "none" }}>
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner mb-4 group-hover:scale-110 transition-transform", karnivalActive ? "bg-amber-500/20" : supsasActive ? "bg-yellow-500/30" : "bg-amber-500/20")}>
                <Layers className={cn("w-7 h-7", karnivalActive ? "text-amber-400" : supsasActive ? "text-yellow-900 dark:text-yellow-100" : "text-amber-600 dark:text-amber-400")} />
              </div>
              
              <h3 className={cn("text-xl md:text-2xl font-black leading-tight tracking-tight", karnivalActive ? "text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" : supsasActive ? "text-yellow-900 dark:text-yellow-400" : "text-slate-800 dark:text-white")}>PolyServices</h3>
              <span className={cn("inline-block mt-2 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest", karnivalActive ? "bg-amber-500/20 text-amber-400" : supsasActive ? "bg-yellow-500/30 text-yellow-900 dark:text-yellow-200" : "bg-amber-500/20 text-amber-600 dark:text-amber-400")}>BETA</span>
              <p className={cn("text-xs mt-2 max-w-[200px] leading-relaxed", karnivalActive ? "text-white/60" : supsasActive ? "text-yellow-900/80 dark:text-yellow-100/80" : "text-slate-500 dark:text-slate-400")}>
                Pusat Ekosistem Pintar Pelajar. Akses pelbagai perkhidmatan JPP di sini.
              </p>
            </div>

            <div className={cn("mt-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest relative z-10", karnivalActive ? "text-amber-400" : supsasActive ? "text-yellow-900 dark:text-yellow-400" : "text-amber-600 dark:text-amber-400")} style={{ transform: (karnivalActive || supsasActive) ? "translateZ(40px)" : "none" }}>
              <span>Buka Servis</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </>
        ), true, () => {
          if (!isModuleEnabled('keusahawanan') && !isSuperAdmin) {
            toast('PolyServices tidak aktif ketika ini!', { icon: '🚧' });
            return;
          }
          setShowPolymartModal(true);
        }, cn(
          "col-span-2 md:col-span-2 row-span-2 group relative rounded-[2rem] text-left transition-all duration-500 p-6 flex flex-col justify-between",
          (!isModuleEnabled('keusahawanan') && !isSuperAdmin) ? "opacity-60 grayscale-[0.8] cursor-not-allowed" : "cursor-pointer hover:scale-[1.02]",
          getSkinClasses("bg-gradient-to-br from-amber-500/10 to-orange-500/5 dark:from-amber-500/15 dark:to-orange-500/5 backdrop-blur-xl border border-amber-500/20 dark:border-amber-500/25 shadow-[0_20px_50px_-12px_rgba(245,158,11,0.25)] dark:shadow-[0_20px_50px_-12px_rgba(245,158,11,0.15)] hover:border-amber-500/40", 'amber', 'gold', 1)
        ))
      ) : null}

      {/* ── BENTO 2: Kebajikan (Wide on Desktop) ── */}
      {hasKebajikanAccess ? (
        wrapWithTilt(kebajikanTilt, (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-teal-500/0 opacity-50 group-hover:opacity-100 transition-opacity z-0" />
            {getSupsasMetallicBackground(2)}
            {renderHologramGlare(kebajikanTilt, 'cyan')}
            
            <div className="p-5 sm:p-6 relative z-10 flex flex-row items-center gap-4 flex-1 w-full" style={{ transform: (karnivalActive || supsasActive) ? "translateZ(30px)" : "none" }}>
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform", karnivalActive ? "bg-cyan-500/20 border border-cyan-500/30" : supsasActive ? "bg-slate-400/30 border border-slate-400/50" : "bg-teal-500/15 border border-teal-500/30")}>
                <HeartHandshake className={cn("w-7 h-7", karnivalActive ? "text-cyan-400" : supsasActive ? "text-slate-800 dark:text-slate-200" : "text-teal-400")} />
              </div>
              
              <div className="flex flex-col flex-1 min-w-0">
                <h3 className={cn("text-lg font-black tracking-tight", karnivalActive ? "text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" : supsasActive ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-white")}>Live Stats</h3>
                <span className={cn("text-[11px] font-medium tracking-wide mt-0.5", karnivalActive ? "text-cyan-400/70" : "text-slate-500 dark:text-slate-400")}>
                  E-Kebajikan
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-right mr-2">
                  <div className="flex flex-col items-center">
                    <p className={cn("text-lg font-black leading-none", karnivalActive ? "text-cyan-400" : supsasActive ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-white")}>{kbStats ? kbStats.open : '—'}</p>
                    <p className={cn("text-[9px] font-bold mt-1 uppercase tracking-widest", karnivalActive ? "text-cyan-500" : "text-slate-500")}>Aktif</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className={cn("text-lg font-black leading-none", karnivalActive ? "text-emerald-400" : "text-emerald-500 dark:text-emerald-400")}>{kbStats ? kbStats.resolved : '—'}</p>
                    <p className={cn("text-[9px] font-bold mt-1 uppercase tracking-widest", karnivalActive ? "text-cyan-500" : "text-slate-500")}>Selesai</p>
                  </div>
              </div>
            </div>
          </>
        ), false, () => {
          if (!isModuleEnabled('kebajikan') && !isSuperAdmin) {
            toast('Modul E-Kebajikan sedang dikemas kini!', { icon: '🚧' });
            return;
          }
          navigate('/kebajikan');
        }, cn(
          "col-span-2 md:col-span-2 rounded-[2rem] overflow-hidden transition-all duration-500 relative group flex flex-row items-center cursor-pointer hover:scale-[1.02]",
          getSkinClasses("border border-teal-500/15 bg-white dark:bg-slate-900/40 backdrop-blur-xl shadow-2xl hover:shadow-[0_20px_50px_-12px_rgba(45,212,191,0.25)]", 'cyan', 'silver', 2)
        ))
      ) : (
        wrapWithTilt(kebajikanTilt, (
          <>
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity z-0">
              <MessageSquarePlus className={cn("w-24 h-24", karnivalActive ? "text-cyan-500" : supsasActive ? "text-slate-500" : "text-teal-500")} />
            </div>
            {getSupsasMetallicBackground(2)}
            {renderHologramGlare(kebajikanTilt, 'cyan')}
            
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden group-hover:scale-110 transition-transform z-10" style={{ transform: (karnivalActive || supsasActive) ? "translateZ(30px)" : "none" }}>
              <div className={cn("absolute inset-0", karnivalActive ? "bg-cyan-500/20" : supsasActive ? "bg-slate-500/20" : "bg-teal-500/10 dark:bg-teal-500/20")} />
              <MessageSquarePlus className={cn("w-7 h-7 relative z-10", karnivalActive ? "text-cyan-400" : supsasActive ? "text-slate-800 dark:text-slate-200" : "text-teal-600 dark:text-teal-400")} />
            </div>
            
            <div className="flex flex-col flex-1 min-w-0 z-10" style={{ transform: (karnivalActive || supsasActive) ? "translateZ(20px)" : "none" }}>
              <h3 className={cn("text-lg font-black tracking-tight", karnivalActive ? "text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" : supsasActive ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-white")}>Suarakan Aduan</h3>
              <span className={cn("text-[11px] font-medium tracking-wide mt-0.5", karnivalActive ? "text-cyan-400/70" : "text-slate-500 dark:text-slate-400")}>
                Ke Exco Kebajikan
              </span>
            </div>

            <div className={cn("hidden sm:flex w-10 h-10 rounded-full items-center justify-center flex-shrink-0 z-10", karnivalActive ? "bg-cyan-500/20" : supsasActive ? "bg-slate-500/20" : "bg-teal-500/10 dark:bg-teal-500/15")} style={{ transform: (karnivalActive || supsasActive) ? "translateZ(40px)" : "none" }}>
              <ArrowRight className={cn("w-4 h-4 group-hover:translate-x-1 transition-transform", karnivalActive ? "text-cyan-400" : supsasActive ? "text-slate-800 dark:text-slate-200" : "text-teal-600 dark:text-teal-400")} />
            </div>
          </>
        ), true, () => {
          if (!isModuleEnabled('kebajikan') && !isSuperAdmin) {
            toast('Modul E-Kebajikan sedang dikemas kini!', { icon: '🚧' });
            return;
          }
          navigate('/kebajikan/buat-aduan');
        }, cn(
          "col-span-2 md:col-span-2 group relative rounded-[2rem] overflow-hidden text-left transition-all duration-500 flex flex-row items-center gap-4 p-5 sm:p-6",
          (!isModuleEnabled('kebajikan') && !isSuperAdmin) ? "opacity-60 grayscale-[0.8] cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
          getSkinClasses("border border-teal-500/20 bg-white dark:bg-slate-900/40 backdrop-blur-xl shadow-[0_20px_50px_-12px_rgba(45,212,191,0.2)] dark:shadow-[0_20px_50px_-12px_rgba(45,212,191,0.1)] hover:bg-slate-50 dark:hover:bg-slate-900/60", 'cyan', 'silver', 2)
        ))
      )}

      {/* ── BENTO 3: QR Merit (Small Square) ── */}
      {wrapWithTilt(qrTilt, (
        <>
          <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 z-0", karnivalActive ? "bg-pink-500/30" : "bg-emerald-500/10 dark:bg-emerald-500/20")} />
          {getSupsasMetallicBackground(3)}
          {renderHologramGlare(qrTilt, 'pink')}

          <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 shrink-0 mb-4", karnivalActive ? "bg-pink-500/20 border-pink-500/30 text-pink-400" : supsasActive ? "bg-orange-500/20 border-orange-500/30 text-orange-800 dark:text-orange-300" : "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 text-emerald-600 dark:text-emerald-400")} style={{ transform: (karnivalActive || supsasActive) ? "translateZ(30px)" : "none" }}>
            <QrCode className="w-6 h-6" />
          </div>
          <div className="relative z-10 flex-1" style={{ transform: (karnivalActive || supsasActive) ? "translateZ(20px)" : "none" }}>
            <h3 className={cn("text-base font-black leading-tight tracking-tight", karnivalActive ? "text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]" : supsasActive ? "text-orange-900 dark:text-white" : "text-slate-800 dark:text-white")}>Scan QR</h3>
            <p className={cn("text-[10px] mt-1 tracking-wide", karnivalActive ? "text-pink-400/70" : "text-slate-500 dark:text-slate-400")}>Kumpul Merit</p>
          </div>
        </>
      ), true, () => {
        if (!isModuleEnabled('akademik') && !isSuperAdmin) {
          toast('Modul E-Akademik sedang dikemas kini!', { icon: '🚧' });
          return;
        }
        navigate('/akademik/qr');
      }, cn(
        "col-span-1 md:col-span-1 group relative p-5 sm:p-6 rounded-[2rem] flex flex-col justify-between text-left overflow-hidden transition-all duration-500",
        (!isModuleEnabled('akademik') && !isSuperAdmin) ? "opacity-60 grayscale-[0.8] cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
        getSkinClasses("bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-sm hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.25)] dark:hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.15)]", 'pink', 'bronze', 3)
      ))}

      {/* ── BENTO 4: Takwim Rasmi (For Students) ── */}
      {!isJPPMode && (
        wrapWithTilt(takwimTilt, (
          <>
            <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 z-0", karnivalActive ? "bg-purple-500/30" : "bg-sky-500/10 dark:bg-sky-500/20")} />
            {getSupsasMetallicBackground(4)}
            {renderHologramGlare(takwimTilt, 'purple')}

            <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10 shrink-0", karnivalActive ? "bg-purple-500/20 border-purple-500/30 text-purple-400" : supsasActive ? "bg-orange-500/20 border-orange-500/30 text-orange-800 dark:text-orange-300" : "bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/20 text-sky-600 dark:text-sky-400")} style={{ transform: (karnivalActive || supsasActive) ? "translateZ(30px)" : "none" }}>
              <CalendarDays className="w-6 h-6" />
            </div>
            <div className="relative z-10" style={{ transform: (karnivalActive || supsasActive) ? "translateZ(20px)" : "none" }}>
              <h3 className={cn("text-base font-black leading-tight tracking-tight", karnivalActive ? "text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" : supsasActive ? "text-orange-900 dark:text-white" : "text-slate-800 dark:text-white")}>Takwim</h3>
              <p className={cn("text-[10px] mt-1 tracking-wide", karnivalActive ? "text-purple-400/70" : "text-slate-500 dark:text-slate-400")}>Kalendar Rasmi</p>
            </div>
          </>
        ), true, () => navigate('/akademik/takwim'), cn(
          "col-span-1 md:col-span-1 group relative flex flex-col justify-between p-5 sm:p-6 rounded-[2rem] text-left overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
          getSkinClasses("bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-sm hover:shadow-[0_20px_50px_-12px_rgba(14,165,233,0.25)] dark:hover:shadow-[0_20px_50px_-12px_rgba(14,165,233,0.15)]", 'purple', 'bronze', 4)
        ))
      )}

      {/* ── BENTO 4: JPP HQ (For JPP/Admins) ── */}
      {isJPPMode && (
        wrapWithTilt(jppTilt, (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-indigo-900/40 dark:from-indigo-500/0 dark:to-indigo-500/10 z-0" />
            {getSupsasMetallicBackground(4)}
            {renderHologramGlare(jppTilt, 'purple')}

            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10 shrink-0", karnivalActive ? "bg-purple-500/30 text-purple-200" : supsasActive ? "bg-orange-500/30 text-orange-200" : "bg-white/20 dark:bg-indigo-500/30 text-white dark:text-indigo-300")} style={{ transform: (karnivalActive || supsasActive) ? "translateZ(30px)" : "none" }}>
              <Crown className="w-6 h-6" />
            </div>
            <div className="relative z-10" style={{ transform: (karnivalActive || supsasActive) ? "translateZ(20px)" : "none" }}>
              <h3 className={cn("text-base font-black leading-tight", karnivalActive ? "text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" : "text-white dark:text-indigo-100")}>JPP HQ</h3>
              <p className={cn("text-[10px] mt-1 tracking-wide", karnivalActive ? "text-purple-200/80" : "text-indigo-200 dark:text-indigo-300/70")}>Portal Rasmi</p>
            </div>
          </>
        ), true, () => navigate('/jpp'), cn(
          "col-span-1 md:col-span-1 group relative flex flex-col justify-between p-5 sm:p-6 rounded-[2rem] text-left overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
          getSkinClasses("bg-indigo-600 dark:bg-indigo-500/20 text-white border border-indigo-500/30 dark:border-indigo-500/30 shadow-lg hover:shadow-[0_20px_50px_-12px_rgba(79,70,229,0.4)]", 'purple', 'bronze', 4)
        ))
      )}
    </motion.div>
    </>
  );
}
