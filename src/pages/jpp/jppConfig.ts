// ============================================================
// JPP HQ Portal : Shared Config
// ============================================================
import {
  Landmark, Lightbulb, HeartHandshake, Trophy,
  BookOpen, Radio, MapPin, Handshake, Moon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { hexToRgba } from '@/lib/utils';
import i18n from '@/lib/i18n';

const t = (k: string, fb: string, opt?: any): string => (i18n.isInitialized ? (i18n.t(k, { defaultValue: fb, ...opt }) as string) : fb);

export const JPP_THEME_DEFAULT_COLOR = '#0F766E';
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
    fullLabel: t('jpp:unit_kpp_full', 'Kelab, Persatuan & Perpaduan'),
    icon: Landmark,
    color: '#F87171',
    moduleLink: '/dashboard',
    isActive: true,
  },
  KEUSAHAWANAN: {
    code: 'KEUSAHAWANAN',
    shortLabel: t('jpp:unit_keusahawanan_short', 'Keusahawanan'),
    fullLabel: t('jpp:unit_keusahawanan_full', 'Keusahawanan & Inovasi'),
    icon: Lightbulb,
    color: '#4ADE80',
    moduleLink: '/jpp/keusahawanan-hub',
    isActive: true,
  },
  KEBAJIKAN: {
    code: 'KEBAJIKAN',
    shortLabel: t('jpp:unit_kebajikan_short', 'Kebajikan'),
    fullLabel: t('jpp:unit_kebajikan_full', 'Kebajikan & Pengaduan Awam'),
    label: t('jpp:unit_kebajikan_label', 'Exco Kebajikan'),
    icon: HeartHandshake,
    color: '#2DD4BF',
    moduleLink: '/kebajikan',
    isActive: true,
  },
  SRK: {
    code: 'SRK',
    shortLabel: t('jpp:unit_srk_short', 'Sukan & Reka'),
    fullLabel: t('jpp:unit_srk_full', 'Sukan, Rekreasi & Kebudayaan'),
    label: t('jpp:unit_srk_label', 'Exco Sukan, Rekreasi & Kebudayaan'),
    icon: Trophy,
    color: '#F59E0B',
    moduleLink: '/exco/srk/aktiviti',
    isActive: true,
  },
  AKADEMIK: {
    code: 'AKADEMIK',
    shortLabel: t('jpp:unit_akademik_short', 'Akademik'),
    fullLabel: t('jpp:unit_akademik_full', 'Akademik & Pembangunan Mahasiswa'),
    label: t('jpp:unit_akademik_label', 'Exco Akademik'),
    icon: BookOpen,
    color: '#818CF8',
    moduleLink: '/akademik',
    isActive: true,
  },
  MULTIMEDIA: {
    code: 'MULTIMEDIA',
    shortLabel: t('jpp:unit_multimedia_short', 'Multimedia'),
    fullLabel: t('jpp:unit_multimedia_full', 'Multimedia, Informasi & PA'),
    label: t('jpp:unit_multimedia_label', 'Exco Multimedia'),
    icon: Radio,
    color: '#FB923C',
    moduleLink: '/exco/multimedia/aktiviti',
    isActive: true,
  },
  KLS: {
    code: 'KLS',
    shortLabel: t('jpp:unit_kls_short', 'Kediaman Luar'),
    fullLabel: t('jpp:unit_kls_full', 'Kediaman Luar Kampus'),
    label: t('jpp:unit_kls_label', 'Exco Kediaman Luar Kampus'),
    icon: MapPin,
    color: '#60A5FA',
    moduleLink: '/klk',  // Dashboard khusus KLK (bukan generic exco template)
    isActive: true,
  },
  KOLAB: {
    code: 'KOLAB',
    shortLabel: t('jpp:unit_kolab_short', 'Kolaborasi'),
    fullLabel: t('jpp:unit_kolab_full', 'Kolaborasi & Kesukarelawanan'),
    label: t('jpp:unit_kolab_label', 'Exco Kolaborasi'),
    icon: Handshake,
    color: '#34D399',
    moduleLink: '/exco/kolab/aktiviti',
    isActive: true,
  },
  KK: {
    code: 'KK',
    shortLabel: t('jpp:unit_kk_short', 'Kediaman & Ker.'),
    fullLabel: t('jpp:unit_kk_full', 'Kediaman & Kerohanian'),
    label: t('jpp:unit_kk_label', 'Exco Kediaman & Kerohanian'),
    icon: Moon,
    color: '#E879F9',
    moduleLink: '/exco/kk/aktiviti',
    isActive: true,
  },
};

/** Returns hex sidebar gradient background based on theme color */
export function getJppSidebarBg(_hex: string, _isDark: boolean = true) {
  return {
    top: '#0B2420',
    bottom: '#061714',
    border: 'rgba(45, 212, 191, 0.16)',
    textPrimary: '#F6FBF9',
    textSecondary: '#99CBC2',
    hoverBg: 'rgba(255, 255, 255, 0.06)',
    activeBg: 'rgba(45, 212, 191, 0.16)',
  };
}

/** Preset accent colors for JPP HQ */
export const JPP_COLOR_PRESETS = [
  '#0F766E', '#0B2420', '#0D9488', '#115E59', '#14B8A6', '#134E4A',
];
