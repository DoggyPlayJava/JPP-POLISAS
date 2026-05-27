-- 92_flash_sale_preorder.sql
-- Adds flash sale pricing and pre-order capability

ALTER TABLE business_products 
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sale_start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sale_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preorder_deadline TIMESTAMPTZ;
