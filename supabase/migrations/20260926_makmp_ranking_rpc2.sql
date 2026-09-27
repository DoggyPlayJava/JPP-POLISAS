-- ============================================================================
-- RPC: get_makmp_award_ranking (rewrite — logik ranking konsisten)
-- Ranking = final_rank (manual) jika ada, selainnya ikut merit DESC.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_makmp_award_ranking(
  p_award_definition_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  WITH ranked AS (
    SELECT
      a.*,
      ROW_NUMBER() OVER (
        ORDER BY
          a.is_finalized DESC,                     -- finalized dulu (stabil)
          COALESCE(a.final_rank, 2147483647) ASC,  -- manual rank dulu
          a.total_merit_granted DESC NULLS LAST,
          a.created_at ASC
      ) AS eff_rank
    FROM public.makmp_submission_awards a
    WHERE a.award_id = p_award_definition_id
      AND a.status = 'DISAHKAN'                     -- hanya yang lulus dinilai ranking
  )
  SELECT COALESCE(jsonb_agg(obj ORDER BY obj->>'eff_rank'), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      to_jsonb(r.*)
      || jsonb_build_object(
        'submission', (SELECT to_jsonb(s.*) FROM public.makmp_submissions s WHERE s.id = r.submission_id)
      ) AS obj
    FROM ranked r
  ) x;

  RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_makmp_award_ranking(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
