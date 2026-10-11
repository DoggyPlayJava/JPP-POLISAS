import { describe, it, expect } from 'vitest';

describe('Device Performance Detection Logic', () => {
  // Formula betul (selepas fix): HARDWARE sahaja. prefersReducedMotion DILEPASKAN.
  const calcIsLowPerf = (
    concurrency: number,
    memory: number | null,
    prefersReducedMotion: boolean,
    isThrottledCpu: boolean,
    isSaveData = false
  ) => isSaveData || concurrency <= 4 || (memory !== null && memory <= 4) || isThrottledCpu;

  it('identifies devices with <= 4 cores as low-performance', () => {
    expect(calcIsLowPerf(4, 8, false, false)).toBe(true);
  });

  it('identifies devices with <= 4GB RAM as low-performance', () => {
    expect(calcIsLowPerf(8, 3, false, false)).toBe(true);
  });

  it('does NOT label prefers-reduced-motion as low-performance (accessibility, not hardware)', () => {
    // Device KUAT (8 core, 16GB) dengan reduce-motion ON = masih high-end.
    // Animation boleh off (respect OS), tapi bukan "low-end device".
    expect(calcIsLowPerf(8, 16, true, false)).toBe(false);
  });

  it('identifies devices with throttled or slow CPU benchmark as low-performance mode', () => {
    expect(calcIsLowPerf(8, 16, false, true)).toBe(true);
  });

  it('identifies 8-core, 8GB+ unthrottled machines as high performance', () => {
    expect(calcIsLowPerf(8, 8, false, false)).toBe(false);
  });

  it('identifies Data Saver mode as low-performance', () => {
    expect(calcIsLowPerf(8, 16, false, false, true)).toBe(true);
  });
});
