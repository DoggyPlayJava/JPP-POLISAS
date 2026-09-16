-- Migration: 20260916_makmp_grants.sql
-- Description: Grant table permissions on MAKMP tables to anon, authenticated, and service_role.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.makmp_editions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makmp_categories TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makmp_jury_pins TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makmp_submissions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makmp_submission_items TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
