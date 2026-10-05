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
  unreadCount: _unreadCount,
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
        'relative overflow-hidden rounded-b-[2.5rem] border-b border-emerald-500/20 shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition-all duration-700',
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
        {/* Top Action Bar: Brand Logo & Location (Left) + Unified Glass Dock (Right) */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Side: Prominent JPP Logo & Campus Location Pill */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* JPP Brand Badge */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center p-1.5 shadow-sm shrink-0">
                <img src="/jpp-logo.png" alt="JPP POLISAS" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xs sm:text-sm tracking-tight text-white leading-tight">
                  JPP POLISAS
                </span>
                <span className="text-[9px] font-bold text-emerald-400 tracking-wide">
                  Portal Rasmi Pelajar
                </span>
              </div>
            </div>

            {/* Campus Location Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 dark:bg-black/25 backdrop-blur-md border border-white/15 text-white/90 text-xs font-medium shrink-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>POLISAS, Semambu</span>
            </div>
          </div>

          {/* Right Side: Consolidated Unified Glass Dock Capsule */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 divide-x divide-white/10 shadow-lg shrink-0">
            <div className="px-1 [&_button]:!h-8 [&_button]:!w-8 [&_button]:!bg-transparent [&_button]:hover:!bg-white/10 [&_button]:!text-white [&_button]:!rounded-xl">
              <ThemeToggle />
            </div>
            <div className="px-1 [&_button]:!h-8 [&_button]:!w-8 [&_button]:!bg-transparent [&_button]:hover:!bg-white/10 [&_button]:!text-white [&_button]:!rounded-xl">
              <NotificationBell variant="dark" />
            </div>
            <div className="pl-1.5 pr-0.5">
              <button
                type="button"
                onClick={onOpenSidebar}
                className="tour-navbar-profile relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-emerald-400/50 hover:ring-emerald-400/80 active:scale-95 transition-all shadow-sm focus:outline-none cursor-pointer shrink-0"
                aria-label="Buka profil dan tetapan"
              >
                <Avatar className="w-full h-full rounded-none">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} className="object-cover" alt="Profil" />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-tr from-emerald-600 to-teal-500 text-white text-[11px] font-black rounded-full">
                    {profile?.full_name?.[0]?.toUpperCase() || displayName?.[0]?.toUpperCase() || 'P'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>
        </div>

        {/* Hero Greeting Section */}
        <div className="flex flex-col gap-1.5 sm:gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-white/85">
              {greeting.title}
            </span>
            {roleTitle && (
              <span className="inline-flex items-center text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full shadow-sm">
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

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
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

        {/* Pure White Stadium Capsule Search Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => triggerCommandPalette(true)}
            className="w-full h-12 px-4 rounded-full bg-white hover:bg-slate-50 text-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.18)] hover:shadow-[0_10px_35px_rgba(0,0,0,0.22)] border border-white/40 flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] group cursor-pointer"
            aria-label="Cari makanan, runner, servis, acara, merit..."
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Search className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs sm:text-sm text-slate-500 group-hover:text-slate-700 font-medium truncate">
                Cari makanan, runner, servis, acara, merit...
              </span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 rounded-full border border-slate-200/80">
              <span>Ctrl</span>+<span>K</span>
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
}

export default SuperAppHeader;
