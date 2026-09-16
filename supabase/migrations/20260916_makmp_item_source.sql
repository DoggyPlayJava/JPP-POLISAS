-- Migration: Add source and index to makmp_submission_items for e-Akademik certificate import
ALTER TABLE makmp_submission_items ADD COLUMN IF NOT EXISTS source text DEFAULT 'MANUAL_UPLOAD';
CREATE INDEX IF NOT EXISTS idx_makmp_sub_items_akademik_id ON makmp_submission_items(akademik_pencapaian_id);
