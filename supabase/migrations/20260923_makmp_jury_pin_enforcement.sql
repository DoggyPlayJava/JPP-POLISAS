-- ============================================================================
-- Migration: 20260923_makmp_jury_pin_enforcement.sql
-- Description: Pindah verifikasi PIN Juri ke DATABASE (SECURITY DEFINER) supaya
--   juri portal tak lagi bergantung pada RLS `true`/`OR true` yang membenarkan
--   sesiapa (tanpa PIN) baca semua maklumat pelajar & tukar keputusan juri.
--
--   RPC yang disediakan:
--     1. verify_jury_pin(p_pin) -> jsonb  (ganti direct select makmp_jury_pins)
--     2. fetch_jury_award_applications(p_pin) -> jsonb (nested, filter by scope)
--     3. mark_award_in_review(p_pin, p_award_id)
--     4. save_jury_award_review(p_pin, p_award_id, p_submission_id, p_status,
--                               p_review_notes, p_rejection_reason, p_items)
--     5. save_jury_review(p_pin, p_submission_id, p_status, p_review_notes,
--                         p_rejection_reason, p_items)
--
--   Setiap RPC verify PIN aktif + scope sebelum melakukan apa-apa.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. verify_jury_pin — verifikasi PIN di DB & kembalikan data juri + edisi
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_jury_pin(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_pin record;
  v_ed record;
BEGIN
  SELECT * INTO v_pin
  FROM public.makmp_jury_pins
  WHERE pin_code = TRIM(p_pin)
    AND is_active = true
  LIMIT 1;

  IF v_pin IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Kod PIN tidak sah atau telah dinyahaktifkan.'
    );
  END IF;

  SELECT * INTO v_ed
  FROM public.makmp_editions
  WHERE id = v_pin.edition_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'valid', true,
    'pin', to_jsonb(v_pin),
    'edition', to_jsonb(v_ed)
  );
END;
$func$;

-- ---------------------------------------------------------------------------
-- Helper dalaman: sahkan PIN & kembalikan rekod juri (buang exception kalau gagal)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._jury_authorize(p_pin text)
RETURNS public.makmp_jury_pins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_pin public.makmp_jury_pins;
BEGIN
  SELECT * INTO v_pin
  FROM public.makmp_jury_pins
  WHERE pin_code = TRIM(p_pin)
    AND is_active = true
  LIMIT 1;

  IF v_pin IS NULL THEN
    RAISE EXCEPTION 'Kod PIN tidak sah atau telah dinyahaktifkan.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_pin;
END;
$func$;

-- ---------------------------------------------------------------------------
-- 2. fetch_jury_award_applications — senarai permohonan anugerah untuk juri
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
  ) x;

  RETURN v_result;
END;
$func$;

-- ---------------------------------------------------------------------------
-- 3. mark_award_in_review — tanda anugerah DALAM_SEMAKAN (verify PIN)
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
-- 4. save_jury_award_review — simpan semakan juri (multi-award), verify PIN
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
  v_aw_status record;
BEGIN
  v_pin := public._jury_authorize(p_pin);

  IF p_status NOT IN ('MENUNGGU','DALAM_SEMAKAN','DISAHKAN','DITOLAK') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status tidak sah.');
  END IF;

  -- 1. Update items (merit + verified)
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
-- 5. save_jury_review — simpan semakan juri klasik (verify PIN)
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
-- 6. KETATKAN RLS items & awards — buang true/OR true
-- ---------------------------------------------------------------------------
-- makmp_submission_items
DROP POLICY IF EXISTS "makmp_submission_items_select" ON public.makmp_submission_items;
CREATE POLICY "makmp_submission_items_select" ON public.makmp_submission_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.makmp_submissions s
      WHERE s.id = submission_id
        AND (s.user_id = (SELECT auth.uid())
             OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()))
                 IN ('SUPER_ADMIN_JPP','JPP','STAFF'))
    )
  );

DROP POLICY IF EXISTS "makmp_submission_items_update" ON public.makmp_submission_items;
CREATE POLICY "makmp_submission_items_update" ON public.makmp_submission_items
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()))
      IN ('SUPER_ADMIN_JPP','JPP','STAFF')
  );

DROP POLICY IF EXISTS "makmp_submission_items_insert" ON public.makmp_submission_items;
CREATE POLICY "makmp_submission_items_insert" ON public.makmp_submission_items
  FOR INSERT WITH CHECK (true);

-- makmp_submission_awards
DROP POLICY IF EXISTS "makmp_submission_awards_select" ON public.makmp_submission_awards;
CREATE POLICY "makmp_submission_awards_select" ON public.makmp_submission_awards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.makmp_submissions s
      WHERE s.id = submission_id
        AND (s.user_id = (SELECT auth.uid())
             OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()))
                 IN ('SUPER_ADMIN_JPP','JPP','STAFF'))
    )
  );

DROP POLICY IF EXISTS "makmp_submission_awards_update" ON public.makmp_submission_awards;
CREATE POLICY "makmp_submission_awards_update" ON public.makmp_submission_awards
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()))
      IN ('SUPER_ADMIN_JPP','JPP','STAFF')
  );

DROP POLICY IF EXISTS "makmp_submission_awards_insert" ON public.makmp_submission_awards;
CREATE POLICY "makmp_submission_awards_insert" ON public.makmp_submission_awards
  FOR INSERT WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.verify_jury_pin(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fetch_jury_award_applications(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_award_in_review(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_jury_award_review(text, uuid, uuid, text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_jury_review(text, uuid, text, text, text, jsonb) TO anon, authenticated;

-- _jury_authorize adalah helper dalaman — jangan expose kepada anon/authenticated
REVOKE EXECUTE ON FUNCTION public._jury_authorize(text) FROM anon, authenticated, PUBLIC;

NOTIFY pgrst, 'reload schema';
