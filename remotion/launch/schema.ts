import { z } from 'zod';

export const LAUNCH_TRANSITION_FRAMES = 42;
export const LAUNCH_OVERLAY_FRAMES = 54;

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
    title: 'SuperApp Siswa',
    subtitle: 'Portal Harian Mahasiswa POLISAS',
    gateLabel: 'SELAMAT DATANG MAHASISWA BAHARU',
    durationInFrames: 420,
    startFrame: 0,
    transitionOut: 'portal-zoom-morph',
  },
  {
    id: 'PolyMapsCampus',
    code: '02',
    indexLabel: '02',
    title: 'PolyMaps & Jadual',
    subtitle: 'Navigasi Kampus & Jadual',
    gateLabel: '08:00 PAGI • TAK SESAT CARI KELAS',
    durationInFrames: 660,
    startFrame: 378,
    transitionOut: 'editorial-shutter',
  },
  {
    id: 'PolyMartCommerce',
    code: '03',
    indexLabel: '03',
    title: 'PolyMart & JPP Pay',
    subtitle: 'Kafeteria & Pesanan Ekspres',
    gateLabel: '12:30 TGH HARI • KAFETERIA & JPP PAY',
    durationInFrames: 720,
    startFrame: 1038,
    transitionOut: 'kinetic-push',
  },
  {
    id: 'PolyRentHousing',
    code: '04',
    indexLabel: '04',
    title: 'PolyRent Kediaman',
    subtitle: 'Bilik Sewa & Kongsi Rakan',
    gateLabel: '14:00 PETANG • BILIK SEWA & KONGSI SEWA',
    durationInFrames: 720,
    startFrame: 1716,
    transitionOut: 'split-curtain',
  },
  {
    id: 'PolySuaraVoice',
    code: '05',
    indexLabel: '05',
    title: 'PolySuara Komuniti',
    subtitle: 'Suara & Undian Kampus',
    gateLabel: 'KOMUNITI SISWA • LUAH & UNDI TANPA NAMA',
    durationInFrames: 750,
    startFrame: 2394,
    transitionOut: 'swiss-louvers',
  },
  {
    id: 'WelfareCare',
    code: '06',
    indexLabel: '06',
    title: 'E-Kebajikan',
    subtitle: 'Tiket 2-Hala & Food Bank',
    gateLabel: 'PRIHATIN SISWA • LIVE CHAT TIKET & FOOD BANK',
    durationInFrames: 750,
    startFrame: 3102,
    transitionOut: 'depth-lift',
  },
  {
    id: 'ClubsEms',
    code: '07',
    indexLabel: '07',
    title: '21 Kelab & e-Sijil',
    subtitle: '21 Kelab, AJK & e-Sijil Rasmi',
    gateLabel: '17:00 PETANG • 21 KELAB, AJK & E-SIJIL',
    durationInFrames: 762,
    startFrame: 3810,
    transitionOut: 'warm-light-sweep',
  },
  {
    id: 'ImpactNumbers',
    code: '08',
    indexLabel: '08',
    title: 'Komuniti Siswa',
    subtitle: 'Komuniti Aktif POLISAS',
    gateLabel: 'KOMUNITI HIDUP • 2,841+ SISWA BERDAFTAR',
    durationInFrames: 570,
    startFrame: 4572,
    transitionOut: 'orbital-iris',
  },
  {
    id: 'ClosingVault',
    code: '09',
    indexLabel: '09',
    title: 'Imbas & Masuk',
    subtitle: 'Akses Serta-Merta Portal',
    gateLabel: 'AKSES SERTA-MERTA • IMBAS QR SEKARANG',
    durationInFrames: 1020,
    startFrame: 5100,
    transitionOut: null,
  },
];

export const LAUNCH_TOTAL_FRAMES = 6120;

export const LaunchShowcaseSchema = z.object({
  institutionName: z.string().default('POLITEKNIK SULTAN HAJI AHMAD SHAH'),
  councilName: z.string().default('JAWATANKUASA PERWAKILAN PELAJAR'),
  sessionLabel: z.string().default('SESI AKADEMIK 2026/2027'),
  headlinePrimary: z.string().default('Baru Masuk POLISAS? Satu App Untuk Semua.'),
  headlineItalic: z.string().default('Satu Kampus. Satu SuperApp Mahasiswa POLISAS.'),
  portalUrl: z.string().default('https://jpp.polisas.edu.my'),
  bgmSrc: z.string().default(''),
  bgmVolume: z.number().min(0).max(1).default(0.35),
  stats: z
    .object({
      clubsCount: z.number().default(21),
      activitiesCount: z.number().default(41),
      studentsCount: z.number().default(2841),
      productsCount: z.number().default(277),
      ordersCount: z.number().default(344),
    })
    .default({
      clubsCount: 21,
      activitiesCount: 41,
      studentsCount: 2841,
      productsCount: 277,
      ordersCount: 344,
    }),
});

export type LaunchShowcaseProps = z.infer<typeof LaunchShowcaseSchema>;

export const DEFAULT_LAUNCH_PROPS: LaunchShowcaseProps = LaunchShowcaseSchema.parse({});
