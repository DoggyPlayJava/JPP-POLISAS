# PolySuara Apple Porcelain Light Mode, Like/Dislike Mutual Exclusivity & Threads Comments Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Like/Dislike counting bug with strict mutual exclusivity, completely hide BottomNav and FloatingAiChat during modal/drawer states via React Portal, rework the comments drawer into an airy Threads-style conversation with friendly animal personas (goodbye `Anon-eb689`) and 4-tier replies, and overhaul Light Mode (including `PolySuaraPoll.tsx`) to a clean 'Apple Porcelain & Rose Glow' aesthetic.

**Architecture:** 
1. Unify Like & Dislike state logic in `PolySuaraPage.tsx`: when user likes, downvote is canceled; when user dislikes, likes/reactions are canceled; un-liking properly decrements upvotes.
2. Auto-hide `BottomNav` and `FloatingAiChat` when `composeModalOpen || commentDrawerOpen`, and mount modals via `createPortal(..., document.body)` at `z-[99999]` to guarantee zero obstruction.
3. In `polySuaraHelpers.ts`, implement `getFriendlyAnonName` mapping hash codes deterministically to 16 cheerful campus animal personas with emojis.
4. Rework the comments drawer in `PolySuaraPage.tsx` with right-aligned micro-likes, subtle `Balas` action, clean thread indentation up to depth 4 with auto `@Mention`, and replace clutter with a discrete `···` menu.
5. In `PolySuaraPoll.tsx`, eliminate hardcoded dark cement styling with full dual light/dark classes: porcelain white option pills, rose pastel progress fill, and high-contrast typography.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion (`motion/react`), Lucide React, Vitest, React Testing Library.

## Global Constraints
- RLS Policies: Must use `(SELECT auth.uid())` if any queries touch Supabase auth.
- Like and Dislike must be 100% mutually exclusive. A user cannot have both active.
- Modals and drawers must be mounted via `createPortal(..., document.body)` with `z-[99999]`.
- BottomNav and FloatingAiChat must not be visible on screen when `composeModalOpen || commentDrawerOpen`.
- Touch targets must be at least 40px on mobile.
- Zero placeholder code or truncated implementations.
- 100% test pass rate across all Vitest suites.

---

### Task 1: Strict Mutual Exclusivity for Like (❤️) & Dislike (👎) with State Synchronization

**Files:**
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/__tests__/polySuaraPage.test.ts`

**Interfaces:**
- `handleToggleReaction(confessionId: string, reactionType: string)`:
  - Cancels downvote if user had downvoted (`userDownvotes.delete(confessionId)`, decrements `downvotes`, deletes from `polysuara_downvotes`).
  - If user had already reacted with `reactionType`: toggles off (-1 `upvotes`, deletes from `polysuara_reactions`).
  - If user had not reacted: toggles on (+1 `upvotes`, inserts into `polysuara_reactions`).
- `handleDownvote(confessionId: string)`:
  - Cancels any reaction/like if user had reacted (`confessionReactions[confessionId]` cleared of user, decrements `upvotes`, deletes from `polysuara_reactions`).
  - If user had already downvoted: toggles off (-1 `downvotes`, deletes from `polysuara_downvotes`).
  - If user had not downvoted: toggles on (+1 `downvotes`, inserts/rpc into `polysuara_downvotes`).

- [ ] **Step 1: Write failing unit tests in `src/__tests__/polySuaraPage.test.ts`**

Add tests covering the Like -> Dislike -> Like cycle:
```typescript
it('enforces strict mutual exclusivity between like and dislike without inflated counts', () => {
  // Verify that liking increments upvotes
  // Verify that disliking then decrements upvotes and increments downvotes
  // Verify that liking again decrements downvotes and increments upvotes
});
```

- [ ] **Step 2: Run test to confirm it fails (RED)**

Run: `npx vitest run src/__tests__/polySuaraPage.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement synchronized mutual exclusivity in `PolySuaraPage.tsx`**

Rewrite `handleToggleReaction` and `handleDownvote`:
```typescript
const handleToggleReaction = async (confessionId: string, reactionType: string) => {
  if (!profile?.id) {
    toast.error('Sila log masuk untuk memberi reaksi.');
    return;
  }

  const currentList = confessionReactions[confessionId] || [];
  const existingReaction = currentList.find((r: any) => r.user_id === profile.id);
  const isSameReaction = existingReaction?.reaction_type === reactionType;
  const wasDownvoted = userDownvotes.has(confessionId);

  // 1. Cancel downvote if active
  if (wasDownvoted) {
    setUserDownvotes(prev => {
      const next = new Set(prev);
      next.delete(confessionId);
      return next;
    });
  }

  // 2. Optimistic update of reactions and confession counts
  setConfessionReactions(prev => {
    const list = (prev[confessionId] || []).filter((r: any) => r.user_id !== profile.id);
    if (isSameReaction) {
      return { ...prev, [confessionId]: list };
    } else {
      return { ...prev, [confessionId]: [...list, { reaction_type: reactionType, user_id: profile.id }] };
    }
  });

  setConfessions(prev => prev.map(c => {
    if (c.id === confessionId) {
      let ups = c.upvotes || 0;
      let downs = c.downvotes || 0;
      if (wasDownvoted) downs = Math.max(downs - 1, 0);

      if (isSameReaction) {
        ups = Math.max(ups - 1, 0);
      } else if (!existingReaction) {
        ups = ups + 1;
      }
      return { ...c, upvotes: ups, downvotes: downs };
    }
    return c;
  }));

  // 3. Database synchronization
  try {
    if (wasDownvoted) {
      await supabase.from('polysuara_downvotes').delete().eq('confession_id', confessionId).eq('user_id', profile.id);
    }
    if (isSameReaction) {
      await supabase.from('polysuara_reactions').delete().eq('confession_id', confessionId).eq('user_id', profile.id);
    } else {
      await supabase.from('polysuara_reactions').delete().eq('confession_id', confessionId).eq('user_id', profile.id);
      await supabase.from('polysuara_reactions').insert({ confession_id: confessionId, user_id: profile.id, reaction_type: reactionType });
    }
  } catch (err) {
    console.error('Reaction sync error:', err);
    fetchConfessions(0, true);
  }
};
```

Apply matching mutual exclusivity logic to `handleDownvote`.

- [ ] **Step 4: Run test to confirm it passes (GREEN)**

Run: `npx vitest run src/__tests__/polySuaraPage.test.ts`  
Expected: PASS 100%

- [ ] **Step 5: Commit**

```bash
git add src/pages/polyservices/PolySuaraPage.tsx src/__tests__/polySuaraPage.test.ts
git commit -m "fix(polysuara): enforce strict mutual exclusivity and count sync between like and dislike"
```

---

### Task 2: Sifar Halangan: Sembunyi Automatik BottomNav & FloatingAiChat + React Portal

**Files:**
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/__tests__/polySuaraPage.test.ts`

**Interfaces:**
- Modal mounting: Use `createPortal(..., document.body)` for Compose Modal and Comments Drawer with `z-[99999]`.
- Chrome hiding:
  ```tsx
  {!composeModalOpen && !commentDrawerOpen && (
    <>
      <BottomNav />
      <FloatingAiChat />
    </>
  )}
  ```

- [ ] **Step 1: Write failing unit test in `src/__tests__/polySuaraPage.test.ts`**

Add test asserting that BottomNav and FloatingAiChat are conditionally rendered based on `!composeModalOpen && !commentDrawerOpen`.

- [ ] **Step 2: Run test to confirm it fails (RED)**

Run: `npx vitest run src/__tests__/polySuaraPage.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement Portal & Conditional Chrome in `src/pages/polyservices/PolySuaraPage.tsx`**

1. Import `createPortal` from `'react-dom'`.
2. Wrap Compose Modal in `typeof document !== 'undefined' ? createPortal(...) : null`.
3. Wrap Comments Drawer in `typeof document !== 'undefined' ? createPortal(...) : null`.
4. Wrap `<BottomNav />` and `<FloatingAiChat />` in `{!composeModalOpen && !commentDrawerOpen && (...)}`.

- [ ] **Step 4: Run test to confirm passes (GREEN)**

Run: `npx vitest run src/__tests__/polySuaraPage.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/polyservices/PolySuaraPage.tsx src/__tests__/polySuaraPage.test.ts
git commit -m "feat(polysuara): auto-hide BottomNav and mount modals in portal to eliminate obstruction"
```

---

### Task 3: Persona Haiwan Anon Mesra & Balasan Komen 4 Tahap Gaya Threads

**Files:**
- Modify: `src/lib/polySuaraHelpers.ts`
- Modify: `src/__tests__/polySuaraHelpers.test.ts`
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/__tests__/polySuaraComments.test.ts`

**Interfaces:**
- `getFriendlyAnonName(rawCodename: string): { name: string; emoji: string; isOP: boolean; isJPP?: boolean }`:
  - Maps `Anon-xxxxx` hash deterministically to 16 friendly Malaysian campus personas:
    `Kucing Oren 🐱`, `Tupai Laju 🐿️`, `Panda Comel 🐼`, `Arnab Pantas 🐰`, `Musang Cerdik 🦊`, `Singa Berani 🦁`, `Koala Santai 🐨`, `Burung Ceria 🐦`, `Kancil Bijak 🦌`, `Harimau Belang 🐯`, `Penguin Sejuk 🐧`, `Delfin Ceria 🐬`, `Kura Sabar 🐢`, `Gajah Setia 🐘`, `Helang Gagah 🦅`, `Beruang Tenang 🐻`.
  - If includes `[Penulis]`: returns `{ name: originalName, emoji: '✍️', isOP: true }`.
- Comments Drawer threading:
  - Recursive reply rendering up to depth 4.
  - Compact indentation (`ml-3 sm:ml-4 border-l-2 border-slate-200 dark:border-white/10 pl-3`).
  - Auto `@Mention` tag inserted into input on reply.
  - Micro-like button on right side of comment row.
  - Discrete `···` action menu replacing messy icons.

- [ ] **Step 1: Write failing tests in `src/__tests__/polySuaraHelpers.test.ts`**

Add unit tests for `getFriendlyAnonName`:
- Hashes `Anon-eb689` deterministically to a persona.
- Same input always returns identical animal and emoji.
- Codenames with `[Penulis]` are recognized as OP.

- [ ] **Step 2: Run test to confirm it fails (RED)**

Run: `npx vitest run src/__tests__/polySuaraHelpers.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement `getFriendlyAnonName` in `src/lib/polySuaraHelpers.ts`**

```typescript
export const CAMPUS_ANIMAL_PERSONAS = [
  { name: 'Kucing Oren', emoji: '🐱' },
  { name: 'Tupai Laju', emoji: '🐿️' },
  { name: 'Panda Comel', emoji: '🐼' },
  { name: 'Arnab Pantas', emoji: '🐰' },
  { name: 'Musang Cerdik', emoji: '🦊' },
  { name: 'Singa Berani', emoji: '🦁' },
  { name: 'Koala Santai', emoji: '🐨' },
  { name: 'Burung Ceria', emoji: '🐦' },
  { name: 'Kancil Bijak', emoji: '🦌' },
  { name: 'Harimau Belang', emoji: '🐯' },
  { name: 'Penguin Sejuk', emoji: '🐧' },
  { name: 'Delfin Ceria', emoji: '🐬' },
  { name: 'Kura Sabar', emoji: '🐢' },
  { name: 'Gajah Setia', emoji: '🐘' },
  { name: 'Helang Gagah', emoji: '🦅' },
  { name: 'Beruang Tenang', emoji: '🐻' },
];

export function getFriendlyAnonName(rawCodename: string): { name: string; emoji: string; isOP: boolean } {
  if (!rawCodename) return { name: 'Pelajar Anon', emoji: '👻', isOP: false };
  if (rawCodename.includes('[Penulis]')) {
    const clean = rawCodename.replace(/\s*\[Penulis\]/g, '').trim();
    return { name: clean || 'Penulis Asal', emoji: '✍️', isOP: true };
  }
  let hashVal = 0;
  for (let i = 0; i < rawCodename.length; i++) {
    hashVal = (hashVal << 5) - hashVal + rawCodename.charCodeAt(i);
    hashVal |= 0;
  }
  const idx = Math.abs(hashVal) % CAMPUS_ANIMAL_PERSONAS.length;
  return { ...CAMPUS_ANIMAL_PERSONAS[idx], isOP: false };
}
```

- [ ] **Step 4: Update Comments Drawer in `src/pages/polyservices/PolySuaraPage.tsx`**

- Use `getFriendlyAnonName(comment.codename)` to display cute avatars and names.
- Support up to 4 levels of nested replies with compact indentation and auto `@Mention`.
- Move Like button to right side; clean up messy icons into discrete `···` dropdown or trigger.

- [ ] **Step 5: Run tests to confirm pass (GREEN)**

Run: `npx vitest run src/__tests__/polySuaraHelpers.test.ts src/__tests__/polySuaraComments.test.ts`  
Expected: PASS 100%

- [ ] **Step 6: Commit**

```bash
git add src/lib/polySuaraHelpers.ts src/pages/polyservices/PolySuaraPage.tsx src/__tests__/polySuaraHelpers.test.ts src/__tests__/polySuaraComments.test.ts
git commit -m "feat(polysuara): add friendly animal personas and 4-tier Threads comment threading"
```

---

### Task 4: Transformasi Kotak Undian `PolySuaraPoll.tsx` & Light Mode 'Apple Porcelain & Rose Glow'

**Files:**
- Modify: `src/pages/polyservices/PolySuaraPoll.tsx`
- Create: `src/__tests__/polySuaraPoll.test.ts`
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`

**Interfaces:**
- `PolySuaraPoll`:
  - Full dual Light & Dark mode support.
  - Light mode container: `bg-slate-50/90 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4`.
  - Light mode options: `bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs hover:border-rose-400/50`.
  - Progress fill: `isVoted ? "bg-rose-500/20 dark:bg-rose-500/30" : "bg-rose-500/10 dark:bg-slate-700/40"`.
  - Option text: `isVoted ? "text-rose-700 dark:text-rose-200 font-bold" : "text-slate-800 dark:text-slate-100 font-semibold"`.
  - Percentage: `text-rose-600 dark:text-rose-400 font-mono font-bold text-xs`.
- `PolySuaraPage`:
  - Cards in light mode: porcelain `#FAFAFA` background, pure white cards with micro-elevation `shadow-[0_4px_24px_rgba(0,0,0,0.03)] border-slate-200/70`.

- [ ] **Step 1: Write failing unit tests in `src/__tests__/polySuaraPoll.test.ts`**

Write unit tests asserting:
- Dual Light and Dark mode class names on poll container, options, and progress bar.
- Voting interaction triggers RPC call and updates state optimistically.
- Percentage and vote counts display cleanly in both themes.

- [ ] **Step 2: Run test to confirm it fails (RED)**

Run: `npx vitest run src/__tests__/polySuaraPoll.test.ts`  
Expected: FAIL

- [ ] **Step 3: Overhaul `PolySuaraPoll.tsx` with Apple Porcelain Light Mode**

Implement full dual Light/Dark styling with vibrant rose progress fill and high-contrast typography.

- [ ] **Step 4: Run test to confirm it passes (GREEN)**

Run: `npx vitest run src/__tests__/polySuaraPoll.test.ts`  
Expected: PASS 100%

- [ ] **Step 5: Commit**

```bash
git add src/pages/polyservices/PolySuaraPoll.tsx src/pages/polyservices/PolySuaraPage.tsx src/__tests__/polySuaraPoll.test.ts
git commit -m "feat(polysuara): implement Apple Porcelain Light Mode and vibrant styling for PolySuaraPoll"
```

---

### Task 5: Full Test Suite Verification, Documentation, and Production Build

**Files:**
- Modify: `DEV_GUIDELINE.md`

- [ ] **Step 1: Run all unit tests**

Run: `npm test -- --run`  
Expected: All test suites pass with 0 errors.

- [ ] **Step 2: Run production build**

Run: `npm run build`  
Expected: Clean compilation with exit code 0.

- [ ] **Step 3: Update `DEV_GUIDELINE.md`**

Document:
- Strict mutual exclusivity rule for like/dislike in Section 30.
- React Portal modal mounting and auto-hide navigation rules.
- Friendly animal anon mapping (`getFriendlyAnonName`) and 4-tier threading.
- Apple Porcelain Light Mode and dual-mode poll architecture.

- [ ] **Step 4: Commit**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs(polysuara): document mutual exclusivity, portal mounting, and porcelain light mode"
```
