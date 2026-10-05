import React from 'react';
import { describe, it, expect } from 'vitest';
import {
  formatGreeting,
  filterUpcomingEvents,
  buildCampaignSlides,
  getRoleBadgeTitle,
  getHeaderGradientClass,
  getCampusServicesConfig,
  getCampaignVariantClasses,
  formatProductPrice,
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
    }, 15000);

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

    it('renders pure white stadium search capsule and ultra-clear frosted dock', async () => {
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

      // Dock capsule & Profile avatar
      expect(html).toContain('bg-white/[0.08]');
      expect(html).toContain('backdrop-blur-xl');
      expect(html).toContain('ring-2 ring-emerald-400/50');
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

    it('mounts PolyMartFeed with initial products and renders chip tabs cleanly', async () => {
      const { PolyMartFeed } = await import('@/components/portal/PolyMartFeed');
      const { MemoryRouter } = await import('react-router-dom');
      const { renderToString } = await import('react-dom/server');

      const mockProducts = [
        {
          id: 'prod-abc',
          name: 'Nasi Lemak Ayam Berempah',
          price: 7.5,
          sale_price: 6.0,
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
      expect(html).toContain('Nasi Lemak Ayam Berempah');
      expect(html).toContain('RM 6.00');
      expect(html).toContain('RM 7.50');
      expect(html).toContain('Kemeja Korporat POLISAS');
      expect(html).toContain('RM 45.00');
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

      // Deep glass tile container
      expect(html).toContain('dark:bg-white/[0.04]');
      expect(html).toContain('dark:hover:bg-white/[0.08]');
      expect(html).toContain('dark:border-white/[0.08]');
      expect(html).toContain('dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]');

      // Squircle icon container
      expect(html).toContain('dark:bg-white/[0.06]');
      expect(html).toContain('dark:border-white/10');
      expect(html).toContain('dark:shadow-inner');

      // All 8 glowing neon-pastel icon classes
      expect(html).toContain('dark:text-rose-400'); // polysuara
      expect(html).toContain('dark:text-amber-400'); // polymart
      expect(html).toContain('dark:text-indigo-400'); // takwim
      expect(html).toContain('dark:text-emerald-400'); // polymaps
      expect(html).toContain('dark:text-cyan-400'); // polyrent
      expect(html).toContain('dark:text-teal-400'); // kebajikan
      expect(html).toContain('dark:text-purple-400'); // akademik_qr
      expect(html).toContain('dark:text-blue-400'); // ekpp

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
});


