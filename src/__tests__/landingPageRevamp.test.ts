import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

describe('Task 3: LandingPage Flagship Revamp', () => {
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
  });

  describe('10 Core Structural Sections', () => {
    it('1. Floating Glassmorphic Pill Navbar (<Navbar />)', () => {
      expect(source).toContain('PORTAL RASMI');
      expect(source).toContain('JPP POLISAS');
      expect(source).toContain('#ekosistem');
      expect(source).toContain('#keupayaan');
      expect(source).toContain('#faq');
      expect(source).toMatch(/Masuk Portal/);
    });

    it('2. Asymmetric Hero Section (<Hero />) with Perspective Floating SuperApp Deck & Live Ticker', () => {
      // Eyebrow badge
      expect(source).toContain('JPP POLISAS · Sistem Kampus Pintar');
      // H1 Heading
      expect(source).toContain('Masa Depan Kampus Digital Bermula Di Sini');
      // Subtext
      expect(source).toContain('Ekosistem digital berpusat mahasiswa POLISAS: tadbir urus aktiviti, pasaran siswa dan navigasi pintar.');
      // CTA buttons
      expect(source).toContain('Masuk Portal Pelajar');
      expect(source).toContain('Terokai Ekosistem');

      // Perspective Floating SuperApp Deck cards
      expect(source).toContain('Portal Cockpit');
      expect(source).toContain('PolyMart Hub');
      expect(source).toContain('PolyMaps 360');

      // Metrics Ticker Ribbon
      expect(source).toContain('15,000+');
      expect(source).toContain('Mahasiswa');
      expect(source).toContain('120+');
      expect(source).toContain('Kelab Aktif');
      expect(source).toContain('12');
      expect(source).toContain('Modul Bersepadu');
      expect(source).toContain('100%');
      expect(source).toContain('Digital & Telus');
    });

    it('3. Interactive Showcase Tabs (<InteractiveShowcase />)', () => {
      expect(source).toContain('Semua');
      expect(source).toContain('Kebajikan');
      expect(source).toContain('PolyMart');
      expect(source).toContain('Akademik');
      expect(source).toContain('Sukan & EMS');
    });

    it('4. Platform Capabilities Bento Grid (<PlatformCapabilitiesBento />)', () => {
      expect(source).toContain('Tadbir Urus Kelab (e-Aktiviti)');
      expect(source).toContain('Automasi kertas kerja dan pelaporan digital kelab.');
      expect(source).toContain('Pasaran Siswa (PolyMart)');
      expect(source).toContain('Ekosistem jual beli barangan dan servis pelajar dengan JPP Pay.');
      expect(source).toContain('Bantuan Kebajikan (e-Kebajikan & FoodBank)');
      expect(source).toContain('Permohonan bantuan kecemasan dan kupon makanan digital.');
      expect(source).toContain('Kampus Pintar & Peta (PolyMaps 360');
      expect(source).toContain('Navigasi pejalan kaki berbumbung dan lawatan 360');
    });

    it('5. Nexus AI Spotlight (<NexusAiSpotlight />)', () => {
      expect(source).toContain('AI Semakan Kertas Kerja');
      expect(source).toContain('Pembantu Pelajar Pintar');
    });

    it('6. Interactive Quick Search Bar (<InteractiveSearchBar />)', () => {
      expect(source).toContain('Cari kod kursus, dewan, makmal, atau kelab (Cth: DSK, Dewan Sri Mahkota)...');
    });

    it('7. Curated Campus Gallery (<CuratedCampusGallery />)', () => {
      expect(source).toContain('Galeri Ekosistem');
    });

    it('8. Hairline FAQ Accordion (<FaqAccordion />)', () => {
      expect(source).toContain('Siapa yang layak mengakses Portal JPP POLISAS?');
      expect(source).toContain('Bagaimana kelab menghantar kertas kerja aktiviti?');
      expect(source).toContain('Adakah PolyMart dibuka untuk semua pelajar berniaga?');
      expect(source).toContain('Bagaimana merit akademik dan merit aktiviti dikira?');
    });

    it('9. Particle Halo / Sphere Final CTA (<FinalSphereCta />)', () => {
      expect(source).toContain('Sedia Untuk Mula? Sertai ribuan mahasiswa POLISAS hari ini.');
    });

    it('10. Editorial Clean Footer (<EditorialFooter />)', () => {
      expect(source).toContain('Servis Pelajar');
      expect(source).toContain('Pautan Rasmi');
      expect(source).toContain('Bantuan & Hubungi');
    });
  });

  describe('Routing Contracts', () => {
    it('defines valid routes to core portal modules', () => {
      expect(source).toContain("'/portal'");
      expect(source).toContain("'/polymart'");
      expect(source).toContain("'/polymaps'");
      expect(source).toContain("'/akademik'");
    });
  });
});
