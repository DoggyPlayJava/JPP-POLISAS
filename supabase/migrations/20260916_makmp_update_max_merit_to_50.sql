-- ============================================================================
-- Migrasi: MAKMP Kemaskini Had Maksimum Merit (max_merit)
-- Mengikut Matriks Rasmi MAKMP (5 Sijil x 10 Merit Antarabangsa = 50 Merit)
-- ============================================================================

-- 1. Kemaskini makmp_award_definitions (5 sijil -> 50 merit, 3 sijil -> 30 merit)
UPDATE public.makmp_award_definitions
SET max_merit = COALESCE(max_certificates, 5) * 10
WHERE max_merit < COALESCE(max_certificates, 5) * 10;

-- 2. Kemaskini makmp_categories
UPDATE public.makmp_categories
SET max_merit = COALESCE(max_certificates, 5) * 10
WHERE max_merit < COALESCE(max_certificates, 5) * 10;

-- 3. Set default column value kepada 50
ALTER TABLE public.makmp_award_definitions ALTER COLUMN max_merit SET DEFAULT 50;
ALTER TABLE public.makmp_categories ALTER COLUMN max_merit SET DEFAULT 50;
