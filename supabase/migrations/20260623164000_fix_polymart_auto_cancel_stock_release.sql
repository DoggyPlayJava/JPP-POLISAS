-- Overload 1: release_polymart_stock with numeric quantity
CREATE OR REPLACE FUNCTION public.release_polymart_stock(
  p_product_id UUID,
  p_quantity NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.release_polymart_stock(p_product_id, p_quantity::integer);
END;
$$;

-- Overload 2: release_polymart_stock with numeric quantity and variation
CREATE OR REPLACE FUNCTION public.release_polymart_stock(
  p_product_id UUID,
  p_quantity NUMERIC,
  p_variation TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.release_polymart_stock(p_product_id, p_quantity::integer, p_variation);
END;
$$;

-- Rebuild cancel_expired_polymart_orders to pass variation and cast quantity
CREATE OR REPLACE FUNCTION public.cancel_expired_polymart_orders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_order RECORD;
BEGIN
  FOR v_order IN
    SELECT id, product_id, quantity, buyer_id, selected_variation
    FROM polymart_orders
    WHERE status = 'PENDING'
      AND payment_deadline_at IS NOT NULL
      AND payment_deadline_at < NOW()
      AND payment_verified_at IS NULL
      AND payment_receipt_url IS NULL -- MESTI belum memuat naik resit
  LOOP
    UPDATE polymart_orders
    SET status = 'CANCELLED',
        cancel_reason = 'Auto-dibatalkan: had masa pembayaran tamat',
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = v_order.id;

    -- Release reserved stock with variation and proper type casting
    PERFORM public.release_polymart_stock(v_order.product_id, v_order.quantity::integer, v_order.selected_variation);
    
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Grant EXECUTE to public roles on the new functions
GRANT EXECUTE ON FUNCTION public.release_polymart_stock(UUID, NUMERIC) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_polymart_stock(UUID, NUMERIC, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_expired_polymart_orders() TO anon, authenticated, service_role;

-- Reload Postgrest schema cache
NOTIFY pgrst, 'reload schema';
