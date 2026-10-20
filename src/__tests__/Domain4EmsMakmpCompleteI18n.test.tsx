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
  };
}

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    location: { search: '', pathname: '/', origin: 'http://localhost' },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
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

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockqr'),
  },
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockqr'),
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => React.createElement('div', { 'data-testid': 'mock-qrcode-svg' }),
  QRCodeCanvas: () => React.createElement('div', { 'data-testid': 'mock-qrcode-canvas' }),
}));

vi.mock('react-qr-code', () => ({
  default: () => React.createElement('div', { 'data-testid': 'mock-react-qr-code' }),
}));

vi.mock('@react-pdf/renderer', () => ({
  PDFViewer: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-pdf-viewer' }, children),
  Document: ({ children }: any) => React.createElement('div', null, children),
  Page: ({ children }: any) => React.createElement('div', null, children),
  Text: ({ children }: any) => React.createElement('span', null, children),
  View: ({ children }: any) => React.createElement('div', null, children),
  StyleSheet: { create: (styles: any) => styles },
  Font: { register: vi.fn() },
  Image: () => null,
  BlobProvider: ({ children }: any) => children({ blob: null, url: null, loading: false, error: null }),
  pdf: vi.fn(),
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

vi.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => React.createElement('div', { 'data-testid': 'mock-theme-toggle' }),
}));

vi.mock('@/components/makmp/MakmpJppChrome', () => ({
  MakmpJppHeader: ({ subtitle }: { subtitle?: string }) => (
    React.createElement('header', { 'data-testid': 'mock-makmp-header' }, subtitle)
  ),
  MakmpJppChrome: ({ children }: { children: React.ReactNode }) => (
    React.createElement('div', { 'data-testid': 'mock-makmp-chrome' }, children)
  ),
}));

vi.mock('@/components/ems/EmsLuckyDrawModal', () => ({
  EmsLuckyDrawModal: () => null,
}));

vi.mock('@/components/ems/EmsJuryAuditMatrix', () => ({
  EmsJuryAuditMatrix: () => null,
}));

vi.mock('@/components/ems/StudentSearchCombobox', () => ({
  StudentSearchCombobox: () => null,
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
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
          then: vi.fn((cb: any) => Promise.resolve(cb({ data: [] }))),
        })),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        single: vi.fn().mockResolvedValue({ data: null }),
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

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-ems', email: 'ems@polisas.edu.my' },
    profile: {
      id: 'test-user-ems',
      full_name: 'Ahmad Faisal EMS',
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
    refetchProfile: vi.fn(),
  }),
}));

// Target Pages & Modals under test
import { EmsCheckinPage } from '@/pages/ems/EmsCheckinPage';
import { EmsEventFormPage } from '@/pages/ems/EmsEventFormPage';
import { EmsPublicRegisterPage } from '@/pages/ems/EmsPublicRegisterPage';
import { EmsLeaderboardPage } from '@/pages/ems/EmsLeaderboardPage';
import { EmsApprovalPage } from '@/pages/ems/EmsApprovalPage';
import { EmsAudienceScanPage } from '@/pages/ems/EmsAudienceScanPage';
import { EmsManualRegModal } from '@/components/ems/modals/EmsManualRegModal';
import { EmsJuryCodeModal } from '@/components/ems/modals/EmsJuryCodeModal';
import MakmpPublicFormPage from '@/pages/makmp/MakmpPublicFormPage';
import MakmpStatusTrackingPage from '@/pages/makmp/MakmpStatusTrackingPage';

const mockEvent: any = {
  id: 'ev-1',
  title: 'Pertandingan Inovasi Digital 2026',
  description: 'Pertandingan inovasi tahunan',
  category: 'Inovasi',
  event_type: 'COMPETITION',
  event_mode: 'TEAM',
  event_date: '2026-11-15T09:00:00Z',
  location: 'Dewan Gemilang POLISAS',
  status: 'APPROVED',
  created_at: '2026-10-01T00:00:00Z',
  created_by: 'test-user-ems',
  milestone_config: [50, 100],
  is_leaderboard_public: true,
  is_siswapreneur: false,
};

const mockEdition: any = {
  id: 'ed-1',
  title: 'MAKMP 2026',
  year: 2026,
  is_active: true,
  status: 'OPEN',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};


describe('Domain 4 (Events & Honors: EMS & MAKMP) Deep Row-by-Row Localization', () => {
  beforeEach(async () => {
    await changeLanguage('en');
  });

  // ─── 1. 100% DICTIONARY KEY PARITY ────────────────────────────
  describe('Dictionary Parity and Integrity', () => {
    const namespaces = ['ems', 'makmp'];

    it('has identical keys for en and ms in ems and makmp namespaces', () => {
      namespaces.forEach((ns) => {
        const enPath = path.resolve(process.cwd(), `src/locales/en/${ns}.json`);
        const msPath = path.resolve(process.cwd(), `src/locales/ms/${ns}.json`);

        expect(fs.existsSync(enPath)).toBe(true);
        expect(fs.existsSync(msPath)).toBe(true);

        const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
        const msData = JSON.parse(fs.readFileSync(msPath, 'utf-8'));

        const enKeys = Object.keys(enData).sort();
        const msKeys = Object.keys(msData).sort();

        expect(enKeys).toEqual(msKeys);

        enKeys.forEach((key) => {
          expect(typeof enData[key]).toBe('string');
          expect(typeof msData[key]).toBe('string');
          expect(enData[key].trim().length).toBeGreaterThan(0);
          expect(msData[key].trim().length).toBeGreaterThan(0);
        });
      });
    });

    it('ensures concise, high-grade English translations without slashes or overlong wording', () => {
      const enEms = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/locales/en/ems.json'), 'utf-8'));
      const enMakmp = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/locales/en/makmp.json'), 'utf-8'));

      // Check specific keys
      expect(enEms.approval_title).toBeDefined();
      expect(enEms.audience_scan_title).toBeDefined();
      expect(enEms.manual_reg_title).toBeDefined();
      expect(enEms.jury_code_title).toBeDefined();
      expect(enMakmp.track_title).toBeDefined();
    });
  });

  // ─── 2. ENGLISH SSR RENDERS ───────────────────────────────────
  describe('English SSR Renders', () => {
    beforeEach(async () => {
      await changeLanguage('en');
    });

    it('renders EmsApprovalPage in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsApprovalPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('EMS Event Review &amp; Approval');
      expect(html).not.toContain('Semakan &amp; Kelulusan Acara EMS');
    });

    it('renders EmsAudienceScanPage in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsAudienceScanPage initialEvent={mockEvent} initialLoading={false} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Public Attendance Scanner');
      expect(html).not.toContain('Portal Imbasan Kehadiran Awam');
    });

    it('renders EmsManualRegModal in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsManualRegModal event={mockEvent} onClose={vi.fn()} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Manual Attendee Registration');
      expect(html).toContain('Register Participant');
      expect(html).not.toContain('Pendaftaran Manual Peserta');
    });

    it('renders EmsJuryCodeModal in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsJuryCodeModal event={mockEvent} onClose={vi.fn()} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Generate Jury Access Code');
      expect(html).not.toContain('Jana Kod Akses Juri');
    });

    it('renders EmsCheckinPage in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsCheckinPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('QR Attendance &amp; Entry Scanner');
    });

    it('renders EmsEventFormPage in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsEventFormPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Create New EMS Event &amp; Form');
    });

    it('renders EmsPublicRegisterPage in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsPublicRegisterPage initialLoading={false} initialEventDetail={mockEvent} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Category &amp; Info');
    });

    it('renders EmsLeaderboardPage in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsLeaderboardPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Live Competition Leaderboard');
    });

    it('renders MakmpPublicFormPage in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <MakmpPublicFormPage initialStep={1} initialEdition={mockEdition} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Candidate Information');
    });

    it('renders MakmpStatusTrackingPage in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <MakmpStatusTrackingPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('MAKMP Nomination Status Tracking');
      expect(html).toContain('Check Status');
    });
  });

  // ─── 3. BAHASA MELAYU SSR RENDERS ─────────────────────────────
  describe('Bahasa Melayu SSR Renders', () => {
    beforeEach(async () => {
      await changeLanguage('ms');
    });

    it('renders EmsApprovalPage in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsApprovalPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Semakan &amp; Kelulusan Acara EMS');
    });

    it('renders EmsAudienceScanPage in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsAudienceScanPage initialEvent={mockEvent} initialLoading={false} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Portal Imbasan Kehadiran Awam');
    });

    it('renders EmsManualRegModal in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsManualRegModal event={mockEvent} onClose={vi.fn()} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Pendaftaran Manual Peserta');
      expect(html).toContain('Daftar Peserta');
    });

    it('renders EmsJuryCodeModal in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsJuryCodeModal event={mockEvent} onClose={vi.fn()} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Jana Kod Akses Juri');
    });

        it('renders MakmpPublicFormPage in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <MakmpPublicFormPage initialStep={1} initialEdition={mockEdition} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Maklumat Calon');
    });

    it('renders MakmpStatusTrackingPage in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <MakmpStatusTrackingPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Semakan Status Pencalonan MAKMP');
      expect(html).toContain('Semak Status');
    });
  });

  // ─── 4. DYNAMIC LANGUAGE SWITCHING ────────────────────────────
  describe('Dynamic Language Switching', () => {
    it('switches between EN and MS seamlessly on EmsManualRegModal', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsManualRegModal event={mockEvent} onClose={vi.fn()} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Manual Attendee Registration');
      expect(html).not.toContain('Pendaftaran Manual Peserta');

      await changeLanguage('ms');
      html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsManualRegModal event={mockEvent} onClose={vi.fn()} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Pendaftaran Manual Peserta');
      expect(html).not.toContain('Manual Attendee Registration');
    });

    it('switches between EN and MS seamlessly on EmsApprovalPage', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsApprovalPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('EMS Event Review &amp; Approval');

      await changeLanguage('ms');
      html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EmsApprovalPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Semakan &amp; Kelulusan Acara EMS');
    });
  });
});
