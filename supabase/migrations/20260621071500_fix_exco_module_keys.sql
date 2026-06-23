-- Migration: Fix exco_module keys in portal_settings
-- Description: Align exco_module values in portal_settings with excoModules config IDs (kebajikan, keusahawanan, akademik)

UPDATE public.portal_settings SET exco_module = 'kebajikan' WHERE exco_module = 'e-kebajikan';
UPDATE public.portal_settings SET exco_module = 'keusahawanan' WHERE exco_module = 'e-keusahawanan';
UPDATE public.portal_settings SET exco_module = 'akademik' WHERE exco_module = 'e-akademik';
