-- Migration: Fix e-Kebajikan and PolySuara schemas
-- Description: Adds missing columns to public.polysuara_confessions, defines the codename trigger, and creates the e-Kebajikan stats view and RPC functions.

-- ============================================================
-- 1. PolySuara Scheme Upgrades
-- ============================================================

-- Add missing columns to polysuara_confessions
ALTER TABLE public.polysuara_confessions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS codename TEXT,
ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS official_reply TEXT,
ADD COLUMN IF NOT EXISTS official_reply_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS replied_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS author_reply TEXT,
ADD COLUMN IF NOT EXISTS author_reply_at TIMESTAMPTZ;

-- Codename generation trigger function
CREATE OR REPLACE FUNCTION public.generate_polysuara_codename()
RETURNS TRIGGER AS $$
DECLARE
    v_hash TEXT;
    v_adjective TEXT;
    v_animal TEXT;
    adjectives TEXT[] := ARRAY['Misteri', 'Berani', 'Bintang', 'Sakti', 'Pintar', 'Laju', 'Segar', 'Setia', 'Senyap', 'Gagah', 'Jernih', 'Megah', 'Pantas', 'Kreatif', 'Tangkas', 'Bijak'];
    animals TEXT[] := ARRAY['Kucing', 'Harimau', 'Elang', 'Singa', 'Serigala', 'Kuda', 'Beruang', 'Kancil', 'Gajah', 'Tupai', 'Kura', 'Lumba', 'Burung', 'Panda', 'Musang', 'Landak'];
    idx_adj INT;
    idx_ani INT;
BEGIN
    -- Hash based on author_id and current time or uuid
    v_hash := md5(NEW.author_id::text || COALESCE(NEW.created_at, NOW())::text);
    
    -- Pick adjective and animal using hash characters converted to integers
    idx_ani := (('x' || substring(v_hash, 1, 4))::bit(16)::integer % array_length(animals, 1)) + 1;
    idx_adj := (('x' || substring(v_hash, 5, 4))::bit(16)::integer % array_length(adjectives, 1)) + 1;
    
    NEW.codename := animals[idx_ani] || ' ' || adjectives[idx_adj];
    
    -- Default status to PENDING if not set
    IF NEW.status IS NULL THEN
        NEW.status := 'PENDING';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Register Codename Trigger
DROP TRIGGER IF EXISTS trg_polysuara_codename ON public.polysuara_confessions;
CREATE TRIGGER trg_polysuara_codename
BEFORE INSERT ON public.polysuara_confessions
FOR EACH ROW EXECUTE FUNCTION public.generate_polysuara_codename();

-- ============================================================
-- 2. e-Kebajikan Public Stats View
-- ============================================================

CREATE OR REPLACE VIEW public.kebajikan_public_stats AS
SELECT 
    COUNT(*)::INTEGER AS total_tickets,
    COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::INTEGER AS total_resolved,
    COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED'))::INTEGER AS total_active,
    COUNT(*) FILTER (WHERE status = 'ESCALATED')::INTEGER AS total_escalated,
    CASE 
        WHEN COUNT(*) FILTER (WHERE status != 'CANCELLED') = 0 THEN 0::NUMERIC
        ELSE ROUND((COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::NUMERIC * 100.0) / COUNT(*) FILTER (WHERE status != 'CANCELLED'), 1)
    END AS resolution_rate,
    COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0)::NUMERIC, 1), 0.0) AS avg_resolution_hours,
    COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0.0) AS avg_rating,
    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()))::INTEGER AS this_month_received,
    COUNT(*) FILTER (WHERE resolved_at >= DATE_TRUNC('month', NOW()) AND status IN ('RESOLVED', 'CLOSED'))::INTEGER AS this_month_resolved
FROM public.kebajikan_tickets;

-- ============================================================
-- 3. e-Kebajikan Statistics RPC Functions
-- ============================================================

-- RPC: Monthly statistics
CREATE OR REPLACE FUNCTION public.get_kebajikan_monthly_stats(months_back INTEGER DEFAULT 6)
RETURNS TABLE (
    month_label TEXT,
    month_date TEXT,
    received INTEGER,
    resolved INTEGER,
    avg_hours NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH months AS (
        SELECT 
            DATE_TRUNC('month', NOW() - (i || ' month')::INTERVAL) AS m_date
        FROM GENERATE_SERIES(0, months_back - 1) i
    ),
    monthly_received AS (
        SELECT 
            DATE_TRUNC('month', created_at) AS r_month,
            COUNT(*)::INTEGER AS cnt
        FROM public.kebajikan_tickets
        GROUP BY 1
    ),
    monthly_resolved AS (
        SELECT 
            DATE_TRUNC('month', resolved_at) AS s_month,
            COUNT(*)::INTEGER AS cnt,
            COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0)::NUMERIC, 1), 0.0) AS avg_h
        FROM public.kebajikan_tickets
        WHERE status IN ('RESOLVED', 'CLOSED') AND resolved_at IS NOT NULL
        GROUP BY 1
    )
    SELECT 
        TO_CHAR(m.m_date, 'Mon')::TEXT AS month_label,
        TO_CHAR(m.m_date, 'YYYY-MM-DD')::TEXT AS month_date,
        COALESCE(r.cnt, 0)::INTEGER AS received,
        COALESCE(s.cnt, 0)::INTEGER AS resolved,
        COALESCE(s.avg_h, 0.0)::NUMERIC AS avg_hours
    FROM months m
    LEFT JOIN monthly_received r ON r.r_month = m.m_date
    LEFT JOIN monthly_resolved s ON s.s_month = m.m_date
    ORDER BY m.m_date ASC;
END;
$$;

-- RPC: Category statistics
CREATE OR REPLACE FUNCTION public.get_kebajikan_category_stats()
RETURNS TABLE (
    category TEXT,
    total INTEGER,
    resolved INTEGER,
    percentage NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.category::TEXT AS category,
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (WHERE t.status IN ('RESOLVED', 'CLOSED'))::INTEGER AS resolved,
        CASE 
            WHEN COUNT(*) = 0 THEN 0.0::NUMERIC
            ELSE ROUND((COUNT(*) FILTER (WHERE t.status IN ('RESOLVED', 'CLOSED'))::NUMERIC * 100.0) / COUNT(*), 1)
        END AS percentage
    FROM public.kebajikan_tickets t
    GROUP BY t.category;
END;
$$;

-- RPC: Recent ratings
CREATE OR REPLACE FUNCTION public.get_kebajikan_recent_ratings(limit_count INTEGER DEFAULT 8)
RETURNS TABLE (
    rating NUMERIC,
    category TEXT,
    rating_comment TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.rating,
        t.category::TEXT,
        t.rating_comment
    FROM public.kebajikan_tickets t
    WHERE t.rating IS NOT NULL AND t.rating_comment IS NOT NULL AND t.rating_comment != ''
    ORDER BY t.rating_at DESC NULLS LAST, t.created_at DESC
    LIMIT limit_count;
END;
$$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
