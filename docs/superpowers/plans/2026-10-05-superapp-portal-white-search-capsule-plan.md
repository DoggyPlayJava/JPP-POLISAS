# SuperApp Portal White Search Capsule & Ambient Contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the SuperApp Portal (`/portal`) with a crisp, pure white stadium search capsule (`bg-white rounded-full`), an ultra-clear frosted glass dock with an emerald-ringed avatar, and vibrant cyber luminescent service cards with distinct elevation hierarchy.

**Architecture:**
1. Upgrade `SuperAppHeader.tsx`: Replace dark search button with a high-contrast white stadium capsule (`bg-white shadow-[0_8px_30px_rgba(0,0,0,0.18)]`), mint magnifying glass badge, and update dock capsule to ultra-clear frosted glass with emerald ring avatar.
2. Upgrade `CampusServicesGrid.tsx`: Remove the `dark:bg-white/[0.06]` squircle tint suppression, add vibrant cyber luminescent micro-glows to all 8 service icons, and add elevated card depth in dark mode.
3. Verify test coverage and document in `DEV_GUIDELINE.md`.

**Tech Stack:** React 19, Tailwind CSS v4, Framer Motion, Lucide React, Vitest.

## Global Constraints
- `PolySuaraReactions.tsx` must NOT be touched or modified.
- All 15 test suites and 204+ tests must pass cleanly.
- `npm run build` must compile with 0 errors.

---

### Task 1: Pure White Stadium Search Capsule & Ultra-Clear Frosted Dock in `SuperAppHeader.tsx`

**Files:**
- Modify: `src/components/portal/SuperAppHeader.tsx`
- Test: `src/__tests__/superAppPortal.test.ts`

**Interfaces:**
- Search capsule button: `w-full h-12 px-4 rounded-full bg-white hover:bg-slate-50 text-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.18)] hover:shadow-[0_10px_35px_rgba(0,0,0,0.22)] border border-white/40 flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] group cursor-pointer`
- Search icon container: `w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`
- Placeholder text: `text-xs sm:text-sm text-slate-500 group-hover:text-slate-700 font-medium truncate` ("Cari makanan, runner, servis, acara, merit...")
- Kbd badge: `hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 rounded-full border border-slate-200/80`
- Top-Right Dock Capsule: `inline-flex items-center p-1 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 divide-x divide-white/10 shadow-lg shrink-0`
- Avatar button: `relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-emerald-400/50 hover:ring-emerald-400/80 active:scale-95 transition-all shadow-sm focus:outline-none cursor-pointer shrink-0`
- Avatar fallback: `bg-gradient-to-tr from-emerald-600 to-teal-500 text-white text-[11px] font-black rounded-full`
- Header bottom border: `border-b border-emerald-500/20 shadow-[0_12px_32px_rgba(0,0,0,0.35)]`

- [ ] **Step 1: Write failing unit test in `src/__tests__/superAppPortal.test.ts`**

Add tests asserting:
1. `SuperAppHeader` renders the pure white stadium search capsule with `bg-white`, `rounded-full`, and `shadow-[0_8px_30px_rgba(0,0,0,0.18)]`.
2. `SuperAppHeader` renders the updated placeholder `"Cari makanan, runner, servis, acara, merit..."`.
3. `SuperAppHeader` renders the ultra-clear dock with `bg-white/[0.08]` and avatar with `ring-2 ring-emerald-400/50`.

- [ ] **Step 2: Run test to confirm it fails (RED)**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `SuperAppHeader.tsx`**

Implement the white search capsule, ultra-clear dock, and emerald ring avatar.

- [ ] **Step 4: Run test to confirm it passes (GREEN)**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/portal/SuperAppHeader.tsx src/__tests__/superAppPortal.test.ts
git commit -m "feat(portal): add pure white stadium search capsule and ultra-clear frosted dock"
```

---

### Task 2: Cyber Luminescent Service Cards & Ambient Contrast in `CampusServicesGrid.tsx`

**Files:**
- Modify: `src/components/portal/CampusServicesGrid.tsx`
- Test: `src/__tests__/superAppPortal.test.ts`

**Interfaces:**
- Remove hardcoded `dark:bg-white/[0.06] dark:border dark:border-white/10 dark:shadow-inner` from the icon container.
- Outer card button container:
  - Light mode: `bg-white hover:bg-slate-50 border border-slate-200/70 hover:border-emerald-400/40 shadow-xs hover:shadow-md rounded-2xl sm:rounded-3xl`
  - Dark mode: `dark:bg-slate-900/80 dark:hover:bg-slate-800/90 dark:backdrop-blur-md dark:border-white/[0.08] dark:hover:border-emerald-500/30 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]`
- `SERVICE_STYLES`:
  - `polysuara`: `bg-rose-50 text-rose-600 border-rose-200 shadow-xs dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/40 dark:shadow-[0_0_12px_rgba(244,63,94,0.3)]`
  - `polymart`: `bg-amber-50 text-amber-600 border-amber-200 shadow-xs dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40 dark:shadow-[0_0_12px_rgba(245,158,11,0.3)]`
  - `takwim`: `bg-indigo-50 text-indigo-600 border-indigo-200 shadow-xs dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/40 dark:shadow-[0_0_12px_rgba(99,102,241,0.3)]`
  - `polymaps`: `bg-emerald-50 text-emerald-600 border-emerald-200 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40 dark:shadow-[0_0_12px_rgba(16,185,129,0.3)]`
  - `polyrent`: `bg-cyan-50 text-cyan-600 border-cyan-200 shadow-xs dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-500/40 dark:shadow-[0_0_12px_rgba(6,182,212,0.3)]`
  - `kebajikan`: `bg-teal-50 text-teal-600 border-teal-200 shadow-xs dark:bg-teal-500/20 dark:text-teal-400 dark:border-teal-500/40 dark:shadow-[0_0_12px_rgba(20,184,166,0.3)]`
  - `akademik_qr`: `bg-purple-50 text-purple-600 border-purple-200 shadow-xs dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/40 dark:shadow-[0_0_12px_rgba(168,85,247,0.3)]`
  - `ekpp`: `bg-blue-50 text-blue-600 border-blue-200 shadow-xs dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40 dark:shadow-[0_0_12px_rgba(59,130,246,0.3)]`

- [ ] **Step 1: Write failing unit test in `src/__tests__/superAppPortal.test.ts`**

Assert that `CampusServicesGrid` renders the cyber luminescent squircle tokens and elevated dark card styling.

- [ ] **Step 2: Run test to confirm it fails (RED)**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `CampusServicesGrid.tsx`**

Implement the updated `SERVICE_STYLES` and card container tokens.

- [ ] **Step 4: Run test to confirm it passes (GREEN)**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/portal/CampusServicesGrid.tsx src/__tests__/superAppPortal.test.ts
git commit -m "feat(portal): add cyber luminescent service cards and elevated card depth"
```

---

### Task 3: Full Suite Verification & Documentation Update

**Files:**
- Modify: `DEV_GUIDELINE.md`
- Test: All test suites

- [ ] **Step 1: Update `DEV_GUIDELINE.md`**

Document the white stadium search capsule and cyber luminescent services grid in the Portal section.

- [ ] **Step 2: Run all unit tests**

Run: `npm test -- --run`
Expected: All 15 test suites pass (100% green).

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs(portal): document white search capsule and cyber luminescent service cards"
```
