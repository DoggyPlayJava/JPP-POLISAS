# PolyMart SuperApp UI Upgrade (Executive Obsidian-Amber Edition) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate PolyMart to match the POLISAS SuperApp design language with an executive Obsidian-Amber storefront, pure stadium search capsule, discrete circular action buttons, crisp vector category icons, and high-performance product cards.

**Architecture:** Modernize `PolyMartLayout.tsx` for navigation and category chips, and `PolyMartHome.tsx` for the compact hero showcase and product cards. Strictly preserve all existing business logic, cart operations, Supabase queries, and route handlers.

**Tech Stack:** React 18, TypeScript, Tailwind v4, Lucide React icons, Framer Motion (`framer-motion`), Vitest.

## Global Constraints

* **100% Visual & UI Polish:** Zero modification to cart logic, database queries, order statuses, or Supabase realtime subscriptions.
* **Student Phone Performance (Guardrail 1):** Zero heavy `backdrop-blur` or multi-layer glow across the 50 product cards; use crisp hairline borders (`border border-border/60 hover:border-amber-400/50`) and solid/semi-solid background tokens (`bg-card dark:bg-slate-900/90`).
* **Compact Mobile Screen Estate (Guardrail 2):** Hero banner height is capped (`max-h-[180px]` on mobile) with punchy 1–2 line headline and stats pills, keeping the product grid immediately visible near the first fold.
* **Brand Identity Discipline (Guardrail 3):** Inherit Portal structural archetypes (stadium search capsule, discrete circular action buttons) while strictly preserving PolyMart's Amber/Warm Gold (`#f59e0b`) brand palette.
* **No Raw Emojis:** Replace all raw emoji icons in categories and hero/empty states with Lucide vector icons (`Utensils`, `Coffee`, `Sparkles`, `Wrench`, `Shirt`, `Smartphone`, `Package`, `LayoutGrid`, `PackageSearch`, `Store`).

---

### Task 1: Modernize Top Header, Stadium Search & Vector Categories in `PolyMartLayout.tsx`

**Files:**
- Modify: `src/pages/polymart/PolyMartLayout.tsx`
- Test: `src/__tests__/superAppPortal.test.ts` (or add to `src/__tests__/polymartSuperApp.test.ts`)

**Interfaces:**
- Consumes: `useAuth()`, `useNavigate()`, `useLocation()`, `useTour()`, Lucide React icons (`LayoutGrid`, `Utensils`, `Coffee`, `Sparkles`, `Wrench`, `Shirt`, `Smartphone`, `Package`, `ArrowLeft`, `ShoppingBag`, `Search`, `Heart`, `Store`, `Shield`, `Plus`, `X`).
- Produces: `CATEGORY_LIST` with vector icon components instead of raw emoji strings, `PolyMartLayout` header with stadium search capsule and discrete circular buttons.

- [ ] **Step 1: Write the failing test for PolyMartLayout modernization**

In `src/__tests__/superAppPortal.test.ts`, add a new describe block testing `CATEGORY_LIST` and `PolyMartLayout` UI tokens:

```tsx
describe('PolyMartLayout SuperApp Modernization', () => {
  it('exports CATEGORY_LIST with valid Lucide icon mapping and no raw emoji strings', async () => {
    const { CATEGORY_LIST } = await import('@/pages/polymart/PolyMartLayout');
    expect(CATEGORY_LIST).toBeDefined();
    expect(CATEGORY_LIST.length).toBe(8);

    // Verify all categories have icon components and clean labels
    CATEGORY_LIST.forEach((cat) => {
      expect(cat.key).toBeDefined();
      expect(cat.label).toBeDefined();
      expect(cat.icon).toBeDefined();
      expect(typeof cat.icon).toBe('function');
      // No raw emojis in labels
      expect(cat.label).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    });
  });

  it('renders PolyMartLayout with stadium search capsule and discrete circular buttons', async () => {
    const { PolyMartLayout } = await import('@/pages/polymart/PolyMartLayout');
    const { MemoryRouter } = await import('react-router-dom');
    const { renderToString } = await import('react-dom/server');

    const html = renderToString(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/polymart'] },
        React.createElement(PolyMartLayout)
      )
    );

    // Stadium search capsule tokens
    expect(html).toContain('rounded-full');
    expect(html).toContain('border-amber-500/20');

    // Discrete circular button tokens
    expect(html).toContain('w-9 h-9 rounded-full');
    expect(html).toContain('MARKETPLACE');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Expected: FAIL because `cat.icon` is undefined and `CATEGORY_LIST` currently contains `emoji`.

- [ ] **Step 3: Implement `PolyMartLayout.tsx` updates**

1. Update `CATEGORY_LIST` in `src/pages/polymart/PolyMartLayout.tsx`:
   Import icons from `lucide-react`:
   ```tsx
   import {
     ArrowLeft, ShoppingBag, Search, Package, LayoutGrid,
     Shield, Home, SlidersHorizontal, X, LogIn, ShoppingCart, HelpCircle, Store, Plus, Heart, MessageCircle,
     Utensils, Coffee, Sparkles, Wrench, Shirt, Smartphone
   } from 'lucide-react';
   ```
   Define `CATEGORY_LIST`:
   ```tsx
   export const CATEGORY_LIST = [
     { key: 'all',          label: 'Semua',        icon: LayoutGrid },
     { key: 'Makanan',      label: 'Makanan',      icon: Utensils },
     { key: 'Minuman',      label: 'Minuman',      icon: Coffee },
     { key: 'Aksesori',     label: 'Aksesori',     icon: Sparkles },
     { key: 'Perkhidmatan', label: 'Servis',       icon: Wrench },
     { key: 'Pakaian',      label: 'Pakaian',      icon: Shirt },
     { key: 'Elektronik',   label: 'Gadget',       icon: Smartphone },
     { key: 'Umum',         label: 'Umum',         icon: Package },
   ];

   export const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
     Makanan: Utensils,
     Minuman: Coffee,
     Aksesori: Sparkles,
     Perkhidmatan: Wrench,
     Pakaian: Shirt,
     Elektronik: Smartphone,
     Umum: Package,
   };
   ```

2. Modernize Header container in `PolyMartLayout.tsx`:
   ```tsx
   <header className="sticky top-0 z-40 bg-background/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-amber-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
   ```

3. Update Back button:
   ```tsx
   <button
     onClick={() => isHome ? navigate(user ? '/portal' : '/') : navigate(-1)}
     className="w-9 h-9 rounded-full bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-amber-400/40 flex items-center justify-center shrink-0 group transition-all active:scale-95 cursor-pointer"
     aria-label="Kembali"
   >
     <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
   </button>
   ```

4. Update Logo / Brand Mark:
   ```tsx
   <motion.button
     initial={{ opacity: 0, x: -8 }}
     animate={{ opacity: 1, x: 0 }}
     onClick={() => { navigate('/polymart'); setActiveCategory('all'); }}
     className="flex items-center gap-2.5 shrink-0 cursor-pointer text-left"
   >
     <div
       className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/20 border border-amber-400/30"
       style={{ background: PM_GRADIENT }}
     >
       <ShoppingBag className="w-4 h-4 text-white" />
     </div>
     <div className="leading-tight hidden sm:block">
       <p className="text-[13px] font-black tracking-tight text-foreground">PolyMart</p>
       <p className="text-[8px] font-black tracking-widest uppercase text-amber-600 dark:text-amber-400">
         MARKETPLACE
       </p>
     </div>
   </motion.button>
   ```

5. Update Stadium Search Capsule:
   - Mobile Trigger:
     ```tsx
     <button
       onClick={() => setShowMobileSearch(true)}
       className="flex sm:hidden flex-1 items-center gap-2.5 h-10 px-3.5 rounded-full bg-white dark:bg-slate-900 border border-border/70 hover:border-amber-400/50 shadow-xs text-muted-foreground/60 cursor-pointer"
     >
       <Search className="w-4 h-4 text-amber-500 shrink-0" />
       <span className="text-xs text-left truncate flex-1">Cari makanan, servis, pakaian...</span>
     </button>
     ```
   - Desktop Input:
     ```tsx
     <div className="hidden sm:flex flex-1 items-center gap-2.5 h-10 px-4 rounded-full bg-white dark:bg-slate-900 border border-border/70 hover:border-amber-400/50 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/25 shadow-xs transition-all">
       <Search className="w-4 h-4 text-amber-500 shrink-0" />
       <input
         value={searchQuery}
         onChange={e => setSearchQuery(e.target.value)}
         placeholder="Cari makanan, minuman, servis, pakaian..."
         className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60"
       />
       {searchQuery && (
         <button onClick={() => setSearchQuery('')} className="p-1 rounded-full hover:bg-muted shrink-0 cursor-pointer">
           <X className="w-3.5 h-3.5 text-muted-foreground" />
         </button>
       )}
     </div>
     ```

6. Update Right Circular Action Buttons:
   - Troli:
     ```tsx
     <button
       onClick={() => navigate('/polymart/troli')}
       className="tour-polymart-cart relative hidden sm:flex w-9 h-9 rounded-full items-center justify-center bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-amber-400/40 text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer"
       aria-label="Troli Beli-belah"
     >
       <ShoppingCart className="w-4 h-4" />
       {cartCount > 0 && (
         <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-slate-950 text-[8px] font-black flex items-center justify-center shadow-xs bg-amber-400">
           {cartCount > 9 ? '9+' : cartCount}
         </span>
       )}
     </button>
     ```
   - Pesanan:
     ```tsx
     <button
       onClick={() => navigate('/polymart/pesanan-saya')}
       className="relative hidden sm:flex w-9 h-9 rounded-full items-center justify-center bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-amber-400/40 text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer"
       aria-label="Pesanan Saya"
     >
       <Package className="w-4 h-4" />
       {myActiveOrdersCount > 0 && (
         <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-slate-950 text-[8px] font-black flex items-center justify-center shadow-xs bg-amber-400">
           {myActiveOrdersCount > 9 ? '9+' : myActiveOrdersCount}
         </span>
       )}
     </button>
     ```
   - Wishlist:
     ```tsx
     <button
       onClick={() => navigate('/polymart/wishlist')}
       className="relative hidden sm:flex w-9 h-9 rounded-full items-center justify-center bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-rose-400/40 text-muted-foreground hover:text-rose-500 transition-all active:scale-95 cursor-pointer"
       aria-label="Senarai Hajat"
     >
       <Heart className="w-4 h-4" />
     </button>
     ```
   - Vendor / Admin / Mulai Bisnes Pill:
     ```tsx
     {isVendor ? (
       <button
         onClick={() => navigate('/polymart/vendor')}
         className="tour-polymart-vendor relative h-9 px-3.5 rounded-full flex items-center justify-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer"
       >
         <Store className="w-3.5 h-3.5" />
         <span className="text-[10px] font-black uppercase tracking-wider">Kedai</span>
         {pendingVendorCount > 0 && (
           <span className="min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">
             {pendingVendorCount}
           </span>
         )}
       </button>
     ) : ...}
     ```

7. Update Category Pills rendering in `PolyMartLayout.tsx`:
   ```tsx
   <div className="tour-polymart-categories flex items-center gap-2 pb-3 pt-1 overflow-x-auto scrollbar-hide">
     {CATEGORY_LIST.map((cat) => {
       const Icon = cat.icon;
       const isActive = activeCategory === cat.key;
       return (
         <motion.button
           key={cat.key}
           whileTap={{ scale: 0.95 }}
           onClick={() => setActiveCategory(cat.key)}
           className={cn(
             'flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer border',
             isActive
               ? 'bg-amber-500 text-slate-950 border-amber-400/60 shadow-md shadow-amber-500/20 font-black'
               : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50'
           )}
         >
           <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-slate-950' : 'text-muted-foreground')} />
           <span>{cat.label}</span>
         </motion.button>
       );
     })}
   </div>
   ```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/pages/polymart/PolyMartLayout.tsx src/__tests__/superAppPortal.test.ts
git commit -m "feat(polymart): modernize header with stadium search and vector categories"
```

---

### Task 2: Compact Showcase Hero & Lightweight Product Cards in `PolyMartHome.tsx`

**Files:**
- Modify: `src/pages/polymart/PolyMartHome.tsx`
- Test: `src/__tests__/superAppPortal.test.ts`

**Interfaces:**
- Consumes: `CATEGORY_ICON_MAP` from `PolyMartLayout`, Lucide icons (`Store`, `Star`, `Heart`, `Clock`, `PackageSearch`, `Sparkles`, `TrendingUp`, `Zap`, `ChevronRight`).
- Produces: Compact Obsidian-Amber `HeroBanner`, lightweight `ProductCard` with vector squircle fallback, modernized `BusinessCard`, and clean SVG empty states.

- [ ] **Step 1: Write the failing test for PolyMartHome card & hero modernization**

In `src/__tests__/superAppPortal.test.ts`, add test cases for `PolyMartHome` visual upgrades:

```tsx
describe('PolyMartHome SuperApp Modernization', () => {
  it('renders ProductCard without raw emojis and with vector fallback container', async () => {
    const { PolyMartHome } = await import('@/pages/polymart/PolyMartHome');
    expect(PolyMartHome).toBeDefined();
    expect(typeof PolyMartHome).toBe('function');
  });

  it('ensures hero banner text does not contain raw 🛍️ emoji', async () => {
    // Check that PolyMartHome source file eliminates raw 🛍️ and 🏪 emojis
    const fs = await import('fs');
    const content = fs.readFileSync('src/pages/polymart/PolyMartHome.tsx', 'utf-8');
    expect(content).not.toContain("text-5xl sm:text-6xl leading-none select-none mt-1\">🛍️");
    expect(content).not.toContain("<div className=\"text-5xl\">🛒</div>");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Expected: FAIL because `PolyMartHome.tsx` still contains the raw `🛍️` and `🛒` strings.

- [ ] **Step 3: Implement `PolyMartHome.tsx` visual upgrades**

1. Import `CATEGORY_ICON_MAP` from `./PolyMartLayout`:
   ```tsx
   import { usePolymart, PM_ACCENT, PM_LIGHT, PM_GRADIENT, PM_GLOW, CATEGORY_ICON_MAP } from './PolyMartLayout';
   import {
     Star, ShoppingCart, Store, TrendingUp, Zap, ChevronRight, ChevronLeft,
     Package, Clock, AlertCircle, Heart, Sparkles, PackageSearch
   } from 'lucide-react';
   ```

2. Upgrade `ProductCard`:
   - Replace the image placeholder with an elegant abstract geometric background + glass squircle with category vector icon:
   ```tsx
   function ProductCard({ product, index, isWishlisted, onToggleWishlist }: ...) {
     const navigate = useNavigate();
     const FallbackIcon = CATEGORY_ICON_MAP[product.category] || Package;
     const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
     const isOut = product.stock_quantity === 0;
     const avgRating = product.avg_rating;

     return (
       <motion.div
         initial={{ opacity: 0, y: 16 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.25 }}
         whileTap={{ scale: 0.98 }}
         onClick={() => navigate(`/polymart/produk/${product.id}`)}
         className="relative group cursor-pointer rounded-2xl bg-card dark:bg-slate-900/90 border border-border/60 hover:border-amber-400/50 hover:shadow-[0_8px_24px_rgba(245,158,11,0.08)] transition-all duration-300 overflow-hidden flex flex-col"
       >
         {/* Image Area */}
         <div className="relative aspect-square overflow-hidden bg-muted/30">
           {product.image_url ? (
             <img
               src={product.image_url}
               alt={product.name}
               loading="lazy"
               decoding="async"
               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
             />
           ) : (
             <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-amber-500/10 via-muted/40 to-orange-500/5 relative">
               <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs group-hover:scale-110 transition-transform">
                 <FallbackIcon className="w-6 h-6" />
               </div>
               <span className="text-[10px] font-bold text-muted-foreground/60 mt-1.5 uppercase tracking-wider">
                 {product.category}
               </span>
             </div>
           )}

           {/* Status badges */}
           {isOut && (
             <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
               <span className="text-[9px] font-black uppercase text-white tracking-widest bg-black/70 px-2.5 py-1 rounded-full border border-white/20">
                 Habis
               </span>
             </div>
           )}
           {isLowStock && !isOut && (
             <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-500 text-slate-950 text-[8px] font-black px-2 py-0.5 rounded-full shadow-xs">
               <Clock className="w-2.5 h-2.5" />
               <span>Baki {product.stock_quantity}</span>
             </div>
           )}
           {!isLowStock && !isOut && (
             <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-xs text-white text-[8px] font-bold px-2 py-0.5 rounded-full z-10 border border-white/10">
               {product.category}
             </div>
           )}

           {/* Flash sale badge */}
           {product.sale_price && product.sale_start_at && product.sale_end_at &&
             new Date() >= new Date(product.sale_start_at) && new Date() <= new Date(product.sale_end_at) && (
             <div className="absolute bottom-2 left-2 bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-xs animate-pulse">
               ⚡ -{Math.round((1 - product.sale_price / product.price) * 100)}%
             </div>
           )}

           {/* Wishlist Button */}
           <button
             onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id); }}
             className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 dark:bg-slate-950/80 backdrop-blur-xs border border-white/20 shadow-xs flex items-center justify-center z-10 hover:scale-110 active:scale-90 transition-all cursor-pointer"
             aria-label="Simpan ke Senarai Hajat"
           >
             <Heart className={cn('w-3.5 h-3.5 transition-colors', isWishlisted ? 'text-rose-500 fill-rose-500' : 'text-muted-foreground/60')} />
           </button>
         </div>

         {/* Product Details */}
         <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
           <div>
             <p className="text-[10px] font-bold text-muted-foreground truncate flex items-center gap-1">
               <Store className="w-2.5 h-2.5 text-amber-500 shrink-0" />
               {product.keusahawanan_businesses?.name ?? 'Kedai Mahasiswa'}
             </p>
             <h3 className="text-[12px] sm:text-[13px] font-bold text-foreground leading-snug line-clamp-2 mt-0.5">
               {product.name}
             </h3>
           </div>

           <div className="flex items-center justify-between pt-1 border-t border-border/40">
             {isOnSale ? (
               <div className="flex items-baseline gap-1.5">
                 <span className="text-xs sm:text-sm font-black text-rose-500">RM {product.sale_price!.toFixed(2)}</span>
                 <span className="text-[10px] text-muted-foreground line-through">RM {product.price.toFixed(2)}</span>
               </div>
             ) : (
               <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
                 RM {product.price.toFixed(2)}
               </span>
             )}

             {avgRating && avgRating > 0 ? (
               <div className="flex items-center gap-0.5">
                 <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                 <span className="text-[10px] font-bold text-muted-foreground">{avgRating.toFixed(1)}</span>
               </div>
             ) : null}
           </div>
         </div>
       </motion.div>
     );
   }
   ```

3. Upgrade `DefaultBanner` inside `HeroBanner`:
   - Keep height compact (`max-h-[175px]` on mobile) per Guardrail 2.
   - Remove raw `🛍️` emoji.
   - Replace with sleek frosted micro-badge and amber graphics:
   ```tsx
   const DefaultBanner = () => (
     <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden w-full shrink-0 bg-gradient-to-tr from-stone-950 via-slate-900 to-amber-950/40 border border-amber-500/20 shadow-lg">
       <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-25 bg-amber-500" />
       <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-2xl opacity-20 bg-orange-500" />

       <div className="relative p-4 sm:p-6">
         <div className="flex items-center justify-between gap-4">
           <div className="flex-1 space-y-2">
             <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase tracking-wider">
               <Sparkles className="w-3 h-3 text-amber-400" />
               <span>Pasar Mahasiswa POLISAS</span>
             </div>

             <h1 className="text-base sm:text-xl font-black text-white leading-tight">
               Jelajah & Tempah Produk{' '}
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                 Kampus Anda
               </span>
             </h1>

             <div className="flex items-center gap-3 pt-1">
               <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/5 border border-white/10">
                 <Package className="w-3 h-3 text-amber-400" />
                 <span className="text-xs font-black text-white">{totalProducts}</span>
                 <span className="text-[9px] text-white/50">Produk</span>
               </div>
               <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/5 border border-white/10">
                 <Store className="w-3 h-3 text-amber-400" />
                 <span className="text-xs font-black text-white">{totalVendors}</span>
                 <span className="text-[9px] text-white/50">Peniaga</span>
               </div>
             </div>
           </div>

           {/* Sleek Vector Badge instead of raw 🛍️ */}
           <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 items-center justify-center text-amber-400 shadow-inner shrink-0">
             <ShoppingBag className="w-8 h-8" />
           </div>
         </div>
       </div>
     </div>
   );
   ```

4. Upgrade `BusinessCard`:
   - Use rounded-2xl squircle with clean amber border hover:
   ```tsx
   <div className="w-14 h-14 rounded-2xl border border-border/60 hover:border-amber-400/50 bg-muted/30 overflow-hidden relative transition-all group-hover:scale-105 shadow-xs">
   ```

5. Upgrade Empty States:
   - Replace raw emojis `🛒` and `🏪` with `PackageSearch` and `Store`:
   ```tsx
   <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
     <PackageSearch className="w-7 h-7" />
   </div>
   ```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/pages/polymart/PolyMartHome.tsx src/__tests__/superAppPortal.test.ts
git commit -m "feat(polymart): modernize hero showcase, product cards and vector fallbacks"
```

---

### Task 3: Regression Suite, Build Verification & Documentation Gate

**Files:**
- Modify: `DEV_GUIDELINE.md`
- Verify: Full Vitest test suite (`npm test -- --run`)
- Verify: Full production build (`npm run build`)

- [ ] **Step 1: Update `DEV_GUIDELINE.md`**

In `DEV_GUIDELINE.md`, under the SuperApp / PolyMart section (Section 29 or relevant module section):
Document:
1. PolyMart SuperApp Executive Obsidian-Amber theme (`#f59e0b`).
2. Pure white / frosted stadium search capsule and discrete circular buttons.
3. Vector category mapping (`LayoutGrid`, `Utensils`, `Coffee`, etc.) replacing raw emojis.
4. Lightweight product card specifications and senior performance guardrails (no heavy multi-card blur).
5. Compact mobile screen estate hero banner (`max-h-[180px]`).

- [ ] **Step 2: Run full repository unit tests**

Run: `npm test -- --run`
Verify: All 15+ test suites and 208+ tests pass with 0 failures.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Verify: Vite bundle compiles cleanly with 0 TypeScript or bundling errors.

- [ ] **Step 4: Commit documentation & finalize**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs(polymart): document SuperApp UI upgrade and performance guardrails"
```

---
