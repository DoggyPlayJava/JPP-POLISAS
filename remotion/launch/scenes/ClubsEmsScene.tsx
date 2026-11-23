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
  Cpu,
  Download,
  FileCheck2,
  Gamepad2,
  Heart,
  Landmark,
  LayoutGrid,
  Shield,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
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
import { KineticWindow, SpatialFloorGrid } from '../ui/KineticCard';

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

const O = MODULE_CONTENT_ENTER_OFFSET; // 132f bumper handoff

export type ClubsEmsProps = {
  readonly clubsCount: number;
  readonly activitiesCount: number;
  readonly certSerial: string;
};

type CategoryTabSpec = {
  readonly id: string;
  readonly label: string;
  readonly count: number;
  readonly iconKind: 'all' | 'akademik' | 'sukan' | 'uniform' | 'umum';
};

const CLUB_CATEGORIES: readonly CategoryTabSpec[] = [
  { id: 'semua', label: 'Semua', count: 21, iconKind: 'all' },
  { id: 'akademik', label: 'Akademik', count: 5, iconKind: 'akademik' },
  { id: 'sukan', label: 'Sukan & E-Sport', count: 6, iconKind: 'sukan' },
  { id: 'uniform', label: 'Badan Beruniform', count: 4, iconKind: 'uniform' },
  { id: 'umum', label: 'Umum & Budaya', count: 6, iconKind: 'umum' },
];

type RealClubCardSpec = {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly members: number;
  readonly color: string;
  readonly ink: string;
  readonly soft: string;
  readonly iconKind: 'esport' | 'robosas' | 'pepka' | 'wataniah' | 'commerce' | 'ics';
  readonly z: number;
  readonly isSelected?: boolean;
};

const REAL_POLISAS_CLUBS: readonly RealClubCardSpec[] = [
  {
    id: 'esport',
    name: 'Kelab E-Sport POLISAS',
    category: 'Sukan Digital',
    members: 240,
    color: BLUE,
    ink: BLUE_INK,
    soft: BLUE_SOFT,
    iconKind: 'esport',
    z: 36,
    isSelected: true,
  },
  {
    id: 'robosas',
    name: 'Robosas Robotik',
    category: 'Akademik & Inovasi',
    members: 165,
    color: INDIGO,
    ink: INDIGO_INK,
    soft: INDIGO_SOFT,
    iconKind: 'robosas',
    z: 32,
    isSelected: true,
  },
  {
    id: 'pepka',
    name: 'PePKa POLISAS',
    category: 'Kejuruteraan Awam',
    members: 310,
    color: EMERALD,
    ink: EMERALD_INK,
    soft: EMERALD_SOFT,
    iconKind: 'pepka',
    z: 18,
  },
  {
    id: 'wataniah',
    name: 'Wataniah & PISPA',
    category: 'Badan Beruniform',
    members: 190,
    color: AMBER,
    ink: AMBER_INK,
    soft: AMBER_SOFT,
    iconKind: 'wataniah',
    z: 18,
  },
  {
    id: 'commerce',
    name: 'Commerce Club',
    category: 'Jabatan Perdagangan',
    members: 275,
    color: PURPLE,
    ink: PURPLE_INK,
    soft: PURPLE_SOFT,
    iconKind: 'commerce',
    z: 22,
  },
  {
    id: 'ics',
    name: 'ICS & Seni Budaya',
    category: 'Sukarelawan & Budaya',
    members: 220,
    color: ROSE,
    ink: ROSE_INK,
    soft: ROSE_SOFT,
    iconKind: 'ics',
    z: 22,
  },
];

const renderCategoryIcon = (kind: CategoryTabSpec['iconKind'], color: string) => {
  switch (kind) {
    case 'all':
      return <LayoutGrid size={13} color={color} strokeWidth={2.5} />;
    case 'akademik':
      return <BookOpen size={13} color={color} strokeWidth={2.5} />;
    case 'sukan':
      return <Trophy size={13} color={color} strokeWidth={2.5} />;
    case 'uniform':
      return <Shield size={13} color={color} strokeWidth={2.5} />;
    case 'umum':
      return <Heart size={13} color={color} strokeWidth={2.5} />;
  }
};

const renderClubIcon = (kind: RealClubCardSpec['iconKind'], size: number, color: string) => {
  switch (kind) {
    case 'esport':
      return <Gamepad2 size={size} color={color} strokeWidth={2.3} />;
    case 'robosas':
      return <Cpu size={size} color={color} strokeWidth={2.3} />;
    case 'pepka':
      return <Building2 size={size} color={color} strokeWidth={2.3} />;
    case 'wataniah':
      return <Shield size={size} color={color} strokeWidth={2.3} />;
    case 'commerce':
      return <Briefcase size={size} color={color} strokeWidth={2.3} />;
    case 'ics':
      return <Heart size={size} color={color} strokeWidth={2.3} />;
  }
};

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

// Cursor hovers Robosas/AJK popover across O+116..O+172 (248..304f) and exits before f_4150 (local 340f!)
const CLUB_ROLE_CURSOR_KEYFRAMES: readonly GhostCursorKeyframe[] = [
  { frame: O + 116, x: 520, y: 310, label: 'PILIH KELAB' },
  { frame: O + 148, x: 1260, y: 336, click: true, label: 'MOHON BARISAN AJK' },
  { frame: O + 170, x: 1260, y: 336 },
];

const ClubsEmsInner: React.FC<ClubsEmsProps> = ({
  clubsCount,
  activitiesCount,
  certSerial,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeClubs = Math.max(1, Math.round(Number.isFinite(clubsCount) ? clubsCount : 21));
  const safeActivities = Math.max(1, Math.round(Number.isFinite(activitiesCount) ? activitiesCount : 41));
  const safeSerial = certSerial.trim() || 'EMS-CERT-2026-9041';
  const timeSec = frame / safeFps;

  // Seamless zero-flash bumper handoff (132..168f)
  const contentRevealT = interpolate(frame, [O, O + 36], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  // Header timing
  const wordStagger = Math.max(2, Math.round(0.05 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.32 * safeFps));

  // Category filter sweep preview (local 156..232f) settling cleanly back on `Semua (21)` before f_4150
  let activeCategoryIndex = 0;
  if (frame >= O + 30 && frame < O + 54) activeCategoryIndex = 1;
  else if (frame >= O + 54 && frame < O + 78) activeCategoryIndex = 2;
  else if (frame >= O + 78 && frame < O + 100) activeCategoryIndex = 3;

  // Role Selector popover opens (O+118..O+154) -> AJK Confirmed at O+148 (280f -> settled before f_4150 / local 340f!)
  const roleModalSpring =
    frame >= O + 118
      ? spring({ frame: frame - (O + 118), fps: safeFps, config: LUXURY_SPRING })
      : 0;
  const ajkConfirmed = frame >= O + 148;
  const confirmStampSpring = ajkConfirmed
    ? spring({ frame: frame - (O + 148), fps: safeFps, config: LUXURY_SPRING })
    : 0;

  // SHOT 1 -> SHOT 2 True 2-Face 180-deg Y-Axis Card Flip into e-Certificate (local 468..528f -> sharp at f=4450 / local 640f!)
  const flipPhaseT = interpolate(frame, [O + 336, O + 396], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  const flipDeg = interpolate(flipPhaseT, [0, 1], [0, 180]);
  const isCertActive = flipPhaseT >= 0.5;

  const stageRotX = interpolate(flipPhaseT, [0, 1], [3, 2.5]);
  const stageRotY = interpolate(flipPhaseT, [0, 1], [0, -4]);

  // Foil sheen across Hero e-Certificate (O+412 .. O+488 = 544..620f -> settled clean before f_4450!)
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: contentRevealT,
            transform: `translate3d(0px, ${((1 - contentRevealT) * 22).toFixed(2)}px, 0px) scale(${interpolate(contentRevealT, [0, 1], [0.96, 1]).toFixed(4)})`,
          }}
        >
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
              zIndex: 14,
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
                      ? '2/2 KELAB DISERTAI (+135 MERIT) ✓'
                      : `${safeClubs} KELAB POLISAS AKTIF`}
                </span>
              </div>
            </KineticReveal>
          </div>

          {/* 2-FACE 180-DEGREE 3D HUB <-> E-CERTIFICATE STAGE */}
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
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 1120,
                height: 620,
                transformStyle: 'preserve-3d',
                transform: `translate(-50%, -50%) rotateX(${stageRotX.toFixed(2)}deg) rotateY(${stageRotY.toFixed(2)}deg)`,
              }}
            >
              {/* FRONT FACE (0 -> 180deg): 21-Club Explorer Hub + Interactive Ahli/AJK Role Selector */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  opacity: flipDeg <= 91 ? 1 : 0,
                  transform: `rotateY(${flipDeg.toFixed(2)}deg)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                <KineticWindow
                  surface="light"
                  routeLabel="/portal/kelab • direktori 21 kelab POLISAS"
                  statusPill={ajkConfirmed ? 'AJK & AHLI DISAHKAN ✓' : '21 KELAB AKTIF'}
                  statusAccent={ajkConfirmed}
                  accentColor={ajkConfirmed ? EMERALD : BLUE}
                  accentSoftBg={ajkConfirmed ? EMERALD_SOFT : BLUE_SOFT}
                  accentBorderColor={ajkConfirmed ? EMERALD_BORDER : BLUE_BORDER}
                  width={1120}
                  height={620}
                  sheenStartFrame={O + 150}
                  sheenDuration={36}
                  style={{
                    borderBottom: `7px solid ${ajkConfirmed ? EMERALD : BLUE}`,
                    boxShadow: '0 34px 76px rgba(37, 99, 235, 0.16)',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      flex: 1,
                      padding: '18px 24px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 14,
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* Top 5 Category Tabs Bar modeled on KelabPage.tsx */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {CLUB_CATEGORIES.map((cat, idx) => {
                          const isTabActive = idx === activeCategoryIndex;
                          return (
                            <div
                              key={cat.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 7,
                                padding: '8px 14px',
                                borderRadius: 999,
                                backgroundColor: isTabActive ? BLUE_DARK : LAUNCH_PALETTE.BACKGROUND,
                                border: `1.5px solid ${isTabActive ? BLUE_DARK : LAUNCH_PALETTE.TERTIARY}`,
                                color: isTabActive ? '#FFFFFF' : LAUNCH_PALETTE.PRIMARY,
                                fontSize: 12.5,
                                fontWeight: 900,
                              }}
                            >
                              {renderCategoryIcon(cat.iconKind, isTabActive ? '#FFFFFF' : BLUE_INK)}
                              <span>{cat.label}</span>
                              <span
                                style={{
                                  padding: '2px 7px',
                                  borderRadius: 999,
                                  backgroundColor: isTabActive ? 'rgba(255,255,255,0.2)' : BLUE_SOFT,
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 10.5,
                                  fontWeight: 900,
                                  color: isTabActive ? '#FFFFFF' : BLUE_INK,
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
                        KUOTA: {ajkConfirmed ? '2 / 2 KELAB PENUH ✓' : '0 / 2 KELAB'}
                      </span>
                    </div>

                    {/* 3x2 3D Layered Club Cards Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 14,
                        transformStyle: 'preserve-3d',
                      }}
                    >
                      {REAL_POLISAS_CLUBS.map((club, idx) => {
                        const cardSpring = spring({
                          frame: Math.max(0, frame - (O + 8 + idx * 5)),
                          fps: safeFps,
                          config: LUXURY_SPRING,
                        });
                        const joined = club.isSelected && ajkConfirmed;
                        return (
                          <div
                            key={club.id}
                            style={{
                              padding: '16px 18px',
                              borderRadius: 20,
                              backgroundColor: joined ? '#FFFFFF' : LAUNCH_PALETTE.BACKGROUND,
                              border: `2px solid ${joined ? EMERALD : club.color}`,
                              borderBottom: `5px solid ${joined ? EMERALD_INK : club.ink}`,
                              boxShadow: joined
                                ? '0 18px 34px rgba(4, 120, 87, 0.16)'
                                : '0 12px 24px rgba(6, 23, 20, 0.08)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: 12,
                              minHeight: 162,
                              opacity: cardSpring,
                              backfaceVisibility: 'hidden',
                              transform: `translateZ(${(club.z * cardSpring).toFixed(1)}px) scale(${(0.92 + 0.08 * cardSpring).toFixed(4)})`,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                              <div
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 14,
                                  backgroundColor: club.soft,
                                  border: `1.5px solid ${club.color}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {renderClubIcon(club.iconKind, 22, club.ink)}
                              </div>

                              <span
                                style={{
                                  padding: '4px 9px',
                                  borderRadius: 999,
                                  backgroundColor: joined ? EMERALD_SOFT : '#FFFFFF',
                                  border: `1px solid ${joined ? EMERALD_BORDER : LAUNCH_PALETTE.TERTIARY}`,
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 10,
                                  fontWeight: 900,
                                  color: joined ? EMERALD_INK : club.ink,
                                }}
                              >
                                {joined ? 'AHLI / AJK ✓' : `${club.members} AHLI`}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{ fontSize: 17.5, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                                {club.name}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: LAUNCH_PALETTE.MUTED_OLIVE }}>
                                {club.category} • +Merit &amp; Sijil
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Summary & Auto Co-Curricular Sync Strip */}
                    <div
                      style={{
                        padding: '12px 18px',
                        borderRadius: 16,
                        backgroundColor: ajkConfirmed ? EMERALD_INK : LAUNCH_PALETTE.PRIMARY_DARK,
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <CheckCircle2 size={17} color={EMERALD_BORDER} strokeWidth={2.5} />
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 12,
                            fontWeight: 900,
                            letterSpacing: '0.07em',
                          }}
                        >
                          {ajkConfirmed
                            ? '2/2 KELAB DISERTAI • REKOD KOKURIKULUM & MATA MERIT AUTOMATIK (+135 MERIT) ✓'
                            : 'PILIH AHLI BIASA ATAU MOHON BARISAN AJK TERUS DARI PORTAL'}
                        </span>
                      </div>
                      <span
                        style={{
                          padding: '4px 10px',
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

                    {/* Interactive Floating 3D Role Application Pop-Over (`KelabPage.tsx`) */}
                    {roleModalSpring > 0.02 ? (
                      <div
                        style={{
                          position: 'absolute',
                          right: 28,
                          top: 102,
                          width: 392,
                          padding: '18px 20px',
                          borderRadius: 22,
                          backgroundColor: '#FFFFFF',
                          border: `2.5px solid ${ajkConfirmed ? EMERALD : BLUE}`,
                          boxShadow: '0 28px 56px rgba(6, 23, 20, 0.28)',
                          opacity: roleModalSpring,
                          backfaceVisibility: 'hidden',
                          transform: `translateZ(72px) scale(${(0.9 + 0.1 * roleModalSpring).toFixed(4)})`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 11,
                          zIndex: 20,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11,
                              fontWeight: 900,
                              letterSpacing: '0.1em',
                              color: BLUE_INK,
                            }}
                          >
                            PILIH PERANAN KELAB
                          </span>
                          <Sparkles size={15} color={BLUE} strokeWidth={2.5} />
                        </div>

                        <div
                          style={{
                            padding: '10px 12px',
                            borderRadius: 13,
                            backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                            border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 800, color: LAUNCH_PALETTE.PRIMARY }}>
                            Mohon Ahli Biasa
                          </span>
                          <Check size={15} color={EMERALD_INK} strokeWidth={2.6} />
                        </div>

                        <div
                          style={{
                            padding: '11px 13px',
                            borderRadius: 13,
                            backgroundColor: ajkConfirmed ? EMERALD_INK : BLUE_DARK,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transform: `scale(${(0.96 + 0.04 * confirmStampSpring).toFixed(4)})`,
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 900 }}>
                            Mohon Barisan AJK / Jawatankuasa
                          </span>
                          <Award size={16} color="#FEF08A" strokeWidth={2.5} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </KineticWindow>
              </div>

              {/* BACK FACE (-180 -> 0deg, upright & crisp!): GIANT HERO 3D OFFICIAL E-CERTIFICATE */}
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
                    padding: '28px 38px 26px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 18,
                    backfaceVisibility: 'hidden',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          backgroundColor: PINK_SOFT,
                          border: `1.5px solid ${PINK_BORDER}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Award size={25} color={PINK_INK} strokeWidth={2.4} />
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
                        <span style={{ fontSize: 16, fontWeight: 800, color: LAUNCH_PALETTE.MUTED_OLIVE }}>
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
                      padding: '26px 32px',
                      borderRadius: 24,
                      backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                      border: `2px solid ${AMBER_BORDER}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 28,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxWidth: 680 }}>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 12,
                          fontWeight: 900,
                          letterSpacing: '0.14em',
                          color: PURPLE_INK,
                        }}
                      >
                        ANUGERAH KEPIMPINAN &amp; PENYERTAAN AKTIF KELAB POLISAS
                      </span>
                      <span
                        style={{
                          fontSize: 38,
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
                          fontSize: 13.5,
                          fontWeight: 800,
                          color: EMERALD_INK,
                        }}
                      >
                        NO. MATRIK: 02DAT24F1022 • AJK KELAB E-SPORT &amp; ROBOSAS
                      </span>
                      <span style={{ fontSize: 17, fontWeight: 700, color: LAUNCH_PALETTE.MUTED_OLIVE, lineHeight: 1.38 }}>
                        Diperakui menyertai 2/2 Kelab Aktif POLISAS &amp; mengumpul +135 Mata Merit Kokurikulum Rasmi.
                      </span>
                    </div>

                    <div
                      style={{
                        width: 214,
                        padding: '20px 18px',
                        borderRadius: 24,
                        backgroundColor: '#FFFFFF',
                        border: `2.5px solid ${AMBER}`,
                        boxShadow: '0 22px 46px rgba(217, 119, 6, 0.24)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: 8,
                        backfaceVisibility: 'hidden',
                        transform: 'translateZ(45px)',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 66,
                          height: 66,
                          borderRadius: 999,
                          backgroundColor: AMBER_SOFT,
                          border: `2px solid ${AMBER}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ShieldCheck size={34} color={AMBER_INK} strokeWidth={2.5} />
                      </div>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 12,
                          fontWeight: 900,
                          color: AMBER_INK,
                        }}
                      >
                        DISAHKAN EMS ✓
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 900, color: PINK_INK }}>
                        +135 MERIT
                      </span>
                    </div>
                  </div>

                  {/* Signature EvolvingPath + Download CTA Strip */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ position: 'relative', width: 170, height: 42 }}>
                        <EvolvingPath
                          d="M 8 30 Q 42 8 76 26 T 148 18"
                          width={170}
                          height={42}
                          startFrame={O + 402}
                          durationFrames={44}
                          stroke={BLUE_DARK}
                          strokeWidth={3}
                          hideDotWhenComplete
                        />
                      </div>
                      <span style={{ fontSize: 14.5, fontWeight: 800, color: LAUNCH_PALETTE.MUTED_OLIVE }}>
                        Tandatangan digital disahkan • Terus simpan PDF
                      </span>
                    </div>

                    <div
                      style={{
                        padding: '13px 24px',
                        borderRadius: 15,
                        backgroundColor: PINK_DARK,
                        color: '#FFFFFF',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 13,
                        fontWeight: 900,
                        letterSpacing: '0.07em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 9,
                        boxShadow: '0 14px 28px rgba(219, 39, 119, 0.28)',
                      }}
                    >
                      <Download size={16} strokeWidth={2.6} />
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

            <GeometricSparkBurst
              triggerFrame={O + 150}
              x={1260}
              y={336}
              durationFrames={32}
              radius={92}
              count={12}
              seed="clubs-ajk-join-spark"
              colors={[BLUE, EMERALD, '#FFFFFF']}
            />
            <GeometricSparkBurst
              triggerFrame={O + 422}
              x={1240}
              y={380}
              durationFrames={34}
              radius={118}
              count={14}
              seed="clubs-cert-spark"
              colors={[PINK, AMBER, '#FFFFFF']}
            />

            <GhostCursor
              keyframes={CLUB_ROLE_CURSOR_KEYFRAMES}
              appearFrame={O + 116}
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
