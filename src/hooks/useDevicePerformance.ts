import { useEffect, useRef, useState } from 'react';

export interface DevicePerformanceInfo {
  isLowPerf: boolean;
  concurrency: number;
  memory: number | null;
  prefersReducedMotion: boolean;
  isThrottledCpu: boolean;
}

/**
 * Runtime-adaptive low-end detection.
 *
 * WHY (lesson learned the hard way):
 * The old heuristic used `navigator.hardwareConcurrency <= 4` and a single-shot
 * CPU micro-benchmark run synchronously at mount. Both are UNRELIABLE:
 *   - Core count is meaningless: budget MediaTek/Snapdragon phones ship 8 cores
 *     (Cortex-A53) that are SLOWER than a 6-core iPhone. 8-core budget phone
 *     passed as "high-end"; iPhone (hidden/6 cores) got flagged. Backwards.
 *   - The mount-time benchmark runs during React hydration/JS-parse, so even a
 *     fast device spikes >2ms and gets a false positive.
 *
 * CORRECT approach: MEASURE actual jank at runtime instead of guessing from
 * hardware specs. A device is "low-end" only when it PROVABLY drops frames.
 *
 * Signals kept (reliable):
 *   - `navigator.connection.saveData` (Data Saver) — explicit user signal.
 *   - `navigator.deviceMemory <= 6` (GB) — Chrome reports reliably. 6GB is the
 *     budget/entry tier (4–6GB MediaTek/Snapdragon 6-series); iOS hides this so
 *     iPhones fall through to the rAF test instead.
 *   - Runtime frame-drop detection (NEW): sample requestAnimationFrame deltas;
 *     if the median frame exceeds ~28ms (i.e. sustained < ~36fps), flag low-end.
 *
 * `prefersReducedMotion` is deliberately NOT part of `isLowPerf` — it is an
 * accessibility preference, handled separately by MotionConfig reducedMotion="user".
 *
 * Upgrade-only: once flagged low-end, stay flagged (never oscillate).
 */
export function useDevicePerformance(): DevicePerformanceInfo {
  const [perfInfo, setPerfInfo] = useState<DevicePerformanceInfo>(() => {
    if (typeof window === 'undefined') {
      return { isLowPerf: false, concurrency: 8, memory: 8, prefersReducedMotion: false, isThrottledCpu: false };
    }

    // iOS Safari < 18 does NOT expose navigator.hardwareConcurrency (undefined).
    // Undefined = "unknown", NOT "weak" — fallback to 8 so iPhones are never
    // mislabeled low-end (which previously disabled the PolyMaps drag gesture).
    const concurrency =
      typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? navigator.hardwareConcurrency
        : 8;
    const memory =
      typeof navigator !== 'undefined' && (navigator as any).deviceMemory
        ? (navigator as any).deviceMemory
        : null;
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    // Manual override (?perf=low / localStorage force_low_perf) still honored.
    let forceLowPerf = false;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('perf') === 'low' || localStorage.getItem('force_low_perf') === 'true') {
        forceLowPerf = true;
      }
    } catch {}

    const isSaveData =
      typeof navigator !== 'undefined' && (navigator as any).connection?.saveData === true;

    // NOTE: concurrency is intentionally NOT used to decide isLowPerf anymore.
    // Initial guess uses only reliable signals; runtime jank detection refines it.
    const isLowPerf = forceLowPerf || isSaveData || (memory !== null && memory <= 6);

    return { isLowPerf, concurrency, memory, prefersReducedMotion, isThrottledCpu: isLowPerf };
  });

  const flaggedRef = useRef(perfInfo.isLowPerf);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (flaggedRef.current) return; // already low-end (or forced) — no need to measure

    // ── Runtime jank detection ──────────────────────────────────────────────
    // Sample ~60 rAF frames (~1s on a 60Hz device). Compute the MEDIAN delta.
    // A sustained median above ~28ms means the device is rendering under ~36fps
    // → genuinely low-end (or heavily throttled). Upgrade to low-perf once.
    //
    // WHY a fixed setTimeout (NOT requestIdleCallback): iOS Safari has no
    // requestIdleCallback, so it used to fall back to a 300ms timer and measure
    // during the post-mount animation burst → false "low-end" on fast iPhones.
    // Android Chrome deferred to true idle → measured clean → false "high-end"
    // on budget phones. A fixed 1000ms delay measures both under the same,
    // settled conditions.
    let rafId = 0;
    let firstFrame = true;
    let last = 0;
    const samples: number[] = [];
    const targetSamples = 60;

    const tick = (now: number) => {
      if (!firstFrame) {
        samples.push(now - last);
      }
      firstFrame = false;
      last = now;

      if (samples.length < targetSamples) {
        rafId = requestAnimationFrame(tick);
      } else {
        const sorted = [...samples].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        // 28ms median ≈ device struggles to hold 36fps even when idle.
        if (median > 28) {
          flaggedRef.current = true;
          setPerfInfo((prev) => ({ ...prev, isLowPerf: true, isThrottledCpu: true }));
        }
      }
    };

    const delayId = setTimeout(() => {
      rafId = requestAnimationFrame(tick);
    }, 1000);

    return () => {
      clearTimeout(delayId);
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (perfInfo.isLowPerf) {
      document.documentElement.classList.add('low-perf-device');
    } else {
      document.documentElement.classList.remove('low-perf-device');
    }

    // Listen for reduced motion preference changes.
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPerfInfo((prev) => ({ ...prev, prefersReducedMotion: e.matches }));
    };
    mediaQuery.addEventListener('change', handleMotionChange);
    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, [perfInfo.isLowPerf]);

  return perfInfo;
}
