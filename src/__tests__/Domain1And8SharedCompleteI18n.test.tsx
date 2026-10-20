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

vi.mock('@radix-ui/react-dialog', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    Portal: ({ children }: any) => React.createElement('div', { 'data-testid': 'dialog-portal' }, children),
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
  PieChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-pie-chart' }, children),
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
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
          or: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            })),
          })),
        })),
        not: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
        })),
        limit: vi.fn().mockResolvedValue({ data: [] }),
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
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-1', email: 'test@polisas.edu.my' },
    profile: {
      id: 'test-user-1',
      full_name: 'Ahmad Faiz',
      role: 'CLUB_PRESIDENT',
      club_id: 'club-1',
      department: 'jtmk',
      jpp_position: 'PRESIDEN',
      jpp_unit: 'KEBAJIKAN',
    },
    effectiveRole: 'CLUB_PRESIDENT',
    selectedClubId: 'club-1',
    userClubIds: ['club-1'],
    primaryClubId: 'club-1',
    isPresident: true,
    isMT: true,
    isAdvisor: false,
    isMember: false,
    isSuperAdmin: true,
    hasKppAccess: true,
    refetchProfile: vi.fn(),
  }),
}));

// Mock Notifications & AI Assistants
vi.mock('@/lib/notifications', () => ({
  sendNotificationToUser: vi.fn().mockResolvedValue(true),
  sendNotificationToKppExco: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/hooks/useAiAssistant', () => ({
  useAiAssistant: () => ({
    callAi: vi.fn().mockResolvedValue('{"anggaran_kasar": 500, "uraian": "Makanan dan sijil"}'),
    isLoading: false,
  }),
}));

vi.mock('@/contexts/AiSettingsContext', () => ({
  useAiSettings: () => ({
    allowAiBudget: true,
  }),
}));

vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    data: {
      tasks: [],
      activities: [],
      members: [],
      programs: [],
      announcement: { content: 'Pengumuman Penting' },
      task_stats: { active: 2, completed: 5 },
      act_stats: { perancangan: 1, aktif: 2, selesai: 3 },
    },
    isLoading: false,
    isRefreshing: false,
    fetchData: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Import Components to test
import { AktivitiFull } from '@/pages/AktivitiFull';
import { ExcoAktivitiPage } from '@/components/exco/ExcoAktivitiPage';
import { SemakanLaporanPage } from '@/pages/SemakanLaporanPage';
import { ExcoSemakanLaporanPage } from '@/components/exco/ExcoSemakanLaporanPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AhliPage } from '@/pages/AhliPage';
import { KelabPage } from '@/pages/KelabPage';
import { CarianPage } from '@/pages/CarianPage';
import { ClubDetailPage } from '@/pages/ClubDetailPage';
import { ProgramAttendPage } from '@/pages/ProgramAttendPage';
import { AIBudgetGenerator } from '@/components/ai/AIBudgetGenerator';
import { AddTaskModal } from '@/components/tasks/AddTaskModal';
import { TimetableUploadModal } from '@/components/takwim/TimetableUploadModal';
import { TimetablePreviewModal } from '@/components/takwim/TimetablePreviewModal';
import { KertasKerjaRenderer } from '@/components/ai/KertasKerjaRenderer';

const decodeHtml = (str: string) => str.replace(/&amp;/g, '&');

describe('Domain 1 & Domain 8 (Student Hub & Shared Modals) Complete I18n Suite', () => {
  beforeEach(async () => {
    await changeLanguage('en');
  });

  describe('1. Dictionary Key Parity Checks', () => {
    it('verifies 100% key parity between en/kpp.json and ms/kpp.json', () => {
      const enPath = path.resolve(process.cwd(), 'src/locales/en/kpp.json');
      const msPath = path.resolve(process.cwd(), 'src/locales/ms/kpp.json');

      const enKeys = Object.keys(JSON.parse(fs.readFileSync(enPath, 'utf-8'))).sort();
      const msKeys = Object.keys(JSON.parse(fs.readFileSync(msPath, 'utf-8'))).sort();

      const missingInEn = msKeys.filter((k) => !enKeys.includes(k));
      const missingInMs = enKeys.filter((k) => !msKeys.includes(k));

      expect(missingInEn, `Keys missing in en/kpp.json: ${missingInEn.join(', ')}`).toEqual([]);
      expect(missingInMs, `Keys missing in ms/kpp.json: ${missingInMs.join(', ')}`).toEqual([]);
      expect(enKeys).toEqual(msKeys);
    });

    it('verifies 100% key parity between en/portal.json and ms/portal.json', () => {
      const enPath = path.resolve(process.cwd(), 'src/locales/en/portal.json');
      const msPath = path.resolve(process.cwd(), 'src/locales/ms/portal.json');

      const enKeys = Object.keys(JSON.parse(fs.readFileSync(enPath, 'utf-8'))).sort();
      const msKeys = Object.keys(JSON.parse(fs.readFileSync(msPath, 'utf-8'))).sort();

      const missingInEn = msKeys.filter((k) => !enKeys.includes(k));
      const missingInMs = enKeys.filter((k) => !msKeys.includes(k));

      expect(missingInEn, `Keys missing in en/portal.json: ${missingInEn.join(', ')}`).toEqual([]);
      expect(missingInMs, `Keys missing in ms/portal.json: ${missingInMs.join(', ')}`).toEqual([]);
      expect(enKeys).toEqual(msKeys);
    });

    it('verifies 100% key parity between en/common.json and ms/common.json', () => {
      const enPath = path.resolve(process.cwd(), 'src/locales/en/common.json');
      const msPath = path.resolve(process.cwd(), 'src/locales/ms/common.json');

      const enKeys = Object.keys(JSON.parse(fs.readFileSync(enPath, 'utf-8'))).sort();
      const msKeys = Object.keys(JSON.parse(fs.readFileSync(msPath, 'utf-8'))).sort();

      const missingInEn = msKeys.filter((k) => !enKeys.includes(k));
      const missingInMs = enKeys.filter((k) => !msKeys.includes(k));

      expect(missingInEn, `Keys missing in en/common.json: ${missingInEn.join(', ')}`).toEqual([]);
      expect(missingInMs, `Keys missing in ms/common.json: ${missingInMs.join(', ')}`).toEqual([]);
      expect(enKeys).toEqual(msKeys);
    });
  });

  describe('2. Student Hub & Club Pages Bilingual Renders', () => {
    it('renders AktivitiFull correctly in English and switches to Malay', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <AktivitiFull />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain(i18n.t('kpp:upcoming_activities'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <AktivitiFull />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Program Kampus Akan Datang');
    });

    it('renders ExcoAktivitiPage with bilingual support', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <ExcoAktivitiPage excoUnit="KEBAJIKAN" themeColor="#10b981" excoLabel="Exco Kebajikan" />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain(i18n.t('kpp:exco_activity'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <ExcoAktivitiPage excoUnit="KEBAJIKAN" themeColor="#10b981" excoLabel="Exco Kebajikan" />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Aktiviti Exco');
    });

    it('renders SemakanLaporanPage correctly with bilingual tabs and controls', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <SemakanLaporanPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain(i18n.t('kpp:audit_control_center'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <SemakanLaporanPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Pusat Kawalan JPP');
    });

    it('renders ExcoSemakanLaporanPage with bilingual status tabs and headers', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={['/exco/kebajikan/semakan']}>
            <ExcoSemakanLaporanPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain(i18n.t('kpp:check_report'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={['/exco/kebajikan/semakan']}>
            <ExcoSemakanLaporanPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Semak Laporan');
    });

    it('renders DashboardPage bilingual welcome and analytics headers', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <DashboardPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain(i18n.t('kpp:dashboard_title'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <DashboardPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Papan Pemuka Aktiviti Pelajar');
    });

    it('renders AhliPage bilingual roster and management tools', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <AhliPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain(i18n.t('kpp:member_management'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <AhliPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Pengurusan Ahli');
    });

    it('renders KelabPage bilingual directory headers and category pills', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <KelabPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(decodeHtml(html)).toContain(i18n.t('kpp:club_directory'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <KelabPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(decodeHtml(html)).toContain('Direktori Kelab & Persatuan');
    });

    it('renders CarianPage bilingual results headers and counter', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={['/carian?q=bola']}>
            <CarianPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain(i18n.t('common:search_results'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={['/carian?q=bola']}>
            <CarianPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Hasil Carian');
    });

    it('renders ClubDetailPage bilingual back button and details', async () => {
      const mockClub = { id: 'club-1', name: 'Kelab Robotik', category: 'Akademik' };
      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={['/kelab/club-1']}>
            <ClubDetailPage initialClub={mockClub} initialLoading={false} />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain(i18n.t('kpp:back_to_club_directory'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={['/kelab/club-1']}>
            <ClubDetailPage initialClub={mockClub} initialLoading={false} />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Kembali ke Direktori Kelab');
    });

    it('renders ProgramAttendPage bilingual attendance check-in states', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={['/program/attend/invalid-token']}>
            <ProgramAttendPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain(i18n.t('kpp:invalid_qr'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={['/program/attend/invalid-token']}>
            <ProgramAttendPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('QR Tidak Sah');
    });
  });

  describe('3. Shared Modals & AI Utilities Bilingual Renders', () => {
    it('renders AIBudgetGenerator button and trigger bilingually', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <AIBudgetGenerator initialTitle="Karnival" initialDescription="Acara sukan" onApplyBudget={vi.fn()} />
        </I18nextProvider>
      );
      expect(html).toContain(i18n.t('kpp:ai_budget'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <AIBudgetGenerator initialTitle="Karnival" initialDescription="Acara sukan" onApplyBudget={vi.fn()} />
        </I18nextProvider>
      );
      expect(html).toContain('AI Bajet');
    });

    it('renders AddTaskModal trigger bilingually', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <AddTaskModal onTaskAdded={vi.fn()} />
        </I18nextProvider>
      );
      expect(html).toContain(i18n.t('kpp:new_task'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <AddTaskModal onTaskAdded={vi.fn()} />
        </I18nextProvider>
      );
      expect(html).toContain('Tugasan Baru');
    });

    it('renders TimetableUploadModal dialog content bilingually', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <TimetableUploadModal isOpen={true} onClose={vi.fn()} />
        </I18nextProvider>
      );
      expect(html).toContain(i18n.t('kpp:upload_class_timetable'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <TimetableUploadModal isOpen={true} onClose={vi.fn()} />
        </I18nextProvider>
      );
      expect(html).toContain('Muat Naik Jadual Waktu Kuliah');
    });

    it('renders TimetablePreviewModal dialog content bilingually', async () => {
      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <TimetablePreviewModal isOpen={true} onClose={vi.fn()} />
        </I18nextProvider>
      );
      expect(decodeHtml(html)).toContain(i18n.t('kpp:verify_edit_timetable'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <TimetablePreviewModal isOpen={true} onClose={vi.fn()} />
        </I18nextProvider>
      );
      expect(decodeHtml(html)).toContain('Pengesahan & Suntingan Jadual Waktu Kuliah');
    });

    it('renders KertasKerjaRenderer UI controls bilingually', async () => {
      const dummyData: any = {
        halaman_muka: { tajuk_program: 'BENGKEL ROBOTIK', tarikh: '2026-11-10', hari: 'Selasa', tempat: 'Dewan', penganjur: 'Kelab IT' },
        ringkasan_eksekutif: { jenis_program: 'Akademik', matlamat: ['Objektif 1'], bilangan_peserta: 40, bilangan_pegawai: 5, anggaran_kos: 1000 },
        isi_kandungan: { pendahuluan: 'Intro', nama_program: 'BENGKEL ROBOTIK', tujuan: 'Goal', matlamat: ['Target'], bentuk_program: 'Workshop' },
        carta_organisasi: { jawatankuasa_induk: { penaung: { nama: 'Dr X', jawatan: 'Pengarah' }, penasihat: [], pengerusi: { nama: 'En Y', jawatan: 'Pegawai' } }, jawatankuasa_majlis_tertinggi: [], unit_pelaksana: [] },
        tentatif: [],
        belanjawan: { kategori: [], pendapatan: [] },
        tandatangan: { pengarah_program: 'Ali', penasihat_jpp: 'Abu', ketua_jabatan_hep: 'Siti', timbalan_pengarah: 'Tan' }
      };

      await changeLanguage('en');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <KertasKerjaRenderer data={dummyData} />
        </I18nextProvider>
      );
      expect(html).toContain(i18n.t('kpp:new_page_break'));
      expect(html).toContain(i18n.t('kpp:end_of_document'));

      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <KertasKerjaRenderer data={dummyData} />
        </I18nextProvider>
      );
      expect(html).toContain('MUKA SURAT BARU');
      expect(html).toContain('Tamat Dokumen');
    });
  });
});
