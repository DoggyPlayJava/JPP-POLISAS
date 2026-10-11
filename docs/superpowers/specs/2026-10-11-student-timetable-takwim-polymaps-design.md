# Design Specification: Sistem Jadual Waktu Pelajar, Takwim Peribadi & Integrasi PolyMaps

**Tarikh:** 2026-10-11  
**Status:** Draf Dimuktamadkan (Approved for Plan)  
**Pengarang:** JPP-POLISAS Core Engineering Team  

---

## 1. Pengenalan & Objektif (Overview & Objectives)

Sistem ini membolehkan pelajar POLISAS memuat naik jadual waktu kelas rasmi (dalam format PDF daripada portal akademik/pensyarah), mengekstrak jadual secara automatik di pelayar web (*client-side*), membolehkan semakan dan suntingan manual sebelum disimpan, memaparkan jadual peribadi dalam modul **e-Akademik (Takwim)**, memaparkan widget **Bento Card "Kelas Seterusnya"** di laman utama portal, serta menghubungkan bilik kuliah terus ke peta kampus **PolyMaps** dengan panduan arah dan laluan pejalan kaki berbumbung.

### Matlamat Utama (Core Goals)
1. **Sifar Beban Pelayan Semasa Pengekstrakan (Zero Server Load):** Memproses PDF menggunakan `pdfjs-dist` secara terus di pelayar pelajar bagi menjamin kestabilan infrastruktur semasa musim puncak orientasi (1,500 pengguna serentak).
2. **Pengesahan Mandatori (Never Auto-Commit):** Setiap hasil pengekstrakan wajib melalui jadual semakan interaktif (*preview modal*) di mana pelajar boleh menyunting, memadam, atau menambah slot sebelum data disimpan ke pangkalan data.
3. **Penyatuan Ekosistem (Unified Ecosystem):**
   * **Portal Pelajar:** Bento Card dinamik memaparkan kelas seterusnya dengan kiraan masa (*countdown*) dan butang navigasi pantas.
   * **e-Akademik:** Tab bersepadu "Jadual Kuliah Saya" bersebelahan "Takwim Rasmi Politeknik & Kelab".
   * **PolyMaps:** Pautan terus berasaskan UUID bilik (`/polymaps?room=<UUID>`) untuk memaparkan blok, aras, dan laluan navigasi.
4. **Peringatan Automatik Berkala (Automated Class Reminders):** Notifikasi Web Push & In-App dihantar 30 minit sebelum kelas bermula dengan kawalan ketat anti-penduaan (*race-condition-proof deduplication*).

---

## 2. Arkitektur Pangkalan Data & Skema (Database Schema)

Mengikut garis panduan ketat projek (`DEV_GUIDELINE.md`), semua dasar RLS wajib menggunakan `(SELECT auth.uid())`, setiap kunci asing (*foreign key*) mempunyai indeks, dan skema ternormal tanpa redundansi.

### 2.1 Jadual `student_timetables`
Menyimpan slot jadual kuliah pelajar. Kolum `building_id` digugurkan kerana maklumat blok diperoleh secara langsung melalui sambungan `location_id → imaps_locations.building_id → imaps_buildings`.

```sql
CREATE TABLE IF NOT EXISTS public.student_timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_session TEXT NOT NULL,                -- Contoh: '2025/2026'
    semester TEXT NOT NULL,                        -- Contoh: 'S2' atau 'SEM 2'
    class_name TEXT NOT NULL,                      -- Contoh: 'DEE2A', 'DTK4A'
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1=Isnin, 2=Selasa, 3=Rabu, 4=Khamis, 5=Jumaat
    start_time TIME NOT NULL,                      -- Contoh: '08:00:00'
    end_time TIME NOT NULL,                        -- Contoh: '10:00:00'
    course_code TEXT NOT NULL,                     -- Contoh: 'DEE20153'
    course_name TEXT NOT NULL,                     -- Contoh: 'DIGITAL ELECTRONICS'
    class_type TEXT NOT NULL DEFAULT 'KULIAH',     -- 'KULIAH', 'AMALI', 'TUTORIAL', 'LAIN_LAIN'
    lecturer_code TEXT,                            -- Contoh: 'AI', 'ZAR,ENBI'
    room_raw TEXT NOT NULL,                        -- Teks asal bilik dari PDF: 'EA303', 'EMSTEAM'
    location_id UUID REFERENCES public.imaps_locations(id) ON DELETE SET NULL, -- ID Bilik dalam PolyMaps
    is_online BOOLEAN NOT NULL DEFAULT false,      -- Ditandakan true jika kelas dalam talian (cth: MS Teams)
    color TEXT NOT NULL DEFAULT '#3b82f6',         -- Kod warna unik subjek untuk kalendar
    is_archived BOOLEAN NOT NULL DEFAULT false,    -- Arkib semester lama bila semester baru dimuat naik
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeks Prestasi
CREATE INDEX IF NOT EXISTS idx_student_timetables_user_archived 
ON public.student_timetables(user_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_student_timetables_location 
ON public.student_timetables(location_id);

CREATE INDEX IF NOT EXISTS idx_student_timetables_active_schedule 
ON public.student_timetables(day_of_week, start_time) 
WHERE is_archived = false;

-- RLS
ALTER TABLE public.student_timetables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_timetables_owner_and_superadmin"
ON public.student_timetables
FOR ALL
USING (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'
    )
)
WITH CHECK (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'
    )
);
```

### 2.2 Jadual `student_timetable_metadata`
Menyimpan had tarikh semester aktif pelajar untuk mengawal kitaran ulangan mingguan, cuti pertengahan semester, dan tarikh auto-arkib:

```sql
CREATE TABLE IF NOT EXISTS public.student_timetable_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_session TEXT NOT NULL,
    semester TEXT NOT NULL,
    class_name TEXT NOT NULL,
    semester_start_date DATE NOT NULL,
    semester_end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_active_meta UNIQUE (user_id, academic_session, semester)
);

ALTER TABLE public.student_timetable_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_timetable_metadata_owner_and_superadmin"
ON public.student_timetable_metadata
FOR ALL
USING (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'
    )
)
WITH CHECK (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'
    )
);
```

### 2.3 Jadual `student_timetable_settings`
Menyimpan keutamaan notifikasi peribadi:

```sql
CREATE TABLE IF NOT EXISTS public.student_timetable_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    reminder_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.student_timetable_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_timetable_settings_owner_and_superadmin"
ON public.student_timetable_settings
FOR ALL
USING (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'
    )
)
WITH CHECK (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'
    )
);
```

### 2.4 Jadual `imaps_room_mappings`
Jadual konfigurasi data untuk memetakan nama bilik teks kepada bilik PolyMaps atau kelas dalam talian tanpa sebarang *hardcoding* dalam kod:

```sql
CREATE TABLE IF NOT EXISTS public.imaps_room_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code_pattern TEXT NOT NULL UNIQUE,       -- Contoh: 'EMSTEAM', 'ONLINE', 'EA301', 'EB303'
    location_id UUID REFERENCES public.imaps_locations(id) ON DELETE CASCADE,
    is_online BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.imaps_room_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "imaps_room_mappings_read_all"
ON public.imaps_room_mappings FOR SELECT
USING (true);

CREATE POLICY "imaps_room_mappings_superadmin_write"
ON public.imaps_room_mappings FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'));
```

### 2.5 Jadual `student_timetable_notification_logs` (Anti-Spam & Dedup)
Mencegah sebarang pertindihan notifikasi pada hari yang sama menggunakan kekangan unik pangkalan data:

```sql
CREATE TABLE IF NOT EXISTS public.student_timetable_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID NOT NULL REFERENCES public.student_timetables(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notified_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_timetable_notified_per_day UNIQUE (timetable_id, notified_date)
);

CREATE INDEX IF NOT EXISTS idx_timetable_dedup_log 
ON public.student_timetable_notification_logs(timetable_id, notified_date);

ALTER TABLE public.student_timetable_notification_logs ENABLE ROW LEVEL SECURITY;

-- Pelajar hanya boleh membaca rekod notifikasi mereka sendiri
CREATE POLICY "student_timetable_notification_logs_select_own"
ON public.student_timetable_notification_logs
FOR SELECT
USING ((SELECT auth.uid()) = user_id);

-- Pentadbir Mutlak (SUPER_ADMIN_JPP) mempunyai akses penuh
CREATE POLICY "student_timetable_notification_logs_superadmin"
ON public.student_timetable_notification_logs
FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'));

-- Nota Keselamatan: Penulisan rekod log dedup dari cron dijalankan melalui service_role (supabaseAdmin) yang melangkaui RLS secara selamat. Pelajar biasa dihalang sepenuhnya daripada menyuntik atau memadam rekod log.
```

---

## 3. Saluran Enjin Pengekstrakan Fail (Client-Side Parser Pipeline)

Pengekstrakan dijalankan sepenuhnya di pihak pelayar (*client-side*) menggunakan pustaka sedia ada `pdfjs-dist` (^5.6.205).

### 3.1 Pengecaman Dokumen & Templat Modular
1. **Imbasan Halaman & Pengecaman Kelas (Bulk PDF):**
   * Parser membaca setiap muka surat dan mencari corak teks `KELAS\s*:\s*([A-Za-z0-9_-]+)`.
   * Menyenaraikan semua kelas yang ditemui (contoh: `DEE1A`, `DEE2A`, `DEE2B`, `DTK4A`).
2. **Dialog Pemilihan Kelas Manual:**
   * Memandangkan skema profil pengguna tidak mempunyai kolum kelas, sistem memaparkan dropdown senarai kelas yang dikesan dalam fail PDF.
   * Pelajar memilih kelas mereka sendiri (atau nombor muka surat) untuk diekstrak.
3. **Pengekstrakan Matriks Slot (JKE Template):**
   * Mengesan lajur masa (9 slot waktu: `08:00-09:00` hingga `16:00-17:00`).
   * Mengesan baris hari (`ISNIN`, `SELASA`, `RABU`, `KHAMIS`, `JUMAAT`).
   * Mengekstrak sel mengikut koordinat X/Y:
     * Baris 1: `KOD_KURSUS(JENIS)` (contoh: `DEE20153(L)` → kod `DEE20153`, jenis `KULIAH`).
     * Baris 2: Kod pensyarah (contoh: `AI` atau `ZAR,ENBI`).
     * Baris 3: Kod bilik (contoh: `EA303`, `EB301`, `EMSTEAM`).
   * **Penggabungan Slot Berturutan (Consecutive Slot Merging):**
     * Sekiranya slot 08:00–09:00 dan 09:00–10:00 mempunyai kod kursus, jenis, dan bilik yang sama, parser menggabungkannya menjadi 1 rekod dari 08:00 hingga 10:00 (2 jam).
4. **Padanan Legenda Bawah & Fallback Manual:**
   * Parser cuba memadankan kod kursus dengan jadual legenda di bahagian bawah muka surat (`KOD | NAMA KURSUS | JAM KREDIT`).
   * **Fallback:** Sekiranya jadual bawah tiada atau tidak lengkap, sistem tetap menyimpan kod kursus (`DEE20153`) dan membenarkan pelajar mengisi atau menyunting nama kursus secara terus dalam borang preview. Tiada sekatan simpanan.
5. **Pemetaan Bilik ke PolyMaps:**
   * Parser menyemak kod bilik `room_raw` dengan jadual `imaps_room_mappings` dan `imaps_locations`.
   * Jika padan: `location_id` diisi dengan UUID bilik PolyMaps.
   * Jika bilik adalah `EMSTEAM` atau `ONLINE`: `is_online` ditandakan `true`.
   * Jika tiada padanan: `location_id` kekal `null`, dan teks `room_raw` disimpan sebagai fallback carian teks PolyMaps.

### 3.2 Modal Semakan & Penyuntingan Mandatori (`TimetablePreviewModal`)
* **Tiada Auto-Commit:** Data tidak sekali-kali disimpan terus ke pangkalan data selepas parse.
* **Antaramuka Semakan:**
  * Paparan kad jadual mengikut hari (Isnin hingga Jumaat).
  * Pelajar boleh mengubah suai masa mula/tamat, menukar bilik, atau menukar nama kursus.
  * Butang *"Tambah Slot Manual"* untuk memasukkan kelas tambahan (contohnya subjek mengulang dari kelas lain atau ko-kurikulum).
  * Butang *"Padam Slot"* untuk membuang kelas yang telah digugurkan (*drop course*).
  * **Penentuan Tarikh Semester (semester_start_date & semester_end_date):**
    * **Sumber Utama:** Auto-isi secara automatik daripada kalendar akademik rasmi institusi (`system_settings` / `takwim-akademik-template.ts`) berdasarkan Sesi yang dikesan dari header PDF (cth: `S2 2025/2026`).
    * **Fallback:** Jika tiada padanan, sistem menggunakan `TARIKH KUATKUASA` (cth: `2026-01-12`) sebagai tarikh mula, dan menambah 18 minggu (tempoh standard semester politeknik: 14 minggu kuliah + 1 minggu cuti pertengahan + 1 minggu ulang kaji + 2 minggu peperiksaan) sebagai tarikh tamat lalai.
    * **Kawalan Pelajar:** Pelajar boleh menyemak dan meminda kedua-dua tarikh ini secara terus di dalam borang modal sebelum menyimpan.
  * **Notis Pendedahan UX (Disclaimer):**
    > ℹ️ *Peringatan: Ini adalah jadual kuliah mingguan biasa. Untuk minggu peperiksaan, cuti umum, atau minggu amali khas, sila rujuk Takwim Rasmi atau arahan pensyarah.*
  * Butang *"Sahkan & Simpan Jadual"*: Menyimpan rekod bersih ke `student_timetables` dan `student_timetable_metadata`.

---

## 4. Integrasi Antaramuka Pengguna (UI & UX Integration)

### 4.1 Bento Card Portal Pelajar (`NextClassBentoCard.tsx`)
Ditempatkan pada `PortalPage.tsx` di bahagian atas (bersebelahan/di bawah `KebajikanLiveTrackerCard`):

* **Pengiraan Masa Bebas Polling (Zero DB Polling):**
  * Data jadual diambil sekali sahaja semasa portal dibuka (disertakan dalam *parallel fetch* sedia ada `Promise.all`).
  * Pengiraan kelas seterusnya dan masa baki (*countdown*) dikira sepenuhnya di pihak klien menggunakan `setInterval` (30 saat per tick) mengikut zon masa Malaysia (`Asia/Kuala_Lumpur`).
* **Pautan Tindakan Berdasarkan Jenis Kelas (`is_online` Branching):**
  * **Jika Kelas Fizikal (`is_online = false`):**
    * Papar badge bilik & aras (cth: `EA301 · Blok A JKE`).
    * Butang tindakan: 🗺️ *"Panduan PolyMaps"* → membawa pengguna terus ke `/polymaps?room=${location_id}` (UUID). Jika `location_id` tiada (null), butang membawa ke `/polymaps?q=${encodeURIComponent(room_raw)}`.
  * **Jika Kelas Dalam Talian (`is_online = true` cth: EMSTEAM/ONLINE):**
    * Papar badge maya: 🌐 `ONLINE (MICROSOFT TEAMS)`.
    * Butang tindakan: 💻 *"Sertai Kelas Dalam Talian"* (atau panduan Teams).
    * ⚠️ **Butang PolyMaps disembunyikan sepenuhnya** kerana tiada pergerakan fizikal di kampus diperlukan.
* **Pengendalian Hari & Hujung Minggu:**
  * Pada petang Jumaat atau hujung minggu, kad secara automatik memaparkan kelas pertama pada hari Isnin minggu berikutnya (mengelakkan paparan "kelas esok = TIADA").
* **4 Status Paparan:**
  1. *Ada Kelas Hari Ini:* Menunjukkan countdown ("Dalam 25 minit" / "Sedang berlangsung"), subjek, bilik/blok (atau Teams), pensyarah, dan butang tindakan khusus.
  2. *Semua Kelas Selesai:* Mesej tahniah + pratonton kelas pertama hari persekolahan seterusnya.
  3. *Cuti / Tiada Kelas:* Status tiada kelas dijadualkan.
  4. *Belum Muat Naik:* Kad gesaan mesra untuk memuat naik jadual PDF.

### 4.2 Tab Bersepadu e-Akademik (`AkademikTakwimPage.tsx`)
* Tab Switcher di bahagian atas halaman:
  * **Tab 1: "Jadual Kuliah Saya"**
    * Paparan Grid Mingguan (Desktop/Tablet) berserta warna subjek (*color-coded*).
    * Mod Paparan Senarai Agenda Harian (Mesra telefon pintar / Mobile view).
    * Butang *"Muat Naik Jadual PDF"*.
    * Butang *"Tambah Kelas Manual"*.
    * Suis *Toggle* Notifikasi Peringatan (ikut minit pilihan pelajar).
  * **Tab 2: "Takwim Rasmi Politeknik & Kelab"**
    * Mengekalkan takwim berpusat sedia ada (`useTakwimPusat`) tanpa sebarang regresi.

---

## 5. Enjin Notifikasi & Automasi (Notification Engine)

* **Zon Masa Malaysia Wajib (Timezone Integrity - UTC+8):**
  * Memandangkan pangkalan data dan pelayan beroperasi secara default pada UTC, semua fungsi SQL, cron, dan perbandingan masa **WAJIB** ditukar kepada zon masa Malaysia:
    * `(NOW() AT TIME ZONE 'Asia/Kuala_Lumpur')`
    * `(CURRENT_DATE AT TIME ZONE 'Asia/Kuala_Lumpur')`
    * `EXTRACT(ISODOW FROM (NOW() AT TIME ZONE 'Asia/Kuala_Lumpur'))` (1=Isnin .. 7=Ahad)
  * Ini menghalang ralat kritikal di mana kelas 8:00 PG Isnin waktu Malaysia dikira sebagai hari Ahad jam 00:00 UTC, yang boleh menyebabkan kegagalan penghantaran dan ralat tarikh dedup.
* **Masa Peringatan Dinamik Mengikut Tetapan Pelajar (`reminder_minutes`):**
  * Cron **TIDAK** menghardcode tetingkap 25-35 minit.
  * Sebaliknya, kueri menyambung (`JOIN`) jadual `student_timetable_settings` untuk membaca `reminder_minutes` pelajar (default 30 minit, atau 15/45 minit jika diubah pelajar).
  * Kueri memadankan:
    ```sql
    t.start_time BETWEEN 
      ((NOW() AT TIME ZONE 'Asia/Kuala_Lumpur')::time + (COALESCE(s.reminder_minutes, 30) - 4) * INTERVAL '1 minute')
      AND 
      ((NOW() AT TIME ZONE 'Asia/Kuala_Lumpur')::time + (COALESCE(s.reminder_minutes, 30) + 4) * INTERVAL '1 minute')
    ```
* **Penggunaan Semula Sistem Sedia Ada (Reuse Existing Push Infra):**
  * Menggunakan sistem Web Push sedia ada (`push_subscriptions` + VAPID) dan jadual `notifications` dalam pangkalan data. Tiada pembinaan enjin push baharu.
* **Kalis Pertindihan (Race-Condition-Proof Dedup):**
  * Setiap notifikasi yang dihantar merekodkan rekod ke `student_timetable_notification_logs`.
  * Menggunakan arahan `INSERT INTO student_timetable_notification_logs (timetable_id, user_id, notified_date) VALUES (...) ON CONFLICT (timetable_id, notified_date) DO NOTHING`.
  * `notified_date` dikira menggunakan `(NOW() AT TIME ZONE 'Asia/Kuala_Lumpur')::date`.
* **Mod Luar Talian (Offline Support):**
  * Data jadual kuliah dicache dalam `localStorage` / `IndexedDB` pelayar melalui PWA Service Worker (`sw.ts`). Pelajar boleh membuka jadual kuliah peribadi walaupun tiada sambungan internet di dalam bilik kuliah.

---

## 6. Pelan Ujian & Pengesahan (Testing Strategy)

1. **Ujian Unit (Vitest):**
   * Ujian pengekstrakan parser `pdfjs-dist` terhadap sampel PDF JKE sebenar (`CM_SEM3_JKE`, `DEE1A`, `DEE2A`, `DTK4A`).
   * Ujian penggabungan slot berturutan (2 jam kuliah berterusan).
   * Ujian pemetaan bilik `room_raw` ke PolyMaps `location_id` dan penandaan `is_online`.
2. **Ujian E2E (Playwright):**
   * Senario 1: Pelajar memuat naik PDF jadual bulk → sistem buka dialog pilih kelas → pilih `DEE2A` → modal preview memaparkan slot yang betul → simpan ke DB.
   * Senario 2: Semak laman `PortalPage` memaparkan Bento Card dengan kelas seterusnya → klik butang PolyMaps → navigasi ke `/polymaps?room=<UUID>` dan pastikan pin serta maklumat bilik terpapar.
   * Senario 3: Uji suis *toggle* notifikasi di e-Akademik dan pastikan perubahan disimpan dalam `student_timetable_settings`.

---

## 7. Pecahan Fasa Pelaksanaan (Implementation Phases)

* **Fasa 1: Foundation (Parser, DB & Preview Modal)**
  * Migrasi pangkalan data (`student_timetables`, `student_timetable_metadata`, `student_timetable_settings`, `imaps_room_mappings`, `student_timetable_notification_logs`).
  * Utiliti parser `src/lib/timetableParser.ts` menggunakan `pdfjs-dist`.
  * Komponen dialog pemilihan kelas & modal semakan interaktif `TimetablePreviewModal.tsx`.
* **Fasa 2: Integrasi e-Akademik & Portal Bento Card**
  * Tab "Jadual Kuliah Saya" dalam `AkademikTakwimPage.tsx` (paparan grid & mobile agenda).
  * Komponen `NextClassBentoCard.tsx` pada `PortalPage.tsx` dengan kiraan masa klien (*client-side countdown*).
* **Fasa 3: PolyMaps Deep-Link & Enjin Notifikasi Automatik**
  * Pautan navigasi satu-klik dari Bento Card dan Takwim ke `/polymaps?room=<UUID>`.
  * Skrip fungsi berjadual notifikasi dengan dedup unik.
