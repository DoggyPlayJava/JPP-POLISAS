-- Migration: 100_add_preferred_language_to_profiles.sql
-- Adds preferred_language column to profiles table for cross-device i18n synchronization

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT NULL 
CHECK (preferred_language IS NULL OR preferred_language IN ('en', 'ms'));

COMMENT ON COLUMN profiles.preferred_language IS 'User preferred interface language (en = English, ms = Bahasa Melayu)';
