# Spesifikasi Reka Bentuk: PolySuara Apple Porcelain Light Mode, Like/Dislike Mutual Exclusivity & Threads Comments Rework

**Tarikh:** 5 Oktober 2026  
**Status:** DILULUSKAN (Approved by User via /brainstorming & /grill-me)  
**Cabang:** `feat/campus-super-app-portal`  
**Lokasi Dokumen:** `docs/superpowers/specs/2026-10-05-polysuara-apple-porcelain-lightmode-sync-design.md`

---

## 1. Latar Belakang & Punca Masalah

Berdasarkan maklum balas terkini pengguna serta 3 tangkapan skrin ujian langsung:
1. **Pepijat Kiraan Like & Dislike:**
   - Gejala: Sebelum like = 28; selepas like = 29; bila tekan dislike kekal 29; bila tekan like semula melonjak ke 30.
   - Punca: Fungsi `handleDownvote` masih menyemak set legasi `userUpvotes` dan bukannya sistem reaksi `confessionReactions`, manakala `handleToggleReaction` tidak menolak undian semasa pembatalan reaksi dan tidak membatalkan rekod downvote sedia ada.
2. **Halangan Modal oleh BottomNav & FloatingAiChat (Screenshot 2):**
   - Gejala: Dialog popout *"Tulis Luahan Rahsia"* dibuka, tetapi `BottomNav` (dengan butang `+` oren besar) dan bubble ungu `FloatingAiChat` masih terapung di hadapan butang *"Kongsi Luahan"*.
   - Punca: Konteks susunan CSS (*CSS Stacking Context*) dan ketiadaan logik penyembunyian automatik elemen terapung global semasa modal aktif.
3. **Ruang Komen Bersepah & Nama Anon Serabut (Screenshot 1):**
   - Gejala: Komen memaparkan kod heksadesimal `Anon-eb689`, lencana peranan bertindan tidak kemas, ikon terapung bersepah, dan balasan bersarang (*nested replies*) terhad kepada 1 tahap sahaja.
4. **Kotak Undian Pudar & Light Mode Membosankan (Screenshot 3):**
   - Gejala: Dalam Mod Cerah (*Light Mode*), kotak undian kelihatan seperti simen kelabu kusam dan pudar (`bg-slate-900/50 border border-slate-800`), kad luahan kelihatan rata tanpa kedalaman estetik.

---

## 2. Matlamat & Kriteria Kejayaan

- **Eksklusiviti Mutlak Like (❤️) vs Dislike (👎):**
  - Like dan Dislike bersifat saling eksklusif (28 ➔ 29 (Like) ➔ 28 (Dislike) ➔ 29 (Like semula)).
  - Penyegerakan state serentak antara `confessions`, `confessionReactions`, dan `userDownvotes` dengan sokongan pangkalan data Supabase.
- **Jaminan Sifar Halangan Semasa Menulis / Membaca Komen:**
  - Sembunyikan secara automatik `BottomNav` dan `FloatingAiChat` apabila `composeModalOpen` atau `commentDrawerOpen` aktif.
  - Pasang modal menulis luahan dan laci komen terus ke `document.body` menggunakan `createPortal` pada paras `z-[99999]`.
- **Rework Laci Komen Gaya Threads & Persona Anon Mesra:**
  - Gantikan kod hash `Anon-xxxxx` secara deterministik kepada nama persona haiwan kampus comel (cth: `Kucing Oren 🐱`, `Tupai Laju 🐿️`, `Panda Comel 🐼`).
  - Sokong balasan bersarang (*nested replies*) sehingga 4 kedalaman menggunakan indentasi kompak + auto-tag `@NamaPengguna`.
  - Bersihkan baris tindakan ulasan dengan membuang ikon bersepah, meletakkan butang Like di sebelah kanan, dan menyediakan menu berhemah `···` untuk bantuan/laporan.
- **Wajah Baharu Light Mode 'Apple Porcelain & Rose Glow':**
  - Kotak undian `PolySuaraPoll.tsx`: Kontainer krim porselin lembut, butang pilihan putih berseri, jalur kemajuan mawar pastel cergas, dan tipografi berkejelasan tinggi.
  - Kad luahan Light Mode: Latar putih susu berkualiti tinggi dengan bayang mikro ultra-halus bertaraf Apple.

---

## 3. Perincian Senibina & Perubahan Kod

### 3.1 Penyatuan Logik Like & Dislike (`PolySuaraPage.tsx`)
```typescript
// Like / React
const handleToggleReaction = async (confessionId: string, reactionType: string) => {
  // 1. Jika pengguna telah Dislike: batalkan Dislike (-1 downvote, padam dari userDownvotes & DB)
  // 2. Jika pengguna telah React dengan emoji sama: batalkan Like (-1 upvote, padam dari confessionReactions & DB)
  // 3. Jika belum React: tambah Like (+1 upvote, simpan ke confessionReactions & DB)
};

// Dislike
const handleDownvote = async (confessionId: string) => {
  // 1. Jika pengguna telah Like/React: batalkan Like (-1 upvote, padam dari confessionReactions & DB)
  // 2. Jika pengguna telah Dislike: batalkan Dislike (-1 downvote, padam dari userDownvotes & DB)
  // 3. Jika belum Dislike: tambah Dislike (+1 downvote, simpan ke userDownvotes & DB)
};
```

### 3.2 Penyembunyian Automatik Chrome & Pemasangan Portal
Dalam `PolySuaraPage.tsx`:
```tsx
{/* Sembunyikan BottomNav dan FloatingAiChat semasa dialog menulis atau ulasan aktif */}
{!composeModalOpen && !commentDrawerOpen && (
  <>
    <BottomNav />
    <FloatingAiChat />
  </>
)}

{/* Modal Tulis Luahan via React Portal */}
{createPortal(
  <AnimatePresence>
    {composeModalOpen && ( ... )}
  </AnimatePresence>,
  document.body
)}

{/* Laci Ulasan Komen via React Portal */}
{createPortal(
  <AnimatePresence>
    {commentDrawerOpen && ( ... )}
  </AnimatePresence>,
  document.body
)}
```

### 3.3 Penukaran Nama Anon & Balasan Bersarang 4 Tahap
1. **Helper `getFriendlyAnonName(rawCodename: string)` dalam `src/lib/polySuaraHelpers.ts`:**
   - Memetakan `Anon-xxxxx` secara deterministik berasaskan kod hash kepada senarai 16 persona haiwan kampus POLISAS:
     `Kucing Oren 🐱`, `Tupai Laju 🐿️`, `Panda Comel 🐼`, `Arnab Pantas 🐰`, `Musang Cerdik 🦊`, `Singa Berani 🦁`, `Koala Santai 🐨`, `Burung Ceria 🐦`, `Kancil Bijak 🦌`, `Harimau Belang 🐯`, `Penguin Sejuk 🐧`, `Delfin Ceria 🐬`, `Kura Sabar 🐢`, `Gajah Setia 🐘`, `Helang Gagah 🦅`, `Beruang Tenang 🐻`.
   - Jika ia adalah OP luahan: memaparkan `[Nama Luahan]` bersama lencana `OP`.
2. **Struktur Data Balasan Rekursif (Sehingga Kedalaman 4):**
   - Menghubungkan balasan anak kepada `parent_id` ulasan sehingga 4 generasi.
   - Pada skrin telefon, balasan dipaparkan dengan indentasi melengkung halus dan tag pautan `@Nama`.

### 3.4 Transformasi Kotak Undian (`PolySuaraPoll.tsx`)
- **Kontainer:** `bg-slate-50/90 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 transition-colors`
- **Pilihan Undian:**
  ```tsx
  className={cn(
    "relative w-full text-left overflow-hidden rounded-xl border transition-all duration-300",
    isVoted 
      ? "border-rose-500/60 bg-rose-500/10 dark:bg-rose-500/20 shadow-xs" 
      : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:bg-slate-800 shadow-2xs"
  )}
  ```
- **Jalur Kemajuan:** `isVoted ? "bg-rose-500/20 dark:bg-rose-500/30" : "bg-slate-200/70 dark:bg-slate-700/40"`
- **Teks Pilihan:** `isVoted ? "text-rose-700 dark:text-rose-200 font-bold" : "text-slate-800 dark:text-slate-200 font-medium"`
- **Lencana Peratusan:** `text-rose-600 dark:text-rose-400 font-mono font-bold text-xs`

---

## 4. Jaminan Kualiti & Pelan Pengujian

1. **Ujian Unit Vitest:**
   - Ujian eksklusiviti mutlak Like/Dislike (28 ➔ 29 ➔ 28 ➔ 29).
   - Ujian pemetaan nama persona haiwan `getFriendlyAnonName`.
   - Ujian dwi-mod cerah/gelap pada `PolySuaraPoll`.
   - Ujian penyembunyian `BottomNav` dan `FloatingAiChat` semasa modal aktif.
2. **Kompilasi Pengeluaran:** `npm run build` dengan 0 ralat.
3. **Dokumentasi:** Kemas kini `DEV_GUIDELINE.md` Seksyen 30.
