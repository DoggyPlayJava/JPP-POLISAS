-- ============================================================================
-- Migration: 20260916_makmp_system.sql
-- Description: Sistem Majlis Anugerah Kecemerlangan POLISAS (MAKMP)
--              - Edisi tahunan & Kategori anugerah dinamik
--              - Borang penyerahan awam & Batch items sijil
--              - Portal PIN Juri tanpa login
--              - Integrasi auto-sync ke e-akademik & merit_transactions
-- ============================================================================

-- 1. Table: makmp_editions
CREATE TABLE IF NOT EXISTS public.makmp_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  title text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  submission_deadline timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 2. Table: makmp_categories
CREATE TABLE IF NOT EXISTS public.makmp_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.makmp_editions(id) ON DELETE CASCADE,
  name text NOT NULL,
  department_scope text DEFAULT 'UMUM',
  max_certificates integer DEFAULT 5,
  max_merit numeric DEFAULT 20,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3. Table: makmp_jury_pins (Created before submissions for foreign key reference)
CREATE TABLE IF NOT EXISTS public.makmp_jury_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.makmp_editions(id) ON DELETE CASCADE,
  pin_code text NOT NULL,
  jury_name text NOT NULL,
  organization text,
  assigned_categories text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 4. Table: makmp_submissions
CREATE TABLE IF NOT EXISTS public.makmp_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code text UNIQUE NOT NULL,
  edition_id uuid NOT NULL REFERENCES public.makmp_editions(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.makmp_categories(id) ON DELETE RESTRICT,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  has_portal_account boolean DEFAULT false,
  full_name text NOT NULL,
  matric_no text NOT NULL,
  email text,
  phone text NOT NULL,
  department text NOT NULL,
  programme_code text,
  semester numeric,
  status text NOT NULL DEFAULT 'MENUNGGU' CHECK (status IN ('MENUNGGU', 'DALAM_SEMAKAN', 'DISAHKAN', 'DITOLAK')),
  total_merit_awarded numeric DEFAULT 0,
  reviewer_pin_id uuid REFERENCES public.makmp_jury_pins(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Table: makmp_submission_items (Batch Sijil)
CREATE TABLE IF NOT EXISTS public.makmp_submission_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.makmp_submissions(id) ON DELETE CASCADE,
  nama_pencapaian text NOT NULL,
  peringkat text NOT NULL CHECK (peringkat IN ('ANTARABANGSA', 'KEBANGSAAN', 'NEGERI', 'DAERAH', 'POLITEKNIK')),
  pencapaian_type text NOT NULL DEFAULT 'PESERTA' CHECK (pencapaian_type IN ('JOHAN', 'NAIB_JOHAN', 'KETIGA', 'EMAS', 'PERAK', 'GANGSA', 'PESERTA', 'LAIN')),
  penganjur text,
  tarikh date,
  drive_view_url text NOT NULL,
  drive_download_url text,
  drive_file_id uuid,
  merit_suggested numeric DEFAULT 0,
  merit_awarded numeric DEFAULT 0,
  is_verified boolean DEFAULT false,
  akademik_pencapaian_id uuid REFERENCES public.akademik_pencapaian(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- Foreign Key & Filter Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_makmp_editions_year ON public.makmp_editions(year);
CREATE INDEX IF NOT EXISTS idx_makmp_categories_edition ON public.makmp_categories(edition_id);
CREATE INDEX IF NOT EXISTS idx_makmp_categories_dept ON public.makmp_categories(department_scope);
CREATE INDEX IF NOT EXISTS idx_makmp_jury_pins_edition ON public.makmp_jury_pins(edition_id);
CREATE INDEX IF NOT EXISTS idx_makmp_jury_pins_code ON public.makmp_jury_pins(pin_code);
CREATE INDEX IF NOT EXISTS idx_makmp_submissions_edition ON public.makmp_submissions(edition_id);
CREATE INDEX IF NOT EXISTS idx_makmp_submissions_category ON public.makmp_submissions(category_id);
CREATE INDEX IF NOT EXISTS idx_makmp_submissions_user ON public.makmp_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_makmp_submissions_matric ON public.makmp_submissions(matric_no);
CREATE INDEX IF NOT EXISTS idx_makmp_submissions_tracking ON public.makmp_submissions(tracking_code);
CREATE INDEX IF NOT EXISTS idx_makmp_submissions_status ON public.makmp_submissions(status);
CREATE INDEX IF NOT EXISTS idx_makmp_sub_items_sub_id ON public.makmp_submission_items(submission_id);

-- ============================================================================
-- Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.makmp_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.makmp_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.makmp_jury_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.makmp_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.makmp_submission_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS Policies: makmp_editions
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "makmp_editions_select" ON public.makmp_editions;
CREATE POLICY "makmp_editions_select" ON public.makmp_editions
  FOR SELECT USING (
    is_active = true 
    OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP', 'STAFF')
  );

DROP POLICY IF EXISTS "makmp_editions_admin" ON public.makmp_editions;
CREATE POLICY "makmp_editions_admin" ON public.makmp_editions
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')
  );

-- ----------------------------------------------------------------------------
-- RLS Policies: makmp_categories
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "makmp_categories_select" ON public.makmp_categories;
CREATE POLICY "makmp_categories_select" ON public.makmp_categories
  FOR SELECT USING (
    is_active = true 
    OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP', 'STAFF')
  );

DROP POLICY IF EXISTS "makmp_categories_admin" ON public.makmp_categories;
CREATE POLICY "makmp_categories_admin" ON public.makmp_categories
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')
  );

-- ----------------------------------------------------------------------------
-- RLS Policies: makmp_jury_pins
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "makmp_jury_pins_select" ON public.makmp_jury_pins;
CREATE POLICY "makmp_jury_pins_select" ON public.makmp_jury_pins
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "makmp_jury_pins_admin" ON public.makmp_jury_pins;
CREATE POLICY "makmp_jury_pins_admin" ON public.makmp_jury_pins
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')
  );

-- ----------------------------------------------------------------------------
-- RLS Policies: makmp_submissions
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "makmp_submissions_insert" ON public.makmp_submissions;
CREATE POLICY "makmp_submissions_insert" ON public.makmp_submissions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "makmp_submissions_select" ON public.makmp_submissions;
CREATE POLICY "makmp_submissions_select" ON public.makmp_submissions
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP', 'STAFF')
    OR true -- Membenarkan tracking awam menggunakan tracking_code
  );

DROP POLICY IF EXISTS "makmp_submissions_update" ON public.makmp_submissions;
CREATE POLICY "makmp_submissions_update" ON public.makmp_submissions
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP', 'STAFF')
    OR true -- Membenarkan semakan juri melalui verifikasi PIN di level API
  );

-- ----------------------------------------------------------------------------
-- RLS Policies: makmp_submission_items
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "makmp_submission_items_insert" ON public.makmp_submission_items;
CREATE POLICY "makmp_submission_items_insert" ON public.makmp_submission_items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "makmp_submission_items_select" ON public.makmp_submission_items;
CREATE POLICY "makmp_submission_items_select" ON public.makmp_submission_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "makmp_submission_items_update" ON public.makmp_submission_items;
CREATE POLICY "makmp_submission_items_update" ON public.makmp_submission_items
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP', 'STAFF')
    OR true
  );

-- ============================================================================
-- Sync Function: sync_makmp_submission_to_akademik
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_makmp_submission_to_akademik(
  p_submission_id uuid,
  p_reviewer_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub record;
  v_item record;
  v_pencapaian_id uuid;
  v_total_merit numeric := 0;
  v_items_synced integer := 0;
BEGIN
  -- 1. Dapatkan maklumat submission
  SELECT * INTO v_sub FROM public.makmp_submissions WHERE id = p_submission_id;
  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak dijumpai.');
  END IF;

  -- Hanya sync jika status DISAHKAN dan pelajar mempunyai akaun profil
  IF v_sub.status != 'DISAHKAN' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status permohonan bukan DISAHKAN.');
  END IF;

  IF v_sub.user_id IS NULL THEN
    -- Cuba cari profil pelajar berdasarkan matric_no jika user_id belum diisi
    SELECT id INTO v_sub.user_id FROM public.profiles 
    WHERE UPPER(matric_no) = UPPER(v_sub.matric_no) 
    LIMIT 1;

    IF v_sub.user_id IS NOT NULL THEN
      UPDATE public.makmp_submissions 
      SET user_id = v_sub.user_id, has_portal_account = true 
      WHERE id = p_submission_id;
    END IF;
  END IF;

  -- 2. Proses setiap sijil (item) yang diluluskan
  FOR v_item IN 
    SELECT * FROM public.makmp_submission_items 
    WHERE submission_id = p_submission_id
  LOOP
    v_total_merit := v_total_merit + COALESCE(v_item.merit_awarded, 0);

    -- Jika pelajar ada akaun, masukkan ke akademik_pencapaian
    IF v_sub.user_id IS NOT NULL AND v_item.akademik_pencapaian_id IS NULL THEN
      INSERT INTO public.akademik_pencapaian (
        user_id,
        nama_pencapaian,
        peringkat,
        jenis,
        penganjur,
        tarikh,
        drive_view_url,
        drive_download_url,
        drive_file_id,
        merit_auto,
        merit_override,
        status,
        verified_by,
        verified_at,
        notes
      ) VALUES (
        v_sub.user_id,
        v_item.nama_pencapaian,
        v_item.peringkat,
        'ANUGERAH',
        COALESCE(v_item.penganjur, 'MAKMP POLISAS'),
        COALESCE(v_item.tarikh, CURRENT_DATE),
        v_item.drive_view_url,
        v_item.drive_download_url,
        v_item.drive_file_id,
        v_item.merit_suggested,
        v_item.merit_awarded,
        'DISAHKAN',
        p_reviewer_user_id,
        now(),
        'Disahkan melalui Portal MAKMP'
      )
      RETURNING id INTO v_pencapaian_id;

      -- Simpan id pencapaian ke item
      UPDATE public.makmp_submission_items 
      SET akademik_pencapaian_id = v_pencapaian_id, is_verified = true 
      WHERE id = v_item.id;

      -- Masukkan transaksi merit
      IF COALESCE(v_item.merit_awarded, 0) > 0 THEN
        INSERT INTO public.merit_transactions (
          user_id,
          points,
          reason,
          actor_name,
          source,
          reference_id
        ) VALUES (
          v_sub.user_id,
          v_item.merit_awarded,
          'Anugerah MAKMP: ' || v_item.nama_pencapaian,
          'Pegawai MAKMP',
          'AKADEMIK',
          v_pencapaian_id
        );

        -- Tambah merit akademik pelajar
        PERFORM public.increment_merit_by_source(v_sub.user_id, v_item.merit_awarded, 'AKADEMIK');
      END IF;

      -- Susun fail ke folder peribadi pelajar dalam e-akademik
      BEGIN
        PERFORM public.auto_sort_pencapaian_file(v_pencapaian_id);
      EXCEPTION WHEN OTHERS THEN
        -- Non-blocking
      END;

      v_items_synced := v_items_synced + 1;
    END IF;
  END LOOP;

  -- Kemaskini jumlah merit pada rekod submission
  UPDATE public.makmp_submissions 
  SET total_merit_awarded = v_total_merit 
  WHERE id = p_submission_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_merit', v_total_merit,
    'items_synced', v_items_synced,
    'user_linked', (v_sub.user_id IS NOT NULL)
  );
END;
$$;

-- ============================================================================
-- Function: Auto link submission bila pelajar baru mendaftar
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_unregistered_makmp_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub record;
BEGIN
  IF NEW.matric_no IS NOT NULL THEN
    FOR v_sub IN 
      SELECT id, status FROM public.makmp_submissions 
      WHERE UPPER(matric_no) = UPPER(NEW.matric_no) AND user_id IS NULL
    LOOP
      UPDATE public.makmp_submissions 
      SET user_id = NEW.id, has_portal_account = true 
      WHERE id = v_sub.id;

      -- Jika submission itu sudah disahkan sebelum pelajar register, terus sync merit & fail
      IF v_sub.status = 'DISAHKAN' THEN
        PERFORM public.sync_makmp_submission_to_akademik(v_sub.id);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_makmp_on_profile_create ON public.profiles;
CREATE TRIGGER trg_sync_makmp_on_profile_create
  AFTER INSERT OR UPDATE OF matric_no ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_unregistered_makmp_to_profile();

-- ============================================================================
-- Masukkan data awal Edisi MAKMP 2026 & Kategori Lalai
-- ============================================================================
INSERT INTO public.makmp_editions (year, title, description, is_active, submission_deadline)
VALUES (
  2026,
  'Majlis Anugerah Kecemerlangan POLISAS 2026',
  'Pencalonan Anugerah Kecemerlangan Pelajar POLISAS Sesi 2025/2026',
  true,
  now() + interval '60 days'
)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  v_ed_id uuid;
BEGIN
  SELECT id INTO v_ed_id FROM public.makmp_editions WHERE year = 2026 LIMIT 1;
  IF v_ed_id IS NOT NULL THEN
    INSERT INTO public.makmp_categories (edition_id, name, department_scope, max_certificates, max_merit, description, sort_order)
    VALUES
      (v_ed_id, 'Anugerah Kecemerlangan Akademik (Pengarah)', 'AKADEMIK', 5, 25, 'Pencapaian CGPA tinggi, anugerah dekan, dan kejayaan akademik terunggul.', 1),
      (v_ed_id, 'Anugerah Kepimpinan & Sahsiah (HEP)', 'HEP', 5, 20, 'Penglibatan kepimpinan persatuan, majlis perwakilan pelajar, dan sahsiah terpuji.', 2),
      (v_ed_id, 'Anugerah Inovasi & Rekacipta', 'KEUSAHAWANAN', 3, 20, 'Kemenangan pertandingan inovasi, paten, prototaip, dan projek keusahawanan termaju.', 3),
      (v_ed_id, 'Anugerah Pengantarabangsaan', 'HEP', 5, 25, 'Penyertaan dan kemenangan di persada antarabangsa mengharumkan nama POLISAS.', 4),
      (v_ed_id, 'Anugerah Kecemerlangan Sukan & Kebudayaan', 'SUKAN', 5, 20, 'Pencapaian cemerlang dalam sukan SUPSAS, MASISWA, SUKMA, atau seni budaya.', 5)
    ON CONFLICT DO NOTHING;

    -- Sediakan 1 Kod PIN Juri lalai untuk semakan ujian pantas
    INSERT INTO public.makmp_jury_pins (edition_id, pin_code, jury_name, organization, assigned_categories)
    VALUES (v_ed_id, '884920', 'Pegawai Penilai MAKMP (Ujian)', 'Jawatankuasa MAKMP POLISAS', ARRAY['ALL'])
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
