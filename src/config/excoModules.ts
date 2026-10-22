// ============================================================
// JPP Digital Portal — Exco Module Config
// ============================================================
// Setiap exco ada ID, nama, warna tandatangan, route dan status.
// Warna DEFAULT ada di sini, tetapi ia boleh ditindih secara
// dinamik dari jadual portal_settings dalam Supabase supaya
// pengurusan JPP setiap tahun boleh tukar warna sendiri.
// ============================================================

import i18n from '@/lib/i18n';

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

export function getLocalizedExcoModules(t: (key: string, fallback: string) => string = (k, f) => i18n.t(k, f)): ExcoModule[] {
  return [
    {
      id: 'ekpp',
      name: t('portal:module_ekpp_title', 'Sistem Kelab'),
      fullName: t('portal:module_ekpp_fullname', 'Exco Kelab, Persatuan & Perpaduan'),
      tagline: t('portal:module_ekpp_tagline', 'Kelab · Persatuan · Perpaduan'),
      description: t('portal:module_ekpp_desc', 'Pengurusan kelab, aktiviti, laporan bulanan & kertas kerja secara digital.'),
      defaultColor: '#F87171',  // Merah terang untuk kontras dalam dark-mode (Red-400)
      icon: 'Landmark',
      basePath: '/dashboard',   // Route Sistem Kelab KEKAL tanpa prefix (konvensyen sedia ada)
      isActive: true,
    },
    {
      id: 'kebajikan',
      name: t('portal:module_kebajikan_title', 'e-Kebajikan'),
      fullName: t('portal:module_kebajikan_fullname', 'Exco Kebajikan Pelajar'),
      tagline: t('portal:module_kebajikan_tagline', 'Khidmat · Bantuan · Kesejahteraan'),
      description: t('portal:module_kebajikan_desc', 'Pengurusan bantuan pelajar, program kebajikan & khidmat masyarakat.'),
      defaultColor: '#2DD4BF',  // Teal cerah (Teal-400)
      icon: 'HeartHandshake',
      basePath: '/kebajikan/buat-aduan', // Redirect pelajar ke form aduan; Exco pergi ke /kebajikan
      isActive: true,                    // Sistem sekarang aktif!
    },
    {
      id: 'keusahawanan',
      name: t('portal:module_keusahawanan_title', 'e-Keusahawanan'),
      fullName: t('portal:module_keusahawanan_fullname', 'Exco Keusahawanan & Inovasi'),
      tagline: t('portal:module_keusahawanan_tagline', 'Inovasi · Usaha · Kejayaan'),
      description: t('portal:module_keusahawanan_desc', 'Program keusahawanan, geran, pameran & pembangunan bakat pelajar.'),
      defaultColor: '#4ADE80',
      icon: 'Lightbulb',
      basePath: '/keusahawanan/dashboard',
      isActive: false,
    },
    {
      id: 'akademik',
      name: t('portal:module_akademik_title', 'e-Akademik'),
      fullName: t('portal:module_akademik_fullname', 'Exco Akademik & Pembangunan Intelek'),
      tagline: t('portal:module_akademik_tagline', 'Ilmu · Pencapaian · Kecemerlangan'),
      description: t('portal:module_akademik_desc', 'Portal akademik pelajar — rekod pencapaian, sijil, CGPA & merit secara digital.'),
      defaultColor: '#818CF8',
      icon: 'GraduationCap',
      basePath: '/akademik',
      isActive: true,
    },
    {
      id: 'ems',
      name: t('portal:module_ems_title', 'EMS'),
      fullName: t('portal:module_ems_fullname', 'Event Management System'),
      tagline: t('portal:module_ems_tagline', 'Acara · Penjurian · Sijil'),
      description: t('portal:module_ems_desc', 'Pengurusan acara politeknik, pendaftaran QR, juri luar & live leaderboard.'),
      defaultColor: '#EC4899',
      icon: 'CalendarDays',
      basePath: '/ems/dashboard',
      isActive: true,
    },
  ];
}

// Senarai semua modul exco JPP (dinamik dengan Proxy untuk sokongan i18n dwibahasa)
export const EXCO_MODULES: ExcoModule[] = new Proxy([] as ExcoModule[], {
  get(_target, prop) {
    const live = getLocalizedExcoModules();
    const val = Reflect.get(live, prop);
    return typeof val === 'function' ? val.bind(live) : val;
  },
  has(_target, prop) {
    const live = getLocalizedExcoModules();
    return Reflect.has(live, prop);
  },
  ownKeys() {
    const live = getLocalizedExcoModules();
    return Reflect.ownKeys(live);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const live = getLocalizedExcoModules();
    return Reflect.getOwnPropertyDescriptor(live, prop);
  }
});

// ============================================================
// Context warna aktif — dikemaskini dari Supabase portal_settings
// ============================================================

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

// Ambil objek ExcoModule berdasarkan ID (menyokong t function)
export function getExcoModule(moduleId: string, t?: (key: string, fallback: string) => string): ExcoModule | undefined {
  const modules = t ? getLocalizedExcoModules(t) : getLocalizedExcoModules();
  return modules.find(m => m.id === moduleId);
}
