import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/lib/i18n';

const ROOT = path.resolve(__dirname, '../..');

function read(relPath: string) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    isSuperAdmin: false,
    isJppMember: false,
    hasKeusahawananAccess: false,
    profile: {
      intake_year: '2025',
      intake_period: 1,
      programme_code: 'DIT',
    },
  }),
}));

vi.mock('@/contexts/AcademicSessionContext', () => ({
  useAcademicSession: () => ({
    intake1Month: 7,
    intake2Month: 12,
  }),
}));

vi.mock('@/components/portal/PolymartServiceModal', () => ({
  PolymartServiceModal: () => null,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, id, onClick, ...props }: any) =>
      React.createElement('div', { className, id, onClick, ...props }, children),
    button: ({ children, className, onClick, ...props }: any) =>
      React.createElement('button', { className, onClick, ...props }, children),
    span: ({ children, className, ...props }: any) =>
      React.createElement('span', { className, ...props }, children),
  },
  AnimatePresence: ({ children }: any) => children,
  useDragControls: () => ({ start: vi.fn() }),
}));

beforeAll(async () => {
  await i18n.changeLanguage('ms');
});

describe('Phase 4 — Super App Native Ergonomics, IA & Motion', () => {
  it('unifies public/site.webmanifest and vite.config.ts onto a single Mineral Teal PWA manifest', () => {
    const manifestJson = JSON.parse(read('public/site.webmanifest'));
    const viteConfig = read('vite.config.ts');

    expect(manifestJson.theme_color).toBe('#0F766E');
    expect(manifestJson.background_color).toBe('#F6FBF9');
    expect(manifestJson.scope).toBe('/');
    expect(manifestJson.start_url).toBe('/portal');
    expect(manifestJson.launch_handler).toEqual({ client_mode: 'navigate-existing' });

    expect(viteConfig).toContain("theme_color: '#0F766E'");
    expect(viteConfig).toContain("background_color: '#F6FBF9'");
    expect(viteConfig).toContain("scope: '/'");
    expect(viteConfig).toContain('launch_handler');
    expect(viteConfig).not.toContain('#3b82f6');
  });

  it('upgrades BottomNav to always-labeled 5-slot dock with smooth zero-rerender scroll-compact mode', async () => {
    const src = read('src/components/layout/BottomNav.tsx');

    // Uses data-compact RAF passive scroll without blocking 1-tap navigation or bounce tooltips
    expect(src).toContain('dataset.compact');
    expect(src).toContain('data-[compact=true]:scale-[0.84]');
    expect(src).toContain('group-data-[compact=true]/dock:opacity-0');
    expect(src).toContain('group-data-[compact=true]/dock:max-h-0');
    expect(src).not.toContain('repeat: Infinity');
    expect(src).not.toContain('hide_bottomnav_tooltip');
    expect(src).toContain('LayoutGrid');
    expect(src).toContain('min-h-[48px]');
    expect(src).toContain('grid-cols-5');
    expect(src).toContain('text-[10px]');
    expect(src).not.toContain('text-[7px]');

    // Verify SSR null safety preserved + label visibility at rest
    const { BottomNav } = await import('@/components/layout/BottomNav');
    const ssrHtml = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/portal'] }, React.createElement(BottomNav))
    );
    expect(ssrHtml).toBe('');
    expect(src).not.toContain('{isActive && (\n          <motion.span');
    expect(src).toContain("t('nav:hub_short', 'Pintasan')");
    expect(src).toContain("t('nav:takwim', 'Takwim')");
  });

  it('implements Asymmetric 12-Col Hero with Button-in-Button CTAs and Pine-Teal Flagship Bento on Landing', () => {
    const heroSrc = read('src/components/landing/LandingHero.tsx');
    const bentoSrc = read('src/components/landing/LandingBento.tsx');
    const ctaSrc = read('src/components/landing/LandingCta.tsx');

    expect(heroSrc).toContain('lg:grid-cols-12');
    expect(heroSrc).toContain('lg:col-span-6');
    expect(heroSrc).toContain('rounded-full');
    expect(heroSrc).toContain('stageFocus');

    expect(bentoSrc).toContain('grid-flow-dense');
    expect(bentoSrc).toContain('!bg-[#0B2420]');

    expect(ctaSrc).toContain('landing_cta_heading');
    expect(ctaSrc).toContain('bg-[#2DD4BF]');
  });

  it('guarantees >=44px touch targets on SuperAppHeader and PolyMartHome Wishlist without infinite pulse', () => {
    const headerSrc = read('src/components/portal/SuperAppHeader.tsx');
    const polyMartSrc = read('src/pages/polymart/PolyMartHome.tsx');

    expect(headerSrc).toContain('w-10 h-10 sm:w-11 sm:h-11');
    expect(headerSrc).toContain('after:-inset-1');
    expect(headerSrc).not.toContain('text-[9px]');

    const productCardSrc = polyMartSrc.slice(0, polyMartSrc.indexOf('function BusinessCard'));
    expect(productCardSrc).toContain('after:-inset-1.5');
    expect(productCardSrc).toContain('w-9 h-9 sm:w-10 sm:h-10');
    expect(productCardSrc).not.toContain('animate-pulse');
    expect(productCardSrc).not.toContain('text-[8px]');
  });

  it('organizes PortalPage into 12-column desktop Bento + 4-column Exco directory while keeping live trackers above grid', () => {
    const portalSrc = read('src/pages/PortalPage.tsx');
    const indexCss = read('src/index.css');
    const nextClassSrc = read('src/components/portal/NextClassBentoCard.tsx');

    expect(portalSrc).toContain('lg:grid-cols-12');
    expect(portalSrc).toContain('lg:col-span-5');
    expect(portalSrc).toContain('lg:col-span-7');
    expect(portalSrc).toContain('lg:col-span-6');
    expect(portalSrc).toContain('only:lg:col-span-12');
    expect(portalSrc).toContain('empty:hidden');
    expect(portalSrc).not.toContain('<div className="lg:col-span-6 min-w-0">');
    expect(portalSrc).toContain('lg:grid-cols-4');

    expect(indexCss).toContain('.scrollbar-none');
    expect(nextClassSrc).toContain('lg:flex-col lg:items-stretch');
    expect(nextClassSrc).toContain('whitespace-nowrap');

    const carouselIndex = portalSrc.indexOf('<CampusCampaignCarousel');
    const trackerIndex = portalSrc.indexOf('<KebajikanLiveTrackerCard');
    const gridIndex = portalSrc.indexOf('<CampusServicesGrid');
    expect(carouselIndex).toBeGreaterThan(-1);
    expect(trackerIndex).toBeGreaterThan(-1);
    expect(gridIndex).toBeGreaterThan(-1);
    expect(carouselIndex).toBeLessThan(gridIndex);
    expect(trackerIndex).toBeLessThan(gridIndex);
  });

  it('prevents mobile tile truncation (E-...) and keeps English CLUB badges Mineral Teal in CampusServicesGrid', () => {
    const gridSrc = read('src/components/portal/CampusServicesGrid.tsx');
    expect(gridSrc).toContain('px-1.5 py-2.5 sm:p-3.5');
    expect(gridSrc).toContain("service.badge === 'CLUB'");
    expect(gridSrc).toContain('leading-tight break-words line-clamp-2 w-full text-center');
    expect(gridSrc).not.toContain('line-clamp-1');
  });

  it('standardizes single PWA manifest in index.html and unified BottomNav ergonomics across student modules', () => {
    const indexHtml = read('index.html');
    const polyRentSrc = read('src/pages/polyrent/PolyRentPage.tsx');
    const polyMapsSrc = read('src/pages/polymaps/PolyMapsPage.tsx');
    const notifSrc = read('src/pages/NotifikasiPage.tsx');
    const makmpChromeSrc = read('src/components/makmp/MakmpJppChrome.tsx');

    expect(indexHtml).not.toContain('href="/site.webmanifest"');
    expect(polyRentSrc).toContain('<BottomNav onOpenSidebar={() => setIsSidebarOpen(true)} />');
    expect(polyRentSrc).not.toContain('customLinks');
    expect(polyMapsSrc).not.toContain('forceShowDesktop');
    expect(notifSrc).toContain('<BottomNav />');
    expect(makmpChromeSrc).toContain("t('common:nav.home', 'Utama')");
    expect(makmpChromeSrc).toContain("t('common:nav.profile', 'Profil')");
  });
});
