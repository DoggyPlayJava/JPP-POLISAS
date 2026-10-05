# Spesifikasi Reka Bentuk: PolySuara Clean Modern Social Redesign (Anti-Slop)

**Tarikh:** 5 Oktober 2026  
**Status:** DILULUSKAN (Approved by User)  
**Cabang:** `feat/campus-super-app-portal`  
**Lokasi Dokumen:** `docs/superpowers/specs/2026-10-05-polysuara-clean-social-redesign.md`

---

## 1. Latar Belakang & Pernyataan Masalah

Berdasarkan 5 tangkapan skrin maklum balas pengguna daripada sesi audit visual sebenar:
1. **Atas Suapan Nampak Seperti "AI-Slop" (Screenshot 1):** Barisan bulatan neon cerita *Campus Pulse* kelihatan generik, tidak natural, dan merendahkan martabat superapp rasmi POLISAS.
2. **Kekeliruan Butang Reaksi & Limpahan Susun Atur (Screenshot 2):** Butang reaksi sedia ada menggunakan ikon `SmilePlus` yang mengelirukan pelajar (tidak jelas sama ada ia bermaksud "Like"). Nombor kiraan (cth. `29`) terputus baris ke bawah akibat isu `flex-wrap`, merosakkan baris tindakan pos.
3. **Pertembungan Butang FAB (Screenshot 3):** Butang terapung `FloatingComposeFab` (merah jambu) bertindih terus di atas butang `+` emas rasmi `BottomNav` dan ikon sembang AI ungu (`FloatingAiChat`).
4. **Ruang Komen Ketinggalan Zaman (Screenshot 4):** Laci ulasan pelajar (*Ulasan Pelajar*) menggunakan gaya "kotak-dalam-kotak" gelap tebal ala forum 2012 dengan butang kuning `BANTUAN` yang berat dan mengganggu visual.
5. **Halangan Paparan oleh BottomNav (Screenshot 5):** Dialog menulis luahan (*Tulis Luahan Rahsia*) dan kaki laci ulasan komen terlindung oleh `BottomNav` di bahagian bawah skrin mudah alih, menghalang butang *"Kongsi Luahan"*. Selain itu, komponen `BottomNav` dan `FloatingAiChat` dipanggil sebanyak dua kali dalam `PolySuaraPage.tsx`.

---

## 2. Matlamat & Kriteria Kejayaan

- **100% Anti-Slop:** Membuang bulatan neon cerita dan menggantikannya dengan navigasi satu baris (*Single-Line Track*) yang pantas, padat, dan matang ala Threads/X.
- **Butang Like (❤️) Universal & Reaksi WhatsApp:**
  - Tekan sekali: Terus berfungsi sebagai Like yang universal dan intuitif dengan kiraan sebaris (contoh: `❤️ 29`). Tiada lagi nombor jatuh ke bawah.
  - Tekan lama / hover: Mengapungkan kapsul 6 reaksi WhatsApp (❤️, 😂, 🔥, 😢, 😮, 💯).
- **Penghapusan Komponen Bertindih & Pembersihan DOM:**
  - Memadamkan terus fail dan komponen `FloatingComposeFab`.
  - Membuang render pendua `<BottomNav />` dan `<FloatingAiChat />`.
- **Bebas Halangan Z-Index & Kelegaan Bawah:**
  - Menaikkan z-index modal dan laci komen kepada `z-[999]` (di atas `BottomNav` `z-[120]`).
  - Menambah kelegaan bawah `pb-28 sm:pb-6` bagi memastikan semua borang dan butang serahan boleh dicapai dengan selesa pada peranti mudah alih.
- **Laci Ulasan Moden (Modern Social Sheet):**
  - Mengubah ruang komen kepada gaya perbualan benang moden dengan pembahagi halus, lencana peranan nipis, dan bar input terapung.
- **Kualiti & Ujian:** 100% lulus semua ujian Vitest (`npm test -- --run`) dan kompilasi build bersih (`npm run build`).

---

## 3. Senibina & Perubahan Komponen

### 3.1 Pembuangan Komponen Lebihan (Cleanup)
- **Padam:** `src/components/polysuara/FloatingComposeFab.tsx`
- **Padam:** `src/__tests__/floatingComposeFab.test.ts`
- **Padam:** `src/components/polysuara/CampusPulseBar.tsx`
- **Padam:** `src/__tests__/campusPulseBar.test.ts`

### 3.2 Pembersihan Panggilan Berganda dalam `PolySuaraPage.tsx`
- Mengeluarkan panggilan berulang `<BottomNav />` dan `<FloatingAiChat />` pada baris 1795. Hanya kekalkan **satu** set tunggal di penghujung halaman.

### 3.3 Navigasi Atas Eksekutif (Single-Line Streamlined Track)
Menggantikan `CampusPulseBar` dengan baris navigasi suapan terpadu:
- **Kiri:** Segmented pill toggle untuk `🕒 Terkini` (LATEST) dan `🔥 Hangat` (TRENDING).
- **Tengah:** Garis pembahagi halus (`w-px h-5 bg-slate-200 dark:bg-white/10 shrink-0`).
- **Kanan:** Cip penapis kategori mendatar (`Semua`, `Akademik`, `Fasiliti`, `Kamsis`, `Kaunseling`) dengan sifat `snap-x overflow-x-auto scrollbar-none`.

### 3.4 Naik Taraf `PolySuaraReactions.tsx`
- **Kontainer:** `relative inline-flex items-center flex-nowrap gap-1.5 shrink-0` (menghalang pembelahan baris nombor).
- **Butang Utama Like (❤️):**
  - Mengandungi ikon Heart + nombor jumlah reaksi dalam satu elemen berpadu: `[ ❤️ 29 ]`.
  - Status aktif (`userReacted: true`): latar merah ros lembut (`bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold`).
  - **Tindakan Tekan (Click/Tap):** Terus memanggil `onToggleReaction(confessionId, 'heart')`.
  - **Ikon Pencetus Reaksi Tambahan:** Ikon kecil bersebelahan atau penahan lama untuk membuka menu terapung 6 emoji WhatsApp (`❤️`, `😂`, `🔥`, `😢`, `😮`, `💯`).
- **Pill Reaksi Aktif:** Memaparkan reaksi lain yang mempunyai kiraan > 0 secara sebaris tanpa jatuh baris (`flex-nowrap`).

### 3.5 Pembaikan Modal Tulis Luahan & Halangan BottomNav
- **Backdrop:** `z-[990] fixed inset-0 bg-slate-950/70 backdrop-blur-sm`
- **Kontainer Modal:**
  ```tsx
  className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-lg bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[2.5rem] sm:rounded-3xl p-5 sm:p-6 shadow-2xl z-[999] max-h-[90vh] overflow-y-auto pb-28 sm:pb-6"
  ```
- Ini menjamin butang *"Kongsi Luahan"* sentiasa terapung di atas `BottomNav` (`z-[120]`).

### 3.6 Wajah Baharu Laci Ulasan Komen (Comments Drawer)
- **Kontainer Laci:** `z-[999] pb-8 sm:pb-4 rounded-t-[2.5rem]`
- **Kad Komen:** Menggugurkan sempadan petak gelap tebal. Menggunakan pembahagi halus `border-b border-slate-100 dark:border-white/5 py-3.5 px-4`.
- **Garis Benang (Thread Line):** Balasan bersarang dihubungkan dengan garisan menegak 1.5px melengkung.
- **Lencana Peranan:**
  - Penulis Luahan: `[ OP ]` (merah ros mini).
  - Exco / Pentadbir: `[ JPP RASMI ]` (zamrud eksekutif mini).
- **Tindakan Komen:** Menggantikan butang kuning besar `BANTUAN` dengan butang kecil berhemah `···` (tindakan bantuan/laporan).
- **Bar Input Ulasan:** Kapsul terapung dengan butang hantar bulat cergas dan pratonton imej mikro.

---

## 4. Aliran Data & Logik Rangkaian

1. **Like Toggle:**
   - Memeriksa sama ada pengguna telah memberi reaksi `heart`.
   - Jika ya: Padam rekod dari `polysuara_reactions`, kurangkan `upvotes` luahan.
   - Jika tidak: Masukkan `{ confession_id, user_id, reaction_type: 'heart' }`, tambahkan `upvotes` luahan.
2. **Kemas Kini Optimistik:** State `confessionReactions` dan `confessions` dikemas kini serta-merta pada UI sebelum respons pelayan selesai bagi kelajuan 60fps. Sekiranya ralat, status dikembalikan semula dan notifikasi amaran dipaparkan.
3. **Pengesahan Sesi:** Hanya pengguna berdaftar yang disahkan boleh menyukai atau memberi reaksi.

---

## 5. Pelan Pengujian & Jaminan Kualiti

- **Ujian Unit Vitest:**
  - `src/__tests__/polySuaraReactions.test.ts`: Uji interaksi one-tap heart like, pembukaan popover emoji WhatsApp, pencegahan limpahan nombor sebaris, dan penyerahan kiraan.
  - `src/__tests__/polySuaraComments.test.ts`: Uji susun atur laci komen baharu, lencana peranan, dan pembersihan token.
  - `src/__tests__/polySuaraPage.test.ts`: Uji ketiadaan `CampusPulseBar` dan `FloatingComposeFab`, pembersihan panggilan ganda `BottomNav`, dan kewujudan navigasi sebaris.
- **Kompilasi Pengeluaran:** `npm run build` dengan 0 ralat TypeScript/Vite.
- **Audit Manual Pelayar:** Mengesahkan paparan pada resolusi telefon pintar (360px-414px) untuk memastikan butang Like tidak melimpah dan butang modal tidak tertutup oleh `BottomNav`.

---

## 6. Dokumentasi

Kemas kini `DEV_GUIDELINE.md` di bawah Bahagian 29 / PolySuara untuk mendokumenkan pemansuhan `CampusPulseBar` dan `FloatingComposeFab`, serta corak baharu *One-Tap Heart + WhatsApp Reactions* dan senibina *Z-[999] Safe Clearance*.
