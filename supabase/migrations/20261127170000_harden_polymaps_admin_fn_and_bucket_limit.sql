-- ============================================================================
-- Migration: 20261127170000_harden_polymaps_admin_fn_and_bucket_limit.sql
-- Module: PolyMaps / PolyMaps 360° Security & Storage Hardening
-- Purpose:
--   1. Prevent any caller from probing another user's UUID via is_imaps_admin()
--      and restrict EXECUTE privilege to authenticated callers only.
--   2. Split imaps_panoramas SELECT policy cleanly by role (anon vs authenticated)
--      so unauthenticated visitors on /polymaps never invoke is_imaps_admin().
--   3. Restore imaps_assets bucket file_size_limit to 5MB (5242880 bytes) since
--      both Studio 360° and Admin direct uploads compress panoramas <= 3.5MB JPEG.
-- ============================================================================

-- 1. Harden public.is_imaps_admin(p_uid UUID)
CREATE OR REPLACE FUNCTION public.is_imaps_admin(p_uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_uid IS NULL OR p_uid IS DISTINCT FROM (SELECT auth.uid()) THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_uid
      AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP', 'super_admin', 'SUPER_ADMIN')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_imaps_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_imaps_admin(UUID) TO authenticated;

-- 2. Split imaps_panoramas SELECT policy by role (1 policy per role, zero overlap)
ALTER TABLE public.imaps_panoramas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imaps_panoramas_select_policy" ON public.imaps_panoramas;
DROP POLICY IF EXISTS "imaps_panoramas_select_anon_policy" ON public.imaps_panoramas;
DROP POLICY IF EXISTS "imaps_panoramas_select_authenticated_policy" ON public.imaps_panoramas;

CREATE POLICY "imaps_panoramas_select_anon_policy"
  ON public.imaps_panoramas FOR SELECT
  TO anon
  USING (status = 'published');

CREATE POLICY "imaps_panoramas_select_authenticated_policy"
  ON public.imaps_panoramas FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    OR public.is_imaps_admin((SELECT auth.uid()))
  );

-- 3. Restore imaps_assets bucket file_size_limit to 5MB (5242880 bytes)
UPDATE storage.buckets
SET file_size_limit = 5242880
WHERE id = 'imaps_assets';
