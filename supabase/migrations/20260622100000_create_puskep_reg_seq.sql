-- Create the sequence for PUSKEP business registration number generation
CREATE SEQUENCE IF NOT EXISTS public.puskep_reg_seq START WITH 1;

-- Grant permissions to appropriate roles
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.puskep_reg_seq TO authenticated, anon, service_role;

-- Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
