-- ==========================================
-- Migrasi: MAKMP Winner Notification Trigger
-- Bila winner_status submission bertukar ke 'DIJEMPUT' (finalize_makmp_award),
-- hantar webhook ke server endpoint /api/makmp-winner-notify untuk
-- in-app + push + EMAIL kepada pemenang (top 3).
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_makmp_winner_notify()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_api_base_url text;
  v_webhook_secret text;
  v_request_url text;
  v_headers jsonb;
  v_payload jsonb;
  v_request_id bigint;
  v_award_name text;
BEGIN
  -- Cuma notify bila winner_status betul-betul bertukar ke DIJEMPUT
  IF (NEW.winner_status IS DISTINCT FROM OLD.winner_status)
     AND NEW.winner_status = 'DIJEMPUT' THEN

    -- Dapatkan nama anugerah yang telah difinalize untuk submission ini
    SELECT d.name
      INTO v_award_name
    FROM public.makmp_submission_awards a
    JOIN public.makmp_award_definitions d ON d.id = a.award_id
    WHERE a.submission_id = NEW.id
      AND a.is_finalized = true
    ORDER BY a.finalized_at DESC
    LIMIT 1;

    SELECT COALESCE(value->>0, 'https://jpp.cipher-node.org')
      INTO v_api_base_url
    FROM public.system_settings
    WHERE key = 'api_base_url';

    SELECT COALESCE(value->>0, '5d7c0065dc7db16fc7f2f85f8d4b0957c07d2aa26eebe27a')
      INTO v_webhook_secret
    FROM public.system_settings
    WHERE key = 'webhook_secret';

    v_request_url := v_api_base_url || '/api/makmp-winner-notify';

    v_headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_webhook_secret
    );

    v_payload := jsonb_build_object(
      'recipientId', NEW.user_id,
      'submissionId', NEW.id,
      'fullName', NEW.full_name,
      'email', NEW.email,
      'matricNo', NEW.matric_no,
      'trackingCode', NEW.tracking_code,
      'awardName', v_award_name
    );

    SELECT http_post INTO v_request_id
    FROM net.http_post(v_request_url, v_payload, '{}'::jsonb, v_headers, 5000);

  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_makmp_winner_notify ON public.makmp_submissions;
CREATE TRIGGER trg_makmp_winner_notify
  AFTER UPDATE OF winner_status ON public.makmp_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_makmp_winner_notify();

GRANT EXECUTE ON FUNCTION public.handle_makmp_winner_notify() TO authenticated, service_role;
