-- Add DISPUTED status if not exists
COMMIT;
ALTER TYPE polytask_job_status ADD VALUE IF NOT EXISTS 'DISPUTED';
BEGIN;

-- Create polytask_disputes table
CREATE TABLE IF NOT EXISTS public.polytask_disputes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES public.polytask_jobs(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED')),
    admin_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on disputes
ALTER TABLE public.polytask_disputes ENABLE ROW LEVEL SECURITY;

-- Reporter can see their own disputes
CREATE POLICY "Users can view their own disputes"
    ON public.polytask_disputes FOR SELECT
    USING (auth.uid() = reporter_id);

-- Admins can view all disputes
CREATE POLICY "JPP admins can view all disputes"
    ON public.polytask_disputes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')
        )
    );

-- Any user can insert a dispute
CREATE POLICY "Users can create disputes"
    ON public.polytask_disputes FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

-- Admins can update disputes
CREATE POLICY "JPP admins can update disputes"
    ON public.polytask_disputes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')
        )
    );

-- Fix polytask_reviews if RLS not set properly
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.polytask_reviews;
CREATE POLICY "Anyone can view reviews"
    ON public.polytask_reviews FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert reviews" ON public.polytask_reviews;
CREATE POLICY "Users can insert reviews"
    ON public.polytask_reviews FOR INSERT
    WITH CHECK (auth.uid() = reviewer_id);
