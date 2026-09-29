-- ============================================================================
-- 92_foodbank_module_active_column.sql
-- Tambah column is_module_active pada foodbank_settings.
-- Column ini wujud dalam TypeScript type & defaults tetapi TIDAK wujud dalam DB,
-- menyebabkan suis "Rasmikan & Buka Modul Siswa" tidak kekal selepas refresh.
-- ============================================================================

ALTER TABLE public.foodbank_settings
  ADD COLUMN IF NOT EXISTS is_module_active BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.foodbank_settings.is_module_active IS
  'Master togol: kawal paparan & status aktif modul Food Bank untuk pelajar (true = dirasmikan/dibuka).';
