-- ============================================================================
-- Migration: 97_fix_makmp_pencapaian_type_constraint.sql
-- Description:
--   Anugerah Kepimpinan JPP menyimpan peranan kepimpinan (PENGARAH, TIMBALAN,
--   SETIAUSAHA, AJK, PENYERTAAN) ke dalam kolum `pencapaian_type`. CHECK
--   constraint asal hanya membenarkan jenis sijil sukan/pencapaian (JOHAN,
--   NAIB_JOHAN, KETIGA, EMAS, PERAK, GANGSA, PESERTA, LAIN), menyebabkan
--   "violates check constraint" bila juri menyimpan keputusan Kepimpinan JPP.
--
--   Fix: tambah 5 nilai peranan kepimpinan ke dalam senarai yang dibenarkan.
-- ============================================================================

ALTER TABLE public.makmp_submission_items
  DROP CONSTRAINT makmp_submission_items_pencapaian_type_check;

ALTER TABLE public.makmp_submission_items
  ADD CONSTRAINT makmp_submission_items_pencapaian_type_check
  CHECK (pencapaian_type = ANY (ARRAY[
    'JOHAN', 'NAIB_JOHAN', 'KETIGA', 'EMAS', 'PERAK', 'GANGSA', 'PESERTA', 'LAIN',
    'PENGARAH', 'TIMBALAN', 'SETIAUSAHA', 'AJK', 'PENYERTAAN'
  ]::text[]));
