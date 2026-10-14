# Spesifikasi Reka Bentuk: Deep Audit & Revamp UI/UX 9 Unit Exco JPPHQ

**Tarikh:** 14 Oktober 2026  
**Status:** Diluluskan oleh Pengguna  
**Modul:** JPP HQ Portal (`/jpp/unit/*`)  
**Fokus:** Ergonomik, Estetika Domain-Spesifik, Pematuhan GPU Baseline, dan Kualiti Interaksi  

---

## 1. Matlamat & Gambaran Keseluruhan

Memperbaharui dan memperkasa pengalaman pengguna (UX) dan reka bentuk visual (UI) bagi kesemua 9 Unit Exco di dalam **JPP HQ Portal** (`/jpp/unit/*`). Setiap unit exco diberikan identiti visual dan susun atur khusus mengikut domain peranan masing-masing (Custom Per-Unit Freedom), menggantikan paparan generik sebelumnya dengan modul berfungsi tinggi yang mematuhi piawaian prestasi **GPU Baseline** sistem (`gpuBaseline.test.ts`).

---

## 2. Prinsip & Kekangan Reka Bentuk (Global Constraints)

1. **Pematuhan GPU Baseline Penuh (`src/__tests__/gpuBaseline.test.ts`)**:
   - DILARANG menggunakan `backdrop-filter: blur(...)` atau `backdrop-filter: saturate(...)`.
   - DILARANG menggunakan ambient blur bersaiz besar (`blur-2xl`, `blur-3xl`, `blur-[>=40px]`).
   - DILARANG menggunakan animasi reflow Framer Motion pada `width`, `height`, atau `boxShadow`.
   - Menggunakan kad permukaan legap/matte berkontras tinggi (`bg-white dark:bg-[#0f0f17]`) dengan sempadan 1px ber-ton unit (`border-slate-200 dark:border-white/[0.06]`).
   - Angka dan metrik wajib menggunakan fon monospace berangka tabular (`font-mono tabular-nums font-black`).
2. **Kekangan Rangkaian & Skalabiliti**:
   - Sistem direka untuk menyokong sehingga 1,500 pengguna serentak ketika musim puncak.
   - Semua panggilan pangkalan data menggunakan `Promise.all([...])` — tiada gelung bersiri N+1.
   - Pilihan lajur yang tepat dalam `select(...)` — elakkan muat turun data yang tidak diperlukan.
3. **Pengekalan RBAC Sedia Ada**:
   - YDP dan Super Admin mempunyai akses penuh rentas-unit.
   - Ahli Majlis Tertinggi (MT) mempunyai akses kepada unit yang ditetapkan dalam `jpp_mt_assignments`.
   - Ahli Exco biasa hanya boleh mengakses unit exco masing-masing.

---

## 3. Spesifikasi Reka Bentuk Mengikut Unit (9 Exco Units)

### 3.1 Unit KPP (Kelab, Persatuan & Perpaduan) — Warna: `#F87171`
- **Fail:** `src/pages/jpp/units/KppUnitDashboard.tsx`
- **Teras UX:**
  - Papan pemantauan kelab aktif vs tidak aktif (30 hari tanpa aktiviti).
  - Tapis aktiviti rentas kelab dengan penapis responsif (pencarian teks segera & drop-down kelab).
  - Semakan kertas kerja & laporan bulanan dengan penunjuk status kelulusan berkod warna yang jelas.
  - Panel merit rasmi & integrasi demerit yang kemas dan berstruktur.
- **Peningkatan UI:**
  - Susun semula tab bar dengan gaya butang segmen yang moden.
  - Kad statistik dengan petunjuk peratusan aktiviti bulanan.
  - Lencana status kelab (Akademik, Sukan, Awam, Kediaman) dengan kontras terang pada mod gelap dan mod cerah.

### 3.2 Unit KEUSAHAWANAN (Keusahawanan & Inovasi) — Warna: `#4ADE80`
- **Fail:** `src/pages/jpp/units/KeusahawananUnitDashboard.tsx`
- **Teras UX:**
  - Strip KPI usahawan: Pendaftaran PUSKEP, SSM, dan status penjual aktif PolyMart.
  - Amaran tindakan segera: Permohonan temu duga perniagaan tertunggak melebihi 7 hari.
  - Tab Pengurusan PolyMart: Semakan laporan aduan barangan/kedai terbuka.
  - Tab Kupon Acara: Penjanaan kupon diskaun aktiviti karnival & jualan kampus.
- **Peningkatan UI:**
  - Papan pemuka gaya hab komersial dengan warna hijau zamrud bertenaga.
  - Jadual audit perniagaan dengan lencana status kelulusan interaktif.

### 3.3 Unit KEBAJIKAN (Kebajikan & Pengaduan Awam) — Warna: `#2DD4BF`
- **Fail:** `src/pages/jpp/units/KebajikanUnitDashboard.tsx`
- **Teras UX:**
  - Meja Triage Aduan Pelajar (E-Bantu): Klasifikasi pintar mengikut keutamaan (URGENT, HIGH, NORMAL, LOW) dan status (NEW, IN_PROGRESS, RESOLVED).
  - SLA Tracker: Penunjuk visual untuk aduan yang belum diambil tindakan dalam tempoh 48 jam.
  - Pemantauan Pengagihan Makanan (Food Bank Siswa) & integrasi pantas ke PolyServices Admin.
- **Peningkatan UI:**
  - Visual bertema teal yang menenangkan namun tegas dalam paparan kecemasan.
  - Paparan perbualan aduan pelajar dengan balasan pantas (quick templates).

### 3.4 Unit SRK (Sukan, Rekreasi & Kebudayaan) — Warna: `#F59E0B`
- **Fail:** `src/pages/jpp/units/SrkUnitDashboard.tsx`
- **Teras UX:**
  - **Konsol Operasi SUPSAS**: Toggle pengumuman portal pelajar, pemasa detik (countdown timer) ke kejohanan seterusnya, dan pautan pentadbir (sukan, kontinjen, jadual, medal tally).
  - **Arena Aktiviti Sukan & Kebudayaan Umum**: Tab/seksyen tambahan untuk aktiviti sukan mingguan, bengkel kebudayaan, rekod fasiliti, dan laporan exco.
- **Peningkatan UI:**
  - Papan pemuka bertema emas/ambar dinamik ala-kejohanan sukan berprestij.
  - Kad kiraan detik digit gergasi dengan fon tabular anti-lompat (no layout shift).

### 3.5 Unit AKADEMIK (Akademik & Pembangunan Mahasiswa) — Warna: `#818CF8`
- **Fail:** `src/pages/jpp/units/AkademikUnitDashboard.tsx`
- **Teras UX:**
  - Anjung Semakan MAKMP (Majlis Anugerah Kecemerlangan POLISAS) dengan penarafan merit berstruktur.
  - Jadual Konfigurasi Nilai Merit: Borang pengubahsuaian kadar merit per peringkat (Antarabangsa, Kebangsaan, Negeri, Daerah) khusus Super Admin/Exco Akademik dengan pengesahan segera.
  - Hab Penjanaan Kod QR Merit Pelajar & Pengurus Demerit bersepadu.
- **Peningkatan UI:**
  - Tema indigo eksekutif dengan lencana pencapaian piala emas/perak yang premium.
  - Jadual data dengan pengasingan baris zebra yang selesa dibaca.

### 3.6 Unit MULTIMEDIA (Multimedia, Informasi & PA) — Warna: `#FB923C` *(Komponen Baharu)*
- **Fail:** `src/pages/jpp/units/MultimediaUnitDashboard.tsx`
- **Teras UX:**
  - **Hab Aset Digital & Poster**: Galeri pratonton poster rasmi program JPP POLISAS dengan tag kategori dan status cetakan/muat naik.
  - **Jadual Hebahan & Media Sosial**: Saluran pemantauan kalendar info-blast dan hebahan WhatsApp/Instagram.
  - **Penjejak Status Peralatan Teknikal & PA**: Senarai semak peralatan siar raya, mikrofon, pemancar wayarles, projektor dan kabel bagi menyokong kelab lain.
  - Integrasi aktiviti & pelaporan exco sendiri.
- **Peningkatan UI:**
  - Reka bentuk grid visual kreatif bertema jingga kreatif dengan sokongan pratonton media lancar.

### 3.7 Unit KLS (Kediaman Luar Kampus) — Warna: `#60A5FA` *(Rombakan Penuh)*
- **Fail:** `src/pages/jpp/units/KlsUnitDashboard.tsx`
- **Teras UX:**
  - **Papan Sebaran Hotspot Kediaman**: Pecahan analitik kawasan tumpuan pelajar luar (Semambu, Indera Mahkota, Beserah, Jalan Teluk Sisek, dsb.).
  - **Nisbah Status Kediaman Siswa**: Visual perbandingan kediaman luar sewa vs tinggal bersama keluarga vs KAMSIS.
  - **Integrasi Pantas PolyRent & PolyRider**: Pautan kawalan pengesahan rumah sewa dan rider kampus.
  - Tab aktiviti keselamatan komuniti, ziarah kediaman luar, dan laporan bulanan.
- **Peningkatan UI:**
  - Tema biru lazuardi dengan kad analitik geografi dan penunjuk status kediaman moden.

### 3.8 Unit KOLABORASI (Kolaborasi & Kesukarelawanan) — Warna: `#34D399` *(Komponen Baharu)*
- **Fail:** `src/pages/jpp/units/KolaborasiUnitDashboard.tsx`
- **Teras UX:**
  - **Direktori Rakan Kerjasama Strategik**: Pangkalan data agensi kerajaan, industri swasta, institusi pengajian tinggi dan NGO rakan kongsi berserta status persefahaman (MoU/MoA/Kolaborasi Acara).
  - **Pusat Panggilan & Pengurusan Sukarelawan**: Bank pendaftaran sukarelawan mahasiswa untuk aktiviti kebajikan/bencana/karnival.
  - **Program Impak Komuniti**: Penjejak pencapaian khidmat masyarakat dan aktiviti/laporan unit.
- **Peningkatan UI:**
  - Tema hijau zamrud/mint yang segar melambangkan kesukarelawanan dan jaringan perhubungan luar.

### 3.9 Unit KK (Kediaman & Kerohanian) — Warna: `#E879F9` *(Rombakan Penuh)*
- **Fail:** `src/pages/jpp/units/KkUnitDashboard.tsx`
- **Teras UX:**
  - **Papan Rujukan Asrama**: Semakan merit dan status kelayakan penempatan Kamsis sesi akademik terkini.
  - **Pengurusan Staf & Pegawai Asrama**: Penambahan dan penyahaktifan akses pegawai asrama.
  - **Hab Program Kerohanian & Pembangunan Sahsiah**: Takwim aktiviti surau, tazkirah mingguan, dan program Ihya Ramadhan.
  - Aktiviti exco & laporan bulanan.
- **Peningkatan UI:**
  - Tema fuchsia/ungu teduh dengan lencana asrama dan kerohanian yang tenang dan eksklusif.

---

## 4. Pelan Integrasi Fail & Penghalaan (Routing)

1. Dalam `src/pages/jpp/JppUnitDashboard.tsx`:
   - Daftarkan `MULTIMEDIA` dan `KOLAB` ke dalam himpunan `FULL_DASHBOARD_UNITS`:
     ```ts
     const FULL_DASHBOARD_UNITS = new Set([
       'KPP', 'KEUSAHAWANAN', 'AKADEMIK', 'KK', 'KEBAJIKAN', 'SRK', 'KLS', 'MULTIMEDIA', 'KOLAB'
     ]);
     ```
   - Import dan muatkan komponen unit masing-masing:
     ```tsx
     {upperCode === 'MULTIMEDIA' && <MultimediaUnitDashboard />}
     {upperCode === 'KOLAB'      && <KolaborasiUnitDashboard />}
     ```
2. Dalam `src/pages/jpp/jppConfig.ts`:
   - Pastikan setiap unit mempunyai `moduleLink` dan konfigurasi warna yang sah.

---

## 5. Pelan Pengujian & Verifikasi Kualiti (QA)

1. **Ujian GPU Baseline**: `npx vitest run src/__tests__/gpuBaseline.test.ts`
   - Memastikan tiada `backdrop-filter: blur`, tiada blur besar, tiada animasi reflow.
2. **Ujian Unit Baru**: `src/__tests__/excoUnitsRevamp.test.ts`
   - Memastikan semua komponen unit exco dieksport dengan betul dan merender komponen utama tanpa ralat.
3. **Suite Penuh Vitest**: `npx vitest run` (Memastikan 625+ ujian sedia ada kekal hijau).
4. **Semakan Bina Produksi**: `npm run build` bagi mengesahkan tiada ralat TypeScript mahupun pembungkusan Vite.
