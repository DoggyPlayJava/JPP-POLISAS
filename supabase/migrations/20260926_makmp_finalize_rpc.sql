-- ============================================================================
-- RPC: finalize_makmp_award (rewrite — logik ranking bersih)
-- Hanya peserta DISAHKAN dikira ranking. Top N = DIJEMPUT, selebihnya TIDAK_TERPILIH.
-- ============================================================================

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

  -- Reset winner_status untuk semua submission dalam anugerah ini (supaya
  -- finalize boleh dipanggil semula tanpa tinggal status lama).
  UPDATE public.makmp_submissions s
  SET winner_status = NULL
  WHERE s.id IN (
    SELECT a.submission_id FROM public.makmp_submission_awards a
    WHERE a.award_id = p_award_definition_id
  );

  -- Loop HANYA peserta DISAHKAN, susun ikut final_rank (manual) / merit.
  FOR v_ranked IN
    SELECT a.id AS application_id, a.submission_id
    FROM public.makmp_submission_awards a
    WHERE a.award_id = p_award_definition_id
      AND a.status = 'DISAHKAN'
    ORDER BY
      COALESCE(a.final_rank, 2147483647) ASC,
      a.total_merit_granted DESC NULLS LAST,
      a.created_at ASC
  LOOP
    v_pos := v_pos + 1;

    IF v_pos <= p_top_count THEN
      UPDATE public.makmp_submissions
      SET winner_status = 'DIJEMPUT', updated_at = now()
      WHERE id = v_ranked.submission_id;
      v_winner_count := v_winner_count + 1;
    ELSE
      UPDATE public.makmp_submissions
      SET winner_status = 'TIDAK_TERPILIH', updated_at = now()
      WHERE id = v_ranked.submission_id;
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

GRANT EXECUTE ON FUNCTION public.finalize_makmp_award(uuid, integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
