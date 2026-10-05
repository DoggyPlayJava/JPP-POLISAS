# PolySuara Apple Porcelain Light Mode, Threads Comments & 1-Hour Self-Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Like/Dislike mutual exclusivity and state synchronization, hide BottomNav and FloatingAiChat while modal/drawer popouts are open via React Portal, rework the comments drawer with friendly animal personas (replacing robotic `Anon-eb689`) and up to 4-depth nested replies, implement 1-hour self-delete with tombstone messages, and overhaul PolySuaraPoll and PolySuara into a luxurious 'Apple Porcelain & Rose Glow' Light Mode.

**Architecture:**
1. State Synchronization: Consolidate `confessionReactions`, `upvotes`, and `userDownvotes` into a single mutually exclusive voting flow.
2. Obstruction Elimination: Conditionally hide BottomNav and FloatingAiChat during modal/drawer states and mount popouts at `document.body` via `createPortal`.
3. Threads-Style Comments: Replace hash codenames with deterministic friendly campus animals (`getFriendlyAnonName`) and support 4-level deep nested comments with compact indentation.
4. 1-Hour Self-Delete: Author can delete within 60 minutes of creation, converting text into a clean tombstone: `"<nama> telah memadamkan ruangan ini"`.
5. Apple Porcelain Light Mode: Transform `PolySuaraPoll.tsx` and confession cards from dark concrete muddy gray into pure white porcelain cards with vibrant rose progress bars and Apple micro-shadows.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion (`motion/react`), Lucide React, Vitest, React Testing Library.

## Global Constraints
- Strict mutual exclusivity between Like (❤️) and Dislike (👎).
- Modals/Drawers must be mounted via `createPortal(..., document.body)` with `z-[99999]` and `BottomNav` / `FloatingAiChat` hidden when open.
- Friendly animal codenames must be deterministic so the same user keeps the same animal in that thread.
- 1-hour self-delete only permitted if `Date.now() - new Date(created_at).getTime() <= 60 * 60 * 1000`.
- All Vitest test suites must pass 100% with zero regressions.

---

### Task 1: Fix Like (❤️) vs Dislike (👎) Mutual Exclusivity and State Synchronization

**Files:**
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/__tests__/polySuaraPage.test.ts`

**Interfaces:**
- `handleToggleReaction(confessionId: string, reactionType: string)`:
  - If user currently has `userDownvotes.has(confessionId)`:
    - Remove from `userDownvotes`, decrement `downvotes` by 1, delete from `polysuara_downvotes`.
  - If user already reacted with this `reactionType`:
    - Remove from `confessionReactions`, decrement `upvotes` by 1, delete from `polysuara_reactions`.
  - If user adding reaction:
    - Add to `confessionReactions`, increment `upvotes` by 1, insert into `polysuara_reactions`.
- `handleDownvote(confessionId: string)`:
  - If user currently has any reaction in `confessionReactions[confessionId]`:
    - Remove user's reactions, decrement `upvotes` by 1, delete from `polysuara_reactions`.
  - If user currently has downvoted (`userDownvotes.has(confessionId)`):
    - Remove from `userDownvotes`, decrement `downvotes` by 1, delete/rpc from `polysuara_downvotes`.
  - If user adding downvote:
    - Add to `userDownvotes`, increment `downvotes` by 1, rpc `toggle_polysuara_downvote`.

- [ ] **Step 1: Write failing unit test in `src/__tests__/polySuaraPage.test.ts`**

Add tests for:
1. Like increments from 28 to 29.
2. Subsequent Dislike cancels Like (upvotes returns to 28, downvotes becomes 1).
3. Subsequent Like cancels Dislike (downvotes returns to 0, upvotes becomes 29).
4. Un-liking decrements upvotes by 1.

- [ ] **Step 2: Run test to confirm it fails (RED)**

Run: `npx vitest run src/__tests__/polySuaraPage.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement unified mutual exclusivity in `src/pages/polyservices/PolySuaraPage.tsx`**

Update `handleToggleReaction` and `handleDownvote`:
- In `handleToggleReaction`:
  - Check `userDownvotes.has(confessionId)`. If true, cancel downvote (remove from `userDownvotes`, `c.downvotes = Math.max((c.downvotes || 0) - 1, 0)`).
  - Check `hasReacted`. If true, decrement `upvotes: Math.max((c.upvotes || 0) - 1, 0)`.
  - If false, increment `upvotes: (c.upvotes || 0) + 1`.
- In `handleDownvote`:
  - Check if `confessionReactions[confessionId]` has current user reaction. If true, cancel reaction (remove from `confessionReactions`, `c.upvotes = Math.max((c.upvotes || 0) - 1, 0)`).
  - Check `isCurrentlyDownvoted`. If true, decrement `downvotes: Math.max((c.downvotes || 0) - 1, 0)`.
  - If false, increment `downvotes: (c.downvotes || 0) + 1`.

- [ ] **Step 4: Run test to confirm it passes (GREEN)**

Run: `npx vitest run src/__tests__/polySuaraPage.test.ts`  
Expected: PASS 100%

- [ ] **Step 5: Commit**

```bash
git add src/pages/polyservices/PolySuaraPage.tsx src/__tests__/polySuaraPage.test.ts
git commit -m "fix(polysuara): enforce strict mutual exclusivity and state sync for like and dislike"
```

---

### Task 2: Hide BottomNav & FloatingAiChat During Modal/Drawer Popouts with React Portal

**Files:**
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/__tests__/polySuaraPage.test.ts`

**Interfaces:**
- Modal mounting: Use `createPortal(modalJsx, document.body)` for `composeModalOpen` and `commentDrawerOpen`.
- Conditional rendering of global chrome:
  ```tsx
  {!composeModalOpen && !commentDrawerOpen && (
    <>
      <BottomNav />
      <FloatingAiChat />
    </>
  )}
  ```

- [ ] **Step 1: Write test in `src/__tests__/polySuaraPage.test.ts`**

Verify that:
1. When `composeModalOpen` is true or `commentDrawerOpen` is true, `<BottomNav />` and `<FloatingAiChat />` are not in the DOM.
2. Compose modal and comments drawer are mounted via portal with `z-[99999]`.

- [ ] **Step 2: Update `PolySuaraPage.tsx` to portal popouts and conditionally hide chrome**

1. Import `createPortal` from `react-dom`.
2. Wrap `composeModalOpen` JSX in `typeof document !== 'undefined' ? createPortal(...) : null`.
3. Wrap `commentDrawerOpen` JSX in `typeof document !== 'undefined' ? createPortal(...) : null`.
4. Wrap `<BottomNav />` and `<FloatingAiChat />` in `{!composeModalOpen && !commentDrawerOpen && (...)}`.

- [ ] **Step 3: Run test to confirm it passes**

Run: `npx vitest run src/__tests__/polySuaraPage.test.ts`  
Expected: PASS 100%

- [ ] **Step 4: Commit**

```bash
git add src/pages/polyservices/PolySuaraPage.tsx src/__tests__/polySuaraPage.test.ts
git commit -m "feat(polysuara): hide bottom navigation and ai chat during modal popout with portal elevation"
```

---

### Task 3: Friendly Campus Animal Personas & 4-Depth Nested Comments

**Files:**
- Modify: `src/lib/polySuaraHelpers.ts`
- Modify: `src/__tests__/polySuaraHelpers.test.ts`
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/__tests__/polySuaraComments.test.ts`

**Interfaces:**
- `getFriendlyAnonName(codename: string, isOP?: boolean)`:
  ```typescript
  export interface FriendlyAnonPersona {
    displayName: string;
    emoji: string;
    bgClass: string;
  }
  ```
  - Maps `Anon-eb689` to deterministic animal + adjective (e.g. `Kucing Oren 🐱`, `Tupai Laju 🐿️`, `Panda Comel 🐼`, `Arnab Pantas 🐰`, `Musang Cerdik 🦊`, `Koala Tenang 🐨`, `Helang Biru 🦅`, `Rusa Riang 🦌`).
- Nested comment depth:
  - In `PolySuaraPage.tsx`, structure comment replies recursively up to depth 4 (`parent_id` chain).
  - Display with compact 12px indentation and `@ParentName` tag in the comment body.
  - Right-aligned micro-heart button for comment like.
  - Discrete `···` action menu for report and help.
  - Floating pill comment input bar (`rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10`).

- [ ] **Step 1: Write unit tests in `src/__tests__/polySuaraHelpers.test.ts`**

Test:
1. `getFriendlyAnonName('Anon-eb689')` returns deterministic friendly name (e.g. `Kucing Oren`, `emoji: '🐱'`).
2. Two calls with the same codename return the exact same persona.
3. OP codename displays OP persona with proper formatting.

- [ ] **Step 2: Implement `getFriendlyAnonName` in `src/lib/polySuaraHelpers.ts`**

Define an array of 20+ friendly Malaysian campus personas:
`['Kucing Oren', 'Tupai Laju', 'Panda Comel', 'Arnab Pantas', 'Musang Cerdik', 'Koala Tenang', 'Helang Biru', 'Rusa Riang', 'Singa Santai', 'Beruang Madu', 'Kancil Bijak', 'Otter Ceria']`
Hash the input codename deterministically to pick an index.

- [ ] **Step 3: Update Comments Drawer in `src/pages/polyservices/PolySuaraPage.tsx`**

1. Replace `Anon-xxxxx` display with `getFriendlyAnonName(comment.codename)`.
2. Render threaded replies up to depth 4 with compact 12px indent and `@Mention`.
3. Add right-aligned micro-heart button for comments.
4. Replace cluttered shield/alert icons with clean `···` action trigger.
5. Upgrade comment input to rounded-full pill capsule.

- [ ] **Step 4: Run tests to verify passes**

Run: `npx vitest run src/__tests__/polySuaraHelpers.test.ts src/__tests__/polySuaraComments.test.ts`  
Expected: PASS 100%

- [ ] **Step 5: Commit**

```bash
git add src/lib/polySuaraHelpers.ts src/__tests__/polySuaraHelpers.test.ts src/pages/polyservices/PolySuaraPage.tsx src/__tests__/polySuaraComments.test.ts
git commit -m "feat(polysuara): add friendly animal personas and 4-depth nested comments"
```

---

### Task 4: 1-Hour Self-Delete Feature for Confessions and Comments

**Files:**
- Modify: `src/lib/polySuaraHelpers.ts`
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/__tests__/polySuaraPage.test.ts`
- Modify: `src/__tests__/polySuaraComments.test.ts`

**Interfaces:**
- Helper: `isWithin1Hour(createdAt: string): boolean`:
  ```typescript
  export function isWithin1Hour(createdAt: string): boolean {
    if (!createdAt) return false;
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return diffMs >= 0 && diffMs <= 60 * 60 * 1000;
  }
  ```
- Confession Delete:
  - If `confession.author_id === profile.id && isWithin1Hour(confession.created_at)`:
    - Display "Padam" button in card options.
    - On delete: Updates content to `[deleted]` tombstone or calls soft-delete/RPC. In UI, shows: `"${confession.codename || 'Penulis'} telah memadamkan ruangan ini"`.
- Comment Delete:
  - If `comment.user_id === profile.id && isWithin1Hour(comment.created_at)`:
    - Display "Padam" button in comment actions.
    - On delete: Shows `"${persona.displayName} telah memadamkan ruangan ini"`.
- Tombstone card:
  - Styled with subtle italic muted slate text (`text-slate-400 dark:text-slate-500 italic text-xs flex items-center gap-1.5`).
  - Like, Dislike, and Balas actions are disabled on deleted items.

- [ ] **Step 1: Write unit tests in `src/__tests__/polySuaraComments.test.ts` and `src/__tests__/polySuaraPage.test.ts`**

Test:
1. `isWithin1Hour` returns true for created_at within 60 minutes, false for 61+ minutes.
2. Delete button is shown for author within 1 hour and hidden after 1 hour.
3. Deleting turns content into tombstone message: `"<nama> telah memadamkan ruangan ini"`.

- [ ] **Step 2: Implement self-delete handlers in `PolySuaraPage.tsx`**

1. `handleDeleteConfession(id: string)`:
   - Verifies author & within 1 hour.
   - Deletes/updates confession record in Supabase.
   - Updates local state with tombstone text or marks `is_deleted_by_author = true`.
2. `handleDeleteComment(id: string)`:
   - Verifies author & within 1 hour.
   - Deletes/updates comment record in Supabase.
   - Updates local state with tombstone text.

- [ ] **Step 3: Run tests to verify passes**

Run: `npx vitest run src/__tests__/polySuaraPage.test.ts src/__tests__/polySuaraComments.test.ts`  
Expected: PASS 100%

- [ ] **Step 4: Commit**

```bash
git add src/lib/polySuaraHelpers.ts src/pages/polyservices/PolySuaraPage.tsx src/__tests__/polySuaraPage.test.ts src/__tests__/polySuaraComments.test.ts
git commit -m "feat(polysuara): implement 1-hour self-delete with tombstone message"
```

---

### Task 5: Apple Porcelain & Rose Glow Light Mode & PolySuaraPoll Overhaul

**Files:**
- Create/Modify: `src/pages/polyservices/PolySuaraPoll.tsx`
- Create: `src/__tests__/polySuaraPoll.test.ts`
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `DEV_GUIDELINE.md`

**Interfaces:**
- `PolySuaraPoll`:
  - Outer container: `bg-slate-50/90 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4`.
  - Option items: `bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs hover:border-rose-400/50 rounded-xl`.
  - Progress fill: `bg-rose-500/15 dark:bg-rose-500/25`.
  - Option text: `text-slate-800 dark:text-slate-100 font-semibold`.
  - Percentage: `text-rose-600 dark:text-rose-400 font-mono font-bold`.
- `PolySuaraPage.tsx` Light Mode:
  - Base background: `bg-[#FAFAFA] dark:bg-slate-950`.
  - Confession cards: `bg-white dark:bg-slate-900/70 border border-slate-200/70 dark:border-white/[0.07] shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-[2rem]`.
- Documentation:
  - Update `DEV_GUIDELINE.md` Section 30 documenting Apple Porcelain Light Mode, 1-Hour Self-Delete, and Threads-style comment threading.

- [ ] **Step 1: Write unit test in `src/__tests__/polySuaraPoll.test.ts`**

Test:
1. `PolySuaraPoll` renders with dual light/dark classes (`bg-slate-50/90 dark:bg-slate-900/50`, `bg-white dark:bg-slate-800/50`).
2. Progress bar uses rose pastel tint (`bg-rose-500/15 dark:bg-rose-500/25`).
3. Voting triggers optimistic state update and displays percentage.

- [ ] **Step 2: Implement Apple Porcelain dual mode in `PolySuaraPoll.tsx` and `PolySuaraPage.tsx`**

1. Overhaul `PolySuaraPoll.tsx`:
   - Replace all hardcoded `slate-900/50`, `slate-800`, `slate-400` with dual-mode classes.
2. In `PolySuaraPage.tsx`:
   - Refine light mode cards, avatars, and typography to 'Apple Porcelain & Rose Glow'.
3. Update `DEV_GUIDELINE.md` Section 30.

- [ ] **Step 3: Run all unit tests**

Run: `npm test -- --run`  
Expected: All 14+ test suites pass with 0 errors.

- [ ] **Step 4: Run production build**

Run: `npm run build`  
Expected: Zero compilation errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/polyservices/PolySuaraPoll.tsx src/__tests__/polySuaraPoll.test.ts src/pages/polyservices/PolySuaraPage.tsx DEV_GUIDELINE.md
git commit -m "feat(polysuara): implement Apple Porcelain light mode styling and PolySuaraPoll dual theme"
```
