-- ============================================================
-- FASA 1A: Index Prestasi untuk JPP-POLISAS
-- Tujuan: Permudahkan queries yang paling kerap digunakan
-- semasa 800+ pengguna serentak (Hari Karnival)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PROFILES TABLE
-- Query: WHERE club_id = X AND account_status = 'APPROVED'
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_club_status
  ON profiles(club_id, account_status);

CREATE INDEX IF NOT EXISTS idx_profiles_merit_desc
  ON profiles(merit DESC NULLS LAST);

-- ─────────────────────────────────────────────────────────────
-- PROGRAMS TABLE
-- Query: WHERE club_id = X AND status NOT IN ('COMPLETED')
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_programs_club_status
  ON programs(club_id, status);

CREATE INDEX IF NOT EXISTS idx_programs_club_updated
  ON programs(club_id, updated_at DESC);

-- ─────────────────────────────────────────────────────────────
-- CLUB_TASKS TABLE
-- Query: WHERE club_id = X AND is_archived = false
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_club_archived
  ON club_tasks(club_id, is_archived, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_club_approval
  ON club_tasks(club_id, approval_status);

-- ─────────────────────────────────────────────────────────────
-- CLUB_ACTIVITIES TABLE
-- Query: WHERE club_id = X ORDER BY start_date
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activities_club_date
  ON club_activities(club_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_activities_club_status
  ON club_activities(club_id, status);

-- ─────────────────────────────────────────────────────────────
-- CLUB_ANNOUNCEMENTS TABLE
-- Query: WHERE club_id = X ORDER BY created_at DESC LIMIT 1
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_announcements_club_created
  ON club_announcements(club_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- STUDENT_CLUB_MEMBERSHIPS TABLE
-- Query: WHERE user_id = X AND account_status = 'APPROVED'
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scm_user_approved
  ON student_club_memberships(user_id, account_status)
  WHERE account_status = 'APPROVED';

CREATE INDEX IF NOT EXISTS idx_scm_club_approved
  ON student_club_memberships(club_id, account_status)
  WHERE account_status = 'APPROVED';

-- ─────────────────────────────────────────────────────────────
-- Semak index yang berjaya dibuat
-- ─────────────────────────────────────────────────────────────
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
