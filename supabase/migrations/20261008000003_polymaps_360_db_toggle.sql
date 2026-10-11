-- Add DB-backed 360° toggle state for PolyMaps (fixes per-device localStorage bug)
-- Before: toggle 360 disimpan dalam localStorage -> hanya nampak pada peranti pentadbir.
-- After:  disimpan dalam kolum DB -> semua peranti nampak status yang sama.
ALTER TABLE public.imaps_buildings
    ADD COLUMN IF NOT EXISTS is_360_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.imaps_locations
    ADD COLUMN IF NOT EXISTS is_360_enabled boolean NOT NULL DEFAULT false;
