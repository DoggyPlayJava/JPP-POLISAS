import React, { useEffect } from 'react';
import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useKarnival } from '@/contexts/KarnivalContext';
import { motion } from 'framer-motion';
import {
  Trophy, LayoutDashboard, Calendar, Tag, Store,
  BarChart3, ArrowLeft, Loader2, Shield,
} from 'lucide-react';

import { FloatingAiChat } from '@/components/ai/FloatingAiChat';

export function KarnivalAdminLayout() {
  const { isKppExco, isSuperAdmin, isLoading: authLoading } = useAuth();
  const { enableRealtime, disableRealtime, isActive, votingOpen, edition } = useKarnival();
  const navigate = useNavigate();

  const canAccess = isKppExco || isSuperAdmin;

  // Aktifkan Realtime semasa admin buka panel
  useEffect(() => {
    if (!canAccess) return;
    enableRealtime();
    return () => { disableRealtime(); };
  }, [canAccess, enableRealtime, disableRealtime]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!canAccess) {
    return <Navigate to="/karnival" replace />;
  }

  const navItems = [
    { to: '/karnival/admin',            label: 'Dashboard',  icon: LayoutDashboard, end: true },
    { to: '/karnival/admin/edition',    label: 'Edisi',      icon: Calendar },
    { to: '/karnival/admin/categories', label: 'Kategori',   icon: Tag },
    { to: '/karnival/admin/booths',     label: 'Booth & QR', icon: Store },
    { to: '/karnival/admin/results',    label: 'Keputusan',  icon: BarChart3 },
  ];

  return (
    <div className="dark min-h-screen bg-[#0a0a0f] flex flex-col">

      {/* ── Admin Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/karnival')}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="leading-none">
              <p className="text-xs font-black text-white">Admin Karnival</p>
              <p className="text-[9px] text-white/30 mt-0.5">
                {edition?.name ?? 'Tiada edisi aktif'}
              </p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
              isActive
                ? 'bg-violet-600/20 border-violet-500/30 text-violet-300'
                : 'bg-white/[0.04] border-white/[0.08] text-white/30'
            }`}>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
              {isActive ? 'Aktif' : 'Tidak Aktif'}
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
              votingOpen
                ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-300'
                : 'bg-white/[0.04] border-white/[0.08] text-white/30'
            }`}>
              {votingOpen ? 'Undi Buka' : 'Undi Tutup'}
            </div>

            {isSuperAdmin && !isKppExco && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600/15 border border-rose-500/25 text-[9px] font-black text-rose-400">
                <Shield className="w-2.5 h-2.5" />
                SuperAdmin
              </div>
            )}
          </div>
        </div>

        {/* Nav tabs */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-0.5 overflow-x-auto pb-0">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-violet-500 text-violet-300'
                    : 'border-transparent text-white/55 hover:text-white/80'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </div>
      </header>

      {/* ── Page content ──────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </main>

      <FloatingAiChat />
    </div>
  );
}
