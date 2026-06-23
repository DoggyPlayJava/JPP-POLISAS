-- Migration: Create PolySuara Webhook Trigger
-- Description: Adds a PostgreSQL trigger to public.polysuara_confessions that asynchronously invokes the Node.js Express webhook (/api/polysuara-new-confession-notify) on INSERT using the pg_net extension.

-- 1. Add config defaults to system_settings if they don't exist
INSERT INTO public.system_settings (key, value)
VALUES 
  ('api_base_url', '"https://api.cipher-node.org"'),
  ('webhook_secret', '"f5e193c6de54ab1dde87f7990302b343a9055de6ed180e0e76cb777f2af9a748"')
ON CONFLICT (key) DO NOTHING;

-- 2. Create the webhook function
CREATE OR REPLACE FUNCTION public.handle_polysuara_new_confession_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_api_base_url text;
  v_webhook_secret text;
  v_request_url text;
  v_headers jsonb;
  v_payload jsonb;
  v_request_id bigint;
BEGIN
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
    'type', 'INSERT',
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

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the user confession insertion if the notification webhook fails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger on INSERT
DROP TRIGGER IF EXISTS trg_polysuara_new_confession_notify ON public.polysuara_confessions;
CREATE TRIGGER trg_polysuara_new_confession_notify
AFTER INSERT ON public.polysuara_confessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_polysuara_new_confession_insert();
