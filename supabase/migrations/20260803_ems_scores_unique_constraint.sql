-- Migration: 20260803_ems_scores_unique_constraint.sql
-- Add unique constraint on (participant_id, jury_code_id, rubric_id) for ems_scores
-- This supports atomic upsert in submitJuryScore when RLS blocks anon-key DELETE.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ems_scores_participant_jury_rubric_key'
    ) THEN
        ALTER TABLE ems_scores
        ADD CONSTRAINT ems_scores_participant_jury_rubric_key UNIQUE (participant_id, jury_code_id, rubric_id);
    END IF;
END $$;
