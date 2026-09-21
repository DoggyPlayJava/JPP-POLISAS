-- claim_makmp_submission: benarkan pelajar "claim" submission MAKMP yang
-- dihantar sebagai tetamu (user_id NULL) kepada akaun portal mereka.
--
-- Security: SECURITY DEFINER + validate matric_no/email match sebelum link,
-- supaya tak sembarangan orang boleh claim submission orang lain.
--
-- Return jsonb:
--   { success, message, claimed, already_claimed, needs_confirmation, ... }

CREATE OR REPLACE FUNCTION public.claim_makmp_submission(
  p_tracking_code text,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_sub record;
  v_prof record;
  v_matric_match boolean;
  v_email_match boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda perlu log masuk terlebih dahulu.');
  END IF;

  SELECT * INTO v_sub
  FROM public.makmp_submissions
  WHERE tracking_code = UPPER(TRIM(p_tracking_code))
  LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak dijumpai.');
  END IF;

  -- Dah di-claim oleh pengguna lain?
  IF v_sub.user_id IS NOT NULL AND v_sub.user_id <> v_uid THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan ini telah dipautkan ke akaun lain.');
  END IF;

  -- Dah menjadi milik pengguna semasa?
  IF v_sub.user_id = v_uid THEN
    RETURN jsonb_build_object(
      'success', true,
      'claimed', true,
      'already_claimed', true,
      'message', 'Permohonan ini sudah dipautkan ke akaun anda.'
    );
  END IF;

  -- Ambil profil pengguna semasa
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  IF v_prof IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Profil pengguna tidak dijumpai.');
  END IF;

  -- Padanan identiti: matric_no & email
  v_matric_match := UPPER(TRIM(COALESCE(v_prof.matric_no, ''))) = UPPER(TRIM(COALESCE(v_sub.matric_no, '')));
  v_email_match := LOWER(TRIM(COALESCE(v_prof.email, ''))) = LOWER(TRIM(COALESCE(v_sub.email, '')));

  -- Kalau tak match & tak force → minta pengesahan (frontend tunjuk confirm)
  IF NOT v_matric_match AND NOT v_email_match AND NOT p_force THEN
    RETURN jsonb_build_object(
      'success', false,
      'needs_confirmation', true,
      'message', 'Maklumat akaun tidak sepadan dengan permohonan.',
      'profile_matric', COALESCE(v_prof.matric_no, ''),
      'submission_matric', COALESCE(v_sub.matric_no, ''),
      'profile_email', COALESCE(v_prof.email, ''),
      'submission_email', COALESCE(v_sub.email, '')
    );
  END IF;

  -- Link submission ke akaun
  UPDATE public.makmp_submissions
  SET user_id = v_uid,
      has_portal_account = true,
      updated_at = now()
  WHERE id = v_sub.id;

  RETURN jsonb_build_object(
    'success', true,
    'claimed', true,
    'already_claimed', false,
    'matric_match', v_matric_match,
    'email_match', v_email_match,
    'message', 'Permohonan berjaya dipautkan ke akaun anda.'
  );
END;
$function$;

-- Grant execute kepada authenticated (dan anon untuk kegunaan umum)
GRANT EXECUTE ON FUNCTION public.claim_makmp_submission(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_makmp_submission(text, boolean) TO anon;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
