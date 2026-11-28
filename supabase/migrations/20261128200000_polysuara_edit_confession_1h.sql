-- Migration: 20261128200000_polysuara_edit_confession_1h.sql
-- Description:
--   Allows PolySuara confession authors to edit their own confession content/category/hashtags
--   within the exact same 1-hour grace period as self-deletion, via a hardened SECURITY DEFINER RPC.
--   Adds `edited_at` timestamp column to `public.polysuara_confessions`.
--
-- Security & DB rules verified:
--   - New migration only (existing migrations untouched).
--   - Uses (SELECT auth.uid()) (init-plan friendly for 1,500 concurrent users).
--   - Row-level FOR UPDATE lock + strict author ownership + 1-hour server-side window check.
--   - Never allows editing upvotes, downvotes, is_pinned, status, official_reply, or author_id.
--   - Re-triggers BEFORE UPDATE OF content censor trigger (trg_censor_polysuara) automatically.
--   - Explicit REVOKE from PUBLIC/anon and GRANT only to authenticated.

-- 1. Add edited_at tracking column (idempotent)
ALTER TABLE public.polysuara_confessions
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.polysuara_confessions.edited_at IS
    'Timestamp of the most recent author edit (allowed within 1 hour of created_at)';

-- 2. Hardened RPC for 1-hour self-edit by original author
CREATE OR REPLACE FUNCTION public.edit_own_polysuara_confession(
    p_confession_id UUID,
    p_content TEXT,
    p_category VARCHAR DEFAULT NULL,
    p_hashtags TEXT[] DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_conf RECORD;
    v_trimmed TEXT;
    v_category VARCHAR(50);
    v_hashtags TEXT[];
    v_updated RECORD;
BEGIN
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_confession_id IS NULL THEN
        RAISE EXCEPTION 'Confession ID is required';
    END IF;

    v_trimmed := trim(COALESCE(p_content, ''));
    IF v_trimmed = '' THEN
        RAISE EXCEPTION 'Confession content cannot be empty';
    END IF;
    IF length(v_trimmed) > 540 THEN
        RAISE EXCEPTION 'Confession content exceeds maximum allowed length';
    END IF;
    IF lower(v_trimmed) = '[deleted]' THEN
        RAISE EXCEPTION 'Use delete action to remove a confession';
    END IF;

    -- Lock target confession row to prevent race conditions with delete/archive
    SELECT id, author_id, content, category, hashtags, created_at, is_archived
    INTO v_conf
    FROM public.polysuara_confessions
    WHERE id = p_confession_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Confession not found';
    END IF;

    IF v_conf.author_id IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'Not authorized to edit this confession';
    END IF;

    IF v_conf.content = '[deleted]' OR COALESCE(v_conf.is_archived, false) = true THEN
        RAISE EXCEPTION 'Cannot edit a deleted or archived confession';
    END IF;

    -- Strict server-side 1-hour grace period (matches 1-hour delete window)
    IF (NOW() - v_conf.created_at) > INTERVAL '1 hour' THEN
        RAISE EXCEPTION 'Edit window expired (1 hour limit)';
    END IF;

    -- Validate category against allowed channels (keep existing if omitted/invalid)
    IF p_category IS NOT NULL AND upper(trim(p_category)) IN ('UMUM', 'AKADEMIK', 'FASILITI', 'KAMSIS', 'KAUNSELING') THEN
        v_category := upper(trim(p_category));
    ELSE
        v_category := v_conf.category;
    END IF;

    -- Normalize hashtags cleanly (max 10 tags, lowercase, leading #)
    IF p_hashtags IS NOT NULL THEN
        SELECT COALESCE(array_agg(DISTINCT lower(tag)), ARRAY[]::TEXT[])
        INTO v_hashtags
        FROM (
            SELECT unnest(p_hashtags) AS tag
            LIMIT 10
        ) t
        WHERE tag ~ '^#[a-zA-Z0-9_]+$';
    ELSE
        v_hashtags := v_conf.hashtags;
    END IF;

    -- Update ONLY editable author fields; triggers trg_censor_polysuara automatically
    UPDATE public.polysuara_confessions
    SET
        content = v_trimmed,
        category = v_category,
        hashtags = v_hashtags,
        edited_at = NOW()
    WHERE id = p_confession_id
    RETURNING id, content, category, hashtags, edited_at
    INTO v_updated;

    RETURN jsonb_build_object(
        'id', v_updated.id,
        'content', v_updated.content,
        'category', v_updated.category,
        'hashtags', COALESCE(v_updated.hashtags, ARRAY[]::TEXT[]),
        'edited_at', v_updated.edited_at
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.edit_own_polysuara_confession(UUID, TEXT, VARCHAR, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_own_polysuara_confession(UUID, TEXT, VARCHAR, TEXT[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
