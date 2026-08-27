# Modul EMS Complete Architecture Implementation Plan (Finalized & Ultra-Robust)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membina modul EMS bersepadu kelas enterprise merangkumi sokongan Acara Terbuka / Pengunjung (Free-flow), QR Kehadiran Pengunjung, Roda Cabutan Bertuah Live (Lucky Draw Wheel) & Pemenang Milestone Ke-N, Sidebar & Header khas EMS (`EmsSidebarContent`), kawalan keselamatan RBAC, komponen muat naik fail dinamik (Gambar & PDF), Kuota Maksimum Peserta (`max_participants`), kawalan aktif Kod Juri, butang status "COMPLETED", notifikasi automatik, Universal QR Scanner, dan pembaikan padding mobile (`pb-28`).

**Architecture:** Mengemaskini skema database (`ems_visitors`, `event_type`, `milestone_config`), `Sidebar.tsx`, `AppLayout.tsx`, `Header.tsx`, `EmsDashboardPage.tsx`, `EmsEventFormPage.tsx`, `EmsPublicRegisterPage.tsx`, `EmsLeaderboardPage.tsx`, `AkademikQrPage.tsx`, dan `notifications.ts`. Membina komponen Roda Cabutan Bertuah (`EmsLuckyDrawModal`) dan Portal Imbas Pengunjung (`EmsAudienceScanPage`).

**Tech Stack:** React 19, TypeScript, Supabase JS Client, Tailwind CSS, Lucide Icons, `canvas-confetti`, `driveUpload.ts`.

## Global Constraints
- **RBAC Strictness:** Hak cipta acara HANYA untuk `SUPER_ADMIN_JPP`, `JPP`, `CLUB_PRESIDENT`, `CLUB_MT`, `CLUB_ADVISOR`, `STAFF`.
- **Dynamic File Uploads:** Medan `image_upload` dan `document_upload` MESTI memuat naik fail fizikal ke Supabase Storage via `driveUpload.ts` dan memaparkan *preview*.
- **Audience & Lucky Draw:** Menyokong pendaftaran pengunjung awam, QR Kehadiran Pengunjung, Roda Cabutan Bertuah Live di Pentas, dan Pemenang Milestone Ke-N.
- **Mobile Usability:** Semua halaman EMS MESTI ada `pb-28 md:pb-8` supaya tidak tertindih di bawah `BottomNav`.
- **Universal Scanner:** Menyokong routing pintar untuk Merit, Registration, Pass, Jury Code, Cert, dan Audience Attendance.

---

### Task 1: Database Migration for Audience Attendance & Lucky Draw (`ems_visitors`)

**Files:**
- Modify: `supabase/migrations/20260729_ems_system.sql`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `ems_visitors` table schema, `event_type` enum, `EmsVisitor`, `EmsEventType` TypeScript interfaces.

- [ ] **Step 1: Update SQL Migration**
Add columns/tables in `supabase/migrations/20260729_ems_system.sql`:
  - `ems_events`: Add `event_type` text default `'COMPETITION'`, `milestone_config` jsonb.
  - `ems_visitors`: Table (id uuid default gen_random_uuid() primary key, event_id uuid references ems_events(id) on delete cascade, user_id uuid references auth.users(id), name text not null, matrix_no text, email text, phone text, is_milestone_winner boolean default false, milestone_number int, scanned_at timestamptz default now()).
  - Add FK indexes and RLS policies using `(SELECT auth.uid())`.

- [ ] **Step 2: Add TypeScript Types in `src/types/index.ts`**
Export `EmsEventType`, `EmsVisitor`, `EmsMilestoneConfig`.

- [ ] **Step 3: Commit**
```bash
git add supabase/migrations/20260729_ems_system.sql src/types/index.ts
git commit -m "feat(ems): add database schema for open audience events and lucky draw visitors"
```

---

### Task 2: Dedicated EMS Sidebar & Header (`EmsSidebarContent`, `AppLayout`, `Header`)

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/components/layout/Header.tsx`

**Interfaces:**
- Consumes: `@/contexts/AuthContext`, `@/config/excoModules`
- Produces: Dedicated EMS sidebar & header with `#EC4899` accent and EMS navigation items.

- [ ] **Step 1: Implement `EmsSidebarContent()` in `Sidebar.tsx`**
Define `EMS_NAV` containing Hub Acara EMS, Cipta Acara (role-restricted), Check-In Scanner, Portal Juri Luar, Live Leaderboard, Semakan E-Sijil, & Semakan HQ.

- [ ] **Step 2: Update `AppLayout.tsx` & `Header.tsx`**
Update `detectExcoFromPath` to recognize `/ems/*` and display EMS brand context in header.

- [ ] **Step 3: Commit**
```bash
git add src/components/layout/Sidebar.tsx src/components/layout/AppLayout.tsx src/components/layout/Header.tsx
git commit -m "feat(ems): add dedicated EmsSidebarContent and integrate AppLayout/Header"
```

---

### Task 3: Form Builder Dynamic File Upload Renderer & Event Types

**Files:**
- Modify: `src/pages/ems/EmsEventFormPage.tsx`
- Modify: `src/pages/ems/EmsPublicRegisterPage.tsx`

**Interfaces:**
- Consumes: `@/lib/driveUpload` (`uploadFileToDrive`, `uploadPdfToDrive`)
- Produces: Event Type selector, Milestone Winner config, and interactive file upload components in dynamic registration forms.

- [ ] **Step 1: Update Event Form Page (`EmsEventFormPage.tsx`)**
  - Add Event Type selector: "Pertandingan / Pameran", "Program Terbuka / Ceramah", or "Kombinasi (Kedua-duanya)".
  - Add Milestone Winner input field (e.g. `50, 100, 250, 500`).
  - In Form Builder dropdown, clearly present field types: Teks, Select, Checkbox, Textarea, Image Upload, Document Upload.

- [ ] **Step 2: Implement Dynamic File Upload Renderer in `EmsPublicRegisterPage.tsx`**
  - Render file uploaders for `image_upload` & `document_upload` with Supabase Storage upload via `driveUpload.ts` and live preview.

- [ ] **Step 3: Commit**
```bash
git add src/pages/ems/EmsEventFormPage.tsx src/pages/ems/EmsPublicRegisterPage.tsx
git commit -m "feat(ems): implement event type selector, milestone config, and dynamic file upload renderers"
```

---

### Task 4: Audience Attendance Portal & Interactive Lucky Draw Wheel (`EmsAudienceScanPage`, `EmsLuckyDrawModal`)

**Files:**
- Create: `src/pages/ems/EmsAudienceScanPage.tsx`
- Create: `src/components/ems/EmsLuckyDrawModal.tsx`
- Modify: `src/pages/ems/EmsDashboardPage.tsx`
- Modify: `src/pages/ems/EmsLeaderboardPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `@/lib/ems`, `canvas-confetti`
- Produces: Audience Attendance Scanning page, Milestone Winner alert, and Stage Lucky Draw Wheel.

- [ ] **Step 1: Build `EmsAudienceScanPage.tsx` (`/ems/v/:eventId/scan`)**
  - Public QR endpoint for audience/visitors to record attendance.
  - Checks if student is visitor #N matching `milestone_config`. If milestone matches, displays instant "🎉 Tahniah! Anda Pengunjung Ke-N & Pemenang Bertuah!" celebration card.

- [ ] **Step 2: Build `EmsLuckyDrawModal.tsx` & Integrate into Stage Mode**
  - Interactive spinning wheel / random winner picker modal for MC/Director.
  - Picks random winner from checked-in audience list with confetti animation and sound effect.

- [ ] **Step 3: Register Route in `src/App.tsx`**
Add `<Route path="/ems/v/:eventId/scan" element={<EmsAudienceScanPage />} />`.

- [ ] **Step 4: Commit**
```bash
git add src/pages/ems/EmsAudienceScanPage.tsx src/components/ems/EmsLuckyDrawModal.tsx src/pages/ems/EmsDashboardPage.tsx src/pages/ems/EmsLeaderboardPage.tsx src/App.tsx
git commit -m "feat(ems): implement audience attendance scanning and interactive lucky draw wheel"
```

---

### Task 5: Access Control Enforcement, Quota Limits, Notifications & Universal QR

**Files:**
- Modify: `src/pages/ems/EmsDashboardPage.tsx`
- Modify: `src/pages/ems/EmsEventFormPage.tsx`
- Modify: `src/pages/akademik/AkademikQrPage.tsx`
- Modify: `src/lib/ems.ts`

**Interfaces:**
- Consumes: `@/contexts/AuthContext`, `@/lib/notifications`
- Produces: RBAC protection, completion status button, automated email/notifications, and smart QR routing.

- [ ] **Step 1: Enforce Role Check & Add COMPLETED Action Button**
  - Limit event creation to authorized roles. Add "Tanda Acara Selesai (COMPLETED)" button for approved events.

- [ ] **Step 2: Integrate System & Email Notifications**
  - Automated notification on event approval/rejection and participant registration.

- [ ] **Step 3: Upgrade Universal QR Scanner (`AkademikQrPage.tsx`)**
  - Add smart routing for Merit, Registration, Pass, Jury, Cert, and Audience Attendance QR codes.

- [ ] **Step 4: Commit**
```bash
git add src/pages/ems/EmsDashboardPage.tsx src/pages/ems/EmsEventFormPage.tsx src/pages/akademik/AkademikQrPage.tsx src/lib/ems.ts
git commit -m "feat(ems): enforce RBAC rules, completion button, automated notifications, and Universal QR"
```

---

### Task 6: EMS Selector Pages & Mobile BottomNav Padding Fix

**Files:**
- Create: `src/pages/ems/EmsCheckinSelectorPage.tsx`
- Create: `src/pages/ems/EmsCertVerifyPage.tsx`
- Modify: All EMS Pages in `src/pages/ems/`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `@/lib/ems`
- Produces: EMS Selector Pages, quota lock check, and `pb-28 md:pb-8` bottom padding on all EMS pages.

- [ ] **Step 1: Build `EmsCheckinSelectorPage.tsx` & `EmsCertVerifyPage.tsx`**
  - Build selector pages for check-in and certificate verification.

- [ ] **Step 2: Apply `pb-28 md:pb-8` Bottom Padding Across ALL EMS Pages**
  - Add `pb-28 md:pb-8` to main scrollable containers in all EMS pages.

- [ ] **Step 3: Register Routes in `src/App.tsx`**
  - Register `/ems/checkin` and `/ems/cert/verify`.

- [ ] **Step 4: Commit**
```bash
git add src/pages/ems/ src/App.tsx
git commit -m "feat(ems): add selector pages, quota enforcement, and fix mobile BottomNav overlap padding"
```

---

### Task 7: Verification & Documentation Update

**Files:**
- Modify: `DEV_GUIDELINE.md`
- Modify: `ROUTES.md`

- [ ] **Step 1: TypeScript Check**
Run `npx tsc --noEmit` to verify zero build errors.

- [ ] **Step 2: Update Documentation**
Document EMS Audience Attendance, Lucky Draw Wheel, Milestone Winners, Sidebar, Universal QR routing, and Mobile Padding in `DEV_GUIDELINE.md` & `ROUTES.md`.

- [ ] **Step 3: Commit**
```bash
git add DEV_GUIDELINE.md ROUTES.md
git commit -m "docs: update DEV_GUIDELINE and ROUTES with complete EMS specifications"
```

---

## Verification Plan

### Automated Verification
- Run `npx tsc --noEmit` to verify type safety across all modified files.

### Manual Verification
- Test creating a "Hybrid" event with Milestone config (e.g. 50, 100).
- Test Audience scanning QR (`/ems/v/:eventId/scan`) -> verify attendance logged & milestone winner alert triggers on 100th visitor.
- Test Interactive Lucky Draw Wheel on Stage Mode (`/ems/stage/:eventId`) -> verify random winner selection with confetti.
- Test dynamic file uploaders (`image_upload` & `document_upload`) in registration wizard.
- Test EMS Sidebar rendering & Header context when visiting `/ems/dashboard`.
- Test student vs admin event creation permissions (hidden button + route guard).
- Test scanning an EMS QR code on the Universal QR Scanner (`/akademik/qr`).
- Verify no button overlaps with `BottomNav` on mobile screens.
