-- ============================================================
-- 36_supsas_schema.sql
-- SUPSAS — Sistem Sukan Polisas
-- Skim pangkalan data penuh untuk modul sukan tahunan
-- ============================================================

-- ------------------------------------------------------------
-- 1. EDISI SUPSAS (satu rekod = satu tahun acara)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supsas_editions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                   -- "SUPSAS 2025"
  tagline       TEXT,                            -- "Bersatu, Berjuang, Berjaya"
  edition_year  INT NOT NULL,
  start_date    DATE,
  end_date      DATE,
  is_active     BOOLEAN NOT NULL DEFAULT FALSE,  -- Hanya SATU yang aktif
  logo_url      TEXT,
  banner_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pastikan hanya satu edisi aktif pada satu masa
CREATE UNIQUE INDEX IF NOT EXISTS uq_supsas_active_edition
  ON supsas_editions (is_active)
  WHERE is_active = TRUE;

-- ------------------------------------------------------------
-- 2. KONTINJEN / PASUKAN (berdasarkan Jabatan)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supsas_kontingen (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id          UUID NOT NULL REFERENCES supsas_editions(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,             -- "Jabatan Teknologi Maklumat"
  short_code          TEXT NOT NULL,             -- "JTM"
  color               TEXT NOT NULL DEFAULT '#3B82F6', -- Warna rasmi kontinjen
  logo_url            TEXT,
  leader_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Ketua (pelajar biasa)
  invite_code         TEXT UNIQUE,               -- Kod jemputan untuk claim ketua
  invite_used         BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (edition_id, short_code)
);

-- ------------------------------------------------------------
-- 3. SUKAN YANG DIPERTANDINGKAN
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supsas_sports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id            UUID NOT NULL REFERENCES supsas_editions(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,           -- "Bola Sepak", "Badminton"
  category              TEXT NOT NULL DEFAULT 'team', -- 'team' | 'individual'
  gender                TEXT NOT NULL DEFAULT 'mixed', -- 'male' | 'female' | 'mixed'
  format                TEXT NOT NULL DEFAULT 'knockout', -- 'knockout' | 'round_robin' | 'group_knockout'
  icon                  TEXT NOT NULL DEFAULT 'Trophy', -- Lucide icon name
  venue                 TEXT,
  max_per_team          INT NOT NULL DEFAULT 11,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order            INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. PESERTA (Pelajar yang berdaftar dalam sukan)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supsas_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      UUID NOT NULL REFERENCES supsas_editions(id) ON DELETE CASCADE,
  kontingen_id    UUID NOT NULL REFERENCES supsas_kontingen(id) ON DELETE CASCADE,
  sport_id        UUID NOT NULL REFERENCES supsas_sports(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position        TEXT,                          -- "Kapten", "Pemain", "Cadangan"
  jersey_number   INT,
  is_confirmed    BOOLEAN NOT NULL DEFAULT FALSE,-- Disahkan oleh admin
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sport_id, kontingen_id, profile_id)  -- Satu pelajar satu slot per sukan per pasukan
);

-- ------------------------------------------------------------
-- 5. JADUAL PERTANDINGAN
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supsas_fixtures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      UUID NOT NULL REFERENCES supsas_editions(id) ON DELETE CASCADE,
  sport_id        UUID NOT NULL REFERENCES supsas_sports(id) ON DELETE CASCADE,
  round           TEXT,                          -- "Separuh Akhir", "Akhir", "Kumpulan A"
  match_number    INT,
  kontingen_a_id  UUID REFERENCES supsas_kontingen(id) ON DELETE SET NULL,
  kontingen_b_id  UUID REFERENCES supsas_kontingen(id) ON DELETE SET NULL,
  match_date      DATE,
  match_time      TIME,
  venue           TEXT,
  status          TEXT NOT NULL DEFAULT 'upcoming', -- 'upcoming'|'live'|'completed'|'postponed'
  score_a         TEXT,                          -- Fleksibel: "3", "21", "10.2s"
  score_b         TEXT,
  winner_id       UUID REFERENCES supsas_kontingen(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. KEPUTUSAN & MEDAL
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supsas_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      UUID NOT NULL REFERENCES supsas_editions(id) ON DELETE CASCADE,
  sport_id        UUID NOT NULL REFERENCES supsas_sports(id) ON DELETE CASCADE,
  kontingen_id    UUID NOT NULL REFERENCES supsas_kontingen(id) ON DELETE CASCADE,
  medal           TEXT,                          -- 'gold' | 'silver' | 'bronze'
  position        INT,                           -- 1, 2, 3, 4...
  notes           TEXT,
  recorded_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sport_id, kontingen_id)
);

-- ------------------------------------------------------------
-- 7. VIEW: MEDAL TALLY (Dikira secara auto)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW supsas_medal_tally AS
SELECT
  k.id             AS kontingen_id,
  k.edition_id,
  k.name,
  k.short_code,
  k.color,
  k.logo_url,
  COUNT(*) FILTER (WHERE r.medal = 'gold')   AS gold,
  COUNT(*) FILTER (WHERE r.medal = 'silver') AS silver,
  COUNT(*) FILTER (WHERE r.medal = 'bronze') AS bronze,
  COUNT(*) FILTER (WHERE r.medal IS NOT NULL) AS total_medals
FROM supsas_kontingen k
LEFT JOIN supsas_results r ON r.kontingen_id = k.id AND r.edition_id = k.edition_id
GROUP BY k.id, k.edition_id, k.name, k.short_code, k.color, k.logo_url
ORDER BY gold DESC, silver DESC, bronze DESC, total_medals DESC;

-- ------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- ------------------------------------------------------------
ALTER TABLE supsas_editions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE supsas_kontingen   ENABLE ROW LEVEL SECURITY;
ALTER TABLE supsas_sports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE supsas_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE supsas_fixtures    ENABLE ROW LEVEL SECURITY;
ALTER TABLE supsas_results     ENABLE ROW LEVEL SECURITY;

-- Editions: PUBLIC read, superadmin write
CREATE POLICY "supsas_editions_public_read"  ON supsas_editions FOR SELECT USING (TRUE);
CREATE POLICY "supsas_editions_admin_write"  ON supsas_editions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP'));

-- Kontingen: PUBLIC read
CREATE POLICY "supsas_kontingen_public_read" ON supsas_kontingen FOR SELECT USING (TRUE);
-- Superadmin: full write
CREATE POLICY "supsas_kontingen_admin_write" ON supsas_kontingen FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP'));
-- Ketua boleh UPDATE kontinjen mereka sahaja (bukan INSERT/DELETE)
CREATE POLICY "supsas_kontingen_leader_update" ON supsas_kontingen FOR UPDATE
  USING (leader_id = auth.uid())
  WITH CHECK (leader_id = auth.uid());

-- Sports: PUBLIC read, JPP/admin write
CREATE POLICY "supsas_sports_public_read"  ON supsas_sports FOR SELECT USING (TRUE);
CREATE POLICY "supsas_sports_jpp_write"    ON supsas_sports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')));

-- Participants: PUBLIC read
CREATE POLICY "supsas_participants_public_read" ON supsas_participants FOR SELECT USING (TRUE);
-- Ketua boleh INSERT/UPDATE/DELETE peserta dalam kontinjen mereka
CREATE POLICY "supsas_participants_leader_write" ON supsas_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = auth.uid()));
-- Admin full access
CREATE POLICY "supsas_participants_admin_write" ON supsas_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')));

-- Fixtures: PUBLIC read, JPP/admin write
CREATE POLICY "supsas_fixtures_public_read" ON supsas_fixtures FOR SELECT USING (TRUE);
CREATE POLICY "supsas_fixtures_jpp_write"   ON supsas_fixtures FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')));

-- Results: PUBLIC read, JPP/admin write
CREATE POLICY "supsas_results_public_read" ON supsas_results FOR SELECT USING (TRUE);
CREATE POLICY "supsas_results_jpp_write"   ON supsas_results FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')));

-- ------------------------------------------------------------
-- 9. RPC: CLAIM INVITE CODE (Pelajar biasa claim jadi Ketua Kontingen)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION supsas_claim_invite_code(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kontingen supsas_kontingen%ROWTYPE;
BEGIN
  -- Semak auth
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Anda perlu log masuk dahulu.');
  END IF;

  -- Cari kontingen dengan kod ini
  SELECT * INTO v_kontingen
  FROM supsas_kontingen
  WHERE invite_code = p_invite_code AND invite_used = FALSE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Kod jemputan tidak sah atau telah digunakan.');
  END IF;

  -- Semak jika user ini dah jadi ketua kontingen lain dalam edisi yang sama
  IF EXISTS (
    SELECT 1 FROM supsas_kontingen
    WHERE edition_id = v_kontingen.edition_id AND leader_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Anda sudah menjadi ketua kontingen lain dalam edisi ini.');
  END IF;

  -- Assign ketua
  UPDATE supsas_kontingen
  SET leader_id = auth.uid(), invite_used = TRUE, updated_at = NOW()
  WHERE id = v_kontingen.id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'kontingen_id', v_kontingen.id,
    'kontingen_name', v_kontingen.name
  );
END;
$$;

-- ------------------------------------------------------------
-- 10. RPC: REVOKE KETUA KONTINGEN (Admin sahaja)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION supsas_revoke_leader(p_kontingen_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP') THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  UPDATE supsas_kontingen
  SET leader_id = NULL, invite_used = FALSE, updated_at = NOW()
  WHERE id = p_kontingen_id;

  RETURN TRUE;
END;
$$;

-- ------------------------------------------------------------
-- 11. TRIGGER: updated_at auto-update
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION supsas_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER supsas_editions_updated_at    BEFORE UPDATE ON supsas_editions    FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
CREATE TRIGGER supsas_kontingen_updated_at   BEFORE UPDATE ON supsas_kontingen   FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
CREATE TRIGGER supsas_sports_updated_at      BEFORE UPDATE ON supsas_sports      FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
CREATE TRIGGER supsas_fixtures_updated_at    BEFORE UPDATE ON supsas_fixtures    FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();

-- ------------------------------------------------------------
-- 12. STORAGE BUCKET untuk logo/banner SUPSAS
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('supsas-assets', 'supsas-assets', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "supsas_assets_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'supsas-assets');
CREATE POLICY "supsas_assets_admin_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'supsas-assets' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ));
CREATE POLICY "supsas_assets_admin_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'supsas-assets' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ));

-- ------------------------------------------------------------
-- 13. PORTAL SETTINGS entry untuk modul SUPSAS
-- ------------------------------------------------------------
INSERT INTO portal_settings (exco_module, color, is_enabled)
VALUES ('supsas', '#F59E0B', FALSE)
ON CONFLICT (exco_module) DO NOTHING;
