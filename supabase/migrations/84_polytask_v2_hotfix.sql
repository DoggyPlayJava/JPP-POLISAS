-- ============================================================
-- PolyTask v2.0 Hotfix Migration
-- Applied: 17 Mei 2026
-- Fixes: Missing DB objects from migration 83 + Security
-- ============================================================

-- FIX 1: proof_image_url column (migration 83 didn't apply to live DB)
ALTER TABLE public.polytask_jobs
ADD COLUMN IF NOT EXISTS proof_image_url TEXT;

-- FIX 2: Storage bucket for proof of work
INSERT INTO storage.buckets (id, name, public)
VALUES ('polytask_proofs', 'polytask_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Semua boleh lihat bukti" ON storage.objects;
  DROP POLICY IF EXISTS "Pelajar boleh upload bukti" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Semua boleh lihat bukti polytask" ON storage.objects
    FOR SELECT USING (bucket_id = 'polytask_proofs');

CREATE POLICY "Pelajar boleh upload bukti polytask" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'polytask_proofs' AND auth.uid() IS NOT NULL);

-- FIX 3: RLS for tasker proof upload
DO $$
BEGIN
  DROP POLICY IF EXISTS "Tasker boleh muat naik bukti kerja" ON public.polytask_jobs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Tasker boleh muat naik bukti kerja" ON public.polytask_jobs
    FOR UPDATE USING (
        assigned_tasker_id = (SELECT auth.uid()) AND status = 'IN_PROGRESS'
    ) WITH CHECK (
        assigned_tasker_id = (SELECT auth.uid())
    );

-- FIX 4: PG Cron Job for monthly archive (setiap 1hb 3AM UTC)
SELECT cron.schedule(
  'polytask-archive-monthly',
  '0 3 1 * *',
  $$SELECT archive_old_polytask_jobs()$$
);

-- ============================================================
-- SECURITY: search_path hardening for all PolyTask functions
-- Ref: Supabase Lint #0011 function_search_path_mutable
-- ============================================================

CREATE OR REPLACE FUNCTION update_polytask_completion_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        IF NEW.assigned_tasker_id IS NOT NULL THEN
            UPDATE public.profiles
            SET polytask_completed_bids = polytask_completed_bids + 1
            WHERE id = NEW.assigned_tasker_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION handle_polytask_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'WITHDRAWN' AND OLD.status = 'ACCEPTED' THEN
        UPDATE public.profiles
        SET polytask_cancellations = polytask_cancellations + 1
        WHERE id = NEW.tasker_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_average_budget_by_category(p_category TEXT)
RETURNS NUMERIC AS $$
DECLARE avg_budget NUMERIC;
BEGIN
    SELECT COALESCE(AVG(budget), 0) INTO avg_budget
    FROM public.polytask_jobs
    WHERE category = p_category AND status IN ('COMPLETED', 'IN_PROGRESS', 'CLOSED');
    RETURN avg_budget;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION archive_old_polytask_jobs()
RETURNS void AS $$
BEGIN
    INSERT INTO public.polytask_jobs_archive (id, requester_id, title, description, category, budget, location, deadline, status, assigned_tasker_id, created_at, updated_at)
    SELECT id, requester_id, title, description, category, budget, location, deadline, status, assigned_tasker_id, created_at, updated_at
    FROM public.polytask_jobs
    WHERE status IN ('COMPLETED', 'CANCELLED') AND updated_at < NOW() - INTERVAL '3 months';

    DELETE FROM public.polytask_jobs
    WHERE status IN ('COMPLETED', 'CANCELLED') AND updated_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION check_polytask_bid_rate_limit()
RETURNS TRIGGER AS $$
DECLARE recent_bids_count INT;
BEGIN
    SELECT COUNT(*) INTO recent_bids_count
    FROM public.polytask_bids
    WHERE tasker_id = NEW.tasker_id AND created_at > NOW() - INTERVAL '1 hour';

    IF recent_bids_count >= 10 THEN
        RAISE EXCEPTION 'Rate limit exceeded: You can only place 10 bids per hour.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION log_polytask_critical_actions()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'OPEN' AND OLD.status = 'IN_PROGRESS' AND OLD.assigned_tasker_id IS NOT NULL AND NEW.assigned_tasker_id IS NULL THEN
        INSERT INTO public.admin_audit_logs (actor_id, action_type, table_name, record_id, old_data, new_data)
        VALUES (OLD.assigned_tasker_id, 'UPDATE', 'polytask_jobs', OLD.id::TEXT, row_to_json(OLD), row_to_json(NEW));
    END IF;
    IF NEW.status = 'DISPUTED' AND OLD.status != 'DISPUTED' THEN
        INSERT INTO public.admin_audit_logs (actor_id, action_type, table_name, record_id, old_data, new_data)
        VALUES (COALESCE(auth.uid(), OLD.requester_id), 'UPDATE', 'polytask_jobs', OLD.id::TEXT, row_to_json(OLD), row_to_json(NEW));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_polytask_admin(uid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM public.profiles WHERE id = uid AND role IN ('JPP', 'SUPER_ADMIN_JPP'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_active_polytask_count()
RETURNS integer AS $$
BEGIN
    RETURN (SELECT count(*)::integer FROM public.polytask_jobs WHERE status IN ('OPEN', 'IN_PROGRESS'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION handle_polytask_bid_acceptance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.status = 'ACCEPTED' AND OLD.status != 'ACCEPTED' THEN
        UPDATE public.polytask_bids SET status = 'REJECTED' WHERE job_id = NEW.job_id AND id != NEW.id;
        UPDATE public.polytask_jobs SET status = 'IN_PROGRESS', assigned_tasker_id = NEW.tasker_id, updated_at = NOW() WHERE id = NEW.job_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION process_polytask_appeal(p_appeal_id uuid, p_approve boolean, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('MAJLIS_TERTINGGI','EXCO_KEBAJIKAN','EXCO_KAMSIS','EXCO_KEUSAHAWANAN','DEVELOPER')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.polytask_appeals SET status = CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END, admin_notes = p_notes, resolved_at = NOW(), resolved_by = auth.uid() WHERE id = p_appeal_id;
  IF p_approve THEN
    UPDATE public.profiles SET polyrider_suspended_until = NULL WHERE id = (SELECT user_id FROM public.polytask_appeals WHERE id = p_appeal_id);
    UPDATE public.polytask_profiles SET status = 'APPROVED' WHERE user_id = (SELECT user_id FROM public.polytask_appeals WHERE id = p_appeal_id);
  END IF;
END;
$$;

-- SECURITY: Tighten RLS "Tasker boleh tarik diri" (ganti WITH CHECK true)
DROP POLICY IF EXISTS "Tasker boleh tarik diri dari tugasan" ON public.polytask_jobs;
CREATE POLICY "Tasker boleh tarik diri dari tugasan" ON public.polytask_jobs
    FOR UPDATE USING (
        assigned_tasker_id = (SELECT auth.uid()) AND status = 'IN_PROGRESS'
    ) WITH CHECK (
        assigned_tasker_id = (SELECT auth.uid()) OR assigned_tasker_id IS NULL
    );
