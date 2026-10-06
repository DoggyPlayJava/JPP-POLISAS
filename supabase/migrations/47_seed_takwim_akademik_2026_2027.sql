-- ============================================================
-- Migration 47: Seed Takwim Akademik Sesi 2026/2027 (Institusi B)
-- Sumber: Kementerian Pendidikan Tinggi (KPT)
-- Program: Diploma & Sijil Politeknik dan Kolej Komuniti
-- Zon: Institusi B (Pahang, Johor, Melaka, N.Sembilan, Selangor, Perak, Pulau Pinang, Perlis, Sabah, Sarawak, WPKL)
-- ============================================================

-- 1. SEED ENTRI TAKWIM AKADEMIK (takwim_pusat)
DO $$
BEGIN

  -- ── SESI I: 2026/2027 ────────────────────────────────────────
  -- Minggu 1: Pendaftaran Pelajar Baharu / Minggu Transformasi Siswa (MTS)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2026-06-22' AND jenis = 'AKADEMIK') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('AKADEMIK', 'Pendaftaran Pelajar Baharu / Minggu Transformasi Siswa (MTS)', NULL, '2026-06-22', '2026-06-28', 1, 'Pendaftaran Pelajar Baharu / Minggu Transformasi Siswa (MTS)', '2026/2027', 'AKADEMIK');
  END IF;

  -- Minggu 2-10: Kuliah (9 Minggu)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2026-06-29' AND jenis = 'AKADEMIK') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('AKADEMIK', 'Kuliah', 'Maulidur Rasul: 25/08/2026 (Selasa)', '2026-06-29', '2026-08-30', 9, 'Kuliah', '2026/2027', 'AKADEMIK');
  END IF;

  -- Cuti Pertengahan Semester (1 Minggu)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2026-08-31' AND jenis = 'CUTI_UMUM') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('CUTI_UMUM', 'Cuti Pertengahan Semester', 'Hari Kebangsaan: 31/08/2026 (Isnin)', '2026-08-31', '2026-09-06', 1, 'Cuti Pertengahan Semester', '2026/2027', 'AKADEMIK');
  END IF;

  -- Minggu 11-15: Kuliah (5 Minggu)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2026-09-07' AND jenis = 'AKADEMIK') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('AKADEMIK', 'Kuliah', 'Hari Malaysia: 16/09/2026 (Rabu)', '2026-09-07', '2026-10-11', 5, 'Kuliah', '2026/2027', 'AKADEMIK');
  END IF;

  -- Minggu 16: Minggu Ulang Kaji (1 Minggu)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2026-10-12' AND jenis = 'AKADEMIK') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('AKADEMIK', 'Minggu Ulang Kaji', NULL, '2026-10-12', '2026-10-16', 1, 'Minggu Ulang Kaji', '2026/2027', 'AKADEMIK');
  END IF;

  -- Minggu 17-19: Peperiksaan Akhir Semester (3 Minggu)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2026-10-17' AND jenis = 'AKADEMIK') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('AKADEMIK', 'Peperiksaan Akhir Semester (kecuali STE)', 'Hari Deepavali - kecuali Negeri Sarawak: 08/11/2026 (Ahad)', '2026-10-17', '2026-11-08', 3, 'Peperiksaan Akhir Semester (kecuali STE)', '2026/2027', 'AKADEMIK');
  END IF;

  -- Cuti Akhir Semester (3 Minggu)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2026-11-09' AND jenis = 'CUTI_UMUM') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('CUTI_UMUM', 'Cuti Akhir Semester', NULL, '2026-11-09', '2026-11-29', 3, 'Cuti Akhir Semester', '2026/2027', 'AKADEMIK');
  END IF;

  -- ── SESI II: 2026/2027 ───────────────────────────────────────
  -- Minggu 1: Pendaftaran Pelajar Baharu / Minggu Transformasi Siswa (MTS)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2026-11-23' AND jenis = 'AKADEMIK') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('AKADEMIK', 'Pendaftaran Pelajar Baharu / Minggu Transformasi Siswa (MTS)', NULL, '2026-11-23', '2026-11-29', 1, 'Pendaftaran Pelajar Baharu / Minggu Transformasi Siswa (MTS)', '2026/2027', 'AKADEMIK');
  END IF;

  -- Minggu 2-11: Kuliah (10 Minggu)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2026-11-30' AND jenis = 'AKADEMIK') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('AKADEMIK', 'Kuliah', 'Hari Krismas: 25/12/2026 (Jumaat) · Tahun Baru: 01/01/2027 (Jumaat) · Tahun Baru Cina: 06&07/02/2027 (Sabtu & Ahad)', '2026-11-30', '2027-02-07', 10, 'Kuliah', '2026/2027', 'AKADEMIK');
  END IF;

  -- Cuti Pertengahan Semester (1 Minggu)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2027-02-08' AND jenis = 'CUTI_UMUM') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('CUTI_UMUM', 'Cuti Pertengahan Semester', NULL, '2027-02-08', '2027-02-14', 1, 'Cuti Pertengahan Semester', '2026/2027', 'AKADEMIK');
  END IF;

  -- Minggu 12-14: Kuliah (3 Minggu)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2027-02-15' AND jenis = 'AKADEMIK') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('AKADEMIK', 'Kuliah', NULL, '2027-02-15', '2027-03-07', 3, 'Kuliah', '2026/2027', 'AKADEMIK');
  END IF;

  -- Cuti Perayaan (1 Minggu)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2027-03-08' AND jenis = 'CUTI_UMUM') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('CUTI_UMUM', 'Cuti Perayaan', 'Hari Raya Aidilfitri: 10 & 11/03/2027 (Rabu & Khamis)', '2027-03-08', '2027-03-14', 1, 'Cuti Perayaan', '2026/2027', 'AKADEMIK');
  END IF;

  -- Minggu 15: Kuliah (1 Minggu)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2027-03-15' AND jenis = 'AKADEMIK') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('AKADEMIK', 'Kuliah', NULL, '2027-03-15', '2027-03-21', 1, 'Kuliah', '2026/2027', 'AKADEMIK');
  END IF;

  -- Minggu 16: Minggu Ulang Kaji (1 Minggu)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2027-03-22' AND jenis = 'AKADEMIK') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('AKADEMIK', 'Minggu Ulang Kaji', NULL, '2027-03-22', '2027-03-26', 1, 'Minggu Ulang Kaji', '2026/2027', 'AKADEMIK');
  END IF;

  -- Minggu 17-19: Peperiksaan Akhir Semester (3 Minggu)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2027-03-27' AND jenis = 'AKADEMIK') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('AKADEMIK', 'Peperiksaan Akhir Semester (kecuali STE)', NULL, '2027-03-27', '2027-04-18', 3, 'Peperiksaan Akhir Semester (kecuali STE)', '2026/2027', 'AKADEMIK');
  END IF;

  -- Cuti Akhir Semester / Semester Pendek (9 Minggu)
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2026/2027' AND tarikh_mula = '2027-04-19' AND jenis = 'CUTI_UMUM') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('CUTI_UMUM', 'Cuti Akhir Semester / Semester Pendek', 'Hari Pekerja: 01/05/2027 (Sabtu) · Hari Raya Aidiladha: 17/05/2027 (Isnin) · Hari Wesak: 20/05/2027 (Khamis) · Awal Muharram: 06/06/2027 (Ahad) · Hari Keputeraan YDP Agong: 07/06/2027 (Isnin). Kuliah Semester Pendek bermula pada 19 April 2027.', '2027-04-19', '2027-06-20', 9, 'Cuti Akhir Semester / Semester Pendek', '2026/2027', 'AKADEMIK');
  END IF;

  -- ── SESI I: 2027/2028 (PREVIEW) ──────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM takwim_pusat WHERE sesi = '2027/2028' AND tarikh_mula = '2027-06-14' AND jenis = 'AKADEMIK') THEN
    INSERT INTO takwim_pusat (jenis, tajuk, catatan, tarikh_mula, tarikh_tamat, bil_minggu, aktiviti, sesi, exco_module)
    VALUES ('AKADEMIK', 'Pendaftaran Pelajar Baharu / Minggu Transformasi Siswa (MTS)', NULL, '2027-06-14', '2027-06-20', 1, 'Pendaftaran Pelajar Baharu / Minggu Transformasi Siswa (MTS)', '2027/2028', 'AKADEMIK');
  END IF;

END $$;

-- 2. SEED CUTI UMUM (takwim_holidays)
INSERT INTO takwim_holidays (nama_cuti, tarikh_mula)
SELECT v.nama, v.tarikh::date
FROM (VALUES
  ('Maulidur Rasul', '2026-08-25'),
  ('Hari Kebangsaan', '2026-08-31'),
  ('Hari Malaysia', '2026-09-16'),
  ('Hari Deepavali', '2026-11-08'),
  ('Hari Krismas', '2026-12-25'),
  ('Tahun Baru', '2027-01-01'),
  ('Tahun Baru Cina', '2027-02-06'),
  ('Hari Raya Aidilfitri', '2027-03-10'),
  ('Hari Raya Aidilfitri Hari Kedua', '2027-03-11'),
  ('Hari Pekerja', '2027-05-01'),
  ('Hari Raya Aidiladha', '2027-05-17'),
  ('Hari Wesak', '2027-05-20'),
  ('Awal Muharram', '2027-06-06'),
  ('Hari Keputeraan YDP Agong', '2027-06-07')
) AS v(nama, tarikh)
WHERE NOT EXISTS (
  SELECT 1 FROM takwim_holidays
  WHERE nama_cuti = v.nama AND tarikh_mula = v.tarikh::date
);
