# Handoff Report — Migration Analysis (`01_arkib_rls.sql` to `25_receipt_bucket.sql`)

This report provides a detailed read-only investigation and synthesis of the database migrations from `01_arkib_rls.sql` up to `25_receipt_bucket.sql`.

---

## 1. Observation

A direct read-only inspection was performed on the following 27 migration files located in `supabase/migrations/`:
- `01_arkib_rls.sql`
- `02_role_hierarchy.sql`
- `03_multiclub.sql`
- `04_department_and_membership.sql`
- `05_cascade_delete_fix.sql`
- `06_add_matric_no.sql`
- `07_fix_multiclub_rls.sql`
- `08_dashboard_rpc.sql`
- `08b_performance_indexes.sql`
- `09_karnival_voting.sql`
- `10_security_hardening.sql`
- `11_fasa3_security_rpc.sql`
- `12_fasa4_rls_hardening.sql`
- `13_fix_change_member_role_superadmin.sql`
- `14_leave_club_rpc.sql`
- `15_add_pengarah_program.sql`
- `16_add_monthly_target.sql` (UTF-16LE encoded, read using PowerShell `Get-Content`)
- `16_takwim_holidays.sql`
- `17_geomatik_to_akademik.sql`
- `18_ai_rate_limiting.sql`
- `19_ai_pro_rate_limiting.sql`
- `20_ai_flash_rate_limiting.sql`
- `21_ai_token_economy.sql`
- `22_ai_ecosystem_bonus.sql`
- `23_pro_tier_payment.sql`
- `24_pro_tier_expiration_enforcer.sql`
- `25_receipt_bucket.sql`

Here is a summary of all structural SQL components extracted directly from the migrations.

### A. Tables Defined or Altered

#### 1. `student_club_memberships` (Junction Table)
- **Defined in**: `03_multiclub.sql`
- **Columns**:
  - `id` UUID DEFAULT `gen_random_uuid()` PRIMARY KEY
  - `user_id` UUID NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE
  - `club_id` TEXT NOT NULL
  - `role` TEXT NOT NULL DEFAULT `'CLUB_MEMBER'`
  - `account_status` TEXT NOT NULL DEFAULT `'PENDING'` CHECK (`account_status` IN (`'PENDING'`, `'APPROVED'`, `'REJECTED'`))
  - `is_primary` BOOLEAN NOT NULL DEFAULT `FALSE`
  - `joined_at` TIMESTAMPTZ DEFAULT `NOW()`
  - `created_at` TIMESTAMPTZ DEFAULT `NOW()`
  - `updated_at` TIMESTAMPTZ DEFAULT `NOW()`
- **Constraints**:
  - `CONSTRAINT unique_student_club UNIQUE (user_id, club_id)`
  - Foreign key `student_club_memberships_user_id_fkey` on `user_id` referencing `profiles(id)` ON DELETE CASCADE (hardened in `05_cascade_delete_fix.sql`).
- **Indexes**:
  - `idx_scm_user_id` ON `student_club_memberships(user_id)`
  - `idx_scm_club_id` ON `student_club_memberships(club_id)`
  - `idx_scm_status` ON `student_club_memberships(account_status)`
  - `idx_scm_user_approved` ON `student_club_memberships(user_id, account_status) WHERE account_status = 'APPROVED'` (created in `08b_performance_indexes.sql`)
  - `idx_scm_club_approved` ON `student_club_memberships(club_id, account_status) WHERE account_status = 'APPROVED'` (created in `08b_performance_indexes.sql`)

#### 2. `karnival_votes`
- **Defined in**: `09_karnival_voting.sql`
- **Columns**:
  - `id` UUID DEFAULT `gen_random_uuid()` PRIMARY KEY
  - `voter_id` UUID NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE
  - `kelab_id` TEXT NOT NULL
  - `kelab_name` TEXT NOT NULL
  - `matric_no` TEXT
  - `created_at` TIMESTAMPTZ DEFAULT `NOW()`
- **Constraints**:
  - `CONSTRAINT unique_voter_kelab UNIQUE (voter_id, kelab_id)`
- **Indexes**:
  - `idx_votes_kelab_id` ON `karnival_votes(kelab_id)`
  - `idx_votes_voter_id` ON `karnival_votes(voter_id)`
  - `idx_votes_created` ON `karnival_votes(created_at DESC)`
- **Replica Identity**: `REPLICA IDENTITY FULL` (for realtime updates)

#### 3. `public.takwim_holidays`
- **Defined in**: `16_takwim_holidays.sql`
- **Columns**:
  - `id` UUID DEFAULT `gen_random_uuid()` PRIMARY KEY
  - `nama_cuti` TEXT NOT NULL
  - `tarikh_mula` DATE NOT NULL
  - `created_by` UUID REFERENCES `auth.users(id)`
  - `created_at` TIMESTAMPTZ DEFAULT `now()`

#### 4. `public.ai_usage_logs`
- **Defined in**: `22_ai_ecosystem_bonus.sql`
- **Columns**:
  - `id` UUID PRIMARY KEY DEFAULT `gen_random_uuid()`
  - `user_id` UUID REFERENCES `public.profiles(id)` ON DELETE CASCADE
  - `task_name` TEXT NOT NULL
  - `token_cost` INTEGER NOT NULL
  - `created_at` TIMESTAMPTZ DEFAULT `NOW()`

#### 5. `public.ai_tier_requests`
- **Defined in**: `22_ai_ecosystem_bonus.sql`
- **Columns**:
  - `id` UUID PRIMARY KEY DEFAULT `gen_random_uuid()`
  - `user_id` UUID REFERENCES `public.profiles(id)` ON DELETE CASCADE
  - `current_tier` TEXT NOT NULL
  - `requested_tier` TEXT NOT NULL
  - `reason` TEXT NOT NULL
  - `status` TEXT NOT NULL DEFAULT `'PENDING'` CHECK (`status` IN (`'PENDING'`, `'APPROVED'`, `'REJECTED'`))
  - `admin_notes` TEXT
  - `created_at` TIMESTAMPTZ DEFAULT `NOW()`
  - `updated_at` TIMESTAMPTZ DEFAULT `NOW()`
  - `receipt_url` TEXT DEFAULT `NULL` (Added in `23_pro_tier_payment.sql`)

#### 6. `system_settings` (Altered or Created)
- **Defined in**: `18_ai_rate_limiting.sql` (if not exists) and altered in `03_multiclub.sql` (type of column `value` modified from `boolean` to `jsonb` with default `'true'::jsonb`).
- **Columns**:
  - `key` TEXT PRIMARY KEY
  - `value` JSONB NOT NULL
- **Seeded Configuration Keys**:
  - `max_clubs_per_student` = `2` (Seeded in `03_multiclub.sql`)
  - `accept_all_memberships` = `false` (Seeded in `04_department_and_membership.sql`)
  - `karnival_voting_enabled` = `false`, `karnival_registration_open` = `true`, `karnival_title` = `"Hari Karnival JPP POLISAS"`, `karnival_max_votes` = `3` (Seeded in `09_karnival_voting.sql`)
  - `jpp_theme_color` = `"#6B1D2A"` (Seeded in `16_takwim_holidays.sql`)
  - `ai_rate_limit` = `{"warning_threshold": 50, "block_threshold": 65}` (Seeded in `18_ai_rate_limiting.sql`)
  - `ai_token_settings` = `{"free_tier_tokens": 200, "pro_tier_tokens": 1000, "costs": {"pro_kertas_kerja": 50, "flash_kertas_kerja": 20, "semak_ejaan": 0, "analisis": 5}}` (Seeded in `21_ai_token_economy.sql`)
  - *Note*: `ai_pro_rate_limit` and `ai_flash_rate_limit` were seeded in `19_ai_pro_rate_limiting` and `20_ai_flash_rate_limiting` but were deleted during cleanup in `21_ai_token_economy`.

#### 7. Other Table Alterations
- **`profiles`**:
  - Added `department` TEXT (in `04_department_and_membership.sql`)
  - Modified FK `profiles_id_fkey` on `id` referencing `auth.users(id) ON DELETE CASCADE` (in `05_cascade_delete_fix.sql`)
  - Added `matric_no` TEXT (in `06_add_matric_no.sql`)
  - Added `ai_daily_usage` INT DEFAULT `0`, `ai_last_reset` TIMESTAMPTZ DEFAULT `now()`, `ai_status` TEXT DEFAULT `'active'` (in `18_ai_rate_limiting.sql`)
  - Added `ai_pro_monthly_usage` INT DEFAULT `0`, `ai_pro_last_reset` TIMESTAMPTZ DEFAULT `now()` (in `19_ai_pro_rate_limiting.sql` - dropped in `21_ai_token_economy.sql`)
  - Added `ai_flash_daily_usage` INT DEFAULT `0`, `ai_flash_last_reset` TIMESTAMPTZ DEFAULT `now()` (in `20_ai_flash_rate_limiting.sql` - dropped in `21_ai_token_economy.sql`)
  - Added `subscription_tier` TEXT DEFAULT `'free'`, `ai_token_balance` INT DEFAULT `200`, `ai_token_last_reset` TIMESTAMPTZ DEFAULT `now()` (in `21_ai_token_economy.sql`)
  - Added `ai_tier_expiration` TIMESTAMPTZ DEFAULT `NULL` (in `23_pro_tier_payment.sql`)
  - Created Indexes:
    - `idx_profiles_club_status` ON `profiles(club_id, account_status)`
    - `idx_profiles_merit_desc` ON `profiles(merit DESC NULLS LAST)`
- **`programs`**:
  - Added `club_id` TEXT (in `03_multiclub.sql`)
  - Added `pengarah_program` TEXT (in `15_add_pengarah_program.sql` and checked in `16_takwim_holidays.sql`)
  - Created Indexes:
    - `idx_programs_club_status` ON `programs(club_id, status)`
    - `idx_programs_club_updated` ON `programs(club_id, updated_at DESC)`
- **`clubs`**:
  - Added `is_active` BOOLEAN DEFAULT `TRUE` (in `04_department_and_membership.sql`)
- **`club_activities`**:
  - Modified FK `club_activities_user_id_fkey` on `user_id` referencing `profiles(id)` ON DELETE CASCADE (in `05_cascade_delete_fix.sql`)
  - Created Indexes:
    - `idx_activities_club_date` ON `club_activities(club_id, start_date DESC)`
    - `idx_activities_club_status` ON `club_activities(club_id, status)`
- **`keusahawanan_businesses`**:
  - Added `monthly_target` NUMERIC DEFAULT `5000` (in `16_add_monthly_target.sql`)
- **Other Indexes Created in `08b_performance_indexes.sql`**:
  - Table `club_tasks`:
    - `idx_tasks_club_archived` ON `club_tasks(club_id, is_archived, due_date DESC)`
    - `idx_tasks_club_approval` ON `club_tasks(club_id, approval_status)`
  - Table `club_announcements`:
    - `idx_announcements_club_created` ON `club_announcements(club_id, created_at DESC)`

---

### B. Custom Enums, Types, or Domains
No custom PostgreSQL enums, custom types, or domains (`CREATE TYPE` or `CREATE DOMAIN`) are defined in these migrations. Status values and tiers are managed directly as TEXT columns with CHECK constraints.

---

### C. Custom PostgreSQL Functions (RPCs) and Triggers

#### 1. Functions & Triggers for Role Hierarchies (`02_role_hierarchy.sql`)
- **`can_change_role(actor_id UUID, target_id UUID, new_role TEXT) RETURNS BOOLEAN`**:
  - Validates permissions to update roles according to hierarchy (Super Admin can change all; Advisors can change President/MT/Member; Presidents can change MT/Member; users cannot change themselves).
- **`log_role_change() RETURNS TRIGGER`**:
  - Logs differences in `profiles.role` into `club_logs` dynamically if `club_logs` table exists.
- **Trigger `on_profile_role_change` on `profiles`**:
  - `AFTER UPDATE OF role ON profiles FOR EACH ROW EXECUTE FUNCTION log_role_change()`

#### 2. Functions & Triggers for Membership Limit (`03_multiclub.sql`, `10_security_hardening.sql`, `17_geomatik_to_akademik.sql`)
- **`enforce_club_membership_limit() RETURNS TRIGGER`**:
  - Restricts student memberships to `max_clubs_per_student` limit.
  - Hardened with `pg_advisory_xact_lock(hashtext(NEW.user_id::text))` to prevent race conditions during concurrent requests.
  - Modified in migration `17` to implement special GEOSAS rule: civil engineering (`awam`) students who are members of GEOSAS receive a membership limit of +1 (total 3).
- **Trigger `check_club_membership_limit` on `student_club_memberships`**:
  - `BEFORE INSERT OR UPDATE OF account_status ON student_club_memberships FOR EACH ROW EXECUTE FUNCTION enforce_club_membership_limit()`

#### 3. General Helper and RPC Query Functions
- **`get_user_club_ids(p_user_id UUID) RETURNS TEXT[]`** (`03_multiclub.sql`):
  - Returns approved club IDs for a user.
- **`get_user_approved_club_ids(p_uid UUID) RETURNS TEXT[]`** (`07_fix_multiclub_rls.sql`):
  - SECURITY DEFINER helper to fetch approved club IDs and avoid RLS infinite recursion.
- **`get_dashboard_data(p_club_id TEXT, p_user_id UUID, p_is_member BOOLEAN DEFAULT FALSE) RETURNS JSONB`**:
  - Combines 8 queries into 1 database call.
  - Replaced in `10_security_hardening.sql` with a manual authorization check (caller must be an approved club member or JPP) and performance limiters (cap members at 300, tasks at 50, removes email addresses for privacy).
- **`change_member_role(p_actor_id UUID, p_target_id UUID, p_club_id TEXT, p_new_role TEXT) RETURNS VOID`**:
  - Replaced in `11_fasa3_security_rpc.sql` and `13_fix_change_member_role_superadmin.sql`. Handles membership roles updates with strict validation checks. Grants execution privilege to `authenticated`.
- **`approve_all_pending_memberships(p_club_id TEXT) RETURNS INT`** (`10_security_hardening.sql`):
  - Approves all memberships for a club within student limit boundaries.
- **`increment_merit(target_user_id UUID, delta INTEGER) RETURNS VOID`**:
  - Atomic merit update using `FOR UPDATE` lock. Replaced in `11_fasa3_security_rpc.sql`.
- **`is_club_leader(p_uid UUID, p_club_id TEXT) RETURNS BOOLEAN`** (`12_fasa4_rls_hardening.sql`):
  - Helper to check if user is an approved President, MT, or Advisor.
- **`is_club_president(p_uid UUID, p_club_id TEXT) RETURNS BOOLEAN`** (`12_fasa4_rls_hardening.sql`):
  - Helper to check if user is an approved President.
- **`is_jpp_admin(p_uid UUID) RETURNS BOOLEAN`** (`12_fasa4_rls_hardening.sql`):
  - Helper to check if user is JPP/Super Admin.
- **`request_leave_club(p_club_id TEXT, p_is_primary BOOLEAN) RETURNS BOOLEAN`** (`14_leave_club_rpc.sql`):
  - Allows students to leave a club. Sets status to `RESIGN_PENDING` if it is their primary club, otherwise immediately deletes the membership record.
- **`get_vote_counts() RETURNS TABLE(...)`**, **`has_voted_for(...) RETURNS BOOLEAN`**, **`get_my_votes() RETURNS TABLE(...)`** (`09_karnival_voting.sql`):
  - Handles queries and verification for Karnival voting.

#### 4. Functions for AI Rate Limiting and Token Economy
- **`track_ai_usage() RETURNS TEXT`** (`18_ai_rate_limiting.sql`):
  - Tracks free-tier AI calls, triggers warnings or 24-hour temporary suspensions when thresholds are crossed.
- **`track_ai_pro_usage(action TEXT) RETURNS JSONB`** (`19_ai_pro_rate_limiting.sql`):
  - Tracks Pro-tier monthly calls (deprecated/dropped in `21_ai_token_economy.sql`).
- **`track_ai_flash_usage(action TEXT) RETURNS JSONB`** (`20_ai_flash_rate_limiting.sql`):
  - Tracks Flash daily calls (deprecated/dropped in `21_ai_token_economy.sql`).
- **`spend_ai_tokens(task_name TEXT) RETURNS BOOLEAN`**:
  - Dynamically deducts tokens from user balance.
  - Replaced in `22_ai_ecosystem_bonus.sql` to log calls to `ai_usage_logs`.
  - Replaced in `24_pro_tier_expiration_enforcer.sql` to merge monthly token allowance resets, daily safety limits, anti-spam protections, and automatic tier degradation for expired PRO accounts.
- **`check_ai_tokens(task_name TEXT) RETURNS JSONB`** (`24_pro_tier_expiration_enforcer.sql`):
  - Returns check statuses (costs, daily usage, limits, affordability, and checks PRO expiration).
- **`update_user_ai_tier(target_user_id UUID, new_tier TEXT) RETURNS VOID`**:
  - Upgrades/downgrades AI subscription tier.
  - Replaced in `23_pro_tier_payment.sql` to set `ai_tier_expiration` to `NOW() + interval '30 days'` for Pro accounts, and safely accumulate balances (capped at 2000 tokens).

---

### D. Storage Buckets and Access Policies

#### 1. Bucket Definition
The `'receipts'` bucket is defined in `25_receipt_bucket.sql`:
- **ID**: `receipts`
- **Name**: `receipts`
- **Public**: `false` (Private bucket)
- **File Size Limit**: `5242880` bytes (5 MB)
- **Allowed MIME Types**: `['image/jpeg', 'image/png', 'image/webp', 'application/pdf']`

#### 2. Bucket Security Policies
Defined on `storage.objects`:
1. **"Admin boleh lihat resit"** (SELECT):
   - `TO authenticated`
   - `USING (bucket_id = 'receipts' AND ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP')))`
2. **"Admin boleh padam resit"** (DELETE):
   - `TO authenticated`
   - `USING (bucket_id = 'receipts' AND ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP')))`
3. **"Pelajar boleh masukkan resit sendiri"** (INSERT):
   - `TO authenticated`
   - `WITH CHECK (bucket_id = 'receipts' AND (auth.uid()::text = (string_to_array(name, '/'))[1]))`

---

### E. Row-Level Security (RLS) Policies Defined

The following tables have RLS policies configured across the migrations:

| Table | Policy Name | Operation | Target | Condition / Logic |
|---|---|---|---|---|
| **`programs`** | `JPP_Full_Access_Programs` | ALL | `authenticated` | `is_jpp_admin(auth.uid())` |
| **`club_reports`** | `JPP can read all club_reports` | SELECT | `public` | `auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP')` (Overridden/Hardened in `12` but no replacement policy defined, only dropped JPP bypass RLS) |
| **`student_club_memberships`** | `Students can read own memberships` | SELECT | `public` | `auth.uid()::text = user_id::text` |
| | `Members can read fellow club memberships` | SELECT | `public` | `club_id = ANY(get_user_approved_club_ids(auth.uid()))` |
| | `Leaders_Can_Read_Club_Memberships` | SELECT | `public` | `is_club_leader(auth.uid(), student_club_memberships.club_id::text) OR is_jpp_admin(auth.uid())` |
| | `Students can apply to clubs` | INSERT | `public` | `auth.uid()::text = user_id::text AND role = 'CLUB_MEMBER' AND account_status = 'PENDING'` |
| | `Leaders_Can_Manage_Club_Memberships` | UPDATE | `public` | `USING: is_club_leader(...) OR is_jpp_admin(...)`<br>`WITH CHECK: account_status IN ('APPROVED', 'REJECTED', 'KICKED', 'RESIGN_PENDING')` |
| **`karnival_votes`** | `Anyone can read votes` | SELECT | `public` | `true` |
| | `User can vote for themselves` | INSERT | `public` | `auth.uid() = voter_id` |
| | `User can delete own vote` | DELETE | `public` | `auth.uid() = voter_id` |
| | `JPP Admin full access on votes` | ALL | `public` | `auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP')` |
| **`takwim_holidays`** | `Everyone can view holidays` | SELECT | `public` | `true` |
| | `JPP admin can manage holidays` | ALL | `public` | `EXISTS (SELECT 1 FROM student_club_memberships WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN_JPP')` |
| **`system_settings`** | `Everyone can read system_settings` | SELECT | `authenticated` | `true` |
| | `Admins_Can_Update_Settings` | UPDATE | `authenticated` | `is_jpp_admin(auth.uid())` |
| | `Admins can manage system_settings` | ALL | `authenticated` | `EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'SUPER_ADMIN_JPP')` |
| **`club_committee`** | `Manage_Committee_Membership_Based` | ALL | `public` | `is_club_leader(auth.uid(), club_committee.club_id::text) OR is_jpp_admin(auth.uid())` |
| **`clubs`** | `Allow_Update_Club_Membership_Based` | UPDATE | `public` | `is_club_president(auth.uid(), clubs.id::text) OR is_jpp_admin(auth.uid())` |
| **`merit_transactions`** | `Leaders_Can_View_Club_Merit` | SELECT | `public` | `auth.uid() = user_id OR is_jpp_admin(auth.uid())` |
| **`profiles`** | `Presidents_Can_Update_Club_Merit` | UPDATE | `public` | `auth.uid() = id OR is_jpp_admin(auth.uid())` |
| **`club_logs`** | `Members_View_Club_Logs` | SELECT | `public` | `(club_id)::text = ANY(get_user_approved_club_ids(auth.uid())) OR is_jpp_admin(auth.uid())` |
| **`ai_usage_logs`** | `Users can insert own ai logs` | INSERT | `public` | `auth.uid() = user_id` |
| | `Admins can view all ai logs` | SELECT | `public` | `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))` |
| **`ai_tier_requests`** | `Users can insert own tier requests` | INSERT | `public` | `auth.uid() = user_id` |
| | `Users can view own tier requests` | SELECT | `public` | `auth.uid() = user_id` |
| | `Admins can manage all tier requests` | ALL | `public` | `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP'))` |

---

## 2. Logic Chain

1. **Table Structure Synthesis**: 
   - Tables such as `student_club_memberships`, `karnival_votes`, `public.takwim_holidays`, `ai_usage_logs`, and `ai_tier_requests` were created from scratch inside the migration files (`03`, `09`, `16`, and `22`).
   - Columns and constraints were documented step-by-step from their initial definitions and subsequent modification statements (e.g., adding `receipt_url` to `ai_tier_requests` in `23_pro_tier_payment.sql`).
2. **Function & Trigger Evolution**:
   - The analysis tracked the iterations of key RPC functions like `get_dashboard_data`, `change_member_role`, `enforce_club_membership_limit`, and `spend_ai_tokens`.
   - The trigger `check_club_membership_limit` executes `enforce_club_membership_limit` BEFORE inserts or updates on status. Its logic evolved from basic quota checks (`03`) to locking against race conditions (`10`) and adding JKA/GEOSAS quota rules (`17`).
3. **Storage Analysis**:
   - Bucket creation statement in `25_receipt_bucket.sql` directly maps to inserting a record into `storage.buckets` table.
   - Three specific policies defined on `storage.objects` secure this bucket.
4. **RLS Verification**:
   - Overriding policies are linked to helper functions (`is_jpp_admin`, `is_club_leader`, `is_club_president`, `get_user_approved_club_ids`) to ensure security rules are resolved without causing circular reference recursion.

---

## 3. Caveats

- **Existing Tables Reference**: Some tables referenced in these migrations (e.g., `profiles`, `programs`, `clubs`, `club_tasks`, `club_activities`, `club_announcements`, `club_committee`, `merit_transactions`, `club_logs`) were created in migrations prior to `01_arkib_rls.sql` or are part of the baseline schema. This report only covers the fields and constraints added or modified within the `01` to `25` migration range.
- **Constraints Discrepancy**: The table constraint for `student_club_memberships.account_status` limits status to `('PENDING', 'APPROVED', 'REJECTED')`, but RLS policies (`12_fasa4_rls_hardening.sql`) allow checks for `KICKED` and `RESIGN_PENDING`, and `request_leave_club` updates records to `RESIGN_PENDING`. If the database checks are not updated via an alter command (none found in `01` to `25`), inserts/updates using `KICKED` or `RESIGN_PENDING` will fail at the database level regardless of RLS checks.

---

## 4. Conclusion

The database migrations `01` to `25` systematically harden the JPP-POLISAS system by:
- Transitioning to a dynamic multi-club architecture using `student_club_memberships`.
- Optimizing dashboard queries by replacing sequential frontend queries with aggregated, secure RPCs (`get_dashboard_data`).
- Securing the AI assistant with daily limits, token balances (`spend_ai_tokens`), and automatic Pro tier expiration enforcements.
- Setting up a secure storage bucket for receipts with strict user folder ownership.

---

## 5. Verification Method

To independently verify these findings, run the following queries or commands inside the Supabase SQL editor or local client:
1. **Schema Check for student_club_memberships**:
   ```sql
   SELECT column_name, data_type, is_nullable, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'student_club_memberships';
   ```
2. **Review Functions and Triggers**:
   ```sql
   SELECT proname, prosrc 
   FROM pg_proc 
   WHERE proname IN ('get_dashboard_data', 'enforce_club_membership_limit', 'spend_ai_tokens', 'can_change_role');
   ```
3. **Review Storage Buckets**:
   ```sql
   SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'receipts';
   ```
4. **List RLS Policies**:
   ```sql
   SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public';
   ```
