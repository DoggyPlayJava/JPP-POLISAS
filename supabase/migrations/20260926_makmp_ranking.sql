-- ============================================================================
-- Migration: 20260926_makmp_ranking.sql
-- Fitur: Ranking & Keputusan MAKMP (Top 1/2/3) + Finalize + Pemberitahuan Pemenang
--
-- 1. makmp_submission_awards: kolum ranking + finalize.
-- 2. makmp_editions: setting deadline upload info pemenang.
-- 3. makmp_submissions: info pemenang (status jemputan, no IC, foto passport).
-- ============================================================================

-- ── 1. makmp_submission_awards ──────────────────────────────────────────────
ALTER TABLE public.makmp_submission_awards
  ADD COLUMN IF NOT EXISTS final_rank    integer,
  ADD COLUMN IF NOT EXISTS rank_note     text,
  ADD COLUMN IF NOT EXISTS is_finalized  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS finalized_at  timestamp with time zone,
  ADD COLUMN IF NOT EXISTS finalized_by  uuid;

-- ── 2. makmp_editions ────────────────────────────────────────────────────────
ALTER TABLE public.makmp_editions
  ADD COLUMN IF NOT EXISTS winner_upload_deadline timestamp with time zone;

-- ── 3. makmp_submissions ─────────────────────────────────────────────────────
ALTER TABLE public.makmp_submissions
  ADD COLUMN IF NOT EXISTS winner_status    text,   -- 'DIJEMPUT' | 'TIDAK_TERPILIH' | NULL
  ADD COLUMN IF NOT EXISTS winner_ic_no     text,   -- no IC (teks sahaja, 12 digit)
  ADD COLUMN IF NOT EXISTS winner_photo_url text;   -- URL gambar passport (profile picture)

-- ── 4. Indeks ringan untuk query ranking ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_makmp_submission_awards_final_rank
  ON public.makmp_submission_awards (final_rank)
  WHERE final_rank IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_makmp_submission_awards_award_status
  ON public.makmp_submission_awards (award_id, status);
