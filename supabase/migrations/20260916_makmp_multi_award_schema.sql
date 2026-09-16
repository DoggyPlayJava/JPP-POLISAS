-- ==========================================
-- Migrasi: MAKMP Multi-Award System Schema (20260916_makmp_multi_award_schema.sql)
-- Memperkenalkan sokongan permohonan berbilang anugerah (Multi-Award Selection),
-- 9 Kumpulan Kategori, 18 Jenis Anugerah Khusus (Lampiran IV),
-- dan Pengendalian Dokumen/Templat Laporan Unit Keusahawanan & Kelab.
-- ==========================================

-- 1. Jadual Definisi Anugerah (18 Anugerah Rasmi)
CREATE TABLE IF NOT EXISTS public.makmp_award_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_id UUID REFERENCES public.makmp_editions(id) ON DELETE CASCADE,
    category_group TEXT NOT NULL,
    name TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT 'INDIVIDUAL', -- 'INDIVIDUAL' | 'ENTITY'
    doc_requirement_type TEXT NOT NULL DEFAULT 'CERTIFICATES', -- 'CERTIFICATES' | 'REPORT_AND_EVIDENCE'
    template_url TEXT,
    template_name TEXT,
    doc_instructions TEXT,
    description TEXT,
    max_certificates INT DEFAULT 5,
    max_merit INT DEFAULT 20,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indeks
CREATE INDEX IF NOT EXISTS idx_makmp_award_defs_edition ON public.makmp_award_definitions(edition_id);
CREATE INDEX IF NOT EXISTS idx_makmp_award_defs_group ON public.makmp_award_definitions(category_group);

-- 2. Jadual Permohonan Anugerah (Bridge Table: makmp_submission_awards)
CREATE TABLE IF NOT EXISTS public.makmp_submission_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.makmp_submissions(id) ON DELETE CASCADE,
    award_id UUID NOT NULL REFERENCES public.makmp_award_definitions(id) ON DELETE RESTRICT,
    entity_name TEXT, -- Nama Kelab / Syarikat / Projek / Inkubator jika target_type = ENTITY
    applicant_role TEXT, -- Peranan pemohon (Pengarah, Pengurus, Ahli Jawatankuasa, dll.)
    status TEXT NOT NULL DEFAULT 'MENUNGGU', -- 'MENUNGGU' | 'DALAM_SEMAKAN' | 'DISAHKAN' | 'DITOLAK'
    total_merit_granted INT DEFAULT 0,
    reviewed_by_pin_id UUID REFERENCES public.makmp_jury_pins(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indeks
CREATE INDEX IF NOT EXISTS idx_makmp_sub_awards_submission ON public.makmp_submission_awards(submission_id);
CREATE INDEX IF NOT EXISTS idx_makmp_sub_awards_award ON public.makmp_submission_awards(award_id);
CREATE INDEX IF NOT EXISTS idx_makmp_sub_awards_status ON public.makmp_submission_awards(status);

-- 3. Kemaskini Jadual Sijil / Dokumen & Submissions
ALTER TABLE public.makmp_submissions ALTER COLUMN category_id DROP NOT NULL;

ALTER TABLE public.makmp_submission_items
ADD COLUMN IF NOT EXISTS submission_award_id UUID REFERENCES public.makmp_submission_awards(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'SIJIL';

CREATE INDEX IF NOT EXISTS idx_makmp_sub_items_award ON public.makmp_submission_items(submission_award_id);

-- 4. Hak Capaian Jadual (GRANT) untuk Anon, Authenticated, dan Service Role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makmp_award_definitions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makmp_submission_awards TO anon, authenticated, service_role;

-- 5. Polisi RLS (Row Level Security)
ALTER TABLE public.makmp_award_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.makmp_submission_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select makmp_award_definitions" ON public.makmp_award_definitions;
CREATE POLICY "Allow public select makmp_award_definitions"
ON public.makmp_award_definitions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin manage makmp_award_definitions" ON public.makmp_award_definitions;
CREATE POLICY "Allow admin manage makmp_award_definitions"
ON public.makmp_award_definitions FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('SUPER_ADMIN_JPP', 'JPP')
);

DROP POLICY IF EXISTS "Allow select makmp_submission_awards" ON public.makmp_submission_awards;
CREATE POLICY "Allow select makmp_submission_awards"
ON public.makmp_submission_awards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert makmp_submission_awards" ON public.makmp_submission_awards;
CREATE POLICY "Allow insert makmp_submission_awards"
ON public.makmp_submission_awards FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update makmp_submission_awards" ON public.makmp_submission_awards;
CREATE POLICY "Allow update makmp_submission_awards"
ON public.makmp_submission_awards FOR UPDATE USING (true) WITH CHECK (true);

-- 6. Memasukkan Benih 18 Anugerah Rasmi (Lampiran IV MAKMP 2026)
DO $$
DECLARE
    v_edition_id UUID;
BEGIN
    SELECT id INTO v_edition_id FROM public.makmp_editions WHERE year = 2026 LIMIT 1;

    IF v_edition_id IS NOT NULL THEN
        -- 1. ANUGERAH KOLEJ KEDIAMAN
        INSERT INTO public.makmp_award_definitions 
        (edition_id, category_group, name, target_type, doc_requirement_type, doc_instructions, max_certificates, max_merit, sort_order)
        VALUES (v_edition_id, 'ANUGERAH KOLEJ KEDIAMAN', 'Tokoh Kolej Kediaman Terbaik', 'INDIVIDUAL', 'CERTIFICATES', 'Sijil pencapaian, aktiviti asrama & bukti penglibatan kolej kediaman', 5, 20, 10)
        ON CONFLICT DO NOTHING;

        -- 2. ANUGERAH KEUSAHAWANAN
        INSERT INTO public.makmp_award_definitions 
        (edition_id, category_group, name, target_type, doc_requirement_type, doc_instructions, max_certificates, max_merit, sort_order)
        VALUES (v_edition_id, 'ANUGERAH KEUSAHAWANAN', 'Tokoh Keusahawanan Terbaik', 'INDIVIDUAL', 'CERTIFICATES', 'Sijil pencapaian keusahawanan, anugerah pitching, atau bukti pengiktirafan jualan', 5, 20, 20)
        ON CONFLICT DO NOTHING;

        INSERT INTO public.makmp_award_definitions 
        (edition_id, category_group, name, target_type, doc_requirement_type, template_name, doc_instructions, max_certificates, max_merit, sort_order)
        VALUES (v_edition_id, 'ANUGERAH KEUSAHAWANAN', 'Inkubator Terbaik', 'ENTITY', 'REPORT_AND_EVIDENCE', 'Templat Laporan Inkubator Keusahawanan', 'Wajib muat naik Laporan Inkubator mengikut templat rasmi (PDF) berserta bukti aktiviti/jualan', 5, 20, 21)
        ON CONFLICT DO NOTHING;

        INSERT INTO public.makmp_award_definitions 
        (edition_id, category_group, name, target_type, doc_requirement_type, template_name, doc_instructions, max_certificates, max_merit, sort_order)
        VALUES (v_edition_id, 'ANUGERAH KEUSAHAWANAN', 'Program Keusahawanan Terbaik', 'ENTITY', 'REPORT_AND_EVIDENCE', 'Templat Laporan Program Keusahawanan', 'Wajib muat naik Laporan Program Keusahawanan (PDF) berserta bukti penglibatan peserta', 5, 20, 22)
        ON CONFLICT DO NOTHING;

        INSERT INTO public.makmp_award_definitions 
        (edition_id, category_group, name, target_type, doc_requirement_type, template_name, doc_instructions, max_certificates, max_merit, sort_order)
        VALUES (v_edition_id, 'ANUGERAH KEUSAHAWANAN', 'Perusahaan Terbaik', 'ENTITY', 'REPORT_AND_EVIDENCE', 'Templat Laporan Perusahaan Pelajar', 'Wajib muat naik Laporan Perusahaan (PDF) berserta penyata SSM, rekod jualan, dan foto produk/premis', 5, 20, 23)
        ON CONFLICT DO NOTHING;

        -- 3. ANUGERAH SUKAN
        INSERT INTO public.makmp_award_definitions 
        (edition_id, category_group, name, target_type, doc_requirement_type, doc_instructions, max_certificates, max_merit, sort_order)
        VALUES 
        (v_edition_id, 'ANUGERAH SUKAN', 'Olahragawan POLISAS', 'INDIVIDUAL', 'CERTIFICATES', 'Sijil penyertaan & kejayaan pertandingan sukan rasmi peringkat Politeknik hingga Antarabangsa', 5, 20, 30),
        (v_edition_id, 'ANUGERAH SUKAN', 'Olahragawati POLISAS', 'INDIVIDUAL', 'CERTIFICATES', 'Sijil penyertaan & kejayaan pertandingan sukan rasmi peringkat Politeknik hingga Antarabangsa', 5, 20, 31),
        (v_edition_id, 'ANUGERAH SUKAN', 'Pasukan Terbaik', 'ENTITY', 'CERTIFICATES', 'Sijil kejayaan berpasukan dalam kejohanan sukan rasmi', 5, 20, 32),
        (v_edition_id, 'ANUGERAH SUKAN', 'Anugerah Atlet Para Terbaik', 'INDIVIDUAL', 'CERTIFICATES', 'Sijil kejayaan pertandingan sukan para atlet rasmi', 5, 20, 33)
        ON CONFLICT DO NOTHING;

        -- 4. ANUGERAH AKADEMIK
        INSERT INTO public.makmp_award_definitions 
        (edition_id, category_group, name, target_type, doc_requirement_type, doc_instructions, max_certificates, max_merit, sort_order)
        VALUES 
        (v_edition_id, 'ANUGERAH AKADEMIK', 'Pelajar Terbaik Siswa', 'INDIVIDUAL', 'CERTIFICATES', 'Sijil Anugerah Dekan, transkrip keputusan peperiksaan & sijil akademik berkaitan', 5, 20, 40),
        (v_edition_id, 'ANUGERAH AKADEMIK', 'Pelajar Terbaik Siswi', 'INDIVIDUAL', 'CERTIFICATES', 'Sijil Anugerah Dekan, transkrip keputusan peperiksaan & sijil akademik berkaitan', 5, 20, 41)
        ON CONFLICT DO NOTHING;

        -- 5. ANUGERAH KELAB DAN PERSATUAN
        INSERT INTO public.makmp_award_definitions 
        (edition_id, category_group, name, target_type, doc_requirement_type, template_name, doc_instructions, max_certificates, max_merit, sort_order)
        VALUES (v_edition_id, 'ANUGERAH KELAB DAN PERSATUAN', 'Kelab Terbaik', 'ENTITY', 'REPORT_AND_EVIDENCE', 'Templat Laporan Tahunan Kelab', 'Laporan tahunan aktiviti kelab (PDF) berserta senarai pencapaian & penglibatan ahli', 5, 20, 50)
        ON CONFLICT DO NOTHING;

        -- 6. ANUGERAH JPP
        INSERT INTO public.makmp_award_definitions 
        (edition_id, category_group, name, target_type, doc_requirement_type, doc_instructions, max_certificates, max_merit, sort_order)
        VALUES 
        (v_edition_id, 'ANUGERAH JPP', 'Anugerah Kepimpinan JPP Terbaik', 'INDIVIDUAL', 'CERTIFICATES', 'Sijil watikah pelantikan & portfolio sumbangan kepimpinan JPP', 5, 20, 60),
        (v_edition_id, 'ANUGERAH JPP', 'Anugerah EXCO JPP Terbaik', 'INDIVIDUAL', 'CERTIFICATES', 'Sijil penghargaan & rekod keberhasilan pelaksanaan unit EXCO', 5, 20, 61)
        ON CONFLICT DO NOTHING;

        -- 7. ANUGERAH PROGRAM
        INSERT INTO public.makmp_award_definitions 
        (edition_id, category_group, name, target_type, doc_requirement_type, template_name, doc_instructions, max_certificates, max_merit, sort_order)
        VALUES (v_edition_id, 'ANUGERAH PROGRAM', 'Anugerah Program Terbaik', 'ENTITY', 'REPORT_AND_EVIDENCE', 'Templat Laporan Program POLISAS', 'Laporan penuh program / kertas kerja & penilaian impak program', 5, 20, 70)
        ON CONFLICT DO NOTHING;

        -- 8. ANUGERAH KHAS
        INSERT INTO public.makmp_award_definitions 
        (edition_id, category_group, name, target_type, doc_requirement_type, doc_instructions, max_certificates, max_merit, sort_order)
        VALUES 
        (v_edition_id, 'ANUGERAH KHAS', 'Anugerah Khas Pengantarabangsaan', 'INDIVIDUAL', 'CERTIFICATES', 'Sijil penyertaan / pengiktirafan persidangan, pertandingan atau mobiliti antarabangsa', 5, 20, 80),
        (v_edition_id, 'ANUGERAH KHAS', 'Anugerah Khas Pencapaian Gemilang', 'INDIVIDUAL', 'CERTIFICATES', 'Sijil atau bukti pencapaian gemilang yang mengharumkan nama POLISAS di peringkat tinggi', 5, 20, 81)
        ON CONFLICT DO NOTHING;

        -- 9. ANUGERAH UTAMA
        INSERT INTO public.makmp_award_definitions 
        (edition_id, category_group, name, target_type, doc_requirement_type, doc_instructions, max_certificates, max_merit, sort_order)
        VALUES 
        (v_edition_id, 'ANUGERAH UTAMA', 'Anugerah Tokoh Siswa Terbaik', 'INDIVIDUAL', 'CERTIFICATES', 'Portfolio kepimpinan, kokurikulum, sahsiah, akademik & sijil-sijil pencapaian tertinggi', 5, 20, 90),
        (v_edition_id, 'ANUGERAH UTAMA', 'Anugerah Tokoh Siswi Terbaik', 'INDIVIDUAL', 'CERTIFICATES', 'Portfolio kepimpinan, kokurikulum, sahsiah, akademik & sijil-sijil pencapaian tertinggi', 5, 20, 91)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
