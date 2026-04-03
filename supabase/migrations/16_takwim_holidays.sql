-- Jadual untuk JPP masukkan cuti umum secara manual
CREATE TABLE IF NOT EXISTS public.takwim_holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_cuti TEXT NOT NULL,
  tarikh_mula DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.takwim_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view holidays"
  ON public.takwim_holidays FOR SELECT USING (true);

CREATE POLICY "JPP admin can manage holidays"
  ON public.takwim_holidays FOR ALL USING (
    EXISTS (
      SELECT 1 FROM student_club_memberships
      WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN_JPP'
    )
  );

-- Tambah kolum pengarah_program jika belum wujud
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pengarah_program TEXT;

-- Tambah warna rasmi JPP ke system_settings
INSERT INTO system_settings (key, value)
VALUES ('jpp_theme_color', '"#6B1D2A"'::jsonb)
ON CONFLICT (key) DO NOTHING;
