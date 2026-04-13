-- 21_ai_token_economy.sql
-- Drop old specific rate limit columns
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS ai_pro_monthly_usage,
DROP COLUMN IF EXISTS ai_pro_last_reset,
DROP COLUMN IF EXISTS ai_flash_daily_usage,
DROP COLUMN IF EXISTS ai_flash_last_reset;

-- Add new token economy columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS ai_token_balance int DEFAULT 200,
ADD COLUMN IF NOT EXISTS ai_token_last_reset timestamptz DEFAULT now();

-- Clean up old settings
DELETE FROM public.system_settings WHERE key IN ('ai_pro_rate_limit', 'ai_flash_rate_limit');

-- Insert default economy config
INSERT INTO public.system_settings (key, value)
VALUES ('ai_token_settings', '{
  "free_tier_tokens": 200,
  "pro_tier_tokens": 1000,
  "costs": {
    "pro_kertas_kerja": 50,
    "flash_kertas_kerja": 20,
    "semak_ejaan": 0,
    "analisis": 5
  }
}')
ON CONFLICT (key) DO NOTHING;

-- RPC to spend tokens dynamically based on task
CREATE OR REPLACE FUNCTION public.spend_ai_tokens(task_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_balance int;
  v_last_reset timestamptz;
  v_tier text;
  v_settings jsonb;
  v_costs jsonb;
  v_task_cost int;
  v_monthly_allowance int;
BEGIN
  -- 1. Identify User
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Fetch System Configuration
  SELECT value INTO v_settings FROM public.system_settings WHERE key = 'ai_token_settings';
  v_costs := v_settings->'costs';
  
  -- Determine cost
  v_task_cost := COALESCE((v_costs->>task_name)::int, 0);

  -- Optimization: If cost is 0, just return success immediately without modifying balance
  IF v_task_cost <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'cost', 0,
      'remaining', -1,
      'message', 'Free service'
    );
  END IF;

  -- 3. Fetch User Profile
  SELECT ai_token_balance, ai_token_last_reset, subscription_tier
  INTO v_balance, v_last_reset, v_tier
  FROM public.profiles 
  WHERE id = v_user_id;

  v_balance := COALESCE(v_balance, 0);
  v_tier := COALESCE(v_tier, 'free');
  v_last_reset := COALESCE(v_last_reset, now() - interval '2 months'); -- default old past to force reset if null

  -- Determine Monthly Allowance based on Tier
  IF v_tier = 'pro' THEN
    v_monthly_allowance := COALESCE((v_settings->>'pro_tier_tokens')::int, 1000);
  ELSE
    v_monthly_allowance := COALESCE((v_settings->>'free_tier_tokens')::int, 200);
  END IF;

  -- 4. Check Monthly Reset Logic
  -- If the last reset was in a previous calendar month, add the allowance (carry forward) up to 2000 max
  IF date_trunc('month', v_last_reset AT TIME ZONE 'Asia/Kuala_Lumpur') < date_trunc('month', now() AT TIME ZONE 'Asia/Kuala_Lumpur') THEN
    v_balance := LEAST(v_balance + v_monthly_allowance, 2000);
    v_last_reset := now();
  END IF;

  -- 5. Deduct Balance
  IF v_balance < v_task_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_TOKENS';
  END IF;

  v_balance := v_balance - v_task_cost;

  -- 6. Apply to DB
  UPDATE public.profiles
  SET ai_token_balance = v_balance,
      ai_token_last_reset = v_last_reset
  WHERE id = v_user_id;

  -- Return state
  RETURN jsonb_build_object(
      'success', true,
      'cost', v_task_cost,
      'remaining', v_balance,
      'tier', v_tier,
      'monthly_allowance', v_monthly_allowance
  );
END;
$$;
