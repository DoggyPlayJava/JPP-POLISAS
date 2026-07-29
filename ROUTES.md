# JPP Digital Portal — Dokumentasi Konvensyen Route

> **Dibaca oleh pembangun:** Dokumen ini menjelaskan konvensyen penamaan route dalam projek ini.
> Ikut konvensyen ini dengan ketat apabila menambah exco atau modul baharu.

---

## Konvensyen Utama

### Route TANPA Prefix → Milik `e-KPP`

Semua route berikut adalah milik **modul e-KPP** (Exco Kelab, Persatuan & Perpaduan).
Route-route ini **TIDAK** akan diubah ke prefix kerana ia adalah konvensyen yang ditetapkan
sejak pembangunan asal sistem ini.

| Route | Deskripsi |
|---|---|
| `/portal` | Portal Hub — halaman pilih exco |
| `/dashboard` | Dashboard utama e-KPP |
| `/kelab` | Senarai kelab & persatuan |
| `/sertai-kelab` | Urus keahlian kelab |
| `/aktiviti` | Pengurusan aktiviti |
| `/ahli` | Senarai ahli jawatankuasa |
| `/laporan` | Laporan kelab |
| `/urus-kelab` | Pengurusan profil kelab (Presiden) |
| `/semakan-laporan` | Semakan laporan (Admin) |
| `/jpp-admin` | Panel admin JPP |
| `/leaderboard` | Papan kedudukan |
| `/logs` | Log penasihat |
| `/karnival` | Pengundian karnival |
| `/nexus` | Nexus AI Hub |
| `/carian` | Carian global |
| `/tetapan` | Tetapan akaun |
| `/kelab/:id` | Halaman detail kelab |

---

### Route DENGAN Prefix → Milik Exco Baharu

Setiap exco baharu yang ditambah **MESTI** menggunakan prefix dengan ID exco mereka.

**Format:** `/<exco-id>/<nama-route>`

| Prefix | Exco / Modul | Status |
|---|---|---|
| `/jpp/*` | JPP HQ (Induk) | ✅ Aktif |
| `/akademik/*` | e-Akademik | ✅ Aktif |
| `/kebajikan/*` | e-Kebajikan | ✅ Aktif |
| `/keusahawanan/*` | e-Keusahawanan | ✅ Aktif |
| `/klk/*` | e-KLK (Kediaman Luar Kampus) | ✅ Aktif |
| `/polymart/*` | PolyMart | ✅ Aktif |
| `/polyrider/*` | PolyRider | ✅ Aktif |
| `/polytask/*` | PolyTask | ✅ Aktif |
| `/karnival/*` | Sistem Karnival JPP | ✅ Aktif |
| `/ems/*` | EMS (Event Management System) | ✅ Aktif |
| `/sukan/*` | e-Sukan | 🔜 Akan Datang |

**Contoh route exco / modul tambahan:**
```
/jpp                    (Dashboard JPP HQ)
/semakan-laporan        (Dashboard Semakan Laporan KPP)
/akademik/pencapaian    (Akademik: Pencapaian pelajar)
/akademik/cgpa          (Akademik: Muat naik rekod HPNM)
/klk/form               (Borang Kediaman Luar Kampus)
/keusahawanan/dashboard (Dashboard Exco Keusahawanan)
/keusahawanan/poster    (Poster Digital Keusahawanan & PolyMart)
/polyrider              (Laman Utama PolyRider)
/polyrider-admin        (Pusat Kawalan PolyRider)
/ems/dashboard          (Papan Pemuka Utama EMS)
/ems/juri               (Portal Penilaian Juri EMS)
```

---

## Modul EMS (Event Management System)

Semua laluan bagi modul Event Management System (EMS) menggunakan prefix `/ems/*`:

| Route | Deskripsi | Jenis Akses |
|---|---|---|
| `/ems/dashboard` | Hub Acara EMS & Eksplorasi — Papan pemuka utama penganjur acara untuk senarai acara, status kelulusan, jana kod juri, pautan QR pendaftaran, tie-breaker & e-sijil | Protected (AppLayout) |
| `/ems/event/new` | Borang & Builder Acara — Pembina borang pendaftaran dinamik & pembina rubrik pemarkahan kriteria juri | Protected (AppLayout) |
| `/ems/event/:id/edit` | Borang & Builder Acara Edit — Kemaskini borang dinamik & rubrik pemarkahan acara sedia ada | Protected (AppLayout) |
| `/ems/approvals` | Semakan HQ Super Admin — Semakan & kelulusan penganjuran acara oleh Pentadbir Mutlak (`SUPER_ADMIN_JPP`) | Protected (SUPER_ADMIN_JPP) |
| `/ems/e/:eventId/register` | Wizard Pendaftaran Peserta & Pas QR — Wisard pendaftaran peserta awam/pelajar multi-langkah, borang dinamik, media & pas digital QR | Public Standalone |
| `/ems/checkin` | Pemilih Acara Crew Check-In — Pemilih acara aktif untuk urus setia & crew melakukan check-in peserta | Protected (AppLayout) |
| `/ems/checkin/:eventId` | Scanner Kehadiran Crew — Portal pengimbas QR kehadiran peserta/krew hari kejadian menggunakan kamera real-time | Protected (AppLayout) |
| `/ems/juri` | Portal Akses Juri Luar — Portal penilaian juri luar/dalaman dengan pengesahan kod passcode juri & hantaran skor real-time | Public Standalone |
| `/ems/leaderboard/:eventId` | Live Leaderboard & Markah — Papan pendahulu live penganjur & penonton berserta Roda Cabutan Bertuah & tie-breaker | Protected / Public |
| `/ems/stage/:eventId` | Mod Pentas Presentasi — Mod paparan pentas skrin penuh bertema gelap/vibrant, animasi podium Top 3 & confetti | Public Standalone |
| `/ems/v/:eventId/scan` | Portal Imbas Kehadiran Pengunjung & Milestone — Portal imbasan QR pendaftaran kehadiran pengunjung awam & milestone winner | Public Standalone |
| `/ems/cert/verify` | Semakan Carian E-Sijil — Halaman carian nombor siri E-Sijil rasmi (cth: `CERT-EMS-2026-XXXXX`) dan pengesahan | Public Standalone |
| `/ems/cert/:certId` | Portal Sijil PDF & Verifikasi Ber-QR — Muat turun PDF sijil digital & verifikasi ketulenan menerusi QR | Public Standalone |

---

## Cara Tambah Exco Baharu

1. **Tambah entry dalam `src/config/excoModules.ts`**
   ```ts
   {
     id: 'kebajikan',          // ID mesti sama dengan prefix route
     name: 'e-Kebajikan',
     fullName: 'Exco Kebajikan Pelajar',
     tagline: 'Khidmat · Bantuan · Kesejahteraan',
     description: '...',
     defaultColor: '#0D7377',
     icon: '❤️‍🩹',
     basePath: '/kebajikan/dashboard',
     isActive: true,           // Tukar kepada true bila modul siap
   }
   ```

2. **Tambah route dalam `src/App.tsx`**
   ```tsx
   {/* ── e-Kebajikan (prefix: /kebajikan/) ── */}
   <Route path="/kebajikan/dashboard" element={<KebajikanDashboardPage />} />
   <Route path="/kebajikan/program" element={<KebajikanProgramPage />} />
   ```

3. **Kemaskini dokumen ini** — tambah prefix baharu dalam jadual di atas.

---

## Nota Penting

- `/portal` adalah laluan masuk semua pengguna selepas log masuk (kecuali Admin JPP yang terus ke `/jpp-admin`)
- `SUPER_ADMIN_JPP` dan `JPP` roles akan bypass portal dan terus ke `/jpp-admin`
- Untuk route yang memerlukan prefix, asingkan fail dalam folder page: `src/pages/kebajikan/`, `src/pages/keusahawanan/`, dsb.

---

*Dikemaskini oleh: Pembangun JPP Digital Portal*
*Tarikh: Julai 2026*
