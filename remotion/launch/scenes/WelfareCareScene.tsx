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
  Calendar,
  Check,
  Clock,
  MapPin,
  Package,
  QrCode,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { EvolvingPath } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';
import { DeterministicQrMatrix, ExplodedLayer, KineticWindow } from '../ui/KineticCard';

export type WelfareCareProps = {
  readonly ticketNo: string;
  readonly slaLabel: string;
  readonly headline: string;
};

type SlaStageSpec = {
  readonly title: string;
  readonly meta: string;
  readonly badge: string;
};

type FoodBankStepSpec = {
  readonly label: string;
  readonly subLabel: string;
};

const STAGES: readonly SlaStageSpec[] = [
  { title: 'Dihantar', meta: '09:14 AM • Portal Rasmi Pelajar', badge: 'DITERIMA' },
  { title: 'Disemak EXCO', meta: '10:02 AM • Unit Kebajikan JPP', badge: 'DISAHKAN' },
  { title: 'Tindakan Fasiliti', meta: '02:30 PM • Agihan & Penyelenggaraan', badge: 'DILAKSANA' },
  { title: 'Selesai', meta: '03:56 PM • Rekod & Audit Ditutup', badge: 'SELESAI ✓' },
];

const FOOD_BANK_STEPS: readonly FoodBankStepSpec[] = [
  { label: 'Dipohon ✓', subLabel: '08:40 AM' },
  { label: 'Disemak ✓', subLabel: '11:15 AM' },
  { label: 'Sedia Diambil ✓', subLabel: 'Kaunter Aktif' },
];

const PICKUP_SCHEDULE = [
  { label: 'Tarikh Pengambilan', value: 'Khamis, 26 Nov 2026', kind: 'date' as const },
  { label: 'Slot Masa', value: '2:30 PM – 4:00 PM', kind: 'time' as const },
  { label: 'Lokasi Agihan', value: 'Bilik Gerakan JPP · Blok A', kind: 'location' as const },
];

const MANIFEST_ITEMS = ['Beras 5kg', 'Minyak Masak', 'Biskut Kering', 'Pek Minuman'] as const;

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const SPINE_EASING = Easing.bezier(0.37, 0, 0.63, 1);
const TIMER_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const SHEEN_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

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

// Twin-Deck Bento geometry inside 1920x1080 safe bounds
const DECK_WIDTH = 840;
const DECK_HEIGHT = 724;
const DECK_GAP = 48;
const DECK_LEFT_X = 96;
const DECK_RIGHT_X = DECK_LEFT_X + DECK_WIDTH + DECK_GAP;
const DECK_TOP = 256;

// Pixel-locked Vertical SLA Spine inside Left Deck
const ROW_HEIGHT = 86;
const ROW_GAP = 18;
const ROW_PITCH = ROW_HEIGHT + ROW_GAP;
const SPINE_X = 28;
const FIRST_NODE_Y = ROW_HEIGHT / 2; // 43
const LAST_NODE_Y = FIRST_NODE_Y + (STAGES.length - 1) * ROW_PITCH; // 355
const TIMELINE_HEIGHT = (STAGES.length - 1) * ROW_PITCH + ROW_HEIGHT; // 398
const SPINE_PATH_D = `M ${SPINE_X} ${FIRST_NODE_Y} L ${SPINE_X} ${LAST_NODE_Y}`;

const renderScheduleIcon = (kind: (typeof PICKUP_SCHEDULE)[number]['kind']) => {
  switch (kind) {
    case 'date':
      return <Calendar size={15} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />;
    case 'time':
      return <Clock size={15} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />;
    case 'location':
      return <MapPin size={15} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.4} />;
  }
};

const WelfareCareInner: React.FC<WelfareCareProps> = ({ ticketNo, slaLabel, headline }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeDuration = Math.max(30, Number.isFinite(durationInFrames) ? durationInFrames : 366);
  const timeSec = frame / safeFps;

  const safeTicketNo = ticketNo.trim() || 'KBJ-2026-0842';
  const safeSlaLabel = slaLabel.trim() || '< 48 JAM';
  const safeHeadline = headline.trim() || 'Kebajikan Disantuni Dengan Telus.';

  // Beat 1 (0..1.25s): Centered Editorial Header + Twin-Deck Reveal
  const pillStart = 0;
  const pillDuration = Math.max(8, Math.round(0.38 * safeFps));
  const headlineStart = Math.round(0.1 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.06 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.34 * safeFps));
  const subtitleStart = Math.round(0.28 * safeFps);
  const subtitleDuration = Math.max(8, Math.round(0.38 * safeFps));

  const leftDeckEnter = interpolate(
    frame,
    [Math.round(0.22 * safeFps), Math.round(0.88 * safeFps)],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );
  const leftDeckOpacity = interpolate(leftDeckEnter, [0, 0.28, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const leftDeckX = interpolate(leftDeckEnter, [0, 1], [-34, 0]);
  const leftDeckY = interpolate(leftDeckEnter, [0, 1], [22, 0]);

  const rightDeckEnter = interpolate(
    frame,
    [Math.round(0.34 * safeFps), Math.round(1.02 * safeFps)],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );
  const rightDeckOpacity = interpolate(rightDeckEnter, [0, 0.28, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rightDeckX = interpolate(rightDeckEnter, [0, 1], [34, 0]);
  const rightDeckY = interpolate(rightDeckEnter, [0, 1], [22, 0]);

  // Continuous gentle breathing across both decks right through durationInFrames - 1
  const leftDeckFloatY = Math.sin(timeSec * 1.4) * 2.6 * leftDeckEnter;
  const rightDeckFloatY = Math.cos(timeSec * 1.35 + 0.7) * 2.6 * rightDeckEnter;

  // Subtle exit momentum lead matching CameraStage exit launch
  const exitFrames = Math.max(2, Math.round(0.35 * safeFps));
  const sceneEnd = Math.max(1, safeDuration - 1);
  const exitStart = Math.max(0, Math.min(sceneEnd - 1, safeDuration - exitFrames));
  const exitFactor = interpolate(frame, [exitStart, sceneEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.55, 0, 1, 0.45),
  });
  const deckExitLift = -10 * exitFactor;

  // Beat 2 (1.1..4.2s): Vertical EvolvingPath SLA Spine + 4 Stage Cues + Live Elapsed Timer
  const spineStart = Math.round(1.1 * safeFps); // 66f
  const spineDuration = Math.max(24, Math.round(3.05 * safeFps)); // 183f -> ends 249f (~4.15s)
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

  const slaMeterScaleX = interpolate(frame, [spineStart, finalStepCueFrame], [0.06, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: TIMER_EASING,
  });

  // Right Deck Beat 2: 3-Step Food Bank Mini-Stepper + Schedule Cards + QR Pickup Cutout
  const fbStepCueFrames = [
    Math.round(0.88 * safeFps), // 53f
    Math.round(1.68 * safeFps), // 101f
    Math.round(2.45 * safeFps), // 147f
  ] as const;

  const fbTrackScaleX = interpolate(
    frame,
    [fbStepCueFrames[0], fbStepCueFrames[2]],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: SPINE_EASING,
    },
  );

  const excoBadgeStart = fbStepCueFrames[2] + Math.round(0.08 * safeFps);
  const excoBadgeSpring =
    frame >= excoBadgeStart
      ? spring({
          frame: frame - excoBadgeStart,
          fps: safeFps,
          config: { damping: 14, stiffness: 220, mass: 0.85 },
        })
      : 0;

  const scheduleEnterStart = Math.round(1.45 * safeFps);
  const qrTicketEnterFrame = Math.round(1.85 * safeFps); // 111f

  // Continuous subtle laser / sheen glide across the Digital QR Pickup Ticket
  const ticketCycleFrames = Math.max(48, Math.round(2.1 * safeFps));
  const ticketLocal = Math.max(0, frame - qrTicketEnterFrame);
  const ticketPhase = frame >= qrTicketEnterFrame ? (ticketLocal % ticketCycleFrames) / ticketCycleFrames : 0;
  const ticketSheenX = interpolate(ticketPhase, [0, 0.72], [-220, 860], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SHEEN_EASE,
  });
  const ticketSheenOpacity =
    frame >= qrTicketEnterFrame
      ? interpolate(ticketPhase, [0, 0.14, 0.56, 0.72], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;
  const qrLaserNormalizedY = 0.5 + 0.42 * Math.sin(timeSec * 2.4);
  const qrLaserTopPx = 14 + qrLaserNormalizedY * 124;

  // Beat 3 (3.95..6.1s): Rough-Notation <Highlight> across < 48 JAM + Architectural "SELESAI & DISANTUNI ✓" seal
  const highlightStart = Math.round(3.92 * safeFps); // 235f
  const highlightDuration = Math.max(10, Math.round(0.58 * safeFps)); // 35f -> settles by 270f

  const sealStart = Math.round(4.18 * safeFps); // 251f -> cleanly stamped by f290
  const sealElapsed = frame - sealStart;
  const sealSpring =
    sealElapsed >= 0
      ? spring({
          frame: sealElapsed,
          fps: safeFps,
          config: { damping: 13, stiffness: 230, mass: 0.85 },
        })
      : 0;
  const sealScale = 1.36 + (1 - 1.36) * sealSpring;
  const sealRotate = -5.2 + (-1.8 - -5.2) * Math.min(1, sealSpring);
  const sealOpacity =
    sealElapsed >= 0
      ? interpolate(sealElapsed, [0, Math.max(3, Math.round(0.08 * safeFps))], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;
  const sealFloatY = sealOpacity > 0.001 ? Math.sin(timeSec * 2.1) * 2.2 * Math.min(1, sealSpring) : 0;
  const liveDotScale = 0.82 + Math.sin(timeSec * 5.6) * 0.2;

  return (
    <>
      <EditorialBackdrop />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.032}
        panXFrom={-10}
        panXTo={10}
        panYFrom={4}
        panYTo={-4}
        tiltXFrom={0.35}
        tiltXTo={-0.25}
        tiltYFrom={-0.75}
        tiltYTo={0.75}
        breathingAmplitude={0.55}
        entryPanXOffset={34}
        entryPanYOffset={16}
        entryZoomOffset={0.024}
        exitPanYDelta={-38}
        exitZoomDelta={-0.016}
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
          {/* Centered Top Editorial Header (y ~ 86..226) */}
          <Interactive.Div
            name="Welfare Header"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: 140,
              right: 140,
              top: 84,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 10,
            }}
          >
            <KineticReveal startFrame={pillStart} durationFrames={pillDuration}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '6px 18px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(107, 127, 91, 0.14)',
                  border: `1.5px solid ${LAUNCH_PALETTE.SECONDARY}`,
                  color: LAUNCH_PALETTE.PRIMARY,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                }}
              >
                <ShieldCheck size={15} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.4} />
                <span>E-KEBAJIKAN &amp; FOOD BANK JPP</span>
              </div>
            </KineticReveal>

            <KineticWords
              as="h2"
              text={safeHeadline}
              startFrame={headlineStart}
              staggerFrames={wordStagger}
              wordDurationFrames={wordDuration}
              align="center"
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

            <KineticReveal startFrame={subtitleStart} durationFrames={subtitleDuration}>
              <p
                style={{
                  margin: 0,
                  fontSize: 17.5,
                  fontWeight: 500,
                  lineHeight: 1.35,
                  color: LAUNCH_PALETTE.MUTED_OLIVE,
                  letterSpacing: '-0.01em',
                }}
              >
                Penjejakan aduan fasiliti bertempoh SLA bersama pas pengambilan digital Food Bank JPP secara masa nyata.
              </p>
            </KineticReveal>
          </Interactive.Div>

          {/* Left Deck (840px): Live KebajikanLiveTrackerCard */}
          <Interactive.Div
            name="Kebajikan Live Tracker Deck"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: DECK_LEFT_X,
              top: DECK_TOP,
              width: DECK_WIDTH,
              height: DECK_HEIGHT,
              opacity: leftDeckOpacity,
              transform: `translate3d(${leftDeckX.toFixed(2)}px, ${(leftDeckY + leftDeckFloatY + deckExitLift).toFixed(2)}px, 0px)`,
              overflow: 'visible',
            }}
          >
            <KineticWindow
              surface="light"
              routeLabel="jpp.polisas.edu.my/kebajikan"
              statusPill="TIKET AKTIF"
              statusAccent={!allStagesComplete}
              width={DECK_WIDTH}
              height={DECK_HEIGHT}
              borderRadius={26}
              sheenStartFrame={Math.round(0.95 * safeFps)}
              sheenDuration={44}
              style={{
                borderColor: allStagesComplete ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.TERTIARY,
                overflow: 'visible',
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: '24px 30px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                  overflow: 'visible',
                }}
              >
                {/* Ticket Header Row with SLA <Highlight> & Beat 3 Architectural Seal */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 18,
                    paddingBottom: 18,
                    borderBottom: `1.5px solid ${LAUNCH_PALETTE.SURFACE_MUTED}`,
                    overflow: 'visible',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        color: LAUNCH_PALETTE.SECONDARY,
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          backgroundColor: allStagesComplete
                            ? LAUNCH_PALETTE.SECONDARY
                            : LAUNCH_PALETTE.ACCENT,
                          transform: `scale(${liveDotScale.toFixed(3)})`,
                          display: 'inline-block',
                        }}
                      />
                      <span>PENJEJAK ADUAN LANGSUNG • PRASARANA</span>
                    </div>

                    <div
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 22,
                        fontWeight: 900,
                        letterSpacing: '0.02em',
                        color: LAUNCH_PALETTE.ACCENT,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      TIKET #{safeTicketNo}
                    </div>

                    <div
                      style={{
                        fontSize: 15.5,
                        fontWeight: 700,
                        color: LAUNCH_PALETTE.PRIMARY,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      Aduan Fasiliti: Lampu Koridor Blok Kediaman C
                    </div>
                  </div>

                  {/* Top-Right SLA Highlight Badge + Stamping Architectural Seal */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 10,
                      flexShrink: 0,
                      overflow: 'visible',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 14px',
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                        border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        color: LAUNCH_PALETTE.MUTED_OLIVE,
                        overflow: 'visible',
                      }}
                    >
                      <span>SLA</span>
                      <span style={{ display: 'inline-block', overflow: 'visible' }}>
                        <EditorialAnnotation
                          type="highlight"
                          startFrame={highlightStart}
                          durationFrames={highlightDuration}
                          color="rgba(201, 111, 79, 0.40)"
                          padding={{ top: 4, right: 9, bottom: 4, left: 9 }}
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

                    <div
                      style={{
                        position: 'relative',
                        minWidth: 252,
                        height: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        overflow: 'visible',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '7px 14px',
                          borderRadius: 999,
                          backgroundColor: 'rgba(107, 127, 91, 0.12)',
                          border: `1px solid ${LAUNCH_PALETTE.SECONDARY}`,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 800,
                          letterSpacing: '0.11em',
                          color: LAUNCH_PALETTE.PRIMARY,
                          opacity: Math.max(0, 1 - sealOpacity),
                        }}
                      >
                        <Clock size={13} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.5} />
                        <span>PEMANTAUAN EXCO</span>
                      </div>

                      {/* Beat 3 Architectural Seal */}
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
                            gap: 9,
                            padding: '8px 14px',
                            borderRadius: 12,
                            backgroundColor: LAUNCH_PALETTE.PRIMARY,
                            border: `2px solid ${LAUNCH_PALETTE.ACCENT}`,
                            boxShadow:
                              '0 12px 28px rgba(31, 39, 32, 0.22), inset 0 0 0 1px rgba(217, 201, 178, 0.35)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 999,
                              backgroundColor: LAUNCH_PALETTE.SECONDARY,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Check size={12} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={3} />
                          </span>
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 12.5,
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
                </div>

                {/* Beat 2: Vertical EvolvingPath SLA Spine + 4 Pixel-Locked Nodes */}
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
                            fps: safeFps,
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
                      ? interpolate(cueElapsed, [0, Math.max(3, Math.round(0.1 * safeFps))], [0, 1], {
                          extrapolateLeft: 'clamp',
                          extrapolateRight: 'clamp',
                        })
                      : 0;
                    const badgeScale = isStepDone ? 0.86 + 0.14 * clampedSpring : 0.92;

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
                        ? 'rgba(46, 58, 47, 0.08)'
                        : 'rgba(107, 127, 91, 0.11)';
                    const cardBorder = !isStepDone
                      ? LAUNCH_PALETTE.TERTIARY
                      : isFinalStage
                        ? LAUNCH_PALETTE.PRIMARY
                        : LAUNCH_PALETTE.SECONDARY;

                    return (
                      <React.Fragment key={stage.title}>
                        <div
                          style={{
                            position: 'absolute',
                            left: SPINE_X + 18,
                            top: nodeY - 1,
                            width: 18,
                            height: 2,
                            backgroundColor: isStepDone
                              ? LAUNCH_PALETTE.SECONDARY
                              : LAUNCH_PALETTE.TERTIARY,
                            zIndex: 1,
                          }}
                        />

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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                            <span
                              style={{
                                fontSize: 19,
                                fontWeight: 800,
                                color: isStepDone
                                  ? LAUNCH_PALETTE.PRIMARY
                                  : LAUNCH_PALETTE.MUTED_OLIVE,
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
                                color: isStepDone
                                  ? LAUNCH_PALETTE.SECONDARY
                                  : LAUNCH_PALETTE.MUTED_OLIVE,
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
                              color: !isStepDone
                                ? LAUNCH_PALETTE.MUTED_OLIVE
                                : LAUNCH_PALETTE.CARD_BG,
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

                {/* Live Elapsed Resolution Readout Footer */}
                <div
                  style={{
                    borderRadius: 16,
                    backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                    border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 20,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.14em',
                          color: LAUNCH_PALETTE.MUTED_OLIVE,
                        }}
                      >
                        TEMPOH PENYELESAIAN MASA NYATA
                      </span>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          color: allStagesComplete
                            ? LAUNCH_PALETTE.SECONDARY
                            : LAUNCH_PALETTE.ACCENT,
                        }}
                      >
                        {allStagesComplete ? '100% DISAHKAN' : 'SLA AKTIF'}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: 'rgba(217, 201, 178, 0.55)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: 999,
                          backgroundColor: allStagesComplete
                            ? LAUNCH_PALETTE.SECONDARY
                            : LAUNCH_PALETTE.ACCENT,
                          transformOrigin: '0% 50%',
                          transform: `scaleX(${slaMeterScaleX.toFixed(4)})`,
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 15px',
                      borderRadius: 12,
                      backgroundColor: allStagesComplete
                        ? LAUNCH_PALETTE.PRIMARY
                        : LAUNCH_PALETTE.CARD_BG,
                      border: `1.5px solid ${
                        allStagesComplete ? LAUNCH_PALETTE.PRIMARY : LAUNCH_PALETTE.TERTIARY
                      }`,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 20,
                        fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums',
                        color: allStagesComplete
                          ? LAUNCH_PALETTE.BACKGROUND
                          : LAUNCH_PALETTE.PRIMARY,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {elapsedLabel}
                    </span>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 999,
                        backgroundColor: allStagesComplete
                          ? LAUNCH_PALETTE.SECONDARY
                          : 'rgba(201, 111, 79, 0.14)',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10.5,
                        fontWeight: 900,
                        letterSpacing: '0.1em',
                        color: allStagesComplete
                          ? LAUNCH_PALETTE.CARD_BG
                          : LAUNCH_PALETTE.ACCENT,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {allStagesComplete ? '· PANTAS' : 'PROSES'}
                    </span>
                  </div>
                </div>
              </div>
            </KineticWindow>
          </Interactive.Div>

          {/* Right Deck (840px): Live Digital Food Bank JPP Pickup Pass */}
          <Interactive.Div
            name="Food Bank Digital Pass Deck"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: DECK_RIGHT_X,
              top: DECK_TOP,
              width: DECK_WIDTH,
              height: DECK_HEIGHT,
              opacity: rightDeckOpacity,
              transform: `translate3d(${rightDeckX.toFixed(2)}px, ${(rightDeckY + rightDeckFloatY + deckExitLift).toFixed(2)}px, 0px)`,
              transformStyle: 'preserve-3d',
            }}
          >
            <KineticWindow
              surface="dark"
              routeLabel="foodbank · pas digital"
              statusPill="LULUS ✓"
              width={DECK_WIDTH}
              height={DECK_HEIGHT}
              borderRadius={26}
              sheenStartFrame={Math.round(1.18 * safeFps)}
              sheenDuration={48}
              style={{
                borderColor: 'rgba(217, 201, 178, 0.28)',
                boxShadow:
                  '0 28px 64px rgba(31, 39, 32, 0.24), 0 8px 20px rgba(31, 39, 32, 0.14)',
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
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Food Bank Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16,
                    paddingBottom: 14,
                    borderBottom: '1px solid rgba(217, 201, 178, 0.16)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        color: LAUNCH_PALETTE.ACCENT,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      <Package size={14} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.5} />
                      <span>PERMOHONAN #FB-2026-0419</span>
                    </div>

                    <div
                      style={{
                        fontSize: 27,
                        fontWeight: 900,
                        letterSpacing: '-0.025em',
                        color: LAUNCH_PALETTE.BACKGROUND,
                        lineHeight: 1.12,
                      }}
                    >
                      Bantuan Pek Asas Siswa
                    </div>

                    <div
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 600,
                        letterSpacing: '0.07em',
                        color: LAUNCH_PALETTE.TERTIARY,
                      }}
                    >
                      AMIRUL HAKIM BIN AZMAN • 04DAT24F1022 • KAMSIS C
                    </div>
                  </div>

                  {/* Sage DISAHKAN EXCO Badge */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '8px 14px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(107, 127, 91, 0.28)',
                      border: `1.5px solid ${LAUNCH_PALETTE.SECONDARY}`,
                      color: LAUNCH_PALETTE.BACKGROUND,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: '0.11em',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transform: `scale(${(0.92 + 0.08 * excoBadgeSpring).toFixed(3)})`,
                    }}
                  >
                    <ShieldCheck size={14} color={LAUNCH_PALETTE.TERTIARY} strokeWidth={2.5} />
                    <span>DISAHKAN EXCO</span>
                  </div>
                </div>

                {/* Live 3-Step Food Bank Mini-Stepper */}
                <div
                  style={{
                    position: 'relative',
                    padding: '14px 18px',
                    borderRadius: 18,
                    backgroundColor: 'rgba(248, 246, 238, 0.06)',
                    border: '1px solid rgba(217, 201, 178, 0.18)',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 12,
                    }}
                  >
                    {/* Connecting Track Behind Step Circles */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 17,
                        left: '16.5%',
                        right: '16.5%',
                        height: 3,
                        borderRadius: 999,
                        backgroundColor: 'rgba(217, 201, 178, 0.2)',
                        overflow: 'hidden',
                        zIndex: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: 999,
                          backgroundColor: LAUNCH_PALETTE.SECONDARY,
                          transformOrigin: '0% 50%',
                          transform: `scaleX(${fbTrackScaleX.toFixed(4)})`,
                        }}
                      />
                    </div>

                    {FOOD_BANK_STEPS.map((step, idx) => {
                      const cue = fbStepCueFrames[idx] ?? 0;
                      const isDone = frame >= cue;
                      const stepSpring =
                        frame >= cue
                          ? spring({
                              frame: frame - cue,
                              fps: safeFps,
                              config: { damping: 14, stiffness: 250, mass: 0.78 },
                            })
                          : 0;
                      const isFinal = idx === FOOD_BANK_STEPS.length - 1;

                      return (
                        <div
                          key={step.label}
                          style={{
                            position: 'relative',
                            zIndex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 999,
                              backgroundColor: !isDone
                                ? LAUNCH_PALETTE.PRIMARY_DARK
                                : isFinal
                                  ? LAUNCH_PALETTE.ACCENT
                                  : LAUNCH_PALETTE.SECONDARY,
                              border: `2px solid ${
                                !isDone
                                  ? 'rgba(217, 201, 178, 0.35)'
                                  : isFinal
                                    ? LAUNCH_PALETTE.TERTIARY
                                    : LAUNCH_PALETTE.SECONDARY
                              }`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transform: `scale(${(isDone ? 0.8 + 0.2 * stepSpring : 0.94).toFixed(3)})`,
                              boxShadow: isDone ? '0 6px 14px rgba(31, 39, 32, 0.35)' : 'none',
                            }}
                          >
                            {isDone ? (
                              isFinal ? (
                                <Sparkles size={15} color={LAUNCH_PALETTE.BACKGROUND} strokeWidth={2.5} />
                              ) : (
                                <Check size={16} color={LAUNCH_PALETTE.BACKGROUND} strokeWidth={3} />
                              )
                            ) : (
                              <span
                                style={{
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: LAUNCH_PALETTE.TERTIARY,
                                }}
                              >
                                0{idx + 1}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span
                              style={{
                                fontSize: 13.5,
                                fontWeight: 800,
                                color: isDone
                                  ? LAUNCH_PALETTE.BACKGROUND
                                  : 'rgba(217, 201, 178, 0.65)',
                              }}
                            >
                              {step.label}
                            </span>
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 10.5,
                                fontWeight: 600,
                                color: isDone ? LAUNCH_PALETTE.TERTIARY : 'rgba(217, 201, 178, 0.48)',
                              }}
                            >
                              {step.subLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pickup Schedule Metadata Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12,
                  }}
                >
                  {PICKUP_SCHEDULE.map((item, idx) => {
                    const cardStart = scheduleEnterStart + idx * Math.round(0.1 * safeFps);
                    const cardProg = interpolate(
                      frame,
                      [cardStart, cardStart + Math.max(8, Math.round(0.32 * safeFps))],
                      [0, 1],
                      {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                        easing: EXPO_OUT,
                      },
                    );

                    return (
                      <div
                        key={item.label}
                        style={{
                          padding: '13px 14px',
                          borderRadius: 16,
                          backgroundColor: 'rgba(248, 246, 238, 0.06)',
                          border: '1px solid rgba(217, 201, 178, 0.2)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          opacity: cardProg,
                          transform: `translate3d(0px, ${((1 - cardProg) * 14).toFixed(2)}px, 0px)`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          {renderScheduleIcon(item.kind)}
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: '0.11em',
                              textTransform: 'uppercase',
                              color: LAUNCH_PALETTE.TERTIARY,
                            }}
                          >
                            {item.label}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 14.5,
                            fontWeight: 800,
                            color: LAUNCH_PALETTE.BACKGROUND,
                            lineHeight: 1.25,
                          }}
                        >
                          {item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Perforated Boarding-Pass Divider */}
                <div
                  style={{
                    position: 'relative',
                    height: 14,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      borderTop: '2px dashed rgba(217, 201, 178, 0.3)',
                    }}
                  />
                </div>

                {/* Elevated Digital QR Pickup Ticket (ExplodedLayer zDepth=26) */}
                <ExplodedLayer
                  zDepth={26}
                  enterFrame={qrTicketEnterFrame}
                  enterOffsetY={24}
                  floatAmplitude={2.2}
                  floatPhase={1.1}
                  style={{ flex: 1, display: 'flex' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      flex: 1,
                      borderRadius: 20,
                      backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                      border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                      boxShadow:
                        '0 22px 46px rgba(31, 39, 32, 0.38), 0 4px 12px rgba(31, 39, 32, 0.2)',
                      padding: '20px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 24,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Subtle Diagonal Sheen Glide across Ticket Cutout */}
                    {ticketSheenOpacity > 0.004 ? (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-40%',
                          left: 0,
                          width: 140,
                          height: '180%',
                          opacity: ticketSheenOpacity,
                          background:
                            'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.55) 50%, rgba(255, 255, 255, 0) 100%)',
                          transform: `translate3d(${ticketSheenX.toFixed(2)}px, 0px, 0px) rotate(22deg)`,
                          pointerEvents: 'none',
                          zIndex: 5,
                        }}
                      />
                    ) : null}

                    {/* Left: Warm Porcelain QR Pedestal + DeterministicQrMatrix + Gentle Laser Glide */}
                    <div
                      style={{
                        position: 'relative',
                        width: 152,
                        height: 152,
                        flexShrink: 0,
                        borderRadius: 16,
                        backgroundColor: LAUNCH_PALETTE.CARD_BG,
                        border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <span style={{ position: 'absolute', left: 7, top: 7, width: 12, height: 12, borderTop: `2.5px solid ${LAUNCH_PALETTE.SECONDARY}`, borderLeft: `2.5px solid ${LAUNCH_PALETTE.SECONDARY}`, borderTopLeftRadius: 4 }} />
                      <span style={{ position: 'absolute', right: 7, top: 7, width: 12, height: 12, borderTop: `2.5px solid ${LAUNCH_PALETTE.SECONDARY}`, borderRight: `2.5px solid ${LAUNCH_PALETTE.SECONDARY}`, borderTopRightRadius: 4 }} />
                      <span style={{ position: 'absolute', left: 7, bottom: 7, width: 12, height: 12, borderBottom: `2.5px solid ${LAUNCH_PALETTE.SECONDARY}`, borderLeft: `2.5px solid ${LAUNCH_PALETTE.SECONDARY}`, borderBottomLeftRadius: 4 }} />
                      <span style={{ position: 'absolute', right: 7, bottom: 7, width: 12, height: 12, borderBottom: `2.5px solid ${LAUNCH_PALETTE.SECONDARY}`, borderRight: `2.5px solid ${LAUNCH_PALETTE.SECONDARY}`, borderBottomRightRadius: 4 }} />

                      <DeterministicQrMatrix
                        seed={419}
                        size={116}
                        fgColor={LAUNCH_PALETTE.PRIMARY}
                        bgColor={LAUNCH_PALETTE.CARD_BG}
                      />

                      {/* Subtle Terracotta Verification Laser Glide */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 8,
                          right: 8,
                          top: qrLaserTopPx - 8,
                          height: 16,
                          display: 'flex',
                          alignItems: 'center',
                          pointerEvents: 'none',
                          zIndex: 3,
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background:
                              'linear-gradient(180deg, rgba(201, 111, 79, 0) 0%, rgba(201, 111, 79, 0.24) 50%, rgba(201, 111, 79, 0) 100%)',
                          }}
                        />
                        <div
                          style={{
                            width: '100%',
                            height: 2,
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.ACCENT,
                            opacity: 0.72,
                          }}
                        />
                      </div>
                    </div>

                    {/* Right: Pickup Ticket Metadata & Manifest Pills */}
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 2,
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          alignSelf: 'flex-start',
                          padding: '5px 11px',
                          borderRadius: 999,
                          backgroundColor: 'rgba(107, 127, 91, 0.16)',
                          border: `1px solid ${LAUNCH_PALETTE.SECONDARY}`,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10.5,
                          fontWeight: 900,
                          letterSpacing: '0.1em',
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        <QrCode size={13} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.5} />
                        <span>PAS PENGAMBILAN SAH · IMBAS DI KAUNTER</span>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 21,
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            color: LAUNCH_PALETTE.PRIMARY,
                            lineHeight: 1.15,
                          }}
                        >
                          Pek Bantuan Makanan Asas (Set A)
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: LAUNCH_PALETTE.MUTED_OLIVE,
                          }}
                        >
                          TOKEN: FB-2026-0419-JPP • VERIFIKASI KAMPUS
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {MANIFEST_ITEMS.map((item) => (
                          <span
                            key={item}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 999,
                              backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                              border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: LAUNCH_PALETTE.PRIMARY,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>

                      <div
                        style={{
                          paddingTop: 8,
                          borderTop: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.1em',
                          color: LAUNCH_PALETTE.SECONDARY,
                        }}
                      >
                        <span>SAH SEHINGGA 26 NOV 2026</span>
                        <span>KAUNTER KEBAJIKAN JPP</span>
                      </div>
                    </div>
                  </div>
                </ExplodedLayer>
              </div>
            </KineticWindow>
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
