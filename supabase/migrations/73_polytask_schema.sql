-- Create PolyTask Tables
CREATE TYPE polytask_job_status AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE polytask_bid_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

CREATE TABLE IF NOT EXISTS public.polytask_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    budget NUMERIC(10, 2) NOT NULL DEFAULT 0,
    location TEXT NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,
    status polytask_job_status NOT NULL DEFAULT 'OPEN',
    assigned_tasker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.polytask_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.polytask_jobs(id) ON DELETE CASCADE,
    tasker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    proposal_note TEXT,
    status polytask_bid_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.polytask_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.polytask_jobs(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_polytask_jobs_requester ON public.polytask_jobs(requester_id);
CREATE INDEX IF NOT EXISTS idx_polytask_jobs_status ON public.polytask_jobs(status);
CREATE INDEX IF NOT EXISTS idx_polytask_bids_job_id ON public.polytask_bids(job_id);
CREATE INDEX IF NOT EXISTS idx_polytask_bids_tasker_id ON public.polytask_bids(tasker_id);

-- Enable RLS
ALTER TABLE public.polytask_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polytask_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polytask_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for polytask_jobs
CREATE POLICY "Semua pelajar boleh lihat tugasan OPEN" ON public.polytask_jobs
    FOR SELECT USING (
        status = 'OPEN' 
        OR requester_id = (SELECT auth.uid()) 
        OR assigned_tasker_id = (SELECT auth.uid())
        OR is_jpp_admin((SELECT auth.uid()))
    );

CREATE POLICY "Pelajar boleh cipta tugasan" ON public.polytask_jobs
    FOR INSERT WITH CHECK (requester_id = (SELECT auth.uid()));

CREATE POLICY "Pelajar boleh kemaskini tugasan sendiri" ON public.polytask_jobs
    FOR UPDATE USING (
        requester_id = (SELECT auth.uid()) OR is_jpp_admin((SELECT auth.uid()))
    ) WITH CHECK (
        requester_id = (SELECT auth.uid()) OR is_jpp_admin((SELECT auth.uid()))
    );

-- RLS Policies for polytask_bids
CREATE POLICY "Peminta boleh lihat bidaan untuk tugasannya" ON public.polytask_bids
    FOR SELECT USING (
        tasker_id = (SELECT auth.uid()) OR 
        job_id IN (SELECT id FROM public.polytask_jobs WHERE requester_id = (SELECT auth.uid())) OR
        is_jpp_admin((SELECT auth.uid()))
    );

CREATE POLICY "Pelajar boleh bida jika tugasan OPEN" ON public.polytask_bids
    FOR INSERT WITH CHECK (
        tasker_id = (SELECT auth.uid()) AND
        job_id IN (SELECT id FROM public.polytask_jobs WHERE status = 'OPEN')
    );

CREATE POLICY "Tasker boleh tarik balik atau kemaskini bidaan" ON public.polytask_bids
    FOR UPDATE USING (
        tasker_id = (SELECT auth.uid()) AND status = 'PENDING'
    ) WITH CHECK (
        tasker_id = (SELECT auth.uid())
    );

CREATE POLICY "Peminta boleh ACCEPT bidaan" ON public.polytask_bids
    FOR UPDATE USING (
        job_id IN (SELECT id FROM public.polytask_jobs WHERE requester_id = (SELECT auth.uid()) AND status = 'OPEN') AND status = 'PENDING'
    ) WITH CHECK (
        job_id IN (SELECT id FROM public.polytask_jobs WHERE requester_id = (SELECT auth.uid()))
    );

-- RLS Policies for polytask_reviews
CREATE POLICY "Semua boleh lihat review" ON public.polytask_reviews
    FOR SELECT USING (true);

CREATE POLICY "Boleh tulis review untuk job yang siap" ON public.polytask_reviews
    FOR INSERT WITH CHECK (
        reviewer_id = (SELECT auth.uid()) AND
        job_id IN (SELECT id FROM public.polytask_jobs WHERE status = 'COMPLETED')
    );

-- Database Trigger Automatik (Bidaan Diterima)
CREATE OR REPLACE FUNCTION handle_polytask_bid_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when a bid status changes to 'ACCEPTED'
    IF NEW.status = 'ACCEPTED' AND OLD.status != 'ACCEPTED' THEN
        
        -- 1. Tolak bidaan lain
        UPDATE public.polytask_bids 
        SET status = 'REJECTED' 
        WHERE job_id = NEW.job_id AND id != NEW.id;
        
        -- 2. Kemas kini status tugasan & tetapkan pekerja
        UPDATE public.polytask_jobs
        SET status = 'IN_PROGRESS',
            assigned_tasker_id = NEW.tasker_id,
            updated_at = NOW()
        WHERE id = NEW.job_id;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_polytask_bid_acceptance ON public.polytask_bids;
CREATE TRIGGER trigger_polytask_bid_acceptance
    AFTER UPDATE ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION handle_polytask_bid_acceptance();
