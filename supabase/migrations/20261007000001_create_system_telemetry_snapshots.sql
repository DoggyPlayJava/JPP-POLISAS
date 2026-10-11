-- Create system_telemetry_snapshots table (referenced by server.js daily cron + /api/system-telemetry)
-- Previously missing — caused "Belum ada data sejarah" in JPP Telemetry page.
CREATE TABLE IF NOT EXISTS public.system_telemetry_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date date NOT NULL UNIQUE,
    server_uptime_seconds numeric,
    server_rss_mb numeric,
    server_heap_used_mb numeric,
    server_heap_total_mb numeric,
    m_profiles integer DEFAULT 0,
    m_clubs integer DEFAULT 0,
    m_club_activities integer DEFAULT 0,
    m_club_reports integer DEFAULT 0,
    m_club_memberships integer DEFAULT 0,
    m_kebajikan_tickets integer DEFAULT 0,
    m_polymart_orders integer DEFAULT 0,
    m_polyrider_jobs integer DEFAULT 0,
    m_polyrider_sos integer DEFAULT 0,
    m_businesses integer DEFAULT 0,
    m_business_products integer DEFAULT 0,
    m_business_transactions integer DEFAULT 0,
    m_supsas_fixtures integer DEFAULT 0,
    m_karnival_booths integer DEFAULT 0,
    m_klk_residency integer DEFAULT 0,
    m_takwim_events integer DEFAULT 0,
    m_push_subscriptions integer DEFAULT 0,
    m_notifications integer DEFAULT 0,
    m_akademik_cgpa integer DEFAULT 0,
    m_akademik_pencapaian integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS (consistent with other tables)
ALTER TABLE public.system_telemetry_snapshots ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view snapshots (JPP page fetches via server, but keep policy safe)
DROP POLICY IF EXISTS "telemetry_snapshots_select" ON public.system_telemetry_snapshots;
CREATE POLICY "telemetry_snapshots_select" ON public.system_telemetry_snapshots
    FOR SELECT TO authenticated USING (true);
