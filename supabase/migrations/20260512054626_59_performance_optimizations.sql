-- 1. Unindexed Foreign Keys Fixes

-- Table `public.polymart_cart_items` has a foreign key `polymart_cart_items_product_id_fkey` without a covering index
CREATE INDEX IF NOT EXISTS idx_polymart_cart_items_product_id ON public.polymart_cart_items(product_id);

-- Table `public.polyrider_bids` has a foreign key `polyrider_bids_rider_id_fkey` without a covering index
CREATE INDEX IF NOT EXISTS idx_polyrider_bids_rider_id ON public.polyrider_bids(rider_id);

-- Table `public.profile_edit_requests` has a foreign key `profile_edit_requests_reviewed_by_fkey` without a covering index
CREATE INDEX IF NOT EXISTS idx_profile_edit_requests_reviewed_by ON public.profile_edit_requests(reviewed_by);


-- 2. Multiple Permissive Policies Fixes

-- akademik_qr_tokens
-- Current policies:
-- aqt_modify (ALL) -> JPP, SUPER_ADMIN_JPP
-- aqt_select (SELECT) -> active OR JPP, SUPER_ADMIN_JPP
-- Split aqt_modify (ALL) into INSERT, UPDATE, DELETE to avoid overlapping SELECT

DROP POLICY IF EXISTS aqt_modify ON public.akademik_qr_tokens;

CREATE POLICY aqt_insert ON public.akademik_qr_tokens FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')));

CREATE POLICY aqt_update ON public.akademik_qr_tokens FOR UPDATE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')));

CREATE POLICY aqt_delete ON public.akademik_qr_tokens FOR DELETE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')));

-- akademik_sijil_categories
-- Current policies:
-- asc_modify (ALL) -> SUPER_ADMIN_JPP
-- asc_select (SELECT) -> true
-- Split asc_modify (ALL) into INSERT, UPDATE, DELETE to avoid overlapping SELECT

DROP POLICY IF EXISTS asc_modify ON public.akademik_sijil_categories;

CREATE POLICY asc_insert ON public.akademik_sijil_categories FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role = 'SUPER_ADMIN_JPP'));

CREATE POLICY asc_update ON public.akademik_sijil_categories FOR UPDATE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role = 'SUPER_ADMIN_JPP'));

CREATE POLICY asc_delete ON public.akademik_sijil_categories FOR DELETE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role = 'SUPER_ADMIN_JPP'));

-- akademik_unlock_requests
-- Current policies:
-- aur_insert (INSERT) -> uid matches & MENUNGGU
-- aur_select (SELECT) -> uid matches OR (SUPER_ADMIN_JPP, ADMIN, JPP)
-- unlock_requests_exco_all (ALL) -> SUPER_ADMIN_JPP, JPP AKADEMIK, CLUB_MT, MT
-- Since unlock_requests_exco_all gives ALL, it causes multiple permissive policies for SELECT (overlaps with aur_select) and INSERT (overlaps with aur_insert)
-- Best approach is to drop unlock_requests_exco_all and split it into INSERT, UPDATE, DELETE, and merge its SELECT condition with aur_select

DROP POLICY IF EXISTS unlock_requests_exco_all ON public.akademik_unlock_requests;
DROP POLICY IF EXISTS aur_select ON public.akademik_unlock_requests;
DROP POLICY IF EXISTS unlock_req_admin_update ON public.akademik_unlock_requests;

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

-- Consolidated from unlock_req_admin_update + aur_exco_update
CREATE POLICY aur_admin_update ON public.akademik_unlock_requests FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND profiles.role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP', 'CLUB_MT', 'MT')
    )
);

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
