# Database Tables Defined or Modified

## Table: `ALTER`
- **Migrations involved**: 33_announcement_poster.sql

### Alteration DDL
```sql
Alter Table
ALTER TABLE public.system_announcements 
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS icon_type TEXT DEFAULT 'INFO';
```

---

## Table: `akademik_folders`
- **Migrations involved**: 20260429120653_personal_folders.sql

### Alteration DDL
```sql
ALTER TABLE akademik_folders ALTER COLUMN is_public SET DEFAULT false;
```

---

## Table: `akademik_qr_scans`
- **Migrations involved**: 63_merit_system_v2.sql

### Alteration DDL
```sql
ALTER TABLE public.akademik_qr_scans 
ADD COLUMN IF NOT EXISTS scan_location JSONB,
ADD COLUMN IF NOT EXISTS verification_method TEXT;
```

---

## Table: `akademik_qr_tokens`
- **Migrations involved**: 63_merit_system_v2.sql

### Alteration DDL
```sql
ALTER TABLE public.akademik_qr_tokens 
ADD COLUMN IF NOT EXISTS location_lat NUMERIC,
ADD COLUMN IF NOT EXISTS location_lng NUMERIC,
ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS verification_pin TEXT;
```

---

## Table: `business_products`
- **Migrations involved**: 20260527162100_91_product_multi_images.sql, 20260527162200_92_flash_sale_preorder.sql, 52_polymart_online_payment.sql

### Alteration DDL
```sql
ALTER TABLE business_products 
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}'::TEXT[];
```

```sql
ALTER TABLE business_products 
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sale_start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sale_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preorder_deadline TIMESTAMPTZ;
```

```sql
ALTER TABLE public.business_products
  ADD COLUMN IF NOT EXISTS online_payment_enabled BOOLEAN DEFAULT NULL;
```

---

## Table: `business_sessions`
- **Migrations involved**: 30_business_shifts_system.sql

### Creation DDL
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

---

## Table: `business_shift_swaps`
- **Migrations involved**: 30_business_shifts_system.sql

### Creation DDL
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

---

## Table: `business_shifts`
- **Migrations involved**: 30_business_shifts_system.sql

### Creation DDL
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

---

## Table: `club_activities`
- **Migrations involved**: 26_pembubaran_kohort.sql, 40_program_attendance_system.sql, add_merit_eakademik_to_club_activities.sql

### Alteration DDL
```sql
ALTER TABLE public.club_activities ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
```

```sql
ALTER TABLE public.club_activities DROP CONSTRAINT IF EXISTS club_activities_user_id_fkey;
```

```sql
ALTER TABLE public.club_activities ALTER COLUMN user_id DROP NOT NULL;
```

```sql
ALTER TABLE public.club_activities 
  ADD CONSTRAINT club_activities_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
```

```sql
ALTER TABLE club_activities
      ADD COLUMN qr_token         UUID DEFAULT gen_random_uuid(),
      ADD COLUMN qr_enabled       BOOLEAN DEFAULT false,
      ADD COLUMN qr_open_at       TIMESTAMPTZ,
      ADD COLUMN qr_close_at      TIMESTAMPTZ,
      ADD COLUMN pre_reg_enabled  BOOLEAN DEFAULT false,
      ADD COLUMN merit_kelab      INT DEFAULT 0;
```

```sql
ALTER TABLE club_activities ADD CONSTRAINT club_activities_qr_token_unique UNIQUE (qr_token);
```

```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS merit_eakademik integer DEFAULT 0;
```

```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS merit_kelab integer DEFAULT 0;
```

```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_enabled boolean DEFAULT false;
```

```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_token text;
```

```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_open_at timestamptz;
```

```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS qr_close_at timestamptz;
```

```sql
ALTER TABLE public.club_activities 
ADD COLUMN IF NOT EXISTS pre_reg_enabled boolean DEFAULT false;
```

---

## Table: `club_reports`
- **Migrations involved**: 26_pembubaran_kohort.sql

### Alteration DDL
```sql
ALTER TABLE public.club_reports ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
```

```sql
ALTER TABLE public.club_reports DROP CONSTRAINT IF EXISTS club_reports_submitted_by_fkey;
```

```sql
ALTER TABLE public.club_reports ALTER COLUMN submitted_by DROP NOT NULL;
```

```sql
ALTER TABLE public.club_reports 
  ADD CONSTRAINT club_reports_submitted_by_fkey 
  FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
```

---

## Table: `demerit_appeals`
- **Migrations involved**: 63_merit_system_v2.sql, 65_add_appeal_proof_url.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE public.demerit_appeals
ADD COLUMN IF NOT EXISTS proof_url TEXT;
```

---

## Table: `imaps_buildings`
- **Migrations involved**: 55_imaps_schema.sql, 56_imaps_qol_update.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE public.imaps_buildings 
ADD COLUMN is_facility BOOLEAN DEFAULT false,
ADD COLUMN facility_type TEXT,
ADD COLUMN op_start TIME,
ADD COLUMN op_end TIME,
ADD COLUMN floorplan_image_url TEXT,
ADD COLUMN entrance_image_url TEXT;
```

---

## Table: `imaps_locations`
- **Migrations involved**: 55_imaps_schema.sql, 58_imaps_location_image.sql, 62_imaps_location_operating_hours.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE imaps_locations
ADD COLUMN image_url TEXT;
```

```sql
ALTER TABLE public.imaps_locations 
ADD COLUMN op_start TIME,
ADD COLUMN op_end TIME;
```

---

## Table: `karnival_booths`
- **Migrations involved**: 38_karnival_v2.sql

### Creation DDL
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

---

## Table: `karnival_categories`
- **Migrations involved**: 38_karnival_v2.sql

### Creation DDL
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

---

## Table: `karnival_editions`
- **Migrations involved**: 38_karnival_v2.sql

### Creation DDL
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

---

## Table: `karnival_votes_v2`
- **Migrations involved**: 38_karnival_v2.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE karnival_votes_v2 REPLICA IDENTITY FULL;
```

---

## Table: `keusahawanan_businesses`
- **Migrations involved**: 28_keusahawanan_module.sql, 30_business_shifts_system.sql, 52_polymart_online_payment.sql, 60_keusahawanan_registration_history.sql, 61_keusahawanan_multiple_mentors.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE keusahawanan_businesses 
  ADD COLUMN IF NOT EXISTS is_shift_enabled BOOLEAN DEFAULT false;
```

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

```sql
ALTER TABLE public.keusahawanan_businesses
ADD COLUMN IF NOT EXISTS registration_history JSONB DEFAULT '[]'::jsonb;
```

```sql
ALTER TABLE public.keusahawanan_businesses
ADD COLUMN IF NOT EXISTS mentors JSONB DEFAULT '[]'::jsonb;
```

```sql
ALTER TABLE public.keusahawanan_businesses
DROP COLUMN IF EXISTS mentor_name,
DROP COLUMN IF EXISTS mentor_department;
```

---

## Table: `keusahawanan_categories`
- **Migrations involved**: 28_keusahawanan_module.sql

### Creation DDL
```sql
CREATE TABLE IF NOT EXISTS public.keusahawanan_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

---

## Table: `merit_program_applications`
- **Migrations involved**: 40_program_attendance_system.sql, rename_akademik_to_kpp_merit_vouch.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE public.merit_program_applications 
  RENAME COLUMN akademik_reviewer_id TO kpp_reviewer_id;
```

```sql
ALTER TABLE public.merit_program_applications 
  RENAME COLUMN akademik_reviewed_at TO kpp_reviewed_at;
```

```sql
ALTER TABLE public.merit_program_applications 
  RENAME COLUMN akademik_vouch_notes TO kpp_vouch_notes;
```

---

## Table: `merit_review_log`
- **Migrations involved**: 40_program_attendance_system.sql

### Creation DDL
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

---

## Table: `merit_transactions`
- **Migrations involved**: 63_merit_system_v2.sql

### Alteration DDL
```sql
ALTER TABLE public.merit_transactions 
ADD COLUMN IF NOT EXISTS proof_url TEXT,
ADD COLUMN IF NOT EXISTS academic_session TEXT,
ADD COLUMN IF NOT EXISTS scan_location JSONB;
```

---

## Table: `polymart_ads`
- **Migrations involved**: 69_polymart_ads_schema_fix.sql

### Creation DDL
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

---

## Table: `polymart_cart_items`
- **Migrations involved**: 44_polymart_shopping_cart.sql

### Creation DDL
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

---

## Table: `polymart_conversations`
- **Migrations involved**: 20260527162300_93_polymart_chat.sql, 20260527162600_96_polymart_chat_uniqueness.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE polymart_conversations 
ADD CONSTRAINT uq_polymart_convs_buyer_vendor UNIQUE (buyer_id, vendor_business_id);
```

---

## Table: `polymart_messages`
- **Migrations involved**: 20260527162300_93_polymart_chat.sql

### Creation DDL
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

---

## Table: `polymart_orders`
- **Migrations involved**: 20260527162000_90_polymart_cancellation_flow.sql, 52_polymart_online_payment.sql

### Alteration DDL
```sql
ALTER TABLE polymart_orders 
ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);
```

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

---

## Table: `polymart_wishlist`
- **Migrations involved**: 20260527162400_94_polymart_wishlist.sql

### Creation DDL
```sql
CREATE TABLE IF NOT EXISTS polymart_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  product_id UUID NOT NULL REFERENCES business_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);
```

---

## Table: `polymatch_listings`
- **Migrations involved**: 85_polymatch_schema.sql, 86_polyservices_moderation.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE public.polymatch_listings ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
```

---

## Table: `polyrent_listings`
- **Migrations involved**: 20260518115654_polyrent_fasa1_availability.sql

### Alteration DDL
```sql
ALTER TABLE polyrent_listings
ADD COLUMN IF NOT EXISTS available_from DATE DEFAULT CURRENT_DATE;
```

---

## Table: `polyrent_location_reviews`
- **Migrations involved**: 20260518120600_polyrent_fasa2.sql

### Creation DDL
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

---

## Table: `polyrent_messages`
- **Migrations involved**: 20260518121000_polyrent_fasa3.sql

### Creation DDL
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

---

## Table: `polyrent_reports`
- **Migrations involved**: 20260518120600_polyrent_fasa2.sql

### Creation DDL
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

---

## Table: `polyrent_reverse_ads`
- **Migrations involved**: 20260518121000_polyrent_fasa3.sql

### Creation DDL
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

---

## Table: `polyrider_appeals`
- **Migrations involved**: 51_polyrider_cancel_sos_appeals.sql

### Creation DDL
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

---

## Table: `polyrider_bids`
- **Migrations involved**: 49_polyrider_bids.sql

### Creation DDL
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

---

## Table: `polyrider_chats`
- **Migrations involved**: 48_polyrider_schema.sql

### Creation DDL
```sql
CREATE TABLE IF NOT EXISTS public.polyrider_chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.polyrider_jobs(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

---

## Table: `polyrider_jobs`
- **Migrations involved**: 48_polyrider_schema.sql, 51_polymart_polyrider_integration.sql, 51_polyrider_cancel_sos_appeals.sql, 52_polyrider_job_expiry.sql, 53_polyrider_rider_location.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE public.polyrider_jobs
ADD COLUMN IF NOT EXISTS polymart_order_id UUID REFERENCES public.polymart_orders(id) ON DELETE SET NULL;
```

```sql
ALTER TABLE public.polyrider_jobs ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
```

```sql
ALTER TABLE public.polyrider_jobs ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);
```

```sql
ALTER TABLE public.polyrider_jobs
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
```

```sql
ALTER TABLE public.polyrider_jobs
  ADD COLUMN IF NOT EXISTS rider_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS rider_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS rider_location_updated_at TIMESTAMPTZ;
```

---

## Table: `polyrider_profiles`
- **Migrations involved**: 48_polyrider_schema.sql

### Creation DDL
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

---

## Table: `polyrider_saved_locations`
- **Migrations involved**: 20260525021000_fix_polyrider_profiles_ref.sql, 54_polyrider_saved_locations.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE polyrider_saved_locations DISABLE TRIGGER trg_saved_locations_limit;
```

```sql
ALTER TABLE polyrider_saved_locations ENABLE TRIGGER trg_saved_locations_limit;
```

---

## Table: `polyrider_sos_logs`
- **Migrations involved**: 48_polyrider_schema.sql, 51_polyrider_cancel_sos_appeals.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE public.polyrider_sos_logs ADD COLUMN IF NOT EXISTS false_alarm BOOLEAN DEFAULT false;
```

```sql
ALTER TABLE public.polyrider_sos_logs ADD COLUMN IF NOT EXISTS false_alarm_notes TEXT;
```

---

## Table: `polyrider_zones`
- **Migrations involved**: 48_polyrider_schema.sql

### Creation DDL
```sql
CREATE TABLE IF NOT EXISTS public.polyrider_zones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pickup_name TEXT NOT NULL,
    dropoff_name TEXT NOT NULL,
    base_fare NUMERIC(10,2) NOT NULL DEFAULT 1.50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

---

## Table: `polyservices_moderation_config`
- **Migrations involved**: 86_polyservices_moderation.sql

### Creation DDL
```sql
CREATE TABLE IF NOT EXISTS public.polyservices_moderation_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    report_threshold INTEGER DEFAULT 5,
    time_window_mins INTEGER DEFAULT 10,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_row CHECK (id = 1)
);
```

---

## Table: `polyservices_reports`
- **Migrations involved**: 86_polyservices_moderation.sql

### Creation DDL
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

---

## Table: `polysuara_censored_words`
- **Migrations involved**: 27_polysuara_v4_updates.sql

### Creation DDL
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_censored_words (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    word TEXT NOT NULL UNIQUE,
    added_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Table: `polysuara_chat_messages`
- **Migrations involved**: 28_polysuara_v5_features.sql

### Creation DDL
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES public.polysuara_chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Table: `polysuara_chats`
- **Migrations involved**: 28_polysuara_v5_features.sql

### Creation DDL
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

---

## Table: `polysuara_comment_reports`
- **Migrations involved**: 20260529224800_98_polysuara_social_comments.sql

### Creation DDL
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_comment_reports (
    comment_id UUID REFERENCES public.polysuara_comments(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (comment_id, reporter_id)
);
```

---

## Table: `polysuara_comment_votes`
- **Migrations involved**: 20260529224800_98_polysuara_social_comments.sql

### Creation DDL
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_comment_votes (
    comment_id UUID REFERENCES public.polysuara_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('UPVOTE', 'DOWNVOTE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (comment_id, user_id)
);
```

---

## Table: `polysuara_comments`
- **Migrations involved**: 20260529224800_98_polysuara_social_comments.sql, 20260529225900_99_polysuara_social_softdelete_images.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE public.polysuara_comments 
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_deleted_by_moderator BOOLEAN DEFAULT false;
```

---

## Table: `polysuara_confessions`
- **Migrations involved**: 20260529224800_98_polysuara_social_comments.sql, 27_polysuara_v4_updates.sql, 29_polysuara_auto_archive.sql, 30_polysuara_downvote.sql, 84_polysuara_schema.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE public.polysuara_confessions ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
```

```sql
ALTER TABLE public.polysuara_confessions 
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
```

```sql
ALTER TABLE public.polysuara_confessions
ADD COLUMN is_archived BOOLEAN DEFAULT false;
```

```sql
ALTER TABLE public.polysuara_confessions
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_hidden_by_community BOOLEAN DEFAULT false;
```

---

## Table: `polysuara_downvotes`
- **Migrations involved**: 30_polysuara_downvote.sql

### Creation DDL
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_downvotes (
    confession_id UUID NOT NULL REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (confession_id, user_id)
);
```

---

## Table: `polysuara_poll_options`
- **Migrations involved**: 28_polysuara_v5_features.sql

### Creation DDL
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_poll_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES public.polysuara_polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Table: `polysuara_poll_votes`
- **Migrations involved**: 28_polysuara_v5_features.sql

### Creation DDL
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

---

## Table: `polysuara_polls`
- **Migrations involved**: 28_polysuara_v5_features.sql

### Creation DDL
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_polls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    confession_id UUID NOT NULL REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    is_multiple_choice BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Table: `polysuara_upvotes`
- **Migrations involved**: 84_polysuara_schema.sql

### Creation DDL
```sql
CREATE TABLE IF NOT EXISTS public.polysuara_upvotes (
    confession_id UUID REFERENCES public.polysuara_confessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (confession_id, user_id)
);
```

---

## Table: `polytask_bids`
- **Migrations involved**: 73_polytask_schema.sql

### Creation DDL
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

---

## Table: `polytask_disputes`
- **Migrations involved**: 54_polytask_disputes_and_rating.sql

### Creation DDL
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

---

## Table: `polytask_jobs`
- **Migrations involved**: 73_polytask_schema.sql, 83_polytask_proof_of_work.sql, 84_polytask_v2_hotfix.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE public.polytask_jobs
ADD COLUMN IF NOT EXISTS proof_image_url TEXT;
```

```sql
ALTER TABLE public.polytask_jobs
ADD COLUMN IF NOT EXISTS proof_image_url TEXT;
```

---

## Table: `polytask_jobs_archive`
- **Migrations involved**: 82_polytask_fasa_all.sql

### Creation DDL
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

---

## Table: `polytask_reviews`
- **Migrations involved**: 73_polytask_schema.sql, 82_polytask_fasa_all.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE public.polytask_reviews
ADD COLUMN IF NOT EXISTS reviewer_role TEXT CHECK (reviewer_role IN ('REQUESTER', 'TASKER'));
```

---

## Table: `polytask_sos_logs`
- **Migrations involved**: 20260525021000_fix_polyrider_profiles_ref.sql

### Alteration DDL
```sql
ALTER TABLE polytask_sos_logs DISABLE TRIGGER trg_audit_polyrider_sos;
```

```sql
ALTER TABLE polytask_sos_logs ENABLE TRIGGER trg_audit_polyrider_sos;
```

---

## Table: `profiles`
- **Migrations involved**: 31_add_staff_details.sql, 51_polyrider_cancel_sos_appeals.sql, 81_polytask_cancellation_rate.sql

### Alteration DDL
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
```

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS polyrider_penalty_count INT DEFAULT 0;
```

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS polyrider_suspended_until TIMESTAMP WITH TIME ZONE;
```

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS polytask_cancellations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS polytask_completed_bids INTEGER DEFAULT 0;
```

---

## Table: `program_attendees`
- **Migrations involved**: 40_program_attendance_system.sql

### Creation DDL
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

---

## Table: `programs`
- **Migrations involved**: 26_pembubaran_kohort.sql, 40_program_attendance_system.sql

### Alteration DDL
```sql
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
```

```sql
ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_user_id_fkey;
```

```sql
ALTER TABLE public.programs ALTER COLUMN user_id DROP NOT NULL;
```

```sql
ALTER TABLE public.programs 
  ADD CONSTRAINT programs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
```

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

```sql
ALTER TABLE programs ADD CONSTRAINT programs_qr_token_unique UNIQUE (qr_token);
```

---

## Table: `public`
- **Migrations involved**: 20260527154636_88_polymart_product_variations.sql, 20260527162500_95_polymart_jsonb_variations.sql, 20260527162700_97_fix_update_product_variation_stock_updated_at.sql, 37_polymart_pos_sync.sql

### Alteration DDL
```sql
ALTER TABLE "public"."business_products"
ADD COLUMN IF NOT EXISTS "variations" TEXT[] DEFAULT '{}'::TEXT[];
```

```sql
ALTER TABLE "public"."polymart_orders"
ADD COLUMN IF NOT EXISTS "selected_variation" TEXT DEFAULT NULL;
```

```sql
ALTER TABLE "public"."business_products" 
DROP COLUMN IF EXISTS "variations";
```

```sql
ALTER TABLE "public"."business_products" 
ADD COLUMN "variations" JSONB DEFAULT '[]'::jsonb;
```

```sql
ALTER TABLE "public"."polymart_cart_items"
ADD COLUMN IF NOT EXISTS "selected_variation" TEXT DEFAULT NULL;
```

```sql
ALTER TABLE "public"."polymart_cart_items" 
DROP CONSTRAINT IF EXISTS "uq_polymart_cart_item";
```

```sql
ALTER TABLE "public"."polymart_cart_items" DROP CONSTRAINT IF EXISTS "uq_polymart_cart_item";
```

```sql
ALTER TABLE "public"."polymart_cart_items" DROP CONSTRAINT IF EXISTS "uq_polymart_cart_item_variation_constraint";
```

```sql
ALTER TABLE "public"."polymart_cart_items"
ALTER COLUMN "selected_variation" SET DEFAULT '',
ALTER COLUMN "selected_variation" SET NOT NULL;
```

```sql
ALTER TABLE "public"."polymart_cart_items"
ADD CONSTRAINT "uq_polymart_cart_item_variation_constraint" 
UNIQUE USING INDEX "uq_polymart_cart_item_variation_v2";
```

```sql
ALTER TABLE "public"."business_products"
ADD COLUMN IF NOT EXISTS "reserved_stock" integer NOT NULL DEFAULT 0;
```

```sql
ALTER TABLE "public"."business_products"
        ADD CONSTRAINT check_stock_reserved_logic CHECK (stock_quantity >= reserved_stock);
```

---

## Table: `student_business_memberships`
- **Migrations involved**: 28_keusahawanan_module.sql

### Creation DDL
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

---

## Table: `student_merit_cohorts`
- **Migrations involved**: 63_merit_system_v2.sql, 67_fix_merit_system_audit.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE public.student_merit_cohorts
  ADD COLUMN IF NOT EXISTS merit_kelab    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merit_akademik INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merit_asrama   INTEGER NOT NULL DEFAULT 0;
```

---

## Table: `supsas_editions`
- **Migrations involved**: 36_supsas_schema.sql

### Creation DDL
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

---

## Table: `supsas_fixtures`
- **Migrations involved**: 36_supsas_schema.sql

### Creation DDL
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

---

## Table: `supsas_kontingen`
- **Migrations involved**: 36_supsas_schema.sql

### Creation DDL
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

---

## Table: `supsas_participants`
- **Migrations involved**: 36_supsas_schema.sql

### Creation DDL
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

---

## Table: `supsas_results`
- **Migrations involved**: 36_supsas_schema.sql

### Creation DDL
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

---

## Table: `supsas_sports`
- **Migrations involved**: 36_supsas_schema.sql

### Creation DDL
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

---

## Table: `system_announcements`
- **Migrations involved**: 32_system_announcements.sql

### Creation DDL
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

---

## Table: `takwim_pusat`
- **Migrations involved**: 45_takwim_pusat.sql, 46_takwim_kelab_kediaman.sql

### Creation DDL
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

### Alteration DDL
```sql
ALTER TABLE takwim_pusat DROP CONSTRAINT IF EXISTS takwim_pusat_jenis_check;
```

```sql
ALTER TABLE takwim_pusat ADD CONSTRAINT takwim_pusat_jenis_check
  CHECK (jenis IN (
    'AKADEMIK', 'JPP', 'KPP', 'KEUSAHAWANAN', 'KEBAJIKAN', 'SRK',
    'AKADEMIK_EXCO', 'MULTIMEDIA', 'KLS', 'KOLAB', 'KK', 'CUTI_UMUM', 'LAIN',
    'KELAB_KEDIAMAN'
  ));
```

```sql
ALTER TABLE takwim_pusat ADD COLUMN IF NOT EXISTS kelab_kediaman_label TEXT;
```

---

## Table: `user_announcement_responses`
- **Migrations involved**: 32_system_announcements.sql

### Creation DDL
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

---

