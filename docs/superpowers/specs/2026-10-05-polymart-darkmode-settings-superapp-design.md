# Spesifikasi Reka Bentuk: Super App Convergence — PolyMart Routing, OLED Dark Mode & Hab Tetapan

**Tarikh:** 2026-10-05  
**Cawangan:** `feat/campus-super-app-portal`  
**Status:** DILULUSKAN (Approved by User)  
**Keutamaan Utama:** Mobile-Friendly & Dioptimumkan untuk Peranti Rendah (*Low-End Device Performance*)

---

## 1. Latar Belakang & Matlamat

Pengguna telah mengenal pasti 3 jurang fungsian dan estetika utama di dalam ekosistem Portal JPP POLISAS:
1. **PolyMart Siswa Routing & Sorting:**
   - Jubin PolyMart di Grid Servis dan kad suapan di muka hadapan portal membawa pengguna ke `/keusahawanan/dashboard` (papan pemuka pentadbiran perniagaan), bukannya pasaran pengguna sebenar iaitu `/polymart` dan `/polymart/produk/:id`.
   - Suapan PolyMart Siswa memerlukan butang penapis pintar (*Chip Tabs*) antara produk "🔥 Terhangat" dan "✨ Terkini".
2. **Estetika Mod Gelap (Dark Mode) Portal:**
   - Dalam mod gelap, portal kelihatan mendatar, kusam (*muddy slate*), dan tidak mempunyai aura kedalaman atau kilauan kaca seperti mod terang.
   - Diperlukan pendekatan "OLED Glass Aura" (berinspirasikan Apple & Linear) dengan pencahayaan rim-light pada jubin servis dan latar belakang aura zamrud halus tanpa membebankan GPU peranti bajet.
3. **Transformasi Hab Tetapan (`/tetapan`):**
   - Halaman `/tetapan` sedia ada menggunakan susun atur Vercel-style desktop yang lapuk dengan menu *dropdown select* yang kaku di telefon pintar.
   - Mengandungi tab lapuk "Langganan / Billing (Nexus AI)" yang tidak berkaitan dengan mahasiswa.
   - Perlu dirombak menjadi **Hab Profil & Tetapan Super App (Gaya iOS/Grab)** dengan Kad Identiti Pelajar di atas, bar tab kapsul mudah leret, dan struktur tetapan yang selaras dengan seluruh modul Super App.

---

## 2. Prinsip Prestasi Peranti Rendah (*Low-End Performance Directives*)

Memandangkan sistem menyokong sehingga 1,500 pengguna serentak termasuk peranti bajet Android:
1. **CSS GPU Acceleration Berdisiplin:** Guna `transform-gpu` pada elemen bergerak, elakkan lapisan `backdrop-blur` bertingkat yang tebal (gunakan `backdrop-blur-md` dengan `bg-slate-900/80` legap sederhana).
2. **Kueri Data Berpusat:** Gunakan `Promise.all` tunggal bagi sebarang pengambilan data serentak. Tiada kueri di dalam gelung (*no N+1 loop queries*).
3. **Imej & Aset Cekap:** Semua imej produk dan avatar menggunakan `loading="lazy"` dan dimensi tetap untuk mengelakkan *Cumulative Layout Shift* (CLS).
4. **Ergonomik Sentuhan Mobile (360px+):**
   - Sasaran sentuhan (*touch targets*) minimum 44px × 44px.
   - Tiada limpahan mendatar (*zero horizontal overflow*) dengan penggunaan kelas `-mx-4 px-4 sm:mx-0 sm:px-0` pada trek leretan.
   - Ruang kelegaan dok navigasi bawah (`pb-36` + `after:h-28`) di semua halaman.

---

## 3. Seni Bina & Perincian Modul

### 3.1 Bahagian 1: Pembaikan Routing & Suapan PolyMart Siswa

#### A. Penyelarasan Laluan (Routing)
- **`src/lib/superAppHelpers.ts` (`getCampusServicesConfig`):**
  - Ubah item `polymart`:
    ```ts
    {
      id: 'polymart',
      label: 'PolyMart',
      sublabel: 'Pasaran Siswa',
      description: 'Pasaran Siswa',
      routeOrAction: '/polymart', // SEBELUM INI: /keusahawanan/dashboard
      color: 'amber',
    }
    ```
- **`src/components/portal/PolyMartFeed.tsx`:**
  - Klik kad produk (`handleCardClick(productId)`): Navigasi terus ke `/polymart/produk/${productId}`.
  - Klik "Buka Mart" (`handleOpenMart`): Navigasi ke `/polymart`.

#### B. Cip Penapis Mini (Chip Tabs)
- Tambah state `activeFilter: 'hot' | 'latest'` (lalai: `'hot'`).
- Dua butang penapis padat di header suapan:
  - **🔥 Terhangat:** Mengambil produk yang mempunyai rating/jualan tertinggi atau pesanan terbanyak.
  - **✨ Terkini:** Mengambil produk mengikut `created_at DESC`.
- Transisi antara tab menggunakan peralihan ringan tanpa render ulang halaman penuh.

---

### 3.2 Bahagian 2: Estetika "OLED Glass Aura" untuk Dark Mode

#### A. Latar Belakang Ambient Mesh
- Dalam `src/pages/PortalPage.tsx`, tambahkan lapisan latar aura gelap:
  ```tsx
  <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden hidden dark:block">
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/[0.04] blur-[120px] rounded-full" />
    <div className="absolute top-3/4 left-1/3 w-[500px] h-[300px] bg-indigo-500/[0.03] blur-[140px] rounded-full" />
  </div>
  ```
  *(Penggunaan blur luas dengan kelegapan rendah menjimatkan penggunaan GPU pada telefon bajet)*.

#### B. Jubin Servis 8-Ikon Bercahaya (`CampusServicesGrid.tsx`)
- Tingkatkan kontras jubin dalam mod gelap:
  - Bekas ikon: `dark:bg-white/[0.06] dark:border-white/10 dark:hover:border-emerald-400/40 dark:shadow-[0_2px_12px_rgba(0,0,0,0.5)]`.
  - Warna ikon pekat neon-pastel:
    - PolySuara: `text-rose-500 dark:text-rose-400`
    - PolyMart: `text-amber-500 dark:text-amber-400`
    - Takwim: `text-indigo-500 dark:text-indigo-400`
    - PolyMaps: `text-emerald-500 dark:text-emerald-400`
    - PolyRent: `text-cyan-500 dark:text-cyan-400`
    - E-Kebajikan: `text-teal-500 dark:text-teal-400`
    - Scan QR: `text-purple-500 dark:text-purple-400`
    - Kelab EKPP: `text-blue-500 dark:text-blue-400`

#### C. Kad Frosted Kaca Gelap (`PolyMartFeed.tsx` & `EmsEventsFeed.tsx`)
- Kad produk dan acara menerima penggayaan kaca gelap:
  - `dark:bg-slate-900/70 dark:border-white/[0.08] dark:hover:border-amber-500/40 dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]`.

---

### 3.3 Bahagian 3: Rombakan Hab Profil & Tetapan `/tetapan`

#### A. Komponen Utama & Struktur Halaman
`src/pages/SettingsPage.tsx` dirombak secara menyeluruh:

1. **Kad Identiti Profil Pelajar (Hero Profile Card):**
   - Kad kaca moden di bahagian atas:
     - Avatar pelajar bersaiz besar dengan lencana kamera untuk muat naik foto profil segera.
     - Nama Penuh & Nombor Matrik rasmi.
     - Lencana Peranan Berdisiplin (`PENTADBIR UTAMA`, `MAJLIS JPP`, `SISWA POLISAS`).
     - **Jalur Ringkasan Status Pintar (*Live Status Strip*):**
       - 🎓 **Semester:** Nilai semester semasa (contoh: `Semester 4`).
       - ⭐ **Mata Merit:** Baki mata merit semasa yang diambil dari data akademik.
       - 🏠 **Kediaman:** `KAMSIS` (dengan nama blok jika ada) atau `RUMAH SEWA (LUAR)`.

2. **Navigasi Kapsul Segmented (Mobile-Friendly Pill Bar):**
   - Bar tab mendatar boleh tatal (`flex gap-2 overflow-x-auto scrollbar-none pb-2`) dengan sasaran sentuhan selesa:
     - 👤 **Profil:** Maklumat peribadi, nombor telefon, e-mel, dan borang rasmi `profile_edit_requests` bagi memohon pindaan no matrik/semester kepada JPP.
     - 🏠 **Kediaman:** Pengisytiharan status kediaman KLK, pemilihan kawasan, dan maklumat alamat rumah sewa.
     - 🎨 **Tema & Paparan:** Pemilih tema visual intuitif (Cerah ☀️ / Gelap 🌙 / Sistem 💻) dengan kad pratonton interaktif.
     - 🔔 **Notifikasi:** Pilihan suis makluman sistem (pesanan PolyMart, tiket E-Kebajikan, acara EMS).
     - 🛡️ **Keselamatan:** Tukar kata laluan Supabase dan butang Log Keluar merah berprestij.
     - ❓ **Bantuan:** Pemicu semula Tutorial Sistem Portal (Joyride) dan pautan pantas hubungi Majlis JPP.
   - *Tab 'Langganan / Billing' lama dibuang sepenuhnya.*

3. **Keserasian Ke Belakang (Backward Compatibility):**
   - Tetap menyokong parameter URL query `?tab=general` (dipetakan ke `profil`), `?tab=kediaman`, `?tab=notifications`, `?tab=security`, dan `?tab=help` supaya tiada pautan sedia ada yang rosak.

---

## 4. Pelan Pengujian & Verifikasi Kualiti (TDD)

1. **Ujian Unit Vitest (`src/__tests__/superAppPortal.test.ts` & `src/__tests__/settingsPage.test.ts`):**
   - Semak fungsi `getCampusServicesConfig` memastikan servis `polymart` mempunyai `routeOrAction: '/polymart'`.
   - Semak komponen `PolyMartFeed` menerima penapis `hot` dan `latest`.
   - Semak halaman `SettingsPage` mengeksport komponen dengan betul dan menyokong tab `profil`, `kediaman`, `tema`, `notifikasi`, `keselamatan`, `bantuan`.
2. **Kompilasi Pengeluaran (`npm run build`):**
   - Memastikan sifar ralat TypeScript, tiada isu pembolehubah tidak digunakan, dan Service Worker PWA dijana sempurna.
3. **Ujian Responsif Skrin Mudah Alih:**
   - Ujian paparan pada saiz skrin 360px, 390px, 412px, dan 768px (tiada *horizontal scroll bar* yang tidak diingini).
