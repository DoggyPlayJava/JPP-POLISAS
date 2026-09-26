-- ============================================================================
-- Migration: 20260926_makmp_save_submission_edit.sql
-- Fix: Edit mode tak sokong PENAMBAHAN ANUGERAH BARU.
--
-- Punca: `update_makmp_submission_items` (fix 20260924) menerima
--   submission_award_id dari CLIENT. Bila pelajar TAMBAH anugerah baru semasa
--   edit, client (submissionAwardIdMap) tiada id untuk anugerah baru → hantar
--   NULL → item jadi orphan (submission_award_id NULL) dan TIDAK muncul dalam
--   relation awards.items. Tambahan pula, tiada rekod makmp_submission_awards
--   dicipta untuk anugerah baru, jadi anugerah itu langsung tak wujud.
--
-- Penyelesaian: RPC baru `save_makmp_submission_edit` menerima keseluruhan
--   payload anugerah (award_id + entity_name + items) dan:
--   1. Resolve/cipta rekod makmp_submission_awards berdasarkan award_id
--      (server-side), untuk anugerah baru & sedia ada.
--   2. Bind submission_award_id secara server-side (bukan dari client).
--   3. Upsert/delete items seperti biasa (hanya item belum disemak).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_makmp_submission_edit(
  p_submission_id uuid,
  p_awards jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_sub record;
  v_award jsonb;
  v_award_db_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_added integer := 0;
  v_updated integer := 0;
  v_deleted integer := 0;
  v_keep_ids uuid[] := '{}'::uuid[];
  v_award_added integer := 0;
BEGIN
  -- 1. Wajib login
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda perlu log masuk untuk mengemaskini permohonan.');
  END IF;

  -- 2. Ambil submission + sahkan pemilikan
  SELECT * INTO v_sub
  FROM public.makmp_submissions
  WHERE id = p_submission_id;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak dijumpai.');
  END IF;

  IF v_sub.user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda bukan pemilik permohonan ini.');
  END IF;

  -- 3. Kunci: hanya MENUNGGU boleh edit
  IF v_sub.status IS DISTINCT FROM 'MENUNGGU' THEN
    RETURN jsonb_build_object(
      'success', false, 'locked', true,
      'message', 'Permohonan ini sudah mula disemak juri dan tidak boleh dikemaskini lagi.'
    );
  END IF;

  -- 4. Proses setiap anugerah
  IF jsonb_typeof(p_awards) = 'array' THEN
    FOR v_award IN SELECT * FROM jsonb_array_elements(p_awards) LOOP

      -- 4a. Resolve / cipta rekod makmp_submission_awards untuk award_id ini
      SELECT id INTO v_award_db_id
      FROM public.makmp_submission_awards
      WHERE submission_id = p_submission_id
        AND award_id = (v_award->>'award_id')::uuid
      LIMIT 1;

      IF v_award_db_id IS NULL THEN
        -- Anugerah BARU: cipta rekod
        INSERT INTO public.makmp_submission_awards
          (submission_id, award_id, entity_name, applicant_role, status, total_merit_granted)
        VALUES
          (
            p_submission_id,
            (v_award->>'award_id')::uuid,
            NULLIF(v_award->>'entity_name', ''),
            NULLIF(v_award->>'applicant_role', ''),
            'MENUNGGU',
            0
          )
        RETURNING id INTO v_award_db_id;
        v_award_added := v_award_added + 1;
      ELSE
        -- Anugerah sedia ada: kemaskini entity/role sahaja (jangan sentuh status/merit)
        UPDATE public.makmp_submission_awards
        SET entity_name = COALESCE(NULLIF(v_award->>'entity_name', ''), entity_name),
            applicant_role = COALESCE(NULLIF(v_award->>'applicant_role', ''), applicant_role)
        WHERE id = v_award_db_id;
      END IF;

      -- 4b. Proses items bagi anugerah ini (binding server-side)
      IF v_award ? 'items' AND jsonb_typeof(v_award->'items') = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_award->'items') LOOP
          v_item_id := (v_item->>'id')::uuid;

          IF v_item_id IS NOT NULL THEN
            v_keep_ids := array_append(v_keep_ids, v_item_id);
          END IF;

          IF v_item_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.makmp_submission_items i
            WHERE i.id = v_item_id AND i.submission_id = p_submission_id
          ) THEN
            -- UPDATE item sedia ada (termasuk re-bind submission_award_id)
            UPDATE public.makmp_submission_items
            SET nama_pencapaian   = COALESCE(v_item->>'nama_pencapaian', nama_pencapaian),
                peringkat         = COALESCE(v_item->>'peringkat', peringkat),
                pencapaian_type   = COALESCE(v_item->>'pencapaian_type', pencapaian_type),
                penganjur         = COALESCE(v_item->>'penganjur', penganjur),
                tarikh            = COALESCE((v_item->>'tarikh')::date, tarikh),
                drive_view_url    = COALESCE(v_item->>'drive_view_url', drive_view_url),
                drive_download_url = COALESCE(v_item->>'drive_download_url', drive_download_url),
                drive_file_id     = COALESCE(v_item->>'drive_file_id', drive_file_id),
                merit_suggested   = COALESCE((v_item->>'merit_suggested')::numeric, merit_suggested),
                document_type     = COALESCE(v_item->>'document_type', document_type),
                source            = COALESCE(v_item->>'source', source),
                submission_award_id = v_award_db_id
            WHERE id = v_item_id
              AND submission_id = p_submission_id
              AND is_verified = false
              AND merit_awarded = 0;
            v_updated := v_updated + 1;
          ELSE
            -- INSERT item baru (dengan submission_award_id yang betul)
            IF v_item->>'nama_pencapaian' IS NULL OR v_item->>'drive_view_url' IS NULL THEN
              CONTINUE;
            END IF;

            INSERT INTO public.makmp_submission_items (
              id, submission_id, submission_award_id, nama_pencapaian, peringkat,
              pencapaian_type, penganjur, tarikh, drive_view_url, drive_download_url,
              drive_file_id, merit_suggested, merit_awarded, is_verified,
              document_type, source
            ) VALUES (
              COALESCE(v_item_id, gen_random_uuid()),
              p_submission_id,
              v_award_db_id,
              v_item->>'nama_pencapaian',
              COALESCE(v_item->>'peringkat', 'NEGERI'),
              COALESCE(v_item->>'pencapaian_type', 'PESERTA'),
              v_item->>'penganjur',
              (v_item->>'tarikh')::date,
              v_item->>'drive_view_url',
              v_item->>'drive_download_url',
              v_item->>'drive_file_id',
              COALESCE((v_item->>'merit_suggested')::numeric, 0),
              0,
              false,
              COALESCE(v_item->>'document_type', 'SIJIL'),
              COALESCE(v_item->>'source', 'MANUAL_UPLOAD')
            );
            v_added := v_added + 1;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  -- 5. Buang item yang tidak dikekalkan (hanya yang belum disemak).
  IF array_length(v_keep_ids, 1) IS NOT NULL THEN
    DELETE FROM public.makmp_submission_items
    WHERE submission_id = p_submission_id
      AND is_verified = false
      AND merit_awarded = 0
      AND NOT (id = ANY(v_keep_ids));
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  ELSE
    DELETE FROM public.makmp_submission_items
    WHERE submission_id = p_submission_id
      AND is_verified = false
      AND merit_awarded = 0;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  END IF;

  -- 6. Log audit
  PERFORM public.log_makmp_audit(
    'KEMASKINI',
    p_submission_id::text,
    'Pelajar mengemaskini permohonan (' || v_award_added || ' anugerah baru, ' ||
      v_added || ' item tambah, ' || v_updated || ' item kemaskini, ' || v_deleted || ' item buang)',
    jsonb_build_object(
      'submission_id', p_submission_id,
      'awards_added', v_award_added,
      'added', v_added,
      'updated', v_updated,
      'deleted', v_deleted
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'awards_added', v_award_added,
    'added', v_added,
    'updated', v_updated,
    'deleted', v_deleted
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.save_makmp_submission_edit(uuid, jsonb) TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
