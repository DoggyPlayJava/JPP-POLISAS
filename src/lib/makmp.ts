import { supabase } from '@/lib/supabase';
import type {
  MakmpEdition,
  MakmpCategory,
  MakmpJuryPin,
  MakmpSubmission,
  MakmpSubmissionItem,
  MakmpAwardDefinition,
  MakmpSubmissionAward,
  MakmpTargetType,
  MakmpDocRequirementType,
  MakmpDocumentType,
  MakmpPeringkat,
  MakmpPencapaianType,
  MakmpSubmissionStatus,
  AkademikImportCertItem,
} from '@/types';

// ============================================================================
// 18 ANUGERAH RASMI MAKMP 2026 (Lampiran IV)
// ============================================================================
export const MAKMP_DEFAULT_AWARDS_2026: Omit<MakmpAwardDefinition, 'id' | 'edition_id' | 'created_at'>[] = [
  // 1. ANUGERAH KOLEJ KEDIAMAN
  {
    category_group: 'ANUGERAH KOLEJ KEDIAMAN',
    name: 'Tokoh Kolej Kediaman Terbaik',
    target_type: 'INDIVIDUAL',
    doc_requirement_type: 'CERTIFICATES',
    doc_instructions: 'Sijil pencapaian, aktiviti asrama & bukti penglibatan kolej kediaman',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 10,
    is_active: true,
  },
  // 2. ANUGERAH KEUSAHAWANAN
  {
    category_group: 'ANUGERAH KEUSAHAWANAN',
    name: 'Tokoh Keusahawanan Terbaik',
    target_type: 'INDIVIDUAL',
    doc_requirement_type: 'CERTIFICATES',
    doc_instructions: 'Sijil pencapaian keusahawanan, anugerah pitching, atau bukti pengiktirafan rasmi/jualan',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 20,
    is_active: true,
  },
  {
    category_group: 'ANUGERAH KEUSAHAWANAN',
    name: 'Inkubator Terbaik',
    target_type: 'ENTITY',
    doc_requirement_type: 'REPORT_AND_EVIDENCE',
    template_name: 'Templat Laporan Inkubator Keusahawanan',
    template_url: 'https://docs.google.com/document/d/1_makmp_inkubator_template/edit',
    doc_instructions: 'Wajib muat naik Laporan Inkubator mengikut templat rasmi (PDF) berserta bukti aktiviti/jualan',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 21,
    is_active: true,
  },
  {
    category_group: 'ANUGERAH KEUSAHAWANAN',
    name: 'Program Keusahawanan Terbaik',
    target_type: 'ENTITY',
    doc_requirement_type: 'REPORT_AND_EVIDENCE',
    template_name: 'Templat Laporan Program Keusahawanan',
    template_url: 'https://docs.google.com/document/d/1_makmp_program_keusahawanan_template/edit',
    doc_instructions: 'Wajib muat naik Laporan Program Keusahawanan (PDF) berserta bukti kehadiran & penglibatan peserta',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 22,
    is_active: true,
  },
  {
    category_group: 'ANUGERAH KEUSAHAWANAN',
    name: 'Perusahaan Terbaik',
    target_type: 'ENTITY',
    doc_requirement_type: 'REPORT_AND_EVIDENCE',
    template_name: 'Templat Laporan Perusahaan Pelajar',
    template_url: 'https://docs.google.com/document/d/1_makmp_perusahaan_template/edit',
    doc_instructions: 'Wajib muat naik Laporan Perusahaan (PDF) berserta salinan pendaftaran SSM, rekod jualan, dan foto produk/premis',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 23,
    is_active: true,
  },
  // 3. ANUGERAH SUKAN
  {
    category_group: 'ANUGERAH SUKAN',
    name: 'Olahragawan POLISAS',
    target_type: 'INDIVIDUAL',
    doc_requirement_type: 'CERTIFICATES',
    doc_instructions: 'Sijil penyertaan & kejayaan kejohanan sukan rasmi (Politeknik, SUKIPT, Kebangsaan, Antarabangsa)',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 30,
    is_active: true,
  },
  {
    category_group: 'ANUGERAH SUKAN',
    name: 'Olahragawati POLISAS',
    target_type: 'INDIVIDUAL',
    doc_requirement_type: 'CERTIFICATES',
    doc_instructions: 'Sijil penyertaan & kejayaan kejohanan sukan rasmi (Politeknik, SUKIPT, Kebangsaan, Antarabangsa)',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 31,
    is_active: true,
  },
  {
    category_group: 'ANUGERAH SUKAN',
    name: 'Pasukan Terbaik',
    target_type: 'ENTITY',
    doc_requirement_type: 'CERTIFICATES',
    doc_instructions: 'Sijil kejayaan berpasukan dalam kejohanan sukan rasmi',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 32,
    is_active: true,
  },
  {
    category_group: 'ANUGERAH SUKAN',
    name: 'Anugerah Atlet Para Terbaik',
    target_type: 'INDIVIDUAL',
    doc_requirement_type: 'CERTIFICATES',
    doc_instructions: 'Sijil kejayaan pertandingan sukan para atlet rasmi',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 33,
    is_active: true,
  },
  // 4. ANUGERAH AKADEMIK
  {
    category_group: 'ANUGERAH AKADEMIK',
    name: 'Pelajar Terbaik Siswa',
    target_type: 'INDIVIDUAL',
    doc_requirement_type: 'CERTIFICATES',
    doc_instructions: 'Sijil Anugerah Dekan, transkrip peperiksaan & sijil akademik berkaitan',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 40,
    is_active: true,
  },
  {
    category_group: 'ANUGERAH AKADEMIK',
    name: 'Pelajar Terbaik Siswi',
    target_type: 'INDIVIDUAL',
    doc_requirement_type: 'CERTIFICATES',
    doc_instructions: 'Sijil Anugerah Dekan, transkrip peperiksaan & sijil akademik berkaitan',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 41,
    is_active: true,
  },
  // 5. ANUGERAH KELAB DAN PERSATUAN
  {
    category_group: 'ANUGERAH KELAB DAN PERSATUAN',
    name: 'Kelab Terbaik',
    target_type: 'ENTITY',
    doc_requirement_type: 'REPORT_AND_EVIDENCE',
    template_name: 'Templat Laporan Tahunan Kelab',
    template_url: 'https://docs.google.com/document/d/1_makmp_kelab_template/edit',
    doc_instructions: 'Laporan tahunan aktiviti kelab (PDF) berserta senarai pencapaian & penglibatan ahli',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 50,
    is_active: true,
  },
  // 6. ANUGERAH JPP
  {
    category_group: 'ANUGERAH JPP',
    name: 'Anugerah Kepimpinan JPP Terbaik',
    target_type: 'INDIVIDUAL',
    doc_requirement_type: 'CERTIFICATES',
    doc_instructions: 'Sijil watikah pelantikan & portfolio sumbangan kepimpinan JPP',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 60,
    is_active: true,
  },
  {
    category_group: 'ANUGERAH JPP',
    name: 'Anugerah EXCO JPP Terbaik',
    target_type: 'INDIVIDUAL',
    doc_requirement_type: 'CERTIFICATES',
    doc_instructions: 'Sijil penghargaan & rekod keberhasilan pelaksanaan unit EXCO',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 61,
    is_active: true,
  },
  // 7. ANUGERAH PROGRAM
  {
    category_group: 'ANUGERAH PROGRAM',
    name: 'Anugerah Program Terbaik',
    target_type: 'ENTITY',
    doc_requirement_type: 'REPORT_AND_EVIDENCE',
    template_name: 'Templat Laporan Program POLISAS',
    template_url: 'https://docs.google.com/document/d/1_makmp_program_template/edit',
    doc_instructions: 'Laporan penuh program / kertas kerja & penilaian impak program',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 70,
    is_active: true,
  },
  // 8. ANUGERAH KHAS
  {
    category_group: 'ANUGERAH KHAS',
    name: 'Anugerah Khas Pengantarabangsaan',
    target_type: 'INDIVIDUAL',
    doc_requirement_type: 'CERTIFICATES',
    doc_instructions: 'Sijil penyertaan / pengiktirafan persidangan, pertandingan atau mobiliti antarabangsa',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 80,
    is_active: true,
  },
  {
    category_group: 'ANUGERAH KHAS',
    name: 'Anugerah Khas Pencapaian Gemilang',
    target_type: 'INDIVIDUAL',
    doc_requirement_type: 'CERTIFICATES',
    doc_instructions: 'Sijil atau bukti pencapaian gemilang yang mengharumkan nama POLISAS di peringkat tinggi',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 81,
    is_active: true,
  },
  // 9. ANUGERAH UTAMA
  {
    category_group: 'ANUGERAH UTAMA',
    name: 'Anugerah Tokoh Siswa Terbaik',
    target_type: 'INDIVIDUAL',
    doc_requirement_type: 'CERTIFICATES',
    doc_instructions: 'Portfolio kepimpinan, kokurikulum, sahsiah, akademik & sijil-sijil pencapaian tertinggi',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 90,
    is_active: true,
  },
  {
    category_group: 'ANUGERAH UTAMA',
    name: 'Anugerah Tokoh Siswi Terbaik',
    target_type: 'INDIVIDUAL',
    doc_requirement_type: 'CERTIFICATES',
    doc_instructions: 'Portfolio kepimpinan, kokurikulum, sahsiah, akademik & sijil-sijil pencapaian tertinggi',
    max_certificates: 5,
    max_merit: 50,
    sort_order: 91,
    is_active: true,
  },
];

export const MAKMP_CATEGORY_GROUP_META: Record<string, { label: string; icon: string; color: string }> = {
  'ANUGERAH KOLEJ KEDIAMAN': { label: 'Kolej Kediaman', icon: 'Home', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400' },
  'ANUGERAH KEUSAHAWANAN': { label: 'Keusahawanan', icon: 'Briefcase', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-400' },
  'ANUGERAH SUKAN': { label: 'Sukan & Rekreasi', icon: 'Trophy', color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-400' },
  'ANUGERAH AKADEMIK': { label: 'Akademik', icon: 'GraduationCap', color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-400' },
  'ANUGERAH KELAB DAN PERSATUAN': { label: 'Kelab & Persatuan', icon: 'Users', color: 'from-pink-500/20 to-rose-500/20 border-pink-500/40 text-pink-400' },
  'ANUGERAH JPP': { label: 'Kepimpinan JPP', icon: 'Award', color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/40 text-yellow-400' },
  'ANUGERAH PROGRAM': { label: 'Program & Acara', icon: 'Calendar', color: 'from-indigo-500/20 to-violet-500/20 border-indigo-500/40 text-indigo-400' },
  'ANUGERAH KHAS': { label: 'Anugerah Khas', icon: 'Star', color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-400' },
  'ANUGERAH UTAMA': { label: 'Anugerah Utama', icon: 'Crown', color: 'from-yellow-400/25 to-amber-600/25 border-yellow-400/50 text-yellow-300' },
};

export function groupAwardsByCategory(awards: MakmpAwardDefinition[]): Record<string, MakmpAwardDefinition[]> {
  const grouped: Record<string, MakmpAwardDefinition[]> = {};
  for (const award of awards) {
    if (!grouped[award.category_group]) {
      grouped[award.category_group] = [];
    }
    grouped[award.category_group].push(award);
  }
  return grouped;
}

// ============================================================================
// MATRIKS MERIT MAKMP (Peringkat x Tahap Kejayaan)
// Selaras dengan logik merit e-akademik Politeknik
// ============================================================================
export const MAKMP_MERIT_MATRIX: Record<MakmpPeringkat, Record<MakmpPencapaianType, number>> = {
  ANTARABANGSA: {
    JOHAN: 10,
    EMAS: 10,
    NAIB_JOHAN: 8,
    PERAK: 8,
    KETIGA: 7,
    GANGSA: 7,
    PESERTA: 5,
    LAIN: 5,
  },
  KEBANGSAAN: {
    JOHAN: 8,
    EMAS: 8,
    NAIB_JOHAN: 6,
    PERAK: 6,
    KETIGA: 5,
    GANGSA: 5,
    PESERTA: 3,
    LAIN: 3,
  },
  NEGERI: {
    JOHAN: 6,
    EMAS: 6,
    NAIB_JOHAN: 5,
    PERAK: 5,
    KETIGA: 4,
    GANGSA: 4,
    PESERTA: 2,
    LAIN: 2,
  },
  DAERAH: {
    JOHAN: 5,
    EMAS: 5,
    NAIB_JOHAN: 4,
    PERAK: 4,
    KETIGA: 3,
    GANGSA: 3,
    PESERTA: 2,
    LAIN: 2,
  },
  POLITEKNIK: {
    JOHAN: 4,
    EMAS: 4,
    NAIB_JOHAN: 3,
    PERAK: 3,
    KETIGA: 2,
    GANGSA: 2,
    PESERTA: 1,
    LAIN: 1,
  },
};

export const PERINGKAT_OPTIONS: { value: MakmpPeringkat; label: string }[] = [
  { value: 'ANTARABANGSA', label: 'Antarabangsa' },
  { value: 'KEBANGSAAN', label: 'Kebangsaan' },
  { value: 'NEGERI', label: 'Negeri' },
  { value: 'DAERAH', label: 'Daerah / Zon' },
  { value: 'POLITEKNIK', label: 'Institusi / Politeknik' },
];

export const PENCAPAIAN_TYPE_OPTIONS: { value: MakmpPencapaianType; label: string }[] = [
  { value: 'JOHAN', label: 'Johan / Tempat Pertama' },
  { value: 'NAIB_JOHAN', label: 'Naib Johan / Tempat Ke-2' },
  { value: 'KETIGA', label: 'Tempat Ke-3' },
  { value: 'EMAS', label: 'Pingat Emas / Anugerah Khas' },
  { value: 'PERAK', label: 'Pingat Perak' },
  { value: 'GANGSA', label: 'Pingat Gangsa' },
  { value: 'PESERTA', label: 'Penyertaan Sahaja' },
  { value: 'LAIN', label: 'Lain-lain Pencapaian' },
];

export const JABATAN_OPTIONS = [
  { value: 'perdagangan', label: 'Jabatan Perdagangan (JP)' },
  { value: 'mekanikal',   label: 'Jabatan Kejuruteraan Mekanikal (JKM)' },
  { value: 'makanan',     label: 'Jabatan Teknologi Makanan (JTM)' },
  { value: 'elektrik',    label: 'Jabatan Kejuruteraan Elektrik (JKE)' },
  { value: 'awam',        label: 'Jabatan Kejuruteraan Awam (JKA)' },
  { value: 'ftv',         label: 'Asasi Teknologi Kejuruteraan (FTV)' },
];

export function getJabatanLabel(deptVal?: string | null): string {
  if (!deptVal) return '—';
  const v = deptVal.toLowerCase();
  if (v === 'awam' || v === 'jka') return 'Jabatan Kejuruteraan Awam (JKA)';
  if (v === 'elektrik' || v === 'jke') return 'Jabatan Kejuruteraan Elektrik (JKE)';
  if (v === 'mekanikal' || v === 'jkm') return 'Jabatan Kejuruteraan Mekanikal (JKM)';
  if (v === 'perdagangan' || v === 'jp') return 'Jabatan Perdagangan (JP)';
  if (v === 'makanan' || v === 'jtm') return 'Jabatan Teknologi Makanan (JTM)';
  if (v === 'ftv') return 'Asasi Teknologi Kejuruteraan (FTV)';
  return deptVal;
}

export function calculateSuggestedMerit(
  peringkat: MakmpPeringkat,
  pencapaianType: MakmpPencapaianType
): number {
  return MAKMP_MERIT_MATRIX[peringkat]?.[pencapaianType] ?? 0;
}

export function generateTrackingCode(year = 2026): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 5; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MAKMP-${year}-${rand}`;
}

// ============================================================================
// UPLOAD SIJIL (Google Drive melalui backend API dengan Supabase Storage fallback)
// ============================================================================
export async function uploadMakmpCertificate(
  file: File,
  matricNo: string,
  index: number
): Promise<{ url: string; fileId?: string }> {
  const cleanMatric = (matricNo || 'PELAJAR').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const customName = `MAKMP_${cleanMatric}_SIJIL_${index + 1}_${Date.now()}`;

  // 1. Cuba upload ke Google Drive via Express backend
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subfolder', 'makmp_sijil');
    formData.append('customName', customName);

    const res = await fetch('/api/makmp/upload-sijil', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.url) {
        return { url: data.url, fileId: data.fileId };
      }
    }
    console.warn('[MAKMP Upload] Drive upload endpoint returned non-OK, falling back to Supabase Storage.');
  } catch (err) {
    console.warn('[MAKMP Upload] Drive upload failed, falling back to Supabase Storage:', err);
  }

  // 2. Fallback: Supabase Storage bucket 'reports'
  const ext = file.name.split('.').pop() || 'pdf';
  const path = `makmp_sijil/${customName}.${ext}`;
  const { error: uploadErr } = await supabase.storage.from('reports').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadErr) {
    throw new Error(`Gagal memuat naik fail: ${uploadErr.message}`);
  }

  const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(path);
  return { url: publicUrl };
}

// ============================================================================
// WHATSAPP URL FORMATTER
// ============================================================================
export function getMakmpWhatsAppUrl(
  submission: Partial<MakmpSubmission>,
  categoryName?: string
): string {
  const origin = window.location.origin;
  const statusLink = `${origin}/makmp/status?code=${encodeURIComponent(submission.tracking_code || '')}`;

  const message = `*RESIT PENYERAHAN MAKMP POLISAS*\n` +
    `---------------------------------------\n` +
    `📌 *Kod Rujukan:* ${submission.tracking_code}\n` +
    `👤 *Nama:* ${submission.full_name}\n` +
    `🎓 *No. Matrik:* ${submission.matric_no}\n` +
    `🏆 *Kategori:* ${categoryName || 'Anugerah Kecemerlangan'}\n` +
    `🏛️ *Jabatan:* ${submission.department}\n` +
    `📅 *Tarikh Hantar:* ${new Date().toLocaleDateString('ms-MY')}\n` +
    `---------------------------------------\n` +
    `Semak status permohonan anda pada bila-bila masa di pautan ini:\n` +
    `${statusLink}\n\n` +
    `_Simpan mesej ini untuk rujukan anda._`;

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

// ============================================================================
// DATA FETCHING & MUTATION HELPERS
// ============================================================================

/** Dapatkan edisi MAKMP yang sedang aktif beserta senarai kategori dan anugerahnya */
export async function fetchActiveMakmpEdition(): Promise<{
  edition: MakmpEdition | null;
  categories: MakmpCategory[];
  awards: MakmpAwardDefinition[];
}> {
  const { data: edition, error: edErr } = await supabase
    .from('makmp_editions')
    .select('id, year, title, description, is_active, submission_deadline, created_at')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (edErr || !edition) {
    return { edition: null, categories: [], awards: [] };
  }

  // 1. Fetch categories
  const { data: categories } = await supabase
    .from('makmp_categories')
    .select('id, edition_id, name, department_scope, max_certificates, max_merit, description, is_active, sort_order, created_at')
    .eq('edition_id', edition.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // 2. Fetch 18 awards definitions
  const { data: awardsData, error: awardsErr } = await supabase
    .from('makmp_award_definitions')
    .select('*')
    .eq('edition_id', edition.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  let awards: MakmpAwardDefinition[] = (awardsData || []) as MakmpAwardDefinition[];
  
  // Fallback offline jika jadual kosong
  if (!awards || awards.length === 0) {
    awards = MAKMP_DEFAULT_AWARDS_2026.map((def, idx) => ({
      ...def,
      id: `default-award-${idx + 1}`,
      edition_id: edition.id,
      created_at: new Date().toISOString(),
    }));
  }

  return {
    edition,
    categories: categories || [],
    awards,
  };
}

/** Hantar borang permohonan BERBILANG ANUGERAH (Multi-Award Submission) */
export async function submitMakmpMultiAwardApplication(params: {
  submission: {
    tracking_code: string;
    edition_id: string;
    user_id?: string | null;
    has_portal_account: boolean;
    full_name: string;
    matric_no: string;
    email?: string | null;
    phone: string;
    department: string;
    programme_code?: string | null;
    semester?: number | null;
  };
  awards: {
    award_id: string;
    entity_name?: string | null;
    applicant_role?: string | null;
    items: {
      nama_pencapaian: string;
      document_type?: MakmpDocumentType;
      peringkat: MakmpPeringkat;
      pencapaian_type: MakmpPencapaianType;
      penganjur?: string | null;
      tarikh?: string | null;
      drive_view_url: string;
      drive_download_url?: string | null;
      drive_file_id?: string | null;
      merit_suggested: number;
      akademik_pencapaian_id?: string | null;
      source?: 'MANUAL_UPLOAD' | 'E_AKADEMIK';
    }[];
  }[];
}): Promise<{
  submission: MakmpSubmission;
  awards: MakmpSubmissionAward[];
  items: MakmpSubmissionItem[];
}> {
  // 1. Masukkan rekod submission utama
  const { data: subData, error: subErr } = await supabase
    .from('makmp_submissions')
    .insert([
      {
        tracking_code: params.submission.tracking_code,
        edition_id: params.submission.edition_id,
        user_id: params.submission.user_id || null,
        has_portal_account: params.submission.has_portal_account || false,
        full_name: params.submission.full_name,
        matric_no: params.submission.matric_no.toUpperCase().trim(),
        email: params.submission.email || null,
        phone: params.submission.phone.trim(),
        department: params.submission.department,
        programme_code: params.submission.programme_code || null,
        semester: params.submission.semester || null,
        status: 'MENUNGGU',
        total_merit_awarded: 0,
      },
    ])
    .select()
    .single();

  if (subErr || !subData) {
    throw new Error(`Gagal menyimpan permohonan utama: ${subErr?.message || 'Ralat pangkalan data'}`);
  }

  const createdAwards: MakmpSubmissionAward[] = [];
  const createdItems: MakmpSubmissionItem[] = [];

  // 2. Masukkan setiap permohonan anugerah
  for (const aw of params.awards) {
    // Validasi award_id wujud
    const isMock = aw.award_id.startsWith('default-award-');
    let realAwardId = aw.award_id;

    if (isMock) {
      // Cari jika ada award definition sebenar dalam DB
      const { data: foundAw } = await supabase
        .from('makmp_award_definitions')
        .select('id')
        .eq('edition_id', params.submission.edition_id)
        .limit(1)
        .maybeSingle();
      if (foundAw?.id) {
        realAwardId = foundAw.id;
      }
    }

    const { data: awardRow, error: awardErr } = await supabase
      .from('makmp_submission_awards')
      .insert([
        {
          submission_id: subData.id,
          award_id: realAwardId,
          entity_name: aw.entity_name || null,
          applicant_role: aw.applicant_role || null,
          status: 'MENUNGGU',
          total_merit_granted: 0,
        },
      ])
      .select()
      .single();

    if (awardErr || !awardRow) {
      console.error('[MAKMP Multi-Award Error]', awardErr);
      continue;
    }

    createdAwards.push(awardRow as MakmpSubmissionAward);

    // 3. Masukkan item dokumen/sijil bagi anugerah ini
    if (aw.items && aw.items.length > 0) {
      const itemsToInsert = aw.items.map((it) => ({
        submission_id: subData.id,
        submission_award_id: awardRow.id,
        document_type: it.document_type || 'SIJIL',
        nama_pencapaian: it.nama_pencapaian,
        peringkat: it.peringkat,
        pencapaian_type: it.pencapaian_type,
        penganjur: it.penganjur || null,
        tarikh: it.tarikh || null,
        drive_view_url: it.drive_view_url,
        drive_download_url: it.drive_download_url || null,
        drive_file_id: it.drive_file_id || null,
        merit_suggested: it.merit_suggested || 0,
        merit_awarded: 0,
        is_verified: false,
        akademik_pencapaian_id: it.akademik_pencapaian_id || null,
        source: it.source || 'MANUAL_UPLOAD',
      }));

      const { data: itemsRows, error: itErr } = await supabase
        .from('makmp_submission_items')
        .insert(itemsToInsert)
        .select();

      if (itErr) {
        console.error('[MAKMP Multi-Award Items Error]', itErr);
      } else if (itemsRows) {
        createdItems.push(...(itemsRows as MakmpSubmissionItem[]));
      }
    }
  }

  return {
    submission: subData as MakmpSubmission,
    awards: createdAwards,
    items: createdItems,
  };
}

/** Hantar borang permohonan MAKMP klasik (Legacy Single-Category Fallback) */
export async function submitMakmpApplication(params: {
  submission: Omit<MakmpSubmission, 'id' | 'status' | 'total_merit_awarded' | 'created_at' | 'updated_at'>;
  items: Omit<MakmpSubmissionItem, 'id' | 'submission_id' | 'is_verified' | 'created_at'>[];
}): Promise<{ submission: MakmpSubmission; items: MakmpSubmissionItem[] }> {
  const { data: subData, error: subErr } = await supabase
    .from('makmp_submissions')
    .insert([
      {
        tracking_code: params.submission.tracking_code,
        edition_id: params.submission.edition_id,
        category_id: params.submission.category_id || null,
        user_id: params.submission.user_id || null,
        has_portal_account: params.submission.has_portal_account || false,
        full_name: params.submission.full_name,
        matric_no: params.submission.matric_no.toUpperCase().trim(),
        email: params.submission.email || null,
        phone: params.submission.phone.trim(),
        department: params.submission.department,
        programme_code: params.submission.programme_code || null,
        semester: params.submission.semester || null,
        status: 'MENUNGGU',
        total_merit_awarded: 0,
      },
    ])
    .select()
    .single();

  if (subErr || !subData) {
    throw new Error(`Gagal menyimpan permohonan: ${subErr?.message || 'Ralat tidak diketahui'}`);
  }

  if (params.items.length > 0) {
    const itemsToInsert = params.items.map((item) => ({
      submission_id: subData.id,
      nama_pencapaian: item.nama_pencapaian,
      document_type: item.document_type || 'SIJIL',
      peringkat: item.peringkat,
      pencapaian_type: item.pencapaian_type,
      penganjur: item.penganjur || null,
      tarikh: item.tarikh || null,
      drive_view_url: item.drive_view_url,
      drive_download_url: item.drive_download_url || null,
      drive_file_id: item.drive_file_id || null,
      merit_suggested: item.merit_suggested || 0,
      merit_awarded: item.merit_awarded || 0,
      is_verified: false,
    }));

    const { data: insertedItems, error: itemsErr } = await supabase
      .from('makmp_submission_items')
      .insert(itemsToInsert)
      .select();

    if (itemsErr) {
      console.error('[MAKMP Items Error]', itemsErr);
    }

    return {
      submission: subData,
      items: (insertedItems || []) as MakmpSubmissionItem[],
    };
  }

  return { submission: subData, items: [] };
}

/** Semak status penyerahan menggunakan Tracking Code (Menyokong Berbilang Anugerah) */
export async function fetchSubmissionByTrackingCode(code: string): Promise<MakmpSubmission | null> {
  const cleanCode = code.trim().toUpperCase();

  const { data, error } = await supabase
    .from('makmp_submissions')
    .select(`
      *,
      category:makmp_categories(*),
      edition:makmp_editions(*),
      items:makmp_submission_items(*),
      awards:makmp_submission_awards(
        *,
        award:makmp_award_definitions(*),
        items:makmp_submission_items(*)
      )
    `)
    .eq('tracking_code', cleanCode)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as MakmpSubmission;
}

/** Sahkan Kod PIN Juri MAKMP */
export async function verifyJuryPin(pinCode: string): Promise<{
  isValid: boolean;
  pinData: MakmpJuryPin | null;
  edition: MakmpEdition | null;
  message?: string;
}> {
  const cleanPin = pinCode.trim();

  const { data: pin, error: pinErr } = await supabase
    .from('makmp_jury_pins')
    .select('*')
    .eq('pin_code', cleanPin)
    .eq('is_active', true)
    .maybeSingle();

  if (pinErr || !pin) {
    return { isValid: false, pinData: null, edition: null, message: 'Kod PIN tidak sah atau telah dinyahaktifkan.' };
  }

  const { data: edition } = await supabase
    .from('makmp_editions')
    .select('*')
    .eq('id', pin.edition_id)
    .maybeSingle();

  return {
    isValid: true,
    pinData: pin,
    edition: edition || null,
  };
}

/** Dapatkan senarai permohonan anugerah untuk semakan Juri (Multi-Award Review Queue) */
export async function fetchJuryAwardApplications(
  editionId: string,
  assignedCategories: string[] = []
): Promise<MakmpSubmissionAward[]> {
  const { data, error } = await supabase
    .from('makmp_submission_awards')
    .select(`
      *,
      submission:makmp_submissions(
        id,
        tracking_code,
        edition_id,
        full_name,
        matric_no,
        phone,
        email,
        department,
        programme_code,
        semester,
        has_portal_account,
        user_id
      ),
      award:makmp_award_definitions(*),
      items:makmp_submission_items(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchJuryAwardApplications Error]', error);
    return [];
  }

  let list = (data || []) as MakmpSubmissionAward[];

  // 1. Tapis mengikut editionId jika ada
  if (editionId) {
    list = list.filter((a) => a.submission?.edition_id === editionId);
  }

  // 2. Tapis mengikut assignedCategories jika bukan 'ALL'
  if (assignedCategories.length > 0 && !assignedCategories.includes('ALL')) {
    list = list.filter((a) => {
      const group = (a.award?.category_group || '').trim().toUpperCase();
      const name = (a.award?.name || '').trim().toUpperCase();
      const awardId = (a.award?.id || a.award_id || '').trim().toUpperCase();

      return assignedCategories.some((cat) => {
        const c = cat.trim().toUpperCase();
        // 1. Padanan tepat mengikut nama anugerah rasmi (cth: "Tokoh Keusahawanan Terbaik")
        if (name && c === name) return true;
        // 2. Padanan tepat mengikut ID / Kod anugerah
        if (awardId && c === awardId) return true;
        // 3. Padanan kumpulan kategori (cth: "ANUGERAH KEUSAHAWANAN")
        if (group && (c === group || group.includes(c) || c.includes(group))) return true;

        return false;
      });
    });
  }

  return list;
}

/** Dapatkan senarai submission klasik untuk semakan Juri */
export async function fetchJurySubmissions(editionId: string, assignedCategories: string[] = []): Promise<MakmpSubmission[]> {
  let query = supabase
    .from('makmp_submissions')
    .select(`
      *,
      category:makmp_categories(*),
      items:makmp_submission_items(*),
      awards:makmp_submission_awards(
        *,
        award:makmp_award_definitions(*),
        items:makmp_submission_items(*)
      )
    `)
    .eq('edition_id', editionId)
    .order('created_at', { ascending: false });

  if (assignedCategories.length > 0 && !assignedCategories.includes('ALL')) {
    query = query.in('category_id', assignedCategories);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[fetchJurySubmissions Error]', error);
    return [];
  }

  return (data || []) as MakmpSubmission[];
}

/** Simpan semakan Juri ke atas sesuatu permohonan anugerah khusus (Multi-Award Review) */
export async function saveJuryAwardReview(params: {
  awardApplicationId: string;
  submissionId: string;
  pinId?: string;
  reviewerUserId?: string;
  status: MakmpSubmissionStatus;
  reviewNotes?: string;
  rejectionReason?: string;
  items: { id: string; merit_awarded: number; is_verified: boolean }[];
}): Promise<{ success: boolean; message?: string }> {
  // 1. Kemaskini item-item sijil / dokumen bagi anugerah ini
  let totalMeritForAward = 0;
  for (const item of params.items) {
    const merit = params.status === 'DISAHKAN' ? Math.max(0, item.merit_awarded) : 0;
    totalMeritForAward += merit;

    await supabase
      .from('makmp_submission_items')
      .update({
        merit_awarded: merit,
        is_verified: params.status === 'DISAHKAN',
      })
      .eq('id', item.id);
  }

  // 2. Kemaskini status permohonan anugerah khusus (makmp_submission_awards)
  const { error: awErr } = await supabase
    .from('makmp_submission_awards')
    .update({
      status: params.status,
      total_merit_granted: totalMeritForAward,
      reviewed_by_pin_id: params.pinId || null,
      reviewed_at: new Date().toISOString(),
      review_notes: params.reviewNotes || null,
      rejection_reason: params.status === 'DITOLAK' ? params.rejectionReason : null,
    })
    .eq('id', params.awardApplicationId);

  if (awErr) {
    return { success: false, message: awErr.message };
  }

  // 3. Kemaskini status submission induk jika relevan
  // Ambil semua anugerah bagi submission ini untuk kira status aggregate
  const { data: allAwards } = await supabase
    .from('makmp_submission_awards')
    .select('status, total_merit_granted')
    .eq('submission_id', params.submissionId);

  if (allAwards && allAwards.length > 0) {
    const hasAnyPending = allAwards.some((a) => a.status === 'MENUNGGU' || a.status === 'DALAM_SEMAKAN');
    const allApproved = allAwards.every((a) => a.status === 'DISAHKAN');
    const allRejected = allAwards.every((a) => a.status === 'DITOLAK');
    const sumMerit = allAwards.reduce((acc, curr) => acc + (Number(curr.total_merit_granted) || 0), 0);

    let masterStatus: MakmpSubmissionStatus = 'DALAM_SEMAKAN';
    if (!hasAnyPending) {
      if (allApproved) masterStatus = 'DISAHKAN';
      else if (allRejected) masterStatus = 'DITOLAK';
      else masterStatus = 'DISAHKAN'; // Sekurang-kurangnya satu lulus
    }

    const { error: masterErr } = await supabase
      .from('makmp_submissions')
      .update({
        status: masterStatus,
        total_merit_awarded: sumMerit,
        reviewer_pin_id: params.pinId || null,
        reviewed_by: params.reviewerUserId || null,
        reviewed_at: new Date().toISOString(),
        rejection_reason: masterStatus === 'DITOLAK' ? params.rejectionReason : null,
        review_notes: params.reviewNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.submissionId);

    if (masterErr) {
      console.error('[Master Submission Update Error]', masterErr);
    }
  }

  // 4. Jika anugerah DISAHKAN, sync ke akademik & merit
  if (params.status === 'DISAHKAN') {
    try {
      await supabase.rpc('sync_makmp_submission_to_akademik', {
        p_submission_id: params.submissionId,
        p_reviewer_user_id: params.reviewerUserId || null,
      });
    } catch (e) {
      console.warn('[Sync to Akademik RPC Warning]', e);
    }
  }

  return { success: true };
}

/** Simpan semakan Juri klasik ke atas submission */
export async function saveJuryReview(params: {
  submissionId: string;
  pinId?: string;
  reviewerUserId?: string;
  status: MakmpSubmissionStatus;
  reviewNotes?: string;
  rejectionReason?: string;
  items: { id: string; merit_awarded: number; is_verified: boolean }[];
}): Promise<{ success: boolean; message?: string }> {
  let totalMerit = 0;
  for (const item of params.items) {
    const merit = params.status === 'DISAHKAN' ? Math.max(0, item.merit_awarded) : 0;
    totalMerit += merit;

    await supabase
      .from('makmp_submission_items')
      .update({
        merit_awarded: merit,
        is_verified: params.status === 'DISAHKAN',
      })
      .eq('id', item.id);
  }

  const { error: subErr } = await supabase
    .from('makmp_submissions')
    .update({
      status: params.status,
      total_merit_awarded: totalMerit,
      reviewer_pin_id: params.pinId || null,
      reviewed_by: params.reviewerUserId || null,
      reviewed_at: new Date().toISOString(),
      review_notes: params.reviewNotes || null,
      rejection_reason: params.status === 'DITOLAK' ? params.rejectionReason : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.submissionId);

  if (subErr) {
    return { success: false, message: subErr.message };
  }

  if (params.status === 'DISAHKAN') {
    try {
      await supabase.rpc('sync_makmp_submission_to_akademik', {
        p_submission_id: params.submissionId,
        p_reviewer_user_id: params.reviewerUserId || null,
      });
    } catch (e) {
      console.warn('[Sync to Akademik RPC Warning]', e);
    }
  }

  return { success: true };
}

/** Ambil senarai sijil pelajar dari pangkalan data e-Akademik (akademik_pencapaian) */
export async function fetchStudentAkademikCertificates(params: {
  userId?: string;
  matricNo?: string;
  editionYear?: number;
}): Promise<AkademikImportCertItem[]> {
  try {
    let targetUserId = params.userId;

    // Jika tiada userId tapi ada matricNo, cari profiles.id
    if (!targetUserId && params.matricNo) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .ilike('matric_no', params.matricNo.trim())
        .maybeSingle();

      if (prof?.id) {
        targetUserId = prof.id;
      }
    }

    if (!targetUserId) return [];

    // Ambil sijil-sijil pelajar
    const { data, error } = await supabase
      .from('akademik_pencapaian')
      .select('id, user_id, nama_pencapaian, jenis, peringkat, penganjur, tarikh, drive_view_url, drive_download_url, drive_file_id, status, merit_auto, merit_override, created_at')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('[fetchStudentAkademikCertificates Error]', error);
      return [];
    }

    const rawList = data as AkademikImportCertItem[];
    if (params.editionYear) {
      return rawList.filter((item) => {
        const itemYear = item.tarikh
          ? new Date(item.tarikh).getFullYear()
          : new Date(item.created_at).getFullYear();
        return itemYear === params.editionYear;
      });
    }

    return rawList;
  } catch (err) {
    console.error('[fetchStudentAkademikCertificates Exception]', err);
    return [];
  }
}

