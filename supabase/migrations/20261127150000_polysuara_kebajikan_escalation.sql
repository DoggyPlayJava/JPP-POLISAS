-- Migration: PolySuara -> e-Kebajikan 2-Layer Zero-PII Escalation
-- Date: 2026-11-27
-- Safety:
--   1) NEVER copies polysuara_confessions.author_id into kebajikan_tickets.submitter_id
--   2) Always uses (SELECT auth.uid()) (init-plan friendly for 1,500 concurrent users)
--   3) Every new FK column has a corresponding index
--   4) Row-level FOR UPDATE lock + partial UNIQUE index prevents duplicate escalations
--   5) Denormalizes escalated_ticket_no onto polysuara_confessions so public feed cards
--      show #EK-XXXX without opening SELECT RLS on kebajikan_tickets

-- 1. Extend kebajikan_tickets with anonymity flag & confession back-reference
ALTER TABLE public.kebajikan_tickets
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_confession_id UUID REFERENCES public.polysuara_confessions(id) ON DELETE SET NULL;

-- Partial unique index acts as both FK index and race-proof deduplication guard
CREATE UNIQUE INDEX IF NOT EXISTS idx_kebajikan_tickets_source_confession_id
  ON public.kebajikan_tickets(source_confession_id)
  WHERE source_confession_id IS NOT NULL;

-- 2. Extend polysuara_confessions with public ticket reference & FK
ALTER TABLE public.polysuara_confessions
  ADD COLUMN IF NOT EXISTS escalated_ticket_id UUID REFERENCES public.kebajikan_tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS escalated_ticket_no TEXT;

CREATE INDEX IF NOT EXISTS idx_polysuara_confessions_escalated_ticket_id
  ON public.polysuara_confessions(escalated_ticket_id)
  WHERE escalated_ticket_id IS NOT NULL;

-- 3. Atomic Zero-PII Escalation RPC (JPP Admin only)
CREATE OR REPLACE FUNCTION public.escalate_polysuara_to_kebajikan(
  p_confession_id UUID,
  p_category TEXT,
  p_priority TEXT DEFAULT 'NORMAL',
  p_title TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_conf RECORD;
  v_existing RECORD;
  v_category TEXT := UPPER(TRIM(COALESCE(p_category, 'LAIN_LAIN')));
  v_priority TEXT := UPPER(TRIM(COALESCE(p_priority, 'NORMAL')));
  v_handled_by_unit TEXT;
  v_clean_content TEXT;
  v_title TEXT;
  v_anon_name TEXT;
  v_image_urls TEXT[];
  v_ticket_id UUID;
  v_ticket_no TEXT;
  v_reply_addition TEXT;
  v_next_reply TEXT;
BEGIN
  IF v_actor_id IS NULL OR NOT public.is_jpp_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Unauthorized: JPP admin access required';
  END IF;

  IF v_category NOT IN ('FASILITI_JABATAN', 'FASILITI_SUKAN', 'KAFETERIA', 'WIFI_KAMSIS', 'LAIN_LAIN') THEN
    RAISE EXCEPTION 'Invalid kebajikan category: %', v_category;
  END IF;

  IF v_priority NOT IN ('LOW', 'NORMAL', 'HIGH', 'URGENT') THEN
    RAISE EXCEPTION 'Invalid kebajikan priority: %', v_priority;
  END IF;

  -- Lock confession row to eliminate double-escalation races under high concurrency
  SELECT
    id,
    author_id,
    content,
    category,
    codename,
    image_url,
    official_reply,
    escalated_ticket_id,
    escalated_ticket_no
  INTO v_conf
  FROM public.polysuara_confessions
  WHERE id = p_confession_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Confession not found';
  END IF;

  -- Idempotent guard: return existing ticket metadata if already escalated
  SELECT id, ticket_no, handled_by_unit
  INTO v_existing
  FROM public.kebajikan_tickets
  WHERE source_confession_id = p_confession_id
     OR (v_conf.escalated_ticket_id IS NOT NULL AND id = v_conf.escalated_ticket_id)
  LIMIT 1;

  IF FOUND THEN
    IF v_conf.escalated_ticket_id IS NULL OR v_conf.escalated_ticket_no IS NULL THEN
      UPDATE public.polysuara_confessions
      SET
        escalated_ticket_id = v_existing.id,
        escalated_ticket_no = v_existing.ticket_no
      WHERE id = p_confession_id;
    END IF;

    RETURN jsonb_build_object(
      'ticket_id', v_existing.id,
      'ticket_no', v_existing.ticket_no,
      'handled_by_unit', v_existing.handled_by_unit,
      'already_escalated', true
    );
  END IF;

  v_handled_by_unit := CASE WHEN v_category = 'KAFETERIA' THEN 'KK' ELSE 'KEBAJIKAN' END;
  v_clean_content := TRIM(regexp_replace(COALESCE(v_conf.content, ''), '\[spoiler-img\]', '', 'gi'));

  IF p_title IS NOT NULL AND length(TRIM(p_title)) > 0 THEN
    v_title := LEFT(TRIM(p_title), 120);
  ELSE
    v_title := LEFT(COALESCE(NULLIF(v_clean_content, ''), 'Aduan Pelajar (PolySuara)'), 100);
  END IF;

  v_anon_name := 'Pelajar Anon · ' || COALESCE(NULLIF(TRIM(v_conf.codename), ''), 'PolySuara');
  v_image_urls := CASE
    WHEN v_conf.image_url IS NOT NULL AND length(TRIM(v_conf.image_url)) > 0
      THEN ARRAY[TRIM(v_conf.image_url)]
    ELSE '{}'::text[]
  END;

  -- ZERO PII INSERT: submitter_id, matric_no, phone, class, gender are strictly NULL
  INSERT INTO public.kebajikan_tickets (
    submitter_id,
    full_name,
    gender,
    matric_no,
    phone,
    class,
    category,
    handled_by_unit,
    title,
    description,
    form_data,
    image_urls,
    status,
    priority,
    is_anonymous,
    source_confession_id
  )
  VALUES (
    NULL,
    v_anon_name,
    NULL,
    NULL,
    NULL,
    NULL,
    v_category,
    v_handled_by_unit,
    v_title,
    COALESCE(NULLIF(v_clean_content, ''), v_title),
    jsonb_build_object(
      'sumber', 'PolySuara (Eskalasi Anon JPP)',
      'nama_samaran', COALESCE(NULLIF(TRIM(v_conf.codename), ''), 'Pelajar Anon'),
      'kategori_asal', COALESCE(v_conf.category, 'UMUM'),
      'nota_eskalasi', COALESCE(NULLIF(TRIM(p_note), ''), 'Dieskalasi oleh JPP untuk tindakan rasmi.')
    ),
    v_image_urls,
    'NEW',
    v_priority,
    true,
    v_conf.id
  )
  RETURNING id, ticket_no INTO v_ticket_id, v_ticket_no;

  v_reply_addition := 'Aduan ini telah dieskalasi secara rasmi ke e-Kebajikan (**' || v_ticket_no || '**) untuk tindakan lanjut tanpa mendedahkan identiti pengarang.' ||
    CASE
      WHEN p_note IS NOT NULL AND length(TRIM(p_note)) > 0
        THEN E'\n\nNota JPP: ' || TRIM(p_note)
      ELSE ''
    END;

  v_next_reply := CASE
    WHEN v_conf.official_reply IS NOT NULL AND length(TRIM(v_conf.official_reply)) > 0
      THEN TRIM(v_conf.official_reply) || E'\n\n---\n' || v_reply_addition
    ELSE v_reply_addition
  END;

  UPDATE public.polysuara_confessions
  SET
    escalated_ticket_id = v_ticket_id,
    escalated_ticket_no = v_ticket_no,
    status = 'INVESTIGATING',
    official_reply = v_next_reply,
    official_reply_at = NOW(),
    replied_by = v_actor_id
  WHERE id = v_conf.id;

  -- Blind author notification: uses v_conf.author_id strictly inside DB, NEVER exposed to caller
  IF v_conf.author_id IS NOT NULL THEN
    PERFORM public.send_polysuara_interaction_notification(
      v_conf.author_id,
      '🛡️ Aduan Dibuka di e-Kebajikan',
      'Luahan anda telah dieskalasi oleh JPP sebagai tiket rasmi ' || v_ticket_no || ' (identiti kekal 100% rahsia).',
      'ESCALATED',
      '/polysuara?post=' || v_conf.id,
      v_conf.id
    );
  END IF;

  RETURN jsonb_build_object(
    'ticket_id', v_ticket_id,
    'ticket_no', v_ticket_no,
    'handled_by_unit', v_handled_by_unit,
    'already_escalated', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.escalate_polysuara_to_kebajikan(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escalate_polysuara_to_kebajikan(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 4. Automatic Status & Resolution Sync Trigger (e-Kebajikan -> PolySuara)
CREATE OR REPLACE FUNCTION public.sync_kebajikan_resolution_to_polysuara()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conf RECORD;
  v_resolution_line TEXT;
  v_updated_reply TEXT;
BEGIN
  IF NEW.source_confession_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, author_id, status, official_reply
  INTO v_conf
  FROM public.polysuara_confessions
  WHERE id = NEW.source_confession_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('RESOLVED', 'CLOSED') THEN
    v_resolution_line := '✅ Kemas kini e-Kebajikan (**' || NEW.ticket_no || '**): Aduan telah diselesaikan.' ||
      CASE
        WHEN NEW.resolution_note IS NOT NULL AND length(TRIM(NEW.resolution_note)) > 0
          THEN E'\n' || TRIM(NEW.resolution_note)
        ELSE ''
      END;

    v_updated_reply := CASE
      WHEN v_conf.official_reply IS NOT NULL AND position(v_resolution_line in v_conf.official_reply) > 0
        THEN v_conf.official_reply
      WHEN v_conf.official_reply IS NOT NULL AND length(TRIM(v_conf.official_reply)) > 0
        THEN TRIM(v_conf.official_reply) || E'\n\n---\n' || v_resolution_line
      ELSE v_resolution_line
    END;

    UPDATE public.polysuara_confessions
    SET
      status = 'RESOLVED',
      official_reply = v_updated_reply,
      official_reply_at = NOW()
    WHERE id = v_conf.id;

    IF OLD.status NOT IN ('RESOLVED', 'CLOSED') AND v_conf.author_id IS NOT NULL THEN
      PERFORM public.send_polysuara_interaction_notification(
        v_conf.author_id,
        '✅ Aduan Selesai (' || NEW.ticket_no || ')',
        'Tiket e-Kebajikan daripada luahan PolySuara anda telah ditandakan selesai.',
        'RESOLVED',
        '/polysuara?post=' || v_conf.id,
        v_conf.id
      );
    END IF;
  ELSIF NEW.status IN ('IN_PROGRESS', 'DELEGATED', 'PENDING_EXTERNAL', 'ESCALATED')
        AND COALESCE(v_conf.status, '') <> 'RESOLVED' THEN
    UPDATE public.polysuara_confessions
    SET status = 'INVESTIGATING'
    WHERE id = v_conf.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block ticket workflow updates if notification/sync encounters transient issues
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kebajikan_resolution_to_polysuara ON public.kebajikan_tickets;
CREATE TRIGGER trg_sync_kebajikan_resolution_to_polysuara
  AFTER UPDATE OF status, resolution_note ON public.kebajikan_tickets
  FOR EACH ROW
  WHEN (
    NEW.source_confession_id IS NOT NULL
    AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.resolution_note IS DISTINCT FROM NEW.resolution_note)
  )
  EXECUTE FUNCTION public.sync_kebajikan_resolution_to_polysuara();
