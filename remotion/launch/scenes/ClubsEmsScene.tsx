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
import { EvolvingPath, GeometricSparkBurst } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE } from '../tokens';
import { DeterministicQrMatrix, SpatialFloorGrid } from '../ui/KineticCard';

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
  readonly joinTapFrame: number | null;
  readonly activeTone: 'blue' | 'emerald' | 'open';
  readonly arcOffsetX: number;
  readonly baseZ: number;
};

const STUDENT_CLUBS: readonly StudentClubSpec[] = [
  {
    id: 'esport',
    name: 'Kelab E-Sport',
    meta: 'Sukan Digital · 142 Ahli',
    icon: 'gamepad',
    joinTapFrame: 48,
    activeTone: 'blue',
    arcOffsetX: 0,
    baseZ: 12,
  },
  {
    id: 'robosas',
    name: 'Robosas Robotik',
    meta: 'Inovasi & Kejuruteraan · 98 Ahli',
    icon: 'cpu',
    joinTapFrame: 64,
    activeTone: 'emerald',
    arcOffsetX: 6,
    baseZ: 24,
  },
  {
    id: 'commerce',
    name: 'Commerce Club',
    meta: 'Keusahawanan Siswa · 116 Ahli',
    icon: 'briefcase',
    joinTapFrame: null,
    activeTone: 'open',
    arcOffsetX: 8,
    baseZ: 32,
  },
  {
    id: 'pepka',
    name: 'PePKa',
    meta: 'Persatuan Pelajar Kampus · 210 Ahli',
    icon: 'users',
    joinTapFrame: 80,
    activeTone: 'emerald',
    arcOffsetX: 4,
    baseZ: 18,
  },
];

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const COUNTER_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const LASER_EASE = Easing.bezier(0.45, 0, 0.55, 1);
const SHEEN_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

const renderClubIcon = (icon: StudentClubSpec['icon'], isJoined: boolean, tone: StudentClubSpec['activeTone']) => {
  const color = !isJoined
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
  const timeSec = frame / safeFps;

  const safeClubs = Number.isFinite(clubsCount) ? Math.max(0, Math.round(clubsCount)) : 21;
  const safeActivities = Number.isFinite(activitiesCount)
    ? Math.max(0, Math.round(activitiesCount))
    : 41;
  const safeCertSerial = certSerial.trim() || 'EMS-CERT-2026-9041';

  // Beat 1 (0..1.5s): Header + Curved Blue Club Deck
  const pillStart = 0;
  const pillDuration = Math.max(8, Math.round(0.36 * safeFps));
  const headlineStart = Math.round(0.08 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.055 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.34 * safeFps));

  const counterStart = Math.round(0.12 * safeFps);
  const counterDuration = Math.max(18, Math.round(0.95 * safeFps));
  const liveClubs = Math.round(
    interpolate(frame, [counterStart, counterStart + counterDuration], [0, safeClubs], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: COUNTER_EASE,
    }),
  );
  const liveActivities = Math.round(
    interpolate(frame, [counterStart + 4, counterStart + counterDuration], [0, safeActivities], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: COUNTER_EASE,
    }),
  );

  const deckEnter = interpolate(frame, [Math.round(0.18 * safeFps), Math.round(0.72 * safeFps)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  // Connector 1 -> Laser Gate
  const conn1Start = Math.round(1.38 * safeFps); // 83f
  const conn1Duration = Math.max(12, Math.round(0.38 * safeFps));
  const gateStart = Math.round(1.52 * safeFps); // 91f
  const gateSpring =
    frame >= gateStart
      ? spring({
          frame: frame - gateStart,
          fps: safeFps,
          config: { damping: 16, stiffness: 215, mass: 0.9 },
        })
      : 0;
  const gateOpacity =
    frame >= gateStart
      ? interpolate(frame, [gateStart, gateStart + Math.round(0.2 * safeFps)], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  // Purple Volumetric Laser Sweeps & Locks at f=144 (Global 1914 -> active during Global f=1920!)
  const sweepStart = gateStart + Math.round(0.2 * safeFps); // 103f
  const sweepEnd = Math.round(2.4 * safeFps); // 144f
  const sweepProgress = interpolate(frame, [sweepStart, sweepEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: LASER_EASE,
  });
  const laserOffsetY = interpolate(sweepProgress, [0, 0.5, 1], [10, 192, 98]);
  const lockFrame = sweepEnd;
  const isScanLocked = frame >= lockFrame;
  const meritLaunchSpring = isScanLocked
    ? spring({
        frame: frame - lockFrame,
        fps: safeFps,
        config: { damping: 14, stiffness: 255, mass: 0.78 },
      })
    : 0;

  // Connector 2 -> Hero 3D Swinging Pink e-Certificate Showcase
  // Enters at f=138 so it's visibly swinging in at Global 1920 (Local 150) & fully glorious at Global 2040 (Local 270)!
  const conn2Start = Math.round(2.3 * safeFps); // 138f
  const conn2Duration = Math.max(12, Math.round(0.36 * safeFps));
  const certStart = Math.round(2.28 * safeFps); // 137f
  const certSpring =
    frame >= certStart
      ? spring({
          frame: frame - certStart,
          fps: safeFps,
          config: { damping: 15, stiffness: 195, mass: 0.92 },
        })
      : 0;
  const certOpacity =
    frame >= certStart
      ? interpolate(frame, [certStart, certStart + Math.round(0.2 * safeFps)], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  const certRotY = interpolate(certSpring, [0, 1], [-34, -11]);
  const certRotX = interpolate(certSpring, [0, 1], [12, 8]);
  const certFloatY = Math.sin(timeSec * 1.4 + 0.6) * 4 * certSpring;

  const certSparkFrame = Math.round(4.15 * safeFps); // 249f -> blooming burst visible across Global f=2040 (Local 270)
  const foilStart = Math.round(3.55 * safeFps);
  const foilProgress = interpolate(frame, [foilStart, foilStart + 44], [0, 1], {
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
    frame >= Math.round(3.85 * safeFps)
      ? spring({
          frame: frame - Math.round(3.85 * safeFps),
          fps: safeFps,
          config: { damping: 14, stiffness: 230, mass: 0.8 },
        })
      : 0;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.kelab.tint} />

      <CameraStage
        perspective={1500}
        zoomFrom={0.96}
        zoomTo={0.995}
        panXFrom={4}
        panXTo={-4}
        panYFrom={3}
        panYTo={-3}
        tiltXFrom={4}
        tiltXTo={-1}
        tiltYFrom={-4}
        tiltYTo={4}
        breathingAmplitude={0.35}
        entryPanYOffset={24}
        entryZoomOffset={-0.02}
        exitZoomDelta={0.032}
        exitFrames={Math.round(0.32 * safeFps)}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            fontFamily: LAUNCH_FONTS.DISPLAY,
            perspective: '1500px',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* 3D Perspective Architectural Floor Grid with Purple & Blue Radial Glows */}
          <SpatialFloorGrid accentColor={PURPLE} secondaryColor={BLUE} gridOpacity={0.22} scrollSpeed={15} />

          {/* Beat 1: Header + Live Clubs & Activities Counters */}
          <div
            style={{
              position: 'absolute',
              left: 68,
              right: 68,
              top: 66,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 24,
              zIndex: 10,
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, paddingBottom: 4 }}>
              <div
                style={{
                  padding: '10px 18px',
                  borderRadius: 16,
                  backgroundColor: BLUE_SOFT,
                  border: `1.5px solid ${BLUE}`,
                  boxShadow: '0 10px 26px rgba(59, 130, 246, 0.14)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  minWidth: 144,
                }}
              >
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 28,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: BLUE_INK,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {liveClubs}
                </span>
                <span style={{ marginTop: 4, fontFamily: LAUNCH_FONTS.MONO, fontSize: 10.5, fontWeight: 800, color: LAUNCH_PALETTE.PRIMARY }}>
                  KELAB AKTIF
                </span>
              </div>

              <div
                style={{
                  padding: '10px 18px',
                  borderRadius: 16,
                  backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                  border: `1.5px solid ${PINK}`,
                  boxShadow: '0 12px 28px rgba(236, 72, 153, 0.18)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  minWidth: 152,
                }}
              >
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 28,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: PINK,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {liveActivities}
                </span>
                <span style={{ marginTop: 4, fontFamily: LAUNCH_FONTS.MONO, fontSize: 10.5, fontWeight: 800, color: PINK_BORDER }}>
                  ACARA KAMPUS
                </span>
              </div>
            </div>
          </div>

          {/* 3-ZONE SPATIAL PIPELINE WITH TRUE Z-PARALLAX (y: 214..974) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 214,
              height: 754,
              perspective: '1450px',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* ZONE 1 (Left-Arc, x=158..590, Blue #3B82F6): 3D Curved Club Fan Deck */}
            <Interactive.Div
              name="Clubs 3D Curved Deck"
              premountFor={safeFps}
              style={{
                position: 'absolute',
                left: 158,
                top: 20,
                width: 432,
                height: 600,
                opacity: deckEnter,
                transformStyle: 'preserve-3d',
                transform: `translate3d(0px, ${((1 - deckEnter) * 24).toFixed(2)}px, 0px)`,
              }}
            >
              {/* Floating Top Route Pill at +16px Z */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 18,
                  backgroundColor: '#FFFFFF',
                  border: `1.8px solid ${BLUE}`,
                  borderBottom: `5px solid ${BLUE_INK}`,
                  boxShadow: '0 16px 32px rgba(37, 99, 235, 0.14)',
                  transform: 'translate3d(0px, 0px, 16px) rotateY(11deg)',
                }}
              >
                <div>
                  <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', color: BLUE_INK }}>
                    LANGKAH 01 • PILIH KELAB MINAT
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
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
                  3 DISERTAI ✓
                </span>
              </div>

              {/* 4 Individual Sculpted 3D Club Cards Arranged Along a Curved Z-Arc */}
              <div
                style={{
                  position: 'relative',
                  marginTop: 14,
                  height: 520,
                  transformStyle: 'preserve-3d',
                }}
              >
                {STUDENT_CLUBS.map((club, idx) => {
                  const joinFrame = club.joinTapFrame;
                  const isJoined = joinFrame !== null && frame >= joinFrame;
                  const joinSpring =
                    joinFrame !== null && isJoined
                      ? spring({
                          frame: frame - joinFrame,
                          fps: safeFps,
                          config: { damping: 14, stiffness: 245, mass: 0.78 },
                        })
                      : 0;
                  const zDepth = club.baseZ + 22 * joinSpring;
                  const activeColor = club.activeTone === 'blue' ? BLUE_INK : EMERALD_INK;
                  const activeBg = club.activeTone === 'blue' ? BLUE_SOFT : EMERALD_SOFT;
                  const activeBorder = club.activeTone === 'blue' ? BLUE : EMERALD;

                  return (
                    <div
                      key={club.id}
                      style={{
                        position: 'absolute',
                        left: club.arcOffsetX,
                        top: idx * 112,
                        width: 418,
                        height: 96,
                        borderRadius: 18,
                        padding: '0 14px',
                        backgroundColor: isJoined ? activeBg : '#FFFFFF',
                        border: `1.8px solid ${isJoined ? activeBorder : BLUE_BORDER}`,
                        borderBottom: `5px solid ${isJoined ? activeColor : LAUNCH_PALETTE.TERTIARY}`,
                        boxShadow: isJoined
                          ? '0 20px 40px rgba(37, 99, 235, 0.18), 0 6px 14px rgba(31, 39, 32, 0.08)'
                          : '0 10px 24px rgba(31, 39, 32, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        boxSizing: 'border-box',
                        transform: `translate3d(0px, ${(-3 * joinSpring).toFixed(2)}px, ${zDepth.toFixed(2)}px) rotateY(11deg)`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <span
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 13,
                            backgroundColor: '#FFFFFF',
                            border: `1.5px solid ${isJoined ? activeBorder : BLUE_BORDER}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {renderClubIcon(club.icon, isJoined, club.activeTone)}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                            {club.name}
                          </div>
                          <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 11, fontWeight: 700, color: LAUNCH_PALETTE.INK_SOFT }}>
                            {club.meta}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          padding: '7px 12px',
                          borderRadius: 999,
                          backgroundColor: isJoined ? activeColor : LAUNCH_PALETTE.SURFACE_MUTED,
                          border: `1px solid ${isJoined ? activeColor : LAUNCH_PALETTE.TERTIARY}`,
                          color: isJoined ? '#FFFFFF' : LAUNCH_PALETTE.PRIMARY_DARK,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 900,
                          flexShrink: 0,
                        }}
                      >
                        {isJoined ? 'Sertai Kelab ✓' : 'Terbuka'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Interactive.Div>

            {/* Blue -> Purple Connector Stream 1 */}
            <div
              style={{
                position: 'absolute',
                left: 596,
                top: 288,
                width: 46,
                height: 48,
                pointerEvents: 'none',
                transform: 'translate3d(0px, 0px, 40px)',
              }}
            >
              <EvolvingPath
                d="M 4 24 L 40 24 M 30 15 L 40 24 L 30 33"
                width={46}
                height={48}
                startFrame={conn1Start}
                durationFrames={conn1Duration}
                stroke={BLUE_DARK}
                trackStroke="rgba(191, 219, 254, 0.72)"
                strokeWidth={3.5}
                headDotColor={PURPLE}
                headDotRadius={4.5}
                hideDotWhenComplete
              />
            </div>

            {/* ZONE 2 (Center-Foreground, x=646..1114, Purple #A855F7): 3D Holographic QR Laser Gate (+48px Z) */}
            {gateOpacity > 0.005 ? (
              <Interactive.Div
                name="Merit QR 3D Laser Gate"
                premountFor={safeFps}
                style={{
                  position: 'absolute',
                  left: 646,
                  top: 22,
                  width: 468,
                  height: 576,
                  opacity: gateOpacity,
                  transformOrigin: '50% 50%',
                  transformStyle: 'preserve-3d',
                  willChange: 'transform, opacity',
                  transform: `translate3d(0px, ${(Math.sin(timeSec * 1.45) * 3).toFixed(2)}px, ${(48 * gateSpring).toFixed(2)}px) rotateX(7deg) rotateY(-2deg) scale(${(0.92 + 0.08 * gateSpring).toFixed(4)})`,
                  zIndex: 14,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    borderRadius: 26,
                    padding: '18px 22px',
                    backgroundColor: 'rgba(22, 20, 34, 0.94)',
                    border: `2.5px solid ${PURPLE}`,
                    boxShadow:
                      '0 44px 92px rgba(168, 85, 247, 0.28), 0 18px 38px rgba(31, 39, 32, 0.34)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Gate Header */}
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
                      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 900, color: '#FFFFFF' }}>
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

                  {/* 3D Extruded Purple Viewfinder Stage with Event QR + Volumetric Laser Blade */}
                  <div
                    style={{
                      position: 'relative',
                      alignSelf: 'center',
                      width: 244,
                      height: 244,
                      borderRadius: 22,
                      backgroundColor: 'rgba(168, 85, 247, 0.14)',
                      border: '1.5px solid rgba(233, 213, 255, 0.34)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* Pure-White Quiet Zone QR Code inside Viewfinder */}
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 16,
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 14px 32px rgba(0, 0, 0, 0.28)',
                      }}
                    >
                      <DeterministicQrMatrix
                        seed={20269041}
                        size={172}
                        fgColor="#111812"
                        bgColor="#FFFFFF"
                      />
                    </div>

                    {/* 4 Extruded 3D Purple Corner Viewfinder Brackets (+20px relative Z) */}
                    {[
                      { top: 10, left: 10, borderTop: `4px solid ${PURPLE}`, borderLeft: `4px solid ${PURPLE}`, borderTopLeftRadius: 10 },
                      { top: 10, right: 10, borderTop: `4px solid ${PURPLE}`, borderRight: `4px solid ${PURPLE}`, borderTopRightRadius: 10 },
                      { bottom: 10, left: 10, borderBottom: `4px solid ${PURPLE}`, borderLeft: `4px solid ${PURPLE}`, borderBottomLeftRadius: 10 },
                      { bottom: 10, right: 10, borderBottom: `4px solid ${PURPLE}`, borderRight: `4px solid ${PURPLE}`, borderBottomRightRadius: 10 },
                    ].map((corner, cIdx) => (
                      <div
                        key={cIdx}
                        style={{
                          position: 'absolute',
                          width: 28,
                          height: 28,
                          ...corner,
                          transform: 'translate3d(0px, 0px, 20px)',
                        }}
                      />
                    ))}

                    {/* Glowing Purple Volumetric Laser Blade + Projection Glow */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 16,
                        right: 16,
                        top: laserOffsetY,
                        height: 5,
                        borderRadius: 999,
                        backgroundColor: isScanLocked ? EMERALD : PURPLE,
                        boxShadow: isScanLocked
                          ? '0 0 28px rgba(16, 185, 129, 0.95), 0 10px 26px rgba(16, 185, 129, 0.45)'
                          : '0 0 28px rgba(168, 85, 247, 0.95), 0 10px 26px rgba(168, 85, 247, 0.48)',
                        transform: 'translate3d(0px, 0px, 28px)',
                      }}
                    />
                  </div>

                  {/* Verified Event Readout */}
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 16,
                      backgroundColor: 'rgba(248, 246, 238, 0.08)',
                      border: `1px solid rgba(233, 213, 255, 0.25)`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 15.5, fontWeight: 900, color: '#FFFFFF' }}>
                        MAKMP 2026 • Dewan Jubli Perak
                      </div>
                      <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 11.5, fontWeight: 700, color: PURPLE_BORDER }}>
                        {isScanLocked ? 'Hadir Disahkan • 17:12 PM' : 'Mengesahkan Kod Acara...'}
                      </div>
                    </div>
                    <QrCode size={20} color={PURPLE_BORDER} strokeWidth={2.2} />
                  </div>

                  {/* Launching Forward 3D Merit Capsule (+34px relative Z) */}
                  <div
                    style={{
                      padding: '11px 14px',
                      borderRadius: 16,
                      backgroundColor: PURPLE_INK,
                      border: `2px solid ${PURPLE_BORDER}`,
                      boxShadow: isScanLocked
                        ? '0 24px 48px rgba(168, 85, 247, 0.42)'
                        : '0 10px 24px rgba(0, 0, 0, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      color: '#FFFFFF',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11.5,
                      fontWeight: 900,
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                      transform: `translate3d(0px, ${(-4 * meritLaunchSpring).toFixed(2)}px, ${(34 * meritLaunchSpring).toFixed(2)}px) scale(${(0.96 + 0.04 * meritLaunchSpring).toFixed(4)})`,
                    }}
                  >
                    <CheckCircle2 size={15} color="#FFFFFF" strokeWidth={2.6} />
                    <span>+15 MATA MERIT KOKURIKULUM DISAHKAN</span>
                  </div>
                </div>
              </Interactive.Div>
            ) : null}

            {/* Purple -> Pink Connector Stream 2 */}
            <div
              style={{
                position: 'absolute',
                left: 1118,
                top: 288,
                width: 46,
                height: 48,
                pointerEvents: 'none',
                transform: 'translate3d(0px, 0px, 44px)',
              }}
            >
              <EvolvingPath
                d="M 4 24 L 40 24 M 30 15 L 40 24 L 30 33"
                width={46}
                height={48}
                startFrame={conn2Start}
                durationFrames={conn2Duration}
                stroke={PINK}
                trackStroke="rgba(251, 207, 232, 0.72)"
                strokeWidth={3.5}
                headDotColor={PINK_DARK}
                headDotRadius={4.5}
                hideDotWhenComplete
              />
            </div>

            {/* ZONE 3 (Right-Hero, x=1168..1640, Pink #EC4899): 3D Swinging Metallic Foil e-Certificate (+44px Z) */}
            {certOpacity > 0.005 ? (
              <Interactive.Div
                name="EMS 3D Foil e-Certificate"
                premountFor={safeFps}
                style={{
                  position: 'absolute',
                  left: 1168,
                  top: 22,
                  width: 472,
                  height: 580,
                  opacity: certOpacity,
                  transformOrigin: '50% 50%',
                  transformStyle: 'preserve-3d',
                  willChange: 'transform, opacity',
                  transform: `translate3d(0px, ${((1 - certSpring) * 34 + certFloatY).toFixed(2)}px, ${(44 * certSpring).toFixed(2)}px) rotateY(${certRotY.toFixed(2)}deg) rotateX(${certRotX.toFixed(2)}deg) scale(${(0.88 + 0.12 * certSpring).toFixed(4)})`,
                  zIndex: 12,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    borderRadius: 26,
                    padding: '16px 20px',
                    backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                    border: `2.5px solid ${PINK}`,
                    boxShadow:
                      '0 42px 88px rgba(236, 72, 153, 0.24), 0 18px 40px rgba(31, 39, 32, 0.34)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Inner Clipped Foil Reflection Sheen */}
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 26,
                      overflow: 'hidden',
                      pointerEvents: 'none',
                      zIndex: 5,
                    }}
                  >
                    {foilOpacity > 0.004 ? (
                      <div
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
                        }}
                      />
                    ) : null}
                  </div>

                  {/* Certificate Top Chrome */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '4px 10px',
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
                        padding: '5px 11px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(236, 72, 153, 0.2)',
                        border: `1px solid ${PINK}`,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10.5,
                        fontWeight: 900,
                        color: '#FFFFFF',
                      }}
                    >
                      <Sparkles size={12} color={AMBER} strokeWidth={2.5} />
                      <span>E-SIJIL SAH ✓</span>
                    </span>
                  </div>

                  {/* Elevated 3D Gold/Pink Award Medallion (+36px Z above certificate surface!) */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                      transformStyle: 'preserve-3d',
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
                        position: 'relative',
                        width: 88,
                        height: 88,
                        borderRadius: 999,
                        backgroundColor: 'rgba(236, 72, 153, 0.22)',
                        border: `2.5px solid ${PINK}`,
                        boxShadow:
                          '0 22px 40px rgba(236, 72, 153, 0.38), inset 0 0 18px rgba(245, 158, 11, 0.24)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3,
                        transform: 'translate3d(0px, -4px, 36px)',
                      }}
                    >
                      <Award size={26} color={AMBER} strokeWidth={2.2} />
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 9.5,
                          fontWeight: 900,
                          letterSpacing: '0.11em',
                          color: PINK_BORDER,
                        }}
                      >
                        E-SIJIL 2026
                      </span>

                      <div style={{ position: 'absolute', left: '50%', top: '50%', pointerEvents: 'none' }}>
                        <GeometricSparkBurst
                          triggerFrame={certSparkFrame}
                          x={0}
                          y={0}
                          durationFrames={38}
                          radius={68}
                          count={10}
                          seed="clubs-ems-medallion-burst"
                          colors={[PINK, AMBER, PURPLE]}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        fontFamily: LAUNCH_FONTS.SERIF_ITALIC,
                        fontStyle: 'italic',
                        fontSize: 30,
                        lineHeight: 1.05,
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
                      padding: '11px 16px',
                      borderRadius: 15,
                      backgroundColor: 'rgba(248, 246, 238, 0.08)',
                      border: '1px solid rgba(251, 207, 232, 0.24)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 9.5, fontWeight: 800, color: LAUNCH_PALETTE.TERTIARY, letterSpacing: '0.14em' }}>
                      DIANUGERAHKAN KEPADA
                    </div>
                    <div style={{ marginTop: 3, fontSize: 18, fontWeight: 900, color: '#FFFFFF' }}>
                      AIMAN HAKIM BIN AZMAN
                    </div>
                    <div style={{ marginTop: 3, fontFamily: LAUNCH_FONTS.MONO, fontSize: 11, fontWeight: 800, color: EMERALD }}>
                      Pelajar Semester 1 • JTMK
                    </div>
                  </div>

                  {/* Certificate Serial + Verified Merit Badge */}
                  <div
                    style={{
                      padding: '10px 14px',
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
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#FFFFFF',
                      }}
                    >
                      <ShieldCheck size={14} color={PINK} strokeWidth={2.4} />
                      <span>{safeCertSerial}</span>
                    </span>

                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        backgroundColor: PURPLE_INK,
                        color: '#FFFFFF',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10.5,
                        fontWeight: 900,
                      }}
                    >
                      +15 MERIT
                    </span>
                  </div>

                  {/* Download Official PDF Button (+18px relative Z) */}
                  <div
                    style={{
                      padding: '11px 16px',
                      borderRadius: 999,
                      backgroundColor: PINK_INK,
                      border: `1.5px solid ${PINK_BORDER}`,
                      boxShadow: '0 18px 36px rgba(219, 39, 119, 0.34)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontSize: 13.5,
                      fontWeight: 900,
                      transform: `translate3d(0px, 0px, ${(18 * downloadSpring).toFixed(2)}px) scale(${(0.95 + 0.05 * downloadSpring).toFixed(4)})`,
                    }}
                  >
                    <Download size={16} strokeWidth={2.6} />
                    <span>Muat Turun PDF Rasmi ✓</span>
                  </div>
                </div>
              </Interactive.Div>
            ) : null}
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
