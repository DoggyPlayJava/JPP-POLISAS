-- Migration 51: PolyRider Cancellation Reasons, Appeals, and Automated Penalties

-- 1. Alter polyrider_jobs to add cancellation fields
ALTER TABLE public.polyrider_jobs ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.polyrider_jobs ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- 2. Alter polyrider_sos_logs to add false alarm investigation fields
ALTER TABLE public.polyrider_sos_logs ADD COLUMN IF NOT EXISTS false_alarm BOOLEAN DEFAULT false;
ALTER TABLE public.polyrider_sos_logs ADD COLUMN IF NOT EXISTS false_alarm_notes TEXT;

-- 3. Alter profiles to track penalty state (this applies to both students and riders)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS polyrider_penalty_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS polyrider_suspended_until TIMESTAMP WITH TIME ZONE;

-- 4. Create polyrider_appeals table
CREATE TABLE IF NOT EXISTS public.polyrider_appeals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for polyrider_appeals
ALTER TABLE public.polyrider_appeals ENABLE ROW LEVEL SECURITY;

-- Appeals RLS Policies
-- Users can view their own appeals
CREATE POLICY "Users can view own appeals" ON public.polyrider_appeals
    FOR SELECT USING (user_id = (SELECT auth.uid()));

-- Users can create appeals if they are suspended
CREATE POLICY "Users can create appeals" ON public.polyrider_appeals
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- Admins (KLK, SUPER_ADMIN_JPP, MT_OVERSEES) can view all appeals
CREATE POLICY "Admins can view appeals" ON public.polyrider_appeals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = (SELECT auth.uid()) 
            AND (p.role IN ('SUPER_ADMIN_JPP', 'MT_OVERSEES', 'STAFF') OR (p.role = 'JPP' AND p.jpp_unit IN ('KLS', 'KEBAJIKAN')))
        )
    );

-- Only KLK, SUPER_ADMIN_JPP, MT_OVERSEES can update appeals (Kebajikan is view-only)
CREATE POLICY "Admins can manage appeals" ON public.polyrider_appeals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = (SELECT auth.uid()) 
            AND (p.role IN ('SUPER_ADMIN_JPP', 'MT_OVERSEES', 'STAFF') OR (p.role = 'JPP' AND p.jpp_unit = 'KLS'))
        )
    );

-- 5. RPC function to handle job cancellation, log reason, and track 1-hour spam limit
CREATE OR REPLACE FUNCTION public.cancel_polyrider_job(p_job_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_job polyrider_jobs%ROWTYPE;
  v_cancel_count INT;
BEGIN
  -- Get the job details
  SELECT * INTO v_job FROM polyrider_jobs WHERE id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  -- Ensure the user is allowed to cancel it (either student or rider)
  IF v_job.student_id != v_user_id AND v_job.rider_id != v_user_id THEN
    RAISE EXCEPTION 'Anda tidak dibenarkan membatalkan pesanan ini';
  END IF;

  -- Ensure job isn't already started or completed
  IF v_job.status IN ('IN_TRANSIT', 'COMPLETED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Perjalanan telah bermula, selesai atau telah dibatalkan.';
  END IF;

  -- Perform the cancellation
  UPDATE polyrider_jobs
  SET status = 'CANCELLED',
      cancellation_reason = p_reason,
      cancelled_by = v_user_id,
      updated_at = now()
  WHERE id = p_job_id;
  
  -- Anti-Spam Check: Count how many cancellations this user did in the last 1 HOUR
  SELECT COUNT(*) INTO v_cancel_count
  FROM polyrider_jobs
  WHERE cancelled_by = v_user_id
    AND updated_at >= now() - interval '1 hour'
    AND status = 'CANCELLED';

  -- If more than 3, apply automated suspension (24 hours)
  IF v_cancel_count > 3 THEN
    -- Increment penalty count and suspend for 24 hours
    UPDATE profiles
    SET polyrider_penalty_count = COALESCE(polyrider_penalty_count, 0) + 1,
        polyrider_suspended_until = now() + interval '24 hours'
    WHERE id = v_user_id;

    -- Note: If they are a rider, we could also suspend their rider profile
    UPDATE polyrider_profiles
    SET status = 'SUSPENDED'
    WHERE user_id = v_user_id;
  END IF;
END;
$function$;


-- 6. RPC function to process appeal (Unsuspend user)
CREATE OR REPLACE FUNCTION public.process_polyrider_appeal(p_appeal_id uuid, p_approve boolean, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_admin_id UUID := auth.uid();
  v_appeal polyrider_appeals%ROWTYPE;
  v_admin_role TEXT;
  v_admin_unit TEXT;
BEGIN
  -- Verify admin rights
  SELECT role, jpp_unit INTO v_admin_role, v_admin_unit FROM profiles WHERE id = v_admin_id;
  IF NOT (v_admin_role IN ('SUPER_ADMIN_JPP', 'MT_OVERSEES', 'STAFF') OR (v_admin_role = 'JPP' AND v_admin_unit = 'KLS')) THEN
    RAISE EXCEPTION 'Akses dinafikan. Hanya Exco KLK dan pengurusan atasan boleh memproses rayuan.';
  END IF;

  SELECT * INTO v_appeal FROM polyrider_appeals WHERE id = p_appeal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rayuan tidak dijumpai';
  END IF;

  IF p_approve THEN
    -- Update appeal
    UPDATE polyrider_appeals
    SET status = 'APPROVED', admin_notes = p_notes, reviewed_by = v_admin_id, reviewed_at = now()
    WHERE id = p_appeal_id;

    -- Lift suspension
    UPDATE profiles SET polyrider_suspended_until = NULL WHERE id = v_appeal.user_id;
    -- Set rider profile to APPROVED if they had one (but only if it's currently suspended)
    UPDATE polyrider_profiles SET status = 'APPROVED' WHERE user_id = v_appeal.user_id AND status = 'SUSPENDED';
  ELSE
    -- Reject appeal
    UPDATE polyrider_appeals
    SET status = 'REJECTED', admin_notes = p_notes, reviewed_by = v_admin_id, reviewed_at = now()
    WHERE id = p_appeal_id;
  END IF;
END;
$function$;
