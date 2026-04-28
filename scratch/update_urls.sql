-- Skrip ini bertujuan untuk menukar URL lama ke URL baru dalam pangkalan data.
-- Jalankan skrip ini di dalam SQL Editor Proxmox anda selepas selesai memindahkan storage.

-- 1. Profiles
UPDATE profiles SET avatar_url = REPLACE(avatar_url, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE avatar_url LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';

-- 2. Clubs
UPDATE clubs SET logo_url = REPLACE(logo_url, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE logo_url LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';
UPDATE club_committee SET image_url = REPLACE(image_url, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE image_url LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';
UPDATE club_activities SET image_urls = string_to_array(REPLACE(array_to_string(image_urls, '|||'), 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io'), '|||') WHERE array_to_string(image_urls, '|||') LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';
UPDATE club_reports SET file_url = REPLACE(file_url, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE file_url LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';
UPDATE club_reports SET marked_file_url = REPLACE(marked_file_url, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE marked_file_url LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';

-- 3. Keusahawanan
UPDATE keusahawanan_businesses SET logo_url = REPLACE(logo_url, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE logo_url LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';
UPDATE business_products SET image_url = REPLACE(image_url, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE image_url LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';
UPDATE polymart_ads SET image_url = REPLACE(image_url, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE image_url LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';

-- 4. Kebajikan
UPDATE kebajikan_tickets SET image_urls = string_to_array(REPLACE(array_to_string(image_urls, '|||'), 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io'), '|||') WHERE array_to_string(image_urls, '|||') LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';

-- 5. Programs / Aktiviti
UPDATE programs SET url_kertas_kerja = REPLACE(url_kertas_kerja, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE url_kertas_kerja LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';
UPDATE programs SET url_post_mortem = REPLACE(url_post_mortem, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE url_post_mortem LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';
UPDATE programs SET image_urls = string_to_array(REPLACE(array_to_string(image_urls, '|||'), 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io'), '|||') WHERE array_to_string(image_urls, '|||') LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';

-- 6. Announcements & SUPSAS
UPDATE system_announcements SET image_url = REPLACE(image_url, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE image_url LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';
UPDATE supsas_editions SET banner_url = REPLACE(banner_url, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE banner_url LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';
UPDATE supsas_editions SET logo_url = REPLACE(logo_url, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE logo_url LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';
UPDATE supsas_kontingen SET logo_url = REPLACE(logo_url, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE logo_url LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';
UPDATE ai_tier_requests SET receipt_url = REPLACE(receipt_url, 'https://ujklcxfbmmzxsqtidjtz.supabase.co', 'http://192.168.0.20.sslip.io') WHERE receipt_url LIKE '%https://ujklcxfbmmzxsqtidjtz.supabase.co%';
