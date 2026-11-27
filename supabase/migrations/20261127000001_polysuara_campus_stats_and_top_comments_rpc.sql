-- Migration: PolySuara campus-wide impact stats & DISTINCT ON top comments RPC
-- Ensures 1,500 concurrent Orientation Season users never download up to 1,000 raw comments
-- just to render 1 top preview comment per feed card, and ensures JPP impact stats reflect
-- campus-wide counts (excluding untouched PENDING/NEW and note-only OFFICIAL_NOTE/FACT_CHECK).

CREATE OR REPLACE FUNCTION public.get_polysuara_top_comments(p_confession_ids UUID[])
RETURNS TABLE (
  id UUID,
  confession_id UUID,
  content TEXT,
  codename TEXT,
  is_jpp_official BOOLEAN,
  upvotes INT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT DISTINCT ON (c.confession_id)
    c.id,
    c.confession_id,
    c.content,
    c.codename,
    COALESCE(c.is_jpp_official, false) AS is_jpp_official,
    COALESCE(c.upvotes, 0)::INT AS upvotes,
    c.created_at
  FROM public.polysuara_comments c
  WHERE c.confession_id = ANY(p_confession_ids)
    AND c.parent_id IS NULL
    AND COALESCE(c.is_sensitive, false) = false
    AND COALESCE(c.is_hidden_by_community, false) = false
    AND COALESCE(c.is_deleted_by_moderator, false) = false
    AND c.content <> '[deleted]'
  ORDER BY
    c.confession_id,
    c.is_jpp_official DESC,
    c.upvotes DESC,
    c.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_polysuara_top_comments(UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_polysuara_impact_summary()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_resolved_count INT := 0;
  v_in_action_count INT := 0;
  v_jpp_replied_count INT := 0;
  v_recent_items JSONB := '[]'::jsonb;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status = 'RESOLVED'),
    COUNT(*) FILTER (WHERE status IN ('ACKNOWLEDGED', 'INVESTIGATING')),
    COUNT(*) FILTER (WHERE official_reply IS NOT NULL)
  INTO
    v_resolved_count,
    v_in_action_count,
    v_jpp_replied_count
  FROM public.polysuara_confessions
  WHERE COALESCE(is_archived, false) = false
    AND COALESCE(is_approved, true) = true
    AND COALESCE(is_hidden_by_community, false) = false;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', sub.id,
        'content', sub.content,
        'status', sub.status,
        'category', sub.category
      )
    ),
    '[]'::jsonb
  )
  INTO v_recent_items
  FROM (
    SELECT id, content, status, category
    FROM public.polysuara_confessions
    WHERE COALESCE(is_archived, false) = false
      AND COALESCE(is_approved, true) = true
      AND COALESCE(is_hidden_by_community, false) = false
      AND status IN ('ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED')
    ORDER BY COALESCE(official_reply_at, created_at) DESC
    LIMIT 3
  ) sub;

  RETURN jsonb_build_object(
    'resolved_count', COALESCE(v_resolved_count, 0),
    'in_action_count', COALESCE(v_in_action_count, 0),
    'jpp_replied_count', COALESCE(v_jpp_replied_count, 0),
    'recent_items', v_recent_items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_polysuara_impact_summary() TO authenticated;
