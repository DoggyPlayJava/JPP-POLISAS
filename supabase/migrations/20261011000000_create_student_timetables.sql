-- 1. student_timetables
CREATE TABLE IF NOT EXISTS public.student_timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_session TEXT NOT NULL,
    semester TEXT NOT NULL,
    class_name TEXT NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    course_code TEXT NOT NULL,
    course_name TEXT NOT NULL,
    class_type TEXT NOT NULL DEFAULT 'KULIAH',
    lecturer_code TEXT,
    room_raw TEXT NOT NULL,
    location_id UUID REFERENCES public.imaps_locations(id) ON DELETE SET NULL,
    is_online BOOLEAN NOT NULL DEFAULT false,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_timetables_user_archived ON public.student_timetables(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_student_timetables_location ON public.student_timetables(location_id);
CREATE INDEX IF NOT EXISTS idx_student_timetables_active_schedule ON public.student_timetables(day_of_week, start_time) WHERE is_archived = false;

ALTER TABLE public.student_timetables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_timetables_owner_and_superadmin"
ON public.student_timetables FOR ALL
USING (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')
)
WITH CHECK (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')
);

-- 2. student_timetable_metadata
CREATE TABLE IF NOT EXISTS public.student_timetable_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_session TEXT NOT NULL,
    semester TEXT NOT NULL,
    class_name TEXT NOT NULL,
    semester_start_date DATE NOT NULL,
    semester_end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_active_meta UNIQUE (user_id, academic_session, semester)
);

CREATE INDEX IF NOT EXISTS idx_student_timetable_metadata_user ON public.student_timetable_metadata(user_id);

ALTER TABLE public.student_timetable_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_timetable_metadata_owner_and_superadmin"
ON public.student_timetable_metadata FOR ALL
USING (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')
)
WITH CHECK (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')
);

-- 3. student_timetable_settings
CREATE TABLE IF NOT EXISTS public.student_timetable_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    reminder_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.student_timetable_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_timetable_settings_owner_and_superadmin"
ON public.student_timetable_settings FOR ALL
USING (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')
)
WITH CHECK (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')
);

-- 4. imaps_room_mappings
CREATE TABLE IF NOT EXISTS public.imaps_room_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code_pattern TEXT NOT NULL UNIQUE,
    location_id UUID REFERENCES public.imaps_locations(id) ON DELETE CASCADE,
    is_online BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imaps_room_mappings_location ON public.imaps_room_mappings(location_id);

ALTER TABLE public.imaps_room_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "imaps_room_mappings_read_all"
ON public.imaps_room_mappings FOR SELECT USING (true);

CREATE POLICY "imaps_room_mappings_superadmin_write"
ON public.imaps_room_mappings FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'));

-- 5. student_timetable_notification_logs (Harden RLS)
CREATE TABLE IF NOT EXISTS public.student_timetable_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID NOT NULL REFERENCES public.student_timetables(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notified_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_timetable_notified_per_day UNIQUE (timetable_id, notified_date)
);

CREATE INDEX IF NOT EXISTS idx_timetable_dedup_log ON public.student_timetable_notification_logs(timetable_id, notified_date);
CREATE INDEX IF NOT EXISTS idx_timetable_log_user ON public.student_timetable_notification_logs(user_id);

ALTER TABLE public.student_timetable_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_timetable_notification_logs_select_own"
ON public.student_timetable_notification_logs FOR SELECT
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "student_timetable_notification_logs_superadmin"
ON public.student_timetable_notification_logs FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'));
