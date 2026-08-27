# Multi-Category EMS Event Builder & Jury Category Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Program Directors to configure multiple competition categories simultaneously (e.g. both *Best Showcase* AND *Best Pitching*) within a single EMS event, and upgrade the Jury Portal (`/ems/juri`) with a clean Category Selection Gateway (Hub Pemilihan Kategori -> Senarai Peserta Kategori -> Butang "Penilaian Kategori Seterusnya").

**Architecture:** 
- Update `EmsEventFormPage.tsx` preset handlers to support **Append Mode** (so directors can load *Best Showcase* and *Best Pitching* rubrics into the same event without replacing). Group rubric cards visually by Category.
- Update `EmsJuryPortalPage.tsx` with a **Category Selection Gateway Screen**: Juries select their active Category card (*Best Showcase* vs *Best Pitching*) before viewing participant cards. Include a **"⏩ Penilaian Kategori Seterusnya"** shortcut button to switch categories instantly.
- Update `EmsLeaderboardPage.tsx` category filter tabs to ensure distinct podium ranks (Gold 🥇, Silver 🥈, Bronze 🥉) for each category.

**Tech Stack:** React, TypeScript, Supabase Client, Tailwind CSS, Lucide Icons, React Hot Toast.

## Global Constraints
- RLS Policies must use `(SELECT auth.uid())`.
- Never execute sequential queries in loops (N+1 anti-pattern); use `Promise.all`.
- Always clean up Realtime subscriptions (`return () => channel.unsubscribe()`).
- All code must pass `npx tsc --noEmit`.

---

### Task 1: Multi-Category Append Mode in Event Builder (`src/pages/ems/EmsEventFormPage.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsEventFormPage.tsx`

**Interfaces:**
- Consumes: `IFAMB_SHOWCASE_PRESET`, `IFAMB_PITCHING_PRESET`.
- Produces: Append mode preset buttons and category-grouped rubric editor UI.

- [ ] **Step 1: Update Preset Loaders to support Append Mode**

Update `handleLoadShowcasePreset` and `handleLoadPitchingPreset` to check if rubrics already exist:
- If rubrics exist from another category, append the new preset items (keeping existing items!).
- Show toast: `"Templat iFAMB Best Showcase (+16 Rubrik) telah ditambah ke dalam borang!"`.

- [ ] **Step 2: Visually Group Rubric Cards by Category Name**

In Section 3 of `EmsEventFormPage.tsx`:
- Group `rubrics` array by `category_name || 'Umum'` for rendering.
- Render Category Header Banners with total weight per category (e.g., `Kategori: Best Showcase (100% Pemberat)` and `Kategori: Best Pitching (100% Pemberat)`).

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/ems/EmsEventFormPage.tsx
git commit -m "feat(ems): support multi-category append mode and category grouping in event builder"
```

---

### Task 2: Jury Portal Category Selection Gateway & Next Category Switcher (`src/pages/ems/EmsJuryPortalPage.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsJuryPortalPage.tsx`

**Interfaces:**
- Consumes: `rubrics`, `participants`, `assigned_categories`.
- Produces: `selectedCategory` state, Category Gateway UI, and "Penilaian Kategori Seterusnya" navigation button.

- [ ] **Step 1: Add Category Gateway State in `EmsJuryPortalPage.tsx`**

Add state:
```typescript
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
```

Compute `availableCategories` by extracting unique non-empty `category_name` values from `rubrics` and `participants`.

- [ ] **Step 2: Render Category Gateway Screen when `selectedCategory === null`**

If there are 2 or more categories and `selectedCategory` is null:
- Render a clean **Hub Pemilihan Kategori Penilaian**:
  - Grid of Category Cards (e.g., 📦 **Best Showcase** and 🎤 **Best Pitching**).
  - Each card shows category title, count of assigned participants/booths, count of evaluation criteria, and **"Masuk Penilaian ➔"** button.
  - Clicking a card sets `selectedCategory`.

- [ ] **Step 3: Render Filtered Participant List & "Penilaian Kategori Seterusnya" Button**

When `selectedCategory` is active:
- Filter displayed participants by `selectedCategory`.
- Display top banner: `Kategori Penilaian Semasa: Best Showcase` with **"← Tukar Kategori"** button.
- Add a prominent action button: **"⏩ Penilaian Kategori Seterusnya: Best Pitching ➔"** at the top & bottom of the participant list to allow 1-click switching to the next category!

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/ems/EmsJuryPortalPage.tsx
git commit -m "feat(ems): add jury portal category gateway and next category switcher"
```

---

### Task 3: Category Rank Sync on Leaderboard (`src/pages/ems/EmsLeaderboardPage.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsLeaderboardPage.tsx`

**Interfaces:**
- Consumes: Leaderboard items with `category_name`.
- Produces: Multi-category filtered rankings and distinct podium placements.

- [ ] **Step 1: Ensure Leaderboard default tab selects first available Category**

If an event has multiple categories (e.g. *Best Showcase* and *Best Pitching*):
- Extract unique category list from `leaderboard`.
- Ensure category filter tabs (e.g. `[Semua, Best Showcase, Best Pitching]`) calculate rank numbers 1, 2, 3 independently per category!

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/ems/EmsLeaderboardPage.tsx
git commit -m "feat(ems): sync multi-category rankings and podiums on leaderboard page"
```

---

## Verification Plan

### Automated Tests
- Run `npx tsc --noEmit` to verify 100% type safety.

### Manual Verification
1. Go to `/ems/event/new`.
2. Click **"➕ Tambah Templat iFAMB Best Showcase"**. Verify 16 rubrics added.
3. Click **"➕ Tambah Templat iFAMB Best Pitching"**. Verify 10 rubrics appended (Total 26 rubrics across 2 categories!).
4. Save event and log in to `/ems/juri` as a Jury.
5. Verify **Category Gateway Screen**:
   - Displays 2 cards: **Best Showcase** and **Best Pitching**.
   - Click **Best Showcase**. Verify only Best Showcase participants/booths are displayed.
   - Click **"⏩ Penilaian Kategori Seterusnya: Best Pitching ➔"**. Verify view switches smoothly to Best Pitching!
