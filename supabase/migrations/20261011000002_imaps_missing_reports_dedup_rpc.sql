-- Migration: 20261011000002_imaps_missing_reports_dedup_rpc.sql
-- Description: Add atomic deduplication counter & SECURITY DEFINER RPC for auto-reporting missing timetable rooms

-- 1. Add report_count and updated_at columns
ALTER TABLE public.imaps_missing_reports 
ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.imaps_missing_reports 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Normalize existing room codes to uppercase and clean whitespace
UPDATE public.imaps_missing_reports
SET room_code = TRIM(UPPER(room_code))
WHERE room_code IS NOT NULL;

-- 3. Create index for fast case-insensitive pending report lookup
CREATE INDEX IF NOT EXISTS idx_imaps_missing_reports_pending_code 
ON public.imaps_missing_reports(UPPER(TRIM(room_code))) 
WHERE status = 'pending';

-- 4. SECURITY DEFINER RPC to atomically insert or increment missing room reports without client RLS leaks
CREATE OR REPLACE FUNCTION public.report_missing_timetable_room(
    p_room_code TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_normalized_code TEXT;
    v_existing_id UUID;
    v_count INTEGER;
BEGIN
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_normalized_code := TRIM(UPPER(p_room_code));
    IF v_normalized_code IS NULL OR length(v_normalized_code) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Room code cannot be empty');
    END IF;

    -- Lock and check if a pending report for this room already exists
    SELECT id, report_count INTO v_existing_id, v_count
    FROM public.imaps_missing_reports
    WHERE UPPER(TRIM(room_code)) = v_normalized_code
      AND status = 'pending'
    LIMIT 1
    FOR UPDATE;

    IF v_existing_id IS NOT NULL THEN
        -- Increment counter atomically without spamming JPP with multiple duplicate rows
        UPDATE public.imaps_missing_reports
        SET report_count = report_count + 1,
            updated_at = NOW()
        WHERE id = v_existing_id;

        RETURN jsonb_build_object(
            'success', true,
            'action', 'incremented',
            'id', v_existing_id,
            'room_code', v_normalized_code,
            'total_reports', v_count + 1
        );
    ELSE
        -- Insert a brand new pending report
        INSERT INTO public.imaps_missing_reports (
            student_id,
            room_code,
            description,
            status,
            report_count,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            v_normalized_code,
            COALESCE(p_description, 'Dikesan secara automatik daripada jadual waktu kuliah pelajar'),
            'pending',
            1,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_existing_id;

        RETURN jsonb_build_object(
            'success', true,
            'action', 'created',
            'id', v_existing_id,
            'room_code', v_normalized_code,
            'total_reports', 1
        );
    END IF;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.report_missing_timetable_room(TEXT, TEXT) TO authenticated;
