-- 95_foodbank_officer_rls.sql
-- Align is_foodbank_admin with can_manage_foodbank so appointed Pegawai
-- (foodbank_officers) can SELECT applications & verify pickups.
-- Previously a Pegawai who is a normal student could NOT see the applications
-- list because is_foodbank_admin only checked profiles.role.

CREATE OR REPLACE FUNCTION public.is_foodbank_admin(p_uid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  IF p_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Pentadbir / JPP
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_uid
      AND (
        role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'super_admin', 'SUPER_ADMIN', 'STAFF')
        OR role = 'JPP'
        OR jpp_position = 'YDP'
        OR jpp_unit = 'KEBAJIKAN'
      )
  ) THEN
    RETURN TRUE;
  END IF;

  -- Pegawai / PIC yang dilantik dalam foodbank_officers (aktif)
  RETURN EXISTS (
    SELECT 1 FROM public.foodbank_officers
    WHERE user_id = p_uid AND is_active = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_foodbank_admin(UUID) TO authenticated, anon;
