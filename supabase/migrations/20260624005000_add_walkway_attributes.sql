-- Migration: 20260624005000_add_walkway_attributes.sql
-- Description: Add covered and blocked attributes to imaps_walkways

ALTER TABLE public.imaps_walkways 
ADD COLUMN IF NOT EXISTS is_covered BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;
