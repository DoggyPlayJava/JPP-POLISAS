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
import { PortalSidebar } from '@/components/layout/PortalSidebar';
import { Menu } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { usePushNotifications } from '@/hooks/usePushNotifications';

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
  const { profile, signOut, isSuperAdmin, isKebajikanExco, hasKebajikanAccess } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<ExcoColorSetting[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Kebajikan live stats
  const [kbStats, setKbStats] = useState<{ open: number; resolved: number; rating: number | null } | null>(null);

  const isJPPMode = profile?.role === 'JPP' || isSuperAdmin;

  // PolyMart live stats
  const [polyMartStats, setPolyMartStats] = useState<{ listings: number; businesses: number } | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mesej popup notifikasi push universal
  const { isSupported, permission, isSubscribed, requestPermission } = usePushNotifications();
  const pushPromptShownRef = useRef(false); // Hanya tunjuk sekali per session

  useEffect(() => {
    if (!isSupported) return;
    if (permission === 'denied') return;
    if (permission === 'granted' && isSubscribed === true) return; // Semua OK, tak perlu prompt
    if (isSubscribed === null) return; // Masih loading
    if (pushPromptShownRef.current) return; // Dah tunjuk dalam session ini

    // Semak cooldown 7 hari (selepas user tekan Nanti atau Baiki)
    const dismissedAt = localStorage.getItem('push_prompt_dismissed_at');
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return; // Jangan tunjuk dalam 7 hari
    }

    const timer = setTimeout(() => {
      if (pushPromptShownRef.current) return; // Double-check
      pushPromptShownRef.current = true;

      const dismiss = (toastId: string) => {
        localStorage.setItem('push_prompt_dismissed_at', Date.now().toString());
        toast.dismiss(toastId);
      };

      toast.custom(
        (t) => (
          <div
            style={{
              background: 'var(--background, #1e293b)',
              color: 'var(--foreground, #f1f5f9)',
              border: '1px solid var(--border, rgba(255,255,255,0.12))',
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              minWidth: '300px',
              maxWidth: '360px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              opacity: t.visible ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0, marginTop: '2px' }}>🔔</div>
              <div>
                <p style={{ fontWeight: 800, fontSize: '14px', margin: 0, lineHeight: 1.3 }}>
                  {permission === 'granted' ? 'Baiki Notifikasi Push' : 'Hidupkan Notifikasi Push'}
                </p>
                <p style={{ fontSize: '12px', margin: '4px 0 0', opacity: 0.65, lineHeight: 1.4 }}>
                  {permission === 'granted'
                    ? 'Sambungan notifikasi peranti ini terputus. Klik baiki untuk aktifkan semula.'
                    : 'Supaya anda sentiasa tahu bila ada kemas kini penting dari JPP.'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => dismiss(t.id)}
                style={{
                  appearance: 'none', border: '1px solid rgba(148,163,184,0.3)',
                  background: 'rgba(148,163,184,0.15)', color: 'inherit',
                  padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >Nanti</button>
              <button
                onClick={async () => {
                  dismiss(t.id);
                  const result = await requestPermission();
                  if (result === 'granted') {
                    localStorage.removeItem('push_prompt_dismissed_at');
                    toast.success('Notifikasi diaktifkan! ✅');
                  }
                }}
                style={{
                  appearance: 'none', border: 'none',
                  background: '#2563eb', color: '#ffffff',
                  padding: '6px 14px', borderRadius: '8px', fontSize: '12px',
                  fontWeight: 700, cursor: 'pointer',
                }}
              >
                {permission === 'granted' ? 'Baiki Sekarang' : 'Benarkan'}
              </button>
            </div>
          </div>
        ),
        { duration: Infinity, id: 'push-permission-prompt', style: { background: 'transparent', padding: 0, boxShadow: 'none' } }
      );
    }, 4000);
    return () => clearTimeout(timer);
  }, [isSupported, permission, isSubscribed, requestPermission]);

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

  // Fetch live kebajikan stats
  useEffect(() => {
    const load = async () => {
      const [openRes, resolvedRes, ratingRes] = await Promise.all([
        supabase.from('kebajikan_tickets').select('id', { count: 'exact', head: true }).not('status', 'in', '(RESOLVED,CLOSED,CANCELLED)'),
        supabase.from('kebajikan_tickets').select('id', { count: 'exact', head: true }).in('status', ['RESOLVED', 'CLOSED']),
        supabase.from('kebajikan_tickets').select('rating').not('rating', 'is', null),
      ]);
      const ratings = (ratingRes.data || []).map((r: any) => r.rating as number);
      const avg = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null;
      setKbStats({ open: openRes.count ?? 0, resolved: resolvedRes.count ?? 0, rating: avg });
    };
    load();
  }, []);

  // Fetch PolyMart live stats
  useEffect(() => {
    const loadPolyMart = async () => {
      const [listingsRes, bizRes] = await Promise.all([
        supabase.from('business_products').select('id', { count: 'exact', head: true }).eq('publish_to_polymart', true).eq('is_available', true),
        supabase.from('keusahawanan_businesses').select('id', { count: 'exact', head: true }).eq('polymart_is_active', true).eq('status', 'ACTIVE'),
      ]);
      setPolyMartStats({ listings: listingsRes.count ?? 0, businesses: bizRes.count ?? 0 });
    };
    loadPolyMart();
  }, []);

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
      
      <PortalSidebar 
        isOpen={isSidebarOpen} 
        onOpen={() => setIsSidebarOpen(true)} 
        onClose={() => setIsSidebarOpen(false)} 
        settings={settings}
      />
      
      {/* Keusahawanan Onboarding Style Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full mix-blend-screen opacity-10 bg-amber-600 blur-3xl" />
        <div className="absolute top-[40%] -right-[20%] w-[60vw] h-[60vw] rounded-full mix-blend-screen opacity-10 bg-teal-600 blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 inset-x-0 z-[100] transition-all duration-700 px-4 md:px-8 py-4 flex items-center justify-between",
        isScrolled 
          ? "bg-slate-50 dark:bg-slate-950/80 backdrop-blur-md border-b border-black/[0.03] dark:border-white/5 py-3 shadow-2xl" 
          : "bg-transparent"
      )}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div 
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => setIsSidebarOpen(true)}
          >
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 2 }} 
              className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-black/[0.03] dark:bg-white/5 flex items-center justify-center p-1.5 shadow-2xl border border-black/5 dark:border-white/10 backdrop-blur-xl group-hover:border-emerald-500/30 transition-all"
            >
              <img src="/jpp-logo.png" alt="JPP" className="w-full h-full object-contain" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-sm md:text-base font-black tracking-tighter leading-none text-slate-800 dark:text-white">JPP PORTAL</span>
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate- dark:text-white/50">Politeknik Polisas</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <ThemeToggle />
          <NotificationBell />
          
          <div 
            className="flex items-center gap-3 pl-4 border-l border-black/5 dark:border-white/10 cursor-pointer group"
            onClick={() => setIsSidebarOpen(true)}
          >
            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-black text-slate-800 dark:text-white group-hover:text-emerald-500 transition-colors uppercase tracking-widest leading-none mb-0.5">{profile?.full_name?.split(' ')[0]}</p>
              <div className="flex items-center justify-end gap-1.5 opacity-40">
                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em]">{profile?.role || 'STUDENT'}</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center text-slate- dark:text-white/50 overflow-hidden shadow-inner group-hover:border-emerald-500/30 transition-all">
              <Avatar className="w-full h-full rounded-none">
                <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
                <AvatarFallback className="bg-transparent text-slate-400 dark:text-white/50 text-xs font-black">
                  {profile?.full_name?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>
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
            <LucideIcons.Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 dark:text-white/50">
              EKOSISTEM DIGITAL V2.0
            </span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1] max-w-4xl mx-auto text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-600 dark:from-white dark:to-white/60">
              Selamat kembali, <br />
              <span className="text-emerald-500 dark:text-emerald-400">
                {displayName}
              </span>
            </h1>
            <p className="text-sm md:text-lg text-slate-500 dark:text-white/50 font-medium max-w-2xl mx-auto leading-relaxed px-4">
              Platform bersepadu untuk pengurusan kelab, perniagaan, dan aktiviti JPP Polisas. <br className="hidden md:block" />
              Bawa kepimpinan anda ke tahap seterusnya.
            </p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="pt-6 sm:pt-8 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6"
            >
              <button
                onClick={() => {
                  if (!isModuleEnabled('akademik') && !isSuperAdmin) {
                    toast('Modul E-Akademik sedang dikemas kini!', { icon: '🚧' });
                    return;
                  }
                  if (!isModuleEnabled('akademik') && isSuperAdmin) {
                    toast.success('Admin Preview Mode Active', {
                      icon: '👁️',
                      style: { borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: '#1e293b', color: '#fff' },
                    });
                  }
                  navigate('/akademik/qr');
                }}
                className={cn(
                  "group relative flex flex-nowrap items-center justify-center gap-4 px-6 sm:px-8 py-4 sm:py-5 rounded-[2rem] sm:rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black tracking-wide sm:tracking-widest transition-all overflow-hidden border border-black/10 dark:border-white/10 w-full sm:w-auto min-w-[280px]",
                  (!isModuleEnabled('akademik') && !isSuperAdmin) 
                    ? "opacity-60 grayscale-[0.8] cursor-not-allowed" 
                    : "hover:scale-105 active:scale-[0.98] shadow-[0_20px_50px_-12px_rgba(16,185,129,0.3)] dark:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.15)]"
                )}
              >
                {/* Sweep effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/20 to-emerald-400/0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                
                {/* Icon wrapper */}
                <div className="w-12 h-12 sm:w-10 sm:h-10 rounded-2xl sm:rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 dark:text-emerald-600 shrink-0 shadow-inner">
                  <LucideIcons.QrCode className="w-6 h-6 sm:w-5 sm:h-5" />
                </div>
                
                {/* Text section */}
                <div className="flex flex-col items-start gap-0.5 text-left pr-4">
                  <span className="text-[13px] sm:text-sm uppercase tracking-widest leading-none mt-0.5">Scan QR Merit</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 normal-case font-medium tracking-normal mt-1">Imbas pantas kumpul merit</span>
                </div>

                {/* Right button/icon */}
                <div className="hidden sm:flex w-10 h-10 rounded-full bg-slate-800 dark:bg-black/10 items-center justify-center">
                  <LucideIcons.Camera className="w-4 h-4 text-emerald-400 dark:text-emerald-600 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" />
                </div>
              </button>

              {/* ── Widget PolyMart ── */}
              {isModuleEnabled('keusahawanan') || isSuperAdmin ? (
                <button
                  onClick={() => {
                    if (!isModuleEnabled('keusahawanan') && !isSuperAdmin) {
                      toast('PolyMart tidak aktif ketika ini!', { icon: '🚧' });
                      return;
                    }
                    navigate('/polymart');
                  }}
                  className={cn(
                    "group relative flex flex-nowrap items-center justify-center gap-4 px-6 sm:px-8 py-4 sm:py-5 rounded-[2rem] sm:rounded-full font-black tracking-wide sm:tracking-widest transition-all overflow-hidden border w-full sm:w-auto min-w-[280px]",
                    "bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/15 dark:to-orange-500/10 text-slate-900 dark:text-white border-amber-500/20 dark:border-amber-500/25",
                    (!isModuleEnabled('keusahawanan') && !isSuperAdmin)
                      ? "opacity-60 grayscale-[0.8] cursor-not-allowed"
                      : "hover:scale-105 active:scale-[0.98] shadow-[0_20px_50px_-12px_rgba(245,158,11,0.25)] dark:shadow-[0_20px_50px_-12px_rgba(245,158,11,0.15)] hover:border-amber-500/35"
                  )}
                >
                  {/* Sweep shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/15 to-amber-400/0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />

                  {/* Icon */}
                  <div className="w-12 h-12 sm:w-10 sm:h-10 rounded-2xl sm:rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden">
                    <LucideIcons.ShoppingBag className="w-6 h-6 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-400 rounded-full opacity-60 group-hover:scale-150 transition-transform duration-500" />
                  </div>

                  {/* Text */}
                  <div className="flex flex-col items-start gap-0.5 text-left pr-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] sm:text-sm uppercase tracking-widest leading-none mt-0.5">PolyMart</span>
                      <span className="text-[8px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                        BETA
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 normal-case font-medium tracking-normal mt-1">
                      {polyMartStats ? `${polyMartStats.listings} produk • ${polyMartStats.businesses} peniaga` : 'Marketplace Pelajar'}
                    </span>
                  </div>

                  {/* Right arrow */}
                  <div className="hidden sm:flex w-10 h-10 rounded-full bg-amber-500/10 dark:bg-amber-500/15 items-center justify-center flex-shrink-0">
                    <LucideIcons.ArrowRight className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </button>
              ) : null}
              {!hasKebajikanAccess && (
                <button
                  onClick={() => {
                    if (!isModuleEnabled('kebajikan') && !isSuperAdmin) {
                      toast('Modul E-Kebajikan sedang dikemas kini!', { icon: '🚧' });
                      return;
                    }
                    if (!isModuleEnabled('kebajikan') && isSuperAdmin) {
                      toast.success('Admin Preview Mode Active', {
                        icon: '👁️',
                        style: { borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: '#1e293b', color: '#fff' },
                      });
                    }
                    navigate('/kebajikan/buat-aduan');
                  }}
                  className={cn(
                    "group relative flex flex-nowrap items-center justify-center gap-4 px-6 sm:px-8 py-4 sm:py-5 rounded-[2rem] sm:rounded-full bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white font-black tracking-wide sm:tracking-widest transition-all overflow-hidden border border-black/5 dark:border-teal-500/20 w-full sm:w-auto min-w-[280px] backdrop-blur-md",
                    (!isModuleEnabled('kebajikan') && !isSuperAdmin)
                      ? "opacity-60 grayscale-[0.8] cursor-not-allowed"
                      : "hover:scale-105 active:scale-[0.98] shadow-[0_20px_50px_-12px_rgba(45,212,191,0.2)] dark:shadow-[0_20px_50px_-12px_rgba(45,212,191,0.1)] hover:bg-slate-50 dark:hover:bg-slate-900/80"
                  )}
                >
                  {/* Sweep effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-400/0 via-teal-400/10 to-teal-400/0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                  
                  {/* Icon wrapper */}
                  <div className="w-12 h-12 sm:w-10 sm:h-10 rounded-2xl sm:rounded-xl bg-teal-500/10 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 shadow-inner">
                    <LucideIcons.MessageSquarePlus className="w-6 h-6 sm:w-5 sm:h-5" />
                  </div>
                  
                  {/* Text section */}
                  <div className="flex flex-col items-start gap-0.5 text-left pr-4">
                    <span className="text-[13px] sm:text-sm uppercase tracking-widest leading-none mt-0.5">Buat Aduan</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 normal-case font-medium tracking-normal mt-1">Salurkan aduan terus ke JPP</span>
                  </div>

                  {/* Right button/icon */}
                  <div className="hidden sm:flex w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 items-center justify-center">
                    <LucideIcons.ArrowRight className="w-4 h-4 text-teal-600 dark:text-teal-400 group-hover:scale-110 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </button>
              )}

              {/* ── E-Kebajikan Live Stats Widget (EXCO ONLY) ── */}
              {hasKebajikanAccess && (
                <div
                  className={cn(
                    "rounded-[2rem] border overflow-hidden shadow-2xl w-full sm:w-auto min-w-[280px] transition-transform duration-300 bg-black/[0.02] dark:bg-white/[0.02]",
                    (!isModuleEnabled('kebajikan') && !isSuperAdmin) 
                      ? "opacity-60 grayscale-[0.8]" 
                      : "hover:scale-[1.02]"
                  )}
                  style={{ borderColor: 'rgba(45,212,191,0.15)' }}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between gap-3 px-5 py-3.5 group transition-all",
                      (!isModuleEnabled('kebajikan') && !isSuperAdmin) 
                        ? "cursor-not-allowed" 
                        : "cursor-pointer hover:bg-teal-500/5"
                    )}
                    onClick={() => {
                      if (!isModuleEnabled('kebajikan') && !isSuperAdmin) {
                        toast('Modul E-Kebajikan sedang dikemas kini!', { icon: '🚧' });
                        return;
                      }
                      if (!isModuleEnabled('kebajikan') && isSuperAdmin) {
                        toast.success('Admin Preview Mode Active', {
                          icon: '👁️',
                          style: { borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: '#1e293b', color: '#fff' },
                        });
                      }
                      navigate('/kebajikan');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform" style={{ background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.3)' }}>
                        <LucideIcons.HeartHandshake className="w-5 h-5" style={{ color: '#2DD4BF' }} />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest" style={{ color: '#2DD4BF' }}>Dashboard Aduan</span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 tracking-wider">Pusat Urusan E-Kebajikan</span>
                      </div>
                    </div>
                    <LucideIcons.ArrowRight className="w-4 h-4 flex-shrink-0 text-white/20 group-hover:translate-x-1 transition-all" style={{ color: 'rgba(45,212,191,0.5)' }} />
                  </div>

                  {/* Live stats row */}
                  <div className="grid grid-cols-3" style={{ borderTop: '1px solid rgba(45,212,191,0.08)' }}>
                    <div className="flex flex-col items-center py-2.5 px-2">
                       <p className="text-base sm:text-lg font-black text-slate-800 dark:text-white leading-none">{kbStats ? kbStats.open : '—'}</p>
                       <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Aktif</p>
                    </div>
                    <div className="flex flex-col items-center py-2.5 px-2" style={{ borderLeft: '1px solid rgba(45,212,191,0.08)' }}>
                       <p className="text-base sm:text-lg font-black text-emerald-500 dark:text-emerald-400 leading-none">{kbStats ? kbStats.resolved : '—'}</p>
                       <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Selesai</p>
                    </div>
                    <div className="flex flex-col items-center py-2.5 px-2" style={{ borderLeft: '1px solid rgba(45,212,191,0.08)' }}>
                       <p className="text-base sm:text-lg font-black text-amber-500 dark:text-amber-400 leading-none">{kbStats?.rating != null ? kbStats.rating.toFixed(1) : '—'}</p>
                       <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Rating</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* JPP-only HQ Banner (persistent, always visible) */}
        {isJPPMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => navigate('/jpp')}
            className="mb-12 cursor-pointer group flex items-center gap-4 px-5 py-4 rounded-[1.75rem] bg-amber-500/10 dark:bg-amber-500/[0.06] border border-amber-500/20 dark:border-amber-500/15 hover:bg-amber-500/15 dark:hover:bg-amber-500/10 hover:border-amber-500/30 dark:hover:border-amber-500/25 transition-all duration-300 max-w-2xl mx-auto"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 dark:bg-amber-500/15 border border-amber-500/30 dark:border-amber-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <LucideIcons.Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest">JPP HQ Portal</p>
              <p className="text-[11px] text-amber-900/60 dark:text-white/40 mt-0.5">Portal eksklusif untuk semua ahli JPP — klik untuk masuk</p>
            </div>
            <LucideIcons.ArrowRight className="w-4 h-4 text-amber-600/50 dark:text-amber-400/50 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </motion.div>
        )}

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

      {/* Global Floating AI Chat for Portal */}
      <FloatingAiChat />
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
