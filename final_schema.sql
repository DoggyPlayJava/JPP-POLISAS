-- =============================================================================
-- JPP-POLISAS Database Schema and Security Policies Reconstruction
-- Generated on: 2026-06-17
-- Unifies enums, tables, views, functions, triggers, policies, and indexes
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CUSTOM TYPES / ENUMS

CREATE TYPE polyrent_status AS ENUM ('OPEN', 'CLOSED', 'HIDDEN', 'SUSPENDED');
CREATE TYPE keusahawanan_business_status AS ENUM ('PENDING_INTERVIEW', 'ACTIVE', 'REJECTED');
CREATE TYPE keusahawanan_membership_role AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE keusahawanan_membership_status AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');
CREATE TYPE polymart_ad_status AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');
CREATE TYPE polymart_ad_type AS ENUM ('INTERNAL', 'EXTERNAL');
CREATE TYPE pos_discount_type AS ENUM ('FIXED', 'PERCENT');
CREATE TYPE pos_log_action AS ENUM (
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
);
CREATE TYPE pos_payment_method AS ENUM ('CASH', 'QR', 'TRANSFER');
CREATE TYPE pos_transaction_status AS ENUM ('COMPLETED', 'VOIDED');
CREATE TYPE program_status AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'CONFIRMED',
    'IN_PROGRESS',
    'PENDING_POSTMORTEM',
    'COMPLETED',
    'ARCHIVED',
    'REQUEST_UNLOCK'
);
CREATE TYPE polytask_job_status AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED');
CREATE TYPE polytask_bid_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- =============================================================================

-- 2. TABLE DEFINITIONS (Topologically Ordered)

-- Table: clubs
CREATE TABLE public.clubs (
id UUID NOT NULL DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
short_name TEXT NOT NULL,
description TEXT NULL,
logo_url TEXT NULL,
theme_color TEXT NULL DEFAULT '#8B1A1A',
president_id UUID NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
category TEXT NULL,
is_active BOOLEAN NULL DEFAULT true,
    CONSTRAINT pk_clubs PRIMARY KEY (id)
);

-- Table: profiles
CREATE TABLE public.profiles (
id UUID NOT NULL,
email TEXT NOT NULL,
full_name TEXT NULL,
role TEXT NULL DEFAULT 'CLUB_MEMBER',
club_id UUID NULL,
account_status TEXT NULL DEFAULT 'PENDING',
created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
avatar_url TEXT NULL,
merit INTEGER NULL DEFAULT 0,
department TEXT NULL,
matric_no TEXT NULL,
ai_daily_usage INTEGER NULL DEFAULT 0,
ai_last_reset TIMESTAMPTZ NULL DEFAULT now(),
ai_status TEXT NULL DEFAULT 'active',
subscription_tier TEXT NULL DEFAULT 'free',
ai_token_balance INTEGER NULL,
ai_token_last_reset TIMESTAMPTZ NULL DEFAULT now(),
ai_tier_expiration TIMESTAMPTZ NULL,
jpp_position TEXT NULL,
jpp_unit TEXT NULL,
phone TEXT NULL,
jabatan TEXT NULL,
merit_kelab INTEGER NOT NULL DEFAULT 0,
merit_akademik INTEGER NOT NULL DEFAULT 0,
merit_asrama INTEGER NOT NULL DEFAULT 0,
programme_code TEXT NULL,
intake_year SMALLINT NULL,
intake_period SMALLINT NULL,
semester_override SMALLINT NULL,
    CONSTRAINT pk_profiles PRIMARY KEY (id),
    CONSTRAINT profiles_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE
);

-- Table: ai_tier_requests
CREATE TABLE public.ai_tier_requests (
id UUID NOT NULL DEFAULT gen_random_uuid(),
user_id UUID NULL,
current_tier TEXT NOT NULL,
requested_tier TEXT NOT NULL,
reason TEXT NOT NULL,
status TEXT NOT NULL DEFAULT 'PENDING',
admin_notes TEXT NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
updated_at TIMESTAMPTZ NULL DEFAULT now(),
receipt_url TEXT NULL,
    CONSTRAINT pk_ai_tier_requests PRIMARY KEY (id),
    CONSTRAINT ai_tier_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: ai_usage_logs
CREATE TABLE public.ai_usage_logs (
id UUID NOT NULL DEFAULT gen_random_uuid(),
user_id UUID NULL,
task_name TEXT NOT NULL,
token_cost INTEGER NOT NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_ai_usage_logs PRIMARY KEY (id),
    CONSTRAINT ai_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: akademik_cgpa_records
CREATE TABLE public.akademik_cgpa_records (
id UUID NOT NULL DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
semester INTEGER NULL,
tahun TEXT NULL,
hpnm NUMERIC NULL,
pnm NUMERIC NULL,
drive_file_id TEXT NULL,
drive_view_url TEXT NULL,
scan_raw TEXT NULL,
is_user_verified BOOLEAN NULL DEFAULT false,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_akademik_cgpa_records PRIMARY KEY (id),
    CONSTRAINT akademik_cgpa_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: akademik_folders
CREATE TABLE public.akademik_folders (
id UUID NOT NULL DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
description TEXT NULL,
parent_id UUID NULL,
created_by UUID NULL,
is_public BOOLEAN NULL DEFAULT true,
sort_order INTEGER NULL DEFAULT 0,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_akademik_folders PRIMARY KEY (id),
    CONSTRAINT akademik_folders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT akademik_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.akademik_folders(id) ON DELETE CASCADE
);

-- Table: akademik_files
CREATE TABLE public.akademik_files (
id UUID NOT NULL DEFAULT gen_random_uuid(),
folder_id UUID NULL,
uploaded_by UUID NULL,
owner_user_id UUID NULL,
name TEXT NOT NULL,
description TEXT NULL,
drive_file_id TEXT NULL,
drive_view_url TEXT NULL,
drive_download_url TEXT NULL,
file_size_bytes BIGINT NULL,
file_type TEXT NULL,
download_count INTEGER NULL DEFAULT 0,
is_personal BOOLEAN NULL DEFAULT false,
created_at TIMESTAMPTZ NULL DEFAULT now(),
file_name TEXT NULL,
file_size BIGINT NULL,
    CONSTRAINT pk_akademik_files PRIMARY KEY (id),
    CONSTRAINT akademik_files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.akademik_folders(id) ON DELETE CASCADE,
    CONSTRAINT akademik_files_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT akademik_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Table: akademik_merit_config
CREATE TABLE public.akademik_merit_config (
id UUID NOT NULL DEFAULT gen_random_uuid(),
jenis TEXT NOT NULL,
peringkat TEXT NOT NULL,
merit_value INTEGER NOT NULL DEFAULT 0,
updated_by UUID NULL,
updated_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_akademik_merit_config PRIMARY KEY (id),
    CONSTRAINT akademik_merit_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: akademik_sijil_categories
CREATE TABLE public.akademik_sijil_categories (
id UUID NOT NULL DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
icon TEXT NULL DEFAULT '≡ƒÅå',
color TEXT NULL DEFAULT '#6366f1',
sort_order INTEGER NULL DEFAULT 0,
is_active BOOLEAN NULL DEFAULT true,
created_by UUID NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_akademik_sijil_categories PRIMARY KEY (id),
    CONSTRAINT akademik_sijil_categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Table: akademik_pencapaian
CREATE TABLE public.akademik_pencapaian (
id UUID NOT NULL DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
category_id UUID NULL,
jenis TEXT NOT NULL,
peringkat TEXT NOT NULL,
nama_pencapaian TEXT NOT NULL,
penganjur TEXT NULL,
tarikh DATE NULL,
drive_file_id TEXT NULL,
drive_view_url TEXT NULL,
drive_download_url TEXT NULL,
merit_auto INTEGER NULL DEFAULT 0,
merit_override INTEGER NULL,
status TEXT NULL DEFAULT 'MENUNGGU',
verified_by UUID NULL,
verified_at TIMESTAMPTZ NULL,
rejection_reason TEXT NULL,
notes TEXT NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_akademik_pencapaian PRIMARY KEY (id),
    CONSTRAINT akademik_pencapaian_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.akademik_sijil_categories(id) ON DELETE CASCADE,
    CONSTRAINT akademik_pencapaian_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT akademik_pencapaian_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: akademik_qr_tokens
CREATE TABLE public.akademik_qr_tokens (
id UUID NOT NULL DEFAULT gen_random_uuid(),
token UUID NULL DEFAULT gen_random_uuid(),
title TEXT NOT NULL,
description TEXT NULL,
merit_value INTEGER NOT NULL DEFAULT 2,
category TEXT NULL DEFAULT 'KEHADIRAN',
source_unit TEXT NULL DEFAULT 'KK',
cooldown_hours INTEGER NULL DEFAULT 8,
expires_at TIMESTAMPTZ NULL,
max_scans_total INTEGER NULL,
current_scans_total INTEGER NULL DEFAULT 0,
is_active BOOLEAN NULL DEFAULT true,
created_by UUID NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
available_from TIME NULL,
available_until TIME NULL,
time_zone TEXT NULL DEFAULT 'Asia/Kuala_Lumpur',
    CONSTRAINT pk_akademik_qr_tokens PRIMARY KEY (id),
    CONSTRAINT akademik_qr_tokens_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Table: akademik_qr_scans
CREATE TABLE public.akademik_qr_scans (
id UUID NOT NULL DEFAULT gen_random_uuid(),
token_id UUID NOT NULL,
user_id UUID NOT NULL,
merit_awarded INTEGER NOT NULL,
scanned_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_akademik_qr_scans PRIMARY KEY (id),
    CONSTRAINT akademik_qr_scans_token_id_fkey FOREIGN KEY (token_id) REFERENCES public.akademik_qr_tokens(id) ON DELETE CASCADE,
    CONSTRAINT akademik_qr_scans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: akademik_unlock_requests
CREATE TABLE public.akademik_unlock_requests (
id UUID NOT NULL DEFAULT gen_random_uuid(),
pencapaian_id UUID NOT NULL,
user_id UUID NOT NULL,
reason TEXT NOT NULL,
status TEXT NOT NULL DEFAULT 'MENUNGGU',
reviewed_by UUID NULL,
reviewed_at TIMESTAMPTZ NULL,
reviewer_note TEXT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
unlocked_until TIMESTAMPTZ NULL,
    CONSTRAINT pk_akademik_unlock_requests PRIMARY KEY (id),
    CONSTRAINT akademik_unlock_requests_pencapaian_id_fkey FOREIGN KEY (pencapaian_id) REFERENCES public.akademik_pencapaian(id) ON DELETE CASCADE,
    CONSTRAINT akademik_unlock_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT akademik_unlock_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: asrama_recommendations
CREATE TABLE public.asrama_recommendations (
user_id UUID NOT NULL,
session TEXT NOT NULL DEFAULT '2025/2026',
notes TEXT NULL,
marked_by UUID NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_asrama_recommendations PRIMARY KEY (user_id, session),
    CONSTRAINT asrama_recommendations_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT asrama_recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: asrama_unit_admins
CREATE TABLE public.asrama_unit_admins (
id UUID NOT NULL DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
assigned_by UUID NULL,
notes TEXT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_asrama_unit_admins PRIMARY KEY (id),
    CONSTRAINT asrama_unit_admins_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT asrama_unit_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: keusahawanan_categories
CREATE TABLE public.keusahawanan_categories (
id UUID NOT NULL DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
is_active BOOLEAN NULL DEFAULT true,
created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT pk_keusahawanan_categories PRIMARY KEY (id)
);

-- Table: keusahawanan_businesses
CREATE TABLE public.keusahawanan_businesses (
id UUID NOT NULL DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
description TEXT NULL,
category_id UUID NULL,
owner_id UUID NOT NULL,
status keusahawanan_business_status NOT NULL DEFAULT 'PENDING_INTERVIEW',
interview_date TIMESTAMPTZ NULL,
logo_url TEXT NULL,
is_active BOOLEAN NULL DEFAULT true,
created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
promotions_enabled BOOLEAN NOT NULL DEFAULT false,
cash_session_enabled BOOLEAN NOT NULL DEFAULT false,
is_shift_enabled BOOLEAN NULL DEFAULT false,
polymart_contact_method TEXT NULL DEFAULT 'inapp',
polymart_is_active BOOLEAN NULL DEFAULT false,
    CONSTRAINT pk_keusahawanan_businesses PRIMARY KEY (id),
    CONSTRAINT keusahawanan_businesses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.keusahawanan_categories(id) ON DELETE CASCADE,
    CONSTRAINT keusahawanan_businesses_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: business_cash_checkpoints
CREATE TABLE public.business_cash_checkpoints (
id UUID NOT NULL DEFAULT gen_random_uuid(),
business_id UUID NOT NULL,
label TEXT NOT NULL DEFAULT 'Semak Baldi',
cash_amount NUMERIC NOT NULL,
note TEXT NULL,
recorded_by UUID NULL,
checkpoint_time TIMESTAMPTZ NOT NULL DEFAULT now(),
checkpoint_date DATE NOT NULL DEFAULT CURRENT_DATE,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_business_cash_checkpoints PRIMARY KEY (id),
    CONSTRAINT business_cash_checkpoints_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE,
    CONSTRAINT business_cash_checkpoints_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: business_expenses
CREATE TABLE public.business_expenses (
id UUID NOT NULL DEFAULT gen_random_uuid(),
business_id UUID NOT NULL,
amount NUMERIC NOT NULL,
category TEXT NOT NULL DEFAULT 'Lain-lain',
description TEXT NOT NULL,
expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
recorded_by UUID NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_business_expenses PRIMARY KEY (id),
    CONSTRAINT business_expenses_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE,
    CONSTRAINT business_expenses_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: business_pos_assignments
CREATE TABLE public.business_pos_assignments (
id UUID NOT NULL DEFAULT gen_random_uuid(),
business_id UUID NOT NULL,
user_id UUID NOT NULL,
assigned_by UUID NULL,
valid_date DATE NOT NULL DEFAULT CURRENT_DATE,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_business_pos_assignments PRIMARY KEY (id),
    CONSTRAINT business_pos_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT business_pos_assignments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE,
    CONSTRAINT business_pos_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: business_promotions
CREATE TABLE public.business_promotions (
id UUID NOT NULL DEFAULT gen_random_uuid(),
business_id UUID NOT NULL,
code TEXT NOT NULL,
name TEXT NOT NULL,
discount_type TEXT NOT NULL,
discount_value NUMERIC NOT NULL,
min_purchase NUMERIC NOT NULL DEFAULT 0,
max_uses INTEGER NULL,
uses_count INTEGER NOT NULL DEFAULT 0,
valid_from DATE NULL,
valid_until DATE NULL,
is_active BOOLEAN NOT NULL DEFAULT true,
created_by UUID NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_business_promotions PRIMARY KEY (id),
    CONSTRAINT business_promotions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE,
    CONSTRAINT business_promotions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Table: business_transactions
CREATE TABLE public.business_transactions (
id UUID NOT NULL DEFAULT gen_random_uuid(),
business_id UUID NOT NULL,
invoice_number TEXT NOT NULL,
items JSONB NOT NULL,
subtotal NUMERIC NOT NULL DEFAULT 0,
discount_type pos_discount_type NULL,
discount_amount NUMERIC NOT NULL DEFAULT 0,
discount_note TEXT NULL,
total_amount NUMERIC NOT NULL DEFAULT 0,
payment_method pos_payment_method NOT NULL DEFAULT 'CASH',
received_amount NUMERIC NULL,
change_amount NUMERIC NULL,
customer_name TEXT NULL,
customer_note TEXT NULL,
served_by UUID NULL,
status pos_transaction_status NOT NULL DEFAULT 'COMPLETED',
voided_by UUID NULL,
voided_at TIMESTAMPTZ NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
promotion_id UUID NULL,
promotion_code TEXT NULL,
    CONSTRAINT pk_business_transactions PRIMARY KEY (id),
    CONSTRAINT business_transactions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE,
    CONSTRAINT business_transactions_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.business_promotions(id) ON DELETE CASCADE,
    CONSTRAINT business_transactions_served_by_fkey FOREIGN KEY (served_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT business_transactions_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Table: business_pos_logs
CREATE TABLE public.business_pos_logs (
id UUID NOT NULL DEFAULT gen_random_uuid(),
business_id UUID NOT NULL,
transaction_id UUID NULL,
actor_id UUID NULL,
actor_name TEXT NULL,
action_type TEXT NOT NULL,
description TEXT NULL,
metadata JSONB NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_business_pos_logs PRIMARY KEY (id),
    CONSTRAINT business_pos_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT business_pos_logs_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE,
    CONSTRAINT business_pos_logs_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.business_transactions(id) ON DELETE CASCADE
);

-- Table: business_products
CREATE TABLE public.business_products (
id UUID NOT NULL DEFAULT gen_random_uuid(),
business_id UUID NOT NULL,
name TEXT NOT NULL,
description TEXT NULL,
price NUMERIC NOT NULL DEFAULT 0,
category TEXT NULL DEFAULT 'Umum',
stock_quantity INTEGER NOT NULL DEFAULT 0,
stock_alert_threshold INTEGER NOT NULL DEFAULT 5,
image_url TEXT NULL,
is_available BOOLEAN NOT NULL DEFAULT true,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
cost_items JSONB NULL,
total_cost NUMERIC NULL DEFAULT 0,
cost_notes TEXT NULL,
publish_to_polymart BOOLEAN NULL DEFAULT false,
polymart_location TEXT NULL,
polymart_pickup_info TEXT NULL,
polymart_published_at TIMESTAMPTZ NULL,
reserved_stock INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT pk_business_products PRIMARY KEY (id),
    CONSTRAINT business_products_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE
);

-- Table: business_sessions
CREATE TABLE public.business_sessions (
id UUID NOT NULL DEFAULT gen_random_uuid(),
business_id UUID NULL,
session_date DATE NOT NULL,
opened_by UUID NULL,
closed_by UUID NULL,
opening_cash NUMERIC NOT NULL DEFAULT 0,
closing_cash NUMERIC NULL,
total_sales NUMERIC NULL,
total_expenses NUMERIC NULL DEFAULT 0,
net_profit NUMERIC NULL,
opening_time TIMESTAMPTZ NULL,
closing_time TIMESTAMPTZ NULL,
opening_notes TEXT NULL,
closing_notes TEXT NULL,
status TEXT NULL DEFAULT 'OPEN',
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_business_sessions PRIMARY KEY (id),
    CONSTRAINT business_sessions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE,
    CONSTRAINT business_sessions_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT business_sessions_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Table: business_shifts
CREATE TABLE public.business_shifts (
id UUID NOT NULL DEFAULT gen_random_uuid(),
business_id UUID NULL,
shift_date DATE NOT NULL,
shift_hour INTEGER NOT NULL,
assigned_to UUID NULL,
created_by UUID NULL,
notes TEXT NULL,
status TEXT NULL DEFAULT 'SCHEDULED',
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_business_shifts PRIMARY KEY (id),
    CONSTRAINT business_shifts_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT business_shifts_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE,
    CONSTRAINT business_shifts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Table: business_shift_swaps
CREATE TABLE public.business_shift_swaps (
id UUID NOT NULL DEFAULT gen_random_uuid(),
business_id UUID NULL,
shift_id UUID NULL,
requested_by UUID NULL,
swap_with UUID NULL,
reason TEXT NOT NULL,
status TEXT NULL DEFAULT 'PENDING',
responded_by UUID NULL,
responded_at TIMESTAMPTZ NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_business_shift_swaps PRIMARY KEY (id),
    CONSTRAINT business_shift_swaps_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE,
    CONSTRAINT business_shift_swaps_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT business_shift_swaps_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT business_shift_swaps_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.business_shifts(id) ON DELETE CASCADE,
    CONSTRAINT business_shift_swaps_swap_with_fkey FOREIGN KEY (swap_with) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: club_activities
CREATE TABLE public.club_activities (
id UUID NOT NULL DEFAULT gen_random_uuid(),
club_id UUID NULL,
title TEXT NOT NULL,
description TEXT NULL,
status TEXT NULL DEFAULT 'perancangan',
priority TEXT NULL DEFAULT 'sederhana',
location TEXT NULL,
start_date DATE NULL,
end_date DATE NULL,
budget NUMERIC NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
tindakan TEXT NULL,
image_urls TEXT[] NULL,
user_id UUID NULL,
is_archived BOOLEAN NULL DEFAULT false,
exco_unit TEXT NULL,
    CONSTRAINT pk_club_activities PRIMARY KEY (id),
    CONSTRAINT club_activities_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE,
    CONSTRAINT club_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: club_announcements
CREATE TABLE public.club_announcements (
id UUID NOT NULL DEFAULT 'extensions.uuid_generate_v4()',
club_id UUID NULL,
content TEXT NOT NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_club_announcements PRIMARY KEY (id),
    CONSTRAINT club_announcements_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE
);

-- Table: club_committee
CREATE TABLE public.club_committee (
id UUID NOT NULL DEFAULT gen_random_uuid(),
club_id UUID NULL,
category TEXT NULL,
position_title TEXT NOT NULL,
full_name TEXT NOT NULL,
student_id TEXT NULL,
image_url TEXT NULL,
order_index INTEGER NULL DEFAULT 0,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_club_committee PRIMARY KEY (id),
    CONSTRAINT club_committee_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE
);

-- Table: club_logs
CREATE TABLE public.club_logs (
id UUID NOT NULL DEFAULT 'extensions.uuid_generate_v4()',
club_id UUID NULL,
actor_id UUID NULL,
actor_name TEXT NULL,
action_type TEXT NULL,
description TEXT NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
metadata JSONB NULL,
    CONSTRAINT pk_club_logs PRIMARY KEY (id),
    CONSTRAINT club_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT club_logs_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE
);

-- Table: club_members
CREATE TABLE public.club_members (
id UUID NOT NULL DEFAULT gen_random_uuid(),
club_id UUID NULL,
name TEXT NOT NULL,
matrix_no TEXT NOT NULL,
position TEXT NOT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT pk_club_members PRIMARY KEY (id),
    CONSTRAINT club_members_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE
);

-- Table: club_reports
CREATE TABLE public.club_reports (
id UUID NOT NULL DEFAULT gen_random_uuid(),
club_id UUID NULL,
submitted_by UUID NULL,
report_type TEXT NOT NULL,
file_url TEXT NOT NULL,
file_name TEXT NOT NULL,
status TEXT NOT NULL DEFAULT 'Menunggu',
admin_feedback TEXT NULL,
reviewed_by UUID NULL,
reviewed_at TIMESTAMPTZ NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
marked_file_url TEXT NULL,
title TEXT NULL,
is_archived BOOLEAN NULL DEFAULT false,
exco_unit TEXT NULL,
    CONSTRAINT pk_club_reports PRIMARY KEY (id),
    CONSTRAINT club_reports_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE,
    CONSTRAINT club_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT club_reports_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: club_tasks
CREATE TABLE public.club_tasks (
id UUID NOT NULL DEFAULT 'extensions.uuid_generate_v4()',
club_id UUID NULL,
title TEXT NOT NULL,
description TEXT NULL,
assigned_to UUID NULL,
due_date TIMESTAMPTZ NULL,
created_by UUID NULL,
status TEXT NULL DEFAULT 'PENDING_APPROVAL',
approval_status TEXT NULL DEFAULT 'WAITING',
approved_by UUID NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
rejection_reason TEXT NULL,
rejected_at TIMESTAMPTZ NULL,
is_archived BOOLEAN NULL DEFAULT false,
merit_points INTEGER NULL DEFAULT 0,
    CONSTRAINT pk_club_tasks PRIMARY KEY (id),
    CONSTRAINT club_tasks_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT club_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT club_tasks_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE,
    CONSTRAINT club_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Table: jpp_exco_units
CREATE TABLE public.jpp_exco_units (
id UUID NOT NULL DEFAULT gen_random_uuid(),
code TEXT NOT NULL,
name TEXT NOT NULL,
short_name TEXT NOT NULL,
color TEXT NOT NULL DEFAULT '#6366f1',
is_active BOOLEAN NOT NULL DEFAULT true,
sort_order INTEGER NOT NULL DEFAULT 0,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_jpp_exco_units PRIMARY KEY (id)
);

-- Table: jpp_mt_assignments
CREATE TABLE public.jpp_mt_assignments (
id UUID NOT NULL DEFAULT gen_random_uuid(),
mt_user_id UUID NOT NULL,
unit TEXT NOT NULL,
assigned_by UUID NULL,
assigned_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_jpp_mt_assignments PRIMARY KEY (id),
    CONSTRAINT jpp_mt_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT jpp_mt_assignments_mt_user_id_fkey FOREIGN KEY (mt_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: kamsis_applications (Manual definition)
CREATE TABLE IF NOT EXISTS public.kamsis_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session TEXT NOT NULL,
    semester TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    extra_data JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: kamsis_dynamic_fields (Manual definition)
CREATE TABLE IF NOT EXISTS public.kamsis_dynamic_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_key TEXT NOT NULL UNIQUE,
    field_type TEXT NOT NULL,
    label TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    options JSONB DEFAULT '[]'::jsonb,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: karnival_editions
CREATE TABLE public.karnival_editions (
id UUID NOT NULL DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
tagline TEXT NULL,
edition_year INTEGER NOT NULL,
start_date DATE NULL,
end_date DATE NULL,
is_active BOOLEAN NOT NULL DEFAULT false,
voting_enabled BOOLEAN NOT NULL DEFAULT false,
results_published BOOLEAN NOT NULL DEFAULT false,
cover_image_url TEXT NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
updated_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_karnival_editions PRIMARY KEY (id)
);

-- Table: karnival_categories
CREATE TABLE public.karnival_categories (
id UUID NOT NULL DEFAULT gen_random_uuid(),
edition_id UUID NOT NULL,
name TEXT NOT NULL,
description TEXT NULL,
icon_emoji TEXT NULL DEFAULT '≡ƒÅå',
max_votes INTEGER NOT NULL DEFAULT 1,
sort_order INTEGER NULL DEFAULT 0,
is_active BOOLEAN NOT NULL DEFAULT true,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_karnival_categories PRIMARY KEY (id),
    CONSTRAINT karnival_categories_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.karnival_editions(id) ON DELETE CASCADE
);

-- Table: karnival_booths
CREATE TABLE public.karnival_booths (
id UUID NOT NULL DEFAULT gen_random_uuid(),
edition_id UUID NOT NULL,
category_id UUID NOT NULL,
kelab_id TEXT NULL,
kelab_name TEXT NOT NULL,
booth_number TEXT NULL,
theme TEXT NULL,
description TEXT NULL,
image_url TEXT NULL,
is_active BOOLEAN NOT NULL DEFAULT true,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_karnival_booths PRIMARY KEY (id),
    CONSTRAINT karnival_booths_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.karnival_categories(id) ON DELETE CASCADE,
    CONSTRAINT karnival_booths_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.karnival_editions(id) ON DELETE CASCADE
);

-- Table: karnival_votes_v2
CREATE TABLE public.karnival_votes_v2 (
id UUID NOT NULL DEFAULT gen_random_uuid(),
edition_id UUID NOT NULL,
category_id UUID NOT NULL,
booth_id UUID NOT NULL,
voter_id UUID NOT NULL,
matric_no TEXT NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_karnival_votes_v2 PRIMARY KEY (id),
    CONSTRAINT karnival_votes_v2_booth_id_fkey FOREIGN KEY (booth_id) REFERENCES public.karnival_booths(id) ON DELETE CASCADE,
    CONSTRAINT karnival_votes_v2_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.karnival_categories(id) ON DELETE CASCADE,
    CONSTRAINT karnival_votes_v2_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.karnival_editions(id) ON DELETE CASCADE,
    CONSTRAINT karnival_votes_v2_voter_id_fkey FOREIGN KEY (voter_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: kebajikan_tickets
CREATE TABLE public.kebajikan_tickets (
id UUID NOT NULL DEFAULT gen_random_uuid(),
ticket_no TEXT NOT NULL,
submitter_id UUID NULL,
full_name TEXT NOT NULL,
gender TEXT NULL,
matric_no TEXT NULL,
phone TEXT NULL,
class TEXT NULL,
category TEXT NOT NULL,
title TEXT NOT NULL,
description TEXT NOT NULL,
form_data JSONB NOT NULL,
image_urls TEXT[] NULL,
status TEXT NOT NULL DEFAULT 'NEW',
assigned_to UUID NULL,
delegated_to UUID NULL,
delegation_note TEXT NULL,
priority TEXT NOT NULL DEFAULT 'NORMAL',
tags TEXT[] NULL,
warning_sent_at TIMESTAMPTZ NULL,
escalated_at TIMESTAMPTZ NULL,
sla_deadline TIMESTAMPTZ NULL,
reopen_count INTEGER NOT NULL DEFAULT 0,
reopen_reason TEXT NULL,
reopen_requested_at TIMESTAMPTZ NULL,
reopen_approved_by UUID NULL,
cancelled_at TIMESTAMPTZ NULL,
cancel_reason TEXT NULL,
resolved_at TIMESTAMPTZ NULL,
resolved_by UUID NULL,
resolution_note TEXT NOT NULL DEFAULT '',
rating INTEGER NULL,
rating_comment TEXT NULL,
rating_at TIMESTAMPTZ NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
handled_by_unit TEXT NOT NULL DEFAULT 'KEBAJIKAN',
    CONSTRAINT pk_kebajikan_tickets PRIMARY KEY (id),
    CONSTRAINT kebajikan_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT kebajikan_tickets_delegated_to_fkey FOREIGN KEY (delegated_to) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT kebajikan_tickets_reopen_approved_by_fkey FOREIGN KEY (reopen_approved_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT kebajikan_tickets_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT kebajikan_tickets_submitter_id_fkey FOREIGN KEY (submitter_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: kebajikan_pics
CREATE TABLE public.kebajikan_pics (
id UUID NOT NULL DEFAULT gen_random_uuid(),
category TEXT NOT NULL,
jabatan_key TEXT NULL,
jabatan_label TEXT NOT NULL,
pic_name TEXT NOT NULL,
pic_title TEXT NULL,
pic_email TEXT NULL,
pic_phone TEXT NULL,
pic_user_id UUID NULL,
is_active BOOLEAN NOT NULL DEFAULT true,
created_by UUID NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_kebajikan_pics PRIMARY KEY (id),
    CONSTRAINT kebajikan_pics_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT kebajikan_pics_pic_user_id_fkey FOREIGN KEY (pic_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: kebajikan_escalation_actions
CREATE TABLE public.kebajikan_escalation_actions (
id UUID NOT NULL DEFAULT gen_random_uuid(),
ticket_id UUID NOT NULL,
pic_id UUID NULL,
pic_name_manual TEXT NULL,
action_summary TEXT NOT NULL,
recorded_by UUID NULL,
recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_kebajikan_escalation_actions PRIMARY KEY (id),
    CONSTRAINT kebajikan_escalation_actions_pic_id_fkey FOREIGN KEY (pic_id) REFERENCES public.kebajikan_pics(id) ON DELETE CASCADE,
    CONSTRAINT kebajikan_escalation_actions_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT kebajikan_escalation_actions_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.kebajikan_tickets(id) ON DELETE CASCADE
);

-- Table: kebajikan_notifications
CREATE TABLE public.kebajikan_notifications (
id UUID NOT NULL DEFAULT gen_random_uuid(),
ticket_id UUID NOT NULL,
target_user_id UUID NULL,
target_role TEXT NULL,
title TEXT NOT NULL,
body TEXT NOT NULL,
type TEXT NOT NULL,
is_read BOOLEAN NOT NULL DEFAULT false,
read_at TIMESTAMPTZ NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_kebajikan_notifications PRIMARY KEY (id),
    CONSTRAINT kebajikan_notifications_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT kebajikan_notifications_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.kebajikan_tickets(id) ON DELETE CASCADE
);

-- Table: kebajikan_settings
CREATE TABLE public.kebajikan_settings (
id UUID NOT NULL DEFAULT gen_random_uuid(),
sla_warning_hours INTEGER NOT NULL DEFAULT 48,
sla_escalate_hours INTEGER NOT NULL DEFAULT 72,
email_new_ticket BOOLEAN NOT NULL DEFAULT true,
email_warning BOOLEAN NOT NULL DEFAULT true,
email_escalation BOOLEAN NOT NULL DEFAULT true,
email_reopen BOOLEAN NOT NULL DEFAULT true,
auto_reply_message TEXT NOT NULL DEFAULT 'Terima kasih atas aduan anda. No. Tiket anda ialah {ticket_no}. Exco Kebajikan akan menghubungi anda dalam masa yang singkat. Terima kasih.',
updated_by UUID NULL,
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
data_retention_months INTEGER NOT NULL DEFAULT 6,
    CONSTRAINT pk_kebajikan_settings PRIMARY KEY (id),
    CONSTRAINT kebajikan_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: kebajikan_staff_assignments
CREATE TABLE public.kebajikan_staff_assignments (
id UUID NOT NULL DEFAULT gen_random_uuid(),
staff_user_id UUID NOT NULL,
assigned_by UUID NULL,
role TEXT NOT NULL DEFAULT 'STAFF',
is_active BOOLEAN NOT NULL DEFAULT true,
note TEXT NULL,
assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_kebajikan_staff_assignments PRIMARY KEY (id),
    CONSTRAINT kebajikan_staff_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT kebajikan_staff_assignments_staff_user_id_fkey FOREIGN KEY (staff_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: kebajikan_tags
CREATE TABLE public.kebajikan_tags (
id UUID NOT NULL DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
color TEXT NOT NULL,
created_by UUID NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_kebajikan_tags PRIMARY KEY (id),
    CONSTRAINT kebajikan_tags_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Table: kebajikan_ticket_comments
CREATE TABLE public.kebajikan_ticket_comments (
id UUID NOT NULL DEFAULT gen_random_uuid(),
ticket_id UUID NOT NULL,
author_id UUID NULL,
author_name TEXT NOT NULL,
author_role TEXT NOT NULL DEFAULT 'PELAJAR',
is_internal BOOLEAN NOT NULL DEFAULT false,
is_delegation_note BOOLEAN NOT NULL DEFAULT false,
content TEXT NOT NULL,
attachments TEXT[] NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_kebajikan_ticket_comments PRIMARY KEY (id),
    CONSTRAINT kebajikan_ticket_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT kebajikan_ticket_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.kebajikan_tickets(id) ON DELETE CASCADE
);

-- Table: kebajikan_ticket_status_log
CREATE TABLE public.kebajikan_ticket_status_log (
id UUID NOT NULL DEFAULT gen_random_uuid(),
ticket_id UUID NOT NULL,
actor_id UUID NULL,
actor_name TEXT NULL,
actor_role TEXT NULL,
old_status TEXT NULL,
new_status TEXT NOT NULL,
note TEXT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_kebajikan_ticket_status_log PRIMARY KEY (id),
    CONSTRAINT kebajikan_ticket_status_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT kebajikan_ticket_status_log_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.kebajikan_tickets(id) ON DELETE CASCADE
);

-- Table: keusahawanan_logs
CREATE TABLE public.keusahawanan_logs (
id UUID NOT NULL DEFAULT gen_random_uuid(),
action_type TEXT NOT NULL,
description TEXT NULL,
business_id UUID NULL,
actor_id UUID NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_keusahawanan_logs PRIMARY KEY (id),
    CONSTRAINT keusahawanan_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT keusahawanan_logs_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE
);

-- Table: keusahawanan_programs
CREATE TABLE public.keusahawanan_programs (
id UUID NOT NULL DEFAULT gen_random_uuid(),
title TEXT NOT NULL,
description TEXT NULL,
icon TEXT NULL DEFAULT '≡ƒôî',
image_url TEXT NULL,
status TEXT NULL DEFAULT 'upcoming',
date_label TEXT NULL,
venue TEXT NULL,
tags TEXT[] NULL,
max_participants INTEGER NULL DEFAULT 0,
participants_count INTEGER NULL DEFAULT 0,
visibility TEXT NULL DEFAULT 'AWAM',
created_by UUID NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
updated_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_keusahawanan_programs PRIMARY KEY (id)
);

-- Table: keusahawanan_program_registrations
CREATE TABLE public.keusahawanan_program_registrations (
id UUID NOT NULL DEFAULT gen_random_uuid(),
program_id UUID NOT NULL,
user_id UUID NOT NULL,
registered_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_keusahawanan_program_registrations PRIMARY KEY (id),
    CONSTRAINT keusahawanan_program_registrations_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.keusahawanan_programs(id) ON DELETE CASCADE
);

-- Table: keusahawanan_unit_admins
CREATE TABLE public.keusahawanan_unit_admins (
id UUID NOT NULL DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
assigned_by UUID NULL,
notes TEXT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_keusahawanan_unit_admins PRIMARY KEY (id),
    CONSTRAINT keusahawanan_unit_admins_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT keusahawanan_unit_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: klk_form_fields (Manual definition)
CREATE TABLE IF NOT EXISTS public.klk_form_fields (
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
);

-- Table: klk_kawasan (Manual definition)
CREATE TABLE IF NOT EXISTS public.klk_kawasan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: klk_settings (Manual definition)
CREATE TABLE IF NOT EXISTS public.klk_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: klk_student_residency (Manual definition)
CREATE TABLE IF NOT EXISTS public.klk_student_residency (
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
);

-- Table: klk_sync_log (Manual definition)
CREATE TABLE IF NOT EXISTS public.klk_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    synced_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_rows INTEGER DEFAULT 0,
    success INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    error_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: merit_program_applications (Manual definition)
CREATE TABLE IF NOT EXISTS public.merit_program_applications (
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
);

-- Table: merit_review_log (Manual definition)
CREATE TABLE IF NOT EXISTS public.merit_review_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.merit_program_applications(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_unit TEXT NOT NULL CHECK (reviewer_unit IN ('AKADEMIK','KEDIAMAN')),
    action TEXT NOT NULL CHECK (action IN ('vouched','not_vouched','approved','rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: merit_transactions
CREATE TABLE public.merit_transactions (
id UUID NOT NULL DEFAULT 'extensions.uuid_generate_v4()',
user_id UUID NULL,
club_id UUID NULL,
points INTEGER NULL,
reason TEXT NULL,
actor_name TEXT NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
source TEXT NULL DEFAULT 'KELAB',
reference_id UUID NULL,
    CONSTRAINT pk_merit_transactions PRIMARY KEY (id),
    CONSTRAINT merit_transactions_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE,
    CONSTRAINT merit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: notifications
CREATE TABLE public.notifications (
id UUID NOT NULL DEFAULT 'extensions.uuid_generate_v4()',
user_id UUID NULL,
title TEXT NULL,
message TEXT NULL,
type TEXT NULL,
is_read BOOLEAN NULL DEFAULT false,
created_at TIMESTAMPTZ NULL DEFAULT now(),
module TEXT NOT NULL DEFAULT 'EKPP',
link TEXT NULL,
actor_name TEXT NULL,
reference_id TEXT NULL,
target_role TEXT NULL,
    CONSTRAINT pk_notifications PRIMARY KEY (id),
    CONSTRAINT kebajikan_notifications_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT kebajikan_notifications_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.kebajikan_tickets(id) ON DELETE CASCADE
);

-- Table: polymart_ads
CREATE TABLE public.polymart_ads (
id UUID NOT NULL DEFAULT 'extensions.uuid_generate_v4()',
title TEXT NOT NULL,
image_url TEXT NOT NULL,
link_url TEXT NULL,
type polymart_ad_type NOT NULL DEFAULT 'INTERNAL',
status polymart_ad_status NOT NULL DEFAULT 'DRAFT',
start_date TIMESTAMPTZ NULL,
end_date TIMESTAMPTZ NULL,
clicks INTEGER NOT NULL DEFAULT 0,
created_by UUID NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_polymart_ads PRIMARY KEY (id)
);

-- Table: polymart_cart_items (Manual definition)
CREATE TABLE IF NOT EXISTS public.polymart_cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    selected_variation TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_polymart_cart_item_variation_constraint UNIQUE (buyer_id, product_id, selected_variation)
);

-- Table: polymart_orders
CREATE TABLE public.polymart_orders (
id UUID NOT NULL DEFAULT gen_random_uuid(),
product_id UUID NULL,
business_id UUID NULL,
buyer_id UUID NULL,
quantity INTEGER NOT NULL DEFAULT 1,
unit_price NUMERIC NOT NULL,
total_price NUMERIC NULL,
note TEXT NULL,
pickup_time TEXT NULL,
share_phone BOOLEAN NULL DEFAULT false,
status TEXT NULL DEFAULT 'PENDING',
confirmed_at TIMESTAMPTZ NULL,
ready_at TIMESTAMPTZ NULL,
completed_at TIMESTAMPTZ NULL,
cancelled_at TIMESTAMPTZ NULL,
cancel_reason TEXT NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
updated_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_polymart_orders PRIMARY KEY (id),
    CONSTRAINT polymart_orders_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE,
    CONSTRAINT polymart_orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT polymart_orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.business_products(id) ON DELETE CASCADE
);

-- Table: polymart_reports
CREATE TABLE public.polymart_reports (
id UUID NOT NULL DEFAULT gen_random_uuid(),
product_id UUID NULL,
reporter_id UUID NULL,
reason TEXT NOT NULL,
status TEXT NULL DEFAULT 'OPEN',
reviewed_by UUID NULL,
reviewed_at TIMESTAMPTZ NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_polymart_reports PRIMARY KEY (id),
    CONSTRAINT polymart_reports_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.business_products(id) ON DELETE CASCADE,
    CONSTRAINT polymart_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT polymart_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Table: polymart_reviews
CREATE TABLE public.polymart_reviews (
id UUID NOT NULL DEFAULT gen_random_uuid(),
product_id UUID NULL,
order_id UUID NULL,
reviewer_id UUID NULL,
rating INTEGER NOT NULL,
comment TEXT NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_polymart_reviews PRIMARY KEY (id),
    CONSTRAINT polymart_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.polymart_orders(id) ON DELETE CASCADE,
    CONSTRAINT polymart_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.business_products(id) ON DELETE CASCADE,
    CONSTRAINT polymart_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Table: portal_settings
CREATE TABLE public.portal_settings (
id UUID NOT NULL DEFAULT gen_random_uuid(),
exco_module TEXT NOT NULL,
color TEXT NOT NULL,
label TEXT NULL,
updated_by UUID NULL,
updated_at TIMESTAMPTZ NULL DEFAULT now(),
is_enabled BOOLEAN NULL DEFAULT false,
    CONSTRAINT pk_portal_settings PRIMARY KEY (id),
    CONSTRAINT portal_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: program_attendees (Manual definition)
CREATE TABLE IF NOT EXISTS public.program_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL,
    program_type TEXT NOT NULL CHECK (program_type IN ('takwim', 'aktiviti')),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pre_registered' CHECK (status IN ('pre_registered', 'registered', 'attended', 'absent')),
    attended_at TIMESTAMPTZ,
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_program_attendee UNIQUE (program_id, user_id)
);

-- Table: programs
CREATE TABLE public.programs (
id UUID NOT NULL DEFAULT gen_random_uuid(),
user_id UUID NULL,
nama_program TEXT NOT NULL,
deskripsi TEXT NULL,
tarikh_mula DATE NOT NULL,
tarikh_tamat DATE NOT NULL,
status program_status NULL DEFAULT 'DRAFT',
is_locked BOOLEAN NULL DEFAULT false,
url_kertas_kerja TEXT NULL,
url_post_mortem TEXT NULL,
version INTEGER NULL DEFAULT 1,
jpp_remarks TEXT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
location TEXT NULL,
budget NUMERIC NULL DEFAULT 0,
tindakan TEXT NULL,
objektif TEXT NULL,
image_urls TEXT[] NULL,
club_id TEXT NULL,
pengarah_program TEXT NULL,
is_archived BOOLEAN NULL DEFAULT false,
    CONSTRAINT pk_programs PRIMARY KEY (id)
);

-- Table: push_subscriptions
CREATE TABLE public.push_subscriptions (
id UUID NOT NULL DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
endpoint TEXT NOT NULL,
p256dh TEXT NOT NULL,
auth TEXT NOT NULL,
device_hint TEXT NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_push_subscriptions PRIMARY KEY (id)
);

-- Table: student_business_memberships
CREATE TABLE public.student_business_memberships (
id UUID NOT NULL DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
business_id UUID NOT NULL,
role keusahawanan_membership_role NOT NULL DEFAULT 'MEMBER',
status keusahawanan_membership_status NOT NULL DEFAULT 'PENDING',
joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT pk_student_business_memberships PRIMARY KEY (id),
    CONSTRAINT student_business_memberships_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE,
    CONSTRAINT student_business_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: student_club_memberships
CREATE TABLE public.student_club_memberships (
id UUID NOT NULL DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
club_id TEXT NOT NULL,
role TEXT NOT NULL DEFAULT 'CLUB_MEMBER',
account_status TEXT NOT NULL DEFAULT 'PENDING',
is_primary BOOLEAN NOT NULL DEFAULT false,
joined_at TIMESTAMPTZ NULL DEFAULT now(),
created_at TIMESTAMPTZ NULL DEFAULT now(),
updated_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_student_club_memberships PRIMARY KEY (id),
    CONSTRAINT student_club_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: supsas_editions
CREATE TABLE public.supsas_editions (
id UUID NOT NULL DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
tagline TEXT NULL,
edition_year INTEGER NOT NULL,
start_date DATE NULL,
end_date DATE NULL,
is_active BOOLEAN NOT NULL DEFAULT false,
logo_url TEXT NULL,
banner_url TEXT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_supsas_editions PRIMARY KEY (id)
);

-- Table: supsas_sports
CREATE TABLE public.supsas_sports (
id UUID NOT NULL DEFAULT gen_random_uuid(),
edition_id UUID NOT NULL,
name TEXT NOT NULL,
category TEXT NOT NULL DEFAULT 'team',
gender TEXT NOT NULL DEFAULT 'mixed',
format TEXT NOT NULL DEFAULT 'knockout',
icon TEXT NOT NULL DEFAULT 'Trophy',
venue TEXT NULL,
max_per_team INTEGER NOT NULL DEFAULT 11,
is_active BOOLEAN NOT NULL DEFAULT true,
sort_order INTEGER NOT NULL DEFAULT 0,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
max_groups_per_kontingen INTEGER NOT NULL DEFAULT 1,
max_players_per_group INTEGER NOT NULL DEFAULT 11,
    CONSTRAINT pk_supsas_sports PRIMARY KEY (id),
    CONSTRAINT supsas_sports_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.supsas_editions(id) ON DELETE CASCADE
);

-- Table: supsas_kontingen
CREATE TABLE public.supsas_kontingen (
id UUID NOT NULL DEFAULT gen_random_uuid(),
edition_id UUID NOT NULL,
name TEXT NOT NULL,
short_code TEXT NOT NULL,
color TEXT NOT NULL DEFAULT '#3B82F6',
logo_url TEXT NULL,
leader_id UUID NULL,
invite_code TEXT NULL,
invite_used BOOLEAN NOT NULL DEFAULT false,
is_active BOOLEAN NOT NULL DEFAULT true,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_supsas_kontingen PRIMARY KEY (id),
    CONSTRAINT supsas_kontingen_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.supsas_editions(id) ON DELETE CASCADE
);

-- Table: supsas_teams
CREATE TABLE public.supsas_teams (
id UUID NOT NULL DEFAULT gen_random_uuid(),
edition_id UUID NOT NULL,
sport_id UUID NOT NULL,
kontingen_id UUID NOT NULL,
name TEXT NOT NULL,
group_number INTEGER NOT NULL DEFAULT 1,
is_confirmed BOOLEAN NOT NULL DEFAULT false,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_supsas_teams PRIMARY KEY (id),
    CONSTRAINT supsas_teams_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.supsas_editions(id) ON DELETE CASCADE,
    CONSTRAINT supsas_teams_kontingen_id_fkey FOREIGN KEY (kontingen_id) REFERENCES public.supsas_kontingen(id) ON DELETE CASCADE,
    CONSTRAINT supsas_teams_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.supsas_sports(id) ON DELETE CASCADE
);

-- Table: supsas_fixtures
CREATE TABLE public.supsas_fixtures (
id UUID NOT NULL DEFAULT gen_random_uuid(),
edition_id UUID NOT NULL,
sport_id UUID NOT NULL,
round TEXT NULL,
match_number INTEGER NULL,
kontingen_a_id UUID NULL,
kontingen_b_id UUID NULL,
match_date DATE NULL,
match_time TIME NULL,
venue TEXT NULL,
status TEXT NOT NULL DEFAULT 'upcoming',
score_a TEXT NULL,
score_b TEXT NULL,
winner_id UUID NULL,
notes TEXT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
bracket_round INTEGER NULL,
bracket_position INTEGER NULL,
next_match_id UUID NULL,
is_bye BOOLEAN NOT NULL DEFAULT false,
group_name TEXT NULL,
team_a_id UUID NULL,
team_b_id UUID NULL,
winner_team_id UUID NULL,
    CONSTRAINT pk_supsas_fixtures PRIMARY KEY (id),
    CONSTRAINT supsas_fixtures_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.supsas_editions(id) ON DELETE CASCADE,
    CONSTRAINT supsas_fixtures_kontingen_a_id_fkey FOREIGN KEY (kontingen_a_id) REFERENCES public.supsas_kontingen(id) ON DELETE CASCADE,
    CONSTRAINT supsas_fixtures_kontingen_b_id_fkey FOREIGN KEY (kontingen_b_id) REFERENCES public.supsas_kontingen(id) ON DELETE CASCADE,
    CONSTRAINT supsas_fixtures_next_match_id_fkey FOREIGN KEY (next_match_id) REFERENCES public.supsas_fixtures(id) ON DELETE CASCADE,
    CONSTRAINT supsas_fixtures_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.supsas_sports(id) ON DELETE CASCADE,
    CONSTRAINT supsas_fixtures_team_a_id_fkey FOREIGN KEY (team_a_id) REFERENCES public.supsas_teams(id) ON DELETE CASCADE,
    CONSTRAINT supsas_fixtures_team_b_id_fkey FOREIGN KEY (team_b_id) REFERENCES public.supsas_teams(id) ON DELETE CASCADE,
    CONSTRAINT supsas_fixtures_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.supsas_kontingen(id) ON DELETE CASCADE,
    CONSTRAINT supsas_fixtures_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.supsas_teams(id) ON DELETE CASCADE
);

-- Table: supsas_participants
CREATE TABLE public.supsas_participants (
id UUID NOT NULL DEFAULT gen_random_uuid(),
edition_id UUID NOT NULL,
kontingen_id UUID NOT NULL,
sport_id UUID NOT NULL,
profile_id UUID NOT NULL,
position TEXT NULL,
jersey_number INTEGER NULL,
is_confirmed BOOLEAN NOT NULL DEFAULT false,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
team_id UUID NULL,
    CONSTRAINT pk_supsas_participants PRIMARY KEY (id),
    CONSTRAINT supsas_participants_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.supsas_editions(id) ON DELETE CASCADE,
    CONSTRAINT supsas_participants_kontingen_id_fkey FOREIGN KEY (kontingen_id) REFERENCES public.supsas_kontingen(id) ON DELETE CASCADE,
    CONSTRAINT supsas_participants_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.supsas_sports(id) ON DELETE CASCADE,
    CONSTRAINT supsas_participants_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.supsas_teams(id) ON DELETE CASCADE
);

-- Table: supsas_results
CREATE TABLE public.supsas_results (
id UUID NOT NULL DEFAULT gen_random_uuid(),
edition_id UUID NOT NULL,
sport_id UUID NOT NULL,
kontingen_id UUID NOT NULL,
medal TEXT NULL,
position INTEGER NULL,
notes TEXT NULL,
recorded_by UUID NULL,
recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_supsas_results PRIMARY KEY (id),
    CONSTRAINT supsas_results_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.supsas_editions(id) ON DELETE CASCADE,
    CONSTRAINT supsas_results_kontingen_id_fkey FOREIGN KEY (kontingen_id) REFERENCES public.supsas_kontingen(id) ON DELETE CASCADE,
    CONSTRAINT supsas_results_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.supsas_sports(id) ON DELETE CASCADE
);

-- Table: system_announcements
CREATE TABLE public.system_announcements (
id UUID NOT NULL DEFAULT gen_random_uuid(),
title TEXT NOT NULL,
content_body TEXT NOT NULL,
priority TEXT NOT NULL,
target_audience TEXT NOT NULL,
action_url TEXT NULL,
form_schema JSONB NULL,
is_active BOOLEAN NOT NULL DEFAULT true,
created_by UUID NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
image_url TEXT NULL,
icon_type TEXT NULL DEFAULT 'INFO',
    CONSTRAINT pk_system_announcements PRIMARY KEY (id),
    CONSTRAINT system_announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Table: system_settings
CREATE TABLE public.system_settings (
key TEXT NOT NULL,
value JSONB NOT NULL,
    CONSTRAINT pk_system_settings PRIMARY KEY (key)
);

-- Table: takwim_holidays
CREATE TABLE public.takwim_holidays (
id UUID NOT NULL DEFAULT gen_random_uuid(),
nama_cuti TEXT NOT NULL,
tarikh_mula DATE NOT NULL,
created_by UUID NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_takwim_holidays PRIMARY KEY (id)
);

-- Table: takwim_pusat (Manual definition)
CREATE TABLE IF NOT EXISTS public.takwim_pusat (
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
);

-- Table: task_feedback
CREATE TABLE public.task_feedback (
id UUID NOT NULL DEFAULT 'extensions.uuid_generate_v4()',
task_id UUID NULL,
from_id UUID NULL,
content TEXT NOT NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_task_feedback PRIMARY KEY (id),
    CONSTRAINT task_feedback_from_id_fkey FOREIGN KEY (from_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT task_feedback_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.club_tasks(id) ON DELETE CASCADE
);

-- Table: task_submissions
CREATE TABLE public.task_submissions (
id UUID NOT NULL DEFAULT 'extensions.uuid_generate_v4()',
task_id UUID NULL,
user_id UUID NULL,
file_url TEXT NOT NULL,
file_type TEXT NULL,
notes TEXT NULL,
created_at TIMESTAMPTZ NULL DEFAULT now(),
    CONSTRAINT pk_task_submissions PRIMARY KEY (id),
    CONSTRAINT task_submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.club_tasks(id) ON DELETE CASCADE,
    CONSTRAINT task_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: user_announcement_responses
CREATE TABLE public.user_announcement_responses (
id UUID NOT NULL DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
announcement_id UUID NOT NULL,
status TEXT NOT NULL,
form_data JSONB NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT pk_user_announcement_responses PRIMARY KEY (id),
    CONSTRAINT user_announcement_responses_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.system_announcements(id) ON DELETE CASCADE,
    CONSTRAINT user_announcement_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table: user_exco_access
CREATE TABLE public.user_exco_access (
id UUID NOT NULL DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
exco_module TEXT NOT NULL,
role TEXT NOT NULL,
is_active BOOLEAN NULL DEFAULT true,
granted_at TIMESTAMPTZ NULL DEFAULT now(),
granted_by UUID NULL,
    CONSTRAINT pk_user_exco_access PRIMARY KEY (id),
    CONSTRAINT user_exco_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT user_exco_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);


-- =============================================================================

-- 3. VIEW DEFINITIONS

-- View: v_hpnm_by_jabatan
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


-- =============================================================================

-- 4. STORAGE BUCKETS AND POLICIES

-- Create buckets in storage.buckets
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


-- =============================================================================

-- 5. CUSTOM POSTGRESQL FUNCTIONS (RPCs)

-- Function: admin_merge_duplicate_accounts (from 71_block_duplicate_matric_and_merge_tool.sql)
CREATE OR REPLACE FUNCTION admin_merge_duplicate_accounts(
  p_primary_id UUID,
  p_secondary_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_primary_name TEXT;
  v_secondary_name TEXT;
  v_secondary_email TEXT;
  v_secondary_matric TEXT;
  v_moved_memberships INT := 0;
  v_moved_merits INT := 0;
BEGIN
  -- Auth guard: hanya SUPER_ADMIN_JPP
  SELECT role INTO v_caller_role
  FROM profiles WHERE id = auth.uid();
  
  IF v_caller_role != 'SUPER_ADMIN_JPP' THEN
    RAISE EXCEPTION 'Akses Ditolak: Hanya Super Admin boleh menggabungkan akaun.';
  END IF;

  -- Pastikan kedua-dua akaun wujud
  SELECT full_name INTO v_primary_name FROM profiles WHERE id = p_primary_id;
  SELECT full_name, matric_no INTO v_secondary_name, v_secondary_matric FROM profiles WHERE id = p_secondary_id;
  
  SELECT email INTO v_secondary_email FROM auth.users WHERE id = p_secondary_id;
  
  IF v_primary_name IS NULL THEN
    RAISE EXCEPTION 'Akaun primary tidak dijumpai.';
  END IF;
  IF v_secondary_name IS NULL THEN
    RAISE EXCEPTION 'Akaun secondary tidak dijumpai.';
  END IF;

  -- Jangan merge diri sendiri
  IF p_primary_id = p_secondary_id THEN
    RAISE EXCEPTION 'Tidak boleh gabungkan akaun yang sama.';
  END IF;

  -- ── A) Pindahkan club memberships ───────────────────────────
  -- Hanya pindah keahlian yang PRIMARY belum ada
  UPDATE student_club_memberships
  SET user_id = p_primary_id, updated_at = NOW()
  WHERE user_id = p_secondary_id
    AND club_id NOT IN (
      SELECT club_id FROM student_club_memberships WHERE user_id = p_primary_id
    );
  GET DIAGNOSTICS v_moved_memberships = ROW_COUNT;

  -- Padam remaining memberships yang duplicate
  DELETE FROM student_club_memberships WHERE user_id = p_secondary_id;

  -- ── B) Gabungkan merit points ───────────────────────────────
  UPDATE profiles
  SET merit = COALESCE(merit, 0) + COALESCE(
    (SELECT merit FROM profiles WHERE id = p_secondary_id), 0
  )
  WHERE id = p_primary_id;
  
  -- ── C) Pindahkan notifikasi ─────────────────────────────────
  UPDATE notifications
  SET user_id = p_primary_id
  WHERE user_id = p_secondary_id;

  -- ── D) Pindahkan club_logs ──────────────────────────────────
  UPDATE club_logs
  SET actor_id = p_primary_id
  WHERE actor_id = p_secondary_id;

  -- ── E) Pindahkan club_tasks assignments ─────────────────────
  UPDATE club_tasks
  SET assigned_to = p_primary_id
  WHERE assigned_to = p_secondary_id;

  UPDATE club_tasks
  SET created_by = p_primary_id
  WHERE created_by = p_secondary_id;

  -- ── F) Pindahkan AI tier (ambil yang lebih tinggi) ──────────
  UPDATE profiles
  SET subscription_tier = CASE 
    WHEN COALESCE(subscription_tier, 'free') = 'pro' THEN 'pro'
    WHEN COALESCE((SELECT subscription_tier FROM profiles WHERE id = p_secondary_id), 'free') = 'pro' THEN 'pro'
    ELSE COALESCE(subscription_tier, 'free')
  END,
  ai_token_balance = COALESCE(ai_token_balance, 0) + COALESCE(
    (SELECT ai_token_balance FROM profiles WHERE id = p_secondary_id), 0
  )
  WHERE id = p_primary_id;

  -- ── G) Padam profil secondary ───────────────────────────────
  DELETE FROM profiles WHERE id = p_secondary_id;

  -- ── H) Padam auth.users secondary ───────────────────────────
  DELETE FROM auth.users WHERE id = p_secondary_id;

  -- ── I) Log audit ────────────────────────────────────────────
  INSERT INTO admin_audit_logs (actor_id, action_type, module, entity_id, description, metadata)
  VALUES (
    auth.uid(),
    'ACCOUNT_MERGED',
    'JPP Admin',
    p_primary_id::TEXT,
    format('Akaun berganda digabungkan: %s (%s) → %s', v_secondary_name, v_secondary_email, v_primary_name),
    jsonb_build_object(
      'primary_id', p_primary_id,
      'secondary_id', p_secondary_id,
      'secondary_email', v_secondary_email,
      'secondary_matric', v_secondary_matric,
      'memberships_moved', v_moved_memberships
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', format('Akaun %s berjaya digabungkan ke %s', v_secondary_name, v_primary_name),
    'memberships_moved', v_moved_memberships
  );
END;
$$;

-- Function: approve_all_pending_memberships (from 10_security_hardening.sql)
CREATE OR REPLACE FUNCTION approve_all_pending_memberships(
  p_club_id TEXT
) 
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role   TEXT;
  max_allowed   INT;
  r             RECORD;
  approved_count INT := 0;
  user_lock_hash INT;
BEGIN
  -- Dapatkan Authorization
  SELECT role INTO caller_role
  FROM student_club_memberships
  WHERE user_id = auth.uid() AND club_id = p_club_id AND account_status = 'APPROVED';

  IF caller_role IS NULL THEN
    SELECT role INTO caller_role FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP';
  END IF;

  IF caller_role NOT IN ('CLUB_PRESIDENT', 'CLUB_ADVISOR', 'CLUB_MT', 'SUPER_ADMIN_JPP') THEN
    RAISE EXCEPTION 'Akses Ditolak: Tiada kuasa.';
  END IF;

  -- Dapatkan Had
  SELECT (value)::int INTO max_allowed FROM system_settings WHERE key = 'max_clubs_per_student';
  IF max_allowed IS NULL THEN max_allowed := 2; END IF;

  -- Loop melalui semua ahli PENDING
  FOR r IN 
    SELECT id, user_id FROM student_club_memberships 
    WHERE club_id = p_club_id AND account_status = 'PENDING'
    ORDER BY created_at ASC
  LOOP
    -- Kunci Transaksi Row
    user_lock_hash := hashtext(r.user_id::text);
    PERFORM pg_advisory_xact_lock(user_lock_hash);

    -- Semak jika pelajar capai had
    IF (SELECT COUNT(*) FROM student_club_memberships WHERE user_id = r.user_id AND account_status = 'APPROVED') < max_allowed THEN
      UPDATE student_club_memberships 
      SET account_status = 'APPROVED', updated_at = NOW() 
      WHERE id = r.id;
      approved_count := approved_count + 1;
    END IF;
  END LOOP;

  RETURN approved_count;
END;
$$;

-- Function: archive_merit_cohort (from 67_fix_merit_system_audit.sql)
CREATE OR REPLACE FUNCTION public.archive_merit_cohort(p_cohort_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Archive full breakdown into student_merit_cohorts
    INSERT INTO public.student_merit_cohorts (
      user_id, cohort_id, total_merit, merit_kelab, merit_akademik, merit_asrama
    )
    SELECT id, p_cohort_id, merit,
           COALESCE(merit_kelab, 0),
           COALESCE(merit_akademik, 0),
           COALESCE(merit_asrama, 0)
    FROM public.profiles
    WHERE merit != 0 OR merit_kelab != 0 OR merit_akademik != 0 OR merit_asrama != 0;

    -- 2. Mark existing merit_transactions with the archived cohort_id
    UPDATE public.merit_transactions
    SET academic_session = p_cohort_id
    WHERE academic_session IS NULL;

    -- 3. Reset ALL profile merit columns to 0
    UPDATE public.profiles
    SET merit = 0,
        merit_kelab = 0,
        merit_akademik = 0,
        merit_asrama = 0
    WHERE merit != 0 OR merit_kelab != 0 OR merit_akademik != 0 OR merit_asrama != 0;
END;
$$;

-- Function: archive_old_polytask_jobs (from 84_polytask_v2_hotfix.sql)
CREATE OR REPLACE FUNCTION archive_old_polytask_jobs()
RETURNS void AS $$
BEGIN
    INSERT INTO public.polytask_jobs_archive (id, requester_id, title, description, category, budget, location, deadline, status, assigned_tasker_id, created_at, updated_at)
    SELECT id, requester_id, title, description, category, budget, location, deadline, status, assigned_tasker_id, created_at, updated_at
    FROM public.polytask_jobs
    WHERE status IN ('COMPLETED', 'CANCELLED') AND updated_at < NOW() - INTERVAL '3 months';

    DELETE FROM public.polytask_jobs
    WHERE status IN ('COMPLETED', 'CANCELLED') AND updated_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: assign_jpp_member (from 35_security_jpp_profile_rpc.sql)
CREATE OR REPLACE FUNCTION assign_jpp_member(
  p_target_id    UUID,
  p_jpp_position TEXT,
  p_jpp_unit     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role      TEXT;
  v_actor_position  TEXT;
  v_target_role     TEXT;
BEGIN
  -- Dapatkan maklumat pemanggil
  SELECT role, jpp_position INTO v_actor_role, v_actor_position
  FROM profiles WHERE id = auth.uid();

  -- Hanya SUPER_ADMIN_JPP atau YDP yang boleh buat ini
  IF v_actor_role NOT IN ('SUPER_ADMIN_JPP', 'ADMIN') AND
     v_actor_position NOT IN ('YDP', 'YANG_DIPERTUA') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya YDP atau Super Admin boleh melantik ahli JPP.';
  END IF;

  -- Tidak boleh ubah diri sendiri
  IF auth.uid() = p_target_id THEN
    RAISE EXCEPTION 'Tidak boleh melantik diri sendiri.';
  END IF;

  -- Semak pengguna sasaran wujud
  SELECT role INTO v_target_role FROM profiles WHERE id = p_target_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna sasaran tidak dijumpai.';
  END IF;

  -- Tidak boleh turun taraf SUPER_ADMIN_JPP atau ADMIN
  IF v_target_role IN ('SUPER_ADMIN_JPP', 'ADMIN') THEN
    RAISE EXCEPTION 'Tidak boleh mengubah akaun Super Admin melalui fungsi ini.';
  END IF;

  -- Set role = JPP, jpp_position, jpp_unit
  UPDATE profiles
  SET
    role         = 'JPP',
    jpp_position = NULLIF(p_jpp_position, ''),
    jpp_unit     = NULLIF(p_jpp_unit, '')
  WHERE id = p_target_id;
END;
$$;

-- Function: auto_sort_pencapaian_file (from 20260505235200_auto_sort_sijil_akademik.sql)
CREATE OR REPLACE FUNCTION auto_sort_pencapaian_file(p_pencapaian_id uuid)
RETURNS void AS $$
DECLARE
  v_pencapaian record;
  v_folder_name text;
  v_folder_id uuid;
BEGIN
  -- 1. Fetch pencapaian details
  SELECT * INTO v_pencapaian FROM akademik_pencapaian WHERE id = p_pencapaian_id;
  
  -- Ensure it's verified and has a file
  IF v_pencapaian IS NULL OR v_pencapaian.status != 'DISAHKAN' OR v_pencapaian.drive_view_url IS NULL THEN
    RETURN;
  END IF;

  -- 2. Determine target folder name based on jenis
  IF v_pencapaian.jenis = 'SIJIL' THEN
    v_folder_name := 'Sijil Penyertaan';
  ELSIF v_pencapaian.jenis = 'ANUGERAH' THEN
    v_folder_name := 'Sijil Penghargaan';
  ELSIF v_pencapaian.jenis = 'PERTANDINGAN' THEN
    v_folder_name := 'Sijil Penyertaan';
  ELSE
    v_folder_name := 'Lain-lain';
  END IF;

  -- 3. Check if folder already exists for this user
  SELECT id INTO v_folder_id FROM akademik_folders 
  WHERE created_by = v_pencapaian.user_id AND name = v_folder_name 
  LIMIT 1;

  -- 4. Create folder if it doesn't exist
  IF v_folder_id IS NULL THEN
    INSERT INTO akademik_folders (name, description, created_by, is_public)
    VALUES (v_folder_name, 'Dicipta secara automatik dari Sistem Pencapaian Akademik', v_pencapaian.user_id, false)
    RETURNING id INTO v_folder_id;
  END IF;

  -- 5. Prevent duplicate file inserts in the same folder
  IF EXISTS (
    SELECT 1 FROM akademik_files 
    WHERE folder_id = v_folder_id AND drive_view_url = v_pencapaian.drive_view_url
  ) THEN
    RETURN;
  END IF;

  -- 6. Insert the file record linked to the folder
  INSERT INTO akademik_files (
    folder_id, 
    uploaded_by, 
    owner_user_id, 
    name, 
    file_name, 
    drive_file_id, 
    drive_view_url, 
    drive_download_url, 
    file_type
  ) VALUES (
    v_folder_id, 
    COALESCE(v_pencapaian.verified_by, v_pencapaian.user_id),
    v_pencapaian.user_id, 
    v_pencapaian.nama_pencapaian, 
    v_pencapaian.nama_pencapaian || '.pdf',
    v_pencapaian.drive_file_id, 
    v_pencapaian.drive_view_url, 
    v_pencapaian.drive_download_url, 
    'application/pdf'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: buyer_cancel_polymart_order (from 20260527162500_95_polymart_jsonb_variations.sql)
CREATE OR REPLACE FUNCTION buyer_cancel_polymart_order(
  p_order_id UUID, 
  p_buyer_id UUID, 
  p_reason TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_result TEXT;
BEGIN
  -- Lock row to prevent race condition
  SELECT status, buyer_id, product_id, quantity, business_id, selected_variation
  INTO v_order
  FROM polymart_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak wujud.';
  END IF;

  -- Verify buyer owns the order
  IF v_order.buyer_id != p_buyer_id THEN
    RAISE EXCEPTION 'Anda bukan pemilik pesanan ini.';
  END IF;

  -- PENDING: Auto-cancel immediately, release stock
  IF v_order.status = 'PENDING' THEN
    UPDATE polymart_orders
    SET status = 'CANCELLED',
        cancellation_reason = p_reason,
        cancelled_at = NOW(),
        cancelled_by = p_buyer_id,
        cancel_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Release reserved stock using helper
    PERFORM update_product_variation_stock(v_order.product_id, v_order.selected_variation, 0, -v_order.quantity);

    v_result := 'CANCELLED';

  -- CONFIRMED: Request cancellation (vendor must approve)
  ELSIF v_order.status = 'CONFIRMED' THEN
    UPDATE polymart_orders
    SET cancellation_requested_at = NOW(),
        cancellation_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_order_id;

    v_result := 'CANCELLATION_REQUESTED';

  -- READY/COMPLETED: Cannot cancel
  ELSE
    RAISE EXCEPTION 'Pesanan dengan status % tidak boleh dibatalkan.', v_order.status;
  END IF;

  RETURN jsonb_build_object('result', v_result, 'order_id', p_order_id);
END;
$$;

-- Function: can_change_role (from 02_role_hierarchy.sql)
CREATE OR REPLACE FUNCTION can_change_role(
  actor_id UUID,        -- ID pengguna yang buat perubahan
  target_id UUID,       -- ID ahli yang diubah
  new_role  TEXT        -- Peranan baharu yang ingin ditetapkan
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- Berjalan dengan kebenaran postgres, bukan user — selamat!
SET search_path = public
AS $$
DECLARE
  actor_role          TEXT;
  actor_club          TEXT;
  target_current_role TEXT;
  target_club         TEXT;
BEGIN
  -- Dapatkan peranan & kelab pelaku dan sasaran
  SELECT role, club_id INTO actor_role, actor_club
  FROM profiles WHERE id = actor_id;

  SELECT role, club_id INTO target_current_role, target_club
  FROM profiles WHERE id = target_id;

  -- Keselamatan: tidak boleh ubah diri sendiri melalui fungsi ini
  IF actor_id = target_id THEN
    RETURN FALSE;
  END IF;

  -- 1. JPP boleh ubah SEMUA role merentas semua kelab
  IF actor_role = 'SUPER_ADMIN_JPP' THEN
    RETURN TRUE;
  END IF;

  -- Peraturan berikut: hanya boleh urus kelab sendiri
  IF actor_club IS DISTINCT FROM target_club THEN
    RETURN FALSE;
  END IF;

  -- 2. Penasihat boleh ubah: PRESIDEN, MT, AHLI
  --    (TIDAK boleh ubah ke/dari PENASIHAT atau JPP)
  IF actor_role IN ('CLUB_ADVISOR') THEN
    RETURN (
      new_role IN ('CLUB_PRESIDENT', 'CLUB_MT', 'CLUB_MEMBER')
      AND target_current_role IN ('CLUB_PRESIDENT', 'CLUB_MT', 'CLUB_MEMBER')
    );
  END IF;

  -- 3. Presiden boleh ubah: MT dan AHLI
  --    (TIDAK boleh upgrade ke Presiden atau Penasihat)
  IF actor_role = 'CLUB_PRESIDENT' THEN
    RETURN (
      new_role IN ('CLUB_MT', 'CLUB_MEMBER')
      AND target_current_role IN ('CLUB_MT', 'CLUB_MEMBER')
    );
  END IF;

  -- Semua kes lain (MT, Ahli): DITOLAK
  RETURN FALSE;

EXCEPTION WHEN OTHERS THEN
  -- Jika ada ralat tidak dijangka, tolak dengan selamat
  RAISE WARNING 'can_change_role error: %', SQLERRM;
  RETURN FALSE;
END;
$$;

-- Function: cancel_expired_polymart_orders (from 87_polymart_auto_cancel_hotfix.sql)
CREATE OR REPLACE FUNCTION public.cancel_expired_polymart_orders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_order RECORD;
BEGIN
  FOR v_order IN
    SELECT id, product_id, quantity, buyer_id
    FROM polymart_orders
    WHERE status = 'PENDING'
      AND payment_deadline_at IS NOT NULL
      AND payment_deadline_at < NOW()
      AND payment_verified_at IS NULL
      AND payment_receipt_url IS NULL -- MESTI belum memuat naik resit
  LOOP
    UPDATE polymart_orders
    SET status = 'CANCELLED',
        cancel_reason = 'Auto-dibatalkan: had masa pembayaran tamat',
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = v_order.id;

    PERFORM release_polymart_stock(v_order.product_id, v_order.quantity);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Function: cancel_polyrider_job (from 51_polyrider_cancel_sos_appeals.sql)
CREATE OR REPLACE FUNCTION public.cancel_polyrider_job(p_job_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_job polyrider_jobs%ROWTYPE;
  v_cancel_count INT;
BEGIN
  -- Get the job details
  SELECT * INTO v_job FROM polyrider_jobs WHERE id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  -- Ensure the user is allowed to cancel it (either student or rider)
  IF v_job.student_id != v_user_id AND v_job.rider_id != v_user_id THEN
    RAISE EXCEPTION 'Anda tidak dibenarkan membatalkan pesanan ini';
  END IF;

  -- Ensure job isn't already started or completed
  IF v_job.status IN ('IN_TRANSIT', 'COMPLETED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Perjalanan telah bermula, selesai atau telah dibatalkan.';
  END IF;

  -- Perform the cancellation
  UPDATE polyrider_jobs
  SET status = 'CANCELLED',
      cancellation_reason = p_reason,
      cancelled_by = v_user_id,
      updated_at = now()
  WHERE id = p_job_id;
  
  -- Anti-Spam Check: Count how many cancellations this user did in the last 1 HOUR
  SELECT COUNT(*) INTO v_cancel_count
  FROM polyrider_jobs
  WHERE cancelled_by = v_user_id
    AND updated_at >= now() - interval '1 hour'
    AND status = 'CANCELLED';

  -- If more than 3, apply automated suspension (24 hours)
  IF v_cancel_count > 3 THEN
    -- Increment penalty count and suspend for 24 hours
    UPDATE profiles
    SET polyrider_penalty_count = COALESCE(polyrider_penalty_count, 0) + 1,
        polyrider_suspended_until = now() + interval '24 hours'
    WHERE id = v_user_id;

    -- Note: If they are a rider, we could also suspend their rider profile
    UPDATE polyrider_profiles
    SET status = 'SUSPENDED'
    WHERE user_id = v_user_id;
  END IF;
END;
$function$;

-- Function: censor_polysuara_content (from 27_polysuara_v4_updates.sql)
CREATE OR REPLACE FUNCTION public.censor_polysuara_content()
RETURNS TRIGGER AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT word FROM public.polysuara_censored_words LOOP
        -- Case insensitive regex replace. Using \b for word boundaries.
        NEW.content := regexp_replace(NEW.content, '(?i)\b' || rec.word || '\b', '***', 'g');
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: change_member_role (from 13_fix_change_member_role_superadmin.sql)
CREATE OR REPLACE FUNCTION change_member_role(
  p_actor_id    UUID,
  p_target_id   UUID,
  p_club_id     TEXT,
  p_new_role    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role   TEXT;
  v_target_role  TEXT;
BEGIN
  IF p_new_role NOT IN ('CLUB_MEMBER', 'CLUB_MT', 'CLUB_PRESIDENT', 'CLUB_ADVISOR') THEN
    RAISE EXCEPTION 'Peranan tidak sah: %', p_new_role;
  END IF;

  -- Semak profiles.role DAHULU supaya SUPER_ADMIN_JPP tidak tertindih oleh keahlian biasa kelab
  SELECT role INTO v_actor_role FROM profiles WHERE id = p_actor_id;

  -- Jika bukan Super Admin/JPP, kita semak peranan dalam kelab tersebut
  IF v_actor_role NOT IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP') THEN
    SELECT role INTO v_actor_role
    FROM student_club_memberships
    WHERE user_id = p_actor_id AND club_id = p_club_id AND account_status = 'APPROVED';
  END IF;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Aktor tidak dijumpai atau tidak mempunyai akses ke kelab ini';
  END IF;

  SELECT role INTO v_target_role
  FROM student_club_memberships
  WHERE user_id = p_target_id AND club_id = p_club_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Ahli sasaran tidak dijumpai dalam kelab ini';
  END IF;

  IF p_actor_id = p_target_id THEN
    RAISE EXCEPTION 'Anda tidak boleh mengubah peranan diri sendiri';
  END IF;

  IF v_actor_role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP') THEN
    NULL; -- Lulus penuh
  ELSIF v_actor_role = 'CLUB_ADVISOR' THEN
    IF v_target_role NOT IN ('CLUB_PRESIDENT', 'CLUB_MT', 'CLUB_MEMBER') THEN
      RAISE EXCEPTION 'Penasihat tidak boleh mengubah peranan: %', v_target_role;
    END IF;
    IF p_new_role = 'CLUB_ADVISOR' THEN
      RAISE EXCEPTION 'Penasihat tidak boleh melantik Penasihat lain';
    END IF;
  ELSIF v_actor_role = 'CLUB_PRESIDENT' THEN
    IF v_target_role NOT IN ('CLUB_MT', 'CLUB_MEMBER') THEN
      RAISE EXCEPTION 'Presiden tidak boleh mengubah peranan: %', v_target_role;
    END IF;
    IF p_new_role NOT IN ('CLUB_MT', 'CLUB_MEMBER') THEN
      RAISE EXCEPTION 'Presiden hanya boleh tetapkan MT atau Ahli';
    END IF;
  ELSE
    RAISE EXCEPTION 'Anda tidak mempunyai kebenaran untuk mengubah peranan ahli';
  END IF;

  UPDATE student_club_memberships
  SET role = p_new_role, updated_at = NOW()
  WHERE user_id = p_target_id AND club_id = p_club_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gagal mengemaskini peranan';
  END IF;
END;
$$;

-- Function: check_ai_tokens (from 24_pro_tier_expiration_enforcer.sql)
CREATE OR REPLACE FUNCTION public.check_ai_tokens(task_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_profile record;
  v_token_settings jsonb;
  v_rate_limit jsonb;
  v_task_cost int;
  v_monthly_allowance int;
  v_daily_usage int;
  v_last_usage_reset timestamptz;
  v_can_afford boolean;
  v_daily_limit int;
  v_status text;
  v_tier text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Fetch settings
  SELECT value INTO v_token_settings FROM system_settings WHERE key = 'ai_token_settings';
  SELECT value INTO v_rate_limit FROM system_settings WHERE key = 'ai_rate_limit';
  v_daily_limit := COALESCE((v_rate_limit->>'block_threshold')::int, 65);

  -- 2. Fetch profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  v_status := COALESCE(v_profile.ai_status, 'active');
  v_daily_usage := COALESCE(v_profile.ai_daily_usage, 0);
  v_last_usage_reset := COALESCE(v_profile.ai_last_reset, now() - INTERVAL '2 days');
  v_tier := COALESCE(v_profile.subscription_tier, 'free');

  -- APPLY AUTO EXPIRE PRO TIER
  IF v_profile.ai_tier_expiration IS NOT NULL AND now() > v_profile.ai_tier_expiration THEN
      v_tier := 'free';
      UPDATE public.profiles 
      SET 
          subscription_tier = 'free',
          ai_tier_expiration = NULL
      WHERE id = v_user_id;

      INSERT INTO public.notifications(user_id, title, content)
      VALUES (v_user_id, 'Langganan PRO Tamat ⏱️', 'Tempoh langganan 30 hari PRO Tier Nexus anda telah tamat. Profil anda telah dikembalikan kepada Free Tier namun baki token anda dikekalkan.');
  END IF;

  -- 3. Block if Banned or currently Flagged
  IF v_status = 'permanent_ban' THEN
    RAISE EXCEPTION 'Akses AI anda telah digantung secara kekal.';
  END IF;

  -- 4. Check Daily Usage Reset (for logic check only)
  IF now() > v_last_usage_reset + INTERVAL '24 hours' THEN
    v_daily_usage := 0;
    v_status := 'active';
  END IF;

  IF v_status = 'flagged' AND now() <= v_last_usage_reset + INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Akses AI anda sedang digantung. Sila cuba lagi dalam 24 jam.';
  END IF;

  -- 5. Calculate Token Balance (with monthly reset logic)
  v_task_cost := COALESCE((v_token_settings->'costs'->>task_name)::int, 0);
  
  IF date_trunc('month', COALESCE(v_profile.ai_token_last_reset, now() - INTERVAL '2 months') AT TIME ZONE 'Asia/Kuala_Lumpur') < date_trunc('month', now() AT TIME ZONE 'Asia/Kuala_Lumpur') THEN
    IF v_tier = 'pro' THEN
      v_monthly_allowance := COALESCE((v_token_settings->>'pro_tier_tokens')::int, 1000);
    ELSE
      v_monthly_allowance := COALESCE((v_token_settings->>'free_tier_tokens')::int, 200);
    END IF;
  ELSE
    v_monthly_allowance := COALESCE(v_profile.ai_token_balance, 0);
  END IF;

  v_can_afford := (v_monthly_allowance >= v_task_cost);

  RETURN jsonb_build_object(
      'current_balance', v_monthly_allowance,
      'tier', v_tier,
      'task_cost', v_task_cost,
      'can_afford', v_can_afford,
      'daily_usage', v_daily_usage,
      'daily_limit', v_daily_limit,
      'status', v_status,
      'all_costs', v_token_settings->'costs'
  );
END;
$function$;

-- Function: check_email_registered (from 42_check_email_registered.sql)
CREATE OR REPLACE FUNCTION check_email_registered(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Check auth.users directly to see if the email is already registered
  -- This helps prevent the "fake signup success" issue when users forget they used Google
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = p_email
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$;

-- Function: check_matric_registered (from 71_block_duplicate_matric_and_merge_tool.sql)
CREATE OR REPLACE FUNCTION check_matric_registered(p_matric_no TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_email TEXT;
  v_masked TEXT;
  v_local TEXT;
  v_domain TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM profiles
  WHERE UPPER(matric_no) = UPPER(TRIM(p_matric_no));

  IF v_count = 0 THEN
    RETURN jsonb_build_object('exists', FALSE);
  END IF;

  -- Ambil emel akaun pertama (asal) untuk beri hint
  SELECT u.email INTO v_email
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE UPPER(p.matric_no) = UPPER(TRIM(p_matric_no))
  ORDER BY u.created_at ASC
  LIMIT 1;

  -- Mask emel: tunjuk aksara pertama & terakhir sahaja
  -- cth: fadhilakif8@gmail.com → f********8@g***l.com
  IF v_email IS NOT NULL AND v_email LIKE '%@%' THEN
    v_local := split_part(v_email, '@', 1);
    v_domain := split_part(v_email, '@', 2);
    
    IF LENGTH(v_local) <= 2 THEN
      v_masked := v_local || '@' || v_domain;
    ELSE
      v_masked := LEFT(v_local, 1) 
        || REPEAT('*', GREATEST(LENGTH(v_local) - 2, 1))
        || RIGHT(v_local, 1) 
        || '@' 
        || LEFT(v_domain, 1) 
        || REPEAT('*', GREATEST(LENGTH(split_part(v_domain, '.', 1)) - 2, 1))
        || RIGHT(split_part(v_domain, '.', 1), 1) 
        || '.' 
        || split_part(v_domain, '.', 2);
    END IF;
  ELSE
    v_masked := '***';
  END IF;

  RETURN jsonb_build_object(
    'exists', TRUE,
    'email_hint', v_masked,
    'account_count', v_count
  );
END;
$$;

-- Function: check_polysuara_hourly_limit (from 20260518000000_update_polysuara_rate_limit.sql)
CREATE OR REPLACE FUNCTION public.check_polysuara_hourly_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_count INT;
BEGIN
    -- Pentadbir (JPP/Admin) dikecualikan daripada had
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = NEW.author_id
          AND role IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'SUPER_ADMIN')
    ) THEN
        RETURN NEW;
    END IF;

    -- Kira luahan dalam 1 jam terakhir
    SELECT COUNT(*) INTO v_count
    FROM public.polysuara_confessions
    WHERE author_id = NEW.author_id
      AND created_at >= NOW() - INTERVAL '1 hour';

    IF v_count >= 5 THEN
        -- SQLSTATE P0001 dihantar dengan betul supaya frontend dapat tangkap err.code
        RAISE EXCEPTION 'Had perkongsian per jam (5/jam) telah dicapai. Sila rehat sekejap.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: check_polytask_bid_rate_limit (from 84_polytask_v2_hotfix.sql)
CREATE OR REPLACE FUNCTION check_polytask_bid_rate_limit()
RETURNS TRIGGER AS $$
DECLARE recent_bids_count INT;
BEGIN
    SELECT COUNT(*) INTO recent_bids_count
    FROM public.polytask_bids
    WHERE tasker_id = NEW.tasker_id AND created_at > NOW() - INTERVAL '1 hour';

    IF recent_bids_count >= 10 THEN
        RAISE EXCEPTION 'Rate limit exceeded: You can only place 10 bids per hour.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: check_saved_locations_limit (from 54_polyrider_saved_locations.sql)
CREATE OR REPLACE FUNCTION check_saved_locations_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.polyrider_saved_locations
    WHERE user_id = NEW.user_id
  ) >= 5 THEN
    RAISE EXCEPTION 'Had maksimum 5 lokasi kegemaran telah dicapai.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: complete_polymart_order (from 37_polymart_pos_sync.sql)
CREATE OR REPLACE FUNCTION complete_polymart_order(
  p_order_id UUID,
  p_business_id UUID,
  p_product_id UUID,
  p_quantity INT,
  p_unit_price DECIMAL,
  p_payment_method TEXT,
  p_served_by UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_invoice_num TEXT;
  v_product_name TEXT;
  v_total DECIMAL;
BEGIN
  -- Calculate total
  v_total := p_quantity * p_unit_price;

  -- 1. Deduct actual stock and reserved stock
  UPDATE business_products
  SET 
    stock_quantity = GREATEST(0, stock_quantity - p_quantity),
    reserved_stock = GREATEST(0, reserved_stock - p_quantity)
  WHERE id = p_product_id
  RETURNING name INTO v_product_name;

  -- 2. Update PolyMart order status
  UPDATE polymart_orders
  SET status = 'COMPLETED'
  WHERE id = p_order_id;

  -- 3. Generate Invoice Number (e.g. PM-YYYYMMDD-XXXX)
  v_invoice_num := 'PM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(p_order_id::text from 1 for 4));

  -- 4. Create Business Transaction for Ledger Sync
  INSERT INTO business_transactions (
    business_id,
    invoice_number,
    items,
    subtotal,
    discount_type,
    discount_amount,
    discount_note,
    total_amount,
    payment_method,
    received_amount,
    change_amount,
    customer_name,
    customer_note,
    served_by,
    status
  ) VALUES (
    p_business_id,
    v_invoice_num,
    jsonb_build_array(
      jsonb_build_object(
        'product_id', p_product_id,
        'name', v_product_name,
        'qty', p_quantity,
        'unit_price', p_unit_price,
        'total_price', v_total
      )
    ),
    v_total,
    NULL,
    0,
    NULL,
    v_total,
    p_payment_method, -- 'CASH', 'QR', or 'TRANSFER'
    v_total,
    0,
    'PolyMart Online Customer',
    'PolyMart Order ID: ' || p_order_id::text,
    p_served_by,
    'COMPLETED'
  ) RETURNING id INTO v_transaction_id;

  -- 5. Create POS Log
  INSERT INTO business_pos_logs (
    business_id,
    transaction_id,
    actor_id,
    action_type,
    description,
    metadata
  ) VALUES (
    p_business_id,
    v_transaction_id,
    p_served_by,
    'TRANSACTION_CREATE',
    'Completed PolyMart Order ' || v_invoice_num,
    jsonb_build_object(
      'source', 'POLYMART',
      'polymart_order_id', p_order_id,
      'amount', v_total
    )
  );

END;
$$;

-- Function: create_polyrider_job (from 51_polymart_polyrider_integration.sql)
CREATE OR REPLACE FUNCTION public.create_polyrider_job(
    p_student_id uuid,
    p_pickup_name text,
    p_dropoff_name text,
    p_pickup_lat numeric DEFAULT NULL::numeric,
    p_pickup_lng numeric DEFAULT NULL::numeric,
    p_dropoff_lat numeric DEFAULT NULL::numeric,
    p_dropoff_lng numeric DEFAULT NULL::numeric,
    p_proposed_price numeric DEFAULT 3.0,
    p_is_carpool_open boolean DEFAULT false,
    p_join_group_id uuid DEFAULT NULL::uuid,
    p_job_type text DEFAULT 'RIDE',
    p_polymart_order_id uuid DEFAULT NULL::uuid
)
 RETURNS SETOF polyrider_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_job          polyrider_jobs%ROWTYPE;
  v_group_id     UUID;
  v_group_count  INT := 0;
  v_gender       TEXT;
  v_initial_status TEXT;
BEGIN
  -- Validate student not already in an active job
  IF EXISTS (
    SELECT 1 FROM polyrider_jobs
    WHERE student_id = p_student_id
      AND status IN ('PENDING','ACCEPTED','ARRIVED','IN_TRANSIT','GATHERING','CARPOOL_REQUEST')
  ) THEN
    RAISE EXCEPTION 'Anda masih mempunyai perjalanan aktif';
  END IF;

  -- Fetch student gender from profiles
  SELECT gender INTO v_gender FROM profiles WHERE id = p_student_id LIMIT 1;

  -- If joining existing carpool group
  IF p_join_group_id IS NOT NULL THEN
    -- Must be joining a GATHERING group
    IF NOT EXISTS (
      SELECT 1 FROM polyrider_jobs
      WHERE carpool_group_id = p_join_group_id AND status = 'GATHERING'
    ) THEN
      RAISE EXCEPTION 'Kumpulan carpool ini sudah tidak mengumpul penumpang';
    END IF;

    -- Check if already full (max 3 accepted/gathering members)
    SELECT COUNT(*) INTO v_group_count
    FROM polyrider_jobs
    WHERE carpool_group_id = p_join_group_id AND status = 'GATHERING';

    IF v_group_count >= 3 THEN
      RAISE EXCEPTION 'Kumpulan carpool ini sudah penuh (maks 3 penumpang)';
    END IF;

    v_group_id := p_join_group_id;
    v_initial_status := 'CARPOOL_REQUEST'; -- Joining student starts as request
  ELSE
    v_group_id := NULL;
    IF p_is_carpool_open THEN
      v_initial_status := 'GATHERING'; -- Owner starts as gathering
    ELSE
      v_initial_status := 'PENDING'; -- Normal single job goes straight to pending
    END IF;
  END IF;

  -- Create the job
  INSERT INTO polyrider_jobs (
    student_id, job_type, pickup_name, dropoff_name,
    pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
    status, proposed_price, is_carpool_open, carpool_group_id,
    passenger_gender, polymart_order_id
  ) VALUES (
    p_student_id, p_job_type, p_pickup_name, p_dropoff_name,
    p_pickup_lat, p_pickup_lng, p_dropoff_lat, p_dropoff_lng,
    v_initial_status, p_proposed_price, p_is_carpool_open, v_group_id,
    v_gender, p_polymart_order_id
  ) RETURNING * INTO v_job;

  -- If creating NEW carpool, set group_id = own job id
  IF p_is_carpool_open AND p_join_group_id IS NULL THEN
    UPDATE polyrider_jobs
      SET carpool_group_id = v_job.id
      WHERE id = v_job.id;
    v_job.carpool_group_id := v_job.id;
  END IF;

  RETURN NEXT v_job;
  RETURN;
END;
$function$;

-- Function: delete_own_account (from 72_delete_own_account.sql)
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the user from auth.users (this cascades to public.profiles)
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Function: detect_duplicate_matric_accounts (from 70_flexible_login_and_duplicate_detection.sql)
CREATE OR REPLACE FUNCTION detect_duplicate_matric_accounts()
RETURNS TABLE(
  matric_no TEXT,
  account_count BIGINT,
  accounts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auth guard: hanya SUPER_ADMIN_JPP atau JPP boleh akses
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ) THEN
    RAISE EXCEPTION 'Akses Ditolak: Hanya JPP Admin boleh lihat data ini.';
  END IF;

  RETURN QUERY
  SELECT 
    p.matric_no,
    COUNT(*)::BIGINT AS account_count,
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'email', u.email,
        'role', p.role,
        'department', p.department,
        'created_at', u.created_at,
        'last_sign_in', u.last_sign_in_at,
        'providers', u.raw_app_meta_data->'providers',
        'email_confirmed', u.email_confirmed_at IS NOT NULL
      ) ORDER BY u.created_at ASC
    ) AS accounts
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE p.matric_no IS NOT NULL 
    AND p.matric_no != ''
  GROUP BY p.matric_no
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC, p.matric_no;
END;
$$;

-- Function: enforce_club_membership_limit (from 17_geomatik_to_akademik.sql)
CREATE OR REPLACE FUNCTION enforce_club_membership_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_approved_count INT;
  max_allowed            INT;
  user_dept              TEXT;
  is_target_geosas       BOOLEAN;
  has_geosas             BOOLEAN;
BEGIN
  -- Hanya semak had apabila status bertukar ke APPROVED
  IF NEW.account_status <> 'APPROVED' THEN
    RETURN NEW;
  END IF;

  -- Jangan semak jika status tidak berubah
  IF TG_OP = 'UPDATE' AND OLD.account_status = 'APPROVED' THEN
    RETURN NEW;
  END IF;

  -- Kira kelab yang di-APPROVED (tidak termasuk entri ini)
  SELECT COUNT(*) INTO current_approved_count
  FROM student_club_memberships
  WHERE user_id = NEW.user_id
    AND account_status = 'APPROVED'
    AND id IS DISTINCT FROM NEW.id;

  -- Dapatkan had base system setting (default 2)
  SELECT (value)::int INTO max_allowed
  FROM system_settings
  WHERE key = 'max_clubs_per_student';

  IF max_allowed IS NULL THEN
    max_allowed := 2;
  END IF;

  -- LOGIC KHAS GEOSAS (Hanya pelajar JKA)
  SELECT department INTO user_dept
  FROM profiles
  WHERE id = NEW.user_id;

  -- Semak jika permohonan baru adalah untuk GEOSAS
  SELECT EXISTS (
    SELECT 1 FROM clubs 
    WHERE id::text = NEW.club_id::text 
      AND UPPER(short_name) = 'GEOSAS'
  ) INTO is_target_geosas;

  -- Semak jika pelajar sudah mempunyai kelab GEOSAS (yang approved)
  SELECT EXISTS (
    SELECT 1 FROM student_club_memberships scm
    JOIN clubs c ON c.id::text = scm.club_id::text
    WHERE scm.user_id = NEW.user_id 
      AND scm.account_status = 'APPROVED' 
      AND UPPER(c.short_name) = 'GEOSAS'
      AND scm.id IS DISTINCT FROM NEW.id
  ) INTO has_geosas;

  -- Jika is_target_geosas adalah BENAR, pastikan mereka adalah pelajar JKA
  IF is_target_geosas AND (user_dept IS NULL OR user_dept <> 'awam') THEN
    RAISE EXCEPTION 'Kelab GEOSAS hanya terbuka kepada pelajar Jabatan Kejuruteraan Awam (JKA).';
  END IF;

  -- Beri kuota +1 (+3 total default) jika mereka JKA dan berkait GEOSAS
  IF user_dept = 'awam' AND (is_target_geosas OR has_geosas) THEN
    max_allowed := max_allowed + 1;
  END IF;

  -- Tolak jika melebihi had (termasuk kelonggaran GEOSAS)
  IF current_approved_count >= max_allowed THEN
    RAISE EXCEPTION 
      'Had keahlian dicapai. Pelajar ini sudah dalam % kelab. Had semasa: % kelab. Hubungi JPP untuk ubah had.',
      current_approved_count,
      max_allowed;
  END IF;

  RETURN NEW;

EXCEPTION 
  WHEN SQLSTATE 'P0001' THEN RAISE; -- Re-throw custom exception
  WHEN OTHERS THEN
    RAISE WARNING 'enforce_club_membership_limit error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Function: fn_auto_credit_kelab_merit (from 40_program_attendance_system.sql)
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

-- Function: generate_polysuara_comment_codename (from 20260529224800_98_polysuara_social_comments.sql)
CREATE OR REPLACE FUNCTION public.generate_polysuara_comment_codename()
RETURNS TRIGGER AS $$
DECLARE
    v_confession_author_id UUID;
    v_confession_codename VARCHAR(100);
    v_hash TEXT;
BEGIN
    -- Ambil maklumat confession utama
    SELECT author_id, codename INTO v_confession_author_id, v_confession_codename
    FROM public.polysuara_confessions
    WHERE id = NEW.confession_id;

    -- Semak jika pengomen adalah OP (Original Poster)
    IF NEW.user_id = v_confession_author_id THEN
        NEW.codename := v_confession_codename || ' [Penulis]';
    ELSE
        -- Hashing selamat berasaskan (user_id + confession_id) untuk nama samaran unik bagi thread ini
        v_hash := substring(md5(NEW.user_id::text || NEW.confession_id::text), 1, 5);
        NEW.codename := 'Anon-' || v_hash;
    END IF;

    -- Tandakan is_jpp_official jika pengomen adalah Exco JPP
    IF public.is_jpp_admin(NEW.user_id) THEN
        NEW.is_jpp_official := true;
    ELSE
        NEW.is_jpp_official := false;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: generate_puskep_reg_number (from 60_keusahawanan_registration_history.sql)
CREATE OR REPLACE FUNCTION public.generate_puskep_reg_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_year TEXT;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  RETURN 'P-' || current_year || '-' || LPAD(nextval('puskep_reg_seq')::text, 3, '0');
END;
$function$;

-- Function: get_active_polyrider_count (from 50_polyrider_security_patch.sql)
CREATE OR REPLACE FUNCTION public.get_active_polyrider_count()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    active_count INTEGER;
BEGIN
    SELECT count(*) INTO active_count FROM public.polyrider_profiles WHERE is_active = true AND status = 'APPROVED' AND (license_expiry_date > now() OR license_expiry_date IS NULL);
    RETURN active_count;
END;
$function$;

-- Function: get_active_polytask_count (from 84_polytask_v2_hotfix.sql)
CREATE OR REPLACE FUNCTION get_active_polytask_count()
RETURNS integer AS $$
BEGIN
    RETURN (SELECT count(*)::integer FROM public.polytask_jobs WHERE status IN ('OPEN', 'IN_PROGRESS'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: get_auth_providers (from 43_get_auth_providers.sql)
CREATE OR REPLACE FUNCTION get_auth_providers(p_email text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_providers text[];
BEGIN
  -- Get the array of providers from raw_app_meta_data
  -- For Google-only users, this will typically return '{google}'
  -- For Email users, this will return '{email}' or '{email, google}'
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(raw_app_meta_data->'providers')
    FROM auth.users
    WHERE email = p_email
  ) INTO v_providers;
  
  -- If user not found, return empty array
  IF v_providers IS NULL THEN
    v_providers := ARRAY[]::text[];
  END IF;

  RETURN v_providers;
END;
$$;

-- Function: get_average_budget_by_category (from 84_polytask_v2_hotfix.sql)
CREATE OR REPLACE FUNCTION get_average_budget_by_category(p_category TEXT)
RETURNS NUMERIC AS $$
DECLARE avg_budget NUMERIC;
BEGIN
    SELECT COALESCE(AVG(budget), 0) INTO avg_budget
    FROM public.polytask_jobs
    WHERE category = p_category AND status IN ('COMPLETED', 'IN_PROGRESS', 'CLOSED');
    RETURN avg_budget;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: get_dashboard_data (from 10_security_hardening.sql)
CREATE OR REPLACE FUNCTION get_dashboard_data(
  p_club_id     TEXT,
  p_user_id     UUID,
  p_is_member   BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_announcement  JSONB;
  v_members       JSONB;
  v_programs      JSONB;
  v_task_stats    JSONB;
  v_act_stats     JSONB;
  v_tasks         JSONB;
  v_activities    JSONB;
  v_is_authorized BOOLEAN;
BEGIN
  -- AUTH GUARD: Pastikan caller adalah Ahli Kelab berstatus APPROVED (atau JPP)
  -- Kerana RPC ini SECURITY DEFINER, ia bypass RLS, jadi kita perlu buat semakan manual
  SELECT EXISTS (
    SELECT 1 FROM student_club_memberships 
    WHERE user_id = auth.uid() 
      AND club_id = p_club_id
      AND account_status = 'APPROVED'
  ) OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP'
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Akses ditolak: Anda bukan ahli yang sah untuk kelab ini.';
  END IF;

  -- ── 1. Pengumuman terkini ──────────────────────────────────
  SELECT jsonb_build_object('content', content)
    INTO v_announcement
    FROM club_announcements
   WHERE club_id = p_club_id
   ORDER BY created_at DESC
   LIMIT 1;

  -- ── 2. Ahli aktif ─────────────────────────────────────────
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',         id,
      'full_name',  full_name,
      'merit',      COALESCE(merit, 0),
      'role',       role,
      'avatar_url', avatar_url,
      'matric_no',  matric_no -- Jangan return email (PDPA prevention)
    ) ORDER BY COALESCE(merit, 0) DESC
  )
    INTO v_members
    FROM student_club_memberships scm
    JOIN profiles p ON p.id = scm.user_id
   WHERE scm.club_id = p_club_id AND scm.account_status = 'APPROVED'
   LIMIT 300; -- Limit keselamatan RAM

  -- ── 3. Program (Takwim Rasmi) — limit 4 ──────────────────-
  SELECT jsonb_agg(row_to_json(prog))
    INTO v_programs
    FROM (
      SELECT id, nama_program, status, jpp_remarks, updated_at, tarikh_mula
        FROM programs
       WHERE club_id = p_club_id
         AND status NOT IN ('COMPLETED')
       ORDER BY updated_at DESC
       LIMIT 4
    ) prog;

  -- ── 4. Statistik Tugasan (untuk chart) ────────────────────
  SELECT jsonb_build_object(
      'active',    COUNT(*) FILTER (WHERE status = 'ACTIVE'),
      'completed', COUNT(*) FILTER (WHERE status = 'COMPLETED'),
      'waiting',   COUNT(*) FILTER (WHERE approval_status = 'WAITING' AND is_archived = FALSE)
    )
    INTO v_task_stats
    FROM club_tasks
   WHERE club_id = p_club_id;

  -- ── 5. Statistik Aktiviti (untuk chart) ───────────────────
  SELECT jsonb_build_object(
      'perancangan', COUNT(*) FILTER (WHERE status = 'perancangan'),
      'aktif',       COUNT(*) FILTER (WHERE status = 'aktif'),
      'selesai',     COUNT(*) FILTER (WHERE status = 'selesai')
    )
    INTO v_act_stats
    FROM club_activities
   WHERE club_id = p_club_id;

  -- ── 6. Senarai Tugasan Aktif ───────────────────────────────
  IF p_is_member THEN
    -- Ahli biasa: hanya tugasan yang diluluskan & milik mereka
    SELECT jsonb_agg(row_to_json(t))
      INTO v_tasks
      FROM (
        SELECT ct.*, p.full_name AS assigned_name
          FROM club_tasks ct
          LEFT JOIN profiles p ON p.id = ct.assigned_to
         WHERE ct.club_id = p_club_id
           AND ct.is_archived = FALSE
           AND ct.approval_status != 'WAITING'
           AND (ct.assigned_to = p_user_id OR ct.created_by = p_user_id)
         ORDER BY ct.due_date ASC
         LIMIT 50 -- Limit keselamatan RAM
      ) t;
  ELSE
    -- MT/Presiden/Penasihat: semua tugasan
    SELECT jsonb_agg(row_to_json(t))
      INTO v_tasks
      FROM (
        SELECT ct.*, p.full_name AS assigned_name
          FROM club_tasks ct
          LEFT JOIN profiles p ON p.id = ct.assigned_to
         WHERE ct.club_id = p_club_id
           AND ct.is_archived = FALSE
         ORDER BY ct.due_date ASC
         LIMIT 50 -- Limit keselamatan RAM
      ) t;
  END IF;

  -- ── 7. Aktiviti kelab terbaru (limit 5) ───────────────────
  SELECT jsonb_agg(row_to_json(a))
    INTO v_activities
    FROM (
      SELECT id, title, status, priority, start_date, end_date, location
        FROM club_activities
       WHERE club_id = p_club_id
       ORDER BY start_date DESC
       LIMIT 5
    ) a;

  -- ── Return semua dalam satu JSONB ─────────────────────────
  RETURN jsonb_build_object(
    'announcement',  COALESCE(v_announcement, 'null'::jsonb),
    'members',       COALESCE(v_members,      '[]'::jsonb),
    'programs',      COALESCE(v_programs,     '[]'::jsonb),
    'task_stats',    COALESCE(v_task_stats,   '{}'::jsonb),
    'act_stats',     COALESCE(v_act_stats,    '{}'::jsonb),
    'tasks',         COALESCE(v_tasks,        '[]'::jsonb),
    'activities',    COALESCE(v_activities,   '[]'::jsonb)
  );
END;
$$;

-- Function: get_database_health_metrics (from 20260512061000_61_wal_monitoring_rpc.sql)
CREATE OR REPLACE FUNCTION public.get_database_health_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    result jsonb;
    v_max_connections int;
    v_active_connections int;
    v_idle_connections int;
    v_txid_age bigint;
    v_db_size_mb numeric;
    v_cache_hit_rate numeric;
    v_dead_tuples_pct numeric;
    v_waiting_locks int;
    v_long_running_queries int;
    v_wal_retained_bytes bigint;
    v_wal_retained_mb numeric;
    v_replication_slot_name text;
    v_replication_slot_active boolean;
    v_realtime_tables int;
    v_realtime_list_changes_calls bigint;
    v_realtime_list_changes_total_ms numeric;
    v_db_uptime_seconds numeric;
BEGIN
    SELECT setting::int INTO v_max_connections FROM pg_settings WHERE name = 'max_connections';
    SELECT count(*) INTO v_active_connections FROM pg_stat_activity WHERE state = 'active' AND backend_type = 'client backend';
    SELECT count(*) INTO v_idle_connections FROM pg_stat_activity WHERE state LIKE 'idle%' AND backend_type = 'client backend';
    SELECT max(age(datfrozenxid)) INTO v_txid_age FROM pg_database;
    SELECT round(pg_database_size(current_database()) / 1024.0 / 1024.0, 2) INTO v_db_size_mb;
    SELECT round(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) INTO v_cache_hit_rate FROM pg_stat_database;
    SELECT round(100.0 * sum(n_dead_tup) / nullif(sum(n_live_tup) + sum(n_dead_tup), 0), 2) INTO v_dead_tuples_pct FROM pg_stat_user_tables;
    SELECT count(*) INTO v_waiting_locks FROM pg_stat_activity WHERE wait_event_type = 'Lock';
    SELECT count(*) INTO v_long_running_queries FROM pg_stat_activity WHERE state = 'active' AND (now() - query_start) > interval '5 minutes';

    -- WAL Retained by Replication Slots
    SELECT slot_name, active, pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)
    INTO v_replication_slot_name, v_replication_slot_active, v_wal_retained_bytes
    FROM pg_replication_slots ORDER BY pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) DESC LIMIT 1;
    v_wal_retained_mb := COALESCE(round(v_wal_retained_bytes / 1024.0 / 1024.0, 2), 0);

    -- Realtime-enabled table count
    SELECT count(*) INTO v_realtime_tables FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

    -- list_changes call stats (graceful fallback if pg_stat_statements unavailable)
    BEGIN
        SELECT calls, round(total_exec_time::numeric, 2)
        INTO v_realtime_list_changes_calls, v_realtime_list_changes_total_ms
        FROM pg_stat_statements
        WHERE query ILIKE '%realtime.list_changes%'
        ORDER BY total_exec_time DESC LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_realtime_list_changes_calls := 0;
        v_realtime_list_changes_total_ms := 0;
    END;

    -- Database uptime
    SELECT extract(epoch FROM (now() - pg_postmaster_start_time())) INTO v_db_uptime_seconds;

    result := jsonb_build_object(
        'max_connections', v_max_connections,
        'active_connections', v_active_connections,
        'idle_connections', v_idle_connections,
        'txid_age', v_txid_age,
        'db_size_mb', v_db_size_mb,
        'cache_hit_rate_pct', COALESCE(v_cache_hit_rate, 100),
        'dead_tuples_pct', COALESCE(v_dead_tuples_pct, 0),
        'waiting_locks', v_waiting_locks,
        'long_running_queries', v_long_running_queries,
        'wal_retained_mb', v_wal_retained_mb,
        'replication_slot_name', COALESCE(v_replication_slot_name, 'none'),
        'replication_slot_active', COALESCE(v_replication_slot_active, false),
        'realtime_tables', COALESCE(v_realtime_tables, 0),
        'realtime_list_changes_calls', COALESCE(v_realtime_list_changes_calls, 0),
        'realtime_list_changes_total_ms', COALESCE(v_realtime_list_changes_total_ms, 0),
        'db_uptime_seconds', round(v_db_uptime_seconds)
    );
    RETURN result;
END;
$$;

-- Function: get_expiring_polymart_orders (from 52_polymart_online_payment.sql)
CREATE OR REPLACE FUNCTION public.get_expiring_polymart_orders()
RETURNS TABLE(id UUID, buyer_id UUID, product_name TEXT, payment_deadline_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.buyer_id,
         COALESCE(p.name, 'Produk'),
         o.payment_deadline_at
  FROM polymart_orders o
  LEFT JOIN business_products p ON p.id = o.product_id
  WHERE o.status = 'PENDING'
    AND o.payment_verified_at IS NULL
    AND o.payment_deadline_at IS NOT NULL
    AND o.payment_deadline_at BETWEEN NOW() + interval '55 minutes'
                                   AND NOW() + interval '65 minutes';
$$;

-- Function: get_karnival_booth_votes (from 38_karnival_v2.sql)
CREATE OR REPLACE FUNCTION get_karnival_booth_votes(p_edition_id UUID, p_category_id UUID)
RETURNS TABLE(booth_id UUID, booth_name TEXT, booth_number TEXT, image_url TEXT, total_votes BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT b.id, b.kelab_name, b.booth_number, b.image_url, COUNT(v.id)
  FROM karnival_booths b
  LEFT JOIN karnival_votes_v2 v ON v.booth_id = b.id
  WHERE b.edition_id = p_edition_id AND b.category_id = p_category_id AND b.is_active = true
  GROUP BY b.id, b.kelab_name, b.booth_number, b.image_url
  ORDER BY COUNT(v.id) DESC, b.kelab_name ASC;
$$;

-- Function: get_klk_public_stats (from 41_klk_public_stats_rpc.sql)
CREATE OR REPLACE FUNCTION get_klk_public_stats(academic_year_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_luar int;
  v_total_kamsis int;
  v_by_kawasan json;
  v_by_jabatan json;
  v_by_source json;
BEGIN
  -- Count totals
  SELECT count(*) INTO v_total_luar 
  FROM klk_student_residency 
  WHERE tinggal_luar = true AND academic_year = academic_year_param;

  SELECT count(*) INTO v_total_kamsis 
  FROM klk_student_residency 
  WHERE tinggal_luar = false AND academic_year = academic_year_param;

  -- Group by kawasan (top 10)
  SELECT COALESCE(json_agg(t), '[]'::json) INTO v_by_kawasan FROM (
    SELECT 
      COALESCE(NULLIF(kawasan_kediaman, 'LAIN_LAIN'), kawasan_custom, 'TIDAK DIISI') as kawasan, 
      count(*) as count
    FROM klk_student_residency
    WHERE tinggal_luar = true AND academic_year = academic_year_param
    GROUP BY 1
    ORDER BY count DESC
    LIMIT 10
  ) t;

  -- Group by jabatan
  SELECT COALESCE(json_agg(t), '[]'::json) INTO v_by_jabatan FROM (
    SELECT 
      COALESCE(jabatan, 'TIDAK DIISI') as jabatan, 
      count(*) as count
    FROM klk_student_residency
    WHERE tinggal_luar = true AND academic_year = academic_year_param
    GROUP BY 1
    ORDER BY count DESC
  ) t;

  -- Group by source
  SELECT json_build_object(
    'webapp', (SELECT count(*) FROM klk_student_residency WHERE source = 'WEBAPP' AND academic_year = academic_year_param),
    'google_form', (SELECT count(*) FROM klk_student_residency WHERE source = 'GOOGLE_FORM' AND academic_year = academic_year_param),
    'csv', (SELECT count(*) FROM klk_student_residency WHERE source = 'CSV_IMPORT' AND academic_year = academic_year_param)
  ) INTO v_by_source;

  RETURN json_build_object(
    'academic_year', academic_year_param,
    'total_luar', COALESCE(v_total_luar, 0),
    'total_kamsis', COALESCE(v_total_kamsis, 0),
    'by_kawasan', v_by_kawasan,
    'by_jabatan', v_by_jabatan,
    'by_source', v_by_source
  );
END;
$$;

-- Function: get_my_carpool_group_ids (from 50_polyrider_security_patch.sql)
CREATE OR REPLACE FUNCTION public.get_my_carpool_group_ids()
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT ARRAY(
    SELECT DISTINCT carpool_group_id 
    FROM polyrider_jobs 
    WHERE student_id = auth.uid()
      AND carpool_group_id IS NOT NULL
      AND status IN ('GATHERING', 'CARPOOL_REQUEST', 'PENDING')
  );
$function$;

-- Function: get_my_karnival_votes_in_category (from 38_karnival_v2.sql)
CREATE OR REPLACE FUNCTION get_my_karnival_votes_in_category(p_category_id UUID)
RETURNS TABLE(booth_id UUID, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT v.booth_id, v.created_at FROM karnival_votes_v2 v
  WHERE v.voter_id = auth.uid() AND v.category_id = p_category_id
  ORDER BY v.created_at DESC;
$$;

-- Function: get_my_votes (from 09_karnival_voting.sql)
CREATE OR REPLACE FUNCTION get_my_votes()
RETURNS TABLE(kelab_id TEXT, kelab_name TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT kelab_id, kelab_name, created_at
  FROM karnival_votes
  WHERE voter_id = auth.uid()
  ORDER BY created_at DESC;
$$;

-- Function: get_user_approved_club_ids (from 07_fix_multiclub_rls.sql)
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

-- Function: get_user_club_ids (from 03_multiclub.sql)
CREATE OR REPLACE FUNCTION get_user_club_ids(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE  -- Optimasi: hasil sama untuk input sama dalam 1 transaksi
AS $$
  SELECT ARRAY(
    SELECT club_id 
    FROM student_club_memberships
    WHERE user_id = p_user_id 
      AND account_status = 'APPROVED'
    ORDER BY is_primary DESC, joined_at ASC
  );
$$;

-- Function: get_vote_counts (from 09_karnival_voting.sql)
CREATE OR REPLACE FUNCTION get_vote_counts()
RETURNS TABLE(kelab_id TEXT, kelab_name TEXT, total_votes BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    kelab_id,
    kelab_name,
    COUNT(*) AS total_votes
  FROM karnival_votes
  GROUP BY kelab_id, kelab_name
  ORDER BY total_votes DESC;
$$;

-- Function: handle_polytask_bid_acceptance (from 84_polytask_v2_hotfix.sql)
CREATE OR REPLACE FUNCTION handle_polytask_bid_acceptance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.status = 'ACCEPTED' AND OLD.status != 'ACCEPTED' THEN
        UPDATE public.polytask_bids SET status = 'REJECTED' WHERE job_id = NEW.job_id AND id != NEW.id;
        UPDATE public.polytask_jobs SET status = 'IN_PROGRESS', assigned_tasker_id = NEW.tasker_id, updated_at = NOW() WHERE id = NEW.job_id;
    END IF;
    RETURN NEW;
END;
$$;

-- Function: handle_polytask_cancellation (from 84_polytask_v2_hotfix.sql)
CREATE OR REPLACE FUNCTION handle_polytask_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'WITHDRAWN' AND OLD.status = 'ACCEPTED' THEN
        UPDATE public.profiles
        SET polytask_cancellations = polytask_cancellations + 1
        WHERE id = NEW.tasker_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: has_business_shift_access (from 30_business_shifts_system.sql)
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

-- Function: has_voted_for (from 09_karnival_voting.sql)
CREATE OR REPLACE FUNCTION has_voted_for(p_kelab_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM karnival_votes
    WHERE voter_id = auth.uid()
      AND kelab_id = p_kelab_id
  );
$$;

-- Function: increment_ai_google_tokens (from 39_track_google_api_tokens.sql)
CREATE OR REPLACE FUNCTION public.increment_ai_google_tokens(tokens_used integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current bigint;
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read current value (may not exist yet)
  SELECT COALESCE(value::bigint, 0)
  INTO v_current
  FROM public.system_settings
  WHERE key = 'ai_total_tokens';

  IF FOUND THEN
    UPDATE public.system_settings
    SET value = (v_current + tokens_used)::text
    WHERE key = 'ai_total_tokens';
  ELSE
    INSERT INTO public.system_settings (key, value)
    VALUES ('ai_total_tokens', tokens_used::text);
  END IF;
END;
$$;

-- Function: increment_merit (from 11_fasa3_security_rpc.sql)
CREATE OR REPLACE FUNCTION increment_merit(
  target_user_id UUID,
  delta INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_merit INTEGER;
BEGIN
  SELECT COALESCE(merit, 0) INTO v_current_merit
  FROM profiles
  WHERE id = target_user_id
  FOR UPDATE;

  UPDATE profiles
  SET merit = GREATEST(0, v_current_merit + delta)
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % tidak dijumpai dalam profiles', target_user_id;
  END IF;
END;
$$;

-- Function: increment_merit_by_source (from 67_fix_merit_system_audit.sql)
CREATE OR REPLACE FUNCTION public.increment_merit_by_source(p_uid uuid, p_delta integer, p_src text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    merit          = COALESCE(merit, 0) + p_delta,
    merit_kelab    = CASE WHEN p_src IN ('KELAB', 'PROGRAM')
                         THEN COALESCE(merit_kelab, 0) + p_delta
                         ELSE merit_kelab END,
    merit_akademik = CASE WHEN p_src = 'AKADEMIK'
                         THEN COALESCE(merit_akademik, 0) + p_delta
                         ELSE merit_akademik END,
    merit_asrama   = CASE WHEN p_src = 'QR_SCAN'
                         THEN COALESCE(merit_asrama, 0) + p_delta
                         ELSE merit_asrama END
  WHERE id = p_uid;
END;
$$;

-- Function: increment_polymart_ad_click (from 69_polymart_ads_schema_fix.sql)
CREATE OR REPLACE FUNCTION public.increment_polymart_ad_click(ad_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.polymart_ads
    SET clicks = clicks + 1
    WHERE id = ad_id
    AND status = 'ACTIVE';
END;
$$;

-- Function: is_club_leader (from 12_fasa4_rls_hardening.sql)
CREATE OR REPLACE FUNCTION is_club_leader(p_uid UUID, p_club_id TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_club_memberships
    WHERE user_id = p_uid AND club_id = p_club_id
      AND account_status = 'APPROVED' AND role IN ('CLUB_PRESIDENT', 'CLUB_MT', 'CLUB_ADVISOR')
  );
$$;

-- Function: is_club_president (from 12_fasa4_rls_hardening.sql)
CREATE OR REPLACE FUNCTION is_club_president(p_uid UUID, p_club_id TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_club_memberships
    WHERE user_id = p_uid AND club_id = p_club_id
      AND account_status = 'APPROVED' AND role = 'CLUB_PRESIDENT'
  );
$$;

-- Function: is_jpp_admin (from 12_fasa4_rls_hardening.sql)
CREATE OR REPLACE FUNCTION is_jpp_admin(p_uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_uid AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP', 'SUPER_ADMIN'));
$$;

-- Function: is_klk_or_admin (from 50_polyrider_security_patch.sql)
CREATE OR REPLACE FUNCTION public.is_klk_or_admin(uid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    role_val TEXT;
    unit_val TEXT;
BEGIN
    SELECT role, jpp_unit INTO role_val, unit_val FROM public.profiles WHERE id = uid;
    IF role_val IN ('SUPER_ADMIN_JPP', 'STAFF') THEN
        RETURN TRUE;
    END IF;
    IF role_val = 'JPP' AND unit_val = 'KLS' THEN
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$function$;

-- Function: is_polytask_admin (from 84_polytask_v2_hotfix.sql)
CREATE OR REPLACE FUNCTION is_polytask_admin(uid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM public.profiles WHERE id = uid AND role IN ('JPP', 'SUPER_ADMIN_JPP'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: lock_polyrider_carpool (from 50_polyrider_security_patch.sql)
CREATE OR REPLACE FUNCTION public.lock_polyrider_carpool(p_group_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Change all accepted members from GATHERING to PENDING
  UPDATE polyrider_jobs
  SET status = 'PENDING', is_carpool_open = false
  WHERE carpool_group_id = p_group_id AND status = 'GATHERING';

  -- Reject any pending CARPOOL_REQUESTs
  UPDATE polyrider_jobs
  SET status = 'CANCELLED'
  WHERE carpool_group_id = p_group_id AND status = 'CARPOOL_REQUEST';
END;
$function$;

-- Function: log_polytask_critical_actions (from 84_polytask_v2_hotfix.sql)
CREATE OR REPLACE FUNCTION log_polytask_critical_actions()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'OPEN' AND OLD.status = 'IN_PROGRESS' AND OLD.assigned_tasker_id IS NOT NULL AND NEW.assigned_tasker_id IS NULL THEN
        INSERT INTO public.admin_audit_logs (actor_id, action_type, table_name, record_id, old_data, new_data)
        VALUES (OLD.assigned_tasker_id, 'UPDATE', 'polytask_jobs', OLD.id::TEXT, row_to_json(OLD), row_to_json(NEW));
    END IF;
    IF NEW.status = 'DISPUTED' AND OLD.status != 'DISPUTED' THEN
        INSERT INTO public.admin_audit_logs (actor_id, action_type, table_name, record_id, old_data, new_data)
        VALUES (COALESCE(auth.uid(), OLD.requester_id), 'UPDATE', 'polytask_jobs', OLD.id::TEXT, row_to_json(OLD), row_to_json(NEW));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: log_role_change (from 02_role_hierarchy.sql)
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name TEXT;
BEGIN
  -- Hanya log jika peranan benar-benar berubah
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;

  -- Dapatkan nama pelaku
  SELECT full_name INTO actor_name
  FROM profiles WHERE id = auth.uid();

  -- Insert ke club_logs (jika jadual ini wujud)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'club_logs') THEN
    INSERT INTO club_logs (
      club_id, 
      user_id,
      type, 
      content
    ) VALUES (
      NEW.club_id,
      auth.uid(),
      'ROLE_CHANGE',
      format(
        '[%s] menukar peranan [%s] daripada [%s] kepada [%s]',
        COALESCE(actor_name, 'Sistem'),
        COALESCE(NEW.full_name, NEW.id::text),
        OLD.role,
        NEW.role
      )
    );
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log gagal tidak sepatutnya sekat UPDATE asal
  RAISE WARNING 'log_role_change error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Function: polyrent_check_report_threshold (from 20260518120600_polyrent_fasa2.sql)
CREATE OR REPLACE FUNCTION polyrent_check_report_threshold()
RETURNS TRIGGER AS $$
DECLARE
    report_count INT;
BEGIN
    -- Kira jumlah laporan unik untuk iklan ini
    SELECT COUNT(*) INTO report_count
    FROM polyrent_reports
    WHERE listing_id = NEW.listing_id;

    -- Jika 5 laporan diterima, tukar status iklan ke 'SUSPENDED'
    IF report_count >= 5 THEN
        UPDATE polyrent_listings
        SET status = 'SUSPENDED'
        WHERE id = NEW.listing_id AND status != 'SUSPENDED';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: polyrent_get_average_rent (from 20260518115654_polyrent_fasa1_availability.sql)
CREATE OR REPLACE FUNCTION polyrent_get_average_rent(lokasi_query text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_rent numeric;
BEGIN
  -- Carian tidak sensitif huruf (ILIKE) untuk mencari purata harga bilik di kawasan tersebut
  SELECT avg(sewa_bulanan) INTO avg_rent
  FROM polyrent_listings
  WHERE lokasi ILIKE '%' || lokasi_query || '%'
  AND status = 'OPEN';
  
  RETURN COALESCE(avg_rent, 0);
END;
$$;

-- Function: process_polyrider_appeal (from 51_polyrider_cancel_sos_appeals.sql)
CREATE OR REPLACE FUNCTION public.process_polyrider_appeal(p_appeal_id uuid, p_approve boolean, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_admin_id UUID := auth.uid();
  v_appeal polyrider_appeals%ROWTYPE;
  v_admin_role TEXT;
  v_admin_unit TEXT;
BEGIN
  -- Verify admin rights
  SELECT role, jpp_unit INTO v_admin_role, v_admin_unit FROM profiles WHERE id = v_admin_id;
  IF NOT (v_admin_role IN ('SUPER_ADMIN_JPP', 'MT_OVERSEES', 'STAFF') OR (v_admin_role = 'JPP' AND v_admin_unit = 'KLS')) THEN
    RAISE EXCEPTION 'Akses dinafikan. Hanya Exco KLK dan pengurusan atasan boleh memproses rayuan.';
  END IF;

  SELECT * INTO v_appeal FROM polyrider_appeals WHERE id = p_appeal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rayuan tidak dijumpai';
  END IF;

  IF p_approve THEN
    -- Update appeal
    UPDATE polyrider_appeals
    SET status = 'APPROVED', admin_notes = p_notes, reviewed_by = v_admin_id, reviewed_at = now()
    WHERE id = p_appeal_id;

    -- Lift suspension
    UPDATE profiles SET polyrider_suspended_until = NULL WHERE id = v_appeal.user_id;
    -- Set rider profile to APPROVED if they had one (but only if it's currently suspended)
    UPDATE polyrider_profiles SET status = 'APPROVED' WHERE user_id = v_appeal.user_id AND status = 'SUSPENDED';
  ELSE
    -- Reject appeal
    UPDATE polyrider_appeals
    SET status = 'REJECTED', admin_notes = p_notes, reviewed_by = v_admin_id, reviewed_at = now()
    WHERE id = p_appeal_id;
  END IF;
END;
$function$;

-- Function: process_polytask_appeal (from 84_polytask_v2_hotfix.sql)
CREATE OR REPLACE FUNCTION process_polytask_appeal(p_appeal_id uuid, p_approve boolean, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('MAJLIS_TERTINGGI','EXCO_KEBAJIKAN','EXCO_KAMSIS','EXCO_KEUSAHAWANAN','DEVELOPER')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.polytask_appeals SET status = CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END, admin_notes = p_notes, resolved_at = NOW(), resolved_by = auth.uid() WHERE id = p_appeal_id;
  IF p_approve THEN
    UPDATE public.profiles SET polyrider_suspended_until = NULL WHERE id = (SELECT user_id FROM public.polytask_appeals WHERE id = p_appeal_id);
    UPDATE public.polytask_profiles SET status = 'APPROVED' WHERE user_id = (SELECT user_id FROM public.polytask_appeals WHERE id = p_appeal_id);
  END IF;
END;
$$;

-- Function: release_polymart_stock (from 37_polymart_pos_sync.sql)
CREATE OR REPLACE FUNCTION release_polymart_stock(
  p_product_id UUID,
  p_quantity INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE business_products
  SET reserved_stock = GREATEST(0, reserved_stock - p_quantity)
  WHERE id = p_product_id;
END;
$$;

-- Function: remove_jpp_member (from 46_reset_jpp_cohort.sql)
CREATE OR REPLACE FUNCTION remove_jpp_member(
  p_target_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role      TEXT;
  v_actor_position  TEXT;
  v_target_role     TEXT;
BEGIN
  -- 1. Dapatkan maklumat pemanggil
  SELECT role, jpp_position INTO v_actor_role, v_actor_position
  FROM profiles WHERE id = auth.uid();

  -- 2. Semak Kebenaran
  IF v_actor_role NOT IN ('SUPER_ADMIN_JPP', 'ADMIN') AND
     v_actor_position NOT IN ('YDP', 'YANG_DIPERTUA') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya YDP atau Super Admin boleh membuang ahli JPP.';
  END IF;

  -- 3. Halang buang diri sendiri
  IF auth.uid() = p_target_id THEN
    RAISE EXCEPTION 'Tidak boleh membuang peranan diri sendiri.';
  END IF;

  -- 4. Semak pengguna sasaran wujud
  SELECT role INTO v_target_role FROM profiles WHERE id = p_target_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna sasaran tidak dijumpai.';
  END IF;

  -- 5. Halang buang ADMIN
  IF v_target_role IN ('SUPER_ADMIN_JPP', 'ADMIN') THEN
    RAISE EXCEPTION 'Tidak boleh mengubah akaun Super Admin melalui fungsi ini.';
  END IF;

  -- 6. Buang penugasan MT jika ada
  DELETE FROM jpp_mt_assignments WHERE mt_user_id = p_target_id;

  -- 7. Reset role dan jawatan
  UPDATE profiles
  SET
    role         = CASE WHEN role = 'JPP' THEN 'AHLI' ELSE role END,
    jpp_position = NULL,
    jpp_unit     = NULL
  WHERE id = p_target_id;

END;
$$;

-- Function: report_polysuara_comment (from 20260529224800_98_polysuara_social_comments.sql)
CREATE OR REPLACE FUNCTION public.report_polysuara_comment(p_comment_id UUID, p_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_exists BOOLEAN;
    v_just_hidden BOOLEAN := false;
    v_reports_count INT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Semak jika pengguna sudah pernah melaporkan komen ini
    SELECT EXISTS(
        SELECT 1 FROM public.polysuara_comment_reports 
        WHERE comment_id = p_comment_id AND reporter_id = v_user_id
    ) INTO v_exists;

    IF v_exists THEN
        RAISE EXCEPTION 'Anda sudah melaporkan ulasan ini';
    END IF;

    -- Masukkan rekod laporan
    INSERT INTO public.polysuara_comment_reports (comment_id, reporter_id, reason) 
    VALUES (p_comment_id, v_user_id, p_reason);
    
    -- Kemaskini reports_count
    UPDATE public.polysuara_comments 
    SET reports_count = reports_count + 1 
    WHERE id = p_comment_id
    RETURNING reports_count INTO v_reports_count;

    -- Semak jika melebihi threshold (5 laporan)
    IF v_reports_count >= 5 THEN
        UPDATE public.polysuara_comments
        SET is_hidden_by_community = true
        WHERE id = p_comment_id;
        
        v_just_hidden := true;
    END IF;

    RETURN v_just_hidden;
END;
$$;

-- Function: request_leave_club (from 14_leave_club_rpc.sql)
CREATE OR REPLACE FUNCTION request_leave_club(p_club_id TEXT, p_is_primary BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_is_primary THEN
    -- Kelab utama (Akademik) - perlukan kelulusan Penasihat/Presiden
    -- Menukar status kepada RESIGN_PENDING
    UPDATE student_club_memberships
    SET account_status = 'RESIGN_PENDING', updated_at = NOW()
    WHERE user_id = auth.uid() AND club_id = p_club_id; -- TEXT = TEXT
  ELSE
    -- Kelab biasa/sampingan - keluar serta merta
    DELETE FROM student_club_memberships
    WHERE user_id = auth.uid() AND club_id = p_club_id; -- TEXT = TEXT

    -- Pastikan ia tidak tertinggal di profiles.club_id memandangkan ia adalah UUID
    UPDATE profiles
    SET club_id = NULL
    WHERE id = auth.uid() AND club_id = p_club_id::UUID; -- UUID = UUID
  END IF;

  RETURN TRUE;
END;
$$;

-- Function: reserve_polymart_stock (from 37_polymart_pos_sync.sql)
CREATE OR REPLACE FUNCTION reserve_polymart_stock(
  p_product_id UUID,
  p_quantity INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INT;
  v_current_reserved INT;
BEGIN
  -- Get current stock and reserved stock, locking the row
  SELECT stock_quantity, reserved_stock 
  INTO v_current_stock, v_current_reserved
  FROM business_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Check if enough available stock
  IF (v_current_stock - v_current_reserved) < p_quantity THEN
    RAISE EXCEPTION 'Insufficient available stock. Only % items available.', (v_current_stock - v_current_reserved);
  END IF;

  -- Increment reserved stock
  UPDATE business_products
  SET reserved_stock = reserved_stock + p_quantity
  WHERE id = p_product_id;
END;
$$;

-- Function: reset_jpp_cohort (from 46_reset_jpp_cohort.sql)
CREATE OR REPLACE FUNCTION reset_jpp_cohort()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role      TEXT;
  v_actor_position  TEXT;
BEGIN
  -- 1. Dapatkan maklumat pemanggil
  SELECT role, jpp_position INTO v_actor_role, v_actor_position
  FROM profiles WHERE id = auth.uid();

  -- 2. Semak Kebenaran: Hanya SUPER_ADMIN_JPP, ADMIN, atau YDP boleh jalankan
  IF v_actor_role NOT IN ('SUPER_ADMIN_JPP', 'ADMIN') AND
     v_actor_position NOT IN ('YDP', 'YANG_DIPERTUA') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya YDP atau Super Admin boleh mereset kohort JPP.';
  END IF;

  -- 3. Kosongkan semua jadual jpp_mt_assignments
  DELETE FROM jpp_mt_assignments;

  -- 4. Demote semua 'JPP' kembali kepada 'AHLI' (kecuali ADMIN/SUPER_ADMIN_JPP jika mereka ada jpp_position)
  -- Nota: Kami hanya menukar role bagi mereka yang asalnya role = 'JPP'.
  UPDATE profiles
  SET 
    role = CASE WHEN role = 'JPP' THEN 'AHLI' ELSE role END,
    jpp_position = NULL,
    jpp_unit = NULL
  WHERE role = 'JPP' OR jpp_position IS NOT NULL OR jpp_unit IS NOT NULL;

  -- 5. Rekod aktiviti ini ke dalam club_logs
  INSERT INTO club_logs (action_type, actor_name, description)
  VALUES ('COHORT_DISSOLVED', 'SISTEM (JPP)', 'Pembubaran Kohort JPP telah dijalankan. Semua ahli JPP telah di-reset kepada pengguna biasa.');

END;
$$;

-- Function: resolve_login_identifier (from 70_flexible_login_and_duplicate_detection.sql)
CREATE OR REPLACE FUNCTION resolve_login_identifier(p_identifier TEXT)
RETURNS TABLE(email TEXT, match_type TEXT, match_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
  v_count INT;
  v_email TEXT;
BEGIN
  v_clean := TRIM(p_identifier);
  
  -- A) Jika mengandungi '@', ia sudah emel — return terus
  IF v_clean LIKE '%@%' THEN
    RETURN QUERY SELECT v_clean, 'email'::TEXT, 1;
    RETURN;
  END IF;

  -- B) Cuba padankan sebagai no matrik (exact, case-insensitive)
  SELECT COUNT(*) INTO v_count
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE UPPER(p.matric_no) = UPPER(v_clean);

  IF v_count = 1 THEN
    SELECT u.email INTO v_email
    FROM profiles p
    INNER JOIN auth.users u ON u.id = p.id
    WHERE UPPER(p.matric_no) = UPPER(v_clean)
    LIMIT 1;
    
    RETURN QUERY SELECT v_email, 'matric_no'::TEXT, 1;
    RETURN;
  ELSIF v_count > 1 THEN
    -- Ada akaun berganda untuk no matrik ini — beritahu user
    RETURN QUERY SELECT NULL::TEXT, 'matric_no_duplicate'::TEXT, v_count;
    RETURN;
  END IF;

  -- C) Cuba padankan sebagai nama penuh (exact, case-insensitive)
  SELECT COUNT(*) INTO v_count
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE UPPER(p.full_name) = UPPER(v_clean);

  IF v_count = 1 THEN
    SELECT u.email INTO v_email
    FROM profiles p
    INNER JOIN auth.users u ON u.id = p.id
    WHERE UPPER(p.full_name) = UPPER(v_clean)
    LIMIT 1;
    
    RETURN QUERY SELECT v_email, 'full_name'::TEXT, 1;
    RETURN;
  ELSIF v_count > 1 THEN
    -- Ada ramai user dengan nama sama — beritahu user guna emel/matrik
    RETURN QUERY SELECT NULL::TEXT, 'full_name_duplicate'::TEXT, v_count;
    RETURN;
  END IF;

  -- D) Tiada padanan
  RETURN QUERY SELECT NULL::TEXT, 'not_found'::TEXT, 0;
  RETURN;
END;
$$;

-- Function: respond_carpool_request (from 50_polyrider_security_patch.sql)
CREATE OR REPLACE FUNCTION public.respond_carpool_request(p_request_id uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_group_id UUID;
  v_group_count INT;
BEGIN
  -- Get the group id of this request
  SELECT carpool_group_id INTO v_group_id
  FROM polyrider_jobs
  WHERE id = p_request_id AND status = 'CARPOOL_REQUEST';

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Permintaan tidak dijumpai atau sudah diproses';
  END IF;

  IF p_accept THEN
    -- Check capacity
    SELECT COUNT(*) INTO v_group_count
    FROM polyrider_jobs
    WHERE carpool_group_id = v_group_id AND status = 'GATHERING';

    IF v_group_count >= 3 THEN
      RAISE EXCEPTION 'Carpool ini sudah penuh';
    END IF;

    -- Accept request
    UPDATE polyrider_jobs SET status = 'GATHERING' WHERE id = p_request_id;

    -- If we hit 3 members, auto-lock!
    IF v_group_count + 1 = 3 THEN
      PERFORM lock_polyrider_carpool(v_group_id);
    END IF;
  ELSE
    -- Reject
    UPDATE polyrider_jobs SET status = 'CANCELLED' WHERE id = p_request_id;
  END IF;
END;
$function$;

-- Function: restore_hidden_comment (from 20260529224800_98_polysuara_social_comments.sql)
CREATE OR REPLACE FUNCTION public.restore_hidden_comment(p_comment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Hanya JPP dibenarkan memulihkan komen
    IF NOT public.is_jpp_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Reset status ulasan
    UPDATE public.polysuara_comments
    SET is_hidden_by_community = false,
        reports_count = 0,
        downvotes = 0
    WHERE id = p_comment_id;

    -- Bersihkan rekod lama bagi memberi nafas baru
    DELETE FROM public.polysuara_comment_votes
    WHERE comment_id = p_comment_id AND vote_type = 'DOWNVOTE';

    DELETE FROM public.polysuara_comment_reports
    WHERE comment_id = p_comment_id;
END;
$$;

-- Function: restore_hidden_confession (from 30_polysuara_downvote.sql)
CREATE OR REPLACE FUNCTION public.restore_hidden_confession(p_confession_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := (SELECT auth.uid());
    
    IF NOT is_jpp_admin(v_user_id) THEN
        RAISE EXCEPTION 'Not authorized — JPP admin only';
    END IF;

    UPDATE public.polysuara_confessions
    SET is_hidden_by_community = false,
        is_approved = true,
        downvotes = 0
    WHERE id = p_confession_id;
    
    DELETE FROM public.polysuara_downvotes
    WHERE confession_id = p_confession_id;
END;
$$;

-- Function: rpc_pembersihan_akaun_lama (from 27_pembubaran_kelab.sql)
CREATE OR REPLACE FUNCTION rpc_pembersihan_akaun_lama()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
    deleted_count integer;
BEGIN
    -- Delete account pengguna tidak aktif > 12 bulan (termasuk auth.users)
    -- Returns the number of rows deleted.
    WITH deleted AS (
        DELETE FROM auth.users 
        WHERE id IN (
            SELECT p.id FROM public.profiles p
            LEFT JOIN auth.users u ON u.id = p.id
            WHERE 
                (u.last_sign_in_at < NOW() - INTERVAL '12 months' OR (u.last_sign_in_at IS NULL AND u.created_at < NOW() - INTERVAL '12 months'))
                AND p.email NOT ILIKE '%admin%'
                AND p.email != 'jpp@polisas.edu.my'
        )
        RETURNING id
    )
    SELECT count(*) INTO deleted_count FROM deleted;

    IF deleted_count > 0 THEN
        INSERT INTO public.club_logs (action_type, actor_name, description)
        VALUES ('SYSTEM_MAINTENANCE', 'SISTEM (JPP)', format('Pembersihan %s akaun tidak aktif melebihi 12 bulan telah dilakukan.', deleted_count));
    END IF;

    RETURN deleted_count;
END;
$$;

-- Function: rpc_pembubaran_kohort (from 27_pembubaran_kelab.sql)
CREATE OR REPLACE FUNCTION rpc_pembubaran_kohort()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Arkib laporan & aktiviti yang Diluluskan/Selesai/COMPLETED
    UPDATE public.club_activities 
    SET is_archived = TRUE 
    WHERE status = 'selesai' AND is_archived = FALSE;

    UPDATE public.club_reports 
    SET is_archived = TRUE 
    WHERE status = 'Diluluskan' AND is_archived = FALSE;

    UPDATE public.programs 
    SET is_archived = TRUE 
    WHERE status = 'COMPLETED' AND is_archived = FALSE;

    -- 2. Delete rekod yang TIDAK diluluskan
    DELETE FROM public.club_activities WHERE is_archived = FALSE;
    DELETE FROM public.club_reports WHERE is_archived = FALSE;
    DELETE FROM public.programs WHERE is_archived = FALSE;

    -- 3. Demote Jawatankuasa (MT) ke ahli biasa (MEMBER)
    UPDATE public.student_club_memberships 
    SET role = 'MEMBER' 
    WHERE role != 'MEMBER';

    -- 4. Akaun pembersihan TIDAK lagi dilakukan di sini (Pindah ke butang asing)

    -- 5. Rekod Log
    INSERT INTO public.club_logs (action_type, actor_name, description)
    VALUES ('COHORT_DISSOLVED', 'SISTEM (JPP)', 'Pembubaran Kohort Menyeluruh (Semua Kelab) telah dijalankan. Arkib dikemaskini dan kelab di-reset.');

END;
$$;

-- Function: rpc_pembubaran_kohort_kelab (from quick_fix_pembubaran.sql)
CREATE FUNCTION public.rpc_pembubaran_kohort_kelab(target_club_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    club_uuid uuid;
BEGIN
    -- Convert text to uuid secara eksplisit
    club_uuid := target_club_id::uuid;

    -- 1. Arkib laporan & aktiviti yang Diluluskan/Selesai
    UPDATE public.club_activities 
    SET is_archived = TRUE 
    WHERE status = 'selesai' AND is_archived = FALSE AND club_id = club_uuid;

    UPDATE public.club_reports 
    SET is_archived = TRUE 
    WHERE status = 'Diluluskan' AND is_archived = FALSE AND club_id = club_uuid;

    UPDATE public.programs 
    SET is_archived = TRUE 
    WHERE status = 'COMPLETED' AND is_archived = FALSE AND club_id = club_uuid;

    -- 2. Padam rekod yang TIDAK diluluskan untuk kelab ini sahaja
    DELETE FROM public.club_activities WHERE is_archived = FALSE AND club_id = club_uuid;
    DELETE FROM public.club_reports WHERE is_archived = FALSE AND club_id = club_uuid;
    DELETE FROM public.programs WHERE is_archived = FALSE AND club_id = club_uuid;

    -- 3. Demote Jawatankuasa kepada MEMBER untuk kelab ini sahaja
    UPDATE public.student_club_memberships 
    SET role = 'MEMBER' 
    WHERE role != 'MEMBER' AND club_id = club_uuid;

    -- 4. Log
    INSERT INTO public.club_logs (action_type, actor_name, description, club_id)
    VALUES (
        'COHORT_DISSOLVED', 
        'SISTEM (JPP)', 
        'Pembubaran Kohort kelab spesifik telah dijalankan. Arkib dikemaskini dan MT di-reset.',
        club_uuid
    );

END;
$$;

-- Function: set_polyrider_job_expiry (from 52_polyrider_job_expiry.sql)
CREATE OR REPLACE FUNCTION set_polyrider_job_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set for new PENDING jobs that don't already have an expiry
  IF (TG_OP = 'INSERT') AND NEW.status = 'PENDING' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '15 minutes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: soft_or_hard_delete_polysuara_comment (from 20260529225900_99_polysuara_social_softdelete_images.sql)
CREATE OR REPLACE FUNCTION public.soft_or_hard_delete_polysuara_comment(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_replies BOOLEAN;
    v_user_id UUID;
BEGIN
    -- Semak jika auth user adalah JPP
    v_user_id := auth.uid();
    IF NOT public.is_jpp_admin(v_user_id) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Semak jika komen ini mempunyai replies (anak)
    SELECT EXISTS(
        SELECT 1 FROM public.polysuara_comments WHERE parent_id = p_comment_id
    ) INTO v_has_replies;

    IF v_has_replies THEN
        -- Lakukan Soft-Delete (Tombstone)
        UPDATE public.polysuara_comments
        SET content = 'Ulasan ini telah dipadamkan oleh moderasi JPP kerana melanggar panduan komuniti.',
            is_deleted_by_moderator = true,
            image_url = NULL, -- Padam gambar lampiran untuk keselamatan/privasi
            codename = 'Anon'
        WHERE id = p_comment_id;
        
        -- Bersihkan undian & laporan untuk elak confusion
        DELETE FROM public.polysuara_comment_votes WHERE comment_id = p_comment_id;
        DELETE FROM public.polysuara_comment_reports WHERE comment_id = p_comment_id;
        
        RETURN true; -- Menunjukkan ia telah di-soft-delete (tombstoned)
    ELSE
        -- Tiada anak, lakukan Hard-Delete terus untuk bersihkan database
        DELETE FROM public.polysuara_comments WHERE id = p_comment_id;
        RETURN false; -- Menunjukkan ia telah di-hard-delete
    END IF;
END;
$$;

-- Function: spend_ai_tokens (from 24_pro_tier_expiration_enforcer.sql)
CREATE OR REPLACE FUNCTION public.spend_ai_tokens(task_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_profile record;
    v_token_settings jsonb;
    v_rate_limit jsonb;
    v_task_cost integer;
    v_daily_usage integer;
    v_last_usage_reset timestamptz;
    v_warning_threshold int;
    v_block_threshold int;
    v_new_status text;
    v_new_balance int;
    v_token_last_reset timestamptz;
    v_tier text;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN false; END IF;

    -- 1. Grab settings
    SELECT value INTO v_token_settings FROM public.system_settings WHERE key = 'ai_token_settings';
    SELECT value INTO v_rate_limit FROM system_settings WHERE key = 'ai_rate_limit';
    v_warning_threshold := COALESCE((v_rate_limit->>'warning_threshold')::int, 50);
    v_block_threshold := COALESCE((v_rate_limit->>'block_threshold')::int, 65);
    
    -- 2. Fetch profile
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    v_daily_usage := COALESCE(v_profile.ai_daily_usage, 0);
    v_last_usage_reset := COALESCE(v_profile.ai_last_reset, now() - INTERVAL '2 days');
    v_new_status := COALESCE(v_profile.ai_status, 'active');
    v_new_balance := COALESCE(v_profile.ai_token_balance, 0);
    v_token_last_reset := COALESCE(v_profile.ai_token_last_reset, now() - INTERVAL '2 months');
    v_tier := COALESCE(v_profile.subscription_tier, 'free');

    -- APPLY EXPIRE CHECK (Do not touch their balance though according to user rules)
    IF v_profile.ai_tier_expiration IS NOT NULL AND now() > v_profile.ai_tier_expiration THEN
        v_tier := 'free';
    END IF;

    -- 3. Check and apply daily safety reset
    IF now() > v_last_usage_reset + INTERVAL '24 hours' THEN
        v_daily_usage := 0;
        v_new_status := 'active';
        v_last_usage_reset := now();
    END IF;

    -- 4. Check and apply monthly token reset
    IF date_trunc('month', v_token_last_reset AT TIME ZONE 'Asia/Kuala_Lumpur') < date_trunc('month', now() AT TIME ZONE 'Asia/Kuala_Lumpur') THEN
        IF v_tier = 'pro' THEN
          v_new_balance := COALESCE((v_token_settings->>'pro_tier_tokens')::int, 1000);
        ELSE
          v_new_balance := COALESCE((v_token_settings->>'free_tier_tokens')::int, 200);
        END IF;
        v_token_last_reset := now();
    END IF;

    -- 5. Calculate Cost and Deduct
    v_task_cost := COALESCE((v_token_settings->'costs'->>task_name)::int, 0);
    
    IF v_task_cost > 0 THEN
       IF v_new_balance >= v_task_cost THEN
          v_new_balance := v_new_balance - v_task_cost;
       ELSE
          RETURN false;
       END IF;
    END IF;

    -- 6. Increment Anti-Spam Counter (Chat also counts as 1 interaction)
    v_daily_usage := v_daily_usage + 1;
    IF v_daily_usage > v_block_threshold THEN
        v_new_status := 'flagged';
        -- Notify Admin of spam
        INSERT INTO public.notifications (user_id, title, message)
        SELECT id, '🚨 Aktiviti Spam AI Dikesan', 'Pengguna ' || COALESCE(v_profile.full_name, v_profile.email) || ' melepasi had harian (' || v_block_threshold::text || '). Akaun digantung sementara.'
        FROM public.profiles WHERE role = 'SUPER_ADMIN_JPP';
    ELSIF v_daily_usage > v_warning_threshold AND v_new_status != 'flagged' THEN
        v_new_status := 'warned';
    END IF;

    -- 7. Performance Update
    IF v_tier = 'free' AND v_profile.ai_tier_expiration IS NOT NULL AND now() > v_profile.ai_tier_expiration THEN
        -- Strip out the expiration marker completely
        UPDATE profiles
        SET 
            ai_token_balance = v_new_balance,
            ai_token_last_reset = v_token_last_reset,
            ai_daily_usage = v_daily_usage,
            ai_last_reset = v_last_usage_reset,
            ai_status = v_new_status,
            subscription_tier = 'free',
            ai_tier_expiration = NULL
        WHERE id = v_user_id;

        INSERT INTO public.notifications(user_id, title, content)
        VALUES (v_user_id, 'Langganan PRO Tamat ⏱️', 'Tempoh langganan 30 hari PRO Tier Nexus anda telah tamat. Profil anda telah dikembalikan kepada Free Tier.');

    ELSE
        UPDATE profiles
        SET 
            ai_token_balance = v_new_balance,
            ai_token_last_reset = v_token_last_reset,
            ai_daily_usage = v_daily_usage,
            ai_last_reset = v_last_usage_reset,
            ai_status = v_new_status
        WHERE id = v_user_id;
    END IF;

    -- 8. Archive usage for Audit (Deep Analysis)
    IF v_task_cost > 0 THEN 
        INSERT INTO ai_usage_logs(user_id, task_name, token_cost) 
        VALUES (v_user_id, task_name, v_task_cost);
    END IF;

    RETURN true;
END;
$function$;

-- Function: submit_polyservices_report (from 86_polyservices_moderation.sql)
CREATE OR REPLACE FUNCTION submit_polyservices_report(
    p_target_id UUID,
    p_target_type VARCHAR,
    p_reason VARCHAR
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reporter_id UUID;
    v_config RECORD;
    v_recent_reports_count INTEGER;
BEGIN
    v_reporter_id := auth.uid();
    IF v_reporter_id IS NULL THEN
        RAISE EXCEPTION 'Sila log masuk untuk membuat laporan.';
    END IF;

    -- 1. Insert report
    INSERT INTO public.polyservices_reports (target_id, target_type, reporter_id, reason)
    VALUES (p_target_id, p_target_type, v_reporter_id, p_reason)
    ON CONFLICT (target_id, reporter_id) DO NOTHING;

    -- 2. Ambil konfigurasi semasa
    SELECT * INTO v_config FROM public.polyservices_moderation_config WHERE id = 1;

    -- 3. Kira jumlah laporan dalam tempoh masa (time_window_mins)
    SELECT COUNT(*) INTO v_recent_reports_count 
    FROM public.polyservices_reports
    WHERE target_id = p_target_id 
    AND created_at >= NOW() - (v_config.time_window_mins || ' minutes')::INTERVAL;

    -- 4. Jika melebihi threshold, auto-hide
    IF v_recent_reports_count >= v_config.report_threshold THEN
        IF p_target_type = 'SUARA' THEN
            UPDATE public.polysuara_confessions SET is_approved = false WHERE id = p_target_id;
        ELSIF p_target_type = 'MATCH' THEN
            UPDATE public.polymatch_listings SET is_approved = false WHERE id = p_target_id;
        END IF;
        
        RETURN jsonb_build_object('success', true, 'auto_hidden', true, 'reports', v_recent_reports_count);
    END IF;

    RETURN jsonb_build_object('success', true, 'auto_hidden', false, 'reports', v_recent_reports_count);
END;
$$;

-- Function: supsas_claim_invite_code (from 36_supsas_schema.sql)
CREATE OR REPLACE FUNCTION supsas_claim_invite_code(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kontingen supsas_kontingen%ROWTYPE;
BEGIN
  -- Semak auth
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Anda perlu log masuk dahulu.');
  END IF;

  -- Cari kontingen dengan kod ini
  SELECT * INTO v_kontingen
  FROM supsas_kontingen
  WHERE invite_code = p_invite_code AND invite_used = FALSE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Kod jemputan tidak sah atau telah digunakan.');
  END IF;

  -- Semak jika user ini dah jadi ketua kontingen lain dalam edisi yang sama
  IF EXISTS (
    SELECT 1 FROM supsas_kontingen
    WHERE edition_id = v_kontingen.edition_id AND leader_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Anda sudah menjadi ketua kontingen lain dalam edisi ini.');
  END IF;

  -- Assign ketua
  UPDATE supsas_kontingen
  SET leader_id = auth.uid(), invite_used = TRUE, updated_at = NOW()
  WHERE id = v_kontingen.id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'kontingen_id', v_kontingen.id,
    'kontingen_name', v_kontingen.name
  );
END;
$$;

-- Function: supsas_revoke_leader (from 36_supsas_schema.sql)
CREATE OR REPLACE FUNCTION supsas_revoke_leader(p_kontingen_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP') THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  UPDATE supsas_kontingen
  SET leader_id = NULL, invite_used = FALSE, updated_at = NOW()
  WHERE id = p_kontingen_id;

  RETURN TRUE;
END;
$$;

-- Function: supsas_set_updated_at (from 36_supsas_schema.sql)
CREATE OR REPLACE FUNCTION supsas_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- Function: sync_polysuara_comment_count (from 20260529224800_98_polysuara_social_comments.sql)
CREATE OR REPLACE FUNCTION public.sync_polysuara_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.polysuara_confessions 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.confession_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.polysuara_confessions 
        SET comments_count = comments_count - 1 
        WHERE id = OLD.confession_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: toggle_jpp_role (from 35_security_jpp_profile_rpc.sql)
CREATE OR REPLACE FUNCTION toggle_jpp_role(
  p_target_id UUID
)
RETURNS TEXT  -- Mengembalikan role baharu
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role     TEXT;
  v_actor_position TEXT;
  v_target_role    TEXT;
  v_new_role       TEXT;
BEGIN
  -- Dapatkan maklumat pemanggil
  SELECT role, jpp_position INTO v_actor_role, v_actor_position
  FROM profiles WHERE id = auth.uid();

  -- Hanya SUPER_ADMIN_JPP atau YDP
  IF v_actor_role NOT IN ('SUPER_ADMIN_JPP', 'ADMIN') AND
     v_actor_position NOT IN ('YDP', 'YANG_DIPERTUA') THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  -- Tidak boleh ubah diri sendiri
  IF auth.uid() = p_target_id THEN
    RAISE EXCEPTION 'Tidak boleh mengubah peranan diri sendiri.';
  END IF;

  -- Dapatkan role semasa pengguna sasaran
  SELECT role INTO v_target_role FROM profiles WHERE id = p_target_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna tidak dijumpai.';
  END IF;

  -- Jangan benarkan ubah SUPER_ADMIN_JPP atau ADMIN
  IF v_target_role IN ('SUPER_ADMIN_JPP', 'ADMIN') THEN
    RAISE EXCEPTION 'Tidak boleh mengubah akaun Admin.';
  END IF;

  -- Toggle: JPP → AHLI, semua lain → JPP
  v_new_role := CASE WHEN v_target_role = 'JPP' THEN 'AHLI' ELSE 'JPP' END;

  UPDATE profiles SET role = v_new_role WHERE id = p_target_id;

  RETURN v_new_role;
END;
$$;

-- Function: toggle_polysuara_comment_vote (from 20260529224800_98_polysuara_social_comments.sql)
CREATE OR REPLACE FUNCTION public.toggle_polysuara_comment_vote(p_comment_id UUID, p_vote_type VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_exists BOOLEAN;
    v_current_vote VARCHAR;
    v_just_hidden BOOLEAN := false;
    v_total_votes INT;
    v_downvotes_count INT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_vote_type NOT IN ('UPVOTE', 'DOWNVOTE') THEN
        RAISE EXCEPTION 'Invalid vote type';
    END IF;

    -- Semak jika undian sedia ada wujud
    SELECT EXISTS(
        SELECT 1 FROM public.polysuara_comment_votes 
        WHERE comment_id = p_comment_id AND user_id = v_user_id
    ) INTO v_exists;

    IF v_exists THEN
        SELECT vote_type INTO v_current_vote 
        FROM public.polysuara_comment_votes
        WHERE comment_id = p_comment_id AND user_id = v_user_id;

        IF v_current_vote = p_vote_type THEN
            -- Padam undian (Toggle OFF)
            DELETE FROM public.polysuara_comment_votes 
            WHERE comment_id = p_comment_id AND user_id = v_user_id;
            
            IF p_vote_type = 'UPVOTE' THEN
                UPDATE public.polysuara_comments 
                SET upvotes = upvotes - 1 
                WHERE id = p_comment_id;
            ELSE
                UPDATE public.polysuara_comments 
                SET downvotes = downvotes - 1 
                WHERE id = p_comment_id;
            END IF;
        ELSE
            -- Tukar jenis undian (Toggle mutual exclusion)
            UPDATE public.polysuara_comment_votes 
            SET vote_type = p_vote_type 
            WHERE comment_id = p_comment_id AND user_id = v_user_id;
            
            IF p_vote_type = 'UPVOTE' THEN
                UPDATE public.polysuara_comments 
                SET upvotes = upvotes + 1, downvotes = downvotes - 1 
                WHERE id = p_comment_id;
            ELSE
                UPDATE public.polysuara_comments 
                SET downvotes = downvotes + 1, upvotes = upvotes - 1 
                WHERE id = p_comment_id;
            END IF;
        END IF;
    ELSE
        -- Masukkan undian baru
        INSERT INTO public.polysuara_comment_votes (comment_id, user_id, vote_type) 
        VALUES (p_comment_id, v_user_id, p_vote_type);
        
        IF p_vote_type = 'UPVOTE' THEN
            UPDATE public.polysuara_comments 
            SET upvotes = upvotes + 1 
            WHERE id = p_comment_id;
        ELSE
            UPDATE public.polysuara_comments 
            SET downvotes = downvotes + 1 
            WHERE id = p_comment_id;
        END IF;
    END IF;

    -- Semak community auto-hide threshold untuk komen (min 10 votes, >70% downvote ratio)
    SELECT upvotes + downvotes, downvotes INTO v_total_votes, v_downvotes_count
    FROM public.polysuara_comments
    WHERE id = p_comment_id;

    IF v_total_votes >= 10 AND (v_downvotes_count::float / v_total_votes::float) > 0.70 THEN
        UPDATE public.polysuara_comments
        SET is_hidden_by_community = true
        WHERE id = p_comment_id;
        
        v_just_hidden := true;
    END IF;

    RETURN v_just_hidden;
END;
$$;

-- Function: toggle_polysuara_downvote (from 30_polysuara_downvote.sql)
CREATE OR REPLACE FUNCTION public.toggle_polysuara_downvote(p_confession_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_exists BOOLEAN;
    v_upvotes INT;
    v_downvotes INT;
    v_total_votes INT;
    v_just_hidden BOOLEAN := false;
BEGIN
    v_user_id := (SELECT auth.uid());
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM public.polysuara_downvotes 
        WHERE confession_id = p_confession_id AND user_id = v_user_id
    ) INTO v_exists;

    IF v_exists THEN
        DELETE FROM public.polysuara_downvotes 
        WHERE confession_id = p_confession_id AND user_id = v_user_id;
        
        UPDATE public.polysuara_confessions 
        SET downvotes = GREATEST(downvotes - 1, 0)
        WHERE id = p_confession_id;
    ELSE
        -- Remove upvote if exists (mutual exclusion)
        DELETE FROM public.polysuara_upvotes
        WHERE confession_id = p_confession_id AND user_id = v_user_id;
        
        IF FOUND THEN
            UPDATE public.polysuara_confessions 
            SET upvotes = GREATEST(upvotes - 1, 0)
            WHERE id = p_confession_id;
        END IF;

        INSERT INTO public.polysuara_downvotes (confession_id, user_id) 
        VALUES (p_confession_id, v_user_id);
        
        UPDATE public.polysuara_confessions 
        SET downvotes = downvotes + 1 
        WHERE id = p_confession_id
        RETURNING upvotes, downvotes INTO v_upvotes, v_downvotes;

        -- AUTO-HIDE: Total >= 40 AND Downvote > 60%
        v_total_votes := v_upvotes + v_downvotes;
        
        IF v_total_votes >= 40 AND (v_downvotes::FLOAT / v_total_votes::FLOAT) > 0.60 THEN
            UPDATE public.polysuara_confessions
            SET is_hidden_by_community = true
            WHERE id = p_confession_id AND is_hidden_by_community = false;
            
            IF FOUND THEN
                v_just_hidden := true;
            END IF;
        END IF;
    END IF;

    RETURN v_just_hidden;
END;
$$;

-- Function: toggle_polysuara_upvote (from 84_polysuara_schema.sql)
CREATE OR REPLACE FUNCTION toggle_polysuara_upvote(p_confession_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_exists BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Semak jika upvote sudah ada
    SELECT EXISTS(
        SELECT 1 FROM public.polysuara_upvotes 
        WHERE confession_id = p_confession_id AND user_id = v_user_id
    ) INTO v_exists;

    IF v_exists THEN
        -- Buang upvote
        DELETE FROM public.polysuara_upvotes 
        WHERE confession_id = p_confession_id AND user_id = v_user_id;
        
        UPDATE public.polysuara_confessions 
        SET upvotes = upvotes - 1 
        WHERE id = p_confession_id;
    ELSE
        -- Tambah upvote
        INSERT INTO public.polysuara_upvotes (confession_id, user_id) 
        VALUES (p_confession_id, v_user_id);
        
        UPDATE public.polysuara_confessions 
        SET upvotes = upvotes + 1 
        WHERE id = p_confession_id;
    END IF;
END;
$$;

-- Function: track_ai_flash_usage (from 20_ai_flash_rate_limiting.sql)
CREATE OR REPLACE FUNCTION public.track_ai_flash_usage(action text DEFAULT 'track')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_usage int;
  v_last_reset timestamptz;
  v_settings jsonb;
  v_daily_limit int;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read settings
  SELECT value INTO v_settings FROM public.system_settings WHERE key = 'ai_flash_rate_limit';
  v_daily_limit := COALESCE((v_settings->>'daily_limit')::int, 3);

  -- Read profile
  SELECT ai_flash_daily_usage, ai_flash_last_reset
  INTO v_current_usage, v_last_reset
  FROM public.profiles 
  WHERE id = v_user_id;

  -- Default to 0 if null
  v_current_usage := COALESCE(v_current_usage, 0);

  -- 1. Check daily reset logic (Reset if 24 hours have passed or if the day has changed)
  -- To be safer, we reset if it's a different calendar day:
  IF date_trunc('day', v_last_reset AT TIME ZONE 'Asia/Kuala_Lumpur') < date_trunc('day', now() AT TIME ZONE 'Asia/Kuala_Lumpur') THEN
    v_current_usage := 0;
    v_last_reset := now();
    IF action = 'track' THEN
       UPDATE public.profiles SET ai_flash_daily_usage = 0, ai_flash_last_reset = v_last_reset WHERE id = v_user_id;
    END IF;
  END IF;

  -- 2. If 'check', just return current status
  IF action = 'check' THEN
    RETURN jsonb_build_object(
      'current_usage', v_current_usage,
      'daily_limit', v_daily_limit,
      'can_use', v_current_usage < v_daily_limit
    );
  END IF;

  -- 3. If track, check if allowed
  IF v_current_usage >= v_daily_limit THEN
    RAISE EXCEPTION 'FLASH_QUOTA_EXCEEDED';
  END IF;

  -- 4. Increment usage
  v_current_usage := v_current_usage + 1;

  -- 5. Save update
  UPDATE public.profiles
  SET ai_flash_daily_usage = v_current_usage,
      ai_flash_last_reset = v_last_reset
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
      'current_usage', v_current_usage,
      'daily_limit', v_daily_limit,
      'can_use', v_current_usage < v_daily_limit
  );
END;
$$;

-- Function: track_ai_pro_usage (from 19_ai_pro_rate_limiting.sql)
CREATE OR REPLACE FUNCTION public.track_ai_pro_usage(action text DEFAULT 'track')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_usage int;
  v_last_reset timestamptz;
  v_settings jsonb;
  v_monthly_limit int;
  v_status text;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read settings
  SELECT value INTO v_settings FROM public.system_settings WHERE key = 'ai_pro_rate_limit';
  v_monthly_limit := COALESCE((v_settings->>'monthly_limit')::int, 4);

  -- Read profile
  SELECT ai_pro_monthly_usage, ai_pro_last_reset
  INTO v_current_usage, v_last_reset
  FROM public.profiles 
  WHERE id = v_user_id;

  -- Default to 0 if null
  v_current_usage := COALESCE(v_current_usage, 0);

  -- 1. Check monthly reset logic (Reset if the month has changed)
  IF date_trunc('month', v_last_reset) < date_trunc('month', now()) THEN
    v_current_usage := 0;
    v_last_reset := now();
    IF action = 'track' THEN
       UPDATE public.profiles SET ai_pro_monthly_usage = 0, ai_pro_last_reset = v_last_reset WHERE id = v_user_id;
    END IF;
  END IF;

  -- 2. If 'check', just return current status
  IF action = 'check' THEN
    RETURN jsonb_build_object(
      'current_usage', v_current_usage,
      'monthly_limit', v_monthly_limit,
      'can_use', v_current_usage < v_monthly_limit
    );
  END IF;

  -- 3. If track, check if allowed
  IF v_current_usage >= v_monthly_limit THEN
    RAISE EXCEPTION 'PRO_QUOTA_EXCEEDED';
  END IF;

  -- 4. Increment usage
  v_current_usage := v_current_usage + 1;

  -- 5. Save update
  UPDATE public.profiles
  SET ai_pro_monthly_usage = v_current_usage,
      ai_pro_last_reset = v_last_reset
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
      'current_usage', v_current_usage,
      'monthly_limit', v_monthly_limit,
      'can_use', v_current_usage < v_monthly_limit
  );
END;
$$;

-- Function: track_ai_usage (from 18_ai_rate_limiting.sql)
CREATE OR REPLACE FUNCTION public.track_ai_usage()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_usage int;
  v_last_reset timestamptz;
  v_status text;
  v_settings jsonb;
  v_warning_threshold int;
  v_block_threshold int;
  v_new_status text;
  v_user_name text;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read settings
  SELECT value INTO v_settings FROM public.system_settings WHERE key = 'ai_rate_limit';
  v_warning_threshold := COALESCE((v_settings->>'warning_threshold')::int, 50);
  v_block_threshold := COALESCE((v_settings->>'block_threshold')::int, 65);

  -- Read profile
  SELECT ai_daily_usage, ai_last_reset, ai_status, full_name
  INTO v_current_usage, v_last_reset, v_status, v_user_name
  FROM public.profiles 
  WHERE id = v_user_id;

  -- 1. Check permanent ban
  IF v_status = 'permanent_ban' THEN
    RAISE EXCEPTION 'BANNED';
  END IF;

  -- 2. Check 24 hour reset logic
  IF now() > v_last_reset + INTERVAL '24 hours' THEN
    v_current_usage := 0;
    v_status := 'active';
    v_last_reset := now();
  END IF;

  -- 3. Check if currently blocked (flagged) and hasn't been reset yet
  IF v_status = 'flagged' THEN
    RAISE EXCEPTION 'BANNED';
  END IF;

  -- 4. Increment usage
  v_current_usage := COALESCE(v_current_usage, 0) + 1;
  v_new_status := v_status;

  -- 5. Check thresholds
  IF v_current_usage > v_block_threshold THEN
    v_new_status := 'flagged';
    
    -- Option: Send notification to SUPER_ADMIN_JPP
    INSERT INTO public.notifications (user_id, title, message)
    SELECT id, '🚨 Aktiviti Spam AI Dikesan', 'Akaun pengguna ' || COALESCE(v_user_name, 'Unknown') || ' melepasi nilai Block Threshold (' || v_block_threshold::text || ' requests). Akses digantung untuk 24 jam.'
    FROM public.profiles
    WHERE role = 'SUPER_ADMIN_JPP';

    -- Update the profile manually to 'flagged' before throwing error
    UPDATE public.profiles
    SET ai_daily_usage = v_current_usage,
        ai_last_reset = v_last_reset,
        ai_status = v_new_status
    WHERE id = v_user_id;
    
    RAISE EXCEPTION 'BANNED';
  ELSIF v_current_usage > v_warning_threshold THEN
    v_new_status := 'warned';
  END IF;

  -- 6. Save update
  UPDATE public.profiles
  SET ai_daily_usage = v_current_usage,
      ai_last_reset = v_last_reset,
      ai_status = v_new_status
  WHERE id = v_user_id;

  RETURN v_new_status;
END;
$$;

-- Function: transfer_business_ownership (from 33_transfer_business_ownership.sql)
CREATE OR REPLACE FUNCTION transfer_business_ownership(p_business_id UUID, p_new_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_owner_id UUID;
  v_is_new_owner_member BOOLEAN;
BEGIN
  -- Validate business and get current owner
  SELECT owner_id INTO v_current_owner_id
  FROM keusahawanan_businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perniagaan tidak ditemui.';
  END IF;

  -- Ensure either the current owner OR an admin is making this request
  IF v_current_owner_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ) THEN
    RAISE EXCEPTION 'Akses ditolak. Anda bukan pemilik perniagaan ini.';
  END IF;

  -- Ensure the new owner is an ACTIVE member of the business
  SELECT EXISTS(
    SELECT 1 FROM student_business_memberships
    WHERE business_id = p_business_id AND user_id = p_new_owner_id AND status = 'ACTIVE'
  ) INTO v_is_new_owner_member;

  IF NOT v_is_new_owner_member THEN
    RAISE EXCEPTION 'Pemilik baharu mestilah seorang ahli aktif di dalam perniagaan ini.';
  END IF;

  -- 1. Downgrade current owner to 'MEMBER' (if they are still listed)
  UPDATE student_business_memberships
  SET role = 'MEMBER'
  WHERE business_id = p_business_id AND user_id = v_current_owner_id;

  -- 2. Upgrade new user to 'OWNER'
  UPDATE student_business_memberships
  SET role = 'OWNER'
  WHERE business_id = p_business_id AND user_id = p_new_owner_id;

  -- 3. Change owner_id in keusahawanan_businesses
  UPDATE keusahawanan_businesses
  SET owner_id = p_new_owner_id
  WHERE id = p_business_id;

  RETURN TRUE;
END;
$$;

-- Function: update_jpp_member_profile (from 35_security_jpp_profile_rpc.sql)
CREATE OR REPLACE FUNCTION update_jpp_member_profile(
  p_target_id   UUID,
  p_jpp_position TEXT,
  p_jpp_unit    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role      TEXT;
  v_actor_position  TEXT;
BEGIN
  -- Dapatkan maklumat pemanggil
  SELECT role, jpp_position INTO v_actor_role, v_actor_position
  FROM profiles WHERE id = auth.uid();

  -- Hanya SUPER_ADMIN_JPP atau YDP yang boleh buat ini
  IF v_actor_role NOT IN ('SUPER_ADMIN_JPP', 'ADMIN') AND
     v_actor_position NOT IN ('YDP', 'YANG_DIPERTUA') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya YDP atau Super Admin boleh mengemaskini jawatan ahli JPP.';
  END IF;

  -- Tidak boleh ubah diri sendiri melalui fungsi ini
  IF auth.uid() = p_target_id THEN
    RAISE EXCEPTION 'Tidak boleh mengemaskini profil sendiri melalui fungsi ini.';
  END IF;

  -- Kemaskini jpp_position dan jpp_unit sahaja (BUKAN role global)
  UPDATE profiles
  SET
    jpp_position = NULLIF(p_jpp_position, ''),
    jpp_unit     = NULLIF(p_jpp_unit, '')
  WHERE id = p_target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna sasaran tidak dijumpai: %', p_target_id;
  END IF;
END;
$$;

-- Function: update_polytask_completion_metrics (from 84_polytask_v2_hotfix.sql)
CREATE OR REPLACE FUNCTION update_polytask_completion_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        IF NEW.assigned_tasker_id IS NOT NULL THEN
            UPDATE public.profiles
            SET polytask_completed_bids = polytask_completed_bids + 1
            WHERE id = NEW.assigned_tasker_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: update_product_variation_stock (from 20260527162700_97_fix_update_product_variation_stock_updated_at.sql)
CREATE OR REPLACE FUNCTION public.update_product_variation_stock(
  p_product_id uuid,
  p_variation text,
  p_qty_change integer,
  p_reserved_change integer
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_variations JSONB;
  v_var RECORD;
  v_found BOOLEAN := FALSE;
  v_new_variations JSONB := '[]'::jsonb;
  v_total_stock INT := 0;
  v_total_reserved INT := 0;
BEGIN
  -- Dapatkan senarai variasi semasa berserta baris dikunci untuk elak race condition
  SELECT variations
  INTO v_variations
  FROM business_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak wujud.';
  END IF;

  -- Jika variasi dibekalkan dan produk memang mempunyai senarai variasi
  IF p_variation IS NOT NULL AND p_variation <> '' AND jsonb_array_length(COALESCE(v_variations, '[]'::jsonb)) > 0 THEN
    FOR v_var IN SELECT * FROM jsonb_to_recordset(v_variations) AS x(name TEXT, stock INT, reserved INT) LOOP
      IF v_var.name = p_variation THEN
        v_var.stock := GREATEST(0, v_var.stock + p_qty_change);
        v_var.reserved := GREATEST(0, COALESCE(v_var.reserved, 0) + p_reserved_change);
        
        -- Sahkan stok fizikal mencukupi berbanding stok ditempah
        IF v_var.stock < v_var.reserved THEN
          RAISE EXCEPTION 'Stok variasi % tidak mencukupi. Stok: %, Ditempah: %', v_var.name, v_var.stock, v_var.reserved;
        END IF;
        
        v_found := TRUE;
      END IF;

      v_new_variations := v_new_variations || jsonb_build_object(
        'name', v_var.name,
        'stock', v_var.stock,
        'reserved', COALESCE(v_var.reserved, 0)
      );
      v_total_stock := v_total_stock + v_var.stock;
      v_total_reserved := v_total_reserved + COALESCE(v_var.reserved, 0);
    END LOOP;

    IF NOT v_found THEN
      RAISE EXCEPTION 'Variasi % tidak wujud pada produk ini.', p_variation;
    END IF;

    -- Simpan semula ke dalam business_products
    UPDATE business_products
    SET 
      variations = v_new_variations,
      stock_quantity = v_total_stock,
      reserved_stock = v_total_reserved
    WHERE id = p_product_id;

  ELSE
    -- Tiada variasi, kemas kini kuantiti utama produk secara biasa
    UPDATE business_products
    SET 
      stock_quantity = GREATEST(0, stock_quantity + p_qty_change),
      reserved_stock = GREATEST(0, reserved_stock + p_reserved_change)
    WHERE id = p_product_id;
  END IF;
END;
$function$;

-- Function: update_rider_avg_rating (from 50_polyrider_security_patch.sql)
CREATE OR REPLACE FUNCTION public.update_rider_avg_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.student_rating IS NOT NULL AND (OLD.student_rating IS NULL OR OLD.student_rating != NEW.student_rating) THEN
    UPDATE polyrider_profiles SET
      avg_rating = (
        SELECT ROUND(AVG(student_rating)::NUMERIC, 2)
        FROM polyrider_jobs
        WHERE rider_id = NEW.rider_id AND student_rating IS NOT NULL
      ),
      total_trips = (
        SELECT COUNT(*) FROM polyrider_jobs
        WHERE rider_id = NEW.rider_id AND status = 'COMPLETED'
      )
    WHERE user_id = NEW.rider_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Function: update_user_ai_tier (from 23_pro_tier_payment.sql)
CREATE OR REPLACE FUNCTION update_user_ai_tier(target_user_id UUID, new_tier TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role text;
    settings_record record;
    new_balance integer;
BEGIN
    -- 1. Check if caller is admin
    SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
    IF caller_role NOT IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP') THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya admin yang boleh membuat perubahan AI Tier.';
    END IF;

    -- 2. Validate tier
    IF new_tier NOT IN ('free', 'pro', 'admin') THEN
        RAISE EXCEPTION 'Pilihan tier tidak sah. Sila gunakan "free", "pro", atau "admin".';
    END IF;

    -- 3. Calculate initial token supply for the new tier
    SELECT * INTO settings_record FROM system_settings WHERE key = 'ai_token_settings';
    
    IF new_tier = 'pro' THEN
        new_balance := COALESCE((settings_record.value->>'pro_tier_tokens')::integer, 1000);
    ELSIF new_tier = 'free' THEN
        new_balance := COALESCE((settings_record.value->>'free_tier_tokens')::integer, 200);
    ELSE
        -- Default for admin etc
        new_balance := COALESCE((settings_record.value->>'pro_tier_tokens')::integer, 1000);
    END IF;

    -- 4. Update the profile with expiration logic
    IF new_tier = 'pro' THEN
        UPDATE profiles
        SET 
            subscription_tier = new_tier,
            ai_token_balance = LEAST(COALESCE(ai_token_balance, 0) + new_balance, 2000),
            ai_token_last_reset = NOW(),
            ai_tier_expiration = NOW() + interval '30 days'
        WHERE id = target_user_id;
    ELSE
        UPDATE profiles
        SET 
            subscription_tier = new_tier,
            ai_token_balance = LEAST(COALESCE(ai_token_balance, 0) + new_balance, 2000),
            ai_token_last_reset = NOW(),
            ai_tier_expiration = NULL
        WHERE id = target_user_id;
    END IF;

    -- 5. Update ai_tier_requests if any pending is approved
    UPDATE ai_tier_requests
    SET 
        status = 'APPROVED',
        updated_at = NOW()
    WHERE user_id = target_user_id AND requested_tier = new_tier AND status = 'PENDING';

END;
$$;

-- Function: vendor_handle_cancellation (from 20260527162500_95_polymart_jsonb_variations.sql)
CREATE OR REPLACE FUNCTION vendor_handle_cancellation(
  p_order_id UUID,
  p_vendor_id UUID,
  p_action TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Lock and fetch order
  SELECT o.status, o.product_id, o.quantity, o.business_id, o.cancellation_requested_at, o.selected_variation,
         b.owner_id as business_owner_id
  INTO v_order
  FROM polymart_orders o
  JOIN keusahawanan_businesses b ON b.id = o.business_id
  WHERE o.id = p_order_id
  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak wujud.';
  END IF;

  -- Verify vendor owns the business or is an active member
  IF v_order.business_owner_id != p_vendor_id AND NOT EXISTS (
    SELECT 1 FROM student_business_memberships 
    WHERE user_id = p_vendor_id AND business_id = v_order.business_id AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Anda bukan pemilik atau ahli aktif perniagaan ini.';
  END IF;

  -- Must have cancellation request pending
  IF v_order.cancellation_requested_at IS NULL THEN
    RAISE EXCEPTION 'Tiada permintaan pembatalan untuk pesanan ini.';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE polymart_orders
    SET status = 'CANCELLED',
        cancelled_at = NOW(),
        cancelled_by = p_vendor_id,
        cancel_reason = cancellation_reason,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Release reserved stock using helper
    PERFORM update_product_variation_stock(v_order.product_id, v_order.selected_variation, 0, -v_order.quantity);

    RETURN jsonb_build_object('result', 'CANCELLATION_APPROVED', 'order_id', p_order_id);

  ELSIF p_action = 'reject' THEN
    UPDATE polymart_orders
    SET cancellation_requested_at = NULL,
        cancellation_reason = NULL,
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('result', 'CANCELLATION_REJECTED', 'order_id', p_order_id);

  ELSE
    RAISE EXCEPTION 'Tindakan tidak sah. Gunakan approve atau reject.';
  END IF;
END;
$$;

-- Function: verify_staff_code (from 34_staff_registration_code.sql)
CREATE OR REPLACE FUNCTION verify_staff_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actual_code text;
BEGIN
  -- Read the value as string from JSONB. Using #>>'{}' extracts the raw text from the top level JSON scalar.
  SELECT value#>>'{}' INTO v_actual_code
  FROM public.system_settings
  WHERE key = 'staff_registration_code';
  
  -- If setting doesn't exist, fallback to old hardcoded value (just in case)
  IF v_actual_code IS NULL THEN
    v_actual_code := 'STAF-POLISAS';
  END IF;

  RETURN p_code = v_actual_code;
END;
$$;


-- =============================================================================

-- 6. DATABASE TRIGGERS

-- Trigger: check_club_membership_limit (from 03_multiclub.sql)
CREATE TRIGGER check_club_membership_limit
  BEFORE INSERT OR UPDATE OF account_status
  ON student_club_memberships
  FOR EACH ROW
  EXECUTE FUNCTION enforce_club_membership_limit();

-- Trigger: on_polyrent_report_inserted (from 20260518120600_polyrent_fasa2.sql)
CREATE TRIGGER on_polyrent_report_inserted
    AFTER INSERT ON polyrent_reports
    FOR EACH ROW
    EXECUTE FUNCTION polyrent_check_report_threshold();

-- Trigger: on_polyrent_reverse_ads_updated (from 20260518121000_polyrent_fasa3.sql)
CREATE TRIGGER on_polyrent_reverse_ads_updated
    BEFORE UPDATE ON polyrent_reverse_ads
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Trigger: on_profile_role_change (from 02_role_hierarchy.sql)
CREATE TRIGGER on_profile_role_change
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_change();

-- Trigger: supsas_editions_updated_at (from 36_supsas_schema.sql)
CREATE TRIGGER supsas_editions_updated_at    BEFORE UPDATE ON supsas_editions    FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();

-- Trigger: supsas_fixtures_updated_at (from 36_supsas_schema.sql)
CREATE TRIGGER supsas_fixtures_updated_at    BEFORE UPDATE ON supsas_fixtures    FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();

-- Trigger: supsas_kontingen_updated_at (from 36_supsas_schema.sql)
CREATE TRIGGER supsas_kontingen_updated_at   BEFORE UPDATE ON supsas_kontingen   FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();

-- Trigger: supsas_sports_updated_at (from 36_supsas_schema.sql)
CREATE TRIGGER supsas_sports_updated_at      BEFORE UPDATE ON supsas_sports      FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();

-- Trigger: trg_auto_credit_kelab_merit (from 40_program_attendance_system.sql)
CREATE TRIGGER trg_auto_credit_kelab_merit
  BEFORE INSERT OR UPDATE OF status
  ON program_attendees
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_credit_kelab_merit();

-- Trigger: trg_censor_polysuara (from 27_polysuara_v4_updates.sql)
CREATE TRIGGER trg_censor_polysuara
BEFORE INSERT OR UPDATE OF content ON public.polysuara_confessions
FOR EACH ROW EXECUTE FUNCTION public.censor_polysuara_content();

-- Trigger: trg_censor_polysuara_comment (from 20260529224800_98_polysuara_social_comments.sql)
CREATE TRIGGER trg_censor_polysuara_comment
BEFORE INSERT OR UPDATE OF content ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.censor_polysuara_content();

-- Trigger: trg_polyrider_job_expiry (from 52_polyrider_job_expiry.sql)
CREATE TRIGGER trg_polyrider_job_expiry
  BEFORE INSERT ON public.polyrider_jobs
  FOR EACH ROW EXECUTE FUNCTION set_polyrider_job_expiry();

-- Trigger: trg_polysuara_comment_codename (from 20260529224800_98_polysuara_social_comments.sql)
CREATE TRIGGER trg_polysuara_comment_codename
BEFORE INSERT ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.generate_polysuara_comment_codename();

-- Trigger: trg_polysuara_hourly_limit (from 20260518000000_update_polysuara_rate_limit.sql)
CREATE TRIGGER trg_polysuara_hourly_limit
BEFORE INSERT ON public.polysuara_confessions
FOR EACH ROW EXECUTE FUNCTION public.check_polysuara_hourly_limit();

-- Trigger: trg_saved_locations_limit (from 54_polyrider_saved_locations.sql)
CREATE TRIGGER trg_saved_locations_limit
  BEFORE INSERT ON public.polyrider_saved_locations
  FOR EACH ROW EXECUTE FUNCTION check_saved_locations_limit();

-- Trigger: trg_sync_polysuara_comment_count (from 20260529224800_98_polysuara_social_comments.sql)
CREATE TRIGGER trg_sync_polysuara_comment_count
AFTER INSERT OR DELETE ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_polysuara_comment_count();

-- Trigger: trigger_check_polytask_bid_rate_limit (from 82_polytask_fasa_all.sql)
CREATE TRIGGER trigger_check_polytask_bid_rate_limit
    BEFORE INSERT ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION check_polytask_bid_rate_limit();

-- Trigger: trigger_handle_polytask_cancellation (from 81_polytask_cancellation_rate.sql)
CREATE TRIGGER trigger_handle_polytask_cancellation
    AFTER UPDATE ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION handle_polytask_cancellation();

-- Trigger: trigger_log_polytask_critical_actions (from 82_polytask_fasa_all.sql)
CREATE TRIGGER trigger_log_polytask_critical_actions
    AFTER UPDATE ON public.polytask_jobs
    FOR EACH ROW
    EXECUTE FUNCTION log_polytask_critical_actions();

-- Trigger: trigger_polytask_bid_acceptance (from 73_polytask_schema.sql)
CREATE TRIGGER trigger_polytask_bid_acceptance
    AFTER UPDATE ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION handle_polytask_bid_acceptance();

-- Trigger: trigger_update_polytask_completion_metrics (from 81_polytask_cancellation_rate.sql)
CREATE TRIGGER trigger_update_polytask_completion_metrics
    AFTER UPDATE ON public.polytask_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_polytask_completion_metrics();


-- =============================================================================

-- 7. TABLE SECURITY POLICIES (Optimized and Combined)

-- Policies for table: ai_tier_requests
ALTER TABLE public.ai_tier_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_ai_tier_requests_select" ON public.ai_tier_requests;
CREATE POLICY "combined_ai_tier_requests_select" ON public.ai_tier_requests FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_ai_tier_requests_insert" ON public.ai_tier_requests;
CREATE POLICY "combined_ai_tier_requests_insert" ON public.ai_tier_requests FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_ai_tier_requests_update" ON public.ai_tier_requests;
CREATE POLICY "combined_ai_tier_requests_update" ON public.ai_tier_requests FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_ai_tier_requests_delete" ON public.ai_tier_requests;
CREATE POLICY "combined_ai_tier_requests_delete" ON public.ai_tier_requests FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: ai_usage_logs
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_ai_usage_logs_select" ON public.ai_usage_logs;
CREATE POLICY "combined_ai_usage_logs_select" ON public.ai_usage_logs FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_ai_usage_logs_insert" ON public.ai_usage_logs;
CREATE POLICY "combined_ai_usage_logs_insert" ON public.ai_usage_logs FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_ai_usage_logs_update" ON public.ai_usage_logs;
CREATE POLICY "combined_ai_usage_logs_update" ON public.ai_usage_logs FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_ai_usage_logs_delete" ON public.ai_usage_logs;
CREATE POLICY "combined_ai_usage_logs_delete" ON public.ai_usage_logs FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: akademik_cgpa_records
ALTER TABLE public.akademik_cgpa_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_akademik_cgpa_records_select" ON public.akademik_cgpa_records;
CREATE POLICY "combined_akademik_cgpa_records_select" ON public.akademik_cgpa_records FOR SELECT USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_cgpa_records_insert" ON public.akademik_cgpa_records;
CREATE POLICY "combined_akademik_cgpa_records_insert" ON public.akademik_cgpa_records FOR INSERT WITH CHECK ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_cgpa_records_update" ON public.akademik_cgpa_records;
CREATE POLICY "combined_akademik_cgpa_records_update" ON public.akademik_cgpa_records FOR UPDATE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_cgpa_records_delete" ON public.akademik_cgpa_records;
CREATE POLICY "combined_akademik_cgpa_records_delete" ON public.akademik_cgpa_records FOR DELETE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: akademik_files
ALTER TABLE public.akademik_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_akademik_files_select" ON public.akademik_files;
CREATE POLICY "combined_akademik_files_select" ON public.akademik_files FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_akademik_files_insert" ON public.akademik_files;
CREATE POLICY "combined_akademik_files_insert" ON public.akademik_files FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_files_update" ON public.akademik_files;
CREATE POLICY "combined_akademik_files_update" ON public.akademik_files FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_files_delete" ON public.akademik_files;
CREATE POLICY "combined_akademik_files_delete" ON public.akademik_files FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: akademik_folders
ALTER TABLE public.akademik_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_akademik_folders_select" ON public.akademik_folders;
CREATE POLICY "combined_akademik_folders_select" ON public.akademik_folders FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_akademik_folders_insert" ON public.akademik_folders;
CREATE POLICY "combined_akademik_folders_insert" ON public.akademik_folders FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_folders_update" ON public.akademik_folders;
CREATE POLICY "combined_akademik_folders_update" ON public.akademik_folders FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_folders_delete" ON public.akademik_folders;
CREATE POLICY "combined_akademik_folders_delete" ON public.akademik_folders FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: akademik_merit_config
ALTER TABLE public.akademik_merit_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_akademik_merit_config_select" ON public.akademik_merit_config;
CREATE POLICY "combined_akademik_merit_config_select" ON public.akademik_merit_config FOR SELECT USING ((true));
DROP POLICY IF EXISTS "combined_akademik_merit_config_insert" ON public.akademik_merit_config;
CREATE POLICY "combined_akademik_merit_config_insert" ON public.akademik_merit_config FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_merit_config_update" ON public.akademik_merit_config;
CREATE POLICY "combined_akademik_merit_config_update" ON public.akademik_merit_config FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_merit_config_delete" ON public.akademik_merit_config;
CREATE POLICY "combined_akademik_merit_config_delete" ON public.akademik_merit_config FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: akademik_pencapaian
ALTER TABLE public.akademik_pencapaian ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_akademik_pencapaian_select" ON public.akademik_pencapaian;
CREATE POLICY "combined_akademik_pencapaian_select" ON public.akademik_pencapaian FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_akademik_pencapaian_insert" ON public.akademik_pencapaian;
CREATE POLICY "combined_akademik_pencapaian_insert" ON public.akademik_pencapaian FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_pencapaian_update" ON public.akademik_pencapaian;
CREATE POLICY "combined_akademik_pencapaian_update" ON public.akademik_pencapaian FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_pencapaian_delete" ON public.akademik_pencapaian;
CREATE POLICY "combined_akademik_pencapaian_delete" ON public.akademik_pencapaian FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: akademik_qr_scans
ALTER TABLE public.akademik_qr_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_akademik_qr_scans_select" ON public.akademik_qr_scans;
CREATE POLICY "combined_akademik_qr_scans_select" ON public.akademik_qr_scans FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_akademik_qr_scans_insert" ON public.akademik_qr_scans;
CREATE POLICY "combined_akademik_qr_scans_insert" ON public.akademik_qr_scans FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_qr_scans_update" ON public.akademik_qr_scans;
CREATE POLICY "combined_akademik_qr_scans_update" ON public.akademik_qr_scans FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_qr_scans_delete" ON public.akademik_qr_scans;
CREATE POLICY "combined_akademik_qr_scans_delete" ON public.akademik_qr_scans FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: akademik_qr_tokens
ALTER TABLE public.akademik_qr_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_akademik_qr_tokens_select" ON public.akademik_qr_tokens;
CREATE POLICY "combined_akademik_qr_tokens_select" ON public.akademik_qr_tokens FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_akademik_qr_tokens_insert" ON public.akademik_qr_tokens;
CREATE POLICY "combined_akademik_qr_tokens_insert" ON public.akademik_qr_tokens FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_qr_tokens_update" ON public.akademik_qr_tokens;
CREATE POLICY "combined_akademik_qr_tokens_update" ON public.akademik_qr_tokens FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_qr_tokens_delete" ON public.akademik_qr_tokens;
CREATE POLICY "combined_akademik_qr_tokens_delete" ON public.akademik_qr_tokens FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: akademik_sijil_categories
ALTER TABLE public.akademik_sijil_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_akademik_sijil_categories_select" ON public.akademik_sijil_categories;
CREATE POLICY "combined_akademik_sijil_categories_select" ON public.akademik_sijil_categories FOR SELECT USING ((true));
DROP POLICY IF EXISTS "combined_akademik_sijil_categories_insert" ON public.akademik_sijil_categories;
CREATE POLICY "combined_akademik_sijil_categories_insert" ON public.akademik_sijil_categories FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_sijil_categories_update" ON public.akademik_sijil_categories;
CREATE POLICY "combined_akademik_sijil_categories_update" ON public.akademik_sijil_categories FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_sijil_categories_delete" ON public.akademik_sijil_categories;
CREATE POLICY "combined_akademik_sijil_categories_delete" ON public.akademik_sijil_categories FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: akademik_unlock_requests
ALTER TABLE public.akademik_unlock_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_akademik_unlock_requests_select" ON public.akademik_unlock_requests;
CREATE POLICY "combined_akademik_unlock_requests_select" ON public.akademik_unlock_requests FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_akademik_unlock_requests_insert" ON public.akademik_unlock_requests;
CREATE POLICY "combined_akademik_unlock_requests_insert" ON public.akademik_unlock_requests FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_unlock_requests_update" ON public.akademik_unlock_requests;
CREATE POLICY "combined_akademik_unlock_requests_update" ON public.akademik_unlock_requests FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_akademik_unlock_requests_delete" ON public.akademik_unlock_requests;
CREATE POLICY "combined_akademik_unlock_requests_delete" ON public.akademik_unlock_requests FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: asrama_recommendations
ALTER TABLE public.asrama_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_asrama_recommendations_select" ON public.asrama_recommendations;
CREATE POLICY "combined_asrama_recommendations_select" ON public.asrama_recommendations FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_asrama_recommendations_insert" ON public.asrama_recommendations;
CREATE POLICY "combined_asrama_recommendations_insert" ON public.asrama_recommendations FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_asrama_recommendations_update" ON public.asrama_recommendations;
CREATE POLICY "combined_asrama_recommendations_update" ON public.asrama_recommendations FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_asrama_recommendations_delete" ON public.asrama_recommendations;
CREATE POLICY "combined_asrama_recommendations_delete" ON public.asrama_recommendations FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: asrama_unit_admins
ALTER TABLE public.asrama_unit_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_asrama_unit_admins_select" ON public.asrama_unit_admins;
CREATE POLICY "combined_asrama_unit_admins_select" ON public.asrama_unit_admins FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_asrama_unit_admins_insert" ON public.asrama_unit_admins;
CREATE POLICY "combined_asrama_unit_admins_insert" ON public.asrama_unit_admins FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_asrama_unit_admins_update" ON public.asrama_unit_admins;
CREATE POLICY "combined_asrama_unit_admins_update" ON public.asrama_unit_admins FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_asrama_unit_admins_delete" ON public.asrama_unit_admins;
CREATE POLICY "combined_asrama_unit_admins_delete" ON public.asrama_unit_admins FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: business_cash_checkpoints
ALTER TABLE public.business_cash_checkpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_business_cash_checkpoints_select" ON public.business_cash_checkpoints;
CREATE POLICY "combined_business_cash_checkpoints_select" ON public.business_cash_checkpoints FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_business_cash_checkpoints_insert" ON public.business_cash_checkpoints;
CREATE POLICY "combined_business_cash_checkpoints_insert" ON public.business_cash_checkpoints FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_cash_checkpoints_update" ON public.business_cash_checkpoints;
CREATE POLICY "combined_business_cash_checkpoints_update" ON public.business_cash_checkpoints FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_cash_checkpoints_delete" ON public.business_cash_checkpoints;
CREATE POLICY "combined_business_cash_checkpoints_delete" ON public.business_cash_checkpoints FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: business_expenses
ALTER TABLE public.business_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_business_expenses_select" ON public.business_expenses;
CREATE POLICY "combined_business_expenses_select" ON public.business_expenses FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_business_expenses_insert" ON public.business_expenses;
CREATE POLICY "combined_business_expenses_insert" ON public.business_expenses FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_expenses_update" ON public.business_expenses;
CREATE POLICY "combined_business_expenses_update" ON public.business_expenses FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_expenses_delete" ON public.business_expenses;
CREATE POLICY "combined_business_expenses_delete" ON public.business_expenses FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: business_pos_assignments
ALTER TABLE public.business_pos_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_business_pos_assignments_select" ON public.business_pos_assignments;
CREATE POLICY "combined_business_pos_assignments_select" ON public.business_pos_assignments FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_business_pos_assignments_insert" ON public.business_pos_assignments;
CREATE POLICY "combined_business_pos_assignments_insert" ON public.business_pos_assignments FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_pos_assignments_update" ON public.business_pos_assignments;
CREATE POLICY "combined_business_pos_assignments_update" ON public.business_pos_assignments FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_pos_assignments_delete" ON public.business_pos_assignments;
CREATE POLICY "combined_business_pos_assignments_delete" ON public.business_pos_assignments FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: business_pos_logs
ALTER TABLE public.business_pos_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_business_pos_logs_select" ON public.business_pos_logs;
CREATE POLICY "combined_business_pos_logs_select" ON public.business_pos_logs FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_business_pos_logs_insert" ON public.business_pos_logs;
CREATE POLICY "combined_business_pos_logs_insert" ON public.business_pos_logs FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_pos_logs_update" ON public.business_pos_logs;
CREATE POLICY "combined_business_pos_logs_update" ON public.business_pos_logs FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_pos_logs_delete" ON public.business_pos_logs;
CREATE POLICY "combined_business_pos_logs_delete" ON public.business_pos_logs FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: business_products
ALTER TABLE public.business_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_business_products_select" ON public.business_products;
CREATE POLICY "combined_business_products_select" ON public.business_products FOR SELECT USING ((true));
DROP POLICY IF EXISTS "combined_business_products_insert" ON public.business_products;
CREATE POLICY "combined_business_products_insert" ON public.business_products FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_products_update" ON public.business_products;
CREATE POLICY "combined_business_products_update" ON public.business_products FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_products_delete" ON public.business_products;
CREATE POLICY "combined_business_products_delete" ON public.business_products FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: business_promotions
ALTER TABLE public.business_promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_business_promotions_select" ON public.business_promotions;
CREATE POLICY "combined_business_promotions_select" ON public.business_promotions FOR SELECT USING ((true));
DROP POLICY IF EXISTS "combined_business_promotions_insert" ON public.business_promotions;
CREATE POLICY "combined_business_promotions_insert" ON public.business_promotions FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_promotions_update" ON public.business_promotions;
CREATE POLICY "combined_business_promotions_update" ON public.business_promotions FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_promotions_delete" ON public.business_promotions;
CREATE POLICY "combined_business_promotions_delete" ON public.business_promotions FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: business_sessions
ALTER TABLE public.business_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_business_sessions_select" ON public.business_sessions;
CREATE POLICY "combined_business_sessions_select" ON public.business_sessions FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_business_sessions_insert" ON public.business_sessions;
CREATE POLICY "combined_business_sessions_insert" ON public.business_sessions FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_sessions_update" ON public.business_sessions;
CREATE POLICY "combined_business_sessions_update" ON public.business_sessions FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_sessions_delete" ON public.business_sessions;
CREATE POLICY "combined_business_sessions_delete" ON public.business_sessions FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: business_shift_swaps
ALTER TABLE public.business_shift_swaps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_business_shift_swaps_select" ON public.business_shift_swaps;
CREATE POLICY "combined_business_shift_swaps_select" ON public.business_shift_swaps FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_business_shift_swaps_insert" ON public.business_shift_swaps;
CREATE POLICY "combined_business_shift_swaps_insert" ON public.business_shift_swaps FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_shift_swaps_update" ON public.business_shift_swaps;
CREATE POLICY "combined_business_shift_swaps_update" ON public.business_shift_swaps FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_shift_swaps_delete" ON public.business_shift_swaps;
CREATE POLICY "combined_business_shift_swaps_delete" ON public.business_shift_swaps FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: business_shifts
ALTER TABLE public.business_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_business_shifts_select" ON public.business_shifts;
CREATE POLICY "combined_business_shifts_select" ON public.business_shifts FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_business_shifts_insert" ON public.business_shifts;
CREATE POLICY "combined_business_shifts_insert" ON public.business_shifts FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_shifts_update" ON public.business_shifts;
CREATE POLICY "combined_business_shifts_update" ON public.business_shifts FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_shifts_delete" ON public.business_shifts;
CREATE POLICY "combined_business_shifts_delete" ON public.business_shifts FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: business_transactions
ALTER TABLE public.business_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_business_transactions_select" ON public.business_transactions;
CREATE POLICY "combined_business_transactions_select" ON public.business_transactions FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_business_transactions_insert" ON public.business_transactions;
CREATE POLICY "combined_business_transactions_insert" ON public.business_transactions FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_transactions_update" ON public.business_transactions;
CREATE POLICY "combined_business_transactions_update" ON public.business_transactions FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_business_transactions_delete" ON public.business_transactions;
CREATE POLICY "combined_business_transactions_delete" ON public.business_transactions FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: club_activities
ALTER TABLE public.club_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_club_activities_select" ON public.club_activities;
CREATE POLICY "combined_club_activities_select" ON public.club_activities FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_club_activities_insert" ON public.club_activities;
CREATE POLICY "combined_club_activities_insert" ON public.club_activities FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_club_activities_update" ON public.club_activities;
CREATE POLICY "combined_club_activities_update" ON public.club_activities FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_club_activities_delete" ON public.club_activities;
CREATE POLICY "combined_club_activities_delete" ON public.club_activities FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: club_announcements
ALTER TABLE public.club_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_club_announcements_select" ON public.club_announcements;
CREATE POLICY "combined_club_announcements_select" ON public.club_announcements FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_club_announcements_insert" ON public.club_announcements;
CREATE POLICY "combined_club_announcements_insert" ON public.club_announcements FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_club_announcements_update" ON public.club_announcements;
CREATE POLICY "combined_club_announcements_update" ON public.club_announcements FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_club_announcements_delete" ON public.club_announcements;
CREATE POLICY "combined_club_announcements_delete" ON public.club_announcements FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: club_committee
ALTER TABLE public.club_committee ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_club_committee_select" ON public.club_committee;
CREATE POLICY "combined_club_committee_select" ON public.club_committee FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_club_committee_insert" ON public.club_committee;
CREATE POLICY "combined_club_committee_insert" ON public.club_committee FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_club_committee_update" ON public.club_committee;
CREATE POLICY "combined_club_committee_update" ON public.club_committee FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_club_committee_delete" ON public.club_committee;
CREATE POLICY "combined_club_committee_delete" ON public.club_committee FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: club_logs
ALTER TABLE public.club_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_club_logs_select" ON public.club_logs;
CREATE POLICY "combined_club_logs_select" ON public.club_logs FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_club_logs_insert" ON public.club_logs;
CREATE POLICY "combined_club_logs_insert" ON public.club_logs FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_club_logs_update" ON public.club_logs;
CREATE POLICY "combined_club_logs_update" ON public.club_logs FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_club_logs_delete" ON public.club_logs;
CREATE POLICY "combined_club_logs_delete" ON public.club_logs FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: club_members
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_club_members_select" ON public.club_members;
CREATE POLICY "combined_club_members_select" ON public.club_members FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_club_members_insert" ON public.club_members;
CREATE POLICY "combined_club_members_insert" ON public.club_members FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_club_members_update" ON public.club_members;
CREATE POLICY "combined_club_members_update" ON public.club_members FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_club_members_delete" ON public.club_members;
CREATE POLICY "combined_club_members_delete" ON public.club_members FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: club_reports
ALTER TABLE public.club_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_club_reports_select" ON public.club_reports;
CREATE POLICY "combined_club_reports_select" ON public.club_reports FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_club_reports_insert" ON public.club_reports;
CREATE POLICY "combined_club_reports_insert" ON public.club_reports FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_club_reports_update" ON public.club_reports;
CREATE POLICY "combined_club_reports_update" ON public.club_reports FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_club_reports_delete" ON public.club_reports;
CREATE POLICY "combined_club_reports_delete" ON public.club_reports FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: club_tasks
ALTER TABLE public.club_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_club_tasks_select" ON public.club_tasks;
CREATE POLICY "combined_club_tasks_select" ON public.club_tasks FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_club_tasks_insert" ON public.club_tasks;
CREATE POLICY "combined_club_tasks_insert" ON public.club_tasks FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_club_tasks_update" ON public.club_tasks;
CREATE POLICY "combined_club_tasks_update" ON public.club_tasks FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_club_tasks_delete" ON public.club_tasks;
CREATE POLICY "combined_club_tasks_delete" ON public.club_tasks FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_clubs_select" ON public.clubs;
CREATE POLICY "combined_clubs_select" ON public.clubs FOR SELECT USING ((true));
DROP POLICY IF EXISTS "combined_clubs_insert" ON public.clubs;
CREATE POLICY "combined_clubs_insert" ON public.clubs FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_clubs_update" ON public.clubs;
CREATE POLICY "combined_clubs_update" ON public.clubs FOR UPDATE USING ((is_club_president((SELECT auth.uid()), clubs.id::text) OR is_jpp_admin((SELECT auth.uid()))));
DROP POLICY IF EXISTS "combined_clubs_delete" ON public.clubs;
CREATE POLICY "combined_clubs_delete" ON public.clubs FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: jpp_exco_units
ALTER TABLE public.jpp_exco_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_jpp_exco_units_select" ON public.jpp_exco_units;
CREATE POLICY "combined_jpp_exco_units_select" ON public.jpp_exco_units FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_jpp_exco_units_insert" ON public.jpp_exco_units;
CREATE POLICY "combined_jpp_exco_units_insert" ON public.jpp_exco_units FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_jpp_exco_units_update" ON public.jpp_exco_units;
CREATE POLICY "combined_jpp_exco_units_update" ON public.jpp_exco_units FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_jpp_exco_units_delete" ON public.jpp_exco_units;
CREATE POLICY "combined_jpp_exco_units_delete" ON public.jpp_exco_units FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: jpp_mt_assignments
ALTER TABLE public.jpp_mt_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_jpp_mt_assignments_select" ON public.jpp_mt_assignments;
CREATE POLICY "combined_jpp_mt_assignments_select" ON public.jpp_mt_assignments FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_jpp_mt_assignments_insert" ON public.jpp_mt_assignments;
CREATE POLICY "combined_jpp_mt_assignments_insert" ON public.jpp_mt_assignments FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_jpp_mt_assignments_update" ON public.jpp_mt_assignments;
CREATE POLICY "combined_jpp_mt_assignments_update" ON public.jpp_mt_assignments FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_jpp_mt_assignments_delete" ON public.jpp_mt_assignments;
CREATE POLICY "combined_jpp_mt_assignments_delete" ON public.jpp_mt_assignments FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: kamsis_applications
ALTER TABLE public.kamsis_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_kamsis_applications_select" ON public.kamsis_applications;
CREATE POLICY "combined_kamsis_applications_select" ON public.kamsis_applications FOR SELECT USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kamsis_applications_insert" ON public.kamsis_applications;
CREATE POLICY "combined_kamsis_applications_insert" ON public.kamsis_applications FOR INSERT WITH CHECK ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kamsis_applications_update" ON public.kamsis_applications;
CREATE POLICY "combined_kamsis_applications_update" ON public.kamsis_applications FOR UPDATE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kamsis_applications_delete" ON public.kamsis_applications;
CREATE POLICY "combined_kamsis_applications_delete" ON public.kamsis_applications FOR DELETE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: kamsis_dynamic_fields
ALTER TABLE public.kamsis_dynamic_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_kamsis_dynamic_fields_select" ON public.kamsis_dynamic_fields;
CREATE POLICY "combined_kamsis_dynamic_fields_select" ON public.kamsis_dynamic_fields FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_kamsis_dynamic_fields_insert" ON public.kamsis_dynamic_fields;
CREATE POLICY "combined_kamsis_dynamic_fields_insert" ON public.kamsis_dynamic_fields FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kamsis_dynamic_fields_update" ON public.kamsis_dynamic_fields;
CREATE POLICY "combined_kamsis_dynamic_fields_update" ON public.kamsis_dynamic_fields FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kamsis_dynamic_fields_delete" ON public.kamsis_dynamic_fields;
CREATE POLICY "combined_kamsis_dynamic_fields_delete" ON public.kamsis_dynamic_fields FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: karnival_booths
ALTER TABLE public.karnival_booths ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_karnival_booths_select" ON public.karnival_booths;
CREATE POLICY "combined_karnival_booths_select" ON public.karnival_booths FOR SELECT USING ((true));
DROP POLICY IF EXISTS "combined_karnival_booths_insert" ON public.karnival_booths;
CREATE POLICY "combined_karnival_booths_insert" ON public.karnival_booths FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_karnival_booths_update" ON public.karnival_booths;
CREATE POLICY "combined_karnival_booths_update" ON public.karnival_booths FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_karnival_booths_delete" ON public.karnival_booths;
CREATE POLICY "combined_karnival_booths_delete" ON public.karnival_booths FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: karnival_categories
ALTER TABLE public.karnival_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_karnival_categories_select" ON public.karnival_categories;
CREATE POLICY "combined_karnival_categories_select" ON public.karnival_categories FOR SELECT USING ((true));
DROP POLICY IF EXISTS "combined_karnival_categories_insert" ON public.karnival_categories;
CREATE POLICY "combined_karnival_categories_insert" ON public.karnival_categories FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_karnival_categories_update" ON public.karnival_categories;
CREATE POLICY "combined_karnival_categories_update" ON public.karnival_categories FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_karnival_categories_delete" ON public.karnival_categories;
CREATE POLICY "combined_karnival_categories_delete" ON public.karnival_categories FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: karnival_editions
ALTER TABLE public.karnival_editions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_karnival_editions_select" ON public.karnival_editions;
CREATE POLICY "combined_karnival_editions_select" ON public.karnival_editions FOR SELECT USING ((true));
DROP POLICY IF EXISTS "combined_karnival_editions_insert" ON public.karnival_editions;
CREATE POLICY "combined_karnival_editions_insert" ON public.karnival_editions FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_karnival_editions_update" ON public.karnival_editions;
CREATE POLICY "combined_karnival_editions_update" ON public.karnival_editions FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_karnival_editions_delete" ON public.karnival_editions;
CREATE POLICY "combined_karnival_editions_delete" ON public.karnival_editions FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: karnival_votes_v2
ALTER TABLE public.karnival_votes_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_karnival_votes_v2_select" ON public.karnival_votes_v2;
CREATE POLICY "combined_karnival_votes_v2_select" ON public.karnival_votes_v2 FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_karnival_votes_v2_insert" ON public.karnival_votes_v2;
CREATE POLICY "combined_karnival_votes_v2_insert" ON public.karnival_votes_v2 FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_karnival_votes_v2_update" ON public.karnival_votes_v2;
CREATE POLICY "combined_karnival_votes_v2_update" ON public.karnival_votes_v2 FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_karnival_votes_v2_delete" ON public.karnival_votes_v2;
CREATE POLICY "combined_karnival_votes_v2_delete" ON public.karnival_votes_v2 FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: kebajikan_escalation_actions
ALTER TABLE public.kebajikan_escalation_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_kebajikan_escalation_actions_select" ON public.kebajikan_escalation_actions;
CREATE POLICY "combined_kebajikan_escalation_actions_select" ON public.kebajikan_escalation_actions FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_kebajikan_escalation_actions_insert" ON public.kebajikan_escalation_actions;
CREATE POLICY "combined_kebajikan_escalation_actions_insert" ON public.kebajikan_escalation_actions FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_escalation_actions_update" ON public.kebajikan_escalation_actions;
CREATE POLICY "combined_kebajikan_escalation_actions_update" ON public.kebajikan_escalation_actions FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_escalation_actions_delete" ON public.kebajikan_escalation_actions;
CREATE POLICY "combined_kebajikan_escalation_actions_delete" ON public.kebajikan_escalation_actions FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: kebajikan_notifications
ALTER TABLE public.kebajikan_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_kebajikan_notifications_select" ON public.kebajikan_notifications;
CREATE POLICY "combined_kebajikan_notifications_select" ON public.kebajikan_notifications FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_kebajikan_notifications_insert" ON public.kebajikan_notifications;
CREATE POLICY "combined_kebajikan_notifications_insert" ON public.kebajikan_notifications FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_notifications_update" ON public.kebajikan_notifications;
CREATE POLICY "combined_kebajikan_notifications_update" ON public.kebajikan_notifications FOR UPDATE USING (((target_user_id = (select auth.uid())) OR is_kebajikan_staff()));
DROP POLICY IF EXISTS "combined_kebajikan_notifications_delete" ON public.kebajikan_notifications;
CREATE POLICY "combined_kebajikan_notifications_delete" ON public.kebajikan_notifications FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: kebajikan_pics
ALTER TABLE public.kebajikan_pics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_kebajikan_pics_select" ON public.kebajikan_pics;
CREATE POLICY "combined_kebajikan_pics_select" ON public.kebajikan_pics FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_kebajikan_pics_insert" ON public.kebajikan_pics;
CREATE POLICY "combined_kebajikan_pics_insert" ON public.kebajikan_pics FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_pics_update" ON public.kebajikan_pics;
CREATE POLICY "combined_kebajikan_pics_update" ON public.kebajikan_pics FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_pics_delete" ON public.kebajikan_pics;
CREATE POLICY "combined_kebajikan_pics_delete" ON public.kebajikan_pics FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: kebajikan_settings
ALTER TABLE public.kebajikan_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_kebajikan_settings_select" ON public.kebajikan_settings;
CREATE POLICY "combined_kebajikan_settings_select" ON public.kebajikan_settings FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_kebajikan_settings_insert" ON public.kebajikan_settings;
CREATE POLICY "combined_kebajikan_settings_insert" ON public.kebajikan_settings FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_settings_update" ON public.kebajikan_settings;
CREATE POLICY "combined_kebajikan_settings_update" ON public.kebajikan_settings FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_settings_delete" ON public.kebajikan_settings;
CREATE POLICY "combined_kebajikan_settings_delete" ON public.kebajikan_settings FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: kebajikan_staff_assignments
ALTER TABLE public.kebajikan_staff_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_kebajikan_staff_assignments_select" ON public.kebajikan_staff_assignments;
CREATE POLICY "combined_kebajikan_staff_assignments_select" ON public.kebajikan_staff_assignments FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_kebajikan_staff_assignments_insert" ON public.kebajikan_staff_assignments;
CREATE POLICY "combined_kebajikan_staff_assignments_insert" ON public.kebajikan_staff_assignments FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_staff_assignments_update" ON public.kebajikan_staff_assignments;
CREATE POLICY "combined_kebajikan_staff_assignments_update" ON public.kebajikan_staff_assignments FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_staff_assignments_delete" ON public.kebajikan_staff_assignments;
CREATE POLICY "combined_kebajikan_staff_assignments_delete" ON public.kebajikan_staff_assignments FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: kebajikan_tags
ALTER TABLE public.kebajikan_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_kebajikan_tags_select" ON public.kebajikan_tags;
CREATE POLICY "combined_kebajikan_tags_select" ON public.kebajikan_tags FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_kebajikan_tags_insert" ON public.kebajikan_tags;
CREATE POLICY "combined_kebajikan_tags_insert" ON public.kebajikan_tags FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_tags_update" ON public.kebajikan_tags;
CREATE POLICY "combined_kebajikan_tags_update" ON public.kebajikan_tags FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_tags_delete" ON public.kebajikan_tags;
CREATE POLICY "combined_kebajikan_tags_delete" ON public.kebajikan_tags FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: kebajikan_ticket_comments
ALTER TABLE public.kebajikan_ticket_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_kebajikan_ticket_comments_select" ON public.kebajikan_ticket_comments;
CREATE POLICY "combined_kebajikan_ticket_comments_select" ON public.kebajikan_ticket_comments FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_kebajikan_ticket_comments_insert" ON public.kebajikan_ticket_comments;
CREATE POLICY "combined_kebajikan_ticket_comments_insert" ON public.kebajikan_ticket_comments FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_ticket_comments_update" ON public.kebajikan_ticket_comments;
CREATE POLICY "combined_kebajikan_ticket_comments_update" ON public.kebajikan_ticket_comments FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_ticket_comments_delete" ON public.kebajikan_ticket_comments;
CREATE POLICY "combined_kebajikan_ticket_comments_delete" ON public.kebajikan_ticket_comments FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: kebajikan_ticket_status_log
ALTER TABLE public.kebajikan_ticket_status_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_kebajikan_ticket_status_log_select" ON public.kebajikan_ticket_status_log;
CREATE POLICY "combined_kebajikan_ticket_status_log_select" ON public.kebajikan_ticket_status_log FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_kebajikan_ticket_status_log_insert" ON public.kebajikan_ticket_status_log;
CREATE POLICY "combined_kebajikan_ticket_status_log_insert" ON public.kebajikan_ticket_status_log FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_ticket_status_log_update" ON public.kebajikan_ticket_status_log;
CREATE POLICY "combined_kebajikan_ticket_status_log_update" ON public.kebajikan_ticket_status_log FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_ticket_status_log_delete" ON public.kebajikan_ticket_status_log;
CREATE POLICY "combined_kebajikan_ticket_status_log_delete" ON public.kebajikan_ticket_status_log FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: kebajikan_tickets
ALTER TABLE public.kebajikan_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_kebajikan_tickets_select" ON public.kebajikan_tickets;
CREATE POLICY "combined_kebajikan_tickets_select" ON public.kebajikan_tickets FOR SELECT USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_tickets_insert" ON public.kebajikan_tickets;
CREATE POLICY "combined_kebajikan_tickets_insert" ON public.kebajikan_tickets FOR INSERT WITH CHECK ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_tickets_update" ON public.kebajikan_tickets;
CREATE POLICY "combined_kebajikan_tickets_update" ON public.kebajikan_tickets FOR UPDATE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_kebajikan_tickets_delete" ON public.kebajikan_tickets;
CREATE POLICY "combined_kebajikan_tickets_delete" ON public.kebajikan_tickets FOR DELETE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: keusahawanan_businesses
ALTER TABLE public.keusahawanan_businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_keusahawanan_businesses_select" ON public.keusahawanan_businesses;
CREATE POLICY "combined_keusahawanan_businesses_select" ON public.keusahawanan_businesses FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_keusahawanan_businesses_insert" ON public.keusahawanan_businesses;
CREATE POLICY "combined_keusahawanan_businesses_insert" ON public.keusahawanan_businesses FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_keusahawanan_businesses_update" ON public.keusahawanan_businesses;
CREATE POLICY "combined_keusahawanan_businesses_update" ON public.keusahawanan_businesses FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_keusahawanan_businesses_delete" ON public.keusahawanan_businesses;
CREATE POLICY "combined_keusahawanan_businesses_delete" ON public.keusahawanan_businesses FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: keusahawanan_categories
ALTER TABLE public.keusahawanan_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_keusahawanan_categories_select" ON public.keusahawanan_categories;
CREATE POLICY "combined_keusahawanan_categories_select" ON public.keusahawanan_categories FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_keusahawanan_categories_insert" ON public.keusahawanan_categories;
CREATE POLICY "combined_keusahawanan_categories_insert" ON public.keusahawanan_categories FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_keusahawanan_categories_update" ON public.keusahawanan_categories;
CREATE POLICY "combined_keusahawanan_categories_update" ON public.keusahawanan_categories FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_keusahawanan_categories_delete" ON public.keusahawanan_categories;
CREATE POLICY "combined_keusahawanan_categories_delete" ON public.keusahawanan_categories FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: keusahawanan_logs
ALTER TABLE public.keusahawanan_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_keusahawanan_logs_select" ON public.keusahawanan_logs;
CREATE POLICY "combined_keusahawanan_logs_select" ON public.keusahawanan_logs FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_keusahawanan_logs_insert" ON public.keusahawanan_logs;
CREATE POLICY "combined_keusahawanan_logs_insert" ON public.keusahawanan_logs FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_keusahawanan_logs_update" ON public.keusahawanan_logs;
CREATE POLICY "combined_keusahawanan_logs_update" ON public.keusahawanan_logs FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_keusahawanan_logs_delete" ON public.keusahawanan_logs;
CREATE POLICY "combined_keusahawanan_logs_delete" ON public.keusahawanan_logs FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: keusahawanan_program_registrations
ALTER TABLE public.keusahawanan_program_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_keusahawanan_program_registrations_select" ON public.keusahawanan_program_registrations;
CREATE POLICY "combined_keusahawanan_program_registrations_select" ON public.keusahawanan_program_registrations FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_keusahawanan_program_registrations_insert" ON public.keusahawanan_program_registrations;
CREATE POLICY "combined_keusahawanan_program_registrations_insert" ON public.keusahawanan_program_registrations FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_keusahawanan_program_registrations_update" ON public.keusahawanan_program_registrations;
CREATE POLICY "combined_keusahawanan_program_registrations_update" ON public.keusahawanan_program_registrations FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_keusahawanan_program_registrations_delete" ON public.keusahawanan_program_registrations;
CREATE POLICY "combined_keusahawanan_program_registrations_delete" ON public.keusahawanan_program_registrations FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: keusahawanan_programs
ALTER TABLE public.keusahawanan_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_keusahawanan_programs_select" ON public.keusahawanan_programs;
CREATE POLICY "combined_keusahawanan_programs_select" ON public.keusahawanan_programs FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_keusahawanan_programs_insert" ON public.keusahawanan_programs;
CREATE POLICY "combined_keusahawanan_programs_insert" ON public.keusahawanan_programs FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_keusahawanan_programs_update" ON public.keusahawanan_programs;
CREATE POLICY "combined_keusahawanan_programs_update" ON public.keusahawanan_programs FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_keusahawanan_programs_delete" ON public.keusahawanan_programs;
CREATE POLICY "combined_keusahawanan_programs_delete" ON public.keusahawanan_programs FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: keusahawanan_unit_admins
ALTER TABLE public.keusahawanan_unit_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_keusahawanan_unit_admins_select" ON public.keusahawanan_unit_admins;
CREATE POLICY "combined_keusahawanan_unit_admins_select" ON public.keusahawanan_unit_admins FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_keusahawanan_unit_admins_insert" ON public.keusahawanan_unit_admins;
CREATE POLICY "combined_keusahawanan_unit_admins_insert" ON public.keusahawanan_unit_admins FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_keusahawanan_unit_admins_update" ON public.keusahawanan_unit_admins;
CREATE POLICY "combined_keusahawanan_unit_admins_update" ON public.keusahawanan_unit_admins FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_keusahawanan_unit_admins_delete" ON public.keusahawanan_unit_admins;
CREATE POLICY "combined_keusahawanan_unit_admins_delete" ON public.keusahawanan_unit_admins FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: klk_form_fields
ALTER TABLE public.klk_form_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_klk_form_fields_select" ON public.klk_form_fields;
CREATE POLICY "combined_klk_form_fields_select" ON public.klk_form_fields FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_klk_form_fields_insert" ON public.klk_form_fields;
CREATE POLICY "combined_klk_form_fields_insert" ON public.klk_form_fields FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_klk_form_fields_update" ON public.klk_form_fields;
CREATE POLICY "combined_klk_form_fields_update" ON public.klk_form_fields FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_klk_form_fields_delete" ON public.klk_form_fields;
CREATE POLICY "combined_klk_form_fields_delete" ON public.klk_form_fields FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: klk_kawasan
ALTER TABLE public.klk_kawasan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_klk_kawasan_select" ON public.klk_kawasan;
CREATE POLICY "combined_klk_kawasan_select" ON public.klk_kawasan FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_klk_kawasan_insert" ON public.klk_kawasan;
CREATE POLICY "combined_klk_kawasan_insert" ON public.klk_kawasan FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_klk_kawasan_update" ON public.klk_kawasan;
CREATE POLICY "combined_klk_kawasan_update" ON public.klk_kawasan FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_klk_kawasan_delete" ON public.klk_kawasan;
CREATE POLICY "combined_klk_kawasan_delete" ON public.klk_kawasan FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: klk_settings
ALTER TABLE public.klk_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_klk_settings_select" ON public.klk_settings;
CREATE POLICY "combined_klk_settings_select" ON public.klk_settings FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_klk_settings_insert" ON public.klk_settings;
CREATE POLICY "combined_klk_settings_insert" ON public.klk_settings FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_klk_settings_update" ON public.klk_settings;
CREATE POLICY "combined_klk_settings_update" ON public.klk_settings FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_klk_settings_delete" ON public.klk_settings;
CREATE POLICY "combined_klk_settings_delete" ON public.klk_settings FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: klk_student_residency
ALTER TABLE public.klk_student_residency ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_klk_student_residency_select" ON public.klk_student_residency;
CREATE POLICY "combined_klk_student_residency_select" ON public.klk_student_residency FOR SELECT USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_klk_student_residency_insert" ON public.klk_student_residency;
CREATE POLICY "combined_klk_student_residency_insert" ON public.klk_student_residency FOR INSERT WITH CHECK ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_klk_student_residency_update" ON public.klk_student_residency;
CREATE POLICY "combined_klk_student_residency_update" ON public.klk_student_residency FOR UPDATE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_klk_student_residency_delete" ON public.klk_student_residency;
CREATE POLICY "combined_klk_student_residency_delete" ON public.klk_student_residency FOR DELETE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: klk_sync_log
ALTER TABLE public.klk_sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_klk_sync_log_select" ON public.klk_sync_log;
CREATE POLICY "combined_klk_sync_log_select" ON public.klk_sync_log FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_klk_sync_log_insert" ON public.klk_sync_log;
CREATE POLICY "combined_klk_sync_log_insert" ON public.klk_sync_log FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_klk_sync_log_update" ON public.klk_sync_log;
CREATE POLICY "combined_klk_sync_log_update" ON public.klk_sync_log FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_klk_sync_log_delete" ON public.klk_sync_log;
CREATE POLICY "combined_klk_sync_log_delete" ON public.klk_sync_log FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: merit_program_applications
ALTER TABLE public.merit_program_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_merit_program_applications_select" ON public.merit_program_applications;
CREATE POLICY "combined_merit_program_applications_select" ON public.merit_program_applications FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_merit_program_applications_insert" ON public.merit_program_applications;
CREATE POLICY "combined_merit_program_applications_insert" ON public.merit_program_applications FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_merit_program_applications_update" ON public.merit_program_applications;
CREATE POLICY "combined_merit_program_applications_update" ON public.merit_program_applications FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_merit_program_applications_delete" ON public.merit_program_applications;
CREATE POLICY "combined_merit_program_applications_delete" ON public.merit_program_applications FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: merit_review_log
ALTER TABLE public.merit_review_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_merit_review_log_select" ON public.merit_review_log;
CREATE POLICY "combined_merit_review_log_select" ON public.merit_review_log FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_merit_review_log_insert" ON public.merit_review_log;
CREATE POLICY "combined_merit_review_log_insert" ON public.merit_review_log FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_merit_review_log_update" ON public.merit_review_log;
CREATE POLICY "combined_merit_review_log_update" ON public.merit_review_log FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_merit_review_log_delete" ON public.merit_review_log;
CREATE POLICY "combined_merit_review_log_delete" ON public.merit_review_log FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: merit_transactions
ALTER TABLE public.merit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_merit_transactions_select" ON public.merit_transactions;
CREATE POLICY "combined_merit_transactions_select" ON public.merit_transactions FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_merit_transactions_insert" ON public.merit_transactions;
CREATE POLICY "combined_merit_transactions_insert" ON public.merit_transactions FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_merit_transactions_update" ON public.merit_transactions;
CREATE POLICY "combined_merit_transactions_update" ON public.merit_transactions FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_merit_transactions_delete" ON public.merit_transactions;
CREATE POLICY "combined_merit_transactions_delete" ON public.merit_transactions FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_notifications_select" ON public.notifications;
CREATE POLICY "combined_notifications_select" ON public.notifications FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_notifications_insert" ON public.notifications;
CREATE POLICY "combined_notifications_insert" ON public.notifications FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_notifications_update" ON public.notifications;
CREATE POLICY "combined_notifications_update" ON public.notifications FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_notifications_delete" ON public.notifications;
CREATE POLICY "combined_notifications_delete" ON public.notifications FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: polymart_ads
ALTER TABLE public.polymart_ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_polymart_ads_select" ON public.polymart_ads;
CREATE POLICY "combined_polymart_ads_select" ON public.polymart_ads FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_polymart_ads_insert" ON public.polymart_ads;
CREATE POLICY "combined_polymart_ads_insert" ON public.polymart_ads FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_polymart_ads_update" ON public.polymart_ads;
CREATE POLICY "combined_polymart_ads_update" ON public.polymart_ads FOR UPDATE USING ((EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )));
DROP POLICY IF EXISTS "combined_polymart_ads_delete" ON public.polymart_ads;
CREATE POLICY "combined_polymart_ads_delete" ON public.polymart_ads FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: polymart_cart_items
ALTER TABLE public.polymart_cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_polymart_cart_items_select" ON public.polymart_cart_items;
CREATE POLICY "combined_polymart_cart_items_select" ON public.polymart_cart_items FOR SELECT USING ((buyer_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "combined_polymart_cart_items_insert" ON public.polymart_cart_items;
CREATE POLICY "combined_polymart_cart_items_insert" ON public.polymart_cart_items FOR INSERT WITH CHECK ((buyer_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "combined_polymart_cart_items_update" ON public.polymart_cart_items;
CREATE POLICY "combined_polymart_cart_items_update" ON public.polymart_cart_items FOR UPDATE USING ((buyer_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "combined_polymart_cart_items_delete" ON public.polymart_cart_items;
CREATE POLICY "combined_polymart_cart_items_delete" ON public.polymart_cart_items FOR DELETE USING ((buyer_id = (SELECT auth.uid())));

-- Policies for table: polymart_orders
ALTER TABLE public.polymart_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_polymart_orders_select" ON public.polymart_orders;
CREATE POLICY "combined_polymart_orders_select" ON public.polymart_orders FOR SELECT USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_polymart_orders_insert" ON public.polymart_orders;
CREATE POLICY "combined_polymart_orders_insert" ON public.polymart_orders FOR INSERT WITH CHECK ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_polymart_orders_update" ON public.polymart_orders;
CREATE POLICY "combined_polymart_orders_update" ON public.polymart_orders FOR UPDATE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_polymart_orders_delete" ON public.polymart_orders;
CREATE POLICY "combined_polymart_orders_delete" ON public.polymart_orders FOR DELETE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: polymart_reports
ALTER TABLE public.polymart_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_polymart_reports_select" ON public.polymart_reports;
CREATE POLICY "combined_polymart_reports_select" ON public.polymart_reports FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_polymart_reports_insert" ON public.polymart_reports;
CREATE POLICY "combined_polymart_reports_insert" ON public.polymart_reports FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_polymart_reports_update" ON public.polymart_reports;
CREATE POLICY "combined_polymart_reports_update" ON public.polymart_reports FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_polymart_reports_delete" ON public.polymart_reports;
CREATE POLICY "combined_polymart_reports_delete" ON public.polymart_reports FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: polymart_reviews
ALTER TABLE public.polymart_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_polymart_reviews_select" ON public.polymart_reviews;
CREATE POLICY "combined_polymart_reviews_select" ON public.polymart_reviews FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_polymart_reviews_insert" ON public.polymart_reviews;
CREATE POLICY "combined_polymart_reviews_insert" ON public.polymart_reviews FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_polymart_reviews_update" ON public.polymart_reviews;
CREATE POLICY "combined_polymart_reviews_update" ON public.polymart_reviews FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_polymart_reviews_delete" ON public.polymart_reviews;
CREATE POLICY "combined_polymart_reviews_delete" ON public.polymart_reviews FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: portal_settings
ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_portal_settings_select" ON public.portal_settings;
CREATE POLICY "combined_portal_settings_select" ON public.portal_settings FOR SELECT USING ((true));
DROP POLICY IF EXISTS "combined_portal_settings_insert" ON public.portal_settings;
CREATE POLICY "combined_portal_settings_insert" ON public.portal_settings FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_portal_settings_update" ON public.portal_settings;
CREATE POLICY "combined_portal_settings_update" ON public.portal_settings FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_portal_settings_delete" ON public.portal_settings;
CREATE POLICY "combined_portal_settings_delete" ON public.portal_settings FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_profiles_select" ON public.profiles;
CREATE POLICY "combined_profiles_select" ON public.profiles FOR SELECT USING ((id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_profiles_insert" ON public.profiles;
CREATE POLICY "combined_profiles_insert" ON public.profiles FOR INSERT WITH CHECK ((id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_profiles_update" ON public.profiles;
CREATE POLICY "combined_profiles_update" ON public.profiles FOR UPDATE USING ((id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_profiles_delete" ON public.profiles;
CREATE POLICY "combined_profiles_delete" ON public.profiles FOR DELETE USING ((id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: program_attendees
ALTER TABLE public.program_attendees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_program_attendees_select" ON public.program_attendees;
CREATE POLICY "combined_program_attendees_select" ON public.program_attendees FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_program_attendees_insert" ON public.program_attendees;
CREATE POLICY "combined_program_attendees_insert" ON public.program_attendees FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_program_attendees_update" ON public.program_attendees;
CREATE POLICY "combined_program_attendees_update" ON public.program_attendees FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_program_attendees_delete" ON public.program_attendees;
CREATE POLICY "combined_program_attendees_delete" ON public.program_attendees FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: programs
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_programs_select" ON public.programs;
CREATE POLICY "combined_programs_select" ON public.programs FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_programs_insert" ON public.programs;
CREATE POLICY "combined_programs_insert" ON public.programs FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_programs_update" ON public.programs;
CREATE POLICY "combined_programs_update" ON public.programs FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_programs_delete" ON public.programs;
CREATE POLICY "combined_programs_delete" ON public.programs FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_push_subscriptions_select" ON public.push_subscriptions;
CREATE POLICY "combined_push_subscriptions_select" ON public.push_subscriptions FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_push_subscriptions_insert" ON public.push_subscriptions;
CREATE POLICY "combined_push_subscriptions_insert" ON public.push_subscriptions FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_push_subscriptions_update" ON public.push_subscriptions;
CREATE POLICY "combined_push_subscriptions_update" ON public.push_subscriptions FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_push_subscriptions_delete" ON public.push_subscriptions;
CREATE POLICY "combined_push_subscriptions_delete" ON public.push_subscriptions FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: student_business_memberships
ALTER TABLE public.student_business_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_student_business_memberships_select" ON public.student_business_memberships;
CREATE POLICY "combined_student_business_memberships_select" ON public.student_business_memberships FOR SELECT USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_student_business_memberships_insert" ON public.student_business_memberships;
CREATE POLICY "combined_student_business_memberships_insert" ON public.student_business_memberships FOR INSERT WITH CHECK ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_student_business_memberships_update" ON public.student_business_memberships;
CREATE POLICY "combined_student_business_memberships_update" ON public.student_business_memberships FOR UPDATE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_student_business_memberships_delete" ON public.student_business_memberships;
CREATE POLICY "combined_student_business_memberships_delete" ON public.student_business_memberships FOR DELETE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: student_club_memberships
ALTER TABLE public.student_club_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_student_club_memberships_select" ON public.student_club_memberships;
CREATE POLICY "combined_student_club_memberships_select" ON public.student_club_memberships FOR SELECT USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_student_club_memberships_insert" ON public.student_club_memberships;
CREATE POLICY "combined_student_club_memberships_insert" ON public.student_club_memberships FOR INSERT WITH CHECK ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_student_club_memberships_update" ON public.student_club_memberships;
CREATE POLICY "combined_student_club_memberships_update" ON public.student_club_memberships FOR UPDATE USING (((SELECT auth.uid()) IN (
        SELECT id FROM profiles
        WHERE role IN ('SUPER_ADMIN_JPP', 'CLUB_ADVISOR', 'CLUB_PRESIDENT')
      )) OR (is_club_leader((SELECT auth.uid()), student_club_memberships.club_id::text) OR is_jpp_admin((SELECT auth.uid()))));
DROP POLICY IF EXISTS "combined_student_club_memberships_delete" ON public.student_club_memberships;
CREATE POLICY "combined_student_club_memberships_delete" ON public.student_club_memberships FOR DELETE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: supsas_editions
ALTER TABLE public.supsas_editions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_supsas_editions_select" ON public.supsas_editions;
CREATE POLICY "combined_supsas_editions_select" ON public.supsas_editions FOR SELECT USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP')));
DROP POLICY IF EXISTS "combined_supsas_editions_insert" ON public.supsas_editions;
CREATE POLICY "combined_supsas_editions_insert" ON public.supsas_editions FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP')));
DROP POLICY IF EXISTS "combined_supsas_editions_update" ON public.supsas_editions;
CREATE POLICY "combined_supsas_editions_update" ON public.supsas_editions FOR UPDATE USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP')));
DROP POLICY IF EXISTS "combined_supsas_editions_delete" ON public.supsas_editions;
CREATE POLICY "combined_supsas_editions_delete" ON public.supsas_editions FOR DELETE USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP')));

-- Policies for table: supsas_fixtures
ALTER TABLE public.supsas_fixtures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_supsas_fixtures_select" ON public.supsas_fixtures;
CREATE POLICY "combined_supsas_fixtures_select" ON public.supsas_fixtures FOR SELECT USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));
DROP POLICY IF EXISTS "combined_supsas_fixtures_insert" ON public.supsas_fixtures;
CREATE POLICY "combined_supsas_fixtures_insert" ON public.supsas_fixtures FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));
DROP POLICY IF EXISTS "combined_supsas_fixtures_update" ON public.supsas_fixtures;
CREATE POLICY "combined_supsas_fixtures_update" ON public.supsas_fixtures FOR UPDATE USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));
DROP POLICY IF EXISTS "combined_supsas_fixtures_delete" ON public.supsas_fixtures;
CREATE POLICY "combined_supsas_fixtures_delete" ON public.supsas_fixtures FOR DELETE USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));

-- Policies for table: supsas_kontingen
ALTER TABLE public.supsas_kontingen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_supsas_kontingen_select" ON public.supsas_kontingen;
CREATE POLICY "combined_supsas_kontingen_select" ON public.supsas_kontingen FOR SELECT USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP')));
DROP POLICY IF EXISTS "combined_supsas_kontingen_insert" ON public.supsas_kontingen;
CREATE POLICY "combined_supsas_kontingen_insert" ON public.supsas_kontingen FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP')));
DROP POLICY IF EXISTS "combined_supsas_kontingen_update" ON public.supsas_kontingen;
CREATE POLICY "combined_supsas_kontingen_update" ON public.supsas_kontingen FOR UPDATE USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')) OR (leader_id = (SELECT auth.uid())) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP')) OR (leader_id = (select auth.uid())));
DROP POLICY IF EXISTS "combined_supsas_kontingen_delete" ON public.supsas_kontingen;
CREATE POLICY "combined_supsas_kontingen_delete" ON public.supsas_kontingen FOR DELETE USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP')));

-- Policies for table: supsas_participants
ALTER TABLE public.supsas_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_supsas_participants_select" ON public.supsas_participants;
CREATE POLICY "combined_supsas_participants_select" ON public.supsas_participants FOR SELECT USING ((EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = (SELECT auth.uid()))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = (select auth.uid()))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));
DROP POLICY IF EXISTS "combined_supsas_participants_insert" ON public.supsas_participants;
CREATE POLICY "combined_supsas_participants_insert" ON public.supsas_participants FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = (SELECT auth.uid()))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = (select auth.uid()))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));
DROP POLICY IF EXISTS "combined_supsas_participants_update" ON public.supsas_participants;
CREATE POLICY "combined_supsas_participants_update" ON public.supsas_participants FOR UPDATE USING ((EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = (SELECT auth.uid()))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = (select auth.uid()))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));
DROP POLICY IF EXISTS "combined_supsas_participants_delete" ON public.supsas_participants;
CREATE POLICY "combined_supsas_participants_delete" ON public.supsas_participants FOR DELETE USING ((EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = (SELECT auth.uid()))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = (select auth.uid()))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));

-- Policies for table: supsas_results
ALTER TABLE public.supsas_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_supsas_results_select" ON public.supsas_results;
CREATE POLICY "combined_supsas_results_select" ON public.supsas_results FOR SELECT USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));
DROP POLICY IF EXISTS "combined_supsas_results_insert" ON public.supsas_results;
CREATE POLICY "combined_supsas_results_insert" ON public.supsas_results FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));
DROP POLICY IF EXISTS "combined_supsas_results_update" ON public.supsas_results;
CREATE POLICY "combined_supsas_results_update" ON public.supsas_results FOR UPDATE USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));
DROP POLICY IF EXISTS "combined_supsas_results_delete" ON public.supsas_results;
CREATE POLICY "combined_supsas_results_delete" ON public.supsas_results FOR DELETE USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));

-- Policies for table: supsas_sports
ALTER TABLE public.supsas_sports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_supsas_sports_select" ON public.supsas_sports;
CREATE POLICY "combined_supsas_sports_select" ON public.supsas_sports FOR SELECT USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));
DROP POLICY IF EXISTS "combined_supsas_sports_insert" ON public.supsas_sports;
CREATE POLICY "combined_supsas_sports_insert" ON public.supsas_sports FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));
DROP POLICY IF EXISTS "combined_supsas_sports_update" ON public.supsas_sports;
CREATE POLICY "combined_supsas_sports_update" ON public.supsas_sports FOR UPDATE USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));
DROP POLICY IF EXISTS "combined_supsas_sports_delete" ON public.supsas_sports;
CREATE POLICY "combined_supsas_sports_delete" ON public.supsas_sports FOR DELETE USING ((EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))) OR (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP'))));

-- Policies for table: supsas_teams
ALTER TABLE public.supsas_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_supsas_teams_select" ON public.supsas_teams;
CREATE POLICY "combined_supsas_teams_select" ON public.supsas_teams FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_supsas_teams_insert" ON public.supsas_teams;
CREATE POLICY "combined_supsas_teams_insert" ON public.supsas_teams FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_supsas_teams_update" ON public.supsas_teams;
CREATE POLICY "combined_supsas_teams_update" ON public.supsas_teams FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_supsas_teams_delete" ON public.supsas_teams;
CREATE POLICY "combined_supsas_teams_delete" ON public.supsas_teams FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: system_announcements
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_system_announcements_select" ON public.system_announcements;
CREATE POLICY "combined_system_announcements_select" ON public.system_announcements FOR SELECT USING ((EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (SELECT auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )) OR (EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )));
DROP POLICY IF EXISTS "combined_system_announcements_insert" ON public.system_announcements;
CREATE POLICY "combined_system_announcements_insert" ON public.system_announcements FOR INSERT WITH CHECK ((EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (SELECT auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )) OR (EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )));
DROP POLICY IF EXISTS "combined_system_announcements_update" ON public.system_announcements;
CREATE POLICY "combined_system_announcements_update" ON public.system_announcements FOR UPDATE USING ((EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (SELECT auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )) OR (EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )));
DROP POLICY IF EXISTS "combined_system_announcements_delete" ON public.system_announcements;
CREATE POLICY "combined_system_announcements_delete" ON public.system_announcements FOR DELETE USING ((EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (SELECT auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )) OR (EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )));

-- Policies for table: system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_system_settings_select" ON public.system_settings;
CREATE POLICY "combined_system_settings_select" ON public.system_settings FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_system_settings_insert" ON public.system_settings;
CREATE POLICY "combined_system_settings_insert" ON public.system_settings FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_system_settings_update" ON public.system_settings;
CREATE POLICY "combined_system_settings_update" ON public.system_settings FOR UPDATE USING ((is_jpp_admin((SELECT auth.uid()))));
DROP POLICY IF EXISTS "combined_system_settings_delete" ON public.system_settings;
CREATE POLICY "combined_system_settings_delete" ON public.system_settings FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: takwim_holidays
ALTER TABLE public.takwim_holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_takwim_holidays_select" ON public.takwim_holidays;
CREATE POLICY "combined_takwim_holidays_select" ON public.takwim_holidays FOR SELECT USING ((true));
DROP POLICY IF EXISTS "combined_takwim_holidays_insert" ON public.takwim_holidays;
CREATE POLICY "combined_takwim_holidays_insert" ON public.takwim_holidays FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_takwim_holidays_update" ON public.takwim_holidays;
CREATE POLICY "combined_takwim_holidays_update" ON public.takwim_holidays FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_takwim_holidays_delete" ON public.takwim_holidays;
CREATE POLICY "combined_takwim_holidays_delete" ON public.takwim_holidays FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: takwim_pusat
ALTER TABLE public.takwim_pusat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_takwim_pusat_select" ON public.takwim_pusat;
CREATE POLICY "combined_takwim_pusat_select" ON public.takwim_pusat FOR SELECT USING ((true));
DROP POLICY IF EXISTS "combined_takwim_pusat_insert" ON public.takwim_pusat;
CREATE POLICY "combined_takwim_pusat_insert" ON public.takwim_pusat FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_takwim_pusat_update" ON public.takwim_pusat;
CREATE POLICY "combined_takwim_pusat_update" ON public.takwim_pusat FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_takwim_pusat_delete" ON public.takwim_pusat;
CREATE POLICY "combined_takwim_pusat_delete" ON public.takwim_pusat FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: task_feedback
ALTER TABLE public.task_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_task_feedback_select" ON public.task_feedback;
CREATE POLICY "combined_task_feedback_select" ON public.task_feedback FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_task_feedback_insert" ON public.task_feedback;
CREATE POLICY "combined_task_feedback_insert" ON public.task_feedback FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_task_feedback_update" ON public.task_feedback;
CREATE POLICY "combined_task_feedback_update" ON public.task_feedback FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_task_feedback_delete" ON public.task_feedback;
CREATE POLICY "combined_task_feedback_delete" ON public.task_feedback FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: task_submissions
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_task_submissions_select" ON public.task_submissions;
CREATE POLICY "combined_task_submissions_select" ON public.task_submissions FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_task_submissions_insert" ON public.task_submissions;
CREATE POLICY "combined_task_submissions_insert" ON public.task_submissions FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_task_submissions_update" ON public.task_submissions;
CREATE POLICY "combined_task_submissions_update" ON public.task_submissions FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_task_submissions_delete" ON public.task_submissions;
CREATE POLICY "combined_task_submissions_delete" ON public.task_submissions FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: user_announcement_responses
ALTER TABLE public.user_announcement_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_user_announcement_responses_select" ON public.user_announcement_responses;
CREATE POLICY "combined_user_announcement_responses_select" ON public.user_announcement_responses FOR SELECT USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_user_announcement_responses_insert" ON public.user_announcement_responses;
CREATE POLICY "combined_user_announcement_responses_insert" ON public.user_announcement_responses FOR INSERT WITH CHECK ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_user_announcement_responses_update" ON public.user_announcement_responses;
CREATE POLICY "combined_user_announcement_responses_update" ON public.user_announcement_responses FOR UPDATE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_user_announcement_responses_delete" ON public.user_announcement_responses;
CREATE POLICY "combined_user_announcement_responses_delete" ON public.user_announcement_responses FOR DELETE USING ((user_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()) OR bidder_id = (SELECT auth.uid()) OR submitter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));

-- Policies for table: user_exco_access
ALTER TABLE public.user_exco_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "combined_user_exco_access_select" ON public.user_exco_access;
CREATE POLICY "combined_user_exco_access_select" ON public.user_exco_access FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "combined_user_exco_access_insert" ON public.user_exco_access;
CREATE POLICY "combined_user_exco_access_insert" ON public.user_exco_access FOR INSERT WITH CHECK ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_user_exco_access_update" ON public.user_exco_access;
CREATE POLICY "combined_user_exco_access_update" ON public.user_exco_access FOR UPDATE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));
DROP POLICY IF EXISTS "combined_user_exco_access_delete" ON public.user_exco_access;
CREATE POLICY "combined_user_exco_access_delete" ON public.user_exco_access FOR DELETE USING ((EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))));


-- =============================================================================

-- 8. INDEXES (Foreign Key Covering Indexes)

CREATE INDEX IF NOT EXISTS idx_ai_tier_requests_user_id ON public.ai_tier_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_akademik_cgpa_records_user_id ON public.akademik_cgpa_records(user_id);
CREATE INDEX IF NOT EXISTS idx_akademik_files_folder_id ON public.akademik_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_akademik_files_owner_user_id ON public.akademik_files(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_akademik_files_uploaded_by ON public.akademik_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_akademik_folders_created_by ON public.akademik_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_akademik_folders_parent_id ON public.akademik_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_akademik_merit_config_updated_by ON public.akademik_merit_config(updated_by);
CREATE INDEX IF NOT EXISTS idx_akademik_pencapaian_category_id ON public.akademik_pencapaian(category_id);
CREATE INDEX IF NOT EXISTS idx_akademik_pencapaian_user_id ON public.akademik_pencapaian(user_id);
CREATE INDEX IF NOT EXISTS idx_akademik_pencapaian_verified_by ON public.akademik_pencapaian(verified_by);
CREATE INDEX IF NOT EXISTS idx_akademik_qr_scans_token_id ON public.akademik_qr_scans(token_id);
CREATE INDEX IF NOT EXISTS idx_akademik_qr_scans_user_id ON public.akademik_qr_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_akademik_qr_tokens_created_by ON public.akademik_qr_tokens(created_by);
CREATE INDEX IF NOT EXISTS idx_akademik_sijil_categories_created_by ON public.akademik_sijil_categories(created_by);
CREATE INDEX IF NOT EXISTS idx_akademik_unlock_requests_pencapaian_id ON public.akademik_unlock_requests(pencapaian_id);
CREATE INDEX IF NOT EXISTS idx_akademik_unlock_requests_reviewed_by ON public.akademik_unlock_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_akademik_unlock_requests_user_id ON public.akademik_unlock_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_asrama_recommendations_marked_by ON public.asrama_recommendations(marked_by);
CREATE INDEX IF NOT EXISTS idx_asrama_recommendations_user_id ON public.asrama_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_asrama_unit_admins_assigned_by ON public.asrama_unit_admins(assigned_by);
CREATE INDEX IF NOT EXISTS idx_asrama_unit_admins_user_id ON public.asrama_unit_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_business_cash_checkpoints_business_id ON public.business_cash_checkpoints(business_id);
CREATE INDEX IF NOT EXISTS idx_business_cash_checkpoints_recorded_by ON public.business_cash_checkpoints(recorded_by);
CREATE INDEX IF NOT EXISTS idx_business_expenses_business_id ON public.business_expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_business_expenses_recorded_by ON public.business_expenses(recorded_by);
CREATE INDEX IF NOT EXISTS idx_business_pos_assignments_assigned_by ON public.business_pos_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_business_pos_assignments_business_id ON public.business_pos_assignments(business_id);
CREATE INDEX IF NOT EXISTS idx_business_pos_assignments_user_id ON public.business_pos_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_business_pos_logs_actor_id ON public.business_pos_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_business_pos_logs_business_id ON public.business_pos_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_business_pos_logs_transaction_id ON public.business_pos_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_business_products_business_id ON public.business_products(business_id);
CREATE INDEX IF NOT EXISTS idx_business_promotions_business_id ON public.business_promotions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_promotions_created_by ON public.business_promotions(created_by);
CREATE INDEX IF NOT EXISTS idx_business_sessions_business_id ON public.business_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_sessions_closed_by ON public.business_sessions(closed_by);
CREATE INDEX IF NOT EXISTS idx_business_sessions_opened_by ON public.business_sessions(opened_by);
CREATE INDEX IF NOT EXISTS idx_business_shift_swaps_business_id ON public.business_shift_swaps(business_id);
CREATE INDEX IF NOT EXISTS idx_business_shift_swaps_requested_by ON public.business_shift_swaps(requested_by);
CREATE INDEX IF NOT EXISTS idx_business_shift_swaps_responded_by ON public.business_shift_swaps(responded_by);
CREATE INDEX IF NOT EXISTS idx_business_shift_swaps_shift_id ON public.business_shift_swaps(shift_id);
CREATE INDEX IF NOT EXISTS idx_business_shift_swaps_swap_with ON public.business_shift_swaps(swap_with);
CREATE INDEX IF NOT EXISTS idx_business_shifts_assigned_to ON public.business_shifts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_business_shifts_business_id ON public.business_shifts(business_id);
CREATE INDEX IF NOT EXISTS idx_business_shifts_created_by ON public.business_shifts(created_by);
CREATE INDEX IF NOT EXISTS idx_business_transactions_business_id ON public.business_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_transactions_promotion_id ON public.business_transactions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_business_transactions_served_by ON public.business_transactions(served_by);
CREATE INDEX IF NOT EXISTS idx_business_transactions_voided_by ON public.business_transactions(voided_by);
CREATE INDEX IF NOT EXISTS idx_club_activities_club_id ON public.club_activities(club_id);
CREATE INDEX IF NOT EXISTS idx_club_activities_user_id ON public.club_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_club_announcements_club_id ON public.club_announcements(club_id);
CREATE INDEX IF NOT EXISTS idx_club_committee_club_id ON public.club_committee(club_id);
CREATE INDEX IF NOT EXISTS idx_club_logs_actor_id ON public.club_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_club_logs_club_id ON public.club_logs(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON public.club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_reports_club_id ON public.club_reports(club_id);
CREATE INDEX IF NOT EXISTS idx_club_reports_reviewed_by ON public.club_reports(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_club_reports_submitted_by ON public.club_reports(submitted_by);
CREATE INDEX IF NOT EXISTS idx_club_tasks_approved_by ON public.club_tasks(approved_by);
CREATE INDEX IF NOT EXISTS idx_club_tasks_assigned_to ON public.club_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_club_tasks_club_id ON public.club_tasks(club_id);
CREATE INDEX IF NOT EXISTS idx_club_tasks_created_by ON public.club_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_jpp_mt_assignments_assigned_by ON public.jpp_mt_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_jpp_mt_assignments_mt_user_id ON public.jpp_mt_assignments(mt_user_id);
CREATE INDEX IF NOT EXISTS idx_karnival_booths_category_id ON public.karnival_booths(category_id);
CREATE INDEX IF NOT EXISTS idx_karnival_booths_edition_id ON public.karnival_booths(edition_id);
CREATE INDEX IF NOT EXISTS idx_karnival_categories_edition_id ON public.karnival_categories(edition_id);
CREATE INDEX IF NOT EXISTS idx_karnival_votes_v2_booth_id ON public.karnival_votes_v2(booth_id);
CREATE INDEX IF NOT EXISTS idx_karnival_votes_v2_category_id ON public.karnival_votes_v2(category_id);
CREATE INDEX IF NOT EXISTS idx_karnival_votes_v2_edition_id ON public.karnival_votes_v2(edition_id);
CREATE INDEX IF NOT EXISTS idx_karnival_votes_v2_voter_id ON public.karnival_votes_v2(voter_id);
CREATE INDEX IF NOT EXISTS idx_kebajikan_escalation_actions_pic_id ON public.kebajikan_escalation_actions(pic_id);
CREATE INDEX IF NOT EXISTS idx_kebajikan_escalation_actions_recorded_by ON public.kebajikan_escalation_actions(recorded_by);
CREATE INDEX IF NOT EXISTS idx_kebajikan_escalation_actions_ticket_id ON public.kebajikan_escalation_actions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kebajikan_notifications_target_user_id ON public.kebajikan_notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_kebajikan_notifications_ticket_id ON public.kebajikan_notifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kebajikan_pics_created_by ON public.kebajikan_pics(created_by);
CREATE INDEX IF NOT EXISTS idx_kebajikan_pics_pic_user_id ON public.kebajikan_pics(pic_user_id);
CREATE INDEX IF NOT EXISTS idx_kebajikan_settings_updated_by ON public.kebajikan_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_kebajikan_staff_assignments_assigned_by ON public.kebajikan_staff_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_kebajikan_staff_assignments_staff_user_id ON public.kebajikan_staff_assignments(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_kebajikan_tags_created_by ON public.kebajikan_tags(created_by);
CREATE INDEX IF NOT EXISTS idx_kebajikan_ticket_comments_author_id ON public.kebajikan_ticket_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_kebajikan_ticket_comments_ticket_id ON public.kebajikan_ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kebajikan_ticket_status_log_actor_id ON public.kebajikan_ticket_status_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_kebajikan_ticket_status_log_ticket_id ON public.kebajikan_ticket_status_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kebajikan_tickets_assigned_to ON public.kebajikan_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_kebajikan_tickets_delegated_to ON public.kebajikan_tickets(delegated_to);
CREATE INDEX IF NOT EXISTS idx_kebajikan_tickets_reopen_approved_by ON public.kebajikan_tickets(reopen_approved_by);
CREATE INDEX IF NOT EXISTS idx_kebajikan_tickets_resolved_by ON public.kebajikan_tickets(resolved_by);
CREATE INDEX IF NOT EXISTS idx_kebajikan_tickets_submitter_id ON public.kebajikan_tickets(submitter_id);
CREATE INDEX IF NOT EXISTS idx_keusahawanan_businesses_category_id ON public.keusahawanan_businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_keusahawanan_businesses_owner_id ON public.keusahawanan_businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_keusahawanan_logs_actor_id ON public.keusahawanan_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_keusahawanan_logs_business_id ON public.keusahawanan_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_keusahawanan_program_registrations_program_id ON public.keusahawanan_program_registrations(program_id);
CREATE INDEX IF NOT EXISTS idx_keusahawanan_unit_admins_assigned_by ON public.keusahawanan_unit_admins(assigned_by);
CREATE INDEX IF NOT EXISTS idx_keusahawanan_unit_admins_user_id ON public.keusahawanan_unit_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_merit_program_applications_kpp_reviewer_id ON public.merit_program_applications(kpp_reviewer_id);
CREATE INDEX IF NOT EXISTS idx_merit_program_applications_applied_by ON public.merit_program_applications(applied_by);
CREATE INDEX IF NOT EXISTS idx_merit_program_applications_kediaman_reviewer_id ON public.merit_program_applications(kediaman_reviewer_id);
CREATE INDEX IF NOT EXISTS idx_merit_review_log_application_id ON public.merit_review_log(application_id);
CREATE INDEX IF NOT EXISTS idx_merit_review_log_reviewer_id ON public.merit_review_log(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_merit_transactions_club_id ON public.merit_transactions(club_id);
CREATE INDEX IF NOT EXISTS idx_merit_transactions_user_id ON public.merit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id ON public.notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_ticket_id ON public.notifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_polymart_cart_items_product_id ON public.polymart_cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_polymart_orders_business_id ON public.polymart_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_polymart_orders_buyer_id ON public.polymart_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_polymart_orders_product_id ON public.polymart_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_polymart_reports_product_id ON public.polymart_reports(product_id);
CREATE INDEX IF NOT EXISTS idx_polymart_reports_reporter_id ON public.polymart_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_polymart_reports_reviewed_by ON public.polymart_reports(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_polymart_reviews_order_id ON public.polymart_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_polymart_reviews_product_id ON public.polymart_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_polymart_reviews_reviewer_id ON public.polymart_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_portal_settings_updated_by ON public.portal_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_profiles_club_id ON public.profiles(club_id);
CREATE INDEX IF NOT EXISTS idx_program_attendees_user_id ON public.program_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_student_business_memberships_business_id ON public.student_business_memberships(business_id);
CREATE INDEX IF NOT EXISTS idx_student_business_memberships_user_id ON public.student_business_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_student_club_memberships_user_id ON public.student_club_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_supsas_fixtures_edition_id ON public.supsas_fixtures(edition_id);
CREATE INDEX IF NOT EXISTS idx_supsas_fixtures_kontingen_a_id ON public.supsas_fixtures(kontingen_a_id);
CREATE INDEX IF NOT EXISTS idx_supsas_fixtures_kontingen_b_id ON public.supsas_fixtures(kontingen_b_id);
CREATE INDEX IF NOT EXISTS idx_supsas_fixtures_next_match_id ON public.supsas_fixtures(next_match_id);
CREATE INDEX IF NOT EXISTS idx_supsas_fixtures_sport_id ON public.supsas_fixtures(sport_id);
CREATE INDEX IF NOT EXISTS idx_supsas_fixtures_team_a_id ON public.supsas_fixtures(team_a_id);
CREATE INDEX IF NOT EXISTS idx_supsas_fixtures_team_b_id ON public.supsas_fixtures(team_b_id);
CREATE INDEX IF NOT EXISTS idx_supsas_fixtures_winner_id ON public.supsas_fixtures(winner_id);
CREATE INDEX IF NOT EXISTS idx_supsas_fixtures_winner_team_id ON public.supsas_fixtures(winner_team_id);
CREATE INDEX IF NOT EXISTS idx_supsas_kontingen_edition_id ON public.supsas_kontingen(edition_id);
CREATE INDEX IF NOT EXISTS idx_supsas_participants_edition_id ON public.supsas_participants(edition_id);
CREATE INDEX IF NOT EXISTS idx_supsas_participants_kontingen_id ON public.supsas_participants(kontingen_id);
CREATE INDEX IF NOT EXISTS idx_supsas_participants_sport_id ON public.supsas_participants(sport_id);
CREATE INDEX IF NOT EXISTS idx_supsas_participants_team_id ON public.supsas_participants(team_id);
CREATE INDEX IF NOT EXISTS idx_supsas_results_edition_id ON public.supsas_results(edition_id);
CREATE INDEX IF NOT EXISTS idx_supsas_results_kontingen_id ON public.supsas_results(kontingen_id);
CREATE INDEX IF NOT EXISTS idx_supsas_results_sport_id ON public.supsas_results(sport_id);
CREATE INDEX IF NOT EXISTS idx_supsas_sports_edition_id ON public.supsas_sports(edition_id);
CREATE INDEX IF NOT EXISTS idx_supsas_teams_edition_id ON public.supsas_teams(edition_id);
CREATE INDEX IF NOT EXISTS idx_supsas_teams_kontingen_id ON public.supsas_teams(kontingen_id);
CREATE INDEX IF NOT EXISTS idx_supsas_teams_sport_id ON public.supsas_teams(sport_id);
CREATE INDEX IF NOT EXISTS idx_system_announcements_created_by ON public.system_announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_task_feedback_from_id ON public.task_feedback(from_id);
CREATE INDEX IF NOT EXISTS idx_task_feedback_task_id ON public.task_feedback(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON public.task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_id ON public.task_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_announcement_responses_announcement_id ON public.user_announcement_responses(announcement_id);
CREATE INDEX IF NOT EXISTS idx_user_announcement_responses_user_id ON public.user_announcement_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exco_access_granted_by ON public.user_exco_access(granted_by);
CREATE INDEX IF NOT EXISTS idx_user_exco_access_user_id ON public.user_exco_access(user_id);

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
