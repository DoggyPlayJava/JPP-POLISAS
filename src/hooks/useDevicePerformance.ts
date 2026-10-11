import { useEffect } from "react";

export interface DevicePerformanceInfo {
  isLowPerf: boolean;
  concurrency: number;
  memory: number | null;
  prefersReducedMotion: boolean;
  isThrottledCpu: boolean;
}

/**
 * BLANKET low-perf (diputuskan 2026-10): semua device dilayan low-perf.
 * Tiada detection runtime, tiada jank sampling — zero rAF overhead sendiri.
 * Semua effect berat (KarnivalEffects, SupsasEffects, holographic tilt,
 * chart animation) mati automatik sebab isLowPerf sentiasa true.
 *
 * ponytail: kalau nak hidupkan semula effect untuk device kuat sahaja,
 * tambah balik heuristik `deviceMemory >= 8 && hardwareConcurrency >= 8`
 * (reverse detection) — lihat git history `useDevicePerformance.ts`.
 */
export function useDevicePerformance(): DevicePerformanceInfo {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("low-perf-device");
  }, []);

  return {
    isLowPerf: true,
    concurrency: 0,
    memory: null,
    prefersReducedMotion: false,
    isThrottledCpu: true,
  };
}
