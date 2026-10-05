# PolyMart SuperApp: Vendor Storefront & Product Detail Revamp Design Specification

**Date:** 2026-10-05  
**Status:** Approved by User  
**Target Module:** `/polymart/*`  
**Key Routes:**
- `/polymart/kedai/:id` (New: Personalized Vendor Storefront Page)
- `/polymart/produk/:id` (Revamped: Mobile-First Product Detail Page)
- Cross-linking from `PolyMartHome.tsx`, `PolyMartCartPage.tsx`, and `PolyMartMyOrders.tsx`

---

## 1. Executive Summary & Design Read

> **Design Read:**  
> *"Modern Mobile-First E-Commerce SuperApp for POLISAS students & student entrepreneurs, using the Obsidian-Amber (`#f59e0b`) brand language, built on Tailwind utilities + Lucide Icons + Motion + hairline border depth. Eliminates 100% of raw emojis in favor of crisp vector icons. Carefully coordinates with the existing global `BottomNav` to guarantee zero overlapping bar collisions or redundant chrome."*

### Key Strategic Objectives:
1. **Personalized Vendor Storefront (`/polymart/kedai/:id`):** Transform currently unclickable active vendors into a dedicated Shopee/TikTok Shop-style merchant storefront featuring a verified student seller badge, live store metrics, and 3 organized tabs (*Semua Produk*, *Paling Laris*, *Info & Lokasi Ambil*).
2. **Mobile-First Product Detail Revamp (`/polymart/produk/:id`):** Replace raw 100px emojis with Lucide vector squircle fallbacks, add a multi-image thumbnail filmstrip, and introduce a sticky bottom action dock.
3. **Deduplicated Chrome & Viewport Stability:** Suppress the global `<BottomNav />` conditionally on `/polymart/produk/*` so the dedicated Product Purchase Dock takes precedence without stacking, overlapping, or causing viewport overflow. On `/polymart/kedai/:id` and `/polymart`, `<BottomNav />` remains active.
4. **Senior Performance & Business Logic Guardrails:** 0% changes to cart schema, order RPCs, payment deadlines, or Supabase realtime subscriptions. 0 heavy `backdrop-blur` on repeated product cards for 60fps scrolling on budget student phones.

---

## 2. Architecture & Component Hierarchy

```mermaid
flowchart TD
    subgraph PolyMart["PolyMart Marketplace Ecosystem"]
        Home["/polymart (PolyMartHome)"]
        Store["/polymart/kedai/:id (PolyMartVendorStorefront)"]
        Product["/polymart/produk/:id (PolyMartProductDetail)"]
        Cart["/polymart/troli (PolyMartCartPage)"]
        Orders["/polymart/pesanan-saya (PolyMartMyOrders)"]
    end

    Home -->|"Click Active Vendor Card"| Store
    Home -->|"Click Product Card"| Product
    Store -->|"Click Product Card"| Product
    Product -->|"Click 'Lawati Kedai' or Store Icon"| Store
    Product -->|"Add to Cart / Buy Now"| Cart
    Cart -->|"Click Vendor Group Header"| Store
    Orders -->|"Click Vendor Name"| Store
```

### Component Breakdown

| Component | File Path | Route | Purpose |
|---|---|---|---|
| `PolyMartLayout` | `src/pages/polymart/PolyMartLayout.tsx` | All `/polymart/*` | Top header, stadium search capsule, vector categories, and conditional `BottomNav` rendering (suppressed on `/polymart/produk/*`). |
| `PolyMartVendorStorefront` | `src/pages/polymart/PolyMartVendorStorefront.tsx` | `/polymart/kedai/:id` | **NEW:** Dedicated public merchant storefront (banner cover, verified badge, stats strip, tabbed catalog, direct chat/WhatsApp). |
| `PolyMartProductDetail` | `src/pages/polymart/PolyMartProductDetail.tsx` | `/polymart/produk/:id` | **REVAMPED:** Mobile-first product view with Lucide vector squircle fallbacks, image gallery filmstrip, interactive merchant card, "Produk Lain dari Kedai Ini" carousel, and sticky bottom purchase dock. |
| `BusinessCard` | `src/pages/polymart/PolyMartHome.tsx` | `/polymart` | Updated to route directly to `/polymart/kedai/:bizId` on click. |

---

## 3. Detailed Specifications

### 3.1 Personalized Vendor Storefront (`/polymart/kedai/:id`)

1. **Cover & Store Profile Header:**
   - **Cover Backdrop:** Frosted obsidian-amber gradient (`from-amber-950 via-slate-900 to-slate-950 text-white border-b border-amber-500/20`) with subtle ambient radial glow (`bg-amber-500/10 blur-2xl`).
   - **Avatar Squircle:** `w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/20 bg-muted/40 shadow-lg overflow-hidden shrink-0` displaying `business.logo_url` or a fallback `<Store className="w-8 h-8 text-amber-500" />`.
   - **Verification Badge:** Lencana rasmi `Peniaga Siswa Sah POLISAS` (`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider`). If `is_ems_siswapreneur`, display `Siswapreneur EMS`.
   - **Business Details:** Store name in bold typography, optional tagline/description, registered department/club affiliation if available.
   - **Action Bar:**
     - `Sembang Peniaga`: Opens in-app Polymart Chat modal directly targeting this `business.id`.
     - `WhatsApp`: Direct `https://wa.me/` link if phone exists and contact method is WhatsApp.
     - `Kongsi Kedai`: Web Share API / Copy Link toast notification.

2. **Live Store Metrics Strip (*Jalur Metrik Langsung*):**
   - Single-line horizontal container with hairline border (`bg-card/70 dark:bg-slate-900/70 border border-border/60 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center`):
     - ⭐ **Penilaian:** Store rating average & review count (e.g. `4.8 ★ (24 ulasan)`).
     - 📦 **Produk:** Total active published products for this vendor.
     - 💳 **Bayaran:** Badges for `DuitNow QR` and/or `Tunai (COD)` based on `online_payment_enabled` and `cod_enabled`.

3. **Store Navigation Tabs (*Tab Navigasi Kedai*):**
   - Sleek segmented pill track:
     - **Tab 1: Semua Produk:**
       - Search input within the store.
       - Category chips specific to the vendor's products.
       - Grid of products using the lightweight `ProductCard` structure (hairline border, no heavy blur, 60fps scrolling).
     - **Tab 2: Paling Laris (*Best Sellers*):**
       - Top items sorted by order count and rating.
     - **Tab 3: Info & Lokasi Ambil:**
       - Delivery / Pickup locations (e.g., Kamsis Siswa/Siswi, Kafeteria, Dewan Jubli).
       - Business hours / operating days.
       - Payment instructions and contact details.

4. **Empty States:**
   - Vector squircle with `<PackageSearch className="w-8 h-8 text-amber-500" />` and clean message: *"Kedai ini belum memuat naik produk aktif."*

---

### 3.2 Mobile-First Product Detail Revamp (`/polymart/produk/:id`)

1. **Suppression of Global `BottomNav` on Product Detail:**
   - In `PolyMartLayout.tsx`:
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
   - **Rationale:** Prevents vertical stacking collision between the general app navigation and the commerce purchase dock.

2. **Mobile Sticky Bottom Action Dock:**
   - Fixed at the bottom on mobile screens (`fixed bottom-0 left-0 right-0 z-40 bg-card/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shadow-lg`):
     - **Left Actions (Micro-Pills):**
       - **Kedai:** `<button onClick={() => navigate('/polymart/kedai/' + business.id)} className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground"> <Store className="w-4 h-4 text-amber-500" /> <span className="text-[9px] font-bold">Kedai</span> </button>`
       - **Sembang:** `<button onClick={handleOpenChat} className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground"> <MessageCircle className="w-4 h-4 text-emerald-500" /> <span className="text-[9px] font-bold">Sembang</span> </button>`
       - **Troli:** `<button onClick={() => navigate('/polymart/troli')} className="relative flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground"> <ShoppingCart className="w-4 h-4 text-amber-500" /> <span className="text-[9px] font-bold">Troli</span> {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{cartCount}</span>} </button>`
     - **Right Actions (Twin Purchase Buttons):**
       - **+ Troli:** `h-11 px-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs hover:bg-amber-500/25 active:scale-95 transition-all`
       - **Beli Sekarang:** `h-11 px-5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 active:scale-95 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5`
   - Content container configured with `pb-28` to ensure all content scrolls cleanly above the dock.

3. **Modern Media Gallery & Fallback:**
   - Multi-image swipe container with thumbnail strip indicator (`flex gap-2 overflow-x-auto pb-1`).
   - Missing image fallback replaced with an amber vector squircle:
     `<div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm"><FallbackIcon className="w-10 h-10" /></div>`
     where `FallbackIcon = CATEGORY_ICON_MAP[product.category] || Package`.
   - Badges updated to Lucide vector chips:
     - Sale: `<div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black"><Zap className="w-3 h-3" /> SALE -{discount}%</div>`
     - Pre-order: `<div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-black"><Clock className="w-3 h-3" /> PRA-TEMPAHAN</div>`

4. **Interactive Vendor Card & "Produk Lain dari Kedai Ini":**
   - Clickable card navigating to `/polymart/kedai/${business.id}` with avatar squircle, verified tag, rating, and a clear `Lawati Kedai <ChevronRight />` button.
   - Horizontal snap carousel below the vendor card showcasing other items from the same business (`select * from business_products where business_id = ... and id != currentId and is_available = true limit 8`).

5. **Elimination of Raw Emojis:**
   - Order modal, report dialog, and CTAs completely purged of raw emojis (`🛍️, 🛒, 😔, ⚠️, ✅, 📦`), replaced with Lucide icons (`ShoppingBag`, `ShoppingCart`, `AlertCircle`, `CheckCircle2`, `Package`).

---

## 4. Cross-Navigation Updates

1. **`PolyMartHome.tsx`:**
   - `BusinessCard` click handler updated to navigate to `/polymart/kedai/${biz.id}` (replacing the previous `?vendor=...` URL parameter).
2. **`PolyMartCartPage.tsx`:**
   - Business group header made clickable: `<div onClick={() => navigate('/polymart/kedai/' + business.id)} className="cursor-pointer hover:text-amber-500 ...">`
3. **`PolyMartMyOrders.tsx`:**
   - Vendor name on order card made clickable: `<button onClick={() => navigate('/polymart/kedai/' + order.business_id)} ...>`

---

## 5. Senior Guardrails & Quality Constraints

1. **Guardrail 1 (Student Phone Performance - 60fps Scrolling):**
   - Lightweight styling on product cards in both `/polymart/kedai/:id` and `/polymart/produk/:id`.
   - 0 heavy `backdrop-blur` or multi-layer glow across product grids.
   - Hairline borders (`border border-border/60 hover:border-amber-400/50`) with native hardware acceleration.
2. **Guardrail 2 (No Chrome Collision / Viewport Stability):**
   - Global `BottomNav` is conditionally suppressed on `/polymart/produk/*` to prevent overlapping or redundant double-docking.
   - Main container padding `pb-28` prevents content from clipping under the purchase dock.
3. **Guardrail 3 (Brand Identity Discipline):**
   - PolyMart's Obsidian-Amber identity (`#f59e0b`) is strictly maintained.
4. **Guardrail 4 (0% Logic / Database Disruption):**
   - 0 changes to database tables, RPCs, cart queries, or payment order processing.

---

## 6. Testing & Verification Plan

1. **Unit & Integration Tests (`src/__tests__/polymartSuperApp.test.ts` & new tests):**
   - Verify `PolyMartVendorStorefront` exports a valid React component and renders store banner, metrics strip, tabs, and products.
   - Verify `PolyMartProductDetail` renders the mobile sticky dock with Quick Chat, Visit Store, Cart badge, and Twin CTAs.
   - Verify 0 raw emojis in `PolyMartProductDetail.tsx` and `PolyMartVendorStorefront.tsx`.
   - Verify `PolyMartLayout.tsx` suppresses `BottomNav` on `/polymart/produk/*`.
2. **Repository Regression Test Suite:**
   - `npm test -- --run` (all 17+ test suites must pass 100%).
3. **Production Build Gate:**
   - `npm run build` must compile with 0 bundling or TypeScript errors.
