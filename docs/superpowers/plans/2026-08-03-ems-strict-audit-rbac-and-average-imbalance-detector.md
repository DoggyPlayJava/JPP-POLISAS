# EMS Strict Audit RBAC & Average-Based Jury Imbalance Detector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 
1. **Strict RBAC Hardening**: Restrict access to the Jury Audit Tab (`?tab=audit`) exclusively to **SUPER_ADMIN_JPP**, **JPP**, and the **Event Creator (`event.created_by === user.id`)**.
2. **Average-Based Imbalance & Overcount Auto-Detection**: Auto-detect booths where jury evaluation count is below average (🚨 *Terkurang Juri*) or above average (⚠️ *Terlebih Juri*).
3. **Ignore Flag Control**: Add a 1-click **"👁️ Abaikan Amaran (Ignore Flag)"** toggle so Program Directors can dismiss acceptable session anomalies (e.g. morning vs afternoon session splits).

**Architecture:** 
- Update RBAC logic in `EmsLeaderboardPage.tsx` and `EmsDashboardPage.tsx` to compute `canAccessAuditTab = isSuperAdmin || isJppMember || (!!user?.id && event.created_by === user.id)`.
- Update `EmsJuryAuditMatrix.tsx` to calculate `avgJuriesPerBooth`, detect under/over-count anomalies per booth, and provide an interactive `ignoredFlags` state toggle per booth row.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide Icons, React Hot Toast.

## Global Constraints
- RBAC Enforcement: MUST restrict access to `isSuperAdmin`, `isJppMember`, or `event.created_by === user.id`.
- All code must pass `npx tsc --noEmit`.

---

### Task 1: Strict Audit RBAC Hardening (`src/pages/ems/EmsLeaderboardPage.tsx` & `src/pages/ems/EmsDashboardPage.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsLeaderboardPage.tsx`
- Modify: `src/pages/ems/EmsDashboardPage.tsx`

**Interfaces:**
- Consumes: `user`, `isSuperAdmin`, `isJppMember`, `event.created_by`.
- Produces: `canAccessAuditTab` boolean flag.

- [ ] **Step 1: Update Audit RBAC in `EmsLeaderboardPage.tsx`**

```typescript
const canAccessAuditTab =
  isSuperAdmin || isJppMember || (!!user?.id && eventData?.created_by === user.id);
```

- Render tab button "🕵️ Audit & Pemantauan Juri" only when `canAccessAuditTab` is true.
- If `!canAccessAuditTab` and `activeTab === 'AUDIT'`, toast access denied error and reset `activeTab` to `'LEADERBOARD'`.

- [ ] **Step 2: Update Audit Button RBAC in `EmsDashboardPage.tsx`**

On event cards, render "🕵️ Audit Penjurian" button only when:
```typescript
(isSuperAdmin || isJppMember || (!!user?.id && event.created_by === user.id))
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/ems/EmsLeaderboardPage.tsx src/pages/ems/EmsDashboardPage.tsx
git commit -m "security(ems): restrict jury audit tab access exclusively to SuperAdmin JPP, JPP, and Event Creator"
```

---

### Task 2: Average-Based Jury Imbalance Detector & Ignore Flag Toggle (`src/components/ems/EmsJuryAuditMatrix.tsx`)

**Files:**
- Modify: `src/components/ems/EmsJuryAuditMatrix.tsx`

**Interfaces:**
- Consumes: Matrix scores, booth jury counts.
- Produces: `avgJuriesCount`, under/overcount warnings, and `ignoredFlags` toggle.

- [ ] **Step 1: Compute `avgJuriesCount` in `EmsJuryAuditMatrix.tsx`**

```typescript
const avgJuriesCount = useMemo(() => {
  const activeScoredBooths = participants.filter((p) =>
    juryCodes.some((j) => {
      const pScores = scores.filter((s) => s.participant_id === p.id && s.jury_code_id === j.id);
      return pScores.length > 0;
    })
  );
  if (activeScoredBooths.length === 0) return 0;

  const totalScoredCells = activeScoredBooths.reduce((sum, p) => {
    const boothJuries = juryCodes.filter((j) =>
      scores.some((s) => s.participant_id === p.id && s.jury_code_id === j.id)
    ).length;
    return sum + boothJuries;
  }, 0);

  return Math.round(totalScoredCells / activeScoredBooths.length) || 1;
}, [participants, juryCodes, scores]);
```

- [ ] **Step 2: Add `ignoredFlags` state & toggle function**

```typescript
const [ignoredFlags, setIgnoredFlags] = useState<Record<string, boolean>>({});

const toggleIgnoreFlag = (boothId: string) => {
  setIgnoredFlags((prev) => ({
    ...prev,
    [boothId]: !prev[boothId],
  }));
  toast.success('Status amaran booth telah dikemaskini.');
};
```

- [ ] **Step 3: Render Anomaly Badges & Ignore Flag Control in Matrix Table**

For each participant row:
- Calculate `scoredJuriesCount`.
- If `!ignoredFlags[participant.id]`:
  - If `scoredJuriesCount < avgJuriesCount`: Render 🚨 **Terkurang Juri ({scoredJuriesCount} vs Purata {avgJuriesCount})**.
  - If `scoredJuriesCount > avgJuriesCount`: Render ⚠️ **Terlebih Juri ({scoredJuriesCount} vs Purata {avgJuriesCount})**.
- Render small button:
  - If flagged & not ignored: **"👁️ Abaikan Amaran"** (clicking sets `ignoredFlags[participant.id] = true`).
  - If ignored: **"🔔 Nyahabaikan"** (displays muted badge `[Amaran Diabaikan]`).

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ems/EmsJuryAuditMatrix.tsx
git commit -m "feat(ems): add average-based jury imbalance/overcount detector and ignore flag toggle"
```

---

## Verification Plan

### Automated Tests
- Run `npx tsc --noEmit` to verify 100% type safety.

### Manual Verification
1. Log in as **Club President** who is NOT the event creator. Verify that the Audit Tab is HIDDEN.
2. Log in as **Event Creator** / **SuperAdmin JPP**. Verify Audit Tab is ACCESSIBLE.
3. Open Audit Tab:
   - Check `Purata Juri Se-Booth` badge.
   - Verify booth with fewer jury scores shows 🚨 **Terkurang Juri**.
   - Verify booth with more jury scores shows ⚠️ **Terlebih Juri**.
   - Click **"👁️ Abaikan Amaran"** on a flagged booth. Verify flag turns to `[Amaran Diabaikan]` and row warning clears!
