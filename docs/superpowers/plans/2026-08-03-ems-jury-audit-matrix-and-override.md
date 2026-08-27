# EMS Jury Audit Hub, Interactive Matrix & Score Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide Program Directors and Admins with a dedicated **Jury Audit & Monitoring Hub** (`/ems/leaderboard/:eventId?tab=audit`) featuring:
1. **Kad Prestasi Juri**: Visual progress cards tracking completion rate per jury.
2. **Matriks Status Penjurian (Booth x Juri)**: Interactive matrix highlighting evaluation completion (🟢 100%, 🟡 Partial, 🔴 Unscored) and flagging booths with missing jury evaluations.
3. **Pindaan Markah Pengarah**: Director score override modal to fix jury key-in typos directly.

**Architecture:** 
- Add `overrideJuryScore` helper in `src/lib/ems.ts` using Supabase upsert.
- Create reusable component `src/components/ems/EmsJuryAuditMatrix.tsx` encapsulating Jury Performance Cards, the Interactive Matrix Grid, and the Director Score Override Modal.
- Integrate the Audit Hub into `EmsLeaderboardPage.tsx` under a new "🕵️ Audit & Pemantauan Juri" tab, guarded by strict RBAC (`canManageLeaderboard`).

**Tech Stack:** React, TypeScript, Supabase Client, Tailwind CSS, Lucide Icons, React Hot Toast.

## Global Constraints
- RBAC Enforcement: `canManage = isSuperAdmin || isJppMember || isPresident || isClubMt || isClubAdvisor || isStaff || (user?.id && event.created_by === user.id)`. Regular students MUST NOT see or access this tab.
- All code must pass `npx tsc --noEmit`.

---

### Task 1: Supabase API Helper for Director Score Override (`src/lib/ems.ts`)

**Files:**
- Modify: `src/lib/ems.ts`

**Interfaces:**
- Consumes: `scores` payload.
- Produces: `overrideJuryScore` function.

- [ ] **Step 1: Implement `overrideJuryScore` in `src/lib/ems.ts`**

```typescript
export async function overrideJuryScore(
  scores: Array<{
    event_id: string;
    participant_id: string;
    jury_code_id: string;
    rubric_id: string;
    score: number;
    comments?: string;
  }>
): Promise<boolean> {
  if (!scores || scores.length === 0) return true;

  const { error } = await supabase
    .from('ems_scores')
    .upsert(
      scores.map((s) => ({
        event_id: s.event_id,
        participant_id: s.participant_id,
        jury_code_id: s.jury_code_id,
        rubric_id: s.rubric_id,
        score: s.score,
        comments: s.comments || null,
      })),
      { onConflict: 'participant_id,jury_code_id,rubric_id' }
    );

  if (error) {
    throw new Error(`Gagal meminda markah juri: ${error.message}`);
  }

  return true;
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/ems.ts
git commit -m "feat(ems): add overrideJuryScore API helper for director score edits"
```

---

### Task 2: Jury Performance Cards & Interactive Matrix Component (`src/components/ems/EmsJuryAuditMatrix.tsx`)

**Files:**
- Create: `src/components/ems/EmsJuryAuditMatrix.tsx`

**Interfaces:**
- Consumes: `eventId`, `participants`, `juryCodes`, `rubrics`, `scores`.
- Produces: `EmsJuryAuditMatrix` component.

- [ ] **Step 1: Create `EmsJuryAuditMatrix.tsx` structure**

Component state:
- `editingCell`: `{ participant: EmsParticipant; juryCode: EmsJuryCode; scores: Record<string, number>; comments: string } | null`
- `isSavingOverride`: boolean

- [ ] **Step 2: Render Section 1 - Kad Prestasi Juri (Jury Performance Cards)**

For each active jury code:
- Calculate assigned booths count vs completed booths count.
- Render progress bar & status badge (🟢 *Selesai Semua*, 🟡 *Sedang Menilai*, 🔴 *Belum Mula*).
- Render "Salin Pautan WhatsApp" share button.

- [ ] **Step 3: Render Section 2 - Matriks Status Penjurian (Booth x Juri Matrix)**

Render table:
- Rows: Participants / Booths.
- Columns: Active Jury Codes.
- Cells:
  - 🟢 **Score %**: Graded by jury (shows weighted score on click).
  - 🟡 **Separuh**: Partially graded.
  - 🔴 **Belum**: 0 scores submitted.
- Highlight rows where total jury count is less than target (e.g. 3/4 juries) with an amber/rose warning badge.

- [ ] **Step 4: Render Section 3 - Modal Pindaan Markah Pengarah**

When a matrix cell is clicked, open modal:
- Display participant name, booth #, and jury code details.
- Render input sliders/fields for each rubric criterion.
- Submit via `overrideJuryScore` and refresh matrix!

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/ems/EmsJuryAuditMatrix.tsx
git commit -m "feat(ems): implement Jury Performance Cards and Interactive Audit Matrix component"
```

---

### Task 3: Integration into Leaderboard & Dashboard (`src/pages/ems/EmsLeaderboardPage.tsx` & `src/pages/ems/EmsDashboardPage.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsLeaderboardPage.tsx`
- Modify: `src/pages/ems/EmsDashboardPage.tsx`

**Interfaces:**
- Consumes: `canManageLeaderboard` & `canCreateEvent`.
- Produces: Integrated Audit Tab & Navigation Buttons.

- [ ] **Step 1: Add "🕵️ Audit & Pemantauan Juri" Tab in `EmsLeaderboardPage.tsx`**

In `EmsLeaderboardPage.tsx`:
- Render tab button "🕵️ Audit & Pemantauan Juri" only if `canManageLeaderboard` is true!
- When tab is active, render `<EmsJuryAuditMatrix />`.

- [ ] **Step 2: Add "🕵️ Audit Penjurian" Button in `EmsDashboardPage.tsx`**

On event cards for managers (`canCreateEvent || isOwner`), add a direct button navigating to `/ems/leaderboard/:id?tab=audit`.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/ems/EmsLeaderboardPage.tsx src/pages/ems/EmsDashboardPage.tsx
git commit -m "feat(ems): integrate jury audit tab into leaderboard and dashboard with strict RBAC"
```

---

## Verification Plan

### Automated Tests
- Run `npx tsc --noEmit` to verify 100% type safety.

### Manual Verification
1. Log in as Event Creator / Admin.
2. Go to `/ems/leaderboard/:eventId` and click **"🕵️ Audit & Pemantauan Juri"** tab.
3. Verify **Kad Prestasi Juri**:
   - Check progress bars for active juries (e.g. `8/10 Booth Dinilai`).
4. Verify **Matriks Status Penjurian**:
   - Check status cells (🟢/🟡/🔴) for each booth x jury combination.
   - Verify booth with missing jury count is flagged with an amber warning badge.
5. Click a score cell in the matrix:
   - Verify **Modal Pindaan Markah Pengarah** opens.
   - Edit a rubric score and click **Simpan Pindaan Markah**. Verify score updates instantly!
6. Log in as a regular student and verify that the Audit Tab is completely hidden.
