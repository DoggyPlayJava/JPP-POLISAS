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
    createElement: () => ({
      click: vi.fn(),
      setAttribute: vi.fn(),
      style: {},
    }),
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

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toBlob: (cb: any) => cb(new Blob()),
  }),
}));

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
  Tooltip: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-tooltip' }, children),
  useMap: () => ({ fitBounds: vi.fn(), setView: vi.fn(), flyTo: vi.fn(), panTo: vi.fn() }),
  useMapEvents: () => ({}),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => React.createElement('div', null, children),
  AreaChart: ({ children }: any) => React.createElement('div', null, children),
  Area: () => null,
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

vi.mock('@/components/polymaps/Pannellum360Viewer', () => ({
  Pannellum360Viewer: () => React.createElement('div', { 'data-testid': 'mock-pannellum-360' }),
}));

vi.mock('@/components/takwim/TakwimPusatBulkForm', () => ({
  TakwimPusatBulkForm: () => React.createElement('div', { 'data-testid': 'mock-takwim-bulk-form' }),
}));

vi.mock('@/components/takwim/TakwimPusatPDFTemplate', () => ({
  default: () => React.createElement('div', { 'data-testid': 'mock-takwim-pdf' }),
}));

vi.mock('@/components/takwim/DayDetailSheet', () => ({
  DayDetailSheet: () => null,
}));

vi.mock('@/components/ui/FloatingActionDock', () => ({
  FloatingActionDock: () => null,
}));

vi.mock('@/components/kamsis/KamsisSettingsModal', () => ({
  KamsisSettingsModal: () => null,
}));

vi.mock('@/components/foodbank/FoodBankQrPassModal', () => ({
  FoodBankQrPassModal: () => null,
}));

vi.mock('@/components/polysuara/IGStoryExportCard', () => ({
  IGStoryExportCard: () => null,
}));

vi.mock('@/components/program/MeritRasmiReviewPanel', () => ({
  MeritRasmiReviewPanel: () => React.createElement('div', { 'data-testid': 'mock-merit-review' }),
}));

vi.mock('@/pages/akademik/AkademikQrScan', () => ({
  QrMeritManager: () => React.createElement('div', { 'data-testid': 'mock-qr-merit-manager' }),
}));

vi.mock('@/pages/akademik/DemeritManager', () => ({
  DemeritManager: () => React.createElement('div', { 'data-testid': 'mock-demerit-manager' }),
}));

vi.mock('@/pages/jpp/units/KamsisKlkStatsWidget', () => ({
  KamsisKlkStatsWidget: () => React.createElement('div', { 'data-testid': 'mock-kamsis-stats' }),
}));

vi.mock('@/pages/jpp/units/ExcoGenericDashboard', () => ({
  ExcoGenericDashboard: () => React.createElement('div', { 'data-testid': 'mock-generic-dashboard' }),
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
            maybeSingle: vi.fn().mockResolvedValue({ data: { color: '#2E3A2F' } }),
          })),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            })),
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: { color: '#2E3A2F' } }),
          single: vi.fn().mockResolvedValue({ data: null }),
          limit: vi.fn().mockResolvedValue({ data: [] }),
          or: vi.fn(() => ({
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
        })),
        maybeSingle: vi.fn().mockResolvedValue({ data: { color: '#2E3A2F' } }),
        then: vi.fn((cb: any) => Promise.resolve(cb({ data: [], count: 42 }))),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
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
    button: ({ children, className, ...props }: any) => (
      React.createElement('button', { className, ...props }, children)
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'ydp-user-1', email: 'ydp@polisas.edu.my' },
    profile: {
      id: 'ydp-user-1',
      full_name: 'Wan Ahmad Faiz',
      role: 'JPP',
      jpp_position: 'YDP',
      jpp_unit: null,
    },
    effectiveRole: 'JPP',
    isSuperAdmin: true,
    isJppMember: true,
    isAdvisor: false,
    isPresident: false,
    isMT: true,
    isMember: false,
  }),
}));

// Mock JppConfigContext
import { UNIT_CFG, UNIT_ORDER } from '@/pages/jpp/jppConfig';
import { JPP_POSITION_LABELS, JPP_UNIT_LABELS } from '@/types';

vi.mock('@/contexts/JppConfigContext', () => ({
  useJppConfig: () => ({
    positionLabels: JPP_POSITION_LABELS,
    unitLabels: JPP_UNIT_LABELS,
    unitConfig: UNIT_CFG,
    unitOrder: UNIT_ORDER,
    isLoading: false,
    refreshConfig: vi.fn(),
    getPositionLabel: (code: string) => JPP_POSITION_LABELS[code as keyof typeof JPP_POSITION_LABELS] || code,
    getUnitLabel: (code: string) => JPP_UNIT_LABELS[code] || code,
  }),
  JppConfigProvider: ({ children }: any) => children,
}));

// Mock AcademicSessionContext
vi.mock('@/contexts/AcademicSessionContext', () => ({
  useAcademicSession: () => ({
    currentSession: 'Sesi 1 2026/2027',
    availableSessions: ['Sesi 1 2026/2027', 'Sesi 2 2025/2026'],
    isLoading: false,
  }),
}));

// Mock useTakwimPusat
vi.mock('@/hooks/useTakwimPusat', () => ({
  useTakwimPusat: () => ({
    items: [],
    loading: false,
    stats: { KESELURUHAN: 0 },
    refresh: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  }),
}));

// Import Target Pages under test (All 12 Domain 2 Portals)
import { JppFoodBankAdmin } from '@/pages/jpp/JppFoodBankAdmin';
import { JppPolyMapsAdmin } from '@/pages/jpp/JppPolyMapsAdmin';
import { KebajikanUnitDashboard } from '@/pages/jpp/units/KebajikanUnitDashboard';
import { KkUnitDashboard } from '@/pages/jpp/units/KkUnitDashboard';
import { JppAsramaPage } from '@/pages/jpp/JppAsramaPage';
import { JppTakwimPage } from '@/pages/jpp/JppTakwimPage';
import { JppMembersPage } from '@/pages/jpp/JppMembersPage';
import { PolyServicesAdmin } from '@/pages/jpp/PolyServicesAdmin';
import { JppOverviewPage } from '@/pages/jpp/JppOverviewPage';
import { AnnouncementsPage } from '@/pages/jpp/AnnouncementsPage';
import { JppUsersPage } from '@/pages/jpp/JppUsersPage';
import { JppLogsPage } from '@/pages/jpp/JppLogsPage';

function renderPage(ui: React.ReactElement): string {
  return renderToString(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('Task 5: Domain 2 Deep Row-by-Row Localization — Complete 12 Pages Suite', () => {
  const enJppPath = path.resolve(__dirname, '../locales/en/jpp.json');
  const msJppPath = path.resolve(__dirname, '../locales/ms/jpp.json');
  const enCommonPath = path.resolve(__dirname, '../locales/en/common.json');
  const msCommonPath = path.resolve(__dirname, '../locales/ms/common.json');

  describe('Section 1: 100% Dictionary Key Parity and Non-Empty Values', () => {
    it('verifies en/jpp.json and ms/jpp.json have 100% matching keys and non-empty strings', () => {
      const enJson = JSON.parse(fs.readFileSync(enJppPath, 'utf8'));
      const msJson = JSON.parse(fs.readFileSync(msJppPath, 'utf8'));

      const enKeys = Object.keys(enJson).sort();
      const msKeys = Object.keys(msJson).sort();

      expect(enKeys).toEqual(msKeys);

      for (const k of enKeys) {
        expect(typeof enJson[k], `en/jpp.json key ${k} must be string`).toBe('string');
        expect(typeof msJson[k], `ms/jpp.json key ${k} must be string`).toBe('string');
        expect(enJson[k].trim().length, `en/jpp.json key ${k} must not be empty`).toBeGreaterThan(0);
        expect(msJson[k].trim().length, `ms/jpp.json key ${k} must not be empty`).toBeGreaterThan(0);
      }
    });

    it('verifies en/common.json and ms/common.json have 100% matching keys and non-empty strings', () => {
      const enJson = JSON.parse(fs.readFileSync(enCommonPath, 'utf8'));
      const msJson = JSON.parse(fs.readFileSync(msCommonPath, 'utf8'));

      const enKeys = Object.keys(enJson).sort();
      const msKeys = Object.keys(msJson).sort();

      expect(enKeys).toEqual(msKeys);
    });

    it('verifies essential Domain 2 keys across all 12 modules exist in jpp.json', () => {
      const enJson = JSON.parse(fs.readFileSync(enJppPath, 'utf8'));

      const essentialKeys = [
        // Food Bank
        'foodbank_admin',
        'foodbank_subtitle',
        'pass_verification_title',
        'foodbank_tab_applications',
        'foodbank_tab_inventory',
        'foodbank_tab_budget',
        'foodbank_tab_settings',
        // PolyMaps Admin
        'polymaps_admin_title',
        'polymaps_admin_subtitle',
        'polymaps_add_building_btn',
        // Kebajikan Unit Dashboard
        'kebajikan_dashboard_title',
        'kebajikan_dashboard_subtitle',
        // KK Unit Dashboard
        'kk_dashboard_title',
        'kk_dashboard_subtitle',
        // Asrama Page
        'asrama_admin_title',
        'asrama_admin_subtitle',
        // Takwim Page
        'takwim_admin_title',
        'takwim_admin_subtitle',
        // Members Page
        'members_management',
        'active_council',
        // PolyServices Admin
        'services_admin_title',
        'services_admin_subtitle',
        // Overview Page
        'overview_title',
        'overview_subtitle',
        // Announcements Page
        'broadcast_announcements',
        'announcements_subtitle',
        // Users Page
        'users_management',
        'users_subtitle',
        // Logs Page
        'audit_logs',
        'logs_subtitle',
      ];

      for (const key of essentialKeys) {
        expect(enJson, `jpp.json missing key: ${key}`).toHaveProperty(key);
      }
    });
  });

  describe('Section 2: English (en) DOM Rendering for All 12 Pages', () => {
    beforeEach(async () => {
      await changeLanguage('en');
    });

    it('renders 1. JppFoodBankAdmin in English', () => {
      const html = renderPage(<JppFoodBankAdmin />);
      expect(html).toContain('Food Bank Central Control');
      expect(html).toContain('Student Pickup Pass Verification');
    });

    it('renders 2. JppPolyMapsAdmin in English', () => {
      const html = renderPage(<JppPolyMapsAdmin />);
      expect(html).toContain('Campus 360 Map &amp; Building Management');
      expect(html).toContain('Add Building');
    });

    it('renders 3. KebajikanUnitDashboard in English', () => {
      const html = renderPage(<KebajikanUnitDashboard />);
      expect(html).toContain('Welfare &amp; Complaints Unit Dashboard');
      expect(html).toContain('Financial Aid &amp; Emergency Grants');
    });

    it('renders 4. KkUnitDashboard in English', () => {
      const html = renderPage(<KkUnitDashboard />);
      expect(html).toContain('Clubs &amp; Unity Unit Dashboard');
      expect(html).toContain('Clubs &amp; Societies Directory');
    });

    it('renders 5. JppAsramaPage in English', () => {
      const html = renderPage(<JppAsramaPage />);
      expect(html).toContain('Hostel Residential Management');
      expect(html).toContain('Hostel Residents List');
    });

    it('renders 6. JppTakwimPage in English', () => {
      const html = renderPage(<JppTakwimPage />);
      expect(html).toContain('Master Campus Calendar &amp; Academic Schedule');
      expect(html).toContain('Add Academic Event');
    });

    it('renders 7. JppMembersPage in English', () => {
      const html = renderPage(<JppMembersPage />);
      expect(html).toContain('JPP Council Members');
      expect(html).toContain('Active JPP Council Session');
    });

    it('renders 8. PolyServicesAdmin in English', () => {
      const html = renderPage(<PolyServicesAdmin />);
      expect(html).toContain('Campus Services Catalog Management');
      expect(html).toContain('All Services');
    });

    it('renders 9. JppOverviewPage in English', () => {
      const html = renderPage(<JppOverviewPage />);
      expect(html).toContain('Cross-Club Performance Analytics');
      expect(html).toContain('Total Registered Students');
    });

    it('renders 10. AnnouncementsPage in English', () => {
      const html = renderPage(<AnnouncementsPage />);
      expect(html).toContain('Campus Broadcast Center');
      expect(html).toContain('Create Broadcast');
    });

    it('renders 11. JppUsersPage in English', () => {
      const html = renderPage(<JppUsersPage />);
      expect(html).toContain('Student &amp; Staff Accounts');
      expect(html).toContain('Manage User Roles');
    });

    it('renders 12. JppLogsPage in English', () => {
      const html = renderPage(<JppLogsPage />);
      expect(html).toContain('System Audit Trail');
      expect(html).toContain('Live Activity Audit Log');
    });
  });

  describe('Section 3: Bahasa Melayu (ms) DOM Rendering for All 12 Pages', () => {
    beforeEach(async () => {
      await changeLanguage('ms');
    });

    it('renders 1. JppFoodBankAdmin in Bahasa Melayu', () => {
      const html = renderPage(<JppFoodBankAdmin />);
      expect(html).toContain('Kawalan Berpusat Food Bank');
      expect(html).toContain('Pengesahan Pas Pengambilan Mahasiswa');
    });

    it('renders 2. JppPolyMapsAdmin in Bahasa Melayu', () => {
      const html = renderPage(<JppPolyMapsAdmin />);
      expect(html).toContain('Pengurusan Peta 360 &amp; Bangunan Kampus');
      expect(html).toContain('Tambah Bangunan');
    });

    it('renders 3. KebajikanUnitDashboard in Bahasa Melayu', () => {
      const html = renderPage(<KebajikanUnitDashboard />);
      expect(html).toContain('Pusat Kawalan Unit Kebajikan &amp; Aduan');
      expect(html).toContain('Bantuan Kewangan &amp; Kecemasan');
    });

    it('renders 4. KkUnitDashboard in Bahasa Melayu', () => {
      const html = renderPage(<KkUnitDashboard />);
      expect(html).toContain('Pusat Kawalan Unit Kelab &amp; Perpaduan');
      expect(html).toContain('Direktori Kelab &amp; Persatuan');
    });

    it('renders 5. JppAsramaPage in Bahasa Melayu', () => {
      const html = renderPage(<JppAsramaPage />);
      expect(html).toContain('Pengurusan Penginapan Asrama (KAMSIS)');
      expect(html).toContain('Senarai Penghuni Asrama');
    });

    it('renders 6. JppTakwimPage in Bahasa Melayu', () => {
      const html = renderPage(<JppTakwimPage />);
      expect(html).toContain('Takwim Aktiviti Kampus &amp; Jadual Akademik');
      expect(html).toContain('Tambah Acara Takwim');
    });

    it('renders 7. JppMembersPage in Bahasa Melayu', () => {
      const html = renderPage(<JppMembersPage />);
      expect(html).toContain('Senarai Ahli Majlis JPP');
      expect(html).toContain('Sesi Majlis JPP Aktif');
    });

    it('renders 8. PolyServicesAdmin in Bahasa Melayu', () => {
      const html = renderPage(<PolyServicesAdmin />);
      expect(html).toContain('Pengurusan Katalog Perkhidmatan Kampus');
      expect(html).toContain('Semua Perkhidmatan');
    });

    it('renders 9. JppOverviewPage in Bahasa Melayu', () => {
      const html = renderPage(<JppOverviewPage />);
      expect(html).toContain('Analisis Prestasi Rentas-Kelab');
      expect(html).toContain('Jumlah Pelajar Berdaftar');
    });

    it('renders 10. AnnouncementsPage in Bahasa Melayu', () => {
      const html = renderPage(<AnnouncementsPage />);
      expect(html).toContain('Pusat Pengumuman Kampus');
      expect(html).toContain('Cipta Pengumuman');
    });

    it('renders 11. JppUsersPage in Bahasa Melayu', () => {
      const html = renderPage(<JppUsersPage />);
      expect(html).toContain('Akaun Pelajar &amp; Staf');
      expect(html).toContain('Urus Peranan Pengguna');
    });

    it('renders 12. JppLogsPage in Bahasa Melayu', () => {
      const html = renderPage(<JppLogsPage />);
      expect(html).toContain('Jejak Audit Sistem');
      expect(html).toContain('Log Audit Aktiviti Langsung');
    });
  });

  describe('Section 4: Live Dynamic Language Switching (Round-Trip Test)', () => {
    it('switches dynamically between EN and MS on JppPolyMapsAdmin', async () => {
      await changeLanguage('en');
      let html = renderPage(<JppPolyMapsAdmin />);
      expect(html).toContain('Campus 360 Map &amp; Building Management');
      expect(html).not.toContain('Pengurusan Peta 360 &amp; Bangunan Kampus');

      await changeLanguage('ms');
      html = renderPage(<JppPolyMapsAdmin />);
      expect(html).toContain('Pengurusan Peta 360 &amp; Bangunan Kampus');
      expect(html).not.toContain('Campus 360 Map &amp; Building Management');

      await changeLanguage('en');
      html = renderPage(<JppPolyMapsAdmin />);
      expect(html).toContain('Campus 360 Map &amp; Building Management');
    });

    it('switches dynamically between EN and MS on KebajikanUnitDashboard', async () => {
      await changeLanguage('en');
      let html = renderPage(<KebajikanUnitDashboard />);
      expect(html).toContain('Welfare &amp; Complaints Unit Dashboard');
      expect(html).not.toContain('Pusat Kawalan Unit Kebajikan &amp; Aduan');

      await changeLanguage('ms');
      html = renderPage(<KebajikanUnitDashboard />);
      expect(html).toContain('Pusat Kawalan Unit Kebajikan &amp; Aduan');
      expect(html).not.toContain('Welfare &amp; Complaints Unit Dashboard');

      await changeLanguage('en');
      html = renderPage(<KebajikanUnitDashboard />);
      expect(html).toContain('Welfare &amp; Complaints Unit Dashboard');
    });

    it('switches dynamically between EN and MS on KkUnitDashboard', async () => {
      await changeLanguage('en');
      let html = renderPage(<KkUnitDashboard />);
      expect(html).toContain('Clubs &amp; Unity Unit Dashboard');
      expect(html).not.toContain('Pusat Kawalan Unit Kelab &amp; Perpaduan');

      await changeLanguage('ms');
      html = renderPage(<KkUnitDashboard />);
      expect(html).toContain('Pusat Kawalan Unit Kelab &amp; Perpaduan');
      expect(html).not.toContain('Clubs &amp; Unity Unit Dashboard');

      await changeLanguage('en');
      html = renderPage(<KkUnitDashboard />);
      expect(html).toContain('Clubs &amp; Unity Unit Dashboard');
    });

    it('switches dynamically between EN and MS on JppTakwimPage', async () => {
      await changeLanguage('en');
      let html = renderPage(<JppTakwimPage />);
      expect(html).toContain('Master Campus Calendar &amp; Academic Schedule');
      expect(html).not.toContain('Takwim Aktiviti Kampus &amp; Jadual Akademik');

      await changeLanguage('ms');
      html = renderPage(<JppTakwimPage />);
      expect(html).toContain('Takwim Aktiviti Kampus &amp; Jadual Akademik');
      expect(html).not.toContain('Master Campus Calendar &amp; Academic Schedule');

      await changeLanguage('en');
      html = renderPage(<JppTakwimPage />);
      expect(html).toContain('Master Campus Calendar &amp; Academic Schedule');
    });

    it('switches dynamically between EN and MS on JppAsramaPage', async () => {
      await changeLanguage('en');
      let html = renderPage(<JppAsramaPage />);
      expect(html).toContain('Hostel Residential Management');
      expect(html).not.toContain('Pengurusan Penginapan Asrama (KAMSIS)');

      await changeLanguage('ms');
      html = renderPage(<JppAsramaPage />);
      expect(html).toContain('Pengurusan Penginapan Asrama (KAMSIS)');
      expect(html).not.toContain('Hostel Residential Management');

      await changeLanguage('en');
      html = renderPage(<JppAsramaPage />);
      expect(html).toContain('Hostel Residential Management');
    });
  });
});
