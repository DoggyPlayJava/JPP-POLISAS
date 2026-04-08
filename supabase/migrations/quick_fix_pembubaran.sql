-- ============================================================
-- QUICK FIX: Pembubaran Kohort Kelab
-- Jalankan KESELURUHAN skrip ini dalam Supabase SQL Editor
-- ============================================================

-- Langkah 1: Drop SEMUA versi fungsi yang ada (termasuk uuid & text)
DROP FUNCTION IF EXISTS public.rpc_pembubaran_kohort_kelab(uuid);
DROP FUNCTION IF EXISTS public.rpc_pembubaran_kohort_kelab(text);

-- Langkah 2: Cipta semula dengan parameter TEXT + cast dalaman ke UUID
CREATE FUNCTION public.rpc_pembubaran_kohort_kelab(target_club_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    club_uuid uuid;
BEGIN
    -- Convert text to uuid secara eksplisit
    club_uuid := target_club_id::uuid;

    -- 1. Arkib laporan & aktiviti yang Diluluskan/Selesai
    UPDATE public.club_activities 
    SET is_archived = TRUE 
    WHERE status = 'selesai' AND is_archived = FALSE AND club_id = club_uuid;

    UPDATE public.club_reports 
    SET is_archived = TRUE 
    WHERE status = 'Diluluskan' AND is_archived = FALSE AND club_id = club_uuid;

    UPDATE public.programs 
    SET is_archived = TRUE 
    WHERE status = 'COMPLETED' AND is_archived = FALSE AND club_id = club_uuid;

    -- 2. Padam rekod yang TIDAK diluluskan untuk kelab ini sahaja
    DELETE FROM public.club_activities WHERE is_archived = FALSE AND club_id = club_uuid;
    DELETE FROM public.club_reports WHERE is_archived = FALSE AND club_id = club_uuid;
    DELETE FROM public.programs WHERE is_archived = FALSE AND club_id = club_uuid;

    -- 3. Demote Jawatankuasa kepada MEMBER untuk kelab ini sahaja
    UPDATE public.student_club_memberships 
    SET role = 'MEMBER' 
    WHERE role != 'MEMBER' AND club_id = club_uuid;

    -- 4. Log
    INSERT INTO public.club_logs (action_type, actor_name, description, club_id)
    VALUES (
        'COHORT_DISSOLVED', 
        'SISTEM (JPP)', 
        'Pembubaran Kohort kelab spesifik telah dijalankan. Arkib dikemaskini dan MT di-reset.',
        club_uuid
    );

END;
$$;

-- ============================================================
-- Sahkan fungsi berjaya dicipta:
SELECT proname, proargtypes::text 
FROM pg_proc 
WHERE proname = 'rpc_pembubaran_kohort_kelab';
-- ============================================================
