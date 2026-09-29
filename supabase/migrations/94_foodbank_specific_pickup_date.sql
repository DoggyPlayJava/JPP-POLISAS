-- 94_foodbank_specific_pickup_date.sql
-- Add specific_pickup_date to foodbank_settings so admin can pin a single
-- launch-day pickup date (e.g. "Friday this week only") for the Food Bank.

ALTER TABLE public.foodbank_settings
  ADD COLUMN IF NOT EXISTS specific_pickup_date DATE;
