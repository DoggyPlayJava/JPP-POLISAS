-- Tambah intake_year + intake_period ke makmp_submissions
-- Supaya borang MAKMP boleh capture cohort pelajar, dan bila pelajar daftar
-- akaun Google selepas submit, profile modal boleh auto-fill 100% (tanpa
-- perlu isi cohort manual). Field ini juga memudahkan auto-link bila matric
-- match berlaku semasa sync.

ALTER TABLE public.makmp_submissions
  ADD COLUMN IF NOT EXISTS intake_year integer,
  ADD COLUMN IF NOT EXISTS intake_period smallint
  CHECK (intake_period IS NULL OR intake_period IN (1, 2));

-- Reload PostgREST schema cache supaya kolum baharu terdedah melalui API
NOTIFY pgrst, 'reload schema';
