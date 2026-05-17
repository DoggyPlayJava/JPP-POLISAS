-- Tambah kolum metrik pembatalan untuk PolyTask
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS polytask_cancellations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS polytask_completed_bids INTEGER DEFAULT 0;

-- RPC untuk mengemaskini metrik apabila tugasan selesai
CREATE OR REPLACE FUNCTION update_polytask_completion_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        -- Tambah +1 pada polytask_completed_bids untuk tasker yang berjaya siapkan kerja
        IF NEW.assigned_tasker_id IS NOT NULL THEN
            UPDATE public.profiles
            SET polytask_completed_bids = polytask_completed_bids + 1
            WHERE id = NEW.assigned_tasker_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_polytask_completion_metrics ON public.polytask_jobs;
CREATE TRIGGER trigger_update_polytask_completion_metrics
    AFTER UPDATE ON public.polytask_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_polytask_completion_metrics();

-- RLS Policy untuk Tasker membatalkan tugasan
CREATE POLICY "Tasker boleh tarik diri dari tugasan" ON public.polytask_jobs
    FOR UPDATE USING (
        assigned_tasker_id = (SELECT auth.uid()) AND status = 'IN_PROGRESS'
    ) WITH CHECK (
        -- membenarkan tasker set assigned_tasker_id = null
        true
    );

-- RLS Policy untuk Tasker membatalkan (WITHDRAW) bidaan yang sudah diterima
CREATE POLICY "Tasker boleh WITHDRAW bidaan yang sudah diterima" ON public.polytask_bids
    FOR UPDATE USING (
        tasker_id = (SELECT auth.uid()) AND status = 'ACCEPTED'
    ) WITH CHECK (
        tasker_id = (SELECT auth.uid())
    );

-- Trigger untuk menaikkan cancellation_count bila bid WITHDRAWN
CREATE OR REPLACE FUNCTION handle_polytask_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'WITHDRAWN' AND OLD.status = 'ACCEPTED' THEN
        -- Tambah +1 pada cancellation_count
        UPDATE public.profiles
        SET polytask_cancellations = polytask_cancellations + 1
        WHERE id = NEW.tasker_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_handle_polytask_cancellation ON public.polytask_bids;
CREATE TRIGGER trigger_handle_polytask_cancellation
    AFTER UPDATE ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION handle_polytask_cancellation();
