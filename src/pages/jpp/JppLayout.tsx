import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { JppSidebar } from './JppSidebar';
import { Menu, X } from 'lucide-react';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import { QrCodeFab } from '@/components/jpp/QrCodeFab';

const JPP_UNIT_LINKS = [
  { label: 'Dashboard JPP HQ', path: '/jpp' },
  { label: 'Senarai Ahli JPP', path: '/jpp/ahli' },
  { label: 'Pengumuman JPP', path: '/jpp/pengumuman' },
  { label: 'Takwim JPP', path: '/jpp/takwim' },
  { label: 'NEXUS (Tugasan)', path: '/jpp/nexus' },
];

export function JppLayout() {
  const { isJppMember, isSuperAdmin, isLoading, hasKediamanAccess } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close sidebar on route change (mobile)
  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-4 rounded-full border-border" />
          <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin border-rose-500" />
        </div>
      </div>
    );
  }

  // Access guard: JPP + SuperAdmin + Unit Pengurusan Asrama staff
  if (!isJppMember && !isSuperAdmin && !hasKediamanAccess) {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div className="dark flex h-screen overflow-hidden bg-[#0a0a0f]">

      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-[100] md:hidden bg-black/70 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={[
        'fixed inset-y-0 left-0 z-[110] w-72 transform transition-transform duration-300 ease-in-out',
        'md:relative md:translate-x-0 md:flex-shrink-0',
        isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0',
      ].join(' ')}>
        {/* Mobile close button */}
        <div className="md:hidden absolute right-4 top-5 z-10">
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-full text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <JppSidebar />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top header (mobile + tablet) */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 -ml-1 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/jpp-logo.png" alt="JPP" className="h-7 object-contain" />
            <span className="text-sm font-black text-white tracking-tight">JPP HQ</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-hide">
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

        {/* Global Floating AI Chat for JPP HQ */}
        <FloatingAiChat />

        {/* QR Code FAB — untuk semua ahli JPP jana QR berjenama */}
        <QrCodeFab unitLinks={JPP_UNIT_LINKS} />
      </div>
    </div>
  );
}
