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

// Mock React.lazy
vi.spyOn(React, 'lazy').mockImplementation((_loader: any) => {
  return ((_props: any) => null) as any;
});

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
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          single: vi.fn().mockResolvedValue({ data: null }),
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
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        then: vi.fn((cb: any) => Promise.resolve(cb({ data: [], count: 0 }))),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
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

// Mock Contexts
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-123', email: 'ydp@polisas.edu.my' },
    profile: {
      id: 'admin-123',
      club_id: 'jpp-hq',
      full_name: 'Ahmad Faiz (YDP)',
      role: 'SUPER_ADMIN_JPP',
      department: 'JKE',
      jpp_position: 'YANG_DIPERTUA',
      jpp_unit: 'KPP',
    },
    effectiveRole: 'SUPER_ADMIN_JPP',
    isSuperAdmin: true,
    isJppMember: true,
    isMT: true,
    isAdvisor: false,
    isPresident: false,
    hasKediamanAccess: true,
  }),
}));

vi.mock('@/contexts/AcademicSessionContext', () => ({
  useAcademicSession: () => ({
    activeSession: 'SESI 1: 2026/2027',
    semesterString: '1',
  }),
}));

vi.mock('@/contexts/ExcoThemeContext', () => ({
  useExcoTheme: () => ({
    color: '#10B981',
    excoUnit: 'KEUSAHAWANAN',
  }),
}));

vi.mock('@/contexts/JppConfigContext', () => ({
  useJppConfig: () => ({
    unitConfig: {
      KEBAJIKAN: { color: '#06B6D4', fullLabel: 'Kebajikan & Pengaduan Awam' },
    },
  }),
}));

// Components under test
import { ExcoGenericDashboard } from '@/pages/jpp/units/ExcoGenericDashboard';
import { EventCouponPanel } from '@/pages/jpp/units/EventCouponPanel';
import { KamsisKlkStatsWidget } from '@/pages/jpp/units/KamsisKlkStatsWidget';
import { TelemetryLeftRail } from '@/pages/jpp/telemetry/TelemetryLeftRail';
import { TelemetryLiveTimeline } from '@/pages/jpp/telemetry/TelemetryLiveTimeline';
import { TelemetryQuickMetrics } from '@/pages/jpp/telemetry/TelemetryQuickMetrics';
import { JppReviewPage } from '@/pages/JppReviewPage';

function renderWithI18n(ui: React.ReactElement, lang: 'ms' | 'en') {
  changeLanguage(lang);
  return renderToString(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('Task 2: Sweep Group 2 JPP HQ Admin, Exco Unit Dashboards & Telemetry I18n', () => {
  beforeEach(() => {
    changeLanguage('ms');
  });

  describe('1. Dictionary Parity Check', () => {
    it('jpp.json has 100% two-way key parity between ms and en', () => {
      const msJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/ms/jpp.json'), 'utf-8'));
      const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en/jpp.json'), 'utf-8'));
      const msKeys = Object.keys(msJson).sort();
      const enKeys = Object.keys(enJson).sort();
      expect(msKeys).toEqual(enKeys);
    });

    it('common.json has 100% two-way key parity between ms and en', () => {
      const msJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/ms/common.json'), 'utf-8'));
      const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en/common.json'), 'utf-8'));
      const msKeys = Object.keys(msJson).sort();
      const enKeys = Object.keys(enJson).sort();
      expect(msKeys).toEqual(enKeys);
    });

    it('jpp.json contains no empty strings in ms or en', () => {
      const msJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/ms/jpp.json'), 'utf-8'));
      const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en/jpp.json'), 'utf-8'));
      for (const [k, v] of Object.entries(msJson)) {
        expect(typeof v).toBe('string');
        expect((v as string).trim().length).toBeGreaterThan(0);
      }
      for (const [k, v] of Object.entries(enJson)) {
        expect(typeof v).toBe('string');
        expect((v as string).trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('2. Exco Units & Components Localization', () => {
    it('ExcoGenericDashboard renders localized labels and switches languages', () => {
      const msHtml = renderWithI18n(
        <ExcoGenericDashboard excoUnit="KEBAJIKAN" themeColor="#06B6D4" excoLabel="Kebajikan" />,
        'ms'
      );
      expect(msHtml).toContain('Jumlah Aktiviti');
      expect(msHtml).toContain('Aktif Sekarang');
      expect(msHtml).toContain('Tindakan Pantas');

      const enHtml = renderWithI18n(
        <ExcoGenericDashboard excoUnit="KEBAJIKAN" themeColor="#06B6D4" excoLabel="Kebajikan" />,
        'en'
      );
      expect(enHtml).toContain('Total Activities');
      expect(enHtml).toContain('Active Now');
      expect(enHtml).toContain('Quick Actions');
    });

    it('EventCouponPanel renders localized coupon header and buttons', () => {
      const msHtml = renderWithI18n(<EventCouponPanel />, 'ms');
      expect(msHtml).toContain('Kupon / Voucher Acara');
      expect(msHtml).toContain('Cipta Kupon');
      expect(msHtml).toContain('Jumlah Claim');

      const enHtml = renderWithI18n(<EventCouponPanel />, 'en');
      expect(enHtml).toContain('Event Coupons / Vouchers');
      expect(enHtml).toContain('Create Coupon');
      expect(enHtml).toContain('Total Claims');
    });

    it('KamsisKlkStatsWidget renders localized housing stats in both languages', () => {
      const msHtml = renderWithI18n(<KamsisKlkStatsWidget themeColor="#06B6D4" />, 'ms');
      expect(msHtml).toContain('Status i-KAMSIS');
      expect(msHtml).toContain('Taburan Kediaman');

      const enHtml = renderWithI18n(<KamsisKlkStatsWidget themeColor="#06B6D4" />, 'en');
      expect(enHtml).toContain('i-KAMSIS Status');
      expect(enHtml).toContain('Residential Distribution');
    });
  });

  describe('3. Telemetry Components Localization', () => {
    const mockTelemetryData: any = {
      resilience_score: 95,
      resilience_rating: 'A+',
      resilience_deductions: [],
      server: { pid: 1234, memory: { heap_used_mb: 200, heap_total_mb: 400 } },
      modules: { profiles: 1500, notifications: 3200 },
      diagnostics: {
        database: { cache_hit_rate_pct: 99, active_connections: 5, max_connections: 100 },
        kebajikan: { open: 0, escalated: 0, resolved: 10 },
        polymart: { pending_stale: 0, cancel_rate_pct: 5 },
        polyrider: { stuck_emergency: 0, cancel_rate_pct: 2 },
        ai: { usage_pct: 45 },
      },
    };

    it('TelemetryLeftRail renders localized security score and admin cards', () => {
      const msHtml = renderWithI18n(
        <TelemetryLeftRail
          data={mockTelemetryData}
          onRefresh={() => {}}
          loading={false}
          totalAlertsCount={0}
        />,
        'ms'
      );
      expect(msHtml).toContain('Security Score');
      expect(msHtml).toContain('Auto Resolution');

      const enHtml = renderWithI18n(
        <TelemetryLeftRail
          data={mockTelemetryData}
          onRefresh={() => {}}
          loading={false}
          totalAlertsCount={0}
        />,
        'en'
      );
      expect(enHtml).toContain('Security Score');
      expect(enHtml).toContain('Auto Resolution');
    });

    it('TelemetryLiveTimeline renders localized timeline header and filters', () => {
      const msHtml = renderWithI18n(
        <TelemetryLiveTimeline events={[]} loading={false} />,
        'ms'
      );
      expect(msHtml).toContain('Live Timeline');
      expect(msHtml).toContain('Semua');
      expect(msHtml).toContain('Kritikal');

      const enHtml = renderWithI18n(
        <TelemetryLiveTimeline events={[]} loading={false} />,
        'en'
      );
      expect(enHtml).toContain('Live Timeline');
      expect(enHtml).toContain('All');
      expect(enHtml).toContain('Critical');
    });

    it('TelemetryQuickMetrics renders localized metrics sections', () => {
      const msHtml = renderWithI18n(
        <TelemetryQuickMetrics data={mockTelemetryData} />,
        'ms'
      );
      expect(msHtml).toContain('Top Threats');
      expect(msHtml).toContain('Infrastructure');
      expect(msHtml).toContain('Overall Uptime');

      const enHtml = renderWithI18n(
        <TelemetryQuickMetrics data={mockTelemetryData} />,
        'en'
      );
      expect(enHtml).toContain('Top Threats');
      expect(enHtml).toContain('Infrastructure');
      expect(enHtml).toContain('Overall Uptime');
    });
  });

  describe('4. JppReviewPage Localization', () => {
    it('JppReviewPage renders localized review dashboard and filters in both languages', () => {
      const msHtml = renderWithI18n(<JppReviewPage />, 'ms');
      expect(msHtml).toContain('Semakan Laporan JPP');
      expect(msHtml).toContain('Muat Semula');

      const enHtml = renderWithI18n(<JppReviewPage />, 'en');
      expect(enHtml).toContain('JPP Report Review');
      expect(enHtml).toContain('Reload');
    });
  });
});
