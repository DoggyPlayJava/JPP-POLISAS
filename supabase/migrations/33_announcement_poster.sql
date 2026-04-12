-- ==============================================================================
-- 33_announcement_poster.sql
-- Add image_url and icon_type to system_announcements & Create Storage Bucket
-- ==============================================================================

-- 1. Alter Table
ALTER TABLE public.system_announcements 
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS icon_type TEXT DEFAULT 'INFO';

-- 2. Create Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcements',
  'announcements',
  true, -- PUBLIC access for images
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 3. Set up Storage Policies for 'announcements'
-- Policy 1: Everyone can view public announcement images
CREATE POLICY "Public can view announcement images"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcements');

-- Policy 2: JPP & SUPER_ADMIN_JPP can insert
CREATE POLICY "JPP can insert announcement images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);

-- Policy 3: JPP & SUPER_ADMIN_JPP can update
CREATE POLICY "JPP can update announcement images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);

-- Policy 4: JPP & SUPER_ADMIN_JPP can delete
CREATE POLICY "JPP can delete announcement images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);
