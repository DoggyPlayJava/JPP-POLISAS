# Spesifikasi Reka Bentuk: Rombakan Pembaikan PolyMart & Penyatuan Pusat Peniaga e-Keusahawanan

**Tarikh:** 2026-10-06  
**Status:** DRAF UNTUK KELULUSAN  
**Cawangan Git:** `feat/polymart-keusahawanan-unified-revamp`  
**Rujukan:** `/systematic-debugging`, `/design-taste-frontend`, `/brainstorming`, `/grill-me`

---

## 1. Ringkasan Eksekutif & Objektif

Sistem PolyMart dan modul e-Keusahawanan berkongsi pangkalan data yang sama (`keusahawanan_businesses`, `business_products`, `polymart_orders`), namun buat masa ini wujud jurang pengalaman pengguna (UX) yang ketara:
1. **3 Pepijat Aktif di PolyMart:**
   - Butang **"Lihat Semua >"** pada seksyen *Peniaga Aktif* di `PolyMartHome.tsx` tidak mempunyai sebarang pengendali `onClick` dan tidak bertindak balas.
   - **Header Atas Limpah (*Overflowing*):** Pada skrin telefon pintar (<380px), gabungan butang Kembali, Logo, Kapsul Carian, dan Butang Kedai menyebabkan butang "Kedai" terpotong separuh di sebelah kanan.
   - **Susunan "Paling Laris" / "Terhangat" Sama dengan "Terbaru":** Ketiadaan data ulasan pada kedai baharu menyebabkan formula penarafan menghasilkan skor 0 untuk semua produk, menjadikan susunan tidak berubah. Di Portal pula, penapis terhangat hanya menyemak kewujudan harga promosi.
2. **Kekeliruan Peniaga Siswa di e-Keusahawanan:**
   - Pelajar keliru mencari di mana pesanan PolyMart dipaparkan dan bagaimana menguruskan kedai.
   - Halaman `/keusahawanan/urus-perniagaan` terlalu berserabut dengan 7 tab mikro (`identiti`, `staff`, `pos`, `ciri`, `syif`, `sesi`, `log`).
   - Ketiadaan kad pautan langsung PolyMart di papan pemuka utama `/keusahawanan/dashboard` menyebabkan pelajar tidak menyedari status produk mereka di pasaran kampus.
   - Wujud beberapa halaman e-keusahawanan yang mengalami limpahan mendatar (*window/horizontal flowing*), merosakkan pengalaman mudah alih.

---

## 2. Milestone 1: Pembaikan 3 Pepijat PolyMart (Systematic Debugging)

### 2.1 Butang "Lihat Semua >" → `ActiveVendorsSheet`
- **Lokasi Fail:** [`src/pages/polymart/PolyMartHome.tsx`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/pages/polymart/PolyMartHome.tsx)
- **Komponen Baharu:** `ActiveVendorsSheet`
- **Kelakuan & Reka Bentuk:**
  - Menekan "Lihat Semua >" akan membuka helaian bawah bergerak naik (*Slide-Up Bottom Sheet* ala TikTok Shop / Shopee).
  - Dilengkapi bar carian pantas peniaga siswa.
  - Memaparkan kad kedai tersusun: logo/avatar squircle, lencana verifikasi `Peniaga Siswa Sah POLISAS`, kategori jualan, penarafan bintang, jumlah produk aktif, dan butang tindakan pantas `Lawati Kedai` yang menghala ke `/polymart/kedai/:id`.
  - Animasi spring lancar, penguncian tatalan badan (*body scroll lock*), dan pemegang heret (*drag handle*).

### 2.2 Top Header Responsif Sifar-Limpahan (*Zero-Overflow Header*)
- **Lokasi Fail:** [`src/pages/polymart/PolyMartLayout.tsx`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/pages/polymart/PolyMartLayout.tsx)
- **Perubahan Reka Bentuk:**
  1. Tambah `min-w-0` pada kapsul carian `flex-1 items-center ...` supaya ia dapat mengecut secara anjal pada skrin kecil (360px - 380px) tanpa menolak elemen lain ke luar skrin.
  2. Tukar butang kanan `tour-polymart-vendor` kepada butang bulat responsif:
     - Di skrin mudah alih (`<sm`): Butang bulat kemas `w-9 h-9 rounded-full` dengan ikon `Store` ambar dan lencana amaran merah kecil jika terdapat pesanan baharu yang menunggu kelulusan (`pendingVendorCount > 0`).
     - Di skrin tablet/desktop (`sm:` ke atas): Mengembang secara anggun memaparkan ikon + teks `"Kedai"` atau `"Kedai Saya"`.
  3. Memastikan tiada sebarang elemen melebihi 100vw pada paparan mudah alih.

### 2.3 Susunan Jualan Sebenar "Paling Laris" & Lencana Terjual
- **Lokasi Fail:** 
  - [`src/pages/polymart/PolyMartVendorStorefront.tsx`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/pages/polymart/PolyMartVendorStorefront.tsx)
  - [`src/pages/polymart/PolyMartHome.tsx`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/pages/polymart/PolyMartHome.tsx)
  - [`src/components/portal/PolyMartFeed.tsx`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/components/portal/PolyMartFeed.tsx)
- **Logik Susunan (*Sorting Algorithm*):**
  1. Mengambil data pesanan selesai/sah daripada `polymart_orders` (status `COMPLETED`, `CONFIRMED`, `READY`) untuk mengira kuantiti unit terjual (`sales_count`) per produk.
  2. Tab **Paling Laris**:
     - *Kriteria Utama:* Susun mengikut `sales_count` menurun.
     - *Kriteria Sekunder (jika seri/0 jualan):* Susun mengikut penarafan purata bintang (`avg_rating`) dan jumlah ulasan (`review_count`).
     - *Kriteria Ketiga:* Tarikh terbaharu (`created_at DESC`).
  3. **Lencana Jualan Mikro:** Jika produk mempunyai rekod jualan (>0), paparkan lencana mikro kemas `<TrendingUp className="w-3 h-3 text-amber-500" /> {p.sales_count} terjual` pada kad produk.
  4. **Di Portal (`PolyMartFeed.tsx`):** Penapis `🔥 Terhangat` kini menyusun produk berasaskan `sales_count` dan penarafan, bukan lagi bergantung semata-mata pada `sale_price`.

---

## 3. Milestone 2: Kad Integrasi PolyMart di e-Keusahawanan Dashboard

- **Lokasi Fail:** [`src/pages/keusahawanan/KeusahawananDashboard.tsx`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/pages/keusahawanan/KeusahawananDashboard.tsx)
- **Ciri-Ciri Kad PolyMart Peniaga:**
  1. **Jika Peniaga Mempunyai Produk Aktif di PolyMart:**
     - Kad berprestij Obsidian-Amber memaparkan:
       - Status etalase: `Etalase Aktif di PolyMart` (Lencana hijau berdenyut).
       - Statistik langsung: Jumlah produk diterbitkan, jumlah pesanan PolyMart masuk, dan penilaian purata.
       - Butang tindakan berkembar:
         - `Lihat Etalase Awam` → Navigasi ke `/polymart/kedai/:id`.
         - `Urus Pesanan Online` → Navigasi ke `/polymart/vendor`.
  2. **Jika Peniaga Belum Mempunyai Produk Aktif di PolyMart (Keadaan Kosong Mesra Pelajar):**
     - Kad jemputan mesra usahawan siswa:
       - Ikon squircle ambar dengan `ShoppingBag` / `Store`.
       - Tajuk: *"Etalase PolyMart Anda Belum Aktif"*
       - Mesej panduan: *"Anda belum mempunyai produk yang diterbitkan ke PolyMart. Mula jual produk anda kepada 1,500+ mahasiswa POLISAS secara dalam talian!"*
       - Butang tindakan utama: `[+ Terbitkan Produk ke PolyMart]` yang menghala terus ke `/keusahawanan/pos/products`.

---

## 4. Milestone 3: Pemudahan Halaman `/keusahawanan/urus-perniagaan`

- **Lokasi Fail:** [`src/pages/keusahawanan/UrusPerniagaanPage.tsx`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/pages/keusahawanan/UrusPerniagaanPage.tsx)
- **Penyatuan 7 Tab Mikro kepada 3 Domain Teras:**
  1. **Tab 1: Profil & Kedai (*Store Identity & Settings*)**
     - Logo & nama perniagaan, kategori, dan deskripsi.
     - Status pendaftaran (PUSKEP / SSM / EMS) & maklumat mentor.
     - Tetapan PolyMart & Pembayaran (DuitNow QR Online, COD, waktu had bayaran, nombor WhatsApp).
  2. **Tab 2: Pasukan & Syif (*Team & Operations*)**
     - Pengurusan staf dan kelulusan permohonan keahlian siswa.
     - Penukaran pemilikan perniagaan (*transfer ownership*).
     - Pengurusan jadual syif bertugas & sesi jualan aktif (disepadukan daripada modul syif/sesi).
  3. **Tab 3: Kupon & Log Audit (*Promotions & Audit*)**
     - Penciptaan dan pengurusan kod kupon promosi POS.
     - Log aktiviti sistem perniagaan & rekod checkpoint tunai.

---

## 5. Milestone 4: Jaminan Sifar-Limpahan (*Zero-Overflow*) Merentasi e-Keusahawanan

- **Audit & Pembaikan Kontena:**
  1. [`src/pages/keusahawanan/KeusahawananLayout.tsx`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/pages/keusahawanan/KeusahawananLayout.tsx): Pastikan `main` dan pembungkus skrin mempunyai `w-full max-w-full overflow-x-hidden`.
  2. [`src/pages/keusahawanan/KeusahawananDashboard.tsx`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/pages/keusahawanan/KeusahawananDashboard.tsx):
     - Rombak grid dan carta `recharts` agar mematuhi `ResponsiveContainer width="100%"`.
     - *Heatmap* produk 14 hari yang menggunakan `min-w-max` dibungkus kemas dalam kontena tatalan mendatar terhad (`w-full overflow-x-auto scrollbar-hide`) tanpa menolak margin badan laman.
  3. [`src/pages/keusahawanan/BusinessShiftModule.tsx`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/pages/keusahawanan/BusinessShiftModule.tsx):
     - Jadual syif dengan `min-w-[600px]` dipastikan berada dalam pembungkus tatalan kad (`rounded-2xl overflow-x-auto border`).

---

## 6. Ujian Automasi & Verifikasi
- Menambah suite ujian unit di `src/__tests__/polymartSuperApp.test.ts` dan `src/__tests__/keusahawananSuperApp.test.ts`:
  1. Mengesahkan butang "Lihat Semua >" membuka `ActiveVendorsSheet`.
  2. Mengesahkan header PolyMart tidak melimpah pada lebar mudah alih dan butang kedai menggunakan reka bentuk bulat responsif.
  3. Mengesahkan susunan "Paling Laris" menggunakan turutan jualan sebenar.
  4. Mengesahkan kad integrasi PolyMart di papan pemuka e-Keusahawanan.
  5. Mengesahkan 3 tab utama baharu di `UrusPerniagaanPage.tsx`.
- Memastikan `npm test -- --run` pas 100% dan `npm run build` lulus 0 ralat.
