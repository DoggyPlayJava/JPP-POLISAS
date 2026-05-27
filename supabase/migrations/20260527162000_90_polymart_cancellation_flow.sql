-- 90_polymart_cancellation_flow.sql
-- Adds buyer-initiated cancellation with vendor approval workflow

-- 1. Tambah columns untuk cancellation pada polymart_orders
ALTER TABLE polymart_orders 
ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_polymart_orders_cancelled_by ON polymart_orders(cancelled_by);

-- 2. RPC: Buyer cancel order
CREATE OR REPLACE FUNCTION buyer_cancel_polymart_order(
  p_order_id UUID, 
  p_buyer_id UUID, 
  p_reason TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_result TEXT;
BEGIN
  -- Lock row to prevent race condition
  SELECT status, buyer_id, product_id, quantity, business_id
  INTO v_order
  FROM polymart_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak wujud.';
  END IF;

  -- Verify buyer owns the order
  IF v_order.buyer_id != p_buyer_id THEN
    RAISE EXCEPTION 'Anda bukan pemilik pesanan ini.';
  END IF;

  -- PENDING: Auto-cancel immediately, release stock
  IF v_order.status = 'PENDING' THEN
    UPDATE polymart_orders
    SET status = 'CANCELLED',
        cancellation_reason = p_reason,
        cancelled_at = NOW(),
        cancelled_by = p_buyer_id,
        cancel_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Release reserved stock
    UPDATE business_products
    SET reserved_stock = GREATEST(0, reserved_stock - v_order.quantity)
    WHERE id = v_order.product_id;

    v_result := 'CANCELLED';

  -- CONFIRMED: Request cancellation (vendor must approve)
  ELSIF v_order.status = 'CONFIRMED' THEN
    UPDATE polymart_orders
    SET cancellation_requested_at = NOW(),
        cancellation_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_order_id;

    v_result := 'CANCELLATION_REQUESTED';

  -- READY/COMPLETED: Cannot cancel
  ELSE
    RAISE EXCEPTION 'Pesanan dengan status % tidak boleh dibatalkan.', v_order.status;
  END IF;

  RETURN jsonb_build_object('result', v_result, 'order_id', p_order_id);
END;
$$;

-- 3. RPC: Vendor handle cancellation request
CREATE OR REPLACE FUNCTION vendor_handle_cancellation(
  p_order_id UUID,
  p_vendor_id UUID,
  p_action TEXT -- 'approve' or 'reject'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Lock and fetch order
  SELECT o.status, o.product_id, o.quantity, o.business_id, o.cancellation_requested_at,
         b.owner_id as business_owner_id
  INTO v_order
  FROM polymart_orders o
  JOIN keusahawanan_businesses b ON b.id = o.business_id
  WHERE o.id = p_order_id
  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak wujud.';
  END IF;

  -- Verify vendor owns the business or is an active member
  IF v_order.business_owner_id != p_vendor_id AND NOT EXISTS (
    SELECT 1 FROM student_business_memberships 
    WHERE user_id = p_vendor_id AND business_id = v_order.business_id AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Anda bukan pemilik atau ahli aktif perniagaan ini.';
  END IF;

  -- Must have cancellation request pending
  IF v_order.cancellation_requested_at IS NULL THEN
    RAISE EXCEPTION 'Tiada permintaan pembatalan untuk pesanan ini.';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE polymart_orders
    SET status = 'CANCELLED',
        cancelled_at = NOW(),
        cancelled_by = p_vendor_id,
        cancel_reason = cancellation_reason,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Release reserved stock
    UPDATE business_products
    SET reserved_stock = GREATEST(0, reserved_stock - v_order.quantity)
    WHERE id = v_order.product_id;

    RETURN jsonb_build_object('result', 'CANCELLATION_APPROVED', 'order_id', p_order_id);

  ELSIF p_action = 'reject' THEN
    UPDATE polymart_orders
    SET cancellation_requested_at = NULL,
        cancellation_reason = NULL,
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('result', 'CANCELLATION_REJECTED', 'order_id', p_order_id);

  ELSE
    RAISE EXCEPTION 'Tindakan tidak sah. Gunakan approve atau reject.';
  END IF;
END;
$$;
