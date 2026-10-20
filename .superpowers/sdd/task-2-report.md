# Task 2 Report: Concise Institutional Subtitles Across Locales & Sidebar Layouts

## Overview
Replaced verbose 15-word comma-separated descriptions for `module_subtitle` in all 7 unit modules across both English (`en`) and Bahasa Melayu (`ms`) locales with punchy, 2-4 word institutional taglines. Balanced typography and tracking in `KeusahawananLayout.tsx` and `KebajikanSidebar.tsx` to eliminate unsightly 3-4 line text wrapping under sidebar headers.

## Changes Implemented

### 1. Locale Dictionaries (`src/locales/en/` & `src/locales/ms/`)
Updated `module_subtitle` for all 7 unit modules:
- **Keusahawanan (`keusahawanan.json`)**:
  - `en`: `"Student Business & POS"` (was `"Point of Sale (POS), inventory stock tracking, and student business onboarding."`)
  - `ms`: `"Perniagaan Pelajar & POS"` (was `"Terminal Titik Jualan (POS), pemantauan stok inventori, dan onboarding perniagaan pelajar."`)
- **Kebajikan (`kebajikan.json`)**:
  - `en`: `"Welfare & Student Support"` (was `"Student ticketing system, cafeteria audits, food bank access, and emergency welfare."`)
  - `ms`: `"Kebajikan & Bantuan Mahasiswa"` (was `"Sistem tiket pelajar, audit kafeteria, bantuan food bank, dan kebajikan kecemasan."`)
- **Akademik (`akademik.json`)**:
  - `en`: `"Academic Portal & GPA"` (was `"Class timetable grid, examination dates, lecture schedule parser, and GPA forecasting."`)
  - `ms`: `"Portal Akademik & HPNM"` (was `"Matriks jadual kuliah, tarikh peperiksaan, parser jadual kelas, dan anggaran HPNM."`)
- **EMS (`ems.json`)**:
  - `en`: `"Event Management System"` (was `"Tournament orchestration, digital jury grading sheets, live scoreboard, and verifiable digital certificates."`)
  - `ms`: `"Sistem Pengurusan Acara"` (was `"Pengurusan kejohanan, borang markah juri digital, papan markah langsung, dan sijil digital boleh sah."`)
- **MAKMP (`makmp.json`)**:
  - `en`: `"Excellence Awards Portal"` (was `"Official nomination, portfolio evaluation, and academic-cocurricular merit verification."`)
  - `ms`: `"Portal Anugerah Kecemerlangan"` (was `"Pencalonan rasmi, penilaian portfolio, dan pengesahan merit akademik serta kokurikulum."`)
- **SUPSAS (`supsas.json`)**:
  - `en`: `"Sports Championship Portal"` (was `"Inter-department sports tournament, match fixtures, live medal standing, and athlete registration."`)
  - `ms`: `"Portal Kejohanan Sukan"` (was `"Kejohanan sukan antara jabatan, jadual perlawanan, carta pingat langsung, dan pendaftaran atlet."`)
- **Karnival (`karnival.json`)**:
  - `en`: `"Carnival & Fiesta Hub"` (was `"Real-time electronic booth voting, live carnival scoreboard, and festival coordination."`)
  - `ms`: `"Hab Karnival & Fiesta"` (was `"Pengundian gerai elektronik masa nyata, papan skor karnival langsung, dan penyelarasan festival."`)

### 2. Layout & Sidebar Typography
- **`src/pages/keusahawanan/KeusahawananLayout.tsx`**:
  - Changed `<p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">{t('module_subtitle')}</p>` to `tracking-[0.15em] text-white/50`.
- **`src/pages/kebajikan/KebajikanSidebar.tsx`**:
  - Changed subtitle class from `tracking-[0.25em]` to `tracking-[0.15em]`.

### 3. Test Synchronizations
- **`src/__tests__/Domain4EmsMakmpI18n.test.tsx`**:
  - Line 347: Updated expected subtitle string to `'Event Management System'`.
  - Line 504: Updated expected subtitle string to `'Sistem Pengurusan Acara'`.
- **`src/__tests__/Domain3ExcoUnitsI18n.test.tsx`**:
  - Lines 539, 589, 678, 728: Synchronized DOM assertion expectations to the new concise module subtitles (`'Student Business &amp; POS'`, `'Welfare &amp; Student Support'`, `'Perniagaan Pelajar &amp; POS'`, `'Kebajikan &amp; Bantuan Mahasiswa'`).

## Test Verification
- Ran:
  ```bash
  npx vitest run src/__tests__/Domain3ExcoUnitsI18n.test.tsx src/__tests__/Domain4EmsMakmpI18n.test.tsx
  ```
- Result: **60 of 60 tests passed** (100% PASS).
- Also verified `src/__tests__/Domain5And6CampusLifeI18n.test.tsx` (35 tests pass) and `src/__tests__/SweepGroup3KebajikanSupportI18n.test.tsx` (19 tests pass).

## Git Commit
- Commit hash: `0a3e8cc`
- Message: `fix(i18n): replace verbose paragraph descriptions with concise institutional module subtitles`
