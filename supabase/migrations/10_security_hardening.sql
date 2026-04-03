-- ============================================================
-- 10_security_hardening.sql
-- FASA 1: Pengukuhan Pangkalan Data & Penutupan Celah Keselamatan
-- ============================================================

-- ------------------------------------------------------------
-- 1. TAMPAL CELAH RLS INSERT (BLIND SPOT A)
-- Peraturan sebelum ini membenarkan apa jua role dimasukkan selagi user_id = auth.uid()
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Students can apply to clubs" ON student_club_memberships;
CREATE POLICY "Students can apply to clubs"
  ON student_club_memberships FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id::text
    AND role = 'CLUB_MEMBER'
    AND account_status = 'PENDING'
  );

-- ------------------------------------------------------------
-- 2. TAMPAL IDOR DALAM RPC get_dashboard_data (BLIND SPOT B)
-- Fungsi ini adalah SECURITY DEFINER. Kita wajib tambah auth check.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS get_dashboard_data(TEXT, UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION get_dashboard_data(
  p_club_id     TEXT,
  p_user_id     UUID,
  p_is_member   BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_announcement  JSONB;
  v_members       JSONB;
  v_programs      JSONB;
  v_task_stats    JSONB;
  v_act_stats     JSONB;
  v_tasks         JSONB;
  v_activities    JSONB;
  v_is_authorized BOOLEAN;
BEGIN
  -- AUTH GUARD: Pastikan caller adalah Ahli Kelab berstatus APPROVED (atau JPP)
  -- Kerana RPC ini SECURITY DEFINER, ia bypass RLS, jadi kita perlu buat semakan manual
  SELECT EXISTS (
    SELECT 1 FROM student_club_memberships 
    WHERE user_id = auth.uid() 
      AND club_id = p_club_id
      AND account_status = 'APPROVED'
  ) OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP'
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Akses ditolak: Anda bukan ahli yang sah untuk kelab ini.';
  END IF;

  -- ── 1. Pengumuman terkini ──────────────────────────────────
  SELECT jsonb_build_object('content', content)
    INTO v_announcement
    FROM club_announcements
   WHERE club_id = p_club_id
   ORDER BY created_at DESC
   LIMIT 1;

  -- ── 2. Ahli aktif ─────────────────────────────────────────
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',         id,
      'full_name',  full_name,
      'merit',      COALESCE(merit, 0),
      'role',       role,
      'avatar_url', avatar_url,
      'matric_no',  matric_no -- Jangan return email (PDPA prevention)
    ) ORDER BY COALESCE(merit, 0) DESC
  )
    INTO v_members
    FROM student_club_memberships scm
    JOIN profiles p ON p.id = scm.user_id
   WHERE scm.club_id = p_club_id AND scm.account_status = 'APPROVED'
   LIMIT 300; -- Limit keselamatan RAM

  -- ── 3. Program (Takwim Rasmi) — limit 4 ──────────────────-
  SELECT jsonb_agg(row_to_json(prog))
    INTO v_programs
    FROM (
      SELECT id, nama_program, status, jpp_remarks, updated_at, tarikh_mula
        FROM programs
       WHERE club_id = p_club_id
         AND status NOT IN ('COMPLETED')
       ORDER BY updated_at DESC
       LIMIT 4
    ) prog;

  -- ── 4. Statistik Tugasan (untuk chart) ────────────────────
  SELECT jsonb_build_object(
      'active',    COUNT(*) FILTER (WHERE status = 'ACTIVE'),
      'completed', COUNT(*) FILTER (WHERE status = 'COMPLETED'),
      'waiting',   COUNT(*) FILTER (WHERE approval_status = 'WAITING' AND is_archived = FALSE)
    )
    INTO v_task_stats
    FROM club_tasks
   WHERE club_id = p_club_id;

  -- ── 5. Statistik Aktiviti (untuk chart) ───────────────────
  SELECT jsonb_build_object(
      'perancangan', COUNT(*) FILTER (WHERE status = 'perancangan'),
      'aktif',       COUNT(*) FILTER (WHERE status = 'aktif'),
      'selesai',     COUNT(*) FILTER (WHERE status = 'selesai')
    )
    INTO v_act_stats
    FROM club_activities
   WHERE club_id = p_club_id;

  -- ── 6. Senarai Tugasan Aktif ───────────────────────────────
  IF p_is_member THEN
    -- Ahli biasa: hanya tugasan yang diluluskan & milik mereka
    SELECT jsonb_agg(row_to_json(t))
      INTO v_tasks
      FROM (
        SELECT ct.*, p.full_name AS assigned_name
          FROM club_tasks ct
          LEFT JOIN profiles p ON p.id = ct.assigned_to
         WHERE ct.club_id = p_club_id
           AND ct.is_archived = FALSE
           AND ct.approval_status != 'WAITING'
           AND (ct.assigned_to = p_user_id OR ct.created_by = p_user_id)
         ORDER BY ct.due_date ASC
         LIMIT 50 -- Limit keselamatan RAM
      ) t;
  ELSE
    -- MT/Presiden/Penasihat: semua tugasan
    SELECT jsonb_agg(row_to_json(t))
      INTO v_tasks
      FROM (
        SELECT ct.*, p.full_name AS assigned_name
          FROM club_tasks ct
          LEFT JOIN profiles p ON p.id = ct.assigned_to
         WHERE ct.club_id = p_club_id
           AND ct.is_archived = FALSE
         ORDER BY ct.due_date ASC
         LIMIT 50 -- Limit keselamatan RAM
      ) t;
  END IF;

  -- ── 7. Aktiviti kelab terbaru (limit 5) ───────────────────
  SELECT jsonb_agg(row_to_json(a))
    INTO v_activities
    FROM (
      SELECT id, title, status, priority, start_date, end_date, location
        FROM club_activities
       WHERE club_id = p_club_id
       ORDER BY start_date DESC
       LIMIT 5
    ) a;

  -- ── Return semua dalam satu JSONB ─────────────────────────
  RETURN jsonb_build_object(
    'announcement',  COALESCE(v_announcement, 'null'::jsonb),
    'members',       COALESCE(v_members,      '[]'::jsonb),
    'programs',      COALESCE(v_programs,     '[]'::jsonb),
    'task_stats',    COALESCE(v_task_stats,   '{}'::jsonb),
    'act_stats',     COALESCE(v_act_stats,    '{}'::jsonb),
    'tasks',         COALESCE(v_tasks,        '[]'::jsonb),
    'activities',    COALESCE(v_activities,   '[]'::jsonb)
  );
END;
$$;


-- ------------------------------------------------------------
-- 3. TAMPAL RACE CONDITION TRIGGER (BLIND SPOT C)
-- Guna Row Lock (pg_advisory_xact_lock) pada user_id
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_club_membership_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_approved_count INT;
  max_allowed            INT;
  user_lock_hash         INT;
BEGIN
  -- Hanya semak had apabila status bertukar ke APPROVED
  IF NEW.account_status <> 'APPROVED' THEN
    RETURN NEW;
  END IF;

  -- Jangan semak jika status tidak berubah
  IF TG_OP = 'UPDATE' AND OLD.account_status = 'APPROVED' THEN
    RETURN NEW;
  END IF;

  -- BINA ADVISORY LOCK: lock berasaskan user_id supaya concurrent requests akan tunggu (q-ing)
  -- hashtext(NEW.user_id::text) memberikan 32-bit integer unqiue
  user_lock_hash := hashtext(NEW.user_id::text);
  PERFORM pg_advisory_xact_lock(user_lock_hash);

  -- Hitung berapa kelab APPROVED (mengambil kira status yang telah di-kommit)
  SELECT COUNT(*) INTO current_approved_count
  FROM student_club_memberships
  WHERE user_id = NEW.user_id
    AND account_status = 'APPROVED'
    AND id IS DISTINCT FROM NEW.id;

  -- Dapatkan had
  SELECT (value)::int INTO max_allowed
  FROM system_settings
  WHERE key = 'max_clubs_per_student';

  IF max_allowed IS NULL THEN
    max_allowed := 2;
  END IF;

  -- Tolak jika melebihi had
  IF current_approved_count >= max_allowed THEN
    RAISE EXCEPTION 
      'Had keahlian dicapai. Pelajar ini sudah dalam % kelab. Had semasa: % kelab. Hubungi JPP untuk ubah had.',
      current_approved_count, max_allowed;
  END IF;

  RETURN NEW;
END;
$$;


-- ------------------------------------------------------------
-- 4. RPC: BAHARU - change_member_role
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS change_member_role(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION change_member_role(
  p_target_user_id UUID,
  p_club_id        TEXT,
  p_new_role       TEXT
) 
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Siasat peranan pemanggil dalam kelab tersebut
  SELECT role INTO caller_role
  FROM student_club_memberships
  WHERE user_id = auth.uid() AND club_id = p_club_id AND account_status = 'APPROVED';

  -- Jika tiada, cuba lihat jika mereka adalah SUPER_ADMIN_JPP
  IF caller_role IS NULL THEN
    SELECT role INTO caller_role
    FROM profiles
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP';
  END IF;

  -- Syarat Kelulusan Semakan Pengubah (Authorization Matrix)
  -- 1. Penasihat Kelab & JPP boleh beri apa peranan sahaja.
  -- 2. Presiden kelab hanya boleh melantik MT dan MEMBER, *tidak* boleh melantik orang lain jadi Presiden/Penasihat.
  IF caller_role IN ('CLUB_ADVISOR', 'SUPER_ADMIN_JPP') THEN
    -- Lulus tanpa sekatan
  ELSIF caller_role = 'CLUB_PRESIDENT' THEN
    IF p_new_role IN ('CLUB_PRESIDENT', 'CLUB_ADVISOR', 'SUPER_ADMIN_JPP') THEN
      RAISE EXCEPTION 'Akses Ditolak: Presiden hanya boleh menukar pangkat hingga had MT.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Akses Ditolak: Anda tidak mempunyai kuasa penukaran jawatan.';
  END IF;

  -- Segarkan pangkat
  UPDATE student_club_memberships
  SET role = p_new_role, updated_at = NOW()
  WHERE user_id = p_target_user_id AND club_id = p_club_id;

  RETURN TRUE;
END;
$$;

-- ------------------------------------------------------------
-- 5. RPC: BAHARU - approve_all_pending_memberships
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS approve_all_pending_memberships(TEXT);
CREATE OR REPLACE FUNCTION approve_all_pending_memberships(
  p_club_id TEXT
) 
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role   TEXT;
  max_allowed   INT;
  r             RECORD;
  approved_count INT := 0;
  user_lock_hash INT;
BEGIN
  -- Dapatkan Authorization
  SELECT role INTO caller_role
  FROM student_club_memberships
  WHERE user_id = auth.uid() AND club_id = p_club_id AND account_status = 'APPROVED';

  IF caller_role IS NULL THEN
    SELECT role INTO caller_role FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP';
  END IF;

  IF caller_role NOT IN ('CLUB_PRESIDENT', 'CLUB_ADVISOR', 'CLUB_MT', 'SUPER_ADMIN_JPP') THEN
    RAISE EXCEPTION 'Akses Ditolak: Tiada kuasa.';
  END IF;

  -- Dapatkan Had
  SELECT (value)::int INTO max_allowed FROM system_settings WHERE key = 'max_clubs_per_student';
  IF max_allowed IS NULL THEN max_allowed := 2; END IF;

  -- Loop melalui semua ahli PENDING
  FOR r IN 
    SELECT id, user_id FROM student_club_memberships 
    WHERE club_id = p_club_id AND account_status = 'PENDING'
    ORDER BY created_at ASC
  LOOP
    -- Kunci Transaksi Row
    user_lock_hash := hashtext(r.user_id::text);
    PERFORM pg_advisory_xact_lock(user_lock_hash);

    -- Semak jika pelajar capai had
    IF (SELECT COUNT(*) FROM student_club_memberships WHERE user_id = r.user_id AND account_status = 'APPROVED') < max_allowed THEN
      UPDATE student_club_memberships 
      SET account_status = 'APPROVED', updated_at = NOW() 
      WHERE id = r.id;
      approved_count := approved_count + 1;
    END IF;
  END LOOP;

  RETURN approved_count;
END;
$$;

-- ------------------------------------------------------------
-- 6. RPC: BAHARU - increment_merit
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS increment_merit(UUID, INT);
CREATE OR REPLACE FUNCTION increment_merit(
  p_target_user_id UUID,
  p_increment_value INT
) 
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Dalam kes p_increment_value negatif (demerit), pastikan nilai tak lebih rendah dari 0
  UPDATE profiles
  SET merit = GREATEST(COALESCE(merit, 0) + p_increment_value, 0)
  WHERE id = p_target_user_id;

  RETURN TRUE;
END;
$$;
