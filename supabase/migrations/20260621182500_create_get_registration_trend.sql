-- Migration: Create get_registration_trend RPC function
-- Created at: 2026-06-21 18:25:00

CREATE OR REPLACE FUNCTION public.get_registration_trend(days_back INTEGER)
RETURNS TABLE (reg_date TEXT, reg_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(p.created_at AT TIME ZONE 'Asia/Kuala_Lumpur', 'Mon DD') AS reg_date,
        COUNT(*)::BIGINT AS reg_count
    FROM public.profiles p
    WHERE p.created_at >= TIMEZONE('Asia/Kuala_Lumpur', NOW()::timestamp) - (days_back || ' days')::INTERVAL
    GROUP BY DATE_TRUNC('day', p.created_at AT TIME ZONE 'Asia/Kuala_Lumpur'), TO_CHAR(p.created_at AT TIME ZONE 'Asia/Kuala_Lumpur', 'Mon DD')
    ORDER BY DATE_TRUNC('day', p.created_at AT TIME ZONE 'Asia/Kuala_Lumpur') ASC;
END;
$$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
