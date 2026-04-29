-- =====================================================================
-- MIGRATION 40: Sistem Program Bersepadu JPP-POLISAS
-- Fasa 1: QR Attendance + Jadual Peserta + Merit Kelab Auto-Credit
-- =====================================================================

-- ─── BAHAGIAN 1: Kolum QR & Merit untuk programs (Takwim Rasmi) ──────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programs' AND column_name='qr_token') THEN
    ALTER TABLE programs
      ADD COLUMN qr_token         UUID DEFAULT gen_random_uuid(),
      ADD COLUMN qr_enabled       BOOLEAN DEFAULT false,
      ADD COLUMN qr_open_at       TIMESTAMPTZ,
      ADD COLUMN qr_close_at      TIMESTAMPTZ,
      ADD COLUMN pre_reg_enabled  BOOLEAN DEFAULT false,
      ADD COLUMN merit_kelab      INT DEFAULT 0,
      ADD COLUMN merit_eakademik  INT DEFAULT 0;

    -- Pastikan token unik
    ALTER TABLE programs ADD CONSTRAINT programs_qr_token_unique UNIQUE (qr_token);

    RAISE NOTICE 'Kolum QR & Merit ditambah ke jadual programs.';
  ELSE
    RAISE NOTICE 'Kolum QR sudah ada dalam programs, skip.';
  END IF;
END $$;

-- ─── BAHAGIAN 2: Kolum QR & Merit untuk club_activities (Aktiviti Kelab) ─────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='club_activities' AND column_name='qr_token') THEN
    ALTER TABLE club_activities
      ADD COLUMN qr_token         UUID DEFAULT gen_random_uuid(),
      ADD COLUMN qr_enabled       BOOLEAN DEFAULT false,
      ADD COLUMN qr_open_at       TIMESTAMPTZ,
      ADD COLUMN qr_close_at      TIMESTAMPTZ,
      ADD COLUMN pre_reg_enabled  BOOLEAN DEFAULT false,
      ADD COLUMN merit_kelab      INT DEFAULT 0;
    -- Nota: club_activities TIDAK ada merit_eakademik
    -- Merit Rasmi untuk aktiviti kelab melalui merit_program_applications

    ALTER TABLE club_activities ADD CONSTRAINT club_activities_qr_token_unique UNIQUE (qr_token);

    RAISE NOTICE 'Kolum QR & Merit ditambah ke jadual club_activities.';
  ELSE
    RAISE NOTICE 'Kolum QR sudah ada dalam club_activities, skip.';
  END IF;
END $$;

-- ─── BAHAGIAN 3: Jadual program_attendees ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS program_attendees (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id       UUID        NOT NULL,
  program_type     TEXT        NOT NULL CHECK (program_type IN ('takwim', 'aktiviti')),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status           TEXT        NOT NULL DEFAULT 'pre_registered'
                               CHECK (status IN ('pre_registered','attended','absent','walk_in')),
  registered_at    TIMESTAMPTZ DEFAULT NOW(),
  checked_in_at    TIMESTAMPTZ,
  check_in_method  TEXT        CHECK (check_in_method IN ('qr','manual')),
  merit_kelab_credited  BOOLEAN DEFAULT false,
  merit_rasmi_credited  BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW(),

  -- Cegah scan berganda: 1 user hanya boleh hadir 1 kali per program
  CONSTRAINT unique_program_attendee UNIQUE (program_id, program_type, user_id)
);

-- Indexes untuk prestasi query
CREATE INDEX IF NOT EXISTS idx_pa_program      ON program_attendees(program_id, program_type);
CREATE INDEX IF NOT EXISTS idx_pa_user         ON program_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_pa_status       ON program_attendees(status);
CREATE INDEX IF NOT EXISTS idx_pa_checked_in   ON program_attendees(checked_in_at) WHERE checked_in_at IS NOT NULL;

-- ─── BAHAGIAN 4: RLS untuk program_attendees ─────────────────────────────────

ALTER TABLE program_attendees ENABLE ROW LEVEL SECURITY;

-- Semua pengguna log masuk boleh baca (untuk statistik program)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='program_attendees' AND policyname='Read all attendees') THEN
    CREATE POLICY "Read all attendees" ON program_attendees
      FOR SELECT USING ((select auth.uid()) IS NOT NULL);
  END IF;
END $$;

-- Pengguna boleh daftarkan diri sendiri (pre-register atau walk-in)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='program_attendees' AND policyname='Self register attendee') THEN
    CREATE POLICY "Self register attendee" ON program_attendees
      FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Penganjur / Admin boleh kemaskini status (mark manual, mark absent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='program_attendees' AND policyname='Manager update attendees') THEN
    CREATE POLICY "Manager update attendees" ON program_attendees
      FOR UPDATE USING (
        (select auth.uid()) IN (
          SELECT id FROM profiles
          WHERE role IN ('CLUB_PRESIDENT','CLUB_MT','SUPER_ADMIN_JPP','JPP')
        )
      );
  END IF;
END $$;

-- ─── BAHAGIAN 5: Jadual merit_program_applications ───────────────────────────

CREATE TABLE IF NOT EXISTS merit_program_applications (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id       UUID        NOT NULL,
  program_type     TEXT        NOT NULL CHECK (program_type IN ('takwim', 'aktiviti')),
  program_title    TEXT,       -- cache nama program
  applied_by       UUID        REFERENCES profiles(id),
  merit_value      INT         NOT NULL CHECK (merit_value > 0),
  justification    TEXT,

  -- Status flow: pending → akademik_vouched/not_vouched → fully_approved/rejected
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN (
                                 'pending',
                                 'akademik_vouched',
                                 'akademik_not_vouched',
                                 'fully_approved',
                                 'rejected'
                               )),

  -- Akademik review (Voucher/Supporter)
  akademik_reviewer_id    UUID        REFERENCES profiles(id),
  akademik_reviewed_at    TIMESTAMPTZ,
  akademik_vouch_notes    TEXT,

  -- Kediaman review (Kuasa Mutlak)
  kediaman_reviewer_id    UUID        REFERENCES profiles(id),
  kediaman_reviewed_at    TIMESTAMPTZ,
  kediaman_notes          TEXT,
  reject_reason           TEXT,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mpa_program ON merit_program_applications(program_id, program_type);
CREATE INDEX IF NOT EXISTS idx_mpa_status  ON merit_program_applications(status);
CREATE INDEX IF NOT EXISTS idx_mpa_applied ON merit_program_applications(applied_by);

-- ─── BAHAGIAN 6: Jadual merit_review_log (Audit Log) ────────────────────────

CREATE TABLE IF NOT EXISTS merit_review_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   UUID        NOT NULL REFERENCES merit_program_applications(id) ON DELETE CASCADE,
  reviewer_id      UUID        REFERENCES profiles(id),
  reviewer_unit    TEXT        NOT NULL CHECK (reviewer_unit IN ('AKADEMIK','KEDIAMAN')),
  action           TEXT        NOT NULL CHECK (action IN ('vouched','not_vouched','approved','rejected')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mrl_application ON merit_review_log(application_id);
CREATE INDEX IF NOT EXISTS idx_mrl_reviewer    ON merit_review_log(reviewer_id);

-- ─── BAHAGIAN 7: RLS untuk merit_program_applications + merit_review_log ─────

ALTER TABLE merit_program_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE merit_review_log ENABLE ROW LEVEL SECURITY;

-- Semua pengguna log masuk boleh baca permohonan
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='merit_program_applications' AND policyname='Read merit applications') THEN
    CREATE POLICY "Read merit applications" ON merit_program_applications
      FOR SELECT USING ((select auth.uid()) IS NOT NULL);
  END IF;
END $$;

-- Pemimpin kelab boleh hantar permohonan
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='merit_program_applications' AND policyname='Club leaders apply merit') THEN
    CREATE POLICY "Club leaders apply merit" ON merit_program_applications
      FOR INSERT WITH CHECK (
        (select auth.uid()) IN (
          SELECT id FROM profiles
          WHERE role IN ('CLUB_PRESIDENT','CLUB_MT','SUPER_ADMIN_JPP','JPP')
        )
      );
  END IF;
END $$;

-- Exco JPP boleh update (approve/reject/vouch)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='merit_program_applications' AND policyname='JPP update merit applications') THEN
    CREATE POLICY "JPP update merit applications" ON merit_program_applications
      FOR UPDATE USING (
        (select auth.uid()) IN (
          SELECT id FROM profiles WHERE role IN ('JPP','SUPER_ADMIN_JPP')
        )
      );
  END IF;
END $$;

-- Semua pengguna log masuk boleh baca audit log
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='merit_review_log' AND policyname='Read review log') THEN
    CREATE POLICY "Read review log" ON merit_review_log
      FOR SELECT USING ((select auth.uid()) IS NOT NULL);
  END IF;
END $$;

-- Exco JPP boleh insert log
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='merit_review_log' AND policyname='JPP insert review log') THEN
    CREATE POLICY "JPP insert review log" ON merit_review_log
      FOR INSERT WITH CHECK (
        (select auth.uid()) IN (
          SELECT id FROM profiles WHERE role IN ('JPP','SUPER_ADMIN_JPP')
        )
      );
  END IF;
END $$;

-- ─── BAHAGIAN 8: Postgres Trigger — Auto-Credit Merit Kelab ─────────────────
-- Dicetuskan bila status bertukar kepada 'attended' atau 'walk_in'
-- Trigger ini handle merit kelab automatik supaya frontend tak perlu buat

CREATE OR REPLACE FUNCTION fn_auto_credit_kelab_merit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merit  INT;
  v_title  TEXT;
  v_src    TEXT := 'PROGRAM';
BEGIN
  -- Hanya proses bila status bertukar ke attended atau walk_in
  IF NEW.status NOT IN ('attended','walk_in') THEN RETURN NEW; END IF;
  -- Jangan proses kalau status tak berubah
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;
  -- Jangan proses jika merit sudah dikreditkan
  IF NEW.merit_kelab_credited = true THEN RETURN NEW; END IF;

  -- Dapatkan merit_kelab dan title dari program berkenaan
  IF NEW.program_type = 'takwim' THEN
    SELECT COALESCE(merit_kelab, 0), COALESCE(nama_program, 'Program JPP')
    INTO v_merit, v_title
    FROM programs WHERE id = NEW.program_id;
  ELSE
    SELECT COALESCE(merit_kelab, 0), COALESCE(title, 'Aktiviti Kelab')
    INTO v_merit, v_title
    FROM club_activities WHERE id = NEW.program_id;
  END IF;

  -- Skip jika tiada merit ditetapkan
  IF v_merit IS NULL OR v_merit <= 0 THEN RETURN NEW; END IF;

  -- Insert merit transaction
  INSERT INTO merit_transactions (user_id, points, reason, source, reference_id, actor_name)
  VALUES (
    NEW.user_id,
    v_merit,
    'Program Kelab: ' || v_title,
    v_src,
    NEW.program_id::text,
    'Sistem Program'
  );

  -- Atomik increment merit dalam profiles
  PERFORM increment_merit_by_source(NEW.user_id, v_merit, v_src);

  -- Mark sebagai dikreditkan
  NEW.merit_kelab_credited := true;
  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error tapi jangan fail check-in
    RAISE WARNING 'fn_auto_credit_kelab_merit error untuk user %: %', NEW.user_id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Pasang trigger
DROP TRIGGER IF EXISTS trg_auto_credit_kelab_merit ON program_attendees;
CREATE TRIGGER trg_auto_credit_kelab_merit
  BEFORE INSERT OR UPDATE OF status
  ON program_attendees
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_credit_kelab_merit();

-- ─── SAHKAN ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  RAISE NOTICE '✅ Migration 40 selesai: Sistem Program Bersepadu JPP-POLISAS';
  RAISE NOTICE '   → programs: qr_token, qr_enabled, qr_open_at, qr_close_at, pre_reg_enabled, merit_kelab, merit_eakademik';
  RAISE NOTICE '   → club_activities: qr_token, qr_enabled, qr_open_at, qr_close_at, pre_reg_enabled, merit_kelab';
  RAISE NOTICE '   → program_attendees (baru): tracking kehadiran + UNIQUE constraint';
  RAISE NOTICE '   → merit_program_applications (baru): dual-review workflow';
  RAISE NOTICE '   → merit_review_log (baru): audit log setiap action';
  RAISE NOTICE '   → Trigger trg_auto_credit_kelab_merit: auto-credit merit kelab';
END $$;
