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
  Briefcase,
  Check,
  CheckCircle2,
  Cpu,
  Download,
  FileCheck2,
  Gamepad2,
  Landmark,
  QrCode,
  ScanLine,
  ShieldCheck,
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
import { DeterministicQrMatrix, KineticWindow, SpatialFloorGrid } from '../ui/KineticCard';

const BLUE = LAUNCH_MODULE_THEMES.kelab.primary; // #3B82F6
const BLUE_DARK = LAUNCH_MODULE_THEMES.kelab.dark; // #2563EB
const BLUE_INK = '#1D4ED8'; // WCAG AA+ Blue-700
const BLUE_SOFT = LAUNCH_MODULE_THEMES.kelab.soft; // #EFF6FF
const BLUE_BORDER = LAUNCH_MODULE_THEMES.kelab.border; // #BFDBFE

const PURPLE = LAUNCH_MODULE_THEMES.meritQr.primary; // #A855F7
const PURPLE_DARK = LAUNCH_MODULE_THEMES.meritQr.dark; // #9333EA
const PURPLE_INK = '#7E22CE'; // WCAG AA+ Purple-700
const PURPLE_SOFT = LAUNCH_MODULE_THEMES.meritQr.soft; // #FAF5FF
const PURPLE_BORDER = LAUNCH_MODULE_THEMES.meritQr.border; // #E9D5FF

const PINK = LAUNCH_MODULE_THEMES.ems.primary; // #EC4899
const PINK_DARK = LAUNCH_MODULE_THEMES.ems.dark; // #DB2777
const PINK_INK = '#BE185D'; // WCAG AA+ Pink-700
const PINK_SOFT = LAUNCH_MODULE_THEMES.ems.soft; // #FDF2F8
const PINK_BORDER = LAUNCH_MODULE_THEMES.ems.border; // #FBCFE8

const EMERALD = LAUNCH_MODULE_THEMES.polymaps.primary; // #10B981
const EMERALD_INK = '#047857';
const EMERALD_SOFT = LAUNCH_MODULE_THEMES.polymaps.soft; // #ECFDF5
const EMERALD_BORDER = LAUNCH_MODULE_THEMES.polymaps.border; // #A7F3D0

const AMBER = LAUNCH_MODULE_THEMES.polymart.primary; // #F59E0B
const AMBER_DARK = LAUNCH_MODULE_THEMES.polymart.dark; // #D97706
const AMBER_INK = '#B45309';
const AMBER_SOFT = LAUNCH_MODULE_THEMES.polymart.soft; // #FFFBEB
const AMBER_BORDER = LAUNCH_MODULE_THEMES.polymart.border; // #FDE68A

const DARK_GLASS_BG = 'rgba(10, 26, 23, 0.96)';
const O = MODULE_CONTENT_ENTER_OFFSET; // 132f bumper handoff

export type ClubsEmsProps = {
  readonly clubsCount: number;
  readonly activitiesCount: number;
  readonly certSerial: string;
};

type StackedClubSpec = {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly members: number;
  readonly icon: 'gamepad' | 'cpu' | 'briefcase' | 'users';
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
  readonly scale: number;
  readonly opacity: number;
  readonly isHero?: boolean;
};

const CLUB_DECK: readonly StackedClubSpec[] = [
  {
    id: 'pepka',
    name: 'PePKa POLISAS',
    category: 'Rakan Masjid & Bakti Siswa • 210 Ahli',
    members: 210,
    icon: 'users',
    dx: -285,
    dy: 54,
    dz: -175,
    scale: 0.84,
    opacity: 0.46,
  },
  {
    id: 'commerce',
    name: 'Commerce Club',
    category: 'Keusahawanan & Jualan • 164 Ahli',
    members: 164,
    icon: 'briefcase',
    dx: 185,
    dy: 48,
    dz: -120,
    scale: 0.88,
    opacity: 0.62,
  },
  {
    id: 'robosas',
    name: 'Robosas Robotik',
    category: 'Inovasi & Kejuruteraan • 98 Ahli',
    members: 98,
    icon: 'cpu',
    dx: -175,
    dy: -48,
    dz: -65,
    scale: 0.92,
    opacity: 0.78,
  },
  {
    id: 'esport',
    name: 'Kelab E-Sport POLISAS',
    category: 'Sukan Digital & Kejohanan Kampus • 142 Ahli',
    members: 142,
    icon: 'gamepad',
    dx: 0,
    dy: 0,
    dz: 70,
    scale: 1,
    opacity: 1,
    isHero: true,
  },
];

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

// Shot 1 GhostCursor clicks "Sertai Kelab" at O+88f (220f) and exits promptly by 240f
const CLUB_JOIN_CURSOR_KEYFRAMES: readonly GhostCursorKeyframe[] = [
  { frame: O + 42, x: 740, y: 420 },
  { frame: O + 88, x: 1280, y: 556, click: true, label: 'SERTAI KELAB' },
  { frame: O + 108, x: 1280, y: 556 },
];

const renderClubIcon = (icon: StackedClubSpec['icon'], size: number, color: string) => {
  switch (icon) {
    case 'gamepad':
      return <Gamepad2 size={size} color={color} strokeWidth={2.2} />;
    case 'cpu':
      return <Cpu size={size} color={color} strokeWidth={2.2} />;
    case 'briefcase':
      return <Briefcase size={size} color={color} strokeWidth={2.2} />;
    case 'users':
      return <Users size={size} color={color} strokeWidth={2.2} />;
  }
};

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

  // SHOT 1 -> SHOT 2 Z-Fly-Through (O+186..O+240 = 318..372f)
  const toShot2T = interpolate(frame, [O + 186, O + 240], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });

  // Club Joined State (clicked at O+88f = 220f)
  const clubJoined = frame >= O + 88;
  const joinStampSpring = clubJoined
    ? spring({
        frame: frame - (O + 88),
        fps: safeFps,
        config: LUXURY_SPRING,
      })
    : 0;

  // Club Deck Z-Depth Recession into Shot 2
  const deckZ = interpolate(toShot2T, [0, 1], [0, -210]);
  const deckScale = interpolate(toShot2T, [0, 1], [1, 0.72]);
  const deckOpacity =
    interpolate(toShot2T, [0, 0.85, 1], [1, 0.28, 0.24], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) *
    interpolate(frame, [O + 378, O + 410], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  // SHOT 2: Holographic QR Scanner Gate flies forward (O+198..O+246 = 330..378f)
  const qrGateEnter = interpolate(frame, [O + 198, O + 246], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  // Volumetric Purple laser sweep + 6-frame exposure flash (372..424f)
  const qrLaserY = interpolate(frame, [O + 240, O + 286], [12, 168], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.sin),
  });
  const flashOpacity = interpolate(frame, [O + 282, O + 286, O + 292], [0, 0.48, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const meritAwarded = frame >= O + 284;
  const meritSpring = meritAwarded
    ? spring({
        frame: frame - (O + 284),
        fps: safeFps,
        config: LUXURY_SPRING,
      })
    : 0;
  const liveMeritTotal = Math.round(120 + 15 * meritSpring);

  // SHOT 2 -> SHOT 3 True 2-Face 180-deg Y-Axis Card Flip (O+394..O+448 = 526..580f -> settled cleanly before f_4420 / local 610f!)
  const flipPhaseT = interpolate(frame, [O + 394, O + 448], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  const flipDeg = interpolate(flipPhaseT, [0, 1], [0, 180]);

  const stageRotX = interpolate(flipPhaseT, [0, 1], [4, 3]);
  const stageRotY = interpolate(flipPhaseT, [0, 1], [0, -5]);
  const stageWidth = interpolate(flipPhaseT, [0, 1], [840, 1000]);
  const stageHeight = interpolate(flipPhaseT, [0, 1], [568, 578]);

  // Diagonal foil sheen across e-Certificate (O+458..O+528 = 590..660f)
  const foilLeftPct = interpolate(frame, [O + 458, O + 528], [-45, 135], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });
  const foilOpacity = interpolate(frame, [O + 458, O + 474, O + 510, O + 528], [0, 0.52, 0.52, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const isCertActive = flipPhaseT >= 0.5;
  const liveDotScale = 0.86 + Math.sin(timeSec * 4.8) * 0.16;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.kelab.tint} />

      <Module3DIntroBumper
        moduleIndex="MODUL 07"
        moduleCategory="KELAB, MERIT & E-SIJIL"
        moduleName="e-Kelab & Merit"
        tagline="Sertai 21 Kelab, Imbas QR & Jana e-Sijil"
        accentColor={LAUNCH_MODULE_THEMES.kelab.primary}
        darkColor={LAUNCH_MODULE_THEMES.kelab.dark}
        softColor={LAUNCH_MODULE_THEMES.kelab.soft}
        borderColor={LAUNCH_MODULE_THEMES.kelab.border}
        icon={<Award size={96} color="#FFFFFF" strokeWidth={2.1} />}
        features={[
          { icon: <Landmark size={15} strokeWidth={2.4} />, label: '21 Kelab Aktif' },
          { icon: <QrCode size={15} strokeWidth={2.4} />, label: 'Imbas QR Merit' },
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
          accentColor={isCertActive ? PINK : meritAwarded ? PURPLE : BLUE}
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
            top: 74,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 28,
            fontFamily: LAUNCH_FONTS.DISPLAY,
            zIndex: 14,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 1240 }}>
            <KineticReveal startFrame={O + 4} durationFrames={18}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 14px',
                  borderRadius: 999,
                  backgroundColor: isCertActive ? PINK_SOFT : meritAwarded ? PURPLE_SOFT : BLUE_SOFT,
                  border: `1.5px solid ${isCertActive ? PINK_BORDER : meritAwarded ? PURPLE_BORDER : BLUE_BORDER}`,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: isCertActive ? PINK : meritAwarded ? PURPLE : BLUE,
                    transform: `scale(${liveDotScale.toFixed(3)})`,
                  }}
                />
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: '0.14em',
                    color: isCertActive ? PINK_INK : meritAwarded ? PURPLE_INK : BLUE_INK,
                  }}
                >
                  BAB 07 • {safeClubs} KELAB, MATA MERIT QR &amp; E-SIJIL ({safeActivities} AKTIVITI)
                </span>
              </div>
            </KineticReveal>

            <KineticWords
              as="h1"
              text="Aktif Kelab? Imbas Merit QR & Terus Muat Turun e-Sijil."
              startFrame={O + 8}
              staggerFrames={wordStagger}
              wordDurationFrames={wordDuration}
              accentWords={['Merit', 'e-Sijil.']}
              accentColor={isCertActive ? PINK_INK : PURPLE_INK}
              style={{
                margin: 0,
                fontSize: 44,
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
                border: `1.5px solid ${isCertActive ? PINK_BORDER : PURPLE_BORDER}`,
                boxShadow: '0 12px 26px rgba(6, 23, 20, 0.08)',
              }}
            >
              <Award
                size={18}
                color={isCertActive ? PINK_INK : PURPLE_INK}
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
                  : meritAwarded
                    ? `${liveMeritTotal} MATA MERIT AKTIF ✓`
                    : `${safeClubs} KELAB TERBUKA`}
              </span>
            </div>
          </KineticReveal>
        </div>

        {/* 3D Z-Axis Fly-Through Workspace (x=0..1920, y=204..968) */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 204,
            height: 764,
            perspective: '1700px',
            transformStyle: 'preserve-3d',
            fontFamily: LAUNCH_FONTS.DISPLAY,
            zIndex: 8,
          }}
        >
          {/* Decorative Blue->Purple Vector Energy Ribbon tying Shot 1 Club Join -> Shot 2 Merit Scan */}
          {frame >= O + 182 && frame < O + 280 ? (
            <EvolvingPath
              d="M 300 410 Q 640 200 960 360"
              width={1920}
              height={764}
              startFrame={O + 184}
              durationFrames={44}
              stroke={PURPLE}
              strokeWidth={4.5}
              trackStroke="rgba(168, 85, 247, 0.16)"
              headDotColor="#FFFFFF"
              headDotRadius={7}
              hideDotWhenComplete
              style={{
                position: 'absolute',
                inset: 0,
                opacity: interpolate(frame, [O + 246, O + 276], [1, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
                pointerEvents: 'none',
              }}
            />
          ) : null}

          {/* SHOT 1 HERO (and Shot 2 Recessed Z-Context): 3D Z-Stacked Club Deck */}
          {deckOpacity > 0.01 ? (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 960,
                height: 520,
                transformStyle: 'preserve-3d',
                opacity: deckOpacity,
                transform: `translate(-50%, -50%) translateZ(${deckZ.toFixed(1)}px) scale(${deckScale.toFixed(4)})`,
              }}
            >
              {CLUB_DECK.map((club, idx) => {
                const enterSpring = spring({
                  frame: Math.max(0, frame - (O + 8 + idx * 7)),
                  fps: safeFps,
                  config: LUXURY_SPRING,
                });
                const isHero = Boolean(club.isHero);
                return (
                  <div
                    key={club.id}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: club.opacity * enterSpring,
                      transformStyle: 'preserve-3d',
                      transform: `translate3d(${club.dx}px, ${(club.dy + (1 - enterSpring) * 28).toFixed(1)}px, ${club.dz}px) rotateX(3deg) scale(${club.scale})`,
                    }}
                  >
                    <KineticWindow
                      surface={isHero ? 'light' : 'sand'}
                      routeLabel={isHero ? '/portal/kelab/esport' : '/portal/kelab'}
                      statusPill={isHero ? (clubJoined ? 'AHLI DISAHKAN ✓' : 'OPEN 2026') : 'KELAB AKTIF'}
                      statusAccent={isHero}
                      accentColor={isHero && clubJoined ? EMERALD : BLUE}
                      accentSoftBg={isHero && clubJoined ? EMERALD_SOFT : BLUE_SOFT}
                      accentBorderColor={isHero && clubJoined ? EMERALD_BORDER : BLUE_BORDER}
                      width={960}
                      height={510}
                      sheenStartFrame={isHero ? O + 94 : undefined}
                      sheenDuration={34}
                      style={{
                        borderBottom: `6px solid ${isHero && clubJoined ? EMERALD : BLUE}`,
                        boxShadow: isHero
                          ? '0 34px 74px rgba(37, 99, 235, 0.16)'
                          : '0 18px 42px rgba(6, 23, 20, 0.12)',
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          padding: '28px 32px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 18,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div
                              style={{
                                width: 64,
                                height: 64,
                                borderRadius: 18,
                                backgroundColor: BLUE_SOFT,
                                border: `1.5px solid ${BLUE_BORDER}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {renderClubIcon(club.icon, 30, BLUE_INK)}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span
                                style={{
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 12,
                                  fontWeight: 900,
                                  letterSpacing: '0.11em',
                                  color: BLUE_INK,
                                }}
                              >
                                KELAB PELAJAR RASMI POLISAS
                              </span>
                              <span
                                style={{
                                  fontSize: 30,
                                  fontWeight: 900,
                                  color: LAUNCH_PALETTE.PRIMARY,
                                }}
                              >
                                {club.name}
                              </span>
                            </div>
                          </div>

                          <span
                            style={{
                              padding: '7px 14px',
                              borderRadius: 999,
                              backgroundColor: BLUE_SOFT,
                              border: `1.5px solid ${BLUE_BORDER}`,
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 12,
                              fontWeight: 900,
                              color: BLUE_INK,
                            }}
                          >
                            {club.members} AHLI AKTIF
                          </span>
                        </div>

                        <div
                          style={{
                            padding: '20px 24px',
                            borderRadius: 18,
                            backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                            border: `1.5px solid ${BLUE_BORDER}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 16,
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 19, fontWeight: 800, color: LAUNCH_PALETTE.PRIMARY }}>
                              {club.category}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: LAUNCH_PALETTE.INK_SOFT }}>
                              Daftar 1-klik • Sijil &amp; merit kokurikulum automatik ke profil pelajar
                            </span>
                          </div>
                        </div>

                        {isHero ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: 999,
                                  backgroundColor: PURPLE_SOFT,
                                  border: `1.5px solid ${PURPLE_BORDER}`,
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 12,
                                  fontWeight: 900,
                                  color: PURPLE_INK,
                                }}
                              >
                                +MATA MERIT KOKURIKULUM
                              </span>
                              <span
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: 999,
                                  backgroundColor: PINK_SOFT,
                                  border: `1.5px solid ${PINK_BORDER}`,
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 12,
                                  fontWeight: 900,
                                  color: PINK_INK,
                                }}
                              >
                                E-SIJIL DISAHKAN
                              </span>
                            </div>

                            <div
                              style={{
                                padding: '13px 22px',
                                borderRadius: 15,
                                backgroundColor: clubJoined ? EMERALD_INK : BLUE_DARK,
                                color: '#FFFFFF',
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 13.5,
                                fontWeight: 900,
                                letterSpacing: '0.07em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                transform: `scale(${(0.96 + 0.04 * joinStampSpring).toFixed(4)})`,
                                boxShadow: clubJoined
                                  ? '0 14px 28px rgba(4, 120, 87, 0.28)'
                                  : '0 14px 28px rgba(37, 99, 235, 0.28)',
                              }}
                            >
                              {clubJoined ? (
                                <>
                                  <CheckCircle2 size={16} strokeWidth={2.8} />
                                  <span>Ahli Rasmi Disahkan</span>
                                </>
                              ) : (
                                <span>Sertai Kelab</span>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </KineticWindow>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* SHOT 2 -> SHOT 3: 2-FACE 180-DEG 3D FLIP STAGE (QR Gate <-> Digital e-Certificate) */}
          {qrGateEnter > 0.01 ? (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: stageWidth,
                height: stageHeight,
                transformStyle: 'preserve-3d',
                opacity: qrGateEnter,
                transform: `translate(-50%, -50%) translateZ(${(interpolate(qrGateEnter, [0, 1], [-180, 80])).toFixed(1)}px) rotateX(${stageRotX.toFixed(2)}deg) rotateY(${stageRotY.toFixed(2)}deg) scale(${(0.82 + 0.18 * qrGateEnter).toFixed(4)})`,
              }}
            >
              {/* FRONT FACE (0 -> 180deg): GIANT 3D HOLOGRAPHIC QR SCANNER GATE (Shot 2 peak at f=3140 / Local 302f!) */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 30,
                  backgroundColor: DARK_GLASS_BG,
                  border: `2.5px solid ${PURPLE}`,
                  borderBottom: `8px solid ${PURPLE_DARK}`,
                  boxShadow: '0 38px 90px rgba(6, 23, 20, 0.42)',
                  backfaceVisibility: 'hidden',
                  transform: `rotateY(${flipDeg.toFixed(2)}deg)`,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Top Dark Gate Bar */}
                <div
                  style={{
                    padding: '16px 28px',
                    backgroundColor: '#061714',
                    borderBottom: `1px solid rgba(233, 213, 255, 0.22)`,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ScanLine size={18} color={PURPLE} strokeWidth={2.5} />
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 13.5,
                        fontWeight: 900,
                        letterSpacing: '0.14em',
                      }}
                    >
                      IMBAS KEHADIRAN QR MERIT • EMS KAMPUS
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '5px 12px',
                      borderRadius: 999,
                      backgroundColor: meritAwarded ? 'rgba(16, 185, 129, 0.22)' : 'rgba(168, 85, 247, 0.24)',
                      border: `1.5px solid ${meritAwarded ? EMERALD : PURPLE}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11.5,
                      fontWeight: 900,
                      color: meritAwarded ? EMERALD_BORDER : PURPLE_BORDER,
                    }}
                  >
                    {meritAwarded ? 'KEHADIRAN DISAHKAN ✓' : 'SEDIA IMBAS QR'}
                  </span>
                </div>

                {/* Inner Scanner Layout */}
                <div
                  style={{
                    flex: 1,
                    padding: '26px 32px',
                    display: 'grid',
                    gridTemplateColumns: '0.95fr 1.05fr',
                    gap: 30,
                    alignItems: 'center',
                  }}
                >
                  {/* Left: Target QR Matrix with Purple Holographic Laser */}
                  <div
                    style={{
                      padding: 20,
                      borderRadius: 24,
                      backgroundColor: '#FFFFFF',
                      border: `3px solid ${meritAwarded ? EMERALD : PURPLE}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        padding: 10,
                        borderRadius: 16,
                        backgroundColor: '#FFFFFF',
                        overflow: 'hidden',
                      }}
                    >
                      <DeterministicQrMatrix
                        seed={2026}
                        size={182}
                        fgColor="#061714"
                        bgColor="#FFFFFF"
                      />
                      <div
                        aria-hidden
                        style={{
                          position: 'absolute',
                          left: 4,
                          right: 4,
                          top: qrLaserY,
                          height: 4,
                          borderRadius: 999,
                          backgroundColor: PINK,
                          boxShadow: '0 0 14px rgba(236, 72, 153, 0.9)',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 900,
                        color: PURPLE_INK,
                      }}
                    >
                      DEWAN JUBLI PERAK • MAKMP 2026
                    </span>
                  </div>

                  {/* Right: Live Event Details + Floating Z-Parallax +15 Merit Pill */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 900,
                        letterSpacing: '0.12em',
                        color: PURPLE_BORDER,
                      }}
                    >
                      PROGRAM KECEMERLANGAN POLISAS
                    </span>
                    <span
                      style={{
                        fontSize: 29,
                        fontWeight: 900,
                        lineHeight: 1.18,
                        color: '#FFFFFF',
                      }}
                    >
                      Malam Anugerah Kecemerlangan Mahasiswa (MAKMP 2026)
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(246, 251, 249, 0.80)' }}>
                      Sekali imbas QR di pintu masuk, rekod kehadiran &amp; mata merit terus dikemas kini.
                    </span>

                    {/* Merit Launch Box */}
                    <div
                      style={{
                        padding: '16px 20px',
                        borderRadius: 20,
                        backgroundColor: meritAwarded ? 'rgba(16, 185, 129, 0.22)' : 'rgba(168, 85, 247, 0.2)',
                        border: `2px solid ${meritAwarded ? EMERALD : PURPLE}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transform: `scale(${(0.95 + 0.06 * meritSpring).toFixed(4)})`,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11,
                            fontWeight: 900,
                            letterSpacing: '0.1em',
                            color: EMERALD_BORDER,
                          }}
                        >
                          MATA MERIT KOKURIKULUM
                        </span>
                        <span
                          style={{
                            fontSize: 24,
                            fontWeight: 900,
                            color: '#FFFFFF',
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          +15 MATA MERIT
                        </span>
                      </div>

                      <div
                        style={{
                          padding: '8px 14px',
                          borderRadius: 14,
                          backgroundColor: '#FFFFFF',
                          color: EMERALD_INK,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 14,
                          fontWeight: 900,
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {liveMeritTotal} MERIT ✓
                      </div>
                    </div>
                  </div>
                </div>

                {/* Brief 6-Frame Scan Flash */}
                {flashOpacity > 0.01 ? (
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: '#FFFFFF',
                      opacity: flashOpacity,
                      pointerEvents: 'none',
                    }}
                  />
                ) : null}
              </div>

              {/* BACK FACE (-180 -> 0deg, guaranteed upright & un-mirrored!): GIANT HERO 3D DIGITAL E-CERTIFICATE (Shot 3 peak at f=3340 / Local 502f!) */}
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
                  transform: `rotateY(${(flipDeg - 180).toFixed(2)}deg)`,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Certificate Top Accent Ribbon */}
                <div
                  style={{
                    height: 8,
                    display: 'flex',
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
                    padding: '26px 36px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Top Institution Tag & Serial Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 13,
                          backgroundColor: PINK_SOFT,
                          border: `1.5px solid ${PINK_BORDER}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Award size={23} color={PINK_INK} strokeWidth={2.4} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11.5,
                            fontWeight: 900,
                            letterSpacing: '0.13em',
                            color: PINK_INK,
                          }}
                        >
                          SIJIL DIGITAL RASMI • EMS JPP POLISAS
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: LAUNCH_PALETTE.MUTED_OLIVE }}>
                          Politeknik Sultan Haji Ahmad Shah, Kuantan
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '6px 13px',
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                        border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 900,
                        color: LAUNCH_PALETTE.PRIMARY,
                      }}
                    >
                      #{safeSerial}
                    </span>
                  </div>

                  {/* Center Certificate Main Awardee Block + Floating Gold/Magenta Medallion */}
                  <div
                    style={{
                      padding: '24px 28px',
                      borderRadius: 24,
                      backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                      border: `2px solid ${AMBER_BORDER}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 24,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 630 }}>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 900,
                          letterSpacing: '0.14em',
                          color: PURPLE_INK,
                        }}
                      >
                        DENGAN INI DIPERAKUI BAHAWA
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
                        NO. MATRIK: 04DAT24F1022 • JABATAN PERDAGANGAN
                      </span>
                      <span style={{ fontSize: 16.5, fontWeight: 700, color: LAUNCH_PALETTE.MUTED_OLIVE, lineHeight: 1.35 }}>
                        Telah menyertai Malam Anugerah Kecemerlangan Mahasiswa (MAKMP 2026) &amp; menerima pengesahan +15 Mata Merit Kokurikulum.
                      </span>
                    </div>

                    {/* Floating Gold & Magenta Medallion Seal (+44px Z) */}
                    <div
                      style={{
                        width: 196,
                        padding: '18px 16px',
                        borderRadius: 24,
                        backgroundColor: '#FFFFFF',
                        border: `2.5px solid ${AMBER}`,
                        boxShadow: '0 22px 46px rgba(217, 119, 6, 0.24)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: 8,
                        transform: 'translateZ(44px)',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 62,
                          height: 62,
                          borderRadius: 999,
                          backgroundColor: AMBER_SOFT,
                          border: `2px solid ${AMBER}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ShieldCheck size={32} color={AMBER_INK} strokeWidth={2.5} />
                      </div>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 900,
                          color: AMBER_INK,
                        }}
                      >
                        DISAHKAN EMS ✓
                      </span>
                      <span
                        style={{
                          fontSize: 19,
                          fontWeight: 900,
                          color: PINK_INK,
                        }}
                      >
                        +15 MERIT
                      </span>
                    </div>
                  </div>

                  {/* Bottom Crisp PDF Download CTA Strip */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Check size={17} color={EMERALD_INK} strokeWidth={3} />
                      <span style={{ fontSize: 14.5, fontWeight: 800, color: LAUNCH_PALETTE.MUTED_OLIVE }}>
                        Tandatangan digital disahkan • Terus simpan ke telefon anda
                      </span>
                    </div>

                    <div
                      style={{
                        padding: '12px 22px',
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

                {/* Animated Metallic Foil Diagonal Sheen */}
                {foilOpacity > 0.01 ? (
                  <div
                    aria-hidden
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
                      pointerEvents: 'none',
                    }}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Celebratory Sparks across all 3 Shots */}
          <GeometricSparkBurst
            triggerFrame={O + 92}
            x={1280}
            y={556}
            durationFrames={30}
            radius={80}
            count={10}
            seed="clubs-join-spark"
            colors={[BLUE, EMERALD, '#FFFFFF']}
          />
          <GeometricSparkBurst
            triggerFrame={O + 288}
            x={1160}
            y={420}
            durationFrames={32}
            radius={112}
            count={12}
            seed="clubs-merit-spark"
            colors={[PURPLE, PINK, EMERALD]}
          />
          <GeometricSparkBurst
            triggerFrame={O + 472}
            x={1240}
            y={380}
            durationFrames={34}
            radius={118}
            count={14}
            seed="clubs-cert-spark"
            colors={[PINK, AMBER, '#FFFFFF']}
          />

          <GhostCursor
            keyframes={CLUB_JOIN_CURSOR_KEYFRAMES}
            appearFrame={O + 42}
            disappearFrame={O + 108}
            color={LAUNCH_PALETTE.PRIMARY_DARK}
            rippleColor={BLUE}
          />
        </div>
        </div>
      </CameraStage>

      <EditorialFrameMarks
        chapterCode="07"
        chapterLabel="17:00 PETANG • 21 KELAB, MERIT & E-SIJIL"
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
