-- ============================================================
-- 20260623174500_add_supsas_portal_settings.sql
-- Insert missing 'supsas' entry into public.portal_settings
-- ============================================================

INSERT INTO public.portal_settings (exco_module, color, label, is_enabled)
SELECT 'supsas', '#F59E0B', 'SUPSAS', false
WHERE NOT EXISTS (
    SELECT 1 FROM public.portal_settings WHERE exco_module = 'supsas'
);
