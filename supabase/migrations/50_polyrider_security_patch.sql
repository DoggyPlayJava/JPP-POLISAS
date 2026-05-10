-- 50_polyrider_security_patch.sql
-- Fix function_search_path_mutable security vulnerability by adding SET search_path = public

CREATE OR REPLACE FUNCTION public.create_polyrider_job(p_student_id uuid, p_pickup_name text, p_dropoff_name text, p_pickup_lat numeric DEFAULT NULL::numeric, p_pickup_lng numeric DEFAULT NULL::numeric, p_dropoff_lat numeric DEFAULT NULL::numeric, p_dropoff_lng numeric DEFAULT NULL::numeric, p_proposed_price numeric DEFAULT 3.0, p_is_carpool_open boolean DEFAULT false, p_join_group_id uuid DEFAULT NULL::uuid)
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
    passenger_gender
  ) VALUES (
    p_student_id, 'RIDE', p_pickup_name, p_dropoff_name,
    p_pickup_lat, p_pickup_lng, p_dropoff_lat, p_dropoff_lng,
    v_initial_status, p_proposed_price, p_is_carpool_open, v_group_id,
    v_gender
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

CREATE OR REPLACE FUNCTION public.get_active_polyrider_count()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    active_count INTEGER;
BEGIN
    SELECT count(*) INTO active_count FROM public.polyrider_profiles WHERE is_active = true AND status = 'APPROVED' AND (license_expiry_date > now() OR license_expiry_date IS NULL);
    RETURN active_count;
END;
$function$;

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
$function$;

CREATE OR REPLACE FUNCTION public.is_klk_or_admin(uid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

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

  -- Reject any pending CARPOOL_REQUESTs
  UPDATE polyrider_jobs
  SET status = 'CANCELLED'
  WHERE carpool_group_id = p_group_id AND status = 'CARPOOL_REQUEST';
END;
$function$;

CREATE OR REPLACE FUNCTION public.respond_carpool_request(p_request_id uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_group_id UUID;
  v_group_count INT;
BEGIN
  -- Get the group id of this request
  SELECT carpool_group_id INTO v_group_id
  FROM polyrider_jobs
  WHERE id = p_request_id AND status = 'CARPOOL_REQUEST';

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Permintaan tidak dijumpai atau sudah diproses';
  END IF;

  IF p_accept THEN
    -- Check capacity
    SELECT COUNT(*) INTO v_group_count
    FROM polyrider_jobs
    WHERE carpool_group_id = v_group_id AND status = 'GATHERING';

    IF v_group_count >= 3 THEN
      RAISE EXCEPTION 'Carpool ini sudah penuh';
    END IF;

    -- Accept request
    UPDATE polyrider_jobs SET status = 'GATHERING' WHERE id = p_request_id;

    -- If we hit 3 members, auto-lock!
    IF v_group_count + 1 = 3 THEN
      PERFORM lock_polyrider_carpool(v_group_id);
    END IF;
  ELSE
    -- Reject
    UPDATE polyrider_jobs SET status = 'CANCELLED' WHERE id = p_request_id;
  END IF;
END;
$function$;

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
  END IF;
  RETURN NEW;
END;
$function$;

-- Finally, add the index for status on polyrider_jobs
CREATE INDEX IF NOT EXISTS idx_polyrider_jobs_status ON public.polyrider_jobs(status);
