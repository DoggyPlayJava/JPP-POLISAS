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
import { cn, hexToRgba, getContrastText } from '@/lib/utils';




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
    { label: 'Merah & Burgundy', colors: ['#7B1C1C','#B71C1C','#C62828','#880E4F'] },
    { label: 'Biru & Indigo',    colors: ['#1A237E','#1565C0','#0D47A1','#283593'] },
    { label: 'Hijau & Teal',     colors: ['#1B5E20','#2E7D32','#004D40','#0D7377'] },
    { label: 'Oren & Emas',      colors: ['#E65100','#BF360C','#F57F17','#FF6F00'] },
    { label: 'Ungu & Hitam',     colors: ['#4A148C','#6A1B9A','#212121','#263238'] },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full mt-2 right-0 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={{
        background: 'rgba(12,12,16,0.98)',
        border: `1px solid ${hexToRgba(selectedColor, 0.4)}`,
        backdropFilter: 'blur(24px)',
        maxHeight: '400px',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Live Preview Bar ── */}
      <div
        className="px-5 py-4 transition-all duration-300 flex-shrink-0"
        style={{ background: selectedColor }}
      >
        <p
          className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60 mb-0.5"
          style={{ color: getContrastText(selectedColor) }}
        >
          Pratonton Tema
        </p>
        <p
          className="text-sm font-black tracking-tight"
          style={{ color: getContrastText(selectedColor) }}
        >
          {moduleName}
        </p>
        <p
          className="font-mono text-[11px] font-bold mt-0.5 opacity-70"
          style={{ color: getContrastText(selectedColor) }}
        >
          {selectedColor.toUpperCase()}
        </p>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar">

        {/* ── Color Wheel (sama macam UrusKelab) ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Pilih Warna Bebas</p>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <label className="relative cursor-pointer group flex-shrink-0">
              {/* Preview bulatan atas color input */}
              <div
                className="w-12 h-12 rounded-xl shadow-lg transition-transform group-hover:scale-105 border-2 border-white/20"
                style={{ background: selectedColor }}
              />
              <input
                type="color"
                value={selectedColor}
                onChange={e => sync(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Kod Hex</p>
              <div className="flex items-center gap-2">
                <span className="text-white/40 font-mono text-sm">#</span>
                <input
                  value={hexInput.replace('#', '')}
                  onChange={e => handleHexChange(e.target.value)}
                  placeholder="000000"
                  maxLength={7}
                  className="flex-1 w-full h-8 px-2 rounded-lg text-sm font-mono font-black uppercase tracking-widest outline-none bg-white/5 border border-white/10 text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Preset Groups ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Warna Prasetel</p>
          <div className="space-y-2">
            {PRESET_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-[9px] text-white/25 font-bold uppercase tracking-wider mb-1.5">{group.label}</p>
                <div className="flex gap-2">
                  {group.colors.map(c => (
                    <button
                      key={c}
                      title={c}
                      onClick={() => sync(c)}
                      className="w-10 h-10 rounded-xl transition-all hover:scale-110 active:scale-95 flex-1"
                      style={{
                        background: c,
                        outline: selectedColor === c ? '2px solid white' : '2px solid transparent',
                        outlineOffset: '2px',
                        boxShadow: selectedColor === c ? `0 0 12px ${hexToRgba(c, 0.6)}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Butang Simpan ── */}
        <button
          onClick={() => onSave(moduleId, selectedColor)}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: selectedColor, color: getContrastText(selectedColor) }}
        >
          <Check className="w-4 h-4" />
          Simpan Warna Tema
        </button>
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
      toast('Mode Pratonton Admin — modul belum diaktifkan untuk pengguna.', {
        icon: '👁️',
        style: { fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' },
      });
    }
    navigate(module.basePath);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "relative group rounded-[2.5rem] cursor-pointer select-none h-full min-h-[220px] transition-all duration-500",
        !canAccess && "opacity-80",
        showColorPicker ? "z-50" : "z-10 hover:z-40"
      )}
      onClick={handleClick}
    >
      {/* Background layer */}
      <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 transition-all duration-700 bg-card/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-premium group-hover:border-white/30 rounded-[2.5rem]"
          style={{ boxShadow: `0 20px 40px -15px ${hexToRgba(color, 0.15)}` }}
        />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
      </div>

      <div className="relative z-10 p-7 sm:p-9 h-full flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div 
              className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
              style={{ 
                background: `linear-gradient(135deg, ${hexToRgba(color, 0.25)} 0%, ${hexToRgba(color, 0.1)} 100%)`,
                border: `1.5px solid ${hexToRgba(color, 0.4)}`,
                boxShadow: `0 10px 20px -5px ${hexToRgba(color, 0.3)}`
              }}
            >
              {module.icon}
            </div>

            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              {/* Status Badge */}
              <div 
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300",
                  isEnabled 
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400" 
                    : isPreviewMode 
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400"
                      : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black/40 dark:text-white/40"
                )}
              >
                {isEnabled ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Aktif
                  </div>
                ) : isPreviewMode ? (
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    Pratonton
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Digital
                  </div>
                )}
              </div>

              {/* Admin Tools */}
              {isSuperAdmin && (
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="p-1.5 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground/60 hover:text-foreground transition-all"
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
                        "p-1.5 rounded-full border transition-all duration-300",
                        isEnabled 
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20" 
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20"
                      )}
                    >
                      {isEnabled ? <ToggleRight className="w-4.5 h-4.5" /> : <ToggleLeft className="w-4.5 h-4.5" />}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 dark:opacity-50" style={{ color: color }}>
              {module.tagline}
            </p>
            <h2 className="text-2xl font-black tracking-tight text-foreground group-hover:translate-x-1 transition-transform duration-300">
              {module.name}
            </h2>
            <p className="text-xs font-medium text-foreground/70 dark:text-muted-foreground leading-relaxed max-w-[280px]">
              {module.description}
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div 
            className={cn(
              "inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300",
              canAccess ? "text-foreground group-hover:gap-4" : "text-foreground/30 dark:text-muted-foreground/30"
            )}
          >
            <span>{canAccess ? "Masuk Portal" : "Akan Datang"}</span>
            <ArrowRight className={cn(
              "w-4 h-4 transition-all duration-300",
              canAccess && "translate-x-0 group-hover:translate-x-2"
            )} />
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
    try {
      const { data } = await supabase
        .from('portal_settings')
        .select('exco_module, color, is_enabled');
      if (data) setSettings(data as ExcoColorSetting[]);
    } catch (e) {
      console.error(e);
    } finally {
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

    if (error) { toast.error('Gagal kemaskini tetapan modul.'); return; }

    setSettings(prev => prev.map(s => s.exco_module === moduleId ? { ...s, is_enabled: newState } : s));
    toast.success(`${moduleId} ${newState ? 'diaktifkan' : 'dinyahaktifkan'}.`);
  };

  const handleColorSave = async (moduleId: string, newColor: string) => {
    const { error } = await supabase
      .from('portal_settings')
      .update({ color: newColor, updated_by: profile?.id, updated_at: new Date().toISOString() })
      .eq('exco_module', moduleId);

    if (error) { toast.error('Gagal simpan warna.'); return; }

    setSettings(prev => prev.map(s => s.exco_module === moduleId ? { ...s, color: newColor } : s));
    toast.success('Warna tema dikemaskini! 🎨');
  };

  const displayName = useMemo(() => profile?.full_name?.split(' ')[0] || 'Pelajar', [profile]);
  const mainColor = getExcoColor('ekpp', settings);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 overflow-x-hidden">
      
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full blur-[160px] opacity-[0.15] dark:opacity-[0.08]" 
          style={{ background: mainColor }} 
        />
        <motion.div 
          animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full blur-[140px] opacity-[0.12] bg-amber-500/20" 
        />
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, ${mainColor} 1px, transparent 0)`, backgroundSize: '48px 48px' }} />
      </div>

      <nav className={cn("fixed top-0 inset-x-0 z-50 transition-all duration-500 px-6 py-4 flex items-center justify-between", isScrolled ? "bg-background/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 py-3 shadow-sm" : "bg-transparent")}>
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }} 
            className="w-12 h-12 rounded-2xl bg-white dark:bg-card flex items-center justify-center p-1 shadow-premium border border-black/5 dark:border-white/10"
          >
            <img src="/jpp-logo.png" alt="JPP" className="w-full h-full object-contain" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tighter leading-none">JPP PORTAL</span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Politeknik Polisas</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[9px]">Admin</span>
            </div>
          )}
          
          <div className="hidden md:flex items-center gap-3 px-4 border-l border-black/10 dark:border-white/10 ml-2">
            <div className="text-right">
              <p className="text-xs font-black leading-none">{profile?.full_name}</p>
              <p className="text-[9px] text-foreground/50 dark:text-muted-foreground font-medium uppercase tracking-tight">{profile?.matric_no}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-primary overflow-hidden">
              <User className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={signOut} className="rounded-xl h-10 w-10 lg:w-auto lg:px-5 border-black/10 dark:border-white/10 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 transition-all duration-300">
              <LogOut className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline font-black text-[10px] uppercase tracking-widest">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-24 md:pt-32 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center space-y-8 mb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-card/40 backdrop-blur-md border border-black/5 dark:border-white/5 shadow-premium">
            <div className="relative">
              <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-amber-400/50 blur-lg rounded-full" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground/80">
              Welcome back, <span style={{ color: mainColor }}>{displayName}</span>
            </span>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
            <h1 className="text-4xl md:text-7xl font-black tracking-tighter leading-[0.9] max-w-3xl">Pusat Digital <span className="block text-primary italic">Jawatankuasa Perwakilan Pelajar</span></h1>
            <p className="text-base md:text-xl text-foreground/70 dark:text-muted-foreground/60 font-medium max-w-xl mx-auto leading-relaxed">Teknologi pemacu kepimpinan. Akses semua modul exco JPP dalam satu ekosistem yang bersepadu.</p>
          </motion.div>
        </div>

        <div className="max-w-5xl mx-auto">
          {isLoadingSettings ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Memuatkan Data Portal</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
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

        {isSuperAdmin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-16 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 pt-8 border-t border-black/5 dark:border-white/5">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 dark:opacity-40 hover:opacity-100 transition-opacity"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Terbit</div>
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 dark:opacity-40 hover:opacity-100 transition-opacity"><div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> Pratonton</div>
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 dark:opacity-40 hover:opacity-100 transition-opacity"><div className="w-2 h-2 rounded-full bg-black/20 dark:bg-white/20" /> Pembangunan</div>
          </motion.div>
        )}
      </main>

      <footer className="relative z-10 py-12 px-6 flex flex-col items-center border-t border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 mb-6">
          <img src="/jpp-logo.png" alt="JPP" className="h-6" />
          <div className="h-6 w-[1px] bg-foreground/20" />
          <span className="font-black text-xs tracking-tighter">POLISAS DIGITAL</span>
        </div>
        <p className="text-[9px] font-medium text-muted-foreground/30 dark:text-muted-foreground/30 uppercase tracking-[0.3em]">&copy; 2026 Jawatankuasa Perwakilan Pelajar Polisas</p>
      </footer>
    </div>
  );
}
