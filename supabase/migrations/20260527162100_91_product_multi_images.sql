-- 91_product_multi_images.sql
-- Adds multi-image support for product galleries

ALTER TABLE business_products 
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}'::TEXT[];
-- Existing image_url column retained as primary thumbnail for backward compat
