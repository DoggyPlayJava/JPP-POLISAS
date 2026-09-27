-- ============================================================================
-- RPC: get_makmp_award_review_status
-- Papar status semakan anugerah (untuk kesediaan "Sahkan Kedudukan Calon").
-- Returns: { total, menunggu, dalam_semakan, disahkan, ditolak, ready }
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_makmp_award_review_status(
  p_award_definition_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total integer := 0;
  v_menunggu integer := 0;
  v_dalam_semakan integer := 0;
  v_disahkan integer := 0;
  v_ditolak integer := 0;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'MENUNGGU'),
    COUNT(*) FILTER (WHERE status = 'DALAM_SEMAKAN'),
    COUNT(*) FILTER (WHERE status = 'DISAHKAN'),
    COUNT(*) FILTER (WHERE status = 'DITOLAK')
  INTO v_total, v_menunggu, v_dalam_semakan, v_disahkan, v_ditolak
  FROM public.makmp_submission_awards
  WHERE award_id = p_award_definition_id;

  RETURN jsonb_build_object(
    'total',            v_total,
    'menunggu',         v_menunggu,
    'dalam_semakan',    v_dalam_semakan,
    'disahkan',         v_disahkan,
    'ditolak',          v_ditolak,
    'ready',            (v_menunggu + v_dalam_semakan) = 0
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_makmp_award_review_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_makmp_award_review_status(uuid) TO anon;

-- ============================================================================
-- RPC: finalize_makmp_award (rewrite)
-- 1) Authorization: pegawai (SUPER_ADMIN_JPP / JPP) ATAU juri (PIN).
-- 2) Readiness guard: TOLAK jika masih ada status MENUNGGU / DALAM_SEMAKAN.
-- 3) Set winner_status (DIJEMPUT / TIDAK_TERPILIH) ikut ranking top N.
-- 4) Kunci (is_finalized = true).
-- ============================================================================
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

  -- ── Reset winner_status untuk semua submission dalam anugerah ini ───────
  UPDATE public.makmp_submissions s
  SET winner_status = NULL
  WHERE s.id IN (
    SELECT a.submission_id FROM public.makmp_submission_awards a
    WHERE a.award_id = p_award_definition_id
  );

  -- ── Loop HANYA peserta DISAHKAN, susun ikut final_rank / merit ──────────
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

  -- ── Tanda finalized pada semua aplikasi anugerah ini ────────────────────
  UPDATE public.makmp_submission_awards
  SET is_finalized = true,
      finalized_at = now(),
      finalized_by = v_uid
  WHERE award_id = p_award_definition_id;

  RETURN jsonb_build_object('success', true, 'winner_count', v_winner_count);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.finalize_makmp_award(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_makmp_award(uuid, integer, text) TO anon;

NOTIFY pgrst, 'reload schema';
