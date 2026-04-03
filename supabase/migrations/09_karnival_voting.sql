-- ============================================================
-- FASA 5: Sistem Pengundian Karnival (Real-Time)
-- Menggunakan Supabase Realtime untuk update live
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Jadual Undi Karnival
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS karnival_votes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kelab_id    TEXT        NOT NULL,   -- club_id yang diundi
  kelab_name  TEXT        NOT NULL,   -- nama kelab (untuk display)
  matric_no   TEXT,                   -- no matrik pengundi (jejak)
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  -- Satu pengundi = satu undi per kelab sahaja
  CONSTRAINT unique_voter_kelab UNIQUE (voter_id, kelab_id)
);

-- Index untuk query pantas
CREATE INDEX IF NOT EXISTS idx_votes_kelab_id  ON karnival_votes(kelab_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_id  ON karnival_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_created   ON karnival_votes(created_at DESC);

-- Enable Realtime (Supabase akan broadcast perubahan via WebSocket)
ALTER TABLE karnival_votes REPLICA IDENTITY FULL;

DO $$ BEGIN RAISE NOTICE 'Step 1 selesai: Jadual karnival_votes dibuat.'; END $$;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Row Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE karnival_votes ENABLE ROW LEVEL SECURITY;

-- Semua orang boleh BACA kiraan undi (untuk papan markah)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'karnival_votes' AND policyname = 'Anyone can read votes'
  ) THEN
    CREATE POLICY "Anyone can read votes"
    ON karnival_votes FOR SELECT
    USING (true);
  END IF;
END $$;

-- Pengguna hanya boleh UNDI untuk diri sendiri
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'karnival_votes' AND policyname = 'User can vote for themselves'
  ) THEN
    CREATE POLICY "User can vote for themselves"
    ON karnival_votes FOR INSERT
    WITH CHECK (auth.uid() = voter_id);
  END IF;
END $$;

-- Pengguna boleh TARIK BALIK undi sendiri
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'karnival_votes' AND policyname = 'User can delete own vote'
  ) THEN
    CREATE POLICY "User can delete own vote"
    ON karnival_votes FOR DELETE
    USING (auth.uid() = voter_id);
  END IF;
END $$;

-- JPP Admin boleh semua
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'karnival_votes' AND policyname = 'JPP Admin full access on votes'
  ) THEN
    CREATE POLICY "JPP Admin full access on votes"
    ON karnival_votes FOR ALL
    USING (
      auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP'
      )
    );
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'Step 2 selesai: RLS karnival_votes dipasang.'; END $$;

-- ─────────────────────────────────────────────────────────────
-- STEP 3: RPC untuk Kiraan Undi (Efisien)
-- Guna aggregate terus dalam DB — lebih laju dari COUNT(*) di frontend
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_vote_counts()
RETURNS TABLE(kelab_id TEXT, kelab_name TEXT, total_votes BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    kelab_id,
    kelab_name,
    COUNT(*) AS total_votes
  FROM karnival_votes
  GROUP BY kelab_id, kelab_name
  ORDER BY total_votes DESC;
$$;

GRANT EXECUTE ON FUNCTION get_vote_counts() TO anon, authenticated;

-- Semak sama ada pengguna sudah mengundi kelab tertentu
CREATE OR REPLACE FUNCTION has_voted_for(p_kelab_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM karnival_votes
    WHERE voter_id = auth.uid()
      AND kelab_id = p_kelab_id
  );
$$;

GRANT EXECUTE ON FUNCTION has_voted_for(TEXT) TO authenticated;

-- Dapatkan semua undi pengguna semasa
CREATE OR REPLACE FUNCTION get_my_votes()
RETURNS TABLE(kelab_id TEXT, kelab_name TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT kelab_id, kelab_name, created_at
  FROM karnival_votes
  WHERE voter_id = auth.uid()
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_my_votes() TO authenticated;

DO $$ BEGIN RAISE NOTICE 'Step 3 selesai: RPC vote functions dibuat.'; END $$;

-- ─────────────────────────────────────────────────────────────
-- STEP 4: Settings Karnival dalam system_settings
-- ─────────────────────────────────────────────────────────────
INSERT INTO system_settings (key, value) VALUES
  ('karnival_voting_enabled',    'false'::jsonb),
  ('karnival_registration_open', 'true'::jsonb),
  ('karnival_title',             '"Hari Karnival JPP POLISAS"'::jsonb),
  ('karnival_max_votes',         '3'::jsonb)         -- max kelab boleh diundi per pelajar
ON CONFLICT (key) DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'Step 4 selesai: Settings karnival dalam system_settings.'; END $$;

-- ─────────────────────────────────────────────────────────────
-- SEMAK AKHIR
-- ─────────────────────────────────────────────────────────────
SELECT
  'karnival_votes table' AS item,
  COUNT(*) AS records
FROM karnival_votes
UNION ALL
SELECT 'karnival settings', COUNT(*)
FROM system_settings
WHERE key LIKE 'karnival_%';
