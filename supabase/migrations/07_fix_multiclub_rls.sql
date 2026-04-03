-- ============================================================
-- 07_fix_multiclub_rls.sql
-- Pembaikan RLS policies dan RPC untuk sistem multi-kelab
-- ============================================================

-- LANGKAH 1A: Buat fungsi helper SECURITY DEFINER (bypass RLS) untuk elak infinite recursion
CREATE OR REPLACE FUNCTION get_user_approved_club_ids(p_uid UUID)
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ARRAY(
    SELECT club_id
    FROM student_club_memberships
    WHERE user_id = p_uid
      AND account_status = 'APPROVED'
  );
$$;

-- LANGKAH 1B: Tambah RLS Policy — Ahli boleh baca senarai keahlian kelab mereka
-- Guna fungsi helper supaya tiada subquery pada jadual yang sama (elak recursion)
DROP POLICY IF EXISTS "Members can read fellow club memberships" ON student_club_memberships;
CREATE POLICY "Members can read fellow club memberships"
  ON student_club_memberships FOR SELECT
  USING (
    club_id = ANY(get_user_approved_club_ids(auth.uid()))
  );

-- LANGKAH 2: Ubah INSERT Policy — Benarkan auto-assign APPROVED
DROP POLICY IF EXISTS "Student can request membership" ON student_club_memberships;
CREATE POLICY "Student can request membership"
  ON student_club_memberships FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'CLUB_MEMBER'
    AND account_status IN ('PENDING', 'APPROVED')
  );

DROP POLICY IF EXISTS "Students can apply to clubs" ON student_club_memberships;
CREATE POLICY "Students can apply to clubs"
  ON student_club_memberships FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- LANGKAH 3: Kemaskini RPC get_dashboard_data
-- Termasuk casting TEXT → UUID untuk jadual yang guna UUID sebagai club_id
CREATE OR REPLACE FUNCTION get_dashboard_data(
  p_club_id   TEXT,
  p_user_id   UUID,
  p_is_member BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_uuid UUID;
  v_announcement  JSONB;
  v_members       JSONB;
  v_programs      JSONB;
  v_task_stats    JSONB;
  v_act_stats     JSONB;
  v_tasks         JSONB;
  v_activities    JSONB;
BEGIN
  v_club_uuid := p_club_id::UUID;

  SELECT jsonb_build_object('content', content)
    INTO v_announcement
    FROM club_announcements
   WHERE club_id = v_club_uuid
   ORDER BY created_at DESC LIMIT 1;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id, 'full_name', p.full_name,
      'merit', COALESCE(p.merit, 0), 'role', scm.role,
      'avatar_url', p.avatar_url, 'email', p.email, 'matric_no', p.matric_no
    ) ORDER BY COALESCE(p.merit, 0) DESC
  ) INTO v_members
    FROM student_club_memberships scm
    JOIN profiles p ON p.id = scm.user_id
   WHERE scm.club_id = p_club_id AND scm.account_status = 'APPROVED';

  SELECT jsonb_agg(row_to_json(prog)) INTO v_programs
    FROM (SELECT id, nama_program, status, jpp_remarks, updated_at, tarikh_mula
          FROM programs WHERE club_id = p_club_id AND status NOT IN ('COMPLETED')
          ORDER BY updated_at DESC LIMIT 4) prog;

  SELECT jsonb_build_object(
    'active', COUNT(*) FILTER (WHERE status = 'ACTIVE'),
    'completed', COUNT(*) FILTER (WHERE status = 'COMPLETED'),
    'waiting', COUNT(*) FILTER (WHERE approval_status = 'WAITING' AND is_archived = FALSE)
  ) INTO v_task_stats FROM club_tasks WHERE club_id = v_club_uuid;

  SELECT jsonb_build_object(
    'perancangan', COUNT(*) FILTER (WHERE status = 'perancangan'),
    'aktif', COUNT(*) FILTER (WHERE status = 'aktif'),
    'selesai', COUNT(*) FILTER (WHERE status = 'selesai')
  ) INTO v_act_stats FROM club_activities WHERE club_id = v_club_uuid;

  IF p_is_member THEN
    SELECT jsonb_agg(row_to_json(t)) INTO v_tasks
    FROM (SELECT ct.*, p.full_name AS assigned_name
          FROM club_tasks ct LEFT JOIN profiles p ON p.id = ct.assigned_to
          WHERE ct.club_id = v_club_uuid AND ct.is_archived = FALSE
            AND ct.approval_status != 'WAITING'
            AND (ct.assigned_to = p_user_id OR ct.created_by = p_user_id)
          ORDER BY ct.due_date ASC) t;
  ELSE
    SELECT jsonb_agg(row_to_json(t)) INTO v_tasks
    FROM (SELECT ct.*, p.full_name AS assigned_name
          FROM club_tasks ct LEFT JOIN profiles p ON p.id = ct.assigned_to
          WHERE ct.club_id = v_club_uuid AND ct.is_archived = FALSE
          ORDER BY ct.due_date ASC) t;
  END IF;

  SELECT jsonb_agg(row_to_json(a)) INTO v_activities
  FROM (SELECT id, title, status, priority, start_date, end_date, location
        FROM club_activities WHERE club_id = v_club_uuid
        ORDER BY start_date DESC LIMIT 5) a;

  RETURN jsonb_build_object(
    'announcement', COALESCE(v_announcement, 'null'::jsonb),
    'members', COALESCE(v_members, '[]'::jsonb),
    'programs', COALESCE(v_programs, '[]'::jsonb),
    'task_stats', COALESCE(v_task_stats, '{}'::jsonb),
    'act_stats', COALESCE(v_act_stats, '{}'::jsonb),
    'tasks', COALESCE(v_tasks, '[]'::jsonb),
    'activities', COALESCE(v_activities, '[]'::jsonb)
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
