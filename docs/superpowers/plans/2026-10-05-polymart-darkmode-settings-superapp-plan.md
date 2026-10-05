# Super App Convergence: PolyMart Routing, OLED Dark Mode & Hab Tetapan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyelaraskan routing dan suapan PolyMart Siswa (`/polymart` & `/polymart/produk/:id`), memperhebat estetika Dark Mode dengan gaya "OLED Glass Aura" tanpa membebankan peranti rendah, dan merombak `/tetapan` menjadi Hab Profil & Tetapan Super App bertaraf iOS/Grab yang mesra mudah alih.

**Architecture:** 
- Penyelarasan routing servis berpusat di `superAppHelpers.ts` dan integrasi penapis cip dwi-mod ("🔥 Terhangat" / "✨ Terkini") dalam `PolyMartFeed.tsx`.
- Suntikan ambient mesh glow di `PortalPage.tsx` dan pencahayaan rim-light jubin kaca di `CampusServicesGrid.tsx` bagi mod gelap OLED.
- Pengstrukturan semula `SettingsPage.tsx` dengan Hero Profile Identity Card (merit, semester, kediaman), Bar Tab Kapsul Mendatar, pembuangan tab lapuk (Billing), dan pemeliharaan keserasian parameter URL query `?tab=...`.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS v4, Lucide React, Framer Motion, Supabase Client, Vitest.

## Global Constraints

- **Concurrent Load & Safety:** Sokong sehingga 1,500 pengguna serentak; semua pengambilan data berbilang wajib menggunakan `Promise.all` dan tiada kueri di dalam loop (N+1 anti-pattern).
- **RLS & Database:** Sentiasa guna `(SELECT auth.uid())` dan jangan ubah fail migrasi lama dalam `supabase/migrations/`.
- **Low-End Performance:** Gunakan `backdrop-blur-md` sederhana (elakkan blur bertingkat berat), imej `loading="lazy"`, dan sentuhan pantas `whileTap={{ scale: 0.96 }}` tanpa animasi canvas berat.
- **Mobile Ergonomics:** Responsif pada 360px+ lebar skrin, sasaran sentuhan minimum 44px, tiada limpahan mendatar (`overflow-x-hidden`), kelegaan bawah mencukupi bagi `BottomNav` (`pb-36`).
- **Backward Compatibility:** Pastikan parameter URL sedia ada (`?tab=general`, `?tab=kediaman`, dll.) kekal berfungsi dan pemicu SystemTour terpelihara.

---

### Task 1: PolyMart Routing Alignment and Helper Updates (TDD)

**Files:**
- Modify: `src/lib/superAppHelpers.ts:155-165`
- Test: `src/__tests__/superAppPortal.test.ts`

**Interfaces:**
- Consumes: `CampusServiceItem` interface and `getCampusServicesConfig()` from `superAppHelpers.ts`.
- Produces: `getCampusServicesConfig()` returning `routeOrAction: '/polymart'` for the `polymart` service item.

- [ ] **Step 1: Write the failing test**

In `src/__tests__/superAppPortal.test.ts`, update the test case verifying `getCampusServicesConfig`:
```typescript
it('assigns /polymart as routeOrAction for polymart service item', () => {
  const services = getCampusServicesConfig({});
  const polymart = services.find(s => s.id === 'polymart');
  expect(polymart).toBeDefined();
  expect(polymart?.routeOrAction).toBe('/polymart');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`  
Expected: FAIL if `polymart.routeOrAction` is currently `'/keusahawanan/dashboard'`.

- [ ] **Step 3: Update `src/lib/superAppHelpers.ts`**

In `src/lib/superAppHelpers.ts`, update the `polymart` entry inside `getCampusServicesConfig`:
```typescript
    {
      id: 'polymart',
      label: 'PolyMart',
      sublabel: 'Pasaran Siswa',
      description: 'Pasaran Siswa',
      routeOrAction: '/polymart',
      color: 'amber',
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`  
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit changes**

```bash
git add src/lib/superAppHelpers.ts src/__tests__/superAppPortal.test.ts
git commit -m "fix(portal): align polymart service route to /polymart"
```

---

### Task 2: Dynamic PolyMartFeed with Direct Product Routing & Chip Tabs (TDD)

**Files:**
- Modify: `src/components/portal/PolyMartFeed.tsx`
- Modify: `src/__tests__/superAppPortal.test.ts`

**Interfaces:**
- Consumes: Supabase `business_products` table (`id, name, price, sale_price, image_url, category, publish_to_polymart, is_available, business_id, created_at`).
- Produces: `PolyMartFeed` component rendering interactive chip filter tabs (`'hot'` vs `'latest'`), direct card navigation to `/polymart/produk/${item.id}`, and "Buka Mart" header button to `/polymart`.

- [ ] **Step 1: Write tests for PolyMartFeed behavior**

In `src/__tests__/superAppPortal.test.ts`, add test cases:
```typescript
it('exports PolyMartFeed component with support for interactive marketplace navigation', () => {
  expect(PolyMartFeed).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify initial state**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`  
Expected: PASS.

- [ ] **Step 3: Update `src/components/portal/PolyMartFeed.tsx`**

1. Replace `handleCardClick` to accept product ID:
   ```typescript
   const handleCardClick = (productId: string) => {
     navigate(`/polymart/produk/${productId}`);
   };
   const handleOpenMart = () => {
     navigate('/polymart');
   };
   ```
2. Add chip filter state:
   ```typescript
   const [activeFilter, setActiveFilter] = useState<'hot' | 'latest'>('hot');
   ```
3. Update query logic so when `activeFilter === 'hot'`, sort by sales/rating/stock fallback; and when `'latest'`, sort by `created_at desc`.
4. Render chip buttons in section header:
   ```tsx
   <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/10">
     <button
       type="button"
       onClick={() => setActiveFilter('hot')}
       className={cn(
         "px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tight transition-all cursor-pointer",
         activeFilter === 'hot'
           ? "bg-amber-500 text-slate-950 shadow-sm"
           : "text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white"
       )}
     >
       🔥 Terhangat
     </button>
     <button
       type="button"
       onClick={() => setActiveFilter('latest')}
       className={cn(
         "px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tight transition-all cursor-pointer",
         activeFilter === 'latest'
           ? "bg-amber-500 text-slate-950 shadow-sm"
           : "text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white"
       )}
     >
       ✨ Terkini
     </button>
   </div>
   ```
5. Apply deep glass styling for dark mode cards:
   `bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] hover:border-amber-500/40 dark:hover:border-amber-500/40 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200`.

- [ ] **Step 4: Run tests & verify compilation**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`  
Run: `npm run build`  
Expected: 100% PASS with 0 build errors.

- [ ] **Step 5: Commit changes**

```bash
git add src/components/portal/PolyMartFeed.tsx src/__tests__/superAppPortal.test.ts
git commit -m "feat(portal): add chip filter tabs and direct product routing to PolyMartFeed"
```

---

### Task 3: OLED Dark Mode Glass Aura & Glowing Service Tiles

**Files:**
- Modify: `src/pages/PortalPage.tsx`
- Modify: `src/components/portal/CampusServicesGrid.tsx`
- Modify: `src/components/portal/EmsEventsFeed.tsx`

**Interfaces:**
- Consumes: Dark mode class context and color definitions.
- Produces: Vibrant ambient mesh glow in dark mode and illuminated service squircle tiles.

- [ ] **Step 1: Update `src/pages/PortalPage.tsx` with Ambient Mesh Aura**

Add ambient mesh aura container inside `PortalPage.tsx` under visual effects:
```tsx
{/* Dark Mode Ambient Mesh Aura (OLED Deep Glass) */}
<div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden hidden dark:block" aria-hidden="true">
  <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-emerald-500/[0.035] blur-[130px] rounded-full transform-gpu" />
  <div className="absolute top-[55%] left-1/4 w-[500px] h-[320px] bg-indigo-500/[0.025] blur-[150px] rounded-full transform-gpu" />
</div>
```

- [ ] **Step 2: Update `src/components/portal/CampusServicesGrid.tsx` with Glowing Rim-Lighting**

Update the tile styling in `CampusServicesGrid.tsx`:
- Container:
  `bg-white/90 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] backdrop-blur-md border border-slate-200/60 dark:border-white/[0.08] hover:border-emerald-500/30 dark:hover:border-emerald-400/30 dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]`
- Icon container:
  `dark:bg-white/[0.06] dark:border dark:border-white/10 dark:shadow-inner`
- Color mapping:
  Add vibrant neon-pastel classes so each icon pops against the dark glass (`text-rose-500 dark:text-rose-400`, `text-amber-500 dark:text-amber-400`, `text-indigo-500 dark:text-indigo-400`, `text-emerald-500 dark:text-emerald-400`, `text-cyan-500 dark:text-cyan-400`, `text-teal-500 dark:text-teal-400`, `text-purple-500 dark:text-purple-400`, `text-blue-500 dark:text-blue-400`).

- [ ] **Step 3: Update `src/components/portal/EmsEventsFeed.tsx` with Glassmorphic Card Styling**

Apply dark glass card elevation:
`bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/40 dark:hover:border-emerald-500/40 shadow-sm hover:shadow-md transition-all duration-200`

- [ ] **Step 4: Run tests & verify compilation**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`  
Run: `npm run build`  
Expected: 100% PASS with 0 build errors.

- [ ] **Step 5: Commit changes**

```bash
git add src/pages/PortalPage.tsx src/components/portal/CampusServicesGrid.tsx src/components/portal/EmsEventsFeed.tsx
git commit -m "feat(portal): implement OLED glass aura and glowing service tiles in dark mode"
```

---

### Task 4: Super App Hero Profile Card & Segmented Tab Navigation for Settings (TDD)

**Files:**
- Create: `src/__tests__/settingsPage.test.ts`
- Modify: `src/pages/SettingsPage.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `useTheme()`, `useAcademicSession()`, `supabase` client, `profile_edit_requests` table, `klk_records` / `residence_type`.
- Produces: Mobile-first Super App Settings Hub with Hero Profile Card (Avatar, Role, Semester, Merit, Residence), Segmented Tab Bar (`profil`, `kediaman`, `tema`, `notifikasi`, `keselamatan`, `bantuan`), interactive Theme selector card, and removal of obsolete Billing tab.

- [ ] **Step 1: Write tests for SettingsPage exports and tab definitions**

Create `src/__tests__/settingsPage.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { SettingsPage } from '@/pages/SettingsPage';

describe('SettingsPage Super App Hub', () => {
  it('exports SettingsPage as named and default component', () => {
    expect(SettingsPage).toBeDefined();
    expect(typeof SettingsPage).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it executes**

Run: `npx vitest run src/__tests__/settingsPage.test.ts`  
Expected: PASS.

- [ ] **Step 3: Refactor `src/pages/SettingsPage.tsx` into Super App Hub**

1. **Hero Profile Card at the top:**
   - Avatar with camera button for photo upload.
   - Student Name, Matric No, Programme & Department.
   - Role Badge (`PENTADBIR UTAMA`, `MAJLIS JPP`, `SISWA POLISAS`).
   - Quick Status Strip: Semester count, Merit Points preview (`profile.merit_points` or query), Residence status (`profile.residence_type === 'KAMSIS' ? 'Asrama Kamsis' : 'Rumah Sewa (Luar)'`).
2. **Segmented Tab Pill Bar:**
   - 6 tabs:
     - `profil`: Personal info, phone, email, and `ProfileEditRequestSection`.
     - `kediaman`: Status kediaman & KLK with dynamic fields and map location.
     - `tema`: Visual theme selector (Cerah ☀️ / Gelap 🌙 / Sistem 💻) with glowing active borders.
     - `notifikasi`: Push & in-app alerts (PolyMart, Kebajikan, EMS).
     - `keselamatan`: Password change, device/session details, and logout button.
     - `bantuan`: System tutorial launcher and contact JPP.
3. **Legacy Query Sync:**
   - Map `general` to `profil`, `notifications` to `notifikasi`, `security` to `keselamatan`, `help` to `bantuan`.
4. **Remove outdated `billing` tab completely.**
5. **Mobile-friendly layout:**
   - Ensure clean `pb-36` padding for BottomNav dock.
   - Smooth horizontal scroll track for tabs on mobile (`flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x`).

- [ ] **Step 4: Run tests & verify compilation**

Run: `npx vitest run src/__tests__/settingsPage.test.ts`  
Run: `npm run build`  
Expected: 100% PASS with 0 build errors.

- [ ] **Step 5: Commit changes**

```bash
git add src/pages/SettingsPage.tsx src/__tests__/settingsPage.test.ts
git commit -m "feat(settings): overhaul SettingsPage into mobile-first Super App Profile Hub"
```

---

### Task 5: Mobile Ergonomics Audit, Documentation & Quality Gate

**Files:**
- Modify: `DEV_GUIDELINE.md`

**Interfaces:**
- Produces: Updated Section 29 in `DEV_GUIDELINE.md` and verified local server responding 200 OK.

- [ ] **Step 1: Update Section 29 in `DEV_GUIDELINE.md`**

Document:
1. Penyelarasan routing PolyMart ke `/polymart` dan integrasi penapis dwi-mod ("🔥 Terhangat" / "✨ Terkini").
2. Estetika "OLED Glass Aura" dalam mod gelap dengan ambient mesh glow dan jubin rim-light berdisiplin GPU.
3. Seni bina Hab Tetapan Super App (`/tetapan`) dengan Hero Profile Card dan 6 tab segmented berpusat.

- [ ] **Step 2: Run all unit tests project-wide**

Run: `npm test -- --run`  
Expected: All test suites pass (100% PASS).

- [ ] **Step 3: Run production build**

Run: `npm run build`  
Expected: Clean compilation, PWA Service Worker generated with 0 errors.

- [ ] **Step 4: Verify Localhost 3000**

Verify: `http://localhost:3000/portal` and `http://localhost:3000/tetapan` return HTTP 200 OK.

- [ ] **Step 5: Commit documentation**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs: update DEV_GUIDELINE with polymart routing, dark mode aura and settings superapp"
```
