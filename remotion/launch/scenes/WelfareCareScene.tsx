import React from 'react';
import {
  Easing,
  Interactive,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import { Check, Clock, ShieldCheck } from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { Device3DRig } from '../motion/Device3DRig';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { EvolvingPath } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

type WelfareCareProps = {
  readonly ticketNo: string;
  readonly slaLabel: string;
  readonly headline: string;
};

type SlaStageSpec = {
  readonly title: string;
  readonly meta: string;
  readonly badge: string;
};

const STAGES: readonly SlaStageSpec[] = [
  { title: 'Dihantar', meta: '09:14 AM • Portal Rasmi Pelajar', badge: 'DITERIMA' },
  { title: 'Disemak EXCO', meta: '10:02 AM • Unit Kebajikan JPP', badge: 'DISAHKAN' },
  { title: 'Tindakan Fasiliti', meta: '02:30 PM • Agihan & Penyelenggaraan', badge: 'DILAKSANA' },
  { title: 'Selesai', meta: '03:56 PM • Rekod & Audit Ditutup', badge: 'SELESAI ✓' },
];

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const SPINE_EASING = Easing.bezier(0.37, 0, 0.63, 1);
const TIMER_EASING = Easing.bezier(0.22, 1, 0.36, 1);

const resolveNormalizedTimeForProgress = (
  targetProgress: number,
  easing: (t: number) => number,
): number => {
  if (targetProgress <= 0) return 0;
  if (targetProgress >= 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) * 0.5;
    if (easing(mid) < targetProgress) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) * 0.5;
};

const ROW_HEIGHT = 76;
const ROW_GAP = 18;
const ROW_PITCH = ROW_HEIGHT + ROW_GAP;
const SPINE_X = 28;
const FIRST_NODE_Y = ROW_HEIGHT / 2; // 38
const LAST_NODE_Y = FIRST_NODE_Y + (STAGES.length - 1) * ROW_PITCH; // 320
const TIMELINE_HEIGHT = (STAGES.length - 1) * ROW_PITCH + ROW_HEIGHT; // 358
const SPINE_PATH_D = `M ${SPINE_X} ${FIRST_NODE_Y} L ${SPINE_X} ${LAST_NODE_Y}`;

const WelfareCareInner: React.FC<WelfareCareProps> = ({ ticketNo, slaLabel, headline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeTicketNo = ticketNo.trim() || 'KBJ-2026-0842';
  const safeSlaLabel = slaLabel.trim() || '< 48 JAM';
  const safeHeadline = headline.trim() || 'Kebajikan Disantuni Dengan Telus.';

  // Beat 1 (0..1.4s): Device3DRig laptop rack-focus + diagonal shine + KineticWords headline
  const pillEnterStart = 0;
  const pillEnterEnd = Math.max(8, Math.round(0.42 * fps));
  const pillProgress = interpolate(frame, [pillEnterStart, pillEnterEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const pillTranslateY = interpolate(pillProgress, [0, 1], [18, 0]);
  const pillOpacity = interpolate(pillProgress, [0, 0.3, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const headlineStart = Math.round(0.14 * fps);
  const wordStagger = Math.max(2, Math.round(0.065 * fps));
  const wordDuration = Math.max(8, Math.round(0.38 * fps));

  const laptopEnter = Math.round(0.08 * fps);
  const laptopDuration = Math.max(12, Math.round(0.95 * fps));
  const laptopShineStart = Math.round(0.86 * fps);
  const laptopShineDuration = Math.max(10, Math.round(0.68 * fps));

  const telemetryStart = Math.round(0.46 * fps);
  const telemetryDuration = Math.max(8, Math.round(0.46 * fps));

  const cardEnterStart = Math.round(0.28 * fps);
  const cardEnterEnd = Math.max(cardEnterStart + 10, Math.round(0.95 * fps));
  const cardEnterProgress = interpolate(frame, [cardEnterStart, cardEnterEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const cardTranslateX = interpolate(cardEnterProgress, [0, 1], [44, 0]);
  const cardOpacity = interpolate(cardEnterProgress, [0, 0.3, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Beat 2 (1.2..4.4s): Vertical EvolvingPath SLA Spine + 4 spring-popping nodes & lateral nudges
  const spineStart = Math.round(1.22 * fps);
  const spineDuration = Math.max(24, Math.round(2.92 * fps));
  const spineEnd = spineStart + spineDuration;

  const stageCueFrames = STAGES.map((_, idx) => {
    const targetProgress = idx / Math.max(1, STAGES.length - 1);
    const normalizedTime = resolveNormalizedTimeForProgress(targetProgress, SPINE_EASING);
    return spineStart + Math.round(normalizedTime * spineDuration);
  });

  const finalStepCueFrame = stageCueFrames[stageCueFrames.length - 1] ?? spineEnd;
  const elapsedMinutes = Math.round(
    interpolate(frame, [spineStart, finalStepCueFrame], [0, 402], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: TIMER_EASING,
    }),
  );
  const displayHours = Math.floor(elapsedMinutes / 60);
  const displayMins = elapsedMinutes % 60;
  const elapsedLabel = `${String(displayHours).padStart(2, '0')}j ${String(displayMins).padStart(2, '0')}m`;
  const allStagesComplete = frame >= finalStepCueFrame;

  // Beat 3 (4.2..6.0s): Rough-Notation <Highlight> across < 48 JAM + Architectural "SELESAI & DISANTUNI ✓" seal
  const highlightStart = Math.round(4.22 * fps);
  const highlightDuration = Math.max(10, Math.round(0.62 * fps));

  const sealStart = Math.round(4.32 * fps);
  const sealElapsed = frame - sealStart;
  const sealSpring =
    sealElapsed >= 0
      ? spring({
          frame: sealElapsed,
          fps,
          config: { damping: 13, stiffness: 230, mass: 0.85 },
        })
      : 0;
  const sealScale = 1.38 + (1 - 1.38) * sealSpring;
  const sealRotate = -5.5 + (-2.2 - -5.5) * Math.min(1, sealSpring);
  const sealOpacity =
    sealElapsed >= 0
      ? interpolate(sealElapsed, [0, Math.max(3, Math.round(0.08 * fps))], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  const timeSec = frame / Math.max(1, fps);
  const liveDotScale = 0.82 + Math.sin(timeSec * 5.8) * 0.22;
  const sealFloatY = sealOpacity > 0.001 ? Math.sin(timeSec * 2.2) * 2 * Math.min(1, sealSpring) : 0;

  return (
    <>
      <EditorialBackdrop />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.035}
        panXFrom={-10}
        panXTo={10}
        panYFrom={4}
        panYTo={-4}
        tiltXFrom={0.4}
        tiltXTo={-0.25}
        tiltYFrom={-0.8}
        tiltYTo={0.8}
        breathingAmplitude={0.55}
        clip
      >
        <div
          style={{
            position: 'absolute',
            left: 84,
            right: 84,
            top: 96,
            bottom: 92,
            display: 'flex',
            gap: 48,
            alignItems: 'center',
            fontFamily: LAUNCH_FONTS.DISPLAY,
          }}
        >
          {/* Left Column: Food Bank Admin Laptop Rig + Live Telemetry Strip */}
          <div
            style={{
              width: 896,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            <Device3DRig
              variant="laptop"
              name="Foodbank Command Center Rig"
              src={staticFile('GAMBAR/Foodbank Admin Preview.png')}
              width={896}
              height={460}
              enterFrame={laptopEnter}
              enterDuration={laptopDuration}
              initialBlur={16}
              initialAberration={3.5}
              shineStartFrame={laptopShineStart}
              shineDuration={laptopShineDuration}
              baseRotateX={1.2}
              baseRotateY={4.5}
              entryRotateX={8}
              entryRotateY={-12}
              entryTranslateY={64}
              floatAmplitude={0.85}
              floatPhase={0.4}
              fit="cover"
              objectPosition="top left"
              addressLabel="jpp.polisas.edu.my/foodbank"
            />

            <KineticReveal startFrame={telemetryStart} durationFrames={telemetryDuration}>
              <div style={{ display: 'flex', gap: 18 }}>
                <div
                  style={{
                    flex: 1,
                    backgroundColor: LAUNCH_PALETTE.CARD_BG,
                    borderRadius: 20,
                    border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    padding: '18px 22px',
                    boxShadow: '0 14px 32px rgba(46, 58, 47, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11.5,
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      color: LAUNCH_PALETTE.SECONDARY,
                    }}
                  >
                    FOOD BANK JPP • KAUNTER AKTIF
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 28,
                        fontWeight: 900,
                        color: LAUNCH_PALETTE.PRIMARY,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      RM 5,000
                    </span>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: LAUNCH_PALETTE.MUTED_OLIVE,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      97 Permohonan Dipantau
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    backgroundColor: LAUNCH_PALETTE.PRIMARY,
                    borderRadius: 20,
                    border: '1.5px solid rgba(217, 201, 178, 0.28)',
                    padding: '18px 22px',
                    boxShadow: '0 16px 36px rgba(31, 39, 32, 0.16)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11.5,
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      color: LAUNCH_PALETTE.TERTIARY,
                    }}
                  >
                    TEMPOH SELESAI MASA NYATA
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 28,
                        fontWeight: 900,
                        color: allStagesComplete ? LAUNCH_PALETTE.BACKGROUND : LAUNCH_PALETTE.ACCENT,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {elapsedLabel}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: allStagesComplete ? '4px 10px' : '0px',
                        borderRadius: 999,
                        backgroundColor: allStagesComplete ? LAUNCH_PALETTE.SECONDARY : 'transparent',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        color: allStagesComplete ? LAUNCH_PALETTE.CARD_BG : LAUNCH_PALETTE.TERTIARY,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {allStagesComplete ? (
                        <Check size={12} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={3} />
                      ) : (
                        <Clock size={13} color={LAUNCH_PALETTE.ACCENT} />
                      )}
                      {allStagesComplete ? 'TERCAPAI' : 'DALAM PROSES'}
                    </span>
                  </div>
                </div>
              </div>
            </KineticReveal>
          </div>

          {/* Right Column: SLA Badge with <Highlight> + KineticWords + EvolvingPath SLA Card */}
          <Interactive.Div
            name="Welfare SLA Panel"
            premountFor={fps}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              overflow: 'visible',
            }}
          >
            {/* Beat 1 & Beat 3: SLA Pill (overflow: visible so Rough-Notation <Highlight> never clips) */}
            <div
              style={{
                alignSelf: 'flex-start',
                overflow: 'visible',
                opacity: pillOpacity,
                transform: `translate3d(0px, ${pillTranslateY.toFixed(2)}px, 0px)`,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 20px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(107, 127, 91, 0.14)',
                  border: `1.5px solid ${LAUNCH_PALETTE.SECONDARY}`,
                  color: LAUNCH_PALETTE.PRIMARY,
                  fontSize: 13.5,
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  overflow: 'visible',
                }}
              >
                <ShieldCheck size={16} color={LAUNCH_PALETTE.SECONDARY} />
                <span>E-KEBAJIKAN • SLA</span>
                <span style={{ display: 'inline-block', overflow: 'visible' }}>
                  <EditorialAnnotation
                    type="highlight"
                    startFrame={highlightStart}
                    durationFrames={highlightDuration}
                    color="rgba(201, 111, 79, 0.28)"
                    padding={{ top: 4, right: 8, bottom: 4, left: 8 }}
                    iterations={1}
                    seed={22}
                    style={{ overflow: 'visible' }}
                  >
                    <span style={{ fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY_DARK }}>
                      {safeSlaLabel}
                    </span>
                  </EditorialAnnotation>
                </span>
              </div>
            </div>

            {/* Beat 1: KineticWords Headline */}
            <KineticWords
              as="h2"
              text={safeHeadline}
              startFrame={headlineStart}
              staggerFrames={wordStagger}
              wordDurationFrames={wordDuration}
              accentWords={['Dengan', 'Telus.']}
              accentColor={LAUNCH_PALETTE.ACCENT}
              style={{
                margin: 0,
                fontSize: 52,
                fontWeight: 900,
                lineHeight: 1.07,
                letterSpacing: '-0.03em',
                color: LAUNCH_PALETTE.PRIMARY,
              }}
            />

            {/* Ticket Card with Vertical EvolvingPath SLA Spine */}
            <div
              style={{
                backgroundColor: LAUNCH_PALETTE.CARD_BG,
                borderRadius: 26,
                border: `1.5px solid ${allStagesComplete ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.TERTIARY}`,
                padding: '26px 30px',
                boxShadow: '0 24px 54px rgba(46, 58, 47, 0.09)',
                opacity: cardOpacity,
                transform: `translate3d(${cardTranslateX.toFixed(2)}px, 0px, 0px)`,
              }}
            >
              {/* Ticket Header + Beat 3 Architectural Seal */}
              <div
                style={{
                  position: 'relative',
                  height: 68,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 18,
                  marginBottom: 22,
                  borderBottom: `1.5px solid ${LAUNCH_PALETTE.SURFACE_MUTED}`,
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.16em',
                      color: LAUNCH_PALETTE.MUTED_OLIVE,
                    }}
                  >
                    TIKET ADUAN &amp; KEBAJIKAN
                  </span>
                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 21,
                      fontWeight: 900,
                      letterSpacing: '0.02em',
                      color: LAUNCH_PALETTE.ACCENT,
                    }}
                  >
                    TIKET #{safeTicketNo}
                  </span>
                </div>

                {/* Live Status Pill fades under Beat 3 Seal */}
                <div
                  style={{
                    position: 'relative',
                    minWidth: 278,
                    height: 46,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      borderRadius: 999,
                      backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                      border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 12.5,
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      color: LAUNCH_PALETTE.SECONDARY,
                      opacity: Math.max(0, 1 - sealOpacity),
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.ACCENT,
                        transform: `scale(${liveDotScale.toFixed(3)})`,
                        display: 'inline-block',
                      }}
                    />
                    <span>STATUS LANGSUNG</span>
                  </div>

                  {/* Beat 3: Architectural "SELESAI & DISANTUNI ✓" Stamp */}
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '50%',
                      opacity: sealOpacity,
                      visibility: sealOpacity <= 0.001 ? 'hidden' : 'visible',
                      transformOrigin: '50% 50%',
                      transform: `translate3d(0px, calc(-50% + ${sealFloatY.toFixed(2)}px), 0px) rotate(${sealRotate.toFixed(2)}deg) scale(${sealScale.toFixed(4)})`,
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 16px',
                        borderRadius: 12,
                        backgroundColor: LAUNCH_PALETTE.PRIMARY,
                        border: `2px solid ${LAUNCH_PALETTE.ACCENT}`,
                        boxShadow:
                          '0 14px 32px rgba(31, 39, 32, 0.22), inset 0 0 0 1.5px rgba(217, 201, 178, 0.35)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          backgroundColor: LAUNCH_PALETTE.SECONDARY,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={13} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={3} />
                      </span>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 13.5,
                          fontWeight: 900,
                          letterSpacing: '0.09em',
                          color: LAUNCH_PALETTE.BACKGROUND,
                        }}
                      >
                        SELESAI &amp; DISANTUNI ✓
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Beat 2: Vertical EvolvingPath SLA Spine + 4 Pixel-Locked Step Cards */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: TIMELINE_HEIGHT,
                }}
              >
                <EvolvingPath
                  d={SPINE_PATH_D}
                  width={56}
                  height={TIMELINE_HEIGHT}
                  viewBox={`0 0 56 ${TIMELINE_HEIGHT}`}
                  startFrame={spineStart}
                  durationFrames={spineDuration}
                  stroke={LAUNCH_PALETTE.SECONDARY}
                  trackStroke={LAUNCH_PALETTE.TERTIARY}
                  strokeWidth={3.5}
                  showHeadDot
                  headDotRadius={6}
                  headDotColor={LAUNCH_PALETTE.ACCENT}
                  hideDotWhenComplete
                  easing={SPINE_EASING}
                  style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 1 }}
                />

                {STAGES.map((stage, idx) => {
                  const cueFrame = stageCueFrames[idx] ?? spineStart;
                  const isStepDone = frame >= cueFrame;
                  const cueElapsed = frame - cueFrame;
                  const stepSpring =
                    cueElapsed >= 0
                      ? spring({
                          frame: cueElapsed,
                          fps,
                          config: { damping: 13, stiffness: 250, mass: 0.72 },
                        })
                      : 0;
                  const clampedSpring = Math.min(1, Math.max(0, stepSpring));
                  const nudgeX =
                    isStepDone && clampedSpring < 0.999
                      ? Math.sin(clampedSpring * Math.PI) * 9
                      : 0;
                  const nodeScale = isStepDone ? 0.78 + 0.22 * stepSpring : 1;
                  const checkOpacity = isStepDone
                    ? interpolate(cueElapsed, [0, Math.max(3, Math.round(0.1 * fps))], [0, 1], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                      })
                    : 0;
                  const badgeScale = isStepDone ? 0.85 + 0.15 * clampedSpring : 0.9;

                  const nodeY = FIRST_NODE_Y + idx * ROW_PITCH;
                  const rowTop = idx * ROW_PITCH;
                  const isFinalStage = idx === STAGES.length - 1;

                  const nodeBg = !isStepDone
                    ? LAUNCH_PALETTE.SURFACE_MUTED
                    : isFinalStage
                      ? LAUNCH_PALETTE.PRIMARY
                      : LAUNCH_PALETTE.SECONDARY;
                  const nodeBorder = !isStepDone
                    ? LAUNCH_PALETTE.TERTIARY
                    : isFinalStage
                      ? LAUNCH_PALETTE.ACCENT
                      : LAUNCH_PALETTE.SECONDARY;
                  const cardBg = !isStepDone
                    ? LAUNCH_PALETTE.SURFACE_MUTED
                    : isFinalStage
                      ? 'rgba(46, 58, 47, 0.085)'
                      : 'rgba(107, 127, 91, 0.11)';
                  const cardBorder = !isStepDone
                    ? LAUNCH_PALETTE.TERTIARY
                    : isFinalStage
                      ? LAUNCH_PALETTE.PRIMARY
                      : LAUNCH_PALETTE.SECONDARY;

                  return (
                    <React.Fragment key={stage.title}>
                      {/* Horizontal connector tick between spine node and step card */}
                      <div
                        style={{
                          position: 'absolute',
                          left: SPINE_X + 18,
                          top: nodeY - 1,
                          width: 18,
                          height: 2,
                          backgroundColor: isStepDone ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.TERTIARY,
                          zIndex: 1,
                        }}
                      />

                      {/* Spring-popping circular checkmark node centered exactly at (SPINE_X, nodeY) */}
                      <div
                        style={{
                          position: 'absolute',
                          left: SPINE_X,
                          top: nodeY,
                          width: 36,
                          height: 36,
                          borderRadius: 999,
                          backgroundColor: nodeBg,
                          border: `2.5px solid ${nodeBorder}`,
                          boxSizing: 'border-box',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 3,
                          boxShadow: isStepDone
                            ? '0 6px 14px rgba(46, 58, 47, 0.16)'
                            : 'none',
                          transform: `translate(-50%, -50%) scale(${nodeScale.toFixed(4)})`,
                        }}
                      >
                        {isStepDone ? (
                          <span style={{ opacity: checkOpacity, display: 'inline-flex' }}>
                            <Check size={17} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={3} />
                          </span>
                        ) : (
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 12,
                              fontWeight: 800,
                              color: LAUNCH_PALETTE.MUTED_OLIVE,
                            }}
                          >
                            0{idx + 1}
                          </span>
                        )}
                      </div>

                      {/* Step Card with subtle lateral nudge on activation */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 64,
                          right: 0,
                          top: rowTop,
                          height: ROW_HEIGHT,
                          boxSizing: 'border-box',
                          padding: '12px 20px',
                          borderRadius: 16,
                          backgroundColor: cardBg,
                          border: `1.5px solid ${cardBorder}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          zIndex: 2,
                          transform: `translate3d(${nudgeX.toFixed(2)}px, 0px, 0px)`,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 19.5,
                              fontWeight: 800,
                              color: isStepDone ? LAUNCH_PALETTE.PRIMARY : LAUNCH_PALETTE.MUTED_OLIVE,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            0{idx + 1}. {stage.title}
                          </span>
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 12,
                              fontWeight: 600,
                              color: isStepDone ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.MUTED_OLIVE,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {stage.meta}
                          </span>
                        </div>

                        <span
                          style={{
                            padding: '5px 12px',
                            borderRadius: 999,
                            backgroundColor: !isStepDone
                              ? LAUNCH_PALETTE.CARD_BG
                              : isFinalStage
                                ? LAUNCH_PALETTE.PRIMARY
                                : LAUNCH_PALETTE.SECONDARY,
                            border: `1px solid ${
                              !isStepDone ? LAUNCH_PALETTE.TERTIARY : 'transparent'
                            }`,
                            color: !isStepDone ? LAUNCH_PALETTE.MUTED_OLIVE : LAUNCH_PALETTE.CARD_BG,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: '0.1em',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            transform: `scale(${badgeScale.toFixed(3)})`,
                          }}
                        >
                          {isStepDone ? stage.badge : 'MENUNGGU'}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </Interactive.Div>
        </div>
      </CameraStage>

      <EditorialFrameMarks chapterCode="05" chapterLabel="E-Kebajikan & Food Bank" />
    </>
  );
};

const welfareCareSchema = {
  ticketNo: { type: 'string', default: 'KBJ-2026-0842', description: 'Ticket Number' },
  slaLabel: { type: 'string', default: '< 48 JAM', description: 'SLA Guarantee' },
  headline: { type: 'string', default: 'Kebajikan Disantuni Dengan Telus.', description: 'Section Headline' },
} as const satisfies InteractivitySchema;

export const WelfareCareScene = Interactive.withSchema({
  Component: WelfareCareInner,
  componentName: 'WelfareCareScene',
  schema: welfareCareSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
