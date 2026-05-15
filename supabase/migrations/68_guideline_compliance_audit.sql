-- 68_guideline_compliance_audit.sql
-- Fixes all DEV_GUIDELINE.md §15.1 and §15.4 violations
-- found in the merit/demerit system audit.

-- ═══════════════════════════════════════════════════════════════
-- FIX 1 & 2: demerit_appeals — Rebuild ALL policies with
--   (SELECT auth.uid()) pattern and merge duplicates
-- ═══════════════════════════════════════════════════════════════

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins/Exco can manage all appeals" ON public.demerit_appeals;
DROP POLICY IF EXISTS "Users can insert own appeals" ON public.demerit_appeals;
DROP POLICY IF EXISTS "Users can view own appeals" ON public.demerit_appeals;

-- SELECT: merged student + admin into one policy (§15.1: satu policy per operasi)
CREATE POLICY "demerit_appeals_select" ON public.demerit_appeals
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
    )
  );

-- INSERT: students insert own appeals only
CREATE POLICY "demerit_appeals_insert" ON public.demerit_appeals
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = 'PENDING'
  );

-- UPDATE: admin/exco can update (approve/reject)
CREATE POLICY "demerit_appeals_update" ON public.demerit_appeals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
    )
  );

-- DELETE: admin only (rare, but needed)
CREATE POLICY "demerit_appeals_delete" ON public.demerit_appeals
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP')
    )
  );


-- ═══════════════════════════════════════════════════════════════
-- FIX 1: student_merit_cohorts — Rebuild with (SELECT auth.uid())
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Superadmin can manage merit cohorts" ON public.student_merit_cohorts;
DROP POLICY IF EXISTS "Users can view own merit cohort history" ON public.student_merit_cohorts;

-- SELECT: merged student + admin (§15.1: satu policy per operasi)
CREATE POLICY "student_merit_cohorts_select" ON public.student_merit_cohorts
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP')
    )
  );

-- INSERT/UPDATE/DELETE: admin only
CREATE POLICY "student_merit_cohorts_manage" ON public.student_merit_cohorts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP')
    )
  );


-- ═══════════════════════════════════════════════════════════════
-- FIX 5: Missing FK indexes (§15.4)
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_demerit_appeals_user_id
  ON public.demerit_appeals(user_id);

CREATE INDEX IF NOT EXISTS idx_demerit_appeals_transaction_id
  ON public.demerit_appeals(transaction_id);

CREATE INDEX IF NOT EXISTS idx_student_merit_cohorts_user_id
  ON public.student_merit_cohorts(user_id);
