-- ================================================================
-- 35_security_jpp_profile_rpc.sql
-- Keselamatan: RPC untuk kemas kini jawatan JPP (jpp_position, jpp_unit, role)
-- Menggantikan query .update() terus dari frontend yang tiada penguatkuasaan DB
-- ================================================================

-- ── RPC 1: Kemaskini jawatan + unit exco (EditMemberModal) ────────────────
-- Bagi YDP/SuperAdmin mengemaskini jpp_position & jpp_unit ahli SEDIA ADA
DROP FUNCTION IF EXISTS update_jpp_member_profile(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION update_jpp_member_profile(
  p_target_id   UUID,
  p_jpp_position TEXT,
  p_jpp_unit    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role      TEXT;
  v_actor_position  TEXT;
BEGIN
  -- Dapatkan maklumat pemanggil
  SELECT role, jpp_position INTO v_actor_role, v_actor_position
  FROM profiles WHERE id = auth.uid();

  -- Hanya SUPER_ADMIN_JPP atau YDP yang boleh buat ini
  IF v_actor_role NOT IN ('SUPER_ADMIN_JPP', 'ADMIN') AND
     v_actor_position NOT IN ('YDP', 'YANG_DIPERTUA') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya YDP atau Super Admin boleh mengemaskini jawatan ahli JPP.';
  END IF;

  -- Tidak boleh ubah diri sendiri melalui fungsi ini
  IF auth.uid() = p_target_id THEN
    RAISE EXCEPTION 'Tidak boleh mengemaskini profil sendiri melalui fungsi ini.';
  END IF;

  -- Kemaskini jpp_position dan jpp_unit sahaja (BUKAN role global)
  UPDATE profiles
  SET
    jpp_position = NULLIF(p_jpp_position, ''),
    jpp_unit     = NULLIF(p_jpp_unit, '')
  WHERE id = p_target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna sasaran tidak dijumpai: %', p_target_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION update_jpp_member_profile(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_jpp_member_profile(UUID, TEXT, TEXT) TO authenticated;


-- ── RPC 2: Tambah ahli ke JPP (AddMemberModal) ───────────────────────────
-- Bagi YDP/SuperAdmin menetapkan role='JPP' + jawatan kepada pengguna sedia ada
DROP FUNCTION IF EXISTS assign_jpp_member(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION assign_jpp_member(
  p_target_id    UUID,
  p_jpp_position TEXT,
  p_jpp_unit     TEXT
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
  -- Dapatkan maklumat pemanggil
  SELECT role, jpp_position INTO v_actor_role, v_actor_position
  FROM profiles WHERE id = auth.uid();

  -- Hanya SUPER_ADMIN_JPP atau YDP yang boleh buat ini
  IF v_actor_role NOT IN ('SUPER_ADMIN_JPP', 'ADMIN') AND
     v_actor_position NOT IN ('YDP', 'YANG_DIPERTUA') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya YDP atau Super Admin boleh melantik ahli JPP.';
  END IF;

  -- Tidak boleh ubah diri sendiri
  IF auth.uid() = p_target_id THEN
    RAISE EXCEPTION 'Tidak boleh melantik diri sendiri.';
  END IF;

  -- Semak pengguna sasaran wujud
  SELECT role INTO v_target_role FROM profiles WHERE id = p_target_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna sasaran tidak dijumpai.';
  END IF;

  -- Tidak boleh turun taraf SUPER_ADMIN_JPP atau ADMIN
  IF v_target_role IN ('SUPER_ADMIN_JPP', 'ADMIN') THEN
    RAISE EXCEPTION 'Tidak boleh mengubah akaun Super Admin melalui fungsi ini.';
  END IF;

  -- Set role = JPP, jpp_position, jpp_unit
  UPDATE profiles
  SET
    role         = 'JPP',
    jpp_position = NULLIF(p_jpp_position, ''),
    jpp_unit     = NULLIF(p_jpp_unit, '')
  WHERE id = p_target_id;
END;
$$;

REVOKE ALL ON FUNCTION assign_jpp_member(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION assign_jpp_member(UUID, TEXT, TEXT) TO authenticated;


-- ── RPC 3: Toggle JPP role di JppUsersPage (JPP ↔ AHLI) ────────────────
-- Menggantikan toggle role secara terus di JppUsersPage.tsx
DROP FUNCTION IF EXISTS toggle_jpp_role(UUID);
CREATE OR REPLACE FUNCTION toggle_jpp_role(
  p_target_id UUID
)
RETURNS TEXT  -- Mengembalikan role baharu
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role     TEXT;
  v_actor_position TEXT;
  v_target_role    TEXT;
  v_new_role       TEXT;
BEGIN
  -- Dapatkan maklumat pemanggil
  SELECT role, jpp_position INTO v_actor_role, v_actor_position
  FROM profiles WHERE id = auth.uid();

  -- Hanya SUPER_ADMIN_JPP atau YDP
  IF v_actor_role NOT IN ('SUPER_ADMIN_JPP', 'ADMIN') AND
     v_actor_position NOT IN ('YDP', 'YANG_DIPERTUA') THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  -- Tidak boleh ubah diri sendiri
  IF auth.uid() = p_target_id THEN
    RAISE EXCEPTION 'Tidak boleh mengubah peranan diri sendiri.';
  END IF;

  -- Dapatkan role semasa pengguna sasaran
  SELECT role INTO v_target_role FROM profiles WHERE id = p_target_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna tidak dijumpai.';
  END IF;

  -- Jangan benarkan ubah SUPER_ADMIN_JPP atau ADMIN
  IF v_target_role IN ('SUPER_ADMIN_JPP', 'ADMIN') THEN
    RAISE EXCEPTION 'Tidak boleh mengubah akaun Admin.';
  END IF;

  -- Toggle: JPP → AHLI, semua lain → JPP
  v_new_role := CASE WHEN v_target_role = 'JPP' THEN 'AHLI' ELSE 'JPP' END;

  UPDATE profiles SET role = v_new_role WHERE id = p_target_id;

  RETURN v_new_role;
END;
$$;

REVOKE ALL ON FUNCTION toggle_jpp_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION toggle_jpp_role(UUID) TO authenticated;
