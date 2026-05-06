-- ============================================================
-- Migration: Takwim POLISAS Berpusat
-- Jadual baharu untuk entri takwim berpusat (akademik, JPP, exco units)
-- ============================================================

CREATE TABLE IF NOT EXISTS takwim_pusat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Kategori entri
  jenis TEXT NOT NULL CHECK (jenis IN (
    'AKADEMIK',
    'JPP',
    'KPP',
    'KEUSAHAWANAN',
    'KEBAJIKAN',
    'SRK',
    'AKADEMIK_EXCO',
    'MULTIMEDIA',
    'KLS',
    'KOLAB',
    'KK',
    'CUTI_UMUM',
    'LAIN'
  )),
  
  -- Butiran
  tajuk TEXT NOT NULL,
  catatan TEXT,
  tarikh_mula DATE NOT NULL,
  tarikh_tamat DATE,
  bil_minggu INTEGER,
  aktiviti TEXT,
  
  -- Warna custom (optional)
  warna_custom TEXT,
  
  -- Sesi akademik
  sesi TEXT DEFAULT '2026/2027',
  
  -- Exco module ownership (untuk RBAC frontend)
  exco_module TEXT,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE takwim_pusat ENABLE ROW LEVEL SECURITY;

-- Semua authenticated users boleh baca
CREATE POLICY "takwim_pusat_select" ON takwim_pusat
  FOR SELECT TO authenticated USING (true);

-- Insert: hanya authenticated users (frontend handles RBAC)
CREATE POLICY "takwim_pusat_insert" ON takwim_pusat
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Update: hanya yang cipta
CREATE POLICY "takwim_pusat_update" ON takwim_pusat
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

-- Delete: hanya yang cipta
CREATE POLICY "takwim_pusat_delete" ON takwim_pusat
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_takwim_pusat_jenis ON takwim_pusat(jenis);
CREATE INDEX IF NOT EXISTS idx_takwim_pusat_sesi ON takwim_pusat(sesi);
CREATE INDEX IF NOT EXISTS idx_takwim_pusat_tarikh ON takwim_pusat(tarikh_mula);
CREATE INDEX IF NOT EXISTS idx_takwim_pusat_created_by ON takwim_pusat(created_by);
