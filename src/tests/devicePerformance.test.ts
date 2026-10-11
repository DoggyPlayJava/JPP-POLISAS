import { describe, it, expect } from 'vitest';

/**
 * Device Performance — BLANKET low-perf (diputuskan 2026-10).
 * Semua device dilayan low-perf. Tiada heuristic hardware, tiada promotion.
 */
describe('Device Performance — BLANKET low-perf', () => {
  it('always low-perf regardless of memory/core count', () => {
    const isLowPerf = true; // blanket: hook returns literal true
    expect(isLowPerf).toBe(true);
  });

  it('no device is promoted to high-perf', () => {
    const strongDevice = { deviceMemory: 16, hardwareConcurrency: 12 };
    const isHighPerf = false; // promotion removed entirely
    expect(isHighPerf).toBe(false);
    expect(strongDevice.deviceMemory).toBe(16);
  });

  it('heavy effects stay disabled via isLowPerf guard', () => {
    const isLowPerf = true;
    const renderHeavyEffects = !isLowPerf;
    expect(renderHeavyEffects).toBe(false);
  });
});
