-- Migration untuk Sistem Troli PolyMart (Shopping Cart)

CREATE TABLE IF NOT EXISTS public.polymart_cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a user can only have one row per product in their cart (upsert friendly)
    CONSTRAINT uq_polymart_cart_item UNIQUE (buyer_id, product_id)
);

-- Enable RLS
ALTER TABLE public.polymart_cart_items ENABLE ROW LEVEL SECURITY;

-- Policy: User can only see, insert, update, and delete their own cart items
CREATE POLICY "Users can manage their own cart items" ON public.polymart_cart_items
    FOR ALL
    USING (buyer_id = (SELECT auth.uid()))
    WITH CHECK (buyer_id = (SELECT auth.uid()));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_polymart_cart_buyer ON public.polymart_cart_items(buyer_id);
