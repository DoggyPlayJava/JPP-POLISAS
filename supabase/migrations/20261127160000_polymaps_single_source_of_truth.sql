-- ============================================================================
-- Migration: 20261127160000_polymaps_single_source_of_truth.sql
-- Module: PolyMaps / PolyMaps 360° / Walkways (Phase 1 — Additive Single Source of Truth)
-- Safe & Idempotent:
--   - Uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS everywhere.
--   - Keeps legacy columns intact (imaps_locations.floor_level INTEGER,
--     imaps_buildings.panorama_360_url, imaps_buildings.is_360_enabled,
--     imaps_locations.panorama_360_url, imaps_locations.is_360_enabled)
--     so PortalPage, AkademikDashboard, Timetable, and FoodBank keep working with
--     zero downtime.
--   - Follows mandatory RLS rules: (SELECT auth.uid()), ONE policy per operation
--     per table, and indexes on EVERY FK column.
-- ============================================================================

-- ============================================================================
-- 1. UNIFIED ADMIN HELPER & CANONICAL FLOOR PARSERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_imaps_admin(p_uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_uid
      AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP', 'super_admin', 'SUPER_ADMIN')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_imaps_admin(UUID) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.parse_imaps_floor_order(p_raw TEXT)
RETURNS SMALLINT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean TEXT;
  v_num INTEGER;
BEGIN
  v_clean := UPPER(BTRIM(COALESCE(p_raw, '')));
  IF v_clean = '' THEN
    RETURN 1;
  END IF;

  -- Strip common Malay/English prefixes like 'ARAS ', 'TINGKAT ', 'FLOOR ', 'LEVEL ', 'T'
  v_clean := REGEXP_REPLACE(v_clean, '^(ARAS|TINGKAT|FLOOR|LEVEL)\s+', '', 'i');
  v_clean := REGEXP_REPLACE(v_clean, '^T(?=[0-9G])', '', 'i');
  v_clean := BTRIM(v_clean);

  IF v_clean IN ('G', 'GF', 'GROUND', 'GROUND FLOOR', 'BAWAH', 'ARAS BAWAH', '0', '00') THEN
    RETURN 0;
  END IF;

  -- Basement formats: B1 -> -1, B2 -> -2, LG -> -1
  IF v_clean IN ('LG', 'LOWER GROUND') THEN
    RETURN -1;
  END IF;

  IF v_clean ~ '^B[0-9]+$' THEN
    v_num := -1 * SUBSTRING(v_clean FROM 2)::INTEGER;
    RETURN GREATEST(-10, LEAST(99, v_num))::SMALLINT;
  END IF;

  IF v_clean ~ '^-?[0-9]+$' THEN
    v_num := v_clean::INTEGER;
    RETURN GREATEST(-10, LEAST(99, v_num))::SMALLINT;
  END IF;

  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_imaps_floor_label(p_order SMALLINT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_order IS NULL THEN
    RETURN '1';
  ELSIF p_order = 0 THEN
    RETURN 'G';
  ELSIF p_order < 0 THEN
    RETURN 'B' || ABS(p_order)::TEXT;
  ELSE
    RETURN p_order::TEXT;
  END IF;
END;
$$;

-- ============================================================================
-- 2. CANONICAL FLOOR COLUMNS ON imaps_locations & imaps_missing_reports
--    (Keep floor_level INTEGER intact for cross-module zero-downtime compat)
-- ============================================================================

ALTER TABLE public.imaps_locations
  ADD COLUMN IF NOT EXISTS floor_label TEXT,
  ADD COLUMN IF NOT EXISTS floor_order SMALLINT;

ALTER TABLE public.imaps_missing_reports
  ADD COLUMN IF NOT EXISTS floor_label TEXT,
  ADD COLUMN IF NOT EXISTS floor_order SMALLINT;

-- Idempotent backfill on imaps_locations
UPDATE public.imaps_locations
SET
  floor_order = COALESCE(floor_order, COALESCE(floor_level, 1)::SMALLINT),
  floor_label = COALESCE(
    NULLIF(BTRIM(floor_label), ''),
    public.normalize_imaps_floor_label(COALESCE(floor_order, COALESCE(floor_level, 1)::SMALLINT))
  )
WHERE floor_label IS NULL OR BTRIM(floor_label) = '' OR floor_order IS NULL;

-- Idempotent backfill on imaps_missing_reports
UPDATE public.imaps_missing_reports
SET
  floor_order = COALESCE(floor_order, COALESCE(floor_level, 0)::SMALLINT),
  floor_label = COALESCE(
    NULLIF(BTRIM(floor_label), ''),
    public.normalize_imaps_floor_label(COALESCE(floor_order, COALESCE(floor_level, 0)::SMALLINT))
  )
WHERE floor_label IS NULL OR BTRIM(floor_label) = '' OR floor_order IS NULL;

-- Trigger to keep floor_level INTEGER, floor_label TEXT, and floor_order SMALLINT synced
CREATE OR REPLACE FUNCTION public.sync_imaps_floor_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order SMALLINT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.floor_label IS NOT NULL AND BTRIM(NEW.floor_label) <> '' THEN
      v_order := public.parse_imaps_floor_order(NEW.floor_label);
    ELSIF NEW.floor_order IS NOT NULL THEN
      v_order := NEW.floor_order;
    ELSIF NEW.floor_level IS NOT NULL THEN
      v_order := GREATEST(-10, LEAST(99, NEW.floor_level))::SMALLINT;
    ELSE
      v_order := 1;
    END IF;
  ELSE
    -- UPDATE: prefer whichever column actually changed
    IF NEW.floor_label IS DISTINCT FROM OLD.floor_label
       AND NEW.floor_label IS NOT NULL
       AND BTRIM(NEW.floor_label) <> '' THEN
      v_order := public.parse_imaps_floor_order(NEW.floor_label);
    ELSIF NEW.floor_order IS DISTINCT FROM OLD.floor_order AND NEW.floor_order IS NOT NULL THEN
      v_order := NEW.floor_order;
    ELSIF NEW.floor_level IS DISTINCT FROM OLD.floor_level AND NEW.floor_level IS NOT NULL THEN
      v_order := GREATEST(-10, LEAST(99, NEW.floor_level))::SMALLINT;
    ELSIF NEW.floor_order IS NOT NULL THEN
      v_order := NEW.floor_order;
    ELSIF NEW.floor_level IS NOT NULL THEN
      v_order := GREATEST(-10, LEAST(99, NEW.floor_level))::SMALLINT;
    ELSE
      v_order := 1;
    END IF;
  END IF;

  NEW.floor_order := v_order;
  NEW.floor_level := v_order::INTEGER;
  NEW.floor_label := public.normalize_imaps_floor_label(v_order);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_imaps_locations_floor ON public.imaps_locations;
CREATE TRIGGER trg_sync_imaps_locations_floor
BEFORE INSERT OR UPDATE ON public.imaps_locations
FOR EACH ROW
EXECUTE FUNCTION public.sync_imaps_floor_columns();

DROP TRIGGER IF EXISTS trg_sync_imaps_missing_reports_floor ON public.imaps_missing_reports;
CREATE TRIGGER trg_sync_imaps_missing_reports_floor
BEFORE INSERT OR UPDATE ON public.imaps_missing_reports
FOR EACH ROW
EXECUTE FUNCTION public.sync_imaps_floor_columns();

-- ============================================================================
-- 3. FIRST-CLASS MULTI-FLOOR PANORAMA TABLE: public.imaps_panoramas
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.imaps_panoramas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.imaps_buildings(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.imaps_locations(id) ON DELETE SET NULL,
  floor_label TEXT NOT NULL DEFAULT '1',
  floor_order SMALLINT NOT NULL DEFAULT 1,
  title TEXT,
  image_url TEXT NOT NULL,
  haov SMALLINT NOT NULL DEFAULT 360 CHECK (haov BETWEEN 30 AND 360),
  vaov SMALLINT NOT NULL DEFAULT 180 CHECK (vaov BETWEEN 20 AND 180),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mandatory FK & lookup indexes
CREATE INDEX IF NOT EXISTS idx_imaps_panoramas_building_id ON public.imaps_panoramas(building_id);
CREATE INDEX IF NOT EXISTS idx_imaps_panoramas_location_id ON public.imaps_panoramas(location_id);
CREATE INDEX IF NOT EXISTS idx_imaps_panoramas_created_by ON public.imaps_panoramas(created_by);
CREATE INDEX IF NOT EXISTS idx_imaps_panoramas_status ON public.imaps_panoramas(status);

-- Idempotent backfill from imaps_buildings (never touches admin-cleared NULL/empty rows or data: Base64)
INSERT INTO public.imaps_panoramas (
  building_id,
  location_id,
  floor_label,
  floor_order,
  title,
  image_url,
  haov,
  vaov,
  status,
  is_primary
)
SELECT
  b.id,
  NULL,
  '1',
  1,
  b.name,
  BTRIM(b.panorama_360_url),
  COALESCE(
    GREATEST(30, LEAST(360, NULLIF(SUBSTRING(b.panorama_360_url FROM 'haov=([0-9]+)'), '')::INTEGER)),
    360
  )::SMALLINT,
  COALESCE(
    GREATEST(20, LEAST(180, NULLIF(SUBSTRING(b.panorama_360_url FROM 'vaov=([0-9]+)'), '')::INTEGER)),
    180
  )::SMALLINT,
  CASE WHEN COALESCE(b.is_360_enabled, false) THEN 'published' ELSE 'draft' END,
  true
FROM public.imaps_buildings b
WHERE NULLIF(BTRIM(b.panorama_360_url), '') IS NOT NULL
  AND BTRIM(b.panorama_360_url) NOT LIKE 'data:%'
  AND NOT EXISTS (
    SELECT 1
    FROM public.imaps_panoramas p
    WHERE p.building_id = b.id
      AND p.location_id IS NULL
      AND split_part(p.image_url, '#', 1) = split_part(BTRIM(b.panorama_360_url), '#', 1)
  );

-- Idempotent backfill from imaps_locations (only dedicated non-empty non-data URLs)
INSERT INTO public.imaps_panoramas (
  building_id,
  location_id,
  floor_label,
  floor_order,
  title,
  image_url,
  haov,
  vaov,
  status,
  is_primary
)
SELECT
  l.building_id,
  l.id,
  COALESCE(NULLIF(BTRIM(l.floor_label), ''), public.normalize_imaps_floor_label(COALESCE(l.floor_level, 1)::SMALLINT)),
  COALESCE(l.floor_order, COALESCE(l.floor_level, 1)::SMALLINT),
  l.room_code,
  BTRIM(l.panorama_360_url),
  COALESCE(
    GREATEST(30, LEAST(360, NULLIF(SUBSTRING(l.panorama_360_url FROM 'haov=([0-9]+)'), '')::INTEGER)),
    360
  )::SMALLINT,
  COALESCE(
    GREATEST(20, LEAST(180, NULLIF(SUBSTRING(l.panorama_360_url FROM 'vaov=([0-9]+)'), '')::INTEGER)),
    180
  )::SMALLINT,
  CASE WHEN COALESCE(l.is_360_enabled, false) THEN 'published' ELSE 'draft' END,
  false
FROM public.imaps_locations l
WHERE l.building_id IS NOT NULL
  AND NULLIF(BTRIM(l.panorama_360_url), '') IS NOT NULL
  AND BTRIM(l.panorama_360_url) NOT LIKE 'data:%'
  AND NOT EXISTS (
    SELECT 1
    FROM public.imaps_panoramas p
    WHERE p.building_id = l.building_id
      AND p.location_id = l.id
      AND split_part(p.image_url, '#', 1) = split_part(BTRIM(l.panorama_360_url), '#', 1)
  );

-- ============================================================================
-- 4. HOTSPOT FOREIGN KEY UPGRADE: imaps_360_hotspots.panorama_id
-- ============================================================================

ALTER TABLE public.imaps_360_hotspots
  ADD COLUMN IF NOT EXISTS panorama_id UUID REFERENCES public.imaps_panoramas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_imaps_360_hotspots_panorama_id
  ON public.imaps_360_hotspots(panorama_id);

-- Idempotent backfill linking existing hotspots to imaps_panoramas by normalized URL
UPDATE public.imaps_360_hotspots hs
SET panorama_id = matched.id
FROM (
  SELECT DISTINCT ON (h.id)
    h.id AS hotspot_id,
    p.id
  FROM public.imaps_360_hotspots h
  JOIN public.imaps_panoramas p
    ON split_part(h.panorama_url, '#', 1) = split_part(p.image_url, '#', 1)
  WHERE h.panorama_id IS NULL
  ORDER BY
    h.id,
    (p.building_id = h.building_id) DESC,
    (p.location_id IS NOT DISTINCT FROM h.location_id) DESC,
    p.is_primary DESC,
    p.created_at ASC
) AS matched
WHERE hs.id = matched.hotspot_id
  AND hs.panorama_id IS NULL;

-- ============================================================================
-- 5. CODIFY imaps_walkways FLAGS & imaps_walkway_segments TABLE
-- ============================================================================

ALTER TABLE public.imaps_walkways
  ADD COLUMN IF NOT EXISTS is_covered BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.imaps_walkway_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  walkway_id UUID NOT NULL REFERENCES public.imaps_walkways(id) ON DELETE CASCADE,
  start_idx INTEGER NOT NULL,
  end_idx INTEGER NOT NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  is_covered BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_imaps_walkway_segments_idx CHECK (start_idx >= 0 AND end_idx > start_idx)
);

CREATE INDEX IF NOT EXISTS idx_imaps_walkway_segments_walkway_id
  ON public.imaps_walkway_segments(walkway_id);

CREATE INDEX IF NOT EXISTS idx_imaps_walkway_segments_created_by
  ON public.imaps_walkway_segments(created_by);

-- ============================================================================
-- 6. UNIFIED NON-OVERLAPPING RLS POLICIES
--    Mandatory Rules:
--      - (SELECT auth.uid()) everywhere (never bare auth.uid())
--      - ONE policy per operation (SELECT, INSERT, UPDATE, DELETE) per table
--      - Unified via public.is_imaps_admin((SELECT auth.uid()))
-- ============================================================================

DO $$
DECLARE
  v_table TEXT;
  v_pol RECORD;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'imaps_buildings',
    'imaps_locations',
    'imaps_walkways',
    'imaps_walkway_segments',
    'imaps_panoramas',
    'imaps_360_hotspots',
    'imaps_field_submissions',
    'imaps_missing_reports',
    'imaps_room_mappings'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    FOR v_pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = v_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pol.policyname, v_table);
    END LOOP;
  END LOOP;
END;
$$;

-- imaps_buildings (public read, admin write)
CREATE POLICY "imaps_buildings_select_policy"
  ON public.imaps_buildings FOR SELECT
  USING (true);

CREATE POLICY "imaps_buildings_insert_policy"
  ON public.imaps_buildings FOR INSERT
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_buildings_update_policy"
  ON public.imaps_buildings FOR UPDATE
  USING (public.is_imaps_admin((SELECT auth.uid())))
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_buildings_delete_policy"
  ON public.imaps_buildings FOR DELETE
  USING (public.is_imaps_admin((SELECT auth.uid())));

-- imaps_locations (public read, admin write)
CREATE POLICY "imaps_locations_select_policy"
  ON public.imaps_locations FOR SELECT
  USING (true);

CREATE POLICY "imaps_locations_insert_policy"
  ON public.imaps_locations FOR INSERT
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_locations_update_policy"
  ON public.imaps_locations FOR UPDATE
  USING (public.is_imaps_admin((SELECT auth.uid())))
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_locations_delete_policy"
  ON public.imaps_locations FOR DELETE
  USING (public.is_imaps_admin((SELECT auth.uid())));

-- imaps_walkways (public read, admin write)
CREATE POLICY "imaps_walkways_select_policy"
  ON public.imaps_walkways FOR SELECT
  USING (true);

CREATE POLICY "imaps_walkways_insert_policy"
  ON public.imaps_walkways FOR INSERT
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_walkways_update_policy"
  ON public.imaps_walkways FOR UPDATE
  USING (public.is_imaps_admin((SELECT auth.uid())))
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_walkways_delete_policy"
  ON public.imaps_walkways FOR DELETE
  USING (public.is_imaps_admin((SELECT auth.uid())));

-- imaps_walkway_segments (public read, admin write)
CREATE POLICY "imaps_walkway_segments_select_policy"
  ON public.imaps_walkway_segments FOR SELECT
  USING (true);

CREATE POLICY "imaps_walkway_segments_insert_policy"
  ON public.imaps_walkway_segments FOR INSERT
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_walkway_segments_update_policy"
  ON public.imaps_walkway_segments FOR UPDATE
  USING (public.is_imaps_admin((SELECT auth.uid())))
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_walkway_segments_delete_policy"
  ON public.imaps_walkway_segments FOR DELETE
  USING (public.is_imaps_admin((SELECT auth.uid())));

-- imaps_panoramas (published public read, all rows for admin; admin write)
CREATE POLICY "imaps_panoramas_select_policy"
  ON public.imaps_panoramas FOR SELECT
  USING (status = 'published' OR public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_panoramas_insert_policy"
  ON public.imaps_panoramas FOR INSERT
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_panoramas_update_policy"
  ON public.imaps_panoramas FOR UPDATE
  USING (public.is_imaps_admin((SELECT auth.uid())))
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_panoramas_delete_policy"
  ON public.imaps_panoramas FOR DELETE
  USING (public.is_imaps_admin((SELECT auth.uid())));

-- imaps_360_hotspots (public read, admin write)
CREATE POLICY "imaps_360_hotspots_select_policy"
  ON public.imaps_360_hotspots FOR SELECT
  USING (true);

CREATE POLICY "imaps_360_hotspots_insert_policy"
  ON public.imaps_360_hotspots FOR INSERT
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_360_hotspots_update_policy"
  ON public.imaps_360_hotspots FOR UPDATE
  USING (public.is_imaps_admin((SELECT auth.uid())))
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_360_hotspots_delete_policy"
  ON public.imaps_360_hotspots FOR DELETE
  USING (public.is_imaps_admin((SELECT auth.uid())));

-- imaps_room_mappings (public read, admin write)
CREATE POLICY "imaps_room_mappings_select_policy"
  ON public.imaps_room_mappings FOR SELECT
  USING (true);

CREATE POLICY "imaps_room_mappings_insert_policy"
  ON public.imaps_room_mappings FOR INSERT
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_room_mappings_update_policy"
  ON public.imaps_room_mappings FOR UPDATE
  USING (public.is_imaps_admin((SELECT auth.uid())))
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_room_mappings_delete_policy"
  ON public.imaps_room_mappings FOR DELETE
  USING (public.is_imaps_admin((SELECT auth.uid())));

-- imaps_missing_reports (students read/insert own, admin full control)
CREATE POLICY "imaps_missing_reports_select_policy"
  ON public.imaps_missing_reports FOR SELECT
  USING (
    student_id = (SELECT auth.uid())
    OR public.is_imaps_admin((SELECT auth.uid()))
  );

CREATE POLICY "imaps_missing_reports_insert_policy"
  ON public.imaps_missing_reports FOR INSERT
  WITH CHECK (
    student_id = (SELECT auth.uid())
    OR public.is_imaps_admin((SELECT auth.uid()))
  );

CREATE POLICY "imaps_missing_reports_update_policy"
  ON public.imaps_missing_reports FOR UPDATE
  USING (public.is_imaps_admin((SELECT auth.uid())))
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_missing_reports_delete_policy"
  ON public.imaps_missing_reports FOR DELETE
  USING (public.is_imaps_admin((SELECT auth.uid())));

-- imaps_field_submissions (volunteers read/insert own, admin full control)
CREATE POLICY "imaps_field_submissions_select_policy"
  ON public.imaps_field_submissions FOR SELECT
  USING (
    contributor_id = (SELECT auth.uid())
    OR public.is_imaps_admin((SELECT auth.uid()))
  );

CREATE POLICY "imaps_field_submissions_insert_policy"
  ON public.imaps_field_submissions FOR INSERT
  WITH CHECK (contributor_id = (SELECT auth.uid()));

CREATE POLICY "imaps_field_submissions_update_policy"
  ON public.imaps_field_submissions FOR UPDATE
  USING (public.is_imaps_admin((SELECT auth.uid())))
  WITH CHECK (public.is_imaps_admin((SELECT auth.uid())));

CREATE POLICY "imaps_field_submissions_delete_policy"
  ON public.imaps_field_submissions FOR DELETE
  USING (public.is_imaps_admin((SELECT auth.uid())));

-- Grants for new tables
GRANT SELECT ON public.imaps_panoramas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.imaps_panoramas TO authenticated;
GRANT SELECT ON public.imaps_walkway_segments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.imaps_walkway_segments TO authenticated;

-- ============================================================================
-- 7. ATOMIC FIELD SUBMISSION APPROVAL RPC (SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_imaps_field_submission(p_submission_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_sub RECORD;
  v_building RECORD;
  v_pano_url TEXT;
  v_base_url TEXT;
  v_haov SMALLINT;
  v_vaov SMALLINT;
  v_floor_order SMALLINT;
  v_floor_label TEXT;
  v_panorama_id UUID;
  v_has_primary BOOLEAN;
  v_pins JSONB;
  v_pin JSONB;
  v_pin_type TEXT;
  v_pin_label TEXT;
  v_room_code TEXT;
  v_pin_floor_order SMALLINT;
  v_pin_floor_label TEXT;
  v_loc_id UUID;
  v_pin_yaw DOUBLE PRECISION;
  v_pin_pitch DOUBLE PRECISION;
  v_rooms_synced INTEGER := 0;
  v_hotspots_inserted INTEGER := 0;
BEGIN
  v_actor_id := (SELECT auth.uid());
  IF NOT public.is_imaps_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Akses ditolak: hanya JPP/Admin dibenarkan meluluskan sumbangan PolyMaps.';
  END IF;

  -- Lock submission row atomically
  SELECT * INTO v_sub
  FROM public.imaps_field_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sumbangan 360° tidak dijumpai.');
  END IF;

  IF v_sub.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Sumbangan ini telah pun diproses (status: ' || v_sub.status || ').'
    );
  END IF;

  SELECT * INTO v_building
  FROM public.imaps_buildings
  WHERE id = v_sub.building_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bangunan sasaran tidak ditemui.');
  END IF;

  v_pano_url := NULLIF(BTRIM(v_sub.panorama_360_url), '');
  IF v_pano_url IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'URL panorama 360° tidak sah atau kosong.');
  END IF;

  IF v_pano_url LIKE 'data:%' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Imej Base64 tidak dibenarkan dalam pangkalan data. Sila muat naik semula ke storan imaps_assets.'
    );
  END IF;

  v_base_url := split_part(v_pano_url, '#', 1);
  v_haov := COALESCE(
    GREATEST(30, LEAST(360, NULLIF(SUBSTRING(v_pano_url FROM 'haov=([0-9]+)'), '')::INTEGER)),
    360
  )::SMALLINT;
  v_vaov := COALESCE(
    GREATEST(20, LEAST(180, NULLIF(SUBSTRING(v_pano_url FROM 'vaov=([0-9]+)'), '')::INTEGER)),
    180
  )::SMALLINT;

  v_floor_order := public.parse_imaps_floor_order(v_sub.floor_level);
  v_floor_label := public.normalize_imaps_floor_label(v_floor_order);

  -- 1. Create or update imaps_panoramas record
  SELECT id INTO v_panorama_id
  FROM public.imaps_panoramas
  WHERE building_id = v_building.id
    AND location_id IS NOT DISTINCT FROM v_sub.location_id
    AND split_part(image_url, '#', 1) = v_base_url
  LIMIT 1;

  IF v_panorama_id IS NOT NULL THEN
    UPDATE public.imaps_panoramas
    SET
      image_url = v_pano_url,
      floor_label = v_floor_label,
      floor_order = v_floor_order,
      haov = v_haov,
      vaov = v_vaov,
      title = COALESCE(NULLIF(BTRIM(v_sub.corridor_label), ''), title, v_building.name),
      status = 'published',
      updated_at = NOW()
    WHERE id = v_panorama_id;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM public.imaps_panoramas
      WHERE building_id = v_building.id
        AND location_id IS NULL
        AND is_primary = true
        AND status = 'published'
    ) INTO v_has_primary;

    INSERT INTO public.imaps_panoramas (
      building_id,
      location_id,
      floor_label,
      floor_order,
      title,
      image_url,
      haov,
      vaov,
      status,
      is_primary,
      created_by
    ) VALUES (
      v_building.id,
      v_sub.location_id,
      v_floor_label,
      v_floor_order,
      COALESCE(NULLIF(BTRIM(v_sub.corridor_label), ''), v_building.name),
      v_pano_url,
      v_haov,
      v_vaov,
      'published',
      (v_sub.location_id IS NULL AND NOT v_has_primary),
      COALESCE(v_sub.contributor_id, v_actor_id)
    )
    RETURNING id INTO v_panorama_id;
  END IF;

  -- 2. Sync legacy building/location 360 columns for backward compatibility
  IF v_sub.location_id IS NOT NULL THEN
    UPDATE public.imaps_locations
    SET panorama_360_url = v_pano_url,
        is_360_enabled = true
    WHERE id = v_sub.location_id;
  ELSE
    UPDATE public.imaps_buildings
    SET panorama_360_url = v_pano_url,
        is_360_enabled = true
    WHERE id = v_building.id;
  END IF;

  -- 3. Resolve unified hotspots array (hotspots_json preferred over legacy hotspots_payload)
  v_pins := CASE
    WHEN v_sub.hotspots_json IS NOT NULL
         AND jsonb_typeof(v_sub.hotspots_json) = 'array'
         AND jsonb_array_length(v_sub.hotspots_json) > 0
      THEN v_sub.hotspots_json
    WHEN v_sub.hotspots_payload IS NOT NULL
         AND jsonb_typeof(v_sub.hotspots_payload) = 'array'
      THEN v_sub.hotspots_payload
    ELSE '[]'::jsonb
  END;

  -- 4. Upsert room locations referenced by room pins
  FOR v_pin IN SELECT * FROM jsonb_array_elements(v_pins)
  LOOP
    v_pin_type := COALESCE(NULLIF(BTRIM(v_pin->>'pin_type'), ''), 'room');
    v_room_code := NULLIF(BTRIM(COALESCE(v_pin->>'room_code', v_pin->>'label')), '');

    IF v_pin_type = 'room' AND v_room_code IS NOT NULL THEN
      v_pin_floor_order := public.parse_imaps_floor_order(
        COALESCE(NULLIF(BTRIM(v_pin->>'floor_level'), ''), v_floor_label)
      );
      v_pin_floor_label := public.normalize_imaps_floor_label(v_pin_floor_order);
      v_pin_yaw := COALESCE(NULLIF(v_pin->>'yaw', '')::DOUBLE PRECISION, 0);
      v_pin_pitch := COALESCE(NULLIF(v_pin->>'pitch', '')::DOUBLE PRECISION, 0);

      SELECT id INTO v_loc_id
      FROM public.imaps_locations
      WHERE building_id = v_building.id
        AND LOWER(BTRIM(room_code)) = LOWER(v_room_code)
      LIMIT 1;

      IF v_loc_id IS NOT NULL THEN
        UPDATE public.imaps_locations
        SET
          panorama_360_url = v_pano_url,
          is_360_enabled = true,
          target_yaw = v_pin_yaw,
          target_pitch = v_pin_pitch,
          floor_level = v_pin_floor_order::INTEGER,
          floor_label = v_pin_floor_label,
          floor_order = v_pin_floor_order,
          direction_text = COALESCE(NULLIF(BTRIM(v_pin->>'description'), ''), direction_text)
        WHERE id = v_loc_id;
      ELSE
        INSERT INTO public.imaps_locations (
          building_id,
          room_code,
          floor_level,
          floor_label,
          floor_order,
          direction_text,
          search_tags,
          panorama_360_url,
          is_360_enabled,
          target_yaw,
          target_pitch
        ) VALUES (
          v_building.id,
          v_room_code,
          v_pin_floor_order::INTEGER,
          v_pin_floor_label,
          v_pin_floor_order,
          COALESCE(NULLIF(BTRIM(v_pin->>'description'), ''), 'Aras ' || v_pin_floor_label || ', ' || v_building.name),
          LOWER(v_room_code || ', ' || COALESCE(v_building.code, '') || ', aras ' || v_pin_floor_label),
          v_pano_url,
          true,
          v_pin_yaw,
          v_pin_pitch
        );
      END IF;

      v_rooms_synced := v_rooms_synced + 1;
    END IF;
  END LOOP;

  -- 5. Replace hotspots for this panorama with FK-linked panorama_id and location_id
  IF jsonb_array_length(v_pins) > 0 THEN
    DELETE FROM public.imaps_360_hotspots
    WHERE panorama_id = v_panorama_id
       OR split_part(panorama_url, '#', 1) = v_base_url;

    FOR v_pin IN SELECT * FROM jsonb_array_elements(v_pins)
    LOOP
      v_pin_type := COALESCE(NULLIF(BTRIM(v_pin->>'pin_type'), ''), 'room');
      IF v_pin_type NOT IN ('room', 'scene', 'info') THEN
        v_pin_type := 'room';
      END IF;

      v_pin_label := COALESCE(
        NULLIF(BTRIM(v_pin->>'label'), ''),
        NULLIF(BTRIM(v_pin->>'room_code'), ''),
        'Pin'
      );
      v_room_code := NULLIF(BTRIM(v_pin->>'room_code'), '');
      v_pin_floor_order := public.parse_imaps_floor_order(
        COALESCE(NULLIF(BTRIM(v_pin->>'floor_level'), ''), v_floor_label)
      );
      v_pin_floor_label := public.normalize_imaps_floor_label(v_pin_floor_order);
      v_pin_yaw := COALESCE(NULLIF(v_pin->>'yaw', '')::DOUBLE PRECISION, 0);
      v_pin_pitch := COALESCE(NULLIF(v_pin->>'pitch', '')::DOUBLE PRECISION, 0);

      v_loc_id := NULL;
      IF COALESCE(v_room_code, v_pin_label) IS NOT NULL THEN
        SELECT id INTO v_loc_id
        FROM public.imaps_locations
        WHERE building_id = v_building.id
          AND LOWER(BTRIM(room_code)) = LOWER(COALESCE(v_room_code, v_pin_label))
        LIMIT 1;
      END IF;

      IF v_loc_id IS NULL AND NULLIF(BTRIM(v_pin->>'location_id'), '') IS NOT NULL THEN
        BEGIN
          v_loc_id := (v_pin->>'location_id')::UUID;
        EXCEPTION WHEN invalid_text_representation THEN
          v_loc_id := NULL;
        END;
      END IF;

      IF v_loc_id IS NULL THEN
        v_loc_id := v_sub.location_id;
      END IF;

      INSERT INTO public.imaps_360_hotspots (
        panorama_id,
        panorama_url,
        building_id,
        location_id,
        pin_type,
        label,
        room_code,
        floor_level,
        description,
        pitch,
        yaw,
        target_panorama_url,
        created_by
      ) VALUES (
        v_panorama_id,
        v_pano_url,
        v_building.id,
        v_loc_id,
        v_pin_type,
        v_pin_label,
        v_room_code,
        v_pin_floor_label,
        NULLIF(BTRIM(v_pin->>'description'), ''),
        v_pin_pitch,
        v_pin_yaw,
        NULLIF(BTRIM(v_pin->>'target_panorama_url'), ''),
        COALESCE(v_sub.contributor_id, v_actor_id)
      );

      v_hotspots_inserted := v_hotspots_inserted + 1;
    END LOOP;
  END IF;

  -- 6. Mark submission approved
  UPDATE public.imaps_field_submissions
  SET
    status = 'approved',
    reviewed_by = v_actor_id,
    reviewed_at = NOW()
  WHERE id = v_sub.id;

  -- 7. Notify volunteer contributor (best-effort inside transaction; fail-safe if table differs)
  IF v_sub.contributor_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        module,
        link
      ) VALUES (
        v_sub.contributor_id,
        '🎥 Sumbangan 360° PolyMaps Diluluskan!',
        'Rakaman 360° dan ' || v_hotspots_inserted::TEXT || ' pin pintu bilik sumbangan anda telah diterbitkan ke dalam PolyMaps. Terima kasih!',
        'MAPS_REPORT_APPROVED',
        'AKADEMIK',
        '/polymaps'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Do not abort approval if notification insert fails
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_sub.id,
    'panorama_id', v_panorama_id,
    'building_id', v_building.id,
    'rooms_synced', v_rooms_synced,
    'hotspots_inserted', v_hotspots_inserted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_imaps_field_submission(UUID) TO authenticated;

-- ============================================================================
-- 8. STORAGE BUCKET LIMIT UPGRADE (12MB — Idempotent)
-- ============================================================================

UPDATE storage.buckets
SET file_size_limit = 12582912
WHERE id = 'imaps_assets'
  AND (file_size_limit IS NULL OR file_size_limit < 12582912);
