-- ═══════════════════════════════════════════════════════════════
-- PolyMart Online Payment Management System
-- Adds QR payment support, COD toggle, payment deadlines, auto-cancel
-- ═══════════════════════════════════════════════════════════════

-- 1. Tetapan Pembayaran pada Perniagaan
ALTER TABLE public.keusahawanan_businesses
  ADD COLUMN IF NOT EXISTS online_payment_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cod_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_qr_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS business_phone TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_deadline_value INT DEFAULT 24,
  ADD COLUMN IF NOT EXISTS payment_deadline_unit TEXT DEFAULT 'HOURS'
    CHECK (payment_deadline_unit IN ('HOURS', 'DAYS', 'WEEKS'));

-- 2. Override per-produk (NULL = ikut perniagaan)
ALTER TABLE public.business_products
  ADD COLUMN IF NOT EXISTS online_payment_enabled BOOLEAN DEFAULT NULL;

-- 3. Data Pembayaran pada Pesanan
ALTER TABLE public.polymart_orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'COD'
    CHECK (payment_method IN ('COD', 'QR_ONLINE')),
  ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_receipt_rejected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_verified_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS payment_deadline_at TIMESTAMPTZ DEFAULT NULL;

-- Index FK
CREATE INDEX IF NOT EXISTS idx_polymart_orders_payment_verified_by
  ON public.polymart_orders(payment_verified_by);

-- Partial index for auto-cancel cron query (very lightweight)
CREATE INDEX IF NOT EXISTS idx_polymart_orders_pending_deadline
  ON public.polymart_orders(payment_deadline_at)
  WHERE status = 'PENDING' AND payment_verified_at IS NULL;

-- 4. Function auto-cancel expired orders
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

-- 5. Function get expiring orders (for reminder notifications)
CREATE OR REPLACE FUNCTION public.get_expiring_polymart_orders()
RETURNS TABLE(id UUID, buyer_id UUID, product_name TEXT, payment_deadline_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.buyer_id,
         COALESCE(p.name, 'Produk'),
         o.payment_deadline_at
  FROM polymart_orders o
  LEFT JOIN business_products p ON p.id = o.product_id
  WHERE o.status = 'PENDING'
    AND o.payment_verified_at IS NULL
    AND o.payment_deadline_at IS NOT NULL
    AND o.payment_deadline_at BETWEEN NOW() + interval '55 minutes'
                                   AND NOW() + interval '65 minutes';
$$;

-- 6. Storage Bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('polymart-receipts', 'polymart-receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "polymart_receipts_insert_authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'polymart-receipts');

CREATE POLICY "polymart_receipts_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'polymart-receipts');
