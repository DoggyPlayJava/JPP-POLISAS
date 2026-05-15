-- 66_fix_demerit_appeals_rls.sql

DROP POLICY IF EXISTS "Admins/Exco can manage all appeals" ON public.demerit_appeals;

CREATE POLICY "Admins/Exco can manage all appeals" 
ON public.demerit_appeals FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
  )
);
