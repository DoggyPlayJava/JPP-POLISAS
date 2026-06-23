-- ============================================================
-- 20260623171500_update_club_names.sql
-- Update registered club names to their correct official names
-- ============================================================

UPDATE public.clubs
SET name = 'Kelab Orator POLISAS'
WHERE id = 'ba80230c-8d97-4b0d-958c-02e67a1ef19c';

UPDATE public.clubs
SET name = 'Kelab Silat Cekak'
WHERE id = 'd9411d1f-c9c9-4ca3-a66c-f0d89d46544f';

UPDATE public.clubs
SET name = 'Kelab Robotik POLISAS'
WHERE id = '45e9cb80-f9f7-4071-917c-9e5360b23c6a';

UPDATE public.clubs
SET name = 'Kelab Kebudayaan'
WHERE id = '028ebe24-4b25-4e1b-a877-d7c8f7e7af1c';

UPDATE public.clubs
SET name = 'Youth & Extremely Successful Club'
WHERE id = 'f2c15792-6fcf-4970-9b29-96dc095f4a14';

UPDATE public.clubs
SET name = 'Kelab Multimedia Polisas'
WHERE id = '0153fff8-16b3-4fae-acae-5f7ffd20fc87';

UPDATE public.clubs
SET name = 'Pembimbing Rakan Siswa POLISAS'
WHERE id = 'f2b1e82b-721b-43f9-a1a4-e6ed830b130c';

UPDATE public.clubs
SET name = 'Indian Community Society'
WHERE id = '91f1fa33-42e9-4001-adf8-1888042b5a5e';

UPDATE public.clubs
SET name = 'Pasukan Bomba'
WHERE id = 'bda22e89-daa0-40b0-b457-cde620b8863e';
