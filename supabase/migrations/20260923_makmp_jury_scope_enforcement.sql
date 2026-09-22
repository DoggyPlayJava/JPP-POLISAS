-- ============================================================================
-- Migration: 20260923_makmp_jury_scope_enforcement.sql
-- Description: Enforce skop juri (assigned_categories) DI DATABASE, bukan cuma
--   client-side. Sebelum ini RPC juri hanya filter by edition_id, jadi mana-mana
--   juri (atau sesiapa dengan PIN) boleh baca & ubah SEMUA permohonan walaupun
--   PIN dia di-assign kategori tertentu sahaja.
--
--   Rule skop (berdasarkan assigned_categories pada makmp_jury_pins):
--     - NULL / kosong / mengandungi 'ALL'  -> full access (backward compatible)
--     - selain itu -> mesti match category_group / award.name / award.id
--
--   Juri yang tiada akses akan:
--     - fetch  : award itu TIDAK dikembalikan (tak nampak)
--     - mark/save : RETURN jsonb success=false + message (bukan exception)
--
--   NOTA IDENTITI:
--     - _jury_can_access_award_def() terima award DEFINITION id
--     - _jury_can_access_award() terima submission_award ROW id (utk fetch/mark/save_award)
--     - _jury_can_access_submission() terima submission id (utk save_jury_review klasik)
-- ============================================================================

-- Core: check scope terhadap award DEFINITION id
CREATE OR REPLACE FUNCTION public._jury_can_access_award_def(p_pin public.makmp_jury_pins, p_award_def_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_cats text[];
  v_aw public.makmp_award_definitions;
BEGIN
  IF p_pin IS NULL THEN
    RETURN false;
  END IF;

  v_cats := p_pin.assigned_categories;

  IF v_cats IS NULL OR array_length(v_cats, 1) IS NULL THEN
    RETURN true;
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_cats) AS c WHERE UPPER(TRIM(c)) = 'ALL') THEN
    RETURN true;
  END IF;

  SELECT * INTO v_aw FROM public.makmp_award_definitions WHERE id = p_award_def_id;
  IF v_aw IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM unnest(v_cats) AS c
    WHERE
      UPPER(TRIM(c)) = UPPER(TRIM(COALESCE(v_aw.category_group, '')))
      OR UPPER(TRIM(c)) = UPPER(TRIM(COALESCE(v_aw.name, '')))
      OR UPPER(TRIM(c)) = UPPER(v_aw.id::text)
      OR UPPER(TRIM(COALESCE(v_aw.category_group, ''))) LIKE '%' || UPPER(TRIM(c)) || '%'
      OR UPPER(TRIM(c)) LIKE '%' || UPPER(TRIM(COALESCE(v_aw.category_group, ''))) || '%'
  );
END;
$func$;

-- Resolve submission_award row id -> award definition id, then check scope
CREATE OR REPLACE FUNCTION public._jury_can_access_award(p_pin public.makmp_jury_pins, p_award_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_def_id uuid;
BEGIN
  SELECT award_id INTO v_def_id FROM public.makmp_submission_awards WHERE id = p_award_id;
  IF v_def_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN public._jury_can_access_award_def(p_pin, v_def_id);
END;
$func$;

-- Check submission scope: any award in submission within juri scope
CREATE OR REPLACE FUNCTION public._jury_can_access_submission(p_pin public.makmp_jury_pins, p_submission_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
BEGIN
  IF p_pin IS NULL THEN
    RETURN false;
  END IF;

  IF p_pin.assigned_categories IS NULL
     OR array_length(p_pin.assigned_categories, 1) IS NULL
     OR EXISTS (SELECT 1 FROM unnest(p_pin.assigned_categories) AS c WHERE UPPER(TRIM(c)) = 'ALL') THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.makmp_submission_awards a
    WHERE a.submission_id = p_submission_id
      AND public._jury_can_access_award_def(p_pin, a.award_id)
  );
END;
$func$;

-- ---------------------------------------------------------------------------
-- 2. fetch_jury_award_applications — enforce skop di DB
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fetch_jury_award_applications(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_pin public.makmp_jury_pins;
  v_result jsonb;
BEGIN
  v_pin := public._jury_authorize(p_pin);

  SELECT COALESCE(jsonb_agg(award_obj ORDER BY award_obj->>'created_at' DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      to_jsonb(a.*)
      || jsonb_build_object(
        'submission', (
          SELECT to_jsonb(s.*)
          FROM public.makmp_submissions s
          WHERE s.id = a.submission_id
        ),
        'award', (
          SELECT to_jsonb(ad.*)
          FROM public.makmp_award_definitions ad
          WHERE ad.id = a.award_id
        ),
        'items', (
          SELECT COALESCE(jsonb_agg(to_jsonb(it.*) ORDER BY it.created_at), '[]'::jsonb)
          FROM public.makmp_submission_items it
          WHERE it.submission_award_id = a.id
        )
      ) AS award_obj
    FROM public.makmp_submission_awards a
    WHERE a.submission_id IN (
      SELECT s.id FROM public.makmp_submissions s WHERE s.edition_id = v_pin.edition_id
    )
      AND public._jury_can_access_award(v_pin, a.id)
  ) x;

  RETURN v_result;
END;
$func$;

-- ---------------------------------------------------------------------------
-- 3. mark_award_in_review — enforce skop
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_award_in_review(p_pin text, p_award_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_pin public.makmp_jury_pins;
  v_award record;
BEGIN
  v_pin := public._jury_authorize(p_pin);

  IF NOT public._jury_can_access_award(v_pin, p_award_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tiada akses ke anugerah ini (di luar skop tugas juri anda).');
  END IF;

  SELECT * INTO v_award
  FROM public.makmp_submission_awards
  WHERE id = p_award_id;

  IF v_award IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan anugerah tidak dijumpai.');
  END IF;

  IF v_award.status = 'MENUNGGU' THEN
    UPDATE public.makmp_submission_awards
    SET status = 'DALAM_SEMAKAN'
    WHERE id = p_award_id;
  END IF;

  UPDATE public.makmp_submissions
  SET status = 'DALAM_SEMAKAN'
  WHERE id = v_award.submission_id
    AND status = 'MENUNGGU';

  RETURN jsonb_build_object('success', true);
END;
$func$;

-- ---------------------------------------------------------------------------
-- 4. save_jury_award_review — enforce skop
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
BEGIN
  v_pin := public._jury_authorize(p_pin);

  IF NOT public._jury_can_access_award(v_pin, p_award_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tiada akses ke anugerah ini (di luar skop tugas juri anda).');
  END IF;

  IF p_status NOT IN ('MENUNGGU','DALAM_SEMAKAN','DISAHKAN','DITOLAK') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status tidak sah.');
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(id uuid, merit_awarded numeric, is_verified boolean)
  LOOP
    IF p_status = 'DISAHKAN' THEN
      v_total := v_total + GREATEST(0, COALESCE(v_item.merit_awarded, 0));
      UPDATE public.makmp_submission_items
      SET merit_awarded = GREATEST(0, COALESCE(v_item.merit_awarded, 0)),
          is_verified = true
      WHERE id = v_item.id;
    ELSE
      UPDATE public.makmp_submission_items
      SET merit_awarded = 0,
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

-- ---------------------------------------------------------------------------
-- 5. save_jury_review — enforce skop (klasik)
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
BEGIN
  v_pin := public._jury_authorize(p_pin);

  IF NOT public._jury_can_access_submission(v_pin, p_submission_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tiada akses ke permohonan ini (di luar skop tugas juri anda).');
  END IF;

  IF p_status NOT IN ('MENUNGGU','DALAM_SEMAKAN','DISAHKAN','DITOLAK') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status tidak sah.');
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(id uuid, merit_awarded numeric, is_verified boolean)
  LOOP
    IF p_status = 'DISAHKAN' THEN
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

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public._jury_can_access_award_def(public.makmp_jury_pins, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._jury_can_access_award(public.makmp_jury_pins, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._jury_can_access_submission(public.makmp_jury_pins, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
