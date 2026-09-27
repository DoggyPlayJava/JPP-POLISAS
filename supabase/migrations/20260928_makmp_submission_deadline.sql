-- ============================================================================
-- MAKMP: Gating tempoh permohonan (submission deadline)
-- 1) BEFORE INSERT trigger pada makmp_submissions — halang permohonan BARU
--    selepas submission_deadline edisi berlalu.
-- 2) Kemaskini (edit) TIDAK dihalang oleh deadline — hanya dihalang oleh status
--    (hanya MENUNGGU boleh edit, sudah dikuatkuasakan dalam RPC
--    save_makmp_submission_edit).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_makmp_submission_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deadline timestamptz;
BEGIN
  -- Ambil submission_deadline bagi edisi permohonan ini
  SELECT submission_deadline
  INTO v_deadline
  FROM public.makmp_editions
  WHERE id = NEW.edition_id;

  -- Jika deadline ditetapkan dan sudah berlalu -> tolak permohonan baru
  IF v_deadline IS NOT NULL AND now() > v_deadline THEN
    RAISE EXCEPTION 'Tempoh permohonan MAKMP telah tamat. Permohonan baharu tidak lagi diterima.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_makmp_submission_deadline ON public.makmp_submissions;
CREATE TRIGGER trg_makmp_submission_deadline
  BEFORE INSERT ON public.makmp_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_makmp_submission_deadline();

NOTIFY pgrst, 'reload schema';
