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
import { useKarnivalStatus } from '@/contexts/KarnivalContext';

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
  karnivalActive?: boolean;
  supsasActive?: boolean;
}

function ExcoCard({ module, color, index, isEnabled, isSuperAdmin, onToggle, onColorSave, karnivalActive, supsasActive }: ExcoCardProps) {
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
        "group relative cursor-pointer overflow-hidden rounded-[2.5rem] bg-black/[0.03] dark:bg-white/5 border backdrop-blur-md p-8 transition-all duration-500 min-h-[280px] flex flex-col justify-between",
        !canAccess && "opacity-80 grayscale-[0.5] cursor-not-allowed",
        karnivalActive
          ? "border-violet-500/20 hover:border-violet-400/40 hover:bg-white/[0.06] hover:shadow-[0_0_30px_rgba(139,92,246,0.12)]"
          : supsasActive
            ? "border-amber-500/20 hover:border-amber-400/40 hover:bg-white/[0.06] hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]"
            : "border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
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
  const karnivalStatus = useKarnivalStatus();
  const karnivalActive = !!karnivalStatus?.isActive;
  const [settings, setSettings] = useState<ExcoColorSetting[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [confettiDone, setConfettiDone] = useState(false);
  const [karnivalCountdown, setKarnivalCountdown] = useState({ h: 0, m: 0, s: 0, expired: false });
  const [supsasBurstDone, setSupsasBurstDone] = useState(false);

  // Kebajikan live stats
  const [kbStats, setKbStats] = useState<{ open: number; resolved: number; rating: number | null } | null>(null);

  const isJPPMode = profile?.role === 'JPP' || isSuperAdmin;

  // PolyMart live stats
  const [polyMartStats, setPolyMartStats] = useState<{ listings: number; businesses: number } | null>(null);

  // SUPSAS edition data (untuk countdown)
  const [supsasEdition, setSupsasEdition] = useState<{
    name: string; start_date: string | null; end_date: string | null; is_active: boolean;
  } | null>(null);
  const [supsasCountdown, setSupsasCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0, expired: false });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Karnival: confetti 15s timer ─────────────────────────────
  useEffect(() => {
    if (!karnivalActive) { setConfettiDone(false); return; }
    const t = setTimeout(() => setConfettiDone(true), 15000);
    return () => clearTimeout(t);
  }, [karnivalActive]);

  // ── Karnival: countdown timer ────────────────────────────────
  useEffect(() => {
    if (!karnivalStatus?.endDate) return;
    const tick = () => {
      const diff = new Date(karnivalStatus.endDate!).getTime() - Date.now();
      if (diff <= 0) { setKarnivalCountdown(c => ({ ...c, expired: true })); return; }
      setKarnivalCountdown({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [karnivalStatus?.endDate]);

  // ── Karnival: session toast (sekali per session) ──────────────
  useEffect(() => {
    if (!karnivalActive || !karnivalStatus?.name) return;
    const key = `karnival_toast_${karnivalStatus.name}`;
    if (!sessionStorage.getItem(key)) {
      const t = setTimeout(() => {
        toast('🎊 Karnival JPP sedang berlangsung! Undi booth kegemaran anda sekarang.', { duration: 5000 });
        sessionStorage.setItem(key, '1');
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [karnivalActive, karnivalStatus?.name]);

  // ── SUPSAS: burst 10s timer ───────────────────────────────────
  useEffect(() => {
    if (!isModuleEnabled('supsas')) { setSupsasBurstDone(false); return; }
    const t = setTimeout(() => setSupsasBurstDone(true), 10000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // ── SUPSAS: session toast ─────────────────────────────────────
  useEffect(() => {
    if (!isModuleEnabled('supsas') || !supsasEdition?.name) return;
    const key = `supsas_toast_${supsasEdition.name}`;
    if (!sessionStorage.getItem(key)) {
      const t = setTimeout(() => {
        toast('🏆 SUPSAS sedang berlangsung! Pantau keputusan dan jadual sukan terkini.', { duration: 5000 });
        sessionStorage.setItem(key, '1');
      }, 1800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, supsasEdition?.name]);

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
      // Get all active products from active businesses
      const { data: products } = await supabase
        .from('business_products')
        .select('business_id, keusahawanan_businesses!inner(status)')
        .eq('publish_to_polymart', true)
        .eq('is_available', true)
        .eq('keusahawanan_businesses.status', 'ACTIVE');
        
      const listingsCount = products?.length ?? 0;
      const uniqueBusinesses = new Set(products?.map(p => p.business_id)).size;
      
      setPolyMartStats({ listings: listingsCount, businesses: uniqueBusinesses });
    };
    loadPolyMart();
  }, []);

  // Fetch SUPSAS edition bila toggle ON
  useEffect(() => {
    if (!isModuleEnabled('supsas')) return;
    supabase.from('supsas_editions')
      .select('name, start_date, end_date, is_active')
      .order('edition_year', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data) setSupsasEdition(data as any); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // Live countdown ticker
  useEffect(() => {
    if (!supsasEdition?.start_date) return;
    const target = new Date(supsasEdition.start_date).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setSupsasCountdown({ days: 0, hours: 0, mins: 0, secs: 0, expired: true });
        return;
      }
      setSupsasCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [supsasEdition?.start_date]);

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
  const supsasActive = isModuleEnabled('supsas');

  return (
    <div className={cn(
      'min-h-screen font-sans overflow-x-hidden transition-colors duration-700 relative flex flex-col',
      karnivalActive
        ? 'bg-[#060010] text-white selection:bg-violet-500/20'
        : supsasActive
          ? 'bg-[#030d1a] text-white selection:bg-amber-500/20'
          : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white selection:bg-emerald-500/20'
    )}>

      <PortalSidebar
        isOpen={isSidebarOpen}
        onOpen={() => setIsSidebarOpen(true)}
        onClose={() => setIsSidebarOpen(false)}
        settings={settings}
      />

      {/* Background blobs — conditional karnival/supsas/normal */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {karnivalActive ? (
          <>
            <div className="absolute -top-[15%] -left-[10%] w-[80vw] h-[80vw] rounded-full opacity-25 blur-[100px]" style={{ background: 'radial-gradient(circle, #4c1d95 0%, transparent 70%)', animation: 'aurora-blob-1 30s ease-in-out infinite' }} />
            <div className="absolute top-[50%] -right-[15%] w-[70vw] h-[70vw] rounded-full opacity-15 blur-[100px]" style={{ background: 'radial-gradient(circle, #831843 0%, transparent 70%)', animation: 'aurora-blob-2 40s ease-in-out infinite' }} />
            <div className="absolute top-[20%] left-[40%] w-[50vw] h-[50vw] rounded-full opacity-10 blur-[120px]" style={{ background: 'radial-gradient(circle, #6d28d9 0%, transparent 70%)', animation: 'aurora-blob-1 50s ease-in-out infinite reverse' }} />
          </>
        ) : supsasActive ? (
          <>
            <div className="absolute -top-[15%] -left-[10%] w-[80vw] h-[80vw] rounded-full opacity-20 blur-[100px]" style={{ background: 'radial-gradient(circle, #78350f 0%, transparent 70%)', animation: 'aurora-blob-1 18s ease-in-out infinite' }} />
            <div className="absolute top-[50%] -right-[15%] w-[70vw] h-[70vw] rounded-full opacity-15 blur-[100px]" style={{ background: 'radial-gradient(circle, #92400e 0%, transparent 70%)', animation: 'aurora-blob-2 25s ease-in-out infinite' }} />
            <div className="absolute top-[25%] left-[40%] w-[55vw] h-[55vw] rounded-full opacity-10 blur-[120px]" style={{ background: 'radial-gradient(circle, #b45309 0%, transparent 70%)', animation: 'aurora-blob-1 30s ease-in-out infinite reverse' }} />
          </>
        ) : (
          <>
            <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full mix-blend-screen opacity-10 bg-amber-600 blur-3xl" />
            <div className="absolute top-[40%] -right-[20%] w-[60vw] h-[60vw] rounded-full mix-blend-screen opacity-10 bg-teal-600 blur-3xl" />
          </>
        )}
      </div>

      {/* Karnival + SUPSAS CSS Keyframes */}
      {(karnivalActive || supsasActive) && (
        <style>{`
          @keyframes confetti-fall {
            0%   { transform: translateY(-10px) rotate(0deg);    opacity: 1; }
            85%  { opacity: 0.8; }
            100% { transform: translateY(105vh) rotate(1080deg); opacity: 0; }
          }
          @keyframes sparkle-pulse {
            0%, 100% { opacity: 0.12; transform: scale(1); }
            50%       { opacity: 0.65; transform: scale(1.5); }
          }
          @keyframes aurora-blob-1 {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            33%       { transform: translate(40px, -30px) scale(1.05); }
            66%       { transform: translate(-20px, 20px) scale(0.97); }
          }
          @keyframes aurora-blob-2 {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            40%       { transform: translate(-50px, 30px) scale(1.08); }
            70%       { transform: translate(30px, -20px) scale(0.95); }
          }
          @keyframes gradient-shift {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes karnival-glow-pulse {
            0%, 100% { box-shadow: 0 0 30px rgba(139,92,246,0.2), 0 0 60px rgba(139,92,246,0.05); }
            50%       { box-shadow: 0 0 50px rgba(139,92,246,0.4), 0 0 100px rgba(139,92,246,0.1); }
          }
          @keyframes supsas-burst {
            0%   { transform: translateY(0px) rotate(0deg); opacity: 1; }
            85%  { opacity: 0.9; }
            100% { transform: translateY(-110vh) rotate(-720deg); opacity: 0; }
          }
          @keyframes meteor-streak {
            0%   { transform: translateX(-60px) translateY(60px); opacity: 0; }
            10%  { opacity: 0.7; }
            90%  { opacity: 0.4; }
            100% { transform: translateX(200px) translateY(-200px); opacity: 0; }
          }
          @keyframes supsas-glow-pulse {
            0%, 100% { box-shadow: 0 0 30px rgba(245,158,11,0.2), 0 0 60px rgba(245,158,11,0.05); }
            50%       { box-shadow: 0 0 50px rgba(245,158,11,0.4), 0 0 100px rgba(245,158,11,0.1); }
          }
          @keyframes supsas-gradient-shift {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
      )}

      {/* Confetti Layer (15s) */}
      {karnivalActive && !confettiDone && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {[
            { l: '3%', s: 8, r: 0.5, c: '#a855f7', d: '3.1s', dl: '0s', sh: 'square' },
            { l: '7%', s: 6, r: 1.8, c: '#fbbf24', d: '4.2s', dl: '0.3s', sh: 'rect' },
            { l: '11%', s: 9, r: 1, c: '#f472b6', d: '3.5s', dl: '0.7s', sh: 'circle' },
            { l: '15%', s: 7, r: 0.6, c: '#818cf8', d: '5.0s', dl: '0.1s', sh: 'square' },
            { l: '19%', s: 10, r: 1.5, c: '#c084fc', d: '3.8s', dl: '1.2s', sh: 'rect' },
            { l: '23%', s: 5, r: 1, c: '#e879f9', d: '4.5s', dl: '0.5s', sh: 'circle' },
            { l: '27%', s: 8, r: 0.7, c: '#fbbf24', d: '3.2s', dl: '0.9s', sh: 'square' },
            { l: '31%', s: 6, r: 2, c: '#a78bfa', d: '4.8s', dl: '0.2s', sh: 'rect' },
            { l: '35%', s: 9, r: 1, c: '#f9a8d4', d: '3.6s', dl: '1.4s', sh: 'circle' },
            { l: '39%', s: 7, r: 0.5, c: '#7c3aed', d: '5.2s', dl: '0.6s', sh: 'square' },
            { l: '43%', s: 11, r: 1.3, c: '#f472b6', d: '3.4s', dl: '0.4s', sh: 'rect' },
            { l: '47%', s: 6, r: 1, c: '#fbbf24', d: '4.1s', dl: '1.1s', sh: 'circle' },
            { l: '51%', s: 8, r: 0.8, c: '#c084fc', d: '3.9s', dl: '0.8s', sh: 'square' },
            { l: '55%', s: 7, r: 1.6, c: '#818cf8', d: '4.7s', dl: '0s', sh: 'rect' },
            { l: '59%', s: 9, r: 1, c: '#a855f7', d: '3.3s', dl: '1.3s', sh: 'circle' },
            { l: '63%', s: 6, r: 0.6, c: '#e879f9', d: '5.1s', dl: '0.3s', sh: 'square' },
            { l: '67%', s: 10, r: 1.4, c: '#fbbf24', d: '3.7s', dl: '0.7s', sh: 'rect' },
            { l: '71%', s: 7, r: 1, c: '#f9a8d4', d: '4.4s', dl: '1.0s', sh: 'circle' },
            { l: '75%', s: 8, r: 0.7, c: '#7c3aed', d: '3.0s', dl: '0.5s', sh: 'square' },
            { l: '79%', s: 6, r: 2, c: '#a78bfa', d: '4.9s', dl: '0.2s', sh: 'rect' },
            { l: '83%', s: 9, r: 1, c: '#c084fc', d: '3.5s', dl: '1.5s', sh: 'circle' },
            { l: '87%', s: 7, r: 0.5, c: '#fbbf24', d: '5.3s', dl: '0.6s', sh: 'square' },
            { l: '91%', s: 8, r: 1.7, c: '#f472b6', d: '3.8s', dl: '0.9s', sh: 'rect' },
            { l: '95%', s: 6, r: 1, c: '#818cf8', d: '4.3s', dl: '0.1s', sh: 'circle' },
            { l: '5%', s: 7, r: 0.8, c: '#e879f9', d: '4.6s', dl: '1.8s', sh: 'square' },
            { l: '13%', s: 9, r: 1.2, c: '#fbbf24', d: '3.1s', dl: '2.1s', sh: 'rect' },
            { l: '22%', s: 6, r: 1, c: '#a855f7', d: '5.0s', dl: '1.7s', sh: 'circle' },
            { l: '33%', s: 10, r: 0.6, c: '#f9a8d4', d: '3.4s', dl: '2.3s', sh: 'square' },
            { l: '44%', s: 7, r: 1.5, c: '#7c3aed', d: '4.2s', dl: '1.6s', sh: 'rect' },
            { l: '56%', s: 8, r: 1, c: '#c084fc', d: '3.7s', dl: '2.0s', sh: 'circle' },
            { l: '68%', s: 6, r: 0.7, c: '#fbbf24', d: '4.8s', dl: '1.9s', sh: 'square' },
            { l: '77%', s: 9, r: 1.3, c: '#a78bfa', d: '3.2s', dl: '2.4s', sh: 'rect' },
            { l: '89%', s: 7, r: 1, c: '#f472b6', d: '5.1s', dl: '1.5s', sh: 'circle' },
          ].map((p, i) => (
            <div key={i} style={{
              position: 'absolute', top: 0, left: p.l,
              width: p.s,
              height: p.sh === 'circle' ? p.s : p.sh === 'square' ? p.s : p.s * p.r,
              borderRadius: p.sh === 'circle' ? '50%' : '2px',
              backgroundColor: p.c,
              animationName: 'confetti-fall',
              animationDuration: p.d,
              animationDelay: p.dl,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
            }} />
          ))}
        </div>
      )}

      {/* Floating Sparkles (Karnival only) */}
      {karnivalActive && (
        <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden">
          {[
            { x: '8%', y: '15%', s: 3, c: '#c084fc', dur: '2.1s', dl: '0s' },
            { x: '15%', y: '45%', s: 2, c: '#fbbf24', dur: '3.0s', dl: '0.5s' },
            { x: '22%', y: '72%', s: 4, c: '#f472b6', dur: '2.5s', dl: '1.1s' },
            { x: '31%', y: '28%', s: 2, c: '#818cf8', dur: '3.5s', dl: '0.3s' },
            { x: '40%', y: '60%', s: 3, c: '#a855f7', dur: '2.3s', dl: '0.8s' },
            { x: '50%', y: '18%', s: 5, c: '#fbbf24', dur: '2.8s', dl: '1.4s' },
            { x: '58%', y: '80%', s: 2, c: '#e879f9', dur: '3.2s', dl: '0.2s' },
            { x: '66%', y: '35%', s: 4, c: '#c084fc', dur: '2.0s', dl: '0.9s' },
            { x: '74%', y: '65%', s: 3, c: '#f9a8d4', dur: '3.7s', dl: '0.6s' },
            { x: '82%', y: '22%', s: 2, c: '#7c3aed', dur: '2.6s', dl: '1.2s' },
            { x: '89%', y: '52%', s: 4, c: '#fbbf24', dur: '3.1s', dl: '0.4s' },
            { x: '94%', y: '78%', s: 3, c: '#a78bfa', dur: '2.4s', dl: '1.0s' },
            { x: '5%', y: '88%', s: 2, c: '#f472b6', dur: '3.3s', dl: '1.6s' },
            { x: '27%', y: '10%', s: 3, c: '#818cf8', dur: '2.7s', dl: '0.7s' },
            { x: '70%', y: '5%', s: 4, c: '#c084fc', dur: '3.0s', dl: '1.3s' },
            { x: '45%', y: '92%', s: 2, c: '#fbbf24', dur: '2.2s', dl: '0.1s' },
            { x: '55%', y: '48%', s: 3, c: '#e879f9', dur: '2.9s', dl: '1.5s' },
            { x: '12%', y: '58%', s: 4, c: '#a855f7', dur: '3.4s', dl: '0.8s' },
          ].map((sp, i) => (
            <div key={i} style={{
              position: 'absolute', left: sp.x, top: sp.y,
              width: sp.s, height: sp.s,
              borderRadius: '50%',
              backgroundColor: sp.c,
              animationName: 'sparkle-pulse',
              animationDuration: sp.dur,
              animationDelay: sp.dl,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }} />
          ))}
        </div>
      )}

      {/* SUPSAS: Upward Medal Burst (10s) */}
      {supsasActive && !supsasBurstDone && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {[
            { l: '4%', s: 12, c: '#fbbf24', d: '2.0s', dl: '0s' },
            { l: '9%', s: 10, c: '#e5e7eb', d: '2.5s', dl: '0.2s' },
            { l: '14%', s: 14, c: '#cd7c2f', d: '1.8s', dl: '0.5s' },
            { l: '19%', s: 11, c: '#fbbf24', d: '2.3s', dl: '0.1s' },
            { l: '24%', s: 9, c: '#ffffff', d: '2.8s', dl: '0.6s' },
            { l: '29%', s: 13, c: '#f59e0b', d: '2.1s', dl: '0.3s' },
            { l: '34%', s: 10, c: '#e5e7eb', d: '2.6s', dl: '0.8s' },
            { l: '39%', s: 12, c: '#fbbf24', d: '1.9s', dl: '0.4s' },
            { l: '44%', s: 14, c: '#cd7c2f', d: '2.4s', dl: '0.7s' },
            { l: '49%', s: 10, c: '#ffffff', d: '2.2s', dl: '0s' },
            { l: '54%', s: 11, c: '#fbbf24', d: '2.7s', dl: '0.9s' },
            { l: '59%', s: 9, c: '#f59e0b', d: '2.0s', dl: '0.2s' },
            { l: '64%', s: 13, c: '#e5e7eb', d: '2.5s', dl: '0.5s' },
            { l: '69%', s: 12, c: '#fbbf24', d: '1.8s', dl: '0.3s' },
            { l: '74%', s: 10, c: '#cd7c2f', d: '2.3s', dl: '0.6s' },
            { l: '79%', s: 11, c: '#ffffff', d: '2.9s', dl: '0.1s' },
            { l: '84%', s: 14, c: '#fbbf24', d: '2.1s', dl: '0.7s' },
            { l: '89%', s: 9, c: '#f59e0b', d: '2.6s', dl: '0.4s' },
            { l: '94%', s: 12, c: '#e5e7eb', d: '2.0s', dl: '0.8s' },
            { l: '7%', s: 10, c: '#fbbf24', d: '2.4s', dl: '1.1s' },
            { l: '17%', s: 13, c: '#cd7c2f', d: '2.2s', dl: '1.3s' },
            { l: '27%', s: 11, c: '#ffffff', d: '2.8s', dl: '1.0s' },
            { l: '37%', s: 14, c: '#fbbf24', d: '1.9s', dl: '1.4s' },
            { l: '47%', s: 9, c: '#f59e0b', d: '2.5s', dl: '1.2s' },
            { l: '57%', s: 12, c: '#e5e7eb', d: '2.0s', dl: '1.5s' },
            { l: '67%', s: 10, c: '#fbbf24', d: '2.7s', dl: '1.6s' },
            { l: '77%', s: 13, c: '#cd7c2f', d: '2.3s', dl: '1.1s' },
            { l: '87%', s: 11, c: '#ffffff', d: '2.1s', dl: '1.7s' },
            { l: '97%', s: 9, c: '#fbbf24', d: '2.6s', dl: '1.3s' },
            { l: '12%', s: 14, c: '#f59e0b', d: '2.4s', dl: '1.8s' },
            { l: '32%', s: 10, c: '#fbbf24', d: '2.2s', dl: '2.0s' },
            { l: '52%', s: 12, c: '#e5e7eb', d: '1.8s', dl: '1.9s' },
            { l: '72%', s: 11, c: '#cd7c2f', d: '2.5s', dl: '2.1s' },
          ].map((p, i) => (
            <div key={i} style={{
              position: 'absolute', bottom: 0, left: p.l,
              width: p.s, height: p.s,
              borderRadius: '50%',
              backgroundColor: p.c,
              boxShadow: `0 0 ${p.s / 2}px ${p.c}80`,
              animationName: 'supsas-burst',
              animationDuration: p.d,
              animationDelay: p.dl,
              animationTimingFunction: 'ease-out',
              animationFillMode: 'forwards',
            }} />
          ))}
        </div>
      )}

      {/* SUPSAS: Diagonal Meteor Streaks (permanent ambient) */}
      {supsasActive && (
        <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden">
          {[
            { x: '5%', y: '70%', w: 1, h: 40, dur: '3.2s', dl: '0s' },
            { x: '12%', y: '45%', w: 2, h: 55, dur: '4.1s', dl: '0.7s' },
            { x: '20%', y: '80%', w: 1, h: 35, dur: '3.6s', dl: '1.3s' },
            { x: '28%', y: '30%', w: 2, h: 60, dur: '2.8s', dl: '0.4s' },
            { x: '36%', y: '60%', w: 1, h: 45, dur: '3.9s', dl: '1.0s' },
            { x: '44%', y: '20%', w: 2, h: 50, dur: '4.3s', dl: '0.2s' },
            { x: '52%', y: '75%', w: 1, h: 38, dur: '3.1s', dl: '1.6s' },
            { x: '60%', y: '40%', w: 2, h: 65, dur: '2.7s', dl: '0.9s' },
            { x: '68%', y: '85%', w: 1, h: 42, dur: '4.0s', dl: '0.5s' },
            { x: '76%', y: '25%', w: 2, h: 52, dur: '3.5s', dl: '1.2s' },
            { x: '84%', y: '65%', w: 1, h: 36, dur: '2.9s', dl: '0.1s' },
            { x: '92%', y: '50%', w: 2, h: 48, dur: '4.2s', dl: '0.8s' },
            { x: '8%', y: '15%', w: 1, h: 44, dur: '3.7s', dl: '1.5s' },
            { x: '25%', y: '90%', w: 2, h: 58, dur: '3.3s', dl: '0.6s' },
            { x: '70%', y: '10%', w: 1, h: 32, dur: '4.5s', dl: '1.1s' },
            { x: '88%', y: '35%', w: 2, h: 62, dur: '2.6s', dl: '1.8s' },
          ].map((m, i) => (
            <div key={i} style={{
              position: 'absolute', left: m.x, top: m.y,
              width: m.w, height: m.h,
              borderRadius: '1px',
              background: 'linear-gradient(135deg, rgba(251,191,36,0.8) 0%, rgba(245,158,11,0.2) 100%)',
              transform: 'rotate(-45deg)',
              animationName: 'meteor-streak',
              animationDuration: m.dur,
              animationDelay: m.dl,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }} />
          ))}
        </div>
      )}

      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 inset-x-0 z-[100] transition-all duration-700 px-4 md:px-8 py-4 flex items-center justify-between",
        karnivalActive
          ? isScrolled
            ? 'bg-violet-950/90 backdrop-blur-xl border-b border-violet-500/20 py-3 shadow-[0_4px_30px_rgba(139,92,246,0.2)]'
            : 'bg-violet-950/30 backdrop-blur-sm'
          : supsasActive
            ? isScrolled
              ? 'bg-amber-950/90 backdrop-blur-xl border-b border-amber-500/20 py-3 shadow-[0_4px_30px_rgba(245,158,11,0.15)]'
              : 'bg-amber-950/20 backdrop-blur-sm'
            : isScrolled
              ? 'bg-slate-50 dark:bg-slate-950/80 backdrop-blur-md border-b border-black/[0.03] dark:border-white/5 py-3 shadow-2xl'
              : 'bg-transparent'
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
              EKOSISTEM DIGITAL V26.0
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1] max-w-4xl mx-auto text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-600 dark:from-white dark:to-white/60">
              {supsasActive && !karnivalActive ? 'Semangat Sukan,' : 'Selamat kembali,'} <br />
              <span className={supsasActive && !karnivalActive ? 'text-amber-400' : karnivalActive ? 'text-violet-400' : 'text-emerald-500 dark:text-emerald-400'}>
                {displayName}
              </span>
            </h1>
            <p className="text-sm md:text-lg text-slate-500 dark:text-white/50 font-medium max-w-2xl mx-auto leading-relaxed px-4">
              {supsasActive && !karnivalActive
                ? <>Sokong pasukan anda. Pantau keputusan sukan secara langsung. <br className="hidden md:block" />Bawa semangat ke padang! 🏅</>
                : <>Platform bersepadu untuk pengurusan kelab, perniagaan, dan aktiviti JPP Polisas. <br className="hidden md:block" />Bawa kepimpinan anda ke tahap seterusnya.</>
              }
            </p>

            {/* ── Event Banners (di atas CTA — nampak dulu) ── */}
            <AnimatePresence>
              {supsasActive && !karnivalActive && (
                <motion.div
                  key="supsas-mega-banner"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                  className="w-full max-w-4xl"
                >
                  <div
                    onClick={() => navigate('/supsas')}
                    className="relative cursor-pointer rounded-[2.2rem] overflow-hidden transition-all duration-500 hover:scale-[1.008] active:scale-[0.995] text-left"
                    style={{
                      background: 'linear-gradient(135deg, #030d1a 0%, #1a0d00 50%, #0a0500 100%)',
                      animation: 'supsas-glow-pulse 3s ease-in-out infinite',
                      minHeight: 260,
                    }}
                  >
                    <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(245,158,11,0.3) 0%, transparent 65%)' }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 100%, rgba(180,83,9,0.2) 0%, transparent 50%)' }} />

                    <div className="flex items-center justify-between px-7 pt-6 pb-0">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-300">Sedang Berlangsung</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                        🏆 SUPSAS
                      </span>
                    </div>

                    <div className="px-7 pt-5 pb-8 text-center space-y-4">
                      <div className="text-5xl sm:text-6xl" style={{ filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.6))' }}>🏆</div>
                      <div>
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight"
                          style={{
                            backgroundImage: 'linear-gradient(90deg, #fbbf24, #ffffff, #f59e0b, #fbbf24)',
                            backgroundSize: '300% 100%',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            animation: 'supsas-gradient-shift 4s linear infinite',
                          }}
                        >
                          {supsasEdition?.name ?? 'SUPSAS'}
                        </h2>
                        {supsasEdition?.start_date && (
                          <p className="text-sm text-white/50 font-medium mt-2 tracking-wide">
                            {new Date(supsasEdition.start_date).toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        )}
                      </div>

                      {supsasEdition?.start_date && !supsasCountdown.expired && (
                        <div className="inline-flex items-center gap-1 px-5 py-2.5 rounded-2xl" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <LucideIcons.Clock className="w-3.5 h-3.5 text-amber-400 mr-1" />
                          <span className="text-xs text-white/60 font-medium">Bermula dalam</span>
                          {[{ v: supsasCountdown.days, l: 'h' }, { v: supsasCountdown.hours, l: 'j' }, { v: supsasCountdown.mins, l: 'm' }, { v: supsasCountdown.secs, l: 's' }].map(({ v, l }) => (
                            <span key={l} className="flex items-baseline gap-0.5">
                              <span className="text-lg font-black text-white tabular-nums">{String(v).padStart(2, '0')}</span>
                              <span className="text-[10px] text-white/40 font-bold">{l}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {supsasEdition?.is_active && supsasCountdown.expired && (
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                          <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" /></span>
                          <span className="text-xs text-amber-300 font-black">Sedang Berlangsung!</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
                        <button onClick={e => { e.stopPropagation(); navigate('/supsas/scoreboard'); }}
                          className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #b45309, #f59e0b)', boxShadow: '0 8px 30px rgba(245,158,11,0.35)', color: '#000' }}>
                          <LucideIcons.BarChart3 className="w-4 h-4" /> Papan Markah
                        </button>
                        <button onClick={e => { e.stopPropagation(); navigate('/supsas/jadual'); }}
                          className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                          <LucideIcons.CalendarDays className="w-4 h-4" /> Jadual
                        </button>
                        <button onClick={e => { e.stopPropagation(); navigate('/supsas'); }}
                          className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                          <LucideIcons.Trophy className="w-4 h-4" /> Laman SUPSAS
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {karnivalActive && (
                <motion.div
                  key="karnival-top-banner"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                  className="w-full max-w-4xl"
                >
                  <div
                    onClick={() => navigate('/karnival')}
                    className="relative cursor-pointer rounded-[2.2rem] overflow-hidden transition-all duration-500 hover:scale-[1.008] active:scale-[0.995] text-left"
                    style={{
                      background: 'linear-gradient(135deg, #0a0018 0%, #1e0840 40%, #0f0025 100%)',
                      animation: 'karnival-glow-pulse 3s ease-in-out infinite',
                      minHeight: 260,
                    }}
                  >
                    <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(139,92,246,0.35) 0%, transparent 65%)' }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 20% 100%, rgba(219,39,119,0.15) 0%, transparent 50%)' }} />

                    <div className="flex items-center justify-between px-7 pt-6 pb-0">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-violet-500" /></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-violet-300">Sedang Berlangsung</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full" style={{ background: 'rgba(139,92,246,0.2)', color: '#c084fc', border: '1px solid rgba(139,92,246,0.3)' }}>🎪 Karnival JPP</span>
                    </div>

                    <div className="px-7 pt-5 pb-8 text-center space-y-4">
                      <div className="text-5xl sm:text-6xl" style={{ filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.6))' }}>🎪</div>
                      <div>
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight"
                          style={{ backgroundImage: 'linear-gradient(90deg, #c084fc, #f472b6, #fbbf24, #a855f7, #c084fc)', backgroundSize: '300% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradient-shift 4s linear infinite' }}>
                          {karnivalStatus?.name}
                        </h2>
                        {karnivalStatus?.tagline && <p className="text-sm text-white/50 font-medium mt-2 tracking-wide">{karnivalStatus.tagline}</p>}
                      </div>
                      {karnivalStatus?.endDate && !karnivalCountdown.expired && (
                        <div className="inline-flex items-center gap-1 px-5 py-2.5 rounded-2xl" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                          <LucideIcons.Clock className="w-3.5 h-3.5 text-violet-400 mr-1" />
                          <span className="text-xs text-white/60 font-medium">Undi ditutup dalam</span>
                          {[{ v: karnivalCountdown.h, l: 'j' }, { v: karnivalCountdown.m, l: 'm' }, { v: karnivalCountdown.s, l: 's' }].map(({ v, l }) => (
                            <span key={l} className="flex items-baseline gap-0.5"><span className="text-lg font-black text-white tabular-nums">{String(v).padStart(2, '0')}</span><span className="text-[10px] text-white/40 font-bold">{l}</span></span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
                        <button onClick={e => { e.stopPropagation(); navigate('/karnival'); }}
                          className="flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 8px 30px rgba(139,92,246,0.4)', color: 'white' }}>
                          <LucideIcons.QrCode className="w-4 h-4" /> Undi Booth Sekarang
                        </button>
                        <button onClick={e => { e.stopPropagation(); navigate('/karnival/scoreboard'); }}
                          className="flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                          style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#c084fc' }}>
                          <LucideIcons.Trophy className="w-4 h-4" /> Papan Markah
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                  karnivalActive={karnivalActive}
                  supsasActive={supsasActive}
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
          <div className="group flex items-center gap-4 opacity-50 hover:opacity-100 transition-all duration-700">
            <img src="/jpp-logo.png" alt="JPP" className="h-8 w-auto object-contain grayscale transition-all duration-300 group-hover:grayscale-0" />
            <div className="h-8 w-px bg-black/20 dark:bg-white/20" />
            <div className="flex flex-col text-left text-slate-800 dark:text-white">
              <span className="font-black text-xs tracking-tight">POLISAS DIGITAL</span>
              <span className="text-[8px] font-black uppercase tracking-widest opacity-60">EST. {new Date().getFullYear()}</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-900/40 dark:text-white/40 uppercase tracking-[0.4em] max-w-md mx-auto leading-loose">
            &copy; {new Date().getFullYear()} Jawatankuasa Perwakilan Pelajar <br />
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
