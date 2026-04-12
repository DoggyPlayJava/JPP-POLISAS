-- ==============================================================================
-- 32_system_announcements.sql
-- Create system_announcements and user_announcement_responses tables
-- ==============================================================================

-- 1. Create system_announcements table
CREATE TABLE IF NOT EXISTS public.system_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content_body TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('EASY', 'MEDIUM', 'HIGH')),
    target_audience TEXT NOT NULL CHECK (target_audience IN ('STUDENT', 'STAFF', 'ALL')),
    action_url TEXT,
    form_schema JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create user_announcement_responses table
CREATE TABLE IF NOT EXISTS public.user_announcement_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    announcement_id UUID REFERENCES public.system_announcements(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('dismissed_permanently', 'completed')),
    form_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, announcement_id)
);

-- 3. RLS for system_announcements
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

-- Select: Everyone can read active announcements 
CREATE POLICY "Active system_announcements are viewable by everyone."
    ON public.system_announcements FOR SELECT
    USING (is_active = true);

-- Select: JPP/SUPER_ADMIN_JPP can read all announcements
CREATE POLICY "JPP and Super Admin can view all system announcements."
    ON public.system_announcements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );

-- Insert/Update/Delete: SUPER_ADMIN_JPP, YDP, and MT JPP can manage
-- (We will simplify to role IN ('SUPER_ADMIN_JPP') OR (role = 'JPP' AND they are MT - this is managed via jpp_mt_assignments but for simplicity we allow role JPP for now and control via UI, or we can check role = 'SUPER_ADMIN_JPP' OR role = 'JPP')
CREATE POLICY "JPP and Super Admin can manage system announcements"
    ON public.system_announcements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );

-- 4. RLS for user_announcement_responses
ALTER TABLE public.user_announcement_responses ENABLE ROW LEVEL SECURITY;

-- Select: Users can see their own responses
CREATE POLICY "Users can view own announcement responses"
    ON public.user_announcement_responses FOR SELECT
    USING (auth.uid() = user_id);

-- Insert: Users can insert their own responses
CREATE POLICY "Users can insert own announcement responses"
    ON public.user_announcement_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Select: Admins can see all responses
CREATE POLICY "JPP and Super Admin can view all announcement responses"
    ON public.user_announcement_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );
