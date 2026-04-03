-- ============================================================
-- CIRI 1: RLS untuk Akses Arkib JPP
-- Jalankan script ini di Supabase SQL Editor (full)
-- ============================================================

-- [1A] JPP boleh baca SEMUA programs (termasuk COMPLETED/DRAFT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'programs' AND policyname = 'JPP can read all programs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "JPP can read all programs"
      ON programs FOR SELECT
      USING (
        auth.uid() IN (
          SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP'
        )
      )
    $policy$;
    RAISE NOTICE 'Policy "JPP can read all programs" created.';
  ELSE
    RAISE NOTICE 'Policy "JPP can read all programs" already exists, skipping.';
  END IF;
END
$$;

-- [1B] JPP boleh baca SEMUA club_reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'club_reports' AND policyname = 'JPP can read all club_reports'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "JPP can read all club_reports"
      ON club_reports FOR SELECT
      USING (
        auth.uid() IN (
          SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP'
        )
      )
    $policy$;
    RAISE NOTICE 'Policy "JPP can read all club_reports" created.';
  ELSE
    RAISE NOTICE 'Policy "JPP can read all club_reports" already exists, skipping.';
  END IF;
END
$$;

-- Semak RLS aktif
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('programs', 'club_reports');
