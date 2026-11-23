export const LAUNCH_FPS = 60;
export const LAUNCH_WIDTH = 1920;
export const LAUNCH_HEIGHT = 1080;

/** Shared v8 slow-paced luxury spring physics calibrated for weighty Apple/Fluent depth motion. */
export const LUXURY_SPRING = {
  damping: 26,
  stiffness: 110,
  mass: 1.15,
} as const;

export const LAUNCH_PALETTE = {
  PRIMARY: '#0B2420',
  PRIMARY_DARK: '#061714',
  SECONDARY: '#0D9488',
  MUTED_OLIVE: '#3B635C',
  TERTIARY: '#B8E4DC',
  ACCENT: '#14B8A6',
  BACKGROUND: '#F6FBF9',
  SURFACE_MUTED: '#EBF7F4',
  CARD_BG: '#FFFFFF',
  INK_SOFT: '#3B635C',
} as const;

export const LAUNCH_FONTS = {
  DISPLAY: '"Geist", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  SERIF_ITALIC: '"Instrument Serif", Georgia, "Times New Roman", serif',
  MONO: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

// Official POLISAS Semambu campus coordinates ([longitude, latitude] for MapLibre / Turf / GeoJSON)
export const POLISAS_COORDS = {
  CENTER: [103.3155, 3.8622] as [number, number],
  DATARAN_SISWA: [103.314577, 3.860995] as [number, number],
  LALUAN_UTAMA: [103.315247, 3.861814] as [number, number],
  SIMPANG_AKADEMIK: [103.315827, 3.862066] as [number, number],
  BLOK_JTMK: [103.316304, 3.863147] as [number, number],
  LABEL_COORDS: '3.8625° N, 103.3153° E',
} as const;

export type ModuleTheme = {
  readonly id: string;
  readonly primary: string;
  readonly dark: string;
  readonly accent: string;
  readonly soft: string;
  readonly border: string;
  readonly tint: string;
};

/**
 * Exact signature color scripting per module aligned directly with
 * `src/components/portal/CampusServicesGrid.tsx` & `src/config/excoModules.ts`,
 * anchored on crisp Next-Gen Teal Green & Crisp White (`#F6FBF9` / `#0B2420`) surfaces.
 */
export const LAUNCH_MODULE_THEMES = {
  portal: {
    id: 'portal',
    primary: '#0D9488',
    dark: '#0B2420',
    accent: '#14B8A6',
    soft: '#CCFBF1',
    border: '#99F6E4',
    tint: 'rgba(13, 148, 136, 0.08)',
  },
  polymaps: {
    id: 'polymaps',
    primary: '#10B981',
    dark: '#059669',
    accent: '#10B981',
    soft: '#ECFDF5',
    border: '#A7F3D0',
    tint: 'rgba(16, 185, 129, 0.09)',
  },
  takwim: {
    id: 'takwim',
    primary: '#6366F1',
    dark: '#4F46E5',
    accent: '#6366F1',
    soft: '#EEF2FF',
    border: '#C7D2FE',
    tint: 'rgba(99, 102, 241, 0.08)',
  },
  polymart: {
    id: 'polymart',
    primary: '#F59E0B',
    dark: '#D97706',
    accent: '#F59E0B',
    soft: '#FFFBEB',
    border: '#FDE68A',
    tint: 'rgba(245, 158, 11, 0.09)',
  },
  polyrent: {
    id: 'polyrent',
    primary: '#06B6D4',
    dark: '#0891B2',
    accent: '#06B6D4',
    soft: '#ECFEFF',
    border: '#A5F3FC',
    tint: 'rgba(6, 182, 212, 0.09)',
  },
  polysuara: {
    id: 'polysuara',
    primary: '#F43F5E',
    dark: '#E11D48',
    accent: '#F43F5E',
    soft: '#FFF1F2',
    border: '#FECDD3',
    tint: 'rgba(244, 63, 94, 0.09)',
  },
  kebajikan: {
    id: 'kebajikan',
    primary: '#14B8A6',
    dark: '#0F766E',
    accent: '#14B8A6',
    soft: '#CCFBF1',
    border: '#99F6E4',
    tint: 'rgba(20, 184, 166, 0.09)',
  },
  foodbank: {
    id: 'foodbank',
    primary: '#F59E0B',
    dark: '#D97706',
    accent: '#F59E0B',
    soft: '#FFFBEB',
    border: '#FDE68A',
    tint: 'rgba(245, 158, 11, 0.08)',
  },
  kelab: {
    id: 'kelab',
    primary: '#3B82F6',
    dark: '#2563EB',
    accent: '#3B82F6',
    soft: '#EFF6FF',
    border: '#BFDBFE',
    tint: 'rgba(59, 130, 246, 0.09)',
  },
  meritQr: {
    id: 'meritQr',
    primary: '#A855F7',
    dark: '#9333EA',
    accent: '#A855F7',
    soft: '#FAF5FF',
    border: '#E9D5FF',
    tint: 'rgba(168, 85, 247, 0.09)',
  },
  ems: {
    id: 'ems',
    primary: '#EC4899',
    dark: '#DB2777',
    accent: '#EC4899',
    soft: '#FDF2F8',
    border: '#FBCFE8',
    tint: 'rgba(236, 72, 153, 0.08)',
  },
  impact: {
    id: 'impact',
    primary: '#14B8A6',
    dark: '#061714',
    accent: '#2DD4BF',
    soft: '#0D2E29',
    border: '#2DD4BF',
    tint: 'rgba(20, 184, 166, 0.14)',
  },
  closing: {
    id: 'closing',
    primary: '#0D9488',
    dark: '#0B2420',
    accent: '#14B8A6',
    soft: '#CCFBF1',
    border: '#99F6E4',
    tint: 'rgba(13, 148, 136, 0.09)',
  },
} as const satisfies Record<string, ModuleTheme>;

export type ChapterModuleThemeSpec = {
  readonly code: string;
  readonly accent: string;
  readonly secondary: string;
  readonly badgeBg: string;
};

/**
 * Chapter-indexed (`0..8`) accent spectrum driving `<GlobalCinemaGate>` progress rail,
 * chapter ticks, and cut overlays across the 102-second film.
 */
export const CHAPTER_MODULE_THEMES: readonly ChapterModuleThemeSpec[] = [
  {
    code: '01',
    accent: LAUNCH_PALETTE.SECONDARY,
    secondary: LAUNCH_MODULE_THEMES.polymaps.primary,
    badgeBg: LAUNCH_MODULE_THEMES.portal.soft,
  },
  {
    code: '02',
    accent: LAUNCH_MODULE_THEMES.polymaps.primary,
    secondary: LAUNCH_MODULE_THEMES.takwim.primary,
    badgeBg: LAUNCH_MODULE_THEMES.polymaps.soft,
  },
  {
    code: '03',
    accent: LAUNCH_MODULE_THEMES.polymart.primary,
    secondary: LAUNCH_MODULE_THEMES.polymaps.primary,
    badgeBg: LAUNCH_MODULE_THEMES.polymart.soft,
  },
  {
    code: '04',
    accent: LAUNCH_MODULE_THEMES.polyrent.primary,
    secondary: LAUNCH_MODULE_THEMES.polymaps.primary,
    badgeBg: LAUNCH_MODULE_THEMES.polyrent.soft,
  },
  {
    code: '05',
    accent: LAUNCH_MODULE_THEMES.polysuara.primary,
    secondary: LAUNCH_MODULE_THEMES.polysuara.dark,
    badgeBg: LAUNCH_MODULE_THEMES.polysuara.soft,
  },
  {
    code: '06',
    accent: LAUNCH_MODULE_THEMES.kebajikan.primary,
    secondary: LAUNCH_MODULE_THEMES.foodbank.primary,
    badgeBg: LAUNCH_MODULE_THEMES.kebajikan.soft,
  },
  {
    code: '07',
    accent: LAUNCH_MODULE_THEMES.kelab.primary,
    secondary: LAUNCH_MODULE_THEMES.meritQr.primary,
    badgeBg: LAUNCH_MODULE_THEMES.kelab.soft,
  },
  {
    code: '08',
    accent: LAUNCH_MODULE_THEMES.meritQr.primary,
    secondary: LAUNCH_MODULE_THEMES.polymaps.primary,
    badgeBg: LAUNCH_MODULE_THEMES.impact.soft,
  },
  {
    code: '09',
    accent: LAUNCH_PALETTE.SECONDARY,
    secondary: LAUNCH_MODULE_THEMES.polymaps.primary,
    badgeBg: LAUNCH_MODULE_THEMES.closing.soft,
  },
] as const;
