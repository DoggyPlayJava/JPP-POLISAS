-- 29_keusahawanan_products_bucket.sql

-- 1. Create the keusahawanan-products bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'keusahawanan-products',
  'keusahawanan-products',
  true, -- PUBLIC for logos and product images
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Set up policies
-- Policy 1: Anyone can view logos/products
CREATE POLICY "Public boleh lihat gambar produk dan logo"
ON storage.objects FOR SELECT
USING (bucket_id = 'keusahawanan-products');

-- Policy 2: Insert allowed for Authenticated users
CREATE POLICY "Authenticated users boleh muat naik gambar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'keusahawanan-products');

-- Policy 3: Update allowed for Authenticated users
CREATE POLICY "Authenticated users boleh kemaskini gambar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'keusahawanan-products');

-- Policy 4: Delete allowed for Authenticated users
CREATE POLICY "Authenticated users boleh padam gambar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'keusahawanan-products');
