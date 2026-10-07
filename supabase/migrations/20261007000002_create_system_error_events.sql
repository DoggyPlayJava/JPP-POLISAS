-- system_error_events: crash & error tracker for in-app observability
CREATE TABLE IF NOT EXISTS public.system_error_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    error_type text NOT NULL,           -- uncaughtException | unhandledRejection | http_error | db_error
    message text NOT NULL,
    stack text,
    endpoint text,                       -- route/path jika ada
    method text,
    status_code integer,
    user_agent text,
    ip text,
    severity text NOT NULL DEFAULT 'ERROR' CHECK (severity IN ('WARNING','ERROR','CRITICAL')),
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_error_events_occurred ON system_error_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_error_events_severity ON system_error_events (severity);
CREATE INDEX IF NOT EXISTS idx_system_error_events_type ON system_error_events (error_type);

ALTER TABLE public.system_error_events ENABLE ROW LEVEL SECURITY;

-- Admin JPP boleh baca (untuk dashboard telemetry); server guna service role (bypass RLS)
DROP POLICY IF EXISTS "error_events_select" ON public.system_error_events;
CREATE POLICY "error_events_select" ON public.system_error_events
    FOR SELECT TO authenticated
    USING (is_jpp_admin(auth.uid()));

DROP POLICY IF EXISTS "error_events_insert" ON public.system_error_events;
CREATE POLICY "error_events_insert" ON public.system_error_events
    FOR INSERT TO authenticated
    WITH CHECK (true);
