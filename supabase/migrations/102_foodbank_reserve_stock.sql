-- 102_foodbank_reserve_stock.sql
-- Ciri "reserve stock": bila pelajar hantar permohonan Food Bank (status MENUNGGU),
-- kuantiti item dipilih di-"reserve" (tahan) supaya tidak menerima permohonan
-- melebihi stok yang ada. Reservation ditolak pada peringkat induk
-- (foodbank_items) DAN per-lokasi (foodbank_location_stocks).

-- 1. Kolum reserved_stock pada induk
ALTER TABLE public.foodbank_items
  ADD COLUMN IF NOT EXISTS reserved_stock integer NOT NULL DEFAULT 0
  CHECK (reserved_stock >= 0);

-- 1b. Kolum stock_reserved pada permohonan (penanda reservation telah dibuat)
ALTER TABLE public.foodbank_applications
  ADD COLUMN IF NOT EXISTS stock_reserved boolean NOT NULL DEFAULT false;

-- 2. Kolum reserved_stock pada per-lokasi
ALTER TABLE public.foodbank_location_stocks
  ADD COLUMN IF NOT EXISTS reserved_stock integer NOT NULL DEFAULT 0
  CHECK (reserved_stock >= 0);

-- 3. RPC: Reserve stock untuk satu permohonan (atomik).
--    Menyemak baki "available" = current_stock - reserved_stock. Jika tak cukup
--    → RAISE EXCEPTION (permohonan gagal, client papar mesej).
CREATE OR REPLACE FUNCTION public.reserve_foodbank_stock(
    p_application_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_app RECORD;
    v_item RECORD;
    v_item_id UUID;
    v_qty INTEGER;
    v_available INTEGER;
    v_loc_available INTEGER;
BEGIN
    -- Kunci permohonan
    SELECT * INTO v_app
    FROM public.foodbank_applications
    WHERE id = p_application_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak dijumpai.');
    END IF;

    -- Jangan reserve dua kali
    IF COALESCE(v_app.stock_reserved, false) THEN
        RETURN jsonb_build_object('success', true, 'already_reserved', true);
    END IF;

    -- Loop setiap item dipilih
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_app.selected_items)
    LOOP
        v_item_id := (v_item.value->>'item_id')::UUID;
        v_qty := COALESCE((v_item.value->>'quantity')::INTEGER, 1);

        -- (a) Induk: semak baki available & reserve
        SELECT current_stock - reserved_stock INTO v_available
        FROM public.foodbank_items
        WHERE id = v_item_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item tidak dijumpai dalam inventori.';
        END IF;

        IF v_available < v_qty THEN
            RAISE EXCEPTION 'Stok tidak mencukupi. Item diminta telah kehabisan baki.';
        END IF;

        UPDATE public.foodbank_items
        SET reserved_stock = reserved_stock + v_qty,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_item_id;

        -- (b) Per-lokasi (jika permohonan pilih lokasi)
        IF v_app.location_id IS NOT NULL THEN
            SELECT current_stock - reserved_stock INTO v_loc_available
            FROM public.foodbank_location_stocks
            WHERE item_id = v_item_id AND location_id = v_app.location_id
            FOR UPDATE;

            IF FOUND THEN
                IF v_loc_available < v_qty THEN
                    RAISE EXCEPTION 'Stok tidak mencukupi di pusat agihan terpilih.';
                END IF;

                UPDATE public.foodbank_location_stocks
                SET reserved_stock = reserved_stock + v_qty,
                    updated_at = timezone('utc'::text, now())
                WHERE item_id = v_item_id AND location_id = v_app.location_id;
            END IF;
        END IF;
    END LOOP;

    -- Tanda permohonan telah di-reserve
    UPDATE public.foodbank_applications
    SET stock_reserved = true,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_application_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. RPC: Release reservation (bila permohonan DITOLAK / BATAL).
CREATE OR REPLACE FUNCTION public.release_foodbank_stock(
    p_application_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_app RECORD;
    v_item RECORD;
    v_item_id UUID;
    v_qty INTEGER;
BEGIN
    SELECT * INTO v_app
    FROM public.foodbank_applications
    WHERE id = p_application_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak dijumpai.');
    END IF;

    -- Tiada reservation → tiada apa untuk dilepaskan
    IF COALESCE(v_app.stock_reserved, false) IS FALSE THEN
        RETURN jsonb_build_object('success', true, 'nothing_to_release', true);
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_app.selected_items)
    LOOP
        v_item_id := (v_item.value->>'item_id')::UUID;
        v_qty := COALESCE((v_item.value->>'quantity')::INTEGER, 1);

        -- (a) Induk
        UPDATE public.foodbank_items
        SET reserved_stock = GREATEST(0, reserved_stock - v_qty),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_item_id;

        -- (b) Per-lokasi
        IF v_app.location_id IS NOT NULL THEN
            UPDATE public.foodbank_location_stocks
            SET reserved_stock = GREATEST(0, reserved_stock - v_qty),
                updated_at = timezone('utc'::text, now())
            WHERE item_id = v_item_id AND location_id = v_app.location_id;
        END IF;
    END LOOP;

    UPDATE public.foodbank_applications
    SET stock_reserved = false,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_application_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_foodbank_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_foodbank_stock(UUID) TO authenticated;

-- 5. Ubah verify_and_complete_foodbank_pickup: masa pickup, selain tolak
--    current_stock (stok fizikal keluar), juga lepaskan reserved_stock
--    (reservation telah digunakan).
CREATE OR REPLACE FUNCTION public.verify_and_complete_foodbank_pickup(
    p_application_id UUID,
    p_verifier_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_app RECORD;
    v_item RECORD;
    v_item_id UUID;
    v_qty INTEGER;
    v_item_name TEXT;
    v_current_stock INTEGER;
    v_total_val NUMERIC(10, 2);
    v_settings_id UUID;
BEGIN
    SELECT * INTO v_app
    FROM public.foodbank_applications
    WHERE id = p_application_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan Food Bank tidak dijumpai.');
    END IF;

    IF v_app.status = 'SELESAI' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan ini telah pun selesai diambil pada ' || to_char(COALESCE(v_app.pickup_verified_at, now()), 'DD/MM/YYYY HH24:MI') || '.');
    END IF;

    IF v_app.status != 'LULUS' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Hanya permohonan berstatus LULUS boleh disahkan untuk agihan. Status semasa: ' || v_app.status);
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_app.selected_items)
    LOOP
        v_item_id := (v_item.value->>'item_id')::UUID;
        v_qty := COALESCE((v_item.value->>'quantity')::INTEGER, 1);

        SELECT current_stock, name INTO v_current_stock, v_item_name
        FROM public.foodbank_items
        WHERE id = v_item_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item Food Bank ID % tidak dijumpai dalam inventori.', v_item_id;
        END IF;

        IF v_current_stock < v_qty THEN
            RAISE EXCEPTION 'Stok tidak mencukupi untuk item "%" (Baki: %, Diperlukan: %).', v_item_name, v_current_stock, v_qty;
        END IF;

        -- Tolak stok fizikal + lepaskan reservation
        UPDATE public.foodbank_items
        SET current_stock = current_stock - v_qty,
            reserved_stock = GREATEST(0, reserved_stock - v_qty),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_item_id;

        -- Per-lokasi: lepaskan reservation
        IF v_app.location_id IS NOT NULL THEN
            UPDATE public.foodbank_location_stocks
            SET current_stock = GREATEST(0, current_stock - v_qty),
                reserved_stock = GREATEST(0, reserved_stock - v_qty),
                updated_at = timezone('utc'::text, now())
            WHERE item_id = v_item_id AND location_id = v_app.location_id;
        END IF;
    END LOOP;

    UPDATE public.foodbank_applications
    SET status = 'SELESAI',
        pickup_verified_at = timezone('utc'::text, now()),
        pickup_verified_by = p_verifier_id,
        stock_reserved = false,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_application_id;

    v_total_val := COALESCE(v_app.total_estimated_value, 0.00);

    SELECT id INTO v_settings_id
    FROM public.foodbank_settings
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_settings_id IS NOT NULL THEN
        UPDATE public.foodbank_settings
        SET current_spent = current_spent + v_total_val,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_settings_id;
    END IF;

    INSERT INTO public.foodbank_budget_transactions (
        application_id, transaction_type, amount, description, created_by
    ) VALUES (
        p_application_id,
        'DISTRIBUTION',
        v_total_val,
        'Agihan selesai untuk no permohonan ' || v_app.application_no || ' (Nilai anggaran: RM' || v_total_val::TEXT || ')',
        p_verifier_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Pengesahan pengambilan berjaya diselesaikan.',
        'application_id', p_application_id,
        'application_no', v_app.application_no,
        'total_value', v_total_val
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_and_complete_foodbank_pickup(UUID, UUID) TO authenticated;

