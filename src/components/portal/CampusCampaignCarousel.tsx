import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PartyPopper,
  Building2,
  Sparkles,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CampaignSlide, getCampaignVariantClasses } from '@/lib/superAppHelpers';

export interface CampusCampaignCarouselProps {
  slides: CampaignSlide[];
  onOpenAppealModal?: () => void;
  className?: string;
}

const CAMPAIGN_ICONS: Record<
  CampaignSlide['id'],
  React.ComponentType<{ className?: string }>
> = {
  makmp: PartyPopper,
  kamsis: Building2,
  karnival: Sparkles,
  supsas: Trophy,
};

const VARIANT_ACCENTS: Record<
  CampaignSlide['variant'],
  {
    iconBox: string;
    badge: string;
    button: string;
  }
> = {
  gold: {
    iconBox: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30',
    button: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-amber-500/20',
  },
  emerald: {
    iconBox: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30',
    button: 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-emerald-600/20',
  },
  violet: {
    iconBox: 'bg-violet-500/15 border-violet-500/30 text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-500/20 text-violet-800 dark:text-violet-300 border border-violet-500/30',
    button: 'bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-violet-600/20',
  },
  amber: {
    iconBox: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30',
    button: 'bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-amber-600/20',
  },
  rose: {
    iconBox: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30',
    button: 'bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-rose-600/20',
  },
};

export function CampusCampaignCarousel({
  slides,
  onOpenAppealModal,
  className,
}: CampusCampaignCarouselProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance every 6 seconds when more than 1 slide
  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides?.length]);

  if (!slides || slides.length === 0) {
    return null;
  }

  const safeIndex = currentIndex < slides.length ? currentIndex : 0;
  const currentSlide = slides[safeIndex];

  if (!currentSlide) {
    return null;
  }

  const handleAction = (slide: CampaignSlide) => {
    if (slide.actionPath) {
      navigate(slide.actionPath);
    } else if (onOpenAppealModal) {
      onOpenAppealModal();
    }
  };

  const Icon = CAMPAIGN_ICONS[currentSlide.id] || Sparkles;
  const accent = VARIANT_ACCENTS[currentSlide.variant] || VARIANT_ACCENTS.amber;
  const variantClass = getCampaignVariantClasses(currentSlide.variant);

  return (
    <div className={cn('w-full max-w-full overflow-hidden', className)}>
      <div className="relative overflow-hidden rounded-3xl border shadow-sm backdrop-blur-md bg-white/40 dark:bg-slate-900/60 transition-all duration-300">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id || safeIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className={cn(
              'p-5 sm:p-6 bg-gradient-to-r flex flex-col md:flex-row md:items-center justify-between gap-4 border',
              variantClass
            )}
          >
            <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div
                className={cn(
                  'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-transform',
                  accent.iconBox
                )}
              >
                <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider',
                      accent.badge
                    )}
                  >
                    {currentSlide.badge}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white tracking-tight line-clamp-1">
                  {currentSlide.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                  {currentSlide.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end shrink-0 pt-2 md:pt-0">
              <button
                type="button"
                onClick={() => handleAction(currentSlide)}
                className={cn(
                  'w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer',
                  accent.button
                )}
              >
                <span>{currentSlide.actionText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {slides.length > 1 && (
        <div
          className="flex items-center justify-center gap-1.5 mt-2.5"
          role="tablist"
          aria-label="Navigasi Kempen"
        >
          {slides.map((slide, idx) => (
            <button
              key={slide.id || idx}
              type="button"
              role="tab"
              aria-selected={idx === safeIndex}
              aria-label={`Slide ${idx + 1}: ${slide.title}`}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                idx === safeIndex
                  ? 'w-6 bg-slate-800 dark:bg-white'
                  : 'w-1.5 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CampusCampaignCarousel;
