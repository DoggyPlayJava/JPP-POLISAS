export const LAUNCH_FPS = 30;
export const LAUNCH_WIDTH = 1920;
export const LAUNCH_HEIGHT = 1080;

export const LAUNCH_PALETTE = {
  PRIMARY: '#2E3A2F',
  PRIMARY_DARK: '#1F2720',
  SECONDARY: '#6B7F5B',
  MUTED_OLIVE: '#556453',
  TERTIARY: '#D9C9B2',
  ACCENT: '#C96F4F',
  BACKGROUND: '#F8F6EE',
  SURFACE_MUTED: '#F2EDE4',
  CARD_BG: '#FFFFFF',
  INK_SOFT: '#556453',
} as const;

export const LAUNCH_FONTS = {
  DISPLAY: '"Geist", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  SERIF_ITALIC: '"Instrument Serif", Georgia, "Times New Roman", serif',
  MONO: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

// Official POLISAS Semambu campus coordinates ([longitude, latitude] for MapLibre / Turf / GeoJSON)
export const POLISAS_COORDS = {
  CENTER: [103.3153, 3.8625] as [number, number],
  DATARAN_SISWA: [103.3144, 3.8617] as [number, number],
  LALUAN_UTAMA: [103.3151, 3.8623] as [number, number],
  BLOK_JTMK: [103.3161, 3.8631] as [number, number],
  LABEL_COORDS: '3.8625° N, 103.3153° E',
} as const;
