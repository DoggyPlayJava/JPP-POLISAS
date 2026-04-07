-- Insert default AI Pro rate limit settings
INSERT INTO public.system_settings (key, value)
VALUES ('ai_pro_rate_limit', '{"monthly_limit": 4}')
ON CONFLICT (key) DO NOTHING;

-- Add AI Pro usage tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ai_pro_monthly_usage int DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_pro_last_reset timestamptz DEFAULT now();

-- Create RPC for checking and tracking Pro usage
CREATE OR REPLACE FUNCTION public.track_ai_pro_usage(action text DEFAULT 'track')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_usage int;
  v_last_reset timestamptz;
  v_settings jsonb;
  v_monthly_limit int;
  v_status text;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read settings
  SELECT value INTO v_settings FROM public.system_settings WHERE key = 'ai_pro_rate_limit';
  v_monthly_limit := COALESCE((v_settings->>'monthly_limit')::int, 4);

  -- Read profile
  SELECT ai_pro_monthly_usage, ai_pro_last_reset
  INTO v_current_usage, v_last_reset
  FROM public.profiles 
  WHERE id = v_user_id;

  -- Default to 0 if null
  v_current_usage := COALESCE(v_current_usage, 0);

  -- 1. Check monthly reset logic (Reset if the month has changed)
  IF date_trunc('month', v_last_reset) < date_trunc('month', now()) THEN
    v_current_usage := 0;
    v_last_reset := now();
    IF action = 'track' THEN
       UPDATE public.profiles SET ai_pro_monthly_usage = 0, ai_pro_last_reset = v_last_reset WHERE id = v_user_id;
    END IF;
  END IF;

  -- 2. If 'check', just return current status
  IF action = 'check' THEN
    RETURN jsonb_build_object(
      'current_usage', v_current_usage,
      'monthly_limit', v_monthly_limit,
      'can_use', v_current_usage < v_monthly_limit
    );
  END IF;

  -- 3. If track, check if allowed
  IF v_current_usage >= v_monthly_limit THEN
    RAISE EXCEPTION 'PRO_QUOTA_EXCEEDED';
  END IF;

  -- 4. Increment usage
  v_current_usage := v_current_usage + 1;

  -- 5. Save update
  UPDATE public.profiles
  SET ai_pro_monthly_usage = v_current_usage,
      ai_pro_last_reset = v_last_reset
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
      'current_usage', v_current_usage,
      'monthly_limit', v_monthly_limit,
      'can_use', v_current_usage < v_monthly_limit
  );
END;
$$;
