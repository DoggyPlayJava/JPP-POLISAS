# SuperApp Portal: Floating Discrete Action Circles Header Design Specification

- **Date:** 2026-10-05
- **Status:** Approved
- **Scope:** SuperApp Portal Header Top-Right Action Controls (`SuperAppHeader.tsx`)

---

## 1. Problem Statement
The previous consolidated dock capsule (`inline-flex items-center p-1 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 divide-x divide-white/10`) rendered on dark backgrounds as an elongated, hazy charcoal/gray pill box. The border and divider lines created an awkward visual container that clashed with the clean, pure white stadium search bar below it.

---

## 2. Design Architecture

### A. Floating Discrete Action Circles (`SuperAppHeader.tsx`)
- **Container Layout:**
  - Replace the single enclosed capsule box and divider lines with an open flex row:
  - `flex items-center gap-3 shrink-0` (per user direction: `gap-3` for comfortable tap targets and airy breathing space).
  - No outer capsule pill background.
  - No divider lines (`divide-x` eliminated).

### B. Individual Button Specifications
1. **Theme Toggle Circle Button:**
   - Outer wrapper / button:
     `w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md shadow-sm flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-95 shrink-0 [&_button]:!h-9 [&_button]:!w-9 [&_button]:!rounded-full [&_button]:!bg-transparent [&_button]:hover:!bg-transparent [&_button]:!p-0`
   - Icon: Crisp Sun/Moon glyph centered with smooth micro-transition.

2. **Notification Bell Circle Button:**
   - Outer wrapper / button:
     `w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md shadow-sm flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-95 shrink-0 [&_button]:!h-9 [&_button]:!w-9 [&_button]:!rounded-full [&_button]:!bg-transparent [&_button]:hover:!bg-transparent [&_button]:!p-0`
   - Unread indicator: Absolute badge positioned over the circle with rose luminescence.

3. **User Profile Avatar Circle Button:**
   - Button:
     `tour-navbar-profile relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-emerald-400/60 hover:ring-emerald-400 active:scale-95 transition-all shadow-md focus:outline-none cursor-pointer shrink-0`
   - Fallback:
     `bg-gradient-to-tr from-emerald-600 to-teal-500 text-white text-[11px] font-black rounded-full`

---

## 3. Strict Constraints & Non-Negotiables
1. **Preserve Functionality:** `onOpenSidebar`, `ThemeToggle`, `NotificationBell`, and `triggerCommandPalette` continue to function 100%.
2. **Preserve Search Bar:** The pure white stadium capsule search bar (`w-full h-12 px-4 rounded-full bg-white ...`) is preserved without alterations.
3. **Zero Test Regressions:** All unit tests in `src/__tests__/superAppPortal.test.ts` pass cleanly.
4. **Clean Production Build:** `npm run build` compiles with 0 errors.

---

## 4. Verification Plan
- Unit tests verifying:
  - Header renders 3 discrete floating circular buttons with `gap-3`.
  - Outer dock pill class `rounded-2xl bg-white/[0.08]` and `divide-x` are eliminated.
  - Buttons render `rounded-full` with `border-white/15` and `bg-white/10`.
  - Avatar button renders `w-9 h-9 rounded-full ring-2 ring-emerald-400/60`.
- All 15 test suites and 205+ tests pass cleanly.
- `npm run build` compiles with 0 errors.
