# Reka Bentuk Video Pengenalan JPP-POLISAS (Remotion Intro Video)

> **Tarikh:** 14 Oktober 2026  
> **Status:** Diluluskan  
> **Aestetik:** 05 Earthy Minimal / Swiss Editorial Luxury (`design-taste-frontend`)  
> **Arkitektur:** Remotion 4.x + Zod Configurable Props (Pilihan 3)

---

## 1. Ringkasan Eksekutif & Design Read

* **Page / Asset Kind:** Video Pengenalan Showcase Institusi (Jawatankuasa Perwakilan Pelajar POLISAS).
* **Sasaran Audiens:** Mahasiswa baharu & sedia ada POLISAS, barisan pensyarah/staf pengurusan, serta pelawat luar.
* **Design Read:**
  > *"Institutional showcase video untuk Jawatankuasa Perwakilan Pelajar (JPP) POLISAS, menggunakan bahasa visual 05 Earthy Minimal / Editorial Luxury, berteraskan tipografi Swiss yang anggun, latar belakang hangat porcelain cream, palet warna rasmi sistem, serta fizik animasi spring yang tenang dan berwibawa."*
* **Dail Reka Bentuk (Dials):**
  - `DESIGN_VARIANCE: 7` (Bento-grid tak simetri, susunan modular bebas daripada klise LLM)
  - `MOTION_INTENSITY: 6` (Spring physics lembut berteraskan inertia, tiada gegaran melampau)
  - `VISUAL_DENSITY: 4` (Komposisi lapang dengan ruang negatif yang bernafas)

---

## 2. Palet Warna & Identiti Visual Rasmi

Mengikut sistem token aktif dalam [LandingPage.tsx](file:///c:/Users/Cyborg%2015/Desktop/JPP-POLISAS-main/src/pages/LandingPage.tsx#L25-L31):

| Peranan Token | Kod Hex | Keterangan & Karakter |
| :--- | :--- | :--- |
| **Primary** | `#2E3A2F` | Deep Forest Moss Green (Tipografi tajuk utama, sempadan gelap, struktur asas) |
| **Secondary** | `#6B7F5B` | Sage Olive Green (Sub-tajuk, lencana kelulusan, penunjuk aktif) |
| **Tertiary** | `#D9C9B2` | Warm Sand / Oatmeal Linen (Garisan pemisah halus, sempadan kad bento) |
| **Accent** | `#C96F4F` | Terracotta Clay Orange (Aksen serlahan, butang tindakan, penunjuk laser) |
| **Background** | `#F8F6EE` | Warm Milk Porcelain (Latar kanvas mewah bertekstur kertas) |

* **Slogan Rasmi:** `“Perpaduan Progresif Demi Mahasiswa”`
* **Format Video:** 16:9 Landscape (1920 × 1080 Full HD), 30 FPS, ~38 saat (1,140 frames).

---

## 3. Struktur Fail & Arkitektur Remotion

Projek ini akan mempunyai struktur fail di dalam direktori `remotion/`:

```
remotion/
├── index.ts                # Entry point rasmi untuk Remotion CLI & Studio
├── Root.tsx                # Pendaftaran <Composition> dengan Skema Zod
├── schema.ts               # Skema Zod bagi configurable props
└── JppIntroVideo.tsx       # Komposisi Utama mengandungi semua babak, transisi, & SVG assets
```

### Konfigurasi Zod Props (`schema.ts`)
Setiap data teks dan visual boleh dilaras melalui Remotion Studio Sidebar:
* `institutionName`: Teks institusi ("POLITEKNIK SULTAN HAJI AHMAD SHAH")
* `slogan`: Slogan ("Perpaduan Progresif Demi Mahasiswa")
* `nextClass`: `{ subjectCode, subjectName, time, location }`
* `polyMart`: `{ featuredItem, vendor, price, statsProducts, statsOrders }`
* `polySuara`: `{ pollQuestion, pollOptionA, pollOptionB, votesA, votesB }`
* `eAduan`: `{ ticketNo, category, statusStep }`
* `ems`: `{ eventTitle, studentName, matricNo, certSerial }`

---

## 4. Perincian Garis Masa & Penceritaan (1,140 Frames)

### Babak 0: Pembukaan Rasmi & Identiti (Frame 0 – 120 / 0.0s – 4.0s)
* **Visual:** Latar belakang `#F8F6EE` dengan grid mikro halus. Logo lambang JPP POLISAS naik dengan pantulan spring perlahan (`scale: 0.85 -> 1.0`, `opacity: 0 -> 1`).
* **Tipografi:** Label kecil `SISTEM OPERASI INSTITUSI MAHASISWA`, tajuk gah `Perpaduan Progresif` dan baris kedua `Demi Mahasiswa.` dalam warna Terracotta (`#C96F4F`).

### Babak 1: Integrasi Jadual Kuliah & PolyMaps (Frame 120 – 315 / 4.0s – 10.5s)
* **Konteks Kod:** Menyelaraskan modul `student_timetables` dan peta zon kampus `PolyMaps`.
* **Visual:**
  - Kad Bento memaparkan kelas seterusnya: `DIT3013 — Pembangunan Aplikasi Web`, `10:00 AM – 12:00 PM`, `Makmal Komputer 3, Aras 2, Jabatan TMK`.
  - Transisi zoom lembut ke peta kampus ilustrasi 2D POLISAS dengan laluan putus-putus beranimasi dan pin destinasi berdenyut.
  - Tagline: *"Navigasi Pintar Kampus & Jadual Kuliah Masa Nyata"*.

### Babak 2: Sistem Keusahawanan Digital Rasmi — PolyMart (Frame 315 – 510 / 10.5s – 17.0s)
* **Konteks Kod:** Menampilkan modul `business_products` & `polymart_orders` (item sebenar: *CHICKEN POPCORN*, *Loaded Fries*, *Lanyard JPP*).
* **Visual:**
  - Mockup produk modular moden memaparkan gambar produk, harga RM, nama vendor usahawan siswa.
  - Kaunter statistik dinamik melonjak: `270+ Produk Siswa` & `340+ Pesanan Kampus`.
  - Lencana keselamatan: `JPP Pay & Pesanan Terus`.

### Babak 3: Sosial Media Kampus — PolySuara (Frame 510 – 705 / 17.0s – 23.5s)
* **Konteks Kod:** Menampilkan hab perbincangan mahasiswa `PolySuara` & `PolySuaraPoll`.
* **Visual:**
  - Kad Undian Siswa Langsung (*Live Poll*): *"Cadangan Penambahbaikan Menu Kafeteria Sesi 2026/2027"* dengan bar peratusan bergerak hidup (68% vs 32%).
  - Lencana reaksi komuniti meluncur keluar: Heart, Trophy, Sparkles.
  - Tagline: *"Ruang Perkongsian Idea & Suara Mahasiswa yang Telus"*.

### Babak 4: Aduan & Kebajikan — E-Aduan (Frame 705 – 900 / 23.5s – 30.0s)
* **Konteks Kod:** Menampilkan tiket kebajikan mahasiswa `kebajikan_tickets` dan stepper `KebajikanLiveTrackerCard`.
* **Visual:**
  - Stepper 4 fasa penjejakan aduan: `Dihantar` ➔ `Disemak JPP` ➔ `Tindakan Unit Fasiliti` ➔ `Selesai`.
  - Tiket `#KBJ-2026-0842` (Kategori: Fasiliti & Dewan Kuliah), indikator SLA `< 48 Jam` aktif.
  - Tagline: *"Aduan Disantuni, Tindakan Pantas — Kebajikan Mahasiswa Keutamaan Kami"*.

### Babak 5: Event Dan Aturcara — EMS (Event Management System) (Frame 900 – 1095 / 30.0s – 36.5s)
* **Konteks Kod:** Menampilkan aliran keterujaan pelajar daripada `EmsAudienceScanPage` ke `EmsCertificateTemplate`.
* **Visual:**
  - Pas VIP Acara Pelajar (*Malam Anugerah Kecemerlangan Mahasiswa POLISAS*).
  - Garis imbasan laser terracotta mengimbas Kod QR acara.
  - Animasi tanda sah (*Checkmark*) pop keluar disertai letupan konfeti mikro yang lembut.
  - Serta-merta sijil digital rasmi (**e-Certificate**) POLISAS terbentuk dengan nama mahasiswa dan nombor siri rasmi `EMS-CERT-2026-9041`.
  - Tagline: *"Imbas Kehadiran Sepantas Saat, Sijil Digital Dijana Serta-Merta"*.

### Babak 6: Penutup Agung Outro (Frame 1095 – 1200 / 36.5s – 40.0s)
* **Visual:** Semua kad bento melipat rapi ke tengah, membentuk emblem JPP POLISAS.
* **Teks:**
  - `JPP POLISAS`
  - `Perpaduan Progresif Demi Mahasiswa`
  - `jpp.polisas.edu.my`

---

## 5. Standard Teknikal & Kebolehcapaian
* Hanya menggunakan transformasi berasaskan GPU: `transform` (`translate3d`, `scale`) dan `opacity`.
* Remotion native `spring()` dan `interpolate()` dengan damping seimbang untuk pergerakan organik.
* Tiada font luaran bergantung pada talian internet semasa render; menggunakan tipografi sistem Fallback sans-serif kemas (Geist / Inter / Helvetica / Manrope).
