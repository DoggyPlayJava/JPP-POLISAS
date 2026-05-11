-- Migration: 55_imaps_schema.sql
-- Description: Schema for POLISAS iMaps (Hybrid Navigation System)

CREATE TABLE IF NOT EXISTS public.imaps_buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    center_lat NUMERIC(10, 8),
    center_lng NUMERIC(11, 8),
    drone_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.imaps_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES public.imaps_buildings(id) ON DELETE CASCADE,
    room_code TEXT NOT NULL,
    floor_level INTEGER,
    direction_text TEXT,
    search_tags TEXT, -- e.g., "Makmal, Lab, Komputer, JTM" for better searching
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.imaps_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imaps_locations ENABLE ROW LEVEL SECURITY;

-- Everyone can read buildings and locations
CREATE POLICY "Allow public read access on imaps_buildings" 
ON public.imaps_buildings FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access on imaps_locations" 
ON public.imaps_locations FOR SELECT 
USING (true);

-- Only admins/JPP can modify (For now, just super_admins)
CREATE POLICY "Allow superadmin full access on imaps_buildings"
ON public.imaps_buildings FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'super_admin')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'super_admin')
);

CREATE POLICY "Allow superadmin full access on imaps_locations"
ON public.imaps_locations FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'super_admin')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'super_admin')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_imaps_locations_building_id ON public.imaps_locations(building_id);
CREATE INDEX IF NOT EXISTS idx_imaps_locations_room_code ON public.imaps_locations(room_code);
