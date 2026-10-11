-- Fix: censor trigger guna \b (backspace) — tak pernah match. Tukar ke \y (word boundary PG).
-- Bug: censored words tak ditapis langsung sejak awal. \b = backspace di PostgreSQL regex.
-- Retroaktif: re-run trigger pada semua confession + comment sedia ada.

CREATE OR REPLACE FUNCTION public.censor_polysuara_content()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT word FROM public.polysuara_censored_words LOOP
        -- \y = word boundary (Postgres). \b = backspace (tak match apa-apa).
        NEW.content := regexp_replace(NEW.content, '(?i)\y' || rec.word || '\y', '***', 'g');
    END LOOP;
    RETURN NEW;
END;
$$;

-- Censor balik semua rekod lama (trigger BEFORE INSERT/UPDATE OF content tak cover data sedia ada)
UPDATE public.polysuara_confessions SET content = content;
UPDATE public.polysuara_comments SET content = content;
