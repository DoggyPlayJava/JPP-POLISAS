-- ============================================================================
-- Migration: 20260923_makmp_review_unlock_log.sql
-- Description: Buka semula (unlock) oleh JURI ATAU pentadbir, dengan audit log.
--   - Juri boleh buka semula sendiri (guna PIN) bila tersilap sahkan/tolak.
--   - Setiap unlock direkod dalam makmp_review_log (siapa, bila, status asal,
--     sebab, dan kiraan kali dibuka semula).
--   - Merit di-reverse betul-betul (deduct + padam akademik_pencapaian +
--     transaksi pembalikan), supaya re-sahkan tak double-count.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Jadual log semakan semula (unlock)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.makmp_review_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id uuid NOT NULL REFERENCES public.makmp_submission_awards(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.makmp_submissions(id) ON DELETE CASCADE,
  unlocked_by_pin_id uuid REFERENCES public.makmp_jury_pins(id) ON DELETE SET NULL,
  unlocked_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  previous_status text NOT NULL,
  reason text,
  unlock_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_makmp_review_log_award ON public.makmp_review_log(award_id);
CREATE INDEX IF NOT EXISTS idx_makmp_review_log_submission ON public.makmp_review_log(submission_id);

-- ---------------------------------------------------------------------------
-- 2. RPC unlock_award_review — JURI (PIN) ATAU pentadbir (auth.uid)
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
BEGIN
  -- Tentukan pemanggil: juri (PIN, tanpa session auth) ATAU pentadbir (auth.uid)
  v_uid := auth.uid();

  IF v_uid IS NOT NULL THEN
    SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
    IF v_role NOT IN ('SUPER_ADMIN_JPP', 'JPP') THEN
      -- Ada session auth tapi bukan pentadbir — TOLAK (jangan fallback ke PIN).
      RETURN jsonb_build_object('success', false, 'message', 'Anda tiada kebenaran untuk membuka semula semakan.');
    END IF;
    -- Pentadbir — authorized
  ELSE
    -- Tiada session auth; hanya juri (PIN) boleh
    v_pin := public._jury_authorize(p_pin);
    v_is_jury := true;
  END IF;

  -- Ambil award + submission
  SELECT * INTO v_award FROM public.makmp_submission_awards WHERE id = p_award_id;
  IF v_award IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan anugerah tidak dijumpai.');
  END IF;

  SELECT * INTO v_sub FROM public.makmp_submissions WHERE id = v_award.submission_id;
  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak dijumpai.');
  END IF;

  -- Hanya boleh buka semula award yang telah selesai (DISAHKAN/DITOLAK)
  IF v_award.status NOT IN ('DISAHKAN', 'DITOLAK') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan ini belum selesai disemak, tiada perlu dibuka semula.');
  END IF;

  v_prev_status := v_award.status;

  -- Kira berapa kali award ni pernah dibuka semula sebelum ini
  SELECT COALESCE(MAX(unlock_count), 0) INTO v_prev_count
  FROM public.makmp_review_log
  WHERE award_id = p_award_id;

  -- Reverse merit & padam akademik_pencapaian (jika award DISAHKAN)
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

  -- Reset semua items award
  UPDATE public.makmp_submission_items
  SET merit_awarded = 0,
      is_verified = false,
      akademik_pencapaian_id = NULL
  WHERE submission_award_id = p_award_id;

  -- Reset award -> DALAM_SEMAKAN
  UPDATE public.makmp_submission_awards
  SET status = 'DALAM_SEMAKAN',
      total_merit_granted = 0,
      reviewed_by_pin_id = NULL,
      reviewed_at = NULL,
      review_notes = NULL,
      rejection_reason = NULL
  WHERE id = p_award_id;

  -- Recalc master submission
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

  -- Log unlock
  INSERT INTO public.makmp_review_log (
    award_id, submission_id, unlocked_by_pin_id, unlocked_by_user_id,
    previous_status, reason, unlock_count
  ) VALUES (
    p_award_id, v_sub.id,
    CASE WHEN v_is_jury THEN v_pin.id ELSE NULL END,
    CASE WHEN NOT v_is_jury THEN v_uid ELSE NULL END,
    v_prev_status, p_reason, v_prev_count + 1
  );

  RETURN jsonb_build_object('success', true, 'unlock_count', v_prev_count + 1);
END;
$func$;

-- ---------------------------------------------------------------------------
-- 3. RPC lama unlock_jury_award_review — kekalkan backward compat, delegate
--    kepada RPC baru (kini log juga + juri boleh guna)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_jury_award_review(p_award_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
BEGIN
  -- Backward compatible: admin (auth.uid) sahaja, tanpa PIN
  RETURN public.unlock_award_review('', p_award_id, NULL);
END;
$func$;

-- ---------------------------------------------------------------------------
-- 4. RPC untuk baca log (juri nampak log award dalam scope; admin nampak semua)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fetch_review_log(p_award_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $func$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    to_jsonb(l.*)
    || jsonb_build_object(
      'jury_name', (SELECT j.jury_name FROM public.makmp_jury_pins j WHERE j.id = l.unlocked_by_pin_id),
      'admin_name', (SELECT p.full_name FROM public.profiles p WHERE p.id = l.unlocked_by_user_id)
    )
    ORDER BY l.created_at ASC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.makmp_review_log l
  WHERE l.award_id = p_award_id;

  RETURN v_result;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.unlock_award_review(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_jury_award_review(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fetch_review_log(uuid) TO anon, authenticated;

-- Pentadbir juga perlu boleh baca log table terus (untuk admin dashboard)
ALTER TABLE public.makmp_review_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "makmp_review_log_admin_select" ON public.makmp_review_log;
CREATE POLICY "makmp_review_log_admin_select" ON public.makmp_review_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('SUPER_ADMIN_JPP', 'JPP')
    )
  );

NOTIFY pgrst, 'reload schema';
