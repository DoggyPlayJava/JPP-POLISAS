# Event Management System (EMS) Implementation Plan (Finalized & Focused)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membina modul bersepadu Event Management System (EMS) yang padu dan kalis-ralat untuk POLISAS merangkumi penciptaan acara (diluluskan oleh Super Admin JPP), pendaftaran individu & Pasukan/Gerai dengan QR Pass, borang pendaftaran dinamik + galeri media, Portal Crew Check-in Scanner, Portal Juri Luar dengan Kod Jemputan & penugasan kategori, pemarkahan rubrik purata, Live Leaderboard (Stage Display Mode), serta penjana E-Sijil Digital (PDF) ber-QR. Akses dipusatkan di bawah prefix `/ems/*`.

**Architecture:** Modul SPA penuh di bawah prefix `/ems/*` dan laluan awam `/ems/e/:eventId/register`, `/ems/juri`, `/ems/checkin`, `/ems/stage/:eventId`, `/ems/cert/:certId`. Backend dikuasakan oleh Supabase PostgreSQL (RLS), Supabase Storage untuk media terkompres, Realtime untuk sync markah, dan `@react-pdf/renderer` untuk E-Sijil PDF.

**Tech Stack:** React 19, TypeScript, Supabase JS Client, Tailwind CSS, Lucide Icons, `@react-pdf/renderer`, `html5-qrcode` / `qrcode.react`, `canvas-confetti`.

## Global Constraints
- **RLS Policies:** Sentiasa guna `(SELECT auth.uid())` — BUKAN `auth.uid()` mentah.
- **Index:** Setiap lajur Foreign Key mesti ada Indeks database.
- **Storage:** Gambar peserta/gerai/poster disimpan via Supabase Storage bucket `reports`/`avatars` (compress auto via `driveUpload.ts`).
- **Concurrent Fetches:** Sentiasa guna `Promise.all([...])` untuk pelbagai query serentak.

---

### Task 1: Type Definitions & Database Migration (EMS Schema)

**Files:**
- Create: `supabase/migrations/20260729_ems_system.sql`
- Modify: `src/types/index.ts`
- Modify: `src/config/excoModules.ts`

**Interfaces:**
- Produces: `EmsEvent`, `EmsParticipant`, `EmsFormField`, `EmsJuryCode`, `EmsRubricCriteria`, `EmsScore`, `EmsCertificate` types and Supabase tables.

- [ ] **Step 1: Write Migration SQL**
Create `supabase/migrations/20260729_ems_system.sql` defining:
  - `ems_events` (id, title, description, category, event_mode ['INDIVIDUAL', 'TEAM_BOOTH'], event_date, location, status ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED'], is_leaderboard_public, created_by, created_at)
  - `ems_form_fields` (id, event_id, field_label, field_type, is_required, options, sort_order)
  - `ems_participants` (id, event_id, participant_type ['STUDENT', 'PUBLIC'], entity_mode ['INDIVIDUAL', 'TEAM'], team_name, booth_no, category_name, leader_name, matrix_no, email, phone, members_list jsonb, custom_responses jsonb, media_urls text[], is_checked_in, checked_in_at, created_at)
  - `ems_jury_codes` (id, event_id, code, jury_name, organization, assigned_categories text[], assigned_booths text[], created_at)
  - `ems_rubrics` (id, event_id, criteria_name, max_score, weight, sort_order)
  - `ems_scores` (id, event_id, participant_id, jury_code_id, rubric_id, score, comments, created_at)
  - `ems_certificates` (id, event_id, participant_id, jury_code_id, cert_type ['PARTICIPANT', 'WINNER', 'JURY'], cert_serial, qr_code_url, created_at)
  - FK indexes and RLS policies for each table using `(SELECT auth.uid())` and public read/insert permissions where required.

- [ ] **Step 2: Add TypeScript Types in `src/types/index.ts`**
Export interfaces for all EMS entities.

- [ ] **Step 3: Register EMS in `src/config/excoModules.ts`**
Add EMS module configuration with `id: 'ems'`, `name: 'EMS'`, `basePath: '/ems/dashboard'`, `isActive: true`.

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/20260729_ems_system.sql src/types/index.ts src/config/excoModules.ts
git commit -m "feat(ems): add ultra-robust schema, types, and module config"
```

---

### Task 2: EMS Supabase Helper Functions (`src/lib/ems.ts`)

**Files:**
- Create: `src/lib/ems.ts`

**Interfaces:**
- Consumes: Supabase client from `@/lib/supabase`, types from `@/types`
- Produces: API helper functions for fetching & mutating EMS data.

- [ ] **Step 1: Create `src/lib/ems.ts`**
Implement CRUD helper functions:
  - `fetchEmsEvents()`, `createEmsEvent()`, `approveEmsEvent()`
  - `registerEmsParticipant()`, `checkinEmsParticipant()`
  - `createJuryCode()`, `verifyJuryCode()`
  - `submitJuryScore()`, `fetchEmsLeaderboard()`
  - `resolveTieWinner()`, `generateEmsCertificates()`

- [ ] **Step 2: Commit**
```bash
git add src/lib/ems.ts
git commit -m "feat(ems): add Supabase API integration helpers"
```

---

### Task 3: Event Management, Approval & Jury Assignment Dashboard

**Files:**
- Create: `src/pages/ems/EmsDashboardPage.tsx`
- Create: `src/pages/ems/EmsEventFormPage.tsx`
- Create: `src/pages/ems/EmsApprovalPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `@/lib/ems`, `@/contexts/AuthContext`
- Produces: Dashboard UI for managing events, form builder, rubric builder, jury category assignments, and manual tie-breaker tool.

- [ ] **Step 1: Build `EmsDashboardPage.tsx`**
Overview of events, participant list by booth/team, jury code generator with category selector, manual tie-breaker controls, and E-Sijil trigger.

- [ ] **Step 2: Build `EmsEventFormPage.tsx`**
Form to set event details, mode (Individual vs Team/Booth), dynamic registration fields, and rubric scoring criteria.

- [ ] **Step 3: Build `EmsApprovalPage.tsx`**
UI for `SUPER_ADMIN_JPP` to review pending event requests.

- [ ] **Step 4: Register routes in `src/App.tsx`**
Add `/ems/dashboard`, `/ems/event/new`, `/ems/event/:id/edit`, `/ems/approvals`.

- [ ] **Step 5: Commit**
```bash
git add src/pages/ems/ EmsApprovalPage.tsx src/App.tsx
git commit -m "feat(ems): implement event management and approval dashboard"
```

---

### Task 4: Public Participant Registration Wizard (QR Pass Generator)

**Files:**
- Create: `src/pages/ems/EmsPublicRegisterPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `@/lib/ems`, `@/lib/driveUpload`
- Produces: Public multi-step wizard for participant/team registration with media upload.

- [ ] **Step 1: Build `EmsPublicRegisterPage.tsx` Wizard**
  - **Step 1:** Choose Participant Category (Pelajar POLISAS with Google Login / Matrix No. vs Public/Orang Luar).
  - **Step 2:** Choose Mode (Individu vs Pasukan/Gerai with Team Name, Booth No, Members).
  - **Step 3:** Dynamic Form Fields & Media Gallery Uploads (Booth photo, Poster photo, Document).
  - **Step 4:** Confirmation & Digital Event QR Pass.

- [ ] **Step 2: Register public route in `src/App.tsx`**
Add public route `/ems/e/:eventId/register`.

- [ ] **Step 3: Commit**
```bash
git add src/pages/ems/EmsPublicRegisterPage.tsx src/App.tsx
git commit -m "feat(ems): add public multi-step participant registration wizard"
```

---

### Task 5: Crew Attendance Check-in QR Scanner Portal

**Files:**
- Create: `src/pages/ems/EmsCheckinPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `@/lib/ems`, camera / QR scanner
- Produces: Attendance check-in interface for event crew to scan participant QR passes.

- [ ] **Step 1: Build `EmsCheckinPage.tsx`**
Camera QR scanner and manual matrix/serial search to mark participants as "Checked-In" live.

- [ ] **Step 2: Register route in `src/App.tsx`**
Add `/ems/checkin/:eventId`.

- [ ] **Step 3: Commit**
```bash
git add src/pages/ems/EmsCheckinPage.tsx src/App.tsx
git commit -m "feat(ems): add crew attendance check-in scanner portal"
```

---

### Task 6: External Jury Access Portal & Category Scoring System

**Files:**
- Create: `src/pages/ems/EmsJuryPortalPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `@/lib/ems`
- Produces: Public portal for external judges to enter invitation code and grade assigned participant teams/booths.

- [ ] **Step 1: Build `EmsJuryPortalPage.tsx`**
  - **Code Entry Screen:** Input box for Jury Code. Prompts for Jury Name & Organization.
  - **Filtered Booth List:** Displays only booths/categories assigned by the Director to that jury code.
  - **Scoring Modal / Drawer:** Dynamic rubrics slider/number inputs with media preview of booth/poster and comments section.

- [ ] **Step 2: Register public route in `src/App.tsx`**
Add `/ems/juri` route.

- [ ] **Step 3: Commit**
```bash
git add src/pages/ems/EmsJuryPortalPage.tsx src/App.tsx
git commit -m "feat(ems): implement external jury access portal and category scoring system"
```

---

### Task 7: Realtime Leaderboard & Stage Display Mode

**Files:**
- Create: `src/pages/ems/EmsLeaderboardPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `@/lib/ems`, Supabase Realtime subscriptions
- Produces: Live ranking leaderboard with public presentation mode and manual tie-breaker indicator.

- [ ] **Step 1: Build `EmsLeaderboardPage.tsx`**
  - Computes Average Jury Score per team.
  - Realtime score sync as juries grade.
  - **Stage Display Mode Toggle:** Fullscreen presentation layout with animation & confetti for Top 3.
  - **Director Visibility Toggle:** Hide/Reveal live scores for audience.

- [ ] **Step 2: Register routes in `src/App.tsx`**
Add `/ems/leaderboard/:eventId` and `/ems/stage/:eventId`.

- [ ] **Step 3: Commit**
```bash
git add src/pages/ems/EmsLeaderboardPage.tsx src/App.tsx
git commit -m "feat(ems): add realtime leaderboard with stage display mode"
```

---

### Task 8: E-Certificate PDF Generator (`@react-pdf/renderer`)

**Files:**
- Create: `src/components/ems/EmsCertificateTemplate.tsx`
- Create: `src/pages/ems/EmsCertificatePage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `@react-pdf/renderer`, `@/lib/ems`
- Produces: PDF certificate generation and verification viewer.

- [ ] **Step 1: Build `EmsCertificateTemplate.tsx`**
React PDF template for Certificates of Participation, Winner Awards, and Jury Recognition with QR Verification link.

- [ ] **Step 2: Build `EmsCertificatePage.tsx`**
Public download and verification page `/ems/cert/:certId`.

- [ ] **Step 3: Register route in `src/App.tsx`**
Add `/ems/cert/:certId`.

- [ ] **Step 4: Commit**
```bash
git add src/components/ems/EmsCertificateTemplate.tsx src/pages/ems/EmsCertificatePage.tsx src/App.tsx
git commit -m "feat(ems): add digital E-Certificate PDF generator and verification portal"
```

---

### Task 9: Documentation Update (`DEV_GUIDELINE.md` & `ROUTES.md`)

**Files:**
- Modify: `DEV_GUIDELINE.md`
- Modify: `ROUTES.md`

**Interfaces:**
- Documentation update for future maintenance.

- [ ] **Step 1: Update `DEV_GUIDELINE.md` & `ROUTES.md`**
Add `/ems/*` route documentation, table list, and RBAC rules.

- [ ] **Step 2: Commit**
```bash
git add DEV_GUIDELINE.md ROUTES.md
git commit -m "docs: update DEV_GUIDELINE and ROUTES with ultra-robust EMS specifications"
```

---

## Verification Plan

### Automated Verification
- Run `npm run build` or `npx tsc --noEmit` to verify type safety and build compilation without errors.

### Manual Verification
- Test Event Creation by Program Director -> Approval by `SUPER_ADMIN_JPP`.
- Test Participant Registration Wizard (Individual vs Team/Booth, Pelajar with Google login vs Public).
- Test Crew Attendance Check-in Scanner.
- Test External Jury Code login with Assigned Categories -> Submit rubric scores.
- Test Realtime Leaderboard & Stage Display Mode.
- Test Digital E-Certificate PDF generation & QR Verification link.
