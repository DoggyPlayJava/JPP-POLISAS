import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, Bell, User, Plus, X, Search, Sparkles, QrCode, 
  Ticket, Home, Megaphone, CalendarRange, Flag, Layers,
  Store, ShieldAlert, Building2, HeartHandshake, Landmark, Lightbulb, Crown,
  Bike, Map
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
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
}

export function BottomNav({ onOpenSidebar, onOpenSearch, customLinks }: BottomNavProps) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const { isSuperAdmin, isJppMember, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const [showPolymartModal, setShowPolymartModal] = useState(false);

  // ── Auto-hide on Scroll Logic ──────────────────────────────────────────
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = (e: Event) => {
      // Ignore scroll events from inside Quick Actions menu or Tooltip
      if (e.target instanceof Element && e.target.closest('#bottom-nav-dock, .quick-actions-menu')) {
        return;
      }

      if (!ticking) {
        requestAnimationFrame(() => {
          let currentScrollY = window.scrollY;
          
          if (e.target instanceof HTMLElement) {
             if (e.target.clientHeight > window.innerHeight * 0.4) {
                currentScrollY = e.target.scrollTop;
             }
          }

          if (navRef.current && !isActionsOpen) {
            // Shrink more if scrolling down past 50px
            if (currentScrollY > lastScrollY && currentScrollY > 50) {
              navRef.current.classList.add('opacity-75', 'scale-[0.85]', 'translate-y-4');
            } 
            // Restore if scrolling up or at the top
            else {
              navRef.current.classList.remove('opacity-75', 'scale-[0.85]', 'translate-y-4');
            }
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, [isActionsOpen]);

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
    ? getSemesterInfo(profile.intake_year, profile.intake_period as 1 | 2, profile.programme_code === 'FTV', 7, 1, profile.semester_override)
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

  return (
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
              onClick={() => setIsActionsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className="quick-actions-menu fixed bottom-28 left-4 right-4 z-[111] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-xl md:hidden"
            >
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/40 mb-4 text-center">Tindakan Pantas</h3>
              <motion.div 
                className="grid grid-cols-4 gap-y-6 gap-x-2"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={{
                  hidden: {},
                  visible: {
                    transition: { staggerChildren: 0.04, delayChildren: 0.1 }
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
        onClick={() => {
          if (navRef.current && navRef.current.classList.contains('scale-[0.85]')) {
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
            navRef.current.classList.remove('opacity-75', 'scale-[0.85]', 'translate-y-4');
          }
        }}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        className="md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[360px] z-[120] transform-gpu transition-all duration-300 ease-out cursor-pointer"
      >
        {/* Changed blur to md to optimize for low end devices */}
        <div className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] rounded-full px-2 py-2 flex items-center justify-between relative">
          
          {/* Left Buttons */}
          <div className="flex items-center justify-around flex-1 pr-8">
            {leftLinks.map((link, i) => (
              <NavIconButton key={i} {...link} />
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

            <button
              onClick={handleFabClick}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white/90 dark:ring-zinc-950/90 transition-all duration-300 active:scale-95",
                isActionsOpen 
                  ? "bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-white rotate-45 scale-90" 
                  : "bg-gradient-to-tr from-rose-600 to-rose-400 text-white hover:shadow-rose-500/30 scale-105"
              )}
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right Buttons */}
          <div className="flex items-center justify-around flex-1 pl-8">
            {rightLinks.map((link, i) => (
              <NavIconButton key={i} {...link} />
            ))}
          </div>

        </div>
      </div>
    </>
  );
}

// Komponen Pembantu
function QuickActionButton({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) {
  return (
    <motion.button 
      onClick={onClick} 
      className="flex flex-col items-center gap-2 group"
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.8 },
        visible: { opacity: 1, y: 0, scale: 1 }
      }}
    >
      <div className={cn("w-12 h-12 rounded-[1rem] flex items-center justify-center text-white shadow-md transition-transform duration-200 active:scale-90", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 dark:text-white/60 text-center leading-tight max-w-[60px]">{label}</span>
    </motion.button>
  );
}

function NavIconButton({ icon: Icon, label, isActive, onClick, badge }: NavLinkData) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-full transition-all duration-200 active:scale-90 relative",
        isActive ? "text-rose-500 dark:text-rose-400" : "text-slate-400 hover:text-slate-700 dark:text-white/50 dark:hover:text-white/90"
      )}
    >
      <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
      {isActive && (
        <span className="absolute bottom-1 w-1 h-1 bg-rose-400 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
      )}
      {(badge ?? 0) > 0 && (
        <span className="absolute top-1 right-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[7px] font-black flex items-center justify-center shadow-md border border-zinc-950">
          {(badge ?? 0) > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}
