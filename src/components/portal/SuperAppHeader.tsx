import React, { useMemo } from 'react';
import { MapPin, Bell, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerCommandPalette } from '@/lib/commandPalette';
import { formatGreeting, getRoleBadgeTitle, getHeaderGradientClass } from '@/lib/superAppHelpers';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface SuperAppHeaderProps {
  profile?: any;
  displayName?: string;
  karnivalActive?: boolean;
  supsasActive?: boolean;
  onOpenSidebar?: () => void;
  unreadCount?: number;
  className?: string;
}

export function SuperAppHeader({
  profile,
  displayName,
  karnivalActive = false,
  supsasActive = false,
  onOpenSidebar,
  unreadCount,
  className,
}: SuperAppHeaderProps) {
  const storeUnreadCount = useNotificationStore((s) => s.unreadCount);
  const activeUnreadCount = unreadCount !== undefined ? unreadCount : storeUnreadCount;

  const currentHour = useMemo(() => new Date().getHours(), []);
  const nameToDisplay = displayName || profile?.full_name?.split(' ')[0] || 'Pelajar';
  const greeting = useMemo(() => formatGreeting(currentHour, nameToDisplay), [currentHour, nameToDisplay]);

  const roleTitle = useMemo(() => getRoleBadgeTitle(profile?.role), [profile?.role]);
  const gradientClass = useMemo(
    () => getHeaderGradientClass(karnivalActive, supsasActive),
    [karnivalActive, supsasActive]
  );

  return (
    <header
      className={cn(
        'relative overflow-hidden rounded-b-[2.5rem] shadow-2xl transition-all duration-700',
        'bg-gradient-to-br',
        gradientClass,
        className
      )}
    >
      {/* Subtle Ambient Decorative Glows */}
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-black/25 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Main Header Container */}
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pt-6 sm:pt-8 pb-7 sm:pb-8 max-w-7xl mx-auto flex flex-col gap-5 sm:gap-6">
        {/* Top Action Bar: Location Tag + Role Badge + Bell & Avatar */}
        <div className="flex items-center justify-between gap-3">
          {/* Location Tag */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 dark:bg-black/30 backdrop-blur-md border border-white/20 text-xs font-semibold text-white shadow-sm"
            role="status"
            aria-label="Lokasi Kampus: POLISAS, Semambu, Kuantan"
          >
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
            <span className="tracking-wide">POLISAS, Semambu, Kuantan</span>
          </div>

          {/* Right Action Icons: Role Badge, Notification Bell & Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {roleTitle && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-sm">
                {roleTitle}
              </span>
            )}

            {/* Notification Button */}
            <button
              type="button"
              onClick={onOpenSidebar}
              aria-label="Buka notifikasi dan menu sisi"
              className="relative p-2.5 rounded-2xl bg-black/20 hover:bg-white/20 active:scale-95 border border-white/20 text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
            >
              <Bell className="w-5 h-5 text-white" />
              {activeUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-slate-900 shadow-md">
                  {activeUnreadCount > 99 ? '99+' : activeUnreadCount}
                </span>
              )}
            </button>

            {/* User Profile Avatar */}
            {profile && (
              <button
                type="button"
                onClick={onOpenSidebar}
                aria-label="Buka profil dan tetapan"
                className="tour-navbar-profile relative w-10 h-10 rounded-2xl overflow-hidden border-2 border-white/30 active:scale-95 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
              >
                <Avatar className="w-full h-full rounded-none">
                  <AvatarImage src={profile.avatar_url || ''} className="object-cover" alt={profile.full_name || 'Profil'} />
                  <AvatarFallback className="bg-white/20 text-white text-xs font-black">
                    {profile.full_name?.[0] || 'P'}
                  </AvatarFallback>
                </Avatar>
              </button>
            )}
          </div>
        </div>

        {/* Greeting Section */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-white/80">
              {greeting.title}
            </span>
            {karnivalActive ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-pink-500/30 text-pink-200 border border-pink-400/30">
                🎪 Karnival Siswa
              </span>
            ) : supsasActive ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/30">
                🏆 SUPSAS Langsung
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15">
                <Sparkles className="w-3 h-3 text-amber-300" /> Super App
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
            {displayName || nameToDisplay}
          </h1>

          <p className="text-xs sm:text-sm text-white/80 font-medium max-w-2xl leading-relaxed">
            {karnivalActive
              ? 'Selamat datang ke hab aktiviti, jualan & keraian Karnival Siswa POLISAS!'
              : supsasActive
              ? 'Ikuti perlawanan, jadual sukan & sokong atlet jabatan anda dalam SUPSAS!'
              : 'Pusat sehenti digital untuk semua aktiviti, servis, acara dan kebajikan kampus.'}
          </p>
        </div>

        {/* Floating Search Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => triggerCommandPalette(true)}
            aria-label="Cari makanan, runner, servis, acara, merit..."
            className={cn(
              'w-full group flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4',
              'rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl',
              'text-slate-700 dark:text-slate-200 shadow-xl shadow-black/20',
              'border border-white/30 dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-emerald-400/50',
              'hover:shadow-2xl transition-all duration-300 text-left cursor-pointer active:scale-[0.99]',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500/60'
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Search className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  Cari makanan, runner, servis, acara, merit...
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5">
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner">
                <span className="text-[10px]">Ctrl</span>+<span>K</span>
              </kbd>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}

export default SuperAppHeader;
