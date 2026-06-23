-- Migration: Add PolySuara Upvote Trigger and Periodic Cron
-- Description: Adds an AFTER UPDATE trigger on polysuara_confessions to notify on upvote changes, and registers a periodic pg_cron job to perform 3-hour fallback checks.

-- 1. Create the UPDATE trigger function
CREATE OR REPLACE FUNCTION public.handle_polysuara_confession_update()
RETURNS TRIGGER AS $$
DECLARE
  v_api_base_url text;
  v_webhook_secret text;
  v_request_url text;
  v_headers jsonb;
  v_payload jsonb;
  v_request_id bigint;
BEGIN
  -- Only trigger if upvotes increased
  IF NEW.upvotes IS DISTINCT FROM OLD.upvotes AND NEW.upvotes > OLD.upvotes THEN
    -- Fetch configurations from system_settings
    SELECT COALESCE(value->>0, 'https://api.cipher-node.org') INTO v_api_base_url 
    FROM public.system_settings 
    WHERE key = 'api_base_url';
    
    SELECT COALESCE(value->>0, 'f5e193c6de54ab1dde87f7990302b343a9055de6ed180e0e76cb777f2af9a748') INTO v_webhook_secret 
    FROM public.system_settings 
    WHERE key = 'webhook_secret';

    v_request_url := v_api_base_url || '/api/polysuara-new-confession-notify';
    
    v_headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_webhook_secret
    );

    v_payload := jsonb_build_object(
      'type', 'UPVOTE_MILESTONE',
      'table', 'polysuara_confessions',
      'schema', 'public',
      'record', row_to_json(NEW)
    );

    -- Perform asynchronous HTTP POST request using pg_net
    SELECT http_post INTO v_request_id 
    FROM net.http_post(
      v_request_url,
      v_payload,
      '{}'::jsonb, -- params
      v_headers,
      5000 -- timeout_ms
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on UPDATE of upvotes
DROP TRIGGER IF EXISTS trg_polysuara_confession_update ON public.polysuara_confessions;
CREATE TRIGGER trg_polysuara_confession_update
AFTER UPDATE OF upvotes ON public.polysuara_confessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_polysuara_confession_update();

-- 3. Register pg_cron job for periodic 3-hour fallback checks (runs every 30 minutes)
-- First unschedule if exists to prevent duplicates
SELECT cron.unschedule('polysuara-periodic-notify-check') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'polysuara-periodic-notify-check'
);

SELECT cron.schedule(
  'polysuara-periodic-notify-check',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT COALESCE(value->>0, 'https://api.cipher-node.org') FROM public.system_settings WHERE key = 'api_base_url') || '/api/polysuara-new-confession-notify',
    body := '{"type": "INSERT"}'::jsonb,
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', (SELECT COALESCE(value->>0, 'f5e193c6de54ab1dde87f7990302b343a9055de6ed180e0e76cb777f2af9a748') FROM public.system_settings WHERE key = 'webhook_secret')
    ),
    timeout_ms := 5000
  );
  $$
);
