-- Migration: 20260808_siswapreneur_ems_integration.sql
-- Add Siswapreneur integration columns to ems_events and keusahawanan_businesses

ALTER TABLE ems_events
ADD COLUMN IF NOT EXISTS is_siswapreneur boolean DEFAULT false;

ALTER TABLE keusahawanan_businesses
ADD COLUMN IF NOT EXISTS is_ems_siswapreneur boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ems_event_id uuid REFERENCES ems_events(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS puskep_upgrade_status text DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS archived_reason text DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_keusahawanan_biz_ems ON keusahawanan_businesses(ems_event_id, is_ems_siswapreneur);
