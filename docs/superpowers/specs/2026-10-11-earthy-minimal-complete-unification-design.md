# JPP POLISAS — Earthy Minimal Complete Unification Design Specification

**Tarikh:** 11 Oktober 2026  
**Status:** Approved by User  
**Tema Reka Bentuk:** Earthy Minimal / Forest & Sage (Next Term Theme)  
**Skop Modul:** Profil & Tetapan (`/settings`, `/profile`), PolyMaps (`/polymaps`), JPP HQ Central Cockpit (`/jpp/*`)

---

## 1. Konteks & Matlamat Reka Bentuk

Berikutan kejayaan migrasi Laman Utama (`LandingPage.tsx`), Laman Log Masuk (`LoginPage.tsx`), dan Portal Utama (`PortalPage.tsx`) kepada palet **Earthy Minimal / Forest & Sage**, inisiatif ini bertujuan menyelaraskan 3 modul teras utama yang masih mengekalkan gaya lama (`slate-100`, `#0a0a0f`, dan rona marun `#7f1d1d`):
1. **Fasa 1: Profil & Tetapan (`SettingsPage.tsx`)** - Identiti digital pelajar, kad matrik digital, suis togol tema dwimod, dan tetapan keselamatan akaun.
2. **Fasa 2: Navigasi Kampus PolyMaps (`PolyMapsPage.tsx`)** - Peta interaktif kampus, kapsul carian terapung, helaian bawah (*bottom sheet*), kad perincian bangunan, dan pandu arah bertingkat.
3. **Fasa 3: Papan Pemuka Kepimpinan JPP HQ (`/jpp/*`)** - Bar sisi eksekutif (*Executive Cockpit*), konfigurasi tema JPP (`jppConfig.ts`), cangkuk reka bentuk (`JppLayout.tsx`), dan laman tinjauan kepimpinan (`JppOverviewPage.tsx`).

---

## 2. Palet Token Semantik (Earthy Minimal)

| Token Semantik | Kod Hex | Peranan & Penggunaan |
|---|---|---|
| **Canvas Light** | `#F8F6EE` | Latar belakang kanvas cerah (Warm Alabaster / Milk Porcelain) |
| **Canvas Dark** | `#151D16` | Latar belakang kanvas gelap (Charcoal Forest Green) |
| **Primary Brand / Moss** | `#2E3A2F` | Teks tajuk, butang gelap, permukaan kontras tinggi |
| **Secondary Brand / Sage** | `#6B7F5B` | Sub-tajuk, lencana sekunder, ikon aksen lembut, indikator status aktif |
| **Hairline Linen / Sand** | `#D9C9B2` | Garisan sempadan halus (*borders*), pemisah segmen, tekstur kontur |
| **Warm Accent / Terracotta** | `#C96F4F` | Butang tindakan navigasi (CTA), sorotan aktif, amaran berfokus |
| **Card Surface (Light)** | `#FFFFFF` | Permukaan kad putih bersih atas kanvas `#F8F6EE` |
| **Card Surface (Dark)** | `#1E271F` / `#242E25` | Permukaan kad arang rimba gelap dengan sempadan `#3A4A3B` |
| **Text Primary (Light/Dark)**| `#1C251D` / `#F8F6EE` | Warna teks utama berkontras tinggi (memenuhi WCAG AA/AAA) |
| **Text Muted (Light/Dark)**  | `#596857` / `#A3B39F` | Warna teks penerangan, nota bantuan, dan sub-teks |

---

## 3. Spesifikasi Fasa 1: Profil Digital Pelajar & Tetapan (`/tetapan`, `/profile`, `/settings`)

### 3.1 Kanvas & Suasana
- **Latar Belakang:** `bg-[#F8F6EE] dark:bg-[#151D16] text-[#2E3A2F] dark:text-[#F8F6EE] min-h-screen`.
- **Aura Suasana (Ambient Mesh):** Menggantikan kabus biru/emerald generik kepada bulatan kabur Forest Moss (`#6B7F5B` pada kelegapan 0.05) dan Terracotta (`#C96F4F` pada kelegapan 0.04).

### 3.2 Kad Matrik Digital Mahasiswa (Hero Virtual Student ID Card)
- **Gaya:** *Apple Wallet / Obsidian Ceramic Membership Card*.
- **Pengepala Kad:** Logo rasmi POLISAS bersama teks lencana `KAD MATRIK DIGITAL SISWA` bergaris emas pasir `#D9C9B2]/60`.
- **Avatar:** Avatar bulat berkembar cincin `#D9C9B2` dengan butang kamera muat naik berlatar `#2E3A2F` (`hover:bg-[#242E25]`).
- **Data Pelajar:** Nama penuh berkontras tinggi, No. Matrik font mono, dan lencana peranan (`MAJLIS JPP`, `PENTADBIR`, `MAHASISWA`) bersalut warna Sage Green (`#6B7F5B`/15).
- **Jalur Status 3-Lencana:**
  - **Semester:** Ikon `GraduationCap` dengan nilai Semester semasa.
  - **Mata Merit:** Ikon `Sparkles` dengan baki mata merit rasmi.
  - **Kediaman:** Ikon `Home` (Asrama Kamsis atau Luar Kampus).

### 3.3 Bar Navigasi Segmen Tab (6 Kategori)
- Pilihan tab: `Profil & Akademik`, `Status Kediaman`, `Paparan & Tema`, `Pemberitahuan`, `Keselamatan`, dan `Bantuan`.
- **Tab Aktif:** `bg-[#2E3A2F]/10 dark:bg-[#6B7F5B]/20 text-[#2E3A2F] dark:text-[#F8F6EE] border-[#6B7F5B]/40 font-black shadow-xs`.
- **Tab Tidak Aktif:** `bg-white dark:bg-[#1E271F]/70 text-[#556453] dark:text-[#A3B39F] border-[#D9C9B2]/60 dark:border-[#3A4A3B] hover:border-[#6B7F5B]/40`.

### 3.4 Kad Kandungan & Borang Input
- **Permukaan Kad:** `bg-white dark:bg-[#1E271F]/80 border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-[0_4px_20px_rgba(46,58,47,0.04)] rounded-[2rem]`.
- **Borang Input & Suis:** Input teks dan suis togol tema/notifikasi menggunakan cincin fokus `#6B7F5B`.
- **Alias Routing:** Menambah alias laluan `/profile` dan `/settings` ke `/tetapan` di dalam `src/App.tsx`.

---

## 4. Spesifikasi Fasa 2: Navigasi Kampus PolyMaps (`PolyMapsPage.tsx`)

### 4.1 Kapsul Carian Terapung & Penapis Pantas
- **Kapsul Carian & Butang Menu:**
  - Permukaan: `bg-[#F8F6EE]/90 dark:bg-[#151D16]/90 backdrop-blur-xl border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-[0_8px_30px_rgba(46,58,47,0.08)]`.
  - Ikon Carian: Sage Green (`#6B7F5B`). Teks Input: `#2E3A2F dark:text-[#F8F6EE]`.
- **Pil Penapis Carian (`[ Semua ]`, `[ Kafe ]`, `[ Surau ]`, `[ Tandas ]`):**
  - **Aktif:** `bg-[#2E3A2F] text-[#F8F6EE] border-[#2E3A2F] dark:bg-[#6B7F5B] dark:text-white`.
  - **Tidak Aktif:** `bg-white/90 dark:bg-[#1E271F]/90 text-[#556453] dark:text-[#A3B39F] border-[#D9C9B2]/80 dark:border-[#3A4A3B]`.

### 4.2 Helaian Bawah Pintar (Draggable Gesture Bottom Sheet)
- **Bekas Helaian Bawah:**
  - Permukaan: `bg-white/95 dark:bg-[#151D16]/95 backdrop-blur-2xl border-t border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-[0_-10px_40px_rgba(46,58,47,0.12)]`.
  - Bar Pemegang Seret: Garis kelabu lembut `#D9C9B2` dengan fungsi `touch-none`.
- **Butang Suis Segmen 1-Sentuhan `[ Ringkas | Separuh | Penuh ]`:**
  - Bekas Pil: `bg-[#F8F6EE] dark:bg-[#1E271F] border border-[#D9C9B2]/80 dark:border-[#3A4A3B]`.
  - Butang Aktif: `bg-[#2E3A2F] text-[#F8F6EE] dark:bg-[#6B7F5B] dark:text-white shadow-xs`.
  - Butang Tidak Aktif: `text-[#556453] hover:text-[#2E3A2F] dark:text-[#A3B39F]`.

### 4.3 Kad Perincian Bangunan (Building Sheet)
- **Lencana 360 Panorama:** Lencana `360 AKTIF` berlatar Sage Green berkilau.
- **Butang "Buka 360 Panorama Penuh":** `bg-[#2E3A2F] hover:bg-[#242E25] dark:bg-[#6B7F5B] text-white shadow-lg shadow-[#2E3A2F]/20`.
- **Butang "Mula Pandu Arah":** Aksen tindakan hangat **Terracotta Clay** (`bg-[#C96F4F] hover:bg-[#B35F41] text-white shadow-lg shadow-[#C96F4F]/25`) untuk perbezaan tindakan yang jelas.
- **Senarai Fasiliti / Bilik Dalaman:** Kad direktori bilik dengan latar `#F8F6EE]/60 dark:bg-[#1E271F]/60` dan sempadan `#D9C9B2]/60`.

### 4.4 Bar Sisi Eksplorasi (Explore Accordion Sidebar)
- Latar belakang: `bg-[#F8F6EE] dark:bg-[#151D16]`.
- Pembahagi akordion zon bangunan: `border-[#D9C9B2]/50 dark:border-[#3A4A3B]`.

---

## 5. Spesifikasi Fasa 3: Papan Pemuka Kepimpinan JPP HQ & Bar Sisi Exco (`/jpp/*`)

### 5.1 Kemas Kini Konfigurasi (`src/pages/jpp/jppConfig.ts`)
- **Penetapan Warna Lalai:** Menukar `JPP_THEME_DEFAULT_COLOR` daripada `#7f1d1d` (marun) kepada **`#2E3A2F`** (*Deep Forest Moss*).
- **Preset Warna Tema (`JPP_COLOR_PRESETS`):**
  - `#2E3A2F` (*Deep Forest Moss*)
  - `#1E271F` (*Charcoal Pine*)
  - `#3B4A3C` (*Dark Olive Moss*)
  - `#6B7F5B` (*Sage Green*)
  - `#C96F4F` (*Warm Terracotta*)
  - `#4A584B` (*Slate Forest*)
- **Fungsi Kecerunan Bar Sisi (`getJppSidebarBg`):**
  - **Mod Cerah:** `top: '#F8F6EE', bottom: '#F2EDE4', border: 'rgba(217, 201, 178, 0.8)', textPrimary: '#2E3A2F', textSecondary: '#556453', hoverBg: 'rgba(46, 58, 47, 0.06)', activeBg: 'rgba(46, 58, 47, 0.12)'`.
  - **Mod Gelap:** `top: '#151D16', bottom: '#1B241C', border: 'rgba(58, 74, 59, 0.5)', textPrimary: '#F8F6EE', textSecondary: '#A3B39F', hoverBg: 'rgba(255, 255, 255, 0.05)', activeBg: 'rgba(107, 127, 91, 0.2)'`.

### 5.2 Bar Sisi Eksekutif ([`JppSidebar.tsx`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/pages/jpp/JppSidebar.tsx))
- **Penyingkiran Kelas `rose-*`:** Menghapuskan semua sisa warna marun/merah lama (`text-rose-*`, `bg-rose-*`, `border-rose-*`) dan menggantikannya dengan token semantik Forest & Sage.
- **Pengepala Identiti JPP:** Lencana JPP HQ berlatar sutera/arang rimba dengan border linen `#D9C9B2]/60`.
- **Kad Identiti Pimpinan:** Avatar Exco, label jawatan rasmi (YDP, NYDP, dll), dan penunjuk sesi akademik berorientasikan warna emas pasir dan Sage Green.
- **Pautan Navigasi & Unit Exco:**
  - Navigasi aktif: `bg-[#2E3A2F]/15 dark:bg-[#6B7F5B]/20 text-[#2E3A2F] dark:text-[#F8F6EE] font-black`.
  - Navigasi pasif: `text-[#556453] hover:text-[#2E3A2F] dark:text-[#A3B39F] dark:hover:text-white`.

### 5.3 Kerangka Papan Pemuka ([`JppLayout.tsx`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/pages/jpp/JppLayout.tsx)) & Laman Gambaran Keseluruhan ([`JppOverviewPage.tsx`](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/pages/jpp/JppOverviewPage.tsx))
- **Kerangka Utama:** `bg-[#F8F6EE] dark:bg-[#151D16] text-[#2E3A2F] dark:text-[#F8F6EE]`.
- **Pengepala Mudah Alih:** `border-b border-[#D9C9B2]/80 dark:border-[#3A4A3B] bg-[#F8F6EE]/80 dark:bg-[#151D16]/80 backdrop-blur-xl`.
- **Kad Ringkasan Unit Exco & Analitik:** `bg-white dark:bg-[#1E271F]/80 border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-[0_4px_20px_rgba(46,58,47,0.04)]`.

---

## 6. Kekangan Kualiti & Peraturan Mandatori

1. **100% Sifar Emoji Mentah:** Semua ikon mestilah berasal daripada `lucide-react` sahaja.
2. **Sifar Em-Dash:** Tiada aksara em-dash (`—` / `–`) di dalam rentetan UI mahupun komen kod.
3. **Penyelarasan Prestasi (`isLowEnd`):** Memelihara semakan prestasi peranti pada PolyMaps dan Settings.
4. **Kepatuhan Singleton Supabase:** Kekal menggunakan `@/lib/supabase`.
5. **Kepatuhan Ujian Automatik:** Semua suite ujian sedia ada (26 fail ujian) dan ujian baharu wajib lulus 100%.
