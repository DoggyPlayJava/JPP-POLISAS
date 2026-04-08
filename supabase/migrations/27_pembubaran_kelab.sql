-- Migration: Pembubaran Kohort Spesifik Kelab & Pembersihan Akaun Berasingan

-- Drop old versions to prevent function overload conflicts
DROP FUNCTION IF EXISTS rpc_pembubaran_kohort_kelab(uuid);
DROP FUNCTION IF EXISTS rpc_pembubaran_kohort_kelab(text);

-- 1. Create specific club dissolution RPC (uses text param, casts to uuid internally)
CREATE OR REPLACE FUNCTION rpc_pembubaran_kohort_kelab(target_club_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Arkib laporan & aktiviti yang Diluluskan/Selesai/COMPLETED untuk kelab khusus
    UPDATE public.club_activities 
    SET is_archived = TRUE 
    WHERE status = 'selesai' AND is_archived = FALSE AND club_id = target_club_id::uuid;

    UPDATE public.club_reports 
    SET is_archived = TRUE 
    WHERE status = 'Diluluskan' AND is_archived = FALSE AND club_id = target_club_id::uuid;

    UPDATE public.programs 
    SET is_archived = TRUE 
    WHERE status = 'COMPLETED' AND is_archived = FALSE AND club_id = target_club_id::uuid;

    -- 2. Delete rekod yang TIDAK diluluskan untuk kelab khusus
    DELETE FROM public.club_activities WHERE is_archived = FALSE AND club_id = target_club_id::uuid;
    DELETE FROM public.club_reports WHERE is_archived = FALSE AND club_id = target_club_id::uuid;
    DELETE FROM public.programs WHERE is_archived = FALSE AND club_id = target_club_id::uuid;

    -- 3. Demote Jawatankuasa (MT) ke ahli biasa (MEMBER) untuk kelab khusus
    UPDATE public.student_club_memberships 
    SET role = 'MEMBER' 
    WHERE role != 'MEMBER' AND club_id = target_club_id::uuid;

    -- 4. Rekod Log
    INSERT INTO public.club_logs (action_type, actor_name, description, club_id)
    VALUES ('COHORT_DISSOLVED', 'SISTEM (JPP)', 'Pembubaran Kohort kelab spesifik telah dijalankan. Arkib dikemaskini dan MT di-reset.', target_club_id::uuid);

END;
$$;


-- 2. Create standalone account cleanup RPC
CREATE OR REPLACE FUNCTION rpc_pembersihan_akaun_lama()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
    deleted_count integer;
BEGIN
    -- Delete account pengguna tidak aktif > 6 bulan (termasuk auth.users)
    -- Returns the number of rows deleted.
    WITH deleted AS (
        DELETE FROM auth.users 
        WHERE id IN (
            SELECT p.id FROM public.profiles p
            LEFT JOIN auth.users u ON u.id = p.id
            WHERE 
                (u.last_sign_in_at < NOW() - INTERVAL '6 months' OR (u.last_sign_in_at IS NULL AND u.created_at < NOW() - INTERVAL '6 months'))
                AND p.email NOT ILIKE '%admin%'
                AND p.email != 'jpp@polisas.edu.my'
        )
        RETURNING id
    )
    SELECT count(*) INTO deleted_count FROM deleted;

    IF deleted_count > 0 THEN
        INSERT INTO public.club_logs (action_type, actor_name, description)
        VALUES ('SYSTEM_MAINTENANCE', 'SISTEM (JPP)', format('Pembersihan %s akaun tidak aktif melebihi 6 bulan telah dilakukan.', deleted_count));
    END IF;

    RETURN deleted_count;
END;
$$;


-- 3. Rewrite global dissolution RPC to NOT include account deletion
CREATE OR REPLACE FUNCTION rpc_pembubaran_kohort()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Arkib laporan & aktiviti yang Diluluskan/Selesai/COMPLETED
    UPDATE public.club_activities 
    SET is_archived = TRUE 
    WHERE status = 'selesai' AND is_archived = FALSE;

    UPDATE public.club_reports 
    SET is_archived = TRUE 
    WHERE status = 'Diluluskan' AND is_archived = FALSE;

    UPDATE public.programs 
    SET is_archived = TRUE 
    WHERE status = 'COMPLETED' AND is_archived = FALSE;

    -- 2. Delete rekod yang TIDAK diluluskan
    DELETE FROM public.club_activities WHERE is_archived = FALSE;
    DELETE FROM public.club_reports WHERE is_archived = FALSE;
    DELETE FROM public.programs WHERE is_archived = FALSE;

    -- 3. Demote Jawatankuasa (MT) ke ahli biasa (MEMBER)
    UPDATE public.student_club_memberships 
    SET role = 'MEMBER' 
    WHERE role != 'MEMBER';

    -- 4. Akaun pembersihan TIDAK lagi dilakukan di sini (Pindah ke butang asing)

    -- 5. Rekod Log
    INSERT INTO public.club_logs (action_type, actor_name, description)
    VALUES ('COHORT_DISSOLVED', 'SISTEM (JPP)', 'Pembubaran Kohort Menyeluruh (Semua Kelab) telah dijalankan. Arkib dikemaskini dan kelab di-reset.');

END;
$$;
