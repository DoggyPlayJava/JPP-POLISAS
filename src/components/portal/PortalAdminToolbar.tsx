import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  Power,
  PowerOff,
  Palette,
  Lock,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ExcoModule, ExcoColorSetting, getExcoColor } from '@/config/excoModules';
import { cn, hexToRgba, getContrastText, triggerHaptic } from '@/lib/utils';

// ============================================================
// Color Picker Popover
// Reusable theme color selector with presets and native hex input
// ============================================================
export interface ColorPickerProps {
  moduleId: string;
  moduleName: string;
  currentColor: string;
  onSave: (moduleId: string, color: string) => void;
  onClose?: () => void;
}

export function ColorPickerPopover({
  moduleId,
  moduleName,
  currentColor,
  onSave,
  onClose,
}: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [hexInput, setHexInput] = useState(currentColor);

  const sync = (hex: string) => {
    setSelectedColor(hex);
    setHexInput(hex);
  };

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
                      type="button"
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
          onClick={() => {
            onSave(moduleId, selectedColor);
            onClose?.();
          }}
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

// ============================================================
// Portal Admin Floating Toolbar
// Decoupled executive controls for SuperAdmins
// ============================================================
export interface PortalAdminToolbarProps {
  modules: ExcoModule[];
  settings: ExcoColorSetting[];
  onToggle: (moduleId: string, newState: boolean) => void;
  onColorSave: (moduleId: string, newColor: string) => void;
}

export function PortalAdminToolbar({
  modules,
  settings,
  onToggle,
  onColorSave,
}: PortalAdminToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openColorModuleId, setOpenColorModuleId] = useState<string | null>(null);

  const isModuleEnabled = (moduleId: string): boolean => {
    const setting = settings.find(s => s.exco_module === moduleId);
    if (setting !== undefined) return setting.is_enabled;
    const mod = modules.find(m => m.id === moduleId);
    return mod?.isActive ?? true;
  };

  const liveCount = useMemo(() => {
    return modules.filter(m => isModuleEnabled(m.id)).length;
  }, [modules, settings]);

  const previewCount = useMemo(() => {
    return modules.length - liveCount;
  }, [modules, liveCount]);

  return (
    <div className="fixed bottom-6 z-40 left-1/2 -translate-x-1/2 select-none">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          // Collapsed Floating Pill
          <motion.div
            key="collapsed-pill"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={() => {
              triggerHaptic('light');
              setIsExpanded(true);
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-slate-900/95 dark:bg-black/95 backdrop-blur-xl border border-white/20 text-white shadow-2xl hover:border-white/40 hover:bg-slate-900 dark:hover:bg-black transition-all cursor-pointer group"
          >
            {/* Status indicator pulse */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/90 group-hover:text-white transition-colors">
                PENTADBIR JPP
              </span>
            </div>

            <div className="h-3.5 w-px bg-white/20" />

            {/* Quick Live vs Preview Indicator */}
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/80">
              <span className="text-emerald-400 font-bold">{liveCount} Live</span>
              <span className="text-white/40">/</span>
              <span className="text-amber-400 font-bold">{previewCount} Pratonton</span>
            </div>

            <div className="h-3.5 w-px bg-white/20" />

            {/* Expand action */}
            <div className="flex items-center gap-1 text-[11px] font-bold text-white/70 group-hover:text-white transition-colors">
              <Sliders className="w-3.5 h-3.5" />
              <span>Urus Modul</span>
              <ChevronUp className="w-3.5 h-3.5 ml-0.5 transition-transform group-hover:-translate-y-0.5" />
            </div>
          </motion.div>
        ) : (
          // Expanded Command Dock
          <motion.div
            key="expanded-dock"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="w-[calc(100vw-2rem)] sm:w-[460px] max-w-lg rounded-3xl bg-slate-950/95 dark:bg-black/95 backdrop-blur-2xl border border-white/20 text-white shadow-2xl p-5 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                      PENTADBIR JPP
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/10 text-white/70">
                      Deck Kawalan
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Pengurusan Modul & Tema
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsExpanded(false);
                }}
                className="p-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all"
                title="Tutup Kawalan"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Live vs Preview Status Bar */}
            <div className="flex items-center justify-between py-3 px-3.5 my-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs">
              <span className="text-white/60 font-medium">Status Modul Semasa:</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {liveCount} Aktif (Live)
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {previewCount} Pratonton
                </span>
              </div>
            </div>

            {/* Module Controls List */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {modules.map(mod => {
                const isEnabled = isModuleEnabled(mod.id);
                const currentColor = getExcoColor(mod.id, settings);
                const isCore = mod.id === 'ekpp';

                return (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-colors"
                  >
                    {/* Left: Icon, Name & Status Badge */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 transition-transform"
                        style={{
                          background: hexToRgba(currentColor, 0.15),
                          borderColor: hexToRgba(currentColor, 0.3),
                        }}
                      >
                        <DynamicIcon
                          name={mod.icon}
                          fallback="LayoutDashboard"
                          className="w-5 h-5"
                          style={{ color: currentColor }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">
                            {mod.name}
                          </h4>
                          <span
                            className={cn(
                              "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                              isEnabled
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            )}
                          >
                            {isEnabled ? 'Live' : 'Pratonton'}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/50 truncate max-w-[180px]">
                          {mod.fullName}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions (Color Picker & Power Toggle) */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Theme Palette Popover */}
                      <Popover
                        open={openColorModuleId === mod.id}
                        onOpenChange={open => setOpenColorModuleId(open ? mod.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all flex items-center gap-1.5"
                            title="Tukar Warna Tema"
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
                              style={{ background: currentColor }}
                            />
                            <Palette className="w-3.5 h-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          sideOffset={8}
                          className="w-72 rounded-3xl shadow-2xl border border-white/20 bg-slate-950/95 backdrop-blur-2xl p-0 overflow-hidden text-white"
                        >
                          <ColorPickerPopover
                            moduleId={mod.id}
                            moduleName={mod.name}
                            currentColor={currentColor}
                            onSave={(id, color) => {
                              onColorSave(id, color);
                              setOpenColorModuleId(null);
                            }}
                            onClose={() => setOpenColorModuleId(null)}
                          />
                        </PopoverContent>
                      </Popover>

                      {/* Module Enabled Toggle */}
                      {isCore ? (
                        <div
                          className="p-2 rounded-xl border border-white/5 bg-white/[0.02] text-white/30 cursor-not-allowed"
                          title="Modul Teras (Kekal Aktif)"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('medium');
                            onToggle(mod.id, !isEnabled);
                          }}
                          className={cn(
                            "p-2 rounded-xl border transition-all duration-300",
                            isEnabled
                              ? "border-rose-500/30 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                              : "border-emerald-500/30 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                          )}
                          title={isEnabled ? "Nyahaktifkan Modul" : "Aktifkan Modul"}
                        >
                          {isEnabled ? (
                            <PowerOff className="w-3.5 h-3.5" />
                          ) : (
                            <Power className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PortalAdminToolbar;
