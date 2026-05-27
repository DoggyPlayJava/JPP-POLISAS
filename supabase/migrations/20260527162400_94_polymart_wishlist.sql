-- 94_polymart_wishlist.sql
-- Save-for-later / wishlist feature

CREATE TABLE IF NOT EXISTS polymart_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  product_id UUID NOT NULL REFERENCES business_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- FK Indexes
CREATE INDEX IF NOT EXISTS idx_pm_wishlist_user ON polymart_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_wishlist_product ON polymart_wishlist(product_id);

-- RLS
ALTER TABLE polymart_wishlist ENABLE ROW LEVEL SECURITY;

-- User can only see/manage their own wishlist
CREATE POLICY "polymart_wishlist_select" ON polymart_wishlist
FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "polymart_wishlist_insert" ON polymart_wishlist
FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "polymart_wishlist_delete" ON polymart_wishlist
FOR DELETE USING (user_id = (SELECT auth.uid()));
