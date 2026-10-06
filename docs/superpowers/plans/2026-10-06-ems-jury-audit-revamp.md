# Pelan Pelaksanaan: EMS SuperApp — Portal Juri Pantas & Papan Audit Juri Eksekutif

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghasilkan Portal Penjurian Pantas (`/ems/juri`) mudah-alih dengan aliran skrol sentuh laju, navigasi kategori pil lekat, dan peralihan pintar booth seterusnya, serta Papan Audit Juri Eksekutif (`EmsJuryAuditMatrix.tsx`) dengan kad telemetri anomali KPI dan tindakan kelompok tanpa sebarang raw emoji.

**Architecture:** Membahagikan pembaharuan kepada 4 tugas modular: ujian asas & pembantu logik teras (`src/lib/ems.ts`), pembinaan semula Portal Juri (`EmsJuryPortalPage.tsx`), pembinaan semula Papan Audit Juri (`EmsJuryAuditMatrix.tsx`), dan pengemaskinian dokumentasi `DEV_GUIDELINE.md` serta pengesahan binaan penuh.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Framer Motion, Canvas Confetti, Vitest, Supabase (PostgreSQL).

## Global Constraints

- **Sifar Raw Emoji:** Gantikan 100% emoji mentah (`🌟`, `👍`, `👌`, `⚠️`, `❌`, `🎤`, `📦`, `🖼️`, `🎬`, `🚀`, `🏆`, `👁️`, `🚨`, `🟢`, dll) dengan ikon vektor Lucide React.
- **Sifar Gangguan Skema DB / RPC:** Kekalkan panggilan pangkalan data sedia ada (`submitJuryScore`, `overrideJuryScore`, `ems_scores`, `ems_rubrics`, `ems_jury_codes`).
- **Sentuhan Pantas Mudah-Alih (Mobile-First):** Tiada limpahan mendatar (*zero horizontal overflow*) pada telefon pintar; butang skor sekurang-kurangnya 44px untuk kebolehcapaian sentuhan.
- **Konkurensi Pantas:** Gunakan `Promise.all` bagi panggilan API pelbagai serentak.
- **Pematuhan Ujian Unit:** Semua ujian unit dalam `src/__tests__/emsJuryAuditSuperApp.test.ts` dan seluruh repositori mesti lulus 100%.

---

### Task 1: Testing Scaffolding & Scoring Helpers

**Files:**
- Create: `src/__tests__/emsJuryAuditSuperApp.test.ts`
- Modify: `src/lib/ems.ts`

**Interfaces:**
- Consumes: `EmsParticipant`, `EmsRubricCriteria`, `EmsScore`, `EmsJuryCode` from `@/types`
- Produces: 
  - `findNextUnscoredParticipant(participants, scores, currentParticipantId, category): EmsParticipant | null`
  - `calculateBoothAuditSummary(participants, activeJuries, scores, rubrics, ignoredFlags): BoothAuditSummary`
  - Test suite validating Likert constants, weighted scoring, anomaly detection, and vector icons.

- [ ] **Step 1: Write the unit test suite for EMS SuperApp helpers and components**
  Create `src/__tests__/emsJuryAuditSuperApp.test.ts` testing:
  - Likert options export without any raw emoji and valid 1-5 values.
  - `findNextUnscoredParticipant` finds the next participant in the same category that has no scores.
  - `calculateBoothAuditSummary` correctly counts deficit, surplus, and balanced booths.
  - Code inspection verifying `EmsJuryPortalPage.tsx` and `EmsJuryAuditMatrix.tsx` do not contain banned raw emojis.

- [ ] **Step 2: Run tests to verify test suite detects existing issues**
  Run: `npx vitest run src/__tests__/emsJuryAuditSuperApp.test.ts`
  Confirm expected failures regarding emoji bans or missing helpers.

- [ ] **Step 3: Implement helper functions in `src/lib/ems.ts`**
  Add `findNextUnscoredParticipant` and audit calculation helper with clean TypeScript types.

- [ ] **Step 4: Run tests and verify helper tests pass**
  Run: `npx vitest run src/__tests__/emsJuryAuditSuperApp.test.ts`

- [ ] **Step 5: Commit Task 1**
  `git add src/lib/ems.ts src/__tests__/emsJuryAuditSuperApp.test.ts`  
  `git commit -m "feat(ems): add test scaffolding and jury scoring helpers"`

---

### Task 2: Portal Juri Pantas Revamp (`EmsJuryPortalPage.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsJuryPortalPage.tsx`
- Test: `src/__tests__/emsJuryAuditSuperApp.test.ts`

**Interfaces:**
- Consumes: `verifyJuryCode`, `submitJuryScore`, `findNextUnscoredParticipant` from `@/lib/ems`
- Produces:
  - Sticky Segmented Category Pills with dynamic progress counters (`[Semua]`, `[Poster 12/12]`).
  - Seamless Touch Feed for criteria scoring (tap-to-score 1-5 buttons).
  - Sticky bottom action bar with live weighted % and submission trigger.
  - Post-scoring transition modal with `[Teruskan ke Booth Seterusnya ➔]` and `[Kembali ke Senarai]`.
  - 100% Lucide React icons (zero raw emoji).

- [ ] **Step 1: Update unit test expectations for Portal Juri in `src/__tests__/emsJuryAuditSuperApp.test.ts`**
  Add checks for `findNextUnscoredParticipant` integration, sticky bottom bar, and elimination of duplicate next-category buttons.

- [ ] **Step 2: Refactor Likert options and category icons in `EmsJuryPortalPage.tsx`**
  - Replace raw emojis in `LIKERT_OPTIONS` with Lucide icons (`XCircle`, `AlertCircle`, `MinusCircle`, `ThumbsUp`, `Sparkles`).
  - Replace raw emojis in `getCategoryIcon` with Lucide icons (`Mic`, `Package`, `ImageIcon`, `Video`, `Rocket`, `Award`).

- [ ] **Step 3: Implement Sticky Segmented Category Bar**
  - Replace heavy Gateway selector with a sleek horizontal scrollable segmented pill bar at the top of the participant list.
  - Include live badges showing completed vs total booths per category.
  - Remove redundant duplicate `⏩ Penilaian Kategori Seterusnya` buttons.

- [ ] **Step 4: Implement Seamless Touch Feed (Aliran Skrol Pantas) Scoring**
  - Group rubrics by section with clear headers.
  - Render ergonomic 1-5 tap-to-score buttons with high-contrast color indicators and crisp active states.
  - Embed sticky bottom bar displaying live percentage, completion counter, and `[Sahkan & Hantar Markah]`.

- [ ] **Step 5: Implement Smart Post-Scoring Celebration & Next Booth Transition Drawer**
  - When submission succeeds, open smooth transition sheet displaying:
    - Mini celebration with badge and awarded score.
    - Primary CTA: `[Teruskan ke Booth Seterusnya ➔]` (navigates to next unscored booth).
    - Secondary CTA: `[Kembali ke Senarai Booth]`.

- [ ] **Step 6: Run tests and verify zero regressions**
  Run: `npx vitest run src/__tests__/emsJuryAuditSuperApp.test.ts`

- [ ] **Step 7: Commit Task 2**
  `git add src/pages/ems/EmsJuryPortalPage.tsx src/__tests__/emsJuryAuditSuperApp.test.ts`  
  `git commit -m "refactor(ems): streamline jury portal with seamless touch scoring and sticky category pills"`

---

### Task 3: Papan Audit Juri Eksekutif Revamp (`EmsJuryAuditMatrix.tsx`)

**Files:**
- Modify: `src/components/ems/EmsJuryAuditMatrix.tsx`
- Test: `src/__tests__/emsJuryAuditSuperApp.test.ts`

**Interfaces:**
- Consumes: `overrideJuryScore` from `@/lib/ems`, `EmsParticipant`, `EmsJuryCode`, `EmsRubricCriteria`, `EmsScore`
- Produces:
  - 4 Executive Telemetry KPI Cards (Booth Coverage, Jury Progress, Deficit Anomaly, Surplus Anomaly).
  - Bulk actions for ignoring/resetting anomaly warnings.
  - Responsive Booth × Jury grid with reliable sticky booth column.
  - Modernized Director Score Override drawer/modal with audit comment logging.
  - 100% Lucide React icons (zero raw emoji).

- [ ] **Step 1: Update unit test expectations for Papan Audit Juri in `src/__tests__/emsJuryAuditSuperApp.test.ts`**
  Add assertions for KPI cards, bulk ignore functionality, and clean vector status badges.

- [ ] **Step 2: Implement Executive Telemetry KPI Cards**
  - Render 4 cards at the top:
    1. Liputan Booth (Dinilai vs Belum).
    2. Status Juri (Selesai, Sedang Menilai, Belum Mula).
    3. Anomali Terkurang Juri (< Purata).
    4. Anomali Terlebih Juri (> Purata).
  - Add instant filter click interaction on KPI cards.

- [ ] **Step 3: Implement Bulk Anomaly Actions & Lucide Status Badges**
  - Add `[Abaikan Semua Amaran Seimbang]` and `[Set Semula Amaran]` buttons.
  - Replace all raw emojis in anomaly badges with Lucide icons (`ShieldCheck`, `AlertTriangle`, `ShieldAlert`, `Scale`).
  - Sanitize WhatsApp invitation message generator to avoid raw emojis if desired or keep clean text formatting.

- [ ] **Step 4: Refactor Responsive Matrix Grid Table**
  - Ensure sticky left column maintains proper z-index and border alignment on mobile/tablet viewports.
  - Standardize cell status badges: Emerald (completed %), Amber (partial), Rose (unstarted assigned), Slate (unassigned).

- [ ] **Step 5: Modernize Director Score Override Drawer / Modal**
  - Upgrade modal styling to Obsidian SuperApp theme.
  - Provide interactive sliders, number inputs, live percentage preview, and required audit trail comment.

- [ ] **Step 6: Run tests and verify zero regressions**
  Run: `npx vitest run src/__tests__/emsJuryAuditSuperApp.test.ts`

- [ ] **Step 7: Commit Task 3**
  `git add src/components/ems/EmsJuryAuditMatrix.tsx src/__tests__/emsJuryAuditSuperApp.test.ts`  
  `git commit -m "feat(ems): upgrade jury audit matrix with executive telemetry and bulk anomaly controls"`

---

### Task 4: Documentation & Full Verification

**Files:**
- Modify: `DEV_GUIDELINE.md`
- Test: Full repository test suite (`npm test -- --run`)
- Build: `npm run build`

**Interfaces:**
- Consumes: All updated EMS components and tests
- Produces: Updated developer guidelines under Subsection 29.13 and production-ready build.

- [ ] **Step 1: Update `DEV_GUIDELINE.md` with Subsection 29.13**
  Document the EMS SuperApp revamp:
  - Architecture of Portal Juri (`/ems/juri`): sticky category pills, seamless touch scoring, post-scoring transition flow, offline resilience.
  - Architecture of Papan Audit Juri (`EmsJuryAuditMatrix.tsx`): executive KPI telemetry cards, bulk anomaly actions, responsive matrix table, director override modal.
  - Strict zero emoji and Lucide icon mapping.

- [ ] **Step 2: Run all repository unit tests**
  Run: `npm test -- --run`  
  Verify all 20+ test files and 280+ tests pass with 100% green.

- [ ] **Step 3: Run production build**
  Run: `npm run build`  
  Ensure 0 TypeScript errors and clean bundle output.

- [ ] **Step 4: Commit Task 4**
  `git add DEV_GUIDELINE.md`  
  `git commit -m "docs(ems): document jury portal and audit matrix superapp architecture"`
