import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

describe('Task 3: LandingPage Flagship SuperApp Revamp', () => {
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

    it('incorporates Dual-Tone Forest & Sage palette tokens', () => {
      // Pine Forest Canvas
      expect(source).toContain('#08140E');
      // Obsidian Forest Surface
      expect(source).toContain('#0E2218');
      // Muted Sage Green
      expect(source).toContain('#84A98C');
      // Deep Evergreen
      expect(source).toContain('#2D6A4F');
      // Mint Highlight
      expect(source).toContain('#74C69D');
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

  describe('8 Core Structural SuperApp Sections (SkyGoo SuperApp Inspired)', () => {
    it('1. Floating Glassmorphic Pill Navbar (<Navbar />)', () => {
      expect(source).toContain('PORTAL RASMI');
      expect(source).toContain('JPP POLISAS');
      expect(source).toContain('#ekosistem');
      expect(source).toContain('#modul');
      expect(source).toContain('#statistik');
      expect(source).toContain('#faq');
      expect(source).toMatch(/Masuk Portal/);
    });

    it('2. Handheld SuperApp Hero (<Hero />) with Central Phone Mockup & Peripheral Floating Cards', () => {
      // Eyebrow badge
      expect(source).toContain('POLISAS SuperApp 2026/2027');
      // H1 Heading
      expect(source).toContain('Menghubungkan Setiap Detik Kehidupan Kampus.');
      // Subtext
      expect(source).toContain('Akses e-Akademik, aktiviti kelab, pasaran PolyMart, dan navigasi pintar dalam satu sentuhan mudah alih.');
      // CTA buttons
      expect(source).toContain('Masuk Portal Pelajar');
      expect(source).toContain('Terokai Ekosistem');

      // Phone screen micro-grid
      expect(source).toContain('e-Akademik');
      expect(source).toContain('PolyMart');
      expect(source).toContain('PolyMaps');
      expect(source).toContain('FoodBank');
      expect(source).toContain('Kelab EKPP');
      expect(source).toContain('SUPSAS');

      // Peripheral floating cards
      expect(source).toContain('Portal Cockpit');
      expect(source).toContain('PolyMart Hub');
      expect(source).toContain('Kupon FoodBank');
    });

    it('3. Micro-App Showcase Triad (<MicroAppTriad />)', () => {
      expect(source).toContain('Rancang Perjalanan Harian Kampus Anda');
      expect(source).toContain('PolyMaps 360');
      expect(source).toContain('Navigasi Kampus & Peta Teduh');
      expect(source).toContain('e-Akademik & Takwim');
      expect(source).toContain('Jadual Sesi & Unjuran Merit');
      expect(source).toContain('PolyRent & KAMSIS');
      expect(source).toContain('Penempatan & Rumah Sewa');
    });

    it('4. 2x2 Bento Feature Grid (<CommerceBentoGrid />)', () => {
      expect(source).toContain('Pesanan Pantas. Penjejakan Masa Nyata.');
      expect(source).toContain('Katalog Produk PolyMart');
      expect(source).toContain('JPP Pay & Resit Digital');
      expect(source).toContain('Kupon FoodBank Siswa');
      expect(source).toContain('Pesanan Pantas Mudah Alih');
    });

    it('5. Lifestyle Photo Split + FAQ Accordion (<FaqSplitSection />)', () => {
      expect(source).toContain('Kehidupan Kampus POLISAS');
      expect(source).toContain('Soalan Lazim');
      expect(source).toContain('Siapa yang layak mengakses Portal JPP POLISAS?');
      expect(source).toContain('Bagaimana kelab menghantar kertas kerja aktiviti?');
      expect(source).toContain('Adakah PolyMart dibuka untuk semua pelajar berniaga?');
      expect(source).toContain('Bagaimana merit akademik dan merit aktiviti dikira?');
    });

    it('6. Campus Scale & 3D Globe Metric (<CampusGlobeScale />)', () => {
      expect(source).toContain('Satu Kampus. Dihubungkan Sepenuhnya.');
      expect(source).toContain('15,000+');
      expect(source).toContain('Mahasiswa');
      expect(source).toContain('120+');
      expect(source).toContain('Kelab Aktif');
      expect(source).toContain('12');
      expect(source).toContain('Modul Bersepadu');
      expect(source).toContain('100%');
      expect(source).toContain('Digital & Telus');
    });

    it('7. Student Community Voice (<StudentCommunityVoice />)', () => {
      expect(source).toContain('Suara Mahasiswa POLISAS');
      expect(source).toContain('Nur Aisyah');
      expect(source).toContain('Muhammad Farhan');
      expect(source).toContain('Sarah Tan');
      expect(source).toContain('Hafizuddin');
      expect(source).toContain('Politeknik KPT');
      expect(source).toContain('Majlis Perwakilan Pelajar');
      expect(source).toContain('Hal Ehwal Pelajar');
    });

    it('8. Final Perspective Handheld CTA & Grand Watermark Footer (<FinalHandheldCtaAndFooter />)', () => {
      expect(source).toContain('Bersedia Memulakan Pengalaman Kampus Pintar Anda?');
      expect(source).toContain('Sertai ribuan penuntut POLISAS hari ini dalam ekosistem digital yang serba lengkap dan pantas.');
      expect(source).toContain('Servis Pelajar');
      expect(source).toContain('Pautan Rasmi');
      expect(source).toContain('Bantuan & Hubungi');
      // Giant Watermark
      expect(source).toContain('POLISAS');
    });
  });

  describe('Routing Contracts', () => {
    it('defines valid routes to core portal modules', () => {
      expect(source).toContain("'/portal'");
      expect(source).toContain("'/polymart'");
      expect(source).toContain("'/polymaps'");
      expect(source).toContain("'/akademik'");
      expect(source).toContain("'/kebajikan'");
    });
  });
});
