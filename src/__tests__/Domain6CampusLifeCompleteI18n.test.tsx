import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n, { changeLanguage } from '@/lib/i18n';
import fs from 'fs';
import path from 'path';

// Polyfills for Node SSR environment
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

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({ items: [] }),
      }),
    }),
  })),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-responsive-container' }, children),
  AreaChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-area-chart' }, children),
  Area: () => null,
  BarChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-bar-chart' }, children),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
  Cell: () => null,
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
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          single: vi.fn().mockResolvedValue({ data: null }),
          limit: vi.fn().mockResolvedValue({ data: [] }),
          not: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            })),
          })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
          then: vi.fn((cb: any) => Promise.resolve(cb({ data: [] }))),
        })),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        single: vi.fn().mockResolvedValue({ data: null }),
        limit: vi.fn().mockResolvedValue({ data: [] }),
        not: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        then: vi.fn((cb: any) => Promise.resolve(cb({ data: [], count: 0 }))),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      })),
      removeChannel: vi.fn(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock AuthContext
const mockProfile = {
  id: 'user-123',
  full_name: 'Ahmad Albab',
  matric_no: '14DAT21F1001',
  role: 'JPP',
  jpp_unit: 'KLS',
  isSuperAdmin: true,
  department: 'JTMK',
  intake_year: 2024,
  intake_period: 'A',
  phone_number: '0123456789',
  avatar_url: null,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'student@polisas.edu.my' },
    profile: mockProfile,
    isSuperAdmin: true,
    loading: false,
    signOut: vi.fn(),
  }),
}));

// Mock AcademicSessionContext
vi.mock('@/contexts/AcademicSessionContext', () => ({
  useAcademicSession: () => ({
    intake1Month: 7,
    intake2Month: 12,
    academicSession: 'Sesi 1 2024/2025',
    isLoading: false,
  }),
}));

// Mock SupsasContext
const mockEdition = {
  id: 'ed-1',
  name: 'SUPSAS 2026',
  tagline: 'Semarak Sukan Mahasiswa',
  edition_year: 2026,
  start_date: '2026-05-01',
  end_date: '2026-05-10',
  is_active: true,
  logo_url: null,
  banner_url: null,
};

const mockKontingen = [
  {
    id: 'kont-1',
    edition_id: 'ed-1',
    name: 'Teknologi Maklumat & Komunikasi',
    short_code: 'JTMK',
    color: '#3B82F6',
    logo_url: null,
    leader_id: 'user-123',
    invite_code: 'JTMK2026',
    invite_used: false,
    is_active: true,
  },
];

const mockSports = [
  {
    id: 'sp-1',
    edition_id: 'ed-1',
    name: 'Futsal',
    category: 'team' as const,
    gender: 'male' as const,
    format: 'knockout' as const,
    icon: 'Trophy',
    venue: 'Gelanggang Futsal',
    max_per_team: 10,
    max_groups_per_kontingen: 1,
    max_players_per_group: 10,
    sort_order: 1,
    is_active: true,
  },
];

vi.mock('@/contexts/SupsasContext', () => ({
  useSupsas: () => ({
    edition: mockEdition,
    kontingen: mockKontingen,
    sports: mockSports,
    teams: [],
    medalTally: [
      {
        kontingen_id: 'kont-1',
        kontingen_name: 'Teknologi Maklumat & Komunikasi',
        short_code: 'JTMK',
        color: '#3B82F6',
        gold: 3,
        silver: 2,
        bronze: 1,
        total_medals: 6,
        total_points: 25,
      },
    ],
    fixtures: [
      {
        id: 'fix-1',
        sport_id: 'sp-1',
        round: 'Suku Akhir',
        match_number: 1,
        kontingen_a_id: 'kont-1',
        kontingen_b_id: 'kont-2',
        match_date: '2026-05-02',
        match_time: '10:00:00',
        venue: 'Padang A',
        status: 'live' as const,
        score_a: 2,
        score_b: 1,
        winner_id: null,
        notes: null,
        referee_pin: '1234',
      },
    ],
    isLoading: false,
    isLive: true,
    isUpcoming: false,
    lastUpdated: new Date().toISOString(),
    refetch: vi.fn(),
    enableRealtime: vi.fn(),
    disableRealtime: vi.fn(),
  }),
}));

// Mock react-router-dom outlet context
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => ({
      myKontingen: mockKontingen[0],
      edition: mockEdition,
    }),
  };
});

// Import Target Components
import { AkademikCgpa } from '@/pages/akademik/AkademikCgpa';
import { AkademikPencapaian } from '@/pages/akademik/AkademikPencapaian';
import { KlkDashboard } from '@/pages/klk/KlkDashboard';
import { KlkResidencyFormPage } from '@/pages/klk/KlkResidencyFormPage';
import { KlkResidencyModal } from '@/components/klk/KlkResidencyModal';
import { KetuaDashboard } from '@/pages/supsas/ketua/KetuaDashboard';
import { SupsasScorekeeperPage } from '@/pages/supsas/SupsasScorekeeperPage';
import { AdminJadualPage } from '@/pages/supsas/admin/AdminJadualPage';
import { SupsasAdminHome } from '@/pages/supsas/admin/SupsasAdminHome';
import { AdminSukanPage } from '@/pages/supsas/admin/AdminSukanPage';
import { AdminBracketPanel } from '@/pages/supsas/admin/components/AdminBracketPanel';

function renderWithProviders(component: React.ReactElement) {
  return renderToString(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        {component}
      </I18nextProvider>
    </MemoryRouter>
  );
}

describe('Domain 6 Campus Life (Akademik, KLK, SUPSAS) Localization & Parity Suite', () => {
  beforeEach(async () => {
    await changeLanguage('en');
  });

  describe('1. 100% Dictionary Key Parity and Integrity', () => {
    const modules = ['akademik', 'housing', 'supsas'];

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

        const missingInMs = enKeys.filter((k) => !(k in msData));
        const missingInEn = msKeys.filter((k) => !(k in enData));

        expect(missingInMs, `Keys in en/${mod}.json missing from ms/${mod}.json`).toEqual([]);
        expect(missingInEn, `Keys in ms/${mod}.json missing from en/${mod}.json`).toEqual([]);

        // Check for empty string values
        const emptyEn = enKeys.filter((k) => typeof enData[k] === 'string' && enData[k].trim() === '');
        const emptyMs = msKeys.filter((k) => typeof msData[k] === 'string' && msData[k].trim() === '');

        expect(emptyEn, `Empty string values in en/${mod}.json`).toEqual([]);
        expect(emptyMs, `Empty string values in ms/${mod}.json`).toEqual([]);
      });
    });

    it('verifies supsas.json has comprehensive coverage exceeding production threshold (>= 80 keys)', () => {
      const enPath = path.resolve(process.cwd(), 'src/locales/en/supsas.json');
      const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
      const count = Object.keys(enData).length;
      expect(count).toBeGreaterThanOrEqual(80);
    });
  });

  describe('2. Akademik Module Component Renders (English & Bahasa Melayu)', () => {
    it('renders AkademikCgpa with translated strings in English', async () => {
      await changeLanguage('en');
      const html = renderWithProviders(<AkademikCgpa />);
      expect(html).toBeTruthy();
      expect(html).toContain('GPA &amp; CGPA Calculator');
    });

    it('renders AkademikCgpa with translated strings in Bahasa Melayu', async () => {
      await changeLanguage('ms');
      const html = renderWithProviders(<AkademikCgpa />);
      expect(html).toBeTruthy();
      expect(html).toContain('Kalkulator HPA &amp; HPNM');
    });

    it('renders AkademikPencapaian with translated strings in English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      const htmlEn = renderWithProviders(<AkademikPencapaian />);
      expect(htmlEn).toBeTruthy();
      expect(htmlEn).toContain('My Achievements');

      await changeLanguage('ms');
      const htmlMs = renderWithProviders(<AkademikPencapaian />);
      expect(htmlMs).toBeTruthy();
      expect(htmlMs).toContain('Pencapaian Saya');
    });
  });

  describe('3. KLK Housing Module Component Renders (English & Bahasa Melayu)', () => {
    it('renders KlkDashboard in English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      const htmlEn = renderWithProviders(<KlkDashboard />);
      expect(htmlEn).toBeTruthy();
      expect(htmlEn).toContain('KLK — Off-Campus Housing Locator');

      await changeLanguage('ms');
      const htmlMs = renderWithProviders(<KlkDashboard />);
      expect(htmlMs).toBeTruthy();
      expect(htmlMs).toContain('KLK — Panduan Kediaman Luar Kampus');
    });

    it('renders KlkResidencyFormPage in English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      const htmlEn = renderWithProviders(<KlkResidencyFormPage />);
      expect(htmlEn).toBeTruthy();
      expect(htmlEn).toContain('Where are you living this semester?');

      await changeLanguage('ms');
      const htmlMs = renderWithProviders(<KlkResidencyFormPage />);
      expect(htmlMs).toBeTruthy();
      expect(htmlMs).toContain('Di mana anda tinggal semester ini?');
    });

    it('renders KlkResidencyModal in English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      const htmlEn = renderWithProviders(<KlkResidencyModal forceShow={true} />);
      expect(htmlEn).toBeTruthy();
      expect(htmlEn).toContain('Where are you living this semester?');

      await changeLanguage('ms');
      const htmlMs = renderWithProviders(<KlkResidencyModal forceShow={true} />);
      expect(htmlMs).toBeTruthy();
      expect(htmlMs).toContain('Di mana anda tinggal semester ini?');
    });
  });

  describe('4. SUPSAS Sports Module Component Renders (English & Bahasa Melayu)', () => {
    it('renders KetuaDashboard in English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      const htmlEn = renderWithProviders(<KetuaDashboard />);
      expect(htmlEn).toBeTruthy();
      expect(htmlEn).toContain('Select Sport');

      await changeLanguage('ms');
      const htmlMs = renderWithProviders(<KetuaDashboard />);
      expect(htmlMs).toBeTruthy();
      expect(htmlMs).toContain('Pilih Sukan');
    });

    it('renders SupsasScorekeeperPage in English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      const htmlEn = renderWithProviders(<SupsasScorekeeperPage />);
      expect(htmlEn).toBeTruthy();
      expect(htmlEn).toContain('Official Referee Terminal');

      await changeLanguage('ms');
      const htmlMs = renderWithProviders(<SupsasScorekeeperPage />);
      expect(htmlMs).toBeTruthy();
      expect(htmlMs).toContain('Portal Juri &amp; Pengadil');
    });

    it('renders AdminJadualPage in English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      const htmlEn = renderWithProviders(<AdminJadualPage />);
      expect(htmlEn).toBeTruthy();
      expect(htmlEn).toContain('Championship Fixture Schedule');

      await changeLanguage('ms');
      const htmlMs = renderWithProviders(<AdminJadualPage />);
      expect(htmlMs).toBeTruthy();
      expect(htmlMs).toContain('Jadual Pertandingan');
    });

    it('renders SupsasAdminHome in English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      const htmlEn = renderWithProviders(<SupsasAdminHome />);
      expect(htmlEn).toBeTruthy();
      expect(htmlEn).toContain('Super Admin Panel');

      await changeLanguage('ms');
      const htmlMs = renderWithProviders(<SupsasAdminHome />);
      expect(htmlMs).toBeTruthy();
      expect(htmlMs).toContain('Panel Admin');
    });

    it('renders AdminSukanPage in English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      const htmlEn = renderWithProviders(<AdminSukanPage />);
      expect(htmlEn).toBeTruthy();
      expect(htmlEn).toContain('Manage Sports &amp; Tournaments');

      await changeLanguage('ms');
      const htmlMs = renderWithProviders(<AdminSukanPage />);
      expect(htmlMs).toBeTruthy();
      expect(htmlMs).toContain('Urus Sukan &amp; Kejohanan');
    });

    it('renders AdminBracketPanel with GroupColumn in English and Bahasa Melayu without crashing', async () => {
      await changeLanguage('en');
      const htmlEn = renderWithProviders(
        <AdminBracketPanel
          sport={mockSports[0] as any}
          editionId="ed-1"
          onClose={() => {}}
          onConfirmed={() => {}}
        />
      );
      expect(htmlEn).toBeTruthy();
      expect(htmlEn).toContain('Group Stage Draw');

      await changeLanguage('ms');
      const htmlMs = renderWithProviders(
        <AdminBracketPanel
          sport={mockSports[0] as any}
          editionId="ed-1"
          onClose={() => {}}
          onConfirmed={() => {}}
        />
      );
      expect(htmlMs).toBeTruthy();
      expect(htmlMs).toContain('Undian Kumpulan');
    });
  });

  describe('5. Dynamic Switching Across All Domain 6 Modules', () => {
    it('switches dynamically between English and Malay seamlessly across target pages', async () => {
      await changeLanguage('en');
      expect(i18n.language).toBe('en');

      const htmlEn = renderWithProviders(<SupsasAdminHome />);
      expect(htmlEn).toBeTruthy();

      await changeLanguage('ms');
      expect(i18n.language).toBe('ms');

      const htmlMs = renderWithProviders(<SupsasAdminHome />);
      expect(htmlMs).toBeTruthy();
    });
  });
});
