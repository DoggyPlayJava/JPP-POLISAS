-- 1. Tambah lajur `reserved_stock` pada `business_products`
ALTER TABLE "public"."business_products"
ADD COLUMN IF NOT EXISTS "reserved_stock" integer NOT NULL DEFAULT 0;

-- 2. Tambah komen untuk rujukan
COMMENT ON COLUMN "public"."business_products"."reserved_stock" IS 'Kuantiti stok yang telah ditempah di PolyMart tetapi belum selesai/diambil';

-- 3. Tambah kekangan CHECK supaya stok tidak negatif
-- Nota: stock_quantity boleh jadi 0, reserved_stock boleh jadi 0.
-- Stok yang boleh dijual di POS = stock_quantity - reserved_stock
-- stock_quantity sentiasa >= reserved_stock
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_stock_reserved_logic'
    ) THEN
        ALTER TABLE "public"."business_products"
        ADD CONSTRAINT check_stock_reserved_logic CHECK (stock_quantity >= reserved_stock);
    END IF;
END $$;


-- 4. Create RPC to Reserve Stock for PolyMart Order
CREATE OR REPLACE FUNCTION reserve_polymart_stock(
  p_product_id UUID,
  p_quantity INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INT;
  v_current_reserved INT;
BEGIN
  -- Get current stock and reserved stock, locking the row
  SELECT stock_quantity, reserved_stock 
  INTO v_current_stock, v_current_reserved
  FROM business_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Check if enough available stock
  IF (v_current_stock - v_current_reserved) < p_quantity THEN
    RAISE EXCEPTION 'Insufficient available stock. Only % items available.', (v_current_stock - v_current_reserved);
  END IF;

  -- Increment reserved stock
  UPDATE business_products
  SET reserved_stock = reserved_stock + p_quantity
  WHERE id = p_product_id;
END;
$$;


-- 5. Create RPC to Release Reserved Stock (e.g. order cancelled)
CREATE OR REPLACE FUNCTION release_polymart_stock(
  p_product_id UUID,
  p_quantity INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE business_products
  SET reserved_stock = GREATEST(0, reserved_stock - p_quantity)
  WHERE id = p_product_id;
END;
$$;


-- 6. Create RPC to Complete PolyMart Order (deducts stock, creates transaction)
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
  v_total DECIMAL;
BEGIN
  -- Calculate total
  v_total := p_quantity * p_unit_price;

  -- 1. Deduct actual stock and reserved stock
  UPDATE business_products
  SET 
    stock_quantity = GREATEST(0, stock_quantity - p_quantity),
    reserved_stock = GREATEST(0, reserved_stock - p_quantity)
  WHERE id = p_product_id
  RETURNING name INTO v_product_name;

  -- 2. Update PolyMart order status
  UPDATE polymart_orders
  SET status = 'COMPLETED'
  WHERE id = p_order_id;

  -- 3. Generate Invoice Number (e.g. PM-YYYYMMDD-XXXX)
  v_invoice_num := 'PM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(p_order_id::text from 1 for 4));

  -- 4. Create Business Transaction for Ledger Sync
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
        'total_price', v_total
      )
    ),
    v_total,
    NULL,
    0,
    NULL,
    v_total,
    p_payment_method, -- 'CASH', 'QR', or 'TRANSFER'
    v_total,
    0,
    'PolyMart Online Customer',
    'PolyMart Order ID: ' || p_order_id::text,
    p_served_by,
    'COMPLETED'
  ) RETURNING id INTO v_transaction_id;

  -- 5. Create POS Log
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
      'amount', v_total
    )
  );

END;
$$;
