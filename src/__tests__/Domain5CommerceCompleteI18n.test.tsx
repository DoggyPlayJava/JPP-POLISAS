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
    dispatchEvent: vi.fn(),
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

// Mock Leaflet
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
  CircleMarker: () => React.createElement('div', { 'data-testid': 'mock-circle-marker' }),
  useMap: () => ({ fitBounds: vi.fn(), setView: vi.fn(), flyTo: vi.fn(), panTo: vi.fn() }),
  useMapEvents: () => ({}),
}));

// Mock Recharts
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

// Mock QR Code libraries
vi.mock('react-qr-code', () => ({
  default: () => React.createElement('div', { 'data-testid': 'mock-react-qr-code' }),
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
            then: vi.fn((cb: any) => Promise.resolve(cb({ data: [] }))),
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          single: vi.fn().mockResolvedValue({ data: null }),
          limit: vi.fn().mockResolvedValue({ data: [] }),
          in: vi.fn().mockResolvedValue({ data: [] }),
          then: vi.fn((cb: any) => Promise.resolve(cb({ data: [], count: 0 }))),
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
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
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
    },
    isSuperAdmin: true,
    hasKeusahawananAccess: true,
    userClubIds: [],
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
    refetchCounts: vi.fn(),
  }),
  PolymartProvider: ({ children }: any) => React.createElement('div', null, children),
}));

// Mock Tour
vi.mock('@/hooks/useTour', () => ({
  useTour: () => ({
    runTour: false,
    startTour: vi.fn(),
    closeTour: vi.fn(),
  }),
}));

// Target Components
import { VendorOrdersPipeline } from '@/pages/polymart/vendor/VendorOrdersPipeline';
import { PolyMartMyOrders } from '@/pages/polymart/PolyMartMyOrders';
import { PolyMartAdminPanel } from '@/pages/polymart/PolyMartAdminPanel';
import { PolyMartPaymentPage } from '@/pages/polymart/PolyMartPaymentPage';
import { PolyMartProductDetail } from '@/pages/polymart/PolyMartProductDetail';
import { PolyMartVerifyPickup } from '@/pages/polymart/PolyMartVerifyPickup';
import { VendorAnalyticsPromo } from '@/pages/polymart/vendor/VendorAnalyticsPromo';
import { PolyRentPage } from '@/pages/polyrent/PolyRentPage';
import { PolyRentForm } from '@/pages/polyrent/PolyRentForm';
import { PolyMapsPage } from '@/pages/polymaps/PolyMapsPage';

describe('Domain 5: Campus Services & Digital Commerce i18n Complete Suite', () => {
  beforeEach(async () => {
    await changeLanguage('ms');
  });

  // ─── 1. DICTIONARY CONTRACT PARITY TESTS ─────────────────────
  describe('Dictionary Contract Parity', () => {
    const namespaces = ['commerce', 'services', 'housing'];

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

        for (const key of enKeys) {
          expect(typeof enJson[key]).toBe('string');
          expect(typeof msJson[key]).toBe('string');
          expect(enJson[key].trim().length).toBeGreaterThan(0);
          expect(msJson[key].trim().length).toBeGreaterThan(0);
        }
      });
    });
  });

  // ─── 2. DOM RENDERING IN ENGLISH (en) ─────────────────────────
  describe('English (en) DOM Rendering', () => {
    beforeEach(async () => {
      await changeLanguage('en');
    });

    it('renders VendorOrdersPipeline in English with localized pipeline stages and actions', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <VendorOrdersPipeline
              orders={[]}
              loading={false}
              onUpdate={vi.fn()}
              myBusinesses={[{ id: 'biz-1', name: 'Faiz Cafe' }]}
              selectedBizId="biz-1"
            />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Action Required');
      expect(html).toContain('In Preparation');
      expect(html).toContain('Completed &amp; Archived');
      expect(html).not.toContain('Tindakan Diperlukan');
    });

    it('renders PolyMartMyOrders in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <PolyMartMyOrders />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('My Orders');
      expect(html).not.toContain('Pesanan Saya');
    });

    it('renders PolyMartAdminPanel in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <PolyMartAdminPanel />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('PolyMart Admin Panel');
      expect(html).toContain('Reports');
      expect(html).toContain('Ad Management');
      expect(html).not.toContain('Panel Admin PolyMart');
    });

    it('renders PolyMartPaymentPage in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polymart/bayar/order-123']}>
          <I18nextProvider i18n={i18n}>
            <Routes>
              <Route path="/polymart/bayar/:orderId" element={<PolyMartPaymentPage />} />
            </Routes>
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toBeDefined();
    });

    it('renders PolyMartVerifyPickup in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polymart/verify/order-123']}>
          <I18nextProvider i18n={i18n}>
            <Routes>
              <Route path="/polymart/verify/:orderId" element={<PolyMartVerifyPickup />} />
            </Routes>
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toBeDefined();
    });

    it('renders VendorAnalyticsPromo in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <VendorAnalyticsPromo
              orders={[]}
              products={[]}
              myBusinesses={[{ id: 'biz-1', name: 'Faiz Cafe' }]}
              selectedBizId="biz-1"
            />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Store Performance &amp; Promotions');
      expect(html).toContain('View Full Analytics in POS');
      expect(html).not.toContain('Prestasi &amp; Promosi Kedai');
    });

    it('renders PolyRentPage in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <PolyRentPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Find Roommates.');
      expect(html).toContain('Save More.');
      expect(html).not.toContain('Cari Kawan Sewa.');
    });

    it('renders PolyRentForm in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <PolyRentForm onClose={vi.fn()} onSuccess={vi.fn()} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Ad Title');
      expect(html).toContain('Monthly Rent (RM)');
      expect(html).not.toContain('Tajuk Iklan');
    });

    it('renders PolyMapsPage in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <PolyMapsPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Interactive Campus GPS &amp; Directory');
      expect(html).not.toContain('GPS Kampus Interaktif &amp; Direktori');
    });
  });

  // ─── 3. DOM RENDERING IN BAHASA MELAYU (ms) ───────────────────
  describe('Bahasa Melayu (ms) DOM Rendering', () => {
    beforeEach(async () => {
      await changeLanguage('ms');
    });

    it('renders VendorOrdersPipeline in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <VendorOrdersPipeline
              orders={[]}
              loading={false}
              onUpdate={vi.fn()}
              myBusinesses={[{ id: 'biz-1', name: 'Faiz Cafe' }]}
              selectedBizId="biz-1"
            />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Tindakan Diperlukan');
      expect(html).toContain('Sedang Disediakan');
      expect(html).toContain('Selesai &amp; Arkib');
    });

    it('renders PolyMartMyOrders in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <PolyMartMyOrders />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Pesanan Saya');
    });

    it('renders PolyMartAdminPanel in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <PolyMartAdminPanel />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Panel Admin PolyMart');
      expect(html).toContain('Laporan');
      expect(html).toContain('Pengurusan Iklan');
    });

    it('renders VendorAnalyticsPromo in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <VendorAnalyticsPromo
              orders={[]}
              products={[]}
              myBusinesses={[{ id: 'biz-1', name: 'Faiz Cafe' }]}
              selectedBizId="biz-1"
            />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Prestasi &amp; Promosi Kedai');
      expect(html).toContain('Lihat Analitik Penuh di POS');
    });

    it('renders PolyRentPage in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <PolyRentPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Cari Kawan Sewa.');
      expect(html).toContain('Lebih Jimat.');
    });

    it('renders PolyRentForm in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <PolyRentForm onClose={vi.fn()} onSuccess={vi.fn()} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Tajuk Iklan');
      expect(html).toContain('Sewa Bulanan (RM)');
    });

    it('renders PolyMapsPage in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <PolyMapsPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('GPS Kampus Interaktif &amp; Direktori');
    });
  });

  // ─── 4. DYNAMIC LANGUAGE SWITCHING ────────────────────────────
  describe('Dynamic Language Switching', () => {
    it('switches between EN and MS seamlessly on VendorOrdersPipeline', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <VendorOrdersPipeline
              orders={[]}
              loading={false}
              onUpdate={vi.fn()}
              myBusinesses={[{ id: 'biz-1', name: 'Faiz Cafe' }]}
              selectedBizId="biz-1"
            />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Action Required');
      expect(html).not.toContain('Tindakan Diperlukan');

      await changeLanguage('ms');
      html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <VendorOrdersPipeline
              orders={[]}
              loading={false}
              onUpdate={vi.fn()}
              myBusinesses={[{ id: 'biz-1', name: 'Faiz Cafe' }]}
              selectedBizId="biz-1"
            />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Tindakan Diperlukan');
      expect(html).not.toContain('Action Required');
    });
  });
});
