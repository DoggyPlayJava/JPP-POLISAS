-- Migration: Create profile_edit_requests table
-- Created at: 2026-06-21 18:20:00

CREATE TABLE IF NOT EXISTS public.profile_edit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('matric_no', 'semester')),
    current_value TEXT NOT NULL,
    requested_value TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID,
    review_note TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    
    CONSTRAINT profile_edit_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT profile_edit_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.profile_edit_requests ENABLE ROW LEVEL SECURITY;

-- 1. Create indexes for FK columns to comply with JPP-POLISAS rules
CREATE INDEX IF NOT EXISTS idx_profile_edit_requests_user_id ON public.profile_edit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_edit_requests_reviewed_by ON public.profile_edit_requests(reviewed_by);

-- 2. Create RLS Policies using (SELECT auth.uid()) to comply with RLS requirements
DROP POLICY IF EXISTS "Allow select profile edit requests" ON public.profile_edit_requests;
CREATE POLICY "Allow select profile edit requests" ON public.profile_edit_requests
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (SELECT auth.uid()) 
        AND role IN ('JPP', 'SUPER_ADMIN_JPP')
    )
  );

DROP POLICY IF EXISTS "Allow insert profile edit requests" ON public.profile_edit_requests;
CREATE POLICY "Allow insert profile edit requests" ON public.profile_edit_requests
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Allow update profile edit requests" ON public.profile_edit_requests;
CREATE POLICY "Allow update profile edit requests" ON public.profile_edit_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (SELECT auth.uid()) 
        AND role IN ('JPP', 'SUPER_ADMIN_JPP')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (SELECT auth.uid()) 
        AND role IN ('JPP', 'SUPER_ADMIN_JPP')
    )
  );

-- 3. Trigger function to automatically set reviewed_at when status changes
CREATE OR REPLACE FUNCTION public.set_profile_edit_requests_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('APPROVED', 'REJECTED') THEN
    NEW.reviewed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profile_edit_requests_reviewed_at ON public.profile_edit_requests;
CREATE TRIGGER trg_profile_edit_requests_reviewed_at
BEFORE UPDATE ON public.profile_edit_requests
FOR EACH ROW EXECUTE FUNCTION public.set_profile_edit_requests_reviewed_at();

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
