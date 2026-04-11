import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { EXCO_MODULES, getExcoColor, ExcoColorSetting, ExcoModule } from '@/config/excoModules';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
    <div
      className="flex flex-col"
      onClick={e => e.stopPropagation()}
    >
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
  const IconComponent = (LucideIcons as any)[module.icon] || LucideIcons.LayoutDashboard;

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
        style: { borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: '#1e293b', color: '#fff' },
      });
    }
    navigate(module.basePath);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onClick={handleClick}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-[2.5rem] bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-md p-8 hover:bg-black/5 dark:bg-white/10 transition-all duration-500 min-h-[280px] flex flex-col justify-between",
        !canAccess && "opacity-80 grayscale-[0.5] cursor-not-allowed"
      )}
    >
      {/* Hover Gradient Overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
        style={{ background: `linear-gradient(to bottom right, ${hexToRgba(color, 0.1)}, transparent)` }}
      />

      <div className="relative z-10 space-y-6">
        <div className="flex items-start justify-between">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2 shadow-inner transition-transform duration-500 group-hover:scale-110"
            style={{ 
              background: hexToRgba(color, 0.2),
              color: canAccess ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
              boxShadow: `inset 0 0 0 1px ${hexToRgba(color, 0.3)}`
            }}
          >
            <div className="drop-shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              <IconComponent className="w-8 h-8" />
            </div>
          </div>

          <div className="flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
            {/* Status Badge */}
            <div 
              className={cn(
                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-300",
                isEnabled 
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" 
                  : isPreviewMode 
                    ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                    : "bg-black/[0.03] dark:bg-white/5 border-black/5 dark:border-white/10 text-slate- dark:text-white/40"
              )}
            >
              {isEnabled ? (
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" /> Aktif</span>
              ) : isPreviewMode ? (
                <span className="flex items-center gap-1.5"><LucideIcons.Eye className="w-3 h-3" /> Pratonton</span>
              ) : (
                <span className="flex items-center gap-1.5"><LucideIcons.Lock className="w-3 h-3" /> Dikunci</span>
              )}
            </div>

            {/* Admin Tools */}
            {isSuperAdmin && (
              <div className="flex items-center gap-1.5">
                <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "p-2 rounded-xl border border-black/5 dark:border-white/10 bg-black/[0.03] dark:bg-white/5 hover:bg-black/5 dark:bg-white/10 text-slate- dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-all",
                        showColorPicker && "bg-black/10 dark:bg-white/15 text-slate-800 dark:text-white ring-2 ring-black/5 dark:ring-white/10"
                      )}
                    >
                      <LucideIcons.Palette className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    align="end" 
                    sideOffset={16} 
                    className="w-72 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-black/5 dark:border-white/10 bg-slate-900/90 backdrop-blur-3xl p-0 overflow-hidden"
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
                      "p-2 rounded-xl border border-black/5 dark:border-white/10 bg-black/[0.03] dark:bg-white/5 transition-all duration-300",
                      isEnabled 
                        ? "text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/30" 
                        : "text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30"
                    )}
                  >
                    {isEnabled ? <LucideIcons.ToggleRight className="w-5 h-5" /> : <LucideIcons.ToggleLeft className="w-5 h-5" />}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className={cn("text-2xl font-black mb-2 transition-colors", canAccess ? "text-slate-800 dark:text-white" : "text-slate- dark:text-white/60")}>
            {module.name}
          </h2>
          <p className="text-slate- dark:text-white/70 tracking-tight leading-relaxed">
            {module.description}
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-8 flex items-center justify-between">
        <div className={cn(
          "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
          canAccess ? "text-slate-800 dark:text-white group-hover:gap-4" : "text-slate- dark:text-white/30"
        )}>
          <span>{canAccess ? "Akses Modul" : "Bakal Tiba"}</span>
          <LucideIcons.ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
        
        <div className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-black/[0.03] dark:bg-white/5 text-slate- dark:text-white/40">
          {module.tagline}
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
  const navigate = useNavigate();
  const [settings, setSettings] = useState<ExcoColorSetting[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  const isJPPMode = profile?.role === 'JPP' || isSuperAdmin;

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-sans selection:bg-emerald-500/20 overflow-x-hidden transition-colors duration-500 relative flex flex-col">
      
      {/* Keusahawanan Onboarding Style Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full mix-blend-screen opacity-10 bg-amber-600 blur-3xl" />
        <div className="absolute top-[40%] -right-[20%] w-[60vw] h-[60vw] rounded-full mix-blend-screen opacity-10 bg-teal-600 blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 inset-x-0 z-[100] transition-all duration-700 px-4 md:px-8 py-4 flex items-center justify-between",
        isScrolled 
          ? "bg-slate-50 dark:bg-slate-950/80 backdrop-blur-md border-b border-black-[0.03] dark:border-white/5 py-3 shadow-2xl" 
          : "bg-transparent"
      )}>
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 2 }} 
            className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-black/[0.03] dark:bg-white/5 flex items-center justify-center p-1.5 shadow-2xl border border-black/5 dark:border-white/10 backdrop-blur-xl"
          >
            <img src="/jpp-logo.png" alt="JPP" className="w-full h-full object-contain" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-sm md:text-base font-black tracking-tighter leading-none text-slate-800 dark:text-white">JPP PORTAL</span>
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate- dark:text-white/50">Politeknik Polisas</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {isJPPMode && (
            <button 
              onClick={() => navigate('/jpp-admin')}
              className="hidden lg:flex items-center gap-2 px-4 py-2 hover:bg-black/5 dark:bg-white/10 transition-colors rounded-full bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/10 text-slate-800 dark:text-white shadow-xl"
            >
              <LucideIcons.Crown className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Global JPP Dashboard</span>
            </button>
          )}
          {isSuperAdmin && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <LucideIcons.ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Akses Admin</span>
            </div>
          )}
          
          <div className="hidden sm:flex items-center gap-3 px-4 py-1 border-x border-black/5 dark:border-white/10">
            <div className="text-right">
              <p className="text-xs font-black leading-none text-slate-800 dark:text-white">{profile?.full_name?.split(' ').slice(0, 2).join(' ')}</p>
              <p className="text-[9px] text-slate- dark:text-white/50 font-black uppercase tracking-widest mt-0.5">{profile?.matric_no}</p>
            </div>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center text-slate- dark:text-white/50 overflow-hidden shadow-inner">
              <LucideIcons.User className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block border-r border-black/10 dark:border-white/10 h-6 mx-2" />
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={signOut} 
              className="rounded-xl h-10 w-10 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:bg-white/10 transition-all border border-transparent hover:border-black/5 dark:border-white/10"
            >
              <LucideIcons.LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 md:pt-40 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Title Section */}
        <div className="flex flex-col items-center text-center mb-16 md:mb-24 space-y-6 md:space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-lg backdrop-blur-md"
          >
            <LucideIcons.Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate- dark:text-white/50">
              EKOSISTEM DIGITAL V2.0
            </span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
           ber>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1] max-w-4xl mx-auto text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
              Selamat kembali, <br />
              <span className="text-emerald-400">
                {displayName}
              </span>
            </h1>
            <p className="text-sm md:text-lg text-slate- dark:text-white/50 font-medium max-w-2xl mx-auto leading-relaxed px-4">
              Platform bersepadu untuk pengurusan kelab, perniagaan, dan aktiviti JPP Polisas. <br className="hidden md:block" />
              Bawa kepimpinan anda ke tahap seterusnya.
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
            <AdminStatusIndicator color="bg-emerald-400" label="Sistem Operasi (Live)" />
            <AdminStatusIndicator color="bg-amber-400" label="Pratonton Pentadbir" />
            <AdminStatusIndicator color="bg-black/20 dark:bg-white/20" label="Dalam Pembangunan" />
          </motion.div>
        )}
      </main>

      <footer className="relative z-10 py-16 px-6 border-t border-black/5 dark:border-white/10 mt-auto bg-black/20 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-8">
          <div className="flex items-center gap-4 opacity-50 hover:opacity-100 transition-all duration-700">
            <img src="/jpp-logo.png" alt="JPP" className="h-8 brightness-0 invert" />
            <div className="h-8 w-px bg-black/20 dark:bg-white/20" />
            <div className="flex flex-col text-left text-slate-800 dark:text-white">
              <span className="font-black text-xs tracking-tight">POLISAS DIGITAL</span>
              <span className="text-[8px] font-black uppercase tracking-widest opacity-60">EST. 2026</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate- dark:text-white/40 uppercase tracking-[0.4em] max-w-md mx-auto leading-loose">
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
      <div className={cn("w-2 h-2 rounded-full", color, "shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(255,255,255,0.2)]")} />
      <span className="text-[9px] font-black uppercase tracking-widest text-slate- dark:text-white/50">{label}</span>
    </div>
  );
}
