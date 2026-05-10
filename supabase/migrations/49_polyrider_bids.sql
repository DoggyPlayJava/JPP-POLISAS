-- Migration 49: PolyRider Bidding System
-- Creates polyrider_bids table for InDrive-style bidding system.

CREATE TABLE IF NOT EXISTS public.polyrider_bids (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.polyrider_jobs(id) ON DELETE CASCADE,
    rider_id UUID NOT NULL REFERENCES public.polyrider_profiles(user_id) ON DELETE CASCADE,
    bid_amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies for polyrider_bids
ALTER TABLE public.polyrider_bids ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view all bids for jobs
CREATE POLICY "Public can view bids" 
    ON public.polyrider_bids FOR SELECT 
    USING (true);

-- Policy: Riders can insert their own bids
CREATE POLICY "Riders can insert bids" 
    ON public.polyrider_bids FOR INSERT 
    WITH CHECK (rider_id = auth.uid());

-- Policy: Admin can manage all bids
CREATE POLICY "Admin can manage all bids"
    ON public.polyrider_bids FOR ALL
    USING (public.is_klk_or_admin(auth.uid()));

-- Add RLS to allow students to update bids (Accepting a bid)
CREATE POLICY "Students can update bids for their jobs"
    ON public.polyrider_bids FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.polyrider_jobs
            WHERE polyrider_jobs.id = polyrider_bids.job_id
            AND polyrider_jobs.student_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.polyrider_jobs
            WHERE polyrider_jobs.id = polyrider_bids.job_id
            AND polyrider_jobs.student_id = auth.uid()
        )
    );
