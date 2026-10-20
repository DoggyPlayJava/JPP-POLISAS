# Comprehensive Codebase Localization & Sidebar Deep Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all remaining hardcoded Malay strings across all 205 pages, 8 navigation sidebars, and 72 modal components in the codebase, enforcing 100% bilingual dictionary parity (EN <-> MS) and concise, natural English copy without touching the database.

**Architecture:** 
- Full localization using `react-i18next` with namespace segregation (`nav`, `portal`, `auth`, `settings`, `jpp`, `kpp`, `kebajikan`, `keusahawanan`, `karnival`, `ems`, `makmp`, `commerce`, `services`, `akademik`, `housing`, `supsas`, `common`, and new `gig`).
- Mandatory literal Malay fallback parameter in all calls: `t('namespace:key', 'Literal BM Asal')`.
- All navigation arrays and helper functions (`navItem`, `{ label: ... }`) localized dynamically using `t()`.
- Multi-wave automated scan loops verifying remaining untranslated strings reach 0 across all UI elements.

**Tech Stack:** React 18, TypeScript, react-i18next, TailwindCSS, Vitest.

## Global Constraints
- Zero Database Alterations: Strictly do NOT touch database migrations, tables, or columns.
- Preserved Supabase Singleton: Strictly use `src/lib/supabase.ts` singleton; do NOT instantiate new clients.
- 100% Key Parity: Every key in `src/locales/en/*.json` must exist identically in `src/locales/ms/*.json` and vice-versa.
- Mandatory Malay Fallback: All `t()` calls must supply the original Malay string as fallback second parameter.
- Concise English Copy: Ban overtranslations, verbose descriptions, redundant slashes, and bulky parentheticals.
- Administrative Document Integrity: Official generated PDFs (Surat Pengesahan, Kertas Kerja HEP) remain in official Bahasa Melayu; surrounding Web UI controls are 100% bilingual.
- All unit tests must pass: `npx vitest run` with 0 failures.

---

### Task 1: Domain 0 (Global Shells, Navigations & All Sidebars)

**Files:**
- Modify: `src/pages/jpp/JppSidebar.tsx`
- Modify: `src/pages/kebajikan/KebajikanSidebar.tsx`
- Modify: `src/pages/klk/KlkSidebar.tsx`
- Modify: `src/pages/polyrent/PolyRentSidebar.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/PortalSidebar.tsx`
- Modify: `src/components/layout/BottomNav.tsx`
- Modify: `src/components/portal/PortalNavbar.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/kebajikan/KebajikanSettingsPage.tsx`
- Modify: `src/pages/polymart/PolyMartLayout.tsx`
- Modify: `src/pages/akademik/AkademikLayout.tsx`
- Modify: `src/pages/jpp/JppStructureSettings.tsx`
- Dictionaries: `src/locales/en/nav.json`, `src/locales/ms/nav.json`, `src/locales/en/portal.json`, `src/locales/ms/portal.json`, `src/locales/en/settings.json`, `src/locales/ms/settings.json`
- Test: `src/__tests__/Domain0NavigationShellsI18n.test.tsx`

**Interfaces:**
- Consumes: `useTranslation(['nav', 'portal', 'settings', 'common'])`
- Produces: Localized sidebars and navigation items where labels evaluate via `t('nav:...', 'Fallback')`

- [ ] **Step 1: Write the failing test**
Create `src/__tests__/Domain0NavigationShellsI18n.test.tsx` testing that `JppSidebar`, `KebajikanSidebar`, `KlkSidebar`, `PolyRentSidebar`, `PortalSidebar`, and `BottomNav` render English labels when i18n language is set to `en`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/__tests__/Domain0NavigationShellsI18n.test.tsx`
Expected: FAIL due to hardcoded Malay labels.

- [ ] **Step 3: Implement localization across sidebars and shells**
- In `JppSidebar.tsx`: Import `useTranslation(['jpp', 'nav', 'common'])` and replace hardcoded nav labels, header titles, section headers, and toasts with `t()`.
- In `KebajikanSidebar.tsx`: Update `navItem` calls to pass `t(key, fallback)` instead of raw string literals.
- In `KlkSidebar.tsx`: Import `useTranslation(['klk', 'nav', 'common'])` and wrap all nav item labels.
- In `PolyRentSidebar.tsx`: Import `useTranslation(['housing', 'common'])` and wrap modal and nav button labels.
- In `Sidebar.tsx`: Add `labelKey` and `t()` evaluation for `EMS_NAV` items, club selector text, and section headers.
- In `PortalSidebar.tsx`: Import `useTranslation(['portal', 'nav', 'common'])` and localize links, tutorial buttons, and role badges.
- In `BottomNav.tsx`: Import `useTranslation(['nav', 'portal', 'common'])` and wrap dock labels and quick action menu buttons.
- In `PortalNavbar.tsx`: Localize header navigation buttons.
- In `KebajikanSettingsPage.tsx`, `PolyMartLayout.tsx`, `AkademikLayout.tsx`, `JppStructureSettings.tsx`: Localize tabs and layout shell controls.
- Maintain 100% key parity across `nav.json`, `portal.json`, `settings.json`, and `common.json`.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npx vitest run src/__tests__/Domain0NavigationShellsI18n.test.tsx src/locales/__tests__/masterLocales.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/pages/jpp/JppSidebar.tsx src/pages/kebajikan/KebajikanSidebar.tsx src/pages/klk/KlkSidebar.tsx src/pages/polyrent/PolyRentSidebar.tsx src/components/layout/Sidebar.tsx src/components/layout/PortalSidebar.tsx src/components/layout/BottomNav.tsx src/components/portal/PortalNavbar.tsx src/pages/SettingsPage.tsx src/pages/kebajikan/KebajikanSettingsPage.tsx src/pages/polymart/PolyMartLayout.tsx src/pages/akademik/AkademikLayout.tsx src/pages/jpp/JppStructureSettings.tsx src/locales/en/nav.json src/locales/ms/nav.json src/locales/en/portal.json src/locales/ms/portal.json src/locales/en/settings.json src/locales/ms/settings.json src/__tests__/Domain0NavigationShellsI18n.test.tsx
git commit -m "feat(nav): deep-localize all sidebars, navigation docks, and global shells"
```

---

### Task 2: Domain 7 (PolyGig, PolyRider & Student Logistics + gig.json Namespace)

**Files:**
- Create: `src/locales/en/gig.json`
- Create: `src/locales/ms/gig.json`
- Modify: `src/i18n/config.ts` (register `gig` namespace)
- Modify: `src/pages/NexusPage.tsx`
- Modify: `src/pages/polyrider/admin/PolyRiderAdminDashboard.tsx`
- Modify: `src/pages/polyrider/PolyRiderHome.tsx`
- Modify: `src/pages/polyrider/PolyRiderDashboard.tsx`
- Modify: `src/pages/polytask/PolyTaskJobDetail.tsx`
- Modify: `src/pages/polytask/admin/PolyTaskAdmin.tsx`
- Modify: `src/components/polytask/CreateJobModal.tsx`
- Modify: `src/pages/polytask/PolyTaskBoard.tsx`
- Modify: `src/pages/polytask/PolyTaskMyJobs.tsx`
- Modify: `src/pages/polytask/PolyTaskDisputeModal.tsx`
- Test: `src/__tests__/Domain7PolyGigI18n.test.tsx`

**Interfaces:**
- Consumes: `useTranslation(['gig', 'common'])`
- Produces: Fully localized student gig economy ecosystem with 100% dictionary parity

- [ ] **Step 1: Write the failing test**
Create `src/__tests__/Domain7PolyGigI18n.test.tsx` verifying PolyTask jobs, PolyRider dispatch cards, and Nexus hub features render in English when language is `en`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/__tests__/Domain7PolyGigI18n.test.tsx`
Expected: FAIL because `gig` namespace is not registered and components have hardcoded Malay.

- [ ] **Step 3: Register `gig` namespace and implement localization**
- Create `src/locales/en/gig.json` and `src/locales/ms/gig.json` with matching keys for jobs, delivery orders, commissions, ratings, dispute forms, and fleet tracking.
- Register `gig` namespace in `src/i18n/config.ts` and `src/locales/__tests__/masterLocales.test.ts`.
- Localize `NexusPage.tsx`, `PolyRiderAdminDashboard.tsx`, `PolyRiderHome.tsx`, `PolyRiderDashboard.tsx`, `PolyTaskJobDetail.tsx`, `PolyTaskAdmin.tsx`, `CreateJobModal.tsx`, `PolyTaskBoard.tsx`, `PolyTaskMyJobs.tsx`, `PolyTaskDisputeModal.tsx` using `t('gig:...', 'Literal BM')`.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npx vitest run src/__tests__/Domain7PolyGigI18n.test.tsx src/locales/__tests__/masterLocales.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/locales/en/gig.json src/locales/ms/gig.json src/i18n/config.ts src/locales/__tests__/masterLocales.test.ts src/pages/NexusPage.tsx src/pages/polyrider/admin/PolyRiderAdminDashboard.tsx src/pages/polyrider/PolyRiderHome.tsx src/pages/polyrider/PolyRiderDashboard.tsx src/pages/polytask/PolyTaskJobDetail.tsx src/pages/polytask/admin/PolyTaskAdmin.tsx src/components/polytask/CreateJobModal.tsx src/pages/polytask/PolyTaskBoard.tsx src/pages/polytask/PolyTaskMyJobs.tsx src/pages/polytask/PolyTaskDisputeModal.tsx src/__tests__/Domain7PolyGigI18n.test.tsx
git commit -m "feat(gig): establish gig namespace and deep-localize PolyGig, PolyRider, and PolyTask"
```

---

### Task 3: Domain 3 (Exco Units: Kebajikan, Keusahawanan, Karnival)

**Files:**
- Modify: `src/pages/kebajikan/KebajikanFoodBankPage.tsx`
- Modify: `src/pages/keusahawanan/UrusPerniagaanPage.tsx`
- Modify: `src/pages/kebajikan/KebajikanTicketDetail.tsx`
- Modify: `src/pages/keusahawanan/KeusahawananAdminPanel.tsx`
- Modify: `src/pages/keusahawanan/KeusahawananProgram.tsx`
- Modify: `src/pages/kebajikan/KebajikanReportPage.tsx`
- Modify: `src/pages/kebajikan/KebajikanSubmitPage.tsx`
- Modify: `src/pages/keusahawanan/KeusahawananDashboard.tsx`
- Modify: `src/pages/keusahawanan/pos/PosProductPage.tsx`
- Modify: `src/pages/keusahawanan/pos/PosOrderPage.tsx`
- Modify: `src/pages/keusahawanan/BusinessShiftModule.tsx`
- Modify: `src/pages/karnival/` pages (`KarnivalLandingPage.tsx`, `KarnivalVotePage.tsx`, `KarnivalScoreboard.tsx`, `admin/` pages)
- Dictionaries: `src/locales/en/kebajikan.json`, `src/locales/ms/kebajikan.json`, `src/locales/en/keusahawanan.json`, `src/locales/ms/keusahawanan.json`, `src/locales/en/karnival.json`, `src/locales/ms/karnival.json`
- Test: `src/__tests__/Domain3ExcoCompleteI18n.test.tsx`

**Interfaces:**
- Consumes: `useTranslation(['kebajikan', 'keusahawanan', 'karnival', 'common'])`
- Produces: 100% localized Exco unit interfaces, POS checkout, cash drawers, and Karnival voting

- [ ] **Step 1: Write the failing test**
Create `src/__tests__/Domain3ExcoCompleteI18n.test.tsx` verifying ticket details, business shift reports, POS stock management, and Karnival booth voting in English.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/__tests__/Domain3ExcoCompleteI18n.test.tsx`
Expected: FAIL due to hardcoded strings.

- [ ] **Step 3: Implement deep localization across Exco modules**
- Localize all target files with `t('domain:key', 'Fallback BM')`.
- Add matching keys in `kebajikan.json`, `keusahawanan.json`, and `karnival.json` with 100% key parity.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npx vitest run src/__tests__/Domain3ExcoCompleteI18n.test.tsx src/locales/__tests__/masterLocales.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/pages/kebajikan/ src/pages/keusahawanan/ src/pages/karnival/ src/locales/en/kebajikan.json src/locales/ms/kebajikan.json src/locales/en/keusahawanan.json src/locales/ms/keusahawanan.json src/locales/en/karnival.json src/locales/ms/karnival.json src/__tests__/Domain3ExcoCompleteI18n.test.tsx
git commit -m "feat(exco): deep-localize Kebajikan tickets, Keusahawanan POS, and Karnival voting"
```

---

### Task 4: Domain 5 (Campus Services & Digital Commerce: PolyMart, PolyRent, PolyMaps)

**Files:**
- Modify: `src/pages/polymart/vendor/VendorOrdersPipeline.tsx`
- Modify: `src/pages/polymart/PolyMartMyOrders.tsx`
- Modify: `src/pages/polymart/PolyMartAdminPanel.tsx`
- Modify: `src/pages/polymart/PolyMartPaymentPage.tsx`
- Modify: `src/pages/polyrent/PolyRentForm.tsx`
- Modify: `src/pages/polymart/PolyMartProductDetail.tsx`
- Modify: `src/pages/polyrent/PolyRentPage.tsx`
- Modify: `src/pages/polymart/PolyMartVerifyPickup.tsx`
- Modify: `src/pages/polymart/vendor/VendorAnalyticsPromo.tsx`
- Modify: `src/pages/polymaps/PolyMapsPage.tsx`
- Dictionaries: `src/locales/en/commerce.json`, `src/locales/ms/commerce.json`, `src/locales/en/services.json`, `src/locales/ms/services.json`, `src/locales/en/housing.json`, `src/locales/ms/housing.json`
- Test: `src/__tests__/Domain5CommerceCompleteI18n.test.tsx`

**Interfaces:**
- Consumes: `useTranslation(['commerce', 'services', 'housing', 'common'])`
- Produces: Localized vendor pipeline, PolyMart order tracking, PolyRent listings, and PolyMaps campus directory

- [ ] **Step 1: Write the failing test**
Create `src/__tests__/Domain5CommerceCompleteI18n.test.tsx` verifying PolyMart cart checkout, order pickup slips, vendor analytics, and PolyRent housing cards render in English.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/__tests__/Domain5CommerceCompleteI18n.test.tsx`
Expected: FAIL due to hardcoded strings.

- [ ] **Step 3: Implement deep localization across Commerce & Campus Services**
- Localize target files using `t('commerce:...', 'Fallback BM')`, `t('services:...', 'Fallback BM')`, and `t('housing:...', 'Fallback BM')`.
- Add matching keys in `commerce.json`, `services.json`, and `housing.json` with 100% key parity.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npx vitest run src/__tests__/Domain5CommerceCompleteI18n.test.tsx src/locales/__tests__/masterLocales.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/pages/polymart/ src/pages/polyrent/ src/pages/polymaps/ src/locales/en/commerce.json src/locales/ms/commerce.json src/locales/en/services.json src/locales/ms/services.json src/locales/en/housing.json src/locales/ms/housing.json src/__tests__/Domain5CommerceCompleteI18n.test.tsx
git commit -m "feat(commerce): deep-localize PolyMart marketplace, PolyRent rentals, and PolyMaps"
```

---

### Task 5: Domain 2 (JPP HQ Administration & Portals)

**Files:**
- Modify: `src/pages/jpp/JppFoodBankAdmin.tsx`
- Modify: `src/pages/jpp/JppPolyMapsAdmin.tsx`
- Modify: `src/pages/jpp/units/KebajikanUnitDashboard.tsx`
- Modify: `src/pages/jpp/units/KkUnitDashboard.tsx`
- Modify: `src/pages/jpp/JppAsramaPage.tsx`
- Modify: `src/pages/jpp/JppTakwimPage.tsx`
- Modify: `src/pages/jpp/JppMembersPage.tsx`
- Modify: `src/pages/jpp/PolyServicesAdmin.tsx`
- Modify: `src/pages/jpp/JppOverviewPage.tsx`
- Modify: `src/pages/jpp/AnnouncementsPage.tsx`
- Modify: `src/pages/jpp/JppUsersPage.tsx`
- Modify: `src/pages/jpp/JppLogsPage.tsx`
- Dictionaries: `src/locales/en/jpp.json`, `src/locales/ms/jpp.json`, `src/locales/en/common.json`, `src/locales/ms/common.json`
- Test: `src/__tests__/Domain2JppAdminCompleteI18n.test.tsx`

**Interfaces:**
- Consumes: `useTranslation(['jpp', 'common'])`
- Produces: 100% localized JPP HQ admin portal, Food Bank counter, Takwim manager, and Unit dashboards

- [ ] **Step 1: Write the failing test**
Create `src/__tests__/Domain2JppAdminCompleteI18n.test.tsx` verifying JPP HQ unit dashboards, audit logs, Takwim scheduler, and member rosters in English.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/__tests__/Domain2JppAdminCompleteI18n.test.tsx`
Expected: FAIL due to hardcoded strings.

- [ ] **Step 3: Implement deep localization across JPP HQ administration**
- Localize all target files with `t('jpp:key', 'Fallback BM')`.
- Add matching keys in `jpp.json` with 100% key parity.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npx vitest run src/__tests__/Domain2JppAdminCompleteI18n.test.tsx src/locales/__tests__/masterLocales.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/pages/jpp/ src/locales/en/jpp.json src/locales/ms/jpp.json src/__tests__/Domain2JppAdminCompleteI18n.test.tsx
git commit -m "feat(jpp): deep-localize JPP HQ administration, unit dashboards, and Takwim"
```

---

### Task 6: Domain 6 (Academics, Housing & Sports: Akademik, KLK, SUPSAS)

**Files:**
- Modify: `src/pages/klk/KlkDashboard.tsx`
- Modify: `src/pages/supsas/ketua/KetuaDashboard.tsx`
- Modify: `src/pages/akademik/AkademikPencapaian.tsx`
- Modify: `src/pages/klk/KlkResidencyFormPage.tsx`
- Modify: `src/pages/akademik/AkademikCgpa.tsx`
- Modify: `src/components/klk/KlkResidencyModal.tsx`
- Modify: `src/pages/supsas/SupsasScorekeeperPage.tsx`
- Modify: `src/pages/supsas/admin/AdminJadualPage.tsx`
- Modify: `src/pages/supsas/admin/SupsasAdminHome.tsx`
- Modify: `src/pages/supsas/admin/AdminSukanPage.tsx`
- Dictionaries: `src/locales/en/akademik.json`, `src/locales/ms/akademik.json`, `src/locales/en/housing.json`, `src/locales/ms/housing.json`, `src/locales/en/supsas.json`, `src/locales/ms/supsas.json`
- Test: `src/__tests__/Domain6CampusLifeCompleteI18n.test.tsx`

**Interfaces:**
- Consumes: `useTranslation(['akademik', 'housing', 'supsas', 'common'])`
- Produces: Localized academic GPA calculator, off-campus housing registration, and SUPSAS sports tournament manager

- [ ] **Step 1: Write the failing test**
Create `src/__tests__/Domain6CampusLifeCompleteI18n.test.tsx` verifying KLK off-campus residency forms, SUPSAS scorekeeper interface, and Akademik CGPA tools render in English.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/__tests__/Domain6CampusLifeCompleteI18n.test.tsx`
Expected: FAIL due to hardcoded strings.

- [ ] **Step 3: Implement deep localization across Academics, Housing & Sports**
- Localize target files using `t('akademik:...', 'Fallback BM')`, `t('housing:...', 'Fallback BM')`, and `t('supsas:...', 'Fallback BM')`.
- Add matching keys in `akademik.json`, `housing.json`, and `supsas.json` with 100% key parity.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npx vitest run src/__tests__/Domain6CampusLifeCompleteI18n.test.tsx src/locales/__tests__/masterLocales.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/pages/akademik/ src/pages/klk/ src/pages/supsas/ src/components/klk/ src/locales/en/akademik.json src/locales/ms/akademik.json src/locales/en/housing.json src/locales/ms/housing.json src/locales/en/supsas.json src/locales/ms/supsas.json src/__tests__/Domain6CampusLifeCompleteI18n.test.tsx
git commit -m "feat(campus): deep-localize Akademik CGPA, KLK off-campus housing, and SUPSAS sports"
```

---

### Task 7: Domain 4 (Events & Honors: EMS & MAKMP)

**Files:**
- Modify: `src/pages/ems/EmsCheckinPage.tsx`
- Modify: `src/pages/ems/EmsEventFormPage.tsx`
- Modify: `src/pages/ems/EmsPublicRegisterPage.tsx`
- Modify: `src/pages/ems/EmsLeaderboardPage.tsx`
- Modify: `src/pages/makmp/MakmpPublicFormPage.tsx`
- Modify: `src/pages/ems/EmsApprovalPage.tsx`
- Modify: `src/pages/ems/EmsAudienceScanPage.tsx`
- Modify: `src/components/ems/modals/EmsManualRegModal.tsx`
- Modify: `src/components/ems/modals/EmsJuryCodeModal.tsx`
- Modify: `src/pages/makmp/MakmpStatusTrackingPage.tsx`
- Dictionaries: `src/locales/en/ems.json`, `src/locales/ms/ems.json`, `src/locales/en/makmp.json`, `src/locales/ms/makmp.json`
- Test: `src/__tests__/Domain4EmsMakmpCompleteI18n.test.tsx`

**Interfaces:**
- Consumes: `useTranslation(['ems', 'makmp', 'common'])`
- Produces: 100% localized EMS check-in scanner, audience pass, jury evaluation matrix, and MAKMP merit nomination forms

- [ ] **Step 1: Write the failing test**
Create `src/__tests__/Domain4EmsMakmpCompleteI18n.test.tsx` verifying EMS approval queues, audience scan pages, and MAKMP status tracking in English.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/__tests__/Domain4EmsMakmpCompleteI18n.test.tsx`
Expected: FAIL due to hardcoded strings.

- [ ] **Step 3: Implement deep localization across EMS & MAKMP**
- Localize target files using `t('ems:...', 'Fallback BM')` and `t('makmp:...', 'Fallback BM')`.
- Add matching keys in `ems.json` and `makmp.json` with 100% key parity.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npx vitest run src/__tests__/Domain4EmsMakmpCompleteI18n.test.tsx src/locales/__tests__/masterLocales.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/pages/ems/ src/pages/makmp/ src/components/ems/ src/locales/en/ems.json src/locales/ms/ems.json src/locales/en/makmp.json src/locales/ms/makmp.json src/__tests__/Domain4EmsMakmpCompleteI18n.test.tsx
git commit -m "feat(events): deep-localize EMS event operations and MAKMP awards system"
```

---

### Task 8: Domain 1 & Domain 8 (Student Hub, Standalone Pages & Shared Modals)

**Files:**
- Modify: `src/pages/AktivitiFull.tsx`
- Modify: `src/components/exco/ExcoAktivitiPage.tsx`
- Modify: `src/pages/SemakanLaporanPage.tsx`
- Modify: `src/components/exco/ExcoSemakanLaporanPage.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/AhliPage.tsx`
- Modify: `src/pages/KelabPage.tsx`
- Modify: `src/pages/CarianPage.tsx`
- Modify: `src/pages/ClubDetailPage.tsx`
- Modify: `src/pages/ProgramAttendPage.tsx`
- Modify: `src/pages/LaunchVideo.tsx`
- Modify: `src/components/ai/AIBudgetGenerator.tsx`
- Modify: `src/components/tasks/AddTaskModal.tsx`
- Modify: `src/components/takwim/TimetableUploadModal.tsx`
- Modify: `src/components/takwim/TimetablePreviewModal.tsx`
- Modify: `src/components/ai/KertasKerjaRenderer.tsx` (surrounding UI controls)
- Dictionaries: `src/locales/en/kpp.json`, `src/locales/ms/kpp.json`, `src/locales/en/portal.json`, `src/locales/ms/portal.json`, `src/locales/en/common.json`, `src/locales/ms/common.json`
- Test: `src/__tests__/Domain1And8SharedCompleteI18n.test.tsx`

**Interfaces:**
- Consumes: `useTranslation(['kpp', 'portal', 'common'])`
- Produces: 100% localized e-KPP club reports, student activity hub, AI budget assistant, and timetable preview dialogs

- [ ] **Step 1: Write the failing test**
Create `src/__tests__/Domain1And8SharedCompleteI18n.test.tsx` verifying club detail pages, AI budget wizard, and timetable modals render in English.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/__tests__/Domain1And8SharedCompleteI18n.test.tsx`
Expected: FAIL due to hardcoded strings.

- [ ] **Step 3: Implement deep localization across Student Hub and Shared Utilities**
- Localize all target files with `t('kpp:...', 'Fallback BM')` and `t('portal:...', 'Fallback BM')`.
- Add matching keys in `kpp.json`, `portal.json`, and `common.json` with 100% key parity.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npx vitest run src/__tests__/Domain1And8SharedCompleteI18n.test.tsx src/locales/__tests__/masterLocales.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/pages/AktivitiFull.tsx src/components/exco/ src/pages/SemakanLaporanPage.tsx src/pages/DashboardPage.tsx src/pages/AhliPage.tsx src/pages/KelabPage.tsx src/pages/CarianPage.tsx src/pages/ClubDetailPage.tsx src/pages/ProgramAttendPage.tsx src/pages/LaunchVideo.tsx src/components/ai/ src/components/tasks/ src/components/takwim/ src/locales/en/kpp.json src/locales/ms/kpp.json src/locales/en/portal.json src/locales/ms/portal.json src/__tests__/Domain1And8SharedCompleteI18n.test.tsx
git commit -m "feat(hub): deep-localize Student Hub, club details, and shared utility modals"
```

---

### Task 9: Verification Gate, Regression Audit Loop & Documentation

**Files:**
- Modify: `DEV_GUIDELINE.md`
- Verify: All 18 namespaces in `src/locales/en/*.json` and `src/locales/ms/*.json`
- Verify: `scratch/run_deep_codebase_audit.cjs` (0 untranslated strings remaining in UI elements)

**Interfaces:**
- Consumes: All 18 dictionary namespaces and all test suites
- Produces: Automated verification passes, documentation updates, and remote push

- [ ] **Step 1: Run dictionary parity gate**
Run: `npx vitest run src/locales/__tests__/masterLocales.test.ts`
Expected: PASS (all 18 namespaces 100% synchronized, 0 missing keys, 0 empty strings).

- [ ] **Step 2: Run full regression test suite**
Run: `npx vitest run`
Expected: PASS (all 69+ test suites and 820+ unit tests passing with 0 failures).

- [ ] **Step 3: Run automated codebase deep audit scan**
Run: `node scratch/run_deep_codebase_audit.cjs`
Expected: All UI elements verified localized (0 untranslated strings remaining).

- [ ] **Step 4: Run length check on dictionaries to ensure no overtranslations**
Run: `node scratch/check_lengths.cjs`
Expected: All keys pass concise copy standards.

- [ ] **Step 5: Update documentation in DEV_GUIDELINE.md**
Update Section 16 & Section 36 in `DEV_GUIDELINE.md` documenting:
- The new `gig.json` namespace.
- Dynamic sidebar and object array localization rules.
- Mandatory Malay fallback standard: `t('namespace:key', 'Fallback BM')`.
- Zero-database-impact audit guarantees.

- [ ] **Step 6: Commit and push**
```bash
git add DEV_GUIDELINE.md
git commit -m "docs(i18n): update DEV_GUIDELINE.md with complete 9-domain localization standards"
git push origin feat/ems-redesign-revamp
```
