import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  GraduationCap, LayoutDashboard, Trophy, FileText,
  BarChart3, QrCode, ArrowLeft, Menu, X, ChevronRight,
  Star, BookOpen, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';

const NAV_ITEMS = [
  { path: '/akademik',            label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/akademik/pencapaian', label: 'Pencapaian',   icon: Trophy },
  { path: '/akademik/cgpa',       label: 'HPNM / CGPA',  icon: BookOpen },
  { path: '/akademik/merit',      label: 'Merit Saya',   icon: Star },
  { path: '/akademik/folder',     label: 'Dokumen',      icon: FileText },
  { path: '/akademik/leaderboard',label: 'Leaderboard',  icon: BarChart3 },
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
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <Outlet />
        </main>
        
        {/* Global Floating AI Chat for Akademik */}
        <FloatingAiChat />
      </div>
    </div>
  );
}

// ─── Sidebar Component ────────────────────────────────────────
function Sidebar({ onClose, isActive, navigate, profile }: any) {
  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-xl border-r border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
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

      {/* User chip */}
      <div className="px-4 py-3 mx-3 mt-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/[0.08] shrink-0">
          <Avatar className="w-full h-full rounded-none">
            <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
            <AvatarFallback className="bg-white/5 text-white/50 text-[10px] font-black">
              {profile?.full_name?.[0]}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black text-white truncate">{profile?.full_name?.split(' ')[0]}</p>
          <p className="text-[9px] text-white/30 font-bold truncate">{profile?.department?.toUpperCase() || profile?.role}</p>
        </div>
        <div
          className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
          style={{ background: `${THEME}20`, color: THEME }}
        >
          {profile?.merit || 0} Merit
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

      {/* JPP Link */}
      <div className="px-3 pb-2">
        <button
          onClick={() => navigate('/jpp')}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <Building2 className="w-3.5 h-3.5" />
          JPP HQ Portal
        </button>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.06]">
        <button
          onClick={() => navigate('/portal')}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Portal
        </button>
      </div>
    </div>
  );
}
