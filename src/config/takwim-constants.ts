// ============================================================
// Takwim POLISAS Berpusat — Constants & Jenis Definitions
// ============================================================
import {
  BookOpen, Crown, Landmark, CalendarDays, Lightbulb,
  HeartHandshake, Trophy, Radio, MapPin, Handshake, Moon, Tag, Building2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import i18n from '@/lib/i18n';

const t = (k: string, fb: string): string => {
  if (i18n && typeof i18n.t === 'function' && i18n.isInitialized) {
    return i18n.t(k, { defaultValue: fb });
  }
  return fb;
};

// ── Jenis Takwim ─────────────────────────────────────────────
export interface TakwimJenisConfig {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  /** Exco module code (matches jppConfig UNIT_ORDER) */
  excoModule?: string;
}

export function getTakwimJenis(t: (k: string, fb: string) => string = (k, fb) => (i18n && i18n.isInitialized ? i18n.t(k, { defaultValue: fb }) : fb)): Record<string, TakwimJenisConfig> {
  return {
    AKADEMIK: {
      label: t('jpp:takwim_jenis_akademik_label', 'Kalendar Akademik'),
      shortLabel: t('jpp:takwim_jenis_akademik_short', 'Akademik'),
      color: '#818CF8',
      bgColor: 'rgba(129,140,248,0.12)',
      icon: BookOpen,
      excoModule: 'AKADEMIK',
    },
    JPP: {
      label: t('jpp:takwim_jenis_jpp_label', 'Aktiviti JPP'),
      shortLabel: t('jpp:takwim_jenis_jpp_short', 'JPP'),
      color: '#F87171',
      bgColor: 'rgba(248,113,113,0.12)',
      icon: Crown,
    },
    KPP: {
      label: t('jpp:takwim_jenis_kpp_label', 'Kelab, Persatuan & Perpaduan'),
      shortLabel: t('jpp:takwim_jenis_kpp_short', 'KPP'),
      color: '#F87171',
      bgColor: 'rgba(248,113,113,0.12)',
      icon: Landmark,
      excoModule: 'KPP',
    },
    KEUSAHAWANAN: {
      label: t('jpp:takwim_jenis_keusahawanan_label', 'Keusahawanan & Inovasi'),
      shortLabel: t('jpp:takwim_jenis_keusahawanan_short', 'Keusahawanan'),
      color: '#4ADE80',
      bgColor: 'rgba(74,222,128,0.12)',
      icon: Lightbulb,
      excoModule: 'KEUSAHAWANAN',
    },
    KEBAJIKAN: {
      label: t('jpp:takwim_jenis_kebajikan_label', 'Kebajikan'),
      shortLabel: t('jpp:takwim_jenis_kebajikan_short', 'Kebajikan'),
      color: '#2DD4BF',
      bgColor: 'rgba(45,212,191,0.12)',
      icon: HeartHandshake,
      excoModule: 'KEBAJIKAN',
    },
    SRK: {
      label: t('jpp:takwim_jenis_srk_label', 'Sukan, Rekreasi & Kebudayaan'),
      shortLabel: t('jpp:takwim_jenis_srk_short', 'SRK'),
      color: '#F59E0B',
      bgColor: 'rgba(245,158,11,0.12)',
      icon: Trophy,
      excoModule: 'SRK',
    },
    AKADEMIK_EXCO: {
      label: t('jpp:takwim_jenis_akademik_exco_label', 'Aktiviti Exco Akademik'),
      shortLabel: t('jpp:takwim_jenis_akademik_exco_short', 'Exco Akademik'),
      color: '#A78BFA',
      bgColor: 'rgba(167,139,250,0.12)',
      icon: BookOpen,
      excoModule: 'AKADEMIK',
    },
    MULTIMEDIA: {
      label: t('jpp:takwim_jenis_multimedia_label', 'Multimedia, Informasi & PA'),
      shortLabel: t('jpp:takwim_jenis_multimedia_short', 'Multimedia'),
      color: '#FB923C',
      bgColor: 'rgba(251,146,60,0.12)',
      icon: Radio,
      excoModule: 'MULTIMEDIA',
    },
    KLS: {
      label: t('jpp:takwim_jenis_kls_label', 'Kediaman Luar Kampus'),
      shortLabel: t('jpp:takwim_jenis_kls_short', 'Kediaman Luar'),
      color: '#60A5FA',
      bgColor: 'rgba(96,165,250,0.12)',
      icon: MapPin,
      excoModule: 'KLS',
    },
    KOLAB: {
      label: t('jpp:takwim_jenis_kolab_label', 'Kolaborasi & Kesukarelawanan'),
      shortLabel: t('jpp:takwim_jenis_kolab_short', 'Kolaborasi'),
      color: '#34D399',
      bgColor: 'rgba(52,211,153,0.12)',
      icon: Handshake,
      excoModule: 'KOLAB',
    },
    KK: {
      label: t('jpp:takwim_jenis_kk_label', 'Kediaman & Kerohanian'),
      shortLabel: t('jpp:takwim_jenis_kk_short', 'KK'),
      color: '#E879F9',
      bgColor: 'rgba(232,121,249,0.12)',
      icon: Moon,
      excoModule: 'KK',
    },
    CUTI_UMUM: {
      label: t('jpp:takwim_jenis_cuti_label', 'Cuti Umum / Perayaan'),
      shortLabel: t('jpp:takwim_jenis_cuti_short', 'Cuti'),
      color: '#FBBF24',
      bgColor: 'rgba(251,191,36,0.15)',
      icon: CalendarDays,
    },
    LAIN: {
      label: t('jpp:takwim_jenis_lain_label', 'Lain-lain'),
      shortLabel: t('jpp:takwim_jenis_lain_short', 'Lain'),
      color: '#94A3B8',
      bgColor: 'rgba(148,163,184,0.12)',
      icon: Tag,
    },
    KELAB: {
      label: t('jpp:takwim_jenis_kelab_label', 'Aktiviti Kelab'),
      shortLabel: t('jpp:takwim_jenis_kelab_short', 'Kelab'),
      color: '#10B981',
      bgColor: 'rgba(16,185,129,0.12)',
      icon: Landmark,
    },
    KELAB_KEDIAMAN: {
      label: t('jpp:takwim_jenis_kelab_kediaman_label', 'Kelab Kediaman'),
      shortLabel: t('jpp:takwim_jenis_kelab_kediaman_short', 'Kediaman'),
      color: '#E879F9',
      bgColor: 'rgba(232,121,249,0.12)',
      icon: Building2,
      excoModule: 'KK',
    },
  };
}

export const TAKWIM_JENIS: Record<string, TakwimJenisConfig> = new Proxy({}, {
  get(_target, prop: string) {
    return (getTakwimJenis() as any)[prop];
  },
  has(_target, prop: string) {
    return prop in getTakwimJenis();
  },
  ownKeys() {
    return Reflect.ownKeys(getTakwimJenis());
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    return {
      configurable: true,
      enumerable: true,
      value: (getTakwimJenis() as any)[prop],
    };
  },
}) as Record<string, TakwimJenisConfig>;

// ── Filter Options ───────────────────────────────────────────
export interface TakwimFilterOption {
  value: string;
  label: string;
}

export function getTakwimFilterOptions(t: (k: string, fb: string) => string = (k, fb) => (i18n && i18n.isInitialized ? i18n.t(k, { defaultValue: fb }) : fb)): TakwimFilterOption[] {
  return [
    { value: 'KESELURUHAN',  label: t('jpp:takwim_filter_keseluruhan', 'Keseluruhan') },
    { value: 'KELAB_SAYA',   label: t('jpp:takwim_filter_kelab_saya', 'Kelab Saya') },
    { value: 'AKADEMIK',     label: t('jpp:takwim_filter_akademik_sahaja', 'Akademik Sahaja') },
    { value: 'JPP',          label: t('jpp:takwim_filter_jpp_sahaja', 'JPP Sahaja') },
    { value: 'CUTI_UMUM',    label: t('jpp:takwim_filter_cuti_umum', 'Cuti Umum') },
    { value: 'KPP',          label: t('jpp:takwim_jenis_kpp_short', 'KPP') },
    { value: 'KEUSAHAWANAN',  label: t('jpp:takwim_jenis_keusahawanan_short', 'Keusahawanan') },
    { value: 'KEBAJIKAN',    label: t('jpp:takwim_jenis_kebajikan_short', 'Kebajikan') },
    { value: 'SRK',          label: t('jpp:takwim_jenis_srk_short', 'Sukan & Reka') },
    { value: 'MULTIMEDIA',   label: t('jpp:takwim_jenis_multimedia_short', 'Multimedia') },
    { value: 'KLS',          label: t('jpp:takwim_jenis_kls_short', 'Kediaman Luar') },
    { value: 'KOLAB',        label: t('jpp:takwim_jenis_kolab_short', 'Kolaborasi') },
    { value: 'KK',           label: t('jpp:takwim_jenis_kk_short', 'Kediaman & Ker.') },
    { value: 'KELAB_KEDIAMAN', label: t('jpp:takwim_jenis_kelab_kediaman_label', 'Kelab Kediaman') },
  ];
}

export const TAKWIM_FILTER_OPTIONS: TakwimFilterOption[] = new Proxy([] as TakwimFilterOption[], {
  get(_target, prop: string | symbol) {
    const opts = getTakwimFilterOptions();
    return (opts as any)[prop];
  },
  has(_target, prop) {
    return prop in getTakwimFilterOptions();
  },
  ownKeys() {
    return Reflect.ownKeys(getTakwimFilterOptions());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return {
      configurable: true,
      enumerable: true,
      value: (getTakwimFilterOptions() as any)[prop],
    };
  },
});

/** Simplified filter for student-facing view — no per-unit JPP breakdown */
export function getStudentFilterOptions(t: (k: string, fb: string) => string = (k, fb) => (i18n && i18n.isInitialized ? i18n.t(k, { defaultValue: fb }) : fb)): TakwimFilterOption[] {
  return [
    { value: 'KESELURUHAN',  label: t('jpp:takwim_filter_keseluruhan', 'Keseluruhan') },
    { value: 'KELAB_SAYA',   label: t('jpp:takwim_filter_kelab_saya', 'Kelab Saya') },
    { value: 'AKADEMIK',     label: t('jpp:takwim_filter_akademik_sahaja', 'Akademik Sahaja') },
    { value: 'JPP_ALL',      label: t('jpp:takwim_filter_jpp_all', 'JPP (Keseluruhan)') },
    { value: 'CUTI_UMUM',    label: t('jpp:takwim_filter_cuti_umum', 'Cuti Umum') },
  ];
}

export const STUDENT_FILTER_OPTIONS: TakwimFilterOption[] = new Proxy([] as TakwimFilterOption[], {
  get(_target, prop: string | symbol) {
    const opts = getStudentFilterOptions();
    return (opts as any)[prop];
  },
  has(_target, prop) {
    return prop in getStudentFilterOptions();
  },
  ownKeys() {
    return Reflect.ownKeys(getStudentFilterOptions());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return {
      configurable: true,
      enumerable: true,
      value: (getStudentFilterOptions() as any)[prop],
    };
  },
});

/** JPP unit jenis codes — used for JPP_ALL aggregate filter */
export const JPP_UNIT_JENIS = [
  'JPP', 'KPP', 'KEUSAHAWANAN', 'KEBAJIKAN', 'SRK',
  'AKADEMIK_EXCO', 'MULTIMEDIA', 'KLS', 'KOLAB', 'KK',
];

// ── Sesi Options ─────────────────────────────────────────────
export const SESI_OPTIONS = [
  { value: '2026/2027', label: 'Sesi 2026/2027' },
  { value: '2025/2026', label: 'Sesi 2025/2026' },
  { value: '2027/2028', label: 'Sesi 2027/2028' },
];

// ── Institusi Label ──────────────────────────────────────────
export const INSTITUSI_LABEL = 'Institusi B';
export const INSTITUSI_NOTE = 'Perlis, Pulau Pinang, Perak, Selangor, Negeri Sembilan, Melaka, Pahang, Johor, Sabah, Sarawak, WP KL';

// ── Merged item type used across the app ─────────────────────
export interface TakwimItem {
  id: string;
  type: 'takwim_pusat' | 'program' | 'holiday';
  jenis: string;
  tajuk: string;
  catatan?: string | null;
  tarikh_mula: string;
  tarikh_tamat?: string | null;
  bil_minggu?: number | null;
  aktiviti?: string | null;
  warna_custom?: string | null;
  sesi?: string | null;
  exco_module?: string | null;
  created_by?: string | null;
  /** For program entries */
  status?: string | null;
  club_name?: string | null;
  /** For kelab kediaman entries */
  kelab_kediaman_label?: string | null;
}
