-- Migration: 20260624004000_create_imaps_walkways.sql
-- Description: Table and RLS policies for campus walkway network

CREATE TABLE IF NOT EXISTS public.imaps_walkways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    coordinates JSONB NOT NULL, -- Array of [lat, lng] coordinates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.imaps_walkways ENABLE ROW LEVEL SECURITY;

-- Allow public read access to walkways
CREATE POLICY "Allow public read access on imaps_walkways" 
ON public.imaps_walkways FOR SELECT 
USING (true);

-- Allow superadmins and JPP profiles to modify walkways
CREATE POLICY "Allow superadmin full access on imaps_walkways"
ON public.imaps_walkways FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
);

-- Index on created_at for fast ordering
CREATE INDEX IF NOT EXISTS idx_imaps_walkways_created_at ON public.imaps_walkways(created_at DESC);
