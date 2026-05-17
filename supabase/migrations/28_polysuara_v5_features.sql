-- Migration for PolySuara V5 Features
-- 1. Mini-Polls (Undian Terbina Dalam)
-- 2. Sembang Tanpa Nama (Anonymous 1-on-1 Crisis Chat)

-- ==========================================
-- POLLS SCHEMA
-- ==========================================
CREATE TABLE IF NOT EXISTS public.polysuara_polls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    confession_id UUID NOT NULL REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    is_multiple_choice BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_polysuara_polls_confession_id ON public.polysuara_polls(confession_id);

CREATE TABLE IF NOT EXISTS public.polysuara_poll_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES public.polysuara_polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_polysuara_poll_options_poll_id ON public.polysuara_poll_options(poll_id);

CREATE TABLE IF NOT EXISTS public.polysuara_poll_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES public.polysuara_polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.polysuara_poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(option_id, user_id) -- User can vote for the same option only once
);
CREATE INDEX IF NOT EXISTS idx_polysuara_poll_votes_poll_id ON public.polysuara_poll_votes(poll_id);

-- Enable RLS
ALTER TABLE public.polysuara_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polysuara_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polysuara_poll_votes ENABLE ROW LEVEL SECURITY;

-- Policies for Polls
CREATE POLICY "Allow public read polls" ON public.polysuara_polls FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert polls" ON public.polysuara_polls FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow public read poll options" ON public.polysuara_poll_options FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert poll options" ON public.polysuara_poll_options FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow public read poll votes" ON public.polysuara_poll_votes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert poll votes" ON public.polysuara_poll_votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete own poll votes" ON public.polysuara_poll_votes FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- CHAT SCHEMA (1-on-1 Anonymous)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.polysuara_chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    confession_id UUID NOT NULL REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exco_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(confession_id) -- Only 1 active chat per confession
);
CREATE INDEX IF NOT EXISTS idx_polysuara_chats_confession_id ON public.polysuara_chats(confession_id);
CREATE INDEX IF NOT EXISTS idx_polysuara_chats_student_id ON public.polysuara_chats(student_id);

CREATE TABLE IF NOT EXISTS public.polysuara_chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES public.polysuara_chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_polysuara_chat_messages_chat_id ON public.polysuara_chat_messages(chat_id);

-- Enable RLS
ALTER TABLE public.polysuara_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polysuara_chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat Policies
-- Students can read their own chats, Excos can read all chats
CREATE POLICY "Allow users to read their own chats" ON public.polysuara_chats FOR SELECT USING (
    auth.uid() = student_id OR 
    auth.uid() = exco_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('JPP', 'SUPER_ADMIN_JPP'))
);

CREATE POLICY "Allow excos to insert chats" ON public.polysuara_chats FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('JPP', 'SUPER_ADMIN_JPP'))
);

CREATE POLICY "Allow excos to update chats" ON public.polysuara_chats FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('JPP', 'SUPER_ADMIN_JPP'))
);

-- Messages Policies
CREATE POLICY "Allow users to read messages in their chats" ON public.polysuara_chat_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.polysuara_chats c WHERE c.id = chat_id AND (c.student_id = auth.uid() OR c.exco_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('JPP', 'SUPER_ADMIN_JPP'))))
);

CREATE POLICY "Allow users to insert messages in open chats" ON public.polysuara_chat_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.polysuara_chats c WHERE c.id = chat_id AND c.status = 'OPEN' AND (c.student_id = auth.uid() OR c.exco_id = auth.uid()))
);
