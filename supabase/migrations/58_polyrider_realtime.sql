-- Migration 58: Enable Supabase Realtime for PolyRider Bids, Jobs, and Chats
-- This is necessary to fix the 30-second delay in receiving bids on the frontend.

BEGIN;

-- Create the supabase_realtime publication if it does not exist (usually it does by default in Supabase)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

-- Add PolyRider tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.polyrider_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polyrider_bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polyrider_chats;

COMMIT;
