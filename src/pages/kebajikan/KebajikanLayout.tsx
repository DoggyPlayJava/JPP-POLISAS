import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { KebajikanSidebar } from './KebajikanSidebar';
import { Menu, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import { QrCodeFab } from '@/components/jpp/QrCodeFab';
import { BottomNav } from '@/components/layout/BottomNav';
import { SystemTour } from '@/components/ui/SystemTour';
import { HelpCircle } from 'lucide-react';
import { useTour } from '@/hooks/useTour';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useTheme } from '@/contexts/ThemeContext';



export function KebajikanLayout() {
  const { t } = useTranslation(['kebajikan', 'common']);
  const { isLoading, hasKebajikanAccess, hasKebajikanKKAccess, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { runTour, startTour, closeTour } = useTour('kebajikan_module_tour', false);

  const kebajikanUnitLinks = [
    { label: t('kebajikan:nav_submit_complaint', 'Hantar Aduan Kebajikan'), path: '/kebajikan/buat-aduan' },
    { label: t('kebajikan:nav_welfare_stats', 'Statistik Kebajikan'), path: '/kebajikan/statistik' },
    { label: t('kebajikan:nav_check_ticket_status', 'Semak Status Tiket'), path: '/kebajikan/tiket' },
  ];

  const isSubmitOrChatPage =
    location.pathname.includes('/kebajikan/buat-aduan') ||
    location.pathname.includes('/kebajikan/aduan/') ||
    location.pathname.includes('/kebajikan/foodbank');

  // Tutup sidebar automatik bila tukar page di mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll apabila sidebar terbuka di mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-pulse font-black text-xs uppercase tracking-[0.3em] opacity-20">
          {t('kebajikan:loading_ekebajikan', 'Memuatkan E-Kebajikan...')}
        </div>
      </div>
    );
  }

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Redirect pelajar biasa jika cuba akses dashboard/laluan Exco
  const isExcoRoute = location.pathname === '/kebajikan/dashboard' || 
                      location.pathname.startsWith('/kebajikan/tiket') || 
                      location.pathname.startsWith('/kebajikan/laporan') || 
                      location.pathname.startsWith('/kebajikan/staff') || 
                      location.pathname.startsWith('/kebajikan/tetapan');

  // Pengguna yang tidak ada akses Kebajikan MAHUPUN KK → redirect ke submit page
  if (!hasKebajikanAccess && !hasKebajikanKKAccess && isExcoRoute) {
    return <Navigate to="/kebajikan/buat-aduan" replace />;
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const kebajikanTourSteps = [
    {
      target: 'body',
      content: t('kebajikan:tour_welcome_desc', 'Selamat datang ke modul E-Kebajikan! Sistem pemantauan aduan dan penyelesaian masalah berpusat.'),
      title: 'E-Kebajikan 🤝',
      placement: 'center' as const,
      disableBeacon: true,
    },
    {
      target: isMobile ? '.tour-mobile-hamburger' : '.tour-kebajikan-sidebar',
      content: isMobile
        ? t('kebajikan:tour_nav_mobile_desc', 'Gunakan menu ini untuk membuat aduan atau memantau status aduan anda.')
        : t('kebajikan:tour_nav_desktop_desc', 'Akses semua keperluan e-kebajikan dari panel sisi ini. Buat aduan, semak status dan lihat statistik awam.'),
      title: 'Menu Navigasi 📑',
      placement: isMobile ? 'bottom' as const : 'right' as const,
    },
    {
      target: '.tour-kebajikan-mobile-nav',
      content: t('kebajikan:tour_fast_nav_desc', 'Ruangan pantas navigasi untuk mengakses pelbagai fungsi ke arah kebajikan warga kampus.'),
      title: 'Navigasi Pantas 🚀',
      placement: 'top' as const,
    }
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      <SystemTour
        run={runTour}
        onClose={closeTour}
        steps={kebajikanTourSteps}
      />
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60  z-[130] lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar container */}
      <div 
        className={cn(
          "fixed lg:relative z-[140] h-screen transition-transform duration-300 ease-in-out lg:translate-x-0 w-[280px]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <KebajikanSidebar />
      </div>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 relative min-w-0 transition-colors">
        <div className="lg:hidden flex-shrink-0 flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-950/80  relative z-30 transition-colors">
          <div className="flex items-center gap-2">

            {isSubmitOrChatPage ? (
              <Link
                to="/portal"
                className="p-2 -ml-2 text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 text-xs font-bold"
                aria-label={t('kebajikan:back_to_portal', 'Kembali ke Portal')}
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden xs:inline">Portal</span>
              </Link>
            ) : (
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="tour-mobile-hamburger p-2 -ml-2 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex flex-col ml-1">
              <span className="font-black text-[10px] uppercase tracking-widest text-[#2DD4BF]">{t('module_title')}</span>
              <span className="text-[8px] font-medium text-slate-400 dark:text-slate-500 hidden sm:inline">{t('module_subtitle')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={startTour} className="p-2 text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all">
              <HelpCircle className="w-4 h-4" />
            </button>
            <LanguageToggle />
            <ThemeToggle />
            <NotificationBell variant={isDark ? 'dark' : 'light'} />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto after:content-[''] after:block after:h-40 after:shrink-0">
          <Outlet />
        </div>

        {/* Floating Controls & Navigation — disembunyikan semasa isi aduan & sembang tiket supaya tidak bertindih */}
        {!isSubmitOrChatPage && (
          <>
            <FloatingAiChat />
            {/* QR Code FAB — untuk Exco Kebajikan */}
            <QrCodeFab unitLinks={kebajikanUnitLinks} />
            <div className="tour-kebajikan-mobile-nav">
              <BottomNav onOpenSidebar={() => setSidebarOpen(true)} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
