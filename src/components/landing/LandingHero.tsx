import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
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

export const LandingHero: React.FC<LandingHeroProps> = ({ stats: _stats }) => {
  const { t } = useTranslation(['portal', 'common']);
  const navigate = useNavigate();
  const [stageFocus, setStageFocus] = useState<'portal' | 'polymart' | 'polymaps'>('portal');
  const phoneSrc =
    stageFocus === 'polymaps'
      ? '/GAMBAR/Polymap View Phone.png'
      : '/GAMBAR/Polymart View Phone.png';

  const lensCaptions: Record<'portal' | 'polymart' | 'polymaps', string> = {
    portal: t(
      'portal:landing_lens_caption_portal',
      'Hab sehenti siswa — jadual kuliah, perkhidmatan kampus & unit Exco'
    ),
    polymart: t(
      'portal:landing_lens_caption_polymart',
      'Pesan makanan kampus & cenderamata siswa tanpa tunai melalui JPP Pay'
    ),
    polymaps: t(
      'portal:landing_lens_caption_polymaps',
      'Peta kampus interaktif untuk bilik kuliah, makmal & laluan pejalan kaki'
    ),
  };

  return (
    <section
      id="hero"
      className="relative min-h-[100dvh] lg:min-h-[86dvh] flex items-center pt-[calc(4.75rem+var(--sat,env(safe-area-inset-top,0px)))] sm:pt-24 lg:pt-24 pb-10 sm:pb-14 overflow-hidden bg-gradient-to-b from-[#F6FBF9] via-[#F6FBF9] to-[#EBF7F4]/60 dark:from-[#090B0E] dark:via-[#090B0E] dark:to-[#0E1116]"
    >
      {/* Restrained Atmospheric Radial Highlight (zero filter blur) */}
      <div
        className="absolute top-16 right-0 w-[640px] h-[420px] bg-[radial-gradient(circle,rgba(13,148,136,0.10)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(45,212,191,0.06)_0%,transparent_70%)] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-7 sm:gap-9 lg:gap-10 xl:gap-12 items-center">
        {/* ── LEFT COLUMN: Restrained Editorial Positioning & Direct Conversion Actions ── */}
        <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
          {/* Single Quiet Institutional Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] text-xs font-medium shadow-surface-sm max-w-[94vw] sm:max-w-none"
          >
            <span className="inline-flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF] shrink-0" aria-hidden="true" />
              <span className="font-semibold text-[#0B2420] dark:text-[#F1F5F9]">POLISAS Semambu</span>
            </span>
            <span className="hidden sm:inline text-[#B8E4DC] dark:text-[#252B35]" aria-hidden="true">|</span>
            <span className="text-[#3B635C] dark:text-[#94A0B2]">
              {t('portal:hero_title', 'Ekosistem Digital Kampus & Super App Pelajar')}
            </span>
          </motion.div>

          {/* Editorial 2-Line Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.04, ease: [0.23, 1, 0.32, 1] }}
            className="text-3xl sm:text-5xl lg:text-[2.85rem] xl:text-[3.35rem] font-bold tracking-[-0.03em] text-[#0B2420] dark:text-[#F1F5F9] mt-4 mb-3.5 sm:mb-4 leading-[1.06] max-w-xl [text-wrap:balance]"
          >
            <span>{t('portal:landing_hero_line1', 'Satu Kampus.')}</span>
            <span className="block text-[#0F766E] dark:text-[#2DD4BF]">
              {t('portal:landing_hero_line2', 'Satu Ekosistem Pintar.')}
            </span>
          </motion.h1>

          {/* Focused Value Proposition (65ch cap) */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
            className="text-sm sm:text-base text-[#3B635C] dark:text-[#94A0B2] max-w-[46ch] font-normal leading-relaxed mb-5 sm:mb-7"
          >
            {t(
              'portal:hero_subtitle',
              'Sistem pengurusan bersepadu Majlis Perwakilan Pelajar Politeknik Sultan Haji Ahmad Shah.'
            )}
          </motion.p>

          {/* Primary & Secondary CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-2.5 sm:gap-3 w-full sm:w-auto"
          >
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="w-full sm:w-auto pl-6 pr-2 py-2 min-h-[46px] rounded-full bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#2DD4BF] dark:hover:bg-[#5EEAD4] text-white dark:text-[#090B0E] font-semibold text-sm shadow-surface-md transition-[transform,background-color] duration-150 ease-apple-out active:scale-[0.97] flex items-center justify-between sm:justify-center gap-3 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
            >
              <span>{t('portal:explore_portal', 'Terokai Portal Pelajar')}</span>
              <span className="w-8 h-8 rounded-full bg-white/15 dark:bg-[#090B0E]/15 flex items-center justify-center shrink-0">
                <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => scrollToLandingSection('#hari-kampus')}
              className="w-full sm:w-auto px-5 py-2.5 min-h-[46px] rounded-full bg-white dark:bg-[#13171D] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] font-semibold text-sm transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] flex items-center justify-center gap-2 shadow-surface-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
            >
              <Compass className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" aria-hidden="true" />
              <span>{t('portal:landing_explore_campus_day', 'Jelajah Hari Kampus')}</span>
            </button>
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN: Architectural Hardware Stage + Live Portal v2 Showcase ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
          className="lg:col-span-6 relative"
        >
          {/* Outer Neutral Architectural Bezel */}
          <div className="rounded-[1.75rem] sm:rounded-[2rem] p-2 sm:p-2.5 bg-[#0B2420]/[0.04] dark:bg-[#0E1116] ring-1 ring-[#0B2420]/10 dark:ring-[#252B35] shadow-surface-lg relative">
            {/* Inner Hardware Stage: Light Mineral Pine -> Dark Pure Obsidian Carbon */}
            <div className="rounded-[calc(1.75rem-0.5rem)] sm:rounded-[calc(2rem-0.5rem)] bg-[#0B2420] dark:bg-[#13171D] p-3 sm:p-4 border border-[#1E4D45] dark:border-[#252B35] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] relative">
              {/* Top Stage Bar + Interactive Product Lens Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3.5 border-b border-[#1E4D45] dark:border-[#252B35] relative z-30">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2DD4BF]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/25 dark:bg-[#252B35]" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-[#B8E4DC] dark:text-[#94A0B2] truncate">
                    <Laptop className="w-3.5 h-3.5 text-[#2DD4BF] shrink-0" aria-hidden="true" />
                    <span className="truncate">portal.jpp-polisas.edu.my</span>
                  </div>
                </div>

                {/* Interactive Lens Control */}
                <div className="inline-flex items-center p-0.5 rounded-full bg-[#061714] dark:bg-[#0E1116] border border-[#1E4D45] dark:border-[#252B35] gap-0.5">
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
                        'px-2.5 py-1 rounded-full text-xs font-semibold transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF]',
                        stageFocus === lens.id
                          ? 'bg-[#2DD4BF] text-[#090B0E]'
                          : 'text-[#B8E4DC] dark:text-[#94A0B2] hover:text-white dark:hover:text-[#F1F5F9]'
                      )}
                    >
                      {lens.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dual-Device Canvas: Uncropped 16:10 Portal v2 Desktop + Overlapping Phone App */}
              <div className="relative">
                <div
                  className={cn(
                    'aspect-[16/10] bg-[#F6FBF9] dark:bg-[#0E1116] rounded-xl overflow-hidden border border-[#1E4D45] dark:border-[#252B35] transition-opacity duration-200',
                    stageFocus !== 'portal' ? 'opacity-70' : 'opacity-100'
                  )}
                >
                  <img
                    src="/GAMBAR/Portal View Laptop.png"
                    alt="JPP POLISAS Portal Desktop View"
                    width={1440}
                    height={900}
                    className="w-full h-full object-cover object-top"
                    loading="eager"
                    fetchPriority="high"
                  />
                </div>

                {/* Overlapping Smartphone Preview Frame */}
                <div
                  className={cn(
                    'absolute -bottom-2 right-1.5 sm:-bottom-3 sm:right-3 w-[88px] sm:w-[136px] md:w-[150px] z-20 transform-gpu transition-transform duration-200 ease-apple-out',
                    stageFocus !== 'portal' ? 'scale-[1.04] z-30' : 'hover:scale-[1.02]'
                  )}
                >
                  <div className="bg-[#061714] dark:bg-[#090B0E] p-1 sm:p-1.5 rounded-[1.25rem] sm:rounded-[1.75rem] shadow-surface-lg border border-[#2DD4BF]/35 dark:border-[#252B35]">
                    <div className="relative aspect-[9/19] bg-black rounded-[1rem] sm:rounded-[1.4rem] overflow-hidden">
                      {/* Dynamic Island */}
                      <div
                        className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 sm:w-12 h-2 sm:h-2.5 bg-black rounded-full z-30 flex items-center justify-center gap-0.5 sm:gap-1"
                        aria-hidden="true"
                      >
                        <span className="w-1 h-1 rounded-full bg-[#1B2028]" />
                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#2DD4BF]/60" />
                      </div>

                      <AnimatePresence mode="wait">
                        <motion.div
                          key={phoneSrc}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="w-full h-full"
                        >
                          <img
                            src={phoneSrc}
                            alt={stageFocus === 'polymaps' ? 'PolyMap Phone View' : 'PolyMart Phone View'}
                            width={390}
                            height={820}
                            className="w-full h-full object-cover object-top"
                            loading="eager"
                          />
                        </motion.div>
                      </AnimatePresence>

                      {/* Bottom Mobile Switcher */}
                      <div className="hidden sm:flex absolute bottom-2 inset-x-1 z-30 justify-center">
                        <div className="bg-[#0B2420] dark:bg-[#0E1116] p-0.5 rounded-full border border-white/20 dark:border-[#252B35] flex items-center gap-0.5 shadow-surface-sm">
                          <Smartphone className="w-3 h-3 text-[#2DD4BF] ml-1.5 mr-0.5 shrink-0" aria-hidden="true" />
                          <button
                            type="button"
                            onClick={() => setStageFocus('polymart')}
                            className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer',
                              stageFocus !== 'polymaps'
                                ? 'bg-[#0F766E] dark:bg-[#2DD4BF] text-white dark:text-[#090B0E]'
                                : 'text-[#B8E4DC] dark:text-[#94A0B2] hover:text-white'
                            )}
                          >
                            Mart
                          </button>
                          <button
                            type="button"
                            onClick={() => setStageFocus('polymaps')}
                            className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer',
                              stageFocus === 'polymaps'
                                ? 'bg-[#2DD4BF] text-[#090B0E]'
                                : 'text-[#B8E4DC] dark:text-[#94A0B2] hover:text-white'
                            )}
                          >
                            Maps
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quiet Single-Line Lens Context Bar (zero duplicate KPI dumps) */}
              <div className="mt-4 pt-3 border-t border-[#1E4D45] dark:border-[#252B35] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#B8E4DC] dark:text-[#94A0B2] font-normal truncate pr-2">
                  {lensCaptions[stageFocus]}
                </span>
                <span className="text-[#2DD4BF] font-medium shrink-0">
                  {t('portal:landing_audience_polisas', 'Mahasiswa POLISAS')}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingHero;
