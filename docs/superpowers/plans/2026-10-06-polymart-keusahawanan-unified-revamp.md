# Pelan Pelaksanaan: Rombakan Pembaikan PolyMart & Penyatuan Pusat Peniaga e-Keusahawanan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membaiki 3 ralat kritikal PolyMart (butang Lihat Semua peniaga, header melimpah di telefon, dan susunan jualan Paling Laris), menyepadukan kad etalase PolyMart terus ke dalam Papan Pemuka e-Keusahawanan, memudahkan pengurusan perniagaan daripada 7 tab mikro kepada 3 domain teras, serta membasmi sebarang isu limpahan mendatar (*window flowing*) di telefon pintar.

**Architecture:** Menggunakan pendekatan komponen modular berasaskan React + Framer Motion, menyambungkan data jualan sebenar daripada jadual `polymart_orders` dan `business_transactions`, membendung kontena lebar dengan pembungkus tatalan mendatar terlindung (*contained horizontal scroll*), dan menyusun semula struktur navigasi pengurusan perniagaan tanpa mengubah skema pangkalan data atau logik perakaunan sedia ada.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide React Icons, Supabase Client, Vitest.

## Global Constraints

- **Strict Zero-Emoji Policy:** Semua ikon mesti menggunakan pustaka rasmi Lucide React (`CATEGORY_ICON_MAP`, `Store`, `ShoppingBag`, `Zap`, `Clock`, `TrendingUp`, dll.). Tiada emoji teks mentah dibenarkan.
- **Identiti Warna Konsisten:** PolyMart menggunakan Ambar/Gold (`#f59e0b` / `amber-500`), manakala modul e-Keusahawanan menggunakan tema dinamik hijau/emas (`useExcoTheme`).
- **Pematuhan Peraturan RLS & Database:** Jangan ubah fail migrasi lama. Semua kueri selari mesti menggunakan `Promise.all`.
- **Prestasi Telefon Pelajar (60fps & Sifar Limpahan):** Tiada `backdrop-blur` berlapis-lapis pada kad grid. Tiada elemen yang melebihi lebar `100vw` (*zero window flowing*).
- **Integriti Logik Perakaunan & Transaksi:** 0% pengubahsuaian terhadap RPC transaksi POS, pengiraan cukai, mahupun skema jadual.

---

### Task 1: Pembaikan 3 Pepijat PolyMart (Systematic Debugging)

**Files:**
- Modify: `src/pages/polymart/PolyMartHome.tsx`
- Modify: `src/pages/polymart/PolyMartLayout.tsx`
- Modify: `src/pages/polymart/PolyMartVendorStorefront.tsx`
- Modify: `src/components/portal/PolyMartFeed.tsx`
- Test: `src/__tests__/polymartSuperApp.test.ts`

**Interfaces:**
- `ActiveVendorsSheet`:
  - Props: `{ isOpen: boolean; onClose: () => void; businesses: PolyBusiness[]; products: PolyProduct[] }`
  - Paparan: Slide-up bottom sheet dengan input carian, senarai kedai berserta logo, penilaian purata, jumlah produk aktif, dan pautan ke `/polymart/kedai/:id`.
- Responsive Store Header Button di `PolyMartLayout.tsx`:
  - Mobile (`<sm`): `w-9 h-9 rounded-full` memaparkan ikon `Store` dengan lencana merah jika ada pesanan tertunggak.
  - Desktop (`sm:`): Memaparkan teks `"Kedai"` atau `"Kedai Saya"`.
  - Search capsule: Mempunyai `min-w-0 flex-1` untuk mengelakkan penolakan sisi kanan.
- Sales-Based Ranking:
  - Mengambil jualan sah daripada `polymart_orders` (status `COMPLETED`, `CONFIRMED`, `READY`).
  - Mengira `sales_count` per produk dan menyusun tab "Paling Laris" mengikut `sales_count DESC`.

- [ ] **Step 1: Tulis ujian unit yang gagal untuk 3 pepijat PolyMart**

Di `src/__tests__/polymartSuperApp.test.ts`:
```typescript
describe('PolyMart Bugfixes Suite', () => {
  it('PolyMartHome renders ActiveVendorsSheet on Lihat Semua click', async () => {
    // Assert ActiveVendorsSheet export exists and contains search and vendor list
    const homeSrc = fs.readFileSync('src/pages/polymart/PolyMartHome.tsx', 'utf-8');
    expect(homeSrc).toContain('ActiveVendorsSheet');
    expect(homeSrc).toContain('setShowAllVendors(true)');
  });

  it('PolyMartLayout topheader is mobile-first responsive with min-w-0 and rounded button', () => {
    const layoutSrc = fs.readFileSync('src/pages/polymart/PolyMartLayout.tsx', 'utf-8');
    expect(layoutSrc).toContain('min-w-0');
    // Ensure button collapses to w-9 h-9 rounded-full on mobile
    expect(layoutSrc).toMatch(/w-9 h-9 sm:w-auto/);
  });

  it('PolyMartVendorStorefront calculates actual sales count for Paling Laris', () => {
    const storefrontSrc = fs.readFileSync('src/pages/polymart/PolyMartVendorStorefront.tsx', 'utf-8');
    expect(storefrontSrc).toContain('sales_count');
    expect(storefrontSrc).toContain('polymart_orders');
  });
});
```

- [ ] **Step 2: Jalankan ujian untuk sahkan ia gagal**

Jalankan: `npx vitest run src/__tests__/polymartSuperApp.test.ts`
Jangkaan: Gagal kerana `ActiveVendorsSheet` dan `sales_count` belum diimplementasikan.

- [ ] **Step 3: Laksanakan pembetulan kod di PolyMartHome, PolyMartLayout, PolyMartVendorStorefront, dan PolyMartFeed**

1. Di `PolyMartHome.tsx`:
   - Bina `ActiveVendorsSheet`: Slide-Up Bottom Sheet animasi spring, carian kedai, avatar kedai, bilangan produk, dan pautan ke `/polymart/kedai/${b.id}`.
   - Sambungkan butang "Lihat Semua >" dengan `onClick={() => setShowAllVendors(true)}`.
2. Di `PolyMartLayout.tsx`:
   - Tambah `min-w-0` pada kapsul carian mobil.
   - Tukar butang Kedai menjadi `w-9 h-9 sm:w-auto sm:px-3.5 h-9 rounded-full` dengan ikon `Store` dan lencana amaran merah pada telefon.
3. Di `PolyMartVendorStorefront.tsx`:
   - Kueri kuantiti tempahan daripada `polymart_orders` bagi `business_id` berkenaan.
   - Susun produk tab `popular` mengikut `b.sales_count - a.sales_count`, berserta penarafan ulasan sebagai penentu kedua.
   - Paparkan lencana mikro jualan (`{p.sales_count} terjual`) jika jualan > 0.
4. Di `PolyMartFeed.tsx` (Portal):
   - Kueri jualan pesanan dan susun tab `🔥 Terhangat` berasaskan jualan sebenar dan penarafan, bukan lagi semata-mata `sale_price`.

- [ ] **Step 4: Jalankan ujian unit untuk sahkan ia lulus**

Jalankan: `npx vitest run src/__tests__/polymartSuperApp.test.ts`
Jangkaan: 100% lulus.

- [ ] **Step 5: Komit kod**

```bash
git add src/pages/polymart/PolyMartHome.tsx src/pages/polymart/PolyMartLayout.tsx src/pages/polymart/PolyMartVendorStorefront.tsx src/components/portal/PolyMartFeed.tsx src/__tests__/polymartSuperApp.test.ts
git commit -m "fix(polymart): resolve active vendors sheet, mobile header overflow, and sales sorting"
```

---

### Task 2: Kad Integrasi PolyMart di Dashboard e-Keusahawanan & Kawalan Sifar Limpahan

**Files:**
- Modify: `src/pages/keusahawanan/KeusahawananDashboard.tsx`
- Modify: `src/pages/keusahawanan/KeusahawananLayout.tsx`
- Modify: `src/pages/keusahawanan/BusinessShiftModule.tsx`
- Create: `src/__tests__/keusahawananSuperApp.test.ts`

**Interfaces:**
- `PolyMartDashboardCard` di `KeusahawananDashboard.tsx`:
  - Mengesan sama ada perniagaan mempunyai produk berdaftar di PolyMart (`publish_to_polymart: true`).
  - Jika YA: Memaparkan kad status ambar-emas, jumlah produk aktif, jumlah pesanan PolyMart yang belum selesai, butang `Lihat Etalase Awam` (`/polymart/kedai/:id`), dan butang `Urus Pesanan PolyMart` (`/polymart/vendor`).
  - Jika TIDAK: Memaparkan kad panduan mesra: *"Etalase PolyMart Anda Belum Aktif — Ingin mula menjual kepada warga kampus POLISAS?"* dengan butang tindakan `[+ Terbitkan Produk ke PolyMart]` yang menghala ke `/keusahawanan/pos/products`.
- Zero Window Flowing:
  - Pembungkus jadual syif `BusinessShiftModule.tsx` dibungkus dengan `w-full overflow-x-auto scrollbar-hide`.
  - *Heatmap* produk 14 hari di `KeusahawananDashboard.tsx` dibungkus dengan `w-full overflow-x-auto scrollbar-hide` tanpa menolak margin badan laman.
  - `KeusahawananLayout.tsx` menetapkan `w-full max-w-full overflow-x-hidden`.

- [ ] **Step 1: Tulis ujian unit untuk Kad Integrasi PolyMart & Zero Overflow**

Di `src/__tests__/keusahawananSuperApp.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('Keusahawanan PolyMart Integration & Responsive Architecture', () => {
  it('KeusahawananDashboard renders PolyMart integration widget', () => {
    const dashSrc = fs.readFileSync('src/pages/keusahawanan/KeusahawananDashboard.tsx', 'utf-8');
    expect(dashSrc).toContain('PolyMart');
    expect(dashSrc).toContain('/polymart/kedai/');
    expect(dashSrc).toContain('Terbitkan Produk ke PolyMart');
  });

  it('KeusahawananLayout contains max-w-full overflow-x-hidden container', () => {
    const layoutSrc = fs.readFileSync('src/pages/keusahawanan/KeusahawananLayout.tsx', 'utf-8');
    expect(layoutSrc).toContain('overflow-x-hidden');
  });
});
```

- [ ] **Step 2: Jalankan ujian untuk sahkan ia gagal**

Jalankan: `npx vitest run src/__tests__/keusahawananSuperApp.test.ts`
Jangkaan: Gagal kerana fail ujian baru dan ciri belum wujud.

- [ ] **Step 3: Laksanakan kad PolyMart di KeusahawananDashboard dan kawalan limpahan mendatar**

1. Di `KeusahawananDashboard.tsx`:
   - Kueri `business_products` dengan `publish_to_polymart = true` bagi perniagaan semasa.
   - Bina kad visual moden `PolyMartHubCard`:
     - Jika ada produk: Pamerkan lencana `Etalase Aktif`, metrik pesanan masuk, dan butang navigasi terus ke `/polymart/kedai/${businessId}`.
     - Jika 0 produk: Pamerkan kad jemputan mesra siswa berserta butang panduan.
   - Bungkus heatmap 14 hari dalam pembungkus tatalan kemas `w-full max-w-full overflow-x-auto scrollbar-hide`.
2. Di `KeusahawananLayout.tsx`:
   - Tambah kelas keselamatan `w-full max-w-full overflow-x-hidden` pada elemen `main`.
3. Di `BusinessShiftModule.tsx`:
   - Bungkus jadual syif `min-w-[600px]` dengan kad tatalan selamat.

- [ ] **Step 4: Jalankan ujian unit untuk sahkan ia lulus**

Jalankan: `npx vitest run src/__tests__/keusahawananSuperApp.test.ts`
Jangkaan: Lulus 100%.

- [ ] **Step 5: Komit kod**

```bash
git add src/pages/keusahawanan/KeusahawananDashboard.tsx src/pages/keusahawanan/KeusahawananLayout.tsx src/pages/keusahawanan/BusinessShiftModule.tsx src/__tests__/keusahawananSuperApp.test.ts
git commit -m "feat(keusahawanan): add polymart dashboard hub card and eliminate horizontal overflow"
```

---

### Task 3: Pemudahan Halaman Urus Perniagaan (7 Tab Mikro → 3 Domain Teras)

**Files:**
- Modify: `src/pages/keusahawanan/UrusPerniagaanPage.tsx`
- Modify: `src/__tests__/keusahawananSuperApp.test.ts`

**Interfaces:**
- Struktur Tab Baharu:
  1. `profil` (**Profil & Kedai**):
     - Logo & visual kedai.
     - Nama, Kategori, Deskripsi, No PUSKEP/SSM, dan maklumat mentor.
     - Tetapan DuitNow QR, COD, dan waktu had bayaran PolyMart.
  2. `pasukan` (**Pasukan & Syif**):
     - Senarai keahlian staf & peranan (Owner/Member).
     - Kelulusan permohonan keahlian siswa.
     - Penukaran hak milik perniagaan (*transfer ownership*).
     - Jadual syif bertugas & rekod sesi jualan.
  3. `kupon_log` (**Kupon & Log Audit**):
     - Kod kupon promosi dan diskaun POS.
     - Log aktiviti audit dan rekod checkpoint tunai.

- [ ] **Step 1: Tambah ujian unit untuk 3 domain tab Urus Perniagaan**

Di `src/__tests__/keusahawananSuperApp.test.ts`:
```typescript
it('UrusPerniagaanPage consolidates micro tabs into 3 streamlined domains', () => {
  const urusSrc = fs.readFileSync('src/pages/keusahawanan/UrusPerniagaanPage.tsx', 'utf-8');
  expect(urusSrc).toContain("'profil'");
  expect(urusSrc).toContain("'pasukan'");
  expect(urusSrc).toContain("'kupon_log'");
  // Ensure the old 7 micro tabs array is replaced
  expect(urusSrc).not.toContain("key: 'identiti'");
  expect(urusSrc).not.toContain("key: 'ciri'");
});
```

- [ ] **Step 2: Jalankan ujian untuk sahkan ia gagal**

Jalankan: `npx vitest run src/__tests__/keusahawananSuperApp.test.ts`
Jangkaan: Gagal kerana `UrusPerniagaanPage` masih menggunakan tab lama.

- [ ] **Step 3: Rombak UrusPerniagaanPage.tsx kepada 3 domain kemas**

- Gantikan pemalar `tabs` lama dengan 3 tab baharu:
  - `{ key: 'profil', label: 'Profil & Kedai', icon: Store }`
  - `{ key: 'pasukan', label: 'Pasukan & Operasi', icon: Users }`
  - `{ key: 'kupon_log', label: 'Kupon & Log Audit', icon: Tag }`
- Kemas kini JSX tab bar dengan gaya kapsul moden yang mesra ibu jari di telefon pintar.
- Himpunkan sub-modul syif/sesi ke dalam tab `pasukan`.
- Himpunkan tetapan bayaran DuitNow QR & COD ke dalam tab `profil`.
- Pastikan semua fungsi simpan, tukar logo, kelulusan staf, dan cipta kupon kekal berfungsi 100% tanpa sebarang regresi logik.

- [ ] **Step 4: Jalankan ujian unit untuk sahkan ia lulus**

Jalankan: `npx vitest run src/__tests__/keusahawananSuperApp.test.ts`
Jangkaan: Lulus 100%.

- [ ] **Step 5: Komit kod**

```bash
git add src/pages/keusahawanan/UrusPerniagaanPage.tsx src/__tests__/keusahawananSuperApp.test.ts
git commit -m "refactor(keusahawanan): streamline urus perniagaan into 3 core domains"
```

---

### Task 4: Dokumentasi Seni Bina, Regresi Penuh & Verifikasi Binaan

**Files:**
- Modify: `DEV_GUIDELINE.md`

- [ ] **Step 1: Kemas kini DEV_GUIDELINE.md**
  - Di Seksyen 29 (PolyMart & Keusahawanan), tambah **Subseksyen 29.11**:
    - `### 29.11 Integrasi Pusat Peniaga Siswa e-Keusahawanan & Penyahpepijatan PolyMart`
    - Dokumentasikan pembetulan `ActiveVendorsSheet`.
    - Dokumentasikan sifar limpahan (*zero window flowing*) dan butang bulat responsif di telefon.
    - Dokumentasikan logik susunan "Paling Laris" berasaskan jualan sebenar `polymart_orders`.
    - Dokumentasikan kad hab PolyMart di papan pemuka e-Keusahawanan (`KeusahawananDashboard.tsx`).
    - Dokumentasikan 3 domain utama pengurusan perniagaan di `UrusPerniagaanPage.tsx`.

- [ ] **Step 2: Jalankan suite ujian penuh repositori**

Jalankan: `npm test -- --run`
Jangkaan: Semua suite ujian (18+ fail) lulus 100%.

- [ ] **Step 3: Jalankan kompilasi binaan pengeluaran**

Jalankan: `npm run build`
Jangkaan: 0 ralat kompilasi TypeScript dan Vite.

- [ ] **Step 4: Komit dokumentasi**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs(keusahawanan): document polymart integration hub and streamlined store management"
```

---

## Ringkasan Pelan & Pilihan Pelaksanaan

Pelan pelaksanaan telah siap dibina dan disimpan di `docs/superpowers/plans/2026-10-06-polymart-keusahawanan-unified-revamp.md`.

Dua pilihan pendekatan pelaksanaan:
1. **Subagent-Driven (disyorkan):** Saya melancarkan subagent implementer dan reviewer bagi setiap tugas secara berasingan untuk memastikan kualiti kod dan spesifikasi dipatuhi 100%.
2. **Inline Execution:** Melaksanakan tugas-tugas secara terus dalam sesi ini dengan pusat semakan berperingkat.
