-- Migration: PolySuara v5.1 Poll and RPC Improvements
-- Created at: 2026-06-21 07:45:00

-- 1. Add vote_count column to polysuara_poll_options
ALTER TABLE public.polysuara_poll_options ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0 NOT NULL;

-- Backfill vote_count with current counts from polysuara_poll_votes
UPDATE public.polysuara_poll_options o
SET vote_count = (
  SELECT COUNT(*)::INTEGER
  FROM public.polysuara_poll_votes v
  WHERE v.option_id = o.id
);

-- 2. Create trigger to sync vote_count automatically
CREATE OR REPLACE FUNCTION public.sync_polysuara_poll_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.polysuara_poll_options
    SET vote_count = vote_count + 1
    WHERE id = NEW.option_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.polysuara_poll_options
    SET vote_count = GREATEST(0, vote_count - 1)
    WHERE id = OLD.option_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_poll_vote_count ON public.polysuara_poll_votes;
CREATE TRIGGER trg_sync_poll_vote_count
AFTER INSERT OR DELETE ON public.polysuara_poll_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_polysuara_poll_vote_count();

-- 3. Create toggle_polysuara_poll_vote RPC function
CREATE OR REPLACE FUNCTION public.toggle_polysuara_poll_vote(p_option_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_poll_id UUID;
    v_is_multiple_choice BOOLEAN;
    v_voted_already BOOLEAN;
    v_removed_options UUID[] := ARRAY[]::UUID[];
    v_action TEXT;
BEGIN
    -- Get current authenticated user
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get poll_id and is_multiple_choice
    SELECT o.poll_id, p.is_multiple_choice
    INTO v_poll_id, v_is_multiple_choice
    FROM public.polysuara_poll_options o
    JOIN public.polysuara_polls p ON o.poll_id = p.id
    WHERE o.id = p_option_id;

    IF v_poll_id IS NULL THEN
        RAISE EXCEPTION 'Option not found';
    END IF;

    -- Check if already voted
    SELECT EXISTS (
        SELECT 1 
        FROM public.polysuara_poll_votes
        WHERE option_id = p_option_id AND user_id = v_user_id
    ) INTO v_voted_already;

    IF v_voted_already THEN
        -- Remove the vote
        DELETE FROM public.polysuara_poll_votes
        WHERE option_id = p_option_id AND user_id = v_user_id;
        
        v_action := 'removed';
    ELSE
        -- If single choice, remove other votes in this poll
        IF NOT v_is_multiple_choice THEN
            -- Collect option_ids we are removing votes from
            SELECT COALESCE(ARRAY_AGG(option_id), ARRAY[]::UUID[])
            INTO v_removed_options
            FROM public.polysuara_poll_votes
            WHERE poll_id = v_poll_id AND user_id = v_user_id;

            DELETE FROM public.polysuara_poll_votes
            WHERE poll_id = v_poll_id AND user_id = v_user_id;
        END IF;

        -- Insert the new vote
        INSERT INTO public.polysuara_poll_votes (poll_id, option_id, user_id)
        VALUES (v_poll_id, p_option_id, v_user_id);

        v_action := 'added';
    END IF;

    RETURN json_build_object(
        'action', v_action,
        'option_id', p_option_id,
        'removed_from', v_removed_options
    );
END;
$$;

-- 4. Create get_my_polysuara_ids RPC function
CREATE OR REPLACE FUNCTION public.get_my_polysuara_ids()
RETURNS TABLE (id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pc.id
  FROM public.polysuara_confessions pc
  WHERE pc.author_id = (SELECT auth.uid());
END;
$$;

-- 5. Create get_trending_polysuara_tags RPC function
CREATE OR REPLACE FUNCTION public.get_trending_polysuara_tags()
RETURNS TABLE (tag TEXT, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.tag, COUNT(*)::BIGINT AS count
  FROM (
    SELECT UNNEST(pc.hashtags) AS tag
    FROM public.polysuara_confessions pc
    WHERE pc.created_at >= NOW() - INTERVAL '7 days'
      AND pc.is_archived = false
  ) t
  GROUP BY t.tag
  ORDER BY count DESC, t.tag ASC
  LIMIT 10;
END;
$$;

-- 6. Create polysuara_notif_optout table, enable RLS and add policies
CREATE TABLE IF NOT EXISTS public.polysuara_notif_optout (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.polysuara_notif_optout ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to read own opt-out" ON public.polysuara_notif_optout;
CREATE POLICY "Allow users to read own opt-out" ON public.polysuara_notif_optout
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Allow users to insert own opt-out" ON public.polysuara_notif_optout;
CREATE POLICY "Allow users to insert own opt-out" ON public.polysuara_notif_optout
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Allow users to delete own opt-out" ON public.polysuara_notif_optout;
CREATE POLICY "Allow users to delete own opt-out" ON public.polysuara_notif_optout
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- 7. Hardening RLS policies for polls and votes, dropping zzz_temp_open_auth
DROP POLICY IF EXISTS "zzz_temp_open_auth" ON public.polysuara_polls;
DROP POLICY IF EXISTS "zzz_temp_open_auth" ON public.polysuara_poll_options;
DROP POLICY IF EXISTS "zzz_temp_open_auth" ON public.polysuara_poll_votes;

DROP POLICY IF EXISTS "Allow public read polls" ON public.polysuara_polls;
DROP POLICY IF EXISTS "Allow authenticated insert polls" ON public.polysuara_polls;

CREATE POLICY "Allow public read polls" ON public.polysuara_polls 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow authenticated insert polls" ON public.polysuara_polls 
  FOR INSERT 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow public read poll options" ON public.polysuara_poll_options;
DROP POLICY IF EXISTS "Allow authenticated insert poll options" ON public.polysuara_poll_options;

CREATE POLICY "Allow public read poll options" ON public.polysuara_poll_options 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow authenticated insert poll options" ON public.polysuara_poll_options 
  FOR INSERT 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow public read poll votes" ON public.polysuara_poll_votes;
DROP POLICY IF EXISTS "Allow authenticated insert poll votes" ON public.polysuara_poll_votes;
DROP POLICY IF EXISTS "Allow authenticated delete own poll votes" ON public.polysuara_poll_votes;

CREATE POLICY "Allow read own poll votes" ON public.polysuara_poll_votes 
  FOR SELECT 
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Allow authenticated insert poll votes" ON public.polysuara_poll_votes 
  FOR INSERT 
  WITH CHECK ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id);

CREATE POLICY "Allow authenticated delete own poll votes" ON public.polysuara_poll_votes 
  FOR DELETE 
  USING ((SELECT auth.uid()) = user_id);

-- 8. Add missing indexes for FK columns on polysuara_poll_votes to comply with guidelines
CREATE INDEX IF NOT EXISTS idx_polysuara_poll_votes_user_id ON public.polysuara_poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_polysuara_poll_votes_option_id ON public.polysuara_poll_votes(option_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
