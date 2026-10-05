# PolySuara Super App: Floating WhatsApp Reactions, Campus Stickers & Dual Light/Dark Mode Design Spec

* **Date:** 2026-10-05
* **Target Branch:** `feat/campus-super-app-portal`
* **Status:** In Review / Approved Design
* **Authors:** AI Engineering Agent & POLISAS Development Team
* **Design Standards:** `/design-taste-frontend`, Super App Architecture (`DEV_GUIDELINE.md` Section 29)

---

## 1. Executive Summary & Problem Statement

PolySuara (`/polysuara`) is the anonymous student confession and community pulse platform for POLISAS students. While it contains vital features (anonymous codenames, official JPP replies, polls, and emergency welfare escalations), its visual design has fallen behind the rest of the POLISAS Super App portal:
1. **Monochrome Dark-Only Design:** The existing interface was hardcoded to a dark slate background (`bg-slate-950`), completely lacking Light Mode support and feeling heavy, somber, and dated.
2. **Limited Engagement Model:** Only binary Upvote / Downvote buttons existed, preventing nuanced emotional expressions and student banter.
3. **No Campus Stickers:** Students had no visual meme or expressive badge tools to express authentic polytechnic life (e.g., assignment burnout, exam prep, meal runs).
4. **Generic Visual Elements:** Confessions lacked avatar identity flair; the database automatically generates creative codenames (e.g. *"Kucing Misteri"*, *"Harimau Berani"*, *"Elang Sakti"*), but they were rendered with a plain grey placeholder circle.

This specification details the overhaul of PolySuara into a **flagship Super App social hub**, featuring:
- A **WhatsApp-style floating reaction bar** with spring physics and interactive reaction pill tallies.
- An official **POLISAS Campus Sticker Pack** (8 curated stickers) usable in both confessions and comments via tokenized text.
- Full **Dual Light and Dark Mode** support adhering to executive glassmorphism and tactile feedback.
- Automatic **Dynamic Animal Avatar generation** matched to database codenames.
- Strict **low-end mobile performance optimization** (GPU acceleration, 0KB network payload for stickers, 44px+ touch targets).

---

## 2. Architecture & Core Decisions

### 2.1 WhatsApp-Style Floating Reaction Bar & Reaction Counter Pills
- **Trigger:** Tapping a cute `+` or Heart button on any confession card opens a floating capsule popover above the card (`<FloatingReactionPopover />`).
- **Reaction Palette (6 Core Emojis):**
  1. ❤️ **Suka / Setuju** (`heart`)
  2. 😂 **Lawak / Terhibur** (`laugh`)
  3. 🔥 **Padu / Hangat** (`fire`)
  4. 😢 **Sedih / Sebak** (`cry`)
  5. 😮 **Terkejut / Weh** (`shock`)
  6. 💯 **Solid / Mantap** (`hundred`)
- **Relationship with Upvotes & Karma:**
  - **Every positive/expressive reaction (❤️, 😂, 🔥, 😮, 💯, 😢) increments the confession's overall Upvote / Like score**.
  - This ensures confessions with high interaction naturally climb to the **"Hangat" (Trending)** feed.
- **Dedicated Dislike / Downvote (👎) Button:**
  - Kept as a separate community moderation action beside the reaction group.
  - Retains the critical **POLISAS Auto-Moderation Rule**: If a confession receives >60% downvotes out of 40 total votes, it is automatically hidden and triggers a notification to Exco Kebajikan.
- **Interactive Reaction Pills:**
  - Rendered below the confession text: e.g., `[❤️ 14]` `[🔥 32]` `[😂 5]`.
  - Tapping an existing pill toggles that reaction directly without needing to open the popover.
  - Active user reaction is highlighted with a vivid glowing border (e.g. rose/amber).
- **Data Persistence & Scalability (1,500 Concurrent Users):**
  - Stored in a high-performance Supabase table `polysuara_reactions`:
    - Columns: `id UUID`, `confession_id UUID`, `user_id UUID`, `reaction_type TEXT`, `created_at TIMESTAMPTZ`.
    - Unique Constraint: `(confession_id, user_id, reaction_type)`.
    - Indexed foreign keys: `idx_polysuara_reactions_confession_id`, `idx_polysuara_reactions_user_id`.
    - Strict RLS: `(SELECT auth.uid()) = user_id`.
  - **Optimistic UI Engine:** Reactions update instantly in client state (`useState` + local tracking) with zero latency. Background sync debounces to Supabase; if the table is unavailable or offline, reactions gracefully fall back to local storage and standard upvotes.

---

### 2.2 POLISAS Campus Sticker Pack (8 Curated Memes)
A set of 8 illustrated badges capturing authentic polytechnic student experiences:
1. 🧠💥 **"Otak Jem"** (`otak_jem`): Assignment overload & mental fatigue.
2. 📚☕ **"Exam Mood"** (`exam_mood`): Revision week, late-night cafe sessions.
3. 😭💔 **"Relatable Teruk"** (`relatable`): Shared campus struggles & homesickness.
4. 🍔🛵 **"Pakat Makan"** (`pakat_makan`): Food runs, Semambu food court & cafe outings.
5. 🛏️💧 **"Nangis Tepi Katil"** (`nangis_katil`): Academic setbacks & heartbreak.
6. ✊🔥 **"Solidariti"** (`solidariti`): Student welfare support & campus unity.
7. ⏳⚡ **"Deadline Esok"** (`deadline_esok`): Last-minute submissions before 11:59 PM.
8. 🔄😅 **"Geng Repeat"** (`geng_repeat`): Staying positive through academic retakes.

#### Tokenized Storage Architecture:
- Stickers are stored as lightweight string tokens inside the existing `content` column of confessions or comments:
  - Format: `[sticker:otak_jem] Luahan teks di sini...`
- **Zero Storage Quota / Zero Network Overhead:**
  - Does NOT upload binary images to Supabase storage.
  - Rendered as rich SVG/CSS badge components client-side.
  - 100% backward compatible: older confessions display untouched, and new confessions parse the token effortlessly.

#### Sticker Usage Points:
1. **Confession Composer (`<PolySuaraComposer />`):**
   - A dedicated "Pelekat" button with a `Smile` icon opens a responsive sticker grid drawer.
   - Selecting a sticker embeds it as the featured banner or badge of the post.
2. **Comments Drawer (`<PolySuaraCommentsDrawer />`):**
   - Students can quickly reply to a peer's confession with a one-tap campus sticker.

---

### 2.3 Super App Visual Overhaul: Dual Light & Dark Mode
PolySuara is completely refactored to support **both Light and Dark Modes** seamlessly with high contrast (WCAG AA):

| Element | Light Mode | Dark Mode |
|---|---|---|
| **Page Canvas** | `bg-slate-50 text-slate-900` | `bg-slate-950 text-slate-100` |
| **Top Nav / Sticky Header** | `bg-white/80 border-slate-200/80 backdrop-blur-xl shadow-xs` | `bg-slate-950/80 border-white/5 backdrop-blur-xl` |
| **Confession Cards** | `bg-white border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-rose-400/40` | `bg-slate-900/80 border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:border-rose-500/30` |
| **Reaction Popover** | `bg-white/95 border-slate-200 shadow-xl backdrop-blur-2xl` | `bg-slate-900/95 border-white/15 shadow-2xl backdrop-blur-2xl` |
| **Reaction Pills** | `bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200` | `bg-slate-800/80 text-slate-300 hover:bg-slate-700 border-white/10` |
| **Active Reaction Pill** | `bg-rose-50 text-rose-600 border-rose-300` | `bg-rose-500/20 text-rose-400 border-rose-500/40` |
| **Composer Box** | `bg-white border-slate-200 focus-within:border-rose-400` | `bg-slate-900 border-slate-800 focus-within:border-rose-500/40` |
| **Comments Drawer** | `bg-white border-slate-200 text-slate-900` | `bg-slate-900 border-slate-800 text-slate-100` |

---

### 2.4 Dynamic Animal Avatar Identity Matching
The existing database trigger assigns names formatted as `[Animal] [Adjective]`:
- *Animals:* Kucing, Harimau, Elang, Singa, Serigala, Kuda, Beruang, Kancil, Gajah, Tupai, Kura, Lumba, Burung, Panda, Musang, Landak.
- We map each animal name to a rich, colorful emoji avatar with dedicated background glow:
  - `Kucing` 🐱, `Harimau` 🐯, `Elang` 🦅, `Singa` 🦁, `Serigala` 🐺, `Kuda` 🐴, `Beruang` 🐻, `Kancil` 🦌, `Gajah` 🐘, `Tupai` 🐿️, `Kura` 🐢, `Lumba` 🐬, `Burung` 🦜, `Panda` 🐼, `Musang` 🦊, `Landak` 🦔.
- Renders an adorable, dignified identity avatar for every anonymous student instead of a generic blank circle.

---

### 2.5 Low-End Mobile Performance Optimizations
1. **CSS Hardware Acceleration:** All popovers and sticker scales use `transform-gpu` and `will-change-transform`.
2. **Framer Motion Tuning:** Snappy spring transitions (`stiffness: 400`, `damping: 28`) without layout recalculation.
3. **Ergonomic Touch Targets:** Minimum 44px x 44px for thumb tap zones on mobile devices.
4. **Bottom Nav Dock Clearance:** Maintain `pb-36` so content and composer are never hidden behind `BottomNav`.

---

## 3. Component Architecture & File Layout

```
src/
├── components/
│   └── polysuara/
│       ├── PolySuaraReactions.tsx      # WhatsApp-style floating popover & pill counters
│       ├── PolySuaraStickerPicker.tsx   # 8-pack POLISAS sticker selector drawer/popover
│       ├── PolySuaraStickerBadge.tsx    # Rich inline/card sticker badge renderer
│       └── IGStoryExportCard.tsx       # Existing Instagram Story export component
├── lib/
│   └── polySuaraHelpers.ts             # Sticker definitions, token parser, animal avatar mapper
└── pages/
    └── polyservices/
        └── PolySuaraPage.tsx            # Main page overhauled with light/dark mode & reactions
```

---

## 4. Database Schema & Migration Specification

File: `supabase/migrations/20261005170000_create_polysuara_reactions.sql`

```sql
-- Migration: 20261005170000_create_polysuara_reactions.sql
-- Description: Creates polysuara_reactions table to store multi-emoji reactions

CREATE TABLE IF NOT EXISTS public.polysuara_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    confession_id UUID NOT NULL REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_polysuara_user_reaction UNIQUE(confession_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_polysuara_reactions_confession_id ON public.polysuara_reactions(confession_id);
CREATE INDEX IF NOT EXISTS idx_polysuara_reactions_user_id ON public.polysuara_reactions(user_id);

ALTER TABLE public.polysuara_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read reactions" ON public.polysuara_reactions
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated add reaction" ON public.polysuara_reactions
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Allow authenticated remove reaction" ON public.polysuara_reactions
    FOR DELETE USING ((SELECT auth.uid()) = user_id);
```

---

## 5. Verification & Test Plan

1. **Unit Tests (`src/__tests__/polySuaraHelpers.test.ts`):**
   - Test sticker token extractor and renderer (`extractStickerToken`, `stripStickerToken`).
   - Test animal avatar mapper (`getAnimalAvatarFromCodename`).
   - Test reaction aggregate counter helper (`aggregateReactions`).
2. **Component Tests:**
   - Verify `PolySuaraReactions` renders popover on click and calls `onToggleReaction`.
   - Verify `PolySuaraStickerPicker` renders all 8 stickers and selects a sticker.
3. **Visual & Ergonomics Check:**
   - Full Light Mode and Dark Mode rendering on mobile (360px) and desktop.
   - Verification of `npm test -- --run` and `npm run build`.
