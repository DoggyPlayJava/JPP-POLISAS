import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
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

vi.mock('react-markdown', () => ({
  default: ({ children }: any) => React.createElement('div', null, children),
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

// Import Target Pages under test
import { JppHomePage } from '@/pages/jpp/JppHomePage';
import { JppMembersPage } from '@/pages/jpp/JppMembersPage';
import { JppOverviewPage } from '@/pages/jpp/JppOverviewPage';
import { JppUsersPage } from '@/pages/jpp/JppUsersPage';
import { JppLogsPage } from '@/pages/jpp/JppLogsPage';
import { AnnouncementsPage } from '@/pages/jpp/AnnouncementsPage';
import { JppFoodBankAdmin } from '@/pages/jpp/JppFoodBankAdmin';

function renderPage(ui: React.ReactElement): string {
  return renderToString(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('Task 4: Domain 2 Integration — JPP HQ Administration Portal i18n', () => {
  beforeEach(async () => {
    await changeLanguage('en');
  });

  describe('Static Key Contract Compliance', () => {
    const enPath = path.resolve(__dirname, '../locales/en/jpp.json');
    const msPath = path.resolve(__dirname, '../locales/ms/jpp.json');

    it('verifies en/jpp.json and ms/jpp.json exist and have complete key parity', () => {
      expect(fs.existsSync(enPath)).toBe(true);
      expect(fs.existsSync(msPath)).toBe(true);

      const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
      const msJson = JSON.parse(fs.readFileSync(msPath, 'utf8'));

      const enKeys = Object.keys(enJson).sort();
      const msKeys = Object.keys(msJson).sort();

      expect(enKeys).toEqual(msKeys);
    });

    it('verifies all mandatory Domain 2 contract keys are present in both dictionaries', () => {
      const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
      const msJson = JSON.parse(fs.readFileSync(msPath, 'utf8'));

      const requiredKeys = [
        'cockpit_title',
        'cockpit_subtitle',
        'unit_governance',
        'members_management',
        'users_management',
        'audit_logs',
        'broadcast_announcements',
        'cross_club_oversight',
        'foodbank_admin',
        'active_council',
        'add_member',
        'manage_roles',
        'activity_feed',
        'export_audit_report',
        'server_health',
        'total_students',
        'total_staff',
        'active_sessions',
        'unit_keusahawanan',
        'unit_kebajikan',
        'unit_akademik',
        'unit_sukan',
        'unit_kediaman',
        'unit_multimedia',
      ];

      for (const k of requiredKeys) {
        expect(enJson, `en/jpp.json should have ${k}`).toHaveProperty(k);
        expect(msJson, `ms/jpp.json should have ${k}`).toHaveProperty(k);
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

    it('renders JppHomePage with English cockpit headings, unit governance, and vitals', () => {
      const html = renderPage(<JppHomePage />);

      expect(html).toContain('JPP HQ Executive Cockpit');
      expect(html).toContain('Central administration, cross-exco monitoring, and student governance.');
      expect(html).toContain('Exco Units Governance');
      expect(html).toContain('System &amp; Server Status');
      expect(html).toContain('Total Registered Students');
      expect(html).toContain('Total Academic Staff');
      expect(html).toContain('Current Academic Session');
      expect(html).toContain('Entrepreneurship Exco');
      expect(html).toContain('Welfare &amp; Complaints Exco');
    });

    it('renders JppMembersPage with English council and appointment headings', () => {
      const html = renderPage(<JppMembersPage />);

      expect(html).toContain('JPP Council Members');
      expect(html).toContain('Active JPP Council Session');
      expect(html).toContain('Appoint New Member');
    });

    it('renders JppOverviewPage with English cross-club oversight heading and metrics', () => {
      const html = renderPage(<JppOverviewPage />);

      expect(html).toContain('Cross-Club Performance Analytics');
      expect(html).toContain('Total Registered Students');
    });

    it('renders JppUsersPage with English user accounts heading and role management', () => {
      const html = renderPage(<JppUsersPage />);

      expect(html).toContain('Student &amp; Staff Accounts');
      expect(html).toContain('Manage User Roles');
    });

    it('renders JppLogsPage with English audit logs, activity feed, and export button', () => {
      const html = renderPage(<JppLogsPage />);

      expect(html).toContain('System Audit Trail');
      expect(html).toContain('Live Activity Audit Log');
      expect(html).toContain('Export Audit Log (Excel/PDF)');
    });

    it('renders AnnouncementsPage with English broadcast announcements heading', () => {
      const html = renderPage(<AnnouncementsPage />);

      expect(html).toContain('Campus Broadcast Center');
    });

    it('renders JppFoodBankAdmin with English food bank control heading', () => {
      const html = renderPage(<JppFoodBankAdmin />);

      expect(html).toContain('Food Bank Central Control');
    });
  });

  describe('Bahasa Melayu (ms) Full DOM Rendering', () => {
    beforeEach(async () => {
      await changeLanguage('ms');
    });

    it('renders JppHomePage with Bahasa Melayu cockpit headings, unit governance, and vitals', () => {
      const html = renderPage(<JppHomePage />);

      expect(html).toContain('Pusat Kawalan Eksekutif JPP HQ');
      expect(html).toContain('Pentadbiran berpusat, pemantauan rentas-exco, dan tadbir urus mahasiswa.');
      expect(html).toContain('Tadbir Urus Unit-Unit Exco');
      expect(html).toContain('Status Kesihatan Sistem &amp; Pelayan');
      expect(html).toContain('Jumlah Pelajar Berdaftar');
      expect(html).toContain('Jumlah Staf Akademik');
      expect(html).toContain('Sesi Akademik Semasa');
      expect(html).toContain('Exco Keusahawanan');
      expect(html).toContain('Exco Kebajikan &amp; Aduan');
    });

    it('renders JppMembersPage with Bahasa Melayu council and appointment headings', () => {
      const html = renderPage(<JppMembersPage />);

      expect(html).toContain('Senarai Ahli Majlis JPP');
      expect(html).toContain('Sesi Majlis JPP Aktif');
      expect(html).toContain('Lantik Ahli Baharu');
    });

    it('renders JppOverviewPage with Bahasa Melayu cross-club oversight heading and metrics', () => {
      const html = renderPage(<JppOverviewPage />);

      expect(html).toContain('Analisis Prestasi Rentas-Kelab');
      expect(html).toContain('Jumlah Pelajar Berdaftar');
    });

    it('renders JppUsersPage with Bahasa Melayu user accounts heading and role management', () => {
      const html = renderPage(<JppUsersPage />);

      expect(html).toContain('Akaun Pelajar &amp; Staf');
      expect(html).toContain('Urus Peranan Pengguna');
    });

    it('renders JppLogsPage with Bahasa Melayu audit logs, activity feed, and export button', () => {
      const html = renderPage(<JppLogsPage />);

      expect(html).toContain('Jejak Audit Sistem');
      expect(html).toContain('Log Audit Aktiviti Langsung');
      expect(html).toContain('Eksport Log Audit (Excel/PDF)');
    });

    it('renders AnnouncementsPage with Bahasa Melayu broadcast announcements heading', () => {
      const html = renderPage(<AnnouncementsPage />);

      expect(html).toContain('Pusat Pengumuman Kampus');
    });

    it('renders JppFoodBankAdmin with Bahasa Melayu food bank control heading', () => {
      const html = renderPage(<JppFoodBankAdmin />);

      expect(html).toContain('Kawalan Berpusat Food Bank');
    });
  });

  describe('Live Dynamic Language Switching Verification', () => {
    it('dynamically switches JppHomePage from en to ms and back to en', async () => {
      await changeLanguage('en');
      let html = renderPage(<JppHomePage />);
      expect(html).toContain('JPP HQ Executive Cockpit');
      expect(html).not.toContain('Pusat Kawalan Eksekutif JPP HQ');

      await changeLanguage('ms');
      html = renderPage(<JppHomePage />);
      expect(html).toContain('Pusat Kawalan Eksekutif JPP HQ');
      expect(html).not.toContain('JPP HQ Executive Cockpit');

      await changeLanguage('en');
      html = renderPage(<JppHomePage />);
      expect(html).toContain('JPP HQ Executive Cockpit');
    });

    it('dynamically switches JppMembersPage from en to ms and back to en', async () => {
      await changeLanguage('en');
      let html = renderPage(<JppMembersPage />);
      expect(html).toContain('Appoint New Member');
      expect(html).not.toContain('Lantik Ahli Baharu');

      await changeLanguage('ms');
      html = renderPage(<JppMembersPage />);
      expect(html).toContain('Lantik Ahli Baharu');
      expect(html).not.toContain('Appoint New Member');

      await changeLanguage('en');
      html = renderPage(<JppMembersPage />);
      expect(html).toContain('Appoint New Member');
    });

    it('dynamically switches JppLogsPage from en to ms and back to en', async () => {
      await changeLanguage('en');
      let html = renderPage(<JppLogsPage />);
      expect(html).toContain('System Audit Trail');
      expect(html).toContain('Export Audit Log (Excel/PDF)');

      await changeLanguage('ms');
      html = renderPage(<JppLogsPage />);
      expect(html).toContain('Jejak Audit Sistem');
      expect(html).toContain('Eksport Log Audit (Excel/PDF)');
    });
  });
});
