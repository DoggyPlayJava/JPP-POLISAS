import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '../ui/CommandPalette';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import { EXCO_MODULES } from '@/config/excoModules';
import { ExcoIcon } from '@/components/ui/ExcoIcon';
import { QrCodeFab } from '@/components/jpp/QrCodeFab';
import { BottomNav } from './BottomNav';

const KPP_UNIT_LINKS = [
  { label: 'Senarai Program / Aktiviti', path: '/aktiviti' },
  { label: 'Senarai Kelab', path: '/kelab' },
  { label: 'Leaderboard Merit', path: '/leaderboard' },
  { label: 'Dashboard KPP', path: '/dashboard' },
  { label: 'Jadual Perjumpaan Kelab', path: '/takwim' },
];

// Detect exco aktif dari pathname (sama logik dengan Sidebar.tsx)
const EKPP_ROUTES = [
  '/dashboard', '/kelab', '/sertai-kelab', '/aktiviti', '/ahli',
  '/tetapan', '/carian', '/laporan', '/urus-kelab', '/semakan-laporan',
  '/leaderboard', '/logs', '/karnival', '/nexus',
];
function detectExcoFromPath(pathname: string) {
  if (EKPP_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    return EXCO_MODULES.find(m => m.id === 'ekpp')!;
  }
  for (const mod of EXCO_MODULES) {
    if (mod.id === 'ekpp') continue;
    if (pathname.startsWith(mod.basePath)) return mod;
  }
  return EXCO_MODULES.find(m => m.id === 'ekpp')!;
}

export function AppLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Detect exco aktif untuk header mobile
  const activeExco = detectExcoFromPath(location.pathname);

  // Auto-tutup sidebar bila tukar page di mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll apabila sidebar terbuka di mobile
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary selection:text-white">

      {/* ── 1. BACKDROP (MOBILE ONLY) ── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── 2. SIDEBAR (RESPONSIVE) ── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[140] w-72 transform transition-transform duration-300 ease-in-out bg-sidebar",
        "md:relative md:translate-x-0 md:flex-shrink-0",
        isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        {/* Butang Close (X) khas untuk mobile di dalam sidebar */}
        <div className="md:hidden absolute right-4 top-5">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="rounded-full text-white/50">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <Sidebar />
      </aside>

      {/* ── 3. MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* ── MOBILE HEADER OVERRIDE ── */}
        <div className="md:hidden flex items-center p-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-[50]">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="mr-3 bg-muted/50 rounded-xl"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-lg shadow-sm overflow-hidden">
              <ExcoIcon iconName={activeExco.icon} className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <span className="font-black text-[13px] uppercase tracking-tighter text-foreground block">
                {activeExco.name}
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 block">
                JPP Polisas
              </span>
            </div>
          </div>
        </div>

        {/* Header Asal (Carian, Profile dll) */}
        <Header onOpenSearch={() => setIsSearchOpen(true)} />

        <main id="main-scroll-container" className="flex-1 overflow-y-auto bg-background scrollbar-hide pb-28">
          <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="h-full"
              style={{ willChange: 'opacity' }}
            >
              <Outlet />
            </motion.div>
        </main>

        {/* Global Command Palette */}
        <CommandPalette open={isSearchOpen} onOpenChange={setIsSearchOpen} />

        {/* Global Floating AI Chat */}
        <FloatingAiChat />

        {/* QR Code FAB — untuk Exco KPP jana QR */}
        <QrCodeFab unitLinks={KPP_UNIT_LINKS} />

        {/* Floating Mobile Navigation Dock */}
        <BottomNav 
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      </div>
    </div>
  );
}