-- Fix COALESCE text/timestamp mismatch in AI token RPCs.
-- Root cause: profiles.ai_last_reset / ai_token_last_reset are TEXT in the live DB,
-- but migration 24 assumes TIMESTAMPTZ. Cast to timestamptz before comparison.

BEGIN;

-- safety check
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles'
      AND column_name='ai_last_reset' AND data_type <> 'text'
  ) THEN
    RAISE EXCEPTION 'ai_last_reset is not text — aborting fix';
  END IF;
END $$;

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
  v_tier_exp timestamptz;
  v_token_last_reset timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT value INTO v_token_settings FROM system_settings WHERE key = 'ai_token_settings';
  SELECT value INTO v_rate_limit FROM system_settings WHERE key = 'ai_rate_limit';
  v_daily_limit := COALESCE((v_rate_limit->>'block_threshold')::int, 65);

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  v_status := COALESCE(v_profile.ai_status, 'active');
  v_daily_usage := COALESCE(v_profile.ai_daily_usage, 0);
  v_last_usage_reset := COALESCE(NULLIF(v_profile.ai_last_reset, '')::timestamptz, now() - INTERVAL '2 days');
  v_tier := COALESCE(v_profile.subscription_tier, 'free');
  v_tier_exp := NULLIF(v_profile.ai_tier_expiration, '')::timestamptz;

  IF v_tier_exp IS NOT NULL AND now() > v_tier_exp THEN
      v_tier := 'free';
      UPDATE public.profiles
      SET subscription_tier = 'free',
          ai_tier_expiration = NULL
      WHERE id = v_user_id;
      INSERT INTO public.notifications(user_id, title, content)
      VALUES (v_user_id, 'Langganan PRO Tamat ⏱️', 'Tempoh langganan 30 hari PRO Tier Nexus anda telah tamat. Profil anda telah dikembalikan kepada Free Tier namun baki token anda dikekalkan.');
  END IF;

  IF v_status = 'permanent_ban' THEN
    RAISE EXCEPTION 'Akses AI anda telah digantung secara kekal.';
  END IF;

  IF now() > v_last_usage_reset + INTERVAL '24 hours' THEN
    v_daily_usage := 0;
    v_status := 'active';
  END IF;

  IF v_status = 'flagged' AND now() <= v_last_usage_reset + INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Akses AI anda sedang digantung. Sila cuba lagi dalam 24 jam.';
  END IF;

  v_task_cost := COALESCE((v_token_settings->'costs'->>task_name)::int, 0);

  v_token_last_reset := COALESCE(NULLIF(v_profile.ai_token_last_reset, '')::timestamptz, now() - INTERVAL '2 months');

  IF date_trunc('month', v_token_last_reset AT TIME ZONE 'Asia/Kuala_Lumpur') < date_trunc('month', now() AT TIME ZONE 'Asia/Kuala_Lumpur') THEN
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
    v_tier_exp timestamptz;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN false; END IF;

    SELECT value INTO v_token_settings FROM public.system_settings WHERE key = 'ai_token_settings';
    SELECT value INTO v_rate_limit FROM system_settings WHERE key = 'ai_rate_limit';
    v_warning_threshold := COALESCE((v_rate_limit->>'warning_threshold')::int, 50);
    v_block_threshold := COALESCE((v_rate_limit->>'block_threshold')::int, 65);

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    v_daily_usage := COALESCE(v_profile.ai_daily_usage, 0);
    v_last_usage_reset := COALESCE(NULLIF(v_profile.ai_last_reset, '')::timestamptz, now() - INTERVAL '2 days');
    v_new_status := COALESCE(v_profile.ai_status, 'active');
    v_new_balance := COALESCE(v_profile.ai_token_balance, 0);
    v_token_last_reset := COALESCE(NULLIF(v_profile.ai_token_last_reset, '')::timestamptz, now() - INTERVAL '2 months');
    v_tier := COALESCE(v_profile.subscription_tier, 'free');
    v_tier_exp := NULLIF(v_profile.ai_tier_expiration, '')::timestamptz;

    IF v_tier_exp IS NOT NULL AND now() > v_tier_exp THEN
        v_tier := 'free';
    END IF;

    IF now() > v_last_usage_reset + INTERVAL '24 hours' THEN
        v_daily_usage := 0;
        v_new_status := 'active';
        v_last_usage_reset := now();
    END IF;

    IF date_trunc('month', v_token_last_reset AT TIME ZONE 'Asia/Kuala_Lumpur') < date_trunc('month', now() AT TIME ZONE 'Asia/Kuala_Lumpur') THEN
        IF v_tier = 'pro' THEN
          v_new_balance := COALESCE((v_token_settings->>'pro_tier_tokens')::int, 1000);
        ELSE
          v_new_balance := COALESCE((v_token_settings->>'free_tier_tokens')::int, 200);
        END IF;
        v_token_last_reset := now();
    END IF;

    v_task_cost := COALESCE((v_token_settings->'costs'->>task_name)::int, 0);

    IF v_task_cost > 0 THEN
       IF v_new_balance >= v_task_cost THEN
          v_new_balance := v_new_balance - v_task_cost;
       ELSE
          RETURN false;
       END IF;
    END IF;

    v_daily_usage := v_daily_usage + 1;
    IF v_daily_usage > v_block_threshold THEN
        v_new_status := 'flagged';
        INSERT INTO public.notifications (user_id, title, message)
        SELECT id, '🚨 Aktiviti Spam AI Dikesan', 'Pengguna ' || COALESCE(v_profile.full_name, v_profile.email) || ' melepasi had harian (' || v_block_threshold::text || '). Akaun digantung sementara.'
        FROM public.profiles WHERE role = 'SUPER_ADMIN_JPP';
    ELSIF v_daily_usage > v_warning_threshold AND v_new_status != 'flagged' THEN
        v_new_status := 'warned';
    END IF;

    IF v_tier = 'free' AND v_tier_exp IS NOT NULL AND now() > v_tier_exp THEN
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

    IF v_task_cost > 0 THEN
        INSERT INTO ai_usage_logs(user_id, task_name, token_cost)
        VALUES (v_user_id, task_name, v_task_cost);
    END IF;

    RETURN true;
END;
$function$;

COMMIT;
