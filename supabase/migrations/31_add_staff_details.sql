-- ============================================================
-- 31_add_staff_details.sql
-- Tambah kolum phone ke jadual profiles untuk pendaftaran Staf
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Pastikan CHECK constraint untuk role (jika ada) dikemas kini untuk membenarkan 'STAFF'
-- Secara asalnya role dihantar sebagai teks biasa tanpa enum strict di DB, 
-- namun kita pastikan tiada ralat.

DO $$
BEGIN
  RAISE NOTICE '31_add_staff_details.sql berjaya dijalankan. Kolum phone ditambah.';
END $$;
