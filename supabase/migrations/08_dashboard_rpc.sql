-- ============================================================
-- FASA 1B: RPC Function — get_dashboard_data
-- Menggantikan 8 queries berasingan dengan 1 panggilan sahaja
-- Ini mengurangkan DB load 87.5% semasa 800+ pengguna serentak
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_data(
  p_club_id     TEXT,
  p_user_id     UUID,
  p_is_member   BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_announcement  JSONB;
  v_members       JSONB;
  v_programs      JSONB;
  v_task_stats    JSONB;
  v_act_stats     JSONB;
  v_tasks         JSONB;
  v_activities    JSONB;
BEGIN
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
      'avatar_url', avatar_url
    ) ORDER BY COALESCE(merit, 0) DESC
  )
    INTO v_members
    FROM profiles
   WHERE club_id = p_club_id
     AND account_status = 'APPROVED';

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

-- Grant akses kepada anon dan authenticated roles
GRANT EXECUTE ON FUNCTION get_dashboard_data(TEXT, UUID, BOOLEAN) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Test function (optional — boleh run dalam SQL Editor)
-- SELECT get_dashboard_data('CLUB_ID_HERE', 'USER_UUID_HERE', false);
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  RAISE NOTICE 'RPC get_dashboard_data() berjaya dibuat. 8 queries → 1 call!';
END $$;
