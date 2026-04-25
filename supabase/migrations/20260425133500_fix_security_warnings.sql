-- Fix 1: Search Path Mutable
-- We dynamically update all functions in the public schema that are listed in the warnings
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN 
    FOR func_record IN 
        SELECT 
            p.oid::regprocedure AS func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname IN (
            'increment_merit_by_source', 'decrement_product_stock', 'check_system_setting',
            'enforce_takwim_toggle', 'enforce_auto_pdf_toggle', 'is_gerai_member',
            'increment_product_stock', 'verify_staff_code', 'update_program_participants_count',
            'track_ai_usage', 'track_ai_pro_usage', 'get_storage_stats', 'track_ai_flash_usage',
            'check_ai_tokens', 'complete_polymart_order', 'has_keusahawanan_gerai_access',
            'supsas_set_updated_at', 'auto_clean_rejected_reports', 'advance_group_winners',
            'cleanup_old_notifications', 'cleanup_orphan_supsas_fixtures', 'assign_free_tier_tokens',
            'ensure_single_active_edition', 'advance_sf_winners', 'change_member_role',
            'advance_qf_winners', 'handle_new_user', 'has_business_shift_access',
            'gen_kebajikan_ticket_no', 'update_kebajikan_updated_at', 'set_kebajikan_sla_deadline',
            'get_kebajikan_monthly_stats', 'get_kebajikan_category_stats', 'get_kebajikan_recent_ratings',
            'is_kebajikan_staff', 'is_kebajikan_pegawai', 'spend_ai_tokens',
            'reserve_polymart_stock', 'release_polymart_stock', 'update_updated_at_column'
        )
    LOOP
        EXECUTE 'ALTER FUNCTION ' || func_record.func_signature || ' SET search_path = public';
    END LOOP;
END $$;

-- Fix 2: RLS Policy Always True (Only the 100% safe ones to prevent breaking the app)
DROP POLICY IF EXISTS "Semua boleh tulis log" ON public.club_logs;
CREATE POLICY "Semua boleh tulis log" ON public.club_logs 
FOR INSERT WITH CHECK (actor_id = (select auth.uid()));

DROP POLICY IF EXISTS "kb_notif_update_read" ON public.kebajikan_notifications;
CREATE POLICY "kb_notif_update_read" ON public.kebajikan_notifications 
FOR UPDATE USING (
  (target_user_id = (select auth.uid())) OR is_kebajikan_staff()
) WITH CHECK (
  (target_user_id = (select auth.uid())) OR is_kebajikan_staff()
);
