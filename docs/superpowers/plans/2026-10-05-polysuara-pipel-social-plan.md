# PolySuara Next-Gen Campus Social App (Pipel / Dribbble UI/UX) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul PolySuara into a next-generation campus social media experience inspired by the user's uploaded Pipel and Dribbble UI references. Implement the top Campus Pulse story ring track, an animated 3-way social tab bar (Untuk Anda / Terkini / Hangat), elevated `rounded-[2rem]` floating social cards with gradient avatar rings, and a radiant center Floating Action Button (FAB `+`).

**Architecture:** Componentized social feed with modular `CampusPulseBar`, `SocialTabNav`, and `FloatingComposeFab` wrapped in an executive glass and card-in-canvas aesthetic with hardware-accelerated Framer Motion animations.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, Supabase PostgreSQL, Lucide React icons, Vitest.

## Global Constraints
- Target branch: `feat/campus-super-app-portal`.
- Strict RLS: Always write `(SELECT auth.uid())`.
- Low-end mobile device performance: `transform-gpu`, touch targets min 44px, bottom dock clearance for `BottomNav`.
- Full Dual Light and Dark mode parity across all components.

---

### Task 1: CampusPulseBar Component (Story-Style Mood Rings)

**Files:**
- Create: `src/components/polysuara/CampusPulseBar.tsx`
- Create/Test: `src/__tests__/campusPulseBar.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface PulseItem {
    id: string;
    label: string;
    emoji: string;
    gradientRing: string;
    categoryFilter?: string;
    isCreate?: boolean;
  }
  export interface CampusPulseBarProps {
    activePulseId: string;
    onSelectPulse: (id: string, categoryFilter?: string) => void;
    onOpenCompose: () => void;
    className?: string;
  }
  export const CampusPulseBar: React.FC<CampusPulseBarProps>;
  ```

- [ ] **Step 1: Write unit tests in `src/__tests__/campusPulseBar.test.ts`**
  - Verify render of `+ Luahkan` bubble and topic bubbles ('Hangat', 'Exam', 'Kamsis', 'Kafe', 'Aduan').
  - Verify clicking `+ Luahkan` calls `onOpenCompose()`.
  - Verify clicking a topic bubble calls `onSelectPulse(id, categoryFilter)`.
  - Verify active bubble highlighting with gradient ring.
  - Verify dual Light & Dark mode classes.
- [ ] **Step 2: Run test to confirm it fails (RED)**
- [ ] **Step 3: Implement `src/components/polysuara/CampusPulseBar.tsx`**
- [ ] **Step 4: Re-run test and verify all pass (GREEN)**
- [ ] **Step 5: Commit with message: `feat(polysuara): implement story-style CampusPulseBar component`**

---

### Task 2: SocialTabNav Component (Animated 3-Way Tabs)

**Files:**
- Create: `src/components/polysuara/SocialTabNav.tsx`
- Create/Test: `src/__tests__/socialTabNav.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type SocialTabType = 'FOR_YOU' | 'LATEST' | 'TRENDING';
  export interface SocialTabNavProps {
    activeTab: SocialTabType;
    onChangeTab: (tab: SocialTabType) => void;
    className?: string;
  }
  export const SocialTabNav: React.FC<SocialTabNavProps>;
  ```

- [ ] **Step 1: Write unit tests in `src/__tests__/socialTabNav.test.ts`**
  - Verify rendering of all 3 tabs: 'Untuk Anda', 'Terkini', 'Hangat'.
  - Verify clicking a tab calls `onChangeTab(tab)`.
  - Verify Framer Motion active underline slider.
- [ ] **Step 2: Run test to confirm it fails (RED)**
- [ ] **Step 3: Implement `src/components/polysuara/SocialTabNav.tsx`**
- [ ] **Step 4: Re-run test and verify all pass (GREEN)**
- [ ] **Step 5: Commit with message: `feat(polysuara): implement animated SocialTabNav 3-way feed switcher`**

---

### Task 3: FloatingComposeFab Component (Radiant Center Action Button)

**Files:**
- Create: `src/components/polysuara/FloatingComposeFab.tsx`
- Create/Test: `src/__tests__/floatingComposeFab.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface FloatingComposeFabProps {
    onClick: () => void;
    className?: string;
  }
  export const FloatingComposeFab: React.FC<FloatingComposeFabProps>;
  ```

- [ ] **Step 1: Write unit tests in `src/__tests__/floatingComposeFab.test.ts`**
  - Verify rendering of floating FAB with `+` icon and accessible label.
  - Verify click calls `onClick()`.
  - Verify radiant gradient and pulsing glow styling.
- [ ] **Step 2: Run test to confirm it fails (RED)**
- [ ] **Step 3: Implement `src/components/polysuara/FloatingComposeFab.tsx`**
- [ ] **Step 4: Re-run test and verify all pass (GREEN)**
- [ ] **Step 5: Commit with message: `feat(polysuara): implement radiant FloatingComposeFab component`**

---

### Task 4: Integrate Pipel/Dribbble Social Feed Experience in `PolySuaraPage.tsx`

**Files:**
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/__tests__/polySuaraPage.test.ts`

**Interfaces:**
- Integrates:
  - `CampusPulseBar` at top of feed.
  - `SocialTabNav` with feed filtering ('FOR_YOU', 'LATEST', 'TRENDING').
  - Elevated `rounded-[2rem]` floating cards with neon gradient avatar rings, bold username, verified checkmark (✓), and Pipel-style social action row (WhatsApp reactions + Dislike + Comments + Paper plane share + Bookmark).
  - Center `FloatingComposeFab` with `BottomNav` dock clearance.

- [ ] **Step 1: Write integration tests in `src/__tests__/polySuaraPage.test.ts`**
- [ ] **Step 2: Update `PolySuaraPage.tsx` with all components and elevated floating card styles**
- [ ] **Step 3: Re-run tests and verify all pass (GREEN)**
- [ ] **Step 4: Commit with message: `feat(polysuara): assemble full Pipel/Dribbble social experience in PolySuaraPage`**

---

### Task 5: Documentation Update (`DEV_GUIDELINE.md`) & Quality Gate

**Files:**
- Modify: `DEV_GUIDELINE.md`

- [ ] **Step 1: Update Section 30 in `DEV_GUIDELINE.md`**
- [ ] **Step 2: Run all unit tests: `npm test -- --run`**
- [ ] **Step 3: Run production build: `npm run build`**
- [ ] **Step 4: Verify dev server returns 200 OK on `/polysuara`**
- [ ] **Step 5: Commit with message: `docs(polysuara): document next-gen Pipel social architecture in DEV_GUIDELINE`**
