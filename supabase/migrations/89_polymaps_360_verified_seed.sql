-- ==============================================================================
-- Migration: 89_polymaps_360_verified_seed.sql
-- Modul: PolyMaps 360° Panorama
-- Keterangan: Pembenihan URL 360 Panorama Beresolusi Tinggi (200 OK Verified)
--             dari Projek normane176680/my-map-polisas untuk semua bangunan POLISAS.
-- ==============================================================================

-- 1. Pastikan Lajur panorama_360_url Wujud
ALTER TABLE public.imaps_buildings 
ADD COLUMN IF NOT EXISTS panorama_360_url TEXT;

ALTER TABLE public.imaps_locations 
ADD COLUMN IF NOT EXISTS panorama_360_url TEXT;

-- 2. Kemaskini Bangunan Utama (PENTADBIRAN & JABATAN UTAMA)
UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/PENTADBIRAN/PEJABAT%20PENGARAH,%20TIMBALAN%20PENGARAH%20AKEDEMIK%20JAMBATAN%20MATEMATIK%20DAN%20SAINS%20JMSK.jpg'
WHERE name ILIKE '%PENTADBIRAN%' OR code ILIKE '%ADMIN%';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/PJ/jka.jpg'
WHERE name ILIKE '%BENGKEL JKA%' OR name ILIKE '%Kejuruteraan Awam%' OR code = 'PJ';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/JKE_A/a101.png'
WHERE name ILIKE '%Blok A JKE%' OR code IN ('JKE A', 'JKEA');

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/JKE_B/b101.png'
WHERE name ILIKE '%Blok B JKE%' OR code IN ('JKE B', 'JKEB');

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/JKE_C/c101.png'
WHERE name ILIKE '%Blok C JKE%' OR code IN ('JKE C', 'JKEC');

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/JTM/BANGUNAN%20JTM.jpg'
WHERE name ILIKE '%BANGUNAN JTM%' OR name ILIKE '%MAKMAL JTM%' OR code = 'JTM';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/PH/PH/BILIK%20KULIAH%20PH%20402.jpg'
WHERE name ILIKE '%BANGUNAN PH%' OR code IN ('PH', 'JPH');

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/MahkotaSquare/BILIK%20LATIHAN%20ULPL.png'
WHERE name ILIKE '%MAHKOTA SQUARE%';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/hall/Dewan%20sri%20mahkota.jpg'
WHERE name ILIKE '%DEWAN SRI MAHKOTA%';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/hall/audi%20dan%20dewan%20mahkota.jpg'
WHERE name ILIKE '%DEWAN AUDITORIUM JABATAN PERDAGANGAN%' OR (name ILIKE '%AUDITORIUM%' AND code = 'JP');

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/hall/audi%20jke.jpg'
WHERE name ILIKE '%DEWAN AUDITORIUM JABATAN KEJURUTERAAN ELEKTRIK%' OR (name ILIKE '%AUDITORIUM%' AND code ILIKE '%JKE%');

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/JKE/bilik%20kuliah%202.png'
WHERE name ILIKE '%DEWAN KULIAH 2%' OR code = 'DK2';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/JKE/cendawan%20jke.png'
WHERE name ILIKE '%Cendawan%' OR code = 'IC';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/JKE/computer%20centre.png'
WHERE name ILIKE '%Makmal Komputer JKE%' OR code = 'F JKE';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/U5/BILIK%20AHU%203%20_%20BILIK%20PENGURUSAN%20JP.png'
WHERE name ILIKE '%BLOK A JABATAN PERDAGANGAN%' OR code = 'JP BLOK A';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/JP%20BLOK%20B/BILIK%20AHU%201.jpg'
WHERE name ILIKE '%BLOK B JABATAN PERDAGANGAN%' OR code = 'JP BLOK B';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/ME/me001.jpg'
WHERE name ILIKE '%BLOK ME%' OR code = 'ME';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/U13/CAD%20CAM%20MACHINING%20CENTER%201.jpg'
WHERE name ILIKE '%BANGUNAN JKM 2%';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/U12/PEJABAT%20JKM%201.jpg'
WHERE name ILIKE '%BENGKEL MEKANIKAL%';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/Workshop/BENGKEL%20KIMPALAN.png'
WHERE name ILIKE '%BENGKEL KIMPALAN%';

-- 3. Kemaskini Kompleks Kolej Kediaman & Fasiliti Awam
UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/KAMSIS/KAMSIS%20IBNU%20SINA.jpg'
WHERE name ILIKE '%KAMSIS IBNU SINA%' OR code = 'IS';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/KAMSIS/KAMSIS%20AL-BIRUNI.jpg'
WHERE name ILIKE '%BLOK KASIS%' OR name ILIKE '%AL-BIRUNI%';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/KAMSIS/KAMSIS%20SITI%20HAJAR.jpg'
WHERE name ILIKE '%BLOK SITI HAJAR%';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/KAMSIS/SURAU%20FATIMAH%20AZ-ZAHRA.jpg'
WHERE name ILIKE '%SURAU FAZ%' OR name ILIKE '%AZ-ZAHRA%';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/Cafe/Cafe_AB.jpg'
WHERE name ILIKE '%KAFE AL-BIRUNI%' OR code = 'KAFE AB';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/Cafe/POLYBUS.jpg'
WHERE name ILIKE '%POLYBUS%';

UPDATE public.imaps_buildings 
SET panorama_360_url = 'https://normane176680.github.io/my-map-polisas/image/fasiliti/HENTIAN%20BAS.png'
WHERE name ILIKE '%PERHENTIAN BUS RAPID%' OR code = 'RAPID';

-- Indeks untuk pencarian pantas
CREATE INDEX IF NOT EXISTS idx_imaps_buildings_panorama ON public.imaps_buildings(panorama_360_url) WHERE panorama_360_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_imaps_locations_panorama ON public.imaps_locations(panorama_360_url) WHERE panorama_360_url IS NOT NULL;
