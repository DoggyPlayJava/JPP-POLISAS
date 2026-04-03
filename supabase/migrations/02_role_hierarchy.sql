-- ============================================================
-- CIRI 2: Pengurusan Peranan Berhierarki
-- Jalankan script ini di Supabase SQL Editor (full)
-- SELAMAT: hanya menambah fungsi & trigger, tiada ubah jadual sedia ada
-- ============================================================

-- [2A] Postgres Function: Semak kebenaran tukar peranan mengikut hierarki
CREATE OR REPLACE FUNCTION can_change_role(
  actor_id UUID,        -- ID pengguna yang buat perubahan
  target_id UUID,       -- ID ahli yang diubah
  new_role  TEXT        -- Peranan baharu yang ingin ditetapkan
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- Berjalan dengan kebenaran postgres, bukan user — selamat!
SET search_path = public
AS $$
DECLARE
  actor_role          TEXT;
  actor_club          TEXT;
  target_current_role TEXT;
  target_club         TEXT;
BEGIN
  -- Dapatkan peranan & kelab pelaku dan sasaran
  SELECT role, club_id INTO actor_role, actor_club
  FROM profiles WHERE id = actor_id;

  SELECT role, club_id INTO target_current_role, target_club
  FROM profiles WHERE id = target_id;

  -- Keselamatan: tidak boleh ubah diri sendiri melalui fungsi ini
  IF actor_id = target_id THEN
    RETURN FALSE;
  END IF;

  -- 1. JPP boleh ubah SEMUA role merentas semua kelab
  IF actor_role = 'SUPER_ADMIN_JPP' THEN
    RETURN TRUE;
  END IF;

  -- Peraturan berikut: hanya boleh urus kelab sendiri
  IF actor_club IS DISTINCT FROM target_club THEN
    RETURN FALSE;
  END IF;

  -- 2. Penasihat boleh ubah: PRESIDEN, MT, AHLI
  --    (TIDAK boleh ubah ke/dari PENASIHAT atau JPP)
  IF actor_role IN ('CLUB_ADVISOR') THEN
    RETURN (
      new_role IN ('CLUB_PRESIDENT', 'CLUB_MT', 'CLUB_MEMBER')
      AND target_current_role IN ('CLUB_PRESIDENT', 'CLUB_MT', 'CLUB_MEMBER')
    );
  END IF;

  -- 3. Presiden boleh ubah: MT dan AHLI
  --    (TIDAK boleh upgrade ke Presiden atau Penasihat)
  IF actor_role = 'CLUB_PRESIDENT' THEN
    RETURN (
      new_role IN ('CLUB_MT', 'CLUB_MEMBER')
      AND target_current_role IN ('CLUB_MT', 'CLUB_MEMBER')
    );
  END IF;

  -- Semua kes lain (MT, Ahli): DITOLAK
  RETURN FALSE;

EXCEPTION WHEN OTHERS THEN
  -- Jika ada ralat tidak dijangka, tolak dengan selamat
  RAISE WARNING 'can_change_role error: %', SQLERRM;
  RETURN FALSE;
END;
$$;

DO $$ BEGIN RAISE NOTICE 'Function can_change_role() created/updated.'; END $$;

-- [2B] Trigger Function: Log setiap perubahan peranan ke club_logs
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name TEXT;
BEGIN
  -- Hanya log jika peranan benar-benar berubah
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;

  -- Dapatkan nama pelaku
  SELECT full_name INTO actor_name
  FROM profiles WHERE id = auth.uid();

  -- Insert ke club_logs (jika jadual ini wujud)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'club_logs') THEN
    INSERT INTO club_logs (
      club_id, 
      user_id,
      type, 
      content
    ) VALUES (
      NEW.club_id,
      auth.uid(),
      'ROLE_CHANGE',
      format(
        '[%s] menukar peranan [%s] daripada [%s] kepada [%s]',
        COALESCE(actor_name, 'Sistem'),
        COALESCE(NEW.full_name, NEW.id::text),
        OLD.role,
        NEW.role
      )
    );
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log gagal tidak sepatutnya sekat UPDATE asal
  RAISE WARNING 'log_role_change error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Pasang trigger (atau ganti yang lama)
DROP TRIGGER IF EXISTS on_profile_role_change ON profiles;
CREATE TRIGGER on_profile_role_change
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_change();

DO $$ BEGIN RAISE NOTICE 'Trigger on_profile_role_change created/updated.'; END $$;

-- [2C] Sahkan fungsi berfungsi dengan test (boleh komen keluar selepas verify)
-- SELECT can_change_role(
--   '00000000-0000-0000-0000-000000000001'::UUID,  -- ganti dengan ID JPP sebenar
--   '00000000-0000-0000-0000-000000000002'::UUID,  -- ganti dengan ID ahli
--   'CLUB_MT'
-- );
