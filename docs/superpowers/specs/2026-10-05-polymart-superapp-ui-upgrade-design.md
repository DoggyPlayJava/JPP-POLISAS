# PolyMart SuperApp UI Upgrade (Executive Obsidian-Amber Edition) — Design Specification

**Date:** 2026-10-05  
**Author:** AI Agent & JPP-POLISAS Core Team  
**Scope:** Frontend Visual & UI Polish for PolyMart Storefront & Layout (`PolyMartLayout.tsx` & `PolyMartHome.tsx`)  
**Status:** Validated & Approved for Implementation  

---

## 1. Design Read & Core Philosophy

> **Design Read:**  
> *Campus SuperApp Marketplace storefront & layout upgrade for POLISAS students & student vendors, with a fast, modern consumer e-commerce language (Apple Store / GrabFood aesthetic meets SuperApp executive styling), featuring Amber/Warm Gold (#f59e0b) accents + Tailwind v4 + Motion physics + clean typography.*

### The Three Dials
* **`DESIGN_VARIANCE: 7`** — Distinct asymmetrical polish, avoiding generic AI card monotony.
* **`MOTION_INTENSITY: 6`** — Tactile micro-spring feedback on buttons and cards; zero laggy scroll-hijacking.
* **`VISUAL_DENSITY: 4`** — Clean breathing room balanced with immediate product visibility on mobile.

### Non-Negotiable Contract
* **100% Visual & UI Polish:** Zero modification to cart logic, order database schemas, payment handling, or Supabase realtime subscriptions.
* **0% Business Logic Mutation:** All existing props, state variables, filter callbacks, and route parameters remain strictly intact.

---

## 2. Senior's Critical Guardrails (Anti-Syok-Sendiri Rules)

1. **Guardrail 1: Student Phone Performance (Lag / Drop FPS Prevention):**
   * POLISAS students use a wide spectrum of mobile devices, including budget Android smartphones (Redmi, Infinix, Vivo).
   * **Rule:** Do NOT apply layered `backdrop-blur` or heavy box-shadow glows across the 50 product cards in the grid.
   * **Implementation:** Product cards use clean hairline borders (`border border-border/60 hover:border-amber-400/50`) and solid/semi-solid background tokens (`bg-card dark:bg-slate-900/90`). GPU acceleration is reserved for lightweight tap feedback (`whileTap={{ scale: 0.98 }}`).
2. **Guardrail 2: Compact Mobile Screen Estate (Immediate Product Visibility):**
   * Students opening PolyMart want to instantly browse food, drinks, and services without excessive scrolling.
   * **Rule:** The Hero Banner must NOT swallow screen height.
   * **Implementation:** Mobile height is strictly capped (`aspect-[2.6/1]` or max `h-[180px]` on mobile screens). Headline copy is trimmed to 1–2 punchy lines, ensuring the product grid appears immediately near the first fold.
3. **Guardrail 3: Strict Color Identity (Emerald Portal vs. Amber PolyMart):**
   * The Portal uses Emerald Green (`#10b981`) for institutional campus governance.
   * PolyMart uses Amber/Warm Gold (`#f59e0b`) representing student entrepreneurship (Exco Keusahawanan).
   * **Rule:** Adopt the Portal's **architectural structural archetypes** (stadium search capsule, discrete circular action buttons) while strictly preserving **PolyMart's Amber/Gold brand identity**.

---

## 3. Detailed Component Architecture

### A. Top Sticky Header & Stadium Search Capsule (`PolyMartLayout.tsx`)

#### 1. Header Container
* **Class signature:** `sticky top-0 z-40 bg-background/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-amber-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]`
* Subtle ambient gold top highlight: `before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-amber-400/40 before:to-transparent`

#### 2. Navigation & Brand Pill
* **Back Button:** Circular glass button `w-9 h-9 rounded-full bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-amber-400/50 transition-all active:scale-95 flex items-center justify-center shrink-0`
* **PolyMart Brand Mark:** Amber gradient squircle (`w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-sm shadow-amber-500/20`) with clean typography (`PolyMart` in bold font-black + micro uppercase gold tracking `MARKETPLACE`).

#### 3. Pure White / Frosted Stadium Search Capsule
* **Desktop:** `h-10 px-4 rounded-full bg-white dark:bg-slate-900 border border-border/70 hover:border-amber-400/50 shadow-xs focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/25 flex items-center gap-2.5 transition-all`
  * Mint/Amber magnifying glass icon: `w-4 h-4 text-amber-500 shrink-0`
  * Placeholder: `"Cari makanan, minuman, servis, pakaian..."` (`text-xs text-muted-foreground`)
* **Mobile:** Compact stadium capsule trigger button opening a smooth live search spotlight modal with instant typing results.

#### 4. Discrete Circular Action Buttons
* **Troli (Cart):** `w-9 h-9 rounded-full bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-amber-400/40 flex items-center justify-center relative active:scale-95`
  * Cart badge: `absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-xs`
* **Pesanan Saya (Orders):** Circular button with `Package` icon and active counter.
* **Wishlist:** Circular button with `Heart` icon.
* **Kedai Saya / Admin / Mulai Bisnes:** Sophisticated pill button (`rounded-full h-8 px-3 text-[10px] font-black uppercase tracking-wider border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20`).

---

### B. Refined Vector Category Bar (`PolyMartLayout.tsx`)

#### Elimination of Raw Emojis
Replace all raw emojis (`🍔, ☕, 💎, 🔧, 👕, 📱, 📦`) with crisp SVG Lucide icons:

| Kategori Key | Label | Lucide Vector Icon | Peranan Visual |
|---|---|---|---|
| `all` | Semua | `LayoutGrid` | Gambaran umum katalog |
| `Makanan` | Makanan | `Utensils` | Makanan segera, bento, kuih |
| `Minuman` | Minuman | `Coffee` | Kopi ais, teh, minuman berkarbonat |
| `Aksesori` | Aksesori | `Sparkles` | Lanyard, brooch, casing |
| `Perkhidmatan` | Servis | `Wrench` | Runner, baiki laptop, printing |
| `Pakaian` | Pakaian | `Shirt` | Baju korporat, jersey, tudung |
| `Elektronik` | Gadget | `Smartphone` | Kabel, earphone, powerbank |
| `Umum` | Umum | `Package` | Barangan asas & pelbagai |

#### Category Pill Styling
* **Active State:** `bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/25 border border-amber-400/40`
* **Inactive State:** `bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50`
* Micro-squircle icon container with smooth color transition.

---

### C. Compact Cyber-Amber Executive Showcase Hero (`PolyMartHome.tsx`)

#### 1. Dimensions & Mobile Responsiveness
* Desktop: `p-6 sm:p-7 rounded-3xl min-h-[170px]`
* Mobile: Compact height `p-4 rounded-2xl min-h-[140px] max-h-[180px]`
* Background: `bg-gradient-to-tr from-stone-950 via-slate-900 to-amber-950/40 border border-amber-500/25 relative overflow-hidden shadow-lg`

#### 2. Visual Content
* **Top Glass Micro-Badge:** `PASAR MAHASISWA POLISAS` with pulsing gold micro-dot (`w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse`).
* **Headline:** `"Jelajah & Tempah Produk Kampus"` with Amber-Gold gradient text emphasis.
* **Stats Badges:** Compact frosted glass chips displaying live active products and registered student vendors (`Store` & `Package` micro-icons).
* **Elimination of Raw Emoji:** The giant `🛍️` (text-6xl) is removed completely in favor of a sleek geometric marketplace graphic badge.
* **Embla Carousel Ads:** Integrated cleanly without altering `PolyAd` click tracking or URLs.

---

### D. Lightweight SuperApp Product Cards (`PolyMartHome.tsx`)

#### 1. Card Container & Performance
* `rounded-2xl sm:rounded-3xl bg-card dark:bg-slate-900/90 border border-border/60 hover:border-amber-400/50 hover:shadow-[0_8px_24px_rgba(245,158,11,0.08)] transition-all duration-300 overflow-hidden group cursor-pointer`
* Zero expensive full-card blur; relies on crisp SVG borders and CSS hardware-accelerated transforms.

#### 2. Image Area & Elegant Fallback
* Aspect ratio 1:1 (`aspect-square overflow-hidden relative`).
* **Image zoom on hover:** `group-hover:scale-105 transition-transform duration-500`.
* **Fallback Placeholder (Zero Raw Emojis):** When `image_url` is null, render a warm, geometric mesh background with the category's Lucide vector icon inside a frosted glass squircle (`w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center`).
* **Status Badges:**
  * Out of stock: `bg-black/75 backdrop-blur-xs text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full`
  * Low stock: `bg-amber-500 text-slate-950 text-[8px] font-black px-2 py-0.5 rounded-full shadow-xs`
  * Flash sale: `bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-xs`
  * Pre-order: `bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-xs`
* **Floating Wishlist Button:** `w-7 h-7 rounded-full bg-white/90 dark:bg-slate-950/80 backdrop-blur-xs border border-white/20 shadow-xs flex items-center justify-center hover:scale-110 active:scale-90 transition-all`.

#### 3. Product Info Block
* **Vendor Row:** Micro store icon (`Store className="w-2.5 h-2.5 text-amber-500"`) + vendor name.
* **Title:** 2-line clamp (`text-[12px] sm:text-[13px] font-bold text-foreground leading-snug line-clamp-2`).
* **Price & Rating:**
  * Price: Bold Amber-Gold typography (`text-[13px] sm:text-[14px] font-black text-amber-600 dark:text-amber-400`).
  * Sale strikethrough: Clean muted line-through text.
  * Rating: Gold `Star` icon with rating value.

---

### E. Peniaga Aktif & Empty States Polish (`PolyMartHome.tsx`)

#### 1. Peniaga Aktif
* Elevated squircle avatars with warm amber border ring and responsive tap animation.
* Clean vendor label without clipping.

#### 2. Modern Empty States
* Replaces raw `🛒` and `🏪` emojis with refined SVG illustrations (`PackageSearch` / `Store`).
* Friendly title, subtitle, and an actionable reset filter button.

---

## 4. Verification & Testing Strategy

1. **Unit Testing:**
   * Create / update tests in `src/__tests__/superAppPortal.test.ts` or new `src/__tests__/polymartSuperApp.test.ts`.
   * Assert vector category icons render without raw emoji characters.
   * Assert stadium search capsule tokens (`rounded-full`, amber ring, search placeholder).
   * Assert product card fallback renders vector icon container instead of raw text emoji.
   * Assert compact hero banner does not contain raw `🛍️`.
2. **Full Repository Regression Run:**
   * Run `npm test -- --run` to verify 100% pass across all 207 tests.
3. **Production Compilation:**
   * Run `npm run build` to verify zero TypeScript errors and clean bundling.

---

*End of Design Specification.*
