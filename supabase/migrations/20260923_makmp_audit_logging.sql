-- ============================================================================
-- Migration: 20260923_makmp_audit_logging.sql
-- Description: Semua aktiviti MAKMP (student + juri + pentadbir) direkod ke
--   admin_audit_logs (module = 'MAKMP') supaya muncul dalam Log Audit JPP
--   (/jpp/logs) melalui system_logs VIEW.
--
--   Nama pelaku (juri tanpa login / student guest) diletakkan dalam
--   `description` kerana column `actor_id` adalah FK ke profiles (juri PIN
--   & student guest tiada profile). full_name dalam system_logs akan kosong
--   untuk mereka, tetapi description tetap jelas menunjukkan siapa bertindak.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper: log_makmp_audit — tulis satu entri audit MAKMP.
--    SECURITY DEFINER supaya boleh dipanggil oleh anon (juri PIN) & client.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_makmp_audit(
  p_action text,
  p_entity_id text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
BEGIN
  INSERT INTO public.admin_audit_logs (
    actor_id, action_type, module, entity_id, description, metadata
  ) VALUES (
    auth.uid(),              -- NULL untuk juri PIN / student guest (anon)
    p_action,
    'MAKMP',
    p_entity_id,
    p_description,
    p_metadata
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.log_makmp_audit(text, text, text, jsonb) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. mark_award_in_review — log "mula semak"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_award_in_review(p_pin text, p_award_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_pin public.makmp_jury_pins;
  v_award record;
  v_sub record;
  v_award_name text;
BEGIN
  v_pin := public._jury_authorize(p_pin);

  SELECT * INTO v_award
  FROM public.makmp_submission_awards
  WHERE id = p_award_id;

  IF v_award IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan anugerah tidak dijumpai.');
  END IF;

  SELECT * INTO v_sub FROM public.makmp_submissions WHERE id = v_award.submission_id;

  SELECT name INTO v_award_name FROM public.makmp_award_definitions WHERE id = v_award.award_id;

  IF v_award.status = 'MENUNGGU' THEN
    UPDATE public.makmp_submission_awards
    SET status = 'DALAM_SEMAKAN'
    WHERE id = p_award_id;
  END IF;

  UPDATE public.makmp_submissions
  SET status = 'DALAM_SEMAKAN'
  WHERE id = v_award.submission_id
    AND status = 'MENUNGGU';

  PERFORM public.log_makmp_audit(
    'MULA_SEMAKAN',
    p_award_id::text,
    'Juri "' || v_pin.jury_name || '" mula menyemak permohonan ' ||
      COALESCE(v_award_name, 'anugerah') || ' (' ||
      COALESCE(v_sub.full_name, v_sub.matric_no, '-') || ' / ' || COALESCE(v_sub.tracking_code, '-') || ')',
    jsonb_build_object(
      'pin_id', v_pin.id,
      'submission_id', v_award.submission_id,
      'award_name', v_award_name,
      'student', v_sub.full_name,
      'matric_no', v_sub.matric_no,
      'tracking_code', v_sub.tracking_code
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$func$;

-- ---------------------------------------------------------------------------
-- 3. save_jury_award_review — log "sahkan" / "tolak" (multi-award)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_jury_award_review(
  p_pin text,
  p_award_id uuid,
  p_submission_id uuid,
  p_status text,
  p_review_notes text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_pin public.makmp_jury_pins;
  v_item record;
  v_total numeric := 0;
  v_has_pending boolean;
  v_all_approved boolean;
  v_all_rejected boolean;
  v_sum numeric := 0;
  v_master_status text;
  v_current_status text;
  v_sub record;
  v_award_name text;
BEGIN
  v_pin := public._jury_authorize(p_pin);

  IF p_status NOT IN ('MENUNGGU','DALAM_SEMAKAN','DISAHKAN','DITOLAK') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status tidak sah.');
  END IF;

  SELECT status INTO v_current_status
  FROM public.makmp_submission_awards
  WHERE id = p_award_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan anugerah tidak dijumpai.');
  END IF;

  IF v_current_status IN ('DISAHKAN','DITOLAK') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Permohonan ini telah selesai disemak dan dikunci. Hubungi pentadbir untuk sebarang pembetulan.'
    );
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(id uuid, merit_awarded numeric, is_verified boolean)
  LOOP
    IF p_status = 'DISAHKAN' AND COALESCE(v_item.is_verified, false) THEN
      v_total := v_total + GREATEST(0, COALESCE(v_item.merit_awarded, 0));
      UPDATE public.makmp_submission_items
      SET merit_awarded = GREATEST(0, COALESCE(v_item.merit_awarded, 0)),
          is_verified = true
      WHERE id = v_item.id;
    ELSE
      UPDATE public.makmp_submission_items
      SET merit_awarded = 0,
          is_verified = false
      WHERE id = v_item.id;
    END IF;
  END LOOP;

  UPDATE public.makmp_submission_awards
  SET status = p_status,
      total_merit_granted = v_total,
      reviewed_by_pin_id = v_pin.id,
      reviewed_at = now(),
      review_notes = p_review_notes,
      rejection_reason = CASE WHEN p_status = 'DITOLAK' THEN p_rejection_reason ELSE NULL END
  WHERE id = p_award_id;

  SELECT
    bool_or(status IN ('MENUNGGU','DALAM_SEMAKAN')) AS has_pending,
    bool_and(status = 'DISAHKAN') AS all_approved,
    bool_and(status = 'DITOLAK') AS all_rejected,
    COALESCE(SUM(total_merit_granted), 0) AS sum_merit
  INTO v_has_pending, v_all_approved, v_all_rejected, v_sum
  FROM public.makmp_submission_awards
  WHERE submission_id = p_submission_id;

  v_master_status := 'DALAM_SEMAKAN';
  IF NOT v_has_pending THEN
    IF v_all_approved THEN v_master_status := 'DISAHKAN';
    ELSIF v_all_rejected THEN v_master_status := 'DITOLAK';
    ELSE v_master_status := 'DISAHKAN';
    END IF;
  END IF;

  UPDATE public.makmp_submissions
  SET status = v_master_status,
      total_merit_awarded = v_sum,
      reviewer_pin_id = v_pin.id,
      reviewed_at = now(),
      rejection_reason = CASE WHEN v_master_status = 'DITOLAK' THEN p_rejection_reason ELSE NULL END,
      review_notes = p_review_notes,
      updated_at = now()
  WHERE id = p_submission_id;

  IF p_status = 'DISAHKAN' THEN
    PERFORM public.sync_makmp_submission_to_akademik(p_submission_id, NULL);
  END IF;

  SELECT * INTO v_sub FROM public.makmp_submissions WHERE id = p_submission_id;
  SELECT name INTO v_award_name FROM public.makmp_award_definitions ad
    JOIN public.makmp_submission_awards a ON a.award_id = ad.id
    WHERE a.id = p_award_id;

  PERFORM public.log_makmp_audit(
    CASE WHEN p_status = 'DISAHKAN' THEN 'SAHKAN' WHEN p_status = 'DITOLAK' THEN 'TOLAK' ELSE 'SEMAK' END,
    p_award_id::text,
    'Juri "' || v_pin.jury_name || '" ' ||
      CASE WHEN p_status = 'DISAHKAN' THEN 'meluluskan' WHEN p_status = 'DITOLAK' THEN 'menolak' ELSE 'menyemak' END ||
      ' permohonan ' || COALESCE(v_award_name, 'anugerah') || ' (' ||
      COALESCE(v_sub.full_name, v_sub.matric_no, '-') || ' / ' || COALESCE(v_sub.tracking_code, '-') ||
      ') — merit ' || v_total || ' markah',
    jsonb_build_object(
      'pin_id', v_pin.id,
      'submission_id', p_submission_id,
      'award_name', v_award_name,
      'student', v_sub.full_name,
      'matric_no', v_sub.matric_no,
      'tracking_code', v_sub.tracking_code,
      'status', p_status,
      'merit', v_total,
      'rejection_reason', p_rejection_reason
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$func$;

-- ---------------------------------------------------------------------------
-- 4. save_jury_review (klasik) — log "sahkan" / "tolak"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_jury_review(
  p_pin text,
  p_submission_id uuid,
  p_status text,
  p_review_notes text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_pin public.makmp_jury_pins;
  v_item record;
  v_total numeric := 0;
  v_current_status text;
  v_sub record;
BEGIN
  v_pin := public._jury_authorize(p_pin);

  IF p_status NOT IN ('MENUNGGU','DALAM_SEMAKAN','DISAHKAN','DITOLAK') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status tidak sah.');
  END IF;

  SELECT status INTO v_current_status
  FROM public.makmp_submissions
  WHERE id = p_submission_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak dijumpai.');
  END IF;

  IF v_current_status IN ('DISAHKAN','DITOLAK') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Permohonan ini telah selesai disemak dan dikunci. Hubungi pentadbir untuk sebarang pembetulan.'
    );
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(id uuid, merit_awarded numeric, is_verified boolean)
  LOOP
    IF p_status = 'DISAHKAN' AND COALESCE(v_item.is_verified, false) THEN
      v_total := v_total + GREATEST(0, COALESCE(v_item.merit_awarded, 0));
      UPDATE public.makmp_submission_items
      SET merit_awarded = GREATEST(0, COALESCE(v_item.merit_awarded, 0)), is_verified = true
      WHERE id = v_item.id;
    ELSE
      UPDATE public.makmp_submission_items
      SET merit_awarded = 0, is_verified = false
      WHERE id = v_item.id;
    END IF;
  END LOOP;

  UPDATE public.makmp_submissions
  SET status = p_status,
      total_merit_awarded = v_total,
      reviewer_pin_id = v_pin.id,
      reviewed_at = now(),
      review_notes = p_review_notes,
      rejection_reason = CASE WHEN p_status = 'DITOLAK' THEN p_rejection_reason ELSE NULL END,
      updated_at = now()
  WHERE id = p_submission_id;

  IF p_status = 'DISAHKAN' THEN
    PERFORM public.sync_makmp_submission_to_akademik(p_submission_id, NULL);
  END IF;

  SELECT * INTO v_sub FROM public.makmp_submissions WHERE id = p_submission_id;

  PERFORM public.log_makmp_audit(
    CASE WHEN p_status = 'DISAHKAN' THEN 'SAHKAN' WHEN p_status = 'DITOLAK' THEN 'TOLAK' ELSE 'SEMAK' END,
    p_submission_id::text,
    'Juri "' || v_pin.jury_name || '" ' ||
      CASE WHEN p_status = 'DISAHKAN' THEN 'meluluskan' WHEN p_status = 'DITOLAK' THEN 'menolak' ELSE 'menyemak' END ||
      ' permohonan (' || COALESCE(v_sub.full_name, v_sub.matric_no, '-') || ' / ' ||
      COALESCE(v_sub.tracking_code, '-') || ') — merit ' || v_total || ' markah',
    jsonb_build_object(
      'pin_id', v_pin.id,
      'submission_id', p_submission_id,
      'student', v_sub.full_name,
      'matric_no', v_sub.matric_no,
      'tracking_code', v_sub.tracking_code,
      'status', p_status,
      'merit', v_total,
      'rejection_reason', p_rejection_reason
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$func$;

-- ---------------------------------------------------------------------------
-- 5. unlock_award_review — tambah log audit (selain makmp_review_log sedia ada)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_award_review(
  p_pin text,
  p_award_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_role text;
  v_uid uuid;
  v_pin public.makmp_jury_pins;
  v_is_jury boolean := false;
  v_award record;
  v_sub record;
  v_item record;
  v_recalc_total numeric := 0;
  v_any_pending boolean := false;
  v_prev_status text;
  v_prev_count integer := 0;
  v_actor_name text;
  v_award_name text;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NOT NULL THEN
    SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
    IF v_role NOT IN ('SUPER_ADMIN_JPP', 'JPP') THEN
      RETURN jsonb_build_object('success', false, 'message', 'Anda tiada kebenaran untuk membuka semula semakan.');
    END IF;
  ELSE
    v_pin := public._jury_authorize(p_pin);
    v_is_jury := true;
  END IF;

  SELECT * INTO v_award FROM public.makmp_submission_awards WHERE id = p_award_id;
  IF v_award IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan anugerah tidak dijumpai.');
  END IF;

  SELECT * INTO v_sub FROM public.makmp_submissions WHERE id = v_award.submission_id;
  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak dijumpai.');
  END IF;

  IF v_award.status NOT IN ('DISAHKAN', 'DITOLAK') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan ini belum selesai disemak, tiada perlu dibuka semula.');
  END IF;

  v_prev_status := v_award.status;

  SELECT COALESCE(MAX(unlock_count), 0) INTO v_prev_count
  FROM public.makmp_review_log
  WHERE award_id = p_award_id;

  IF v_award.status = 'DISAHKAN' THEN
    FOR v_item IN
      SELECT * FROM public.makmp_submission_items
      WHERE submission_award_id = p_award_id
        AND akademik_pencapaian_id IS NOT NULL
    LOOP
      IF v_sub.user_id IS NOT NULL AND COALESCE(v_item.merit_awarded, 0) > 0 THEN
        PERFORM public.increment_merit_by_source(v_sub.user_id, -COALESCE(v_item.merit_awarded, 0), 'AKADEMIK');

        INSERT INTO public.merit_transactions (
          user_id, points, reason, actor_name, source, reference_id
        ) VALUES (
          v_sub.user_id,
          -COALESCE(v_item.merit_awarded, 0),
          'Pembatalan semakan MAKMP (dibuka semula): ' || v_item.nama_pencapaian,
          COALESCE(v_pin.jury_name, 'Pentadbir MAKMP'),
          'AKADEMIK',
          v_item.akademik_pencapaian_id
        );
      END IF;

      DELETE FROM public.akademik_pencapaian WHERE id = v_item.akademik_pencapaian_id;
    END LOOP;
  END IF;

  UPDATE public.makmp_submission_items
  SET merit_awarded = 0,
      is_verified = false,
      akademik_pencapaian_id = NULL
  WHERE submission_award_id = p_award_id;

  UPDATE public.makmp_submission_awards
  SET status = 'DALAM_SEMAKAN',
      total_merit_granted = 0,
      reviewed_by_pin_id = NULL,
      reviewed_at = NULL,
      review_notes = NULL,
      rejection_reason = NULL
  WHERE id = p_award_id;

  SELECT COALESCE(SUM(total_merit_granted), 0),
         bool_or(status IN ('MENUNGGU','DALAM_SEMAKAN'))
  INTO v_recalc_total, v_any_pending
  FROM public.makmp_submission_awards
  WHERE submission_id = v_sub.id;

  UPDATE public.makmp_submissions
  SET status = 'DALAM_SEMAKAN',
      total_merit_awarded = v_recalc_total,
      reviewer_pin_id = NULL,
      reviewed_at = NULL,
      review_notes = NULL,
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = v_sub.id;

  INSERT INTO public.makmp_review_log (
    award_id, submission_id, unlocked_by_pin_id, unlocked_by_user_id,
    previous_status, reason, unlock_count
  ) VALUES (
    p_award_id, v_sub.id,
    CASE WHEN v_is_jury THEN v_pin.id ELSE NULL END,
    CASE WHEN NOT v_is_jury THEN v_uid ELSE NULL END,
    v_prev_status, p_reason, v_prev_count + 1
  );

  -- Audit log ke system_logs
  v_actor_name := CASE WHEN v_is_jury THEN v_pin.jury_name ELSE (SELECT full_name FROM public.profiles WHERE id = v_uid) END;
  SELECT name INTO v_award_name FROM public.makmp_award_definitions ad
    JOIN public.makmp_submission_awards a ON a.award_id = ad.id
    WHERE a.id = p_award_id;

  PERFORM public.log_makmp_audit(
    'BUKA_SEMULA',
    p_award_id::text,
    COALESCE(v_actor_name, 'Pentadbir') || ' membuka semula semakan permohonan ' ||
      COALESCE(v_award_name, 'anugerah') || ' (' ||
      COALESCE(v_sub.full_name, v_sub.matric_no, '-') || ' / ' || COALESCE(v_sub.tracking_code, '-') ||
      ') — kali ke-' || (v_prev_count + 1) ||
      CASE WHEN p_reason IS NOT NULL THEN ' — sebab: ' || p_reason ELSE '' END,
    jsonb_build_object(
      'pin_id', CASE WHEN v_is_jury THEN v_pin.id ELSE NULL END,
      'submission_id', v_sub.id,
      'award_name', v_award_name,
      'student', v_sub.full_name,
      'matric_no', v_sub.matric_no,
      'tracking_code', v_sub.tracking_code,
      'previous_status', v_prev_status,
      'reason', p_reason,
      'unlock_count', v_prev_count + 1
    )
  );

  RETURN jsonb_build_object('success', true, 'unlock_count', v_prev_count + 1);
END;
$func$;

-- ---------------------------------------------------------------------------
-- 6. claim_makmp_submission — log "claim akaun"
-- ---------------------------------------------------------------------------
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

  IF v_sub.user_id IS NOT NULL AND v_sub.user_id <> v_uid THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan ini telah dipautkan ke akaun lain.');
  END IF;

  IF v_sub.user_id = v_uid THEN
    RETURN jsonb_build_object(
      'success', true,
      'claimed', true,
      'already_claimed', true,
      'message', 'Permohonan ini sudah dipautkan ke akaun anda.'
    );
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  IF v_prof IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Profil pengguna tidak dijumpai.');
  END IF;

  v_matric_match := UPPER(TRIM(COALESCE(v_prof.matric_no, ''))) = UPPER(TRIM(COALESCE(v_sub.matric_no, '')));
  v_email_match := LOWER(TRIM(COALESCE(v_prof.email, ''))) = LOWER(TRIM(COALESCE(v_sub.email, '')));

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

  UPDATE public.makmp_submissions
  SET user_id = v_uid,
      has_portal_account = true,
      updated_at = now()
  WHERE id = v_sub.id;

  PERFORM public.log_makmp_audit(
    'CLAIM_AKAUN',
    v_sub.id::text,
    'Pelajar "' || COALESCE(v_prof.full_name, v_sub.full_name, '-') || '" memautkan permohonan (' ||
      COALESCE(v_sub.tracking_code, '-') || ') ke akaun portal',
    jsonb_build_object(
      'submission_id', v_sub.id,
      'student', COALESCE(v_prof.full_name, v_sub.full_name),
      'matric_no', v_sub.matric_no,
      'tracking_code', v_sub.tracking_code
    )
  );

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

GRANT EXECUTE ON FUNCTION public.log_makmp_audit(text, text, text, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_award_in_review(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_jury_award_review(text, uuid, uuid, text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_jury_review(text, uuid, text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_award_review(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_makmp_submission(text, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
