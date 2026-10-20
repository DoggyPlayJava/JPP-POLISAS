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

// Mock React.lazy to avoid synchronous suspend errors during renderToString
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
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [] }),
              })),
            })),
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
          is: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            })),
          })),
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            })),
          })),
          not: vi.fn(() => ({
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
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            })),
          })),
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        then: vi.fn((cb: any) => Promise.resolve(cb({ data: [], count: 0 }))),
        abortSignal: vi.fn(() => Promise.resolve({ data: [] })),
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
  useMotionValue: () => ({ set: vi.fn(), get: () => 0 }),
  useSpring: () => ({ get: () => 0 }),
  useTransform: () => 0,
  useDragControls: () => ({ start: vi.fn() }),
  useScroll: () => ({ scrollY: { on: vi.fn(), get: () => 0 } }),
  useMotionValueEvent: vi.fn(),
  animate: () => ({ stop: vi.fn() }),
}));

// Mock ThemeContext
vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn(), toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }: any) => children,
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
      department: 'JKE',
      merit: 45,
    },
    effectiveRole: 'STUDENT',
    selectedClubId: 'club-test-1',
    userClubIds: ['club-test-1'],
    isSuperAdmin: false,
    isAdvisor: false,
    isPresident: false,
    isMT: false,
    isMember: true,
  }),
}));

vi.mock('@/contexts/AcademicSessionContext', () => ({
  useAcademicSession: () => ({
    activeSession: 'SESI 1: 2026/2027',
    semesterString: '1',
  }),
}));

vi.mock('@/contexts/KarnivalContext', () => ({
  useKarnivalStatus: () => ({
    isActive: false,
    name: 'Karnival Siswa',
  }),
}));

vi.mock('@/components/ai/FloatingAiChat', () => ({
  FloatingAiChat: () => React.createElement('div', { 'data-testid': 'floating-ai-chat' }),
  default: () => React.createElement('div', { 'data-testid': 'floating-ai-chat' }),
}));

vi.mock('@/components/ui/SystemTour', () => ({
  SystemTour: () => null,
  default: () => null,
}));

// Components under test
import { SuperAppHeader } from '@/components/portal/SuperAppHeader';
import { CampusCampaignCarousel } from '@/components/portal/CampusCampaignCarousel';
import { CampusServicesGrid } from '@/components/portal/CampusServicesGrid';
import { EmsEventsFeed } from '@/components/portal/EmsEventsFeed';
import { ExcoCard } from '@/components/portal/ExcoCard';
import { KarnivalMegaBanner } from '@/components/portal/KarnivalMegaBanner';
import { NextClassBentoCard } from '@/components/portal/NextClassBentoCard';
import { PolyMartFeed } from '@/components/portal/PolyMartFeed';
import { PolymartServiceModal } from '@/components/portal/PolymartServiceModal';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { QuickActions } from '@/components/portal/QuickActions';
import { SupsasMegaBanner } from '@/components/portal/SupsasMegaBanner';
import { PortalPage } from '@/pages/PortalPage';
import { AkademikLeaderboard } from '@/pages/akademik/AkademikLeaderboard';
import { AkademikMeritPage } from '@/pages/akademik/AkademikMeritPage';
import { AkademikQrPage } from '@/pages/akademik/AkademikQrPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { NotifikasiPage } from '@/pages/NotifikasiPage';
import { OnboardingPage } from '@/pages/OnboardingPage';

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

describe('Task 1: Sweep Group 1 Portal Gateway Hub & Academics I18n', () => {
  beforeEach(() => {
    changeLanguage('ms');
  });

  describe('1. Dictionary Parity Check', () => {
    it('portal.json has matching keys between ms and en', () => {
      const msJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/ms/portal.json'), 'utf-8'));
      const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en/portal.json'), 'utf-8'));
      const msKeys = Object.keys(msJson).sort();
      const enKeys = Object.keys(enJson).sort();
      expect(msKeys).toEqual(enKeys);
    });

    it('akademik.json has matching keys between ms and en', () => {
      const msJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/ms/akademik.json'), 'utf-8'));
      const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en/akademik.json'), 'utf-8'));
      const msKeys = Object.keys(msJson).sort();
      const enKeys = Object.keys(enJson).sort();
      expect(msKeys).toEqual(enKeys);
    });

    it('common.json has matching keys between ms and en', () => {
      const msJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/ms/common.json'), 'utf-8'));
      const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en/common.json'), 'utf-8'));
      const msKeys = Object.keys(msJson).sort();
      const enKeys = Object.keys(enJson).sort();
      expect(msKeys).toEqual(enKeys);
    });
  });

  describe('2. Portal Components Localization', () => {
    it('SuperAppHeader switches role badge and search pill placeholder between languages', () => {
      const msHtml = renderWithI18n(
        <SuperAppHeader profile={{ id: '1', role: 'STUDENT', full_name: 'Farhan', department: 'JKE' } as any} onOpenSidebar={() => {}} />,
        'ms'
      );
      expect(msHtml).toContain('SISWA POLISAS');
      expect(msHtml).toContain('Cari makanan, runner, servis, acara, merit...');

      const enHtml = renderWithI18n(
        <SuperAppHeader profile={{ id: '1', role: 'STUDENT', full_name: 'Farhan', department: 'JKE' } as any} onOpenSidebar={() => {}} />,
        'en'
      );
      expect(enHtml).toContain('POLISAS STUDENT');
      expect(enHtml).toContain('Search food, runners, services, events, merit...');
    });

    it('CampusCampaignCarousel renders accessible title and localized fallback', () => {
      const slides = [
        {
          id: 'kamsis' as const,
          title: 'Asrama Kamsis',
          desc: 'Keputusan rayuan dikeluarkan.',
          badge: 'Status',
          variant: 'amber' as const,
        },
        {
          id: 'makmp' as const,
          title: 'Anugerah MAKMP',
          desc: 'Semak jemputan anugerah.',
          badge: 'MAKMP',
          variant: 'gold' as const,
        }
      ];
      const msHtml = renderWithI18n(<CampusCampaignCarousel slides={slides} onOpenAppealModal={() => {}} />, 'ms');
      expect(msHtml).toContain('Navigasi Kempen');

      const enHtml = renderWithI18n(<CampusCampaignCarousel slides={slides} onOpenAppealModal={() => {}} />, 'en');
      expect(enHtml).toContain('Campaign Navigation');
    });

    it('CampusServicesGrid renders localized services and badges', () => {
      const msHtml = renderWithI18n(
        <CampusServicesGrid
          isModuleEnabled={() => true}
          isSuperAdmin={false}
          onOpenPolymartModal={() => {}}
          onOpenKamsisModal={() => {}}
          kamsisStatus="LULUS"
          kbStats={null}
        />,
        'ms'
      );
      expect(msHtml).toContain('Perkhidmatan Kampus');
      expect(msHtml).toContain('Pasaran Siswa');
      expect(msHtml).toContain('Aduan &amp; Bantuan');

      const enHtml = renderWithI18n(
        <CampusServicesGrid
          isModuleEnabled={() => true}
          isSuperAdmin={false}
          onOpenPolymartModal={() => {}}
          onOpenKamsisModal={() => {}}
          kamsisStatus="LULUS"
          kbStats={null}
        />,
        'en'
      );
      expect(enHtml).toContain('Campus Services');
      expect(enHtml).toContain('Student Marketplace');
      expect(enHtml).toContain('Complaints &amp; Aid');
    });

    it('EmsEventsFeed renders header and open registration badge', () => {
      const msHtml = renderWithI18n(<EmsEventsFeed />, 'ms');
      expect(msHtml).toContain('Acara Kampus');

      const enHtml = renderWithI18n(<EmsEventsFeed />, 'en');
      expect(enHtml).toContain('Campus Events');
    });

    it('ExcoCard renders dynamic module titles and taglines localized', () => {
      const moduleSample = {
        id: 'ekpp',
        name: 'Sistem Kelab',
        title: 'Pengurusan Kelab & Persatuan',
        description: 'Pengurusan kelab, aktiviti, laporan bulanan & kertas kerja secara digital.',
        route: '/laporan',
        color: '#f59e0b',
      };
      const msHtml = renderWithI18n(
        <ExcoCard
          module={moduleSample as any}
          color="#f59e0b"
          index={0}
          isEnabled={true}
          isSuperAdmin={false}
          onToggle={() => {}}
          onColorSave={() => {}}
        />,
        'ms'
      );
      expect(msHtml).toContain('Sistem Kelab');
      expect(msHtml).toContain('Kelab · Persatuan · Perpaduan');

      const enHtml = renderWithI18n(
        <ExcoCard
          module={moduleSample as any}
          color="#f59e0b"
          index={0}
          isEnabled={true}
          isSuperAdmin={false}
          onToggle={() => {}}
          onColorSave={() => {}}
        />,
        'en'
      );
      expect(enHtml).toContain('Club System');
      expect(enHtml).toContain('Clubs · Societies · Unity');
    });

    it('KarnivalMegaBanner renders voting ends label and action button', () => {
      const karnivalStatus = { name: 'Karnival Siswa', endDate: '2026-11-20' };
      const msHtml = renderWithI18n(<KarnivalMegaBanner karnivalStatus={karnivalStatus} />, 'ms');
      expect(msHtml).toContain('Undi ditutup dalam');
      expect(msHtml).toContain('Undi Booth Sekarang');

      const enHtml = renderWithI18n(<KarnivalMegaBanner karnivalStatus={karnivalStatus} />, 'en');
      expect(enHtml).toContain('Voting closes in');
      expect(enHtml).toContain('Vote Booth Now');
    });

    it('NextClassBentoCard renders holiday and weekend states localized', () => {
      const msHtml = renderWithI18n(<NextClassBentoCard entries={[]} />, 'ms');
      expect(msHtml).toContain('Jadual Kuliah Belum Dimuat Naik');
      expect(msHtml).toContain('Muat Naik Jadual');

      const enHtml = renderWithI18n(<NextClassBentoCard entries={[]} />, 'en');
      expect(enHtml).toContain('Lecture Schedule Not Yet Uploaded');
      expect(enHtml).toContain('Upload Schedule');
    });

    it('PolyMartFeed renders section headers and tab filters', () => {
      const msHtml = renderWithI18n(<PolyMartFeed />, 'ms');
      expect(msHtml).toContain('PolyMart Siswa');
      expect(msHtml).toContain('Terhangat');
      expect(msHtml).toContain('Terkini');
      expect(msHtml).toContain('Buka Mart');

      const enHtml = renderWithI18n(<PolyMartFeed />, 'en');
      expect(enHtml).toContain('Student PolyMart');
      expect(enHtml).toContain('Hot');
      expect(enHtml).toContain('Latest');
      expect(enHtml).toContain('Open Mart');
    });

    it('PolymartServiceModal renders modal description and service subtitles', () => {
      const msHtml = renderWithI18n(<PolymartServiceModal isOpen={true} onClose={() => {}} />, 'ms');
      expect(msHtml).toContain('Pilih perkhidmatan yang anda perlukan.');
      expect(msHtml).toContain('Beli &amp; Jual di Marketplace');
      expect(msHtml).toContain('Pemetaan Fasiliti Kampus');

      const enHtml = renderWithI18n(<PolymartServiceModal isOpen={true} onClose={() => {}} />, 'en');
      expect(enHtml).toContain('Choose the service you need.');
      expect(enHtml).toContain('Buy &amp; Sell on the Marketplace');
      expect(enHtml).toContain('Campus Facility Mapping');
    });

    it('PortalFooter renders developer signature with localized prefix', () => {
      const msHtml = renderWithI18n(<PortalFooter />, 'ms');
      expect(msHtml).toContain('Direka Oleh');

      const enHtml = renderWithI18n(<PortalFooter />, 'en');
      expect(enHtml).toContain('Engineered By');
    });

    it('QuickActions renders bento titles and buttons', () => {
      const msHtml = renderWithI18n(
        <QuickActions
          isSuperAdmin={false}
          isModuleEnabled={() => true}
          polyMartStats={null}
          hasKebajikanAccess={false}
          kbStats={null}
          isJPPMode={false}
        />,
        'ms'
      );
      expect(msHtml).toContain('Buka Servis');
      expect(msHtml).toContain('Suarakan Aduan');
      expect(msHtml).toContain('Scan QR');
      expect(msHtml).toContain('Takwim');

      const enHtml = renderWithI18n(
        <QuickActions
          isSuperAdmin={false}
          isModuleEnabled={() => true}
          polyMartStats={null}
          hasKebajikanAccess={false}
          kbStats={null}
          isJPPMode={false}
        />,
        'en'
      );
      expect(enHtml).toContain('Open Service');
      expect(enHtml).toContain('Submit Complaint');
      expect(enHtml).toContain('Scan QR');
      expect(enHtml).toContain('Official Calendar');
    });

    it('SupsasMegaBanner renders scoreboard, schedule and page buttons', () => {
      const edition = { name: 'SUPSAS 2026', start_date: '2026-11-01', is_active: true };
      const msHtml = renderWithI18n(<SupsasMegaBanner supsasEdition={edition} />, 'ms');
      expect(msHtml).toContain('Papan Markah');
      expect(msHtml).toContain('Jadual');
      expect(msHtml).toContain('Laman SUPSAS');

      const enHtml = renderWithI18n(<SupsasMegaBanner supsasEdition={edition} />, 'en');
      expect(enHtml).toContain('Scoreboard');
      expect(enHtml).toContain('Schedule');
      expect(enHtml).toContain('SUPSAS Page');
    });
  });

  describe('3. Core Pages Localization', () => {
    it('PortalPage renders official exco module header and select guide', () => {
      const msHtml = renderWithI18n(<PortalPage />, 'ms');
      expect(msHtml).toContain('Hab Portal Pelajar POLISAS');
      expect(msHtml).toContain('Selamat Datang ke Kampus Digital');
      expect(msHtml).toContain('Pilih unit exco atau perkhidmatan kampus di bawah untuk meneruskan:');

      const enHtml = renderWithI18n(<PortalPage />, 'en');
      expect(enHtml).toContain('POLISAS Student Portal Hub');
      expect(enHtml).toContain('Welcome to the Digital Campus');
      expect(enHtml).toContain('Select an exco unit or campus service below to proceed:');
    });

    it('AkademikLeaderboard renders title, subtitle and tabs', () => {
      const msHtml = renderWithI18n(<AkademikLeaderboard />, 'ms');
      expect(msHtml).toContain('Ranking merit akademik, QR, dan CGPA pelajar');
      expect(msHtml).toContain('Keseluruhan');
      expect(msHtml).toContain('Pencapaian');
      expect(msHtml).toContain('Merit Kelab');

      const enHtml = renderWithI18n(<AkademikLeaderboard />, 'en');
      expect(enHtml).toContain('Student academic, QR, and CGPA merit rankings');
      expect(enHtml).toContain('Overall');
      expect(enHtml).toContain('Achievements');
      expect(enHtml).toContain('Club Merit');
    });

    it('AkademikMeritPage renders total merit card and subtitle', () => {
      const msHtml = renderWithI18n(<AkademikMeritPage />, 'ms');
      expect(msHtml).toContain('Merit &amp; Demerit');
      expect(msHtml).toContain('Pusat sehenti untuk pencapaian kelab, akademik dan rayuan demerit.');
      expect(msHtml).toContain('Jumlah Merit (Semasa)');

      const enHtml = renderWithI18n(<AkademikMeritPage />, 'en');
      expect(enHtml).toContain('Merit &amp; Demerit');
      expect(enHtml).toContain('One-stop hub for club achievements, academics, and demerit appeals.');
      expect(enHtml).toContain('Total Merit (Current)');
    });

    it('AkademikQrPage renders hero scan button and instructions', () => {
      const msHtml = renderWithI18n(<AkademikQrPage />, 'ms');
      expect(msHtml).toContain('Scan QR Merit');
      expect(msHtml).toContain('Kumpul Merit Aktiviti');
      expect(msHtml).toContain('Buka Kamera &amp; Scan');
      expect(msHtml).toContain('Cara Kerja QR Merit');

      const enHtml = renderWithI18n(<AkademikQrPage />, 'en');
      expect(enHtml).toContain('Scan Merit QR');
      expect(enHtml).toContain('Collect Activity Merit');
      expect(enHtml).toContain('Open Camera &amp; Scan');
      expect(enHtml).toContain('How QR Merit Works');
    });

    it('LeaderboardPage renders initial loading state localized', () => {
      const msHtml = renderWithI18n(<LeaderboardPage />, 'ms');
      expect(msHtml).toContain('MENYUSUN RANKING...');

      const enHtml = renderWithI18n(<LeaderboardPage />, 'en');
      expect(enHtml).toContain('COMPILING RANKINGS...');
    });

    it('NotifikasiPage renders headers and filter chips', () => {
      const msHtml = renderWithI18n(<NotifikasiPage />, 'ms');
      expect(msHtml).toContain('Notifikasi');
      expect(msHtml).toContain('Semua');
      expect(msHtml).toContain('Belum Baca');

      const enHtml = renderWithI18n(<NotifikasiPage />, 'en');
      expect(enHtml).toContain('Notifications');
      expect(enHtml).toContain('All');
      expect(enHtml).toContain('Unread');
    });

    it('OnboardingPage renders welcome message and dashboard action', () => {
      const msHtml = renderWithI18n(<OnboardingPage />, 'ms');
      expect(msHtml).toContain('Selamat Datang ke Portal JPP POLISAS');
      expect(msHtml).toContain('Profil anda sedang dikemaskini. Sila tunggu sebentar atau hubungi pentadbir JPP.');
      expect(msHtml).toContain('Pergi ke Papan Pemuka');

      const enHtml = renderWithI18n(<OnboardingPage />, 'en');
      expect(enHtml).toContain('Welcome to the JPP POLISAS Portal');
      expect(enHtml).toContain('Your profile is being updated. Please wait a moment or contact a JPP administrator.');
      expect(enHtml).toContain('Go to Dashboard');
    });
  });
});
