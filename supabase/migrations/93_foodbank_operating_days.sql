-- ============================================================================
-- 93_foodbank_operating_days.sql
-- Tambah column operating_days (JSONB) pada foodbank_distribution_locations
-- supaya setiap pusat boleh tentukan hari beroperasi sendiri (tarikh
-- pengambilan dijana ikut hari beroperasi pusat yang dipilih).
-- Nilai contoh: ["Isnin","Selasa","Rabu","Khamis"] (hari penuh Bahasa Malaysia).
-- NULL bermaksud guna lalai Isnin-Jumaat.
-- ============================================================================

ALTER TABLE public.foodbank_distribution_locations
  ADD COLUMN IF NOT EXISTS operating_days JSONB;

COMMENT ON COLUMN public.foodbank_distribution_locations.operating_days IS
  'Hari beroperasi pusat untuk tarikh pengambilan (cth: ["Isnin","Selasa","Rabu"]). NULL = guna lalai Isnin-Jumaat.';
