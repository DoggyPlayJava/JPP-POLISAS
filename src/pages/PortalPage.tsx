import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { EXCO_MODULES, getExcoColor, ExcoColorSetting, ExcoModule } from '@/config/excoModules';
import { Sparkles, LogOut, ArrowRight, Lock, Eye, ShieldCheck, ToggleLeft, ToggleRight, Palette, X, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { toast } from 'react-hot-toast';
import { cn, hexToRgba, getContrastText, getMalaysianNickname } from '@/lib/utils';




// ─── Color Picker Popover ───
interface ColorPickerProps {
  moduleId: string;
  moduleName: string;
  currentColor: string;
  onSave: (moduleId: string, color: string) => void;
  onClose: () => void;
}

function ColorPickerPopover({ moduleId, moduleName, currentColor, onSave, onClose }: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [hexInput, setHexInput]           = useState(currentColor);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

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
    { label: 'Primary & Corporate', colors: ['#7B1C1C','#1A237E','#1B5E20','#E65100','#4A148C'] },
    { label: 'Modern Vibrancy',    colors: ['#F43F5E','#3B82F6','#10B981','#F59E0B','#8B5CF6'] },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 12 }}
      className="absolute top-full mt-4 right-0 z-[100] w-72 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col border border-white/10 dark:border-white/5 bg-card/80 backdrop-blur-3xl"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Customize Theme</h4>
            <p className="text-xs font-bold truncate max-w-[140px]">{moduleName}</p>
          </div>
          <div 
            className="w-10 h-10 rounded-2xl shadow-inner border border-white/20"
            style={{ background: selectedColor }}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10">
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
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Kad Exco (Premium Bento Style)
// ─────────────────────────────────────────────
interface ExcoCardProps {
  module: ExcoModule;
  color: string;
  index: number;
  isEnabled: boolean;
  isSuperAdmin: boolean;
  onToggle: (moduleId: string, newState: boolean) => void;
  onColorSave: (moduleId: string, color: string) => void;
}

function ExcoCard({ module, color, index, isEnabled, isSuperAdmin, onToggle, onColorSave }: ExcoCardProps) {
  const navigate = useNavigate();
  const [showColorPicker, setShowColorPicker] = useState(false);

  const canAccess = isEnabled || isSuperAdmin;
  const isPreviewMode = !isEnabled && isSuperAdmin;

  const handleClick = () => {
    if (!canAccess) {
      toast(`${module.name} bakal tiba tidak lama lagi!`, {
        icon: '🚀',
        duration: 2500,
      });
      return;
    }
    
    if (isPreviewMode) {
      toast.success('Admin Preview Mode Active', {
        icon: '👁️',
        style: { borderRadius: '12px', fontSize: '12px', fontWeight: 600 },
      });
    }
    navigate(module.basePath);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative group rounded-[2.5rem] overflow-visible transition-all duration-500",
        !canAccess && "opacity-80 grayscale-[0.5]"
      )}
    >
      <div 
        className="absolute inset-x-0 -bottom-2 h-full rounded-[2.5rem] bg-black/5 dark:bg-black/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: hexToRgba(color, 0.1) }}
      />

      <div 
        onClick={handleClick}
        className={cn(
          "relative h-full min-h-[260px] p-8 rounded-[2.5rem] border border-white/10 dark:border-white/5 bg-card/40 backdrop-blur-2xl transition-all duration-500 cursor-pointer flex flex-col justify-between overflow-hidden",
          "hover:bg-card/60 hover:border-white/20 dark:hover:border-white/10",
          !canAccess && "cursor-not-allowed"
        )}
      >
        {/* Decorative Background Blob */}
        <div 
          className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity duration-700" 
          style={{ background: color }}
        />

        <div className="relative z-10 space-y-6">
          <div className="flex items-start justify-between">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3"
              style={{ 
                background: `linear-gradient(135deg, ${hexToRgba(color, 0.3)} 0%, ${hexToRgba(color, 0.1)} 100%)`,
                border: `1.5px solid ${hexToRgba(color, 0.2)}`,
                boxShadow: `0 12px 24px -8px ${hexToRgba(color, 0.4)}`
              }}
            >
              <div className="drop-shadow-sm">{module.icon}</div>
            </div>

            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              {/* Status Badge */}
              <div 
                className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest border backdrop-blur-md transition-all duration-300",
                  isEnabled 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                    : isPreviewMode 
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                      : "bg-white/5 border-white/10 text-muted-foreground/60"
                )}
              >
                {isEnabled ? (
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live</span>
                ) : isPreviewMode ? (
                  <span className="flex items-center gap-1.5"><Eye className="w-3 h-3" /> Preview</span>
                ) : (
                  <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> Locked</span>
                )}
              </div>

              {/* Admin Tools */}
              {isSuperAdmin && (
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className={cn(
                        "p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all",
                        showColorPicker && "bg-white/15 text-foreground ring-2 ring-white/10"
                      )}
                    >
                      <Palette className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {showColorPicker && (
                        <ColorPickerPopover
                          moduleId={module.id}
                          moduleName={module.name}
                          currentColor={color}
                          onSave={(id, c) => { onColorSave(id, c); setShowColorPicker(false); }}
                          onClose={() => setShowColorPicker(false)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  {module.id !== 'ekpp' && (
                    <button
                      onClick={() => onToggle(module.id, !isEnabled)}
                      className={cn(
                        "p-2 rounded-xl border border-white/10 bg-white/5 transition-all duration-300",
                        isEnabled 
                          ? "text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20" 
                          : "text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/20"
                      )}
                    >
                      {isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
              {module.name}
            </h3>
            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
              {module.description}
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-8 flex items-center justify-between">
          <div className={cn(
            "flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300",
            canAccess ? "text-foreground group-hover:gap-4" : "text-muted-foreground/30"
          )}>
            <span>{canAccess ? "Access Module" : "Coming Soon"}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </div>
          
          <div 
            className="text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg bg-black/5 dark:bg-white/5 text-muted-foreground/40"
          >
            {module.tagline}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// PortalPage Utama
// ─────────────────────────────────────────────
export function PortalPage() {
  const { profile, signOut, isSuperAdmin } = useAuth();
  const [settings, setSettings] = useState<ExcoColorSetting[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchSettings = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const { data, error } = await supabase
        .from('portal_settings')
        .select('exco_module, color, is_enabled')
        .abortSignal(controller.signal);
        
      if (data) setSettings(data as ExcoColorSetting[]);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.warn('⚠️ Supabase slow response (Timeout 5s). Using defaults.');
      } else {
        console.error('Portal settings fetch error:', e);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const isModuleEnabled = (moduleId: string): boolean => {
    const s = settings.find(s => s.exco_module === moduleId);
    return s ? s.is_enabled : moduleId === 'ekpp';
  };

  const handleToggle = async (moduleId: string, newState: boolean) => {
    const { error } = await supabase
      .from('portal_settings')
      .update({ is_enabled: newState, updated_by: profile?.id, updated_at: new Date().toISOString() })
      .eq('exco_module', moduleId);

    if (error) { toast.error('Failed to update status.'); return; }

    setSettings(prev => prev.map(s => s.exco_module === moduleId ? { ...s, is_enabled: newState } : s));
    toast.success(`${moduleId} ${newState ? 'enabled' : 'disabled'}.`);
  };

  const handleColorSave = async (moduleId: string, newColor: string) => {
    const { error } = await supabase
      .from('portal_settings')
      .update({ color: newColor, updated_by: profile?.id, updated_at: new Date().toISOString() })
      .eq('exco_module', moduleId);

    if (error) { toast.error('Failed to save color.'); return; }

    setSettings(prev => prev.map(s => s.exco_module === moduleId ? { ...s, color: newColor } : s));
    toast.success('Theme color updated! 🎨');
  };

  const displayName = useMemo(() => getMalaysianNickname(profile?.full_name) || 'Student', [profile]);
  const mainColor = getExcoColor('ekpp', settings);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 overflow-x-hidden transition-colors duration-500">
      
      {/* Cinematic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -right-[10%] w-[70vw] h-[70vw] rounded-full blur-[120px] opacity-[0.1] dark:opacity-[0.05]" 
          style={{ background: mainColor }} 
        />
        <motion.div 
          animate={{ x: [0, -80, 0], y: [0, 100, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full blur-[140px] opacity-[0.08] bg-amber-500/10" 
        />
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, ${mainColor} 1px, transparent 0)`, 
            backgroundSize: '40px 40px' 
          }} 
        />
      </div>

      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 inset-x-0 z-[100] transition-all duration-700 px-4 md:px-8 py-4 flex items-center justify-between",
        isScrolled 
          ? "bg-background/60 backdrop-blur-2xl border-b border-white/5 py-3 shadow-2xl" 
          : "bg-transparent"
      )}>
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 2 }} 
            className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-card flex items-center justify-center p-1.5 shadow-2xl border border-white/10"
          >
            <img src="/jpp-logo.png" alt="JPP" className="w-full h-full object-contain" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-sm md:text-base font-bold tracking-tighter leading-none text-foreground">JPP PORTAL</span>
            <span className="text-[8px] md:text-[10px] font-medium uppercase tracking-[0.2em] opacity-40 text-foreground">Politeknik Polisas</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {isSuperAdmin && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Admin Control</span>
            </div>
          )}
          
          <div className="hidden sm:flex items-center gap-3 px-4 py-1 border-x border-white/10 dark:border-white/5">
            <div className="text-right">
              <p className="text-xs font-bold leading-none text-foreground">{profile?.full_name?.split(' ').slice(0, 2).join(' ')}</p>
              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight mt-0.5">{profile?.matric_no}</p>
            </div>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-white/5 dark:bg-white/10 border border-white/10 dark:border-white/5 flex items-center justify-center text-primary overflow-hidden shadow-inner">
              <User className="w-5 h-5 opacity-50" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={signOut} 
              className="rounded-xl h-10 w-10 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 md:pt-40 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-16 md:mb-24 space-y-6 md:space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/40 backdrop-blur-xl border border-white/10 dark:border-white/5 shadow-lg"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              V2.0 DIGITAL ECOSYSTEM
            </span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] max-w-4xl mx-auto text-foreground">
              Welcome back, <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-amber-500">
                {displayName}
              </span>
            </h1>
            <p className="text-sm md:text-lg text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed px-4">
              Integrated leadership technology platform for JPP Polisas. <br className="hidden md:block" />
              Access all exco modules within a unified, high-performance ecosystem.
            </p>
          </motion.div>
        </div>

        {/* Modules Grid */}
        <div className="max-w-6xl mx-auto">
          {isLoadingSettings ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-2 border-primary/20 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-t-2 border-primary rounded-full animate-spin" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50 animate-pulse">Initializing Portal</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 lg:gap-10">
              {EXCO_MODULES.map((mod, i) => (
                <ExcoCard
                  key={mod.id}
                  module={mod}
                  color={getExcoColor(mod.id, settings)}
                  index={i}
                  isEnabled={isModuleEnabled(mod.id)}
                  isSuperAdmin={isSuperAdmin}
                  onToggle={handleToggle}
                  onColorSave={handleColorSave}
                />
              ))}
            </div>
          )}
        </div>

        {/* Global Admin Status Line */}
        {isSuperAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-20 flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-40 hover:opacity-100 transition-opacity duration-500"
          >
            <AdminStatusIndicator color="bg-emerald-500" label="Production Live" />
            <AdminStatusIndicator color="bg-amber-500" label="Administrative Preview" />
            <AdminStatusIndicator color="bg-white/20" label="Under Development" />
          </motion.div>
        )}
      </main>

      <footer className="relative z-10 py-16 px-6 border-t border-white/5 bg-background/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-8">
          <div className="flex items-center gap-4 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
            <img src="/jpp-logo.png" alt="JPP" className="h-8" />
            <div className="h-8 w-px bg-foreground/20" />
            <div className="flex flex-col text-left text-foreground">
              <span className="font-bold text-xs tracking-tight">POLISAS DIGITAL</span>
              <span className="text-[8px] font-medium tracking-widest opacity-60">EST. 2026</span>
            </div>
          </div>
          <p className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-[0.4em] max-w-md mx-auto leading-loose">
            &copy; 2026 Jawatankuasa Perwakilan Pelajar <br />
            Politeknik Sultan Haji Ahmad Shah
          </p>
        </div>
      </footer>
    </div>
  );
}

function AdminStatusIndicator({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-2 h-2 rounded-full", color, "shadow-[0_0_10px_rgba(255,255,255,0.2)]")} />
      <span className="text-[9px] font-bold uppercase tracking-widest text-foreground opacity-60">{label}</span>
    </div>
  );
}
