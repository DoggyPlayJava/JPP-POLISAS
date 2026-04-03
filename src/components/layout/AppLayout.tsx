import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '../ui/CommandPalette';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, HelpCircle, MessageSquare, Send, ChevronRight } from 'lucide-react';
import { 
  Popover, PopoverContent, PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Auto-tutup sidebar bila tukar page di mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── 2. SIDEBAR (RESPONSIVE) ── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[110] w-72 transform transition-transform duration-300 ease-in-out bg-sidebar",
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
            {/* ⚠️ Nota: Folder public tak perlu tulis /public/ dalam src */}
            <img
              src="/jpp-logo.png"
              alt="Logo JPP"
              className="w-8 h-8 object-contain rounded-lg shadow-sm"
              onError={(e) => {
                (e.target as any).src = 'https://api.dicebear.com/7.x/identicon/svg?seed=JPP';
              }}
            />
            <span className="font-black text-[14px] uppercase tracking-tighter text-foreground">
              e-KPP POLISAS
            </span>
          </div>
        </div>

        {/* Header Asal (Carian, Profile dll) */}
        <Header onOpenSearch={() => setIsSearchOpen(true)} />

        <main className="flex-1 overflow-y-auto bg-background scrollbar-hide pb-20 md:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Global Nav for Mobile */}
        <BottomNav />

        {/* Global Command Palette */}
        <CommandPalette open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      </div>
    </div>
  );
}