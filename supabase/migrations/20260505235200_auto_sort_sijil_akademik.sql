-- Migration file to create the auto_sort_pencapaian_file RPC
-- This safely auto-sorts a certificate into a user's personal folder bypassing RLS

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
