# Design Specification: Flagship Landing Page SuperApp & E-Akademik Light Mode Parity (with PolyMaps Refinements)

- **Date:** 2026-10-06
- **Target Modules:**
  1. `src/pages/LandingPage.tsx` (Flagship Squarespace-Inspired Redesign)
  2. `src/pages/akademik/*` (`AkademikLayout.tsx`, `AkademikDashboard.tsx`, `AkademikCgpa.tsx`, `AkademikFolderPage.tsx`) — Light Mode Parity
  3. `src/pages/polymaps/PolyMapsPage.tsx` — Disable EMS/PolyMart overlays & fix touch slider gesture
- **Theme Palette:** Dual-Tone Forest & Sage (Semi-Muted) for Landing Page; Apple Porcelain Light & Obsidian Dark for E-Akademik
- **Aesthetic Guidance:** `/brandkit`, `/design-taste-frontend`, Zero AI-Slop, Zero Raw Emojis

---

## 1. Executive Summary & Design Vision

### 1.1 Landing Page ("Anti-Slop Flagship")
The current `LandingPage.tsx` relies on outdated maroon/reddish themes, generic "AI slop" gradients, and busy mock containers. The redesign transforms it into a world-class institutional showcase inspired by Squarespace's iconic dark editorial aesthetic:
- **Tone:** Dual Tone Forest & Sage (Semi-Muted) — Deep pine dark canvas (`#08140E`), organic sage green accents (`#84A98C`, `#52796F`, `#2D6A4F`), crisp porcelain typography, and subtle, non-intrusive ambient glows.
- **Hero:** Asymmetric, bold sans-serif display typography ("Masa Depan Kampus Digital Bermula Di Sini"), crisp subtext (≤ 20 words), direct `[ Masuk Portal ➔ ]` CTA, floating perspective mockup deck displaying live SuperApp surfaces (Portal Cockpit, PolyMart, PolyMaps), and real campus metrics ticker.
- **Interactive Showcase Tabs:** Interactive category selector (`Semua`, `Kebajikan`, `PolyMart`, `Akademik`, `Acara & Sukan`) with real UI preview cards.
- **Platform Capabilities Bento:** 4 structural pillars (Tadbir Urus Kelab, Pasaran Siswa, Kebajikan Mahasiswa, Kampus Pintar & Peta).
- **Nexus AI Spotlight:** Paperwork auditing & student assistant preview.
- **Interactive Quick Search Bar:** Interactive pill input linking to campus services and Command Palette.
- **Curved 3D Showcase & Social Proof:** Curved gallery showing student projects and clubs.
- **Hairline Accordion FAQ:** Sleek, minimal disclosure rows.
- **Circular Sphere Final CTA:** Particle halo graphic framing the closing portal CTA.
- **Clean Editorial Footer:** Multi-column navigation links and official copyright.

### 1.2 E-Akademik Light Mode Parity
Currently, E-Akademik has hardcoded dark styles (`bg-slate-950 text-white`, `border-white/10`) and lacks theme parity when users toggle light mode. The redesign establishes full **Apple Porcelain Light & Obsidian Dark** parity:
- `AkademikLayout.tsx`: Container switches dynamically (`bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white`). Header gains `<ThemeToggle />` alongside user profile.
- `AkademikDashboard.tsx`: Porcelain cockpit card (`bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.07]`), dual-mode quick action cards with compliant touch contrast.
- `AkademikCgpa.tsx`: Dual-mode Recharts AreaChart axis ticks, high-contrast light semester cards, and slip uploader dropzone.
- `AkademikFolderPage.tsx`: Dual-mode folder presets, document list, and `InAppDocumentPreviewer` lightbox.

### 1.3 PolyMaps Touch Slider & Overlay Fixes
- **Disable EMS & PolyMart Overlays:** Remove EMS event pins and PolyMart hub markers from the Leaflet map and revert filter pills to clean campus amenities (`Semua`, `Kafe`, `Surau`, `Tandas`).
- **Fix Touch Sheet Gestures:** Add `touch-action: none` (`touch-none`) to the drag handle bar and top grab area so mobile browsers do not capture vertical swipes as viewport pull-to-refresh or window scrolls. Provide tactile 1-tap snap pill toggles (`[ Ringkas ] [ Separuh ] [ Penuh ]`) on the sheet for zero-friction access.

---

## 2. Palette & Design System Tokens

### 2.1 Landing Page Palette (Dual Tone Forest & Sage)
```css
--canvas-bg: #08140E;           /* Deep Pine Forest */
--canvas-surface: #0E2218;      /* Rich Obsidian Forest Card */
--canvas-card-border: rgba(82, 121, 111, 0.25);
--accent-sage: #84A98C;          /* Muted Sage */
--accent-forest: #2D6A4F;        /* Deep Evergreen */
--accent-mint: #74C69D;          /* Luminous Mint Highlight */
--text-display: #FFFFFF;         /* Crisp White */
--text-body: #94A3B8;            /* Sage-Slate Muted */
```

### 2.2 E-Akademik Porcelain & Obsidian Tokens
- **Light Mode:** Canvas `bg-slate-50`, Surface `bg-white`, Text `text-slate-900`, Subtext `text-slate-500`, Border `border-slate-200/80`, Shadows `shadow-xs`.
- **Dark Mode:** Canvas `dark:bg-slate-950`, Surface `dark:bg-slate-900` or `dark:bg-white/[0.02]`, Text `dark:text-white`, Subtext `dark:text-white/40`, Border `dark:border-white/[0.07]`.

---

## 3. Component Architecture & Data Flow

### 3.1 Landing Page Sections (`src/pages/LandingPage.tsx`)
1. `<Navbar />`: Glassmorphic pill navbar with JPP logo, links to Ekosistem / Keupayaan / Soalan Lazim, and `[ Daftar Masuk / Masuk Portal ]` CTA.
2. `<Hero />`:
   - Left: Eyebrow badge `JPP POLISAS · Sistem Kampus Pintar`, H1 display typography, max-20-word value proposition, primary CTA `[ Masuk Portal Pelajar ➔ ]`, secondary CTA `[ Terokai Ekosistem ]`.
   - Right: Perspective Floating SuperApp Deck (stacked angled cards of Portal, PolyMart, PolyMaps).
   - Bottom: Live stats ribbon (`15,000+ Mahasiswa`, `120+ Kelab Aktif`, `12 Modul Bersepadu`, `100% Digital`).
3. `<InteractiveShowcase />`: Category pills (`Semua`, `Kebajikan`, `PolyMart`, `Akademik`, `Acara & Sukan`). Active state switches real component preview cards with smooth cross-fade animation.
4. `<PlatformCapabilitiesBento />`: 4 cards in an asymmetric grid:
   - Card 1: Tadbir Urus Kelab (e-Aktiviti)
   - Card 2: Pasaran Siswa (PolyMart)
   - Card 3: Bantuan Kebajikan (e-Kebajikan & FoodBank)
   - Card 4: Kampus Pintar & Peta (PolyMaps 360°)
5. `<NexusAiSpotlight />`: Dual split cards with dark sage mesh backdrop highlighting AI paperwork verification & student assistant.
6. `<InteractiveSearchBar />`: Pill search container prompting queries for course codes, facilities, or clubs, focusing or opening Command Palette (`triggerCommandPalette()`).
7. `<CuratedCampusGallery />`: 3D curved gallery representation of student projects, clubs, and campus landmarks.
8. `<FaqAccordion />`: 4 clean, hairline-divided questions covering portal registration, matric login, and club management.
9. `<FinalSphereCta />`: Circular particle starburst framing a high-contrast headline and portal action button.
10. `<EditorialFooter />`: Clean multi-column footer with official links, disclaimers, and copyright.

### 3.2 E-Akademik Dwi-Mod Architecture (`src/pages/akademik/*`)
1. `AkademikLayout.tsx`:
   - Replace root container with `bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white`.
   - Mount `<ThemeToggle />` in top right header bar.
   - Sidebar reflects `bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-white/[0.06]`.
2. `AkademikDashboard.tsx`:
   - Cockpit header: `bg-white dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.07] text-slate-900 dark:text-white`.
   - Quick action buttons: `bg-slate-100/70 dark:bg-white/[0.03] text-slate-900 dark:text-white`.
3. `AkademikCgpa.tsx`:
   - Recharts AreaChart: Dynamic stroke, axis fills (`#64748B` on light, `rgba(255,255,255,0.3)` on dark), and tooltip styling.
   - Semester history cards: `bg-white dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.06] text-slate-900 dark:text-white`.
4. `AkademikFolderPage.tsx`:
   - Folder presets & file cards: Dual-mode porcelain surfaces.
   - In-app document previewer lightbox: Light mode backdrop and dark mode obsidian frame.

### 3.3 PolyMaps Adjustments (`src/pages/polymaps/PolyMapsPage.tsx`)
1. Temporarily comment out / hide EMS event pins and PolyMart vendor markers from the map.
2. Filter pills reverted to: `[ Semua ]`, `[ Kafe ]`, `[ Surau ]`, `[ Tandas ]`.
3. Bottom sheet drag handle given `touch-action: none;` (`touch-none`) and explicit touch event handling to prevent mobile overscroll/pull-to-refresh conflicts.
4. Add clear 1-tap snap buttons (`[ Ringkas ] [ Separuh ] [ Penuh ]`) above the card content for immediate height adjustments.

---

## 4. Verification & Testing Strategy
1. **Unit & Integration Tests (`akademikPolymapsSuperApp.test.ts` & `landingPage.test.ts`):**
   - Verify zero raw emojis across `LandingPage.tsx` and all `src/pages/akademik/*` files.
   - Verify `ThemeToggle` is rendered in `AkademikLayout.tsx`.
   - Verify dark: classes exist across all E-Akademik components.
   - Verify PolyMaps excludes active EMS/PolyMart pins and contains `touch-none`.
2. **Regression Testing:**
   - Run `npm test -- --run` (all 22 suites pass).
3. **Build Gate:**
   - Run `npm run build` with 0 compilation errors.
