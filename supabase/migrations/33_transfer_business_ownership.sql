-- =================================================================
-- 33_transfer_business_ownership.sql
-- Fasa 3: RPC for transferring Keusahawanan business ownership
-- =================================================================

DROP FUNCTION IF EXISTS transfer_business_ownership(UUID, UUID);

CREATE OR REPLACE FUNCTION transfer_business_ownership(p_business_id UUID, p_new_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_owner_id UUID;
  v_is_new_owner_member BOOLEAN;
BEGIN
  -- Validate business and get current owner
  SELECT owner_id INTO v_current_owner_id
  FROM keusahawanan_businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perniagaan tidak ditemui.';
  END IF;

  -- Ensure either the current owner OR an admin is making this request
  IF v_current_owner_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ) THEN
    RAISE EXCEPTION 'Akses ditolak. Anda bukan pemilik perniagaan ini.';
  END IF;

  -- Ensure the new owner is an ACTIVE member of the business
  SELECT EXISTS(
    SELECT 1 FROM student_business_memberships
    WHERE business_id = p_business_id AND user_id = p_new_owner_id AND status = 'ACTIVE'
  ) INTO v_is_new_owner_member;

  IF NOT v_is_new_owner_member THEN
    RAISE EXCEPTION 'Pemilik baharu mestilah seorang ahli aktif di dalam perniagaan ini.';
  END IF;

  -- 1. Downgrade current owner to 'MEMBER' (if they are still listed)
  UPDATE student_business_memberships
  SET role = 'MEMBER'
  WHERE business_id = p_business_id AND user_id = v_current_owner_id;

  -- 2. Upgrade new user to 'OWNER'
  UPDATE student_business_memberships
  SET role = 'OWNER'
  WHERE business_id = p_business_id AND user_id = p_new_owner_id;

  -- 3. Change owner_id in keusahawanan_businesses
  UPDATE keusahawanan_businesses
  SET owner_id = p_new_owner_id
  WHERE id = p_business_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_business_ownership(UUID, UUID) TO authenticated;
