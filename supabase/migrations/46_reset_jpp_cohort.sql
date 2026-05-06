-- ================================================================
-- 46_reset_jpp_cohort.sql
-- RPC: Reset kesemua ahli JPP kepada AHLI biasa dan hapus jawatan (Reset Kohort)
-- RPC: Buang (remove) seorang ahli JPP spesifik
-- ================================================================

-- ── RPC 1: Reset Kohort (Kesemua ahli) ─────────────────────────
DROP FUNCTION IF EXISTS reset_jpp_cohort();
CREATE OR REPLACE FUNCTION reset_jpp_cohort()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role      TEXT;
  v_actor_position  TEXT;
BEGIN
  -- 1. Dapatkan maklumat pemanggil
  SELECT role, jpp_position INTO v_actor_role, v_actor_position
  FROM profiles WHERE id = auth.uid();

  -- 2. Semak Kebenaran: Hanya SUPER_ADMIN_JPP, ADMIN, atau YDP boleh jalankan
  IF v_actor_role NOT IN ('SUPER_ADMIN_JPP', 'ADMIN') AND
     v_actor_position NOT IN ('YDP', 'YANG_DIPERTUA') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya YDP atau Super Admin boleh mereset kohort JPP.';
  END IF;

  -- 3. Kosongkan semua jadual jpp_mt_assignments
  DELETE FROM jpp_mt_assignments;

  -- 4. Demote semua 'JPP' kembali kepada 'AHLI' (kecuali ADMIN/SUPER_ADMIN_JPP jika mereka ada jpp_position)
  -- Nota: Kami hanya menukar role bagi mereka yang asalnya role = 'JPP'.
  UPDATE profiles
  SET 
    role = CASE WHEN role = 'JPP' THEN 'AHLI' ELSE role END,
    jpp_position = NULL,
    jpp_unit = NULL
  WHERE role = 'JPP' OR jpp_position IS NOT NULL OR jpp_unit IS NOT NULL;

  -- 5. Rekod aktiviti ini ke dalam club_logs
  INSERT INTO club_logs (action_type, actor_name, description)
  VALUES ('COHORT_DISSOLVED', 'SISTEM (JPP)', 'Pembubaran Kohort JPP telah dijalankan. Semua ahli JPP telah di-reset kepada pengguna biasa.');

END;
$$;

REVOKE ALL ON FUNCTION reset_jpp_cohort() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_jpp_cohort() TO authenticated;


-- ── RPC 2: Buang seorang ahli JPP ──────────────────────────────
DROP FUNCTION IF EXISTS remove_jpp_member(UUID);
CREATE OR REPLACE FUNCTION remove_jpp_member(
  p_target_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role      TEXT;
  v_actor_position  TEXT;
  v_target_role     TEXT;
BEGIN
  -- 1. Dapatkan maklumat pemanggil
  SELECT role, jpp_position INTO v_actor_role, v_actor_position
  FROM profiles WHERE id = auth.uid();

  -- 2. Semak Kebenaran
  IF v_actor_role NOT IN ('SUPER_ADMIN_JPP', 'ADMIN') AND
     v_actor_position NOT IN ('YDP', 'YANG_DIPERTUA') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya YDP atau Super Admin boleh membuang ahli JPP.';
  END IF;

  -- 3. Halang buang diri sendiri
  IF auth.uid() = p_target_id THEN
    RAISE EXCEPTION 'Tidak boleh membuang peranan diri sendiri.';
  END IF;

  -- 4. Semak pengguna sasaran wujud
  SELECT role INTO v_target_role FROM profiles WHERE id = p_target_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna sasaran tidak dijumpai.';
  END IF;

  -- 5. Halang buang ADMIN
  IF v_target_role IN ('SUPER_ADMIN_JPP', 'ADMIN') THEN
    RAISE EXCEPTION 'Tidak boleh mengubah akaun Super Admin melalui fungsi ini.';
  END IF;

  -- 6. Buang penugasan MT jika ada
  DELETE FROM jpp_mt_assignments WHERE mt_user_id = p_target_id;

  -- 7. Reset role dan jawatan
  UPDATE profiles
  SET
    role         = CASE WHEN role = 'JPP' THEN 'AHLI' ELSE role END,
    jpp_position = NULL,
    jpp_unit     = NULL
  WHERE id = p_target_id;

END;
$$;

REVOKE ALL ON FUNCTION remove_jpp_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION remove_jpp_member(UUID) TO authenticated;
