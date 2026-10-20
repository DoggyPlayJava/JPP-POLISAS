# Task 6 Report: Domain 6 (Academics, KLK Off-Campus Housing, & SUPSAS Sports) Deep Row-by-Row Localization

## 1. Executive Summary
- **Task ID:** Task 6
- **Domain:** Domain 6 — Campus Life (Academics, KLK Off-Campus Housing, & SUPSAS Sports)
- **Status:** `DONE`
- **Total Test Suites Passing:** 2 test suites, 36/36 tests passing (100% green).
- **Target Files Localized:** 10 target files (+ 2 sub-components):
  1. `src/pages/akademik/AkademikCgpa.tsx`
  2. `src/pages/akademik/AkademikPencapaian.tsx`
  3. `src/pages/klk/KlkDashboard.tsx`
  4. `src/pages/klk/KlkResidencyFormPage.tsx`
  5. `src/components/klk/KlkResidencyModal.tsx`
  6. `src/pages/supsas/ketua/KetuaDashboard.tsx`
  7. `src/pages/supsas/SupsasScorekeeperPage.tsx`
  8. `src/pages/supsas/admin/AdminJadualPage.tsx` (+ `AdminMatchScoreModal.tsx`)
  9. `src/pages/supsas/admin/SupsasAdminHome.tsx`
  10. `src/pages/supsas/admin/AdminSukanPage.tsx` (+ `AdminBracketPanel.tsx`)

The deep row-by-row localization for Domain 6 has been completed with zero database mutations, strict preservation of the global Supabase singleton, 100% dictionary key parity across `akademik.json`, `housing.json`, and `supsas.json`, elimination of variable shadowing on `t`, sub-component hook scoping, and AST fallback syntax `t('namespace:key', 'Literal BM Asal')`.

---

## 2. Target Files Modified & Localized

### A. Akademik Module
1. `src/pages/akademik/AkademikCgpa.tsx`:
   - Localized GPA & CGPA forecasting hero, academic records badge (`records_badge`), transcript upload header & dropzone labels (`upload_slip_title`, `upload_slip_desc`), semester dropdowns, target CGPA simulator, honor band ratings (`grade_excellent`, `grade_honours`, `grade_pass`, `grade_fail`), HPNM/PNM trend visualizers, and manual deletion/add modals.
   - Refactored `gradeInfo(val, t)` to accept translation function, ensuring grade category labels adapt dynamically to language state.

2. `src/pages/akademik/AkademikPencapaian.tsx`:
   - Scoped `useTranslation(['akademik', 'common'])` inside `TambahForm`.
   - Localized page header (`pencapaian_title`, `pencapaian_subtitle`), category filters (All, Anugerah, Sijil, Pertandingan), verification badges (Disahkan, Menunggu Pengesahan), merit pill calculations, record unlock request dialogs, and submission toasts.

### B. KLK (Kediaman Luar Kampus) Module
3. `src/pages/klk/KlkDashboard.tsx`:
   - Scoped `useTranslation(['housing', 'common'])` inside `EditRecordModal`.
   - Localized off-campus residential header (`klk_title`), academic year filters, search input placeholders (`search_placeholder`), residential area distribution chips, interactive coordinate map cards, student occupancy tables, exco suggestion cards, and XLSX report exports.
   - Preserved RBAC access controls (`hasAccess = isSuperAdmin || isKlsExco`).

4. `src/pages/klk/KlkResidencyFormPage.tsx`:
   - Localized multi-step flow: Location Choice Step (`where_do_you_live`, `in_kamsis`, `off_campus`, `stay_hostel`), Hostel Notice Step, and Detailed Rental Declaration Step.
   - Localized rental forms: landlord information, monthly rental fee, utility bill verification notice, housemate roster, welfare protection agreement, and completion screen.

5. `src/components/klk/KlkResidencyModal.tsx`:
   - Added `useTranslation(['housing', 'common'])`.
   - Added `{ forceShow = false }: KlkResidencyModalProps = {}` to enable deterministic SSR test execution without timing out on async client-side storage queries.
   - Localized choice prompts, residency collection notice, hostel confirmation, and off-campus declaration redirects.

### C. SUPSAS Sports Module
6. `src/pages/supsas/ketua/KetuaDashboard.tsx`:
   - Scoped `useTranslation(['supsas', 'common'])` inside `TeamCard`, `AddPlayerModal`, and `KetuaDashboard`.
   - Fixed variable shadowing: renamed `const t = setTimeout(...)` to `timer`, and `myTeams.map(t => ...)` to `tm => ...`.
   - Localized contingent secretariat header (`module_title`), stats cards (`stat_participating_sports`, `stat_total_teams`, `stat_total_athletes`), sport selector tabs, team cards with quota badges, and athlete registration search modal.

7. `src/pages/supsas/SupsasScorekeeperPage.tsx`:
   - Added `useTranslation(['supsas', 'common'])`.
   - Localized 4-digit referee PIN entry terminal (`referee_portal_title`, `referee_portal_subtitle`, `referee_pin_placeholder`, `btn_enter_referee`), Sun-Glare field visibility toggle (`sun_glare_mode`), offline local cache status badges (`online_stable`, `offline_local`), match timer with drift prevention, touch increment buttons (`-1 Mata`, `+1`, `+2`, `+3`), set management tabs (`sets_management`, `set_number`), and official match conclusion dialogs.
   - Localized match event recorder modal (`field_event_record_title`, `event_goal`, `event_yellow_card`, `event_red_card`, `event_foul`, `event_note`, `player_jersey_placeholder`, `btn_save_event`).

8. `src/pages/supsas/admin/AdminJadualPage.tsx` & `AdminMatchScoreModal.tsx`:
   - Added `useTranslation(['supsas', 'common'])` to both components.
   - In `AdminJadualPage`: localized fixture list grouped by date, WhatsApp formatted PIN copy button (`copy_pin_whatsapp`), sport filter buttons (`all_sports`), empty schedule warnings (`no_matches_scheduled`), and full fixture creation/edit modal.
   - In `AdminMatchScoreModal`: localized quick score update modal (`update_score_title`), auto-winner determination, referee PIN copy badge, status toggle options, and extra-time notes.

9. `src/pages/supsas/admin/SupsasAdminHome.tsx`:
   - Added `useTranslation(['supsas', 'common'])`.
   - Localized admin control header (`admin_panel_badge`), live tournament indicator (`event_in_progress`), print PDF export report (`export_pdf_btn`), stat cards (Contingents, Active Sports, Live Matches, Medals), quick action cards with live alerts (`quick_actions`), temporary championship leader banner (`temporary_leader`), and unconfigured edition alert (`no_active_edition`, `setup_edition_btn`).

10. `src/pages/supsas/admin/AdminSukanPage.tsx` & `AdminBracketPanel.tsx`:
    - In `AdminSukanPage`: localized sport configuration table, discipline formats, category selectors, gender selectors, active/inactive toggles, phase advancement triggers ("Jana Suku Akhir dari Kumpulan", "Jana Separuh Akhir", "Jana Akhir"), and two-step reset bracket confirmation modals.
    - In `AdminBracketPanel`: added `useTranslation(['supsas', 'common'])` and scoped translation inside `GroupColumn`. Localized live draw modal (`draw_groups_title`, `live_draw_broadcast_hint`, `start_live_draw`, `draw_in_progress`, `confirm_generate_bracket`, `redraw`, `draw_random_hint`).
    - Fixed variable shadowing: renamed `const t = setTimeout(...)` inside `broadcastDraw` and `handleStartDraw` to `const timerId = setTimeout(...)` to guarantee `t()` functions without name collisions.

---

## 3. Translation Dictionaries & Parity Statistics

| Namespace | Total Keys | Key Parity | Missing in EN | Missing in MS | Empty Values |
|---|---|---|---|---|---|
| `akademik.json` | **204** | 100% | 0 | 0 | 0 |
| `housing.json` | **322** | 100% | 0 | 0 | 0 |
| `supsas.json` | **229** | 100% | 0 | 0 | 0 |

- Verification: Confirmed with 100% pass rate in `src/locales/__tests__/masterLocales.test.ts`.

---

## 4. Test Suite Execution & Verification

### Test 1: Complete Domain 6 Suite
```bash
npx vitest run src/__tests__/Domain6CampusLifeCompleteI18n.test.tsx
```
**Result:**
- 16/16 tests passed (100% green)
- Test breakdown:
  - Section 1: 100% Dictionary Key Parity and Zero Empty Values across `akademik`, `housing`, and `supsas` (4 tests)
  - Section 2: Akademik Module English & Malay DOM Renders with actual string assertions (3 tests)
  - Section 3: KLK Housing Module English & Malay DOM Renders with actual string assertions (3 tests)
  - Section 4: SUPSAS Sports Module English & Malay DOM Renders with actual string assertions (5 tests)
  - Section 5: Realtime Dynamic Language Switching Round-Trip Verification (1 test)

### Test 2: Master Locales Test
```bash
npx vitest run src/locales/__tests__/masterLocales.test.ts
```
**Result:**
- 20/20 tests passed (100% across all namespaces in the project)

---

## 5. Documentation Update
- Updated `DEV_GUIDELINE.md` with **Subsection 36.15: Penyetempatan Menyeluruh Domain 6 (Campus Life: Academics, Off-Campus Housing & SUPSAS Sports)**.
- Documented all 10 localized files, sub-component scoping patterns, variable shadowing prevention guidelines, SSR testability props, and test results.
