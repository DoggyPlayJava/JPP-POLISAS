-- ==========================================
-- FASA 2: LOGIK PERNIAGAAN & INTEGRITI
-- ==========================================

-- 1. Penilaian Dua Hala (Two-Way Reviews)
ALTER TABLE public.polytask_reviews
ADD COLUMN IF NOT EXISTS reviewer_role TEXT CHECK (reviewer_role IN ('REQUESTER', 'TASKER'));

-- Update sedia ada (jika ada) ke REQUESTER
UPDATE public.polytask_reviews SET reviewer_role = 'REQUESTER' WHERE reviewer_role IS NULL;

-- 2. Cadangan Harga Dinamik (RPC)
CREATE OR REPLACE FUNCTION get_average_budget_by_category(p_category TEXT)
RETURNS NUMERIC AS $$
DECLARE
    avg_budget NUMERIC;
BEGIN
    SELECT COALESCE(AVG(budget), 0) INTO avg_budget
    FROM public.polytask_jobs
    WHERE category = p_category AND status IN ('COMPLETED', 'IN_PROGRESS', 'CLOSED');
    
    RETURN avg_budget;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- FASA 3: PRESTASI & INFRASTRUKTUR
-- ==========================================

-- 3. Pengarkiban Automatik 3-Bulan
-- Sediakan jadual arkib
CREATE TABLE IF NOT EXISTS public.polytask_jobs_archive (
    id UUID PRIMARY KEY,
    requester_id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    budget NUMERIC,
    location TEXT,
    deadline TIMESTAMPTZ,
    status TEXT,
    assigned_tasker_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fungsi memindahkan kerja lama
CREATE OR REPLACE FUNCTION archive_old_polytask_jobs()
RETURNS void AS $$
BEGIN
    -- Salin ke arkib
    INSERT INTO public.polytask_jobs_archive (id, requester_id, title, description, category, budget, location, deadline, status, assigned_tasker_id, created_at, updated_at)
    SELECT id, requester_id, title, description, category, budget, location, deadline, status, assigned_tasker_id, created_at, updated_at
    FROM public.polytask_jobs
    WHERE status IN ('COMPLETED', 'CANCELLED') 
    AND updated_at < NOW() - INTERVAL '3 months';

    -- Padam dari jadual aktif
    DELETE FROM public.polytask_jobs
    WHERE status IN ('COMPLETED', 'CANCELLED') 
    AND updated_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Had Kadar Pembidaan / Rate Limiting (Maksimum 10 bidaan per 1 jam)
CREATE OR REPLACE FUNCTION check_polytask_bid_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_bids_count INT;
BEGIN
    SELECT COUNT(*) INTO recent_bids_count
    FROM public.polytask_bids
    WHERE tasker_id = NEW.tasker_id
    AND created_at > NOW() - INTERVAL '1 hour';

    IF recent_bids_count >= 10 THEN
        RAISE EXCEPTION 'Rate limit exceeded: You can only place 10 bids per hour.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_polytask_bid_rate_limit ON public.polytask_bids;
CREATE TRIGGER trigger_check_polytask_bid_rate_limit
    BEFORE INSERT ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION check_polytask_bid_rate_limit();


-- ==========================================
-- FASA 4: PENTADBIRAN & ANALITIK KESELAMATAN
-- ==========================================

-- 5. Audit Log Forensik PolyTask (Tarik diri, Pertikaian)
CREATE OR REPLACE FUNCTION log_polytask_critical_actions()
RETURNS TRIGGER AS $$
BEGIN
    -- Jika Tasker tarik diri
    IF NEW.status = 'OPEN' AND OLD.status = 'IN_PROGRESS' AND OLD.assigned_tasker_id IS NOT NULL AND NEW.assigned_tasker_id IS NULL THEN
        INSERT INTO public.admin_audit_logs (actor_id, action_type, table_name, record_id, old_data, new_data)
        VALUES (OLD.assigned_tasker_id, 'UPDATE', 'polytask_jobs', OLD.id::TEXT, row_to_json(OLD), row_to_json(NEW));
    END IF;

    -- Jika status jadi DISPUTED
    IF NEW.status = 'DISPUTED' AND OLD.status != 'DISPUTED' THEN
        INSERT INTO public.admin_audit_logs (actor_id, action_type, table_name, record_id, old_data, new_data)
        VALUES (COALESCE(auth.uid(), OLD.requester_id), 'UPDATE', 'polytask_jobs', OLD.id::TEXT, row_to_json(OLD), row_to_json(NEW));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_polytask_critical_actions ON public.polytask_jobs;
CREATE TRIGGER trigger_log_polytask_critical_actions
    AFTER UPDATE ON public.polytask_jobs
    FOR EACH ROW
    EXECUTE FUNCTION log_polytask_critical_actions();
