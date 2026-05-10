-- ============================================================
-- POLYRIDER INFRASTRUCTURE AUDIT FIXES — 10 Mei 2026
-- Migration: 52_polyrider_infrastructure_audit_fixes
--
-- Fixes applied:
--   1. polyrider_bids RLS initplan — (SELECT auth.uid()) wrapper
--   2. is_klk_or_admin() VOLATILE → STABLE
--   3. polyrider_location_presets redundant/broken policies removed
--   4. 8 missing FK indexes added
--   5. search_path hardened on 2 non-PolyRider functions
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- FIX 1: polyrider_bids RLS — Tambah (SELECT auth.uid()) wrapper
--        Cegah CPU spike akibat per-row re-evaluation
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Riders can insert bids" ON polyrider_bids;
CREATE POLICY "Riders can insert bids" ON polyrider_bids
  FOR INSERT WITH CHECK (rider_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admin can manage all bids" ON polyrider_bids;
CREATE POLICY "Admin can manage all bids" ON polyrider_bids
  FOR ALL USING (is_klk_or_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Students can update bids for their jobs" ON polyrider_bids;
CREATE POLICY "Students can update bids for their jobs" ON polyrider_bids
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM polyrider_jobs
    WHERE polyrider_jobs.id = polyrider_bids.job_id
      AND polyrider_jobs.student_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM polyrider_jobs
    WHERE polyrider_jobs.id = polyrider_bids.job_id
      AND polyrider_jobs.student_id = (SELECT auth.uid())
  ));

-- ────────────────────────────────────────────────────────────
-- FIX 2: is_klk_or_admin() — Tukar VOLATILE → STABLE
--        Cegah panggilan berulang profiles lookup pada setiap baris
-- ────────────────────────────────────────────────────────────

ALTER FUNCTION is_klk_or_admin(uuid) STABLE;

-- ────────────────────────────────────────────────────────────
-- FIX 3: polyrider_location_presets — Buang polisi redundan/rosak
--        presets_read (qual: true) membocorkan presets nyahaktif
--        presets_admin_* menyemak role='admin' yang tidak wujud
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "presets_read" ON polyrider_location_presets;
DROP POLICY IF EXISTS "presets_admin_delete" ON polyrider_location_presets;
DROP POLICY IF EXISTS "presets_admin_insert" ON polyrider_location_presets;
DROP POLICY IF EXISTS "presets_admin_update" ON polyrider_location_presets;

-- ────────────────────────────────────────────────────────────
-- FIX 4: Tambah 8 FK indexes yang hilang
--        Cegah sequential scan pada JOIN dan CASCADE DELETE
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_polyrider_chats_sender
  ON polyrider_chats(sender_id);

CREATE INDEX IF NOT EXISTS idx_polyrider_sos_logs_job
  ON polyrider_sos_logs(job_id);

CREATE INDEX IF NOT EXISTS idx_polyrider_sos_logs_triggered_by
  ON polyrider_sos_logs(triggered_by);

CREATE INDEX IF NOT EXISTS idx_polyrider_sos_logs_resolved_by
  ON polyrider_sos_logs(resolved_by);

CREATE INDEX IF NOT EXISTS idx_polyrider_jobs_cancelled_by
  ON polyrider_jobs(cancelled_by);

CREATE INDEX IF NOT EXISTS idx_polyrider_appeals_user_id
  ON polyrider_appeals(user_id);

CREATE INDEX IF NOT EXISTS idx_polyrider_appeals_reviewed_by
  ON polyrider_appeals(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_polyrider_sos_contacts_user_id
  ON polyrider_sos_contacts(user_id);

-- ────────────────────────────────────────────────────────────
-- FIX 5: Tetapkan search_path pada fungsi tanpa search_path
--        Cegah search_path injection attack
-- ────────────────────────────────────────────────────────────

ALTER FUNCTION merge_klk_kawasan(text[], text) SET search_path = public;
ALTER FUNCTION auto_sort_pencapaian_file(uuid) SET search_path = public;
