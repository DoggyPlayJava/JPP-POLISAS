-- ============================================================
-- 20260621072500_seed_default_clubs.sql
-- Seed the public.clubs table with default clubs from clubs.json
-- ============================================================

INSERT INTO public.clubs (id, name, short_name, category, theme_color, description, is_active) VALUES
('def32794-1550-4a0b-a73e-b76af1daa65b', 'Persatuan Pelajar Kejuruteraan Awam', 'PePKa', 'Akademik', '#8B1A1A', 'Persatuan pelajar akademik untuk Jabatan Kejuruteraan Awam.', true),
('3970d20a-76a1-41eb-8fc6-33819c90b7c8', 'Kelab Elektron', 'Elektron', 'Akademik', '#1A3A8B', 'Persatuan pelajar akademik untuk Jabatan Kejuruteraan Elektrik.', true),
('5a7c0eb0-6f16-4029-a887-f4b77abfc2ba', 'Kelab Teknologi Makanan', 'Ketema', 'Akademik', '#1A6B3A', 'Persatuan pelajar akademik untuk Jabatan Teknologi Makanan.', true),
('ac8b7f4d-8ff3-496e-aed0-03118356c16c', 'Kelab Geomatik', 'Geosas', 'Akademik', '#2E8B57', 'Persatuan pelajar akademik untuk program Geomatik.', true),
('316e77a7-ac8e-4950-ada7-d867d220bd48', 'Mechanical Student Society', 'MESS', 'Akademik', '#D2691E', 'Persatuan pelajar akademik untuk Jabatan Kejuruteraan Mekanikal.', true),
('ba80230c-8d97-4b0d-958c-02e67a1ef19c', 'Outdoor Recreation & Adventure Club', 'Orasas', 'Sukan', '#20B2AA', 'Kelab rekreasi luar dan pengembaraan.', true),
('ddee152d-9f38-4894-b32b-64b3965008ee', 'Kelab Silat Olahraga', 'Silat Olahraga', 'Sukan', '#B22222', 'Kelab seni mempertahankan diri silat olahraga.', true),
('d9411d1f-c9c9-4ca3-a66c-f0d89d46544f', 'Kelab Seni Silat Cekak Malaysia', 'Silat Cekak', 'Awam', '#4B0082', 'Kelab seni mempertahankan diri silat cekak.', true),
('45e9cb80-f9f7-4071-917c-9e5360b23c6a', 'Kelab Robotik', 'Robosas', 'Awam', '#4682B4', 'Kelab rekreasi robotik dan inovasi.', true),
('028ebe24-4b25-4e1b-a877-d7c8f7e7af1c', 'Kelab Kebudayaan & Kesenian', 'Kebudayaan', 'Awam', '#FF8C00', 'Kelab untuk mempromosikan seni dan budaya.', true),
('d4ca72f3-587e-4205-b57c-53e13721b7ce', 'Sports & Recreation Club', 'SRC', 'Sukan', '#008080', 'Kelab sukan dan rekreasi umum.', true),
('91d24f51-0369-4e44-aa05-67345ce2430d', 'Kelab E-Sport', 'E-Sport', 'Sukan', '#9370DB', 'Kelab sukan elektronik.', true),
('f2c15792-6fcf-4970-9b29-96dc095f4a14', 'Young Entrepreneurs Society', 'YES', 'Awam', '#FFD700', 'Persatuan usahawan muda.', true),
('0153fff8-16b3-4fae-acae-5f7ffd20fc87', 'Kelab Mahasiswa Prihatin', 'KMP', 'Awam', '#FF1493', 'Kelab kebajikan dan kesukarelawanan mahasiswa.', true),
('f2b1e82b-721b-43f9-a1a4-e6ed830b130c', 'Pasukan Rakan Siswa Pemikir', 'PRSP', 'Awam', '#00FA9A', 'Pasukan pembimbing rakan sebaya.', true),
('91f1fa33-42e9-4001-adf8-1888042b5a5e', 'Islamic Center Society', 'ICS', 'Awam', '#228B22', 'Persatuan kerohanian islam.', true),
('bda22e89-daa0-40b0-b457-cde620b8863e', 'Pasukan Bomba Sukarela', 'BOMBA', 'Awam', '#FF4500', 'Pasukan pakaian seragam bomba sukarela.', true),
('428b854b-9e81-448b-8db5-040994c18e2e', 'Pasukan Pandu Puteri', 'PANDU PUTERI', 'Awam', '#4169E1', 'Pasukan pakaian seragam pandu puteri.', true),
('83ff5c15-c9d3-47b3-b4f5-77d18f949235', 'Pasukan Askar Wataniah', 'WATANIAH', 'Awam', '#556B2F', 'Pasukan simpanan tentera darat.', true),
('06c63e19-42b7-4b6d-b9cd-f33f901d6b43', 'Pasukan Pertahanan Awam', 'PISPA', 'Awam', '#FF8C00', 'Pasukan pakaian seragam pertahanan awam.', true),
('e27f49a1-7696-4489-b2d4-912d0ddf1832', 'Commerce Club', 'Commerce', 'Akademik', '#800080', 'Persatuan pelajar akademik untuk Jabatan Perdagangan.', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  theme_color = EXCLUDED.theme_color,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;
