-- =================================================================
-- 14_leave_club_rpc.sql
-- Fix bug: Pengguna tidak boleh keluar kelab disebabkan RLS (UUID fix)
-- =================================================================

DROP FUNCTION IF EXISTS request_leave_club(TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS request_leave_club(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION request_leave_club(p_club_id TEXT, p_is_primary BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_is_primary THEN
    -- Kelab utama (Akademik) - perlukan kelulusan Penasihat/Presiden
    -- Menukar status kepada RESIGN_PENDING
    UPDATE student_club_memberships
    SET account_status = 'RESIGN_PENDING', updated_at = NOW()
    WHERE user_id = auth.uid() AND club_id = p_club_id; -- TEXT = TEXT
  ELSE
    -- Kelab biasa/sampingan - keluar serta merta
    DELETE FROM student_club_memberships
    WHERE user_id = auth.uid() AND club_id = p_club_id; -- TEXT = TEXT

    -- Pastikan ia tidak tertinggal di profiles.club_id memandangkan ia adalah UUID
    UPDATE profiles
    SET club_id = NULL
    WHERE id = auth.uid() AND club_id = p_club_id::UUID; -- UUID = UUID
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION request_leave_club(TEXT, BOOLEAN) TO authenticated;
