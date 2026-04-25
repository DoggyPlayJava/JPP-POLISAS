-- 1. Create missing indexes on foreign keys to prevent full table scans and reduce Disk I/O

-- Akademik Module
CREATE INDEX IF NOT EXISTS idx_akademik_files_folder_id ON public.akademik_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_akademik_files_owner_user_id ON public.akademik_files(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_akademik_files_uploaded_by ON public.akademik_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_akademik_unlock_req_pencapaian ON public.akademik_unlock_requests(pencapaian_id);
CREATE INDEX IF NOT EXISTS idx_akademik_unlock_req_user ON public.akademik_unlock_requests(user_id);

-- Asrama Module
CREATE INDEX IF NOT EXISTS idx_asrama_recom_marked_by ON public.asrama_recommendations(marked_by);

-- Kebajikan Module
CREATE INDEX IF NOT EXISTS idx_kebajikan_notif_ticket ON public.kebajikan_notifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kebajikan_comments_author ON public.kebajikan_ticket_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_kebajikan_tickets_resolved_by ON public.kebajikan_tickets(resolved_by);
CREATE INDEX IF NOT EXISTS idx_kebajikan_ticket_status_log_actor ON public.kebajikan_ticket_status_log(actor_id);

-- Club Module
CREATE INDEX IF NOT EXISTS idx_club_logs_club_id ON public.club_logs(club_id);
CREATE INDEX IF NOT EXISTS idx_club_logs_actor_id ON public.club_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_club_tasks_assigned_to ON public.club_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_club_activities_user ON public.club_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_clubs_president_id ON public.clubs(president_id);

-- Polymart Module
CREATE INDEX IF NOT EXISTS idx_polymart_orders_product_id ON public.polymart_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_polymart_reports_reviewed_by ON public.polymart_reports(reviewed_by);

-- Keusahawanan (PolyMart Businesses)
CREATE INDEX IF NOT EXISTS idx_business_transactions_served_by ON public.business_transactions(served_by);
CREATE INDEX IF NOT EXISTS idx_business_pos_logs_actor ON public.business_pos_logs(actor_id);

-- Supsas Module
CREATE INDEX IF NOT EXISTS idx_supsas_fixtures_next_match ON public.supsas_fixtures(next_match_id);

-- Others
CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON public.task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_id ON public.task_submissions(user_id);


-- 2. Optimize RLS Policies by wrapping auth.uid() in (select auth.uid())
-- This forces Postgres to evaluate the ID once per query instead of per row, significantly reducing CPU & Disk IO.

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (user_id = (select auth.uid()));

-- Student Club Memberships
DROP POLICY IF EXISTS "Student can read own memberships" ON public.student_club_memberships;
CREATE POLICY "Student can read own memberships" ON public.student_club_memberships
FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Students can read own memberships" ON public.student_club_memberships;
CREATE POLICY "Students can read own memberships" ON public.student_club_memberships
FOR SELECT USING (user_id::text = (select auth.uid())::text);

DROP POLICY IF EXISTS "Student can request membership" ON public.student_club_memberships;
CREATE POLICY "Student can request membership" ON public.student_club_memberships
FOR INSERT WITH CHECK (user_id = (select auth.uid()) AND account_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text]));

DROP POLICY IF EXISTS "Students can apply to clubs" ON public.student_club_memberships;
CREATE POLICY "Students can apply to clubs" ON public.student_club_memberships
FOR INSERT WITH CHECK (user_id = (select auth.uid()) AND account_status = 'PENDING'::text);

-- Profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (id = (select auth.uid()));

-- Kebajikan Tickets
DROP POLICY IF EXISTS "kb_ticket_select_own" ON public.kebajikan_tickets;
CREATE POLICY "kb_ticket_select_own" ON public.kebajikan_tickets
FOR SELECT USING (submitter_id = (select auth.uid()));

DROP POLICY IF EXISTS "kb_ticket_update_own" ON public.kebajikan_tickets;
CREATE POLICY "kb_ticket_update_own" ON public.kebajikan_tickets
FOR UPDATE USING (submitter_id = (select auth.uid()));

-- Programs
DROP POLICY IF EXISTS "Users can view their own programs" ON public.programs;
CREATE POLICY "Users can view their own programs" ON public.programs
FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own programs" ON public.programs;
CREATE POLICY "Users can insert their own programs" ON public.programs
FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own programs" ON public.programs;
CREATE POLICY "Users can update their own programs" ON public.programs
FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own programs" ON public.programs;
CREATE POLICY "Users can delete their own programs" ON public.programs
FOR DELETE USING (user_id = (select auth.uid()));
