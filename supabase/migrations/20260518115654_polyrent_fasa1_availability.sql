-- PolyRent Fasa 1: Quick Wins
-- 1. Tambah lajur available_from untuk kalendar ketersediaan rumah sewa.
ALTER TABLE polyrent_listings
ADD COLUMN IF NOT EXISTS available_from DATE DEFAULT CURRENT_DATE;

-- (Pilihan) Kita boleh mencipta fungsi untuk Smart Pricing Engine (RPC)
-- Tetapi memandangkan logic lebih mudah dikawal di frontend menggunakan array map/reduce,
-- kita fokuskan pada struktur data terlebih dahulu.

CREATE OR REPLACE FUNCTION polyrent_get_average_rent(lokasi_query text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_rent numeric;
BEGIN
  -- Carian tidak sensitif huruf (ILIKE) untuk mencari purata harga bilik di kawasan tersebut
  SELECT avg(sewa_bulanan) INTO avg_rent
  FROM polyrent_listings
  WHERE lokasi ILIKE '%' || lokasi_query || '%'
  AND status = 'OPEN';
  
  RETURN COALESCE(avg_rent, 0);
END;
$$;
