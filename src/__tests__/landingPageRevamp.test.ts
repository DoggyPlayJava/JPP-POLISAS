import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

describe('Task: LandingPage Earthy Minimal Revamp (Next Term Theme)', () => {
  const landingPagePath = path.resolve(__dirname, '../pages/LandingPage.tsx');
  const source = fs.readFileSync(landingPagePath, 'utf-8');

  describe('Zero Raw Emojis & Anti-Slop Discipline', () => {
    it('contains 100% zero raw emojis across LandingPage.tsx', () => {
      const emojiMatches = source.match(EMOJI_REGEX) || [];
      expect(emojiMatches).toEqual([]);
    });

    it('completely removes obsolete maroon theme token #831010', () => {
      expect(source).not.toContain('#831010');
      expect(source).not.toContain("MAROON = '#831010'");
    });

    it('incorporates Earthy Minimal palette tokens from design spec', () => {
      // Primary Deep Moss Green
      expect(source).toContain('#2E3A2F');
      // Secondary Sage Green
      expect(source).toContain('#6B7F5B');
      // Tertiary Warm Sand
      expect(source).toContain('#D9C9B2');
      // Accent Terracotta Clay
      expect(source).toContain('#C96F4F');
      // Background Warm Alabaster
      expect(source).toContain('#F8F6EE');
    });

    it('strictly contains ZERO em-dashes (— or –) complying with design-taste-frontend Section 9.G', () => {
      expect(source).not.toContain('—');
      expect(source).not.toContain('–');
    });

    it('enforces eyebrow restraint (max 1 eyebrow per 3 sections, count <= 4)', () => {
      const eyebrowMatches = source.match(/uppercase tracking-\[[^\]]+\]/g) || [];
      expect(eyebrowMatches.length).toBeLessThanOrEqual(4);
    });

    it('respects low-tier device performance via useDevicePerformance hook', () => {
      expect(source).toContain('useDevicePerformance');
      expect(source).toMatch(/isLowPerf|isLowEnd/);
    });

    it('exports both named LandingPage and default export to ensure lazy loading compatibility', () => {
      expect(source).toContain('export const LandingPage');
      expect(source).toContain('export default LandingPage');
    });
  });

  describe('Core Structural Sections & Authentic Copywriting', () => {
    it('1. Floating Glassmorphic Pill Navbar (<Navbar />)', () => {
      expect(source).toContain('JPP POLISAS');
      expect(source).toContain('#ekosistem');
      expect(source).toContain('#modul');
      expect(source).toContain('#nexus');
      expect(source).toContain('#statistik');
      expect(source).toMatch(/Masuk Portal/);
    });

    it('2. Editorial Asymmetric Hero (<Hero />) with Official Headline', () => {
      // Official user-approved headline
      expect(source).toContain('Perpaduan Progresif');
      expect(source).toContain('Demi Mahasiswa');
      // Subtext
      expect(source).toContain('Platform digital rasmi');
      // CTAs
      expect(source).toContain('Masuk Portal Pelajar');
      expect(source).toContain('Jelajah Ekosistem');

      // Executive Showcase Card
      expect(source).toContain('Pusat Operasi Eksekutif');
      expect(source).toContain('120+');
      expect(source).toContain('Kelab Berdaftar');
      expect(source).toContain('98.4%');
      expect(source).toContain('Kelulusan Kertas');
    });

    it('3. Campus Pulse Ticker Tape (<TickerTape />)', () => {
      expect(source).toContain('e-Akademik: Pengesahan Merit QR');
      expect(source).toContain('e-Aktiviti: 120+ Kelab');
      expect(source).toContain('PolyMart: Pasaran Siswa');
      expect(source).toContain('e-Kebajikan: Tindakan Pantas');
    });

    it('4. Bento Feature Grid for 5 Campus Ecosystems (<BentoSection />)', () => {
      expect(source).toContain('e-Aktiviti');
      expect(source).toContain('e-Keusahawanan');
      expect(source).toContain('e-Akademik');
      expect(source).toContain('PolyMart');
      expect(source).toContain('e-Kebajikan');
    });

    it('5. Nexus AI Core Engine (<NexusSection />)', () => {
      expect(source).toContain('Kepintaran Nexus');
      expect(source).toContain('A.I Core Engine');
    });

    it('6. Campus Scale & Impact Metrics (<StatsSection />)', () => {
      expect(source).toContain('120+');
      expect(source).toContain('15,000+');
      expect(source).toContain('98%');
    });

    it('7. Final Call-to-Action Banner (<CtaSection />)', () => {
      expect(source).toContain('Gerakan Mahasiswa Bermula Di Sini');
    });

    it('8. Editorial Footer (<Footer />)', () => {
      expect(source).toContain('JPP POLISAS');
      expect(source).toContain('Hak Cipta Terpelihara');
    });
  });

  describe('Routing Contracts', () => {
    it('defines valid routes to core portal modules', () => {
      expect(source).toContain("'/portal'");
      expect(source).toContain("'/polymart'");
      expect(source).toContain("'/akademik'");
      expect(source).toContain("'/kebajikan'");
      expect(source).toContain("'/keusahawanan'");
    });
  });
});
