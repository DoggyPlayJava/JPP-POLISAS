-- Migration 60: Remove unnecessary tables from Realtime publication
-- Root cause: Server crash on 12/5/2026 caused by WAL accumulation from
-- realtime.list_changes() polling 9 tables every 300ms (68K calls/6.5hrs).
-- Removing zero-activity tables reduces WAL overhead on self-hosted server.

ALTER PUBLICATION supabase_realtime DROP TABLE public.polyrider_sos_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.polyrider_appeals;

-- Remaining Realtime tables (7):
-- kebajikan_tickets          (chat support)
-- kebajikan_ticket_comments  (chat support)
-- notifications              (live notifications)
-- system_settings            (live config)
-- polyrider_jobs              (live ride tracking)
-- polyrider_bids              (live bid updates)
-- polyrider_chats             (live chat)
