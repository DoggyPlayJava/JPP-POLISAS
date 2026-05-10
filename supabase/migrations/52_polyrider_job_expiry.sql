-- Migration 52: PolyRider Job Expiry
-- Adds expires_at column so PENDING jobs auto-expire after 15 minutes.
-- RLS-friendly: no auth changes needed. Frontend polls and cancels if expired.

-- 1. Add expires_at column
ALTER TABLE public.polyrider_jobs
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 2. Performance index — only on PENDING jobs (partial index)
CREATE INDEX IF NOT EXISTS idx_polyrider_jobs_expires_at
  ON public.polyrider_jobs(expires_at)
  WHERE status = 'PENDING';

-- 3. Trigger function: auto-set expires_at = NOW() + 15 min on new PENDING jobs
CREATE OR REPLACE FUNCTION set_polyrider_job_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set for new PENDING jobs that don't already have an expiry
  IF (TG_OP = 'INSERT') AND NEW.status = 'PENDING' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '15 minutes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any (idempotent)
DROP TRIGGER IF EXISTS trg_polyrider_job_expiry ON public.polyrider_jobs;

CREATE TRIGGER trg_polyrider_job_expiry
  BEFORE INSERT ON public.polyrider_jobs
  FOR EACH ROW EXECUTE FUNCTION set_polyrider_job_expiry();
