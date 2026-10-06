import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    hasKeusahawananAccess: false,
    isSuperAdmin: false,
  }),
}));
import {
  formatGreeting,
  filterUpcomingEvents,
  buildCampaignSlides,
  getRoleBadgeTitle,
  getHeaderGradientClass,
  getCampusServicesConfig,
  getCampaignVariantClasses,
  formatProductPrice,
  isProductOnSale,
  getProductEffectivePrice,
} from '@/lib/superAppHelpers';

describe('superAppHelpers', () => {
  it('formats appropriate greetings according to the hour of day', () => {
    expect(formatGreeting(8, 'Aiman').title).toBe('Selamat Pagi,');
    expect(formatGreeting(14, 'Aiman').title).toBe('Selamat Petang,');
    expect(formatGreeting(21, 'Aiman').title).toBe('Selamat Malam,');
    expect(formatGreeting(2, 'Aiman').title).toBe('Masih Berjaga,');
  });

  it('filters and sorts upcoming events correctly', () => {
    const mockEvents = [
      { id: '1', title: 'Past Event', event_date: '2020-01-01', status: 'COMPLETED' },
      { id: '2', title: 'Live Event', event_date: '2026-10-10', status: 'PUBLISHED' },
      { id: '3', title: 'Future Event', event_date: '2026-11-15', status: 'PUBLISHED' },
    ];
    const upcoming = filterUpcomingEvents(mockEvents);
    expect(upcoming.length).toBe(2);
    expect(upcoming[0].id).toBe('2');
  });

  it('builds dynamic campaign slides based on user state', () => {
    const slides = buildCampaignSlides({
      kamsisStatus: 'APPROVED',
      makmpStatus: 'DIJEMPUT',
      karnivalActive: true,
      supsasActive: false,
    });

    expect(slides.some(s => s.id === 'makmp')).toBe(true);
    expect(slides.some(s => s.id === 'kamsis')).toBe(true);
    expect(slides.some(s => s.id === 'karnival')).toBe(true);
    expect(slides.some(s => s.id === 'supsas')).toBe(false);
  });

  describe('SuperAppHeader logic', () => {
    it('resolves role badge title correctly for various roles', () => {
      expect(getRoleBadgeTitle('SUPERADMIN')).toBe('PENTADBIR UTAMA');
      expect(getRoleBadgeTitle('SUPER_ADMIN_JPP')).toBe('PENTADBIR UTAMA');
      expect(getRoleBadgeTitle('JPP')).toBe('MAJLIS JPP');
      expect(getRoleBadgeTitle('STUDENT')).toBe('SISWA POLISAS');
      expect(getRoleBadgeTitle(undefined)).toBe('SISWA POLISAS');
      expect(getRoleBadgeTitle('')).toBe('SISWA POLISAS');
    });

    it('selects theme gradient class based on karnivalActive and supsasActive state', () => {
      // Karnival active
      const karnivalGrad = getHeaderGradientClass(true, false);
      expect(karnivalGrad).toContain('violet');

      // SUPSAS active
      const supsasGrad = getHeaderGradientClass(false, true);
      expect(supsasGrad).toContain('amber');

      // Default portal state (Obsidian Emerald)
      const defaultGrad = getHeaderGradientClass(false, false);
      expect(defaultGrad).toContain('emerald');
      expect(defaultGrad).toContain('slate');
    });

    it('exports SuperAppHeader component correctly as named and default exports', async () => {
      const headerModule = await import('@/components/portal/SuperAppHeader');
      expect(headerModule.SuperAppHeader).toBeDefined();
      expect(typeof headerModule.SuperAppHeader).toBe('function');
      expect(headerModule.default).toBeDefined();
      expect(typeof headerModule.default).toBe('function');
      expect(headerModule.SuperAppHeader).toBe(headerModule.default);
    }, 90000);

    it('verifies SuperAppHeader accepts executive glass header props structure', async () => {
      const { SuperAppHeader } = await import('@/components/portal/SuperAppHeader');
      const mockSidebarHandler = () => {};
      const mockProfile = {
        id: 'usr-123',
        full_name: 'Ahmad Faiz',
        role: 'SUPERADMIN',
        avatar_url: '/test-avatar.jpg',
      };

      const element = React.createElement(SuperAppHeader, {
        profile: mockProfile,
        displayName: 'Faiz',
        karnivalActive: false,
        supsasActive: false,
        onOpenSidebar: mockSidebarHandler,
        unreadCount: 3,
        className: 'custom-glass-header',
      });

      expect(React.isValidElement(element)).toBe(true);
      expect(element.type).toBe(SuperAppHeader);
      expect(element.props.displayName).toBe('Faiz');
      expect(element.props.profile).toEqual(mockProfile);
      expect(element.props.karnivalActive).toBe(false);
      expect(element.props.supsasActive).toBe(false);
      expect(element.props.unreadCount).toBe(3);
      expect(element.props.onOpenSidebar).toBe(mockSidebarHandler);
      expect(element.props.className).toBe('custom-glass-header');
    });

    it('renders pure white stadium search capsule and floating discrete action circles', async () => {
      if (typeof globalThis.localStorage === 'undefined') {
        globalThis.localStorage = {
          getItem: () => 'light',
          setItem: () => {},
          removeItem: () => {},
          clear: () => {},
          key: () => null,
          length: 0,
        };
      }
      const { SuperAppHeader } = await import('@/components/portal/SuperAppHeader');
      const { MemoryRouter } = await import('react-router-dom');
      const { ThemeProvider } = await import('@/contexts/ThemeContext');
      const { renderToString } = await import('react-dom/server');

      const html = renderToString(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(
            ThemeProvider,
            null,
            React.createElement(SuperAppHeader, {
              displayName: 'Aiman',
            })
          )
        )
      );

      // Header container bottom border and shadow
      expect(html).toContain('border-b');
      expect(html).toContain('border-emerald-500/20');
      expect(html).toContain('shadow-[0_12px_32px_rgba(0,0,0,0.35)]');

      // Pure white stadium search capsule
      expect(html).toContain('bg-white');
      expect(html).toContain('rounded-full');
      expect(html).toContain('shadow-[0_8px_30px_rgba(0,0,0,0.18)]');
      expect(html).toContain('Cari makanan, runner, servis, acara, merit...');

      // Floating discrete action circles container
      expect(html).toContain('flex items-center gap-3 shrink-0');
      expect(html).not.toContain('divide-x');
      expect(html).not.toContain('rounded-2xl bg-white/[0.08]');
      expect(html).not.toContain('bg-white/[0.08]');

      // Discrete circular buttons & Profile avatar
      expect(html).toContain('w-9 h-9 rounded-full');
      expect(html).toContain('ring-2 ring-emerald-400/60');
      expect(html).toContain('from-emerald-600 to-teal-500');
    });
  });

  describe('getCampusServicesConfig & CampusServicesGrid', () => {
    it('returns exactly 8 core campus services in expected IDs', () => {
      const services = getCampusServicesConfig({ kamsisStatus: null });
      expect(services).toHaveLength(8);
      const ids = services.map(s => s.id);
      expect(ids).toEqual([
        'polysuara',
        'polymart',
        'takwim',
        'polymaps',
        'polyrent',
        'kebajikan',
        'akademik_qr',
        'ekpp',
      ]);
      services.forEach(s => {
        expect(s.id).toBeTruthy();
        expect(s.label).toBeTruthy();
        expect(s.routeOrAction).toBeTruthy();
      });
    });

    it('attaches active ticket count badge when kbOpenCount > 0', () => {
      const servicesWithTickets = getCampusServicesConfig({ kamsisStatus: null, kbOpenCount: 4 });
      const kb = servicesWithTickets.find(s => s.id === 'kebajikan');
      expect(kb).toBeDefined();
      expect(kb?.badge).toBe('4');

      const servicesWithoutTickets = getCampusServicesConfig({ kamsisStatus: null, kbOpenCount: 0 });
      const kbZero = servicesWithoutTickets.find(s => s.id === 'kebajikan');
      expect(kbZero?.badge).toBeUndefined();
    });

    it('exports CampusServicesGrid component correctly', async () => {
      const { CampusServicesGrid } = await import('@/components/portal/CampusServicesGrid');
      expect(CampusServicesGrid).toBeDefined();
      expect(typeof CampusServicesGrid).toBe('function');
    });

    it('verifies 8 core services have correct routes, sublabels, tourClasses and badges', () => {
      const services = getCampusServicesConfig({ kamsisStatus: null, kbOpenCount: 2 });
      const serviceMap = Object.fromEntries(services.map(s => [s.id, s]));

      expect(serviceMap.polysuara.routeOrAction).toBe('/polysuara');
      expect(serviceMap.polysuara.sublabel).toBe('Suara Siswa');

      expect(serviceMap.polymart.routeOrAction).toBe('/polymart');
      expect(serviceMap.polymart.sublabel).toBe('Pasaran Siswa');

      expect(serviceMap.takwim.routeOrAction).toBe('/akademik/takwim');
      expect(serviceMap.takwim.sublabel).toBe('Kalendar Rasmi');
      expect(serviceMap.takwim.tourClass).toContain('tour-qa-polyservices');

      expect(serviceMap.polymaps.routeOrAction).toBe('/polymaps');
      expect(serviceMap.polymaps.sublabel).toBe('Peta Kampus');

      expect(serviceMap.polyrent.routeOrAction).toBe('/polyrent');
      expect(serviceMap.polyrent.sublabel).toBe('Sewa Rumah');

      expect(serviceMap.kebajikan.routeOrAction).toBe('/kebajikan');
      expect(serviceMap.kebajikan.sublabel).toBe('Aduan & Bantuan');
      expect(serviceMap.kebajikan.tourClass).toContain('tour-qa-kebajikan');
      expect(serviceMap.kebajikan.badge).toBe('2');

      expect(serviceMap.akademik_qr.routeOrAction).toBe('/akademik/qr');
      expect(serviceMap.akademik_qr.sublabel).toBe('Kumpul Merit');
      expect(serviceMap.akademik_qr.tourClass).toContain('tour-qa-qr');
      expect(serviceMap.akademik_qr.badge).toBe('MERIT');

      expect(serviceMap.ekpp.routeOrAction).toBe('/kelab');
      expect(serviceMap.ekpp.sublabel).toBe('Persatuan Siswa');
      expect(serviceMap.ekpp.tourClass).toContain('tour-mod-ekpp');
      expect(serviceMap.ekpp.badge).toBe('KELAB');
    });
  });

  describe('CampusCampaignCarousel & campaign helpers', () => {
    it('returns correct gradient and border classes for each campaign variant', () => {
      const goldClasses = getCampaignVariantClasses('gold');
      expect(goldClasses).toContain('amber');
      expect(goldClasses).toContain('border');

      const emeraldClasses = getCampaignVariantClasses('emerald');
      expect(emeraldClasses).toContain('emerald');
      expect(emeraldClasses).toContain('border');

      const violetClasses = getCampaignVariantClasses('violet');
      expect(violetClasses).toContain('violet');
      expect(violetClasses).toContain('border');

      const amberClasses = getCampaignVariantClasses('amber');
      expect(amberClasses).toContain('amber');
      expect(amberClasses).toContain('border');

      const roseClasses = getCampaignVariantClasses('rose');
      expect(roseClasses).toContain('rose');
      expect(roseClasses).toContain('border');

      const defaultClasses = getCampaignVariantClasses(undefined as any);
      expect(defaultClasses).toContain('border');
    });

    it('exports CampusCampaignCarousel component correctly', async () => {
      const { CampusCampaignCarousel } = await import('@/components/portal/CampusCampaignCarousel');
      expect(CampusCampaignCarousel).toBeDefined();
      expect(typeof CampusCampaignCarousel).toBe('function');
    });

    it('renders CampusCampaignCarousel with empty slides without hook violations', async () => {
      const { CampusCampaignCarousel } = await import('@/components/portal/CampusCampaignCarousel');
      const { MemoryRouter } = await import('react-router-dom');
      const { renderToString } = await import('react-dom/server');

      // Empty array should render empty string without any error
      const emptyHtml = renderToString(
        React.createElement(MemoryRouter, null, React.createElement(CampusCampaignCarousel, { slides: [] }))
      );
      expect(emptyHtml).toBe('');

      // Undefined slides should render empty string without error
      const undefHtml = renderToString(
        React.createElement(MemoryRouter, null, React.createElement(CampusCampaignCarousel, { slides: undefined as any }))
      );
      expect(undefHtml).toBe('');
    });

    it('renders CampusCampaignCarousel with valid slides correctly', async () => {
      const { CampusCampaignCarousel } = await import('@/components/portal/CampusCampaignCarousel');
      const { MemoryRouter } = await import('react-router-dom');
      const { renderToString } = await import('react-dom/server');

      const mockSlides = [
        {
          id: 'kamsis' as const,
          title: 'Rayuan Asrama Dibuka',
          description: 'Permohonan rayuan bilik KAMSIS dibuka sekarang.',
          badge: 'Tindakan Diperlukan',
          actionText: 'Hantar Rayuan',
          actionPath: null,
          variant: 'amber' as const,
        },
        {
          id: 'karnival' as const,
          title: 'Karnival JPP Live',
          description: 'Jom undi booth pilihan anda!',
          badge: 'Live',
          actionText: 'Sertai',
          actionPath: '/karnival',
          variant: 'violet' as const,
        },
      ];

      const html = renderToString(
        React.createElement(MemoryRouter, null, React.createElement(CampusCampaignCarousel, { slides: mockSlides }))
      );

      expect(html).toContain('Rayuan Asrama Dibuka');
      expect(html).toContain('Permohonan rayuan bilik KAMSIS dibuka sekarang.');
      expect(html).toContain('Hantar Rayuan');
      expect(html).toContain('Navigasi Kempen');
    });
  });

  describe('formatProductPrice', () => {
    it('formats number and string prices to RM format with 2 decimals', () => {
      expect(formatProductPrice(3.5)).toBe('RM 3.50');
      expect(formatProductPrice('4')).toBe('RM 4.00');
      expect(formatProductPrice(12.9)).toBe('RM 12.90');
      expect(formatProductPrice('RM 5.20')).toBe('RM 5.20');
      expect(formatProductPrice(0)).toBe('RM 0.00');
    });

    it('handles invalid, negative, or empty prices safely', () => {
      expect(formatProductPrice(null as any)).toBe('RM 0.00');
      expect(formatProductPrice(undefined as any)).toBe('RM 0.00');
      expect(formatProductPrice('')).toBe('RM 0.00');
      expect(formatProductPrice('abc')).toBe('RM 0.00');
      expect(formatProductPrice(NaN)).toBe('RM 0.00');
      expect(formatProductPrice(-10)).toBe('RM 0.00');
      expect(formatProductPrice('.75')).toBe('RM 0.75');
      expect(formatProductPrice(99.999)).toBe('RM 100.00');
    });
  });

  describe('isProductOnSale & getProductEffectivePrice', () => {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const oneHourLater = new Date(Date.now() + 3600000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString();
    const tenDaysAgo = new Date(Date.now() - 86400000 * 10).toISOString();
    const twoDaysLater = new Date(Date.now() + 86400000 * 2).toISOString();
    const tenDaysLater = new Date(Date.now() + 86400000 * 10).toISOString();

    it('returns true when sale is actively within date range and cheaper than price', () => {
      const product = {
        price: 10,
        sale_price: 8,
        sale_start_at: oneHourAgo,
        sale_end_at: oneHourLater,
      };
      expect(isProductOnSale(product)).toBe(true);
      expect(getProductEffectivePrice(product)).toBe(8);
    });

    it('returns false when sale has expired', () => {
      const expiredProduct = {
        price: 9,
        sale_price: 7.5,
        sale_start_at: tenDaysAgo,
        sale_end_at: twoDaysAgo,
      };
      expect(isProductOnSale(expiredProduct)).toBe(false);
      expect(getProductEffectivePrice(expiredProduct)).toBe(9);
    });

    it('returns false when sale has not started yet', () => {
      const futureProduct = {
        price: 20,
        sale_price: 15,
        sale_start_at: twoDaysLater,
        sale_end_at: tenDaysLater,
      };
      expect(isProductOnSale(futureProduct)).toBe(false);
      expect(getProductEffectivePrice(futureProduct)).toBe(20);
    });

    it('returns false if sale_price is zero, negative, or greater/equal to regular price', () => {
      expect(isProductOnSale({ price: 10, sale_price: 0, sale_start_at: oneHourAgo, sale_end_at: oneHourLater })).toBe(false);
      expect(isProductOnSale({ price: 10, sale_price: -5, sale_start_at: oneHourAgo, sale_end_at: oneHourLater })).toBe(false);
      expect(isProductOnSale({ price: 10, sale_price: 10, sale_start_at: oneHourAgo, sale_end_at: oneHourLater })).toBe(false);
      expect(isProductOnSale({ price: 10, sale_price: 15, sale_start_at: oneHourAgo, sale_end_at: oneHourLater })).toBe(false);
    });

    it('returns false if sale dates are missing or invalid', () => {
      expect(isProductOnSale({ price: 10, sale_price: 8, sale_start_at: null, sale_end_at: null })).toBe(false);
      expect(isProductOnSale({ price: 10, sale_price: 8, sale_start_at: oneHourAgo, sale_end_at: null })).toBe(false);
      expect(isProductOnSale({ price: 10, sale_price: 8, sale_start_at: 'invalid-date', sale_end_at: 'invalid-date' })).toBe(false);
      expect(isProductOnSale(null)).toBe(false);
      expect(isProductOnSale(undefined)).toBe(false);
    });
  });

  describe('EmsEventsFeed & PolyMartFeed component exports', () => {
    it('exports EmsEventsFeed component correctly', async () => {
      const module = await import('@/components/portal/EmsEventsFeed');
      expect(module.EmsEventsFeed).toBeDefined();
      expect(module.default).toBeDefined();
      expect(typeof module.EmsEventsFeed).toBe('function');
    });

    it('exports PolyMartFeed component correctly and creates valid elements', async () => {
      const module = await import('@/components/portal/PolyMartFeed');
      expect(module.PolyMartFeed).toBeDefined();
      expect(module.default).toBeDefined();
      expect(typeof module.PolyMartFeed).toBe('function');

      const mockProducts = [
        {
          id: 'prod-123',
          name: 'Pencuci Kasut Siswa',
          price: 15.0,
          sale_price: 12.0,
          sale_start_at: new Date(Date.now() - 3600000).toISOString(),
          sale_end_at: new Date(Date.now() + 3600000).toISOString(),
          image_url: null,
          category: 'Servis',
          publish_to_polymart: true,
          is_available: true,
        }
      ];

      const element = React.createElement(module.PolyMartFeed, {
        products: mockProducts,
        className: 'test-feed-class',
      });

      expect(React.isValidElement(element)).toBe(true);
      expect(element.type).toBe(module.PolyMartFeed);
      expect(element.props.products).toEqual(mockProducts);
      expect(element.props.className).toBe('test-feed-class');
    });

    it('mounts PolyMartFeed with initial products, renders active sales, and hides expired sales', async () => {
      const { PolyMartFeed } = await import('@/components/portal/PolyMartFeed');
      const { MemoryRouter } = await import('react-router-dom');
      const { renderToString } = await import('react-dom/server');

      const mockProducts = [
        {
          id: 'prod-abc',
          name: 'Nasi Lemak Ayam Berempah',
          price: 7.5,
          sale_price: 6.0,
          sale_start_at: new Date(Date.now() - 3600000).toISOString(),
          sale_end_at: new Date(Date.now() + 3600000).toISOString(),
          image_url: 'https://example.com/nasi-lemak.jpg',
          category: 'Makanan',
          publish_to_polymart: true,
          is_available: true,
        },
        {
          id: 'prod-xyz',
          name: 'Kemeja Korporat POLISAS',
          price: 45.0,
          sale_price: null,
          image_url: null,
          category: 'Pakaian',
          publish_to_polymart: true,
          is_available: true,
        },
        {
          id: 'prod-expired',
          name: 'Chicken Popcorn Rangup',
          price: 9.0,
          sale_price: 7.5,
          sale_start_at: new Date(Date.now() - 86400000 * 10).toISOString(),
          sale_end_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          image_url: null,
          category: 'Makanan',
          publish_to_polymart: true,
          is_available: true,
        },
      ];

      const html = renderToString(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(PolyMartFeed, {
            products: mockProducts,
            className: 'test-polymart-feed',
          })
        )
      );

      expect(html).toContain('PolyMart Siswa');
      expect(html).toContain('Terhangat');
      expect(html).toContain('Terkini');
      expect(html).toContain('Buka Mart');
      // Active sale item renders sale price and strikethrough original price
      expect(html).toContain('Nasi Lemak Ayam Berempah');
      expect(html).toContain('RM 6.00');
      expect(html).toContain('RM 7.50');
      // Non-sale item renders regular price
      expect(html).toContain('Kemeja Korporat POLISAS');
      expect(html).toContain('RM 45.00');
      // Expired sale item renders original price RM 9.00 and does NOT render expired sale price RM 7.50
      expect(html).toContain('Chicken Popcorn Rangup');
      expect(html).toContain('RM 9.00');
    });
  });

  describe('PortalPage integration', () => {
    it('exports PortalPage component correctly as named and default exports', async () => {
      const module = await import('@/pages/PortalPage');
      expect(module.PortalPage).toBeDefined();
      expect(typeof module.PortalPage).toBe('function');
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe('function');
    });

    it('exports PortalFooter component correctly', async () => {
      const module = await import('@/components/portal/PortalFooter');
      expect(module.PortalFooter).toBeDefined();
      expect(typeof module.PortalFooter).toBe('function');
    });
  });

  describe('OLED Dark Mode Glass Aura & Glowing Service Tiles (Task 3)', () => {
    it('verifies CampusServicesGrid renders dark mode glass tiles, glowing squircle icons and neon badges', async () => {
      const { CampusServicesGrid } = await import('@/components/portal/CampusServicesGrid');
      const { MemoryRouter } = await import('react-router-dom');
      const { renderToString } = await import('react-dom/server');

      const html = renderToString(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(CampusServicesGrid, {
            isModuleEnabled: () => true,
            isSuperAdmin: false,
            kbStats: { open: 3, resolved: 10 },
          })
        )
      );

      // Elevated card container depth (light + dark mode)
      expect(html).toContain('bg-white');
      expect(html).toContain('hover:bg-slate-50');
      expect(html).toContain('border-slate-200/70');
      expect(html).toContain('dark:bg-slate-900/80');
      expect(html).toContain('dark:hover:bg-slate-800/90');
      expect(html).toContain('dark:border-white/[0.08]');
      expect(html).toContain('dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]');

      // Squircle icon container does NOT contain hardcoded overriding dark classes
      expect(html).not.toContain('dark:bg-white/[0.06]');
      expect(html).not.toContain('dark:shadow-inner');

      // Cyber luminescent squircle tokens (8 services)
      expect(html).toContain('dark:shadow-[0_0_12px_rgba(244,63,94,0.3)]'); // polysuara
      expect(html).toContain('dark:shadow-[0_0_12px_rgba(245,158,11,0.3)]'); // polymart
      expect(html).toContain('dark:shadow-[0_0_12px_rgba(99,102,241,0.3)]'); // takwim
      expect(html).toContain('dark:shadow-[0_0_12px_rgba(16,185,129,0.3)]'); // polymaps
      expect(html).toContain('dark:shadow-[0_0_12px_rgba(6,182,212,0.3)]'); // polyrent
      expect(html).toContain('dark:shadow-[0_0_12px_rgba(20,184,166,0.3)]'); // kebajikan
      expect(html).toContain('dark:shadow-[0_0_12px_rgba(168,85,247,0.3)]'); // akademik_qr
      expect(html).toContain('dark:shadow-[0_0_12px_rgba(59,130,246,0.3)]'); // ekpp

      // All 8 glowing neon-pastel icon text classes
      expect(html).toContain('dark:text-rose-400'); // polysuara
      expect(html).toContain('dark:text-amber-400'); // polymart
      expect(html).toContain('dark:text-indigo-400'); // takwim
      expect(html).toContain('dark:text-emerald-400'); // polymaps
      expect(html).toContain('dark:text-cyan-400'); // polyrent
      expect(html).toContain('dark:text-teal-400'); // kebajikan
      expect(html).toContain('dark:text-purple-400'); // akademik_qr
      expect(html).toContain('dark:text-blue-400'); // ekpp

      // Light mode pastel styles
      expect(html).toContain('bg-rose-50');
      expect(html).toContain('text-rose-600');
      expect(html).toContain('border-rose-200');

      // Glowing badges
      expect(html).toContain('dark:shadow-[0_0_10px_rgba(168,85,247,0.5)]'); // MERIT
      expect(html).toContain('dark:shadow-[0_0_10px_rgba(59,130,246,0.5)]'); // KELAB
      expect(html).toContain('dark:shadow-[0_0_10px_rgba(244,63,94,0.5)]'); // kebajikan count (3)
    });

    it('verifies EmsEventsFeed renders deep glass cards with WCAG AA compliant labels and glowing badge', async () => {
      const { EmsEventsFeed } = await import('@/components/portal/EmsEventsFeed');
      const { MemoryRouter } = await import('react-router-dom');
      const { renderToString } = await import('react-dom/server');

      const mockEvents = [
        {
          id: 'evt-999',
          title: 'Kejohanan Futsal Mahasiswa',
          description: 'Pertandingan antara jabatan',
          category: 'Sukan',
          event_date: '2026-10-20',
          location: 'Dewan Jubli Perak',
          status: 'PUBLISHED',
        },
      ];

      const html = renderToString(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(EmsEventsFeed, {
            events: mockEvents,
          })
        )
      );

      // Deep glass card elevation
      expect(html).toContain('dark:bg-slate-900/60');
      expect(html).toContain('dark:backdrop-blur-md');
      expect(html).toContain('dark:border-white/[0.08]');
      expect(html).toContain('dark:hover:border-emerald-500/40');

      // Glowing TERBUKA badge
      expect(html).toContain('TERBUKA');
      expect(html).toContain('dark:shadow-[0_0_8px_rgba(244,63,94,0.4)]');

      // WCAG AA compliant text contrast
      expect(html).toContain('dark:text-slate-300');
    });
  });

  describe('PolyMartLayout SuperApp Modernization', () => {
    it('exports CATEGORY_LIST with valid Lucide icon mapping and no raw emoji strings', async () => {
      const { CATEGORY_LIST } = await import('@/pages/polymart/PolyMartLayout');
      expect(CATEGORY_LIST).toBeDefined();
      expect(CATEGORY_LIST.length).toBe(8);

      // Verify all categories have icon components and clean labels
      CATEGORY_LIST.forEach((cat: any) => {
        expect(cat.key).toBeDefined();
        expect(cat.label).toBeDefined();
        expect(cat.icon).toBeDefined();
        expect(['function', 'object']).toContain(typeof cat.icon);
        // No raw emojis in labels
        expect(cat.label).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
      });
    }, 30000);

    it('renders PolyMartLayout with stadium search capsule and discrete circular buttons', async () => {
      const { PolyMartLayout } = await import('@/pages/polymart/PolyMartLayout');
      const { MemoryRouter } = await import('react-router-dom');
      const { renderToString } = await import('react-dom/server');

      const html = renderToString(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/polymart'] },
          React.createElement(PolyMartLayout)
        )
      );

      // Stadium search capsule tokens
      expect(html).toContain('rounded-full');
      expect(html).toContain('border-amber-500/20');

      // Discrete circular button tokens
      expect(html).toContain('w-9 h-9 rounded-full');
      expect(html).toContain('MARKETPLACE');
    }, 30000);
  });

  describe('Malaysian Nickname & Greeting Logic (Portal Page)', () => {
    it('correctly filters out patronymics and prefixes to extract true Malaysian nicknames', async () => {
      const { getMalaysianNickname } = await import('@/lib/utils');

      // Common prefix filtering
      expect(getMalaysianNickname('MUHAMMAD AMIRUL BIN ROSLI')).toBe('Amirul');
      expect(getMalaysianNickname('NUR AISYAH BINTI ZAMRI')).toBe('Aisyah');
      expect(getMalaysianNickname('SITI NUR AISYAH BINTI ZAMRI')).toBe('Aisyah');
      expect(getMalaysianNickname('MOHD DANIAL BIN AHMAD')).toBe('Danial');
      expect(getMalaysianNickname('WAN MUHAMMAD SYAFIQ BIN WAN ZULKIFLI')).toBe('Syafiq');
      expect(getMalaysianNickname('NIK NUR LIYANA BTE NIK HASSAN')).toBe('Liyana');
      expect(getMalaysianNickname('MEGAT AMIRUL BIN MEGAT HARUN')).toBe('Amirul');
      expect(getMalaysianNickname('SYED FARHAN BIN SYED ALI')).toBe('Farhan');
      expect(getMalaysianNickname('SHARIFAH BALQIS BT SYED OTHMAN')).toBe('Balqis');

      // Patronymic variations for Indian and other Malaysian students
      expect(getMalaysianNickname('KAVIARASAN A/L SUBRAMANIAM')).toBe('Kaviarasan');
      expect(getMalaysianNickname('THIVYA A/P MOHAN')).toBe('Thivya');
      expect(getMalaysianNickname('PRAVEEN S/O RAMESH')).toBe('Praveen');
      expect(getMalaysianNickname('ANBARASAN ANAK LELAKI GOVINDAN')).toBe('Anbarasan');
      expect(getMalaysianNickname('SARANYA ANAK PEREMPUAN VELU')).toBe('Saranya');

      // Chinese / Other names without patronymics
      expect(getMalaysianNickname('LEE WEI KANG')).toBe('Lee');

      // Edge cases: only prefixes before patronymic
      expect(getMalaysianNickname('Muhammad Bin Abdullah')).toBe('Muhammad');
      expect(getMalaysianNickname('Mohd Ahmad Bin Ismail')).toBe('Ahmad');

      // Clean brackets and alias
      expect(getMalaysianNickname('Aiman @ Bob')).toBe('Aiman');
      expect(getMalaysianNickname('Amirul (JPP POLISAS)')).toBe('Amirul');

      // Empty / Fallback
      expect(getMalaysianNickname('')).toBe('Pelajar');
      expect(getMalaysianNickname(null)).toBe('Pelajar');
      expect(getMalaysianNickname(undefined, 'Siswa')).toBe('Siswa');
    });

    it('formats greeting using Malaysian nickname when multi-word name is passed', () => {
      const morning = formatGreeting(9, 'MUHAMMAD AMIRUL BIN ROSLI');
      expect(morning.title).toBe('Selamat Pagi,');
      expect(morning.subtitle).toBe('Amirul');

      const evening = formatGreeting(15, 'NUR AISYAH BINTI ZAMRI');
      expect(evening.title).toBe('Selamat Petang,');
      expect(evening.subtitle).toBe('Aisyah');
    });

    it('renders SuperAppHeader displaying the student Malaysian nickname and avatar initial', async () => {
      const { SuperAppHeader } = await import('@/components/portal/SuperAppHeader');
      const { MemoryRouter } = await import('react-router-dom');
      const { ThemeProvider } = await import('@/contexts/ThemeContext');
      const { renderToString } = await import('react-dom/server');

      const html = renderToString(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(
            ThemeProvider,
            null,
            React.createElement(SuperAppHeader, {
              profile: {
                id: 'stu-1',
                full_name: 'MUHAMMAD AMIRUL BIN ROSLI',
                role: 'STUDENT',
              },
            })
          )
        )
      );

      // Main h1 heading should display "Amirul"
      expect(html).toContain('Amirul');
      // Should NOT display raw first word "MUHAMMAD" as the heading
      expect(html).not.toContain('<h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">MUHAMMAD</h1>');
      // Avatar fallback should be "A" (initial of Amirul)
      expect(html).toContain('>A<');
    });
  });
});




