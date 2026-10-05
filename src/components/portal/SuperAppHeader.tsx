import React, { useMemo } from 'react';
import { MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerCommandPalette } from '@/lib/commandPalette';
import { formatGreeting, getRoleBadgeTitle, getHeaderGradientClass } from '@/lib/superAppHelpers';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { NotificationBell } from '@/components/ui/NotificationBell';
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
  className,
}: SuperAppHeaderProps) {
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
        {/* Top Action Bar: Brand Logo & Location (Left) + ThemeToggle, NotificationBell & Profile (Right) */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Side: Prominent JPP Logo Pill + Campus Location Pill */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Prominent JPP Logo Pill */}
            <div className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-black/25 backdrop-blur-md border border-white/15 shadow-sm">
              <img
                src="/jpp-logo.png"
                alt="JPP POLISAS"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow"
              />
              <div className="flex flex-col">
                <span className="font-black text-xs sm:text-sm tracking-tight text-white leading-none">
                  JPP POLISAS
                </span>
                <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-amber-300/80 font-bold mt-0.5">
                  Portal Rasmi
                </span>
              </div>
            </div>

            {/* Campus Location Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 border border-white/10 text-white/90 text-xs font-semibold shrink-0">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>POLISAS, Semambu</span>
            </div>
          </div>

          {/* Right Side: ThemeToggle + NotificationBell + Profile Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* ThemeToggle with glass styling */}
            <div className="[&_button]:bg-black/25 [&_button]:hover:bg-white/20 [&_button]:border [&_button]:border-white/15 [&_button]:text-white [&_button]:h-9 sm:[&_button]:h-10 [&_button]:w-9 sm:[&_button]:w-10 [&_button]:rounded-2xl transition-all">
              <ThemeToggle />
            </div>

            {/* NotificationBell with dark variant & unified glass button */}
            <div className="[&_button]:bg-black/25 [&_button]:hover:bg-white/20 [&_button]:border [&_button]:border-white/15 [&_button]:text-white [&_button]:hover:text-white [&_button]:h-9 sm:[&_button]:h-10 [&_button]:w-9 sm:[&_button]:w-10 [&_button]:rounded-2xl transition-all">
              <NotificationBell variant="dark" />
            </div>

            {/* User Profile Avatar / Trigger */}
            <button
              type="button"
              onClick={onOpenSidebar}
              aria-label="Buka profil dan menu sisi"
              className="tour-navbar-profile relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden border-2 border-white/30 hover:border-white/50 active:scale-95 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer bg-white/10 shrink-0"
            >
              <Avatar className="w-full h-full rounded-none">
                {profile?.avatar_url && (
                  <AvatarImage
                    src={profile.avatar_url}
                    className="object-cover"
                    alt={profile?.full_name || displayName || 'Profil'}
                  />
                )}
                <AvatarFallback className="bg-white/20 text-white text-xs font-black">
                  {(profile?.full_name || displayName || 'P')?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>

        {/* Hero Greeting Section */}
        <div className="flex flex-col gap-1.5 sm:gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-white/85">
              {greeting.title}
            </span>
            {roleTitle && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-white/15 backdrop-blur-md border border-white/20 text-amber-200 shadow-sm">
                {roleTitle}
              </span>
            )}
            {karnivalActive ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-pink-500/30 text-pink-200 border border-pink-400/30">
                🎪 Karnival Siswa
              </span>
            ) : supsasActive ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/30">
                🏆 SUPSAS Langsung
              </span>
            ) : null}
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
              'w-full group flex items-center justify-between gap-3 px-4 sm:px-5',
              'h-12 sm:h-13 sm:h-[52px]',
              'rounded-2xl bg-white dark:bg-slate-900 backdrop-blur-xl',
              'text-slate-700 dark:text-slate-200 shadow-xl shadow-black/20',
              'border border-white/30 dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-emerald-400/50',
              'hover:shadow-2xl transition-all duration-300 text-left cursor-pointer active:scale-[0.99]',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500/60'
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
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
