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
  CheckCircle2,
  Cpu,
  Download,
  Gamepad2,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
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
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE } from '../tokens';
import { DeterministicQrMatrix, KineticWindow } from '../ui/KineticCard';

const BLUE = LAUNCH_MODULE_THEMES.kelab.primary; // #3B82F6
const BLUE_DARK = LAUNCH_MODULE_THEMES.kelab.dark; // #2563EB
const BLUE_INK = '#1D4ED8'; // WCAG AA+ Blue-700
const BLUE_SOFT = LAUNCH_MODULE_THEMES.kelab.soft; // #EFF6FF
const BLUE_BORDER = LAUNCH_MODULE_THEMES.kelab.border; // #BFDBFE

const PURPLE = LAUNCH_MODULE_THEMES.meritQr.primary; // #A855F7
const PURPLE_DARK = LAUNCH_MODULE_THEMES.meritQr.dark; // #9333EA
const PURPLE_INK = '#7E22CE'; // WCAG AA+ Purple-700
const PURPLE_BORDER = LAUNCH_MODULE_THEMES.meritQr.border; // #E9D5FF

const PINK = LAUNCH_MODULE_THEMES.ems.primary; // #EC4899
const PINK_DARK = LAUNCH_MODULE_THEMES.ems.dark; // #DB2777
const PINK_INK = '#BE185D'; // WCAG AA+ Pink-700
const PINK_BORDER = LAUNCH_MODULE_THEMES.ems.border; // #FBCFE8

const EMERALD = LAUNCH_MODULE_THEMES.polymaps.primary; // #10B981
const EMERALD_INK = '#047857';
const EMERALD_SOFT = LAUNCH_MODULE_THEMES.polymaps.soft; // #ECFDF5
const EMERALD_BORDER = LAUNCH_MODULE_THEMES.polymaps.border; // #A7F3D0
const AMBER = LAUNCH_MODULE_THEMES.polymart.primary; // #F59E0B

export type ClubsEmsProps = {
  readonly clubsCount: number;
  readonly activitiesCount: number;
  readonly certSerial: string;
};

type StudentClubSpec = {
  readonly id: string;
  readonly name: string;
  readonly meta: string;
  readonly icon: 'gamepad' | 'cpu' | 'briefcase' | 'users';
  readonly activeTone: 'blue' | 'emerald' | 'open';
  readonly preJoined?: boolean;
};

const STUDENT_CLUBS: readonly StudentClubSpec[] = [
  {
    id: 'esport',
    name: 'Kelab E-Sport',
    meta: 'Sukan Digital · 142 Ahli',
    icon: 'gamepad',
    activeTone: 'blue',
  },
  {
    id: 'robosas',
    name: 'Robosas Robotik',
    meta: 'Inovasi & Kejuruteraan · 98 Ahli',
    icon: 'cpu',
    activeTone: 'emerald',
    preJoined: true,
  },
  {
    id: 'commerce',
    name: 'Commerce Club',
    meta: 'Keusahawanan Siswa · 116 Ahli',
    icon: 'briefcase',
    activeTone: 'open',
  },
  {
    id: 'pepka',
    name: 'PePKa',
    meta: 'Persatuan Pelajar Kampus · 210 Ahli',
    icon: 'users',
    activeTone: 'emerald',
    preJoined: true,
  },
];

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const COUNTER_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const LASER_EASE = Easing.bezier(0.45, 0, 0.55, 1);
const SHEEN_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

const renderClubIcon = (
  icon: StudentClubSpec['icon'],
  isActive: boolean,
  tone: StudentClubSpec['activeTone'],
) => {
  const color = !isActive
    ? LAUNCH_PALETTE.PRIMARY
    : tone === 'blue'
      ? BLUE_INK
      : EMERALD_INK;
  switch (icon) {
    case 'gamepad':
      return <Gamepad2 size={20} color={color} strokeWidth={2.3} />;
    case 'cpu':
      return <Cpu size={20} color={color} strokeWidth={2.3} />;
    case 'briefcase':
      return <Briefcase size={20} color={color} strokeWidth={2.3} />;
    case 'users':
      return <Users size={20} color={color} strokeWidth={2.3} />;
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
  const f60 = (f: number) => Math.round((f / 60) * safeFps);

  const safeClubs = Number.isFinite(clubsCount) ? Math.max(0, Math.round(clubsCount)) : 21;
  const safeActivities = Number.isFinite(activitiesCount)
    ? Math.max(0, Math.round(activitiesCount))
    : 41;
  const safeCertSerial = certSerial.trim() || 'EMS-CERT-2026-9041';

  // Beat timings
  const pillStart = 0;
  const pillDuration = Math.max(8, f60(22));
  const headlineStart = f60(5);
  const wordStagger = Math.max(2, f60(3));
  const wordDuration = Math.max(8, f60(20));

  const counterDuration = Math.max(18, f60(56));
  const liveClubs = Math.round(
    interpolate(frame, [f60(8), f60(8) + counterDuration], [0, safeClubs], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: COUNTER_EASE,
    }),
  );
  const liveActivities = Math.round(
    interpolate(frame, [f60(12), f60(12) + counterDuration], [0, safeActivities], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: COUNTER_EASE,
    }),
  );

  // STAGE 1 (Left Upright Blue Panel): Join Kelab E-Sport
  const deckEnter = interpolate(frame, [f60(10), f60(32)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const esportJoinClickFrame = f60(48);
  const esportJoined = frame >= esportJoinClickFrame;
  const esportJoinSpring = esportJoined
    ? spring({
        frame: frame - esportJoinClickFrame,
        fps: safeFps,
        config: { damping: 15, stiffness: 245, mass: 0.78 },
      })
    : 0;
  const buttonPressScale = interpolate(
    frame,
    [esportJoinClickFrame - 2, esportJoinClickFrame + 3, esportJoinClickFrame + 11],
    [1, 0.93, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  const cursorKeyframes: readonly GhostCursorKeyframe[] = [
    { frame: f60(18), x: 240, y: 310 },
    { frame: esportJoinClickFrame, x: 443, y: 194, click: true, label: 'Sertai Kelab' },
    { frame: f60(82), x: 500, y: 215 },
  ];

  // Connector 1 (Stage 1 -> Stage 2): 54..76f
  const conn1Start = f60(54);
  const conn1Duration = Math.max(10, f60(22));

  // STAGE 2 (Center Upright Purple Laser Gate + Rolling Merit Counter): Wakes at 72..92f
  const stage2Wake = interpolate(frame, [f60(72), f60(92)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const stage2Opacity = 0.48 + 0.52 * stage2Wake;
  const stage2Scale = 0.98 + 0.02 * stage2Wake;

  const sweepStart = f60(88);
  const sweepEnd = f60(126);
  const sweepProgress = interpolate(frame, [sweepStart, sweepEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: LASER_EASE,
  });
  const laserOffsetY = interpolate(sweepProgress, [0, 0.5, 1], [12, 206, 108]);
  const isScanLocked = frame >= sweepEnd;

  // 6-frame camera-shutter flash at scan lock (126..132f)
  const shutterFlashOpacity = interpolate(
    frame,
    [sweepEnd, sweepEnd + 2, sweepEnd + 6],
    [0, 0.52, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  // Live Rolling Merit Score Counter (120 -> 135 MATA MERIT +15 ✓)
  const liveMeritTotal = Math.round(
    interpolate(frame, [sweepEnd, sweepEnd + f60(24)], [120, 135], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: COUNTER_EASE,
    }),
  );
  const meritLockSpring = isScanLocked
    ? spring({
        frame: frame - sweepEnd,
        fps: safeFps,
        config: { damping: 15, stiffness: 245, mass: 0.8 },
      })
    : 0;

  // Connector 2 (Stage 2 -> Stage 3): 138..160f
  const conn2Start = f60(138);
  const conn2Duration = Math.max(10, f60(22));

  // STAGE 3 (Right Upright Pink e-Certificate): Wakes at 154..176f
  const stage3Wake = interpolate(frame, [f60(154), f60(176)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const stage3Opacity = 0.48 + 0.52 * stage3Wake;
  const stage3Scale = 0.98 + 0.02 * stage3Wake;

  const medallionStampFrame = f60(176);
  const medallionStampSpring =
    frame >= medallionStampFrame
      ? spring({
          frame: frame - medallionStampFrame,
          fps: safeFps,
          config: { damping: 14, stiffness: 240, mass: 0.82 },
        })
      : 0;
  const medallionScale =
    frame >= medallionStampFrame
      ? interpolate(medallionStampSpring, [0, 1], [1.24, 1])
      : 0.9;

  const certSparkFrame = f60(188);
  const foilStart = f60(190);
  const foilProgress = interpolate(frame, [foilStart, foilStart + 46], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SHEEN_EASE,
  });
  const foilLeftPct = interpolate(foilProgress, [0, 1], [-42, 132]);
  const foilOpacity = interpolate(foilProgress, [0, 0.2, 0.78, 1], [0, 0.5, 0.5, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const downloadSpring =
    frame >= f60(202)
      ? spring({
          frame: frame - f60(202),
          fps: safeFps,
          config: { damping: 15, stiffness: 230, mass: 0.82 },
        })
      : 0;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.kelab.tint} />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.016}
        panXFrom={3}
        panXTo={-3}
        panYFrom={2}
        panYTo={-2}
        tiltXFrom={0}
        tiltXTo={0}
        tiltYFrom={0}
        tiltYTo={0}
        breathingAmplitude={0.22}
        entryPanYOffset={18}
        entryZoomOffset={-0.018}
        exitZoomDelta={0.024}
        exitFrames={Math.round(0.32 * safeFps)}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            fontFamily: LAUNCH_FONTS.DISPLAY,
          }}
        >
          {/* Editorial Top Row */}
          <div
            style={{
              position: 'absolute',
              left: 72,
              right: 72,
              top: 62,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 24,
              zIndex: 8,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <KineticReveal startFrame={pillStart} durationFrames={pillDuration}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    alignSelf: 'flex-start',
                    padding: '6px 17px',
                    borderRadius: 999,
                    backgroundColor: BLUE_SOFT,
                    border: `1.5px solid ${BLUE}`,
                    color: BLUE_INK,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12.5,
                    fontWeight: 800,
                    letterSpacing: '0.16em',
                  }}
                >
                  <Award size={14} color={BLUE_INK} strokeWidth={2.4} />
                  <span>17:00 PETANG • 21 KELAB, MERIT &amp; E-SIJIL</span>
                </div>
              </KineticReveal>

              <KineticWords
                as="h2"
                text="21 Kelab. Imbas QR Acara. Kumpul Merit & e-Sijil."
                startFrame={headlineStart}
                staggerFrames={wordStagger}
                wordDurationFrames={wordDuration}
                accentWords={['21', 'Merit']}
                accentColor={PURPLE_DARK}
                style={{
                  margin: 0,
                  fontSize: 47,
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.07,
                  color: LAUNCH_PALETTE.PRIMARY,
                }}
              />
            </div>

            {/* Right Counters Pill Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div
                style={{
                  padding: '9px 20px',
                  borderRadius: 18,
                  backgroundColor: '#FFFFFF',
                  border: `1.5px solid ${BLUE_BORDER}`,
                  boxShadow: '0 8px 20px rgba(37, 99, 235, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: 112,
                }}
              >
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 23,
                    fontWeight: 900,
                    color: BLUE_INK,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {liveClubs}
                </span>
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 10,
                    fontWeight: 800,
                    color: LAUNCH_PALETTE.INK_SOFT,
                  }}
                >
                  KELAB AKTIF
                </span>
              </div>

              <div
                style={{
                  padding: '9px 20px',
                  borderRadius: 18,
                  backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                  border: `1.5px solid ${PINK}`,
                  boxShadow: '0 8px 20px rgba(236, 72, 153, 0.14)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: 118,
                }}
              >
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 23,
                    fontWeight: 900,
                    color: PINK,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {liveActivities}
                </span>
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 10,
                    fontWeight: 800,
                    color: LAUNCH_PALETTE.BACKGROUND,
                  }}
                >
                  ACARA KAMPUS
                </span>
              </div>
            </div>
          </div>

          {/* UPRIGHT 1-2-3 CAUSAL CONVEYOR PIPELINE (left: 72, width: 1776, top: 226, height: 712) */}
          <div
            style={{
              position: 'absolute',
              left: 72,
              top: 226,
              width: 1776,
              height: 712,
            }}
          >
            {/* STAGE 1 — LEFT PANEL (Blue #3B82F6): Directory + Tactile GhostCursor Join */}
            <Interactive.Div
              name="Clubs Upright Directory"
              premountFor={safeFps}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 536,
                height: 712,
                opacity: deckEnter,
                transform: `translate3d(0px, ${((1 - deckEnter) * 22).toFixed(2)}px, 0px)`,
              }}
            >
              <KineticWindow
                surface="light"
                routeLabel="jpp.polisas.edu.my/kelab"
                statusPill={esportJoined ? 'AHLI DISAHKAN ✓' : 'LANGKAH 01'}
                statusAccent
                accentColor={BLUE_INK}
                accentSoftBg={BLUE_SOFT}
                accentBorderColor={BLUE_BORDER}
                width="100%"
                height="100%"
                borderRadius={26}
                sheenStartFrame={f60(52)}
                sheenDuration={36}
                style={{
                  borderColor: BLUE_BORDER,
                  boxShadow: '0 22px 48px rgba(37, 99, 235, 0.1)',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: 14,
                      backgroundColor: BLUE_SOFT,
                      border: `1px solid ${BLUE_BORDER}`,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.1em',
                          color: BLUE_INK,
                        }}
                      >
                        LANGKAH 01 • SERTAI 21 KELAB
                      </div>
                      <div style={{ fontSize: 17.5, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                        Direktori Kelab Pelajar
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '5px 11px',
                        borderRadius: 999,
                        backgroundColor: BLUE_INK,
                        color: '#FFFFFF',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10.5,
                        fontWeight: 900,
                      }}
                    >
                      {esportJoined ? '3 DISERTAI ✓' : '2 DISERTAI'}
                    </span>
                  </div>

                  {/* 4 Upright Club Rows */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 11 }}>
                    {STUDENT_CLUBS.map((club) => {
                      const isTargetEsport = club.id === 'esport';
                      const isJoined = club.preJoined || (isTargetEsport && esportJoined);
                      const rowAccent = club.activeTone === 'blue' ? BLUE_INK : EMERALD_INK;
                      const rowBg = isJoined
                        ? club.activeTone === 'blue'
                          ? BLUE_SOFT
                          : EMERALD_SOFT
                        : '#FFFFFF';
                      const rowBorder = isJoined
                        ? club.activeTone === 'blue'
                          ? BLUE
                          : EMERALD
                        : LAUNCH_PALETTE.TERTIARY;

                      return (
                        <div
                          key={club.id}
                          style={{
                            flex: 1,
                            borderRadius: 18,
                            padding: '0 16px',
                            backgroundColor: rowBg,
                            border: `1.8px solid ${rowBorder}`,
                            borderBottom: `4px solid ${isJoined ? rowAccent : LAUNCH_PALETTE.TERTIARY}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            transform:
                              isTargetEsport && esportJoined
                                ? `translate3d(0px, ${(-2 * esportJoinSpring).toFixed(2)}px, 0px)`
                                : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <span
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: 13,
                                backgroundColor: '#FFFFFF',
                                border: `1.5px solid ${isJoined ? rowBorder : BLUE_BORDER}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {renderClubIcon(club.icon, isJoined, club.activeTone)}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 16.5, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                                {club.name}
                              </div>
                              <div
                                style={{
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: LAUNCH_PALETTE.INK_SOFT,
                                }}
                              >
                                {club.meta}
                              </div>
                            </div>
                          </div>

                          <span
                            style={{
                              padding: '7px 12px',
                              borderRadius: 999,
                              backgroundColor: isJoined
                                ? rowAccent
                                : isTargetEsport
                                  ? LAUNCH_PALETTE.PRIMARY_DARK
                                  : LAUNCH_PALETTE.SURFACE_MUTED,
                              border: `1px solid ${
                                isJoined ? rowAccent : LAUNCH_PALETTE.TERTIARY
                              }`,
                              color:
                                isJoined || isTargetEsport
                                  ? '#FFFFFF'
                                  : LAUNCH_PALETTE.PRIMARY_DARK,
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 10.5,
                              fontWeight: 900,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              transform: isTargetEsport
                                ? `scale(${buttonPressScale.toFixed(4)})`
                                : 'none',
                            }}
                          >
                            {isTargetEsport
                              ? esportJoined
                                ? '✓ Ahli Disahkan'
                                : 'Sertai Kelab'
                              : isJoined
                                ? 'Ahli Aktif ✓'
                                : 'Terbuka'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </KineticWindow>

              <GhostCursor
                keyframes={cursorKeyframes}
                appearFrame={f60(18)}
                disappearFrame={f60(82)}
                color={LAUNCH_PALETTE.PRIMARY}
                rippleColor={BLUE}
              />
            </Interactive.Div>

            {/* Swiss Architectural Connector 1: Club Join -> QR Scanner Gate */}
            <div
              style={{
                position: 'absolute',
                left: 536,
                top: 332,
                width: 64,
                height: 48,
                pointerEvents: 'none',
              }}
            >
              <EvolvingPath
                d="M 4 24 L 56 24 M 46 15 L 56 24 L 46 33"
                width={64}
                height={48}
                startFrame={conn1Start}
                durationFrames={conn1Duration}
                stroke={BLUE_DARK}
                trackStroke="rgba(191, 219, 254, 0.72)"
                strokeWidth={2.5}
                headDotColor={PURPLE}
                headDotRadius={4}
                hideDotWhenComplete
              />
            </div>

            {/* STAGE 2 — CENTER PANEL (Purple #A855F7): QR Scan + Shutter Flash + Rolling Merit Counter */}
            <Interactive.Div
              name="Merit QR Upright Scanner"
              premountFor={safeFps}
              style={{
                position: 'absolute',
                left: 600,
                top: 0,
                width: 536,
                height: 712,
                opacity: stage2Opacity,
                transform: `scale(${stage2Scale.toFixed(4)})`,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  borderRadius: 26,
                  padding: '22px 24px',
                  backgroundColor: 'rgba(22, 20, 34, 0.95)',
                  border: `2.5px solid ${PURPLE}`,
                  boxShadow: '0 24px 54px rgba(22, 20, 34, 0.24)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        color: PURPLE_BORDER,
                      }}
                    >
                      <ScanLine size={13} color={PURPLE} strokeWidth={2.5} />
                      <span>LANGKAH 02 • IMBAS QR ACARA</span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 19, fontWeight: 900, color: '#FFFFFF' }}>
                      jpp.polisas.edu.my/scan-qr
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      backgroundColor: isScanLocked ? EMERALD_INK : PURPLE_INK,
                      border: `1.5px solid ${isScanLocked ? EMERALD_BORDER : PURPLE_BORDER}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 900,
                      color: '#FFFFFF',
                    }}
                  >
                    {isScanLocked ? '✓ 100% SAH' : 'PENGIMBAS'}
                  </span>
                </div>

                {/* Upright QR Viewfinder with Laser Sweep + 6-Frame Shutter Flash */}
                <div
                  style={{
                    position: 'relative',
                    alignSelf: 'center',
                    width: 262,
                    height: 262,
                    borderRadius: 24,
                    backgroundColor: 'rgba(168, 85, 247, 0.14)',
                    border: '1.5px solid rgba(233, 213, 255, 0.34)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 18,
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 14px 32px rgba(0, 0, 0, 0.28)',
                    }}
                  >
                    <DeterministicQrMatrix
                      seed={20269041}
                      size={184}
                      fgColor="#111812"
                      bgColor="#FFFFFF"
                    />
                  </div>

                  {/* Corner Viewfinder Brackets */}
                  {[
                    {
                      top: 10,
                      left: 10,
                      borderTop: `4px solid ${PURPLE}`,
                      borderLeft: `4px solid ${PURPLE}`,
                      borderTopLeftRadius: 10,
                    },
                    {
                      top: 10,
                      right: 10,
                      borderTop: `4px solid ${PURPLE}`,
                      borderRight: `4px solid ${PURPLE}`,
                      borderTopRightRadius: 10,
                    },
                    {
                      bottom: 10,
                      left: 10,
                      borderBottom: `4px solid ${PURPLE}`,
                      borderLeft: `4px solid ${PURPLE}`,
                      borderBottomLeftRadius: 10,
                    },
                    {
                      bottom: 10,
                      right: 10,
                      borderBottom: `4px solid ${PURPLE}`,
                      borderRight: `4px solid ${PURPLE}`,
                      borderBottomRightRadius: 10,
                    },
                  ].map((corner, cIdx) => (
                    <div
                      key={cIdx}
                      style={{
                        position: 'absolute',
                        width: 28,
                        height: 28,
                        ...corner,
                      }}
                    />
                  ))}

                  {/* Volumetric Laser Blade */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 16,
                      right: 16,
                      top: laserOffsetY,
                      height: 4.5,
                      borderRadius: 999,
                      backgroundColor: isScanLocked ? EMERALD : PURPLE,
                      boxShadow: isScanLocked
                        ? '0 0 22px rgba(16, 185, 129, 0.95)'
                        : '0 0 22px rgba(168, 85, 247, 0.95)',
                    }}
                  />

                  {/* Crisp 6-Frame Shutter Flash Overlay at Scan Lock */}
                  {shutterFlashOpacity > 0.004 ? (
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: '#FFFFFF',
                        opacity: shutterFlashOpacity,
                        pointerEvents: 'none',
                      }}
                    />
                  ) : null}
                </div>

                {/* Event Metadata Row */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 16,
                    backgroundColor: 'rgba(248, 246, 238, 0.08)',
                    border: '1px solid rgba(233, 213, 255, 0.24)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF' }}>
                      MAKMP 2026 • Dewan Jubli Perak
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: isScanLocked ? EMERALD : PURPLE_BORDER,
                      }}
                    >
                      {isScanLocked ? 'Kehadiran Disahkan ✓ • 17:12 PM' : 'Mengimbas Kod Acara...'}
                    </div>
                  </div>
                  <QrCode size={22} color={PURPLE_BORDER} strokeWidth={2.2} />
                </div>

                {/* Live Rolling Merit Score Counter Box */}
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: 18,
                    backgroundColor: isScanLocked ? PURPLE_INK : 'rgba(168, 85, 247, 0.18)',
                    border: `2px solid ${PURPLE_BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    transform: `scale(${(0.97 + 0.03 * meritLockSpring).toFixed(4)})`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.6} />
                    <div>
                      <div
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: PURPLE_BORDER,
                        }}
                      >
                        JUMLAH MATA MERIT KOKURIKULUM
                      </div>
                      <div
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 15,
                          fontWeight: 900,
                          color: '#FFFFFF',
                        }}
                      >
                        +15 MATA MERIT ACARA ✓
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '6px 14px',
                      borderRadius: 12,
                      backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                      border: `1.5px solid ${EMERALD}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 22,
                      fontWeight: 900,
                      color: EMERALD,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {liveMeritTotal}
                  </div>
                </div>
              </div>
            </Interactive.Div>

            {/* Swiss Architectural Connector 2: Merit Counter -> e-Certificate Print */}
            <div
              style={{
                position: 'absolute',
                left: 1136,
                top: 332,
                width: 64,
                height: 48,
                pointerEvents: 'none',
              }}
            >
              <EvolvingPath
                d="M 4 24 L 56 24 M 46 15 L 56 24 L 46 33"
                width={64}
                height={48}
                startFrame={conn2Start}
                durationFrames={conn2Duration}
                stroke={PINK_DARK}
                trackStroke="rgba(251, 207, 232, 0.72)"
                strokeWidth={2.5}
                headDotColor={PINK}
                headDotRadius={4}
                hideDotWhenComplete
              />
            </div>

            {/* STAGE 3 — RIGHT PANEL (Pink #EC4899): Upright Official PDF e-Certificate Stamp */}
            <Interactive.Div
              name="EMS Upright Official e-Certificate"
              premountFor={safeFps}
              style={{
                position: 'absolute',
                left: 1200,
                top: 0,
                width: 576,
                height: 712,
                opacity: stage3Opacity,
                transform: `scale(${stage3Scale.toFixed(4)})`,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  borderRadius: 26,
                  padding: '22px 26px',
                  backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                  border: `2.5px solid ${PINK}`,
                  boxShadow: '0 26px 56px rgba(31, 39, 32, 0.24)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                {/* Sweeping Foil Reflection Sheen */}
                {foilOpacity > 0.004 ? (
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: '-45%',
                      left: `${foilLeftPct.toFixed(2)}%`,
                      width: '32%',
                      height: '190%',
                      opacity: foilOpacity,
                      background:
                        'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(251, 207, 232, 0.5) 50%, rgba(255,255,255,0) 100%)',
                      transform: 'rotate(24deg)',
                      pointerEvents: 'none',
                      zIndex: 5,
                    }}
                  />
                ) : null}

                {/* Certificate Chrome Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      padding: '5px 12px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(248, 246, 238, 0.08)',
                      border: '1px solid rgba(251, 207, 232, 0.32)',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 700,
                      color: PINK_BORDER,
                    }}
                  >
                    jpp.polisas.edu.my/sijil
                  </span>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 12px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(236, 72, 153, 0.22)',
                      border: `1px solid ${PINK}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 900,
                      color: '#FFFFFF',
                    }}
                  >
                    <Sparkles size={12} color={AMBER} strokeWidth={2.5} />
                    <span>LANGKAH 03 • E-SIJIL SAH ✓</span>
                  </span>
                </div>

                {/* Official Medallion Seal + Title */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.16em',
                      color: PINK_BORDER,
                    }}
                  >
                    SIJIL DIGITAL RASMI • POLISAS
                  </span>

                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 999,
                      backgroundColor: 'rgba(236, 72, 153, 0.22)',
                      border: `2.5px solid ${PINK}`,
                      boxShadow:
                        '0 18px 36px rgba(236, 72, 153, 0.3), inset 0 0 18px rgba(245, 158, 11, 0.24)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      transform: `scale(${medallionScale.toFixed(4)})`,
                    }}
                  >
                    <Award size={30} color={AMBER} strokeWidth={2.2} />
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: '0.11em',
                        color: PINK_BORDER,
                      }}
                    >
                      E-SIJIL 2026
                    </span>
                  </div>

                  <div
                    style={{
                      fontFamily: LAUNCH_FONTS.SERIF_ITALIC,
                      fontStyle: 'italic',
                      fontSize: 38,
                      lineHeight: 1.08,
                      color: '#FFFFFF',
                      textAlign: 'center',
                    }}
                  >
                    Anugerah Penyertaan Aktif
                  </div>

                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11.5,
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      color: LAUNCH_PALETTE.TERTIARY,
                    }}
                  >
                    MAKMP 2026 • DEWAN JUBLI PERAK
                  </span>
                </div>

                {/* Recipient Box */}
                <div
                  style={{
                    padding: '15px 18px',
                    borderRadius: 16,
                    backgroundColor: 'rgba(248, 246, 238, 0.08)',
                    border: '1px solid rgba(251, 207, 232, 0.24)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10,
                      fontWeight: 800,
                      color: LAUNCH_PALETTE.TERTIARY,
                      letterSpacing: '0.14em',
                    }}
                  >
                    DIANUGERAHKAN KEPADA
                  </div>
                  <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: '#FFFFFF' }}>
                    AIMAN HAKIM BIN AZMAN
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 12,
                      fontWeight: 800,
                      color: EMERALD,
                    }}
                  >
                    Pelajar Semester 1 • JTMK
                  </div>
                </div>

                {/* Serial + +15 Merit Pill */}
                <div
                  style={{
                    padding: '11px 16px',
                    borderRadius: 14,
                    backgroundColor: 'rgba(248, 246, 238, 0.06)',
                    border: '1px solid rgba(251, 207, 232, 0.22)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: '#FFFFFF',
                    }}
                  >
                    <ShieldCheck size={15} color={PINK} strokeWidth={2.4} />
                    <span>{safeCertSerial}</span>
                  </span>

                  <span
                    style={{
                      padding: '4px 11px',
                      borderRadius: 999,
                      backgroundColor: PURPLE_INK,
                      color: '#FFFFFF',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    +15 MERIT ✓
                  </span>
                </div>

                {/* Official PDF Download CTA */}
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: 999,
                    backgroundColor: PINK_INK,
                    border: `1.5px solid ${PINK_BORDER}`,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    fontSize: 14.5,
                    fontWeight: 900,
                    transform: `scale(${(0.96 + 0.04 * downloadSpring).toFixed(4)})`,
                  }}
                >
                  <Download size={16} strokeWidth={2.6} />
                  <span>Muat Turun PDF Rasmi Serta-Merta ✓</span>
                </div>

                {/* Celebration Burst Triggered at Official Seal Stamp */}
                <GeometricSparkBurst
                  triggerFrame={certSparkFrame}
                  x={288}
                  y={178}
                  durationFrames={46}
                  radius={74}
                  count={10}
                  seed="clubs-v6-ecert-burst"
                  colors={[PINK, AMBER, PURPLE]}
                  style={{ zIndex: 12 }}
                />
              </div>
            </Interactive.Div>
          </div>
        </div>
      </CameraStage>

      <EditorialFrameMarks
        chapterCode="06"
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
    description: 'Clubs Count',
  },
  activitiesCount: {
    type: 'number',
    default: 41,
    min: 1,
    max: 5000,
    integer: true,
    hiddenFromList: false,
    description: 'Activities Count',
  },
  certSerial: {
    type: 'string',
    default: 'EMS-CERT-2026-9041',
    description: 'Certificate Serial',
  },
} as const satisfies InteractivitySchema;

export const ClubsEmsScene = Interactive.withSchema({
  Component: ClubsEmsInner,
  componentName: 'ClubsEmsScene',
  schema: clubsEmsSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
