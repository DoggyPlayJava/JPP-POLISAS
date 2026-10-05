# PolySuara Next-Gen Campus Social App (Pipel / Dribbble UI/UX) Design Spec

* **Date:** 2026-10-05
* **Target Branch:** `feat/campus-super-app-portal`
* **Status:** Approved
* **Design Read:** Next-gen campus social media app (directly inspired by the user's uploaded Dribbble & Pipel references) for POLISAS students, with a luxury mobile-app aesthetic, featuring a top Campus Pulse story ring track, elevated rounded-[2rem] floating social cards with rich typography and micro-interactions, an animated segmented tab bar (Untuk Anda / Terkini / Hangat), and a radiant floating action button (FAB +) with glass glow.
* **Dials:** `DESIGN_VARIANCE: 8` | `MOTION_INTENSITY: 6` | `VISUAL_DENSITY: 4`

---

## 1. Executive Summary & Core Motivation

PolySuara's interface is being transformed from a plain confession bulletin into a **flagship alternative campus social network** inspired by contemporary consumer social applications like Pipel, BeReal, and Dribbble mobile concepts.

Key upgrades:
1. **Campus Pulse Story Rings:** Horizontal track of glowing avatar rings showcasing trending campus moods, exam prep, residential life, food spots, and an instant `+ Luah` bubble.
2. **Interactive 3-Way Social Tabs:** `Untuk Anda (For You)`, `Terkini (Latest)`, and `Hangat (Trending)` with a smooth sliding underline indicator (`layoutId="activeFeedTab"`).
3. **Elevated Floating Feed Cards (`rounded-[2rem]`):** Soft luxury shadows, gradient avatar rings, bold usernames with anonymous verification badge (✓), comfortable line heights, and refined media aspect ratios.
4. **Social Action Row:** WhatsApp-style floating emoji reaction popover + pills, subtle dislike counter, comment count, and paper-plane share action.
5. **Radiant Center Floating Action Button (FAB `+`):** A luminous gradient action button allowing one-tap confession creation from anywhere in the feed.
6. **Dual Light & Dark Mode:** Pristine white and deep obsidian glass parity with zero color clashes.

---

## 2. Component Architecture

```
src/
├── components/
│   └── polysuara/
│       ├── CampusPulseBar.tsx          # Story-style horizontal bubble track
│       ├── SocialTabNav.tsx            # Animated 3-way tab bar (Untuk Anda / Terkini / Hangat)
│       ├── PolySuaraReactions.tsx      # WhatsApp floating reactions & pill counters
│       └── FloatingComposeFab.tsx       # Radiant floating action button (+)
├── lib/
│   └── polySuaraHelpers.ts             # Clean text helper, animal avatars, reaction aggregations
└── pages/
    └── polyservices/
        └── PolySuaraPage.tsx            # Main page assembling the next-gen social experience
```

---

## 3. Specifications for Key Components

### 3.1 Campus Pulse Bar (`CampusPulseBar.tsx`)
- Renders a horizontal scroll track (`flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x`):
  1. `+ Luahkan`: Gradient ring with `+` badge, opens the compose modal.
  2. `⚡ Hangat`: Filters to trending confessions with high reactions.
  3. `📚 Exam`: Filters to 'AKADEMIK' category.
  4. `🏠 Kamsis`: Filters to 'KAMSIS' category.
  5. `🍔 Kafe`: Filters to food/cafe chatter or 'FASILITI'.
  6. `💬 Aduan`: Filters to 'KAUNSELING' / welfare issues.
- Tapping a pulse bubble filters the feed with smooth haptic feedback and highlights the active bubble with a glowing ring.

### 3.2 Social Tab Navigation (`SocialTabNav.tsx`)
- 3 Tabs:
  - `FOR_YOU` ("Untuk Anda")
  - `LATEST` ("Terkini")
  - `TRENDING` ("Hangat")
- Framer Motion `layoutId="activeFeedTabIndicator"` provides a fluid sliding underline.

### 3.3 Elevated Floating Confession Cards (`rounded-[2rem]`)
- Container:
  - Light mode: `bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.07)] rounded-[2rem] p-5 sm:p-6 mb-5 transition-all`
  - Dark mode: `dark:bg-slate-900/70 dark:backdrop-blur-xl dark:border-white/[0.07] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] rounded-[2rem] p-5 sm:p-6 mb-5 transition-all`
- Header:
  - Circular avatar with neon gradient ring (`p-0.5 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400`).
  - Inside: Cute animal emoji (`🐱`, `🐯`, `🦅`, `🦊`, etc.).
  - Author Codename in bold font with verified tick (`✓`) and relative timestamp.
  - Category pill badge + `...` options menu (Report / Share).
- Content:
  - Editorial typography (`text-[15px] sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 font-normal mb-3`).
  - Attached media with `rounded-2xl overflow-hidden`.
  - Polls with modern progress bars.
  - Official JPP reply with verified teal side border.
- Social Engagement Row:
  - Left: `<PolySuaraReactions />` + ThumbsDown (👎) + Comments (💬).
  - Right: Paper plane share (`Share2`) + Bookmark icon.

### 3.4 Radiant Floating Action Button (`FloatingComposeFab.tsx`)
- Fixed at the bottom center of the screen, floating above `BottomNav`:
  - `w-14 h-14 rounded-full shadow-[0_8px_25px_rgba(244,63,94,0.4)] bg-gradient-to-tr from-rose-600 via-pink-500 to-rose-400 text-white flex items-center justify-center cursor-pointer active:scale-90 transition-transform`
  - Subtle pulsing aura ring.
  - Clicking triggers `onOpenCompose()`.

---

## 4. Verification & Testing

- Unit tests for `CampusPulseBar`, `SocialTabNav`, and `FloatingComposeFab`.
- Integration tests in `src/__tests__/polySuaraPage.test.ts`.
- Full project verification: `npm test -- --run` and `npm run build`.
