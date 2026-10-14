# JPPHQ Exco Units UI/UX Revamp & Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build dedicated, domain-specific dashboards for Multimedia (`MultimediaUnitDashboard.tsx`) and Kolaborasi (`KolaborasiUnitDashboard.tsx`), upgrade KLS (`KlsUnitDashboard.tsx`) with full hotspot residency analytics, register them in `JppUnitDashboard.tsx`, and apply surgical visual consistency polish to existing units while maintaining 100% compliance with `gpuBaseline.test.ts` and zero regressions.

**Architecture:** Domain-specific modular dashboard architecture. Each unit exco in JPPHQ retains its unique personality and specialized workspace while adhering to standardized performance rules (pure CSS/Tailwind, no `backdrop-filter: blur`, no `blur-2xl/3xl`, no motion reflow animation, tabular numbers for stats, and `Promise.all` queries).

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide React, Framer Motion (GPU-safe transform/opacity only), Supabase JS Client, Vitest.

## Global Constraints

- NEVER use `backdrop-filter: blur(...)` or `backdrop-filter: saturate(...)`
- NEVER use ambient blur larger than 40px (`blur-2xl`, `blur-3xl`, `blur-[>=40px]`)
- NEVER use Framer Motion layout reflow animations on `width`, `height`, or `boxShadow`
- Numbers in stats must use `font-mono tabular-nums font-black`
- Every database fetch must use `Promise.all([...])` — no N+1 query loops
- Maintain strict RBAC access checks as defined in `JPP_RBAC_SYSTEM.md`
- Maintain existing functionality of the 6 working units (KPP, Keusahawanan, Kebajikan, SRK, Akademik, KK) — apply only lightweight CSS polish without altering business logic or database queries.

---

### Task 1: Create Vitest Unit Test Scaffold for Exco Dashboards

**Files:**
- Create: `src/__tests__/excoUnitsRevamp.test.ts`

**Interfaces:**
- Consumes: `MultimediaUnitDashboard`, `KolaborasiUnitDashboard`, `KlsUnitDashboard`, `JppUnitDashboard`, `FULL_DASHBOARD_UNITS`
- Produces: Test verification for component exports, rendering safety, and GPU-baseline compliance.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/excoUnitsRevamp.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SRC = join(process.cwd(), 'src');

describe('Exco Units Revamp — Component Verification', () => {
  it('MultimediaUnitDashboard file exists and exports component', () => {
    const file = join(SRC, 'pages', 'jpp', 'units', 'MultimediaUnitDashboard.tsx');
    expect(existsSync(file)).toBe(true);
    const content = readFileSync(file, 'utf8');
    expect(content).toContain('export function MultimediaUnitDashboard');
  });

  it('KolaborasiUnitDashboard file exists and exports component', () => {
    const file = join(SRC, 'pages', 'jpp', 'units', 'KolaborasiUnitDashboard.tsx');
    expect(existsSync(file)).toBe(true);
    const content = readFileSync(file, 'utf8');
    expect(content).toContain('export function KolaborasiUnitDashboard');
  });

  it('KlsUnitDashboard contains full hotspot residency analytics', () => {
    const file = join(SRC, 'pages', 'jpp', 'units', 'KlsUnitDashboard.tsx');
    expect(existsSync(file)).toBe(true);
    const content = readFileSync(file, 'utf8');
    expect(content).toContain('kawasanBreakdown');
    expect(content).toContain('PolyRent');
  });

  it('JppUnitDashboard registers MULTIMEDIA and KOLAB in FULL_DASHBOARD_UNITS', () => {
    const file = join(SRC, 'pages', 'jpp', 'JppUnitDashboard.tsx');
    const content = readFileSync(file, 'utf8');
    expect(content).toContain("'MULTIMEDIA'");
    expect(content).toContain("'KOLAB'");
    expect(content).toContain('<MultimediaUnitDashboard');
    expect(content).toContain('<KolaborasiUnitDashboard');
  });

  it('New dashboard files strictly adhere to GPU baseline (no blurs, no backdrop-filter blur)', () => {
    const files = [
      join(SRC, 'pages', 'jpp', 'units', 'MultimediaUnitDashboard.tsx'),
      join(SRC, 'pages', 'jpp', 'units', 'KolaborasiUnitDashboard.tsx'),
      join(SRC, 'pages', 'jpp', 'units', 'KlsUnitDashboard.tsx'),
    ];

    for (const f of files) {
      if (existsSync(f)) {
        const c = readFileSync(f, 'utf8');
        expect(c).not.toMatch(/blur-2xl|blur-3xl|blur-\[[4-9][0-9]px\]/);
        expect(c).not.toMatch(/backdrop-filter:\s*blur/);
        expect(c).not.toMatch(/animate=\{\{[^}]*width:|animate=\{\{[^}]*height:/);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/excoUnitsRevamp.test.ts`
Expected: FAIL (MultimediaUnitDashboard and KolaborasiUnitDashboard do not exist yet).

- [ ] **Step 3: Commit test scaffold**

```bash
git add src/__tests__/excoUnitsRevamp.test.ts
git commit -m "test: add test scaffold for exco units revamp"
```

---

### Task 2: Build `MultimediaUnitDashboard.tsx`

**Files:**
- Create: `src/pages/jpp/units/MultimediaUnitDashboard.tsx`

**Interfaces:**
- Consumes: Supabase client (`club_activities`, `club_reports` with `exco_unit = 'MULTIMEDIA'`), Lucide icons, Framer Motion
- Produces: `export function MultimediaUnitDashboard()`

- [ ] **Step 1: Write `src/pages/jpp/units/MultimediaUnitDashboard.tsx`**

Implement `MultimediaUnitDashboard` with:
1. Sub-tabs: "Hab Media & Poster", "Kalendar Hebahan", "Inventori PA & Teknikal", "Aktiviti & Laporan"
2. Digital Asset Gallery: Official event posters, social media cards, banner graphic specs with download & preview actions
3. Broadcast Pipeline: Scheduled info-blasts, announcements status (Draf, Menunggu Siaran, Disiarkan)
4. PA Equipment & AV Status: Microphones, PA speakers, projector cables, clickers checklist for campus events
5. Live Supabase integration for activities & reports where `exco_unit = 'MULTIMEDIA'`
6. GPU-safe styling: NO backdrop-blur, NO large blurs, tabular numbers for stats, responsive grid.

- [ ] **Step 2: Run test to verify Multimedia test passes**

Run: `npx vitest run src/__tests__/excoUnitsRevamp.test.ts -t "MultimediaUnitDashboard"`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/jpp/units/MultimediaUnitDashboard.tsx
git commit -m "feat(jpp): create MultimediaUnitDashboard component"
```

---

### Task 3: Build `KolaborasiUnitDashboard.tsx`

**Files:**
- Create: `src/pages/jpp/units/KolaborasiUnitDashboard.tsx`

**Interfaces:**
- Consumes: Supabase client (`club_activities`, `club_reports` with `exco_unit = 'KOLAB'`), Lucide icons, Framer Motion
- Produces: `export function KolaborasiUnitDashboard()`

- [ ] **Step 1: Write `src/pages/jpp/units/KolaborasiUnitDashboard.tsx`**

Implement `KolaborasiUnitDashboard` with:
1. Sub-tabs: "Rakan Strategik", "Pangkalan Sukarelawan", "Program Impak", "Aktiviti & Laporan"
2. Strategic Partner Directory: Industry partners, NGOs, government agencies (e.g. Jabatan Belia & Sukan, Bomba, MERCY, industry tech partners) with collaboration status (Aktif, Perbincangan, MoU Sedia Ada)
3. Student Volunteer Bank: Volunteer roster, open volunteer callouts for campus & CSR initiatives, participation counters
4. Community Impact Metrics: Hours of service, beneficiaries count, funds/goods channeled
5. Live Supabase integration for activities & reports where `exco_unit = 'KOLAB'`
6. GPU-safe styling: pure CSS/Tailwind, tabular numbers for stats, high-contrast dark/light mode parity.

- [ ] **Step 2: Run test to verify Kolaborasi test passes**

Run: `npx vitest run src/__tests__/excoUnitsRevamp.test.ts -t "KolaborasiUnitDashboard"`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/jpp/units/KolaborasiUnitDashboard.tsx
git commit -m "feat(jpp): create KolaborasiUnitDashboard component"
```

---

### Task 4: Upgrade `KlsUnitDashboard.tsx` (Hotspot Residency Analytics)

**Files:**
- Modify: `src/pages/jpp/units/KlsUnitDashboard.tsx`

**Interfaces:**
- Consumes: Supabase table `klk_student_residency`, `getKlkAcademicYear()`, `KamsisKlkStatsWidget`
- Produces: Full-featured residency dashboard with hotspot analysis, housing type ratios, and service shortcuts

- [ ] **Step 1: Upgrade `KlsUnitDashboard.tsx`**

Expand `KlsUnitDashboard.tsx` to include:
1. Hotspot breakdown across popular areas: Semambu, Indera Mahkota, Beserah, Jalan Teluk Sisek, Balok, etc., computed dynamically from `klk_student_residency`
2. Rental housing ratio visualizer (Sewa Rumah vs Sewa Bilik vs Bersama Keluarga vs KAMSIS)
3. Direct shortcuts to PolyRent management (`/klk/polyrent-admin`), PolyRider admin (`/polyrider-admin`), and public stats (`/klk/statistik`)
4. Exco activities and monthly reporting section integration for KLS
5. Tabular numbers (`tabular-nums`) and clean card hierarchy adhering to GPU baseline.

- [ ] **Step 2: Run test to verify KLS test passes**

Run: `npx vitest run src/__tests__/excoUnitsRevamp.test.ts -t "KlsUnitDashboard"`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/jpp/units/KlsUnitDashboard.tsx
git commit -m "feat(jpp): upgrade KlsUnitDashboard with full residency analytics"
```

---

### Task 5: Register New Dashboards in `JppUnitDashboard.tsx`

**Files:**
- Modify: `src/pages/jpp/JppUnitDashboard.tsx:22-25, 290-305`

**Interfaces:**
- Consumes: `MultimediaUnitDashboard`, `KolaborasiUnitDashboard`, `FULL_DASHBOARD_UNITS`
- Produces: Routed mounting of all dedicated dashboards

- [ ] **Step 1: Update `FULL_DASHBOARD_UNITS` and render blocks**

1. Add `'MULTIMEDIA'` and `'KOLAB'` to `FULL_DASHBOARD_UNITS`:
```typescript
const FULL_DASHBOARD_UNITS = new Set([
  'KPP', 'KEUSAHAWANAN', 'AKADEMIK', 'KK', 'KEBAJIKAN', 'SRK', 'KLS', 'MULTIMEDIA', 'KOLAB'
]);
```
2. Import `MultimediaUnitDashboard` and `KolaborasiUnitDashboard`.
3. Render them inside the unit dashboard switcher block:
```tsx
{upperCode === 'MULTIMEDIA' && <MultimediaUnitDashboard />}
{upperCode === 'KOLAB'      && <KolaborasiUnitDashboard />}
```

- [ ] **Step 2: Run test to verify registration**

Run: `npx vitest run src/__tests__/excoUnitsRevamp.test.ts -t "JppUnitDashboard"`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/jpp/JppUnitDashboard.tsx
git commit -m "feat(jpp): register Multimedia and Kolaborasi in JppUnitDashboard"
```

---

### Task 6: Visual Consistency Polish for Existing Dashboards

**Files:**
- Modify: `src/pages/jpp/units/KppUnitDashboard.tsx` (CSS polish: tabular numbers on stat cards, uniform subtab button styles)
- Modify: `src/pages/jpp/units/KeusahawananUnitDashboard.tsx` (CSS polish: tabular numbers on counters, clean padding)
- Modify: `src/pages/jpp/units/SrkUnitDashboard.tsx` (CSS polish: tabular numerals on countdown and counters)
- Modify: `src/pages/jpp/units/AkademikUnitDashboard.tsx` (CSS polish: tabular numerals on scores, consistent border tokens)

**Interfaces:**
- Consumes: Tailwind CSS utility classes
- Produces: High visual polish and aesthetic consistency across all units without modifying business logic or DB calls.

- [ ] **Step 1: Apply lightweight CSS polish to existing dashboards**
  - Ensure all stat cards and counters use `font-mono tabular-nums font-black`.
  - Ensure active subtab buttons have consistent padding, hover transitions, and active press feedback (`active:scale-[0.98]`).
  - Ensure dark/light mode contrast parity across all units.

- [ ] **Step 2: Run tests to verify zero regressions**

Run: `npx vitest run`
Expected: ALL test files pass.

- [ ] **Step 3: Commit**

```bash
git add src/pages/jpp/units/KppUnitDashboard.tsx src/pages/jpp/units/KeusahawananUnitDashboard.tsx src/pages/jpp/units/SrkUnitDashboard.tsx src/pages/jpp/units/AkademikUnitDashboard.tsx
git commit -m "style(jpp): polish visual consistency and tabular numbers across exco dashboards"
```

---

### Task 7: Comprehensive Test & GPU Baseline Verification

**Files:**
- Test: `src/__tests__/gpuBaseline.test.ts`
- Test: `src/__tests__/excoUnitsRevamp.test.ts`
- Entire Vitest Suite

- [ ] **Step 1: Run GPU Baseline tests**

Run: `npx vitest run src/__tests__/gpuBaseline.test.ts`
Expected: 9/9 PASS with 0 failures.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: 57/57 test files pass, 630+ tests passing.

- [ ] **Step 3: Run TypeScript & Vite production build check**

Run: `npm run build`
Expected: Successful build with exit code 0.

---

### Task 8: Update Documentation in `DEV_GUIDELINE.md`

**Files:**
- Modify: `DEV_GUIDELINE.md` (Update Section on JPPHQ Exco Modules to document the new `MultimediaUnitDashboard` and `KolaborasiUnitDashboard`, upgraded `KlsUnitDashboard`, and `FULL_DASHBOARD_UNITS`).

- [ ] **Step 1: Update `DEV_GUIDELINE.md`**
  - Document `MultimediaUnitDashboard` and `KolaborasiUnitDashboard`.
  - Document the updated `KlsUnitDashboard` capabilities.
  - Note the 9 active exco dashboard components in Section 11 (Critical Files / Modules).

- [ ] **Step 2: Commit documentation update**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs: update DEV_GUIDELINE.md with exco units revamp documentation"
```

---
