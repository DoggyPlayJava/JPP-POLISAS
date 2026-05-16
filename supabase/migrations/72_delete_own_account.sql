-- Migration: 72_delete_own_account.sql
-- Description: RPC to allow users to delete their own account from auth.users (cascades to public.profiles) if they decide to cancel their registration.

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the user from auth.users (this cascades to public.profiles)
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
