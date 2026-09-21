-- ============================================================================
-- Migration: 20260923_makmp_insert_policy_safety.sql
-- Description: Safety-net — pastikan policy INSERT makmp_submissions sentiasa
--   WITH CHECK (true) (guest boleh submit borang MAKMP).
--
--   Punca insiden: selepas migration juri portal (banyak DROP/CREATE POLICY +
--   NOTIFY), PostgREST schema cache menjadi stale sehingga INSERT makmp_submissions
--   gagal dengan "new row violates row-level security policy" walaupun policy
--   INSERT asal tidak disentuh. Migration ini EXPLICITLY recreate policy INSERT
--   + NOTIFY reload supaya state sentiasa konsisten & reproducible.
-- ============================================================================

DROP POLICY IF EXISTS "makmp_submissions_insert" ON public.makmp_submissions;
CREATE POLICY "makmp_submissions_insert" ON public.makmp_submissions
  FOR INSERT WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
