import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Users,
  Compass,
  Laptop,
  Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CampusStats } from './landingTypes';
import { scrollToLandingSection } from './LandingNavbar';

interface LandingHeroProps {
  stats: CampusStats;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ stats }) => {
  const { t } = useTranslation(['portal', 'common']);
  const navigate = useNavigate();
  const [stageFocus, setStageFocus] = useState<'portal' | 'polymart' | 'polymaps'>('portal');
  const phoneSrc =
    stageFocus === 'polymaps'
      ? '/GAMBAR/Polymap View Phone.png'
      : '/GAMBAR/Polymart View Phone.png';

  return (
    <section
      id="hero"
      className="relative min-h-[100dvh] flex items-center pt-[calc(5.5rem+var(--sat,env(safe-area-inset-top,0px)))] sm:pt-28 lg:pt-24 pb-10 sm:pb-14 overflow-hidden bg-gradient-to-b from-[#F6FBF9] via-[#F6FBF9] to-[#EBF7F4]/65 dark:from-[#090B0E] dark:via-[#090B0E] dark:to-[#0E1116] jpp-canvas-texture"
    >
      {/* Restrained Atmospheric Mineral Glow (radial gradient, zero filter blur) */}
      <div className="absolute top-16 right-0 w-[640px] h-[420px] bg-[radial-gradient(circle,rgba(13,148,136,0.12)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(45,212,191,0.08)_0%,transparent_70%)] rounded-full pointer-events-none" />
      <div className="absolute bottom-8 left-0 w-72 h-72 bg-[radial-gradient(circle,rgba(184,228,220,0.22)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(45,212,191,0.05)_0%,transparent_70%)] rounded-full pointer-events-none hidden md:block" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-10 xl:gap-12 items-center">
        {/* ── LEFT COLUMN: Editorial Positioning, 2-Line Display Headline & Conversion Actions ── */}
        <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
          {/* Single Editorial Pill */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-3.5 py-1.5 rounded-2xl sm:rounded-full bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] text-[11px] sm:text-xs font-medium shadow-surface-sm max-w-[94vw] sm:max-w-none"
          >
            <span className="inline-flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#0D9488] dark:bg-[#2DD4BF] shrink-0" />
              <span className="font-semibold text-[#0B2420] dark:text-[#F1F5F9]">POLISAS Semambu</span>
            </span>
            <span className="hidden sm:inline text-[#B8E4DC] dark:text-[#252B35]" aria-hidden="true">|</span>
            <span className="text-[#3B635C] dark:text-[#94A0B2]">
              {t('portal:hero_title', 'Ekosistem Digital Kampus & Super App Pelajar')}
            </span>
          </motion.div>

          {/* Architectural 2-Line Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.04, ease: [0.23, 1, 0.32, 1] }}
            className="text-4xl sm:text-5xl lg:text-[2.9rem] xl:text-[3.4rem] font-black tracking-[-0.035em] text-[#0B2420] dark:text-[#F1F5F9] mt-4 mb-4 sm:mb-5 leading-[1.04] max-w-2xl [text-wrap:balance]"
          >
            <span>{t('portal:landing_hero_line1', 'Satu Kampus.')}</span>
            <span className="block text-[#0F766E] dark:text-[#2DD4BF]">{t('portal:landing_hero_line2', 'Satu Ekosistem Pintar.')}</span>
          </motion.h1>

          {/* Focused Value Proposition (65ch cap) */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
            className="text-sm sm:text-base text-[#3B635C] dark:text-[#94A0B2] max-w-[52ch] font-normal leading-relaxed mb-6 sm:mb-7"
          >
            {t(
              'portal:hero_subtitle',
              'Platform berpusat rasmi Majlis Perwakilan Pelajar POLISAS: mengintegrasikan aktiviti kelab, keusahawanan PolyMart, rekod akademik, dan kebajikan mahasiswa dalam satu gerbang pantas.'
            )}
          </motion.p>

          {/* Island Button-in-Button CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.12, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 w-full sm:w-auto"
          >
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="w-full sm:w-auto pl-6 pr-2 py-2 min-h-[48px] rounded-full bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#2DD4BF] dark:hover:bg-[#5EEAD4] text-white dark:text-[#090B0E] font-semibold text-sm shadow-surface-md transition-[transform,background-color] duration-150 ease-apple-out active:scale-[0.97] flex items-center justify-between sm:justify-center gap-3 group cursor-pointer"
            >
              <span>{t('portal:explore_portal', 'Terokai Portal Pelajar')}</span>
              <span className="w-8 h-8 rounded-full bg-white/15 dark:bg-[#090B0E]/15 flex items-center justify-center shrink-0">
                <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => scrollToLandingSection('#hari-kampus')}
              className="w-full sm:w-auto px-5 py-2.5 min-h-[48px] rounded-full bg-white dark:bg-[#13171D] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] font-semibold text-sm transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] flex items-center justify-center gap-2 shadow-surface-sm cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
              <span>{t('portal:landing_explore_campus_day', 'Jelajah Hari Kampus')}</span>
            </button>
          </motion.div>

          {/* Clean Non-Redundant Proof & 5 Academic Faculties Ledger */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.14, ease: [0.23, 1, 0.32, 1] }}
            className="w-full border-t border-[#B8E4DC]/80 dark:border-[#252B35] pt-5 mt-7 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {['FA', 'NR', 'AI'].map((av, idx) => (
                    <span
                      key={idx}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-white dark:text-[#090B0E] ring-2 ring-[#F6FBF9] dark:ring-[#090B0E] bg-[#0F766E] dark:bg-[#2DD4BF]"
                    >
                      {av}
                    </span>
                  ))}
                </div>
                <span className="font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                  {t('portal:landing_chip_active_students', '1,080+ Siswa Aktif')}
                </span>
                <span className="text-[#3B635C] dark:text-[#94A0B2]">
                  ({t('portal:landing_audience_polisas', 'Mahasiswa POLISAS')})
                </span>
              </div>

              <span className="hidden sm:inline text-[#B8E4DC] dark:text-[#252B35]" aria-hidden="true">|</span>

              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF] shrink-0" />
                <span className="font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                  {t('portal:landing_chip_polymart_direct', 'Pesanan PolyMart Terus')}
                </span>
                <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">★ 4.9</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5">
              {['JKA (Awam)', 'JKM (Mekanikal)', 'JKE (Elektrik)', 'JP (Perdagangan)', 'JTMK (InfoTech)'].map((dept) => (
                <span
                  key={dept}
                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#13171D] border border-[#B8E4DC]/90 dark:border-[#252B35] text-[10.5px] font-mono font-medium text-[#0B2420] dark:text-[#F1F5F9] shadow-2xs whitespace-nowrap"
                >
                  {dept}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN: Double-Bezel Interactive Campus Product Showcase ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="lg:col-span-6 relative"
        >
          {/* Outer Aluminum/Mist Bezel */}
          <div className="rounded-[2rem] p-2 sm:p-2.5 bg-[#0B2420]/[0.04] dark:bg-white/[0.03] ring-1 ring-[#0B2420]/10 dark:ring-[#252B35] shadow-surface-lg relative">
            {/* Inner Pine-Teal Hardware Stage */}
            <div className="rounded-[calc(2rem-0.5rem)] bg-gradient-to-b from-[#0B2420] to-[#061714] p-3 sm:p-4 border border-[#1E4D45] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] relative">
              {/* Top Stage Bar + Interactive Product Lens Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#1E4D45] relative z-30">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2DD4BF]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/25" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#99CBC2] truncate">
                    <Laptop className="w-3.5 h-3.5 text-[#2DD4BF] shrink-0" />
                    <span className="truncate">portal.jpp-polisas.edu.my</span>
                  </div>
                </div>

                {/* Interactive Lens Control */}
                <div className="inline-flex items-center p-0.5 rounded-full bg-[#061714] border border-[#1E4D45] gap-0.5">
                  {[
                    { id: 'portal' as const, label: t('portal:landing_lens_portal', 'Portal Hab') },
                    { id: 'polymart' as const, label: t('portal:landing_lens_polymart', 'PolyMart') },
                    { id: 'polymaps' as const, label: t('portal:landing_lens_polymaps', 'PolyMaps') },
                  ].map((lens) => (
                    <button
                      key={lens.id}
                      type="button"
                      onClick={() => setStageFocus(lens.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors duration-150 cursor-pointer",
                        stageFocus === lens.id
                          ? "bg-[#2DD4BF] text-[#061714]"
                          : "text-[#99CBC2] hover:text-white"
                      )}
                    >
                      {lens.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dual-Device Canvas: Desktop Portal + Overlapping Phone App */}
              <div className="relative">
                <div
                  className={cn(
                    "aspect-[16/10] bg-[#F6FBF9] rounded-xl overflow-hidden border border-[#1E4D45] transition-opacity duration-200",
                    stageFocus !== 'portal' ? "opacity-75" : "opacity-100"
                  )}
                >
                  <img
                    src="/GAMBAR/Portal View Laptop.png"
                    alt="JPP POLISAS Portal Desktop View"
                    className="w-full h-full object-cover object-top"
                    loading="eager"
                  />
                </div>

                {/* Overlapping Smartphone Preview Frame */}
                <div
                  className={cn(
                    "absolute -bottom-2 right-1.5 sm:-bottom-4 sm:right-4 w-[84px] sm:w-[138px] md:w-[148px] z-20 transform-gpu transition-transform duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
                    stageFocus !== 'portal' ? "scale-[1.04] z-30" : "hover:scale-[1.03]"
                  )}
                >
                  <div className="bg-[#061714] p-1 sm:p-1.5 rounded-[1.25rem] sm:rounded-[1.9rem] shadow-[0_20px_45px_rgba(0,0,0,0.45)] border border-[#2DD4BF]/40">
                    <div className="relative aspect-[9/19] bg-black rounded-[1rem] sm:rounded-[1.5rem] overflow-hidden">
                      {/* Dynamic Island */}
                      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 sm:w-12 h-2 sm:h-2.5 bg-black rounded-full z-30 flex items-center justify-center gap-0.5 sm:gap-1">
                        <span className="w-1 h-1 rounded-full bg-[#1E4D45]" />
                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#2DD4BF]/60" />
                      </div>

                      <AnimatePresence mode="wait">
                        <motion.div
                          key={phoneSrc}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="w-full h-full"
                        >
                          <img
                            src={phoneSrc}
                            alt={stageFocus === 'polymaps' ? 'PolyMap Phone View' : 'PolyMart Phone View'}
                            className="w-full h-full object-cover object-top"
                            loading="eager"
                          />
                        </motion.div>
                      </AnimatePresence>

                      {/* Bottom Mobile Switcher */}
                      <div className="hidden sm:flex absolute bottom-2 inset-x-1 z-30 justify-center">
                        <div className="bg-[#0B2420] p-0.5 rounded-full border border-white/20 flex items-center gap-0.5 shadow-md">
                          <Smartphone className="w-2.5 h-2.5 text-[#5EEAD4] ml-1 mr-0.5" />
                          <button
                            type="button"
                            onClick={() => setStageFocus('polymart')}
                            className={cn(
                              "px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold transition-colors cursor-pointer",
                              stageFocus !== 'polymaps' ? "bg-[#0F766E] text-white" : "text-[#B8E4DC] hover:text-white"
                            )}
                          >
                            PolyMart
                          </button>
                          <button
                            type="button"
                            onClick={() => setStageFocus('polymaps')}
                            className={cn(
                              "px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold transition-colors cursor-pointer",
                              stageFocus === 'polymaps' ? "bg-[#14B8A6] text-[#061714]" : "text-[#B8E4DC] hover:text-white"
                            )}
                          >
                            PolyMaps
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3-Card Live Campus Telemetry Hardware Ledger */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/[0.06] border border-[#1E4D45] px-3 py-2.5 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#14B8A6]/15 flex items-center justify-center text-[#5EEAD4] shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-[#99CBC2] block leading-tight">
                      {t('portal:landing_badge_governance', 'Tadbir Urus')}
                    </span>
                    <span className="text-[11px] font-semibold text-[#F6FBF9] font-mono tabular-nums leading-tight block">
                      {`${stats.clubsCount} ${t('portal:landing_badge_registered_clubs', 'Kelab Berdaftar')}`}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-white/[0.06] border border-[#1E4D45] px-3 py-2.5 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#14B8A6]/15 flex items-center justify-center text-[#5EEAD4] shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-[#99CBC2] block leading-tight">
                      {t('portal:landing_badge_polymart_campus', 'PolyMart Kampus')}
                    </span>
                    <span className="text-[11px] font-semibold text-[#F6FBF9] font-mono tabular-nums leading-tight block">
                      {`${stats.ordersCount}+ ${t('portal:landing_badge_orders_completed', 'Pesanan Selesai')}`}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-white/[0.06] border border-[#1E4D45] px-3 py-2.5 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#14B8A6]/15 flex items-center justify-center text-[#5EEAD4] shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-[#99CBC2] block leading-tight">
                      {t('portal:landing_badge_student_body', 'Warga Siswa')}
                    </span>
                    <span className="text-[11px] font-semibold text-[#F6FBF9] font-mono tabular-nums leading-tight block">
                      {`${stats.studentsCount.toLocaleString()}+ ${t('portal:landing_badge_student_records', 'Rekod Siswa')}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingHero;
