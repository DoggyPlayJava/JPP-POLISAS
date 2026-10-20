import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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

// Mock React.lazy for SSR
vi.spyOn(React, 'lazy').mockImplementation((_loader: any) => {
  return ((_props: any) => null) as any;
});

// Mock react-dom createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<any>('react-dom');
  return {
    ...actual,
    createPortal: (children: any) => children,
  };
});

// Mock html5-qrcode
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => React.createElement('div', { className: 'recharts-responsive-container' }, children),
  BarChart: ({ children }: any) => React.createElement('div', { className: 'recharts-bar-chart' }, children),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  PieChart: ({ children }: any) => React.createElement('div', { className: 'recharts-pie-chart' }, children),
  Pie: ({ children }: any) => React.createElement('div', { className: 'recharts-pie' }, children),
  Cell: () => null,
  Legend: () => null,
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      React.createElement('div', { className, style, ...props }, children)
    ),
    h1: ({ children, className, ...props }: any) => (
      React.createElement('h1', { className, ...props }, children)
    ),
    h2: ({ children, className, ...props }: any) => (
      React.createElement('h2', { className, ...props }, children)
    ),
    h3: ({ children, className, ...props }: any) => (
      React.createElement('h3', { className, ...props }, children)
    ),
    p: ({ children, className, ...props }: any) => (
      React.createElement('p', { className, ...props }, children)
    ),
    button: ({ children, className, ...props }: any) => (
      React.createElement('button', { className, ...props }, children)
    ),
    span: ({ children, className, ...props }: any) => (
      React.createElement('span', { className, ...props }, children)
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockFrom = vi.fn((_tableName: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockResolvedValue({ data: [] }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          limit: vi.fn().mockResolvedValue({ data: [] }),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
        })),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'biz-123',
            name: 'Pusat Usahawan Siswa POLISAS',
            status: 'APPROVED',
            is_active: true,
            value: '0123456789',
          },
          error: null,
        }),
        limit: vi.fn().mockResolvedValue({ data: [] }),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
      })),
      order: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ data: [] }),
      })),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'biz-123',
          name: 'Pusat Usahawan Siswa POLISAS',
          status: 'APPROVED',
          is_active: true,
          value: '0123456789',
        },
        error: null,
      }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      limit: vi.fn().mockResolvedValue({ data: [] }),
    })),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }));

  return {
    supabase: {
      from: mockFrom,
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      })),
      removeChannel: vi.fn(),
    },
  };
});

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'student@polisas.edu.my' },
    profile: {
      id: 'user-123',
      full_name: 'Muhammad Farhan',
      matric_no: '03DET22F1001',
      role: 'STUDENT',
    },
    isSuperAdmin: false,
    hasKeusahawananAccess: true,
  }),
}));

// Mock ExcoThemeContext
vi.mock('@/contexts/ExcoThemeContext', () => ({
  useExcoTheme: () => ({
    color: '#1B5E20',
    title: 'Exco Keusahawanan',
    subtitle: 'Siswa Digital Hub',
  }),
}));

// Mock BusinessSwitcherContext
vi.mock('@/contexts/BusinessSwitcherContext', () => ({
  useBusinessSwitcher: () => ({
    activeBusiness: {
      id: 'biz-123',
      name: 'Siswapreneur Cafe',
      category: 'Food',
      status: 'APPROVED',
      is_active: true,
    },
    selectedBusiness: {
      id: 'biz-123',
      name: 'Siswapreneur Cafe',
      category: 'Food',
      status: 'APPROVED',
      is_active: true,
    },
    businesses: [
      { id: 'biz-123', name: 'Siswapreneur Cafe', category: 'Food', status: 'APPROVED', is_active: true },
    ],
    setActiveBusinessId: vi.fn(),
    isLoading: false,
    refetchBusinesses: vi.fn(),
  }),
}));

// Mock usePosData
vi.mock('@/hooks/usePosData', () => ({
  usePosData: () => ({
    transactions: [
      {
        id: 'tx-123',
        invoice_number: 'INV-2026-001',
        customer_name: 'Ahmad Faiz',
        payment_method: 'CASH',
        status: 'PAID',
        total_amount: 15.5,
        created_at: new Date().toISOString(),
        items: [
          { id: 'item-1', product_name: 'Nasi Lemak Ayam', quantity: 1, unit_price: 15.5, subtotal: 15.5 },
        ],
      },
    ],
    summary: {
      todaySales: 150.0,
      todayTxCount: 10,
      todayItemsSold: 25,
      netSales: 140.0,
    },
    expenses: [
      { id: 'exp-1', title: 'Beras & Ayam', amount: 50, category: 'BAHAN_MENTAH', date: new Date().toISOString() },
    ],
    products: [
      { id: 'p-1', name: 'Nasi Lemak Ayam', price: 15.5, total_cost: 10.0, stock_quantity: 25 },
    ],
    isLoading: false,
    addExpense: vi.fn().mockResolvedValue(true),
    deleteExpense: vi.fn().mockResolvedValue(true),
    voidTransaction: vi.fn().mockResolvedValue(true),
    refundTransaction: vi.fn().mockResolvedValue(true),
  }),
}));

// Mock useBusinessData
vi.mock('@/hooks/useBusinessData', () => ({
  useBusinessData: () => ({
    categories: [
      { id: 'cat-1', name: 'Makanan & Minuman' },
      { id: 'cat-2', name: 'Pakaian & Fesyen' },
    ],
    businesses: [
      { id: 'biz-1', name: 'Kedai Siswa 1', category_id: 'cat-1', is_active: true },
    ],
    myMemberships: [],
    isLoading: false,
    createBusiness: vi.fn().mockResolvedValue({ id: 'biz-new' }),
    joinBusiness: vi.fn().mockResolvedValue(true),
    refresh: vi.fn(),
  }),
}));

// Mock PolyMartLayout context & utilities
vi.mock('@/pages/polymart/PolyMartLayout', () => ({
  PM_ACCENT: '#1B5E20',
  PM_LIGHT: '#E8F5E9',
  PM_GRADIENT: 'from-emerald-600 to-teal-700',
  CATEGORY_ICON_MAP: {},
  usePolymart: () => ({
    cart: [],
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    wishlistCount: 2,
    activeBusiness: { id: 'biz-123', name: 'Siswapreneur Cafe' },
    isVendor: true,
    userBusinesses: [{ id: 'biz-123', name: 'Siswapreneur Cafe', is_active: true }],
    categories: [{ id: 'cat-1', name: 'Makanan & Minuman', slug: 'food' }],
    refetchCounts: vi.fn(),
  }),
}));

// Import Components Under Test
import { KeusahawananOnboarding } from '@/pages/keusahawanan/KeusahawananOnboarding';
import { KeusahawananPoster } from '@/pages/keusahawanan/KeusahawananPoster';
import { KeusahawananIdea, KeusahawananGeran, KeusahawananLaporan } from '@/pages/keusahawanan/KeusahawananPlaceholders';
import { KeusahawananHubLanding } from '@/pages/jpp/KeusahawananHubLanding';
import { PosHistoryPage } from '@/pages/keusahawanan/pos/PosHistoryPage';
import { PosScannerModal } from '@/pages/keusahawanan/pos/PosScannerModal';
import { PosStatsPage } from '@/pages/keusahawanan/pos/PosStatsPage';
import { PolyMartVendorDashboard } from '@/pages/polymart/PolyMartVendorDashboard';
import { PolyMartVendorStorefront } from '@/pages/polymart/PolyMartVendorStorefront';
import { PolyMartWishlist } from '@/pages/polymart/PolyMartWishlist';
import { PolyMartChat } from '@/pages/polymart/PolyMartChat';

async function renderWithI18n(ui: React.ReactElement, lang: 'ms' | 'en', route = '/') {
  await changeLanguage(lang);
  return renderToString(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </I18nextProvider>
  );
}

const mockVendorBusiness: any = {
  id: 'biz-123',
  name: 'Siswapreneur Cafe',
  description: 'Kedai makanan dan minuman siswa POLISAS',
  category_id: 'cat-1',
  owner_id: 'user-123',
  status: 'APPROVED',
  logo_url: null,
  cover_url: null,
  is_active: true,
  is_ems_siswapreneur: true,
  ssm_registration_number: '202601001234',
  business_phone: '0123456789',
};

describe('Sweep Group 4: Student Entrepreneurship, POS & PolyMart Marketplace i18n Complete Suite', () => {
  beforeEach(async () => {
    await changeLanguage('ms');
  });

  describe('1. Dictionary Parity & Quality Standards', () => {
    it('keusahawanan.json has exact key parity and non-empty strings between ms and en', () => {
      const msJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/ms/keusahawanan.json'), 'utf-8'));
      const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en/keusahawanan.json'), 'utf-8'));
      const msKeys = Object.keys(msJson).sort();
      const enKeys = Object.keys(enJson).sort();

      expect(msKeys).toEqual(enKeys);
      expect(msKeys.length).toBeGreaterThanOrEqual(600);

      for (const key of msKeys) {
        expect(typeof msJson[key]).toBe('string');
        expect(typeof enJson[key]).toBe('string');
        expect(msJson[key].trim().length).toBeGreaterThan(0);
        expect(enJson[key].trim().length).toBeGreaterThan(0);
      }
    });

    it('commerce.json has exact key parity and non-empty strings between ms and en', () => {
      const msJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/ms/commerce.json'), 'utf-8'));
      const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en/commerce.json'), 'utf-8'));
      const msKeys = Object.keys(msJson).sort();
      const enKeys = Object.keys(enJson).sort();

      expect(msKeys).toEqual(enKeys);
      expect(msKeys.length).toBeGreaterThanOrEqual(500);

      for (const key of msKeys) {
        expect(typeof msJson[key]).toBe('string');
        expect(typeof enJson[key]).toBe('string');
        expect(msJson[key].trim().length).toBeGreaterThan(0);
        expect(enJson[key].trim().length).toBeGreaterThan(0);
      }
    });

    it('common.json has exact key parity and non-empty strings between ms and en', () => {
      const msJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/ms/common.json'), 'utf-8'));
      const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en/common.json'), 'utf-8'));
      const msKeys = Object.keys(msJson).sort();
      const enKeys = Object.keys(enJson).sort();

      expect(msKeys).toEqual(enKeys);
      for (const key of msKeys) {
        expect(msJson[key].trim().length).toBeGreaterThan(0);
        expect(enJson[key].trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('2. KeusahawananOnboarding Localization', () => {
    it('renders Malay onboarding notices and options', async () => {
      const html = await renderWithI18n(<KeusahawananOnboarding />, 'ms');
      expect(html).toContain('Sistem Keusahawanan');
      expect(html).toContain('Platform rasmi pengurusan perniagaan pelajar Polisas.');
      expect(html).toContain('Sertai Perniagaan');
      expect(html).toContain('Cipta Perniagaan');
    });

    it('renders English onboarding notices and options', async () => {
      const html = await renderWithI18n(<KeusahawananOnboarding />, 'en');
      expect(html).toContain('Entrepreneurship System');
      expect(html).toContain('Official student business management platform of Polisas.');
      expect(html).toContain('Join a Business');
      expect(html).toContain('Create a Business');
    });
  });

  describe('3. KeusahawananPoster Localization', () => {
    it('renders Malay poster content and call to actions', async () => {
      const html = await renderWithI18n(<KeusahawananPoster />, 'ms');
      expect(html).toContain('Kembali');
      expect(html).toContain('Perhatian Usahawan!');
      expect(html).toContain('Pendaftaran &amp; Kemaskini Profil Perniagaan');
      expect(html).toContain('Daftar Sekarang!');
      expect(html).toContain('Kenapa Perlu Daftar / Kemaskini?');
    });

    it('renders English poster content and call to actions', async () => {
      const html = await renderWithI18n(<KeusahawananPoster />, 'en');
      expect(html).toContain('Back');
      expect(html).toContain('Entrepreneurs Attention!');
      expect(html).toContain('Business Profile Registration &amp; Update');
      expect(html).toContain('Register Now!');
      expect(html).toContain('Why Register / Update?');
    });
  });

  describe('4. KeusahawananPlaceholders Localization', () => {
    it('renders Malay placeholders for Idea, Grant, and Reports', async () => {
      const htmlIdea = await renderWithI18n(<KeusahawananIdea />, 'ms');
      expect(htmlIdea).toContain('Cadangan Idea');
      expect(htmlIdea).toContain('Sedang dalam pembangunan');

      const htmlGeran = await renderWithI18n(<KeusahawananGeran />, 'ms');
      expect(htmlGeran).toContain('Geran &amp; Hadiah');
      expect(htmlGeran).toContain('Sedang dalam pembangunan');

      const htmlLaporan = await renderWithI18n(<KeusahawananLaporan />, 'ms');
      expect(htmlLaporan).toContain('Laporan');
      expect(htmlLaporan).toContain('Sedang dalam pembangunan');
    });

    it('renders English placeholders for Idea, Grant, and Reports', async () => {
      const htmlIdea = await renderWithI18n(<KeusahawananIdea />, 'en');
      expect(htmlIdea).toContain('Idea Proposal');
      expect(htmlIdea).toContain('Under development');

      const htmlGeran = await renderWithI18n(<KeusahawananGeran />, 'en');
      expect(htmlGeran).toContain('Grants &amp; Prizes');
      expect(htmlGeran).toContain('Under development');

      const htmlLaporan = await renderWithI18n(<KeusahawananLaporan />, 'en');
      expect(htmlLaporan).toContain('Reports');
      expect(htmlLaporan).toContain('Under development');
    });
  });

  describe('5. KeusahawananHubLanding Localization', () => {
    it('renders Malay titles, back button, and hub cards', async () => {
      const html = await renderWithI18n(<KeusahawananHubLanding />, 'ms');
      expect(html).toContain('Kembali ke Induk');
      expect(html).toContain('Hab');
      expect(html).toContain('Keusahawanan');
      expect(html).toContain('e-Keusahawanan');
      expect(html).toContain('PolyTask (Ekonomi Gig)');
      expect(html).toContain('Buka Modul');
    });

    it('renders English titles, back button, and hub cards', async () => {
      const html = await renderWithI18n(<KeusahawananHubLanding />, 'en');
      expect(html).toContain('Back to Main');
      expect(html).toContain('Entrepreneurship');
      expect(html).toContain('Hub');
      expect(html).toContain('e-Entrepreneurship');
      expect(html).toContain('PolyTask (Gig Economy)');
      expect(html).toContain('Open Module');
    });
  });

  describe('6. PosHistoryPage Localization', () => {
    it('renders Malay history header, search placeholder, and action buttons', async () => {
      const html = await renderWithI18n(<PosHistoryPage />, 'ms');
      expect(html).toContain('Sejarah Transaksi');
      expect(html).toContain('placeholder="Cari no. invois atau pelanggan..."');
      expect(html).toContain('Semua');
      expect(html).toContain('Tunai');
    });

    it('renders English history header, search placeholder, and action buttons', async () => {
      const html = await renderWithI18n(<PosHistoryPage />, 'en');
      expect(html).toContain('Transaction History');
      expect(html).toContain('placeholder="Search invoice no. or customer..."');
      expect(html).toContain('All');
      expect(html).toContain('Cash');
    });
  });

  describe('7. PosScannerModal Localization', () => {
    it('renders Malay scanner title, subtitle, and camera indicator', async () => {
      const html = await renderWithI18n(
        <PosScannerModal isOpen={true} onClose={() => {}} onDetected={() => {}} />,
        'ms'
      );
      expect(html).toContain('Imbas QR PolyMart');
      expect(html).toContain('Kaunter POS Bersepadu');
      expect(html).toContain('Mod Imbas Pukal (Pantas)');
      expect(html).toContain('Halakan kamera pada Kod QR pesanan pelanggan untuk memulakan semakan');
    });

    it('renders English scanner title, subtitle, and camera indicator', async () => {
      const html = await renderWithI18n(
        <PosScannerModal isOpen={true} onClose={() => {}} onDetected={() => {}} />,
        'en'
      );
      expect(html).toContain('Scan PolyMart QR');
      expect(html).toContain('Integrated POS Counter');
      expect(html).toContain('Bulk Scan Mode (Fast)');
      expect(html).toContain('Point camera at customer&#x27;s order QR Code to start verification');
    });
  });

  describe('8. PosStatsPage Localization', () => {
    it('renders Malay stats KPIs, ads kicker, and expense button', async () => {
      const html = await renderWithI18n(<PosStatsPage />, 'ms');
      expect(html).toContain('Statistik &amp; Analisis');
      expect(html).toContain('Jualan');
      expect(html).toContain('Produk');
      expect(html).toContain('Belanja');
      expect(html).toContain('1 Hari');
      expect(html).toContain('7 Hari');
      expect(html).toContain('Bulan Ini');
    });

    it('renders English stats KPIs, ads kicker, and expense button', async () => {
      const html = await renderWithI18n(<PosStatsPage />, 'en');
      expect(html).toContain('Statistics &amp; Analytics');
      expect(html).toContain('Sales');
      expect(html).toContain('Products');
      expect(html).toContain('Expenses');
      expect(html).toContain('1 Day');
      expect(html).toContain('7 Days');
      expect(html).toContain('This Month');
    });
  });

  describe('9. PolyMartVendorDashboard Localization', () => {
    it('renders Malay vendor dashboard badge, greeting, and order status pills', async () => {
      const html = await renderWithI18n(<PolyMartVendorDashboard />, 'ms');
      expect(html).toContain('Hab Peniaga PolyMart');
      expect(html).toContain('Pusat Kawalan Bersepadu 3 Domain Operasi');
      expect(html).toContain('Pesanan Hari Ini');
    });

    it('renders English vendor dashboard badge, greeting, and order status pills', async () => {
      const html = await renderWithI18n(<PolyMartVendorDashboard />, 'en');
      expect(html).toContain('PolyMart Vendor Hub');
      expect(html).toContain('Integrated Control Centre for 3 Operating Domains');
      expect(html).toContain('Orders Today');
      expect(html).toContain('Awaiting Confirmation');
    });
  });

  describe('10. PolyMartVendorStorefront Localization', () => {
    it('renders Malay back button and storefront tab labels', async () => {
      const html = await renderWithI18n(
        <Routes>
          <Route
            path="/polymart/vendor/:id"
            element={
              <PolyMartVendorStorefront
                initialLoading={false}
                initialBusiness={mockVendorBusiness}
              />
            }
          />
        </Routes>,
        'ms',
        '/polymart/vendor/biz-123'
      );
      expect(html).toContain('aria-label="Kembali"');
      expect(html).toContain('Peniaga Siswa Sah POLISAS');
      expect(html).toContain('Semua Produk');
      expect(html).toContain('Info &amp; Lokasi Ambil');
    });

    it('renders English back button and storefront tab labels', async () => {
      const html = await renderWithI18n(
        <Routes>
          <Route
            path="/polymart/vendor/:id"
            element={
              <PolyMartVendorStorefront
                initialLoading={false}
                initialBusiness={mockVendorBusiness}
              />
            }
          />
        </Routes>,
        'en',
        '/polymart/vendor/biz-123'
      );
      expect(html).toContain('aria-label="Back"');
      expect(html).toContain('POLISAS Verified Student Vendor');
      expect(html).toContain('All Products');
      expect(html).toContain('Info &amp; Pickup Location');
    });
  });

  describe('11. PolyMartWishlist Localization', () => {
    it('renders Malay wishlist headers and empty state', async () => {
      const html = await renderWithI18n(
        <PolyMartWishlist initialLoading={false} initialItems={[]} />,
        'ms'
      );
      expect(html).toContain('Wishlist Saya');
      expect(html).toContain('Wishlist anda kosong');
      expect(html).toContain('Terokai PolyMart');
    });

    it('renders English wishlist headers and empty state', async () => {
      const html = await renderWithI18n(
        <PolyMartWishlist initialLoading={false} initialItems={[]} />,
        'en'
      );
      expect(html).toContain('My Wishlist');
      expect(html).toContain('Your wishlist is empty');
      expect(html).toContain('Explore PolyMart');
    });
  });

  describe('12. PolyMartChat Localization', () => {
    it('renders Malay opening chat message', async () => {
      const html = await renderWithI18n(<PolyMartChat />, 'ms');
      expect(html).toContain('Membuka peti perbualan PolyMart...');
    });

    it('renders English opening chat message', async () => {
      const html = await renderWithI18n(<PolyMartChat />, 'en');
      expect(html).toContain('Opening PolyMart chat inbox...');
    });
  });
});
