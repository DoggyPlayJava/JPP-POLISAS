-- Migration: 20261114000001_polymaps_volunteer_submissions_and_partial_pano_fix.sql
-- Description: Aligns imaps_field_submissions and imaps_360_hotspots columns with volunteer studio payload (floor_level TEXT for 'G'/'1'..'5', location_id, contributor_name, room_code_hint, hotspots_json) and allows volunteer field submissions.

-- 1. Support alphanumeric floor levels ('G', '1', '2', etc.) in imaps_360_hotspots and imaps_field_submissions
ALTER TABLE public.imaps_360_hotspots
    ALTER COLUMN floor_level TYPE TEXT USING floor_level::TEXT,
    ALTER COLUMN floor_level SET DEFAULT '1';

ALTER TABLE public.imaps_field_submissions
    ALTER COLUMN floor_level TYPE TEXT USING floor_level::TEXT,
    ALTER COLUMN floor_level SET DEFAULT '1',
    ALTER COLUMN contributor_id DROP NOT NULL;

-- 2. Add missing volunteer studio metadata columns to imaps_field_submissions
ALTER TABLE public.imaps_field_submissions
    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.imaps_locations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS contributor_name TEXT,
    ADD COLUMN IF NOT EXISTS room_code_hint TEXT,
    ADD COLUMN IF NOT EXISTS hotspots_json JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Mandatory FK index for location_id
CREATE INDEX IF NOT EXISTS idx_imaps_field_submissions_location_id
    ON public.imaps_field_submissions(location_id);

-- 3. Update single INSERT policy on imaps_field_submissions (using (SELECT auth.uid()))
DROP POLICY IF EXISTS "imaps_field_submissions_insert_policy" ON public.imaps_field_submissions;

CREATE POLICY "imaps_field_submissions_insert_policy"
ON public.imaps_field_submissions FOR INSERT
WITH CHECK (
    contributor_id IS NULL
    OR contributor_id = (SELECT auth.uid())
);

GRANT INSERT ON public.imaps_field_submissions TO anon, authenticated;
