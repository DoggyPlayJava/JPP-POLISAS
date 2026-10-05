# Executive Glass Header De-cluttering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the top header of `/portal` into an ultra-premium executive glass interface by consolidating top-right actions into a single unified glass dock, removing the orphan floating help button, upgrading the search bar to luxury frosted glass, and calming the typography.

**Architecture:**
- `SuperAppHeader`:
  - Top-Right: Single unified glass dock capsule (`[ ThemeToggle | NotificationBell | ProfileAvatar ]`) with micro hairline dividers.
  - Top-Left: Clean JPP brand badge (`/jpp-logo.png` + "JPP POLISAS" + "Portal Rasmi Pelajar") and campus location pill.
  - Search: Frosted glass search bar (`bg-white/[0.08] backdrop-blur-2xl border-white/15 text-white`) with refined emerald icon.
  - Typography: Calm, elegant title-cased greeting and refined role badge.
- `PortalPage` & `PortalSidebar`:
  - Remove the awkward floating `?` button (`tour-help-button` at `fixed top-20 right-4`).
  - Wire tutorial launcher into `PortalSidebar` as a clean menu item with `<HelpCircle />` icon.

**Tech Stack:** React 18, Tailwind CSS v4, Framer Motion, Lucide Icons, Vitest.

---

### Task 1: Update Test Suite for Executive Glass Header (TDD)

**Files:**
- Modify: `src/__tests__/superAppPortal.test.ts`

**Interfaces:**
- Consumes: Vitest test runner.
- Produces: Assertions ensuring `SuperAppHeader` exports properly and renders unified action container attributes.

- [ ] **Step 1: Write test assertions in `src/__tests__/superAppPortal.test.ts`**

Add unit test verifying `SuperAppHeader` component export and props interface.

- [ ] **Step 2: Run test to verify**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit changes**

```bash
git add src/__tests__/superAppPortal.test.ts
git commit -m "test(portal): update tests for executive glass header structure"
```

---

### Task 2: Implement Unified Glass Dock, Refined Branding & Frosted Search in `SuperAppHeader.tsx`

**Files:**
- Modify: `src/components/portal/SuperAppHeader.tsx`

**Interfaces:**
- Consumes: `<ThemeToggle />`, `<NotificationBell />`, `/jpp-logo.png`, `triggerCommandPalette`.
- Produces: Polished `<SuperAppHeader />`.

- [ ] **Step 1: Update `src/components/portal/SuperAppHeader.tsx`**

1. Replace scattered top-right circular buttons with a single unified glass capsule:
   ```tsx
   <div className="inline-flex items-center p-1 rounded-2xl bg-white/10 dark:bg-black/30 backdrop-blur-2xl border border-white/15 divide-x divide-white/10 shadow-lg">
     <div className="px-1"><ThemeToggle /></div>
     <div className="px-1"><NotificationBell variant="dark" /></div>
     <div className="pl-1.5 pr-0.5">
       <button
         type="button"
         onClick={onOpenSidebar}
         className="tour-navbar-profile relative w-8 h-8 rounded-xl overflow-hidden border border-white/20 active:scale-95 transition-all shadow-sm focus:outline-none cursor-pointer"
         aria-label="Buka profil dan tetapan"
       >
         <Avatar className="w-full h-full rounded-none">
           <AvatarImage src={profile?.avatar_url || ''} className="object-cover" alt="Profil" />
           <AvatarFallback className="bg-white/20 text-white text-[11px] font-black">
             {profile?.full_name?.[0] || 'P'}
           </AvatarFallback>
         </Avatar>
       </button>
     </div>
   </div>
   ```
2. Refine JPP Logo pill on the left:
   ```tsx
   <div className="flex items-center gap-2.5">
     <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center p-1.5 shadow-sm">
       <img src="/jpp-logo.png" alt="JPP POLISAS" className="w-full h-full object-contain" />
     </div>
     <div className="flex flex-col">
       <span className="font-black text-xs sm:text-sm tracking-tight text-white leading-tight">JPP POLISAS</span>
       <span className="text-[9px] font-bold text-emerald-400 tracking-wide">Portal Rasmi Pelajar</span>
     </div>
   </div>
   ```
3. Calibrate Greeting Typography:
   Replace shouty uppercase heading with title-cased refined heading and subtle emerald badge.
4. Replace stark white search bar with luxury frosted glass search button:
   ```tsx
   <button
     type="button"
     onClick={() => triggerCommandPalette(true)}
     className="w-full h-12 px-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] dark:bg-white/[0.05] dark:hover:bg-white/[0.08] backdrop-blur-2xl border border-white/15 hover:border-emerald-400/40 text-white shadow-[0_4px_24px_rgba(0,0,0,0.25)] flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] group cursor-pointer"
   >
     <div className="flex items-center gap-3 min-w-0">
       <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
         <Search className="w-3.5 h-3.5" />
       </div>
       <span className="text-xs sm:text-sm text-white/70 group-hover:text-white font-medium truncate">
         Cari makanan, servis, peta, aduan, merit...
       </span>
     </div>
     <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-white/50 bg-white/10 rounded-md border border-white/10">
       <span>Ctrl</span>+<span>K</span>
     </kbd>
   </button>
   ```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: Build passes with 0 errors.

- [ ] **Step 3: Commit changes**

```bash
git add src/components/portal/SuperAppHeader.tsx
git commit -m "feat(portal): implement unified executive glass dock and frosted search bar"
```

---

### Task 3: Remove Orphan Floating Help Button & Move Tour Trigger into Sidebar

**Files:**
- Modify: `src/pages/PortalPage.tsx`
- Modify: `src/components/layout/PortalSidebar.tsx`

**Interfaces:**
- Consumes: `startTour` handler.
- Produces: De-cluttered top right corner with no floating `?` button.

- [ ] **Step 1: Update `src/pages/PortalPage.tsx`**

1. Remove the floating button `<button onClick={startTour} className="tour-help-button fixed top-20 right-4 ...">`.
2. Pass `onStartTour={startTour}` into `<PortalSidebar ... />`.

- [ ] **Step 2: Update `src/components/layout/PortalSidebar.tsx`**

1. Accept optional prop `onStartTour?: () => void`.
2. Add a clean, accessible menu button in the sidebar footer/actions:
   ```tsx
   {onStartTour && (
     <button
       type="button"
       onClick={() => { onClose(); onStartTour(); }}
       className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
     >
       <HelpCircle className="w-4 h-4 text-emerald-500" />
       <span>Panduan Sistem (Tutorial)</span>
     </button>
   )}
   ```

- [ ] **Step 3: Run test suite & build**

Run: `npx vitest run src/__tests__/superAppPortal.test.ts`
Run: `npm run build`
Expected: 100% PASS with 0 build errors.

- [ ] **Step 4: Commit changes**

```bash
git add src/pages/PortalPage.tsx src/components/layout/PortalSidebar.tsx
git commit -m "fix(portal): remove floating help button and move tour launcher into sidebar"
```

---

### Task 4: Complete Test & Build Verification

**Files:**
- Modify: `DEV_GUIDELINE.md`

- [ ] **Step 1: Update Section 29 in `DEV_GUIDELINE.md`**

Document the Executive Glass Dock architecture and frosted glass search bar.

- [ ] **Step 2: Run all unit tests**

Run: `npm test -- --run`
Verify 100% pass (61 tests).

- [ ] **Step 3: Commit final documentation**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs(portal): document executive glass dock and frosted search interface"
```
