-- ============================================================
-- 20260623175000_fix_klk_residency_is_expired.sql
-- Enforce NOT NULL and DEFAULT false on is_expired column
-- ============================================================

-- 1. Ensure the default value is set to false
ALTER TABLE public.klk_student_residency ALTER COLUMN is_expired SET DEFAULT false;

-- 2. Clean up any remaining NULL values (precautionary)
UPDATE public.klk_student_residency SET is_expired = false WHERE is_expired IS NULL;

-- 3. Set NOT NULL constraint
ALTER TABLE public.klk_student_residency ALTER COLUMN is_expired SET NOT NULL;
