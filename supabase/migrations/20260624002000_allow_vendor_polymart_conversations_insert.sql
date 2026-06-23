-- Migration: allow_vendor_polymart_conversations_insert
-- Drop the existing insert policy on polymart_conversations
DROP POLICY IF EXISTS "polymart_conversations_insert" ON polymart_conversations;

-- Recreate with permission for both buyers and business owners/members
CREATE POLICY "polymart_conversations_insert" ON polymart_conversations
FOR INSERT WITH CHECK (
  buyer_id = (SELECT auth.uid())
  OR vendor_business_id IN (
    SELECT id FROM keusahawanan_businesses WHERE owner_id = (SELECT auth.uid())
    UNION
    SELECT business_id FROM student_business_memberships WHERE user_id = (SELECT auth.uid()) AND status = 'ACTIVE'
  )
);
