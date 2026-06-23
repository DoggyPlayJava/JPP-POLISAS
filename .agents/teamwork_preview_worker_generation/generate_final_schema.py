import json
import re
import os

# Paths
root_dir = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main'
postgrest_path = os.path.join(root_dir, 'postgrest_info.json')
parsed_ts_path = os.path.join(root_dir, '.agents\\teamwork_preview_worker_generation\\parsed_ts_tables.json')
functions_path = os.path.join(root_dir, '.agents\\teamwork_preview_worker_generation\\extracted_functions.json')
triggers_path = os.path.join(root_dir, '.agents\\teamwork_preview_worker_generation\\extracted_triggers.json')
policies_path = os.path.join(root_dir, '.agents\\teamwork_preview_worker_generation\\extracted_policies.json')

# Load data
with open(postgrest_path, 'r', encoding='utf-16') as f:
    postgrest_data = json.load(f)
postgrest_defs = postgrest_data.get('definitions', {})

with open(parsed_ts_path, 'r') as f:
    parsed_ts_tables = json.load(f)

with open(functions_path, 'r') as f:
    extracted_functions = json.load(f)

with open(triggers_path, 'r') as f:
    extracted_triggers = json.load(f)

with open(policies_path, 'r') as f:
    extracted_policies = json.load(f)

# Sort tables topologically to ensure dependencies are created in order
dependencies = {}
for tname, defn in parsed_ts_tables.items():
    dependencies[tname] = set()
    for rel in defn.get('relationships', []):
        ref = rel['ref_table']
        if ref != tname and ref in parsed_ts_tables:
            dependencies[tname].add(ref)

visited = {}
ordered_tables = []
def visit(node):
    if visited.get(node) == 1:
        return
    if visited.get(node) == 2:
        return
    visited[node] = 1
    for dep in dependencies.get(node, []):
        visit(dep)
    visited[node] = 2
    ordered_tables.append(node)

for t in sorted(parsed_ts_tables.keys()):
    visit(t)

# Separate tables and views
# Views: v_hpnm_by_jabatan, v_merit_by_jabatan, v_takwim_global and any others without primary keys
views = ['v_hpnm_by_jabatan', 'v_merit_by_jabatan', 'v_takwim_global']
tables_to_create = [t for t in ordered_tables if t not in views]

def format_default(val, format_type):
    if val is None:
        return ""
    if isinstance(val, bool):
        return f"DEFAULT {str(val).lower()}"
    if isinstance(val, (int, float)):
        return f"DEFAULT {val}"
    
    val_str = str(val).strip()
    # Check for functions or SQL expressions
    if val_str.lower() in ('now()', 'current_date', 'current_timestamp', 'gen_random_uuid()', 'uuid_generate_v4()') or 'timezone(' in val_str.lower() or 'array[' in val_str.lower() or val_str.startswith("'") or val_str.endswith("::text") or val_str.endswith("::jsonb"):
        return f"DEFAULT {val_str}"
    
    # Check if it looks like a JSON array or object
    if val_str.startswith('[') or val_str.startswith('{'):
        return f"DEFAULT '{val_str}'::jsonb"
        
    # Standard string default
    escaped = val_str.replace("'", "''")
    return f"DEFAULT '{escaped}'"

def get_postgres_type(format_str, type_str):
    if format_str:
        fmt = format_str.lower()
        if fmt == 'uuid': return 'UUID'
        if fmt == 'text': return 'TEXT'
        if fmt == 'timestamp with time zone': return 'TIMESTAMPTZ'
        if fmt == 'timestamp without time zone': return 'TIMESTAMP'
        if fmt == 'date': return 'DATE'
        if fmt == 'time without time zone': return 'TIME'
        if fmt == 'boolean': return 'BOOLEAN'
        if fmt == 'integer': return 'INTEGER'
        if fmt == 'smallint': return 'SMALLINT'
        if fmt == 'bigint': return 'BIGINT'
        if fmt == 'numeric': return 'NUMERIC'
        if fmt == 'jsonb': return 'JSONB'
        if fmt == 'text[]': return 'TEXT[]'
    
    if type_str:
        typ = type_str.lower()
        if typ == 'boolean': return 'BOOLEAN'
        if typ == 'integer': return 'INTEGER'
        if typ == 'number': return 'NUMERIC'
        if typ == 'string': return 'TEXT'
        if typ == 'array': return 'TEXT[]'
        if typ == 'object': return 'JSONB'
        
    return 'TEXT' # fallback

# Manual schemas for tables missing from postgrest but present in TS/migrations
manual_table_schemas = {
    'kamsis_applications': """CREATE TABLE IF NOT EXISTS public.kamsis_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session TEXT NOT NULL,
    semester TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    extra_data JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);""",
    'kamsis_dynamic_fields': """CREATE TABLE IF NOT EXISTS public.kamsis_dynamic_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_key TEXT NOT NULL UNIQUE,
    field_type TEXT NOT NULL,
    label TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    options JSONB DEFAULT '[]'::jsonb,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);""",
    'klk_form_fields': """CREATE TABLE IF NOT EXISTS public.klk_form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_key TEXT NOT NULL UNIQUE,
    field_type TEXT NOT NULL,
    label TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    options JSONB DEFAULT '[]'::jsonb,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    applies_to TEXT NOT NULL CHECK (applies_to IN ('STUDENT', 'LANDLORD', 'BOTH')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);""",
    'klk_kawasan': """CREATE TABLE IF NOT EXISTS public.klk_kawasan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);""",
    'klk_settings': """CREATE TABLE IF NOT EXISTS public.klk_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);""",
    'klk_student_residency': """CREATE TABLE IF NOT EXISTS public.klk_student_residency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    no_matrik TEXT NOT NULL,
    nama_pelajar TEXT NOT NULL,
    jabatan TEXT,
    semester INTEGER NOT NULL,
    no_telefon TEXT,
    alamat_kediaman TEXT,
    kawasan_kediaman TEXT,
    kawasan_custom TEXT,
    tinggal_luar BOOLEAN DEFAULT true,
    academic_year TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'MANUAL',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    expired_at TIMESTAMPTZ,
    is_expired BOOLEAN DEFAULT false,
    cadangan TEXT,
    extra_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);""",
    'klk_sync_log': """CREATE TABLE IF NOT EXISTS public.klk_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    synced_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_rows INTEGER DEFAULT 0,
    success INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    error_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);""",
    'merit_program_applications': """CREATE TABLE IF NOT EXISTS public.merit_program_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL,
    program_type TEXT NOT NULL CHECK (program_type IN ('takwim', 'aktiviti')),
    program_title TEXT,
    applied_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    merit_value INTEGER NOT NULL CHECK (merit_value > 0),
    justification TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'akademik_vouched', 'akademik_not_vouched', 'fully_approved', 'rejected')),
    kpp_reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    kpp_reviewed_at TIMESTAMPTZ,
    kpp_vouch_notes TEXT,
    kediaman_reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    kediaman_reviewed_at TIMESTAMPTZ,
    kediaman_notes TEXT,
    reject_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);""",
    'merit_review_log': """CREATE TABLE IF NOT EXISTS public.merit_review_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.merit_program_applications(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_unit TEXT NOT NULL CHECK (reviewer_unit IN ('AKADEMIK','KEDIAMAN')),
    action TEXT NOT NULL CHECK (action IN ('vouched','not_vouched','approved','rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);""",
    'program_attendees': """CREATE TABLE IF NOT EXISTS public.program_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL,
    program_type TEXT NOT NULL CHECK (program_type IN ('takwim', 'aktiviti')),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pre_registered' CHECK (status IN ('pre_registered', 'registered', 'attended', 'absent')),
    attended_at TIMESTAMPTZ,
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_program_attendee UNIQUE (program_id, user_id)
);""",
    'polymart_cart_items': """CREATE TABLE IF NOT EXISTS public.polymart_cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    selected_variation TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_polymart_cart_item_variation_constraint UNIQUE (buyer_id, product_id, selected_variation)
);""",
    'takwim_pusat': """CREATE TABLE IF NOT EXISTS public.takwim_pusat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jenis TEXT NOT NULL CHECK (jenis IN ('AKADEMIK', 'JPP', 'KOKURIKULUM', 'LAIN_LAIN')),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    location TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);"""
}

# Output file path
final_schema_file = os.path.join(root_dir, 'final_schema.sql')

with open(final_schema_file, 'w', encoding='utf-8') as out:
    # Write Header
    out.write("""-- =============================================================================
-- JPP-POLISAS Database Schema and Security Policies Reconstruction
-- Generated on: 2026-06-17
-- Unifies enums, tables, views, functions, triggers, policies, and indexes
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

""")

    # 1. Custom Types / Enums
    out.write("-- 1. CUSTOM TYPES / ENUMS\n\n")
    out.write("CREATE TYPE polyrent_status AS ENUM ('OPEN', 'CLOSED', 'HIDDEN', 'SUSPENDED');\n")
    out.write("CREATE TYPE keusahawanan_business_status AS ENUM ('PENDING_INTERVIEW', 'ACTIVE', 'REJECTED');\n")
    out.write("CREATE TYPE keusahawanan_membership_role AS ENUM ('OWNER', 'MEMBER');\n")
    out.write("CREATE TYPE keusahawanan_membership_status AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');\n")
    out.write("CREATE TYPE polymart_ad_status AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');\n")
    out.write("CREATE TYPE polymart_ad_type AS ENUM ('INTERNAL', 'EXTERNAL');\n")
    out.write("CREATE TYPE pos_discount_type AS ENUM ('FIXED', 'PERCENT');\n")
    out.write("""CREATE TYPE pos_log_action AS ENUM (
    'TRANSACTION_CREATE',
    'TRANSACTION_VOID',
    'PRODUCT_ADD',
    'PRODUCT_EDIT',
    'PRODUCT_DELETE',
    'STOCK_EDIT',
    'POS_ASSIGNED',
    'STAFF_APPROVED',
    'STAFF_REMOVED',
    'SETTINGS_UPDATED',
    'EXPENSE_ADD',
    'EXPENSE_DELETE',
    'PROMO_CREATE',
    'PROMO_USED',
    'PROMO_TOGGLE',
    'CASH_CHECKPOINT'
);\n""")
    out.write("CREATE TYPE pos_payment_method AS ENUM ('CASH', 'QR', 'TRANSFER');\n")
    out.write("CREATE TYPE pos_transaction_status AS ENUM ('COMPLETED', 'VOIDED');\n")
    out.write("""CREATE TYPE program_status AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'CONFIRMED',
    'IN_PROGRESS',
    'PENDING_POSTMORTEM',
    'COMPLETED',
    'ARCHIVED',
    'REQUEST_UNLOCK'
);\n""")
    out.write("CREATE TYPE polytask_job_status AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED');\n")
    out.write("CREATE TYPE polytask_bid_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');\n")
    out.write("\n-- =============================================================================\n\n")

    # 2. Table Definitions
    out.write("-- 2. TABLE DEFINITIONS (Topologically Ordered)\n\n")
    for tname in tables_to_create:
        if tname in manual_table_schemas:
            out.write(f"-- Table: {tname} (Manual definition)\n")
            out.write(manual_table_schemas[tname] + "\n\n")
            continue
        
        # Build definition from postgrest info
        if tname not in postgrest_defs:
            out.write(f"-- Table: {tname} (Not found in postgrest info, skipped)\n\n")
            continue
            
        out.write(f"-- Table: {tname}\n")
        out.write(f"CREATE TABLE public.{tname} (\n")
        
        properties = postgrest_defs[tname].get('properties', {})
        required = postgrest_defs[tname].get('required', [])
        
        cols_sql = []
        
        # Primary keys
        pks = []
        for col, p in properties.items():
            desc = p.get('description', '')
            if desc and '<pk/>' in desc:
                pks.append(col)
        
        # If no pk in description but has 'id', default to 'id' as primary key
        if not pks and 'id' in properties:
            pks.append('id')
            
        for col, p in properties.items():
            desc = p.get('description', '')
            fmt = p.get('format', p.get('type'))
            pg_type = get_postgres_type(fmt, p.get('type'))
            
            # Map enum types or custom type names
            if col == 'status' and tname == 'programs':
                pg_type = 'program_status'
            elif col == 'status' and tname == 'keusahawanan_businesses':
                pg_type = 'keusahawanan_business_status'
            elif col == 'role' and tname == 'student_business_memberships':
                pg_type = 'keusahawanan_membership_role'
            elif col == 'status' and tname == 'student_business_memberships':
                pg_type = 'keusahawanan_membership_status'
            elif col == 'status' and tname == 'polymart_ads':
                pg_type = 'polymart_ad_status'
            elif col == 'type' and tname == 'polymart_ads':
                pg_type = 'polymart_ad_type'
            elif col == 'discount_type' and tname == 'business_transactions':
                pg_type = 'pos_discount_type'
            elif col == 'payment_method' and tname == 'business_transactions':
                pg_type = 'pos_payment_method'
            elif col == 'status' and tname == 'business_transactions':
                pg_type = 'pos_transaction_status'
            elif col == 'status' and tname == 'polytask_jobs':
                pg_type = 'polytask_job_status'
            elif col == 'status' and tname == 'polytask_bids':
                pg_type = 'polytask_bid_status'
            elif col == 'status' and tname == 'polyrent_listings':
                pg_type = 'polyrent_status'
            
            req_str = "NOT NULL" if col in required else "NULL"
            
            default_val = p.get('default')
            default_str = format_default(default_val, pg_type)
            
            col_sql = f"    {col} {pg_type} {req_str} {default_str}".strip()
            cols_sql.append(col_sql)
            
        # Add primary key constraint
        if pks:
            cols_sql.append(f"    CONSTRAINT pk_{tname} PRIMARY KEY ({', '.join(pks)})")
            
        # Add foreign key constraints
        ts_rels = parsed_ts_tables.get(tname, {}).get('relationships', [])
        for r in ts_rels:
            ref_tbl = r['ref_table']
            ref_col = r['ref_col']
            col_name = r['col']
            fk_name = r['fk_name']
            
            # Resolve auth.users schema
            if ref_tbl == 'users' and col_name == 'id' and tname == 'profiles':
                # Special case profiles
                cols_sql.append(f"    CONSTRAINT {fk_name} FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE")
            elif ref_tbl == 'users':
                cols_sql.append(f"    CONSTRAINT {fk_name} FOREIGN KEY ({col_name}) REFERENCES auth.users(id) ON DELETE CASCADE")
            elif ref_tbl in parsed_ts_tables:
                # Resolve cascade delete
                on_delete = "ON DELETE CASCADE"
                if col_name in ('reviewer_id', 'reviewed_by', 'kpp_reviewer_id', 'kediaman_reviewer_id', 'assigned_to', 'created_by', 'uploaded_by', 'owner_user_id', 'closed_by', 'opened_by', 'voided_by', 'synced_by'):
                    on_delete = "ON DELETE SET NULL"
                cols_sql.append(f"    CONSTRAINT {fk_name} FOREIGN KEY ({col_name}) REFERENCES public.{ref_tbl}({ref_col}) {on_delete}")
                
        out.write(",\n".join(cols_sql))
        out.write("\n);\n\n")

    out.write("\n-- =============================================================================\n\n")

    # 3. View Definitions
    out.write("-- 3. VIEW DEFINITIONS\n\n")
    
    out.write("""-- View: v_hpnm_by_jabatan
CREATE OR REPLACE VIEW public.v_hpnm_by_jabatan AS
SELECT 
    p.department AS jabatan,
    p.programme_code AS program,
    AVG(c.hpnm) AS avg_hpnm,
    AVG(c.pnm) AS avg_pnm,
    COUNT(DISTINCT p.id) AS student_count,
    COUNT(DISTINCT CASE WHEN c.hpnm >= 3.50 THEN p.id END) AS cemerlang_count,
    COUNT(DISTINCT CASE WHEN c.hpnm >= 3.00 AND c.hpnm < 3.50 THEN p.id END) AS kepujian_count,
    COUNT(DISTINCT CASE WHEN c.hpnm >= 2.00 AND c.hpnm < 3.00 THEN p.id END) AS lulus_count,
    COUNT(DISTINCT CASE WHEN c.hpnm < 2.00 THEN p.id END) AS gagal_count
FROM public.profiles p
LEFT JOIN public.akademik_cgpa_records c ON p.id = c.user_id
GROUP BY p.department, p.programme_code;

-- View: v_merit_by_jabatan
CREATE OR REPLACE VIEW public.v_merit_by_jabatan AS
SELECT 
    p.department AS jabatan,
    COUNT(DISTINCT p.id) AS student_count,
    SUM(p.merit) AS total_merit,
    AVG(p.merit) AS avg_merit
FROM public.profiles p
GROUP BY p.department;

-- View: v_takwim_global
CREATE OR REPLACE VIEW public.v_takwim_global AS
SELECT 
    id::text AS id,
    title AS title,
    description AS description,
    start_date AS start_date,
    end_date AS end_date,
    'takwim_pusat'::text AS module_type,
    category AS unit_name
FROM public.takwim_pusat
UNION ALL
SELECT 
    id::text AS id,
    nama_cuti AS title,
    'Cuti Umum'::text AS description,
    tarikh_mula::timestamp with time zone AS start_date,
    tarikh_mula::timestamp with time zone AS end_date,
    'holiday'::text AS module_type,
    'GLOBAL'::text AS unit_name
FROM public.takwim_holidays;
\n""")
    out.write("\n-- =============================================================================\n\n")

    # 4. Storage Buckets Seed and Security Policies
    out.write("-- 4. STORAGE BUCKETS AND POLICIES\n\n")
    out.write("""-- Create buckets in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('receipts', 'receipts', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('reports', 'reports', false, NULL, NULL),
  ('avatars', 'avatars', true, NULL, NULL),
  ('club-logos', 'club-logos', true, NULL, NULL),
  ('announcements', 'announcements', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('karnival-booths', 'karnival-booths', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('kebajikan-images', 'kebajikan-images', true, NULL, NULL),
  ('keusahawanan-products', 'keusahawanan-products', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('polymart-ads', 'polymart-ads', true, NULL, NULL),
  ('polymart-receipts', 'polymart-receipts', true, NULL, NULL),
  ('polysuara_attachments', 'polysuara_attachments', true, NULL, NULL),
  ('keusahawanan', 'keusahawanan', true, NULL, NULL),
  ('imaps_assets', 'imaps_assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('polytask_proofs', 'polytask_proofs', true, NULL, NULL),
  ('polyrent', 'polyrent', true, NULL, NULL),
  ('supsas-assets', 'supsas-assets', true, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- storage.objects Row-Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Combined_Storage_Objects_SELECT" ON storage.objects;
CREATE POLICY "Combined_Storage_Objects_SELECT" ON storage.objects FOR SELECT USING (
  bucket_id IN ('polysuara_attachments', 'keusahawanan-products', 'polyrent', 'announcements', 
                'supsas-assets', 'karnival-booths', 'imaps_assets', 'polymart-ads', 
                'polytask_proofs', 'avatars', 'club-logos', 'kebajikan-images', 
                'keusahawanan', 'polymart-receipts')
  OR (bucket_id = 'receipts' AND ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP')))
  OR (bucket_id = 'reports' AND ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')))
);

DROP POLICY IF EXISTS "Combined_Storage_Objects_INSERT" ON storage.objects;
CREATE POLICY "Combined_Storage_Objects_INSERT" ON storage.objects FOR INSERT WITH CHECK (
  (bucket_id IN ('polysuara_attachments', 'imaps_assets') AND (SELECT auth.role()) = 'authenticated')
  OR (bucket_id IN ('keusahawanan-products', 'polyrent', 'polymart-receipts', 'reports', 'club-logos', 'kebajikan-images', 'keusahawanan') AND (SELECT auth.role()) = 'authenticated')
  OR (bucket_id IN ('announcements', 'supsas-assets', 'karnival-booths') AND ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')))
  OR (bucket_id = 'polymart-ads' AND (((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')) OR (SELECT keusahawanan_access FROM public.profiles WHERE id = (SELECT auth.uid())) = true))
  OR (bucket_id = 'polytask_proofs' AND (SELECT auth.uid()) IS NOT NULL)
  OR (bucket_id = 'receipts' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1])
  OR (bucket_id = 'avatars' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1])
);

DROP POLICY IF EXISTS "Combined_Storage_Objects_UPDATE" ON storage.objects;
CREATE POLICY "Combined_Storage_Objects_UPDATE" ON storage.objects FOR UPDATE USING (
  (bucket_id IN ('keusahawanan-products', 'club-logos') AND (SELECT auth.role()) = 'authenticated')
  OR (bucket_id = 'polyrent' AND (SELECT auth.uid()) = owner)
  OR (bucket_id = 'announcements' AND ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')))
  OR (bucket_id = 'imaps_assets' AND (SELECT auth.role()) = 'authenticated')
  OR (bucket_id = 'avatars' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1])
);

DROP POLICY IF EXISTS "Combined_Storage_Objects_DELETE" ON storage.objects;
CREATE POLICY "Combined_Storage_Objects_DELETE" ON storage.objects FOR DELETE USING (
  (bucket_id IN ('keusahawanan-products', 'imaps_assets') AND (SELECT auth.role()) = 'authenticated')
  OR (bucket_id = 'polyrent' AND (SELECT auth.uid()) = owner)
  OR (bucket_id IN ('announcements', 'supsas-assets', 'karnival-booths') AND ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')))
  OR (bucket_id = 'polymart-ads' AND (((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')) OR (SELECT keusahawanan_access FROM public.profiles WHERE id = (SELECT auth.uid())) = true))
  OR (bucket_id = 'receipts' AND ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP')))
  OR (bucket_id = 'reports' AND ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')))
  OR (bucket_id = 'avatars' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1])
);
\n""")
    out.write("\n-- =============================================================================\n\n")

    # 5. Custom Functions (RPCs)
    out.write("-- 5. CUSTOM POSTGRESQL FUNCTIONS (RPCs)\n\n")
    for fname in sorted(extracted_functions.keys()):
        sql = extracted_functions[fname]['sql']
        # Apply RLS optimization to functions? Usually function bodies already use subqueries,
        # but let's make sure we write them out exactly.
        out.write(f"-- Function: {fname} (from {extracted_functions[fname]['file']})\n")
        out.write(sql + "\n\n")
    out.write("\n-- =============================================================================\n\n")

    # 6. Triggers
    out.write("-- 6. DATABASE TRIGGERS\n\n")
    for tname in sorted(extracted_triggers.keys()):
        sql = extracted_triggers[tname]['sql']
        out.write(f"-- Trigger: {tname} (from {extracted_triggers[tname]['file']})\n")
        out.write(sql + "\n\n")
    out.write("\n-- =============================================================================\n\n")

    # 7. Row-Level Security Table Policies
    out.write("-- 7. TABLE SECURITY POLICIES (Optimized and Combined)\n\n")
    for tname in sorted(tables_to_create):
        out.write(f"-- Policies for table: {tname}\n")
        out.write(f"ALTER TABLE public.{tname} ENABLE ROW LEVEL SECURITY;\n")
        
        # We need to drop all existing policies on this table
        # Combined policies for SELECT, INSERT, UPDATE, DELETE
        ops = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
        
        for op in ops:
            policy_name = f"combined_{tname}_{op.lower()}"
            out.write(f"DROP POLICY IF EXISTS \"{policy_name}\" ON public.{tname};\n")
            
            # Find and combine policies for this table and operation
            # Split FOR ALL policies into SELECT, INSERT, UPDATE, DELETE
            # For each, replace auth.uid() with (SELECT auth.uid()) and auth.role() with (SELECT auth.role())
            conds = []
            is_with_check = (op == 'INSERT') # default for INSERT is WITH CHECK, others USING
            
            tbl_policies = extracted_policies.get(tname, [])
            for p in tbl_policies:
                # Basic parsing to extract command and clauses
                sql = p['sql']
                
                # Check command
                cmd_match = re.search(r'FOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL)', sql, re.IGNORECASE)
                cmd = cmd_match.group(1).upper() if cmd_match else 'ALL'
                
                if cmd == 'ALL' or cmd == op:
                    # Extract USING/WITH CHECK condition
                    # Let's search for USING (...) or WITH CHECK (...)
                    using_match = re.search(r'USING\s*\((.*?)\)(?:\s+WITH\s+CHECK|$)', sql, re.DOTALL | re.IGNORECASE)
                    check_match = re.search(r'WITH\s+CHECK\s*\((.*?)\)\s*$', sql, re.DOTALL | re.IGNORECASE)
                    
                    cond = ""
                    if is_with_check and check_match:
                        cond = check_match.group(1).strip()
                    elif not is_with_check and using_match:
                        cond = using_match.group(1).strip()
                    elif not is_with_check and check_match:
                        # Fallback for UPDATE policies that might specify WITH CHECK but not USING
                        cond = check_match.group(1).strip()
                    elif is_with_check and using_match:
                        # Fallback for INSERT/UPDATE
                        cond = using_match.group(1).strip()
                        
                    if cond:
                        # Optimize bare auth.uid() and auth.role()
                        # Avoid double-wrapping
                        cond = re.sub(r'(?<!\(SELECT\s)auth\.uid\(\)', '(SELECT auth.uid())', cond, flags=re.IGNORECASE)
                        cond = re.sub(r'(?<!\(SELECT\s)auth\.role\(\)', '(SELECT auth.role())', cond, flags=re.IGNORECASE)
                        conds.append(cond)
            
            # If no policies exist, add default secure ones (except public lookup tables)
            if not conds:
                if tname in ('clubs', 'takwim_holidays', 'takwim_pusat', 'system_announcements', 'karnival_editions', 'karnival_categories', 'karnival_booths', 'supsas_editions', 'supsas_sports', 'supsas_fixtures', 'supsas_kontingen', 'supsas_medal_tally', 'supsas_results', 'imaps_buildings', 'imaps_locations', 'portal_settings', 'akademik_sijil_categories', 'akademik_merit_config', 'business_products', 'business_promotions'):
                    # Public read lookup tables
                    if op == 'SELECT':
                        conds.append("true")
                    else:
                        # Only JPP/Admins can write
                        conds.append("EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))")
                elif tname in ('profiles', 'student_club_memberships', 'student_business_memberships', 'business_transactions', 'business_expenses', 'polymart_cart_items', 'polymart_wishlist', 'polymart_orders', 'polymart_conversations', 'polymart_messages', 'polytask_jobs', 'polytask_bids', 'polytask_chats', 'polytask_proofs', 'polyrent_listings', 'polyrent_messages', 'polyrent_reports', 'polyrent_location_reviews', 'polyrent_reverse_ads', 'polyrider_profiles', 'polyrider_jobs', 'polyrider_bids', 'polyrider_chats', 'polyrider_saved_locations', 'polyrider_sos_logs', 'polysuara_confessions', 'polysuara_comments', 'polysuara_upvotes', 'polysuara_downvotes', 'polysuara_polls', 'polysuara_poll_options', 'polysuara_poll_votes', 'polysuara_comment_votes', 'polysuara_comment_reports', 'polysuara_chat_messages', 'polysuara_chats', 'kebajikan_tickets', 'kebajikan_ticket_comments', 'kebajikan_ticket_status_log', 'kebajikan_pics', 'kebajikan_staff_assignments', 'kebajikan_escalation_actions', 'kebajikan_notifications', 'akademik_cgpa_records', 'akademik_files', 'akademik_folders', 'akademik_pencapaian', 'akademik_qr_scans', 'akademik_qr_tokens', 'akademik_unlock_requests', 'asrama_recommendations', 'kamsis_applications', 'kamsis_dynamic_fields', 'klk_student_residency', 'klk_sync_log', 'user_announcement_responses'):
                    # Private/authenticated data
                    if op == 'SELECT':
                        # Own profile or authenticated read depending on table
                        if tname == 'profiles':
                            conds.append("id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))")
                        elif tname in ('student_club_memberships', 'student_business_memberships', 'polymart_cart_items', 'polymart_wishlist', 'polymart_orders', 'polytask_bids', 'polyrent_reverse_ads', 'polyrider_saved_locations', 'kebajikan_tickets', 'akademik_cgpa_records', 'kamsis_applications', 'klk_student_residency', 'user_announcement_responses'):
                            conds.append("user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))")
                        else:
                            conds.append("(SELECT auth.uid()) IS NOT NULL")
                    else:
                        # Own write or admin write
                        if tname == 'profiles':
                            conds.append("id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))")
                        elif tname in ('student_club_memberships', 'student_business_memberships', 'polymart_cart_items', 'polymart_wishlist', 'polymart_orders', 'polytask_bids', 'polyrent_reverse_ads', 'polyrider_saved_locations', 'kebajikan_tickets', 'akademik_cgpa_records', 'kamsis_applications', 'klk_student_residency', 'user_announcement_responses'):
                            conds.append("user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))")
                        else:
                            conds.append("EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))")
                else:
                    # Generic fallback
                    if op == 'SELECT':
                        conds.append("(SELECT auth.uid()) IS NOT NULL")
                    else:
                        conds.append("EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))")
            
            # Write policy
            combined_cond = " OR ".join(f"({c})" for c in conds)
            
            if is_with_check:
                out.write(f"CREATE POLICY \"{policy_name}\" ON public.{tname} FOR {op} WITH CHECK ({combined_cond});\n")
            else:
                out.write(f"CREATE POLICY \"{policy_name}\" ON public.{tname} FOR {op} USING ({combined_cond});\n")
        out.write("\n")

    out.write("\n-- =============================================================================\n\n")

    # 8. Indexes (Foreign key indexes)
    out.write("-- 8. INDEXES (Foreign Key Covering Indexes)\n\n")
    for tname in sorted(tables_to_create):
        ts_rels = parsed_ts_tables.get(tname, {}).get('relationships', [])
        seen_cols = set()
        for r in ts_rels:
            col_name = r['col']
            if col_name not in seen_cols:
                seen_cols.add(col_name)
                out.write(f"CREATE INDEX IF NOT EXISTS idx_{tname}_{col_name} ON public.{tname}({col_name});\n")
            
    out.write("""
-- Additional Performance Indexes
CREATE INDEX IF NOT EXISTS idx_scm_user_approved ON public.student_club_memberships(user_id, account_status) WHERE account_status = 'APPROVED';
CREATE INDEX IF NOT EXISTS idx_scm_club_approved ON public.student_club_memberships(club_id, account_status) WHERE account_status = 'APPROVED';
CREATE INDEX IF NOT EXISTS idx_profiles_club_status ON public.profiles(club_id, account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_merit_desc ON public.profiles(merit DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_programs_club_status ON public.programs(club_id, status);
CREATE INDEX IF NOT EXISTS idx_programs_club_updated ON public.programs(club_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_club_date ON public.club_activities(club_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_club_status ON public.club_activities(club_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_club_archived ON public.club_tasks(club_id, is_archived, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_club_approval ON public.club_tasks(club_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_announcements_club_created ON public.club_announcements(club_id, created_at DESC);
""")

print("Successfully generated final_schema.sql!")
