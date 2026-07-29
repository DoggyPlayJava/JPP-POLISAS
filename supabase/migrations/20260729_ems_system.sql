-- ============================================================
-- EMS (Event Management System) Database Schema & RLS Policies
-- ============================================================

-- 1. Create Tables

CREATE TABLE IF NOT EXISTS public.ems_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  event_type TEXT DEFAULT 'COMPETITION',
  event_mode TEXT DEFAULT 'INDIVIDUAL',
  event_date TIMESTAMPTZ,
  location TEXT,
  status TEXT DEFAULT 'PENDING_APPROVAL',
  max_participants INT DEFAULT NULL,
  milestone_config JSONB DEFAULT NULL,
  is_leaderboard_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ems_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.ems_events(id) ON DELETE CASCADE,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  options JSONB,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.ems_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.ems_events(id) ON DELETE CASCADE,
  participant_type TEXT DEFAULT 'STUDENT',
  entity_mode TEXT DEFAULT 'INDIVIDUAL',
  team_name TEXT,
  booth_no TEXT,
  category_name TEXT,
  leader_name TEXT NOT NULL,
  matrix_no TEXT,
  email TEXT,
  phone TEXT,
  members_list JSONB,
  custom_responses JSONB,
  media_urls TEXT[],
  is_checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ems_jury_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.ems_events(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  jury_name TEXT,
  organization TEXT,
  assigned_categories TEXT[],
  assigned_booths TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ems_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.ems_events(id) ON DELETE CASCADE,
  criteria_name TEXT NOT NULL,
  max_score INT DEFAULT 10,
  weight NUMERIC DEFAULT 1.0,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.ems_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.ems_events(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.ems_participants(id) ON DELETE CASCADE,
  jury_code_id UUID REFERENCES public.ems_jury_codes(id) ON DELETE CASCADE,
  rubric_id UUID REFERENCES public.ems_rubrics(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ems_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.ems_events(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.ems_participants(id) ON DELETE CASCADE,
  jury_code_id UUID REFERENCES public.ems_jury_codes(id),
  cert_type TEXT NOT NULL,
  cert_serial TEXT NOT NULL UNIQUE,
  qr_code_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ems_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.ems_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  matrix_no TEXT,
  email TEXT,
  phone TEXT,
  is_milestone_winner BOOLEAN DEFAULT false,
  milestone_number INT,
  scanned_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Foreign Key Indexes

-- Ensure new columns exist on existing ems_events table (safe re-run)
ALTER TABLE public.ems_events ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'COMPETITION';
ALTER TABLE public.ems_events ADD COLUMN IF NOT EXISTS max_participants INT DEFAULT NULL;
ALTER TABLE public.ems_events ADD COLUMN IF NOT EXISTS milestone_config JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_ems_events_created_by ON public.ems_events(created_by);

CREATE INDEX IF NOT EXISTS idx_ems_form_fields_event_id ON public.ems_form_fields(event_id);

CREATE INDEX IF NOT EXISTS idx_ems_participants_event_id ON public.ems_participants(event_id);

CREATE INDEX IF NOT EXISTS idx_ems_jury_codes_event_id ON public.ems_jury_codes(event_id);

CREATE INDEX IF NOT EXISTS idx_ems_rubrics_event_id ON public.ems_rubrics(event_id);

CREATE INDEX IF NOT EXISTS idx_ems_scores_event_id ON public.ems_scores(event_id);
CREATE INDEX IF NOT EXISTS idx_ems_scores_participant_id ON public.ems_scores(participant_id);
CREATE INDEX IF NOT EXISTS idx_ems_scores_jury_code_id ON public.ems_scores(jury_code_id);
CREATE INDEX IF NOT EXISTS idx_ems_scores_rubric_id ON public.ems_scores(rubric_id);

CREATE INDEX IF NOT EXISTS idx_ems_certificates_event_id ON public.ems_certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_ems_certificates_participant_id ON public.ems_certificates(participant_id);
CREATE INDEX IF NOT EXISTS idx_ems_certificates_jury_code_id ON public.ems_certificates(jury_code_id);

CREATE INDEX IF NOT EXISTS idx_ems_visitors_event_id ON public.ems_visitors(event_id);
CREATE INDEX IF NOT EXISTS idx_ems_visitors_user_id ON public.ems_visitors(user_id);

-- 3. Enable Row Level Security (RLS)

ALTER TABLE public.ems_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ems_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ems_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ems_jury_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ems_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ems_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ems_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ems_visitors ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- ems_events policies
CREATE POLICY "Public and users can view events"
  ON public.ems_events FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert events"
  ON public.ems_events FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update events"
  ON public.ems_events FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete events"
  ON public.ems_events FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ems_form_fields policies
CREATE POLICY "Public and users can view form fields"
  ON public.ems_form_fields FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert form fields"
  ON public.ems_form_fields FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update form fields"
  ON public.ems_form_fields FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete form fields"
  ON public.ems_form_fields FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ems_participants policies
CREATE POLICY "Public and users can view participants"
  ON public.ems_participants FOR SELECT
  USING (true);

CREATE POLICY "Public and users can register participants"
  ON public.ems_participants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users or admins can update participants"
  ON public.ems_participants FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete participants"
  ON public.ems_participants FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ems_jury_codes policies
CREATE POLICY "Public and users can view jury codes"
  ON public.ems_jury_codes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert jury codes"
  ON public.ems_jury_codes FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update jury codes"
  ON public.ems_jury_codes FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete jury codes"
  ON public.ems_jury_codes FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ems_rubrics policies
CREATE POLICY "Public and users can view rubrics"
  ON public.ems_rubrics FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert rubrics"
  ON public.ems_rubrics FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update rubrics"
  ON public.ems_rubrics FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete rubrics"
  ON public.ems_rubrics FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ems_scores policies
CREATE POLICY "Public and juries can view scores"
  ON public.ems_scores FOR SELECT
  USING (true);

CREATE POLICY "Juries and users can insert scores"
  ON public.ems_scores FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Juries and users can update scores"
  ON public.ems_scores FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete scores"
  ON public.ems_scores FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ems_certificates policies
CREATE POLICY "Public can view certificates"
  ON public.ems_certificates FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert certificates"
  ON public.ems_certificates FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update certificates"
  ON public.ems_certificates FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete certificates"
  ON public.ems_certificates FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);
-- ems_visitors policies
CREATE POLICY "Public and users can view visitors"
  ON public.ems_visitors FOR SELECT
  USING (true);

CREATE POLICY "Public and users can insert visitors"
  ON public.ems_visitors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update visitors"
  ON public.ems_visitors FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete visitors"
  ON public.ems_visitors FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- GRANT table-level permissions (anon for public registration)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

