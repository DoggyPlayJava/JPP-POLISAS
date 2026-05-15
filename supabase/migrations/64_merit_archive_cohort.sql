-- 64_merit_archive_cohort.sql

CREATE OR REPLACE FUNCTION public.archive_merit_cohort(p_cohort_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Archive the current total_merit into student_merit_cohorts for users with merit != 0
    INSERT INTO public.student_merit_cohorts (user_id, cohort_id, total_merit)
    SELECT id, p_cohort_id, merit
    FROM public.profiles
    WHERE merit != 0;

    -- 2. Mark existing merit_transactions with the archived cohort_id
    UPDATE public.merit_transactions
    SET academic_session = p_cohort_id
    WHERE academic_session IS NULL;

    -- 3. Reset profile merit back to 0
    UPDATE public.profiles
    SET merit = 0
    WHERE merit != 0;
END;
$$;
