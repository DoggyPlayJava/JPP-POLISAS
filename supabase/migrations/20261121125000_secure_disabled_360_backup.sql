ALTER TABLE public._backup_github_360_disabled_20261121 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._backup_github_360_disabled_20261121 FROM anon, authenticated;
GRANT SELECT ON public._backup_github_360_disabled_20261121 TO authenticated;
DROP POLICY IF EXISTS "JPP admins can view disabled 360 backup" ON public._backup_github_360_disabled_20261121;
CREATE POLICY "JPP admins can view disabled 360 backup"
ON public._backup_github_360_disabled_20261121
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
  )
);
