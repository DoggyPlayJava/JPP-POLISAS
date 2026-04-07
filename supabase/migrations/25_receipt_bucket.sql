-- 25_receipt_bucket.sql

-- 1. Create the receipts bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false, -- NOT PUBLIC
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 2. Set up policies
-- Policy 1: Admin can access all files (for viewing)
CREATE POLICY "Admin boleh lihat resit"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
  )
);

-- Policy 2: Admin can delete all files (for auto-delete on approve)
CREATE POLICY "Admin boleh padam resit"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
  )
);

-- Policy 3: Authenticated users can upload their own receipt
CREATE POLICY "Pelajar boleh masukkan resit sendiri"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  -- Ensures they upload to a folder matching their own user id:
  AND (auth.uid()::text = (string_to_array(name, '/'))[1])
);
