-- Jadual Konfigurasi Moderasi
CREATE TABLE IF NOT EXISTS public.polyservices_moderation_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    report_threshold INTEGER DEFAULT 5,
    time_window_mins INTEGER DEFAULT 10,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Masukkan data awal jika belum ada
INSERT INTO public.polyservices_moderation_config (id, report_threshold, time_window_mins)
VALUES (1, 5, 10)
ON CONFLICT (id) DO NOTHING;

-- Tambah is_approved pada polymatch_listings untuk keseragaman sembunyi (auto-hide)
ALTER TABLE public.polymatch_listings ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;

-- Kemaskini RLS PolyMatch supaya hanya lihat yang di-approve
DROP POLICY IF EXISTS "Semua boleh baca iklan aktif" ON public.polymatch_listings;
CREATE POLICY "Semua boleh baca iklan aktif" ON public.polymatch_listings
    FOR SELECT USING (
        status = 'OPEN' 
        AND is_approved = true
        OR (SELECT auth.uid()) = author_id
    );

-- Jadual Laporan Pengguna (Reports)
CREATE TABLE IF NOT EXISTS public.polyservices_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_id UUID NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('SUARA', 'MATCH')),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_report_per_user UNIQUE (target_id, reporter_id)
);

ALTER TABLE public.polyservices_moderation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polyservices_reports ENABLE ROW LEVEL SECURITY;

-- RLS Config
CREATE POLICY "Semua boleh baca config moderasi" ON public.polyservices_moderation_config FOR SELECT USING (true);
CREATE POLICY "Hanya JPP boleh kemaskini config" ON public.polyservices_moderation_config FOR UPDATE USING (is_jpp_admin((SELECT auth.uid()))) WITH CHECK (is_jpp_admin((SELECT auth.uid())));

-- RLS Reports
CREATE POLICY "Pelajar boleh buat report" ON public.polyservices_reports FOR INSERT WITH CHECK ((SELECT auth.uid()) = reporter_id);
CREATE POLICY "JPP boleh baca report" ON public.polyservices_reports FOR SELECT USING (is_jpp_admin((SELECT auth.uid())));

-- RPC untuk submit report dan auto-hide
CREATE OR REPLACE FUNCTION submit_polyservices_report(
    p_target_id UUID,
    p_target_type VARCHAR,
    p_reason VARCHAR
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reporter_id UUID;
    v_config RECORD;
    v_recent_reports_count INTEGER;
BEGIN
    v_reporter_id := auth.uid();
    IF v_reporter_id IS NULL THEN
        RAISE EXCEPTION 'Sila log masuk untuk membuat laporan.';
    END IF;

    -- 1. Insert report
    INSERT INTO public.polyservices_reports (target_id, target_type, reporter_id, reason)
    VALUES (p_target_id, p_target_type, v_reporter_id, p_reason)
    ON CONFLICT (target_id, reporter_id) DO NOTHING;

    -- 2. Ambil konfigurasi semasa
    SELECT * INTO v_config FROM public.polyservices_moderation_config WHERE id = 1;

    -- 3. Kira jumlah laporan dalam tempoh masa (time_window_mins)
    SELECT COUNT(*) INTO v_recent_reports_count 
    FROM public.polyservices_reports
    WHERE target_id = p_target_id 
    AND created_at >= NOW() - (v_config.time_window_mins || ' minutes')::INTERVAL;

    -- 4. Jika melebihi threshold, auto-hide
    IF v_recent_reports_count >= v_config.report_threshold THEN
        IF p_target_type = 'SUARA' THEN
            UPDATE public.polysuara_confessions SET is_approved = false WHERE id = p_target_id;
        ELSIF p_target_type = 'MATCH' THEN
            UPDATE public.polymatch_listings SET is_approved = false WHERE id = p_target_id;
        END IF;
        
        RETURN jsonb_build_object('success', true, 'auto_hidden', true, 'reports', v_recent_reports_count);
    END IF;

    RETURN jsonb_build_object('success', true, 'auto_hidden', false, 'reports', v_recent_reports_count);
END;
$$;
