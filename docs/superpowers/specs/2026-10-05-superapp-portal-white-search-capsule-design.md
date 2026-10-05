# SuperApp Portal: Signature Dark Banner, Pure White Search Capsule & Ambient Contrast Design Specification

- **Date:** 2026-10-05
- **Status:** Approved
- **Scope:** SuperApp Portal Header & Campus Services Grid Visual Hierarchy

---

## 1. Problem Statement & User Insights
When testing the SuperApp Portal (`/portal`), the user identified three key visual issues:
1. **Dull Gray Dock Pill (`media_1791202464458.png`)**: The top-right pill (`[ ☀️ | 🔔 | D ]`) had a muddy grayish background (`bg-black/25` / `bg-white/10`) with a dark gray square fallback avatar, giving the top header an unpolished, murky appearance.
2. **Search Bar Contrast (`media_1791202497817.png`)**: A dark frosted search bar lacked contrast against the dark emerald hero banner. The user preferred a **pure white stadium capsule (`bg-white`)** with mint search icon and dark slate typography to serve as a bright, crisp, inviting focal point.
3. **Dark Mode Content Boundary (`media_1791202521407.png`)**: In dark mode, because the top header was dark slate/emerald and the body was also dark slate/emerald, the boundary between the hero and the quick action icons felt flat. The 8 service icons were also trapped in washed-out gray squircles (`dark:bg-white/[0.06]`), losing their vivid chromatic identity.

---

## 2. Design Architecture

### A. Pure White Stadium Search Capsule (`SuperAppHeader.tsx`)
- **Container Button:**
  - `w-full h-12 px-4 rounded-full bg-white hover:bg-slate-50 text-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.18)] hover:shadow-[0_10px_35px_rgba(0,0,0,0.22)] border border-white/40 flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] group cursor-pointer`
- **Search Icon (Left):**
  - Mint circle badge: `w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`
  - Icon: Lucide `Search` (`w-3.5 h-3.5`)
- **Search Placeholder Text:**
  - `text-xs sm:text-sm text-slate-500 group-hover:text-slate-700 font-medium truncate`
  - Text: `"Cari makanan, runner, servis, acara, merit..."`
- **Kbd Badge (Right):**
  - `hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 rounded-full border border-slate-200/80`

### B. Ultra-Clear Frosted Glass Dock & Emerald Ring Avatar (`SuperAppHeader.tsx`)
- **Dock Capsule Container:**
  - `inline-flex items-center p-1 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 divide-x divide-white/10 shadow-lg shrink-0`
- **Action Buttons (`ThemeToggle`, `NotificationBell`):**
  - Transparent inner background: `[&_button]:!h-8 [&_button]:!w-8 [&_button]:!bg-transparent [&_button]:hover:!bg-white/10 [&_button]:!text-white [&_button]:!rounded-xl`
- **User Profile Avatar:**
  - Button container: `relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-emerald-400/50 hover:ring-emerald-400/80 active:scale-95 transition-all shadow-sm focus:outline-none cursor-pointer shrink-0`
  - Fallback: `bg-gradient-to-tr from-emerald-600 to-teal-500 text-white text-[11px] font-black rounded-full`

### C. Header Separation & Contrast Boundary
- **Header Bottom Glow & Hairline:**
  - `border-b border-emerald-500/20 shadow-[0_12px_32px_rgba(0,0,0,0.35)]`
  - Gradient: Remains the Signature Executive Dark Emerald (`from-emerald-950 via-slate-900 to-slate-950 text-white`) with subtle ambient top and bottom glow orbs.

### D. Cyber Luminescent Service Cards (`CampusServicesGrid.tsx`)
- **Outer Button Container:**
  - Light mode: `bg-white hover:bg-slate-50 border border-slate-200/70 hover:border-emerald-400/40 shadow-xs hover:shadow-md rounded-2xl sm:rounded-3xl`
  - Dark mode: `dark:bg-slate-900/80 dark:hover:bg-slate-800/90 dark:backdrop-blur-md dark:border-white/[0.08] dark:hover:border-emerald-500/30 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]`
- **Icon Squircles:**
  - Remove hardcoded `dark:bg-white/[0.06] dark:border dark:border-white/10 dark:shadow-inner`.
  - Light mode: High-contrast pastel squircles (`bg-{color}-50 text-{color}-600 border-{color}-200 shadow-xs`).
  - Dark mode: Vibrant colored squircles with micro-luminescence (`dark:bg-{color}-500/20 dark:text-{color}-400 dark:border-{color}-500/40 dark:shadow-[0_0_12px_rgba(...)]`).
  - Colors:
    - `polysuara`: Rose (`rose-500`)
    - `polymart`: Amber (`amber-500`)
    - `takwim`: Indigo (`indigo-500`)
    - `polymaps`: Emerald (`emerald-500`)
    - `polyrent`: Cyan (`cyan-500`)
    - `kebajikan`: Teal (`teal-500`)
    - `akademik_qr`: Purple (`purple-500`)
    - `ekpp`: Blue (`blue-500`)

---

## 3. Strict Constraints & Non-Negotiables
1. **Do NOT touch `PolySuaraReactions.tsx`**: Preserved strictly.
2. **Preserve Navigation & Modals**: `triggerCommandPalette`, `onOpenSidebar`, `onOpenPolymartModal`, `onOpenKamsisModal` must continue to function seamlessly.
3. **Zero Test Regressions**: All 15 test suites and 204+ unit tests must pass.
4. **Clean Production Build**: `npm run build` must compile with 0 errors.

---

## 4. Verification Plan
- Unit tests in `src/__tests__/superAppPortal.test.ts` verifying:
  - Search capsule renders `bg-white`, `rounded-full`, and `text-slate-800`.
  - Top-right dock capsule renders `bg-white/[0.08]` with `ring-2 ring-emerald-400/50`.
  - Service icons render their respective chromatic tokens without `dark:bg-white/[0.06]` suppression.
- Build verification via `npm run build`.
