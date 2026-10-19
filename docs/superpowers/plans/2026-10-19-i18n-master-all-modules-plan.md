# Master All-Modules Multilingual (i18n) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide full bilingual support (English & Bahasa Melayu) across 100% of all platform modules (391 TSX files, 177,227 lines of code) by generating 12 domain master translation dictionaries with 100% key parity, registering them into `src/lib/i18n.ts`, and progressively wiring all domain pages with reactive `useTranslation()` hooks.

**Architecture:** Split translation dictionaries by functional domain into `src/locales/{en,ms}/<domain>.json`. Synchronously register all namespaces in `src/lib/i18n.ts`. Enforce automated parity testing via Vitest for every single namespace. Wire page components domain-by-domain to preserve modular stability and verify zero regressions.

**Tech Stack:** React 19, TypeScript ~5.9, Vite 7, i18next, react-i18next, Lucide React, Tailwind CSS, Vitest.

---

## Global Constraints

- **Database / RLS:** Do not modify the Supabase schema, connection pooler, or database tables (0 database queries for translations, pure client-side persistence in `localStorage`).
- **Routing:** Keep all routes in `ROUTES.md` and `App.tsx` strictly unchanged.
- **Dependencies:** Install using `--legacy-peer-deps`.
- **Quality Gates:** Every task must pass `npx vitest run` and `npm run lint:types` with 0 regressions.
- **Documentation:** Update `DEV_GUIDELINE.md` upon completion.

---

## Task Decomposition

### Task 1: Generate Master Translation Dictionaries (All 12 Domains)

**Files:**
- Create in `src/locales/en/` and `src/locales/ms/`:
  - `portal.json`: Landing page, portal hub, promo
  - `kpp.json`: Student dashboard, clubs, activities, reports, review, committee
  - `jpp.json`: JPP HQ cockpit, members, users, logs, announcements, unit dashboards
  - `keusahawanan.json`: POS terminal, inventory stock, business onboarding, sales
  - `kebajikan.json`: Ticket system, aduan awam, cafeteria inspection, food bank
  - `karnival.json`: Carnival voting, booths, scoreboard, admin
  - `ems.json`: Event management, jury portal, stage presentation, certificates, QR check-in
  - `makmp.json`: Anugerah Kecemerlangan, merit criteria, verification, scoring
  - `commerce.json`: PolyMart, PolyRent, PolyRider, PolyTask
  - `services.json`: PolyMaps, PolySuara, campus services
  - `akademik.json`: Timetable grid, classes, exam calendar, GPA calculator
  - `housing.json`: KLK off-campus rentals, Kamsis hostel room declarations
  - `supsas.json`: Sports tournament fixtures, medal tally, athlete records
- Modify: `src/lib/i18n.ts` (import and register all 12 namespaces in `resources` and `i18n.init`)

- [ ] **Step 1: Write all 12 domain dictionaries in `src/locales/en/` and `src/locales/ms/`**
- [ ] **Step 2: Update `src/lib/i18n.ts` with all namespaces**
- [ ] **Step 3: Verify TypeScript compilation with `npm run lint:types`**
- [ ] **Step 4: Commit Task 1**
  ```bash
  git add src/locales/ src/lib/i18n.ts
  git commit -m "feat(i18n): create master translation dictionaries for all 12 platform domains"
  ```

---

### Task 2: Master Parity & Non-Empty String Test Suite

**Files:**
- Create: `src/locales/__tests__/masterLocales.test.ts`

- [ ] **Step 1: Implement automated parity test suite covering all 12 domain namespaces**
- [ ] **Step 2: Run test suite:**
  `npx vitest run src/locales/__tests__/masterLocales.test.ts`
  Expected: PASS (all 12 namespaces verify 100% key parity and non-empty strings).
- [ ] **Step 3: Commit Task 2**
  ```bash
  git add src/locales/__tests__/masterLocales.test.ts
  git commit -m "test(i18n): add comprehensive key parity tests for all 12 domain namespaces"
  ```

---

### Task 3: Domain 1 Integration — Core Student Hub & e-KPP

**Files:**
- Modify: `src/pages/LandingPage.tsx`
- Modify: `src/pages/PortalPage.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/KelabPage.tsx`
- Modify: `src/pages/ClubDetailPage.tsx`
- Modify: `src/pages/AktivitiFull.tsx`
- Modify: `src/pages/AhliPage.tsx`
- Modify: `src/pages/LaporanPage.tsx`
- Modify: `src/pages/SemakanLaporanPage.tsx`
- Test: `src/__tests__/Domain1StudentHubI18n.test.tsx`

- [ ] **Step 1: Wire pages with `useTranslation(['portal', 'kpp', 'common'])`**
- [ ] **Step 2: Create unit test verifying localized rendering in `en` and `ms`**
- [ ] **Step 3: Run `npx vitest run` and `npm run lint:types`**
- [ ] **Step 4: Commit Task 3**
  ```bash
  git add src/pages/LandingPage.tsx src/pages/PortalPage.tsx src/pages/DashboardPage.tsx src/pages/KelabPage.tsx src/pages/ClubDetailPage.tsx src/pages/AktivitiFull.tsx src/pages/AhliPage.tsx src/pages/LaporanPage.tsx src/pages/SemakanLaporanPage.tsx src/__tests__/Domain1StudentHubI18n.test.tsx
  git commit -m "feat(kpp): localize Core Student Hub and e-KPP module pages"
  ```

---

### Task 4: Domain 2 Integration — JPP HQ Administration Portal

**Files:**
- Modify: `src/pages/jpp/JppHomePage.tsx`
- Modify: `src/pages/jpp/JppMembersPage.tsx`
- Modify: `src/pages/jpp/JppOverviewPage.tsx`
- Modify: `src/pages/jpp/JppUsersPage.tsx`
- Modify: `src/pages/jpp/JppLogsPage.tsx`
- Modify: `src/pages/jpp/AnnouncementsPage.tsx`
- Modify: `src/pages/jpp/JppFoodBankAdmin.tsx`
- Test: `src/__tests__/Domain2JppAdminI18n.test.tsx`

- [ ] **Step 1: Wire JPP HQ admin pages with `useTranslation(['jpp', 'common'])`**
- [ ] **Step 2: Create unit test verifying localized rendering**
- [ ] **Step 3: Run `npx vitest run` and `npm run lint:types`**
- [ ] **Step 4: Commit Task 4**
  ```bash
  git add src/pages/jpp/ src/__tests__/Domain2JppAdminI18n.test.tsx
  git commit -m "feat(jpp): localize JPP HQ Administration pages and audit tools"
  ```

---

### Task 5: Domain 3 Integration — Exco Units (Keusahawanan, Kebajikan, Karnival)

**Files:**
- Modify: `src/pages/keusahawanan/KeusahawananPosPage.tsx`, `KeusahawananInventoryPage.tsx`, `KeusahawananOnboardingPage.tsx`
- Modify: `src/pages/kebajikan/KebajikanTicketsPage.tsx`, `KebajikanFoodBankPage.tsx`, `KebajikanKafeteriaPage.tsx`
- Modify: `src/pages/karnival/KarnivalLandingPage.tsx`, `KarnivalVotePage.tsx`, `KarnivalScoreboard.tsx`
- Test: `src/__tests__/Domain3ExcoUnitsI18n.test.tsx`

- [ ] **Step 1: Wire Exco pages with `useTranslation(['keusahawanan', 'kebajikan', 'karnival', 'common'])`**
- [ ] **Step 2: Create unit test verifying localized rendering**
- [ ] **Step 3: Run `npx vitest run` and `npm run lint:types`**
- [ ] **Step 4: Commit Task 5**
  ```bash
  git add src/pages/keusahawanan/ src/pages/kebajikan/ src/pages/karnival/ src/__tests__/Domain3ExcoUnitsI18n.test.tsx
  git commit -m "feat(exco): localize e-Keusahawanan, e-Kebajikan, and Karnival modules"
  ```

---

### Task 6: Domain 4 Integration — Events & Honors (EMS & MAKMP)

**Files:**
- Modify: `src/pages/ems/EmsDashboardPage.tsx`, `EmsJuryPortalPage.tsx`, `EmsLeaderboardPage.tsx`, `EmsCertificatePage.tsx`, `EmsCheckinPage.tsx`
- Modify: `src/pages/makmp/MakmpApplicationPage.tsx`, `MakmpVerificationPage.tsx`
- Test: `src/__tests__/Domain4EmsMakmpI18n.test.tsx`

- [ ] **Step 1: Wire EMS & MAKMP pages with `useTranslation(['ems', 'makmp', 'common'])`**
- [ ] **Step 2: Create unit test verifying localized rendering**
- [ ] **Step 3: Run `npx vitest run` and `npm run lint:types`**
- [ ] **Step 4: Commit Task 6**
  ```bash
  git add src/pages/ems/ src/pages/makmp/ src/__tests__/Domain4EmsMakmpI18n.test.tsx
  git commit -m "feat(events): localize EMS event management and MAKMP honors system"
  ```

---

### Task 7: Domain 5 & 6 Integration — Commerce, Services, Academic & Housing

**Files:**
- Modify: `src/pages/polymart/`, `src/pages/polyrider/`, `src/pages/polyrent/`, `src/pages/polytask/`
- Modify: `src/pages/polymaps/PolyMapsPage.tsx`, `src/pages/polyservices/`
- Modify: `src/pages/akademik/`, `src/pages/klk/`
- Modify: `src/pages/supsas/`
- Test: `src/__tests__/Domain5And6CampusLifeI18n.test.tsx`

- [ ] **Step 1: Wire Commerce, Services, Academic and Housing pages with their corresponding namespaces**
- [ ] **Step 2: Create unit test verifying localized rendering**
- [ ] **Step 3: Run `npx vitest run` and `npm run lint:types`**
- [ ] **Step 4: Commit Task 7**
  ```bash
  git add src/pages/polymart/ src/pages/polyrider/ src/pages/polyrent/ src/pages/polytask/ src/pages/polymaps/ src/pages/polyservices/ src/pages/akademik/ src/pages/klk/ src/pages/supsas/ src/__tests__/Domain5And6CampusLifeI18n.test.tsx
  git commit -m "feat(services): localize campus commerce, maps, academic timetable, and sports modules"
  ```

---

### Task 8: Comprehensive Verification, Documentation & Final Review

**Files:**
- Modify: `DEV_GUIDELINE.md`

- [ ] **Step 1: Update `DEV_GUIDELINE.md` with full catalog of all 12 domain namespaces and developer usage**
- [ ] **Step 2: Run full test suite: `npx vitest run`**
- [ ] **Step 3: Run type check: `npm run lint:types`**
- [ ] **Step 4: Commit Task 8**
  ```bash
  git add DEV_GUIDELINE.md
  git commit -m "docs: document complete 12-domain multilingual architecture in DEV_GUIDELINE.md"
  ```
