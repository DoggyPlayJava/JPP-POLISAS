-- Fix: karnival_votes_v2
DROP POLICY IF EXISTS "karnival_votes_v2_admin_delete" ON public.karnival_votes_v2;
CREATE POLICY "karnival_votes_v2_admin_delete" ON public.karnival_votes_v2 FOR DELETE USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'SUPER_ADMIN_JPP'::text OR profiles.role = 'JPP'::text OR profiles.jabatan = 'JPP'::text) )
);

DROP POLICY IF EXISTS "karnival_votes_v2_admin_update" ON public.karnival_votes_v2;
CREATE POLICY "karnival_votes_v2_admin_update" ON public.karnival_votes_v2 FOR UPDATE USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'SUPER_ADMIN_JPP'::text OR profiles.role = 'JPP'::text OR profiles.jabatan = 'JPP'::text) )
);

DROP POLICY IF EXISTS "karnival_votes_v2_delete_own" ON public.karnival_votes_v2;
CREATE POLICY "karnival_votes_v2_delete_own" ON public.karnival_votes_v2 FOR DELETE USING (
  (select auth.uid()) = voter_id
);

DROP POLICY IF EXISTS "karnival_votes_v2_insert_self" ON public.karnival_votes_v2;
CREATE POLICY "karnival_votes_v2_insert_self" ON public.karnival_votes_v2 FOR INSERT WITH CHECK (
  (select auth.uid()) = voter_id AND EXISTS ( SELECT 1 FROM karnival_editions WHERE karnival_editions.id = karnival_votes_v2.edition_id AND karnival_editions.voting_enabled = true )
);

-- Fix: student_club_memberships
DROP POLICY IF EXISTS "scm_select" ON public.student_club_memberships;
CREATE POLICY "scm_select" ON public.student_club_memberships FOR SELECT USING (
  (select auth.uid()) IS NOT NULL
);

-- Fix: kamsis_dynamic_fields
DROP POLICY IF EXISTS "kamsis_dynamic_fields_admin_all" ON public.kamsis_dynamic_fields;
CREATE POLICY "kamsis_dynamic_fields_admin_all" ON public.kamsis_dynamic_fields FOR ALL USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role IN ('SUPER_ADMIN_JPP', 'STAFF') OR (profiles.role = 'JPP' AND profiles.jpp_unit = 'KK') OR (profiles.role = 'JPP' AND profiles.jpp_position IN ('YDP', 'YANG_DIPERTUA', 'NAIB_YDP'))) )
);

-- Fix: kamsis_applications
DROP POLICY IF EXISTS "kamsis_applications_admin_all" ON public.kamsis_applications;
CREATE POLICY "kamsis_applications_admin_all" ON public.kamsis_applications FOR ALL USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role IN ('SUPER_ADMIN_JPP', 'STAFF') OR (profiles.role = 'JPP' AND profiles.jpp_unit = 'KK') OR (profiles.role = 'JPP' AND profiles.jpp_position IN ('YDP', 'YANG_DIPERTUA', 'NAIB_YDP'))) )
);

DROP POLICY IF EXISTS "kamsis_applications_insert_own" ON public.kamsis_applications;
CREATE POLICY "kamsis_applications_insert_own" ON public.kamsis_applications FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "kamsis_applications_select_own" ON public.kamsis_applications;
CREATE POLICY "kamsis_applications_select_own" ON public.kamsis_applications FOR SELECT USING (
  user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "kamsis_applications_update_own" ON public.kamsis_applications;
CREATE POLICY "kamsis_applications_update_own" ON public.kamsis_applications FOR UPDATE USING (
  user_id = (select auth.uid())
);

-- Fix: missing index for klk_sync_log
CREATE INDEX IF NOT EXISTS idx_klk_sync_log_synced_by ON public.klk_sync_log(synced_by);

-- Fix: akademik_cgpa_records multiple permissive policies
DROP POLICY IF EXISTS "User can manage own cgpa" ON public.akademik_cgpa_records;
DROP POLICY IF EXISTS "JPP can view all cgpa" ON public.akademik_cgpa_records;

CREATE POLICY "akademik_cgpa_records_select" ON public.akademik_cgpa_records FOR SELECT USING (
  user_id = (select auth.uid()) 
  OR EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP') )
);
CREATE POLICY "akademik_cgpa_records_insert" ON public.akademik_cgpa_records FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);
CREATE POLICY "akademik_cgpa_records_update" ON public.akademik_cgpa_records FOR UPDATE USING (
  user_id = (select auth.uid())
);
CREATE POLICY "akademik_cgpa_records_delete" ON public.akademik_cgpa_records FOR DELETE USING (
  user_id = (select auth.uid())
);

-- Fix: akademik_merit_config multiple permissive policies
DROP POLICY IF EXISTS "amc_modify" ON public.akademik_merit_config;

-- amc_select already handles SELECT. So modify handles INSERT/UPDATE/DELETE.
CREATE POLICY "amc_insert" ON public.akademik_merit_config FOR INSERT WITH CHECK (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'SUPER_ADMIN_JPP' )
);
CREATE POLICY "amc_update" ON public.akademik_merit_config FOR UPDATE USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'SUPER_ADMIN_JPP' )
);
CREATE POLICY "amc_delete" ON public.akademik_merit_config FOR DELETE USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'SUPER_ADMIN_JPP' )
);
