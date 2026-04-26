-- ============================================================
-- MIGRATION 38: Karnival v2 — Rebuild dari Bawah
-- Menggantikan sistem lama (karnival_votes + system_settings)
-- dengan seni bina edisi tahunan + kategori + booth + QR
-- ============================================================

-- ─── STEP 0: Bersihkan sistem lama ───────────────────────────
DROP FUNCTION IF EXISTS get_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS has_voted_for(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_my_votes() CASCADE;
DROP TABLE IF EXISTS karnival_votes CASCADE;
DELETE FROM system_settings WHERE key LIKE 'karnival_%';

-- ─── STEP 1: karnival_editions ────────────────────────────────
CREATE TABLE karnival_editions (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT        NOT NULL,
  tagline             TEXT,
  edition_year        INTEGER     NOT NULL,
  start_date          DATE,
  end_date            DATE,
  is_active           BOOLEAN     NOT NULL DEFAULT false,
  voting_enabled      BOOLEAN     NOT NULL DEFAULT false,
  results_published   BOOLEAN     NOT NULL DEFAULT false,
  cover_image_url     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE karnival_editions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "karnival_editions_read_all" ON karnival_editions FOR SELECT USING (true);
CREATE POLICY "karnival_editions_write_kpp" ON karnival_editions FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));

-- ─── STEP 2: karnival_categories ─────────────────────────────
CREATE TABLE karnival_categories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id  UUID        NOT NULL REFERENCES karnival_editions(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  icon_emoji  TEXT        DEFAULT '🏆',
  max_votes   INTEGER     NOT NULL DEFAULT 1,
  sort_order  INTEGER     DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_karnival_categories_edition ON karnival_categories(edition_id);
ALTER TABLE karnival_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "karnival_categories_read_all" ON karnival_categories FOR SELECT USING (true);
CREATE POLICY "karnival_categories_write_kpp" ON karnival_categories FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));

-- ─── STEP 3: karnival_booths ──────────────────────────────────
CREATE TABLE karnival_booths (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id    UUID        NOT NULL REFERENCES karnival_editions(id) ON DELETE CASCADE,
  category_id   UUID        NOT NULL REFERENCES karnival_categories(id) ON DELETE CASCADE,
  kelab_id      TEXT,
  kelab_name    TEXT        NOT NULL,
  booth_number  TEXT,
  theme         TEXT,
  description   TEXT,
  image_url     TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_kelab_per_category UNIQUE NULLS NOT DISTINCT (kelab_id, category_id)
);

CREATE INDEX idx_karnival_booths_edition  ON karnival_booths(edition_id);
CREATE INDEX idx_karnival_booths_category ON karnival_booths(category_id);
ALTER TABLE karnival_booths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "karnival_booths_read_all" ON karnival_booths FOR SELECT USING (true);
CREATE POLICY "karnival_booths_write_kpp" ON karnival_booths FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));

-- ─── STEP 4: karnival_votes_v2 ───────────────────────────────
CREATE TABLE karnival_votes_v2 (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id  UUID        NOT NULL REFERENCES karnival_editions(id) ON DELETE CASCADE,
  category_id UUID        NOT NULL REFERENCES karnival_categories(id) ON DELETE CASCADE,
  booth_id    UUID        NOT NULL REFERENCES karnival_booths(id) ON DELETE CASCADE,
  voter_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  matric_no   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_voter_booth UNIQUE (voter_id, booth_id)
);

CREATE INDEX idx_karnival_votes_v2_edition  ON karnival_votes_v2(edition_id);
CREATE INDEX idx_karnival_votes_v2_category ON karnival_votes_v2(category_id);
CREATE INDEX idx_karnival_votes_v2_booth    ON karnival_votes_v2(booth_id);
CREATE INDEX idx_karnival_votes_v2_voter    ON karnival_votes_v2(voter_id);
ALTER TABLE karnival_votes_v2 REPLICA IDENTITY FULL;
ALTER TABLE karnival_votes_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "karnival_votes_v2_read_all" ON karnival_votes_v2 FOR SELECT USING (true);
CREATE POLICY "karnival_votes_v2_insert_self" ON karnival_votes_v2 FOR INSERT
  WITH CHECK (auth.uid() = voter_id AND EXISTS (SELECT 1 FROM karnival_editions WHERE id = edition_id AND voting_enabled = true));
CREATE POLICY "karnival_votes_v2_delete_own" ON karnival_votes_v2 FOR DELETE USING (auth.uid() = voter_id);
CREATE POLICY "karnival_votes_v2_admin_all" ON karnival_votes_v2 FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));

-- ─── STEP 5: RPCs ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_karnival_booth_votes(p_edition_id UUID, p_category_id UUID)
RETURNS TABLE(booth_id UUID, booth_name TEXT, booth_number TEXT, image_url TEXT, total_votes BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT b.id, b.kelab_name, b.booth_number, b.image_url, COUNT(v.id)
  FROM karnival_booths b
  LEFT JOIN karnival_votes_v2 v ON v.booth_id = b.id
  WHERE b.edition_id = p_edition_id AND b.category_id = p_category_id AND b.is_active = true
  GROUP BY b.id, b.kelab_name, b.booth_number, b.image_url
  ORDER BY COUNT(v.id) DESC, b.kelab_name ASC;
$$;
GRANT EXECUTE ON FUNCTION get_karnival_booth_votes(UUID, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_my_karnival_votes_in_category(p_category_id UUID)
RETURNS TABLE(booth_id UUID, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT v.booth_id, v.created_at FROM karnival_votes_v2 v
  WHERE v.voter_id = auth.uid() AND v.category_id = p_category_id
  ORDER BY v.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION get_my_karnival_votes_in_category(UUID) TO authenticated;

-- ─── STEP 6: Storage Bucket ────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('karnival-booths', 'karnival-booths', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "karnival_booths_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'karnival-booths');
CREATE POLICY "karnival_booths_kpp_upload"  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'karnival-booths' AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
CREATE POLICY "karnival_booths_kpp_delete"  ON storage.objects FOR DELETE
  USING (bucket_id = 'karnival-booths' AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
