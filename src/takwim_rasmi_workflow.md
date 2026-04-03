# Laporan Workflow Terperinci: Peruntukan & Proses Takwim Rasmi JPP (AktivitiFull.tsx)

Dokumen ini merungkaikan perjalanan logik (workflow) setiap status bagi Program (Takwim Rasmi) yang didaftarkan oleh kelab, sepertimana direkodkan di dalam fail `AktivitiFull.tsx` dan antaramuka pentadbiran JPP (`SemakanLaporanPage.tsx`).

Tujuan log ini adalah untuk menyenaraikan aliran standard (Happy Path), keadaan renyah (Edge Cases), dan kemungkinan "titik buta" (Blind Spots) yang wujud dalam logik kod masakini agar kita tidak terlepas pandang dalam menyempurnakan sistem ini.

---

## 1. Kitaran Hayat Status Program (Program Life Cycle)

Setiap program dalam takwim akan diunjur dan dikawal selia melalui variasi nilai di ruangan pangkalan data pada lajur `status`:

`DRAFT` ➜ `PENDING_APPROVAL` ➜ `CONFIRMED` ➜ `PENDING_POSTMORTEM` ➜ `COMPLETED`
(Dan *satu* cabang alternatif: `REQUEST_UNLOCK`)

---

## FASA 1: Penciptaan & Perancangan (Status: DRAFT)
**Pelaku:** MT / Presiden Kelab
**Tindakan:** Mengisi butiran awal program (Nama, Tarikh, Lokasi, Bajet, Pengarah) tanpa muat naik Kertas Kerja.

**Analisis Aliran:**
- Apabila fail dicipta, ianya akan berstatus **DRAFT**.
- Fail berada dalam zon `"Draf Perancangan"` di paparan papan pemuka Takwim (`draftingZone`).
- Membolehkan kelab mengemaskini bila-bila masa menanti Kertas Kerja disiapkan.

> [!WARNING] Blind Spots & Senario Kelemahan (Fasa 1)
> 1. **Pembatalan / Pemadaman Draf:** Pelajar **TIDAK mempunyai butang "Padam" (Delete/Trash) untuk membuang DRAFT**. Berdasarkan `AktivitiFull.tsx`, butang tong sampah hanya ada pada aktiviti mini (di tab Aktiviti Kelab), tetapi tab Takwim Rasmi (`ProgramCard`) tiada kod `onDelete`. Jika pelajar tersilap cipta Draf/tertekan simpan berkali-kali, lambakan draf "mati" tidak akan dapat dibuang & merosakkan pangkalan data.
> 2. **Tarikh Luput Menggantung (Hanging Expiry):** Jika tarikh program (Hari H) berada kurang dari 9 hari dari tarikh hari ini (`daysLeft < 9`), butang `Hantar` akan dilumpuhkan. Walau bagaimanapun, disebabkan tiada butang DELETE dan tiada butang UNLOCK di peringkat ini, **draf selamanya akan terperangkap (Limbo)** di dalam sistem Kelab jika tidak dihantar dalam tempoh yang disyaratkan.

---

## FASA 2: Permohonan Semakan Kertas Kerja (Status: PENDING_APPROVAL)
**Pelaku:** MT / Presiden
**Tindakan:** Memuat naik Kertas Kerja (PDF) di zon muat naik -> Klik Butang "Hantar".

**Analisis Aliran:**
- Program berubah ke status **PENDING_APPROVAL**. 
- Dalam dialog kemaskini, semua medan masih _boleh_ ditukar selagi belum ditukar ke status ini.
- Tersenarai di tab "Status Semasa" dengan ikon jam (`activeZone`).
- Berpindah ke papan JPP (`SemakanLaporanPage.tsx`) untuk disemak.

> [!CAUTION] Kelemahan & Titik Buta (Fasa 2)
> 1. **Tiada Undo (Tarik Balik Perubahan):** Sebaik sahaja MT menekan Hantar, mereka tidak lagi dapat menukar fail PDF Kertas Kerja. Jika MT menyedari dia *tersalah fail PDF*, dia tidak dapat menekan "Batal Hantar" dan terpaksa memanggil AJK JPP untuk _reject_ secara manual untuk membukanya kembali.
> 2. **Sistem Teruskan Lulus Walau Hari Terlepas (Overdue Approval):** Jika JPP lambat luluskan dan program sudah berlalu / melepasi tarikhnya, tiada sekatan masa (Time Barrier) ke atas butang pengesahan PENDING_APPROVAL. Sistem menerima pelulusan pasca tarikh (Backdated Approval).

---

## FASA 3: Tindakan Kelulusan JPP Pentadbir
**Pelaku:** Admin JPP (Akaun SuperAdmin) (`SemakanLaporanPage.tsx`)
**Tindakan:** Mengesahkan LULUS atau menolak (TOLAK) untuk PENDING_APPROVAL.

**Analisis Aliran:**
- **Pilihan 1 (Lulus):** Klik LULUS ➜ Program berubah ke **CONFIRMED**, tarikh di "Kunci" (Lock).
- **Pilihan 2 (Tolak):** Klik TOLAK ➜ JPP masukkan alasan ➜ Program berubah ke **DRAFT** dan disertakan dengan peringatan (Nota Semasa).

> [!NOTE] Perhatian Logik
> Alasan ("Ulasan JPP") diletakkan pada `jpp_remarks`. Isu di mana ulasan tidak muncul telah diselesaikan. Ulasan dipaparkan kepada pelajar di dalam kad program (warna Amaran Merah) di bahagian "Perhatian Segera".
> PENTING: Jika draf disunting & pelajar menekan Hantar Semula ke JPP, `jpp_remarks` dikosongkan automatik menjadi *null*, sekaligus membersihkan sebarang status penolakan lepas (ini tingkah laku logik yang tepat & sihat).

---

## FASA 4: Pelaksanaan & Permohonan "Unlock" (Status: CONFIRMED ➜ REQUEST_UNLOCK)
**Pelaku:** MT / Presiden
**Tindakan:** Tarikh telah dikunci. Namun perancangan boleh berubah. 

**Analisis Aliran:**
- Program menjadi **CONFIRMED**; borang kemaskini Tarikh otomatis di-*disable*.
- Jika tarikh perlu ditangguh, Pelajar tekan butang 🔓 (Unlock). Sistem menagih alasan teks.
- Status menjadi **REQUEST_UNLOCK** dan frasa `jpp_remarks` dicatuk dengan: `[PERMOHONAN UNLOCK]: Alasan..`.
- Program dihantar semula ke JPP untuk dilihat. JPP menekan "Buka Kunci (Unlock)" di paparan Admin (setelah ditambah sebentar tadi).
- Status beralih menjadi **DRAFT** (pelajar membetulkan tarikh > masuk semula kitaran Kertas Kerja).

> [!WARNING] Isu Kritikal UI Pentadbir (Fasa 4)
> 1. **JPP Tiada Butang REJECT untuk "Unlock":** Jika pelajar meminta Unlock (Tangguh), di muka JPP (`SemakanLaporanPage`), butang yang ditawarkan **hanya butang biru "Buka Kunci (Unlock)"**. 
> Bagaimana jika JPP **tidak bersetuju** untuk menangguh tarikh? TIADA CARA UNTUK JPP BALAS "TIDAK"! JPP hanya boleh abaikan mesej itu dan ia akan selamanya lekat pada REQUEST_UNLOCK tanpa jalan keluar untuk pelajar memuat naik Post-Mortem.
> 2. **Alur Post-Mortem Tergantung Jika Sedang Di 'Unlock':** Jika hari program sudah lepas secara fizikal, tetapi pelajar tersilap tekan "Request Unlock" dan ia tidak direspon JPP atau disengajakan abaikan, butang "Hantar Post Mortem" tidak dapat ditekan sehinggalah status berubah balik ke sesuatu yang stabil.

---

## FASA 5: Penyerahan Laporan Akhir (Status: PENDING_POSTMORTEM)
**Pelaku:** MT / Presiden
**Tindakan:** Selepas program fizikal selesai, pelajar upload PDF Post-mortem, mengisi bahagian Objektif/Deskripsi & memuat naik *Gambar Bukti (Maks 3)*. Menekan butang Hantar.

**Analisis Aliran:**
- Menukar CONFIRMED ➜ **PENDING_POSTMORTEM**.
- Borang Gambar Bukti mengamalkan logik memuat naik Storage Supabase dan mengekalkan URL gambar dalam DB.
- Jika JPP menolak post mortem, ia KEKAL dalam `PENDING_POSTMORTEM` (dengan pameran badge `POSTMORTEM (REJECTED)` berpandukan logic yang ditulis di halaman `AktivitiFull.tsx`).
- Selagi dalam `PENDING_POSTMORTEM` yang Ditolak, M.T/Presiden masih boleh tekan butang kuning re-upload dan tekan Hantar Semula. 

> [!TIP] Risiko Integriti & Workflow Berlepas (Fasa 5)
> 1. **Tiada Pengesanan Tarikh Selesai:** Sistem membenarkan Post-Mortem didaftarkan **walaupun tarikh program masih lagi belum berlaku**! Tiada kawalan yang mengatakan "You cannot submit Post-Mortem for future event". Pelajar (terutama MT yang nak cepat) mungkin memalsukan report 2 hari lebih awal.
> 2. **Tiada Notis Program Lewat Laporan:** Tidak ada fungsi (misalnya warna Merah Amaran Ekstrem atau Denda Merit) jika MT melengahkan penghantaran Post Mortem selama berbulan-bulan lamanya lamanya melepasi Tarikh Tamat program.
> 3. **Format Pelampir Bukti Gambar Kurang Kawalan:** Had 3 gambar direkodkan di UI UI, tetapi apabila `onRemoveImage` ditekan, kelab sekadar membuang rekod URL dari array DB, JAWAPAN FAIL GAMBAR ASAL DI SUPABASE BUCKET `reports` MASIH WUJUD DAN TIDAK DIPADAM (Tiada Logik DELETE BUCKET dipanggil semasa menekan pangkah ❌ dalam frontend). Ini mengundang penimbunan 'Sampah Memori' yang menyebabkan kos infrastruktur tinggi di kemudian hari (Orphaned Files).

---

## FASA 6: Penamat Laporan & Arkib Berpusat (Status: COMPLETED)
**Pelaku:** Admin JPP
**Tindakan:** Menekan LULUS untuk Semakan PENDING_POSTMORTEM.

**Analisis Aliran:**
- Program diubah menjadi **COMPLETED**. Secara automatik dilukis grafnya di Arkib Takwim dan Arkib JPP Pusat dengan label Emerald Hijau. Program tidak lagi boleh ditukar buat selamanya dan segala urusan berkenaan kelulusan ditutup.

---

## RUMUSAN CADANGAN PENAMBAHBAIKAN ("LOopholes Fix") YANG AKUT:

Berpandukan kajian komprehensif alur aplikasi masa ini, amat disarankan kelak untuk diimplementasikan perincian berikut oleh pasukan pembangun Pautan JPP:

1. **Buat Fungsi Padam Draf Takwim:** Wujudkan butang (Trash) untuk Program berstatus DRAFT agar pelajar boleh menyingkirkan rekod sampah/silap daftar sepertimana Aktiviti Biasa.
2. **Tambah Sistem Tolak (REJECT) Pada Modal Pentadbiran JPP Untuk Permohonan Tangguh:** Jika butang 'Unlock' tertera pada skrin Admin, sedia tawarkan butang sebelah 'Tolak Unlock', agar status kembali ke CONFIRMED berserta mesej penolakan tangguh.
3. **Penguatkuasaan Logik Masa (Timeline Guard Rails):** Halang `url_post_mortem` dari dimuatnaik selagi `new Date() < new Date(tarikh_tamat)`.
4. **Pembatalan Penyerahan Pantas (Quick Recall Button):** Tambah fungsi tarik balik (*Withdraw*) di Papan Pemuka bagi mengelakkan Admin diganggu akibat kesalahan letak fail kecil sekurang-kurangnya sehingga dokumen itu disentuh oleh Admin JPP sendiri (reviewed_at = null).
5. **Autoclean Orphaned Images Bucket:** Suntik panggilan fungsi `supabase.storage.from('reports').remove(['fail_dir'])` setiap kali `handleRemoveImage` atau `upload` baru mengambil alih indeks bagi mengelakkan storan kotor.
