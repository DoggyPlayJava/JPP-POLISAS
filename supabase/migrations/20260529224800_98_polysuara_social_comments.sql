-- Migration: 98_polysuara_social_comments.sql
-- Created: 29 May 2026
-- Purpose: Menyokong ruangan ulasan sosial tanpa nama (2-level nesting) dengan triggers, RLS ketat, dan RPC voting & moderation.

-- ==========================================
-- 1. TABLES CREATION
-- ==========================================

-- Jadual untuk menyimpan ulasan PolySuara
CREATE TABLE IF NOT EXISTS public.polysuara_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    confession_id UUID NOT NULL REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.polysuara_comments(id) ON DELETE CASCADE, -- Peringkat ke-2 (Balas Komen)
    content TEXT NOT NULL CHECK (char_length(content) <= 300),
    codename VARCHAR(100) NOT NULL,
    is_jpp_official BOOLEAN DEFAULT false,
    is_sensitive BOOLEAN DEFAULT false, -- Kesan Blur Sensitif
    is_hidden_by_community BOOLEAN DEFAULT false, -- Community auto-hide
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    reports_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Jadual untuk undian ulasan
CREATE TABLE IF NOT EXISTS public.polysuara_comment_votes (
    comment_id UUID REFERENCES public.polysuara_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('UPVOTE', 'DOWNVOTE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (comment_id, user_id)
);

-- Jadual untuk laporan ulasan
CREATE TABLE IF NOT EXISTS public.polysuara_comment_reports (
    comment_id UUID REFERENCES public.polysuara_comments(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (comment_id, reporter_id)
);

-- ==========================================
-- 2. INDEXES (FK & QUERY OPTIMIZATION)
-- ==========================================

-- Indeks komposit penting untuk feed komen (Confession -> Parent -> Created At)
CREATE INDEX IF NOT EXISTS idx_comments_feed 
ON public.polysuara_comments (confession_id, parent_id, created_at DESC);

-- Indeks FK untuk mengelakkan full table scans
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.polysuara_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.polysuara_comments (parent_id) WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON public.polysuara_comment_votes (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_id ON public.polysuara_comment_votes (user_id);

CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON public.polysuara_comment_reports (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_reporter_id ON public.polysuara_comment_reports (reporter_id);

-- ==========================================
-- 3. TRIGGERS & FUNCTIONS
-- ==========================================

-- Trigger Kata Kesat (Censorship)
-- Menggunakan semula fungsi penapisan sedia ada 'censor_polysuara_content'
DROP TRIGGER IF EXISTS trg_censor_polysuara_comment ON public.polysuara_comments;
CREATE TRIGGER trg_censor_polysuara_comment
BEFORE INSERT OR UPDATE OF content ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.censor_polysuara_content();

-- Trigger untuk menjana nama samaran (codename) thread-scoped yang selamat
CREATE OR REPLACE FUNCTION public.generate_polysuara_comment_codename()
RETURNS TRIGGER AS $$
DECLARE
    v_confession_author_id UUID;
    v_confession_codename VARCHAR(100);
    v_hash TEXT;
BEGIN
    -- Ambil maklumat confession utama
    SELECT author_id, codename INTO v_confession_author_id, v_confession_codename
    FROM public.polysuara_confessions
    WHERE id = NEW.confession_id;

    -- Semak jika pengomen adalah OP (Original Poster)
    IF NEW.user_id = v_confession_author_id THEN
        NEW.codename := v_confession_codename || ' [Penulis]';
    ELSE
        -- Hashing selamat berasaskan (user_id + confession_id) untuk nama samaran unik bagi thread ini
        v_hash := substring(md5(NEW.user_id::text || NEW.confession_id::text), 1, 5);
        NEW.codename := 'Anon-' || v_hash;
    END IF;

    -- Tandakan is_jpp_official jika pengomen adalah Exco JPP
    IF public.is_jpp_admin(NEW.user_id) THEN
        NEW.is_jpp_official := true;
    ELSE
        NEW.is_jpp_official := false;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_polysuara_comment_codename
BEFORE INSERT ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.generate_polysuara_comment_codename();

-- ==========================================
-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Mengaktifkan RLS pada semua jadual baharu
ALTER TABLE public.polysuara_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polysuara_comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polysuara_comment_reports ENABLE ROW LEVEL SECURITY;

-- Polisi Keselamatan: polysuara_comments
CREATE POLICY "Pelajar boleh baca ulasan" ON public.polysuara_comments
    FOR SELECT USING (is_hidden_by_community = false);

CREATE POLICY "Pelajar boleh buat ulasan" ON public.polysuara_comments
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "JPP boleh urus ulasan" ON public.polysuara_comments
    FOR ALL USING (public.is_jpp_admin((SELECT auth.uid()))) 
    WITH CHECK (public.is_jpp_admin((SELECT auth.uid())));

-- Polisi Keselamatan: polysuara_comment_votes (Diketatkan demi privasi)
CREATE POLICY "Pelajar boleh lihat undian ulasan sendiri" ON public.polysuara_comment_votes
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Pelajar boleh buat undian ulasan sendiri" ON public.polysuara_comment_votes
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Pelajar boleh padam undian ulasan sendiri" ON public.polysuara_comment_votes
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "JPP boleh urus undian ulasan" ON public.polysuara_comment_votes
    FOR ALL USING (public.is_jpp_admin((SELECT auth.uid())));

-- Polisi Keselamatan: polysuara_comment_reports
CREATE POLICY "Pelajar boleh buat laporan ulasan" ON public.polysuara_comment_reports
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = reporter_id);

CREATE POLICY "JPP boleh urus laporan ulasan" ON public.polysuara_comment_reports
    FOR ALL USING (public.is_jpp_admin((SELECT auth.uid())));

-- ==========================================
-- 5. DATABASE RPC FUNCTIONS
-- ==========================================

-- RPC Atomik untuk Sokong/Bantah Komen (Toggles Upvote/Downvote with Mutual Exclusion)
CREATE OR REPLACE FUNCTION public.toggle_polysuara_comment_vote(p_comment_id UUID, p_vote_type VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_exists BOOLEAN;
    v_current_vote VARCHAR;
    v_just_hidden BOOLEAN := false;
    v_total_votes INT;
    v_downvotes_count INT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_vote_type NOT IN ('UPVOTE', 'DOWNVOTE') THEN
        RAISE EXCEPTION 'Invalid vote type';
    END IF;

    -- Semak jika undian sedia ada wujud
    SELECT EXISTS(
        SELECT 1 FROM public.polysuara_comment_votes 
        WHERE comment_id = p_comment_id AND user_id = v_user_id
    ) INTO v_exists;

    IF v_exists THEN
        SELECT vote_type INTO v_current_vote 
        FROM public.polysuara_comment_votes
        WHERE comment_id = p_comment_id AND user_id = v_user_id;

        IF v_current_vote = p_vote_type THEN
            -- Padam undian (Toggle OFF)
            DELETE FROM public.polysuara_comment_votes 
            WHERE comment_id = p_comment_id AND user_id = v_user_id;
            
            IF p_vote_type = 'UPVOTE' THEN
                UPDATE public.polysuara_comments 
                SET upvotes = upvotes - 1 
                WHERE id = p_comment_id;
            ELSE
                UPDATE public.polysuara_comments 
                SET downvotes = downvotes - 1 
                WHERE id = p_comment_id;
            END IF;
        ELSE
            -- Tukar jenis undian (Toggle mutual exclusion)
            UPDATE public.polysuara_comment_votes 
            SET vote_type = p_vote_type 
            WHERE comment_id = p_comment_id AND user_id = v_user_id;
            
            IF p_vote_type = 'UPVOTE' THEN
                UPDATE public.polysuara_comments 
                SET upvotes = upvotes + 1, downvotes = downvotes - 1 
                WHERE id = p_comment_id;
            ELSE
                UPDATE public.polysuara_comments 
                SET downvotes = downvotes + 1, upvotes = upvotes - 1 
                WHERE id = p_comment_id;
            END IF;
        END IF;
    ELSE
        -- Masukkan undian baru
        INSERT INTO public.polysuara_comment_votes (comment_id, user_id, vote_type) 
        VALUES (p_comment_id, v_user_id, p_vote_type);
        
        IF p_vote_type = 'UPVOTE' THEN
            UPDATE public.polysuara_comments 
            SET upvotes = upvotes + 1 
            WHERE id = p_comment_id;
        ELSE
            UPDATE public.polysuara_comments 
            SET downvotes = downvotes + 1 
            WHERE id = p_comment_id;
        END IF;
    END IF;

    -- Semak community auto-hide threshold untuk komen (min 10 votes, >70% downvote ratio)
    SELECT upvotes + downvotes, downvotes INTO v_total_votes, v_downvotes_count
    FROM public.polysuara_comments
    WHERE id = p_comment_id;

    IF v_total_votes >= 10 AND (v_downvotes_count::float / v_total_votes::float) > 0.70 THEN
        UPDATE public.polysuara_comments
        SET is_hidden_by_community = true
        WHERE id = p_comment_id;
        
        v_just_hidden := true;
    END IF;

    RETURN v_just_hidden;
END;
$$;

-- RPC Atomik untuk Melaporkan Komen (Auto-Hide pada laporan ke-5)
CREATE OR REPLACE FUNCTION public.report_polysuara_comment(p_comment_id UUID, p_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_exists BOOLEAN;
    v_just_hidden BOOLEAN := false;
    v_reports_count INT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Semak jika pengguna sudah pernah melaporkan komen ini
    SELECT EXISTS(
        SELECT 1 FROM public.polysuara_comment_reports 
        WHERE comment_id = p_comment_id AND reporter_id = v_user_id
    ) INTO v_exists;

    IF v_exists THEN
        RAISE EXCEPTION 'Anda sudah melaporkan ulasan ini';
    END IF;

    -- Masukkan rekod laporan
    INSERT INTO public.polysuara_comment_reports (comment_id, reporter_id, reason) 
    VALUES (p_comment_id, v_user_id, p_reason);
    
    -- Kemaskini reports_count
    UPDATE public.polysuara_comments 
    SET reports_count = reports_count + 1 
    WHERE id = p_comment_id
    RETURNING reports_count INTO v_reports_count;

    -- Semak jika melebihi threshold (5 laporan)
    IF v_reports_count >= 5 THEN
        UPDATE public.polysuara_comments
        SET is_hidden_by_community = true
        WHERE id = p_comment_id;
        
        v_just_hidden := true;
    END IF;

    RETURN v_just_hidden;
END;
$$;

-- RPC JPP/Admin untuk Memulihkan Komen yang disembunyikan
CREATE OR REPLACE FUNCTION public.restore_hidden_comment(p_comment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Hanya JPP dibenarkan memulihkan komen
    IF NOT public.is_jpp_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Reset status ulasan
    UPDATE public.polysuara_comments
    SET is_hidden_by_community = false,
        reports_count = 0,
        downvotes = 0
    WHERE id = p_comment_id;

    -- Bersihkan rekod lama bagi memberi nafas baru
    DELETE FROM public.polysuara_comment_votes
    WHERE comment_id = p_comment_id AND vote_type = 'DOWNVOTE';

    DELETE FROM public.polysuara_comment_reports
    WHERE comment_id = p_comment_id;
END;
$$;

-- ==========================================
-- 6. COUNTER CACHE FOR CONFESSIONS
-- ==========================================
ALTER TABLE public.polysuara_confessions ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_polysuara_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.polysuara_confessions 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.confession_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.polysuara_confessions 
        SET comments_count = comments_count - 1 
        WHERE id = OLD.confession_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_polysuara_comment_count ON public.polysuara_comments;
CREATE TRIGGER trg_sync_polysuara_comment_count
AFTER INSERT OR DELETE ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_polysuara_comment_count();
