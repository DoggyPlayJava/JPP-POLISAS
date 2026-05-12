import React, { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useKarnival } from '@/contexts/KarnivalContext';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, Trophy, Home, BarChart3, Menu, X, Shield, ArrowLeft } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';

export function KarnivalLayout() {
  const { edition, isActive, lastUpdated, refetch, isLoading } = useKarnival();
  const { isKppExco, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = isKppExco || isSuperAdmin;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
  };

  const navLinks = [
    { to: '/karnival', label: 'Utama', icon: Home },
    { to: '/karnival/scoreboard', label: 'Papan Mata', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d1a]">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.18] bg-[#0d0d1a]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          {/* ← Back to Portal */}
          <button
            onClick={() => navigate('/portal')}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all"
            title="Balik ke Portal"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button onClick={() => navigate('/karnival')} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-105 transition-transform">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div className="leading-none">
              <p className="text-xs font-black text-white tracking-tight">
                {edition?.name ?? 'Karnival JPP'}
              </p>
              {edition?.tagline && (
                <p className="text-[9px] text-white/40 font-medium mt-0.5">{edition.tagline}</p>
              )}
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === to
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Status badge */}
            {isActive && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600/20 border border-violet-500/30">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-[10px] font-black text-violet-300 uppercase tracking-widest">Live</span>
              </div>
            )}

            {/* Last updated + refresh */}
            <div className="flex items-center gap-1.5 text-[10px] text-white/60 font-medium">
              {lastUpdated && (
                <span className="hidden sm:inline">
                  {lastUpdated.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={handleRefresh}
                disabled={isLoading || refreshing}
                className="p-1.5 rounded-lg text-white/60 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                title="Muat semula"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Admin link */}
            {isAdmin && (
              <Link
                to="/karnival/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-violet-300 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/20 transition-all"
              >
                <Shield className="w-3 h-3" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/[0.18] bg-[#0d0d1a]"
            >
              <div className="px-4 py-3 flex flex-col gap-1">
                <button
                  onClick={() => { navigate('/portal'); setMobileOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Balik ke Portal
                </button>
                {navLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      location.pathname === to
                        ? 'bg-violet-600 text-white'
                        : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    to="/karnival/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-violet-300 bg-violet-600/15 border border-violet-500/20"
                  >
                    <Shield className="w-4 h-4" />
                    Panel Admin KPP
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Page content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="pb-28"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      <BottomNav onOpenSidebar={() => setMobileOpen(true)} />
      <FloatingAiChat />
    </div>
  );
}
