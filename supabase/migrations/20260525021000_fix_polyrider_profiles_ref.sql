-- Migration: Fix polyrider_profiles non-existent table references in database routines.
-- This occurs because polyrider_profiles was renamed to polytask_profiles in migration 73_polytask_schema.

-- 1. Correct delete_own_account() function
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Cleanup data yang mungkin tidak ada CASCADE
  DELETE FROM student_club_memberships WHERE user_id = v_uid;
  DELETE FROM notifications WHERE user_id = v_uid;
  DELETE FROM merit_transactions WHERE user_id = v_uid;
  DELETE FROM student_merit_cohorts WHERE user_id = v_uid;
  DELETE FROM ai_tier_requests WHERE user_id = v_uid;
  DELETE FROM ai_usage_logs WHERE user_id = v_uid;
  DELETE FROM user_announcement_responses WHERE user_id = v_uid;
  DELETE FROM user_exco_access WHERE user_id = v_uid;
  DELETE FROM karnival_votes_v2 WHERE voter_id = v_uid;
  DELETE FROM polytask_profiles WHERE user_id = v_uid; -- Fixed from polyrider_profiles
  DELETE FROM akademik_cgpa_records WHERE user_id = v_uid;
     
  -- SET NULL pada FK yang bukan kritikal (jangan padam rekod sejarah)
  UPDATE club_logs SET actor_id = NULL WHERE actor_id = v_uid;
  UPDATE admin_audit_logs SET actor_id = NULL WHERE actor_id = v_uid;
  UPDATE kebajikan_ticket_comments SET author_id = NULL WHERE author_id = v_uid;
  UPDATE kebajikan_ticket_status_log SET actor_id = NULL WHERE actor_id = v_uid;
     
  -- Padam profil dan auth
  DELETE FROM profiles WHERE id = v_uid;
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

-- 2. Correct admin_merge_duplicate_accounts() function
CREATE OR REPLACE FUNCTION admin_merge_duplicate_accounts(
  p_primary_id UUID, p_secondary_id UUID
) RETURNS JSONB 
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
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role != 'SUPER_ADMIN_JPP' THEN
    RAISE EXCEPTION 'Akses Ditolak: Hanya Super Admin boleh menggabungkan akaun.';
  END IF;

  SELECT full_name INTO v_primary_name FROM profiles WHERE id = p_primary_id;
  SELECT full_name, matric_no INTO v_secondary_name, v_secondary_matric FROM profiles WHERE id = p_secondary_id;
  SELECT email INTO v_secondary_email FROM auth.users WHERE id = p_secondary_id;
     
  IF v_primary_name IS NULL THEN RAISE EXCEPTION 'Akaun primary tidak dijumpai.'; END IF;
  IF v_secondary_name IS NULL THEN RAISE EXCEPTION 'Akaun secondary tidak dijumpai.'; END IF;
  IF p_primary_id = p_secondary_id THEN RAISE EXCEPTION 'Tidak boleh gabungkan akaun yang sama.'; END IF;

  -- ═══ PHASE A: TABLES WITH profiles.id FK ═══
  UPDATE student_club_memberships SET user_id = p_primary_id, updated_at = NOW()
    WHERE user_id = p_secondary_id AND club_id NOT IN (SELECT club_id FROM student_club_memberships WHERE user_id = p_primary_id);
  GET DIAGNOSTICS v_moved_memberships = ROW_COUNT;
  DELETE FROM student_club_memberships WHERE user_id = p_secondary_id;

  UPDATE notifications SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE club_logs SET actor_id = p_primary_id WHERE actor_id = p_secondary_id;
  UPDATE club_tasks SET assigned_to = p_primary_id WHERE assigned_to = p_secondary_id;
  UPDATE club_tasks SET created_by = p_primary_id WHERE created_by = p_secondary_id;
  UPDATE club_tasks SET approved_by = p_primary_id WHERE approved_by = p_secondary_id;
  UPDATE merit_transactions SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE admin_audit_logs SET actor_id = p_primary_id WHERE actor_id = p_secondary_id;

  -- Business/Keusahawanan
  UPDATE business_expenses SET recorded_by = p_primary_id WHERE recorded_by = p_secondary_id;
  UPDATE business_cash_checkpoints SET recorded_by = p_primary_id WHERE recorded_by = p_secondary_id;
  UPDATE business_pos_assignments SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE business_pos_assignments SET assigned_by = p_primary_id WHERE assigned_by = p_secondary_id;
  UPDATE business_pos_logs SET actor_id = p_primary_id WHERE actor_id = p_secondary_id;
  UPDATE business_sessions SET opened_by = p_primary_id WHERE opened_by = p_secondary_id;
  UPDATE business_sessions SET closed_by = p_primary_id WHERE closed_by = p_secondary_id;
  UPDATE business_shifts SET assigned_to = p_primary_id WHERE assigned_to = p_secondary_id;
  UPDATE business_shifts SET created_by = p_primary_id WHERE created_by = p_secondary_id;
  UPDATE business_transactions SET served_by = p_primary_id WHERE served_by = p_secondary_id;
  UPDATE business_transactions SET voided_by = p_primary_id WHERE voided_by = p_secondary_id;
  UPDATE business_promotions SET created_by = p_primary_id WHERE created_by = p_secondary_id;
  UPDATE business_shift_swaps SET requested_by = p_primary_id WHERE requested_by = p_secondary_id;
  UPDATE business_shift_swaps SET responded_by = p_primary_id WHERE responded_by = p_secondary_id;
  UPDATE business_shift_swaps SET swap_with = p_primary_id WHERE swap_with = p_secondary_id;
  UPDATE keusahawanan_businesses SET owner_id = p_primary_id WHERE owner_id = p_secondary_id;
  UPDATE keusahawanan_logs SET actor_id = p_primary_id WHERE actor_id = p_secondary_id;
  UPDATE keusahawanan_unit_admins SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE keusahawanan_unit_admins SET assigned_by = p_primary_id WHERE assigned_by = p_secondary_id;
  UPDATE student_business_memberships SET user_id = p_primary_id WHERE user_id = p_secondary_id;

  -- Kebajikan
  UPDATE kebajikan_tickets SET submitter_id = p_primary_id WHERE submitter_id = p_secondary_id;
  UPDATE kebajikan_tickets SET assigned_to = p_primary_id WHERE assigned_to = p_secondary_id;
  UPDATE kebajikan_tickets SET resolved_by = p_primary_id WHERE resolved_by = p_secondary_id;
  UPDATE kebajikan_tickets SET delegated_to = p_primary_id WHERE delegated_to = p_secondary_id;
  UPDATE kebajikan_tickets SET reopen_approved_by = p_primary_id WHERE reopen_approved_by = p_secondary_id;
  UPDATE kebajikan_ticket_comments SET author_id = p_primary_id WHERE author_id = p_secondary_id;
  UPDATE kebajikan_ticket_status_log SET actor_id = p_primary_id WHERE actor_id = p_secondary_id;
  UPDATE kebajikan_notifications SET target_user_id = p_primary_id WHERE target_user_id = p_secondary_id;
  UPDATE kebajikan_pics SET pic_user_id = p_primary_id WHERE pic_user_id = p_secondary_id;
  UPDATE kebajikan_pics SET created_by = p_primary_id WHERE created_by = p_secondary_id;
  UPDATE kebajikan_settings SET updated_by = p_primary_id WHERE updated_by = p_secondary_id;
  UPDATE kebajikan_staff_assignments SET staff_user_id = p_primary_id WHERE staff_user_id = p_secondary_id;
  UPDATE kebajikan_staff_assignments SET assigned_by = p_primary_id WHERE assigned_by = p_secondary_id;
  UPDATE kebajikan_tags SET created_by = p_primary_id WHERE created_by = p_secondary_id;
  UPDATE kebajikan_escalation_actions SET recorded_by = p_primary_id WHERE recorded_by = p_secondary_id;

  -- Akademik
  UPDATE akademik_cgpa_records SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE akademik_files SET owner_user_id = p_primary_id WHERE owner_user_id = p_secondary_id;
  UPDATE akademik_files SET uploaded_by = p_primary_id WHERE uploaded_by = p_secondary_id;
  UPDATE akademik_folders SET created_by = p_primary_id WHERE created_by = p_secondary_id;
  UPDATE akademik_merit_config SET updated_by = p_primary_id WHERE updated_by = p_secondary_id;
  UPDATE akademik_pencapaian SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE akademik_pencapaian SET verified_by = p_primary_id WHERE verified_by = p_secondary_id;
  UPDATE akademik_qr_scans SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE akademik_qr_tokens SET created_by = p_primary_id WHERE created_by = p_secondary_id;
  UPDATE akademik_sijil_categories SET created_by = p_primary_id WHERE created_by = p_secondary_id;
  UPDATE akademik_unlock_requests SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE akademik_unlock_requests SET reviewed_by = p_primary_id WHERE reviewed_by = p_secondary_id;

  -- Merit programs
  UPDATE merit_program_applications SET applied_by = p_primary_id WHERE applied_by = p_secondary_id;
  UPDATE merit_program_applications SET kpp_reviewer_id = p_primary_id WHERE kpp_reviewer_id = p_secondary_id;
  UPDATE merit_program_applications SET kediaman_reviewer_id = p_primary_id WHERE kediaman_reviewer_id = p_secondary_id;
  UPDATE merit_review_log SET reviewer_id = p_primary_id WHERE reviewer_id = p_secondary_id;
  DELETE FROM student_merit_cohorts WHERE user_id = p_secondary_id;

  -- AI + misc
  UPDATE ai_usage_logs SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  DELETE FROM ai_tier_requests WHERE user_id = p_secondary_id;

  -- JPP assignments
  UPDATE jpp_mt_assignments SET mt_user_id = p_primary_id WHERE mt_user_id = p_secondary_id;
  UPDATE jpp_mt_assignments SET assigned_by = p_primary_id WHERE assigned_by = p_secondary_id;

  -- Asrama
  UPDATE asrama_recommendations SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE asrama_recommendations SET marked_by = p_primary_id WHERE marked_by = p_secondary_id;
  UPDATE asrama_unit_admins SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE asrama_unit_admins SET assigned_by = p_primary_id WHERE assigned_by = p_secondary_id;

  -- PolyMart
  UPDATE polymart_orders SET buyer_id = p_primary_id WHERE buyer_id = p_secondary_id;
  UPDATE polymart_reports SET reporter_id = p_primary_id WHERE reporter_id = p_secondary_id;
  UPDATE polymart_reports SET reviewed_by = p_primary_id WHERE reviewed_by = p_secondary_id;
  UPDATE polymart_reviews SET reviewer_id = p_primary_id WHERE reviewer_id = p_secondary_id;

  -- Remaining profiles FK tables
  UPDATE club_activities SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE club_reports SET submitted_by = p_primary_id WHERE submitted_by = p_secondary_id;
  UPDATE club_reports SET reviewed_by = p_primary_id WHERE reviewed_by = p_secondary_id;
  UPDATE demerit_appeals SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE demerit_appeals SET reviewed_by = p_primary_id WHERE reviewed_by = p_secondary_id;
  UPDATE profile_edit_requests SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE profile_edit_requests SET reviewed_by = p_primary_id WHERE reviewed_by = p_secondary_id;
  UPDATE programs SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE program_attendees SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE system_announcements SET created_by = p_primary_id WHERE created_by = p_secondary_id;
  UPDATE task_feedback SET from_id = p_primary_id WHERE from_id = p_secondary_id;
  UPDATE task_submissions SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE portal_settings SET updated_by = p_primary_id WHERE updated_by = p_secondary_id;
  DELETE FROM user_announcement_responses WHERE user_id = p_secondary_id;
  DELETE FROM user_exco_access WHERE user_id = p_secondary_id;
  DELETE FROM karnival_votes_v2 WHERE voter_id = p_secondary_id;

  -- ═══ PHASE B: TABLES WITH auth.users FK (NOT profiles) ═══
  UPDATE clubs SET president_id = p_primary_id WHERE president_id = p_secondary_id;
  UPDATE kamsis_applications SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE keusahawanan_program_registrations SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE keusahawanan_programs SET created_by = p_primary_id WHERE created_by = p_secondary_id;
  DELETE FROM klk_student_residency WHERE user_id = p_secondary_id;
  UPDATE klk_sync_log SET synced_by = p_primary_id WHERE synced_by = p_secondary_id;
  UPDATE polymart_ads SET created_by = p_primary_id WHERE created_by = p_secondary_id;
  DELETE FROM polymart_cart_items WHERE buyer_id = p_secondary_id;
  
  -- PolyTask updates
  UPDATE polytask_chats SET sender_id = p_primary_id WHERE sender_id = p_secondary_id;
  UPDATE polytask_jobs SET assigned_tasker_id = p_primary_id WHERE assigned_tasker_id = p_secondary_id;
  UPDATE polytask_jobs SET requester_id = p_primary_id WHERE requester_id = p_secondary_id;
  UPDATE polytask_bids SET tasker_id = p_primary_id WHERE tasker_id = p_secondary_id;
  UPDATE polytask_reviews SET reviewer_id = p_primary_id WHERE reviewer_id = p_secondary_id;
  UPDATE polytask_reviews SET reviewee_id = p_primary_id WHERE reviewee_id = p_secondary_id;
  UPDATE polytask_appeals SET user_id = p_primary_id WHERE user_id = p_secondary_id;
  UPDATE polytask_appeals SET reviewed_by = p_primary_id WHERE reviewed_by = p_secondary_id;
     
  -- PolyTask profiles: handle unique conflict (fixed from polyrider_profiles)
  IF EXISTS (SELECT 1 FROM polytask_profiles WHERE user_id = p_primary_id) THEN
    -- Primary already has a tasker profile — discard secondary's
    UPDATE polytask_jobs SET assigned_tasker_id = p_primary_id WHERE assigned_tasker_id = p_secondary_id;
    DELETE FROM polytask_profiles WHERE user_id = p_secondary_id;
  ELSE
    -- Migrate secondary's profile to primary
    INSERT INTO polytask_profiles (user_id, status, is_active, avg_rating, total_trips, receipt_url, subscription_valid_until, skills, created_at, updated_at)
    SELECT p_primary_id, status, is_active, avg_rating, total_trips, receipt_url, subscription_valid_until, skills, created_at, updated_at
    FROM polytask_profiles
    WHERE user_id = p_secondary_id;
    
    DELETE FROM polytask_profiles WHERE user_id = p_secondary_id;
  END IF;

  -- PolyRider bids update (references polytask_profiles via rider_id)
  UPDATE polyrider_bids SET rider_id = p_primary_id WHERE rider_id = p_secondary_id;
     
  -- Disable trigger for saved_locations cleanup
  ALTER TABLE polyrider_saved_locations DISABLE TRIGGER trg_saved_locations_limit;
  DELETE FROM polyrider_saved_locations WHERE user_id = p_secondary_id;
  ALTER TABLE polyrider_saved_locations ENABLE TRIGGER trg_saved_locations_limit;
     
  DELETE FROM polytask_sos_contacts WHERE user_id = p_secondary_id;
     
  -- Disable audit trigger for sos_logs
  ALTER TABLE polytask_sos_logs DISABLE TRIGGER trg_audit_polyrider_sos;
  UPDATE polytask_sos_logs SET triggered_by = p_primary_id WHERE triggered_by = p_secondary_id;
  UPDATE polytask_sos_logs SET resolved_by = p_primary_id WHERE resolved_by = p_secondary_id;
  ALTER TABLE polytask_sos_logs ENABLE TRIGGER trg_audit_polyrider_sos;
   
  DELETE FROM push_subscriptions WHERE user_id = p_secondary_id;
  UPDATE supsas_kontingen SET leader_id = p_primary_id WHERE leader_id = p_secondary_id;
  UPDATE supsas_participants SET profile_id = p_primary_id WHERE profile_id = p_secondary_id;
  UPDATE supsas_results SET recorded_by = p_primary_id WHERE recorded_by = p_secondary_id;
  UPDATE takwim_holidays SET created_by = p_primary_id WHERE created_by = p_secondary_id;
  UPDATE takwim_pusat SET created_by = p_primary_id WHERE created_by = p_secondary_id;
   
  -- ═══ PHASE C: MERGE BALANCES + DELETE ═══
  UPDATE profiles
  SET merit = COALESCE(merit, 0) + COALESCE((SELECT merit FROM profiles WHERE id = p_secondary_id), 0),
      subscription_tier = CASE
         WHEN COALESCE(subscription_tier, 'free') = 'pro' THEN 'pro'
        WHEN COALESCE((SELECT subscription_tier FROM profiles WHERE id = p_secondary_id), 'free') = 'pro' THEN 'pro'
        ELSE COALESCE(subscription_tier, 'free')
      END,
      ai_token_balance = COALESCE(ai_token_balance, 0) + COALESCE((SELECT ai_token_balance FROM profiles WHERE id = p_secondary_id), 0)
  WHERE id = p_primary_id;
   
  DELETE FROM profiles WHERE id = p_secondary_id;
  DELETE FROM auth.users WHERE id = p_secondary_id;
   
  INSERT INTO admin_audit_logs (actor_id, action_type, module, entity_id, description, metadata)
  VALUES (
    auth.uid(), 'ACCOUNT_MERGED', 'JPP Admin', p_primary_id::TEXT,
    format('Akaun berganda digabungkan: %s (%s) → %s', v_secondary_name, v_secondary_email, v_primary_name),
    jsonb_build_object('primary_id', p_primary_id, 'secondary_id', p_secondary_id,
      'secondary_email', v_secondary_email, 'secondary_matric', v_secondary_matric,
      'memberships_moved', v_moved_memberships)
  );
   
  RETURN jsonb_build_object('success', TRUE,
    'message', format('Akaun %s berjaya digabungkan ke %s', v_secondary_name, v_primary_name),
    'memberships_moved', v_moved_memberships);
END;
$$;

-- Re-revoke execute on admin_merge_duplicate_accounts from anon
REVOKE EXECUTE ON FUNCTION admin_merge_duplicate_accounts(UUID, UUID) FROM anon;
