-- ============================================================================
-- Migration: 20260923_makmp_jury_review_fixes.sql
-- Description: Fix 3 bug dalam semakan juri:
--   1. save_jury_award_review ABAIKAN is_verified — untick "Dokumen Sah Diterima"
--      tetap dikira merit + semua item dipaksa is_verified = true.
--      FIX: hormati is_verified. Item is_verified = false -> 0 merit, is_verified=false.
--   2. (frontend) refresh auto-accept semua (fix di TSX berasingan).
--   3. Tiada lock re-edit — juri boleh re-edit award yang dah DISAHKAN/DITOLAK.
--      FIX: reject kalau award dah dalam status akhir (DISAHKAN/DITOLAK).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- save_jury_award_review — hormati is_verified + lock re-edit
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_jury_award_review(
  p_pin text,
  p_award_id uuid,
  p_submission_id uuid,
  p_status text,
  p_review_notes text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_pin public.makmp_jury_pins;
  v_item record;
  v_total numeric := 0;
  v_has_pending boolean;
  v_all_approved boolean;
  v_all_rejected boolean;
  v_sum numeric := 0;
  v_master_status text;
  v_current_status text;
BEGIN
  v_pin := public._jury_authorize(p_pin);

  IF p_status NOT IN ('MENUNGGU','DALAM_SEMAKAN','DISAHKAN','DITOLAK') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status tidak sah.');
  END IF;

  -- LOCK: ambil status semasa award. Kalau dah status akhir (DISAHKAN/DITOLAK),
  -- tolak sebarang re-edit (elak juri ubah keputusan selepas sahkan/tolak).
  SELECT status INTO v_current_status
  FROM public.makmp_submission_awards
  WHERE id = p_award_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan anugerah tidak dijumpai.');
  END IF;

  IF v_current_status IN ('DISAHKAN','DITOLAK') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Permohonan ini telah selesai disemak dan dikunci. Hubungi pentadbir untuk sebarang pembetulan.'
    );
  END IF;

  -- 1. Update items (merit + verified) — HORMATI is_verified
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(id uuid, merit_awarded numeric, is_verified boolean)
  LOOP
    IF p_status = 'DISAHKAN' AND COALESCE(v_item.is_verified, false) THEN
      v_total := v_total + GREATEST(0, COALESCE(v_item.merit_awarded, 0));
      UPDATE public.makmp_submission_items
      SET merit_awarded = GREATEST(0, COALESCE(v_item.merit_awarded, 0)),
          is_verified = true
      WHERE id = v_item.id;
    ELSE
      -- item yang tak disahkan (untick) ATAU status bukan DISAHKAN -> 0 merit, tak verified
      UPDATE public.makmp_submission_items
      SET merit_awarded = 0,
          is_verified = false
      WHERE id = v_item.id;
    END IF;
  END LOOP;

  -- 2. Update award status
  UPDATE public.makmp_submission_awards
  SET status = p_status,
      total_merit_granted = v_total,
      reviewed_by_pin_id = v_pin.id,
      reviewed_at = now(),
      review_notes = p_review_notes,
      rejection_reason = CASE WHEN p_status = 'DITOLAK' THEN p_rejection_reason ELSE NULL END
  WHERE id = p_award_id;

  -- 3. Kira aggregate master submission
  SELECT
    bool_or(status IN ('MENUNGGU','DALAM_SEMAKAN')) AS has_pending,
    bool_and(status = 'DISAHKAN') AS all_approved,
    bool_and(status = 'DITOLAK') AS all_rejected,
    COALESCE(SUM(total_merit_granted), 0) AS sum_merit
  INTO v_has_pending, v_all_approved, v_all_rejected, v_sum
  FROM public.makmp_submission_awards
  WHERE submission_id = p_submission_id;

  v_master_status := 'DALAM_SEMAKAN';
  IF NOT v_has_pending THEN
    IF v_all_approved THEN v_master_status := 'DISAHKAN';
    ELSIF v_all_rejected THEN v_master_status := 'DITOLAK';
    ELSE v_master_status := 'DISAHKAN';
    END IF;
  END IF;

  UPDATE public.makmp_submissions
  SET status = v_master_status,
      total_merit_awarded = v_sum,
      reviewer_pin_id = v_pin.id,
      reviewed_at = now(),
      rejection_reason = CASE WHEN v_master_status = 'DITOLAK' THEN p_rejection_reason ELSE NULL END,
      review_notes = p_review_notes,
      updated_at = now()
  WHERE id = p_submission_id;

  -- 4. Sync ke akademik & merit jika DISAHKAN
  IF p_status = 'DISAHKAN' THEN
    PERFORM public.sync_makmp_submission_to_akademik(p_submission_id, NULL);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$func$;

-- ---------------------------------------------------------------------------
-- save_jury_review (klasik) — hormati is_verified + lock re-edit
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_jury_review(
  p_pin text,
  p_submission_id uuid,
  p_status text,
  p_review_notes text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_pin public.makmp_jury_pins;
  v_item record;
  v_total numeric := 0;
  v_current_status text;
BEGIN
  v_pin := public._jury_authorize(p_pin);

  IF p_status NOT IN ('MENUNGGU','DALAM_SEMAKAN','DISAHKAN','DITOLAK') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status tidak sah.');
  END IF;

  -- LOCK: tolak re-edit submission yang dah selesai disemak
  SELECT status INTO v_current_status
  FROM public.makmp_submissions
  WHERE id = p_submission_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak dijumpai.');
  END IF;

  IF v_current_status IN ('DISAHKAN','DITOLAK') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Permohonan ini telah selesai disemak dan dikunci. Hubungi pentadbir untuk sebarang pembetulan.'
    );
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(id uuid, merit_awarded numeric, is_verified boolean)
  LOOP
    IF p_status = 'DISAHKAN' AND COALESCE(v_item.is_verified, false) THEN
      v_total := v_total + GREATEST(0, COALESCE(v_item.merit_awarded, 0));
      UPDATE public.makmp_submission_items
      SET merit_awarded = GREATEST(0, COALESCE(v_item.merit_awarded, 0)), is_verified = true
      WHERE id = v_item.id;
    ELSE
      UPDATE public.makmp_submission_items
      SET merit_awarded = 0, is_verified = false
      WHERE id = v_item.id;
    END IF;
  END LOOP;

  UPDATE public.makmp_submissions
  SET status = p_status,
      total_merit_awarded = v_total,
      reviewer_pin_id = v_pin.id,
      reviewed_at = now(),
      review_notes = p_review_notes,
      rejection_reason = CASE WHEN p_status = 'DITOLAK' THEN p_rejection_reason ELSE NULL END,
      updated_at = now()
  WHERE id = p_submission_id;

  IF p_status = 'DISAHKAN' THEN
    PERFORM public.sync_makmp_submission_to_akademik(p_submission_id, NULL);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$func$;

GRANT EXECUTE ON FUNCTION public.save_jury_award_review(text, uuid, uuid, text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_jury_review(text, uuid, text, text, text, jsonb) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
