-- Migration 53: PolyRider Rider Live Location
-- Adds rider_lat, rider_lng columns so riders can share their location
-- with students while job is ACCEPTED. Polled by student (no Realtime needed).

ALTER TABLE public.polyrider_jobs
  ADD COLUMN IF NOT EXISTS rider_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS rider_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS rider_location_updated_at TIMESTAMPTZ;

-- Index for quick lookup when student polls rider location
CREATE INDEX IF NOT EXISTS idx_polyrider_jobs_rider_location
  ON public.polyrider_jobs(id, rider_lat, rider_lng)
  WHERE status = 'ACCEPTED' AND rider_lat IS NOT NULL;
