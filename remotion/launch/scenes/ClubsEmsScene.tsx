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
  BrainCircuit,
  Check,
  CheckCircle2,
  FileText,
  QrCode,
  ScanLine,
  SearchCheck,
  ShieldCheck,
  Sparkles,
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
  LiveTypewriterText,
} from '../ui/KineticCard';

export type ClubsEmsProps = {
  readonly clubsCount: number;
  readonly activitiesCount: number;
  readonly certSerial: string;
};

type AuditCriterionSpec = {
  readonly label: string;
  readonly statusText: string;
  readonly pendingText: string;
  readonly targetScore: number;
  readonly color: string;
  readonly startSec: number;
  readonly endSec: number;
};

const AUDIT_CRITERIA: readonly AuditCriterionSpec[] = [
  {
    label: 'Pematuhan Format HEP',
    statusText: 'Patuh Piawaian ✓',
    pendingText: 'Menyemak Format...',
    targetScore: 98,
    color: LAUNCH_PALETTE.SECONDARY,
    startSec: 0.65,
    endSec: 1.38,
  },
  {
    label: 'Sintaks & Keseimbangan Belanjawan',
    statusText: 'Disahkan Tepat ✓',
    pendingText: 'Mengaudit Bajet...',
    targetScore: 100,
    color: LAUNCH_PALETTE.SECONDARY,
    startSec: 1.32,
    endSec: 2.08,
  },
  {
    label: 'Objektif & KPI Mahasiswa',
    statusText: 'Selaras Takwim ✓',
    pendingText: 'Menilai KPI...',
    targetScore: 94,
    color: LAUNCH_PALETTE.ACCENT,
    startSec: 2.04,
    endSec: 2.75,
  },
];

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const COUNTER_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const AUDIT_BAR_EASE = Easing.bezier(0.25, 1, 0.5, 1);
const LASER_EASE = Easing.bezier(0.45, 0, 0.55, 1);
const SHEEN_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

// Horizontal 3-Stage Dark-Accent Automation Pipeline geometry inside 1920x1080 safe bounds
const PIPELINE_LEFT = 84;
const PIPELINE_TOP = 238;
const PIPELINE_HEIGHT = 750;
const STAGE1_WIDTH = 820;
const STAGE2_WIDTH = 112;
const STAGE3_WIDTH = 820;
const STAGE3_UPPER_HEIGHT = 364;
const STAGE3_LOWER_TOP = 390;
const STAGE3_LOWER_HEIGHT = 360;

// Restrained medallion center inside Lower Elevated Card (820x360, paddingRight: 32, 108px circle)
const MEDALLION_SIZE = 108;
const MEDALLION_CENTER_X = STAGE3_WIDTH - 32 - MEDALLION_SIZE / 2; // 734
const MEDALLION_CENTER_Y = STAGE3_LOWER_HEIGHT / 2; // 180

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

  // Beat 1 (0..1.5s): Top Header + Live Rolling Tabular Counters + Stage 1 Nexus AI Copilot Entry
  const pillStart = 0;
  const pillDuration = Math.max(8, Math.round(0.36 * safeFps));
  const headlineStart = Math.round(0.1 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.06 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.35 * safeFps));

  const counterStart = Math.round(0.14 * safeFps);
  const clubsCounterEnd = Math.max(counterStart + 8, Math.round(1.38 * safeFps));
  const activitiesCounterEnd = Math.max(counterStart + 10, Math.round(1.56 * safeFps));

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
    [counterStart, counterStart + Math.max(6, Math.round(0.32 * safeFps))],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  const stage1Enter = interpolate(
    frame,
    [Math.round(0.18 * safeFps), Math.round(0.84 * safeFps)],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );
  const stage1Opacity = interpolate(stage1Enter, [0, 0.25, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const stage1TranslateX = interpolate(stage1Enter, [0, 1], [-46, 0]);
  const stage1FloatY = Math.sin(timeSec * 1.35) * 2.4 * stage1Enter;

  // Stage 1: Nexus AI Horizontal Laser Scan Bar gliding down across the 3 audit rows (0.6..2.8s)
  const nexusLaserStart = Math.round(0.6 * safeFps); // 36f
  const nexusLaserEnd = Math.round(2.78 * safeFps); // 167f
  const nexusLaserProgress = interpolate(
    frame,
    [nexusLaserStart, nexusLaserEnd],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.35, 0.05, 0.65, 0.95),
    },
  );
  const nexusLaserFade = interpolate(
    frame,
    [nexusLaserStart, nexusLaserStart + 8, nexusLaserEnd - 8, nexusLaserEnd + 4],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const isNexusScanning = frame >= nexusLaserStart && frame <= nexusLaserEnd + 4;
  const nexusLaserTopPx = 12 + nexusLaserProgress * 314;

  const isAuditComplete = frame >= nexusLaserEnd;
  const auditOverallScore = Math.round(
    interpolate(frame, [nexusLaserStart, nexusLaserEnd], [0, 98], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.35, 0.05, 0.65, 0.95),
    }),
  );

  const approvalBadgeSpring =
    frame >= nexusLaserEnd
      ? spring({
          frame: frame - nexusLaserEnd,
          fps: safeFps,
          config: { damping: 14, stiffness: 240, mass: 0.8 },
        })
      : 0;

  const typewriterStart = Math.round(2.48 * safeFps); // 149f -> completes ~238f

  // Stage 2: Center Data Conduit EvolvingPath (draws left->right ~2.22..2.65s)
  const conduitStart = Math.round(2.22 * safeFps); // 133f -> mid-draw at f145!
  const conduitDuration = Math.max(12, Math.round(0.45 * safeFps)); // 27f -> ends 160f
  const conduitEnd = conduitStart + conduitDuration;
  const conduitDone = frame >= conduitEnd;

  // Continuous subtle pulse chevron dot travelling along conduit once drawn
  const pulseCycle = Math.max(36, Math.round(1.1 * safeFps));
  const pulsePhase = conduitDone ? ((frame - conduitEnd) % pulseCycle) / pulseCycle : 0;
  const pulseChevronX = interpolate(pulsePhase, [0, 1], [10, 96]);
  const pulseChevronOpacity = conduitDone
    ? interpolate(pulsePhase, [0, 0.18, 0.82, 1], [0.2, 1, 1, 0.15], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  // Stage 3 Upper Card (Beat 2, 2.2..4.2s): Live EMS Check-In QR Pass
  const qrEnterStart = Math.round(2.2 * safeFps); // 132f
  const qrEnterEnd = Math.max(qrEnterStart + 10, Math.round(2.74 * safeFps)); // 164f
  const qrEnterProgress = interpolate(frame, [qrEnterStart, qrEnterEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const qrCardOpacity = interpolate(qrEnterProgress, [0, 0.25, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const qrCardTranslateX = interpolate(qrEnterProgress, [0, 1], [42, 0]);
  const qrCardScale = interpolate(qrEnterProgress, [0, 1], [0.95, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    output: 'perceptual-scale',
  });
  const qrCardFloatY = Math.cos(timeSec * 1.55 + 0.6) * 2.2 * qrEnterProgress;

  // Sweeping terracotta vertical laser scan (10% -> 90% -> 10%)
  const laserDownStart = Math.round(2.58 * safeFps); // 155f
  const laserMid = Math.max(laserDownStart + 4, Math.round(3.16 * safeFps)); // 190f
  const laserUpEnd = Math.max(laserMid + 4, Math.round(3.68 * safeFps)); // 221f
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

  // Crisp 6-frame exposure flash (snapping strictly to 0 after)
  const flashStart = Math.max(laserUpEnd + 1, Math.round(3.7 * safeFps)); // 222f
  const flashFrames = Math.max(3, Math.round((6 / 60) * safeFps)); // 6f
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

  // Stage 3 Lower Elevated Card (Beat 3, 3.7..6.5s): ExplodedLayer zDepth=30 e-Certificate + Restrained Sparks
  const certPopStart = Math.round(3.72 * safeFps); // 223f
  const sheenStart = Math.round(4.18 * safeFps); // 251f
  const sheenPeriod = Math.max(36, Math.round(1.35 * safeFps));
  const sheenElapsed = frame - sheenStart;
  const sheenPhase = sheenElapsed >= 0 ? (sheenElapsed % sheenPeriod) / sheenPeriod : 0;
  const sheenProgress = interpolate(sheenPhase, [0, 0.78], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SHEEN_EASE,
  });
  const sheenOpacity =
    sheenElapsed >= 0
      ? interpolate(sheenPhase, [0, 0.14, 0.62, 0.78], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;
  const sheenX = interpolate(sheenProgress, [0, 1], [-240, 980]);

  // Restrained architectural luxury-watch-glint spark burst hugging the certificate medallion
  const sparkTrigger = Math.round(4.83 * safeFps); // 290f -> peak crisp glint right at f300!
  const sparkDuration = Math.max(24, Math.round(1.05 * safeFps)); // 63f

  // Subtle exit lead on pipeline columns
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
  const qrCardBorderColor = inFlashWindow
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
      : LAUNCH_PALETTE.PRIMARY;

  return (
    <>
      <EditorialBackdrop />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.035}
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
          {/* Top Editorial Header Row (y ~ 84..210) */}
          <Interactive.Div
            name="Clubs EMS Header"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: PIPELINE_LEFT,
              right: PIPELINE_LEFT,
              top: 84,
              height: 124,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 28,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, maxWidth: 1300 }}>
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
                  <BrainCircuit size={15} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
                  <span>NEXUS AI COPILOT • KELAB &amp; EMS</span>
                </div>
              </KineticReveal>

              <h2
                style={{
                  margin: 0,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'baseline',
                  columnGap: '0.24em',
                  rowGap: '0.06em',
                  fontSize: 50,
                  fontWeight: 900,
                  lineHeight: 1.06,
                  letterSpacing: '-0.03em',
                  color: LAUNCH_PALETTE.PRIMARY,
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
                  text="Kelab."
                  startFrame={headlineStart}
                  staggerFrames={wordStagger}
                  wordDurationFrames={wordDuration}
                  style={{
                    fontSize: 50,
                    fontWeight: 900,
                    lineHeight: 1.06,
                    letterSpacing: '-0.03em',
                    color: LAUNCH_PALETTE.PRIMARY,
                  }}
                />
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    color: LAUNCH_PALETTE.SECONDARY,
                    fontVariantNumeric: 'tabular-nums',
                    display: 'inline-block',
                    minWidth: `${Math.max(2, String(safeActivities).length)}ch`,
                    textAlign: 'right',
                  }}
                >
                  {liveActivities}
                </span>
                <KineticWords
                  as="span"
                  text="Program Diautomasikan."
                  startFrame={headlineStart + wordStagger}
                  staggerFrames={wordStagger}
                  wordDurationFrames={wordDuration}
                  accentWords={['Diautomasikan.']}
                  accentColor={LAUNCH_PALETTE.ACCENT}
                  style={{
                    fontSize: 50,
                    fontWeight: 900,
                    lineHeight: 1.06,
                    letterSpacing: '-0.03em',
                    color: LAUNCH_PALETTE.PRIMARY,
                  }}
                />
              </h2>
            </div>

            {/* Compact Live Tabular Counters */}
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
                  padding: '11px 18px',
                  borderRadius: 16,
                  backgroundColor: LAUNCH_PALETTE.CARD_BG,
                  border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                  boxShadow: '0 12px 28px rgba(46, 58, 47, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  minWidth: 146,
                }}
              >
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 30,
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
                  padding: '11px 18px',
                  borderRadius: 16,
                  backgroundColor: LAUNCH_PALETTE.PRIMARY,
                  border: '1.5px solid rgba(217, 201, 178, 0.28)',
                  boxShadow: '0 14px 30px rgba(31, 39, 32, 0.16)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  minWidth: 156,
                }}
              >
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 30,
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
                  PROGRAM EMS
                </span>
              </div>
            </div>
          </Interactive.Div>

          {/* Horizontal 3-Stage Pipeline Canvas */}
          <div
            style={{
              position: 'absolute',
              left: PIPELINE_LEFT,
              top: PIPELINE_TOP,
              width: STAGE1_WIDTH + STAGE2_WIDTH + STAGE3_WIDTH,
              height: PIPELINE_HEIGHT,
              display: 'flex',
              alignItems: 'stretch',
              transformStyle: 'preserve-3d',
              transform: `scale(${pipelineExitScale.toFixed(4)})`,
            }}
          >
            {/* STAGE 1 — Left Column (820px): Live Nexus AI Copilot v2.9 Document Audit Card */}
            <Interactive.Div
              name="Nexus AI Copilot Audit Deck"
              premountFor={safeFps}
              style={{
                width: STAGE1_WIDTH,
                height: PIPELINE_HEIGHT,
                flexShrink: 0,
                opacity: stage1Opacity,
                transform: `translate3d(${stage1TranslateX.toFixed(2)}px, ${stage1FloatY.toFixed(2)}px, 0px)`,
              }}
            >
              <KineticWindow
                surface="dark"
                routeLabel="nexus.copilot · v2.9"
                statusPill="LIVE SCAN"
                statusAccent={!isAuditComplete}
                width={STAGE1_WIDTH}
                height={PIPELINE_HEIGHT}
                borderRadius={26}
                sheenStartFrame={Math.round(2.75 * safeFps)}
                sheenDuration={44}
                style={{
                  borderColor: isAuditComplete
                    ? 'rgba(107, 127, 91, 0.55)'
                    : 'rgba(217, 201, 178, 0.26)',
                  boxShadow:
                    '0 28px 64px rgba(31, 39, 32, 0.25), 0 8px 20px rgba(31, 39, 32, 0.14)',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: '22px 28px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Copilot Sub-header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 14,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          backgroundColor: 'rgba(201, 111, 79, 0.16)',
                          border: '1px solid rgba(201, 111, 79, 0.42)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <SearchCheck size={19} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 800,
                            letterSpacing: '0.14em',
                            color: LAUNCH_PALETTE.TERTIARY,
                          }}
                        >
                          AUDIT KERTAS KERJA AUTOMATIK
                        </span>
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 900,
                            color: LAUNCH_PALETTE.BACKGROUND,
                          }}
                        >
                          Nexus AI Copilot v2.9
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 13px',
                        borderRadius: 999,
                        backgroundColor: isAuditComplete
                          ? 'rgba(107, 127, 91, 0.25)'
                          : 'rgba(201, 111, 79, 0.2)',
                        border: `1px solid ${
                          isAuditComplete ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.ACCENT
                        }`,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: LAUNCH_PALETTE.BACKGROUND,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          backgroundColor: isAuditComplete
                            ? LAUNCH_PALETTE.SECONDARY
                            : LAUNCH_PALETTE.ACCENT,
                          transform: `scale(${liveDotScale.toFixed(3)})`,
                          display: 'inline-block',
                        }}
                      />
                      <span>
                        {isAuditComplete ? 'AUDIT SELESAI' : `IMBASAN ${auditOverallScore}%`}
                      </span>
                    </div>
                  </div>

                  {/* Document Header Box */}
                  <div
                    style={{
                      padding: '15px 18px',
                      borderRadius: 18,
                      backgroundColor: 'rgba(248, 246, 238, 0.06)',
                      border: '1px solid rgba(217, 201, 178, 0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 7,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 800,
                          letterSpacing: '0.1em',
                          color: LAUNCH_PALETTE.ACCENT,
                        }}
                      >
                        <FileText size={14} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
                        <span>KERTAS_KERJA_2026_FINAL.PDF</span>
                      </span>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: LAUNCH_PALETTE.TERTIARY,
                        }}
                      >
                        PDF/A • 2.4 MB
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: LAUNCH_PALETTE.BACKGROUND,
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                      }}
                    >
                      Karnival Keusahawanan &amp; Kokurikulum POLISAS 2026
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: LAUNCH_PALETTE.TERTIARY,
                      }}
                    >
                      <span>Anjuran: Kelab Keusahawanan</span>
                      <span style={{ color: LAUNCH_PALETTE.ACCENT }}>•</span>
                      <span>Bajet: RM 4,500</span>
                    </div>
                  </div>

                  {/* 3 Live Audit Criterion Rows + Animated Terracotta Horizontal Laser Scan Bar */}
                  <div
                    style={{
                      position: 'relative',
                      height: 338,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 12,
                      overflow: 'hidden',
                      borderRadius: 16,
                    }}
                  >
                    {AUDIT_CRITERIA.map((row) => {
                      const rStart = Math.round(row.startSec * safeFps);
                      const rEnd = Math.max(rStart + 6, Math.round(row.endSec * safeFps));
                      const progress = interpolate(frame, [rStart, rEnd], [0, 1], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                        easing: AUDIT_BAR_EASE,
                      });
                      const currentPct = Math.round(progress * row.targetScore);
                      const rowComplete = frame >= rEnd;
                      const rowScanning = frame >= rStart && frame < rEnd;

                      return (
                        <div
                          key={row.label}
                          style={{
                            position: 'relative',
                            zIndex: 1,
                            flex: 1,
                            padding: '14px 18px',
                            borderRadius: 16,
                            backgroundColor: rowScanning
                              ? 'rgba(201, 111, 79, 0.1)'
                              : 'rgba(248, 246, 238, 0.05)',
                            border: `1.5px solid ${
                              rowScanning
                                ? 'rgba(201, 111, 79, 0.55)'
                                : rowComplete
                                  ? 'rgba(107, 127, 91, 0.48)'
                                  : 'rgba(217, 201, 178, 0.15)'
                            }`,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <CheckCircle2
                                size={18}
                                color={rowComplete ? row.color : LAUNCH_PALETTE.TERTIARY}
                                strokeWidth={2.5}
                              />
                              <span
                                style={{
                                  fontSize: 16.5,
                                  fontWeight: 800,
                                  color: LAUNCH_PALETTE.BACKGROUND,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {row.label}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                              <span
                                style={{
                                  padding: '4px 11px',
                                  borderRadius: 999,
                                  backgroundColor: rowComplete
                                    ? row.color === LAUNCH_PALETTE.ACCENT
                                      ? 'rgba(201, 111, 79, 0.28)'
                                      : 'rgba(107, 127, 91, 0.34)'
                                    : 'rgba(248, 246, 238, 0.06)',
                                  border: `1px solid ${
                                    rowComplete ? row.color : 'rgba(217, 201, 178, 0.24)'
                                  }`,
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  letterSpacing: '0.06em',
                                  color: rowComplete
                                    ? LAUNCH_PALETTE.BACKGROUND
                                    : LAUNCH_PALETTE.TERTIARY,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {rowComplete ? row.statusText : row.pendingText}
                              </span>

                              <span
                                style={{
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 19,
                                  fontWeight: 900,
                                  fontVariantNumeric: 'tabular-nums',
                                  color: rowComplete
                                    ? LAUNCH_PALETTE.BACKGROUND
                                    : LAUNCH_PALETTE.TERTIARY,
                                  minWidth: '4ch',
                                  textAlign: 'right',
                                }}
                              >
                                {currentPct}%
                              </span>
                            </div>
                          </div>

                          {/* Smooth GPU-scaled Progress Bar */}
                          <div
                            style={{
                              height: 9,
                              borderRadius: 999,
                              backgroundColor: 'rgba(248, 246, 238, 0.1)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: 999,
                                backgroundColor: row.color,
                                transformOrigin: '0% 50%',
                                transform: `scaleX(${((progress * row.targetScore) / 100).toFixed(4)})`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Live Animated Terracotta Horizontal Laser Scan Bar */}
                    {isNexusScanning && nexusLaserFade > 0.01 ? (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: nexusLaserTopPx - 14,
                          height: 28,
                          opacity: nexusLaserFade,
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
                              'linear-gradient(180deg, rgba(201, 111, 79, 0) 0%, rgba(201, 111, 79, 0.34) 50%, rgba(201, 111, 79, 0) 100%)',
                          }}
                        />
                        <div
                          style={{
                            width: '100%',
                            height: 3,
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.ACCENT,
                            boxShadow: '0 0 14px rgba(201, 111, 79, 0.9)',
                          }}
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Bottom Approval Strip */}
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: 18,
                      backgroundColor: 'rgba(107, 127, 91, 0.16)',
                      border: `1.5px solid ${
                        isAuditComplete ? LAUNCH_PALETTE.SECONDARY : 'rgba(217, 201, 178, 0.22)'
                      }`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <Sparkles size={15} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 800,
                            letterSpacing: '0.14em',
                            color: LAUNCH_PALETTE.TERTIARY,
                          }}
                        >
                          KEPUTUSAN CADANGAN AI
                        </span>
                      </div>

                      <div
                        style={{
                          padding: '5px 13px',
                          borderRadius: 999,
                          backgroundColor: isAuditComplete
                            ? LAUNCH_PALETTE.SECONDARY
                            : 'rgba(248, 246, 238, 0.08)',
                          border: `1px solid ${
                            isAuditComplete ? LAUNCH_PALETTE.TERTIARY : 'rgba(217, 201, 178, 0.22)'
                          }`,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 900,
                          letterSpacing: '0.1em',
                          color: LAUNCH_PALETTE.BACKGROUND,
                          whiteSpace: 'nowrap',
                          transform: `scale(${(isAuditComplete ? 0.88 + 0.12 * approvalBadgeSpring : 0.96).toFixed(3)})`,
                        }}
                      >
                        {isAuditComplete ? '98% LULUS AUTOMATIK ✓' : `${auditOverallScore}% MENGAUDIT`}
                      </div>
                    </div>

                    <div
                      style={{
                        minHeight: 22,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <LiveTypewriterText
                        text="Cadangan disahkan — sedia dijana ke sistem EMS."
                        startFrame={typewriterStart}
                        charsPerSecond={32}
                        cursorColor={LAUNCH_PALETTE.ACCENT}
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: LAUNCH_PALETTE.BACKGROUND,
                          letterSpacing: '0.01em',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </KineticWindow>
            </Interactive.Div>

            {/* STAGE 2 — Center Data Conduit (112px wide): Horizontal EvolvingPath M 8 24 L 98 24 */}
            <div
              style={{
                position: 'relative',
                width: STAGE2_WIDTH,
                height: PIPELINE_HEIGHT,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 3,
                  top: 158,
                  width: 106,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: 999,
                    backgroundColor: conduitDone
                      ? 'rgba(107, 127, 91, 0.18)'
                      : 'rgba(217, 201, 178, 0.45)',
                    border: `1px solid ${
                      conduitDone ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.TERTIARY
                    }`,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 9.5,
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    color: LAUNCH_PALETTE.PRIMARY,
                    whiteSpace: 'nowrap',
                  }}
                >
                  SYNC EMS
                </span>

                <div style={{ position: 'relative', width: 106, height: 48 }}>
                  <EvolvingPath
                    d="M 8 24 L 98 24"
                    width={106}
                    height={48}
                    viewBox="0 0 106 48"
                    startFrame={conduitStart}
                    durationFrames={conduitDuration}
                    stroke={LAUNCH_PALETTE.ACCENT}
                    trackStroke={LAUNCH_PALETTE.TERTIARY}
                    strokeWidth={3.5}
                    showHeadDot
                    headDotRadius={5}
                    headDotColor={LAUNCH_PALETTE.ACCENT}
                    hideDotWhenComplete
                    style={{ display: 'block' }}
                  />

                  {/* Crisp SVG Arrowhead + Animated Pulse Chevron Dot */}
                  <svg
                    width={106}
                    height={48}
                    viewBox="0 0 106 48"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      overflow: 'visible',
                    }}
                  >
                    <path
                      d="M 91 17 L 99 24 L 91 31"
                      fill="none"
                      stroke={conduitDone ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.TERTIARY}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {conduitDone ? (
                      <g
                        transform={`translate(${pulseChevronX.toFixed(2)}, 24)`}
                        opacity={pulseChevronOpacity}
                      >
                        <circle cx={0} cy={0} r={5.5} fill={LAUNCH_PALETTE.SECONDARY} />
                        <path
                          d="M -2 -3 L 2.5 0 L -2 3"
                          fill="none"
                          stroke={LAUNCH_PALETTE.CARD_BG}
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    ) : null}
                  </svg>
                </div>
              </div>
            </div>

            {/* STAGE 3 — Right Column (820px): Live EMS Check-In QR Pass + Elevated Official e-Certificate Stack */}
            <div
              style={{
                position: 'relative',
                width: STAGE3_WIDTH,
                height: PIPELINE_HEIGHT,
                flexShrink: 0,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Upper Card (Beat 2, 2.2..4.2s): Live EMS Check-In QR Pass */}
              <Interactive.Div
                name="EMS Check-In QR Pass"
                premountFor={safeFps}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: STAGE3_WIDTH,
                  height: STAGE3_UPPER_HEIGHT,
                  opacity: qrCardOpacity,
                  visibility: qrCardOpacity <= 0.001 ? 'hidden' : 'visible',
                  transformOrigin: '50% 50%',
                  transform: `translate3d(${qrCardTranslateX.toFixed(2)}px, ${qrCardFloatY.toFixed(2)}px, 0px) scale(${qrCardScale.toFixed(4)})`,
                }}
              >
                <KineticWindow
                  surface="light"
                  routeLabel="ems · imbasan kehadiran"
                  statusPill="EMS CHECK-IN"
                  statusAccent={!isQrVerified}
                  width={STAGE3_WIDTH}
                  height={STAGE3_UPPER_HEIGHT}
                  borderRadius={24}
                  sheenStartFrame={flashStart + 3}
                  sheenDuration={38}
                  style={{
                    border: `2px solid ${qrCardBorderColor}`,
                    boxShadow: inFlashWindow
                      ? '0 24px 64px rgba(201, 111, 79, 0.34), 0 0 0 6px rgba(201, 111, 79, 0.22)'
                      : '0 24px 56px rgba(31, 39, 32, 0.14)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      flex: 1,
                      padding: '22px 28px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 28,
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Left: DeterministicQrMatrix + Corner Viewfinder Brackets + Sweeping Laser + 6-Frame Flash */}
                    <div
                      style={{
                        position: 'relative',
                        width: 196,
                        height: 196,
                        flexShrink: 0,
                        borderRadius: 18,
                        backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                        border: `1.5px solid ${qrCardBorderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <span style={{ position: 'absolute', left: 9, top: 9, width: 16, height: 16, borderTop: `3px solid ${bracketColor}`, borderLeft: `3px solid ${bracketColor}`, borderTopLeftRadius: 5 }} />
                      <span style={{ position: 'absolute', right: 9, top: 9, width: 16, height: 16, borderTop: `3px solid ${bracketColor}`, borderRight: `3px solid ${bracketColor}`, borderTopRightRadius: 5 }} />
                      <span style={{ position: 'absolute', left: 9, bottom: 9, width: 16, height: 16, borderBottom: `3px solid ${bracketColor}`, borderLeft: `3px solid ${bracketColor}`, borderBottomLeftRadius: 5 }} />
                      <span style={{ position: 'absolute', right: 9, bottom: 9, width: 16, height: 16, borderBottom: `3px solid ${bracketColor}`, borderRight: `3px solid ${bracketColor}`, borderBottomRightRadius: 5 }} />

                      <DeterministicQrMatrix
                        seed={9041}
                        size={136}
                        fgColor={LAUNCH_PALETTE.PRIMARY_DARK}
                        bgColor={LAUNCH_PALETTE.BACKGROUND}
                      />

                      {/* Sweeping Terracotta Laser Scan (10% -> 90% -> 10%) */}
                      {isLaserActive ? (
                        <div
                          style={{
                            position: 'absolute',
                            left: 8,
                            right: 8,
                            top: `${laserPct.toFixed(2)}%`,
                            height: 22,
                            transform: 'translate3d(0px, -50%, 0px)',
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            zIndex: 4,
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

                      {/* Crisp 6-Frame Exposure Flash */}
                      {flashOpacity > 0.001 ? (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: LAUNCH_PALETTE.CARD_BG,
                            opacity: flashOpacity,
                            pointerEvents: 'none',
                            zIndex: 6,
                          }}
                        />
                      ) : null}
                    </div>

                    {/* Right: Live Verification Telemetry */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 13,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 13px',
                            borderRadius: 999,
                            backgroundColor: isQrVerified
                              ? 'rgba(107, 127, 91, 0.16)'
                              : 'rgba(201, 111, 79, 0.14)',
                            border: `1px solid ${
                              isQrVerified ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.ACCENT
                            }`,
                            color: isQrVerified ? LAUNCH_PALETTE.PRIMARY : LAUNCH_PALETTE.ACCENT,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11.5,
                            fontWeight: 800,
                            letterSpacing: '0.12em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isQrVerified ? (
                            <Check size={13} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={3} />
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
                          <span>
                            {isQrVerified ? 'KEHADIRAN DISAHKAN' : 'IMBASAN QR LANGSUNG'}
                          </span>
                        </div>

                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 13,
                            fontWeight: 900,
                            color: isQrVerified
                              ? LAUNCH_PALETTE.SECONDARY
                              : LAUNCH_PALETTE.MUTED_OLIVE,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {isQrVerified ? 100 : scanPercent}%
                        </span>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 900,
                            letterSpacing: '-0.025em',
                            color: LAUNCH_PALETTE.PRIMARY,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          MAKMP 2026 • Dewan Jubli Perak
                        </div>
                        <div
                          style={{
                            marginTop: 5,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: LAUNCH_PALETTE.MUTED_OLIVE,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          04DAT24F1022 • AMIRUL HAKIM
                        </div>
                      </div>

                      {/* Live Verification Bar */}
                      <div
                        style={{
                          height: 9,
                          borderRadius: 999,
                          backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
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

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 800,
                          letterSpacing: '0.1em',
                          color: isQrVerified
                            ? LAUNCH_PALETTE.SECONDARY
                            : LAUNCH_PALETTE.MUTED_OLIVE,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                          <ScanLine
                            size={14}
                            color={isQrVerified ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.ACCENT}
                          />
                          {isQrVerified
                            ? '+15 MERIT KOKURIKULUM DIREKOD'
                            : 'PENGESAHAN PENYERTAAN...'}
                        </span>
                        <span>SESI RASMI</span>
                      </div>
                    </div>

                    {/* Card-wide subtle exposure flash */}
                    {flashOpacity > 0.001 ? (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                          opacity: flashOpacity * 0.4,
                          pointerEvents: 'none',
                          zIndex: 8,
                        }}
                      />
                    ) : null}
                  </div>
                </KineticWindow>
              </Interactive.Div>

              {/* Lower Elevated Card (Beat 3, 3.7..6.5s): ExplodedLayer zDepth=30 Official Digital Merit e-Certificate */}
              <Interactive.Div
                name="Official Digital Merit e-Certificate"
                premountFor={safeFps}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: STAGE3_LOWER_TOP,
                  width: STAGE3_WIDTH,
                  height: STAGE3_LOWER_HEIGHT,
                  zIndex: 14,
                  transformStyle: 'preserve-3d',
                }}
              >
                <ExplodedLayer
                  zDepth={30}
                  enterFrame={certPopStart}
                  enterOffsetY={32}
                  floatAmplitude={2.4}
                  floatPhase={0.9}
                  style={{ width: STAGE3_WIDTH, height: STAGE3_LOWER_HEIGHT }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: STAGE3_WIDTH,
                      height: STAGE3_LOWER_HEIGHT,
                      boxSizing: 'border-box',
                      borderRadius: 26,
                      backgroundColor: LAUNCH_PALETTE.PRIMARY,
                      border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
                      boxShadow:
                        '0 32px 70px rgba(31, 39, 32, 0.3), 0 10px 24px rgba(31, 39, 32, 0.16)',
                      padding: '26px 32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 24,
                      overflow: 'visible',
                    }}
                  >
                    {/* Inner Clipping Container for Foil Frame & Diagonal Sheen Sweep */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 24,
                        overflow: 'hidden',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 10,
                          borderRadius: 17,
                          border: '1px solid rgba(217, 201, 178, 0.28)',
                        }}
                      />

                      {sheenOpacity > 0.004 ? (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-38%',
                            left: 0,
                            width: 175,
                            height: '176%',
                            opacity: sheenOpacity,
                            background:
                              'linear-gradient(90deg, rgba(248, 246, 238, 0) 0%, rgba(248, 246, 238, 0.24) 50%, rgba(248, 246, 238, 0) 100%)',
                            transform: `translate3d(${sheenX.toFixed(2)}px, 0px, 0px) rotate(24deg)`,
                          }}
                        />
                      ) : null}
                    </div>

                    {/* Left Certificate Metadata */}
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 2,
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
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
                        <span>SIJIL DIGITAL RASMI • JPP POLISAS</span>
                      </div>

                      <div
                        style={{
                          fontFamily: LAUNCH_FONTS.SERIF_ITALIC,
                          fontStyle: 'italic',
                          fontSize: 31,
                          fontWeight: 400,
                          lineHeight: 1.14,
                          color: LAUNCH_PALETTE.BACKGROUND,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Anugerah Kecemerlangan Mahasiswa
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            color: LAUNCH_PALETTE.TERTIARY,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          AMIRUL HAKIM BIN AZMAN
                        </span>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 999,
                            backgroundColor: 'rgba(107, 127, 91, 0.28)',
                            border: `1px solid ${LAUNCH_PALETTE.SECONDARY}`,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11,
                            fontWeight: 900,
                            letterSpacing: '0.09em',
                            color: LAUNCH_PALETTE.BACKGROUND,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          +15 MERIT
                        </span>
                      </div>

                      {/* Official Serial Plate */}
                      <div
                        style={{
                          marginTop: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 12,
                          alignSelf: 'flex-start',
                          padding: '9px 15px',
                          borderRadius: 12,
                          backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                          border: `1.5px solid ${LAUNCH_PALETTE.ACCENT}`,
                        }}
                      >
                        <QrCode size={16} color={LAUNCH_PALETTE.ACCENT} />
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 15,
                            fontWeight: 900,
                            letterSpacing: '0.09em',
                            color: LAUNCH_PALETTE.BACKGROUND,
                          }}
                        >
                          {safeCertSerial}
                        </span>
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.SECONDARY,
                            color: LAUNCH_PALETTE.CARD_BG,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 800,
                            letterSpacing: '0.1em',
                          }}
                        >
                          SAH ✓
                        </span>
                      </div>
                    </div>

                    {/* Right Medallion Seal (centered at x=734, y=180 inside this card) */}
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 2,
                        width: MEDALLION_SIZE,
                        height: MEDALLION_SIZE,
                        flexShrink: 0,
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                        border: `2.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                        boxShadow: 'inset 0 0 0 5px rgba(201, 111, 79, 0.28)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <Award size={34} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.1} />
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: '0.16em',
                          color: LAUNCH_PALETTE.TERTIARY,
                        }}
                      >
                        E-SIJIL
                      </span>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 9.5,
                          fontWeight: 700,
                          letterSpacing: '0.14em',
                          color: LAUNCH_PALETTE.SECONDARY,
                        }}
                      >
                        2026
                      </span>
                    </div>

                    {/* Restrained Architectural Luxury-Watch-Glint Spark Burst Hugging Medallion */}
                    <GeometricSparkBurst
                      triggerFrame={sparkTrigger}
                      x={MEDALLION_CENTER_X}
                      y={MEDALLION_CENTER_Y}
                      durationFrames={sparkDuration}
                      radius={72}
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
                </ExplodedLayer>
              </Interactive.Div>
            </div>
          </div>
        </div>
      </CameraStage>

      <EditorialFrameMarks chapterCode="06" chapterLabel="Sistem Kelab & EMS" />
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
