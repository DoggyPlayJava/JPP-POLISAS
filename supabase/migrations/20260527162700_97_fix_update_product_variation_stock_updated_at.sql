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
