-- Add merit_eakademik column to club_activities
-- This allows Aktiviti Kelab to also request Merit Rasmi (official merit)
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS merit_eakademik integer DEFAULT 0;

-- Add merit_kelab column if not exists (for consistency)  
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS merit_kelab integer DEFAULT 0;

-- Add QR-related columns if not exists
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_enabled boolean DEFAULT false;
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_token text;
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_open_at timestamptz;
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_close_at timestamptz;
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS pre_reg_enabled boolean DEFAULT false;
