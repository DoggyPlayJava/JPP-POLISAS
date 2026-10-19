# Multilingual Support (English & Bahasa Melayu) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a robust bilingual internationalization (i18n) system for JPP-POLISAS supporting English and Bahasa Melayu, with automatic detection (defaulting to English, auto-detecting Malay for Malay locales, and honoring manual `localStorage` overrides), modular JSON namespaces, and global UI switchers in the Header, Login page, and Settings.

**Architecture:** Initialize `i18next` with `react-i18next` synchronously before app render in `src/main.tsx`. Store translation files in `src/locales/{en,ms}/{common,auth,nav,settings}.json`. Expose a reactive `LanguageToggle` component and integrate `useTranslation()` hooks into the global navigation shell (`Header`, `Sidebar`), authentication (`LoginPage`), and `SettingsPage`.

**Tech Stack:** React 19, TypeScript ~5.9, Vite 7, i18next, react-i18next, Lucide React, Tailwind CSS, Vitest.

---

## Global Constraints

- **Database / RLS:** Do not modify the Supabase schema or `profiles` table in Phase 1; language selection is persisted client-side in `localStorage` (`jpp_language`).
- **Routing:** Do NOT alter URL routes or add language path prefixes (`ROUTES.md` compliance).
- **Singletons:** Never create duplicate Supabase clients or alter `src/lib/supabase.ts`.
- **Documentation:** `DEV_GUIDELINE.md` must be updated with the i18n architecture and developer instructions upon completion.

---

## Task Decomposition

### Task 1: Dependencies Installation & i18n Core Initialization

**Files:**
- Modify: `package.json`
- Create: `src/lib/i18n.ts`
- Modify: `src/main.tsx:1-25`
- Test: `src/lib/__tests__/i18n.test.ts`

**Interfaces:**
- Produces: `detectLanguage(): 'en' | 'ms'`
- Produces: `changeLanguage(lang: 'en' | 'ms'): Promise<void>`
- Produces: `SUPPORTED_LANGUAGES = ['en', 'ms'] as const`

- [ ] **Step 1: Install `i18next` and `react-i18next`**

Run:
```bash
npm install i18next@^24.2.2 react-i18next@^15.4.1
```

- [ ] **Step 2: Write failing unit test for language detection logic**

Create `src/lib/__tests__/i18n.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectLanguage } from '../i18n';

describe('Language Detection Algorithm', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('honors manual override in localStorage if present', () => {
    localStorage.setItem('jpp_language', 'ms');
    expect(detectLanguage('en-US')).toBe('ms');

    localStorage.setItem('jpp_language', 'en');
    expect(detectLanguage('ms-MY')).toBe('en');
  });

  it('detects Malay when browser language indicates Malay', () => {
    expect(detectLanguage('ms-MY')).toBe('ms');
    expect(detectLanguage('ms')).toBe('ms');
    expect(detectLanguage('ms-BN')).toBe('ms');
    expect(detectLanguage('zlm')).toBe('ms');
  });

  it('defaults to English when browser language is English or any other language', () => {
    expect(detectLanguage('en-US')).toBe('en');
    expect(detectLanguage('en-GB')).toBe('en');
    expect(detectLanguage('fr-FR')).toBe('en');
    expect(detectLanguage('zh-CN')).toBe('en');
    expect(detectLanguage('')).toBe('en');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/__tests__/i18n.test.ts`  
Expected: FAIL (module `../i18n` not found).

- [ ] **Step 4: Implement `src/lib/i18n.ts`**

Create `src/lib/i18n.ts`:
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonEn from '@/locales/en/common.json';
import authEn from '@/locales/en/auth.json';
import navEn from '@/locales/en/nav.json';
import settingsEn from '@/locales/en/settings.json';

import commonMs from '@/locales/ms/common.json';
import authMs from '@/locales/ms/auth.json';
import navMs from '@/locales/ms/nav.json';
import settingsMs from '@/locales/ms/settings.json';

export const SUPPORTED_LANGUAGES = ['en', 'ms'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const STORAGE_KEY = 'jpp_language';

/**
 * Determines the initial language:
 * 1. Returns saved preference in localStorage if 'en' or 'ms'.
 * 2. If browser language starts with 'ms', 'zlm', or contains 'malay', returns 'ms'.
 * 3. Defaults to 'en'.
 */
export function detectLanguage(browserLang?: string): SupportedLanguage {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ms') {
      return saved;
    }
  }

  const lang = (
    browserLang ??
    (typeof navigator !== 'undefined' ? (navigator.language || (navigator.languages && navigator.languages[0])) : '')
  )?.toLowerCase() || '';

  if (lang.startsWith('ms') || lang.startsWith('zlm') || lang.includes('malay')) {
    return 'ms';
  }

  return 'en';
}

export const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    nav: navEn,
    settings: settingsEn,
  },
  ms: {
    common: commonMs,
    auth: authMs,
    nav: navMs,
    settings: settingsMs,
  },
} as const;

const initialLang = detectLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }
}

export default i18n;
```

- [ ] **Step 5: Import `src/lib/i18n.ts` in `src/main.tsx`**

Add `import './lib/i18n';` at the top of `src/main.tsx` so initialization occurs before app rendering.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/i18n.test.ts`  
Expected: PASS (all 3 test suites pass).

- [ ] **Step 7: Commit Task 1**

```bash
git add package.json package-lock.json src/lib/i18n.ts src/lib/__tests__/i18n.test.ts src/main.tsx
git commit -m "feat(i18n): install dependencies and configure i18n core initialization"
```

---

### Task 2: Translation Dictionaries Creation & Parity Tests

**Files:**
- Create: `src/locales/en/common.json`
- Create: `src/locales/en/auth.json`
- Create: `src/locales/en/nav.json`
- Create: `src/locales/en/settings.json`
- Create: `src/locales/ms/common.json`
- Create: `src/locales/ms/auth.json`
- Create: `src/locales/ms/nav.json`
- Create: `src/locales/ms/settings.json`
- Test: `src/locales/__tests__/locales.test.ts`

**Interfaces:**
- JSON resources structured by key-value pairs per namespace.

- [ ] **Step 1: Write translation parity test**

Create `src/locales/__tests__/locales.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import commonEn from '../en/common.json';
import commonMs from '../ms/common.json';
import authEn from '../en/auth.json';
import authMs from '../ms/auth.json';
import navEn from '../en/nav.json';
import navMs from '../ms/nav.json';
import settingsEn from '../en/settings.json';
import settingsMs from '../ms/settings.json';

function verifyParity(enObj: Record<string, any>, msObj: Record<string, any>, namespace: string) {
  const enKeys = Object.keys(enObj).sort();
  const msKeys = Object.keys(msObj).sort();
  expect(enKeys, `Keys in ${namespace} should match`).toEqual(msKeys);
  for (const key of enKeys) {
    expect(typeof enObj[key]).toBe('string');
    expect(typeof msObj[key]).toBe('string');
    expect(enObj[key].trim().length).toBeGreaterThan(0);
    expect(msObj[key].trim().length).toBeGreaterThan(0);
  }
}

describe('Translation Dictionaries Parity', () => {
  it('has identical keys for common namespace', () => {
    verifyParity(commonEn, commonMs, 'common');
  });

  it('has identical keys for auth namespace', () => {
    verifyParity(authEn, authMs, 'auth');
  });

  it('has identical keys for nav namespace', () => {
    verifyParity(navEn, navMs, 'nav');
  });

  it('has identical keys for settings namespace', () => {
    verifyParity(settingsEn, settingsMs, 'settings');
  });
});
```

- [ ] **Step 2: Create JSON translation dictionaries**

Create `src/locales/en/common.json`:
```json
{
  "save": "Save",
  "saving": "Saving...",
  "cancel": "Cancel",
  "delete": "Delete",
  "confirm": "Confirm",
  "back": "Back",
  "search": "Search",
  "loading": "Loading...",
  "success": "Success",
  "error": "Error",
  "logout": "Log Out",
  "yes": "Yes",
  "no": "No",
  "actions": "Actions",
  "status": "Status",
  "details": "Details",
  "close": "Close",
  "filter": "Filter",
  "all": "All",
  "view_all": "View All",
  "no_data": "No data available",
  "try_again": "Try Again"
}
```

Create `src/locales/ms/common.json`:
```json
{
  "save": "Simpan",
  "saving": "Menyimpan...",
  "cancel": "Batal",
  "delete": "Padam",
  "confirm": "Sahkan",
  "back": "Kembali",
  "search": "Cari",
  "loading": "Memuatkan...",
  "success": "Berjaya",
  "error": "Ralat",
  "logout": "Log Keluar",
  "yes": "Ya",
  "no": "Tidak",
  "actions": "Tindakan",
  "status": "Status",
  "details": "Butiran",
  "close": "Tutup",
  "filter": "Tapis",
  "all": "Semua",
  "view_all": "Lihat Semua",
  "no_data": "Tiada data ditemui",
  "try_again": "Cuba Lagi"
}
```

Create `src/locales/en/auth.json`:
```json
{
  "login_title": "Student & Staff Portal",
  "login_subtitle": "POLISAS Student Representative Council Management System",
  "matrix_no": "Matrix No. / Identity Card No.",
  "matrix_no_placeholder": "e.g. 02DKA23F1001",
  "password": "Password",
  "password_placeholder": "Enter your password",
  "login_button": "Log In",
  "logging_in": "Signing In...",
  "forgot_password": "Forgot Password?",
  "reset_password": "Reset Password",
  "email": "Email Address",
  "back_to_login": "Back to Login",
  "login_success": "Successfully logged in",
  "login_failed": "Login failed. Please check your credentials.",
  "unauthorized": "You do not have permission to access this module."
}
```

Create `src/locales/ms/auth.json`:
```json
{
  "login_title": "Portal Pelajar & Staf",
  "login_subtitle": "Sistem Pengurusan Jawatankuasa Perwakilan Pelajar POLISAS",
  "matrix_no": "No. Matrik / No. Kad Pengenalan",
  "matrix_no_placeholder": "cth: 02DKA23F1001",
  "password": "Kata Laluan",
  "password_placeholder": "Masukkan kata laluan anda",
  "login_button": "Log Masuk",
  "logging_in": "Sedang Log Masuk...",
  "forgot_password": "Lupa Kata Laluan?",
  "reset_password": "Set Semula Kata Laluan",
  "email": "Alamat Emel",
  "back_to_login": "Kembali ke Log Masuk",
  "login_success": "Berjaya log masuk",
  "login_failed": "Log masuk gagal. Sila semak maklumat anda.",
  "unauthorized": "Anda tiada kebenaran untuk mengakses modul ini."
}
```

Create `src/locales/en/nav.json`:
```json
{
  "portal_student_title": "POLISAS Student Portal",
  "search_placeholder": "Search clubs, EMS events, MAKMP, welfare...",
  "dashboard": "Dashboard",
  "clubs": "Clubs & Societies",
  "activities": "Activities & Events",
  "reports": "Activity Reports",
  "report_review": "Report Review",
  "members": "Member Directory",
  "settings": "Settings",
  "jpp_portal": "JPP HQ Portal",
  "announcements": "Announcements",
  "help_and_issues": "Help & Issues",
  "help_subtitle": "We are here to assist you.",
  "report_technical_issue": "Report Technical Issue",
  "report_technical_desc": "System bugs or errors",
  "suggest_uiux": "UI/UX Suggestion",
  "suggest_uiux_desc": "Ideas for visual improvements",
  "whatsapp_support": "WhatsApp JPP Support",
  "switch_language": "Change Language",
  "language_en": "English",
  "language_ms": "Bahasa Melayu"
}
```

Create `src/locales/ms/nav.json`:
```json
{
  "portal_student_title": "Portal Pelajar POLISAS",
  "search_placeholder": "Cari kelab, acara EMS, MAKMP, kebajikan...",
  "dashboard": "Papan Pemuka",
  "clubs": "Kelab & Persatuan",
  "activities": "Aktiviti & Program",
  "reports": "Laporan Aktiviti",
  "report_review": "Semakan Laporan",
  "members": "Senarai Ahli",
  "settings": "Tetapan",
  "jpp_portal": "Portal JPP HQ",
  "announcements": "Pengumuman",
  "help_and_issues": "Bantuan & Isu",
  "help_subtitle": "Kami sedia membantu anda.",
  "report_technical_issue": "Lapor Isu Teknikal",
  "report_technical_desc": "Pepijat atau ralat sistem",
  "suggest_uiux": "Cadangan UI/UX",
  "suggest_uiux_desc": "Idea penambahbaikan visual",
  "whatsapp_support": "WhatsApp JPP Support",
  "switch_language": "Tukar Bahasa",
  "language_en": "English",
  "language_ms": "Bahasa Melayu"
}
```

Create `src/locales/en/settings.json`:
```json
{
  "page_title": "Settings",
  "page_subtitle": "Manage your profile, preferences, and account security",
  "tab_profile": "Profile & Academic",
  "tab_profile_desc": "Personal information & data updates",
  "tab_housing": "Housing Status",
  "tab_housing_desc": "KAMSIS / Off-campus declaration",
  "tab_theme": "Display & Language",
  "tab_theme_desc": "Theme, visual mode and language options",
  "tab_notifications": "Notifications",
  "tab_notifications_desc": "Manage alerts and message notifications",
  "tab_security": "Security",
  "tab_security_desc": "Password & account login credentials",
  "tab_help": "Help & Tutorials",
  "tab_help_desc": "System guide and support channel",
  "language_section_title": "System Language",
  "language_section_desc": "Choose your preferred language for the system interface.",
  "theme_section_title": "Display Theme",
  "theme_section_desc": "Switch between light and dark visual presentation.",
  "light_mode": "Light Mode",
  "dark_mode": "Dark Mode"
}
```

Create `src/locales/ms/settings.json`:
```json
{
  "page_title": "Tetapan",
  "page_subtitle": "Urus profil, keutamaan paparan, dan keselamatan akaun",
  "tab_profile": "Profil & Akademik",
  "tab_profile_desc": "Maklumat peribadi & pinda data",
  "tab_housing": "Status Kediaman",
  "tab_housing_desc": "Deklarasi KAMSIS / Luar Kampus",
  "tab_theme": "Paparan & Bahasa",
  "tab_theme_desc": "Pilihan mod cerah, gelap dan pilihan bahasa",
  "tab_notifications": "Pemberitahuan",
  "tab_notifications_desc": "Urus amaran & notifikasi pesanan",
  "tab_security": "Keselamatan",
  "tab_security_desc": "Kata laluan & log masuk akaun",
  "tab_help": "Bantuan & Tutorial",
  "tab_help_desc": "Panduan sistem & talian aduan",
  "language_section_title": "Bahasa Sistem",
  "language_section_desc": "Pilih bahasa keutamaan anda untuk antara muka sistem.",
  "theme_section_title": "Tema Paparan",
  "theme_section_desc": "Tukar antara paparan mod cerah atau gelap.",
  "light_mode": "Mod Cerah",
  "dark_mode": "Mod Gelap"
}
```

- [ ] **Step 3: Run the parity test**

Run: `npx vitest run src/locales/__tests__/locales.test.ts`  
Expected: PASS (all 4 namespaces verify with identical keys).

- [ ] **Step 4: Commit Task 2**

```bash
git add src/locales/ src/locales/__tests__/locales.test.ts
git commit -m "feat(i18n): create English and Malay translation resources with parity verification"
```

---

### Task 3: `LanguageToggle` Component

**Files:**
- Create: `src/components/ui/LanguageToggle.tsx`
- Test: `src/components/ui/__tests__/LanguageToggle.test.tsx`

**Interfaces:**
- Consumes: `useTranslation()`, `changeLanguage()`, `SupportedLanguage` from `src/lib/i18n`
- Produces: `export function LanguageToggle({ className }: { className?: string }): JSX.Element`

- [ ] **Step 1: Write test for LanguageToggle**

Create `src/components/ui/__tests__/LanguageToggle.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LanguageToggle } from '../LanguageToggle';
import '@/lib/i18n';

describe('LanguageToggle Component', () => {
  it('renders current language badge', () => {
    render(<LanguageToggle />);
    const button = screen.getByRole('button', { name: /tukar bahasa|change language/i });
    expect(button).toBeDefined();
  });
});
```

- [ ] **Step 2: Implement `src/components/ui/LanguageToggle.tsx`**

Create `src/components/ui/LanguageToggle.tsx`:
```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { changeLanguage, SupportedLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation('nav');
  const currentLang = (i18n.language?.startsWith('ms') ? 'ms' : 'en') as SupportedLanguage;

  const handleSelect = (lang: SupportedLanguage) => {
    changeLanguage(lang);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-xl h-9 px-2.5 bg-muted/40 hover:bg-muted text-muted-foreground transition-colors flex items-center gap-1.5 font-bold text-xs shadow-xs",
            className
          )}
          aria-label={t('switch_language')}
        >
          <Languages className="w-4 h-4 text-primary" />
          <span className="uppercase tracking-wider text-[11px] font-black">
            {currentLang === 'ms' ? 'BM' : 'EN'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl p-1.5 border border-border/40 shadow-2xl glass min-w-[150px]">
        <DropdownMenuItem
          onClick={() => handleSelect('en')}
          className="rounded-xl flex items-center justify-between px-3 py-2 text-xs font-bold cursor-pointer focus:bg-primary/10"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🇬🇧</span>
            <span>English</span>
          </div>
          {currentLang === 'en' && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleSelect('ms')}
          className="rounded-xl flex items-center justify-between px-3 py-2 text-xs font-bold cursor-pointer focus:bg-primary/10"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🇲🇾</span>
            <span>Bahasa Melayu</span>
          </div>
          {currentLang === 'ms' && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run src/components/ui/__tests__/LanguageToggle.test.tsx`  
Expected: PASS.

- [ ] **Step 4: Commit Task 3**

```bash
git add src/components/ui/LanguageToggle.tsx src/components/ui/__tests__/LanguageToggle.test.tsx
git commit -m "feat(ui): add LanguageToggle component"
```

---

### Task 4: Global Shell Integration — Header & Sidebar

**Files:**
- Modify: `src/components/layout/Header.tsx:85-148`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Mount `LanguageToggle` in `Header.tsx` and translate Header content**

In `src/components/layout/Header.tsx`:
- Import `LanguageToggle` from `@/components/ui/LanguageToggle`.
- Import `useTranslation` from `'react-i18next'`.
- Call `const { t } = useTranslation('nav');`.
- Replace hardcoded search placeholder: `placeholder={t('search_placeholder')}`.
- Replace subtitle: `Portal Pelajar POLISAS` with `{t('portal_student_title')}`.
- Replace Help popover text: "Bantuan & Isu" -> `{t('help_and_issues')}`, "Lapor Isu Teknikal" -> `{t('report_technical_issue')}`, etc.
- Insert `<LanguageToggle />` right next to `<ThemeToggle />`:
```tsx
<div className="flex items-center gap-2">
  <LanguageToggle />
  <ThemeToggle />
  ...
```

- [ ] **Step 2: Translate Navigation in `Sidebar.tsx`**

In `src/components/layout/Sidebar.tsx`:
- Import `useTranslation` from `'react-i18next'`.
- Call `const { t } = useTranslation('nav');`.
- Translate sidebar links:
  - "Papan Pemuka" -> `{t('dashboard')}`
  - "Kelab & Persatuan" -> `{t('clubs')}`
  - "Aktiviti" -> `{t('activities')}`
  - "Laporan" -> `{t('reports')}`
  - "Semakan" -> `{t('report_review')}`
  - "Tetapan" -> `{t('settings')}`

- [ ] **Step 3: Verify TypeScript & Build**

Run: `npm run lint:types`  
Expected: PASS without type errors.

- [ ] **Step 4: Commit Task 4**

```bash
git add src/components/layout/Header.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(shell): integrate LanguageToggle into Header and localize navigation links"
```

---

### Task 5: Auth & Login Page Integration

**Files:**
- Modify: `src/pages/LoginPage.tsx`

- [ ] **Step 1: Add `LanguageToggle` to `LoginPage.tsx` and localize labels**

In `src/pages/LoginPage.tsx`:
- Import `LanguageToggle` from `@/components/ui/LanguageToggle`.
- Import `useTranslation` from `'react-i18next'`.
- Call `const { t } = useTranslation(['auth', 'common']);`.
- Place `<LanguageToggle />` in top right corner of the authentication card or page header.
- Translate input labels:
  - Matric No placeholder -> `{t('auth:matrix_no_placeholder')}`
  - Matric No label -> `{t('auth:matrix_no')}`
  - Password label -> `{t('auth:password')}`
  - Submit button -> `{isLoading ? t('auth:logging_in') : t('auth:login_button')}`
  - Forgot password link -> `{t('auth:forgot_password')}`

- [ ] **Step 2: Verify TypeScript & Build**

Run: `npm run lint:types`  
Expected: PASS.

- [ ] **Step 3: Commit Task 5**

```bash
git add src/pages/LoginPage.tsx
git commit -m "feat(auth): add language toggle and translations to LoginPage"
```

---

### Task 6: Settings Page Integration & Documentation Update

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `DEV_GUIDELINE.md`

- [ ] **Step 1: Add Language Selector in `SettingsPage.tsx`**

In `src/pages/SettingsPage.tsx`:
- In Tab `tema` (Display/Theme):
  - Rename tab title to include Language ("Paparan & Bahasa").
  - Add a dedicated Language Card allowing the user to select between English and Bahasa Melayu, showing active indicator.
  - Call `changeLanguage('en')` or `changeLanguage('ms')` upon selection.

- [ ] **Step 2: Update `DEV_GUIDELINE.md`**

In `DEV_GUIDELINE.md`:
- Document Section on "Sistem Pelbagai Bahasa (Multilingual i18n)":
  - Document `src/lib/i18n.ts` detection rules (English default, Malay auto-detect, localStorage override).
  - Document how to add translation keys for new modules (`src/locales/{en,ms}/<module>.json`).
  - Code example showing `useTranslation('<module>')`.

- [ ] **Step 3: Run full lint and test suite**

Run:
```bash
npm run lint:types
npm run test
```
Expected: PASS (all tests pass, zero type errors).

- [ ] **Step 4: Commit Task 6**

```bash
git add src/pages/SettingsPage.tsx DEV_GUIDELINE.md
git commit -m "feat(settings): add language selection to SettingsPage and update DEV_GUIDELINE.md"
```

---

## Verification Plan

### Automated Tests
1. `npx vitest run src/lib/__tests__/i18n.test.ts`: Confirms detection algorithm and fallbacks.
2. `npx vitest run src/locales/__tests__/locales.test.ts`: Confirms 100% key parity across EN and MS files.
3. `npx vitest run src/components/ui/__tests__/LanguageToggle.test.tsx`: Confirms UI component renders and triggers state changes.
4. `npm run lint:types`: Confirms zero TypeScript compile errors.

### Manual Verification
1. **Fresh Session Auto-Detection**:
   - Open browser with English locale -> UI renders in English by default.
   - Open browser with Malay locale (`ms-MY`) -> UI renders in Bahasa Melayu automatically.
2. **Toggle in Header**:
   - Click `EN` badge in Header -> switches to `BM` -> all header and sidebar labels switch to Malay without page reload.
   - Click `BM` badge -> switches to `EN` -> all labels switch back to English.
3. **Persistence**:
   - Switch language to English, refresh browser -> persists in English.
4. **Login Page**:
   - Visit `/login`, click Language Toggle -> form labels update instantaneously.
5. **Settings Page**:
   - Navigate to `/tetapan?tab=tema` -> verify language card reflects active language and allows changing it.
