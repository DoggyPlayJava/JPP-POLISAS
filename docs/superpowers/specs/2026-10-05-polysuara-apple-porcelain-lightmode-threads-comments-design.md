# Spesifikasi Reka Bentuk: PolySuara Apple Porcelain Light Mode, Threads Comments & 1-Hour Self-Delete

**Tarikh:** 5 Oktober 2026  
**Status:** DILULUSKAN (Approved by User via Brainstorming & Grill-Me)  
**Cabang:** `feat/campus-super-app-portal`  
**Lokasi Dokumen:** `docs/superpowers/specs/2026-10-05-polysuara-apple-porcelain-lightmode-threads-comments-design.md`

---

## 1. Latar Belakang & Masalah Yang Dikenalpasti

Berdasarkan 3 tangkapan skrin baharu dan sesi interviu *grill-me*:
1. **Pepijat State Undian Like (❤️) vs Dislike (👎):**
   - Apabila pengguna menekan Like pada pos yang mempunyai 28 undian, ia bertambah ke 29. Namun apabila pengguna menekan Dislike, undian Like tidak berkurang (kekal 29) dan Dislike bertambah. Apabila Like ditekan semula, ia melonjak ke 30.
   - *Punca:* `handleDownvote` masih menyemak set legasi `userUpvotes` dan bukannya `confessionReactions`, dan fungsi `handleToggleReaction` tidak menolak undian semasa un-react.
2. **Ruang Komen Berselerak & Nama Anon Bernombor (Screenshot 1):**
   - Laci ulasan mempunyai ikon bertaburan tanpa hierarki jelas (`🤍`, `👎`, `💬`, `[shield]`, `[alert]`).
   - Nama pengguna menggunakan kod hash robotik yang serabut (cth: `Anon-eb689`).
   - Kedalaman balasan terhad kepada 1 tahap sahaja.
3. **Pertembungan Modal dengan BottomNav & AI Chat (Screenshot 2):**
   - Walaupun z-index dinaikkan, `BottomNav` dan bubble ungu `FloatingAiChat` masih kelihatan terapung di hadapan butang *"Kongsi Luahan"*, mengundang risiko salah tekan.
4. **Kotak Undian Pudar & Light Mode Membosankan (Screenshot 3):**
   - Dalam Light Mode, kotak graf undian (`PolySuaraPoll.tsx`) memaparkan petak kelabu konkrit pudar tanpa kontras kerana menggunakan kelas berkod keras `bg-slate-900/50` tanpa sokongan tema Cerah.
   - Kad luahan dalam Light Mode kelihatan rata dan tidak setaraf dengan kemewahan Dark Mode.
5. **Permintaan Ciri Padam Mesej (1-Hour Self-Delete):**
   - Pelajar meminta fungsi memadam pos luahan atau ulasan sendiri dalam tempoh **1 jam** pertama (untuk membetulkan kesilapan/typo).
   - Apabila dipadam, semua pengguna akan melihat teks nisan: `"<nama> telah memadamkan ruangan ini"`. Selepas 1 jam, butang padam dinyahaktifkan.

---

## 2. Senibina & Penyelesaian Reka Bentuk

### 2.1 Pembetulan Pepijat Like vs Dislike (Strict Mutual Exclusivity)
- Penyatuan pengurusan state antara `confessionReactions`, `upvotes`, dan `userDownvotes`:
  - **Tekan Like (❤️):**
    - Jika pos sedang berada dalam status Dislike: Batalkan Dislike (`-1 downvote`), buang dari `userDownvotes` & jadual `polysuara_downvotes`. Tambah Like (`+1 upvote`) & masukkan ke `polysuara_reactions`.
    - Jika pos telah di-Like: Batalkan Like (`-1 upvote`), buang dari `confessionReactions` & jadual `polysuara_reactions`.
    - Jika belum di-Like: Tambah Like (`+1 upvote`), masukkan ke `confessionReactions` & jadual `polysuara_reactions`.
  - **Tekan Dislike (👎):**
    - Jika pos sedang berada dalam status Like/React: Batalkan Like (`-1 upvote`), buang dari `confessionReactions` & jadual `polysuara_reactions`. Tambah Dislike (`+1 downvote`) & rekodkan ke `polysuara_downvotes`.
    - Jika pos telah di-Dislike: Batalkan Dislike (`-1 downvote`), buang dari `userDownvotes` & `polysuara_downvotes`.
- **Hasil:** Aliran undian 28 ➔ 29 (Like) ➔ 28 (Dislike batalkan Like) ➔ 29 (Like semula) terjamin 100% konsisten.

### 2.2 Sifar Halangan Navigasi: Sembunyikan Nav/Chat & React Portal
- Apabila modal luahan atau laci ulasan dibuka:
  ```tsx
  {!composeModalOpen && !commentDrawerOpen && (
    <>
      <BottomNav />
      <FloatingAiChat />
    </>
  )}
  ```
- Pasang modal dan laci komen menggunakan `createPortal(..., document.body)` dengan `z-[99999]`.
- Bar navigasi dan AI bubble serta-merta hilang dari pandangan semasa modal terbuka, menghapuskan 100% risiko salah sentuh.

### 2.3 Rework Laci Ulasan Komen Gaya Threads (Minimalist & Premium)
- **Nama Anon Mesra Kampus:**
  - Fungsi pembantu `getFriendlyAnonName(codename)` dalam `src/lib/polySuaraHelpers.ts` memetakan hash `Anon-xxxxx` secara deterministik kepada nama haiwan kampus comel berserta emoji:
    - Contoh: `Anon-eb689` ➔ `Kucing Oren 🐱`, `Tupai Laju 🐿️`, `Panda Comel 🐼`, `Arnab Pantas 🐰`, `Musang Cerdik 🦊`.
    - Jika pengomen adalah OP: Memaparkan nama asal luahan berserta lencana `Penulis`.
- **Struktur Balasan Bersarang Sehingga 4 Tahap (Nested Replies Depth 4):**
  - Komen disusun mengikut hierarki benang sehingga kedalaman 4 lapisan (`depth <= 4`).
  - Untuk paparan mudah alih yang tidak terhimpit: Menggunakan indentasi kompak (12px per lapisan) berserta auto-tag `@NamaPengguna` pada baris teks balasan.
- **Tindakan Komen Mikro (Micro-Actions):**
  - Kiri: Butang teks `Balas` (mengisi `@Nama` ke dalam kotak teks ulasan).
  - Kanan: Ikon Like mikro (`🤍 [count]` berubah kepada `❤️` bila di-like).
  - Menu berhemah `···`: Menggantikan ikon perisai dan amaran besar bagi membuka tindakan *"Laporkan Ulasan"* atau eskalasi *"Kebajikan"*.
  - Bar input terapung gaya Apple kapsul penuh (`rounded-full`) dengan butang imej dan butang hantar bulat ros cergas.

### 2.4 Ciri Padam Kendiri 1 Jam (1-Hour Self-Delete with Tombstone)
- **Skop:** Luahan Utama (Confessions) dan Komen (Comments).
- **Logik Had Masa:**
  ```typescript
  const isWithin1Hour = (createdAt: string) => {
    return (Date.now() - new Date(createdAt).getTime()) <= 60 * 60 * 1000;
  };
  ```
- **Akses Pengguna:**
  - Butang *"Padam"* hanya muncul untuk penulis kandungan (`item.user_id === profile.id` atau `confession.author_id === profile.id`) jika masih dalam tempoh 1 jam dari masa penciptaan.
- **Paparan Selepas Dipadam (Tombstone):**
  - Kandungan teks digantikan dengan:
    *"<Nama Pengguna> telah memadamkan ruangan ini"* (cth: *"Kucing Oren telah memadamkan ruangan ini"*).
  - Dipaparkan dalam teks italic pudar (`text-slate-400 dark:text-slate-500 italic text-xs`) dengan ikon `Trash2` mikro.
  - Tindakan interaksi (Like, Balas) pada mesej yang dipadam dinyahaktifkan.

### 2.5 Transformasi Light Mode 'Apple Porcelain & Rose Glow'
- **Kotak Undian (`PolySuaraPoll.tsx`):**
  - Kontainer Luar: `bg-slate-50/90 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4`.
  - Kad Pilihan: Putih bersih berseri `bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs hover:border-rose-400/50 rounded-xl`.
  - Jalur Kemajuan: Mawar pastel cergas `bg-rose-500/15 dark:bg-rose-500/25` (bukan kelabu mati).
  - Tipografi: Teks pilihan `text-slate-800 dark:text-slate-100 font-semibold`, peratusan `text-rose-600 dark:text-rose-400 font-mono font-bold`.
- **Estetika Kad Luahan PolySuara:**
  - Menggunakan porselin tulen `#FAFAFA` dengan bayang mikro ultra-halus bertaraf Apple:
    `bg-white dark:bg-slate-900/70 border border-slate-200/70 dark:border-white/[0.07] shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-[2rem]`.

---

## 3. Pelan Pengujian & Verifikasi

- **Vitest Unit Tests:**
  - Ujian logik eksklusif Like vs Dislike (28 ➔ 29 ➔ 28 ➔ 29).
  - Ujian pemetaan nama haiwan mesra `getFriendlyAnonName`.
  - Ujian had masa padam 1 jam (lulus sebelum 60 minit, disekat selepas 60 minit).
  - Ujian render tema Cerah & Gelap pada `PolySuaraPoll.tsx`.
  - Ujian penyingkiran `BottomNav` semasa modal/laci terbuka.
- **Kompilasi Pengeluaran:** `npm run build` dengan 0 ralat.
- **Audit Manual:** Semakan visual pada mod Cerah dan Gelap.
