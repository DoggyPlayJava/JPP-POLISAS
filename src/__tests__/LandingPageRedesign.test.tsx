import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SpotlightCard } from '@/components/landing/SpotlightCard';
import type { CampusStats, DayPhase } from '@/components/landing/landingTypes';

// Filter motion props so React 19 does not warn about unrecognized DOM attributes
const filterMotionProps = ({
  initial,
  animate,
  exit,
  whileHover,
  whileTap,
  whileInView,
  viewport,
  transition,
  variants,
  ...domProps
}: any) => domProps;

// Mock framer-motion for SSR/node test environment
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      React.createElement('div', { className, style, ...filterMotionProps(props) }, children)
    ),
    img: ({ children, className, ...props }: any) => (
      React.createElement('img', { className, ...filterMotionProps(props) }, children)
    ),
    nav: ({ children, className, ...props }: any) => (
      React.createElement('nav', { className, ...filterMotionProps(props) }, children)
    ),
    h1: ({ children, className, ...props }: any) => (
      React.createElement('h1', { className, ...filterMotionProps(props) }, children)
    ),
    h2: ({ children, className, ...props }: any) => (
      React.createElement('h2', { className, ...filterMotionProps(props) }, children)
    ),
    p: ({ children, className, ...props }: any) => (
      React.createElement('p', { className, ...filterMotionProps(props) }, children)
    ),
    button: ({ children, className, ...props }: any) => (
      React.createElement('button', { className, ...filterMotionProps(props) }, children)
    ),
    span: ({ children, className, ...props }: any) => (
      React.createElement('span', { className, ...filterMotionProps(props) }, children)
    ),
  },
  AnimatePresence: ({ children }: any) => children,
  useMotionValue: () => ({ set: vi.fn(), get: () => 0 }),
  useMotionTemplate: () => '',
}));

describe('Task 1: Landing Page Scaffolding and Types', () => {
  it('correctly models CampusStats and DayPhase types', () => {
    const stats: CampusStats = {
      clubsCount: 21,
      activitiesCount: 41,
      studentsCount: 1083,
      productsCount: 277,
      ordersCount: 344,
    };
    expect(stats.clubsCount).toBe(21);
    expect(stats.studentsCount).toBe(1083);

    const phase: DayPhase = {
      id: 'morning',
      time: '08:00 Pagi',
      title: 'Jadual & Navigasi',
      subtitle: 'Kecemerlangan Akademik',
      description: 'Navigasi kelas lancar',
      badge: 'Akademik',
      image: '/GAMBAR/Integrated Jadual Akademik View (showcase maklumat tepat and masa and tempat and even integrated with polymaps).png',
      imageAlt: 'Jadual Kuliah & Peta Dewan',
      deviceType: 'laptop',
      highlights: ['Waktu & Bilik Kuliah Tepat', 'Navigasi PolyMaps'],
      tagColor: '#6B7F5B',
    };
    expect(phase.deviceType).toBe('laptop');
    expect(phase.image).toContain('Integrated Jadual Akademik View');
  });

  it('renders SpotlightCard with content and classes', () => {
    const html = renderToString(
      <SpotlightCard className="custom-spotlight-class">
        <span data-testid="card-content">Spotlight Glow Content</span>
      </SpotlightCard>
    );

    expect(html).toContain('custom-spotlight-class');
    expect(html).toContain('Spotlight Glow Content');
    expect(html).toContain('rounded-[2.5rem]');
  });
});

describe('Task 2: Floating Pill Navbar Component', () => {
  it('renders LandingNavbar with logo, branding, status indicator, and navigation links', async () => {
    const { LandingNavbar } = await import('@/components/landing/LandingNavbar');
    const { MemoryRouter } = await import('react-router-dom');

    const html = renderToString(
      <MemoryRouter>
        <LandingNavbar />
      </MemoryRouter>
    );

    expect(html).toContain('JPP POLISAS');
    expect(html).toContain('Ekosistem');
    expect(html).toContain('Hari Kampus');
    expect(html).toContain('Modul Utama');
    expect(html).toContain('Nexus AI');
    expect(html).toContain('Statistik');
    expect(html).toContain('Terokai Portal');
  });
});

describe('Task 3: Dual-Perspective Hero Showcase Component', () => {
  it('renders LandingHero with mockups, live stat badges, and CTAs', async () => {
    const { LandingHero } = await import('@/components/landing/LandingHero');
    const { MemoryRouter } = await import('react-router-dom');

    const stats: CampusStats = {
      clubsCount: 21,
      activitiesCount: 41,
      studentsCount: 1083,
      productsCount: 277,
      ordersCount: 344,
    };

    const html = renderToString(
      <MemoryRouter>
        <LandingHero stats={stats} />
      </MemoryRouter>
    );

    // Mockup images
    expect(html).toContain('/GAMBAR/Portal View Laptop.png');
    expect(html).toContain('/GAMBAR/Polymart View Phone.png');

    // Live stat badges
    expect(html).toContain('Pesanan Selesai');
    expect(html).toContain('21 Kelab Berdaftar');
    expect(html).toContain('1,083+ Rekod Siswa');

    // Audience pills & CTA
    expect(html).toContain('Mahasiswa POLISAS');
    expect(html).toContain('Jelajah Hari Kampus');
  });
});

describe('Task 4: Campus Pulse Ticker & Statistics Components', () => {
  const stats: CampusStats = {
    clubsCount: 21,
    activitiesCount: 41,
    studentsCount: 1083,
    productsCount: 277,
    ordersCount: 344,
  };

  it('renders LandingTicker with infinite marquee elements and live campus telemetry', async () => {
    const { LandingTicker } = await import('@/components/landing/LandingTicker');
    const html = renderToString(<LandingTicker stats={stats} />);

    expect(html).toContain('Nexus AI');
    expect(html).toContain('e-Keusahawanan');
    expect(html).toContain('e-Akademik');
    expect(html).toContain('e-Aktiviti');
    expect(html).toContain('PolyMart');
    expect(html).toContain('e-Kebajikan');
  });

  it('renders LandingStats with 4 key metrics and tabular typography', async () => {
    const { LandingStats } = await import('@/components/landing/LandingStats');
    const html = renderToString(<LandingStats stats={stats} />);

    expect(html).toContain('font-mono');
    expect(html).toContain('tabular-nums');
    expect(html).toContain('21');
    expect(html).toContain('1,083+');
    expect(html).toContain('41');
    expect(html).toContain('277+');
    expect(html).toContain('Angka Sebenar Menggerakkan POLISAS');
  });
});

describe('Task 5: "Student Campus Day" Interactive Timeline Switcher', () => {
  it('renders CampusDayTimeline with 4 time phases and authentic preview images', async () => {
    const { CampusDayTimeline, CAMPUS_DAY_PHASES } = await import('@/components/landing/CampusDayTimeline');
    const html = renderToString(<CampusDayTimeline />);

    expect(html).toContain('Sehari Bersama Ekosistem POLISAS');
    expect(html).toContain('08:00 Pagi');
    expect(html).toContain('12:30 Tgh Hari');
    expect(html).toContain('17:00 Petang');
    expect(html).toContain('21:00 Malam');

    // Default morning phase displays BOTH primary and secondary screenshots
    expect(html).toContain('Automated E-akademik integration view');
    expect(html).toContain('/GAMBAR/Polymap View Phone.png');
    expect(html).toContain('Navigasi PolyMaps');
    expect(html).toContain('Paparan Utama');
    expect(html).toContain('1,080+');
    expect(html).toContain('Jadual Siswa Aktif');

    // All 4 phases have authentic secondary screenshots defined
    expect(CAMPUS_DAY_PHASES.length).toBe(4);
    expect(CAMPUS_DAY_PHASES[0].secondaryImage).toContain('Polymap View Phone.png');
    expect(CAMPUS_DAY_PHASES[1].deviceType).toBe('phone');
    expect(CAMPUS_DAY_PHASES[1].image).toContain('Inside Polymart View Phone.png');
    expect(CAMPUS_DAY_PHASES[1].secondaryImage).toContain('Polymart View Phone.png');
    expect(CAMPUS_DAY_PHASES[2].secondaryImage).toContain('Event Management System (EMS) Preview.png');
    expect(CAMPUS_DAY_PHASES[3].secondaryImage).toContain('Foodbank Admin Preview.png');
  });
});

describe('Task 6: Elevated Bento Ecosystem & Nexus AI Spotlight Components', () => {
  const stats: CampusStats = {
    clubsCount: 21,
    activitiesCount: 41,
    studentsCount: 1083,
    productsCount: 277,
    ordersCount: 344,
  };

  it('renders LandingBento with 5 pillars, spotlight cards, and real sample products', async () => {
    const { LandingBento } = await import('@/components/landing/LandingBento');
    const { MemoryRouter } = await import('react-router-dom');

    const html = renderToString(
      <MemoryRouter>
        <LandingBento stats={stats} />
      </MemoryRouter>
    );

    // 5 pillars
    expect(html).toContain('e-Aktiviti');
    expect(html).toContain('e-Keusahawanan');
    expect(html).toContain('e-Akademik');
    expect(html).toContain('PolyMart');
    expect(html).toContain('e-Kebajikan');

    // Metrics correctly formatted
    expect(html).toContain('100%');
    expect(html).toContain('24/7');

    // Sample products in PolyMart
    expect(html).toContain('CHICKEN POPCORN');
    expect(html).toContain('loaded fries original');
    expect(html).toContain('Lanyard JPP POLISAS');
  });

  it('renders LandingNexusAI with paperwork audit simulation and score badge', async () => {
    const { LandingNexusAI } = await import('@/components/landing/LandingNexusAI');
    const html = renderToString(<LandingNexusAI />);

    expect(html).toContain('Kepintaran Nexus');
    expect(html).toContain('Audit Kertas Kerja Automatik');
    expect(html).toContain('Pematuhan Format HEP');
    expect(html).toContain('96');
    expect(html).toContain('/100');
    expect(html).toContain('Analisis Minit');
    expect(html).toContain('Penjanaan');
  });
});

describe('Task 7: Master LandingPage Orchestration & Backward-Compatibility', () => {
  it('renders LandingCta with conversion triggers and security badges', async () => {
    const { LandingCta } = await import('@/components/landing/LandingCta');
    const { MemoryRouter } = await import('react-router-dom');

    const html = renderToString(
      <MemoryRouter>
        <LandingCta />
      </MemoryRouter>
    );

    expect(html).toContain('Log Masuk Pelajar');
    expect(html).toContain('Akaun Rasmi Siswa POLISAS');
    expect(html).toContain('Penyulitan Supabase RLS Selamat');
  });

  it('renders LandingFooter with official branding, copyright, and section links', async () => {
    const { LandingFooter } = await import('@/components/landing/LandingFooter');
    const html = renderToString(<LandingFooter />);

    expect(html).toContain('JPP POLISAS');
    expect(html).toContain('Hak Cipta Terpelihara');
    expect(html).toContain('Ekosistem');
    expect(html).toContain('Hari Kampus');
    expect(html).toContain('Modul');
    expect(html).toContain('Nexus AI');
    expect(html).toContain('Statistik');
  });

  it('renders master LandingPage with all redesigned sections, dual mockups, and backward compatibility', async () => {
    const { default: MasterLandingPage, Navbar, Hero, BentoSection, StatsSection, Footer } =
      await import('@/pages/LandingPage');
    const { MemoryRouter } = await import('react-router-dom');

    const html = renderToString(
      <MemoryRouter>
        <MasterLandingPage />
      </MemoryRouter>
    );

    // Navbar
    expect(html).toContain('JPP POLISAS');

    // Hero with dual mockups
    expect(html).toContain('/GAMBAR/Portal View Laptop.png');
    expect(html).toContain('/GAMBAR/Polymart View Phone.png');

    // Campus day timeline with both primary and secondary screenshots rendered
    expect(html).toContain('Sehari Bersama Ekosistem POLISAS');
    expect(html).toContain('Automated E-akademik integration view');
    expect(html).toContain('/GAMBAR/Polymap View Phone.png');

    // Bento 5 modules
    expect(html).toContain('e-Aktiviti');
    expect(html).toContain('PolyMart');

    // Nexus AI
    expect(html).toContain('Kepintaran Nexus');

    // Stats
    expect(html).toContain('Angka Sebenar Menggerakkan POLISAS');

    // CTA & Footer
    expect(html).toContain('Log Masuk Pelajar');
    expect(html).toContain('Hak Cipta Terpelihara');

    // Backward-compatible named exports exist
    expect(typeof Navbar).toBe('function');
    expect(typeof Hero).toBe('function');
    expect(typeof BentoSection).toBe('function');
    expect(typeof StatsSection).toBe('function');
    expect(typeof Footer).toBe('function');
  });
});

describe('Task 8: Mobile Header Slimness, Academic Badges & Bilingual Support', () => {
  it('renders slim mobile navbar without capsule AI slop and includes LanguageToggle', async () => {
    const { LandingNavbar } = await import('@/components/landing/LandingNavbar');
    const { MemoryRouter } = await import('react-router-dom');

    const html = renderToString(
      <MemoryRouter>
        <LandingNavbar />
      </MemoryRouter>
    );

    // AI slop capsule removed
    expect(html).not.toContain('Sistem Aktif');

    // Language toggle present
    expect(html).toMatch(/BM|EN/);

    // Primary CTA is hidden on mobile screens
    expect(html).toContain('hidden md:flex');
  });

  it('renders all 5 POLISAS academic departments and lively floating chips in LandingHero', async () => {
    const { LandingHero } = await import('@/components/landing/LandingHero');
    const { MemoryRouter } = await import('react-router-dom');

    const stats: CampusStats = {
      clubsCount: 21,
      activitiesCount: 41,
      studentsCount: 1083,
      productsCount: 277,
      ordersCount: 344,
    };

    const html = renderToString(
      <MemoryRouter>
        <LandingHero stats={stats} />
      </MemoryRouter>
    );

    // 5 POLISAS academic departments
    expect(html).toContain('JKA');
    expect(html).toContain('JKM');
    expect(html).toContain('JKE');
    expect(html).toContain('JP');
    expect(html).toContain('JTMK');

    // Lively floating chips
    expect(html).toContain('1,080+ Siswa Aktif');
    expect(html).toContain('Pesanan PolyMart Terus');
  });

  it('provides matching English and Malay translation keys for the landing page', async () => {
    const msPortal = (await import('@/locales/ms/portal.json')).default;
    const enPortal = (await import('@/locales/en/portal.json')).default;

    const criticalKeys = [
      'landing_quick_nav',
      'landing_student_superapp',
      'landing_portal_welcome',
      'landing_hero_title',
      'landing_explore_portal',
      'landing_explore_campus_day',
      'landing_bento_heading',
      'landing_stats_title',
      'landing_cta_login',
    ];

    criticalKeys.forEach((key) => {
      expect((msPortal as Record<string, string>)[key]).toBeDefined();
      expect((enPortal as Record<string, string>)[key]).toBeDefined();
      expect(typeof (msPortal as Record<string, string>)[key]).toBe('string');
      expect(typeof (enPortal as Record<string, string>)[key]).toBe('string');
    });
  });

  it('verifies dark executive telemetry card container in LandingStats avoids raw jarring full-bleed rectangle', async () => {
    const { LandingStats } = await import('@/components/landing/LandingStats');
    const stats: CampusStats = {
      clubsCount: 21,
      activitiesCount: 41,
      studentsCount: 1083,
      productsCount: 277,
      ordersCount: 344,
    };

    const html = renderToString(<LandingStats stats={stats} />);

    // Rounded executive container with ambient glow
    expect(html).toContain('rounded-[2.5rem] md:rounded-[3.5rem] bg-[#2E3A2F]');
    expect(html).toContain('bg-[#6B7F5B]/15 rounded-full blur-xl');
    expect(html).toContain('bg-[#C96F4F]/10 rounded-full blur-xl');

    // Font-mono tabular-nums for numeric telemetry
    expect(html).toContain('font-mono tabular-nums');
    expect(html).toContain('21');
    expect(html).toContain('1,083+');
    expect(html).toContain('41');
    expect(html).toContain('277+');
    expect(html).toContain('344+');

    // Secondary live telemetry pill
    expect(html).toContain('Pesanan Diselesaikan');
    expect(html).toContain('Transaksi Kampus');
  });

  it('verifies dynamic localized campus day timeline phases and UI controls', async () => {
    const { CampusDayTimeline } = await import('@/components/landing/CampusDayTimeline');
    const html = renderToString(<CampusDayTimeline />);

    // Section title & badges
    expect(html).toContain('The POLISAS Experience:');
    expect(html).toContain('Sehari Bersama Ekosistem POLISAS');

    // 4 Distinct Time Milestones
    expect(html).toContain('08:00 Pagi');
    expect(html).toContain('12:30 Tgh Hari');
    expect(html).toContain('17:00 Petang');
    expect(html).toContain('21:00 Malam');

    // Interactive UI Controls & Authentic Secondary Labels
    expect(html).toContain('Paparan Utama');
    expect(html).toContain('Navigasi PolyMaps');
    expect(html).toContain('Zum Skrin Penuh');
  });

  it('verifies complete bilingual coverage for timeline, bento, and Nexus AI keys', async () => {
    const msPortal = (await import('@/locales/ms/portal.json')).default;
    const enPortal = (await import('@/locales/en/portal.json')).default;

    const bilingualKeys = [
      'landing_dept_jka',
      'landing_dept_jkm',
      'landing_dept_jke',
      'landing_dept_jp',
      'landing_dept_jtmk',
      'landing_chip_active_students',
      'landing_chip_polymart_direct',
      'landing_chip_clubs',
      'landing_chip_hep_audit',
      'landing_badge_orders_completed',
      'landing_badge_registered_clubs',
      'landing_badge_student_records',
      'landing_badge_polymart_campus',
      'landing_badge_governance',
      'landing_badge_student_body',
      'timeline_phase_morning_title',
      'timeline_phase_morning_subtitle',
      'timeline_phase_noon_title',
      'timeline_phase_noon_subtitle',
      'timeline_phase_evening_title',
      'timeline_phase_evening_subtitle',
      'timeline_phase_night_title',
      'timeline_phase_night_subtitle',
      'timeline_view_primary',
      'timeline_view_secondary',
      'timeline_zoom_fullscreen',
      'timeline_close_preview',
      'nexus_audit_title',
      'nexus_hep_compliance',
      'nexus_budget_syntax',
      'nexus_kpi_objectives',
      'nexus_ai_recommendation',
      'stat_registered_clubs_label',
      'stat_official_activities_label',
      'stat_student_products_label',
      'stat_campus_orders_label',
      'stat_student_records_label',
      'stat_polisas_departments_label',
      'stat_menu_items_label',
      'stat_cashless_secure_label',
      'stat_residence_records_label',
      'stat_quick_action_label',
    ];

    bilingualKeys.forEach((key) => {
      const msVal = (msPortal as Record<string, string>)[key];
      const enVal = (enPortal as Record<string, string>)[key];
      expect(msVal, `Missing Malay key: ${key}`).toBeDefined();
      expect(enVal, `Missing English key: ${key}`).toBeDefined();
      expect(typeof msVal).toBe('string');
      expect(typeof enVal).toBe('string');
      expect(msVal.trim().length).toBeGreaterThan(0);
      expect(enVal.trim().length).toBeGreaterThan(0);
    });
  });
});








