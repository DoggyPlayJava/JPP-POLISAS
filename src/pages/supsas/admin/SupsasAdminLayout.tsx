import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Trophy, Users, BarChart3, Calendar, Layers,
  Menu, X, ArrowLeft, ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSupsas } from '@/contexts/SupsasContext';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import { useEdgeSwipeDrawer } from '@/hooks/useEdgeSwipeDrawer';

export function SupsasAdminLayout() {
  const { t } = useTranslation(['supsas', 'common']);
  const { profile, isSuperAdmin, isLoading } = useAuth();
  const { enableRealtime, disableRealtime } = useSupsas();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEdgeSwipeDrawer({ isOpen: sidebarOpen, onOpen: () => setSidebarOpen(true) });

  const adminNav = [
    { label: t('supsas:admin_nav_overview', 'Gambaran Keseluruhan'), path: '/supsas/admin',          icon: BarChart3, exact: true },
    { label: t('supsas:admin_nav_sports', 'Urus Sukan'),           path: '/supsas/admin/sukan',    icon: Trophy },
    { label: t('supsas:admin_nav_contingents', 'Urus Kontinjen'),       path: '/supsas/admin/kontinjen',icon: Users },
    { label: t('supsas:admin_nav_results', 'Input Keputusan'),      path: '/supsas/admin/keputusan',icon: Layers },
    { label: t('supsas:admin_nav_schedule', 'Jadual'),               path: '/supsas/admin/jadual',   icon: Calendar },
    { label: t('supsas:admin_nav_settings', 'Tetapan Edisi'),        path: '/supsas/admin/tetapan',  icon: Settings },
  ];

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
    <div className="min-h-[100dvh] bg-[#090B0E] text-[#F1F5F9] flex">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-[140] w-64 bg-[#0E1116] border-r border-[#252B35] flex flex-col transition-transform duration-250 ease-drawer overscroll-contain',
        sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        'md:translate-x-0 md:static md:flex'
      )}>
        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-5 pb-5 pt-[calc(1.25rem+var(--sat,env(safe-area-inset-top,0px)))] md:pt-5 border-b border-[#252B35]">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-[#F1F5F9] leading-none truncate">SUPSAS Admin</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mt-1">{t('supsas:control_panel', 'Panel Kawalan')}</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label={t('common:close', 'Tutup')}
            className="ml-auto md:hidden w-8 h-8 flex items-center justify-center rounded-xl bg-[#1B2028] text-[#94A0B2] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overscroll-contain">
          {adminNav.map((item) => {
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
                  'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-colors text-left',
                  isActive
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black'
                    : 'text-[#94A0B2] hover:text-[#F1F5F9] hover:bg-[#1B2028]'
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
        <div className="px-3 py-4 border-t border-[#252B35]">
          <button
            onClick={() => navigate('/supsas')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-[#94A0B2] hover:text-[#F1F5F9] hover:bg-[#1B2028] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('supsas:back_to_supsas', 'Kembali ke SUPSAS')}
          </button>
        </div>
      </aside>

      {/* Overlay (mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 z-[130] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar (mobile) */}
        <div className="md:hidden flex items-center gap-3 px-4 pb-3.5 pt-[calc(0.875rem+var(--sat,env(safe-area-inset-top,0px)))] border-b border-[#252B35] bg-[#0E1116] sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label={t('common:menu', 'Menu')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#1B2028] border border-[#252B35] text-[#F1F5F9]"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-black text-sm text-[#F1F5F9]">SUPSAS Admin</span>
        </div>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <FloatingAiChat />
    </div>
  );
}
