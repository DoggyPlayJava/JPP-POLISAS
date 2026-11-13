-- Migration: 20261113000001_polymaps_360_hotspots_and_field_submissions.sql
-- Description: Adds target_yaw/target_pitch to imaps_locations, creates imaps_360_hotspots for interactive 360 pins, and creates imaps_field_submissions for volunteer field contributions.

-- 1. Add target camera orientation columns to imaps_locations
ALTER TABLE public.imaps_locations
    ADD COLUMN IF NOT EXISTS target_yaw NUMERIC(6, 2),
    ADD COLUMN IF NOT EXISTS target_pitch NUMERIC(6, 2);

-- 2. Create imaps_360_hotspots table
CREATE TABLE IF NOT EXISTS public.imaps_360_hotspots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES public.imaps_buildings(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.imaps_locations(id) ON DELETE SET NULL,
    panorama_url TEXT NOT NULL,
    pin_type TEXT NOT NULL DEFAULT 'room' CHECK (pin_type IN ('room', 'scene', 'info')),
    label TEXT NOT NULL,
    room_code TEXT,
    floor_level INTEGER DEFAULT 0,
    pitch NUMERIC(6, 2) NOT NULL DEFAULT 0,
    yaw NUMERIC(6, 2) NOT NULL DEFAULT 0,
    description TEXT,
    target_panorama_url TEXT,
    target_location_id UUID REFERENCES public.imaps_locations(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Mandatory FK and lookup indexes for imaps_360_hotspots
CREATE INDEX IF NOT EXISTS idx_imaps_360_hotspots_building_id ON public.imaps_360_hotspots(building_id);
CREATE INDEX IF NOT EXISTS idx_imaps_360_hotspots_location_id ON public.imaps_360_hotspots(location_id);
CREATE INDEX IF NOT EXISTS idx_imaps_360_hotspots_target_loc_id ON public.imaps_360_hotspots(target_location_id);
CREATE INDEX IF NOT EXISTS idx_imaps_360_hotspots_created_by ON public.imaps_360_hotspots(created_by);
CREATE INDEX IF NOT EXISTS idx_imaps_360_hotspots_panorama_url ON public.imaps_360_hotspots(panorama_url);

ALTER TABLE public.imaps_360_hotspots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "imaps_360_hotspots_select_policy"
ON public.imaps_360_hotspots FOR SELECT
USING (true);

CREATE POLICY "imaps_360_hotspots_insert_policy"
ON public.imaps_360_hotspots FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'super_admin', 'SUPER_ADMIN')
    )
);

CREATE POLICY "imaps_360_hotspots_update_policy"
ON public.imaps_360_hotspots FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'super_admin', 'SUPER_ADMIN')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'super_admin', 'SUPER_ADMIN')
    )
);

CREATE POLICY "imaps_360_hotspots_delete_policy"
ON public.imaps_360_hotspots FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'super_admin', 'SUPER_ADMIN')
    )
);

-- 3. Create imaps_field_submissions table for volunteer crowd-mapping
CREATE TABLE IF NOT EXISTS public.imaps_field_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contributor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES public.imaps_buildings(id) ON DELETE CASCADE,
    floor_level INTEGER NOT NULL DEFAULT 0,
    corridor_label TEXT,
    panorama_360_url TEXT NOT NULL,
    entrance_image_url TEXT,
    hotspots_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Mandatory FK and status indexes for imaps_field_submissions
CREATE INDEX IF NOT EXISTS idx_imaps_field_submissions_contributor ON public.imaps_field_submissions(contributor_id);
CREATE INDEX IF NOT EXISTS idx_imaps_field_submissions_building ON public.imaps_field_submissions(building_id);
CREATE INDEX IF NOT EXISTS idx_imaps_field_submissions_reviewed_by ON public.imaps_field_submissions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_imaps_field_submissions_status ON public.imaps_field_submissions(status);

ALTER TABLE public.imaps_field_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "imaps_field_submissions_select_policy"
ON public.imaps_field_submissions FOR SELECT
USING (
    contributor_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'super_admin', 'SUPER_ADMIN')
    )
);

CREATE POLICY "imaps_field_submissions_insert_policy"
ON public.imaps_field_submissions FOR INSERT
WITH CHECK (contributor_id = (SELECT auth.uid()));

CREATE POLICY "imaps_field_submissions_update_policy"
ON public.imaps_field_submissions FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'super_admin', 'SUPER_ADMIN')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'super_admin', 'SUPER_ADMIN')
    )
);

CREATE POLICY "imaps_field_submissions_delete_policy"
ON public.imaps_field_submissions FOR DELETE
USING (
    (contributor_id = (SELECT auth.uid()) AND status = 'pending')
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'super_admin', 'SUPER_ADMIN')
    )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.imaps_360_hotspots TO authenticated;
GRANT SELECT ON public.imaps_360_hotspots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.imaps_field_submissions TO authenticated;
