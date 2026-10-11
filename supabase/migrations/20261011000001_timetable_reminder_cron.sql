-- Migration: 20261011000001_timetable_reminder_cron.sql
-- Module: Timetable & PolyMaps Automated Class Reminders Engine
-- Handles timezone-aware (Asia/Kuala_Lumpur) dynamic reminder scanning with atomic deduplication.

-- 1. Index on student_timetables for rapid 5-minute cron scanning
CREATE INDEX IF NOT EXISTS idx_student_timetables_dow_start ON public.student_timetables(day_of_week, start_time) WHERE is_archived = false;

-- 2. Timezone-aware RPC to fetch upcoming classes within dynamic reminder window
CREATE OR REPLACE FUNCTION public.get_upcoming_timetable_reminders()
RETURNS TABLE (
    timetable_id UUID,
    user_id UUID,
    course_code TEXT,
    course_name TEXT,
    start_time TIME,
    reminder_mins INTEGER,
    room_raw TEXT,
    location_id UUID,
    is_online BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_kl_now TIMESTAMP := (NOW() AT TIME ZONE 'Asia/Kuala_Lumpur');
    v_kl_date DATE := v_kl_now::date;
    v_kl_dow INTEGER := EXTRACT(ISODOW FROM (NOW() AT TIME ZONE 'Asia/Kuala_Lumpur'))::integer;
BEGIN
    RETURN QUERY
    SELECT 
        t.id AS timetable_id,
        t.user_id,
        t.course_code,
        t.course_name,
        t.start_time,
        COALESCE(s.reminder_minutes, 30) AS reminder_mins,
        t.room_raw,
        t.location_id,
        t.is_online
    FROM public.student_timetables t
    INNER JOIN public.student_timetable_metadata m 
        ON m.user_id = t.user_id 
        AND m.academic_session = t.academic_session 
        AND m.semester = t.semester 
        AND m.is_active = true
    LEFT JOIN public.student_timetable_settings s 
        ON s.user_id = t.user_id
    WHERE t.is_archived = false
      AND t.day_of_week = v_kl_dow
      AND COALESCE(s.notifications_enabled, true) = true
      AND v_kl_date >= m.semester_start_date 
      AND v_kl_date <= m.semester_end_date
      AND (v_kl_date + t.start_time) - v_kl_now >= ((COALESCE(s.reminder_minutes, 30) - 3) * INTERVAL '1 minute')
      AND (v_kl_date + t.start_time) - v_kl_now <= ((COALESCE(s.reminder_minutes, 30) + 3) * INTERVAL '1 minute')
      AND NOT EXISTS (
          SELECT 1 
          FROM public.student_timetable_notification_logs nl
          WHERE nl.timetable_id = t.id 
            AND nl.notified_date = v_kl_date
      );
END;
$$;

-- 3. Atomic single-worker logging with ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION public.log_timetable_notification(
    p_timetable_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today DATE := (NOW() AT TIME ZONE 'Asia/Kuala_Lumpur')::date;
    v_inserted_id UUID;
BEGIN
    INSERT INTO public.student_timetable_notification_logs (
        timetable_id,
        user_id,
        notified_date
    )
    VALUES (
        p_timetable_id,
        p_user_id,
        v_today
    )
    ON CONFLICT (timetable_id, notified_date) DO NOTHING
    RETURNING id INTO v_inserted_id;

    RETURN (v_inserted_id IS NOT NULL);
END;
$$;

-- 4. Permissions
GRANT EXECUTE ON FUNCTION public.get_upcoming_timetable_reminders() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_timetable_notification(UUID, UUID) TO authenticated, service_role;
