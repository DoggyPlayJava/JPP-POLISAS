# Pelan Pelaksanaan *Interactive Tour* JPP-POLISAS (menggunakan `react-joyride`)

Dokumen ini merangkumi pelan pelaksanaan terperinci untuk memperkenalkan *interactive guided tour* ke dalam sistem JPP-POLISAS. Memandangkan sistem ini kompleks dan mempunyai banyak sub-modul (PolyRider, PolyTask, PolyMart, dsb.), *tour* ini amat kritikal untuk *onboarding* pelajar baharu.

---

## Fasa 1: Infrastruktur Asas & *Global Tour* (PortalPage)

Fasa ini fokus kepada konfigurasi *library* dan paparan laluan (tour) di halaman utama (PortalPage).

### 1.1 Semakan Library
- Pakej `react-joyride` telah sedia terpasang di dalam projek.
- Pakej ini menyokong kustomasi warna, butang, dan *tooltips* supaya selari dengan tema UI premium JPP-POLISAS.

### 1.2 Pembinaan `SystemTour` Component
- Bina komponen `SystemTour.tsx` di dalam `src/components/ui/` atau `src/components/layout/`.
- Komponen ini akan menyemak `localStorage.getItem('jpp_has_seen_portal_tour')`.
- Jika `false` (atau pengguna baru log masuk buat pertama kali), *tour* akan bermula secara automatik.
- Menyediakan butang fungsi *Skip*, *Next*, dan *Back*.

### 1.3 Pemilihan Elemen (Selectors) di `PortalPage`
Di dalam `PortalPage.tsx`, `PortalNavbar`, dan `BottomNav`, kita akan letakkan *CSS class/id* khusus untuk dijadikan sasaran (*target*) oleh `react-joyride`:

1. **`.tour-navbar-profile`**: Avatar pengguna di Navbar (Menerangkan akses ke Tetapan/Log Keluar).
2. **`.tour-sidebar-toggle`**: Butang Menu (Hamburger) untuk buka *Sidebar*.
3. **`.tour-quick-actions`**: Kad tindakan pantas (Carian, Laporan Kerosakan, JPP Review). Menerangkan cara cepat menggunakan fasiliti sistem.
4. **`.tour-exco-modules`**: Menyasarkan senarai modul utama (Ekonomi, Kamsis, Sukan, dsb.) supaya pelajar tahu di mana platform-platform khusus berada.
5. **`.tour-bottom-nav`**: Menyasarkan navigasi bawah (*Bottom Nav*), khususnya fungsi kecemasan/aduan (SOS/Kebajikan).

### 1.4 *Theme Customization*
Sistem ini direka bentuk dengan estetik premium. Elemen `react-joyride` (Tooltip) akan di-*override* gayanya:
- Menggunakan latar belakang *glassmorphism* atau *dark mode*.
- Fon sepadan (Inter/Outfit).
- Butang aksi berlekuk cantik.

---

## Fasa 2: Pelaksanaan *Tour* Berfokuskan Modul (Module-Specific Tours)

Berdasarkan keputusan reka bentuk sistem terkini, pelaksanaan *tour* bagi sub-modul (Sistem Kelab, PolyMart, e-Akademik, PolyMaps) akan mengikut garis panduan yang ketat seperti berikut:

### 2.1 Polisi Pelaksanaan (Guidelines)
1. **Pendekatan Hibrid (Automatik & Manual)**: *Tour* akan muncul secara automatik pada **kali pertama** pengguna melawat *Dashboard* modul tersebut (menggunakan kawalan `localStorage` berasingan, cth: `jpp_has_seen_kelab_tour`). Di samping itu, satu butang panduan (ikon `?` atau "Bimbingan") akan diletakkan di penjuru atas skrin (*Header*) supaya pengguna boleh mengaktifkan semula *tour* ini pada bila-bila masa yang diperlukan.
2. **Had Penyasaran (Dashboard & Sidebar Sahaja)**: *Tour* **hanya** akan menyasarkan elemen navigasi utama, struktur profil, dan papan pemuka (*dashboard*). Ia **TIDAK** akan masuk ke dalam mana-mana tetingkap timbul (*modals*) atau proses pengisian borang bagi memastikan aliran pengguna tidak diganggu.
3. **Pemprosesan Bersyarat (Role-Adaptive)**: Memandangkan antara muka (UI) mungkin berbeza mengikut peranan (cth: Pengguna Biasa vs AJK Kelab), penyasaran (CSS selectors) akan diletakkan pada elemen umum. Jika terdapat elemen eksklusif, `react-joyride` dipastikan akan melepasi (*skip*) elemen tersebut tanpa mendatangkan ralat (crash) jika ia disembunyikan.
4. **Tiada Sistem Ganjaran**: Fokus tutorial ini kekal teguh kepada objektif pengenalan antaramuka. Tiada integrasi sistem ganjaran merit (*gamifikasi*) untuk mengelakkan eksploitasi oleh pengguna.

### 2.2 Senarai Elemen Sasaran Bagi Modul

#### A. Modul PolyMaps (Navigasi Kampus)
- **`.tour-polymaps-search`**: Ruangan carian fasiliti / dewan kuliah.
- **`.tour-polymaps-filters`**: Tapisan untuk laluan khusus (berbumbung / OKU).
- **`.tour-polymaps-view`**: Interaksi peta navigasi utama.

#### B. Sistem Kelab (EKPP) & Pengurusan Ahli
- **`.tour-kelab-sidebar`**: Navigasi ke bahagian kelab berdaftar dan rekod keahlian.
- **`.tour-kelab-stats`**: Petunjuk statistik pendaftaran kelab dan acara bulanan.
- **`.tour-kelab-list`**: Kawasan interaksi utama yang memaparkan kelab aktif untuk disertai.

#### C. Modul PolyMart & e-Keusahawanan
- **`.tour-polymart-header`**: Akses kepada *dashboard* pengurusan jualan (untuk peniaga).
- **`.tour-polymart-categories`**: Tapisan barangan, makanan, atau perkhidmatan.
- **`.tour-polymart-ads`**: Lokasi siaran iklan tajaan utama (promosi pelajar).

#### D. Modul e-Akademik
- **`.tour-akademik-merit`**: Kad profil atau status baki merit semasa pelajar.
- **`.tour-akademik-history`**: Jadual laporan pendaftaran aktiviti dan sejarah QR.
- **`.tour-akademik-takwim`**: Panduan memuat turun atau menyemak kalendar akademik rasmi.

---

## Fasa 3: Pengurusan Infrastruktur & Memori

1. **Pengurusan *State* Tempatan**: 
   Kunci storan (*storage keys*) mesti dinamakan mengikut format terselaras untuk memudahkan kerja-kerja pembersihan (reset):
   - `jpp_has_seen_portal_tour`
   - `jpp_has_seen_polymaps_tour`
   - `jpp_has_seen_kelab_tour`
   - `jpp_has_seen_polymart_tour`

2. **Mobiliti (Mobile vs Desktop) & Isu Sidebar**: 
   Ini adalah aspek paling kritikal. Elemen di dalam *Sidebar* biasanya tersembunyi (hidden/off-canvas) pada peranti mudah alih. Jika *tour* cuba mencari elemen ini, ia akan rosak atau lari dari skrin. 
   **Taktik Penyelesaian (Responsive Target Selection)**:
   - Kita akan menggunakan pengesanan saiz skrin (`window.innerWidth < 768`).
   - Pada **Desktop**: *Tour* akan menyasarkan elemen sebenar (cth: `.tour-kelab-sidebar-menu`).
   - Pada **Mobile**: *Tour* akan secara dinamik menukar sasaran (*fallback*) kepada Butang Menu Hamburger (cth: `.tour-mobile-hamburger`) dengan mesej: *"Buka menu ini untuk pelbagai fungsi pengurusan"*.
   - Saiz *CustomTooltip* juga telah ditetapkan kepada `w-[calc(100vw-2rem)]` supaya ia tidak terkeluar dari sempadan skrin telefon.

3. **Isu Navigasi Terapung (Fixed Elements)**: 
   Bagi mengelakkan *tour tooltip* daripada terlindung di sebalik *header* atau navigasi bawah, pastikan setiap `SystemTour` ditambah dengan parameter `scrollOffset={200}`.

---

## Langkah Tindakan Seterusnya (Action Plan Sesi Seterusnya)
1. Integrasikan `<SystemTour>` ke dalam komponen susun atur (Layout) bagi modul yang dipersetujui (seperti PolyMaps atau Sistem Kelab).
2. Tetapkan *className* pada komponen *Dashboard & Sidebar* masing-masing.
3. Cipta dan pasangkan butang *Manual Trigger* (`?`) pada *header/topbar* di setiap modul ini.
4. Lakukan semakan silang (cross-check) menggunakan peranan pentadbir (SuperAdmin) dan pengguna biasa (Student).
