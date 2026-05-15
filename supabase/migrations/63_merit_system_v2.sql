-- 63_merit_system_v2.sql
-- Migration file for Merit System V2 (Demerit, Cohorts, QR Location & PIN)

-- 1. Update merit_transactions
ALTER TABLE public.merit_transactions 
ADD COLUMN IF NOT EXISTS proof_url TEXT,
ADD COLUMN IF NOT EXISTS academic_session TEXT,
ADD COLUMN IF NOT EXISTS scan_location JSONB;

-- 2. Update akademik_qr_scans
ALTER TABLE public.akademik_qr_scans 
ADD COLUMN IF NOT EXISTS scan_location JSONB,
ADD COLUMN IF NOT EXISTS verification_method TEXT;

-- 3. Update akademik_qr_tokens
ALTER TABLE public.akademik_qr_tokens 
ADD COLUMN IF NOT EXISTS location_lat NUMERIC,
ADD COLUMN IF NOT EXISTS location_lng NUMERIC,
ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS verification_pin TEXT;

-- 4. Create student_merit_cohorts
CREATE TABLE IF NOT EXISTS public.student_merit_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    cohort_id TEXT NOT NULL,
    total_merit INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.student_merit_cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own merit cohort history" 
ON public.student_merit_cohorts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Superadmin can manage merit cohorts" 
ON public.student_merit_cohorts FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'SUPERADMIN'
  )
);

-- 5. Create demerit_appeals
CREATE TABLE IF NOT EXISTS public.demerit_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES public.merit_transactions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    appeal_reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.demerit_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and create own appeals" 
ON public.demerit_appeals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appeals" 
ON public.demerit_appeals FOR INSERT 
WITH CHECK (auth.uid() = user_id AND status = 'PENDING');

CREATE POLICY "Admins/Exco can manage all appeals" 
ON public.demerit_appeals FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('SUPERADMIN', 'STAFF', 'YDP', 'EXCO')
  )
);
