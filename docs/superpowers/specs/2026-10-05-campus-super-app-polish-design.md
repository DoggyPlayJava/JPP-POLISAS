# Campus Super App Polish & Visual Refinement Spec

**Date:** 2026-10-05  
**Topic:** Campus Super App Polish (Maroon Premium, 8-Icon Grid Refinement, NotificationBell, ThemeToggle, Mobile Ergonomics)

## 1. Problem Statement & User Feedback
From the real-world user test of the Campus Super App portal, the following issues were flagged:
1. **Wrong Color Palette**: The header displayed a greenish/teal tone instead of the official POLISAS Executive Maroon identity.
2. **Missing JPP Branding**: The official JPP crest/logo (`/jpp-logo.png`) was absent in the header.
3. **Inoperable Notification Bell**: The bell button was an empty trigger without a real notification drawer/popover.
4. **Missing ThemeToggle**: The Dark/Light mode toggle was not accessible in the header.
5. **Icon Grid Alignment**:
   - `PolyRider` -> replace with `PolySuara` (`/polysuara`).
   - `Kamsis` -> replace with `PolyMaps` (`/polymaps`).
   - `EMS` -> replace with `PolyRent` (`/polyrent`).
   - `PolyServices` -> replace with `Takwim` (`/akademik/takwim`).
6. **Mobile Ergonomics & Collision**:
   - Bottom floating dock (`BottomNav`) overlapped the bottom food cards due to insufficient padding.
   - `EmsEventsFeed` rendered a broken dashed empty state when no events were published.
   - `FloatingAiChat` collided with the bottom dock on mobile screens.

---

## 2. Architecture & Design Specification

### 2.1 Institutional Executive Maroon Branding (`SuperAppHeader.tsx`)
- **Theme Gradient**:
  - Default / Institutional Mode: `from-[#4A0E17] via-[#6B141E] to-[#1C0508]` with warm specular ruby/gold refraction.
  - Karnival Mode: `from-violet-950 via-purple-900 to-slate-950`.
  - SUPSAS Mode: `from-amber-900 via-orange-950 to-slate-950`.
- **Branding Header**:
  - Official JPP logo (`/jpp-logo.png`) displayed prominently in a rounded glass pill alongside `JPP POLISAS`.
  - Campus Location: `📍 POLISAS, Semambu, Kuantan`.
  - Integrated Header Controls:
    - `<ThemeToggle />` for instant one-tap Dark / Light mode switching.
    - `<NotificationBell />` from `@/components/ui/NotificationBell` for authentic campus alerts with real unread counts and interactive drawer/popover.
  - Real-time Greeting (`Selamat Pagi/Petang, [Nama]`) with role badge (`SISWA POLISAS`, `MAJLIS JPP`, `PENTADBIR UTAMA`).
  - Floating Search Bar triggering `CommandPalette` (`Ctrl+K`).

### 2.2 Realigned 8 Campus Service Icons (`CampusServicesGrid.tsx`)
Grid 4x2 on mobile, fully tactile (`whileTap={{ scale: 0.95 }}`):
1. **PolySuara** (`/polysuara`) — Suara & Maklum Balas Siswa (Megaphone icon, Rose tint).
2. **PolyMart** (`/keusahawanan/dashboard`) — Pasaran & Kafe Siswa (UtensilsCrossed icon, Orange tint).
3. **Takwim** (`/akademik/takwim`) — Kalendar Akademik & Cuti Rasmi (CalendarDays icon, Sky tint).
4. **PolyMaps** (`/polymaps`) — Peta Interaktif & Navigasi Kampus (Map icon, Teal tint).
5. **PolyRent** (`/polyrent`) — Sewaan Barangan & Peralatan Siswa (Package/KeyRound icon, Indigo tint).
6. **E-Kebajikan** (`/kebajikan`) — Aduan Kerosakan & FoodBank (HeartHandshake icon, Emerald tint).
7. **Scan QR** (`/akademik/qr`) — Kumpul Merit Siswa (QrCode icon, Violet tint).
8. **Kelab EKPP** (`/kelab`) — Kertas Kerja Persatuan (Landmark icon, Amber tint).

### 2.3 Mobile-First Ergonomics & Layout Balance
- **Bottom Dock Spacing**: Ensure `<main>` container has `pb-36 sm:pb-32` and `after:h-28` to prevent `BottomNav` from ever obstructing food cards or interactive elements.
- **Graceful Empty State**: If `ems_events` has no upcoming published events, `EmsEventsFeed` returns `null` cleanly instead of rendering a broken dashed placeholder.
- **Chat Widget Offset**: Ensure `FloatingAiChat` is hoisted to `bottom-28 md:bottom-8` on mobile to avoid overlapping the navigation bar.

---

## 3. Testing & Verification Plan
1. **Unit Tests**:
   - Update `superAppPortal.test.ts` to assert the new 8 service IDs (`polysuara`, `polymart`, `takwim`, `polymaps`, `polyrent`, `kebajikan`, `akademik_qr`, `ekpp`).
   - Assert the Executive Maroon gradient classes in `getHeaderGradientClass`.
2. **Build & Dev Server Verification**:
   - Run `npm test -- --run` to verify 100% test pass.
   - Run `npm run build` to verify clean bundle and service worker compilation.
   - Check `http://localhost:3000/portal` in both mobile and desktop viewports.
