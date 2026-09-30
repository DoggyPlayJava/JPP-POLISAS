-- 100_makmp_finalize_no_overwrite_rank.sql
-- Fix 1: finalize_makmp_award TIDAK menimpa winner_status 'DIJEMPUT' yang sedia
--         ada (pelajar yang dah menang anugerah lain kekal DIJEMPUT).
-- Fix 2: finalize auto-set final_rank (1,2,3,...) pada makmp_submission_awards
--         supaya urusetia boleh nampak kedudukan sebenar (#1/#2/#3).

CREATE OR REPLACE FUNCTION public.finalize_makmp_award(
  p_award_definition_id uuid,
  p_top_count integer DEFAULT 3,
  p_pin text DEFAULT NULL
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
  v_ranked record;
  v_pos integer := 0;
  v_winner_count integer := 0;
  v_menunggu integer := 0;
  v_dalam_semakan integer := 0;
  v_disahkan integer := 0;
BEGIN
  -- ── Authorization: pegawai ATAU juri (PIN) ──────────────────────────────
  IF v_uid IS NOT NULL THEN
    SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
    IF v_role NOT IN ('SUPER_ADMIN_JPP', 'JPP') THEN
      RETURN jsonb_build_object('success', false, 'message', 'Hanya pegawai atau juri boleh mengesahkan keputusan.');
    END IF;
  ELSE
    v_pin := public._jury_authorize(p_pin);
    IF NOT public._jury_can_access_award_def(v_pin, p_award_definition_id) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Anda tiada akses ke anugerah ini.');
    END IF;
  END IF;

  -- ── Jangan sahkan kalau dah finalized (mesti unlock dulu) ───────────────
  IF EXISTS (
    SELECT 1 FROM public.makmp_submission_awards
    WHERE award_id = p_award_definition_id AND is_finalized = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'locked', true, 'message', 'Keputusan anugerah ini telah disahkan & dikunci.');
  END IF;

  -- ── Readiness guard: kira baki status tertunggak ────────────────────────
  SELECT
    COUNT(*) FILTER (WHERE status = 'MENUNGGU'),
    COUNT(*) FILTER (WHERE status = 'DALAM_SEMAKAN'),
    COUNT(*) FILTER (WHERE status = 'DISAHKAN')
  INTO v_menunggu, v_dalam_semakan, v_disahkan
  FROM public.makmp_submission_awards
  WHERE award_id = p_award_definition_id;

  IF (v_menunggu + v_dalam_semakan) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'ready', false,
      'menunggu', v_menunggu,
      'dalam_semakan', v_dalam_semakan,
      'message', 'Masih ada calon yang belum selesai disemak. Sila selesaikan semua semakan dahulu.'
    );
  END IF;

  IF v_disahkan = 0 THEN
    RETURN jsonb_build_object('success', false, 'ready', false, 'message', 'Tiada calon yang disahkan untuk anugerah ini.');
  END IF;

  -- ── Reset winner_status HANYA untuk submission yang TIDAK menang anugerah
  --    lain. Pelajar yang dah DIJEMPUT dari anugerah lain KEKAL DIJEMPUT.
  --    (Fix 1: elak overwrite).
  UPDATE public.makmp_submissions s
  SET winner_status = NULL
  WHERE s.id IN (
    SELECT a.submission_id FROM public.makmp_submission_awards a
    WHERE a.award_id = p_award_definition_id
  )
  AND s.winner_status IS DISTINCT FROM 'DIJEMPUT';

  -- ── Loop HANYA peserta DISAHKAN, susun ikut final_rank / merit ──────────
  --    Fix 2: set final_rank = v_pos untuk setiap peserta.
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

    -- Fix 2: simpan kedudukan ke makmp_submission_awards
    UPDATE public.makmp_submission_awards
    SET final_rank = v_pos
    WHERE id = v_ranked.application_id;

    IF v_pos <= p_top_count THEN
      -- Menang anugerah ini → DIJEMPUT (kekal walaupun dah DIJEMPUT)
      UPDATE public.makmp_submissions
      SET winner_status = 'DIJEMPUT', updated_at = now()
      WHERE id = v_ranked.submission_id;
      v_winner_count := v_winner_count + 1;
    ELSE
      -- Kalah anugerah ini → TIDAK_TERPILIH, TAPI hanya jika dia belum
      -- DIJEMPUT dari anugerah lain (Fix 1).
      UPDATE public.makmp_submissions
      SET winner_status = 'TIDAK_TERPILIH', updated_at = now()
      WHERE id = v_ranked.submission_id
        AND winner_status IS DISTINCT FROM 'DIJEMPUT';
    END IF;
  END LOOP;

  -- ── Tanda finalized pada semua aplikasi anugerah ini ────────────────────
  UPDATE public.makmp_submission_awards
  SET is_finalized = true,
      finalized_at = now(),
      finalized_by = v_uid
  WHERE award_id = p_award_definition_id;

  RETURN jsonb_build_object('success', true, 'winner_count', v_winner_count);
END;
$function$;
