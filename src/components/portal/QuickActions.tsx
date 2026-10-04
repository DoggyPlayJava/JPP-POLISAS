import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HeartHandshake, Layers, QrCode, CalendarDays } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { PolymartServiceModal } from './PolymartServiceModal';
import { formatCampusTelemetry } from '@/lib/portalDeckHelpers';

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

export function QuickActions({
  isSuperAdmin,
  isModuleEnabled,
  polyMartStats: _polyMartStats,
  hasKebajikanAccess,
  kbStats,
  isJPPMode: _isJPPMode,
  karnivalActive,
  supsasActive,
}: QuickActionsProps) {
  const navigate = useNavigate();
  const [showPolymartModal, setShowPolymartModal] = useState(false);

  const telemetry = formatCampusTelemetry(kbStats);

  const getTileCardClass = (isEnabled: boolean = true) => {
    return cn(
      "group relative flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.98]",
      "backdrop-blur-xl shadow-xs overflow-hidden",
      karnivalActive
        ? "border border-pink-500/20 bg-white/70 dark:bg-slate-900/60 hover:border-pink-500/35 hover:shadow-[0_4px_20px_-4px_rgba(236,72,153,0.15)]"
        : supsasActive
        ? "border border-amber-500/20 bg-white/70 dark:bg-slate-900/60 hover:border-amber-500/35 hover:shadow-[0_4px_20px_-4px_rgba(245,158,11,0.15)]"
        : "border border-black/5 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 hover:border-black/15 dark:hover:border-white/20 hover:shadow-xs",
      isEnabled ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
    );
  };

  const handlePolyServicesClick = () => {
    if (!isModuleEnabled('keusahawanan') && !isSuperAdmin) {
      toast('PolyServices tidak aktif ketika ini!', { icon: '🚧' });
      return;
    }
    setShowPolymartModal(true);
  };

  const handleQrClick = () => {
    if (!isModuleEnabled('akademik') && !isSuperAdmin) {
      toast('Modul E-Akademik sedang dikemas kini!', { icon: '🚧' });
      return;
    }
    navigate('/akademik/qr');
  };

  const handleTakwimClick = () => {
    navigate('/akademik/takwim');
  };

  const handleKebajikanClick = () => {
    if (!isModuleEnabled('kebajikan') && !isSuperAdmin) {
      toast('Modul E-Kebajikan sedang dikemas kini!', { icon: '🚧' });
      return;
    }
    navigate(hasKebajikanAccess ? '/kebajikan' : '/kebajikan/buat-aduan');
  };

  return (
    <>
      <PolymartServiceModal isOpen={showPolymartModal} onClose={() => setShowPolymartModal(false)} />
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="tour-quick-actions grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-5xl mx-auto w-full relative z-10"
      >
        {/* Tile 1: PolyServices (BETA) */}
        <button
          type="button"
          onClick={handlePolyServicesClick}
          className={cn("tour-qa-polyservices", getTileCardClass(isModuleEnabled('keusahawanan') || isSuperAdmin))}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/15 to-transparent pointer-events-none" />
          <div
            className={cn(
              "w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-inner",
              karnivalActive
                ? "bg-pink-500/15 border border-pink-500/30 text-pink-400"
                : supsasActive
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400"
                : "bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400"
            )}
          >
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-sm text-slate-800 dark:text-white truncate">
                PolyServices
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                BETA
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Kiosk &amp; Servis
            </p>
          </div>
        </button>

        {/* Tile 2: Imbas QR */}
        <button
          type="button"
          onClick={handleQrClick}
          className={cn("tour-qa-qr", getTileCardClass(isModuleEnabled('akademik') || isSuperAdmin))}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/15 to-transparent pointer-events-none" />
          <div
            className={cn(
              "w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-inner",
              karnivalActive
                ? "bg-pink-500/15 border border-pink-500/30 text-pink-400"
                : supsasActive
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400"
                : "bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            )}
          >
            <QrCode className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-bold text-sm text-slate-800 dark:text-white truncate">
              Imbas QR
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Kumpul Merit
            </p>
          </div>
        </button>

        {/* Tile 3: Takwim Rasmi */}
        <button
          type="button"
          onClick={handleTakwimClick}
          className={cn("tour-qa-takwim", getTileCardClass(true))}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/15 to-transparent pointer-events-none" />
          <div
            className={cn(
              "w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-inner",
              karnivalActive
                ? "bg-pink-500/15 border border-pink-500/30 text-pink-400"
                : supsasActive
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400"
                : "bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 text-sky-600 dark:text-sky-400"
            )}
          >
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-bold text-sm text-slate-800 dark:text-white truncate">
              Takwim Rasmi
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Jadual &amp; Cuti
            </p>
          </div>
        </button>

        {/* Tile 4: E-Kebajikan */}
        <button
          type="button"
          onClick={handleKebajikanClick}
          className={cn("tour-qa-kebajikan", getTileCardClass(isModuleEnabled('kebajikan') || isSuperAdmin))}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/15 to-transparent pointer-events-none" />
          <div
            className={cn(
              "w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-inner",
              karnivalActive
                ? "bg-pink-500/15 border border-pink-500/30 text-pink-400"
                : supsasActive
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400"
                : "bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/20 text-teal-600 dark:text-teal-400"
            )}
          >
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-bold text-sm text-slate-800 dark:text-white truncate">
              E-Kebajikan
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {telemetry.openText} Aktif • {telemetry.resolvedText} Selesai
            </p>
          </div>
        </button>
      </motion.div>
    </>
  );
}
