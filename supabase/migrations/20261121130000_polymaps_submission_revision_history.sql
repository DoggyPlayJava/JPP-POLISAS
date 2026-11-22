CREATE TABLE IF NOT EXISTS public.imaps_field_submission_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.imaps_field_submissions(id),
  snapshot jsonb NOT NULL,
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS imaps_field_submission_revisions_submission_created_idx
  ON public.imaps_field_submission_revisions (submission_id, created_at DESC);

ALTER TABLE public.imaps_field_submission_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.imaps_field_submission_revisions FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.imaps_field_submission_revisions TO authenticated;

DROP POLICY IF EXISTS imaps_field_submission_revisions_admin_select ON public.imaps_field_submission_revisions;
CREATE POLICY imaps_field_submission_revisions_admin_select
  ON public.imaps_field_submission_revisions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = ANY (ARRAY['JPP','SUPER_ADMIN_JPP','ADMIN','super_admin','SUPER_ADMIN'])
  ));

DROP POLICY IF EXISTS imaps_field_submission_revisions_admin_insert ON public.imaps_field_submission_revisions;
CREATE POLICY imaps_field_submission_revisions_admin_insert
  ON public.imaps_field_submission_revisions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = ANY (ARRAY['JPP','SUPER_ADMIN_JPP','ADMIN','super_admin','SUPER_ADMIN'])
  ));
