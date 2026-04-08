-- Migration: Pembubaran Kohort Menyeluruh & Arkib (Is Archived & FK nullify)

-- 1. Add `is_archived` to related tables if not exists
ALTER TABLE public.club_activities ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.club_reports ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- 2. Modify Foreign Keys to prevent CASCADE deletion of archived files
-- Drop existing constraints
ALTER TABLE public.club_activities DROP CONSTRAINT IF EXISTS club_activities_user_id_fkey;
ALTER TABLE public.club_reports DROP CONSTRAINT IF EXISTS club_reports_submitted_by_fkey;
ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_user_id_fkey;

-- Make sure user_id respects NULL
ALTER TABLE public.club_activities ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.club_reports ALTER COLUMN submitted_by DROP NOT NULL;
ALTER TABLE public.programs ALTER COLUMN user_id DROP NOT NULL;

-- Re-add constraints with ON DELETE SET NULL
ALTER TABLE public.club_activities 
  ADD CONSTRAINT club_activities_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.club_reports 
  ADD CONSTRAINT club_reports_submitted_by_fkey 
  FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.programs 
  ADD CONSTRAINT programs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Create the RPC function
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

    -- 2. Delete rekod yang TIDAK diluluskan (Draf, Ditolak, Menunggu, Dalam Semakan)
    DELETE FROM public.club_activities WHERE is_archived = FALSE;
    DELETE FROM public.club_reports WHERE is_archived = FALSE;
    DELETE FROM public.programs WHERE is_archived = FALSE;

    -- 3. Demote Jawatankuasa (MT) ke ahli biasa (MEMBER)
    UPDATE public.student_club_memberships 
    SET role = 'MEMBER' 
    WHERE role != 'MEMBER';

    -- 4. Delete account pengguna tidak aktif > 6 bulan (termasuk auth.users)
    -- Hati-hati jangan padam admin.
    DELETE FROM auth.users 
    WHERE id IN (
        SELECT p.id FROM public.profiles p
        LEFT JOIN auth.users u ON u.id = p.id
        WHERE 
            (u.last_sign_in_at < NOW() - INTERVAL '6 months' OR (u.last_sign_in_at IS NULL AND u.created_at < NOW() - INTERVAL '6 months'))
            AND p.email NOT ILIKE '%admin%'
            AND p.email != 'jpp@polisas.edu.my'
    );

    -- 5. Rekod Log dalam club_logs bahawa pembubaran terjadi
    INSERT INTO public.club_logs (action_type, actor_name, description)
    VALUES ('COHORT_DISSOLVED', 'SISTEM (JPP)', 'Pembubaran Kohort Menyeluruh (Semua Kelab) telah dijalankan. Arkib dikemaskini, kelab di-reset, dan akaun >6 bulan tidak aktif dipadam.');

END;
$$;
