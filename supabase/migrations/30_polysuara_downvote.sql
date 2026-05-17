-- ==========================================
-- Migration: PolySuara Community Downvote / Karma System
-- Applied: 18 Mei 2026
-- ==========================================

-- 1. Add tracking columns to confessions
ALTER TABLE public.polysuara_confessions
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_hidden_by_community BOOLEAN DEFAULT false;

-- 2. Create the downvotes tracking table
CREATE TABLE IF NOT EXISTS public.polysuara_downvotes (
    confession_id UUID NOT NULL REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (confession_id, user_id)
);

-- Index for querying user's downvotes (per §15.4: every FK needs an index)
CREATE INDEX IF NOT EXISTS idx_polysuara_downvotes_user ON public.polysuara_downvotes(user_id);
CREATE INDEX IF NOT EXISTS idx_polysuara_downvotes_confession ON public.polysuara_downvotes(confession_id);

-- 3. RLS for Downvotes table (per §15.1: use (SELECT auth.uid()))
ALTER TABLE public.polysuara_downvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "polysuara_downvotes_select" ON public.polysuara_downvotes FOR SELECT
  USING (true);

CREATE POLICY "polysuara_downvotes_insert" ON public.polysuara_downvotes FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- DELETE: user can remove own downvote OR JPP admin can clear (for Restore flow)
CREATE POLICY "polysuara_downvotes_delete" ON public.polysuara_downvotes FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
    OR is_jpp_admin((SELECT auth.uid()))
  );

-- 4. Update Confessions SELECT RLS to hide community-hidden posts from students
DROP POLICY IF EXISTS "polysuara_confessions_select" ON public.polysuara_confessions;
CREATE POLICY "polysuara_confessions_select" ON public.polysuara_confessions FOR SELECT
  USING (
    (is_approved = true AND is_hidden_by_community = false)
    OR is_jpp_admin((SELECT auth.uid()))
  );

-- 5. RPC: Toggle Downvote with Auto-Hide Logic
CREATE OR REPLACE FUNCTION public.toggle_polysuara_downvote(p_confession_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_exists BOOLEAN;
    v_upvotes INT;
    v_downvotes INT;
    v_total_votes INT;
    v_just_hidden BOOLEAN := false;
BEGIN
    v_user_id := (SELECT auth.uid());
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM public.polysuara_downvotes 
        WHERE confession_id = p_confession_id AND user_id = v_user_id
    ) INTO v_exists;

    IF v_exists THEN
        DELETE FROM public.polysuara_downvotes 
        WHERE confession_id = p_confession_id AND user_id = v_user_id;
        
        UPDATE public.polysuara_confessions 
        SET downvotes = GREATEST(downvotes - 1, 0)
        WHERE id = p_confession_id;
    ELSE
        -- Remove upvote if exists (mutual exclusion)
        DELETE FROM public.polysuara_upvotes
        WHERE confession_id = p_confession_id AND user_id = v_user_id;
        
        IF FOUND THEN
            UPDATE public.polysuara_confessions 
            SET upvotes = GREATEST(upvotes - 1, 0)
            WHERE id = p_confession_id;
        END IF;

        INSERT INTO public.polysuara_downvotes (confession_id, user_id) 
        VALUES (p_confession_id, v_user_id);
        
        UPDATE public.polysuara_confessions 
        SET downvotes = downvotes + 1 
        WHERE id = p_confession_id
        RETURNING upvotes, downvotes INTO v_upvotes, v_downvotes;

        -- AUTO-HIDE: Total >= 40 AND Downvote > 60%
        v_total_votes := v_upvotes + v_downvotes;
        
        IF v_total_votes >= 40 AND (v_downvotes::FLOAT / v_total_votes::FLOAT) > 0.60 THEN
            UPDATE public.polysuara_confessions
            SET is_hidden_by_community = true
            WHERE id = p_confession_id AND is_hidden_by_community = false;
            
            IF FOUND THEN
                v_just_hidden := true;
            END IF;
        END IF;
    END IF;

    RETURN v_just_hidden;
END;
$$;

-- 6. Update UPVOTE RPC with mutual exclusion
CREATE OR REPLACE FUNCTION public.toggle_polysuara_upvote(p_confession_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_exists BOOLEAN;
BEGIN
    v_user_id := (SELECT auth.uid());
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM public.polysuara_upvotes 
        WHERE confession_id = p_confession_id AND user_id = v_user_id
    ) INTO v_exists;

    IF v_exists THEN
        DELETE FROM public.polysuara_upvotes 
        WHERE confession_id = p_confession_id AND user_id = v_user_id;
        
        UPDATE public.polysuara_confessions 
        SET upvotes = GREATEST(upvotes - 1, 0)
        WHERE id = p_confession_id;
    ELSE
        DELETE FROM public.polysuara_downvotes
        WHERE confession_id = p_confession_id AND user_id = v_user_id;
        
        IF FOUND THEN
            UPDATE public.polysuara_confessions 
            SET downvotes = GREATEST(downvotes - 1, 0)
            WHERE id = p_confession_id;
        END IF;

        INSERT INTO public.polysuara_upvotes (confession_id, user_id) 
        VALUES (p_confession_id, v_user_id);
        
        UPDATE public.polysuara_confessions 
        SET upvotes = upvotes + 1 
        WHERE id = p_confession_id;
    END IF;
END;
$$;

-- 7. RPC: Admin restore hidden confession (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.restore_hidden_confession(p_confession_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := (SELECT auth.uid());
    
    IF NOT is_jpp_admin(v_user_id) THEN
        RAISE EXCEPTION 'Not authorized — JPP admin only';
    END IF;

    UPDATE public.polysuara_confessions
    SET is_hidden_by_community = false,
        is_approved = true,
        downvotes = 0
    WHERE id = p_confession_id;
    
    DELETE FROM public.polysuara_downvotes
    WHERE confession_id = p_confession_id;
END;
$$;
