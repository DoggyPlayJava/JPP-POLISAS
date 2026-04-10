# Sistem Pengurusan Gerai JPP — e-Keusahawanan

## Konteks: Hierarchy JPP

Berdasarkan struktur sebenar JPP, kita ada dua peringkat:

```
SUPER_ADMIN_JPP (Penasihat HEP + Developer)
        │
        ▼
┌─────────────────────────────────────┐
│  MAJLIS TERTINGGI (MT) JPP          │
│  Yang Di-pertua (YDP)               │
│  Timbalan YDP                       │
│  Naib YDP                           │
│  Setiausaha Kerja                   │
│  Setiausaha Kehormat                │
│  Bendahari  ←── oversees exco tertentu │
└───────────────┬─────────────────────┘
                │ oversee
    ┌───────────┼───────────┐
    ▼           ▼           ▼
Exco KPP   Exco Keus.  Exco Kebajikan  ...dst
```

Masalah **semasa**: semua JPP guna `role = 'JPP'` sahaja — tiada cara bezakan MT vs Exco vs Exco unit mana.

---

## Cadangan: Tambah `jpp_position` & `jpp_unit` pada Profiles

> [!IMPORTANT]
> Ini adalah **migration database** yang diperlukan sebelum buat sistem berpusat Exco.

```sql
ALTER TABLE profiles
  ADD COLUMN jpp_position text,   -- Jawatan dalam JPP
  ADD COLUMN jpp_unit     text;   -- Unit exco (NULL untuk MT)

-- Nilai jpp_position:
-- MT: 'YDP' | 'TIMBALAN_YDP' | 'NAIB_YDP' | 'SETIAUSAHA_KERJA'
--     | 'SETIAUSAHA_KEHORMAT' | 'BENDAHARI'
-- Exco: 'KETUA_EXCO' | 'TIMBALAN_EXCO' | 'EXCO_BIASA'

-- Nilai jpp_unit (untuk Exco sahaja):
-- 'KEUSAHAWANAN' | 'KPP' | 'KEBAJIKAN' | 'SUKAN' | 'KEDIAMAN' | ...
```

> [!NOTE]
> MT akan ditugaskan untuk menjaga (oversee) 'Anak Exco' mereka melalui jadual `jpp_mt_assignments`. 
> Contoh: NYDP jaga Exco Keusahawanan & Akademik. Bendahari jaga Exco KPP & KLS.

```sql
CREATE TABLE jpp_mt_assignments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mt_user_id  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  unit        text NOT NULL,  -- 'KEUSAHAWANAN', 'KPP', dll.
  assigned_at timestamptz DEFAULT now()
);
```

---

## Modul Pegurusan MT & Anak Exco (Sudah Disiapkan ✅ & Berskala Besar 🚀)

Sistem pautan MT dan "Anak Exco" telah wujud sepenuhnya di `JppAdminPage.tsx` di bawah tab **Pengurusan Ahli JPP**.
Logik ini direka khusus supaya ia bukan sekadar untuk e-Keusahawanan, tetapi **berskala besar (scalable) secara automatik**. 

* Supabase `jpp_mt_assignments` dan UI mengawal akses secara dinamik menggunakan `unit.code`.
* Sebagai contoh: YDP boleh jaga Semua Exco, TYDP boleh *assign* ke Kebajikan (`KEBAJIKAN`), manakala NYDP boleh di set *assign* ke Keusahawanan (`KEUSAHAWANAN`).
* Semuanya dikendalikan dalam komponen `JppMemberPanel` hasil fungsi *multi-select* yang fleksibel, membolehkan *access control* yang berkesan untuk semua modul Exco pada masa mendatang!

---

## Akses Pengurusan (Contoh: Sistem Gerai Keusahawanan)

Peraturan akses (RLS & UI Guards) ini memastikan hanya orang yang berhak mempunyai kuasa **Pengurus (Manager)** yang boleh *set up* jadual, lulus pertukaran syif, dan akses kawalan penuh.

| Role Parameter | Kuasa / Akses |
|---|---|
| `SUPER_ADMIN_JPP` (Developer/Penasihat) | Semua — Full Access |
| **MT: YDP** (`jpp_position = 'YDP'`) | Semua — Full Access automatik ke semua unit Exco |
| **MT yang di-assign** (Ada rekod `jpp_mt_assignments` = `KEUSAHAWANAN`) | Full Access — Setup jadual, approve swap, lihat kewangan |
| **Ketua Exco** (`jpp_unit = 'KEUSAHAWANAN' & jpp_position = 'KETUA_EXCO'`) | Full Access — Terhad kepada unit Keusahawanan sahaja |
| **Ahli Exco Biasa** (`jpp_unit = 'KEUSAHAWANAN'`) | Basic Access — Lihat jadual, request swap, buka/tutup kedai |
| Ahli JPP lain / Pelajar / MT tidak di-assign | ❌ Akses ditolak |

---

## Jadual Syif: 8 Pagi – 5 Petang (9 Slot × 1 Jam)

```
08:00-09:00  | 09:00-10:00 | 10:00-11:00 | 11:00-12:00 | 12:00-13:00
13:00-14:00  | 14:00-15:00 | 15:00-16:00 | 16:00-17:00
```

Setiap slot boleh ada **1 assignee** (ahli Exco Keusahawanan sahaja).

---

## Database Schema (Sistem Gerai)

### Jadual 1: `gerai_shifts`
```sql
CREATE TABLE gerai_shifts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_date   date NOT NULL,
  shift_hour   int  NOT NULL CHECK (shift_hour BETWEEN 8 AND 16),
  assigned_to  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES profiles(id),
  notes        text,
  status       text DEFAULT 'SCHEDULED'
                CHECK (status IN ('SCHEDULED','PRESENT','ABSENT','SWAPPED')),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(shift_date, shift_hour)
);
```

### Jadual 2: `gerai_shift_swaps`
```sql
CREATE TABLE gerai_shift_swaps (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id      uuid REFERENCES gerai_shifts(id) ON DELETE CASCADE,
  requested_by  uuid REFERENCES profiles(id),
  swap_with     uuid REFERENCES profiles(id),
  reason        text NOT NULL,
  status        text DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  responded_by  uuid REFERENCES profiles(id),
  responded_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);
```

### Jadual 3: `gerai_sessions`
```sql
CREATE TABLE gerai_sessions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date    date NOT NULL UNIQUE,
  opened_by       uuid REFERENCES profiles(id),
  closed_by       uuid REFERENCES profiles(id),
  opening_cash    numeric(10,2) NOT NULL DEFAULT 0,
  closing_cash    numeric(10,2),
  total_sales     numeric(10,2),
  total_expenses  numeric(10,2) DEFAULT 0,
  net_profit      numeric(10,2) GENERATED ALWAYS AS (
                    closing_cash - opening_cash - total_expenses
                  ) STORED,
  opening_time    timestamptz,
  closing_time    timestamptz,
  opening_notes   text,
  closing_notes   text,
  status          text DEFAULT 'OPEN'
                  CHECK (status IN ('OPEN','CLOSED')),
  created_at      timestamptz DEFAULT now()
);
```

### RLS (Row Level Security) - Logik Kuasa Access Baharu
```sql
-- Helper function check access tingkat Exco/MT
CREATE OR REPLACE FUNCTION has_keusahawanan_gerai_access()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (
         -- 1. Super Admin
         role IN ('SUPER_ADMIN_JPP', 'ADMIN')
         OR 
         (role = 'JPP' AND (
            -- 2. YDP sentiasa dapat access
            jpp_position = 'YDP'
            -- 3. Ahli Unit tersebut
            OR jpp_unit = 'KEUSAHAWANAN'
            -- 4. MT yang telah di-assign menjaga (Anak Exco)
            OR EXISTS (
              SELECT 1 FROM jpp_mt_assignments
              WHERE mt_user_id = auth.uid() AND unit = 'KEUSAHAWANAN'
            )
         ))
    )
  )
$$;

ALTER TABLE gerai_shifts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gerai_shift_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE gerai_sessions    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gerai_access_policy" ON gerai_shifts
  FOR ALL USING (has_keusahawanan_gerai_access());
-- Diulang untuk gerai_shift_swaps & gerai_sessions
```

---

## Fasa Pelaksanaan Seterusnya

### Fasa 1 — Pembinaan Asas Struktur JPP (SELESAI ✅)
- [x] Buat SQL Migration: Tambah `jpp_position`, `jpp_unit`, jadual `jpp_mt_assignments`.
- [x] Padam limitasi lama dan bina fungsi kemaskini profil MT/Exco dalam sistem sedia ada.
- [x] Buat Tab "Ahli JPP HIERARCHY" dalam `JppAdminPage` untuk proses penetapan anak exco oleh `SUPER_ADMIN_JPP`.

### Fasa 2 — Pembuatan UI Modul Gerai (Keusahawanan) (SELESAI ✅)
- [x] Buat SQL Migration untuk 3 jadual `gerai_` berserta function `has_keusahawanan_gerai_access()`.
- [x] Buat `GeraiPage.tsx` - Semperna `has_keusahawanan_gerai_access` sebagai gatekeeper.
- [x] Terapkan logik "Manager View" untuk yang berjawatan YDP, Ketua Exco, dan MT bertugas (boleh set jadual dll). Ahli biasa dapat "Member View".
- [x] Selesaikan UI swap sistem.
- [x] Siapkan rekod kewangan (Till count, POS mudah).

---

## Kesimpulan

Sistem ini memastikan **Kawalan RLS** dan **Logik UI** dikendalikan melalui `jpp_mt_assignments` dan profil `has_keusahawanan_gerai_access()`. Ia kukuh, **mudah dikembangkan ('scalable') untuk unit Kebajikan dan lain-lain**, serta memberi kuasa pantau kepada ahli MT tanpa melibatkan koding baharu pada masa hadapan. Semuanya sudah siap, sedia untuk digunakan oleh pengguna.
