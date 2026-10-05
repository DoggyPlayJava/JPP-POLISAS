# PolySuara Super App: Reactions, Stickers & Dual Light/Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul PolySuara (`/polysuara`) into a flagship Super App social platform featuring WhatsApp-style floating emoji reactions, interactive reaction pills, the POLISAS Campus Sticker Pack, cute dynamic animal avatars, and full dual Light/Dark mode support.

**Architecture:** A lightweight real-time reaction engine backed by Supabase `polysuara_reactions` table with optimistic UI, tokenized sticker embedding (`[sticker:id]`) for 0KB network payload, animal avatar synthesis from database codenames, and hardware-accelerated Framer Motion components supporting both Light and Dark themes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, Supabase PostgreSQL with RLS, Lucide React icons, Vitest.

## Global Constraints
- Target branch: `feat/campus-super-app-portal`.
- Strict RLS: Always write `(SELECT auth.uid())` — never bare `auth.uid()`. One policy per operation per table.
- Non-negotiable migration rule: Never edit existing migrations in `supabase/migrations/`; create a new migration.
- Low-end mobile device performance: `transform-gpu`, no stacked blur filters, zero binary sticker downloads (pure SVG/CSS), touch targets min 44px.
- Bottom dock clearance: `pb-36` with mobile spacer to clear `BottomNav`.
- Full Dual Light and Dark mode parity across all components.

---

### Task 1: Supabase Migration for Reactions & PolySuara Helper Utilities

**Files:**
- Create: `supabase/migrations/20261005170000_create_polysuara_reactions.sql`
- Create: `src/lib/polySuaraHelpers.ts`
- Test: `src/__tests__/polySuaraHelpers.test.ts`

**Interfaces:**
- Consumes: None (foundational utilities).
- Produces:
  ```typescript
  export interface CampusSticker {
    id: string;
    label: string;
    emoji: string;
    phrase: string;
    category: 'STUDY' | 'MOOD' | 'CAMPUS' | 'MEME';
    gradientClass: string;
    borderClass: string;
  }

  export interface ReactionSummary {
    type: string;
    emoji: string;
    count: number;
    userReacted: boolean;
  }

  export const POLISAS_CAMPUS_STICKERS: CampusSticker[];
  export const REACTION_EMOJIS: Array<{ type: string; emoji: string; label: string }>;
  export function extractStickerToken(content: string): { stickerId: string | null; cleanContent: string };
  export function embedStickerToken(content: string, stickerId: string): string;
  export function getAnimalAvatarFromCodename(codename?: string): { emoji: string; bgClass: string; textClass: string };
  export function aggregateReactions(reactions: Array<{ reaction_type: string; user_id?: string }>, currentUserId?: string): ReactionSummary[];
  ```

- [ ] **Step 1: Write failing unit test in `src/__tests__/polySuaraHelpers.test.ts`**
- [ ] **Step 2: Run test with `npx vitest run src/__tests__/polySuaraHelpers.test.ts` and confirm failure (RED)**
- [ ] **Step 3: Implement `supabase/migrations/20261005170000_create_polysuara_reactions.sql`**
- [ ] **Step 4: Implement `src/lib/polySuaraHelpers.ts` with all exports and logic**
- [ ] **Step 5: Re-run `npx vitest run src/__tests__/polySuaraHelpers.test.ts` and verify 100% pass (GREEN)**
- [ ] **Step 6: Commit with message: `feat(polysuara): add reactions migration and helper utilities with tests`**

---

### Task 2: Floating WhatsApp Emoji Reaction Bar & Reaction Badge Pills

**Files:**
- Create: `src/components/polysuara/PolySuaraReactions.tsx`
- Test: `src/__tests__/polySuaraReactions.test.ts`

**Interfaces:**
- Consumes: `REACTION_EMOJIS`, `ReactionSummary` from `@/lib/polySuaraHelpers`.
- Produces:
  ```typescript
  export interface PolySuaraReactionsProps {
    confessionId: string;
    reactions: ReactionSummary[];
    onToggleReaction: (confessionId: string, reactionType: string) => void;
    totalUpvotes?: number;
    className?: string;
  }
  export const PolySuaraReactions: React.FC<PolySuaraReactionsProps>;
  ```

- [ ] **Step 1: Write unit tests in `src/__tests__/polySuaraReactions.test.ts`**
  - Verify popover toggles on clicking trigger button.
  - Verify clicking an emoji triggers `onToggleReaction(confessionId, reactionType)`.
  - Verify reaction pill counters render with count and active user reaction highlight.
  - Verify Dual Light/Dark Mode CSS classes.
- [ ] **Step 2: Run test to watch it fail (RED)**
- [ ] **Step 3: Implement `src/components/polysuara/PolySuaraReactions.tsx`**
  - Floating capsule popover with Framer Motion spring physics.
  - 6 emojis: ❤️, 😂, 🔥, 😢, 😮, 💯.
  - Touch targets 44px+ for mobile ergonomics.
  - Auto-close on selection or outside click.
- [ ] **Step 4: Re-run test and verify all pass (GREEN)**
- [ ] **Step 5: Commit with message: `feat(polysuara): implement PolySuaraReactions floating bar and pill badges`**

---

### Task 3: POLISAS Campus Sticker Badge & Picker Drawer/Popover

**Files:**
- Create: `src/components/polysuara/PolySuaraStickerBadge.tsx`
- Create: `src/components/polysuara/PolySuaraStickerPicker.tsx`
- Test: `src/__tests__/polySuaraStickers.test.ts`

**Interfaces:**
- Consumes: `POLISAS_CAMPUS_STICKERS`, `CampusSticker` from `@/lib/polySuaraHelpers`.
- Produces:
  ```typescript
  export interface PolySuaraStickerBadgeProps {
    stickerId: string;
    size?: 'sm' | 'md' | 'lg';
    onRemove?: () => void;
    className?: string;
  }
  export const PolySuaraStickerBadge: React.FC<PolySuaraStickerBadgeProps>;

  export interface PolySuaraStickerPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectSticker: (stickerId: string) => void;
    selectedStickerId?: string | null;
  }
  export const PolySuaraStickerPicker: React.FC<PolySuaraStickerPickerProps>;
  ```

- [ ] **Step 1: Write unit tests in `src/__tests__/polySuaraStickers.test.ts`**
  - Verify `PolySuaraStickerBadge` renders matching emoji, label, and phrase for all 8 sticker IDs.
  - Verify `PolySuaraStickerPicker` displays all 8 stickers and emits `onSelectSticker`.
- [ ] **Step 2: Run test to watch it fail (RED)**
- [ ] **Step 3: Implement `PolySuaraStickerBadge.tsx` and `PolySuaraStickerPicker.tsx`**
  - High-end tactile cards with light/dark contrast and category tabs.
  - GPU accelerated scale on hover/tap.
- [ ] **Step 4: Re-run test and verify all pass (GREEN)**
- [ ] **Step 5: Commit with message: `feat(polysuara): implement campus sticker badge and picker components`**

---

### Task 4: PolySuara Feed & Composer Overhaul with Dual Light/Dark Mode

**Files:**
- Modify: `src/pages/polyservices/PolySuaraPage.tsx`
- Test: `src/__tests__/polySuaraPage.test.ts`

**Interfaces:**
- Integrates:
  - `PolySuaraReactions` on each confession card.
  - `PolySuaraStickerPicker` in confession composer.
  - `PolySuaraStickerBadge` on cards containing `[sticker:id]`.
  - `getAnimalAvatarFromCodename` for dynamic avatars.
  - Light mode styles (`bg-slate-50`, `bg-white`, `text-slate-900`) and dark mode styles (`dark:bg-slate-950`, `dark:bg-slate-900`).
  - Reaction toggling synced with Supabase `polysuara_reactions` with optimistic update.

- [ ] **Step 1: Write integration tests in `src/__tests__/polySuaraPage.test.ts`**
  - Verify page export and light/dark theme root classes.
- [ ] **Step 2: Run test to watch it fail (RED)**
- [ ] **Step 3: Update `src/pages/polyservices/PolySuaraPage.tsx`**
  - Add reactions state and sync handler.
  - Add sticker selection state in composer.
  - Replace hardcoded `bg-slate-950` with responsive dual classes (`bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100`).
  - Upgrade confession cards with obsidian glass + subtle glow + cute animal avatars.
  - Connect `PolySuaraReactions` and `PolySuaraStickerBadge`.
  - Keep dislike button intact for auto-moderation threshold.
- [ ] **Step 4: Run `npx vitest run src/__tests__/polySuaraPage.test.ts` and verify it passes (GREEN)**
- [ ] **Step 5: Commit with message: `feat(polysuara): overhaul PolySuaraPage with dual light/dark mode and reactions`**

---

### Task 5: Comments Drawer Super App Overhaul

**Files:**
- Modify: `src/pages/polyservices/PolySuaraPage.tsx` (Comments Drawer section)
- Test: `src/__tests__/polySuaraComments.test.ts`

**Interfaces:**
- Connects:
  - Sticker quick-reply button in comment input.
  - Sticker rendering in comment items.
  - Light and Dark mode styling for comment cards, replies, and moderation flags.

- [ ] **Step 1: Write tests in `src/__tests__/polySuaraComments.test.ts`**
- [ ] **Step 2: Update comments drawer in `PolySuaraPage.tsx` with light/dark styling, sticker support, and quick reactions**
- [ ] **Step 3: Run test suite to verify passes (GREEN)**
- [ ] **Step 4: Commit with message: `feat(polysuara): add sticker replies and dual mode to comments drawer`**

---

### Task 6: Documentation, Performance Audit & Quality Gate

**Files:**
- Modify: `DEV_GUIDELINE.md`

- [ ] **Step 1: Update `DEV_GUIDELINE.md` with Section 30 (PolySuara Super App Architecture, Reactions, Stickers & Dual Mode)**
- [ ] **Step 2: Run all project test suites: `npm test -- --run`**
- [ ] **Step 3: Run production build: `npm run build`**
- [ ] **Step 4: Test dev server: verify 200 OK on `/polysuara`**
- [ ] **Step 5: Commit with message: `docs(polysuara): document reactions, stickers, and dual theme architecture in DEV_GUIDELINE`**
