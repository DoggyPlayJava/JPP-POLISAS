-- Function to get authentication providers for a specific email
CREATE OR REPLACE FUNCTION get_auth_providers(p_email text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_providers text[];
BEGIN
  -- Get the array of providers from raw_app_meta_data
  -- For Google-only users, this will typically return '{google}'
  -- For Email users, this will return '{email}' or '{email, google}'
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(raw_app_meta_data->'providers')
    FROM auth.users
    WHERE email = p_email
  ) INTO v_providers;
  
  -- If user not found, return empty array
  IF v_providers IS NULL THEN
    v_providers := ARRAY[]::text[];
  END IF;

  RETURN v_providers;
END;
$$;
