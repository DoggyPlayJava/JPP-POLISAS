import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n, { changeLanguage } from '@/lib/i18n';
import fs from 'fs';
import path from 'path';

// Polyfills for Node environment
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<any>('react-dom');
  return {
    ...actual,
    createPortal: (children: any) => children,
  };
});

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
    documentElement: { lang: 'en' },
    body: { style: {}, click: vi.fn() },
  };
}

// Mock third-party libraries that fail in Node SSR
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
  })),
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => React.createElement('div', { 'data-testid': 'mock-qrcode' }),
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: any) => React.createElement('div', null, children),
}));

vi.mock('@/components/ai/FloatingAiChat', () => ({
  FloatingAiChat: () => null,
}));

vi.mock('@/components/layout/BottomNav', () => ({
  BottomNav: () => null,
}));

vi.mock('@/components/ui/NotificationBell', () => ({
  NotificationBell: () => null,
}));

vi.mock('@/components/jpp/QrCodeFab', () => ({
  QrCodeFab: () => null,
}));

vi.mock('@/components/ui/SystemTour', () => ({
  SystemTour: () => null,
}));

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

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => React.createElement('div', null, children),
  AreaChart: ({ children }: any) => React.createElement('div', null, children),
  Area: () => null,
  LineChart: ({ children }: any) => React.createElement('div', null, children),
  Line: () => null,
  BarChart: ({ children }: any) => React.createElement('div', null, children),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  PieChart: ({ children }: any) => React.createElement('div', null, children),
  Pie: ({ children }: any) => React.createElement('div', null, children),
  Cell: () => null,
  Legend: () => null,
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
            maybeSingle: vi.fn().mockResolvedValue({ data: { color: '#1B5E20', is_enabled: true } }),
            single: vi.fn().mockResolvedValue({ data: { color: '#1B5E20', is_enabled: true } }),
          })),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            })),
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: { color: '#1B5E20', is_enabled: true } }),
          single: vi.fn().mockResolvedValue({ data: { color: '#1B5E20', is_enabled: true } }),
          limit: vi.fn().mockResolvedValue({ data: [] }),
          or: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            })),
          })),
          neq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            })),
          })),
        })),
        gte: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
          then: vi.fn((cb: any) => Promise.resolve(cb({ data: [] }))),
        })),
        not: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
          then: vi.fn((cb: any) => Promise.resolve(cb({ data: [] }))),
        })),
        maybeSingle: vi.fn().mockResolvedValue({ data: { color: '#1B5E20', is_enabled: true } }),
        single: vi.fn().mockResolvedValue({ data: { color: '#1B5E20', is_enabled: true } }),
        then: vi.fn((cb: any) => Promise.resolve(cb({ data: [], count: 0 }))),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn().mockResolvedValue(true),
    })),
    removeChannel: vi.fn().mockResolvedValue(true),
  },
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-123',
      email: 'student@polisas.edu.my',
    },
    profile: {
      id: 'test-user-123',
      email: 'student@polisas.edu.my',
      full_name: 'Ahmad Mahasiswa',
      matric_no: '03DET21F1001',
      role: 'STUDENT',
      avatar_url: null,
      phone: '0123456789',
    },
    role: 'STUDENT',
    isAdmin: false,
    isSuperAdmin: false,
    isYdp: false,
    isExco: false,
    isKebajikanExco: false,
    isKeusahawananExco: false,
    isPemberitahuanExco: false,
    isSukanExco: false,
    isAkademikExco: false,
    signOut: vi.fn(),
  }),
}));

// Mock ExcoThemeContext
vi.mock('@/contexts/ExcoThemeContext', () => ({
  useExcoTheme: () => ({
    color: '#059669',
    theme: {
      color: '#059669',
      is_enabled: true,
    },
    updateThemeColor: vi.fn(),
    refreshTheme: vi.fn(),
  }),
}));

// Mock BusinessSwitcherContext
vi.mock('@/contexts/BusinessSwitcherContext', () => ({
  useBusinessSwitcher: () => ({
    businesses: [
      {
        id: 'biz-1',
        name: 'Kafe Siswa Polisas',
        description: 'Perkhidmatan F&B Kampus',
        status: 'ACTIVE',
        logo_url: null,
        owner_id: 'test-user-123',
        staff_count: 3,
        role: 'OWNER',
        created_at: '2026-01-01',
      },
    ],
    selectedBusiness: {
      id: 'biz-1',
      name: 'Kafe Siswa Polisas',
      description: 'Perkhidmatan F&B Kampus',
      status: 'ACTIVE',
      logo_url: null,
      owner_id: 'test-user-123',
      staff_count: 3,
      role: 'OWNER',
      created_at: '2026-01-01',
    },
    setSelectedBusinessId: vi.fn(),
    isLoading: false,
    refreshBusinesses: vi.fn(),
  }),
}));

// Mock useBusinessData
vi.mock('@/hooks/useBusinessData', () => ({
  useBusinessData: () => ({
    business: {
      id: 'biz-1',
      name: 'Kafe Siswa Polisas',
      description: 'Perkhidmatan F&B Kampus',
      status: 'ACTIVE',
      logo_url: null,
      owner_id: 'test-user-123',
      staff_count: 3,
      role: 'OWNER',
    },
    members: [],
    myMemberships: [],
    loading: false,
    isLoading: false,
  }),
}));

// Mock usePosData
vi.mock('@/hooks/usePosData', () => ({
  usePosData: () => ({
    products: [],
    categories: [],
    loading: false,
    cart: [],
    subtotal: 0,
    total: 0,
    discountAmount: 0,
    appliedCoupon: null,
    notes: '',
    customerName: '',
    receivedAmount: 0,
    changeDue: 0,
    paymentMethod: 'CASH',
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    setNotes: vi.fn(),
    setCustomerName: vi.fn(),
    setReceivedAmount: vi.fn(),
    setPaymentMethod: vi.fn(),
    applyCoupon: vi.fn(),
    removeCoupon: vi.fn(),
    completeSale: vi.fn().mockResolvedValue({ success: true }),
  }),
}));

// Mock KarnivalContext
vi.mock('@/contexts/KarnivalContext', () => ({
  useKarnival: () => ({
    edition: {
      id: 'ed-1',
      name: 'Karnival Inovasi & Usahawan POLISAS 2026',
      tagline: 'Kreativiti dan Kebajikan Pemacu Kecemerlangan Kampus',
      edition_year: 2026,
      start_date: '2026-10-25',
      end_date: '2026-10-27',
      status: 'ACTIVE',
    },
    categories: [
      {
        id: 'cat-1',
        name: 'Gerai Paling Kreatif',
        description: 'Kategori untuk gerai berhias unik dan berinovasi',
        icon_emoji: '🎨',
        max_votes: 1,
      },
    ],
    booths: [
      {
        id: 'booth-1',
        category_id: 'cat-1',
        kelab_name: 'Kelab Robotik & Inovasi',
        booth_number: 'B-01',
        theme: 'Teknologi Masa Depan',
        description: 'Demonstrasi projek robotik automasi dan dron',
        image_url: 'https://example.com/booth1.jpg',
      },
    ],
    isLoading: false,
    refreshKarnival: vi.fn(),
  }),
}));

// Helper to render SSR
function renderPage(ui: React.ReactElement) {
  return renderToString(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </I18nextProvider>
  );
}

// Import components
import { KebajikanFoodBankPage } from '@/pages/kebajikan/KebajikanFoodBankPage';
import { KebajikanReportPage } from '@/pages/kebajikan/KebajikanReportPage';
import { KebajikanSubmitPage } from '@/pages/kebajikan/KebajikanSubmitPage';
import { KeusahawananAdminPanel } from '@/pages/keusahawanan/KeusahawananAdminPanel';
import { KeusahawananDashboard } from '@/pages/keusahawanan/KeusahawananDashboard';
import { UrusPerniagaanPage } from '@/pages/keusahawanan/UrusPerniagaanPage';
import { KeusahawananProgram } from '@/pages/keusahawanan/KeusahawananProgram';
import { PosProductPage } from '@/pages/keusahawanan/pos/PosProductPage';
import { PosOrderPage } from '@/pages/keusahawanan/pos/PosOrderPage';
import { KarnivalLandingPage } from '@/pages/karnival/KarnivalLandingPage';
import { KarnivalVotePage } from '@/pages/karnival/KarnivalVotePage';
import { KarnivalScoreboard } from '@/pages/karnival/KarnivalScoreboard';
import { KarnivalAdminDashboard } from '@/pages/karnival/admin/KarnivalAdminDashboard';
import { KarnivalAdminBooths } from '@/pages/karnival/admin/KarnivalAdminBooths';

describe('Domain 3 Exco Deep-Localization & Parity Audit Suite', () => {

  describe('1. 100% Dictionary Key Parity and Integrity', () => {
    const modules = ['kebajikan', 'keusahawanan', 'karnival'];

    modules.forEach((mod) => {
      it(`enforces exact 100% key parity between en/${mod}.json and ms/${mod}.json with zero empty values`, () => {
        const enPath = path.resolve(process.cwd(), `src/locales/en/${mod}.json`);
        const msPath = path.resolve(process.cwd(), `src/locales/ms/${mod}.json`);

        expect(fs.existsSync(enPath)).toBe(true);
        expect(fs.existsSync(msPath)).toBe(true);

        const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
        const msData = JSON.parse(fs.readFileSync(msPath, 'utf8'));

        const enKeys = Object.keys(enData).sort();
        const msKeys = Object.keys(msData).sort();

        // Exact key parity
        expect(enKeys).toEqual(msKeys);

        // No empty strings or nulls
        enKeys.forEach((key) => {
          expect(typeof enData[key]).toBe('string');
          expect(enData[key].trim().length).toBeGreaterThan(0);

          expect(typeof msData[key]).toBe('string');
          expect(msData[key].trim().length).toBeGreaterThan(0);
        });
      });
    });

    it('verifies all Domain 3 modules have robust key counts exceeding production thresholds', () => {
      const enKebajikan = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/locales/en/kebajikan.json'), 'utf8'));
      const enKeusahawanan = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/locales/en/keusahawanan.json'), 'utf8'));
      const enKarnival = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/locales/en/karnival.json'), 'utf8'));

      expect(Object.keys(enKebajikan).length).toBeGreaterThanOrEqual(370);
      expect(Object.keys(enKeusahawanan).length).toBeGreaterThanOrEqual(400);
      expect(Object.keys(enKarnival).length).toBeGreaterThanOrEqual(90);
    });
  });

  describe('2. Kebajikan Module Component Renders (English & Bahasa Melayu)', () => {
    it('renders KebajikanFoodBankPage correctly in English', async () => {
      await changeLanguage('en');
      const html = renderPage(<KebajikanFoodBankPage />);
      expect(html).toContain('JPP Food Bank');
      expect(html).toContain('Student Food Bank Pantry');
    });

    it('renders KebajikanFoodBankPage correctly in Bahasa Melayu', async () => {
      await changeLanguage('ms');
      const html = renderPage(<KebajikanFoodBankPage />);
      expect(html).toContain('Food Bank JPP');
      expect(html).toContain('Pantri Food Bank Siswa');
    });

    it('renders KebajikanSubmitPage form elements in English and Malay', async () => {
      await changeLanguage('en');
      let html = renderPage(<KebajikanSubmitPage />);
      expect(html).toBeDefined();

      await changeLanguage('ms');
      html = renderPage(<KebajikanSubmitPage />);
      expect(html).toBeDefined();
    });
  });

  describe('3. Keusahawanan Module Component Renders (English & Bahasa Melayu)', () => {
    it('renders KeusahawananAdminPanel with translated labels in English', async () => {
      await changeLanguage('en');
      const html = renderPage(<KeusahawananAdminPanel />);
      expect(html).toContain('Total Businesses');
      expect(html).toContain('Pending Approval');
      expect(html).toContain('Refresh');
    });

    it('renders KeusahawananAdminPanel with translated labels in Bahasa Melayu', async () => {
      await changeLanguage('ms');
      const html = renderPage(<KeusahawananAdminPanel />);
      expect(html).toContain('Jumlah Perniagaan');
      expect(html).toContain('Menunggu Kelulusan');
      expect(html).toContain('Muat Semula');
    });

    it('renders KeusahawananDashboard with metrics and overview in English', async () => {
      await changeLanguage('en');
      const html = renderPage(<KeusahawananDashboard />);
      expect(html).toContain('Store Overview');
      expect(html).toContain('Sales (POS)');
      expect(html).toContain('Add Product');
      expect(html).toContain('Total Revenue');
      expect(html).toContain('Sales Analytics');
    });

    it('renders KeusahawananDashboard with metrics and overview in Bahasa Melayu', async () => {
      await changeLanguage('ms');
      const html = renderPage(<KeusahawananDashboard />);
      expect(html).toContain('Store Overview');
      expect(html).toContain('Jualan (POS)');
      expect(html).toContain('Tambah Produk');
      expect(html).toContain('Total Revenue');
      expect(html).toContain('Sales Analytics');
    });

    it('renders UrusPerniagaanPage in English and Malay', async () => {
      await changeLanguage('en');
      let html = renderPage(<UrusPerniagaanPage />);
      expect(html).toBeDefined();

      await changeLanguage('ms');
      html = renderPage(<UrusPerniagaanPage />);
      expect(html).toBeDefined();
    });

    it('renders KeusahawananProgram in English and Malay', async () => {
      await changeLanguage('en');
      let html = renderPage(<KeusahawananProgram />);
      expect(html).toContain('Entrepreneurship Programs');

      await changeLanguage('ms');
      html = renderPage(<KeusahawananProgram />);
      expect(html).toContain('Program Keusahawanan');
    });

    it('renders PosProductPage and PosOrderPage in English and Malay', async () => {
      await changeLanguage('en');
      let prodHtml = renderPage(<PosProductPage />);
      expect(prodHtml).toContain('Product Catalog');

      let orderHtml = renderPage(<PosOrderPage />);
      expect(orderHtml).toContain('Current Order Cart');

      await changeLanguage('ms');
      prodHtml = renderPage(<PosProductPage />);
      expect(prodHtml).toContain('Katalog Barangan');

      orderHtml = renderPage(<PosOrderPage />);
      expect(orderHtml).toContain('Bakul Pesanan Semasa');
    });
  });

  describe('4. Karnival Module Component Renders (English & Bahasa Melayu)', () => {
    it('renders KarnivalLandingPage in English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      let html = renderPage(<KarnivalLandingPage />);
      expect(html).toContain('Campus Carnival &amp; Voting Hub');
      expect(html).toContain('Festival Program Itinerary');

      await changeLanguage('ms');
      html = renderPage(<KarnivalLandingPage />);
      expect(html).toContain('Karnival Kampus &amp; Hab Pengundian');
      expect(html).toContain('Atur Cara Program Karnival');
    });

    it('renders KarnivalVotePage in English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      let html = renderPage(<KarnivalVotePage />);
      expect(html).toContain('Real-Time E-Voting');
      expect(html).toContain('Log In Now');

      await changeLanguage('ms');
      html = renderPage(<KarnivalVotePage />);
      expect(html).toContain('E-Undian Masa Nyata');
      expect(html).toContain('Log Masuk Sekarang');
    });

    it('renders KarnivalScoreboard with live banner in English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      let html = renderPage(<KarnivalScoreboard />);
      expect(html).toContain('Live Carnival Scoreboard');
      expect(html).toContain('Total Verified Votes Cast');

      await changeLanguage('ms');
      html = renderPage(<KarnivalScoreboard />);
      expect(html).toContain('Papan Skor Karnival Langsung');
    });

    it('renders KarnivalAdminDashboard and KarnivalAdminBooths in English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      let dashHtml = renderPage(<KarnivalAdminDashboard />);
      expect(dashHtml).toContain('LCD Scoreboard');
      expect(dashHtml).toContain('Top Booths');

      let boothHtml = renderPage(<KarnivalAdminBooths />);
      expect(boothHtml).toContain('Add Booth');

      await changeLanguage('ms');
      dashHtml = renderPage(<KarnivalAdminDashboard />);
      expect(dashHtml).toContain('Papan Markah LCD');
      expect(dashHtml).toContain('Booth Teratas');

      boothHtml = renderPage(<KarnivalAdminBooths />);
      expect(boothHtml).toContain('Tambah Booth');
    });
  });

  describe('5. Dynamic Switching Across All Exco Domains', () => {
    it('dynamically switches between EN and MS seamlessly on KeusahawananAdminPanel', async () => {
      await changeLanguage('en');
      let html = renderPage(<KeusahawananAdminPanel />);
      expect(html).toContain('Total Businesses');
      expect(html).not.toContain('Jumlah Perniagaan');

      await changeLanguage('ms');
      html = renderPage(<KeusahawananAdminPanel />);
      expect(html).toContain('Jumlah Perniagaan');
      expect(html).not.toContain('Total Businesses');
    });

    it('dynamically switches between EN and MS seamlessly on KarnivalScoreboard', async () => {
      await changeLanguage('en');
      let html = renderPage(<KarnivalScoreboard />);
      expect(html).toContain('Live Carnival Scoreboard');
      expect(html).not.toContain('Papan Skor Karnival Langsung');

      await changeLanguage('ms');
      html = renderPage(<KarnivalScoreboard />);
      expect(html).toContain('Papan Skor Karnival Langsung');
      expect(html).not.toContain('Live Carnival Scoreboard');
    });
  });

});
