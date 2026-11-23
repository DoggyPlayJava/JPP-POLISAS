import React, { useMemo } from 'react';
import {
  CanvasImage,
  Easing,
  Interactive,
  Solid,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import { vignette } from '@remotion/effects/vignette';
import { Circle } from '@remotion/shapes';
import QRCode from 'react-qr-code';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticWords } from '../motion/KineticTypography';
import { EvolvingPath } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

type ClosingVaultProps = {
  readonly headlinePrimary: string;
  readonly headlineItalic: string;
  readonly portalUrl: string;
};

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const RADAR_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const SHEEN_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

const CLOSING_HEADLINE_DEFAULT = 'Imbas Sekarang. Mulakan Pengalaman Kampus Anda.';
const CLOSING_ITALIC_DEFAULT = 'Satu Kampus. Satu SuperApp Mahasiswa POLISAS.';

const LEGACY_PRIMARY_HEADLINES = new Set([
  'satu kampus. satu ekosistem pintar.',
  'baru masuk polisas? satu app untuk semua.',
]);
const LEGACY_ITALIC_HEADLINE = 'mendepani digitalisasi mahasiswa polisas.';

const resolveClosingPrimary = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed || LEGACY_PRIMARY_HEADLINES.has(trimmed.toLowerCase())) {
    return CLOSING_HEADLINE_DEFAULT;
  }
  return trimmed;
};

const resolveClosingItalic = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === LEGACY_ITALIC_HEADLINE) {
    return CLOSING_ITALIC_DEFAULT;
  }
  return trimmed;
};

const ONBOARDING_STEPS = [
  { code: '01', label: 'Buka Kamera Telefon' },
  { code: '02', label: 'Imbas Kod QR Ini' },
  { code: '03', label: 'Log Masuk & Teroka' },
] as const;

type CornerBracketSpec = {
  readonly id: string;
  readonly d: string;
  readonly posStyle: React.CSSProperties;
  readonly slideXSign: -1 | 1;
  readonly slideYSign: -1 | 1;
  readonly dotPosStyle: React.CSSProperties;
};

const CORNER_BRACKETS: readonly CornerBracketSpec[] = [
  {
    id: 'tl',
    d: 'M 12 84 L 12 12 L 84 12',
    posStyle: { left: 128, top: 108 },
    slideXSign: -1,
    slideYSign: -1,
    dotPosStyle: { left: 9, top: 9 },
  },
  {
    id: 'tr',
    d: 'M 84 84 L 84 12 L 12 12',
    posStyle: { right: 128, top: 108 },
    slideXSign: 1,
    slideYSign: -1,
    dotPosStyle: { right: 9, top: 9 },
  },
  {
    id: 'bl',
    d: 'M 12 12 L 12 84 L 84 84',
    posStyle: { left: 128, bottom: 108 },
    slideXSign: -1,
    slideYSign: 1,
    dotPosStyle: { left: 9, bottom: 9 },
  },
  {
    id: 'br',
    d: 'M 84 12 L 84 84 L 12 84',
    posStyle: { right: 128, bottom: 108 },
    slideXSign: 1,
    slideYSign: 1,
    dotPosStyle: { right: 9, bottom: 9 },
  },
];

const ClosingVaultInner: React.FC<ClosingVaultProps> = ({
  headlinePrimary,
  headlineItalic,
  portalUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeWidth = Math.max(1, Math.round(Number.isFinite(width) ? width : 1920));
  const safeHeight = Math.max(1, Math.round(Number.isFinite(height) ? height : 1080));
  const safeHeadlinePrimary = resolveClosingPrimary(headlinePrimary);
  const safeHeadlineItalic = resolveClosingItalic(headlineItalic);
  const safePortalUrl = portalUrl.trim() || 'https://jpp.polisas.edu.my';
  const displayDomain = safePortalUrl.replace(/^https?:\/\//, '');

  const timeSec = frame / safeFps;

  // Constant-key Deep Forest (#2E3A2F) vignette without per-frame shader thrashing
  const vignetteEffects = useMemo(
    () => [vignette({ amount: 0.22, color: LAUNCH_PALETTE.PRIMARY })],
    [],
  );

  // Beat 1 (0..1.6s): 4 symmetrical EvolvingPath corner L-brackets draw cleanly inward + Crest Pill springs open
  const bracketStart = Math.round(0.06 * safeFps);
  const bracketDuration = Math.max(18, Math.round(1.05 * safeFps));
  const bracketEnd = bracketStart + bracketDuration;
  const bracketSlidePx = interpolate(frame, [bracketStart, bracketEnd], [18, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const bracketDotOpacity = interpolate(
    frame,
    [bracketStart + Math.round(bracketDuration * 0.45), bracketEnd],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  const pillStart = 0;
  const pillElapsed = frame - pillStart;
  const pillSpring =
    pillElapsed >= 0
      ? spring({
          frame: pillElapsed,
          fps: safeFps,
          config: { damping: 180, stiffness: 220, mass: 0.9 },
        })
      : 0;
  const pillScaleX = 0.84 + 0.16 * pillSpring;
  const pillScaleY = 0.94 + 0.06 * pillSpring;
  const pillOpacity =
    pillElapsed >= 0
      ? interpolate(pillElapsed, [0, Math.max(4, Math.round(0.18 * safeFps))], [0.45, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  // Beat 2 (0.3..3.0s): KineticWords primary headline -> Masked Instrument Serif italic + terracotta <Underline>
  const headlineStart = Math.round(0.32 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.065 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.38 * safeFps));

  const italicStart = Math.round(0.85 * safeFps);
  const italicEnd = Math.max(italicStart + 12, Math.round(1.65 * safeFps));
  const italicProgress = interpolate(frame, [italicStart, italicEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const italicTranslateY = interpolate(italicProgress, [0, 1], [112, 0]);
  const italicOpacity = interpolate(italicProgress, [0, 0.28, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const underlineStart = Math.round(1.65 * safeFps);
  const underlineDuration = Math.max(12, Math.round(0.78 * safeFps));

  // Beat 3 (2.1..7.5s): 3D Portal QR card + 3-step student onboarding + 2s deterministic <Circle> radar rings
  const qrStart = Math.round(2.1 * safeFps);
  const qrElapsed = frame - qrStart;
  const qrSpring =
    qrElapsed >= 0
      ? spring({
          frame: qrElapsed,
          fps: safeFps,
          config: { damping: 180, stiffness: 180, mass: 1 },
        })
      : 0;
  const qrOpacity =
    qrElapsed >= 0
      ? interpolate(qrElapsed, [0, Math.max(5, Math.round(0.28 * safeFps))], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  const qrFloatY = qrOpacity > 0.001 ? Math.sin(timeSec * 1.45) * 4.5 * qrSpring : 0;
  const qrFloatRotX = qrOpacity > 0.001 ? Math.cos(timeSec * 1.1) * 0.9 * qrSpring : 0;
  const qrFloatRotY = qrOpacity > 0.001 ? Math.sin(timeSec * 0.9) * 1.15 * qrSpring : 0;

  const qrTranslateY = (1 - qrSpring) * 58 + qrFloatY;
  const qrRotateX = (1 - qrSpring) * 11 + qrFloatRotX;
  const qrRotateY = (1 - qrSpring) * -5 + qrFloatRotY;
  const qrScale = 0.90 + 0.10 * qrSpring;

  const stepBaseStart = qrStart + Math.round(0.42 * safeFps);
  const stepStagger = Math.max(4, Math.round(0.22 * safeFps));

  const radarStart = qrStart + Math.max(4, Math.round(0.32 * safeFps));
  const radarPeriod = Math.max(24, Math.round(2 * safeFps));
  const radarHalfOffset = Math.round(radarPeriod * 0.5);

  const sheenStart = Math.round(3.35 * safeFps);
  const sheenPeriod = Math.max(36, Math.round(2.15 * safeFps));
  const sheenElapsed = frame - sheenStart;
  const sheenPhase = sheenElapsed >= 0 ? (sheenElapsed % sheenPeriod) / sheenPeriod : 0;
  const sheenX = interpolate(sheenPhase, [0, 0.74, 1], [-280, 1080, 1080], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SHEEN_EASE,
  });
  const sheenOpacity =
    sheenElapsed >= 0
      ? interpolate(sheenPhase, [0, 0.16, 0.58, 0.74, 1], [0, 0.65, 0.65, 0, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }) * qrOpacity
      : 0;

  const liveDotScale = 0.84 + Math.sin(timeSec * 5.2) * 0.18;

  return (
    <>
      <EditorialBackdrop />

      <Solid
        width={safeWidth}
        height={safeHeight}
        color="rgba(46, 58, 47, 0)"
        premountFor={safeFps}
        effects={vignetteEffects}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      <CameraStage
        zoomFrom={0.98}
        zoomTo={1.03}
        panXFrom={0}
        panXTo={0}
        panYFrom={6}
        panYTo={-4}
        tiltXFrom={0.3}
        tiltXTo={-0.2}
        tiltYFrom={-0.4}
        tiltYTo={0.4}
        breathingAmplitude={0.45}
        entryZoomOffset={0.038}
        entryFrames={Math.round(0.45 * safeFps)}
        clip
      >
        {/* Beat 1: Four Symmetrical Architectural Corner L-Brackets Drawing Cleanly Inward */}
        {CORNER_BRACKETS.map((bracket) => (
          <div
            key={bracket.id}
            style={{
              position: 'absolute',
              width: 96,
              height: 96,
              pointerEvents: 'none',
              ...bracket.posStyle,
              transform: `translate3d(${(bracket.slideXSign * bracketSlidePx).toFixed(2)}px, ${(bracket.slideYSign * bracketSlidePx).toFixed(2)}px, 0px)`,
            }}
          >
            <EvolvingPath
              d={bracket.d}
              width={96}
              height={96}
              startFrame={bracketStart}
              durationFrames={bracketDuration}
              stroke={LAUNCH_PALETTE.SECONDARY}
              strokeWidth={2.5}
              strokeLinecap="square"
              strokeLinejoin="miter"
              headDotColor={LAUNCH_PALETTE.ACCENT}
              headDotRadius={4.5}
              hideDotWhenComplete
            />
            <span
              style={{
                position: 'absolute',
                width: 6,
                height: 6,
                borderRadius: 999,
                backgroundColor: LAUNCH_PALETTE.ACCENT,
                opacity: bracketDotOpacity,
                ...bracket.dotPosStyle,
              }}
            />
          </div>
        ))}

        {/* Centered Editorial Vault Stack */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: '94px 128px 86px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            textAlign: 'center',
            fontFamily: LAUNCH_FONTS.DISPLAY,
          }}
        >
          {/* Beat 1: Crest Pill Springs Open */}
          <Interactive.Div
            name="Closing Crest Pill"
            premountFor={safeFps}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 26px',
              borderRadius: 999,
              backgroundColor: LAUNCH_PALETTE.CARD_BG,
              border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
              boxShadow: '0 14px 32px rgba(46, 58, 47, 0.08)',
              opacity: pillOpacity,
              willChange: 'transform, opacity',
              transform: `scale(${pillScaleX.toFixed(4)}, ${pillScaleY.toFixed(4)})`,
            }}
          >
            <CanvasImage
              name="Closing JPP Crest"
              src={staticFile('jpp-logo.png')}
              premountFor={safeFps}
              style={{ width: 32, height: 32, objectFit: 'contain' }}
            />
            <span
              style={{
                fontSize: 15.5,
                fontWeight: 800,
                letterSpacing: '0.16em',
                color: LAUNCH_PALETTE.PRIMARY,
                whiteSpace: 'nowrap',
              }}
            >
              JPP POLISAS • EKOSISTEM DIGITAL MAHASISWA
            </span>
          </Interactive.Div>

          {/* Beat 2: KineticWords Primary Headline + Masked Italic Glide + Terracotta <Underline> */}
          <Interactive.Div
            name="Closing Title Lockup"
            premountFor={safeFps}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              overflow: 'visible',
              maxWidth: 1640,
            }}
          >
            <KineticWords
              as="h1"
              text={safeHeadlinePrimary}
              startFrame={headlineStart}
              staggerFrames={wordStagger}
              wordDurationFrames={wordDuration}
              accentWords={['Imbas', 'Sekarang.']}
              accentColor={LAUNCH_PALETTE.ACCENT}
              align="center"
              style={{
                margin: 0,
                fontSize: 56,
                fontWeight: 900,
                letterSpacing: '-0.035em',
                lineHeight: 1.06,
                color: LAUNCH_PALETTE.PRIMARY,
              }}
            />

            <div
              style={{
                marginTop: 10,
                overflow: italicProgress >= 0.999 ? 'visible' : 'hidden',
                padding: '6px 34px 20px 28px',
                marginLeft: -28,
                marginRight: -34,
                marginBottom: -20,
              }}
            >
              <div
                style={{
                  willChange: 'transform, opacity',
                  opacity: italicOpacity,
                  transform: `translate3d(0px, ${italicTranslateY.toFixed(2)}%, 0px)`,
                  overflow: 'visible',
                }}
              >
                <EditorialAnnotation
                  type="underline"
                  startFrame={underlineStart}
                  durationFrames={underlineDuration}
                  color={LAUNCH_PALETTE.ACCENT}
                  strokeWidth={4}
                  padding={5}
                  iterations={2}
                  seed={31}
                  style={{ display: 'inline-block', overflow: 'visible' }}
                >
                  <p
                    style={{
                      margin: 0,
                      paddingRight: 12,
                      fontFamily: LAUNCH_FONTS.SERIF_ITALIC,
                      fontStyle: 'italic',
                      fontSize: 54,
                      lineHeight: 1.1,
                      color: LAUNCH_PALETTE.ACCENT,
                    }}
                  >
                    {safeHeadlineItalic}
                  </p>
                </EditorialAnnotation>
              </div>
            </div>
          </Interactive.Div>

          {/* Beat 3: 3D Portal QR Card + 3 Onboarding Steps + Continuous Breathing Radar Rings */}
          <div
            style={{
              marginTop: 10,
              perspective: '1600px',
              transformStyle: 'preserve-3d',
              overflow: 'visible',
            }}
          >
            <Interactive.Div
              name="Official Portal QR Card"
              premountFor={safeFps}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 40,
                padding: '30px 44px',
                borderRadius: 28,
                backgroundColor: LAUNCH_PALETTE.CARD_BG,
                border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
                boxShadow: '0 28px 64px rgba(46, 58, 47, 0.14)',
                opacity: qrOpacity,
                visibility: qrOpacity <= 0.001 ? 'hidden' : 'visible',
                transformStyle: 'preserve-3d',
                willChange: 'transform, opacity',
                transform: `translate3d(0px, ${qrTranslateY.toFixed(2)}px, 0px) rotateX(${qrRotateX.toFixed(2)}deg) rotateY(${qrRotateY.toFixed(2)}deg) scale(${qrScale.toFixed(4)})`,
              }}
            >
              {/* Inner Clipped Layer for Diagonal Sheen Glide */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 26,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  zIndex: 4,
                }}
              >
                {sheenOpacity > 0.005 ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-45%',
                      left: 0,
                      width: 210,
                      height: '190%',
                      opacity: sheenOpacity,
                      background:
                        'linear-gradient(90deg, rgba(217, 201, 178, 0) 0%, rgba(217, 201, 178, 0.34) 48%, rgba(248, 246, 238, 0.52) 55%, rgba(217, 201, 178, 0) 100%)',
                      transform: `translate3d(${sheenX.toFixed(2)}px, 0px, 0px) rotate(24deg)`,
                      pointerEvents: 'none',
                    }}
                  />
                ) : null}
              </div>

              {/* Left: QR Box with Continuous 2-Second Breathing Concentric Radar Rings */}
              <div
                style={{
                  position: 'relative',
                  width: 204,
                  height: 204,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                {/* Static subtle orbit hairline */}
                <Circle
                  radius={108}
                  fill="none"
                  stroke="rgba(201, 111, 79, 0.16)"
                  strokeWidth={1.25}
                  premountFor={safeFps}
                  showInTimeline={false}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    opacity: qrOpacity,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Two staggered deterministic 2-second breathing radar rings */}
                {[0, 1].map((ringIdx) => {
                  const ringElapsed = frame - radarStart - ringIdx * radarHalfOffset;
                  if (ringElapsed < 0) return null;
                  const cycleT = (ringElapsed % radarPeriod) / radarPeriod;
                  const ringScale = interpolate(cycleT, [0, 1], [0.84, 1.26], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                    easing: RADAR_EASE,
                  });
                  const ringOpacity =
                    interpolate(cycleT, [0, 0.16, 0.68, 1], [0, 0.68, 0.22, 0], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    }) * qrOpacity;

                  return (
                    <Circle
                      key={`qr-radar-${ringIdx}`}
                      radius={104}
                      fill="none"
                      stroke={ringIdx === 0 ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.SECONDARY}
                      strokeWidth={2.2}
                      vectorEffect="non-scaling-stroke"
                      premountFor={safeFps}
                      showInTimeline={false}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        opacity: ringOpacity,
                        transform: `translate(-50%, -50%) scale(${ringScale.toFixed(4)})`,
                        pointerEvents: 'none',
                      }}
                    />
                  );
                })}

                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    padding: 15,
                    borderRadius: 18,
                    backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                    border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    boxShadow: '0 8px 20px rgba(46, 58, 47, 0.08)',
                  }}
                >
                  <QRCode
                    value={safePortalUrl}
                    size={172}
                    fgColor={LAUNCH_PALETTE.PRIMARY}
                    bgColor={LAUNCH_PALETTE.BACKGROUND}
                  />
                </div>
              </div>

              {/* Right: Student QR Onboarding Copy & 3 Steps */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  textAlign: 'left',
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
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '0.16em',
                    color: LAUNCH_PALETTE.SECONDARY,
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
                  <span>IMBAS UNTUK AKSES SERTA-MERTA</span>
                </div>

                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 900,
                    lineHeight: 1.08,
                    letterSpacing: '-0.02em',
                    color: LAUNCH_PALETTE.PRIMARY,
                  }}
                >
                  {displayDomain}
                </span>

                {/* 3 Clear Student Onboarding Steps with Staggered Spring Reveal */}
                <div
                  style={{
                    marginTop: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 7,
                  }}
                >
                  {ONBOARDING_STEPS.map((step, idx) => {
                    const stepStart = stepBaseStart + idx * stepStagger;
                    const stepElapsed = frame - stepStart;
                    const stepSpring =
                      stepElapsed >= 0
                        ? spring({
                            frame: stepElapsed,
                            fps: safeFps,
                            config: { damping: 180, stiffness: 220, mass: 0.9 },
                          })
                        : 0;
                    const stepOpacity =
                      stepElapsed >= 0
                        ? interpolate(stepElapsed, [0, Math.max(4, Math.round(0.16 * safeFps))], [0, 1], {
                            extrapolateLeft: 'clamp',
                            extrapolateRight: 'clamp',
                          })
                        : 0;
                    const stepTranslateX = (1 - stepSpring) * 18;
                    const isFinalStep = idx === ONBOARDING_STEPS.length - 1;

                    return (
                      <div
                        key={step.code}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 11,
                          padding: '7px 14px',
                          borderRadius: 12,
                          backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                          border: `1px solid ${
                            isFinalStep ? 'rgba(201, 111, 79, 0.42)' : LAUNCH_PALETTE.TERTIARY
                          }`,
                          opacity: stepOpacity,
                          visibility: stepOpacity <= 0.001 ? 'hidden' : 'visible',
                          willChange: 'transform, opacity',
                          transform: `translate3d(${stepTranslateX.toFixed(2)}px, 0px, 0px)`,
                        }}
                      >
                        <span
                          style={{
                            minWidth: 28,
                            height: 22,
                            padding: '0 7px',
                            borderRadius: 999,
                            backgroundColor: isFinalStep
                              ? LAUNCH_PALETTE.ACCENT
                              : LAUNCH_PALETTE.PRIMARY,
                            color: LAUNCH_PALETTE.BACKGROUND,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11,
                            fontWeight: 900,
                            letterSpacing: '0.06em',
                            flexShrink: 0,
                          }}
                        >
                          {step.code}
                        </span>
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            letterSpacing: '-0.01em',
                            color: LAUNCH_PALETTE.PRIMARY,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Live Pulsing Student Status Pill */}
                <div
                  style={{
                    marginTop: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    alignSelf: 'flex-start',
                    padding: '7px 15px',
                    borderRadius: 999,
                    backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                    border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 11.5,
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: LAUNCH_PALETTE.PRIMARY,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: LAUNCH_PALETTE.SECONDARY,
                      transform: `scale(${liveDotScale.toFixed(3)})`,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  <span>PERCUMA UNTUK SEMUA PELAJAR POLISAS • 24/7</span>
                </div>
              </div>
            </Interactive.Div>
          </div>
        </div>
      </CameraStage>

      <EditorialFrameMarks
        chapterCode="08"
        chapterLabel="AKSES SERTA-MERTA • IMBAS QR SEKARANG"
      />
    </>
  );
};

const closingVaultSchema = {
  headlinePrimary: { type: 'string', default: CLOSING_HEADLINE_DEFAULT, description: 'Closing Line 1' },
  headlineItalic: { type: 'string', default: CLOSING_ITALIC_DEFAULT, description: 'Closing Italic Line' },
  portalUrl: { type: 'string', default: 'https://jpp.polisas.edu.my', description: 'Portal QR URL' },
} as const satisfies InteractivitySchema;

export const ClosingVaultScene = Interactive.withSchema({
  Component: ClosingVaultInner,
  componentName: 'ClosingVaultScene',
  schema: closingVaultSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
