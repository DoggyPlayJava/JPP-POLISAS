import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import fs from 'fs';
import path from 'path';
import i18n, { changeLanguage } from '@/lib/i18n';
import { SettingsPage, SETTINGS_TAB_CONFIG } from '@/pages/SettingsPage';

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
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
        })),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
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
    user: { id: 'test-user', email: 'student@polisas.edu.my' },
    profile: {
      id: 'test-user',
      full_name: 'Ahmad bin Ali',
      matric_no: '02DKA23F1001',
      role: 'STUDENT',
      phone: '0123456789',
      intake_year: '2025',
      intake_period: 1,
      programme_code: 'DIT',
      merit_points: 80,
      residence_type: 'KAMSIS',
      avatar_url: null,
    },
    refetchProfile: vi.fn(),
    effectiveRole: 'STUDENT',
    signOut: vi.fn(),
    isSuperAdmin: false,
    isJppMember: false,
  }),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
}));

vi.mock('@/contexts/AcademicSessionContext', () => ({
  useAcademicSession: () => ({
    intake1Month: 7,
    intake2Month: 12,
  }),
}));

vi.mock('@/hooks/useKlkDynamicFields', () => ({
  useKlkDynamicFields: () => ({
    data: [],
    loading: false,
  }),
}));

// Mock accessory components
vi.mock('@/components/layout/BottomNav', () => ({
  BottomNav: () => null,
}));

vi.mock('@/components/ai/FloatingAiChat', () => ({
  FloatingAiChat: () => null,
}));

vi.mock('@/components/klk/KawasanSearchSelect', () => ({
  KawasanSearchSelect: () => null,
}));

vi.mock('@/components/klk/KlkDynamicFieldRenderer', () => ({
  KlkDynamicFieldRenderer: () => null,
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

// Mock framer-motion for clean SSR HTML rendering
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      React.createElement('div', { className, ...props }, children)
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

describe('Task 6: Settings Page Language Selection & Configuration', () => {
  const settingsPagePath = path.resolve(__dirname, '../pages/SettingsPage.tsx');
  const sourceCode = fs.readFileSync(settingsPagePath, 'utf8');

  beforeEach(async () => {
    localStorage.clear();
    await changeLanguage('en');
  });

  describe('Tab Configuration (SETTINGS_TAB_CONFIG)', () => {
    it('configures tema tab with label "Paparan & Bahasa" and appropriate description', () => {
      const temaTab = SETTINGS_TAB_CONFIG.find((tab) => tab.id === 'tema');
      expect(temaTab).toBeDefined();
      expect(temaTab?.label).toBe('Paparan & Bahasa');
      expect(temaTab?.desc).toBe('Pilihan mod cerah, gelap dan pilihan bahasa');
    });
  });

  describe('Source Code Contract & Imports', () => {
    it('imports useTranslation, changeLanguage, and SupportedLanguage', () => {
      expect(sourceCode).toContain("import { useTranslation } from 'react-i18next';");
      expect(sourceCode).toContain("import { changeLanguage, SupportedLanguage } from '@/lib/i18n';");
    });

    it('imports Languages icon from lucide-react', () => {
      expect(sourceCode).toMatch(/Languages/);
    });

    it('binds language section title and description to translation keys', () => {
      expect(sourceCode).toContain("t('settings:language_section_title')");
      expect(sourceCode).toContain("t('settings:language_section_desc')");
    });

    it('includes options for Bahasa Melayu (BM) and English (EN) with flags and descriptions', () => {
      expect(sourceCode).toContain('Bahasa Melayu');
      expect(sourceCode).toContain('Antara muka sistem dalam Bahasa Melayu');
      expect(sourceCode).toContain('English');
      expect(sourceCode).toContain('System interface in English');
      expect(sourceCode).toContain('🇲🇾');
      expect(sourceCode).toContain('🇬🇧');
    });
  });

  describe('Rendering in English Locale (en)', () => {
    it('renders language section and option cards with English texts', async () => {
      await changeLanguage('en');
      const html = renderToString(
        <MemoryRouter initialEntries={['/settings?tab=tema']}>
          <I18nextProvider i18n={i18n}>
            <SettingsPage />
          </I18nextProvider>
        </MemoryRouter>
      );

      // Tab label rendered in tab navigation
      expect(html).toContain('Paparan &amp; Bahasa');

      // Section header in English
      expect(html).toContain('System Language');
      expect(html).toContain('Choose your preferred language for the system interface.');

      // Option cards
      expect(html).toContain('Bahasa Melayu');
      expect(html).toContain('Antara muka sistem dalam Bahasa Melayu');
      expect(html).toContain('English');
      expect(html).toContain('System interface in English');
      expect(html).toContain('🇲🇾');
      expect(html).toContain('🇬🇧');
    });
  });

  describe('Rendering in Malay Locale (ms)', () => {
    it('renders language section header in Bahasa Melayu', async () => {
      await changeLanguage('ms');
      const html = renderToString(
        <MemoryRouter initialEntries={['/settings?tab=tema']}>
          <I18nextProvider i18n={i18n}>
            <SettingsPage />
          </I18nextProvider>
        </MemoryRouter>
      );

      // Section header in Malay
      expect(html).toContain('Bahasa Sistem');
      expect(html).toContain('Pilih bahasa keutamaan anda untuk antara muka sistem.');
    });
  });
});
