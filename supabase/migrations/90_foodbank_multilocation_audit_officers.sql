-- Migration: 90_foodbank_multilocation_audit_officers.sql
-- Description: Multi-location stocks, officer assignments, audit logs, and stock transfer RPC

-- 1. Table: foodbank_location_stocks
CREATE TABLE IF NOT EXISTS public.foodbank_location_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.foodbank_items(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.foodbank_distribution_locations(id) ON DELETE CASCADE,
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    reorder_level INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_foodbank_item_location UNIQUE (item_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_fb_loc_stocks_item ON public.foodbank_location_stocks(item_id);
CREATE INDEX IF NOT EXISTS idx_fb_loc_stocks_loc ON public.foodbank_location_stocks(location_id);

-- 2. Table: foodbank_officers (Lantikan Pegawai Bertugas)
CREATE TABLE IF NOT EXISTS public.foodbank_officers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.foodbank_distribution_locations(id) ON DELETE SET NULL, -- NULL = Semua Lokasi / Floating
    role_title TEXT DEFAULT 'Petugas Kaunter',
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_foodbank_officer_user_loc UNIQUE (user_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_fb_officers_user ON public.foodbank_officers(user_id);
CREATE INDEX IF NOT EXISTS idx_fb_officers_loc ON public.foodbank_officers(location_id);
CREATE INDEX IF NOT EXISTS idx_fb_officers_assigned_by ON public.foodbank_officers(assigned_by);

-- Partial unique index to prevent duplicate floating officers for the same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_fb_officer_user_floating 
ON public.foodbank_officers(user_id) 
WHERE location_id IS NULL;

-- 3. Table: foodbank_audit_logs (Log Audit Khusus Food Bank)
CREATE TABLE IF NOT EXISTS public.foodbank_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'STOCK_ADJUSTMENT', 'STOCK_TRANSFER', 'APPLICATION_APPROVAL', 'APPLICATION_REJECTION', 'PICKUP_VERIFIED', 'OFFICER_ASSIGNED', 'OFFICER_REMOVED', 'SESSION_CONFIG_CHANGED', 'LOCATION_UPDATED'
    location_id UUID REFERENCES public.foodbank_distribution_locations(id) ON DELETE SET NULL,
    target_id TEXT, -- application_no, item_name, officer_matric
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fb_audit_actor ON public.foodbank_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_fb_audit_action ON public.foodbank_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_fb_audit_loc ON public.foodbank_audit_logs(location_id);
CREATE INDEX IF NOT EXISTS idx_fb_audit_created_at ON public.foodbank_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.foodbank_location_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foodbank_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foodbank_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper check if user is officer or admin
CREATE OR REPLACE FUNCTION public.can_manage_foodbank(p_uid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  IF p_uid IS NULL THEN RETURN FALSE; END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_uid AND (role IN ('SUPER_ADMIN_JPP', 'ADMIN', 'super_admin') OR role = 'JPP')
  ) THEN RETURN TRUE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.foodbank_officers
    WHERE user_id = p_uid AND is_active = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_foodbank(UUID) TO authenticated, anon;

-- RLS Policies (Non-Negotiable: Always (SELECT auth.uid()))
CREATE POLICY "Allow read foodbank_location_stocks"
ON public.foodbank_location_stocks FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Allow manage foodbank_location_stocks"
ON public.foodbank_location_stocks FOR ALL
TO authenticated
USING (public.can_manage_foodbank((SELECT auth.uid())))
WITH CHECK (public.can_manage_foodbank((SELECT auth.uid())));

CREATE POLICY "Allow read foodbank_officers"
ON public.foodbank_officers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow manage foodbank_officers"
ON public.foodbank_officers FOR ALL
TO authenticated
USING (public.can_manage_foodbank((SELECT auth.uid())))
WITH CHECK (public.can_manage_foodbank((SELECT auth.uid())));

CREATE POLICY "Allow read foodbank_audit_logs"
ON public.foodbank_audit_logs FOR SELECT
TO authenticated
USING (public.can_manage_foodbank((SELECT auth.uid())));

CREATE POLICY "Allow insert foodbank_audit_logs"
ON public.foodbank_audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. RPC: transfer_foodbank_stock (Atomic inter-location stock transfer)
CREATE OR REPLACE FUNCTION public.transfer_foodbank_stock(
    p_item_id UUID,
    p_from_location_id UUID,
    p_to_location_id UUID,
    p_quantity INTEGER,
    p_actor_id UUID,
    p_actor_name TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_source_stock INTEGER;
    v_item_name TEXT;
    v_from_loc_name TEXT;
    v_to_loc_name TEXT;
BEGIN
    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kuantiti pindahan mestilah melebihi 0.');
    END IF;
    IF p_from_location_id = p_to_location_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Lokasi sumber dan destinasi tidak boleh sama.');
    END IF;

    SELECT name INTO v_item_name FROM public.foodbank_items WHERE id = p_item_id;
    SELECT name INTO v_from_loc_name FROM public.foodbank_distribution_locations WHERE id = p_from_location_id;
    SELECT name INTO v_to_loc_name FROM public.foodbank_distribution_locations WHERE id = p_to_location_id;

    -- Lock source row
    SELECT current_stock INTO v_source_stock
    FROM public.foodbank_location_stocks
    WHERE item_id = p_item_id AND location_id = p_from_location_id
    FOR UPDATE;

    IF v_source_stock IS NULL OR v_source_stock < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Baki stok di ' || COALESCE(v_from_loc_name, 'lokasi sumber') || ' tidak mencukupi (Baki: ' || COALESCE(v_source_stock, 0)::TEXT || ').');
    END IF;

    -- Deduct source
    UPDATE public.foodbank_location_stocks
    SET current_stock = current_stock - p_quantity,
        updated_at = timezone('utc'::text, now())
    WHERE item_id = p_item_id AND location_id = p_from_location_id;

    -- Upsert destination
    INSERT INTO public.foodbank_location_stocks (item_id, location_id, current_stock, updated_at)
    VALUES (p_item_id, p_to_location_id, p_quantity, timezone('utc'::text, now()))
    ON CONFLICT (item_id, location_id)
    DO UPDATE SET current_stock = foodbank_location_stocks.current_stock + p_quantity,
                  updated_at = timezone('utc'::text, now());

    -- Audit Log
    INSERT INTO public.foodbank_audit_logs (
        actor_id, actor_name, action_type, location_id, target_id, details
    ) VALUES (
        p_actor_id,
        COALESCE(p_actor_name, 'Pegawai'),
        'STOCK_TRANSFER',
        p_to_location_id,
        v_item_name,
        jsonb_build_object(
            'item_id', p_item_id,
            'item_name', v_item_name,
            'from_location_id', p_from_location_id,
            'from_location_name', v_from_loc_name,
            'to_location_id', p_to_location_id,
            'to_location_name', v_to_loc_name,
            'quantity', p_quantity,
            'notes', p_notes
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Pindahan ' || p_quantity::TEXT || ' unit ' || COALESCE(v_item_name, 'barangan') || ' dari ' || COALESCE(v_from_loc_name, '') || ' ke ' || COALESCE(v_to_loc_name, '') || ' berjaya.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_foodbank_stock(UUID, UUID, UUID, INTEGER, UUID, TEXT, TEXT) TO authenticated;

-- 5. Seed initial location stocks based on existing items & locations
INSERT INTO public.foodbank_location_stocks (item_id, location_id, current_stock, reorder_level)
SELECT i.id, l.id, 
       CASE 
         WHEN l.name ILIKE '%Pusat Edaran Utama%' THEN CEIL(i.current_stock * 0.6)
         WHEN l.name ILIKE '%Kamsis%' THEN CEIL(i.current_stock * 0.25)
         ELSE CEIL(i.current_stock * 0.15)
       END as current_stock,
       10
FROM public.foodbank_items i
CROSS JOIN public.foodbank_distribution_locations l
ON CONFLICT (item_id, location_id) DO NOTHING;
