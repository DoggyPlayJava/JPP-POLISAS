# PolySuara Clean Modern Social Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul PolySuara into a clean, modern, non-AI-slop social experience: eliminate the pulse rings, remove redundant FABs and duplicate navigations, fix the reaction wrap/like confusion with an intuitive one-tap Heart (❤️) + WhatsApp emoji popover, modernize the comments drawer, and fix z-index / bottom clearance so BottomNav never blocks modals or inputs.

**Architecture:** 
1. Streamline the top feed with an executive single-line navigation track (Sort toggle + hairline divider + category snap chips), completely removing `CampusPulseBar`.
2. Delete `FloatingComposeFab` and remove duplicate `<BottomNav />` and `<FloatingAiChat />` calls from `PolySuaraPage.tsx`.
3. Re-architect `PolySuaraReactions.tsx` to use an inline, non-wrapping Heart Like button (`❤️ [count]`) that immediately toggles Like on single tap and pops up the 6 WhatsApp emoji reactions on long-press or tap.
4. Elevate modal and comments drawer z-indexes to `z-[999]` with `pb-28 sm:pb-6` bottom padding to guarantee 0% obstruction by BottomNav.
5. Modernize the comments drawer into an airy, minimalist conversation sheet without heavy nested boxes.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion (`motion/react`), Lucide React, Vitest, React Testing Library.

## Global Constraints
- RLS Policies: Must use `(SELECT auth.uid())` if any queries touch Supabase auth.
- No duplicate `BottomNav` or `FloatingAiChat` rendered on a single page.
- Modals and drawers must be positioned at `z-[990]` (backdrop) and `z-[999]` (sheet/dialog) to float above `BottomNav` (`z-[120]`).
- All interactive touch targets must be at least 40px on mobile.
- Zero placeholder code or truncated implementations.
- 100% test pass rate across all Vitest suites.

---

### Task 1: Deprecate `FloatingComposeFab` & `CampusPulseBar` and Remove Duplicate Global Chrome

**Files:**
- Delete: `src/components/polysuara/FloatingComposeFab.tsx`
- Delete: `src/__tests__/floatingComposeFab.test.ts`
- Delete: `src/components/polysuara/CampusPulseBar.tsx`
- Delete: `src/__tests__/campusPulseBar.test.ts`
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/__tests__/polySuaraPage.test.ts`

**Interfaces:**
- Removes `FloatingComposeFab` component and unused FAB test suite.
- Removes `CampusPulseBar` component and unused pulse bar test suite.
- PolySuaraPage renders a single instance of `BottomNav` and `FloatingAiChat` at the bottom of the page.

- [ ] **Step 1: Delete deprecated component files and test files**

Run command to remove the 4 obsolete files:
```powershell
Remove-Item "src/components/polysuara/FloatingComposeFab.tsx", "src/__tests__/floatingComposeFab.test.ts", "src/components/polysuara/CampusPulseBar.tsx", "src/__tests__/campusPulseBar.test.ts" -Force
```

- [ ] **Step 2: Update `src/__tests__/polySuaraPage.test.ts` to remove references to pulse bar and FAB**

Update `src/__tests__/polySuaraPage.test.ts`:
- Remove `vi.mock('@/components/polysuara/CampusPulseBar', ...)` and `vi.mock('@/components/polysuara/FloatingComposeFab', ...)`.
- Update tests to verify that `FloatingComposeFab` and `CampusPulseBar` are no longer rendered, and that only one `BottomNav` is rendered.

```typescript
// Ensure mock definitions do not import deleted files
// Verify PolySuaraPage renders without CampusPulseBar and FloatingComposeFab
```

- [ ] **Step 3: Remove imports and duplicate elements in `src/pages/polyservices/PolySuaraPage.tsx`**

1. Remove imports of `CampusPulseBar` and `FloatingComposeFab`.
2. Remove state `activePulseId` and handler `handleSelectPulse`.
3. In JSX:
   - Remove `<CampusPulseBar ... />` (lines ~1063-1068).
   - Remove duplicate `<BottomNav />` and `<FloatingAiChat />` around line 1795.
   - Remove `<FloatingComposeFab onClick={() => setComposeModalOpen(true)} />` at line ~2195.
   - Keep only the single `<BottomNav />` and `<FloatingAiChat />` at the very end of the page.

- [ ] **Step 4: Run test to verify passes**

Run: `npx vitest run src/__tests__/polySuaraPage.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "refactor(polysuara): remove FloatingComposeFab and CampusPulseBar and deduplicate BottomNav"
```

---

### Task 2: Overhaul `PolySuaraReactions.tsx` to One-Tap Heart (❤️) Like with Inline Count & WhatsApp Emoji Popover

**Files:**
- Modify: `src/components/polysuara/PolySuaraReactions.tsx`
- Modify: `src/__tests__/polySuaraReactions.test.ts`

**Interfaces:**
- `PolySuaraReactionsProps`:
  ```typescript
  export interface PolySuaraReactionsProps {
    confessionId: string;
    reactions: ReactionSummary[];
    onToggleReaction: (confessionId: string, reactionType: string) => void;
    totalUpvotes?: number;
    className?: string;
  }
  ```
- Primary action: An unambiguous Heart (❤️) Like button with count inline (`[ ❤️ 29 ]`) using `inline-flex items-center flex-nowrap shrink-0`.
- Single tap: Immediately triggers `onToggleReaction(confessionId, 'heart')`.
- Popover trigger: Clicking the reaction menu or long pressing opens the WhatsApp emoji floating pill (`❤️ 😂 🔥 😢 😮 💯`).
- Active reaction badges: If other emojis exist (e.g. `🔥 5`, `😂 3`), they are displayed inline alongside the Like button with `flex-nowrap`.

- [ ] **Step 1: Write failing unit tests in `src/__tests__/polySuaraReactions.test.ts`**

Update `src/__tests__/polySuaraReactions.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PolySuaraReactions } from '@/components/polysuara/PolySuaraReactions';

describe('PolySuaraReactions One-Tap Heart & Popover Suite', () => {
  it('renders one-tap Heart Like button with inline count without line breaks', () => {
    render(
      <PolySuaraReactions
        confessionId="conf-1"
        reactions={[{ type: 'heart', emoji: '❤️', label: 'Suka', count: 29, userReacted: false }]}
        totalUpvotes={29}
        onToggleReaction={vi.fn()}
      />
    );
    const heartBtn = screen.getByTestId('reaction-heart-btn');
    expect(heartBtn).toBeDefined();
    expect(heartBtn.textContent).toContain('29');
    expect(heartBtn.className).toContain('flex-nowrap');
  });

  it('toggles heart reaction on single tap of the Heart button', () => {
    const handleToggle = vi.fn();
    render(
      <PolySuaraReactions
        confessionId="conf-1"
        reactions={[{ type: 'heart', emoji: '❤️', label: 'Suka', count: 5, userReacted: false }]}
        totalUpvotes={5}
        onToggleReaction={handleToggle}
      />
    );
    const heartBtn = screen.getByTestId('reaction-heart-btn');
    fireEvent.click(heartBtn);
    expect(handleToggle).toHaveBeenCalledWith('conf-1', 'heart');
  });

  it('opens emoji tray when reaction menu trigger is clicked and allows selecting other emojis', () => {
    const handleToggle = vi.fn();
    render(
      <PolySuaraReactions
        confessionId="conf-1"
        reactions={[]}
        totalUpvotes={0}
        onToggleReaction={handleToggle}
      />
    );
    const menuBtn = screen.getByTestId('reaction-menu-trigger');
    fireEvent.click(menuBtn);
    
    const fireEmoji = screen.getByTestId('reaction-emoji-fire');
    expect(fireEmoji).toBeDefined();
    fireEvent.click(fireEmoji);
    expect(handleToggle).toHaveBeenCalledWith('conf-1', 'fire');
  });

  it('highlights heart button with active styling when userReacted is true', () => {
    render(
      <PolySuaraReactions
        confessionId="conf-1"
        reactions={[{ type: 'heart', emoji: '❤️', label: 'Suka', count: 30, userReacted: true }]}
        totalUpvotes={30}
        onToggleReaction={vi.fn()}
      />
    );
    const heartBtn = screen.getByTestId('reaction-heart-btn');
    expect(heartBtn.className).toMatch(/bg-rose-500|text-rose-500|border-rose-500/);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails (RED)**

Run: `npx vitest run src/__tests__/polySuaraReactions.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement clean layout & one-tap heart in `src/components/polysuara/PolySuaraReactions.tsx`**

Rewrite `src/components/polysuara/PolySuaraReactions.tsx`:
- Container: `relative inline-flex items-center flex-nowrap shrink-0 gap-1` (strictly prevents line breaks).
- Compute `heartReaction = reactions.find(r => r.type === 'heart')`.
- Compute `isHearted = Boolean(heartReaction?.userReacted)`.
- Compute `displayLikes = (heartReaction?.count ?? 0) > 0 ? heartReaction!.count : (totalUpvotes ?? 0)`.
- Heart Like Button:
  ```tsx
  <div className="inline-flex items-center rounded-full bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 p-0.5 shadow-xs shrink-0">
    <button
      data-testid="reaction-heart-btn"
      type="button"
      title="Suka luahan ini"
      aria-label={`Suka (${displayLikes})`}
      onClick={(e) => {
        e.stopPropagation();
        onToggleReaction(confessionId, 'heart');
      }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all select-none cursor-pointer flex-nowrap shrink-0",
        isHearted
          ? "bg-rose-500 text-white shadow-xs"
          : "text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400"
      )}
    >
      <Heart className={cn("w-3.5 h-3.5 transition-transform active:scale-125", isHearted && "fill-current")} />
      <span className="tabular-nums font-mono text-[11px] leading-none">{displayLikes}</span>
    </button>
    <button
      data-testid="reaction-menu-trigger"
      type="button"
      title="Pilih reaksi lain"
      aria-label="Pilih reaksi lain"
      onClick={(e) => {
        e.stopPropagation();
        handleOpenChange(!isPopoverOpen);
      }}
      className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
    >
      <Plus className="w-3 h-3" />
    </button>
  </div>
  ```
- Render active pills for any NON-heart reactions (`r.type !== 'heart' && r.count > 0`):
  ```tsx
  <div className="inline-flex items-center gap-1 flex-nowrap shrink-0">
    {nonHeartActivePills.map(reaction => (
      <button
        key={reaction.type}
        data-testid={`reaction-pill-${reaction.type}`}
        type="button"
        title={`${reaction.emoji} ${reaction.count}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleReaction(confessionId, reaction.type);
        }}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all select-none border shrink-0 flex-nowrap cursor-pointer",
          reaction.userReacted
            ? "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold"
            : "bg-slate-100/90 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80"
        )}
      >
        <span className="text-xs leading-none">{reaction.emoji}</span>
        <span className="tabular-nums font-mono text-[10px]">{reaction.count}</span>
      </button>
    ))}
  </div>
  ```
- WhatsApp Popover: Retain floating spring pill with backdrop dismiss.

- [ ] **Step 4: Run test to confirm it passes (GREEN)**

Run: `npx vitest run src/__tests__/polySuaraReactions.test.ts`  
Expected: PASS 100%

- [ ] **Step 5: Commit**

```bash
git add src/components/polysuara/PolySuaraReactions.tsx src/__tests__/polySuaraReactions.test.ts
git commit -m "feat(polysuara): overhaul PolySuaraReactions to one-tap Heart Like and inline non-overflow pills"
```

---

### Task 3: Implement Executive Single-Line Track & Clean Action Bar in `PolySuaraPage.tsx`

**Files:**
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/__tests__/polySuaraPage.test.ts`

**Interfaces:**
- Removes the old `SocialTabNav` and replaces it with a consolidated Single-Line Track:
  - Left: Sort segment buttons (`Terkini` / `Hangat`).
  - Middle: Hairline divider.
  - Right: Category snap chips (`Semua`, `Akademik`, `Fasiliti`, `Kamsis`, `Kaunseling`).
- Confession Card Action Bar:
  - Flex container with `flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap pt-3 border-t border-slate-100 dark:border-white/5`.
  - Left group: `<PolySuaraReactions />` + ThumbsDown (👎 `[count]`) + MessageCircle (💬 `[count]`).
  - Right group: Share (`Share2`) + Bookmark (`Bookmark`) + Admin JPP action if permitted.

- [ ] **Step 1: Update unit tests in `src/__tests__/polySuaraPage.test.ts`**

Update `src/__tests__/polySuaraPage.test.ts` to assert that:
1. Single-line track with sort toggle ('Terkini' and 'Hangat') and category chips is rendered.
2. Quick-compose capsule ("Ada luahan atau rahsia kampus?") is present.
3. No pulse bubbles or FAB buttons exist.

- [ ] **Step 2: Update `PolySuaraPage.tsx` Feed Header & Card Actions**

In `src/pages/polyservices/PolySuaraPage.tsx`:
1. Delete `SocialTabNav` component call and import.
2. In the feed header above confessions, render the sleek single-line track:
   ```tsx
   {/* Executive Single-Line Feed Navigation */}
   <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none snap-x w-full">
     {/* Sort Segmented Pills */}
     <div className="flex items-center p-0.5 rounded-2xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 shrink-0">
       <button
         type="button"
         onClick={() => setSortBy('LATEST')}
         className={cn(
           "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
           sortBy === 'LATEST'
             ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
             : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
         )}
       >
         <Clock className="w-3.5 h-3.5" /> Terkini
       </button>
       <button
         type="button"
         onClick={() => setSortBy('TRENDING')}
         className={cn(
           "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
           sortBy === 'TRENDING'
             ? "bg-rose-500 text-white shadow-xs"
             : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
         )}
       >
         <Flame className="w-3.5 h-3.5" /> Hangat
       </button>
     </div>

     {/* Subtle Divider */}
     <div className="h-5 w-px bg-slate-200 dark:bg-white/10 shrink-0" aria-hidden="true" />

     {/* Category Filter Chips */}
     <div className="flex items-center gap-1.5 shrink-0">
       <button
         type="button"
         onClick={() => setActiveCategory('SEMUA')}
         className={cn(
           "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
           activeCategory === 'SEMUA'
             ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
             : "bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200/60 dark:border-white/5"
         )}
       >
         Semua
       </button>
       {CATEGORIES.map(cat => (
         <button
           key={cat}
           type="button"
           onClick={() => setActiveCategory(cat)}
           className={cn(
             "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
             activeCategory === cat
               ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
               : "bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200/60 dark:border-white/5"
           )}
         >
           {cat.charAt(0) + cat.slice(1).toLowerCase()}
         </button>
       ))}
     </div>
   </div>
   ```
3. Update Confession Card Action Bar:
   Structure the action bar cleanly:
   ```tsx
   <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-white/5 flex-nowrap overflow-x-auto scrollbar-none">
     <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
       <PolySuaraReactions
         confessionId={confession.id}
         reactions={aggregateReactions(confessionReactions[confession.id] || [], profile?.id)}
         onToggleReaction={handleToggleReaction}
         totalUpvotes={confession.upvotes}
       />
       {/* Downvote button */}
       <button
         type="button"
         onClick={() => handleVote(confession.id, 'DOWN')}
         className={cn(
           "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0",
           hasDownvoted
             ? "bg-slate-800 text-white border-slate-700"
             : "bg-slate-100/90 dark:bg-white/[0.05] border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
         )}
         title="Tidak setuju (Auto-moderasi)"
       >
         <ThumbsDown className="w-3.5 h-3.5" />
         <span className="font-mono text-[11px]">{confession.downvotes || 0}</span>
       </button>
       {/* Comments button */}
       <button
         type="button"
         onClick={() => handleOpenComments(confession)}
         className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
         title="Ulasan Pelajar"
       >
         <MessageCircle className="w-3.5 h-3.5" />
         <span className="font-mono text-[11px]">{confession.comment_count || 0}</span>
       </button>
     </div>
     <div className="flex items-center gap-1.5 shrink-0">
       <button
         type="button"
         onClick={() => handleShare(confession)}
         className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
         title="Kongsi"
       >
         <Share2 className="w-4 h-4" />
       </button>
       <button
         type="button"
         onClick={() => toggleBookmark(confession.id)}
         className={cn(
           "p-1.5 rounded-full transition-colors",
           bookmarkedIds.has(confession.id)
             ? "text-amber-500 bg-amber-500/10"
             : "text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
         )}
         title="Simpan"
       >
         <Bookmark className={cn("w-4 h-4", bookmarkedIds.has(confession.id) && "fill-current")} />
       </button>
       {canReplyJpp && (
         <button
           type="button"
           onClick={() => handleOpenReplyModal(confession.id)}
           className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 hover:bg-teal-500/25 transition-colors"
         >
           Balas JPP
         </button>
       )}
     </div>
   </div>
   ```

- [ ] **Step 3: Run test to confirm passes**

Run: `npx vitest run src/__tests__/polySuaraPage.test.ts`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/polyservices/PolySuaraPage.tsx src/__tests__/polySuaraPage.test.ts
git commit -m "feat(polysuara): add executive single-line track and clean action bar"
```

---

### Task 4: Modernize Comments Drawer & Guarantee Z-[999] Bottom Clearance

**Files:**
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Modify: `src/__tests__/polySuaraComments.test.ts`

**Interfaces:**
- Compose Modal:
  - Backdrop: `fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[990]`
  - Container: `z-[999] fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-lg bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[2.5rem] sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto pb-28 sm:pb-6`
- Comments Drawer:
  - Backdrop: `fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[990]`
  - Container: `fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[2.5rem] shadow-2xl z-[999] flex flex-col max-h-[85vh] overflow-hidden pointer-events-auto pb-8 sm:pb-4 text-slate-900 dark:text-white`
- Modern Comment Items:
  - Eliminate nested dark box backgrounds.
  - Borderless clean rows with `border-b border-slate-100 dark:border-white/5 py-3.5 px-4`.
  - Delicate thread-line for nested replies (`border-l-2 border-slate-200 dark:border-white/10 pl-3 ml-2`).
  - OP badge: `text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20`.
  - JPP badge: `text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`.
  - Replace clunky yellow BANTUAN button with discrete action trigger.

- [ ] **Step 1: Update unit tests in `src/__tests__/polySuaraComments.test.ts`**

Ensure tests assert:
1. Comments drawer container has `z-[999]` and `pb-8 sm:pb-4` safe area styling.
2. Compose modal has `z-[999]` and `pb-28 sm:pb-6` bottom padding.
3. Clean modern conversation thread formatting is used.

- [ ] **Step 2: Update Compose Modal & Comments Drawer in `src/pages/polyservices/PolySuaraPage.tsx`**

1. In Compose Modal:
   - Backdrop: `z-[990]`.
   - Modal Container: `z-[999]` with `pb-28 sm:pb-6` so the "Kongsi Luahan" button is completely elevated above the screen bottom.
2. In Comments Drawer:
   - Backdrop: `z-[990]`.
   - Drawer Container: `z-[999]` with `pb-8 sm:pb-4`.
   - Redesign comment list items to remove harsh dark boxes and use airy modern card layouts with thread lines.
   - Replace bulky BANTUAN button with a sleek menu or mini-pill.
   - Refine the bottom comment input bar into a floating capsule with camera button and send button.

- [ ] **Step 3: Run test to confirm passes**

Run: `npx vitest run src/__tests__/polySuaraComments.test.ts`  
Expected: PASS 100%

- [ ] **Step 4: Commit**

```bash
git add src/pages/polyservices/PolySuaraPage.tsx src/__tests__/polySuaraComments.test.ts
git commit -m "feat(polysuara): modernize comments drawer and enforce z-[999] bottom clearance"
```

---

### Task 5: Full Test Suite Verification, Documentation, and Production Build

**Files:**
- Modify: `DEV_GUIDELINE.md`

- [ ] **Step 1: Run all unit tests**

Run: `npm test -- --run`  
Expected: All 14+ test suites pass with 0 errors.

- [ ] **Step 2: Run production build**

Run: `npm run build`  
Expected: Clean compilation and service worker generation with exit code 0.

- [ ] **Step 3: Update `DEV_GUIDELINE.md`**

In Section 29 / PolySuara architecture documentation:
- Record the deprecation of `CampusPulseBar` and `FloatingComposeFab`.
- Document the new *One-Tap Heart + WhatsApp Reactions* pattern in `PolySuaraReactions`.
- Document the *Z-[999] Safe Clearance Rule* for superapp floating drawers and bottom navigation avoidance.

- [ ] **Step 4: Commit documentation and final adjustments**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs(polysuara): document clean modern social architecture and z-[999] clearance"
```
