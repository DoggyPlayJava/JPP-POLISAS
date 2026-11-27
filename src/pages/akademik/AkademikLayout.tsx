import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  GraduationCap, LayoutDashboard, Trophy, FileText,
  BarChart3, QrCode, ArrowLeft, Menu, X, ChevronRight,
  Star, BookOpen, Building2, LogOut, Crown, CalendarDays, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { QrCodeFab } from '@/components/jpp/QrCodeFab';
import { BottomNav } from '@/components/layout/BottomNav';
import { SystemTour } from '@/components/ui/SystemTour';
import { useTour } from '@/hooks/useTour';
import { useEdgeSwipeDrawer } from '@/hooks/useEdgeSwipeDrawer';



const THEME = '#0D9488';

export function AkademikLayout() {
  const { t } = useTranslation(['akademik', 'nav', 'common']);
  const { profile } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEdgeSwipeDrawer({ isOpen: sidebarOpen, onOpen: () => setSidebarOpen(true) });
  const { runTour, startTour, closeTour } = useTour('akademik_module_tour', false);

  const akademikUnitLinks = React.useMemo(() => [
    { label: t('akademik:academic_dashboard_btn', 'Dashboard Akademik'), path: '/akademik' },
    { label: t('akademik:student_achievements', 'Pencapaian Pelajar'), path: '/akademik/pencapaian' },
    { label: t('akademik:merit_leaderboard', 'Leaderboard Merit Akademik'), path: '/akademik/leaderboard' },
    { label: t('akademik:scan_qr_merit', 'Scan QR Merit'), path: '/akademik/qr' },
    { label: t('akademik:academic_takwim', 'Takwim Akademik'), path: '/akademik/takwim' },
  ], [t]);

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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const akademikTourSteps = [
    {
      target: 'body',
      content: t('akademik:tour_welcome_content', 'Selamat datang ke e-Akademik! Sistem berpusat untuk mengurus pencapaian, merit, dan dokumen akademik anda.'),
      title: t('akademik:tour_welcome_title', 'Modul e-Akademik'),
      placement: 'center' as const,
      disableBeacon: true,
    },
    {
      target: isMobile ? '.tour-mobile-hamburger' : '.tour-akademik-sidebar',
      content: isMobile
        ? t('akademik:tour_nav_mobile_content', 'Gunakan menu ini untuk mengakses pencapaian, HPNM/CGPA, dokumen, dan merit.')
        : t('akademik:tour_nav_desktop_content', 'Di ruangan tepi ini, anda boleh melihat pencapaian, mengemas kini CGPA, serta menyemak merit.'),
      title: t('akademik:tour_nav_title', 'Navigasi Menu'),
      placement: isMobile ? 'bottom' as const : 'right' as const,
    },
    {
      target: '.tour-akademik-cgpa',
      content: t('akademik:tour_cgpa_content', 'Di sini anda dapat melihat ringkasan CGPA terkini dan memantau prestasi akademik anda dari masa ke semasa.'),
      title: t('akademik:tour_cgpa_title', 'Prestasi Akademik'),
      placement: 'bottom' as const,
    },
    {
      target: '.tour-akademik-merit',
      content: t('akademik:tour_merit_content', 'Anda boleh memantau baki merit anda di sini untuk kelayakan permohonan asrama.'),
      title: t('akademik:tour_merit_title', 'Status Merit'),
      placement: 'bottom' as const,
    }
  ];

  return (
    <div className="min-h-[100dvh] bg-[#F6FBF9] dark:bg-[#090B0E] text-[#0B2420] dark:text-[#F1F5F9] font-sans overflow-x-hidden transition-colors duration-200">
      <SystemTour
        run={runTour}
        onClose={closeTour}
        steps={akademikTourSteps}
      />

      {/* ── Background blobs ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-[30%] -left-[10%] w-[60vw] h-[60vw] rounded-full opacity-[0.06] "
          style={{ background: THEME }}
        />
        <div
          className="absolute bottom-0 right-0 w-[50vw] h-[50vw] rounded-full opacity-[0.04] "
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
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[130] bg-black/65 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
              className="fixed left-0 top-0 bottom-0 z-[140] w-72 md:hidden overscroll-contain"
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
      <div className="relative z-10 md:ml-64 flex flex-col min-h-[100dvh]">

        {/* Top Bar */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-[#B8E4DC]/80 dark:border-[#252B35] bg-white dark:bg-[#13171D]"
          style={{ paddingTop: 'calc(0.875rem + var(--sat, env(safe-area-inset-top, 0px)))' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="tour-mobile-hamburger md:hidden p-2 rounded-xl text-[#3B635C] dark:text-white/50 hover:text-[#0B2420] dark:hover:text-white hover:bg-[#EBF7F4] dark:hover:bg-white/[0.06] transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-2">
            <div
              className="hidden md:flex w-7 h-7 rounded-lg items-center justify-center shrink-0"
              style={{ background: `${THEME}20`, color: THEME }}
            >
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-[#3B635C] dark:text-[#94A0B2] truncate">
              e-Akademik
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button onClick={startTour} className="hidden sm:flex p-2 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-xl transition-colors" aria-label="Panduan">
               <HelpCircle className="w-4 h-4" />
            </button>
            <LanguageToggle />
            <ThemeToggle />
            <NotificationBell />
            <button
              onClick={() => navigate('/portal')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#94A0B2] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors text-[10px] font-black uppercase tracking-widest"
            >
              <ArrowLeft className="w-3 h-3" />
              {t('nav:portal', 'Portal')}
            </button>
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-slate-200 dark:border-[#252B35] shrink-0">
              <Avatar className="w-full h-full rounded-none">
                <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
                <AvatarFallback className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 text-xs font-black">
                  {profile?.full_name?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full after:content-[''] after:block after:h-40 after:shrink-0">
          <Outlet />
        </main>
        
        {/* Global Floating AI Chat for Akademik */}
        <FloatingAiChat />

        {/* QR Code FAB — untuk Exco Akademik jana QR */}
        <QrCodeFab unitLinks={akademikUnitLinks} accentColor="#0D9488" />
        <div className="tour-akademik-mobile-nav">
          <BottomNav onOpenSidebar={() => setSidebarOpen(true)} />
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Component ────────────────────────────────────────
function Sidebar({ onClose, isActive, navigate, profile }: any) {
  const { t } = useTranslation(['akademik', 'nav', 'common']);
  const { signOut, isSuperAdmin } = useAuth();
  const isJpp = isSuperAdmin || profile?.role === 'JPP';
  const displayName = profile?.full_name || profile?.email?.split('@')[0] || '?';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="w-full flex flex-col h-full bg-gradient-to-b from-[#0B2420] to-[#061714] dark:from-[#0E1116] dark:to-[#090B0E] border-r border-teal-400/15 dark:border-[#252B35] text-[#F6FBF9] dark:text-[#F1F5F9] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col border-b border-white/10 pt-[var(--sat,env(safe-area-inset-top,0px))] md:pt-0">
        <button
          onClick={() => navigate('/portal')}
          className="flex items-center gap-2 px-5 pt-4 pb-2 transition-colors duration-150 group text-[#99CBC2] dark:text-[#94A0B2] hover:text-white w-max"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">{t('nav:jpp_portal', 'Portal JPP')}</span>
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#99CBC2] dark:text-[#94A0B2]">{t('akademik:exco_academic', 'Exco Akademik')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="md:hidden p-2 rounded-xl text-[#99CBC2] dark:text-[#94A0B2] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="tour-akademik-sidebar flex-1 px-3 py-4 space-y-1 overflow-y-auto overscroll-contain">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/60 px-3 mb-3">{t('nav:navigation', 'Navigasi')}</p>
        {[
          { path: '/akademik',            label: t('nav:dashboard', 'Dashboard'), icon: LayoutDashboard },
          { path: '/akademik/pencapaian', label: t('akademik:nav_achievements', 'Pencapaian'), icon: Trophy },
          { path: '/akademik/cgpa',       label: t('akademik:nav_cgpa', 'HPNM / CGPA'), icon: BookOpen },
          { path: '/akademik/merit',      label: t('akademik:nav_my_merit', 'Merit Saya'), icon: Star },
          { path: '/akademik/folder',     label: t('akademik:nav_documents', 'Dokumen'), icon: FileText },
          { path: '/akademik/leaderboard',label: t('akademik:nav_leaderboard', 'Leaderboard'), icon: BarChart3 },
          { path: '/akademik/takwim',     label: t('nav:takwim', 'Takwim'), icon: CalendarDays },
          { path: '/akademik/qr',         label: t('nav:scan_qr', 'Scan QR'), icon: QrCode },
        ].map(item => {
          const active = isActive(item.path);
          const Icon   = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); onClose(); }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-200 group',
                active
                  ? 'bg-teal-500/20 text-white border border-teal-400/25'
                  : 'text-[#99CBC2] hover:text-white hover:bg-white/[0.06] dark:text-[#94A0B2]'
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/25"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest leading-tight text-amber-300 text-left">{t('nav:global_jpp_dashboard', 'Global JPP Dashboard')}</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-white/10 text-white space-y-3 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8 rounded-xl ring-2 ring-white/15 shadow-md">
            <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
            <AvatarFallback className="font-black text-xs" style={{ background: THEME, color: '#061714' }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-xs font-black truncate leading-tight text-white/95">{displayName}</p>
            <p className="text-[10px] font-black uppercase tracking-widest truncate text-[#99CBC2]">{profile?.department?.toUpperCase() || profile?.role || 'AHLI'}</p>
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
          className="w-full justify-start gap-3 h-9 px-3 font-black text-[10px] uppercase tracking-widest rounded-xl text-white/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          {t('nav:logout', 'Log Keluar')}
        </Button>
      </div>
    </div>
  );
}
