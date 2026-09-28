# Changelog

Semua perubahan penting dalam projek ini didokumenkan di sini.

Format berdasarkan [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
dan projek ini mengikut [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.8.0] - 2026-09-28

### Ditambah

- **Food Bank JPP** — sistem pengurusan bantuan makanan sepenuhnya:
  - Portal pelajar dengan *digital QR pickup pass* (gaya *boarding pass* kontras tinggi).
  - *Command center* admin JPP dengan verifikasi pengambilan atomik.
  - Inventori berbilang lokasi + pindah stok antara lokasi.
  - Pelantikan pegawai foodbank + gating antara muka ikut peranan (RBAC).
  - Tab audit log khas foodbank dengan penapisan & eksport.
  - Sistem warna semantik 3-aras (*warm citrus*) untuk status stok.
- **PolyMaps 360°** — penonton panorama Pannellum + penunjuk *green box* untuk admin.
  - 28 lokasi kampus 360° *verified* + seed URL panorama.
  - Kad diperluas dengan pratonton 360 segera bila dipilih.
- **MAKMP** — penapis sub-anugerah individu (juri/pegawai portal + dashboard admin).
- Togol 360 berbutir, suis pelancaran induk foodbank, *deep linking*, dan reka bentuk *executive hub*.

### Diperbaiki

- Susunan semula deklarasi *state* untuk elak ralat inisialisasi `activeTab`.
- *Illegal constructor* pada aliran pelajar foodbank + autolengkap pelajar.

## [2.7.52] - 2026-09-28

### Ditambah

- **Dwi-tema (light/dark)** menyeluruh:
  - EMS (papan pemuka pengurusan acara, halaman awam, portal juri, sijil).
  - MAKMP (borang awam, status tracking, portal juri, ranking, banner pemenang, header).
  - JPP (halaman utama, ahli, pengguna, gambaran, sidebar, unit exco, operasi kampus, sistem & utiliti).
  - Tema cerah sebagai lalai global + skrin percikan dikemas kini.
- `ThemeToggle` diintegrasikan ke seluruh modul.

### Diperbaiki

- Kontras tinggi mod gelap juri EMS.

## [2.7.51] - 2026-09-27

### Ditambah

- **MAKMP** — gating tempoh permohonan (deadline): trigger sisi pelayan menyekat penghantaran baharu selepas tarikh tutup (edit masih dibenarkan).

## [2.7.50] - 2026-09-27

### Ditambah

- **MAKMP** — status badge pada header setiap anugerah (🔒 Disahkan / 🟢 Sedia / 🟡 Belum Selesai).

## [2.7.49] - 2026-09-27

### Ditambah

- **MAKMP** — *readiness guard* + aliran pengesahan juri/pegawai (kedua-dua peranan boleh sahkan, guard menolak jika masih ada calon `MENUNGGU`/`DALAM SEMAKAN`).

## [2.7.48] - 2026-09-27

### Ditambah

- **MAKMP** — ranking & keputusan Top 1/2/3, *finalize* setiap anugerah, dan notifikasi pemenang (in-app + push + e-mel).

## [2.7.47] - 2026-09-26

### Ditambah

- **MAKMP** — RPC `save_makmp_submission_edit` (edit mode menyokong tambah anugerah baharu).

## [2.7.46] - 2026-09-25

### Diperbaiki

- **MAKMP** — naikkan had muat naik sijil ke 100MB (selsai isu *exceeding allowed limit*).
- **Pengumuman** — modal dinaikkan ke atas *bottom nav* & AI chat; butang "Buka Pautan" ke atas + butang tutup merah.
- **MAKMP** — amaran "Tiada Templat" dalam dashboard admin; sembunyi banner templat bila tiada `template_url`.

## [2.7.45] - 2026-09-24

### Ditambah

- **MAKMP** — markah 0-100 untuk anugerah laporan + kotak laporan biru.
- **MAKMP** — butang "Kemaskini Permohonan" di halaman status (pemilik + status `MENUNGGU`).
- **MAKMP** — tab Edisi & Sesi (ubah tarikh tutup, tajuk, tahun, buka/tutup sesi).
- **MAKMP** — terima sijil sehingga 100MB dengan auto-mampat (gambar + PDF).
- **Storage-cleanup** — audit harian *dry-run* + amaran e-mel + *fail-hard* (elak *false-positive* delete).

### Diperbaiki

- **MAKMP** — tambah sijil baharu ikat `submission_award_id` dengan betul (elak rekod yatim).
- **MAKMP** — ganti sijil betul-betul (muat naik baharu *override* lama) + RPC set `submission_award_id`.

## [2.7.44] - 2026-09-23

### Ditambah

- **MAKMP** — sorok merit daripada pandangan pelajar (UI + RPC).

## [2.7.43] - 2026-09-22

### Ditambah

- **MAKMP** — log semua aktiviti ke audit log (juri/student/admin).
- **MAKMP** — penapis lalai juri = "Belum Selesai" (Menunggu + Dalam Semakan).
- **MAKMP** — juri boleh buka semula semakan sendiri + mekanisme buka semula (unlock) untuk pentadbir.

### Diperbaiki

- *Dead links* notifikasi (settings→tetapan, kebajikan→polyservices, kamsis→asrama) & e-Keusahawanan.
- Bento card portal tak *redirect* (`triggerHaptic` tak diimport).
- Senarai juri kosong (race condition).

## [2.7.42] - 2026-09-22

### Ditambah

- **MAKMP** — *enforce* skop juri (`assigned_categories`) di DB (tutup kebocoran data juri).
- **MAKMP** — *enforce* PIN juri di DB (tutup kebocoran data + lubang kemas kini portal juri).

### Diperbaiki

- **MAKMP** — *overload* `increment_merit_by_source(uuid,numeric,text)` (selsai type mismatch sahkan juri).
- **MAKMP** — benarkan muat naik sijil anon ke storage (path `makmp_sijil`).
- **MAKMP** — cache token Google access (percepat muat naik).

## [2.7.41] - 2026-09-21

### Ditambah

- **MAKMP** — butang "Lihat Dokumen Peribadi" (redirect ke e-akademik) bila disahkan.

## [2.7.40] - 2026-09-21

### Ditambah

- **MAKMP** — notifikasi status (push + in-app) + mekanisme `DALAM SEMAKAN` bila juri buka anugerah.

## [2.7.39] - 2026-09-21

### Diperbaiki

- **MAKMP** — muat naik (`drive_file_id` uuid→text), *scroll-to-top* teguh, lempar bila sisipan item gagal.

## [2.7.38] - 2026-09-21

### Diperbaiki

- EMS *scroll-to-top*; MAKMP auto-fetch semester + skrol pada ralat; *fallback* tamat masa muat naik.

## [2.7.37] - 2026-09-21

### Diperbaiki

- **MAKMP** — *merit overflow*, *scroll-to-top* pada langkah seterusnya, pertindihan modal pencapaian akademik.

## [2.7.35] - 2026-08-28

### Ditambah

- **Prestasi** — hilang *bottleneck* INP 7s & LCP 19s pada PortalPage.
- *Lazy loading* imej PolyMart & chunk senarai Aktiviti.

### Diperbaiki

- Matikan animasi pada PolyMaps & Recharts untuk peranti rendah.
- Downgrade animasi framer-motion kompleks untuk peranti rendah.

## [2.7.34] - 2026-08-27

### Diperbaiki

- *Storage-cleanup* — bug penghapusan yatim (padanan akhiran laluan, batal jika refs kosong).
- Prestasi peranti rendah, tala precache PWA, asingkan `KarnivalProvider`.

## [2.7.20] - 2026-08-04

### Diperbaiki

- Buang *curtain reveal* SUP/SAS dari halaman portal.

## [2.7.19] - 2026-08-03

### Ditambah

- *Deploy* pengesan ketidakseimbangan juri + sekatan RBAC tab audit.

## [2.7.18] - 2026-08-03

### Ditambah

- Tab audit juri EMS, kad prestasi, pembantu *override*.

### Diperbaiki

- *Upsert* skor juri untuk elak duplikat pada hantar semula.

## [2.7.17] - 2026-08-02

### Ditambah

- **EMS** — papan anugerah per-kategori-rubrik (Best Pitching / Best Showcase) di leaderboard.
- **EMS** — butang Sync ke e-Keusahawanan pada dashboard acara.

### Diperbaiki

- Jana kod juri guna kategori rubrik (bukan semua).
- Muat naik poster EMS (retry auto untuk rangkaian flaky).

## [2.7.11] - 2026-07-30

### Ditambah

- **Portal** — reka bentuk semula `FiraMegaBanner` (Regal Gold Edition) + butang tutup (X).
- **Portal** — banner sambutan FIRA Roboworld Cup 2026.

### Diperbaiki

- **EMS** — typo "Muka Check-in" → "Mula Check-in".
- **EMS** — daftar peserta manual untuk pengarah program.

### Keselamatan

- Sekat roda lucky draw kepada pengarah & admin sahaja.
- Perkukuh RBAC pada halaman leaderboard (sorok skor peribadi daripada pelajar).

## [2.7.10] - 2026-07-29

### Ditambah

- **EMS** — dashboard showcase pelajar adaptif + penapisan acara bersih.
- **EMS** — butang salin & kongsi mesej jemputan WhatsApp untuk kod juri.

## [2.7.9] - 2026-07-29

### Ditambah

- **EMS** — navigasi 2-tab portal check-in krew (peserta vs penonton).

## [2.7.8] - 2026-07-29

### Diperbaiki

- **EMS** — ralat sintaks UUID Postgres pada carian sijil; tab QR penonton dalam modal QR.

## [2.7.7] - 2026-07-29

### Ditambah

- **EMS** — tab senarai e-sijil pengguna, modal senarai sijil acara, butang ambil pas terus.

### Diperbaiki

- **EMS** — RBAC ketat pada pengeditan acara; navigasi belakang.

## [2.7.6] - 2026-07-29

### Ditambah

- **EMS** — halaman pemilih, penguatkuasaan kuota, Universal QR.

### Diperbaiki

- Migrasi guna `ADD COLUMN IF NOT EXISTS`.

## [2.7.5] - 2026-07-29

### Ditambah

- **EMS** — penjana e-Sijil PDF digital + portal verifikasi.
- **EMS** — leaderboard masa nyata dengan mod paparan pentas.
- **EMS** — portal akses juri luaran + sistem pemarkahan kategori.
- **EMS** — portal pengimbas kehadiran krew.
- **EMS** — wizard pendaftaran peserta berbilang langkah awam.
- **EMS** — dashboard pengurusan & kelulusan acara.

### Diperbaiki

- *Enum mismatch* kaedah pembayaran (QR_ONLINE/COD → nilai `pos_payment_method` sah).

## [2.7.4] - 2026-06-24

### Ditambah

- **PolyMaps** — atribut laluan berbumbung + logik carian laluan Dijkstra dengan sokongan segmen tersekat.

## [2.7.3] - 2026-06-24

### Ditambah

- **PolyMaps** — sistem navigasi dengan pemetaan dalaman/luaran interaktif + bantuan laluan AI.

## [2.7.2] - 2026-06-24

### Ditambah

- **PolyMaps** — dashboard admin & halaman pengurusan lokasi.

## [2.7.1] - 2026-06-24

### Ditambah

- Konteks auth berbilang kelab; halaman pengurusan vendor PolyMart; konfigurasi kebenaran pangkalan data.

---

<!-- NOTA: Versi di bawah v2.7.1 (iaitu v1.0.0 – v2.6.x) belum didokumenkan dalam
     changelog ini. Skop semasa hanya meliputi v2.7.x → v2.8.0. -->
