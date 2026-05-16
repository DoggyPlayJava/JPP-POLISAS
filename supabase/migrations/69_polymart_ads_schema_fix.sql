-- =============================================================
-- MIGRATION: 69_polymart_ads_schema_fix.sql
-- Fix: Cipta table polymart_ads dengan RLS yang betul
-- Punca isu: Table mungkin wujud tanpa RLS atau policy SELECT
--            yang membenarkan admin membaca rekod.
-- =============================================================

-- 1. Cipta table jika belum ada
CREATE TABLE IF NOT EXISTS public.polymart_ads (
    id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    title        TEXT        NOT NULL,
    image_url    TEXT        NOT NULL,
    link_url     TEXT,
    type         TEXT        NOT NULL DEFAULT 'INTERNAL' CHECK (type IN ('INTERNAL', 'EXTERNAL')),
    status       TEXT        NOT NULL DEFAULT 'DRAFT'    CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE')),
    start_date   TIMESTAMPTZ,
    end_date     TIMESTAMPTZ,
    clicks       INTEGER     NOT NULL DEFAULT 0,
    created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Aktifkan RLS
ALTER TABLE public.polymart_ads ENABLE ROW LEVEL SECURITY;

-- 3. Drop semua policy lama supaya tidak konflik
DROP POLICY IF EXISTS "Public can view active ads"           ON public.polymart_ads;
DROP POLICY IF EXISTS "Admins can manage all ads"           ON public.polymart_ads;
DROP POLICY IF EXISTS "Admin read polymart_ads"             ON public.polymart_ads;
DROP POLICY IF EXISTS "Admin insert polymart_ads"           ON public.polymart_ads;
DROP POLICY IF EXISTS "Admin update polymart_ads"           ON public.polymart_ads;
DROP POLICY IF EXISTS "Admin delete polymart_ads"           ON public.polymart_ads;
DROP POLICY IF EXISTS "Authenticated can click ads"         ON public.polymart_ads;

-- 4. POLICY: Pengguna awam boleh baca iklan ACTIVE sahaja (untuk PolyMartHome)
CREATE POLICY "Public can view active ads"
    ON public.polymart_ads
    FOR SELECT
    USING (status = 'ACTIVE');

-- 5. POLICY: Admin (hasKeusahawananAccess / isSuperAdmin) boleh baca SEMUA iklan
--    Ini adalah punca isu — tanpa policy ini, admin tidak nampak DRAFT/INACTIVE
CREATE POLICY "Admin read polymart_ads"
    ON public.polymart_ads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );

-- 6. POLICY: Admin boleh insert iklan baru
CREATE POLICY "Admin insert polymart_ads"
    ON public.polymart_ads
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );

-- 7. POLICY: Admin boleh update iklan
CREATE POLICY "Admin update polymart_ads"
    ON public.polymart_ads
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );

-- 8. POLICY: Admin boleh delete iklan
CREATE POLICY "Admin delete polymart_ads"
    ON public.polymart_ads
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );

-- 9. RPC: Increment click counter (selamat, dipanggil oleh semua pengguna)
CREATE OR REPLACE FUNCTION public.increment_polymart_ad_click(ad_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.polymart_ads
    SET clicks = clicks + 1
    WHERE id = ad_id
    AND status = 'ACTIVE';
END;
$$;

-- Revoke public execute, grant hanya kepada authenticated
REVOKE EXECUTE ON FUNCTION public.increment_polymart_ad_click(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.increment_polymart_ad_click(UUID) TO authenticated;

-- 10. Index untuk performance
CREATE INDEX IF NOT EXISTS idx_polymart_ads_status     ON public.polymart_ads(status);
CREATE INDEX IF NOT EXISTS idx_polymart_ads_created_by ON public.polymart_ads(created_by);
CREATE INDEX IF NOT EXISTS idx_polymart_ads_dates      ON public.polymart_ads(start_date, end_date);

-- 11. Storage bucket untuk banner iklan (jika belum wujud)
INSERT INTO storage.buckets (id, name, public)
VALUES ('polymart-ads', 'polymart-ads', true)
ON CONFLICT (id) DO NOTHING;

-- Policy storage: Admin boleh upload
DROP POLICY IF EXISTS "Admin can upload polymart ads images" ON storage.objects;
CREATE POLICY "Admin can upload polymart ads images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'polymart-ads'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );

DROP POLICY IF EXISTS "Public can view polymart ads images" ON storage.objects;
CREATE POLICY "Public can view polymart ads images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'polymart-ads');

DROP POLICY IF EXISTS "Admin can delete polymart ads images" ON storage.objects;
CREATE POLICY "Admin can delete polymart ads images"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'polymart-ads'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );

-- Semak keadaan akhir
DO $$
BEGIN
    RAISE NOTICE 'polymart_ads migration selesai. Sila semak RLS policies di Supabase dashboard.';
END $$;
