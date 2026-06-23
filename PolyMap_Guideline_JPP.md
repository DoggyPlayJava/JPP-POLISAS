# 🗺️ Panduan Lengkap & Cheatsheet Pengurusan PolyMap JPP
*Panduan Mudah, Langkah-Demi-Langkah & Bebas Teknikal untuk Ahli JPP POLISAS*

Dokumen ini ditulis khusus dalam bahasa Melayu ringkas untuk menyelesaikan kekeliruan ahli JPP semasa menambah atau mengemas kini data bangunan, bilik, tandas, surau, dan kafe di dalam sistem PolyMap.

---

## 💡 Punca Utama Kekeliruan Sebelum Ini

Sebelum kita mula, ini adalah 3 perkara penting mengapa data yang dimasukkan sebelum ini kadang-kadang "hilang" atau tidak berfungsi dengan betul:

1. **Perbezaan Bangunan vs Bilik/Lokasi:**
   * **Bangunan (Building):** Tempat yang mempunyai koordinat GPS di atas peta (cth: Blok A, Pusat Pelajar).
   * **Kelas / Lokasi (Location):** Bilik atau kemudahan yang berada *di dalam* bangunan tersebut (cth: Tandas Aras Bawah Blok A, Bilik Kuliah A301).
2. **Kekangan Sistem Penapis (Quick Filters):**
   * Di peta utama pelajar, ada 3 butang pintas: **Surau, Tandas, Kafe**.
   * Sistem menapis data ini secara automatik berdasarkan perkataan yang anda taip. Jika tersalah eja kategori atau tag, ia tidak akan dipaparkan.
3. **Tandas Sengaja Disembunyikan Secara Default:**
   * Untuk mengelakkan peta serabut dengan berpuluh-puluh ikon tandas, sistem **menyembunyikan** ikon tandas dari peta utama secara lalai.
   * Ikon tandas hanya akan muncul apabila pelajar menekan butang tapisan "Tandas" atau membuat carian khusus. Jadi, jangan risau jika ikon tandas tidak kelihatan sejurus selepas dimasukkan!

---

## 🏗️ Bahagian 1: Dua Cara Memasukkan Fasiliti (Surau / Tandas / Kafe)

Sebelum anda mula memasukkan data di panel Admin, tentukan terlebih dahulu jenis fasiliti tersebut:

### Cara A: Sebagai Bangunan Berasingan (Peta Utama)
*Gunakan cara ini jika fasiliti tersebut mempunyai bangunan/struktur sendiri yang terasing (Contoh: Surau Al-Hidayah POLISAS, Kafeteria Pusat, atau Pondok Tandas di luar bangunan).*

1. Buka tab **Bangunan** -> Klik **+ Tambah Bangunan**.
2. Isi maklumat berikut:
   * **Nama Bangunan:** Tulis nama penuh yang mudah difahami (cth: `Surau Al-Hidayah (Utama)`).
   * **Kod (Singkatan):** Tulis kod ringkas untuk dipaparkan pada pin peta (cth: `SURAU`).
   * **Nama Zon (Pilihan):** Masukkan nama zon untuk mengumpulkan bangunan (cth: `Zon JKE`).
   * **Latitude & Longitude:** Sentuh pada peta yang disediakan untuk menetapkan koordinat GPS secara automatik.
   * **Imej Dron / Pelan Lantai / Pintu Masuk:** Muat naik gambar pintu masuk atau bangunan melalui butang "Pilih Gambar".
3. **PENTING: Bahagian Fasiliti Utama (Waktu Operasi):**
   * Tandakan (Tick) kotak `Bangunan ini adalah Fasiliti Utama (Ada Waktu Operasi)`.
   * **Kategori Fasiliti:** Anda **WAJIB** mengisi ruangan ini dengan perkataan yang betul mengikut peraturan di bawah:
     * 🕌 **Surau:** Mesti mengandungi perkataan `surau` (cth: `Surau`, `Surau Lelaki`, `Surau Perempuan`).
     * 🚾 **Tandas:** Mesti ditulis `tandas` atau `toilet` **sahaja** (Jangan tulis `Tandas Blok A` di ruangan ini!).
     * 🍽️ **Kafe:** Mesti ditulis `kafe` atau `cafe` **sahaja** (Jangan tulis `Kantin` atau `Kedai Makan`).
   * **Buka / Tutup:** Masukkan waktu operasi (cth: `08:00` hingga `17:00`).

---

### Cara B: Sebagai Bilik / Lokasi di Dalam Bangunan
*Gunakan cara ini jika fasiliti tersebut berada di dalam bangunan induk (Contoh: Tandas Lelaki di Aras Bawah Blok A, Surau Staf JTM di Tingkat 1 Blok JTM).*

1. Buka tab **Kelas / Lokasi** -> Klik **+ Tambah Lokasi**.
2. Isi maklumat berikut:
   * **Bangunan:** Cari dan pilih bangunan induk di mana bilik ini berada (cth: `Blok A (JKE)`).
   * **Kod Kelas/Bilik:** Masukkan nama mesra bilik tersebut (cth: `Tandas Lelaki (G)` atau `Surau Staf JTM`).
     * *Tip:* Anda boleh masukkan banyak bilik serentak jika dipisahkan dengan koma (cth: `Tandas Lelaki (G), Tandas Perempuan (G)`).
   * **Aras (Tingkat):** Masukkan nombor tingkat:
     * `0` untuk Aras Bawah (Ground Floor).
     * `1` untuk Tingkat 1, dan seterusnya.
   * **Panduan Arah Spesifik (Dalam Bangunan):** Tulis arahan jalan dari pintu masuk bangunan. Tekan `Enter` untuk baris baharu bagi membuat format langkah demi langkah yang kemas.
     * *Contoh:*
       ```text
       1. Masuk melalui pintu lobi utama Blok A.
       2. Jalan terus dan belok kanan selepas tangga pertama.
       3. Bilik tandas berada di hujung lorong di sebelah lif.
       ```
3. **PENTING: Tags Carian (Kunci Penapisan Pelajar):**
   Supaya bilik ini muncul apabila pelajar menekan butang penapis ("Surau" / "Tandas" / "Kafe") di peta utama, anda **WAJIB** meletakkan kata kunci yang betul di ruangan ini (pisahkan dengan koma):
   * 🕌 **Untuk Surau:** Letakkan tag `surau` atau `solat` (cth: `surau, solat, staf`).
   * 🚾 **Untuk Tandas:** Letakkan tag `tandas` atau `toilet` (cth: `tandas, toilet, washroom`).
   * 🍽️ **Untuk Kafe:** Letakkan tag `kafe`, `cafe`, atau `kantin` (cth: `kafe, cafe, kantin, makan`).
4. **Gambar Lokasi/Pintu Bilik:** Muat naik gambar papan tanda pintu bilik supaya pelajar tidak tersalah masuk.

---

## 📝 Bahagian 2: Senarai Semak (Cheatsheet) Ejaan Kategori & Tag

Rujuk jadual ini untuk mengelakkan kesilapan ejaan yang menyebabkan penapis peta tidak berfungsi:

| Jenis Fasiliti | Cara Daftar | Pilihan Kategori (Untuk Bangunan) | Tags Carian Wajib (Untuk Lokasi / Bilik) | Cara Paparan di Peta Pelajar |
| :--- | :--- | :--- | :--- | :--- |
| **Surau Bangunan Sendiri** | Bangunan Utama | `Surau` | *N/A (Kosongkan)* | Sentiasa kelihatan dengan pin ikon biru/merah di peta. |
| **Surau Dalam Blok** | Lokasi/Bilik | *N/A* | `surau, solat` | Muncul dalam senarai carian & apabila butang "Surau" ditekan. |
| **Tandas Bangunan Sendiri** | Bangunan Utama | `tandas` atau `toilet` | *N/A (Kosongkan)* | **Sembunyi secara default**. Hanya muncul jika penapis "Tandas" aktif. |
| **Tandas Dalam Blok** | Lokasi/Bilik | *N/A* | `tandas, toilet` | Muncul dalam senarai carian & apabila butang "Tandas" ditekan. |
| **Kafe / Kantin** | Bangunan Utama | `kafe` atau `cafe` | *N/A (Kosongkan)* | Sentiasa kelihatan di peta utama. |
| **Kantin Dalam Bangunan** | Lokasi/Bilik | *N/A* | `kafe, cafe, kantin, makan` | Muncul dalam senarai carian & apabila butang "Kafe" ditekan. |

---

## 🛠️ Bahagian 3: Langkah Demi Langkah Pendaftaran Sempurna (Perfect Steps)

Ikuti 3 langkah ini untuk memastikan setiap data yang didaftar adalah sempurna dan bebas ralat:

### Langkah 1: Persediaan Gambar & GPS (Di Tapak Fizikal)
1. Pergi ke lokasi fizikal fasiliti tersebut.
2. Ambil **Gambar Pintu Masuk / Papan Tanda** yang jelas.
3. Ambil koordinat GPS yang tepat menggunakan telefon pintar:
   * Buka Google Maps di telefon anda.
   * Berdiri di hadapan fasiliti tersebut.
   * Tekan lama pada pin biru lokasi anda di Google Maps sehingga koordinat (cth: `3.8625, 103.3153`) muncul. Salin nombor ini.

### Langkah 2: Memasukkan Data di Portal Admin
1. Layari halaman **Pentadbiran PolyMaps** di sistem JPP.
2. Pilih tab **Bangunan** (untuk struktur luar) atau **Kelas/Lokasi** (untuk bilik dalaman).
3. Klik butang tambah dan masukkan maklumat mengikut Panduan Bahagian 1 & 2 di atas.
4. **Periksa Ejaan:** Pastikan ejaan `surau`, `tandas`, atau `kafe` ditaip dengan tepat di ruangan kategori atau tag.
5. Klik **Simpan**.

### Langkah 3: Pengesahan & Pengujian (Testing)
1. Buka laman utama **PolyMap** (sebagai akaun pelajar atau mod Inkognito).
2. Uji menggunakan tiga cara berikut:
   * **Ujian Carian:** Taip nama bilik/bangunan tersebut (cth: "Tandas Blok B"). Adakah bilik itu dicadangkan dalam carian?
   * **Ujian Butang Pintas (Quick Filter):** Tekan butang pintas **Tandas** atau **Surau** di bawah bar carian. Adakah pin lokasi baharu tersebut muncul dengan betul?
   * **Ujian Panduan Arah:** Klik pada lokasi tersebut untuk melihat jika panduan arah dalam bangunan dipaparkan secara tersusun baris demi baris.

---

*Panduan ini disediakan untuk memudahkan urusan JPP POLISAS. Sila pastikan setiap ahli baru JPP membaca cheatsheet ini sebelum melakukan sebarang pengemaskinian peta.*
