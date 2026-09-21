-- ==========================================
-- Migrasi: MAKMP Status Change Notification Trigger
-- Bila status permohonan MAKMP berubah (MENUNGGU -> DALAM_SEMAKAN / DISAHKAN / DITOLAK),
-- hantar webhook ke server endpoint /api/makmp-notify yang akan buat
-- in-app notification + push notification kepada pelajar (user_id).
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_makmp_status_change_notify()
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
  v_title text;
  v_message text;
  v_request_id bigint;
BEGIN
  -- Cuma notify bila status betul-betul berubah DAN ada user_id (pelajar login).
  -- Pelajar public tanpa akaun (user_id NULL) tak boleh dapat push/in-app —
  -- mereka semak status via tracking code / WhatsApp link.
  IF (NEW.status IS DISTINCT FROM OLD.status) AND (NEW.user_id IS NOT NULL) THEN

    SELECT COALESCE(value->>0, 'https://jpp.cipher-node.org')
      INTO v_api_base_url
    FROM public.system_settings
    WHERE key = 'api_base_url';

    SELECT COALESCE(value->>0, 'f5e193c6de54ab1dde87f7990302b343a9055de6ed180e0e76cb777f2af9a748')
      INTO v_webhook_secret
    FROM public.system_settings
    WHERE key = 'webhook_secret';

    v_request_url := v_api_base_url || '/api/makmp-notify';

    -- Bina title + message ikut status baru
    CASE NEW.status
      WHEN 'DALAM_SEMAKAN' THEN
        v_title := '🔍 Permohonan MAKMP sedang disemak';
        v_message := 'Permohonan anda (' || NEW.tracking_code || ') kini sedang disemak oleh juri penilai.';
      WHEN 'DISAHKAN' THEN
        v_title := '🎉 Tahniah! Permohonan MAKMP anda disahkan';
        v_message := 'Permohonan anda (' || NEW.tracking_code || ') telah DISAHKAN. Merit terkumpul: ' || COALESCE(NEW.total_merit_awarded::text, '0') || ' merit.';
      WHEN 'DITOLAK' THEN
        v_title := '⚠️ Permohonan MAKMP anda ditolak';
        v_message := 'Permohonan anda (' || NEW.tracking_code || ') telah DITOLAK. Sila semak sebab penolakan di portal.';
      ELSE
        v_title := '📋 Status permohonan MAKMP dikemaskini';
        v_message := 'Status permohonan anda (' || NEW.tracking_code || ') kini: ' || NEW.status || '.';
    END CASE;

    v_headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_webhook_secret
    );

    v_payload := jsonb_build_object(
      'recipientId', NEW.user_id,
      'title', v_title,
      'message', v_message,
      'type', 'MAKMP',
      'link', '/makmp/status?code=' || NEW.tracking_code,
      'referenceId', NEW.id
    );

    SELECT http_post INTO v_request_id
    FROM net.http_post(v_request_url, v_payload, '{}'::jsonb, v_headers, 5000);

  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Jangan gagalkan UPDATE asal walaupun notif gagal
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_makmp_status_change_notify ON public.makmp_submissions;
CREATE TRIGGER trg_makmp_status_change_notify
  AFTER UPDATE OF status ON public.makmp_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_makmp_status_change_notify();

GRANT EXECUTE ON FUNCTION public.handle_makmp_status_change_notify() TO authenticated, service_role;
