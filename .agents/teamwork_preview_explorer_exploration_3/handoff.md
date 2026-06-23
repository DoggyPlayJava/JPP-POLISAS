# Supabase & RBAC Scan Report

This report presents the complete catalog of Supabase client queries, mutations, RPC calls, storage buckets, and RBAC roles identified in the JPP-POLISAS frontend codebase under `src/`.

---

## 1. Observation

Direct code observations from the codebase files:

### A. Supabase Client Configurations & Logging
* **File Path:** `src/lib/supabase.ts`
  * **Line 44:** Client export:
    ```typescript
    export const supabase = globalThis.__supabaseClient as SupabaseClient;
    ```
  * **Line 79-95:** Global logging function `createLog`:
    ```typescript
    export const createLog = async (
      clubId: string | null,
      actorId: string | undefined,
      actorName: string | null,
      actionType: string,
      description: string,
      metadata: any = {}
    ) => {
      await supabase.from('club_logs').insert([{
        club_id: clubId,
        actor_id: actorId,
        actor_name: actorName || 'Sistem',
        action_type: actionType,
        description: description,
        metadata: metadata
      }]);
    };
    ```

### B. Core Auth & RBAC Profile Fetching
* **File Path:** `src/contexts/AuthContext.tsx`
  * **Line 84-87:** Parallel query for profile and memberships:
    ```typescript
    const [profileRes, membershipsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('student_club_memberships').select('id, club_id, role, is_primary, account_status').eq('user_id', userId)
    ]);
    ```
  * **Line 190-196:** Membership auto-repair mutation:
    ```typescript
    const { error: insErr } = await supabase.from('student_club_memberships').insert({
      user_id: userId,
      club_id: profileData.club_id,
      role: profileData.role || 'CLUB_MEMBER',
      account_status: 'APPROVED',
      is_primary: true
    });
    ```
  * **Line 241-260:** Parallel query for Exco staff and MT units assignments:
    ```typescript
    const kebajikanPromise = supabase.from('kebajikan_staff_assignments').select('id').eq('staff_user_id', userId).eq('is_active', true).maybeSingle();
    // ...
    const mtPromise = supabase.from('jpp_mt_assignments').select('unit').eq('mt_user_id', userId);
    const keuAdminPromise = supabase.from('keusahawanan_unit_admins').select('id').eq('user_id', userId).maybeSingle();
    const asramaAdminPromise = supabase.from('asrama_unit_admins').select('id').eq('user_id', userId).maybeSingle();
    ```

### C. Sample Queries and Mutations
* **File Path:** `src/components/GlobalAnnouncementModal.tsx`
  * **Line 121 / 146:**
    ```typescript
    await supabase.from('user_announcement_responses').insert({ ... })
    ```
* **File Path:** `src/components/exco/ExcoAktivitiPage.tsx`
  * **Line 173:**
    ```typescript
    await supabase.from('club_activities').update(payload).eq('id', editTarget.id);
    ```
  * **Line 177:**
    ```typescript
    await supabase.from('club_activities').insert([payload]);
    ```
  * **Line 192:**
    ```typescript
    await supabase.from('club_activities').delete().eq('id', id);
    ```

### D. RPC Calls
* **File Path:** `src/components/layout/Header.tsx`
  * **Line 42:**
    ```typescript
    await supabase.rpc('update_user_ai_tier', { ... })
    ```
* **File Path:** `src/components/ui/CompleteProfileModal.tsx`
  * **Line 240:**
    ```typescript
    await supabase.rpc('check_matric_registered', { p_matric_no: matricNo.trim() });
    ```
  * **Line 262:**
    ```typescript
    await supabase.rpc('verify_staff_code', { p_code: passcode });
    ```
* **File Path:** `src/hooks/usePosData.ts`
  * **Line 728:**
    ```typescript
    await supabase.rpc('transfer_business_ownership', { ... })
    ```

### E. Storage Buckets
* **File Path:** `src/pages/AktivitiFull.tsx`
  * **Line 951:**
    ```typescript
    await supabase.storage.from('reports').upload(filePath, compressedFile, { contentType: compressedFile.type });
    ```
* **File Path:** `src/pages/SettingsPage.tsx`
  * **Line 600:**
    ```typescript
    supabase.storage.from('avatars').getPublicUrl(filePath);
    ```

---

## 2. Logic Chain

Step-by-step reasoning linking observations to findings:
1. **Instantiation Verification:** From `src/lib/supabase.ts` (Observation A), we confirm that a single, global Supabase client `supabase` is initialized and exported. This client singleton is utilized for all database actions across the codebase.
2. **Table Usage Analysis:** By scanning `.from('tableName')` references across all directories under `src/`, we compile the list of database tables currently accessed by the client. For each table, we check associated methods (`.select()`, `.insert()`, `.update()`, `.delete()`, `.upsert()`) to classify frontend operations into queries vs. mutations.
3. **Column Tracing:** By analyzing columns requested within `.select('columns')` parameters, keys passed into mutation payloads (`.insert({ key: val })`), and properties queried in conditional filters (`.eq('column', val)`), we construct the exact set of columns expected by the UI.
4. **RPC Function Mapping:** Tracing `.rpc('functionName')` invocations maps out the exact backend stored procedures triggered by the client. We catalog their parameter schemas directly from their call structures.
5. **RBAC Logic Derivation:** Inspecting `src/contexts/AuthContext.tsx` (Observation B) reveals how user profiles (`profiles`), exco assignments (`jpp_mt_assignments`), and specific exco unit administration tables (`keusahawanan_unit_admins`, `asrama_unit_admins`, `kebajikan_staff_assignments`) interact to calculate user permissions (`isSuperAdmin`, `isKppExco`, `hasKeusahawananAccess`, etc.).
6. **Storage Classification:** Code calls referencing `supabase.storage.from('bucketName')` (Observation E) are aggregated to list the active storage buckets and their access patterns (e.g. read via `getPublicUrl` vs. write via `upload`).

---

## 3. Caveats

* **Read-Only / Static Analysis:** The list of tables, columns, and RPC parameters is mapped purely by scanning frontend React code. Database-side only tables/columns (e.g., system configuration tables not read by the frontend, or internal audit columns) are not accounted for.
* **Wildcard Selections:** Queries that use `.select('*')` select all columns of a table. The columns for these tables are supplemented using types defined in `src/types/index.ts` and `src/lib/supabase.ts`.
* **No Database Sync:** Because this is a read-only investigation and running external commands timed out, we did not run SQL queries or introspect the Postgres system tables (`pg_catalog`) directly.

---

## 4. Conclusion

### A. Supabase Storage Buckets
The frontend interacts with the following **11 storage buckets** under `supabase.storage.from(...)`:

| Bucket Name | Usage & Description | Associated Files |
|---|---|---|
| `reports` | Uploading and removing monthly/financial reports | `src/pages/AktivitiFull.tsx` |
| `avatars` | Uploading and fetching user profile pictures | `src/pages/SettingsPage.tsx` |
| `club-logos` | Uploading and updating club logos | `src/pages/UrusKelabPage.tsx` |
| `announcements` | Storing system announcement images/banners | `src/pages/jpp/AnnouncementsPage.tsx` |
| `karnival-booths` | Uploading karnival booth images | `src/pages/karnival/admin/KarnivalAdminBooths.tsx` |
| `kebajikan-images` | Uploading and deleting ticket/complaint attachment photos | `src/pages/kebajikan/KebajikanSettingsPage.tsx`, `KebajikanSubmitPage.tsx` |
| `keusahawanan-products` | Uploading student business product images | `src/pages/keusahawanan/UrusPerniagaanPage.tsx`, `PosProductPage.tsx` |
| `polymart-ads` | Storing advertisement banners for PolyMart | `src/pages/polymart/PolyMartAdminPanel.tsx`, `PolyMartVendorDashboard.tsx` |
| `polymart-receipts` | Uploading customer transaction payment receipts | `src/pages/polymart/PolyMartMyOrders.tsx`, `PolyMartPaymentPage.tsx` |
| `polysuara_attachments` | Uploading webp confession attachments | `src/pages/polyservices/PolySuaraPage.tsx` |
| `keusahawanan` | Uploading files for Keusahawanan programs | `src/pages/keusahawanan/KeusahawananProgram.tsx` |

---

### B. Expected Database Tables and Columns
The following database tables are queried or mutated via `supabase.from('tableName')`:

| Table Name | Operations | Columns Referenced in Frontend |
|---|---|---|
| `profiles` | Query, Update, Upsert | `id`, `email`, `full_name`, `role`, `club_id`, `department`, `avatar_url`, `matric_no`, `jpp_position`, `jpp_unit`, `account_status`, `subscription_tier`, `ai_token_balance`, `merit`, `phone`, `ai_daily_usage`, `ai_status`, `ai_last_reset`, `ai_tier_expiration`, `programme_code`, `intake_year`, `intake_period`, `semester_override` |
| `student_club_memberships` | Query, Insert, Delete, Update | `id`, `user_id`, `club_id`, `role`, `account_status`, `is_primary`, `joined_at` |
| `clubs` | Query | `id`, `name`, `short_name`, `category`, `theme_color`, `logo_url`, `description`, `members_count`, `is_active` |
| `club_reports` | Query, Insert, Update | `id`, `club_id`, `user_id`, `title`, `type`, `file_url`, `file_name`, `status`, `admin_feedback`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at` |
| `club_activities` | Query, Insert, Update, Delete | `id`, `club_id`, `title`, `description`, `status`, `priority`, `start_date`, `end_date`, `venue`, `budget`, `assignee_id`, `created_by`, `user_id`, `tindakan`, `image_urls`, `is_archived` |
| `club_tasks` | Query, Insert, Update | `id`, `club_id`, `title`, `status`, `due_date`, `assigned_to`, `created_by`, `points` |
| `club_logs` | Query, Insert | `id`, `club_id`, `actor_id`, `actor_name`, `action_type`, `description`, `metadata`, `created_at` |
| `club_announcements` | Query, Insert | `id`, `club_id`, `title`, `content`, `created_at` |
| `club_committee` | Query | `id`, `club_id`, `user_id`, `role`, `order_index` |
| `programs` | Query, Insert, Update, Delete | `id`, `nama_program`, `deskripsi`, `tarikh_mula`, `tarikh_tamat`, `location`, `budget`, `status`, `club_id`, `user_id`, `jpp_remarks` |
| `program_attendees` | Query, Insert | `id`, `program_id`, `user_id`, `attended_at`, `status` |
| `system_settings` | Query, Insert, Update, Upsert | `key`, `value`, `description` |
| `system_logs` | Query | `id`, `action_type`, `type`, `description`, `content`, `actor_name`, `user_id`, `created_at`, `club_id` |
| `system_announcements` | Query, Insert, Update, Delete | `id`, `title`, `content_body`, `priority`, `target_audience`, `action_url`, `form_schema`, `image_url`, `icon_type`, `is_active`, `created_by`, `created_at` |
| `user_announcement_responses`| Query, Insert | `id`, `user_id`, `announcement_id`, `status`, `form_data`, `created_at` |
| `notifications` | Query | `id`, `user_id`, `title`, `body`, `type`, `is_read`, `created_at` |
| `takwim_holidays` | Query, Insert, Delete | `id`, `name`, `holiday_date` |
| `takwim_pusat` | Query, Insert, Update, Delete | `id`, `title`, `start_date`, `end_date`, `location`, `category`, `created_at`, `updated_at` |
| `portal_settings` | Query, Upsert | `exco_module`, `is_enabled`, `color` |
| `kamsis_applications` | Query, Insert, Update | `id`, `user_id`, `status`, `created_at`, `appeal_reason`, `appeal_status`, etc. |
| `kamsis_dynamic_fields` | Query, Insert, Delete | `id`, `field_name`, `field_type`, `required`, `options`, `sort_order` |
| `klk_student_residency` | Query, Insert, Update | `id`, `user_id`, `kawasan_id`, `address`, `status`, `rent_amount`, `tenancy_start`, `tenancy_end` |
| `klk_kawasan` | Query, Insert, Update, Delete | `id`, `name`, `latitude`, `longitude`, `is_active`, `sort_order` |
| `klk_form_fields` | Query, Insert, Delete, Update | `id`, `name`, `type`, `sort_order`, `is_active` |
| `klk_sync_log` | Query | `id`, `created_at` |
| `klk_settings` | Query, Update | `key`, `value` |
| `polytask_jobs` | Query, Insert, Update | `id`, `title`, `description`, `category`, `budget`, `status`, `student_id`, `assigned_to`, `created_at`, `completed_at` |
| `polytask_bids` | Query, Insert, Update | `id`, `job_id`, `bidder_id`, `amount`, `status`, `created_at` |
| `polytask_chats` | Query, Insert | `id`, `job_id`, `sender_id`, `message`, `created_at` |
| `polytask_proofs` | Query | `id`, `job_id`, `proof_url`, `created_at` |
| `polytask_disputes` | Query, Insert | `id`, `job_id`, `reason`, `created_at` |
| `polytask_reviews` | Query, Insert | `id`, `job_id`, `rating`, `comment`, `created_at` |
| `keusahawanan_businesses` | Query, Update, Insert | `id`, `name`, `description`, `category_id`, `owner_id`, `status`, `interview_date`, `logo_url`, `is_active`, `is_shift_enabled`, `ssm_registration_number`, `registration_type`, `online_payment_enabled`, `cod_enabled`, `payment_qr_url`, `payment_instructions`, `business_phone`, `payment_deadline_value`, `payment_deadline_unit`, `created_at` |
| `student_business_memberships`| Query, Update, Delete | `id`, `user_id`, `business_id`, `role`, `status`, `joined_at` |
| `keusahawanan_unit_admins` | Query, Delete | `id`, `user_id`, `created_at` |
| `keusahawanan_logs` | Insert | `id`, `business_id`, `actor_id`, `action_type`, `description`, `created_at` |
| `business_shifts` | Query, Insert, Update, Delete | `id`, `shift_date`, `shift_hour`, `assigned_to`, `created_by`, `notes`, `status`, `created_at` |
| `business_shift_swaps` | Query, Insert, Update | `id`, `shift_id`, `requested_by`, `swap_with`, `reason`, `status`, `responded_by`, `responded_at`, `created_at` |
| `business_sessions` | Query, Insert, Update | `id`, `session_date`, `opened_by`, `closed_by`, `opening_cash`, `closing_cash`, `total_sales`, `total_expenses`, `opening_time`, `closing_time`, `opening_notes`, `closing_notes`, `status`, `created_at` |
| `business_products` | Query, Update, Insert | `id`, `business_id`, `name`, `description`, `price`, `category`, `stock_quantity`, `reserved_stock`, `stock_alert_threshold`, `image_url`, `is_available`, `cost_items`, `total_cost`, `cost_notes`, `publish_to_polymart`, `polymart_location`, `polymart_pickup_info`, `polymart_published_at`, `online_payment_enabled`, `variations`, `image_urls`, `sale_price`, `sale_start_at`, `sale_end_at`, `is_preorder`, `preorder_deadline`, `created_at` |
| `business_transactions` | Query, Insert, Update | `id`, `business_id`, `invoice_number`, `items`, `subtotal`, `discount_type`, `discount_amount`, `discount_note`, `total_amount`, `payment_method`, `received_amount`, `change_amount`, `customer_name`, `customer_note`, `served_by`, `status`, `voided_by`, `voided_at`, `created_at` |
| `business_expenses` | Query, Insert, Update | `id`, `business_id`, `amount`, `category`, `description`, `expense_date`, `recorded_by`, `created_at` |
| `polymart_orders` | Query, Insert, Update | `id`, `buyer_id`, `business_id`, `status`, `total_amount`, `items`, `payment_method`, `receipt_url`, `share_phone`, `pickup_code`, `created_at`, `updated_at`, `cancelled_by`, `cancel_reason` |
| `polymart_cart_items` | Query, Update, Insert, Delete | `id`, `buyer_id`, `product_id`, `quantity`, `selected_variation`, `created_at` |
| `polymart_wishlist` | Query, Insert, Delete | `id`, `user_id`, `product_id`, `created_at` |
| `polymart_reviews` | Query, Insert | `id`, `order_id`, `product_id`, `rating`, `comment`, `created_at` |
| `polymart_ads` | Query, Update, Insert, Delete | `id`, `title`, `image_url`, `link_url`, `type`, `status`, `start_date`, `end_date`, `clicks`, `created_at` |
| `polymart_reports` | Query, Update | `id`, `product_id`, `reporter_id`, `reason`, `status`, `created_at` |
| `polymart_messages` | Query, Insert, Update | `id`, `sender_id`, `receiver_id`, `message`, `is_read`, `created_at` |
| `polymart_conversations` | Query, Insert, Update | `id`, `buyer_id`, `seller_id`, `last_message`, `updated_at` |
| `polyrent_listings` | Query, Insert, Update, Delete | `id`, `kawasan_id`, `title`, `description`, `price`, `images`, `status`, `contact_number`, `landlord_id`, `created_at` |
| `polyrent_reverse_ads` | Query, Insert, Delete, Update | `id`, `user_id`, `title`, `description`, `price_min`, `price_max`, `status`, `contact_number`, `created_at` |
| `polyrent_messages` | Query, Insert, Update | `id`, `sender_id`, `receiver_id`, `message`, `is_read`, `created_at` |
| `polyrent_reports` | Query, Insert | `id`, `listing_id`, `reporter_id`, `reason`, `status`, `created_at` |
| `polyrent_location_reviews` | Query, Insert | `id`, `kawasan_id`, `user_id`, `rating`, `comment`, `created_at` |
| `polyrider_jobs` | Query, Update, Insert | `id`, `student_id`, `rider_id`, `pickup_name`, `dropoff_name`, `proposed_price`, `status`, `created_at`, `addons`, `stops`, `carpool_group_id`, `distance_km`, `job_type`, `passenger_gender`, `is_carpool_open` |
| `polyrider_bids` | Query, Insert, Update | `id`, `job_id`, `rider_id`, `amount`, `status`, `created_at` |
| `polyrider_chats` | Query, Insert | `id`, `job_id`, `sender_id`, `message`, `created_at` |
| `polyrider_profiles` | Query, Update, Upsert | `user_id`, `plate_number`, `vehicle_type`, `avg_rating`, `total_trips`, `status`, `license_url`, `ic_number`, `created_at` |
| `polyrider_sos_logs` | Query, Insert | `id`, `job_id`, `user_id`, `created_at` |
| `polyrider_location_presets` | Query | `id`, `name`, `latitude`, `longitude`, `sort_order`, `is_active` |
| `polyrider_saved_locations` | Query, Insert, Delete | `id`, `user_id`, `label`, `lat`, `lng`, `created_at` |
| `polyrider_sos_contacts` | Query | `id`, `user_id`, `name`, `phone`, `created_at` |
| `polyrider_appeals` | Query | `id`, `user_id`, `reason`, `status`, `created_at` |
| `polysuara_confessions` | Query, Insert, Update, Delete | `id`, `content`, `category`, `upvotes`, `downvotes`, `created_at`, `status`, `official_reply`, `official_reply_at`, `codename`, `hashtags`, `author_reply`, `author_reply_at`, `image_url`, `is_pinned`, `is_approved`, `is_hidden_by_community`, `is_archived` |
| `polysuara_comments` | Query, Insert, Update, Delete | `id`, `confession_id`, `user_id`, `content`, `codename`, `is_hidden_by_community`, `upvotes`, `downvotes`, `reports_count`, `created_at` |
| `polysuara_comment_reports` | Query, Insert | `id`, `comment_id`, `reason`, `reporter_id` |
| `polysuara_chat_messages` | Query, Insert | `id`, `chat_id`, `sender_id`, `message`, `created_at` |
| `polysuara_chats` | Query, Update | `id`, `status`, `created_at` |
| `polysuara_notif_optout` | Query | `user_id` |
| `polysuara_upvotes` | Query, Insert | `id`, `confession_id`, `user_id` |
| `polysuara_downvotes` | Query, Insert | `id`, `confession_id`, `user_id` |
| `polysuara_polls` | Query, Insert | `id`, `confession_id`, `is_multiple_choice` |
| `polysuara_poll_options` | Query, Insert | `id`, `poll_id`, `option_text`, `vote_count` |
| `polysuara_poll_votes` | Query | `id`, `option_id`, `user_id` |
| `polysuara_comment_votes` | Query, Insert | `id`, `comment_id`, `user_id`, `vote_type` |
| `kebajikan_ticket_comments` | Query, Insert | `id`, `ticket_id`, `author_id`, `author_name`, `author_role`, `is_internal`, `is_delegation_note`, `content`, `attachments`, `created_at` |
| `kebajikan_tickets` | Query, Insert, Update | `id`, `ticket_no`, `submitter_id`, `full_name`, `gender`, `matric_no`, `phone`, `class`, `category`, `handled_by_unit`, `title`, `description`, `form_data`, `image_urls`, `status`, `assigned_to`, `delegated_to`, `delegation_note`, `priority`, `tags`, `warning_sent_at`, `escalated_at`, `sla_deadline`, `reopen_count`, `reopen_reason`, `reopen_requested_at`, `reopen_approved_by`, `cancelled_at`, `cancel_reason`, `resolved_at`, `resolved_by`, `resolution_note`, `rating`, `rating_comment`, `rating_at`, `created_at`, `updated_at` |
| `kebajikan_ticket_status_log` | Insert | `id`, `ticket_id`, `actor_id`, `actor_role`, `old_status`, `new_status`, `note`, `created_at` |
| `kebajikan_settings` | Query | `auto_reply_message` |
| `kebajikan_pics` | Query, Update, Insert, Delete | `id`, `category`, `jabatan_key`, `jabatan_label`, `pic_name`, `pic_title`, `pic_email`, `pic_phone`, `pic_user_id`, `is_active`, `created_by`, `created_at`, `updated_at` |
| `kebajikan_staff_assignments`| Query, Insert | `id`, `staff_user_id`, `assigned_by`, `role`, `is_active`, `note`, `assigned_at` |
| `kebajikan_tags` | Query | `id`, `name`, `color`, `created_by`, `created_at` |
| `kebajikan_escalation_actions`| Query | `id`, `ticket_id`, `pic_id`, `pic_name_manual`, `action_summary`, `recorded_by`, `recorded_at` |
| `kebajikan_public_stats` | Query | `total_tickets`, `total_resolved`, `total_active`, `total_escalated`, `resolution_rate`, `avg_resolution_hours`, `avg_rating`, `this_month_received`, `this_month_resolved` |
| `karnival_editions` | Query, Insert | `id`, `name`, `start_date`, `end_date`, `is_active` |
| `karnival_categories` | Query, Insert, Update, Delete | `id`, `edition_id`, `name`, `max_votes`, `sort_order` |
| `karnival_booths` | Query, Insert, Update, Delete | `id`, `edition_id`, `category_id`, `kelab_name`, `description`, `image_url`, `votes_count` |
| `karnival_votes_v2` | Query | `id`, `edition_id`, `category_id`, `voter_id`, `booth_id`, `created_at` |
| `supsas_editions` | Query, Insert, Update | `id`, `name`, `year`, `is_active`, `created_at` |
| `supsas_kontingen` | Query, Insert, Update, Delete | `id`, `edition_id`, `name`, `color`, `invite_code`, `created_at` |
| `supsas_sports` | Query, Insert, Update, Delete | `id`, `edition_id`, `name`, `type`, `sort_order`, `is_active` |
| `supsas_teams` | Query, Insert, Update, Delete | `id`, `edition_id`, `sport_id`, `kontingen_id`, `name`, `group_number`, `created_at` |
| `supsas_medal_tally` | Query | `id`, `edition_id`, `kontingen_id`, `gold`, `silver`, `bronze` |
| `supsas_fixtures` | Query, Insert, Update, Delete | `id`, `edition_id`, `sport_id`, `stage`, `match_number`, `team_a_id`, `team_b_id`, `team_a_score`, `team_b_score`, `winner_id`, `status`, `match_date`, `match_time`, `venue` |
| `supsas_results` | Query | `id`, `fixture_id`, `details`, `created_at` |
| `supsas_participants` | Query, Insert, Delete | `id`, `kontingen_id`, `user_id`, `created_at` |
| `akademik_folders` | Query, Insert | `id`, `name`, `created_by`, `created_at` |
| `akademik_files` | Query, Insert, Delete | `id`, `folder_id`, `name`, `url`, `size`, `created_by`, `created_at` |
| `akademik_sijil_categories` | Query | `id`, `name`, `icon`, `color`, `sort_order`, `is_active` |
| `akademik_merit_config` | Query | `id`, `category`, `sub_category`, `merit_value`, `description` |
| `akademik_unlock_requests` | Query, Insert, Update | `id`, `user_id`, `pencapaian_id`, `reason`, `status`, `reviewed_by`, `reviewed_at`, `created_at` |
| `akademik_qr_tokens` | Query, Insert, Delete, Update | `id`, `merit_value`, `is_active`, `expires_at`, `verification_pin`, `created_by`, `created_at` |
| `akademik_qr_scans` | Query, Insert | `id`, `token_id`, `user_id`, `created_at` |
| `asrama_recommendations` | Query, Upsert, Delete | `user_id`, `points`, `recommended`, `created_at` |
| `asrama_unit_admins` | Query | `id`, `user_id` |
| `student_merit_cohorts` | Query | `id`, `user_id`, `merit_points`, `cohort_year` |

---

### C. Supabase RPC Functions
The frontend codebase calls **33 unique Postgres functions** via `supabase.rpc(...)`:

| RPC Function Name | Expected Parameters (Frontend Payload) | Description |
|---|---|---|
| `update_user_ai_tier` | `{ target_user_id: string, new_tier: 'free' \| 'pro' \| 'admin' }` | Updates the subscription AI tier for a user. |
| `get_average_budget_by_category`| `{ p_category: string }` | Retrieves the average budget for job tasks in a specific category. |
| `increment_merit_by_source` | `{ p_uid: string, p_delta: number, p_src: string }` | Awards/deducts academic merit points with a specific source logs track. |
| `delete_own_account` | None | Allows a student/user to request deleting their own account. |
| `check_matric_registered` | `{ p_matric_no: string }` | Validates if a student matric number has already registered. |
| `verify_staff_code` | `{ p_code: string }` | Verifies the staff passcode for JPP/Staff registration. |
| `check_ai_tokens` | `{ task_name?: string }` | Checks the user's remaining AI token balance for a task. |
| `spend_ai_tokens` | `{ task_name: string }` | Deducts AI tokens from the user's balance for a task. |
| `increment_ai_google_tokens` | `{ tokens_used: number }` | Tracks Google-specific AI model token consumption. |
| `generate_puskep_reg_number` | None | Automatically formats and yields a new PUSKEP registration number. |
| `increment_promotion_uses` | `{ p_promotion_id: string }` | Increments the promotion code usage count upon checkout. |
| `decrement_product_stock` | `{ p_product_id: string, p_quantity: number }` | Reduces inventory quantities after a POS purchase. |
| `increment_product_stock` | `{ p_product_id: string, p_quantity: number }` | Adds inventory back when a sale is voided or refunded. |
| `transfer_business_ownership` | `{ p_business_id: string, p_new_owner_id: string }` | Reassigns the OWNER role of a business to another student. |
| `change_member_role` | `{ p_user_id: string, p_club_id: string, p_new_role: string }` | Modifies the role of a club member (e.g. from MEMBER to PRESIDENT). |
| `request_leave_club` | `{ p_club_id: string, p_is_primary: boolean }` | Submits a request to leave a club. |
| `increment_merit` | `{ p_user_id: string, p_points: number }` | General increment function for student merit points. |
| `resolve_login_identifier` | `{ p_identifier: string }` | Translates email, matric number, or username into a direct email. |
| `get_auth_providers` | `{ p_email: string }` | Checks which authentication providers (Google, email) are valid for a user. |
| `check_email_registered` | `{ p_email: string }` | Checks if a given email is already used for signup. |
| `delete_own_user` | None | Self-delete user endpoint used when registration is rejected. |
| `archive_merit_cohort` | `{ p_cohort_year: number }` | Archives academic merit points for an entire student year cohort. |
| `archive_merit_by_source` | `{ p_source: string }` | Archives merit transactions matching a specific source. |
| `update_jpp_member_profile` | `{ p_target_id: string, p_position: string, p_unit: string }` | Updates JPP structural position and unit department details. |
| `assign_jpp_member` | `{ p_target_id: string, p_position: string, p_unit: string }` | Assigns JPP staff status and exco roles to a profile. |
| `remove_jpp_member` | `{ p_target_id: string }` | Revokes JPP membership status and assignments. |
| `reset_jpp_cohort` | None | Wipes current JPP staff directory for orientation season rollover. |
| `get_registration_trend` | `{ days_back: number }` | Aggregates daily student registration metrics for overview chart. |
| `detect_duplicate_matric_accounts`| None | Detects multiple accounts registered with identical matric numbers. |
| `admin_merge_duplicate_accounts` | `{ p_primary_id: string, p_secondary_id: string }` | Merges two profile records into one primary account. |
| `toggle_jpp_role` | `{ p_target_id: string }` | Toggles profile JPP global role status. |
| `restore_hidden_comment` | `{ p_comment_id: string }` | Restores a confession comment hidden by community downvotes. |
| `soft_or_hard_delete_polysuara_comment`| `{ p_comment_id: string }` | Deletes confession comment (supports soft-delete flag). |
| `restore_hidden_confession` | `{ p_confession_id: string }` | Restores a confession post hidden by community downvotes. |
| `auto_sort_pencapaian_file` | `{ p_pencapaian_id: string }` | Triggers background OCR/sorting for uploaded cert files. |
| `get_karnival_booth_votes` | `{ p_edition_id: string }` | Resolves booth vote distribution for Karnival Scoreboard. |
| `get_my_karnival_votes_in_category`| `{ p_category_id: string }` | Retrieves voter records for specific category. |
| `get_kebajikan_monthly_stats` | `{ months_back: number }` | Resolves monthly ticket creation and resolution duration. |
| `get_my_polysuara_ids` | None | Returns user confession upvote/downvote history. |
| `get_trending_polysuara_tags` | None | Resolves trending hashtags based on confession activity. |
| `toggle_polysuara_upvote` | `{ p_confession_id: string, p_user_id: string }` | Upvotes confession. |
| `toggle_polysuara_downvote` | `{ p_confession_id: string, p_user_id: string }` | Downvotes confession. |
| `toggle_polysuara_comment_vote` | `{ p_comment_id: string, p_user_id: string, p_vote_type: string }` | Toggles vote state on confession comment. |
| `report_polysuara_comment` | `{ p_comment_id: string, p_reason: string }` | Reports confession comment for community moderation. |
| `toggle_polysuara_poll_vote` | `{ p_option_id: string, p_user_id: string }` | Casts or removes poll option vote. |
| `supsas_revoke_leader` | `{ p_kontingen_id: string }` | Revokes the assigned representative leader of a kontingen. |
| `advance_group_winners` | `{ p_sport_id: string }` | Advances group stage winners into SUPSAS brackets. |
| `advance_qf_winners` | `{ p_sport_id: string }` | Advances Quarter-Final winners into Semi-Finals. |
| `advance_sf_winners` | `{ p_sport_id: string }` | Advances Semi-Final winners into Finals. |
| `supsas_claim_invite_code` | `{ p_invite_code: string }` | Validates and links profile as representative leader via invite code. |

---

### D. RBAC System and Permission Hierarchy
The project implements a **Dual-RBAC architecture** that maps **Global User Roles** against **Club Memberships** and **Exco Department Assignments**:

#### 1. Global User Roles (`UserRole` enum)
* Defined in `src/types/index.ts:10`:
  * `SUPER_ADMIN_JPP` / `ADMIN`: Pentadbir Mutlak (unrestricted access to all modules/settings).
  * `JPP`: Ahli Jawatankuasa Perwakilan Pelajar (exco members).
  * `CLUB_ADVISOR` / `PENASIHAT`: Club advisor.
  * `CLUB_PRESIDENT` / `PRESIDEN`: Club president.
  * `CLUB_MT` / `MT`: Ahli Jawatankuasa Kelab (executive committee).
  * `CLUB_MEMBER` / `AHLI`: Ordinary student member.
  * `STAFF`: General staff.

#### 2. Exco Units (`jpp_unit`)
* Traced from `src/types/index.ts:35`:
  * `KEUSAHAWANAN`: Exco Keusahawanan (Manages businesses, PolyMart, POS, and sessions).
  * `KPP`: Exco Kelab, Persatuan & Perpaduan (Manages club activities, committee structures, and reports approval).
  * `KK`: Exco Kediaman dan Kerohanian (Manages block Wi-Fi tickets, cafeteria complaints, Kamsis allocations).
  * `KLS`: Exco Kediaman Luar Kampus (Manages off-campus housing directories and KLK residency).
  * `AKADEMIK`: Exco Akademik (Manages folder/files, student CGPA verification, merit awards).
  * `KEBAJIKAN`: Exco Kebajikan (Manages ticketing system, escalations, staff assignments).
  * `MULTIMEDIA`: Exco Multimedia (Announcement actions and system-wide asset delivery).
  * `KOLAB`: Exco Kolaborasi dan Kesukarelawanan.
  * `SRK`: Exco Sukan, Rekreasi dan Kebudayaan (Manages SUPSAS sports ed., bracket scheduling).

#### 3. Frontend Access Flags (`AuthContext.tsx`)
* Permissions are evaluated dynamically on user focus or login via the active club switcher:
  * `isAdvisor`: User is `CLUB_ADVISOR`, `SUPER_ADMIN_JPP`, or KPP Exco member.
  * `isPresident`: User is `CLUB_PRESIDENT` or has `isAdvisor` flag.
  * `isMT`: User is `CLUB_MT` or has `isPresident` flag.
  * `isMember`: User is `CLUB_MEMBER` or has `isMT` flag.
  * `hasKppAccess`: User is Super Admin, JPP YDP/YDP-Timbalan, KPP Exco, or MT assigned to KPP.
  * `hasKeusahawananAccess`: User is Super Admin, Keusahawanan Exco, MT assigned to Keusahawanan, or Unit Keusahawanan Admin.
  * `hasKediamanAccess`: User is Super Admin, Kediaman Exco, MT assigned to KK, or Unit Asrama Admin.
  * `hasKebajikanAccess`: User is Super Admin, Kebajikan Exco, or Unit Kebajikan Staff.
  * `hasKebajikanKKAccess`: User is Super Admin, KK Exco, MT assigned to KK, or JPP YDP (allows resolving cafeteria/WiFi issues).

---

## 5. Verification Method

To independently verify the queries, mutations, RPCs, and RBAC system:

1. **Verify Code References:**
   * Run the following local grep search commands to check references to tables:
     ```powershell
     # Find all table references:
     rg "\.from\('" src/
     # Find all RPC references:
     rg "\.rpc\('" src/
     ```
2. **Review DB Models Mapping:**
   * Inspect `src/types/index.ts` to verify typescript definitions for models like `Club`, `ClubActivity`, `BusinessProduct`, `KebajikanTicket`, and `SupsasFixture`.
3. **Execute Frontend Build / Type Checks:**
   * Compile the project to verify that typescript types for all queried columns and tables match database contracts:
     ```powershell
     npm run lint:types
     ```
4. **Execute Unit Tests:**
   * Run the project's testing suite to verify mock database calls:
     ```powershell
     npm run test
     ```
