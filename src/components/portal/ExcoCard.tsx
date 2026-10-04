import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight } from 'lucide-react';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { toast } from 'react-hot-toast';
import { ExcoModule } from '@/config/excoModules';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { calculateBentoLayoutSpan } from '@/lib/portalDeckHelpers';
import { cn, hexToRgba, triggerHaptic } from '@/lib/utils';

// Re-export ColorPickerPopover for backward compatibility
export { ColorPickerPopover, type ColorPickerProps } from './PortalAdminToolbar';

// ============================================================
// Kad Exco (Asymmetric Linear Bento Tile)
// High-performance institutional cards with live telemetry
// and zero embedded admin controls on the card face.
// ============================================================
export interface ExcoCardProps {
  module: ExcoModule;
  color: string;
  index: number;
  isEnabled: boolean;
  isSuperAdmin: boolean;
  onToggle?: (moduleId: string, newState: boolean) => void;
  onColorSave?: (moduleId: string, color: string) => void;
  karnivalActive?: boolean;
  supsasActive?: boolean;
  badgeText?: string;
  notificationCount?: number;
  className?: string;
  totalModules?: number;
}

const HERO_TELEMETRY: Record<string, string[]> = {
  ekpp: ['Pengurusan Aktiviti', 'Kertas Kerja Digital', 'Portal Kelab Aktif'],
  ems: ['Penjurian Digital', 'Live Papan Skor', 'Pengesahan Sijil QR'],
};

function cleanTagline(tagline?: string): string[] {
  if (!tagline) return [];
  return tagline
    .split(/[·•|]/)
    .map(t => t.trim())
    .filter(Boolean);
}

export function ExcoCard({
  module,
  color,
  index,
  isEnabled,
  isSuperAdmin,
  karnivalActive,
  supsasActive,
  badgeText,
  notificationCount,
  className,
  totalModules,
}: ExcoCardProps) {
  const navigate = useNavigate();
  const { isLowPerf } = useDevicePerformance();

  const canAccess = isEnabled || isSuperAdmin;
  const isPreviewMode = !isEnabled && isSuperAdmin;
  const isEventMode = karnivalActive || supsasActive;

  // Calculate bento column span and hero designation
  const { colSpan, isHero } = calculateBentoLayoutSpan(module.id, index, totalModules || 5);
  const taglineBadges = cleanTagline(module.tagline);

  const handleClick = () => {
    if (!canAccess) {
      triggerHaptic('light');
      toast(`${module.name} bakal tiba tidak lama lagi!`, {
        icon: '🚀',
        duration: 2500,
      });
      return;
    }

    triggerHaptic('medium');
    if (isPreviewMode) {
      toast.success('Admin Preview Mode Active', {
        icon: '👁️',
        style: {
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          background: '#1e293b',
          color: '#fff',
        },
      });
    }
    navigate(module.basePath);
  };

  return (
    <motion.div
      initial={{ opacity: isLowPerf ? 1 : 0, y: isLowPerf ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isLowPerf ? { y: -2 } : undefined}
      whileTap={!isLowPerf ? { scale: 0.99 } : undefined}
      transition={
        isLowPerf
          ? { duration: 0 }
          : { type: 'spring', stiffness: 400, damping: 25, delay: index * 0.04 }
      }
      onClick={handleClick}
      className={cn(
        `tour-mod-${module.id}`,
        colSpan,
        "group relative cursor-pointer overflow-hidden rounded-2xl p-6 sm:p-7 md:p-8 transition-all duration-300 flex flex-col justify-between active:scale-[0.99]",
        isHero ? "min-h-[280px] md:min-h-[300px]" : "min-h-[260px]",
        "border shadow-sm hover:shadow-md dark:shadow-none",
        !isLowPerf && "backdrop-blur-xl",
        !canAccess && "opacity-60 grayscale-[0.8] cursor-not-allowed",
        isEventMode
          ? cn(
              karnivalActive
                ? (isLowPerf ? "bg-card border-violet-500/20" : "bg-card/90 backdrop-blur-xl border-violet-500/20")
                : "bg-card border-white/10",
              karnivalActive
                ? "hover:border-violet-500/40 hover:shadow-[0_8px_30px_rgba(192,132,252,0.12)]"
                : "hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(131,16,16,0.12)]"
            )
          : "bg-card border-border/70 hover:border-primary/40 hover:bg-card/95",
        className
      )}
      style={
        !isEventMode
          ? ({
              '--hover-shadow': `0 12px 30px -10px ${hexToRgba(color, 0.25)}`,
              '--hover-border': hexToRgba(color, 0.4),
            } as React.CSSProperties)
          : {}
      }
    >
      {/* Primary Top Accent Line */}
      {!karnivalActive && (
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1 transition-opacity duration-300",
            isHero ? "opacity-70 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          style={{
            background: isHero
              ? `linear-gradient(90deg, ${color}, ${hexToRgba(color, 0.4)}, transparent)`
              : `linear-gradient(90deg, transparent, ${color}, transparent)`,
          }}
        />
      )}

      {/* Subtle Specular Top Highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 dark:via-white/20 to-transparent pointer-events-none" />

      {/* Karnival Mode Border Highlight */}
      {karnivalActive && (
        <div className="absolute inset-0 pointer-events-none rounded-2xl border border-violet-500/20 group-hover:border-violet-500/40 transition-colors" />
      )}

      {/* Subtle Hover Radial Gradient */}
      <div
        className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 100% 0%, ${hexToRgba(
            karnivalActive ? '#c084fc' : color,
            0.07
          )}, transparent 65%)`,
        }}
      />

      {/* Hero vs Compact Card Face Layout */}
      {isHero ? (
        // ================= HERO TILE (ekpp / ems) =================
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={cn(
                  "relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0",
                  isEventMode
                    ? "bg-white/10 border border-white/10"
                    : "bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10",
                  "group-hover:scale-105 group-hover:shadow-lg"
                )}
                style={{ border: `1px solid ${hexToRgba(color, 0.2)}` }}
              >
                {notificationCount !== undefined && notificationCount > 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 border-2 border-white dark:border-[#0f0f11] flex items-center justify-center text-white text-[10px] font-black shadow-md z-20 animate-bounce">
                    {notificationCount}
                  </div>
                )}
                <DynamicIcon
                  name={module.icon}
                  fallback="LayoutDashboard"
                  className="w-7 h-7 transition-colors duration-500"
                  style={{ color: canAccess ? color : 'currentColor' }}
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2
                    className={cn(
                      "text-2xl font-black tracking-tight transition-colors",
                      !canAccess && "opacity-70",
                      isEventMode ? "text-white" : "text-slate-900 dark:text-white"
                    )}
                  >
                    {module.name}
                  </h2>
                  {badgeText && (
                    <div
                      className="px-2 py-0.5 rounded text-white text-[9px] font-bold uppercase tracking-wider shadow-sm"
                      style={{ background: color }}
                    >
                      {badgeText}
                    </div>
                  )}
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {module.fullName}
                </p>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div
                className={cn(
                  "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-all duration-300",
                  isEventMode
                    ? isEnabled
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : isPreviewMode
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-white/10 text-white/50 border-white/10"
                    : isEnabled
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                    : isPreviewMode
                    ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                    : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-white/40 dark:border-white/10"
                )}
              >
                {isEnabled ? (
                  <span className="flex items-center gap-1">Aktif</span>
                ) : isPreviewMode ? (
                  <span className="flex items-center gap-1">Pratonton</span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Kunci
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <p
              className={cn(
                "text-sm font-medium leading-relaxed max-w-2xl transition-colors",
                isEventMode ? "text-white/80" : "text-slate-600 dark:text-white/70"
              )}
            >
              {module.description}
            </p>

            {/* Live Module Telemetry Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-3">
              {(HERO_TELEMETRY[module.id] || []).map((pill, pIdx) => (
                <div
                  key={pIdx}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                    isEventMode
                      ? "bg-white/10 text-white/90 border-white/15"
                      : "bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-white/[0.04] dark:text-slate-300 dark:border-white/10"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  <span>{pill}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // ================= COMPACT TILE (keusahawanan / akademik / kebajikan) =================
        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between">
            <div
              className={cn(
                "relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500",
                isEventMode
                  ? "bg-white/10 border border-white/10"
                  : "bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5",
                "group-hover:scale-105 group-hover:shadow-md"
              )}
              style={{ border: `1px solid ${hexToRgba(color, 0.15)}` }}
            >
              {notificationCount !== undefined && notificationCount > 0 && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 border-2 border-white dark:border-[#0f0f11] flex items-center justify-center text-white text-[9px] font-black shadow-md z-20 animate-bounce">
                  {notificationCount}
                </div>
              )}
              <DynamicIcon
                name={module.icon}
                fallback="LayoutDashboard"
                className="w-6 h-6 transition-colors duration-500"
                style={{ color: canAccess ? color : 'currentColor' }}
              />
            </div>

            <div className="flex items-center gap-1.5">
              {badgeText && (
                <div
                  className="px-2 py-0.5 rounded-md text-white text-[9px] font-bold uppercase tracking-wider shadow-sm"
                  style={{ background: color }}
                >
                  {badgeText}
                </div>
              )}

              <div
                className={cn(
                  "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-all duration-300",
                  isEventMode
                    ? isEnabled
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : isPreviewMode
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-white/10 text-white/50 border-white/10"
                    : isEnabled
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                    : isPreviewMode
                    ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                    : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-white/40 dark:border-white/10"
                )}
              >
                {isEnabled ? (
                  <span className="flex items-center gap-1">Aktif</span>
                ) : isPreviewMode ? (
                  <span className="flex items-center gap-1">Pratonton</span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Kunci
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2
              className={cn(
                "text-lg font-bold mb-1 transition-colors",
                !canAccess && "opacity-70",
                isEventMode ? "text-white" : "text-slate-900 dark:text-white"
              )}
            >
              {module.name}
            </h2>
            <p
              className={cn(
                "text-xs leading-relaxed font-medium line-clamp-2 transition-colors",
                isEventMode ? "text-white/70" : "text-slate-500 dark:text-white/60"
              )}
            >
              {module.description}
            </p>

            {/* High-contrast data tile telemetry */}
            {module.id === 'kebajikan' && notificationCount !== undefined && notificationCount > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                <span>{notificationCount} Tiket Aduan Aktif</span>
              </div>
            )}
            {module.id === 'akademik' && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>Merit & Transkrip Digital</span>
              </div>
            )}
            {module.id === 'keusahawanan' && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Pasar Siswa & Inkubator</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card Footer (Common to both Hero & Compact) */}
      <div className="relative z-10 mt-6 pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/50 dark:border-white/10">
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs font-bold transition-all duration-300",
            !canAccess && "opacity-50",
            canAccess && "group-hover:gap-2.5",
            isEventMode
              ? "text-white/80 group-hover:text-white"
              : "text-slate-700 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white"
          )}
          style={canAccess ? ({ '--hover-color': color } as React.CSSProperties) : {}}
        >
          <span className="group-hover:text-[var(--hover-color)] transition-colors">
            {canAccess ? "Masuk Portal" : "Bakal Tiba"}
          </span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 group-hover:text-[var(--hover-color)]" />
        </div>

        {/* Micro-badges for taglines (clean, uppercase, zero middle-dots) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {taglineBadges.map((badge, idx) => (
            <span
              key={idx}
              className={cn(
                "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border transition-colors",
                isEventMode
                  ? "bg-white/10 text-white/70 border-white/10"
                  : "bg-slate-100 text-slate-600 border-slate-200/60 dark:bg-white/5 dark:text-white/60 dark:border-white/10"
              )}
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .group:hover {
          border-color: var(--hover-border, inherit);
          box-shadow: var(--hover-shadow, inherit);
        }
      `}</style>
    </motion.div>
  );
}

export default ExcoCard;
