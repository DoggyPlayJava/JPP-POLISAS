-- ============================================================================
-- Migration: 20260923_makmp_tracking_lookup_rpc.sql
-- Description: Tutup data-leak pada makmp_submissions SELECT + sediakan RPC
--   lookup awam yang mengembalikan SATU submission + nested data (category,
--   edition, items, awards) berdasarkan tracking_code sahaja.
-- ============================================================================

-- 1. Buang `OR true` pada SELECT — hanya pemilik / staff boleh baca senarai.
DROP POLICY IF EXISTS "makmp_submissions_select" ON public.makmp_submissions;
CREATE POLICY "makmp_submissions_select" ON public.makmp_submissions
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()))
        IN ('SUPER_ADMIN_JPP', 'JPP', 'STAFF')
  );

-- 2. RPC lookup awam by tracking code — full nested data, satu submission sahaja.
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

  SELECT to_jsonb(c.*) INTO v_cat
  FROM public.makmp_categories c WHERE c.id = v_sub.category_id;

  SELECT to_jsonb(e.*) INTO v_ed
  FROM public.makmp_editions e WHERE e.id = v_sub.edition_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(i.*) ORDER BY i.created_at), '[]'::jsonb)
  INTO v_items
  FROM public.makmp_submission_items i
  WHERE i.submission_id = v_sub.id;

  SELECT COALESCE(jsonb_agg(award_obj ORDER BY award_obj->>'created_at'), '[]'::jsonb)
  INTO v_awards
  FROM (
    SELECT
      to_jsonb(a.*) || jsonb_build_object(
        'award', (SELECT to_jsonb(ad.*) FROM public.makmp_award_definitions ad WHERE ad.id = a.award_id),
        'items', (
          SELECT COALESCE(jsonb_agg(to_jsonb(it.*) ORDER BY it.created_at), '[]'::jsonb)
          FROM public.makmp_submission_items it
          WHERE it.submission_award_id = a.id
        )
      ) AS award_obj
    FROM public.makmp_submission_awards a
    WHERE a.submission_id = v_sub.id
  ) x;

  v_result := to_jsonb(v_sub)
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
