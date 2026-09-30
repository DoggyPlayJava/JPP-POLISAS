-- 101_foodbank_counter_verification_override.sql
-- Ciri: benarkan pelajar membetulkan Nama / No. Matrik pada permohonan Food Bank
-- SEBELUM hantar. Nilai override disimpan pada aplikasi (BUKAN profil), dan
-- permohonan ditandakan "perlu pengesahan kaunter" (bawa kad matrik semasa
-- pengambilan).

ALTER TABLE public.foodbank_applications
  ADD COLUMN IF NOT EXISTS applicant_name_override text,
  ADD COLUMN IF NOT EXISTS applicant_matric_override text,
  ADD COLUMN IF NOT EXISTS requires_counter_verification boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS counter_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS counter_verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS counter_verified_at timestamptz;

-- Indeks untuk carian pantas di tab Permohonan & Kaunter
CREATE INDEX IF NOT EXISTS idx_foodbank_applications_counter_verify
  ON public.foodbank_applications (requires_counter_verification, counter_verified)
  WHERE requires_counter_verification = true;

-- Pastikan RLS tak sekat update kolum baru (policy sedia ada guna applicant_id
-- / is_foodbank_admin — kolum baru kekal dilindungi oleh policy yang sama).
