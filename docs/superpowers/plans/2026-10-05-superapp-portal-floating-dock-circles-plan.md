# SuperApp Portal: Floating Discrete Action Circles Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the murky gray dock pill container and replace it with three sleek, floating circular action buttons (ThemeToggle, NotificationBell, UserAvatar) with `gap-3` spacing, subtle frosted jewel styling, and an emerald-accented profile ring.

**Architecture:**
1. Upgrade `SuperAppHeader.tsx`: Remove the outer bounding pill (`rounded-2xl bg-white/[0.08]`) and divider lines (`divide-x`). Replace with an open flex row `flex items-center gap-3 shrink-0` containing three individual 36px circular buttons (`w-9 h-9 rounded-full`).
2. Update tests in `src/__tests__/superAppPortal.test.ts` to assert the presence of discrete circular buttons and absence of the gray dock pill.
3. Update `DEV_GUIDELINE.md` and verify full test suite and production build.

**Tech Stack:** React 19, Tailwind CSS v4, Framer Motion, Lucide React, Vitest.

## Global Constraints
- `PolySuaraReactions.tsx` must NOT be touched or modified.
- All 15 test suites and 205+ tests must pass cleanly.
- `npm run build` must compile with 0 errors.
- Preserve all existing functionality: `onOpenSidebar`, `ThemeToggle`, `NotificationBell`, and `triggerCommandPalette`.

---

### Task 1: Floating Discrete Action Circles in `SuperAppHeader.tsx`

**Files:**
- Modify: `src/components/portal/SuperAppHeader.tsx`
- Test: `src/__tests__/superAppPortal.test.ts`

**Interfaces:**
- Container: `flex items-center gap-3 shrink-0`
- ThemeToggle circle wrapper: `w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md shadow-sm flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-95 shrink-0 [&_button]:!h-9 [&_button]:!w-9 [&_button]:!rounded-full [&_button]:!bg-transparent [&_button]:hover:!bg-transparent [&_button]:!p-0`
- NotificationBell circle wrapper: `w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md shadow-sm flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-95 shrink-0 [&_button]:!h-9 [&_button]:!w-9 [&_button]:!rounded-full [&_button]:!bg-transparent [&_button]:hover:!bg-transparent [&_button]:!p-0`
- Profile button: `tour-navbar-profile relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-emerald-400/60 hover:ring-emerald-400 active:scale-95 transition-all shadow-md focus:outline-none cursor-pointer shrink-0`
- Avatar fallback: `bg-gradient-to-tr from-emerald-600 to-teal-500 text-white text-[11px] font-black rounded-full`

- [ ] **Step 1: Write failing unit test in `src/__tests__/superAppPortal.test.ts`**

Assert that `SuperAppHeader` renders:
1. `flex items-center gap-3 shrink-0` for the action controls container.
2. Does NOT contain the legacy dock capsule `divide-x` or `rounded-2xl bg-white/[0.08]`.
3. Circular wrappers for ThemeToggle and NotificationBell with `w-9 h-9 rounded-full`.
4. Profile avatar button with `w-9 h-9 rounded-full ring-2 ring-emerald-400/60`.

- [ ] **Step 2: Run test to confirm it fails (RED)**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `SuperAppHeader.tsx`**

Implement the floating discrete action circles with `gap-3`.

- [ ] **Step 4: Run test to confirm it passes (GREEN)**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/portal/SuperAppHeader.tsx src/__tests__/superAppPortal.test.ts
git commit -m "feat(portal): replace murky dock pill with floating discrete action circles"
```

---

### Task 2: Full Suite Verification & Documentation Update

**Files:**
- Modify: `DEV_GUIDELINE.md`
- Test: Full repository test suite

- [ ] **Step 1: Update `DEV_GUIDELINE.md`**

Document the floating discrete action circles in Section 29 of `DEV_GUIDELINE.md`.

- [ ] **Step 2: Run all unit tests**

Run: `npm test -- --run`
Expected: All 15 test suites pass (100% green).

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs(portal): document floating discrete action circles header design"
```
