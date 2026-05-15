# Panduan Ujian: Sistem Merit V2 & Demerit

Dokumen ini menyediakan langkah-langkah terperinci untuk menguji (stress test) kesemua fungsi baharu yang telah ditambah dalam Sistem Merit V2, termasuk logik *Geofencing*, PIN Dinamik, Modul Demerit, Proses Rayuan, dan Penutupan Kohort (Arkib).

Sila ikuti langkah di bawah secara berurutan. Anda perlukan **dua akaun (atau dua browser)** untuk pengujian optimum:
1. **Akaun EXCO/ADMIN** (Akaun anda)
2. **Akaun PELAJAR** (Atau mana-mana ahli biasa)

---

## Fasa 1: Ujian Imbasan QR (GPS & Geofencing)

**Objektif:** Mengesahkan pelajar hanya boleh merekod merit jika mereka berada berhampiran lokasi majlis, atau memasukkan PIN pengesahan yang betul sekiranya GPS gagal/jauh.

### Langkah-langkah:
1. **(Akaun EXCO): Jana QR Kod**
   * Buka e-Akademik dan pergi ke **Penjana QR Link** (boleh diakses melalui JPP Dashboard atau ikon QR terapung).
   * Pilih mana-mana pautan (contoh: Pendaftaran Acara).
   * Semasa mengisi borang, pastikan anda mengisi bahagian **Lokasi (Latitude & Longitude)** dan **PIN Pengesahan**. Anda boleh tekan butang "Ambil Lokasi Semasa" untuk dapatkan koordinat semasa anda.
   * Tetapkan Radius (contoh: `150` meter).
   * Jana dan salin link/QR tersebut.

2. **(Akaun PELAJAR): Ujian Dalam Radius**
   * Buka link QR tadi di telefon atau *browser* (pastikan *location permission* dibenarkan oleh *browser*).
   * Oleh kerana koordinat EXCO dan PELAJAR (jika anda test di peranti sama) adalah sama, sistem akan membenarkan tuntutan merit serta-merta tanpa meminta PIN.

3. **(Akaun PELAJAR): Ujian Luar Radius (Wajib Minta PIN)**
   * (Akaun EXCO): Ulang langkah 1, tetapi letakkan koordinat rekaan (contoh: letak koordinat Kuala Lumpur: Lat `3.1390`, Lng `101.6869`).
   * (Akaun PELAJAR): Buka link QR yang baharu ini.
   * Sistem patut mendapati jarak anda melebihi 150m, dan **menghalang tuntutan terus**. Sebaliknya, satu kotak **pengesahan PIN** 4-digit akan muncul.
   * Masukkan PIN yang salah: Patut keluar `Error/PIN Salah`.
   * Masukkan PIN yang sah: Sistem patut berjaya merekodkan merit.

---

## Fasa 2: Modul Demerit (Pemberian Penalti)

**Objektif:** EXCO memberi demerit kepada pelajar dan melihat kesan pada dashboard pelajar.

### Langkah-langkah:
1. **(Akaun EXCO):**
   * Masuk ke menu **Pengurusan Demerit** (dalam sidebar e-Akademik).
   * Di tab **Rekod Baru**, taipkan nama atau no matrik **Akaun PELAJAR** dalam ruangan carian.
   * Pilih pelajar tersebut.
   * Masukkan alasan kesalahan (contoh: *"Bising selepas jam 12 malam"*).
   * Masukkan jumlah pemotongan merit (contoh: `10`). Pautan bukti (Google Drive/Gambar) adalah pilihan.
   * Tekan **Rekod Demerit**. *Toast success* akan muncul.

2. **(Akaun PELAJAR):**
   * Log masuk sebagai pelajar dan pergi ke halaman **Merit Saya** (e-Akademik).
   * Anda patut melihat jumlah merit keseluruhan telah *dipotong*.
   * Pada kad *"Transaksi Sesi Semasa"*, anda patut nampak satu rekod Demerit berwarna merah dengan ikon *Shield Alert* (contoh: `-10` markah).
   * Akan ada butang **Buat Rayuan / Bantahan** pada rekod tersebut.

---

## Fasa 3: Proses Rayuan Pelajar

**Objektif:** Pelajar membantah demerit, dan Exco meluluskan rayuan tersebut.

### Langkah-langkah:
1. **(Akaun PELAJAR):**
   * Tekan butang **Buat Rayuan / Bantahan** pada rekod demerit tadi.
   * Isi borang rayuan dengan logik bantahan (contoh: *"Saya tidur awal semalam, itu jiran saya"*). Boleh letak *link* bukti jika mahu.
   * Hantar rayuan.
   * Status rayuan pada rekod tersebut patut bertukar kepada **DIPROSES** (Warna Kuning).

2. **(Akaun EXCO):**
   * Pergi semula ke halaman **Pengurusan Demerit** dan buka tab **Rayuan Pelajar**.
   * Anda sepatutnya melihat rayuan yang baharu masuk dengan status `PENDING`.
   * Terdapat info lengkap: nama pelajar, alasan Exco beri demerit, dan alasan rayuan pelajar.
   * Tekan **Tolak**. Sistem akan rekodkan sebagai ditolak, dan di paparan pelajar ia akan bertukar warna merah (`DITOLAK`). Tiada *refund* merit berlaku.

3. **Ujian Refund (Lulus Rayuan):**
   * Ulang Fasa 2 untuk berikan satu lagi demerit kepada pelajar, dan pelajar buat rayuan baharu.
   * Kali ini, Exco tekan butang **Terima & Refund**.
   * Sistem patut menukar status kepada `APPROVED` (Hijau).
   * Semak profil/baki merit pelajar. Sistem secara automatik mencipta transaksi *Refund* (Nilai positif) dan mengembalikan semula baki merit mereka.

---

## Fasa 4: Arkib / Penutupan Kohort (Admin)

**Objektif:** Reset semua baki merit ke `0` untuk permulaan semester/sesi baru, sambil memelihara log transaksi lama dalam jadual sejarah.

### Langkah-langkah:
1. **(Akaun EXCO/ADMIN):**
   * Dalam modul **Pengurusan Demerit**, pergi ke tab **Tetapan** (Hanya muncul jika profil anda adalah `ADMIN` atau `SUPER_ADMIN`).
   * Anda akan nampak borang **Tutup Kohort Merit**.
   * Masukkan nama sesi, sebagai contoh: `Sesi 1 2024/2025`.
   * Tekan **Sahkan Tutup Kohort** dan sahkan amaran (Popup *Confirm*).

2. **Pengesahan (Akaun PELAJAR / EXCO):**
   * Pergi ke muka hadapan portal JPP dan semak `Badge` jumlah Merit anda. Ia sepatutnya menjadi **`0`**.
   * Buka halaman **Merit Saya**. 
   * Transaksi `Sesi Semasa` akan menjadi **Kosong** (tiada rekod).
   * Akan muncul satu komponen baharu: **Sejarah Merit Sesi Lepas**. Di dalam kotak ini, anda akan nampak lencana bertulis `Sesi 1 2024/2025` berserta jumlah merit asal yang telah dikumpul sebelum operasi "Tutup Kohort" tadi dilakukan.

---

*Jika semua 4 fasa ini berjalan dengan lancar tanpa ralat, maka logik teras Sistem Merit V2 telah stabil 100%.*
