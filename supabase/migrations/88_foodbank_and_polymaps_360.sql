-- Migration: 88_foodbank_and_polymaps_360.sql
-- Description: Food Bank JPP management system, PolyMaps 360 panorama integration, seed data, and atomic pickup RPC
-- Date: 2026-09-28

-- ============================================================================
-- 1. POLYMAPS 360° PANORAMA ENHANCEMENTS
-- ============================================================================

-- Add panorama_360_url column to physical map tables
ALTER TABLE public.imaps_buildings ADD COLUMN IF NOT EXISTS panorama_360_url TEXT;
ALTER TABLE public.imaps_locations ADD COLUMN IF NOT EXISTS panorama_360_url TEXT;

-- Seed / Update 360 Panorama URLs for POLISAS Campus Buildings
UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/PENTADBIRAN/PEJABAT%20PENGARAH,%20TIMBALAN%20PENGARAH%20AKEDEMIK%20JAMBATAN%20MATEMATIK%20DAN%20SAINS%20JMSK.jpg'
WHERE name ILIKE '%Pentadbiran%' OR code ILIKE '%PENTADBIRAN%';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/PJ/jka.jpg'
WHERE name ILIKE '%Kejuruteraan Awam%' OR code = 'PJ';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/JKE_A/a101.png'
WHERE name ILIKE '%Blok A JKE%' OR name ILIKE '%JKE Blok A%' OR code IN ('JKE A', 'JKEA');

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/JKE_B/b101.png'
WHERE name ILIKE '%Blok B JKE%' OR name ILIKE '%JKE Blok B%' OR code IN ('JKE B', 'JKEB');

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/JKE_C/c101.png'
WHERE name ILIKE '%Blok C JKE%' OR name ILIKE '%JKE Blok C%' OR code IN ('JKE C', 'JKEC');

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/JTM/BANGUNAN%20JTM.jpg'
WHERE name ILIKE '%Teknologi Makanan%' OR code = 'JTM';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/PH/BLOK_PH_MAIN.jpg'
WHERE name ILIKE '%Kejuruteraan Mekanikal%' OR code = 'PH';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/hall/Dewan%20Sri%20Mahkota.jpg'
WHERE name ILIKE '%Mahkota Square%' OR name ILIKE '%Dewan Sri Mahkota%' OR code = 'MAHKOTA';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/u6_main_view.jpg'
WHERE name ILIKE '%Blok JP A%' OR name ILIKE '%JP Blok A%' OR code IN ('JP A', 'JPA');

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/JP%20BLOK%20B/BILIK%20AHU%201.jpg'
WHERE name ILIKE '%Blok JP B%' OR name ILIKE '%JP Blok B%' OR code IN ('JP B', 'JPB');

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://pannellum.org/images/alma.jpg'
WHERE name ILIKE '%Blok ME%' OR code = 'ME';

-- Insert building records if they do not exist yet (guarantee seed data in fresh environments)
INSERT INTO public.imaps_buildings (name, code, description, panorama_360_url)
SELECT 'Blok Pentadbiran', 'PENTADBIRAN', 'Blok Pentadbiran Utama POLISAS', 'https://normane176680.github.io/my-map-polisas/image/PENTADBIRAN/PEJABAT%20PENGARAH,%20TIMBALAN%20PENGARAH%20AKEDEMIK%20JAMBATAN%20MATEMATIK%20DAN%20SAINS%20JMSK.jpg'
WHERE NOT EXISTS (SELECT 1 FROM public.imaps_buildings WHERE name ILIKE '%Pentadbiran%' OR code ILIKE '%PENTADBIRAN%');

INSERT INTO public.imaps_buildings (name, code, description, panorama_360_url)
SELECT 'Blok Jabatan Kejuruteraan Awam (PJ)', 'PJ', 'Jabatan Kejuruteraan Awam', 'https://normane176680.github.io/my-map-polisas/image/PJ/jka.jpg'
WHERE NOT EXISTS (SELECT 1 FROM public.imaps_buildings WHERE name ILIKE '%Kejuruteraan Awam%' OR code = 'PJ');

INSERT INTO public.imaps_buildings (name, code, description, panorama_360_url)
SELECT 'Blok A JKE', 'JKEA', 'Blok A Jabatan Kejuruteraan Elektrik', 'https://normane176680.github.io/my-map-polisas/image/JKE_A/a101.png'
WHERE NOT EXISTS (SELECT 1 FROM public.imaps_buildings WHERE name ILIKE '%Blok A JKE%' OR name ILIKE '%JKE Blok A%' OR code IN ('JKE A', 'JKEA'));

INSERT INTO public.imaps_buildings (name, code, description, panorama_360_url)
SELECT 'Blok B JKE', 'JKEB', 'Blok B Jabatan Kejuruteraan Elektrik', 'https://normane176680.github.io/my-map-polisas/image/JKE_B/b101.png'
WHERE NOT EXISTS (SELECT 1 FROM public.imaps_buildings WHERE name ILIKE '%Blok B JKE%' OR name ILIKE '%JKE Blok B%' OR code IN ('JKE B', 'JKEB'));

INSERT INTO public.imaps_buildings (name, code, description, panorama_360_url)
SELECT 'Blok C JKE', 'JKEC', 'Blok C Jabatan Kejuruteraan Elektrik', 'https://normane176680.github.io/my-map-polisas/image/JKE_C/c101.png'
WHERE NOT EXISTS (SELECT 1 FROM public.imaps_buildings WHERE name ILIKE '%Blok C JKE%' OR name ILIKE '%JKE Blok C%' OR code IN ('JKE C', 'JKEC'));

INSERT INTO public.imaps_buildings (name, code, description, panorama_360_url)
SELECT 'Blok Jabatan Teknologi Makanan', 'JTM', 'Jabatan Teknologi Makanan', 'https://normane176680.github.io/my-map-polisas/image/JTM/BANGUNAN%20JTM.jpg'
WHERE NOT EXISTS (SELECT 1 FROM public.imaps_buildings WHERE name ILIKE '%Teknologi Makanan%' OR code = 'JTM');

INSERT INTO public.imaps_buildings (name, code, description, panorama_360_url)
SELECT 'Blok Jabatan Kejuruteraan Mekanikal (PH)', 'PH', 'Jabatan Kejuruteraan Mekanikal', 'https://normane176680.github.io/my-map-polisas/image/PH/BLOK_PH_MAIN.jpg'
WHERE NOT EXISTS (SELECT 1 FROM public.imaps_buildings WHERE name ILIKE '%Kejuruteraan Mekanikal%' OR code = 'PH');

INSERT INTO public.imaps_buildings (name, code, description, panorama_360_url)
SELECT 'Blok Mahkota Square', 'MAHKOTA', 'Dewan Sri Mahkota / Mahkota Square', 'https://normane176680.github.io/my-map-polisas/image/hall/Dewan%20Sri%20Mahkota.jpg'
WHERE NOT EXISTS (SELECT 1 FROM public.imaps_buildings WHERE name ILIKE '%Mahkota Square%' OR name ILIKE '%Dewan Sri Mahkota%' OR code = 'MAHKOTA');

INSERT INTO public.imaps_buildings (name, code, description, panorama_360_url)
SELECT 'Blok JP A', 'JPA', 'Jabatan Perdagangan Blok A', 'https://normane176680.github.io/my-map-polisas/image/u6_main_view.jpg'
WHERE NOT EXISTS (SELECT 1 FROM public.imaps_buildings WHERE name ILIKE '%Blok JP A%' OR name ILIKE '%JP Blok A%' OR code IN ('JP A', 'JPA'));

INSERT INTO public.imaps_buildings (name, code, description, panorama_360_url)
SELECT 'Blok JP B', 'JPB', 'Jabatan Perdagangan Blok B', 'https://normane176680.github.io/my-map-polisas/image/JP%20BLOK%20B/BILIK%20AHU%201.jpg'
WHERE NOT EXISTS (SELECT 1 FROM public.imaps_buildings WHERE name ILIKE '%Blok JP B%' OR name ILIKE '%JP Blok B%' OR code IN ('JP B', 'JPB'));

INSERT INTO public.imaps_buildings (name, code, description, panorama_360_url)
SELECT 'Blok ME', 'ME', 'Blok ME', 'https://pannellum.org/images/alma.jpg'
WHERE NOT EXISTS (SELECT 1 FROM public.imaps_buildings WHERE name ILIKE '%Blok ME%' OR code = 'ME');


-- ============================================================================
-- 2. HELPER FUNCTIONS & RBAC FOR FOOD BANK
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_foodbank_admin(p_uid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  IF p_uid IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_uid 
      AND (
        role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'super_admin', 'SUPER_ADMIN', 'STAFF') 
        OR role = 'JPP'
      )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_foodbank_admin(UUID) TO authenticated, anon;


-- ============================================================================
-- 3. FOOD BANK SCHEMA DEFINITIONS
-- ============================================================================

-- Table 1: foodbank_settings (Global settings & budget)
CREATE TABLE IF NOT EXISTS public.foodbank_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_application_open BOOLEAN NOT NULL DEFAULT true,
    total_budget NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    current_spent NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    max_monthly_applications_per_student INTEGER NOT NULL DEFAULT 1,
    max_items_per_application INTEGER NOT NULL DEFAULT 5,
    application_instructions TEXT DEFAULT 'Sila pastikan maklumat pemohon tepat dan barangan yang dipilih adalah mengikut keperluan asas sebenar.',
    eligibility_criteria TEXT DEFAULT 'Terbuka kepada semua mahasiswa POLISAS yang memerlukan bantuan makanan/keperluan asas (keutamaan kepada B40/asnaf).',
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 2: foodbank_distribution_locations (Pickup centers linked to PolyMaps buildings)
CREATE TABLE IF NOT EXISTS public.foodbank_distribution_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    polymaps_building_id UUID REFERENCES public.imaps_buildings(id) ON DELETE SET NULL,
    room_detail TEXT,
    operating_hours TEXT DEFAULT 'Isnin - Khamis: 10:00 AM - 4:00 PM',
    is_active BOOLEAN NOT NULL DEFAULT true,
    contact_person TEXT DEFAULT 'Exco Kebajikan JPP',
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 3: foodbank_items (Stock catalog of food and essential goods)
CREATE TABLE IF NOT EXISTS public.foodbank_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'MAKANAN',
    description TEXT,
    image_url TEXT,
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    unit TEXT NOT NULL DEFAULT 'pek',
    estimated_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 4: foodbank_applications (Student aid requests)
CREATE TABLE IF NOT EXISTS public.foodbank_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no TEXT NOT NULL UNIQUE,
    applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'MENUNGGU' CHECK (status IN ('MENUNGGU', 'DALAM_SEMAKAN', 'LULUS', 'DITOLAK', 'SELESAI', 'BATAL')),
    reason TEXT NOT NULL,
    financial_category TEXT DEFAULT 'B40',
    household_income NUMERIC(10, 2),
    housing_type TEXT DEFAULT 'KAMSIS',
    housemates JSONB DEFAULT '[]'::jsonb,
    selected_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    location_id UUID REFERENCES public.foodbank_distribution_locations(id) ON DELETE SET NULL,
    pickup_date DATE,
    pickup_time_slot TEXT,
    pickup_qr_code TEXT UNIQUE,
    pickup_verified_at TIMESTAMP WITH TIME ZONE,
    pickup_verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_estimated_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 5: foodbank_budget_transactions (Ledger of all budget deductions and manual adjustments)
CREATE TABLE IF NOT EXISTS public.foodbank_budget_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.foodbank_applications(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('DISTRIBUTION', 'BUDGET_ADDITION', 'ADJUSTMENT', 'CANCELLATION_REFUND')),
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ============================================================================
-- 4. INDEXES (MANDATORY FOR ALL FOREIGN KEYS & QR LOOKUP)
-- ============================================================================

-- foodbank_settings
CREATE INDEX IF NOT EXISTS idx_foodbank_settings_updated_by ON public.foodbank_settings(updated_by);

-- foodbank_distribution_locations
CREATE INDEX IF NOT EXISTS idx_foodbank_dist_locations_building ON public.foodbank_distribution_locations(polymaps_building_id);

-- foodbank_items
CREATE INDEX IF NOT EXISTS idx_foodbank_items_active ON public.foodbank_items(is_active);
CREATE INDEX IF NOT EXISTS idx_foodbank_items_category ON public.foodbank_items(category);

-- foodbank_applications
CREATE INDEX IF NOT EXISTS idx_foodbank_applications_applicant ON public.foodbank_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_foodbank_applications_location ON public.foodbank_applications(location_id);
CREATE INDEX IF NOT EXISTS idx_foodbank_applications_reviewed_by ON public.foodbank_applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_foodbank_applications_qr ON public.foodbank_applications(pickup_qr_code);
CREATE INDEX IF NOT EXISTS idx_foodbank_applications_verified_by ON public.foodbank_applications(pickup_verified_by);
CREATE INDEX IF NOT EXISTS idx_foodbank_applications_status ON public.foodbank_applications(status);

-- foodbank_budget_transactions
CREATE INDEX IF NOT EXISTS idx_foodbank_budget_tx_app ON public.foodbank_budget_transactions(application_id);
CREATE INDEX IF NOT EXISTS idx_foodbank_budget_tx_created_by ON public.foodbank_budget_transactions(created_by);


-- ============================================================================
-- 5. ATOMIC CONSTRAINTS
-- ============================================================================

-- Only one active application per student at any given time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_app_per_user 
ON public.foodbank_applications (applicant_id) 
WHERE status IN ('MENUNGGU', 'DALAM_SEMAKAN', 'LULUS');


-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Mandatory rule: Use (SELECT auth.uid()) and one policy per operation.
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.foodbank_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foodbank_distribution_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foodbank_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foodbank_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foodbank_budget_transactions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- foodbank_settings Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "foodbank_settings_select_policy"
ON public.foodbank_settings FOR SELECT
USING (true);

CREATE POLICY "foodbank_settings_insert_policy"
ON public.foodbank_settings FOR INSERT
WITH CHECK (public.is_foodbank_admin((SELECT auth.uid())));

CREATE POLICY "foodbank_settings_update_policy"
ON public.foodbank_settings FOR UPDATE
USING (public.is_foodbank_admin((SELECT auth.uid())))
WITH CHECK (public.is_foodbank_admin((SELECT auth.uid())));

CREATE POLICY "foodbank_settings_delete_policy"
ON public.foodbank_settings FOR DELETE
USING (public.is_foodbank_admin((SELECT auth.uid())));

-- ----------------------------------------------------------------------------
-- foodbank_distribution_locations Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "foodbank_locations_select_policy"
ON public.foodbank_distribution_locations FOR SELECT
USING (true);

CREATE POLICY "foodbank_locations_insert_policy"
ON public.foodbank_distribution_locations FOR INSERT
WITH CHECK (public.is_foodbank_admin((SELECT auth.uid())));

CREATE POLICY "foodbank_locations_update_policy"
ON public.foodbank_distribution_locations FOR UPDATE
USING (public.is_foodbank_admin((SELECT auth.uid())))
WITH CHECK (public.is_foodbank_admin((SELECT auth.uid())));

CREATE POLICY "foodbank_locations_delete_policy"
ON public.foodbank_distribution_locations FOR DELETE
USING (public.is_foodbank_admin((SELECT auth.uid())));

-- ----------------------------------------------------------------------------
-- foodbank_items Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "foodbank_items_select_policy"
ON public.foodbank_items FOR SELECT
USING (true);

CREATE POLICY "foodbank_items_insert_policy"
ON public.foodbank_items FOR INSERT
WITH CHECK (public.is_foodbank_admin((SELECT auth.uid())));

CREATE POLICY "foodbank_items_update_policy"
ON public.foodbank_items FOR UPDATE
USING (public.is_foodbank_admin((SELECT auth.uid())))
WITH CHECK (public.is_foodbank_admin((SELECT auth.uid())));

CREATE POLICY "foodbank_items_delete_policy"
ON public.foodbank_items FOR DELETE
USING (public.is_foodbank_admin((SELECT auth.uid())));

-- ----------------------------------------------------------------------------
-- foodbank_applications Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "foodbank_applications_select_policy"
ON public.foodbank_applications FOR SELECT
USING (
    applicant_id = (SELECT auth.uid()) 
    OR public.is_foodbank_admin((SELECT auth.uid()))
);

CREATE POLICY "foodbank_applications_insert_policy"
ON public.foodbank_applications FOR INSERT
WITH CHECK (
    applicant_id = (SELECT auth.uid()) 
    OR public.is_foodbank_admin((SELECT auth.uid()))
);

CREATE POLICY "foodbank_applications_update_policy"
ON public.foodbank_applications FOR UPDATE
USING (
    applicant_id = (SELECT auth.uid()) 
    OR public.is_foodbank_admin((SELECT auth.uid()))
)
WITH CHECK (
    applicant_id = (SELECT auth.uid()) 
    OR public.is_foodbank_admin((SELECT auth.uid()))
);

CREATE POLICY "foodbank_applications_delete_policy"
ON public.foodbank_applications FOR DELETE
USING (
    (applicant_id = (SELECT auth.uid()) AND status IN ('MENUNGGU', 'BATAL'))
    OR public.is_foodbank_admin((SELECT auth.uid()))
);

-- ----------------------------------------------------------------------------
-- foodbank_budget_transactions Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "foodbank_budget_tx_select_policy"
ON public.foodbank_budget_transactions FOR SELECT
USING (public.is_foodbank_admin((SELECT auth.uid())));

CREATE POLICY "foodbank_budget_tx_insert_policy"
ON public.foodbank_budget_transactions FOR INSERT
WITH CHECK (public.is_foodbank_admin((SELECT auth.uid())));

CREATE POLICY "foodbank_budget_tx_update_policy"
ON public.foodbank_budget_transactions FOR UPDATE
USING (public.is_foodbank_admin((SELECT auth.uid())))
WITH CHECK (public.is_foodbank_admin((SELECT auth.uid())));

CREATE POLICY "foodbank_budget_tx_delete_policy"
ON public.foodbank_budget_transactions FOR DELETE
USING (public.is_foodbank_admin((SELECT auth.uid())));


-- ============================================================================
-- 7. ATOMIC RPC FUNCTION: verify_and_complete_foodbank_pickup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_and_complete_foodbank_pickup(
    p_application_id UUID,
    p_verifier_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_app RECORD;
    v_item RECORD;
    v_item_id UUID;
    v_qty INTEGER;
    v_item_name TEXT;
    v_current_stock INTEGER;
    v_total_val NUMERIC(10, 2);
    v_settings_id UUID;
BEGIN
    -- 1. Kunci rekod permohonan FOR UPDATE secara atomik
    SELECT * INTO v_app
    FROM public.foodbank_applications
    WHERE id = p_application_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Permohonan Food Bank tidak dijumpai.'
        );
    END IF;

    -- 2. Semak status permohonan semasa
    IF v_app.status = 'SELESAI' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Permohonan ini telah pun selesai diambil pada ' || to_char(COALESCE(v_app.pickup_verified_at, now()), 'DD/MM/YYYY HH24:MI') || '.'
        );
    END IF;

    IF v_app.status != 'LULUS' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Hanya permohonan berstatus LULUS boleh disahkan untuk agihan. Status semasa: ' || v_app.status
        );
    END IF;

    -- 3. Kunci dan tolak stok item dalam foodbank_items secara atomik
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_app.selected_items)
    LOOP
        v_item_id := (v_item.value->>'item_id')::UUID;
        v_qty := COALESCE((v_item.value->>'quantity')::INTEGER, 1);

        -- Kunci baris item dalam foodbank_items
        SELECT current_stock, name INTO v_current_stock, v_item_name
        FROM public.foodbank_items
        WHERE id = v_item_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item Food Bank ID % tidak dijumpai dalam inventori.', v_item_id;
        END IF;

        IF v_current_stock < v_qty THEN
            RAISE EXCEPTION 'Stok tidak mencukupi untuk item "%" (Baki: %, Diperlukan: %).', v_item_name, v_current_stock, v_qty;
        END IF;

        UPDATE public.foodbank_items
        SET current_stock = current_stock - v_qty,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_item_id;
    END LOOP;

    -- 4. Kemas kini status permohonan kepada SELESAI
    UPDATE public.foodbank_applications
    SET status = 'SELESAI',
        pickup_verified_at = timezone('utc'::text, now()),
        pickup_verified_by = p_verifier_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_application_id;

    v_total_val := COALESCE(v_app.total_estimated_value, 0.00);

    -- 5. Kemas kini current_spent dalam foodbank_settings
    SELECT id INTO v_settings_id
    FROM public.foodbank_settings
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_settings_id IS NOT NULL THEN
        UPDATE public.foodbank_settings
        SET current_spent = current_spent + v_total_val,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_settings_id;
    END IF;

    -- 6. Masukkan log audit lejar bajet (foodbank_budget_transactions)
    INSERT INTO public.foodbank_budget_transactions (
        application_id,
        transaction_type,
        amount,
        description,
        created_by
    ) VALUES (
        p_application_id,
        'DISTRIBUTION',
        v_total_val,
        'Agihan selesai untuk no permohonan ' || v_app.application_no || ' (Nilai anggaran: RM' || v_total_val::TEXT || ')',
        p_verifier_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Pengesahan pengambilan berjaya diselesaikan.',
        'application_id', p_application_id,
        'application_no', v_app.application_no,
        'total_value', v_total_val
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_and_complete_foodbank_pickup(UUID, UUID) TO authenticated;

-- Helper RPC: Selesaikan melalui imbasan kod QR
CREATE OR REPLACE FUNCTION public.verify_and_complete_foodbank_pickup_by_qr(
    p_qr_code TEXT,
    p_verifier_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_app_id UUID;
BEGIN
    SELECT id INTO v_app_id
    FROM public.foodbank_applications
    WHERE pickup_qr_code = trim(p_qr_code);

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Kod QR pas pengambilan tidak sah atau permohonan tidak dijumpai.'
        );
    END IF;

    RETURN public.verify_and_complete_foodbank_pickup(v_app_id, p_verifier_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_and_complete_foodbank_pickup_by_qr(TEXT, UUID) TO authenticated;


-- ============================================================================
-- 8. SEED INITIAL FOOD BANK DATA
-- ============================================================================

-- 1. Seed Food Bank Default Settings
INSERT INTO public.foodbank_settings (
    id,
    is_application_open,
    total_budget,
    current_spent,
    max_monthly_applications_per_student,
    max_items_per_application,
    application_instructions,
    eligibility_criteria
)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    true,
    5000.00,
    0.00,
    1,
    5,
    'Sila pastikan maklumat pemohon tepat dan barangan yang dipilih adalah mengikut keperluan asas sebenar.',
    'Terbuka kepada semua mahasiswa POLISAS yang memerlukan bantuan makanan/keperluan asas (keutamaan kepada kategori B40 / asnaf).'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Initial Distribution Locations
INSERT INTO public.foodbank_distribution_locations (
    name,
    room_detail,
    operating_hours,
    contact_person,
    is_active
)
SELECT 'Pusat Edaran Utama JPP (Blok Pentadbiran)', 'Bilik Gerakan JPP, Tingkat 1', 'Isnin - Khamis: 10:00 AM - 4:00 PM', 'Exco Kebajikan JPP', true
WHERE NOT EXISTS (SELECT 1 FROM public.foodbank_distribution_locations WHERE name ILIKE '%Pusat Edaran Utama JPP%');

INSERT INTO public.foodbank_distribution_locations (
    name,
    room_detail,
    operating_hours,
    contact_person,
    is_active
)
SELECT 'Pusat Agihan Dewan Sri Mahkota', 'Kaunter Foyer Utama', 'Isnin - Rabu: 2:00 PM - 5:00 PM', 'Sukarelawan Kebajikan', true
WHERE NOT EXISTS (SELECT 1 FROM public.foodbank_distribution_locations WHERE name ILIKE '%Dewan Sri Mahkota%');

-- Link distribution locations to polymaps buildings if existing
UPDATE public.foodbank_distribution_locations l
SET polymaps_building_id = b.id
FROM public.imaps_buildings b
WHERE l.polymaps_building_id IS NULL 
  AND l.name ILIKE '%Blok Pentadbiran%' 
  AND (b.name ILIKE '%Pentadbiran%' OR b.code ILIKE '%PENTADBIRAN%');

UPDATE public.foodbank_distribution_locations l
SET polymaps_building_id = b.id
FROM public.imaps_buildings b
WHERE l.polymaps_building_id IS NULL 
  AND l.name ILIKE '%Dewan Sri Mahkota%' 
  AND (b.name ILIKE '%Mahkota%' OR b.code ILIKE '%MAHKOTA%');

-- 3. Seed Initial Inventory Items
INSERT INTO public.foodbank_items (name, category, description, current_stock, unit, estimated_cost, is_active)
SELECT 'Beras Super Spesial Tempatan (5kg)', 'MAKANAN', 'Beras putih tempatan berkualiti 5kg pek tahan lama.', 50, 'kampit', 18.50, true
WHERE NOT EXISTS (SELECT 1 FROM public.foodbank_items WHERE name ILIKE '%Beras Super Spesial%');

INSERT INTO public.foodbank_items (name, category, description, current_stock, unit, estimated_cost, is_active)
SELECT 'Mi Segera Perisa Kari (Pek 5x)', 'MAKANAN', 'Mi segera segera pek keluarga 5 bungkus.', 100, 'pek', 5.50, true
WHERE NOT EXISTS (SELECT 1 FROM public.foodbank_items WHERE name ILIKE '%Mi Segera Perisa Kari%');

INSERT INTO public.foodbank_items (name, category, description, current_stock, unit, estimated_cost, is_active)
SELECT 'Biskut Cream Crackers (Pek Besar)', 'MAKANAN', 'Biskut kering berkrim sesuai untuk sarapan pagi.', 80, 'pek', 4.80, true
WHERE NOT EXISTS (SELECT 1 FROM public.foodbank_items WHERE name ILIKE '%Biskut Cream Crackers%');

INSERT INTO public.foodbank_items (name, category, description, current_stock, unit, estimated_cost, is_active)
SELECT 'Sardin Dalam Sos Tomato (425g)', 'MAKANAN', 'Sardin tin saiz besar sedia dimasak.', 60, 'tin', 6.80, true
WHERE NOT EXISTS (SELECT 1 FROM public.foodbank_items WHERE name ILIKE '%Sardin Dalam Sos Tomato%');

INSERT INTO public.foodbank_items (name, category, description, current_stock, unit, estimated_cost, is_active)
SELECT 'Minyak Masak Tulen (1kg)', 'MAKANAN', 'Minyak masak pek polibeg 1kg bersubsidi.', 50, 'pek', 2.50, true
WHERE NOT EXISTS (SELECT 1 FROM public.foodbank_items WHERE name ILIKE '%Minyak Masak Tulen%');

INSERT INTO public.foodbank_items (name, category, description, current_stock, unit, estimated_cost, is_active)
SELECT 'Susu Pekat Manis (500g)', 'MINUMAN', 'Susu pekat krimer manis tin.', 75, 'tin', 3.80, true
WHERE NOT EXISTS (SELECT 1 FROM public.foodbank_items WHERE name ILIKE '%Susu Pekat Manis%');

INSERT INTO public.foodbank_items (name, category, description, current_stock, unit, estimated_cost, is_active)
SELECT 'Teh Uncang Wangi (40 Uncang)', 'MINUMAN', 'Teh uncang aroma wangi untuk minuman harian.', 90, 'kotak', 4.50, true
WHERE NOT EXISTS (SELECT 1 FROM public.foodbank_items WHERE name ILIKE '%Teh Uncang Wangi%');

INSERT INTO public.foodbank_items (name, category, description, current_stock, unit, estimated_cost, is_active)
SELECT 'Sabun Mandi Antibakteria (Pek 3)', 'KEBERSIHAN', 'Sabun ketul antibakteria penjagaan diri.', 50, 'pek', 4.20, true
WHERE NOT EXISTS (SELECT 1 FROM public.foodbank_items WHERE name ILIKE '%Sabun Mandi Antibakteria%');
