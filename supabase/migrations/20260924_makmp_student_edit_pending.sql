-- ============================================================================
-- Migration: 20260924_makmp_student_edit_pending.sql
-- Description: Benarkan pelajar (pemilik akaun) edit item sijil pada submission
--   yang masih MENUNGGU — untuk kes pelajar jumpa sijil baru & nak upload sebelum
--   juri mula semak.
--
--   KESELAMATAN (di-enforce di DB melalui RPC SECURITY DEFINER):
--     1. Hanya PEMILIK (submission.user_id = auth.uid()) — bukan guest (anon),
--        bukan student lain. Guest tak dibenarkan (takut khianat).
--     2. Hanya bila submission.status = 'MENUNGGU'. Sebaik juri buka award
--        (mark_award_in_review), status → 'DALAM_SEMAKAN' dan edit terkunci.
--     3. Operasi atomik (satu transaction): tambah / kemaskini / buang item.
--     4. Log audit untuk accountability.
--
--   NOTA: Guest submit (INSERT `true` sedia ada) TIDAK disentuh — guest masih
--   boleh hantar borang baru seperti biasa. Edit pula HANYA melalui RPC ini.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_makmp_submission_items(
  p_submission_id uuid,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_uid uuid := auth.uid();
  v_sub record;
  v_item record;
  v_added integer := 0;
  v_updated integer := 0;
  v_deleted integer := 0;
  v_keep_ids uuid[] := '{}'::uuid[];
BEGIN
  -- 1. Wajib login (guest/anonymous ditolak)
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

  -- 3. Kunci: hanya MENUNGGU boleh edit. DALAM_SEMAKAN/DISAHKAN/DITOLAK → tolak.
  IF v_sub.status IS DISTINCT FROM 'MENUNGGU' THEN
    RETURN jsonb_build_object(
      'success', false, 'locked', true,
      'message', 'Permohonan ini sudah mula disemak juri dan tidak boleh dikemaskini lagi.'
    );
  END IF;

  -- 4. Proses item (tambah/update). Item yang TIDAK ada dalam p_items akan
  --    dianggap dibuang (delete) — kecuali item yang sudah disemak (ada merit/verified).
  IF jsonb_typeof(p_items) = 'array' THEN
    FOR v_item IN
      SELECT * FROM jsonb_to_recordset(p_items) AS x(
        id uuid,
        nama_pencapaian text,
        peringkat text,
        pencapaian_type text,
        penganjur text,
        tarikh date,
        drive_view_url text,
        drive_download_url text,
        drive_file_id text,
        merit_suggested numeric,
        document_type text,
        source text
      )
    LOOP
      -- Kumpul id item yang dikekalkan
      IF v_item.id IS NOT NULL THEN
        v_keep_ids := array_append(v_keep_ids, v_item.id);
      END IF;

      IF v_item.id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.makmp_submission_items i
        WHERE i.id = v_item.id AND i.submission_id = p_submission_id
      ) THEN
        -- UPDATE item sedia ada
        UPDATE public.makmp_submission_items
        SET nama_pencapaian = COALESCE(v_item.nama_pencapaian, nama_pencapaian),
            peringkat       = COALESCE(v_item.peringkat, peringkat),
            pencapaian_type = COALESCE(v_item.pencapaian_type, pencapaian_type),
            penganjur       = COALESCE(v_item.penganjur, penganjur),
            tarikh          = COALESCE(v_item.tarikh, tarikh),
            drive_view_url  = COALESCE(v_item.drive_view_url, drive_view_url),
            drive_download_url = COALESCE(v_item.drive_download_url, drive_download_url),
            drive_file_id   = COALESCE(v_item.drive_file_id, drive_file_id),
            merit_suggested = COALESCE(v_item.merit_suggested, merit_suggested),
            document_type   = COALESCE(v_item.document_type, document_type),
            source          = COALESCE(v_item.source, source)
        WHERE id = v_item.id
          AND submission_id = p_submission_id
          -- Jangan benarkan edit item yang dah disemak (ada merit/verified)
          AND is_verified = false
          AND merit_awarded = 0;
        v_updated := v_updated + 1;
      ELSE
        -- INSERT item baru (id digenerate di sini supaya konsisten)
        -- Validasi: nama_pencapaian & drive_view_url WAJIB ada (column NOT NULL)
        IF v_item.nama_pencapaian IS NULL OR v_item.drive_view_url IS NULL THEN
          CONTINUE; -- skip item tak lengkap
        END IF;

        INSERT INTO public.makmp_submission_items (
          id, submission_id, nama_pencapaian, peringkat, pencapaian_type,
          penganjur, tarikh, drive_view_url, drive_download_url, drive_file_id,
          merit_suggested, merit_awarded, is_verified, document_type, source
        ) VALUES (
          COALESCE(v_item.id, gen_random_uuid()),
          p_submission_id,
          v_item.nama_pencapaian,
          COALESCE(v_item.peringkat, 'NEGERI'),
          COALESCE(v_item.pencapaian_type, 'PESERTA'),
          v_item.penganjur,
          v_item.tarikh,
          v_item.drive_view_url,
          v_item.drive_download_url,
          v_item.drive_file_id,
          COALESCE(v_item.merit_suggested, 0),
          0,
          false,
          COALESCE(v_item.document_type, 'SIJIL'),
          COALESCE(v_item.source, 'MANUAL_UPLOAD')
        );
        v_added := v_added + 1;
      END IF;
    END LOOP;
  END IF;

  -- 5. Buang item yang tidak dikekalkan (dibuang oleh pelajar) — hanya item
  --    yang belum disemak (is_verified=false, merit_awarded=0).
  IF array_length(v_keep_ids, 1) IS NOT NULL THEN
    DELETE FROM public.makmp_submission_items
    WHERE submission_id = p_submission_id
      AND is_verified = false
      AND merit_awarded = 0
      AND NOT (id = ANY(v_keep_ids));
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  ELSE
    -- Semua item dibuang
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
    'Pelajar mengemaskini item sijil (' || v_added || ' tambah, ' || v_updated || ' kemaskini, ' || v_deleted || ' buang)',
    jsonb_build_object(
      'submission_id', p_submission_id,
      'added', v_added,
      'updated', v_updated,
      'deleted', v_deleted
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'added', v_added,
    'updated', v_updated,
    'deleted', v_deleted
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.update_makmp_submission_items(uuid, jsonb) TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
