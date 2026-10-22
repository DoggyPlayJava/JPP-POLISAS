import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n, { changeLanguage } from '@/lib/i18n';
import fs from 'fs';
import path from 'path';

// Polyfills for Node SSR environment
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
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    location: { search: '', pathname: '/', href: 'http://localhost/', origin: 'http://localhost/' },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    open: vi.fn(),
    confirm: vi.fn().mockReturnValue(true),
    localStorage: (globalThis as any).localStorage,
    sessionStorage: (globalThis as any).sessionStorage,
  };
}

// Mock react-dom createPortal for Node SSR environment
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<any>('react-dom');
  return {
    ...actual,
    createPortal: (children: any) => children,
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
    h3: ({ children, className, ...props }: any) => React.createElement('h3', { className, ...props }, children),
  },
  AnimatePresence: ({ children }: any) => children,
  useScroll: () => ({ scrollY: { getPrevious: () => 0 } }),
  useMotionValueEvent: vi.fn(),
  useDragControls: () => ({ start: vi.fn() }),
}));

// Mock leaflet and react-leaflet
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
  useMap: () => ({ fitBounds: vi.fn(), setView: vi.fn() }),
  useMapEvents: () => ({}),
}));

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-responsive-container' }, children),
  BarChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-bar-chart' }, children),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-pie-chart' }, children),
  Pie: ({ children }: any) => React.createElement('div', null, children),
  Cell: () => null,
  LineChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-line-chart' }, children),
  Line: () => null,
}));

// Mock Toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
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
          in: vi.fn().mockResolvedValue({ data: [] }),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
          then: vi.fn((cb: any) => Promise.resolve(cb({ data: [] }))),
        })),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        single: vi.fn().mockResolvedValue({ data: null }),
        in: vi.fn().mockResolvedValue({ data: [] }),
        then: vi.fn((cb: any) => Promise.resolve(cb({ data: [], count: 0 }))),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    })),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: 25.0, error: null }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/proof.webp' } }),
      })),
    },
  },
}));

// Mock Auth Context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'student@polisas.edu.my' },
    profile: {
      id: 'test-user-id',
      full_name: 'Ahmad Faiz',
      matric_no: '03DET22F1001',
      role: 'SUPER_ADMIN_JPP',
      department: 'JKE',
      phone: '0123456789',
    },
    isSuperAdmin: true,
  }),
}));

// Mock AiSettings Context
vi.mock('@/contexts/AiSettingsContext', () => ({
  useAiSettings: () => ({
    allowAiBudget: true,
  }),
}));

// Mock Theme Context
vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: any) => React.createElement('div', null, children),
}));

// Mock AiAssistant Hook
vi.mock('@/hooks/useAiAssistant', () => ({
  useAiAssistant: () => ({
    callAi: vi.fn(),
    isLoading: false,
    retryCount: 0,
  }),
}));

// Mock Tour
vi.mock('@/hooks/useTour', () => ({
  useTour: () => ({
    runTour: false,
    startTour: vi.fn(),
    closeTour: vi.fn(),
  }),
}));

vi.mock('@/components/ui/SystemTour', () => ({
  SystemTour: () => null,
}));

vi.mock('@/components/ui/FeatureToggle', () => ({
  FeatureToggle: ({ label, description }: any) => (
    <div data-testid="mock-feature-toggle">
      <span>{label}</span>
      <p>{description}</p>
    </div>
  ),
}));

// Mock Custom Sub-components of PolyRider & PolyTask
vi.mock('@/components/MapPicker', () => ({
  MapPicker: () => <div data-testid="mock-map-picker" />,
}));

vi.mock('@/components/polyrider/LocationSearchInput', () => ({
  LocationSearchInput: (props: any) => <input data-testid="mock-location-search" {...props} />,
}));

vi.mock('@/components/polyrider/CancelJobModal', () => ({
  CancelJobModal: () => null,
}));

vi.mock('@/components/polyrider/SwipeToSOS', () => ({
  SwipeToSOS: () => null,
}));

vi.mock('@/components/RouteViewer', () => ({
  RouteViewer: () => null,
}));

vi.mock('@/pages/polyrider/SOSContactsManager', () => ({
  SOSContactsManager: () => null,
}));

vi.mock('@/components/ai/KertasKerjaRenderer', () => ({
  KertasKerjaRenderer: () => null,
}));

vi.mock('@/components/ai/MinitMesyuaratRenderer', () => ({
  MinitMesyuaratRenderer: () => null,
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

// Target Components
import { NexusPage } from '@/pages/NexusPage';
import { PolyRiderHome } from '@/pages/polyrider/PolyRiderHome';
import { PolyRiderDashboard } from '@/pages/polyrider/PolyRiderDashboard';
import { PolyRiderAdminDashboard } from '@/pages/polyrider/admin/PolyRiderAdminDashboard';
import { PolyTaskBoard } from '@/pages/polytask/PolyTaskBoard';
import { PolyTaskMyJobs } from '@/pages/polytask/PolyTaskMyJobs';
import { PolyTaskJobDetail } from '@/pages/polytask/PolyTaskJobDetail';
import { PolyTaskAdmin } from '@/pages/polytask/admin/PolyTaskAdmin';
import { CreateJobModal } from '@/components/polytask/CreateJobModal';
import { PolyTaskDisputeModal } from '@/pages/polytask/PolyTaskDisputeModal';

// Helper to bypass initial React states like loading=true in Node SSR with strict post-render restoration
function renderWithStateBypass(
  ui: React.ReactElement,
  override: (initial: any) => any,
  path = '/'
) {
  const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let capturedDispatcher: any = null;
  let origUseState: any = null;

  const BypassWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const dispatcher = internals?.H;
    if (dispatcher && !origUseState) {
      capturedDispatcher = dispatcher;
      origUseState = dispatcher.useState;
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

  try {
    return renderToString(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[path]}>
          <BypassWrapper>{ui}</BypassWrapper>
        </MemoryRouter>
      </I18nextProvider>
    );
  } finally {
    if (capturedDispatcher && origUseState) {
      capturedDispatcher.useState = origUseState;
    }
  }
}

function renderWithLoadedState(ui: React.ReactElement, path = '/') {
  return renderWithStateBypass(ui, (val) => (val === true ? false : undefined), path);
}

describe('Domain 7 PolyGig, PolyRider, PolyTask & Nexus i18n Integration', () => {
  beforeEach(async () => {
    await changeLanguage('ms');
  });

  // ─── 1. DICTIONARY CONTRACT PARITY TESTS ─────────────────────
  describe('Dictionary Contract Parity for gig namespace', () => {
    it('verifies 100% key parity between en and ms for gig namespace', () => {
      const enPath = path.resolve(__dirname, '../locales/en/gig.json');
      const msPath = path.resolve(__dirname, '../locales/ms/gig.json');

      expect(fs.existsSync(enPath)).toBe(true);
      expect(fs.existsSync(msPath)).toBe(true);

      const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
      const msJson = JSON.parse(fs.readFileSync(msPath, 'utf8'));

      const enKeys = Object.keys(enJson).sort();
      const msKeys = Object.keys(msJson).sort();

      expect(enKeys).toEqual(msKeys);
      expect(enKeys.length).toBeGreaterThan(100);

      // Verify no empty string values exist
      enKeys.forEach((key) => {
        expect(typeof enJson[key]).toBe('string');
        expect(enJson[key].trim().length).toBeGreaterThan(0);
        expect(typeof msJson[key]).toBe('string');
        expect(msJson[key].trim().length).toBeGreaterThan(0);
      });
    });
  });

  // ─── 2. DOM RENDERING IN ENGLISH (en) ─────────────────────────
  describe('English (en) DOM Rendering', () => {
    beforeEach(async () => {
      await changeLanguage('en');
    });

    it('renders NexusPage in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/nexus']}>
          <I18nextProvider i18n={i18n}>
            <NexusPage />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Nexus AI Hub');
      expect(html).toContain('Working Paper Generator');
      expect(html).toContain('Meeting Minutes');
    });

    it('renders PolyRiderHome in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polyrider']}>
          <I18nextProvider i18n={i18n}>
            <PolyRiderHome />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('PolyRider');
      expect(html).toContain('Affordable, Fast &amp; Safe Campus Delivery');
      expect(html).toContain('Manage SOS');
      expect(html).toContain('Search pickup location...');
      expect(html).toContain('Search destination location...');
      expect(html).toContain('Earn Income');
      expect(html).toContain('Register Rider / Driver');
    });

    it('renders PolyRiderDashboard in English', () => {
      const html = renderWithLoadedState(<PolyRiderDashboard />, '/polyrider/dashboard');
      expect(html).toContain('Become a PolyRider');
      expect(html).toContain('Vehicle Type');
      expect(html).toContain('Submit Application');
    });

    it('renders PolyRiderAdminDashboard in English', () => {
      const html = renderWithLoadedState(<PolyRiderAdminDashboard />, '/jpp/polyrider');
      expect(html).toContain('KLK Control Panel');
      expect(html).toContain('PolyRider Management');
      expect(html).toContain('Rider Management');
      expect(html).toContain('Presets');
      expect(html).toContain('Settings');
    });

    it('renders PolyTaskJobDetail in English', () => {
      const mockJob = {
        id: 'job-123',
        title: 'Format Laptop HP & Install Windows 11',
        description: 'Need fast format and installation today.',
        category: 'TEKNIKAL',
        location: 'Kamsis A',
        budget: 50.0,
        deadline: '2026-12-31T23:59:59.000Z',
        status: 'OPEN',
        requester_id: 'other-user',
        requester: {
          id: 'other-user',
          full_name: 'Muhammad Haziq',
          phone: '0198765432',
        },
      };

      const html = renderWithStateBypass(
        <Routes>
          <Route path="/polytask/job/:id" element={<PolyTaskJobDetail />} />
        </Routes>,
        (val) => {
          if (val === true) return false; // loading -> false
          if (val === null) return mockJob; // job -> mockJob
          return undefined;
        },
        '/polytask/job/job-123'
      );

      expect(html).toContain('Back');
      expect(html).toContain('Share');
      expect(html).toContain('OPEN');
      expect(html).toContain('Format Laptop HP &amp; Install Windows 11');
      expect(html).toContain('Location');
      expect(html).toContain('Deadline');
      expect(html).toContain('Offered Reward');
      expect(html).toContain('Requester');
      expect(html).toContain('Submit Bid');
      expect(html).toContain('Your Bid Price (RM)');
    });

    it('renders PolyTaskBoard in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polytask']}>
          <I18nextProvider i18n={i18n}>
            <PolyTaskBoard />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('100% Student-to-Student Service');
      expect(html).toContain('Find Opportunities,');
      expect(html).toContain('Earn Income.');
      expect(html).toContain('Search tasks (e.g., Format Laptop, Buy Food...)');
      expect(html).toContain('Available Tasks');
      expect(html).toContain('Sort by:');
      expect(html).toContain('Latest');
    });

    it('renders PolyTaskMyJobs in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polytask/my-jobs']}>
          <I18nextProvider i18n={i18n}>
            <PolyTaskMyJobs />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('My');
      expect(html).toContain('Tasks');
      expect(html).toContain('Monitor the status of your posted tasks and select the best Tasker.');
    });

    it('renders PolyTaskAdmin in English', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/jpp/polytask']}>
          <I18nextProvider i18n={i18n}>
            <PolyTaskAdmin />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('PolyTask Admin');
      expect(html).toContain('Gig Economy Control');
      expect(html).toContain('Total Tasks');
      expect(html).toContain('Active Now');
      expect(html).toContain('PolyTask Module');
      expect(html).toContain('All Statuses');
    });

    it('renders CreateJobModal in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <CreateJobModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Create New Task');
      expect(html).toContain('Post your task to fellow campus students.');
      expect(html).toContain('Step 1: Details');
      expect(html).toContain('Task Title');
      expect(html).toContain('Category');
      expect(html).toContain('Academic (Tutor, Assignment)');
      expect(html).toContain('Next');
    });

    it('renders PolyTaskDisputeModal in English', () => {
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <PolyTaskDisputeModal
              isOpen={true}
              onClose={vi.fn()}
              jobId="job-1"
              reporterId="user-1"
              onDisputeSubmitted={vi.fn()}
            />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Report Dispute');
      expect(html).toContain('Complaint / Dispute Reason');
      expect(html).toContain('Submit Report');
    });
  });

  // ─── 3. DOM RENDERING IN MALAY (ms) ───────────────────────────
  describe('Malay (ms) DOM Rendering', () => {
    beforeEach(async () => {
      await changeLanguage('ms');
    });

    it('renders PolyTaskBoard in Malay', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polytask']}>
          <I18nextProvider i18n={i18n}>
            <PolyTaskBoard />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('100% Khidmat Pelajar ke Pelajar');
      expect(html).toContain('Cari Peluang,');
      expect(html).toContain('Jana Pendapatan.');
      expect(html).toContain('Tugasan Tersedia');
      expect(html).toContain('Susunan:');
      expect(html).toContain('Paling Baru');
    });

    it('renders PolyTaskMyJobs in Malay', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/polytask/my-jobs']}>
          <I18nextProvider i18n={i18n}>
            <PolyTaskMyJobs />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Kerja');
      expect(html).toContain('Saya');
      expect(html).toContain('Pantau status tugasan yang anda iklankan dan pilih Tasker terbaik.');
    });

    it('renders PolyTaskAdmin in Malay', () => {
      const html = renderToString(
        <MemoryRouter initialEntries={['/jpp/polytask']}>
          <I18nextProvider i18n={i18n}>
            <PolyTaskAdmin />
          </I18nextProvider>
        </MemoryRouter>
      );
      expect(html).toContain('Admin PolyTask');
      expect(html).toContain('Kawalan Ekonomi Gig');
      expect(html).toContain('Jumlah Tugasan');
      expect(html).toContain('Sedang Aktif');
      expect(html).toContain('Modul PolyTask');
      expect(html).toContain('Semua Status');
    });
  });
});
