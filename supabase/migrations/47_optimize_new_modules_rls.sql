-- ==============================================================================
-- MIGRATION 47: Optimize RLS Policies for New Modules (Performance Regression Fix)
-- Description: Replaces direct `auth.uid()` calls with `(select auth.uid())` 
-- to prevent Postgres from evaluating the volatile function on every row,
-- which previously caused 99% CPU utilization on large tables.
-- ==============================================================================

-- ------------------------------------------------------------
-- 1. Karnival v2 (38_karnival_v2.sql)
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "karnival_editions_write_kpp" ON karnival_editions;
CREATE POLICY "karnival_editions_write_kpp" ON karnival_editions FOR ALL
  USING ((select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));

DROP POLICY IF EXISTS "karnival_categories_write_kpp" ON karnival_categories;
CREATE POLICY "karnival_categories_write_kpp" ON karnival_categories FOR ALL
  USING ((select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));

DROP POLICY IF EXISTS "karnival_booths_write_kpp" ON karnival_booths;
CREATE POLICY "karnival_booths_write_kpp" ON karnival_booths FOR ALL
  USING ((select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));

DROP POLICY IF EXISTS "karnival_votes_v2_insert_self" ON karnival_votes_v2;
CREATE POLICY "karnival_votes_v2_insert_self" ON karnival_votes_v2 FOR INSERT
  WITH CHECK ((select auth.uid()) = voter_id AND EXISTS (SELECT 1 FROM karnival_editions WHERE id = edition_id AND voting_enabled = true));

DROP POLICY IF EXISTS "karnival_votes_v2_delete_own" ON karnival_votes_v2;
CREATE POLICY "karnival_votes_v2_delete_own" ON karnival_votes_v2 FOR DELETE USING ((select auth.uid()) = voter_id);

DROP POLICY IF EXISTS "karnival_votes_v2_admin_all" ON karnival_votes_v2;
CREATE POLICY "karnival_votes_v2_admin_all" ON karnival_votes_v2 FOR ALL
  USING ((select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));

DROP POLICY IF EXISTS "karnival_booths_kpp_upload"  ON storage.objects;
CREATE POLICY "karnival_booths_kpp_upload"  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'karnival-booths' AND (select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));

DROP POLICY IF EXISTS "karnival_booths_kpp_delete"  ON storage.objects;
CREATE POLICY "karnival_booths_kpp_delete"  ON storage.objects FOR DELETE
  USING (bucket_id = 'karnival-booths' AND (select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));


-- ------------------------------------------------------------
-- 2. SUPSAS (36_supsas_schema.sql)
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "supsas_editions_admin_write"  ON supsas_editions;
CREATE POLICY "supsas_editions_admin_write"  ON supsas_editions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP'));

DROP POLICY IF EXISTS "supsas_kontingen_admin_write" ON supsas_kontingen;
CREATE POLICY "supsas_kontingen_admin_write" ON supsas_kontingen FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP'));

DROP POLICY IF EXISTS "supsas_kontingen_leader_update" ON supsas_kontingen;
CREATE POLICY "supsas_kontingen_leader_update" ON supsas_kontingen FOR UPDATE
  USING (leader_id = (select auth.uid()))
  WITH CHECK (leader_id = (select auth.uid()));

DROP POLICY IF EXISTS "supsas_sports_jpp_write"    ON supsas_sports;
CREATE POLICY "supsas_sports_jpp_write"    ON supsas_sports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')));

DROP POLICY IF EXISTS "supsas_participants_leader_write" ON supsas_participants;
CREATE POLICY "supsas_participants_leader_write" ON supsas_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = (select auth.uid())));

DROP POLICY IF EXISTS "supsas_participants_admin_write" ON supsas_participants;
CREATE POLICY "supsas_participants_admin_write" ON supsas_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')));

DROP POLICY IF EXISTS "supsas_fixtures_jpp_write"   ON supsas_fixtures;
CREATE POLICY "supsas_fixtures_jpp_write"   ON supsas_fixtures FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')));

DROP POLICY IF EXISTS "supsas_results_jpp_write"   ON supsas_results;
CREATE POLICY "supsas_results_jpp_write"   ON supsas_results FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')));

DROP POLICY IF EXISTS "supsas_assets_admin_upload" ON storage.objects;
CREATE POLICY "supsas_assets_admin_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'supsas-assets' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ));

DROP POLICY IF EXISTS "supsas_assets_admin_delete" ON storage.objects;
CREATE POLICY "supsas_assets_admin_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'supsas-assets' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ));


-- ------------------------------------------------------------
-- 3. System Announcements (32 & 33)
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "JPP and Super Admin can view all system announcements." ON public.system_announcements;
CREATE POLICY "JPP and Super Admin can view all system announcements."
    ON public.system_announcements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );

DROP POLICY IF EXISTS "JPP and Super Admin can manage system announcements" ON public.system_announcements;
CREATE POLICY "JPP and Super Admin can manage system announcements"
    ON public.system_announcements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );

DROP POLICY IF EXISTS "Users can view own announcement responses" ON public.user_announcement_responses;
CREATE POLICY "Users can view own announcement responses"
    ON public.user_announcement_responses FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own announcement responses" ON public.user_announcement_responses;
CREATE POLICY "Users can insert own announcement responses"
    ON public.user_announcement_responses FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "JPP and Super Admin can view all announcement responses" ON public.user_announcement_responses;
CREATE POLICY "JPP and Super Admin can view all announcement responses"
    ON public.user_announcement_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );

DROP POLICY IF EXISTS "JPP can insert announcement images" ON storage.objects;
CREATE POLICY "JPP can insert announcement images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = (select auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);

DROP POLICY IF EXISTS "JPP can update announcement images" ON storage.objects;
CREATE POLICY "JPP can update announcement images" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = (select auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);

DROP POLICY IF EXISTS "JPP can delete announcement images" ON storage.objects;
CREATE POLICY "JPP can delete announcement images" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = (select auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);

-- Done.
