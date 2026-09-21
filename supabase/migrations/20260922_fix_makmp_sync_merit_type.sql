-- Fix sync_makmp_submission_to_akademik: increment_merit_by_source type mismatch
-- merit_awarded is numeric, but increment_merit_by_source expects integer
-- Also: only sync items whose award is DISAHKAN (not rejected/pending)
-- Wrap per-item processing so one item failure doesn't abort the whole sync

CREATE OR REPLACE FUNCTION public.sync_makmp_submission_to_akademik(
  p_submission_id uuid,
  p_reviewer_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_sub record;
  v_item record;
  v_pencapaian_id uuid;
  v_total_merit numeric := 0;
  v_items_synced integer := 0;
  v_items_failed integer := 0;
BEGIN
  SELECT * INTO v_sub FROM public.makmp_submissions WHERE id = p_submission_id;
  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak dijumpai.');
  END IF;

  IF v_sub.status != 'DISAHKAN' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status permohonan bukan DISAHKAN.');
  END IF;

  IF v_sub.user_id IS NULL THEN
    SELECT id INTO v_sub.user_id FROM public.profiles
    WHERE UPPER(matric_no) = UPPER(v_sub.matric_no)
    LIMIT 1;

    IF v_sub.user_id IS NOT NULL THEN
      UPDATE public.makmp_submissions
      SET user_id = v_sub.user_id, has_portal_account = true
      WHERE id = p_submission_id;
    END IF;
  END IF;

  -- Hanya proses item yang award-nya DISAHKAN
  FOR v_item IN
    SELECT i.* FROM public.makmp_submission_items i
    LEFT JOIN public.makmp_submission_awards a ON a.id = i.submission_award_id
    WHERE i.submission_id = p_submission_id
      AND (i.submission_award_id IS NULL OR a.status = 'DISAHKAN')
  LOOP
    v_total_merit := v_total_merit + COALESCE(v_item.merit_awarded, 0);

    IF v_sub.user_id IS NOT NULL AND v_item.akademik_pencapaian_id IS NULL THEN
      BEGIN
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

          PERFORM public.increment_merit_by_source(
            v_sub.user_id,
            COALESCE(v_item.merit_awarded, 0)::integer,
            'AKADEMIK'
          );
        END IF;

        PERFORM public.auto_sort_pencapaian_file(v_pencapaian_id);

        v_items_synced := v_items_synced + 1;
      EXCEPTION WHEN OTHERS THEN
        v_items_failed := v_items_failed + 1;
        RAISE WARNING 'MAKMP sync item gagal (item %): %', v_item.id, SQLERRM;
      END;
    END IF;
  END LOOP;

  UPDATE public.makmp_submissions
  SET total_merit_awarded = v_total_merit
  WHERE id = p_submission_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_merit', v_total_merit,
    'items_synced', v_items_synced,
    'items_failed', v_items_failed,
    'user_linked', (v_sub.user_id IS NOT NULL)
  );
END;
$function$;
