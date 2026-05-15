-- 65_add_appeal_proof_url.sql

ALTER TABLE public.demerit_appeals
ADD COLUMN IF NOT EXISTS proof_url TEXT;
