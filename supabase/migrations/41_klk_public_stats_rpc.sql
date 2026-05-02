-- Create an RPC to safely fetch public KLK stats without exposing personal data
CREATE OR REPLACE FUNCTION get_klk_public_stats(academic_year_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_luar int;
  v_total_kamsis int;
  v_by_kawasan json;
  v_by_jabatan json;
  v_by_source json;
BEGIN
  -- Count totals
  SELECT count(*) INTO v_total_luar 
  FROM klk_student_residency 
  WHERE tinggal_luar = true AND academic_year = academic_year_param;

  SELECT count(*) INTO v_total_kamsis 
  FROM klk_student_residency 
  WHERE tinggal_luar = false AND academic_year = academic_year_param;

  -- Group by kawasan (top 10)
  SELECT COALESCE(json_agg(t), '[]'::json) INTO v_by_kawasan FROM (
    SELECT 
      COALESCE(NULLIF(kawasan_kediaman, 'LAIN_LAIN'), kawasan_custom, 'TIDAK DIISI') as kawasan, 
      count(*) as count
    FROM klk_student_residency
    WHERE tinggal_luar = true AND academic_year = academic_year_param
    GROUP BY 1
    ORDER BY count DESC
    LIMIT 10
  ) t;

  -- Group by jabatan
  SELECT COALESCE(json_agg(t), '[]'::json) INTO v_by_jabatan FROM (
    SELECT 
      COALESCE(jabatan, 'TIDAK DIISI') as jabatan, 
      count(*) as count
    FROM klk_student_residency
    WHERE tinggal_luar = true AND academic_year = academic_year_param
    GROUP BY 1
    ORDER BY count DESC
  ) t;

  -- Group by source
  SELECT json_build_object(
    'webapp', (SELECT count(*) FROM klk_student_residency WHERE source = 'WEBAPP' AND academic_year = academic_year_param),
    'google_form', (SELECT count(*) FROM klk_student_residency WHERE source = 'GOOGLE_FORM' AND academic_year = academic_year_param),
    'csv', (SELECT count(*) FROM klk_student_residency WHERE source = 'CSV_IMPORT' AND academic_year = academic_year_param)
  ) INTO v_by_source;

  RETURN json_build_object(
    'academic_year', academic_year_param,
    'total_luar', COALESCE(v_total_luar, 0),
    'total_kamsis', COALESCE(v_total_kamsis, 0),
    'by_kawasan', v_by_kawasan,
    'by_jabatan', v_by_jabatan,
    'by_source', v_by_source
  );
END;
$$;
