# Spesifikasi Reka Bentuk: Naik Taraf Hab Peniaga PolyMart SuperApp (`/polymart/vendor`)

**Tarikh:** 2026-10-06  
**Status:** Draf Cadangan (Menunggu Semakan Akhir)  
**Pengarang:** Antigravity AI & Pasukan Pembangunan SuperApp POLISAS  

---

## 1. Pengenalan & Latar Belakang

Modul **PolyMart** kini merupakan sebahagian penting daripada platform SuperApp Kampus POLISAS. Walau bagaimanapun, halaman konsol peniaga semasa di [`src/pages/polymart/PolyMartVendorDashboard.tsx`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/pages/polymart/PolyMartVendorDashboard.tsx) mengandungi lebih 3,550 baris kod yang menggabungkan pelbagai lapisan tab bersarang (*nested tabs 3-layer*), panel graf yang memakan ruang skrin telefon, bar navigasi bawah terapung dengan butang merah berkedip yang mengelirukan, dan halangan pemilihan kedai (*"Pilih Kedai Terlebih Dahulu"*) yang menyukarkan peniaga siswa.

Naik taraf ini menstrukturkan semula `/polymart/vendor` kepada **Hab Peniaga SuperApp 3-Domain** yang bersih, pantas, berasaskan sentuhan (*mobile-first*), serta mematuhi prinsip anti-kecondongan reka bentuk (*anti-slop*) dan garis panduan sistem e-Keusahawanan.

---

## 2. Prinsip & Parameter Reka Bentuk (`design-taste-frontend`)

* **Design Read:** Merchant Console & Hub Peniaga Siswa bertaraf SuperApp, berteraskan bahasa visual *Obsidian-Amber* (`#f59e0b`), dengan hierarki 3-Domain bersih, kawalan sentuhan ergonomik (*mobile-first*), sifar kekusutan navigasi, dan penyingkiran bar terapung yang mengelirukan.
* **Tetapan Dail (`The Three Dials`):**
  * `DESIGN_VARIANCE: 6` (Kemas, berstruktur, profesional ala platform e-dagang moden)
  * `MOTION_INTENSITY: 4` (Peralihan mikro berhemah, slaid helaian bawah berasaskan spring, tanpa animasi berulang yang membebankan peranti)
  * `VISUAL_DENSITY: 5` (Maklumat padat tetapi bernafas; kad bernombor jelas tanpa timbunan kad dalam kad)
* **Warna Tema Utama:** Obsidian-Amber (`#f59e0b` / `amber-500` & `amber-600`), neutral gelap (*slate-900 / zinc-950*) dan latar belakang terang bersih (*white / zinc-100*).
* **Disiplin Ikon:** 100% ikon vektor Lucide rasmi (sifar emoji mentah).
* **Prestasi 60fps Telefon Siswa:** Tiada penggunaan kesan *backdrop-blur* tebal berulang pada setiap kad pesanan dalam senarai panjang; menggunakan sempadan garis halus (*hairline border*) `border-border/60`.

---

## 3. Seni Bina 3-Domain Baharu

Struktur hierarki tab bersarang yang lapuk digantikan dengan 3 domain bertumpu:

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Status Kedai (Buka/Tutup) + Smart Store Selector   │
│  4 STAT CARDS (Pesanan Hari Ini, Menunggu, Aktif, Selesai)   │
├─────────────────────────────────────────────────────────────┤
│  STICKY TOP SEGMENTED TAB BAR (3 Domain Utama)              │
│  [ 🛍️ Pesanan Masuk ]  [ 📦 Katalog & Stok ]  [ 📈 Prestasi ]│
└─────────────────────────────────────────────────────────────┘
                               │
       ┌───────────────────────┼──────────────────────┐
       ▼                       ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  DOMAIN 1:   │       │  DOMAIN 2:   │       │  DOMAIN 3:   │
│Pesanan Masuk │       │Katalog & Stok│       │  Prestasi &  │
│(Action-First)│       │    Pantas    │       │   Promosi    │
└──────────────┘       └──────────────┘       └──────────────┘
```

### Domain 1: Pesanan Masuk (*Action-First Order Pipeline*)
* **3 Saluran Status Pintar:**
  1. **`actions` (Tindakan Diperlukan):** Menggabungkan pesanan yang menunggu pengesahan peniaga dan semakan resit bayaran QR Online. Dilengkapi lencana merah/amber berbilang.
  2. **`processing` (Sedang Disediakan):** Pesanan disahkan yang sedang dimasak/dibungkus. Memaparkan butang satu klik `[Siap Diambil]` dan pautan WhatsApp / Chat pembeli.
  3. **`completed` (Selesai & Arkib):** Senarai pesanan selesai dan dibatalkan dengan bar carian segera (ID pesanan, nama pembeli, no. matrik).
* **Slide-Up Bottom Sheet Semakan Resit (`ReceiptReviewSheet`):**
  * Menggantikan pop-up modal kotak desktop lama.
  * Memaparkan imej resit dengan kawalan zoom, butiran bayaran pembeli, dan dua butang tindakan mudah dicapai ibu jari: `[Tolak Resit]` dan `[Sahkan Bayaran]`.
* **Sokongan Tindakan Pukal (*Bulk Actions*):**
  * Memudahkan peniaga yang menerima puluhan pesanan pada waktu puncak untuk mengesahkan resit atau menanda "Siap Diambil" secara pukal dengan pilihan kotak semak.

### Domain 2: Katalog & Stok Pantas
* **Penyelesaian Isu "Pilih Kedai Terlebih Dahulu":**
  * Jika peniaga mempunyai 1 kedai, sistem secara automatik memilih kedai tersebut (`myBusinesses[0].id`). Paparan amaran yang menghalang skrin dihapuskan 100%.
  * Jika mempunyai pelbagai kedai, sistem memilih kedai pertama secara lalai dan memaparkan kapsul penukar kedai yang kemas di bahagian atas.
* **Kad Produk Ringan & Responsif:**
  * Togol ketersediaan segera (*Tersedia untuk Pelanggan* vs *Tutup Jualan*).
  * Pengubah stok fizikal pantas (+ / - / input) bagi produk biasa dan variasi (saiz/warna).
* **Integrasi e-Keusahawanan POS:**
  * Butang tindakan jelas `[+ Tambah / Urus Penuh di POS]` menghubungkan peniaga terus ke pengurusan inventori penuh di `/keusahawanan/pos/products`.

### Domain 3: Prestasi & Promosi
* **Pemindahan Panel Analitik Berat:**
  * Mengalihkan graf jualan Recharts 7-hari (*Daily Pre-Order Trend*) dan amaran inventori rendah dari skrin utama ke domain ini, membebaskan ruang tatalan untuk pesanan harian.
* **Integrasi Iklan Promo PolyMart:**
  * Tab permohonan banner promosi dimasukkan ke dalam domain ini dengan antara muka borang muat naik banner yang anggun dan status kelulusan Exco (DRAFT / APPROVED / REJECTED).

---

## 4. Penambahbaikan Ergonomik & Navigasi Mudah Alih

1. **Penyingkiran Bar Terapung Bawah Lama:**
   * Bar terapung mudah alih dengan butang merah berkedip dihapuskan sepenuhnya.
   * Digantikan dengan **Sticky Top Navigation** di bahagian atas yang tidak menghalang tatalan kad pesanan mahupun butang tindakan di bahagian bawah skrin.
2. **Kapsul Status Kedai Pintar:**
   * Memaparkan status siaran kedai (*Buka / Tutup*) dengan togol selamat yang mengelakkan peniaga menerima pesanan semasa cuti atau kehabisan bahan mentah.
3. **Penyelarasan Warna & Tipografi:**
   * Mematuhi tema Obsidian-Amber (`#f59e0b`).
   * Menyelaraskan teks salinan WhatsApp dinamik supaya sentiasa profesional, mesra pelajar, dan mengandungi butiran nombor pesanan serta arahan lokasi pengambilan.

---

## 5. Keselamatan Data & Integriti Logik Perniagaan

* **0% Pengubahsuaian Skema Pangkalan Data:** Semua jadual (`polymart_orders`, `business_products`, `businesses`, `polymart_ads`) dan fungsi RPC (`complete_polymart_order`, `release_polymart_stock`) kekal 100% utuh.
* **Kekalkan Mod Pembangunan (Mock Mode):** Mod simulasi data tempatan (`use_mock_auth`) dikekalkan supaya pembangun boleh menguji tanpa memerlukan pangkalan data langsung.
* **Pematuhan Peraturan Hooks React (Rule of Hooks):** Semua cangkuk (*hooks*) dipanggil tanpa syarat di bahagian atas komponen utama.

---

## 6. Pelan Pengesahan & Ujian

1. **Ujian Unit (Vitest):**
   * Ujian penyingkiran bar terapung butang merah berkedip.
   * Ujian integrasi 3-domain (`actions`, `products`, `analytics`).
   * Ujian pemilihan automatik kedai tunggal tanpa sekatan skrin.
   * Ujian pematuhan sifar emoji mentah.
2. **Binaan Pengeluaran:**
   * Menjalankan `npm run build` bagi memastikan 0 ralat kompilasi TypeScript dan bundler Vite.
3. **Dokumentasi:**
   * Mengemaskini [`DEV_GUIDELINE.md`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/DEV_GUIDELINE.md) Seksyen 29 dengan butiran seni bina Hab Peniaga SuperApp.
