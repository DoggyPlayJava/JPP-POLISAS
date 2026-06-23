# Grouped Database DDL Changes

## 1. Custom Types / Enums / Domains

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
CREATE TYPE polyrent_status AS ENUM ('OPEN', 'CLOSED', 'HIDDEN');
```

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
ALTER TYPE polyrent_status ADD VALUE IF NOT EXISTS 'SUSPENDED';
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE TYPE keusahawanan_business_status AS ENUM ('PENDING_INTERVIEW', 'ACTIVE', 'REJECTED');
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE TYPE keusahawanan_membership_role AS ENUM ('OWNER', 'MEMBER');
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE TYPE keusahawanan_membership_status AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');
```

### Source: `54_polytask_disputes_and_rating.sql`
```sql
ALTER TYPE polytask_job_status ADD VALUE IF NOT EXISTS 'DISPUTED';
```

### Source: `73_polytask_schema.sql`
```sql
CREATE TYPE polytask_job_status AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
```

### Source: `73_polytask_schema.sql`
```sql
CREATE TYPE polytask_bid_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
```

## 2. Storage Buckets & Policies

### Source: `27_polysuara_v4_updates.sql`
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('polysuara_attachments', 'polysuara_attachments', true)
ON CONFLICT (id) DO NOTHING;
```

### Source: `29_keusahawanan_products_bucket.sql`
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'keusahawanan-products',
  'keusahawanan-products',
  true, -- PUBLIC for logos and product images
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
```

### Source: `32_create_polyrent_bucket.sql`
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('polyrent', 'polyrent', true)
ON CONFLICT (id) DO NOTHING;
```

### Source: `33_announcement_poster.sql`
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcements',
  'announcements',
  true, -- PUBLIC access for images
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
```

### Source: `36_supsas_schema.sql`
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('supsas-assets', 'supsas-assets', TRUE)
ON CONFLICT (id) DO NOTHING;
```

### Source: `38_karnival_v2.sql`
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('karnival-booths', 'karnival-booths', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;
```

### Source: `52_polymart_online_payment.sql`
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('polymart-receipts', 'polymart-receipts', true)
ON CONFLICT (id) DO NOTHING;
```

### Source: `57_imaps_storage_bucket.sql`
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'imaps_assets',
    'imaps_assets',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
) ON CONFLICT (id) DO UPDATE SET public = true;
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('polymart-ads', 'polymart-ads', true)
ON CONFLICT (id) DO NOTHING;
```

### Source: `83_polytask_proof_of_work.sql`
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('polytask_proofs', 'polytask_proofs', true)
ON CONFLICT (id) DO NOTHING;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('polytask_proofs', 'polytask_proofs', true)
ON CONFLICT (id) DO NOTHING;
```

## 3. Create / Alter Tables

### Source: `20260429120653_personal_folders.sql`
```sql
ALTER TABLE akademik_folders ALTER COLUMN is_public SET DEFAULT false;
```

### Source: `20260518115654_polyrent_fasa1_availability.sql`
```sql
ALTER TABLE polyrent_listings
ADD COLUMN IF NOT EXISTS available_from DATE DEFAULT CURRENT_DATE;
```

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
CREATE TABLE IF NOT EXISTS polyrent_location_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kawasan_id UUID NOT NULL REFERENCES klk_kawasan(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    safety_rating INT NOT NULL CHECK (safety_rating >= 1 AND safety_rating <= 5),
    facility_rating INT NOT NULL CHECK (facility_rating >= 1 AND facility_rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Seorang pengguna hanya boleh review kawasan yang sama sekali sahaja
    UNIQUE(kawasan_id, reviewer_id)
);
```

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
CREATE TABLE IF NOT EXISTS polyrent_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES polyrent_listings(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEWED', 'ACTION_TAKEN', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Seorang pengguna hanya boleh lapor iklan yang sama sekali sahaja
    UNIQUE(listing_id, reporter_id)
);
```

### Source: `20260518121000_polyrent_fasa3.sql`
```sql
CREATE TABLE IF NOT EXISTS polyrent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES polyrent_listings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Source: `20260518121000_polyrent_fasa3.sql`
```sql
CREATE TABLE IF NOT EXISTS polyrent_reverse_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    budget NUMERIC NOT NULL,
    kawasan_id UUID REFERENCES klk_kawasan(id) ON DELETE SET NULL,
    jantina_prefer TEXT NOT NULL CHECK (jantina_prefer IN ('CAMPURAN', 'LELAKI', 'PEREMPUAN')),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    move_in_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Source: `20260525021000_fix_polyrider_profiles_ref.sql`
```sql
ALTER TABLE polyrider_saved_locations DISABLE TRIGGER trg_saved_locations_limit;
```

### Source: `20260525021000_fix_polyrider_profiles_ref.sql`
```sql
ALTER TABLE polyrider_saved_locations ENABLE TRIGGER trg_saved_locations_limit;
```

### Source: `20260525021000_fix_polyrider_profiles_ref.sql`
```sql
ALTER TABLE polytask_sos_logs DISABLE TRIGGER trg_audit_polyrider_sos;
```

### Source: `20260525021000_fix_polyrider_profiles_ref.sql`
```sql
ALTER TABLE polytask_sos_logs ENABLE TRIGGER trg_audit_polyrider_sos;
```

### Source: `20260527154636_88_polymart_product_variations.sql`
```sql
ALTER TABLE "public"."business_products"
ADD COLUMN IF NOT EXISTS "variations" TEXT[] DEFAULT '{}'::TEXT[];
```

### Source: `20260527154636_88_polymart_product_variations.sql`
```sql
ALTER TABLE "public"."polymart_orders"
ADD COLUMN IF NOT EXISTS "selected_variation" TEXT DEFAULT NULL;
```

### Source: `20260527162000_90_polymart_cancellation_flow.sql`
```sql
ALTER TABLE polymart_orders 
ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);
```

### Source: `20260527162100_91_product_multi_images.sql`
```sql
ALTER TABLE business_products 
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}'::TEXT[];
```

### Source: `20260527162200_92_flash_sale_preorder.sql`
```sql
ALTER TABLE business_products 
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sale_start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sale_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preorder_deadline TIMESTAMPTZ;
```

### Source: `20260527162300_93_polymart_chat.sql`
```sql
CREATE TABLE IF NOT EXISTS polymart_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  vendor_business_id UUID NOT NULL REFERENCES keusahawanan_businesses(id),
  order_id UUID REFERENCES polymart_orders(id),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Source: `20260527162300_93_polymart_chat.sql`
```sql
CREATE TABLE IF NOT EXISTS polymart_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES polymart_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Source: `20260527162400_94_polymart_wishlist.sql`
```sql
CREATE TABLE IF NOT EXISTS polymart_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  product_id UUID NOT NULL REFERENCES business_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);
```

### Source: `20260527162500_95_polymart_jsonb_variations.sql`
```sql
ALTER TABLE "public"."business_products" 
DROP COLUMN IF EXISTS "variations";
```

### Source: `20260527162500_95_polymart_jsonb_variations.sql`
```sql
ALTER TABLE "public"."business_products" 
ADD COLUMN "variations" JSONB DEFAULT '[]'::jsonb;
```

### Source: `20260527162500_95_polymart_jsonb_variations.sql`
```sql
ALTER TABLE "public"."polymart_cart_items"
ADD COLUMN IF NOT EXISTS "selected_variation" TEXT DEFAULT NULL;
```

### Source: `20260527162500_95_polymart_jsonb_variations.sql`
```sql
ALTER TABLE "public"."polymart_cart_items" 
DROP CONSTRAINT IF EXISTS "uq_polymart_cart_item";
```

### Source: `20260527162600_96_polymart_chat_uniqueness.sql`
```sql
ALTER TABLE polymart_conversations 
ADD CONSTRAINT uq_polymart_convs_buyer_vendor UNIQUE (buyer_id, vendor_business_id);
```

### Source: `20260527162700_97_fix_update_product_variation_stock_updated_at.sql`
```sql
ALTER TABLE "public"."polymart_cart_items" DROP CONSTRAINT IF EXISTS "uq_polymart_cart_item";
```

### Source: `20260527162700_97_fix_update_product_variation_stock_updated_at.sql`
```sql
ALTER TABLE "public"."polymart_cart_items" DROP CONSTRAINT IF EXISTS "uq_polymart_cart_item_variation_constraint";
```

### Source: `20260527162700_97_fix_update_product_variation_stock_updated_at.sql`
```sql
ALTER TABLE "public"."polymart_cart_items"
ALTER COLUMN "selected_variation" SET DEFAULT '',
ALTER COLUMN "selected_variation" SET NOT NULL;
```

### Source: `20260527162700_97_fix_update_product_variation_stock_updated_at.sql`
```sql
ALTER TABLE "public"."polymart_cart_items"
ADD CONSTRAINT "uq_polymart_cart_item_variation_constraint" 
UNIQUE USING INDEX "uq_polymart_cart_item_variation_v2";
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    confession_id UUID NOT NULL REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.polysuara_comments(id) ON DELETE CASCADE, -- Peringkat ke-2 (Balas Komen)
    content TEXT NOT NULL CHECK (char_length(content) <= 300),
    codename VARCHAR(100) NOT NULL,
    is_jpp_official BOOLEAN DEFAULT false,
    is_sensitive BOOLEAN DEFAULT false, -- Kesan Blur Sensitif
    is_hidden_by_community BOOLEAN DEFAULT false, -- Community auto-hide
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    reports_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_comment_votes (
    comment_id UUID REFERENCES public.polysuara_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('UPVOTE', 'DOWNVOTE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (comment_id, user_id)
);
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_comment_reports (
    comment_id UUID REFERENCES public.polysuara_comments(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (comment_id, reporter_id)
);
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
ALTER TABLE public.polysuara_confessions ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
```

### Source: `20260529225900_99_polysuara_social_softdelete_images.sql`
```sql
ALTER TABLE public.polysuara_comments 
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_deleted_by_moderator BOOLEAN DEFAULT false;
```

### Source: `26_pembubaran_kohort.sql`
```sql
ALTER TABLE public.club_activities ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
```

### Source: `26_pembubaran_kohort.sql`
```sql
ALTER TABLE public.club_reports ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
```

### Source: `26_pembubaran_kohort.sql`
```sql
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
```

### Source: `26_pembubaran_kohort.sql`
```sql
ALTER TABLE public.club_activities DROP CONSTRAINT IF EXISTS club_activities_user_id_fkey;
```

### Source: `26_pembubaran_kohort.sql`
```sql
ALTER TABLE public.club_reports DROP CONSTRAINT IF EXISTS club_reports_submitted_by_fkey;
```

### Source: `26_pembubaran_kohort.sql`
```sql
ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_user_id_fkey;
```

### Source: `26_pembubaran_kohort.sql`
```sql
ALTER TABLE public.club_activities ALTER COLUMN user_id DROP NOT NULL;
```

### Source: `26_pembubaran_kohort.sql`
```sql
ALTER TABLE public.club_reports ALTER COLUMN submitted_by DROP NOT NULL;
```

### Source: `26_pembubaran_kohort.sql`
```sql
ALTER TABLE public.programs ALTER COLUMN user_id DROP NOT NULL;
```

### Source: `26_pembubaran_kohort.sql`
```sql
ALTER TABLE public.club_activities 
  ADD CONSTRAINT club_activities_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
```

### Source: `26_pembubaran_kohort.sql`
```sql
ALTER TABLE public.club_reports 
  ADD CONSTRAINT club_reports_submitted_by_fkey 
  FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
```

### Source: `26_pembubaran_kohort.sql`
```sql
ALTER TABLE public.programs 
  ADD CONSTRAINT programs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
```

### Source: `27_polysuara_v4_updates.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_censored_words (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    word TEXT NOT NULL UNIQUE,
    added_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Source: `27_polysuara_v4_updates.sql`
```sql
ALTER TABLE public.polysuara_confessions 
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE TABLE IF NOT EXISTS public.keusahawanan_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE TABLE IF NOT EXISTS public.keusahawanan_businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.keusahawanan_categories(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status keusahawanan_business_status DEFAULT 'PENDING_INTERVIEW' NOT NULL,
    interview_date TIMESTAMP WITH TIME ZONE,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE TABLE IF NOT EXISTS public.student_business_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE NOT NULL,
    role keusahawanan_membership_role DEFAULT 'MEMBER' NOT NULL,
    status keusahawanan_membership_status DEFAULT 'PENDING' NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, business_id)
);
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_polls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    confession_id UUID NOT NULL REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    is_multiple_choice BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_poll_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES public.polysuara_polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_poll_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES public.polysuara_polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.polysuara_poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(option_id, user_id) -- User can vote for the same option only once
);
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    confession_id UUID NOT NULL REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exco_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(confession_id) -- Only 1 active chat per confession
);
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES public.polysuara_chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Source: `29_polysuara_auto_archive.sql`
```sql
ALTER TABLE public.polysuara_confessions
ADD COLUMN is_archived BOOLEAN DEFAULT false;
```

### Source: `30_business_shifts_system.sql`
```sql
CREATE TABLE business_shifts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id  uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  shift_date   date NOT NULL,
  shift_hour   int  NOT NULL CHECK (shift_hour BETWEEN 8 AND 16),
  assigned_to  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES profiles(id),
  notes        text,
  status       text DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','PRESENT','ABSENT','SWAPPED')),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(business_id, shift_date, shift_hour)
);
```

### Source: `30_business_shifts_system.sql`
```sql
CREATE TABLE business_shift_swaps (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  shift_id      uuid REFERENCES business_shifts(id) ON DELETE CASCADE,
  requested_by  uuid REFERENCES profiles(id),
  swap_with     uuid REFERENCES profiles(id),
  reason        text NOT NULL,
  status        text DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  responded_by  uuid REFERENCES profiles(id),
  responded_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);
```

### Source: `30_business_shifts_system.sql`
```sql
CREATE TABLE business_sessions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  session_date    date NOT NULL,
  opened_by       uuid REFERENCES profiles(id),
  closed_by       uuid REFERENCES profiles(id),
  opening_cash    numeric(10,2) NOT NULL DEFAULT 0,
  closing_cash    numeric(10,2),
  total_sales     numeric(10,2),
  total_expenses  numeric(10,2) DEFAULT 0,
  net_profit      numeric(10,2) GENERATED ALWAYS AS (
                    closing_cash - opening_cash - total_expenses
                  ) STORED,
  opening_time    timestamptz,
  closing_time    timestamptz,
  opening_notes   text,
  closing_notes   text,
  status          text DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(business_id, session_date)
);
```

### Source: `30_business_shifts_system.sql`
```sql
ALTER TABLE keusahawanan_businesses 
  ADD COLUMN IF NOT EXISTS is_shift_enabled BOOLEAN DEFAULT false;
```

### Source: `30_polysuara_downvote.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_downvotes (
    confession_id UUID NOT NULL REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (confession_id, user_id)
);
```

### Source: `30_polysuara_downvote.sql`
```sql
ALTER TABLE public.polysuara_confessions
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_hidden_by_community BOOLEAN DEFAULT false;
```

### Source: `31_add_staff_details.sql`
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
```

### Source: `32_system_announcements.sql`
```sql
CREATE TABLE IF NOT EXISTS public.system_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content_body TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('EASY', 'MEDIUM', 'HIGH')),
    target_audience TEXT NOT NULL CHECK (target_audience IN ('STUDENT', 'STAFF', 'ALL')),
    action_url TEXT,
    form_schema JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Source: `32_system_announcements.sql`
```sql
CREATE TABLE IF NOT EXISTS public.user_announcement_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    announcement_id UUID REFERENCES public.system_announcements(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('dismissed_permanently', 'completed')),
    form_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, announcement_id)
);
```

### Source: `33_announcement_poster.sql`
```sql
Alter Table
ALTER TABLE public.system_announcements 
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS icon_type TEXT DEFAULT 'INFO';
```

### Source: `36_supsas_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS supsas_editions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                   -- "SUPSAS 2025"
  tagline       TEXT,                            -- "Bersatu, Berjuang, Berjaya"
  edition_year  INT NOT NULL,
  start_date    DATE,
  end_date      DATE,
  is_active     BOOLEAN NOT NULL DEFAULT FALSE,  -- Hanya SATU yang aktif
  logo_url      TEXT,
  banner_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Source: `36_supsas_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS supsas_kontingen (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id          UUID NOT NULL REFERENCES supsas_editions(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,             -- "Jabatan Teknologi Maklumat"
  short_code          TEXT NOT NULL,             -- "JTM"
  color               TEXT NOT NULL DEFAULT '#3B82F6', -- Warna rasmi kontinjen
  logo_url            TEXT,
  leader_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Ketua (pelajar biasa)
  invite_code         TEXT UNIQUE,               -- Kod jemputan untuk claim ketua
  invite_used         BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (edition_id, short_code)
);
```

### Source: `36_supsas_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS supsas_sports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id            UUID NOT NULL REFERENCES supsas_editions(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,           -- "Bola Sepak", "Badminton"
  category              TEXT NOT NULL DEFAULT 'team', -- 'team' | 'individual'
  gender                TEXT NOT NULL DEFAULT 'mixed', -- 'male' | 'female' | 'mixed'
  format                TEXT NOT NULL DEFAULT 'knockout', -- 'knockout' | 'round_robin' | 'group_knockout'
  icon                  TEXT NOT NULL DEFAULT 'Trophy', -- Lucide icon name
  venue                 TEXT,
  max_per_team          INT NOT NULL DEFAULT 11,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order            INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Source: `36_supsas_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS supsas_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      UUID NOT NULL REFERENCES supsas_editions(id) ON DELETE CASCADE,
  kontingen_id    UUID NOT NULL REFERENCES supsas_kontingen(id) ON DELETE CASCADE,
  sport_id        UUID NOT NULL REFERENCES supsas_sports(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position        TEXT,                          -- "Kapten", "Pemain", "Cadangan"
  jersey_number   INT,
  is_confirmed    BOOLEAN NOT NULL DEFAULT FALSE,-- Disahkan oleh admin
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sport_id, kontingen_id, profile_id)  -- Satu pelajar satu slot per sukan per pasukan
);
```

### Source: `36_supsas_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS supsas_fixtures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      UUID NOT NULL REFERENCES supsas_editions(id) ON DELETE CASCADE,
  sport_id        UUID NOT NULL REFERENCES supsas_sports(id) ON DELETE CASCADE,
  round           TEXT,                          -- "Separuh Akhir", "Akhir", "Kumpulan A"
  match_number    INT,
  kontingen_a_id  UUID REFERENCES supsas_kontingen(id) ON DELETE SET NULL,
  kontingen_b_id  UUID REFERENCES supsas_kontingen(id) ON DELETE SET NULL,
  match_date      DATE,
  match_time      TIME,
  venue           TEXT,
  status          TEXT NOT NULL DEFAULT 'upcoming', -- 'upcoming'|'live'|'completed'|'postponed'
  score_a         TEXT,                          -- Fleksibel: "3", "21", "10.2s"
  score_b         TEXT,
  winner_id       UUID REFERENCES supsas_kontingen(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Source: `36_supsas_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS supsas_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      UUID NOT NULL REFERENCES supsas_editions(id) ON DELETE CASCADE,
  sport_id        UUID NOT NULL REFERENCES supsas_sports(id) ON DELETE CASCADE,
  kontingen_id    UUID NOT NULL REFERENCES supsas_kontingen(id) ON DELETE CASCADE,
  medal           TEXT,                          -- 'gold' | 'silver' | 'bronze'
  position        INT,                           -- 1, 2, 3, 4...
  notes           TEXT,
  recorded_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sport_id, kontingen_id)
);
```

### Source: `37_polymart_pos_sync.sql`
```sql
ALTER TABLE "public"."business_products"
ADD COLUMN IF NOT EXISTS "reserved_stock" integer NOT NULL DEFAULT 0;
```

### Source: `37_polymart_pos_sync.sql`
```sql
ALTER TABLE "public"."business_products"
        ADD CONSTRAINT check_stock_reserved_logic CHECK (stock_quantity >= reserved_stock);
```

### Source: `38_karnival_v2.sql`
```sql
CREATE TABLE karnival_editions (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT        NOT NULL,
  tagline             TEXT,
  edition_year        INTEGER     NOT NULL,
  start_date          DATE,
  end_date            DATE,
  is_active           BOOLEAN     NOT NULL DEFAULT false,
  voting_enabled      BOOLEAN     NOT NULL DEFAULT false,
  results_published   BOOLEAN     NOT NULL DEFAULT false,
  cover_image_url     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### Source: `38_karnival_v2.sql`
```sql
CREATE TABLE karnival_categories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id  UUID        NOT NULL REFERENCES karnival_editions(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  icon_emoji  TEXT        DEFAULT '🏆',
  max_votes   INTEGER     NOT NULL DEFAULT 1,
  sort_order  INTEGER     DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Source: `38_karnival_v2.sql`
```sql
CREATE TABLE karnival_booths (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id    UUID        NOT NULL REFERENCES karnival_editions(id) ON DELETE CASCADE,
  category_id   UUID        NOT NULL REFERENCES karnival_categories(id) ON DELETE CASCADE,
  kelab_id      TEXT,
  kelab_name    TEXT        NOT NULL,
  booth_number  TEXT,
  theme         TEXT,
  description   TEXT,
  image_url     TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_kelab_per_category UNIQUE NULLS NOT DISTINCT (kelab_id, category_id)
);
```

### Source: `38_karnival_v2.sql`
```sql
CREATE TABLE karnival_votes_v2 (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id  UUID        NOT NULL REFERENCES karnival_editions(id) ON DELETE CASCADE,
  category_id UUID        NOT NULL REFERENCES karnival_categories(id) ON DELETE CASCADE,
  booth_id    UUID        NOT NULL REFERENCES karnival_booths(id) ON DELETE CASCADE,
  voter_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  matric_no   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_voter_booth UNIQUE (voter_id, booth_id)
);
```

### Source: `38_karnival_v2.sql`
```sql
ALTER TABLE karnival_votes_v2 REPLICA IDENTITY FULL;
```

### Source: `40_program_attendance_system.sql`
```sql
CREATE TABLE IF NOT EXISTS program_attendees (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id       UUID        NOT NULL,
  program_type     TEXT        NOT NULL CHECK (program_type IN ('takwim', 'aktiviti')),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status           TEXT        NOT NULL DEFAULT 'pre_registered'
                               CHECK (status IN ('pre_registered','attended','absent','walk_in')),
  registered_at    TIMESTAMPTZ DEFAULT NOW(),
  checked_in_at    TIMESTAMPTZ,
  check_in_method  TEXT        CHECK (check_in_method IN ('qr','manual')),
  merit_kelab_credited  BOOLEAN DEFAULT false,
  merit_rasmi_credited  BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW(),

  -- Cegah scan berganda: 1 user hanya boleh hadir 1 kali per program
  CONSTRAINT unique_program_attendee UNIQUE (program_id, program_type, user_id)
);
```

### Source: `40_program_attendance_system.sql`
```sql
CREATE TABLE IF NOT EXISTS merit_program_applications (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id       UUID        NOT NULL,
  program_type     TEXT        NOT NULL CHECK (program_type IN ('takwim', 'aktiviti')),
  program_title    TEXT,       -- cache nama program
  applied_by       UUID        REFERENCES profiles(id),
  merit_value      INT         NOT NULL CHECK (merit_value > 0),
  justification    TEXT,

  -- Status flow: pending → akademik_vouched/not_vouched → fully_approved/rejected
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN (
                                 'pending',
                                 'akademik_vouched',
                                 'akademik_not_vouched',
                                 'fully_approved',
                                 'rejected'
                               )),

  -- Akademik review (Voucher/Supporter)
  akademik_reviewer_id    UUID        REFERENCES profiles(id),
  akademik_reviewed_at    TIMESTAMPTZ,
  akademik_vouch_notes    TEXT,

  -- Kediaman review (Kuasa Mutlak)
  kediaman_reviewer_id    UUID        REFERENCES profiles(id),
  kediaman_reviewed_at    TIMESTAMPTZ,
  kediaman_notes          TEXT,
  reject_reason           TEXT,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### Source: `40_program_attendance_system.sql`
```sql
CREATE TABLE IF NOT EXISTS merit_review_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   UUID        NOT NULL REFERENCES merit_program_applications(id) ON DELETE CASCADE,
  reviewer_id      UUID        REFERENCES profiles(id),
  reviewer_unit    TEXT        NOT NULL CHECK (reviewer_unit IN ('AKADEMIK','KEDIAMAN')),
  action           TEXT        NOT NULL CHECK (action IN ('vouched','not_vouched','approved','rejected')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### Source: `40_program_attendance_system.sql`
```sql
ALTER TABLE programs
      ADD COLUMN qr_token         UUID DEFAULT gen_random_uuid(),
      ADD COLUMN qr_enabled       BOOLEAN DEFAULT false,
      ADD COLUMN qr_open_at       TIMESTAMPTZ,
      ADD COLUMN qr_close_at      TIMESTAMPTZ,
      ADD COLUMN pre_reg_enabled  BOOLEAN DEFAULT false,
      ADD COLUMN merit_kelab      INT DEFAULT 0,
      ADD COLUMN merit_eakademik  INT DEFAULT 0;
```

### Source: `40_program_attendance_system.sql`
```sql
ALTER TABLE programs ADD CONSTRAINT programs_qr_token_unique UNIQUE (qr_token);
```

### Source: `40_program_attendance_system.sql`
```sql
ALTER TABLE club_activities
      ADD COLUMN qr_token         UUID DEFAULT gen_random_uuid(),
      ADD COLUMN qr_enabled       BOOLEAN DEFAULT false,
      ADD COLUMN qr_open_at       TIMESTAMPTZ,
      ADD COLUMN qr_close_at      TIMESTAMPTZ,
      ADD COLUMN pre_reg_enabled  BOOLEAN DEFAULT false,
      ADD COLUMN merit_kelab      INT DEFAULT 0;
```

### Source: `40_program_attendance_system.sql`
```sql
ALTER TABLE club_activities ADD CONSTRAINT club_activities_qr_token_unique UNIQUE (qr_token);
```

### Source: `44_polymart_shopping_cart.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polymart_cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a user can only have one row per product in their cart (upsert friendly)
    CONSTRAINT uq_polymart_cart_item UNIQUE (buyer_id, product_id)
);
```

### Source: `45_takwim_pusat.sql`
```sql
CREATE TABLE IF NOT EXISTS takwim_pusat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Kategori entri
  jenis TEXT NOT NULL CHECK (jenis IN (
    'AKADEMIK',
    'JPP',
    'KPP',
    'KEUSAHAWANAN',
    'KEBAJIKAN',
    'SRK',
    'AKADEMIK_EXCO',
    'MULTIMEDIA',
    'KLS',
    'KOLAB',
    'KK',
    'CUTI_UMUM',
    'LAIN'
  )),
  
  -- Butiran
  tajuk TEXT NOT NULL,
  catatan TEXT,
  tarikh_mula DATE NOT NULL,
  tarikh_tamat DATE,
  bil_minggu INTEGER,
  aktiviti TEXT,
  
  -- Warna custom (optional)
  warna_custom TEXT,
  
  -- Sesi akademik
  sesi TEXT DEFAULT '2026/2027',
  
  -- Exco module ownership (untuk RBAC frontend)
  exco_module TEXT,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Source: `46_takwim_kelab_kediaman.sql`
```sql
ALTER TABLE takwim_pusat DROP CONSTRAINT IF EXISTS takwim_pusat_jenis_check;
```

### Source: `46_takwim_kelab_kediaman.sql`
```sql
ALTER TABLE takwim_pusat ADD CONSTRAINT takwim_pusat_jenis_check
  CHECK (jenis IN (
    'AKADEMIK', 'JPP', 'KPP', 'KEUSAHAWANAN', 'KEBAJIKAN', 'SRK',
    'AKADEMIK_EXCO', 'MULTIMEDIA', 'KLS', 'KOLAB', 'KK', 'CUTI_UMUM', 'LAIN',
    'KELAB_KEDIAMAN'
  ));
```

### Source: `46_takwim_kelab_kediaman.sql`
```sql
ALTER TABLE takwim_pusat ADD COLUMN IF NOT EXISTS kelab_kediaman_label TEXT;
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polyrider_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('KERETA', 'MOTOR', 'LAIN-LAIN')),
    plate_number TEXT NOT NULL,
    license_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    license_expiry_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT fk_polyrider_profiles_profiles FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polyrider_zones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pickup_name TEXT NOT NULL,
    dropoff_name TEXT NOT NULL,
    base_fare NUMERIC(10,2) NOT NULL DEFAULT 1.50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polyrider_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES auth.users(id),
    rider_id UUID REFERENCES public.polyrider_profiles(user_id),
    job_type TEXT NOT NULL CHECK (job_type IN ('RIDE', 'FOOD', 'POLYMART_CUST', 'POLYMART_VENDOR')),
    pickup_name TEXT NOT NULL,
    dropoff_name TEXT NOT NULL,
    pickup_lat NUMERIC(10,6),
    pickup_lng NUMERIC(10,6),
    dropoff_lat NUMERIC(10,6),
    dropoff_lng NUMERIC(10,6),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'ARRIVED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'EMERGENCY')),
    distance_km NUMERIC(10,2),
    base_fare NUMERIC(10,2) DEFAULT 0,
    bidaan_tambahan NUMERIC(10,2) DEFAULT 0,
    proposed_price NUMERIC(10,2) NOT NULL, -- The final offered price
    rider_lat NUMERIC(10,6),
    rider_lng NUMERIC(10,6),
    last_location_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polyrider_chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.polyrider_jobs(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polyrider_sos_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.polyrider_jobs(id) ON DELETE CASCADE,
    triggered_by UUID NOT NULL REFERENCES auth.users(id),
    lat NUMERIC(10,6),
    lng NUMERIC(10,6),
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Source: `49_polyrider_bids.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polyrider_bids (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.polyrider_jobs(id) ON DELETE CASCADE,
    rider_id UUID NOT NULL REFERENCES public.polyrider_profiles(user_id) ON DELETE CASCADE,
    bid_amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Source: `51_polymart_polyrider_integration.sql`
```sql
ALTER TABLE public.polyrider_jobs
ADD COLUMN IF NOT EXISTS polymart_order_id UUID REFERENCES public.polymart_orders(id) ON DELETE SET NULL;
```

### Source: `51_polyrider_cancel_sos_appeals.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polyrider_appeals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Source: `51_polyrider_cancel_sos_appeals.sql`
```sql
ALTER TABLE public.polyrider_jobs ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
```

### Source: `51_polyrider_cancel_sos_appeals.sql`
```sql
ALTER TABLE public.polyrider_jobs ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);
```

### Source: `51_polyrider_cancel_sos_appeals.sql`
```sql
ALTER TABLE public.polyrider_sos_logs ADD COLUMN IF NOT EXISTS false_alarm BOOLEAN DEFAULT false;
```

### Source: `51_polyrider_cancel_sos_appeals.sql`
```sql
ALTER TABLE public.polyrider_sos_logs ADD COLUMN IF NOT EXISTS false_alarm_notes TEXT;
```

### Source: `51_polyrider_cancel_sos_appeals.sql`
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS polyrider_penalty_count INT DEFAULT 0;
```

### Source: `51_polyrider_cancel_sos_appeals.sql`
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS polyrider_suspended_until TIMESTAMP WITH TIME ZONE;
```

### Source: `52_polymart_online_payment.sql`
```sql
ALTER TABLE public.keusahawanan_businesses
  ADD COLUMN IF NOT EXISTS online_payment_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cod_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_qr_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS business_phone TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_deadline_value INT DEFAULT 24,
  ADD COLUMN IF NOT EXISTS payment_deadline_unit TEXT DEFAULT 'HOURS'
    CHECK (payment_deadline_unit IN ('HOURS', 'DAYS', 'WEEKS'));
```

### Source: `52_polymart_online_payment.sql`
```sql
ALTER TABLE public.business_products
  ADD COLUMN IF NOT EXISTS online_payment_enabled BOOLEAN DEFAULT NULL;
```

### Source: `52_polymart_online_payment.sql`
```sql
ALTER TABLE public.polymart_orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'COD'
    CHECK (payment_method IN ('COD', 'QR_ONLINE')),
  ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_receipt_rejected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_verified_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS payment_deadline_at TIMESTAMPTZ DEFAULT NULL;
```

### Source: `52_polyrider_job_expiry.sql`
```sql
ALTER TABLE public.polyrider_jobs
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
```

### Source: `53_polyrider_rider_location.sql`
```sql
ALTER TABLE public.polyrider_jobs
  ADD COLUMN IF NOT EXISTS rider_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS rider_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS rider_location_updated_at TIMESTAMPTZ;
```

### Source: `54_polyrider_saved_locations.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polyrider_saved_locations (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT          NOT NULL,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);
```

### Source: `54_polytask_disputes_and_rating.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polytask_disputes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES public.polytask_jobs(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED')),
    admin_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);
```

### Source: `55_imaps_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS public.imaps_buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    center_lat NUMERIC(10, 8),
    center_lng NUMERIC(11, 8),
    drone_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Source: `55_imaps_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS public.imaps_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES public.imaps_buildings(id) ON DELETE CASCADE,
    room_code TEXT NOT NULL,
    floor_level INTEGER,
    direction_text TEXT,
    search_tags TEXT, -- e.g., "Makmal, Lab, Komputer, JTM" for better searching
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Source: `56_imaps_qol_update.sql`
```sql
ALTER TABLE public.imaps_buildings 
ADD COLUMN is_facility BOOLEAN DEFAULT false,
ADD COLUMN facility_type TEXT,
ADD COLUMN op_start TIME,
ADD COLUMN op_end TIME,
ADD COLUMN floorplan_image_url TEXT,
ADD COLUMN entrance_image_url TEXT;
```

### Source: `58_imaps_location_image.sql`
```sql
ALTER TABLE imaps_locations
ADD COLUMN image_url TEXT;
```

### Source: `60_keusahawanan_registration_history.sql`
```sql
ALTER TABLE public.keusahawanan_businesses
ADD COLUMN IF NOT EXISTS registration_history JSONB DEFAULT '[]'::jsonb;
```

### Source: `61_keusahawanan_multiple_mentors.sql`
```sql
ALTER TABLE public.keusahawanan_businesses
ADD COLUMN IF NOT EXISTS mentors JSONB DEFAULT '[]'::jsonb;
```

### Source: `61_keusahawanan_multiple_mentors.sql`
```sql
ALTER TABLE public.keusahawanan_businesses
DROP COLUMN IF EXISTS mentor_name,
DROP COLUMN IF EXISTS mentor_department;
```

### Source: `62_imaps_location_operating_hours.sql`
```sql
ALTER TABLE public.imaps_locations 
ADD COLUMN op_start TIME,
ADD COLUMN op_end TIME;
```

### Source: `63_merit_system_v2.sql`
```sql
CREATE TABLE IF NOT EXISTS public.student_merit_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    cohort_id TEXT NOT NULL,
    total_merit INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Source: `63_merit_system_v2.sql`
```sql
CREATE TABLE IF NOT EXISTS public.demerit_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES public.merit_transactions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    appeal_reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Source: `63_merit_system_v2.sql`
```sql
ALTER TABLE public.merit_transactions 
ADD COLUMN IF NOT EXISTS proof_url TEXT,
ADD COLUMN IF NOT EXISTS academic_session TEXT,
ADD COLUMN IF NOT EXISTS scan_location JSONB;
```

### Source: `63_merit_system_v2.sql`
```sql
ALTER TABLE public.akademik_qr_scans 
ADD COLUMN IF NOT EXISTS scan_location JSONB,
ADD COLUMN IF NOT EXISTS verification_method TEXT;
```

### Source: `63_merit_system_v2.sql`
```sql
ALTER TABLE public.akademik_qr_tokens 
ADD COLUMN IF NOT EXISTS location_lat NUMERIC,
ADD COLUMN IF NOT EXISTS location_lng NUMERIC,
ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS verification_pin TEXT;
```

### Source: `65_add_appeal_proof_url.sql`
```sql
ALTER TABLE public.demerit_appeals
ADD COLUMN IF NOT EXISTS proof_url TEXT;
```

### Source: `67_fix_merit_system_audit.sql`
```sql
ALTER TABLE public.student_merit_cohorts
  ADD COLUMN IF NOT EXISTS merit_kelab    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merit_akademik INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merit_asrama   INTEGER NOT NULL DEFAULT 0;
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polymart_ads (
    id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    title        TEXT        NOT NULL,
    image_url    TEXT        NOT NULL,
    link_url     TEXT,
    type         TEXT        NOT NULL DEFAULT 'INTERNAL' CHECK (type IN ('INTERNAL', 'EXTERNAL')),
    status       TEXT        NOT NULL DEFAULT 'DRAFT'    CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE')),
    start_date   TIMESTAMPTZ,
    end_date     TIMESTAMPTZ,
    clicks       INTEGER     NOT NULL DEFAULT 0,
    created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Source: `73_polytask_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polytask_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    budget NUMERIC(10, 2) NOT NULL DEFAULT 0,
    location TEXT NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,
    status polytask_job_status NOT NULL DEFAULT 'OPEN',
    assigned_tasker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Source: `73_polytask_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polytask_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.polytask_jobs(id) ON DELETE CASCADE,
    tasker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    proposal_note TEXT,
    status polytask_bid_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Source: `73_polytask_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polytask_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.polytask_jobs(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Source: `81_polytask_cancellation_rate.sql`
```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS polytask_cancellations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS polytask_completed_bids INTEGER DEFAULT 0;
```

### Source: `82_polytask_fasa_all.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polytask_jobs_archive (
    id UUID PRIMARY KEY,
    requester_id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    budget NUMERIC,
    location TEXT,
    deadline TIMESTAMPTZ,
    status TEXT,
    assigned_tasker_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Source: `82_polytask_fasa_all.sql`
```sql
ALTER TABLE public.polytask_reviews
ADD COLUMN IF NOT EXISTS reviewer_role TEXT CHECK (reviewer_role IN ('REQUESTER', 'TASKER'));
```

### Source: `83_polytask_proof_of_work.sql`
```sql
ALTER TABLE public.polytask_jobs
ADD COLUMN IF NOT EXISTS proof_image_url TEXT;
```

### Source: `84_polysuara_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_confessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'UMUM',
    upvotes INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT true, -- JPP boleh tukar ke false jika ada unsur toksik
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Source: `84_polysuara_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_upvotes (
    confession_id UUID REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (confession_id, user_id)
);
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
ALTER TABLE public.polytask_jobs
ADD COLUMN IF NOT EXISTS proof_image_url TEXT;
```

### Source: `85_polymatch_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polymatch_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('PROJECT', 'ROOMMATE')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    contact_info VARCHAR(255) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Source: `86_polyservices_moderation.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polyservices_moderation_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    report_threshold INTEGER DEFAULT 5,
    time_window_mins INTEGER DEFAULT 10,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_row CHECK (id = 1)
);
```

### Source: `86_polyservices_moderation.sql`
```sql
CREATE TABLE IF NOT EXISTS public.polyservices_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_id UUID NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('SUARA', 'MATCH')),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_report_per_user UNIQUE (target_id, reporter_id)
);
```

### Source: `86_polyservices_moderation.sql`
```sql
ALTER TABLE public.polymatch_listings ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
```

### Source: `add_merit_eakademik_to_club_activities.sql`
```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS merit_eakademik integer DEFAULT 0;
```

### Source: `add_merit_eakademik_to_club_activities.sql`
```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS merit_kelab integer DEFAULT 0;
```

### Source: `add_merit_eakademik_to_club_activities.sql`
```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_enabled boolean DEFAULT false;
```

### Source: `add_merit_eakademik_to_club_activities.sql`
```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_token text;
```

### Source: `add_merit_eakademik_to_club_activities.sql`
```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_open_at timestamptz;
```

### Source: `add_merit_eakademik_to_club_activities.sql`
```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_close_at timestamptz;
```

### Source: `add_merit_eakademik_to_club_activities.sql`
```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS pre_reg_enabled boolean DEFAULT false;
```

### Source: `rename_akademik_to_kpp_merit_vouch.sql`
```sql
ALTER TABLE public.merit_program_applications 
  RENAME COLUMN akademik_reviewer_id TO kpp_reviewer_id;
```

### Source: `rename_akademik_to_kpp_merit_vouch.sql`
```sql
ALTER TABLE public.merit_program_applications 
  RENAME COLUMN akademik_reviewed_at TO kpp_reviewed_at;
```

### Source: `rename_akademik_to_kpp_merit_vouch.sql`
```sql
ALTER TABLE public.merit_program_applications 
  RENAME COLUMN akademik_vouch_notes TO kpp_vouch_notes;
```

## 4. Custom PostgreSQL Functions (RPCs) & Triggers

### Source: `20260505235200_auto_sort_sijil_akademik.sql`
```sql
CREATE OR REPLACE FUNCTION auto_sort_pencapaian_file(p_pencapaian_id uuid)
RETURNS void AS $$
DECLARE
  v_pencapaian record;
  v_folder_name text;
  v_folder_id uuid;
BEGIN
  -- 1. Fetch pencapaian details
  SELECT * INTO v_pencapaian FROM akademik_pencapaian WHERE id = p_pencapaian_id;
  
  -- Ensure it's verified and has a file
  IF v_pencapaian IS NULL OR v_pencapaian.status != 'DISAHKAN' OR v_pencapaian.drive_view_url IS NULL THEN
    RETURN;
  END IF;

  -- 2. Determine target folder name based on jenis
  IF v_pencapaian.jenis = 'SIJIL' THEN
    v_folder_name := 'Sijil Penyertaan';
  ELSIF v_pencapaian.jenis = 'ANUGERAH' THEN
    v_folder_name := 'Sijil Penghargaan';
  ELSIF v_pencapaian.jenis = 'PERTANDINGAN' THEN
    v_folder_name := 'Sijil Penyertaan';
  ELSE
    v_folder_name := 'Lain-lain';
  END IF;

  -- 3. Check if folder already exists for this user
  SELECT id INTO v_folder_id FROM akademik_folders 
  WHERE created_by = v_pencapaian.user_id AND name = v_folder_name 
  LIMIT 1;

  -- 4. Create folder if it doesn't exist
  IF v_folder_id IS NULL THEN
    INSERT INTO akademik_folders (name, description, created_by, is_public)
    VALUES (v_folder_name, 'Dicipta secara automatik dari Sistem Pencapaian Akademik', v_pencapaian.user_id, false)
    RETURNING id INTO v_folder_id;
  END IF;

  -- 5. Prevent duplicate file inserts in the same folder
  IF EXISTS (
    SELECT 1 FROM akademik_files 
    WHERE folder_id = v_folder_id AND drive_view_url = v_pencapaian.drive_view_url
  ) THEN
    RETURN;
  END IF;

  -- 6. Insert the file record linked to the folder
  INSERT INTO akademik_files (
    folder_id, 
    uploaded_by, 
    owner_user_id, 
    name, 
    file_name, 
    drive_file_id, 
    drive_view_url, 
    drive_download_url, 
    file_type
  ) VALUES (
    v_folder_id, 
    COALESCE(v_pencapaian.verified_by, v_pencapaian.user_id),
    v_pencapaian.user_id, 
    v_pencapaian.nama_pencapaian, 
    v_pencapaian.nama_pencapaian || '.pdf',
    v_pencapaian.drive_file_id, 
    v_pencapaian.drive_view_url, 
    v_pencapaian.drive_download_url, 
    'application/pdf'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `20260512061000_61_wal_monitoring_rpc.sql`
```sql
CREATE OR REPLACE FUNCTION public.get_database_health_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    result jsonb;
```

### Source: `20260518000000_update_polysuara_rate_limit.sql`
```sql
CREATE OR REPLACE FUNCTION public.check_polysuara_hourly_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_count INT;
BEGIN
    -- Pentadbir (JPP/Admin) dikecualikan daripada had
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = NEW.author_id
          AND role IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'SUPER_ADMIN')
    ) THEN
        RETURN NEW;
    END IF;

    -- Kira luahan dalam 1 jam terakhir
    SELECT COUNT(*) INTO v_count
    FROM public.polysuara_confessions
    WHERE author_id = NEW.author_id
      AND created_at >= NOW() - INTERVAL '1 hour';

    IF v_count >= 5 THEN
        -- SQLSTATE P0001 dihantar dengan betul supaya frontend dapat tangkap err.code
        RAISE EXCEPTION 'Had perkongsian per jam (5/jam) telah dicapai. Sila rehat sekejap.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `20260518000000_update_polysuara_rate_limit.sql`
```sql
CREATE TRIGGER trg_polysuara_hourly_limit
BEFORE INSERT ON public.polysuara_confessions
FOR EACH ROW EXECUTE FUNCTION public.check_polysuara_hourly_limit();
```

### Source: `20260518115654_polyrent_fasa1_availability.sql`
```sql
CREATE OR REPLACE FUNCTION polyrent_get_average_rent(lokasi_query text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_rent numeric;
```

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
CREATE OR REPLACE FUNCTION polyrent_check_report_threshold()
RETURNS TRIGGER AS $$
DECLARE
    report_count INT;
BEGIN
    -- Kira jumlah laporan unik untuk iklan ini
    SELECT COUNT(*) INTO report_count
    FROM polyrent_reports
    WHERE listing_id = NEW.listing_id;

    -- Jika 5 laporan diterima, tukar status iklan ke 'SUSPENDED'
    IF report_count >= 5 THEN
        UPDATE polyrent_listings
        SET status = 'SUSPENDED'
        WHERE id = NEW.listing_id AND status != 'SUSPENDED';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
CREATE TRIGGER on_polyrent_report_inserted
    AFTER INSERT ON polyrent_reports
    FOR EACH ROW
    EXECUTE FUNCTION polyrent_check_report_threshold();
```

### Source: `20260518121000_polyrent_fasa3.sql`
```sql
CREATE TRIGGER on_polyrent_reverse_ads_updated
    BEFORE UPDATE ON polyrent_reverse_ads
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
```

### Source: `20260525021000_fix_polyrider_profiles_ref.sql`
```sql
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
```

### Source: `20260525021000_fix_polyrider_profiles_ref.sql`
```sql
CREATE OR REPLACE FUNCTION admin_merge_duplicate_accounts(
  p_primary_id UUID, p_secondary_id UUID
) RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
```

### Source: `20260527154636_88_polymart_product_variations.sql`
```sql
CREATE OR REPLACE FUNCTION complete_polymart_order(
  p_order_id UUID,
  p_business_id UUID,
  p_product_id UUID,
  p_quantity INT,
  p_unit_price DECIMAL,
  p_payment_method TEXT,
  p_served_by UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
```

### Source: `20260527161800_89_complete_order_idempotency_guard.sql`
```sql
CREATE OR REPLACE FUNCTION complete_polymart_order(
  p_order_id UUID,
  p_business_id UUID,
  p_product_id UUID,
  p_quantity INT,
  p_unit_price DECIMAL,
  p_payment_method TEXT,
  p_served_by UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
```

### Source: `20260527162000_90_polymart_cancellation_flow.sql`
```sql
CREATE OR REPLACE FUNCTION buyer_cancel_polymart_order(
  p_order_id UUID, 
  p_buyer_id UUID, 
  p_reason TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
```

### Source: `20260527162000_90_polymart_cancellation_flow.sql`
```sql
CREATE OR REPLACE FUNCTION vendor_handle_cancellation(
  p_order_id UUID,
  p_vendor_id UUID,
  p_action TEXT -- 'approve' or 'reject'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
```

### Source: `20260527162500_95_polymart_jsonb_variations.sql`
```sql
CREATE OR REPLACE FUNCTION update_product_variation_stock(
  p_product_id UUID,
  p_variation TEXT,
  p_qty_change INT,
  p_reserved_change INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_variations JSONB;
```

### Source: `20260527162500_95_polymart_jsonb_variations.sql`
```sql
CREATE OR REPLACE FUNCTION reserve_polymart_stock(
  p_product_id UUID,
  p_quantity INT,
  p_variation TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INT;
```

### Source: `20260527162500_95_polymart_jsonb_variations.sql`
```sql
CREATE OR REPLACE FUNCTION release_polymart_stock(
  p_product_id UUID,
  p_quantity INT,
  p_variation TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM update_product_variation_stock(p_product_id, p_variation, 0, -p_quantity);
```

### Source: `20260527162500_95_polymart_jsonb_variations.sql`
```sql
CREATE OR REPLACE FUNCTION complete_polymart_order(
  p_order_id UUID,
  p_business_id UUID,
  p_product_id UUID,
  p_quantity INT,
  p_unit_price DECIMAL,
  p_payment_method TEXT,
  p_served_by UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
```

### Source: `20260527162500_95_polymart_jsonb_variations.sql`
```sql
CREATE OR REPLACE FUNCTION buyer_cancel_polymart_order(
  p_order_id UUID, 
  p_buyer_id UUID, 
  p_reason TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
```

### Source: `20260527162500_95_polymart_jsonb_variations.sql`
```sql
CREATE OR REPLACE FUNCTION vendor_handle_cancellation(
  p_order_id UUID,
  p_vendor_id UUID,
  p_action TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
```

### Source: `20260527162700_97_fix_update_product_variation_stock_updated_at.sql`
```sql
CREATE OR REPLACE FUNCTION public.update_product_variation_stock(
  p_product_id uuid,
  p_variation text,
  p_qty_change integer,
  p_reserved_change integer
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_variations JSONB;
```

### Source: `20260527162700_97_fix_update_product_variation_stock_updated_at.sql`
```sql
CREATE OR REPLACE FUNCTION public.complete_polymart_order(
  p_order_id UUID,
  p_business_id UUID,
  p_product_id UUID,
  p_quantity INT,
  p_unit_price DECIMAL,
  p_payment_method TEXT,
  p_served_by UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE TRIGGER trg_censor_polysuara_comment
BEFORE INSERT OR UPDATE OF content ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.censor_polysuara_content();
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE OR REPLACE FUNCTION public.generate_polysuara_comment_codename()
RETURNS TRIGGER AS $$
DECLARE
    v_confession_author_id UUID;
    v_confession_codename VARCHAR(100);
    v_hash TEXT;
BEGIN
    -- Ambil maklumat confession utama
    SELECT author_id, codename INTO v_confession_author_id, v_confession_codename
    FROM public.polysuara_confessions
    WHERE id = NEW.confession_id;

    -- Semak jika pengomen adalah OP (Original Poster)
    IF NEW.user_id = v_confession_author_id THEN
        NEW.codename := v_confession_codename || ' [Penulis]';
    ELSE
        -- Hashing selamat berasaskan (user_id + confession_id) untuk nama samaran unik bagi thread ini
        v_hash := substring(md5(NEW.user_id::text || NEW.confession_id::text), 1, 5);
        NEW.codename := 'Anon-' || v_hash;
    END IF;

    -- Tandakan is_jpp_official jika pengomen adalah Exco JPP
    IF public.is_jpp_admin(NEW.user_id) THEN
        NEW.is_jpp_official := true;
    ELSE
        NEW.is_jpp_official := false;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE TRIGGER trg_polysuara_comment_codename
BEFORE INSERT ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.generate_polysuara_comment_codename();
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE OR REPLACE FUNCTION public.toggle_polysuara_comment_vote(p_comment_id UUID, p_vote_type VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE OR REPLACE FUNCTION public.report_polysuara_comment(p_comment_id UUID, p_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE OR REPLACE FUNCTION public.restore_hidden_comment(p_comment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Hanya JPP dibenarkan memulihkan komen
    IF NOT public.is_jpp_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE OR REPLACE FUNCTION public.sync_polysuara_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.polysuara_confessions 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.confession_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.polysuara_confessions 
        SET comments_count = comments_count - 1 
        WHERE id = OLD.confession_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE TRIGGER trg_sync_polysuara_comment_count
AFTER INSERT OR DELETE ON public.polysuara_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_polysuara_comment_count();
```

### Source: `20260529225900_99_polysuara_social_softdelete_images.sql`
```sql
CREATE OR REPLACE FUNCTION public.soft_or_hard_delete_polysuara_comment(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_replies BOOLEAN;
```

### Source: `26_pembubaran_kohort.sql`
```sql
CREATE OR REPLACE FUNCTION rpc_pembubaran_kohort()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Arkib laporan & aktiviti yang Diluluskan/Selesai/COMPLETED
    UPDATE public.club_activities 
    SET is_archived = TRUE 
    WHERE status = 'selesai' AND is_archived = FALSE;
```

### Source: `27_pembubaran_kelab.sql`
```sql
CREATE OR REPLACE FUNCTION rpc_pembubaran_kohort_kelab(target_club_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Arkib laporan & aktiviti yang Diluluskan/Selesai/COMPLETED untuk kelab khusus
    UPDATE public.club_activities 
    SET is_archived = TRUE 
    WHERE status = 'selesai' AND is_archived = FALSE AND club_id = target_club_id::uuid;
```

### Source: `27_pembubaran_kelab.sql`
```sql
CREATE OR REPLACE FUNCTION rpc_pembersihan_akaun_lama()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
    deleted_count integer;
```

### Source: `27_pembubaran_kelab.sql`
```sql
CREATE OR REPLACE FUNCTION rpc_pembubaran_kohort()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Arkib laporan & aktiviti yang Diluluskan/Selesai/COMPLETED
    UPDATE public.club_activities 
    SET is_archived = TRUE 
    WHERE status = 'selesai' AND is_archived = FALSE;
```

### Source: `27_polysuara_v4_updates.sql`
```sql
Create Trigger for Auto Censor (Regex Replace)
CREATE OR REPLACE FUNCTION public.censor_polysuara_content()
RETURNS TRIGGER AS $$
DECLARE
    rec RECORD;
```

### Source: `27_polysuara_v4_updates.sql`
```sql
CREATE TRIGGER trg_censor_polysuara
BEFORE INSERT OR UPDATE OF content ON public.polysuara_confessions
FOR EACH ROW EXECUTE FUNCTION public.censor_polysuara_content();
```

### Source: `30_business_shifts_system.sql`
```sql
CREATE OR REPLACE FUNCTION has_business_shift_access(b_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_business_memberships
    WHERE business_id = b_id 
      AND user_id = auth.uid()
      AND status = 'ACTIVE'
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'ADMIN')
  )
$$;
```

### Source: `30_polysuara_downvote.sql`
```sql
CREATE OR REPLACE FUNCTION public.toggle_polysuara_downvote(p_confession_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
```

### Source: `30_polysuara_downvote.sql`
```sql
CREATE OR REPLACE FUNCTION public.toggle_polysuara_upvote(p_confession_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
```

### Source: `30_polysuara_downvote.sql`
```sql
CREATE OR REPLACE FUNCTION public.restore_hidden_confession(p_confession_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
```

### Source: `33_transfer_business_ownership.sql`
```sql
CREATE OR REPLACE FUNCTION transfer_business_ownership(p_business_id UUID, p_new_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_owner_id UUID;
```

### Source: `34_staff_registration_code.sql`
```sql
CREATE OR REPLACE FUNCTION verify_staff_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actual_code text;
```

### Source: `35_security_jpp_profile_rpc.sql`
```sql
CREATE OR REPLACE FUNCTION update_jpp_member_profile(
  p_target_id   UUID,
  p_jpp_position TEXT,
  p_jpp_unit    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role      TEXT;
```

### Source: `35_security_jpp_profile_rpc.sql`
```sql
CREATE OR REPLACE FUNCTION assign_jpp_member(
  p_target_id    UUID,
  p_jpp_position TEXT,
  p_jpp_unit     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role      TEXT;
```

### Source: `35_security_jpp_profile_rpc.sql`
```sql
CREATE OR REPLACE FUNCTION toggle_jpp_role(
  p_target_id UUID
)
RETURNS TEXT  -- Mengembalikan role baharu
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role     TEXT;
```

### Source: `36_supsas_schema.sql`
```sql
CREATE OR REPLACE FUNCTION supsas_claim_invite_code(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kontingen supsas_kontingen%ROWTYPE;
```

### Source: `36_supsas_schema.sql`
```sql
CREATE OR REPLACE FUNCTION supsas_revoke_leader(p_kontingen_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP') THEN
    RAISE EXCEPTION 'Akses ditolak.';
```

### Source: `36_supsas_schema.sql`
```sql
CREATE OR REPLACE FUNCTION supsas_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW();
```

### Source: `36_supsas_schema.sql`
```sql
CREATE TRIGGER supsas_editions_updated_at    BEFORE UPDATE ON supsas_editions    FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
```

### Source: `36_supsas_schema.sql`
```sql
CREATE TRIGGER supsas_kontingen_updated_at   BEFORE UPDATE ON supsas_kontingen   FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
```

### Source: `36_supsas_schema.sql`
```sql
CREATE TRIGGER supsas_sports_updated_at      BEFORE UPDATE ON supsas_sports      FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
```

### Source: `36_supsas_schema.sql`
```sql
CREATE TRIGGER supsas_fixtures_updated_at    BEFORE UPDATE ON supsas_fixtures    FOR EACH ROW EXECUTE FUNCTION supsas_set_updated_at();
```

### Source: `37_polymart_pos_sync.sql`
```sql
CREATE OR REPLACE FUNCTION reserve_polymart_stock(
  p_product_id UUID,
  p_quantity INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INT;
```

### Source: `37_polymart_pos_sync.sql`
```sql
CREATE OR REPLACE FUNCTION release_polymart_stock(
  p_product_id UUID,
  p_quantity INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE business_products
  SET reserved_stock = GREATEST(0, reserved_stock - p_quantity)
  WHERE id = p_product_id;
```

### Source: `37_polymart_pos_sync.sql`
```sql
CREATE OR REPLACE FUNCTION complete_polymart_order(
  p_order_id UUID,
  p_business_id UUID,
  p_product_id UUID,
  p_quantity INT,
  p_unit_price DECIMAL,
  p_payment_method TEXT,
  p_served_by UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
```

### Source: `38_karnival_v2.sql`
```sql
CREATE OR REPLACE FUNCTION get_karnival_booth_votes(p_edition_id UUID, p_category_id UUID)
RETURNS TABLE(booth_id UUID, booth_name TEXT, booth_number TEXT, image_url TEXT, total_votes BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT b.id, b.kelab_name, b.booth_number, b.image_url, COUNT(v.id)
  FROM karnival_booths b
  LEFT JOIN karnival_votes_v2 v ON v.booth_id = b.id
  WHERE b.edition_id = p_edition_id AND b.category_id = p_category_id AND b.is_active = true
  GROUP BY b.id, b.kelab_name, b.booth_number, b.image_url
  ORDER BY COUNT(v.id) DESC, b.kelab_name ASC;
```

### Source: `38_karnival_v2.sql`
```sql
CREATE OR REPLACE FUNCTION get_my_karnival_votes_in_category(p_category_id UUID)
RETURNS TABLE(booth_id UUID, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT v.booth_id, v.created_at FROM karnival_votes_v2 v
  WHERE v.voter_id = auth.uid() AND v.category_id = p_category_id
  ORDER BY v.created_at DESC;
```

### Source: `39_track_google_api_tokens.sql`
```sql
CREATE OR REPLACE FUNCTION public.increment_ai_google_tokens(tokens_used integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current bigint;
```

### Source: `40_program_attendance_system.sql`
```sql
CREATE OR REPLACE FUNCTION fn_auto_credit_kelab_merit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merit  INT;
```

### Source: `40_program_attendance_system.sql`
```sql
CREATE TRIGGER trg_auto_credit_kelab_merit
  BEFORE INSERT OR UPDATE OF status
  ON program_attendees
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_credit_kelab_merit();
```

### Source: `41_klk_public_stats_rpc.sql`
```sql
CREATE OR REPLACE FUNCTION get_klk_public_stats(academic_year_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_luar int;
```

### Source: `42_check_email_registered.sql`
```sql
CREATE OR REPLACE FUNCTION check_email_registered(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
```

### Source: `43_get_auth_providers.sql`
```sql
CREATE OR REPLACE FUNCTION get_auth_providers(p_email text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_providers text[];
```

### Source: `46_reset_jpp_cohort.sql`
```sql
CREATE OR REPLACE FUNCTION reset_jpp_cohort()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role      TEXT;
```

### Source: `46_reset_jpp_cohort.sql`
```sql
CREATE OR REPLACE FUNCTION remove_jpp_member(
  p_target_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role      TEXT;
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE OR REPLACE FUNCTION public.is_klk_or_admin(uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    role_val TEXT;
    unit_val TEXT;
BEGIN
    SELECT role, jpp_unit INTO role_val, unit_val FROM public.profiles WHERE id = uid;
    IF role_val IN ('SUPER_ADMIN_JPP', 'STAFF') THEN
        RETURN TRUE;
    END IF;
    IF role_val = 'JPP' AND unit_val = 'KLS' THEN
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE OR REPLACE FUNCTION public.get_active_polyrider_count()
RETURNS INTEGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    SELECT count(*) INTO active_count FROM public.polyrider_profiles WHERE is_active = true AND status = 'APPROVED' AND (license_expiry_date > now() OR license_expiry_date IS NULL);
    RETURN active_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `50_polyrider_security_patch.sql`
```sql
CREATE OR REPLACE FUNCTION public.create_polyrider_job(p_student_id uuid, p_pickup_name text, p_dropoff_name text, p_pickup_lat numeric DEFAULT NULL::numeric, p_pickup_lng numeric DEFAULT NULL::numeric, p_dropoff_lat numeric DEFAULT NULL::numeric, p_dropoff_lng numeric DEFAULT NULL::numeric, p_proposed_price numeric DEFAULT 3.0, p_is_carpool_open boolean DEFAULT false, p_join_group_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF polyrider_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_job          polyrider_jobs%ROWTYPE;
```

### Source: `50_polyrider_security_patch.sql`
```sql
CREATE OR REPLACE FUNCTION public.get_active_polyrider_count()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    active_count INTEGER;
```

### Source: `50_polyrider_security_patch.sql`
```sql
CREATE OR REPLACE FUNCTION public.get_my_carpool_group_ids()
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT ARRAY(
    SELECT DISTINCT carpool_group_id 
    FROM polyrider_jobs 
    WHERE student_id = auth.uid()
      AND carpool_group_id IS NOT NULL
      AND status IN ('GATHERING', 'CARPOOL_REQUEST', 'PENDING')
  );
```

### Source: `50_polyrider_security_patch.sql`
```sql
CREATE OR REPLACE FUNCTION public.is_klk_or_admin(uid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    role_val TEXT;
```

### Source: `50_polyrider_security_patch.sql`
```sql
CREATE OR REPLACE FUNCTION public.lock_polyrider_carpool(p_group_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Change all accepted members from GATHERING to PENDING
  UPDATE polyrider_jobs
  SET status = 'PENDING', is_carpool_open = false
  WHERE carpool_group_id = p_group_id AND status = 'GATHERING';
```

### Source: `50_polyrider_security_patch.sql`
```sql
CREATE OR REPLACE FUNCTION public.respond_carpool_request(p_request_id uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_group_id UUID;
```

### Source: `50_polyrider_security_patch.sql`
```sql
CREATE OR REPLACE FUNCTION public.update_rider_avg_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.student_rating IS NOT NULL AND (OLD.student_rating IS NULL OR OLD.student_rating != NEW.student_rating) THEN
    UPDATE polyrider_profiles SET
      avg_rating = (
        SELECT ROUND(AVG(student_rating)::NUMERIC, 2)
        FROM polyrider_jobs
        WHERE rider_id = NEW.rider_id AND student_rating IS NOT NULL
      ),
      total_trips = (
        SELECT COUNT(*) FROM polyrider_jobs
        WHERE rider_id = NEW.rider_id AND status = 'COMPLETED'
      )
    WHERE user_id = NEW.rider_id;
```

### Source: `51_polymart_polyrider_integration.sql`
```sql
CREATE OR REPLACE FUNCTION public.create_polyrider_job(
    p_student_id uuid,
    p_pickup_name text,
    p_dropoff_name text,
    p_pickup_lat numeric DEFAULT NULL::numeric,
    p_pickup_lng numeric DEFAULT NULL::numeric,
    p_dropoff_lat numeric DEFAULT NULL::numeric,
    p_dropoff_lng numeric DEFAULT NULL::numeric,
    p_proposed_price numeric DEFAULT 3.0,
    p_is_carpool_open boolean DEFAULT false,
    p_join_group_id uuid DEFAULT NULL::uuid,
    p_job_type text DEFAULT 'RIDE',
    p_polymart_order_id uuid DEFAULT NULL::uuid
)
 RETURNS SETOF polyrider_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_job          polyrider_jobs%ROWTYPE;
```

### Source: `51_polyrider_cancel_sos_appeals.sql`
```sql
CREATE OR REPLACE FUNCTION public.cancel_polyrider_job(p_job_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
```

### Source: `51_polyrider_cancel_sos_appeals.sql`
```sql
CREATE OR REPLACE FUNCTION public.process_polyrider_appeal(p_appeal_id uuid, p_approve boolean, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_admin_id UUID := auth.uid();
```

### Source: `52_polymart_online_payment.sql`
```sql
CREATE OR REPLACE FUNCTION public.cancel_expired_polymart_orders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
```

### Source: `52_polymart_online_payment.sql`
```sql
CREATE OR REPLACE FUNCTION public.get_expiring_polymart_orders()
RETURNS TABLE(id UUID, buyer_id UUID, product_name TEXT, payment_deadline_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.buyer_id,
         COALESCE(p.name, 'Produk'),
         o.payment_deadline_at
  FROM polymart_orders o
  LEFT JOIN business_products p ON p.id = o.product_id
  WHERE o.status = 'PENDING'
    AND o.payment_verified_at IS NULL
    AND o.payment_deadline_at IS NOT NULL
    AND o.payment_deadline_at BETWEEN NOW() + interval '55 minutes'
                                   AND NOW() + interval '65 minutes';
```

### Source: `52_polyrider_job_expiry.sql`
```sql
CREATE OR REPLACE FUNCTION set_polyrider_job_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set for new PENDING jobs that don't already have an expiry
  IF (TG_OP = 'INSERT') AND NEW.status = 'PENDING' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '15 minutes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `52_polyrider_job_expiry.sql`
```sql
CREATE TRIGGER trg_polyrider_job_expiry
  BEFORE INSERT ON public.polyrider_jobs
  FOR EACH ROW EXECUTE FUNCTION set_polyrider_job_expiry();
```

### Source: `54_polyrider_saved_locations.sql`
```sql
CREATE OR REPLACE FUNCTION check_saved_locations_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.polyrider_saved_locations
    WHERE user_id = NEW.user_id
  ) >= 5 THEN
    RAISE EXCEPTION 'Had maksimum 5 lokasi kegemaran telah dicapai.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `54_polyrider_saved_locations.sql`
```sql
CREATE TRIGGER trg_saved_locations_limit
  BEFORE INSERT ON public.polyrider_saved_locations
  FOR EACH ROW EXECUTE FUNCTION check_saved_locations_limit();
```

### Source: `60_keusahawanan_registration_history.sql`
```sql
CREATE OR REPLACE FUNCTION public.generate_puskep_reg_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_year TEXT;
```

### Source: `64_merit_archive_cohort.sql`
```sql
CREATE OR REPLACE FUNCTION public.archive_merit_cohort(p_cohort_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Archive the current total_merit into student_merit_cohorts for users with merit != 0
    INSERT INTO public.student_merit_cohorts (user_id, cohort_id, total_merit)
    SELECT id, p_cohort_id, merit
    FROM public.profiles
    WHERE merit != 0;
```

### Source: `67_fix_merit_system_audit.sql`
```sql
CREATE OR REPLACE FUNCTION public.archive_merit_cohort(p_cohort_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Archive full breakdown into student_merit_cohorts
    INSERT INTO public.student_merit_cohorts (
      user_id, cohort_id, total_merit, merit_kelab, merit_akademik, merit_asrama
    )
    SELECT id, p_cohort_id, merit,
           COALESCE(merit_kelab, 0),
           COALESCE(merit_akademik, 0),
           COALESCE(merit_asrama, 0)
    FROM public.profiles
    WHERE merit != 0 OR merit_kelab != 0 OR merit_akademik != 0 OR merit_asrama != 0;
```

### Source: `67_fix_merit_system_audit.sql`
```sql
CREATE OR REPLACE FUNCTION public.increment_merit_by_source(p_uid uuid, p_delta integer, p_src text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    merit          = COALESCE(merit, 0) + p_delta,
    merit_kelab    = CASE WHEN p_src IN ('KELAB', 'PROGRAM')
                         THEN COALESCE(merit_kelab, 0) + p_delta
                         ELSE merit_kelab END,
    merit_akademik = CASE WHEN p_src = 'AKADEMIK'
                         THEN COALESCE(merit_akademik, 0) + p_delta
                         ELSE merit_akademik END,
    merit_asrama   = CASE WHEN p_src = 'QR_SCAN'
                         THEN COALESCE(merit_asrama, 0) + p_delta
                         ELSE merit_asrama END
  WHERE id = p_uid;
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
CREATE OR REPLACE FUNCTION public.increment_polymart_ad_click(ad_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.polymart_ads
    SET clicks = clicks + 1
    WHERE id = ad_id
    AND status = 'ACTIVE';
```

### Source: `70_flexible_login_and_duplicate_detection.sql`
```sql
CREATE OR REPLACE FUNCTION resolve_login_identifier(p_identifier TEXT)
RETURNS TABLE(email TEXT, match_type TEXT, match_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
```

### Source: `70_flexible_login_and_duplicate_detection.sql`
```sql
CREATE OR REPLACE FUNCTION detect_duplicate_matric_accounts()
RETURNS TABLE(
  matric_no TEXT,
  account_count BIGINT,
  accounts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auth guard: hanya SUPER_ADMIN_JPP atau JPP boleh akses
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ) THEN
    RAISE EXCEPTION 'Akses Ditolak: Hanya JPP Admin boleh lihat data ini.';
```

### Source: `71_block_duplicate_matric_and_merge_tool.sql`
```sql
CREATE OR REPLACE FUNCTION check_matric_registered(p_matric_no TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
```

### Source: `71_block_duplicate_matric_and_merge_tool.sql`
```sql
CREATE OR REPLACE FUNCTION admin_merge_duplicate_accounts(
  p_primary_id UUID,
  p_secondary_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
```

### Source: `72_delete_own_account.sql`
```sql
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
```

### Source: `73_polytask_schema.sql`
```sql
CREATE OR REPLACE FUNCTION handle_polytask_bid_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when a bid status changes to 'ACCEPTED'
    IF NEW.status = 'ACCEPTED' AND OLD.status != 'ACCEPTED' THEN
        
        -- 1. Tolak bidaan lain
        UPDATE public.polytask_bids 
        SET status = 'REJECTED' 
        WHERE job_id = NEW.job_id AND id != NEW.id;
        
        -- 2. Kemas kini status tugasan & tetapkan pekerja
        UPDATE public.polytask_jobs
        SET status = 'IN_PROGRESS',
            assigned_tasker_id = NEW.tasker_id,
            updated_at = NOW()
        WHERE id = NEW.job_id;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `73_polytask_schema.sql`
```sql
CREATE TRIGGER trigger_polytask_bid_acceptance
    AFTER UPDATE ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION handle_polytask_bid_acceptance();
```

### Source: `81_polytask_cancellation_rate.sql`
```sql
CREATE OR REPLACE FUNCTION update_polytask_completion_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        -- Tambah +1 pada polytask_completed_bids untuk tasker yang berjaya siapkan kerja
        IF NEW.assigned_tasker_id IS NOT NULL THEN
            UPDATE public.profiles
            SET polytask_completed_bids = polytask_completed_bids + 1
            WHERE id = NEW.assigned_tasker_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `81_polytask_cancellation_rate.sql`
```sql
CREATE TRIGGER trigger_update_polytask_completion_metrics
    AFTER UPDATE ON public.polytask_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_polytask_completion_metrics();
```

### Source: `81_polytask_cancellation_rate.sql`
```sql
CREATE OR REPLACE FUNCTION handle_polytask_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'WITHDRAWN' AND OLD.status = 'ACCEPTED' THEN
        -- Tambah +1 pada cancellation_count
        UPDATE public.profiles
        SET polytask_cancellations = polytask_cancellations + 1
        WHERE id = NEW.tasker_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `81_polytask_cancellation_rate.sql`
```sql
CREATE TRIGGER trigger_handle_polytask_cancellation
    AFTER UPDATE ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION handle_polytask_cancellation();
```

### Source: `82_polytask_fasa_all.sql`
```sql
CREATE OR REPLACE FUNCTION get_average_budget_by_category(p_category TEXT)
RETURNS NUMERIC AS $$
DECLARE
    avg_budget NUMERIC;
BEGIN
    SELECT COALESCE(AVG(budget), 0) INTO avg_budget
    FROM public.polytask_jobs
    WHERE category = p_category AND status IN ('COMPLETED', 'IN_PROGRESS', 'CLOSED');
    
    RETURN avg_budget;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `82_polytask_fasa_all.sql`
```sql
CREATE OR REPLACE FUNCTION archive_old_polytask_jobs()
RETURNS void AS $$
BEGIN
    -- Salin ke arkib
    INSERT INTO public.polytask_jobs_archive (id, requester_id, title, description, category, budget, location, deadline, status, assigned_tasker_id, created_at, updated_at)
    SELECT id, requester_id, title, description, category, budget, location, deadline, status, assigned_tasker_id, created_at, updated_at
    FROM public.polytask_jobs
    WHERE status IN ('COMPLETED', 'CANCELLED') 
    AND updated_at < NOW() - INTERVAL '3 months';

    -- Padam dari jadual aktif
    DELETE FROM public.polytask_jobs
    WHERE status IN ('COMPLETED', 'CANCELLED') 
    AND updated_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `82_polytask_fasa_all.sql`
```sql
CREATE OR REPLACE FUNCTION check_polytask_bid_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_bids_count INT;
BEGIN
    SELECT COUNT(*) INTO recent_bids_count
    FROM public.polytask_bids
    WHERE tasker_id = NEW.tasker_id
    AND created_at > NOW() - INTERVAL '1 hour';

    IF recent_bids_count >= 10 THEN
        RAISE EXCEPTION 'Rate limit exceeded: You can only place 10 bids per hour.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `82_polytask_fasa_all.sql`
```sql
CREATE TRIGGER trigger_check_polytask_bid_rate_limit
    BEFORE INSERT ON public.polytask_bids
    FOR EACH ROW
    EXECUTE FUNCTION check_polytask_bid_rate_limit();
```

### Source: `82_polytask_fasa_all.sql`
```sql
CREATE OR REPLACE FUNCTION log_polytask_critical_actions()
RETURNS TRIGGER AS $$
BEGIN
    -- Jika Tasker tarik diri
    IF NEW.status = 'OPEN' AND OLD.status = 'IN_PROGRESS' AND OLD.assigned_tasker_id IS NOT NULL AND NEW.assigned_tasker_id IS NULL THEN
        INSERT INTO public.admin_audit_logs (actor_id, action_type, table_name, record_id, old_data, new_data)
        VALUES (OLD.assigned_tasker_id, 'UPDATE', 'polytask_jobs', OLD.id::TEXT, row_to_json(OLD), row_to_json(NEW));
    END IF;

    -- Jika status jadi DISPUTED
    IF NEW.status = 'DISPUTED' AND OLD.status != 'DISPUTED' THEN
        INSERT INTO public.admin_audit_logs (actor_id, action_type, table_name, record_id, old_data, new_data)
        VALUES (COALESCE(auth.uid(), OLD.requester_id), 'UPDATE', 'polytask_jobs', OLD.id::TEXT, row_to_json(OLD), row_to_json(NEW));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Source: `82_polytask_fasa_all.sql`
```sql
CREATE TRIGGER trigger_log_polytask_critical_actions
    AFTER UPDATE ON public.polytask_jobs
    FOR EACH ROW
    EXECUTE FUNCTION log_polytask_critical_actions();
```

### Source: `84_polysuara_schema.sql`
```sql
CREATE OR REPLACE FUNCTION toggle_polysuara_upvote(p_confession_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
CREATE OR REPLACE FUNCTION update_polytask_completion_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        IF NEW.assigned_tasker_id IS NOT NULL THEN
            UPDATE public.profiles
            SET polytask_completed_bids = polytask_completed_bids + 1
            WHERE id = NEW.assigned_tasker_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
CREATE OR REPLACE FUNCTION handle_polytask_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'WITHDRAWN' AND OLD.status = 'ACCEPTED' THEN
        UPDATE public.profiles
        SET polytask_cancellations = polytask_cancellations + 1
        WHERE id = NEW.tasker_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
CREATE OR REPLACE FUNCTION get_average_budget_by_category(p_category TEXT)
RETURNS NUMERIC AS $$
DECLARE avg_budget NUMERIC;
BEGIN
    SELECT COALESCE(AVG(budget), 0) INTO avg_budget
    FROM public.polytask_jobs
    WHERE category = p_category AND status IN ('COMPLETED', 'IN_PROGRESS', 'CLOSED');
    RETURN avg_budget;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
CREATE OR REPLACE FUNCTION archive_old_polytask_jobs()
RETURNS void AS $$
BEGIN
    INSERT INTO public.polytask_jobs_archive (id, requester_id, title, description, category, budget, location, deadline, status, assigned_tasker_id, created_at, updated_at)
    SELECT id, requester_id, title, description, category, budget, location, deadline, status, assigned_tasker_id, created_at, updated_at
    FROM public.polytask_jobs
    WHERE status IN ('COMPLETED', 'CANCELLED') AND updated_at < NOW() - INTERVAL '3 months';

    DELETE FROM public.polytask_jobs
    WHERE status IN ('COMPLETED', 'CANCELLED') AND updated_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
CREATE OR REPLACE FUNCTION check_polytask_bid_rate_limit()
RETURNS TRIGGER AS $$
DECLARE recent_bids_count INT;
BEGIN
    SELECT COUNT(*) INTO recent_bids_count
    FROM public.polytask_bids
    WHERE tasker_id = NEW.tasker_id AND created_at > NOW() - INTERVAL '1 hour';

    IF recent_bids_count >= 10 THEN
        RAISE EXCEPTION 'Rate limit exceeded: You can only place 10 bids per hour.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
CREATE OR REPLACE FUNCTION log_polytask_critical_actions()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'OPEN' AND OLD.status = 'IN_PROGRESS' AND OLD.assigned_tasker_id IS NOT NULL AND NEW.assigned_tasker_id IS NULL THEN
        INSERT INTO public.admin_audit_logs (actor_id, action_type, table_name, record_id, old_data, new_data)
        VALUES (OLD.assigned_tasker_id, 'UPDATE', 'polytask_jobs', OLD.id::TEXT, row_to_json(OLD), row_to_json(NEW));
    END IF;
    IF NEW.status = 'DISPUTED' AND OLD.status != 'DISPUTED' THEN
        INSERT INTO public.admin_audit_logs (actor_id, action_type, table_name, record_id, old_data, new_data)
        VALUES (COALESCE(auth.uid(), OLD.requester_id), 'UPDATE', 'polytask_jobs', OLD.id::TEXT, row_to_json(OLD), row_to_json(NEW));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
CREATE OR REPLACE FUNCTION is_polytask_admin(uid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM public.profiles WHERE id = uid AND role IN ('JPP', 'SUPER_ADMIN_JPP'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
CREATE OR REPLACE FUNCTION get_active_polytask_count()
RETURNS integer AS $$
BEGIN
    RETURN (SELECT count(*)::integer FROM public.polytask_jobs WHERE status IN ('OPEN', 'IN_PROGRESS'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
CREATE OR REPLACE FUNCTION handle_polytask_bid_acceptance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.status = 'ACCEPTED' AND OLD.status != 'ACCEPTED' THEN
        UPDATE public.polytask_bids SET status = 'REJECTED' WHERE job_id = NEW.job_id AND id != NEW.id;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
CREATE OR REPLACE FUNCTION process_polytask_appeal(p_appeal_id uuid, p_approve boolean, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('MAJLIS_TERTINGGI','EXCO_KEBAJIKAN','EXCO_KAMSIS','EXCO_KEUSAHAWANAN','DEVELOPER')) THEN
    RAISE EXCEPTION 'Unauthorized';
```

### Source: `86_polyservices_moderation.sql`
```sql
CREATE OR REPLACE FUNCTION submit_polyservices_report(
    p_target_id UUID,
    p_target_type VARCHAR,
    p_reason VARCHAR
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reporter_id UUID;
```

### Source: `87_polymart_auto_cancel_hotfix.sql`
```sql
CREATE OR REPLACE FUNCTION public.cancel_expired_polymart_orders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
```

### Source: `quick_fix_pembubaran.sql`
```sql
CREATE FUNCTION public.rpc_pembubaran_kohort_kelab(target_club_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    club_uuid uuid;
```

## 5. Row-Level Security (RLS) Policies

### Source: `20260425132500_optimize_database.sql`
```sql
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
```

### Source: `20260425132500_optimize_database.sql`
```sql
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
```

### Source: `20260425132500_optimize_database.sql`
```sql
DROP POLICY IF EXISTS "Student can read own memberships" ON public.student_club_memberships;
```

### Source: `20260425132500_optimize_database.sql`
```sql
DROP POLICY IF EXISTS "Students can read own memberships" ON public.student_club_memberships;
```

### Source: `20260425132500_optimize_database.sql`
```sql
DROP POLICY IF EXISTS "Student can request membership" ON public.student_club_memberships;
```

### Source: `20260425132500_optimize_database.sql`
```sql
DROP POLICY IF EXISTS "Students can apply to clubs" ON public.student_club_memberships;
```

### Source: `20260425132500_optimize_database.sql`
```sql
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
```

### Source: `20260425132500_optimize_database.sql`
```sql
DROP POLICY IF EXISTS "kb_ticket_select_own" ON public.kebajikan_tickets;
```

### Source: `20260425132500_optimize_database.sql`
```sql
DROP POLICY IF EXISTS "kb_ticket_update_own" ON public.kebajikan_tickets;
```

### Source: `20260425132500_optimize_database.sql`
```sql
DROP POLICY IF EXISTS "Users can view their own programs" ON public.programs;
```

### Source: `20260425132500_optimize_database.sql`
```sql
DROP POLICY IF EXISTS "Users can insert their own programs" ON public.programs;
```

### Source: `20260425132500_optimize_database.sql`
```sql
DROP POLICY IF EXISTS "Users can update their own programs" ON public.programs;
```

### Source: `20260425132500_optimize_database.sql`
```sql
DROP POLICY IF EXISTS "Users can delete their own programs" ON public.programs;
```

### Source: `20260425132500_optimize_database.sql`
```sql
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (user_id = (select auth.uid()));
```

### Source: `20260425132500_optimize_database.sql`
```sql
CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (user_id = (select auth.uid()));
```

### Source: `20260425132500_optimize_database.sql`
```sql
CREATE POLICY "Student can read own memberships" ON public.student_club_memberships
FOR SELECT USING (user_id = (select auth.uid()));
```

### Source: `20260425132500_optimize_database.sql`
```sql
CREATE POLICY "Students can read own memberships" ON public.student_club_memberships
FOR SELECT USING (user_id::text = (select auth.uid())::text);
```

### Source: `20260425132500_optimize_database.sql`
```sql
CREATE POLICY "Student can request membership" ON public.student_club_memberships
FOR INSERT WITH CHECK (user_id = (select auth.uid()) AND account_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text]));
```

### Source: `20260425132500_optimize_database.sql`
```sql
CREATE POLICY "Students can apply to clubs" ON public.student_club_memberships
FOR INSERT WITH CHECK (user_id = (select auth.uid()) AND account_status = 'PENDING'::text);
```

### Source: `20260425132500_optimize_database.sql`
```sql
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (id = (select auth.uid()));
```

### Source: `20260425132500_optimize_database.sql`
```sql
CREATE POLICY "kb_ticket_select_own" ON public.kebajikan_tickets
FOR SELECT USING (submitter_id = (select auth.uid()));
```

### Source: `20260425132500_optimize_database.sql`
```sql
CREATE POLICY "kb_ticket_update_own" ON public.kebajikan_tickets
FOR UPDATE USING (submitter_id = (select auth.uid()));
```

### Source: `20260425132500_optimize_database.sql`
```sql
CREATE POLICY "Users can view their own programs" ON public.programs
FOR SELECT USING (user_id = (select auth.uid()));
```

### Source: `20260425132500_optimize_database.sql`
```sql
CREATE POLICY "Users can insert their own programs" ON public.programs
FOR INSERT WITH CHECK (user_id = (select auth.uid()));
```

### Source: `20260425132500_optimize_database.sql`
```sql
CREATE POLICY "Users can update their own programs" ON public.programs
FOR UPDATE USING (user_id = (select auth.uid()));
```

### Source: `20260425132500_optimize_database.sql`
```sql
CREATE POLICY "Users can delete their own programs" ON public.programs
FOR DELETE USING (user_id = (select auth.uid()));
```

### Source: `20260425133500_fix_security_warnings.sql`
```sql
DROP POLICY IF EXISTS "Semua boleh tulis log" ON public.club_logs;
```

### Source: `20260425133500_fix_security_warnings.sql`
```sql
DROP POLICY IF EXISTS "kb_notif_update_read" ON public.kebajikan_notifications;
```

### Source: `20260425133500_fix_security_warnings.sql`
```sql
CREATE POLICY "Semua boleh tulis log" ON public.club_logs 
FOR INSERT WITH CHECK (actor_id = (select auth.uid()));
```

### Source: `20260425133500_fix_security_warnings.sql`
```sql
CREATE POLICY "kb_notif_update_read" ON public.kebajikan_notifications 
FOR UPDATE USING (
  (target_user_id = (select auth.uid())) OR is_kebajikan_staff()
) WITH CHECK (
  (target_user_id = (select auth.uid())) OR is_kebajikan_staff()
);
```

### Source: `20260429120653_personal_folders.sql`
```sql
DROP POLICY IF EXISTS akfol_select ON akademik_folders;
```

### Source: `20260429120653_personal_folders.sql`
```sql
DROP POLICY IF EXISTS akfol_insert ON akademik_folders;
```

### Source: `20260429120653_personal_folders.sql`
```sql
DROP POLICY IF EXISTS akfol_update ON akademik_folders;
```

### Source: `20260429120653_personal_folders.sql`
```sql
DROP POLICY IF EXISTS akfol_delete ON akademik_folders;
```

### Source: `20260429120653_personal_folders.sql`
```sql
DROP POLICY IF EXISTS akf_select ON akademik_files;
```

### Source: `20260429120653_personal_folders.sql`
```sql
DROP POLICY IF EXISTS akf_insert ON akademik_files;
```

### Source: `20260429120653_personal_folders.sql`
```sql
DROP POLICY IF EXISTS akf_update ON akademik_files;
```

### Source: `20260429120653_personal_folders.sql`
```sql
DROP POLICY IF EXISTS akf_delete ON akademik_files;
```

### Source: `20260429120653_personal_folders.sql`
```sql
CREATE POLICY akfol_select ON akademik_folders FOR SELECT USING (created_by = auth.uid());
```

### Source: `20260429120653_personal_folders.sql`
```sql
CREATE POLICY akfol_insert ON akademik_folders FOR INSERT WITH CHECK (created_by = auth.uid());
```

### Source: `20260429120653_personal_folders.sql`
```sql
CREATE POLICY akfol_update ON akademik_folders FOR UPDATE USING (created_by = auth.uid());
```

### Source: `20260429120653_personal_folders.sql`
```sql
CREATE POLICY akfol_delete ON akademik_folders FOR DELETE USING (created_by = auth.uid());
```

### Source: `20260429120653_personal_folders.sql`
```sql
CREATE POLICY akf_select ON akademik_files FOR SELECT USING (uploaded_by = auth.uid() OR owner_user_id = auth.uid());
```

### Source: `20260429120653_personal_folders.sql`
```sql
CREATE POLICY akf_insert ON akademik_files FOR INSERT WITH CHECK (uploaded_by = auth.uid() OR owner_user_id = auth.uid());
```

### Source: `20260429120653_personal_folders.sql`
```sql
CREATE POLICY akf_update ON akademik_files FOR UPDATE USING (uploaded_by = auth.uid() OR owner_user_id = auth.uid());
```

### Source: `20260429120653_personal_folders.sql`
```sql
CREATE POLICY akf_delete ON akademik_files FOR DELETE USING (uploaded_by = auth.uid() OR owner_user_id = auth.uid());
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
DROP POLICY IF EXISTS "karnival_votes_v2_admin_delete" ON public.karnival_votes_v2;
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
DROP POLICY IF EXISTS "karnival_votes_v2_admin_update" ON public.karnival_votes_v2;
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
DROP POLICY IF EXISTS "karnival_votes_v2_delete_own" ON public.karnival_votes_v2;
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
DROP POLICY IF EXISTS "karnival_votes_v2_insert_self" ON public.karnival_votes_v2;
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
DROP POLICY IF EXISTS "scm_select" ON public.student_club_memberships;
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
DROP POLICY IF EXISTS "kamsis_dynamic_fields_admin_all" ON public.kamsis_dynamic_fields;
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
DROP POLICY IF EXISTS "kamsis_applications_admin_all" ON public.kamsis_applications;
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
DROP POLICY IF EXISTS "kamsis_applications_insert_own" ON public.kamsis_applications;
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
DROP POLICY IF EXISTS "kamsis_applications_select_own" ON public.kamsis_applications;
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
DROP POLICY IF EXISTS "kamsis_applications_update_own" ON public.kamsis_applications;
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
DROP POLICY IF EXISTS "User can manage own cgpa" ON public.akademik_cgpa_records;
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
DROP POLICY IF EXISTS "JPP can view all cgpa" ON public.akademik_cgpa_records;
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
DROP POLICY IF EXISTS "amc_modify" ON public.akademik_merit_config;
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "karnival_votes_v2_admin_delete" ON public.karnival_votes_v2 FOR DELETE USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'SUPER_ADMIN_JPP'::text OR profiles.role = 'JPP'::text OR profiles.jabatan = 'JPP'::text) )
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "karnival_votes_v2_admin_update" ON public.karnival_votes_v2 FOR UPDATE USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'SUPER_ADMIN_JPP'::text OR profiles.role = 'JPP'::text OR profiles.jabatan = 'JPP'::text) )
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "karnival_votes_v2_delete_own" ON public.karnival_votes_v2 FOR DELETE USING (
  (select auth.uid()) = voter_id
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "karnival_votes_v2_insert_self" ON public.karnival_votes_v2 FOR INSERT WITH CHECK (
  (select auth.uid()) = voter_id AND EXISTS ( SELECT 1 FROM karnival_editions WHERE karnival_editions.id = karnival_votes_v2.edition_id AND karnival_editions.voting_enabled = true )
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "scm_select" ON public.student_club_memberships FOR SELECT USING (
  (select auth.uid()) IS NOT NULL
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "kamsis_dynamic_fields_admin_all" ON public.kamsis_dynamic_fields FOR ALL USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role IN ('SUPER_ADMIN_JPP', 'STAFF') OR (profiles.role = 'JPP' AND profiles.jpp_unit = 'KK') OR (profiles.role = 'JPP' AND profiles.jpp_position IN ('YDP', 'YANG_DIPERTUA', 'NAIB_YDP'))) )
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "kamsis_applications_admin_all" ON public.kamsis_applications FOR ALL USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role IN ('SUPER_ADMIN_JPP', 'STAFF') OR (profiles.role = 'JPP' AND profiles.jpp_unit = 'KK') OR (profiles.role = 'JPP' AND profiles.jpp_position IN ('YDP', 'YANG_DIPERTUA', 'NAIB_YDP'))) )
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "kamsis_applications_insert_own" ON public.kamsis_applications FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "kamsis_applications_select_own" ON public.kamsis_applications FOR SELECT USING (
  user_id = (select auth.uid())
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "kamsis_applications_update_own" ON public.kamsis_applications FOR UPDATE USING (
  user_id = (select auth.uid())
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "akademik_cgpa_records_select" ON public.akademik_cgpa_records FOR SELECT USING (
  user_id = (select auth.uid()) 
  OR EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP') )
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "akademik_cgpa_records_insert" ON public.akademik_cgpa_records FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "akademik_cgpa_records_update" ON public.akademik_cgpa_records FOR UPDATE USING (
  user_id = (select auth.uid())
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "akademik_cgpa_records_delete" ON public.akademik_cgpa_records FOR DELETE USING (
  user_id = (select auth.uid())
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "amc_insert" ON public.akademik_merit_config FOR INSERT WITH CHECK (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'SUPER_ADMIN_JPP' )
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "amc_update" ON public.akademik_merit_config FOR UPDATE USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'SUPER_ADMIN_JPP' )
);
```

### Source: `20260504231952_optimize_performance_rls.sql`
```sql
CREATE POLICY "amc_delete" ON public.akademik_merit_config FOR DELETE USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'SUPER_ADMIN_JPP' )
);
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
DROP POLICY IF EXISTS aqt_modify ON public.akademik_qr_tokens;
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
DROP POLICY IF EXISTS asc_modify ON public.akademik_sijil_categories;
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
DROP POLICY IF EXISTS unlock_requests_exco_all ON public.akademik_unlock_requests;
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
DROP POLICY IF EXISTS aur_select ON public.akademik_unlock_requests;
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
DROP POLICY IF EXISTS unlock_req_admin_update ON public.akademik_unlock_requests;
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
CREATE POLICY aqt_insert ON public.akademik_qr_tokens FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')));
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
CREATE POLICY aqt_update ON public.akademik_qr_tokens FOR UPDATE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')));
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
CREATE POLICY aqt_delete ON public.akademik_qr_tokens FOR DELETE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')));
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
CREATE POLICY asc_insert ON public.akademik_sijil_categories FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role = 'SUPER_ADMIN_JPP'));
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
CREATE POLICY asc_update ON public.akademik_sijil_categories FOR UPDATE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role = 'SUPER_ADMIN_JPP'));
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
CREATE POLICY asc_delete ON public.akademik_sijil_categories FOR DELETE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = uid() AND profiles.role = 'SUPER_ADMIN_JPP'));
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
CREATE POLICY aur_select ON public.akademik_unlock_requests FOR SELECT 
USING (
    user_id = uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND (
            profiles.role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP', 'CLUB_MT', 'MT') 
        )
    )
);
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
CREATE POLICY aur_exco_insert ON public.akademik_unlock_requests FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND (
            profiles.role = 'SUPER_ADMIN_JPP' 
            OR (profiles.role = 'JPP' AND profiles.jpp_unit = 'AKADEMIK') 
            OR profiles.role IN ('CLUB_MT', 'MT')
        )
    )
);
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
CREATE POLICY aur_admin_update ON public.akademik_unlock_requests FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND profiles.role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'JPP', 'CLUB_MT', 'MT')
    )
);
```

### Source: `20260512054626_59_performance_optimizations.sql`
```sql
CREATE POLICY aur_exco_delete ON public.akademik_unlock_requests FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND (
            profiles.role = 'SUPER_ADMIN_JPP' 
            OR (profiles.role = 'JPP' AND profiles.jpp_unit = 'AKADEMIK') 
            OR profiles.role IN ('CLUB_MT', 'MT')
        )
    )
);
```

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
ALTER TABLE polyrent_location_reviews ENABLE ROW LEVEL SECURITY;
```

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
CREATE POLICY "Semua pengguna boleh baca review kawasan"
    ON polyrent_location_reviews FOR SELECT
    TO authenticated
    USING (true);
```

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
CREATE POLICY "Pengguna boleh tambah review sendiri"
    ON polyrent_location_reviews FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reviewer_id);
```

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
CREATE POLICY "Pengguna boleh update review sendiri"
    ON polyrent_location_reviews FOR UPDATE
    TO authenticated
    USING (auth.uid() = reviewer_id);
```

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
CREATE POLICY "Pengguna boleh buang review sendiri"
    ON polyrent_location_reviews FOR DELETE
    TO authenticated
    USING (auth.uid() = reviewer_id);
```

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
ALTER TABLE polyrent_reports ENABLE ROW LEVEL SECURITY;
```

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
CREATE POLICY "Admin boleh baca semua report"
    ON polyrent_reports FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN_JPP', 'JPP')
        )
    );
```

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
CREATE POLICY "Pengguna boleh baca report sendiri"
    ON polyrent_reports FOR SELECT
    TO authenticated
    USING (auth.uid() = reporter_id);
```

### Source: `20260518120600_polyrent_fasa2.sql`
```sql
CREATE POLICY "Pengguna boleh tambah report"
    ON polyrent_reports FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reporter_id);
```

### Source: `20260518121000_polyrent_fasa3.sql`
```sql
ALTER TABLE polyrent_messages ENABLE ROW LEVEL SECURITY;
```

### Source: `20260518121000_polyrent_fasa3.sql`
```sql
CREATE POLICY "Pengguna boleh baca mesej yang dihantar atau diterima"
    ON polyrent_messages FOR SELECT
    TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
```

### Source: `20260518121000_polyrent_fasa3.sql`
```sql
CREATE POLICY "Pengguna boleh hantar mesej"
    ON polyrent_messages FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = sender_id);
```

### Source: `20260518121000_polyrent_fasa3.sql`
```sql
CREATE POLICY "Penerima boleh kemaskini status is_read"
    ON polyrent_messages FOR UPDATE
    TO authenticated
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);
```

### Source: `20260518121000_polyrent_fasa3.sql`
```sql
ALTER TABLE polyrent_reverse_ads ENABLE ROW LEVEL SECURITY;
```

### Source: `20260518121000_polyrent_fasa3.sql`
```sql
CREATE POLICY "Semua orang boleh baca reverse ads yang OPEN"
    ON polyrent_reverse_ads FOR SELECT
    TO authenticated
    USING (status = 'OPEN' OR auth.uid() = student_id);
```

### Source: `20260518121000_polyrent_fasa3.sql`
```sql
CREATE POLICY "Pelajar boleh tambah reverse ad"
    ON polyrent_reverse_ads FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);
```

### Source: `20260518121000_polyrent_fasa3.sql`
```sql
CREATE POLICY "Pelajar boleh update reverse ad sendiri"
    ON polyrent_reverse_ads FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id);
```

### Source: `20260518121000_polyrent_fasa3.sql`
```sql
CREATE POLICY "Pelajar boleh delete reverse ad sendiri"
    ON polyrent_reverse_ads FOR DELETE
    TO authenticated
    USING (auth.uid() = student_id);
```

### Source: `20260527162300_93_polymart_chat.sql`
```sql
ALTER TABLE polymart_conversations ENABLE ROW LEVEL SECURITY;
```

### Source: `20260527162300_93_polymart_chat.sql`
```sql
ALTER TABLE polymart_messages ENABLE ROW LEVEL SECURITY;
```

### Source: `20260527162300_93_polymart_chat.sql`
```sql
CREATE POLICY "polymart_conversations_select" ON polymart_conversations
FOR SELECT USING (
  buyer_id = (SELECT auth.uid())
  OR vendor_business_id IN (
    SELECT id FROM keusahawanan_businesses WHERE owner_id = (SELECT auth.uid())
    UNION
    SELECT business_id FROM student_business_memberships WHERE user_id = (SELECT auth.uid()) AND status = 'ACTIVE'
  )
);
```

### Source: `20260527162300_93_polymart_chat.sql`
```sql
CREATE POLICY "polymart_conversations_insert" ON polymart_conversations
FOR INSERT WITH CHECK (
  buyer_id = (SELECT auth.uid())
);
```

### Source: `20260527162300_93_polymart_chat.sql`
```sql
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
```

### Source: `20260527162300_93_polymart_chat.sql`
```sql
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
```

### Source: `20260527162300_93_polymart_chat.sql`
```sql
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
```

### Source: `20260527162400_94_polymart_wishlist.sql`
```sql
ALTER TABLE polymart_wishlist ENABLE ROW LEVEL SECURITY;
```

### Source: `20260527162400_94_polymart_wishlist.sql`
```sql
CREATE POLICY "polymart_wishlist_select" ON polymart_wishlist
FOR SELECT USING (user_id = (SELECT auth.uid()));
```

### Source: `20260527162400_94_polymart_wishlist.sql`
```sql
CREATE POLICY "polymart_wishlist_insert" ON polymart_wishlist
FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
```

### Source: `20260527162400_94_polymart_wishlist.sql`
```sql
CREATE POLICY "polymart_wishlist_delete" ON polymart_wishlist
FOR DELETE USING (user_id = (SELECT auth.uid()));
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
ALTER TABLE public.polysuara_comments ENABLE ROW LEVEL SECURITY;
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
ALTER TABLE public.polysuara_comment_votes ENABLE ROW LEVEL SECURITY;
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
ALTER TABLE public.polysuara_comment_reports ENABLE ROW LEVEL SECURITY;
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE POLICY "Pelajar boleh baca ulasan" ON public.polysuara_comments
    FOR SELECT USING (is_hidden_by_community = false);
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE POLICY "Pelajar boleh buat ulasan" ON public.polysuara_comments
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE POLICY "JPP boleh urus ulasan" ON public.polysuara_comments
    FOR ALL USING (public.is_jpp_admin((SELECT auth.uid()))) 
    WITH CHECK (public.is_jpp_admin((SELECT auth.uid())));
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE POLICY "Pelajar boleh lihat undian ulasan sendiri" ON public.polysuara_comment_votes
    FOR SELECT USING ((SELECT auth.uid()) = user_id);
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE POLICY "Pelajar boleh buat undian ulasan sendiri" ON public.polysuara_comment_votes
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE POLICY "Pelajar boleh padam undian ulasan sendiri" ON public.polysuara_comment_votes
    FOR DELETE USING ((SELECT auth.uid()) = user_id);
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE POLICY "JPP boleh urus undian ulasan" ON public.polysuara_comment_votes
    FOR ALL USING (public.is_jpp_admin((SELECT auth.uid())));
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE POLICY "Pelajar boleh buat laporan ulasan" ON public.polysuara_comment_reports
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = reporter_id);
```

### Source: `20260529224800_98_polysuara_social_comments.sql`
```sql
CREATE POLICY "JPP boleh urus laporan ulasan" ON public.polysuara_comment_reports
    FOR ALL USING (public.is_jpp_admin((SELECT auth.uid())));
```

### Source: `27_polysuara_v4_updates.sql`
```sql
ALTER TABLE public.polysuara_confessions 
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- 2. Create polysuara_censored_words table
CREATE TABLE IF NOT EXISTS public.polysuara_censored_words (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    word TEXT NOT NULL UNIQUE,
    added_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for censored words
ALTER TABLE public.polysuara_censored_words ENABLE ROW LEVEL SECURITY;
```

### Source: `27_polysuara_v4_updates.sql`
```sql
CREATE POLICY "Allow public read censored words" 
ON public.polysuara_censored_words FOR SELECT USING (true);
```

### Source: `27_polysuara_v4_updates.sql`
```sql
CREATE POLICY "Allow authenticated full access censored words" 
ON public.polysuara_censored_words FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');
```

### Source: `27_polysuara_v4_updates.sql`
```sql
CREATE POLICY "Give public access to polysuara_attachments" ON storage.objects FOR SELECT USING (bucket_id = 'polysuara_attachments');
```

### Source: `27_polysuara_v4_updates.sql`
```sql
CREATE POLICY "Allow authenticated inserts to polysuara_attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'polysuara_attachments' AND auth.role() = 'authenticated');
```

### Source: `28_keusahawanan_module.sql`
```sql
ALTER TABLE public.keusahawanan_categories ENABLE ROW LEVEL SECURITY;
```

### Source: `28_keusahawanan_module.sql`
```sql
ALTER TABLE public.keusahawanan_businesses ENABLE ROW LEVEL SECURITY;
```

### Source: `28_keusahawanan_module.sql`
```sql
ALTER TABLE public.student_business_memberships ENABLE ROW LEVEL SECURITY;
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE POLICY "Public Read Access for Keusahawanan Categories" ON public.keusahawanan_categories FOR SELECT USING (true);
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE POLICY "Admin All Access for Keusahawanan Categories" ON public.keusahawanan_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP'))
);
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE POLICY "Public read active businesses" ON public.keusahawanan_businesses FOR SELECT USING (
  status = 'ACTIVE' OR owner_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP'))
);
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE POLICY "Students can create business" ON public.keusahawanan_businesses FOR INSERT WITH CHECK (
  auth.uid() = owner_id
);
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE POLICY "Owners and Admins can update their business" ON public.keusahawanan_businesses FOR UPDATE USING (
  auth.uid() = owner_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP'))
);
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE POLICY "Users can see their own memberships or if they are admin" ON public.student_business_memberships FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')) OR
  -- Active business owners can also see memberships of their business
  EXISTS (SELECT 1 FROM keusahawanan_businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
);
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE POLICY "Students can request to join" ON public.student_business_memberships FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE POLICY "Owners and Admins can update memberships" ON public.student_business_memberships FOR UPDATE USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')) OR
  EXISTS (SELECT 1 FROM keusahawanan_businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
);
```

### Source: `28_keusahawanan_module.sql`
```sql
CREATE POLICY "Owners and Admins can delete memberships" ON public.student_business_memberships FOR DELETE USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')) OR
  EXISTS (SELECT 1 FROM keusahawanan_businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
);
```

### Source: `28_polysuara_v5_features.sql`
```sql
ALTER TABLE public.polysuara_polls ENABLE ROW LEVEL SECURITY;
```

### Source: `28_polysuara_v5_features.sql`
```sql
ALTER TABLE public.polysuara_poll_options ENABLE ROW LEVEL SECURITY;
```

### Source: `28_polysuara_v5_features.sql`
```sql
ALTER TABLE public.polysuara_poll_votes ENABLE ROW LEVEL SECURITY;
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE POLICY "Allow public read polls" ON public.polysuara_polls FOR SELECT USING (true);
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE POLICY "Allow authenticated insert polls" ON public.polysuara_polls FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE POLICY "Allow public read poll options" ON public.polysuara_poll_options FOR SELECT USING (true);
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE POLICY "Allow authenticated insert poll options" ON public.polysuara_poll_options FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE POLICY "Allow public read poll votes" ON public.polysuara_poll_votes FOR SELECT USING (true);
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE POLICY "Allow authenticated insert poll votes" ON public.polysuara_poll_votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE POLICY "Allow authenticated delete own poll votes" ON public.polysuara_poll_votes FOR DELETE USING (auth.uid() = user_id);
```

### Source: `28_polysuara_v5_features.sql`
```sql
ALTER TABLE public.polysuara_chats ENABLE ROW LEVEL SECURITY;
```

### Source: `28_polysuara_v5_features.sql`
```sql
ALTER TABLE public.polysuara_chat_messages ENABLE ROW LEVEL SECURITY;
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE POLICY "Allow users to read their own chats" ON public.polysuara_chats FOR SELECT USING (
    auth.uid() = student_id OR 
    auth.uid() = exco_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('JPP', 'SUPER_ADMIN_JPP'))
);
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE POLICY "Allow excos to insert chats" ON public.polysuara_chats FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('JPP', 'SUPER_ADMIN_JPP'))
);
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE POLICY "Allow excos to update chats" ON public.polysuara_chats FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('JPP', 'SUPER_ADMIN_JPP'))
);
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE POLICY "Allow users to read messages in their chats" ON public.polysuara_chat_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.polysuara_chats c WHERE c.id = chat_id AND (c.student_id = auth.uid() OR c.exco_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('JPP', 'SUPER_ADMIN_JPP'))))
);
```

### Source: `28_polysuara_v5_features.sql`
```sql
CREATE POLICY "Allow users to insert messages in open chats" ON public.polysuara_chat_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.polysuara_chats c WHERE c.id = chat_id AND c.status = 'OPEN' AND (c.student_id = auth.uid() OR c.exco_id = auth.uid()))
);
```

### Source: `29_keusahawanan_products_bucket.sql`
```sql
CREATE POLICY "Public boleh lihat gambar produk dan logo"
ON storage.objects FOR SELECT
USING (bucket_id = 'keusahawanan-products');
```

### Source: `29_keusahawanan_products_bucket.sql`
```sql
CREATE POLICY "Authenticated users boleh muat naik gambar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'keusahawanan-products');
```

### Source: `29_keusahawanan_products_bucket.sql`
```sql
CREATE POLICY "Authenticated users boleh kemaskini gambar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'keusahawanan-products');
```

### Source: `29_keusahawanan_products_bucket.sql`
```sql
CREATE POLICY "Authenticated users boleh padam gambar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'keusahawanan-products');
```

### Source: `30_business_shifts_system.sql`
```sql
ALTER TABLE keusahawanan_businesses 
  ADD COLUMN IF NOT EXISTS is_shift_enabled BOOLEAN DEFAULT false;

DROP TABLE IF EXISTS gerai_shift_swaps CASCADE;
DROP TABLE IF EXISTS gerai_shifts CASCADE;
DROP TABLE IF EXISTS gerai_sessions CASCADE;

CREATE TABLE business_shifts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id  uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  shift_date   date NOT NULL,
  shift_hour   int  NOT NULL CHECK (shift_hour BETWEEN 8 AND 16),
  assigned_to  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES profiles(id),
  notes        text,
  status       text DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','PRESENT','ABSENT','SWAPPED')),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(business_id, shift_date, shift_hour)
);

CREATE TABLE business_shift_swaps (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  shift_id      uuid REFERENCES business_shifts(id) ON DELETE CASCADE,
  requested_by  uuid REFERENCES profiles(id),
  swap_with     uuid REFERENCES profiles(id),
  reason        text NOT NULL,
  status        text DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  responded_by  uuid REFERENCES profiles(id),
  responded_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE business_sessions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     uuid REFERENCES keusahawanan_businesses(id) ON DELETE CASCADE,
  session_date    date NOT NULL,
  opened_by       uuid REFERENCES profiles(id),
  closed_by       uuid REFERENCES profiles(id),
  opening_cash    numeric(10,2) NOT NULL DEFAULT 0,
  closing_cash    numeric(10,2),
  total_sales     numeric(10,2),
  total_expenses  numeric(10,2) DEFAULT 0,
  net_profit      numeric(10,2) GENERATED ALWAYS AS (
                    closing_cash - opening_cash - total_expenses
                  ) STORED,
  opening_time    timestamptz,
  closing_time    timestamptz,
  opening_notes   text,
  closing_notes   text,
  status          text DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(business_id, session_date)
);

CREATE OR REPLACE FUNCTION has_business_shift_access(b_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_business_memberships
    WHERE business_id = b_id 
      AND user_id = auth.uid()
      AND status = 'ACTIVE'
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'ADMIN')
  )
$$;

ALTER TABLE business_shifts ENABLE ROW LEVEL SECURITY;
```

### Source: `30_business_shifts_system.sql`
```sql
ALTER TABLE business_shift_swaps ENABLE ROW LEVEL SECURITY;
```

### Source: `30_business_shifts_system.sql`
```sql
ALTER TABLE business_sessions ENABLE ROW LEVEL SECURITY;
```

### Source: `30_business_shifts_system.sql`
```sql
CREATE POLICY "business_shifts_access" ON business_shifts FOR ALL USING (has_business_shift_access(business_id));
```

### Source: `30_business_shifts_system.sql`
```sql
CREATE POLICY "business_shift_swaps_access" ON business_shift_swaps FOR ALL USING (has_business_shift_access(business_id));
```

### Source: `30_business_shifts_system.sql`
```sql
CREATE POLICY "business_sessions_access" ON business_sessions FOR ALL USING (has_business_shift_access(business_id));
```

### Source: `30_polysuara_downvote.sql`
```sql
DROP POLICY IF EXISTS "polysuara_confessions_select" ON public.polysuara_confessions;
```

### Source: `30_polysuara_downvote.sql`
```sql
ALTER TABLE public.polysuara_confessions
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_hidden_by_community BOOLEAN DEFAULT false;

-- 2. Create the downvotes tracking table
CREATE TABLE IF NOT EXISTS public.polysuara_downvotes (
    confession_id UUID NOT NULL REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (confession_id, user_id)
);

-- Index for querying user's downvotes (per §15.4: every FK needs an index)
CREATE INDEX IF NOT EXISTS idx_polysuara_downvotes_user ON public.polysuara_downvotes(user_id);
CREATE INDEX IF NOT EXISTS idx_polysuara_downvotes_confession ON public.polysuara_downvotes(confession_id);

-- 3. RLS for Downvotes table (per §15.1: use (SELECT auth.uid()))
ALTER TABLE public.polysuara_downvotes ENABLE ROW LEVEL SECURITY;
```

### Source: `30_polysuara_downvote.sql`
```sql
CREATE POLICY "polysuara_downvotes_select" ON public.polysuara_downvotes FOR SELECT
  USING (true);
```

### Source: `30_polysuara_downvote.sql`
```sql
CREATE POLICY "polysuara_downvotes_insert" ON public.polysuara_downvotes FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

### Source: `30_polysuara_downvote.sql`
```sql
CREATE POLICY "polysuara_downvotes_delete" ON public.polysuara_downvotes FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
    OR is_jpp_admin((SELECT auth.uid()))
  );
```

### Source: `30_polysuara_downvote.sql`
```sql
CREATE POLICY "polysuara_confessions_select" ON public.polysuara_confessions FOR SELECT
  USING (
    (is_approved = true AND is_hidden_by_community = false)
    OR is_jpp_admin((SELECT auth.uid()))
  );
```

### Source: `32_create_polyrent_bucket.sql`
```sql
CREATE POLICY "Public Access Polyrent"
ON storage.objects FOR SELECT
USING ( bucket_id = 'polyrent' );
```

### Source: `32_create_polyrent_bucket.sql`
```sql
CREATE POLICY "Authenticated users can upload to polyrent"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'polyrent' );
```

### Source: `32_create_polyrent_bucket.sql`
```sql
CREATE POLICY "Users can update their own polyrent images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'polyrent' AND auth.uid() = owner );
```

### Source: `32_create_polyrent_bucket.sql`
```sql
CREATE POLICY "Users can delete their own polyrent images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'polyrent' AND auth.uid() = owner );
```

### Source: `32_system_announcements.sql`
```sql
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
```

### Source: `32_system_announcements.sql`
```sql
CREATE POLICY "Active system_announcements are viewable by everyone."
    ON public.system_announcements FOR SELECT
    USING (is_active = true);
```

### Source: `32_system_announcements.sql`
```sql
CREATE POLICY "JPP and Super Admin can view all system announcements."
    ON public.system_announcements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );
```

### Source: `32_system_announcements.sql`
```sql
CREATE POLICY "JPP and Super Admin can manage system announcements"
    ON public.system_announcements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );
```

### Source: `32_system_announcements.sql`
```sql
ALTER TABLE public.user_announcement_responses ENABLE ROW LEVEL SECURITY;
```

### Source: `32_system_announcements.sql`
```sql
CREATE POLICY "Users can view own announcement responses"
    ON public.user_announcement_responses FOR SELECT
    USING (auth.uid() = user_id);
```

### Source: `32_system_announcements.sql`
```sql
CREATE POLICY "Users can insert own announcement responses"
    ON public.user_announcement_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

### Source: `32_system_announcements.sql`
```sql
CREATE POLICY "JPP and Super Admin can view all announcement responses"
    ON public.user_announcement_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );
```

### Source: `33_announcement_poster.sql`
```sql
CREATE POLICY "Public can view announcement images"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcements');
```

### Source: `33_announcement_poster.sql`
```sql
CREATE POLICY "JPP can insert announcement images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);
```

### Source: `33_announcement_poster.sql`
```sql
CREATE POLICY "JPP can update announcement images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);
```

### Source: `33_announcement_poster.sql`
```sql
CREATE POLICY "JPP can delete announcement images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);
```

### Source: `36_supsas_schema.sql`
```sql
ALTER TABLE supsas_editions    ENABLE ROW LEVEL SECURITY;
```

### Source: `36_supsas_schema.sql`
```sql
ALTER TABLE supsas_kontingen   ENABLE ROW LEVEL SECURITY;
```

### Source: `36_supsas_schema.sql`
```sql
ALTER TABLE supsas_sports      ENABLE ROW LEVEL SECURITY;
```

### Source: `36_supsas_schema.sql`
```sql
ALTER TABLE supsas_participants ENABLE ROW LEVEL SECURITY;
```

### Source: `36_supsas_schema.sql`
```sql
ALTER TABLE supsas_fixtures    ENABLE ROW LEVEL SECURITY;
```

### Source: `36_supsas_schema.sql`
```sql
ALTER TABLE supsas_results     ENABLE ROW LEVEL SECURITY;
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_editions_public_read"  ON supsas_editions FOR SELECT USING (TRUE);
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_editions_admin_write"  ON supsas_editions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP'));
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_kontingen_public_read" ON supsas_kontingen FOR SELECT USING (TRUE);
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_kontingen_admin_write" ON supsas_kontingen FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN_JPP'));
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_kontingen_leader_update" ON supsas_kontingen FOR UPDATE
  USING (leader_id = auth.uid())
  WITH CHECK (leader_id = auth.uid());
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_sports_public_read"  ON supsas_sports FOR SELECT USING (TRUE);
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_sports_jpp_write"    ON supsas_sports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_participants_public_read" ON supsas_participants FOR SELECT USING (TRUE);
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_participants_leader_write" ON supsas_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = auth.uid()));
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_participants_admin_write" ON supsas_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_fixtures_public_read" ON supsas_fixtures FOR SELECT USING (TRUE);
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_fixtures_jpp_write"   ON supsas_fixtures FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_results_public_read" ON supsas_results FOR SELECT USING (TRUE);
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_results_jpp_write"   ON supsas_results FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_assets_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'supsas-assets');
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_assets_admin_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'supsas-assets' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ));
```

### Source: `36_supsas_schema.sql`
```sql
CREATE POLICY "supsas_assets_admin_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'supsas-assets' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ));
```

### Source: `38_karnival_v2.sql`
```sql
ALTER TABLE karnival_editions ENABLE ROW LEVEL SECURITY;
```

### Source: `38_karnival_v2.sql`
```sql
CREATE POLICY "karnival_editions_read_all" ON karnival_editions FOR SELECT USING (true);
```

### Source: `38_karnival_v2.sql`
```sql
CREATE POLICY "karnival_editions_write_kpp" ON karnival_editions FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

### Source: `38_karnival_v2.sql`
```sql
ALTER TABLE karnival_categories ENABLE ROW LEVEL SECURITY;
```

### Source: `38_karnival_v2.sql`
```sql
CREATE POLICY "karnival_categories_read_all" ON karnival_categories FOR SELECT USING (true);
```

### Source: `38_karnival_v2.sql`
```sql
CREATE POLICY "karnival_categories_write_kpp" ON karnival_categories FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

### Source: `38_karnival_v2.sql`
```sql
ALTER TABLE karnival_booths ENABLE ROW LEVEL SECURITY;
```

### Source: `38_karnival_v2.sql`
```sql
CREATE POLICY "karnival_booths_read_all" ON karnival_booths FOR SELECT USING (true);
```

### Source: `38_karnival_v2.sql`
```sql
CREATE POLICY "karnival_booths_write_kpp" ON karnival_booths FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

### Source: `38_karnival_v2.sql`
```sql
ALTER TABLE karnival_votes_v2 REPLICA IDENTITY FULL;
ALTER TABLE karnival_votes_v2 ENABLE ROW LEVEL SECURITY;
```

### Source: `38_karnival_v2.sql`
```sql
CREATE POLICY "karnival_votes_v2_read_all" ON karnival_votes_v2 FOR SELECT USING (true);
```

### Source: `38_karnival_v2.sql`
```sql
CREATE POLICY "karnival_votes_v2_insert_self" ON karnival_votes_v2 FOR INSERT
  WITH CHECK (auth.uid() = voter_id AND EXISTS (SELECT 1 FROM karnival_editions WHERE id = edition_id AND voting_enabled = true));
```

### Source: `38_karnival_v2.sql`
```sql
CREATE POLICY "karnival_votes_v2_delete_own" ON karnival_votes_v2 FOR DELETE USING (auth.uid() = voter_id);
```

### Source: `38_karnival_v2.sql`
```sql
CREATE POLICY "karnival_votes_v2_admin_all" ON karnival_votes_v2 FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

### Source: `38_karnival_v2.sql`
```sql
CREATE POLICY "karnival_booths_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'karnival-booths');
```

### Source: `38_karnival_v2.sql`
```sql
CREATE POLICY "karnival_booths_kpp_upload"  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'karnival-booths' AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

### Source: `38_karnival_v2.sql`
```sql
CREATE POLICY "karnival_booths_kpp_delete"  ON storage.objects FOR DELETE
  USING (bucket_id = 'karnival-booths' AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

### Source: `40_program_attendance_system.sql`
```sql
ALTER TABLE programs
      ADD COLUMN qr_token         UUID DEFAULT gen_random_uuid(),
      ADD COLUMN qr_enabled       BOOLEAN DEFAULT false,
      ADD COLUMN qr_open_at       TIMESTAMPTZ,
      ADD COLUMN qr_close_at      TIMESTAMPTZ,
      ADD COLUMN pre_reg_enabled  BOOLEAN DEFAULT false,
      ADD COLUMN merit_kelab      INT DEFAULT 0,
      ADD COLUMN merit_eakademik  INT DEFAULT 0;

    -- Pastikan token unik
    ALTER TABLE programs ADD CONSTRAINT programs_qr_token_unique UNIQUE (qr_token);

    RAISE NOTICE 'Kolum QR & Merit ditambah ke jadual programs.';
  ELSE
    RAISE NOTICE 'Kolum QR sudah ada dalam programs, skip.';
  END IF;
END $$;

-- ─── BAHAGIAN 2: Kolum QR & Merit untuk club_activities (Aktiviti Kelab) ─────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='club_activities' AND column_name='qr_token') THEN
    ALTER TABLE club_activities
      ADD COLUMN qr_token         UUID DEFAULT gen_random_uuid(),
      ADD COLUMN qr_enabled       BOOLEAN DEFAULT false,
      ADD COLUMN qr_open_at       TIMESTAMPTZ,
      ADD COLUMN qr_close_at      TIMESTAMPTZ,
      ADD COLUMN pre_reg_enabled  BOOLEAN DEFAULT false,
      ADD COLUMN merit_kelab      INT DEFAULT 0;
    -- Nota: club_activities TIDAK ada merit_eakademik
    -- Merit Rasmi untuk aktiviti kelab melalui merit_program_applications

    ALTER TABLE club_activities ADD CONSTRAINT club_activities_qr_token_unique UNIQUE (qr_token);

    RAISE NOTICE 'Kolum QR & Merit ditambah ke jadual club_activities.';
  ELSE
    RAISE NOTICE 'Kolum QR sudah ada dalam club_activities, skip.';
  END IF;
END $$;

-- ─── BAHAGIAN 3: Jadual program_attendees ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS program_attendees (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id       UUID        NOT NULL,
  program_type     TEXT        NOT NULL CHECK (program_type IN ('takwim', 'aktiviti')),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status           TEXT        NOT NULL DEFAULT 'pre_registered'
                               CHECK (status IN ('pre_registered','attended','absent','walk_in')),
  registered_at    TIMESTAMPTZ DEFAULT NOW(),
  checked_in_at    TIMESTAMPTZ,
  check_in_method  TEXT        CHECK (check_in_method IN ('qr','manual')),
  merit_kelab_credited  BOOLEAN DEFAULT false,
  merit_rasmi_credited  BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW(),

  -- Cegah scan berganda: 1 user hanya boleh hadir 1 kali per program
  CONSTRAINT unique_program_attendee UNIQUE (program_id, program_type, user_id)
);

-- Indexes untuk prestasi query
CREATE INDEX IF NOT EXISTS idx_pa_program      ON program_attendees(program_id, program_type);
CREATE INDEX IF NOT EXISTS idx_pa_user         ON program_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_pa_status       ON program_attendees(status);
CREATE INDEX IF NOT EXISTS idx_pa_checked_in   ON program_attendees(checked_in_at) WHERE checked_in_at IS NOT NULL;

-- ─── BAHAGIAN 4: RLS untuk program_attendees ─────────────────────────────────

ALTER TABLE program_attendees ENABLE ROW LEVEL SECURITY;
```

### Source: `40_program_attendance_system.sql`
```sql
CREATE POLICY "Read all attendees" ON program_attendees
      FOR SELECT USING ((select auth.uid()) IS NOT NULL);
```

### Source: `40_program_attendance_system.sql`
```sql
CREATE POLICY "Self register attendee" ON program_attendees
      FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
```

### Source: `40_program_attendance_system.sql`
```sql
CREATE POLICY "Manager update attendees" ON program_attendees
      FOR UPDATE USING (
        (select auth.uid()) IN (
          SELECT id FROM profiles
          WHERE role IN ('CLUB_PRESIDENT','CLUB_MT','SUPER_ADMIN_JPP','JPP')
        )
      );
```

### Source: `40_program_attendance_system.sql`
```sql
ALTER TABLE merit_program_applications ENABLE ROW LEVEL SECURITY;
```

### Source: `40_program_attendance_system.sql`
```sql
ALTER TABLE merit_review_log ENABLE ROW LEVEL SECURITY;
```

### Source: `40_program_attendance_system.sql`
```sql
CREATE POLICY "Read merit applications" ON merit_program_applications
      FOR SELECT USING ((select auth.uid()) IS NOT NULL);
```

### Source: `40_program_attendance_system.sql`
```sql
CREATE POLICY "Club leaders apply merit" ON merit_program_applications
      FOR INSERT WITH CHECK (
        (select auth.uid()) IN (
          SELECT id FROM profiles
          WHERE role IN ('CLUB_PRESIDENT','CLUB_MT','SUPER_ADMIN_JPP','JPP')
        )
      );
```

### Source: `40_program_attendance_system.sql`
```sql
CREATE POLICY "JPP update merit applications" ON merit_program_applications
      FOR UPDATE USING (
        (select auth.uid()) IN (
          SELECT id FROM profiles WHERE role IN ('JPP','SUPER_ADMIN_JPP')
        )
      );
```

### Source: `40_program_attendance_system.sql`
```sql
CREATE POLICY "Read review log" ON merit_review_log
      FOR SELECT USING ((select auth.uid()) IS NOT NULL);
```

### Source: `40_program_attendance_system.sql`
```sql
CREATE POLICY "JPP insert review log" ON merit_review_log
      FOR INSERT WITH CHECK (
        (select auth.uid()) IN (
          SELECT id FROM profiles WHERE role IN ('JPP','SUPER_ADMIN_JPP')
        )
      );
```

### Source: `44_polymart_shopping_cart.sql`
```sql
ALTER TABLE public.polymart_cart_items ENABLE ROW LEVEL SECURITY;
```

### Source: `44_polymart_shopping_cart.sql`
```sql
CREATE POLICY "Users can manage their own cart items" ON public.polymart_cart_items
    FOR ALL
    USING (buyer_id = (SELECT auth.uid()))
    WITH CHECK (buyer_id = (SELECT auth.uid()));
```

### Source: `45_takwim_pusat.sql`
```sql
ALTER TABLE takwim_pusat ENABLE ROW LEVEL SECURITY;
```

### Source: `45_takwim_pusat.sql`
```sql
CREATE POLICY "takwim_pusat_select" ON takwim_pusat
  FOR SELECT TO authenticated USING (true);
```

### Source: `45_takwim_pusat.sql`
```sql
CREATE POLICY "takwim_pusat_insert" ON takwim_pusat
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
```

### Source: `45_takwim_pusat.sql`
```sql
CREATE POLICY "takwim_pusat_update" ON takwim_pusat
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);
```

### Source: `45_takwim_pusat.sql`
```sql
CREATE POLICY "takwim_pusat_delete" ON takwim_pusat
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "karnival_editions_write_kpp" ON karnival_editions;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "karnival_categories_write_kpp" ON karnival_categories;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "karnival_booths_write_kpp" ON karnival_booths;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "karnival_votes_v2_insert_self" ON karnival_votes_v2;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "karnival_votes_v2_delete_own" ON karnival_votes_v2;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "karnival_votes_v2_admin_all" ON karnival_votes_v2;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "karnival_booths_kpp_upload"  ON storage.objects;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "karnival_booths_kpp_delete"  ON storage.objects;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "supsas_editions_admin_write"  ON supsas_editions;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "supsas_kontingen_admin_write" ON supsas_kontingen;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "supsas_kontingen_leader_update" ON supsas_kontingen;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "supsas_sports_jpp_write"    ON supsas_sports;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "supsas_participants_leader_write" ON supsas_participants;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "supsas_participants_admin_write" ON supsas_participants;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "supsas_fixtures_jpp_write"   ON supsas_fixtures;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "supsas_results_jpp_write"   ON supsas_results;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "supsas_assets_admin_upload" ON storage.objects;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "supsas_assets_admin_delete" ON storage.objects;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "JPP and Super Admin can view all system announcements." ON public.system_announcements;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "JPP and Super Admin can manage system announcements" ON public.system_announcements;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "Users can view own announcement responses" ON public.user_announcement_responses;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "Users can insert own announcement responses" ON public.user_announcement_responses;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "JPP and Super Admin can view all announcement responses" ON public.user_announcement_responses;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "JPP can insert announcement images" ON storage.objects;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "JPP can update announcement images" ON storage.objects;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
DROP POLICY IF EXISTS "JPP can delete announcement images" ON storage.objects;
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "karnival_editions_write_kpp" ON karnival_editions FOR ALL
  USING ((select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "karnival_categories_write_kpp" ON karnival_categories FOR ALL
  USING ((select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "karnival_booths_write_kpp" ON karnival_booths FOR ALL
  USING ((select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "karnival_votes_v2_insert_self" ON karnival_votes_v2 FOR INSERT
  WITH CHECK ((select auth.uid()) = voter_id AND EXISTS (SELECT 1 FROM karnival_editions WHERE id = edition_id AND voting_enabled = true));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "karnival_votes_v2_delete_own" ON karnival_votes_v2 FOR DELETE USING ((select auth.uid()) = voter_id);
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "karnival_votes_v2_admin_all" ON karnival_votes_v2 FOR ALL
  USING ((select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "karnival_booths_kpp_upload"  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'karnival-booths' AND (select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "karnival_booths_kpp_delete"  ON storage.objects FOR DELETE
  USING (bucket_id = 'karnival-booths' AND (select auth.uid()) IN (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN_JPP' OR (role = 'JPP' AND jpp_unit = 'KPP')));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "supsas_editions_admin_write"  ON supsas_editions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP'));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "supsas_kontingen_admin_write" ON supsas_kontingen FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN_JPP'));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "supsas_kontingen_leader_update" ON supsas_kontingen FOR UPDATE
  USING (leader_id = (select auth.uid()))
  WITH CHECK (leader_id = (select auth.uid()));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "supsas_sports_jpp_write"    ON supsas_sports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "supsas_participants_leader_write" ON supsas_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM supsas_kontingen WHERE id = kontingen_id AND leader_id = (select auth.uid())));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "supsas_participants_admin_write" ON supsas_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "supsas_fixtures_jpp_write"   ON supsas_fixtures FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "supsas_results_jpp_write"   ON supsas_results FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP','JPP')));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "supsas_assets_admin_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'supsas-assets' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "supsas_assets_admin_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'supsas-assets' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('SUPER_ADMIN_JPP', 'JPP')
  ));
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "JPP and Super Admin can view all system announcements."
    ON public.system_announcements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "JPP and Super Admin can manage system announcements"
    ON public.system_announcements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "Users can view own announcement responses"
    ON public.user_announcement_responses FOR SELECT
    USING ((select auth.uid()) = user_id);
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "Users can insert own announcement responses"
    ON public.user_announcement_responses FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "JPP and Super Admin can view all announcement responses"
    ON public.user_announcement_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role IN ('SUPER_ADMIN_JPP', 'JPP')
        )
    );
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "JPP can insert announcement images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = (select auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "JPP can update announcement images" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = (select auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);
```

### Source: `47_optimize_new_modules_rls.sql`
```sql
CREATE POLICY "JPP can delete announcement images" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'announcements'
  AND (
    (SELECT role FROM public.profiles WHERE id = (select auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')
  )
);
```

### Source: `48_polyrider_schema.sql`
```sql
ALTER TABLE public.polyrider_profiles ENABLE ROW LEVEL SECURITY;
```

### Source: `48_polyrider_schema.sql`
```sql
ALTER TABLE public.polyrider_zones ENABLE ROW LEVEL SECURITY;
```

### Source: `48_polyrider_schema.sql`
```sql
ALTER TABLE public.polyrider_jobs ENABLE ROW LEVEL SECURITY;
```

### Source: `48_polyrider_schema.sql`
```sql
ALTER TABLE public.polyrider_chats ENABLE ROW LEVEL SECURITY;
```

### Source: `48_polyrider_schema.sql`
```sql
ALTER TABLE public.polyrider_sos_logs ENABLE ROW LEVEL SECURITY;
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE POLICY "Public can view active riders" ON public.polyrider_profiles
    FOR SELECT USING (is_active = true);
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE POLICY "Riders can manage own profile" ON public.polyrider_profiles
    FOR ALL USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE POLICY "Admin can manage all rider profiles" ON public.polyrider_profiles
    FOR ALL USING (public.is_klk_or_admin((SELECT auth.uid())));
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE POLICY "Anyone can read zones" ON public.polyrider_zones
    FOR SELECT USING (true);
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE POLICY "Admin can manage zones" ON public.polyrider_zones
    FOR ALL USING (public.is_klk_or_admin((SELECT auth.uid())));
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE POLICY "Students can manage own jobs" ON public.polyrider_jobs
    FOR ALL USING (student_id = (SELECT auth.uid())) WITH CHECK (student_id = (SELECT auth.uid()));
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE POLICY "Riders can view pending and own jobs" ON public.polyrider_jobs
    FOR SELECT USING (
        status = 'PENDING' OR rider_id = (SELECT auth.uid())
    );
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE POLICY "Riders can update own assigned jobs" ON public.polyrider_jobs
    FOR UPDATE USING (
        status = 'PENDING' OR rider_id = (SELECT auth.uid())
    );
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE POLICY "Admin can view all jobs" ON public.polyrider_jobs
    FOR SELECT USING (public.is_klk_or_admin((SELECT auth.uid())));
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE POLICY "Involved users can manage chats" ON public.polyrider_chats
    FOR ALL USING (
        sender_id = (SELECT auth.uid()) OR
        job_id IN (
            SELECT id FROM public.polyrider_jobs WHERE student_id = (SELECT auth.uid()) OR rider_id = (SELECT auth.uid())
        )
    ) WITH CHECK (
        sender_id = (SELECT auth.uid())
    );
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE POLICY "Users can create SOS logs" ON public.polyrider_sos_logs
    FOR INSERT WITH CHECK (triggered_by = (SELECT auth.uid()));
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE POLICY "Users can view own SOS logs" ON public.polyrider_sos_logs
    FOR SELECT USING (triggered_by = (SELECT auth.uid()));
```

### Source: `48_polyrider_schema.sql`
```sql
CREATE POLICY "Admin can manage all SOS logs" ON public.polyrider_sos_logs
    FOR ALL USING (public.is_klk_or_admin((SELECT auth.uid())));
```

### Source: `49_polyrider_bids.sql`
```sql
ALTER TABLE public.polyrider_bids ENABLE ROW LEVEL SECURITY;
```

### Source: `49_polyrider_bids.sql`
```sql
CREATE POLICY "Public can view bids" 
    ON public.polyrider_bids FOR SELECT 
    USING (true);
```

### Source: `49_polyrider_bids.sql`
```sql
CREATE POLICY "Riders can insert bids" 
    ON public.polyrider_bids FOR INSERT 
    WITH CHECK (rider_id = auth.uid());
```

### Source: `49_polyrider_bids.sql`
```sql
CREATE POLICY "Admin can manage all bids"
    ON public.polyrider_bids FOR ALL
    USING (public.is_klk_or_admin(auth.uid()));
```

### Source: `49_polyrider_bids.sql`
```sql
CREATE POLICY "Students can update bids for their jobs"
    ON public.polyrider_bids FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.polyrider_jobs
            WHERE polyrider_jobs.id = polyrider_bids.job_id
            AND polyrider_jobs.student_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.polyrider_jobs
            WHERE polyrider_jobs.id = polyrider_bids.job_id
            AND polyrider_jobs.student_id = auth.uid()
        )
    );
```

### Source: `51_polyrider_cancel_sos_appeals.sql`
```sql
ALTER TABLE public.polyrider_jobs ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.polyrider_jobs ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- 2. Alter polyrider_sos_logs to add false alarm investigation fields
ALTER TABLE public.polyrider_sos_logs ADD COLUMN IF NOT EXISTS false_alarm BOOLEAN DEFAULT false;
ALTER TABLE public.polyrider_sos_logs ADD COLUMN IF NOT EXISTS false_alarm_notes TEXT;

-- 3. Alter profiles to track penalty state (this applies to both students and riders)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS polyrider_penalty_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS polyrider_suspended_until TIMESTAMP WITH TIME ZONE;

-- 4. Create polyrider_appeals table
CREATE TABLE IF NOT EXISTS public.polyrider_appeals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for polyrider_appeals
ALTER TABLE public.polyrider_appeals ENABLE ROW LEVEL SECURITY;
```

### Source: `51_polyrider_cancel_sos_appeals.sql`
```sql
CREATE POLICY "Users can view own appeals" ON public.polyrider_appeals
    FOR SELECT USING (user_id = (SELECT auth.uid()));
```

### Source: `51_polyrider_cancel_sos_appeals.sql`
```sql
CREATE POLICY "Users can create appeals" ON public.polyrider_appeals
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
```

### Source: `51_polyrider_cancel_sos_appeals.sql`
```sql
CREATE POLICY "Admins can view appeals" ON public.polyrider_appeals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = (SELECT auth.uid()) 
            AND (p.role IN ('SUPER_ADMIN_JPP', 'MT_OVERSEES', 'STAFF') OR (p.role = 'JPP' AND p.jpp_unit IN ('KLS', 'KEBAJIKAN')))
        )
    );
```

### Source: `51_polyrider_cancel_sos_appeals.sql`
```sql
CREATE POLICY "Admins can manage appeals" ON public.polyrider_appeals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = (SELECT auth.uid()) 
            AND (p.role IN ('SUPER_ADMIN_JPP', 'MT_OVERSEES', 'STAFF') OR (p.role = 'JPP' AND p.jpp_unit = 'KLS'))
        )
    );
```

### Source: `52_polymart_online_payment.sql`
```sql
CREATE POLICY "polymart_receipts_insert_authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'polymart-receipts');
```

### Source: `52_polymart_online_payment.sql`
```sql
CREATE POLICY "polymart_receipts_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'polymart-receipts');
```

### Source: `52_polyrider_infrastructure_audit_fixes.sql`
```sql
DROP POLICY IF EXISTS "Riders can insert bids" ON polyrider_bids;
```

### Source: `52_polyrider_infrastructure_audit_fixes.sql`
```sql
DROP POLICY IF EXISTS "Admin can manage all bids" ON polyrider_bids;
```

### Source: `52_polyrider_infrastructure_audit_fixes.sql`
```sql
DROP POLICY IF EXISTS "Students can update bids for their jobs" ON polyrider_bids;
```

### Source: `52_polyrider_infrastructure_audit_fixes.sql`
```sql
DROP POLICY IF EXISTS "presets_read" ON polyrider_location_presets;
```

### Source: `52_polyrider_infrastructure_audit_fixes.sql`
```sql
DROP POLICY IF EXISTS "presets_admin_delete" ON polyrider_location_presets;
```

### Source: `52_polyrider_infrastructure_audit_fixes.sql`
```sql
DROP POLICY IF EXISTS "presets_admin_insert" ON polyrider_location_presets;
```

### Source: `52_polyrider_infrastructure_audit_fixes.sql`
```sql
DROP POLICY IF EXISTS "presets_admin_update" ON polyrider_location_presets;
```

### Source: `52_polyrider_infrastructure_audit_fixes.sql`
```sql
CREATE POLICY "Riders can insert bids" ON polyrider_bids
  FOR INSERT WITH CHECK (rider_id = (SELECT auth.uid()));
```

### Source: `52_polyrider_infrastructure_audit_fixes.sql`
```sql
CREATE POLICY "Admin can manage all bids" ON polyrider_bids
  FOR ALL USING (is_klk_or_admin((SELECT auth.uid())));
```

### Source: `52_polyrider_infrastructure_audit_fixes.sql`
```sql
CREATE POLICY "Students can update bids for their jobs" ON polyrider_bids
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM polyrider_jobs
    WHERE polyrider_jobs.id = polyrider_bids.job_id
      AND polyrider_jobs.student_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM polyrider_jobs
    WHERE polyrider_jobs.id = polyrider_bids.job_id
      AND polyrider_jobs.student_id = (SELECT auth.uid())
  ));
```

### Source: `54_polyrider_saved_locations.sql`
```sql
ALTER TABLE public.polyrider_saved_locations ENABLE ROW LEVEL SECURITY;
```

### Source: `54_polyrider_saved_locations.sql`
```sql
CREATE POLICY "saved_locations_owner_crud" ON public.polyrider_saved_locations
  FOR ALL
  USING  (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

### Source: `54_polytask_disputes_and_rating.sql`
```sql
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.polytask_reviews;
```

### Source: `54_polytask_disputes_and_rating.sql`
```sql
DROP POLICY IF EXISTS "Users can insert reviews" ON public.polytask_reviews;
```

### Source: `54_polytask_disputes_and_rating.sql`
```sql
ALTER TABLE public.polytask_disputes ENABLE ROW LEVEL SECURITY;
```

### Source: `54_polytask_disputes_and_rating.sql`
```sql
CREATE POLICY "Users can view their own disputes"
    ON public.polytask_disputes FOR SELECT
    USING (auth.uid() = reporter_id);
```

### Source: `54_polytask_disputes_and_rating.sql`
```sql
CREATE POLICY "JPP admins can view all disputes"
    ON public.polytask_disputes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')
        )
    );
```

### Source: `54_polytask_disputes_and_rating.sql`
```sql
CREATE POLICY "Users can create disputes"
    ON public.polytask_disputes FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);
```

### Source: `54_polytask_disputes_and_rating.sql`
```sql
CREATE POLICY "JPP admins can update disputes"
    ON public.polytask_disputes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('JPP', 'SUPER_ADMIN_JPP')
        )
    );
```

### Source: `54_polytask_disputes_and_rating.sql`
```sql
CREATE POLICY "Anyone can view reviews"
    ON public.polytask_reviews FOR SELECT
    USING (true);
```

### Source: `54_polytask_disputes_and_rating.sql`
```sql
CREATE POLICY "Users can insert reviews"
    ON public.polytask_reviews FOR INSERT
    WITH CHECK (auth.uid() = reviewer_id);
```

### Source: `55_imaps_schema.sql`
```sql
ALTER TABLE public.imaps_buildings ENABLE ROW LEVEL SECURITY;
```

### Source: `55_imaps_schema.sql`
```sql
ALTER TABLE public.imaps_locations ENABLE ROW LEVEL SECURITY;
```

### Source: `55_imaps_schema.sql`
```sql
CREATE POLICY "Allow public read access on imaps_buildings" 
ON public.imaps_buildings FOR SELECT 
USING (true);
```

### Source: `55_imaps_schema.sql`
```sql
CREATE POLICY "Allow public read access on imaps_locations" 
ON public.imaps_locations FOR SELECT 
USING (true);
```

### Source: `55_imaps_schema.sql`
```sql
CREATE POLICY "Allow superadmin full access on imaps_buildings"
ON public.imaps_buildings FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'super_admin')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'super_admin')
);
```

### Source: `55_imaps_schema.sql`
```sql
CREATE POLICY "Allow superadmin full access on imaps_locations"
ON public.imaps_locations FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'super_admin')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'super_admin')
);
```

### Source: `57_imaps_storage_bucket.sql`
```sql
DROP POLICY IF EXISTS "Public View iMaps Assets" ON storage.objects;
```

### Source: `57_imaps_storage_bucket.sql`
```sql
DROP POLICY IF EXISTS "Auth Upload iMaps Assets" ON storage.objects;
```

### Source: `57_imaps_storage_bucket.sql`
```sql
DROP POLICY IF EXISTS "Auth Update iMaps Assets" ON storage.objects;
```

### Source: `57_imaps_storage_bucket.sql`
```sql
DROP POLICY IF EXISTS "Auth Delete iMaps Assets" ON storage.objects;
```

### Source: `57_imaps_storage_bucket.sql`
```sql
CREATE POLICY "Public View iMaps Assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'imaps_assets');
```

### Source: `57_imaps_storage_bucket.sql`
```sql
CREATE POLICY "Auth Upload iMaps Assets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'imaps_assets' AND auth.role() = 'authenticated');
```

### Source: `57_imaps_storage_bucket.sql`
```sql
CREATE POLICY "Auth Update iMaps Assets" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'imaps_assets' AND auth.role() = 'authenticated');
```

### Source: `57_imaps_storage_bucket.sql`
```sql
CREATE POLICY "Auth Delete iMaps Assets" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'imaps_assets' AND auth.role() = 'authenticated');
```

### Source: `59_imaps_rls_fix.sql`
```sql
DROP POLICY IF EXISTS "Allow superadmin full access on imaps_buildings" ON public.imaps_buildings;
```

### Source: `59_imaps_rls_fix.sql`
```sql
DROP POLICY IF EXISTS "Allow superadmin full access on imaps_locations" ON public.imaps_locations;
```

### Source: `59_imaps_rls_fix.sql`
```sql
CREATE POLICY "Allow superadmin full access on imaps_buildings"
ON public.imaps_buildings FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
);
```

### Source: `59_imaps_rls_fix.sql`
```sql
CREATE POLICY "Allow superadmin full access on imaps_locations"
ON public.imaps_locations FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('JPP', 'SUPER_ADMIN_JPP', 'ADMIN')
);
```

### Source: `63_merit_system_v2.sql`
```sql
ALTER TABLE public.merit_transactions 
ADD COLUMN IF NOT EXISTS proof_url TEXT,
ADD COLUMN IF NOT EXISTS academic_session TEXT,
ADD COLUMN IF NOT EXISTS scan_location JSONB;

-- 2. Update akademik_qr_scans
ALTER TABLE public.akademik_qr_scans 
ADD COLUMN IF NOT EXISTS scan_location JSONB,
ADD COLUMN IF NOT EXISTS verification_method TEXT;

-- 3. Update akademik_qr_tokens
ALTER TABLE public.akademik_qr_tokens 
ADD COLUMN IF NOT EXISTS location_lat NUMERIC,
ADD COLUMN IF NOT EXISTS location_lng NUMERIC,
ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS verification_pin TEXT;

-- 4. Create student_merit_cohorts
CREATE TABLE IF NOT EXISTS public.student_merit_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    cohort_id TEXT NOT NULL,
    total_merit INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.student_merit_cohorts ENABLE ROW LEVEL SECURITY;
```

### Source: `63_merit_system_v2.sql`
```sql
CREATE POLICY "Users can view own merit cohort history" 
ON public.student_merit_cohorts FOR SELECT 
USING (auth.uid() = user_id);
```

### Source: `63_merit_system_v2.sql`
```sql
CREATE POLICY "Superadmin can manage merit cohorts" 
ON public.student_merit_cohorts FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'SUPERADMIN'
  )
);
```

### Source: `63_merit_system_v2.sql`
```sql
ALTER TABLE public.demerit_appeals ENABLE ROW LEVEL SECURITY;
```

### Source: `63_merit_system_v2.sql`
```sql
CREATE POLICY "Users can view and create own appeals" 
ON public.demerit_appeals FOR SELECT 
USING (auth.uid() = user_id);
```

### Source: `63_merit_system_v2.sql`
```sql
CREATE POLICY "Users can insert own appeals" 
ON public.demerit_appeals FOR INSERT 
WITH CHECK (auth.uid() = user_id AND status = 'PENDING');
```

### Source: `63_merit_system_v2.sql`
```sql
CREATE POLICY "Admins/Exco can manage all appeals" 
ON public.demerit_appeals FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('SUPERADMIN', 'STAFF', 'YDP', 'EXCO')
  )
);
```

### Source: `66_fix_demerit_appeals_rls.sql`
```sql
DROP POLICY IF EXISTS "Admins/Exco can manage all appeals" ON public.demerit_appeals;
```

### Source: `66_fix_demerit_appeals_rls.sql`
```sql
CREATE POLICY "Admins/Exco can manage all appeals" 
ON public.demerit_appeals FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
  )
);
```

### Source: `67_fix_merit_system_audit.sql`
```sql
DROP POLICY IF EXISTS "Superadmin can manage merit cohorts" ON public.student_merit_cohorts;
```

### Source: `67_fix_merit_system_audit.sql`
```sql
DROP POLICY IF EXISTS "Users can view and create own appeals" ON public.demerit_appeals;
```

### Source: `67_fix_merit_system_audit.sql`
```sql
CREATE POLICY "Superadmin can manage merit cohorts"
ON public.student_merit_cohorts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP')
  )
);
```

### Source: `67_fix_merit_system_audit.sql`
```sql
CREATE POLICY "Users can view own appeals"
ON public.demerit_appeals FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
  )
);
```

### Source: `68_guideline_compliance_audit.sql`
```sql
DROP POLICY IF EXISTS "Admins/Exco can manage all appeals" ON public.demerit_appeals;
```

### Source: `68_guideline_compliance_audit.sql`
```sql
DROP POLICY IF EXISTS "Users can insert own appeals" ON public.demerit_appeals;
```

### Source: `68_guideline_compliance_audit.sql`
```sql
DROP POLICY IF EXISTS "Users can view own appeals" ON public.demerit_appeals;
```

### Source: `68_guideline_compliance_audit.sql`
```sql
DROP POLICY IF EXISTS "Superadmin can manage merit cohorts" ON public.student_merit_cohorts;
```

### Source: `68_guideline_compliance_audit.sql`
```sql
DROP POLICY IF EXISTS "Users can view own merit cohort history" ON public.student_merit_cohorts;
```

### Source: `68_guideline_compliance_audit.sql`
```sql
CREATE POLICY "demerit_appeals_select" ON public.demerit_appeals
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
    )
  );
```

### Source: `68_guideline_compliance_audit.sql`
```sql
CREATE POLICY "demerit_appeals_insert" ON public.demerit_appeals
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = 'PENDING'
  );
```

### Source: `68_guideline_compliance_audit.sql`
```sql
CREATE POLICY "demerit_appeals_update" ON public.demerit_appeals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP', 'ADMIN', 'JPP')
    )
  );
```

### Source: `68_guideline_compliance_audit.sql`
```sql
CREATE POLICY "demerit_appeals_delete" ON public.demerit_appeals
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP')
    )
  );
```

### Source: `68_guideline_compliance_audit.sql`
```sql
CREATE POLICY "student_merit_cohorts_select" ON public.student_merit_cohorts
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP')
    )
  );
```

### Source: `68_guideline_compliance_audit.sql`
```sql
CREATE POLICY "student_merit_cohorts_manage" ON public.student_merit_cohorts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('SUPER_ADMIN', 'SUPER_ADMIN_JPP')
    )
  );
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
DROP POLICY IF EXISTS "Public can view active ads"           ON public.polymart_ads;
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
DROP POLICY IF EXISTS "Admins can manage all ads"           ON public.polymart_ads;
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
DROP POLICY IF EXISTS "Admin read polymart_ads"             ON public.polymart_ads;
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
DROP POLICY IF EXISTS "Admin insert polymart_ads"           ON public.polymart_ads;
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
DROP POLICY IF EXISTS "Admin update polymart_ads"           ON public.polymart_ads;
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
DROP POLICY IF EXISTS "Admin delete polymart_ads"           ON public.polymart_ads;
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
DROP POLICY IF EXISTS "Authenticated can click ads"         ON public.polymart_ads;
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
DROP POLICY IF EXISTS "Admin can upload polymart ads images" ON storage.objects;
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
DROP POLICY IF EXISTS "Public can view polymart ads images" ON storage.objects;
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
DROP POLICY IF EXISTS "Admin can delete polymart ads images" ON storage.objects;
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
ALTER TABLE public.polymart_ads ENABLE ROW LEVEL SECURITY;
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
CREATE POLICY "Public can view active ads"
    ON public.polymart_ads
    FOR SELECT
    USING (status = 'ACTIVE');
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
CREATE POLICY "Admin read polymart_ads"
    ON public.polymart_ads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
CREATE POLICY "Admin insert polymart_ads"
    ON public.polymart_ads
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
CREATE POLICY "Admin update polymart_ads"
    ON public.polymart_ads
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
CREATE POLICY "Admin delete polymart_ads"
    ON public.polymart_ads
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
CREATE POLICY "Admin can upload polymart ads images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'polymart-ads'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
CREATE POLICY "Public can view polymart ads images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'polymart-ads');
```

### Source: `69_polymart_ads_schema_fix.sql`
```sql
CREATE POLICY "Admin can delete polymart ads images"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'polymart-ads'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                p.role IN ('SUPER_ADMIN', 'JPP_ADMIN')
                OR p.keusahawanan_access = TRUE
            )
        )
    );
```

### Source: `73_polytask_schema.sql`
```sql
ALTER TABLE public.polytask_jobs ENABLE ROW LEVEL SECURITY;
```

### Source: `73_polytask_schema.sql`
```sql
ALTER TABLE public.polytask_bids ENABLE ROW LEVEL SECURITY;
```

### Source: `73_polytask_schema.sql`
```sql
ALTER TABLE public.polytask_reviews ENABLE ROW LEVEL SECURITY;
```

### Source: `73_polytask_schema.sql`
```sql
CREATE POLICY "Semua pelajar boleh lihat tugasan OPEN" ON public.polytask_jobs
    FOR SELECT USING (
        status = 'OPEN' 
        OR requester_id = (SELECT auth.uid()) 
        OR assigned_tasker_id = (SELECT auth.uid())
        OR is_jpp_admin((SELECT auth.uid()))
    );
```

### Source: `73_polytask_schema.sql`
```sql
CREATE POLICY "Pelajar boleh cipta tugasan" ON public.polytask_jobs
    FOR INSERT WITH CHECK (requester_id = (SELECT auth.uid()));
```

### Source: `73_polytask_schema.sql`
```sql
CREATE POLICY "Pelajar boleh kemaskini tugasan sendiri" ON public.polytask_jobs
    FOR UPDATE USING (
        requester_id = (SELECT auth.uid()) OR is_jpp_admin((SELECT auth.uid()))
    ) WITH CHECK (
        requester_id = (SELECT auth.uid()) OR is_jpp_admin((SELECT auth.uid()))
    );
```

### Source: `73_polytask_schema.sql`
```sql
CREATE POLICY "Peminta boleh lihat bidaan untuk tugasannya" ON public.polytask_bids
    FOR SELECT USING (
        tasker_id = (SELECT auth.uid()) OR 
        job_id IN (SELECT id FROM public.polytask_jobs WHERE requester_id = (SELECT auth.uid())) OR
        is_jpp_admin((SELECT auth.uid()))
    );
```

### Source: `73_polytask_schema.sql`
```sql
CREATE POLICY "Pelajar boleh bida jika tugasan OPEN" ON public.polytask_bids
    FOR INSERT WITH CHECK (
        tasker_id = (SELECT auth.uid()) AND
        job_id IN (SELECT id FROM public.polytask_jobs WHERE status = 'OPEN')
    );
```

### Source: `73_polytask_schema.sql`
```sql
CREATE POLICY "Tasker boleh tarik balik atau kemaskini bidaan" ON public.polytask_bids
    FOR UPDATE USING (
        tasker_id = (SELECT auth.uid()) AND status = 'PENDING'
    ) WITH CHECK (
        tasker_id = (SELECT auth.uid())
    );
```

### Source: `73_polytask_schema.sql`
```sql
CREATE POLICY "Peminta boleh ACCEPT bidaan" ON public.polytask_bids
    FOR UPDATE USING (
        job_id IN (SELECT id FROM public.polytask_jobs WHERE requester_id = (SELECT auth.uid()) AND status = 'OPEN') AND status = 'PENDING'
    ) WITH CHECK (
        job_id IN (SELECT id FROM public.polytask_jobs WHERE requester_id = (SELECT auth.uid()))
    );
```

### Source: `73_polytask_schema.sql`
```sql
CREATE POLICY "Semua boleh lihat review" ON public.polytask_reviews
    FOR SELECT USING (true);
```

### Source: `73_polytask_schema.sql`
```sql
CREATE POLICY "Boleh tulis review untuk job yang siap" ON public.polytask_reviews
    FOR INSERT WITH CHECK (
        reviewer_id = (SELECT auth.uid()) AND
        job_id IN (SELECT id FROM public.polytask_jobs WHERE status = 'COMPLETED')
    );
```

### Source: `81_polytask_cancellation_rate.sql`
```sql
CREATE POLICY "Tasker boleh tarik diri dari tugasan" ON public.polytask_jobs
    FOR UPDATE USING (
        assigned_tasker_id = (SELECT auth.uid()) AND status = 'IN_PROGRESS'
    ) WITH CHECK (
        -- membenarkan tasker set assigned_tasker_id = null
        true
    );
```

### Source: `81_polytask_cancellation_rate.sql`
```sql
CREATE POLICY "Tasker boleh WITHDRAW bidaan yang sudah diterima" ON public.polytask_bids
    FOR UPDATE USING (
        tasker_id = (SELECT auth.uid()) AND status = 'ACCEPTED'
    ) WITH CHECK (
        tasker_id = (SELECT auth.uid())
    );
```

### Source: `83_polytask_proof_of_work.sql`
```sql
CREATE POLICY "Tasker boleh muat naik bukti kerja" ON public.polytask_jobs
    FOR UPDATE USING (
        assigned_tasker_id = (SELECT auth.uid()) AND status = 'IN_PROGRESS'
    ) WITH CHECK (
        assigned_tasker_id = (SELECT auth.uid())
    );
```

### Source: `83_polytask_proof_of_work.sql`
```sql
CREATE POLICY "Semua boleh lihat bukti" ON storage.objects
    FOR SELECT USING (bucket_id = 'polytask_proofs');
```

### Source: `83_polytask_proof_of_work.sql`
```sql
CREATE POLICY "Pelajar boleh upload bukti" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'polytask_proofs' AND auth.uid() IS NOT NULL);
```

### Source: `84_polysuara_schema.sql`
```sql
ALTER TABLE public.polysuara_confessions ENABLE ROW LEVEL SECURITY;
```

### Source: `84_polysuara_schema.sql`
```sql
ALTER TABLE public.polysuara_upvotes ENABLE ROW LEVEL SECURITY;
```

### Source: `84_polysuara_schema.sql`
```sql
CREATE POLICY "Pelajar boleh baca luahan" ON public.polysuara_confessions
    FOR SELECT USING (
        is_approved = true
    );
```

### Source: `84_polysuara_schema.sql`
```sql
CREATE POLICY "Pelajar boleh buat luahan" ON public.polysuara_confessions
    FOR INSERT WITH CHECK (
        (SELECT auth.uid()) = author_id
    );
```

### Source: `84_polysuara_schema.sql`
```sql
CREATE POLICY "JPP boleh urus luahan" ON public.polysuara_confessions
    FOR ALL USING (
        is_jpp_admin((SELECT auth.uid()))
    ) WITH CHECK (
        is_jpp_admin((SELECT auth.uid()))
    );
```

### Source: `84_polysuara_schema.sql`
```sql
CREATE POLICY "Boleh lihat upvote" ON public.polysuara_upvotes
    FOR SELECT USING (true);
```

### Source: `84_polysuara_schema.sql`
```sql
CREATE POLICY "Boleh upvote" ON public.polysuara_upvotes
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
```

### Source: `84_polysuara_schema.sql`
```sql
CREATE POLICY "Boleh buang upvote sendiri" ON public.polysuara_upvotes
    FOR DELETE USING ((SELECT auth.uid()) = user_id);
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
DROP POLICY IF EXISTS "Semua boleh lihat bukti" ON storage.objects;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
DROP POLICY IF EXISTS "Pelajar boleh upload bukti" ON storage.objects;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
DROP POLICY IF EXISTS "Tasker boleh muat naik bukti kerja" ON public.polytask_jobs;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
DROP POLICY IF EXISTS "Tasker boleh tarik diri dari tugasan" ON public.polytask_jobs;
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
CREATE POLICY "Semua boleh lihat bukti polytask" ON storage.objects
    FOR SELECT USING (bucket_id = 'polytask_proofs');
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
CREATE POLICY "Pelajar boleh upload bukti polytask" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'polytask_proofs' AND auth.uid() IS NOT NULL);
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
CREATE POLICY "Tasker boleh muat naik bukti kerja" ON public.polytask_jobs
    FOR UPDATE USING (
        assigned_tasker_id = (SELECT auth.uid()) AND status = 'IN_PROGRESS'
    ) WITH CHECK (
        assigned_tasker_id = (SELECT auth.uid())
    );
```

### Source: `84_polytask_v2_hotfix.sql`
```sql
CREATE POLICY "Tasker boleh tarik diri dari tugasan" ON public.polytask_jobs
    FOR UPDATE USING (
        assigned_tasker_id = (SELECT auth.uid()) AND status = 'IN_PROGRESS'
    ) WITH CHECK (
        assigned_tasker_id = (SELECT auth.uid()) OR assigned_tasker_id IS NULL
    );
```

### Source: `85_polymatch_schema.sql`
```sql
ALTER TABLE public.polymatch_listings ENABLE ROW LEVEL SECURITY;
```

### Source: `85_polymatch_schema.sql`
```sql
CREATE POLICY "Semua boleh baca iklan aktif" ON public.polymatch_listings
    FOR SELECT USING (
        status = 'OPEN' 
        OR (SELECT auth.uid()) = author_id
    );
```

### Source: `85_polymatch_schema.sql`
```sql
CREATE POLICY "Pengguna boleh cipta iklan" ON public.polymatch_listings
    FOR INSERT WITH CHECK (
        (SELECT auth.uid()) = author_id
    );
```

### Source: `85_polymatch_schema.sql`
```sql
CREATE POLICY "Pengguna boleh kemaskini iklan sendiri" ON public.polymatch_listings
    FOR UPDATE USING (
        (SELECT auth.uid()) = author_id
    ) WITH CHECK (
        (SELECT auth.uid()) = author_id
    );
```

### Source: `85_polymatch_schema.sql`
```sql
CREATE POLICY "Pengguna boleh padam iklan sendiri" ON public.polymatch_listings
    FOR DELETE USING (
        (SELECT auth.uid()) = author_id
    );
```

### Source: `85_polymatch_schema.sql`
```sql
CREATE POLICY "JPP boleh urus semua iklan" ON public.polymatch_listings
    FOR ALL USING (
        is_jpp_admin((SELECT auth.uid()))
    ) WITH CHECK (
        is_jpp_admin((SELECT auth.uid()))
    );
```

### Source: `86_polyservices_moderation.sql`
```sql
DROP POLICY IF EXISTS "Semua boleh baca iklan aktif" ON public.polymatch_listings;
```

### Source: `86_polyservices_moderation.sql`
```sql
ALTER TABLE public.polymatch_listings ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;

-- Kemaskini RLS PolyMatch supaya hanya lihat yang di-approve
DROP POLICY IF EXISTS "Semua boleh baca iklan aktif" ON public.polymatch_listings;
CREATE POLICY "Semua boleh baca iklan aktif" ON public.polymatch_listings
    FOR SELECT USING (
        status = 'OPEN' 
        AND is_approved = true
        OR (SELECT auth.uid()) = author_id
    );

-- Jadual Laporan Pengguna (Reports)
CREATE TABLE IF NOT EXISTS public.polyservices_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_id UUID NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('SUARA', 'MATCH')),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_report_per_user UNIQUE (target_id, reporter_id)
);

ALTER TABLE public.polyservices_moderation_config ENABLE ROW LEVEL SECURITY;
```

### Source: `86_polyservices_moderation.sql`
```sql
ALTER TABLE public.polyservices_reports ENABLE ROW LEVEL SECURITY;
```

### Source: `86_polyservices_moderation.sql`
```sql
CREATE POLICY "Semua boleh baca config moderasi" ON public.polyservices_moderation_config FOR SELECT USING (true);
```

### Source: `86_polyservices_moderation.sql`
```sql
CREATE POLICY "Hanya JPP boleh kemaskini config" ON public.polyservices_moderation_config FOR UPDATE USING (is_jpp_admin((SELECT auth.uid()))) WITH CHECK (is_jpp_admin((SELECT auth.uid())));
```

### Source: `86_polyservices_moderation.sql`
```sql
CREATE POLICY "Pelajar boleh buat report" ON public.polyservices_reports FOR INSERT WITH CHECK ((SELECT auth.uid()) = reporter_id);
```

### Source: `86_polyservices_moderation.sql`
```sql
CREATE POLICY "JPP boleh baca report" ON public.polyservices_reports FOR SELECT USING (is_jpp_admin((SELECT auth.uid())));
```

