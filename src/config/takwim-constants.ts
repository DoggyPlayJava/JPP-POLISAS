// ============================================================
// Takwim POLISAS Berpusat — Constants & Jenis Definitions
// ============================================================
import {
  BookOpen, Crown, Landmark, CalendarDays, Lightbulb,
  HeartHandshake, Trophy, Radio, MapPin, Handshake, Moon, Tag, Building2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

export const TAKWIM_JENIS: Record<string, TakwimJenisConfig> = {
  AKADEMIK: {
    label: 'Kalendar Akademik',
    shortLabel: 'Akademik',
    color: '#818CF8',
    bgColor: 'rgba(129,140,248,0.12)',
    icon: BookOpen,
    excoModule: 'AKADEMIK',
  },
  JPP: {
    label: 'Aktiviti JPP',
    shortLabel: 'JPP',
    color: '#F87171',
    bgColor: 'rgba(248,113,113,0.12)',
    icon: Crown,
  },
  KPP: {
    label: 'Kelab, Persatuan & Perpaduan',
    shortLabel: 'KPP',
    color: '#F87171',
    bgColor: 'rgba(248,113,113,0.12)',
    icon: Landmark,
    excoModule: 'KPP',
  },
  KEUSAHAWANAN: {
    label: 'Keusahawanan & Inovasi',
    shortLabel: 'Keusahawanan',
    color: '#4ADE80',
    bgColor: 'rgba(74,222,128,0.12)',
    icon: Lightbulb,
    excoModule: 'KEUSAHAWANAN',
  },
  KEBAJIKAN: {
    label: 'Kebajikan',
    shortLabel: 'Kebajikan',
    color: '#2DD4BF',
    bgColor: 'rgba(45,212,191,0.12)',
    icon: HeartHandshake,
    excoModule: 'KEBAJIKAN',
  },
  SRK: {
    label: 'Sukan, Rekreasi & Kebudayaan',
    shortLabel: 'SRK',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.12)',
    icon: Trophy,
    excoModule: 'SRK',
  },
  AKADEMIK_EXCO: {
    label: 'Aktiviti Exco Akademik',
    shortLabel: 'Exco Akademik',
    color: '#A78BFA',
    bgColor: 'rgba(167,139,250,0.12)',
    icon: BookOpen,
    excoModule: 'AKADEMIK',
  },
  MULTIMEDIA: {
    label: 'Multimedia, Informasi & PA',
    shortLabel: 'Multimedia',
    color: '#FB923C',
    bgColor: 'rgba(251,146,60,0.12)',
    icon: Radio,
    excoModule: 'MULTIMEDIA',
  },
  KLS: {
    label: 'Kediaman Luar Kampus',
    shortLabel: 'Kediaman Luar',
    color: '#60A5FA',
    bgColor: 'rgba(96,165,250,0.12)',
    icon: MapPin,
    excoModule: 'KLS',
  },
  KOLAB: {
    label: 'Kolaborasi & Kesukarelawanan',
    shortLabel: 'Kolaborasi',
    color: '#34D399',
    bgColor: 'rgba(52,211,153,0.12)',
    icon: Handshake,
    excoModule: 'KOLAB',
  },
  KK: {
    label: 'Kediaman & Kerohanian',
    shortLabel: 'KK',
    color: '#E879F9',
    bgColor: 'rgba(232,121,249,0.12)',
    icon: Moon,
    excoModule: 'KK',
  },
  CUTI_UMUM: {
    label: 'Cuti Umum / Perayaan',
    shortLabel: 'Cuti',
    color: '#FBBF24',
    bgColor: 'rgba(251,191,36,0.15)',
    icon: CalendarDays,
  },
  LAIN: {
    label: 'Lain-lain',
    shortLabel: 'Lain',
    color: '#94A3B8',
    bgColor: 'rgba(148,163,184,0.12)',
    icon: Tag,
  },
  KELAB: {
    label: 'Program Kelab (Rasmi)',
    shortLabel: 'Kelab',
    color: '#10B981',
    bgColor: 'rgba(16,185,129,0.12)',
    icon: Landmark,
  },
  KELAB_KEDIAMAN: {
    label: 'Kelab Kediaman',
    shortLabel: 'Kediaman',
    color: '#E879F9',
    bgColor: 'rgba(232,121,249,0.12)',
    icon: Building2,
    excoModule: 'KK',
  },
};

// ── Filter Options ───────────────────────────────────────────
export interface TakwimFilterOption {
  value: string;
  label: string;
}

export const TAKWIM_FILTER_OPTIONS: TakwimFilterOption[] = [
  { value: 'KESELURUHAN',  label: 'Keseluruhan' },
  { value: 'KELAB_SAYA',   label: 'Kelab Saya' },
  { value: 'AKADEMIK',     label: 'Akademik Sahaja' },
  { value: 'JPP',          label: 'JPP Sahaja' },
  { value: 'CUTI_UMUM',    label: 'Cuti Umum' },
  { value: 'KPP',          label: 'KPP' },
  { value: 'KEUSAHAWANAN',  label: 'Keusahawanan' },
  { value: 'KEBAJIKAN',    label: 'Kebajikan' },
  { value: 'SRK',          label: 'Sukan & Reka' },
  { value: 'MULTIMEDIA',   label: 'Multimedia' },
  { value: 'KLS',          label: 'Kediaman Luar' },
  { value: 'KOLAB',        label: 'Kolaborasi' },
  { value: 'KK',           label: 'Kediaman & Ker.' },
  { value: 'KELAB_KEDIAMAN', label: 'Kelab Kediaman' },
];

/** Simplified filter for student-facing view — no per-unit JPP breakdown */
export const STUDENT_FILTER_OPTIONS: TakwimFilterOption[] = [
  { value: 'KESELURUHAN',  label: 'Keseluruhan' },
  { value: 'KELAB_SAYA',   label: 'Kelab Saya' },
  { value: 'AKADEMIK',     label: 'Akademik Sahaja' },
  { value: 'JPP_ALL',      label: 'JPP (Keseluruhan)' },
  { value: 'CUTI_UMUM',    label: 'Cuti Umum' },
];

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
