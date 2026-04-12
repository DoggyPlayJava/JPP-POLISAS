-- 34_staff_registration_code.sql

-- Insert default staff registration code as JSON string
INSERT INTO public.system_settings (key, value)
VALUES ('staff_registration_code', '"STAF-POLISAS"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create an RPC to securely verify the staff registration code
-- This prevents the client from needing to read the system_settings directly
CREATE OR REPLACE FUNCTION verify_staff_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actual_code text;
BEGIN
  -- Read the value as string from JSONB. Using #>>'{}' extracts the raw text from the top level JSON scalar.
  SELECT value#>>'{}' INTO v_actual_code
  FROM public.system_settings
  WHERE key = 'staff_registration_code';
  
  -- If setting doesn't exist, fallback to old hardcoded value (just in case)
  IF v_actual_code IS NULL THEN
    v_actual_code := 'STAF-POLISAS';
  END IF;

  RETURN p_code = v_actual_code;
END;
$$;
