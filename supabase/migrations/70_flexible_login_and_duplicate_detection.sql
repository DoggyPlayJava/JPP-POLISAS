-- ============================================================
-- 70_flexible_login_and_duplicate_detection.sql
-- 1. Login fleksibel — user boleh login guna Gmail/Nama/No Matrik
-- 2. Pengesanan akaun berganda (duplicate matric_no)
-- ============================================================

-- ------------------------------------------------------------
-- 1. RPC: resolve_login_identifier
-- Terima input teks bebas (emel, nama penuh, atau no matrik)
-- dan kembalikan emel yang padanan untuk digunakan dalam
-- signInWithPassword. Ini TIDAK mendedahkan kata laluan —
-- hanya menukar identifier → email.
--
-- Keutamaan padanan:
--   A) Jika input mengandungi '@' → anggap ia emel, return terus
--   B) Cuba padankan sebagai matric_no (case-insensitive exact match)
--   C) Cuba padankan sebagai full_name (case-insensitive exact match)
--   D) Jika tiada, return NULL
--
-- KESELAMATAN: SECURITY DEFINER kerana perlu akses auth.users
-- untuk dapatkan emel. Hanya return emel, tiada data lain.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_login_identifier(p_identifier TEXT)
RETURNS TABLE(email TEXT, match_type TEXT, match_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
  v_count INT;
  v_email TEXT;
BEGIN
  v_clean := TRIM(p_identifier);
  
  -- A) Jika mengandungi '@', ia sudah emel — return terus
  IF v_clean LIKE '%@%' THEN
    RETURN QUERY SELECT v_clean, 'email'::TEXT, 1;
    RETURN;
  END IF;

  -- B) Cuba padankan sebagai no matrik (exact, case-insensitive)
  SELECT COUNT(*) INTO v_count
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE UPPER(p.matric_no) = UPPER(v_clean);

  IF v_count = 1 THEN
    SELECT u.email INTO v_email
    FROM profiles p
    INNER JOIN auth.users u ON u.id = p.id
    WHERE UPPER(p.matric_no) = UPPER(v_clean)
    LIMIT 1;
    
    RETURN QUERY SELECT v_email, 'matric_no'::TEXT, 1;
    RETURN;
  ELSIF v_count > 1 THEN
    -- Ada akaun berganda untuk no matrik ini — beritahu user
    RETURN QUERY SELECT NULL::TEXT, 'matric_no_duplicate'::TEXT, v_count;
    RETURN;
  END IF;

  -- C) Cuba padankan sebagai nama penuh (exact, case-insensitive)
  SELECT COUNT(*) INTO v_count
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE UPPER(p.full_name) = UPPER(v_clean);

  IF v_count = 1 THEN
    SELECT u.email INTO v_email
    FROM profiles p
    INNER JOIN auth.users u ON u.id = p.id
    WHERE UPPER(p.full_name) = UPPER(v_clean)
    LIMIT 1;
    
    RETURN QUERY SELECT v_email, 'full_name'::TEXT, 1;
    RETURN;
  ELSIF v_count > 1 THEN
    -- Ada ramai user dengan nama sama — beritahu user guna emel/matrik
    RETURN QUERY SELECT NULL::TEXT, 'full_name_duplicate'::TEXT, v_count;
    RETURN;
  END IF;

  -- D) Tiada padanan
  RETURN QUERY SELECT NULL::TEXT, 'not_found'::TEXT, 0;
  RETURN;
END;
$$;

-- Beri akses kepada anonymous dan authenticated
GRANT EXECUTE ON FUNCTION resolve_login_identifier(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION resolve_login_identifier(TEXT) TO authenticated;


-- ------------------------------------------------------------
-- 2. RPC: detect_duplicate_matric_accounts
-- Scan semua profiles dan kembalikan senarai matric_no yang
-- mempunyai lebih dari satu akaun. Hanya untuk SUPER_ADMIN_JPP.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION detect_duplicate_matric_accounts()
RETURNS TABLE(
  matric_no TEXT,
  account_count BIGINT,
  accounts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auth guard: hanya SUPER_ADMIN_JPP atau JPP boleh akses
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ) THEN
    RAISE EXCEPTION 'Akses Ditolak: Hanya JPP Admin boleh lihat data ini.';
  END IF;

  RETURN QUERY
  SELECT 
    p.matric_no,
    COUNT(*)::BIGINT AS account_count,
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'email', u.email,
        'role', p.role,
        'department', p.department,
        'created_at', u.created_at,
        'last_sign_in', u.last_sign_in_at,
        'providers', u.raw_app_meta_data->'providers',
        'email_confirmed', u.email_confirmed_at IS NOT NULL
      ) ORDER BY u.created_at ASC
    ) AS accounts
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE p.matric_no IS NOT NULL 
    AND p.matric_no != ''
  GROUP BY p.matric_no
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC, p.matric_no;
END;
$$;

-- Hanya authenticated boleh panggil (guard di dalam function)
GRANT EXECUTE ON FUNCTION detect_duplicate_matric_accounts() TO authenticated;
