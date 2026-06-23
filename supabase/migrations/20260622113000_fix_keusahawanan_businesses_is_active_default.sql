-- Set default value for is_active in keusahawanan_businesses to true
ALTER TABLE public.keusahawanan_businesses ALTER COLUMN is_active SET DEFAULT true;

-- Update existing records where is_active is NULL to true
UPDATE public.keusahawanan_businesses SET is_active = true WHERE is_active IS NULL;
