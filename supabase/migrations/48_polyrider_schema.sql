-- Migration 48: PolyRider Schema & RLS Policies

-- 1. Create polyrider_profiles table (Rider License & Status)
CREATE TABLE IF NOT EXISTS public.polyrider_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('KERETA', 'MOTOR', 'LAIN-LAIN')),
    plate_number TEXT NOT NULL,
    license_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    license_expiry_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT fk_polyrider_profiles_profiles FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 2. Create polyrider_zones table (For inside campus predefined fares)
CREATE TABLE IF NOT EXISTS public.polyrider_zones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pickup_name TEXT NOT NULL,
    dropoff_name TEXT NOT NULL,
    base_fare NUMERIC(10,2) NOT NULL DEFAULT 1.50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create polyrider_jobs table (Order matching and tracking)
CREATE TABLE IF NOT EXISTS public.polyrider_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES auth.users(id),
    rider_id UUID REFERENCES public.polyrider_profiles(user_id),
    job_type TEXT NOT NULL CHECK (job_type IN ('RIDE', 'FOOD', 'POLYMART_CUST', 'POLYMART_VENDOR')),
    pickup_name TEXT NOT NULL,
    dropoff_name TEXT NOT NULL,
    pickup_lat NUMERIC(10,6),
    pickup_lng NUMERIC(10,6),
    dropoff_lat NUMERIC(10,6),
    dropoff_lng NUMERIC(10,6),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'ARRIVED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'EMERGENCY')),
    distance_km NUMERIC(10,2),
    base_fare NUMERIC(10,2) DEFAULT 0,
    bidaan_tambahan NUMERIC(10,2) DEFAULT 0,
    proposed_price NUMERIC(10,2) NOT NULL, -- The final offered price
    rider_lat NUMERIC(10,6),
    rider_lng NUMERIC(10,6),
    last_location_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create polyrider_chats table (In-app chat between student and rider)
CREATE TABLE IF NOT EXISTS public.polyrider_chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.polyrider_jobs(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create polyrider_sos_logs table (Safety emergency records)
CREATE TABLE IF NOT EXISTS public.polyrider_sos_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.polyrider_jobs(id) ON DELETE CASCADE,
    triggered_by UUID NOT NULL REFERENCES auth.users(id),
    lat NUMERIC(10,6),
    lng NUMERIC(10,6),
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- INDEXES FOR PERFORMANCE (Critical for polling)
CREATE INDEX idx_polyrider_jobs_status ON public.polyrider_jobs(status);
CREATE INDEX idx_polyrider_jobs_student ON public.polyrider_jobs(student_id);
CREATE INDEX idx_polyrider_jobs_rider ON public.polyrider_jobs(rider_id);
CREATE INDEX idx_polyrider_profiles_active ON public.polyrider_profiles(is_active) WHERE is_active = true;
CREATE INDEX idx_polyrider_chats_job ON public.polyrider_chats(job_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.polyrider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polyrider_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polyrider_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polyrider_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polyrider_sos_logs ENABLE ROW LEVEL SECURITY;

-- FUNCTION: Helper to check if user is JPP or Admin
CREATE OR REPLACE FUNCTION public.is_klk_or_admin(uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    role_val TEXT;
    unit_val TEXT;
BEGIN
    SELECT role, jpp_unit INTO role_val, unit_val FROM public.profiles WHERE id = uid;
    IF role_val IN ('SUPER_ADMIN_JPP', 'STAFF') THEN
        RETURN TRUE;
    END IF;
    IF role_val = 'JPP' AND unit_val = 'KLS' THEN
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RLS POLICIES (Using the optimized `(SELECT auth.uid())` pattern)

-- polyrider_profiles
-- Anyone can read active riders to show count
CREATE POLICY "Public can view active riders" ON public.polyrider_profiles
    FOR SELECT USING (is_active = true);
-- Rider can view/update their own profile
CREATE POLICY "Riders can manage own profile" ON public.polyrider_profiles
    FOR ALL USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
-- KLK Admin can view and update all profiles
CREATE POLICY "Admin can manage all rider profiles" ON public.polyrider_profiles
    FOR ALL USING (public.is_klk_or_admin((SELECT auth.uid())));


-- polyrider_zones
-- Anyone can read zones
CREATE POLICY "Anyone can read zones" ON public.polyrider_zones
    FOR SELECT USING (true);
-- Only Admin can manage zones
CREATE POLICY "Admin can manage zones" ON public.polyrider_zones
    FOR ALL USING (public.is_klk_or_admin((SELECT auth.uid())));


-- polyrider_jobs
-- Students can read/create/update their own jobs
CREATE POLICY "Students can manage own jobs" ON public.polyrider_jobs
    FOR ALL USING (student_id = (SELECT auth.uid())) WITH CHECK (student_id = (SELECT auth.uid()));
-- Riders can read PENDING jobs, and read/update jobs assigned to them
CREATE POLICY "Riders can view pending and own jobs" ON public.polyrider_jobs
    FOR SELECT USING (
        status = 'PENDING' OR rider_id = (SELECT auth.uid())
    );
CREATE POLICY "Riders can update own assigned jobs" ON public.polyrider_jobs
    FOR UPDATE USING (
        status = 'PENDING' OR rider_id = (SELECT auth.uid())
    );
-- Admins can view all jobs
CREATE POLICY "Admin can view all jobs" ON public.polyrider_jobs
    FOR SELECT USING (public.is_klk_or_admin((SELECT auth.uid())));


-- polyrider_chats
-- Only people involved in the job can read/write chats
CREATE POLICY "Involved users can manage chats" ON public.polyrider_chats
    FOR ALL USING (
        sender_id = (SELECT auth.uid()) OR
        job_id IN (
            SELECT id FROM public.polyrider_jobs WHERE student_id = (SELECT auth.uid()) OR rider_id = (SELECT auth.uid())
        )
    ) WITH CHECK (
        sender_id = (SELECT auth.uid())
    );


-- polyrider_sos_logs
-- Students/Riders can create SOS
CREATE POLICY "Users can create SOS logs" ON public.polyrider_sos_logs
    FOR INSERT WITH CHECK (triggered_by = (SELECT auth.uid()));
-- Users can view their own SOS
CREATE POLICY "Users can view own SOS logs" ON public.polyrider_sos_logs
    FOR SELECT USING (triggered_by = (SELECT auth.uid()));
-- Admins can view/update all SOS logs
CREATE POLICY "Admin can manage all SOS logs" ON public.polyrider_sos_logs
    FOR ALL USING (public.is_klk_or_admin((SELECT auth.uid())));


-- RPC: Polling Helper to get active rider count
CREATE OR REPLACE FUNCTION public.get_active_polyrider_count()
RETURNS INTEGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    SELECT count(*) INTO active_count FROM public.polyrider_profiles WHERE is_active = true AND status = 'APPROVED' AND (license_expiry_date > now() OR license_expiry_date IS NULL);
    RETURN active_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

