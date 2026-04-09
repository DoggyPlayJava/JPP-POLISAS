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
  Award, FileText, LogOut, ChevronLeft, LayoutGrid, Menu, X,
} from 'lucide-react';

const MODULE_ID = 'keusahawanan';
const DEFAULT_COLOR = '#1B5E20';

// Sidebar sentiasa gelap — tinted dengan warna tema pada kadar sangat rendah
// Sama konsep dengan e-KPP sidebar yang sentiasa gelap-maroon tanpa ikut light mode
function getSidebarBg(hex: string): { top: string; bottom: string } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // 8% kecerahan asal → hampir hitam dengan nada warna yang sangat subtle
  const f1 = 0.07;
  const f2 = 0.12;
  return {
    top:    `rgb(${Math.floor(r * f1)}, ${Math.floor(g * f1)}, ${Math.floor(b * f1)})`,
    bottom: `rgb(${Math.floor(r * f2)}, ${Math.floor(g * f2)}, ${Math.floor(b * f2)})`,
  };
}

const navItems = [
  { icon: LayoutDashboard, label: 'Papan Pemuka',  href: '/keusahawanan/dashboard' },
  { icon: CalendarDays,    label: 'Program',        href: '/keusahawanan/program' },
  { icon: Lightbulb,       label: 'Cadangan Idea',  href: '/keusahawanan/idea' },
  { icon: Award,           label: 'Geran & Hadiah', href: '/keusahawanan/geran' },
  { icon: FileText,        label: 'Laporan',         href: '/keusahawanan/laporan' },
];

// ── Sidebar ───────────────────────────────────────────────────────────────
function KeusahawananSidebar({ color }: { color: string }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const bg = getSidebarBg(color);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || '?';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

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



      {/* Nav */}
      <nav className="flex-1 py-6 px-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        <p className="px-3 mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Menu Utama</p>
        {navItems.map(item => (
          <NavLink
            key={item.href}
            to={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
            style={({ isActive }) => ({
              background: isActive ? hexToRgba(color, 0.18) : 'transparent',
              /* Teks: active = putih terang, inactive = putih sederhana (BUKAN warna tema) */
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
                <span className="text-xs font-bold tracking-tight">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1 h-4 rounded-full" style={{ background: color, boxShadow: `0 0 6px 2px ${hexToRgba(color, 0.4)}` }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-3" style={{ borderTop: `1px solid ${hexToRgba(color, 0.1)}` }}>
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8 rounded-xl ring-2 ring-white/10 shadow-md">
            <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
            {/* Avatar fallback — latar solid warna tema, teks dikira kontras */}
            <AvatarFallback
              className="font-black text-xs"
              style={{ background: color, color: getContrastText(color) }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black truncate leading-tight text-white/85">{displayName}</p>
            <p className="text-[10px] font-black uppercase tracking-widest truncate text-white/40">e-Keusahawanan</p>
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

// ── Layout ────────────────────────────────────────────────────────────────
export function KeusahawananLayout() {
  const { isSuperAdmin, isLoading } = useAuth();
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
      // Loading screen pakai bg-background (respects dark/light mode)
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
    <ExcoThemeProvider color={themeColor} moduleId={MODULE_ID}>
      {/* Wrapper TIDAK ada warna tema — pakai bg-background sama seperti e-KPP */}
      <div className="flex h-screen overflow-hidden bg-background">

        {/* Backdrop mobile */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-[100] md:hidden bg-black/60 backdrop-blur-sm" />
          )}
        </AnimatePresence>

        {/* Sidebar — gelap, bertint warna tema */}
        <aside className={cn(
          'fixed inset-y-0 left-0 z-[110] w-64 transform transition-transform duration-300 ease-in-out',
          'md:relative md:translate-x-0 md:flex-shrink-0',
          isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}>
          <div className="md:hidden absolute right-4 top-5">
            <button onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-full text-white/40 hover:text-white/70">
              <X className="w-5 h-5" />
            </button>
          </div>
          <KeusahawananSidebar color={themeColor} />
        </aside>

        {/* Main content — bg-background, SAMA seperti e-KPP */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Mobile header */}
          <div className="md:hidden flex items-center p-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
            <button onClick={() => setIsSidebarOpen(true)} className="mr-3 p-2 rounded-xl bg-muted/50">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-lg">💡</span>
              <span className="font-black text-sm tracking-tight text-foreground">e-Keusahawanan</span>
            </div>
            {!moduleEnabled && isSuperAdmin && (
              <div className="ml-auto px-2 py-1 rounded-full text-[10px] font-black bg-amber-500/10 border border-amber-500/20 text-amber-500">
                Pratonton
              </div>
            )}
          </div>

          {/* Pages — bg-background (dark/light mode aware) */}
          <main className="flex-1 overflow-y-auto bg-background scrollbar-hide pb-20 md:pb-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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
