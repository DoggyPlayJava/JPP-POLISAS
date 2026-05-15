-- 67_fix_merit_system_audit.sql
-- Comprehensive fix for all merit/demerit system issues found in audit

-- ═══════════════════════════════════════════════════════════════
-- FIX 1 & 2 & 9: Rebuild archive_merit_cohort
--   - Reset ALL merit columns (merit_kelab, merit_akademik, merit_asrama)
--   - Add SET search_path for security
--   - Save breakdown per-source in student_merit_cohorts
-- ═══════════════════════════════════════════════════════════════

-- First, add breakdown columns to student_merit_cohorts
ALTER TABLE public.student_merit_cohorts
  ADD COLUMN IF NOT EXISTS merit_kelab    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merit_akademik INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merit_asrama   INTEGER NOT NULL DEFAULT 0;

-- Rebuild function
CREATE OR REPLACE FUNCTION public.archive_merit_cohort(p_cohort_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Archive full breakdown into student_merit_cohorts
    INSERT INTO public.student_merit_cohorts (
      user_id, cohort_id, total_merit, merit_kelab, merit_akademik, merit_asrama
    )
    SELECT id, p_cohort_id, merit,
           COALESCE(merit_kelab, 0),
           COALESCE(merit_akademik, 0),
           COALESCE(merit_asrama, 0)
    FROM public.profiles
    WHERE merit != 0 OR merit_kelab != 0 OR merit_akademik != 0 OR merit_asrama != 0;

    -- 2. Mark existing merit_transactions with the archived cohort_id
    UPDATE public.merit_transactions
    SET academic_session = p_cohort_id
    WHERE academic_session IS NULL;

    -- 3. Reset ALL profile merit columns to 0
    UPDATE public.profiles
    SET merit = 0,
        merit_kelab = 0,
        merit_akademik = 0,
        merit_asrama = 0
    WHERE merit != 0 OR merit_kelab != 0 OR merit_akademik != 0 OR merit_asrama != 0;
END;
$$;


-- ═══════════════════════════════════════════════════════════════
-- FIX 3: student_merit_cohorts RLS — wrong role name 'SUPERADMIN'
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Superadmin can manage merit cohorts" ON public.student_merit_cohorts;

CREATE POLICY "Superadmin can manage merit cohorts"
ON public.student_merit_cohorts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP')
  )
);


-- ═══════════════════════════════════════════════════════════════
-- FIX 4: increment_merit_by_source — handle MANUAL and PROGRAM
--   MANUAL → only affects global merit (no specific column)
--   PROGRAM → maps to merit_kelab (as per trigger in migration 40)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.increment_merit_by_source(p_uid uuid, p_delta integer, p_src text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    merit          = COALESCE(merit, 0) + p_delta,
    merit_kelab    = CASE WHEN p_src IN ('KELAB', 'PROGRAM')
                         THEN COALESCE(merit_kelab, 0) + p_delta
                         ELSE merit_kelab END,
    merit_akademik = CASE WHEN p_src = 'AKADEMIK'
                         THEN COALESCE(merit_akademik, 0) + p_delta
                         ELSE merit_akademik END,
    merit_asrama   = CASE WHEN p_src = 'QR_SCAN'
                         THEN COALESCE(merit_asrama, 0) + p_delta
                         ELSE merit_asrama END
  WHERE id = p_uid;
END;
$$;


-- ═══════════════════════════════════════════════════════════════
-- FIX 5: demerit_appeals SELECT policy — Exco can't see others' appeals
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view and create own appeals" ON public.demerit_appeals;

-- Students can view their own appeals
CREATE POLICY "Users can view own appeals"
ON public.demerit_appeals FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
  )
);
