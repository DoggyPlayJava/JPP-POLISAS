-- 1. Tambah nilai SUSPENDED pada enum polyrent_status
-- CREATE TYPE polyrent_status AS ENUM ('OPEN', 'CLOSED', 'HIDDEN'); -- Ini asal
ALTER TYPE polyrent_status ADD VALUE IF NOT EXISTS 'SUSPENDED';

-- 2. Buat jadual polyrent_location_reviews
CREATE TABLE IF NOT EXISTS polyrent_location_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kawasan_id UUID NOT NULL REFERENCES klk_kawasan(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    safety_rating INT NOT NULL CHECK (safety_rating >= 1 AND safety_rating <= 5),
    facility_rating INT NOT NULL CHECK (facility_rating >= 1 AND facility_rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Seorang pengguna hanya boleh review kawasan yang sama sekali sahaja
    UNIQUE(kawasan_id, reviewer_id)
);

-- RLS untuk polyrent_location_reviews
ALTER TABLE polyrent_location_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua pengguna boleh baca review kawasan"
    ON polyrent_location_reviews FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Pengguna boleh tambah review sendiri"
    ON polyrent_location_reviews FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Pengguna boleh update review sendiri"
    ON polyrent_location_reviews FOR UPDATE
    TO authenticated
    USING (auth.uid() = reviewer_id);

CREATE POLICY "Pengguna boleh buang review sendiri"
    ON polyrent_location_reviews FOR DELETE
    TO authenticated
    USING (auth.uid() = reviewer_id);


-- 3. Buat jadual polyrent_reports untuk Community Flagging
CREATE TABLE IF NOT EXISTS polyrent_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES polyrent_listings(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEWED', 'ACTION_TAKEN', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Seorang pengguna hanya boleh lapor iklan yang sama sekali sahaja
    UNIQUE(listing_id, reporter_id)
);

-- RLS untuk polyrent_reports
ALTER TABLE polyrent_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin boleh baca semua report"
    ON polyrent_reports FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN_JPP', 'JPP')
        )
    );

CREATE POLICY "Pengguna boleh baca report sendiri"
    ON polyrent_reports FOR SELECT
    TO authenticated
    USING (auth.uid() = reporter_id);

CREATE POLICY "Pengguna boleh tambah report"
    ON polyrent_reports FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

-- 4. Fungsi automasi (Trigger) untuk gantung iklan yang di-report 5 kali
CREATE OR REPLACE FUNCTION polyrent_check_report_threshold()
RETURNS TRIGGER AS $$
DECLARE
    report_count INT;
BEGIN
    -- Kira jumlah laporan unik untuk iklan ini
    SELECT COUNT(*) INTO report_count
    FROM polyrent_reports
    WHERE listing_id = NEW.listing_id;

    -- Jika 5 laporan diterima, tukar status iklan ke 'SUSPENDED'
    IF report_count >= 5 THEN
        UPDATE polyrent_listings
        SET status = 'SUSPENDED'
        WHERE id = NEW.listing_id AND status != 'SUSPENDED';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_polyrent_report_inserted ON polyrent_reports;
CREATE TRIGGER on_polyrent_report_inserted
    AFTER INSERT ON polyrent_reports
    FOR EACH ROW
    EXECUTE FUNCTION polyrent_check_report_threshold();
