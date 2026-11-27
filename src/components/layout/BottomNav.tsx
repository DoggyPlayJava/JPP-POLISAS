import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu, User, X, QrCode,
  Home, CalendarRange, Layers, LayoutGrid,
  HeartHandshake, Landmark, Lightbulb, Building2, Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
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

export function BottomNav({ onOpenSidebar, customLinks, forceShowDesktop = false }: BottomNavProps) {
  const { t } = useTranslation(['nav', 'portal', 'common']);
  const [mounted, setMounted] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const { isSuperAdmin, isJppMember, profile } = useAuth();
  const { intake1Month, intake2Month } = useAcademicSession();
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);
  const isActionsOpenRef = useRef(false);
  const [showPolymartModal, setShowPolymartModal] = useState(false);
  // Drag handle-only swipe-to-dismiss (iOS: whole-menu drag was swallowed by native scroll)
  const quickActionsDragControls = useDragControls();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    isActionsOpenRef.current = isActionsOpen;
    if (isActionsOpen && navRef.current) {
      navRef.current.dataset.compact = 'false';
    }
  }, [isActionsOpen]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    let ticking = false;

    const onScroll = (e: Event) => {
      const target = e.target;
      let currentY = window.scrollY;
      if (target && target !== document && target !== window && target instanceof HTMLElement) {
        if (target.scrollHeight <= target.clientHeight + 48) return;
        currentY = target.scrollTop;
      }
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const el = navRef.current;
        if (!el) return;
        if (isActionsOpenRef.current) {
          el.dataset.compact = 'false';
          lastScrollYRef.current = currentY;
          return;
        }
        const delta = currentY - lastScrollYRef.current;
        if (delta > 8 && currentY > 56) {
          el.dataset.compact = 'true';
        } else if (delta < -10 || currentY <= 40) {
          el.dataset.compact = 'false';
        }
        lastScrollYRef.current = currentY;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [mounted]);

  const handleFabClick = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    setIsActionsOpen((prev) => !prev);
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

  // Close sheet on route change
  useEffect(() => {
    setIsActionsOpen(false);
  }, [location.pathname]);

  const defaultSecondLeft: NavLinkData = onOpenSidebar
    ? { icon: Menu, label: t('nav:menu', 'Menu'), onClick: onOpenSidebar }
    : {
        icon: CalendarRange,
        label: t('nav:takwim', 'Takwim'),
        onClick: () => navigate('/akademik/takwim'),
        isActive: location.pathname.startsWith('/akademik/takwim'),
      };

  const leftLinks = customLinks?.left || [
    { icon: Home, label: t('nav:primary_nav', 'Utama'), onClick: () => navigate('/portal'), isActive: location.pathname === '/portal' },
    defaultSecondLeft,
  ];

  const rightLinks = customLinks?.right || [
    { icon: QrCode, label: t('nav:qr_merit', 'QR Merit'), onClick: () => navigate('/akademik/qr'), isActive: location.pathname === '/akademik/qr' },
    { icon: User, label: t('nav:profile', 'Profil'), onClick: () => navigate('/tetapan'), isActive: location.pathname === '/tetapan' },
  ];

  // -- Unified Institutional Theme Logic --
  const theme = {
    color: 'text-[#0F766E] dark:text-[#2DD4BF]',
    bg: 'bg-[#0F766E] dark:bg-[#14B8A6]',
    fabBg: 'bg-gradient-to-tr from-[#0B2420] to-[#0D9488]',
    pillBg: 'bg-[#0D9488]/10 dark:bg-[#14B8A6]/20',
  };

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
              transition={{ duration: 0.25 }}
              onClick={() => setIsActionsOpen(false)}
              className={cn("fixed inset-0 bg-black/75 z-[110]", !forceShowDesktop && "md:hidden")}
            />
            <motion.div
              drag="y"
              dragListener={false}
              dragControls={quickActionsDragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.4}
              onDragEnd={(_e, info) => {
                if (info.offset.y > 50 || info.velocity.y > 200) {
                  setIsActionsOpen(false);
                }
              }}
              initial={{ opacity: 0, y: 80, scale: 0.94 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { type: "spring", stiffness: 360, damping: 24 },
              }}
              exit={{
                opacity: 0,
                y: 80,
                scale: 0.94,
                transition: { duration: 0.18 },
              }}
              className={cn("quick-actions-menu touch-none fixed bottom-[calc(4.75rem+max(0.75rem,calc(var(--sab,env(safe-area-inset-bottom,0px))*0.82)))] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[calc(100%-2rem)] md:max-w-[392px] z-[111] bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-[24px] p-4 sm:p-5 shadow-2xl", !forceShowDesktop && "md:hidden")}
            >
              {/* Drag Handle Indicator */}
              <div
                onPointerDown={(e) => quickActionsDragControls.start(e)}
                className="w-10 h-1 bg-[#B8E4DC] dark:bg-white/20 rounded-full mx-auto mb-4 cursor-grab active:cursor-grabbing"
              />
              <h3 className="text-xs font-semibold text-[#3B635C] dark:text-[#94A0B2] mb-4 text-center">
                {t('nav:quick_actions', 'Tindakan Pantas')}
              </h3>
              <motion.div
                className="grid grid-cols-4 gap-y-5 gap-x-2"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={{
                  hidden: {},
                  visible: {
                    transition: { staggerChildren: 0.04, delayChildren: 0.03 },
                  },
                }}
              >
                <QuickActionButton icon={Layers} label="PolyServices" color="bg-amber-500" onClick={() => { setIsActionsOpen(false); setShowPolymartModal(true); }} />
                <QuickActionButton icon={CalendarRange} label={t('nav:takwim', 'Takwim')} color="bg-blue-500" onClick={() => handleQuickAction('/akademik/takwim')} />
                <QuickActionButton icon={HeartHandshake} label={t('nav:complaints', 'Aduan')} color="bg-teal-500" onClick={() => handleQuickAction('/kebajikan/buat-aduan')} />
                <QuickActionButton icon={Landmark} label={t('nav:clubs_short', 'Kelab')} color="bg-red-400" onClick={() => handleQuickAction('/kelab')} />

                <QuickActionButton icon={Lightbulb} label={t('nav:business', 'Bisnes')} color="bg-green-400" onClick={() => handleQuickAction('/keusahawanan/dashboard')} />
                {isKlkEligible && (
                  <QuickActionButton icon={Building2} label={t('nav:housing_short', 'Kediaman')} color="bg-orange-500" onClick={() => handleQuickAction('/tetapan?tab=kediaman')} />
                )}

                {(isSuperAdmin || isJppMember) && (
                  <QuickActionButton icon={Crown} label={t('nav:jpp_hq', 'JPP HQ')} color="bg-indigo-500" onClick={() => handleQuickAction('/jpp')} />
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 2. Floating Bottom Nav Dock (Always Labeled 5-Slot Grid, Scroll-Compact) */}
      <div
        ref={navRef}
        id="bottom-nav-dock"
        data-compact="false"
        onClick={(e) => {
          e.nativeEvent.stopImmediatePropagation();
          if (navRef.current) {
            navRef.current.dataset.compact = 'false';
          }
        }}
        onTouchStart={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
        onTouchMove={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
        onPointerDown={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
        onPointerMove={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
        onPointerUp={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
        className={cn(
          "group/dock tour-bottom-nav fixed bottom-[max(0.75rem,calc(var(--sab,env(safe-area-inset-bottom,0px))*0.82))] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[392px] z-[120] origin-bottom transform-gpu transition-[transform,opacity] duration-200 ease-apple-out data-[compact=true]:scale-[0.88] data-[compact=true]:opacity-85 data-[compact=true]:translate-y-2 hover:data-[compact=true]:opacity-100",
          !forceShowDesktop && "md:hidden"
        )}
      >
        <nav
          aria-label={t('nav:navigation', 'Navigasi')}
          className="bg-white dark:bg-[#0E1116] border border-[#B8E4DC]/90 dark:border-[#252B35] shadow-surface-lg rounded-[20px] px-1.5 py-0.5 grid grid-cols-5 items-center gap-0.5 relative"
        >
          {leftLinks.slice(0, 2).map((link, i) => (
            <NavIconButton key={`left-${i}`} {...link} theme={theme} />
          ))}

          {/* Center Pintasan Hub Trigger */}
          <button
            type="button"
            onClick={handleFabClick}
            aria-label={t('nav:quick_actions', 'Tindakan Pantas')}
            aria-expanded={isActionsOpen}
            className="tour-bottomnav-fab flex flex-col items-center justify-center gap-0.5 min-h-[48px] w-full px-1 py-0.5 rounded-[14px] transition-transform duration-150 ease-apple-out active:scale-[0.96] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
          >
            <span
              className={cn(
                "w-8 h-8 rounded-[12px] flex items-center justify-center transition-[transform,background-color,color] duration-150 ease-apple-out",
                isActionsOpen
                  ? "bg-slate-200 dark:bg-[#252B35] text-[#0B2420] dark:text-white"
                  : cn(theme.fabBg, "text-white shadow-surface-sm")
              )}
            >
              {isActionsOpen ? (
                <X className="w-4 h-4" strokeWidth={2.5} />
              ) : (
                <LayoutGrid className="w-4 h-4" strokeWidth={2.25} />
              )}
            </span>
            <span className="text-[10px] font-semibold leading-none tracking-tight text-[#0B2420] dark:text-[#F1F5F9] truncate max-w-[64px] transition-[opacity,transform] duration-150 ease-apple-out group-data-[compact=true]/dock:opacity-75">
              {t('nav:hub_short', 'Pintasan')}
            </span>
          </button>

          {rightLinks.slice(0, 2).map((link, i) => (
            <NavIconButton key={`right-${i}`} {...link} theme={theme} />
          ))}
        </nav>
      </div>
    </>,
    document.body
  );
}

// Helper Components
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
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 group cursor-pointer"
      variants={{
        hidden: { opacity: 0, y: 16, scale: 0.92 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 20 } },
      }}
    >
      <div className={cn("relative w-12 h-12 rounded-[16px] flex items-center justify-center text-white shadow-md transition-transform duration-150 ease-out group-active:scale-95", bgClass)}>
        <div className="absolute inset-0 rounded-[16px] border border-white/30 dark:border-white/20 pointer-events-none" />
        <Icon className="w-5 h-5 relative z-10" strokeWidth={2.5} />
      </div>
      <span className="text-[11px] font-semibold text-[#0B2420] dark:text-[#F1F5F9] text-center leading-tight max-w-[72px]">
        {label}
      </span>
    </motion.button>
  );
}

function NavIconButton({ icon: Icon, label, isActive, onClick, badge, theme }: NavLinkData & { theme?: any; key?: React.Key }) {
  const t = theme || {
    color: 'text-[#0F766E] dark:text-[#2DD4BF]',
    pillBg: 'bg-[#0D9488]/10 dark:bg-[#14B8A6]/20',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 min-h-[48px] w-full px-1 py-0.5 rounded-[14px] transition-[transform,color,background-color] duration-150 ease-apple-out active:scale-[0.96] relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]",
        isActive
          ? cn(t.pillBg, t.color)
          : "text-[#3B635C] hover:text-[#0B2420] dark:text-[#94A0B2] dark:hover:text-white"
      )}
    >
      <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.4 : 2} />
      <span className={cn("text-[10px] leading-none tracking-tight truncate max-w-[64px] transition-opacity duration-150 ease-apple-out group-data-[compact=true]/dock:opacity-75", isActive ? "font-bold" : "font-medium")}>
        {label}
      </span>

      {(badge ?? 0) > 0 && (
        <span className="absolute top-0.5 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold font-mono tabular-nums flex items-center justify-center shadow-xs border border-white dark:border-[#0E1116]">
          {(badge ?? 0) > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}
