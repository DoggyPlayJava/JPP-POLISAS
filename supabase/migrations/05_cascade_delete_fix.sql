-- ============================================================
-- 05_cascade_delete_fix.sql
-- Betulkan foreign key supaya delete user auto-cascade
-- ke semua jadual utama. (Jadual logs/reports sedia ada cascade)
-- ============================================================

-- 1. Betulkan FK pada profiles → auth.users (CASCADE DELETE)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Betulkan FK pada student_club_memberships → profiles
ALTER TABLE student_club_memberships DROP CONSTRAINT IF EXISTS student_club_memberships_user_id_fkey;
ALTER TABLE student_club_memberships
  ADD CONSTRAINT student_club_memberships_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Betulkan FK pada club_activities → profiles
ALTER TABLE club_activities DROP CONSTRAINT IF EXISTS club_activities_user_id_fkey;
ALTER TABLE club_activities
  ADD CONSTRAINT club_activities_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

DO $$
BEGIN
  RAISE NOTICE '05_cascade_delete_fix.sql berjaya dikemaskini. Pangkalan data diperkukuhkan untuk auto-cascade deletion.';
END $$;
