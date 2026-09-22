-- ============================================================================
-- Migration: 20260923_makmp_unlock_jury_review.sql
-- Description: Mekanisme "Buka Semula" (unlock) untuk PENTADBIR sahaja.
--   Bila juri tersilap sahkan/tolak, pentadbir (SUPER_ADMIN_JPP / JPP) boleh
--   reset keputusan award kembali ke DALAM_SEMAKAN supaya juri re-review.
--
--   RPC: unlock_jury_award_review(p_award_id)
--     - Verify pemanggil adalah pentadbir (role SUPER_ADMIN_JPP / JPP).
--     - Reverse merit (deduct) + padam akademik_pencapaian + transaksi pembalikan
--       jika award telah DISAHKAN (elak double-count bila re-sahkan).
--     - Reset award -> DALAM_SEMAKAN, items -> is_verified=false, merit=0.
--     - Reset master submission -> DALAM_SEMAKAN + recalc total merit.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.unlock_jury_award_review(p_award_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_role text;
  v_uid uuid;
  v_award record;
  v_sub record;
  v_item record;
  v_recalc_total numeric := 0;
  v_any_pending boolean := false;
  v_master_status text;
BEGIN
  -- 1. Verify pemanggil adalah pentadbir
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sila log masuk terlebih dahulu.');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role NOT IN ('SUPER_ADMIN_JPP', 'JPP') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Hanya pentadbir dibenarkan membuka semula semakan.');
  END IF;

  -- 2. Ambil award + submission
  SELECT * INTO v_award FROM public.makmp_submission_awards WHERE id = p_award_id;
  IF v_award IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan anugerah tidak dijumpai.');
  END IF;

  SELECT * INTO v_sub FROM public.makmp_submissions WHERE id = v_award.submission_id;
  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak dijumpai.');
  END IF;

  -- 3. Reverse merit & padam akademik_pencapaian (jika award pernah DISAHKAN)
  IF v_award.status = 'DISAHKAN' THEN
    FOR v_item IN
      SELECT * FROM public.makmp_submission_items
      WHERE submission_award_id = p_award_id
        AND akademik_pencapaian_id IS NOT NULL
    LOOP
      -- Deduct merit dari profil pelajar (reverse)
      IF v_sub.user_id IS NOT NULL AND COALESCE(v_item.merit_awarded, 0) > 0 THEN
        PERFORM public.increment_merit_by_source(v_sub.user_id, -COALESCE(v_item.merit_awarded, 0), 'AKADEMIK');

        INSERT INTO public.merit_transactions (
          user_id, points, reason, actor_name, source, reference_id
        ) VALUES (
          v_sub.user_id,
          -COALESCE(v_item.merit_awarded, 0),
          'Pembatalan semakan MAKMP (dibuka semula): ' || v_item.nama_pencapaian,
          'Pentadbir MAKMP',
          'AKADEMIK',
          v_item.akademik_pencapaian_id
        );
      END IF;

      -- Padam akademik_pencapaian yang dijana semasa sahkan (akan re-jana bila re-sahkan)
      DELETE FROM public.akademik_pencapaian WHERE id = v_item.akademik_pencapaian_id;
    END LOOP;
  END IF;

  -- 4. Reset semua items award -> is_verified=false, merit=0, unlink akademik
  UPDATE public.makmp_submission_items
  SET merit_awarded = 0,
      is_verified = false,
      akademik_pencapaian_id = NULL
  WHERE submission_award_id = p_award_id;

  -- 5. Reset award -> DALAM_SEMAKAN, clear reviewed fields
  UPDATE public.makmp_submission_awards
  SET status = 'DALAM_SEMAKAN',
      total_merit_granted = 0,
      reviewed_by_pin_id = NULL,
      reviewed_at = NULL,
      review_notes = NULL,
      rejection_reason = NULL
  WHERE id = p_award_id;

  -- 6. Recalc master submission: jika masih ada award lain DISAHKAN, kekal; selain itu DALAM_SEMAKAN
  SELECT COALESCE(SUM(total_merit_granted), 0),
         bool_or(status IN ('MENUNGGU','DALAM_SEMAKAN'))
  INTO v_recalc_total, v_any_pending
  FROM public.makmp_submission_awards
  WHERE submission_id = v_sub.id;

  v_master_status := 'DALAM_SEMAKAN';
  IF NOT v_any_pending THEN
    -- Semua award sudah selesai (tiada pending) — tak sepatutnya berlaku selepas unlock
    -- kerana award ini baru kita set DALAM_SEMAKAN, jadi pasti ada pending.
    v_master_status := 'DALAM_SEMAKAN';
  END IF;

  UPDATE public.makmp_submissions
  SET status = 'DALAM_SEMAKAN',
      total_merit_awarded = v_recalc_total,
      reviewer_pin_id = NULL,
      reviewed_at = NULL,
      review_notes = NULL,
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = v_sub.id;

  RETURN jsonb_build_object('success', true);
END;
$func$;

GRANT EXECUTE ON FUNCTION public.unlock_jury_award_review(uuid) TO authenticated;
-- Pentadbir sahaja (role check dilakukan dalam function), bukan anon.

NOTIFY pgrst, 'reload schema';
