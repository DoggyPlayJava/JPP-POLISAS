ALTER TABLE keusahawanan_businesses 
  ADD COLUMN IF NOT EXISTS is_shift_enabled BOOLEAN DEFAULT false;

DROP TABLE IF EXISTS gerai_shift_swaps CASCADE;
DROP TABLE IF EXISTS gerai_shifts CASCADE;
DROP TABLE IF EXISTS gerai_sessions CASCADE;

CREATE TABLE business_shifts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id  uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  shift_date   date NOT NULL,
  shift_hour   int  NOT NULL CHECK (shift_hour BETWEEN 8 AND 16),
  assigned_to  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES profiles(id),
  notes        text,
  status       text DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','PRESENT','ABSENT','SWAPPED')),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(business_id, shift_date, shift_hour)
);

CREATE TABLE business_shift_swaps (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  shift_id      uuid REFERENCES business_shifts(id) ON DELETE CASCADE,
  requested_by  uuid REFERENCES profiles(id),
  swap_with     uuid REFERENCES profiles(id),
  reason        text NOT NULL,
  status        text DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  responded_by  uuid REFERENCES profiles(id),
  responded_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE business_sessions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  session_date    date NOT NULL,
  opened_by       uuid REFERENCES profiles(id),
  closed_by       uuid REFERENCES profiles(id),
  opening_cash    numeric(10,2) NOT NULL DEFAULT 0,
  closing_cash    numeric(10,2),
  total_sales     numeric(10,2),
  total_expenses  numeric(10,2) DEFAULT 0,
  net_profit      numeric(10,2) GENERATED ALWAYS AS (
                    closing_cash - opening_cash - total_expenses
                  ) STORED,
  opening_time    timestamptz,
  closing_time    timestamptz,
  opening_notes   text,
  closing_notes   text,
  status          text DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(business_id, session_date)
);

CREATE OR REPLACE FUNCTION has_business_shift_access(b_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_business_memberships
    WHERE business_id = b_id 
      AND user_id = auth.uid()
      AND status = 'ACTIVE'
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'ADMIN')
  )
$$;

ALTER TABLE business_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_shift_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_shifts_access" ON business_shifts FOR ALL USING (has_business_shift_access(business_id));
CREATE POLICY "business_shift_swaps_access" ON business_shift_swaps FOR ALL USING (has_business_shift_access(business_id));
CREATE POLICY "business_sessions_access" ON business_sessions FOR ALL USING (has_business_shift_access(business_id));
