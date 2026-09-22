-- Fix: juri sahkan gagal — "function increment_merit_by_source(uuid, numeric, unknown) does not exist"
--
-- Punca: makmp_submission_items.merit_awarded adalah numeric, tetapi
-- increment_merit_by_source hanya ada overload (uuid, integer, text).
-- sync_makmp_submission_to_akademik (dipanggil oleh save_jury_* RPC) pass
-- v_item.merit_awarded (numeric) terus tanpa cast -> type mismatch.
--
-- Penyelesaian: tambah overload (uuid, numeric, text) yang cast ke integer
-- dan delegate ke overload asal. Ini selamat & selesaikan semua caller yang
-- pass numeric (merit MAKMP sentiasa integer; cast ::integer adalah selamat).
CREATE OR REPLACE FUNCTION public.increment_merit_by_source(p_uid uuid, p_delta numeric, p_src text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.increment_merit_by_source(p_uid, p_delta::integer, p_src);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_merit_by_source(uuid, numeric, text) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
