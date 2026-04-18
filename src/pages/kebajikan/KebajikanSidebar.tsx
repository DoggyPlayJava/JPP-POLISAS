import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HeartHandshake, LayoutDashboard, Inbox, FileBarChart2,
  Users, Settings, LogOut, ChevronLeft, LayoutGrid,
  Plus, ClipboardList, ShieldCheck, Bell, Crown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, hexToRgba } from '@/lib/utils';
import { KEBAJIKAN_THEME_COLOR } from '@/types';

const TEAL = KEBAJIKAN_THEME_COLOR; // #2DD4BF

export function KebajikanSidebar() {
  const { user, profile, signOut, isSuperAdmin, isKebajikanExco, isUnitKebajikanStaff } = useAuth();
  const navigate  = useNavigate();
  const { unreadCount } = useNotifications();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || '?';
  const initials    = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const posLabel    = isKebajikanExco ? 'Exco Kebajikan' : isUnitKebajikanStaff ? 'Unit Kebajikan' : isSuperAdmin ? 'Super Admin' : 'Ahli JPP';
  const isStaffOrAbove = isKebajikanExco || isUnitKebajikanStaff || isSuperAdmin;
  const isJpp = isSuperAdmin || profile?.role === 'JPP';

  const bg = {
    top:    `rgba(2, 6, 23, 0.7)`, // slate-950
    bottom: `rgba(15, 23, 42, 0.9)`, // slate-900
  };


  const navItem = (href: string, icon: React.ElementType, label: string, end = false, badge?: number) => (
    <NavLink
      key={href}
      to={href}
      end={end}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 relative group overflow-hidden',
        isActive ? 'text-white shadow-lg bg-white/[0.04] border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
          )}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300"
            style={{ background: isActive ? hexToRgba(TEAL, 0.15) : 'rgba(255,255,255,0.02)' }}
          >
            {React.createElement(icon, { className: 'w-4 h-4', style: { color: isActive ? TEAL : undefined } })}
          </div>
          <span className={cn("text-xs font-bold tracking-wide flex-1 transition-colors duration-300", isActive && "text-slate-50")}>{label}</span>
          {badge && badge > 0 ? (
            <span className="text-[9px] font-black bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {badge > 99 ? '99+' : badge}
            </span>
          ) : isActive ? (
            <div className="w-1 h-4 rounded-full" style={{ background: TEAL, boxShadow: `0 0 8px 2px ${hexToRgba(TEAL, 0.5)}` }} />
          ) : null}
        </>
      )}
    </NavLink>
  );
  return (
    <aside
      className="w-[280px] h-screen flex flex-col select-none overflow-hidden flex-shrink-0 backdrop-blur-3xl z-50 relative border-r border-white/5"
      style={{ background: `linear-gradient(180deg, ${bg.top} 0%, ${bg.bottom} 100%)` }}
    >
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex-shrink-0 flex flex-col relative z-10 border-b border-white/5 bg-black/10">
        <NavLink to="/portal" className="flex items-center gap-2 px-6 pt-5 pb-3 text-slate-500 hover:text-teal-400 transition-colors group">
          <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Portal JPP</span>
          <LayoutGrid className="w-3.5 h-3.5 ml-1" />
        </NavLink>
        <div className="flex items-center gap-4 px-6 pb-6 pt-1">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-teal-500/10 border border-teal-500/30">
            <HeartHandshake className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <p className="font-black text-lg text-slate-50 tracking-tight leading-none mb-1">E-Kebajikan</p>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-teal-500/70">
              Sistem Aduan Pelajar
            </p>
          </div>
        </div>
      </div>

      {/* User identity removed from here and moved to Footer */}

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto scrollbar-hide relative z-10">
        {/* Exco / Staff Section */}
        {isStaffOrAbove && (
          <>
            <p className="px-4 mb-3 mt-2 text-[10px] font-black uppercase tracking-[0.25em] text-teal-500/50">Pengurusan</p>
            {navItem('/kebajikan', LayoutDashboard, 'Dashboard', true, unreadCount)}
            {navItem('/kebajikan/tiket', Inbox, 'Senarai Tiket')}
            {navItem('/kebajikan/laporan', FileBarChart2, 'Laporan Bulanan')}
            {(isKebajikanExco || isSuperAdmin) && navItem('/kebajikan/staff', Users, 'Unit Kebajikan Staff')}
            {(isKebajikanExco || isSuperAdmin) && navItem('/kebajikan/tetapan', Settings, 'Tetapan')}
          </>
        )}

        {/* Public section — semua user */}
        <div className="pt-6 pb-2">
          <p className="px-4 text-[10px] font-black uppercase tracking-[0.25em] text-teal-500/50">Aduan Pelajar</p>
        </div>
        {navItem('/kebajikan/buat-aduan', Plus, 'Buat Aduan Baru')}
        {navItem('/kebajikan/aduan-saya', ClipboardList, 'Aduan Saya')}

        {/* Statistik awam */}
        <div className="pt-4 pb-1.5">
          <p className="px-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/25">Lain-Lain</p>
        </div>
        {navItem('/kebajikan/statistik', Bell, 'Statistik Awam')}
      </nav>

      {/* ── Global JPP Dashboard Link ── */}
      {isJpp && (
        <div className="px-4 py-2 mt-auto pb-4 relative z-10 flex-shrink-0">
          <button
            onClick={() => { navigate('/jpp'); }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20'
            )}
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest leading-tight text-amber-400 text-left">Global JPP<br />Dashboard</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex-shrink-0 p-4 space-y-3 relative z-10" style={{ borderTop: `1px solid ${hexToRgba(TEAL, 0.1)}` }}>
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8 rounded-xl ring-2 ring-white/10 shadow-md">
            <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
            <AvatarFallback className="font-black text-xs" style={{ background: TEAL, color: '#0f172a' }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black truncate leading-tight text-slate-50">{displayName}</p>
            <p className="text-[10px] font-black uppercase tracking-widest truncate" style={{ color: hexToRgba(TEAL, 0.7) }}>{posLabel}</p>
          </div>
          {isSuperAdmin && (
            <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center bg-amber-500/20">
              <ShieldCheck className="w-2.5 h-2.5 text-amber-400" />
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start gap-3 h-9 px-3 font-black text-[10px] uppercase tracking-widest rounded-xl text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          Log Keluar
        </Button>
      </div>
    </aside>
  );
}
