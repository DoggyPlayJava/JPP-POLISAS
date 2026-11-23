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
import { CheckCircle2, Smartphone } from 'lucide-react';
import QRCode from 'react-qr-code';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticWords } from '../motion/KineticTypography';
import { EvolvingPath } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE } from '../tokens';
import { SpatialFloorGrid } from '../ui/KineticCard';

type ClosingVaultProps = {
  readonly headlinePrimary: string;
  readonly headlineItalic: string;
  readonly portalUrl: string;
  readonly studentsCount?: number;
};

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const RADAR_EASE = Easing.bezier(0.22, 1, 0.36, 1);

const EMERALD = LAUNCH_MODULE_THEMES.polymaps.primary; // #10B981
const EMERALD_INK = '#047857';
const EMERALD_SOFT = LAUNCH_MODULE_THEMES.polymaps.soft; // #ECFDF5
const EMERALD_BORDER = LAUNCH_MODULE_THEMES.polymaps.border; // #A7F3D0
const ROYAL_BLUE = LAUNCH_MODULE_THEMES.kelab.primary; // #3B82F6

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
  { code: '01', label: 'Buka Kamera Telefon', sub: 'Halakan terus ke skrin LED' },
  { code: '02', label: 'Imbas Kod QR Ini', sub: 'Fokus automatik jarak jauh' },
  { code: '03', label: 'Log Masuk & Teroka', sub: 'Akses semua modul kampus' },
] as const;

const MODULE_SPECTRUM_LIST = [
  { label: 'PolyMaps', color: LAUNCH_MODULE_THEMES.polymaps.primary },
  { label: 'Takwim', color: LAUNCH_MODULE_THEMES.takwim.primary },
  { label: 'PolyMart', color: LAUNCH_MODULE_THEMES.polymart.primary },
  { label: 'PolyRent', color: LAUNCH_MODULE_THEMES.polyrent.primary },
  { label: 'PolySuara', color: LAUNCH_MODULE_THEMES.polysuara.primary },
  { label: 'E-Kebajikan', color: LAUNCH_MODULE_THEMES.kebajikan.primary },
  { label: 'Food Bank', color: LAUNCH_MODULE_THEMES.foodbank.primary },
  { label: 'Kelab & Merit', color: LAUNCH_MODULE_THEMES.meritQr.primary },
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
    posStyle: { left: 108, top: 96 },
    slideXSign: -1,
    slideYSign: -1,
    dotPosStyle: { left: 9, top: 9 },
  },
  {
    id: 'tr',
    d: 'M 84 84 L 84 12 L 12 12',
    posStyle: { right: 108, top: 96 },
    slideXSign: 1,
    slideYSign: -1,
    dotPosStyle: { right: 9, top: 9 },
  },
  {
    id: 'bl',
    d: 'M 12 12 L 12 84 L 84 84',
    posStyle: { left: 108, bottom: 96 },
    slideXSign: -1,
    slideYSign: 1,
    dotPosStyle: { left: 9, bottom: 9 },
  },
  {
    id: 'br',
    d: 'M 84 12 L 84 84 L 12 84',
    posStyle: { right: 108, bottom: 96 },
    slideXSign: 1,
    slideYSign: 1,
    dotPosStyle: { right: 9, bottom: 9 },
  },
];

const RADAR_RING_SPECS = [
  { color: LAUNCH_PALETTE.ACCENT, strokeWidth: 2.8, radius: 195 },
  { color: EMERALD, strokeWidth: 2.4, radius: 195 },
  { color: ROYAL_BLUE, strokeWidth: 2.2, radius: 195 },
] as const;

const ClosingVaultInner: React.FC<ClosingVaultProps> = ({
  headlinePrimary,
  headlineItalic,
  portalUrl,
  studentsCount = 1083,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeWidth = Math.max(1, Math.round(Number.isFinite(width) ? width : 1920));
  const safeHeight = Math.max(1, Math.round(Number.isFinite(height) ? height : 1080));
  const safeStudents =
    typeof studentsCount === 'number' && Number.isFinite(studentsCount)
      ? Math.max(1, Math.round(studentsCount))
      : 1083;
  const safeHeadlinePrimary = resolveClosingPrimary(headlinePrimary);
  const safeHeadlineItalic = resolveClosingItalic(headlineItalic);
  const safePortalUrl = portalUrl.trim() || 'https://jpp.polisas.edu.my';
  const displayDomain = safePortalUrl.replace(/^https?:\/\//, '');

  const timeSec = frame / safeFps;

  // Tasteful Deep Forest vignette keeping LED stage focus dead-center without dark muddiness
  const vignetteEffects = useMemo(
    () => [vignette({ amount: 0.24, color: LAUNCH_PALETTE.PRIMARY_DARK })],
    [],
  );

  // Beat 1 (0..1.3s): Background L-brackets & Crest Pill
  const bracketStart = Math.round(0.06 * safeFps);
  const bracketDuration = Math.max(18, Math.round(0.95 * safeFps));
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
  const pillSpring = spring({
    frame,
    fps: safeFps,
    config: { damping: 180, stiffness: 220, mass: 0.9 },
  });
  const pillScaleX = 0.86 + 0.14 * pillSpring;
  const pillScaleY = 0.94 + 0.06 * pillSpring;
  const pillOpacity = interpolate(frame - pillStart, [0, Math.max(4, Math.round(0.16 * safeFps))], [0.45, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Beat 2 (0.15..1.5s): KineticWords Primary + Italic Headline with Terracotta Underline
  const headlineStart = Math.round(0.18 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.05 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.32 * safeFps));

  const italicStart = Math.round(0.55 * safeFps);
  const italicEnd = Math.max(italicStart + 10, Math.round(1.15 * safeFps));
  const italicProgress = interpolate(frame, [italicStart, italicEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const italicTranslateY = interpolate(italicProgress, [0, 1], [108, 0]);
  const italicOpacity = interpolate(italicProgress, [0, 0.25, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const underlineStart = Math.round(1.12 * safeFps);
  const underlineDuration = Math.max(12, Math.round(0.62 * safeFps));

  // Center Hero QR Monolith: Dramatic 3D Entry (0.70s..1.80s), then STRICT 0.00deg Orthogonal Lock (1.80s..7.50s)
  const qrEntryStart = Math.round(0.7 * safeFps); // 42f
  const qrLockFrame = Math.round(1.8 * safeFps); // 108f -> strictly 0deg from f>=108 through 450 (incl. f=2760 / Local 270)!
  const qrOpacity = interpolate(
    frame,
    [qrEntryStart, qrEntryStart + Math.max(6, Math.round(0.24 * safeFps))],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const qrEntryProgress = interpolate(frame, [qrEntryStart, qrLockFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const isQrOrthogonalLocked = frame >= qrLockFrame;
  const qrRotateX = isQrOrthogonalLocked ? 0 : interpolate(qrEntryProgress, [0, 1], [26, 0]);
  const qrRotateY = isQrOrthogonalLocked ? 0 : interpolate(qrEntryProgress, [0, 1], [-18, 0]);
  const qrTranslateY = isQrOrthogonalLocked ? 0 : interpolate(qrEntryProgress, [0, 1], [60, 0]);
  const qrScale = isQrOrthogonalLocked ? 1 : interpolate(qrEntryProgress, [0, 1], [0.8, 1]);

  // Autofocus Corner Brackets breathe subtly OUTSIDE white 28px QR quiet zone
  const bracketPulseScale = 1 + Math.sin(timeSec * 3.1) * 0.018;
  const bracketPulseOpacity = 0.78 + Math.sin(timeSec * 3.1) * 0.2;

  // Flanking Symmetrical Upright Satellite Cards (0.00deg resting tilt aligned with QR monolith)
  const satStart = Math.round(1.25 * safeFps); // 75f
  const satSpring =
    frame >= satStart
      ? spring({
          frame: frame - satStart,
          fps: safeFps,
          config: { damping: 16, stiffness: 205, mass: 0.92 },
        })
      : 0;
  const satOpacity =
    frame >= satStart
      ? interpolate(frame, [satStart, satStart + Math.round(0.22 * safeFps)], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;
  const satRiseY = (1 - satSpring) * 28;
  const satScale = 0.94 + 0.06 * satSpring;

  const stepBaseStart = satStart + Math.round(0.24 * safeFps);
  const stepStagger = Math.max(4, Math.round(0.18 * safeFps));

  // 3D Floor Radar Waves (rotating plane tilted at rotateX(62deg) inside CameraStage)
  const radarStart = Math.round(0.9 * safeFps);
  const radarPeriod = Math.max(36, Math.round(2.4 * safeFps));

  const liveDotScale = 0.84 + Math.sin(timeSec * 5.2) * 0.18;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.closing.tint} />

      <Solid
        width={safeWidth}
        height={safeHeight}
        color="rgba(46, 58, 47, 0)"
        premountFor={safeFps}
        effects={vignetteEffects}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* Luminous Center Spotlight Halo behind Center QR Monolith */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 60%, rgba(255, 255, 255, 0.92) 0%, rgba(248, 246, 238, 0.45) 34%, rgba(248, 246, 238, 0) 64%)',
          pointerEvents: 'none',
        }}
      />

      {/* LAYER A: Background 3D Spatial Floor Grid, Tilted Radar Dish & L-Brackets inside <CameraStage> */}
      <CameraStage
        zoomFrom={0.99}
        zoomTo={1.03}
        panXFrom={0}
        panXTo={0}
        panYFrom={4}
        panYTo={-4}
        tiltXFrom={1.5}
        tiltXTo={-0.5}
        tiltYFrom={-0.6}
        tiltYTo={0.6}
        breathingAmplitude={0.4}
        entryZoomOffset={0.032}
        entryFrames={Math.round(0.42 * safeFps)}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            perspective: '1500px',
            transformStyle: 'preserve-3d',
          }}
        >
          <SpatialFloorGrid
            accentColor={LAUNCH_PALETTE.ACCENT}
            secondaryColor={EMERALD}
            gridOpacity={0.24}
            scrollSpeed={12}
          />

          {/* 3D Tilted Concentric Holographic Radar Dish beneath QR Monolith */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              top: '68%',
              width: 920,
              height: 920,
              transform: 'translate(-50%, -50%) translateZ(-80px) rotateX(62deg)',
              transformStyle: 'preserve-3d',
              pointerEvents: 'none',
            }}
          >
            <Circle
              radius={360}
              fill="none"
              stroke="rgba(201, 111, 79, 0.22)"
              strokeWidth={1.6}
              premountFor={safeFps}
              showInTimeline={false}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: qrOpacity,
              }}
            />

            {RADAR_RING_SPECS.map((ring, idx) => {
              const ringOffset = Math.round((radarPeriod / RADAR_RING_SPECS.length) * idx);
              const ringElapsed = frame - radarStart - ringOffset;
              if (ringElapsed < 0) return null;
              const cycleT = (ringElapsed % radarPeriod) / radarPeriod;
              const ringScale = interpolate(cycleT, [0, 1], [0.75, 2.05], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: RADAR_EASE,
              });
              const ringOpacity =
                interpolate(cycleT, [0, 0.14, 0.72, 1], [0, 0.72, 0.26, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }) * qrOpacity;

              return (
                <Circle
                  key={`floor-radar-${idx}`}
                  radius={ring.radius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={ring.strokeWidth}
                  vectorEffect="non-scaling-stroke"
                  premountFor={safeFps}
                  showInTimeline={false}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    opacity: ringOpacity,
                    transform: `translate(-50%, -50%) scale(${ringScale.toFixed(4)})`,
                  }}
                />
              );
            })}
          </div>

          {/* 4 Symmetrical Architectural Corner L-Brackets */}
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
        </div>
      </CameraStage>

      {/* LAYER B: Foreground Hero Stage OUTSIDE Tilting CameraStage so QR Monolith Locks Strictly Flat 0.00deg */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          fontFamily: LAUNCH_FONTS.DISPLAY,
        }}
      >
        {/* Top Crest Pill & Headline Lockup */}
        <div
          style={{
            position: 'absolute',
            left: 88,
            right: 88,
            top: 56,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Interactive.Div
            name="Closing Crest Pill"
            premountFor={safeFps}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 22px',
              borderRadius: 999,
              backgroundColor: LAUNCH_PALETTE.CARD_BG,
              border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
              boxShadow: '0 12px 28px rgba(46, 58, 47, 0.08)',
              opacity: pillOpacity,
              transform: `scale(${pillScaleX.toFixed(4)}, ${pillScaleY.toFixed(4)})`,
            }}
          >
            <CanvasImage
              name="Closing JPP Crest"
              src={staticFile('jpp-logo.png')}
              premountFor={safeFps}
              style={{ width: 28, height: 28, objectFit: 'contain' }}
            />
            <span
              style={{
                fontSize: 14.5,
                fontWeight: 800,
                letterSpacing: '0.16em',
                color: LAUNCH_PALETTE.PRIMARY,
                whiteSpace: 'nowrap',
              }}
            >
              JPP POLISAS • EKOSISTEM DIGITAL MAHASISWA
            </span>
          </Interactive.Div>

          <Interactive.Div
            name="Closing Title Lockup"
            premountFor={safeFps}
            style={{
              marginTop: 12,
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
                fontSize: 48,
                fontWeight: 900,
                letterSpacing: '-0.035em',
                lineHeight: 1.05,
                color: LAUNCH_PALETTE.PRIMARY,
              }}
            />

            <div
              style={{
                marginTop: 6,
                overflow: italicProgress >= 0.999 ? 'visible' : 'hidden',
                padding: '4px 32px 16px 26px',
                marginLeft: -26,
                marginRight: -32,
                marginBottom: -16,
              }}
            >
              <div
                style={{
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
                  strokeWidth={3.8}
                  padding={4}
                  iterations={2}
                  seed={31}
                  style={{ display: 'inline-block', overflow: 'visible' }}
                >
                  <p
                    style={{
                      margin: 0,
                      paddingRight: 10,
                      fontFamily: LAUNCH_FONTS.SERIF_ITALIC,
                      fontStyle: 'italic',
                      fontSize: 40,
                      lineHeight: 1.08,
                      color: LAUNCH_PALETTE.ACCENT,
                    }}
                  >
                    {safeHeadlineItalic}
                  </p>
                </EditorialAnnotation>
              </div>
            </div>
          </Interactive.Div>
        </div>

        {/* 3-Piece Symmetrical Upright LED Spotlight Triad: Left Upright Card + Center 340px Hero QR (0.00deg) + Right Upright Card */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 258,
            height: 706,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 44,
          }}
        >
          {/* LEFT UPRIGHT COMPANION CARD: 3 Langkah Mula + Status Pill */}
          <Interactive.Div
            name="Left Upright Onboarding Card"
            premountFor={safeFps}
            style={{
              width: 422,
              padding: '24px 26px',
              borderRadius: 26,
              backgroundColor: LAUNCH_PALETTE.CARD_BG,
              border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
              borderBottom: `6px solid ${LAUNCH_PALETTE.SECONDARY}`,
              boxShadow: '0 26px 56px rgba(46, 58, 47, 0.14)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              opacity: satOpacity,
              transform: `translate3d(0px, ${satRiseY.toFixed(2)}px, 0px) scale(${satScale.toFixed(4)})`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11.5,
                  fontWeight: 900,
                  letterSpacing: '0.13em',
                  color: EMERALD_INK,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: EMERALD,
                    transform: `scale(${liveDotScale.toFixed(3)})`,
                  }}
                />
                <span>IMBAS UNTUK AKSES SERTA-MERTA</span>
              </div>
              <Smartphone size={16} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                const isFinalStep = idx === ONBOARDING_STEPS.length - 1;

                return (
                  <div
                    key={step.code}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 14,
                      backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                      border: `1.5px solid ${
                        isFinalStep ? 'rgba(201, 111, 79, 0.5)' : LAUNCH_PALETTE.TERTIARY
                      }`,
                      opacity: stepOpacity,
                      transform: `translate3d(${((1 - stepSpring) * -16).toFixed(2)}px, 0px, 0px)`,
                    }}
                  >
                    <span
                      style={{
                        minWidth: 30,
                        height: 24,
                        padding: '0 8px',
                        borderRadius: 999,
                        backgroundColor: isFinalStep
                          ? LAUNCH_PALETTE.ACCENT
                          : LAUNCH_PALETTE.PRIMARY,
                        color: '#FFFFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 900,
                      }}
                    >
                      {step.code}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 15.5, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                        {step.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: LAUNCH_PALETTE.INK_SOFT }}>
                        {step.sub}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 14px',
                borderRadius: 999,
                backgroundColor: EMERALD_SOFT,
                border: `1.5px solid ${EMERALD_BORDER}`,
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.09em',
                color: EMERALD_INK,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: EMERALD,
                  transform: `scale(${liveDotScale.toFixed(3)})`,
                  flexShrink: 0,
                }}
              />
              <span>PERCUMA UNTUK SEMUA PELAJAR POLISAS • 24/7</span>
            </div>
          </Interactive.Div>

          {/* CENTER HERO QR MONOLITH: Enters in 3D, then Locks Flat 0.00deg with 340x340px Pure White/Black Contrast */}
          <Interactive.Div
            name="LED Wall Hero QR Monolith"
            premountFor={safeFps}
            style={{
              position: 'relative',
              width: 472,
              borderRadius: 30,
              backgroundColor: '#FFFFFF',
              border: `2.5px solid ${LAUNCH_PALETTE.PRIMARY}`,
              boxShadow:
                '0 44px 96px rgba(31, 39, 32, 0.24), 0 0 68px rgba(255, 255, 255, 0.95)',
              padding: '24px 28px 22px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              opacity: qrOpacity,
              boxSizing: 'border-box',
              overflow: 'hidden',
              transform: isQrOrthogonalLocked
                ? 'none'
                : `translate3d(0px, ${qrTranslateY.toFixed(2)}px, 0px) rotateX(${qrRotateX.toFixed(2)}deg) rotateY(${qrRotateY.toFixed(2)}deg) scale(${qrScale.toFixed(4)})`,
            }}
          >
            {/* Top 6px 8-Module Color Spectrum Accent Ribbon */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 6,
                display: 'flex',
              }}
            >
              {MODULE_SPECTRUM_LIST.map((mod) => (
                <span key={mod.label} style={{ flex: 1, height: '100%', backgroundColor: mod.color }} />
              ))}
            </div>

            {/* Top LED Scan Prompt Pill */}
            <div
              style={{
                marginTop: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 16px',
                borderRadius: 999,
                backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                color: '#FFFFFF',
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '0.13em',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: EMERALD,
                  transform: `scale(${liveDotScale.toFixed(3)})`,
                }}
              />
              <span>IMBAS QR DI SKRIN LED SEKARANG</span>
            </div>

            {/* Pure White 28px Quiet Zone Target Frame + 340x340px Maximum Contrast QRCode */}
            <div
              style={{
                position: 'relative',
                width: 396,
                height: 396,
                padding: 28,
                borderRadius: 22,
                backgroundColor: '#FFFFFF',
                border: '1.5px solid rgba(46, 58, 47, 0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              <QRCode
                value={safePortalUrl}
                size={340}
                fgColor="#111812"
                bgColor="#FFFFFF"
                level="M"
              />

              {/* 4 Camera-Autofocus Corner Brackets OUTSIDE Quiet Zone (never cover QR finder patterns) */}
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: -7,
                  opacity: bracketPulseOpacity,
                  transform: `scale(${bracketPulseScale.toFixed(4)})`,
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: 32,
                    height: 32,
                    borderTop: `4.5px solid ${EMERALD_INK}`,
                    borderLeft: `4.5px solid ${EMERALD_INK}`,
                    borderTopLeftRadius: 12,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: 32,
                    height: 32,
                    borderTop: `4.5px solid ${LAUNCH_PALETTE.ACCENT}`,
                    borderRight: `4.5px solid ${LAUNCH_PALETTE.ACCENT}`,
                    borderTopRightRadius: 12,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    bottom: 0,
                    width: 32,
                    height: 32,
                    borderBottom: `4.5px solid ${LAUNCH_PALETTE.ACCENT}`,
                    borderLeft: `4.5px solid ${LAUNCH_PALETTE.ACCENT}`,
                    borderBottomLeftRadius: 12,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: 32,
                    height: 32,
                    borderBottom: `4.5px solid ${EMERALD_INK}`,
                    borderRight: `4.5px solid ${EMERALD_INK}`,
                    borderBottomRightRadius: 12,
                  }}
                />
              </div>
            </div>

            {/* Bottom High-Contrast Portal URL Display */}
            <div
              style={{
                width: '100%',
                padding: '10px 18px',
                borderRadius: 16,
                backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                textAlign: 'center',
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  color: '#111812',
                }}
              >
                {displayDomain}
              </span>
            </div>
          </Interactive.Div>

          {/* RIGHT UPRIGHT COMPANION CARD: 8-Module Spectrum Checklist + Live Student Proof */}
          <Interactive.Div
            name="Right Upright Modules Card"
            premountFor={safeFps}
            style={{
              width: 422,
              padding: '24px 26px',
              borderRadius: 26,
              backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
              border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
              borderBottom: `6px solid ${LAUNCH_PALETTE.ACCENT}`,
              boxShadow: '0 26px 56px rgba(31, 39, 32, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              opacity: satOpacity,
              transform: `translate3d(0px, ${satRiseY.toFixed(2)}px, 0px) scale(${satScale.toFixed(4)})`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11.5,
                  fontWeight: 900,
                  letterSpacing: '0.13em',
                  color: LAUNCH_PALETTE.TERTIARY,
                }}
              >
                8 MODUL DALAM 1 PORTAL
              </span>
              <span
                style={{
                  padding: '3px 9px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  border: `1px solid ${EMERALD}`,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: EMERALD_BORDER,
                }}
              >
                AKTIF
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 9 }}>
              {MODULE_SPECTRUM_LIST.map((mod) => (
                <div
                  key={mod.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 11px',
                    borderRadius: 12,
                    backgroundColor: 'rgba(248, 246, 238, 0.08)',
                    border: '1px solid rgba(217, 201, 178, 0.2)',
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 999,
                      backgroundColor: mod.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
                    {mod.label}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 14,
                backgroundColor: EMERALD_INK,
                border: `1px solid ${EMERALD_BORDER}`,
                color: '#FFFFFF',
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 12.5,
                fontWeight: 900,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <CheckCircle2 size={15} color={EMERALD_BORDER} strokeWidth={2.5} />
                <span>{safeStudents.toLocaleString('en-US')}+ Pelajar Dah Akses</span>
              </span>
              <span>✓</span>
            </div>
          </Interactive.Div>
        </div>
      </div>

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
  studentsCount: {
    type: 'number',
    default: 1083,
    min: 1,
    max: 50000,
    integer: true,
    hiddenFromList: false,
    description: 'Active Students Count',
  },
} as const satisfies InteractivitySchema;

export const ClosingVaultScene = Interactive.withSchema({
  Component: ClosingVaultInner,
  componentName: 'ClosingVaultScene',
  schema: closingVaultSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
