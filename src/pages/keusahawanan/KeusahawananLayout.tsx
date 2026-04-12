import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ExcoThemeProvider } from '@/contexts/ExcoThemeContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getContrastText, hexToRgba } from '@/lib/utils';
import { Navigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Lightbulb,
  Award, FileText, LogOut, ChevronLeft, LayoutGrid, Menu, X, Store,
  ShoppingCart, Package, BarChart3, History, Settings2,
  ChevronDown, Building2, ShieldCheck, Crown, HelpCircle, MessageSquare, Send, ChevronRight
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  BusinessSwitcherProvider,
  useBusinessSwitcher,
} from '@/contexts/BusinessSwitcherContext';

const MODULE_ID = 'keusahawanan';
const DEFAULT_COLOR = '#1B5E20';

function getSidebarBg(hex: string): { top: string; bottom: string } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f1 = 0.07;
  const f2 = 0.12;
  return {
    top:    `rgb(${Math.floor(r * f1)}, ${Math.floor(g * f1)}, ${Math.floor(b * f1)})`,
    bottom: `rgb(${Math.floor(r * f2)}, ${Math.floor(g * f2)}, ${Math.floor(b * f2)})`,
  };
}

const navItems = [
  { icon: LayoutDashboard, label: 'Papan Pemuka',     href: '/keusahawanan/dashboard',      jppOnly: false, ownerOnly: false, posSection: false },
  { icon: CalendarDays,    label: 'Program',           href: '/keusahawanan/program',         jppOnly: false, ownerOnly: false, posSection: false },
  // POS System
  { icon: ShoppingCart,    label: 'Kedai POS',         href: '/keusahawanan/pos',             jppOnly: false, ownerOnly: false, posSection: true  },
  { icon: Package,         label: 'Katalog Produk',    href: '/keusahawanan/pos/products',    jppOnly: false, ownerOnly: false, posSection: false },
  { icon: BarChart3,       label: 'Statistik',         href: '/keusahawanan/pos/stats',       jppOnly: false, ownerOnly: false, posSection: false },
  { icon: History,         label: 'Sejarah Transaksi', href: '/keusahawanan/pos/history',     jppOnly: false, ownerOnly: false, posSection: false },
  { icon: Settings2,       label: 'Urus Perniagaan',   href: '/keusahawanan/urus-perniagaan', jppOnly: false, ownerOnly: true,  posSection: false },
  // Lain-lain
  { icon: Lightbulb,       label: 'Cadangan Idea',     href: '/keusahawanan/idea',            jppOnly: false, ownerOnly: false, posSection: false },
  { icon: Award,           label: 'Geran & Hadiah',    href: '/keusahawanan/geran',           jppOnly: false, ownerOnly: false, posSection: false },
  { icon: FileText,        label: 'Laporan',           href: '/keusahawanan/laporan',         jppOnly: false, ownerOnly: false, posSection: false },
];


// ── Business Switcher Dropdown (in sidebar) ───────────────────────────────────

function BusinessSwitcherDropdown({ color }: { color: string }) {
  const { selectedBusiness, allBusinesses, canSwitch, setSelectedBusinessId, isLoading } = useBusinessSwitcher();
  const [open, setOpen] = useState(false);

  if (!canSwitch || allBusinesses.length <= 1) return null;

  return (
    <div className="px-3 pb-3 relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all hover:bg-white/5 border border-white/[0.07]"
      >
        {/* Logo / Icon */}
        <div className="w-8 h-8 rounded-xl flex-shrink-0 overflow-hidden bg-white/10 flex items-center justify-center">
          {selectedBusiness?.logo_url
            ? <img src={selectedBusiness.logo_url} className="w-full h-full object-cover" alt="logo" />
            : <Building2 className="w-4 h-4 text-white/40" />
          }
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Perniagaan</p>
          <p className="text-xs font-black text-white/80 truncate">{selectedBusiness?.name ?? '—'}</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-3 right-3 top-full z-50 mt-1 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            style={{ background: getSidebarBg(color).bottom }}
          >
            <div className="p-1.5 max-h-64 overflow-y-auto scrollbar-hide space-y-0.5">
              {allBusinesses.map(biz => {
                const isSelected = biz.id === selectedBusiness?.id;
                return (
                  <button
                    key={biz.id}
                    onClick={() => { setSelectedBusinessId(biz.id); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all"
                    style={isSelected
                      ? { background: hexToRgba(color, 0.2), color: '#fff' }
                      : { color: 'rgba(255,255,255,0.55)' }
                    }
                  >
                    <div className="w-7 h-7 rounded-lg flex-shrink-0 overflow-hidden bg-white/10 flex items-center justify-center">
                      {biz.logo_url
                        ? <img src={biz.logo_url} className="w-full h-full object-cover" alt="logo" />
                        : <Building2 className="w-3.5 h-3.5 opacity-50" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black truncate">{biz.name}</p>
                      <p className="text-[9px] opacity-40 truncate">{(biz as any).category?.name ?? ''}</p>
                    </div>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function KeusahawananSidebar({ color }: { color: string }) {
  const { user, profile, signOut, isSuperAdmin } = useAuth();
  const { canSwitch, isKeusahawananAdmin, selectedBusiness } = useBusinessSwitcher();
  const navigate = useNavigate();
  const bg = getSidebarBg(color);

  // For ownerOnly items: admin can always see; students only if they own the selected biz
  const isOwner = isKeusahawananAdmin || selectedBusiness?.owner_id === user?.id;
  const isJpp = isSuperAdmin || profile?.role === 'JPP';

  const displayName = profile?.full_name || user?.email?.split('@')[0] || '?';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  // Role badge for footer
  const roleBadge = isSuperAdmin
    ? 'Super Admin'
    : canSwitch
    ? 'Unit Keusahawanan'
    : 'Perniagaan';

  const visibleItems = navItems.filter(item => {
    if (item.jppOnly  && !isJpp && !isSuperAdmin)  return false;
    if (item.ownerOnly && !isOwner)                 return false;
    return true;
  });

  return (
    <aside
      className="w-64 h-screen flex flex-col z-50 select-none"
      style={{ background: `linear-gradient(180deg, ${bg.top} 0%, ${bg.bottom} 100%)` }}
    >
      {/* Header */}
      <div className="flex flex-col" style={{ borderBottom: `1px solid ${hexToRgba(color, 0.15)}` }}>
        <button
          onClick={() => navigate('/portal')}
          className="flex items-center gap-2 px-5 pt-4 pb-2 transition-all duration-200 group text-white/40 hover:text-white/75"
        >
          <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Portal JPP</span>
          <LayoutGrid className="w-3 h-3 ml-0.5" />
        </button>

        <div className="flex items-center gap-3 px-5 pb-4 pt-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg"
            style={{ background: hexToRgba(color, 0.2), border: `1px solid ${hexToRgba(color, 0.3)}` }}
          >
            💡
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-white/90">e-Keusahawanan</p>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">JPP Polisas</p>
          </div>
        </div>
      </div>

      {/* ── Business Switcher (admin only) ── */}
      {canSwitch && (
        <div className="pt-3" style={{ borderBottom: `1px solid ${hexToRgba(color, 0.1)}` }}>
          <p className="px-6 pb-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-1.5">
            <Store className="w-3 h-3" /> Tukar Perniagaan
          </p>
          <BusinessSwitcherDropdown color={color} />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        <p className="px-3 mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Menu Utama</p>
        {visibleItems.map((item, idx) => (
          <React.Fragment key={item.href}>
            {/* POS section separator */}
            {item.posSection && idx > 0 && (
              <>
                <div className="my-3 mx-3 h-px" style={{ background: hexToRgba(color, 0.12) }} />
                <p className="px-3 mb-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-white/20">Sistem POS</p>
              </>
            )}
            {/* Separator before JPP-only group */}
            {item.jppOnly && idx > 0 && !visibleItems[idx - 1]?.jppOnly && (
              <div className="my-2 mx-3 h-px" style={{ background: hexToRgba(color, 0.12) }} />
            )}
            <NavLink
              to={item.href}
              end={item.href === '/keusahawanan/pos'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
              style={({ isActive }) => ({
                background: isActive ? hexToRgba(color, 0.18) : 'transparent',
                color: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.50)',
              })}
            >
              {({ isActive }) => (
                <>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: isActive ? hexToRgba(color, 0.25) : 'transparent' }}>
                    <item.icon
                      className="w-3.5 h-3.5 transition-all"
                      style={{ color: isActive ? color : 'rgba(255,255,255,0.45)' }}
                    />
                  </div>
                  <span className="text-xs font-bold tracking-tight flex-1">{item.label}</span>
                  {item.jppOnly && !isActive && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                      style={{ background: hexToRgba(color, 0.2), color }}>
                      JPP
                    </span>
                  )}
                  {item.ownerOnly && !isActive && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                      style={{ background: hexToRgba(color, 0.15), color: 'rgba(255,255,255,0.4)' }}>
                      Owner
                    </span>
                  )}
                  {isActive && (
                    <div className="ml-auto w-1 h-4 rounded-full" style={{ background: color, boxShadow: `0 0 6px 2px ${hexToRgba(color, 0.4)}` }} />
                  )}
                </>
              )}
            </NavLink>
          </React.Fragment>
        ))}
      </nav>

      {/* ── Global JPP Dashboard Link (Pinned) ── */}
      {isJpp && (
        <div className="px-3 py-2 mt-auto pb-4">
          <NavLink
            to="/jpp-admin"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20',
              isActive ? 'shadow-inner ring-1 ring-amber-500/50' : ''
            )}
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest leading-tight text-amber-400">Global JPP<br />Dashboard</span>
          </NavLink>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 space-y-3" style={{ borderTop: `1px solid ${hexToRgba(color, 0.1)}` }}>
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8 rounded-xl ring-2 ring-white/10 shadow-md">
            <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
            <AvatarFallback
              className="font-black text-xs"
              style={{ background: color, color: getContrastText(color) }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black truncate leading-tight text-white/85">{displayName}</p>
            <p className="text-[10px] font-black uppercase tracking-widest truncate text-white/40">{roleBadge}</p>
          </div>
        </div>
        <Button variant="ghost" onClick={signOut}
          className="w-full justify-start gap-3 h-9 px-3 font-black text-[10px] uppercase tracking-widest rounded-xl text-white/40 hover:text-rose-400 hover:bg-rose-500/10">
          <LogOut className="w-3.5 h-3.5" />
          Log Keluar
        </Button>
      </div>
    </aside>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export function KeusahawananLayout() {
  const { isSuperAdmin, isLoading, profile } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [themeColor, setThemeColor] = useState(DEFAULT_COLOR);
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.from('portal_settings').select('color, is_enabled').eq('exco_module', MODULE_ID).single()
      .then(({ data }) => {
        if (data?.color) setThemeColor(data.color);
        setModuleEnabled(data?.is_enabled ?? false);
      });
  }, []);

  useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);

  if (isLoading || moduleEnabled === null) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-4 rounded-full border-border" />
          <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeColor }} />
        </div>
      </div>
    );
  }

  if (!moduleEnabled && !isSuperAdmin) {
    return <Navigate to="/portal" replace />;
  }

  return (
    <BusinessSwitcherProvider>
      <LayoutInner
        themeColor={themeColor}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        moduleEnabled={moduleEnabled}
        isSuperAdmin={isSuperAdmin}
      />
    </BusinessSwitcherProvider>
  );
}

// ── Inner layout (inside BusinessSwitcherProvider) ─────────────────────────────

function LayoutInner({
  themeColor, isSidebarOpen, setIsSidebarOpen, moduleEnabled, isSuperAdmin,
}: {
  themeColor: string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
  moduleEnabled: boolean | null;
  isSuperAdmin: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading: isSwitcherLoading, canSwitch, allBusinesses } = useBusinessSwitcher();

  // Redirect to onboarding if: not an admin AND no business found
  if (!isSuperAdmin && !canSwitch && !isSwitcherLoading && allBusinesses.length === 0) {
    return <Navigate to="/keusahawanan/onboarding" replace />;
  }

  return (
    <ExcoThemeProvider color={themeColor} moduleId={MODULE_ID}>
      <div className="flex h-screen overflow-hidden bg-background">

        {/* Backdrop mobile */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-[100] md:hidden bg-black/60 backdrop-blur-sm" />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={cn(
          'fixed inset-y-0 left-0 z-[110] w-64 transform transition-transform duration-300 ease-in-out',
          'md:relative md:translate-x-0 md:flex-shrink-0',
          isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}>
          <div className="md:hidden absolute right-4 top-5">
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-full text-white/40 hover:text-white/70">
              <X className="w-5 h-5" />
            </button>
          </div>
          <KeusahawananSidebar color={themeColor} />
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Global header shared on mobile and desktop */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-border/10 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 rounded-xl transition-all active:scale-95 bg-muted/30 text-foreground"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-base shadow-lg"
                  style={{ background: hexToRgba(themeColor, 0.1), border: `1px solid ${hexToRgba(themeColor, 0.2)}` }}
                >
                  💡
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-xs tracking-tight text-foreground uppercase">e-Keusahawanan</span>
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30 text-foreground">JPP Polisas</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted/60 text-muted-foreground/70">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 rounded-[2rem] p-5 mt-2 border-none shadow-2xl glass-premium fade-in">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl text-primary">
                        <MessageSquare size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest">Bantuan & Isu</h4>
                        <p className="text-[9px] font-bold text-muted-foreground mt-0.5">Kami sedia membantu anda.</p>
                      </div>
                    </div>

                    <div className="pt-2">
                       <Button 
                          variant="outline" 
                          onClick={() => window.open('https://wa.me/601139413699', '_blank')}
                          className="w-full rounded-xl h-10 font-black text-[9px] uppercase tracking-widest gap-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 shadow-none"
                       >
                          <Send size={12} /> WhatsApp JPP Support
                       </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <NotificationBell />

              {!moduleEnabled && isSuperAdmin && (
                <div className="px-2.5 py-1 rounded-full text-[9px] font-black bg-amber-500/10 border border-amber-500/20 text-amber-500 uppercase tracking-widest hidden sm:block">
                  Pratonton
                </div>
              )}
            </div>
          </header>

          {/* Pages */}
          {/* PENTING: Jangan guna y/x transforms di sini — ia akan merosakkan
              position:fixed modal di semua sub-pages (stacking context bug) */}
          <main className="flex-1 overflow-y-auto bg-background scrollbar-hide pb-20 md:pb-0 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </ExcoThemeProvider>
  );
}
