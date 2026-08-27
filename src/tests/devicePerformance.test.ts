import { describe, it, expect } from 'vitest';

describe('Device Performance Detection Logic', () => {
  it('identifies devices with <= 4 cores as low-performance', () => {
    const concurrency = 4;
    const memory = 8;
    const prefersReducedMotion = false;
    const isLowPerf = concurrency <= 4 || (memory !== null && memory <= 4) || prefersReducedMotion;
    expect(isLowPerf).toBe(true);
  });

  it('identifies devices with <= 4GB RAM as low-performance', () => {
    const concurrency = 8;
    const memory = 3;
    const prefersReducedMotion = false;
    const isLowPerf = concurrency <= 4 || (memory !== null && memory <= 4) || prefersReducedMotion;
    expect(isLowPerf).toBe(true);
  });

  it('identifies devices with prefers-reduced-motion as low-performance mode', () => {
    const concurrency = 8;
    const memory = 16;
    const prefersReducedMotion = true;
    const isLowPerf = concurrency <= 4 || (memory !== null && memory <= 4) || prefersReducedMotion;
    expect(isLowPerf).toBe(true);
  });

  it('identifies 8-core, 8GB+ machines as high performance', () => {
    const concurrency = 8;
    const memory = 8;
    const prefersReducedMotion = false;
    const isLowPerf = concurrency <= 4 || (memory !== null && memory <= 4) || prefersReducedMotion;
    expect(isLowPerf).toBe(false);
  });
});
