import React from 'react';
import {
  Easing,
  Interactive,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Compass,
  Cpu,
  Download,
  FileCheck2,
  Flame,
  Gamepad2,
  Heart,
  Landmark,
  LayoutGrid,
  Palette,
  Shield,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { KineticReveal, KineticWords } from '../motion/KineticTypography';
import {
  EvolvingPath,
  GeometricSparkBurst,
  GhostCursor,
  type GhostCursorKeyframe,
} from '../motion/MotionActors';
import {
  MODULE_CONTENT_ENTER_OFFSET,
  Module3DIntroBumper,
} from '../motion/Module3DIntroBumper';
import { WHIP_S_CURVE } from '../motion/transitions';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE, LUXURY_SPRING } from '../tokens';
import { SpatialFloorGrid } from '../ui/KineticCard';

const BLUE = LAUNCH_MODULE_THEMES.kelab.primary; // #3B82F6
const BLUE_DARK = LAUNCH_MODULE_THEMES.kelab.dark; // #2563EB
const BLUE_INK = '#1D4ED8';
const BLUE_SOFT = LAUNCH_MODULE_THEMES.kelab.soft; // #EFF6FF
const BLUE_BORDER = LAUNCH_MODULE_THEMES.kelab.border; // #BFDBFE

const INDIGO = LAUNCH_MODULE_THEMES.takwim.primary; // #6366F1
const INDIGO_INK = '#4338CA';
const INDIGO_SOFT = LAUNCH_MODULE_THEMES.takwim.soft;

const EMERALD = LAUNCH_MODULE_THEMES.polymaps.primary; // #10B981
const EMERALD_INK = '#047857';
const EMERALD_SOFT = LAUNCH_MODULE_THEMES.polymaps.soft;
const EMERALD_BORDER = LAUNCH_MODULE_THEMES.polymaps.border;

const AMBER = LAUNCH_MODULE_THEMES.polymart.primary; // #F59E0B
const AMBER_DARK = LAUNCH_MODULE_THEMES.polymart.dark;
const AMBER_INK = '#B45309';
const AMBER_SOFT = LAUNCH_MODULE_THEMES.polymart.soft;
const AMBER_BORDER = LAUNCH_MODULE_THEMES.polymart.border;

const CYAN = LAUNCH_MODULE_THEMES.polyrent.primary; // #06B6D4
const CYAN_INK = '#0E7490';
const CYAN_SOFT = LAUNCH_MODULE_THEMES.polyrent.soft;

const PURPLE = LAUNCH_MODULE_THEMES.meritQr.primary; // #A855F7
const PURPLE_INK = '#7E22CE';
const PURPLE_SOFT = LAUNCH_MODULE_THEMES.meritQr.soft;

const PINK = LAUNCH_MODULE_THEMES.ems.primary; // #EC4899
const PINK_DARK = LAUNCH_MODULE_THEMES.ems.dark;
const PINK_INK = '#BE185D';
const PINK_SOFT = LAUNCH_MODULE_THEMES.ems.soft;
const PINK_BORDER = LAUNCH_MODULE_THEMES.ems.border;

const ROSE = LAUNCH_MODULE_THEMES.polysuara.primary; // #F43F5E
const ROSE_INK = '#BE123C';
const ROSE_SOFT = LAUNCH_MODULE_THEMES.polysuara.soft;

const TEAL = LAUNCH_PALETTE.SECONDARY; // #0D9488
const TEAL_INK = '#0F766E';
const TEAL_SOFT = '#F0FDFA';

const O = MODULE_CONTENT_ENTER_OFFSET; // 132f bumper handoff

export type ClubsEmsProps = {
  readonly clubsCount: number;
  readonly activitiesCount: number;
  readonly certSerial: string;
};

type ClubIconKind =
  | 'building'
  | 'zap'
  | 'food'
  | 'compass'
  | 'cpu'
  | 'briefcase'
  | 'gamepad'
  | 'trophy'
  | 'shield'
  | 'palette'
  | 'heart'
  | 'users'
  | 'flame'
  | 'sparkles';

type OfficialClubSpec = {
  readonly shortName: string;
  readonly fullName: string;
  readonly category: 'Akademik' | 'Sukan' | 'Uniform' | 'Awam';
  readonly members: number;
  readonly merit: number;
  readonly summary: string;
  readonly color: string;
  readonly ink: string;
  readonly soft: string;
  readonly iconKind: ClubIconKind;
};

/**
 * All 21 official POLISAS clubs sourced verbatim from `20260621072500_seed_default_clubs.sql`.
 */
const ALL_21_POLISAS_CLUBS: readonly OfficialClubSpec[] = [
  {
    shortName: 'PePKa',
    fullName: 'Persatuan Pelajar Kejuruteraan Awam',
    category: 'Akademik',
    members: 310,
    merit: 20,
    summary: 'Persatuan akademik rasmi mahasiswa Jabatan Kejuruteraan Awam.',
    color: ROSE,
    ink: ROSE_INK,
    soft: ROSE_SOFT,
    iconKind: 'building',
  },
  {
    shortName: 'Elektron',
    fullName: 'Kelab Elektron (JKE)',
    category: 'Akademik',
    members: 295,
    merit: 20,
    summary: 'Persatuan akademik teras pelajar Jabatan Kejuruteraan Elektrik.',
    color: BLUE,
    ink: BLUE_INK,
    soft: BLUE_SOFT,
    iconKind: 'zap',
  },
  {
    shortName: 'Ketema',
    fullName: 'Kelab Teknologi Makanan',
    category: 'Akademik',
    members: 185,
    merit: 20,
    summary: 'Komuniti inovasi makanan halal & kejuruteraan proses JTM.',
    color: EMERALD,
    ink: EMERALD_INK,
    soft: EMERALD_SOFT,
    iconKind: 'food',
  },
  {
    shortName: 'Geosas',
    fullName: 'Kelab Geomatik POLISAS',
    category: 'Akademik',
    members: 140,
    merit: 20,
    summary: 'Kelab pemetaan ukur tanah & geospatial mahasiswa JKA.',
    color: TEAL,
    ink: TEAL_INK,
    soft: TEAL_SOFT,
    iconKind: 'compass',
  },
  {
    shortName: 'MESS',
    fullName: 'Mechanical Student Society',
    category: 'Akademik',
    members: 320,
    merit: 20,
    summary: 'Persatuan kejuruteraan mekanikal & automotif Jabatan JKM.',
    color: AMBER,
    ink: AMBER_INK,
    soft: AMBER_SOFT,
    iconKind: 'cpu',
  },
  {
    shortName: 'Commerce',
    fullName: 'Commerce Club POLISAS',
    category: 'Akademik',
    members: 275,
    merit: 20,
    summary: 'Persatuan akauntansi, logistik & perdagangan pelajar JP.',
    color: PURPLE,
    ink: PURPLE_INK,
    soft: PURPLE_SOFT,
    iconKind: 'briefcase',
  },
  {
    shortName: 'E-Sport',
    fullName: 'Kelab E-Sport POLISAS',
    category: 'Sukan',
    members: 240,
    merit: 25,
    summary: 'Arena kejohanan e-sukan kampus & liga Politeknik Malaysia.',
    color: BLUE,
    ink: BLUE_INK,
    soft: BLUE_SOFT,
    iconKind: 'gamepad',
  },
  {
    shortName: 'Robosas',
    fullName: 'Kelab Robotik (Robosas)',
    category: 'Awam',
    members: 165,
    merit: 30,
    summary: 'Pasukan inovasi robotik, IoT & kejuruteraan pertandingan FIRA.',
    color: INDIGO,
    ink: INDIGO_INK,
    soft: INDIGO_SOFT,
    iconKind: 'cpu',
  },
  {
    shortName: 'Orasas',
    fullName: 'Outdoor Recreation & Adventure',
    category: 'Sukan',
    members: 205,
    merit: 20,
    summary: 'Ekspedisi mendaki, berkayak & aktiviti rekreasi lasak pelajar.',
    color: CYAN,
    ink: CYAN_INK,
    soft: CYAN_SOFT,
    iconKind: 'compass',
  },
  {
    shortName: 'Silat Olahraga',
    fullName: 'Kelab Silat Olahraga POLISAS',
    category: 'Sukan',
    members: 120,
    merit: 25,
    summary: 'Latihan seni mempertahankan diri & gelanggang kejuaraan MSK.',
    color: ROSE,
    ink: ROSE_INK,
    soft: ROSE_SOFT,
    iconKind: 'trophy',
  },
  {
    shortName: 'SRC',
    fullName: 'Sports & Recreation Club',
    category: 'Sukan',
    members: 260,
    merit: 20,
    summary: 'Pengurusan acara sukan massa, futsal & karnival kampus.',
    color: EMERALD,
    ink: EMERALD_INK,
    soft: EMERALD_SOFT,
    iconKind: 'trophy',
  },
  {
    shortName: 'Kebudayaan',
    fullName: 'Kelab Kebudayaan & Kesenian',
    category: 'Awam',
    members: 195,
    merit: 25,
    summary: 'Persembahan teater, muzik warisan & tari rasmi istiadat POLISAS.',
    color: PINK,
    ink: PINK_INK,
    soft: PINK_SOFT,
    iconKind: 'palette',
  },
  {
    shortName: 'Silat Cekak',
    fullName: 'Kelab Seni Silat Cekak Malaysia',
    category: 'Awam',
    members: 112,
    merit: 20,
    summary: 'Warisan seni silat tradisional berdisiplin mahasiswa POLISAS.',
    color: INDIGO,
    ink: INDIGO_INK,
    soft: INDIGO_SOFT,
    iconKind: 'shield',
  },
  {
    shortName: 'YES',
    fullName: 'Young Entrepreneurs Society',
    category: 'Awam',
    members: 230,
    merit: 25,
    summary: 'Inkubator usahawan pelajar & pengendalian tapak niaga PolyMart.',
    color: AMBER,
    ink: AMBER_INK,
    soft: AMBER_SOFT,
    iconKind: 'sparkles',
  },
  {
    shortName: 'KMP',
    fullName: 'Kelab Mahasiswa Prihatin',
    category: 'Awam',
    members: 215,
    merit: 25,
    summary: 'Skuad kebajikan, kemanusiaan & sokongan komuniti Food Bank.',
    color: PINK,
    ink: PINK_INK,
    soft: PINK_SOFT,
    iconKind: 'heart',
  },
  {
    shortName: 'PRSP',
    fullName: 'Pasukan Rakan Siswa Pemikir',
    category: 'Awam',
    members: 155,
    merit: 25,
    summary: 'Pembimbing rakan sebaya & kesihatan mental bersama kaunselor.',
    color: TEAL,
    ink: TEAL_INK,
    soft: TEAL_SOFT,
    iconKind: 'users',
  },
  {
    shortName: 'ICS',
    fullName: 'Islamic Center Society (ICS)',
    category: 'Awam',
    members: 290,
    merit: 20,
    summary: 'Kelab kerohanian, majlis ilmu & penghayatan Islam di Pusat Islam.',
    color: EMERALD,
    ink: EMERALD_INK,
    soft: EMERALD_SOFT,
    iconKind: 'heart',
  },
  {
    shortName: 'BOMBA',
    fullName: 'Pasukan Bomba Sukarela POLISAS',
    category: 'Uniform',
    members: 138,
    merit: 30,
    summary: 'Pasukan tindak balas keselamatan kebakaran & latihan kecemasan.',
    color: ROSE,
    ink: ROSE_INK,
    soft: ROSE_SOFT,
    iconKind: 'flame',
  },
  {
    shortName: 'PANDU PUTERI',
    fullName: 'Pasukan Pandu Puteri Siswi',
    category: 'Uniform',
    members: 124,
    merit: 25,
    summary: 'Kepimpinan beliawanis, khidmat masyarakat & perkhemahan siswi.',
    color: BLUE,
    ink: BLUE_INK,
    soft: BLUE_SOFT,
    iconKind: 'users',
  },
  {
    shortName: 'WATANIAH',
    fullName: 'Pasukan Askar Wataniah POLISAS',
    category: 'Uniform',
    members: 190,
    merit: 30,
    summary: 'Pasukan simpanan tentera darat membentuk jati diri mahasiswa.',
    color: TEAL,
    ink: TEAL_INK,
    soft: TEAL_SOFT,
    iconKind: 'shield',
  },
  {
    shortName: 'PISPA',
    fullName: 'Pasukan Pertahanan Awam (PISPA)',
    category: 'Uniform',
    members: 175,
    merit: 30,
    summary: 'Pasukan beruniform bantuan bencana & pertolongan cemas rasmi.',
    color: AMBER,
    ink: AMBER_INK,
    soft: AMBER_SOFT,
    iconKind: 'shield',
  },
];

type CategoryTabSpec = {
  readonly id: string;
  readonly label: string;
  readonly count: number;
  readonly iconKind: 'all' | 'akademik' | 'sukan' | 'uniform' | 'umum';
};

const CLUB_CATEGORIES: readonly CategoryTabSpec[] = [
  { id: 'semua', label: 'Semua', count: 21, iconKind: 'all' },
  { id: 'akademik', label: 'Akademik', count: 6, iconKind: 'akademik' },
  { id: 'sukan', label: 'Sukan', count: 4, iconKind: 'sukan' },
  { id: 'uniform', label: 'Uniform', count: 4, iconKind: 'uniform' },
  { id: 'umum', label: 'Umum & Budaya', count: 7, iconKind: 'umum' },
];

const renderCategoryIcon = (kind: CategoryTabSpec['iconKind'], color: string) => {
  switch (kind) {
    case 'all':
      return <LayoutGrid size={12.5} color={color} strokeWidth={2.5} />;
    case 'akademik':
      return <BookOpen size={12.5} color={color} strokeWidth={2.5} />;
    case 'sukan':
      return <Trophy size={12.5} color={color} strokeWidth={2.5} />;
    case 'uniform':
      return <Shield size={12.5} color={color} strokeWidth={2.5} />;
    case 'umum':
      return <Heart size={12.5} color={color} strokeWidth={2.5} />;
  }
};

const renderClubBadgeIcon = (kind: ClubIconKind, size: number, color: string) => {
  switch (kind) {
    case 'building':
      return <Building2 size={size} color={color} strokeWidth={2.3} />;
    case 'zap':
      return <Zap size={size} color={color} strokeWidth={2.3} />;
    case 'food':
      return <UtensilsCrossed size={size} color={color} strokeWidth={2.3} />;
    case 'compass':
      return <Compass size={size} color={color} strokeWidth={2.3} />;
    case 'cpu':
      return <Cpu size={size} color={color} strokeWidth={2.3} />;
    case 'briefcase':
      return <Briefcase size={size} color={color} strokeWidth={2.3} />;
    case 'gamepad':
      return <Gamepad2 size={size} color={color} strokeWidth={2.3} />;
    case 'trophy':
      return <Trophy size={size} color={color} strokeWidth={2.3} />;
    case 'shield':
      return <Shield size={size} color={color} strokeWidth={2.3} />;
    case 'palette':
      return <Palette size={size} color={color} strokeWidth={2.3} />;
    case 'heart':
      return <Heart size={size} color={color} strokeWidth={2.3} />;
    case 'users':
      return <Users size={size} color={color} strokeWidth={2.3} />;
    case 'flame':
      return <Flame size={size} color={color} strokeWidth={2.3} />;
    case 'sparkles':
      return <Sparkles size={size} color={color} strokeWidth={2.3} />;
  }
};

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

// Cursor moves directly onto center-core Spotlight Card right column button `Mohon Barisan AJK` (1152, 367)
const CLUB_ROLE_CURSOR_KEYFRAMES: readonly GhostCursorKeyframe[] = [
  { frame: O + 110, x: 740, y: 310, label: 'PILIH KELAB' },
  { frame: O + 148, x: 1152, y: 367, click: true, label: 'MOHON BARISAN AJK' },
  { frame: O + 170, x: 1152, y: 367 },
];

const ClubsEmsInner: React.FC<ClubsEmsProps> = ({
  clubsCount,
  activitiesCount,
  certSerial,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeClubs = Math.max(21, Math.round(Number.isFinite(clubsCount) ? clubsCount : 21));
  const safeActivities = Math.max(1, Math.round(Number.isFinite(activitiesCount) ? activitiesCount : 41));
  const safeSerial = certSerial.trim() || 'EMS-CERT-2026-9041';
  const timeSec = frame / safeFps;

  // Seamless continuous handoff from Mode F orbital burst (`124..158f`) -> 0 hard cut!
  const orbitRingReveal = interpolate(frame, [124, 156], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  // Core card rises immediately after Mode F bumper award icon clears the center zone (O+26..O+48)
  const contentRevealT = interpolate(frame, [O + 26, O + 48], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  const wordStagger = Math.max(2, Math.round(0.05 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.32 * safeFps));

  // Cycle active category pill & Spotlight Club smoothly before click
  let activeCategoryIndex = 0;
  if (frame >= O + 24 && frame < O + 50) activeCategoryIndex = 1;
  else if (frame >= O + 50 && frame < O + 76) activeCategoryIndex = 2;
  else if (frame >= O + 76 && frame < O + 98) activeCategoryIndex = 3;

  // Featured Spotlight club switches cleanly from Kelab E-Sport (idx 6) to Robosas Robotik (idx 7)
  const featuredClubIdx = frame >= O + 96 ? 7 : 6;
  const featuredClub = ALL_21_POLISAS_CLUBS[featuredClubIdx];
  const secondaryJoinedClub = ALL_21_POLISAS_CLUBS[6];

  const ajkConfirmed = frame >= O + 148;
  const confirmStampSpring = ajkConfirmed
    ? spring({ frame: frame - (O + 148), fps: safeFps, config: LUXURY_SPRING })
    : 0;

  // SHOT 1 -> SHOT 2: Central 3D Hub of the 21-Club Ring flips 180-deg into Giant Digital e-Certificate
  const flipPhaseT = interpolate(frame, [O + 336, O + 396], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  const flipDeg = interpolate(flipPhaseT, [0, 1], [0, 180], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const isCertActive = flipPhaseT >= 0.5;

  const coreWidth = interpolate(flipPhaseT, [0, 1], [840, 1020], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const coreHeight = interpolate(flipPhaseT, [0, 1], [430, 500], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Ring geometry expands gracefully as the center core flips into e-Certificate halo
  const rx = interpolate(flipPhaseT, [0, 1], [740, 820], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ry = interpolate(flipPhaseT, [0, 1], [248, 282], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rz = interpolate(flipPhaseT, [0, 1], [320, 350], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stageRotX = interpolate(flipPhaseT, [0, 1], [3, 2.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const stageRotY = interpolate(flipPhaseT, [0, 1], [0, -4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Foil sheen across Hero e-Certificate (`O+412 .. O+488`)
  const foilLeftPct = interpolate(frame, [O + 412, O + 488], [-45, 135], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });
  const foilOpacity = interpolate(frame, [O + 412, O + 428, O + 468, O + 488], [0, 0.52, 0.52, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const liveDotScale = 0.86 + Math.sin(timeSec * 4.8) * 0.16;
  const orbitRotation = timeSec * 0.68;

  // Depth-sorted 21 orbital nodes so far-hemisphere sits behind core (zIndex 2) and front rim clears reading zone cleanly
  const orbitalNodes = ALL_21_POLISAS_CLUBS.map((club, idx) => {
    const angle = (idx / ALL_21_POLISAS_CLUBS.length) * Math.PI * 2 + orbitRotation;
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);
    const dx = cosA * rx;
    const baseDy = sinA * ry;
    const dz = sinA * rz;
    const depthNorm = (sinA + 1) * 0.5;
    const isFeatured = idx === featuredClubIdx || idx === 6;

    // Smooth vertical parting away from center card text corridor whenever passing front middle
    const horizHalfGuard = isCertActive ? 460 : 390;
    const inFrontReadingBand = sinA > 0.22 && Math.abs(dx) < horizHalfGuard;
    const edgeProximity = inFrontReadingBand ? 1 - Math.abs(dx) / horizHalfGuard : 0;
    const extraPushDown = edgeProximity * (isCertActive ? 42 : 34);
    const dy = baseDy + extraPushDown;

    // Gentle front dimming directly below card rim so central e-Certificate / Spotlight never gets obscured
    const baseOpacity = sinA < 0 ? 0.52 + depthNorm * 0.34 : 0.72 + depthNorm * 0.26;
    const finalOpacity =
      orbitRingReveal * (sinA > 0.35 && Math.abs(dx) < horizHalfGuard * 0.78 ? baseOpacity * 0.52 : baseOpacity);

    return {
      club,
      idx,
      dx,
      dy,
      dz,
      sinA,
      depthNorm,
      isFeatured,
      scale: 0.68 + depthNorm * 0.36,
      opacity: finalOpacity,
    };
  });

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.kelab.tint} />

      <Module3DIntroBumper
        moduleIndex="MODUL 07"
        moduleCategory="21 KELAB & E-SIJIL"
        moduleName="21 e-Kelab"
        tagline="Sertai 21 Kelab, Mohon AJK & Jana e-Sijil"
        morphMode="constellation-burst-21-clubs"
        accentColor={LAUNCH_MODULE_THEMES.kelab.primary}
        darkColor={LAUNCH_MODULE_THEMES.kelab.dark}
        softColor={LAUNCH_MODULE_THEMES.kelab.soft}
        borderColor={LAUNCH_MODULE_THEMES.kelab.border}
        icon={<Award size={96} color="#FFFFFF" strokeWidth={2.1} />}
        features={[
          { icon: <Landmark size={15} strokeWidth={2.4} />, label: '21 Kelab Aktif' },
          { icon: <Users size={15} strokeWidth={2.4} />, label: 'Ahli & Barisan AJK' },
          { icon: <FileCheck2 size={15} strokeWidth={2.4} />, label: 'e-Sijil Rasmi PDF' },
        ]}
      />

      <CameraStage
        zoomFrom={0.995}
        zoomTo={1.018}
        panXFrom={0}
        panXTo={0}
        panYFrom={3}
        panYTo={-3}
        tiltXFrom={0}
        tiltXTo={0}
        tiltYFrom={-0.35}
        tiltYTo={0.35}
        breathingAmplitude={0.35}
        entryZoomOffset={0.024}
        entryPanXOffset={24}
        entryFrames={Math.round(0.45 * safeFps)}
        exitZoomDelta={0.015}
        exitFrames={Math.round(0.35 * safeFps)}
        clip
      >
        <div style={{ position: 'absolute', inset: 0 }}>
          <SpatialFloorGrid
            accentColor={isCertActive ? PINK : BLUE}
            secondaryColor={PURPLE}
            gridOpacity={0.22}
            scrollSpeed={15}
          />

          {/* Top Editorial Header Lockup */}
          <div
            style={{
              position: 'absolute',
              left: 88,
              right: 88,
              top: 72,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 28,
              fontFamily: LAUNCH_FONTS.DISPLAY,
              opacity: contentRevealT,
              transform: `translate3d(0px, ${((1 - contentRevealT) * 20).toFixed(2)}px, 0px)`,
              zIndex: 16,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 1260 }}>
              <KineticReveal startFrame={O + 4} durationFrames={18}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 14px',
                    borderRadius: 999,
                    backgroundColor: isCertActive ? PINK_SOFT : BLUE_SOFT,
                    border: `1.5px solid ${isCertActive ? PINK_BORDER : BLUE_BORDER}`,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: isCertActive ? PINK : BLUE,
                      transform: `scale(${liveDotScale.toFixed(3)})`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: '0.14em',
                      color: isCertActive ? PINK_INK : BLUE_INK,
                    }}
                  >
                    BAB 07 • {safeClubs} KELAB RASMI, AJK &amp; E-SIJIL ({safeActivities} AKTIVITI)
                  </span>
                </div>
              </KineticReveal>

              <KineticWords
                as="h1"
                text="Sertai 21 Kelab Aktif & Terus Jana e-Sijil Rasmi."
                startFrame={O + 8}
                staggerFrames={wordStagger}
                wordDurationFrames={wordDuration}
                accentWords={['21', 'Kelab', 'e-Sijil']}
                accentColor={isCertActive ? PINK_INK : BLUE_INK}
                style={{
                  margin: 0,
                  fontSize: 42,
                  fontWeight: 900,
                  letterSpacing: '-0.032em',
                  lineHeight: 1.07,
                  color: LAUNCH_PALETTE.PRIMARY,
                }}
              />
            </div>

            <KineticReveal startFrame={O + 18} durationFrames={22}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 18px',
                  borderRadius: 16,
                  backgroundColor: isCertActive ? PINK_SOFT : LAUNCH_PALETTE.CARD_BG,
                  border: `1.5px solid ${isCertActive ? PINK_BORDER : BLUE_BORDER}`,
                  boxShadow: '0 12px 26px rgba(6, 23, 20, 0.08)',
                }}
              >
                <Award
                  size={18}
                  color={isCertActive ? PINK_INK : BLUE_INK}
                  strokeWidth={2.5}
                />
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: '0.07em',
                    color: isCertActive ? PINK_INK : LAUNCH_PALETTE.PRIMARY,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isCertActive
                    ? `SIJIL #${safeSerial} • SEDIA`
                    : ajkConfirmed
                      ? '2 / 21 KELAB DISERTAI (+135 MERIT) ✓'
                      : `${safeClubs} KELAB POLISAS ORBIT AKTIF`}
                </span>
              </div>
            </KineticReveal>
          </div>

          {/* CONTINUOUS 3D SPINNING 21-CLUB PLANETARY RING + CENTER 180-DEG E-CERTIFICATE STAGE */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 204,
              height: 764,
              perspective: '1750px',
              transformStyle: 'preserve-3d',
              fontFamily: LAUNCH_FONTS.DISPLAY,
              zIndex: 8,
            }}
          >
            {/* Glowing 3D Orbital Track Ellipse Behind Core (zIndex 1) */}
            <svg
              aria-hidden
              width={1840}
              height={680}
              viewBox="0 0 1840 680"
              style={{
                position: 'absolute',
                left: 40,
                top: 28,
                pointerEvents: 'none',
                opacity: orbitRingReveal * 0.72,
                zIndex: 1,
              }}
            >
              <ellipse
                cx={920}
                cy={340}
                rx={rx}
                ry={ry}
                fill="none"
                stroke={isCertActive ? PINK : BLUE}
                strokeOpacity={0.28}
                strokeWidth={2}
                strokeDasharray="10 10"
              />
              <ellipse
                cx={920}
                cy={340}
                rx={rx - 44}
                ry={ry - 22}
                fill="none"
                stroke={EMERALD}
                strokeOpacity={0.16}
                strokeWidth={1.5}
              />
            </svg>

            {/* BACK HEMISPHERE OF 21-CLUB ORBITAL RING (`sinA < 0`, cleanly behind Center Core at zIndex 2) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transformStyle: 'preserve-3d',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              {orbitalNodes
                .filter((n) => n.sinA < 0)
                .map(({ club, dx, dy, dz, scale, opacity }) => (
                  <div
                    key={`orbit-back-${club.shortName}`}
                    style={{
                      position: 'absolute',
                      left: 960 + dx,
                      top: 368 + dy,
                      height: 44,
                      marginLeft: -72,
                      marginTop: -22,
                      padding: '6px 13px 6px 8px',
                      borderRadius: 999,
                      backgroundColor: '#FFFFFF',
                      border: `1.5px solid ${club.color}`,
                      boxShadow: '0 12px 24px rgba(6, 23, 20, 0.1)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      opacity,
                      transform: `translate3d(0px, 0px, ${dz.toFixed(1)}px) scale(${scale.toFixed(4)})`,
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        backgroundColor: club.soft,
                        border: `1px solid ${club.color}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {renderClubBadgeIcon(club.iconKind, 14, club.ink)}
                    </span>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 900,
                        color: LAUNCH_PALETTE.PRIMARY,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {club.shortName}
                    </span>
                  </div>
                ))}
            </div>

            {/* CENTER 3D 2-FACE FLIP CORE (Beat 1: Active Club Spotlight <-> Beat 2: Giant 3D e-Certificate) */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 368,
                width: coreWidth,
                height: coreHeight,
                transformStyle: 'preserve-3d',
                opacity: contentRevealT,
                transform: `translate(-50%, -50%) rotateX(${stageRotX.toFixed(2)}deg) rotateY(${stageRotY.toFixed(2)}deg)`,
                zIndex: 10,
              }}
            >
              {/* FRONT FACE (0 -> 180deg): Active Club Spotlight & Role Selector (ZERO Bento Box!) */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 28,
                  backgroundColor: '#FFFFFF',
                  border: `2.5px solid ${ajkConfirmed ? EMERALD : BLUE}`,
                  borderBottom: `6px solid ${ajkConfirmed ? EMERALD_INK : BLUE_DARK}`,
                  boxShadow: ajkConfirmed
                    ? '0 32px 72px rgba(4, 120, 87, 0.18)'
                    : '0 32px 72px rgba(37, 99, 235, 0.16)',
                  backfaceVisibility: 'hidden',
                  opacity: flipDeg <= 91 ? 1 : 0,
                  transform: `rotateY(${flipDeg.toFixed(2)}deg)`,
                  transformStyle: 'preserve-3d',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* Clipped Top Accent Bar + Body Layout */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 25,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ height: 6, display: 'flex' }}>
                    <span style={{ flex: 1, backgroundColor: BLUE }} />
                    <span style={{ flex: 1, backgroundColor: INDIGO }} />
                    <span style={{ flex: 1, backgroundColor: EMERALD }} />
                    <span style={{ flex: 1, backgroundColor: PINK }} />
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    padding: '22px 26px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Top Bar: 5 Category Filter Tabs & Live 21-Club Orbital Quota */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'nowrap' }}>
                      {CLUB_CATEGORIES.map((cat, cIdx) => {
                        const isActive = cIdx === activeCategoryIndex;
                        return (
                          <div
                            key={cat.id}
                            style={{
                              padding: '6px 11px',
                              borderRadius: 999,
                              backgroundColor: isActive ? BLUE_DARK : LAUNCH_PALETTE.BACKGROUND,
                              border: `1.5px solid ${isActive ? BLUE_DARK : LAUNCH_PALETTE.TERTIARY}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {renderCategoryIcon(cat.iconKind, isActive ? '#FFFFFF' : BLUE_INK)}
                            <span
                              style={{
                                fontSize: 11.5,
                                fontWeight: 900,
                                color: isActive ? '#FFFFFF' : LAUNCH_PALETTE.PRIMARY,
                              }}
                            >
                              {cat.label}
                            </span>
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: 999,
                                backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : BLUE_SOFT,
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 10,
                                fontWeight: 900,
                                color: isActive ? '#FFFFFF' : BLUE_INK,
                              }}
                            >
                              {cat.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10.5,
                        fontWeight: 900,
                        color: EMERALD_INK,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {ajkConfirmed ? '2 / 21 KELAB AKTIF DISERTAI ✓' : '21 KELAB RASMI'}
                    </span>
                  </div>

                  {/* Main Spotlight Split Body: Active Rotating Club Focus (Left) + Role Selector (Right) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 18, flex: 1 }}>
                    {/* Left: Active Hologram Club Spotlight synced with spinning 21-club ring */}
                    <div
                      style={{
                        borderRadius: 20,
                        padding: '18px 20px',
                        backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                        border: `2px solid ${ajkConfirmed ? EMERALD : featuredClub.color}`,
                        boxShadow: '0 14px 28px rgba(6, 23, 20, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 10,
                        transform: 'translateZ(26px)',
                        backfaceVisibility: 'hidden',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: 16,
                              backgroundColor: featuredClub.soft,
                              border: `2px solid ${featuredClub.color}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {renderClubBadgeIcon(featuredClub.iconKind, 26, featuredClub.ink)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 10,
                                fontWeight: 900,
                                letterSpacing: '0.1em',
                                color: featuredClub.ink,
                              }}
                            >
                              {featuredClub.category.toUpperCase()} • FOKUS ORBIT
                            </span>
                            <span
                              style={{
                                fontSize: 21,
                                fontWeight: 900,
                                color: LAUNCH_PALETTE.PRIMARY,
                                lineHeight: 1.15,
                              }}
                            >
                              {featuredClub.fullName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: LAUNCH_PALETTE.MUTED_OLIVE,
                          lineHeight: 1.42,
                        }}
                      >
                        {featuredClub.summary}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span
                          style={{
                            padding: '5px 11px',
                            borderRadius: 999,
                            backgroundColor: '#FFFFFF',
                            border: `1.5px solid ${featuredClub.color}`,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 900,
                            color: featuredClub.ink,
                          }}
                        >
                          {featuredClub.members} AHLI AKTIF • +{featuredClub.merit} MERIT
                        </span>

                        <span
                          style={{
                            padding: '5px 10px',
                            borderRadius: 999,
                            backgroundColor: EMERALD_SOFT,
                            border: `1px solid ${EMERALD}`,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10,
                            fontWeight: 900,
                            color: EMERALD_INK,
                          }}
                        >
                          + {secondaryJoinedClub.shortName} AKTIF ✓
                        </span>
                      </div>
                    </div>

                    {/* Right: Interactive Role Application Selector (Ahli Biasa vs Mohon Barisan AJK) */}
                    <div
                      style={{
                        borderRadius: 20,
                        padding: '18px 20px',
                        backgroundColor: '#FFFFFF',
                        border: `2px solid ${ajkConfirmed ? EMERALD : BLUE_BORDER}`,
                        boxShadow: '0 18px 34px rgba(6, 23, 20, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 10,
                        transform: 'translateZ(36px)',
                        backfaceVisibility: 'hidden',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 900,
                            letterSpacing: '0.1em',
                            color: BLUE_INK,
                          }}
                        >
                          PILIH PERANAN KELAB
                        </span>
                        <Sparkles size={15} color={BLUE} strokeWidth={2.5} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div
                          style={{
                            padding: '11px 14px',
                            borderRadius: 13,
                            backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                            border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 800, color: LAUNCH_PALETTE.PRIMARY }}>
                            Mohon Ahli Biasa (+20 Merit)
                          </span>
                          <Check size={15} color={EMERALD_INK} strokeWidth={2.6} />
                        </div>

                        <div
                          style={{
                            padding: '12px 14px',
                            borderRadius: 13,
                            backgroundColor: ajkConfirmed ? EMERALD_INK : BLUE_DARK,
                            color: '#FFFFFF',
                            boxShadow: ajkConfirmed
                              ? '0 12px 24px rgba(4, 120, 87, 0.25)'
                              : '0 10px 20px rgba(37, 99, 235, 0.22)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transform: `scale(${(0.97 + 0.03 * confirmStampSpring).toFixed(4)})`,
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 900 }}>
                            {ajkConfirmed
                              ? 'Disahkan Barisan AJK (+30 Merit) ✓'
                              : 'Mohon Barisan AJK / Jawatankuasa'}
                          </span>
                          <Award size={16} color="#FEF08A" strokeWidth={2.5} />
                        </div>
                      </div>

                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10,
                          fontWeight: 800,
                          color: ajkConfirmed ? EMERALD_INK : LAUNCH_PALETTE.MUTED_OLIVE,
                        }}
                      >
                        {ajkConfirmed
                          ? 'AJK ROBOSAS & AHLI E-SPORT TERUS KE REKOD MERIT ✓'
                          : 'KLIK UNTUK SERTAI ORBIT KELAB & BARISAN KEPIMPINAN'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Reassurance Footer inside Center Core */}
                  <div
                    style={{
                      padding: '10px 18px',
                      borderRadius: 14,
                      backgroundColor: ajkConfirmed ? EMERALD_INK : LAUNCH_PALETTE.PRIMARY_DARK,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={15} color="#A7F3D0" strokeWidth={2.5} />
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 900,
                          letterSpacing: '0.07em',
                        }}
                      >
                        {ajkConfirmed
                          ? '2 / 21 KELAB DISERTAI • REKOD KOKURIKULUM & MATA MERIT AUTOMATIK (+135 MERIT) ✓'
                          : 'PILIH AHLI BIASA ATAU MOHON BARISAN AJK TERUS DARI ORBIT 21 KELAB'}
                      </span>
                    </div>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(255, 255, 255, 0.16)',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10.5,
                        fontWeight: 900,
                      }}
                    >
                      {safeActivities} AKTIVITI
                    </span>
                  </div>
                </div>
              </div>

              {/* BACK FACE (-180 -> 0deg): GIANT 3D DIGITAL E-CERTIFICATE INSIDE THE 21-CLUB ORBITAL HALO */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 30,
                  backgroundColor: '#FFFFFF',
                  border: `3px solid ${PINK}`,
                  borderBottom: `8px solid ${AMBER_DARK}`,
                  boxShadow: '0 40px 92px rgba(190, 24, 93, 0.22)',
                  backfaceVisibility: 'hidden',
                  opacity: flipDeg >= 89 ? 1 : 0,
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${(flipDeg - 180).toFixed(2)}deg)`,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    height: 8,
                    display: 'flex',
                    borderTopLeftRadius: 27,
                    borderTopRightRadius: 27,
                    overflow: 'hidden',
                  }}
                >
                  <span style={{ flex: 1, backgroundColor: BLUE }} />
                  <span style={{ flex: 1, backgroundColor: PURPLE }} />
                  <span style={{ flex: 1, backgroundColor: PINK }} />
                  <span style={{ flex: 1, backgroundColor: AMBER }} />
                </div>

                <div
                  style={{
                    flex: 1,
                    padding: '24px 34px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                    backfaceVisibility: 'hidden',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 14,
                          backgroundColor: PINK_SOFT,
                          border: `1.5px solid ${PINK_BORDER}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Award size={24} color={PINK_INK} strokeWidth={2.4} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 12,
                            fontWeight: 900,
                            letterSpacing: '0.13em',
                            color: PINK_INK,
                          }}
                        >
                          SIJIL DIGITAL RASMI • EMS JPP POLISAS
                        </span>
                        <span style={{ fontSize: 15.5, fontWeight: 800, color: LAUNCH_PALETTE.MUTED_OLIVE }}>
                          Politeknik Sultan Haji Ahmad Shah, Kuantan
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '7px 14px',
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                        border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12,
                        fontWeight: 900,
                        color: LAUNCH_PALETTE.PRIMARY,
                      }}
                    >
                      #{safeSerial}
                    </span>
                  </div>

                  {/* Awardee Block + Floating Gold/Magenta Medallion Seal */}
                  <div
                    style={{
                      padding: '22px 28px',
                      borderRadius: 22,
                      backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                      border: `2px solid ${AMBER_BORDER}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 24,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxWidth: 640 }}>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 900,
                          letterSpacing: '0.14em',
                          color: PURPLE_INK,
                        }}
                      >
                        ANUGERAH KEPIMPINAN &amp; PENYERTAAN AKTIF KELAB POLISAS
                      </span>
                      <span
                        style={{
                          fontSize: 36,
                          fontWeight: 900,
                          letterSpacing: '-0.025em',
                          color: LAUNCH_PALETTE.PRIMARY,
                          lineHeight: 1.08,
                        }}
                      >
                        AIMAN HAKIM BIN AZMAN
                      </span>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 13,
                          fontWeight: 800,
                          color: EMERALD_INK,
                        }}
                      >
                        NO. MATRIK: 02DAT24F1022 • AJK KELAB E-SPORT &amp; ROBOSAS
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: LAUNCH_PALETTE.MUTED_OLIVE, lineHeight: 1.35 }}>
                        Diperakui menyertai 2/21 Kelab Aktif POLISAS &amp; mengumpul +135 Mata Merit Kokurikulum Rasmi.
                      </span>
                    </div>

                    <div
                      style={{
                        width: 204,
                        padding: '18px 16px',
                        borderRadius: 22,
                        backgroundColor: '#FFFFFF',
                        border: `2.5px solid ${AMBER}`,
                        boxShadow: '0 22px 46px rgba(217, 119, 6, 0.24)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: 7,
                        backfaceVisibility: 'hidden',
                        transform: 'translateZ(45px)',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 999,
                          backgroundColor: AMBER_SOFT,
                          border: `2px solid ${AMBER}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ShieldCheck size={31} color={AMBER_INK} strokeWidth={2.5} />
                      </div>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 900,
                          letterSpacing: '0.09em',
                          color: AMBER_INK,
                        }}
                      >
                        DISAHKAN EMS ✓
                      </span>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 21,
                          fontWeight: 900,
                          color: PINK_INK,
                        }}
                      >
                        +135 MERIT
                      </span>
                    </div>
                  </div>

                  {/* Verified Digital Signature Stroke + PDF Download Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <EvolvingPath
                        d="M 10 26 Q 36 8 62 24 T 118 20 Q 138 14 156 24"
                        width={166}
                        height={38}
                        startFrame={O + 410}
                        durationFrames={34}
                        stroke={BLUE_INK}
                        strokeWidth={2.8}
                        hideDotWhenComplete
                      />
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: LAUNCH_PALETTE.MUTED_OLIVE }}>
                        Tandatangan digital disahkan • Terus simpan PDF
                      </span>
                    </div>

                    <div
                      style={{
                        padding: '11px 20px',
                        borderRadius: 15,
                        backgroundColor: PINK_DARK,
                        color: '#FFFFFF',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12.5,
                        fontWeight: 900,
                        letterSpacing: '0.07em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 14px 28px rgba(219, 39, 119, 0.28)',
                      }}
                    >
                      <Download size={15} strokeWidth={2.6} />
                      <span>Muat Turun PDF Rasmi Serta-Merta ✓</span>
                    </div>
                  </div>
                </div>

                {foilOpacity > 0.01 ? (
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 27,
                      overflow: 'hidden',
                      pointerEvents: 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '-40%',
                        left: `${foilLeftPct.toFixed(1)}%`,
                        width: '32%',
                        height: '180%',
                        background:
                          'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(251, 207, 232, 0.36) 46%, rgba(253, 230, 138, 0.45) 54%, rgba(255,255,255,0) 100%)',
                        transform: 'rotate(24deg)',
                        opacity: foilOpacity,
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* FRONT HEMISPHERE OF 21-CLUB ORBITAL RING (`sinA >= 0`, depth-sorted at zIndex 14 cleanly clear of Center Text!) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transformStyle: 'preserve-3d',
                pointerEvents: 'none',
                zIndex: 14,
              }}
            >
              {orbitalNodes
                .filter((n) => n.sinA >= 0)
                .map(({ club, dx, dy, dz, isFeatured, scale, opacity }) => (
                  <div
                    key={`orbit-front-${club.shortName}`}
                    style={{
                      position: 'absolute',
                      left: 960 + dx,
                      top: 368 + dy,
                      height: 46,
                      marginLeft: -76,
                      marginTop: -23,
                      padding: '6px 14px 6px 8px',
                      borderRadius: 999,
                      backgroundColor: '#FFFFFF',
                      border: `2px solid ${isFeatured ? EMERALD : club.color}`,
                      boxShadow: isFeatured
                        ? '0 18px 36px rgba(4, 120, 87, 0.22)'
                        : '0 14px 28px rgba(6, 23, 20, 0.14)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      opacity,
                      transform: `translate3d(0px, 0px, ${dz.toFixed(1)}px) scale(${scale.toFixed(4)})`,
                    }}
                  >
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        backgroundColor: club.soft,
                        border: `1.5px solid ${club.color}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {renderClubBadgeIcon(club.iconKind, 15, club.ink)}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: LAUNCH_PALETTE.PRIMARY,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {club.shortName}
                    </span>
                  </div>
                ))}
            </div>

            <GeometricSparkBurst
              triggerFrame={O + 150}
              x={1152}
              y={367}
              durationFrames={32}
              radius={92}
              count={12}
              seed="clubs-ajk-join-spark"
              colors={[BLUE, EMERALD, '#FFFFFF']}
            />
            <GeometricSparkBurst
              triggerFrame={O + 422}
              x={1240}
              y={360}
              durationFrames={34}
              radius={118}
              count={14}
              seed="clubs-cert-spark"
              colors={[PINK, AMBER, '#FFFFFF']}
            />

            <GhostCursor
              keyframes={CLUB_ROLE_CURSOR_KEYFRAMES}
              appearFrame={O + 110}
              disappearFrame={O + 170}
              color={LAUNCH_PALETTE.PRIMARY_DARK}
              rippleColor={BLUE}
            />
          </div>
        </div>
      </CameraStage>

      <EditorialFrameMarks
        chapterCode="07"
        chapterLabel="17:00 PETANG • 21 KELAB, AJK & E-SIJIL"
      />
    </>
  );
};

const clubsEmsSchema = {
  clubsCount: {
    type: 'number',
    default: 21,
    min: 1,
    max: 500,
    integer: true,
    hiddenFromList: false,
    description: 'Active Clubs Count',
  },
  activitiesCount: {
    type: 'number',
    default: 41,
    min: 1,
    max: 5000,
    integer: true,
    hiddenFromList: false,
    description: 'Student Activities Count',
  },
  certSerial: {
    type: 'string',
    default: 'EMS-CERT-2026-9041',
    description: 'Digital Certificate Serial Number',
  },
} as const satisfies InteractivitySchema;

export const ClubsEmsScene = Interactive.withSchema({
  Component: ClubsEmsInner,
  componentName: 'ClubsEmsScene',
  schema: clubsEmsSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
