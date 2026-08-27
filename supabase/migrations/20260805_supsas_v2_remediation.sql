-- ============================================================
-- 20260805_supsas_v2_remediation.sql
-- SUPSAS 2.0 — Remediation: Missing Columns, Index, 6-char PIN, RPC Update
-- ============================================================

-- 1. Add missing columns to supsas_fixtures
ALTER TABLE supsas_fixtures
ADD COLUMN IF NOT EXISTS winner_team_id UUID REFERENCES supsas_teams(id),
ADD COLUMN IF NOT EXISTS score_type VARCHAR(20) DEFAULT 'points',
ADD COLUMN IF NOT EXISTS sets_detail JSONB DEFAULT '[]'::jsonb;

-- 2. Add index for referee_pin
CREATE INDEX IF NOT EXISTS idx_supsas_fixtures_referee_pin 
ON supsas_fixtures(referee_pin);

-- 3. Replace PIN generator to use 6-digit alphanumeric
CREATE OR REPLACE FUNCTION generate_supsas_referee_pin()
RETURNS TRIGGER AS $$
DECLARE
  chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result TEXT := '';
  i INT;
BEGIN
  IF NEW.referee_pin IS NULL OR NEW.referee_pin = '' THEN
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    NEW.referee_pin := result;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Make sure the trigger uses it (trigger already exists but we recreate to be safe)
DROP TRIGGER IF EXISTS trg_generate_supsas_referee_pin ON supsas_fixtures;
CREATE TRIGGER trg_generate_supsas_referee_pin
BEFORE INSERT ON supsas_fixtures
FOR EACH ROW EXECUTE FUNCTION generate_supsas_referee_pin();

-- Kemaskini fixture sedia ada yang mempunyai PIN 4-digit atau tiada PIN
UPDATE supsas_fixtures
SET referee_pin = (
  SELECT string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', floor(random() * 32 + 1)::integer, 1), '')
  FROM generate_series(1, 6)
)
WHERE referee_pin IS NULL OR referee_pin = '' OR length(referee_pin) < 6;

-- 4. RPC Security Definer update_supsas_fixture_via_pin with remediation
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
  p_winner_team_id UUID DEFAULT NULL,
  p_sets_detail JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_fixture RECORD;
  v_actual_winner UUID;
  v_actual_winner_team UUID;
BEGIN
  -- Validate fixture and pin
  SELECT * INTO v_fixture
  FROM supsas_fixtures
  WHERE id = p_fixture_id AND referee_pin = p_pin;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kod PIN perlawanan tidak sah!');
  END IF;

  -- Validate jsonb array if p_events provided
  IF p_events IS NOT NULL AND jsonb_typeof(p_events) != 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Format p_events tidak sah, mesti array JSONB.');
  END IF;

  IF p_sets_detail IS NOT NULL AND jsonb_typeof(p_sets_detail) != 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Format p_sets_detail tidak sah, mesti array JSONB.');
  END IF;

  -- Atomic UPDATE
  UPDATE supsas_fixtures
  SET
    score_a = COALESCE(p_score_a, score_a),
    score_b = COALESCE(p_score_b, score_b),
    status = COALESCE(p_status, status),
    elapsed_seconds = COALESCE(p_elapsed_seconds, elapsed_seconds),
    timer_status = COALESCE(p_timer_status, timer_status),
    timeline_events = COALESCE(p_events, timeline_events),
    sets_detail = COALESCE(p_sets_detail, sets_detail),
    winner_id = CASE WHEN COALESCE(p_status, status) = 'completed' THEN COALESCE(p_winner_id, winner_id) ELSE winner_id END,
    winner_team_id = CASE WHEN COALESCE(p_status, status) = 'completed' THEN COALESCE(p_winner_team_id, winner_team_id) ELSE winner_team_id END,
    updated_at = NOW()
  WHERE id = p_fixture_id AND referee_pin = p_pin
  RETURNING winner_id, winner_team_id INTO v_actual_winner, v_actual_winner_team;

  -- Automatically advance winner if completed and next_match_id exists
  IF COALESCE(p_status, v_fixture.status) = 'completed' AND v_fixture.next_match_id IS NOT NULL THEN
    UPDATE supsas_fixtures
    SET 
      participant_a_id = CASE WHEN participant_a_id IS NULL AND v_actual_winner IS NOT NULL THEN v_actual_winner ELSE participant_a_id END,
      team_a_id = CASE WHEN team_a_id IS NULL AND v_actual_winner_team IS NOT NULL THEN v_actual_winner_team ELSE team_a_id END,
      participant_b_id = CASE WHEN participant_a_id IS NOT NULL AND participant_b_id IS NULL AND v_actual_winner IS NOT NULL THEN v_actual_winner ELSE participant_b_id END,
      team_b_id = CASE WHEN team_a_id IS NOT NULL AND team_b_id IS NULL AND v_actual_winner_team IS NOT NULL THEN v_actual_winner_team ELSE team_b_id END
    WHERE id = v_fixture.next_match_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
