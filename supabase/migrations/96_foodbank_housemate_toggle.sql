-- Migration 96: Buang fungsi "hari pelancaran" (specific_pickup_date)
-- dan tambah togol kuota rakan serumah (allow_housemate).
ALTER TABLE foodbank_settings DROP COLUMN IF EXISTS specific_pickup_date;
ALTER TABLE foodbank_settings ADD COLUMN IF NOT EXISTS allow_housemate boolean NOT NULL DEFAULT true;
