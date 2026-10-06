# Reka Bentuk Spesifikasi: EMS SuperApp — Portal Juri Pantas & Papan Audit Juri Eksekutif

**Tarikh:** 6 Oktober 2026  
**Status:** Draf Diluluskan Pengguna  
**Modul Berkaitan:**  
- `src/pages/ems/EmsJuryPortalPage.tsx` (Portal Penjurian Juri `/ems/juri`)
- `src/components/ems/EmsJuryAuditMatrix.tsx` (Papan Audit Juri `/ems/leaderboard/:eventId?tab=audit`)
- `src/pages/ems/EmsLeaderboardPage.tsx` (Hos Papan Markah & Tab Audit)
- `src/lib/ems.ts` (Fungsi Teras Penjurian & Audit)

---

## 1. Latar Belakang & Objektif

Sistem Pengurusan Acara (EMS) POLISAS digunakan untuk menguruskan karnival, pertandingan inovasi, pitching, dan anugerah akademik peringkat institusi dan kebangsaan dengan penyertaan ratusan pelajar serta puluhan juri jemputan (pensyarah, industri, dan pihak luar).

### Isu Utama Semasa (Pain Points)
1. **Portal Juri (`/ems/juri`) Berserabut & Memeningkan:**
   - Juri yang mempunyai pelbagai kategori terperangkap dalam skrin "Gateway" kategori yang kaku.
   - Apabila masuk ke senarai peserta, terdapat butang berkembar `⏩ Penilaian Kategori Seterusnya` di dua lokasi berasingan (atas dan di bawah bar tapisan).
   - Penggunaan skala Likert 1-5 masih menggunakan raw emoji (`🌟`, `👍`, `👌`, `⚠️`, `❌`) yang melanggar standard sistem.
   - Stepper kriteria wisel bertingkat (*step-by-step wizard*) memaksa juri menekan 'Seterusnya' berkali-kali pada skrin telefon yang sempit, menyebabkan juri lambat menilai ketika bergerak dari booth ke booth.
   - Aliran selepas menghantar markah tergantung; juri tidak ditawarkan pilihan untuk terus menilai booth seterusnya yang belum dinilai.
2. **Papan Audit Juri (`EmsJuryAuditMatrix.tsx`) Padat & Penuh Kebisingan Visual:**
   - Amaran anomali juri (kurang/lebih juri) dipenuhi dengan teks emoji mentah (`🚨 Terkurang Juri`, `⚠️ Terlebih Juri`, `🟢 Seimbang`, `[Amaran Diabaikan 👁️]`).
   - Tiada keupayaan tindakan kelompok (*bulk actions*) seperti "Abaikan Semua Amaran Seimbang", memaksa pengarah mengklik butang satu per satu bagi setiap baris.
   - Matriks jadual booth × juri mudah tergelincir atau limpahan mendatar (*horizontal overflow*) yang tidak kemas pada tablet atau skrin 13 inci.
   - Modal pindaan markah juri (*Director Score Override*) kelihatan seperti kotak dialog asas desktop tanpa visual SuperApp dan ergonomik sentuhan.

### Matlamat Utama
- Menghasilkan pengalaman penjurian mudah-alih (*mobile-first*) yang pantas, ergonomik, dan bebas kekusutan untuk juri di lapangan (*walking floor judges*).
- Menghapuskan 100% raw emoji dan menggantikannya dengan ikon vektor Lucide berkualiti tinggi.
- Membina Papan Audit Juri bertaraf Eksekutif dengan metrik kad anomali interaktif, tindakan kelompok pintar, dan jadual matriks responsif.
- Memelihara 100% integriti skema pangkalan data Supabase dan RPCs sedia ada (`submitJuryScore`, `overrideJuryScore`, `ems_scores`, `ems_rubrics`, `ems_jury_codes`).

---

## 2. Seni Bina & Reka Bentuk UI/UX (`design-taste-frontend`)

### 2.1 Konfigurasi Dail Reka Bentuk
- **`DESIGN_VARIANCE: 7`** (Struktur hierarki moden, kad tak simetri seimbang, fokus sentuhan)
- **`MOTION_INTENSITY: 5`** (Animasi peralihan pantas framer-motion pada sheet dan kad, tanpa lag)
- **`VISUAL_DENSITY: 5`** (Kepadatan maklumat optimum, tipografi kontras tinggi, ruang bernafas)
- **Warna Identiti:**
  - Portal Juri: Indigo & Violet (`#6366f1` / `#8b5cf6`) dengan aksen Emerald (`#10b981`) bagi status selesai dinilai.
  - Audit Eksekutif: Slate Gelap / Obsidian dengan aksen Purple & Amber bagi anomali.

---

## 3. Komponen 1: Portal Penjurian Pantas (`EmsJuryPortalPage.tsx`)

### 3.1 Navigasi Kategori Segmented Sticky (*Sticky Category Pills*)
- Menghapuskan paparan pintu masuk (Gateway) kaku yang memotong aliran kerja.
- Bar kategori lekat di bahagian atas skrin memaparkan pil kategori dinamik dengan status kelengkapan:
  - Cth: `[Semua (24)]`, `[Poster 12/12 Selesai]`, `[Pitching Inovasi 3/8]`.
  - Penukaran kategori berlaku serta-merta dengan satu sentuhan jari (*single-tap switch*).
  - Menghapuskan butang berkembar `⏩ Penilaian Kategori Seterusnya`.

### 3.2 Aliran Skrol Pantas Terkawal (*Seamless Touch Feed Evaluation*)
- Menggantikan stepper bertingkat yang berpecah-pecah dengan helaian skrol sentuh laju:
  - Kriteria rubrik dikelompokkan mengikut seksyen (cth: `Seksyen A: Inovasi & Kreativiti`, `Seksyen B: Pembentangan`).
  - Setiap kriteria mempunyai pemilih skala Likert 1-5 sentuh pantas (*tap-to-score*) dengan indikator nombor besar dan lencana warna:
    - **1: Lemah** (`rose-500`, Lucide `XCircle`)
    - **2: Sederhana** (`orange-500`, Lucide `AlertCircle`)
    - **3: Memuaskan** (`amber-500`, Lucide `MinusCircle`)
    - **4: Baik** (`blue-500`, Lucide `ThumbsUp`)
    - **5: Cemerlang** (`emerald-500`, Lucide `Sparkles`)
  - Tiada teks penerangan yang berulang-ulang menghalang skrin; deskriptor rubrik dipaparkan secara kemas di bawah kriteria atau melalui butang info `HelpCircle`.

### 3.3 Bar Ringkasan & Tindakan Bawah Lekat (*Sticky Bottom Summary Bar*)
- Bar tindakan lekat di bahagian bawah skrin telefon memaparkan:
  - **Kiraan Kemajuan:** `X/Y Kriteria Dilengkapkan`.
  - **Skor Wajaran Langsung:** `XX.X%` (dikira secara automatik masa nyata).
  - Butang utama `[Sahkan & Hantar Markah]` (aktif hanya apabila semua kriteria wajib telah diisi).

### 3.4 Aliran Pintar Selepas Menilai (*Post-Scoring Transition Modal*)
- Selepas juri menekan butang hantar markah dan data disahkan:
  - Paparan modal kejayaan moden (*Celebration Drawer*) muncul dengan animasi konfeti mini.
  - Menawarkan dua pilihan tindakan pintar:
    1. **`[Teruskan ke Booth Seterusnya ➔]`** (Mencari dan membuka secara automatik rekod peserta/booth seterusnya yang belum dinilai dalam kategori semasa).
    2. **`[Kembali ke Senarai Booth]`** (Menutup modal dan menyegarkan senarai peserta).

### 3.5 Ketahanan Luar Talian (*Offline Resilience*)
- Setiap perubahan markah disimpan serta-merta ke draf simpanan tempatan (`localStorage`) menggunakan `createJuryDraftKey` dan `serializeJuryDraft`.
- Jika sambungan internet terputus di dewan pameran, indikator lencana `[Draf Tempatan Disimpan]` akan memberi jaminan kepada juri bahawa input mereka selamat.

---

## 4. Komponen 2: Papan Audit Juri Eksekutif (`EmsJuryAuditMatrix.tsx`)

### 4.1 Kad Metrik & Anomali KPI (Executive Telemetry Cards)
Di bahagian atas papan audit, 4 kad ringkasan interaktif disediakan:
1. **Liputan Penjurian Booth:** Jumlah booth dinilai vs belum dinilai.
2. **Status Kemajuan Juri:** Bilangan juri yang telah selesai semua, sedang menilai, dan belum mula.
3. **Anomali Terkurang Juri (Deficit):** Bilangan booth yang menerima kurang daripada purata juri yang ditetapkan.
4. **Anomali Terlebih Juri (Surplus):** Bilangan booth yang menerima lebih daripada purata juri.
- *Interaktiviti:* Klik mana-mana kad KPI untuk menapis senarai jadual matriks serta-merta.

### 4.2 Tindakan Kelompok Pintar (*Bulk Actions*)
- Butang `[Abaikan Semua Amaran Seimbang]`: Membolehkan pengarah mengabaikan semua amaran dengan sekali klik apabila purata telah dipersetujui.
- Butang `[Set Semula Amaran]`: Mengembalikan semula pemantauan anomali jika terdapat pengagihan semula booth.
- Penggunaan penunjuk status berasaskan lencana vektor Lucide (`ShieldCheck`, `AlertTriangle`, `ShieldAlert`) menggantikan emoji mentah.

### 4.3 Matriks Booth × Juri Responsif
- **Kolum Lekat Kiri (Sticky Left Column):** No. Booth dan Nama Peserta/Pasukan sentiasa kelihatan semasa skrol mendatar pada paparan tablet.
- **Sel Skor Berkod Status:**
  - **Hijau Solid (`emerald`):** Selesai dinilai (dipaparkan skor wajaran %).
  - **Kuning (`amber`):** Menilai separuh kriteria (`Separuh X/Y`).
  - **Merah Pudar (`rose`):** Ditugaskan tetapi belum mula.
  - **Kelabu (`slate`):** Tidak ditugaskan.
- Butang interaktif klik sel untuk membuka terus modal pindaan markah.

### 4.4 Laci Pindaan Markah Pengarah Program (*Director Score Override Drawer*)
- Reka bentuk modal/drawer SuperApp yang kemas:
  - Ringkasan maklumat booth, peserta, kategori, dan juri sasaran.
  - Slider interaktif dan input nombor bagi setiap kriteria rubrik dengan semakan batas markah minimum/maksimum.
  - Pengiraan langsung jumlah skor wajaran baharu (*Live Total Percentage Preview*).
  - Medan wajib/pilihan **Catatan Audit Pengarah** (cth: "Pelarasan markah kriteria teknikal selepas semakan panel").
  - Menghubungkan terus dengan RPC `overrideJuryScore`.

---

## 5. Pelan Pengujian & Jaminan Kualiti

1. **Ujian Unit (Vitest):**
   - Menulis `src/__tests__/emsJuryAuditSuperApp.test.ts` untuk menguji:
     - Logik pengiraan markah wajaran kriteria rubrik (`liveTotalWeightedScore`, `modalLivePercentage`).
     - Pengasingan rubrik mengikut kategori peserta dan tugasan kod juri (`getApplicableRubrics`).
     - Pengesanan anomali juri (kurang vs lebih vs seimbang).
     - Sifar penggunaan raw emoji dalam teks atau pemalar (memastikan 100% ikon vektor).
     - Peralihan pintar booth seterusnya (*next unscored booth finder*).
2. **Ujian Pembinaan (Production Build):**
   - Menjalankan `npm test -- --run` dan `npm run build` untuk mengesahkan tiada ralat TypeScript, linting, atau kegagalan kompilasi.
3. **Dokumentasi:**
   - Mengemas kini `DEV_GUIDELINE.md` dengan Seksyen 29.13 yang mendokumentasikan Portal Juri Pantas dan Papan Audit Juri SuperApp.

---

## 6. Pengesahan Integriti & Pangkalan Data

- **Pangkalan Data:** Tiada perubahan skema pangkalan data atau penghapusan lajur.
- **RPC:** Menggunakan `submitJuryScore` dan `overrideJuryScore` sedia ada tanpa modifikasi yang merosakkan keserasian.
- **Keselamatan:** Pengesahan kod juri melalui `verifyJuryCode` dan akses audit dihadkan kepada SuperAdmin/JPP/Pengarah Acara.
