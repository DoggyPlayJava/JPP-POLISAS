-- ============================================================================
-- 91_foodbank_timeslots_and_aggregate.sql
-- 1. Tambah field time_slots (JSONB) pada foodbank_distribution_locations
--    supaya setiap pusat boleh define slot masa pengambilan sendiri
--    (waktu operasi setiap pusat berbeza).
-- 2. Tambah RPC allocate_foodbank_stock_from_aggregate: pindah stok dari
--    "stok belum agih" (foodbank_items.current_stock) ke satu lokasi.
-- ============================================================================

-- 1. Slot Masa per-pusat
ALTER TABLE public.foodbank_distribution_locations
  ADD COLUMN IF NOT EXISTS time_slots JSONB;

COMMENT ON COLUMN public.foodbank_distribution_locations.time_slots IS
  'Senarai slot masa pengambilan untuk pusat ini (contoh: ["10:00 AM - 11:30 AM", "11:30 AM - 01:00 PM"]). NULL bermaksud guna slot lalai.';

-- 2. RPC: Agih stok dari agregat (belum agih) ke lokasi
CREATE OR REPLACE FUNCTION public.allocate_foodbank_stock_from_aggregate(
  p_item_id UUID,
  p_to_location_id UUID,
  p_quantity INTEGER,
  p_actor_id UUID DEFAULT NULL,
  p_actor_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aggregate_stock INTEGER;
  v_item_name TEXT;
  v_to_loc_name TEXT;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Kuantiti agihan mestilah melebihi 0.');
  END IF;

  SELECT name INTO v_item_name FROM public.foodbank_items WHERE id = p_item_id;
  SELECT name INTO v_to_loc_name FROM public.foodbank_distribution_locations WHERE id = p_to_location_id;

  -- Kunci baris agregat untuk elak race condition
  SELECT current_stock INTO v_aggregate_stock
  FROM public.foodbank_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_aggregate_stock IS NULL OR v_aggregate_stock < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Stok belum agih tidak mencukupi (Baki: ' || COALESCE(v_aggregate_stock, 0)::TEXT || ').'
    );
  END IF;

  -- Kurangkan stok agregat (belum agih)
  UPDATE public.foodbank_items
  SET current_stock = current_stock - p_quantity,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_item_id;

  -- Tambah ke lokasi destinasi
  INSERT INTO public.foodbank_location_stocks (item_id, location_id, current_stock, updated_at)
  VALUES (p_item_id, p_to_location_id, p_quantity, timezone('utc'::text, now()))
  ON CONFLICT (item_id, location_id)
  DO UPDATE SET current_stock = foodbank_location_stocks.current_stock + p_quantity,
                updated_at = timezone('utc'::text, now());

  -- Audit log
  INSERT INTO public.foodbank_audit_logs (
    actor_id, actor_name, action_type, location_id, target_id, details
  ) VALUES (
    p_actor_id,
    COALESCE(p_actor_name, 'Pegawai'),
    'STOCK_TRANSFER',
    p_to_location_id,
    v_item_name,
    jsonb_build_object(
      'item_id', p_item_id,
      'item_name', v_item_name,
      'from', 'AGREGAT (Belum Agih)',
      'to_location_id', p_to_location_id,
      'to_location_name', v_to_loc_name,
      'quantity', p_quantity,
      'notes', p_notes
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Agihan ' || p_quantity::TEXT || ' unit ' || COALESCE(v_item_name, 'barangan') ||
               ' dari Stok Belum Agih ke ' || COALESCE(v_to_loc_name, 'pusat') || ' berjaya.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_foodbank_stock_from_aggregate(UUID, UUID, INTEGER, UUID, TEXT, TEXT) TO authenticated;
