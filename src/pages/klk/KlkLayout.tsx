import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { KlkSidebar } from './KlkSidebar';
import { Menu, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import { QrCodeFab } from '@/components/jpp/QrCodeFab';
import { BottomNav } from '@/components/layout/BottomNav';

export function KlkLayout() {
  const { t } = useTranslation(['housing', 'common']);
  const { isLoading, profile, isSuperAdmin } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const klkUnitLinks = [
    { label: t('housing:nav_declaration_form', 'Borang Deklarasi Kediaman'), path: '/klk' },
    { label: t('housing:nav_exco_dashboard', 'Dashboard Exco KLS'), path: '/klk/dashboard' },
    { label: t('housing:nav_public_stats', 'Statistik Kediaman Luar Kampus'), path: '/klk/statistik' },
  ];

  // Tutup sidebar auto bila tukar page di mobile
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
      <div className={cn("h-screen w-screen flex items-center justify-center", isDark ? "bg-slate-950" : "bg-slate-50")}>
        <div className={cn("animate-pulse font-black text-xs uppercase tracking-[0.3em] opacity-40", isDark ? "text-white" : "text-slate-700")}>
          {t('housing:loading_klk', 'Memuatkan Kediaman Luar Kampus...')}
        </div>
      </div>
    );
  }

  // RBAC — hanya Exco KLS + SUPER_ADMIN boleh akses
  const isKlsExco = profile?.role === 'JPP' && profile?.jpp_unit === 'KLS';
  const hasAccess = isSuperAdmin || isKlsExco;

  if (!hasAccess) {
    return <Navigate to="/jpp" replace />;
  }

  return (
    <div className={cn(
      "flex h-screen overflow-hidden relative transition-colors duration-300",
      isDark ? "bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900"
    )}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[130] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed lg:relative z-[140] h-screen transition-transform duration-300 ease-in-out lg:translate-x-0 w-[280px] flex-shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <KlkSidebar />
      </div>

      {/* Main content */}
      <main className={cn(
        "flex-1 flex flex-col h-screen overflow-hidden relative min-w-0 transition-colors duration-300",
        isDark ? "bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900"
      )}>
        {/* Mobile topbar */}
        <div className={cn(
          "lg:hidden flex-shrink-0 flex items-center justify-between px-4 h-14 border-b relative z-30 transition-colors duration-300",
          isDark ? "border-white/5 bg-slate-950/80 backdrop-blur-md" : "border-slate-200 bg-white/80 backdrop-blur-md"
        )}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className={cn("p-2 -ml-2 transition-colors", isDark ? "text-white/50 hover:text-white" : "text-slate-500 hover:text-slate-900")}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 ml-1">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-black text-[10px] uppercase tracking-widest text-blue-500">
                {t('housing:title_klk', 'Kediaman Luar Kampus')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell variant={isDark ? "dark" : "light"} />
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto after:content-[''] after:block after:h-40 after:shrink-0">
          <Outlet />
        </div>

        <FloatingAiChat />

        {/* QR Code FAB — untuk Exco KLS jana QR */}
        <QrCodeFab unitLinks={klkUnitLinks} />
        <BottomNav onOpenSidebar={() => setSidebarOpen(true)} />
      </main>
    </div>
  );
}
