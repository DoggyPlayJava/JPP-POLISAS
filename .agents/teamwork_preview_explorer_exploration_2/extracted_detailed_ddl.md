# Detailed DDL Extraction from Migrations

## File 1: `20260425132500_optimize_database.sql`

### RLS Policies
```sql
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
```

```sql
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
```

```sql
DROP POLICY IF EXISTS "Student can read own memberships" ON public.student_club_memberships;
```

```sql
DROP POLICY IF EXISTS "Students can read own memberships" ON public.student_club_memberships;
```

```sql
DROP POLICY IF EXISTS "Student can request membership" ON public.student_club_memberships;
```

```sql
DROP POLICY IF EXISTS "Students can apply to clubs" ON public.student_club_memberships;
```

```sql
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
```

```sql
DROP POLICY IF EXISTS "kb_ticket_select_own" ON public.kebajikan_tickets;
```

```sql
DROP POLICY IF EXISTS "kb_ticket_update_own" ON public.kebajikan_tickets;
```

```sql
DROP POLICY IF EXISTS "Users can view their own programs" ON public.programs;
```

```sql
DROP POLICY IF EXISTS "Users can insert their own programs" ON public.programs;
```

```sql
DROP POLICY IF EXISTS "Users can update their own programs" ON public.programs;
```

```sql
DROP POLICY IF EXISTS "Users can delete their own programs" ON public.programs;
```

```sql
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (user_id = (select auth.uid()));
```

```sql
CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (user_id = (select auth.uid()));
```

```sql
CREATE POLICY "Student can read own memberships" ON public.student_club_memberships
FOR SELECT USING (user_id = (select auth.uid()));
```

```sql
CREATE POLICY "Students can read own memberships" ON public.student_club_memberships
FOR SELECT USING (user_id::text = (select auth.uid())::text);
```

```sql
CREATE POLICY "Student can request membership" ON public.student_club_memberships
FOR INSERT WITH CHECK (user_id = (select auth.uid()) AND account_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text]));
```

```sql
CREATE POLICY "Students can apply to clubs" ON public.student_club_memberships
FOR INSERT WITH CHECK (user_id = (select auth.uid()) AND account_status = 'PENDING'::text);
```

```sql
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (id = (select auth.uid()));
```

```sql
CREATE POLICY "kb_ticket_select_own" ON public.kebajikan_tickets
FOR SELECT USING (submitter_id = (select auth.uid()));
```

```sql
CREATE POLICY "kb_ticket_update_own" ON public.kebajikan_tickets
FOR UPDATE USING (submitter_id = (select auth.uid()));
```

```sql
CREATE POLICY "Users can view their own programs" ON public.programs
FOR SELECT USING (user_id = (select auth.uid()));
```

```sql
CREATE POLICY "Users can insert their own programs" ON public.programs
FOR INSERT WITH CHECK (user_id = (select auth.uid()));
```

```sql
CREATE POLICY "Users can update their own programs" ON public.programs
FOR UPDATE USING (user_id = (select auth.uid()));
```

```sql
CREATE POLICY "Users can delete their own programs" ON public.programs
FOR DELETE USING (user_id = (select auth.uid()));
```

---

## File 2: `20260425133500_fix_security_warnings.sql`

### RLS Policies
```sql
DROP POLICY IF EXISTS "Semua boleh tulis log" ON public.club_logs;
```

```sql
DROP POLICY IF EXISTS "kb_notif_update_read" ON public.kebajikan_notifications;
```

```sql
CREATE POLICY "Semua boleh tulis log" ON public.club_logs 
FOR INSERT WITH CHECK (actor_id = (select auth.uid()));
```

```sql
CREATE POLICY "kb_notif_update_read" ON public.kebajikan_notifications 
FOR UPDATE USING (
  (target_user_id = (select auth.uid())) OR is_kebajikan_staff()
) WITH CHECK (
  (target_user_id = (select auth.uid())) OR is_kebajikan_staff()
);
```

---

## File 3: `20260429120653_personal_folders.sql`

### RLS Policies
```sql
DROP POLICY IF EXISTS akfol_select ON akademik_folders;
```

```sql
DROP POLICY IF EXISTS akfol_insert ON akademik_folders;
```

```sql
DROP POLICY IF EXISTS akfol_update ON akademik_folders;
```

```sql
DROP POLICY IF EXISTS akfol_delete ON akademik_folders;
```

```sql
DROP POLICY IF EXISTS akf_select ON akademik_files;
```

```sql
DROP POLICY IF EXISTS akf_insert ON akademik_files;
```

```sql
DROP POLICY IF EXISTS akf_update ON akademik_files;
```

```sql
DROP POLICY IF EXISTS akf_delete ON akademik_files;
```

```sql
CREATE POLICY akfol_select ON akademik_folders FOR SELECT USING (created_by = auth.uid());
```

```sql
CREATE POLICY akfol_insert ON akademik_folders FOR INSERT WITH CHECK (created_by = auth.uid());
```

```sql
CREATE POLICY akfol_update ON akademik_folders FOR UPDATE USING (created_by = auth.uid());
```

```sql
CREATE POLICY akfol_delete ON akademik_folders FOR DELETE USING (created_by = auth.uid());
```

```sql
CREATE POLICY akf_select ON akademik_files FOR SELECT USING (uploaded_by = auth.uid() OR owner_user_id = auth.uid());
```

```sql
CREATE POLICY akf_insert ON akademik_files FOR INSERT WITH CHECK (uploaded_by = auth.uid() OR owner_user_id = auth.uid());
```

```sql
CREATE POLICY akf_update ON akademik_files FOR UPDATE USING (uploaded_by = auth.uid() OR owner_user_id = auth.uid());
```

```sql
CREATE POLICY akf_delete ON akademik_files FOR DELETE USING (uploaded_by = auth.uid() OR owner_user_id = auth.uid());
```

---

## File 4: `20260504231952_optimize_performance_rls.sql`

### RLS Policies
```sql
DROP POLICY IF EXISTS "karnival_votes_v2_admin_delete" ON public.karnival_votes_v2;
```

```sql
DROP POLICY IF EXISTS "karnival_votes_v2_admin_update" ON public.karnival_votes_v2;
```

```sql
DROP POLICY IF EXISTS "karnival_votes_v2_delete_own" ON public.karnival_votes_v2;
```

```sql
DROP POLICY IF EXISTS "karnival_votes_v2_insert_self" ON public.karnival_votes_v2;
```

```sql
DROP POLICY IF EXISTS "scm_select" ON public.student_club_memberships;
```

```sql
DROP POLICY IF EXISTS "kamsis_dynamic_fields_admin_all" ON public.kamsis_dynamic_fields;
```

```sql
DROP POLICY IF EXISTS "kamsis_applications_admin_all" ON public.kamsis_applications;
```

```sql
DROP POLICY IF EXISTS "kamsis_applications_insert_own" ON public.kamsis_applications;
```

```sql
DROP POLICY IF EXISTS "kamsis_applications_select_own" ON public.kamsis_applications;
```

```sql
DROP POLICY IF EXISTS "kamsis_applications_update_own" ON public.kamsis_applications;
```

```sql
DROP POLICY IF EXISTS "User can manage own cgpa" ON public.akademik_cgpa_records;
```

```sql
DROP POLICY IF EXISTS "JPP can view all cgpa" ON public.akademik_cgpa_records;
```

```sql
DROP POLICY IF EXISTS "amc_modify" ON public.akademik_merit_config;
```

```sql
CREATE POLICY "karnival_votes_v2_admin_delete" ON public.karnival_votes_v2 FOR DELETE USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'SUPER_ADMIN_JPP'::text OR profiles.role = 'JPP'::text OR profiles.jabatan = 'JPP'::text) )
);
```

```sql
CREATE POLICY "karnival_votes_v2_admin_update" ON public.karnival_votes_v2 FOR UPDATE USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'SUPER_ADMIN_JPP'::text OR profiles.role = 'JPP'::text OR profiles.jabatan = 'JPP'::text) )
);
```

```sql
CREATE POLICY "karnival_votes_v2_delete_own" ON public.karnival_votes_v2 FOR DELETE USING (
  (select auth.uid()) = voter_id
);
```

```sql
CREATE POLICY "karnival_votes_v2_insert_self" ON public.karnival_votes_v2 FOR INSERT WITH CHECK (
  (select auth.uid()) = voter_id AND EXISTS ( SELECT 1 FROM karnival_editions WHERE karnival_editions.id = karnival_votes_v2.edition_id AND karnival_editions.voting_enabled = true )
);
```

```sql
CREATE POLICY "scm_select" ON public.student_club_memberships FOR SELECT USING (
  (select auth.uid()) IS NOT NULL
);
```

```sql
CREATE POLICY "kamsis_dynamic_fields_admin_all" ON public.kamsis_dynamic_fields FOR ALL USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role IN ('SUPER_ADMIN_JPP', 'STAFF') OR (profiles.role = 'JPP' AND profiles.jpp_unit = 'KK') OR (profiles.role = 'JPP' AND profiles.jpp_position IN ('YDP', 'YANG_DIPERTUA', 'NAIB_YDP'))) )
);
```

```sql
CREATE POLICY "kamsis_applications_admin_all" ON public.kamsis_applications FOR ALL USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role IN ('SUPER_ADMIN_JPP', 'STAFF') OR (profiles.role = 'JPP' AND profiles.jpp_unit = 'KK') OR (profiles.role = 'JPP' AND profiles.jpp_position IN ('YDP', 'YANG_DIPERTUA', 'NAIB_YDP'))) )
);
```

```sql
CREATE POLICY "kamsis_applications_insert_own" ON public.kamsis_applications FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);
```

```sql
CREATE POLICY "kamsis_applications_select_own" ON public.kamsis_applications FOR SELECT USING (
  user_id = (select auth.uid())
);
```

```sql
CREATE POLICY "kamsis_applications_update_own" ON public.kamsis_applications FOR UPDATE USING (
  user_id = (select auth.uid())
);
```

```sql
CREATE POLICY "akademik_cgpa_records_select" ON public.akademik_cgpa_records FOR SELECT USING (
  user_id = (select auth.uid()) 
  OR EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP') )
);
```

```sql
CREATE POLICY "akademik_cgpa_records_insert" ON public.akademik_cgpa_records FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);
```

```sql
CREATE POLICY "akademik_cgpa_records_update" ON public.akademik_cgpa_records FOR UPDATE USING (
  user_id = (select auth.uid())
);
```

```sql
CREATE POLICY "akademik_cgpa_records_delete" ON public.akademik_cgpa_records FOR DELETE USING (
  user_id = (select auth.uid())
);
```

```sql
CREATE POLICY "amc_insert" ON public.akademik_merit_config FOR INSERT WITH CHECK (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'SUPER_ADMIN_JPP' )
);
```

```sql
CREATE POLICY "amc_update" ON public.akademik_merit_config FOR UPDATE USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'SUPER_ADMIN_JPP' )
);
```

```sql
CREATE POLICY "amc_delete" ON public.akademik_merit_config FOR DELETE USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'SUPER_ADMIN_JPP' )
);
```

---

## File 5: `20260505235200_auto_sort_sijil_akademik.sql`

---

## File 6: `20260510044608_add_db_telemetry_rpc.sql`

---

## File 7: `20260512054626_59_performance_optimizations.sql`

### RLS Policies
```sql
DROP POLICY IF EXISTS aqt_modify ON public.akademik_qr_tokens;
```

```sql
DROP POLICY IF EXISTS asc_modify ON public.akademik_sijil_categories;
```

```sql
DROP POLICY IF EXISTS unlock_requests_exco_all ON public.akademik_unlock_requests;
```

```sql
DROP POLICY IF EXISTS aur_select ON public.akademik_unlock_requests;
```

```sql
DROP POLICY IF EXISTS unlock_req_admin_update ON public.akademik_unlock_requests;
```

```sql
CREATE POLICY aqt_insert ON public.akademik_qr_tokens FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')));
```

```sql
CREATE POLICY aqt_update ON public.akademik_qr_tokens FOR UPDATE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')));
```

```sql
CREATE POLICY aqt_delete ON public.akademik_qr_tokens FOR DELETE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')));
```

```sql
CREATE POLICY asc_insert ON public.akademik_sijil_categories FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role = 'SUPER_ADMIN_JPP'));
```

```sql
CREATE POLICY asc_update ON public.akademik_sijil_categories FOR UPDATE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role = 'SUPER_ADMIN_JPP'));
```

```sql
CREATE POLICY asc_delete ON public.akademik_sijil_categories FOR DELETE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role = 'SUPER_ADMIN_JPP'));
```

```sql
CREATE POLICY aur_select ON public.akademik_unlock_requests FOR SELECT 
USING (
    user_id = uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND (
            profiles.role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP', 'CLUB_MT', 'MT') 
        )
    )
);
```

```sql
CREATE POLICY aur_exco_insert ON public.akademik_unlock_requests FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND (
            profiles.role = 'SUPER_ADMIN_JPP' 
            OR (profiles.role = 'JPP' AND profiles.jpp_unit = 'AKADEMIK') 
            OR profiles.role IN ('CLUB_MT', 'MT')
        )
    )
);
```

```sql
CREATE POLICY aur_admin_update ON public.akademik_unlock_requests FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND profiles.role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP', 'CLUB_MT', 'MT')
    )
);
```

```sql
CREATE POLICY aur_exco_delete ON public.akademik_unlock_requests FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND (
            profiles.role = 'SUPER_ADMIN_JPP' 
            OR (profiles.role = 'JPP' AND profiles.jpp_unit = 'AKADEMIK') 
            OR profiles.role IN ('CLUB_MT', 'MT')
        )
    )
);
```

---

## File 8: `20260512060300_60_remove_unnecessary_realtime.sql`

---

## File 9: `20260512061000_61_wal_monitoring_rpc.sql`

---

## File 10: `20260518000000_update_polysuara_rate_limit.sql`

### Functions & Triggers
```sql
CREATE TRIGGER trg_polysuara_hourly_limit
BEFORE INSERT ON public.polysuara_confessions
FOR EACH ROW EXECUTE FUNCTION public.check_polysuara_hourly_limit();
```

---

## File 11: `20260518115654_polyrent_fasa1_availability.sql`

---

## File 12: `20260518120600_polyrent_fasa2.sql`

### Custom Types / Enums / Domains
```sql
CREATE TYPE polyrent_status AS ENUM ('OPEN', 'CLOSED', 'HIDDEN');
```

```sql
ALTER TYPE polyrent_status ADD VALUE IF NOT EXISTS 'SUSPENDED';
```

### Functions & Triggers
```sql
CREATE TRIGGER on_polyrent_report_inserted
    AFTER INSERT ON polyrent_reports
    FOR EACH ROW
    EXECUTE FUNCTION polyrent_check_report_threshold();
```

### RLS Policies
```sql
ALTER TABLE polyrent_location_reviews ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Semua pengguna boleh baca review kawasan"
    ON polyrent_location_reviews FOR SELECT
    TO authenticated
    USING (true);
```

```sql
CREATE POLICY "Pengguna boleh tambah review sendiri"
    ON polyrent_location_reviews FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reviewer_id);
```

```sql
CREATE POLICY "Pengguna boleh update review sendiri"
    ON polyrent_location_reviews FOR UPDATE
    TO authenticated
    USING (auth.uid() = reviewer_id);
```

```sql
CREATE POLICY "Pengguna boleh buang review sendiri"
    ON polyrent_location_reviews FOR DELETE
    TO authenticated
    USING (auth.uid() = reviewer_id);
```

```sql
ALTER TABLE polyrent_reports ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Admin boleh baca semua report"
    ON polyrent_reports FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN_JPP', 'JPP')
        )
    );
```

```sql
CREATE POLICY "Pengguna boleh baca report sendiri"
    ON polyrent_reports FOR SELECT
    TO authenticated
    USING (auth.uid() = reporter_id);
```

```sql
CREATE POLICY "Pengguna boleh tambah report"
    ON polyrent_reports FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reporter_id);
```

---

## File 13: `20260518121000_polyrent_fasa3.sql`

### Functions & Triggers
```sql
CREATE TRIGGER on_polyrent_reverse_ads_updated
    BEFORE UPDATE ON polyrent_reverse_ads
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
```

### RLS Policies
```sql
ALTER TABLE polyrent_messages ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Pengguna boleh baca mesej yang dihantar atau diterima"
    ON polyrent_messages FOR SELECT
    TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
```

```sql
CREATE POLICY "Pengguna boleh hantar mesej"
    ON polyrent_messages FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = sender_id);
```

```sql
CREATE POLICY "Penerima boleh kemaskini status is_read"
    ON polyrent_messages FOR UPDATE
    TO authenticated
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);
```

```sql
ALTER TABLE polyrent_reverse_ads ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Semua orang boleh baca reverse ads yang OPEN"
    ON polyrent_reverse_ads FOR SELECT
    TO authenticated
    USING (status = 'OPEN' OR auth.uid() = student_id);
```

```sql
CREATE POLICY "Pelajar boleh tambah reverse ad"
    ON polyrent_reverse_ads FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);
```

```sql
CREATE POLICY "Pelajar boleh update reverse ad sendiri"
    ON polyrent_reverse_ads FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id);
```

```sql
CREATE POLICY "Pelajar boleh delete reverse ad sendiri"
    ON polyrent_reverse_ads FOR DELETE
    TO authenticated
    USING (auth.uid() = student_id);
```

---

## File 14: `20260525021000_fix_polyrider_profiles_ref.sql`

### Create / Alter Tables
```sql
ALTER TABLE polyrider_saved_locations ENABLE TRIGGER trg_saved_locations_limit;
```

```sql
ALTER TABLE polytask_sos_logs ENABLE TRIGGER trg_audit_polyrider_sos;
```

---

## File 15: `20260527154636_88_polymart_product_variations.sql`

---

## File 16: `20260527161800_89_complete_order_idempotency_guard.sql`

---

## File 17: `20260527162000_90_polymart_cancellation_flow.sql`

---

## File 18: `20260527162100_91_product_multi_images.sql`

---

## File 19: `20260527162200_92_flash_sale_preorder.sql`

---

## File 20: `20260527162300_93_polymart_chat.sql`

### Create / Alter Tables
```sql
ALTER TABLE polymart_messages ENABLE ROW LEVEL SECURITY;
```

### RLS Policies
```sql
ALTER TABLE polymart_conversations ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE polymart_messages ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "polymart_conversations_select" ON polymart_conversations
FOR SELECT USING (
  buyer_id = (SELECT auth.uid())
  OR vendor_business_id IN (
    SELECT id FROM keusahawanan_businesses WHERE owner_id = (SELECT auth.uid())
    UNION
    SELECT business_id FROM student_business_memberships WHERE user_id = (SELECT auth.uid()) AND status = 'ACTIVE'
  )
);
```

```sql
CREATE POLICY "polymart_conversations_insert" ON polymart_conversations
FOR INSERT WITH CHECK (
  buyer_id = (SELECT auth.uid())
);
```

```sql
CREATE POLICY "polymart_messages_select" ON polymart_messages
FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM polymart_conversations
    WHERE buyer_id = (SELECT auth.uid())
    OR vendor_business_id IN (
      SELECT id FROM keusahawanan_businesses WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT business_id FROM student_business_memberships WHERE user_id = (SELECT auth.uid()) AND status = 'ACTIVE'
    )
  )
);
```

```sql
CREATE POLICY "polymart_messages_insert" ON polymart_messages
FOR INSERT WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND conversation_id IN (
    SELECT id FROM polymart_conversations
    WHERE buyer_id = (SELECT auth.uid())
    OR vendor_business_id IN (
      SELECT id FROM keusahawanan_businesses WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT business_id FROM student_business_memberships WHERE user_id = (SELECT auth.uid()) AND status = 'ACTIVE'
    )
  )
);
```

```sql
CREATE POLICY "polymart_messages_update" ON polymart_messages
FOR UPDATE USING (
  -- Only recipient can update (mark as read), meaning user is not the sender
  sender_id != (SELECT auth.uid())
  AND conversation_id IN (
    SELECT id FROM polymart_conversations
    WHERE buyer_id = (SELECT auth.uid())
    OR vendor_business_id IN (
      SELECT id FROM keusahawanan_businesses WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT business_id FROM student_business_memberships WHERE user_id = (SELECT auth.uid()) AND status = 'ACTIVE'
    )
  )
) WITH CHECK (
  is_read = true
);
```

---

## File 21: `20260527162400_94_polymart_wishlist.sql`

### RLS Policies
```sql
ALTER TABLE polymart_wishlist ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "polymart_wishlist_select" ON polymart_wishlist
FOR SELECT USING (user_id = (SELECT auth.uid()));
```

```sql
CREATE POLICY "polymart_wishlist_insert" ON polymart_wishlist
FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
```

```sql
CREATE POLICY "polymart_wishlist_delete" ON polymart_wishlist
FOR DELETE USING (user_id = (SELECT auth.uid()));
```

---

## File 22: `20260527162500_95_polymart_jsonb_variations.sql`

### Create / Alter Tables
```sql
ALTER TABLE "public"."business_products" 
ADD COLUMN "variations" JSONB DEFAULT '[]'::jsonb;
```

---

## File 23: `20260527162600_96_polymart_chat_uniqueness.sql`

---

## File 24: `20260527162700_97_fix_update_product_variation_stock_updated_at.sql`

### Create / Alter Tables
```sql
ALTER TABLE "public"."polymart_cart_items" DROP CONSTRAINT IF EXISTS "uq_polymart_cart_item";
```

```sql
ALTER TABLE "public"."polymart_cart_items" DROP CONSTRAINT IF EXISTS "uq_polymart_cart_item_variation_constraint";
```

```sql
ALTER TABLE "public"."polymart_cart_items"
ALTER COLUMN "selected_variation" SET DEFAULT '',
ALTER COLUMN "selected_variation" SET NOT NULL;
```

```sql
ALTER TABLE "public"."polymart_cart_items"
ADD CONSTRAINT "uq_polymart_cart_item_variation_constraint" 
UNIQUE USING INDEX "uq_polymart_cart_item_variation_v2";
```

---

## File 25: `20260529224800_98_polysuara_social_comments.sql`

### Create / Alter Tables
```sql
ALTER TABLE public.polysuara_comment_votes ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polysuara_comment_reports ENABLE ROW LEVEL SECURITY;
```

### Functions & Triggers
```sql
CREATE TRIGGER trg_censor_polysuara_comment
BEFORE INSERT OR UPDATE OF content ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.censor_polysuara_content();
```

```sql
CREATE TRIGGER trg_polysuara_comment_codename
BEFORE INSERT ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.generate_polysuara_comment_codename();
```

```sql
CREATE TRIGGER trg_sync_polysuara_comment_count
AFTER INSERT OR DELETE ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_polysuara_comment_count();
```

### RLS Policies
```sql
ALTER TABLE public.polysuara_comments ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polysuara_comment_votes ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polysuara_comment_reports ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Pelajar boleh baca ulasan" ON public.polysuara_comments
    FOR SELECT USING (is_hidden_by_community = false);
```

```sql
CREATE POLICY "Pelajar boleh buat ulasan" ON public.polysuara_comments
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
```

```sql
CREATE POLICY "JPP boleh urus ulasan" ON public.polysuara_comments
    FOR ALL USING (public.is_jpp_admin((SELECT auth.uid()))) 
    WITH CHECK (public.is_jpp_admin((SELECT auth.uid())));
```

```sql
CREATE POLICY "Pelajar boleh lihat undian ulasan sendiri" ON public.polysuara_comment_votes
    FOR SELECT USING ((SELECT auth.uid()) = user_id);
```

```sql
CREATE POLICY "Pelajar boleh buat undian ulasan sendiri" ON public.polysuara_comment_votes
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
```

```sql
CREATE POLICY "Pelajar boleh padam undian ulasan sendiri" ON public.polysuara_comment_votes
    FOR DELETE USING ((SELECT auth.uid()) = user_id);
```

```sql
CREATE POLICY "JPP boleh urus undian ulasan" ON public.polysuara_comment_votes
    FOR ALL USING (public.is_jpp_admin((SELECT auth.uid())));
```

```sql
CREATE POLICY "Pelajar boleh buat laporan ulasan" ON public.polysuara_comment_reports
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = reporter_id);
```

```sql
CREATE POLICY "JPP boleh urus laporan ulasan" ON public.polysuara_comment_reports
    FOR ALL USING (public.is_jpp_admin((SELECT auth.uid())));
```

---

## File 26: `20260529225900_99_polysuara_social_softdelete_images.sql`

---

## File 27: `26_pembubaran_kohort.sql`

### Create / Alter Tables
```sql
ALTER TABLE public.club_reports ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
```

```sql
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
```

```sql
ALTER TABLE public.club_reports DROP CONSTRAINT IF EXISTS club_reports_submitted_by_fkey;
```

```sql
ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_user_id_fkey;
```

```sql
ALTER TABLE public.club_reports ALTER COLUMN submitted_by DROP NOT NULL;
```

```sql
ALTER TABLE public.programs ALTER COLUMN user_id DROP NOT NULL;
```

```sql
ALTER TABLE public.club_reports 
  ADD CONSTRAINT club_reports_submitted_by_fkey 
  FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
```

```sql
ALTER TABLE public.programs 
  ADD CONSTRAINT programs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
```

---

## File 28: `27_pembubaran_kelab.sql`

---

## File 29: `27_polysuara_v4_updates.sql`

### Storage Buckets
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('polysuara_attachments', 'polysuara_attachments', true)
ON CONFLICT (id) DO NOTHING;
```

### Functions & Triggers
```sql
Create Trigger for Auto Censor (Regex Replace)
CREATE OR REPLACE FUNCTION public.censor_polysuara_content()
RETURNS TRIGGER AS $$
DECLARE
    rec RECORD;
```

```sql
CREATE TRIGGER trg_censor_polysuara
BEFORE INSERT OR UPDATE OF content ON public.polysuara_confessions
FOR EACH ROW EXECUTE FUNCTION public.censor_polysuara_content();
```

### RLS Policies
```sql
ALTER TABLE public.polysuara_confessions 
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- 2. Create polysuara_censored_words table
CREATE TABLE IF NOT EXISTS public.polysuara_censored_words (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    word TEXT NOT NULL UNIQUE,
    added_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for censored words
ALTER TABLE public.polysuara_censored_words ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Allow public read censored words" 
ON public.polysuara_censored_words FOR SELECT USING (true);
```

```sql
CREATE POLICY "Allow authenticated full access censored words" 
ON public.polysuara_censored_words FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');
```

```sql
CREATE POLICY "Give public access to polysuara_attachments" ON storage.objects FOR SELECT USING (bucket_id = 'polysuara_attachments');
```

```sql
CREATE POLICY "Allow authenticated inserts to polysuara_attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'polysuara_attachments' AND auth.role() = 'authenticated');
```

---

## File 30: `28_keusahawanan_module.sql`

### Custom Types / Enums / Domains
```sql
CREATE TYPE keusahawanan_business_status AS ENUM ('PENDING_INTERVIEW', 'ACTIVE', 'REJECTED');
```

```sql
CREATE TYPE keusahawanan_membership_role AS ENUM ('OWNER', 'MEMBER');
```

```sql
CREATE TYPE keusahawanan_membership_status AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');
```

### Create / Alter Tables
```sql
ALTER TABLE public.keusahawanan_businesses ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.student_business_memberships ENABLE ROW LEVEL SECURITY;
```

### RLS Policies
```sql
ALTER TABLE public.keusahawanan_categories ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.keusahawanan_businesses ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.student_business_memberships ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Public Read Access for Keusahawanan Categories" ON public.keusahawanan_categories FOR SELECT USING (true);
```

```sql
CREATE POLICY "Admin All Access for Keusahawanan Categories" ON public.keusahawanan_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP'))
);
```

```sql
CREATE POLICY "Public read active businesses" ON public.keusahawanan_businesses FOR SELECT USING (
  status = 'ACTIVE' OR owner_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP'))
);
```

```sql
CREATE POLICY "Students can create business" ON public.keusahawanan_businesses FOR INSERT WITH CHECK (
  auth.uid() = owner_id
);
```

```sql
CREATE POLICY "Owners and Admins can update their business" ON public.keusahawanan_businesses FOR UPDATE USING (
  auth.uid() = owner_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP'))
);
```

```sql
CREATE POLICY "Users can see their own memberships or if they are admin" ON public.student_business_memberships FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')) OR
  -- Active business owners can also see memberships of their business
  EXISTS (SELECT 1 FROM keusahawanan_businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
);
```

```sql
CREATE POLICY "Students can request to join" ON public.student_business_memberships FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
```

```sql
CREATE POLICY "Owners and Admins can update memberships" ON public.student_business_memberships FOR UPDATE USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')) OR
  EXISTS (SELECT 1 FROM keusahawanan_businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
);
```

```sql
CREATE POLICY "Owners and Admins can delete memberships" ON public.student_business_memberships FOR DELETE USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')) OR
  EXISTS (SELECT 1 FROM keusahawanan_businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
);
```

---

## File 31: `28_polysuara_v5_features.sql`

### Create / Alter Tables
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_poll_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES public.polysuara_polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE IF NOT EXISTS public.polysuara_poll_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES public.polysuara_polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.polysuara_poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(option_id, user_id) -- User can vote for the same option only once
);
```

```sql
ALTER TABLE public.polysuara_poll_options ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polysuara_poll_votes ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE TABLE IF NOT EXISTS public.polysuara_chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES public.polysuara_chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
ALTER TABLE public.polysuara_chat_messages ENABLE ROW LEVEL SECURITY;
```

### RLS Policies
```sql
ALTER TABLE public.polysuara_polls ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polysuara_poll_options ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polysuara_poll_votes ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Allow public read polls" ON public.polysuara_polls FOR SELECT USING (true);
```

```sql
CREATE POLICY "Allow authenticated insert polls" ON public.polysuara_polls FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

```sql
CREATE POLICY "Allow public read poll options" ON public.polysuara_poll_options FOR SELECT USING (true);
```

```sql
CREATE POLICY "Allow authenticated insert poll options" ON public.polysuara_poll_options FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

```sql
CREATE POLICY "Allow public read poll votes" ON public.polysuara_poll_votes FOR SELECT USING (true);
```

```sql
CREATE POLICY "Allow authenticated insert poll votes" ON public.polysuara_poll_votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

```sql
CREATE POLICY "Allow authenticated delete own poll votes" ON public.polysuara_poll_votes FOR DELETE USING (auth.uid() = user_id);
```

```sql
ALTER TABLE public.polysuara_chats ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polysuara_chat_messages ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Allow users to read their own chats" ON public.polysuara_chats FOR SELECT USING (
    auth.uid() = student_id OR 
    auth.uid() = exco_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('JPP', 'SUPER_ADMIN_JPP'))
);
```

```sql
CREATE POLICY "Allow excos to insert chats" ON public.polysuara_chats FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('JPP', 'SUPER_ADMIN_JPP'))
);
```

```sql
CREATE POLICY "Allow excos to update chats" ON public.polysuara_chats FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('JPP', 'SUPER_ADMIN_JPP'))
);
```

```sql
CREATE POLICY "Allow users to read messages in their chats" ON public.polysuara_chat_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.polysuara_chats c WHERE c.id = chat_id AND (c.student_id = auth.uid() OR c.exco_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('JPP', 'SUPER_ADMIN_JPP'))))
);
```

```sql
CREATE POLICY "Allow users to insert messages in open chats" ON public.polysuara_chat_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.polysuara_chats c WHERE c.id = chat_id AND c.status = 'OPEN' AND (c.student_id = auth.uid() OR c.exco_id = auth.uid()))
);
```

---

## File 32: `29_keusahawanan_products_bucket.sql`

### Storage Buckets
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'keusahawanan-products',
  'keusahawanan-products',
  true, -- PUBLIC for logos and product images
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
```

### RLS Policies
```sql
CREATE POLICY "Public boleh lihat gambar produk dan logo"
ON storage.objects FOR SELECT
USING (bucket_id = 'keusahawanan-products');
```

```sql
CREATE POLICY "Authenticated users boleh muat naik gambar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'keusahawanan-products');
```

```sql
CREATE POLICY "Authenticated users boleh kemaskini gambar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'keusahawanan-products');
```

```sql
CREATE POLICY "Authenticated users boleh padam gambar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'keusahawanan-products');
```

---

## File 33: `29_polysuara_auto_archive.sql`

---

## File 34: `30_business_shifts_system.sql`

### Create / Alter Tables
```sql
ALTER TABLE keusahawanan_businesses 
  ADD COLUMN IF NOT EXISTS is_shift_enabled BOOLEAN DEFAULT false;
```

```sql
CREATE TABLE business_shifts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id  uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  shift_date   date NOT NULL,
  shift_hour   int  NOT NULL CHECK (shift_hour BETWEEN 8 AND 16),
  assigned_to  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES profiles(id),
  notes        text,
  status       text DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','PRESENT','ABSENT','SWAPPED')),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(business_id, shift_date, shift_hour)
);
```

```sql
CREATE TABLE business_shift_swaps (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  shift_id      uuid REFERENCES business_shifts(id) ON DELETE CASCADE,
  requested_by  uuid REFERENCES profiles(id),
  swap_with     uuid REFERENCES profiles(id),
  reason        text NOT NULL,
  status        text DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  responded_by  uuid REFERENCES profiles(id),
  responded_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);
```

```sql
CREATE TABLE business_sessions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  session_date    date NOT NULL,
  opened_by       uuid REFERENCES profiles(id),
  closed_by       uuid REFERENCES profiles(id),
  opening_cash    numeric(10,2) NOT NULL DEFAULT 0,
  closing_cash    numeric(10,2),
  total_sales     numeric(10,2),
  total_expenses  numeric(10,2) DEFAULT 0,
  net_profit      numeric(10,2) GENERATED ALWAYS AS (
                    closing_cash - opening_cash - total_expenses
                  ) STORED,
  opening_time    timestamptz,
  closing_time    timestamptz,
  opening_notes   text,
  closing_notes   text,
  status          text DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(business_id, session_date)
);
```

```sql
ALTER TABLE business_shifts ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE business_shift_swaps ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE business_sessions ENABLE ROW LEVEL SECURITY;
```

### RLS Policies
```sql
ALTER TABLE keusahawanan_businesses 
  ADD COLUMN IF NOT EXISTS is_shift_enabled BOOLEAN DEFAULT false;

DROP TABLE IF EXISTS gerai_shift_swaps CASCADE;
DROP TABLE IF EXISTS gerai_shifts CASCADE;
DROP TABLE IF EXISTS gerai_sessions CASCADE;

CREATE TABLE business_shifts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id  uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  shift_date   date NOT NULL,
  shift_hour   int  NOT NULL CHECK (shift_hour BETWEEN 8 AND 16),
  assigned_to  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES profiles(id),
  notes        text,
  status       text DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','PRESENT','ABSENT','SWAPPED')),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(business_id, shift_date, shift_hour)
);

CREATE TABLE business_shift_swaps (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  shift_id      uuid REFERENCES business_shifts(id) ON DELETE CASCADE,
  requested_by  uuid REFERENCES profiles(id),
  swap_with     uuid REFERENCES profiles(id),
  reason        text NOT NULL,
  status        text DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  responded_by  uuid REFERENCES profiles(id),
  responded_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE business_sessions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  session_date    date NOT NULL,
  opened_by       uuid REFERENCES profiles(id),
  closed_by       uuid REFERENCES profiles(id),
  opening_cash    numeric(10,2) NOT NULL DEFAULT 0,
  closing_cash    numeric(10,2),
  total_sales     numeric(10,2),
  total_expenses  numeric(10,2) DEFAULT 0,
  net_profit      numeric(10,2) GENERATED ALWAYS AS (
                    closing_cash - opening_cash - total_expenses
                  ) STORED,
  opening_time    timestamptz,
  closing_time    timestamptz,
  opening_notes   text,
  closing_notes   text,
  status          text DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(business_id, session_date)
);

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

ALTER TABLE business_shifts ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE business_shift_swaps ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE business_sessions ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "business_shifts_access" ON business_shifts FOR ALL USING (has_business_shift_access(business_id));
```

```sql
CREATE POLICY "business_shift_swaps_access" ON business_shift_swaps FOR ALL USING (has_business_shift_access(business_id));
```

```sql
CREATE POLICY "business_sessions_access" ON business_sessions FOR ALL USING (has_business_shift_access(business_id));
```

---

## File 35: `30_polysuara_downvote.sql`

### RLS Policies
```sql
DROP POLICY IF EXISTS "polysuara_confessions_select" ON public.polysuara_confessions;
```

```sql
ALTER TABLE public.polysuara_confessions
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_hidden_by_community BOOLEAN DEFAULT false;

-- 2. Create the downvotes tracking table
CREATE TABLE IF NOT EXISTS public.polysuara_downvotes (
    confession_id UUID NOT NULL REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (confession_id, user_id)
);

-- Index for querying user's downvotes (per §15.4: every FK needs an index)
CREATE INDEX IF NOT EXISTS idx_polysuara_downvotes_user ON public.polysuara_downvotes(user_id);
CREATE INDEX IF NOT EXISTS idx_polysuara_downvotes_confession ON public.polysuara_downvotes(confession_id);

-- 3. RLS for Downvotes table (per §15.1: use (SELECT auth.uid()))
ALTER TABLE public.polysuara_downvotes ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "polysuara_downvotes_select" ON public.polysuara_downvotes FOR SELECT
  USING (true);
```

```sql
CREATE POLICY "polysuara_downvotes_insert" ON public.polysuara_downvotes FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

```sql
CREATE POLICY "polysuara_downvotes_delete" ON public.polysuara_downvotes FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
    OR is_jpp_admin((SELECT auth.uid()))
  );
```

```sql
CREATE POLICY "polysuara_confessions_select" ON public.polysuara_confessions FOR SELECT
  USING (
    (is_approved = true AND is_hidden_by_community = false)
    OR is_jpp_admin((SELECT auth.uid()))
  );
```

---

## File 36: `31_add_staff_details.sql`

---

## File 37: `32_create_polyrent_bucket.sql`

### Storage Buckets
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('polyrent', 'polyrent', true)
ON CONFLICT (id) DO NOTHING;
```

### RLS Policies
```sql
CREATE POLICY "Public Access Polyrent"
ON storage.objects FOR SELECT
USING ( bucket_id = 'polyrent' );
```

```sql
CREATE POLICY "Authenticated users can upload to polyrent"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'polyrent' );
```

```sql
CREATE POLICY "Users can update their own polyrent images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'polyrent' AND auth.uid() = owner );
```

```sql
CREATE POLICY "Users can delete their own polyrent images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'polyrent' AND auth.uid() = owner );
```

---

## File 38: `32_system_announcements.sql`

### RLS Policies
```sql
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Active system_announcements are viewable by everyone."
    ON public.system_announcements FOR SELECT
    USING (is_active = true);
```

```sql
CREATE POLICY "JPP and Super Admin can view all system announcements."
    ON public.system_announcements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );
```

```sql
CREATE POLICY "JPP and Super Admin can manage system announcements"
    ON public.system_announcements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );
```

```sql
ALTER TABLE public.user_announcement_responses ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Users can view own announcement responses"
    ON public.user_announcement_responses FOR SELECT
    USING (auth.uid() = user_id);
```

```sql
CREATE POLICY "Users can insert own announcement responses"
    ON public.user_announcement_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

```sql
CREATE POLICY "JPP and Super Admin can view all announcement responses"
    ON public.user_announcement_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );
```

---

## File 39: `33_announcement_poster.sql`

### Storage Buckets
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcements',
  'announcements',
  true, -- PUBLIC access for images
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
```

### RLS Policies
```sql
CREATE POLICY "Public can view announcement images"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcements');
```

```sql
CREATE POLICY "JPP can insert announcement images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);
```

```sql
CREATE POLICY "JPP can update announcement images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);
```

```sql
CREATE POLICY "JPP can delete announcement images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);
```

---

## File 40: `33_transfer_business_ownership.sql`

---

## File 41: `34_staff_registration_code.sql`

---

## File 42: `35_security_jpp_profile_rpc.sql`

---

## File 43: `36_supsas_schema.sql`

### Storage Buckets
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('supsas-assets', 'supsas-assets', TRUE)
ON CONFLICT (id) DO NOTHING;
```

### Create / Alter Tables
```sql
ALTER TABLE supsas_kontingen   ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE supsas_sports      ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE supsas_participants ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE supsas_fixtures    ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE supsas_results     ENABLE ROW LEVEL SECURITY;
```

### Functions & Triggers
```sql
CREATE TRIGGER supsas_editions_updated_at    BEFORE UPDATE ON supsas_editions    FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
```

```sql
CREATE TRIGGER supsas_kontingen_updated_at   BEFORE UPDATE ON supsas_kontingen   FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
```

```sql
CREATE TRIGGER supsas_sports_updated_at      BEFORE UPDATE ON supsas_sports      FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
```

```sql
CREATE TRIGGER supsas_fixtures_updated_at    BEFORE UPDATE ON supsas_fixtures    FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
```

### RLS Policies
```sql
ALTER TABLE supsas_editions    ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE supsas_kontingen   ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE supsas_sports      ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE supsas_participants ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE supsas_fixtures    ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE supsas_results     ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "supsas_editions_public_read"  ON supsas_editions FOR SELECT USING (TRUE);
```

```sql
CREATE POLICY "supsas_editions_admin_write"  ON supsas_editions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP'));
```

```sql
CREATE POLICY "supsas_kontingen_public_read" ON supsas_kontingen FOR SELECT USING (TRUE);
```

```sql
CREATE POLICY "supsas_kontingen_admin_write" ON supsas_kontingen FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP'));
```

```sql
CREATE POLICY "supsas_kontingen_leader_update" ON supsas_kontingen FOR UPDATE
  USING (leader_id = auth.uid())
  WITH CHECK (leader_id = auth.uid());
```

```sql
CREATE POLICY "supsas_sports_public_read"  ON supsas_sports FOR SELECT USING (TRUE);
```

```sql
CREATE POLICY "supsas_sports_jpp_write"    ON supsas_sports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

```sql
CREATE POLICY "supsas_participants_public_read" ON supsas_participants FOR SELECT USING (TRUE);
```

```sql
CREATE POLICY "supsas_participants_leader_write" ON supsas_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = auth.uid()));
```

```sql
CREATE POLICY "supsas_participants_admin_write" ON supsas_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

```sql
CREATE POLICY "supsas_fixtures_public_read" ON supsas_fixtures FOR SELECT USING (TRUE);
```

```sql
CREATE POLICY "supsas_fixtures_jpp_write"   ON supsas_fixtures FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

```sql
CREATE POLICY "supsas_results_public_read" ON supsas_results FOR SELECT USING (TRUE);
```

```sql
CREATE POLICY "supsas_results_jpp_write"   ON supsas_results FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

```sql
CREATE POLICY "supsas_assets_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'supsas-assets');
```

```sql
CREATE POLICY "supsas_assets_admin_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'supsas-assets' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ));
```

```sql
CREATE POLICY "supsas_assets_admin_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'supsas-assets' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ));
```

---

## File 44: `37_polymart_pos_sync.sql`

---

## File 45: `38_karnival_v2.sql`

### Storage Buckets
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('karnival-booths', 'karnival-booths', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;
```

### Create / Alter Tables
```sql
ALTER TABLE karnival_editions ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE karnival_categories ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE karnival_booths ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE karnival_votes_v2 REPLICA IDENTITY FULL;
```

```sql
ALTER TABLE karnival_votes_v2 ENABLE ROW LEVEL SECURITY;
```

### RLS Policies
```sql
ALTER TABLE karnival_editions ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "karnival_editions_read_all" ON karnival_editions FOR SELECT USING (true);
```

```sql
CREATE POLICY "karnival_editions_write_kpp" ON karnival_editions FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

```sql
ALTER TABLE karnival_categories ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "karnival_categories_read_all" ON karnival_categories FOR SELECT USING (true);
```

```sql
CREATE POLICY "karnival_categories_write_kpp" ON karnival_categories FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

```sql
ALTER TABLE karnival_booths ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "karnival_booths_read_all" ON karnival_booths FOR SELECT USING (true);
```

```sql
CREATE POLICY "karnival_booths_write_kpp" ON karnival_booths FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

```sql
ALTER TABLE karnival_votes_v2 REPLICA IDENTITY FULL;
ALTER TABLE karnival_votes_v2 ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "karnival_votes_v2_read_all" ON karnival_votes_v2 FOR SELECT USING (true);
```

```sql
CREATE POLICY "karnival_votes_v2_insert_self" ON karnival_votes_v2 FOR INSERT
  WITH CHECK (auth.uid() = voter_id AND EXISTS (SELECT 1 FROM karnival_editions WHERE id = edition_id AND voting_enabled = true));
```

```sql
CREATE POLICY "karnival_votes_v2_delete_own" ON karnival_votes_v2 FOR DELETE USING (auth.uid() = voter_id);
```

```sql
CREATE POLICY "karnival_votes_v2_admin_all" ON karnival_votes_v2 FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

```sql
CREATE POLICY "karnival_booths_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'karnival-booths');
```

```sql
CREATE POLICY "karnival_booths_kpp_upload"  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'karnival-booths' AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

```sql
CREATE POLICY "karnival_booths_kpp_delete"  ON storage.objects FOR DELETE
  USING (bucket_id = 'karnival-booths' AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

---

## File 46: `39_track_google_api_tokens.sql`

---

## File 47: `40_program_attendance_system.sql`

### Create / Alter Tables
```sql
ALTER TABLE merit_review_log ENABLE ROW LEVEL SECURITY;
```

### Functions & Triggers
```sql
CREATE TRIGGER trg_auto_credit_kelab_merit
  BEFORE INSERT OR UPDATE OF status
  ON program_attendees
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_credit_kelab_merit();
```

### RLS Policies
```sql
ALTER TABLE programs
      ADD COLUMN qr_token         UUID DEFAULT gen_random_uuid(),
      ADD COLUMN qr_enabled       BOOLEAN DEFAULT false,
      ADD COLUMN qr_open_at       TIMESTAMPTZ,
      ADD COLUMN qr_close_at      TIMESTAMPTZ,
      ADD COLUMN pre_reg_enabled  BOOLEAN DEFAULT false,
      ADD COLUMN merit_kelab      INT DEFAULT 0,
      ADD COLUMN merit_eakademik  INT DEFAULT 0;

    -- Pastikan token unik
    ALTER TABLE programs ADD CONSTRAINT programs_qr_token_unique UNIQUE (qr_token);

    RAISE NOTICE 'Kolum QR & Merit ditambah ke jadual programs.';
  ELSE
    RAISE NOTICE 'Kolum QR sudah ada dalam programs, skip.';
  END IF;
END $$;

-- ─── BAHAGIAN 2: Kolum QR & Merit untuk club_activities (Aktiviti Kelab) ─────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='club_activities' AND column_name='qr_token') THEN
    ALTER TABLE club_activities
      ADD COLUMN qr_token         UUID DEFAULT gen_random_uuid(),
      ADD COLUMN qr_enabled       BOOLEAN DEFAULT false,
      ADD COLUMN qr_open_at       TIMESTAMPTZ,
      ADD COLUMN qr_close_at      TIMESTAMPTZ,
      ADD COLUMN pre_reg_enabled  BOOLEAN DEFAULT false,
      ADD COLUMN merit_kelab      INT DEFAULT 0;
    -- Nota: club_activities TIDAK ada merit_eakademik
    -- Merit Rasmi untuk aktiviti kelab melalui merit_program_applications

    ALTER TABLE club_activities ADD CONSTRAINT club_activities_qr_token_unique UNIQUE (qr_token);

    RAISE NOTICE 'Kolum QR & Merit ditambah ke jadual club_activities.';
  ELSE
    RAISE NOTICE 'Kolum QR sudah ada dalam club_activities, skip.';
  END IF;
END $$;

-- ─── BAHAGIAN 3: Jadual program_attendees ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS program_attendees (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id       UUID        NOT NULL,
  program_type     TEXT        NOT NULL CHECK (program_type IN ('takwim', 'aktiviti')),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status           TEXT        NOT NULL DEFAULT 'pre_registered'
                               CHECK (status IN ('pre_registered','attended','absent','walk_in')),
  registered_at    TIMESTAMPTZ DEFAULT NOW(),
  checked_in_at    TIMESTAMPTZ,
  check_in_method  TEXT        CHECK (check_in_method IN ('qr','manual')),
  merit_kelab_credited  BOOLEAN DEFAULT false,
  merit_rasmi_credited  BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW(),

  -- Cegah scan berganda: 1 user hanya boleh hadir 1 kali per program
  CONSTRAINT unique_program_attendee UNIQUE (program_id, program_type, user_id)
);

-- Indexes untuk prestasi query
CREATE INDEX IF NOT EXISTS idx_pa_program      ON program_attendees(program_id, program_type);
CREATE INDEX IF NOT EXISTS idx_pa_user         ON program_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_pa_status       ON program_attendees(status);
CREATE INDEX IF NOT EXISTS idx_pa_checked_in   ON program_attendees(checked_in_at) WHERE checked_in_at IS NOT NULL;

-- ─── BAHAGIAN 4: RLS untuk program_attendees ─────────────────────────────────

ALTER TABLE program_attendees ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Read all attendees" ON program_attendees
      FOR SELECT USING ((select auth.uid()) IS NOT NULL);
```

```sql
CREATE POLICY "Self register attendee" ON program_attendees
      FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
```

```sql
CREATE POLICY "Manager update attendees" ON program_attendees
      FOR UPDATE USING (
        (select auth.uid()) IN (
          SELECT id FROM profiles
          WHERE role IN ('CLUB_PRESIDENT','CLUB_MT','SUPER_ADMIN_JPP','JPP')
        )
      );
```

```sql
ALTER TABLE merit_program_applications ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE merit_review_log ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Read merit applications" ON merit_program_applications
      FOR SELECT USING ((select auth.uid()) IS NOT NULL);
```

```sql
CREATE POLICY "Club leaders apply merit" ON merit_program_applications
      FOR INSERT WITH CHECK (
        (select auth.uid()) IN (
          SELECT id FROM profiles
          WHERE role IN ('CLUB_PRESIDENT','CLUB_MT','SUPER_ADMIN_JPP','JPP')
        )
      );
```

```sql
CREATE POLICY "JPP update merit applications" ON merit_program_applications
      FOR UPDATE USING (
        (select auth.uid()) IN (
          SELECT id FROM profiles WHERE role IN ('JPP','SUPER_ADMIN_JPP')
        )
      );
```

```sql
CREATE POLICY "Read review log" ON merit_review_log
      FOR SELECT USING ((select auth.uid()) IS NOT NULL);
```

```sql
CREATE POLICY "JPP insert review log" ON merit_review_log
      FOR INSERT WITH CHECK (
        (select auth.uid()) IN (
          SELECT id FROM profiles WHERE role IN ('JPP','SUPER_ADMIN_JPP')
        )
      );
```

---

## File 48: `41_klk_public_stats_rpc.sql`

---

## File 49: `42_check_email_registered.sql`

---

## File 50: `43_get_auth_providers.sql`

---

## File 51: `44_polymart_shopping_cart.sql`

### RLS Policies
```sql
ALTER TABLE public.polymart_cart_items ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Users can manage their own cart items" ON public.polymart_cart_items
    FOR ALL
    USING (buyer_id = (SELECT auth.uid()))
    WITH CHECK (buyer_id = (SELECT auth.uid()));
```

---

## File 52: `45_takwim_pusat.sql`

### RLS Policies
```sql
ALTER TABLE takwim_pusat ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "takwim_pusat_select" ON takwim_pusat
  FOR SELECT TO authenticated USING (true);
```

```sql
CREATE POLICY "takwim_pusat_insert" ON takwim_pusat
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
```

```sql
CREATE POLICY "takwim_pusat_update" ON takwim_pusat
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);
```

```sql
CREATE POLICY "takwim_pusat_delete" ON takwim_pusat
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);
```

---

## File 53: `46_reset_jpp_cohort.sql`

---

## File 54: `46_takwim_kelab_kediaman.sql`

### Create / Alter Tables
```sql
ALTER TABLE takwim_pusat ADD CONSTRAINT takwim_pusat_jenis_check
  CHECK (jenis IN (
    'AKADEMIK', 'JPP', 'KPP', 'KEUSAHAWANAN', 'KEBAJIKAN', 'SRK',
    'AKADEMIK_EXCO', 'MULTIMEDIA', 'KLS', 'KOLAB', 'KK', 'CUTI_UMUM', 'LAIN',
    'KELAB_KEDIAMAN'
  ));
```

---

## File 55: `47_optimize_new_modules_rls.sql`

### RLS Policies
```sql
DROP POLICY IF EXISTS "karnival_editions_write_kpp" ON karnival_editions;
```

```sql
DROP POLICY IF EXISTS "karnival_categories_write_kpp" ON karnival_categories;
```

```sql
DROP POLICY IF EXISTS "karnival_booths_write_kpp" ON karnival_booths;
```

```sql
DROP POLICY IF EXISTS "karnival_votes_v2_insert_self" ON karnival_votes_v2;
```

```sql
DROP POLICY IF EXISTS "karnival_votes_v2_delete_own" ON karnival_votes_v2;
```

```sql
DROP POLICY IF EXISTS "karnival_votes_v2_admin_all" ON karnival_votes_v2;
```

```sql
DROP POLICY IF EXISTS "karnival_booths_kpp_upload"  ON storage.objects;
```

```sql
DROP POLICY IF EXISTS "karnival_booths_kpp_delete"  ON storage.objects;
```

```sql
DROP POLICY IF EXISTS "supsas_editions_admin_write"  ON supsas_editions;
```

```sql
DROP POLICY IF EXISTS "supsas_kontingen_admin_write" ON supsas_kontingen;
```

```sql
DROP POLICY IF EXISTS "supsas_kontingen_leader_update" ON supsas_kontingen;
```

```sql
DROP POLICY IF EXISTS "supsas_sports_jpp_write"    ON supsas_sports;
```

```sql
DROP POLICY IF EXISTS "supsas_participants_leader_write" ON supsas_participants;
```

```sql
DROP POLICY IF EXISTS "supsas_participants_admin_write" ON supsas_participants;
```

```sql
DROP POLICY IF EXISTS "supsas_fixtures_jpp_write"   ON supsas_fixtures;
```

```sql
DROP POLICY IF EXISTS "supsas_results_jpp_write"   ON supsas_results;
```

```sql
DROP POLICY IF EXISTS "supsas_assets_admin_upload" ON storage.objects;
```

```sql
DROP POLICY IF EXISTS "supsas_assets_admin_delete" ON storage.objects;
```

```sql
DROP POLICY IF EXISTS "JPP and Super Admin can view all system announcements." ON public.system_announcements;
```

```sql
DROP POLICY IF EXISTS "JPP and Super Admin can manage system announcements" ON public.system_announcements;
```

```sql
DROP POLICY IF EXISTS "Users can view own announcement responses" ON public.user_announcement_responses;
```

```sql
DROP POLICY IF EXISTS "Users can insert own announcement responses" ON public.user_announcement_responses;
```

```sql
DROP POLICY IF EXISTS "JPP and Super Admin can view all announcement responses" ON public.user_announcement_responses;
```

```sql
DROP POLICY IF EXISTS "JPP can insert announcement images" ON storage.objects;
```

```sql
DROP POLICY IF EXISTS "JPP can update announcement images" ON storage.objects;
```

```sql
DROP POLICY IF EXISTS "JPP can delete announcement images" ON storage.objects;
```

```sql
CREATE POLICY "karnival_editions_write_kpp" ON karnival_editions FOR ALL
  USING ((select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

```sql
CREATE POLICY "karnival_categories_write_kpp" ON karnival_categories FOR ALL
  USING ((select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

```sql
CREATE POLICY "karnival_booths_write_kpp" ON karnival_booths FOR ALL
  USING ((select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

```sql
CREATE POLICY "karnival_votes_v2_insert_self" ON karnival_votes_v2 FOR INSERT
  WITH CHECK ((select auth.uid()) = voter_id AND EXISTS (SELECT 1 FROM karnival_editions WHERE id = edition_id AND voting_enabled = true));
```

```sql
CREATE POLICY "karnival_votes_v2_delete_own" ON karnival_votes_v2 FOR DELETE USING ((select auth.uid()) = voter_id);
```

```sql
CREATE POLICY "karnival_votes_v2_admin_all" ON karnival_votes_v2 FOR ALL
  USING ((select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

```sql
CREATE POLICY "karnival_booths_kpp_upload"  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'karnival-booths' AND (select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

```sql
CREATE POLICY "karnival_booths_kpp_delete"  ON storage.objects FOR DELETE
  USING (bucket_id = 'karnival-booths' AND (select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

```sql
CREATE POLICY "supsas_editions_admin_write"  ON supsas_editions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP'));
```

```sql
CREATE POLICY "supsas_kontingen_admin_write" ON supsas_kontingen FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP'));
```

```sql
CREATE POLICY "supsas_kontingen_leader_update" ON supsas_kontingen FOR UPDATE
  USING (leader_id = (select auth.uid()))
  WITH CHECK (leader_id = (select auth.uid()));
```

```sql
CREATE POLICY "supsas_sports_jpp_write"    ON supsas_sports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

```sql
CREATE POLICY "supsas_participants_leader_write" ON supsas_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = (select auth.uid())));
```

```sql
CREATE POLICY "supsas_participants_admin_write" ON supsas_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

```sql
CREATE POLICY "supsas_fixtures_jpp_write"   ON supsas_fixtures FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

```sql
CREATE POLICY "supsas_results_jpp_write"   ON supsas_results FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

```sql
CREATE POLICY "supsas_assets_admin_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'supsas-assets' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ));
```

```sql
CREATE POLICY "supsas_assets_admin_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'supsas-assets' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ));
```

```sql
CREATE POLICY "JPP and Super Admin can view all system announcements."
    ON public.system_announcements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );
```

```sql
CREATE POLICY "JPP and Super Admin can manage system announcements"
    ON public.system_announcements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );
```

```sql
CREATE POLICY "Users can view own announcement responses"
    ON public.user_announcement_responses FOR SELECT
    USING ((select auth.uid()) = user_id);
```

```sql
CREATE POLICY "Users can insert own announcement responses"
    ON public.user_announcement_responses FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);
```

```sql
CREATE POLICY "JPP and Super Admin can view all announcement responses"
    ON public.user_announcement_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );
```

```sql
CREATE POLICY "JPP can insert announcement images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = (select auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);
```

```sql
CREATE POLICY "JPP can update announcement images" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = (select auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);
```

```sql
CREATE POLICY "JPP can delete announcement images" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = (select auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);
```

---

## File 56: `48_polyrider_schema.sql`

### Create / Alter Tables
```sql
ALTER TABLE public.polyrider_zones ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polyrider_jobs ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polyrider_chats ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polyrider_sos_logs ENABLE ROW LEVEL SECURITY;
```

### RLS Policies
```sql
ALTER TABLE public.polyrider_profiles ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polyrider_zones ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polyrider_jobs ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polyrider_chats ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polyrider_sos_logs ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Public can view active riders" ON public.polyrider_profiles
    FOR SELECT USING (is_active = true);
```

```sql
CREATE POLICY "Riders can manage own profile" ON public.polyrider_profiles
    FOR ALL USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
```

```sql
CREATE POLICY "Admin can manage all rider profiles" ON public.polyrider_profiles
    FOR ALL USING (public.is_klk_or_admin((SELECT auth.uid())));
```

```sql
CREATE POLICY "Anyone can read zones" ON public.polyrider_zones
    FOR SELECT USING (true);
```

```sql
CREATE POLICY "Admin can manage zones" ON public.polyrider_zones
    FOR ALL USING (public.is_klk_or_admin((SELECT auth.uid())));
```

```sql
CREATE POLICY "Students can manage own jobs" ON public.polyrider_jobs
    FOR ALL USING (student_id = (SELECT auth.uid())) WITH CHECK (student_id = (SELECT auth.uid()));
```

```sql
CREATE POLICY "Riders can view pending and own jobs" ON public.polyrider_jobs
    FOR SELECT USING (
        status = 'PENDING' OR rider_id = (SELECT auth.uid())
    );
```

```sql
CREATE POLICY "Riders can update own assigned jobs" ON public.polyrider_jobs
    FOR UPDATE USING (
        status = 'PENDING' OR rider_id = (SELECT auth.uid())
    );
```

```sql
CREATE POLICY "Admin can view all jobs" ON public.polyrider_jobs
    FOR SELECT USING (public.is_klk_or_admin((SELECT auth.uid())));
```

```sql
CREATE POLICY "Involved users can manage chats" ON public.polyrider_chats
    FOR ALL USING (
        sender_id = (SELECT auth.uid()) OR
        job_id IN (
            SELECT id FROM public.polyrider_jobs WHERE student_id = (SELECT auth.uid()) OR rider_id = (SELECT auth.uid())
        )
    ) WITH CHECK (
        sender_id = (SELECT auth.uid())
    );
```

```sql
CREATE POLICY "Users can create SOS logs" ON public.polyrider_sos_logs
    FOR INSERT WITH CHECK (triggered_by = (SELECT auth.uid()));
```

```sql
CREATE POLICY "Users can view own SOS logs" ON public.polyrider_sos_logs
    FOR SELECT USING (triggered_by = (SELECT auth.uid()));
```

```sql
CREATE POLICY "Admin can manage all SOS logs" ON public.polyrider_sos_logs
    FOR ALL USING (public.is_klk_or_admin((SELECT auth.uid())));
```

---

## File 57: `49_polyrider_bids.sql`

### RLS Policies
```sql
ALTER TABLE public.polyrider_bids ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Public can view bids" 
    ON public.polyrider_bids FOR SELECT 
    USING (true);
```

```sql
CREATE POLICY "Riders can insert bids" 
    ON public.polyrider_bids FOR INSERT 
    WITH CHECK (rider_id = auth.uid());
```

```sql
CREATE POLICY "Admin can manage all bids"
    ON public.polyrider_bids FOR ALL
    USING (public.is_klk_or_admin(auth.uid()));
```

```sql
CREATE POLICY "Students can update bids for their jobs"
    ON public.polyrider_bids FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.polyrider_jobs
            WHERE polyrider_jobs.id = polyrider_bids.job_id
            AND polyrider_jobs.student_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.polyrider_jobs
            WHERE polyrider_jobs.id = polyrider_bids.job_id
            AND polyrider_jobs.student_id = auth.uid()
        )
    );
```

---

## File 58: `50_polyrider_security_patch.sql`

---

## File 59: `51_polymart_polyrider_integration.sql`

---

## File 60: `51_polyrider_cancel_sos_appeals.sql`

### Create / Alter Tables
```sql
ALTER TABLE public.polyrider_jobs ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);
```

```sql
ALTER TABLE public.polyrider_sos_logs ADD COLUMN IF NOT EXISTS false_alarm_notes TEXT;
```

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS polyrider_suspended_until TIMESTAMP WITH TIME ZONE;
```

### RLS Policies
```sql
ALTER TABLE public.polyrider_jobs ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.polyrider_jobs ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- 2. Alter polyrider_sos_logs to add false alarm investigation fields
ALTER TABLE public.polyrider_sos_logs ADD COLUMN IF NOT EXISTS false_alarm BOOLEAN DEFAULT false;
ALTER TABLE public.polyrider_sos_logs ADD COLUMN IF NOT EXISTS false_alarm_notes TEXT;

-- 3. Alter profiles to track penalty state (this applies to both students and riders)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS polyrider_penalty_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS polyrider_suspended_until TIMESTAMP WITH TIME ZONE;

-- 4. Create polyrider_appeals table
CREATE TABLE IF NOT EXISTS public.polyrider_appeals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for polyrider_appeals
ALTER TABLE public.polyrider_appeals ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Users can view own appeals" ON public.polyrider_appeals
    FOR SELECT USING (user_id = (SELECT auth.uid()));
```

```sql
CREATE POLICY "Users can create appeals" ON public.polyrider_appeals
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
```

```sql
CREATE POLICY "Admins can view appeals" ON public.polyrider_appeals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = (SELECT auth.uid()) 
            AND (p.role IN ('SUPER_ADMIN_JPP', 'MT_OVERSEES', 'STAFF') OR (p.role = 'JPP' AND p.jpp_unit IN ('KLS', 'KEBAJIKAN')))
        )
    );
```

```sql
CREATE POLICY "Admins can manage appeals" ON public.polyrider_appeals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = (SELECT auth.uid()) 
            AND (p.role IN ('SUPER_ADMIN_JPP', 'MT_OVERSEES', 'STAFF') OR (p.role = 'JPP' AND p.jpp_unit = 'KLS'))
        )
    );
```

---

## File 61: `52_polymart_online_payment.sql`

### Storage Buckets
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('polymart-receipts', 'polymart-receipts', true)
ON CONFLICT (id) DO NOTHING;
```

### RLS Policies
```sql
CREATE POLICY "polymart_receipts_insert_authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'polymart-receipts');
```

```sql
CREATE POLICY "polymart_receipts_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'polymart-receipts');
```

---

## File 62: `52_polyrider_infrastructure_audit_fixes.sql`

### RLS Policies
```sql
DROP POLICY IF EXISTS "Riders can insert bids" ON polyrider_bids;
```

```sql
DROP POLICY IF EXISTS "Admin can manage all bids" ON polyrider_bids;
```

```sql
DROP POLICY IF EXISTS "Students can update bids for their jobs" ON polyrider_bids;
```

```sql
DROP POLICY IF EXISTS "presets_read" ON polyrider_location_presets;
```

```sql
DROP POLICY IF EXISTS "presets_admin_delete" ON polyrider_location_presets;
```

```sql
DROP POLICY IF EXISTS "presets_admin_insert" ON polyrider_location_presets;
```

```sql
DROP POLICY IF EXISTS "presets_admin_update" ON polyrider_location_presets;
```

```sql
CREATE POLICY "Riders can insert bids" ON polyrider_bids
  FOR INSERT WITH CHECK (rider_id = (SELECT auth.uid()));
```

```sql
CREATE POLICY "Admin can manage all bids" ON polyrider_bids
  FOR ALL USING (is_klk_or_admin((SELECT auth.uid())));
```

```sql
CREATE POLICY "Students can update bids for their jobs" ON polyrider_bids
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM polyrider_jobs
    WHERE polyrider_jobs.id = polyrider_bids.job_id
      AND polyrider_jobs.student_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM polyrider_jobs
    WHERE polyrider_jobs.id = polyrider_bids.job_id
      AND polyrider_jobs.student_id = (SELECT auth.uid())
  ));
```

---

## File 63: `52_polyrider_job_expiry.sql`

### Functions & Triggers
```sql
CREATE TRIGGER trg_polyrider_job_expiry
  BEFORE INSERT ON public.polyrider_jobs
  FOR EACH ROW EXECUTE FUNCTION set_polyrider_job_expiry();
```

---

## File 64: `53_polyrider_rider_location.sql`

---

## File 65: `54_polyrider_saved_locations.sql`

### Functions & Triggers
```sql
CREATE TRIGGER trg_saved_locations_limit
  BEFORE INSERT ON public.polyrider_saved_locations
  FOR EACH ROW EXECUTE FUNCTION check_saved_locations_limit();
```

### RLS Policies
```sql
ALTER TABLE public.polyrider_saved_locations ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "saved_locations_owner_crud" ON public.polyrider_saved_locations
  FOR ALL
  USING  (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

---

## File 66: `54_polytask_disputes_and_rating.sql`

### Custom Types / Enums / Domains
```sql
ALTER TYPE polytask_job_status ADD VALUE IF NOT EXISTS 'DISPUTED';
```

### RLS Policies
```sql
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.polytask_reviews;
```

```sql
DROP POLICY IF EXISTS "Users can insert reviews" ON public.polytask_reviews;
```

```sql
ALTER TABLE public.polytask_disputes ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Users can view their own disputes"
    ON public.polytask_disputes FOR SELECT
    USING (auth.uid() = reporter_id);
```

```sql
CREATE POLICY "JPP admins can view all disputes"
    ON public.polytask_disputes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')
        )
    );
```

```sql
CREATE POLICY "Users can create disputes"
    ON public.polytask_disputes FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);
```

```sql
CREATE POLICY "JPP admins can update disputes"
    ON public.polytask_disputes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')
        )
    );
```

```sql
CREATE POLICY "Anyone can view reviews"
    ON public.polytask_reviews FOR SELECT
    USING (true);
```

```sql
CREATE POLICY "Users can insert reviews"
    ON public.polytask_reviews FOR INSERT
    WITH CHECK (auth.uid() = reviewer_id);
```

---

## File 67: `55_imaps_schema.sql`

### Create / Alter Tables
```sql
CREATE TABLE IF NOT EXISTS public.imaps_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES public.imaps_buildings(id) ON DELETE CASCADE,
    room_code TEXT NOT NULL,
    floor_level INTEGER,
    direction_text TEXT,
    search_tags TEXT, -- e.g., "Makmal, Lab, Komputer, JTM" for better searching
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

```sql
ALTER TABLE public.imaps_locations ENABLE ROW LEVEL SECURITY;
```

### RLS Policies
```sql
ALTER TABLE public.imaps_buildings ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.imaps_locations ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Allow public read access on imaps_buildings" 
ON public.imaps_buildings FOR SELECT 
USING (true);
```

```sql
CREATE POLICY "Allow public read access on imaps_locations" 
ON public.imaps_locations FOR SELECT 
USING (true);
```

```sql
CREATE POLICY "Allow superadmin full access on imaps_buildings"
ON public.imaps_buildings FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'super_admin')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'super_admin')
);
```

```sql
CREATE POLICY "Allow superadmin full access on imaps_locations"
ON public.imaps_locations FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'super_admin')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'super_admin')
);
```

---

## File 68: `56_imaps_qol_update.sql`

---

## File 69: `57_imaps_storage_bucket.sql`

### Storage Buckets
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'imaps_assets',
    'imaps_assets',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
) ON CONFLICT (id) DO UPDATE SET public = true;
```

### RLS Policies
```sql
DROP POLICY IF EXISTS "Public View iMaps Assets" ON storage.objects;
```

```sql
DROP POLICY IF EXISTS "Auth Upload iMaps Assets" ON storage.objects;
```

```sql
DROP POLICY IF EXISTS "Auth Update iMaps Assets" ON storage.objects;
```

```sql
DROP POLICY IF EXISTS "Auth Delete iMaps Assets" ON storage.objects;
```

```sql
CREATE POLICY "Public View iMaps Assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'imaps_assets');
```

```sql
CREATE POLICY "Auth Upload iMaps Assets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'imaps_assets' AND auth.role() = 'authenticated');
```

```sql
CREATE POLICY "Auth Update iMaps Assets" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'imaps_assets' AND auth.role() = 'authenticated');
```

```sql
CREATE POLICY "Auth Delete iMaps Assets" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'imaps_assets' AND auth.role() = 'authenticated');
```

---

## File 70: `58_imaps_location_image.sql`

### Create / Alter Tables
```sql
ALTER TABLE imaps_locations
ADD COLUMN image_url TEXT;
```

---

## File 71: `58_polyrider_realtime.sql`

---

## File 72: `59_imaps_rls_fix.sql`

### RLS Policies
```sql
DROP POLICY IF EXISTS "Allow superadmin full access on imaps_buildings" ON public.imaps_buildings;
```

```sql
DROP POLICY IF EXISTS "Allow superadmin full access on imaps_locations" ON public.imaps_locations;
```

```sql
CREATE POLICY "Allow superadmin full access on imaps_buildings"
ON public.imaps_buildings FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
);
```

```sql
CREATE POLICY "Allow superadmin full access on imaps_locations"
ON public.imaps_locations FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
);
```

---

## File 73: `60_keusahawanan_registration_history.sql`

---

## File 74: `61_keusahawanan_multiple_mentors.sql`

---

## File 75: `62_imaps_location_operating_hours.sql`

---

## File 76: `63_merit_system_v2.sql`

### Create / Alter Tables
```sql
ALTER TABLE public.student_merit_cohorts ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.demerit_appeals ENABLE ROW LEVEL SECURITY;
```

### RLS Policies
```sql
ALTER TABLE public.merit_transactions 
ADD COLUMN IF NOT EXISTS proof_url TEXT,
ADD COLUMN IF NOT EXISTS academic_session TEXT,
ADD COLUMN IF NOT EXISTS scan_location JSONB;

-- 2. Update akademik_qr_scans
ALTER TABLE public.akademik_qr_scans 
ADD COLUMN IF NOT EXISTS scan_location JSONB,
ADD COLUMN IF NOT EXISTS verification_method TEXT;

-- 3. Update akademik_qr_tokens
ALTER TABLE public.akademik_qr_tokens 
ADD COLUMN IF NOT EXISTS location_lat NUMERIC,
ADD COLUMN IF NOT EXISTS location_lng NUMERIC,
ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS verification_pin TEXT;

-- 4. Create student_merit_cohorts
CREATE TABLE IF NOT EXISTS public.student_merit_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    cohort_id TEXT NOT NULL,
    total_merit INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.student_merit_cohorts ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Users can view own merit cohort history" 
ON public.student_merit_cohorts FOR SELECT 
USING (auth.uid() = user_id);
```

```sql
CREATE POLICY "Superadmin can manage merit cohorts" 
ON public.student_merit_cohorts FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'SUPERADMIN'
  )
);
```

```sql
ALTER TABLE public.demerit_appeals ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Users can view and create own appeals" 
ON public.demerit_appeals FOR SELECT 
USING (auth.uid() = user_id);
```

```sql
CREATE POLICY "Users can insert own appeals" 
ON public.demerit_appeals FOR INSERT 
WITH CHECK (auth.uid() = user_id AND status = 'PENDING');
```

```sql
CREATE POLICY "Admins/Exco can manage all appeals" 
ON public.demerit_appeals FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('SUPERADMIN', 'STAFF', 'YDP', 'EXCO')
  )
);
```

---

## File 77: `64_merit_archive_cohort.sql`

---

## File 78: `65_add_appeal_proof_url.sql`

---

## File 79: `66_fix_demerit_appeals_rls.sql`

### RLS Policies
```sql
DROP POLICY IF EXISTS "Admins/Exco can manage all appeals" ON public.demerit_appeals;
```

```sql
CREATE POLICY "Admins/Exco can manage all appeals" 
ON public.demerit_appeals FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
  )
);
```

---

## File 80: `67_fix_merit_system_audit.sql`

### RLS Policies
```sql
DROP POLICY IF EXISTS "Superadmin can manage merit cohorts" ON public.student_merit_cohorts;
```

```sql
DROP POLICY IF EXISTS "Users can view and create own appeals" ON public.demerit_appeals;
```

```sql
CREATE POLICY "Superadmin can manage merit cohorts"
ON public.student_merit_cohorts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP')
  )
);
```

```sql
CREATE POLICY "Users can view own appeals"
ON public.demerit_appeals FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
  )
);
```

---

## File 81: `68_guideline_compliance_audit.sql`

### RLS Policies
```sql
DROP POLICY IF EXISTS "Admins/Exco can manage all appeals" ON public.demerit_appeals;
```

```sql
DROP POLICY IF EXISTS "Users can insert own appeals" ON public.demerit_appeals;
```

```sql
DROP POLICY IF EXISTS "Users can view own appeals" ON public.demerit_appeals;
```

```sql
DROP POLICY IF EXISTS "Superadmin can manage merit cohorts" ON public.student_merit_cohorts;
```

```sql
DROP POLICY IF EXISTS "Users can view own merit cohort history" ON public.student_merit_cohorts;
```

```sql
CREATE POLICY "demerit_appeals_select" ON public.demerit_appeals
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
    )
  );
```

```sql
CREATE POLICY "demerit_appeals_insert" ON public.demerit_appeals
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = 'PENDING'
  );
```

```sql
CREATE POLICY "demerit_appeals_update" ON public.demerit_appeals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
    )
  );
```

```sql
CREATE POLICY "demerit_appeals_delete" ON public.demerit_appeals
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP')
    )
  );
```

```sql
CREATE POLICY "student_merit_cohorts_select" ON public.student_merit_cohorts
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP')
    )
  );
```

```sql
CREATE POLICY "student_merit_cohorts_manage" ON public.student_merit_cohorts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP')
    )
  );
```

---

## File 82: `69_polymart_ads_schema_fix.sql`

### Storage Buckets
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('polymart-ads', 'polymart-ads', true)
ON CONFLICT (id) DO NOTHING;
```

### RLS Policies
```sql
DROP POLICY IF EXISTS "Public can view active ads"           ON public.polymart_ads;
```

```sql
DROP POLICY IF EXISTS "Admins can manage all ads"           ON public.polymart_ads;
```

```sql
DROP POLICY IF EXISTS "Admin read polymart_ads"             ON public.polymart_ads;
```

```sql
DROP POLICY IF EXISTS "Admin insert polymart_ads"           ON public.polymart_ads;
```

```sql
DROP POLICY IF EXISTS "Admin update polymart_ads"           ON public.polymart_ads;
```

```sql
DROP POLICY IF EXISTS "Admin delete polymart_ads"           ON public.polymart_ads;
```

```sql
DROP POLICY IF EXISTS "Authenticated can click ads"         ON public.polymart_ads;
```

```sql
DROP POLICY IF EXISTS "Admin can upload polymart ads images" ON storage.objects;
```

```sql
DROP POLICY IF EXISTS "Public can view polymart ads images" ON storage.objects;
```

```sql
DROP POLICY IF EXISTS "Admin can delete polymart ads images" ON storage.objects;
```

```sql
ALTER TABLE public.polymart_ads ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Public can view active ads"
    ON public.polymart_ads
    FOR SELECT
    USING (status = 'ACTIVE');
```

```sql
CREATE POLICY "Admin read polymart_ads"
    ON public.polymart_ads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );
```

```sql
CREATE POLICY "Admin insert polymart_ads"
    ON public.polymart_ads
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );
```

```sql
CREATE POLICY "Admin update polymart_ads"
    ON public.polymart_ads
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );
```

```sql
CREATE POLICY "Admin delete polymart_ads"
    ON public.polymart_ads
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );
```

```sql
CREATE POLICY "Admin can upload polymart ads images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'polymart-ads'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );
```

```sql
CREATE POLICY "Public can view polymart ads images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'polymart-ads');
```

```sql
CREATE POLICY "Admin can delete polymart ads images"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'polymart-ads'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );
```

---

## File 83: `70_flexible_login_and_duplicate_detection.sql`

---

## File 84: `71_block_duplicate_matric_and_merge_tool.sql`

---

## File 85: `72_delete_own_account.sql`

---

## File 86: `73_polytask_schema.sql`

### Custom Types / Enums / Domains
```sql
CREATE TYPE polytask_job_status AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
```

```sql
CREATE TYPE polytask_bid_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
```

### Create / Alter Tables
```sql
CREATE TABLE IF NOT EXISTS public.polytask_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    budget NUMERIC(10, 2) NOT NULL DEFAULT 0,
    location TEXT NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,
    status polytask_job_status NOT NULL DEFAULT 'OPEN',
    assigned_tasker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

```sql
CREATE TABLE IF NOT EXISTS public.polytask_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.polytask_jobs(id) ON DELETE CASCADE,
    tasker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    proposal_note TEXT,
    status polytask_bid_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

```sql
CREATE TABLE IF NOT EXISTS public.polytask_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.polytask_jobs(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

```sql
ALTER TABLE public.polytask_bids ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polytask_reviews ENABLE ROW LEVEL SECURITY;
```

### Functions & Triggers
```sql
CREATE TRIGGER trigger_polytask_bid_acceptance
    AFTER UPDATE ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION handle_polytask_bid_acceptance();
```

### RLS Policies
```sql
ALTER TABLE public.polytask_jobs ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polytask_bids ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polytask_reviews ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Semua pelajar boleh lihat tugasan OPEN" ON public.polytask_jobs
    FOR SELECT USING (
        status = 'OPEN' 
        OR requester_id = (SELECT auth.uid()) 
        OR assigned_tasker_id = (SELECT auth.uid())
        OR is_jpp_admin((SELECT auth.uid()))
    );
```

```sql
CREATE POLICY "Pelajar boleh cipta tugasan" ON public.polytask_jobs
    FOR INSERT WITH CHECK (requester_id = (SELECT auth.uid()));
```

```sql
CREATE POLICY "Pelajar boleh kemaskini tugasan sendiri" ON public.polytask_jobs
    FOR UPDATE USING (
        requester_id = (SELECT auth.uid()) OR is_jpp_admin((SELECT auth.uid()))
    ) WITH CHECK (
        requester_id = (SELECT auth.uid()) OR is_jpp_admin((SELECT auth.uid()))
    );
```

```sql
CREATE POLICY "Peminta boleh lihat bidaan untuk tugasannya" ON public.polytask_bids
    FOR SELECT USING (
        tasker_id = (SELECT auth.uid()) OR 
        job_id IN (SELECT id FROM public.polytask_jobs WHERE requester_id = (SELECT auth.uid())) OR
        is_jpp_admin((SELECT auth.uid()))
    );
```

```sql
CREATE POLICY "Pelajar boleh bida jika tugasan OPEN" ON public.polytask_bids
    FOR INSERT WITH CHECK (
        tasker_id = (SELECT auth.uid()) AND
        job_id IN (SELECT id FROM public.polytask_jobs WHERE status = 'OPEN')
    );
```

```sql
CREATE POLICY "Tasker boleh tarik balik atau kemaskini bidaan" ON public.polytask_bids
    FOR UPDATE USING (
        tasker_id = (SELECT auth.uid()) AND status = 'PENDING'
    ) WITH CHECK (
        tasker_id = (SELECT auth.uid())
    );
```

```sql
CREATE POLICY "Peminta boleh ACCEPT bidaan" ON public.polytask_bids
    FOR UPDATE USING (
        job_id IN (SELECT id FROM public.polytask_jobs WHERE requester_id = (SELECT auth.uid()) AND status = 'OPEN') AND status = 'PENDING'
    ) WITH CHECK (
        job_id IN (SELECT id FROM public.polytask_jobs WHERE requester_id = (SELECT auth.uid()))
    );
```

```sql
CREATE POLICY "Semua boleh lihat review" ON public.polytask_reviews
    FOR SELECT USING (true);
```

```sql
CREATE POLICY "Boleh tulis review untuk job yang siap" ON public.polytask_reviews
    FOR INSERT WITH CHECK (
        reviewer_id = (SELECT auth.uid()) AND
        job_id IN (SELECT id FROM public.polytask_jobs WHERE status = 'COMPLETED')
    );
```

---

## File 87: `81_polytask_cancellation_rate.sql`

### Functions & Triggers
```sql
CREATE TRIGGER trigger_update_polytask_completion_metrics
    AFTER UPDATE ON public.polytask_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_polytask_completion_metrics();
```

```sql
CREATE TRIGGER trigger_handle_polytask_cancellation
    AFTER UPDATE ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION handle_polytask_cancellation();
```

### RLS Policies
```sql
CREATE POLICY "Tasker boleh tarik diri dari tugasan" ON public.polytask_jobs
    FOR UPDATE USING (
        assigned_tasker_id = (SELECT auth.uid()) AND status = 'IN_PROGRESS'
    ) WITH CHECK (
        -- membenarkan tasker set assigned_tasker_id = null
        true
    );
```

```sql
CREATE POLICY "Tasker boleh WITHDRAW bidaan yang sudah diterima" ON public.polytask_bids
    FOR UPDATE USING (
        tasker_id = (SELECT auth.uid()) AND status = 'ACCEPTED'
    ) WITH CHECK (
        tasker_id = (SELECT auth.uid())
    );
```

---

## File 88: `82_polytask_fasa_all.sql`

### Functions & Triggers
```sql
CREATE TRIGGER trigger_check_polytask_bid_rate_limit
    BEFORE INSERT ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION check_polytask_bid_rate_limit();
```

```sql
CREATE TRIGGER trigger_log_polytask_critical_actions
    AFTER UPDATE ON public.polytask_jobs
    FOR EACH ROW
    EXECUTE FUNCTION log_polytask_critical_actions();
```

---

## File 89: `83_polytask_proof_of_work.sql`

### Storage Buckets
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('polytask_proofs', 'polytask_proofs', true)
ON CONFLICT (id) DO NOTHING;
```

### RLS Policies
```sql
CREATE POLICY "Tasker boleh muat naik bukti kerja" ON public.polytask_jobs
    FOR UPDATE USING (
        assigned_tasker_id = (SELECT auth.uid()) AND status = 'IN_PROGRESS'
    ) WITH CHECK (
        assigned_tasker_id = (SELECT auth.uid())
    );
```

```sql
CREATE POLICY "Semua boleh lihat bukti" ON storage.objects
    FOR SELECT USING (bucket_id = 'polytask_proofs');
```

```sql
CREATE POLICY "Pelajar boleh upload bukti" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'polytask_proofs' AND auth.uid() IS NOT NULL);
```

---

## File 90: `84_polysuara_schema.sql`

### Create / Alter Tables
```sql
ALTER TABLE public.polysuara_upvotes ENABLE ROW LEVEL SECURITY;
```

### RLS Policies
```sql
ALTER TABLE public.polysuara_confessions ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polysuara_upvotes ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Pelajar boleh baca luahan" ON public.polysuara_confessions
    FOR SELECT USING (
        is_approved = true
    );
```

```sql
CREATE POLICY "Pelajar boleh buat luahan" ON public.polysuara_confessions
    FOR INSERT WITH CHECK (
        (SELECT auth.uid()) = author_id
    );
```

```sql
CREATE POLICY "JPP boleh urus luahan" ON public.polysuara_confessions
    FOR ALL USING (
        is_jpp_admin((SELECT auth.uid()))
    ) WITH CHECK (
        is_jpp_admin((SELECT auth.uid()))
    );
```

```sql
CREATE POLICY "Boleh lihat upvote" ON public.polysuara_upvotes
    FOR SELECT USING (true);
```

```sql
CREATE POLICY "Boleh upvote" ON public.polysuara_upvotes
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
```

```sql
CREATE POLICY "Boleh buang upvote sendiri" ON public.polysuara_upvotes
    FOR DELETE USING ((SELECT auth.uid()) = user_id);
```

---

## File 91: `84_polytask_v2_hotfix.sql`

### Storage Buckets
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('polytask_proofs', 'polytask_proofs', true)
ON CONFLICT (id) DO NOTHING;
```

### RLS Policies
```sql
DROP POLICY IF EXISTS "Semua boleh lihat bukti" ON storage.objects;
```

```sql
DROP POLICY IF EXISTS "Pelajar boleh upload bukti" ON storage.objects;
```

```sql
DROP POLICY IF EXISTS "Tasker boleh muat naik bukti kerja" ON public.polytask_jobs;
```

```sql
DROP POLICY IF EXISTS "Tasker boleh tarik diri dari tugasan" ON public.polytask_jobs;
```

```sql
CREATE POLICY "Semua boleh lihat bukti polytask" ON storage.objects
    FOR SELECT USING (bucket_id = 'polytask_proofs');
```

```sql
CREATE POLICY "Pelajar boleh upload bukti polytask" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'polytask_proofs' AND auth.uid() IS NOT NULL);
```

```sql
CREATE POLICY "Tasker boleh muat naik bukti kerja" ON public.polytask_jobs
    FOR UPDATE USING (
        assigned_tasker_id = (SELECT auth.uid()) AND status = 'IN_PROGRESS'
    ) WITH CHECK (
        assigned_tasker_id = (SELECT auth.uid())
    );
```

```sql
CREATE POLICY "Tasker boleh tarik diri dari tugasan" ON public.polytask_jobs
    FOR UPDATE USING (
        assigned_tasker_id = (SELECT auth.uid()) AND status = 'IN_PROGRESS'
    ) WITH CHECK (
        assigned_tasker_id = (SELECT auth.uid()) OR assigned_tasker_id IS NULL
    );
```

---

## File 92: `85_polymatch_schema.sql`

### RLS Policies
```sql
ALTER TABLE public.polymatch_listings ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Semua boleh baca iklan aktif" ON public.polymatch_listings
    FOR SELECT USING (
        status = 'OPEN' 
        OR (SELECT auth.uid()) = author_id
    );
```

```sql
CREATE POLICY "Pengguna boleh cipta iklan" ON public.polymatch_listings
    FOR INSERT WITH CHECK (
        (SELECT auth.uid()) = author_id
    );
```

```sql
CREATE POLICY "Pengguna boleh kemaskini iklan sendiri" ON public.polymatch_listings
    FOR UPDATE USING (
        (SELECT auth.uid()) = author_id
    ) WITH CHECK (
        (SELECT auth.uid()) = author_id
    );
```

```sql
CREATE POLICY "Pengguna boleh padam iklan sendiri" ON public.polymatch_listings
    FOR DELETE USING (
        (SELECT auth.uid()) = author_id
    );
```

```sql
CREATE POLICY "JPP boleh urus semua iklan" ON public.polymatch_listings
    FOR ALL USING (
        is_jpp_admin((SELECT auth.uid()))
    ) WITH CHECK (
        is_jpp_admin((SELECT auth.uid()))
    );
```

---

## File 93: `86_polyservices_moderation.sql`

### Create / Alter Tables
```sql
ALTER TABLE public.polyservices_moderation_config ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polyservices_reports ENABLE ROW LEVEL SECURITY;
```

### RLS Policies
```sql
DROP POLICY IF EXISTS "Semua boleh baca iklan aktif" ON public.polymatch_listings;
```

```sql
ALTER TABLE public.polymatch_listings ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;

-- Kemaskini RLS PolyMatch supaya hanya lihat yang di-approve
DROP POLICY IF EXISTS "Semua boleh baca iklan aktif" ON public.polymatch_listings;
CREATE POLICY "Semua boleh baca iklan aktif" ON public.polymatch_listings
    FOR SELECT USING (
        status = 'OPEN' 
        AND is_approved = true
        OR (SELECT auth.uid()) = author_id
    );

-- Jadual Laporan Pengguna (Reports)
CREATE TABLE IF NOT EXISTS public.polyservices_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_id UUID NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('SUARA', 'MATCH')),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_report_per_user UNIQUE (target_id, reporter_id)
);

ALTER TABLE public.polyservices_moderation_config ENABLE ROW LEVEL SECURITY;
```

```sql
ALTER TABLE public.polyservices_reports ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY "Semua boleh baca config moderasi" ON public.polyservices_moderation_config FOR SELECT USING (true);
```

```sql
CREATE POLICY "Hanya JPP boleh kemaskini config" ON public.polyservices_moderation_config FOR UPDATE USING (is_jpp_admin((SELECT auth.uid()))) WITH CHECK (is_jpp_admin((SELECT auth.uid())));
```

```sql
CREATE POLICY "Pelajar boleh buat report" ON public.polyservices_reports FOR INSERT WITH CHECK ((SELECT auth.uid()) = reporter_id);
```

```sql
CREATE POLICY "JPP boleh baca report" ON public.polyservices_reports FOR SELECT USING (is_jpp_admin((SELECT auth.uid())));
```

---

## File 94: `87_polymart_auto_cancel_hotfix.sql`

---

## File 95: `add_merit_eakademik_to_club_activities.sql`

### Create / Alter Tables
```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_token text;
```

```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_open_at timestamptz;
```

```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_close_at timestamptz;
```

```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS pre_reg_enabled boolean DEFAULT false;
```

---

## File 96: `quick_fix_pembubaran.sql`

---

## File 97: `rename_akademik_to_kpp_merit_vouch.sql`

### Create / Alter Tables
```sql
ALTER TABLE public.merit_program_applications 
  RENAME COLUMN akademik_reviewed_at TO kpp_reviewed_at;
```

```sql
ALTER TABLE public.merit_program_applications 
  RENAME COLUMN akademik_vouch_notes TO kpp_vouch_notes;
```

---

