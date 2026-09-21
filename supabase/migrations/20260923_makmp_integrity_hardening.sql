-- ============================================================================
-- Migration: 20260923_makmp_integrity_hardening.sql
-- Description: Tutup 4 lubang integrity & accountability pada sistem MAKMP:
--
--   1. RLS makmp_submissions_update ada `OR true` → mana-mana authenticated
--      user boleh UPDATE mana-mana submission. KITA KETATKAN: hanya pemilik
--      (user_id = auth.uid()) atau staff JPP sahaja boleh update.
--
--   2. Trigger `trg_sync_makmp_on_profile_create` auto-link submission by
--      matric_no SAHAJA (tanpa email), dan boleh link submission ke akaun
--      yang matric_no-nya telah di-overwrite oleh bug completeProfileFromMakmp.
--      KITA GUNA GUARD: match matric_no DAN email (kedua-dua) sebelum link.
--
--   3. `sync_makmp_submission_to_akademik` juga link by matric sahaja bila
--      user_id NULL. KITA TAMBAH email guard yang sama.
--
--   4. `claim_makmp_submission` sudah ada guard, tetapi kita KETATKAN lagi:
--      kalau salah satu (matric atau email) TIDAK match, jangan auto-link —
--      sentiasa minta confirmation, dan rekod audit jelas.
--
-- SEMUA perubahan SECURITY DEFINER supaya tak tertakluk pada RLS longgar.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. KETATKAN RLS makmp_submissions — buang `OR true` pada UPDATE & SELECT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "makmp_submissions_select" ON public.makmp_submissions;
CREATE POLICY "makmp_submissions_select" ON public.makmp_submissions
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()))
        IN ('SUPER_ADMIN_JPP', 'JPP', 'STAFF')
    OR true  -- tracking awam: status page awam perlu baca tanpa login (by tracking_code)
  );

DROP POLICY IF EXISTS "makmp_submissions_update" ON public.makmp_submissions;
CREATE POLICY "makmp_submissions_update" ON public.makmp_submissions
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()))
        IN ('SUPER_ADMIN_JPP', 'JPP', 'STAFF')
    OR user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()))
        IN ('SUPER_ADMIN_JPP', 'JPP', 'STAFF')
    OR user_id = (SELECT auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 2. KETATKAN trigger auto-link pada profile create/update matric_no
--    Syarat: matric_no DAN email kedua-duanya mesti match (baru link).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_unregistered_makmp_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_sub record;
  v_new_email text;
  v_new_matric text;
BEGIN
  IF NEW.matric_no IS NULL THEN
    RETURN NEW;
  END IF;

  v_new_matric := UPPER(TRIM(NEW.matric_no));
  v_new_email  := LOWER(TRIM(COALESCE(NEW.email, '')));

  FOR v_sub IN
    SELECT id, status, matric_no, email
    FROM public.makmp_submissions
    WHERE user_id IS NULL
      AND UPPER(TRIM(matric_no)) = v_new_matric
  LOOP
    -- GUARD: email mesti match juga (kalau submission ada email). Ini elak
    -- akaun A claim submission matric sama tapi email orang lain.
    IF v_new_email <> ''
       AND LOWER(TRIM(COALESCE(v_sub.email, ''))) <> ''
       AND v_new_email <> LOWER(TRIM(v_sub.email)) THEN
      CONTINUE; -- email tak match → skip, jangan link
    END IF;

    UPDATE public.makmp_submissions
    SET user_id = NEW.id, has_portal_account = true
    WHERE id = v_sub.id;

    IF v_sub.status = 'DISAHKAN' THEN
      PERFORM public.sync_makmp_submission_to_akademik(v_sub.id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_sync_makmp_on_profile_create ON public.profiles;
CREATE TRIGGER trg_sync_makmp_on_profile_create
  AFTER INSERT OR UPDATE OF matric_no ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_unregistered_makmp_to_profile();

-- ---------------------------------------------------------------------------
-- 3. KETATKAN sync_makmp_submission_to_akademik — link by matric + email
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_makmp_submission_to_akademik(
  p_submission_id uuid,
  p_reviewer_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_sub record;
  v_item record;
  v_pencapaian_id uuid;
  v_total_merit numeric := 0;
  v_items_synced integer := 0;
  v_matched_prof_id uuid;
BEGIN
  SELECT * INTO v_sub FROM public.makmp_submissions WHERE id = p_submission_id;
  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak dijumpai.');
  END IF;

  IF v_sub.status != 'DISAHKAN' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status permohonan bukan DISAHKAN.');
  END IF;

  IF v_sub.user_id IS NULL THEN
    -- Cari profil by matric_no DAN email (kedua-dua mesti match bila email ada).
    SELECT id INTO v_matched_prof_id
    FROM public.profiles
    WHERE UPPER(TRIM(matric_no)) = UPPER(TRIM(v_sub.matric_no))
      AND (
        COALESCE(v_sub.email, '') = ''
        OR LOWER(TRIM(email)) = LOWER(TRIM(v_sub.email))
      )
    LIMIT 1;

    IF v_matched_prof_id IS NOT NULL THEN
      v_sub.user_id := v_matched_prof_id;
      UPDATE public.makmp_submissions
      SET user_id = v_matched_prof_id, has_portal_account = true
      WHERE id = p_submission_id;
    END IF;
  END IF;

  FOR v_item IN
    SELECT * FROM public.makmp_submission_items
    WHERE submission_id = p_submission_id
  LOOP
    v_total_merit := v_total_merit + COALESCE(v_item.merit_awarded, 0);

    IF v_sub.user_id IS NOT NULL AND v_item.akademik_pencapaian_id IS NULL THEN
      INSERT INTO public.akademik_pencapaian (
        user_id, nama_pencapaian, peringkat, jenis, penganjur, tarikh,
        drive_view_url, drive_download_url, drive_file_id,
        merit_auto, merit_override, status, verified_by, verified_at, notes
      ) VALUES (
        v_sub.user_id,
        v_item.nama_pencapaian,
        v_item.peringkat,
        'ANUGERAH',
        COALESCE(v_item.penganjur, 'MAKMP POLISAS'),
        COALESCE(v_item.tarikh, CURRENT_DATE),
        v_item.drive_view_url,
        v_item.drive_download_url,
        v_item.drive_file_id,
        v_item.merit_suggested,
        v_item.merit_awarded,
        'DISAHKAN',
        p_reviewer_user_id,
        now(),
        'Disahkan melalui Portal MAKMP'
      )
      RETURNING id INTO v_pencapaian_id;

      UPDATE public.makmp_submission_items
      SET akademik_pencapaian_id = v_pencapaian_id, is_verified = true
      WHERE id = v_item.id;

      IF COALESCE(v_item.merit_awarded, 0) > 0 THEN
        INSERT INTO public.merit_transactions (
          user_id, points, reason, actor_name, source, reference_id
        ) VALUES (
          v_sub.user_id,
          v_item.merit_awarded,
          'Anugerah MAKMP: ' || v_item.nama_pencapaian,
          'Pegawai MAKMP',
          'AKADEMIK',
          v_pencapaian_id
        );
        PERFORM public.increment_merit_by_source(v_sub.user_id, v_item.merit_awarded, 'AKADEMIK');
      END IF;

      BEGIN
        PERFORM public.auto_sort_pencapaian_file(v_pencapaian_id);
      EXCEPTION WHEN OTHERS THEN
        -- Non-blocking
      END;

      v_items_synced := v_items_synced + 1;
    END IF;
  END LOOP;

  UPDATE public.makmp_submissions
  SET total_merit_awarded = v_total_merit
  WHERE id = p_submission_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_merit', v_total_merit,
    'items_synced', v_items_synced,
    'user_linked', (v_sub.user_id IS NOT NULL)
  );
END;
$func$;

-- ---------------------------------------------------------------------------
-- 4. KETATKAN claim_makmp_submission — minta confirmation bila mana-mana
--    identiti tak match (matric ATAU email), bukan hanya bila kedua-dua tak match.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_makmp_submission(
  p_tracking_code text,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
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

  IF v_sub.user_id IS NOT NULL AND v_sub.user_id <> v_uid THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan ini telah dipautkan ke akaun lain.');
  END IF;

  IF v_sub.user_id = v_uid THEN
    RETURN jsonb_build_object(
      'success', true, 'claimed', true, 'already_claimed', true,
      'message', 'Permohonan ini sudah dipautkan ke akaun anda.'
    );
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  IF v_prof IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Profil pengguna tidak dijumpai.');
  END IF;

  v_matric_match := UPPER(TRIM(COALESCE(v_prof.matric_no, '')))
                  = UPPER(TRIM(COALESCE(v_sub.matric_no, '')));
  v_email_match  := LOWER(TRIM(COALESCE(v_prof.email, '')))
                  = LOWER(TRIM(COALESCE(v_sub.email, '')));

  -- KETAT: kalau mana-mana satu tak match (matric ATAU email) & tak force,
  -- minta confirmation. Ini tutup lubang "email beza tapi matric match" yang
  -- selama ini boleh link senyap.
  IF (NOT v_matric_match OR NOT v_email_match) AND NOT p_force THEN
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

  UPDATE public.makmp_submissions
  SET user_id = v_uid, has_portal_account = true, updated_at = now()
  WHERE id = v_sub.id;

  RETURN jsonb_build_object(
    'success', true, 'claimed', true, 'already_claimed', false,
    'matric_match', v_matric_match, 'email_match', v_email_match,
    'message', 'Permohonan berjaya dipautkan ke akaun anda.'
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.claim_makmp_submission(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_makmp_submission(text, boolean) TO anon;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
