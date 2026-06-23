-- Migration: 20260624003500_grant_missing_reports_permissions.sql
-- Description: Grant table privileges to public api roles for imaps_missing_reports

GRANT ALL PRIVILEGES ON TABLE public.imaps_missing_reports TO anon, authenticated, service_role;
