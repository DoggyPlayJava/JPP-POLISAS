-- ============================================================================
-- Migration 100: Setup Event EMS MAKMP 2026 - Anugerah Keusahawanan
-- ============================================================================
-- Ciri-ciri:
-- 1. Menambah lajur sokongan maklumat juri (ic_no, email, office_address) pada ems_jury_codes
-- 2. Mencipta / mengemas kini acara EMS "MAKMP 2026 - ANUGERAH KEUSAHAWANAN"
-- 3. Memasukkan Rubrik Penjurian Rasmi (Borang Penjurian AKMP 2026) bagi 2 kategori:
--    - Anugerah Projek Keusahawanan Terbaik (5 kriteria x pekali 4, skala 1-5, jumlah 100)
--    - Anugerah Perusahaan Pelajar Terbaik (7 kriteria: Logo x1, Maklumat x3, Aktiviti x2, Organisasi x1, Pencapaian x3, Jualan x4, Bukti Kewangan/SSM x5)
-- 4. Mendaftarkan calon-calon layak daripada data permohonan MAKMP ke dalam ems_participants beserta pautan dokumen PDF/imej rasmi
-- 5. Menetapkan Kod Juri Penilaian Rasmi untuk 3 panel juri jemputan luar, 1 pegawai dalaman Unit Keusahawanan, dan 1 akaun ujian pentadbir
-- ============================================================================

-- Pastikan lajur metadata juri wujud dalam ems_jury_codes
ALTER TABLE public.ems_jury_codes ADD COLUMN IF NOT EXISTS ic_no TEXT;
ALTER TABLE public.ems_jury_codes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.ems_jury_codes ADD COLUMN IF NOT EXISTS office_address TEXT;

DO $$
DECLARE
  v_event_id UUID;
BEGIN
  -- --------------------------------------------------------------------------
  -- 1. CIPTA / DAPATKAN ACARA EMS
  -- --------------------------------------------------------------------------
  SELECT id INTO v_event_id 
  FROM public.ems_events 
  WHERE title = 'MAKMP 2026 - ANUGERAH KEUSAHAWANAN' 
  LIMIT 1;

  IF v_event_id IS NULL THEN
    INSERT INTO public.ems_events (
      id,
      title,
      description,
      category,
      event_type,
      event_mode,
      event_date,
      location,
      status,
      max_participants,
      is_leaderboard_public,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'MAKMP 2026 - ANUGERAH KEUSAHAWANAN',
      'Penjurian Rasmi Anugerah Keusahawanan MAKMP POLISAS 2026 (Unit Keusahawanan): Anugerah Projek Keusahawanan Terbaik & Anugerah Perusahaan Pelajar Terbaik.',
      'KEUSAHAWANAN',
      'COMPETITION',
      'HYBRID',
      now(),
      'POLISAS / Dewan Jubli Perak',
      'ACTIVE',
      50,
      true,
      now()
    ) RETURNING id INTO v_event_id;
  ELSE
    UPDATE public.ems_events
    SET 
      description = 'Penjurian Rasmi Anugerah Keusahawanan MAKMP POLISAS 2026 (Unit Keusahawanan): Anugerah Projek Keusahawanan Terbaik & Anugerah Perusahaan Pelajar Terbaik.',
      category = 'KEUSAHAWANAN',
      status = 'ACTIVE',
      is_leaderboard_public = true
    WHERE id = v_event_id;
  END IF;

  -- --------------------------------------------------------------------------
  -- 2. SET SEMULA RUBRIK LAMA BAGI ACARA INI (IDEMPOTENT)
  -- --------------------------------------------------------------------------
  DELETE FROM public.ems_rubrics WHERE event_id = v_event_id;

  -- --------------------------------------------------------------------------
  -- 2A. RUBRIK KATEGORI 1: ANUGERAH PROJEK KEUSAHAWANAN TERBAIK
  -- (5 Kriteria, Skala 1-5, Pekali X4, Jumlah 100)
  -- --------------------------------------------------------------------------
  INSERT INTO public.ems_rubrics (
    event_id,
    criteria_name,
    max_score,
    weight,
    sort_order,
    category_name,
    section_name,
    descriptors
  ) VALUES
  (
    v_event_id,
    'Maklumat Projek (Objektif dll)',
    5,
    4.0,
    1,
    'Anugerah Projek Keusahawanan Terbaik',
    'Penilaian Projek',
    '{"1": "Sangat Lemah", "2": "Lemah", "3": "Sederhana", "4": "Baik", "5": "Sangat Baik"}'::jsonb
  ),
  (
    v_event_id,
    'Sasaran Peserta Projek (Beneficiary)',
    5,
    4.0,
    2,
    'Anugerah Projek Keusahawanan Terbaik',
    'Penilaian Projek',
    '{"1": "Sangat Lemah", "2": "Lemah", "3": "Sederhana", "4": "Baik", "5": "Sangat Baik"}'::jsonb
  ),
  (
    v_event_id,
    'Carta Organisasi (Kefungsian / Kepakaran Ahli)',
    5,
    4.0,
    3,
    'Anugerah Projek Keusahawanan Terbaik',
    'Penilaian Projek',
    '{"1": "Sangat Lemah", "2": "Lemah", "3": "Sederhana", "4": "Baik", "5": "Sangat Baik"}'::jsonb
  ),
  (
    v_event_id,
    'Impak Projek',
    5,
    4.0,
    4,
    'Anugerah Projek Keusahawanan Terbaik',
    'Penilaian Projek',
    '{"1": "Sangat Lemah", "2": "Lemah", "3": "Sederhana", "4": "Baik", "5": "Sangat Baik"}'::jsonb
  ),
  (
    v_event_id,
    'Pencapaian / Pengiktirafan',
    5,
    4.0,
    5,
    'Anugerah Projek Keusahawanan Terbaik',
    'Penilaian Projek',
    '{"1": "Sangat Lemah", "2": "Lemah", "3": "Sederhana", "4": "Baik", "5": "Sangat Baik"}'::jsonb
  );

  -- --------------------------------------------------------------------------
  -- 2B. RUBRIK KATEGORI 2: ANUGERAH PERUSAHAAN PELAJAR TERBAIK
  -- (7 Kriteria, Skala 1-5, Pekali X1, X3, X2, X1, X3, X4, X5)
  -- --------------------------------------------------------------------------
  INSERT INTO public.ems_rubrics (
    event_id,
    criteria_name,
    max_score,
    weight,
    sort_order,
    category_name,
    section_name,
    descriptors
  ) VALUES
  (
    v_event_id,
    'Logo Syarikat',
    5,
    1.0,
    1,
    'Anugerah Perusahaan Pelajar Terbaik',
    'Identiti & Maklumat Syarikat',
    '{"1": "Sangat Lemah", "2": "Lemah", "3": "Sederhana", "4": "Baik", "5": "Sangat Baik"}'::jsonb
  ),
  (
    v_event_id,
    'Maklumat Syarikat dan Produk',
    5,
    3.0,
    2,
    'Anugerah Perusahaan Pelajar Terbaik',
    'Identiti & Maklumat Syarikat',
    '{"1": "Tiada maklumat lengkap (0m)", "2": "Kurang memuaskan", "3": "Sederhana", "4": "Baik", "5": "Ada logo & maklumat lengkap (5m)"}'::jsonb
  ),
  (
    v_event_id,
    'Gambar Aktiviti Perniagaan',
    5,
    2.0,
    3,
    'Anugerah Perusahaan Pelajar Terbaik',
    'Operasi & Aktiviti',
    '{"1": "Sangat Lemah", "2": "Lemah", "3": "Sederhana", "4": "Baik", "5": "Sangat Baik"}'::jsonb
  ),
  (
    v_event_id,
    'Carta Organisasi',
    5,
    1.0,
    4,
    'Anugerah Perusahaan Pelajar Terbaik',
    'Struktur Pengurusan',
    '{"1": "Sangat Lemah", "2": "Lemah", "3": "Sederhana", "4": "Baik", "5": "Sangat Baik"}'::jsonb
  ),
  (
    v_event_id,
    'Pencapaian / Pengiktirafan',
    5,
    3.0,
    5,
    'Anugerah Perusahaan Pelajar Terbaik',
    'Pencapaian & Pengiktirafan',
    '{"1": "Sangat Lemah", "2": "Lemah", "3": "Sederhana", "4": "Baik", "5": "Sangat Baik"}'::jsonb
  ),
  (
    v_event_id,
    'Anggaran Jualan',
    5,
    4.0,
    6,
    'Anugerah Perusahaan Pelajar Terbaik',
    'Kewangan & Prestasi',
    '{"1": "< RM1,000", "2": "RM1,000 - RM3,000", "3": "RM3,000 - RM6,000", "4": "RM6,000 - RM10,000", "5": "> RM10,000"}'::jsonb
  ),
  (
    v_event_id,
    'Bukti Laporan Kewangan / SSM Syarikat',
    5,
    5.0,
    7,
    'Anugerah Perusahaan Pelajar Terbaik',
    'Kewangan & Pematuhan',
    '{"1": "Tiada Bukti", "2": "Kurang Lengkap", "3": "Penyata Asas Sahaja", "4": "Ada bukti SSM / Statement bank", "5": "Lengkap (SSM + Penyata Bank + Laporan Kewangan)"}'::jsonb
  );

  -- --------------------------------------------------------------------------
  -- 3. SET SEMULA PESERTA BAGI ACARA INI (IDEMPOTENT)
  -- --------------------------------------------------------------------------
  DELETE FROM public.ems_participants WHERE event_id = v_event_id;

  -- --------------------------------------------------------------------------
  -- 3A. DAFTAR CALON KATEGORI 1: ANUGERAH PROJEK KEUSAHAWANAN TERBAIK (3 CALON)
  -- --------------------------------------------------------------------------
  -- Calon 1: AGROSAS (SHAHMIE HAZIQ)
  INSERT INTO public.ems_participants (
    event_id,
    participant_type,
    entity_mode,
    team_name,
    booth_no,
    category_name,
    leader_name,
    matrix_no,
    email,
    phone,
    custom_responses,
    media_urls,
    created_at
  ) VALUES (
    v_event_id,
    'STUDENT',
    'TEAM',
    'AGROSAS',
    'PRJ-01',
    'Anugerah Projek Keusahawanan Terbaik',
    'SHAHMIE HAZIQ BIN SAIFUL AZWA',
    '02DEE24F1092',
    'ducthboy24@gmail.com',
    '0189604475',
    '{"product_title": "AGROSAS (Projek Pertanian Pintar Keusahawanan)", "department": "Jabatan Kejuruteraan Elektrik (JKE)", "role": "DIGITAL MARKETING EXPERT", "source": "MAKMP_2026"}'::jsonb,
    ARRAY['https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DEE24F1092_SIJIL_9_1790743152601.pdf'],
    now()
  );

  -- Calon 2: AIAIZ ENTERPRISE (ALIF AIMAN)
  INSERT INTO public.ems_participants (
    event_id,
    participant_type,
    entity_mode,
    team_name,
    booth_no,
    category_name,
    leader_name,
    matrix_no,
    email,
    phone,
    custom_responses,
    media_urls,
    created_at
  ) VALUES (
    v_event_id,
    'STUDENT',
    'TEAM',
    'AIAIZ ENTERPRISE',
    'PRJ-02',
    'Anugerah Projek Keusahawanan Terbaik',
    'ALIF AIMAN BIN FAZLI SHAREL',
    '02DEE24F1036',
    'aimans8282@gmail.com',
    '01110821127',
    '{"product_title": "AIAIZ ENTERPRISE (Perkhidmatan & Produk Keusahawanan)", "department": "Jabatan Kejuruteraan Elektrik (JKE)", "role": "KETUA PROJEK", "source": "MAKMP_2026"}'::jsonb,
    ARRAY[
      'https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DEE24F1036_SIJIL_7_1790651892143.pdf',
      'https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DEE24F1036_SIJIL_6_1790652631448.pdf'
    ],
    now()
  );

  -- Calon 3: DANISH BONGSU ENTERPRISE (DANISH IRFAN)
  INSERT INTO public.ems_participants (
    event_id,
    participant_type,
    entity_mode,
    team_name,
    booth_no,
    category_name,
    leader_name,
    matrix_no,
    email,
    phone,
    custom_responses,
    media_urls,
    created_at
  ) VALUES (
    v_event_id,
    'STUDENT',
    'TEAM',
    'DANISH BONGSU ENTERPRISE',
    'PRJ-03',
    'Anugerah Projek Keusahawanan Terbaik',
    'DANISH IRFAN',
    '02DLS24F1054',
    'danishhasrul06@gmail.com',
    '0148190695',
    '{"product_title": "DANISH BONGSU ENTERPRISE (Perniagaan Runcit & Servis)", "department": "Jabatan Perdagangan (JP)", "role": "PENGASAS SYARIKAT", "source": "MAKMP_2026"}'::jsonb,
    ARRAY[
      'https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DLS24F1054_SIJIL_25_1790527509536.pdf',
      'https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DLS24F1054_SIJIL_26_1790527509538.pdf',
      'https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DLS24F1054_SIJIL_27_1790527509539.jpeg',
      'https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DLS24F1054_SIJIL_28_1790527509544.jpeg'
    ],
    now()
  );

  -- --------------------------------------------------------------------------
  -- 3B. DAFTAR CALON KATEGORI 2: ANUGERAH PERUSAHAAN PELAJAR TERBAIK (4 CALON)
  -- --------------------------------------------------------------------------
  -- Calon 1: AIAIZ ENTERPRISE (ALIF AIMAN)
  INSERT INTO public.ems_participants (
    event_id,
    participant_type,
    entity_mode,
    team_name,
    booth_no,
    category_name,
    leader_name,
    matrix_no,
    email,
    phone,
    custom_responses,
    media_urls,
    created_at
  ) VALUES (
    v_event_id,
    'STUDENT',
    'TEAM',
    'AIAIZ ENTERPRISE',
    'ENT-01',
    'Anugerah Perusahaan Pelajar Terbaik',
    'ALIF AIMAN BIN FAZLI SHAREL',
    '02DEE24F1036',
    'aimans8282@gmail.com',
    '01110821127',
    '{"product_title": "AIAIZ ENTERPRISE (Perusahaan Pelajar POLISAS)", "department": "Jabatan Kejuruteraan Elektrik (JKE)", "role": "PENGASAS", "source": "MAKMP_2026"}'::jsonb,
    ARRAY['https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DEE24F1036_SIJIL_8_1790651892144.pdf'],
    now()
  );

  -- Calon 2: JAWATANKUASA PERWAKILAN PELAJAR (DANIA.JPPPOLISAS)
  INSERT INTO public.ems_participants (
    event_id,
    participant_type,
    entity_mode,
    team_name,
    booth_no,
    category_name,
    leader_name,
    matrix_no,
    email,
    phone,
    custom_responses,
    media_urls,
    created_at
  ) VALUES (
    v_event_id,
    'STUDENT',
    'TEAM',
    'JAWATANKUASA PERWAKILAN PELAJAR',
    'ENT-02',
    'Anugerah Perusahaan Pelajar Terbaik',
    'DANIA.JPPPOLISAS',
    '02DGU24F1006',
    'dania.jpppolisas@gmail.com',
    '0184094307',
    '{"product_title": "PERUSAHAAN JAWATANKUASA PERWAKILAN PELAJAR (Koperasi Pelajar)", "department": "Jabatan Kejuruteraan Awam (JKA)", "role": "NAIB YANG DI-PERTUA", "source": "MAKMP_2026"}'::jsonb,
    ARRAY['https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DGU24F1006_SIJIL_17_1790516540033.pdf'],
    now()
  );

  -- Calon 3: COFFIVATORS ECOWORKS (MUHAMMAD MARWAN IRFAN)
  INSERT INTO public.ems_participants (
    event_id,
    participant_type,
    entity_mode,
    team_name,
    booth_no,
    category_name,
    leader_name,
    matrix_no,
    email,
    phone,
    custom_responses,
    media_urls,
    created_at
  ) VALUES (
    v_event_id,
    'STUDENT',
    'TEAM',
    'COFFIVATORS ECOWORKS',
    'ENT-03',
    'Anugerah Perusahaan Pelajar Terbaik',
    'MUHAMMAD MARWAN IRFAN BIN MARZUKI',
    '02DKM23F1049',
    '030514060201@polisas.edu.my',
    '01137187948',
    '{"product_title": "COFFIVATORS ECOWORKS (Produk Eko-Inovasi Sisa Kopi)", "department": "Jabatan Kejuruteraan Mekanikal (JKM)", "role": "CEO", "source": "MAKMP_2026"}'::jsonb,
    ARRAY['https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DKM23F1049_SIJIL_2_1790411110413.pdf'],
    now()
  );

  -- Calon 4: DANISH BONGSU ENTERPRISE (DANISH IRFAN)
  INSERT INTO public.ems_participants (
    event_id,
    participant_type,
    entity_mode,
    team_name,
    booth_no,
    category_name,
    leader_name,
    matrix_no,
    email,
    phone,
    custom_responses,
    media_urls,
    created_at
  ) VALUES (
    v_event_id,
    'STUDENT',
    'TEAM',
    'DANISH BONGSU ENTERPRISE',
    'ENT-04',
    'Anugerah Perusahaan Pelajar Terbaik',
    'DANISH IRFAN',
    '02DLS24F1054',
    'danishhasrul06@gmail.com',
    '0148190695',
    '{"product_title": "DANISH BONGSU ENTERPRISE (Perusahaan Berdaftar SSM & Kewangan)", "department": "Jabatan Perdagangan (JP)", "role": "PENGASAS SYARIKAT", "source": "MAKMP_2026"}'::jsonb,
    ARRAY[
      'https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DLS24F1054_SIJIL_21_1790408701892.pdf',
      'https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DLS24F1054_SIJIL_22_1790408701892.pdf',
      'https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DLS24F1054_SIJIL_23_1790408701893.pdf',
      'https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DLS24F1054_SIJIL_24_1790408701893.jpeg',
      'https://api.cipher-node.org/storage/v1/object/public/reports/makmp_sijil/MAKMP_02DLS24F1054_SIJIL_25_1790408701896.jpeg'
    ],
    now()
  );

  -- --------------------------------------------------------------------------
  -- 4. KOD JURI PENJURIAN (PANEL JURI LUAR & DALAMAN)
  -- --------------------------------------------------------------------------
  DELETE FROM public.ems_jury_codes WHERE event_id = v_event_id;

  -- Juri Luar 1: Nor Azita binti Abu Hanifah (Kolej Komuniti Paya Besar)
  INSERT INTO public.ems_jury_codes (
    event_id,
    code,
    jury_name,
    organization,
    ic_no,
    email,
    office_address,
    assigned_categories,
    is_active,
    created_at
  ) VALUES (
    v_event_id,
    '718291',
    'Nor Azita binti Abu Hanifah',
    'Kolej Komuniti Paya Besar',
    '820522 07 5290',
    'norazita@kkpbe.edu.my',
    'Kolej Komuniti Paya Besar, Jalan Gambang-Maran, 26300 Gambang, Pahang',
    ARRAY['Anugerah Projek Keusahawanan Terbaik', 'Anugerah Perusahaan Pelajar Terbaik'],
    true,
    now()
  );

  -- Juri Luar 2: Mohd Faeiz Ekram bin Mohd Jasmani (Kolej Komuniti Pekan)
  INSERT INTO public.ems_jury_codes (
    event_id,
    code,
    jury_name,
    organization,
    ic_no,
    email,
    office_address,
    assigned_categories,
    is_active,
    created_at
  ) VALUES (
    v_event_id,
    '839402',
    'Mohd Faeiz Ekram bin Mohd Jasmani',
    'Kolej Komuniti Pekan',
    '850424-03-5559',
    'faeiz@kkpekan.edu.my',
    'Kolej Komuniti Pekan, Jalan Pekan-Kuantan, Peramu Jaya, 26600 Pekan, Pahang',
    ARRAY['Anugerah Projek Keusahawanan Terbaik', 'Anugerah Perusahaan Pelajar Terbaik'],
    true,
    now()
  );

  -- Juri Luar 3: ROSMAWATI BINTI SAIDIN (Politeknik METrO Kuantan)
  INSERT INTO public.ems_jury_codes (
    event_id,
    code,
    jury_name,
    organization,
    ic_no,
    email,
    office_address,
    assigned_categories,
    is_active,
    created_at
  ) VALUES (
    v_event_id,
    '629481',
    'ROSMAWATI BINTI SAIDIN',
    'Politeknik METrO Kuantan',
    '740210086046',
    'rosmawati@pmku.edu.my',
    'Jabatan Pelancongan dan Hospitaliti, POLITEKNIK METRO KUANTAN, Jalan Tun Ismail, 25000 Kuantan',
    ARRAY['Anugerah Projek Keusahawanan Terbaik', 'Anugerah Perusahaan Pelajar Terbaik'],
    true,
    now()
  );

  -- Juri Dalaman 4: Puan Suriati (Penyelaras Unit Keusahawanan POLISAS)
  INSERT INTO public.ems_jury_codes (
    event_id,
    code,
    jury_name,
    organization,
    office_address,
    assigned_categories,
    is_active,
    created_at
  ) VALUES (
    v_event_id,
    '982983',
    'Puan Suriati',
    'Unit Keusahawanan POLISAS',
    'Unit Keusahawanan, Politeknik Sultan Haji Ahmad Shah (POLISAS)',
    ARRAY['Anugerah Projek Keusahawanan Terbaik', 'Anugerah Perusahaan Pelajar Terbaik'],
    true,
    now()
  );

  -- Juri 5: Pegawai Penilai MAKMP (Ujian/Admin)
  INSERT INTO public.ems_jury_codes (
    event_id,
    code,
    jury_name,
    organization,
    office_address,
    assigned_categories,
    is_active,
    created_at
  ) VALUES (
    v_event_id,
    '884920',
    'Pegawai Penilai MAKMP (Ujian)',
    'Jawatankuasa MAKMP POLISAS',
    'Pusat Penilaian MAKMP POLISAS',
    ARRAY['Anugerah Projek Keusahawanan Terbaik', 'Anugerah Perusahaan Pelajar Terbaik'],
    true,
    now()
  );

  RAISE NOTICE 'Acara MAKMP Keusahawanan berjaya dikonfigurasi dengan ID: %', v_event_id;
END $$;
