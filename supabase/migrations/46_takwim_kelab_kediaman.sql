-- ============================================================
-- Migration: Tambah KELAB_KEDIAMAN dalam takwim_pusat
-- ============================================================

-- 1. Drop existing constraint and recreate with KELAB_KEDIAMAN
ALTER TABLE takwim_pusat DROP CONSTRAINT IF EXISTS takwim_pusat_jenis_check;
ALTER TABLE takwim_pusat ADD CONSTRAINT takwim_pusat_jenis_check
  CHECK (jenis IN (
    'AKADEMIK', 'JPP', 'KPP', 'KEUSAHAWANAN', 'KEBAJIKAN', 'SRK',
    'AKADEMIK_EXCO', 'MULTIMEDIA', 'KLS', 'KOLAB', 'KK', 'CUTI_UMUM', 'LAIN',
    'KELAB_KEDIAMAN'
  ));

-- 2. Free-text label for kelab kediaman name (e.g. "JPPI", "AG", "IS")
ALTER TABLE takwim_pusat ADD COLUMN IF NOT EXISTS kelab_kediaman_label TEXT;

-- 3. Index for kediaman queries
CREATE INDEX IF NOT EXISTS idx_takwim_pusat_kelab_kediaman
  ON takwim_pusat(kelab_kediaman_label) WHERE jenis = 'KELAB_KEDIAMAN';
