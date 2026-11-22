import { z } from 'zod';

export const LAUNCH_TRANSITION_FRAMES = 30;
export const LAUNCH_OVERLAY_FRAMES = 48;

export type LaunchTransitionKind =
  | 'kinetic-push'
  | 'editorial-shutter'
  | 'split-curtain'
  | 'clock-wipe'
  | 'depth-lift'
  | 'light-sweep'
  | 'orbital-iris'
  | 'none';

export interface LaunchChapterMeta {
  readonly id: string;
  readonly indexLabel: string;
  readonly title: string;
  readonly subtitle: string;
  readonly durationInFrames: number;
  readonly startFrame: number;
  readonly transitionAfter: LaunchTransitionKind;
}

export const LAUNCH_CHAPTERS: readonly LaunchChapterMeta[] = [
  { id: 'OpeningHero', indexLabel: '01', title: 'Pembukaan', subtitle: 'Identiti & Portal Rasmi', durationInFrames: 300, startFrame: 0, transitionAfter: 'kinetic-push' },
  { id: 'PolyMapsCampus', indexLabel: '02', title: 'PolyMaps', subtitle: 'Navigasi Kampus & Jadual', durationInFrames: 480, startFrame: 270, transitionAfter: 'editorial-shutter' },
  { id: 'PolyMartCommerce', indexLabel: '03', title: 'PolyMart', subtitle: 'Keusahawanan Siswa', durationInFrames: 390, startFrame: 750, transitionAfter: 'split-curtain' },
  { id: 'PolySuaraVoice', indexLabel: '04', title: 'PolySuara', subtitle: 'Suara & Undian Kampus', durationInFrames: 360, startFrame: 1110, transitionAfter: 'clock-wipe' },
  { id: 'WelfareCare', indexLabel: '05', title: 'E-Kebajikan', subtitle: 'Aduan & Food Bank', durationInFrames: 360, startFrame: 1440, transitionAfter: 'depth-lift' },
  { id: 'ClubsEms', indexLabel: '06', title: 'Kelab & EMS', subtitle: 'Aktiviti & Sijil Digital', durationInFrames: 390, startFrame: 1770, transitionAfter: 'light-sweep' },
  { id: 'ImpactNumbers', indexLabel: '07', title: 'Impak', subtitle: 'Angka Sebenar POLISAS', durationInFrames: 360, startFrame: 2160, transitionAfter: 'orbital-iris' },
  { id: 'ClosingVault', indexLabel: '08', title: 'Penutup', subtitle: 'Akses Portal Rasmi', durationInFrames: 450, startFrame: 2490, transitionAfter: 'none' },
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
