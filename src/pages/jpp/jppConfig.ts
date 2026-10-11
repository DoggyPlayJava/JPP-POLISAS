// ============================================================
// JPP HQ Portal : Shared Config
// ============================================================
import {
  Landmark, Lightbulb, HeartHandshake, Trophy,
  BookOpen, Radio, MapPin, Handshake, Moon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { hexToRgba } from '@/lib/utils';

export const JPP_THEME_DEFAULT_COLOR = '#2E3A2F';
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
    moduleLink: '/jpp/keusahawanan-hub',
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
    moduleLink: '/klk',  // Dashboard khusus KLK (bukan generic exco template)
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
export function getJppSidebarBg(hex: string, isDark: boolean = true) {
  if (!isDark) {
    return {
      top: '#F8F6EE',
      bottom: '#F2EDE4',
      border: 'rgba(217, 201, 178, 0.8)',
      textPrimary: '#2E3A2F',
      textSecondary: '#556453',
      hoverBg: 'rgba(46, 58, 47, 0.06)',
      activeBg: 'rgba(46, 58, 47, 0.12)',
    };
  }
  return {
    top: '#151D16',
    bottom: '#1B241C',
    border: 'rgba(58, 74, 59, 0.5)',
    textPrimary: '#F8F6EE',
    textSecondary: '#A3B39F',
    hoverBg: 'rgba(255, 255, 255, 0.05)',
    activeBg: 'rgba(107, 127, 91, 0.2)',
  };
}

/** Preset accent colors for JPP HQ */
export const JPP_COLOR_PRESETS = [
  '#2E3A2F', '#1E271F', '#3B4A3C', '#6B7F5B', '#C96F4F', '#4A584B',
];
