# First-Time User Language Auto-Detection, Database Sync & Universal Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement zero-click device language auto-detection for first-time visitors (English phone gets English UI immediately, Malay gets Malay), persist user language preference to the Supabase database profile for seamless cross-device synchronization, integrate a segmented language selector into `CompleteProfileModal`, and universally mount `LanguageToggle` adjacent to `ThemeToggle` across all application headers and sidebars.

**Architecture:** 
1. Client-side auto-detection via `navigator.language` in `src/lib/i18n.ts` defaulting to `'en'` (unless device is Malay/`ms`) if `localStorage` has no record.
2. Cross-device persistence by extending `profiles` table with `preferred_language` (`en` | `ms`) via migration and background syncing in `changeLanguage` / `AuthContext`.
3. Modal onboarding UX via segmented switch in `CompleteProfileModal.tsx` header with live reactive re-rendering and form submission syncing.
4. Universal UI parity by mounting `<LanguageToggle />` adjacent to `<ThemeToggle />` across all layouts (Portal, unit sidebars, EMS shells).

**Tech Stack:** React 19, i18next, react-i18next, Supabase JS v2, Tailwind CSS, Lucide icons, Vitest.

## Global Constraints
- Strictly follow `.agents/AGENTS.md` and `DEV_GUIDELINE.md`:
  - Never edit existing migration files in `supabase/migrations/`; always create a new migration with descriptive name.
  - Maintain global singleton usage of `src/lib/supabase.ts`.
  - In `AuthContext.tsx`, never introduce redundant fetch loops or non-cleanup realtime subscriptions.
  - Update `DEV_GUIDELINE.md` upon completion.
  - Use exact filenames and valid TypeScript syntax.

---

### Task 1: Database Migration & Profile Type Extension

**Files:**
- Create: `supabase/migrations/100_add_preferred_language_to_profiles.sql`
- Modify: `src/lib/supabase.ts:47-78`
- Test: `src/lib/__tests__/profileType.test.ts`

**Interfaces:**
- Produces: `Profile.preferred_language?: 'en' | 'ms' | null;`

- [ ] **Step 1: Write the test verifying Profile type support and migration file existence**

Create `src/lib/__tests__/profileType.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Profile Type & Migration Integrity', () => {
  it('has migration file 100_add_preferred_language_to_profiles.sql with correct check constraint', () => {
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/100_add_preferred_language_to_profiles.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('preferred_language VARCHAR(5)');
    expect(content).toContain("CHECK (preferred_language IS NULL OR preferred_language IN ('en', 'ms'))");
  });

  it('defines preferred_language on Profile interface in src/lib/supabase.ts', () => {
    const supabasePath = path.resolve(process.cwd(), 'src/lib/supabase.ts');
    const content = fs.readFileSync(supabasePath, 'utf8');
    expect(content).toMatch(/preferred_language\?:\s*['"]en['"]\s*\|\s*['"]ms['"]\s*\|\s*null;/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/profileType.test.ts`  
Expected: FAIL (migration file missing and interface not yet updated).

- [ ] **Step 3: Create the migration file and update `Profile` interface**

Create `supabase/migrations/100_add_preferred_language_to_profiles.sql`:
```sql
-- Migration: 100_add_preferred_language_to_profiles.sql
-- Adds preferred_language column to profiles table for cross-device i18n synchronization

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT NULL 
CHECK (preferred_language IS NULL OR preferred_language IN ('en', 'ms'));

COMMENT ON COLUMN profiles.preferred_language IS 'User preferred interface language (en = English, ms = Bahasa Melayu)';
```

Modify `src/lib/supabase.ts` (around line 77):
```typescript
  // Food Bank: pelajar telah sahkan Nama & No. Matrik (popup first-time)
  fb_identity_confirmed?: boolean | null;
  // Bahasa Pilihan Antaramuka Pengguna (en / ms)
  preferred_language?: 'en' | 'ms' | null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/profileType.test.ts`  
Expected: PASS (2 tests pass).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/100_add_preferred_language_to_profiles.sql src/lib/supabase.ts src/lib/__tests__/profileType.test.ts
git commit -m "feat(i18n): create migration for preferred_language and update Profile type"
```

---

### Task 2: Core i18n Detection & Database Background Sync

**Files:**
- Modify: `src/lib/i18n.ts:50-85, 150-165`
- Modify: `src/contexts/AuthContext.tsx:145-165`
- Test: `src/lib/__tests__/i18n.test.ts`

**Interfaces:**
- Consumes: `detectLanguage(browserLang?: string): SupportedLanguage`
- Produces: `changeLanguage(lang: SupportedLanguage, syncToDb?: boolean): Promise<void>`

- [ ] **Step 1: Write tests for device language detection and DB sync in `src/lib/__tests__/i18n.test.ts`**

Update `src/lib/__tests__/i18n.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import i18n, { detectLanguage, changeLanguage, SUPPORTED_LANGUAGES, STORAGE_KEY } from '../i18n';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

describe('i18n detection & background sync', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('detects en for English browser locales when no localStorage exists', () => {
    expect(detectLanguage('en-US')).toBe('en');
    expect(detectLanguage('en-GB')).toBe('en');
    expect(detectLanguage('en-MY')).toBe('en');
    expect(detectLanguage('en')).toBe('en');
  });

  it('detects ms for Malay browser locales when no localStorage exists', () => {
    expect(detectLanguage('ms-MY')).toBe('ms');
    expect(detectLanguage('ms')).toBe('ms');
    expect(detectLanguage('zlm')).toBe('ms');
    expect(detectLanguage('malay-MY')).toBe('ms');
  });

  it('defaults to en when browser language is unrecognized or generic', () => {
    expect(detectLanguage('zh-CN')).toBe('en');
    expect(detectLanguage('fr-FR')).toBe('en');
    expect(detectLanguage('')).toBe('en');
    expect(detectLanguage(undefined)).toBe('en');
  });

  it('prioritizes saved localStorage over browser language', () => {
    localStorage.setItem(STORAGE_KEY, 'ms');
    expect(detectLanguage('en-US')).toBe('ms');

    localStorage.setItem(STORAGE_KEY, 'en');
    expect(detectLanguage('ms-MY')).toBe('en');
  });

  it('syncs to Supabase profiles table in background when user session exists', async () => {
    const mockSession = { user: { id: 'test-user-123' } };
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });

    await changeLanguage('ms');

    expect(localStorage.getItem(STORAGE_KEY)).toBe('ms');
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });
});
```

- [ ] **Step 2: Run test to verify failures**

Run: `npx vitest run src/lib/__tests__/i18n.test.ts`  
Expected: FAIL (DB sync not yet implemented in `changeLanguage`).

- [ ] **Step 3: Implement device detection refinement and DB background sync**

In `src/lib/i18n.ts`:
```typescript
import { supabase } from '@/lib/supabase';

// Refine detectLanguage
export function detectLanguage(browserLang?: string): SupportedLanguage {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'ms') {
        return saved;
      }
    } catch {
      // Ignore storage access errors
    }
  }

  const lang = (
    browserLang ??
    (typeof navigator !== 'undefined'
      ? (navigator.language || (navigator.languages && navigator.languages[0]))
      : '')
  )?.toLowerCase() || '';

  if (lang.startsWith('ms') || lang.startsWith('zlm') || lang.includes('malay')) {
    return 'ms';
  }

  return 'en';
}

// Update changeLanguage
export async function changeLanguage(lang: SupportedLanguage, syncToDb = true): Promise<void> {
  await i18n.changeLanguage(lang);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage access errors
    }
  }
  if (typeof document !== 'undefined' && document?.documentElement) {
    document.documentElement.lang = lang;
  }

  if (syncToDb && typeof window !== 'undefined') {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        supabase
          .from('profiles')
          .update({ preferred_language: lang })
          .eq('id', session.user.id)
          .then();
      }
    } catch {
      // Silent error for unauthenticated or network dropouts
    }
  }
}
```

In `src/contexts/AuthContext.tsx`:
In `fetchProfile`, right after `setProfile(profileData)`:
```typescript
        // Segerakkan bahasa pilihan dari profil pengguna jika wujud
        if (profileData?.preferred_language) {
          const pref = profileData.preferred_language;
          if (i18n.language !== pref) {
            changeLanguage(pref, false);
          }
        } else if (profileData?.id) {
          // Jika profil belum ada preferred_language (cth: pengguna baru),
          // rekodkan bahasa aktif semasa ke profil
          const currentLang = (i18n.language?.startsWith('ms') ? 'ms' : 'en') as SupportedLanguage;
          supabase
            .from('profiles')
            .update({ preferred_language: currentLang })
            .eq('id', profileData.id)
            .then();
        }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/i18n.test.ts`  
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts src/contexts/AuthContext.tsx src/lib/__tests__/i18n.test.ts
git commit -m "feat(i18n): implement zero-click device detection and cross-device DB sync"
```

---

### Task 3: LanguageToggle UI Flexibility (Circular Glass Variant)

**Files:**
- Modify: `src/components/ui/LanguageToggle.tsx`
- Test: `src/components/ui/__tests__/LanguageToggle.test.tsx`

**Interfaces:**
- Produces: `<LanguageToggle variant="default" | "circular" className?: string />`

- [ ] **Step 1: Write test for circular variant in `LanguageToggle.test.tsx`**

Modify `src/components/ui/__tests__/LanguageToggle.test.tsx`:
```typescript
  it('renders circular glass variant correctly when variant="circular" is passed', () => {
    const { container } = render(<LanguageToggle variant="circular" />);
    const trigger = container.querySelector('button');
    expect(trigger).toBeTruthy();
    expect(trigger?.className).toContain('rounded-full');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/__tests__/LanguageToggle.test.tsx`  
Expected: FAIL (`variant` prop not yet supported).

- [ ] **Step 3: Implement variant support in `src/components/ui/LanguageToggle.tsx`**

Update `src/components/ui/LanguageToggle.tsx`:
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

interface LanguageToggleProps {
  className?: string;
  variant?: 'default' | 'circular';
}

export function LanguageToggle({ className, variant = 'default' }: LanguageToggleProps) {
  const { i18n, t } = useTranslation('nav');
  const currentLang = (i18n.language?.startsWith('ms') ? 'ms' : 'en') as SupportedLanguage;

  const handleSelect = (lang: SupportedLanguage) => {
    changeLanguage(lang);
  };

  const isCircular = variant === 'circular';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            isCircular
              ? "w-9 h-9 rounded-full bg-transparent hover:bg-white/10 text-white/90 hover:text-white p-0 flex items-center justify-center transition-all active:scale-95 border-0 focus-visible:ring-0"
              : "rounded-xl h-9 px-2.5 bg-muted/40 hover:bg-muted text-muted-foreground transition-colors flex items-center gap-1.5 font-bold text-xs shadow-xs",
            className
          )}
          aria-label={t('switch_language', 'Tukar bahasa')}
        >
          {isCircular ? (
            <div className="flex items-center justify-center font-black text-[10px] tracking-wider uppercase">
              {currentLang === 'ms' ? 'BM' : 'EN'}
            </div>
          ) : (
            <>
              <Languages className="w-4 h-4 text-primary" />
              <span className="uppercase tracking-wider text-[11px] font-black">
                {currentLang === 'ms' ? 'BM' : 'EN'}
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl p-1.5 border border-border/40 shadow-2xl glass min-w-[150px] z-[99999]">
        <DropdownMenuItem
          onClick={() => handleSelect('en')}
          className="rounded-xl flex items-center justify-between px-3 py-2 text-xs font-bold cursor-pointer focus:bg-primary/10"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm" aria-hidden="true">🇬🇧</span>
            <span>English</span>
          </div>
          {currentLang === 'en' && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleSelect('ms')}
          className="rounded-xl flex items-center justify-between px-3 py-2 text-xs font-bold cursor-pointer focus:bg-primary/10"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm" aria-hidden="true">🇲🇾</span>
            <span>Bahasa Melayu</span>
          </div>
          {currentLang === 'ms' && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/__tests__/LanguageToggle.test.tsx`  
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/LanguageToggle.tsx src/components/ui/__tests__/LanguageToggle.test.tsx
git commit -m "feat(ui): add circular variant support to LanguageToggle for glass navbar clusters"
```

---

### Task 4: CompleteProfileModal Header Segmented Language Control

**Files:**
- Modify: `src/components/ui/CompleteProfileModal.tsx:755-775`
- Create: `src/__tests__/CompleteProfileModalLanguage.test.tsx`

**Interfaces:**
- Consumes: `changeLanguage(lang)` from `@/lib/i18n`
- Produces: Reactive language segmented control in modal header + form submission payload includes `preferred_language`.

- [ ] **Step 1: Write integration test for CompleteProfileModal language switch**

Create `src/__tests__/CompleteProfileModalLanguage.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('CompleteProfileModal Header Language Integration', () => {
  const modalPath = path.resolve(process.cwd(), 'src/components/ui/CompleteProfileModal.tsx');
  const sourceCode = fs.readFileSync(modalPath, 'utf8');

  it('imports changeLanguage and SupportedLanguage from @/lib/i18n', () => {
    expect(sourceCode).toContain("from '@/lib/i18n'");
    expect(sourceCode).toMatch(/changeLanguage/);
  });

  it('renders segmented control for BM and EN in the modal header', () => {
    expect(sourceCode).toMatch(/changeLanguage\(['"]ms['"]\)/);
    expect(sourceCode).toMatch(/changeLanguage\(['"]en['"]\)/);
  });

  it('includes preferred_language in the profile update submission payload', () => {
    expect(sourceCode).toMatch(/preferred_language/);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/__tests__/CompleteProfileModalLanguage.test.tsx`  
Expected: FAIL (segmented control and submission payload not yet present).

- [ ] **Step 3: Implement segmented language toggle in `src/components/ui/CompleteProfileModal.tsx`**

In `src/components/ui/CompleteProfileModal.tsx`:
1. Import `changeLanguage, SupportedLanguage` from `@/lib/i18n`.
2. Extract current active language:
   ```typescript
   const currentLang = (i18n.language?.startsWith('ms') ? 'ms' : 'en') as SupportedLanguage;
   ```
3. In modal header (around line 759-773), add the segmented toggle on the right side:
   ```tsx
   {/* Refined Institutional Header with Language Toggle */}
   <div className="h-28 bg-slate-900 dark:bg-zinc-950 border-b border-white/10 relative overflow-hidden flex items-center justify-between px-6 shrink-0">
     <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,white_0%,transparent_100%)] pointer-events-none" />
     <div className="flex items-center gap-3.5 z-10">
       <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center p-2 shadow-sm backdrop-blur-md shrink-0">
         <img src="/jpp-logo.png" alt="POLISAS Emblem" className="w-full h-full object-contain" />
       </div>
       <div className="space-y-0.5">
         <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 flex items-center gap-1.5">
           <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
           {t('auth:official_portal_polisas', 'Portal Rasmi POLISAS')}
         </span>
         <h2 className="text-base sm:text-lg font-black text-white tracking-tight">{heading}</h2>
       </div>
     </div>

     {/* Language Segmented Switch in Header */}
     <div className="z-10 flex items-center p-1 bg-white/10 border border-white/15 rounded-xl backdrop-blur-md shrink-0">
       <button
         type="button"
         onClick={() => changeLanguage('ms')}
         className={cn(
           "px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider transition-all flex items-center gap-1",
           currentLang === 'ms'
             ? "bg-white text-slate-900 shadow-sm"
             : "text-white/70 hover:text-white"
         )}
       >
         <span>🇲🇾</span>
         <span>BM</span>
       </button>
       <button
         type="button"
         onClick={() => changeLanguage('en')}
         className={cn(
           "px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider transition-all flex items-center gap-1",
           currentLang === 'en'
             ? "bg-white text-slate-900 shadow-sm"
             : "text-white/70 hover:text-white"
         )}
       >
         <span>🇬🇧</span>
         <span>EN</span>
       </button>
     </div>
   </div>
   ```
4. In `handleSubmit`, include `preferred_language: currentLang` in the update payload.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/CompleteProfileModalLanguage.test.tsx src/__tests__/CompleteProfileModalModern.test.tsx`  
Expected: PASS (all tests pass without regressing modern institutional styling tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/CompleteProfileModal.tsx src/__tests__/CompleteProfileModalLanguage.test.tsx
git commit -m "feat(auth): integrate real-time segmented language toggle in CompleteProfileModal header"
```

---

### Task 5: Universal LanguageToggle Placement Adjacent to ThemeToggle

**Files:**
- Modify: `src/components/portal/SuperAppHeader.tsx`
- Modify: `src/components/portal/PortalNavbar.tsx`
- Modify: `src/pages/jpp/JppSidebar.tsx`
- Modify: `src/pages/kebajikan/KebajikanLayout.tsx` & `src/pages/kebajikan/KebajikanSidebar.tsx`
- Modify: `src/pages/keusahawanan/KeusahawananLayout.tsx`
- Modify: `src/pages/akademik/AkademikLayout.tsx`
- Modify: `src/components/makmp/MakmpJppChrome.tsx`
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/pages/ems/EmsCertificatePage.tsx`
- Modify: `src/pages/ems/EmsCertVerifyPage.tsx`
- Modify: `src/pages/ems/EmsCheckinPage.tsx`
- Modify: `src/pages/ems/EmsJuryPortalPage.tsx`
- Modify: `src/pages/ems/EmsLeaderboardPage.tsx`
- Modify: `src/pages/ems/EmsPublicRegisterPage.tsx`
- Modify: `src/pages/ems/EmsAudienceScanPage.tsx`
- Create: `src/__tests__/UniversalLanguageToggle.test.tsx`

- [ ] **Step 1: Write integration tests verifying LanguageToggle placement beside ThemeToggle**

Create `src/__tests__/UniversalLanguageToggle.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Universal LanguageToggle Mount Parity with ThemeToggle', () => {
  const targetFiles = [
    'src/components/portal/SuperAppHeader.tsx',
    'src/components/portal/PortalNavbar.tsx',
    'src/pages/jpp/JppSidebar.tsx',
    'src/pages/kebajikan/KebajikanLayout.tsx',
    'src/pages/kebajikan/KebajikanSidebar.tsx',
    'src/pages/keusahawanan/KeusahawananLayout.tsx',
    'src/pages/akademik/AkademikLayout.tsx',
    'src/components/makmp/MakmpJppChrome.tsx',
    'src/pages/polyservices/PolySuaraPage.tsx',
    'src/pages/ems/EmsCertificatePage.tsx',
    'src/pages/ems/EmsCertVerifyPage.tsx',
    'src/pages/ems/EmsCheckinPage.tsx',
    'src/pages/ems/EmsJuryPortalPage.tsx',
    'src/pages/ems/EmsLeaderboardPage.tsx',
    'src/pages/ems/EmsPublicRegisterPage.tsx',
    'src/pages/ems/EmsAudienceScanPage.tsx',
  ];

  targetFiles.forEach((file) => {
    it(`verifies LanguageToggle is imported and mounted alongside ThemeToggle in ${file}`, () => {
      const fullPath = path.resolve(process.cwd(), file);
      const content = fs.readFileSync(fullPath, 'utf8');
      expect(content).toContain('LanguageToggle');
      expect(content).toContain('<LanguageToggle');
      expect(content).toContain('ThemeToggle');
    });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/__tests__/UniversalLanguageToggle.test.tsx`  
Expected: FAIL (target files lack LanguageToggle import and component mount).

- [ ] **Step 3: Mount `LanguageToggle` adjacent to `ThemeToggle` in each target file**

1. In `src/components/portal/SuperAppHeader.tsx`:
   - Import `LanguageToggle` from `@/components/ui/LanguageToggle`.
   - Place circular action right before `ThemeToggle`:
   ```tsx
   {/* LanguageToggle circular button */}
   <div className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-[#D9C9B2]/30 shadow-sm flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-95 shrink-0">
     <LanguageToggle variant="circular" />
   </div>
   ```

2. In `src/components/portal/PortalNavbar.tsx`:
   - Import `LanguageToggle` from `@/components/ui/LanguageToggle`.
   - Place `<LanguageToggle />` right before `<ThemeToggle />`:
   ```tsx
   <div className="flex items-center gap-2 md:gap-4">
     <LanguageToggle />
     <ThemeToggle />
     <NotificationBell />
   ```

3. In `src/pages/jpp/JppSidebar.tsx`, `KebajikanLayout.tsx`, `KebajikanSidebar.tsx`, `KeusahawananLayout.tsx`, `AkademikLayout.tsx`, `MakmpJppChrome.tsx`, `PolySuaraPage.tsx`, and the 7 EMS pages:
   - Import `LanguageToggle` from `@/components/ui/LanguageToggle`.
   - Add `<LanguageToggle />` immediately adjacent to `<ThemeToggle />`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/UniversalLanguageToggle.test.tsx`  
Expected: PASS (all 16 files pass the parity check).

- [ ] **Step 5: Commit**

```bash
git add src/components/portal/ src/pages/ src/components/makmp/ src/__tests__/UniversalLanguageToggle.test.tsx
git commit -m "feat(ui): universally place LanguageToggle adjacent to ThemeToggle across all application shells"
```

---

### Task 6: Documentation & Comprehensive Regression Verification

**Files:**
- Modify: `DEV_GUIDELINE.md` (Update Section 14 and Section 15)

- [ ] **Step 1: Update `DEV_GUIDELINE.md`**

Update Section 14 (i18n & CompleteProfileModal) and Section 15 (Profiles schema additions):
- Document `preferred_language` on `profiles`.
- Document zero-click auto-detection rules (`navigator.language` resolution hierarchy).
- Document universal `LanguageToggle` pairing with `ThemeToggle`.

- [ ] **Step 2: Run all affected test suites**

Run: `npx vitest run src/lib/__tests__/ src/__tests__/CompleteProfileModal* src/__tests__/UniversalLanguageToggle* src/__tests__/LoginPageI18n.test.tsx src/__tests__/SettingsLanguage.test.tsx`  
Expected: PASS across all test files with 0 failures.

- [ ] **Step 3: Commit documentation and complete verification**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs: document preferred_language DB sync, zero-click i18n detection, and universal toggle placement"
```
