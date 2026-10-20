# Comprehensive Codebase Localization & Sidebar Deep Audit Design

**Topic:** Full Repository Localization & Sidebar Deep Audit  
**Target:** 260 files across 9 domains with 1,995 untranslated strings  
**Date:** 2026-10-20  
**Status:** Approved by User  

---

## 1. Executive Summary & Empirical Problem Diagnosis

A comprehensive deep scan was executed across all 382 `.tsx` files in the repository (`src/pages/`, `src/components/`, `src/layouts/`). The scan revealed that **260 files** contain a total of **1,995 hardcoded Malay strings** (in JSX text, navigation arrays, toasters, and form placeholders).

### Technical Root Cause of Previous Gaps
1. **Object Array Navigation Pattern**:
   Navigation components (sidebars, bottom docks, admin menus) store navigation targets in JavaScript objects:
   ```tsx
   const EKPP_NAV = [{ icon: Users, label: 'Ahli JPP', href: '/jpp/members' }];
   // or
   navItem('/kebajikan', HeartHandshake, 'Hab Kebajikan');
   ```
   Previous AST regex scans searched exclusively for raw text between JSX delimiters (`>Malay Text<`). As a result, all JavaScript object array labels were completely bypassed.
2. **Untouched Sub-Modules (Zero `useTranslation` Calls)**:
   Several entire modules had never imported `useTranslation`:
   - `src/pages/jpp/JppSidebar.tsx` (756 lines, pure hardcoded Malay)
   - `src/pages/klk/KlkSidebar.tsx` (196 lines, pure hardcoded Malay)
   - `src/pages/polyrent/PolyRentSidebar.tsx` (104 lines, pure hardcoded Malay)
   - `src/components/layout/PortalSidebar.tsx` (250 lines, pure hardcoded Malay)
   - `src/components/layout/BottomNav.tsx` (375 lines, pure hardcoded Malay)
   - PolyGig & PolyRider modules (`NexusPage.tsx`, `PolyRiderAdminDashboard.tsx`, `PolyTaskJobDetail.tsx`, etc.)
   - PolyMart modules (`PolyMartMyOrders.tsx`, `PolyMartPaymentPage.tsx`, `PolyMartAdminPanel.tsx`)
   - Unit dashboards & Exco sub-pages (`KebajikanUnitDashboard.tsx`, `KkUnitDashboard.tsx`, `KeusahawananAdminPanel.tsx`, `KetuaDashboard.tsx`, `SupsasScorekeeperPage.tsx`)

---

## 2. Empirical Scope by Domain

| Domain | Files | Untranslated Strings | Key Critical Files |
|---|---|---|---|
| **Domain 0: Global Shell, Navigation & Auth** | 26 | 155 | `JppSidebar.tsx`, `Sidebar.tsx`, `PortalSidebar.tsx`, `BottomNav.tsx`, `SettingsPage.tsx`, `KebajikanSettingsPage.tsx` |
| **Domain 1: Student Hub & e-KPP** | 18 | 210 | `AktivitiFull.tsx`, `ExcoAktivitiPage.tsx`, `MakmpAdminDashboardPage.tsx`, `SemakanLaporanPage.tsx` |
| **Domain 2: JPP HQ Administration & Portals** | 30 | 397 | `JppFoodBankAdmin.tsx`, `JppPolyMapsAdmin.tsx`, `KebajikanUnitDashboard.tsx`, `KkUnitDashboard.tsx`, `JppAsramaPage.tsx` |
| **Domain 3: Exco Units (Keusahawanan, Kebajikan, Karnival)** | 40 | 347 | `KebajikanFoodBankPage.tsx`, `UrusPerniagaanPage.tsx`, `KebajikanTicketDetail.tsx`, `KeusahawananAdminPanel.tsx` |
| **Domain 4: Events & Honors (EMS & MAKMP)** | 21 | 162 | `EmsCheckinPage.tsx`, `EmsEventFormPage.tsx`, `EmsPublicRegisterPage.tsx`, `MakmpPublicFormPage.tsx`, `EmsApprovalPage.tsx` |
| **Domain 5: Campus Services & Digital Commerce** | 23 | 229 | `VendorOrdersPipeline.tsx`, `PolyMartMyOrders.tsx`, `PolyMartPaymentPage.tsx`, `PolyRentForm.tsx`, `PolyRentSidebar.tsx` |
| **Domain 6: Academics, Housing & Sports** | 33 | 243 | `KlkSidebar.tsx`, `KlkDashboard.tsx`, `KetuaDashboard.tsx`, `AkademikPencapaian.tsx`, `SupsasScorekeeperPage.tsx` |
| **Domain 7: PolyGig, PolyRider & Student Logistics** | 17 | 203 | `NexusPage.tsx`, `PolyRiderAdminDashboard.tsx`, `PolyRiderHome.tsx`, `PolyTaskJobDetail.tsx`, `PolyRiderDashboard.tsx` |
| **Domain 8: Shared Utilities, Modals & AI Tools** | 56 | 252 | `KertasKerjaRenderer.tsx` (UI controls), `AIBudgetGenerator.tsx`, `AddTaskModal.tsx`, `TimetablePreviewModal.tsx` |
| **Total** | **260** | **1,995** | Full Codebase Sweep |

---

## 3. Architecture & Non-Negotiable Standards

1. **Zero Database Alterations**:
   - Strictly NO database migrations or schema alterations.
   - The system is in active use for 1,500 concurrent users; all changes are strictly frontend UI localization.
2. **Preserved Supabase Singleton**:
   - `src/lib/supabase.ts` is never modified or duplicated.
3. **Mandatory Malay Fallback Parameter**:
   - Every `t()` call MUST supply the original literal Malay string as the fallback second parameter:
     ```tsx
     t('nav:dashboard', 'Laman Utama')
     t('jpp:members_title', 'Senarai Ahli JPP')
     ```
   - This prevents hydration mismatches, ensures AST testing stability, and provides zero-downtime resilience.
4. **100% Dictionary Key Parity Across EN and MS**:
   - Every key in `src/locales/en/*.json` must exist identically in `src/locales/ms/*.json`.
   - No empty string values (`""`) or missing keys.
   - All 18 namespaces verified by `masterLocales.test.ts`.
5. **Concise English UI Copy**:
   - English translations must match the visual weight and brevity of the Malay original.
   - Strict ban on verbose explanatory clauses, redundant slashes (`/`), and parentheticals.
6. **New Dedicated Namespace for PolyGig & PolyRider**:
   - Introduce `src/locales/en/gig.json` and `src/locales/ms/gig.json` for all PolyGig, PolyRider, and PolyTask interactions.
7. **Administrative Document Integrity Rule**:
   - Official generated institutional documents (PDF exports for HEP, Surat Pengesahan, Kertas Kerja) MUST remain in official Bahasa Melayu.
   - All surrounding Web UI controls (buttons, preview dialogs, export triggers, error toasts) are 100% bilingual.

---

## 4. Phased Implementation Plan (9 Phases)

### Phase 1: Global Shells, Navigation & Sidebars (Domain 0)
- **Files**:
  - `src/pages/jpp/JppSidebar.tsx`
  - `src/pages/kebajikan/KebajikanSidebar.tsx`
  - `src/pages/klk/KlkSidebar.tsx`
  - `src/pages/polyrent/PolyRentSidebar.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/PortalSidebar.tsx`
  - `src/components/layout/BottomNav.tsx`
  - `src/components/portal/PortalNavbar.tsx`
  - Residual shell settings: `SettingsPage.tsx`, `KebajikanSettingsPage.tsx`, `PolyMartLayout.tsx`, `AkademikLayout.tsx`, `JppStructureSettings.tsx`
- **Namespaces**: `nav.json`, `portal.json`, `settings.json`, `auth.json`, `common.json`.

### Phase 2: PolyGig, PolyRider & Student Logistics (Domain 7)
- **Files**:
  - `src/pages/NexusPage.tsx`
  - `src/pages/polyrider/admin/PolyRiderAdminDashboard.tsx`
  - `src/pages/polyrider/PolyRiderHome.tsx`
  - `src/pages/polyrider/PolyRiderDashboard.tsx`
  - `src/pages/polytask/PolyTaskJobDetail.tsx`
  - `src/pages/polytask/admin/PolyTaskAdmin.tsx`
  - `src/components/polytask/CreateJobModal.tsx`
  - `src/pages/polytask/PolyTaskBoard.tsx`, `PolyTaskMyJobs.tsx`, `PolyTaskDisputeModal.tsx`
- **Namespaces**: Create `gig.json` (`en/gig.json` and `ms/gig.json`), `common.json`.

### Phase 3: Exco Units & Portals (Domain 3)
- **Files**:
  - `src/pages/kebajikan/KebajikanFoodBankPage.tsx`
  - `src/pages/keusahawanan/UrusPerniagaanPage.tsx`
  - `src/pages/kebajikan/KebajikanTicketDetail.tsx`
  - `src/pages/keusahawanan/KeusahawananAdminPanel.tsx`
  - `src/pages/keusahawanan/KeusahawananProgram.tsx`
  - `src/pages/kebajikan/KebajikanReportPage.tsx`
  - `src/pages/kebajikan/KebajikanSubmitPage.tsx`
  - `src/pages/keusahawanan/KeusahawananDashboard.tsx`
  - `src/pages/keusahawanan/pos/PosProductPage.tsx`, `PosOrderHistoryPage.tsx`
  - `src/pages/keusahawanan/BusinessShiftModule.tsx`
- **Namespaces**: `kebajikan.json`, `keusahawanan.json`, `karnival.json`.

### Phase 4: Digital Commerce & Campus Services (Domain 5)
- **Files**:
  - `src/pages/polymart/vendor/VendorOrdersPipeline.tsx`
  - `src/pages/polymart/PolyMartMyOrders.tsx`
  - `src/pages/polymart/PolyMartAdminPanel.tsx`
  - `src/pages/polymart/PolyMartPaymentPage.tsx`
  - `src/pages/polyrent/PolyRentForm.tsx`
  - `src/pages/polymart/PolyMartProductDetail.tsx`
  - `src/pages/polyrent/PolyRentPage.tsx`
  - `src/pages/polymart/PolyMartVerifyPickup.tsx`
  - `src/pages/polymart/vendor/VendorAnalyticsPromo.tsx`
  - `src/pages/polymaps/PolyMapsPage.tsx`
- **Namespaces**: `commerce.json`, `services.json`, `housing.json`.

### Phase 5: JPP HQ Administration & Portals (Domain 2)
- **Files**:
  - `src/pages/jpp/JppFoodBankAdmin.tsx`
  - `src/pages/jpp/JppPolyMapsAdmin.tsx`
  - `src/pages/jpp/units/KebajikanUnitDashboard.tsx`
  - `src/pages/jpp/units/KkUnitDashboard.tsx`
  - `src/pages/jpp/JppAsramaPage.tsx`
  - `src/pages/jpp/JppTakwimPage.tsx`
  - `src/pages/jpp/JppMembersPage.tsx`
  - `src/pages/jpp/PolyServicesAdmin.tsx`
  - `src/pages/jpp/JppOverviewPage.tsx`
  - `src/pages/jpp/AnnouncementsPage.tsx`
  - `src/pages/jpp/JppUsersPage.tsx`, `src/pages/jpp/JppLogsPage.tsx`
- **Namespaces**: `jpp.json`, `common.json`.

### Phase 6: Academics, Housing & Sports (Domain 6)
- **Files**:
  - `src/pages/klk/KlkDashboard.tsx`
  - `src/pages/supsas/ketua/KetuaDashboard.tsx`
  - `src/pages/akademik/AkademikPencapaian.tsx`
  - `src/pages/klk/KlkResidencyFormPage.tsx`
  - `src/pages/akademik/AkademikCgpa.tsx`
  - `src/components/klk/KlkResidencyModal.tsx`
  - `src/pages/supsas/SupsasScorekeeperPage.tsx`
  - `src/pages/supsas/admin/AdminJadualPage.tsx`
  - `src/pages/supsas/admin/SupsasAdminHome.tsx`
  - `src/pages/supsas/admin/AdminSukanPage.tsx`
- **Namespaces**: `akademik.json`, `housing.json`, `supsas.json`.

### Phase 7: Events & Honors (Domain 4: EMS & MAKMP)
- **Files**:
  - `src/pages/ems/EmsCheckinPage.tsx`
  - `src/pages/ems/EmsEventFormPage.tsx`
  - `src/pages/ems/EmsPublicRegisterPage.tsx`
  - `src/pages/ems/EmsLeaderboardPage.tsx`
  - `src/pages/makmp/MakmpPublicFormPage.tsx`
  - `src/pages/ems/EmsApprovalPage.tsx`
  - `src/pages/ems/EmsAudienceScanPage.tsx`
  - `src/components/ems/modals/EmsManualRegModal.tsx`
  - `src/components/ems/modals/EmsJuryCodeModal.tsx`
  - `src/pages/makmp/MakmpStatusTrackingPage.tsx`
- **Namespaces**: `ems.json`, `makmp.json`.

### Phase 8: Student Hub & Shared Utilities (Domain 1 & Domain 8)
- **Files**:
  - `src/pages/AktivitiFull.tsx`, `ExcoAktivitiPage.tsx`, `SemakanLaporanPage.tsx`, `ExcoSemakanLaporanPage.tsx`, `DashboardPage.tsx`, `KarnivalLandingPage.tsx`
  - Shared Modals & AI UI: `AIBudgetGenerator.tsx`, `AddTaskModal.tsx`, `TimetableUploadModal.tsx`, `TimetablePreviewModal.tsx`, `ProgramAttendPage.tsx`, `KertasKerjaRenderer.tsx` (UI controls)
- **Namespaces**: `kpp.json`, `portal.json`, `common.json`.

### Phase 9: Verification Gate & Documentation
- **Automated Checks**:
  1. `masterLocales.test.ts` (100% dictionary parity across 18 namespaces, including `gig.json`).
  2. Full Vitest test suite (all 820+ unit tests passing with zero regressions).
  3. `scratch/run_deep_codebase_audit.cjs` confirming untranslated strings reduced to 0 in UI elements.
  4. Documentation update in `DEV_GUIDELINE.md` reflecting the new `gig.json` namespace, sidebar localization architecture, and audit standards.
