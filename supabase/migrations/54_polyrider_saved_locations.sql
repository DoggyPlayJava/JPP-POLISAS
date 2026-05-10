-- Migration 54: PolyRider Saved Locations (Lokasi Kegemaran)
-- Allows students to save up to 5 favourite pickup/dropoff locations
-- for quick-tap reuse, similar to Grab's saved places.

CREATE TABLE IF NOT EXISTS public.polyrider_saved_locations (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT          NOT NULL,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- Enable RLS (WAJIB per DEV_GUIDELINE §15.4)
ALTER TABLE public.polyrider_saved_locations ENABLE ROW LEVEL SECURITY;

-- Single combined CRUD policy using (SELECT auth.uid()) per §15.1
CREATE POLICY "saved_locations_owner_crud" ON public.polyrider_saved_locations
  FOR ALL
  USING  (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- FK index (WAJIB per §15.4)
CREATE INDEX IF NOT EXISTS idx_polyrider_saved_locations_user
  ON public.polyrider_saved_locations(user_id);

-- Trigger: enforce max 5 saved locations per user
CREATE OR REPLACE FUNCTION check_saved_locations_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.polyrider_saved_locations
    WHERE user_id = NEW.user_id
  ) >= 5 THEN
    RAISE EXCEPTION 'Had maksimum 5 lokasi kegemaran telah dicapai.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_saved_locations_limit ON public.polyrider_saved_locations;

CREATE TRIGGER trg_saved_locations_limit
  BEFORE INSERT ON public.polyrider_saved_locations
  FOR EACH ROW EXECUTE FUNCTION check_saved_locations_limit();
