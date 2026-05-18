-- Add polyrent storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('polyrent', 'polyrent', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for polyrent
CREATE POLICY "Public Access Polyrent"
ON storage.objects FOR SELECT
USING ( bucket_id = 'polyrent' );

CREATE POLICY "Authenticated users can upload to polyrent"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'polyrent' );

CREATE POLICY "Users can update their own polyrent images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'polyrent' AND auth.uid() = owner );

CREATE POLICY "Users can delete their own polyrent images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'polyrent' AND auth.uid() = owner );
