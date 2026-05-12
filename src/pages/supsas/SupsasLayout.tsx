import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, BarChart3, Calendar, Users, Settings, Menu, X, ArrowLeft, Shield, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupsas } from '@/contexts/SupsasContext';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';

const NAV_ITEMS = [
  { label: 'Laman Utama',  path: '/supsas',            icon: Trophy },
  { label: 'Kedudukan',    path: '/supsas/scoreboard',  icon: BarChart3 },
  { label: 'Jadual',       path: '/supsas/jadual',      icon: Calendar },
  { label: 'Sukan',        path: '/supsas/sukan',       icon: Users },
  { label: 'Sejarah',      path: '/supsas/sejarah',     icon: Clock },
];

export function SupsasLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { edition, isLive, isLoading, lastUpdated, refetch } = useSupsas();
  const { profile, isSuperAdmin } = useAuth();
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = isSuperAdmin || profile?.role === 'JPP';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Format masa relative (contoh: "2 minit lalu")
  const getRelativeTime = (date: Date | null): string => {
    if (!date) return 'Belum pernah';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Baru sahaja';
    if (diffMins === 1) return '1 minit lalu';
    return `${diffMins} minit lalu`;
  };

  const [relativeTime, setRelativeTime] = useState(() => getRelativeTime(lastUpdated));

  // Kemas kini label masa setiap 30 saat
  useEffect(() => {
    setRelativeTime(getRelativeTime(lastUpdated));
    const interval = setInterval(() => setRelativeTime(getRelativeTime(lastUpdated)), 30000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  useEffect(() => {
    // Immediately darken <body> to prevent white-flash on mobile
    document.body.classList.add('supsas-route');
    return () => document.body.classList.remove('supsas-route');
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#050A14] text-white font-sans overflow-x-hidden">
      {/* ── Starfield background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050A14] via-[#0A1628] to-[#050A14]" />
        {/* Animated orbs */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-20%] left-[10%] w-[60vw] h-[60vw] max-w-4xl rounded-full bg-amber-500/20 blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[-20%] right-[5%] w-[50vw] h-[50vw] max-w-3xl rounded-full bg-blue-500/15 blur-[100px]"
        />
        {/* Grid */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.025] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      </div>

      {/* ── Navbar ── */}
      <nav className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-500 px-4 md:px-8 py-4 flex items-center justify-between',
        scrolled && 'bg-[#050A14]/90 backdrop-blur-xl border-b border-white/5 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/supsas')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-tight text-white leading-none">SUPSAS</span>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-400 leading-none mt-0.5">
              {edition?.name ?? 'Sukan Polisas'}
            </span>
          </div>
          {/* Live badge */}
          {isLive && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-[8px] font-black uppercase tracking-widest text-red-400">Live</span>
            </div>
          )}
          {/* Bar Terakhir Dikemas Kini — untuk semua pengguna (bukan admin realtime) */}
          {!isLoading && (
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all disabled:opacity-50 bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Memuatkan...' : relativeTime}
              </button>
            </div>
          )}
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path || (item.path !== '/supsas' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300',
                  active
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => navigate('/supsas/admin')}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 text-[11px] font-black uppercase tracking-widest transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              Admin
            </button>
          )}
          {/* Portal Ketua — only for logged-in users */}
          {profile && !isAdmin && (
            <button
              onClick={() => navigate('/supsas/ketua')}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/20 text-[11px] font-black uppercase tracking-widest transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              Portal Ketua
            </button>
          )}
          {profile && isAdmin && (
            <button
              onClick={() => navigate('/supsas/ketua')}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/30 hover:text-white/60 hover:bg-white/10 text-[11px] font-black uppercase tracking-widest transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              Ketua
            </button>
          )}
          <button
            onClick={() => navigate('/portal')}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white text-[11px] font-black uppercase tracking-widest transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Portal
          </button>
          {/* Mobile hamburger */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <AnimatePresence mode="wait">
              {mobileOpen
                ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="w-4 h-4" /></motion.div>
                : <motion.div key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu className="w-4 h-4" /></motion.div>
              }
            </AnimatePresence>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-20 z-40 rounded-[2rem] bg-[#0A1628]/95 backdrop-blur-3xl border border-white/10 p-5 flex flex-col gap-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)] md:hidden"
          >
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.path || (item.path !== '/supsas' && location.pathname.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMobileOpen(false); }}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all text-left',
                    active
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </button>
              );
            })}
            {isAdmin && (
              <button
                onClick={() => { navigate('/supsas/admin'); setMobileOpen(false); }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest text-amber-400/80 hover:text-amber-400 hover:bg-amber-500/10 transition-all border border-amber-500/20 mt-1"
              >
                <Settings className="w-4 h-4 flex-shrink-0" />
                Panel Admin
              </button>
            )}
            {profile && (
              <button
                onClick={() => { navigate('/supsas/ketua'); setMobileOpen(false); }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 transition-all border border-amber-500/20 mt-1"
              >
                <Shield className="w-4 h-4 flex-shrink-0" />
                Portal Ketua Kontinjen
              </button>
            )}
            {/* Butang Refresh Data — untuk pengguna mobile yang tiada auto-live */}
            {!isLoading && (
              <button
                onClick={() => { handleRefresh(); setMobileOpen(false); }}
                disabled={isRefreshing}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all border-t border-white/5 mt-1 disabled:opacity-50 text-white/40 hover:text-white hover:bg-white/5"
              >
                <RefreshCw className={`w-4 h-4 flex-shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Memuatkan...' : `Muat Semula Data`}</span>
                {lastUpdated && !isRefreshing && (
                  <span className="ml-auto text-[9px] font-bold text-white/20">{relativeTime}</span>
                )}
              </button>
            )}
            <button
              onClick={() => { navigate('/portal'); setMobileOpen(false); }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest text-white/30 hover:text-white hover:bg-white/5 transition-all border-t border-white/5 mt-1"
            >
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              Kembali ke Portal
            </button>
          </motion.div>

        )}
      </AnimatePresence>

      {/* ── Page Content ── */}
      <main className="relative z-10 pt-20">
        {isLoading ? (
          <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
            <div className="relative mb-8">
              {/* Outer spinning ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="w-24 h-24 rounded-full border-[3px] border-amber-500/10 border-t-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
              />
              {/* Inner pulsing trophy */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Trophy className="w-8 h-8 text-amber-400" />
                </motion.div>
              </div>
            </div>
            
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="text-[11px] font-black uppercase tracking-[0.4em] text-amber-500"
            >
              Memuatkan Data SUPSAS...
            </motion.p>
          </div>
        ) : (
          <div className="pb-28">
            <Outlet />
          </div>
        )}
      </main>
      <BottomNav onOpenSidebar={() => setMobileOpen(true)} />
      <FloatingAiChat />
    </div>
  );
}
