import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { JppSidebar } from './JppSidebar';
import { Menu, X, Search } from 'lucide-react';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import { QrCodeFab } from '@/components/jpp/QrCodeFab';
import { BottomNav } from '@/components/layout/BottomNav';
import { JppCommandPalette } from '@/components/jpp/JppCommandPalette';

// Auto-calculate current academic session
function getCurrentAcademicSession(): string {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  return m >= 6 ? `Sem 1 ${y}/${y + 1}` : `Sem 2 ${y - 1}/${y}`;
}

const JPP_UNIT_LINKS = [
  { label: 'Dashboard JPP HQ', path: '/jpp' },
  { label: 'Senarai Ahli JPP', path: '/jpp/members' },
  { label: 'Pengumuman JPP', path: '/jpp/announcements' },
  { label: 'Takwim JPP', path: '/jpp/takwim' },
  { label: 'NEXUS (Tugasan)', path: '/jpp/nexus' },
];

export function JppLayout() {
  const { user, isJppMember, isSuperAdmin, isLoading, hasKediamanAccess } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [isFbOfficer, setIsFbOfficer] = useState(false);
  const [checkingFbOfficer, setCheckingFbOfficer] = useState(true);

  // Close sidebar on route change (mobile)
  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll apabila sidebar terbuka di mobile
  React.useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  // Semak jika pengguna memegang status pegawai Food Bank aktif
  useEffect(() => {
    if (!user?.id) {
      setCheckingFbOfficer(false);
      return;
    }
    let isMounted = true;
    supabase
      .from('foodbank_officers')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(
        ({ data }) => {
          if (isMounted) {
            if (data) setIsFbOfficer(true);
            setCheckingFbOfficer(false);
          }
        },
        () => {
          if (isMounted) setCheckingFbOfficer(false);
        }
      );
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  if (isLoading || (checkingFbOfficer && !isJppMember && !isSuperAdmin && !hasKediamanAccess && location.pathname.startsWith('/jpp/foodbank'))) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F8F6EE] dark:bg-[#151D16]">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-4 rounded-full border-[#D9C9B2]/40 dark:border-[#3A4A3B]/40" />
          <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin border-[#2E3A2F] dark:border-[#6B7F5B]" />
        </div>
      </div>
    );
  }

  // Access guard: JPP + SuperAdmin + Unit Pengurusan Asrama staff + Active Food Bank Officers accessing /jpp/foodbank
  const isAllowedPath = isFbOfficer && location.pathname.startsWith('/jpp/foodbank');
  if (!isJppMember && !isSuperAdmin && !hasKediamanAccess && !isAllowedPath) {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F6EE] dark:bg-[#151D16] text-[#2E3A2F] dark:text-[#F8F6EE] transition-colors jpp-canvas-texture">

      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-[130] md:hidden bg-black/70 "
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={[
        'fixed inset-y-0 left-0 z-[140] w-72 transform transition-transform duration-300 ease-in-out',
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
        <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-[#D9C9B2]/80 dark:border-[#3A4A3B] bg-[#F8F6EE]/80 dark:bg-[#151D16]/80  sticky top-0 z-50 text-[#2E3A2F] dark:text-white">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 -ml-1 rounded-xl text-[#2E3A2F]/70 dark:text-white/50 hover:text-[#2E3A2F] dark:hover:text-white hover:bg-[#2E3A2F]/5 dark:hover:bg-white/10 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <img src="/jpp-logo.png" alt="JPP" className="h-7 object-contain" />
              <span className="text-sm font-black tracking-tight text-[#2E3A2F] dark:text-white">JPP HQ</span>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-[#556453] dark:text-white/25 mt-0.5">
              {getCurrentAcademicSession()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCmdOpen(true)}
              className="p-2 rounded-xl text-[#2E3A2F]/70 dark:text-white/50 hover:text-[#2E3A2F] dark:hover:text-white hover:bg-[#2E3A2F]/5 dark:hover:bg-white/10 transition-all"
              title="Cari atau Buka Perintah (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-hide after:content-[''] after:block after:h-40 after:shrink-0 bg-[#F8F6EE] dark:bg-[#151D16]">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>

        {/* Global Floating AI Chat for JPP HQ */}
        <FloatingAiChat />

        {/* QR Code FAB : untuk semua ahli JPP jana QR berjenama */}
        <QrCodeFab unitLinks={JPP_UNIT_LINKS} />

        {/* Floating Mobile Navigation Dock */}
        <BottomNav onOpenSidebar={() => setIsMobileOpen(true)} />

        {/* Global Command Palette (Ctrl+K) */}
        <JppCommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      </div>
    </div>
  );
}
