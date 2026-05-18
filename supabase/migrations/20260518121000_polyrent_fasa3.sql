-- 1. Buat jadual polyrent_messages untuk In-App Chat
CREATE TABLE IF NOT EXISTS polyrent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES polyrent_listings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS untuk polyrent_messages
ALTER TABLE polyrent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna boleh baca mesej yang dihantar atau diterima"
    ON polyrent_messages FOR SELECT
    TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Pengguna boleh hantar mesej"
    ON polyrent_messages FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Penerima boleh kemaskini status is_read"
    ON polyrent_messages FOR UPDATE
    TO authenticated
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);


-- 2. Buat jadual polyrent_reverse_ads untuk "Papan Iklan Terbalik"
CREATE TABLE IF NOT EXISTS polyrent_reverse_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    budget NUMERIC NOT NULL,
    kawasan_id UUID REFERENCES klk_kawasan(id) ON DELETE SET NULL,
    jantina_prefer TEXT NOT NULL CHECK (jantina_prefer IN ('CAMPURAN', 'LELAKI', 'PEREMPUAN')),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    move_in_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS untuk polyrent_reverse_ads
ALTER TABLE polyrent_reverse_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua orang boleh baca reverse ads yang OPEN"
    ON polyrent_reverse_ads FOR SELECT
    TO authenticated
    USING (status = 'OPEN' OR auth.uid() = student_id);

CREATE POLICY "Pelajar boleh tambah reverse ad"
    ON polyrent_reverse_ads FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Pelajar boleh update reverse ad sendiri"
    ON polyrent_reverse_ads FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id);

CREATE POLICY "Pelajar boleh delete reverse ad sendiri"
    ON polyrent_reverse_ads FOR DELETE
    TO authenticated
    USING (auth.uid() = student_id);

-- Trigger untuk update_at
CREATE TRIGGER on_polyrent_reverse_ads_updated
    BEFORE UPDATE ON polyrent_reverse_ads
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
