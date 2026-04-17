// ============================================================
// JPP POLISAS — Core Types (matches Supabase DB schema)
// ============================================================

export type UserRole = 'SUPER_ADMIN_JPP' | 'JPP' | 'CLUB_ADVISOR' | 'CLUB_PRESIDENT' | 'CLUB_MT' | 'CLUB_MEMBER' | 'STAFF';
// SUPER_ADMIN_JPP = Pentadbir Mutlak (akses penuh ke semua sistem)
// JPP             = Ahli Jawatankuasa Perwakilan Pelajar (akses modul exco berkenaan)
// CLUB_ADVISOR    = Penasihat Kelab
// CLUB_PRESIDENT  = Presiden Kelab
// CLUB_MT         = Ahli Jawatankuasa Kelab
// CLUB_MEMBER     = Ahli Biasa

// ─── JPP Hierarchy Types ──────────────────────────────────────────────────────

/** Jawatan dalam Majlis Tertinggi (MT) JPP atau Exco JPP */
export type JppPosition =
  // Majlis Tertinggi (MT)
  | 'YDP'                  // Yang Di-pertua
  | 'TIMBALAN_YDP'         // Timbalan Yang Di-pertua
  | 'NAIB_YDP'             // Naib Yang Di-pertua
  | 'SETIAUSAHA_KERJA'     // Setiausaha Kerja
  | 'SETIAUSAHA_KEHORMAT'  // Setiausaha Kehormat
  | 'BENDAHARI'            // Bendahari
  // Exco
  | 'KETUA_EXCO'           // Ketua Exco (ketua sesuatu unit exco)
  | 'TIMBALAN_EXCO'        // Timbalan Ketua Exco
  | 'EXCO_BIASA';          // Ahli Exco biasa

/** Unit exco dalam JPP — nilai mestilah sama dengan jpp_exco_units.code dalam DB */
export type JppUnit =
  | 'KEUSAHAWANAN'  // Exco Keusahawanan
  | 'KPP'           // Exco Kelab, Persatuan & Perpaduan
  | 'KK'            // Exco Kediaman dan Kerohanian ← GUNAKAN INI, bukan 'KEDIAMAN'
  | 'KLS'           // Exco Kediaman Luar Kampus
  | 'AKADEMIK'      // Exco Akademik dan Pembangunan Mahasiswa
  | 'KEBAJIKAN'     // Exco Kebajikan dan Pengaduan Awam
  | 'MULTIMEDIA'    // Exco Multimedia, Informasi dan Perhubungan Awam
  | 'KOLAB'         // Exco Kolaborasi dan Kesukarelawanan
  | 'SRK'           // Exco Sukan, Rekreasi dan Kebudayaan
  | string;         // Untuk unit tambahan masa hadapan

/** Label display untuk JppPosition */
export const JPP_POSITION_LABELS: Record<JppPosition, string> = {
  YDP:                 'Yang Di-pertua',
  TIMBALAN_YDP:        'Timbalan Yang Di-pertua',
  NAIB_YDP:            'Naib Yang Di-pertua',
  SETIAUSAHA_KERJA:    'Setiausaha Kerja',
  SETIAUSAHA_KEHORMAT: 'Setiausaha Kehormat',
  BENDAHARI:           'Bendahari',
  KETUA_EXCO:          'Ketua Exco',
  TIMBALAN_EXCO:       'Timbalan Exco',
  EXCO_BIASA:          'Ahli Exco',
};

/** Label display untuk JppUnit (fallback — data sebenar dari jpp_exco_units table) */
export const JPP_UNIT_LABELS: Record<string, string> = {
  KEUSAHAWANAN: 'Exco Keusahawanan',
  KPP:          'Exco Kelab, Persatuan dan Perpaduan',
  KK:           'Exco Kediaman dan Kerohanian',
  AKADEMIK:     'Exco Akademik dan Pembangunan Mahasiswa',
  KEBAJIKAN:    'Exco Kebajikan dan Pengaduan Awam',
  MULTIMEDIA:   'Exco Multimedia, Informasi dan Perhubungan Awam',
  KLS:          'Exco Kediaman Luar Kampus',
  KOLAB:        'Exco Kolaborasi dan Kesukarelawanan',
  SRK:          'Exco Sukan, Rekreasi dan Kebudayaan',
};

/** Unit-unit exco (fallback — data sebenar dari jpp_exco_units table) */
export const JPP_UNITS: JppUnit[] = [
  'KEUSAHAWANAN','KPP','KK','AKADEMIK','KEBAJIKAN','MULTIMEDIA','KLS','KOLAB','SRK',
];

/** Jawatan MT (tiada unit spesifik) */
export const JPP_MT_POSITIONS: JppPosition[] = [
  'YDP','TIMBALAN_YDP','NAIB_YDP',
  'SETIAUSAHA_KERJA','SETIAUSAHA_KEHORMAT','BENDAHARI',
];

/** Jawatan Exco (perlu unit) */
export const JPP_EXCO_POSITIONS: JppPosition[] = [
  'KETUA_EXCO','TIMBALAN_EXCO','EXCO_BIASA',
];

/** Rekod satu unit exco dari database jpp_exco_units */
export interface JppExcoUnit {
  id:         string;
  code:       string;   // Identifier unik: 'KPP', 'SRK', dll.
  name:       string;   // Nama penuh
  short_name: string;   // Nama pendek untuk badge
  color:      string;   // Hex color
  is_active:  boolean;
  sort_order: number;
  created_at: string;
}

/** Rekod tugasan MT → unit exco */
export interface JppMtAssignment {
  id:          string;
  mt_user_id:  string;
  unit:        JppUnit;
  assigned_by: string | null;
  assigned_at: string;
}

// ─── Gerai Types ──────────────────────────────────────────────────────────────

export type BusinessShiftStatus = 'SCHEDULED' | 'PRESENT' | 'ABSENT' | 'SWAPPED';
export type BusinessSwapStatus  = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
export type BusinessSessionStatus = 'OPEN' | 'CLOSED';

export interface BusinessShift {
  id:          string;
  shift_date:  string;
  shift_hour:  number;       // 8–16 (mewakili 08:00–09:00 hingga 16:00–17:00)
  assigned_to: string | null;
  created_by:  string | null;
  notes:       string | null;
  status:      BusinessShiftStatus;
  created_at:  string;
  // Joined
  assignee?:   { id: string; full_name: string; avatar_url?: string };
}

export interface BusinessShiftSwap {
  id:           string;
  shift_id:     string;
  requested_by: string;
  swap_with:    string | null;
  reason:       string;
  status:       BusinessSwapStatus;
  responded_by: string | null;
  responded_at: string | null;
  created_at:   string;
}

export interface BusinessSession {
  id:             string;
  session_date:   string;
  opened_by:      string | null;
  closed_by:      string | null;
  opening_cash:   number;
  closing_cash:   number | null;
  total_sales:    number | null;
  total_expenses: number;
  opening_time:   string | null;
  closing_time:   string | null;
  opening_notes:  string | null;
  closing_notes:  string | null;
  status:         BusinessSessionStatus;
  created_at:     string;
  // Computed
  net_profit?:    number | null;
  opener?:        { full_name: string };
  closer?:        { full_name: string };
}

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
  JPP:             'Ahli JPP',
  CLUB_ADVISOR:    'Penasihat Kelab',
  CLUB_PRESIDENT:  'Presiden',
  CLUB_MT:         'MT Kelab',
  CLUB_MEMBER:     'Ahli',
  STAFF:           'Staf Umum',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN_JPP: 'bg-rose-100 text-rose-700',
  JPP:             'bg-orange-100 text-orange-700',
  CLUB_ADVISOR:    'bg-indigo-100 text-indigo-700',
  CLUB_PRESIDENT:  'bg-amber-100 text-amber-700',
  CLUB_MT:         'bg-blue-100 text-blue-700',
  CLUB_MEMBER:     'bg-slate-100 text-slate-600',
  STAFF:           'bg-emerald-100 text-emerald-700',
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
  'Aktiviti':  'Laporan Bulanan',
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
  { value: 'perdagangan', label: 'Jabatan Perdagangan (JP)' },
  { value: 'mekanikal',   label: 'Jabatan Kejuruteraan Mekanikal (JKM)' },
  { value: 'makanan',     label: 'Jabatan Teknologi Makanan (JTM)' },
  { value: 'elektrik',    label: 'Jabatan Kejuruteraan Elektrik (JKE)' },
  { value: 'awam',        label: 'Jabatan Kejuruteraan Awam (JKA)' },
  { value: 'ftv',         label: 'Asasi Teknologi Kejuruteraan (FTV)' },
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
  ftv:         '', // FTV tiada kelab akademik automatik
};

// Fungsi pembantu untuk mencari ID kelab yang sah pada masa nyata (runtime)
export const getAkademikClubId = (jabatan: JabatanValue): string | null => {
  const keyword = JABATAN_SEARCH_TERMS[jabatan];
  if (!keyword) return null;
  
  const club = ALL_CLUBS.find(c => 
    c.shortName?.toLowerCase().includes(keyword.toLowerCase()) ||
    c.name.toLowerCase().includes(keyword.toLowerCase())
  );
  return club?.id || null;
};

// ─── Sistem Kohort Pelajar POLISAS ───────────────────────────────────────────

/** Pemetaan Jabatan → Senarai Program Pengajian */
export const JABATAN_PROGRAMMES: Record<JabatanValue, { code: string; label: string }[]> = {
  elektrik: [
    { code: 'DEE', label: 'Diploma Elektrik dan Elektronik — DEE' },
    { code: 'DTK', label: 'Diploma Elektronik (Komputer) — DTK' },
    { code: 'DEP', label: 'Diploma Elektronik (Komunikasi) — DEP' },
  ],
  mekanikal: [
    { code: 'DAD', label: 'Diploma Kejuruteraan Mekanikal (Automotif) — DAD' },
    { code: 'DKM', label: 'Diploma Kejuruteraan Mekanikal — DKM' },
  ],
  awam: [
    { code: 'DSB', label: 'Diploma Senibina — DSB' },
    { code: 'DKA', label: 'Diploma Kejuruteraan Awam — DKA' },
    { code: 'DGU', label: 'Diploma Geomatik — DGU' },
  ],
  makanan: [
    { code: 'DTM', label: 'Diploma Teknologi Makanan — DTM' },
    { code: 'DMH', label: 'Diploma Makanan Halal — DMH' },
  ],
  perdagangan: [
    { code: 'DAT', label: 'Diploma Akauntansi — DAT' },
    { code: 'DSK', label: 'Diploma Sains Kesetiausahaan — DSK' },
    { code: 'DLS', label: 'Diploma Pengurusan Logistik & Rangkaian Bekalan — DLS' },
    { code: 'DBS', label: 'Diploma Sistem Maklumat Perniagaan — DBS' },
  ],
  ftv: [], // FTV tiada sub-program — programme_code auto-set ke 'FTV'
};

/**
 * Mengira semester semasa berdasarkan tahun & sesi pengambilan.
 * @param intakeYear    — Tahun pengambilan (e.g. 2024)
 * @param intakePeriod  — 1 = Intake Pertama (Pertengahan Tahun) | 2 = Intake Kedua (Awal Tahun)
 * @param isFtv         — true jika pelajar Asasi FTV (maks 2 semester)
 * @param startMonth1   — Bulan mula Intake 1 (dari system_settings, lalai 7)
 * @param startMonth2   — Bulan mula Intake 2 (dari system_settings, lalai 1)
 * @param override      — semester_override dari profiles (manual correction)
 */
export const getSemesterInfo = (
  intakeYear: number,
  intakePeriod: 1 | 2,
  isFtv: boolean,
  startMonth1 = 7,
  startMonth2 = 1,
  override?: number | null
): { semester: number; level: 'Junior' | 'Senior' | 'Asasi' } => {
  if (override) {
    const level: 'Junior' | 'Senior' | 'Asasi' = isFtv ? 'Asasi' : override <= 3 ? 'Junior' : 'Senior';
    return { semester: override, level };
  }
  const now = new Date();
  const startMonth = intakePeriod === 1 ? startMonth1 : startMonth2;
  const totalMonths =
    (now.getFullYear() - intakeYear) * 12 + (now.getMonth() + 1 - startMonth);
  const maxSem = isFtv ? 2 : 6;
  const semester = Math.min(Math.max(1, Math.floor(totalMonths / 6) + 1), maxSem);
  const level: 'Junior' | 'Senior' | 'Asasi' = isFtv ? 'Asasi' : semester <= 3 ? 'Junior' : 'Senior';
  return { semester, level };
};

/** Senarai tahun pengambilan yang boleh dipilih (6 tahun ke belakang + tahun semasa) */
export const INTAKE_YEARS = (): number[] => {
  const y = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => y - i);
};

// Kategori kelab yang BOLEH diapply oleh pelajar dari KelabPage
// (padanan tepat dengan nilai dalam kolum 'category' di Supabase)
export const JOINABLE_CATEGORIES = ['UMUM', 'SUKAN', 'Umum', 'Sukan'];
// Kategori auto-assign (tidak muncul dalam apply list)
export const AUTO_ASSIGN_CATEGORIES = ['AKADEMIK', 'Akademik', 'akademik'];
// Kategori terhad — tidak boleh diapply langsung
export const RESTRICTED_CATEGORIES  = ['Badan Beruniform', 'BADAN BERUNIFORM'];

// ─── Keusahawanan Business Types ──────────────────────────────────────────────

export type KeusahawananBusinessStatus = 'PENDING_INTERVIEW' | 'ACTIVE' | 'REJECTED';
export type KeusahawananMembershipRole = 'OWNER' | 'MEMBER';
export type KeusahawananMembershipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

export interface KeusahawananCategory {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface KeusahawananBusiness {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  owner_id: string;
  status: KeusahawananBusinessStatus;
  interview_date: string | null;
  logo_url: string | null;
  is_active: boolean;
  is_shift_enabled: boolean;
  created_at: string;
  // Joined
  category?: KeusahawananCategory;
  owner?: { id: string; full_name: string; avatar_url?: string };
}

export interface StudentBusinessMembership {
  id: string;
  user_id: string;
  business_id: string;
  role: KeusahawananMembershipRole;
  status: KeusahawananMembershipStatus;
  joined_at: string;
  // Joined
  business?: KeusahawananBusiness;
  user?: { id: string; full_name: string; avatar_url?: string };
}

// ─── POS System Types ──────────────────────────────────────────────────────────

export type PosPaymentMethod = 'CASH' | 'QR' | 'TRANSFER';
export type PosDiscountType  = 'FIXED' | 'PERCENT';
export type PosTransactionStatus = 'COMPLETED' | 'VOIDED';
export type PosLogAction =
  | 'TRANSACTION_CREATE' | 'TRANSACTION_VOID'
  | 'PRODUCT_ADD' | 'PRODUCT_EDIT' | 'PRODUCT_DELETE' | 'STOCK_EDIT'
  | 'POS_ASSIGNED' | 'STAFF_APPROVED' | 'STAFF_REMOVED' | 'SETTINGS_UPDATED'
  // Ciri baharu — mesti selari dengan DB enum pos_log_action
  | 'EXPENSE_ADD' | 'EXPENSE_DELETE'
  | 'PROMO_CREATE' | 'PROMO_USED' | 'PROMO_TOGGLE'
  | 'CASH_CHECKPOINT';

export interface CostItem {
  id:                   string;   // local uuid for key
  name:                 string;   // nama bahan (e.g. Gula, Balang Air)
  // Mod kalkulasi: 'measurement' = ratio berat/isipadu, 'yield' = pukal → servis
  calc_mode:            'measurement' | 'yield';
  // === MOD SUKATAN (measurement) ===
  purchase_qty:         number;   // e.g. 1000 (gram yang dibeli)
  purchase_unit:        string;   // e.g. "g"
  total_purchase_cost:  number;   // harga beli keseluruhan (e.g. RM 3.50)
  used_qty:             number;   // e.g. 50g digunakan per produk
  used_unit:            string;   // e.g. "g" (boleh berbeza, dengan konversi)
  // === MOD HASIL (yield) ===
  yield_per_purchase:   number;   // e.g. 25 — 1 balang menghasilkan 25 cawan
  yield_unit:           string;   // e.g. "cawan" — unit servis/hasil
  used_per_product:     number;   // e.g. 1 — berapa unit hasil per produk
  // Auto-kira
  subtotal:             number;
}

export interface BusinessProduct {
  id:                    string;
  business_id:           string;
  name:                  string;
  description:           string | null;
  price:                 number;
  category:              string;
  stock_quantity:        number;
  stock_alert_threshold: number;
  image_url:             string | null;
  is_available:          boolean;
  // Smart Product cost fields
  cost_items:            CostItem[];
  total_cost:            number;
  cost_notes:            string | null;
  created_at:            string;
}

export interface BusinessTransactionItem {
  product_id:  string;
  name:        string;
  qty:         number;
  unit_price:  number;
  total_price: number;
}

export interface BusinessTransaction {
  id:              string;
  business_id:     string;
  invoice_number:  string;
  items:           BusinessTransactionItem[];
  subtotal:        number;
  discount_type:   PosDiscountType | null;
  discount_amount: number;
  discount_note:   string | null;
  total_amount:    number;
  payment_method:  PosPaymentMethod;
  received_amount: number | null;
  change_amount:   number | null;
  customer_name:   string | null;
  customer_note:   string | null;
  served_by:       string | null;
  status:          PosTransactionStatus;
  voided_by:       string | null;
  voided_at:       string | null;
  created_at:      string;
  // Joined
  server?:         { id: string; full_name: string };
  voider?:         { id: string; full_name: string };
}

export interface BusinessPosLog {
  id:             string;
  business_id:    string;
  transaction_id: string | null;
  actor_id:       string | null;
  actor_name:     string | null;
  action_type:    PosLogAction;
  description:    string | null;
  metadata:       Record<string, any>;
  created_at:     string;
}

export interface BusinessPosAssignment {
  id:          string;
  business_id: string;
  user_id:     string;
  assigned_by: string | null;
  valid_date:  string;
  created_at:  string;
  // Joined
  user?:       { id: string; full_name: string; avatar_url?: string };
}

// ─── Ciri Komersial Baharu ──────────────────────────────────────────────────

/** Kategori perbelanjaan operasi */
export type ExpenseCategory = 'Sewa' | 'Bekalan' | 'Pengangkutan' | 'Pemasaran' | 'Lain-lain';

/** Rekod perbelanjaan operasi (bukan kos produk) */
export interface BusinessExpense {
  id:           string;
  business_id:  string;
  amount:       number;
  category:     ExpenseCategory;
  description:  string;
  expense_date: string;
  recorded_by:  string | null;
  created_at:   string;
}

/** Kupon / Kod Promosi untuk perniagaan pelajar */
export interface BusinessPromotion {
  id:             string;
  business_id:    string;
  code:           string;
  name:           string;
  discount_type:  PosDiscountType;
  discount_value: number;
  min_purchase:   number;
  max_uses:       number | null;    // null = unlimited
  uses_count:     number;
  valid_from:     string | null;
  valid_until:    string | null;
  is_active:      boolean;
  created_by:     string | null;
  created_at:     string;
}

/** Checkpoint rekod wang baldi (boleh berbilang sehari) */
export interface BusinessCashCheckpoint {
  id:              string;
  business_id:     string;
  label:           string;          // e.g. 'Buka Pagi', 'Semak 12pm'
  cash_amount:     number;
  note:            string | null;
  recorded_by:     string | null;
  checkpoint_time: string;
  checkpoint_date: string;
  created_at:      string;
}

// ─── Global Announcements Types ──────────────────────────────────────────────

export type AnnouncementPriority = 'EASY' | 'MEDIUM' | 'HIGH';
export type AnnouncementTarget = 'STUDENT' | 'STAFF' | 'ALL';

export interface AnnouncementFormField {
  id: string;
  type: 'text' | 'number' | 'email' | 'select' | 'tel';
  label: string;
  required: boolean;
  options?: string[]; // for select
  placeholder?: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  content_body: string;
  priority: AnnouncementPriority;
  target_audience: AnnouncementTarget;
  action_url: string | null;
  form_schema: AnnouncementFormField[] | null;
  image_url: string | null;
  icon_type: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface UserAnnouncementResponse {
  id: string;
  user_id: string;
  announcement_id: string;
  status: 'dismissed_permanently' | 'completed';
  form_data: Record<string, any> | null;
  created_at: string;
}