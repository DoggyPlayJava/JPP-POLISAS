-- ============================================================================
-- Migration: 20260924_makmp_report_score.sql
-- Description: Sokongan anugerah berasaskan LAPORAN (doc_requirement_type =
--   'REPORT_AND_EVIDENCE') di mana juri/pegawai memberi markah 0-100.
--   Markah 0-100 disimpan dalam field baharu `report_score`, dan merit
--   dikira automatik sebagai round(report_score / 10). Contoh: 67 -> 7 merit.
--
--   - Student TIDAK boleh set markah/status pencapaian untuk anugerah laporan
--     (peringkat default POLITEKNIK, merit_suggested = 0).
--   - Juri/pegawai (orang yang sama) yang memberi markah 0-100.
-- ============================================================================

-- 1. Tambah field report_score (markah mentah 0-100)
ALTER TABLE public.makmp_submission_items
ADD COLUMN IF NOT EXISTS report_score numeric DEFAULT 0;

COMMENT ON COLUMN public.makmp_submission_items.report_score IS
  'Markah mentah 0-100 yang diberi juri/pegawai untuk anugerah berasaskan laporan. merit_awarded = round(report_score/10).';

-- 2. Kemaskini RPC save_jury_award_review supaya terima report_score dan
--    kira merit_awarded = round(report_score/10) untuk item laporan.
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
  v_is_report boolean;
  v_merit numeric;
BEGIN
  v_pin := public._jury_authorize(p_pin);

  IF NOT public._jury_can_access_award(v_pin, p_award_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tiada akses ke anugerah ini (di luar skop tugas juri anda).');
  END IF;

  IF p_status NOT IN ('MENUNGGU','DALAM_SEMAKAN','DISAHKAN','DITOLAK') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status tidak sah.');
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items)
    AS x(id uuid, merit_awarded numeric, is_verified boolean, report_score numeric)
  LOOP
    -- Tentukan sama ada item ini laporan (perlu markah 0-100)
    SELECT (document_type = 'LAPORAN') INTO v_is_report
    FROM public.makmp_submission_items
    WHERE id = v_item.id;

    IF p_status = 'DISAHKAN' THEN
      IF v_is_report THEN
        -- Anugerah laporan: merit = round(report_score / 10)
        v_merit := round(GREATEST(0, LEAST(100, COALESCE(v_item.report_score, 0))) / 10);
        v_total := v_total + v_merit;
        UPDATE public.makmp_submission_items
        SET report_score = GREATEST(0, LEAST(100, COALESCE(v_item.report_score, 0))),
            merit_awarded = v_merit,
            is_verified = true
        WHERE id = v_item.id;
      ELSE
        -- Sijil: merit = merit_awarded terus (seperti sebelum ini)
        v_merit := GREATEST(0, COALESCE(v_item.merit_awarded, 0));
        v_total := v_total + v_merit;
        UPDATE public.makmp_submission_items
        SET merit_awarded = v_merit,
            is_verified = true
        WHERE id = v_item.id;
      END IF;
    ELSE
      UPDATE public.makmp_submission_items
      SET merit_awarded = 0,
          report_score = 0,
          is_verified = false
      WHERE id = v_item.id;
    END IF;
  END LOOP;

  UPDATE public.makmp_submission_awards
  SET status = p_status,
      total_merit_granted = v_total,
      reviewed_by_pin_id = v_pin.id,
      reviewed_at = now(),
      review_notes = p_review_notes,
      rejection_reason = CASE WHEN p_status = 'DITOLAK' THEN p_rejection_reason ELSE NULL END
  WHERE id = p_award_id;

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

  IF p_status = 'DISAHKAN' THEN
    PERFORM public.sync_makmp_submission_to_akademik(p_submission_id, NULL);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$func$;

-- 3. Kemaskini RPC save_jury_review (klasik) dengan logik yang sama
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
  v_is_report boolean;
  v_merit numeric;
BEGIN
  v_pin := public._jury_authorize(p_pin);

  IF NOT public._jury_can_access_submission(v_pin, p_submission_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tiada akses ke permohonan ini (di luar skop tugas juri anda).');
  END IF;

  IF p_status NOT IN ('MENUNGGU','DALAM_SEMAKAN','DISAHKAN','DITOLAK') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status tidak sah.');
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items)
    AS x(id uuid, merit_awarded numeric, is_verified boolean, report_score numeric)
  LOOP
    SELECT (document_type = 'LAPORAN') INTO v_is_report
    FROM public.makmp_submission_items
    WHERE id = v_item.id;

    IF p_status = 'DISAHKAN' THEN
      IF v_is_report THEN
        v_merit := round(GREATEST(0, LEAST(100, COALESCE(v_item.report_score, 0))) / 10);
        v_total := v_total + v_merit;
        UPDATE public.makmp_submission_items
        SET report_score = GREATEST(0, LEAST(100, COALESCE(v_item.report_score, 0))),
            merit_awarded = v_merit,
            is_verified = true
        WHERE id = v_item.id;
      ELSE
        v_merit := GREATEST(0, COALESCE(v_item.merit_awarded, 0));
        v_total := v_total + v_merit;
        UPDATE public.makmp_submission_items
        SET merit_awarded = v_merit, is_verified = true
        WHERE id = v_item.id;
      END IF;
    ELSE
      UPDATE public.makmp_submission_items
      SET merit_awarded = 0, report_score = 0, is_verified = false
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

NOTIFY pgrst, 'reload schema';
