-- =======================================================
-- FASA 3: Security Hardening — Server-side RPC Guards
-- Deployed via Supabase MCP on 2026-04-03
-- =======================================================

-- 3.1: change_member_role — Prevent privilege escalation (CRIT-1)
DROP FUNCTION IF EXISTS change_member_role(uuid, text, text);
CREATE OR REPLACE FUNCTION change_member_role(
  p_actor_id    UUID,
  p_target_id   UUID,
  p_club_id     TEXT,
  p_new_role    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role   TEXT;
  v_target_role  TEXT;
BEGIN
  IF p_new_role NOT IN ('CLUB_MEMBER', 'CLUB_MT', 'CLUB_PRESIDENT', 'CLUB_ADVISOR') THEN
    RAISE EXCEPTION 'Peranan tidak sah: %', p_new_role;
  END IF;

  SELECT role INTO v_actor_role
  FROM student_club_memberships
  WHERE user_id = p_actor_id AND club_id = p_club_id AND account_status = 'APPROVED';

  IF v_actor_role IS NULL THEN
    SELECT role INTO v_actor_role FROM profiles WHERE id = p_actor_id;
  END IF;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Aktor tidak dijumpai atau tidak mempunyai akses ke kelab ini';
  END IF;

  SELECT role INTO v_target_role
  FROM student_club_memberships
  WHERE user_id = p_target_id AND club_id = p_club_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Ahli sasaran tidak dijumpai dalam kelab ini';
  END IF;

  IF p_actor_id = p_target_id THEN
    RAISE EXCEPTION 'Anda tidak boleh mengubah peranan diri sendiri';
  END IF;

  IF v_actor_role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP') THEN
    NULL;
  ELSIF v_actor_role = 'CLUB_ADVISOR' THEN
    IF v_target_role NOT IN ('CLUB_PRESIDENT', 'CLUB_MT', 'CLUB_MEMBER') THEN
      RAISE EXCEPTION 'Penasihat tidak boleh mengubah peranan: %', v_target_role;
    END IF;
    IF p_new_role = 'CLUB_ADVISOR' THEN
      RAISE EXCEPTION 'Penasihat tidak boleh melantik Penasihat lain';
    END IF;
  ELSIF v_actor_role = 'CLUB_PRESIDENT' THEN
    IF v_target_role NOT IN ('CLUB_MT', 'CLUB_MEMBER') THEN
      RAISE EXCEPTION 'Presiden tidak boleh mengubah peranan: %', v_target_role;
    END IF;
    IF p_new_role NOT IN ('CLUB_MT', 'CLUB_MEMBER') THEN
      RAISE EXCEPTION 'Presiden hanya boleh tetapkan MT atau Ahli';
    END IF;
  ELSE
    RAISE EXCEPTION 'Anda tidak mempunyai kebenaran untuk mengubah peranan ahli';
  END IF;

  UPDATE student_club_memberships
  SET role = p_new_role, updated_at = NOW()
  WHERE user_id = p_target_id AND club_id = p_club_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gagal mengemaskini peranan';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION change_member_role(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION change_member_role(UUID, UUID, TEXT, TEXT) TO authenticated;


-- 3.2: increment_merit — Atomic merit with row-level lock (CRIT-4)
DROP FUNCTION IF EXISTS increment_merit(UUID, INTEGER);
CREATE OR REPLACE FUNCTION increment_merit(
  target_user_id UUID,
  delta INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_merit INTEGER;
BEGIN
  SELECT COALESCE(merit, 0) INTO v_current_merit
  FROM profiles
  WHERE id = target_user_id
  FOR UPDATE;

  UPDATE profiles
  SET merit = GREATEST(0, v_current_merit + delta)
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % tidak dijumpai dalam profiles', target_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION increment_merit(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_merit(UUID, INTEGER) TO authenticated;
