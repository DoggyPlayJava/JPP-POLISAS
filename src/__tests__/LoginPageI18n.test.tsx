import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import fs from 'fs';
import path from 'path';
import i18n, { changeLanguage } from '@/lib/i18n';
import { LoginPage } from '@/pages/LoginPage';

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

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    location: {
      search: '',
      origin: 'http://localhost:3000',
      href: 'http://localhost:3000/login',
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

// Mock Supabase calls made during LoginPage render
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        })),
        then: vi.fn((cb: any) => Promise.resolve(cb({ data: [], count: 21 }))),
      })),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

// Mock framer-motion for clean SSR output
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      React.createElement('div', { className, ...props }, children)
    ),
    form: ({ children, className, ...props }: any) => (
      React.createElement('form', { className, ...props }, children)
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

describe('Task 5: Auth & Login Page Internationalization (i18n)', () => {
  const loginPagePath = path.resolve(__dirname, '../pages/LoginPage.tsx');
  const sourceCode = fs.readFileSync(loginPagePath, 'utf8');

  beforeEach(async () => {
    localStorage.clear();
    await changeLanguage('en');
  });

  describe('Source Code & Contract Verifications', () => {
    it('imports LanguageToggle and useTranslation in LoginPage.tsx', () => {
      expect(sourceCode).toContain("import { LanguageToggle } from '@/components/ui/LanguageToggle';");
      expect(sourceCode).toContain("import { useTranslation } from 'react-i18next';");
      expect(sourceCode).toContain("useTranslation(['auth', 'common'])");
    });

    it('mounts LanguageToggle in the top toolbar container', () => {
      expect(sourceCode).toContain('<LanguageToggle />');
    });

    it('binds primary UI elements to auth translation keys in source code', () => {
      expect(sourceCode).toContain("t('auth:login_title')");
      expect(sourceCode).toContain("t('auth:login_subtitle')");
      expect(sourceCode).toContain("t('auth:matrix_no')");
      expect(sourceCode).toContain("t('auth:matrix_no_placeholder')");
      expect(sourceCode).toContain("t('auth:password')");
      expect(sourceCode).toContain("t('auth:password_placeholder')");
      expect(sourceCode).toContain("t('auth:forgot_password')");
      expect(sourceCode).toContain("t('auth:login_button')");
      expect(sourceCode).toContain("t('auth:logging_in')");
      expect(sourceCode).toContain("t('auth:fill_required_fields')");
      expect(sourceCode).toContain("t('auth:login_failed')");
      expect(sourceCode).toContain("t('auth:login_success')");
    });
  });

  describe('Render & Localization in English (en)', () => {
    it('renders LanguageToggle button and English header branding', async () => {
      await changeLanguage('en');
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <LoginPage />
          </I18nextProvider>
        </MemoryRouter>
      );

      // LanguageToggle button present with English accessibility label and badge
      expect(html).toContain('aria-label="Change Language"');
      expect(html).toContain('EN');

      // Header title & subtitle in English
      expect(html).toContain('Student &amp; Staff Portal');
      expect(html).toContain('POLISAS Student Representative Council Management System');
    });

    it('verifies English translation dictionary values for auth form and toasts', async () => {
      await changeLanguage('en');

      expect(i18n.t('auth:login_title')).toBe('Student & Staff Portal');
      expect(i18n.t('auth:login_subtitle')).toBe('POLISAS Student Representative Council Management System');
      expect(i18n.t('auth:matrix_no')).toBe('Matrix No. / Identity Card No.');
      expect(i18n.t('auth:matrix_no_placeholder')).toBe('e.g. 02DKA23F1001');
      expect(i18n.t('auth:password')).toBe('Password');
      expect(i18n.t('auth:password_placeholder')).toBe('Enter your password');
      expect(i18n.t('auth:forgot_password')).toBe('Forgot Password?');
      expect(i18n.t('auth:login_button')).toBe('Log In');
      expect(i18n.t('auth:logging_in')).toBe('Signing In...');
      expect(i18n.t('auth:fill_required_fields')).toBe('Please enter both Matrix No / IC and Password');
      expect(i18n.t('auth:login_failed')).toBe('Login failed. Please check your credentials.');
      expect(i18n.t('auth:login_success')).toBe('Successfully logged in');
      expect(i18n.t('auth:back_to_login')).toBe('Back to Login');
    });
  });

  describe('Render & Localization in Malay (ms)', () => {
    it('renders LanguageToggle button and Malay header branding', async () => {
      await changeLanguage('ms');
      const html = renderToString(
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <LoginPage />
          </I18nextProvider>
        </MemoryRouter>
      );

      // LanguageToggle button present with Malay accessibility label and badge
      expect(html).toContain('aria-label="Tukar Bahasa"');
      expect(html).toContain('BM');

      // Header title & subtitle in Malay
      expect(html).toContain('Portal Pelajar &amp; Staf');
      expect(html).toContain('Sistem Pengurusan Jawatankuasa Perwakilan Pelajar POLISAS');
    });

    it('verifies Malay translation dictionary values for auth form and toasts', async () => {
      await changeLanguage('ms');

      expect(i18n.t('auth:login_title')).toBe('Portal Pelajar & Staf');
      expect(i18n.t('auth:login_subtitle')).toBe('Sistem Pengurusan Jawatankuasa Perwakilan Pelajar POLISAS');
      expect(i18n.t('auth:matrix_no')).toBe('No. Matrik / No. Kad Pengenalan');
      expect(i18n.t('auth:matrix_no_placeholder')).toBe('cth: 02DKA23F1001');
      expect(i18n.t('auth:password')).toBe('Kata Laluan');
      expect(i18n.t('auth:password_placeholder')).toBe('Masukkan kata laluan anda');
      expect(i18n.t('auth:forgot_password')).toBe('Lupa Kata Laluan?');
      expect(i18n.t('auth:login_button')).toBe('Log Masuk');
      expect(i18n.t('auth:logging_in')).toBe('Sedang Log Masuk...');
      expect(i18n.t('auth:fill_required_fields')).toBe('Sila masukkan No. Matrik / KP dan Kata Laluan');
      expect(i18n.t('auth:login_failed')).toBe('Log masuk gagal. Sila semak maklumat anda.');
      expect(i18n.t('auth:login_success')).toBe('Berjaya log masuk');
      expect(i18n.t('auth:back_to_login')).toBe('Kembali ke Log Masuk');
    });
  });
});
