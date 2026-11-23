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
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';
import {
  DeterministicQrMatrix,
  ExplodedLayer,
  KineticWindow,
} from '../ui/KineticCard';

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
  readonly activeTone: 'accent' | 'sage' | 'open';
};

const STUDENT_CLUBS: readonly StudentClubSpec[] = [
  {
    id: 'esport',
    name: 'Kelab E-Sport',
    meta: 'Sukan Digital · 142 Ahli',
    icon: 'gamepad',
    joinTapFrame: 62,
    activeTone: 'accent',
  },
  {
    id: 'robosas',
    name: 'Robosas Robotik',
    meta: 'Inovasi & Kejuruteraan · 98 Ahli',
    icon: 'cpu',
    joinTapFrame: 76,
    activeTone: 'sage',
  },
  {
    id: 'commerce',
    name: 'Commerce Club',
    meta: 'Keusahawanan Siswa · 116 Ahli',
    icon: 'briefcase',
    joinTapFrame: null,
    activeTone: 'open',
  },
  {
    id: 'pepka',
    name: 'PePKa',
    meta: 'Persatuan Pelajar Kampus · 210 Ahli',
    icon: 'users',
    joinTapFrame: 90,
    activeTone: 'sage',
  },
];

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const COUNTER_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const LASER_EASE = Easing.bezier(0.45, 0, 0.55, 1);
const SHEEN_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

// 3-Column Horizontal Student Co-Curricular Journey geometry inside 1920x1080 safe bounds
const PIPELINE_LEFT = 64;
const PIPELINE_TOP = 228;
const PIPELINE_HEIGHT = 738;
const COL1_WIDTH = 550;
const CONN_WIDTH = 66;
const COL2_WIDTH = 550;
const COL3_WIDTH = 560;
const TOTAL_PIPELINE_WIDTH = COL1_WIDTH + CONN_WIDTH + COL2_WIDTH + CONN_WIDTH + COL3_WIDTH; // 1792

const MEDALLION_SIZE = 104;

const renderClubIcon = (icon: StudentClubSpec['icon'], isJoined: boolean, tone: StudentClubSpec['activeTone']) => {
  const color = !isJoined
    ? LAUNCH_PALETTE.PRIMARY
    : tone === 'accent'
      ? LAUNCH_PALETTE.ACCENT
      : LAUNCH_PALETTE.SECONDARY;
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
  const { fps, durationInFrames } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeDuration = Math.max(30, Number.isFinite(durationInFrames) ? durationInFrames : 390);
  const timeSec = frame / safeFps;

  const safeClubs = Number.isFinite(clubsCount) ? Math.max(0, Math.round(clubsCount)) : 21;
  const safeActivities = Number.isFinite(activitiesCount)
    ? Math.max(0, Math.round(activitiesCount))
    : 41;
  const safeCertSerial = certSerial.trim() || 'EMS-CERT-2026-9041';

  // Beat 1 (0..1.8s): Top Student Header + Live Rolling Counters + Column 1 Club Directory
  const pillStart = 0;
  const pillDuration = Math.max(8, Math.round(0.36 * safeFps));
  const headlineStart = Math.round(0.1 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.055 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.34 * safeFps));

  const counterStart = Math.round(0.12 * safeFps);
  const clubsCounterEnd = Math.max(counterStart + 8, Math.round(1.18 * safeFps));
  const activitiesCounterEnd = Math.max(counterStart + 10, Math.round(1.36 * safeFps));

  const liveClubs = Math.round(
    interpolate(frame, [counterStart, clubsCounterEnd], [0, safeClubs], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: COUNTER_EASE,
    }),
  );
  const liveActivities = Math.round(
    interpolate(frame, [counterStart, activitiesCounterEnd], [0, safeActivities], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: COUNTER_EASE,
    }),
  );

  const counterCardOpacity = interpolate(
    frame,
    [counterStart, counterStart + Math.max(6, Math.round(0.3 * safeFps))],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  // Column 1 entry
  const col1Enter = interpolate(
    frame,
    [Math.round(0.16 * safeFps), Math.round(0.74 * safeFps)],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );
  const col1Opacity = interpolate(col1Enter, [0, 0.25, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const col1TranslateY = interpolate(col1Enter, [0, 1], [26, 0]);
  const col1FloatY = Math.sin(timeSec * 1.35) * 2.2 * col1Enter;

  const baseRowEnter = Math.round(0.45 * safeFps); // 27f, staggered 5 frames apart
  const rowEnterStagger = Math.max(3, Math.round((5 / 60) * safeFps)); // 5f @ 60fps
  const joinedCount = STUDENT_CLUBS.reduce((acc, club) => {
    if (club.joinTapFrame !== null) {
      const scaledTap = Math.round((club.joinTapFrame / 60) * safeFps);
      return frame >= scaledTap ? acc + 1 : acc;
    }
    return acc;
  }, 0);

  // Connector 1 (Column 1 -> Column 2)
  const conn1Start = Math.round(1.52 * safeFps); // 91f
  const conn1Duration = Math.max(10, Math.round(0.38 * safeFps)); // 23f -> ends 114f
  const conn1End = conn1Start + conn1Duration;
  const conn1Done = frame >= conn1End;
  const pulseCycle = Math.max(32, Math.round(1.05 * safeFps));
  const conn1PulsePhase = conn1Done ? ((frame - conn1End) % pulseCycle) / pulseCycle : 0;
  const conn1PulseX = interpolate(conn1PulsePhase, [0, 1], [8, 56]);
  const conn1PulseOpacity = conn1Done
    ? interpolate(conn1PulsePhase, [0, 0.18, 0.82, 1], [0.2, 1, 1, 0.15], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  // Beat 2 (1.6..4.0s): Column 2 Live Student Scan QR Merit Viewfinder
  const col2EnterStart = Math.round(1.58 * safeFps); // 95f
  const col2EnterEnd = Math.max(col2EnterStart + 10, Math.round(2.08 * safeFps)); // 125f
  const col2Enter = interpolate(frame, [col2EnterStart, col2EnterEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const col2Opacity = interpolate(col2Enter, [0, 0.28, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const col2TranslateX = interpolate(col2Enter, [0, 1], [28, 0]);
  const col2Scale = interpolate(col2Enter, [0, 1], [0.95, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    output: 'perceptual-scale',
  });
  const col2FloatY = Math.cos(timeSec * 1.45 + 0.6) * 2.2 * col2Enter;

  // Sweeping terracotta laser beam (10% -> 90% -> 10%)
  const laserDownStart = Math.round(2.02 * safeFps); // 121f
  const laserMid = Math.max(laserDownStart + 4, Math.round(2.62 * safeFps)); // 157f
  const laserUpEnd = Math.max(laserMid + 4, Math.round(3.18 * safeFps)); // 191f
  const laserPct = interpolate(
    frame,
    [laserDownStart, laserMid, laserUpEnd],
    [10, 90, 10],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: LASER_EASE,
    },
  );
  const isLaserActive = frame >= laserDownStart && frame <= laserUpEnd;
  const scanPercent = Math.round(
    interpolate(frame, [laserDownStart, laserUpEnd], [0, 100], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  // Crisp 6-frame lock exposure flash (snaps strictly to 0 after)
  const flashStart = Math.max(laserUpEnd + 1, Math.round(3.2 * safeFps)); // 192f
  const flashFrames = Math.max(3, Math.round((6 / 60) * safeFps)); // 6f @ 60fps
  const flashPeak = flashStart + 1;
  const flashEnd = flashStart + flashFrames;
  const inFlashWindow = frame >= flashStart && frame < flashEnd;
  const flashOpacity = inFlashWindow
    ? interpolate(frame, [flashStart, flashPeak, flashEnd], [0.22, 0.92, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const isQrVerified = frame >= flashPeak;

  // Spring-popping +15 MATA MERIT KOKURIKULUM DISAHKAN toast banner
  const toastStart = flashPeak + 2; // 195f
  const toastSpring =
    frame >= toastStart
      ? spring({
          frame: frame - toastStart,
          fps: safeFps,
          config: { damping: 14, stiffness: 240, mass: 0.78 },
        })
      : 0;
  const toastScale = 0.88 + 0.12 * toastSpring;
  const toastOpacity =
    frame >= toastStart
      ? interpolate(frame - toastStart, [0, Math.max(3, Math.round(0.08 * safeFps))], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  // Connector 2 (Column 2 -> Column 3)
  const conn2Start = Math.round(3.28 * safeFps); // 197f
  const conn2Duration = Math.max(10, Math.round(0.36 * safeFps)); // 22f -> ends 219f
  const conn2End = conn2Start + conn2Duration;
  const conn2Done = frame >= conn2End;
  const conn2PulsePhase = conn2Done ? ((frame - conn2End) % pulseCycle) / pulseCycle : 0;
  const conn2PulseX = interpolate(conn2PulsePhase, [0, 1], [8, 56]);
  const conn2PulseOpacity = conn2Done
    ? interpolate(conn2PulsePhase, [0, 0.18, 0.82, 1], [0.2, 1, 1, 0.15], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  // Beat 3 (3.4..6.5s): Column 3 Official Student Digital e-Certificate (ExplodedLayer zDepth=30)
  const certPopStart = Math.round(3.4 * safeFps); // 204f
  const sheenStart = Math.round(4.15 * safeFps); // 249f
  const sheenPeriod = Math.max(48, Math.round(1.65 * safeFps)); // 99f: 62% sweep + 38% rest gap
  const sheenElapsed = frame - sheenStart;
  const sheenPhase = sheenElapsed >= 0 ? (sheenElapsed % sheenPeriod) / sheenPeriod : 0;
  const sheenProgress = interpolate(sheenPhase, [0, 0.62], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SHEEN_EASE,
  });
  const sheenOpacity =
    sheenElapsed >= 0
      ? interpolate(sheenPhase, [0, 0.12, 0.5, 0.62], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;
  const sheenX = interpolate(sheenProgress, [0, 1], [-220, 760]);

  const downloadBtnCue = Math.round(3.92 * safeFps); // 235f
  const downloadBtnSpring =
    frame >= downloadBtnCue
      ? spring({
          frame: frame - downloadBtnCue,
          fps: safeFps,
          config: { damping: 14, stiffness: 230, mass: 0.82 },
        })
      : 0;

  // Restrained architectural watch-glint spark burst hugging the E-SIJIL 2026 medallion
  const sparkTrigger = Math.round(4.83 * safeFps); // 290f -> peak crisp glint right at f300!
  const sparkDuration = Math.max(24, Math.round(1.05 * safeFps)); // 63f

  // Subtle exit lead on pipeline
  const exitFrames = Math.max(2, Math.round(0.35 * safeFps));
  const sceneEnd = Math.max(1, safeDuration - 1);
  const exitStart = Math.max(0, Math.min(sceneEnd - 1, safeDuration - exitFrames));
  const exitFactor = interpolate(frame, [exitStart, sceneEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.55, 0, 1, 0.45),
  });
  const pipelineExitScale = 1 + 0.012 * exitFactor;

  const liveDotScale = 0.84 + Math.sin(timeSec * 5.8) * 0.2;
  const qrBoxBorderColor = inFlashWindow
    ? LAUNCH_PALETTE.ACCENT
    : isQrVerified
      ? LAUNCH_PALETTE.SECONDARY
      : isLaserActive
        ? LAUNCH_PALETTE.ACCENT
        : LAUNCH_PALETTE.TERTIARY;
  const bracketColor = isQrVerified
    ? LAUNCH_PALETTE.SECONDARY
    : isLaserActive
      ? LAUNCH_PALETTE.ACCENT
      : LAUNCH_PALETTE.TERTIARY;

  return (
    <>
      <EditorialBackdrop />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.032}
        panXFrom={10}
        panXTo={-10}
        panYFrom={4}
        panYTo={-4}
        tiltXFrom={0.32}
        tiltXTo={-0.28}
        tiltYFrom={0.75}
        tiltYTo={-0.75}
        breathingAmplitude={0.55}
        entryPanYOffset={40}
        entryZoomOffset={-0.02}
        exitZoomDelta={0.036}
        exitFrames={Math.round(0.35 * safeFps)}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            fontFamily: LAUNCH_FONTS.DISPLAY,
            perspective: '1800px',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Top Student Header Row (y ~ 82..204) */}
          <Interactive.Div
            name="Clubs Student Header"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: PIPELINE_LEFT,
              right: PIPELINE_LEFT,
              top: 82,
              height: 122,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 24,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, minWidth: 0 }}>
              <KineticReveal startFrame={pillStart} durationFrames={pillDuration}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    alignSelf: 'flex-start',
                    padding: '6px 17px',
                    borderRadius: 999,
                    backgroundColor: 'rgba(201, 111, 79, 0.12)',
                    border: `1.5px solid ${LAUNCH_PALETTE.ACCENT}`,
                    color: LAUNCH_PALETTE.ACCENT,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '0.16em',
                  }}
                >
                  <Award size={15} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
                  <span>17:00 PETANG • {safeClubs} KELAB, MERIT &amp; E-SIJIL</span>
                </div>
              </KineticReveal>

              <h2
                style={{
                  margin: 0,
                  display: 'flex',
                  flexWrap: 'nowrap',
                  alignItems: 'baseline',
                  columnGap: '0.24em',
                  fontSize: 45,
                  fontWeight: 900,
                  lineHeight: 1.06,
                  letterSpacing: '-0.03em',
                  color: LAUNCH_PALETTE.PRIMARY,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    color: LAUNCH_PALETTE.ACCENT,
                    fontVariantNumeric: 'tabular-nums',
                    display: 'inline-block',
                    minWidth: `${Math.max(2, String(safeClubs).length)}ch`,
                    textAlign: 'right',
                  }}
                >
                  {liveClubs}
                </span>
                <KineticWords
                  as="span"
                  text="Kelab. Imbas QR Acara. Kumpul Merit & e-Sijil."
                  startFrame={headlineStart}
                  staggerFrames={wordStagger}
                  wordDurationFrames={wordDuration}
                  accentWords={['Merit', '&', 'e-Sijil.']}
                  accentColor={LAUNCH_PALETTE.ACCENT}
                  style={{
                    fontSize: 45,
                    fontWeight: 900,
                    lineHeight: 1.06,
                    letterSpacing: '-0.03em',
                    color: LAUNCH_PALETTE.PRIMARY,
                  }}
                />
              </h2>
            </div>

            {/* Compact Student KPI Pills */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: counterCardOpacity,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: '10px 18px',
                  borderRadius: 16,
                  backgroundColor: LAUNCH_PALETTE.CARD_BG,
                  border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                  boxShadow: '0 12px 28px rgba(46, 58, 47, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  minWidth: 148,
                }}
              >
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 28,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: LAUNCH_PALETTE.PRIMARY,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {liveClubs}
                </span>
                <span
                  style={{
                    marginTop: 5,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: '0.13em',
                    color: LAUNCH_PALETTE.MUTED_OLIVE,
                  }}
                >
                  KELAB AKTIF
                </span>
              </div>

              <div
                style={{
                  padding: '10px 18px',
                  borderRadius: 16,
                  backgroundColor: LAUNCH_PALETTE.PRIMARY,
                  border: '1.5px solid rgba(217, 201, 178, 0.28)',
                  boxShadow: '0 14px 30px rgba(31, 39, 32, 0.16)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  minWidth: 158,
                }}
              >
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 28,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: LAUNCH_PALETTE.ACCENT,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {liveActivities}
                </span>
                <span
                  style={{
                    marginTop: 5,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: '0.13em',
                    color: LAUNCH_PALETTE.TERTIARY,
                  }}
                >
                  ACARA KAMPUS
                </span>
              </div>
            </div>
          </Interactive.Div>

          {/* 3-Column Horizontal Student Co-Curricular Journey (y ~ 228..966) */}
          <div
            style={{
              position: 'absolute',
              left: PIPELINE_LEFT,
              top: PIPELINE_TOP,
              width: TOTAL_PIPELINE_WIDTH,
              height: PIPELINE_HEIGHT,
              display: 'flex',
              alignItems: 'stretch',
              transformStyle: 'preserve-3d',
              transform: `scale(${pipelineExitScale.toFixed(4)})`,
            }}
          >
            {/* COLUMN 1 (550px): Beat 1 — Live Student Club Directory (jpp.polisas.edu.my/kelab) */}
            <Interactive.Div
              name="Student Club Directory"
              premountFor={safeFps}
              style={{
                width: COL1_WIDTH,
                height: PIPELINE_HEIGHT,
                flexShrink: 0,
                opacity: col1Opacity,
                transform: `translate3d(0px, ${(col1TranslateY + col1FloatY).toFixed(2)}px, 0px)`,
              }}
            >
              <KineticWindow
                surface="light"
                routeLabel="kelab · direktori siswa"
                statusPill={`${safeClubs} KELAB`}
                statusAccent
                width={COL1_WIDTH}
                height={PIPELINE_HEIGHT}
                borderRadius={24}
                sheenStartFrame={Math.round(0.85 * safeFps)}
                sheenDuration={42}
                style={{
                  borderColor: LAUNCH_PALETTE.TERTIARY,
                  boxShadow:
                    '0 24px 54px rgba(31, 39, 32, 0.12), 0 6px 16px rgba(31, 39, 32, 0.06)',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: '20px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Column 1 Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      paddingBottom: 12,
                      borderBottom: `1.5px solid ${LAUNCH_PALETTE.SURFACE_MUTED}`,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10.5,
                          fontWeight: 800,
                          letterSpacing: '0.14em',
                          color: LAUNCH_PALETTE.SECONDARY,
                        }}
                      >
                        LANGKAH 01 • PILIH KELAB MINAT
                      </span>
                      <span
                        style={{
                          fontSize: 20,
                          fontWeight: 900,
                          letterSpacing: '-0.02em',
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        Direktori Kelab Pelajar
                      </span>
                    </div>

                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(107, 127, 91, 0.14)',
                        border: `1px solid ${LAUNCH_PALETTE.SECONDARY}`,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11,
                        fontWeight: 900,
                        color: LAUNCH_PALETTE.PRIMARY,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {joinedCount} DISERTAI ✓
                    </div>
                  </div>

                  {/* 4 Authentic POLISAS Student Club Rows (Staggered 5 frames apart) */}
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    {STUDENT_CLUBS.map((club, idx) => {
                      const rowEnterStart = baseRowEnter + idx * rowEnterStagger;
                      const rowProg = interpolate(
                        frame,
                        [rowEnterStart, rowEnterStart + Math.max(8, Math.round(0.28 * safeFps))],
                        [0, 1],
                        {
                          extrapolateLeft: 'clamp',
                          extrapolateRight: 'clamp',
                          easing: EXPO_OUT,
                        },
                      );
                      const rowY = interpolate(rowProg, [0, 1], [18, 0]);

                      const scaledTapFrame =
                        club.joinTapFrame !== null
                          ? Math.round((club.joinTapFrame / 60) * safeFps)
                          : null;
                      const isJoined = scaledTapFrame !== null && frame >= scaledTapFrame;
                      const tapElapsed = scaledTapFrame !== null ? frame - scaledTapFrame : -1;
                      const tapSpring =
                        isJoined && tapElapsed >= 0
                          ? spring({
                              frame: tapElapsed,
                              fps: safeFps,
                              config: { damping: 13, stiffness: 260, mass: 0.72 },
                            })
                          : 0;
                      const pillTapBounce =
                        isJoined && tapElapsed >= 0 && tapElapsed < 14
                          ? interpolate(tapElapsed, [0, 4, 14], [0.9, 1.08, 1], {
                              extrapolateLeft: 'clamp',
                              extrapolateRight: 'clamp',
                            })
                          : 1;

                      const rowBg = isJoined
                        ? club.activeTone === 'accent'
                          ? 'rgba(201, 111, 79, 0.08)'
                          : 'rgba(107, 127, 91, 0.1)'
                        : LAUNCH_PALETTE.SURFACE_MUTED;
                      const rowBorder = isJoined
                        ? club.activeTone === 'accent'
                          ? LAUNCH_PALETTE.ACCENT
                          : LAUNCH_PALETTE.SECONDARY
                        : LAUNCH_PALETTE.TERTIARY;

                      const pillBg = isJoined
                        ? club.activeTone === 'accent'
                          ? LAUNCH_PALETTE.ACCENT
                          : LAUNCH_PALETTE.SECONDARY
                        : LAUNCH_PALETTE.CARD_BG;
                      const pillBorder = isJoined ? pillBg : LAUNCH_PALETTE.TERTIARY;
                      const pillColor = isJoined
                        ? LAUNCH_PALETTE.CARD_BG
                        : LAUNCH_PALETTE.MUTED_OLIVE;

                      return (
                        <div
                          key={club.id}
                          style={{
                            flex: 1,
                            padding: '12px 15px',
                            borderRadius: 16,
                            backgroundColor: rowBg,
                            border: `1.5px solid ${rowBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            opacity: rowProg,
                            transform: `translate3d(0px, ${rowY.toFixed(2)}px, 0px)`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <div
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: 12,
                                backgroundColor: LAUNCH_PALETTE.CARD_BG,
                                border: `1.5px solid ${
                                  isJoined ? rowBorder : LAUNCH_PALETTE.TERTIARY
                                }`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {renderClubIcon(club.icon, isJoined, club.activeTone)}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: 17,
                                  fontWeight: 800,
                                  color: LAUNCH_PALETTE.PRIMARY,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {club.name}
                              </span>
                              <span
                                style={{
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  color: LAUNCH_PALETTE.MUTED_OLIVE,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {club.meta}
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              padding: '7px 13px',
                              borderRadius: 999,
                              backgroundColor: pillBg,
                              border: `1.5px solid ${pillBorder}`,
                              color: pillColor,
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11,
                              fontWeight: 900,
                              letterSpacing: '0.05em',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              transform: `scale(${(isJoined ? (0.94 + 0.06 * tapSpring) * pillTapBounce : 1).toFixed(3)})`,
                              boxShadow: isJoined
                                ? '0 6px 14px rgba(46, 58, 47, 0.14)'
                                : 'none',
                            }}
                          >
                            {club.activeTone === 'open'
                              ? 'Terbuka'
                              : isJoined
                                ? 'Sertai Kelab ✓'
                                : 'Sertai'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Column 1 Footer Helper */}
                  <div
                    style={{
                      padding: '11px 15px',
                      borderRadius: 14,
                      backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                      border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11,
                        fontWeight: 700,
                        color: LAUNCH_PALETTE.MUTED_OLIVE,
                      }}
                    >
                      jpp.polisas.edu.my/kelab
                    </span>
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        color: LAUNCH_PALETTE.SECONDARY,
                      }}
                    >
                      DAFTAR 1 KLIK • TERBUKA
                    </span>
                  </div>
                </div>
              </KineticWindow>
            </Interactive.Div>

            {/* CONNECTOR 1 (66px): Animated EvolvingPath Arrow into Column 2 */}
            <div
              style={{
                position: 'relative',
                width: CONN_WIDTH,
                height: PIPELINE_HEIGHT,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ position: 'relative', width: 66, height: 48 }}>
                <EvolvingPath
                  d="M 6 24 L 56 24"
                  width={66}
                  height={48}
                  viewBox="0 0 66 48"
                  startFrame={conn1Start}
                  durationFrames={conn1Duration}
                  stroke={LAUNCH_PALETTE.ACCENT}
                  trackStroke={LAUNCH_PALETTE.TERTIARY}
                  strokeWidth={3.5}
                  showHeadDot
                  headDotRadius={4.5}
                  headDotColor={LAUNCH_PALETTE.ACCENT}
                  hideDotWhenComplete
                  style={{ display: 'block' }}
                />
                <svg
                  width={66}
                  height={48}
                  viewBox="0 0 66 48"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    overflow: 'visible',
                  }}
                >
                  <path
                    d="M 49 17 L 57 24 L 49 31"
                    fill="none"
                    stroke={conn1Done ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.TERTIARY}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {conn1Done ? (
                    <g
                      transform={`translate(${conn1PulseX.toFixed(2)}, 24)`}
                      opacity={conn1PulseOpacity}
                    >
                      <circle cx={0} cy={0} r={4.5} fill={LAUNCH_PALETTE.SECONDARY} />
                    </g>
                  ) : null}
                </svg>
              </div>
            </div>

            {/* COLUMN 2 (550px): Beat 2 — Live Student Scan QR Merit Viewfinder (jpp.polisas.edu.my/scan-qr) */}
            <Interactive.Div
              name="Student Scan QR Merit Viewfinder"
              premountFor={safeFps}
              style={{
                width: COL2_WIDTH,
                height: PIPELINE_HEIGHT,
                flexShrink: 0,
                opacity: col2Opacity,
                visibility: col2Opacity <= 0.001 ? 'hidden' : 'visible',
                transformOrigin: '50% 50%',
                transform: `translate3d(${col2TranslateX.toFixed(2)}px, ${col2FloatY.toFixed(2)}px, 0px) scale(${col2Scale.toFixed(4)})`,
              }}
            >
              <KineticWindow
                surface="dark"
                routeLabel="scan qr · merit siswa"
                statusPill="KAMERA AKTIF"
                statusAccent={!isQrVerified}
                width={COL2_WIDTH}
                height={PIPELINE_HEIGHT}
                borderRadius={24}
                sheenStartFrame={flashStart + 3}
                sheenDuration={38}
                style={{
                  border: `1.5px solid ${
                    inFlashWindow
                      ? LAUNCH_PALETTE.ACCENT
                      : isQrVerified
                        ? LAUNCH_PALETTE.SECONDARY
                        : 'rgba(217, 201, 178, 0.24)'
                  }`,
                  boxShadow: inFlashWindow
                    ? '0 24px 64px rgba(201, 111, 79, 0.34), 0 0 0 5px rgba(201, 111, 79, 0.22)'
                    : '0 28px 64px rgba(31, 39, 32, 0.24), 0 8px 20px rgba(31, 39, 32, 0.14)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    flex: 1,
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Column 2 Subheader */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10.5,
                          fontWeight: 800,
                          letterSpacing: '0.14em',
                          color: LAUNCH_PALETTE.TERTIARY,
                        }}
                      >
                        LANGKAH 02 • IMBAS QR ACARA
                      </span>
                      <span
                        style={{
                          fontSize: 19,
                          fontWeight: 900,
                          color: LAUNCH_PALETTE.BACKGROUND,
                        }}
                      >
                        jpp.polisas.edu.my/scan-qr
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '6px 12px',
                        borderRadius: 999,
                        backgroundColor: isQrVerified
                          ? 'rgba(107, 127, 91, 0.28)'
                          : 'rgba(201, 111, 79, 0.2)',
                        border: `1px solid ${
                          isQrVerified ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.ACCENT
                        }`,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 900,
                        color: LAUNCH_PALETTE.BACKGROUND,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {isQrVerified ? (
                        <Check size={13} color={LAUNCH_PALETTE.TERTIARY} strokeWidth={3} />
                      ) : (
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.ACCENT,
                            transform: `scale(${liveDotScale.toFixed(3)})`,
                            display: 'inline-block',
                          }}
                        />
                      )}
                      <span>{isQrVerified ? '100% SAH' : `${scanPercent}%`}</span>
                    </div>
                  </div>

                  {/* Crisp Viewfinder Reticle Frame Holding Porcelain QR Card */}
                  <div
                    style={{
                      position: 'relative',
                      alignSelf: 'center',
                      width: 266,
                      height: 266,
                      borderRadius: 24,
                      backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                      border: `1.5px solid ${qrBoxBorderColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {/* 4 Corner Viewfinder Brackets */}
                    <span
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: 12,
                        width: 22,
                        height: 22,
                        borderTop: `3.5px solid ${bracketColor}`,
                        borderLeft: `3.5px solid ${bracketColor}`,
                        borderTopLeftRadius: 6,
                        zIndex: 4,
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 12,
                        width: 22,
                        height: 22,
                        borderTop: `3.5px solid ${bracketColor}`,
                        borderRight: `3.5px solid ${bracketColor}`,
                        borderTopRightRadius: 6,
                        zIndex: 4,
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        left: 12,
                        bottom: 12,
                        width: 22,
                        height: 22,
                        borderBottom: `3.5px solid ${bracketColor}`,
                        borderLeft: `3.5px solid ${bracketColor}`,
                        borderBottomLeftRadius: 6,
                        zIndex: 4,
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: 12,
                        bottom: 12,
                        width: 22,
                        height: 22,
                        borderBottom: `3.5px solid ${bracketColor}`,
                        borderRight: `3.5px solid ${bracketColor}`,
                        borderBottomRightRadius: 6,
                        zIndex: 4,
                      }}
                    />

                    {/* Clean Porcelain QR Square Card */}
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 16,
                        backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                        border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <DeterministicQrMatrix
                        seed={9041}
                        size={186}
                        fgColor={LAUNCH_PALETTE.PRIMARY}
                        bgColor={LAUNCH_PALETTE.BACKGROUND}
                      />
                    </div>

                    {/* Sweeping Terracotta Laser Beam (10% -> 90% -> 10%) */}
                    {isLaserActive ? (
                      <div
                        style={{
                          position: 'absolute',
                          left: 12,
                          right: 12,
                          top: `${laserPct.toFixed(2)}%`,
                          height: 24,
                          transform: 'translate3d(0px, -50%, 0px)',
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          zIndex: 5,
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background:
                              'linear-gradient(180deg, rgba(201, 111, 79, 0) 0%, rgba(201, 111, 79, 0.36) 50%, rgba(201, 111, 79, 0) 100%)',
                          }}
                        />
                        <div
                          style={{
                            width: '100%',
                            height: 3.5,
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.ACCENT,
                            boxShadow: '0 0 12px rgba(201, 111, 79, 0.85)',
                          }}
                        />
                      </div>
                    ) : null}

                    {/* Crisp 6-Frame Lock Exposure Flash */}
                    {flashOpacity > 0.001 ? (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: LAUNCH_PALETTE.CARD_BG,
                          opacity: flashOpacity,
                          pointerEvents: 'none',
                          zIndex: 7,
                        }}
                      />
                    ) : null}
                  </div>

                  {/* Event Caption & Scan Progress Box */}
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: 16,
                      backgroundColor: 'rgba(248, 246, 238, 0.06)',
                      border: '1px solid rgba(217, 201, 178, 0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 9,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 900,
                          letterSpacing: '-0.02em',
                          color: LAUNCH_PALETTE.BACKGROUND,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        MAKMP 2026 • Dewan Jubli Perak
                      </span>
                      <ScanLine
                        size={17}
                        color={isQrVerified ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.ACCENT}
                        strokeWidth={2.4}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12,
                        fontWeight: 700,
                        color: LAUNCH_PALETTE.TERTIARY,
                      }}
                    >
                      <span>{isQrVerified ? 'Hadir Disahkan • 17:12 PM' : 'Mengimbas Kod Acara • 17:12 PM'}</span>
                      <span>Aiman Hakim</span>
                    </div>

                    <div
                      style={{
                        height: 7,
                        borderRadius: 999,
                        backgroundColor: 'rgba(248, 246, 238, 0.12)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: 999,
                          backgroundColor: isQrVerified
                            ? LAUNCH_PALETTE.SECONDARY
                            : LAUNCH_PALETTE.ACCENT,
                          transformOrigin: '0% 50%',
                          transform: `scaleX(${((isQrVerified ? 100 : scanPercent) / 100).toFixed(4)})`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Spring-Popping Merit Toast Banner (#6B7F5B / #F8F6EE) */}
                  <div
                    style={{
                      position: 'relative',
                      height: 62,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {!isQrVerified ? (
                      <div
                        style={{
                          width: '100%',
                          padding: '13px 16px',
                          borderRadius: 15,
                          backgroundColor: 'rgba(248, 246, 238, 0.06)',
                          border: '1px dashed rgba(217, 201, 178, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: LAUNCH_PALETTE.TERTIARY,
                        }}
                      >
                        <QrCode size={15} color={LAUNCH_PALETTE.ACCENT} />
                        <span>Arahkan kamera ke kod QR acara...</span>
                      </div>
                    ) : null}

                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 15,
                        backgroundColor: LAUNCH_PALETTE.SECONDARY,
                        border: `1.5px solid ${LAUNCH_PALETTE.BACKGROUND}`,
                        boxShadow: '0 14px 30px rgba(31, 39, 32, 0.35)',
                        padding: '0 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        opacity: toastOpacity,
                        visibility: toastOpacity <= 0.001 ? 'hidden' : 'visible',
                        transform: `translate3d(0px, ${((1 - toastSpring) * 14).toFixed(2)}px, 0px) scale(${toastScale.toFixed(4)})`,
                      }}
                    >
                      <CheckCircle2 size={20} color={LAUNCH_PALETTE.BACKGROUND} strokeWidth={2.8} />
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 13.5,
                          fontWeight: 900,
                          letterSpacing: '0.06em',
                          color: LAUNCH_PALETTE.BACKGROUND,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        +15 MATA MERIT KOKURIKULUM DISAHKAN
                      </span>
                    </div>
                  </div>
                </div>
              </KineticWindow>
            </Interactive.Div>

            {/* CONNECTOR 2 (66px): Animated EvolvingPath Arrow into Column 3 */}
            <div
              style={{
                position: 'relative',
                width: CONN_WIDTH,
                height: PIPELINE_HEIGHT,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ position: 'relative', width: 66, height: 48 }}>
                <EvolvingPath
                  d="M 6 24 L 56 24"
                  width={66}
                  height={48}
                  viewBox="0 0 66 48"
                  startFrame={conn2Start}
                  durationFrames={conn2Duration}
                  stroke={LAUNCH_PALETTE.SECONDARY}
                  trackStroke={LAUNCH_PALETTE.TERTIARY}
                  strokeWidth={3.5}
                  showHeadDot
                  headDotRadius={4.5}
                  headDotColor={LAUNCH_PALETTE.SECONDARY}
                  hideDotWhenComplete
                  style={{ display: 'block' }}
                />
                <svg
                  width={66}
                  height={48}
                  viewBox="0 0 66 48"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    overflow: 'visible',
                  }}
                >
                  <path
                    d="M 49 17 L 57 24 L 49 31"
                    fill="none"
                    stroke={conn2Done ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.TERTIARY}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {conn2Done ? (
                    <g
                      transform={`translate(${conn2PulseX.toFixed(2)}, 24)`}
                      opacity={conn2PulseOpacity}
                    >
                      <circle cx={0} cy={0} r={4.5} fill={LAUNCH_PALETTE.ACCENT} />
                    </g>
                  ) : null}
                </svg>
              </div>
            </div>

            {/* COLUMN 3 (560px): Beat 3 — Official Student Digital e-Certificate (jpp.polisas.edu.my/sijil) */}
            <Interactive.Div
              name="Official Student Digital e-Certificate"
              premountFor={safeFps}
              style={{
                width: COL3_WIDTH,
                height: PIPELINE_HEIGHT,
                flexShrink: 0,
                transformStyle: 'preserve-3d',
              }}
            >
              <ExplodedLayer
                zDepth={30}
                enterFrame={certPopStart}
                enterOffsetY={28}
                floatAmplitude={2.4}
                floatPhase={0.9}
                style={{ width: COL3_WIDTH, height: PIPELINE_HEIGHT }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: COL3_WIDTH,
                    height: PIPELINE_HEIGHT,
                    boxSizing: 'border-box',
                    borderRadius: 24,
                    backgroundColor: LAUNCH_PALETTE.PRIMARY,
                    border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    boxShadow:
                      '0 32px 72px rgba(31, 39, 32, 0.32), 0 10px 24px rgba(31, 39, 32, 0.16)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'visible',
                  }}
                >
                  {/* Inner Clipping Layer for Foil Border & Rest-Gapped Diagonal Specular Foil Sheen */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 23,
                      overflow: 'hidden',
                      pointerEvents: 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 12,
                        top: 52,
                        borderRadius: 16,
                        border: '1px solid rgba(217, 201, 178, 0.28)',
                      }}
                    />

                    {sheenOpacity > 0.004 ? (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-38%',
                          left: 0,
                          width: 170,
                          height: '176%',
                          opacity: sheenOpacity,
                          background:
                            'linear-gradient(90deg, rgba(248, 246, 238, 0) 0%, rgba(248, 246, 238, 0.22) 50%, rgba(248, 246, 238, 0) 100%)',
                          transform: `translate3d(${sheenX.toFixed(2)}px, 0px, 0px) rotate(24deg)`,
                        }}
                      />
                    ) : null}
                  </div>

                  {/* Architectural Folio Top Bar */}
                  <div
                    style={{
                      height: 40,
                      padding: '0 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                      borderBottom: '1px solid rgba(217, 201, 178, 0.16)',
                      borderTopLeftRadius: 22.5,
                      borderTopRightRadius: 22.5,
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.ACCENT,
                            display: 'inline-block',
                          }}
                        />
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.TERTIARY,
                            display: 'inline-block',
                          }}
                        />
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.SECONDARY,
                            display: 'inline-block',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 999,
                          backgroundColor: 'rgba(248, 246, 238, 0.08)',
                          border: '1px solid rgba(217, 201, 178, 0.22)',
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          color: LAUNCH_PALETTE.TERTIARY,
                        }}
                      >
                        jpp.polisas.edu.my/sijil
                      </span>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 10px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(107, 127, 91, 0.28)',
                        border: `1px solid ${LAUNCH_PALETTE.SECONDARY}`,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.09em',
                        color: LAUNCH_PALETTE.BACKGROUND,
                      }}
                    >
                      <Sparkles size={11} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.6} />
                      <span>E-SIJIL SAH ✓</span>
                    </span>
                  </div>

                  {/* Certificate Body */}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      flex: 1,
                      padding: '28px 32px 26px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Header Stamp + Medallion Crest with Restrained Watch-Glint GeometricSparkBurst */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.16em',
                          color: LAUNCH_PALETTE.TERTIARY,
                        }}
                      >
                        <ShieldCheck size={15} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
                        <span>SIJIL DIGITAL RASMI • POLISAS</span>
                      </div>

                      <div
                        style={{
                          position: 'relative',
                          width: MEDALLION_SIZE,
                          height: MEDALLION_SIZE,
                          overflow: 'visible',
                        }}
                      >
                        <div
                          style={{
                            width: MEDALLION_SIZE,
                            height: MEDALLION_SIZE,
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                            border: `2.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                            boxShadow: 'inset 0 0 0 5px rgba(201, 111, 79, 0.28)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3,
                          }}
                        >
                          <Award size={32} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.1} />
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 9.5,
                              fontWeight: 900,
                              letterSpacing: '0.15em',
                              color: LAUNCH_PALETTE.TERTIARY,
                            }}
                          >
                            E-SIJIL
                          </span>
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: '0.14em',
                              color: LAUNCH_PALETTE.SECONDARY,
                            }}
                          >
                            2026
                          </span>
                        </div>

                        {/* Restrained Architectural Luxury-Watch-Glint Spark Burst */}
                        <GeometricSparkBurst
                          triggerFrame={sparkTrigger}
                          x={MEDALLION_SIZE / 2}
                          y={MEDALLION_SIZE / 2}
                          durationFrames={sparkDuration}
                          radius={76}
                          count={8}
                          seed="clubs-ems-medallion-glint"
                          colors={[
                            LAUNCH_PALETTE.ACCENT,
                            LAUNCH_PALETTE.TERTIARY,
                            LAUNCH_PALETTE.SECONDARY,
                          ]}
                          style={{ zIndex: 12 }}
                        />
                      </div>
                    </div>

                    {/* Instrument Serif Italic Certificate Title + Event Caption */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div
                        style={{
                          fontFamily: LAUNCH_FONTS.SERIF_ITALIC,
                          fontStyle: 'italic',
                          fontSize: 36,
                          fontWeight: 400,
                          lineHeight: 1.12,
                          color: LAUNCH_PALETTE.BACKGROUND,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Anugerah Penyertaan Aktif
                      </div>
                      <div
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          color: LAUNCH_PALETTE.TERTIARY,
                        }}
                      >
                        MAKMP 2026 • DEWAN JUBLI PERAK
                      </div>
                    </div>

                    {/* Student Recipient Plate */}
                    <div
                      style={{
                        width: '100%',
                        padding: '14px 18px',
                        borderRadius: 16,
                        backgroundColor: 'rgba(248, 246, 238, 0.06)',
                        border: '1px solid rgba(217, 201, 178, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.15em',
                          color: LAUNCH_PALETTE.TERTIARY,
                        }}
                      >
                        DIANUGERAHKAN KEPADA
                      </span>
                      <span
                        style={{
                          fontSize: 21,
                          fontWeight: 900,
                          letterSpacing: '0.02em',
                          color: LAUNCH_PALETTE.BACKGROUND,
                        }}
                      >
                        AIMAN HAKIM BIN AZMAN
                      </span>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 12,
                          fontWeight: 700,
                          color: LAUNCH_PALETTE.SECONDARY,
                        }}
                      >
                        Pelajar Semester 1 • JTMK
                      </span>
                    </div>

                    {/* Serial Chip + +15 MERIT Pill */}
                    <div
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 14,
                        backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                        border: '1.5px solid rgba(217, 201, 178, 0.35)',
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                        <QrCode size={16} color={LAUNCH_PALETTE.ACCENT} />
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 13.5,
                            fontWeight: 900,
                            letterSpacing: '0.07em',
                            color: LAUNCH_PALETTE.BACKGROUND,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {safeCertSerial}
                        </span>
                      </div>

                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          backgroundColor: LAUNCH_PALETTE.SECONDARY,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 900,
                          letterSpacing: '0.08em',
                          color: LAUNCH_PALETTE.BACKGROUND,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        +15 MERIT
                      </span>
                    </div>

                    {/* Official PDF Download Action Button Pill */}
                    <div
                      style={{
                        width: '100%',
                        padding: '13px 20px',
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.ACCENT,
                        border: '1.5px solid rgba(248, 246, 238, 0.35)',
                        boxShadow: '0 14px 28px rgba(201, 111, 79, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        transform: `scale(${(0.94 + 0.06 * downloadBtnSpring).toFixed(3)})`,
                      }}
                    >
                      <Download size={17} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={2.6} />
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 13.5,
                          fontWeight: 900,
                          letterSpacing: '0.06em',
                          color: LAUNCH_PALETTE.CARD_BG,
                        }}
                      >
                        Muat Turun PDF Rasmi ✓
                      </span>
                    </div>
                  </div>
                </div>
              </ExplodedLayer>
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
