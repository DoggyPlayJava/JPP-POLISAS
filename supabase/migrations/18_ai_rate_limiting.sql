-- Create system settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_settings' AND policyname = 'Everyone can read system_settings'
    ) THEN
        CREATE POLICY "Everyone can read system_settings"
        ON public.system_settings
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_settings' AND policyname = 'Admins can manage system_settings'
    ) THEN
        CREATE POLICY "Admins can manage system_settings" 
        ON public.system_settings 
        FOR ALL 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'SUPER_ADMIN_JPP'
          )
        );
    END IF;
END $$;

-- Insert default AI rate limit settings
INSERT INTO public.system_settings (key, value)
VALUES ('ai_rate_limit', '{"warning_threshold": 50, "block_threshold": 65}')
ON CONFLICT (key) DO NOTHING;

-- Add AI usage tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ai_daily_usage int DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_last_reset timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS ai_status text DEFAULT 'active';

-- Create RPC for tracking usage
CREATE OR REPLACE FUNCTION public.track_ai_usage()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_usage int;
  v_last_reset timestamptz;
  v_status text;
  v_settings jsonb;
  v_warning_threshold int;
  v_block_threshold int;
  v_new_status text;
  v_user_name text;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read settings
  SELECT value INTO v_settings FROM public.system_settings WHERE key = 'ai_rate_limit';
  v_warning_threshold := COALESCE((v_settings->>'warning_threshold')::int, 50);
  v_block_threshold := COALESCE((v_settings->>'block_threshold')::int, 65);

  -- Read profile
  SELECT ai_daily_usage, ai_last_reset, ai_status, full_name
  INTO v_current_usage, v_last_reset, v_status, v_user_name
  FROM public.profiles 
  WHERE id = v_user_id;

  -- 1. Check permanent ban
  IF v_status = 'permanent_ban' THEN
    RAISE EXCEPTION 'BANNED';
  END IF;

  -- 2. Check 24 hour reset logic
  IF now() > v_last_reset + INTERVAL '24 hours' THEN
    v_current_usage := 0;
    v_status := 'active';
    v_last_reset := now();
  END IF;

  -- 3. Check if currently blocked (flagged) and hasn't been reset yet
  IF v_status = 'flagged' THEN
    RAISE EXCEPTION 'BANNED';
  END IF;

  -- 4. Increment usage
  v_current_usage := COALESCE(v_current_usage, 0) + 1;
  v_new_status := v_status;

  -- 5. Check thresholds
  IF v_current_usage > v_block_threshold THEN
    v_new_status := 'flagged';
    
    -- Option: Send notification to SUPER_ADMIN_JPP
    INSERT INTO public.notifications (user_id, title, message)
    SELECT id, '🚨 Aktiviti Spam AI Dikesan', 'Akaun pengguna ' || COALESCE(v_user_name, 'Unknown') || ' melepasi nilai Block Threshold (' || v_block_threshold::text || ' requests). Akses digantung untuk 24 jam.'
    FROM public.profiles
    WHERE role = 'SUPER_ADMIN_JPP';

    -- Update the profile manually to 'flagged' before throwing error
    UPDATE public.profiles
    SET ai_daily_usage = v_current_usage,
        ai_last_reset = v_last_reset,
        ai_status = v_new_status
    WHERE id = v_user_id;
    
    RAISE EXCEPTION 'BANNED';
  ELSIF v_current_usage > v_warning_threshold THEN
    v_new_status := 'warned';
  END IF;

  -- 6. Save update
  UPDATE public.profiles
  SET ai_daily_usage = v_current_usage,
      ai_last_reset = v_last_reset,
      ai_status = v_new_status
  WHERE id = v_user_id;

  RETURN v_new_status;
END;
$$;
