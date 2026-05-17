-- Migration: Add auto-archive capability to PolySuara confessions

ALTER TABLE public.polysuara_confessions
ADD COLUMN is_archived BOOLEAN DEFAULT false;

-- Create an index to speed up the cron job and frontend queries
CREATE INDEX idx_polysuara_is_archived ON public.polysuara_confessions(is_archived);

-- Schedule a cron job to auto-archive confessions older than 6 months
-- Runs every day at midnight (00:00)
SELECT cron.schedule(
  'archive_old_polysuara',
  '0 0 * * *',
  $$
    UPDATE public.polysuara_confessions 
    SET is_archived = true 
    WHERE created_at < NOW() - INTERVAL '6 months' 
    AND is_archived = false;
  $$
);
