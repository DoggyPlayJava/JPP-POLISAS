import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    documentElement: {
      lang: 'en',
    },
    body: {
      style: {},
      click: vi.fn(),
    },
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
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => React.createElement('div', null, children),
  AreaChart: ({ children }: any) => React.createElement('div', null, children),
  Area: () => null,
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

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      React.createElement('div', { className, ...props }, children)
    ),
    h1: ({ children, className, ...props }: any) => (
      React.createElement('h1', { className, ...props }, children)
    ),
    h2: ({ children, className, ...props }: any) => (
      React.createElement('h2', { className, ...props }, children)
    ),
    p: ({ children, className, ...props }: any) => (
      React.createElement('p', { className, ...props }, children)
    ),
    span: ({ children, className, ...props }: any) => (
      React.createElement('span', { className, ...props }, children)
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-exco', email: 'exco@polisas.edu.my' },
    profile: {
      id: 'test-user-exco',
      full_name: 'Ahmad Faiz Exco',
      role: 'JPP',
      jpp_position: 'YDP',
      jpp_unit: 'KEUSAHAWANAN',
      matric_no: '02DAT22F1001',
    },
    effectiveRole: 'JPP',
    isSuperAdmin: true,
    isJppMember: true,
    isAdvisor: false,
    isPresident: false,
    isMT: true,
    isMember: false,
    isLoading: false,
    isAuthenticated: true,
    hasKeusahawananAccess: true,
    hasKebajikanAccess: true,
    hasKebajikanKKAccess: true,
    isUnitKebajikanStaff: false,
    isKediamanExco: false,
    isKebajikanExco: true,
    isYdp: true,
  }),
}));

// Mock BusinessSwitcherContext
vi.mock('@/contexts/BusinessSwitcherContext', () => ({
  useBusinessSwitcher: () => ({
    selectedBusiness: {
      id: 'biz-1',
      name: 'Kafe Siswa POLISAS',
      owner_id: 'test-user-exco',
      category: 'Makanan & Minuman',
      status: 'APPROVED',
    },
    allBusinesses: [
      {
        id: 'biz-1',
        name: 'Kafe Siswa POLISAS',
        owner_id: 'test-user-exco',
        category: 'Makanan & Minuman',
        status: 'APPROVED',
      },
    ],
    canSwitch: true,
    isKeusahawananAdmin: true,
    isLoading: false,
    selectBusiness: vi.fn(),
    refreshBusinesses: vi.fn(),
  }),
  BusinessSwitcherProvider: ({ children }: any) => children,
}));

// Mock ExcoThemeContext
vi.mock('@/contexts/ExcoThemeContext', () => ({
  useExcoTheme: () => ({
    themeColor: '#1B5E20',
    contrastText: '#FFFFFF',
    isDark: true,
    setThemeColor: vi.fn(),
  }),
  ExcoThemeProvider: ({ children }: any) => children,
}));

// Mock ThemeContext
vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: any) => children,
}));

// Mock KarnivalContext
vi.mock('@/contexts/KarnivalContext', () => ({
  useKarnival: () => ({
    edition: {
      id: 'ed-1',
      name: 'Karnival Inovasi & Usahawan POLISAS 2026',
      tagline: 'Kreativiti dan Kebajikan Pemacu Kecemerlangan Kampus',
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
    isActive: true,
    votingOpen: true,
    isLoading: false,
    refreshKarnival: vi.fn(),
  }),
  KarnivalProvider: ({ children }: any) => children,
}));

// Mock useTour
vi.mock('@/hooks/useTour', () => ({
  useTour: () => ({
    runTour: false,
    startTour: vi.fn(),
    closeTour: vi.fn(),
  }),
}));

// Mock useNotificationStore
vi.mock('@/stores/useNotificationStore', () => ({
  useNotificationStore: () => ({
    unreadCount: 0,
    notifications: [],
    fetchNotifications: vi.fn(),
  }),
}));

// Import Target Pages and Components under test
import {
  KeusahawananLayout,
  KeusahawananSidebar,
  LayoutInner,
} from '@/pages/keusahawanan/KeusahawananLayout';
import { KeusahawananPosPage } from '@/pages/keusahawanan/KeusahawananPosPage';
import { KeusahawananInventoryPage } from '@/pages/keusahawanan/KeusahawananInventoryPage';
import { KeusahawananOnboardingPage } from '@/pages/keusahawanan/KeusahawananOnboardingPage';
import { KebajikanLayout } from '@/pages/kebajikan/KebajikanLayout';
import { KebajikanSidebar } from '@/pages/kebajikan/KebajikanSidebar';
import { KebajikanTicketsPage } from '@/pages/kebajikan/KebajikanTicketsPage';
import { KebajikanFoodBankPage } from '@/pages/kebajikan/KebajikanFoodBankPage';
import { KebajikanKafeteriaPage } from '@/pages/kebajikan/KebajikanKafeteriaPage';
import { KarnivalLandingPage } from '@/pages/karnival/KarnivalLandingPage';
import { KarnivalVotePage } from '@/pages/karnival/KarnivalVotePage';
import { KarnivalScoreboard } from '@/pages/karnival/KarnivalScoreboard';
import { SesiBusiness } from '@/pages/keusahawanan/BusinessShiftModule';

function renderPage(ui: React.ReactElement): string {
  return renderToString(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('Task 5: Domain 3 Integration — Exco Units (Keusahawanan, Kebajikan, Karnival) i18n', () => {
  beforeEach(async () => {
    await changeLanguage('en');
  });

  describe('Static Key Contract Compliance', () => {
    const namespaces = ['keusahawanan', 'kebajikan', 'karnival'];

    it('verifies en and ms JSON dictionaries exist and have complete key parity across all 3 modules', () => {
      for (const ns of namespaces) {
        const enPath = path.resolve(__dirname, `../locales/en/${ns}.json`);
        const msPath = path.resolve(__dirname, `../locales/ms/${ns}.json`);

        expect(fs.existsSync(enPath), `en/${ns}.json must exist`).toBe(true);
        expect(fs.existsSync(msPath), `ms/${ns}.json must exist`).toBe(true);

        const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
        const msJson = JSON.parse(fs.readFileSync(msPath, 'utf8'));

        const enKeys = Object.keys(enJson).sort();
        const msKeys = Object.keys(msJson).sort();

        expect(enKeys, `Keys for namespace ${ns} should match exactly between en and ms`).toEqual(msKeys);
      }
    });

    it('verifies all mandatory e-Keusahawanan contract keys are present in both dictionaries', () => {
      const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en/keusahawanan.json'), 'utf8'));
      const msJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/ms/keusahawanan.json'), 'utf8'));

      const requiredKeys = [
        'module_title',
        'module_subtitle',
        'pos_terminal',
        'new_transaction',
        'payment_method_cash',
        'payment_method_qr',
        'payment_method_card',
        'receipt_preview',
        'inventory_management',
        'stock_in',
        'low_stock_warning',
        'daily_sales',
        'monthly_revenue',
        'business_onboarding',
        'business_name',
        'owner_matric',
        'business_category',
        'approval_status',
        'register_business',
      ];

      for (const k of requiredKeys) {
        expect(enJson, `en/keusahawanan.json should have ${k}`).toHaveProperty(k);
        expect(msJson, `ms/keusahawanan.json should have ${k}`).toHaveProperty(k);
        expect(typeof enJson[k]).toBe('string');
        expect(typeof msJson[k]).toBe('string');
        expect(enJson[k].length).toBeGreaterThan(0);
        expect(msJson[k].length).toBeGreaterThan(0);
      }
    });

    it('verifies all mandatory e-Kebajikan contract keys are present in both dictionaries', () => {
      const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en/kebajikan.json'), 'utf8'));
      const msJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/ms/kebajikan.json'), 'utf8'));

      const requiredKeys = [
        'module_title',
        'module_subtitle',
        'ticket_center',
        'submit_complaint',
        'track_ticket',
        'ticket_category_hostel',
        'ticket_category_academic',
        'ticket_category_welfare',
        'ticket_category_cafeteria',
        'ticket_status_open',
        'ticket_status_progress',
        'ticket_status_resolved',
        'sla_response_time',
        'assigned_officer',
        'submit_evidence',
        'foodbank_pantry',
        'request_foodbank',
        'foodbank_eligibility',
        'cafeteria_audits',
      ];

      for (const k of requiredKeys) {
        expect(enJson, `en/kebajikan.json should have ${k}`).toHaveProperty(k);
        expect(msJson, `ms/kebajikan.json should have ${k}`).toHaveProperty(k);
        expect(typeof enJson[k]).toBe('string');
        expect(typeof msJson[k]).toBe('string');
        expect(enJson[k].length).toBeGreaterThan(0);
        expect(msJson[k].length).toBeGreaterThan(0);
      }
    });

    it('verifies all mandatory Karnival contract keys are present in both dictionaries', () => {
      const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en/karnival.json'), 'utf8'));
      const msJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/ms/karnival.json'), 'utf8'));

      const requiredKeys = [
        'module_title',
        'carnival_schedule',
        'live_voting',
        'booth_directory',
        'cast_vote',
        'voted_successfully',
        'one_vote_per_student',
        'vote_category_creative',
        'vote_category_sales',
        'vote_category_service',
        'carnival_scoreboard',
        'top_voted_booth',
        'total_votes_cast',
        'admin_tally',
      ];

      for (const k of requiredKeys) {
        expect(enJson, `en/karnival.json should have ${k}`).toHaveProperty(k);
        expect(msJson, `ms/karnival.json should have ${k}`).toHaveProperty(k);
        expect(typeof enJson[k]).toBe('string');
        expect(typeof msJson[k]).toBe('string');
        expect(enJson[k].length).toBeGreaterThan(0);
        expect(msJson[k].length).toBeGreaterThan(0);
      }
    });
  });

  describe('English (en) Full DOM Rendering', () => {
    beforeEach(async () => {
      await changeLanguage('en');
    });

    it('renders KeusahawananLayout and KeusahawananSidebar with English branding', () => {
      const htmlSidebar = renderPage(<KeusahawananSidebar color="#1B5E20" />);
      expect(htmlSidebar).toContain('e-Entrepreneurship &amp; Student Commerce');
      expect(htmlSidebar).toContain('Student Business &amp; POS');

      const htmlLayout = renderPage(
        <LayoutInner
          themeColor="#1B5E20"
          isSidebarOpen={false}
          setIsSidebarOpen={vi.fn()}
          moduleEnabled={true}
          isSuperAdmin={true}
          hasKeusahawananAccess={true}
          startTour={vi.fn()}
        />
      );
      expect(htmlLayout).toContain('e-Entrepreneurship &amp; Student Commerce');
    });

    it('renders KeusahawananPosPage with English terminal, actions, and payment options', () => {
      const html = renderPage(<KeusahawananPosPage />);
      expect(html).toContain('POS Cashier Terminal');
      expect(html).toContain('New Checkout Sale');
      expect(html).toContain('Cash Payment');
      expect(html).toContain('DuitNow QR Code');
      expect(html).toContain('Debit / Credit Card');
      expect(html).toContain('Official Sales Receipt');
      expect(html).toContain('Product Catalog');
    });

    it('renders KeusahawananInventoryPage with English stock controls and analytics', () => {
      const html = renderPage(<KeusahawananInventoryPage />);
      expect(html).toContain('Inventory Stock Control');
      expect(html).toContain('Stock In / Restock');
      expect(html).toContain('Low Stock Warning');
      expect(html).toContain("Today&#x27;s Total Sales");
      expect(html).toContain('Monthly Revenue');
      expect(html).toContain('Sales &amp; Revenue Analytics');
    });

    it('renders KeusahawananOnboardingPage with English student business registration fields', () => {
      const html = renderPage(<KeusahawananOnboardingPage />);
      expect(html).toContain('Student Business Registration');
      expect(html).toContain('Business / Enterprise Name');
      expect(html).toContain('Student Entrepreneur Matric No.');
      expect(html).toContain('Business Sector');
      expect(html).toContain('Approval Status');
      expect(html).toContain('Register New Business');
    });

    it('renders KebajikanLayout and KebajikanSidebar with English branding', () => {
      const htmlSidebar = renderPage(<KebajikanSidebar />);
      expect(htmlSidebar).toContain('e-Welfare &amp; Public Complaints');
      expect(htmlSidebar).toContain('Welfare &amp; Student Support');

      const htmlLayout = renderPage(<KebajikanLayout />);
      expect(htmlLayout).toContain('e-Welfare &amp; Public Complaints');
    });

    it('renders KebajikanTicketsPage with English ticket center, categories, and badges', () => {
      const html = renderPage(<KebajikanTicketsPage />);
      expect(html).toContain('Welfare Ticket Center');
      expect(html).toContain('Submit New Ticket / Complaint');
      expect(html).toContain('Track Ticket Status');
      expect(html).toContain('SLA Response Target');
      expect(html).toContain('Assigned Welfare Officer');
      expect(html).toContain('Attach Photo / Document Evidence');
      expect(html).toContain('Hostel / Facilities Issue');
      expect(html).toContain('Academic Concern');
      expect(html).toContain('Financial / Health Welfare');
      expect(html).toContain('Cafeteria Hygiene / Pricing');
      expect(html).toContain('Open / Investigating');
      expect(html).toContain('In Progress');
      expect(html).toContain('Resolved');
    });

    it('renders KebajikanFoodBankPage with English pantry, application, and eligibility terms', () => {
      const html = renderPage(<KebajikanFoodBankPage />);
      expect(html).toContain('Student Food Bank Pantry');
      expect(html).toContain('Apply for Food Bank Basket');
      expect(html).toContain('B40 Welfare Eligibility Status');
    });

    it('renders KebajikanKafeteriaPage with English cafeteria audits and category terms', () => {
      const html = renderPage(<KebajikanKafeteriaPage />);
      expect(html).toContain('Cafeteria Hygiene &amp; Price Audits');
      expect(html).toContain('Cafeteria Hygiene / Pricing');
    });

    it('renders KarnivalLandingPage with English carnival title and schedule itinerary', () => {
      const html = renderPage(<KarnivalLandingPage />);
      expect(html).toContain('Campus Carnival &amp; Voting Hub');
      expect(html).toContain('Festival Program Itinerary');
    });

    it('renders KarnivalVotePage with English voting portal and category tags', () => {
      const html = renderPage(<KarnivalVotePage />);
      expect(html).toContain('Real-Time E-Voting');
      expect(html).toContain('Carnival Booths &amp; Stalls');
      expect(html).toContain('Cast Your Vote');
      expect(html).toContain('One verified vote per registered student');
      expect(html).toContain('Most Creative Booth');
      expect(html).toContain('Best Performing Sales Booth');
      expect(html).toContain('Best Customer Hospitality');
    });

    it('renders KarnivalScoreboard with English scoreboard and tally headers', () => {
      const html = renderPage(<KarnivalScoreboard />);
      expect(html).toContain('Live Carnival Scoreboard');
      expect(html).toContain('Total Verified Votes Cast');
      expect(html).toContain('Official Results Tallying');
      expect(html).toContain('Leading Popular Booth');
    });

    it('renders localized shift opening checklist and foodbank claim modals in English', async () => {
      await changeLanguage('en');
      const shiftHtml = renderPage(
        <SesiBusiness
          businessId="biz-1"
          color="#1B5E20"
          profile={{ id: 'test-user-exco', full_name: 'Ahmad Faiz Exco' }}
          initialOpenModal={true}
        />
      );
      expect(shiftHtml).toContain('Opening Checklist');
      expect(shiftHtml).toContain('All products/beverages are prepared');
      expect(shiftHtml).toContain('Equipment in good working condition');

      const foodbankHtml = renderPage(<KebajikanFoodBankPage />);
      expect(foodbankHtml).toContain('Operating Hours:');
      expect(foodbankHtml).toContain('Ready Care Box: Standard Student Rahmah Package');
    });
  });

  describe('Bahasa Melayu (ms) Full DOM Rendering', () => {
    beforeEach(async () => {
      await changeLanguage('ms');
    });

    it('renders KeusahawananLayout and KeusahawananSidebar with Bahasa Melayu branding', () => {
      const htmlSidebar = renderPage(<KeusahawananSidebar color="#1B5E20" />);
      expect(htmlSidebar).toContain('e-Keusahawanan &amp; Perniagaan Pelajar');
      expect(htmlSidebar).toContain('Perniagaan Pelajar &amp; POS');

      const htmlLayout = renderPage(
        <LayoutInner
          themeColor="#1B5E20"
          isSidebarOpen={false}
          setIsSidebarOpen={vi.fn()}
          moduleEnabled={true}
          isSuperAdmin={true}
          hasKeusahawananAccess={true}
          startTour={vi.fn()}
        />
      );
      expect(htmlLayout).toContain('e-Keusahawanan &amp; Perniagaan Pelajar');
    });

    it('renders KeusahawananPosPage with Bahasa Melayu terminal, actions, and payment options', () => {
      const html = renderPage(<KeusahawananPosPage />);
      expect(html).toContain('Terminal Juruwang POS');
      expect(html).toContain('Jualan Kaunter Baharu');
      expect(html).toContain('Bayaran Tunai');
      expect(html).toContain('Kod DuitNow QR');
      expect(html).toContain('Kad Debit / Kredit');
      expect(html).toContain('Resit Jualan Rasmi');
      expect(html).toContain('Katalog Barangan');
    });

    it('renders KeusahawananInventoryPage with Bahasa Melayu stock controls and analytics', () => {
      const html = renderPage(<KeusahawananInventoryPage />);
      expect(html).toContain('Kawalan Stok Inventori');
      expect(html).toContain('Kemasukan Stok / Tambah Stok');
      expect(html).toContain('Amaran Stok Rendah');
      expect(html).toContain('Jumlah Jualan Hari Ini');
      expect(html).toContain('Hasil Jualan Bulanan');
      expect(html).toContain('Analisis Jualan &amp; Hasil');
    });

    it('renders KeusahawananOnboardingPage with Bahasa Melayu student business registration fields', () => {
      const html = renderPage(<KeusahawananOnboardingPage />);
      expect(html).toContain('Pendaftaran Perniagaan Pelajar');
      expect(html).toContain('Nama Perniagaan / Perusahaan');
      expect(html).toContain('No. Matrik Usahawan Pelajar');
      expect(html).toContain('Sektor Perniagaan');
      expect(html).toContain('Status Kelulusan');
      expect(html).toContain('Daftar Perniagaan Baharu');
    });

    it('renders KebajikanLayout and KebajikanSidebar with Bahasa Melayu branding', () => {
      const htmlSidebar = renderPage(<KebajikanSidebar />);
      expect(htmlSidebar).toContain('e-Kebajikan &amp; Aduan Awam');
      expect(htmlSidebar).toContain('Kebajikan &amp; Bantuan Mahasiswa');

      const htmlLayout = renderPage(<KebajikanLayout />);
      expect(htmlLayout).toContain('e-Kebajikan &amp; Aduan Awam');
    });

    it('renders KebajikanTicketsPage with Bahasa Melayu ticket center, categories, and badges', () => {
      const html = renderPage(<KebajikanTicketsPage />);
      expect(html).toContain('Pusat Tiket Aduan Kebajikan');
      expect(html).toContain('Hantar Tiket / Aduan Baharu');
      expect(html).toContain('Semak Status Tiket');
      expect(html).toContain('Sasaran Tempoh SLA');
      expect(html).toContain('Pegawai Kebajikan Bertanggungjawab');
      expect(html).toContain('Lampirkan Gambar / Dokumen Bukti');
      expect(html).toContain('Isu Asrama / Fasiliti');
      expect(html).toContain('Isu Akademik');
      expect(html).toContain('Kebajikan Kewangan / Kesihatan');
      expect(html).toContain('Kebersihan / Harga Kafeteria');
      expect(html).toContain('Dibuka / Siasatan');
      expect(html).toContain('Dalam Tindakan');
      expect(html).toContain('Selesai');
    });

    it('renders KebajikanFoodBankPage with Bahasa Melayu pantry, application, and eligibility terms', () => {
      const html = renderPage(<KebajikanFoodBankPage />);
      expect(html).toContain('Pantri Food Bank Siswa');
      expect(html).toContain('Pohon Bakul Food Bank');
      expect(html).toContain('Status Kelayakan Kebajikan B40');
    });

    it('renders KebajikanKafeteriaPage with Bahasa Melayu cafeteria audits and category terms', () => {
      const html = renderPage(<KebajikanKafeteriaPage />);
      expect(html).toContain('Audit Kebersihan &amp; Harga Kafeteria');
      expect(html).toContain('Kebersihan / Harga Kafeteria');
    });

    it('renders KarnivalLandingPage with Bahasa Melayu carnival title and schedule itinerary', () => {
      const html = renderPage(<KarnivalLandingPage />);
      expect(html).toContain('Karnival Kampus &amp; Hab Pengundian');
      expect(html).toContain('Atur Cara Program Karnival');
    });

    it('renders KarnivalVotePage with Bahasa Melayu voting portal and category tags', () => {
      const html = renderPage(<KarnivalVotePage />);
      expect(html).toContain('E-Undian Masa Nyata');
      expect(html).toContain('Direktori Gerai &amp; Khemah Karnival');
      expect(html).toContain('Hantar Undian Anda');
      expect(html).toContain('Satu undian sah bagi setiap pelajar berdaftar');
      expect(html).toContain('Gerai Paling Kreatif');
      expect(html).toContain('Gerai Jualan Terbaik');
      expect(html).toContain('Layanan Pelanggan Terbaik');
    });

    it('renders KarnivalScoreboard with Bahasa Melayu scoreboard and tally headers', () => {
      const html = renderPage(<KarnivalScoreboard />);
      expect(html).toContain('Papan Skor Karnival Langsung');
      expect(html).toContain('Jumlah Undian Sah Diterima');
      expect(html).toContain('Pusat Kiraan Keputusan Rasmi');
      expect(html).toContain('Gerai Paling Popular Semasa');
    });
  });

  describe('Live Dynamic Language Switching Verification', () => {
    it('dynamically switches KeusahawananPosPage from en to ms and back to en', async () => {
      await changeLanguage('en');
      let html = renderPage(<KeusahawananPosPage />);
      expect(html).toContain('POS Cashier Terminal');
      expect(html).toContain('New Checkout Sale');
      expect(html).not.toContain('Terminal Juruwang POS');

      await changeLanguage('ms');
      html = renderPage(<KeusahawananPosPage />);
      expect(html).toContain('Terminal Juruwang POS');
      expect(html).toContain('Jualan Kaunter Baharu');
      expect(html).not.toContain('POS Cashier Terminal');

      await changeLanguage('en');
      html = renderPage(<KeusahawananPosPage />);
      expect(html).toContain('POS Cashier Terminal');
      expect(html).toContain('New Checkout Sale');
    });

    it('dynamically switches KebajikanTicketsPage from en to ms and back to en', async () => {
      await changeLanguage('en');
      let html = renderPage(<KebajikanTicketsPage />);
      expect(html).toContain('Welfare Ticket Center');
      expect(html).toContain('Submit New Ticket / Complaint');
      expect(html).not.toContain('Pusat Tiket Aduan Kebajikan');

      await changeLanguage('ms');
      html = renderPage(<KebajikanTicketsPage />);
      expect(html).toContain('Pusat Tiket Aduan Kebajikan');
      expect(html).toContain('Hantar Tiket / Aduan Baharu');
      expect(html).not.toContain('Welfare Ticket Center');

      await changeLanguage('en');
      html = renderPage(<KebajikanTicketsPage />);
      expect(html).toContain('Welfare Ticket Center');
      expect(html).toContain('Submit New Ticket / Complaint');
    });

    it('dynamically switches KarnivalScoreboard from en to ms and back to en', async () => {
      await changeLanguage('en');
      let html = renderPage(<KarnivalScoreboard />);
      expect(html).toContain('Live Carnival Scoreboard');
      expect(html).toContain('Total Verified Votes Cast');
      expect(html).not.toContain('Papan Skor Karnival Langsung');

      await changeLanguage('ms');
      html = renderPage(<KarnivalScoreboard />);
      expect(html).toContain('Papan Skor Karnival Langsung');
      expect(html).toContain('Jumlah Undian Sah Diterima');
      expect(html).not.toContain('Live Carnival Scoreboard');

      await changeLanguage('en');
      html = renderPage(<KarnivalScoreboard />);
      expect(html).toContain('Live Carnival Scoreboard');
      expect(html).toContain('Total Verified Votes Cast');
    });
  });
});
