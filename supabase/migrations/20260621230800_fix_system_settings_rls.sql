-- Drop old system_settings policies if they exist
DROP POLICY IF EXISTS "Everyone can read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "zzz_temp_open_auth" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can manage system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins_Can_Update_Settings" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_select_policy" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_insert_policy" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_update_policy" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_delete_policy" ON public.system_settings;

-- 1. SELECT Policy: Anyone (including anon/public) can select settings where key != 'staff_registration_code',
-- OR if they are a JPP admin (role is SUPER_ADMIN_JPP, ADMIN, JPP, SUPER_ADMIN).
CREATE POLICY "system_settings_select_policy" ON public.system_settings
  FOR SELECT
  USING (
    key != 'staff_registration_code' OR is_jpp_admin((SELECT auth.uid()))
  );

-- 2. INSERT Policy: Only JPP admins can insert.
CREATE POLICY "system_settings_insert_policy" ON public.system_settings
  FOR INSERT
  WITH CHECK (
    is_jpp_admin((SELECT auth.uid()))
  );

-- 3. UPDATE Policy: Only JPP admins can update.
CREATE POLICY "system_settings_update_policy" ON public.system_settings
  FOR UPDATE
  USING (
    is_jpp_admin((SELECT auth.uid()))
  )
  WITH CHECK (
    is_jpp_admin((SELECT auth.uid()))
  );

-- 4. DELETE Policy: Only JPP admins can delete.
CREATE POLICY "system_settings_delete_policy" ON public.system_settings
  FOR DELETE
  USING (
    is_jpp_admin((SELECT auth.uid()))
  );

-- Seed default values if they do not exist
INSERT INTO public.system_settings (key, value)
VALUES
  ('intake_1_month', '7'::jsonb),
  ('intake_2_month', '1'::jsonb)
ON CONFLICT (key) DO NOTHING;
