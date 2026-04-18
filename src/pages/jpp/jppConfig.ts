// ============================================================
// JPP HQ Portal — Shared Config
// ============================================================
import {
  Landmark, Lightbulb, HeartHandshake, Trophy,
  BookOpen, Radio, MapPin, Handshake, Moon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const JPP_THEME_DEFAULT_COLOR = '#7f1d1d';
export const JPP_MODULE_ID = 'jpp';

export interface UnitConfig {
  code: string;
  shortLabel: string;
  fullLabel: string;
  label?: string;       // Short display label for exco pages
  icon: LucideIcon;
  color: string;
  moduleLink: string;
  isActive: boolean;
}

export const UNIT_ORDER = [
  'KPP', 'KEUSAHAWANAN', 'KEBAJIKAN', 'SRK',
  'AKADEMIK', 'MULTIMEDIA', 'KLS', 'KOLAB', 'KK',
];

export const UNIT_CFG: Record<string, UnitConfig> = {
  KPP: {
    code: 'KPP',
    shortLabel: 'KPP',
    fullLabel: 'Kelab, Persatuan & Perpaduan',
    icon: Landmark,
    color: '#F87171',
    moduleLink: '/dashboard',
    isActive: true,
  },
  KEUSAHAWANAN: {
    code: 'KEUSAHAWANAN',
    shortLabel: 'Keusahawanan',
    fullLabel: 'Keusahawanan & Inovasi',
    icon: Lightbulb,
    color: '#4ADE80',
    moduleLink: '/keusahawanan/dashboard',
    isActive: true,
  },
  KEBAJIKAN: {
    code: 'KEBAJIKAN',
    shortLabel: 'Kebajikan',
    fullLabel: 'Kebajikan & Pengaduan Awam',
    label: 'Exco Kebajikan',
    icon: HeartHandshake,
    color: '#2DD4BF',
    moduleLink: '/kebajikan',
    isActive: true,
  },
  SRK: {
    code: 'SRK',
    shortLabel: 'Sukan & Reka',
    fullLabel: 'Sukan, Rekreasi & Kebudayaan',
    label: 'Exco Sukan, Rekreasi & Kebudayaan',
    icon: Trophy,
    color: '#F59E0B',
    moduleLink: '/exco/srk/aktiviti',
    isActive: true,
  },
  AKADEMIK: {
    code: 'AKADEMIK',
    shortLabel: 'Akademik',
    fullLabel: 'Akademik & Pembangunan Mahasiswa',
    label: 'Exco Akademik',
    icon: BookOpen,
    color: '#818CF8',
    moduleLink: '/akademik',
    isActive: true,
  },
  MULTIMEDIA: {
    code: 'MULTIMEDIA',
    shortLabel: 'Multimedia',
    fullLabel: 'Multimedia, Informasi & PA',
    label: 'Exco Multimedia',
    icon: Radio,
    color: '#FB923C',
    moduleLink: '/exco/multimedia/aktiviti',
    isActive: true,
  },
  KLS: {
    code: 'KLS',
    shortLabel: 'Kediaman Luar',
    fullLabel: 'Kediaman Luar Kampus',
    label: 'Exco Kediaman Luar Kampus',
    icon: MapPin,
    color: '#60A5FA',
    moduleLink: '/exco/kls/aktiviti',
    isActive: true,
  },
  KOLAB: {
    code: 'KOLAB',
    shortLabel: 'Kolaborasi',
    fullLabel: 'Kolaborasi & Kesukarelawanan',
    label: 'Exco Kolaborasi',
    icon: Handshake,
    color: '#34D399',
    moduleLink: '/exco/kolab/aktiviti',
    isActive: true,
  },
  KK: {
    code: 'KK',
    shortLabel: 'Kediaman & Ker.',
    fullLabel: 'Kediaman & Kerohanian',
    label: 'Exco Kediaman & Kerohanian',
    icon: Moon,
    color: '#E879F9',
    moduleLink: '/exco/kk/aktiviti',
    isActive: true,
  },
};

/** Returns hex sidebar gradient background based on theme color */
export function getJppSidebarBg(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    top:    `rgb(${Math.floor(r * 0.07)}, ${Math.floor(g * 0.03)}, ${Math.floor(b * 0.03)})`,
    bottom: `rgb(${Math.floor(r * 0.13)}, ${Math.floor(g * 0.05)}, ${Math.floor(b * 0.05)})`,
  };
}

/** Preset accent colors for JPP HQ */
export const JPP_COLOR_PRESETS = [
  '#7f1d1d', '#991b1b', '#b91c1c', '#c2410c', '#92400e', '#1e3a5f',
];
