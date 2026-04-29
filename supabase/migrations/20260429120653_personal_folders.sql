-- Drop old policies
DROP POLICY IF EXISTS akfol_select ON akademik_folders;
DROP POLICY IF EXISTS akfol_insert ON akademik_folders;
DROP POLICY IF EXISTS akfol_update ON akademik_folders;
DROP POLICY IF EXISTS akfol_delete ON akademik_folders;

DROP POLICY IF EXISTS akf_select ON akademik_files;
DROP POLICY IF EXISTS akf_insert ON akademik_files;
DROP POLICY IF EXISTS akf_update ON akademik_files;
DROP POLICY IF EXISTS akf_delete ON akademik_files;

-- Change default to false for new folders
ALTER TABLE akademik_folders ALTER COLUMN is_public SET DEFAULT false;

-- Create new strictly personal policies for akademik_folders
CREATE POLICY akfol_select ON akademik_folders FOR SELECT USING (created_by = auth.uid());
CREATE POLICY akfol_insert ON akademik_folders FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY akfol_update ON akademik_folders FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY akfol_delete ON akademik_folders FOR DELETE USING (created_by = auth.uid());

-- Create new strictly personal policies for akademik_files
-- using uploaded_by since that's what the frontend currently populates
CREATE POLICY akf_select ON akademik_files FOR SELECT USING (uploaded_by = auth.uid() OR owner_user_id = auth.uid());
CREATE POLICY akf_insert ON akademik_files FOR INSERT WITH CHECK (uploaded_by = auth.uid() OR owner_user_id = auth.uid());
CREATE POLICY akf_update ON akademik_files FOR UPDATE USING (uploaded_by = auth.uid() OR owner_user_id = auth.uid());
CREATE POLICY akf_delete ON akademik_files FOR DELETE USING (uploaded_by = auth.uid() OR owner_user_id = auth.uid());
