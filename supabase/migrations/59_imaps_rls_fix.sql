-- Migration: 59_imaps_rls_fix.sql
-- Description: Fix RLS policies to allow SUPER_ADMIN_JPP and ADMIN to update imaps data.

DROP POLICY IF EXISTS "Allow superadmin full access on imaps_buildings" ON public.imaps_buildings;
DROP POLICY IF EXISTS "Allow superadmin full access on imaps_locations" ON public.imaps_locations;

CREATE POLICY "Allow superadmin full access on imaps_buildings"
ON public.imaps_buildings FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
);

CREATE POLICY "Allow superadmin full access on imaps_locations"
ON public.imaps_locations FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
);
