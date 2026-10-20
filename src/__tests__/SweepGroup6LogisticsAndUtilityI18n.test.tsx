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

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop: string) => {
      return ({ children, className, style, ...props }: any) => {
        const { initial, animate, exit, transition, whileHover, whileTap, layout, layoutId, ...rest } = props;
        return React.createElement(prop, { className, style, ...rest }, children);
      };
    },
  }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: vi.fn(), set: vi.fn() }),
  useMotionValue: (val: any) => ({ get: () => val, set: vi.fn() }),
  useSpring: (val: any) => val,
  useTransform: () => 0,
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
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        limit: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      order: vi.fn().mockResolvedValue({ data: [] }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
      rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      })),
      removeChannel: vi.fn(),
      auth: {
        updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
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
      role: 'STUDENT',
      program: 'DET',
      semester: 4,
    },
    isSuperAdmin: false,
    isLoading: false,
  }),
}));

// Mock EMS lib
vi.mock('@/lib/ems', () => ({
  fetchUserCertificates: vi.fn().mockResolvedValue([]),
  fetchEmsEvents: vi.fn().mockResolvedValue([]),
}));

// Mock UI toggles & global components
vi.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => null,
}));
vi.mock('@/components/ui/LanguageToggle', () => ({
  LanguageToggle: () => null,
}));
vi.mock('@/components/layout/BottomNav', () => ({
  BottomNav: () => null,
}));
vi.mock('@/components/ai/FloatingAiChat', () => ({
  FloatingAiChat: () => null,
}));
vi.mock('@/components/polytask/CreateJobModal', () => ({
  CreateJobModal: () => null,
}));

// Import Components to Test
import { PolyRiderSuspended } from '@/pages/polyrider/PolyRiderSuspended';
import { SOSContactsManager } from '@/pages/polyrider/SOSContactsManager';
import { PolyTaskMyBids } from '@/pages/polytask/PolyTaskMyBids';
import { EmsCertVerifyPage } from '@/pages/ems/EmsCertVerifyPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { PendingPage } from '@/pages/PendingPage';
import { RejectedPage } from '@/pages/RejectedPage';

describe('Sweep Group 6: Logistics and Utility Pages i18n Test Suite', () => {
  beforeEach(async () => {
    await changeLanguage('ms');
  });

  describe('1. 100% Dictionary Key Parity & Non-Empty String Verification', () => {
    const namespaces = ['gig', 'ems', 'jpp', 'portal', 'common'];

    namespaces.forEach((ns) => {
      it(`verifies 100% parity and no empty strings for ${ns}.json`, () => {
        const enPath = path.resolve(process.cwd(), `src/locales/en/${ns}.json`);
        const msPath = path.resolve(process.cwd(), `src/locales/ms/${ns}.json`);

        expect(fs.existsSync(enPath), `en/${ns}.json must exist`).toBe(true);
        expect(fs.existsSync(msPath), `ms/${ns}.json must exist`).toBe(true);

        const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
        const ms = JSON.parse(fs.readFileSync(msPath, 'utf8'));

        const enKeys = Object.keys(en).sort();
        const msKeys = Object.keys(ms).sort();

        expect(enKeys, `Keys for ${ns} must match exactly between EN and MS`).toEqual(msKeys);

        enKeys.forEach((key) => {
          expect(typeof en[key], `Value for ${ns}:${key} in EN must be string`).toBe('string');
          expect(typeof ms[key], `Value for ${ns}:${key} in MS must be string`).toBe('string');
          expect(en[key].trim().length, `Value for ${ns}:${key} in EN cannot be empty`).toBeGreaterThan(0);
          expect(ms[key].trim().length, `Value for ${ns}:${key} in MS cannot be empty`).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('2. Component SSR Render in Malay (BM)', () => {
    it('renders PolyRiderSuspended in Malay', async () => {
      await changeLanguage('ms');
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <PolyRiderSuspended suspendedUntil="2026-12-31T23:59:59Z" />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Akaun Digantung');
      expect(html).toContain('Penggantungan Tamat Pada');
      expect(html).toContain('Akaun PolyRider anda telah digantung');
    });

    it('renders SOSContactsManager in Malay', async () => {
      await changeLanguage('ms');
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <SOSContactsManager fullPage={true} />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Kenalan Kecemasan SOS');
      expect(html).toContain('Mereka akan dimaklumkan semasa SOS dicetuskan');
    });

    it('renders PolyTaskMyBids in Malay', async () => {
      await changeLanguage('ms');
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <PolyTaskMyBids />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Bidaan');
      expect(html).toContain('Saya');
      expect(html).toContain('Pantau status tawaran khidmat');
    });

    it('renders EmsCertVerifyPage in Malay', async () => {
      await changeLanguage('ms');
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <EmsCertVerifyPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Sahkan Sijil Digital Anda');
      expect(html).toContain('Semakan Ketulenan E-Sijil EMS');
      expect(html).toContain('Semak Ketulenan Sijil');
      expect(html).toContain('Portal Rasmi POLISAS');
    });

    it('renders ResetPasswordPage in Malay', async () => {
      await changeLanguage('ms');
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <ResetPasswordPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Cipta Kata Laluan Baharu');
      expect(html).toContain('Sila tetapkan kata laluan keselamatan baharu');
      expect(html).toContain('Kemaskini Kata Laluan');
    });

    it('renders PendingPage in Malay', async () => {
      await changeLanguage('ms');
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <PendingPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Menunggu Kelulusan');
      expect(html).toContain('memerlukan pengesahan');
      expect(html).toContain('Log Keluar');
    });

    it('renders RejectedPage in Malay', async () => {
      await changeLanguage('ms');
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <RejectedPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Permohonan Ditolak');
      expect(html).toMatch(/Log Keluar (&amp;|&) Cuba Lagi/);
    });
  });

  describe('3. Component SSR Render in English (EN)', () => {
    it('renders PolyRiderSuspended in English', async () => {
      await changeLanguage('en');
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <PolyRiderSuspended suspendedUntil="2026-12-31T23:59:59Z" />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Account Suspended');
      expect(html).toContain('Suspension Ends On');
      expect(html).toContain('Your PolyRider account has been suspended');
    });

    it('renders SOSContactsManager in English', async () => {
      await changeLanguage('en');
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <SOSContactsManager fullPage={true} />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('SOS Emergency Contacts');
      expect(html).toContain('They will be notified when SOS is triggered');
    });

    it('renders PolyTaskMyBids in English', async () => {
      await changeLanguage('en');
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <PolyTaskMyBids />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('My');
      expect(html).toContain('Bids');
      expect(html).toContain('Track the status of your service offers');
    });

    it('renders EmsCertVerifyPage in English', async () => {
      await changeLanguage('en');
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <EmsCertVerifyPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Verify Your Digital Certificate');
      expect(html).toContain('EMS E-Certificate Authenticity Verification');
      expect(html).toContain('Verify Certificate Authenticity');
      expect(html).toContain('Official POLISAS Portal');
    });

    it('renders ResetPasswordPage in English', async () => {
      await changeLanguage('en');
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <ResetPasswordPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Create New Password');
      expect(html).toContain('Please set a new security password');
      expect(html).toContain('Update Password');
    });

    it('renders PendingPage in English', async () => {
      await changeLanguage('en');
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <PendingPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Pending Approval');
      expect(html).toContain('requires verification');
      expect(html).toContain('Log Out');
    });

    it('renders RejectedPage in English', async () => {
      await changeLanguage('en');
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <RejectedPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Application Rejected');
      expect(html).toMatch(/Sign Out (&amp;|&) Try Again/);
    });
  });

  describe('4. Dynamic Language Switching Verification', () => {
    it('dynamically switches language between BM and EN seamlessly', async () => {
      // Step 1: BM
      await changeLanguage('ms');
      let html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <PendingPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Menunggu Kelulusan');
      expect(html).not.toContain('Pending Approval');

      // Step 2: EN
      await changeLanguage('en');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <PendingPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Pending Approval');
      expect(html).not.toContain('Menunggu Kelulusan');

      // Step 3: Switch back to BM
      await changeLanguage('ms');
      html = renderToString(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <PendingPage />
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(html).toContain('Menunggu Kelulusan');
      expect(html).not.toContain('Pending Approval');
    });
  });
});
