import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Menu, Search, Sparkles, Trophy } from 'lucide-react';
import { cn, getMalaysianNickname } from '@/lib/utils';
import { triggerCommandPalette } from '@/lib/commandPalette';
import { formatGreeting, getRoleBadgeTitle, getHeaderGradientClass } from '@/lib/superAppHelpers';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
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
  const { t } = useTranslation(['portal', 'common']);
  const currentHour = useMemo(() => new Date().getHours(), []);
  const defaultStudentName = t('portal:student_polisas', 'Pelajar');
  const nameToDisplay = useMemo(() => {
    if (displayName) return displayName;
    return getMalaysianNickname(profile?.full_name, defaultStudentName);
  }, [displayName, profile?.full_name, defaultStudentName]);

  const greeting = useMemo(() => formatGreeting(currentHour, nameToDisplay, t), [currentHour, nameToDisplay, t]);
  const roleTitle = useMemo(() => getRoleBadgeTitle(profile?.role, t), [profile?.role, t]);
  const gradientClass = useMemo(
    () => getHeaderGradientClass(karnivalActive, supsasActive),
    [karnivalActive, supsasActive]
  );

  return (
    <header
      className={cn(
        'tour-superapp-header relative overflow-hidden rounded-b-3xl border-b border-[#B8E4DC]/20 shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition-colors duration-300 pt-[var(--sat,env(safe-area-inset-top,0px))]',
        'bg-gradient-to-br',
        gradientClass,
        className
      )}
    >
      {/* Subtle Ambient Decorative Glows */}
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-black/25 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Main Header Container */}
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pt-5 sm:pt-7 pb-5 sm:pb-6 max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5">
        {/* Top Action Bar: Brand Logo & Location (Left) + Floating Discrete Action Circles (Right) */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Side: Desktop Menu Trigger + JPP Logo & Campus Location Pill */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {onOpenSidebar && (
              <button
                type="button"
                onClick={onOpenSidebar}
                className="hidden lg:flex relative w-10 h-10 sm:w-11 sm:h-11 after:content-[''] after:absolute after:-inset-1 rounded-full bg-white/10 hover:bg-white/15 border border-[#B8E4DC]/30 items-center justify-center text-white/90 hover:text-white transition-[transform,background-color] duration-150 ease-out active:scale-[0.96] cursor-pointer shrink-0"
                aria-label={t('nav:menu', 'Menu Navigasi')}
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            {/* JPP Brand Badge */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-[#B8E4DC]/30 flex items-center justify-center p-1.5 shadow-sm shrink-0">
                <img src="/jpp-logo.png" alt="JPP POLISAS" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-xs sm:text-sm tracking-tight text-white leading-tight truncate">
                  JPP POLISAS
                </span>
                <span className="text-[11px] font-medium text-[#5EEAD4] tracking-tight truncate">
                  {t('portal:official_student_portal', 'Portal Rasmi Pelajar')}
                </span>
              </div>
            </div>

            {/* Campus Location Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 dark:bg-black/25 border border-[#B8E4DC]/20 text-[#F6FBF9] text-xs font-medium shrink-0">
              <MapPin className="w-3.5 h-3.5 text-[#5EEAD4] shrink-0" />
              <span>POLISAS, Semambu</span>
            </div>
          </div>

          {/* Right Side: Floating Discrete Action Circles */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* LanguageToggle circular button */}
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 after:content-[''] after:absolute after:-inset-1 rounded-full bg-white/10 hover:bg-white/15 border border-[#B8E4DC]/30 shadow-sm flex items-center justify-center text-white/90 hover:text-white transition-[transform,background-color] duration-150 ease-out active:scale-[0.96] shrink-0 [&_button]:!h-10 sm:[&_button]:!h-11 [&_button]:!w-10 sm:[&_button]:!w-11 [&_button]:!rounded-full [&_button]:!bg-transparent [&_button]:hover:!bg-transparent [&_button]:!p-0">
              <LanguageToggle variant="circular" />
            </div>

            {/* 1. ThemeToggle circular button */}
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 after:content-[''] after:absolute after:-inset-1 rounded-full bg-white/10 hover:bg-white/15 border border-[#B8E4DC]/30 shadow-sm flex items-center justify-center text-white/90 hover:text-white transition-[transform,background-color] duration-150 ease-out active:scale-[0.96] shrink-0 [&_button]:!h-10 sm:[&_button]:!h-11 [&_button]:!w-10 sm:[&_button]:!w-11 [&_button]:!rounded-full [&_button]:!bg-transparent [&_button]:hover:!bg-transparent [&_button]:!p-0">
              <ThemeToggle />
            </div>

            {/* 2. NotificationBell circular button */}
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 after:content-[''] after:absolute after:-inset-1 rounded-full bg-white/10 hover:bg-white/15 border border-[#B8E4DC]/30 shadow-sm flex items-center justify-center text-white/90 hover:text-white transition-[transform,background-color] duration-150 ease-out active:scale-[0.96] shrink-0 [&_button]:!h-10 sm:[&_button]:!h-11 [&_button]:!w-10 sm:[&_button]:!w-11 [&_button]:!rounded-full [&_button]:!bg-transparent [&_button]:hover:!bg-transparent [&_button]:!p-0">
              <NotificationBell variant="dark" />
            </div>

            {/* 3. Profile Avatar button */}
            <button
              type="button"
              onClick={onOpenSidebar}
              className="tour-navbar-profile relative w-10 h-10 sm:w-11 sm:h-11 after:content-[''] after:absolute after:-inset-1 rounded-full overflow-hidden ring-2 ring-emerald-400/60 hover:ring-emerald-400 active:scale-[0.96] transition-[transform,box-shadow] duration-150 ease-out shadow-md focus:outline-none cursor-pointer shrink-0"
              aria-label={t('portal:open_profile_settings', 'Buka profil dan tetapan')}
            >
              <Avatar className="w-full h-full rounded-none">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} className="object-cover" alt={t('portal:profile', 'Profil')} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-tr from-emerald-600 to-teal-500 text-white text-xs font-bold rounded-full">
                  {nameToDisplay?.[0]?.toUpperCase() || 'P'}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>

        {/* Hero Greeting Section */}
        <div className="flex flex-col gap-1 sm:gap-1.5">
          {/* Overline Greeting & Role Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-white/85 flex items-center gap-1.5">
              <span>{greeting.title}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden="true" />
            </span>
            {roleTitle && (
              <span className="inline-flex items-center text-[11px] font-semibold bg-teal-500/20 text-[#B8E4DC] border border-teal-400/30 px-2.5 py-0.5 rounded-full shadow-sm">
                {roleTitle}
              </span>
            )}
            {karnivalActive ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-pink-500/25 text-pink-200 border border-pink-400/30">
                <Sparkles className="w-3 h-3 text-pink-300" />
                <span>{t('portal:karnival_siswa_badge', 'Karnival Siswa')}</span>
              </span>
            ) : supsasActive ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-200 border border-amber-400/30">
                <Trophy className="w-3 h-3 text-amber-300" />
                <span>{t('portal:supsas_live_badge', 'SUPSAS Langsung')}</span>
              </span>
            ) : null}
          </div>

          {/* Student Name */}
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {nameToDisplay}
          </h1>

          <p className="hidden sm:block text-xs sm:text-sm text-white/80 font-medium max-w-2xl leading-relaxed">
            {karnivalActive
              ? t('portal:karnival_header_subtitle', 'Selamat datang ke hab aktiviti, jualan & keraian Karnival Siswa POLISAS!')
              : supsasActive
              ? t('portal:supsas_header_subtitle', 'Ikuti perlawanan, jadual sukan & sokong atlet jabatan anda dalam SUPSAS!')
              : t('portal:default_header_subtitle', 'Pusat sehenti digital untuk semua aktiviti, servis, acara dan kebajikan kampus.')}
          </p>
        </div>

        {/* Adaptive Stadium Capsule Search Button */}
        <div>
          <button
            type="button"
            onClick={() => triggerCommandPalette(true)}
            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-full bg-white hover:bg-[#F6FBF9] dark:bg-[#1B2028] dark:hover:bg-[#232933] text-[#0B2420] dark:text-[#F1F5F9] shadow-[0_8px_30px_rgba(0,0,0,0.18)] hover:shadow-[0_10px_35px_rgba(0,0,0,0.22)] border border-[#B8E4DC]/60 dark:border-[#252B35] flex items-center justify-between gap-3 text-left transition-[transform,background-color,box-shadow] duration-150 ease-out active:scale-[0.99] group cursor-pointer"
            aria-label={t('portal:search_placeholder', 'Cari makanan, runner, servis, acara, merit...')}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#0D9488]/15 dark:bg-[#2DD4BF]/15 text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Search className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs sm:text-sm text-[#3B635C] group-hover:text-[#0B2420] dark:text-[#94A0B2] dark:group-hover:text-[#F1F5F9] font-medium truncate">
                {t('portal:search_placeholder', 'Cari makanan, runner, servis, acara, merit...')}
              </span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-mono text-[#3B635C] dark:text-[#94A0B2] bg-[#F6FBF9] dark:bg-[#13171D] rounded-full border border-[#B8E4DC]/80 dark:border-[#252B35]">
              <span>Ctrl</span>+<span>K</span>
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
}

export default SuperAppHeader;
