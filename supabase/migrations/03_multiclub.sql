-- ============================================================
-- CIRI 3: Sokongan Multi-Kelab (Had Keahlian Dinamik)
-- 
-- ⚠️  BACA SEBELUM JALANKAN:
-- 1. Laman web belum direlease — OK untuk teruskan
-- 2. Script ini adalah IDEMPOTENT (selamat run berkali-kali)
-- 3. Tiada data sedia ada akan dipadam
-- 4. profiles.club_id DIKEKALKAN sebagai "primary club"
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 0: Tukar kolum system_settings.value dari boolean ke jsonb
-- (Supaya boleh simpan boolean DAN integer)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'system_settings' AND column_name = 'value';

  IF col_type = 'boolean' THEN
    -- 1) Buang DEFAULT sedia ada (boolean)
    ALTER TABLE system_settings ALTER COLUMN value DROP DEFAULT;
    -- 2) Tukar boolean → jsonb
    ALTER TABLE system_settings
      ALTER COLUMN value TYPE jsonb
      USING to_jsonb(value);
    -- 3) Set DEFAULT baru (jsonb true)
    ALTER TABLE system_settings ALTER COLUMN value SET DEFAULT 'true'::jsonb;
    RAISE NOTICE 'Kolum system_settings.value ditukar dari boolean ke jsonb.';
  ELSIF col_type = 'jsonb' THEN
    RAISE NOTICE 'Kolum system_settings.value sudah jsonb, skip.';
  ELSE
    ALTER TABLE system_settings ALTER COLUMN value DROP DEFAULT;
    ALTER TABLE system_settings
      ALTER COLUMN value TYPE jsonb
      USING value::jsonb;
    ALTER TABLE system_settings ALTER COLUMN value SET DEFAULT 'true'::jsonb;
    RAISE NOTICE 'Kolum system_settings.value ditukar dari % ke jsonb.', col_type;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Tambah had keahlian dalam system_settings
-- ─────────────────────────────────────────────────────────────
INSERT INTO system_settings (key, value)
VALUES ('max_clubs_per_student', to_jsonb(2))
ON CONFLICT (key) DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'Step 1 selesai: max_clubs_per_student = 2 dalam system_settings.'; END $$;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Buat Junction Table student_club_memberships
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_club_memberships (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_id        TEXT        NOT NULL,  -- Reference ke club_id (TEXT kerana ALL_CLUBS dalam frontend)
  role           TEXT        NOT NULL   DEFAULT 'CLUB_MEMBER',
  account_status TEXT        NOT NULL   DEFAULT 'PENDING'
                             CHECK (account_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  is_primary     BOOLEAN     NOT NULL   DEFAULT FALSE,  -- Kelab utama (primary)
  joined_at      TIMESTAMPTZ            DEFAULT NOW(),
  created_at     TIMESTAMPTZ            DEFAULT NOW(),
  updated_at     TIMESTAMPTZ            DEFAULT NOW(),

  CONSTRAINT unique_student_club UNIQUE (user_id, club_id)
);

-- Index untuk prestasi query
CREATE INDEX IF NOT EXISTS idx_scm_user_id   ON student_club_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_scm_club_id   ON student_club_memberships(club_id);
CREATE INDEX IF NOT EXISTS idx_scm_status    ON student_club_memberships(account_status);

DO $$ BEGIN RAISE NOTICE 'Step 2 selesai: Jadual student_club_memberships dibuat.'; END $$;

-- ─────────────────────────────────────────────────────────────
-- STEP 3: Enable RLS pada jadual baru
-- ─────────────────────────────────────────────────────────────
ALTER TABLE student_club_memberships ENABLE ROW LEVEL SECURITY;

-- Pelajar boleh baca keahlian sendiri
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_club_memberships' AND policyname = 'Student can read own memberships') THEN
    CREATE POLICY "Student can read own memberships"
    ON student_club_memberships FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- JPP boleh baca semua
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_club_memberships' AND policyname = 'JPP can read all memberships') THEN
    CREATE POLICY "JPP can read all memberships"
    ON student_club_memberships FOR SELECT
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP'));
  END IF;
END $$;

-- Presiden/Penasihat kelab yang sama boleh baca
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_club_memberships' AND policyname = 'Leaders can read club memberships') THEN
    CREATE POLICY "Leaders can read club memberships"
    ON student_club_memberships FOR SELECT
    USING (
      auth.uid() IN (
        SELECT id FROM profiles
        WHERE role IN ('CLUB_PRESIDENT', 'CLUB_ADVISOR')
          AND profiles.club_id::text = student_club_memberships.club_id::text
      )
    );
  END IF;
END $$;

-- Pelajar boleh daftar diri sendiri (INSERT dengan status PENDING sahaja)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_club_memberships' AND policyname = 'Student can request membership') THEN
    CREATE POLICY "Student can request membership"
    ON student_club_memberships FOR INSERT
    WITH CHECK (
      auth.uid() = user_id
      AND account_status = 'PENDING'
      AND role = 'CLUB_MEMBER'
    );
  END IF;
END $$;

-- Presiden/Penasihat/JPP boleh luluskan atau tolak
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_club_memberships' AND policyname = 'Leaders can approve or reject memberships') THEN
    CREATE POLICY "Leaders can approve or reject memberships"
    ON student_club_memberships FOR UPDATE
    USING (
      auth.uid() IN (
        SELECT id FROM profiles
        WHERE role IN ('SUPER_ADMIN_JPP', 'CLUB_ADVISOR', 'CLUB_PRESIDENT')
      )
    )
    WITH CHECK (
      account_status IN ('APPROVED', 'REJECTED')
    );
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'Step 3 selesai: RLS policies untuk student_club_memberships dipasang.'; END $$;

-- ─────────────────────────────────────────────────────────────
-- STEP 4: Migrasi Data Sedia Ada (profiles → student_club_memberships)
-- ─────────────────────────────────────────────────────────────
-- Insert keahlian sedia ada HANYA jika belum ada dalam junction table
INSERT INTO student_club_memberships (user_id, club_id, role, account_status, is_primary)
SELECT 
  id        AS user_id,
  club_id::text AS club_id,
  role,
  COALESCE(account_status, 'APPROVED') AS account_status,
  TRUE      AS is_primary  -- Kelab asal adalah primary
FROM profiles
WHERE club_id IS NOT NULL
  AND role IN ('CLUB_PRESIDENT', 'CLUB_MT', 'CLUB_MEMBER', 'CLUB_ADVISOR')
ON CONFLICT (user_id, club_id) DO NOTHING;

-- Sahkan jumlah rekod yang berjaya dipindahkan
DO $$
DECLARE
  profile_count INT;
  membership_count INT;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM profiles WHERE club_id IS NOT NULL;
  SELECT COUNT(*) INTO membership_count FROM student_club_memberships;
  RAISE NOTICE 'Migrasi data: % profil ada club_id, % rekod dalam student_club_memberships.', 
    profile_count, membership_count;
END
$$;

DO $$ BEGIN RAISE NOTICE 'Step 4 selesai: Data dimigrasi dari profiles.'; END $$;

-- ─────────────────────────────────────────────────────────────
-- STEP 5: Postgres Trigger — Had Keahlian Dinamik
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_club_membership_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_approved_count INT;
  max_allowed            INT;
BEGIN
  -- Hanya semak had apabila status bertukar ke APPROVED
  IF NEW.account_status <> 'APPROVED' THEN
    RETURN NEW;
  END IF;

  -- Jangan semak jika status tidak berubah (contoh: update field lain)
  IF TG_OP = 'UPDATE' AND OLD.account_status = 'APPROVED' THEN
    RETURN NEW;
  END IF;

  -- Hitung berapa kelab APPROVED yang sudah ada (TIDAK termasuk rekod ini sendiri)
  SELECT COUNT(*) INTO current_approved_count
  FROM student_club_memberships
  WHERE user_id = NEW.user_id
    AND account_status = 'APPROVED'
    AND id IS DISTINCT FROM NEW.id;

  -- Dapatkan had dari system_settings (jsonb → integer)
  SELECT (value)::int INTO max_allowed
  FROM system_settings
  WHERE key = 'max_clubs_per_student';

  -- Default = 2 jika tiada dalam settings
  IF max_allowed IS NULL THEN
    max_allowed := 2;
  END IF;

  -- Tolak jika melebihi had
  IF current_approved_count >= max_allowed THEN
    RAISE EXCEPTION 
      'Had keahlian dicapai. Pelajar ini sudah dalam % kelab. Had semasa: % kelab. Hubungi JPP untuk ubah had.',
      current_approved_count,
      max_allowed;
  END IF;

  RETURN NEW;

EXCEPTION 
  WHEN SQLSTATE 'P0001' THEN RAISE; -- Re-throw had keahlian exception
  WHEN OTHERS THEN
    RAISE WARNING 'enforce_club_membership_limit error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Pasang trigger
DROP TRIGGER IF EXISTS check_club_membership_limit ON student_club_memberships;
CREATE TRIGGER check_club_membership_limit
  BEFORE INSERT OR UPDATE OF account_status
  ON student_club_memberships
  FOR EACH ROW
  EXECUTE FUNCTION enforce_club_membership_limit();

DO $$ BEGIN RAISE NOTICE 'Step 5 selesai: Trigger enforce_club_membership_limit dipasang.'; END $$;

-- ─────────────────────────────────────────────────────────────
-- STEP 6: Tambah club_id pada jadual programs (jika belum ada)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'club_id'
  ) THEN
    -- Tambah kolum (boleh NULL dahulu)
    ALTER TABLE programs ADD COLUMN club_id TEXT;

    -- Isi data dari profiles (join melalui user_id → club_id)
    UPDATE programs p
    SET club_id = pr.club_id::text
    FROM profiles pr
    WHERE p.user_id = pr.id
      AND pr.club_id IS NOT NULL;

    -- Log berapa rekod berjaya di-update
    RAISE NOTICE 'Kolum programs.club_id ditambah dan data diisi.';
  ELSE
    RAISE NOTICE 'Kolum programs.club_id sudah wujud, skip.';
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────
-- STEP 7: Helper RPC Function — Dapatkan semua club_id pengguna
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_club_ids(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE  -- Optimasi: hasil sama untuk input sama dalam 1 transaksi
AS $$
  SELECT ARRAY(
    SELECT club_id 
    FROM student_club_memberships
    WHERE user_id = p_user_id 
      AND account_status = 'APPROVED'
    ORDER BY is_primary DESC, joined_at ASC
  );
$$;

DO $$ BEGIN RAISE NOTICE 'Step 7 selesai: RPC get_user_club_ids() dibuat.'; END $$;

-- ─────────────────────────────────────────────────────────────
-- SEMAK AKHIR
-- ─────────────────────────────────────────────────────────────
SELECT 
  '✅ Jadual student_club_memberships' AS item,
  COUNT(*) AS jumlah_rekod
FROM student_club_memberships

UNION ALL

SELECT 
  '✅ system_settings max_clubs_per_student',
  (value)::int
FROM system_settings WHERE key = 'max_clubs_per_student'

UNION ALL

SELECT
  '✅ programs.club_id (rekod yang ada club_id)',
  COUNT(*)::INT
FROM programs WHERE club_id IS NOT NULL;
