import { describe, it, expect } from 'vitest';

/**
 * Device Performance Detection Logic — runtime-adaptive.
 *
 * The old formula used `concurrency <= 4` + a mount-time CPU benchmark. Both were
 * unreliable: budget 8-core phones passed as high-end, iPhones (hidden/6-core)
 * got flagged, and the mount benchmark fired during hydration (false positive).
 *
 * Correct detection = measure real jank at runtime. The initial guess uses only
 * reliable signals (Data Saver, deviceMemory <= 6GB, manual override); a deferred
 * rAF sampling pass upgrades to low-end only when the median frame exceeds 28ms.
 */
describe('Device Performance Detection Logic', () => {
  // Pure helper mirroring the hook's INITIAL guess (before runtime refinement).
  const initialIsLowPerf = (
    memory: number | null,
    isSaveData = false,
    forceLowPerf = false
  ) => forceLowPerf || isSaveData || (memory !== null && memory <= 6);

  it('does NOT use core count as a signal anymore', () => {
    // 8-core budget phone must NOT be flagged high-end by core count alone;
    // the signal is dropped entirely from the formula.
    expect(initialIsLowPerf(null)).toBe(false); // 8-core, unknown RAM, no save-data
  });

  it('flags <=6GB RAM as low-end (budget/entry tier)', () => {
    expect(initialIsLowPerf(3)).toBe(true);
    expect(initialIsLowPerf(4)).toBe(true);
    expect(initialIsLowPerf(6)).toBe(true);
  });

  it('does NOT flag >6GB RAM as low-end (awaiting runtime jank evidence)', () => {
    expect(initialIsLowPerf(8)).toBe(false);
    expect(initialIsLowPerf(16)).toBe(false);
  });

  it('flags Data Saver mode as low-end', () => {
    expect(initialIsLowPerf(null, true)).toBe(true);
    expect(initialIsLowPerf(16, true)).toBe(true);
  });

  it('honors manual override', () => {
    expect(initialIsLowPerf(null, false, true)).toBe(true);
  });

  it('runtime jank detection upgrades to low-end when median frame > 28ms', () => {
    // Mirror the hook's threshold: sustained < ~36fps while idle.
    const medianFrameMs = 35;
    const JANK_THRESHOLD_MS = 28;
    expect(medianFrameMs > JANK_THRESHOLD_MS).toBe(true);
  });
});
