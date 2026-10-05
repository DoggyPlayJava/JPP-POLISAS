# PolySuara Minimalist Social Feed (Threads / X Aesthetic) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign PolySuara into a minimalist, uncluttered campus social media platform inspired by Threads and X. Remove all sticker clutter, implement a sleek Threads-style Quick-Compose Bar + Modal, streamline categories and sorting into a single-line navigation track, and upgrade confession cards into airy, editorial microblog posts.

**Architecture:** A streamlined social feed with a quick prompt capsule triggering a focused compose dialog, unified single-line feed filters, clean editorial card typography, and the WhatsApp-style floating reaction engine.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, Supabase PostgreSQL, Lucide React icons, Vitest.

## Global Constraints
- Target branch: `feat/campus-super-app-portal`.
- Strict RLS: Always write `(SELECT auth.uid())`.
- Low-end mobile device performance: `transform-gpu`, airy layout with reduced DOM complexity, touch targets min 44px.
- Bottom dock clearance: `pb-36` with mobile spacer `<div className="h-28 md:hidden" />`.
- Full Dual Light and Dark mode parity across all components.

---

### Task 1: Deprecate Sticker Elements & Strip Legacy Tokens

**Files:**
- Modify: `src/lib/polySuaraHelpers.ts`
- Modify: `src/__tests__/polySuaraHelpers.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export function cleanConfessionText(content: string): string;
  ```
  Ensures any legacy `[sticker:...]` token is completely stripped from visible text, leaving only the author's authentic words.

- [ ] **Step 1: Write test for `cleanConfessionText` in `src/__tests__/polySuaraHelpers.test.ts`**
- [ ] **Step 2: Run test with `npx vitest run src/__tests__/polySuaraHelpers.test.ts` to watch it fail (RED)**
- [ ] **Step 3: Implement `cleanConfessionText` in `src/lib/polySuaraHelpers.ts`**
- [ ] **Step 4: Re-run test and verify all pass (GREEN)**
- [ ] **Step 5: Commit with message: `refactor(polysuara): add cleanConfessionText and deprecate sticker formatting`**

---

### Task 2: Threads-Style Quick-Compose Capsule & Compose Modal

**Files:**
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/__tests__/polySuaraPage.test.ts`

**Interfaces:**
- Replaces bulky static form on the feed with:
  - Interactive Quick-Compose capsule: `[✍️ Avatar] "Ada luahan atau rahsia kampus? Kongsi secara rahsia..." [Image] [Poll]`
  - Clicking opens `<ComposeModal />` (mobile bottom sheet / desktop centered modal).
  - Inside Compose Modal: spacious textarea, category chips, optional image attachment preview, poll options, character counter, and "Kongsi Luahan" button.
  - Zero sticker buttons or pickers.

- [ ] **Step 1: Write unit tests in `src/__tests__/polySuaraPage.test.ts` verifying quick-compose capsule and compose modal states**
- [ ] **Step 2: Run tests to confirm failures (RED)**
- [ ] **Step 3: Implement quick-compose capsule and compose modal in `PolySuaraPage.tsx`**
- [ ] **Step 4: Re-run tests and verify all pass (GREEN)**
- [ ] **Step 5: Commit with message: `feat(polysuara): implement Threads-style quick-compose capsule and modal`**

---

### Task 3: Single-Line Streamlined Feed Navigation Bar

**Files:**
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/__tests__/polySuaraPage.test.ts`

**Interfaces:**
- Combines Sort toggles (`✨ Terkini` / `🔥 Hangat`) and Category filter chips (`SEMUA`, `AKADEMIK`, `FASILITI`, `KAMSIS`, `KAUNSELING`) into a single horizontal track with a vertical divider.
- Replaces vertically stacked filter blocks, saving ~80px of vertical space.

- [ ] **Step 1: Write unit tests in `src/__tests__/polySuaraPage.test.ts` for unified feed navigation track**
- [ ] **Step 2: Implement single-line horizontal track in `PolySuaraPage.tsx`**
- [ ] **Step 3: Re-run tests and verify all pass (GREEN)**
- [ ] **Step 4: Commit with message: `feat(polysuara): consolidate sort and category navigation into single-line track`**

---

### Task 4: Editorial Confession Card & Action Bar Refinement

**Files:**
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/__tests__/polySuaraComments.test.ts`

**Interfaces:**
- Confession Card Layout:
  - Header: Animal avatar squircle + Codename + relative timestamp + at most 1 subtle category badge.
  - Body: `text-[15px] sm:text-base leading-relaxed` with comfortable line height using `cleanConfessionText`.
  - Media & Poll: Clean rounded-2xl containers.
  - Engagement Row:
    - `<PolySuaraReactions />` (WhatsApp reaction popover + active reaction pills).
    - Subtle Dislike button (👎 with count).
    - Comments button (💬 with count, opens Comments Drawer).
    - Share button (Share2).
    - Report action (Flag / AlertTriangle).
- Comments Drawer:
  - Clean discussion sheet without sticker buttons or sticker badges.
  - Distraction-free comment list with thread indicators and bottom input dock.

- [ ] **Step 1: Update tests in `src/__tests__/polySuaraComments.test.ts` and `src/__tests__/polySuaraPage.test.ts`**
- [ ] **Step 2: Implement refined card and clean comments drawer in `PolySuaraPage.tsx`**
- [ ] **Step 3: Re-run tests and verify all pass (GREEN)**
- [ ] **Step 4: Commit with message: `feat(polysuara): refine confession card and comments drawer to minimalist social aesthetic`**

---

### Task 5: Documentation Update (`DEV_GUIDELINE.md`) & Quality Gate

**Files:**
- Modify: `DEV_GUIDELINE.md` (Update Section 30 to reflect the minimalist Threads-style social feed)

- [ ] **Step 1: Update Section 30 in `DEV_GUIDELINE.md`**
- [ ] **Step 2: Run all unit tests: `npm test -- --run`**
- [ ] **Step 3: Run production build: `npm run build`**
- [ ] **Step 4: Verify dev server returns 200 OK on `/polysuara`**
- [ ] **Step 5: Commit with message: `docs(polysuara): update guidelines with minimalist social feed architecture`**
