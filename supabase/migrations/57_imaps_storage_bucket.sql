-- Create bucket for iMaps assets (drone, floorplan, entrance)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'imaps_assets',
    'imaps_assets',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
) ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public View iMaps Assets" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload iMaps Assets" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update iMaps Assets" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete iMaps Assets" ON storage.objects;

-- Create policies for storage.objects
CREATE POLICY "Public View iMaps Assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'imaps_assets');

CREATE POLICY "Auth Upload iMaps Assets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'imaps_assets' AND auth.role() = 'authenticated');

CREATE POLICY "Auth Update iMaps Assets" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'imaps_assets' AND auth.role() = 'authenticated');

CREATE POLICY "Auth Delete iMaps Assets" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'imaps_assets' AND auth.role() = 'authenticated');
