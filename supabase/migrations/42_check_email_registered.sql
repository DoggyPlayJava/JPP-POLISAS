-- Function to check if an email is already registered
CREATE OR REPLACE FUNCTION check_email_registered(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Check auth.users directly to see if the email is already registered
  -- This helps prevent the "fake signup success" issue when users forget they used Google
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = p_email
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$;
