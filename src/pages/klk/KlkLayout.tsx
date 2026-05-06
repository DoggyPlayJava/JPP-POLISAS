import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { KlkSidebar } from './KlkSidebar';
import { Menu, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import { QrCodeFab } from '@/components/jpp/QrCodeFab';

const KLK_UNIT_LINKS = [
  { label: 'Borang Deklarasi Kediaman', path: '/klk' },
  { label: 'Dashboard Exco KLS', path: '/klk/dashboard' },
  { label: 'Statistik Kediaman Luar Kampus', path: '/klk/statistik' },
];

export function KlkLayout() {
  const { isLoading, profile, isSuperAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

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
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="animate-pulse font-black text-xs uppercase tracking-[0.3em] opacity-20 text-white">
          Memuatkan Kediaman Luar Kampus...
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
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-50 relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed lg:relative z-50 h-screen transition-transform duration-300 ease-in-out lg:translate-x-0 w-[280px] flex-shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <KlkSidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950 relative min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden flex-shrink-0 flex items-center justify-between px-4 h-14 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl relative z-30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-white/50 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 ml-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-black text-[10px] uppercase tracking-widest text-blue-400">
                Kediaman Luar Kampus
              </span>
            </div>
          </div>
          <NotificationBell variant="dark" />
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>

        <FloatingAiChat />

        {/* QR Code FAB — untuk Exco KLS jana QR */}
        <QrCodeFab unitLinks={KLK_UNIT_LINKS} />
      </main>
    </div>
  );
}
