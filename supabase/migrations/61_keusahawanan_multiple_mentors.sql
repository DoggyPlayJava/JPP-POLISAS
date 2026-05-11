-- ============================================================
-- Migration 61: Keusahawanan Multiple Mentors
-- ============================================================

-- Add new JSONB column for mentors
ALTER TABLE public.keusahawanan_businesses
ADD COLUMN IF NOT EXISTS mentors JSONB DEFAULT '[]'::jsonb;

-- Migrate existing data from mentor_name and mentor_department
UPDATE public.keusahawanan_businesses
SET mentors = jsonb_build_array(
  jsonb_build_object(
    'name', mentor_name,
    'department', mentor_department
  )
)
WHERE mentor_name IS NOT NULL AND mentor_name != '';

-- Drop old columns
ALTER TABLE public.keusahawanan_businesses
DROP COLUMN IF EXISTS mentor_name,
DROP COLUMN IF EXISTS mentor_department;
