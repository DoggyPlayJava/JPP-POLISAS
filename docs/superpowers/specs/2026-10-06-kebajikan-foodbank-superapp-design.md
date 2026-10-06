# Reka Bentuk Spesifikasi: E-Kebajikan & FoodBank Siswa SuperApp

**Tarikh:** 6 Oktober 2026  
**Status:** Draf Diluluskan Pengguna  
**Modul Berkaitan:**  
- `src/pages/kebajikan/KebajikanHubPage.tsx` (Hab Utama Kebajikan & Status Aktif)
- `src/pages/kebajikan/KebajikanSubmitPage.tsx` (Borang Aduan Fasiliti Ekspres)
- `src/pages/kebajikan/KebajikanFoodBankPage.tsx` (Portal Permohonan FoodBank & Pas QR Siswa)
- `src/pages/kebajikan/KebajikanMyTickets.tsx` & `KebajikanStudentChat.tsx` (Penjejak Status & Sembang Aduan)
- `src/pages/jpp/JppFoodBankAdmin.tsx` (Stesen Kaunter Imbasan HUD & Pusat Pengurusan FoodBank)
- `src/pages/portal/PortalPage.tsx` (Kad Status Aduan & Bantuan Aktif di Halaman Utama Siswa)

---

## 1. Latar Belakang & Objektif

Ekosistem E-Kebajikan dan FoodBank JPP POLISAS merupakan nadi bantuan harian kebajikan mahasiswa, merangkumi aduan kerosakan infrastruktur kampus (asrama, kafeteria, fasiliti akademik, WiFi) dan pengagihan bantuan makanan FoodBank berkapasiti ribuan pelajar.

### Isu Utama Semasa (Pain Points)
1. **Borang Aduan Panjang & Berpecah:**
   - Pelajar terpaksa menaip semula nama, no. matrik, telefon, dan jabatan yang sudah pun wujud dalam sesi profil mereka.
   - Pilihan kategori dan muat naik bukti kerosakan terasa seperti borang desktop lama yang sukar digunakan semasa berjalan di kampus.
2. **Ketiadaan Ringkasan Mudah Alih Semasa Memilih Barangan:**
   - Di FoodBank, pelajar perlu menatal ke atas dan ke bawah berkali-kali untuk menyemak barangan yang telah dimasukkan ke dalam bakul permohonan.
3. **Ketidakpastian Status Tindakan (Tiada Live Tracker):**
   - Pelajar yang membuat aduan atau memohon makanan sering tertanya-tanya bila barang boleh diambil atau bila pembaikan dilakukan. Status teks statik ("PENDING") tidak memberi maklumat SLA atau fasa tindakan sebenar.
4. **Kesesakan & Kesukaran Imbasan di Kaunter Agihan:**
   - Semasa sesi agihan fizikal di dewan/lobi, pencahayaan sering silau atau malap. Antaramuka admin dengan teks kecil dan butang bersaiz biasa melambatkan semakan Exco, menyebabkan barisan pelajar beratur panjang.

---

## 2. Seni Bina & Reka Bentuk UI/UX (`design-taste-frontend`)

### 2.1 Konfigurasi Dail Reka Bentuk
- **`DESIGN_VARIANCE: 7`** (Struktur hierarki moden, kad tak simetri seimbang, fokus sentuhan)
- **`MOTION_INTENSITY: 5`** (Animasi kad hibrid, denyutan status, dan helaian laci sisi yang responsif)
- **`VISUAL_DENSITY: 5`** (Kepadatan maklumat optimum, tipografi kontras tinggi, ruang bernafas)
- **Warna Identiti:**
  - Kebajikan & Bantuan: Emerald & Teal (`#10b981` / `#0d9488`) melambangkan ihsan dan ketenteraman.
  - Kaunter Imbasan HUD: Obsidian Slate Gelap (`#020617` / `#0f172a`) dengan aksen Neon Emerald bagi kontras tinggi dalam apa jua pencahayaan.
- **Polisi Sifar Raw Emoji:** 100% penggunaan ikon vektor Lucide React berdefinisi tinggi.

---

## 3. Komponen 1: Pengalaman Siswa (Aduan Ekspres & FoodBank)

### 3.1 Borang Aduan Fasiliti & Prasarana Ekspres (`KebajikanSubmitPage.tsx`)
- **Auto-Isi Profil Pelajar:** Mengisi automatik Nama, No Matrik, Telefon, Jabatan, dan Bilik Asrama daripada sesi `useAuth()`. Pelajar tidak perlu menaip semula maklumat asas.
- **Kategori Visual 1-Sentuhan:** Kad kategori besar dengan ikon Lucide (`Building2`, `Dumbbell`, `Coffee`, `Wifi`, `MoreHorizontal`).
- **Tangkapan Kamera Terus:** Input fail menyokong tangkapan kamera telefon secara langsung dengan pemampatan imej terbina dalam (`compressImage`) untuk menjimatkan kuota data pelajar.
- **Sticky Bottom Summary Capsule & Slide-Up Bottom Sheet:**
  - Bar kapsul lekat di bahagian bawah skrin: `[ Kategori Dipilih • Gambar Dimuat Naik ] ➔ [ Semak & Hantar ]`.
  - Sentuhan membuka helaian separa skrin (*slide-up bottom sheet*) untuk semakan pantas tanpa meninggalkan konteks halaman.

### 3.2 Portal Permohonan FoodBank Siswa (`KebajikanFoodBankPage.tsx`)
- **Dwi-Pilihan Bantuan:**
  1. *Pakej Segera (Ready Care Box):* 1-sentuhan untuk memilih pakej bantuan asas standard tanpa perlu memilih item individu (pantas untuk kecemasan).
  2. *Pilihan Bebas (Smart Pantry Basket):* Pelajar memilih item pantri (beras, mi, biskut, mandian) mengikut kuota rakan serumah.
- **Sticky Pantry Capsule:**
  - `[ X/Y Item Dipilih • Baki Kuota: Z ] ➔ [ Semak Bakul ]`.
  - Membuka *Slide-Up Pantry Bottom Sheet* untuk mengubah kuantiti atau membuang item secara sentuhan jari ergonomik.
- **Pas Pengambilan Digital (Digital QR Boarding Pass):**
  - Pas QR digital anggun memaparkan tarikh, slot masa, lokasi agihan PolyMaps 360, senarai item, dan kod QR disahkan untuk imbasan kaunter.

### 3.3 Penjejak Status Langsung Bergaya Penghantaran Parcel (*Dignity-First Live Tracker*)
- **Pulse Stepper Interaktif:**
  - **Aduan:** `Dihantar ➔ Disemak JPP ➔ Unit Pembangunan/Fasiliti Membaiki ➔ Selesai`.
  - **FoodBank:** `Permohonan Diterima ➔ Pakej Disediakan ➔ Sedia Diambil di Kaunter [Tunjuk Pas QR]`.
  - Memaparkan anggaran masa tindakan (SLA) dan penunjuk denyutan hijau (*green pulse indicator*).
- **Integrasi Halaman Utama (`KebajikanHubPage.tsx` & `PortalPage.tsx`):**
  - Sekiranya pelajar mempunyai aduan atau permohonan FoodBank yang sedang aktif/belum selesai, kad amaran aktif (*Active Ticket Banner*) akan dipaparkan secara menonjol di bahagian atas `KebajikanHubPage` dan suapan utama `PortalPage`.
  - Pelajar boleh menekan kad ini untuk terus memasuki bilik sembang aduan dengan Exco (`KebajikanStudentChat.tsx`) atau membuka Pas QR mereka dalam 1 klik.

---

## 4. Komponen 2: Stesen Kaunter Agihan HUD Exco (`JppFoodBankAdmin.tsx`)

### 4.1 High-Contrast Scanner HUD (Obsidian Emerald)
- Mod khas stesen agihan kaunter fizikal bagi kegunaan Exco di dewan/lobi:
  - **Kamera Pengimbas HUD Berpusat:** Paparan kamera besar dengan animasi garis imbasan laser neon emerald.
  - **Maklum Balas Haptik & Audio:** Getaran haptik (`navigator.vibrate`) dan nada bip lembut sebaik kod QR dikesan.
  - **Kad Pengenalan Pelajar Kontras Tinggi:** Teks nama pelajar, no. matrik, telefon, dan butiran pakej/item terpampang dalam tipografi besar berdefinisi tinggi.
  - **Butang Gergasi Serahan (Atomic Handover):** Butang hijau berimpak tinggi `[ SAHKAN SERAHAN ]` berukuran 56px+ untuk sentuhan pantas ibu jari, mengaktifkan RPC `verify_and_complete_foodbank_pickup` dalam masa < 1 saat.
  - **Carian Sandaran Manual:** Input carian no. matrik pantas sekiranya kamera pelajar calar atau malap.

### 4.2 Papan Pengurusan Tiket & Inventori Sifar Limpahan
- Papan tiket aduan segmented (`Baru`, `Dalam Siasatan`, `Tindakan Unit`, `Selesai`) dengan carian pantas.
- Balutan jadual inventori dan lejar bajet RM70k dengan `overflow-x-auto` yang kemas bagi mengelakkan limpahan mendatar pada skrin komputer riba dan tablet.

---

## 5. Polisi Sifar Raw Emoji

- 100% penggunaan ikon vektor Lucide React:
  - Bantuan & Kebajikan: `HeartHandshake`, `ShoppingBag`, `Sparkles`
  - Status & Pengesahan: `CheckCircle2`, `Clock`, `AlertCircle`, `ShieldCheck`
  - Kamera & Pas: `Camera`, `QrCode`, `Package`, `MapPin`
  - Sembang & Tiket: `MessageSquare`, `Send`, `ChevronRight`

---

## 6. Pelan Pengujian & Integriti Pangkalan Data

1. **Ujian Unit (Vitest):**
   - Fail ujian baharu `src/__tests__/kebajikanFoodBankSuperApp.test.ts`.
   - Menguji pengiraan kuota item pantri, pengesanan tiket aktif pelajar, format pas QR, struktur pulse tracker, dan ketiadaan raw emoji.
2. **Pangkalan Data & RPC:**
   - Tiada perubahan skema merosakkan. Menggunakan jadual sedia ada: `kebajikan_tickets`, `kebajikan_messages`, `foodbank_applications`, `foodbank_items`, `foodbank_distribution_locations`, `foodbank_settings`, dan RPC `verify_and_complete_foodbank_pickup`.
3. **Pengesahan Binaan:**
   - Memastikan `npm test -- --run` dan `npm run build` melepasi 100% sifar ralat.
