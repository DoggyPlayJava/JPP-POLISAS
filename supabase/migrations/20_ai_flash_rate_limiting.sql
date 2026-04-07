-- Insert default AI Flash rate limit settings (daily)
INSERT INTO public.system_settings (key, value)
VALUES ('ai_flash_rate_limit', '{"daily_limit": 3}')
ON CONFLICT (key) DO NOTHING;

-- Add AI Flash usage tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ai_flash_daily_usage int DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_flash_last_reset timestamptz DEFAULT now();

-- Create RPC for checking and tracking Flash usage
CREATE OR REPLACE FUNCTION public.track_ai_flash_usage(action text DEFAULT 'track')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_usage int;
  v_last_reset timestamptz;
  v_settings jsonb;
  v_daily_limit int;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read settings
  SELECT value INTO v_settings FROM public.system_settings WHERE key = 'ai_flash_rate_limit';
  v_daily_limit := COALESCE((v_settings->>'daily_limit')::int, 3);

  -- Read profile
  SELECT ai_flash_daily_usage, ai_flash_last_reset
  INTO v_current_usage, v_last_reset
  FROM public.profiles 
  WHERE id = v_user_id;

  -- Default to 0 if null
  v_current_usage := COALESCE(v_current_usage, 0);

  -- 1. Check daily reset logic (Reset if 24 hours have passed or if the day has changed)
  -- To be safer, we reset if it's a different calendar day:
  IF date_trunc('day', v_last_reset AT TIME ZONE 'Asia/Kuala_Lumpur') < date_trunc('day', now() AT TIME ZONE 'Asia/Kuala_Lumpur') THEN
    v_current_usage := 0;
    v_last_reset := now();
    IF action = 'track' THEN
       UPDATE public.profiles SET ai_flash_daily_usage = 0, ai_flash_last_reset = v_last_reset WHERE id = v_user_id;
    END IF;
  END IF;

  -- 2. If 'check', just return current status
  IF action = 'check' THEN
    RETURN jsonb_build_object(
      'current_usage', v_current_usage,
      'daily_limit', v_daily_limit,
      'can_use', v_current_usage < v_daily_limit
    );
  END IF;

  -- 3. If track, check if allowed
  IF v_current_usage >= v_daily_limit THEN
    RAISE EXCEPTION 'FLASH_QUOTA_EXCEEDED';
  END IF;

  -- 4. Increment usage
  v_current_usage := v_current_usage + 1;

  -- 5. Save update
  UPDATE public.profiles
  SET ai_flash_daily_usage = v_current_usage,
      ai_flash_last_reset = v_last_reset
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
      'current_usage', v_current_usage,
      'daily_limit', v_daily_limit,
      'can_use', v_current_usage < v_daily_limit
  );
END;
$$;
