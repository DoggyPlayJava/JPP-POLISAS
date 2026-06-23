# JPP-POLISAS Database Blueprint

This document provides a comprehensive blueprint of the reconstructed database schema, foreign key relations, custom types, functions, triggers, and Row-Level Security (RLS) policies for the **JPP-POLISAS** system.

---

## 1. Dual-RBAC & Permission Architecture

The database enforces a **Dual-RBAC architecture** that maps **Global User Roles** against **Club Memberships** and **Exco Department Assignments**.

### Global Roles
Global roles are defined on the `profiles.role` column and define system-wide access:
* **`SUPER_ADMIN_JPP`**: Pentadbir Mutlak. Complete unrestricted read and write privileges across all modules, settings, RLS bypasses, and schema components.
* **`JPP`**: Ahli Jawatankuasa Perwakilan Pelajar (Exco members). Subject to department-level constraints based on their assigned `jpp_unit` or position.
* **`STAFF`**: General administration staff (e.g. Asrama or Kebajikan unit managers).
* **`CLUB_ADVISOR`**: Penasihat Kelab (staff). Managed through `student_club_memberships`.
* **`CLUB_PRESIDENT`**: Presiden Kelab (student). Managed through `student_club_memberships`.
* **`CLUB_MT`**: Ahli Jawatankuasa Kelab (student Exco). Managed through `student_club_memberships`.
* **`CLUB_MEMBER`**: Ordinary student member.

### Club-Specific Roles & Exco Evaluation
Permissions are evaluated dynamically:
1. **Club Scope**: Checked using `student_club_memberships` table, which holds `(user_id, club_id, role, account_status)`. Approved members can read club tasks/activities. Leaders (`is_club_leader` RPC) can write.
2. **Exco Scope**: Checked using `profiles.jpp_unit` and `profiles.jpp_position`, or specialized assignments tables:
   * **Kebajikan**: Checked via `kebajikan_staff_assignments`.
   * **Keusahawanan**: Checked via `keusahawanan_unit_admins`.
   * **Asrama**: Checked via `asrama_unit_admins`.
   * **KPP**: Manages activities/committee structures via `is_club_leader(...)` helper or `is_jpp_admin(...)` helper.

---

## 2. Reconstructed Storage Buckets and Security Policies

A total of **16 storage buckets** are defined and secured under the `storage` schema. RLS is enabled on `storage.objects` with optimized subqueries.

| Bucket Name | Accessibility | File Size Limit | Allowed MIME Types |
|---|---|---|---|
| `receipts` | Private (Admins/JPP only) | 5 MB | JPEG, PNG, WebP, PDF |
| `reports` | Private (Admins/JPP only) | Unlimited | All |
| `avatars` | Public (Owner writable) | Unlimited | All |
| `club-logos` | Public (Auth writable) | Unlimited | All |
| `announcements` | Public (JPP writable) | 10 MB | JPEG, PNG, WebP, GIF |
| `karnival-booths` | Public (JPP writable) | 5 MB | JPEG, PNG, WebP, GIF |
| `kebajikan-images` | Public (Auth writable) | Unlimited | All |
| `keusahawanan-products` | Public (Auth writable) | 5 MB | JPEG, PNG, WebP |
| `polymart-ads` | Public (Admin writable) | Unlimited | All |
| `polymart-receipts` | Public (Auth writable) | Unlimited | All |
| `polysuara_attachments` | Public (Auth writable) | Unlimited | All |
| `keusahawanan` | Public (Auth writable) | Unlimited | All |
| `imaps_assets` | Public (Auth writable) | 5 MB | JPEG, PNG, WebP, GIF |
| `polytask_proofs` | Public (Auth writable) | Unlimited | All |
| `polyrent` | Public (Owner writable) | Unlimited | All |
| `supsas-assets` | Public (JPP writable) | Unlimited | All |

---

## 3. Database Optimizations Applied

### RLS Init-Plan Optimization
Traditional RLS policies using bare `auth.uid()` or `auth.role()` force PostgreSQL to execute the function once per row during scans (an $O(N)$ lookup cost). By wrapping them in a subquery select, i.e. `(SELECT auth.uid())` and `(SELECT auth.role())`, the query planner treats them as stable constants and evaluates them exactly once per query execution (an $O(1)$ query startup cost). This prevents table scans and CPU spikes during high-concurrency seasons (e.g. Orientation Season with 1,500 concurrent users).

### Foreign Key Covering Indexes
To avoid sequential table scans during joins and cascade deletes, **every foreign key column in every table has been verified to have an index**. This reduces index lookup latencies to $O(\log N)$.
Key performance indexes (e.g. `idx_scm_user_approved` and `idx_scm_club_approved` with partial index `WHERE account_status = 'APPROVED'`) are created for frequently-queried junctions.

---

## 4. Custom Enums

The database schema defines **14 custom enums** to enforce domain integrity:
* `polyrent_status`: `'OPEN'`, `'CLOSED'`, `'HIDDEN'`, `'SUSPENDED'`
* `keusahawanan_business_status`: `'PENDING_INTERVIEW'`, `'ACTIVE'`, `'REJECTED'`
* `keusahawanan_membership_role`: `'OWNER'`, `'MEMBER'`
* `keusahawanan_membership_status`: `'PENDING'`, `'ACTIVE'`, `'REJECTED'`
* `polymart_ad_status`: `'DRAFT'`, `'ACTIVE'`, `'INACTIVE'`
* `polymart_ad_type`: `'INTERNAL'`, `'EXTERNAL'`
* `pos_discount_type`: `'FIXED'`, `'PERCENT'`
* `pos_log_action`: TRANSACTION/PRODUCT/STOCK/STAFF audit actions.
* `pos_payment_method`: `'CASH'`, `'QR'`, `'TRANSFER'`
* `pos_transaction_status`: `'COMPLETED'`, `'VOIDED'`
* `program_status`: `'DRAFT'`, `'PENDING_APPROVAL'`, `'CONFIRMED'`, `'IN_PROGRESS'`, `'PENDING_POSTMORTEM'`, `'COMPLETED'`, `'ARCHIVED'`, `'REQUEST_UNLOCK'`
* `polytask_job_status`: `'OPEN'`, `'IN_PROGRESS'`, `'COMPLETED'`, `'CANCELLED'`, `'DISPUTED'`
* `polytask_bid_status`: `'PENDING'`, `'ACCEPTED'`, `'REJECTED'`, `'WITHDRAWN'`
* `buckettype`: `'STANDARD'`, `'ANALYTICS'`, `'VECTOR'`

---

## 5. Entities and Modules Summary

Below is the structured listing of all **90 tables and views** in the schema.

### Module: Core/Auth

#### Table: `club_committee`
Columns:
* `category`: `string | null`
* `club_id`: `string | null`
* `created_at`: `string | null`
* `full_name`: `string`
* `id`: `string`
* `image_url`: `string | null`
* `order_index`: `number | null`
* `position_title`: `string`
* `student_id`: `string | null`
Relationships:
* `club_id` references `clubs(id)` (via `club_committee_club_id_fkey`)

#### Table: `club_members`
Columns:
* `club_id`: `string | null`
* `created_at`: `string`
* `id`: `string`
* `matrix_no`: `string`
* `name`: `string`
* `position`: `string`
Relationships:
* `club_id` references `clubs(id)` (via `club_members_club_id_fkey`)

#### Table: `clubs`
Columns:
* `category`: `string | null`
* `created_at`: `string | null`
* `description`: `string | null`
* `id`: `string`
* `is_active`: `boolean | null`
* `logo_url`: `string | null`
* `name`: `string`
* `president_id`: `string | null`
* `short_name`: `string`
* `theme_color`: `string | null`

#### Table: `profiles`
Columns:
* `account_status`: `string | null`
* `ai_daily_usage`: `number | null`
* `ai_last_reset`: `string | null`
* `ai_status`: `string | null`
* `ai_tier_expiration`: `string | null`
* `ai_token_balance`: `number | null`
* `ai_token_last_reset`: `string | null`
* `avatar_url`: `string | null`
* `club_id`: `string | null`
* `created_at`: `string`
* `department`: `string | null`
* `email`: `string`
* `full_name`: `string | null`
* `id`: `string`
* `intake_period`: `number | null`
* `intake_year`: `number | null`
* `jabatan`: `string | null`
* `jpp_position`: `string | null`
* `jpp_unit`: `string | null`
* `matric_no`: `string | null`
* `merit`: `number | null`
* `merit_akademik`: `number`
* `merit_asrama`: `number`
* `merit_kelab`: `number`
* `phone`: `string | null`
* `programme_code`: `string | null`
* `role`: `string | null`
* `semester_override`: `number | null`
* `subscription_tier`: `string | null`
Relationships:
* `club_id` references `clubs(id)` (via `profiles_club_id_fkey`)

#### Table: `student_club_memberships`
Columns:
* `account_status`: `string`
* `club_id`: `string`
* `created_at`: `string | null`
* `id`: `string`
* `is_primary`: `boolean`
* `joined_at`: `string | null`
* `role`: `string`
* `updated_at`: `string | null`
* `user_id`: `string`
Relationships:
* `user_id` references `profiles(id)` (via `student_club_memberships_user_id_fkey`)

### Module: Academic

#### Table: `akademik_cgpa_records`
Columns:
* `created_at`: `string | null`
* `drive_file_id`: `string | null`
* `drive_view_url`: `string | null`
* `hpnm`: `number | null`
* `id`: `string`
* `is_user_verified`: `boolean | null`
* `pnm`: `number | null`
* `scan_raw`: `string | null`
* `semester`: `number | null`
* `tahun`: `string | null`
* `user_id`: `string`
Relationships:
* `user_id` references `profiles(id)` (via `akademik_cgpa_records_user_id_fkey`)

#### Table: `akademik_files`
Columns:
* `created_at`: `string | null`
* `description`: `string | null`
* `download_count`: `number | null`
* `drive_download_url`: `string | null`
* `drive_file_id`: `string | null`
* `drive_view_url`: `string | null`
* `file_name`: `string | null`
* `file_size`: `number | null`
* `file_size_bytes`: `number | null`
* `file_type`: `string | null`
* `folder_id`: `string | null`
* `id`: `string`
* `is_personal`: `boolean | null`
* `name`: `string`
* `owner_user_id`: `string | null`
* `uploaded_by`: `string | null`
Relationships:
* `folder_id` references `akademik_folders(id)` (via `akademik_files_folder_id_fkey`)
* `owner_user_id` references `profiles(id)` (via `akademik_files_owner_user_id_fkey`)
* `uploaded_by` references `profiles(id)` (via `akademik_files_uploaded_by_fkey`)

#### Table: `akademik_folders`
Columns:
* `created_at`: `string | null`
* `created_by`: `string | null`
* `description`: `string | null`
* `id`: `string`
* `is_public`: `boolean | null`
* `name`: `string`
* `parent_id`: `string | null`
* `sort_order`: `number | null`
Relationships:
* `created_by` references `profiles(id)` (via `akademik_folders_created_by_fkey`)
* `parent_id` references `akademik_folders(id)` (via `akademik_folders_parent_id_fkey`)

#### Table: `akademik_merit_config`
Columns:
* `id`: `string`
* `jenis`: `string`
* `merit_value`: `number`
* `peringkat`: `string`
* `updated_at`: `string | null`
* `updated_by`: `string | null`
Relationships:
* `updated_by` references `profiles(id)` (via `akademik_merit_config_updated_by_fkey`)

#### Table: `akademik_pencapaian`
Columns:
* `category_id`: `string | null`
* `created_at`: `string | null`
* `drive_download_url`: `string | null`
* `drive_file_id`: `string | null`
* `drive_view_url`: `string | null`
* `id`: `string`
* `jenis`: `string`
* `merit_auto`: `number | null`
* `merit_override`: `number | null`
* `nama_pencapaian`: `string`
* `notes`: `string | null`
* `penganjur`: `string | null`
* `peringkat`: `string`
* `rejection_reason`: `string | null`
* `status`: `string | null`
* `tarikh`: `string | null`
* `user_id`: `string`
* `verified_at`: `string | null`
* `verified_by`: `string | null`
Relationships:
* `category_id` references `akademik_sijil_categories(id)` (via `akademik_pencapaian_category_id_fkey`)
* `user_id` references `profiles(id)` (via `akademik_pencapaian_user_id_fkey`)
* `verified_by` references `profiles(id)` (via `akademik_pencapaian_verified_by_fkey`)

#### Table: `akademik_qr_scans`
Columns:
* `id`: `string`
* `merit_awarded`: `number`
* `scanned_at`: `string | null`
* `token_id`: `string`
* `user_id`: `string`
Relationships:
* `token_id` references `akademik_qr_tokens(id)` (via `akademik_qr_scans_token_id_fkey`)
* `user_id` references `profiles(id)` (via `akademik_qr_scans_user_id_fkey`)

#### Table: `akademik_qr_tokens`
Columns:
* `available_from`: `string | null`
* `available_until`: `string | null`
* `category`: `string | null`
* `cooldown_hours`: `number | null`
* `created_at`: `string | null`
* `created_by`: `string | null`
* `current_scans_total`: `number | null`
* `description`: `string | null`
* `expires_at`: `string | null`
* `id`: `string`
* `is_active`: `boolean | null`
* `max_scans_total`: `number | null`
* `merit_value`: `number`
* `source_unit`: `string | null`
* `time_zone`: `string | null`
* `title`: `string`
* `token`: `string | null`
Relationships:
* `created_by` references `profiles(id)` (via `akademik_qr_tokens_created_by_fkey`)

#### Table: `akademik_sijil_categories`
Columns:
* `color`: `string | null`
* `created_at`: `string | null`
* `created_by`: `string | null`
* `icon`: `string | null`
* `id`: `string`
* `is_active`: `boolean | null`
* `name`: `string`
* `sort_order`: `number | null`
Relationships:
* `created_by` references `profiles(id)` (via `akademik_sijil_categories_created_by_fkey`)

#### Table: `akademik_unlock_requests`
Columns:
* `created_at`: `string`
* `id`: `string`
* `pencapaian_id`: `string`
* `reason`: `string`
* `reviewed_at`: `string | null`
* `reviewed_by`: `string | null`
* `reviewer_note`: `string | null`
* `status`: `string`
* `unlocked_until`: `string | null`
* `user_id`: `string`
Relationships:
* `pencapaian_id` references `akademik_pencapaian(id)` (via `akademik_unlock_requests_pencapaian_id_fkey`)
* `reviewed_by` references `profiles(id)` (via `akademik_unlock_requests_reviewed_by_fkey`)
* `user_id` references `profiles(id)` (via `akademik_unlock_requests_user_id_fkey`)

#### Table: `merit_transactions`
Columns:
* `actor_name`: `string | null`
* `club_id`: `string | null`
* `created_at`: `string | null`
* `id`: `string`
* `points`: `number | null`
* `reason`: `string | null`
* `reference_id`: `string | null`
* `source`: `string | null`
* `user_id`: `string | null`
Relationships:
* `club_id` references `clubs(id)` (via `merit_transactions_club_id_fkey`)
* `user_id` references `profiles(id)` (via `merit_transactions_user_id_fkey`)

### Module: Kamsis & KLK

#### Table: `asrama_recommendations`
Columns:
* `created_at`: `string | null`
* `marked_by`: `string | null`
* `notes`: `string | null`
* `session`: `string`
* `user_id`: `string`
Relationships:
* `marked_by` references `profiles(id)` (via `asrama_recommendations_marked_by_fkey`)
* `user_id` references `profiles(id)` (via `asrama_recommendations_user_id_fkey`)

#### Table: `asrama_unit_admins`
Columns:
* `assigned_by`: `string | null`
* `created_at`: `string`
* `id`: `string`
* `notes`: `string | null`
* `user_id`: `string`
Relationships:
* `assigned_by` references `profiles(id)` (via `asrama_unit_admins_assigned_by_fkey`)
* `user_id` references `profiles(id)` (via `asrama_unit_admins_user_id_fkey`)

#### Table: `kamsis_applications`
Columns:
* `created_at`: `string | null`
* `extra_data`: `Json | null`
* `id`: `string`
* `semester`: `string | null`
* `session`: `string`
* `status`: `string`
* `user_id`: `string`

#### Table: `kamsis_dynamic_fields`
Columns:
* `created_at`: `string | null`
* `display_order`: `number | null`
* `field_key`: `string`
* `field_type`: `string`
* `id`: `string`
* `is_required`: `boolean | null`
* `label`: `string`
* `options`: `Json | null`

#### Table: `klk_form_fields`
Columns:
* `applies_to`: `string`
* `created_at`: `string | null`
* `field_key`: `string`
* `field_type`: `string`
* `id`: `string`
* `is_active`: `boolean | null`
* `is_required`: `boolean | null`
* `label`: `string`
* `options`: `Json | null`
* `sort_order`: `number | null`

#### Table: `klk_kawasan`
Columns:
* `created_at`: `string | null`
* `id`: `string`
* `is_active`: `boolean | null`
* `latitude`: `number | null`
* `longitude`: `number | null`
* `name`: `string`
* `sort_order`: `number | null`

#### Table: `klk_settings`
Columns:
* `key`: `string`
* `updated_at`: `string | null`
* `value`: `Json`

#### Table: `klk_student_residency`
Columns:
* `academic_year`: `string`
* `alamat_kediaman`: `string | null`
* `cadangan`: `string | null`
* `created_at`: `string | null`
* `expired_at`: `string | null`
* `extra_data`: `Json | null`
* `id`: `string`
* `is_expired`: `boolean`
* `jabatan`: `string | null`
* `kawasan_custom`: `string | null`
* `kawasan_kediaman`: `string | null`
* `nama_pelajar`: `string`
* `no_matrik`: `string`
* `no_telefon`: `string | null`
* `semester`: `number`
* `source`: `string`
* `submitted_at`: `string | null`
* `tinggal_luar`: `boolean`
* `user_id`: `string | null`

#### Table: `klk_sync_log`
Columns:
* `created_at`: `string | null`
* `error_log`: `Json | null`
* `failed`: `number | null`
* `id`: `string`
* `source`: `string`
* `success`: `number | null`
* `synced_by`: `string | null`
* `total_rows`: `number | null`

### Module: Keusahawanan & PolyMart

#### Table: `business_cash_checkpoints`
Columns:
* `business_id`: `string`
* `cash_amount`: `number`
* `checkpoint_date`: `string`
* `checkpoint_time`: `string`
* `created_at`: `string`
* `id`: `string`
* `label`: `string`
* `note`: `string | null`
* `recorded_by`: `string | null`
Relationships:
* `business_id` references `keusahawanan_businesses(id)` (via `business_cash_checkpoints_business_id_fkey`)
* `recorded_by` references `profiles(id)` (via `business_cash_checkpoints_recorded_by_fkey`)

#### Table: `business_expenses`
Columns:
* `amount`: `number`
* `business_id`: `string`
* `category`: `string`
* `created_at`: `string`
* `description`: `string`
* `expense_date`: `string`
* `id`: `string`
* `recorded_by`: `string | null`
Relationships:
* `business_id` references `keusahawanan_businesses(id)` (via `business_expenses_business_id_fkey`)
* `recorded_by` references `profiles(id)` (via `business_expenses_recorded_by_fkey`)

#### Table: `business_pos_assignments`
Columns:
* `assigned_by`: `string | null`
* `business_id`: `string`
* `created_at`: `string`
* `id`: `string`
* `user_id`: `string`
* `valid_date`: `string`
Relationships:
* `assigned_by` references `profiles(id)` (via `business_pos_assignments_assigned_by_fkey`)
* `business_id` references `keusahawanan_businesses(id)` (via `business_pos_assignments_business_id_fkey`)
* `user_id` references `profiles(id)` (via `business_pos_assignments_user_id_fkey`)

#### Table: `business_pos_logs`
Columns:
* `action_type`: `Database["public"]["Enums"]["pos_log_action"]`
* `actor_id`: `string | null`
* `actor_name`: `string | null`
* `business_id`: `string`
* `created_at`: `string`
* `description`: `string | null`
* `id`: `string`
* `metadata`: `Json | null`
* `transaction_id`: `string | null`
Relationships:
* `actor_id` references `profiles(id)` (via `business_pos_logs_actor_id_fkey`)
* `business_id` references `keusahawanan_businesses(id)` (via `business_pos_logs_business_id_fkey`)
* `transaction_id` references `business_transactions(id)` (via `business_pos_logs_transaction_id_fkey`)

#### Table: `business_products`
Columns:
* `business_id`: `string`
* `category`: `string | null`
* `cost_items`: `Json | null`
* `cost_notes`: `string | null`
* `created_at`: `string`
* `description`: `string | null`
* `id`: `string`
* `image_url`: `string | null`
* `is_available`: `boolean`
* `name`: `string`
* `polymart_location`: `string | null`
* `polymart_pickup_info`: `string | null`
* `polymart_published_at`: `string | null`
* `price`: `number`
* `publish_to_polymart`: `boolean | null`
* `reserved_stock`: `number`
* `stock_alert_threshold`: `number`
* `stock_quantity`: `number`
* `total_cost`: `number | null`
Relationships:
* `business_id` references `keusahawanan_businesses(id)` (via `business_products_business_id_fkey`)

#### Table: `business_promotions`
Columns:
* `business_id`: `string`
* `code`: `string`
* `created_at`: `string`
* `created_by`: `string | null`
* `discount_type`: `string`
* `discount_value`: `number`
* `id`: `string`
* `is_active`: `boolean`
* `max_uses`: `number | null`
* `min_purchase`: `number`
* `name`: `string`
* `uses_count`: `number`
* `valid_from`: `string | null`
* `valid_until`: `string | null`
Relationships:
* `business_id` references `keusahawanan_businesses(id)` (via `business_promotions_business_id_fkey`)
* `created_by` references `profiles(id)` (via `business_promotions_created_by_fkey`)

#### Table: `business_sessions`
Columns:
* `business_id`: `string | null`
* `closed_by`: `string | null`
* `closing_cash`: `number | null`
* `closing_notes`: `string | null`
* `closing_time`: `string | null`
* `created_at`: `string | null`
* `id`: `string`
* `net_profit`: `number | null`
* `opened_by`: `string | null`
* `opening_cash`: `number`
* `opening_notes`: `string | null`
* `opening_time`: `string | null`
* `session_date`: `string`
* `status`: `string | null`
* `total_expenses`: `number | null`
* `total_sales`: `number | null`
Relationships:
* `business_id` references `keusahawanan_businesses(id)` (via `business_sessions_business_id_fkey`)
* `closed_by` references `profiles(id)` (via `business_sessions_closed_by_fkey`)
* `opened_by` references `profiles(id)` (via `business_sessions_opened_by_fkey`)

#### Table: `business_shift_swaps`
Columns:
* `business_id`: `string | null`
* `created_at`: `string | null`
* `id`: `string`
* `reason`: `string`
* `requested_by`: `string | null`
* `responded_at`: `string | null`
* `responded_by`: `string | null`
* `shift_id`: `string | null`
* `status`: `string | null`
* `swap_with`: `string | null`
Relationships:
* `business_id` references `keusahawanan_businesses(id)` (via `business_shift_swaps_business_id_fkey`)
* `requested_by` references `profiles(id)` (via `business_shift_swaps_requested_by_fkey`)
* `responded_by` references `profiles(id)` (via `business_shift_swaps_responded_by_fkey`)
* `shift_id` references `business_shifts(id)` (via `business_shift_swaps_shift_id_fkey`)
* `swap_with` references `profiles(id)` (via `business_shift_swaps_swap_with_fkey`)

#### Table: `business_shifts`
Columns:
* `assigned_to`: `string | null`
* `business_id`: `string | null`
* `created_at`: `string | null`
* `created_by`: `string | null`
* `id`: `string`
* `notes`: `string | null`
* `shift_date`: `string`
* `shift_hour`: `number`
* `status`: `string | null`
Relationships:
* `assigned_to` references `profiles(id)` (via `business_shifts_assigned_to_fkey`)
* `business_id` references `keusahawanan_businesses(id)` (via `business_shifts_business_id_fkey`)
* `created_by` references `profiles(id)` (via `business_shifts_created_by_fkey`)

#### Table: `business_transactions`
Columns:
* `business_id`: `string`
* `change_amount`: `number | null`
* `created_at`: `string`
* `customer_name`: `string | null`
* `customer_note`: `string | null`
* `discount_amount`: `number`
* `discount_note`: `string | null`
* `discount_type`: `Database["public"]["Enums"]["pos_discount_type"] | null`
* `id`: `string`
* `invoice_number`: `string`
* `items`: `Json`
* `payment_method`: `Database["public"]["Enums"]["pos_payment_method"]`
* `promotion_code`: `string | null`
* `promotion_id`: `string | null`
* `received_amount`: `number | null`
* `served_by`: `string | null`
* `status`: `Database["public"]["Enums"]["pos_transaction_status"]`
* `subtotal`: `number`
* `total_amount`: `number`
* `voided_at`: `string | null`
* `voided_by`: `string | null`
Relationships:
* `business_id` references `keusahawanan_businesses(id)` (via `business_transactions_business_id_fkey`)
* `promotion_id` references `business_promotions(id)` (via `business_transactions_promotion_id_fkey`)
* `served_by` references `profiles(id)` (via `business_transactions_served_by_fkey`)
* `voided_by` references `profiles(id)` (via `business_transactions_voided_by_fkey`)

#### Table: `keusahawanan_businesses`
Columns:
* `cash_session_enabled`: `boolean`
* `category_id`: `string | null`
* `created_at`: `string`
* `description`: `string | null`
* `id`: `string`
* `interview_date`: `string | null`
* `is_active`: `boolean | null`
* `is_shift_enabled`: `boolean | null`
* `logo_url`: `string | null`
* `mentor_department`: `string | null`
* `mentor_name`: `string | null`
* `monthly_target`: `number | null`
* `name`: `string`
* `owner_id`: `string`
* `polymart_contact_method`: `string | null`
* `polymart_is_active`: `boolean | null`
* `promotions_enabled`: `boolean`
* `registration_type`: `string | null`
* `ssm_registration_number`: `string | null`
* `status`: `Database["public"]["Enums"]["keusahawanan_business_status"]`
Relationships:
* `category_id` references `keusahawanan_categories(id)` (via `keusahawanan_businesses_category_id_fkey`)
* `owner_id` references `profiles(id)` (via `keusahawanan_businesses_owner_id_fkey`)

#### Table: `keusahawanan_categories`
Columns:
* `created_at`: `string`
* `id`: `string`
* `is_active`: `boolean | null`
* `name`: `string`

#### Table: `keusahawanan_logs`
Columns:
* `action_type`: `string`
* `actor_id`: `string | null`
* `business_id`: `string | null`
* `created_at`: `string | null`
* `description`: `string | null`
* `id`: `string`
Relationships:
* `actor_id` references `profiles(id)` (via `keusahawanan_logs_actor_id_fkey`)
* `business_id` references `keusahawanan_businesses(id)` (via `keusahawanan_logs_business_id_fkey`)

#### Table: `keusahawanan_program_registrations`
Columns:
* `id`: `string`
* `program_id`: `string`
* `registered_at`: `string | null`
* `user_id`: `string`
Relationships:
* `program_id` references `keusahawanan_programs(id)` (via `keusahawanan_program_registrations_program_id_fkey`)

#### Table: `keusahawanan_programs`
Columns:
* `created_at`: `string | null`
* `created_by`: `string | null`
* `date_label`: `string | null`
* `description`: `string | null`
* `icon`: `string | null`
* `id`: `string`
* `image_url`: `string | null`
* `max_participants`: `number | null`
* `participants_count`: `number | null`
* `status`: `string | null`
* `tags`: `string[] | null`
* `title`: `string`
* `updated_at`: `string | null`
* `venue`: `string | null`
* `visibility`: `string | null`

#### Table: `keusahawanan_unit_admins`
Columns:
* `assigned_by`: `string | null`
* `created_at`: `string`
* `id`: `string`
* `notes`: `string | null`
* `user_id`: `string`
Relationships:
* `assigned_by` references `profiles(id)` (via `keusahawanan_unit_admins_assigned_by_fkey`)
* `user_id` references `profiles(id)` (via `keusahawanan_unit_admins_user_id_fkey`)

#### Table: `polymart_ads`
Columns:
* `clicks`: `number`
* `created_at`: `string`
* `created_by`: `string | null`
* `end_date`: `string | null`
* `id`: `string`
* `image_url`: `string`
* `link_url`: `string | null`
* `start_date`: `string | null`
* `status`: `Database["public"]["Enums"]["polymart_ad_status"]`
* `title`: `string`
* `type`: `Database["public"]["Enums"]["polymart_ad_type"]`
* `updated_at`: `string`

#### Table: `polymart_cart_items`
Columns:
* `buyer_id`: `string`
* `created_at`: `string | null`
* `id`: `string`
* `product_id`: `string`
* `quantity`: `number`
Relationships:
* `product_id` references `business_products(id)` (via `polymart_cart_items_product_id_fkey`)

#### Table: `polymart_orders`
Columns:
* `business_id`: `string | null`
* `buyer_id`: `string | null`
* `cancel_reason`: `string | null`
* `cancelled_at`: `string | null`
* `completed_at`: `string | null`
* `confirmed_at`: `string | null`
* `created_at`: `string | null`
* `id`: `string`
* `note`: `string | null`
* `pickup_time`: `string | null`
* `product_id`: `string | null`
* `quantity`: `number`
* `ready_at`: `string | null`
* `share_phone`: `boolean | null`
* `status`: `string | null`
* `total_price`: `number | null`
* `unit_price`: `number`
* `updated_at`: `string | null`
Relationships:
* `business_id` references `keusahawanan_businesses(id)` (via `polymart_orders_business_id_fkey`)
* `buyer_id` references `profiles(id)` (via `polymart_orders_buyer_id_fkey`)
* `product_id` references `business_products(id)` (via `polymart_orders_product_id_fkey`)

#### Table: `polymart_reports`
Columns:
* `created_at`: `string | null`
* `id`: `string`
* `product_id`: `string | null`
* `reason`: `string`
* `reporter_id`: `string | null`
* `reviewed_at`: `string | null`
* `reviewed_by`: `string | null`
* `status`: `string | null`
Relationships:
* `product_id` references `business_products(id)` (via `polymart_reports_product_id_fkey`)
* `reporter_id` references `profiles(id)` (via `polymart_reports_reporter_id_fkey`)
* `reviewed_by` references `profiles(id)` (via `polymart_reports_reviewed_by_fkey`)

#### Table: `polymart_reviews`
Columns:
* `comment`: `string | null`
* `created_at`: `string | null`
* `id`: `string`
* `order_id`: `string | null`
* `product_id`: `string | null`
* `rating`: `number`
* `reviewer_id`: `string | null`
Relationships:
* `order_id` references `polymart_orders(id)` (via `polymart_reviews_order_id_fkey`)
* `product_id` references `business_products(id)` (via `polymart_reviews_product_id_fkey`)
* `reviewer_id` references `profiles(id)` (via `polymart_reviews_reviewer_id_fkey`)

#### Table: `student_business_memberships`
Columns:
* `business_id`: `string`
* `id`: `string`
* `joined_at`: `string`
* `role`: `Database["public"]["Enums"]["keusahawanan_membership_role"]`
* `status`: `Database["public"]["Enums"]["keusahawanan_membership_status"]`
* `user_id`: `string`
Relationships:
* `business_id` references `keusahawanan_businesses(id)` (via `student_business_memberships_business_id_fkey`)
* `user_id` references `profiles(id)` (via `student_business_memberships_user_id_fkey`)

### Module: PolyTask

### Module: PolyRent

### Module: PolyRider

### Module: PolySuara

### Module: Kebajikan

#### Table: `kebajikan_escalation_actions`
Columns:
* `action_summary`: `string`
* `id`: `string`
* `pic_id`: `string | null`
* `pic_name_manual`: `string | null`
* `recorded_at`: `string`
* `recorded_by`: `string | null`
* `ticket_id`: `string`
Relationships:
* `pic_id` references `kebajikan_pics(id)` (via `kebajikan_escalation_actions_pic_id_fkey`)
* `recorded_by` references `profiles(id)` (via `kebajikan_escalation_actions_recorded_by_fkey`)
* `ticket_id` references `kebajikan_tickets(id)` (via `kebajikan_escalation_actions_ticket_id_fkey`)

#### Table: `kebajikan_notifications`
Columns:
* `body`: `string`
* `created_at`: `string`
* `id`: `string`
* `is_read`: `boolean`
* `read_at`: `string | null`
* `target_role`: `string | null`
* `target_user_id`: `string | null`
* `ticket_id`: `string`
* `title`: `string`
* `type`: `string`
Relationships:
* `target_user_id` references `profiles(id)` (via `kebajikan_notifications_target_user_id_fkey`)
* `ticket_id` references `kebajikan_tickets(id)` (via `kebajikan_notifications_ticket_id_fkey`)

#### Table: `kebajikan_pics`
Columns:
* `category`: `string`
* `created_at`: `string`
* `created_by`: `string | null`
* `id`: `string`
* `is_active`: `boolean`
* `jabatan_key`: `string | null`
* `jabatan_label`: `string`
* `pic_email`: `string | null`
* `pic_name`: `string`
* `pic_phone`: `string | null`
* `pic_title`: `string | null`
* `pic_user_id`: `string | null`
* `updated_at`: `string`
Relationships:
* `created_by` references `profiles(id)` (via `kebajikan_pics_created_by_fkey`)
* `pic_user_id` references `profiles(id)` (via `kebajikan_pics_pic_user_id_fkey`)

#### Table: `kebajikan_settings`
Columns:
* `auto_reply_message`: `string`
* `data_retention_months`: `number`
* `email_escalation`: `boolean`
* `email_new_ticket`: `boolean`
* `email_reopen`: `boolean`
* `email_warning`: `boolean`
* `id`: `string`
* `sla_escalate_hours`: `number`
* `sla_warning_hours`: `number`
* `updated_at`: `string`
* `updated_by`: `string | null`
Relationships:
* `updated_by` references `profiles(id)` (via `kebajikan_settings_updated_by_fkey`)

#### Table: `kebajikan_staff_assignments`
Columns:
* `assigned_at`: `string`
* `assigned_by`: `string | null`
* `id`: `string`
* `is_active`: `boolean`
* `note`: `string | null`
* `role`: `string`
* `staff_user_id`: `string`
Relationships:
* `assigned_by` references `profiles(id)` (via `kebajikan_staff_assignments_assigned_by_fkey`)
* `staff_user_id` references `profiles(id)` (via `kebajikan_staff_assignments_staff_user_id_fkey`)

#### Table: `kebajikan_tags`
Columns:
* `color`: `string`
* `created_at`: `string`
* `created_by`: `string | null`
* `id`: `string`
* `name`: `string`
Relationships:
* `created_by` references `profiles(id)` (via `kebajikan_tags_created_by_fkey`)

#### Table: `kebajikan_ticket_comments`
Columns:
* `attachments`: `string[] | null`
* `author_id`: `string | null`
* `author_name`: `string`
* `author_role`: `string`
* `content`: `string`
* `created_at`: `string`
* `id`: `string`
* `is_delegation_note`: `boolean`
* `is_internal`: `boolean`
* `ticket_id`: `string`
Relationships:
* `author_id` references `profiles(id)` (via `kebajikan_ticket_comments_author_id_fkey`)
* `ticket_id` references `kebajikan_tickets(id)` (via `kebajikan_ticket_comments_ticket_id_fkey`)

#### Table: `kebajikan_ticket_status_log`
Columns:
* `actor_id`: `string | null`
* `actor_name`: `string | null`
* `actor_role`: `string | null`
* `created_at`: `string`
* `id`: `string`
* `new_status`: `string`
* `note`: `string | null`
* `old_status`: `string | null`
* `ticket_id`: `string`
Relationships:
* `actor_id` references `profiles(id)` (via `kebajikan_ticket_status_log_actor_id_fkey`)
* `ticket_id` references `kebajikan_tickets(id)` (via `kebajikan_ticket_status_log_ticket_id_fkey`)

#### Table: `kebajikan_tickets`
Columns:
* `assigned_to`: `string | null`
* `cancel_reason`: `string | null`
* `cancelled_at`: `string | null`
* `category`: `string`
* `class`: `string | null`
* `created_at`: `string`
* `delegated_to`: `string | null`
* `delegation_note`: `string | null`
* `description`: `string`
* `escalated_at`: `string | null`
* `form_data`: `Json`
* `full_name`: `string`
* `gender`: `string | null`
* `handled_by_unit`: `string`
* `id`: `string`
* `image_urls`: `string[] | null`
* `matric_no`: `string | null`
* `phone`: `string | null`
* `priority`: `string`
* `rating`: `number | null`
* `rating_at`: `string | null`
* `rating_comment`: `string | null`
* `reopen_approved_by`: `string | null`
* `reopen_count`: `number`
* `reopen_reason`: `string | null`
* `reopen_requested_at`: `string | null`
* `resolution_note`: `string`
* `resolved_at`: `string | null`
* `resolved_by`: `string | null`
* `sla_deadline`: `string | null`
* `status`: `string`
* `submitter_id`: `string | null`
* `tags`: `string[] | null`
* `ticket_no`: `string`
* `title`: `string`
* `updated_at`: `string`
* `warning_sent_at`: `string | null`
Relationships:
* `assigned_to` references `profiles(id)` (via `kebajikan_tickets_assigned_to_fkey`)
* `delegated_to` references `profiles(id)` (via `kebajikan_tickets_delegated_to_fkey`)
* `reopen_approved_by` references `profiles(id)` (via `kebajikan_tickets_reopen_approved_by_fkey`)
* `resolved_by` references `profiles(id)` (via `kebajikan_tickets_resolved_by_fkey`)
* `submitter_id` references `profiles(id)` (via `kebajikan_tickets_submitter_id_fkey`)

### Module: Karnival

#### Table: `karnival_booths`
Columns:
* `booth_number`: `string | null`
* `category_id`: `string`
* `created_at`: `string | null`
* `description`: `string | null`
* `edition_id`: `string`
* `id`: `string`
* `image_url`: `string | null`
* `is_active`: `boolean`
* `kelab_id`: `string | null`
* `kelab_name`: `string`
* `theme`: `string | null`
Relationships:
* `category_id` references `karnival_categories(id)` (via `karnival_booths_category_id_fkey`)
* `edition_id` references `karnival_editions(id)` (via `karnival_booths_edition_id_fkey`)

#### Table: `karnival_categories`
Columns:
* `created_at`: `string | null`
* `description`: `string | null`
* `edition_id`: `string`
* `icon_emoji`: `string | null`
* `id`: `string`
* `is_active`: `boolean`
* `max_votes`: `number`
* `name`: `string`
* `sort_order`: `number | null`
Relationships:
* `edition_id` references `karnival_editions(id)` (via `karnival_categories_edition_id_fkey`)

#### Table: `karnival_editions`
Columns:
* `cover_image_url`: `string | null`
* `created_at`: `string | null`
* `edition_year`: `number`
* `end_date`: `string | null`
* `id`: `string`
* `is_active`: `boolean`
* `name`: `string`
* `results_published`: `boolean`
* `start_date`: `string | null`
* `tagline`: `string | null`
* `updated_at`: `string | null`
* `voting_enabled`: `boolean`

#### Table: `karnival_votes_v2`
Columns:
* `booth_id`: `string`
* `category_id`: `string`
* `created_at`: `string | null`
* `edition_id`: `string`
* `id`: `string`
* `matric_no`: `string | null`
* `voter_id`: `string`
Relationships:
* `booth_id` references `karnival_booths(id)` (via `karnival_votes_v2_booth_id_fkey`)
* `category_id` references `karnival_categories(id)` (via `karnival_votes_v2_category_id_fkey`)
* `edition_id` references `karnival_editions(id)` (via `karnival_votes_v2_edition_id_fkey`)
* `voter_id` references `profiles(id)` (via `karnival_votes_v2_voter_id_fkey`)

### Module: SUPSAS

#### Table: `supsas_editions`
Columns:
* `banner_url`: `string | null`
* `created_at`: `string`
* `edition_year`: `number`
* `end_date`: `string | null`
* `id`: `string`
* `is_active`: `boolean`
* `logo_url`: `string | null`
* `name`: `string`
* `start_date`: `string | null`
* `tagline`: `string | null`
* `updated_at`: `string`

#### Table: `supsas_fixtures`
Columns:
* `bracket_position`: `number | null`
* `bracket_round`: `number | null`
* `created_at`: `string`
* `edition_id`: `string`
* `group_name`: `string | null`
* `id`: `string`
* `is_bye`: `boolean`
* `kontingen_a_id`: `string | null`
* `kontingen_b_id`: `string | null`
* `match_date`: `string | null`
* `match_number`: `number | null`
* `match_time`: `string | null`
* `next_match_id`: `string | null`
* `notes`: `string | null`
* `round`: `string | null`
* `score_a`: `string | null`
* `score_b`: `string | null`
* `sport_id`: `string`
* `status`: `string`
* `team_a_id`: `string | null`
* `team_b_id`: `string | null`
* `updated_at`: `string`
* `venue`: `string | null`
* `winner_id`: `string | null`
* `winner_team_id`: `string | null`
Relationships:
* `edition_id` references `supsas_edition_stats(edition_id)` (via `supsas_fixtures_edition_id_fkey`)
* `edition_id` references `supsas_editions(id)` (via `supsas_fixtures_edition_id_fkey`)
* `kontingen_a_id` references `supsas_kontingen(id)` (via `supsas_fixtures_kontingen_a_id_fkey`)
* `kontingen_a_id` references `supsas_medal_tally(kontingen_id)` (via `supsas_fixtures_kontingen_a_id_fkey`)
* `kontingen_b_id` references `supsas_kontingen(id)` (via `supsas_fixtures_kontingen_b_id_fkey`)
* `kontingen_b_id` references `supsas_medal_tally(kontingen_id)` (via `supsas_fixtures_kontingen_b_id_fkey`)
* `next_match_id` references `supsas_fixtures(id)` (via `supsas_fixtures_next_match_id_fkey`)
* `sport_id` references `supsas_sports(id)` (via `supsas_fixtures_sport_id_fkey`)
* `team_a_id` references `supsas_teams(id)` (via `supsas_fixtures_team_a_id_fkey`)
* `team_b_id` references `supsas_teams(id)` (via `supsas_fixtures_team_b_id_fkey`)
* `winner_id` references `supsas_kontingen(id)` (via `supsas_fixtures_winner_id_fkey`)
* `winner_id` references `supsas_medal_tally(kontingen_id)` (via `supsas_fixtures_winner_id_fkey`)
* `winner_team_id` references `supsas_teams(id)` (via `supsas_fixtures_winner_team_id_fkey`)

#### Table: `supsas_kontingen`
Columns:
* `color`: `string`
* `created_at`: `string`
* `edition_id`: `string`
* `id`: `string`
* `invite_code`: `string | null`
* `invite_used`: `boolean`
* `is_active`: `boolean`
* `leader_id`: `string | null`
* `logo_url`: `string | null`
* `name`: `string`
* `short_code`: `string`
* `updated_at`: `string`
Relationships:
* `edition_id` references `supsas_edition_stats(edition_id)` (via `supsas_kontingen_edition_id_fkey`)
* `edition_id` references `supsas_editions(id)` (via `supsas_kontingen_edition_id_fkey`)

#### Table: `supsas_participants`
Columns:
* `created_at`: `string`
* `edition_id`: `string`
* `id`: `string`
* `is_confirmed`: `boolean`
* `jersey_number`: `number | null`
* `kontingen_id`: `string`
* `position`: `string | null`
* `profile_id`: `string`
* `sport_id`: `string`
* `team_id`: `string | null`
Relationships:
* `edition_id` references `supsas_edition_stats(edition_id)` (via `supsas_participants_edition_id_fkey`)
* `edition_id` references `supsas_editions(id)` (via `supsas_participants_edition_id_fkey`)
* `kontingen_id` references `supsas_kontingen(id)` (via `supsas_participants_kontingen_id_fkey`)
* `kontingen_id` references `supsas_medal_tally(kontingen_id)` (via `supsas_participants_kontingen_id_fkey`)
* `sport_id` references `supsas_sports(id)` (via `supsas_participants_sport_id_fkey`)
* `team_id` references `supsas_teams(id)` (via `supsas_participants_team_id_fkey`)

#### Table: `supsas_results`
Columns:
* `edition_id`: `string`
* `id`: `string`
* `kontingen_id`: `string`
* `medal`: `string | null`
* `notes`: `string | null`
* `position`: `number | null`
* `recorded_at`: `string`
* `recorded_by`: `string | null`
* `sport_id`: `string`
Relationships:
* `edition_id` references `supsas_edition_stats(edition_id)` (via `supsas_results_edition_id_fkey`)
* `edition_id` references `supsas_editions(id)` (via `supsas_results_edition_id_fkey`)
* `kontingen_id` references `supsas_kontingen(id)` (via `supsas_results_kontingen_id_fkey`)
* `kontingen_id` references `supsas_medal_tally(kontingen_id)` (via `supsas_results_kontingen_id_fkey`)
* `sport_id` references `supsas_sports(id)` (via `supsas_results_sport_id_fkey`)

#### Table: `supsas_sports`
Columns:
* `category`: `string`
* `created_at`: `string`
* `edition_id`: `string`
* `format`: `string`
* `gender`: `string`
* `icon`: `string`
* `id`: `string`
* `is_active`: `boolean`
* `max_groups_per_kontingen`: `number`
* `max_per_team`: `number`
* `max_players_per_group`: `number`
* `name`: `string`
* `sort_order`: `number`
* `updated_at`: `string`
* `venue`: `string | null`
Relationships:
* `edition_id` references `supsas_edition_stats(edition_id)` (via `supsas_sports_edition_id_fkey`)
* `edition_id` references `supsas_editions(id)` (via `supsas_sports_edition_id_fkey`)

#### Table: `supsas_teams`
Columns:
* `created_at`: `string`
* `edition_id`: `string`
* `group_number`: `number`
* `id`: `string`
* `is_confirmed`: `boolean`
* `kontingen_id`: `string`
* `name`: `string`
* `sport_id`: `string`
Relationships:
* `edition_id` references `supsas_edition_stats(edition_id)` (via `supsas_teams_edition_id_fkey`)
* `edition_id` references `supsas_editions(id)` (via `supsas_teams_edition_id_fkey`)
* `kontingen_id` references `supsas_kontingen(id)` (via `supsas_teams_kontingen_id_fkey`)
* `kontingen_id` references `supsas_medal_tally(kontingen_id)` (via `supsas_teams_kontingen_id_fkey`)
* `sport_id` references `supsas_sports(id)` (via `supsas_teams_sport_id_fkey`)

### Module: General/System

#### Table: `ai_tier_requests`
Columns:
* `admin_notes`: `string | null`
* `created_at`: `string | null`
* `current_tier`: `string`
* `id`: `string`
* `reason`: `string`
* `receipt_url`: `string | null`
* `requested_tier`: `string`
* `status`: `string`
* `updated_at`: `string | null`
* `user_id`: `string | null`
Relationships:
* `user_id` references `profiles(id)` (via `ai_tier_requests_user_id_fkey`)

#### Table: `ai_usage_logs`
Columns:
* `created_at`: `string | null`
* `id`: `string`
* `task_name`: `string`
* `token_cost`: `number`
* `user_id`: `string | null`
Relationships:
* `user_id` references `profiles(id)` (via `ai_usage_logs_user_id_fkey`)

#### Table: `notifications`
Columns:
* `body`: `string`
* `created_at`: `string`
* `id`: `string`
* `is_read`: `boolean`
* `read_at`: `string | null`
* `target_role`: `string | null`
* `target_user_id`: `string | null`
* `ticket_id`: `string`
* `title`: `string`
* `type`: `string`
Relationships:
* `target_user_id` references `profiles(id)` (via `kebajikan_notifications_target_user_id_fkey`)
* `ticket_id` references `kebajikan_tickets(id)` (via `kebajikan_notifications_ticket_id_fkey`)

#### Table: `portal_settings`
Columns:
* `color`: `string`
* `exco_module`: `string`
* `id`: `string`
* `is_enabled`: `boolean | null`
* `label`: `string | null`
* `updated_at`: `string | null`
* `updated_by`: `string | null`
Relationships:
* `updated_by` references `profiles(id)` (via `portal_settings_updated_by_fkey`)

#### Table: `push_subscriptions`
Columns:
* `auth`: `string`
* `created_at`: `string | null`
* `device_hint`: `string | null`
* `endpoint`: `string`
* `id`: `string`
* `p256dh`: `string`
* `user_id`: `string`

#### Table: `system_announcements`
Columns:
* `action_url`: `string | null`
* `content_body`: `string`
* `created_at`: `string`
* `created_by`: `string | null`
* `form_schema`: `Json | null`
* `icon_type`: `string | null`
* `id`: `string`
* `image_url`: `string | null`
* `is_active`: `boolean`
* `priority`: `string`
* `target_audience`: `string`
* `title`: `string`
Relationships:
* `created_by` references `profiles(id)` (via `system_announcements_created_by_fkey`)

#### Table: `system_settings`
Columns:
* `key`: `string`
* `value`: `Json`

#### Table: `takwim_holidays`
Columns:
* `created_at`: `string | null`
* `created_by`: `string | null`
* `id`: `string`
* `nama_cuti`: `string`
* `tarikh_mula`: `string`

#### Table: `takwim_pusat`
Columns:
* `aktiviti`: `string | null`
* `bil_minggu`: `number | null`
* `catatan`: `string | null`
* `created_at`: `string | null`
* `created_by`: `string | null`
* `exco_module`: `string | null`
* `id`: `string`
* `jenis`: `string`
* `kelab_kediaman_label`: `string | null`
* `sesi`: `string | null`
* `tajuk`: `string`
* `tarikh_mula`: `string`
* `tarikh_tamat`: `string | null`
* `updated_at`: `string | null`
* `warna_custom`: `string | null`

#### Table: `task_feedback`
Columns:
* `content`: `string`
* `created_at`: `string | null`
* `from_id`: `string | null`
* `id`: `string`
* `task_id`: `string | null`
Relationships:
* `from_id` references `profiles(id)` (via `task_feedback_from_id_fkey`)
* `task_id` references `club_tasks(id)` (via `task_feedback_task_id_fkey`)

#### Table: `task_submissions`
Columns:
* `created_at`: `string | null`
* `file_type`: `string | null`
* `file_url`: `string`
* `id`: `string`
* `notes`: `string | null`
* `task_id`: `string | null`
* `user_id`: `string | null`
Relationships:
* `task_id` references `club_tasks(id)` (via `task_submissions_task_id_fkey`)
* `user_id` references `profiles(id)` (via `task_submissions_user_id_fkey`)

#### Table: `user_announcement_responses`
Columns:
* `announcement_id`: `string`
* `created_at`: `string`
* `form_data`: `Json | null`
* `id`: `string`
* `status`: `string`
* `user_id`: `string`
Relationships:
* `announcement_id` references `system_announcements(id)` (via `user_announcement_responses_announcement_id_fkey`)
* `user_id` references `profiles(id)` (via `user_announcement_responses_user_id_fkey`)

#### Table: `user_exco_access`
Columns:
* `exco_module`: `string`
* `granted_at`: `string | null`
* `granted_by`: `string | null`
* `id`: `string`
* `is_active`: `boolean | null`
* `role`: `string`
* `user_id`: `string`
Relationships:
* `granted_by` references `profiles(id)` (via `user_exco_access_granted_by_fkey`)
* `user_id` references `profiles(id)` (via `user_exco_access_user_id_fkey`)

---

## 6. PostgreSQL Stored Procedures (RPCs)

The schema defines **97 custom stored procedures** to handle operations such as token balance management, complex transaction checkouts, and merit evaluations. Key procedures:
* `spend_ai_tokens(task_name)`: Deducts AI tokens based on costs configuration and validates Pro-tier expiration.
* `get_dashboard_data(club_id, user_id)`: Consolidates 8 dashboard queries into 1 call for mobile/web performance.
* `change_member_role(p_user_id, p_club_id, p_new_role)`: Atomic role updates checking hierarchy safety.
* `admin_merge_duplicate_accounts(primary_id, secondary_id)`: Merges two duplicate student accounts safely.
* `archive_merit_cohort(p_cohort_year)`: Wipes and snapshots student merit totals for cohort archives.

---

## 7. Database Triggers

The schema defines **21 triggers** executing custom functions on lifecycle changes:
* `check_club_membership_limit`: Restricts memberships using lock boundaries.
* `trg_censor_polysuara`: Automatically flags confessions containing bad words.
* `trg_polyrider_job_expiry`: Cleans up jobs that expire.
* `trigger_polytask_bid_acceptance`: Automatically moves task state to IN_PROGRESS when a bid is accepted.
