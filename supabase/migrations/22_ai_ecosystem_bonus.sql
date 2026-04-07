-- 1. Create Analytics Usage Logs Table
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    token_cost INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own logs (or system function)
CREATE POLICY "Users can insert own ai logs" 
ON public.ai_usage_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow Super Admins to view all logs
CREATE POLICY "Admins can view all ai logs"
ON public.ai_usage_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
    )
);

-- 2. Create Tier Requests Table
CREATE TABLE IF NOT EXISTS public.ai_tier_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_tier TEXT NOT NULL,
    requested_tier TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_tier_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own tier requests"
ON public.ai_tier_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tier requests"
ON public.ai_tier_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all tier requests"
ON public.ai_tier_requests FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
    )
);


-- 3. Create or replace RPC for upgrading/downgrading user's tier
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

    -- 4. Update the profile
    UPDATE profiles
    SET 
        subscription_tier = new_tier,
        ai_token_balance = new_balance,
        ai_token_last_reset = NOW()
    WHERE id = target_user_id;

    -- 5. Update ai_tier_requests if any pending is approved
    UPDATE ai_tier_requests
    SET 
        status = 'APPROVED',
        updated_at = NOW()
    WHERE user_id = target_user_id AND requested_tier = new_tier AND status = 'PENDING';

END;
$$;

-- 4. Update the existing spend_ai_tokens to include logging
DROP FUNCTION IF EXISTS spend_ai_tokens(TEXT);
CREATE OR REPLACE FUNCTION spend_ai_tokens(task_name TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_balance integer;
    task_cost integer;
    settings_record record;
BEGIN
    -- 1. Grab settings
    SELECT * INTO settings_record FROM system_settings WHERE key = 'ai_token_settings';
    
    -- 2. Determine cost
    task_cost := COALESCE((settings_record.value->'costs'->>task_name)::integer, 0);

    -- If cost is 0 or less, it's free, just allow it and skip deducting
    IF task_cost <= 0 THEN
        -- Still log free tasks if we want analytics, but costing 0
        INSERT INTO ai_usage_logs(user_id, task_name, token_cost) VALUES (auth.uid(), task_name, 0);
        RETURN true;
    END IF;

    -- 3. Check current balance
    SELECT ai_token_balance INTO user_balance FROM profiles WHERE id = auth.uid();

    IF user_balance >= task_cost THEN
        -- Deduct
        UPDATE profiles SET ai_token_balance = ai_token_balance - task_cost WHERE id = auth.uid();
        -- Log
        INSERT INTO ai_usage_logs(user_id, task_name, token_cost) VALUES (auth.uid(), task_name, task_cost);
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$;
