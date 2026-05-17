import React, { useEffect, useRef, useCallback } from 'react';
import { useJoyride, Step, STATUS, TooltipRenderProps } from 'react-joyride';
import { X, ChevronRight } from 'lucide-react';
import { TOUR_STEPS } from '@/config/tourSteps';

export interface SystemTourProps {
  steps?: Step[];
  tourKey?: string;
  run: boolean;
  onClose: () => void;
}

/**
 * SystemTour — Wrapper untuk react-joyride v3
 * 
 * MASALAH: Joyride v3 `closeProps.onClick` dan `skipProps.onClick` TIDAK
 * berfungsi dalam CustomTooltip. State juga tidak reactive untuk close/skip.
 * 
 * PENYELESAIAN: Bypass sepenuhnya — gunakan custom onClick pada butang X
 * yang terus panggil `onClose()` dari parent (useTour hook). Ini akan:
 * 1. Set runTour = false (tooltip hilang)
 * 2. Set localStorage (tour tak auto-play lagi)
 */
export function SystemTour({ steps, tourKey, run, onClose }: SystemTourProps) {
  const rawSteps = steps || (tourKey ? TOUR_STEPS[tourKey] : []) || [];
  
  // Force disableBeacon pada SEMUA steps — elak titik hitam (beacon)
  const resolvedSteps = rawSteps.map(s => ({
    ...s,
    disableBeacon: true,
  }));

  // Simpan onClose dalam ref supaya CustomTooltip boleh akses tanpa re-render
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Buat tooltip component yang capture onCloseRef
  const TooltipComponent = useCallback((props: TooltipRenderProps) => {
    return <CustomTooltip {...props} onCloseTour={() => onCloseRef.current()} />;
  }, []);

  const { state, Tour } = useJoyride({
    continuous: true,
    hideCloseButton: true,
    run,
    scrollToFirstStep: true,
    scrollOffset: 200,
    showProgress: false,
    showSkipButton: false,
    disableOverlayClose: false,
    steps: resolvedSteps,
    tooltipComponent: TooltipComponent,
    floaterProps: {
      disableAnimation: true,
    },
    styles: {
      options: {
        arrowColor: '#0f172a', 
        zIndex: 99999, 
      },
      beacon: { display: 'none' },
      beaconInner: { display: 'none' },
      beaconOuter: { display: 'none' },
    },
  });

  // Backup: Pantau state.status jika tour selesai secara natural (klik Selesai pada step terakhir)
  const hasClosed = useRef(false);
  
  useEffect(() => {
    if (
      !hasClosed.current && 
      (state.status === STATUS.FINISHED || 
       state.status === STATUS.SKIPPED || 
       state.status === 'finished' || 
       state.status === 'skipped')
    ) {
      hasClosed.current = true;
      onClose();
    }
  }, [state.status, state.action, state.lifecycle, onClose]);

  useEffect(() => {
    if (run) {
      hasClosed.current = false;
    }
  }, [run]);

  if (!resolvedSteps.length) return null;

  return <>{Tour}</>;
}

// ── Custom Tooltip dengan manual close handler ──────────────────────────────

interface CustomTooltipProps extends TooltipRenderProps {
  onCloseTour: () => void;
}

function CustomTooltip({
  index,
  step,
  size,
  backProps,
  primaryProps,
  tooltipProps,
  isLastStep,
  onCloseTour,
}: CustomTooltipProps) {
  // Untuk step terakhir: klik "Selesai" juga tutup tour
  const handlePrimaryClick = (e: React.MouseEvent) => {
    if (isLastStep) {
      e.preventDefault();
      onCloseTour();
    } else {
      // Panggil handler asal Joyride untuk advance ke step seterusnya
      primaryProps.onClick?.(e as any);
    }
  };

  return (
    <div
      {...tooltipProps}
      className="bg-[#0f172a] backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 md:p-8 max-w-[420px] w-[calc(100vw-2rem)] flex flex-col gap-4 text-white font-sans relative overflow-hidden"
    >
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[50px] -translate-y-1/2 translate-x-1/2 pointer-events-none rounded-full" />

      {/* Title & Close */}
      <div className="flex items-start justify-between gap-4 relative z-10">
        {step.title && (
          <h3 className="text-xl md:text-2xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
            {step.title}
          </h3>
        )}
        {/* Butang X — panggil onCloseTour() terus (bypass Joyride closeProps yang rosak) */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCloseTour(); }}
          className="text-white/40 hover:text-white p-2 -mr-3 -mt-3 transition-colors rounded-full hover:bg-white/10 active:scale-95"
          aria-label="Tutup tutorial"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="text-sm md:text-base text-slate-300 leading-relaxed font-medium relative z-10">
        {step.content}
      </div>

      {/* Footer / Controls */}
      <div className="flex items-center justify-between mt-6 relative z-10">
        <div className="flex gap-1.5 items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
               Langkah {index + 1} / {size}
            </span>
        </div>
        
        <div className="flex items-center gap-1 md:gap-3">
          {index > 0 && (
            <button
              {...backProps}
              className="px-4 py-2.5 text-xs md:text-sm font-bold text-white/50 hover:text-white transition-colors uppercase tracking-wider"
            >
              Kembali
            </button>
          )}
          <button
            {...primaryProps}
            onClick={handlePrimaryClick}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs md:text-sm font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95"
          >
            {isLastStep ? 'Selesai ✓' : 'Seterusnya'}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
