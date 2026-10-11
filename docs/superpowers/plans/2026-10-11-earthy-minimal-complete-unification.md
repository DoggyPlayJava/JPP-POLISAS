# Earthy Minimal Complete Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify Student Settings & Digital Matric Profile, PolyMaps Campus Exploration, and JPP HQ Leadership Cockpit under the flagship Earthy Minimal Forest & Sage design system.

**Architecture:** Extend the dual-tone palette tokens established in LandingPage, LoginPage, and PortalPage (#F8F6EE Alabaster, #151D16 Charcoal Forest, #2E3A2F Forest Moss, #6B7F5B Sage Green, #D9C9B2 Warm Linen Sand, #C96F4F Terracotta Clay) across SettingsPage, PolyMapsPage, and JPP HQ suite, replacing legacy slate, OLED blues, and maroon #7f1d1d.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide React, Vitest, Leaflet.

## Global Constraints

- 100% Zero Raw Emojis across all modified files (strictly Lucide vector icons).
- Strictly Zero Em-Dashes (`—` or `–`) in both UI copy and code comments.
- Performance: Respect `isLowEnd` for low-tier mobile devices.
- Maintain singleton `@/lib/supabase` instance.
- Maintain 100% passing vitest suites without breaking existing assertions.

---

### Task 1: Profil Digital Mahasiswa, Hab Tetapan & Alias Laluan

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/App.tsx:325-335`
- Test: `src/__tests__/settingsEarthyMinimal.test.ts`

**Interfaces:**
- Consumes: `useAuth()`, `useTheme()`, `SETTINGS_TAB_CONFIG`
- Produces: Dual-tone Earthy Minimal canvas, Apple Wallet style digital matric card, Sage Green segmented tabs, and `/profile` / `/settings` route aliases pointing to `/tetapan`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/settingsEarthyMinimal.test.ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Settings & Profile Earthy Minimal Alignment', () => {
  const settingsFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/SettingsPage.tsx'),
    'utf-8'
  );
  const appFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/App.tsx'),
    'utf-8'
  );

  it('uses Earthy Minimal canvas tokens (#F8F6EE and #151D16)', () => {
    expect(settingsFile).toContain('#F8F6EE');
    expect(settingsFile).toContain('#151D16');
  });

  it('contains no raw emojis', () => {
    const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]/;
    expect(emojiRegex.test(settingsFile)).toBe(false);
  });

  it('contains zero em-dashes', () => {
    expect(settingsFile).not.toContain('\u2014');
    expect(settingsFile).not.toContain('\u2013');
  });

  it('uses Warm Sand #D9C9B2 or Sage #6B7F5B for hairline borders', () => {
    expect(settingsFile).toMatch(/#D9C9B2|#6B7F5B/);
  });

  it('routes /profile and /settings aliases to /tetapan in App.tsx', () => {
    expect(appFile).toContain('path="/profile"');
    expect(appFile).toContain('path="/settings"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/settingsEarthyMinimal.test.ts`
Expected: FAIL (missing #F8F6EE, #151D16, or route aliases)

- [ ] **Step 3: Implement minimal code in SettingsPage.tsx and App.tsx**

In `src/pages/SettingsPage.tsx`:
1. Update outer page wrapper:
```tsx
<div className="page-container relative space-y-6 pb-36 after:content-[''] after:block after:h-28 after:shrink-0 overflow-x-hidden pt-4 sm:pt-6 bg-[#F8F6EE] dark:bg-[#151D16] text-[#2E3A2F] dark:text-[#F8F6EE] min-h-screen">
```
2. Replace blue/emerald mesh glow with organic Forest Moss & Terracotta:
```tsx
<div className="absolute top-0 right-1/4 w-[350px] sm:w-[500px] h-[300px] bg-[#6B7F5B]/[0.05] dark:bg-[#6B7F5B]/[0.08] blur-[120px] rounded-full" />
<div className="absolute top-1/3 left-[-10%] w-[300px] sm:w-[450px] h-[300px] bg-[#C96F4F]/[0.04] dark:bg-[#C96F4F]/[0.06] blur-[140px] rounded-full" />
```
3. Update Hero Profile Card & Digital Matric Card to warm alabaster / charcoal pine with hairline `#D9C9B2` borders.
4. Update Segmented Tab buttons to Forest & Sage active states (`bg-[#2E3A2F]/10 dark:bg-[#6B7F5B]/20 text-[#2E3A2F] dark:text-[#F8F6EE] border-[#6B7F5B]/40`).
5. Ensure zero raw emojis and zero em-dashes across comments and strings.

In `src/App.tsx`:
Add aliases for `/settings` and `/profile` under `ProtectedRoute`:
```tsx
<Route path="/profile" element={<RequireApproval><Navigate to="/tetapan" replace /></RequireApproval>} />
<Route path="/settings" element={<RequireApproval><Navigate to="/tetapan" replace /></RequireApproval>} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/settingsEarthyMinimal.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/SettingsPage.tsx src/App.tsx src/__tests__/settingsEarthyMinimal.test.ts
git commit -m "feat(settings): unify profile hub and settings with earthy minimal design system"
```

---

### Task 2: Navigasi Kampus PolyMaps (Peta, Kapsul Carian & Helaian Bawah)

**Files:**
- Modify: `src/pages/polymaps/PolyMapsPage.tsx`
- Test: `src/__tests__/polymapsEarthyMinimal.test.ts`

**Interfaces:**
- Consumes: Leaflet maps, `sheetSnap`, `activeBuilding`
- Produces: Warm Alabaster search capsule, Sage Green filter pills, Earthy Minimal bottom sheet with 1-tap snap buttons, and Terracotta navigation CTA.

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/polymapsEarthyMinimal.test.ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('PolyMaps Earthy Minimal Alignment', () => {
  const polyMapsFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/polymaps/PolyMapsPage.tsx'),
    'utf-8'
  );

  it('uses Earthy Minimal tokens (#F8F6EE or #151D16 or #6B7F5B) in bottom sheet or search bar', () => {
    expect(polyMapsFile).toMatch(/#F8F6EE|#151D16|#6B7F5B|#2E3A2F/);
  });

  it('contains zero raw emojis', () => {
    const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]/;
    expect(emojiRegex.test(polyMapsFile)).toBe(false);
  });

  it('contains zero em-dashes', () => {
    expect(polyMapsFile).not.toContain('\u2014');
    expect(polyMapsFile).not.toContain('\u2013');
  });

  it('features Terracotta #C96F4F navigation action CTA', () => {
    expect(polyMapsFile).toContain('#C96F4F');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/polymapsEarthyMinimal.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement minimal code in PolyMapsPage.tsx**

In `src/pages/polymaps/PolyMapsPage.tsx`:
1. Update Floating Search Bar:
   - Search capsule & menu: `bg-[#F8F6EE]/90 dark:bg-[#151D16]/90 backdrop-blur-xl border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-[0_8px_30px_rgba(46,58,47,0.08)]`
   - Search icon: `text-[#6B7F5B]`
   - Quick Filter Pills:
     - Active: `bg-[#2E3A2F] text-[#F8F6EE] border-[#2E3A2F] dark:bg-[#6B7F5B] dark:text-white`
     - Inactive: `bg-white/90 dark:bg-[#1E271F]/90 text-[#556453] dark:text-[#A3B39F] border-[#D9C9B2]/80 dark:border-[#3A4A3B]`
2. Update Bottom Sheet Container:
   - `bg-white/95 dark:bg-[#151D16]/95 backdrop-blur-2xl border-t border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-[0_-10px_40px_rgba(46,58,47,0.12)]`
   - Snap buttons container: `bg-[#F8F6EE] dark:bg-[#1E271F] border border-[#D9C9B2]/80 dark:border-[#3A4A3B]`
   - Active snap button: `bg-[#2E3A2F] text-[#F8F6EE] dark:bg-[#6B7F5B] dark:text-white`
   - Inactive snap button: `text-[#556453] hover:text-[#2E3A2F] dark:text-[#A3B39F]`
3. Update Navigation Action Button ("Mula Pandu Arah"):
   - `bg-[#C96F4F] hover:bg-[#B35F41] text-white py-3.5 rounded-2xl font-black text-sm transition-colors shadow-lg shadow-[#C96F4F]/25 active:scale-[0.98]`
4. Ensure zero raw emojis and zero em-dashes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/polymapsEarthyMinimal.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/polymaps/PolyMapsPage.tsx src/__tests__/polymapsEarthyMinimal.test.ts
git commit -m "feat(polymaps): apply earthy minimal forest and sage design system to campus map"
```

---

### Task 3: Papan Pemuka Kepimpinan JPP HQ & Bar Sisi Exco (`/jpp/*`)

**Files:**
- Modify: `src/pages/jpp/jppConfig.ts`
- Modify: `src/pages/jpp/JppLayout.tsx`
- Modify: `src/pages/jpp/JppSidebar.tsx`
- Modify: `src/pages/jpp/JppOverviewPage.tsx`
- Test: `src/__tests__/jppCockpitEarthyMinimal.test.ts`

**Interfaces:**
- Consumes: `JPP_THEME_DEFAULT_COLOR`, `getJppSidebarBg()`, `JPP_COLOR_PRESETS`
- Produces: Executive Forest War Room sidebar, neutral Alabaster & Charcoal layout, and card surfaces with `#D9C9B2` borders.

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/jppCockpitEarthyMinimal.test.ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('JPP HQ Leadership Cockpit Earthy Minimal Alignment', () => {
  const configContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/jpp/jppConfig.ts'),
    'utf-8'
  );
  const layoutContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/jpp/JppLayout.tsx'),
    'utf-8'
  );
  const sidebarContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/jpp/JppSidebar.tsx'),
    'utf-8'
  );

  it('sets default JPP theme color to Deep Forest Moss #2E3A2F instead of legacy maroon', () => {
    expect(configContent).toContain("JPP_THEME_DEFAULT_COLOR = '#2E3A2F'");
    expect(configContent).not.toContain("JPP_THEME_DEFAULT_COLOR = '#7f1d1d'");
  });

  it('updates JppLayout shell to Earthy Minimal canvas #F8F6EE / #151D16', () => {
    expect(layoutContent).toContain('#F8F6EE');
    expect(layoutContent).toContain('#151D16');
  });

  it('eliminates text-rose-950 and legacy rose-* classes from JppSidebar', () => {
    expect(sidebarContent).not.toContain('text-rose-950');
    expect(sidebarContent).not.toContain('border-rose-200');
  });

  it('contains zero raw emojis across all jpp core files', () => {
    const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]/;
    expect(emojiRegex.test(configContent)).toBe(false);
    expect(emojiRegex.test(layoutContent)).toBe(false);
    expect(emojiRegex.test(sidebarContent)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/jppCockpitEarthyMinimal.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement minimal code across JPP HQ suite**

1. In `src/pages/jpp/jppConfig.ts`:
   - Set `export const JPP_THEME_DEFAULT_COLOR = '#2E3A2F';`
   - Update `JPP_COLOR_PRESETS` to `['#2E3A2F', '#1E271F', '#3B4A3C', '#6B7F5B', '#C96F4F', '#4A584B']`.
   - Update `getJppSidebarBg()` return values for light and dark modes to Earthy Minimal tokens.
2. In `src/pages/jpp/JppLayout.tsx`:
   - Shell: `bg-[#F8F6EE] dark:bg-[#151D16] text-[#2E3A2F] dark:text-[#F8F6EE]`.
   - Mobile top header: `border-b border-[#D9C9B2]/80 dark:border-[#3A4A3B] bg-[#F8F6EE]/80 dark:bg-[#151D16]/80 backdrop-blur-xl`.
3. In `src/pages/jpp/JppSidebar.tsx`:
   - Replace all legacy `rose-*` classes with Earthy Minimal Forest & Sage tokens.
   - Header badge, user card, and navigation links.
4. In `src/pages/jpp/JppOverviewPage.tsx`:
   - Metric cards, system status cards: `bg-white dark:bg-[#1E271F]/80 border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-[0_4px_20px_rgba(46,58,47,0.04)]`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/jppCockpitEarthyMinimal.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/jpp/jppConfig.ts src/pages/jpp/JppLayout.tsx src/pages/jpp/JppSidebar.tsx src/pages/jpp/JppOverviewPage.tsx src/__tests__/jppCockpitEarthyMinimal.test.ts
git commit -m "feat(jpp): align leadership cockpit and sidebar with executive forest war room theme"
```

---

### Task 4: Dokumentasi & Verifikasi Menyeluruh

**Files:**
- Modify: `DEV_GUIDELINE.md`
- Test: All 29+ test suites in `src/__tests__`

- [ ] **Step 1: Update DEV_GUIDELINE.md with Section 31.6**

Add Section 31.6 documenting:
- Unification of SettingsPage & Digital Matric Profile
- PolyMaps tactile bottom sheet & Terracotta navigation CTA
- JPP HQ Leadership Cockpit executive forest palette

- [ ] **Step 2: Run complete Vitest suite**

Run: `npx vitest run`
Expected: 29+ test files passing, 0 failing.

- [ ] **Step 3: Run production build check**

Run: `npm run build`
Expected: Clean compilation with 0 errors and service worker generated.

- [ ] **Step 4: Commit**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs: add section 31.6 documenting earthy minimal complete unification across settings, polymaps and jpp hq"
```
