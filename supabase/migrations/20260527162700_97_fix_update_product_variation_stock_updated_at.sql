-- Fix public.update_product_variation_stock function by removing non-existent column updated_at
CREATE OR REPLACE FUNCTION public.update_product_variation_stock(
  p_product_id uuid,
  p_variation text,
  p_qty_change integer,
  p_reserved_change integer
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
      reserved_stock = v_total_reserved
    WHERE id = p_product_id;

  ELSE
    -- Tiada variasi, kemas kini kuantiti utama produk secara biasa
    UPDATE business_products
    SET 
      stock_quantity = GREATEST(0, stock_quantity + p_qty_change),
      reserved_stock = GREATEST(0, reserved_stock + p_reserved_change)
    WHERE id = p_product_id;
  END IF;
END;
$function$;

-- Fix public.complete_polymart_order function by explicitly casting p_payment_method text parameter to pos_payment_method enum type
CREATE OR REPLACE FUNCTION public.complete_polymart_order(
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
    p_payment_method::pos_payment_method,
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

-- Fix polymart_cart_items unique index and selected_variation default constraint
-- 1. Drop existing indexes/constraints if any
DROP INDEX IF EXISTS "uq_polymart_cart_item_variation";
ALTER TABLE "public"."polymart_cart_items" DROP CONSTRAINT IF EXISTS "uq_polymart_cart_item";
ALTER TABLE "public"."polymart_cart_items" DROP CONSTRAINT IF EXISTS "uq_polymart_cart_item_variation_constraint";

-- 2. Update column selected_variation to NOT NULL with DEFAULT ''
UPDATE "public"."polymart_cart_items" 
SET "selected_variation" = '' 
WHERE "selected_variation" IS NULL;

ALTER TABLE "public"."polymart_cart_items"
ALTER COLUMN "selected_variation" SET DEFAULT '',
ALTER COLUMN "selected_variation" SET NOT NULL;

-- 3. Create a clean unique index that is compatible with PostgREST onConflict upserts
CREATE UNIQUE INDEX IF NOT EXISTS "uq_polymart_cart_item_variation_v2" 
ON "public"."polymart_cart_items" ("buyer_id", "product_id", "selected_variation");

ALTER TABLE "public"."polymart_cart_items"
ADD CONSTRAINT "uq_polymart_cart_item_variation_constraint" 
UNIQUE USING INDEX "uq_polymart_cart_item_variation_v2";
