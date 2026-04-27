import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn, hexToRgba, getContrastText, triggerHaptic } from '@/lib/utils';
import { ExcoModule } from '@/config/excoModules';

// ─── Color Picker Popover ───
interface ColorPickerProps {
  moduleId: string;
  moduleName: string;
  currentColor: string;
  onSave: (moduleId: string, color: string) => void;
  onClose: () => void;
}

export function ColorPickerPopover({ moduleId, moduleName, currentColor, onSave, onClose }: ColorPickerProps) {
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
    { label: 'Primary & Corporate', colors: ['#7B1C1C', '#1A237E', '#1B5E20', '#E65100', '#4A148C'] },
    { label: 'Modern Vibrancy', colors: ['#F43F5E', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'] },
  ];

  return (
    <div className="flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Customize Theme</h4>
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
          Apply Theme
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Kad Exco (Premium Bento Style)
// ─────────────────────────────────────────────
export interface ExcoCardProps {
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
}

export function ExcoCard({ module, color, index, isEnabled, isSuperAdmin, onToggle, onColorSave, karnivalActive, supsasActive, badgeText, notificationCount }: ExcoCardProps) {
  const navigate = useNavigate();
  const [showColorPicker, setShowColorPicker] = useState(false);

  const canAccess = isEnabled || isSuperAdmin;
  const isPreviewMode = !isEnabled && isSuperAdmin;
  const IconComponent = (LucideIcons as any)[module.icon] || LucideIcons.LayoutDashboard;
  const isEventMode = karnivalActive || supsasActive;

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
        "group relative cursor-pointer overflow-hidden rounded-[2rem] p-8 transition-all duration-500 min-h-[280px] flex flex-col justify-between",
        "border shadow-sm hover:shadow-2xl dark:shadow-none backdrop-blur-xl",
        !canAccess && "opacity-60 grayscale-[0.8] cursor-not-allowed",
        isEventMode 
          ? cn(
              "bg-black/20 border-white/10",
              karnivalActive ? "hover:border-violet-500/40 hover:bg-violet-500/10 hover:shadow-[0_8px_40px_rgba(139,92,246,0.15)]" : "hover:border-amber-500/40 hover:bg-amber-500/10 hover:shadow-[0_8px_40px_rgba(245,158,11,0.15)]"
            )
          : "bg-white/80 dark:bg-slate-900/40 border-slate-200/50 dark:border-white/5 hover:bg-white dark:hover:bg-slate-900/80 hover:-translate-y-1"
      )}
      style={!isEventMode ? {
        '--hover-shadow': `0 10px 40px -10px ${hexToRgba(color, 0.2)}`,
        '--hover-border': hexToRgba(color, 0.3)
      } as React.CSSProperties : {}}
    >
      {/* Accent Line - Top */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      
      {/* Very Subtle Hover Gradient Background */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{ background: `radial-gradient(circle at 100% 0%, ${hexToRgba(color, 0.05)}, transparent 50%)` }}
      />

      <div className="relative z-10 space-y-6">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
              isEventMode ? "bg-white/10 border border-white/10" : "bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5",
              "group-hover:scale-110 group-hover:shadow-lg"
            )}
            style={{ border: `1px solid ${hexToRgba(color, 0.1)}` }}
          >
            {notificationCount !== undefined && notificationCount > 0 && (
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 border-2 border-white dark:border-[#0f0f11] flex items-center justify-center text-white text-[10px] font-black shadow-md z-20 animate-[bounce_2s_infinite]">
                {notificationCount}
              </div>
            )}
            <IconComponent 
              className="w-6 h-6 transition-colors duration-500" 
              style={{ color: canAccess ? color : 'currentColor' }} 
            />
          </div>

          <div className="flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1.5">
              {badgeText && (
                <div 
                  className="px-2 py-1 rounded-md text-white text-[9px] font-bold uppercase tracking-wider shadow-sm"
                  style={{ background: color }}
                >
                  {badgeText}
                </div>
              )}
              
              <div
                className={cn(
                  "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-all duration-300",
                  isEventMode
                    ? isEnabled ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : isPreviewMode ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-white/10 text-white/50 border-white/10"
                    : isEnabled ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : isPreviewMode ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-white/40 dark:border-white/10"
                )}
              >
                {isEnabled ? (
                  <span className="flex items-center gap-1">Aktif</span>
                ) : isPreviewMode ? (
                  <span className="flex items-center gap-1">Pratonton</span>
                ) : (
                  <span className="flex items-center gap-1"><LucideIcons.Lock className="w-2.5 h-2.5" /> Kunci</span>
                )}
              </div>
            </div>

            {isSuperAdmin && (
              <div className="flex items-center gap-1.5 mt-1">
                <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                  <PopoverTrigger asChild>
                    <button className={cn(
                      "p-1.5 rounded-lg border transition-all",
                      isEventMode ? "border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white" : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                    )}>
                      <LucideIcons.Palette className="w-3.5 h-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={8}
                    className="w-72 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl p-0 overflow-hidden"
                  >
                    <ColorPickerPopover
                      moduleId={module.id}
                      moduleName={module.name}
                      currentColor={color}
                      onSave={(id, c) => { onColorSave(id, c); setShowColorPicker(false); }}
                      onClose={() => setShowColorPicker(false)}
                    />
                  </PopoverContent>
                </Popover>
                {module.id !== 'ekpp' && (
                  <button
                    onClick={() => onToggle(module.id, !isEnabled)}
                    className={cn(
                      "p-1.5 rounded-lg border transition-all duration-300",
                      isEventMode
                        ? isEnabled ? "border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : isEnabled ? "border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20" : "border-emerald-200 bg-emerald-50 text-emerald-500 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                    )}
                  >
                    {isEnabled ? <LucideIcons.PowerOff className="w-3.5 h-3.5" /> : <LucideIcons.Power className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className={cn(
            "text-xl font-bold mb-1.5 transition-colors", 
            !canAccess && "opacity-70",
            isEventMode ? "text-white" : "text-slate-900 dark:text-white"
          )}>
            {module.name}
          </h2>
          <p className={cn(
            "text-sm leading-relaxed font-medium transition-colors",
            isEventMode ? "text-white/70" : "text-slate-500 dark:text-white/60"
          )}>
            {module.description}
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-6 flex items-center justify-between">
        <div className={cn(
          "flex items-center gap-1.5 text-xs font-bold transition-all duration-300",
          !canAccess && "opacity-50",
          canAccess && "group-hover:gap-3",
          isEventMode ? "text-white/80 group-hover:text-white" : "text-slate-700 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white"
        )}
        style={canAccess ? { '--hover-color': color } as React.CSSProperties : {}}>
          <span className="group-hover:text-[var(--hover-color)] transition-colors">
            {canAccess ? "Masuk Portal" : "Bakal Tiba"}
          </span>
          <LucideIcons.ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 group-hover:text-[var(--hover-color)]" />
        </div>

        <div className={cn(
          "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md",
          isEventMode ? "bg-white/10 text-white/50" : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40"
        )}>
          {module.tagline}
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
