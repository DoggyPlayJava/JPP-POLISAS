import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@/contexts/ThemeContext';
import fs from 'fs';
import path from 'path';
import i18n, { changeLanguage } from '@/lib/i18n';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

// Polyfill localStorage in node environment if needed
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

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@polisas.edu.my' },
    profile: { full_name: 'Test Student', role: 'STUDENT', club_id: null },
    selectedClubId: null,
    setSelectedClubId: vi.fn(),
    isSuperAdmin: false,
    isPresident: false,
    isJppMember: false,
    hasKppAccess: false,
    effectiveRole: 'STUDENT',
    signOut: vi.fn(),
  }),
}));

// Mock AiSettings & Karnival contexts
vi.mock('@/contexts/AiSettingsContext', () => ({
  useAiSettings: () => ({ allowAiBudget: false }),
}));

vi.mock('@/contexts/KarnivalContext', () => ({
  useKarnivalStatus: () => ({ isActive: false }),
}));

describe('Task 4: Shell Integration (Header & Sidebar)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await changeLanguage('en');
  });

  describe('Header Component', () => {
    it('renders LanguageToggle button inside Header in English', async () => {
      await changeLanguage('en');
      const html = renderToString(
        <MemoryRouter>
          <ThemeProvider>
            <I18nextProvider i18n={i18n}>
              <Header />
            </I18nextProvider>
          </ThemeProvider>
        </MemoryRouter>
      );

      // Contains LanguageToggle button with English label
      expect(html).toContain('aria-label="Change Language"');
      expect(html).toContain('EN');
      // Subtitle is localized
      expect(html).toContain('POLISAS Student Portal');
      // Search placeholder is localized
      expect(html).toContain('Search clubs, EMS events, MAKMP, welfare...');
    });

    it('localizes subtitle and search placeholder when switched to Malay', async () => {
      await changeLanguage('ms');
      const html = renderToString(
        <MemoryRouter>
          <ThemeProvider>
            <I18nextProvider i18n={i18n}>
              <Header />
            </I18nextProvider>
          </ThemeProvider>
        </MemoryRouter>
      );

      // Contains LanguageToggle button with Malay label
      expect(html).toContain('aria-label="Tukar Bahasa"');
      expect(html).toContain('BM');
      // Subtitle is localized
      expect(html).toContain('Portal Pelajar POLISAS');
      // Search placeholder is localized
      expect(html).toContain('Cari kelab, acara EMS, MAKMP, kebajikan...');
    });

    it('binds Help popover content to translation keys and verifies translations', async () => {
      const headerPath = path.resolve(process.cwd(), 'src/components/layout/Header.tsx');
      const headerContent = fs.readFileSync(headerPath, 'utf8');

      expect(headerContent).toContain("{t('help_and_issues')}");
      expect(headerContent).toContain("{t('help_subtitle')}");
      expect(headerContent).toContain("{t('report_technical_issue')}");
      expect(headerContent).toContain("{t('report_technical_desc')}");
      expect(headerContent).toContain("{t('suggest_uiux')}");
      expect(headerContent).toContain("{t('suggest_uiux_desc')}");
      expect(headerContent).toContain("{t('whatsapp_support')}");

      await changeLanguage('en');
      expect(i18n.t('nav:help_and_issues')).toBe('Help & Issues');
      expect(i18n.t('nav:help_subtitle')).toBe('We are here to assist you.');
      expect(i18n.t('nav:report_technical_issue')).toBe('Report Technical Issue');
      expect(i18n.t('nav:report_technical_desc')).toBe('System bugs or errors');
      expect(i18n.t('nav:suggest_uiux')).toBe('UI/UX Suggestion');
      expect(i18n.t('nav:suggest_uiux_desc')).toBe('Ideas for visual improvements');
      expect(i18n.t('nav:whatsapp_support')).toBe('WhatsApp JPP Support');

      await changeLanguage('ms');
      expect(i18n.t('nav:help_and_issues')).toBe('Bantuan & Isu');
      expect(i18n.t('nav:help_subtitle')).toBe('Kami sedia membantu anda.');
      expect(i18n.t('nav:report_technical_issue')).toBe('Lapor Isu Teknikal');
      expect(i18n.t('nav:report_technical_desc')).toBe('Pepijat atau ralat sistem');
      expect(i18n.t('nav:suggest_uiux')).toBe('Cadangan UI/UX');
      expect(i18n.t('nav:suggest_uiux_desc')).toBe('Idea penambahbaikan visual');
      expect(i18n.t('nav:whatsapp_support')).toBe('WhatsApp JPP Support');
    });
  });

  describe('Sidebar Navigation Refactor', () => {
    it('renders English navigation labels in Sidebar when active language is en', async () => {
      await changeLanguage('en');
      const html = renderToString(
        <MemoryRouter initialEntries={['/dashboard']}>
          <I18nextProvider i18n={i18n}>
            <Sidebar />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Dashboard');
      expect(html).toContain('Clubs &amp; Societies');
      expect(html).toContain('Activities');
      expect(html).toContain('Committee Members');
      expect(html).toContain('Club Reports');
      expect(html).toContain('Settings');
    });

    it('renders Malay navigation labels in Sidebar when active language is ms', async () => {
      await changeLanguage('ms');
      const html = renderToString(
        <MemoryRouter initialEntries={['/dashboard']}>
          <I18nextProvider i18n={i18n}>
            <Sidebar />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Papan Pemuka');
      expect(html).toContain('Kelab &amp; Persatuan');
      expect(html).toContain('Aktiviti');
      expect(html).toContain('Ahli Jawatankuasa');
      expect(html).toContain('Laporan Kelab');
      expect(html).toContain('Tetapan');
    });

    it('sets title and aria-label matching displayLabel on navigation items', async () => {
      await changeLanguage('en');
      const html = renderToString(
        <MemoryRouter initialEntries={['/dashboard']}>
          <I18nextProvider i18n={i18n}>
            <Sidebar />
          </I18nextProvider>
        </MemoryRouter>
      );

      expect(html).toContain('title="Dashboard"');
      expect(html).toContain('aria-label="Dashboard"');
      expect(html).toContain('title="Clubs &amp; Societies"');
      expect(html).toContain('aria-label="Clubs &amp; Societies"');
    });
  });

  describe('JppLayout Integration', () => {
    it('mounts LanguageToggle adjacent to ThemeToggle in JppLayout.tsx source', () => {
      const jppLayoutPath = path.resolve(process.cwd(), 'src/pages/jpp/JppLayout.tsx');
      const fileContent = fs.readFileSync(jppLayoutPath, 'utf8');

      expect(fileContent).toContain("import { LanguageToggle } from '@/components/ui/LanguageToggle';");
      // Check LanguageToggle placed adjacent to ThemeToggle
      expect(fileContent).toMatch(/<LanguageToggle\s*\/>\s*<ThemeToggle\s*\/>/);
    });
  });
});
