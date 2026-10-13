import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, Bell, User, Plus, X, Search, Sparkles, QrCode, 
  Ticket, Home, Megaphone, CalendarRange, Flag, Layers,
  Store, ShieldAlert, Building2, HeartHandshake, Landmark, Lightbulb, Crown,
  Bike, Map
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useDragControls } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useAcademicSession } from '@/contexts/AcademicSessionContext';
import { getSemesterInfo } from '@/types';
import { PolymartServiceModal } from '../portal/PolymartServiceModal';

export interface NavLinkData {
  icon: any;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  badge?: number;
}

interface BottomNavProps {
  onOpenSidebar?: () => void;
  onOpenSearch?: () => void;
  customLinks?: {
    left: NavLinkData[];
    right: NavLinkData[];
  };
  forceShowDesktop?: boolean;
}

export function BottomNav({ onOpenSidebar, onOpenSearch, customLinks, forceShowDesktop = false }: BottomNavProps) {
  const [mounted, setMounted] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const { isSuperAdmin, isJppMember, profile } = useAuth();
  const { intake1Month, intake2Month } = useAcademicSession();
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const [showPolymartModal, setShowPolymartModal] = useState(false);
  // Drag handle-only swipe-to-dismiss (iOS: whole-menu drag was swallowed by native scroll)
  const quickActionsDragControls = useDragControls();

  useEffect(() => {
    setMounted(true);
  }, []);

  // -- Auto-hide on Scroll Logic via Framer Motion --
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (currentScrollY) => {
    if (!navRef.current || isActionsOpen) return;
    const prevScrollY = scrollY.getPrevious() ?? 0;

    if (currentScrollY > prevScrollY && currentScrollY > 50) {
      navRef.current.classList.add('opacity-75', 'scale-[0.85]', 'translate-y-4');
    } else if (prevScrollY - currentScrollY > 15 || currentScrollY <= 50) {
      navRef.current.classList.remove('opacity-75', 'scale-[0.85]', 'translate-y-4');
    }
  });

  useEffect(() => {
    const hideTooltip = localStorage.getItem('hide_bottomnav_tooltip');
    if (!hideTooltip) {
      const timer = setTimeout(() => setShowTooltip(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismissTooltip = () => {
    localStorage.setItem('hide_bottomnav_tooltip', 'true');
    setShowTooltip(false);
  };

  const handleFabClick = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    if (showTooltip) handleDismissTooltip();
    setIsActionsOpen(!isActionsOpen);
  };

  const semInfo = profile?.intake_year
    ? getSemesterInfo(profile.intake_year, profile.intake_period as 1 | 2, profile.programme_code === 'FTV', intake1Month, intake2Month, profile.semester_override)
    : { semester: 0 };
  const isKlkEligible = semInfo.semester >= 2;

  const handleQuickAction = (path: string | (() => void)) => {
    setIsActionsOpen(false);
    if (typeof path === 'string') {
      navigate(path);
    } else {
      path();
    }
  };

  // Tutup bila scroll / navigasi
  React.useEffect(() => {
    setIsActionsOpen(false);
  }, [location.pathname]);

  const leftLinks = customLinks?.left || [
    { icon: Menu, label: 'Menu', onClick: onOpenSidebar || (() => {}) },
    { icon: Home, label: 'Utama', onClick: () => navigate('/portal'), isActive: location.pathname === '/portal' }
  ];

  const rightLinks = customLinks?.right || [
    { icon: QrCode, label: 'QR Merit', onClick: () => navigate('/akademik/qr'), isActive: location.pathname === '/akademik/qr' },
    { icon: User, label: 'Profil', onClick: () => navigate('/tetapan'), isActive: location.pathname === '/tetapan' }
  ];

  // -- Unified Institutional Theme Logic --
  const getTheme = () => {
    return {
      color: 'text-[#2E3A2F] dark:text-[#84A98C]',
      bg: 'bg-[#2E3A2F] dark:bg-[#6B7F5B]',
      fabBg: 'bg-gradient-to-tr from-[#2E3A2F] to-[#6B7F5B]',
      pillBg: 'bg-[#6B7F5B]/10 dark:bg-[#6B7F5B]/20',
    };
  };

  const theme = getTheme();

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <>
      <PolymartServiceModal isOpen={showPolymartModal} onClose={() => setShowPolymartModal(false)} />
      {/* 1. Backdrop & Quick Actions Menu */}
      <AnimatePresence>
        {isActionsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => setIsActionsOpen(false)}
              className={cn("fixed inset-0 bg-black/75 z-[110]", !forceShowDesktop && "md:hidden")}
            />
            <motion.div
              drag="y"
              dragListener={false}
              dragControls={quickActionsDragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.4}
              onDragEnd={(e, info) => {
                if (info.offset.y > 50 || info.velocity.y > 200) {
                  setIsActionsOpen(false);
                }
              }}
              initial={{ opacity: 0, y: 100, scale: 0.85 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1, 
                transition: { type: "spring", stiffness: 350, damping: 22 }
              }}
              exit={{ 
                opacity: 0, 
                y: 100, 
                scale: 0.85,
                transition: { duration: 0.2 }
              }}
              className={cn("quick-actions-menu touch-none fixed bottom-28 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[calc(100%-2rem)] md:max-w-[360px] z-[111] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-2xl", !forceShowDesktop && "md:hidden")}
            >
              {/* Drag Handle Indicator */}
              <div
                onPointerDown={(e) => quickActionsDragControls.start(e)}
                className="w-10 h-1 bg-slate-300 dark:bg-white/20 rounded-full mx-auto mb-4 cursor-grab active:cursor-grabbing"
              />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/40 mb-4 text-center">Tindakan Pantas</h3>
              <motion.div 
                className="grid grid-cols-4 gap-y-6 gap-x-2"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={{
                  hidden: {},
                  visible: {
                    transition: { staggerChildren: 0.05, delayChildren: 0.05 }
                  }
                }}
              >
                <QuickActionButton icon={Layers} label="PolyServices" color="bg-amber-500" onClick={() => { setIsActionsOpen(false); setShowPolymartModal(true); }} />
                <QuickActionButton icon={CalendarRange} label="Takwim" color="bg-blue-500" onClick={() => handleQuickAction('/akademik/takwim')} />
                <QuickActionButton icon={HeartHandshake} label="Aduan" color="bg-teal-500" onClick={() => handleQuickAction('/kebajikan/buat-aduan')} />
                <QuickActionButton icon={Landmark} label="Kelab" color="bg-red-400" onClick={() => handleQuickAction('/kelab')} />
                
                <QuickActionButton icon={Lightbulb} label="Bisnes" color="bg-green-400" onClick={() => handleQuickAction('/keusahawanan/dashboard')} />
                {isKlkEligible && (
                  <QuickActionButton icon={Building2} label="Kediaman" color="bg-orange-500" onClick={() => handleQuickAction('/tetapan?tab=kediaman')} />
                )}
                
                {(isSuperAdmin || isJppMember) && (
                  <QuickActionButton icon={Crown} label="JPP HQ" color="bg-indigo-500" onClick={() => handleQuickAction('/jpp')} />
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 2. Floating Bottom Nav Dock */}
      <div 
        ref={navRef}
        id="bottom-nav-dock"
        onClick={(e) => {
          e.nativeEvent.stopImmediatePropagation();
          if (navRef.current && navRef.current.classList.contains('scale-[0.85]')) {
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
            navRef.current.classList.remove('opacity-75', 'scale-[0.85]', 'translate-y-4');
          }
        }}
        onTouchStart={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
        onTouchMove={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
        onPointerDown={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
        onPointerMove={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
        onPointerUp={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
        className={cn(
          "tour-bottom-nav fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[360px] z-[120] transform-gpu transition-all duration-300 ease-out cursor-pointer",
          !forceShowDesktop && "md:hidden"
        )}
      >
        <div className="bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-white/10 shadow-lg rounded-full px-2 py-2 flex items-center justify-between relative">
          
          {/* Left Buttons */}
          <div className="flex items-center justify-around flex-1 pr-8">
            {leftLinks.map((link, i) => (
              <NavIconButton key={i} {...link} theme={theme} />
            ))}
          </div>

          {/* Center Circular FAB */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            
            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="absolute bottom-[calc(100%+24px)] z-[100] w-[200px]"
                >
                  <motion.div 
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-slate-700 relative flex flex-col gap-1 items-center text-center"
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <p className="text-xs font-bold leading-tight flex-1 text-left">
                        Menu pintas & fungsi utama portal
                      </p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDismissTooltip(); }}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0 -mr-1 -mt-1"
                      >
                        <X className="w-3 h-3 text-slate-400 hover:text-white" />
                      </button>
                    </div>
                    {/* Arrow down */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-b border-r border-slate-700 rotate-45" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Breathing Glow Background */}
            <button
              onClick={handleFabClick}
              className={cn(
                "tour-bottomnav-fab w-14 h-14 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white/60 dark:ring-zinc-950/60 transition-all duration-300 active:scale-95",
                isActionsOpen 
                  ? "bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-white rotate-45 scale-90" 
                  : cn(theme.fabBg, "text-white scale-105")
              )}
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right Buttons */}
          <div className="flex items-center justify-around flex-1 pl-8">
            {rightLinks.map((link, i) => (
              <NavIconButton key={i} {...link} theme={theme} />
            ))}
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}

// Komponen Pembantu
const BUTTON_VARIANTS: Record<string, string> = {
  "bg-amber-500": "bg-gradient-to-b from-amber-400 to-amber-500",
  "bg-blue-500": "bg-gradient-to-b from-blue-400 to-blue-600",
  "bg-teal-500": "bg-gradient-to-b from-teal-400 to-teal-600",
  "bg-red-400": "bg-gradient-to-b from-red-400 to-rose-600",
  "bg-green-400": "bg-gradient-to-b from-green-400 to-emerald-600",
  "bg-orange-500": "bg-gradient-to-b from-orange-400 to-orange-600",
  "bg-indigo-500": "bg-gradient-to-b from-indigo-400 to-indigo-600",
};

function QuickActionButton({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) {
  const bgClass = BUTTON_VARIANTS[color] || color;

  return (
    <motion.button 
      onClick={onClick} 
      className="flex flex-col items-center gap-2 group"
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.8 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 15 } }
      }}
    >
      <div className={cn("relative w-12 h-12 rounded-[1rem] flex items-center justify-center text-white shadow-md transition-transform duration-200 group-active:scale-90", bgClass)}>
        <div className="absolute inset-0 rounded-[1rem] border border-white/30 dark:border-white/20 pointer-events-none" />
        <Icon className="w-5 h-5 relative z-10" strokeWidth={2.5} />
      </div>
      <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 dark:text-white/60 text-center leading-tight max-w-[60px]">{label}</span>
    </motion.button>
  );
}

function NavIconButton({ icon: Icon, label, isActive, onClick, badge, theme }: NavLinkData & { theme?: any; key?: React.Key }) {
  const t = theme || {
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-400',
    shadow: 'shadow-[0_0_8px_rgba(244,63,94,0.8)]',
    pillBg: 'bg-rose-500/15 dark:bg-rose-400/20'
  };

  return (
    <motion.button
      onClick={onClick}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "flex items-center justify-center gap-1.5 h-10 rounded-full transition-all duration-300 active:scale-95 relative",
        isActive 
          ? cn("px-3.5", t.pillBg, t.color) 
          : "w-10 text-slate-600 hover:text-slate-900 dark:text-white/50 dark:hover:text-white/90"
      )}
    >
      <motion.div className="flex items-center justify-center">
        <Icon className={cn("shrink-0", isActive ? "w-[1.15rem] h-[1.15rem]" : "w-5 h-5")} strokeWidth={isActive ? 2.5 : 2} />
      </motion.div>
      
      <AnimatePresence mode="popLayout">
        {isActive && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="text-[11px] font-bold overflow-hidden whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      {(badge ?? 0) > 0 && (
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[7px] font-black flex items-center justify-center shadow-md border border-zinc-950">
          {(badge ?? 0) > 9 ? '9+' : badge}
        </span>
      )}
    </motion.button>
  );
}
