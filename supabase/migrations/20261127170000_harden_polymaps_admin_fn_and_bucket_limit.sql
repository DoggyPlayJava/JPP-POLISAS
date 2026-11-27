-- ============================================================================
-- Migration: 20261127170000_harden_polymaps_admin_fn_and_bucket_limit.sql
-- Module: PolyMaps / PolyMaps 360° (Security Hardening)
-- Purpose:
--   1. Prevent probing arbitrary user UUIDs via public.is_imaps_admin(UUID)
--      by requiring p_uid = (SELECT auth.uid()), revoking EXECUTE from
--      PUBLIC & anon, and granting EXECUTE only to authenticated.
--   2. Split imaps_panoramas SELECT policy by role (anon vs authenticated)
--      so unauthenticated visitors on /polymaps never invoke is_imaps_admin().
--   3. Restore imaps_assets storage bucket file_size_limit to 5 MB (5242880)
--      since client-side panorama compression targets <= 3.5 MB JPEG.
-- ============================================================================

-- 1. Harden public.is_imaps_admin(UUID)
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

-- 2. Split imaps_panoramas SELECT policy by disjoint roles (anon vs authenticated)
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

-- 3. Restore imaps_assets bucket limit to 5 MB (5242880 bytes)
UPDATE storage.buckets
SET file_size_limit = 5242880
WHERE id = 'imaps_assets';
