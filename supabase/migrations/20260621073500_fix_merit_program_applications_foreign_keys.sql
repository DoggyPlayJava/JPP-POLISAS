-- Migration: Add foreign keys and indexes to merit_program_applications
-- Created at: 2026-06-21 07:35:00

ALTER TABLE public.merit_program_applications
  ADD CONSTRAINT merit_program_applications_applied_by_fkey 
    FOREIGN KEY (applied_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT merit_program_applications_kpp_reviewer_id_fkey 
    FOREIGN KEY (kpp_reviewer_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT merit_program_applications_kediaman_reviewer_id_fkey 
    FOREIGN KEY (kediaman_reviewer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create indexes for foreign key columns to comply with JPP-POLISAS rules
CREATE INDEX IF NOT EXISTS idx_mpa_kpp_reviewer_id ON public.merit_program_applications(kpp_reviewer_id);
CREATE INDEX IF NOT EXISTS idx_mpa_kediaman_reviewer_id ON public.merit_program_applications(kediaman_reviewer_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
