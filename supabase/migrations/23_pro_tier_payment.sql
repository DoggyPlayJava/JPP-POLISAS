-- 23_pro_tier_payment.sql

-- 1. Add ai_tier_expiration to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ai_tier_expiration timestamptz DEFAULT NULL;

-- 2. Add receipt_url to ai_tier_requests
ALTER TABLE public.ai_tier_requests
ADD COLUMN IF NOT EXISTS receipt_url text DEFAULT NULL;

-- 3. Update the RPC for upgrading/downgrading user's tier
CREATE OR REPLACE FUNCTION update_user_ai_tier(target_user_id UUID, new_tier TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role text;
    settings_record record;
    new_balance integer;
BEGIN
    -- 1. Check if caller is admin
    SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
    IF caller_role NOT IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP') THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya admin yang boleh membuat perubahan AI Tier.';
    END IF;

    -- 2. Validate tier
    IF new_tier NOT IN ('free', 'pro', 'admin') THEN
        RAISE EXCEPTION 'Pilihan tier tidak sah. Sila gunakan "free", "pro", atau "admin".';
    END IF;

    -- 3. Calculate initial token supply for the new tier
    SELECT * INTO settings_record FROM system_settings WHERE key = 'ai_token_settings';
    
    IF new_tier = 'pro' THEN
        new_balance := COALESCE((settings_record.value->>'pro_tier_tokens')::integer, 1000);
    ELSIF new_tier = 'free' THEN
        new_balance := COALESCE((settings_record.value->>'free_tier_tokens')::integer, 200);
    ELSE
        -- Default for admin etc
        new_balance := COALESCE((settings_record.value->>'pro_tier_tokens')::integer, 1000);
    END IF;

    -- 4. Update the profile with expiration logic
    IF new_tier = 'pro' THEN
        UPDATE profiles
        SET 
            subscription_tier = new_tier,
            ai_token_balance = LEAST(COALESCE(ai_token_balance, 0) + new_balance, 2000),
            ai_token_last_reset = NOW(),
            ai_tier_expiration = NOW() + interval '30 days'
        WHERE id = target_user_id;
    ELSE
        UPDATE profiles
        SET 
            subscription_tier = new_tier,
            ai_token_balance = LEAST(COALESCE(ai_token_balance, 0) + new_balance, 2000),
            ai_token_last_reset = NOW(),
            ai_tier_expiration = NULL
        WHERE id = target_user_id;
    END IF;

    -- 5. Update ai_tier_requests if any pending is approved
    UPDATE ai_tier_requests
    SET 
        status = 'APPROVED',
        updated_at = NOW()
    WHERE user_id = target_user_id AND requested_tier = new_tier AND status = 'PENDING';

END;
$$;
