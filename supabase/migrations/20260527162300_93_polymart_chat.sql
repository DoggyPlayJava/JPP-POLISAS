-- 93_polymart_chat.sql
-- Buyer-vendor in-app messaging system

-- 1. Conversations table
CREATE TABLE IF NOT EXISTS polymart_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  vendor_business_id UUID NOT NULL REFERENCES keusahawanan_businesses(id),
  order_id UUID REFERENCES polymart_orders(id),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Messages table
CREATE TABLE IF NOT EXISTS polymart_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES polymart_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. FK Indexes (mandatory per project rules)
CREATE INDEX IF NOT EXISTS idx_pm_conv_buyer ON polymart_conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_pm_conv_vendor ON polymart_conversations(vendor_business_id);
CREATE INDEX IF NOT EXISTS idx_pm_conv_order ON polymart_conversations(order_id);
CREATE INDEX IF NOT EXISTS idx_pm_msg_conv ON polymart_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_pm_msg_sender ON polymart_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_pm_msg_created ON polymart_messages(created_at);

-- 4. RLS
ALTER TABLE polymart_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE polymart_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: buyer or business members can see
CREATE POLICY "polymart_conversations_select" ON polymart_conversations
FOR SELECT USING (
  buyer_id = (SELECT auth.uid())
  OR vendor_business_id IN (
    SELECT id FROM keusahawanan_businesses WHERE owner_id = (SELECT auth.uid())
    UNION
    SELECT business_id FROM student_business_memberships WHERE user_id = (SELECT auth.uid()) AND status = 'ACTIVE'
  )
);

-- Conversations: authenticated users can insert (to start a chat)
CREATE POLICY "polymart_conversations_insert" ON polymart_conversations
FOR INSERT WITH CHECK (
  buyer_id = (SELECT auth.uid())
);

-- Messages: participants can see messages in their conversations
CREATE POLICY "polymart_messages_select" ON polymart_messages
FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM polymart_conversations
    WHERE buyer_id = (SELECT auth.uid())
    OR vendor_business_id IN (
      SELECT id FROM keusahawanan_businesses WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT business_id FROM student_business_memberships WHERE user_id = (SELECT auth.uid()) AND status = 'ACTIVE'
    )
  )
);

-- Messages: participants can send messages
CREATE POLICY "polymart_messages_insert" ON polymart_messages
FOR INSERT WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND conversation_id IN (
    SELECT id FROM polymart_conversations
    WHERE buyer_id = (SELECT auth.uid())
    OR vendor_business_id IN (
      SELECT id FROM keusahawanan_businesses WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT business_id FROM student_business_memberships WHERE user_id = (SELECT auth.uid()) AND status = 'ACTIVE'
    )
  )
);

-- Messages: recipient can update (mark as read)
CREATE POLICY "polymart_messages_update" ON polymart_messages
FOR UPDATE USING (
  -- Only recipient can update (mark as read), meaning user is not the sender
  sender_id != (SELECT auth.uid())
  AND conversation_id IN (
    SELECT id FROM polymart_conversations
    WHERE buyer_id = (SELECT auth.uid())
    OR vendor_business_id IN (
      SELECT id FROM keusahawanan_businesses WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT business_id FROM student_business_memberships WHERE user_id = (SELECT auth.uid()) AND status = 'ACTIVE'
    )
  )
) WITH CHECK (
  is_read = true
);

-- 5. Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE polymart_messages;
