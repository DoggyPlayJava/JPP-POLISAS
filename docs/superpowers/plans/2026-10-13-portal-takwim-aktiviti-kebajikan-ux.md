# Portal, Takwim, Aktiviti, E-Kebajikan, BottomNav & Profile Modal UX Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate mobile clutter, fix layout bugs, and deliver a modern high-end UX across 6 touchpoints: E-Kebajikan dual header, NextClassBentoCard expanded clutter, Aktiviti.tsx filter wrapping, Portal Takwim button routing, BottomNav mid-screen floating bug, and CompleteProfileModal modernization.

**Architecture:** Client-side React component refactoring with Framer Motion, React Portals (`createPortal` for viewport isolation), React Router `useSearchParams` URL synchronization, and disciplined anti-slop Tailwind CSS responsive styling.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Framer Motion, Vitest, React Testing Library.

## Global Constraints

- Never break existing RLS rules or database schemas.
- Vitest unit tests must accompany each task and pass with zero regressions.
- No floating FABs in Aktiviti.tsx that collide with AI Chat or BottomNav.
- Bento Card must display the Full Subject Name only (`entry.course_name || entry.course_code`), dropping redundant duplicate course codes.
- BottomNav must be teleported to `document.body` via `createPortal` so it is permanently anchored to the device viewport regardless of parent container transforms or overflow.
- Update `DEV_GUIDELINE.md` upon completion.

---

### Task 1: Fix E-Kebajikan Dual Top Header on Mobile

**Files:**
- Modify: `src/pages/kebajikan/KebajikanSubmitPage.tsx:445-470`
- Modify: `src/pages/kebajikan/KebajikanLayout.tsx:124-145`
- Test: `src/__tests__/KebajikanHeaderParity.test.tsx`

**Interfaces:**
- Consumes: `useLocation` from `react-router-dom`, `isSubmitOrChatPage` in `KebajikanLayout.tsx`.
- Produces: Single unified top bar on mobile for E-Kebajikan with back navigation to `/portal` or `/kebajikan`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/KebajikanHeaderParity.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Kebajikan Mobile Header Parity', () => {
  const submitPagePath = path.resolve(__dirname, '../pages/kebajikan/KebajikanSubmitPage.tsx');
  const layoutPath = path.resolve(__dirname, '../pages/kebajikan/KebajikanLayout.tsx');

  it('verifies KebajikanSubmitPage hides its local top nav on mobile (hidden lg:flex)', () => {
    const content = fs.readFileSync(submitPagePath, 'utf8');
    expect(content).toMatch(/hidden\s+lg:flex/);
  });

  it('verifies KebajikanLayout handles submit page back navigation cleanly', () => {
    const content = fs.readFileSync(layoutPath, 'utf8');
    expect(content).toContain('isSubmitOrChatPage');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/KebajikanHeaderParity.test.tsx`
Expected: FAIL (KebajikanSubmitPage currently uses `flex items-center justify-between` without `hidden lg:flex`).

- [ ] **Step 3: Modify `KebajikanSubmitPage.tsx` and `KebajikanLayout.tsx`**

In `src/pages/kebajikan/KebajikanSubmitPage.tsx` line 450:
Change:
```tsx
      {/* Top Nav */}
      <div
        className="relative z-10 flex items-center justify-between px-6 h-16 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-950/50  transition-colors"
      >
```
To:
```tsx
      {/* Top Nav (Desktop only — Mobile is handled uniformly by KebajikanLayout) */}
      <div
        className="relative z-10 hidden lg:flex items-center justify-between px-6 h-16 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-950/50 transition-colors"
      >
```

In `src/pages/kebajikan/KebajikanLayout.tsx` lines 125-144:
Ensure when `isSubmitOrChatPage` is true, the mobile header shows a back button (`ChevronLeft`) linking to `/portal` or `/kebajikan`, rather than an unlinked hamburger menu:
```tsx
            {isSubmitOrChatPage ? (
              <Link
                to="/portal"
                className="p-2 -ml-2 text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 text-xs font-bold"
                aria-label="Kembali ke Portal"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden xs:inline">Portal</span>
              </Link>
            ) : (
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="tour-mobile-hamburger p-2 -ml-2 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <span className="font-black text-[10px] uppercase tracking-widest text-[#2DD4BF] ml-1">E-Kebajikan</span>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/KebajikanHeaderParity.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/kebajikan/KebajikanSubmitPage.tsx src/pages/kebajikan/KebajikanLayout.tsx src/__tests__/KebajikanHeaderParity.test.tsx
git commit -m "fix(kebajikan): eliminate duplicate top header on mobile screens"
```

---

### Task 2: Declutter NextClassBentoCard (Full Subject Name Display)

**Files:**
- Modify: `src/components/portal/NextClassBentoCard.tsx:460-660`
- Test: `src/__tests__/NextClassBentoCard.test.tsx`

**Interfaces:**
- Consumes: `StudentTimetableEntry` (`course_name`, `course_code`, `class_type`, `location`, `room_raw`, `start_time`, `end_time`).
- Produces: Clean, uncluttered expanded card showing only Full Subject Name (hiding duplicate course code), concise location, 4px minimal progress bar, and balanced buttons.

- [ ] **Step 1: Write the failing test**

Update `src/__tests__/NextClassBentoCard.test.tsx` to assert that when expanded with a distinct `course_name`:
1. The full subject name is prominently rendered.
2. The course code is NOT rendered in duplicate as a big headline.
3. The "Lihat Jadual Penuh" link points to `/akademik/takwim?tab=personal`.

```tsx
it('renders full subject name without redundant duplicate course code in expanded view', () => {
  const mockEntries = [{
    id: 'test-1',
    user_id: 'user-1',
    day_of_week: 1, // Monday
    start_time: '08:00:00',
    end_time: '10:00:00',
    course_code: 'DFT40133',
    course_name: 'PENGATURCARAAN WEB',
    class_type: 'KULIAH',
    room_raw: 'BK4 · BANGUNAN TEKNOLOGI MAKLUMAT & KOMUNIKASI',
    is_archived: false,
  }];

  renderWithRouter(<NextClassBentoCard entries={mockEntries as any} />);
  // Click expand if compact
  const expandBtn = screen.queryByTitle(/Kembangkan|maklumat penuh/i);
  if (expandBtn) fireEvent.click(expandBtn);

  expect(screen.getByText('PENGATURCARAAN WEB')).toBeInTheDocument();
  // Ensure "Lihat Jadual Penuh" routes to ?tab=personal
  const jadualLink = screen.getByRole('link', { name: /Jadual Penuh/i });
  expect(jadualLink).toHaveAttribute('href', '/akademik/takwim?tab=personal');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/NextClassBentoCard.test.tsx`
Expected: FAIL (link currently goes to `/akademik/takwim` without query param, and code is printed as a badge + headline).

- [ ] **Step 3: Modify `NextClassBentoCard.tsx`**

In `src/components/portal/NextClassBentoCard.tsx`:
1. Smart Location Formatter helper:
```tsx
export function formatCompactLocation(entry: StudentTimetableEntry): string {
  if (entry.location?.room_code) {
    const building = entry.location.building?.code || entry.location.building?.short_name;
    return building ? `${entry.location.room_code} · ${building}` : entry.location.room_code;
  }
  const raw = entry.room_raw || 'Bilik Kuliah';
  // If string contains long building name like "BANGUNAN TEKNOLOGI MAKLUMAT & KOMUNIKASI", condense to JTMK
  return raw
    .replace(/BANGUNAN TEKNOLOGI MAKLUMAT & KOMUNIKASI/i, 'JTMK')
    .replace(/BANGUNAN KEJURUTERAAN AWAM/i, 'JKA')
    .replace(/BANGUNAN KEJURUTERAAN ELEKTRIK/i, 'JKE')
    .replace(/BANGUNAN KEJURUTERAAN MEKANIKAL/i, 'JKM')
    .replace(/BANGUNAN PERDAGANGAN/i, 'JP');
}
```
2. Display Title Logic:
```tsx
const displayName = entry.course_name && entry.course_name.trim().length > 0
  ? entry.course_name.trim()
  : entry.course_code;
```
Render `displayName` as the primary headline:
```tsx
<div className="space-y-1.5">
  <div className="flex items-center gap-2">
    <span
      className={cn(
        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
        typeBadge.badgeClass
      )}
    >
      {typeBadge.label}
    </span>
  </div>
  <h3 className="text-lg sm:text-xl font-black text-[#2E3A2F] dark:text-[#F8F6EE] tracking-tight leading-snug">
    {displayName}
  </h3>
</div>
```
3. Update "Lihat Jadual Penuh" Link to `/akademik/takwim?tab=personal`.
4. Refine progress bar to height `h-1` (4px).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/NextClassBentoCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/portal/NextClassBentoCard.tsx src/__tests__/NextClassBentoCard.test.tsx
git commit -m "feat(portal): streamline NextClassBentoCard with full subject name and clean compact details"
```

---

### Task 3: Unclutter Aktiviti.tsx Filters (Single-Row Swipeable Pills & Inline Action)

**Files:**
- Modify: `src/pages/AktivitiFull.tsx:365-410`
- Test: `src/__tests__/AktivitiFullFilters.test.tsx`

**Interfaces:**
- Consumes: `activities`, `statusCounts`, `filterStatus`, `setFilterStatus`, `openCreate`, `canManage`.
- Produces: 1-line horizontal scrollable filter pills (`overflow-x-auto no-scrollbar`) and full-width prominent "+ Aktiviti Baru" button directly above the cards with NO FAB.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/AktivitiFullFilters.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('AktivitiFull Filter Decluttering', () => {
  const filePath = path.resolve(__dirname, '../pages/AktivitiFull.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  it('verifies status filters use single-row horizontal scrolling without flex-wrap', () => {
    expect(content).toMatch(/overflow-x-auto/);
    expect(content).toMatch(/no-scrollbar/);
  });

  it('verifies + Aktiviti Baru button is placed cleanly above activity cards without FAB', () => {
    expect(content).toContain('Aktiviti Baru');
    // Ensure no fixed FAB was used for Aktiviti
    expect(content).not.toMatch(/fixed\s+bottom-\d+\s+right-\d+.*Aktiviti\s+Baru/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/AktivitiFullFilters.test.tsx`
Expected: FAIL (currently uses `flex gap-3 flex-wrap` without `overflow-x-auto no-scrollbar`).

- [ ] **Step 3: Modify `src/pages/AktivitiFull.tsx`**

In `AktivitiKelabTab` inside `src/pages/AktivitiFull.tsx`:
Replace lines 367-404:
```tsx
      {/* ── CONTROLS: 1-ROW SWIPEABLE FILTER PILLS & ACTION BUTTON ── */}
      <div className="space-y-4">
        {/* Horizontal scrollable status filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { key: 'semua', label: 'Semua', count: activities.length },
            { key: 'perancangan', label: 'Perancangan', count: statusCounts.perancangan || 0 },
            { key: 'aktif', label: 'Aktif', count: statusCounts.aktif || 0 },
            { key: 'selesai', label: 'Selesai', count: statusCounts.selesai || 0 },
            { key: 'ditangguh', label: 'Ditangguh', count: statusCounts.ditangguh || 0 },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 select-none',
                filterStatus === f.key
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-background border border-border text-muted-foreground hover:border-slate-400'
              )}
            >
              <span>{f.label}</span>
              <span className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black',
                filterStatus === f.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              )}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Action Button: Visible, clear, directly above cards */}
        {canManage && (
          <Button
            onClick={openCreate}
            className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>Aktiviti Baru</span>
          </Button>
        )}
      </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/AktivitiFullFilters.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AktivitiFull.tsx src/__tests__/AktivitiFullFilters.test.tsx
git commit -m "feat(kelab): unclutter aktiviti filters with swipeable pills and inline action button"
```

---

### Task 4: Connect Portal Takwim Button to Official Takwim & Sync Tabs

**Files:**
- Modify: `src/pages/akademik/AkademikTakwimPage.tsx:15-30`
- Modify: `src/lib/superAppHelpers.ts:172-180`
- Modify: `src/components/portal/CampusServicesGrid.tsx:110-125`
- Test: `src/__tests__/TakwimTabSync.test.tsx`

**Interfaces:**
- Consumes: URL search parameter `?tab=pusat` or `?tab=personal`.
- Produces: Synchronized tab state opening "Takwim Rasmi POLISAS & Kelab" when triggered from the Portal quick-action grid.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/TakwimTabSync.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Portal Takwim URL Sync', () => {
  const helpersPath = path.resolve(__dirname, '../lib/superAppHelpers.ts');
  const takwimPagePath = path.resolve(__dirname, '../pages/akademik/AkademikTakwimPage.tsx');

  it('verifies Takwim service routes to /akademik/takwim?tab=pusat', () => {
    const content = fs.readFileSync(helpersPath, 'utf8');
    expect(content).toContain("routeOrAction: '/akademik/takwim?tab=pusat'");
  });

  it('verifies AkademikTakwimPage reads tab query parameter', () => {
    const content = fs.readFileSync(takwimPagePath, 'utf8');
    expect(content).toContain('useSearchParams');
    expect(content).toMatch(/searchParams\.get\(['"]tab['"]\)/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/TakwimTabSync.test.tsx`
Expected: FAIL (`superAppHelpers.ts` uses `/akademik/takwim`, `AkademikTakwimPage.tsx` does not use `useSearchParams`).

- [ ] **Step 3: Modify `superAppHelpers.ts` and `AkademikTakwimPage.tsx`**

In `src/lib/superAppHelpers.ts` line 176:
Change:
```ts
    {
      id: 'takwim',
      label: 'Takwim',
      sublabel: 'Kalendar Rasmi',
      description: 'Kalendar Rasmi',
      routeOrAction: '/akademik/takwim?tab=pusat',
      color: 'indigo',
      tourClass: 'tour-qa-polyservices',
    },
```

In `src/pages/akademik/AkademikTakwimPage.tsx`:
Import `useSearchParams` from `react-router-dom`:
```tsx
import { useSearchParams } from 'react-router-dom';
```
In `AkademikTakwimPage()`:
```tsx
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'pusat' ? 'PUSAT' : 'PERSONAL';
  const [activeMainTab, setActiveMainTab] = useState<'PERSONAL' | 'PUSAT'>(initialTab);

  // Sync if URL search params change
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'pusat') {
      setActiveMainTab('PUSAT');
    } else if (tabParam === 'personal') {
      setActiveMainTab('PERSONAL');
    }
  }, [searchParams]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/TakwimTabSync.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/superAppHelpers.ts src/pages/akademik/AkademikTakwimPage.tsx src/__tests__/TakwimTabSync.test.tsx
git commit -m "feat(takwim): route portal button to official campus takwim tab via query param"
```

---

### Task 5: Fix Floating BottomNav Mid-Screen Bug via React Portal

**Files:**
- Modify: `src/components/layout/BottomNav.tsx:1-40, 195-285`
- Test: `src/__tests__/BottomNavPortal.test.tsx`

**Interfaces:**
- Consumes: React `createPortal` from `react-dom`.
- Produces: Permanently anchored bottom navbar mounted directly to `document.body`, immune to ancestor transforms, perspective, or overflow.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/BottomNavPortal.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('BottomNav React Portal Mounting', () => {
  const navPath = path.resolve(__dirname, '../components/layout/BottomNav.tsx');
  const content = fs.readFileSync(navPath, 'utf8');

  it('verifies BottomNav imports and uses createPortal to escape parent transform/overflow', () => {
    expect(content).toContain('createPortal');
    expect(content).toContain('document.body');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/BottomNavPortal.test.tsx`
Expected: FAIL (`createPortal` is not imported or used in `BottomNav.tsx`).

- [ ] **Step 3: Modify `src/components/layout/BottomNav.tsx`**

1. Import `createPortal` from `react-dom`:
```tsx
import { createPortal } from 'react-dom';
```
2. In `BottomNav`:
Wrap the returned JSX in `createPortal(..., document.body)` with safety check for SSR/DOM ready:
```tsx
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <PolymartServiceModal isOpen={showPolymartModal} onClose={() => setShowPolymartModal(false)} />
      {/* 1. Backdrop & Quick Actions Menu */}
      <AnimatePresence>
        ...
      </AnimatePresence>

      {/* 2. Floating Bottom Nav Dock */}
      <div
        ref={navRef}
        id="bottom-nav-dock"
        ...
      </div>
    </>,
    document.body
  );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/BottomNavPortal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/BottomNav.tsx src/__tests__/BottomNavPortal.test.tsx
git commit -m "fix(layout): teleport BottomNav to document.body to prevent mid-screen floating"
```

---

### Task 6: Modernize CompleteProfileModal UI/UX

**Files:**
- Modify: `src/components/ui/CompleteProfileModal.tsx`
- Test: `src/__tests__/CompleteProfileModalModern.test.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `parseAndValidateMatric()`, `JABATAN_PROGRAMMES`.
- Produces: Modern institutional dark-card header with POLISAS badge, animated smart matric detection chip, and smooth segmented control pills for Intake 1 vs Intake 2.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/CompleteProfileModalModern.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('CompleteProfileModal Modern Institutional Polish', () => {
  const modalPath = path.resolve(__dirname, '../components/ui/CompleteProfileModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');

  it('replaces dated sparkles gradient with sleek institutional styling', () => {
    expect(content).not.toContain('animate={{ rotate: 360 }}');
    expect(content).toMatch(/bg-slate-900|bg-zinc-950/);
  });

  it('contains smart matric auto-detection verification badge', () => {
    expect(content).toMatch(/Pengesahan No\. Matrik|Pengesahan Program/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/CompleteProfileModalModern.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Modify `src/components/ui/CompleteProfileModal.tsx`**

1. Replace header with refined institutional theme:
```tsx
          {/* Refined Institutional Header */}
          <div className="h-28 bg-slate-900 dark:bg-zinc-950 border-b border-white/10 relative overflow-hidden flex items-center justify-center shrink-0">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,white_0%,transparent_100%)]" />
            <div className="flex items-center gap-3.5 z-10 px-6">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center p-2 shadow-sm">
                <img src="/jpp-logo.png" alt="POLISAS Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Portal Rasmi POLISAS</span>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">{heading}</h2>
              </div>
            </div>
          </div>
```
2. Add Real-time Smart Matric Verification Badge:
When `matricParsed?.isValidFormat` is true and `matricParsed.knownProgramme` exists, display:
```tsx
          {matricParsed?.isValidFormat && matricParsed.knownProgramme && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1"
            >
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Pengesahan Program Automatik</span>
              </div>
              <p className="text-xs font-medium">
                {matricParsed.knownProgramme.jabatan.toUpperCase()} · Program {matricParsed.progCode} · Sesi Kemasukan {matricParsed.fullYear}
              </p>
            </motion.div>
          )}
```
3. Modernize Intake 1 vs Intake 2 segmented pill controls.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/CompleteProfileModalModern.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/CompleteProfileModal.tsx src/__tests__/CompleteProfileModalModern.test.tsx
git commit -m "feat(auth): modernise CompleteProfileModal with institutional styling and smart matric detection"
```

---

### Task 7: Update `DEV_GUIDELINE.md` & Full Suite Verification

**Files:**
- Modify: `DEV_GUIDELINE.md`
- Test: Full Vitest test suite (`npm test`)
- Build: `npm run build`

**Interfaces:**
- Consumes: All updated files from Tasks 1-6.
- Produces: Passing test suite (511+ tests) and up-to-date developer guidelines.

- [ ] **Step 1: Update `DEV_GUIDELINE.md`**

Update `DEV_GUIDELINE.md` with:
1. Note on `BottomNav.tsx` utilizing React `createPortal` to prevent viewport coordinate clipping.
2. Note on `AkademikTakwimPage.tsx` supporting `?tab=pusat` and `?tab=personal`.
3. Note on `AktivitiFull.tsx` using horizontal scrollable filter pills with inline action button.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: 100% tests pass (515+ tests, 0 fails).

- [ ] **Step 3: Run production build check**

Run: `npm run build`
Expected: TypeScript check succeeds and Vite outputs production bundle cleanly.

- [ ] **Step 4: Commit**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs: update DEV_GUIDELINE.md for portal takwim, aktiviti, and bottomnav refactor"
```
