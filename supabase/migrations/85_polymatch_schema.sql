-- Jadual untuk menyimpan iklan PolyMatch (Project/Roommate Finder)
CREATE TABLE IF NOT EXISTS public.polymatch_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('PROJECT', 'ROOMMATE')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    contact_info VARCHAR(255) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.polymatch_listings ENABLE ROW LEVEL SECURITY;

-- POLISI KESELAMATAN (RLS) - Guna (SELECT auth.uid()) seperti yang digariskan

-- 1. Semua pengguna berdaftar boleh BACA iklan yang OPEN
CREATE POLICY "Semua boleh baca iklan aktif" ON public.polymatch_listings
    FOR SELECT USING (
        status = 'OPEN' 
        OR (SELECT auth.uid()) = author_id
    );

-- 2. Pengguna boleh CIPTA iklan sendiri
CREATE POLICY "Pengguna boleh cipta iklan" ON public.polymatch_listings
    FOR INSERT WITH CHECK (
        (SELECT auth.uid()) = author_id
    );

-- 3. Pengguna boleh KEMASKINI iklan sendiri
CREATE POLICY "Pengguna boleh kemaskini iklan sendiri" ON public.polymatch_listings
    FOR UPDATE USING (
        (SELECT auth.uid()) = author_id
    ) WITH CHECK (
        (SELECT auth.uid()) = author_id
    );

-- 4. Pengguna boleh PADAM iklan sendiri
CREATE POLICY "Pengguna boleh padam iklan sendiri" ON public.polymatch_listings
    FOR DELETE USING (
        (SELECT auth.uid()) = author_id
    );

-- 5. JPP Admin boleh urus semua iklan
CREATE POLICY "JPP boleh urus semua iklan" ON public.polymatch_listings
    FOR ALL USING (
        is_jpp_admin((SELECT auth.uid()))
    ) WITH CHECK (
        is_jpp_admin((SELECT auth.uid()))
    );
