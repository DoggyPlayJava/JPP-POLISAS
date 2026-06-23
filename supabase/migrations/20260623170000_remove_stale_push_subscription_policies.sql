-- Migration: Remove Stale Push Subscription Policies
-- Description: Removes stale manually-created policies (push_sub_own and push_sub_admin_all) that duplicate the combined policies.

DROP POLICY IF EXISTS "push_sub_own" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_sub_admin_all" ON public.push_subscriptions;
