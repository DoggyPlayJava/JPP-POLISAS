-- ============================================================
-- 71_block_duplicate_matric_and_merge_tool.sql
-- 1. RPC: check_matric_registered — sekat registrasi no matrik duplikat
-- 2. RPC: admin_merge_duplicate_accounts — alat gabung akaun berganda
-- 3. Partial UNIQUE INDEX — cegah duplicate matric_no pada masa hadapan
-- ============================================================

-- ------------------------------------------------------------
-- 1. RPC: check_matric_registered
-- Semak jika no matrik sudah wujud dalam profiles.
-- Dipanggil oleh frontend SEBELUM signUp.
-- SECURITY DEFINER kerana perlu akses profiles yang mungkin
-- di luar RLS scope user anon.
-- Return: { exists: boolean, existing_email_hint: text }
-- existing_email_hint = emel sebahagian di-mask (cth: f***l@gmail.com)
-- supaya user tahu dia pernah daftar dan boleh login
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_matric_registered(p_matric_no TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_email TEXT;
  v_masked TEXT;
  v_local TEXT;
  v_domain TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM profiles
  WHERE UPPER(matric_no) = UPPER(TRIM(p_matric_no));

  IF v_count = 0 THEN
    RETURN jsonb_build_object('exists', FALSE);
  END IF;

  -- Ambil emel akaun pertama (asal) untuk beri hint
  SELECT u.email INTO v_email
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE UPPER(p.matric_no) = UPPER(TRIM(p_matric_no))
  ORDER BY u.created_at ASC
  LIMIT 1;

  -- Mask emel: tunjuk aksara pertama & terakhir sahaja
  -- cth: fadhilakif8@gmail.com → f********8@g***l.com
  IF v_email IS NOT NULL AND v_email LIKE '%@%' THEN
    v_local := split_part(v_email, '@', 1);
    v_domain := split_part(v_email, '@', 2);
    
    IF LENGTH(v_local) <= 2 THEN
      v_masked := v_local || '@' || v_domain;
    ELSE
      v_masked := LEFT(v_local, 1) 
        || REPEAT('*', GREATEST(LENGTH(v_local) - 2, 1))
        || RIGHT(v_local, 1) 
        || '@' 
        || LEFT(v_domain, 1) 
        || REPEAT('*', GREATEST(LENGTH(split_part(v_domain, '.', 1)) - 2, 1))
        || RIGHT(split_part(v_domain, '.', 1), 1) 
        || '.' 
        || split_part(v_domain, '.', 2);
    END IF;
  ELSE
    v_masked := '***';
  END IF;

  RETURN jsonb_build_object(
    'exists', TRUE,
    'email_hint', v_masked,
    'account_count', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_matric_registered(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_matric_registered(TEXT) TO authenticated;


-- ------------------------------------------------------------
-- 2. RPC: admin_merge_duplicate_accounts
-- Alat untuk admin JPP gabungkan akaun berganda.
-- 
-- Logik: Pilih satu akaun PRIMARY (yang nak dikekalkan),
-- dan satu atau lebih akaun SECONDARY (yang nak dihapuskan).
-- 
-- Proses:
-- a) Pindahkan semua data penting dari secondary → primary
--    (club_memberships, merit, kelab, dll)
-- b) Padamkan akaun secondary dari profiles dan auth.users
-- c) Log tindakan ke admin_audit_logs
--
-- HANYA SUPER_ADMIN_JPP boleh guna.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_merge_duplicate_accounts(
  p_primary_id UUID,
  p_secondary_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_primary_name TEXT;
  v_secondary_name TEXT;
  v_secondary_email TEXT;
  v_secondary_matric TEXT;
  v_moved_memberships INT := 0;
  v_moved_merits INT := 0;
BEGIN
  -- Auth guard: hanya SUPER_ADMIN_JPP
  SELECT role INTO v_caller_role
  FROM profiles WHERE id = auth.uid();
  
  IF v_caller_role != 'SUPER_ADMIN_JPP' THEN
    RAISE EXCEPTION 'Akses Ditolak: Hanya Super Admin boleh menggabungkan akaun.';
  END IF;

  -- Pastikan kedua-dua akaun wujud
  SELECT full_name INTO v_primary_name FROM profiles WHERE id = p_primary_id;
  SELECT full_name, matric_no INTO v_secondary_name, v_secondary_matric FROM profiles WHERE id = p_secondary_id;
  
  SELECT email INTO v_secondary_email FROM auth.users WHERE id = p_secondary_id;
  
  IF v_primary_name IS NULL THEN
    RAISE EXCEPTION 'Akaun primary tidak dijumpai.';
  END IF;
  IF v_secondary_name IS NULL THEN
    RAISE EXCEPTION 'Akaun secondary tidak dijumpai.';
  END IF;

  -- Jangan merge diri sendiri
  IF p_primary_id = p_secondary_id THEN
    RAISE EXCEPTION 'Tidak boleh gabungkan akaun yang sama.';
  END IF;

  -- ── A) Pindahkan club memberships ───────────────────────────
  -- Hanya pindah keahlian yang PRIMARY belum ada
  UPDATE student_club_memberships
  SET user_id = p_primary_id, updated_at = NOW()
  WHERE user_id = p_secondary_id
    AND club_id NOT IN (
      SELECT club_id FROM student_club_memberships WHERE user_id = p_primary_id
    );
  GET DIAGNOSTICS v_moved_memberships = ROW_COUNT;

  -- Padam remaining memberships yang duplicate
  DELETE FROM student_club_memberships WHERE user_id = p_secondary_id;

  -- ── B) Gabungkan merit points ───────────────────────────────
  UPDATE profiles
  SET merit = COALESCE(merit, 0) + COALESCE(
    (SELECT merit FROM profiles WHERE id = p_secondary_id), 0
  )
  WHERE id = p_primary_id;
  
  -- ── C) Pindahkan notifikasi ─────────────────────────────────
  UPDATE notifications
  SET user_id = p_primary_id
  WHERE user_id = p_secondary_id;

  -- ── D) Pindahkan club_logs ──────────────────────────────────
  UPDATE club_logs
  SET actor_id = p_primary_id
  WHERE actor_id = p_secondary_id;

  -- ── E) Pindahkan club_tasks assignments ─────────────────────
  UPDATE club_tasks
  SET assigned_to = p_primary_id
  WHERE assigned_to = p_secondary_id;

  UPDATE club_tasks
  SET created_by = p_primary_id
  WHERE created_by = p_secondary_id;

  -- ── F) Pindahkan AI tier (ambil yang lebih tinggi) ──────────
  UPDATE profiles
  SET subscription_tier = CASE 
    WHEN COALESCE(subscription_tier, 'free') = 'pro' THEN 'pro'
    WHEN COALESCE((SELECT subscription_tier FROM profiles WHERE id = p_secondary_id), 'free') = 'pro' THEN 'pro'
    ELSE COALESCE(subscription_tier, 'free')
  END,
  ai_token_balance = COALESCE(ai_token_balance, 0) + COALESCE(
    (SELECT ai_token_balance FROM profiles WHERE id = p_secondary_id), 0
  )
  WHERE id = p_primary_id;

  -- ── G) Padam profil secondary ───────────────────────────────
  DELETE FROM profiles WHERE id = p_secondary_id;

  -- ── H) Padam auth.users secondary ───────────────────────────
  DELETE FROM auth.users WHERE id = p_secondary_id;

  -- ── I) Log audit ────────────────────────────────────────────
  INSERT INTO admin_audit_logs (actor_id, action_type, module, entity_id, description, metadata)
  VALUES (
    auth.uid(),
    'ACCOUNT_MERGED',
    'JPP Admin',
    p_primary_id::TEXT,
    format('Akaun berganda digabungkan: %s (%s) → %s', v_secondary_name, v_secondary_email, v_primary_name),
    jsonb_build_object(
      'primary_id', p_primary_id,
      'secondary_id', p_secondary_id,
      'secondary_email', v_secondary_email,
      'secondary_matric', v_secondary_matric,
      'memberships_moved', v_moved_memberships
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', format('Akaun %s berjaya digabungkan ke %s', v_secondary_name, v_primary_name),
    'memberships_moved', v_moved_memberships
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_merge_duplicate_accounts(UUID, UUID) TO authenticated;


-- ------------------------------------------------------------
-- 3. Partial UNIQUE INDEX pada matric_no
-- Cegah duplicate BARU pada masa hadapan.
-- Gunakan partial index (WHERE matric_no IS NOT NULL AND matric_no != '')
-- supaya NULL/kosong dibenarkan (untuk Google login yang belum isi matric).
-- 
-- ⚠ PENTING: Jalankan ini SELEPAS semua duplicate sedia ada
-- telah digabungkan/diselesaikan. Jika masih ada duplicate, 
-- CREATE INDEX akan gagal.
-- 
-- Sebab itu kita wrap dalam DO block dengan EXCEPTION handler.
-- ------------------------------------------------------------
DO $$
BEGIN
  -- Cuba buat unique index
  CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_matric_no_unique 
    ON profiles (UPPER(matric_no)) 
    WHERE matric_no IS NOT NULL AND matric_no != '';
EXCEPTION
  WHEN unique_violation THEN
    -- Duplicate masih wujud, skip index creation — admin perlu gabung dulu
    RAISE NOTICE 'AMARAN: Tidak dapat cipta UNIQUE index kerana masih ada no matrik berganda. Sila gabungkan akaun berganda dahulu.';
END;
$$;
