-- 51_polymart_polyrider_integration.sql
-- Integrasi PolyMart & PolyRider

-- 1. Tambah column polymart_order_id ke dalam polyrider_jobs
ALTER TABLE public.polyrider_jobs
ADD COLUMN IF NOT EXISTS polymart_order_id UUID REFERENCES public.polymart_orders(id) ON DELETE SET NULL;

-- 2. Cipta indeks untuk prestasi carian
CREATE INDEX IF NOT EXISTS idx_polyrider_jobs_polymart_order ON public.polyrider_jobs(polymart_order_id);

-- 3. Kemaskini RPC create_polyrider_job untuk menerima polymart_order_id dan job_type
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
  v_group_id     UUID;
  v_group_count  INT := 0;
  v_gender       TEXT;
  v_initial_status TEXT;
BEGIN
  -- Validate student not already in an active job
  IF EXISTS (
    SELECT 1 FROM polyrider_jobs
    WHERE student_id = p_student_id
      AND status IN ('PENDING','ACCEPTED','ARRIVED','IN_TRANSIT','GATHERING','CARPOOL_REQUEST')
  ) THEN
    RAISE EXCEPTION 'Anda masih mempunyai perjalanan aktif';
  END IF;

  -- Fetch student gender from profiles
  SELECT gender INTO v_gender FROM profiles WHERE id = p_student_id LIMIT 1;

  -- If joining existing carpool group
  IF p_join_group_id IS NOT NULL THEN
    -- Must be joining a GATHERING group
    IF NOT EXISTS (
      SELECT 1 FROM polyrider_jobs
      WHERE carpool_group_id = p_join_group_id AND status = 'GATHERING'
    ) THEN
      RAISE EXCEPTION 'Kumpulan carpool ini sudah tidak mengumpul penumpang';
    END IF;

    -- Check if already full (max 3 accepted/gathering members)
    SELECT COUNT(*) INTO v_group_count
    FROM polyrider_jobs
    WHERE carpool_group_id = p_join_group_id AND status = 'GATHERING';

    IF v_group_count >= 3 THEN
      RAISE EXCEPTION 'Kumpulan carpool ini sudah penuh (maks 3 penumpang)';
    END IF;

    v_group_id := p_join_group_id;
    v_initial_status := 'CARPOOL_REQUEST'; -- Joining student starts as request
  ELSE
    v_group_id := NULL;
    IF p_is_carpool_open THEN
      v_initial_status := 'GATHERING'; -- Owner starts as gathering
    ELSE
      v_initial_status := 'PENDING'; -- Normal single job goes straight to pending
    END IF;
  END IF;

  -- Create the job
  INSERT INTO polyrider_jobs (
    student_id, job_type, pickup_name, dropoff_name,
    pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
    status, proposed_price, is_carpool_open, carpool_group_id,
    passenger_gender, polymart_order_id
  ) VALUES (
    p_student_id, p_job_type, p_pickup_name, p_dropoff_name,
    p_pickup_lat, p_pickup_lng, p_dropoff_lat, p_dropoff_lng,
    v_initial_status, p_proposed_price, p_is_carpool_open, v_group_id,
    v_gender, p_polymart_order_id
  ) RETURNING * INTO v_job;

  -- If creating NEW carpool, set group_id = own job id
  IF p_is_carpool_open AND p_join_group_id IS NULL THEN
    UPDATE polyrider_jobs
      SET carpool_group_id = v_job.id
      WHERE id = v_job.id;
    v_job.carpool_group_id := v_job.id;
  END IF;

  RETURN NEXT v_job;
  RETURN;
END;
$function$;
