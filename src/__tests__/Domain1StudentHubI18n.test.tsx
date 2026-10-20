import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n, { changeLanguage } from '@/lib/i18n';
import fs from 'fs';
import path from 'path';
// Mock PDF renderers before page imports
vi.mock('@/components/reports/LaporanPDFTemplate', () => ({
  LaporanPDFTemplate: () => null,
}));
vi.mock('@react-pdf/renderer', () => ({
  Font: { registerHyphenationCallback: vi.fn(), register: vi.fn() },
  StyleSheet: { create: vi.fn((styles) => styles) },
  pdf: vi.fn(() => ({ toBlob: vi.fn().mockResolvedValue(new Blob()) })),
}));

// Pages to verify
import { LandingPage, Hero, Navbar, BentoSection, CtaSection } from '@/pages/LandingPage';
import { PortalPage } from '@/pages/PortalPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { KelabPage } from '@/pages/KelabPage';
import { AktivitiFull } from '@/pages/AktivitiFull';
import { LaporanPage } from '@/pages/LaporanPage';

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
          })),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          single: vi.fn().mockResolvedValue({ data: null }),
          limit: vi.fn().mockResolvedValue({ data: [] }),
          or: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            })),
          })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
        })),
        like: vi.fn().mockResolvedValue({ data: [] }),
        not: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
          in: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        then: vi.fn((cb: any) => Promise.resolve(cb({ data: [], count: 21 }))),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
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
    nav: ({ children, className, ...props }: any) => (
      React.createElement('nav', { className, ...props }, children)
    ),
    button: ({ children, className, ...props }: any) => (
      React.createElement('button', { className, ...props }, children)
    ),
    span: ({ children, className, ...props }: any) => (
      React.createElement('span', { className, ...props }, children)
    ),
  },
  AnimatePresence: ({ children }: any) => children,
  useMotionValue: () => ({ set: vi.fn() }),
  useMotionTemplate: () => '',
}));

// Mock Contexts
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123', email: 'student@polisas.edu.my' },
    profile: {
      id: 'test-user-123',
      club_id: 'club-test-1',
      full_name: 'Muhammad Farhan',
      role: 'STUDENT',
      department: 'awam',
    },
    effectiveRole: 'STUDENT',
    selectedClubId: 'club-test-1',
    userClubIds: ['club-test-1'],
    isSuperAdmin: false,
    isAdvisor: false,
    isPresident: true,
    isMT: true,
    isMember: true,
  }),
}));

vi.mock('@/contexts/AiSettingsContext', () => ({
  useAiSettings: () => ({ allowAiBudget: false }),
}));

vi.mock('@/contexts/KarnivalContext', () => ({
  useKarnivalStatus: () => ({ isActive: false, name: null }),
}));

vi.mock('@/contexts/AcademicSessionContext', () => ({
  useAcademicSession: () => ({ activeSession: '2026/2027', semesterString: '1' }),
}));

vi.mock('@/hooks/useTour', () => ({
  useTour: () => ({ runTour: false, startTour: vi.fn(), closeTour: vi.fn() }),
}));

vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    data: {
      tasks: [],
      activities: [],
      members: [{ id: 'm1', full_name: 'Ahmad', merit: 50 }],
      programs: [],
      announcement: { content: 'Urusan kelab rasmi dibuka.' },
      task_stats: { active: 2, completed: 5 },
      act_stats: { perancangan: 1, aktif: 2, selesai: 3 },
    },
    isLoading: false,
    isRefreshing: false,
    fetchData: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useReports', () => ({
  useReports: () => ({
    reports: [
      {
        id: 'rep-1',
        file_name: 'Laporan Bulanan Mac.pdf',
        file_url: 'https://drive.google.com/test',
        status: 'Diluluskan',
        is_archived: false,
        created_at: '2026-03-31T10:00:00Z',
      },
    ],
    loading: false,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({ permission: 'default', subscribe: vi.fn() }),
}));

vi.mock('@/hooks/useAiAssistant', () => ({
  useAiAssistant: () => ({ isAnalyzing: false }),
}));

// Mock subcomponents
vi.mock('@/components/layout/PortalSidebar', () => ({
  PortalSidebar: () => null,
}));
vi.mock('@/components/layout/BottomNav', () => ({
  BottomNav: () => null,
}));
vi.mock('@/components/portal/SuperAppHeader', () => ({
  SuperAppHeader: () => <div data-testid="superapp-header">SuperAppHeader</div>,
}));
vi.mock('@/components/portal/CampusServicesGrid', () => ({
  CampusServicesGrid: () => null,
}));
vi.mock('@/components/portal/CampusCampaignCarousel', () => ({
  CampusCampaignCarousel: () => null,
}));
vi.mock('@/components/portal/EmsEventsFeed', () => ({
  EmsEventsFeed: () => null,
}));
vi.mock('@/components/portal/PolyMartFeed', () => ({
  PolyMartFeed: () => null,
}));
vi.mock('@/components/portal/KebajikanLiveTrackerCard', () => ({
  KebajikanLiveTrackerCard: () => null,
}));
vi.mock('@/components/portal/NextClassBentoCard', () => ({
  NextClassBentoCard: () => null,
}));
vi.mock('@/components/portal/CurtainReveal', () => ({
  CurtainReveal: () => null,
}));
vi.mock('@/components/portal/KarnivalEffects', () => ({
  KarnivalEffects: () => null,
}));
vi.mock('@/components/portal/SupsasEffects', () => ({
  SupsasEffects: () => null,
}));
vi.mock('@/components/portal/PortalFooter', () => ({
  PortalFooter: () => null,
}));
vi.mock('@/components/portal/ExcoCard', () => ({
  ExcoCard: () => null,
}));
vi.mock('@/components/ui/ClubSwitcher', () => ({
  ClubSwitcher: () => null,
}));
vi.mock('@/components/ui/NotificationBell', () => ({
  NotificationBell: () => null,
}));

describe('Task 3: Domain 1 Integration — Core Student Hub & e-KPP i18n', () => {
  beforeEach(async () => {
    localStorage.clear();
    await changeLanguage('en');
  });

  describe('Contract & Source Code Verification', () => {
    const pagesDir = path.resolve(__dirname, '../pages');

    it('verifies LandingPage.tsx and PortalPage.tsx import useTranslation with portal namespace', () => {
      const landingSrc = fs.readFileSync(path.join(pagesDir, 'LandingPage.tsx'), 'utf8');
      const portalSrc = fs.readFileSync(path.join(pagesDir, 'PortalPage.tsx'), 'utf8');

      expect(landingSrc).toContain("import { useTranslation } from 'react-i18next';");
      expect(landingSrc).toContain("useTranslation(['portal', 'common'])");

      expect(portalSrc).toContain("import { useTranslation } from 'react-i18next';");
      expect(portalSrc).toContain("useTranslation(['portal', 'common'])");
    });

    it('verifies DashboardPage.tsx imports useTranslation with kpp namespace and binds required keys', () => {
      const dashSrc = fs.readFileSync(path.join(pagesDir, 'DashboardPage.tsx'), 'utf8');

      expect(dashSrc).toContain("import { useTranslation } from 'react-i18next';");
      expect(dashSrc).toContain("useTranslation(['kpp', 'common'])");

      expect(dashSrc).toContain("t('kpp:dashboard_title')");
      expect(dashSrc).toContain("t('kpp:dashboard_subtitle')");
      expect(dashSrc).toContain("t('kpp:stats_clubs')");
      expect(dashSrc).toContain("t('kpp:stats_activities')");
      expect(dashSrc).toContain("t('kpp:stats_reports')");
      expect(dashSrc).toContain("t('kpp:stats_pending')");
      expect(dashSrc).toContain("t('kpp:my_clubs'");
      expect(dashSrc).toContain("t('kpp:upcoming_activities')");
      expect(dashSrc).toContain("t('kpp:join_club')");
      expect(dashSrc).toContain("t('kpp:submit_report')");
    });

    it('verifies KelabPage.tsx binds directory title, category tabs, and search placeholder', () => {
      const kelabSrc = fs.readFileSync(path.join(pagesDir, 'KelabPage.tsx'), 'utf8');

      expect(kelabSrc).toContain("import { useTranslation } from 'react-i18next';");
      expect(kelabSrc).toContain("useTranslation(['kpp', 'common'])");
      expect(kelabSrc).toContain("t('kpp:club_directory')");
      expect(kelabSrc).toContain("t('kpp:search_placeholder')");
      expect(kelabSrc).toContain("t('kpp:club_status_active')");
    });

    it('verifies AktivitiFull.tsx and LaporanPage.tsx bind kpp event badges and report headers', () => {
      const aktSrc = fs.readFileSync(path.join(pagesDir, 'AktivitiFull.tsx'), 'utf8');
      const lapSrc = fs.readFileSync(path.join(pagesDir, 'LaporanPage.tsx'), 'utf8');

      expect(aktSrc).toContain("import { useTranslation } from 'react-i18next';");
      expect(aktSrc).toContain("useTranslation(['kpp', 'common'])");
      expect(aktSrc).toContain("t('kpp:event_status_upcoming')");
      expect(aktSrc).toContain("t('kpp:event_status_ongoing')");
      expect(aktSrc).toContain("t('kpp:event_status_completed')");

      expect(lapSrc).toContain("import { useTranslation } from 'react-i18next';");
      expect(lapSrc).toContain("useTranslation(['portal', 'kpp', 'common'])");
      expect(lapSrc).toContain("t('kpp:submit_report')");
      expect(lapSrc).toContain("t('kpp:report_management')");
      expect(lapSrc).toContain("t('kpp:review_reports')");
    });
  });

  describe('English (en) Rendering Verification', () => {
    beforeEach(async () => {
      await changeLanguage('en');
    });

    it('renders LandingPage hero and calls-to-action in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <LandingPage />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Campus Digital Ecosystem &amp; Student Super App');
      expect(html).toContain('Explore Student Portal');
      expect(html).toContain('Comprehensive Platform Features');
    });

    it('renders PortalPage exco modules header in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <PortalPage />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Welcome to the Digital Campus');
      expect(html).toContain('POLISAS Student Portal Hub');
      expect(html).toContain('Select an exco unit or campus service below to proceed:');
    });

    it('renders DashboardPage metrics and headers in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <DashboardPage />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Student Activity Dashboard');
      expect(html).toContain('Pending Approvals');
      expect(html).toContain('Registered Clubs');
      expect(html).toContain('Submitted Reports');
      expect(html).toContain('Active Activities');
      expect(html).toContain('Upcoming Campus Events');
      expect(html).toContain('Join a Club');
      expect(html).toContain('Submit Report');
    });

    it('renders KelabPage directory title, search placeholder, and categories in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <KelabPage />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Directory of Clubs &amp; Societies');
      expect(html).toContain('Search club name');
      expect(html).toContain('Academic &amp; Career');
      expect(html).toContain('Sports &amp; Recreation');
      expect(html).toContain('Uniformed Bodies');
    });

    it('renders AktivitiFull calendar headers and event status badges in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <AktivitiFull />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Upcoming Campus Events');
      expect(html).toContain('View Event Calendar');
      expect(html).toContain('Club Activities');
      expect(html).toContain('Upcoming');
      expect(html).toContain('Ongoing');
      expect(html).toContain('Completed');
    });

    it('renders localized QR code status and evidence upload text in AktivitiFull', async () => {
      await changeLanguage('en');
      expect(i18n.t('kpp:scan_qr_instruction')).toBe('Participants scan QR code for attendance');
      expect(i18n.t('kpp:qr_open_at')).toBe('Open QR At');
      expect(i18n.t('kpp:qr_close_at')).toBe('Close QR At');
      expect(i18n.t('kpp:upload_proof_images')).toBe('Upload Proof Photos (Max 2)');
      expect(i18n.t('kpp:qr_token_not_generated')).toBe('QR token not generated yet. Edit and re-save this activity to generate token.');
      expect(i18n.t('kpp:ai_draft_helper')).toBe('Generate draft or correct format with AI assistance.');

      const pagesDir = path.resolve(__dirname, '../pages');
      const aktSrc = fs.readFileSync(path.join(pagesDir, 'AktivitiFull.tsx'), 'utf8');
      expect(aktSrc).toContain("t('kpp:scan_qr_instruction'");
      expect(aktSrc).toContain("t('kpp:qr_open_at'");
      expect(aktSrc).toContain("t('kpp:qr_close_at'");
      expect(aktSrc).toContain("t('kpp:upload_proof_images'");
      expect(aktSrc).toContain("t('kpp:qr_token_not_generated'");
      expect(aktSrc).toContain("t('kpp:ai_draft_helper'");
    });

    it('renders LaporanPage document management headers in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <LaporanPage />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Submit Report');
      expect(html).toContain('Report Management');
      expect(html).toContain('Review Activity Reports');
    });
  });

  describe('Bahasa Melayu (ms) Rendering Verification', () => {
    beforeEach(async () => {
      await changeLanguage('ms');
    });

    it('renders LandingPage hero and calls-to-action in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <LandingPage />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Ekosistem Digital Kampus &amp; Super App Pelajar');
      expect(html).toContain('Terokai Portal Pelajar');
      expect(html).toContain('Ciri-Ciri Menyeluruh Platform');
    });

    it('renders PortalPage exco modules header in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <PortalPage />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Selamat Datang ke Kampus Digital');
      expect(html).toContain('Hab Portal Pelajar POLISAS');
      expect(html).toContain('Pilih unit exco atau perkhidmatan kampus di bawah untuk meneruskan:');
    });

    it('renders DashboardPage metrics and headers in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <DashboardPage />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Papan Pemuka Aktiviti Pelajar');
      expect(html).toContain('Menunggu Kelulusan');
      expect(html).toContain('Kelab Berdaftar');
      expect(html).toContain('Laporan Dihantar');
      expect(html).toContain('Aktiviti Aktif');
      expect(html).toContain('Program Kampus Akan Datang');
      expect(html).toContain('Sertai Kelab');
      expect(html).toContain('Hantar Laporan');
    });

    it('renders KelabPage directory title, search placeholder, and categories in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <KelabPage />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Direktori Kelab &amp; Persatuan');
      expect(html).toContain('Cari nama kelab');
      expect(html).toContain('Akademik &amp; Kerjaya');
      expect(html).toContain('Sukan &amp; Rekreasi');
      expect(html).toContain('Badan Beruniform');
    });

    it('renders AktivitiFull calendar headers and event status badges in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <AktivitiFull />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Program Kampus Akan Datang');
      expect(html).toContain('Lihat Kalendar Acara');
      expect(html).toContain('Aktiviti Kelab');
      expect(html).toContain('Akan Datang');
      expect(html).toContain('Sedang Berlangsung');
      expect(html).toContain('Selesai');
    });

    it('renders localized QR code status and evidence upload text in AktivitiFull in Bahasa Melayu', async () => {
      await changeLanguage('ms');
      expect(i18n.t('kpp:scan_qr_instruction')).toBe('Peserta scan QR untuk daftar hadir');
      expect(i18n.t('kpp:qr_open_at')).toBe('Buka QR Pada');
      expect(i18n.t('kpp:qr_close_at')).toBe('Tutup QR Pada');
      expect(i18n.t('kpp:upload_proof_images')).toBe('Muat Naik Gambar Bukti (Maks 2)');
      expect(i18n.t('kpp:qr_token_not_generated')).toBe('QR token belum dijana. Edit dan simpan semula aktiviti ini untuk jana token.');
      expect(i18n.t('kpp:ai_draft_helper')).toBe('Jana draf atau betulkan format dengan bantuan AI.');
    });

    it('renders LaporanPage document management headers in Bahasa Melayu', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <LaporanPage />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Hantar Laporan');
      expect(html).toContain('Pengurusan Laporan');
      expect(html).toContain('Semak Laporan Aktiviti');
    });
  });

  describe('Live Language Switching', () => {
    it('seamlessly transitions rendered text between English and Bahasa Melayu', async () => {
      // 1. English
      await changeLanguage('en');
      let html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <DashboardPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Student Activity Dashboard');
      expect(html).toContain('Join a Club');

      // 2. Switch to Malay
      await changeLanguage('ms');
      html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <DashboardPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Papan Pemuka Aktiviti Pelajar');
      expect(html).toContain('Sertai Kelab');

      // 3. Switch back to English
      await changeLanguage('en');
      html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <DashboardPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Student Activity Dashboard');
      expect(html).toContain('Join a Club');
    });
  });
});
