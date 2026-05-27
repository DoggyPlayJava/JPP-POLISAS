import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Trophy, Users, BarChart3, Calendar, Layers,
  Menu, X, ArrowLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSupsas } from '@/contexts/SupsasContext';

const ADMIN_NAV = [
  { label: 'Gambaran Keseluruhan', path: '/supsas/admin',          icon: BarChart3, exact: true },
  { label: 'Urus Sukan',           path: '/supsas/admin/sukan',    icon: Trophy },
  { label: 'Urus Kontinjen',       path: '/supsas/admin/kontinjen',icon: Users },
  { label: 'Input Keputusan',      path: '/supsas/admin/keputusan',icon: Layers },
  { label: 'Jadual',               path: '/supsas/admin/jadual',   icon: Calendar },
  { label: 'Tetapan Edisi',        path: '/supsas/admin/tetapan',  icon: Settings },
];

import { FloatingAiChat } from '@/components/ai/FloatingAiChat';

export function SupsasAdminLayout() {
  const { profile, isSuperAdmin, isLoading } = useAuth();
  const { enableRealtime, disableRealtime } = useSupsas();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = isSuperAdmin || profile?.role === 'JPP';

  // Aktifkan Realtime semasa Admin berada dalam panel admin
  // Supaya keputusan perlawanan yang baru dimasukkan terus kelihatan tanpa refresh
  useEffect(() => {
    if (!isLoading && isAdmin) {
      enableRealtime();
    }
    return () => { disableRealtime(); };
  }, [isLoading, isAdmin, enableRealtime, disableRealtime]);

  if (!isLoading && !isAdmin) {
    return <Navigate to="/supsas" replace />;
  }

  return (
    <div className="min-h-screen bg-[#050A14] text-white flex">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-[140] w-64 bg-[#0A1628]/95 backdrop-blur-xl border-r border-white/5 flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'md:translate-x-0 md:static md:flex'
      )}>
        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-black text-white leading-none">SUPSAS Admin</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-400/60 mt-0.5">Panel Kawalan</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto md:hidden w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {ADMIN_NAV.map((item) => {
            const active = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path) && location.pathname !== '/supsas/admin';
            const isExactAdmin = item.exact && location.pathname === '/supsas/admin';
            const isActive = active || isExactAdmin;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-all text-left',
                  isActive
                    ? 'bg-amber-500/15 border border-amber-500/25 text-amber-400'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* Back to SUPSAS */}
        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={() => navigate('/supsas')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black text-white/30 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke SUPSAS
          </button>
        </div>
      </aside>

      {/* Overlay (mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-[130] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar (mobile) */}
        <div className="md:hidden flex items-center gap-3 px-4 py-4 border-b border-white/5 bg-[#050A14]/80 backdrop-blur-xl sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-black text-sm text-white">SUPSAS Admin</span>
        </div>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <FloatingAiChat />
    </div>
  );
}
