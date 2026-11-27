import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Lock, Palette, PowerOff, Power, ArrowRight } from 'lucide-react';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { toast } from 'react-hot-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ExcoModule } from '@/config/excoModules';
import { cn, hexToRgba, getContrastText, triggerHaptic } from '@/lib/utils';

// ─── Color Picker Popover ───
interface ColorPickerProps {
  moduleId: string;
  moduleName: string;
  currentColor: string;
  onSave: (moduleId: string, color: string) => void;
  onClose: () => void;
}

export function ColorPickerPopover({ moduleId, moduleName, currentColor, onSave, onClose: _onClose }: ColorPickerProps) {
  const { t } = useTranslation(['portal', 'common']);
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [hexInput, setHexInput] = useState(currentColor);

  const sync = (hex: string) => { setSelectedColor(hex); setHexInput(hex); };

  const handleHexChange = (val: string) => {
    const stripped = val.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    setHexInput('#' + stripped);
    if (stripped.length === 6) {
      setSelectedColor('#' + stripped);
    } else if (stripped.length === 3) {
      const expanded = stripped.split('').map(c => c + c).join('');
      setSelectedColor('#' + expanded);
    }
  };

  const PRESET_GROUPS = [
    { label: t('portal:theme_primary_corporate', 'Primary & Corporate'), colors: ['#7B1C1C', '#1A237E', '#1B5E20', '#E65100', '#4A148C'] },
    { label: t('portal:theme_modern_vibrancy', 'Modern Vibrancy'), colors: ['#F43F5E', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'] },
  ];

  return (
    <div className="flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t('portal:customize_theme', 'Customize Theme')}
            </h4>
            <p className="text-xs font-bold truncate max-w-[140px]">{moduleName}</p>
          </div>
          <div
            className="w-10 h-10 rounded-2xl shadow-inner border border-black/10 dark:border-white/20"
            style={{ background: selectedColor }}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2 rounded-2xl bg-black/5 dark:bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/10">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-sm">
              <input
                type="color"
                value={selectedColor}
                onChange={e => sync(e.target.value)}
                className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer"
              />
            </div>
            <div className="flex-1 flex items-center px-2">
              <span className="text-muted-foreground font-mono text-xs mr-1 opacity-50">#</span>
              <input
                value={hexInput.replace('#', '')}
                onChange={e => handleHexChange(e.target.value)}
                maxLength={6}
                className="w-full bg-transparent outline-none font-mono text-xs font-bold uppercase tracking-widest"
              />
            </div>
          </div>

          <div className="space-y-4">
            {PRESET_GROUPS.map(group => (
              <div key={group.label} className="space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">{group.label}</p>
                <div className="flex justify-between">
                  {group.colors.map(c => (
                    <button
                      key={c}
                      onClick={() => sync(c)}
                      className={cn(
                        "w-8 h-8 rounded-xl transition-all hover:scale-110 active:scale-90 border-2",
                        selectedColor.toLowerCase() === c.toLowerCase() ? "border-white" : "border-transparent"
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={() => onSave(moduleId, selectedColor)}
          className="w-full rounded-2xl h-11 font-bold text-xs uppercase tracking-widest transition-all"
          style={{
            background: selectedColor,
            color: getContrastText(selectedColor),
            boxShadow: `0 8px 20px -6px ${hexToRgba(selectedColor, 0.4)}`
          }}
        >
          {t('portal:apply_theme', 'Apply Theme')}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Kad Exco (Premium Bento Style)
// ─────────────────────────────────────────────
export interface ExcoCardProps {
  key?: React.Key;
  module: ExcoModule;
  color: string;
  index: number;
  isEnabled: boolean;
  isSuperAdmin: boolean;
  onToggle: (moduleId: string, newState: boolean) => void;
  onColorSave: (moduleId: string, color: string) => void;
  karnivalActive?: boolean;
  supsasActive?: boolean;
  badgeText?: string;
  notificationCount?: number;
  className?: string;
}

export function ExcoCard({
  module,
  color,
  index,
  isEnabled,
  isSuperAdmin,
  onToggle,
  onColorSave,
  karnivalActive,
  supsasActive,
  badgeText,
  notificationCount,
  className,
}: ExcoCardProps) {
  const { t } = useTranslation(['portal', 'common']);
  const navigate = useNavigate();
  const [showColorPicker, setShowColorPicker] = useState(false);

  const canAccess = isEnabled || isSuperAdmin;
  const isPreviewMode = !isEnabled && isSuperAdmin;
  const isEventMode = karnivalActive || supsasActive;

  const moduleName = t(`portal:module_${module.id}_title`, module.name);
  const moduleDesc = t(`portal:module_${module.id}_desc`, module.description);
  const moduleTagline = t(`portal:module_${module.id}_tagline`, module.tagline);

  const handleClick = () => {
    if (!canAccess) {
      triggerHaptic('light');
      toast(t('portal:module_coming_soon_toast', '{{name}} bakal tiba tidak lama lagi!', { name: moduleName }), {
        duration: 2500,
      });
      return;
    }

    triggerHaptic('medium');
    if (isPreviewMode) {
      toast.success(t('portal:admin_preview_active_toast', 'Admin Preview Mode Active'), {
        style: { borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: '#1e293b', color: '#fff' },
      });
    }
    navigate(module.basePath);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onClick={handleClick}
      className={cn(
        `tour-mod-${module.id}`,
        "group relative cursor-pointer overflow-hidden rounded-2xl p-4 sm:p-5 transition-[transform,border-color,box-shadow,background-color] duration-200 ease-out active:scale-[0.98] min-h-[172px] sm:min-h-[188px] flex flex-col justify-between",
        "border shadow-sm hover:shadow-xl dark:shadow-none",
        !canAccess && "opacity-60 grayscale-[0.8] cursor-not-allowed",
        isEventMode 
          ? cn(
              karnivalActive ? "bg-black/80 border-violet-500/20" : "bg-black/20 border-white/10",
              karnivalActive ? "hover:border-transparent hover:bg-violet-950/30 hover:shadow-[inset_0_0_30px_rgba(192,132,252,0.15),0_10px_50px_rgba(192,132,252,0.25)]" : "hover:border-amber-500/40 hover:bg-amber-500/10 hover:shadow-[0_8px_40px_rgba(245,158,11,0.15)]"
            )
          : "bg-white dark:bg-[#13171D] border-[#B8E4DC]/80 dark:border-[#252B35] hover:border-[#0D9488]/50 hover:bg-white dark:hover:bg-[#1B2028] md:hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(11,36,32,0.05)]",
        className
      )}
      style={!isEventMode ? {
        '--hover-shadow': `0 10px 40px -10px ${hexToRgba(color, 0.2)}`,
        '--hover-border': hexToRgba(color, 0.3)
      } as React.CSSProperties : {}}
    >
      {/* Accent Line - Top */}
      {!karnivalActive && (
        <div 
          className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
        />
      )}
      
      {/* Subtle Hover Gradient Background */}
      <div
        className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{ background: `radial-gradient(circle at 100% 0%, ${hexToRgba(karnivalActive ? '#c084fc' : color, 0.08)}, transparent 60%)` }}
      />

      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "relative w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 ease-out",
              isEventMode ? "bg-white/10 border border-white/10" : "bg-[#EBF7F4] dark:bg-white/[0.04] border border-[#B8E4DC]/60 dark:border-white/10",
              "group-hover:scale-105"
            )}
            style={{ border: `1px solid ${hexToRgba(color, 0.14)}` }}
          >
            {notificationCount !== undefined && notificationCount > 0 && (
              <div className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 border-2 border-white dark:border-[#13171D] flex items-center justify-center text-white text-[11px] font-bold font-mono tabular-nums shadow-xs z-20">
                {notificationCount}
              </div>
            )}
            <DynamicIcon 
              name={module.icon}
              fallback="LayoutDashboard"
              className="w-5 h-5 transition-colors duration-200" 
              style={{ color: canAccess ? color : 'currentColor' }} 
            />
          </div>

          <div className="flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1.5">
              {badgeText && (
                <div 
                  className="px-2 py-0.5 rounded-lg text-white text-[11px] font-semibold shadow-xs"
                  style={{ background: color }}
                >
                  {badgeText}
                </div>
              )}
              
              <div
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-colors duration-200",
                  isEventMode
                    ? isEnabled ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : isPreviewMode ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-white/10 text-white/50 border-white/10"
                    : isEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : isPreviewMode ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-white/50 dark:border-white/10"
                )}
              >
                {isEnabled ? (
                  <span className="flex items-center gap-1">{t('portal:status_active', 'Aktif')}</span>
                ) : isPreviewMode ? (
                  <span className="flex items-center gap-1">{t('portal:status_preview', 'Pratonton')}</span>
                ) : (
                  <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> {t('portal:status_locked', 'Kunci')}</span>
                )}
              </div>
            </div>

            {isSuperAdmin && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center border transition-colors duration-150 cursor-pointer",
                        isEventMode ? "border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white" : "border-[#B8E4DC]/80 dark:border-[#252B35] bg-[#F6FBF9] dark:bg-white/5 hover:bg-[#EBF7F4] dark:hover:bg-white/10 text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-white"
                      )}
                    >
                      <Palette className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={8}
                    className="w-72 rounded-2xl shadow-xl border border-[#B8E4DC]/80 dark:border-[#252B35] bg-white dark:bg-[#13171D] p-0 overflow-hidden"
                  >
                    <ColorPickerPopover
                      moduleId={module.id}
                      moduleName={moduleName}
                      currentColor={color}
                      onSave={(id, c) => { onColorSave(id, c); setShowColorPicker(false); }}
                      onClose={() => setShowColorPicker(false)}
                    />
                  </PopoverContent>
                </Popover>
                {module.id !== 'ekpp' && (
                  <button
                    type="button"
                    onClick={() => onToggle(module.id, !isEnabled)}
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center border transition-colors duration-150 cursor-pointer",
                      isEventMode
                        ? isEnabled ? "border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : isEnabled ? "border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20" : "border-emerald-200 bg-emerald-50 text-emerald-500 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                    )}
                  >
                    {isEnabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className={cn(
            "text-base sm:text-lg font-bold tracking-tight mb-1 transition-colors [text-wrap:balance]", 
            !canAccess && "opacity-70",
            isEventMode ? "text-white" : "text-[#0B2420] dark:text-[#F1F5F9]"
          )}>
            {moduleName}
          </h2>
          <p className={cn(
            "text-xs sm:text-sm leading-relaxed font-normal line-clamp-2 transition-colors",
            isEventMode ? "text-white/70" : "text-[#3B635C] dark:text-[#94A0B2]"
          )}>
            {moduleDesc}
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex items-center justify-between gap-2">
        <div className={cn(
          "flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 shrink-0",
          !canAccess && "opacity-50",
          canAccess && "group-hover:gap-2.5",
          isEventMode ? "text-white/80 group-hover:text-white" : "text-[#0B2420] dark:text-[#F1F5F9]/90 group-hover:text-[#0B2420] dark:group-hover:text-white"
        )}
        style={canAccess ? { '--hover-color': color } as React.CSSProperties : {}}>
          <span className="group-hover:text-[var(--hover-color)] transition-colors">
            {canAccess ? t('portal:enter_portal', 'Masuk Portal') : t('portal:coming_soon', 'Bakal Tiba')}
          </span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 group-hover:text-[var(--hover-color)]" />
        </div>

        <div className={cn(
          "text-[11px] font-medium px-2 py-0.5 rounded-lg truncate max-w-[160px]",
          isEventMode ? "bg-white/10 text-white/60" : "bg-[#F6FBF9] dark:bg-[#090B0E] text-[#3B635C] dark:text-[#94A0B2] border border-[#B8E4DC]/60 dark:border-[#252B35]"
        )}>
          {moduleTagline}
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
