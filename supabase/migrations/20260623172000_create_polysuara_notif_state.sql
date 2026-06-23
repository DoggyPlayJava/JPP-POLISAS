-- Migration: Create PolySuara Notification State Table
-- Description: Creates the missing polysuara_notif_state table to track notification thresholds, cooldowns, and last notified confession.

CREATE TABLE IF NOT EXISTS public.polysuara_notif_state (
    id INT PRIMARY KEY,
    upvote_threshold INT DEFAULT 10,
    last_notified_at TIMESTAMPTZ,
    last_confession_id UUID REFERENCES public.polysuara_confessions(id) ON DELETE SET NULL
);

-- Every FK column must have a corresponding index
CREATE INDEX IF NOT EXISTS idx_polysuara_notif_state_last_conf_id ON public.polysuara_notif_state (last_confession_id);

-- Initialize the single state row (id = 1)
INSERT INTO public.polysuara_notif_state (id, upvote_threshold, last_notified_at, last_confession_id)
VALUES (1, 10, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.polysuara_notif_state ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated read polysuara_notif_state" ON public.polysuara_notif_state;
DROP POLICY IF EXISTS "Allow JPP admins to write polysuara_notif_state" ON public.polysuara_notif_state;

-- RLS Policies
-- SELECT: Allow any authenticated user to read (necessary for config checks)
CREATE POLICY "Allow authenticated read polysuara_notif_state" ON public.polysuara_notif_state
    FOR SELECT
    USING (((SELECT auth.uid()) IS NOT NULL));

-- INSERT/UPDATE/DELETE: Restricted to JPP, Admin, or Super Admin
CREATE POLICY "Allow JPP admins to write polysuara_notif_state" ON public.polysuara_notif_state
    FOR ALL
    USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))))
    WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
