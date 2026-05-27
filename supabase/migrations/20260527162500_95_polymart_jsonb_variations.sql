-- 20260527162500_95_polymart_jsonb_variations.sql
-- Penjejakan stok berstruktur bagi variasi (JSONB) & Pengurusan troli bersaiz unik

-- 1. Tukar lajur `variations` daripada `TEXT[]` kepada `JSONB` pada `business_products`
-- Sedia ada TEXT[] dijatuhkan (tiada data berharga kerana variasi belum dilancarkan penuh)
ALTER TABLE "public"."business_products" 
DROP COLUMN IF EXISTS "variations";

ALTER TABLE "public"."business_products" 
ADD COLUMN "variations" JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN "public"."business_products"."variations" IS 'Variasi produk dalam format JSONB array: [{"name": "S", "stock": 10, "reserved": 2}, ...]';

-- 2. Tambah lajur `selected_variation` pada `polymart_cart_items`
ALTER TABLE "public"."polymart_cart_items"
ADD COLUMN IF NOT EXISTS "selected_variation" TEXT DEFAULT NULL;

-- 3. Tukar UNIQUE constraint troli supaya membolehkan berbilang variasi berbeza bagi produk yang sama
ALTER TABLE "public"."polymart_cart_items" 
DROP CONSTRAINT IF EXISTS "uq_polymart_cart_item";

CREATE UNIQUE INDEX IF NOT EXISTS "uq_polymart_cart_item_variation" 
ON "public"."polymart_cart_items" ("buyer_id", "product_id", COALESCE("selected_variation", ''));

-- 4. Helper Function: update_product_variation_stock
CREATE OR REPLACE FUNCTION update_product_variation_stock(
  p_product_id UUID,
  p_variation TEXT,
  p_qty_change INT,
  p_reserved_change INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_variations JSONB;
  v_var RECORD;
  v_found BOOLEAN := FALSE;
  v_new_variations JSONB := '[]'::jsonb;
  v_total_stock INT := 0;
  v_total_reserved INT := 0;
BEGIN
  -- Dapatkan senarai variasi semasa berserta baris dikunci untuk elak race condition
  SELECT variations
  INTO v_variations
  FROM business_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak wujud.';
  END IF;

  -- Jika variasi dibekalkan dan produk memang mempunyai senarai variasi
  IF p_variation IS NOT NULL AND p_variation <> '' AND jsonb_array_length(COALESCE(v_variations, '[]'::jsonb)) > 0 THEN
    FOR v_var IN SELECT * FROM jsonb_to_recordset(v_variations) AS x(name TEXT, stock INT, reserved INT) LOOP
      IF v_var.name = p_variation THEN
        v_var.stock := GREATEST(0, v_var.stock + p_qty_change);
        v_var.reserved := GREATEST(0, COALESCE(v_var.reserved, 0) + p_reserved_change);
        
        -- Sahkan stok fizikal mencukupi berbanding stok ditempah
        IF v_var.stock < v_var.reserved THEN
          RAISE EXCEPTION 'Stok variasi % tidak mencukupi. Stok: %, Ditempah: %', v_var.name, v_var.stock, v_var.reserved;
        END IF;
        
        v_found := TRUE;
      END IF;

      v_new_variations := v_new_variations || jsonb_build_object(
        'name', v_var.name,
        'stock', v_var.stock,
        'reserved', COALESCE(v_var.reserved, 0)
      );
      v_total_stock := v_total_stock + v_var.stock;
      v_total_reserved := v_total_reserved + COALESCE(v_var.reserved, 0);
    END LOOP;

    IF NOT v_found THEN
      RAISE EXCEPTION 'Variasi % tidak wujud pada produk ini.', p_variation;
    END IF;

    -- Simpan semula ke dalam business_products
    UPDATE business_products
    SET 
      variations = v_new_variations,
      stock_quantity = v_total_stock,
      reserved_stock = v_total_reserved,
      updated_at = NOW()
    WHERE id = p_product_id;

  ELSE
    -- Tiada variasi, kemas kini kuantiti utama produk secara biasa
    UPDATE business_products
    SET 
      stock_quantity = GREATEST(0, stock_quantity + p_qty_change),
      reserved_stock = GREATEST(0, reserved_stock + p_reserved_change),
      updated_at = NOW()
    WHERE id = p_product_id;
  END IF;
END;
$$;

-- 5. Rebuild: reserve_polymart_stock
CREATE OR REPLACE FUNCTION reserve_polymart_stock(
  p_product_id UUID,
  p_quantity INT,
  p_variation TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INT;
  v_current_reserved INT;
  v_variations JSONB;
  v_var RECORD;
  v_found BOOLEAN := FALSE;
BEGIN
  -- Ambil stok utama & senarai variasi (kunci rekod)
  SELECT stock_quantity, reserved_stock, variations 
  INTO v_current_stock, v_current_reserved, v_variations
  FROM business_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak wujud.';
  END IF;

  -- Jika variasi dipilih dan produk ada variasi
  IF p_variation IS NOT NULL AND p_variation <> '' AND jsonb_array_length(COALESCE(v_variations, '[]'::jsonb)) > 0 THEN
    FOR v_var IN SELECT * FROM jsonb_to_recordset(v_variations) AS x(name TEXT, stock INT, reserved INT) LOOP
      IF v_var.name = p_variation THEN
        IF (v_var.stock - COALESCE(v_var.reserved, 0)) < p_quantity THEN
          RAISE EXCEPTION 'Stok bagi variasi % tidak mencukupi. Baki boleh dijual: % unit.', p_variation, (v_var.stock - COALESCE(v_var.reserved, 0));
        END IF;
        v_found := TRUE;
      END IF;
    END LOOP;

    IF NOT v_found THEN
      RAISE EXCEPTION 'Variasi % tidak wujud pada produk ini.', p_variation;
    END IF;

    -- Jalankan tempahan stok variasi
    PERFORM update_product_variation_stock(p_product_id, p_variation, 0, p_quantity);
  ELSE
    -- Tempahan stok produk biasa tanpa variasi
    IF (v_current_stock - v_current_reserved) < p_quantity THEN
      RAISE EXCEPTION 'Stok tidak mencukupi. Baki boleh dijual: % unit.', (v_current_stock - v_current_reserved);
    END IF;

    PERFORM update_product_variation_stock(p_product_id, NULL, 0, p_quantity);
  END IF;
END;
$$;

-- 6. Rebuild: release_polymart_stock
CREATE OR REPLACE FUNCTION release_polymart_stock(
  p_product_id UUID,
  p_quantity INT,
  p_variation TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM update_product_variation_stock(p_product_id, p_variation, 0, -p_quantity);
END;
$$;

-- 7. Rebuild: complete_polymart_order dengan sokongan stok JSONB
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
  SELECT status, selected_variation INTO v_order_status, v_selected_variation
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

  -- Ambil nama produk
  SELECT name INTO v_product_name FROM business_products WHERE id = p_product_id;

  -- Tolak stok fizikal & stok yang ditempah menggunakan helper
  PERFORM update_product_variation_stock(p_product_id, v_selected_variation, -p_quantity, -p_quantity);

  -- Kemas kini status pesanan PolyMart
  UPDATE polymart_orders
  SET status = 'COMPLETED',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Bina No Invois Sync
  v_invoice_num := 'PM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(p_order_id::text from 1 for 4));

  -- Masukkan ke dalam lejar POS
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

  -- Rekod POS Log
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

-- 8. Rebuild: buyer_cancel_polymart_order dengan pembebasan stok JSONB
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
  SELECT status, buyer_id, product_id, quantity, business_id, selected_variation
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

    -- Release reserved stock using helper
    PERFORM update_product_variation_stock(v_order.product_id, v_order.selected_variation, 0, -v_order.quantity);

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

-- 9. Rebuild: vendor_handle_cancellation dengan pembebasan stok JSONB
CREATE OR REPLACE FUNCTION vendor_handle_cancellation(
  p_order_id UUID,
  p_vendor_id UUID,
  p_action TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Lock and fetch order
  SELECT o.status, o.product_id, o.quantity, o.business_id, o.cancellation_requested_at, o.selected_variation,
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

    -- Release reserved stock using helper
    PERFORM update_product_variation_stock(v_order.product_id, v_order.selected_variation, 0, -v_order.quantity);

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
