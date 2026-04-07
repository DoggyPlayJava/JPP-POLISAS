-- 24_pro_tier_expiration_enforcer.sql

-- Update `check_ai_tokens` to automatically revoke PRO tier (without resetting tokens) if expired
CREATE OR REPLACE FUNCTION public.check_ai_tokens(task_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_profile record;
  v_token_settings jsonb;
  v_rate_limit jsonb;
  v_task_cost int;
  v_monthly_allowance int;
  v_daily_usage int;
  v_last_usage_reset timestamptz;
  v_can_afford boolean;
  v_daily_limit int;
  v_status text;
  v_tier text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Fetch settings
  SELECT value INTO v_token_settings FROM system_settings WHERE key = 'ai_token_settings';
  SELECT value INTO v_rate_limit FROM system_settings WHERE key = 'ai_rate_limit';
  v_daily_limit := COALESCE((v_rate_limit->>'block_threshold')::int, 65);

  -- 2. Fetch profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  v_status := COALESCE(v_profile.ai_status, 'active');
  v_daily_usage := COALESCE(v_profile.ai_daily_usage, 0);
  v_last_usage_reset := COALESCE(v_profile.ai_last_reset, now() - INTERVAL '2 days');
  v_tier := COALESCE(v_profile.subscription_tier, 'free');

  -- APPLY AUTO EXPIRE PRO TIER
  IF v_profile.ai_tier_expiration IS NOT NULL AND now() > v_profile.ai_tier_expiration THEN
      v_tier := 'free';
      UPDATE public.profiles 
      SET 
          subscription_tier = 'free',
          ai_tier_expiration = NULL
      WHERE id = v_user_id;

      INSERT INTO public.notifications(user_id, title, content)
      VALUES (v_user_id, 'Langganan PRO Tamat ⏱️', 'Tempoh langganan 30 hari PRO Tier Nexus anda telah tamat. Profil anda telah dikembalikan kepada Free Tier namun baki token anda dikekalkan.');
  END IF;

  -- 3. Block if Banned or currently Flagged
  IF v_status = 'permanent_ban' THEN
    RAISE EXCEPTION 'Akses AI anda telah digantung secara kekal.';
  END IF;

  -- 4. Check Daily Usage Reset (for logic check only)
  IF now() > v_last_usage_reset + INTERVAL '24 hours' THEN
    v_daily_usage := 0;
    v_status := 'active';
  END IF;

  IF v_status = 'flagged' AND now() <= v_last_usage_reset + INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Akses AI anda sedang digantung. Sila cuba lagi dalam 24 jam.';
  END IF;

  -- 5. Calculate Token Balance (with monthly reset logic)
  v_task_cost := COALESCE((v_token_settings->'costs'->>task_name)::int, 0);
  
  IF date_trunc('month', COALESCE(v_profile.ai_token_last_reset, now() - INTERVAL '2 months') AT TIME ZONE 'Asia/Kuala_Lumpur') < date_trunc('month', now() AT TIME ZONE 'Asia/Kuala_Lumpur') THEN
    IF v_tier = 'pro' THEN
      v_monthly_allowance := COALESCE((v_token_settings->>'pro_tier_tokens')::int, 1000);
    ELSE
      v_monthly_allowance := COALESCE((v_token_settings->>'free_tier_tokens')::int, 200);
    END IF;
  ELSE
    v_monthly_allowance := COALESCE(v_profile.ai_token_balance, 0);
  END IF;

  v_can_afford := (v_monthly_allowance >= v_task_cost);

  RETURN jsonb_build_object(
      'current_balance', v_monthly_allowance,
      'tier', v_tier,
      'task_cost', v_task_cost,
      'can_afford', v_can_afford,
      'daily_usage', v_daily_usage,
      'daily_limit', v_daily_limit,
      'status', v_status,
      'all_costs', v_token_settings->'costs'
  );
END;
$function$;


-- Update `spend_ai_tokens` to automatically revoke PRO tier (without resetting tokens) if expired
CREATE OR REPLACE FUNCTION public.spend_ai_tokens(task_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_profile record;
    v_token_settings jsonb;
    v_rate_limit jsonb;
    v_task_cost integer;
    v_daily_usage integer;
    v_last_usage_reset timestamptz;
    v_warning_threshold int;
    v_block_threshold int;
    v_new_status text;
    v_new_balance int;
    v_token_last_reset timestamptz;
    v_tier text;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN false; END IF;

    -- 1. Grab settings
    SELECT value INTO v_token_settings FROM public.system_settings WHERE key = 'ai_token_settings';
    SELECT value INTO v_rate_limit FROM system_settings WHERE key = 'ai_rate_limit';
    v_warning_threshold := COALESCE((v_rate_limit->>'warning_threshold')::int, 50);
    v_block_threshold := COALESCE((v_rate_limit->>'block_threshold')::int, 65);
    
    -- 2. Fetch profile
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    v_daily_usage := COALESCE(v_profile.ai_daily_usage, 0);
    v_last_usage_reset := COALESCE(v_profile.ai_last_reset, now() - INTERVAL '2 days');
    v_new_status := COALESCE(v_profile.ai_status, 'active');
    v_new_balance := COALESCE(v_profile.ai_token_balance, 0);
    v_token_last_reset := COALESCE(v_profile.ai_token_last_reset, now() - INTERVAL '2 months');
    v_tier := COALESCE(v_profile.subscription_tier, 'free');

    -- APPLY EXPIRE CHECK (Do not touch their balance though according to user rules)
    IF v_profile.ai_tier_expiration IS NOT NULL AND now() > v_profile.ai_tier_expiration THEN
        v_tier := 'free';
    END IF;

    -- 3. Check and apply daily safety reset
    IF now() > v_last_usage_reset + INTERVAL '24 hours' THEN
        v_daily_usage := 0;
        v_new_status := 'active';
        v_last_usage_reset := now();
    END IF;

    -- 4. Check and apply monthly token reset
    IF date_trunc('month', v_token_last_reset AT TIME ZONE 'Asia/Kuala_Lumpur') < date_trunc('month', now() AT TIME ZONE 'Asia/Kuala_Lumpur') THEN
        IF v_tier = 'pro' THEN
          v_new_balance := COALESCE((v_token_settings->>'pro_tier_tokens')::int, 1000);
        ELSE
          v_new_balance := COALESCE((v_token_settings->>'free_tier_tokens')::int, 200);
        END IF;
        v_token_last_reset := now();
    END IF;

    -- 5. Calculate Cost and Deduct
    v_task_cost := COALESCE((v_token_settings->'costs'->>task_name)::int, 0);
    
    IF v_task_cost > 0 THEN
       IF v_new_balance >= v_task_cost THEN
          v_new_balance := v_new_balance - v_task_cost;
       ELSE
          RETURN false;
       END IF;
    END IF;

    -- 6. Increment Anti-Spam Counter (Chat also counts as 1 interaction)
    v_daily_usage := v_daily_usage + 1;
    IF v_daily_usage > v_block_threshold THEN
        v_new_status := 'flagged';
        -- Notify Admin of spam
        INSERT INTO public.notifications (user_id, title, message)
        SELECT id, '🚨 Aktiviti Spam AI Dikesan', 'Pengguna ' || COALESCE(v_profile.full_name, v_profile.email) || ' melepasi had harian (' || v_block_threshold::text || '). Akaun digantung sementara.'
        FROM public.profiles WHERE role = 'SUPER_ADMIN_JPP';
    ELSIF v_daily_usage > v_warning_threshold AND v_new_status != 'flagged' THEN
        v_new_status := 'warned';
    END IF;

    -- 7. Performance Update
    IF v_tier = 'free' AND v_profile.ai_tier_expiration IS NOT NULL AND now() > v_profile.ai_tier_expiration THEN
        -- Strip out the expiration marker completely
        UPDATE profiles
        SET 
            ai_token_balance = v_new_balance,
            ai_token_last_reset = v_token_last_reset,
            ai_daily_usage = v_daily_usage,
            ai_last_reset = v_last_usage_reset,
            ai_status = v_new_status,
            subscription_tier = 'free',
            ai_tier_expiration = NULL
        WHERE id = v_user_id;

        INSERT INTO public.notifications(user_id, title, content)
        VALUES (v_user_id, 'Langganan PRO Tamat ⏱️', 'Tempoh langganan 30 hari PRO Tier Nexus anda telah tamat. Profil anda telah dikembalikan kepada Free Tier.');

    ELSE
        UPDATE profiles
        SET 
            ai_token_balance = v_new_balance,
            ai_token_last_reset = v_token_last_reset,
            ai_daily_usage = v_daily_usage,
            ai_last_reset = v_last_usage_reset,
            ai_status = v_new_status
        WHERE id = v_user_id;
    END IF;

    -- 8. Archive usage for Audit (Deep Analysis)
    IF v_task_cost > 0 THEN 
        INSERT INTO ai_usage_logs(user_id, task_name, token_cost) 
        VALUES (v_user_id, task_name, v_task_cost);
    END IF;

    RETURN true;
END;
$function$;
