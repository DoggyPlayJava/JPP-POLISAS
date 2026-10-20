import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import fs from 'fs';
import path from 'path';
import i18n, { changeLanguage } from '@/lib/i18n';

// Polyfills for Node test environment
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

// Mock react-dom createPortal to allow rendering BottomNav in renderToString
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<any>('react-dom');
  return {
    ...actual,
    createPortal: (node: any) => node,
  };
});

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => React.createElement('div', { className, ...props }, children),
    nav: ({ children, className, ...props }: any) => React.createElement('nav', { className, ...props }, children),
    button: ({ children, className, ...props }: any) => React.createElement('button', { className, ...props }, children),
    span: ({ children, className, ...props }: any) => React.createElement('span', { className, ...props }, children),
    p: ({ children, className, ...props }: any) => React.createElement('p', { className, ...props }, children),
    h1: ({ children, className, ...props }: any) => React.createElement('h1', { className, ...props }, children),
    h2: ({ children, className, ...props }: any) => React.createElement('h2', { className, ...props }, children),
  },
  AnimatePresence: ({ children }: any) => children,
  useScroll: () => ({ scrollY: { getPrevious: () => 0 } }),
  useMotionValueEvent: vi.fn(),
  useDragControls: () => ({ start: vi.fn() }),
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
          in: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          })),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          single: vi.fn().mockResolvedValue({ data: null }),
        })),
        in: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [] }),
        })),
        order: vi.fn().mockResolvedValue({ data: [] }),
        limit: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null }),
        })),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        single: vi.fn().mockResolvedValue({ data: null }),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
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
      subscribe: vi.fn().mockReturnValue({}),
    })),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
    auth: {
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// Mock Contexts
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123', email: 'jpp@polisas.edu.my' },
    profile: {
      id: 'test-user-123',
      full_name: 'Muhammad Farhan',
      role: 'JPP',
      department: 'JPP',
      jpp_unit: 'KPP',
      club_id: 'club-test-1',
      matric_no: '02DKA23F1001',
      residence_type: 'KAMSIS',
      merit_points: 120,
      avatar_url: null,
    },
    effectiveRole: 'JPP',
    selectedClubId: 'club-test-1',
    userClubIds: ['club-test-1'],
    isSuperAdmin: true,
    isAdvisor: false,
    isPresident: true,
    isMT: true,
    isMember: true,
    isJppMember: true,
    isKebajikanExco: true,
    hasKeusahawananAccess: true,
    hasKppAccess: true,
    signOut: vi.fn(),
    setSelectedClubId: vi.fn(),
  }),
}));

vi.mock('@/contexts/AiSettingsContext', () => ({
  useAiSettings: () => ({ allowAiBudget: true }),
}));

vi.mock('@/contexts/KarnivalContext', () => ({
  useKarnivalStatus: () => ({ isActive: true, name: 'Karnival JPP' }),
}));

vi.mock('@/contexts/AcademicSessionContext', () => ({
  useAcademicSession: () => ({
    intake1Month: 7,
    intake2Month: 12,
    activeSession: '2026/2027',
    semesterString: '1',
  }),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
  }),
}));

vi.mock('@/hooks/useTour', () => ({
  useTour: () => ({ runTour: false, startTour: vi.fn(), closeTour: vi.fn() }),
}));

vi.mock('@/hooks/useKlkDynamicFields', () => ({
  useKlkDynamicFields: () => ({ data: [], loading: false }),
}));

// Mock accessory components
vi.mock('@/components/ai/FloatingAiChat', () => ({
  FloatingAiChat: () => null,
}));

vi.mock('@/components/jpp/QrCodeFab', () => ({
  QrCodeFab: () => null,
}));

vi.mock('@/components/ui/SystemTour', () => ({
  SystemTour: () => null,
}));

vi.mock('@/components/portal/PolymartServiceModal', () => ({
  PolymartServiceModal: () => null,
}));

vi.mock('@/components/ui/NotificationBell', () => ({
  NotificationBell: () => React.createElement('div', { id: 'mock-notif-bell' }),
}));

vi.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => React.createElement('div', { id: 'mock-theme-toggle' }),
}));

// Target Components & Shells to test
import { JppSidebar } from '@/pages/jpp/JppSidebar';
import { KebajikanSidebar } from '@/pages/kebajikan/KebajikanSidebar';
import { KlkSidebar } from '@/pages/klk/KlkSidebar';
import { PolyRentSidebar } from '@/pages/polyrent/PolyRentSidebar';
import { Sidebar } from '@/components/layout/Sidebar';
import { PortalSidebar } from '@/components/layout/PortalSidebar';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { SettingsPage } from '@/pages/SettingsPage';
import { KebajikanSettingsPage } from '@/pages/kebajikan/KebajikanSettingsPage';
import { PolyMartLayout } from '@/pages/polymart/PolyMartLayout';
import { AkademikLayout } from '@/pages/akademik/AkademikLayout';
import { JppStructureSettings } from '@/pages/jpp/JppStructureSettings';

function renderWithI18n(ui: React.ReactElement, path = '/') {
  return renderToString(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        {ui}
      </MemoryRouter>
    </I18nextProvider>
  );
}

const StateBypass: React.FC<{
  children: React.ReactNode;
  override: (initial: any) => any;
}> = ({ children, override }) => {
  const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const dispatcher = internals?.H;
  if (dispatcher) {
    const origUseState = dispatcher.useState;
    dispatcher.useState = function (initial: any) {
      const custom = override(initial);
      if (custom !== undefined) {
        return [custom, () => {}];
      }
      return origUseState.apply(this, arguments);
    };
  }
  return <>{children}</>;
};

function renderWithLoadedState(ui: React.ReactElement, path = '/') {
  return renderWithI18n(
    <StateBypass override={(val) => (val === true ? false : undefined)}>
      {ui}
    </StateBypass>,
    path
  );
}

function renderWithMountedState(ui: React.ReactElement, path = '/') {
  let hasMounted = false;
  return renderWithI18n(
    <StateBypass
      override={(val) => {
        if (val === false && !hasMounted) {
          hasMounted = true;
          return true;
        }
        return undefined;
      }}
    >
      {ui}
    </StateBypass>,
    path
  );
}

describe('Domain 0: Navigation Docks, Sidebars & Global Shells I18n', () => {

  describe('Dictionary Integrity & 100% Key Parity', () => {
    const namespaces = ['nav', 'portal', 'settings', 'jpp', 'kebajikan', 'housing', 'klk', 'common', 'ems', 'commerce', 'akademik'];

    namespaces.forEach((ns) => {
      it(`en and ms ${ns}.json dictionaries have exact 100% key parity and no empty strings`, () => {
        const msPath = path.resolve(process.cwd(), `src/locales/ms/${ns}.json`);
        const enPath = path.resolve(process.cwd(), `src/locales/en/${ns}.json`);

        expect(fs.existsSync(msPath)).toBe(true);
        expect(fs.existsSync(enPath)).toBe(true);

        const msData = JSON.parse(fs.readFileSync(msPath, 'utf8'));
        const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

        const msKeys = Object.keys(msData).sort();
        const enKeys = Object.keys(enData).sort();

        expect(msKeys).toEqual(enKeys);

        msKeys.forEach((key) => {
          expect(typeof msData[key]).toBe('string');
          expect(msData[key].trim().length).toBeGreaterThan(0);
          expect(typeof enData[key]).toBe('string');
          expect(enData[key].trim().length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Bahasa Melayu (ms) Navigations & Sidebars Rendering', () => {
    beforeEach(async () => {
      await changeLanguage('ms');
    });

    it('renders JppSidebar with Bahasa Melayu navigation and exco labels', () => {
      const html = renderWithI18n(<JppSidebar />);
      expect(html).toContain('Portal JPP HQ');
      expect(html).toContain('Laman Utama');
      expect(html).toContain('Pengurusan Pelajar');
      expect(html).toContain('Pentadbiran Portal');
      expect(html).toContain('Log Keluar');
    });

    it('renders KebajikanSidebar with Bahasa Melayu navigation and ticket labels', () => {
      const html = renderWithI18n(<KebajikanSidebar />);
      expect(html).toContain('Hab Kebajikan');
      expect(html).toContain('Pengurusan');
      expect(html).toContain('Senarai Tiket');
      expect(html).toContain('Log Keluar');
    });

    it('renders KlkSidebar with Bahasa Melayu residency and logistic navigation', () => {
      const html = renderWithI18n(<KlkSidebar />);
      expect(html).toContain('E-Kediaman');
      expect(html).toContain('Kediaman Luar Kampus');
      expect(html).toContain('Papan Pemuka');
      expect(html).toContain('Logistik');
      expect(html).toContain('Log Keluar');
    });

    it('renders PolyRentSidebar with Bahasa Melayu housing navigation', () => {
      const html = renderWithI18n(<PolyRentSidebar isOpen={true} onClose={() => {}} onOpenMyAds={() => {}} />);
      expect(html).toContain('Cari Rumah');
      expect(html).toContain('Iklan Saya');
      expect(html).toContain('Log Keluar');
    });

    it('renders Global Sidebar with Bahasa Melayu main menu, status, and club badges', () => {
      const html = renderWithI18n(<Sidebar />);
      expect(html).toContain('Portal JPP');
      expect(html).toContain('Menu Utama');
      expect(html).toContain('Status');
      expect(html).toContain('Log Keluar');
    });

    it('renders PortalSidebar with Bahasa Melayu primary navigation and active systems', () => {
      const html = renderWithI18n(<PortalSidebar isOpen={true} onClose={() => {}} onOpen={() => {}} />);
      expect(html).toContain('Utama');
      expect(html).toContain('Laman Utama');
      expect(html).toContain('Tetapan Profil');
      expect(html).toContain('Sistem Aktif');
      expect(html).toContain('Log Keluar');
    });

    it('renders PortalNavbar with localized fallback name', () => {
      const html = renderWithI18n(
        <PortalNavbar
          isScrolled={false}
          karnivalActive={false}
          supsasActive={false}
          profile={{ full_name: '' }}
          setIsSidebarOpen={() => {}}
        />
      );
      expect(html).toContain('Pelajar');
    });

    it('renders BottomNav with Bahasa Melayu navigation items', () => {
      const htmlPortal = renderWithMountedState(<BottomNav />, '/portal');
      expect(htmlPortal).toContain('Utama');

      const htmlTetapan = renderWithMountedState(<BottomNav />, '/tetapan');
      expect(htmlTetapan).toContain('Profil');
    });

    it('renders SettingsPage with Bahasa Melayu tabs and residence declaration', () => {
      const html = renderWithI18n(<SettingsPage />);
      expect(html).toContain('Profil &amp; Akademik');
      expect(html).toContain('Status Kediaman');
      expect(html).toContain('Paparan &amp; Bahasa');
      expect(html).toContain('Pemberitahuan');
      expect(html).toContain('Keselamatan');
      expect(html).toContain('Bantuan &amp; Tutorial');
      expect(html).toContain('Asrama Kamsis');
    });

    it('renders KebajikanSettingsPage with Bahasa Melayu SLA and retention headings', () => {
      const html = renderWithLoadedState(<KebajikanSettingsPage />);
      expect(html).toContain('Tetapan E-Kebajikan');
      expect(html).toContain('Konfigurasi SLA');
      expect(html).toContain('Notifikasi Email');
      expect(html).toContain('Mesej Auto-Reply');
      expect(html).toContain('Pengekalan Data &amp; Pembersihan');
      expect(html).toContain('Pengurusan Preset PIC');
    });

    it('renders PolyMartLayout with Bahasa Melayu categories and search placeholders', () => {
      const html = renderWithI18n(<PolyMartLayout />, '/polymart');
      expect(html).toContain('Cari makanan, servis, pakaian...');
      expect(html).toContain('Semua');
      expect(html).toContain('Makanan');
      expect(html).toContain('Minuman');
    });

    it('renders AkademikLayout with Bahasa Melayu navigation and documents item', () => {
      const html = renderWithI18n(<AkademikLayout />);
      expect(html).toContain('Papan Pemuka');
      expect(html).toContain('Pencapaian');
      expect(html).toContain('Dokumen');
      expect(html).toContain('Leaderboard');
      expect(html).toContain('Takwim');
      expect(html).toContain('Imbas Kod QR');
    });

    it('renders JppStructureSettings with Bahasa Melayu structure titles and actions', () => {
      const html = renderWithLoadedState(<JppStructureSettings />);
      expect(html).toContain('Urus Struktur JPP/Exco');
      expect(html).toContain('Label Jawatan Majlis Tertinggi');
      expect(html).toContain('Nama Exco/Unit');
    });
  });

  describe('English (en) Navigations & Sidebars Rendering', () => {
    beforeEach(async () => {
      await changeLanguage('en');
    });

    it('renders JppSidebar with English navigation and exco labels', () => {
      const html = renderWithI18n(<JppSidebar />);
      expect(html).toContain('JPP HQ Portal');
      expect(html).toContain('Home');
      expect(html).toContain('Student Management');
      expect(html).toContain('Portal Administration');
      expect(html).toContain('Log Out');
    });

    it('renders KebajikanSidebar with English navigation and ticket labels', () => {
      const html = renderWithI18n(<KebajikanSidebar />);
      expect(html).toContain('Welfare Hub');
      expect(html).toContain('Management');
      expect(html).toContain('Ticket List');
      expect(html).toContain('Log Out');
    });

    it('renders KlkSidebar with English residency and logistic navigation', () => {
      const html = renderWithI18n(<KlkSidebar />);
      expect(html).toContain('E-Housing');
      expect(html).toContain('Off-Campus Housing');
      expect(html).toContain('Dashboard');
      expect(html).toContain('Logistics');
      expect(html).toContain('Log Out');
    });

    it('renders PolyRentSidebar with English housing navigation', () => {
      const html = renderWithI18n(<PolyRentSidebar isOpen={true} onClose={() => {}} onOpenMyAds={() => {}} />);
      expect(html).toContain('Find House');
      expect(html).toContain('My Listings');
      expect(html).toContain('Log Out');
    });

    it('renders Global Sidebar with English main menu and JPP HQ portal', () => {
      const html = renderWithI18n(<Sidebar />);
      expect(html).toContain('JPP HQ Portal');
      expect(html).toContain('Main Menu');
      expect(html).toContain('Status');
      expect(html).toContain('Log Out');
    });

    it('renders PortalSidebar with English primary navigation and system active', () => {
      const html = renderWithI18n(<PortalSidebar isOpen={true} onClose={() => {}} onOpen={() => {}} />);
      expect(html).toContain('Main');
      expect(html).toContain('Home');
      expect(html).toContain('Profile Settings');
      expect(html).toContain('System Active');
      expect(html).toContain('Log Out');
    });

    it('renders PortalNavbar with English fallback name', () => {
      const html = renderWithI18n(
        <PortalNavbar
          isScrolled={false}
          karnivalActive={false}
          supsasActive={false}
          profile={{ full_name: '' }}
          setIsSidebarOpen={() => {}}
        />
      );
      expect(html).toContain('Student');
    });

    it('renders BottomNav with English navigation items', () => {
      const htmlPortal = renderWithMountedState(<BottomNav />, '/portal');
      expect(htmlPortal).toContain('Main');

      const htmlTetapan = renderWithMountedState(<BottomNav />, '/tetapan');
      expect(htmlTetapan).toContain('Profile');
    });

    it('renders SettingsPage with English tabs and hostel declaration', () => {
      const html = renderWithI18n(<SettingsPage />);
      expect(html).toContain('Profile &amp; Academic');
      expect(html).toContain('Housing Status');
      expect(html).toContain('Display &amp; Language');
      expect(html).toContain('Notifications');
      expect(html).toContain('Security');
      expect(html).toContain('Help &amp; Tutorials');
      expect(html).toContain('Kamsis Hostel');
    });

    it('renders KebajikanSettingsPage with English SLA and retention headings', () => {
      const html = renderWithLoadedState(<KebajikanSettingsPage />);
      expect(html).toContain('E-Welfare Settings');
      expect(html).toContain('SLA Configuration');
      expect(html).toContain('Email Notifications');
      expect(html).toContain('Auto-Reply Message');
      expect(html).toContain('Data Retention &amp; Cleanup');
      expect(html).toContain('PIC Preset Management');
    });

    it('renders PolyMartLayout with English categories and search placeholders', () => {
      const html = renderWithI18n(<PolyMartLayout />, '/polymart');
      expect(html).toContain('Search food, services, apparel...');
      expect(html).toContain('All');
      expect(html).toContain('Food');
      expect(html).toContain('Beverages');
    });

    it('renders AkademikLayout with English navigation and documents item', () => {
      const html = renderWithI18n(<AkademikLayout />);
      expect(html).toContain('Dashboard');
      expect(html).toContain('Achievements');
      expect(html).toContain('Documents');
      expect(html).toContain('Leaderboard');
      expect(html).toContain('Calendar');
      expect(html).toContain('Scan QR Code');
    });

    it('renders JppStructureSettings with English structure titles and actions', () => {
      const html = renderWithLoadedState(<JppStructureSettings />);
      expect(html).toContain('Manage JPP/Exco Structure');
      expect(html).toContain('Supreme Council Position Labels');
      expect(html).toContain('Exco/Unit Names');
    });
  });

  describe('Dynamic Language Toggling across Domain 0 Shells', () => {
    it('seamlessly toggles JppSidebar between English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      let html = renderWithI18n(<JppSidebar />);
      expect(html).toContain('Student Management');
      expect(html).not.toContain('Pengurusan Pelajar');

      await changeLanguage('ms');
      html = renderWithI18n(<JppSidebar />);
      expect(html).toContain('Pengurusan Pelajar');
      expect(html).not.toContain('Student Management');
    });

    it('seamlessly toggles KebajikanSidebar between English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      let html = renderWithI18n(<KebajikanSidebar />);
      expect(html).toContain('Welfare Hub');
      expect(html).not.toContain('Hab Kebajikan');

      await changeLanguage('ms');
      html = renderWithI18n(<KebajikanSidebar />);
      expect(html).toContain('Hab Kebajikan');
      expect(html).not.toContain('Welfare Hub');
    });

    it('seamlessly toggles SettingsPage tabs between English and Bahasa Melayu', async () => {
      await changeLanguage('en');
      let html = renderWithI18n(<SettingsPage />);
      expect(html).toContain('Profile &amp; Academic');
      expect(html).toContain('Housing Status');

      await changeLanguage('ms');
      html = renderWithI18n(<SettingsPage />);
      expect(html).toContain('Profil &amp; Akademik');
      expect(html).toContain('Status Kediaman');
    });
  });
});
