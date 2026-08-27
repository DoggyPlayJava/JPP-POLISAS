# Complete Siswapreneur EMS & E-Keusahawanan Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a complete, robust integration between EMS Events and E-Keusahawanan (PUSKEP / Polymart) for **Siswapreneur** programs featuring:
1. **Event Builder Siswapreneur Toggle**: "Link With E-Keusahawanan (Siswapreneur)" toggle in `EmsEventFormPage.tsx`.
2. **Auto-Approved EMS Business Provisioning**: Participants registering for a Siswapreneur event automatically get an active E-Keusahawanan business profile with auto-generated registration number **`EMS-YYYY-XXXXX`** (bypassing manual PUSKEP interview approval). Includes individual participant fallback name (`[Leader Name] Siswapreneur Enterprise`) and default category assignment. **ALL team members are granted full OWNER access** during the EMS event phase!
3. **Registration Form Cleaning & POLISAS Student Search**: Remove redundant member fields in Step 1/2 and add an interactive **POLISAS Student Search & Auto-Fill** dropdown.
4. **Step 4: Status Pendaftaran Akaun Ahli & Akses E-Keusahawanan**: Display account registration status for each team member with a 1-click **WhatsApp Group Invite** button. Auto-links member status to `ACTIVE` upon account creation.
5. **PUSKEP Upgrade Banner**: Banner in `KeusahawananDashboard.tsx` allowing `EMS-` businesses to request official `PUSKEP-YYYY-XXXXX` serial numbers, triggering push notifications to Keusahawanan Exco admins. Re-configures roles upon PUSKEP approval.
6. **Protected Auto-Archive Enforcer**: Automatically archive `EMS-` businesses 1 week after event completion if no PUSKEP upgrade request was made, while permanently protecting approved PUSKEP businesses.
7. **Mobile BottomNav Padding Standardization (`pb-28 md:pb-8`)**: Add `pb-28 md:pb-8` to all E-Keusahawanan pages to prevent mobile navigation overlaps.

**Architecture:** 
- Database Migration: Add `is_siswapreneur` to `ems_events`, and `is_ems_siswapreneur`, `ems_event_id`, `puskep_upgrade_status`, `archived_reason` to `keusahawanan_businesses`.
- Helper API: `provisionEmsSiswapreneurBusiness` & `autoArchiveExpiredEmsBusinesses` in `src/lib/keusahawanan.ts`.
- Component: `StudentSearchCombobox.tsx` for searching POLISAS student profiles during EMS team registration.
- Page Updates: `EmsEventFormPage.tsx`, `EmsPublicRegisterPage.tsx`, `KeusahawananDashboard.tsx`, and all `keusahawanan` pages for mobile padding.

**Tech Stack:** React, TypeScript, Supabase Client, Tailwind CSS, Lucide Icons, React Hot Toast.

## Global Constraints
- RLS Policies: Must write `(SELECT auth.uid())`.
- Performance: Use `Promise.all` for parallel queries.
- All code must pass `npx tsc --noEmit`.

---

### Task 1: Supabase Database Migration (`supabase/migrations/20260808_siswapreneur_ems_integration.sql`)

**Files:**
- Create: `supabase/migrations/20260808_siswapreneur_ems_integration.sql`

**Requirements:**
- Add `is_siswapreneur` column to `ems_events`.
- Add `is_ems_siswapreneur`, `ems_event_id`, `puskep_upgrade_status`, and `archived_reason` columns to `keusahawanan_businesses`.
- Create performance index on `keusahawanan_businesses(ems_event_id, is_ems_siswapreneur)`.

```sql
-- Migration: 20260808_siswapreneur_ems_integration.sql
ALTER TABLE ems_events
ADD COLUMN IF NOT EXISTS is_siswapreneur boolean DEFAULT false;

ALTER TABLE keusahawanan_businesses
ADD COLUMN IF NOT EXISTS is_ems_siswapreneur boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ems_event_id uuid REFERENCES ems_events(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS puskep_upgrade_status text DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS archived_reason text DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_keusahawanan_biz_ems ON keusahawanan_businesses(ems_event_id, is_ems_siswapreneur);
```

- [ ] Commit migration with message `db(ems): add siswapreneur integration columns to ems_events and keusahawanan_businesses`.

---

### Task 2: Siswapreneur Event Builder Toggle (`src/pages/ems/EmsEventFormPage.tsx` & `src/types/index.ts`)

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/pages/ems/EmsEventFormPage.tsx`
- Modify: `src/lib/ems.ts`

**Requirements:**
- In `src/types/index.ts`: Add `is_siswapreneur?: boolean` to `EmsEvent` and `EmsEventDetail`.
- In `src/pages/ems/EmsEventFormPage.tsx`:
  - Add state `isSiswapreneur` (default `false`).
  - Render an interactive card in Section 1 (Basic Info):
    - Title: **"🛍️ Pautan E-Keusahawanan (Program Siswapreneur)"**
    - Description: *"Apabila diaktifkan, pendaftaran peserta dalam acara ini akan mendaftarkan profil perniagaan Siswapreneur automatik di bawah e-Keusahawanan (No. Pendaftaran EMS-YYYY-XXXXX, Auto-Lulus tanpa temuduga PUSKEP)."*
    - Toggle switch button.
  - Include `is_siswapreneur` in `createEmsEvent` & `updateEmsEvent` payload in `src/lib/ems.ts`.

- [ ] Commit with message `feat(ems): add siswapreneur e-keusahawanan toggle in event builder`.

---

### Task 3: Siswapreneur Business Provisioning Helper with Full Member Access (`src/lib/keusahawanan.ts`)

**Files:**
- Modify: `src/lib/keusahawanan.ts`

**Requirements:**
- Implement `provisionEmsSiswapreneurBusiness`:
  - Business name fallback: If team name is empty (individual mode), set business name to `${leaderName} Siswapreneur Enterprise`.
  - Generates registration number `EMS-2026-XXXXX`.
  - Inserts business into `keusahawanan_businesses` with `status = 'APPROVED'`, `is_active = true`, `is_ems_siswapreneur = true`.
  - Assigns default category ID (or resolves first available category).
  - **Grants FULL OWNER ACCESS to ALL team members** (`role = 'OWNER'`, `status = 'ACTIVE'`) during the EMS event phase so everyone can manage business features!

- [ ] Commit with message `feat(keusahawanan): add provisionEmsSiswapreneurBusiness helper with full owner access for all team members`.

---

### Task 4: POLISAS Student Search Combobox & Registration Cleaning (`src/components/ems/StudentSearchCombobox.tsx` & `src/pages/ems/EmsPublicRegisterPage.tsx`)

**Files:**
- Create: `src/components/ems/StudentSearchCombobox.tsx`
- Modify: `src/pages/ems/EmsPublicRegisterPage.tsx`

**Requirements:**
- Create `StudentSearchCombobox.tsx`:
  - Searches `profiles` table by `full_name` or `matrix_no`.
  - Renders dropdown list of matched POLISAS students.
  - On select, auto-fills Name, Matrix No, and Email into the team member entry.
- Clean `EmsPublicRegisterPage.tsx`:
  - Remove duplicate member name inputs between Step 1 and Step 2.
  - Integrate `StudentSearchCombobox` for Team Members list.
  - If `eventDetail.is_siswapreneur` is active, invoke `provisionEmsSiswapreneurBusiness` upon successful registration submit.

- [ ] Commit with message `feat(ems): add student search combobox and clean registration member fields`.

---

### Task 5: Step 4 Team Account Status & WhatsApp Group Invite (`src/pages/ems/EmsPublicRegisterPage.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsPublicRegisterPage.tsx`

**Requirements:**
- In Step 4 (Registration Pass & Account Status):
  - Render **"Status Akses Portal Ahli Kumpulan & E-Keusahawanan"**.
  - Query `profiles` table for all listed member matrix numbers / emails.
  - Display badge:
    - 🟢 `Akaun POLISAS Aktif` (Akses Penuh Dashboard Perniagaan)
    - ⚠️ `Belum Berdaftar di Portal POLISAS`
  - Render **"Kongsi Pautan Pendaftaran ke WhatsApp Pasukan"** button generating a pre-formatted WhatsApp text message for the team chat.

- [ ] Commit with message `feat(ems): add step 4 team account status checklist and whatsapp group invite button`.

---

### Task 6: PUSKEP Upgrade Banner, Admin Push Notification & Protected Auto-Archive (`src/pages/keusahawanan/KeusahawananDashboard.tsx` & `src/lib/keusahawanan.ts`)

**Files:**
- Modify: `src/pages/keusahawanan/KeusahawananDashboard.tsx`
- Modify: `src/lib/keusahawanan.ts`

**Requirements:**
- In `KeusahawananDashboard.tsx`:
  - For active business with `is_ems_siswapreneur` or `registration_no` starting with `EMS-`:
    - Render gradient banner:
      - Title: **"🛍️ Perniagaan Siswapreneur EMS"**
      - Subtitle: *"Perniagaan ini didaftarkan secara automatik melalui Acara EMS. Adakah anda berminat mendaftar secara rasmi di bawah PUSKEP bagi mendapatkan No. Siri PUSKEP rasmi & keahlian kekal PUSKEP?"*
      - Button: **"Mohon No. Siri PUSKEP Rasmi"**.
      - Clicking submits `puskep_upgrade_status = 'PENDING'` and triggers `sendNotificationToKeusahawananExco` push notification to admins!
- Implement `autoArchiveExpiredEmsBusinesses()`:
  - Checks businesses where `is_ems_siswapreneur === true` AND 7 days have passed since `ems_event.event_date`.
  - If `puskep_upgrade_status === 'APPROVED'` or serial number starts with `PUSKEP-`, **PROTECTS** business from archiving.
  - If `puskep_upgrade_status === 'NONE'`, sets `is_active = false`, `archived_reason = 'EXPIRED_EMS_SISWAPRENEUR'`.

- [ ] Commit with message `feat(keusahawanan): add puskep upgrade banner, push notification, and protected auto-archive enforcer`.

---

### Task 7: Mobile BottomNav Padding Standardization (`pb-28 md:pb-8`) for ALL E-Keusahawanan Pages

**Files:**
- Modify: `src/pages/keusahawanan/KeusahawananDashboard.tsx`
- Modify: `src/pages/keusahawanan/KeusahawananProgram.tsx`
- Modify: `src/pages/keusahawanan/KeusahawananPlaceholders.tsx`
- Modify: `src/pages/keusahawanan/KeusahawananOnboarding.tsx`
- Modify: `src/pages/keusahawanan/KeusahawananPoster.tsx`
- Modify: `src/pages/keusahawanan/UrusPerniagaanPage.tsx`
- Modify: `src/pages/keusahawanan/pos/PosOrderPage.tsx`
- Modify: `src/pages/keusahawanan/pos/PosProductPage.tsx`
- Modify: `src/pages/keusahawanan/pos/PosStatsPage.tsx`
- Modify: `src/pages/keusahawanan/pos/PosHistoryPage.tsx`

**Requirements:**
- Add `pb-28 md:pb-8` to the main outer container div of ALL 10 E-Keusahawanan pages so that bottom action buttons and floating controls are never overlapped or blocked by the mobile `BottomNav` bar!

- [ ] Commit with message `fix(keusahawanan): add mobile BottomNav padding pb-28 md:pb-8 across all keusahawanan pages`.

---

## Verification Plan

### Automated Tests
- Run `npx tsc --noEmit` to verify 100% type safety.

### Manual Verification
1. Create a new EMS Event with **"Link With E-Keusahawanan (Siswapreneur)"** enabled.
2. Open public registration page (`/ems/e/:eventId/register`).
3. Search and select a POLISAS student using **StudentSearchCombobox**. Verify auto-fill.
4. Complete registration submit:
   - Check Step 4: Verify **Team Member Account Status Checklist** renders with 🟢/⚠️ badges and 1-click WhatsApp invite link.
   - Verify auto-created business in E-Keusahawanan with `EMS-2026-XXXXX` and `status = 'APPROVED'`, giving `role = 'OWNER'` to all team members.
5. Open `/keusahawanan/dashboard`:
   - Verify **Siswapreneur EMS Banner** is displayed with **"Mohon No. Siri PUSKEP Rasmi"** button.
   - Verify mobile bottom padding `pb-28 md:pb-8` prevents any BottomNav button overlap on mobile screen sizes.
