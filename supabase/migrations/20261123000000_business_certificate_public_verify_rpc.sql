-- ============================================================================
-- Migration: 20261123000000_business_certificate_public_verify_rpc.sql
-- Description: Public PDPA-safe verification RPC and lookup index for
--   e-Keusahawanan Business Registration Certificates (Borang P-D).
-- ============================================================================

-- 1. Functional index for case-insensitive registration number lookups
CREATE INDEX IF NOT EXISTS idx_keusahawanan_businesses_ssm_reg_upper
  ON public.keusahawanan_businesses (UPPER(ssm_registration_number))
  WHERE ssm_registration_number IS NOT NULL;

-- 2. PDPA-safe public verification RPC (NO email, phone, matric_no, or bank info)
CREATE OR REPLACE FUNCTION public.verify_keusahawanan_certificate(
  p_lookup TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_clean TEXT;
  v_is_uuid BOOLEAN;
  v_biz RECORD;
  v_category_name TEXT;
  v_owner_name TEXT;
  v_member_count INT;
  v_approved_at TIMESTAMPTZ;
  v_reg_number TEXT;
BEGIN
  v_clean := TRIM(COALESCE(p_lookup, ''));
  IF v_clean = '' THEN
    RETURN NULL;
  END IF;

  v_is_uuid := v_clean ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  SELECT
    b.id,
    b.name,
    b.description,
    b.status,
    COALESCE(b.is_active, true) AS is_active,
    b.registration_type,
    COALESCE(
      NULLIF(TRIM(b.ssm_registration_number), ''),
      NULLIF(TRIM(to_jsonb(b)->>'registration_no'), '')
    ) AS resolved_reg_no,
    COALESCE(b.registration_history, '[]'::jsonb) AS registration_history,
    COALESCE(b.mentors, '[]'::jsonb) AS mentors,
    b.category_id,
    b.owner_id,
    b.created_at,
    COALESCE(b.polymart_is_active, false) AS polymart_is_active,
    COALESCE(b.is_ems_siswapreneur, false) AS is_ems_siswapreneur,
    b.puskep_upgrade_status
  INTO v_biz
  FROM public.keusahawanan_businesses b
  WHERE
    (v_is_uuid AND b.id = v_clean::uuid)
    OR UPPER(COALESCE(b.ssm_registration_number, '')) = UPPER(v_clean)
    OR UPPER(COALESCE(to_jsonb(b)->>'registration_no', '')) = UPPER(v_clean)
  ORDER BY (b.status = 'ACTIVE') DESC, b.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT c.name INTO v_category_name
  FROM public.keusahawanan_categories c
  WHERE c.id = v_biz.category_id;

  SELECT p.full_name INTO v_owner_name
  FROM public.profiles p
  WHERE p.id = v_biz.owner_id;

  SELECT GREATEST(1, COUNT(*)::int) INTO v_member_count
  FROM public.student_business_memberships m
  WHERE m.business_id = v_biz.id
    AND m.status = 'ACTIVE';

  SELECT l.created_at INTO v_approved_at
  FROM public.keusahawanan_logs l
  WHERE l.business_id = v_biz.id
    AND l.action_type = 'BUSINESS_APPROVED'
  ORDER BY l.created_at DESC
  LIMIT 1;

  v_reg_number := COALESCE(v_biz.resolved_reg_no, '');

  RETURN jsonb_build_object(
    'id', v_biz.id,
    'name', v_biz.name,
    'description', v_biz.description,
    'status', v_biz.status,
    'is_active', v_biz.is_active,
    'registration_type', v_biz.registration_type,
    'ssm_registration_number', v_reg_number,
    'registration_history', v_biz.registration_history,
    'mentors', v_biz.mentors,
    'category_name', COALESCE(v_category_name, 'Keusahawanan Umum'),
    'owner_name', COALESCE(v_owner_name, 'Pemilik Berdaftar'),
    'member_count', v_member_count,
    'created_at', v_biz.created_at,
    'approved_at', v_approved_at,
    'polymart_is_active', v_biz.polymart_is_active,
    'is_ems_siswapreneur', v_biz.is_ems_siswapreneur,
    'puskep_upgrade_status', v_biz.puskep_upgrade_status
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.verify_keusahawanan_certificate(TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
