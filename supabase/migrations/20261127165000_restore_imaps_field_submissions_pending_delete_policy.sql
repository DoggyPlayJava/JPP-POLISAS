-- ============================================================================
-- Migration: 20261127165000_restore_imaps_field_submissions_pending_delete_policy.sql
-- Module: PolyMaps 360° Volunteer Field Submissions
-- Purpose:
--   Restore volunteer self-delete permission for their own still-pending
--   submissions on public.imaps_field_submissions, while preserving ONE
--   non-overlapping DELETE policy using (SELECT auth.uid()) and is_imaps_admin().
-- ============================================================================

ALTER TABLE public.imaps_field_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imaps_field_submissions_delete_policy"
  ON public.imaps_field_submissions;

CREATE POLICY "imaps_field_submissions_delete_policy"
  ON public.imaps_field_submissions FOR DELETE
  USING (
    (contributor_id = (SELECT auth.uid()) AND status = 'pending')
    OR public.is_imaps_admin((SELECT auth.uid()))
  );

GRANT DELETE ON public.imaps_field_submissions TO authenticated;
