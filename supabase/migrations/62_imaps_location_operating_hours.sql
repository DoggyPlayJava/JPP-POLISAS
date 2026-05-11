-- Add operating hours for specific locations (rooms/facilities)
ALTER TABLE public.imaps_locations 
ADD COLUMN op_start TIME,
ADD COLUMN op_end TIME;

-- Allow admin and jpp_hq to update this
-- We already have RLS policies on imaps_locations, but this just adds the columns.
