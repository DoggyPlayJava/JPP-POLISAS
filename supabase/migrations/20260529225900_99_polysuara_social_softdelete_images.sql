-- Migration: 99_polysuara_social_softdelete_images.sql
-- Created: 29 May 2026
-- Purpose: Menyokong ciri soft-delete (tombstoning) dan lampiran gambar bagi ulasan PolySuara.

-- ==========================================
-- 1. ADD COLUMNS TO TABLE
-- ==========================================
ALTER TABLE public.polysuara_comments 
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_deleted_by_moderator BOOLEAN DEFAULT false;

-- ==========================================
-- 2. CREATE SMART DELETE FUNCTION (RPC)
-- ==========================================
CREATE OR REPLACE FUNCTION public.soft_or_hard_delete_polysuara_comment(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_replies BOOLEAN;
    v_user_id UUID;
BEGIN
    -- Semak jika auth user adalah JPP
    v_user_id := auth.uid();
    IF NOT public.is_jpp_admin(v_user_id) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Semak jika komen ini mempunyai replies (anak)
    SELECT EXISTS(
        SELECT 1 FROM public.polysuara_comments WHERE parent_id = p_comment_id
    ) INTO v_has_replies;

    IF v_has_replies THEN
        -- Lakukan Soft-Delete (Tombstone)
        UPDATE public.polysuara_comments
        SET content = 'Ulasan ini telah dipadamkan oleh moderasi JPP kerana melanggar panduan komuniti.',
            is_deleted_by_moderator = true,
            image_url = NULL, -- Padam gambar lampiran untuk keselamatan/privasi
            codename = 'Anon'
        WHERE id = p_comment_id;
        
        -- Bersihkan undian & laporan untuk elak confusion
        DELETE FROM public.polysuara_comment_votes WHERE comment_id = p_comment_id;
        DELETE FROM public.polysuara_comment_reports WHERE comment_id = p_comment_id;
        
        RETURN true; -- Menunjukkan ia telah di-soft-delete (tombstoned)
    ELSE
        -- Tiada anak, lakukan Hard-Delete terus untuk bersihkan database
        DELETE FROM public.polysuara_comments WHERE id = p_comment_id;
        RETURN false; -- Menunjukkan ia telah di-hard-delete
    END IF;
END;
$$;
