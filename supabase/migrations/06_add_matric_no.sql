-- ============================================================
-- 06_add_matric_no.sql
-- Tambah kolum matric_no ke jadual profiles
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matric_no TEXT;
