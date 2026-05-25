-- ═══════════════════════════════════════════════════════════════
-- PolyMart Auto-Cancel Hotfix
-- Only auto-cancel PENDING orders if payment_receipt_url is still NULL
-- ═══════════════════════════════════════════════════════════════

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
    SELECT id, product_id, quantity, buyer_id
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

    PERFORM release_polymart_stock(v_order.product_id, v_order.quantity);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
