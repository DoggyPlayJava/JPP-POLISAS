-- ============================================================
-- 20260804_supsas_v2_updates.sql
-- SUPSAS 2.0 — Referee PIN, Live Timer, Match Events & Medal Points
-- ============================================================

-- 1. Tambah kolum pada supsas_fixtures untuk kawalan Pengadil/Juri
ALTER TABLE supsas_fixtures 
ADD COLUMN IF NOT EXISTS referee_pin VARCHAR(6),
ADD COLUMN IF NOT EXISTS timeline_events JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS elapsed_seconds INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS timer_status VARCHAR(20) DEFAULT 'stopped';

-- 2. Tambah kolum pada supsas_editions untuk mata pingat dilaraskan
ALTER TABLE supsas_editions
ADD COLUMN IF NOT EXISTS gold_points INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS silver_points INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS bronze_points INT DEFAULT 1;

-- 3. Pemicu (Trigger) untuk jana PIN 4-digit automatik bagi perlawanan baharu
CREATE OR REPLACE FUNCTION generate_supsas_referee_pin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referee_pin IS NULL OR NEW.referee_pin = '' THEN
    NEW.referee_pin := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_supsas_referee_pin ON supsas_fixtures;
CREATE TRIGGER trg_generate_supsas_referee_pin
BEFORE INSERT ON supsas_fixtures
FOR EACH ROW EXECUTE FUNCTION generate_supsas_referee_pin();

-- Kemaskini fixture sedia ada yang tiada PIN
UPDATE supsas_fixtures
SET referee_pin = LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')
WHERE referee_pin IS NULL OR referee_pin = '';

-- 4. Kemaskini View supsas_medal_tally untuk mengira total_points
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
  COUNT(*) FILTER (WHERE r.medal IS NOT NULL) AS total_medals,
  (
    (COUNT(*) FILTER (WHERE r.medal = 'gold') * COALESCE(e.gold_points, 5)) +
    (COUNT(*) FILTER (WHERE r.medal = 'silver') * COALESCE(e.silver_points, 3)) +
    (COUNT(*) FILTER (WHERE r.medal = 'bronze') * COALESCE(e.bronze_points, 1))
  ) AS total_points
FROM supsas_kontingen k
JOIN supsas_editions e ON e.id = k.edition_id
LEFT JOIN supsas_results r ON r.kontingen_id = k.id AND r.edition_id = k.edition_id
GROUP BY k.id, k.edition_id, k.name, k.short_code, k.color, k.logo_url, e.gold_points, e.silver_points, e.bronze_points
ORDER BY gold DESC, total_points DESC, silver DESC, bronze DESC;

-- 5. RPC Security Definer untuk kemaskini skor via PIN Pengadil
CREATE OR REPLACE FUNCTION update_supsas_fixture_via_pin(
  p_fixture_id UUID,
  p_pin TEXT,
  p_score_a TEXT DEFAULT NULL,
  p_score_b TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_elapsed_seconds INT DEFAULT NULL,
  p_timer_status TEXT DEFAULT NULL,
  p_events JSONB DEFAULT NULL,
  p_winner_id UUID DEFAULT NULL,
  p_winner_team_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM supsas_fixtures
  WHERE id = p_fixture_id AND referee_pin = p_pin;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kod PIN perlawanan tidak sah!');
  END IF;

  UPDATE supsas_fixtures
  SET
    score_a = COALESCE(p_score_a, score_a),
    score_b = COALESCE(p_score_b, score_b),
    status = COALESCE(p_status, status),
    elapsed_seconds = COALESCE(p_elapsed_seconds, elapsed_seconds),
    timer_status = COALESCE(p_timer_status, timer_status),
    timeline_events = COALESCE(p_events, timeline_events),
    winner_id = CASE WHEN p_status = 'completed' THEN p_winner_id ELSE winner_id END,
    winner_team_id = CASE WHEN p_status = 'completed' THEN p_winner_team_id ELSE winner_team_id END,
    updated_at = NOW()
  WHERE id = p_fixture_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
