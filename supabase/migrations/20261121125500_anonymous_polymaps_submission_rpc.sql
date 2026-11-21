CREATE OR REPLACE FUNCTION public.submit_anonymous_polymaps_360(
  p_building_id uuid,
  p_location_id uuid,
  p_contributor_name text,
  p_floor_level text,
  p_corridor_label text,
  p_room_code_hint text,
  p_panorama_360_url text,
  p_hotspots_json jsonb,
  p_hotspots_payload jsonb,
  p_notes text
)
RETURNS public.imaps_field_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.imaps_field_submissions;
BEGIN
  IF p_building_id IS NULL OR nullif(trim(p_panorama_360_url), '') IS NULL THEN
    RAISE EXCEPTION 'building_id and panorama_360_url required';
  END IF;
  INSERT INTO public.imaps_field_submissions (
    building_id, location_id, contributor_id, contributor_name, floor_level,
    corridor_label, room_code_hint, panorama_360_url, hotspots_json,
    hotspots_payload, notes, status
  ) VALUES (
    p_building_id, p_location_id, NULL, left(nullif(trim(p_contributor_name), ''), 120),
    left(coalesce(nullif(trim(p_floor_level), ''), '1'), 20),
    left(nullif(trim(p_corridor_label), ''), 200),
    left(nullif(trim(p_room_code_hint), ''), 200), p_panorama_360_url,
    coalesce(p_hotspots_json, '[]'::jsonb), coalesce(p_hotspots_payload, '[]'::jsonb),
    left(nullif(trim(p_notes), ''), 2000), 'pending'
  ) RETURNING * INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_anonymous_polymaps_360(uuid, uuid, text, text, text, text, text, jsonb, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_anonymous_polymaps_360(uuid, uuid, text, text, text, text, text, jsonb, jsonb, text) TO anon, authenticated;

ALTER TABLE public.imaps_field_submissions ALTER COLUMN contributor_id DROP NOT NULL;
DROP POLICY IF EXISTS "Anonymous Upload iMaps PolyMaps Assets" ON storage.objects;
CREATE POLICY "Anonymous Upload iMaps PolyMaps Assets"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'imaps_assets'
  AND (storage.foldername(name))[1] = 'polymaps'
);

NOTIFY pgrst, 'reload schema';

