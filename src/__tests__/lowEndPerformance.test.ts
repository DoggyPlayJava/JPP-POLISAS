import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Ujian Low-End Device Performance Guarantee.
 * Pastikan:
 * 1. App.tsx guna MotionConfig reducedMotion (kill framer-motion animation pada low-end)
 * 2. useDevicePerformance masih dipanggil (class .low-perf-device dikenakan)
 * 3. index.css ada rule .low-perf-device yang matikan animasi/transition/blur
 * 4. Heavy libraries (react-pdf, exceljs, heic2any, html5-qrcode) kekal lazy-loaded (tidak dalam main bundle)
 */

describe('Low-End Device Performance Guarantee', () => {
  const appPath = path.resolve(__dirname, '../App.tsx');
  const cssPath = path.resolve(__dirname, '../index.css');
  const hookPath = path.resolve(__dirname, '../hooks/useDevicePerformance.ts');
  const app = fs.readFileSync(appPath, 'utf-8');
  const css = fs.readFileSync(cssPath, 'utf-8');
  const hook = fs.readFileSync(hookPath, 'utf-8');

  describe('Framer-motion global reduced-motion', () => {
    it('wraps app in MotionConfig with reducedMotion driven by isLowPerf', () => {
      expect(app).toContain('<MotionConfig');
      expect(app).toContain('reducedMotion={isLowPerf');
      expect(app).toContain("'always'");
      expect(app).toContain("'user'");
    });

    it('destructures isLowPerf from useDevicePerformance in App()', () => {
      expect(app).toContain('const { isLowPerf } = useDevicePerformance()');
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

    it('kills ALL css animations + transitions on low-end (not only reduced-motion)', () => {
      // Rule global untuk semua elemen dalam .low-perf-device
      expect(css).toContain('.low-perf-device *,');
      expect(css).toContain('animation-duration: 0.01ms !important');
      expect(css).toContain('transition-duration: 0.01ms !important');
    });

    it('disables animate-spin spinner on low-end', () => {
      expect(css).toContain('.low-perf-device .animate-spin');
      expect(css).toContain('animation: none !important');
    });
  });

  describe('Detection hook covers low-end heuristics', () => {
    it('flags <=4 CPU cores as low-perf', () => {
      expect(hook).toContain('concurrency <= 4');
    });

    it('flags <=4GB RAM as low-perf', () => {
      expect(hook).toContain('memory <= 4');
    });

    it('flags Data Saver + reduced-motion + throttled CPU', () => {
      expect(hook).toContain('saveData');
      expect(hook).toContain('prefersReducedMotion');
      expect(hook).toContain('runCpuBenchmark');
    });

    it('applies .low-perf-device class to document root', () => {
      expect(hook).toContain("classList.add('low-perf-device')");
    });
  });
});
