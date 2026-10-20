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
    crypto: {
      getRandomValues: (arr: Uint32Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 1000);
        return arr;
      },
    },
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
  motion: new Proxy({}, {
    get: (_target, prop: string) => {
      return ({ children, className, style, ...props }: any) => {
        const { initial, animate, exit, transition, whileHover, whileTap, layout, ...rest } = props;
        return React.createElement(prop, { className, style, ...rest }, children);
      };
    },
  }),
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
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockFrom = vi.fn((_tableName: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        order: vi.fn().mockResolvedValue({ data: [] }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      order: vi.fn().mockResolvedValue({ data: [] }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  }));

  return {
    supabase: {
      from: mockFrom,
      rpc: vi.fn((name: string) => {
        if (name === 'get_klk_public_stats') {
          return Promise.resolve({
            data: {
              total_luar: 120,
              total_kamsis: 350,
              by_kawasan: [
                { kawasan: 'Semambu', count: 45 },
                { kawasan: 'Indera Mahkota', count: 35 },
              ],
              by_jabatan: [
                { jabatan: 'JTMK', count: 60 },
                { jabatan: 'JKE', count: 60 },
              ],
              by_source: { webapp: 80, google_form: 30, csv: 10 },
            },
            error: null,
          });
        }
        return Promise.resolve({ data: [], error: null });
      }),
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
      role: 'JPP',
      jpp_unit: 'KLS',
    },
    isSuperAdmin: true,
    isLoading: false,
  }),
}));

// Mock SupsasContext
vi.mock('@/contexts/SupsasContext', () => ({
  useSupsas: () => ({
    edition: {
      id: 'ed-1',
      name: 'SUPSAS 2026',
      tagline: 'Bersatu, Berjuang, Berjaya',
      edition_year: 2026,
      start_date: '2026-10-01',
      end_date: '2026-10-10',
      is_active: true,
      gold_points: 5,
      silver_points: 3,
      bronze_points: 1,
    },
    sports: [
      {
        id: 'sp-1',
        name: 'Futsal Lelaki',
        category: 'PADANG',
        format: 'GROUP_KNOCKOUT',
        gender_category: 'LELAKI',
        max_teams_per_kontingen: 1,
        players_per_team: 7,
        icon: '⚽',
      },
      {
        id: 'sp-2',
        name: 'Bola Jaring',
        category: 'GELANGGANG',
        format: 'KNOCKOUT',
        gender_category: 'WANITA',
        max_teams_per_kontingen: 1,
        players_per_team: 10,
        icon: '🏐',
      },
    ],
    kontingen: [
      {
        id: 'k-1',
        name: 'Jabatan Teknologi Maklumat',
        short_code: 'JTMK',
        color: '#3B82F6',
        is_active: true,
        invite_code: 'JTMK-2026',
        invite_used: true,
        leader_id: 'user-123',
      },
      {
        id: 'k-2',
        name: 'Jabatan Kejuruteraan Elektrik',
        short_code: 'JKE',
        color: '#10B981',
        is_active: true,
        invite_code: 'JKE-2026',
        invite_used: false,
        leader_id: null,
      },
    ],
    fixtures: [
      {
        id: 'fix-1',
        sport_id: 'sp-1',
        edition_id: 'ed-1',
        bracket_round: 2,
        bracket_position: 1,
        group_name: 'A',
        team_a_id: 'k-1',
        team_b_id: 'k-2',
        score_a: 3,
        score_b: 1,
        status: 'COMPLETED',
        scheduled_time: '2026-10-05T09:00:00Z',
        venue: 'Gelanggang Futsal',
      },
    ],
    teams: [],
    refetch: vi.fn(),
    enableRealtime: vi.fn(),
    disableRealtime: vi.fn(),
  }),
}));

// Mock klkUtils
vi.mock('@/utils/klkUtils', () => ({
  getKlkAcademicYear: () => 'Sesi I 2026/2027',
}));

// Import components under test
import { BracketPage } from '@/pages/supsas/BracketPage';
import { SupsasHistoryPage } from '@/pages/supsas/SupsasHistoryPage';
import { SupsasSchedulePage } from '@/pages/supsas/SupsasSchedulePage';
import { SupsasSportsPage } from '@/pages/supsas/SupsasSportsPage';
import { AdminTetapanPage } from '@/pages/supsas/admin/AdminTetapanPage';
import { AdminKeputusanPage } from '@/pages/supsas/admin/AdminKeputusanPage';
import { AdminKontigenPage } from '@/pages/supsas/admin/AdminKontigenPage';
import { KlkPublicStats } from '@/pages/klk/KlkPublicStats';
import { PolyRentAdmin } from '@/pages/klk/PolyRentAdmin';
import { PolyRentCalculatorModal } from '@/pages/polyrent/PolyRentCalculatorModal';
import { PolyRentReverseForm } from '@/pages/polyrent/PolyRentReverseForm';

describe('Sweep Group 5: SUPSAS & Housing/PolyRent i18n Localization', () => {
  beforeEach(async () => {
    await changeLanguage('ms');
  });

  describe('1. Dictionary Parity and Structure Tests', () => {
    it('supsas.json has 100% key parity between en and ms without empty values', () => {
      const enPath = path.resolve(process.cwd(), 'src/locales/en/supsas.json');
      const msPath = path.resolve(process.cwd(), 'src/locales/ms/supsas.json');
      const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
      const ms = JSON.parse(fs.readFileSync(msPath, 'utf8'));

      const enKeys = Object.keys(en).sort();
      const msKeys = Object.keys(ms).sort();

      expect(enKeys).toEqual(msKeys);
      expect(enKeys.length).toBeGreaterThan(350);

      // Verify no empty string values
      enKeys.forEach(key => {
        expect(en[key].trim(), `en supsas.${key} is empty`).not.toBe('');
        expect(ms[key].trim(), `ms supsas.${key} is empty`).not.toBe('');
      });
    });

    it('housing.json has 100% key parity between en and ms without empty values', () => {
      const enPath = path.resolve(process.cwd(), 'src/locales/en/housing.json');
      const msPath = path.resolve(process.cwd(), 'src/locales/ms/housing.json');
      const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
      const ms = JSON.parse(fs.readFileSync(msPath, 'utf8'));

      const enKeys = Object.keys(en).sort();
      const msKeys = Object.keys(ms).sort();

      expect(enKeys).toEqual(msKeys);
      expect(enKeys.length).toBeGreaterThan(400);

      enKeys.forEach(key => {
        expect(en[key].trim(), `en housing.${key} is empty`).not.toBe('');
        expect(ms[key].trim(), `ms housing.${key} is empty`).not.toBe('');
      });
    });
  });

  describe('2. Component SSR Render Tests in BM and EN', () => {
    it('renders BracketPage with proper localization in ms and en', async () => {
      await changeLanguage('ms');
      const htmlMs = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={['/supsas/bracket/sp-1']}>
            <Routes>
              <Route path="/supsas/bracket/:sportId" element={<BracketPage />} />
            </Routes>
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlMs).toContain('Kumpulan + Gugur');
      expect(htmlMs).toContain('Bracket KO');
      expect(htmlMs).toContain('Pasukan');

      await changeLanguage('en');
      const htmlEn = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={['/supsas/bracket/sp-1']}>
            <Routes>
              <Route path="/supsas/bracket/:sportId" element={<BracketPage />} />
            </Routes>
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlEn).toContain('Groups + Knockout');
      expect(htmlEn).toContain('KO Bracket');
      expect(htmlEn).toContain('Team');
    });

    it('renders SupsasHistoryPage with proper localization in ms and en', async () => {
      await changeLanguage('ms');
      const htmlMs = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <SupsasHistoryPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlMs).toContain('Sejarah SUPSAS');
      expect(htmlMs).toContain('Sukan Polisas — Rekod Semua Edisi');

      await changeLanguage('en');
      const htmlEn = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <SupsasHistoryPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlEn).toContain('SUPSAS History');
      expect(htmlEn).toContain('POLISAS Sports — All Editions Archive');
    });

    it('renders SupsasSchedulePage with proper localization in ms and en', async () => {
      await changeLanguage('ms');
      const htmlMs = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <SupsasSchedulePage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlMs).toContain('Jadual Pertandingan');

      await changeLanguage('en');
      const htmlEn = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <SupsasSchedulePage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlEn).toContain('Championship Fixture Schedule');
    });

    it('renders SupsasSportsPage with proper localization in ms and en', async () => {
      await changeLanguage('ms');
      const htmlMs = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <SupsasSportsPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlMs).toContain('Sukan Dipertandingkan');

      await changeLanguage('en');
      const htmlEn = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <SupsasSportsPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlEn).toContain('Contested Sports');
    });

    it('renders AdminTetapanPage with proper localization in ms and en', async () => {
      await changeLanguage('ms');
      const htmlMs = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <AdminTetapanPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlMs).toContain('Tetapan Edisi');
      expect(htmlMs).toContain('Nama Edisi');
      expect(htmlMs).toContain('Pengiraan Mata Johan Keseluruhan');

      await changeLanguage('en');
      const htmlEn = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <AdminTetapanPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlEn).toContain('Edition Settings');
      expect(htmlEn).toContain('Edition Name');
      expect(htmlEn).toContain('Overall Champion Points Calculation');
    });

    it('renders AdminKeputusanPage with proper localization in ms and en', async () => {
      await changeLanguage('ms');
      const htmlMs = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <AdminKeputusanPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlMs).toContain('Input Keputusan');
      expect(htmlMs).toContain('Pilih Sukan');

      await changeLanguage('en');
      const htmlEn = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <AdminKeputusanPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlEn).toContain('Input Results');
      expect(htmlEn).toContain('Select Sport');
    });

    it('renders AdminKontigenPage with proper localization in ms and en', async () => {
      await changeLanguage('ms');
      const htmlMs = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <AdminKontigenPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlMs).toContain('Urus Kontinjen');
      expect(htmlMs).toContain('Tambah Kontinjen');

      await changeLanguage('en');
      const htmlEn = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <AdminKontigenPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlEn).toContain('Manage Contingents');
      expect(htmlEn).toContain('Add Contingent');
    });

    it('renders KlkPublicStats with proper localization in ms and en', async () => {
      await changeLanguage('ms');
      const htmlMs = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <KlkPublicStats />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlMs).toContain('Taburan Kediaman Pelajar');
      expect(htmlMs).toContain('Exco KLK JPP POLISAS');
      expect(htmlMs).toContain('Kemaskini Status Sekarang');

      await changeLanguage('en');
      const htmlEn = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <KlkPublicStats />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlEn).toContain('Student Housing Distribution');
      expect(htmlEn).toContain('POLISAS JPP KLK Exco');
      expect(htmlEn).toContain('Update Status Now');
    });

    it('renders PolyRentAdmin with proper localization in ms and en', async () => {
      await changeLanguage('ms');
      const htmlMs = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <PolyRentAdmin />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlMs).toContain('Pengurusan PolyRent');
      expect(htmlMs).toContain('Tetapan Modul');

      await changeLanguage('en');
      const htmlEn = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <PolyRentAdmin />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(htmlEn).toContain('PolyRent Moderation');
      expect(htmlEn).toContain('Module Settings');
    });

    it('renders PolyRentCalculatorModal with proper localization in ms and en', async () => {
      await changeLanguage('ms');
      const htmlMs = renderToString(
        <I18nextProvider i18n={i18n}>
          <PolyRentCalculatorModal isOpen={true} onClose={() => {}} />
        </I18nextProvider>
      );
      expect(htmlMs).toContain('Kalkulator Bil');
      expect(htmlMs).toContain('Jumlah Ahli Rumah');
      expect(htmlMs).toContain('Reset Borang');

      await changeLanguage('en');
      const htmlEn = renderToString(
        <I18nextProvider i18n={i18n}>
          <PolyRentCalculatorModal isOpen={true} onClose={() => {}} />
        </I18nextProvider>
      );
      expect(htmlEn).toContain('Bill Calculator');
      expect(htmlEn).toContain('Total Housemates');
      expect(htmlEn).toContain('Reset Form');
    });

    it('renders PolyRentReverseForm with proper localization in ms and en', async () => {
      await changeLanguage('ms');
      const htmlMs = renderToString(
        <I18nextProvider i18n={i18n}>
          <PolyRentReverseForm onClose={() => {}} onSuccess={() => {}} />
        </I18nextProvider>
      );
      expect(htmlMs).toContain('Cari Rumah');
      expect(htmlMs).toContain('Bajet Maksimum (Bulanan)');

      await changeLanguage('en');
      const htmlEn = renderToString(
        <I18nextProvider i18n={i18n}>
          <PolyRentReverseForm onClose={() => {}} onSuccess={() => {}} />
        </I18nextProvider>
      );
      expect(htmlEn).toContain('Find Housing');
      expect(htmlEn).toContain('Maximum Monthly Budget');
    });
  });
});
