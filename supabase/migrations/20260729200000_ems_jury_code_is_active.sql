-- Migration: Add is_active column to ems_jury_codes
ALTER TABLE public.ems_jury_codes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
