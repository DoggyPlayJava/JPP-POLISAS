-- Migration: Fix Push Subscriptions RLS and Index
-- Description: Adds a unique index on (user_id, endpoint) to support upsert, adds a foreign key reference to profiles, creates an index for the foreign key, and updates RLS policies to allow authenticated users to manage their own push subscriptions.

-- 1. Ensure foreign key constraint and index exist
ALTER TABLE public.push_subscriptions 
  DROP CONSTRAINT IF EXISTS fk_push_subscriptions_user,
  ADD CONSTRAINT fk_push_subscriptions_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions (user_id);

-- 2. Create unique index to support ON CONFLICT (user_id, endpoint) upsert
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_endpoint_idx ON public.push_subscriptions (user_id, endpoint);

-- 3. Drop existing RLS policies
DROP POLICY IF EXISTS "combined_push_subscriptions_select" ON public.push_subscriptions;
DROP POLICY IF EXISTS "combined_push_subscriptions_insert" ON public.push_subscriptions;
DROP POLICY IF EXISTS "combined_push_subscriptions_update" ON public.push_subscriptions;
DROP POLICY IF EXISTS "combined_push_subscriptions_delete" ON public.push_subscriptions;

-- 4. Create new RLS policies
-- SELECT: Allow any logged-in user to select subscriptions (required since users send notifications to each other/excos via client)
CREATE POLICY "combined_push_subscriptions_select" ON public.push_subscriptions 
  FOR SELECT 
  USING (((SELECT auth.uid()) IS NOT NULL));

-- INSERT: Allow any logged-in user to insert their own subscriptions (or JPP admins)
CREATE POLICY "combined_push_subscriptions_insert" ON public.push_subscriptions 
  FOR INSERT 
  WITH CHECK (
    ((SELECT auth.uid()) = user_id) OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP')))
  );

-- UPDATE: Allow any logged-in user to update their own subscriptions (or JPP admins)
CREATE POLICY "combined_push_subscriptions_update" ON public.push_subscriptions 
  FOR UPDATE 
  USING (
    ((SELECT auth.uid()) = user_id) OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP')))
  );

-- DELETE: Allow any logged-in user to delete their own subscriptions (or JPP admins)
CREATE POLICY "combined_push_subscriptions_delete" ON public.push_subscriptions 
  FOR DELETE 
  USING (
    ((SELECT auth.uid()) = user_id) OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP')))
  );
