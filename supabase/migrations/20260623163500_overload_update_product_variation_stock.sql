-- Overload 1: Both changes are numeric
CREATE OR REPLACE FUNCTION public.update_product_variation_stock(
  p_product_id UUID,
  p_variation TEXT,
  p_qty_change NUMERIC,
  p_reserved_change NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.update_product_variation_stock(
    p_product_id,
    p_variation,
    p_qty_change::integer,
    p_reserved_change::integer
  );
END;
$$;

-- Overload 2: Quantity change is INT, reserved change is NUMERIC
CREATE OR REPLACE FUNCTION public.update_product_variation_stock(
  p_product_id UUID,
  p_variation TEXT,
  p_qty_change INT,
  p_reserved_change NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.update_product_variation_stock(
    p_product_id,
    p_variation,
    p_qty_change,
    p_reserved_change::integer
  );
END;
$$;

-- Overload 3: Quantity change is NUMERIC, reserved change is INT
CREATE OR REPLACE FUNCTION public.update_product_variation_stock(
  p_product_id UUID,
  p_variation TEXT,
  p_qty_change NUMERIC,
  p_reserved_change INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.update_product_variation_stock(
    p_product_id,
    p_variation,
    p_qty_change::integer,
    p_reserved_change
  );
END;
$$;

-- Grant EXECUTE to public roles on these new overloads
GRANT EXECUTE ON FUNCTION public.update_product_variation_stock(UUID, TEXT, NUMERIC, NUMERIC) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_product_variation_stock(UUID, TEXT, INT, NUMERIC) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_product_variation_stock(UUID, TEXT, NUMERIC, INT) TO anon, authenticated, service_role;

-- Reload Postgrest schema cache
NOTIFY pgrst, 'reload schema';
