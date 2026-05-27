-- 96_polymart_chat_uniqueness.sql
-- Deduplicate existing polymart conversations and enforce database-level uniqueness

-- 1. Deduplicate polymart_conversations safely by merging messages
DO $$
DECLARE
  r RECORD;
  v_primary_id UUID;
BEGIN
  -- Loop through all buyer-vendor pairs that have duplicate conversations
  FOR r IN 
    SELECT buyer_id, vendor_business_id
    FROM polymart_conversations
    GROUP BY buyer_id, vendor_business_id
    HAVING COUNT(*) > 1
  LOOP
    -- Get the newest conversation for this pair (primary)
    SELECT id INTO v_primary_id
    FROM polymart_conversations
    WHERE buyer_id = r.buyer_id AND vendor_business_id = r.vendor_business_id
    ORDER BY last_message_at DESC, created_at DESC
    LIMIT 1;

    -- Update any messages from other duplicate conversations to point to the primary conversation
    UPDATE polymart_messages
    SET conversation_id = v_primary_id
    WHERE conversation_id IN (
      SELECT id 
      FROM polymart_conversations
      WHERE buyer_id = r.buyer_id AND vendor_business_id = r.vendor_business_id AND id != v_primary_id
    );

    -- Delete the duplicate conversations
    DELETE FROM polymart_conversations
    WHERE buyer_id = r.buyer_id AND vendor_business_id = r.vendor_business_id AND id != v_primary_id;
  END LOOP;
END $$;

-- 2. Add UNIQUE constraint to polymart_conversations
ALTER TABLE polymart_conversations 
ADD CONSTRAINT uq_polymart_convs_buyer_vendor UNIQUE (buyer_id, vendor_business_id);
