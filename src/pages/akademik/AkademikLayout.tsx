import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  GraduationCap, LayoutDashboard, Trophy, FileText,
  BarChart3, QrCode, ArrowLeft, Menu, X, ChevronRight,
  Star, BookOpen, Building2, LogOut, Crown, CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { QrCodeFab } from '@/components/jpp/QrCodeFab';
import { BottomNav } from '@/components/layout/BottomNav';

const AKADEMIK_UNIT_LINKS = [
  { label: 'Dashboard Akademik', path: '/akademik' },
  { label: 'Pencapaian Pelajar', path: '/akademik/pencapaian' },
  { label: 'Leaderboard Merit Akademik', path: '/akademik/leaderboard' },
  { label: 'Scan QR Merit', path: '/akademik/qr' },
  { label: 'Takwim Akademik', path: '/akademik/takwim' },
];

const NAV_ITEMS = [
  { path: '/akademik',            label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/akademik/pencapaian', label: 'Pencapaian',   icon: Trophy },
  { path: '/akademik/cgpa',       label: 'HPNM / CGPA',  icon: BookOpen },
  { path: '/akademik/merit',      label: 'Merit Saya',   icon: Star },
  { path: '/akademik/folder',     label: 'Dokumen',      icon: FileText },
  { path: '/akademik/leaderboard',label: 'Leaderboard',  icon: BarChart3 },
  { path: '/akademik/takwim',     label: 'Takwim',       icon: CalendarDays },
  { path: '/akademik/qr',         label: 'Scan QR',      icon: QrCode },
];

const THEME = '#818CF8';

export function AkademikLayout() {
  const { profile } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) =>
    path === '/akademik' ? location.pathname === '/akademik' : location.pathname.startsWith(path);

  // Auto close sidebar on mobile when location changes
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll apabila sidebar terbuka di mobile
  React.useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden">

      {/* ── Background blobs ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-[30%] -left-[10%] w-[60vw] h-[60vw] rounded-full opacity-[0.06] blur-3xl"
          style={{ background: THEME }}
        />
        <div
          className="absolute bottom-0 right-0 w-[50vw] h-[50vw] rounded-full opacity-[0.04] blur-3xl"
          style={{ background: '#60A5FA' }}
        />
      </div>

      {/* ── Mobile Sidebar Overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 md:hidden"
            >
              <Sidebar onClose={() => setSidebarOpen(false)} isActive={isActive} navigate={navigate} profile={profile} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop Sidebar ── */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-64">
        <Sidebar onClose={() => {}} isActive={isActive} navigate={navigate} profile={profile} />
      </div>

      {/* ── Main ── */}
      <div className="relative z-10 md:ml-64 flex flex-col min-h-screen">

        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center gap-2">
            <div
              className="hidden md:flex w-7 h-7 rounded-lg items-center justify-center"
              style={{ background: `${THEME}20`, color: THEME }}
            >
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-white/30">
              e-Akademik
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
            <button
              onClick={() => navigate('/portal')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <ArrowLeft className="w-3 h-3" />
              Portal
            </button>
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/[0.08]">
              <Avatar className="w-full h-full rounded-none">
                <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
                <AvatarFallback className="bg-white/5 text-white/50 text-xs font-black">
                  {profile?.full_name?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full after:content-[''] after:block after:h-32 after:shrink-0">
          <Outlet />
        </main>
        
        {/* Global Floating AI Chat for Akademik */}
        <FloatingAiChat />

        {/* QR Code FAB — untuk Exco Akademik jana QR */}
        <QrCodeFab unitLinks={AKADEMIK_UNIT_LINKS} accentColor="#818CF8" />
        <BottomNav onOpenSidebar={() => setSidebarOpen(true)} />
      </div>
    </div>
  );
}

// ─── Sidebar Component ────────────────────────────────────────
function Sidebar({ onClose, isActive, navigate, profile }: any) {
  const { signOut, isSuperAdmin } = useAuth();
  const isJpp = isSuperAdmin || profile?.role === 'JPP';
  const displayName = profile?.full_name || profile?.email?.split('@')[0] || '?';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="w-full flex flex-col h-full bg-slate-900/95 backdrop-blur-xl border-r border-white/[0.06] overflow-hidden">
      {/* Header */}
      {/* Header */}
      <div className="flex flex-col border-b border-white/[0.06]">
        <button
          onClick={() => navigate('/portal')}
          className="flex items-center gap-2 px-5 pt-4 pb-2 transition-all duration-200 group text-white/40 hover:text-white/75 w-max"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Portal JPP</span>
        </button>
        <div className="flex items-center justify-between px-5 pb-4 pt-1">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: `${THEME}20`, color: THEME, boxShadow: `0 0 20px ${THEME}20` }}
            >
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-white">e-Akademik</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Exco Akademik</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20 px-3 mb-3">Navigasi</p>
        {NAV_ITEMS.map(item => {
          const active = isActive(item.path);
          const Icon   = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); onClose(); }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-200 group',
                active
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all',
                  active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                )}
                style={active ? { background: `${THEME}25`, color: THEME } : {}}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-black flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 shrink-0" style={{ color: THEME }} />}
            </button>
          );
        })}
      </nav>

      {/* ── Global JPP Dashboard Link ── */}
      {isJpp && (
        <div className="px-3 py-2 mt-auto pb-4">
          <button
            onClick={() => { navigate('/jpp'); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest leading-tight text-amber-400 text-left">Global JPP<br />Dashboard</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.06] space-y-3 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8 rounded-xl ring-2 ring-white/10 shadow-md">
            <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
            <AvatarFallback className="font-black text-xs" style={{ background: THEME, color: '#0f172a' }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-xs font-black truncate leading-tight text-white/85">{displayName}</p>
            <p className="text-[10px] font-black uppercase tracking-widest truncate text-white/40">{profile?.department?.toUpperCase() || profile?.role || 'AHLI'}</p>
          </div>
          <div
            className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest ml-auto shrink-0"
            style={{ background: `${THEME}20`, color: THEME }}
          >
            {profile?.merit || 0} Merit
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start gap-3 h-9 px-3 font-black text-[10px] uppercase tracking-widest rounded-xl text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          Log Keluar
        </Button>
      </div>
    </div>
  );
}
