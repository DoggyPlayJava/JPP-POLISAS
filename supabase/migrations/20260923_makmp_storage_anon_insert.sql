-- Allow guest (anon) upload sijil MAKMP ke bucket 'reports' path 'makmp_sijil/'
-- Borang MAKMP adalah public — student tak semestinya login. Fallback upload
-- ke Supabase Storage perlu benarkan anon untuk path ini (sama seperti 'ems/%').
CREATE POLICY "reports_anon_insert_makmp_sijil"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK ((bucket_id = 'reports'::text) AND (name ~~ 'makmp_sijil/%'::text));

NOTIFY pgrst, 'reload schema';
