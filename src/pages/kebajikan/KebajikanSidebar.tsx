import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HeartHandshake,
  LayoutDashboard,
  Inbox,
  FileBarChart2,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  LayoutGrid,
  Plus,
  ClipboardList,
  ShieldCheck,
  Bell,
  Crown,
  ShoppingBag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn, hexToRgba } from '@/lib/utils';
import { KEBAJIKAN_THEME_COLOR } from '@/types';

const TEAL = KEBAJIKAN_THEME_COLOR; // #2DD4BF

export function KebajikanSidebar() {
  const { user, profile, signOut, isSuperAdmin, isKebajikanExco, isUnitKebajikanStaff, isKediamanExco, isYdp } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate  = useNavigate();
  const unreadCount = useNotificationStore(state => state.unreadCount);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || '?';
  const initials    = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const posLabel    = isKebajikanExco ? 'Exco Kebajikan' : isKediamanExco ? 'Exco KK (Kafeteria)' : isUnitKebajikanStaff ? 'Unit Kebajikan' : isSuperAdmin ? 'Super Admin' : 'Ahli JPP';
  const isStaffOrAbove = isKebajikanExco || isKediamanExco || isUnitKebajikanStaff || isSuperAdmin || isYdp;
  const isJpp = isSuperAdmin || profile?.role === 'JPP';

  const bgGradient = isDark
    ? 'linear-gradient(180deg, rgba(2, 6, 23, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)'
    : 'linear-gradient(180deg, #f0fdfa 0%, #e6fffa 100%)';

  const navItem = (href: string, icon: React.ElementType, label: string, end = false, badge?: number) => (
    <NavLink
      key={href}
      to={href}
      end={end}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 relative group overflow-hidden',
        isDark
          ? isActive
            ? 'text-white shadow-lg bg-white/[0.04] border border-white/5'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
          : isActive
            ? 'text-teal-950 font-bold shadow-sm bg-teal-500/20 border border-teal-300/60'
            : 'text-[#0f766e] hover:text-teal-950 hover:bg-teal-500/15 border border-transparent'
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className={cn(
              "absolute inset-x-0 bottom-0 h-px",
              isDark ? "bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" : "bg-gradient-to-r from-transparent via-teal-600/40 to-transparent"
            )} />
          )}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300"
            style={{
              background: isActive 
                ? (isDark ? hexToRgba(TEAL, 0.15) : 'rgba(13, 148, 136, 0.20)') 
                : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(13, 148, 136, 0.08)')
            }}
          >
            {React.createElement(icon, {
              className: 'w-4 h-4',
              style: { color: isActive ? (isDark ? TEAL : '#134e4a') : (isDark ? undefined : '#0f766e') }
            })}
          </div>
          <span className={cn(
            "text-xs font-bold tracking-wide flex-1 transition-colors duration-300",
            isActive
              ? (isDark ? "text-slate-50" : "text-teal-950")
              : (isDark ? "text-slate-400 group-hover:text-slate-200" : "text-[#0f766e] group-hover:text-teal-950")
          )}>
            {label}
          </span>
          {badge && badge > 0 ? (
            <span className="text-[9px] font-black bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {badge > 99 ? '99+' : badge}
            </span>
          ) : isActive ? (
            <div
              className="w-1 h-4 rounded-full"
              style={{
                background: isDark ? TEAL : '#0d9488',
                boxShadow: isDark ? `0 0 8px 2px ${hexToRgba(TEAL, 0.5)}` : '0 0 6px 1px rgba(13, 148, 136, 0.4)'
              }}
            />
          ) : null}
        </>
      )}
    </NavLink>
  );

  return (
    <aside
      className={cn(
        "tour-kebajikan-sidebar w-[280px] h-screen flex flex-col select-none overflow-hidden flex-shrink-0 backdrop-blur-3xl z-[140] relative border-r transition-colors duration-300",
        isDark ? "border-white/5" : "border-teal-200/60"
      )}
      style={{ background: bgGradient }}
    >
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className={cn(
        "flex-shrink-0 flex flex-col relative z-10 border-b",
        isDark ? "border-white/5 bg-black/10" : "border-teal-200/60 bg-teal-500/5"
      )}>
        <NavLink
          to="/portal"
          className={cn(
            "flex items-center gap-2 px-6 pt-5 pb-3 transition-colors group",
            isDark ? "text-slate-500 hover:text-teal-400" : "text-teal-700/70 hover:text-teal-900"
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Portal JPP</span>
          <LayoutGrid className="w-3.5 h-3.5 ml-1" />
        </NavLink>
        <div className="flex items-center gap-4 px-6 pb-6 pt-1">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
            isDark ? "bg-teal-500/10 border border-teal-500/30" : "bg-teal-500/15 border border-teal-500/40"
          )}>
            <HeartHandshake className={cn("w-6 h-6", isDark ? "text-teal-400" : "text-[#0f766e]")} />
          </div>
          <div>
            <p className={cn(
              "font-black text-lg tracking-tight leading-none mb-1",
              isDark ? "text-slate-50" : "text-[#134e4a]"
            )}>
              E-Kebajikan
            </p>
            <p className={cn(
              "text-[9px] font-black uppercase tracking-[0.25em]",
              isDark ? "text-teal-500/70" : "text-[#0f766e]"
            )}>
              Sistem Aduan Pelajar
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto scrollbar-hide relative z-10">
        {/* Hab Kebajikan Landing */}
        {navItem('/kebajikan', HeartHandshake, 'Hab Kebajikan', true)}

        {/* Exco / Staff Section */}
        {isStaffOrAbove && (
          <>
            <p className={cn("px-4 mb-3 mt-4 text-[10px] font-black uppercase tracking-[0.25em]", isDark ? "text-teal-500/50" : "text-teal-800/70")}>
              Pengurusan
            </p>
            {navItem('/kebajikan/dashboard', LayoutDashboard, 'Dashboard Aduan', false, unreadCount)}
            {navItem('/kebajikan/tiket', Inbox, isKediamanExco && !isSuperAdmin && !isYdp ? 'Aduan Kafeteria' : 'Senarai Tiket')}
            {/* Laporan — KK Exco nampak juga tapi laporan akan difilter oleh peranan */}
            {navItem('/kebajikan/laporan', FileBarChart2, 'Laporan')}
            {/* Unit Staff & Tetapan: hanya Exco Kebajikan + Super Admin */}
            {(isKebajikanExco || isSuperAdmin) && navItem('/kebajikan/staff', Users, 'Unit Kebajikan Staff')}
            {(isKebajikanExco || isSuperAdmin) && navItem('/kebajikan/tetapan', Settings, 'Tetapan')}
          </>
        )}

        {/* Public section — semua user */}
        <div className="pt-5 pb-2">
          <p className={cn("px-4 text-[10px] font-black uppercase tracking-[0.25em]", isDark ? "text-teal-500/50" : "text-teal-800/70")}>
            Aduan &amp; Bantuan Pelajar
          </p>
        </div>
        {navItem('/kebajikan/buat-aduan', Plus, 'Buat Aduan Baru')}
        {navItem('/kebajikan/aduan-saya', ClipboardList, 'Aduan Saya')}
        {navItem('/kebajikan/foodbank', ShoppingBag, 'Food Bank JPP')}

        {/* Statistik awam */}
        <div className="pt-4 pb-1.5">
          <p className={cn("px-3 text-[9px] font-black uppercase tracking-[0.3em]", isDark ? "text-white/25" : "text-teal-800/50")}>
            Lain-Lain
          </p>
        </div>
        {navItem('/kebajikan/statistik', Bell, 'Statistik Awam')}
      </nav>

      {/* ── Global JPP Dashboard Link ── */}
      {isJpp && (
        <div className="px-4 py-2 mt-auto pb-4 relative z-10 flex-shrink-0">
          <button
            onClick={() => { navigate('/jpp'); }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
              isDark
                ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20'
                : 'bg-amber-500/15 text-amber-900 hover:bg-amber-500/25 border border-amber-500/30'
            )}
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest leading-tight text-amber-500 dark:text-amber-400 text-left">
              Global JPP<br />Dashboard
            </span>
          </button>
        </div>
      )}

      {/* Footer */}
      <div
        className={cn(
          "flex-shrink-0 p-4 space-y-3 relative z-10 border-t",
          isDark ? "border-white/5" : "border-teal-200/60"
        )}
      >
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8 rounded-xl ring-2 ring-white/10 shadow-md">
            <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
            <AvatarFallback className="font-black text-xs" style={{ background: TEAL, color: '#0f172a' }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs font-black truncate leading-tight", isDark ? "text-slate-50" : "text-teal-950")}>
              {displayName}
            </p>
            <p className={cn("text-[10px] font-black uppercase tracking-widest truncate", isDark ? "text-teal-400/80" : "text-teal-700")}>
              {posLabel}
            </p>
          </div>
          {isSuperAdmin && (
            <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center bg-amber-500/20">
              <ShieldCheck className="w-2.5 h-2.5 text-amber-400" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={signOut}
            className={cn(
              "flex-1 justify-start gap-3 h-9 px-3 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all",
              isDark
                ? "text-white/30 hover:text-rose-400 hover:bg-rose-500/10"
                : "text-teal-900/60 hover:text-rose-600 hover:bg-rose-500/10"
            )}
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            Log Keluar
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
