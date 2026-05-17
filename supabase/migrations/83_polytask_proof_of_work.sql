-- Tambah kolum bukti kerja pada tugasan
ALTER TABLE public.polytask_jobs
ADD COLUMN IF NOT EXISTS proof_image_url TEXT;

-- Benarkan Tasker update proof_image_url
CREATE POLICY "Tasker boleh muat naik bukti kerja" ON public.polytask_jobs
    FOR UPDATE USING (
        assigned_tasker_id = (SELECT auth.uid()) AND status = 'IN_PROGRESS'
    ) WITH CHECK (
        assigned_tasker_id = (SELECT auth.uid())
    );

-- Sediakan bucket untuk storage
INSERT INTO storage.buckets (id, name, public) VALUES ('polytask_proofs', 'polytask_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS untuk storage bucket (Polisi storan selalunya perlukan ini)
CREATE POLICY "Semua boleh lihat bukti" ON storage.objects
    FOR SELECT USING (bucket_id = 'polytask_proofs');

CREATE POLICY "Pelajar boleh upload bukti" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'polytask_proofs' AND auth.uid() IS NOT NULL);
