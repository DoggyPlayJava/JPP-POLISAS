# 📖 PolySuara: Panduan & Spesifikasi Teknikal (Guideline)

Dokumen ini disediakan sebagai rujukan terperinci untuk AI Agent dan Developer bagi memahami struktur, ciri-ciri (features), senibina pangkalan data, dan standard pengekodan khusus untuk **PolySuara** (Sistem Luahan & Undian Pelajar).

---

## 1. Pengenalan & Konsep Utama

**PolySuara** adalah platform komuniti tanpa nama (anonymous) untuk pelajar Politeknik Sultan Haji Ahmad Shah (POLISAS). Ia membenarkan pelajar memuat naik luahan, cadangan, atau pertanyaan yang akan disaring secara automatik.

**Ciri-ciri Utama:**
- **Tanpa Nama (Anonymous):** Identiti penulis disembunyikan menggunakan _codename_ yang dijana secara rawak (contoh: "Kucing Misteri").
- **Tapis Kata Kesat (Censorship):** Kata kesat ditapis secara automatik (server-side via trigger) berdasarkan senarai dalam database.
- **Undian & Trending:** Sistem _upvote_ yang menentukan samada luahan tersebut "LATEST" atau "TRENDING" (Hangat).
- **Sistem Poll (Undian):** Pelajar boleh menyertakan poll (maksimum 4 pilihan) bersama luahan.
- **Export ke IG Story:** Fungsi menjana kad resolusi 9:16 untuk perkongsian di media sosial.
- **Moderasi JPP:** Ahli JPP boleh membalas luahan (Official Reply), padam, pin, atau archive luahan melalui Admin Dashboard.
- **Auto-Archive (Cron Job):** Luahan yang melebihi 6 bulan akan di-archive secara automatik untuk mengekalkan prestasi.

*(Nota: Fitur Chat (Direct Messaging) telah dibuang secara rasmi pada v5 untuk memfokuskan kepada moderasi awam sahaja).*

---

## 2. Senibina Pangkalan Data (Database Schema)

Semua jadual PolySuara berada dalam skema `public` dan mempunyai prefix `polysuara_`.

### 2.1 Jadual Teras (Core Tables)
1. **`polysuara_confessions`** - Menyimpan luahan utama.
   - Kolum penting: `content`, `category`, `upvotes`, `is_approved`, `is_pinned`, `is_archived`, `codename`, `author_id`, `official_reply`.
   - Index: `idx_polysuara_active_feed` (is_archived, is_pinned DESC, created_at DESC) - *Kritikal untuk prestasi frontend*.
2. **`polysuara_upvotes`** - Menyimpan data *upvote* (mengelak duplicate vote).
3. **`polysuara_censored_words`** - Senarai kata kesat untuk auto-censorship.

### 2.2 Jadual Poll (Undian)
1. **`polysuara_polls`** - Tetapan utama poll (`is_multiple_choice`).
2. **`polysuara_poll_options`** - Pilihan-pilihan untuk sesuatu poll (Maksimum 4).
3. **`polysuara_poll_votes`** - Rekod undian pengguna untuk pilihan poll.

---

## 3. Row-Level Security (RLS) & Dasar Keselamatan

> ⚠️ **PERATURAN EMAS (CRITICAL):**
> Semua polisi RLS **WAJIB** menggunakan `(SELECT auth.uid())` berbanding `auth.uid()` secara terus untuk mengelakkan masalah _infinite recursion_ atau bebanan CPU (N+1 evaluation) pada Supabase. Sama juga untuk `(SELECT auth.role())`.

**Polisi `polysuara_confessions` (Rujukan Semasa V5):**
- **SELECT:** Pelajar hanya boleh baca `is_approved = true`. JPP boleh baca semua.
- **INSERT:** `author_id` mesti sama dengan `(SELECT auth.uid())`.
- **UPDATE:** Pengarang hanya boleh update milik sendiri ATAU JPP boleh update semua (Digabungkan dalam 1 policy sahaja).
- **DELETE:** Hanya JPP (`is_jpp_admin`) dibenarkan.

---

## 4. Triggers, Functions & Cron Jobs (Server-Side Logic)

Banyak logik perniagaan dijalankan di peringkat pangkalan data (PostgreSQL) bagi memastikan _data integrity_ dan mengelakkan perlumbaan syarat (race conditions) di frontend.

### 4.1 RPC Functions
- **`toggle_polysuara_upvote(p_confession_id)`:** Menambah/membuang upvote secara _atomic_. Mencegah race condition ketika ramai menekan butang pada masa yang sama.
- **`get_my_polysuara_ids()`:** Mengambil senarai ID luahan milik pengguna (digunakan untuk highlight luahan sendiri di UI).
- **`get_trending_polysuara_tags()`:** Menjana senarai hashtag popular dalam tempoh 7 hari.

### 4.2 Database Triggers
- **`trg_polysuara_codename`:** Berjalan `BEFORE INSERT`. Mengambil `author_id` dan Tarikh, hash kan, dan hasilkan _codename_ seperti "Harimau Berani".
- **`trg_polysuara_daily_limit`:** Berjalan `BEFORE INSERT`. Menghalang pengguna memuat naik lebih dari 5 luahan dalam tempoh 24 jam.
- **`trg_censor_polysuara`:** Berjalan `BEFORE INSERT / UPDATE`. Mengimbas isi luahan (`content`) dan menukar kata kesat (dari jadual `polysuara_censored_words`) kepada `***`.

### 4.3 Cron Job (`pg_cron`)
- **`archive_old_polysuara`:** Berjalan setiap tengah malam. Menetapkan `is_archived = true` pada luahan yang berusia lebih 6 bulan untuk meringankan beban data pada UI utama.

---

## 5. Struktur Frontend (React/TypeScript)

### 5.1 Fail Utama
1. **`src/pages/polyservices/PolySuaraPage.tsx`**
   - Komponen utama yang dilihat oleh pelajar.
   - Mengendalikan feed (Latest/Trending), filter kategori, form penambahan luahan, report, dan eksport.
   - **Peraturan:** Semua _state_ (`useState`) mesti diletakkan di bahagian atas fail. Jangan guna hardcoded filter untuk profanity, biarkan DB handle.
2. **`src/pages/jpp/PolyServicesAdmin.tsx`**
   - Dashboard khas untuk exco JPP memantau PolySuara & PolyMatch.
   - Tab "ANALITIK" menggunakan kata kesat dan tag untuk menjana _Word Cloud_.
   - **Peraturan:** Jangan guna `.select('*')` di sini. Gunakan *explicit columns* (contoh: `.select('id, content, category...')`) per `DEV_GUIDELINE.md §15.2`.
3. **`src/components/polysuara/PolySuaraPoll.tsx`**
   - Menguruskan rendering UI poll untuk setiap luahan. Menggunakan *Optimistic UI* apabila butang undi ditekan supaya rasa lebih responsif.
4. **`src/components/polysuara/IGStoryExportCard.tsx`**
   - Komponen tersembunyi (`-z-50`) yang memegang _inline styles_ khusus untuk di-render oleh `html2canvas` menjadi gambar 9:16.

### 5.2 Pengurusan State & UI
- **Optimistic UI:** Upvote dan Poll UI dikemaskini secara lokal _(optimistically)_ sebelum menunggu respons dari Supabase.
- **Pengehadan Poll:** Maksimum **4 pilihan** dibenarkan semasa mencipta poll (dikuatkuasa di UI).
- **Prestasi (Performance):** Fetch requests (suara, report, etc) dibuat secara selari menggunakan `Promise.all()`.

---

## 6. Polisi Modifikasi (Arahan Kepada AI Agent)

Jika diminta untuk memodifikasi atau menambah ciri pada PolySuara di masa hadapan, patuhi arahan berikut:
1. **Dilarang keras menyentuh / mengaktifkan semula fitur Chat (polysuara_chats/polysuara_chat_messages).** Ia telah dimansuhkan.
2. Jika perlu menambah data baharu pada query feed utama, **pastikan Composite Index dikemaskini** (`idx_polysuara_active_feed`).
3. Jangan guna `any` type untuk props. Guna _Interface_ yang spesifik.
4. Jangan bina logik tapisan (filter) di frontend jika ia boleh dibuat di peringkat PostgreSQL triggers/RPC (seperti sensor kata kesat).
5. Segala perubahan pada layout mestilah menghormati komponen `BottomNav` (`pb-24 md:pb-6`) mengikut garis panduan JPP-POLISAS.

---
*(Dokumen ini dikemaskini berdasarkan Audit Deep Dive v5 pada 17 Mei 2026)*
