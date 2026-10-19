# JPP-POLISAS Complete Codebase Internationalization (i18n) Audit

**Date:** 2026-10-19
**Scope:** 100% of all modules, pages, and components (378 TSX files, 174,572 lines of code)

This document provides the exhaustive, row-by-row audit of all modules in the JPP-POLISAS codebase, cataloging every subsystem, file list, hardcoded UI strings, user-facing toasts, and the mapped translation namespaces required for full English localization.

---

## 1. Executive Master Table

| Module Domain | Files | Total Lines | Unique JSX Strings | Props (Placeholders/Titles) | Toast Notifications | Target Namespace |
|---|---|---|---|---|---|---|
| **core** | 13 | 2,655 | 6 | 0 | 0 | `core.json` |
| **comp_ai** | 7 | 4,368 | 169 | 12 | 12 | `comp_ai.json` |
| **comp_ems** | 10 | 3,229 | 112 | 29 | 16 | `comp_ems.json` |
| **comp_exco** | 3 | 1,746 | 52 | 5 | 14 | `comp_exco.json` |
| **comp_foodbank** | 2 | 827 | 30 | 4 | 4 | `comp_foodbank.json` |
| **comp_root** | 5 | 1,065 | 37 | 0 | 1 | `comp_root.json` |
| **comp_jpp** | 4 | 645 | 25 | 4 | 3 | `comp_jpp.json` |
| **comp_kamsis** | 4 | 797 | 34 | 2 | 7 | `comp_kamsis.json` |
| **comp_kebajikan** | 1 | 373 | 20 | 0 | 0 | `comp_kebajikan.json` |
| **comp_keusahawanan** | 3 | 800 | 50 | 0 | 2 | `comp_keusahawanan.json` |
| **comp_klk** | 4 | 847 | 25 | 4 | 5 | `comp_klk.json` |
| **comp_layout** | 6 | 1,761 | 35 | 9 | 0 | `comp_layout.json` |
| **comp_makmp** | 4 | 1,027 | 50 | 3 | 0 | `comp_makmp.json` |
| **comp_pdf** | 2 | 612 | 57 | 0 | 0 | `comp_pdf.json` |
| **comp_polymaps** | 2 | 503 | 8 | 2 | 0 | `comp_polymaps.json` |
| **comp_polyrider** | 3 | 534 | 13 | 1 | 0 | `comp_polyrider.json` |
| **comp_polysuara** | 4 | 839 | 8 | 6 | 0 | `comp_polysuara.json` |
| **comp_polytask** | 1 | 324 | 21 | 4 | 5 | `comp_polytask.json` |
| **comp_portal** | 17 | 3,469 | 90 | 10 | 1 | `comp_portal.json` |
| **comp_program** | 3 | 1,227 | 13 | 7 | 7 | `comp_program.json` |
| **comp_pwa** | 1 | 170 | 12 | 0 | 0 | `comp_pwa.json` |
| **comp_reports** | 4 | 1,208 | 28 | 9 | 2 | `comp_reports.json` |
| **comp_takwim** | 8 | 4,020 | 90 | 24 | 32 | `comp_takwim.json` |
| **comp_tasks** | 2 | 516 | 21 | 6 | 10 | `comp_tasks.json` |
| **comp_ui** | 77 | 9,742 | 125 | 41 | 28 | `comp_ui.json` |
| **root_ekpp_portal** | 26 | 20,249 | 742 | 102 | 128 | `root_ekpp_portal.json` |
| **akademik** | 11 | 6,308 | 231 | 37 | 41 | `akademik.json` |
| **ems** | 11 | 10,336 | 454 | 61 | 39 | `ems.json` |
| **jpp** | 38 | 29,730 | 1055 | 203 | 202 | `jpp.json` |
| **karnival** | 10 | 2,897 | 94 | 10 | 13 | `karnival.json` |
| **kebajikan** | 15 | 9,571 | 317 | 101 | 47 | `kebajikan.json` |
| **keusahawanan** | 14 | 9,893 | 410 | 64 | 56 | `keusahawanan.json` |
| **klk** | 7 | 3,291 | 160 | 31 | 35 | `klk.json` |
| **makmp** | 3 | 5,637 | 208 | 31 | 0 | `makmp.json` |
| **polymaps** | 1 | 3,280 | 68 | 11 | 12 | `polymaps.json` |
| **polymart** | 16 | 11,318 | 310 | 55 | 69 | `polymart.json` |
| **polyrent** | 8 | 3,010 | 129 | 21 | 25 | `polyrent.json` |
| **polyrider** | 6 | 5,979 | 205 | 21 | 73 | `polyrider.json` |
| **polyservices** | 2 | 2,876 | 62 | 27 | 32 | `polyservices.json` |
| **polytask** | 11 | 2,635 | 112 | 10 | 30 | `polytask.json` |
| **supsas** | 22 | 6,913 | 175 | 37 | 62 | `supsas.json` |
| **TOTAL** | **391** | **177,227** | **5863** | **1004** | **1013** | **All Namespaces** |

---

## 2. Module-by-Module Deep Dive

### Module: `core`

- **Scale:** 13 files, 2,655 lines of code
- **Total Hardcoded UI Elements:** 6 JSX strings, 0 props/placeholders, 0 toast messages
- **Target Namespace:** `src/locales/{en,ms}/core.json`

#### Top Files in this Module:
- `src/App.tsx` (744 lines)
- `src/contexts/AuthContext.tsx` (618 lines)
- `src/contexts/SupsasContext.tsx` (277 lines)
- `src/contexts/KarnivalContext.tsx` (211 lines)
- `src/contexts/BusinessSwitcherContext.tsx` (179 lines)
- `src/main.tsx` (153 lines)
- `src/contexts/NotificationContext.tsx` (130 lines)
- `src/contexts/JppConfigContext.tsx` (115 lines)
- `src/contexts/AcademicSessionContext.tsx` (72 lines)
- `src/contexts/AiSettingsContext.tsx` (52 lines)
- *(and 3 additional files in this module)*

#### Key Hardcoded Malay UI Strings (Sample):
- `"Mengesahkan Akses..."`
- `"Memuat turun data..."`
- `"Promise"`
- `";   unitLabels: Record"`
- `";   unitConfig: Record"`
- `"now;    return ("`

---

### Module: `comp_ai`

- **Scale:** 7 files, 4,368 lines of code
- **Total Hardcoded UI Elements:** 169 JSX strings, 12 props/placeholders, 12 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_ai.json`

#### Top Files in this Module:
- `src/components/ai/FloatingAiChat.tsx` (2,781 lines)
- `src/components/ai/KertasKerjaRenderer.tsx` (626 lines)
- `src/components/ai/MinitMesyuaratRenderer.tsx` (332 lines)
- `src/components/ai/AiAnalysisModal.tsx` (185 lines)
- `src/components/ai/AIBudgetGenerator.tsx` (161 lines)
- `src/components/ai/AiReviewModal.tsx` (144 lines)
- `src/components/ai/AIGrammarCheck.tsx` (139 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"JPP"`
- `"Nexus"`
- `"Sistem Kecerdasan Buatan JPP POLISAS — Analisis Prestasi Kelab"`
- `"Sedia Jana Analisis"`
- `"AI akan menganalisa data kelab anda secara automatik berdasarkan metrik berikut:"`
- `"Jana Analisis Sekarang"`
- `"Profil anda tidak mempunyai kelab yang dipautkan."`
- `"Menjana Analisis Pintar"`
- `"Sila tunggu sebentar..."`
- `"Sistem sedang sibuk"`
- `"Maaf, bot kami mengalami sedikit gangguan teknikal. Sila cuba lagi sebentar!"`
- `"Cuba Jana Semula"`
- `"Jana Semula"`
- `"Tutup"`
- `"AI Bajet"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Jana Kira-Kira Bajet bersama AI"`
- `"Contoh: Bengkel Fotografi untuk 50 pax, perlu makan tengahari dan sijil penyertaan."`
- `"Semak Tatabahasa Bersama AI"`
- `"Tutup"`
- `"Kosongkan sembang"`
- `"Cari dalam sembang..."`
- `"Cari mesej"`
- `"Dwi-ketik untuk menyalin"`
- `"Taip mesej..."`
- `"Salin"`

#### Key Toast Notifications:
- `"Sila berikan maklumat nama program dan sasaran peserta terlebih dahulu."`
- `"AI mengembalikan bentuk bajet tidak logik. Cuba perincikan lagi maklumat anda."`
- `"Jumlah bajet berjaya disalin ke sistem utama."`
- `"Sila taip sekurang-kurangnya 1 perenggan atau 5 patah perkataan."`
- `"AI mengembalikan respons dalam format tidak sah. Sila cuba lagi."`
- `"Ayat anda telah dikemas kini!"`
- `"Menandakan semua mesej sebagai dibaca..."`
- `"Semua mesej ditandakan sebagai dibaca!"`
- `"Gagal menandakan semua mesej sebagai dibaca"`
- `"Gagal membuka perbualan"`

---

### Module: `comp_ems`

- **Scale:** 10 files, 3,229 lines of code
- **Total Hardcoded UI Elements:** 112 JSX strings, 29 props/placeholders, 16 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_ems.json`

#### Top Files in this Module:
- `src/components/ems/EmsJuryAuditMatrix.tsx` (1,104 lines)
- `src/components/ems/modals/EmsJuryCodeModal.tsx` (473 lines)
- `src/components/ems/EmsLuckyDrawModal.tsx` (442 lines)
- `src/components/ems/EmsCertificateTemplate.tsx` (349 lines)
- `src/components/ems/modals/EmsManualRegModal.tsx` (204 lines)
- `src/components/ems/StudentSearchCombobox.tsx` (200 lines)
- `src/components/ems/modals/EmsTieBreakerModal.tsx` (164 lines)
- `src/components/ems/modals/EmsEventCertsModal.tsx` (121 lines)
- `src/components/ems/modals/EmsQrCodeModal.tsx` (116 lines)
- `src/components/ems/modals/EmsCompleteConfirmModal.tsx` (56 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"POLITEKNIK SULTAN HAJI AHMAD SHAH"`
- `"Jawatankuasa Perwakilan Pelajar (JPP-POLISAS)"`
- `"Dengan ini disahkan bahawa"`
- `"NO. SIRI SIJIL"`
- `"PENGERUSI JPP POLISAS"`
- `"Sistem Pengurusan Acara JPP-POLISAS"`
- `"Imbas untuk Pengesahan Digital"`
- `"Kad Prestasi Juri"`
- `"Status kemajuan dan bilangan booth yang dinilai oleh setiap juri rasmi"`
- `"Tiada Kod Juri Aktif Ditemui"`
- `"Sila tambah dan aktifkan kod juri pada tetapan acara."`
- `") : ("`
- `"Belum Mula"`
- `"Selesai Semua"`
- `"Sedang Menilai"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Salin Pautan & Mesej WhatsApp Jemputan"`
- `"Klik untuk tapis booth yang belum dinilai"`
- `"Klik untuk tapis booth terkurang juri"`
- `"Klik untuk tapis booth terlebih juri"`
- `"Abaikan semua amaran ketidakseimbangan juri"`
- `"Set semula semua status amaran yang diabaikan"`
- `"Kosongkan tapisan"`
- `"Cari Booth / Peserta..."`
- `"Selesai Dinilai - Klik untuk pinda markah"`
- `"Belum mula dinilai - Klik untuk masuk markah"`

#### Key Toast Notifications:
- `"Amaran ketidakseimbangan juri diabaikan."`
- `"Amaran ketidakseimbangan juri dinyahabaikan."`
- `"Semua amaran anomali berjaya diset semula."`
- `"Sila masukkan Catatan Audit Pengarah sebelum menyimpan pindaan markah."`
- `"Gagal memuatkan senarai calon cabutan bertuah"`
- `"Akses Terhad: Hanya Pengarah Program atau Admin JPP dibenarkan memutar Roda Cabutan Bertuah."`
- `"Tiada lagi calon baru yang belum dipilih!"`
- `"Pemenang dikeluarkan daripada sejarah."`
- `"Gagal memuatkan senarai sijil acara."`
- `"Gagal memuatkan senarai kod juri"`

---

### Module: `comp_exco`

- **Scale:** 3 files, 1,746 lines of code
- **Total Hardcoded UI Elements:** 52 JSX strings, 5 props/placeholders, 14 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_exco.json`

#### Top Files in this Module:
- `src/components/exco/ExcoAktivitiPage.tsx` (628 lines)
- `src/components/exco/ExcoLaporanPage.tsx` (589 lines)
- `src/components/exco/ExcoSemakanLaporanPage.tsx` (529 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Aktiviti Exco"`
- `"Aktiviti"`
- `"Aktiviti Baru"`
- `"Tambah Aktiviti Pertama"`
- `") : ("`
- `"displayLimit && ("`
- `"Muat Lagi"`
- `"Tarikh Tamat"`
- `"Lokasi"`
- `"Status"`
- `"Perancangan"`
- `"Aktif"`
- `"Selesai"`
- `"Ditangguh"`
- `"Keutamaan"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Cth: Mesyuarat Bulanan, Gotong-Royong..."`
- `"Cth: Bilik Mesyuarat JPP, Dewan Serbaguna..."`
- `"Ringkasan aktiviti..."`
- `"Tindakan yang telah diambil atau rumusan aktiviti..."`
- `"Nyatakan sebab penolakan dengan jelas..."`

#### Key Toast Notifications:
- `"Maksimum 2 gambar dibenarkan."`
- `"Tiada fail imej yang sah."`
- `"Tajuk dan Tarikh Mula wajib diisi."`
- `"Aktiviti dikemaskini!"`
- `"Aktiviti baharu ditambah!"`
- `"Aktiviti dipadamkan."`
- `"Gagal memadam."`
- `"Laporan berjaya dijana dan dihantar!"`
- `"Ralat:"`
- `"Hanya fail PDF dibenarkan."`

---

### Module: `comp_foodbank`

- **Scale:** 2 files, 827 lines of code
- **Total Hardcoded UI Elements:** 30 JSX strings, 4 props/placeholders, 4 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_foodbank.json`

#### Top Files in this Module:
- `src/components/foodbank/FoodBankQrPassModal.tsx` (600 lines)
- `src/components/foodbank/FoodBankPassPDF.tsx` (227 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Pas Pengambilan Food Bank"`
- `"Nama Mahasiswa"`
- `"No. Matrik"`
- `"Program"`
- `"Tempat Tinggal"`
- `"Butiran Temujanji Pengambilan"`
- `"No. Permohonan"`
- `"Tarikh Pengambilan"`
- `"Slot Masa"`
- `"Pusat Agihan"`
- `"Lokasi Terperinci"`
- `"Senarai Barangan Diluluskan"`
- `"Tiada barangan."`
- `"Kod QR Pengesahan"`
- `"Sila imbas atau tunjukkan kod QR ini di kaunter agihan. Pegawai akan mengesahkan               pengambilan secara automatik."`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Cetak Pas"`
- `"Simpan Pas PDF (A4)"`
- `"Tutup modal"`
- `"Salin Kod Token"`

#### Key Toast Notifications:
- `"Kod token pas disalin!"`
- `"Pas PDF berjaya disimpan!"`
- `"Pas PDF berjaya dimuat turun!"`
- `"Gagal menjana PDF pas."`

---

### Module: `comp_root`

- **Scale:** 5 files, 1,065 lines of code
- **Total Hardcoded UI Elements:** 37 JSX strings, 0 props/placeholders, 1 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_root.json`

#### Top Files in this Module:
- `src/components/GlobalAnnouncementModal.tsx` (382 lines)
- `src/components/RouteGuards.tsx` (208 lines)
- `src/components/PwaUpdater.tsx` (188 lines)
- `src/components/MapPicker.tsx` (163 lines)
- `src/components/RouteViewer.tsx` (124 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `") : ("`
- `";       case 'GIFT': return"`
- `";       case 'STAR': return"`
- `";       case 'MEGAPHONE': return"`
- `";       case 'CALENDAR': return"`
- `";       case 'INFO':       default: return isHigh ?"`
- `"1 && !isHigh && currentIdx"`
- `"Notis Mandatori"`
- `"Buka Pautan"`
- `"Papar Skrin Penuh"`
- `"0 && ("`
- `"0 ? ("`
- `"Langkau Seterusnya"`
- `") : isHigh ? ("`
- `"Saya Faham"`

#### Key Toast Notifications:
- `"Terima kasih. Maklumbalas direkodkan."`

---

### Module: `comp_jpp`

- **Scale:** 4 files, 645 lines of code
- **Total Hardcoded UI Elements:** 25 JSX strings, 4 props/placeholders, 3 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_jpp.json`

#### Top Files in this Module:
- `src/components/jpp/QrLinkManager.tsx` (310 lines)
- `src/components/jpp/JppCommandPalette.tsx` (199 lines)
- `src/components/jpp/QrCodeFab.tsx` (133 lines)
- `src/components/jpp/SlideOverSheet.tsx` (3 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Papan Perintah JPP HQ"`
- `"ESC"`
- `"Tiada modul atau arahan sepadan ditemui."`
- `"Laman Utama JPP"`
- `"Pengurusan Ahli JPP"`
- `"Takwim Kampus & Aktiviti"`
- `"Pentadbiran PolyMaps 360"`
- `"Hab Food Bank JPP"`
- `"Sistem Merit & Demerit JPP"`
- `"Pangkalan Data Pengguna & PRO"`
- `"Konfigurasi JPP HQ"`
- `"SentinelAI Telemetri Sistem"`
- `"untuk navigasi"`
- `"untuk pilih"`
- `"Jana QR Code"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Cari apa-apa sahaja di JPP HQ... (e.g. Takwim, FoodBank, KPP)"`
- `"Jana QR Code"`
- `"Buka Penjana QR Code"`
- `"Tutup"`

#### Key Toast Notifications:
- `"URL disalin!"`
- `"QR Code berjaya dimuat turun!"`
- `"QR Code berjaya dimuat turun (tanpa logo)!"`

---

### Module: `comp_kamsis`

- **Scale:** 4 files, 797 lines of code
- **Total Hardcoded UI Elements:** 34 JSX strings, 2 props/placeholders, 7 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_kamsis.json`

#### Top Files in this Module:
- `src/components/kamsis/KamsisApplicationModal.tsx` (315 lines)
- `src/components/kamsis/KamsisSettingsModal.tsx` (208 lines)
- `src/components/kamsis/KamsisAppealModal.tsx` (165 lines)
- `src/components/kamsis/KamsisDynamicFieldRenderer.tsx` (109 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Rayuan Asrama KAMSIS"`
- `"Sila nyatakan alasan rayuan anda"`
- `"Rayuan ini akan disemak semula oleh pihak pengurusan asrama. Sila berikan alasan yang kukuh berserta justifikasi mengapa anda memerlukan penginapan di asrama."`
- `"Alasan / Justifikasi Rayuan"`
- `"Batal"`
- `"Hantar Rayuan"`
- `"Permohonan Asrama KAMSIS Kini Buka"`
- `"Ya, Mohon"`
- `"Duduk Asrama"`
- `"Tidak Perlu"`
- `"Luar Kampus"`
- `"Borang Permohonan"`
- `"Isi maklumat tambahan yang diperlukan"`
- `"Tiada soalan tambahan diperlukan. Teruskan memohon."`
- `") : ("`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Contoh: Saya memerlukan asrama kerana..."`
- `"Cth: Ya, Tidak, Mungkin"`

#### Key Toast Notifications:
- `"Sila nyatakan alasan rayuan anda."`
- `"Rayuan berjaya dihantar!"`
- `"Gagal menghantar rayuan. Sila cuba lagi."`
- `"Permohonan asrama berjaya dihantar!"`
- `"Gagal menghantar permohonan. Sila cuba lagi."`
- `"Soalan permohonan dikemas kini!"`
- `"Gagal menyimpan tetapan."`

---

### Module: `comp_kebajikan`

- **Scale:** 1 files, 373 lines of code
- **Total Hardcoded UI Elements:** 20 JSX strings, 0 props/placeholders, 0 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_kebajikan.json`

#### Top Files in this Module:
- `src/components/kebajikan/KebajikanLiveTrackerCard.tsx` (373 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Penjejak Aduan Langsung"`
- `"No. Rujukan:"`
- `"SLA: 24-48 Jam Bekerja"`
- `"Dihantar"`
- `") : isStep2Active ? ("`
- `") : ("`
- `"Disemak JPP"`
- `"Tindakan Unit Fasiliti"`
- `"Selesai"`
- `"Buka Sembang Aduan"`
- `"Food Bank Siswa"`
- `"Permohonan Food Bank JPP"`
- `"No. Permohonan:"`
- `"Permohonan Diterima"`
- `") : isReviewing ? ("`

---

### Module: `comp_keusahawanan`

- **Scale:** 3 files, 800 lines of code
- **Total Hardcoded UI Elements:** 50 JSX strings, 0 props/placeholders, 2 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_keusahawanan.json`

#### Top Files in this Module:
- `src/components/keusahawanan/PosSalesReportPDF.tsx` (376 lines)
- `src/components/keusahawanan/EInvoiceModal.tsx` (290 lines)
- `src/components/keusahawanan/PosSalesReportModal.tsx` (134 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `") : ("`
- `"INVOICE"`
- `"Bill To"`
- `"Mobile"`
- `"Address"`
- `"Sells By"`
- `"Invoice"`
- `"Date"`
- `"Item"`
- `"Qty"`
- `"Unit Price"`
- `"Total Price"`
- `"Subtotal :"`
- `"Vat :"`
- `"RM0"`

#### Key Toast Notifications:
- `"Laporan PDF berjaya dimuat turun!"`
- `"Gagal memuat turun PDF."`

---

### Module: `comp_klk`

- **Scale:** 4 files, 847 lines of code
- **Total Hardcoded UI Elements:** 25 JSX strings, 4 props/placeholders, 5 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_klk.json`

#### Top Files in this Module:
- `src/components/klk/KlkResidencyModal.tsx` (465 lines)
- `src/components/klk/KawasanSearchSelect.tsx` (171 lines)
- `src/components/klk/KlkHotspotMap.tsx` (108 lines)
- `src/components/klk/KlkDynamicFieldRenderer.tsx` (103 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Tiada kawasan sepadan"`
- `"-- Pilih --"`
- `"OpenStreetMap"`
- `"contributors &copy;"`
- `"CARTO"`
- `"Di mana anda tinggal semester ini?"`
- `"Exco Kediaman Luar Kampus perlu mengumpul maklumat kediaman pelajar setiap semester."`
- `"Dalam KAMSIS"`
- `"(Asrama)"`
- `"Luar Kampus"`
- `"(Sewa / Rumah)"`
- `"Maklumat Kediaman"`
- `"Isi maklumat tempat tinggal anda"`
- `"Nama Pelajar"`
- `"No. Matrik"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Cari kawasan..."`
- `"Contoh: No. 12, Jalan Semambu 1, Taman Semambu..."`
- `"Nama kawasan..."`
- `"Cadangan kepada Exco KLK..."`

#### Key Toast Notifications:
- `"Gagal simpan. Cuba lagi."`
- `"Sila isi alamat kediaman."`
- `"Sila pilih kawasan kediaman."`
- `"Sila nyatakan kawasan anda."`
- `"Maklumat kediaman berjaya disimpan!"`

---

### Module: `comp_layout`

- **Scale:** 6 files, 1,761 lines of code
- **Total Hardcoded UI Elements:** 35 JSX strings, 9 props/placeholders, 0 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_layout.json`

#### Top Files in this Module:
- `src/components/layout/Sidebar.tsx` (663 lines)
- `src/components/layout/BottomNav.tsx` (376 lines)
- `src/components/layout/PortalSidebar.tsx` (251 lines)
- `src/components/layout/AppLayout.tsx` (165 lines)
- `src/components/layout/GlobalPullToUpdate.tsx` (154 lines)
- `src/components/layout/Header.tsx` (152 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"JPP Polisas"`
- `"Tindakan Pantas"`
- `"Menu pintas & fungsi utama portal"`
- `"0 && ("`
- `") : ("`
- `"Portal Hub"`
- `"JPP POLISAS"`
- `"Utama"`
- `"Panduan Sistem (Tutorial)"`
- `"Khas JPP"`
- `"JPP HQ Portal"`
- `"EXCLUSIVE"`
- `"Modul Pantas"`
- `"Sistem Aktif"`
- `"ADMIN"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"PolyServices"`
- `"Takwim"`
- `"Aduan"`
- `"Kelab"`
- `"Bisnes"`
- `"Kediaman"`
- `"JPP HQ"`
- `"Laman Utama"`
- `"Tetapan Profil"`

---

### Module: `comp_makmp`

- **Scale:** 4 files, 1,027 lines of code
- **Total Hardcoded UI Elements:** 50 JSX strings, 3 props/placeholders, 0 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_makmp.json`

#### Top Files in this Module:
- `src/components/makmp/MakmpWinnerDocsPanel.tsx` (443 lines)
- `src/components/makmp/MakmpRankingView.tsx` (414 lines)
- `src/components/makmp/MakmpJppChrome.tsx` (87 lines)
- `src/components/makmp/MakmpWinnerBanner.tsx` (83 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"JPP Polisas"`
- `"Anda telah"`
- `"dijemput ke Majlis Anugerah Kecemerlangan Mahasiswa (MAKMP) 2026"`
- `"sebagai pemenang anugerah:"`
- `"Sila log masuk ke portal dan lengkapkan"`
- `"nombor IC"`
- `"serta"`
- `"gambar passport"`
- `"anda."`
- `"Kod rujukan anda:"`
- `"— Panel Penilai MAKMP POLISAS"`
- `"Memuat ranking..."`
- `"Tiada peserta yang disahkan lagi untuk anugerah ini."`
- `"Keputusan Disahkan"`
- `") : isReady ? ("`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Naik kedudukan"`
- `"Turun kedudukan"`
- `"Nota sebab laras kedudukan (pilihan)"`

---

### Module: `comp_pdf`

- **Scale:** 2 files, 612 lines of code
- **Total Hardcoded UI Elements:** 57 JSX strings, 0 props/placeholders, 0 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_pdf.json`

#### Top Files in this Module:
- `src/components/pdf/KebajikanPicReportPDF.tsx` (322 lines)
- `src/components/pdf/KebajikanReportPDF.tsx` (290 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"JAWATANKUASA PERWAKILAN PELAJAR (JPP)"`
- `"Politeknik Sultan Haji Ahmad Shah (POLISAS)"`
- `"Sistem: E-Kebajikan JPP"`
- `"LAPORAN RASMI"`
- `"Kepada:"`
- `"Perkara:"`
- `"yang berkaitan           dengan bidang tanggungjawab pihak tuan/puan bagi tempoh"`
- `"Senarai Aduan Pelajar"`
- `"No. Tiket"`
- `"Tarikh"`
- `"Kategori"`
- `"Tajuk & Penerangan"`
- `"Status"`
- `"0 && ("`
- `"6 && ("`

---

### Module: `comp_polymaps`

- **Scale:** 2 files, 503 lines of code
- **Total Hardcoded UI Elements:** 8 JSX strings, 2 props/placeholders, 0 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_polymaps.json`

#### Top Files in this Module:
- `src/components/polymaps/Pannellum360Viewer.tsx` (380 lines)
- `src/components/polymaps/PolyMapsModal.tsx` (123 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Sentuh atau seret untuk meneroka panorama"`
- `"Cuba Semula"`
- `"Tutup"`
- `"Khas untuk pelajar Semester 1, kini anda boleh menggunakan"`
- `"POLISAS PolyMaps"`
- `". Taip sahaja kod kelas (Contoh: A301), sistem akan tunjukkan laluan luar dan panduan dron bangunan tersebut!"`
- `"Cuba PolyMaps Sekarang"`
- `"Lain Kali"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Tutup 360"`
- `"Set Semula Sudut Pandangan (Reset)"`

---

### Module: `comp_polyrider`

- **Scale:** 3 files, 534 lines of code
- **Total Hardcoded UI Elements:** 13 JSX strings, 1 props/placeholders, 0 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_polyrider.json`

#### Top Files in this Module:
- `src/components/polyrider/LocationSearchInput.tsx` (238 lines)
- `src/components/polyrider/CancelJobModal.tsx` (175 lines)
- `src/components/polyrider/SwipeToSOS.tsx` (121 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Batal Pesanan"`
- `"Amaran Sistem"`
- `"Pembatalan yang kerap (3 kali dalam sejam) akan menyebabkan akaun anda"`
- `"digantung automatik selama 24 jam"`
- `". Sila berikan alasan munasabah."`
- `"Mengapa anda membatalkan pesanan ini?"`
- `"Kembali"`
- `"Sila tunggu..."`
- `") : query ? ("`
- `") : ("`
- `"0 && ("`
- `"Hanya untuk kecemasan. Akaun akan digantung jika didapati khianat."`
- `"Sapu Untuk SOS"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Sila nyatakan sebab anda..."`

---

### Module: `comp_polysuara`

- **Scale:** 4 files, 839 lines of code
- **Total Hardcoded UI Elements:** 8 JSX strings, 6 props/placeholders, 0 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_polysuara.json`

#### Top Files in this Module:
- `src/components/polysuara/PolySuaraReactions.tsx` (409 lines)
- `src/components/polysuara/PolySuaraStickerPicker.tsx` (187 lines)
- `src/components/polysuara/IGStoryExportCard.tsx` (132 lines)
- `src/components/polysuara/PolySuaraStickerBadge.tsx` (111 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Poly"`
- `"Suara"`
- `"Maklum Balas JPP"`
- `"Reaksi Komuniti"`
- `"Anda"`
- `") : ("`
- `"Pelekat Kampus POLISAS"`
- `"Vibe kehidupan kampus & politeknik"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Pilih Reaksi"`
- `"Pecahan Reaksi Komuniti"`
- `"Pilih reaksi lain"`
- `"Buang sticker"`
- `"Pilih Pelekat Kampus POLISAS"`
- `"Tutup"`

---

### Module: `comp_polytask`

- **Scale:** 1 files, 324 lines of code
- **Total Hardcoded UI Elements:** 21 JSX strings, 4 props/placeholders, 5 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_polytask.json`

#### Top Files in this Module:
- `src/components/polytask/CreateJobModal.tsx` (324 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Cipta Tugasan Baharu"`
- `"Iklankan tugasan anda kepada rakan pelajar."`
- `"Langkah 1: Butiran"`
- `"Langkah 2: Logistik & Upah"`
- `"Tajuk Tugasan"`
- `"Kategori"`
- `"Akademik (Tutor, Assignment)"`
- `"Teknikal (Baiki Laptop, Motor)"`
- `"Runner (Beli Barang, Hantar Dokumen)"`
- `"Kreatif (Design, Video, Foto)"`
- `"Lain-lain Khidmat"`
- `"Deskripsi Penuh"`
- `"Lokasi"`
- `"Upah (RM)"`
- `"Tarikh Akhir"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Cth: Format Laptop HP & Install Windows 11"`
- `"Terangkan dengan terperinci apa yang anda perlukan..."`
- `"Cth: Kamsis A / Kafeteria"`
- `"0.00"`

#### Key Toast Notifications:
- `"Sila lengkapkan Tajuk dan Deskripsi sebelum meneruskan."`
- `"Sila lengkapkan Lokasi, Upah dan Tarikh Akhir."`
- `"Bajet mesti lebih daripada RM 0"`
- `"Gagal memuat naik tugasan. Sila cuba lagi."`
- `"Tugasan berjaya diiklankan!"`

---

### Module: `comp_portal`

- **Scale:** 17 files, 3,469 lines of code
- **Total Hardcoded UI Elements:** 90 JSX strings, 10 props/placeholders, 1 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_portal.json`

#### Top Files in this Module:
- `src/components/portal/NextClassBentoCard.tsx` (858 lines)
- `src/components/portal/ExcoCard.tsx` (343 lines)
- `src/components/portal/QuickActions.tsx` (284 lines)
- `src/components/portal/PolyMartFeed.tsx` (279 lines)
- `src/components/portal/KarnivalMegaBanner.tsx` (218 lines)
- `src/components/portal/SupsasMegaBanner.tsx` (217 lines)
- `src/components/portal/EmsEventsFeed.tsx` (202 lines)
- `src/components/portal/CampusCampaignCarousel.tsx` (198 lines)
- `src/components/portal/CampusServicesGrid.tsx` (198 lines)
- `src/components/portal/PolymartServiceModal.tsx` (192 lines)
- *(and 7 additional files in this module)*

#### Key Hardcoded Malay UI Strings (Sample):
- `"1 && ("`
- `"KARNIVAL"`
- `"Acara Kampus"`
- `"EMS"`
- `"Pertandingan & program siswa terkini"`
- `"Lihat Semua"`
- `") : ("`
- `"TERBUKA"`
- `"Customize Theme"`
- `"Apply Theme"`
- `"0 && ("`
- `"Aktif"`
- `") : isPreviewMode ? ("`
- `"Pratonton"`
- `"Kunci"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Navigasi Kempen"`
- `"Perkhidmatan Kampus"`
- `"Acara Kampus"`
- `"Sertai Kelas Dalam Talian"`
- `"Tunjuk Arah ke Bilik Kelas"`
- `"Kembangkan untuk maklumat penuh"`
- `"Kecilkan kad"`
- `"PolyMart Siswa"`
- `"Buka profil dan tetapan"`
- `"Cari makanan, runner, servis, acara, merit..."`

#### Key Toast Notifications:
- `"Admin Preview Mode Active"`

---

### Module: `comp_program`

- **Scale:** 3 files, 1,227 lines of code
- **Total Hardcoded UI Elements:** 13 JSX strings, 7 props/placeholders, 7 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_program.json`

#### Top Files in this Module:
- `src/components/program/MeritRasmiReviewPanel.tsx` (526 lines)
- `src/components/program/ProgramStatistikTab.tsx` (368 lines)
- `src/components/program/QrCodeModal.tsx` (333 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Permohonan Merit Rasmi"`
- `") : ("`
- `"0 && ("`
- `"Justifikasi Permohonan"`
- `"Tiada Data Statistik"`
- `"Aktifkan QR pada program dan biarkan peserta scan untuk mula kumpul data."`
- `"Kehadiran Per Program"`
- `"Status Peserta"`
- `"Komposisi Peserta"`
- `"Jabatan / Kursus"`
- `"Butiran Program"`
- `"Senarai Kehadiran"`
- `"Buka Halaman QR"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Tiada permohonan menunggu tindakan"`
- `"Jumlah Program"`
- `"Jumlah Peserta"`
- `"Kadar Hadir"`
- `"Merit Dikreditkan"`
- `"Muat Turun"`
- `"Share"`

#### Key Toast Notifications:
- `"Gagal memuatkan permohonan:"`
- `"✅ Diluluskan! (Tiada peserta hadir untuk dikreditkan)"`
- `"Permohonan ditolak."`
- `"Gagal menjana QR kod."`
- `"QR berjaya dimuat turun!"`
- `"Link QR disalin!"`
- `"Gagal menyalin."`

---

### Module: `comp_pwa`

- **Scale:** 1 files, 170 lines of code
- **Total Hardcoded UI Elements:** 12 JSX strings, 0 props/placeholders, 0 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_pwa.json`

#### Top Files in this Module:
- `src/components/pwa/InstallAppPrompt.tsx` (170 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Pasang Aplikasi JPP"`
- `"Akses pantas portal JPP terus dari skrin utama peranti anda tanpa perlu membuka pelayar web setiap kali."`
- `"Langkah Pemasangan iOS"`
- `"Tekan butang"`
- `"(Menu), kemudian pilih"`
- `"Share"`
- `"Tatal ke bawah dan pilih"`
- `"Add to Home Screen"`
- `") : ("`
- `"Pemasangan segera disokong untuk pelayar Chrome dan Edge di telefon pintar anda."`
- `"Pasang Sekarang"`
- `"Nanti Sahaja"`

---

### Module: `comp_reports`

- **Scale:** 4 files, 1,208 lines of code
- **Total Hardcoded UI Elements:** 28 JSX strings, 9 props/placeholders, 2 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_reports.json`

#### Top Files in this Module:
- `src/components/reports/LaporanPDFTemplate.tsx` (481 lines)
- `src/components/reports/TakwimJPPPDFTemplate.tsx` (286 lines)
- `src/components/reports/LaporanPreviewModal.tsx` (242 lines)
- `src/components/reports/TakwimPusatPDFTemplate.tsx` (199 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `") : (             clubLogoUrl && ("`
- `"LAPORAN BULAN"`
- `"(GABUNGAN)"`
- `") : ("`
- `"TARIKH"`
- `"AKTIVITI"`
- `"TINDAKAN"`
- `"BUKTI ATAU GAMBAR"`
- `"0 ? ("`
- `"Disediakan oleh:"`
- `"Disemak oleh:"`
- `") : (                   reviewerUnit &&"`
- `"Disahkan oleh:"`
- `"JAWATANKUASA PERWAKILAN PELAJAR"`
- `"POLITEKNIK SULTAN HAJI AHMAD SHAH"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"BIL"`
- `"PROGRAM"`
- `"PENGARAH PROGRAM"`
- `"KELAB"`
- `"JENIS"`
- `"TAJUK / AKTIVITI"`
- `"TARIKH"`
- `"MINGGU"`
- `"CATATAN"`

#### Key Toast Notifications:
- `"DOCX berjaya dimuat turun!"`
- `"Gagal jana DOCX:"`

---

### Module: `comp_takwim`

- **Scale:** 8 files, 4,020 lines of code
- **Total Hardcoded UI Elements:** 90 JSX strings, 24 props/placeholders, 32 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_takwim.json`

#### Top Files in this Module:
- `src/components/takwim/TimetablePreviewModal.tsx` (816 lines)
- `src/components/takwim/MyTimetableView.tsx` (795 lines)
- `src/components/takwim/TimetableUploadModal.tsx` (616 lines)
- `src/components/takwim/EditClassSlotModal.tsx` (605 lines)
- `src/components/takwim/PemantauanTakwimTab.tsx` (496 lines)
- `src/components/takwim/TimetableMatrixGrid.tsx` (258 lines)
- `src/components/takwim/DayDetailSheet.tsx` (226 lines)
- `src/components/takwim/TakwimPusatBulkForm.tsx` (208 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Aktiviti"`
- `"Tiada aktiviti"`
- `"Hari ini tiada takwim berdaftar"`
- `"oStart     if (startMins"`
- `"Kemaskini Slot Kelas"`
- `"Ubah maklumat dan masa untuk slot subjek ini secara individu."`
- `"Amaran Pertindihan Jadual"`
- `"Kod Kursus"`
- `"Nama Kursus"`
- `"Hari"`
- `"Masa Mula"`
- `"Masa Tamat"`
- `"Jenis Kelas"`
- `"Kelas Atas Talian"`
- `"Tandakan jika kelas berlangsung via Google Meet/Teams"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Cth: DFC10042"`
- `"Cth: Problem Solving and Algorithms"`
- `"Pilih Hari"`
- `"Pilih Jenis"`
- `"Cth: BK01, MAKMAL 2, KULIAH 3"`
- `"Cth: MNA, AZR, SITI"`
- `"Paparan Grid Mingguan"`
- `"Paparan Agenda Harian"`
- `"Tambah Slot Manual"`
- `"Padam Semua Jadual"`

#### Key Toast Notifications:
- `"Sila masukkan kod kursus."`
- `"Masa tamat mestilah selepas masa mula."`
- `"Slot kelas berjaya dikemaskini."`
- `"Slot kelas berjaya dipadam."`
- `"Ralat memuatkan jadual waktu kuliah."`
- `"Gagal mengemas kini tetapan pemberitahuan."`
- `"Gagal memadam slot."`
- `"Jadual kuliah berjaya dikosongkan."`
- `"Gagal mengosongkan jadual."`
- `"Format warna tidak sah. Gunakan hex, cth: #6B1D2A"`

---

### Module: `comp_tasks`

- **Scale:** 2 files, 516 lines of code
- **Total Hardcoded UI Elements:** 21 JSX strings, 6 props/placeholders, 10 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_tasks.json`

#### Top Files in this Module:
- `src/components/tasks/AddTaskModal.tsx` (344 lines)
- `src/components/tasks/TaskDetailModal.tsx` (172 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Tugasan Baru"`
- `"Tugasan Besar"`
- `"Beritahu AI matlamat projek besar (contoh: "Buat Karnival Sukaneka") dan biarkan AI mencipta pembahagian mikro tugasan tersebut secara spesifik."`
- `"Sistem Sedang Sibuk"`
- `"Maaf, kami gagal memecahkan tugasan sekarang. Sila cuba lagi atau gunakan Mod Manual."`
- `"Cuba Semula"`
- `"0 && ("`
- `"Tarikh Seragam:"`
- `"Pts"`
- `") : (                         // MOD MANUAL LAMA"`
- `"Tajuk Tugasan"`
- `"Tugaskan Kepada"`
- `"Tarikh Akhir (Deadline)"`
- `"Kredit Merit (Ganjaran)"`
- `"Penerangan Tugasan"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Tuliskan matlamat kerja..."`
- `"Pilih Ahli Bertugas..."`
- `"Contoh: Sediakan Kertas Kerja"`
- `"Pilih Ahli"`
- `"Terangkan detail tugasan di sini..."`
- `"Berikan sedikit ulasan tentang tugasan anda..."`

#### Key Toast Notifications:
- `"Sila pilih ahli!"`
- `"Tugasan baharu ditambah!"`
- `"Gagal menambah tugasan."`
- `"Nyatakan matlamat / kerja projek yang jelas."`
- `"AI menjana format salah. Cuba spesifikkan lagi objektif anda."`
- `"Sila pilih Tarikh Akhir (Deadline) yang seragam."`
- `"Gagal mendaftar tugasan pukal."`
- `"Anda tidak mempunyai kebenaran untuk menghantar tugas ini."`
- `"Bukti berjaya dihantar!"`
- `"Gagal memuat naik bukti."`

---

### Module: `comp_ui`

- **Scale:** 77 files, 9,742 lines of code
- **Total Hardcoded UI Elements:** 125 JSX strings, 41 props/placeholders, 28 toast messages
- **Target Namespace:** `src/locales/{en,ms}/comp_ui.json`

#### Top Files in this Module:
- `src/components/ui/CompleteProfileModal.tsx` (1,170 lines)
- `src/components/ui/sidebar.tsx` (772 lines)
- `src/components/ui/chart.tsx` (368 lines)
- `src/components/ui/CommandPalette.tsx` (284 lines)
- `src/components/ui/carousel.tsx` (261 lines)
- `src/components/ui/menubar.tsx` (255 lines)
- `src/components/ui/NotificationBell.tsx` (253 lines)
- `src/components/ui/field.tsx` (245 lines)
- `src/components/ui/PushPermissionModal.tsx` (232 lines)
- `src/components/ui/calendar.tsx` (214 lines)
- *(and 67 additional files in this module)*

#### Key Hardcoded Malay UI Strings (Sample):
- `",   React.ComponentPropsWithoutRef"`
- `"& VariantProps"`
- `",     VariantProps"`
- `"More"`
- `"Perniagaan:"`
- `"Anda boleh menukar paparan perniagaan anda di sini."`
- `"Jangan tunjuk lagi"`
- `",     VariantProps"`
- `"Previous slide"`
- `"Next slide"`
- `"&     React.ComponentProps"`
- `") : (                         !hideIndicator && ("`
- `"&     Pick"`
- `") : ("`
- `"Kelab:"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"breadcrumb"`
- `"Pilih perniagaan..."`
- `"Pilih kelab..."`
- `"Carian Global JPP"`
- `"Cari kelab, acara EMS, MAKMP, kebajikan..."`
- `"Papan Pemuka Pelajar"`
- `"Portal Pelajar POLISAS Hub"`
- `"Semua Aktiviti & Takwim"`
- `"Senarai Kelab & Persatuan"`
- `"Jawatankuasa & Ahli"`

#### Key Toast Notifications:
- `"Pendaftaran dibatalkan dan akaun berjaya dipadamkan."`
- `"Ralat memadam akaun:"`
- `"Sila masukkan nombor telefon."`
- `"Nombor telefon berjaya disimpan!"`
- `"Sila pilih jabatan."`
- `"Sila pilih program pengajian."`
- `"Sila pilih tahun dan sesi pengambilan."`
- `"Maklumat pengajian berjaya disimpan!"`
- `"Profil berjaya dikemaskini!"`
- `"Profil berjaya disimpan!"`

---

### Module: `root_ekpp_portal`

- **Scale:** 26 files, 20,249 lines of code
- **Total Hardcoded UI Elements:** 742 JSX strings, 102 props/placeholders, 128 toast messages
- **Target Namespace:** `src/locales/{en,ms}/root_ekpp_portal.json`

#### Top Files in this Module:
- `src/pages/LaunchVideo.tsx` (4,880 lines)
- `src/pages/AktivitiFull.tsx` (1,792 lines)
- `src/pages/NexusPage.tsx` (1,652 lines)
- `src/pages/SettingsPage.tsx` (1,565 lines)
- `src/pages/LoginPage.tsx` (1,050 lines)
- `src/pages/LandingPage.tsx` (1,002 lines)
- `src/pages/SemakanLaporanPage.tsx` (896 lines)
- `src/pages/DashboardPage.tsx` (754 lines)
- `src/pages/KelabPage.tsx` (738 lines)
- `src/pages/UrusKelabPage.tsx` (730 lines)
- *(and 16 additional files in this module)*

#### Key Hardcoded Malay UI Strings (Sample):
- `"Pengurusan Ahli"`
- `"Urus permohonan pendaftaran baru dan senarai jawatankuasa sedia ada untuk kelab anda."`
- `"Urus Jawatankuasa"`
- `"Senarai Jawatankuasa"`
- `"0 && ("`
- `"Menyusun Data..."`
- `"Tiada Ahli Ditemui"`
- `"Carian anda tidak memadankan mana-mana ahli berdaftar atau tersenarai."`
- `") : ("`
- `"Tiada Permohonan Baru"`
- `"Semua permohonan pendaftaran telah disemak buat masa ini."`
- `"Luluskan Berhenti"`
- `"Batal"`
- `"Lulus"`
- `"Buang Ahli"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Cari nama atau jawatan..."`
- `"Cth: Bertukar Politeknik / Masalah Disiplin"`
- `"Cth: Mesyuarat Bulanan, Gotong-Royong..."`
- `"Cth: Bilik Kuliah 203, Dewan Serbaguna..."`
- `"Ringkasan aktiviti..."`
- `"Tindakan yang telah diambil atau rumusan aktiviti..."`
- `"QR token belum dijana. Edit dan simpan semula aktiviti ini untuk jana token."`
- `"Perhatian Segera"`
- `"Status Semasa"`
- `"Draf Perancangan"`

#### Key Toast Notifications:
- `"Sila nyatakan alasan pembuangan."`
- `"Ralat:"`
- `"Berhenti diluluskan."`
- `"Gagal tukar peranan:"`
- `"Peranan berjaya dikemaskini!"`
- `"Ralat tidak dijangka:"`
- `"Maksimum 2 gambar dibenarkan."`
- `"Tiada fail imej yang sah."`
- `"Tajuk dan Tarikh Mula wajib diisi."`
- `"Aktiviti dikemaskini!"`

---

### Module: `akademik`

- **Scale:** 11 files, 6,308 lines of code
- **Total Hardcoded UI Elements:** 231 JSX strings, 37 props/placeholders, 41 toast messages
- **Target Namespace:** `src/locales/{en,ms}/akademik.json`

#### Top Files in this Module:
- `src/pages/akademik/AkademikFolderPage.tsx` (881 lines)
- `src/pages/akademik/AkademikCgpa.tsx` (861 lines)
- `src/pages/akademik/AkademikQrScan.tsx` (858 lines)
- `src/pages/akademik/AkademikPencapaian.tsx` (708 lines)
- `src/pages/akademik/AkademikDashboard.tsx` (611 lines)
- `src/pages/akademik/DemeritManager.tsx` (553 lines)
- `src/pages/akademik/AkademikQrPage.tsx` (488 lines)
- `src/pages/akademik/AkademikMeritPage.tsx` (388 lines)
- `src/pages/akademik/AkademikLayout.tsx` (333 lines)
- `src/pages/akademik/AkademikLeaderboard.tsx` (322 lines)
- *(and 1 additional files in this module)*

#### Key Hardcoded Malay UI Strings (Sample):
- `"HPNM"`
- `"PNM"`
- `"Akademik"`
- `"HPNM / CGPA"`
- `"Rekod dan pantau prestasi akademik anda dari semester ke semester"`
- `"Terkini"`
- `"0.001                     ?"`
- `": trend"`
- `"0.001 ? 'text-emerald-600 dark:text-emerald-400' : trend"`
- `"vs semester lepas"`
- `"PNM:"`
- `"Trend HPNM"`
- `"Tambah Rekod HPNM"`
- `"instead of"`
- `"Menganalisis PDF..."`

#### Key Hardcoded Placeholders & Prop Labels:
- `"0.00 – 4.00"`
- `"cth: 2"`
- `"cth: 2024/2025"`
- `"Lihat Transkrip"`
- `"Padam rekod"`
- `"Pencapaian"`
- `"Disahkan"`
- `"Menunggu"`
- `"HPNM Terkini"`
- `"Pencapaian & Sijil"`

#### Key Toast Notifications:
- `"PDF atau imej sahaja."`
- `"HPNM tidak dikesan — sila isi manual atau hubungi JPP."`
- `"HPNM mestilah antara 0.00 – 4.00"`
- `"Semester mestilah 1–9"`
- `"Rekod HPNM berjaya disimpan!"`
- `"Gagal padam."`
- `"Rekod dipadam."`
- `"Memuat naik fail..."`
- `"Fail berjaya dimuat naik!"`
- `"Gagal padam fail."`

---

### Module: `ems`

- **Scale:** 11 files, 10,336 lines of code
- **Total Hardcoded UI Elements:** 454 JSX strings, 61 props/placeholders, 39 toast messages
- **Target Namespace:** `src/locales/{en,ms}/ems.json`

#### Top Files in this Module:
- `src/pages/ems/EmsJuryPortalPage.tsx` (1,894 lines)
- `src/pages/ems/EmsLeaderboardPage.tsx` (1,640 lines)
- `src/pages/ems/EmsPublicRegisterPage.tsx` (1,585 lines)
- `src/pages/ems/EmsEventFormPage.tsx` (1,488 lines)
- `src/pages/ems/EmsCheckinPage.tsx` (1,130 lines)
- `src/pages/ems/EmsDashboardPage.tsx` (793 lines)
- `src/pages/ems/EmsAudienceScanPage.tsx` (476 lines)
- `src/pages/ems/EmsCertificatePage.tsx` (472 lines)
- `src/pages/ems/EmsApprovalPage.tsx` (445 lines)
- `src/pages/ems/EmsCheckinSelectorPage.tsx` (211 lines)
- *(and 1 additional files in this module)*

#### Key Hardcoded Malay UI Strings (Sample):
- `"Akses Diperlukan"`
- `"Kembali ke Papan Pemuka EMS"`
- `"Semakan & Kelulusan Acara EMS"`
- `"Modul pengesahan khas Pentadbir Mutlak (Super Admin JPP)."`
- `"Muat Semula"`
- `"Memuatkan senarai permohonan acara..."`
- `"Tiada Permohonan Menunggu"`
- `"Semua permohonan penganjuran acara pertandingan EMS telah disemak dan diluluskan sepenuhnya."`
- `"Kembali ke Hub Acara"`
- `"+ Cipta Acara Baharu"`
- `") : ("`
- `"PENDING"`
- `"Menunggu Kelulusan HQ"`
- `"Mod:"`
- `"Penerangan Acara"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Contoh: Maklumat lokasi belum lengkap / tarikh bertembung acara rasmi. Sila lengkapkan..."`
- `"e.g. Ahmad bin Ali"`
- `"e.g. 01DIT22F1001"`
- `"e.g. email@polisas.edu.my"`
- `"e.g. 0123456789"`
- `"Cari No. Siri Sijil..."`
- `"Masukkan No. Siri Sijil (cth: CERT-EMS-2026-P1-12345)"`
- `"Salin No. Siri"`
- `"Contoh: CERT-EMS-2026-P1-12345"`
- `"Kembali ke Dashboard EMS"`

#### Key Toast Notifications:
- `"Sila nyatakan sebab penolakan permohonan acara."`
- `"Acara tidak dijumpai"`
- `"Gagal memuatkan maklumat acara"`
- `"Sila masukkan Nama Penuh."`
- `"Kehadiran anda telah direkodkan. Tidak boleh scan berulang!"`
- `"Kehadiran anda berjaya direkodkan!"`
- `"Pautan pengesahan disalin ke papan keratan!"`
- `"No. siri disalin!"`
- `"Sila masukkan nombor siri sijil (cth: CERT-EMS-2026-XXXXX)"`
- `"Acara ditanda SELESAI & e-sijil berjaya dijana!"`

---

### Module: `jpp`

- **Scale:** 38 files, 29,730 lines of code
- **Total Hardcoded UI Elements:** 1055 JSX strings, 203 props/placeholders, 202 toast messages
- **Target Namespace:** `src/locales/{en,ms}/jpp.json`

#### Top Files in this Module:
- `src/pages/jpp/JppFoodBankAdmin.tsx` (5,614 lines)
- `src/pages/jpp/units/MakmpAdminDashboardPage.tsx` (2,924 lines)
- `src/pages/jpp/JppPolyMapsAdmin.tsx` (2,324 lines)
- `src/pages/jpp/PolyServicesAdmin.tsx` (1,097 lines)
- `src/pages/jpp/units/KppUnitDashboard.tsx` (972 lines)
- `src/pages/jpp/JppMembersPage.tsx` (945 lines)
- `src/pages/jpp/units/AkademikUnitDashboard.tsx` (940 lines)
- `src/pages/jpp/units/KkUnitDashboard.tsx` (923 lines)
- `src/pages/jpp/JppOverviewPage.tsx` (873 lines)
- `src/pages/jpp/JppUsersPage.tsx` (850 lines)
- *(and 28 additional files in this module)*

#### Key Hardcoded Malay UI Strings (Sample):
- `"Makluman Global"`
- `"Pusat penyiaran notis seluruh portal. Bina pengumuman mandatori atau hebahan biasa menggunakan Modul Popout Bersepadu."`
- `"Cipta Hebahan Baharu"`
- `"Tajuk Notis"`
- `"Sasaran Pengguna"`
- `"Semua (Pelajar & Staf)"`
- `"Pelajar Sahaja"`
- `"Staf Sahaja"`
- `"Kandungan Utama"`
- `"Pilihan Ikon"`
- `"Info Umum"`
- `"Amaran / Penting"`
- `"Hadiah / Imbuhan"`
- `"Sorotan utama"`
- `"Sorakan / Promosi"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Contoh: Kemaskini Alamat Rumah"`
- `"Pilih sasaran"`
- `"Penerangan terperinci notis..."`
- `"Pilih Ikon"`
- `"https://forms.gle/..."`
- `"Padam Makluman Hebahan"`
- `"Adakah anda pasti untuk memadam makluman ini? Semua jawapan borang atau respon pelajar yang berkaitan akan turut terpadam secara kekal."`
- `"Hantar Notifikasi Push Hebahan"`
- `"Adakah anda pasti mahu menghantar notifikasi push ini kepada semua pengguna bersasar? Tindakan ini akan menyiarkan makluman ke peranti pengguna serta-merta."`
- `"Permohonan Kamsis"`

#### Key Toast Notifications:
- `"Gagal memuat turun senarai makluman"`
- `"Sila isi tajuk dan kandungan"`
- `"Memuat naik imej..."`
- `"Hebahan berjaya dikemas kini."`
- `"Hebahan berjaya dicipta."`
- `"Ralat mengemaskini status"`
- `"Status dikemaskini"`
- `"Gagal memadam makluman."`
- `"Makluman berjaya dipadam."`
- `"Menghantar notifikasi push..."`

---

### Module: `karnival`

- **Scale:** 10 files, 2,897 lines of code
- **Total Hardcoded UI Elements:** 94 JSX strings, 10 props/placeholders, 13 toast messages
- **Target Namespace:** `src/locales/{en,ms}/karnival.json`

#### Top Files in this Module:
- `src/pages/karnival/KarnivalScoreboard.tsx` (547 lines)
- `src/pages/karnival/admin/KarnivalAdminBooths.tsx` (414 lines)
- `src/pages/karnival/admin/KarnivalAdminDashboard.tsx` (393 lines)
- `src/pages/karnival/KarnivalVotePage.tsx` (304 lines)
- `src/pages/karnival/KarnivalLandingPage.tsx` (261 lines)
- `src/pages/karnival/admin/KarnivalAdminEdition.tsx` (233 lines)
- `src/pages/karnival/admin/KarnivalAdminCategories.tsx` (221 lines)
- `src/pages/karnival/admin/KarnivalAdminResults.tsx` (195 lines)
- `src/pages/karnival/KarnivalLayout.tsx` (192 lines)
- `src/pages/karnival/admin/KarnivalAdminLayout.tsx` (137 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Cipta edisi Karnival dahulu"`
- `"Tambah Booth"`
- `"Kategori"`
- `"Pilih kategori..."`
- `"No. Booth"`
- `"Tema Booth"`
- `"Penerangan (optional)"`
- `"Gambar Booth"`
- `") : ("`
- `"Batal"`
- `"Belum ada booth dalam kategori ini"`
- `"PNG"`
- `"Edit"`
- `"Kategori Pertandingan"`
- `"Tambah Kategori"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Kelab Muzik POLISAS"`
- `"B-01"`
- `"Dunia Fantasi"`
- `"Huraikan booth ini..."`
- `"Booth Paling Kreatif"`
- `"Huraikan kriteria penilaian..."`
- `"Hari Karnival JPP POLISAS 2025"`
- `"Bersama Lebih Berjaya"`
- `"Balik ke Portal"`
- `"Muat semula"`

#### Key Toast Notifications:
- `"Upload gagal:"`
- `"Gambar berjaya dimuatnaik!"`
- `"Nama booth/kelab diperlukan"`
- `"Pilih kategori"`
- `"Nama booth ini sudah wujud dalam kategori yang sama! Tukar nama atau pilih kategori lain."`
- `"Booth dipadam"`
- `"Nama kategori diperlukan"`
- `"Kategori dipadam"`
- `"Nama edisi diperlukan"`
- `"Edisi berjaya dicipta!"`

---

### Module: `kebajikan`

- **Scale:** 15 files, 9,571 lines of code
- **Total Hardcoded UI Elements:** 317 JSX strings, 101 props/placeholders, 47 toast messages
- **Target Namespace:** `src/locales/{en,ms}/kebajikan.json`

#### Top Files in this Module:
- `src/pages/kebajikan/KebajikanFoodBankPage.tsx` (2,755 lines)
- `src/pages/kebajikan/KebajikanSubmitPage.tsx` (1,282 lines)
- `src/pages/kebajikan/KebajikanReportPage.tsx` (1,129 lines)
- `src/pages/kebajikan/KebajikanTicketDetail.tsx` (948 lines)
- `src/pages/kebajikan/KebajikanSettingsPage.tsx` (638 lines)
- `src/pages/kebajikan/KebajikanStudentChat.tsx` (623 lines)
- `src/pages/kebajikan/KebajikanMyTickets.tsx` (360 lines)
- `src/pages/kebajikan/KebajikanPublicStats.tsx` (309 lines)
- `src/pages/kebajikan/KebajikanHubPage.tsx` (308 lines)
- `src/pages/kebajikan/KebajikanSidebar.tsx` (272 lines)
- *(and 5 additional files in this module)*

#### Key Hardcoded Malay UI Strings (Sample):
- `"Berikut adalah ringkasan sistem aduan pelajar hari ini."`
- `"Trend Aduan Bulanan"`
- `"Diterima vs Diselesaikan — 6 bulan"`
- `"Laporan Penuh"`
- `"0 ? ("`
- `") : ("`
- `"Belum ada data"`
- `"Notifikasi"`
- `"0 &&"`
- `"0 && ("`
- `"Baca Semua"`
- `"Tiada notifikasi baharu"`
- `"Tiket Memerlukan Tindakan"`
- `"Baru, Diescalate & Dibuka Semula"`
- `"Semua Tiket"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Contoh: 011-2345678"`
- `"Contoh: 1800"`
- `"Contoh: Baki perbelanjaan terhad sebelum elaun/ptptn diterima"`
- `"Contoh: Blok B3-12 (Kamsis) atau No 14, Lorong Semambu"`
- `"Ketik Nama atau No. Matrik kawan (Cth: 06DKM... atau Ali)..."`
- `"Nama Penuh Rakan"`
- `"No. Matrik (Cth: 06DKM23F1001)"`
- `"Padam"`
- `"Cari barangan..."`
- `"Nama penuh seperti dalam kad matrik"`

#### Key Toast Notifications:
- `"Ralat semasa memuatkan data Food Bank."`
- `"Rakan serumah dengan nombor matrik ini telah dimasukkan."`
- `"Sila masukkan nama dan nombor matrik rakan serumah."`
- `"Rakan serumah ditambah! Kuota anda meningkat."`
- `"Rakan serumah dikeluarkan."`
- `"Sesi permohonan ditutup buat masa ini."`
- `"Maaf, tiada baki stok barangan di pusat edaran terpilih."`
- `"Permohonan Food Bank telah dibatalkan."`
- `"Gagal membatalkan permohonan:"`
- `"Sila log masuk terlebih dahulu."`

---

### Module: `keusahawanan`

- **Scale:** 14 files, 9,893 lines of code
- **Total Hardcoded UI Elements:** 410 JSX strings, 64 props/placeholders, 56 toast messages
- **Target Namespace:** `src/locales/{en,ms}/keusahawanan.json`

#### Top Files in this Module:
- `src/pages/keusahawanan/pos/PosProductPage.tsx` (1,521 lines)
- `src/pages/keusahawanan/UrusPerniagaanPage.tsx` (1,148 lines)
- `src/pages/keusahawanan/KeusahawananDashboard.tsx` (1,133 lines)
- `src/pages/keusahawanan/BusinessShiftModule.tsx` (1,078 lines)
- `src/pages/keusahawanan/pos/PosOrderPage.tsx` (975 lines)
- `src/pages/keusahawanan/KeusahawananProgram.tsx` (807 lines)
- `src/pages/keusahawanan/KeusahawananAdminPanel.tsx` (709 lines)
- `src/pages/keusahawanan/pos/PosStatsPage.tsx` (661 lines)
- `src/pages/keusahawanan/KeusahawananLayout.tsx` (566 lines)
- `src/pages/keusahawanan/KeusahawananOnboarding.tsx` (359 lines)
- *(and 4 additional files in this module)*

#### Key Hardcoded Malay UI Strings (Sample):
- `"Akses Ditolak"`
- `"Halaman ini"`
- `"khusus untuk Exco Keusahawanan"`
- `"dan MT JPP yang           bertanggungjawab ke atas unit ini."`
- `"Hubungi Ketua Exco Keusahawanan untuk mendapatkan akses."`
- `"0 && ("`
- `"Tolak"`
- `"Terima"`
- `"Awak ada"`
- `"permintaan tukar syif yang sedang menunggu respons."`
- `"Minggu"`
- `"Kembali ke minggu ini"`
- `"Memuatkan jadual..."`
- `") : ("`
- `") : canManage ? ("`

#### Key Hardcoded Placeholders & Prop Labels:
- `"cth: Ada kelas pada masa tersebut, ujian, dll..."`
- `"0.00"`
- `"Nota tambahan..."`
- `"Nota..., isu yang berlaku, dll."`
- `"Cari nama perniagaan, pemilik, no. matric..."`
- `"Cari nama pengguna..."`
- `"Contoh: Koperasi Mahasiswa Polisas"`
- `"Pilih Kategori..."`
- `"Apakah produk/servis yang anda tawarkan? Apakah keunikan perniagaan ini?"`
- `"Contoh: 202101000001 /"`

#### Key Toast Notifications:
- `"Gagal simpan:"`
- `"Syif disimpan!"`
- `"Gagal padam."`
- `"Syif dipadamkan."`
- `"Gagal hantar request:"`
- `"Permintaan tukar syif dihantar!"`
- `"Tukar syif diterima!"`
- `"Permintaan ditolak."`
- `"Gagal buka kedai:"`
- `"Kedai berjaya dibuka!"`

---

### Module: `klk`

- **Scale:** 7 files, 3,291 lines of code
- **Total Hardcoded UI Elements:** 160 JSX strings, 31 props/placeholders, 35 toast messages
- **Target Namespace:** `src/locales/{en,ms}/klk.json`

#### Top Files in this Module:
- `src/pages/klk/KlkSettingsPage.tsx` (1,126 lines)
- `src/pages/klk/KlkDashboard.tsx` (842 lines)
- `src/pages/klk/KlkResidencyFormPage.tsx` (423 lines)
- `src/pages/klk/KlkPublicStats.tsx` (332 lines)
- `src/pages/klk/PolyRentAdmin.tsx` (258 lines)
- `src/pages/klk/KlkSidebar.tsx` (197 lines)
- `src/pages/klk/KlkLayout.tsx` (113 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Edit Rekod Kediaman"`
- `"Status Kediaman"`
- `"Dalam KAMSIS"`
- `"Luar Kampus"`
- `"No. Telefon"`
- `"Jabatan / Program"`
- `"Kawasan Kediaman"`
- `"-- Pilih kawasan --"`
- `"Lain-lain"`
- `"Nyatakan Kawasan"`
- `"Alamat Kediaman"`
- `"Cadangan / Nota"`
- `"Sumber Data"`
- `"App (Website)"`
- `"Google Form"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"NAMA PENUH"`
- `"22DCS12345"`
- `"01X-XXXXXXXX"`
- `"DCS / DEE / dll"`
- `"Nama kawasan..."`
- `"No. 12, Jalan Semambu 1..."`
- `"Nota tambahan..."`
- `"Cari nama / matrik..."`
- `"Edit rekod"`
- `"Nama Pelajar"`

#### Key Toast Notifications:
- `"Nama dan No. Matrik wajib diisi."`
- `"Rekod berjaya dikemaskini!"`
- `"Anda tidak mempunyai akses ke modul ini."`
- `"Database belum sedia."`
- `"Tiada data untuk export."`
- `"Export berjaya!"`
- `"Gagal export."`
- `"Gagal simpan. Cuba lagi."`
- `"Sila isi alamat kediaman."`
- `"Sila pilih kawasan kediaman."`

---

### Module: `makmp`

- **Scale:** 3 files, 5,637 lines of code
- **Total Hardcoded UI Elements:** 208 JSX strings, 31 props/placeholders, 0 toast messages
- **Target Namespace:** `src/locales/{en,ms}/makmp.json`

#### Top Files in this Module:
- `src/pages/makmp/MakmpPublicFormPage.tsx` (3,002 lines)
- `src/pages/makmp/MakmpJuryPortalPage.tsx` (1,696 lines)
- `src/pages/makmp/MakmpStatusTrackingPage.tsx` (939 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Tiada anugerah untuk dipaparkan."`
- `"Portal Pegawai Penilai MAKMP"`
- `"Sila masukkan Kod PIN 6-Digit yang diperuntukkan bagi kategori anugerah anda untuk memulakan semakan."`
- `"Kod PIN Juri (6-Digit)"`
- `"Sahkan PIN & Masuk"`
- `"JURI"`
- `"Keluar"`
- `"Semakan Penilaian"`
- `"Keputusan & Ranking"`
- `") : ("`
- `"1 && ("`
- `"Semua Kumpulan Kategori"`
- `"0 && ("`
- `"Semua Anugerah"`
- `"Memuat turun permohonan anugerah pelajar..."`

#### Key Hardcoded Placeholders & Prop Labels:
- `"••••••"`
- `"Portal Juri"`
- `"Muat Semula Senarai"`
- `"Cari Calon / Matrik / Anugerah..."`
- `"Klik untuk skrin penuh"`
- `"Pratonton Dokumen"`
- `"Kembalikan merit ke nilai formula automatik"`
- `"Catatan juri atau ulasan kepada calon..."`
- `"Besarkan"`
- `"Kecilkan"`

---

### Module: `polymaps`

- **Scale:** 1 files, 3,280 lines of code
- **Total Hardcoded UI Elements:** 68 JSX strings, 11 props/placeholders, 12 toast messages
- **Target Namespace:** `src/locales/{en,ms}/polymaps.json`

#### Top Files in this Module:
- `src/pages/polymaps/PolyMapsPage.tsx` (3,280 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Semua"`
- `"Kafe"`
- `"Surau"`
- `"Tandas"`
- `"0 && ("`
- `"360 AKTIF"`
- `"Tidak jumpa tempat yang anda cari?"`
- `"Maklumkan kepada JPP"`
- `"Google Maps"`
- `"Lokasi Anda"`
- `"Direktori"`
- `"Terokai Bangunan & Kelas"`
- `"Zon / Jabatan"`
- `"Fasiliti Utama"`
- `"Memandu Arah Ke"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Cari kelas (Cth: A301, JKM)..."`
- `"Kembali ke lokasi saya"`
- `"Tarik atau tekan untuk tukar saiz paparan"`
- `"Buka 360 Panorama"`
- `"Lipat ke bawah"`
- `"Tutup maklumat"`
- `"Buka 360 Panorama Penuh"`
- `"Kongsi Lokasi"`
- `"Contoh: A302, Makmal CAD 2"`
- `"Masukkan nama bangunan/blok"`

#### Key Toast Notifications:
- `"Kebenaran kompas ditolak. Navigasi tetap berfungsi tanpa penunjuk arah."`
- `"Sila log masuk untuk membuat aduan."`
- `"Sila isi nama tempat."`
- `"Aduan berjaya dihantar! Terima kasih atas bantuan anda."`
- `"Gagal menghantar aduan."`
- `"Hari hujan! Mod laluan berbumbung diaktifkan secara automatik."`
- `"Gagal membuat carian."`
- `"GPS tidak disokong oleh peranti anda."`
- `"Lokasi berjaya dikesan!"`
- `"Sila benarkan akses GPS untuk fungsi laluan."`

---

### Module: `polymart`

- **Scale:** 16 files, 11,318 lines of code
- **Total Hardcoded UI Elements:** 310 JSX strings, 55 props/placeholders, 69 toast messages
- **Target Namespace:** `src/locales/{en,ms}/polymart.json`

#### Top Files in this Module:
- `src/pages/polymart/vendor/VendorOrdersPipeline.tsx` (1,573 lines)
- `src/pages/polymart/PolyMartProductDetail.tsx` (1,451 lines)
- `src/pages/polymart/vendor/VendorCatalogManager.tsx` (952 lines)
- `src/pages/polymart/PolyMartHome.tsx` (947 lines)
- `src/pages/polymart/PolyMartVendorStorefront.tsx` (846 lines)
- `src/pages/polymart/vendor/VendorAnalyticsPromo.tsx` (831 lines)
- `src/pages/polymart/PolyMartMyOrders.tsx` (804 lines)
- `src/pages/polymart/PolyMartVendorDashboard.tsx` (799 lines)
- `src/pages/polymart/PolyMartAdminPanel.tsx` (641 lines)
- `src/pages/polymart/PolyMartLayout.tsx` (586 lines)
- *(and 6 additional files in this module)*

#### Key Hardcoded Malay UI Strings (Sample):
- `"Laporan Baru"`
- `"Sebab Laporan"`
- `"Laporan oleh:"`
- `"Abaikan"`
- `"Keluarkan Produk"`
- `"Urus Iklan & Penaja"`
- `"No WhatsApp:"`
- `"Iklan Baru"`
- `"Tiada iklan buat masa ini"`
- `") : ("`
- `"Lulus"`
- `"0 && ("`
- `"Berkait"`
- `"Tajuk"`
- `"Gambar Banner (Horizontal)"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"601..."`
- `"Cth: Maxis Student Promo"`
- `"https://..."`
- `"Atau taip waktu kustom sendiri..."`
- `"Wishlist"`
- `"Cari peniaga atau jenama..."`
- `"Kembali"`
- `"Cari makanan, minuman, servis, pakaian..."`
- `"Panduan PolyMart"`
- `"Troli Beli-belah"`

#### Key Toast Notifications:
- `"Laporan diabaikan"`
- `"No. Telefon dikemas kini"`
- `"Iklan berjaya diluluskan (Aktif)!"`
- `"Gagal kelulusan:"`
- `"Tajuk & Gambar diperlukan"`
- `"Iklan dikemas kini"`
- `"Iklan baharu ditambah"`
- `"Ralat menyimpan iklan:"`
- `"Iklan dipadam"`
- `"Ralat memadam iklan"`

---

### Module: `polyrent`

- **Scale:** 8 files, 3,010 lines of code
- **Total Hardcoded UI Elements:** 129 JSX strings, 21 props/placeholders, 25 toast messages
- **Target Namespace:** `src/locales/{en,ms}/polyrent.json`

#### Top Files in this Module:
- `src/pages/polyrent/PolyRentPage.tsx` (661 lines)
- `src/pages/polyrent/PolyRentForm.tsx` (658 lines)
- `src/pages/polyrent/PolyRentMyAdsModal.tsx` (575 lines)
- `src/pages/polyrent/PolyRentDetailModal.tsx` (434 lines)
- `src/pages/polyrent/PolyRentCalculatorModal.tsx` (199 lines)
- `src/pages/polyrent/PolyRentChatModal.tsx` (198 lines)
- `src/pages/polyrent/PolyRentReverseForm.tsx` (180 lines)
- `src/pages/polyrent/PolyRentSidebar.tsx` (105 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Kalkulator Bil"`
- `"Kira Pecahan Ahli Rumah"`
- `"Jumlah Ahli Rumah"`
- `"Berapa orang yang berkongsi bayar?"`
- `"Masukkan Jumlah Bil (Bulan Ini)"`
- `"Sewa Rumah"`
- `"Elektrik (TNB)"`
- `"Air (PAIP)"`
- `"Internet / WiFi"`
- `"Lain-lain / Utiliti"`
- `"Reset Borang"`
- `"Jumlah Keseluruhan"`
- `"Seorang Perlu Bayar"`
- `"Kongsi ke Group WhatsApp"`
- `"Mesej Langsung"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"0.00"`
- `"Taip mesej..."`
- `"Disahkan oleh KLK"`
- `"Sila jelaskan sebab anda melaporkan iklan ini..."`
- `"Cth: Bilik Sewa Kosong Balok (Lelaki)"`
- `"150"`
- `"300"`
- `"Cth: Bilik Master (Sharing 2 orang), ada katil dan tilam..."`
- `"Cth: Mesin basuh, Peti sejuk, WiFi percuma..."`
- `"Cth: Pembersih, boleh bayar sewa on time, tidak merokok..."`

#### Key Toast Notifications:
- `"Gagal menghantar mesej"`
- `"Sila log masuk untuk melaporkan iklan."`
- `"Sila nyatakan sebab aduan."`
- `"Aduan berjaya dihantar untuk semakan JPP."`
- `"Sila log masuk untuk memberi rating."`
- `"Terima kasih! Rating anda berjaya direkodkan."`
- `"Draf disimpan sebelum ini dipulihkan."`
- `"Sila lengkapkan semua medan wajib (Tajuk, Alamat, Sewa, Hubungi)"`
- `"Iklan berjaya diterbitkan!"`
- `"Beberapa gambar melebihi 5MB diabaikan"`

---

### Module: `polyrider`

- **Scale:** 6 files, 5,979 lines of code
- **Total Hardcoded UI Elements:** 205 JSX strings, 21 props/placeholders, 73 toast messages
- **Target Namespace:** `src/locales/{en,ms}/polyrider.json`

#### Top Files in this Module:
- `src/pages/polyrider/PolyRiderHome.tsx` (2,651 lines)
- `src/pages/polyrider/PolyRiderDashboard.tsx` (1,821 lines)
- `src/pages/polyrider/admin/PolyRiderAdminDashboard.tsx` (933 lines)
- `src/pages/polyrider/SOSContactsManager.tsx` (282 lines)
- `src/pages/polyrider/PolyRiderSuspended.tsx` (210 lines)
- `src/pages/polyrider/PolyRiderLayout.tsx` (82 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `"Memuatkan data admin..."`
- `"Kawalan KLK"`
- `"Pengurusan PolyRider"`
- `"Pengurusan Rider"`
- `"Preset"`
- `"0 && ("`
- `"Tetapan"`
- `"Menunggu Kelulusan"`
- `"Rider Berdaftar"`
- `"Permohonan Baharu"`
- `"Tiada Permohonan"`
- `"Lihat Resit"`
- `"Semua Rider"`
- `"Rider"`
- `"Kenderaan"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Kamsis D"`
- `"Kolej Kediaman D, POLISAS"`
- `"3.8333"`
- `"103.3167"`
- `"Cth: 09-9000000"`
- `"Cth: https://chat.whatsapp.com/..."`
- `"Hubungi JPP / Lapor Bug"`
- `"Cth: CEH1234"`
- `"Mesej..."`
- `"Ulasan ringkas (opsional)..."`

#### Key Toast Notifications:
- `"Gagal memuat turun senarai rayuan:"`
- `"Gagal memproses rayuan."`
- `"Kes SOS diselesaikan."`
- `"Gagal menanda selesai."`
- `"SOS berjaya ditanda, TEPATI gagal menggantung akaun:"`
- `"SOS ditanda palsu & akaun pelapor digantung 24 jam."`
- `"Gagal memproses tindakan:"`
- `"No. telefon KLK dikemaskini!"`
- `"Pautan WhatsApp dikemaskini!"`
- `"QR Code berjaya dimuat naik!"`

---

### Module: `polyservices`

- **Scale:** 2 files, 2,876 lines of code
- **Total Hardcoded UI Elements:** 62 JSX strings, 27 props/placeholders, 32 toast messages
- **Target Namespace:** `src/locales/{en,ms}/polyservices.json`

#### Top Files in this Module:
- `src/pages/polyservices/PolySuaraPage.tsx` (2,714 lines)
- `src/pages/polyservices/PolySuaraPoll.tsx` (162 lines)

#### Key Hardcoded Malay UI Strings (Sample):
- `";   userDownvotes: Set"`
- `"JPP RASMI"`
- `") : isCommentDeletedByAuthor ? ("`
- `") : ("`
- `"Balas"`
- `"Padam Ulasan"`
- `"Bantuan Kebajikan"`
- `"Lapor Ulasan"`
- `"Batal"`
- `"0 && ("`
- `"Anon Mode"`
- `"Poly"`
- `"Suara"`
- `"Ruang selamat untuk meluahkan perasaan. 100% Rahsia."`
- `"Modul Ditutup Sementara"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Balas komen"`
- `"Suka ulasan"`
- `"Padam Ulasan"`
- `"Pilihan ulasan"`
- `"Padam ulasan"`
- `"Eskalasi kecemasan ke Kebajikan (Rahsia)"`
- `"Eskalasi kecemasan ke Kebajikan"`
- `"Lapor ulasan"`
- `"Tulis luahan kampus baharu"`
- `"Tutup"`

#### Key Toast Notifications:
- `"Dikeluarkan dari simpanan"`
- `"Disimpan ke penanda buku"`
- `"Sila muat naik format gambar sahaja."`
- `"Gagal memuatkan luahan."`
- `"Luahan anda berjaya dikongsi secara rahsia!"`
- `"Gagal menghantar luahan."`
- `"Sila log masuk untuk memberi reaksi."`
- `"Gagal memproses sokongan."`
- `"Sila log masuk untuk mengundi."`
- `"Gagal memproses undian."`

---

### Module: `polytask`

- **Scale:** 11 files, 2,635 lines of code
- **Total Hardcoded UI Elements:** 112 JSX strings, 10 props/placeholders, 30 toast messages
- **Target Namespace:** `src/locales/{en,ms}/polytask.json`

#### Top Files in this Module:
- `src/pages/polytask/PolyTaskJobDetail.tsx` (791 lines)
- `src/pages/polytask/admin/PolyTaskAdmin.tsx` (360 lines)
- `src/pages/polytask/PolyTaskBoard.tsx` (288 lines)
- `src/pages/polytask/PolyTaskChatModal.tsx` (204 lines)
- `src/pages/polytask/TaskerProfileModal.tsx` (186 lines)
- `src/pages/polytask/PolyTaskLayout.tsx` (170 lines)
- `src/pages/polytask/PolyTaskMyBids.tsx` (146 lines)
- `src/pages/polytask/PolyTaskReviewModal.tsx` (137 lines)
- `src/pages/polytask/PolyTaskMyJobs.tsx` (126 lines)
- `src/pages/polytask/PolyTaskDisputeModal.tsx` (124 lines)
- *(and 1 additional files in this module)*

#### Key Hardcoded Malay UI Strings (Sample):
- `"DIBUKA"`
- `"SEDANG JALAN"`
- `";       case 'COMPLETED': return"`
- `"SELESAI"`
- `";       case 'CANCELLED': return"`
- `"DIBATALKAN"`
- `"Admin PolyTask"`
- `"Kawalan Ekonomi Gig"`
- `"Semua Status"`
- `"0 && ("`
- `"Taburan Status Tugasan"`
- `"Kategori Popular"`
- `"Analitik Waktu Puncak (Heatmap Harian)"`
- `"Waktu yang paling banyak pelajar memuat naik / meminta tugasan dalam sistem."`
- `"Memuatkan data..."`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Cari ID, Tajuk..."`
- `"Modul PolyTask"`
- `"Buka atau tutup fungsi PolyTask kepada pelajar secara global."`
- `"Lihat Butiran"`
- `"Batal Paksa"`
- `"Cari tugasan (Cth: Format Laptop, Beli Makanan...)"`
- `"Taip mesej anda di sini..."`
- `"Cth: Tasker sudah lari dan kerja tidak siap / Peminta enggan membayar upah..."`
- `"Cth: Saya ada laptop tool set dan boleh siapkan malam ni."`
- `"Tulis sedikit ulasan tentang kualiti kerja..."`

#### Key Toast Notifications:
- `"Akses Ditolak. Anda bukan ahli JPP."`
- `"Sedang membatalkan..."`
- `"Gagal membatalkan tugasan"`
- `"Tugasan berjaya dibatalkan"`
- `"Gagal menghantar mesej"`
- `"Sila nyatakan sebab anda melaporkan tugasan ini."`
- `"Gagal menghantar aduan. Sila cuba lagi."`
- `"Aduan dihantar, tetapi status tugasan gagal dikemaskini."`
- `"Aduan berjaya dihantar. Admin JPP akan menyemak kes ini."`
- `"Gagal memuatkan maklumat tugasan"`

---

### Module: `supsas`

- **Scale:** 22 files, 6,913 lines of code
- **Total Hardcoded UI Elements:** 175 JSX strings, 37 props/placeholders, 62 toast messages
- **Target Namespace:** `src/locales/{en,ms}/supsas.json`

#### Top Files in this Module:
- `src/pages/supsas/SupsasScorekeeperPage.tsx` (691 lines)
- `src/pages/supsas/ketua/KetuaDashboard.tsx` (517 lines)
- `src/pages/supsas/admin/AdminSukanPage.tsx` (475 lines)
- `src/pages/supsas/SupsasLandingPage.tsx` (442 lines)
- `src/pages/supsas/admin/AdminJadualPage.tsx` (415 lines)
- `src/pages/supsas/admin/components/AdminBracketPanel.tsx` (415 lines)
- `src/pages/supsas/admin/components/AdminDrawModal.tsx` (354 lines)
- `src/pages/supsas/SupsasScoreboardPage.tsx` (351 lines)
- `src/pages/supsas/components/KnockoutBracket.tsx` (343 lines)
- `src/pages/supsas/BracketPage.tsx` (324 lines)
- *(and 12 additional files in this module)*

#### Key Hardcoded Malay UI Strings (Sample):
- `"Jadual Pertandingan"`
- `"Tambah Perlawanan"`
- `"Semua Sukan"`
- `"Belum ada perlawanan dijadualkan"`
- `") : ("`
- `"Skor"`
- `"Sukan"`
- `"— Pilih Sukan —"`
- `"Pusingan"`
- `"No. Perlawanan"`
- `"Pasukan A"`
- `"— TBD —"`
- `"Pasukan B"`
- `"Tarikh"`
- `"Masa"`

#### Key Hardcoded Placeholders & Prop Labels:
- `"Kemaskini Skor"`
- `"cth: Separuh Akhir"`
- `"cth: Padang A"`
- `"cth: Ditangguh sebab hujan"`
- `"cth: Jabatan Teknologi Maklumat"`
- `"cth: JTM"`
- `"Padam semua fixtures dan mula semula"`
- `"Nama Sukan"`
- `"cth: Bola Sepak"`
- `"Ikon"`

#### Key Toast Notifications:
- `"Sila pilih sukan"`
- `"Gagal simpan:"`
- `"Gagal padam"`
- `"Perlawanan dipadam"`
- `"Tiada perlawanan untuk disalin"`
- `"Senarai PIN Pengadil disalin untuk WhatsApp!"`
- `"Tiada keputusan untuk disimpan"`
- `"Hanya satu pemenang 🥇 Emas dibenarkan"`
- `"Hanya satu pemenang 🥈 Perak dibenarkan"`
- `"Hanya satu pemenang 🥉 Gangsa dibenarkan"`

---

