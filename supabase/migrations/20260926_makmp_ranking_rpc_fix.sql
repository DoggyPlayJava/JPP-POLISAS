-- Fix: save_makmp_award_ranking — accumulate v_updated (bukan overwrite)
CREATE OR REPLACE FUNCTION public.save_makmp_award_ranking(
  p_pin text,
  p_award_definition_id uuid,
  p_ranking jsonb,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_pin public.makmp_jury_pins;
  v_entry jsonb;
  v_award_application_id uuid;
  v_rank integer;
  v_updated integer := 0;
  v_row_count integer;
BEGIN
  -- Authorization: pegawai (role) ATAU juri (PIN)
  IF v_uid IS NOT NULL THEN
    SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
    IF v_role NOT IN ('SUPER_ADMIN_JPP', 'JPP') THEN
      RETURN jsonb_build_object('success', false, 'message', 'Anda tiada kebenaran untuk melaras ranking.');
    END IF;
  ELSE
    v_pin := public._jury_authorize(p_pin);
    IF NOT public._jury_can_access_award_def(v_pin, p_award_definition_id) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Anda tiada akses ke anugerah ini.');
    END IF;
  END IF;

  -- Jangan laraskan ranking kalau dah finalized (mesti unlock dulu)
  IF EXISTS (
    SELECT 1 FROM public.makmp_submission_awards
    WHERE award_id = p_award_definition_id AND is_finalized = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'locked', true, 'message', 'Keputusan anugerah ini telah disahkan & dikunci.');
  END IF;

  IF jsonb_typeof(p_ranking) = 'array' THEN
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_ranking) LOOP
      v_award_application_id := (v_entry->>'award_application_id')::uuid;
      v_rank := (v_entry->>'rank')::integer;

      IF v_award_application_id IS NULL OR v_rank IS NULL THEN
        CONTINUE;
      END IF;

      UPDATE public.makmp_submission_awards
      SET final_rank = v_rank,
          rank_note  = COALESCE(p_note, rank_note)
      WHERE id = v_award_application_id
        AND award_id = p_award_definition_id;

      GET DIAGNOSTICS v_row_count = ROW_COUNT;
      v_updated := v_updated + v_row_count;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'updated', v_updated);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.save_makmp_award_ranking(text, uuid, jsonb, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
