-- Migration: Create admin_audit_logs table and system_logs view
-- Created at: 2026-06-21 18:30:00

-- 1. Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_id TEXT,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for FK actor_id to comply with database rules
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_id ON public.admin_audit_logs(actor_id);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for admin_audit_logs
DROP POLICY IF EXISTS "Allow select admin_audit_logs for admins" ON public.admin_audit_logs;
CREATE POLICY "Allow select admin_audit_logs for admins" ON public.admin_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('JPP', 'SUPER_ADMIN_JPP')
    )
  );

DROP POLICY IF EXISTS "Allow authenticated insert admin_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "Allow authenticated insert admin_audit_logs" ON public.admin_audit_logs
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- 2. Create system_logs view combining admin_audit_logs and club_logs
CREATE OR REPLACE VIEW public.system_logs AS
-- Part 1: Admin audit logs
SELECT 
    l.id AS id,
    l.action_type AS action_type,
    l.module AS entity_type,
    l.entity_id AS entity_id,
    l.description AS details,
    NULL::TEXT AS club_name,
    l.created_at AS created_at,
    p.full_name AS full_name,
    p.role AS role,
    l.metadata AS metadata
FROM public.admin_audit_logs l
LEFT JOIN public.profiles p ON l.actor_id = p.id
WHERE EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = (SELECT auth.uid())
    AND role IN ('JPP', 'SUPER_ADMIN_JPP')
)

UNION ALL

-- Part 2: Club logs
SELECT 
    cl.id AS id,
    cl.action_type AS action_type,
    'KELAB'::TEXT AS entity_type,
    cl.club_id::TEXT AS entity_id,
    cl.description AS details,
    c.name AS club_name,
    cl.created_at AS created_at,
    cl.actor_name AS full_name,
    (SELECT role FROM public.profiles WHERE id = cl.actor_id) AS role,
    cl.metadata AS metadata
FROM public.club_logs cl
LEFT JOIN public.clubs c ON cl.club_id = c.id
WHERE EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = (SELECT auth.uid())
    AND role IN ('JPP', 'SUPER_ADMIN_JPP')
);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
