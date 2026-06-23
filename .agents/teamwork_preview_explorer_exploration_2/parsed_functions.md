# Custom PostgreSQL Functions & Triggers

## Functions (RPCs)

### Function: `admin_merge_duplicate_accounts`
- **Migrations involved**: 20260525021000_fix_polyrider_profiles_ref.sql, 71_block_duplicate_matric_and_merge_tool.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION admin_merge_duplicate_accounts(
  p_primary_id UUID, p_secondary_id UUID
) RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
```

#### Version 2
```sql
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
```

---

### Function: `archive_merit_cohort`
- **Migrations involved**: 64_merit_archive_cohort.sql, 67_fix_merit_system_audit.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION public.archive_merit_cohort(p_cohort_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Archive the current total_merit into student_merit_cohorts for users with merit != 0
    INSERT INTO public.student_merit_cohorts (user_id, cohort_id, total_merit)
    SELECT id, p_cohort_id, merit
    FROM public.profiles
    WHERE merit != 0;
```

#### Version 2
```sql
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
```

---

### Function: `archive_old_polytask_jobs`
- **Migrations involved**: 82_polytask_fasa_all.sql, 84_polytask_v2_hotfix.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION archive_old_polytask_jobs()
RETURNS void AS $$
BEGIN
    -- Salin ke arkib
    INSERT INTO public.polytask_jobs_archive (id, requester_id, title, description, category, budget, location, deadline, status, assigned_tasker_id, created_at, updated_at)
    SELECT id, requester_id, title, description, category, budget, location, deadline, status, assigned_tasker_id, created_at, updated_at
    FROM public.polytask_jobs
    WHERE status IN ('COMPLETED', 'CANCELLED') 
    AND updated_at < NOW() - INTERVAL '3 months';

    -- Padam dari jadual aktif
    DELETE FROM public.polytask_jobs
    WHERE status IN ('COMPLETED', 'CANCELLED') 
    AND updated_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Version 2
```sql
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
```

---

### Function: `assign_jpp_member`
- **Migrations involved**: 35_security_jpp_profile_rpc.sql

```sql
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
```

---

### Function: `auto_sort_pencapaian_file`
- **Migrations involved**: 20260505235200_auto_sort_sijil_akademik.sql

```sql
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
```

---

### Function: `buyer_cancel_polymart_order`
- **Migrations involved**: 20260527162000_90_polymart_cancellation_flow.sql, 20260527162500_95_polymart_jsonb_variations.sql

```sql
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
```

---

### Function: `cancel_expired_polymart_orders`
- **Migrations involved**: 52_polymart_online_payment.sql, 87_polymart_auto_cancel_hotfix.sql

```sql
CREATE OR REPLACE FUNCTION public.cancel_expired_polymart_orders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
```

---

### Function: `cancel_polyrider_job`
- **Migrations involved**: 51_polyrider_cancel_sos_appeals.sql

```sql
CREATE OR REPLACE FUNCTION public.cancel_polyrider_job(p_job_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
```

---

### Function: `check_email_registered`
- **Migrations involved**: 42_check_email_registered.sql

```sql
CREATE OR REPLACE FUNCTION check_email_registered(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
```

---

### Function: `check_matric_registered`
- **Migrations involved**: 71_block_duplicate_matric_and_merge_tool.sql

```sql
CREATE OR REPLACE FUNCTION check_matric_registered(p_matric_no TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
```

---

### Function: `check_polysuara_hourly_limit`
- **Migrations involved**: 20260518000000_update_polysuara_rate_limit.sql

```sql
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
```

---

### Function: `check_polytask_bid_rate_limit`
- **Migrations involved**: 82_polytask_fasa_all.sql, 84_polytask_v2_hotfix.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION check_polytask_bid_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_bids_count INT;
BEGIN
    SELECT COUNT(*) INTO recent_bids_count
    FROM public.polytask_bids
    WHERE tasker_id = NEW.tasker_id
    AND created_at > NOW() - INTERVAL '1 hour';

    IF recent_bids_count >= 10 THEN
        RAISE EXCEPTION 'Rate limit exceeded: You can only place 10 bids per hour.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Version 2
```sql
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
```

---

### Function: `check_saved_locations_limit`
- **Migrations involved**: 54_polyrider_saved_locations.sql

```sql
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
```

---

### Function: `complete_polymart_order`
- **Migrations involved**: 20260527154636_88_polymart_product_variations.sql, 20260527161800_89_complete_order_idempotency_guard.sql, 20260527162500_95_polymart_jsonb_variations.sql, 20260527162700_97_fix_update_product_variation_stock_updated_at.sql, 37_polymart_pos_sync.sql

#### Version 1
```sql
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
```

#### Version 2
```sql
CREATE OR REPLACE FUNCTION public.complete_polymart_order(
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
```

---

### Function: `create_polyrider_job`
- **Migrations involved**: 50_polyrider_security_patch.sql, 51_polymart_polyrider_integration.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION public.create_polyrider_job(p_student_id uuid, p_pickup_name text, p_dropoff_name text, p_pickup_lat numeric DEFAULT NULL::numeric, p_pickup_lng numeric DEFAULT NULL::numeric, p_dropoff_lat numeric DEFAULT NULL::numeric, p_dropoff_lng numeric DEFAULT NULL::numeric, p_proposed_price numeric DEFAULT 3.0, p_is_carpool_open boolean DEFAULT false, p_join_group_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF polyrider_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_job          polyrider_jobs%ROWTYPE;
```

#### Version 2
```sql
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
```

---

### Function: `delete_own_account`
- **Migrations involved**: 20260525021000_fix_polyrider_profiles_ref.sql, 72_delete_own_account.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
```

#### Version 2
```sql
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
```

---

### Function: `detect_duplicate_matric_accounts`
- **Migrations involved**: 70_flexible_login_and_duplicate_detection.sql

```sql
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
```

---

### Function: `fn_auto_credit_kelab_merit`
- **Migrations involved**: 40_program_attendance_system.sql

```sql
CREATE OR REPLACE FUNCTION fn_auto_credit_kelab_merit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merit  INT;
```

---

### Function: `generate_polysuara_comment_codename`
- **Migrations involved**: 20260529224800_98_polysuara_social_comments.sql

```sql
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
```

---

### Function: `generate_puskep_reg_number`
- **Migrations involved**: 60_keusahawanan_registration_history.sql

```sql
CREATE OR REPLACE FUNCTION public.generate_puskep_reg_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_year TEXT;
```

---

### Function: `get_active_polyrider_count`
- **Migrations involved**: 48_polyrider_schema.sql, 50_polyrider_security_patch.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION public.get_active_polyrider_count()
RETURNS INTEGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    SELECT count(*) INTO active_count FROM public.polyrider_profiles WHERE is_active = true AND status = 'APPROVED' AND (license_expiry_date > now() OR license_expiry_date IS NULL);
    RETURN active_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Version 2
```sql
CREATE OR REPLACE FUNCTION public.get_active_polyrider_count()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    active_count INTEGER;
```

---

### Function: `get_active_polytask_count`
- **Migrations involved**: 84_polytask_v2_hotfix.sql

```sql
CREATE OR REPLACE FUNCTION get_active_polytask_count()
RETURNS integer AS $$
BEGIN
    RETURN (SELECT count(*)::integer FROM public.polytask_jobs WHERE status IN ('OPEN', 'IN_PROGRESS'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

### Function: `get_auth_providers`
- **Migrations involved**: 43_get_auth_providers.sql

```sql
CREATE OR REPLACE FUNCTION get_auth_providers(p_email text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_providers text[];
```

---

### Function: `get_average_budget_by_category`
- **Migrations involved**: 82_polytask_fasa_all.sql, 84_polytask_v2_hotfix.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION get_average_budget_by_category(p_category TEXT)
RETURNS NUMERIC AS $$
DECLARE
    avg_budget NUMERIC;
BEGIN
    SELECT COALESCE(AVG(budget), 0) INTO avg_budget
    FROM public.polytask_jobs
    WHERE category = p_category AND status IN ('COMPLETED', 'IN_PROGRESS', 'CLOSED');
    
    RETURN avg_budget;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Version 2
```sql
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
```

---

### Function: `get_database_health_metrics`
- **Migrations involved**: 20260512061000_61_wal_monitoring_rpc.sql

```sql
CREATE OR REPLACE FUNCTION public.get_database_health_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    result jsonb;
```

---

### Function: `get_expiring_polymart_orders`
- **Migrations involved**: 52_polymart_online_payment.sql

```sql
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
```

---

### Function: `get_karnival_booth_votes`
- **Migrations involved**: 38_karnival_v2.sql

```sql
CREATE OR REPLACE FUNCTION get_karnival_booth_votes(p_edition_id UUID, p_category_id UUID)
RETURNS TABLE(booth_id UUID, booth_name TEXT, booth_number TEXT, image_url TEXT, total_votes BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT b.id, b.kelab_name, b.booth_number, b.image_url, COUNT(v.id)
  FROM karnival_booths b
  LEFT JOIN karnival_votes_v2 v ON v.booth_id = b.id
  WHERE b.edition_id = p_edition_id AND b.category_id = p_category_id AND b.is_active = true
  GROUP BY b.id, b.kelab_name, b.booth_number, b.image_url
  ORDER BY COUNT(v.id) DESC, b.kelab_name ASC;
```

---

### Function: `get_klk_public_stats`
- **Migrations involved**: 41_klk_public_stats_rpc.sql

```sql
CREATE OR REPLACE FUNCTION get_klk_public_stats(academic_year_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_luar int;
```

---

### Function: `get_my_carpool_group_ids`
- **Migrations involved**: 50_polyrider_security_patch.sql

```sql
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
```

---

### Function: `get_my_karnival_votes_in_category`
- **Migrations involved**: 38_karnival_v2.sql

```sql
CREATE OR REPLACE FUNCTION get_my_karnival_votes_in_category(p_category_id UUID)
RETURNS TABLE(booth_id UUID, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT v.booth_id, v.created_at FROM karnival_votes_v2 v
  WHERE v.voter_id = auth.uid() AND v.category_id = p_category_id
  ORDER BY v.created_at DESC;
```

---

### Function: `handle_polytask_bid_acceptance`
- **Migrations involved**: 73_polytask_schema.sql, 84_polytask_v2_hotfix.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION handle_polytask_bid_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when a bid status changes to 'ACCEPTED'
    IF NEW.status = 'ACCEPTED' AND OLD.status != 'ACCEPTED' THEN
        
        -- 1. Tolak bidaan lain
        UPDATE public.polytask_bids 
        SET status = 'REJECTED' 
        WHERE job_id = NEW.job_id AND id != NEW.id;
        
        -- 2. Kemas kini status tugasan & tetapkan pekerja
        UPDATE public.polytask_jobs
        SET status = 'IN_PROGRESS',
            assigned_tasker_id = NEW.tasker_id,
            updated_at = NOW()
        WHERE id = NEW.job_id;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Version 2
```sql
CREATE OR REPLACE FUNCTION handle_polytask_bid_acceptance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.status = 'ACCEPTED' AND OLD.status != 'ACCEPTED' THEN
        UPDATE public.polytask_bids SET status = 'REJECTED' WHERE job_id = NEW.job_id AND id != NEW.id;
```

---

### Function: `handle_polytask_cancellation`
- **Migrations involved**: 81_polytask_cancellation_rate.sql, 84_polytask_v2_hotfix.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION handle_polytask_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'WITHDRAWN' AND OLD.status = 'ACCEPTED' THEN
        -- Tambah +1 pada cancellation_count
        UPDATE public.profiles
        SET polytask_cancellations = polytask_cancellations + 1
        WHERE id = NEW.tasker_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Version 2
```sql
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
```

---

### Function: `has_business_shift_access`
- **Migrations involved**: 30_business_shifts_system.sql

```sql
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
```

---

### Function: `increment_ai_google_tokens`
- **Migrations involved**: 39_track_google_api_tokens.sql

```sql
CREATE OR REPLACE FUNCTION public.increment_ai_google_tokens(tokens_used integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current bigint;
```

---

### Function: `increment_merit_by_source`
- **Migrations involved**: 67_fix_merit_system_audit.sql

```sql
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
```

---

### Function: `increment_polymart_ad_click`
- **Migrations involved**: 69_polymart_ads_schema_fix.sql

```sql
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
```

---

### Function: `is_klk_or_admin`
- **Migrations involved**: 48_polyrider_schema.sql, 50_polyrider_security_patch.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION public.is_klk_or_admin(uid UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Version 2
```sql
CREATE OR REPLACE FUNCTION public.is_klk_or_admin(uid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    role_val TEXT;
```

---

### Function: `is_polytask_admin`
- **Migrations involved**: 84_polytask_v2_hotfix.sql

```sql
CREATE OR REPLACE FUNCTION is_polytask_admin(uid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM public.profiles WHERE id = uid AND role IN ('JPP', 'SUPER_ADMIN_JPP'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

### Function: `lock_polyrider_carpool`
- **Migrations involved**: 50_polyrider_security_patch.sql

```sql
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
```

---

### Function: `log_polytask_critical_actions`
- **Migrations involved**: 82_polytask_fasa_all.sql, 84_polytask_v2_hotfix.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION log_polytask_critical_actions()
RETURNS TRIGGER AS $$
BEGIN
    -- Jika Tasker tarik diri
    IF NEW.status = 'OPEN' AND OLD.status = 'IN_PROGRESS' AND OLD.assigned_tasker_id IS NOT NULL AND NEW.assigned_tasker_id IS NULL THEN
        INSERT INTO public.admin_audit_logs (actor_id, action_type, table_name, record_id, old_data, new_data)
        VALUES (OLD.assigned_tasker_id, 'UPDATE', 'polytask_jobs', OLD.id::TEXT, row_to_json(OLD), row_to_json(NEW));
    END IF;

    -- Jika status jadi DISPUTED
    IF NEW.status = 'DISPUTED' AND OLD.status != 'DISPUTED' THEN
        INSERT INTO public.admin_audit_logs (actor_id, action_type, table_name, record_id, old_data, new_data)
        VALUES (COALESCE(auth.uid(), OLD.requester_id), 'UPDATE', 'polytask_jobs', OLD.id::TEXT, row_to_json(OLD), row_to_json(NEW));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Version 2
```sql
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
```

---

### Function: `polyrent_check_report_threshold`
- **Migrations involved**: 20260518120600_polyrent_fasa2.sql

```sql
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
```

---

### Function: `polyrent_get_average_rent`
- **Migrations involved**: 20260518115654_polyrent_fasa1_availability.sql

```sql
CREATE OR REPLACE FUNCTION polyrent_get_average_rent(lokasi_query text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_rent numeric;
```

---

### Function: `process_polyrider_appeal`
- **Migrations involved**: 51_polyrider_cancel_sos_appeals.sql

```sql
CREATE OR REPLACE FUNCTION public.process_polyrider_appeal(p_appeal_id uuid, p_approve boolean, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_admin_id UUID := auth.uid();
```

---

### Function: `process_polytask_appeal`
- **Migrations involved**: 84_polytask_v2_hotfix.sql

```sql
CREATE OR REPLACE FUNCTION process_polytask_appeal(p_appeal_id uuid, p_approve boolean, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('MAJLIS_TERTINGGI','EXCO_KEBAJIKAN','EXCO_KAMSIS','EXCO_KEUSAHAWANAN','DEVELOPER')) THEN
    RAISE EXCEPTION 'Unauthorized';
```

---

### Function: `release_polymart_stock`
- **Migrations involved**: 20260527162500_95_polymart_jsonb_variations.sql, 37_polymart_pos_sync.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION release_polymart_stock(
  p_product_id UUID,
  p_quantity INT,
  p_variation TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM update_product_variation_stock(p_product_id, p_variation, 0, -p_quantity);
```

#### Version 2
```sql
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
```

---

### Function: `remove_jpp_member`
- **Migrations involved**: 46_reset_jpp_cohort.sql

```sql
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
```

---

### Function: `report_polysuara_comment`
- **Migrations involved**: 20260529224800_98_polysuara_social_comments.sql

```sql
CREATE OR REPLACE FUNCTION public.report_polysuara_comment(p_comment_id UUID, p_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
```

---

### Function: `reserve_polymart_stock`
- **Migrations involved**: 20260527162500_95_polymart_jsonb_variations.sql, 37_polymart_pos_sync.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION reserve_polymart_stock(
  p_product_id UUID,
  p_quantity INT,
  p_variation TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INT;
```

#### Version 2
```sql
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
```

---

### Function: `reset_jpp_cohort`
- **Migrations involved**: 46_reset_jpp_cohort.sql

```sql
CREATE OR REPLACE FUNCTION reset_jpp_cohort()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role      TEXT;
```

---

### Function: `resolve_login_identifier`
- **Migrations involved**: 70_flexible_login_and_duplicate_detection.sql

```sql
CREATE OR REPLACE FUNCTION resolve_login_identifier(p_identifier TEXT)
RETURNS TABLE(email TEXT, match_type TEXT, match_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
```

---

### Function: `respond_carpool_request`
- **Migrations involved**: 50_polyrider_security_patch.sql

```sql
CREATE OR REPLACE FUNCTION public.respond_carpool_request(p_request_id uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_group_id UUID;
```

---

### Function: `restore_hidden_comment`
- **Migrations involved**: 20260529224800_98_polysuara_social_comments.sql

```sql
CREATE OR REPLACE FUNCTION public.restore_hidden_comment(p_comment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Hanya JPP dibenarkan memulihkan komen
    IF NOT public.is_jpp_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
```

---

### Function: `restore_hidden_confession`
- **Migrations involved**: 30_polysuara_downvote.sql

```sql
CREATE OR REPLACE FUNCTION public.restore_hidden_confession(p_confession_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
```

---

### Function: `rpc_pembersihan_akaun_lama`
- **Migrations involved**: 27_pembubaran_kelab.sql

```sql
CREATE OR REPLACE FUNCTION rpc_pembersihan_akaun_lama()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
    deleted_count integer;
```

---

### Function: `rpc_pembubaran_kohort`
- **Migrations involved**: 26_pembubaran_kohort.sql, 27_pembubaran_kelab.sql

```sql
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
```

---

### Function: `rpc_pembubaran_kohort_kelab`
- **Migrations involved**: 27_pembubaran_kelab.sql, quick_fix_pembubaran.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION rpc_pembubaran_kohort_kelab(target_club_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Arkib laporan & aktiviti yang Diluluskan/Selesai/COMPLETED untuk kelab khusus
    UPDATE public.club_activities 
    SET is_archived = TRUE 
    WHERE status = 'selesai' AND is_archived = FALSE AND club_id = target_club_id::uuid;
```

#### Version 2
```sql
CREATE FUNCTION public.rpc_pembubaran_kohort_kelab(target_club_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    club_uuid uuid;
```

---

### Function: `set_polyrider_job_expiry`
- **Migrations involved**: 52_polyrider_job_expiry.sql

```sql
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
```

---

### Function: `soft_or_hard_delete_polysuara_comment`
- **Migrations involved**: 20260529225900_99_polysuara_social_softdelete_images.sql

```sql
CREATE OR REPLACE FUNCTION public.soft_or_hard_delete_polysuara_comment(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_replies BOOLEAN;
```

---

### Function: `submit_polyservices_report`
- **Migrations involved**: 86_polyservices_moderation.sql

```sql
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
```

---

### Function: `supsas_claim_invite_code`
- **Migrations involved**: 36_supsas_schema.sql

```sql
CREATE OR REPLACE FUNCTION supsas_claim_invite_code(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kontingen supsas_kontingen%ROWTYPE;
```

---

### Function: `supsas_revoke_leader`
- **Migrations involved**: 36_supsas_schema.sql

```sql
CREATE OR REPLACE FUNCTION supsas_revoke_leader(p_kontingen_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP') THEN
    RAISE EXCEPTION 'Akses ditolak.';
```

---

### Function: `supsas_set_updated_at`
- **Migrations involved**: 36_supsas_schema.sql

```sql
CREATE OR REPLACE FUNCTION supsas_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW();
```

---

### Function: `sync_polysuara_comment_count`
- **Migrations involved**: 20260529224800_98_polysuara_social_comments.sql

```sql
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
```

---

### Function: `toggle_jpp_role`
- **Migrations involved**: 35_security_jpp_profile_rpc.sql

```sql
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
```

---

### Function: `toggle_polysuara_comment_vote`
- **Migrations involved**: 20260529224800_98_polysuara_social_comments.sql

```sql
CREATE OR REPLACE FUNCTION public.toggle_polysuara_comment_vote(p_comment_id UUID, p_vote_type VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
```

---

### Function: `toggle_polysuara_downvote`
- **Migrations involved**: 30_polysuara_downvote.sql

```sql
CREATE OR REPLACE FUNCTION public.toggle_polysuara_downvote(p_confession_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
```

---

### Function: `toggle_polysuara_upvote`
- **Migrations involved**: 30_polysuara_downvote.sql, 84_polysuara_schema.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION public.toggle_polysuara_upvote(p_confession_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
```

#### Version 2
```sql
CREATE OR REPLACE FUNCTION toggle_polysuara_upvote(p_confession_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
```

---

### Function: `transfer_business_ownership`
- **Migrations involved**: 33_transfer_business_ownership.sql

```sql
CREATE OR REPLACE FUNCTION transfer_business_ownership(p_business_id UUID, p_new_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_owner_id UUID;
```

---

### Function: `update_jpp_member_profile`
- **Migrations involved**: 35_security_jpp_profile_rpc.sql

```sql
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
```

---

### Function: `update_polytask_completion_metrics`
- **Migrations involved**: 81_polytask_cancellation_rate.sql, 84_polytask_v2_hotfix.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION update_polytask_completion_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        -- Tambah +1 pada polytask_completed_bids untuk tasker yang berjaya siapkan kerja
        IF NEW.assigned_tasker_id IS NOT NULL THEN
            UPDATE public.profiles
            SET polytask_completed_bids = polytask_completed_bids + 1
            WHERE id = NEW.assigned_tasker_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Version 2
```sql
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
```

---

### Function: `update_product_variation_stock`
- **Migrations involved**: 20260527162500_95_polymart_jsonb_variations.sql, 20260527162700_97_fix_update_product_variation_stock_updated_at.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION update_product_variation_stock(
  p_product_id UUID,
  p_variation TEXT,
  p_qty_change INT,
  p_reserved_change INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_variations JSONB;
```

#### Version 2
```sql
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
```

---

### Function: `update_rider_avg_rating`
- **Migrations involved**: 50_polyrider_security_patch.sql

```sql
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
```

---

### Function: `vendor_handle_cancellation`
- **Migrations involved**: 20260527162000_90_polymart_cancellation_flow.sql, 20260527162500_95_polymart_jsonb_variations.sql

#### Version 1
```sql
CREATE OR REPLACE FUNCTION vendor_handle_cancellation(
  p_order_id UUID,
  p_vendor_id UUID,
  p_action TEXT -- 'approve' or 'reject'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
```

#### Version 2
```sql
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
```

---

### Function: `verify_staff_code`
- **Migrations involved**: 34_staff_registration_code.sql

```sql
CREATE OR REPLACE FUNCTION verify_staff_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actual_code text;
```

---

## Triggers

### Trigger: `for`
- **Migrations involved**: 27_polysuara_v4_updates.sql

```sql
Create Trigger for Auto Censor (Regex Replace)
CREATE OR REPLACE FUNCTION public.censor_polysuara_content()
RETURNS TRIGGER AS $$
DECLARE
    rec RECORD;
```

---

### Trigger: `on_polyrent_report_inserted`
- **Migrations involved**: 20260518120600_polyrent_fasa2.sql

```sql
CREATE TRIGGER on_polyrent_report_inserted
    AFTER INSERT ON polyrent_reports
    FOR EACH ROW
    EXECUTE FUNCTION polyrent_check_report_threshold();
```

---

### Trigger: `on_polyrent_reverse_ads_updated`
- **Migrations involved**: 20260518121000_polyrent_fasa3.sql

```sql
CREATE TRIGGER on_polyrent_reverse_ads_updated
    BEFORE UPDATE ON polyrent_reverse_ads
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
```

---

### Trigger: `supsas_editions_updated_at`
- **Migrations involved**: 36_supsas_schema.sql

```sql
CREATE TRIGGER supsas_editions_updated_at    BEFORE UPDATE ON supsas_editions    FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
```

---

### Trigger: `supsas_fixtures_updated_at`
- **Migrations involved**: 36_supsas_schema.sql

```sql
CREATE TRIGGER supsas_fixtures_updated_at    BEFORE UPDATE ON supsas_fixtures    FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
```

---

### Trigger: `supsas_kontingen_updated_at`
- **Migrations involved**: 36_supsas_schema.sql

```sql
CREATE TRIGGER supsas_kontingen_updated_at   BEFORE UPDATE ON supsas_kontingen   FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
```

---

### Trigger: `supsas_sports_updated_at`
- **Migrations involved**: 36_supsas_schema.sql

```sql
CREATE TRIGGER supsas_sports_updated_at      BEFORE UPDATE ON supsas_sports      FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
```

---

### Trigger: `trg_auto_credit_kelab_merit`
- **Migrations involved**: 40_program_attendance_system.sql

```sql
CREATE TRIGGER trg_auto_credit_kelab_merit
  BEFORE INSERT OR UPDATE OF status
  ON program_attendees
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_credit_kelab_merit();
```

---

### Trigger: `trg_censor_polysuara`
- **Migrations involved**: 27_polysuara_v4_updates.sql

```sql
CREATE TRIGGER trg_censor_polysuara
BEFORE INSERT OR UPDATE OF content ON public.polysuara_confessions
FOR EACH ROW EXECUTE FUNCTION public.censor_polysuara_content();
```

---

### Trigger: `trg_censor_polysuara_comment`
- **Migrations involved**: 20260529224800_98_polysuara_social_comments.sql

```sql
CREATE TRIGGER trg_censor_polysuara_comment
BEFORE INSERT OR UPDATE OF content ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.censor_polysuara_content();
```

---

### Trigger: `trg_polyrider_job_expiry`
- **Migrations involved**: 52_polyrider_job_expiry.sql

```sql
CREATE TRIGGER trg_polyrider_job_expiry
  BEFORE INSERT ON public.polyrider_jobs
  FOR EACH ROW EXECUTE FUNCTION set_polyrider_job_expiry();
```

---

### Trigger: `trg_polysuara_comment_codename`
- **Migrations involved**: 20260529224800_98_polysuara_social_comments.sql

```sql
CREATE TRIGGER trg_polysuara_comment_codename
BEFORE INSERT ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.generate_polysuara_comment_codename();
```

---

### Trigger: `trg_polysuara_hourly_limit`
- **Migrations involved**: 20260518000000_update_polysuara_rate_limit.sql

```sql
CREATE TRIGGER trg_polysuara_hourly_limit
BEFORE INSERT ON public.polysuara_confessions
FOR EACH ROW EXECUTE FUNCTION public.check_polysuara_hourly_limit();
```

---

### Trigger: `trg_saved_locations_limit`
- **Migrations involved**: 54_polyrider_saved_locations.sql

```sql
CREATE TRIGGER trg_saved_locations_limit
  BEFORE INSERT ON public.polyrider_saved_locations
  FOR EACH ROW EXECUTE FUNCTION check_saved_locations_limit();
```

---

### Trigger: `trg_sync_polysuara_comment_count`
- **Migrations involved**: 20260529224800_98_polysuara_social_comments.sql

```sql
CREATE TRIGGER trg_sync_polysuara_comment_count
AFTER INSERT OR DELETE ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_polysuara_comment_count();
```

---

### Trigger: `trigger_check_polytask_bid_rate_limit`
- **Migrations involved**: 82_polytask_fasa_all.sql

```sql
CREATE TRIGGER trigger_check_polytask_bid_rate_limit
    BEFORE INSERT ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION check_polytask_bid_rate_limit();
```

---

### Trigger: `trigger_handle_polytask_cancellation`
- **Migrations involved**: 81_polytask_cancellation_rate.sql

```sql
CREATE TRIGGER trigger_handle_polytask_cancellation
    AFTER UPDATE ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION handle_polytask_cancellation();
```

---

### Trigger: `trigger_log_polytask_critical_actions`
- **Migrations involved**: 82_polytask_fasa_all.sql

```sql
CREATE TRIGGER trigger_log_polytask_critical_actions
    AFTER UPDATE ON public.polytask_jobs
    FOR EACH ROW
    EXECUTE FUNCTION log_polytask_critical_actions();
```

---

### Trigger: `trigger_polytask_bid_acceptance`
- **Migrations involved**: 73_polytask_schema.sql

```sql
CREATE TRIGGER trigger_polytask_bid_acceptance
    AFTER UPDATE ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION handle_polytask_bid_acceptance();
```

---

### Trigger: `trigger_update_polytask_completion_metrics`
- **Migrations involved**: 81_polytask_cancellation_rate.sql

```sql
CREATE TRIGGER trigger_update_polytask_completion_metrics
    AFTER UPDATE ON public.polytask_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_polytask_completion_metrics();
```

---

