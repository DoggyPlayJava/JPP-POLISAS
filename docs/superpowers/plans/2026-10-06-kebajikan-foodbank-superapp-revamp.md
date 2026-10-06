# Pelan Pelaksanaan: E-Kebajikan & FoodBank Siswa SuperApp

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghasilkan ekosistem E-Kebajikan dan FoodBank bertaraf SuperApp dengan Borang Aduan Ekspres (auto-isi profil & kamera terus), Pas Pengambilan Digital QR, Pemilihan Pantri Makanan Pantas dengan Sticky Capsule & Slide-Up Bottom Sheet, Penjejak Status Parcel (Pulse Stepper) di Hab & Portal Utama, serta Stesen Kaunter Agihan Imbasan HUD Obsidian Emerald untuk Exco tanpa sebarang raw emoji.

**Architecture:** Membahagikan pembaharuan kepada 5 tugasan modular: komponen penjejak status aktif parcel & ujian unit asas, pembaikan borang aduan ekspres, pembaharuan portal FoodBank siswa (pantri pintar & pas QR), pembaharuan stesen pengimbas HUD kaunter agihan Exco, dan dokumentasi `DEV_GUIDELINE.md` serta pengesahan binaan penuh.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Framer Motion, HTML5 QR Scanner, Canvas Confetti, Vitest, Supabase (PostgreSQL).

## Global Constraints

- **Sifar Raw Emoji:** Gantikan 100% emoji mentah dengan ikon vektor Lucide React berdefinisi tinggi.
- **Sifar Gangguan Skema DB / RPC:** Kekalkan panggilan pangkalan data sedia ada (`verify_and_complete_foodbank_pickup`, `kebajikan_tickets`, `kebajikan_messages`, `foodbank_applications`, `foodbank_items`, `foodbank_distribution_locations`).
- **Ergonomik Sentuhan Mudah Alih (Mobile-First):** Butang tindakan sekurang-kurangnya 44px (butang kaunter HUD 56px+), tiada limpahan mendatar (*zero horizontal overflow*) pada skrin telefon.
- **Konkurensi Pantas:** Gunakan `Promise.all` bagi panggilan data pelbagai serentak.
- **Pematuhan Ujian Unit:** Semua ujian unit dalam `src/__tests__/kebajikanFoodBankSuperApp.test.ts` dan seluruh repositori mesti lulus 100%.

---

### Task 1: Test Scaffolding & Live Status Tracker Component (`KebajikanLiveTrackerCard.tsx`)

**Files:**
- Create: `src/components/kebajikan/KebajikanLiveTrackerCard.tsx`
- Create: `src/__tests__/kebajikanFoodBankSuperApp.test.ts`
- Modify: `src/pages/kebajikan/KebajikanHubPage.tsx`
- Modify: `src/pages/portal/PortalPage.tsx`

**Interfaces:**
- Produces:
  - `<KebajikanLiveTrackerCard ticket={activeTicket} foodbankApp={activeFoodbankApp} />`
  - Pulse Stepper untuk Tiket: `Dihantar ➔ Disemak JPP ➔ Unit Pembangunan/Fasiliti Sedang Baiki ➔ Selesai`.
  - Pulse Stepper untuk FoodBank: `Permohonan Diterima ➔ Pakej Disediakan ➔ Sedia Diambil di Kaunter [Tunjuk Pas QR]`.
  - Butang pantas masuk ke bilik sembang tiket atau lihat Pas QR Digital.
  - Sifar raw emoji (ikon Lucide `CheckCircle2`, `Clock`, `Sparkles`, `Package`, `ChevronRight`).

- [ ] **Step 1: Write unit tests in `src/__tests__/kebajikanFoodBankSuperApp.test.ts`**
  Write tests covering:
  - `KebajikanLiveTrackerCard` exports correctly and renders parcel-style pulse steps for tickets and foodbank.
  - Quota calculation logic for foodbank pantry baskets.
  - Absence of raw emojis across kebajikan components.
  - Integration tokens in `KebajikanHubPage.tsx` and `PortalPage.tsx`.

- [ ] **Step 2: Run tests to verify test suite catches missing component**
  Run: `npx vitest run src/__tests__/kebajikanFoodBankSuperApp.test.ts`

- [ ] **Step 3: Implement `src/components/kebajikan/KebajikanLiveTrackerCard.tsx`**
  - Implement pulse tracker with animated pulsing green dot for active step.
  - Display SLA countdown or estimated time.
  - Quick action CTA `[Buka Sembang Aduan ➔]` or `[Tunjuk Pas QR ➔]`.

- [ ] **Step 4: Integrate `KebajikanLiveTrackerCard` into `KebajikanHubPage.tsx` and `PortalPage.tsx`**
  - Fetch user's latest active ticket (`status IN ('PENDING', 'IN_INVESTIGATION', 'ACTION_TAKEN')`) and active foodbank application (`status IN ('PENDING', 'APPROVED')`).
  - Render active card at the top of the hub and on the portal page.

- [ ] **Step 5: Run tests and verify all pass**
  Run: `npx vitest run src/__tests__/kebajikanFoodBankSuperApp.test.ts`

- [ ] **Step 6: Commit Task 1**
  `git add src/components/kebajikan/KebajikanLiveTrackerCard.tsx src/pages/kebajikan/KebajikanHubPage.tsx src/pages/portal/PortalPage.tsx src/__tests__/kebajikanFoodBankSuperApp.test.ts`  
  `git commit -m "feat(kebajikan): add live status tracker card and portal integration"`

---

### Task 2: Borang Aduan Fasiliti Ekspres Revamp (`KebajikanSubmitPage.tsx`)

**Files:**
- Modify: `src/pages/kebajikan/KebajikanSubmitPage.tsx`
- Test: `src/__tests__/kebajikanFoodBankSuperApp.test.ts`

**Interfaces:**
- Consumes: `useAuth()`, `compressImage` from `@/lib/imageCompression`, `supabase`
- Produces:
  - Auto-isi profil (Nama, No Matrik, Telefon, Jabatan, Bilik Asrama).
  - Pemilih kategori 1-sentuhan dengan kad visual Lucide.
  - Muat naik imej dengan tangkapan kamera telefon langsung (`capture="environment"`).
  - Sticky Bottom Capsule `[ Kategori Dipilih • Butiran Lengkap ] ➔ [ Semak & Hantar ]`.
  - Slide-Up Bottom Sheet untuk semakan ringkasan pantas sebelum hantar.
  - Sifar raw emoji.

- [ ] **Step 1: Add unit test assertions for `KebajikanSubmitPage.tsx`**
  Verify auto-fill hooks, camera capture tokens, and sticky summary capsule.

- [ ] **Step 2: Implement auto-profile population & visual category picker**
  - Populate form state automatically from `profile` or `user.user_metadata`.
  - Render high-contrast 1-tap category grid.

- [ ] **Step 3: Implement camera capture & sticky bottom summary capsule**
  - Add camera direct capture button with compression.
  - Add fixed bottom capsule docking at bottom on mobile viewports.
  - Add slide-up bottom sheet review modal.

- [ ] **Step 4: Run tests and verify zero regressions**
  Run: `npx vitest run src/__tests__/kebajikanFoodBankSuperApp.test.ts`

- [ ] **Step 5: Commit Task 2**
  `git add src/pages/kebajikan/KebajikanSubmitPage.tsx src/__tests__/kebajikanFoodBankSuperApp.test.ts`  
  `git commit -m "refactor(kebajikan): streamline express facility issue reporter with auto-profile and sticky capsule"`

---

### Task 3: FoodBank Siswa Revamp — Smart Pantry, Sticky Capsule & QR Pass (`KebajikanFoodBankPage.tsx`)

**Files:**
- Modify: `src/pages/kebajikan/KebajikanFoodBankPage.tsx`
- Test: `src/__tests__/kebajikanFoodBankSuperApp.test.ts`

**Interfaces:**
- Consumes: `FoodBankSettings`, `FoodBankItem`, `FoodBankDistributionLocation`, `FoodBankApplication`
- Produces:
  - Pakej Makanan Siap (Ready Care Box) 1-sentuhan vs Pilihan Pantri Bebas berkuota.
  - Sticky Pantry Capsule: `[ X/Y Item Dipilih • Baki Kuota: Z ] ➔ [ Semak Bakul ]`.
  - Slide-Up Pantry Bottom Sheet untuk pengubahsuaian kuantiti item.
  - Pas Pengambilan Digital (Digital QR Boarding Pass) dengan petunjuk lokasi PolyMaps & slot masa.
  - Sifar raw emoji (100% Lucide vector icons).

- [ ] **Step 1: Add unit test assertions for `KebajikanFoodBankPage.tsx`**
  Verify care package selector, sticky pantry capsule, and QR pass integration.

- [ ] **Step 2: Implement Ready Care Box vs Smart Pantry Basket modes**
  - Add fast 1-tap preset packages (Pakej Makanan Asas Segera).
  - Retain free item picker with live quota bar.

- [ ] **Step 3: Implement Sticky Pantry Bottom Capsule & Slide-Up Sheet**
  - Add bottom floating capsule showing selected item count and quota balance.
  - On tap, open smooth slide-up sheet to inspect basket items and quantity steppers.

- [ ] **Step 4: Enhance Digital QR Boarding Pass display**
  - Modern boarding pass layout with clean status badge, distribution venue map link, time slot, and QR code.

- [ ] **Step 5: Run tests and verify zero regressions**
  Run: `npx vitest run src/__tests__/kebajikanFoodBankSuperApp.test.ts`

- [ ] **Step 6: Commit Task 3**
  `git add src/pages/kebajikan/KebajikanFoodBankPage.tsx src/__tests__/kebajikanFoodBankSuperApp.test.ts`  
  `git commit -m "feat(foodbank): add smart pantry basket, sticky capsule, and digital qr boarding pass"`

---

### Task 4: High-Contrast Scanner HUD & Counter Dispatch Station (`JppFoodBankAdmin.tsx`)

**Files:**
- Modify: `src/pages/jpp/JppFoodBankAdmin.tsx`
- Test: `src/__tests__/kebajikanFoodBankSuperApp.test.ts`

**Interfaces:**
- Consumes: `verify_and_complete_foodbank_pickup` RPC, `Html5Qrcode`
- Produces:
  - Stesen Kaunter Agihan Imbasan HUD Obsidian Emerald:
    - Viewfinder kamera berpusat dengan garisan imbasan laser neon emerald animasi.
    - Haptik (`navigator.vibrate`) dan nada audio lembut pada pengesanan QR.
    - Kad identiti pelajar kontras tinggi (Nama, No Matrik, Pakej/Item).
    - Butang serahan gergasi 56px+ `[ SAHKAN SERAHAN ]`.
    - Input carian manual no. matrik sekiranya kamera terhalang.
  - Balutan jadual inventori dan lejar dengan `overflow-x-auto`.
  - Sifar raw emoji.

- [ ] **Step 1: Add unit test assertions for `JppFoodBankAdmin.tsx`**
  Verify HUD scanner tokens, zero raw emojis, and overflow safety.

- [ ] **Step 2: Implement Obsidian Emerald Scanner HUD**
  - Replace clunky scanner tab with high-contrast HUD station.
  - Add laser sweep animation and instant student verification card.
  - Add giant thumb-friendly `[ SAHKAN SERAHAN ]` action button calling `verify_and_complete_foodbank_pickup`.

- [ ] **Step 3: Refactor tables for zero horizontal overflow & zero raw emojis**
  - Wrap inventory and budget tables in `w-full max-w-full overflow-x-auto`.
  - Strip all raw emojis and replace with Lucide icons.

- [ ] **Step 4: Run tests and verify zero regressions**
  Run: `npx vitest run src/__tests__/kebajikanFoodBankSuperApp.test.ts`

- [ ] **Step 5: Commit Task 4**
  `git add src/pages/jpp/JppFoodBankAdmin.tsx src/__tests__/kebajikanFoodBankSuperApp.test.ts`  
  `git commit -m "feat(foodbank): implement high-contrast counter scanner hud and zero-overflow admin tables"`

---

### Task 5: Documentation & Full Verification (`DEV_GUIDELINE.md`, Tests, Build)

**Files:**
- Modify: `DEV_GUIDELINE.md`
- Test: Full repository test suite (`npm test -- --run`)
- Build: Production build (`npm run build`)

**Interfaces:**
- Consumes: All updated Kebajikan and FoodBank components
- Produces: Documented Subsection 29.14 in `DEV_GUIDELINE.md` and production-ready build.

- [ ] **Step 1: Update `DEV_GUIDELINE.md` with Subsection 29.14**
  Document the architecture of E-Kebajikan & FoodBank Siswa SuperApp:
  - Live Status Tracker Card (Pulse Stepper) and portal integrations.
  - Express Facility Issue Reporter with auto-profile and camera capture.
  - Smart Pantry Basket with sticky capsule and digital QR boarding pass.
  - High-Contrast Scanner HUD for counter dispatch.
  - Zero raw emoji policy.

- [ ] **Step 2: Run full repository unit tests**
  Run: `npm test -- --run`  
  Verify all test files pass (100% green).

- [ ] **Step 3: Run production build**
  Run: `npm run build`  
  Verify 0 TypeScript/lint errors.

- [ ] **Step 4: Commit Task 5**
  `git add DEV_GUIDELINE.md`  
  `git commit -m "docs(kebajikan): document ekosistem kebajikan and foodbank superapp architecture"`
