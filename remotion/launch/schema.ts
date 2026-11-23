import { z } from 'zod';

export const LAUNCH_TRANSITION_FRAMES = 36;
export const LAUNCH_OVERLAY_FRAMES = 48;

export type LaunchTransitionKind =
  | 'portal-zoom-morph'
  | 'kinetic-push'
  | 'editorial-shutter'
  | 'split-curtain'
  | 'swiss-louvers'
  | 'depth-lift'
  | 'warm-light-sweep'
  | 'orbital-iris';

export interface LaunchChapterMeta {
  readonly id: string;
  readonly code: string;
  readonly indexLabel: string;
  readonly title: string;
  readonly subtitle: string;
  readonly gateLabel: string;
  readonly durationInFrames: number;
  readonly startFrame: number;
  readonly transitionOut: LaunchTransitionKind | null;
}

export const LAUNCH_CHAPTERS: readonly LaunchChapterMeta[] = [
  {
    id: 'OpeningHero',
    code: '01',
    indexLabel: '01',
    title: 'Portal Hub',
    subtitle: 'Identiti & Portal Rasmi',
    gateLabel: 'PORTAL SUPERAPP HUB',
    durationInFrames: 306,
    startFrame: 0,
    transitionOut: 'portal-zoom-morph',
  },
  {
    id: 'PolyMapsCampus',
    code: '02',
    indexLabel: '02',
    title: 'PolyMaps',
    subtitle: 'Navigasi Kampus & Jadual',
    gateLabel: 'POLYMAPS & JADUAL KULIAH',
    durationInFrames: 480,
    startFrame: 270,
    transitionOut: 'editorial-shutter',
  },
  {
    id: 'PolyMartCommerce',
    code: '03',
    indexLabel: '03',
    title: 'PolyMart & Rent',
    subtitle: 'Keusahawanan Siswa',
    gateLabel: 'EKONOMI & KEDIAMAN',
    durationInFrames: 396,
    startFrame: 750,
    transitionOut: 'split-curtain',
  },
  {
    id: 'PolySuaraVoice',
    code: '04',
    indexLabel: '04',
    title: 'PolySuara',
    subtitle: 'Suara & Undian Kampus',
    gateLabel: 'POLYSUARA • SUARA MAHASISWA',
    durationInFrames: 366,
    startFrame: 1110,
    transitionOut: 'swiss-louvers',
  },
  {
    id: 'WelfareCare',
    code: '05',
    indexLabel: '05',
    title: 'E-Kebajikan',
    subtitle: 'Aduan & Food Bank',
    gateLabel: 'E-KEBAJIKAN & FOOD BANK',
    durationInFrames: 366,
    startFrame: 1440,
    transitionOut: 'depth-lift',
  },
  {
    id: 'ClubsEms',
    code: '06',
    indexLabel: '06',
    title: 'Nexus AI & EMS',
    subtitle: 'Aktiviti & Sijil Digital',
    gateLabel: 'NEXUS AI • KELAB & EMS',
    durationInFrames: 390,
    startFrame: 1770,
    transitionOut: 'warm-light-sweep',
  },
  {
    id: 'ImpactNumbers',
    code: '07',
    indexLabel: '07',
    title: 'Impak',
    subtitle: 'Angka Sebenar POLISAS',
    gateLabel: 'TELEMETRI MASA NYATA',
    durationInFrames: 366,
    startFrame: 2160,
    transitionOut: 'orbital-iris',
  },
  {
    id: 'ClosingVault',
    code: '08',
    indexLabel: '08',
    title: 'Penutup',
    subtitle: 'Akses Portal Rasmi',
    gateLabel: 'AKSES PORTAL RASMI',
    durationInFrames: 450,
    startFrame: 2490,
    transitionOut: null,
  },
];

export const LAUNCH_TOTAL_FRAMES = 2940;

export const LaunchShowcaseSchema = z.object({
  institutionName: z.string().default('POLITEKNIK SULTAN HAJI AHMAD SHAH'),
  councilName: z.string().default('JAWATANKUASA PERWAKILAN PELAJAR'),
  sessionLabel: z.string().default('SESI AKADEMIK 2026/2027'),
  headlinePrimary: z.string().default('Satu Kampus. Satu Ekosistem Pintar.'),
  headlineItalic: z.string().default('Mendepani Digitalisasi Mahasiswa POLISAS.'),
  portalUrl: z.string().default('https://jpp.polisas.edu.my'),
  bgmSrc: z.string().default(''),
  bgmVolume: z.number().min(0).max(1).default(0.35),
  stats: z
    .object({
      clubsCount: z.number().default(21),
      activitiesCount: z.number().default(41),
      studentsCount: z.number().default(1083),
      productsCount: z.number().default(277),
      ordersCount: z.number().default(344),
    })
    .default({
      clubsCount: 21,
      activitiesCount: 41,
      studentsCount: 1083,
      productsCount: 277,
      ordersCount: 344,
    }),
});

export type LaunchShowcaseProps = z.infer<typeof LaunchShowcaseSchema>;

export const DEFAULT_LAUNCH_PROPS: LaunchShowcaseProps = LaunchShowcaseSchema.parse({});
