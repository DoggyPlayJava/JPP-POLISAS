import { useEffect, useState } from 'react';

export interface DevicePerformanceInfo {
  isLowPerf: boolean;
  concurrency: number;
  memory: number | null;
  prefersReducedMotion: boolean;
  isThrottledCpu: boolean;
}

/**
 * Passive micro-benchmark to detect throttled CPU or sluggish low-tier chipset.
 * On modern desktop/high-end phone: takes < 0.2ms.
 * Under DevTools 10x-20x throttling or budget phone (e.g. Helio G35): takes > 2.0ms.
 */
function runCpuBenchmark(): boolean {
  if (typeof performance === 'undefined' || !performance.now) return false;
  try {
    const start = performance.now();
    let sum = 0;
    for (let i = 0; i < 50000; i++) {
      sum += (i % 7) * 3;
    }
    const elapsed = performance.now() - start;
    return elapsed > 2.0 || sum === 0; // if elapsed > 2ms, CPU is heavily throttled/low-spec
  } catch {
    return false;
  }
}

/**
 * Hook to passively detect device hardware capacity and apply `.low-perf-device` CSS tiering.
 * Helps prevent frame drops and GPU thermal throttling on low-spec phones and tablets.
 */
export function useDevicePerformance(): DevicePerformanceInfo {
  const [perfInfo, setPerfInfo] = useState<DevicePerformanceInfo>(() => {
    if (typeof window === 'undefined') {
      return { isLowPerf: false, concurrency: 8, memory: 8, prefersReducedMotion: false, isThrottledCpu: false };
    }

    const concurrency = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
    const memory = typeof navigator !== 'undefined' && (navigator as any).deviceMemory ? (navigator as any).deviceMemory : null;
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    
    // Check manual override via URL param (?perf=low) or localStorage
    let forceLowPerf = false;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('perf') === 'low' || localStorage.getItem('force_low_perf') === 'true') {
        forceLowPerf = true;
      }
    } catch {}

    // Check Data Saver mode
    const isSaveData = typeof navigator !== 'undefined' && (navigator as any).connection?.saveData === true;

    // Run passive CPU micro-benchmark
    const isThrottledCpu = runCpuBenchmark();

    // Detect low-end profile:
    // 1. Manual flag OR Data Saver
    // 2. Hardware: <=4 CPU cores OR <=4GB RAM
    // 3. System motion preference: prefers-reduced-motion
    // 4. Runtime: CPU execution benchmark > 2ms (DevTools throttling or entry-level SoC)
    const isLowPerf = forceLowPerf || isSaveData || concurrency <= 4 || (memory !== null && memory <= 4) || prefersReducedMotion || isThrottledCpu;

    return { isLowPerf, concurrency, memory, prefersReducedMotion, isThrottledCpu };
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
        const isLowPerf = prev.concurrency <= 4 || (prev.memory !== null && prev.memory <= 4) || prev.isThrottledCpu || e.matches;
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
