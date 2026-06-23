-- Migration: Add zone_name to imaps_buildings
-- Description: Adds a zone_name column to public.imaps_buildings to support zone grouping in PolyMaps

ALTER TABLE public.imaps_buildings
ADD COLUMN zone_name TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
