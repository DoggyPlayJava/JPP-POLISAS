-- Migration: 20260803_ems_hierarchical_rubrics.sql
-- Add hierarchical category, section, and 5-point Likert descriptors to ems_rubrics

ALTER TABLE ems_rubrics
ADD COLUMN IF NOT EXISTS category_name text DEFAULT 'Umum',
ADD COLUMN IF NOT EXISTS section_name text DEFAULT 'Penilaian Utama',
ADD COLUMN IF NOT EXISTS descriptors jsonb DEFAULT '{"1": "Sangat Lemah", "2": "Lemah", "3": "Sederhana", "4": "Baik", "5": "Cemerlang"}'::jsonb;

-- Add index for efficient filtering by event, category, and section
CREATE INDEX IF NOT EXISTS idx_ems_rubrics_event_cat_sec 
ON ems_rubrics (event_id, category_name, section_name);
