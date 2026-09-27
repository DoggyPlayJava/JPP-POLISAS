-- ============================================================================
-- RPC: Ranking & Keputusan MAKMP
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. get_makmp_award_ranking(p_award_definition_id)
--    Return ranking peserta bagi SATU anugerah (definition), susun ikut
--    final_rank (jika ada) ATAU total_merit_granted DESC.
--    Boleh dipanggil oleh juri (PIN) atau pegawai (role).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_makmp_award_ranking(
  p_award_definition_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(entry ORDER BY entry->>'rank_pos'), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      to_jsonb(a.*)
      || jsonb_build_object(
        'submission', (SELECT to_jsonb(s.*) FROM public.makmp_submissions s WHERE s.id = a.submission_id),
        'rank_pos', ROW_NUMBER() OVER (
          ORDER BY
            COALESCE(a.final_rank, 999999),
            a.total_merit_granted DESC NULLS LAST,
            a.created_at ASC
        ),
        'display_rank', COALESCE(a.final_rank, ROW_NUMBER() OVER (
          ORDER BY a.total_merit_granted DESC NULLS LAST, a.created_at ASC
        ))
      ) AS entry
    FROM public.makmp_submission_awards a
    WHERE a.award_id = p_award_definition_id
  ) x;

  RETURN v_result;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. save_makmp_award_ranking(p_award_definition_id, p_ranking jsonb)
--    Simpan laras ranking manual. p_ranking = array of {award_application_id, rank}.
--    Set final_rank pada makmp_submission_awards.
--    Authorization: juri (PIN) atau pegawai (SUPER_ADMIN_JPP/JPP).
-- ─────────────────────────────────────────────────────────────────────────────
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
BEGIN
  -- Authorization: pegawai (role) ATAU juri (PIN)
  IF v_uid IS NOT NULL THEN
    SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
    IF v_role NOT IN ('SUPER_ADMIN_JPP', 'JPP') THEN
      RETURN jsonb_build_object('success', false, 'message', 'Anda tiada kebenaran untuk melaras ranking.');
    END IF;
  ELSE
    v_pin := public._jury_authorize(p_pin);
    -- pastikan juri boleh akses anugerah ini
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

      GET DIAGNOSTICS v_updated = ROW_COUNT;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'updated', v_updated);
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. finalize_makmp_award(p_award_definition_id)
--    Sahkan & kunci keputusan anugerah. Set is_finalized = true dan set
--    winner_status pada setiap submission (DIJEMPUT utk Top 1/2/3, TIDAK_TERPILIH
--    utk yang lain — hanya bagi anugerah yang status DISAHKAN).
--    Authorization: pegawai sahaja (SUPER_ADMIN_JPP/JPP) — keputusan muktamad.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.finalize_makmp_award(
  p_award_definition_id uuid,
  p_top_count integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_award record;
  v_ranked record;
  v_pos integer := 0;
  v_winner_count integer := 0;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda perlu log masuk sebagai pegawai.');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role NOT IN ('SUPER_ADMIN_JPP', 'JPP') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Hanya pegawai boleh mengesahkan keputusan.');
  END IF;

  -- Loop semua aplikasi anugerah, susun ikut final_rank/merit
  FOR v_ranked IN
    SELECT a.id AS application_id,
           a.submission_id,
           a.status,
           COALESCE(a.final_rank, ROW_NUMBER() OVER (
             ORDER BY a.total_merit_granted DESC NULLS LAST, a.created_at ASC
           )) AS eff_rank
    FROM public.makmp_submission_awards a
    WHERE a.award_id = p_award_definition_id
    ORDER BY COALESCE(a.final_rank, 999999), a.total_merit_granted DESC NULLS LAST, a.created_at ASC
  LOOP
    v_pos := v_pos + 1;

    -- Hanya peserta yang DISAHKAN layak; DITOLAK/MENUNGGU tidak dijemput.
    IF v_ranked.status = 'DISAHKAN' THEN
      IF v_pos <= p_top_count THEN
        UPDATE public.makmp_submissions
        SET winner_status = 'DIJEMPUT'
        WHERE id = v_ranked.submission_id;
        v_winner_count := v_winner_count + 1;
      ELSE
        UPDATE public.makmp_submissions
        SET winner_status = 'TIDAK_TERPILIH'
        WHERE id = v_ranked.submission_id;
      END IF;
    END IF;
  END LOOP;

  -- Tanda finalized pada semua aplikasi anugerah ini
  UPDATE public.makmp_submission_awards
  SET is_finalized = true,
      finalized_at = now(),
      finalized_by = v_uid
  WHERE award_id = p_award_definition_id;

  RETURN jsonb_build_object('success', true, 'winner_count', v_winner_count);
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. submit_makmp_winner_info(p_submission_id, p_ic_no)
--    Pelajar (pemenang) submit no IC. Semak deadline + hanya pemenang DIJEMPUT.
--    Authorization: pemilik submission sahaja.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_makmp_winner_info(
  p_submission_id uuid,
  p_ic_no text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_sub record;
  v_ed record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda perlu log masuk.');
  END IF;

  SELECT * INTO v_sub FROM public.makmp_submissions WHERE id = p_submission_id;
  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak dijumpai.');
  END IF;

  IF v_sub.user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda bukan pemilik permohonan ini.');
  END IF;

  IF v_sub.winner_status IS DISTINCT FROM 'DIJEMPUT' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tidak dijemput ke MAKMP.');
  END IF;

  -- Semak deadline
  SELECT * INTO v_ed FROM public.makmp_editions WHERE id = v_sub.edition_id;
  IF v_ed.winner_upload_deadline IS NOT NULL AND now() > v_ed.winner_upload_deadline THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tarikh akhir penyerahan maklumat telah tamat.');
  END IF;

  -- Validasi no IC (digit sahaja, 12 digit)
  IF p_ic_no IS NULL OR p_ic_no !~ '^[0-9]{12}$' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Nombor IC mesti 12 digit (angka sahaja).');
  END IF;

  UPDATE public.makmp_submissions
  SET winner_ic_no = p_ic_no,
      updated_at = now()
  WHERE id = p_submission_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- ── Grants ───────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.get_makmp_award_ranking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_makmp_award_ranking(text, uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_makmp_award(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_makmp_winner_info(uuid, text) TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
