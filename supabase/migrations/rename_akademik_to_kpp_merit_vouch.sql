-- ============================================================
-- Migration: Rename Akademik → KPP dalam merit_program_applications
-- Tujuan: Pindahkan tanggungjawab vouch dari Exco Akademik ke Exco KPP
-- ============================================================

-- 1. Rename columns akademik_* → kpp_*
ALTER TABLE public.merit_program_applications 
  RENAME COLUMN akademik_reviewer_id TO kpp_reviewer_id;

ALTER TABLE public.merit_program_applications 
  RENAME COLUMN akademik_reviewed_at TO kpp_reviewed_at;

ALTER TABLE public.merit_program_applications 
  RENAME COLUMN akademik_vouch_notes TO kpp_vouch_notes;

-- 2. Update status values: akademik_vouched → kpp_vouched, akademik_not_vouched → kpp_not_vouched
UPDATE public.merit_program_applications 
  SET status = 'kpp_vouched' 
  WHERE status = 'akademik_vouched';

UPDATE public.merit_program_applications 
  SET status = 'kpp_not_vouched' 
  WHERE status = 'akademik_not_vouched';

-- 3. Update review log entries
UPDATE public.merit_review_log 
  SET reviewer_unit = 'KPP' 
  WHERE reviewer_unit = 'AKADEMIK';

-- 4. Update action values in review log
UPDATE public.merit_review_log 
  SET action = 'kpp_vouched' 
  WHERE action = 'vouched';

UPDATE public.merit_review_log 
  SET action = 'kpp_not_vouched' 
  WHERE action = 'not_vouched';
