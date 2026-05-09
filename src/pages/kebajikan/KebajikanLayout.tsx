import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { KebajikanSidebar } from './KebajikanSidebar';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import { QrCodeFab } from '@/components/jpp/QrCodeFab';
import { BottomNav } from '@/components/layout/BottomNav';

const KEBAJIKAN_UNIT_LINKS = [
  { label: 'Hantar Aduan Kebajikan', path: '/kebajikan/buat-aduan' },
  { label: 'Statistik Kebajikan', path: '/kebajikan/statistik' },
  { label: 'Semak Status Tiket', path: '/kebajikan/tiket' },
];

export function KebajikanLayout() {
  const { isLoading, hasKebajikanAccess, hasKebajikanKKAccess } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

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
          Memuatkan E-Kebajikan...
        </div>
      </div>
    );
  }

  // Redirect pelajar biasa jika cuba akses dashboard/laluan Exco
  const isExcoRoute = location.pathname === '/kebajikan' || 
                      location.pathname.startsWith('/kebajikan/tiket') || 
                      location.pathname.startsWith('/kebajikan/laporan') || 
                      location.pathname.startsWith('/kebajikan/staff') || 
                      location.pathname.startsWith('/kebajikan/tetapan');

  // Pengguna yang tidak ada akses Kebajikan MAHUPUN KK → redirect ke submit page
  if (!hasKebajikanAccess && !hasKebajikanKKAccess && isExcoRoute) {
    return <Navigate to="/kebajikan/buat-aduan" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-50 relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] lg:hidden" 
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

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-50 relative min-w-0">
        <div className="lg:hidden flex-shrink-0 flex items-center justify-between px-4 h-14 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl relative z-30">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="p-2 -ml-2 text-white/50 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-black text-[10px] uppercase tracking-widest text-[#2DD4BF] ml-1">E-Kebajikan</span>
          </div>
          <NotificationBell variant="dark" />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <Outlet />
        </div>
        <FloatingAiChat />

        {/* QR Code FAB — untuk Exco Kebajikan */}
        <QrCodeFab unitLinks={KEBAJIKAN_UNIT_LINKS} />
        <BottomNav onOpenSidebar={() => setSidebarOpen(true)} />
      </main>
    </div>
  );
}
