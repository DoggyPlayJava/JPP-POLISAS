# Campus Super App Polish & Mobile-Ergonomics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the Campus Super App portal with authentic POLISAS Executive Maroon branding, official JPP Logo, functional `<ThemeToggle />` and `<NotificationBell />`, realigned 8 campus services (PolySuara, PolyMart, Takwim, PolyMaps, PolyRent, E-Kebajikan, Merit QR, Kelab EKPP), and fix mobile horizontal clipping and bottom dock overlap.

**Architecture:**
- `SuperAppHeader`: Transformed to institutional Executive Maroon (`from-[#4A0E17] via-[#6B141E] to-[#1C0508]`) with official `/jpp-logo.png`, direct `<ThemeToggle />`, and real `<NotificationBell />`.
- `CampusServicesGrid`: 8 squircle tiles strictly configured for PolySuara, PolyMart, Takwim, PolyMaps, PolyRent, E-Kebajikan, Scan QR, and Kelab EKPP in a compact 4x2 grid that fits cleanly on mobile.
- `EmsEventsFeed` & `PolyMartFeed`: Fixed horizontal overflow using `-mx-4 px-4 sm:mx-0 sm:px-0` and explicit card widths (`shrink-0 w-[155px] sm:w-[190px]`) to eliminate mobile edge clipping. Automatically hide empty event state.
- `PortalPage`: Ensure sufficient bottom clearance (`pb-40` + spacer) so `BottomNav` never covers content, and hoist `FloatingAiChat` above the dock.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons, Supabase, Vitest.

## Global Constraints
- Preserve `SystemTour` targets (`.tour-navbar-profile`, `.tour-qa-polyservices`, `.tour-qa-kebajikan`, `.tour-qa-qr`, `.tour-qa-takwim`, `.tour-mod-ekpp`, etc.).
- Follow Test-Driven Development (TDD) strictly: write failing test, watch fail, implement, verify pass, commit.
- Strict Zero Em-Dash rule.
- WCAG AA contrast compliance across light and dark modes.

---

### Task 1: Update Test Suite for Realigned 8 Campus Services & Maroon Theme Tokens (TDD)

**Files:**
- Modify: `src/__tests__/superAppPortal.test.ts`
- Modify: `src/lib/superAppHelpers.ts`

**Interfaces:**
- Consumes: Vitest test runner.
- Produces: Updated helper functions and assertions for:
  - `getCampusServicesConfig`: returns 8 services with IDs `polysuara`, `polymart`, `takwim`, `polymaps`, `polyrent`, `kebajikan`, `akademik_qr`, `ekpp`.
  - `getHeaderGradientClass`: returns maroon gradient classes for default state (`from-[#4A0E17] via-[#6B141E] to-[#1C0508]`).

- [ ] **Step 1: Write failing tests in `src/__tests__/superAppPortal.test.ts`**

Update the test cases:
```typescript
it('returns the updated 8 core campus services including polysuara, polymaps, polyrent, takwim', () => {
  const services = getCampusServicesConfig({ kamsisStatus: null });
  const ids = services.map(s => s.id);
  expect(ids).toEqual([
    'polysuara',
    'polymart',
    'takwim',
    'polymaps',
    'polyrent',
    'kebajikan',
    'akademik_qr',
    'ekpp',
  ]);
});

it('returns Executive Maroon gradient for default institutional state', () => {
  const gradient = getHeaderGradientClass(false, false);
  expect(gradient).toContain('#4A0E17');
  expect(gradient).toContain('#6B141E');
  expect(gradient).toContain('#1C0508');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Expected: FAIL with mismatched IDs and gradient tokens.

- [ ] **Step 3: Update `src/lib/superAppHelpers.ts` to make tests pass**

Update `getHeaderGradientClass` and `getCampusServicesConfig` with the new services and maroon gradient.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Expected: PASS with all tests passing.

- [ ] **Step 5: Commit changes**

```bash
git add src/lib/superAppHelpers.ts src/__tests__/superAppPortal.test.ts
git commit -m "test(portal): update tests for realigned 8 campus services and maroon theme"
```

---

### Task 2: Polish `SuperAppHeader.tsx` with Executive Maroon, JPP Logo, ThemeToggle, & NotificationBell

**Files:**
- Modify: `src/components/portal/SuperAppHeader.tsx`

**Interfaces:**
- Consumes:
  - `<ThemeToggle />` from `@/components/ui/ThemeToggle`
  - `<NotificationBell />` from `@/components/ui/NotificationBell`
  - `/jpp-logo.png`
- Produces: Polished `<SuperAppHeader />` with brand crest, controls, and floating search bar.

- [ ] **Step 1: Update `src/components/portal/SuperAppHeader.tsx`**

1. Import `ThemeToggle` and `NotificationBell`.
2. Update header styling to use `getHeaderGradientClass(karnivalActive, supsasActive)`.
3. In the top bar:
   - Left side: JPP Logo badge (`/jpp-logo.png`) + text "JPP POLISAS" + location pill `📍 POLISAS, Semambu`.
   - Right side: `<ThemeToggle />` + `<NotificationBell />` + profile button.
4. Keep the greeting, role badge, and floating search bar (`Ctrl + K`).

- [ ] **Step 2: Run build to verify clean compilation**

Run: `npm run build`
Expected: Build passes with 0 errors.

- [ ] **Step 3: Commit changes**

```bash
git add src/components/portal/SuperAppHeader.tsx
git commit -m "feat(portal): polish SuperAppHeader with executive maroon, JPP logo, ThemeToggle, and NotificationBell"
```

---

### Task 3: Realign `CampusServicesGrid.tsx` with 8 Core Services & Compact Mobile Grid

**Files:**
- Modify: `src/components/portal/CampusServicesGrid.tsx`

**Interfaces:**
- Consumes:
  - Lucide icons: `Megaphone` (PolySuara), `UtensilsCrossed` (PolyMart), `CalendarDays` (Takwim), `Map` (PolyMaps), `Package` (PolyRent), `HeartHandshake` (E-Kebajikan), `QrCode` (Merit QR), `Landmark` (Kelab EKPP).
  - Navigation handlers.
- Produces: `<CampusServicesGrid />` rendering 8 services in a balanced 4x2 grid on mobile.

- [ ] **Step 1: Update `src/components/portal/CampusServicesGrid.tsx`**

1. Replace `Bike` / `Wrench` / `Building2` / `Ticket` with the realigned services:
   - `polysuara`: Megaphone, route `/polysuara`, badge `SUARA`
   - `polymart`: UtensilsCrossed, route `/keusahawanan/dashboard`, badge `MAKAN`
   - `takwim`: CalendarDays, route `/akademik/takwim`, badge `TAKTIM`
   - `polymaps`: Map, route `/polymaps`, badge `PETA`
   - `polyrent`: Package, route `/polyrent`, badge `SEWA`
   - `kebajikan`: HeartHandshake, route `/kebajikan`, badge active count
   - `akademik_qr`: QrCode, route `/akademik/qr`, badge `MERIT`
   - `ekpp`: Landmark, route `/kelab`, badge `KELAB`
2. Ensure touch targets are comfortable and compact (`p-2 sm:p-3`, `w-11 h-11 sm:w-13 sm:h-13` icon containers) so that 4 columns fit on narrow mobile screens (360px+) without horizontal stretching or text clipping.
3. Preserve tour classes: `tour-qa-polyservices` (on Takwim/Servis), `tour-qa-kebajikan`, `tour-qa-qr`, `tour-mod-ekpp`.

- [ ] **Step 2: Run test suite**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit changes**

```bash
git add src/components/portal/CampusServicesGrid.tsx
git commit -m "feat(portal): realign CampusServicesGrid to 8 core services with compact mobile layout"
```

---

### Task 4: Fix Mobile Horizontal Overflow in Feeds (`PolyMartFeed` & `EmsEventsFeed`)

**Files:**
- Modify: `src/components/portal/PolyMartFeed.tsx`
- Modify: `src/components/portal/EmsEventsFeed.tsx`

**Interfaces:**
- Consumes: Supabase queries for products and events.
- Produces: Mobile-friendly horizontal scroll feeds that do not cause viewport clipping.

- [ ] **Step 1: Update `src/components/portal/EmsEventsFeed.tsx`**

1. If `events.length === 0` after fetching, return `null` immediately to eliminate empty broken dashed placeholder.
2. In the scroll container, use `-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory`.
3. Set card sizing to `shrink-0 w-[240px] sm:w-[280px]` with bounded image heights (`h-28`).

- [ ] **Step 2: Update `src/components/portal/PolyMartFeed.tsx`**

1. If `products.length === 0` after fetching, return `null` immediately.
2. In the scroll container, use `-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory`.
3. Set card sizing to `shrink-0 w-[150px] sm:w-[185px]` with bounded image heights (`h-24 sm:h-28 object-cover rounded-xl`).
4. Ensure text uses `truncate` and does not force card expansion.

- [ ] **Step 3: Run build to verify clean compilation**

Run: `npm run build`
Expected: Build passes with 0 errors.

- [ ] **Step 4: Commit changes**

```bash
git add src/components/portal/EmsEventsFeed.tsx src/components/portal/PolyMartFeed.tsx
git commit -m "fix(portal): resolve mobile horizontal overflow and edge clipping in campus feeds"
```

---

### Task 5: Fix Mobile Bottom Dock Clearance in `PortalPage.tsx`

**Files:**
- Modify: `src/pages/PortalPage.tsx`

**Interfaces:**
- Consumes: All portal components and `BottomNav`.
- Produces: Fluid layout with generous bottom clearance so `BottomNav` never obstructs content.

- [ ] **Step 1: Update `src/pages/PortalPage.tsx`**

1. Update `<main>` padding from `pb-24` to `pb-36 sm:pb-32`.
2. Add an explicit spacer `<div className="h-24 sm:h-16" aria-hidden="true" />` at the bottom of `<main>` before the footer and `BottomNav`.
3. Verify that `FloatingAiChat` has appropriate z-index and offset (`bottom-28 right-4 md:bottom-8 md:right-8`) so it doesn't cover `BottomNav` buttons.

- [ ] **Step 2: Verify build and tests**

Run: `npm run test -- --run`
Run: `npm run build`
Expected: 100% PASS with 0 build errors.

- [ ] **Step 3: Commit changes**

```bash
git add src/pages/PortalPage.tsx
git commit -m "fix(portal): add bottom dock clearance and hoist chat widget above navigation dock"
```

---

### Task 6: Final Verification & Documentation

**Files:**
- Modify: `DEV_GUIDELINE.md`

- [ ] **Step 1: Update Section 29 in `DEV_GUIDELINE.md`**

Document the Executive Maroon palette, the updated 8 core services, the integrated top bar controls, and the mobile edge-to-edge scroll feed pattern.

- [ ] **Step 2: Run complete test suite and dev server verification**

Run: `npm test -- --run`
Verify `http://localhost:3000/portal` responds 200 OK.

- [ ] **Step 3: Commit documentation**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs(portal): update super app guidelines with maroon branding and realigned services"
```
