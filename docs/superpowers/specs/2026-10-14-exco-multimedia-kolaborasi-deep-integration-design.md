# Design Spec: Integrasi Mendalam Exco Multimedia & Exco Kolaborasi Bersama EMS & Hebahan Siswa

> **Tarikh:** 14 Oktober 2026  
> **Status:** Diluluskan oleh Pengguna  
> **Cawangan:** `feat/ems-redesign-revamp`

---

## 1. Konteks & Masalah

Pada fasa awal, unit **Multimedia** dan **Kolaborasi** dibina dengan data mock dalaman (galeri poster statik, senarai peralatan PA statik, dan pangkalan sukarelawan berasingan). Reka bentuk ini bersifat kosmetik dan tidak bersambung dengan 1,500 pengguna aktif di POLISAS mahupun modul sedia ada seperti EMS (Event Management System) dan Sistem Hebahan Kampus.

Audit operasi menunjukkan:
1. **Exco Multimedia & Informasi** ialah pemilik hakiki kepada sistem hebahan digital kampus (`system_announcements`), penyelarasan banner portal pelajar, dan arkib aset grafik rasmi (Brandkit POLISAS/JPP).
2. **Exco Kolaborasi & Kesukarelawanan** tidak perlu membina sistem sukarelawan dari sifar, kerana **EMS** sudah mempunyai pangkalan data acara lengkap (`ems_events`), modul imbasan QR kehadiran (`/ems/checkin`), dan enjin penjanaan sijil digital (`ems_certificates`).

---

## 2. Seni Bina & Aliran Integrasi Sistem

```
┌────────────────────────────────────────────────────────────────────────┐
│                   EKOSISTEM JPP-POLISAS (LIVE INTEGRATION)             │
├───────────────────────────────────┬────────────────────────────────────┤
│         EXCO MULTIMEDIA           │          EXCO KOLABORASI           │
├───────────────────────────────────┼────────────────────────────────────┤
│  Punca Data Live:                 │  Punca Data Live:                  │
│  • system_announcements           │  • ems_events                      │
│  • PortalPage Carousel Banners    │  • ems_participants                │
│  • club_activities (MULTIMEDIA)   │  • ems_certificates                │
│  • club_reports (MULTIMEDIA)      │  • club_activities (KOLAB)         │
├───────────────────────────────────┼────────────────────────────────────┤
│  Ciri Teras:                      │  Ciri Teras:                       │
│  1. Pusat Kawalan Hebahan Siswa   │  1. Pengerahan Sukarelawan Acara   │
│  2. Hab Brandkit & Logo Rasmi     │  2. Pengesahan Kehadiran QR EMS    │
│  3. Penjana Teks Blast WhatsApp   │  3. Penjanaan E-Sijil Berkod QR    │
│  4. Rekod Pentadbiran Unit        │  4. Penjejak Tajaan & Rakan Luar   │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 3. Komponen 1: `MultimediaUnitDashboard.tsx`

### Subtab 1: Pusat Siaran & Hebahan Portal (`Live Broadcast`)
- Membaca terus daripada jadual `system_announcements`.
- Menampilkan kad metrik: Hebahan Aktif, Sasaran Pelajar (Semua / Asrama / Jabatan), dan Kadar Respons Borang Maklum Balas.
- Tindakan pantas: Navigasi ke pencipta hebahan penuh, toggle status siaran, dan pratonton visual langsung banner.

### Subtab 2: Hab Brandkit & Aset Rasmi Institusi (`Brandkit DAM`)
- Penyediaan pek logo resolusi tinggi (SVG & PNG telus):
  - Logo Rasmi Politeknik Sultan Haji Ahmad Shah (POLISAS)
  - Logo Jawatankuasa Perwakilan Pelajar (JPP)
  - Logo Kementerian Pendidikan Tinggi (KPT)
  - Logo 5 Jabatan Akademik (JKA, JKE, JKM, JP, JTMK)
- Palet warna institusi rasmi (Kod HEX + RGB) dengan butang *Satu-Klik Salin*.
- Garis panduan reka bentuk poster rasmi kelab untuk mengelakkan poster berkualiti rendah.

### Subtab 3: Penjana Teks Siaran WhatsApp / Telegram (`Broadcast Copywriter`)
- Form interaktif: Nama Program, Tarikh/Masa, Lokasi, Anjuran, dan Pautan Pendaftaran.
- Penjana format teks rasmi dengan bolding, bullet points, dan emoji rasmi institusi.
- Butang pantas *Salin ke Papan Klip*.

### Subtab 4: Rekod Aktiviti & Laporan Rasmi Exco
- Query langsung `club_activities` dan `club_reports` untuk `exco_unit = 'MULTIMEDIA'`.

---

## 4. Komponen 2: `KolaborasiUnitDashboard.tsx` (Integrasi Penuh EMS)

### Subtab 1: Pengerahan Sukarelawan Acara EMS (`EMS Volunteer Hub`)
- Membaca senarai acara aktif terus daripada `ems_events`.
- Memaparkan status penganjuran, penganjur, lokasi dan keperluan sukarelawan.
- Membolehkan Exco Kolaborasi memantau senarai kru dan peranan sukarelawan (Logistik, Sambutan VIP, Multimedia, Pertolongan Cemas).

### Subtab 2: Pengesahan Kehadiran & Lejar Jam (`Hours & Attendance Tracker`)
- Pautan pantas terus ke Pengimbas QR EMS (`/ems/checkin?eventId=...`).
- Menjejaki jumlah jam khidmat komuniti pelajar yang hadir dan berkhidmat.

### Subtab 3: Penjanaan E-Sijil Sukarelawan EMS (`EmsCertificateEngine`)
- Pautan langsung ke pengurusan sijil EMS (`/ems/certificates/:eventId`).
- Menjana Sijil Penghargaan Sukarelawan rasmi dengan kod verifikasi unik (`/ems/verify/:code`).

### Subtab 4: Rakan Kolaborasi & Aktiviti Unit
- Pengurusan saluran penajaan industri / agensi kerajaan.
- Query langsung `club_activities` dan `club_reports` untuk `exco_unit = 'KOLAB'`.

---

## 5. Pematuhan Non-Negotiable
1. **GPU Baseline (`gpuBaseline.test.ts`)**:
   - Sifar `backdrop-filter: blur`, sifar `blur-2xl/3xl`, sifar reflow animation (`width/height/boxShadow`).
2. **Tipografi & Token**:
   - Semua nombor/metrik wajib `font-mono tabular-nums font-black`.
   - Token kad: `rounded-2xl`, `bg-white dark:bg-white/[0.02]`, `border-slate-200 dark:border-white/[0.06]`, `shadow-xs`.
3. **Pangkalan Data**:
   - Sentiasa gunakan `Promise.all([...])` untuk multi-fetch (tiada loop N+1).
   - Tidak memecahkan sebarang skema sedia ada.
