-- 103_foodbank_identity_confirm.sql
-- Simpan tanda "pelajar telah sahkan Nama & No. Matrik" pada profil (DB),
-- bukan localStorage — supaya ia terikat pada akaun, kekal merentas device/browser.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fb_identity_confirmed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.fb_identity_confirmed IS
  'Pelajar telah mengesahkan Nama Penuh & No. Matrik betul (popup first-time Food Bank).';
