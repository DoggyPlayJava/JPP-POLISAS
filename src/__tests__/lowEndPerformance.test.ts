import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Ujian Low-End Device Performance Guarantee.
 * Pastikan:
 * 1. App.tsx guna MotionConfig reducedMotion="user" (respect OS, BUKAN hardware)
 * 2. useDevicePerformance masih dipanggil (class .low-perf-device dikenakan)
 * 3. index.css ada rule .low-perf-device yang matikan blur + mix-blend (BUKAN transition)
 * 4. BLANKET low-perf: semua device dilayan low-perf, tiada detection runtime.
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
      const lowPerfGlobalTransitionKill = /\\\\.low-perf-device \\\\*[^{]*\\\\{[^}]*transition-duration/g;
      expect(lowPerfGlobalTransitionKill.test(css)).toBe(false);
    });
  });

  describe('Detection hook: BLANKET low-perf (no runtime detection)', () => {
    it('always returns isLowPerf: true', () => {
      expect(hook).toContain('isLowPerf: true');
    });

    it('has no hardware heuristic', () => {
      expect(hook).not.toContain("navigator.deviceMemory");
      expect(hook).not.toContain("navigator.hardwareConcurrency");
    });

    it('has no runtime jank sampling (zero rAF overhead)', () => {
      expect(hook).not.toContain('requestAnimationFrame');
    });

    it('does NOT include prefersReducedMotion in isLowPerf formula', () => {
      expect(hook).not.toContain('prefersReducedMotion &&');
    });

    it('applies .low-perf-device class to document root', () => {
      expect(hook).toContain("low-perf-device");
    });
  });
});
