import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n, { changeLanguage } from '@/lib/i18n';
import fs from 'fs';
import path from 'path';

// Polyfills for Node environment
if (typeof globalThis.localStorage === 'undefined') {
  let store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

if (typeof globalThis.sessionStorage === 'undefined') {
  let store: Record<string, string> = {};
  (globalThis as any).sessionStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    documentElement: {
      lang: 'en',
    },
    body: {
      style: {},
      click: vi.fn(),
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    location: { search: '', pathname: '/', href: 'http://localhost/', origin: 'http://localhost/' },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    open: vi.fn(),
    confirm: vi.fn().mockReturnValue(true),
  };
}

// Mock react-dom createPortal for Node SSR environment
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<any>('react-dom');
  return {
    ...actual,
    createPortal: (children: any) => children,
  };
});

// Mock third-party libraries that fail in Node SSR
vi.mock('leaflet', () => {
  function IconConstructor() {}
  IconConstructor.Default = {
    prototype: {},
    mergeOptions: vi.fn(),
  };
  return {
    default: {
      Icon: IconConstructor,
      divIcon: vi.fn(),
      latLngBounds: vi.fn(() => ({ extend: vi.fn() })),
    },
    Icon: IconConstructor,
    divIcon: vi.fn(),
    latLngBounds: vi.fn(() => ({ extend: vi.fn() })),
  };
});

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-map-container' }, children),
  TileLayer: () => React.createElement('div', { 'data-testid': 'mock-tile-layer' }),
  Marker: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-marker' }, children),
  Popup: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-popup' }, children),
  Polyline: () => React.createElement('div', { 'data-testid': 'mock-polyline' }),
  useMap: () => ({ fitBounds: vi.fn(), setView: vi.fn() }),
  useMapEvents: () => ({}),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-responsive-container' }, children),
  AreaChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-area-chart' }, children),
  Area: () => null,
  BarChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-bar-chart' }, children),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
  ReferenceLine: () => null,
}));

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,mockcanvas',
  }),
}));

vi.mock('embla-carousel-react', () => ({
  default: () => [vi.fn(), { scrollPrev: vi.fn(), scrollNext: vi.fn() }],
}));

vi.mock('@/components/klk/KlkHotspotMap', () => ({
  KlkHotspotMap: () => React.createElement('div', { 'data-testid': 'mock-klk-hotspot-map' }),
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: any) => React.createElement('div', null, children),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            })),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            single: vi.fn().mockResolvedValue({ data: null }),
          })),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          single: vi.fn().mockResolvedValue({ data: null }),
          limit: vi.fn().mockResolvedValue({ data: [] }),
          in: vi.fn().mockResolvedValue({ data: [] }),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
          then: vi.fn((cb: any) => Promise.resolve(cb({ data: [] }))),
        })),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        single: vi.fn().mockResolvedValue({ data: null }),
        in: vi.fn().mockResolvedValue({ data: [] }),
        then: vi.fn((cb: any) => Promise.resolve(cb({ data: [], count: 0 }))),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    })),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/asset.png' } }),
      })),
    },
  },
}));

// Mock Auth Context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'student@polisas.edu.my' },
    profile: {
      id: 'test-user-id',
      full_name: 'Ahmad Faiz',
      matric_no: '03DET22F1001',
      role: 'STUDENT',
      department: 'JKE',
      programme_code: 'DET',
      phone: '0123456789',
      intake_year: 2024,
      intake_period: 1,
    },
    isSuperAdmin: true,
    userClubIds: [],
  }),
}));

// Mock Supsas Context
vi.mock('@/contexts/SupsasContext', () => ({
  useSupsas: () => ({
    edition: { id: 'ed-1', name: 'SUPSAS 2026', tagline: 'Semangat Sukan Polisas', start_date: '2026-11-01' },
    kontingen: [{ id: 'k-1', name: 'Jabatan Kejuruteraan Elektrik', short_code: 'JKE', color: '#3B82F6' }],
    sports: [{ id: 's-1', name: 'Futsal Lelaki' }],
    medalTally: [
      { kontingen_id: 'k-1', name: 'Jabatan Kejuruteraan Elektrik', short_code: 'JKE', color: '#3B82F6', gold: 3, silver: 1, bronze: 2, total_points: 20, total_medals: 6 },
    ],
    isLive: true,
    refetch: vi.fn(),
  }),
}));

// Mock Polymart Context
vi.mock('@/contexts/PolymartContext', () => ({
  usePolymart: () => ({
    cart: [],
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    cartCount: 0,
    cartTotal: 0,
    isCartOpen: false,
    setIsCartOpen: vi.fn(),
  }),
  PolymartProvider: ({ children }: any) => React.createElement('div', null, children),
}));

// Mock Theme Context
vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: any) => React.createElement('div', null, children),
}));

// Mock Push Notifications
vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    isSubscribed: false,
    requestPermission: vi.fn(),
    unsubscribe: vi.fn(),
  }),
}));

// Mock Takwim Hook
vi.mock('@/hooks/useTakwimPusat', () => ({
  useTakwimPusat: () => ({
    items: [],
    loading: false,
    stats: {},
  }),
}));

// Mock Dynamic Fields Hook
vi.mock('@/hooks/useKlkDynamicFields', () => ({
  useKlkDynamicFields: () => ({
    fields: [],
    kawasanList: ['SEMAMBU', 'TAMAN TAS'],
  }),
}));

// Import Target Pages
import { PolyMartHome } from '@/pages/polymart/PolyMartHome';
import { PolyMartCartPage } from '@/pages/polymart/PolyMartCartPage';
import { PolyRentPage } from '@/pages/polyrent/PolyRentPage';
import { PolyMapsPage } from '@/pages/polymaps/PolyMapsPage';
import { PolySuaraPage } from '@/pages/polyservices/PolySuaraPage';
import { AkademikDashboard } from '@/pages/akademik/AkademikDashboard';
import { AkademikCgpa } from '@/pages/akademik/AkademikCgpa';
import { AkademikTakwimPage } from '@/pages/akademik/AkademikTakwimPage';
import { QrMeritManager } from '@/pages/akademik/AkademikQrScan';
import { KlkDashboard } from '@/pages/klk/KlkDashboard';
import { KlkResidencyFormPage } from '@/pages/klk/KlkResidencyFormPage';
import { SupsasLandingPage } from '@/pages/supsas/SupsasLandingPage';
import { SupsasScoreboardPage } from '@/pages/supsas/SupsasScoreboardPage';

describe('Domain 5 & 6 Campus Life (Commerce, Services, Akademik, Housing, SUPSAS) i18n Integration', () => {
  beforeEach(async () => {
    await changeLanguage('ms');
  });

  // ─── 1. DICTIONARY CONTRACT PARITY TESTS ─────────────────────
  describe('Dictionary Contract Parity', () => {
    const namespaces = ['commerce', 'services', 'akademik', 'housing', 'supsas'];

    namespaces.forEach((ns) => {
      it(`verifies 100% key parity between en and ms for namespace: ${ns}`, () => {
        const enPath = path.resolve(__dirname, `../locales/en/${ns}.json`);
        const msPath = path.resolve(__dirname, `../locales/ms/${ns}.json`);

        expect(fs.existsSync(enPath)).toBe(true);
        expect(fs.existsSync(msPath)).toBe(true);

        const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
        const msJson = JSON.parse(fs.readFileSync(msPath, 'utf8'));

        const enKeys = Object.keys(enJson).sort();
        const msKeys = Object.keys(msJson).sort();

        expect(enKeys).toEqual(msKeys);
        expect(enKeys.length).toBeGreaterThan(0);
      });
    });
  });

  // ─── 2. DOM RENDERING IN ENGLISH (en) ─────────────────────────
  describe('English (en) DOM Rendering', () => {
    beforeEach(async () => {
      await changeLanguage('en');
    });

    it('renders PolyMartHome in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polymart']}>
          <I18nextProvider i18n={i18n}>
            <PolyMartHome />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('PolyMart — Campus Student Marketplace');
      expect(html).toContain('Shopping Cart');
    });

    it('renders PolyMartCartPage in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polymart/cart']}>
          <I18nextProvider i18n={i18n}>
            <PolyMartCartPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Shopping Cart');
      expect(html).toContain('Proceed to Checkout');
    });

    it('renders PolyRentPage in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polyrent']}>
          <I18nextProvider i18n={i18n}>
            <PolyRentPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('PolyRent — Asset &amp; Equipment Booking');
      expect(html).toContain('Book Equipment / Venue');
    });

    it('renders PolyMapsPage in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polymaps']}>
          <I18nextProvider i18n={i18n}>
            <PolyMapsPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('PolyMaps — Interactive Campus GPS &amp; Directory');
      expect(html).toContain('Get Walking Directions');
    });

    it('renders PolySuaraPage in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polysuara']}>
          <I18nextProvider i18n={i18n}>
            <PolySuaraPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Moderated Politeknik Student Community');
      expect(html).toContain('Student Discussion Topics');
    });

    it('renders localized delete comment and empty whisper states in PolySuaraPage in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polysuara']}>
          <I18nextProvider i18n={i18n}>
            <PolySuaraPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Reading student thoughts...');
      expect(i18n.t('services:delete_comment')).toBe('Delete Comment');
      expect(i18n.t('services:no_whispers_title')).toBe('No Whispers At This Time');
      expect(i18n.t('services:no_whispers_subtitle')).toBe('Be the first to share a secret.');
      expect(i18n.t('services:whisper_input_placeholder')).toBe('What is on your mind?');
    });

    it('renders AkademikDashboard in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/akademik']}>
          <I18nextProvider i18n={i18n}>
            <AkademikDashboard />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Academic Hub &amp; Timetable Matrix');
      expect(html).toContain('Class Timetable Matrix');
      expect(html).toContain('Current Ongoing Lecture');
    });

    it('renders AkademikCgpa in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/akademik/cgpa']}>
          <I18nextProvider i18n={i18n}>
            <AkademikCgpa />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('GPA &amp; CGPA Calculator');
      expect(html).toContain('Target Graduation CGPA');
    });

    it('renders AkademikTakwimPage in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/akademik/takwim']}>
          <I18nextProvider i18n={i18n}>
            <AkademikTakwimPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Official Examination Calendar');
    });

    it('renders QrMeritManager with populated tokens without throwing TypeError (English)', () => {
      const sampleTokens = [
        {
          id: 'tok-1',
          title: 'Test Token',
          is_active: true,
          verification_pin: '1234',
          current_scans: 5,
          max_scans: 10,
          merit_value: 5,
          cooldown_hours: 1,
        },
      ];

      expect(() => {
        const html = renderToString(
          <MemoryRouter initialEntries={['/akademik']}>
            <I18nextProvider i18n={i18n}>
              <QrMeritManager initialTokens={sampleTokens} />
            </I18nextProvider>
          </MemoryRouter>
        );
        expect(html).toContain('Test Token');
        expect(html).toContain('Hall PIN');
        expect(html).toContain('1234');
        expect(html).toContain('Active');
        expect(html).toContain('Deactivate');
        expect(html).toContain('Delete');
      }).not.toThrow();
    });

    it('renders KlkDashboard in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/klk']}>
          <I18nextProvider i18n={i18n}>
            <KlkDashboard />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('KLK — Off-Campus Housing Locator');
      expect(html).toContain('Browse Verified Rental Houses');
    });

    it('renders KlkResidencyFormPage in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/klk/form']}>
          <I18nextProvider i18n={i18n}>
            <KlkResidencyFormPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Submit Off-Campus Residence Declaration');
    });

    it('renders SupsasLandingPage in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/supsas']}>
          <I18nextProvider i18n={i18n}>
            <SupsasLandingPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Official Medal Standing');
      expect(html).toContain('Match Fixtures &amp; Live Results');
      expect(html).toContain('Sports &amp; Athletics Disciplines');
    });

    it('renders SupsasScoreboardPage in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/supsas/scoreboard']}>
          <I18nextProvider i18n={i18n}>
            <SupsasScoreboardPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Official Medal Standing');
      expect(html).toContain('Gold');
      expect(html).toContain('Silver');
      expect(html).toContain('Bronze');
    });
  });

  // ─── 3. DOM RENDERING IN BAHASA MELAYU (ms) ───────────────────
  describe('Bahasa Melayu (ms) DOM Rendering', () => {
    beforeEach(async () => {
      await changeLanguage('ms');
    });

    it('renders PolyMartHome in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polymart']}>
          <I18nextProvider i18n={i18n}>
            <PolyMartHome />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('PolyMart — Pasaran Digital Warga Siswa');
      expect(html).toContain('Troli Belian');
    });

    it('renders PolyMartCartPage in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polymart/cart']}>
          <I18nextProvider i18n={i18n}>
            <PolyMartCartPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Troli Belian');
      expect(html).toContain('Teruskan ke Pembayaran');
    });

    it('renders PolyRentPage in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polyrent']}>
          <I18nextProvider i18n={i18n}>
            <PolyRentPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('PolyRent — Tempahan Aset &amp; Peralatan');
      expect(html).toContain('Tempah Peralatan / Ruang');
    });

    it('renders PolyMapsPage in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polymaps']}>
          <I18nextProvider i18n={i18n}>
            <PolyMapsPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('PolyMaps — GPS &amp; Direktori Interaktif Kampus');
      expect(html).toContain('Dapatkan Panduan Arah');
    });

    it('renders PolySuaraPage in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polysuara']}>
          <I18nextProvider i18n={i18n}>
            <PolySuaraPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Komuniti Pelajar Politeknik Yang Diselia');
      expect(html).toContain('Topik Perbincangan Pelajar');
    });

    it('renders AkademikDashboard in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/akademik']}>
          <I18nextProvider i18n={i18n}>
            <AkademikDashboard />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Hab Akademik &amp; Matriks Jadual Waktu');
      expect(html).toContain('Matriks Jadual Waktu Kelas');
      expect(html).toContain('Kuliah Sedang Berlangsung');
    });

    it('renders AkademikCgpa in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/akademik/cgpa']}>
          <I18nextProvider i18n={i18n}>
            <AkademikCgpa />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Kalkulator HPA &amp; HPNM');
      expect(html).toContain('Sasaran HPNM Graduasi');
    });

    it('renders AkademikTakwimPage in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/akademik/takwim']}>
          <I18nextProvider i18n={i18n}>
            <AkademikTakwimPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Kalendar Peperiksaan Rasmi');
    });

    it('renders QrMeritManager with populated tokens without throwing TypeError (Bahasa Melayu)', () => {
      const sampleTokens = [
        {
          id: 'tok-1',
          title: 'Test Token',
          is_active: true,
          verification_pin: '1234',
          current_scans: 5,
          max_scans: 10,
          merit_value: 5,
          cooldown_hours: 1,
        },
      ];

      expect(() => {
        const html = renderToString(
          <MemoryRouter initialEntries={['/akademik']}>
            <I18nextProvider i18n={i18n}>
              <QrMeritManager initialTokens={sampleTokens} />
            </I18nextProvider>
          </MemoryRouter>
        );
        expect(html).toContain('Test Token');
        expect(html).toContain('PIN Dewan');
        expect(html).toContain('1234');
        expect(html).toContain('Aktif');
        expect(html).toContain('Nyahaktif');
        expect(html).toContain('Padam');
      }).not.toThrow();
    });

    it('renders localized status badges for inactive and expired tokens in QrMeritManager', async () => {
      const variedTokens = [
        {
          id: 'tok-expired',
          title: 'Expired Token',
          is_active: true,
          expires_at: '2020-01-01T00:00:00.000Z',
          verification_pin: '9999',
          current_scans: 10,
          max_scans: 10,
          merit_value: 2,
          cooldown_hours: 4,
        },
        {
          id: 'tok-inactive',
          title: 'Inactive Token',
          is_active: false,
          verification_pin: '8888',
          current_scans: 0,
          max_scans: 10,
          merit_value: 2,
          cooldown_hours: 4,
        },
      ];

      await changeLanguage('en');
      let htmlEn = renderToString(
        <MemoryRouter initialEntries={['/akademik']}>
          <I18nextProvider i18n={i18n}>
            <QrMeritManager initialTokens={variedTokens} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(htmlEn).toContain('Expired');
      expect(htmlEn).toContain('Inactive');

      await changeLanguage('ms');
      let htmlMs = renderToString(
        <MemoryRouter initialEntries={['/akademik']}>
          <I18nextProvider i18n={i18n}>
            <QrMeritManager initialTokens={variedTokens} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(htmlMs).toContain('Tamat');
      expect(htmlMs).toContain('Tidak Aktif');
    });

    it('renders KlkDashboard in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/klk']}>
          <I18nextProvider i18n={i18n}>
            <KlkDashboard />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('KLK — Panduan Kediaman Luar Kampus');
      expect(html).toContain('Cari Rumah Sewa Disahkan');
    });

    it('renders KlkResidencyFormPage in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/klk/form']}>
          <I18nextProvider i18n={i18n}>
            <KlkResidencyFormPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Hantar Deklarasi Kediaman Luar Kampus');
    });

    it('renders SupsasLandingPage in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/supsas']}>
          <I18nextProvider i18n={i18n}>
            <SupsasLandingPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Pungutan Pingat Rasmi');
      expect(html).toContain('Jadual Perlawanan &amp; Keputusan Langsung');
      expect(html).toContain('Disiplin Sukan &amp; Olahraga');
    });

    it('renders SupsasScoreboardPage in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/supsas/scoreboard']}>
          <I18nextProvider i18n={i18n}>
            <SupsasScoreboardPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Pungutan Pingat Rasmi');
      expect(html).toContain('Emas');
      expect(html).toContain('Perak');
      expect(html).toContain('Gangsa');
      expect(html).toContain('Jabatan Juara Keseluruhan');
    });
  });

  // ─── 4. DYNAMIC LANGUAGE SWITCHING TESTS ─────────────────────
  describe('Dynamic Language Switching Verification', () => {
    it('switches between en and ms dynamically on AkademikDashboard', async () => {
      await changeLanguage('en');
      let htmlEn = renderToString(
        <MemoryRouter initialEntries={['/akademik']}>
          <I18nextProvider i18n={i18n}>
            <AkademikDashboard />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(htmlEn).toContain('Academic Hub &amp; Timetable Matrix');

      await changeLanguage('ms');
      let htmlMs = renderToString(
        <MemoryRouter initialEntries={['/akademik']}>
          <I18nextProvider i18n={i18n}>
            <AkademikDashboard />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(htmlMs).toContain('Hab Akademik &amp; Matriks Jadual Waktu');
    });

    it('switches between en and ms dynamically on SupsasScoreboardPage', async () => {
      await changeLanguage('en');
      let htmlEn = renderToString(
        <MemoryRouter initialEntries={['/supsas/scoreboard']}>
          <I18nextProvider i18n={i18n}>
            <SupsasScoreboardPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(htmlEn).toContain('Official Medal Standing');
      expect(htmlEn).toContain('Gold');

      await changeLanguage('ms');
      let htmlMs = renderToString(
        <MemoryRouter initialEntries={['/supsas/scoreboard']}>
          <I18nextProvider i18n={i18n}>
            <SupsasScoreboardPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(htmlMs).toContain('Pungutan Pingat Rasmi');
      expect(htmlMs).toContain('Emas');
    });
  });
});
