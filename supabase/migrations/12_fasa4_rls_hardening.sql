-- =================================================================
-- FASA 4: RLS HARDENING — Membership-based Authorization
-- Deployed via Supabase MCP on 2026-04-03
-- =================================================================

-- Helper functions (SECURITY DEFINER, STABLE)
CREATE OR REPLACE FUNCTION is_club_leader(p_uid UUID, p_club_id TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_club_memberships
    WHERE user_id = p_uid AND club_id = p_club_id
      AND account_status = 'APPROVED' AND role IN ('CLUB_PRESIDENT', 'CLUB_MT', 'CLUB_ADVISOR')
  );
$$;

CREATE OR REPLACE FUNCTION is_club_president(p_uid UUID, p_club_id TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_club_memberships
    WHERE user_id = p_uid AND club_id = p_club_id
      AND account_status = 'APPROVED' AND role = 'CLUB_PRESIDENT'
  );
$$;

CREATE OR REPLACE FUNCTION is_jpp_admin(p_uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_uid AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP', 'SUPER_ADMIN'));
$$;

GRANT EXECUTE ON FUNCTION is_club_leader(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_club_president(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_jpp_admin(UUID) TO authenticated, anon;

-- Policies baru (membership-based)
DROP POLICY IF EXISTS "Manage_Committee_Own_Club" ON club_committee;
CREATE POLICY "Manage_Committee_Membership_Based" ON club_committee FOR ALL
  USING (is_club_leader(auth.uid(), club_committee.club_id::text) OR is_jpp_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow_Update_Own_Club" ON clubs;
CREATE POLICY "Allow_Update_Club_Membership_Based" ON clubs FOR UPDATE
  USING (is_club_president(auth.uid(), clubs.id::text) OR is_jpp_admin(auth.uid()))
  WITH CHECK (is_club_president(auth.uid(), clubs.id::text) OR is_jpp_admin(auth.uid()));

DROP POLICY IF EXISTS "Leaders can approve memberships" ON student_club_memberships;
DROP POLICY IF EXISTS "Leaders can approve or reject memberships" ON student_club_memberships;
CREATE POLICY "Leaders_Can_Manage_Club_Memberships" ON student_club_memberships FOR UPDATE
  USING (is_club_leader(auth.uid(), student_club_memberships.club_id::text) OR is_jpp_admin(auth.uid()))
  WITH CHECK (account_status IN ('APPROVED', 'REJECTED', 'KICKED', 'RESIGN_PENDING'));

DROP POLICY IF EXISTS "Leaders can read club memberships" ON student_club_memberships;
CREATE POLICY "Leaders_Can_Read_Club_Memberships" ON student_club_memberships FOR SELECT
  USING (is_club_leader(auth.uid(), student_club_memberships.club_id::text) OR is_jpp_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can do everything" ON programs;
DROP POLICY IF EXISTS "JPP bypass RLS" ON programs;
DROP POLICY IF EXISTS "JPP can read all programs" ON programs;
CREATE POLICY "JPP_Full_Access_Programs" ON programs FOR ALL USING (is_jpp_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own transactions" ON merit_transactions;
CREATE POLICY "Leaders_Can_View_Club_Merit" ON merit_transactions FOR SELECT
  USING (auth.uid() = user_id OR is_jpp_admin(auth.uid()));

DROP POLICY IF EXISTS "Presidents can reset merit" ON profiles;
CREATE POLICY "Presidents_Can_Update_Club_Merit" ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_jpp_admin(auth.uid()));

DROP POLICY IF EXISTS "Hanya admin boleh ubah tetapan sistem" ON system_settings;
CREATE POLICY "Admins_Can_Update_Settings" ON system_settings FOR UPDATE
  USING (is_jpp_admin(auth.uid())) WITH CHECK (is_jpp_admin(auth.uid()));

DROP POLICY IF EXISTS "JPP bypass club_reports RLS" ON club_reports;

DROP POLICY IF EXISTS "Pengguna kelab lihat log kelab sendiri sahaja" ON club_logs;
CREATE POLICY "Members_View_Club_Logs" ON club_logs FOR SELECT
  USING ((club_id)::text = ANY(get_user_approved_club_ids(auth.uid())) OR is_jpp_admin(auth.uid()));
