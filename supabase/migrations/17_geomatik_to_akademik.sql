-- ============================================================
-- 17_geomatik_to_akademik.sql
-- 1) Pindahkan pengguna "geomatik" ke "awam"
-- 2) Kemas kini trigger enforce_club_membership_limit khusus untuk GEOSAS
-- ============================================================

-- 1. Pindahkan data sedia ada dari geomatik ke awam
UPDATE profiles
SET department = 'awam'
WHERE department = 'geomatik';

-- 2. Gantikan fungsi penguatkuasaan had keahlian
CREATE OR REPLACE FUNCTION enforce_club_membership_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_approved_count INT;
  max_allowed            INT;
  user_dept              TEXT;
  is_target_geosas       BOOLEAN;
  has_geosas             BOOLEAN;
BEGIN
  -- Hanya semak had apabila status bertukar ke APPROVED
  IF NEW.account_status <> 'APPROVED' THEN
    RETURN NEW;
  END IF;

  -- Jangan semak jika status tidak berubah
  IF TG_OP = 'UPDATE' AND OLD.account_status = 'APPROVED' THEN
    RETURN NEW;
  END IF;

  -- Kira kelab yang di-APPROVED (tidak termasuk entri ini)
  SELECT COUNT(*) INTO current_approved_count
  FROM student_club_memberships
  WHERE user_id = NEW.user_id
    AND account_status = 'APPROVED'
    AND id IS DISTINCT FROM NEW.id;

  -- Dapatkan had base system setting (default 2)
  SELECT (value)::int INTO max_allowed
  FROM system_settings
  WHERE key = 'max_clubs_per_student';

  IF max_allowed IS NULL THEN
    max_allowed := 2;
  END IF;

  -- LOGIC KHAS GEOSAS (Hanya pelajar JKA)
  SELECT department INTO user_dept
  FROM profiles
  WHERE id = NEW.user_id;

  -- Semak jika permohonan baru adalah untuk GEOSAS
  SELECT EXISTS (
    SELECT 1 FROM clubs 
    WHERE id::text = NEW.club_id::text 
      AND UPPER(short_name) = 'GEOSAS'
  ) INTO is_target_geosas;

  -- Semak jika pelajar sudah mempunyai kelab GEOSAS (yang approved)
  SELECT EXISTS (
    SELECT 1 FROM student_club_memberships scm
    JOIN clubs c ON c.id::text = scm.club_id::text
    WHERE scm.user_id = NEW.user_id 
      AND scm.account_status = 'APPROVED' 
      AND UPPER(c.short_name) = 'GEOSAS'
      AND scm.id IS DISTINCT FROM NEW.id
  ) INTO has_geosas;

  -- Jika is_target_geosas adalah BENAR, pastikan mereka adalah pelajar JKA
  IF is_target_geosas AND (user_dept IS NULL OR user_dept <> 'awam') THEN
    RAISE EXCEPTION 'Kelab GEOSAS hanya terbuka kepada pelajar Jabatan Kejuruteraan Awam (JKA).';
  END IF;

  -- Beri kuota +1 (+3 total default) jika mereka JKA dan berkait GEOSAS
  IF user_dept = 'awam' AND (is_target_geosas OR has_geosas) THEN
    max_allowed := max_allowed + 1;
  END IF;

  -- Tolak jika melebihi had (termasuk kelonggaran GEOSAS)
  IF current_approved_count >= max_allowed THEN
    RAISE EXCEPTION 
      'Had keahlian dicapai. Pelajar ini sudah dalam % kelab. Had semasa: % kelab. Hubungi JPP untuk ubah had.',
      current_approved_count,
      max_allowed;
  END IF;

  RETURN NEW;

EXCEPTION 
  WHEN SQLSTATE 'P0001' THEN RAISE; -- Re-throw custom exception
  WHEN OTHERS THEN
    RAISE WARNING 'enforce_club_membership_limit error: %', SQLERRM;
    RETURN NEW;
END;
$$;
