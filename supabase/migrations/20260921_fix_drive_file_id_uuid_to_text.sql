-- Fix drive_file_id uuid -> text (Google Drive ID adalah string, bukan UUID)
ALTER TABLE public.makmp_submission_items ALTER COLUMN drive_file_id TYPE text;
ALTER TABLE public.akademik_cgpa_records   ALTER COLUMN drive_file_id TYPE text;
ALTER TABLE public.akademik_pencapaian     ALTER COLUMN drive_file_id TYPE text;
ALTER TABLE public.akademik_files          ALTER COLUMN drive_file_id TYPE text;
