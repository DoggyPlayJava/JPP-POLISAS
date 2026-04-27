-- 39_track_google_api_tokens.sql
-- Atomically increments the real Google API token counter in system_settings.
-- Called from the frontend after every successful Gemini API response.

CREATE OR REPLACE FUNCTION public.increment_ai_google_tokens(tokens_used integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current bigint;
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read current value (may not exist yet)
  SELECT COALESCE(value::bigint, 0)
  INTO v_current
  FROM public.system_settings
  WHERE key = 'ai_total_tokens';

  IF FOUND THEN
    UPDATE public.system_settings
    SET value = (v_current + tokens_used)::text
    WHERE key = 'ai_total_tokens';
  ELSE
    INSERT INTO public.system_settings (key, value)
    VALUES ('ai_total_tokens', tokens_used::text);
  END IF;
END;
$$;

-- Grant to authenticated users (the counter is write-only for them)
GRANT EXECUTE ON FUNCTION public.increment_ai_google_tokens(integer) TO authenticated;
