-- ============================================================
-- Migration 28: Keusahawanan Module Business System
-- ============================================================
-- 1. Create keusahawanan_categories
-- 2. Create keusahawanan_businesses
-- 3. Create student_business_memberships
-- 4. Set RLS 
-- ============================================================

-- Create types if they don't exist
DO $$ BEGIN
    CREATE TYPE keusahawanan_business_status AS ENUM ('PENDING_INTERVIEW', 'ACTIVE', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE keusahawanan_membership_role AS ENUM ('OWNER', 'MEMBER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE keusahawanan_membership_status AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table: keusahawanan_categories
CREATE TABLE IF NOT EXISTS public.keusahawanan_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: keusahawanan_businesses
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

-- Table: student_business_memberships
CREATE TABLE IF NOT EXISTS public.student_business_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.keusahawanan_businesses(id) ON DELETE CASCADE NOT NULL,
    role keusahawanan_membership_role DEFAULT 'MEMBER' NOT NULL,
    status keusahawanan_membership_status DEFAULT 'PENDING' NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, business_id)
);

-- Insert Default Categories
INSERT INTO public.keusahawanan_categories (name) VALUES 
('Entrepreneur'), 
('Technopreneur'), 
('Services')
ON CONFLICT DO NOTHING;

-- RLS setup
ALTER TABLE public.keusahawanan_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keusahawanan_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_business_memberships ENABLE ROW LEVEL SECURITY;

-- Categories RLS
CREATE POLICY "Public Read Access for Keusahawanan Categories" ON public.keusahawanan_categories FOR SELECT USING (true);
CREATE POLICY "Admin All Access for Keusahawanan Categories" ON public.keusahawanan_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP'))
);

-- Businesses RLS
-- Everyone can read approved/active businesses. Owners and Admins can read all.
CREATE POLICY "Public read active businesses" ON public.keusahawanan_businesses FOR SELECT USING (
  status = 'ACTIVE' OR owner_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP'))
);
CREATE POLICY "Students can create business" ON public.keusahawanan_businesses FOR INSERT WITH CHECK (
  auth.uid() = owner_id
);
CREATE POLICY "Owners and Admins can update their business" ON public.keusahawanan_businesses FOR UPDATE USING (
  auth.uid() = owner_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP'))
);

-- Memberships RLS
CREATE POLICY "Users can see their own memberships or if they are admin" ON public.student_business_memberships FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')) OR
  -- Active business owners can also see memberships of their business
  EXISTS (SELECT 1 FROM keusahawanan_businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
);
CREATE POLICY "Students can request to join" ON public.student_business_memberships FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "Owners and Admins can update memberships" ON public.student_business_memberships FOR UPDATE USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')) OR
  EXISTS (SELECT 1 FROM keusahawanan_businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
);
CREATE POLICY "Owners and Admins can delete memberships" ON public.student_business_memberships FOR DELETE USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('SUPER_ADMIN_JPP', 'JPP')) OR
  EXISTS (SELECT 1 FROM keusahawanan_businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
);
