import { useEffect, useState } from 'react';

export interface DevicePerformanceInfo {
  isLowPerf: boolean;
  concurrency: number;
  memory: number | null;
  prefersReducedMotion: boolean;
}

/**
 * Hook to passively detect device hardware capacity and apply `.low-perf-device` CSS tiering.
 * Helps prevent frame drops and GPU thermal throttling on low-spec phones and tablets.
 */
export function useDevicePerformance(): DevicePerformanceInfo {
  const [perfInfo, setPerfInfo] = useState<DevicePerformanceInfo>(() => {
    if (typeof window === 'undefined') {
      return { isLowPerf: false, concurrency: 8, memory: 8, prefersReducedMotion: false };
    }

    const concurrency = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
    const memory = typeof navigator !== 'undefined' && (navigator as any).deviceMemory ? (navigator as any).deviceMemory : null;
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    // Detect low-end profile: <=4 CPU cores OR <=4GB RAM OR prefers reduced motion
    const isLowPerf = concurrency <= 4 || (memory !== null && memory <= 4) || prefersReducedMotion;

    return { isLowPerf, concurrency, memory, prefersReducedMotion };
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (perfInfo.isLowPerf) {
      document.documentElement.classList.add('low-perf-device');
    } else {
      document.documentElement.classList.remove('low-perf-device');
    }

    // Listen for reduced motion preference changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPerfInfo(prev => {
        const isLowPerf = prev.concurrency <= 4 || (prev.memory !== null && prev.memory <= 4) || e.matches;
        if (isLowPerf) {
          document.documentElement.classList.add('low-perf-device');
        } else {
          document.documentElement.classList.remove('low-perf-device');
        }
        return { ...prev, prefersReducedMotion: e.matches, isLowPerf };
      });
    };

    mediaQuery.addEventListener('change', handleMotionChange);
    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, [perfInfo.isLowPerf]);

  return perfInfo;
}
