-- Migration: 20261128190000_polysuara_fictional_personas_deeplinks_and_notif_locale.sql
-- Description:
--   1. Ensures public.profiles.preferred_language exists with 'ms'/'en' constraint and 'ms' default.
--   2. Replaces public.generate_polysuara_codename() animal codenames with 70 curated fictional characters
--      across 7 franchises (The Legend of Korra, Avatar: The Last Airbender, One Piece, Sword Art Online,
--      Harry Potter, BoBoiBoy, Ejen Ali — 10 characters per series).
--   3. Upgrades PolySuara interaction notification triggers to emit /polysuara?post=<confession_id>&comment=<comment_id>
--      deep-links and pass structured metadata for recipient-language push & in-app formatting.
--
-- Non-negotiable DB rules verified:
--   - New migration only (existing migrations untouched).
--   - SECURITY DEFINER functions set explicit search_path = public.
--   - Zero table drops or destructive changes; 100% idempotent.

-- ============================================================
-- 1. Persist Recipient Language Preference on public.profiles
-- ============================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'ms';

ALTER TABLE public.profiles
ALTER COLUMN preferred_language SET DEFAULT 'ms';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%preferred_language%'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_preferred_language_check
        CHECK (preferred_language IS NULL OR preferred_language IN ('ms', 'en'));
    END IF;
END $$;

COMMENT ON COLUMN public.profiles.preferred_language IS
    'User preferred interface & notification language (ms = Bahasa Melayu, en = English)';

-- ============================================================
-- 2. Replace Animal Codenames with Curated Fictional Personas
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_polysuara_codename()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hash TEXT;
    personas TEXT[] := ARRAY[
        -- 1. The Legend of Korra (10)
        'Korra', 'Mako', 'Bolin', 'Asami', 'Tenzin',
        'Lin Beifong', 'Jinora', 'Kuvira', 'Varrick', 'Zaheer',
        -- 2. Avatar: The Last Airbender (10)
        'Aang', 'Katara', 'Sokka', 'Toph', 'Zuko',
        'Iroh', 'Azula', 'Suki', 'Appa', 'Momo',
        -- 3. One Piece (10)
        'Monkey D. Luffy', 'Roronoa Zoro', 'Nami', 'Usopp', 'Sanji',
        'Tony Tony Chopper', 'Nico Robin', 'Franky', 'Brook', 'Jinbe',
        -- 4. Sword Art Online (10)
        'Kirito', 'Asuna', 'Yui', 'Sinon', 'Leafa',
        'Klein', 'Eugeo', 'Alice Zuberg', 'Yuuki Konno', 'Agil',
        -- 5. Harry Potter (10)
        'Harry Potter', 'Hermione Granger', 'Ron Weasley', 'Albus Dumbledore', 'Severus Snape',
        'Luna Lovegood', 'Neville Longbottom', 'Draco Malfoy', 'Minerva McGonagall', 'Sirius Black',
        -- 6. BoBoiBoy (10)
        'BoBoiBoy', 'Yaya', 'Ying', 'Gopal', 'Fang',
        'Ochobot', 'Papa Zola', 'Tok Aba', 'Adu Du', 'Kapten Kaizo',
        -- 7. Ejen Ali (10)
        'Ejen Ali', 'Ejen Alicia', 'Ejen Bakar', 'Ejen Rizwan', 'Ejen Khai',
        'Ejen Iman', 'Ejen Moon', 'Ejen Rudy', 'Ejen Geetha', 'General Rama'
    ];
    idx_persona INT;
BEGIN
    -- Deterministic hash from author_id + timestamp + confession id
    v_hash := md5(
        COALESCE(NEW.author_id::text, '') ||
        COALESCE(NEW.created_at, NOW())::text ||
        COALESCE(NEW.id::text, '')
    );

    idx_persona := (('x' || substring(v_hash, 1, 4))::bit(16)::integer % array_length(personas, 1)) + 1;
    NEW.codename := personas[idx_persona];

    IF NEW.status IS NULL THEN
        NEW.status := 'PENDING';
    END IF;

    RETURN NEW;
END;
$$;

-- Keep trigger attached cleanly on polysuara_confessions
DROP TRIGGER IF EXISTS trg_polysuara_codename ON public.polysuara_confessions;
CREATE TRIGGER trg_polysuara_codename
BEFORE INSERT ON public.polysuara_confessions
FOR EACH ROW EXECUTE FUNCTION public.generate_polysuara_codename();

-- Note: public.generate_polysuara_comment_codename() is intentionally preserved:
-- OP comments receive '[Penulis]' and other commenters receive deterministic 'Anon-<hash>'
-- mapped on the frontend & server to the same 70 fictional character personas.

-- ============================================================
-- 3. Upgrade PolySuara Personal Notification Helper & Triggers
--    - Deep-link URLs use /polysuara?post=<confession_id>&comment=<comment_id>
--      (fixes legacy ?id= mismatch).
--    - Structured metadata (eventType, preview, count, confessionId, commentId)
--      passed to /api/polysuara-interaction-notify for recipient-language EN/MS formatting.
--    - Zero hardcoded secrets; drops legacy 6-arg overload and revokes PUBLIC/anon/authenticated EXECUTE.
-- ============================================================
DROP FUNCTION IF EXISTS public.send_polysuara_interaction_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.send_polysuara_interaction_notification(
    p_recipient_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT,
    p_link TEXT,
    p_reference_id UUID,
    p_meta JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_api_base_url TEXT;
    v_webhook_secret TEXT;
    v_request_url TEXT;
    v_headers JSONB;
    v_payload JSONB;
    v_request_id BIGINT;
BEGIN
    IF p_recipient_id IS NULL THEN
        RETURN;
    END IF;

    SELECT value->>0 INTO v_api_base_url
    FROM public.system_settings
    WHERE key = 'api_base_url'
    LIMIT 1;
    v_api_base_url := COALESCE(NULLIF(trim(v_api_base_url), ''), 'https://jpp.cipher-node.org');

    SELECT value->>0 INTO v_webhook_secret
    FROM public.system_settings
    WHERE key = 'webhook_secret'
    LIMIT 1;

    IF v_webhook_secret IS NULL OR trim(v_webhook_secret) = '' THEN
        RETURN;
    END IF;

    v_request_url := v_api_base_url || '/api/polysuara-interaction-notify';

    v_headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', trim(v_webhook_secret)
    );

    v_payload := jsonb_build_object(
        'recipientId', p_recipient_id,
        'title', p_title,
        'message', p_message,
        'type', p_type,
        'link', p_link,
        'referenceId', p_reference_id,
        'meta', COALESCE(p_meta, '{}'::jsonb)
    ) || COALESCE(p_meta, '{}'::jsonb);

    SELECT http_post INTO v_request_id
    FROM net.http_post(
        v_request_url,
        v_payload,
        '{}'::jsonb,
        v_headers,
        5000
    );
EXCEPTION WHEN OTHERS THEN
    RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_polysuara_interaction_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_polysuara_comment_insert_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_confession_author_id UUID;
    v_parent_comment_user_id UUID;
    v_sanitized TEXT;
    v_clean_content TEXT;
    v_deep_link TEXT;
BEGIN
    SELECT author_id INTO v_confession_author_id
    FROM public.polysuara_confessions
    WHERE id = NEW.confession_id;

    -- Strip internal sticker/spoiler markers before previewing
    v_sanitized := trim(
        regexp_replace(
            regexp_replace(COALESCE(NEW.content, ''), '\[sticker:[a-zA-Z0-9_-]+\]\s*', '', 'g'),
            '\[spoiler-img\]\s*',
            '',
            'g'
        )
    );
    v_clean_content := substring(v_sanitized from 1 for 60);
    IF length(v_sanitized) > 60 THEN
        v_clean_content := v_clean_content || '...';
    END IF;

    v_deep_link := '/polysuara?post=' || NEW.confession_id::text || '&comment=' || NEW.id::text;

    -- 1. Notify confession author (if commenter is not the author themselves)
    IF v_confession_author_id IS NOT NULL AND v_confession_author_id != NEW.user_id THEN
        PERFORM public.send_polysuara_interaction_notification(
            v_confession_author_id,
            'Ulasan Baru',
            'Seseorang mengulas luahan anda: "' || v_clean_content || '"',
            'COMMENT',
            v_deep_link,
            NEW.confession_id,
            jsonb_build_object(
                'eventType', 'COMMENT',
                'preview', v_clean_content,
                'confessionId', NEW.confession_id,
                'commentId', NEW.id
            )
        );
    END IF;

    -- 2. Notify parent comment author (nested reply, avoiding duplicate if same as OP)
    IF NEW.parent_id IS NOT NULL THEN
        SELECT user_id INTO v_parent_comment_user_id
        FROM public.polysuara_comments
        WHERE id = NEW.parent_id;

        IF v_parent_comment_user_id IS NOT NULL
           AND v_parent_comment_user_id != NEW.user_id
           AND (v_confession_author_id IS NULL OR v_parent_comment_user_id != v_confession_author_id) THEN
            PERFORM public.send_polysuara_interaction_notification(
                v_parent_comment_user_id,
                'Balasan Baru',
                'Seseorang membalas ulasan anda: "' || v_clean_content || '"',
                'COMMENT_REPLY',
                v_deep_link,
                NEW.confession_id,
                jsonb_build_object(
                    'eventType', 'COMMENT_REPLY',
                    'preview', v_clean_content,
                    'confessionId', NEW.confession_id,
                    'commentId', NEW.id
                )
            );
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_polysuara_comment_notify ON public.polysuara_comments;
CREATE TRIGGER trg_polysuara_comment_notify
AFTER INSERT ON public.polysuara_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_polysuara_comment_insert_notify();

CREATE OR REPLACE FUNCTION public.handle_polysuara_votes_update_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deep_link TEXT;
BEGIN
    v_deep_link := '/polysuara?post=' || NEW.id::text;

    -- A. Upvote milestones: 3, 5, 10, 15, 20, 30, 50, 100
    IF NEW.upvotes IS DISTINCT FROM OLD.upvotes AND NEW.upvotes > OLD.upvotes THEN
        IF NEW.upvotes IN (3, 5, 10, 15, 20, 30, 50, 100) THEN
            PERFORM public.send_polysuara_interaction_notification(
                NEW.author_id,
                'Perkembangan Popular',
                'Luahan anda kini disokong oleh ' || NEW.upvotes || ' orang!',
                'UPVOTE_MILESTONE',
                v_deep_link,
                NEW.id,
                jsonb_build_object(
                    'eventType', 'UPVOTE_MILESTONE',
                    'count', NEW.upvotes,
                    'confessionId', NEW.id
                )
            );
        END IF;
    END IF;

    -- B. Downvote milestones: 3, 10
    IF NEW.downvotes IS DISTINCT FROM OLD.downvotes AND NEW.downvotes > OLD.downvotes THEN
        IF NEW.downvotes IN (3, 10) THEN
            PERFORM public.send_polysuara_interaction_notification(
                NEW.author_id,
                'Kritikan Komuniti',
                'Luahan anda telah ditentang oleh ' || NEW.downvotes || ' orang.',
                'DOWNVOTE_WARNING',
                v_deep_link,
                NEW.id,
                jsonb_build_object(
                    'eventType', 'DOWNVOTE_WARNING',
                    'count', NEW.downvotes,
                    'confessionId', NEW.id
                )
            );
        END IF;
    END IF;

    -- C. Auto-hide notification
    IF NEW.is_hidden_by_community = true AND OLD.is_hidden_by_community = false THEN
        PERFORM public.send_polysuara_interaction_notification(
            NEW.author_id,
            'Luahan Disembunyikan',
            'Luahan anda telah disembunyikan secara automatik oleh komuniti kerana menerima banyak bantahan.',
            'AUTO_HIDE',
            v_deep_link,
            NEW.id,
            jsonb_build_object(
                'eventType', 'AUTO_HIDE',
                'confessionId', NEW.id
            )
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_polysuara_votes_notify ON public.polysuara_confessions;
CREATE TRIGGER trg_polysuara_votes_notify
AFTER UPDATE OF upvotes, downvotes, is_hidden_by_community ON public.polysuara_confessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_polysuara_votes_update_notify();

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
