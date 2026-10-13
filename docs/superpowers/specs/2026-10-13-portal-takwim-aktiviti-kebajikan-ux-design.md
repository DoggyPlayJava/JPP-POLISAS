# Reka Bentuk Spesifikasi: Penambahbaikan UX/UI Portal, Takwim, Aktiviti, E-Kebajikan & Navigasi

**Tarikh:** 2026-10-13  
**Status:** Draf untuk Semakan Pengguna  
**Modul Terlibat:** Portal Pelajar, E-Kebajikan, E-Akademik (Takwim), Pengurusan Aktiviti Kelab (e-KPP), Navigasi Global (`BottomNav`), Profil Pelajar (`CompleteProfileModal`).

---

## 1. Latar Belakang & Matlamat

Berdasarkan audit terperinci daripada tangkapan skrin dan maklum balas pengguna:
1. **Dwi-Header dalam E-Kebajikan:** `KebajikanLayout.tsx` dan `KebajikanSubmitPage.tsx` kedua-duanya merender header atas pada skrin mudah alih secara bertindih.
2. **Kesesakan Paparan Penuh Bento Card Jadual:** Paparan kembang `NextClassBentoCard` mencetak kod kursus berulang kali, teks lokasi bangunan terlalu panjang, dan butang tindakan berselerak pada skrin kecil. Pengguna menetapkan untuk memaparkan **Nama Penuh Subjek sahaja** (tanpa kod kursus yang mengelirukan).
3. **Kesesakan Penapis Halaman Aktiviti Kelab (`AktivitiFull.tsx`):** Header, 3 tab utama, bar carian, dan 5 cip status filter memakan ~70% skrin telefon sebelum kad aktiviti kelihatan.
4. **Butang Pintas Takwim di Portal:** Butang "Takwim" pada Grid Servis Kampus perlu membuka terus tab **Takwim Rasmi POLISAS & Kelab** (`tab=pusat`), manakala butang "Lihat Jadual Penuh" pada kad jadual kelas membuka tab **Jadual Kuliah Saya** (`tab=personal`).
5. **Pepijat BottomNav Terapung di Tengah Skrin:** `BottomNav` kadang-kadang terapung separuh jalan pada skrin telefon akibat terperangkap dalam konteks transform/overflow komponen induk.
6. **Pemodenan `CompleteProfileModal.tsx`:** Menukar rekaan lama (gradien merah-emas kasar + bintang berputar) kepada kad institusi moden berkualiti tinggi dengan cip auto-detect nombor matrik pintar dan kawalan segmen (segmented control) yang licin.

---

## 2. Seni Bina & Perincian Reka Bentuk

### 2.1 E-Kebajikan: Penyingkiran Dwi-Header Mudah Alih
- **Fail:** `src/pages/kebajikan/KebajikanSubmitPage.tsx` dan `src/pages/kebajikan/KebajikanLayout.tsx`.
- **Punca Masalah:** `KebajikanLayout` mempunyai bar navigasi atas mudah alih (`lg:hidden flex h-14`), manakala `KebajikanSubmitPage` turut mempunyai bar navigasi sendiri (`h-16 < Portal JPP ... E-Kebajikan`).
- **Pelaksanaan:**
  - Dalam `KebajikanSubmitPage.tsx`, jadikan header tempatan sebagai `hidden lg:flex` supaya pada desktop paparan `< Portal JPP` kekal, tetapi pada peranti mudah alih header tersebut disembunyikan.
  - Dalam `KebajikanLayout.tsx`, apabila berada di laluan penghantaran aduan (`/kebajikan/aduan`), bar atas mudah alih memaparkan butang kembali ringkas `<` ke portal atau senarai kebajikan dengan label konsisten `E-Kebajikan`.

### 2.2 NextClassBentoCard: Paparan Penuh Minimalis & Bersih
- **Fail:** `src/components/portal/NextClassBentoCard.tsx`.
- **Reka Bentuk Berdasarkan Pilihan Pengguna (Pendekatan A + Nama Penuh Subjek):**
  - **Tajuk Utama:** Hanya memaparkan **Nama Penuh Subjek** (cth. `PENGATURCARAAN WEB`, `DATABASE SYSTEM`). Kod kursus (`DFT40133`) tidak lagi dicetak berulang kali. Jika nama penuh tiada dalam rekod, barulah kod kursus digunakan sebagai fallback selamat.
  - **Lencana Jenis Sesi:** Lencana tunggal kemas di sebelah nama (cth. `KULIAH` atau `AMALI`).
  - **Format Lokasi Pintar:** Jika nama bangunan terlalu panjang (cth. `BK4 · BANGUNAN TEKNOLOGI MAKLUMAT & KOMUNIKASI`), singkatkan kepada format mesra pelajar `BK4 · JTMK` atau format padat tanpa teks bangunan yang menjalar 2 baris.
  - **Bar Kemajuan Waktu Kelas:** Garisan mendatar nipis 4px beranimasi kemas dengan teks peratusan/baki minit ringkas tanpa kotak teks berat.
  - **Bar Butang Tindakan Seimbang:**
    - Butang utama: `Tunjuk Arah PolyMaps` / `Sertai Teams`.
    - Butang sekunder: Butang ikon/teks ringkas `Jadual Penuh` yang menghala ke `/akademik/takwim?tab=personal`.

### 2.3 Modul Kelab: Pembersihan Penapis Halaman Aktiviti (`AktivitiFull.tsx`)
- **Fail:** `src/pages/AktivitiFull.tsx`.
- **Reka Bentuk Berdasarkan Pilihan Pengguna (Pilihan 1):**
  - **Horizontal Scrollable Filter Bar:** Tukar susunan 5 cip status (`Semua`, `Perancangan`, `Aktif`, `Selesai`, `Ditangguh`) daripada bungkus berbilang baris (`flex-wrap`) kepada satu baris mendatar yang boleh di-swipe dengan lancar (`overflow-x-auto no-scrollbar flex-nowrap shrink-0`).
  - **Floating Action Button (FAB) Mudah Alih:**
    - Butang `+ Aktiviti Baru` di bahagian atas ditukar kepada `hidden md:inline-flex`.
    - Di peranti mudah alih (`< md`), butang `+` bertukar menjadi butang bulat terapung (FAB) di sudut kanan bawah (`fixed bottom-24 right-5 z-40 rounded-full shadow-2xl bg-emerald-600 text-white w-13 h-13 flex items-center justify-center`).
    - Kesan: Skrin mudah alih serta-merta menjimatkan ~45% ketinggian vertikal, membolehkan kad aktiviti pertama terus kelihatan sebaik sahaja halaman dibuka.

### 2.4 Navigasi Pintas Takwim di Portal & Tab Segerak
- **Fail:** `src/lib/superAppHelpers.ts`, `src/pages/PortalPage.tsx`, `src/pages/akademik/AkademikTakwimPage.tsx`.
- **Pelaksanaan:**
  - Dalam `AkademikTakwimPage.tsx`, gunakan `useSearchParams()` daripada `react-router-dom`:
    - Sekiranya `searchParams.get('tab') === 'pusat'`, aktifkan tab `PUSAT` (**Takwim Rasmi POLISAS & Kelab**).
    - Sekiranya `searchParams.get('tab') === 'personal'`, aktifkan tab `PERSONAL` (**Jadual Kuliah Saya**).
    - Jika tiada parameter diberikan, lalai kekal selamat.
  - Dalam `superAppHelpers.ts`:
    - Ubah `routeOrAction` untuk servis `takwim` kepada: `/akademik/takwim?tab=pusat`.
  - Dalam `NextClassBentoCard.tsx`:
    - Pautan "Lihat Jadual Penuh" ditetapkan ke: `/akademik/takwim?tab=personal`.

### 2.5 Pembaikan Pepijat Floating BottomNav (`BottomNav.tsx`)
- **Fail:** `src/components/layout/BottomNav.tsx`.
- **Punca Masalah:**
  - Mengikut spesifikasi W3C CSS, mana-mana elemen moyang (ancestor) yang mempunyai sifat `transform`, `perspective`, `filter`, atau `contain: paint` akan mencipta blok pembendungan (containing block) baharu untuk elemen `position: fixed`.
  - Apabila `BottomNav` diletakkan di dalam `PortalPage` atau layout seperti `KebajikanLayout` yang mempunyai `overflow-hidden` atau `motion.div`, `bottom: calc(1.5rem...)` dikira relatif kepada kotak kontena berkenaan dan bukannya viewport tetingkap sebenar.
- **Penyelesaian Muktamad:**
  - Gunakan `createPortal` daripada `react-dom` untuk memindahkan markup render `BottomNav` terus ke bawah `document.body` (`createPortal(<nav id="bottom-nav-dock">...</nav>, document.body)`).
  - Ini memastikan `BottomNav` sentiasa 100% imun terhadap apa jua sifat CSS layout induk, tidak akan pernah terperangkap dalam `overflow`, dan sentiasa melekat pada dasar viewport sebenar peranti mudah alih.

### 2.6 Pemodenan UI/UX `CompleteProfileModal.tsx`
- **Fail:** `src/components/ui/CompleteProfileModal.tsx`.
- **Reka Bentuk Berdasarkan Pilihan Pengguna (Arah Rekaan A):**
  - **Header Kad Institusi Elegan:**
    - Gantikan gradien merah/emas dan bintang berputar 2024 dengan header minimalis gelap institusi (`bg-slate-900 dark:bg-zinc-950 text-white`) dengan lencana jata POLISAS dan tipografi bersih.
  - **Cip Auto-Detect Pintar No. Matrik:**
    - Apabila pelajar menaip nombor matrik (cth. `02DTK25F1037`), sistem mengesan kod program (`DTK`), tahun (`2025`), dan sesi intake secara masa nyata.
    - Daripada kotak amaran yang kaku, paparkan cip pengesahan moden bercahaya lembut:
      `✅ JTMK · Diploma Teknologi Maklumat · Sesi 2025/2026 (Semester 1)`
    - Nilai jabatan dan program dipilih secara automatik tanpa memerlukan pelajar mencari dalam senarai panjang.
  - **Segmented Control Intake yang Licin:**
    - Gantikan butang bertingkat 2 baris lama dengan *sliding pill segmented control* (Intake 1: Pertengahan Tahun vs Intake 2: Awal Tahun) dengan transisi animasi spring.
  - **Integriti Data & Pematuhan RLS:**
    - Logik simpanan profil, penyegerakan kelab akademik (`getAkademikClubId`), dan pengesanan pimpinan (Exco/Penasihat) dikekalkan sepenuhnya tanpa mengubah skema pangkalan data.

---

## 3. Strategi Pengesahan & Ujian (Testing & Quality Gates)

1. **Ujian Unit Vitest:**
   - Ujian untuk `NextClassBentoCard`: Sahkan nama penuh dipaparkan dan kod kursus disorokkan apabila nama berbeza wujud.
   - Ujian untuk `AkademikTakwimPage`: Sahkan parameter URL `?tab=pusat` membuka tab pusat secara automatik.
   - Ujian untuk `BottomNav`: Sahkan portal melekat terus pada `document.body`.
   - Ujian untuk `CompleteProfileModal`: Sahkan auto-detect nombor matrik berfungsi dengan tepat.
2. **Ujian Regresi Penuh:**
   - Jalankan `npm test` untuk memastikan kesemua 511+ ujian unit sedia ada kekal lulus 100%.
   - Jalankan `npm run build` untuk mengesahkan sifar ralat TypeScript / linting.
3. **Dokumentasi:**
   - Kemas kini `DEV_GUIDELINE.md` selaras dengan peraturan wajib projek.

---

## 4. Pelan Tindakan

Selepas pengguna meluluskan spesifikasi reka bentuk ini:
1. Panggil skill `writing-plans` untuk merangka pelan pelaksanaan TDD langkah demi langkah.
2. Laksanakan perubahan mengikut prinsip bite-sized TDD.
3. Sahkan build, jalankan ujian, dan komit perubahan ke Git.
