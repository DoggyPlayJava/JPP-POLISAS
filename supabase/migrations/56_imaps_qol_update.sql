-- Add QoL columns to imaps_buildings
ALTER TABLE public.imaps_buildings 
ADD COLUMN is_facility BOOLEAN DEFAULT false,
ADD COLUMN facility_type TEXT,
ADD COLUMN op_start TIME,
ADD COLUMN op_end TIME,
ADD COLUMN floorplan_image_url TEXT,
ADD COLUMN entrance_image_url TEXT;

-- Update the realtime publication if necessary (already covers all columns usually, but good practice to comment)
-- No additional RLS needed since the table already has policies allowing reading of all data and writing by admins.
