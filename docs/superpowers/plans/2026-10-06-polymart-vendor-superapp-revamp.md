# Pelan Pelaksanaan: Penaiktarafan Hab Peniaga PolyMart SuperApp (`/polymart/vendor`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menstruktur semula halaman peniaga `/polymart/vendor` daripada monolit 3,550 baris yang berserabut kepada Hab Peniaga SuperApp 3-Domain yang modular, berasaskan sentuhan (*mobile-first*), bebas halangan navigasi, dan berprestasi tinggi.

**Architecture:** Memecahkan monolit kepada seni bina modular di bawah `src/pages/polymart/vendor/` yang merangkumi: (1) `ReceiptReviewSheet` (Slide-Up Bottom Sheet semakan resit QR), (2) `VendorOrdersPipeline` (saluran pesanan 3-peringkat berorientasikan tindakan), (3) `VendorCatalogManager` (katalog & togol stok pantas dengan auto-pilih kedai tunggal), (4) `VendorAnalyticsPromo` (graf trend jualan 7-hari & permohonan iklan promo), dan (5) `PolyMartVendorDashboard` (orkestrator utama dengan *sticky top tab bar*, kad KPI padat, dan penyingkiran bar terapung bawah).

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Framer Motion, Recharts, Supabase (RPC & RLS), Vitest.

## Global Constraints

- **0% Pengubahsuaian Skema DB & RPC:** Kekalkan semua panggilan `polymart_orders`, `business_products`, `businesses`, `polymart_ads`, `complete_polymart_order`, dan `release_polymart_stock`.
- **Sifar Emoji Mentah:** 100% digantikan dengan ikon vektor Lucide rasmi.
- **Warna Tema Jenama:** Obsidian-Amber (`#f59e0b` / `amber-500` / `amber-600`) bagi mengekalkan identiti perniagaan PolyMart.
- **Prestasi 60fps Mudah Alih:** Tiada `backdrop-blur` tebal bertingkat pada kad berulang; gunakan sempadan garis halus `border-border/60`.
- **Navigasi Bersih:** Bar terapung bawah lama dengan butang merah berkedip dihapuskan 100%; gunakan *Sticky Top Segmented Navigation*.
- **Pengekalan Mod Simulasi:** Logik `use_mock_auth` dan storan tempatan dikekalkan sepenuhnya.
- **Peraturan Hooks React (Rule of Hooks):** Semua React hooks dipanggil tanpa syarat di bahagian atas komponen.

---

### Task 1: Slide-Up Bottom Sheet Semakan Resit (`ReceiptReviewSheet.tsx`) & Unit Tests

**Files:**
- Create: `src/pages/polymart/vendor/ReceiptReviewSheet.tsx`
- Test: `src/__tests__/polymartVendorSuperApp.test.ts`

**Interfaces:**
- Consumes:
  ```typescript
  interface ReceiptReviewSheetProps {
    isOpen: boolean;
    onClose: () => void;
    receiptUrl: string | null;
    orderId: string;
    buyerName?: string;
    buyerMatric?: string;
    amount: number;
    paymentVerifiedAt: string | null;
    paymentRejected: boolean;
    onVerify: () => Promise<void>;
    onReject: () => Promise<void>;
    loading: boolean;
  }
  ```
- Produces: `ReceiptReviewSheet` dieksport sebagai komponen React yang menggunakan `framer-motion` (slide up dari bawah `y: '100%'` ke `y: 0`), fungsi zum gambar resit, butiran ringkas pembeli, dan butang tindakan kembar `[Tolak Resit]` & `[Sahkan Bayaran]`.

- [ ] **Step 1: Tulis ujian unit yang gagal untuk ReceiptReviewSheet**

Cipta `src/__tests__/polymartVendorSuperApp.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PolyMart Vendor SuperApp Revamp', () => {
  it('Task 1: ReceiptReviewSheet exports correctly and contains slide-up bottom sheet tokens', () => {
    const filePath = path.resolve(__dirname, '../pages/polymart/vendor/ReceiptReviewSheet.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('export function ReceiptReviewSheet');
    expect(content).toContain('framer-motion');
    expect(content).toContain("y: '100%'");
    expect(content).toContain('Sahkan Bayaran');
    expect(content).toContain('Tolak Resit');
    // Ensure no raw emojis
    expect(content).not.toMatch(/[🛍️🛒📦⚡⚠️✅❌]/);
  });
});
```

- [ ] **Step 2: Jalankan ujian untuk memastikan ia gagal**

Jalankan: `npx vitest run src/__tests__/polymartVendorSuperApp.test.ts`  
Jangkaan: GAGAL kerana fail `ReceiptReviewSheet.tsx` belum wujud.

- [ ] **Step 3: Cipta komponen `ReceiptReviewSheet.tsx`**

Cipta `src/pages/polymart/vendor/ReceiptReviewSheet.tsx` dengan sokongan animasi slide-up framer-motion, zum gambar resit, pemaparan nama & matrik pembeli, dan butang tindakan berkembar ergonomik.

- [ ] **Step 4: Jalankan ujian semula untuk memastikan ia lulus**

Jalankan: `npx vitest run src/__tests__/polymartVendorSuperApp.test.ts`  
Jangkaan: LULUS 100%.

- [ ] **Step 5: Komit kod Task 1**

```bash
git add src/pages/polymart/vendor/ReceiptReviewSheet.tsx src/__tests__/polymartVendorSuperApp.test.ts
git commit -m "feat(polymart): add slide-up receipt review bottom sheet"
```

---

### Task 2: Domain 1: Saluran Pesanan Masuk (*Order Pipeline*) (`VendorOrdersPipeline.tsx`) & Unit Tests

**Files:**
- Create: `src/pages/polymart/vendor/VendorOrdersPipeline.tsx`
- Modify: `src/__tests__/polymartVendorSuperApp.test.ts`

**Interfaces:**
- Consumes:
  - `GroupedVendorOrder`, `OrderStatus`, `STATUS_CONFIG`
  - `ReceiptReviewSheet` daripada Task 1
- Produces:
  ```typescript
  interface VendorOrdersPipelineProps {
    orders: GroupedVendorOrder[];
    loading: boolean;
    onUpdate: () => void;
    bizName?: string;
    myBusinesses: Array<{ id: string; name: string }>;
    selectedBizId: string;
  }
  ```
  `VendorOrdersPipeline` memaparkan 3 saluran status:
  - `'actions'` (Tindakan Diperlukan: pengesahan bayaran QR Online & pesanan baru PENDING)
  - `'processing'` (Sedang Disediakan: CONFIRMED & READY, sedia ditanda 'Siap Diambil')
  - `'completed'` (Selesai & Arkib: COMPLETED & CANCELLED)
  Lengkap dengan carian, tindakan pukal (*bulk verification & bulk ready*), kad pesanan padat, dan pautan WhatsApp dinamik & chat dalam talian.

- [ ] **Step 1: Tulis ujian unit untuk VendorOrdersPipeline**

Tambah ke `src/__tests__/polymartVendorSuperApp.test.ts`:
```typescript
it('Task 2: VendorOrdersPipeline defines 3 core status tabs and zero raw emojis', () => {
  const filePath = path.resolve(__dirname, '../pages/polymart/vendor/VendorOrdersPipeline.tsx');
  expect(fs.existsSync(filePath)).toBe(true);
  const content = fs.readFileSync(filePath, 'utf-8');
  expect(content).toContain('export function VendorOrdersPipeline');
  expect(content).toContain("'actions'");
  expect(content).toContain("'processing'");
  expect(content).toContain("'completed'");
  expect(content).toContain('ReceiptReviewSheet');
  expect(content).not.toMatch(/[🛍️🛒📦⚡⚠️✅❌]/);
});
```

- [ ] **Step 2: Jalankan ujian untuk memastikan ia gagal**

Jalankan: `npx vitest run src/__tests__/polymartVendorSuperApp.test.ts`  
Jangkaan: GAGAL kerana fail belum wujud.

- [ ] **Step 3: Cipta `VendorOrdersPipeline.tsx`**

Cipta `src/pages/polymart/vendor/VendorOrdersPipeline.tsx` mengandungi:
1. Tab satu baris 3-peringkat (`Tindakan Diperlukan`, `Sedang Disediakan`, `Selesai & Arkib`).
2. Bar carian segera & penapis tarikh/kaedah bayaran (COD / QR Online).
3. Spanduk tindakan pukal (*Bulk Approve / Bulk Ready*) dengan kotak semak dan jumlah ringgit.
4. Kad pesanan padat dengan avatar pembeli, lencana ID disalin segera, templat WhatsApp dinamik mengikut status, butang sembang dalam talian, dan penyepaduan `ReceiptReviewSheet`.
5. Pengekalan 100% logik RPC `complete_polymart_order`, `release_polymart_stock`, dan mod simulasi `use_mock_auth`.

- [ ] **Step 4: Jalankan ujian untuk memastikan ia lulus**

Jalankan: `npx vitest run src/__tests__/polymartVendorSuperApp.test.ts`  
Jangkaan: LULUS 100%.

- [ ] **Step 5: Komit kod Task 2**

```bash
git add src/pages/polymart/vendor/VendorOrdersPipeline.tsx src/__tests__/polymartVendorSuperApp.test.ts
git commit -m "feat(polymart): implement 3-stage action-first vendor order pipeline"
```

---

### Task 3: Domain 2: Katalog & Kawalan Stok Pantas (`VendorCatalogManager.tsx`) & Unit Tests

**Files:**
- Create: `src/pages/polymart/vendor/VendorCatalogManager.tsx`
- Modify: `src/__tests__/polymartVendorSuperApp.test.ts`

**Interfaces:**
- Consumes:
  ```typescript
  interface VendorCatalogManagerProps {
    myBusinesses: Array<{ id: string; name: string }>;
    selectedBizId: string;
    onBizChange: (bizId: string) => void;
    onUpdate?: () => void;
  }
  ```
- Produces:
  `VendorCatalogManager` memaparkan senarai produk kedai dengan:
  - Pemilihan kedai automatik (jika 1 kedai, pilih serta-merta tanpa amaran sekatan skrin).
  - Butang togol ketersediaan produk (*Tersedia* vs *Tutup Jualan*).
  - Pelaras pantas kuantiti stok asas dan variasi (+ / - / input simpan).
  - Butang tindakan jelas `[+ Urus Penuh / Tambah Produk di POS]` yang menghubungkan ke `/keusahawanan/pos/products`.

- [ ] **Step 1: Tulis ujian unit untuk VendorCatalogManager**

Tambah ke `src/__tests__/polymartVendorSuperApp.test.ts`:
```typescript
it('Task 3: VendorCatalogManager auto-handles single stores and links to POS products', () => {
  const filePath = path.resolve(__dirname, '../pages/polymart/vendor/VendorCatalogManager.tsx');
  expect(fs.existsSync(filePath)).toBe(true);
  const content = fs.readFileSync(filePath, 'utf-8');
  expect(content).toContain('export function VendorCatalogManager');
  expect(content).toContain('/keusahawanan/pos/products');
  expect(content).not.toContain('Pilih Kedai Terlebih Dahulu');
  expect(content).not.toMatch(/[🛍️🛒📦⚡⚠️✅❌]/);
});
```

- [ ] **Step 2: Jalankan ujian untuk memastikan ia gagal**

Jalankan: `npx vitest run src/__tests__/polymartVendorSuperApp.test.ts`  
Jangkaan: GAGAL kerana fail belum wujud.

- [ ] **Step 3: Cipta `VendorCatalogManager.tsx`**

Cipta `src/pages/polymart/vendor/VendorCatalogManager.tsx` mengandungi:
1. Pemilihan automatik `selectedBizId` kepada `myBusinesses[0].id` jika tiada kedai spesifik dipilih.
2. Butang pintas navigasi ke pengurusan produk POS `/keusahawanan/pos/products`.
3. Kad produk ringkas dengan imej atau ikon kategori, togol status aktif pantas, dan editor stok variasi/asas yang ergonomik di telefon pintar.
4. Pengekalan logik kemas kini pangkalan data `business_products` dan `use_mock_auth`.

- [ ] **Step 4: Jalankan ujian untuk memastikan ia lulus**

Jalankan: `npx vitest run src/__tests__/polymartVendorSuperApp.test.ts`  
Jangkaan: LULUS 100%.

- [ ] **Step 5: Komit kod Task 3**

```bash
git add src/pages/polymart/vendor/VendorCatalogManager.tsx src/__tests__/polymartVendorSuperApp.test.ts
git commit -m "feat(polymart): implement streamlined vendor catalog manager with pos integration"
```

---

### Task 4: Domain 3: Prestasi & Promosi (`VendorAnalyticsPromo.tsx`) & Unit Tests

**Files:**
- Create: `src/pages/polymart/vendor/VendorAnalyticsPromo.tsx`
- Modify: `src/__tests__/polymartVendorSuperApp.test.ts`

**Interfaces:**
- Consumes:
  ```typescript
  interface VendorAnalyticsPromoProps {
    orders: GroupedVendorOrder[];
    products: Array<{ id: string; name: string; stock_quantity: number; reserved_stock: number; business_id: string }>;
    myBusinesses: Array<{ id: string; name: string }>;
    selectedBizId: string;
    onUpdate?: () => void;
  }
  ```
- Produces:
  `VendorAnalyticsPromo` memaparkan:
  - Graf trend pra-pesanan 7-hari Recharts AreaChart (Hasil RM & Kuantiti).
  - Panel amaran inventori rendah (produk dengan baki boleh dijual <= 5 unit).
  - Tab permohonan iklan banner PolyMart (`polymart_ads`) dengan modal borang kemas kini imej dan status kelulusan Exco.

- [ ] **Step 1: Tulis ujian unit untuk VendorAnalyticsPromo**

Tambah ke `src/__tests__/polymartVendorSuperApp.test.ts`:
```typescript
it('Task 4: VendorAnalyticsPromo renders sales trend chart and ad promotion applications', () => {
  const filePath = path.resolve(__dirname, '../pages/polymart/vendor/VendorAnalyticsPromo.tsx');
  expect(fs.existsSync(filePath)).toBe(true);
  const content = fs.readFileSync(filePath, 'utf-8');
  expect(content).toContain('export function VendorAnalyticsPromo');
  expect(content).toContain('AreaChart');
  expect(content).toContain('polymart_ads');
  expect(content).not.toMatch(/[🛍️🛒📦⚡⚠️✅❌]/);
});
```

- [ ] **Step 2: Jalankan ujian untuk memastikan ia gagal**

Jalankan: `npx vitest run src/__tests__/polymartVendorSuperApp.test.ts`  
Jangkaan: GAGAL kerana fail belum wujud.

- [ ] **Step 3: Cipta `VendorAnalyticsPromo.tsx`**

Cipta `src/pages/polymart/vendor/VendorAnalyticsPromo.tsx` dengan penggabungan graf jualan 7-hari Recharts, senarai amaran stok rendah, dan pengurusan iklan promo banner PolyMart.

- [ ] **Step 4: Jalankan ujian untuk memastikan ia lulus**

Jalankan: `npx vitest run src/__tests__/polymartVendorSuperApp.test.ts`  
Jangkaan: LULUS 100%.

- [ ] **Step 5: Komit kod Task 4**

```bash
git add src/pages/polymart/vendor/VendorAnalyticsPromo.tsx src/__tests__/polymartVendorSuperApp.test.ts
git commit -m "feat(polymart): implement vendor analytics and ad promotion module"
```

---

### Task 5: Penggabungan Hab Peniaga SuperApp (`PolyMartVendorDashboard.tsx`), Penyingkiran Bar Terapung Bawah, Dokumentasi `DEV_GUIDELINE.md` & Pengesahan Penuh

**Files:**
- Modify: `src/pages/polymart/PolyMartVendorDashboard.tsx`
- Modify: `DEV_GUIDELINE.md`
- Modify: `src/__tests__/polymartVendorSuperApp.test.ts`

**Interfaces:**
- Menggabungkan:
  - `VendorOrdersPipeline` (Domain 1)
  - `VendorCatalogManager` (Domain 2)
  - `VendorAnalyticsPromo` (Domain 3)
- Memastikan bar terapung mudah alih lama dengan butang merah berkedip dibuang sepenuhnya.
- Memastikan 4 kad KPI terpapar di bahagian atas dengan togol kedai (Buka/Tutup) dan kapsul penukar kedai pintar.
- Mengemaskini `DEV_GUIDELINE.md` Seksyen 29.12.

- [ ] **Step 1: Tulis ujian integrasi penuh untuk PolyMartVendorDashboard**

Tambah ke `src/__tests__/polymartVendorSuperApp.test.ts`:
```typescript
it('Task 5: PolyMartVendorDashboard integrates 3 domains and removes floating red button', () => {
  const filePath = path.resolve(__dirname, '../pages/polymart/PolyMartVendorDashboard.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');
  expect(content).toContain('VendorOrdersPipeline');
  expect(content).toContain('VendorCatalogManager');
  expect(content).toContain('VendorAnalyticsPromo');
  // Ensure floating bottom bar with blinking red button is completely removed
  expect(content).not.toContain('bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/30 font-black scale-105 animate-pulse');
  expect(content).not.toMatch(/[🛍️🛒📦⚡⚠️✅❌]/);
});
```

- [ ] **Step 2: Jalankan ujian untuk memeriksa ralat semasa**

Jalankan: `npx vitest run src/__tests__/polymartVendorSuperApp.test.ts`  
Jangkaan: GAGAL kerana `PolyMartVendorDashboard.tsx` belum digabungkan.

- [ ] **Step 3: Kemas kini `PolyMartVendorDashboard.tsx`**

Gantikan monolit 3,550 baris dengan orkestrator yang kemas:
1. Memuatkan data kedai (`myBusinesses`), pesanan (`loadOrders`), dan produk secara teratur dengan `Promise.all`.
2. Header dengan togol Buka/Tutup Kedai dan kapsul penukar kedai pintar.
3. 4 Kad KPI Padat (*Pesanan Hari Ini*, *Menunggu Tindakan*, *Sedang Diproses*, *Hasil Selesai*).
4. Sticky Top Segmented Tab Bar bagi 3 domain: `orders` (Pesanan Masuk), `catalog` (Katalog & Stok), `analytics` (Prestasi & Iklan).
5. Buang sepenuhnya komponen bar terapung bawah yang lama (`Floating Sticky Bottom Bar`).

- [ ] **Step 4: Kemas kini `DEV_GUIDELINE.md` (Seksyen 29.12)**

Dokumentasikan Seni Bina Hab Peniaga PolyMart SuperApp:
- 3 Domain Peniaga: Pesanan Masuk, Katalog & Stok, Prestasi & Promosi.
- Slide-Up Bottom Sheet Semakan Resit.
- Penyingkiran bar terapung bawah & prinsip *Sticky Top Navigation*.
- Integrasi ke e-Keusahawanan POS.

- [ ] **Step 5: Jalankan semua ujian repo dan kompilasi build**

Jalankan:
```bash
npm test -- --run
npm run build
```
Jangkaan: Semua fail ujian lulus 100%, kompilasi build 0 ralat.

- [ ] **Step 6: Komit kod Task 5**

```bash
git add src/pages/polymart/PolyMartVendorDashboard.tsx DEV_GUIDELINE.md src/__tests__/polymartVendorSuperApp.test.ts
git commit -m "refactor(polymart): overhaul vendor dashboard into 3-domain superapp merchant hub"
```
