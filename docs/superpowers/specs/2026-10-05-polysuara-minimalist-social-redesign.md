# PolySuara Minimalist Social Feed (Threads / X Aesthetic) Redesign Spec

* **Date:** 2026-10-05
* **Target Branch:** `feat/campus-super-app-portal`
* **Status:** Approved
* **Design Read:** Campus anonymous microblog / social feed (Threads / X minimalist language) for POLISAS students, with a calm, high-end editorial aesthetic, leaning toward restrained Tailwind utilities + Framer Motion + spacious typography, zero stickers, zero clutter, and pure mobile ergonomics.
* **Dials:** `DESIGN_VARIANCE: 6` | `MOTION_INTENSITY: 5` | `VISUAL_DENSITY: 3`

---

## 1. Executive Summary & Design Rationale

PolySuara's previous redesign suffered from cognitive overload: a bulky permanently expanded composer, stickers adding visual noise, multiple competing status badges, and vertical stacking of filter and sort rows that pushed content 300px+ below the fold on mobile devices.

This redesign transforms PolySuara into a **high-end, distraction-free campus social feed** inspired by Threads and X:
1. **Total Deprecation of Stickers:** Strips out all sticker pickers, sticker badges, and token parsing. Returns focus to authentic written student confessions and community conversations.
2. **Threads-style Quick-Compose Bar & Modal:** Replaces the heavy static form with an elegant interactive prompt capsule (`[Avatar] "Apa luahan atau rahsia kampus hari ini? ✍️" [Image] [Poll]`) that opens a distraction-free Compose Modal/Drawer.
3. **Single-Line Streamlined Feed Navigation:** Merges Sort toggles (`✨ Terkini` / `🔥 Hangat`) and Category filter chips into a single unified horizontal scroll track.
4. **Airy, Editorial Confession Cards:**
   - Single subtle border with soft shadows (`bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] rounded-3xl p-5`).
   - Clean header: Animal avatar squircle + Codename + relative timestamp + at most 1 subtle category badge.
   - Editorial typography: `text-[15px] sm:text-base leading-relaxed` with comfortable line height.
   - Clean engagement row: WhatsApp-style floating reaction trigger & pills, subtle dislike counter, comment count, and share icon.
5. **Clean iOS/Threads Comments Drawer:** Distraction-free sheet with thin thread connector lines and a bottom-docked input bar.

---

## 2. Component Architecture & Changes

### 2.1 Sticker System Removal
- Remove usage of `PolySuaraStickerBadge` and `PolySuaraStickerPicker` from `PolySuaraPage.tsx`.
- Deprecate sticker state `composerStickerId`, `commentStickerId`, and their respective pickers.
- Any legacy `[sticker:id]` tokens in existing posts are automatically stripped from visible display via `extractStickerToken` or simple regex cleaning.

### 2.2 Threads-Style Quick-Compose Capsule (`<QuickComposeBar />`)
- On the main feed:
  - Renders a sleek pill container:
    ```tsx
    <div
      onClick={() => setComposeModalOpen(true)}
      className="bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/[0.08] hover:border-rose-400/40 dark:hover:border-rose-500/30 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 mb-6 shadow-xs flex items-center justify-between gap-3 cursor-pointer group transition-all"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-lg shrink-0">
          ✍️
        </div>
        <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 font-medium truncate">
          Ada luahan atau rahsia kampus? Kongsi secara rahsia...
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 text-slate-400 group-hover:text-rose-500 transition-colors">
        <ImageIcon className="w-4 h-4" />
        <BarChart className="w-4 h-4" />
      </div>
    </div>
    ```
- Clicking it opens `<ComposeModal />` (desktop: centered floating card; mobile: bottom slide-up sheet).
  - Inside: Spacious textarea, category select chip row, image upload dropzone, poll creator toggle, character counter, and "Kongsi Luahan" button.

### 2.3 Single-Line Feed Navigation Bar
- A unified horizontal track:
  ```
  [✨ Terkini] [🔥 Hangat]   |   [SEMUA] [AKADEMIK] [FASILITI] [KAMSIS] [KAUNSELING]
  ```
- Replaces two clumsy vertical stacked blocks into a single clean line with `overflow-x-auto scrollbar-none`.

### 2.4 Confession Card & Engagement Row
- Card layout:
  - Header:
    - Left: Squircle animal avatar (`w-9 h-9 rounded-xl flex items-center justify-center text-base`) + Codename (`font-bold text-sm text-slate-900 dark:text-white`) + Time (`text-xs text-slate-400`).
    - Right: Subtle Category badge (`bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 text-[10px] font-semibold px-2 py-0.5 rounded-full`) + Report flag button.
  - Body:
    - Text: `text-[15px] sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-normal`.
    - Media / Poll: Clean rounded-2xl container.
    - Official JPP Reply: Refined quote callout (`border-l-2 border-teal-500 bg-teal-500/[0.04] p-3.5 rounded-r-2xl`).
  - Footer Action Row:
    - `<PolySuaraReactions />` (WhatsApp popover with 6 emojis + active count pills).
    - Dislike button: Subtle 👎 with count.
    - Comment button: 💬 with count, opening the comments drawer.
    - Share button: Share icon.
    - Admin actions (JPP Reply, Pin) if role permits.

---

## 3. Verification & Testing

- Unit tests in `src/__tests__/polySuaraPage.test.ts` and `src/__tests__/polySuaraComments.test.ts`.
- Full project test suite: `npm test -- --run`.
- Production build: `npm run build`.
- Local dev server verification: `http://localhost:3000/polysuara`.
