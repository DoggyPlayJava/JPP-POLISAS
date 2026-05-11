-- ============================================================
-- Migration 60: Keusahawanan Registration History & RPC Update
-- ============================================================

-- Add registration_history column to store past SSM/PUSKEP numbers
ALTER TABLE public.keusahawanan_businesses
ADD COLUMN IF NOT EXISTS registration_history JSONB DEFAULT '[]'::jsonb;

-- Update the PUSKEP generation RPC to include the year
-- Example: P-2026-001
CREATE OR REPLACE FUNCTION public.generate_puskep_reg_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_year TEXT;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  RETURN 'P-' || current_year || '-' || LPAD(nextval('puskep_reg_seq')::text, 3, '0');
END;
$function$;
