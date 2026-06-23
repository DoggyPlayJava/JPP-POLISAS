-- Migration: Create PolySuara Personal Notifications Triggers
-- Description: Sets up trigger functions and triggers on polysuara_comments and polysuara_confessions to notify authors on comments, replies, upvote milestones, and downvotes.

-- 1. Create helper function to send webhook notifications asynchronously
CREATE OR REPLACE FUNCTION public.send_polysuara_interaction_notification(
    p_recipient_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT,
    p_link TEXT,
    p_reference_id UUID
) RETURNS VOID AS $$
DECLARE
    v_api_base_url text;
    v_webhook_secret text;
    v_request_url text;
    v_headers jsonb;
    v_payload jsonb;
    v_request_id bigint;
BEGIN
    -- Don't send if recipient is missing
    IF p_recipient_id IS NULL THEN
        RETURN;
    END IF;

    -- Fetch config from system_settings
    SELECT COALESCE(value->>0, 'https://jpp.cipher-node.org') INTO v_api_base_url 
    FROM public.system_settings 
    WHERE key = 'api_base_url';
    
    SELECT COALESCE(value->>0, 'f5e193c6de54ab1dde87f7990302b343a9055de6ed180e0e76cb777f2af9a748') INTO v_webhook_secret 
    FROM public.system_settings 
    WHERE key = 'webhook_secret';

    v_request_url := v_api_base_url || '/api/polysuara-interaction-notify';
    
    v_headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_webhook_secret
    );

    v_payload := jsonb_build_object(
        'recipientId', p_recipient_id,
        'title', p_title,
        'message', p_message,
        'type', p_type,
        'link', p_link,
        'referenceId', p_reference_id
    );

    -- Perform asynchronous HTTP POST request using pg_net
    SELECT http_post INTO v_request_id 
    FROM net.http_post(
        v_request_url,
        v_payload,
        '{}'::jsonb, -- params
        v_headers,
        5000 -- timeout_ms
    );
EXCEPTION WHEN OTHERS THEN
    -- Never block database operations if notification fails
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create comment insert trigger function
CREATE OR REPLACE FUNCTION public.handle_polysuara_comment_insert_notify()
RETURNS TRIGGER AS $$
DECLARE
    v_confession_author_id UUID;
    v_parent_comment_user_id UUID;
    v_clean_content TEXT;
BEGIN
    -- Get author_id from the confession
    SELECT author_id INTO v_confession_author_id
    FROM public.polysuara_confessions
    WHERE id = NEW.confession_id;

    -- Truncate content preview
    v_clean_content := substring(NEW.content from 1 for 60);
    IF length(NEW.content) > 60 THEN
        v_clean_content := v_clean_content || '...';
    END IF;

    -- 1. Notify confession author (if commenter is not the author themselves)
    IF v_confession_author_id IS NOT NULL AND v_confession_author_id != NEW.user_id THEN
        PERFORM public.send_polysuara_interaction_notification(
            v_confession_author_id,
            '💬 Ulasan Baru',
            'Seseorang mengulas luahan anda: "' || v_clean_content || '"',
            'COMMENT',
            '/polysuara?id=' || NEW.confession_id,
            NEW.id
        );
    END IF;

    -- 2. Notify parent comment author (if this is a nested reply, and replier is not parent author)
    IF NEW.parent_id IS NOT NULL THEN
        SELECT user_id INTO v_parent_comment_user_id
        FROM public.polysuara_comments
        WHERE id = NEW.parent_id;

        IF v_parent_comment_user_id IS NOT NULL AND v_parent_comment_user_id != NEW.user_id THEN
            -- Avoid double notification if parent author is also confession author
            IF v_parent_comment_user_id != v_confession_author_id THEN
                PERFORM public.send_polysuara_interaction_notification(
                    v_parent_comment_user_id,
                    '💬 Balasan Baru',
                    'Seseorang membalas ulasan anda: "' || v_clean_content || '"',
                    'COMMENT_REPLY',
                    '/polysuara?id=' || NEW.confession_id,
                    NEW.id
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on polysuara_comments
DROP TRIGGER IF EXISTS trg_polysuara_comment_notify ON public.polysuara_comments;
CREATE TRIGGER trg_polysuara_comment_notify
AFTER INSERT ON public.polysuara_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_polysuara_comment_insert_notify();

-- 3. Create votes update trigger function
CREATE OR REPLACE FUNCTION public.handle_polysuara_votes_update_notify()
RETURNS TRIGGER AS $$
BEGIN
    -- A. Upvote milestones: 3, 5, 10, 15, 20, 30, 50, 100
    IF NEW.upvotes IS DISTINCT FROM OLD.upvotes AND NEW.upvotes > OLD.upvotes THEN
        IF NEW.upvotes IN (3, 5, 10, 15, 20, 30, 50, 100) THEN
            PERFORM public.send_polysuara_interaction_notification(
                NEW.author_id,
                '🔥 Perkembangan Popular',
                'Luahan anda kini disokong oleh ' || NEW.upvotes || ' orang! 🚀',
                'UPVOTE_MILESTONE',
                '/polysuara?id=' || NEW.id,
                NEW.id
            );
        END IF;
    END IF;

    -- B. Downvote milestones: 3, 10
    IF NEW.downvotes IS DISTINCT FROM OLD.downvotes AND NEW.downvotes > OLD.downvotes THEN
        IF NEW.downvotes IN (3, 10) THEN
            PERFORM public.send_polysuara_interaction_notification(
                NEW.author_id,
                '⚠️ Kritikan Komuniti',
                'Luahan anda telah ditentang oleh ' || NEW.downvotes || ' orang.',
                'DOWNVOTE_WARNING',
                '/polysuara?id=' || NEW.id,
                NEW.id
            );
        END IF;
    END IF;

    -- C. Auto-hide notification
    IF NEW.is_hidden_by_community = true AND OLD.is_hidden_by_community = false THEN
        PERFORM public.send_polysuara_interaction_notification(
            NEW.author_id,
            '🚨 Luahan Disembunyikan',
            'Luahan anda telah disembunyikan secara automatik oleh komuniti kerana menerima banyak bantahan.',
            'AUTO_HIDE',
            '/polysuara?id=' || NEW.id,
            NEW.id
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on polysuara_confessions
DROP TRIGGER IF EXISTS trg_polysuara_votes_notify ON public.polysuara_confessions;
CREATE TRIGGER trg_polysuara_votes_notify
AFTER UPDATE OF upvotes, downvotes, is_hidden_by_community ON public.polysuara_confessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_polysuara_votes_update_notify();
