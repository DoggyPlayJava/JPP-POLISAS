// ============================================================
// JPP POLISAS — Core Types (matches Supabase DB schema)
// ============================================================

export type UserRole = 'SUPER_ADMIN_JPP' | 'CLUB_ADVISOR' | 'CLUB_PRESIDENT' | 'CLUB_MT' | 'CLUB_MEMBER';
export type ActivityStatus = 'perancangan' | 'aktif' | 'selesai' | 'ditangguh';
export type ActivityPriority = 'rendah' | 'sederhana' | 'tinggi';
export type ReportStatus = 'Menunggu' | 'Dalam Semakan' | 'Diluluskan' | 'Ditolak';
export type ReportType = 'Aktiviti' | 'Kewangan';

export interface Club {
  id: string;
  name: string;
  shortName: string;
  category: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

// Matches both old Blink DB schema (camelCase) and Supabase profiles (snake_case)
export interface ClubMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  clubId: string;
  phone?: string;
  matricNo?: string;
  avatarUrl?: string;
  isActive: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  club?: Club;
}

export interface ClubActivity {
  id: string;
  clubId: string;
  title: string;
  description?: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  startDate?: string;
  endDate?: string;
  venue?: string;
  budget: number;
  assigneeId?: string;
  createdBy: string;
  userId: string; // Merujuk kepada user_id dalam database untuk RLS
  createdAt: string;
  updatedAt: string;
  assignee?: ClubMember;
  tindakan?: string;      // Untuk kolum TINDAKAN
  image_urls?: string[];  // Untuk LAMPIRAN gambar
}

export interface ClubLog {
  id: string;
  clubId: string;
  userId: string;
  type: string;
  content: string;
  entityId?: string;
  entityType?: string;
  createdAt: string;
}

export interface ClubReport {
  id: string;
  clubId: string;
  userId: string;
  title: string;
  type: ReportType;
  fileUrl: string;
  fileName: string;
  status: ReportStatus;
  adminFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------
// UI helpers
// -------------------------------------------------------
export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN_JPP: 'Super Admin JPP',
  CLUB_ADVISOR:    'Penasihat Kelab',
  CLUB_PRESIDENT:  'Presiden',
  CLUB_MT:         'MT Kelab',
  CLUB_MEMBER:     'Ahli',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN_JPP: 'bg-rose-100 text-rose-700',
  CLUB_ADVISOR:    'bg-indigo-100 text-indigo-700',
  CLUB_PRESIDENT:  'bg-amber-100 text-amber-700',
  CLUB_MT:         'bg-blue-100 text-blue-700',
  CLUB_MEMBER:     'bg-slate-100 text-slate-600',
};

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  perancangan: 'Perancangan',
  aktif:       'Aktif',
  selesai:     'Selesai',
  ditangguh:   'Ditangguh',
};

export const STATUS_COLORS: Record<ActivityStatus, string> = {
  perancangan: 'bg-blue-100 text-blue-700',
  aktif:       'bg-emerald-100 text-emerald-700',
  selesai:     'bg-slate-100 text-slate-600',
  ditangguh:   'bg-orange-100 text-orange-700',
};

export const PRIORITY_LABELS: Record<ActivityPriority, string> = {
  rendah:    'Rendah',
  sederhana: 'Sederhana',
  tinggi:    'Tinggi',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  'Menunggu':      'Menunggu',
  'Dalam Semakan': 'Dalam Semakan',
  'Diluluskan':    'Diluluskan',
  'Ditolak':       'Ditolak',
};

export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  'Menunggu':      'bg-yellow-100 text-yellow-700',
  'Dalam Semakan': 'bg-blue-100 text-blue-700',
  'Diluluskan':    'bg-emerald-100 text-emerald-700',
  'Ditolak':       'bg-red-100 text-red-700',
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  'Aktiviti':  'Laporan Aktiviti',
  'Kewangan':  'Laporan Kewangan',
};

// Static list — IDs match Supabase clubs.id exactly
export let ALL_CLUBS: {
  id: string;
  name: string;
  shortName: string;
  category: string;
  color: string;
  logo_url?: string;
  description?: string;
}[] = [];

// Fungsi pembantu untuk mengemaskini senarai kelab secara global
export const setGlobalClubs = (clubs: any[]) => {
  ALL_CLUBS = clubs.map(c => ({
    id: c.id,
    name: c.name,
    shortName: c.short_name,
    category: c.category,
    color: c.theme_color,
    logo_url: c.logo_url,
    description: c.description
  }));
};

// -------------------------------------------------------
// Jabatan (Department) → Kelab Akademik Mapping
// -------------------------------------------------------
export const JABATAN_LIST = [
  { value: 'perdagangan', label: 'Jabatan Perdagangan (Commerce)' },
  { value: 'mekanikal',   label: 'Jabatan Kejuruteraan Mekanikal (MESS)' },
  { value: 'makanan',     label: 'Jabatan Teknologi Makanan (Ketema)' },
  { value: 'elektrik',    label: 'Jabatan Kejuruteraan Elektrik (Elektron)' },
  { value: 'awam',        label: 'Jabatan Kejuruteraan Awam (PePKa)' },
  { value: 'geomatik',    label: 'Kursus Geomatik — Jabatan Kej. Awam (GEOSAS)' },
] as const;

export type JabatanValue = typeof JABATAN_LIST[number]['value'];

// Mapping jabatan → kata kunci kelab (short_name). Mengelakkan ralat UUID Statik
// GEOSAS boleh join sendiri dari KelabPage — tiada auto-assign
export const JABATAN_SEARCH_TERMS: Record<JabatanValue, string> = {
  perdagangan: 'Commerce',
  mekanikal:   'MESS',
  makanan:     'Ketema',
  elektrik:    'Elektron',
  awam:        'PePKa',
  geomatik:    'GEOSAS',
};

// Fungsi pembantu untuk mencari ID kelab yang sah pada masa nyata (runtime)
export const getAkademikClubId = (jabatan: JabatanValue): string | null => {
  if (jabatan === 'geomatik') return null; // Geomatik kena manual
  const keyword = JABATAN_SEARCH_TERMS[jabatan];
  if (!keyword) return null;
  
  const club = ALL_CLUBS.find(c => 
    c.shortName?.toLowerCase().includes(keyword.toLowerCase()) ||
    c.name.toLowerCase().includes(keyword.toLowerCase())
  );
  return club?.id || null;
};

// Kategori kelab yang BOLEH diapply oleh pelajar dari KelabPage
// (padanan tepat dengan nilai dalam kolum 'category' di Supabase)
export const JOINABLE_CATEGORIES = ['UMUM', 'SUKAN', 'Umum', 'Sukan'];
// Kategori auto-assign (tidak muncul dalam apply list)
export const AUTO_ASSIGN_CATEGORIES = ['AKADEMIK', 'Akademik', 'akademik'];
// Kategori terhad — tidak boleh diapply langsung
export const RESTRICTED_CATEGORIES  = ['Badan Beruniform', 'BADAN BERUNIFORM'];