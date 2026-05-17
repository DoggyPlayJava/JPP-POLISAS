-- Jadual untuk menyimpan luahan PolySuara (Anonymous Confessions)
CREATE TABLE IF NOT EXISTS public.polysuara_confessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'UMUM',
    upvotes INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT true, -- JPP boleh tukar ke false jika ada unsur toksik
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Jadual untuk mengelakkan pengguna upvote dua kali
CREATE TABLE IF NOT EXISTS public.polysuara_upvotes (
    confession_id UUID REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (confession_id, user_id)
);

-- Enable RLS
ALTER TABLE public.polysuara_confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polysuara_upvotes ENABLE ROW LEVEL SECURITY;

-- POLISI KESELAMATAN (RLS) - SANGAT PENTING UNTUK ANON

-- 1. Semua pelajar boleh BACA luahan yang telah diluluskan
CREATE POLICY "Pelajar boleh baca luahan" ON public.polysuara_confessions
    FOR SELECT USING (
        is_approved = true
    );

-- 2. Pelajar boleh CIPTA luahan
CREATE POLICY "Pelajar boleh buat luahan" ON public.polysuara_confessions
    FOR INSERT WITH CHECK (
        (SELECT auth.uid()) = author_id
    );

-- 3. JPP Admin boleh urus semua luahan (Moderation)
CREATE POLICY "JPP boleh urus luahan" ON public.polysuara_confessions
    FOR ALL USING (
        is_jpp_admin((SELECT auth.uid()))
    ) WITH CHECK (
        is_jpp_admin((SELECT auth.uid()))
    );

-- Polisi Upvotes
CREATE POLICY "Boleh lihat upvote" ON public.polysuara_upvotes
    FOR SELECT USING (true);

CREATE POLICY "Boleh upvote" ON public.polysuara_upvotes
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Boleh buang upvote sendiri" ON public.polysuara_upvotes
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- RPC untuk memudahkan fungsi Upvote
CREATE OR REPLACE FUNCTION toggle_polysuara_upvote(p_confession_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_exists BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Semak jika upvote sudah ada
    SELECT EXISTS(
        SELECT 1 FROM public.polysuara_upvotes 
        WHERE confession_id = p_confession_id AND user_id = v_user_id
    ) INTO v_exists;

    IF v_exists THEN
        -- Buang upvote
        DELETE FROM public.polysuara_upvotes 
        WHERE confession_id = p_confession_id AND user_id = v_user_id;
        
        UPDATE public.polysuara_confessions 
        SET upvotes = upvotes - 1 
        WHERE id = p_confession_id;
    ELSE
        -- Tambah upvote
        INSERT INTO public.polysuara_upvotes (confession_id, user_id) 
        VALUES (p_confession_id, v_user_id);
        
        UPDATE public.polysuara_confessions 
        SET upvotes = upvotes + 1 
        WHERE id = p_confession_id;
    END IF;
END;
$$;
