-- ============================================================================
-- Migration: 20260924_makmp_hide_merit_from_student.sql
-- Description: Buang field merit daripada RPC lookup awam tracking-code supaya
--   student TIDAK dapat melihat sebarang angka merit (diluluskan mahupun
--   cadangan) — sama ada melalui UI atau dengan memeriksa respons rangkaian.
--   Ini mengelakkan pertikaian merit selepas keputusan juri.
--
--   Juri & pentadbir TIDAK terjejas — mereka guna RPC lain (fetch_jury_*).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_makmp_submission_by_tracking_code(
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_sub record;
  v_sub_json jsonb;
  v_cat jsonb;
  v_ed jsonb;
  v_items jsonb;
  v_awards jsonb;
  v_result jsonb;
BEGIN
  SELECT * INTO v_sub
  FROM public.makmp_submissions
  WHERE tracking_code = UPPER(TRIM(p_code))
  LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Submission: buang total merit (jangan dedah pada student)
  v_sub_json := to_jsonb(v_sub)
    - 'total_merit_awarded';

  SELECT to_jsonb(c.*) INTO v_cat
  FROM public.makmp_categories c WHERE c.id = v_sub.category_id;

  SELECT to_jsonb(e.*) INTO v_ed
  FROM public.makmp_editions e WHERE e.id = v_sub.edition_id;

  -- Items (top-level): buang merit_awarded & merit_suggested
  SELECT COALESCE(
    jsonb_agg(
      (to_jsonb(i.*) - 'merit_awarded' - 'merit_suggested')
      ORDER BY i.created_at
    ), '[]'::jsonb)
  INTO v_items
  FROM public.makmp_submission_items i
  WHERE i.submission_id = v_sub.id;

  -- Awards: buang total_merit_granted, dan buang merit pada nested items
  SELECT COALESCE(jsonb_agg(award_obj ORDER BY award_obj->>'created_at'), '[]'::jsonb)
  INTO v_awards
  FROM (
    SELECT
      (to_jsonb(a.*) - 'total_merit_granted') || jsonb_build_object(
        'award', (SELECT to_jsonb(ad.*) FROM public.makmp_award_definitions ad WHERE ad.id = a.award_id),
        'items', (
          SELECT COALESCE(
            jsonb_agg(
              (to_jsonb(it.*) - 'merit_awarded' - 'merit_suggested')
              ORDER BY it.created_at
            ), '[]'::jsonb)
          FROM public.makmp_submission_items it
          WHERE it.submission_award_id = a.id
        )
      ) AS award_obj
    FROM public.makmp_submission_awards a
    WHERE a.submission_id = v_sub.id
  ) x;

  v_result := v_sub_json
    || jsonb_build_object('category', v_cat)
    || jsonb_build_object('edition', v_ed)
    || jsonb_build_object('items', v_items)
    || jsonb_build_object('awards', v_awards);

  RETURN jsonb_build_object('found', true, 'submission', v_result);
END;
$func$;

GRANT EXECUTE ON FUNCTION public.get_makmp_submission_by_tracking_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_makmp_submission_by_tracking_code(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
