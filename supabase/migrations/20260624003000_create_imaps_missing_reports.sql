-- Migration: 20260624003000_create_imaps_missing_reports.sql
-- Description: Table for students to report missing locations in PolyMaps

CREATE TABLE IF NOT EXISTS public.imaps_missing_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_code TEXT NOT NULL,
    building_id UUID REFERENCES public.imaps_buildings(id) ON DELETE SET NULL,
    building_name_suggestion TEXT,
    floor_level INTEGER,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.imaps_missing_reports ENABLE ROW LEVEL SECURITY;

-- 1. Students can insert their own reports
CREATE POLICY "Allow students to insert missing reports"
ON public.imaps_missing_reports FOR INSERT
WITH CHECK (
    (SELECT auth.uid()) = student_id
);

-- 2. Students can select/read their own reports
CREATE POLICY "Allow students to read own missing reports"
ON public.imaps_missing_reports FOR SELECT
USING (
    (SELECT auth.uid()) = student_id
);

-- 3. JPP and Super Admin have full access (select, insert, update, delete)
CREATE POLICY "Allow JPP and superadmin full access on missing reports"
ON public.imaps_missing_reports FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP')
);

-- Indexes for performance (Mandatory for Foreign Keys)
CREATE INDEX IF NOT EXISTS idx_imaps_missing_reports_student_id ON public.imaps_missing_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_imaps_missing_reports_building_id ON public.imaps_missing_reports(building_id);
