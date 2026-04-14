// ============================================================
// JPP Digital Portal — Exco Module Config
// ============================================================
// Setiap exco ada ID, nama, warna tandatangan, route dan status.
// Warna DEFAULT ada di sini, tetapi ia boleh ditindih secara
// dinamik dari jadual `portal_settings` dalam Supabase supaya
// pengurusan JPP setiap tahun boleh tukar warna sendiri.
// ============================================================

export type ExcoModule = {
  id: string;
  name: string;
  fullName: string;
  tagline: string;
  description: string;
  defaultColor: string;   // Hex fallback jika tiada setting dalam DB
  icon: string;           // Emoji ikon untuk kad Portal
  basePath: string;       // Landing route selepas masuk modul
  isActive: boolean;      // false = "Akan Datang" (tidak boleh diklik)
};

// Senarai semua modul exco JPP.
// Untuk tambah exco baru: masukkan entry baru di sini dengan isActive: false,
// kemudian tukar kepada true bila modul siap dibina.
export const EXCO_MODULES: ExcoModule[] = [
  {
    id: 'ekpp',
    name: 'e-KPP',
    fullName: 'Exco Kelab, Persatuan & Perpaduan',
    tagline: 'Kelab · Persatuan · Perpaduan',
    description: 'Pengurusan kelab, aktiviti, laporan bulanan & kertas kerja secara digital.',
    defaultColor: '#F87171',  // Merah terang untuk kontras dalam dark-mode (Red-400)
    icon: 'Landmark',
    basePath: '/dashboard',   // Route e-KPP KEKAL tanpa prefix (konvensyen sedia ada)
    isActive: true,
  },
  {
    id: 'kebajikan',
    name: 'e-Kebajikan',
    fullName: 'Exco Kebajikan Pelajar',
    tagline: 'Khidmat · Bantuan · Kesejahteraan',
    description: 'Pengurusan bantuan pelajar, program kebajikan & khidmat masyarakat.',
    defaultColor: '#2DD4BF',  // Teal cerah (Teal-400)
    icon: 'HeartHandshake',
    basePath: '/kebajikan/dashboard',
    isActive: false,          // Akan Datang
  },
  {
    id: 'keusahawanan',
    name: 'e-Keusahawanan',
    fullName: 'Exco Keusahawanan & Inovasi',
    tagline: 'Inovasi · Usaha · Kejayaan',
    description: 'Program keusahawanan, geran, pameran & pembangunan bakat pelajar.',
    defaultColor: '#4ADE80',  // Hijau terang cergas (Green-400)
    icon: 'Lightbulb',
    basePath: '/keusahawanan/dashboard',
    isActive: false,          // Akan Datang
  },
  {
    id: 'akademik',
    name: 'e-Akademik',
    fullName: 'Exco Akademik & Pembangunan Intelek',
    tagline: 'Ilmu · Pencapaian · Kecemerlangan',
    description: 'Portal akademik pelajar — rekod pencapaian, sijil, CGPA & merit secara digital.',
    defaultColor: '#818CF8',  // Indigo terang premium (Indigo-400)
    icon: 'GraduationCap',
    basePath: '/akademik',
    isActive: true,
  },
];

// ============================================================
// Context warna aktif — dikemaskini dari Supabase portal_settings
// ============================================================

// Jenis untuk rekod warna yang disimpan dalam DB
export type ExcoColorSetting = {
  exco_module: string;  // ID exco (contoh: 'ekpp')
  color: string;        // Warna hex yang dipilih oleh JPP
  is_enabled: boolean;  // Sama ada modul ini dibolehkan untuk semua pengguna
  updated_by?: string;  // user_id pengurus yang buat perubahan
  updated_at?: string;
};

// Ambil warna aktif untuk exco tertentu.
// Utamakan warna dari DB, jatuh ke defaultColor jika tiada.
export function getExcoColor(
  moduleId: string,
  settings: ExcoColorSetting[]
): string {
  const live = settings.find(s => s.exco_module === moduleId);
  if (live?.color) return live.color;
  const mod = EXCO_MODULES.find(m => m.id === moduleId);
  return mod?.defaultColor ?? '#7B1C1C';
}

// Ambil objek ExcoModule berdasarkan ID
export function getExcoModule(moduleId: string): ExcoModule | undefined {
  return EXCO_MODULES.find(m => m.id === moduleId);
}
