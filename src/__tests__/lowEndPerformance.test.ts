import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Ujian Low-End Device Performance Guarantee.
 * Pastikan:
 * 1. App.tsx guna MotionConfig reducedMotion="user" (respect OS, BUKAN hardware)
 * 2. useDevicePerformance masih dipanggil (class .low-perf-device dikenakan)
 * 3. index.css ada rule .low-perf-device yang matikan blur + mix-blend (BUKAN transition)
 * 4. prefersReducedMotion TIDAK dilabel low-end (hardware sahaja)
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
      // Rule global .low-perf-device * { transition-duration: 0.01ms } MESTI TIDAK WUJUD.
      // Ia membunuh transition-all pada FAB → flicker. Hanya reduced-motion media query
      // (pilihan pengguna) yang patut matikan transition.
      const lowPerfGlobalTransitionKill = /\.low-perf-device \*[^{]*\{[^}]*transition-duration/g;
      expect(lowPerfGlobalTransitionKill.test(css)).toBe(false);
    });
  });

  describe('Detection hook: hardware only (prefersReducedMotion NOT low-perf)', () => {
    it('flags <=4 CPU cores as low-perf', () => {
      expect(hook).toContain('concurrency <= 4');
      // iOS fallback must be 8, NOT 4 — undefined hardwareConcurrency means
      // "unknown", not "weak"; 4 disabled PolyMaps drag on iPhone.
      expect(hook).toContain('hardwareConcurrency ? navigator.hardwareConcurrency : 8');
    });

    it('flags <=4GB RAM as low-perf', () => {
      expect(hook).toContain('memory <= 4');
    });

    it('flags Data Saver + throttled CPU', () => {
      expect(hook).toContain('saveData');
      expect(hook).toContain('runCpuBenchmark');
    });

    it('does NOT include prefersReducedMotion in isLowPerf formula', () => {
      // Extract isLowPerf line and verify prefersReducedMotion is not OR'd in
      const match = hook.match(/const isLowPerf = [^;]+;/);
      expect(match).toBeTruthy();
      expect(match![0]).not.toContain('prefersReducedMotion');
    });

    it('applies .low-perf-device class to document root', () => {
      expect(hook).toContain("classList.add('low-perf-device')");
    });
  });
});
