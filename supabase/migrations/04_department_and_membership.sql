-- ============================================================
-- 04_department_and_membership.sql
-- Tambah kolum department ke profiles &
-- ensure student_club_memberships sedia untuk multi-kelab
-- ============================================================

-- 1. Tambah kolum department ke profiles (jika belum ada)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS department TEXT;

-- 2. Pastikan student_club_memberships ada semua kolum yang diperlukan
ALTER TABLE student_club_memberships
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- 3. RLS policy untuk student_club_memberships – pelajar boleh INSERT permohonan sendiri
DROP POLICY IF EXISTS "Students can apply to clubs" ON student_club_memberships;
CREATE POLICY "Students can apply to clubs"
  ON student_club_memberships
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Pelajar boleh baca keanggotaan sendiri
DROP POLICY IF EXISTS "Students can read own memberships" ON student_club_memberships;
CREATE POLICY "Students can read own memberships"
  ON student_club_memberships
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Presiden/MT/Penasihat boleh update status keahlian dalam kelab mereka
DROP POLICY IF EXISTS "Leaders can approve memberships" ON student_club_memberships;
CREATE POLICY "Leaders can approve memberships"
  ON student_club_memberships
  FOR UPDATE
  USING (
    auth.uid()::text IN (
      SELECT id::text FROM profiles
      WHERE role IN ('CLUB_PRESIDENT', 'CLUB_ADVISOR', 'CLUB_MT')
        AND club_id::text = student_club_memberships.club_id::text
    )
    OR
    -- Super Admin JPP boleh update semua
    auth.uid()::text IN (
      SELECT id::text FROM profiles WHERE role = 'SUPER_ADMIN_JPP'
    )
  );

-- Super Admin boleh baca SEMUA memberships
DROP POLICY IF EXISTS "JPP admin can read all memberships" ON student_club_memberships;
CREATE POLICY "JPP admin can read all memberships"
  ON student_club_memberships
  FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT id::text FROM profiles WHERE role = 'SUPER_ADMIN_JPP'
    )
  );

-- Pemimpin kelab boleh baca memberships untuk kelab mereka
DROP POLICY IF EXISTS "Leaders can read club memberships" ON student_club_memberships;
CREATE POLICY "Leaders can read club memberships"
  ON student_club_memberships
  FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT id::text FROM profiles
      WHERE role IN ('CLUB_PRESIDENT', 'CLUB_ADVISOR', 'CLUB_MT')
        AND club_id::text = student_club_memberships.club_id::text
    )
  );

-- 4. system_settings: pastikan accept_all_memberships ada
INSERT INTO system_settings (key, value)
VALUES ('accept_all_memberships', to_jsonb(false))
ON CONFLICT (key) DO NOTHING;

-- 5. Pastikan clubs table ada kolum is_active (untuk Tambah Kelab feature)
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

DO $$
BEGIN
  RAISE NOTICE '04_department_and_membership.sql berjaya dijalankan.';
END $$;
