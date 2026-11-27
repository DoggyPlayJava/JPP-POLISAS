import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { cn, hexToRgba } from '@/lib/utils';
import { KEBAJIKAN_THEME_COLOR } from '@/types';

const TEAL = KEBAJIKAN_THEME_COLOR; // #2DD4BF

export function KebajikanSidebar() {
  const { t } = useTranslation(['kebajikan', 'nav', 'common']);
  const { user, profile, signOut, isSuperAdmin, isKebajikanExco, isUnitKebajikanStaff, isKediamanExco, isYdp } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate  = useNavigate();
  const unreadCount = useNotificationStore(state => state.unreadCount);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || '?';
  const initials    = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const posLabel    = isKebajikanExco ? t('kebajikan:role_exco_kebajikan', 'Exco Kebajikan') : isKediamanExco ? t('kebajikan:role_exco_kk', 'Exco KK (Kafeteria)') : isUnitKebajikanStaff ? t('kebajikan:role_unit_kebajikan', 'Unit Kebajikan') : isSuperAdmin ? 'Super Admin' : t('kebajikan:role_ahli_jpp', 'Ahli JPP');
  const isStaffOrAbove = isKebajikanExco || isKediamanExco || isUnitKebajikanStaff || isSuperAdmin || isYdp;
  const isJpp = isSuperAdmin || profile?.role === 'JPP';

  const bgGradient = isDark
    ? 'linear-gradient(180deg, #0E1116 0%, #090B0E 100%)'
    : 'linear-gradient(180deg, #0B2420 0%, #061714 100%)';

  const navItem = (href: string, icon: React.ElementType, label: string, end = false, badge?: number) => (
    <NavLink
      key={href}
      to={href}
      end={end}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 relative group overflow-hidden',
        isActive
          ? 'text-white font-bold shadow-lg bg-teal-500/20 border border-teal-400/25'
          : isDark
            ? 'text-[#94A0B2] hover:text-white hover:bg-white/[0.06] border border-transparent'
            : 'text-[#99CBC2] hover:text-white hover:bg-white/[0.06] border border-transparent'
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />
          )}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300"
            style={{
              background: isActive
                ? hexToRgba(TEAL, 0.25)
                : 'rgba(255,255,255,0.04)'
            }}
          >
            {React.createElement(icon, {
              className: 'w-4 h-4',
              style: { color: isActive ? '#5EEAD4' : (isDark ? '#94A0B2' : '#99CBC2') }
            })}
          </div>
          <span className={cn(
            "text-xs font-bold tracking-wide flex-1 transition-colors duration-300",
            isActive
              ? "text-white"
              : isDark
                ? "text-[#94A0B2] group-hover:text-white"
                : "text-[#99CBC2] group-hover:text-white"
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
                background: '#2DD4BF',
                boxShadow: `0 0 8px 2px ${hexToRgba(TEAL, 0.5)}`
              }}
            />
          ) : null}
        </>
      )}
    </NavLink>
  );

  return (
    <aside
      className="tour-kebajikan-sidebar w-[280px] h-[100dvh] flex flex-col select-none overflow-hidden flex-shrink-0 z-[140] relative border-r border-teal-400/15 dark:border-[#252B35] transition-colors duration-300"
      style={{ background: bgGradient }}
    >
      {/* Decorative Glow */}

      {/* Header */}
      <div className="flex-shrink-0 flex flex-col relative z-10 border-b border-white/10 bg-black/15">
        <NavLink
          to="/portal"
          className="flex items-center gap-2 px-6 pt-5 pb-3 transition-colors group text-[#99CBC2] hover:text-teal-300"
        >
          <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">{t('nav:jpp_portal', 'Portal JPP')}</span>
          <LayoutGrid className="w-3.5 h-3.5 ml-1" />
        </NavLink>
        <div className="flex items-center gap-4 px-6 pb-6 pt-1">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-teal-500/15 border border-teal-400/30">
            <HeartHandshake className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <p className="font-black text-lg tracking-tight leading-none mb-1 text-white">
              {t('module_title')}
            </p>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-teal-300/80">
              {t('module_subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto scrollbar-hide relative z-10">
        {/* Hab Kebajikan Landing */}
        {navItem('/kebajikan', HeartHandshake, t('kebajikan:nav_hub', 'Hab Kebajikan'), true)}

        {/* Exco / Staff Section */}
        {isStaffOrAbove && (
          <>
            <p className="px-4 mb-3 mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-teal-300/60">
              {t('kebajikan:nav_management', 'Pengurusan')}
            </p>
            {navItem('/kebajikan/dashboard', LayoutDashboard, t('kebajikan:nav_dashboard_aduan', 'Dashboard Aduan'), false, unreadCount)}
            {navItem('/kebajikan/tiket', Inbox, isKediamanExco && !isSuperAdmin && !isYdp ? t('kebajikan:nav_cafeteria_complaints', 'Aduan Kafeteria') : t('kebajikan:nav_tickets_list', 'Senarai Tiket'))}
            {/* Laporan — KK Exco nampak juga tapi laporan akan difilter oleh peranan */}
            {navItem('/kebajikan/laporan', FileBarChart2, t('kebajikan:nav_reports', 'Laporan'))}
            {/* Unit Staff & Tetapan: hanya Exco Kebajikan + Super Admin */}
            {(isKebajikanExco || isSuperAdmin) && navItem('/kebajikan/staff', Users, t('kebajikan:nav_staff', 'Unit Kebajikan Staff'))}
            {(isKebajikanExco || isSuperAdmin) && navItem('/kebajikan/tetapan', Settings, t('nav:settings', 'Tetapan'))}
          </>
        )}

        {/* Public section — semua user */}
        <div className="pt-5 pb-2">
          <p className="px-4 text-[10px] font-black uppercase tracking-[0.25em] text-teal-300/60">
            {t('kebajikan:nav_student_complaints', 'Aduan & Bantuan Pelajar')}
          </p>
        </div>
        {navItem('/kebajikan/buat-aduan', Plus, t('kebajikan:nav_new_complaint', 'Buat Aduan Baru'))}
        {navItem('/kebajikan/aduan-saya', ClipboardList, t('kebajikan:nav_my_complaints', 'Aduan Saya'))}
        {navItem('/kebajikan/foodbank', ShoppingBag, t('kebajikan:nav_foodbank', 'Food Bank JPP'))}

        {/* Statistik awam */}
        <div className="pt-4 pb-1.5">
          <p className="px-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/30">
            {t('kebajikan:nav_others', 'Lain-Lain')}
          </p>
        </div>
        {navItem('/kebajikan/statistik', Bell, t('kebajikan:nav_public_stats', 'Statistik Awam'))}
      </nav>

      {/* ── Global JPP Dashboard Link ── */}
      {isJpp && (
        <div className="px-4 py-2 mt-auto pb-4 relative z-10 flex-shrink-0">
          <button
            onClick={() => { navigate('/jpp'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/25"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest leading-tight text-amber-300 text-left">
              {t('nav:global_jpp_dashboard', 'Global JPP Dashboard')}
            </span>
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex-shrink-0 p-4 space-y-3 relative z-10 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8 rounded-xl ring-2 ring-white/15 shadow-md">
            <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
            <AvatarFallback className="font-black text-xs" style={{ background: TEAL, color: '#061714' }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black truncate leading-tight text-white">
              {displayName}
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest truncate text-teal-300/80">
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
            className="flex-1 justify-start gap-3 h-9 px-3 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all text-white/50 hover:text-rose-400 hover:bg-rose-500/10"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            {t('nav:logout', 'Log Keluar')}
          </Button>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
