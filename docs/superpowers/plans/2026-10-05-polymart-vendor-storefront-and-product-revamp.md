# PolyMart Vendor Storefront & Product Detail Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personalized merchant storefront page (`/polymart/kedai/:id`), revamp the product detail page (`/polymart/produk/:id`) with an ergonomic slide-up variation sheet, multi-image gallery, and mobile sticky dock, and prevent global `BottomNav` collisions.

**Architecture:** A modern mobile-first e-commerce experience using React + Vite + Tailwind CSS + Lucide Icons + Framer Motion. The public storefront dynamically loads vendor metadata and published products, providing a Smart Preset Ambient Mesh when cover images are absent. The product detail page features an above-the-fold image filmstrip, interactive merchant cross-selling, and a sticky bottom purchase dock that replaces the global `BottomNav` on product pages.

**Tech Stack:** React 18, Vite 7, TypeScript, Tailwind CSS, Lucide React, Framer Motion, Supabase, Vitest.

---

## Global Constraints

- **Brand Color Identity:** PolyMart must strictly use the Obsidian-Amber palette (`#f59e0b` / `amber-500` / `amber-400`). Do NOT use green/emerald for PolyMart branding.
- **Zero Raw Emojis:** Replace all raw emojis (`🛍️, 🛒, 🏪, 🍔, ☕, 📱, 📦, 😔, ⚡, ⚠️, ✅`) with Lucide vector icons (`ShoppingBag, ShoppingCart, Store, Utensils, Coffee, Smartphone, Package, AlertCircle, CheckCircle2, Zap, Clock`).
- **Student Phone Performance (Senior Guardrail 1):** Zero heavy `backdrop-blur` or multi-layer glow across product grids. Use hairline borders (`border border-border/60 hover:border-amber-400/50`) so budget Android phones (Redmi/Infinix) scroll at 60fps.
- **No Chrome Collision / Viewport Stability (Senior Guardrail 2):** In `PolyMartLayout.tsx`, suppress global `<BottomNav />` on `/polymart/produk/*` so the dedicated Product Purchase Dock takes precedence with zero overlap or double-docking. Main content has `pb-28`.
- **0% Logic / Database Disruption:** Do NOT alter cart state schema, order placement procedures, Supabase realtime subscriptions, or payment deadline logic.
- **Rule of Hooks:** All React hooks must remain unconditionally at the top level of every component.

---

### Task 1: Dedicated Vendor Storefront Page (`PolyMartVendorStorefront.tsx`) & Routing Integration

**Files:**
- Create: `src/pages/polymart/PolyMartVendorStorefront.tsx`
- Modify: `src/App.tsx:81-90, 415-420`
- Modify: `src/pages/polymart/PolyMartHome.tsx:173-195`
- Modify: `src/pages/polymart/PolyMartCartPage.tsx:180-220`
- Modify: `src/pages/polymart/PolyMartMyOrders.tsx:250-290`
- Test: `src/__tests__/polymartSuperApp.test.ts`

**Interfaces:**
- Consumes: `keusahawanan_businesses` and `business_products` tables from Supabase.
- Produces: `PolyMartVendorStorefront` component mounted at route `/polymart/kedai/:id`.

- [ ] **Step 1: Write the failing tests in `src/__tests__/polymartSuperApp.test.ts`**

Add tests asserting:
1. `PolyMartVendorStorefront` is exported as a valid React component.
2. Route `/polymart/kedai/:id` exists in `src/App.tsx`.
3. `BusinessCard` in `PolyMartHome.tsx` navigates to `/polymart/kedai/:id`.
4. `PolyMartVendorStorefront.tsx` contains the Smart Preset Ambient Mesh tokens (`from-amber-950 via-slate-900 to-stone-950`, `bg-amber-500/15 blur-3xl`) and does not contain raw emojis `🛍️` or `🏪`.

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/__tests__/polymartSuperApp.test.ts`  
Expected: FAIL with "PolyMartVendorStorefront not found" or "route not found".

- [ ] **Step 3: Implement `src/pages/polymart/PolyMartVendorStorefront.tsx`**

Create the storefront component with:
- `useParams` for `:id` (`business_id`).
- Smart Preset Ambient Mesh when `business.cover_url` is null:
  ```tsx
  <div className="relative h-36 sm:h-48 w-full bg-gradient-to-br from-amber-950 via-slate-900 to-stone-950 border-b border-amber-500/20 overflow-hidden">
    <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20 bg-amber-500 pointer-events-none" />
    <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full blur-2xl opacity-15 bg-orange-500 pointer-events-none" />
    <div className="absolute right-4 bottom-2 text-white/[0.07] pointer-events-none">
      <CategoryWatermark className="w-28 h-28 sm:w-36 sm:h-36" />
    </div>
  </div>
  ```
- Store Profile Header:
  - `w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/20 bg-muted/40 shadow-lg overflow-hidden shrink-0` avatar.
  - Verified badge `Peniaga Siswa Sah POLISAS`.
  - Store name, description, and contact actions: `Sembang Peniaga` (triggers `open-polymart-chat` CustomEvent), `WhatsApp`, and `Kongsi Kedai`.
- Live Store Metrics Strip:
  - 3-column grid (`Penilaian`, `Produk Aktif`, `Kaedah Bayaran QR/COD`).
- Store Tabs:
  - `Semua Produk`: with search bar and category filter chips.
  - `Paling Laris`: sorted by rating and sales.
  - `Info & Lokasi Ambil`: displaying pickup locations, payment terms, and business phone.
- Lightweight product cards using hairline borders and vector squircle fallbacks.

- [ ] **Step 4: Register route in `src/App.tsx` and connect cross-links**

1. In `src/App.tsx`:
   - Import `PolyMartVendorStorefront` via `lazy(() => import('./pages/polymart/PolyMartVendorStorefront').then(m => ({ default: m.PolyMartVendorStorefront })))`.
   - Add `<Route path="/polymart/kedai/:id" element={<PolyMartVendorStorefront />} />` inside `<Route element={<PolyMartLayout />}>`.
2. In `src/pages/polymart/PolyMartHome.tsx`:
   - Update `BusinessCard` click handler: `onClick={() => navigate('/polymart/kedai/' + biz.id)}`.
3. In `src/pages/polymart/PolyMartCartPage.tsx`:
   - Make business group title clickable: `onClick={() => navigate('/polymart/kedai/' + business.id)}`.
4. In `src/pages/polymart/PolyMartMyOrders.tsx`:
   - Make vendor name clickable: `onClick={() => navigate('/polymart/kedai/' + order.business_id)}`.

- [ ] **Step 5: Run tests and verify pass**

Run: `npx vitest run src/__tests__/polymartSuperApp.test.ts`  
Expected: PASS 100%.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/pages/polymart/PolyMartVendorStorefront.tsx src/App.tsx src/pages/polymart/PolyMartHome.tsx src/pages/polymart/PolyMartCartPage.tsx src/pages/polymart/PolyMartMyOrders.tsx src/__tests__/polymartSuperApp.test.ts
git commit -m "feat(polymart): add personalized vendor storefront page and cross-linking"
```

---

### Task 2: Mobile-First Product Detail Revamp (`PolyMartProductDetail.tsx`) & BottomNav Deduplication

**Files:**
- Modify: `src/pages/polymart/PolyMartLayout.tsx:550-575`
- Modify: `src/pages/polymart/PolyMartProductDetail.tsx`
- Test: `src/__tests__/polymartSuperApp.test.ts`

**Interfaces:**
- Consumes: `CATEGORY_ICON_MAP` from `PolyMartLayout.tsx`, `useAuth`, `usePolymart`.
- Produces: Revamped `PolyMartProductDetail` component with sticky bottom dock, slide-up variation sheet, and vector fallbacks.

- [ ] **Step 1: Write the failing tests in `src/__tests__/polymartSuperApp.test.ts`**

Add tests asserting:
1. `PolyMartLayout.tsx` suppresses `BottomNav` when `location.pathname.includes('/polymart/produk/')`.
2. `PolyMartProductDetail.tsx` source contains the sticky bottom action dock with `fixed bottom-0` and action buttons `+ Troli` and `Beli Sekarang`.
3. `PolyMartProductDetail.tsx` source contains the slide-up bottom sheet with `y: '100%'` or `y: 0`.
4. `PolyMartProductDetail.tsx` source has zero raw emojis (`text-[100px] {emoji}`, `🛒 Masukkan Troli`, `🛍️ Tempah Sekarang`).

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/__tests__/polymartSuperApp.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Update `src/pages/polymart/PolyMartLayout.tsx` for BottomNav Deduplication**

Update line 557 of `PolyMartLayout.tsx`:
```tsx
{!(
  location.pathname.includes('/polymart/vendor') ||
  location.pathname.includes('/polymart/admin') ||
  location.pathname.includes('/polymart/produk/')
) && (
  <div className="tour-polymart-mobile-nav">
    <BottomNav ... />
  </div>
)}
```

- [ ] **Step 4: Revamp `src/pages/polymart/PolyMartProductDetail.tsx`**

1. **Import `CATEGORY_ICON_MAP`:**
   `import { usePolymart, PM_ACCENT, PM_LIGHT, PM_GRADIENT, PM_GLOW, CATEGORY_ICON_MAP } from './PolyMartLayout';`
2. **Import Lucide Icons:**
   `ArrowLeft, Star, Store, Clock, Package, Phone, MessageCircle, Minus, Plus, CheckCircle2, AlertCircle, User, ChevronRight, ShoppingBag, ShoppingCart, Zap, Heart, Share2, X`
3. **Galeri Imej & Fallback Vektor:**
   - Replace `text-[100px] {emoji}` fallback with:
     ```tsx
     <div className="w-full h-full flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
       <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
         <FallbackIcon className="w-10 h-10" />
       </div>
     </div>
     ```
     where `FallbackIcon = CATEGORY_ICON_MAP[product.category] || Package`.
   - Update multi-image indicators to include an elegant thumbnail strip under the main image.
   - Replace raw emoji badges (`⚡ SALE`, `📦 PRA-TEMPAHAN`) with vector Lucide chips (`<Zap className="w-3 h-3" />`, `<Clock className="w-3 h-3" />`).
4. **Interactive Vendor Card & "Produk Lain dari Kedai Ini":**
   - Clickable vendor card linking to `/polymart/kedai/${business.id}` with `<ChevronRight className="w-4 h-4 text-muted-foreground" />` and `Lawati Kedai` text.
   - Query other products from the same vendor and render a horizontal snap carousel:
     `<h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Produk Lain dari Kedai Ini</h3>`
5. **Mobile Sticky Bottom Purchase Dock:**
   ```tsx
   <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shadow-lg">
     <div className="flex items-center gap-3">
       <button onClick={() => navigate('/polymart/kedai/' + business?.id)} className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground">
         <Store className="w-4 h-4 text-amber-500" />
         <span className="text-[9px] font-bold">Kedai</span>
       </button>
       <button onClick={handleOpenChat} className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground">
         <MessageCircle className="w-4 h-4 text-emerald-500" />
         <span className="text-[9px] font-bold">Sembang</span>
       </button>
       <button onClick={() => navigate('/polymart/troli')} className="relative flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground">
         <ShoppingCart className="w-4 h-4 text-amber-500" />
         <span className="text-[9px] font-bold">Troli</span>
         {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{cartCount}</span>}
       </button>
     </div>
     <div className="flex items-center gap-2 flex-1 max-w-xs">
       <button onClick={() => openBottomSheet('CART')} disabled={isOut} className="flex-1 h-11 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs hover:bg-amber-500/25 active:scale-95 transition-all">
         + Troli
       </button>
       <button onClick={() => openBottomSheet('BUY')} disabled={isOut} className="flex-1 h-11 px-4 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 active:scale-95 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5">
         <ShoppingBag className="w-3.5 h-3.5" />
         <span>Beli Sekarang</span>
       </button>
     </div>
   </div>
   ```
   Add `pb-28` to the outer container so content does not collide with the dock.
6. **Ergonomic Slide-Up Variation Bottom Sheet (`ProductVariationBottomSheet`):**
   - Replaces the old centered modal box.
   - Slides up from bottom with spring animation (`y: '100%'` -> `y: 0`).
   - Top drag handle pill.
   - Header with product thumbnail, real-time dynamic price (updated by variation selection), and remaining available stock.
   - Segmented chips for variation options (`variation.name`).
   - Bounded quantity stepper (`-` / `+`).
   - Pickup time and notes inputs.
   - Payment method toggle (QR Online / COD).
   - Bottom confirmation button ("Sahkan & Tambah ke Troli" or "Teruskan Pesanan").
7. **Purge all raw emojis:**
   - Replace `🛒 Masukkan Troli` -> `<ShoppingCart className="w-4 h-4" /> Masukkan Troli`.
   - Replace `🛍️ Tempah Sekarang` -> `<ShoppingBag className="w-4 h-4" /> Tempah Sekarang`.
   - Replace `⚠️ Laporkan produk ini` -> `<AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Laporkan produk ini`.
   - Replace `✅ Laporan telah dihantar` -> `<CheckCircle2 className="w-4 h-4 text-emerald-500" /> Laporan telah dihantar`.

- [ ] **Step 5: Run tests and verify pass**

Run: `npx vitest run src/__tests__/polymartSuperApp.test.ts`  
Expected: PASS 100%.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/pages/polymart/PolyMartLayout.tsx src/pages/polymart/PolyMartProductDetail.tsx src/__tests__/polymartSuperApp.test.ts
git commit -m "feat(polymart): revamp product detail with slide-up variation sheet and mobile dock"
```

---

### Task 3: Regression Suite, Build Verification & Documentation Gate

**Files:**
- Modify: `DEV_GUIDELINE.md`
- Test: Full repository test suite (`npm test -- --run`)
- Build: Full production build (`npm run build`)

- [ ] **Step 1: Update `DEV_GUIDELINE.md`**

Under Section 29, add Subsection `29.10 Seni Bina Kedai Peniaga Berdedikasi & Laman Produk SuperApp`:
- Document the new `/polymart/kedai/:id` storefront route, its Smart Preset Ambient Mesh (`from-amber-950 via-slate-900 to-stone-950` with vector category watermark), live store metrics strip, and tabbed catalog.
- Document the revamped `/polymart/produk/:id` with its mobile sticky bottom action dock (Quick Chat, Visit Store, Cart badge, and Twin CTAs).
- Document the Slide-Up Variation Bottom Sheet replacing old centered modal boxes.
- Document the deduplication pattern: suppressing global `<BottomNav />` on `/polymart/produk/*` to prevent navigation collisions.
- Reiterate Senior Guardrails: 60fps scrolling on budget phones (0 heavy blur on cards), 0% logic/DB disruption, and strict Amber theme discipline.

- [ ] **Step 2: Run full repository unit tests**

Run: `npm test -- --run`  
Expected: 17/17 test suites passed, 220+ tests passed (100% pass rate).

- [ ] **Step 3: Run production build verification**

Run: `npm run build`  
Expected: Vite build + PWA service worker compiled cleanly in < 30s with 0 errors.

- [ ] **Step 4: Commit documentation & finalize**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs(polymart): document vendor storefront, variation sheet, and mobile dock"
```

---
