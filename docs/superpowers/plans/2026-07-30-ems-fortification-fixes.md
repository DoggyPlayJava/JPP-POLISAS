# EMS Fortification & RBAC Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fortify the Event Management System (EMS) by fixing status filtering for completed events, auto-filling student matrix numbers during registration, strictly enforcing RBAC on the leaderboard and lucky draw wheel, adding manual participant registration for directors, and fixing UI typos.

**Architecture:** 
- Enforce strict role-based access control (RBAC) checks across all EMS pages (`EmsDashboardPage.tsx`, `EmsLeaderboardPage.tsx`, `EmsLuckyDrawModal.tsx`) using `useAuth()`.
- Separate public student views from director management views in `EmsDashboardPage.tsx` so completed events only show in the "Acara Selesai" tab and ongoing events only show in "Acara Berlangsung".
- Add manual registration helper in `src/lib/ems.ts` and UI modal in `EmsDashboardPage.tsx`.
- Auto-fill user profile fields (`matrix_no`, `full_name`, `email`, `phone`) in `EmsPublicRegisterPage.tsx`.

**Tech Stack:** React, TypeScript, Supabase Client, Tailwind CSS, Lucide Icons, React Hot Toast.

## Global Constraints
- RLS Policies must use `(SELECT auth.uid())`.
- Never execute sequential queries in loops (N+1 anti-pattern); use `Promise.all`.
- Always clean up Realtime subscriptions (`return () => channel.unsubscribe()`).
- All code must pass `npx tsc --noEmit`.

---

### Task 1: Fix Event Status Filter Logic (`src/pages/ems/EmsDashboardPage.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsDashboardPage.tsx`

**Interfaces:**
- Consumes: `EmsEvent` type, `activeTab` state.
- Produces: Correctly filtered list of events for students and directors.

- [ ] **Step 1: Update status filter logic for student view**

```typescript
const displayedEvents = events.filter((e) => {
  const isOwner = user?.id && e.created_by === user.id;
  const isManager = canCreateEvent || isOwner;

  if (isManager) {
    if (activeTab === 'ALL') return true;
    return e.status === activeTab;
  }

  // Regular Student View
  if (activeTab === 'COMPLETED') {
    return e.status === 'COMPLETED';
  }
  // Default 'ALL' tab for students = Ongoing & Upcoming events ONLY
  return e.status === 'APPROVED' || e.status === 'ACTIVE';
});
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/ems/EmsDashboardPage.tsx
git commit -m "fix(ems): exclude completed events from ongoing student tab"
```

---

### Task 2: Auto-Fill POLISAS Student Matrix Number (`src/pages/ems/EmsPublicRegisterPage.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsPublicRegisterPage.tsx`

**Interfaces:**
- Consumes: `useAuth()` (`user`, `profile`).
- Produces: Auto-filled student profile fields during registration.

- [ ] **Step 1: Add pre-population effect in `EmsPublicRegisterPage.tsx`**

```typescript
useEffect(() => {
  if (user || profile) {
    if (profile?.full_name || user?.user_metadata?.full_name) {
      setLeaderName(profile?.full_name || user?.user_metadata?.full_name || '');
    }
    if (profile?.matrix_no) {
      setMatrixNo(profile.matrix_no);
    }
    if (user?.email) {
      setEmail(user.email);
    }
    if (profile?.phone) {
      setPhone(profile.phone);
    }
  }
}, [user, profile]);
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/ems/EmsPublicRegisterPage.tsx
git commit -m "fix(ems): auto-fill student matrix number and profile details during registration"
```

---

### Task 3: RBAC Fortification on Leaderboard Page (`src/pages/ems/EmsLeaderboardPage.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsLeaderboardPage.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `eventData.created_by`.
- Produces: Strict RBAC guarding for leaderboard management controls and hidden scores curtain.

- [ ] **Step 1: Compute `canManageLeaderboard` guard**

```typescript
const { user, isSuperAdmin, isJppMember, isPresident, isClubMt, isClubAdvisor, isStaff } = useAuth();

const canManageLeaderboard = useMemo(() => {
  if (isSuperAdmin || isJppMember || isPresident || isClubMt || isClubAdvisor || isStaff) return true;
  return !!(user?.id && eventData?.created_by === user.id);
}, [user, isSuperAdmin, isJppMember, isPresident, isClubMt, isClubAdvisor, isStaff, eventData]);
```

- [ ] **Step 2: Guard director controls and stage mode link**

Hide tie-breaker button, visibility toggle switch, and stage mode presentation link if `!canManageLeaderboard`.
If `!canManageLeaderboard` and `!eventData.is_leaderboard_public`, render public curtain overlay ("Keputusan Belum Didedahkan Oleh Penganjur").

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/ems/EmsLeaderboardPage.tsx
git commit -m "security(ems): fortify RBAC on leaderboard page and hide private scores from students"
```

---

### Task 4: RBAC Fortification on Lucky Draw Wheel (`src/pages/ems/EmsDashboardPage.tsx` & `src/components/ems/EmsLuckyDrawModal.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsDashboardPage.tsx`
- Modify: `src/pages/ems/EmsLeaderboardPage.tsx`
- Modify: `src/components/ems/EmsLuckyDrawModal.tsx`

**Interfaces:**
- Consumes: `useAuth()`.
- Produces: Strict RBAC check preventing regular students from rolling the lucky draw wheel.

- [ ] **Step 1: Restrict Lucky Draw Wheel button visibility**

Only display "Roda Cabutan Bertuah" button when `canManage` is true (`isSuperAdmin`, `isJppMember`, or creator).

- [ ] **Step 2: Add authorization check inside `EmsLuckyDrawModal.tsx`**

Inside `EmsLuckyDrawModal.tsx`, perform RBAC verification with `useAuth()`. If non-manager attempts to spin, show toast error "Hanya Pengarah Program atau Admin JPP dibenarkan memutar Roda Cabutan Bertuah."

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/ems/EmsDashboardPage.tsx src/pages/ems/EmsLeaderboardPage.tsx src/components/ems/EmsLuckyDrawModal.tsx
git commit -m "security(ems): restrict lucky draw wheel execution to directors and admins"
```

---

### Task 5: Manual Participant Registration Modal for Directors (`src/lib/ems.ts` & `src/pages/ems/EmsDashboardPage.tsx`)

**Files:**
- Modify: `src/lib/ems.ts`
- Modify: `src/pages/ems/EmsDashboardPage.tsx`

**Interfaces:**
- Consumes: Participant registration fields.
- Produces: `createEmsParticipantManual` API function and Director Manual Registration Modal.

- [ ] **Step 1: Export `createEmsParticipantManual` in `src/lib/ems.ts`**

```typescript
export async function createEmsParticipantManual(participantData: {
  event_id: string;
  participant_type: string;
  entity_mode: string;
  team_name?: string;
  booth_no?: string;
  category_name?: string;
  leader_name: string;
  matrix_no?: string;
  email?: string;
  phone?: string;
}): Promise<EmsParticipant> {
  const { data, error } = await supabase
    .from('ems_participants')
    .insert([participantData])
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Implement "Pendaftaran Manual (Urus Setia)" Modal in `EmsDashboardPage.tsx`**

Add button "+ Pendaftaran Manual" on event card for managers, opening a clean modal to input team/leader details directly.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/ems.ts src/pages/ems/EmsDashboardPage.tsx
git commit -m "feat(ems): add manual participant registration modal for program directors"
```

---

### Task 6: Typo Fix ("Muka Check-in" -> "Mula Check-in")

**Files:**
- Modify: `src/pages/ems/EmsCheckinPage.tsx` and any other affected files.

- [ ] **Step 1: Replace all occurrences of "Muka Check-in" with "Mula Check-in"**
- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "fix(ems): fix typo Muka Check-in to Mula Check-in"
```

---

## Verification Plan

### Automated Tests
- Run `npx tsc --noEmit` to verify type safety.

### Manual Verification
1. Log in as a regular student and verify:
   - Ongoing events tab does NOT show COMPLETED events.
   - Matrix number auto-fills automatically on the public registration form.
   - Leaderboard page hides management controls and hides unrevealed scores.
   - Lucky Draw Wheel button is hidden.
2. Log in as Program Director / Admin JPP and verify:
   - Completed events show under "Selesai".
   - Full management controls are available on Dashboard & Leaderboard.
   - "Pendaftaran Manual" modal allows registering participants directly.
   - Lucky Draw Wheel can be opened and spun.
