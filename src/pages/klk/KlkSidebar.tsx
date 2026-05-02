// ============================================================
// KlkSidebar — Sidebar untuk modul Kediaman Luar Kampus
// Pattern sama seperti KebajikanSidebar.tsx
// ============================================================
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MapPin, Settings, LayoutDashboard,
  ChevronLeft, LayoutGrid, Crown,
  LogOut, ShieldCheck, BarChart3,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, hexToRgba } from '@/lib/utils';

const KLS_COLOR = '#60A5FA';

export function KlkSidebar() {
  const { user, profile, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const unreadCount = useNotificationStore(state => state.unreadCount);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || '?';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const posLabel = profile?.jpp_unit === 'KLS' ? 'Exco KLK' : isSuperAdmin ? 'Super Admin' : 'JPP';
  const isJpp = isSuperAdmin || profile?.role === 'JPP' || profile?.role === 'SUPER_ADMIN_JPP';

  // Helper: nav item (ikut pattern KebajikanSidebar)
  const navItem = (
    href: string,
    icon: React.ElementType,
    label: string,
    end = false,
    badge?: number,
  ) => (
    <NavLink
      key={href}
      to={href}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 relative group overflow-hidden',
          isActive
            ? 'text-white shadow-lg bg-white/[0.04] border border-white/5'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.02] border border-transparent',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div
              className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent to-transparent"
              style={{ backgroundImage: `linear-gradient(to right, transparent, ${hexToRgba(KLS_COLOR, 0.5)}, transparent)` }}
            />
          )}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300"
            style={{ background: isActive ? hexToRgba(KLS_COLOR, 0.15) : 'rgba(255,255,255,0.02)' }}
          >
            {React.createElement(icon, {
              className: 'w-4 h-4',
              style: { color: isActive ? KLS_COLOR : undefined },
            })}
          </div>
          <span className={cn('text-xs font-bold tracking-wide flex-1 transition-colors duration-300', isActive && 'text-slate-50')}>
            {label}
          </span>
          {badge && badge > 0 ? (
            <span className="text-[9px] font-black bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {badge > 99 ? '99+' : badge}
            </span>
          ) : isActive ? (
            <div
              className="w-1 h-4 rounded-full"
              style={{ background: KLS_COLOR, boxShadow: `0 0 8px 2px ${hexToRgba(KLS_COLOR, 0.5)}` }}
            />
          ) : null}
        </>
      )}
    </NavLink>
  );

  return (
    <aside
      className="w-[280px] h-screen flex flex-col select-none overflow-hidden flex-shrink-0 backdrop-blur-3xl z-50 relative border-r border-white/5"
      style={{ background: 'linear-gradient(180deg, rgba(2,6,23,0.7) 0%, rgba(15,23,42,0.9) 100%)' }}
    >
      {/* Decorative glow */}
      <div
        className="absolute top-0 right-0 w-32 h-32 blur-[80px] pointer-events-none"
        style={{ background: hexToRgba(KLS_COLOR, 0.08) }}
      />

      {/* Header */}
      <div className="flex-shrink-0 flex flex-col relative z-10 border-b border-white/5 bg-black/10">
        {/* Back to JPP Unit page */}
        <NavLink
          to="/jpp/unit/kls"
          className="flex items-center gap-2 px-6 pt-5 pb-3 text-slate-500 hover:text-blue-400 transition-colors group"
        >
          <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Portal JPP</span>
          <LayoutGrid className="w-3.5 h-3.5 ml-1" />
        </NavLink>

        {/* Branding */}
        <div className="flex items-center gap-4 px-6 pb-6 pt-1">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border"
            style={{
              background: hexToRgba(KLS_COLOR, 0.1),
              borderColor: hexToRgba(KLS_COLOR, 0.3),
            }}
          >
            <MapPin className="w-6 h-6" style={{ color: KLS_COLOR }} />
          </div>
          <div>
            <p className="font-black text-lg text-slate-50 tracking-tight leading-none mb-1">E-Kediaman</p>
            <p className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: hexToRgba(KLS_COLOR, 0.7) }}>
              Kediaman Luar Kampus
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto scrollbar-hide relative z-10">
        <p className="px-4 mb-3 mt-2 text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: hexToRgba(KLS_COLOR, 0.5) }}>
          Pengurusan
        </p>
        {navItem('/klk', LayoutDashboard, 'Dashboard', true, unreadCount)}
        {navItem('/klk/statistik', BarChart3, 'Statistik Awam')}
        {navItem('/klk/tetapan', Settings, 'Tetapan & Import')}
      </nav>

      {/* ── Global JPP Dashboard — sama seperti Kebajikan ── */}
      {isJpp && (
        <div className="px-4 py-2 mt-auto pb-2 relative z-10 flex-shrink-0">
          <button
            onClick={() => navigate('/jpp')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest leading-tight text-amber-400 text-left">
              Global JPP<br />Dashboard
            </span>
          </button>
        </div>
      )}

      {/* Footer — Avatar + Log Keluar */}
      <div
        className="flex-shrink-0 p-4 space-y-3 relative z-10"
        style={{ borderTop: `1px solid ${hexToRgba(KLS_COLOR, 0.1)}` }}
      >
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8 rounded-xl ring-2 ring-white/10 shadow-md">
            <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
            <AvatarFallback
              className="font-black text-xs"
              style={{ background: KLS_COLOR, color: '#0f172a' }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black truncate leading-tight text-slate-50">{displayName}</p>
            <p
              className="text-[10px] font-black uppercase tracking-widest truncate"
              style={{ color: hexToRgba(KLS_COLOR, 0.7) }}
            >
              {posLabel}
            </p>
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
