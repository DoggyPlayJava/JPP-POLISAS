-- 89_complete_order_idempotency_guard.sql
-- Adds idempotency guard + row locking to complete_polymart_order
-- Prevents double-completion race conditions during high-traffic POS scanning

CREATE OR REPLACE FUNCTION complete_polymart_order(
  p_order_id UUID,
  p_business_id UUID,
  p_product_id UUID,
  p_quantity INT,
  p_unit_price DECIMAL,
  p_payment_method TEXT,
  p_served_by UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_invoice_num TEXT;
  v_product_name TEXT;
  v_selected_variation TEXT;
  v_total DECIMAL;
  v_order_status TEXT;
BEGIN
  -- Kira jumlah keseluruhan
  v_total := p_quantity * p_unit_price;

  -- IDEMPOTENCY GUARD: Lock row dan semak status sebelum proses
  SELECT status INTO v_order_status
  FROM polymart_orders
  WHERE id = p_order_id
  FOR UPDATE; -- Row-level lock untuk elak race condition

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan % tidak wujud.', p_order_id;
  END IF;

  -- Hanya CONFIRMED/READY boleh di-complete
  IF v_order_status NOT IN ('CONFIRMED', 'READY') THEN
    RAISE EXCEPTION 'Pesanan sudah diselesaikan atau dibatalkan (Status: %). Tidak boleh diproses semula.', v_order_status;
  END IF;

  -- Sahkan pesanan ini milik perniagaan yang betul
  IF NOT EXISTS (
    SELECT 1 FROM polymart_orders WHERE id = p_order_id AND business_id = p_business_id
  ) THEN
    RAISE EXCEPTION 'Pesanan ini bukan milik perniagaan anda.';
  END IF;

  -- 1. Tolak stok fizikal & stok yang ditempah (dengan row lock)
  UPDATE business_products
  SET 
    stock_quantity = GREATEST(0, stock_quantity - p_quantity),
    reserved_stock = GREATEST(0, reserved_stock - p_quantity)
  WHERE id = p_product_id
  RETURNING name INTO v_product_name;

  -- 1b. Dapatkan variasi saiz yang ditempah
  SELECT selected_variation INTO v_selected_variation
  FROM polymart_orders
  WHERE id = p_order_id;

  -- 2. Kemas kini status pesanan PolyMart
  UPDATE polymart_orders
  SET status = 'COMPLETED',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;

  -- 3. Bina No Invois Sync
  v_invoice_num := 'PM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(p_order_id::text from 1 for 4));

  -- 4. Masukkan ke dalam lejar POS
  INSERT INTO business_transactions (
    business_id,
    invoice_number,
    items,
    subtotal,
    discount_type,
    discount_amount,
    discount_note,
    total_amount,
    payment_method,
    received_amount,
    change_amount,
    customer_name,
    customer_note,
    served_by,
    status
  ) VALUES (
    p_business_id,
    v_invoice_num,
    jsonb_build_array(
      jsonb_build_object(
        'product_id', p_product_id,
        'name', v_product_name,
        'qty', p_quantity,
        'unit_price', p_unit_price,
        'total_price', v_total,
        'variation', v_selected_variation
      )
    ),
    v_total,
    NULL,
    0,
    NULL,
    v_total,
    p_payment_method,
    v_total,
    0,
    'PolyMart Online Customer',
    'PolyMart Order ID: ' || p_order_id::text,
    p_served_by,
    'COMPLETED'
  ) RETURNING id INTO v_transaction_id;

  -- 5. Rekod POS Log
  INSERT INTO business_pos_logs (
    business_id,
    transaction_id,
    actor_id,
    action_type,
    description,
    metadata
  ) VALUES (
    p_business_id,
    v_transaction_id,
    p_served_by,
    'TRANSACTION_CREATE',
    'Completed PolyMart Order ' || v_invoice_num,
    jsonb_build_object(
      'source', 'POLYMART',
      'polymart_order_id', p_order_id,
      'amount', v_total,
      'variation', v_selected_variation
    )
  );
END;
$$;
