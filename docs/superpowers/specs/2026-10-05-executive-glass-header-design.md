# Executive Glass Header & Visual De-cluttering Spec

**Date:** 2026-10-05  
**Topic:** Executive Glass Header Redesign (De-clutter top right, Frosted Glass Search, Calibrated Typography)

## 1. Problem Diagnosis
1. **Scattered Top-Right Action Cluster**: 4 disjointed circular buttons (ThemeToggle, NotificationBell, Avatar, and an orphaned floating Help button `?` right beneath the avatar) create a chaotic, widget-heavy visual signature.
2. **Harsh White Sticker Search Bar**: The opaque white input bar creates an aggressive, unnatural contrast against the dark obsidian canvas, breaking visual cohesion.
3. **Shouty All-Caps Typography**: Huge uppercase `DEVELOPER` and stacked badges generate cognitive fatigue.
4. **Cramped Logo Pill**: Overloaded text lines within a small high-contrast border.

---

## 2. Refined Design Specification (Approach A - Executive Glass Dock)

### 2.1 Unified Top-Right Glass Capsule
Instead of floating circular buttons, consolidate top actions into **one single glass pill dock**:
- Container: `inline-flex items-center p-1 rounded-2xl bg-white/10 dark:bg-black/30 backdrop-blur-2xl border border-white/15 divide-x divide-white/10 shadow-lg`.
- Segment 1: `<ThemeToggle />` (sized seamlessly within the pill).
- Segment 2: `<NotificationBell variant="dark" />` (with active unread badge).
- Segment 3: User Avatar button (with initials/photo and `.tour-navbar-profile`).
- **Eliminate Orphan Help Button**: Remove the floating `tour-help-button` (`fixed top-20 right-4`). Move "Ulang Tutorial" into `PortalSidebar` and `CommandPalette` (`Ctrl+K`).

### 2.2 Refined JPP Brand Identity Pill
- Clean rounded squircle container with official `/jpp-logo.png`.
- Brand text: `JPP POLISAS` (`text-sm font-black text-white`).
- Micro subtitle: `Portal Rasmi Pelajar` (`text-[9px] text-emerald-400 font-bold`).
- Campus location pill next to it: `📍 POLISAS, Semambu`.

### 2.3 Calibrated Editorial Typography
- Sapaan halus: `greeting.title` (`text-xs text-emerald-300 font-medium`).
- Role badge: Clean subtle pill (`text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5`).
- Student Name: Title-cased refined heading (`text-2xl sm:text-3xl font-black text-white tracking-tight`).
- Subtitle: Relaxed editorial copy (`text-xs text-white/70 max-w-lg`).

### 2.4 Luxury Frosted Glass Search Bar
- Replaces the stark white sticker with physical frosted glass:
  - Background: `bg-white/[0.08] hover:bg-white/[0.12] backdrop-blur-2xl border border-white/15 hover:border-emerald-400/40`.
  - Icon: Refined squircle with emerald glow `bg-emerald-500/20 text-emerald-300`.
  - Text: `text-white/70 group-hover:text-white text-xs sm:text-sm`.
  - Shortcut kbd: Subtle glass chip `bg-white/10 border border-white/10 text-white/50`.

---

## 3. Verification Plan
- Unit tests: Ensure `superAppPortal.test.ts` passes 100%.
- Build verification: `npm run build` with zero errors.
- Visual inspection on localhost:3000 in mobile and desktop viewports.
