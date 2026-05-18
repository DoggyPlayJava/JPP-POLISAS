-- ==========================================================
-- PolySuara: Tukar had dari 5/hari → 5/sejam
-- ==========================================================

-- 1. Buang trigger lama (cari melalui function name, lebih selamat)
DROP TRIGGER IF EXISTS trg_polysuara_daily_limit ON public.polysuara_confessions;
DROP TRIGGER IF EXISTS trg_polysuara_hourly_limit ON public.polysuara_confessions;

-- 2. Bina semula function dengan had sejam + RAISE EXCEPTION betul
CREATE OR REPLACE FUNCTION public.check_polysuara_hourly_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_count INT;
BEGIN
    -- Pentadbir (JPP/Admin) dikecualikan daripada had
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = NEW.author_id
          AND role IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'SUPER_ADMIN')
    ) THEN
        RETURN NEW;
    END IF;

    -- Kira luahan dalam 1 jam terakhir
    SELECT COUNT(*) INTO v_count
    FROM public.polysuara_confessions
    WHERE author_id = NEW.author_id
      AND created_at >= NOW() - INTERVAL '1 hour';

    IF v_count >= 5 THEN
        -- SQLSTATE P0001 dihantar dengan betul supaya frontend dapat tangkap err.code
        RAISE EXCEPTION 'Had perkongsian per jam (5/jam) telah dicapai. Sila rehat sekejap.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Pasang semula trigger
CREATE TRIGGER trg_polysuara_hourly_limit
BEFORE INSERT ON public.polysuara_confessions
FOR EACH ROW EXECUTE FUNCTION public.check_polysuara_hourly_limit();
