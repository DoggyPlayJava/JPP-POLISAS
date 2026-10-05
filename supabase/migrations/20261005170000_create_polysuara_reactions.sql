-- Migration: 20261005170000_create_polysuara_reactions.sql
-- Description: Creates polysuara_reactions table to store multi-emoji reactions

CREATE TABLE IF NOT EXISTS public.polysuara_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    confession_id UUID NOT NULL REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_polysuara_user_reaction UNIQUE(confession_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_polysuara_reactions_confession_id ON public.polysuara_reactions(confession_id);
CREATE INDEX IF NOT EXISTS idx_polysuara_reactions_user_id ON public.polysuara_reactions(user_id);

ALTER TABLE public.polysuara_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read reactions" ON public.polysuara_reactions
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated add reaction" ON public.polysuara_reactions
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Allow authenticated remove reaction" ON public.polysuara_reactions
    FOR DELETE USING ((SELECT auth.uid()) = user_id);
