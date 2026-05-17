-- Upgrades for PolySuara V4
-- 1. Alter polysuara_confessions to support images and pinning
ALTER TABLE public.polysuara_confessions 
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- 2. Create polysuara_censored_words table
CREATE TABLE IF NOT EXISTS public.polysuara_censored_words (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    word TEXT NOT NULL UNIQUE,
    added_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for censored words
ALTER TABLE public.polysuara_censored_words ENABLE ROW LEVEL SECURITY;

-- Allow public to select words (so frontend can also do immediate censoring if needed)
CREATE POLICY "Allow public read censored words" 
ON public.polysuara_censored_words FOR SELECT USING (true);

-- Allow authenticated users to manage words (we'll restrict UI to Exco Kebajikan, but for now authenticated can manage)
CREATE POLICY "Allow authenticated full access censored words" 
ON public.polysuara_censored_words FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- 3. Create Trigger for Auto Censor (Regex Replace)
CREATE OR REPLACE FUNCTION public.censor_polysuara_content()
RETURNS TRIGGER AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT word FROM public.polysuara_censored_words LOOP
        -- Case insensitive regex replace. Using \b for word boundaries.
        NEW.content := regexp_replace(NEW.content, '(?i)\b' || rec.word || '\b', '***', 'g');
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_censor_polysuara ON public.polysuara_confessions;
CREATE TRIGGER trg_censor_polysuara
BEFORE INSERT OR UPDATE OF content ON public.polysuara_confessions
FOR EACH ROW EXECUTE FUNCTION public.censor_polysuara_content();

-- Insert some default words
INSERT INTO public.polysuara_censored_words (word) VALUES 
('babi'), ('sial'), ('pukimak'), ('bodoh'), ('lancau')
ON CONFLICT (word) DO NOTHING;

-- 4. Create Storage Bucket for polysuara attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('polysuara_attachments', 'polysuara_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Add RLS to storage bucket
CREATE POLICY "Give public access to polysuara_attachments" ON storage.objects FOR SELECT USING (bucket_id = 'polysuara_attachments');
CREATE POLICY "Allow authenticated inserts to polysuara_attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'polysuara_attachments' AND auth.role() = 'authenticated');
