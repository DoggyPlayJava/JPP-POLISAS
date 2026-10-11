import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Ujian Low-End Device Performance Guarantee.
 * Pastikan:
 * 1. App.tsx guna MotionConfig reducedMotion="user" (respect OS, BUKAN hardware)
 * 2. useDevicePerformance masih dipanggil (class .low-perf-device dikenakan)
 * 3. index.css ada rule .low-perf-device yang matikan blur + mix-blend (BUKAN transition)
 * 4. Detection adalah RUNTIME-ADAPTIVE (ukur jank sebenar), bukan teka hardware.
 *    - core count TIDAK lagi jadi signal (budget Android 8-core adalah bukti ia tak bermakna)
 *    - mount-time benchmark dibuang (noisy semasa hydration)
 */

describe('Low-End Device Performance Guarantee', () => {
  const appPath = path.resolve(__dirname, '../App.tsx');
  const cssPath = path.resolve(__dirname, '../index.css');
  const hookPath = path.resolve(__dirname, '../hooks/useDevicePerformance.ts');
  const app = fs.readFileSync(appPath, 'utf-8');
  const css = fs.readFileSync(cssPath, 'utf-8');
  const hook = fs.readFileSync(hookPath, 'utf-8');

  describe('Framer-motion respects OS motion preference (not hardware)', () => {
    it('wraps app in MotionConfig with reducedMotion="user"', () => {
      expect(app).toContain('<MotionConfig');
      expect(app).toContain('reducedMotion="user"');
    });

    it('does NOT force reducedMotion="always" based on isLowPerf', () => {
      expect(app).not.toContain("reducedMotion={isLowPerf");
    });
  });

  describe('CSS low-perf-device tiering', () => {
    it('kills backdrop-blur on low-end', () => {
      expect(css).toContain('.low-perf-device .backdrop-blur-xl');
      expect(css).toContain('backdrop-filter: none !important');
    });

    it('neutralizes mix-blend-mode', () => {
      expect(css).toContain('.low-perf-device [class*="mix-blend-"]');
      expect(css).toContain('mix-blend-mode: normal !important');
    });

    it('does NOT kill transitions globally (that caused FAB flicker)', () => {
      const lowPerfGlobalTransitionKill = /\\.low-perf-device \\*[^{]*\\{[^}]*transition-duration/g;
      expect(lowPerfGlobalTransitionKill.test(css)).toBe(false);
    });
  });

  describe('Detection hook: runtime-adaptive (NOT hardware guessing)', () => {
    it('does NOT use core count as a low-end signal (budget phones ship 8 cores)', () => {
      // The old "concurrency <= 4" heuristic is removed.
      expect(hook).not.toContain('concurrency <= 4');
    });

    it('iOS fallback for hardwareConcurrency is 8 (undefined = unknown, not weak)', () => {
      expect(hook).toContain('hardwareConcurrency');
      expect(hook).toContain(': 8');
    });

    it('measures real jank via requestAnimationFrame frame deltas', () => {
      expect(hook).toContain('requestAnimationFrame');
      expect(hook).toContain('median');
    });

    it('keeps Data Saver as a low-end signal', () => {
      expect(hook).toContain('saveData');
    });

    it('keeps deviceMemory <= 4 as a low-end signal', () => {
      expect(hook).toContain('memory <= 4');
    });

    it('does NOT include prefersReducedMotion in isLowPerf formula', () => {
      const match = hook.match(/const isLowPerf = [^;]+;/);
      expect(match).toBeTruthy();
      expect(match![0]).not.toContain('prefersReducedMotion');
    });

    it('applies .low-perf-device class to document root', () => {
      expect(hook).toContain("classList.add('low-perf-device')");
    });
  });
});
