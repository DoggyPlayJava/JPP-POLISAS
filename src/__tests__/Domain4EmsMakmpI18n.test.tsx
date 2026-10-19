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
  };
}

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {};
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

// Mock UI widgets
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

// Import Target Pages under test
import { EmsDashboardPage } from '@/pages/ems/EmsDashboardPage';
import { EmsJuryPortalPage } from '@/pages/ems/EmsJuryPortalPage';
import { EmsLeaderboardPage } from '@/pages/ems/EmsLeaderboardPage';
import { EmsCertificatePage } from '@/pages/ems/EmsCertificatePage';
import { EmsCheckinPage } from '@/pages/ems/EmsCheckinPage';
import MakmpPublicFormPage from '@/pages/makmp/MakmpPublicFormPage';
import MakmpStatusTrackingPage from '@/pages/makmp/MakmpStatusTrackingPage';
import MakmpJuryPortalPage from '@/pages/makmp/MakmpJuryPortalPage';

function renderPage(ui: React.ReactElement): string {
  return renderToString(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/']}>
        {ui}
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('Task 6: Domain 4 Integration — Events & Honors (EMS & MAKMP) i18n', () => {
  beforeEach(async () => {
    await changeLanguage('en');
  });

  describe('Static Key Contract Compliance', () => {
    const namespaces = ['ems', 'makmp'];

    it('verifies en and ms JSON dictionaries exist and have complete key parity across both modules', () => {
      namespaces.forEach((ns) => {
        const enPath = path.resolve(process.cwd(), `src/locales/en/${ns}.json`);
        const msPath = path.resolve(process.cwd(), `src/locales/ms/${ns}.json`);

        expect(fs.existsSync(enPath), `Missing English dictionary: ${enPath}`).toBe(true);
        expect(fs.existsSync(msPath), `Missing Malay dictionary: ${msPath}`).toBe(true);

        const enContent = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
        const msContent = JSON.parse(fs.readFileSync(msPath, 'utf-8'));

        const enKeys = Object.keys(enContent).sort();
        const msKeys = Object.keys(msContent).sort();

        expect(enKeys).toEqual(msKeys);
        expect(enKeys.length).toBeGreaterThan(0);
      });
    });

    it('verifies required task-specified EMS keys are defined in both languages', () => {
      const requiredEmsKeys = [
        'event_hub',
        'event_schedule',
        'module_subtitle',
        'jury_portal',
        'jury_rubric',
        'submit_score',
        'score_locked',
        'live_leaderboard',
        'stage_presentation',
        'certificate_generator',
        'recipient_name',
        'awarded_title',
        'organizer',
        'audience_scanner',
        'qr_scan_prompt',
      ];

      const enEms = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/locales/en/ems.json'), 'utf-8'));
      const msEms = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/locales/ms/ems.json'), 'utf-8'));

      requiredEmsKeys.forEach((key) => {
        expect(enEms[key], `en/ems.json missing key: ${key}`).toBeDefined();
        expect(msEms[key], `ms/ems.json missing key: ${key}`).toBeDefined();
        expect(enEms[key].trim().length).toBeGreaterThan(0);
        expect(msEms[key].trim().length).toBeGreaterThan(0);
      });
    });

    it('verifies required task-specified MAKMP keys are defined in both languages', () => {
      const requiredMakmpKeys = [
        'nomination_portal',
        'award_categories',
        'submit_portfolio',
        'merit_matrix',
        'academic_cgpa',
        'co_curriculum_points',
        'leadership_points',
        'community_service',
        'supporting_documents',
        'verification_status',
        'verdict_qualified',
        'verdict_pending',
        'verdict_ineligible',
        'panel_evaluation',
      ];

      const enMakmp = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/locales/en/makmp.json'), 'utf-8'));
      const msMakmp = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/locales/ms/makmp.json'), 'utf-8'));

      requiredMakmpKeys.forEach((key) => {
        expect(enMakmp[key], `en/makmp.json missing key: ${key}`).toBeDefined();
        expect(msMakmp[key], `ms/makmp.json missing key: ${key}`).toBeDefined();
        expect(enMakmp[key].trim().length).toBeGreaterThan(0);
        expect(msMakmp[key].trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('English (en) DOM Rendering Tests', () => {
    beforeEach(async () => {
      await changeLanguage('en');
    });

    it('renders EmsDashboardPage in English with event_hub, event_schedule, module_subtitle', () => {
      const html = renderPage(<EmsDashboardPage />);
      expect(html).toContain('EMS Event Central Hub');
      expect(html).toContain('Event Time &amp; Bracket Matrix');
      expect(html).toContain('Tournament orchestration, digital jury grading sheets, live scoreboard, and verifiable digital certificates.');
    });

    it('renders EmsJuryPortalPage in English with jury_portal, jury_rubric, submit_score, score_locked', () => {
      const html = renderPage(<EmsJuryPortalPage />);
      expect(html).toContain('Jury Digital Scoring Portal');
      expect(html).toContain('Judging Rubric &amp; Criteria');
      expect(html).toContain('Finalize &amp; Submit Score');
      expect(html).toContain('Score Finalized &amp; Locked');
    });

    it('renders EmsLeaderboardPage in English with live_leaderboard, stage_presentation', () => {
      const html = renderPage(<EmsLeaderboardPage />);
      expect(html).toContain('Live Competition Leaderboard');
      expect(html).toContain('Stage Presentation / Arena Mode');
    });

    it('renders EmsCertificatePage in English with certificate_generator, recipient_name, awarded_title, organizer', () => {
      const html = renderPage(<EmsCertificatePage />);
      expect(html).toContain('QR-Verified Certificate Portal');
      expect(html).toContain('Participant Full Name');
      expect(html).toContain('Achievement / Award Title');
      expect(html).toContain('Organizing Committee');
    });

    it('renders EmsCheckinPage in English with audience_scanner, qr_scan_prompt', () => {
      const html = renderPage(<EmsCheckinPage />);
      expect(html).toContain('QR Attendance &amp; Entry Scanner');
      expect(html).toContain('Point camera at participant QR pass');
    });

    it('renders MakmpPublicFormPage in English with nomination_portal, merit_matrix, academic_cgpa, co_curriculum_points, leadership_points, community_service, supporting_documents', () => {
      const html = renderPage(<MakmpPublicFormPage />);
      expect(html).toContain('Excellence Award Nomination');
      expect(html).toContain('Merit Scoring Matrix');
      expect(html).toContain('Submit Student Portfolio');
      expect(html).toContain('Cumulative Grade Point Average (CGPA)');
      expect(html).toContain('Co-curricular Achievement Points');
      expect(html).toContain('Student Leadership Points');
      expect(html).toContain('Community Service Contributions');
      expect(html).toContain('Certified Supporting Documents');
    });

    it('renders MakmpStatusTrackingPage in English with verification_status, verdict_qualified, verdict_pending, verdict_ineligible', () => {
      const html = renderPage(<MakmpStatusTrackingPage />);
      expect(html).toContain('Verification &amp; Audit Status');
      expect(html).toContain('Nomination Qualified');
      expect(html).toContain('Nomination Under Review');
      expect(html).toContain('Requirements Not Satisfied');
    });

    it('renders MakmpJuryPortalPage in English with panel_evaluation, verdict_qualified, verdict_pending, verdict_ineligible', () => {
      const html = renderPage(<MakmpJuryPortalPage />);
      expect(html).toContain('Panel Judge Scoring Form');
      expect(html).toContain('Nomination Qualified');
      expect(html).toContain('Nomination Under Review');
      expect(html).toContain('Requirements Not Satisfied');
    });
  });

  describe('Bahasa Melayu (ms) DOM Rendering Tests', () => {
    beforeEach(async () => {
      await changeLanguage('ms');
    });

    it('renders EmsDashboardPage in Bahasa Melayu with event_hub, event_schedule, module_subtitle', () => {
      const html = renderPage(<EmsDashboardPage />);
      expect(html).toContain('Hab Pusat Acara EMS');
      expect(html).toContain('Jadual Acara &amp; Braket Pertandingan');
      expect(html).toContain('Pengurusan kejohanan, borang markah juri digital, papan markah langsung, dan sijil digital boleh sah.');
    });

    it('renders EmsJuryPortalPage in Bahasa Melayu with jury_portal, jury_rubric, submit_score, score_locked', () => {
      const html = renderPage(<EmsJuryPortalPage />);
      expect(html).toContain('Portal Pemarkahan Juri Digital');
      expect(html).toContain('Rubrik &amp; Kriteria Penilaian');
      expect(html).toContain('Sahkan &amp; Hantar Markah');
      expect(html).toContain('Markah Dimuktamadkan &amp; Dikunci');
    });

    it('renders EmsLeaderboardPage in Bahasa Melayu with live_leaderboard, stage_presentation', () => {
      const html = renderPage(<EmsLeaderboardPage />);
      expect(html).toContain('Papan Markah Pertandingan Langsung');
      expect(html).toContain('Mod Paparan Pentas / Arena');
    });

    it('renders EmsCertificatePage in Bahasa Melayu with certificate_generator, recipient_name, awarded_title, organizer', () => {
      const html = renderPage(<EmsCertificatePage />);
      expect(html).toContain('Portal Sijil Berpengesahan QR');
      expect(html).toContain('Nama Penuh Peserta');
      expect(html).toContain('Pencapaian / Gelaran Anugerah');
      expect(html).toContain('Jawatankuasa Penganjur');
    });

    it('renders EmsCheckinPage in Bahasa Melayu with audience_scanner, qr_scan_prompt', () => {
      const html = renderPage(<EmsCheckinPage />);
      expect(html).toContain('Pengimbas Kehadiran &amp; Pas QR');
      expect(html).toContain('Halakan kamera ke kod QR pas peserta');
    });

    it('renders MakmpPublicFormPage in Bahasa Melayu with nomination_portal, merit_matrix, academic_cgpa, co_curriculum_points, leadership_points, community_service, supporting_documents', () => {
      const html = renderPage(<MakmpPublicFormPage />);
      expect(html).toContain('Pencalonan Anugerah Kecemerlangan');
      expect(html).toContain('Matriks Pemarkahan Merit');
      expect(html).toContain('Hantar Portfolio Siswa');
      expect(html).toContain('Purata Nilai Gred Kumulatif (HPNM)');
      expect(html).toContain('Mata Pencapaian Kokurikulum');
      expect(html).toContain('Mata Kepimpinan Pelajar');
      expect(html).toContain('Sumbangan Khidmat Komuniti');
      expect(html).toContain('Dokumen Sokongan Disahkan');
    });

    it('renders MakmpStatusTrackingPage in Bahasa Melayu with verification_status, verdict_qualified, verdict_pending, verdict_ineligible', () => {
      const html = renderPage(<MakmpStatusTrackingPage />);
      expect(html).toContain('Status Pengesahan &amp; Audit');
      expect(html).toContain('Pencalonan Layak');
      expect(html).toContain('Pencalonan Dalam Semakan');
      expect(html).toContain('Syarat Tidak Dipenuhi');
    });

    it('renders MakmpJuryPortalPage in Bahasa Melayu with panel_evaluation, verdict_qualified, verdict_pending, verdict_ineligible', () => {
      const html = renderPage(<MakmpJuryPortalPage />);
      expect(html).toContain('Borang Penilaian Panel Penilai');
      expect(html).toContain('Pencalonan Layak');
      expect(html).toContain('Pencalonan Dalam Semakan');
      expect(html).toContain('Syarat Tidak Dipenuhi');
    });
  });

  describe('Live Dynamic Language Switching Verification', () => {
    it('seamlessly transitions EmsDashboardPage between en and ms dynamically', async () => {
      await changeLanguage('en');
      let html = renderPage(<EmsDashboardPage />);
      expect(html).toContain('EMS Event Central Hub');
      expect(html).not.toContain('Hab Pusat Acara EMS');

      await changeLanguage('ms');
      html = renderPage(<EmsDashboardPage />);
      expect(html).toContain('Hab Pusat Acara EMS');
      expect(html).not.toContain('EMS Event Central Hub');
    });

    it('seamlessly transitions MakmpPublicFormPage between en and ms dynamically', async () => {
      await changeLanguage('en');
      let html = renderPage(<MakmpPublicFormPage />);
      expect(html).toContain('Excellence Award Nomination');
      expect(html).toContain('Merit Scoring Matrix');
      expect(html).not.toContain('Pencalonan Anugerah Kecemerlangan');

      await changeLanguage('ms');
      html = renderPage(<MakmpPublicFormPage />);
      expect(html).toContain('Pencalonan Anugerah Kecemerlangan');
      expect(html).toContain('Matriks Pemarkahan Merit');
      expect(html).not.toContain('Excellence Award Nomination');
    });

    it('seamlessly transitions MakmpStatusTrackingPage between en and ms dynamically', async () => {
      await changeLanguage('en');
      let html = renderPage(<MakmpStatusTrackingPage />);
      expect(html).toContain('Verification &amp; Audit Status');
      expect(html).toContain('Nomination Qualified');

      await changeLanguage('ms');
      html = renderPage(<MakmpStatusTrackingPage />);
      expect(html).toContain('Status Pengesahan &amp; Audit');
      expect(html).toContain('Pencalonan Layak');
    });
  });
});
