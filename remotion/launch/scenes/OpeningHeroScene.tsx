import React from 'react';
import {
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  interpolateColors,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import {
  CalendarDays,
  HeartHandshake,
  Home,
  Landmark,
  Map as MapIcon,
  MapPin,
  Megaphone,
  QrCode,
  Search,
  UtensilsCrossed,
} from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { EvolvingPath, GhostCursor, type GhostCursorKeyframe } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';
import {
  ExplodedLayer,
  KineticWindow,
  LiveTypewriterText,
} from '../ui/KineticCard';

export type OpeningHeroProps = {
  readonly institutionName: string;
  readonly sessionLabel: string;
  readonly headlinePrimary: string;
};

// Fixed 1920x1080 SuperApp window geometry for exact GhostCursor and portalZoomMorph alignment
const WINDOW_WIDTH = 1160;
const WINDOW_HEIGHT = 722;
const WINDOW_LEFT = (1920 - WINDOW_WIDTH) / 2; // 380
const WINDOW_TOP = 256;
const WINDOW_BORDER = 1.5;
const WINDOW_TOPBAR_H = 40;
const HEADER_BAND_H = 186;
const BODY_PAD_TOP = 18;
const BODY_PAD_X = 28;
const NEXT_CLASS_BAR_H = 82;
const BODY_GAP = 16;
const GRID_GAP = 16;
const TILE_HEIGHT = 170;

const BODY_INNER_W = WINDOW_WIDTH - WINDOW_BORDER * 2 - BODY_PAD_X * 2; // 1101
const COL_WIDTH = (BODY_INNER_W - GRID_GAP * 3) / 4; // 263.25
const POLYMAPS_RAW_X =
  WINDOW_LEFT + WINDOW_BORDER + BODY_PAD_X + 3 * (COL_WIDTH + GRID_GAP) + COL_WIDTH / 2; // 1378.875
const POLYMAPS_RAW_Y =
  WINDOW_TOP +
  WINDOW_BORDER +
  WINDOW_TOPBAR_H +
  HEADER_BAND_H +
  BODY_PAD_TOP +
  NEXT_CLASS_BAR_H +
  BODY_GAP +
  64; // 663.5 — inside the 70x70 PolyMaps squircle well, cleanly above label text

// Account for the settled 3deg rotateX tilt around the KineticWindow midpoint in 1800px perspective
const WINDOW_CENTER_Y = WINDOW_TOP + WINDOW_HEIGHT / 2; // 617
const POLYMAPS_DY = POLYMAPS_RAW_Y - WINDOW_CENTER_Y;
const TILT_RAD = (3 * Math.PI) / 180;
const TILT_PERSPECTIVE = 1800 / (1800 + POLYMAPS_DY * Math.sin(TILT_RAD));

const POLYMAPS_CENTER_X = Number(
  (960 + (POLYMAPS_RAW_X - 960) * TILT_PERSPECTIVE).toFixed(2),
);
const POLYMAPS_CENTER_Y = Number(
  (WINDOW_CENTER_Y + POLYMAPS_DY * Math.cos(TILT_RAD) * TILT_PERSPECTIVE).toFixed(2),
);

/**
 * Exact 1920x1080 percentage center of the PolyMaps squircle (Row 1, Col 4)
 * so JppLaunchCinema's `portalZoomMorph` locks straight onto the clicked tile.
 */
export const PORTAL_POLYMAPS_ORIGIN = {
  xPercent: Number(((POLYMAPS_CENTER_X / 1920) * 100).toFixed(2)),
  yPercent: Number(((POLYMAPS_CENTER_Y / 1080) * 100).toFixed(2)),
} as const;

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const CLICK_LIFT_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const MORPH_RAMP_EASE = Easing.bezier(0.42, 0, 1, 0.65);

type ServiceTileSpec = {
  readonly id: string;
  readonly label: string;
  readonly sublabel: string;
  readonly badge?: string;
  readonly iconKind:
    | 'polysuara'
    | 'polymart'
    | 'takwim'
    | 'polymaps'
    | 'polyrent'
    | 'kebajikan'
    | 'scan_qr'
    | 'ekpp';
};

const CAMPUS_SERVICE_TILES: readonly ServiceTileSpec[] = [
  { id: 'polysuara', label: 'PolySuara', sublabel: 'Suara Siswa', iconKind: 'polysuara' },
  { id: 'polymart', label: 'PolyMart', sublabel: 'Pasaran Siswa', iconKind: 'polymart' },
  { id: 'takwim', label: 'Takwim', sublabel: 'Kalendar Rasmi', iconKind: 'takwim' },
  { id: 'polymaps', label: 'PolyMaps', sublabel: 'Peta Kampus', iconKind: 'polymaps' },
  { id: 'polyrent', label: 'PolyRent', sublabel: 'Sewa Rumah', iconKind: 'polyrent' },
  { id: 'kebajikan', label: 'E-Kebajikan', sublabel: 'Aduan & Bantuan', iconKind: 'kebajikan' },
  { id: 'scan_qr', label: 'Scan QR', sublabel: 'Kumpul Merit', badge: 'MERIT', iconKind: 'scan_qr' },
  { id: 'ekpp', label: 'Kelab EKPP', sublabel: 'Persatuan Siswa', badge: 'KELAB', iconKind: 'ekpp' },
];

const renderServiceIcon = (kind: ServiceTileSpec['iconKind'], color: string) => {
  const props = { size: 28, color, strokeWidth: 2.1 } as const;
  switch (kind) {
    case 'polysuara':
      return <Megaphone {...props} />;
    case 'polymart':
      return <UtensilsCrossed {...props} />;
    case 'takwim':
      return <CalendarDays {...props} />;
    case 'polymaps':
      return <MapIcon {...props} />;
    case 'polyrent':
      return <Home {...props} />;
    case 'kebajikan':
      return <HeartHandshake {...props} />;
    case 'scan_qr':
      return <QrCode {...props} />;
    case 'ekpp':
      return <Landmark {...props} />;
  }
};

const splitHeadlineForUnderline = (
  headline: string,
): { readonly prefix: string; readonly underlined: string; readonly suffix: string } => {
  const marker = 'Ekosistem Pintar.';
  const idx = headline.toLowerCase().indexOf('ekosistem pintar.');
  if (idx !== -1) {
    return {
      prefix: headline.slice(0, idx).trim(),
      underlined: headline.slice(idx, idx + marker.length),
      suffix: headline.slice(idx + marker.length).trim(),
    };
  }
  const words = headline.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    return { prefix: '', underlined: words.join(' '), suffix: '' };
  }
  return {
    prefix: words.slice(0, -2).join(' '),
    underlined: words.slice(-2).join(' '),
    suffix: '',
  };
};

const OpeningHeroInner: React.FC<OpeningHeroProps> = ({
  institutionName,
  sessionLabel,
  headlinePrimary,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeDuration = Math.max(24, Number.isFinite(durationInFrames) ? durationInFrames : 306);
  const timeSec = frame / safeFps;

  // Beat 1 (0..1.35s, 0..81f): Twin EvolvingPath hairlines -> Institution Pill -> KineticWords + <Underline>
  const ruleDuration = Math.max(8, Math.round(0.62 * safeFps));
  const pillStart = Math.round(0.28 * safeFps);
  const pillEnd = Math.max(pillStart + 6, Math.round(0.76 * safeFps));
  const pillReveal = interpolate(frame, [pillStart, pillEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const pillScaleX = interpolate(pillReveal, [0, 1], [0.8, 1]);
  const pillScaleY = interpolate(pillReveal, [0, 1], [0.92, 1]);
  const pillOpacity = interpolate(pillReveal, [0, 0.35, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const headlineStart = Math.round(0.24 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.06 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.36 * safeFps));

  const { prefix, underlined, suffix } = splitHeadlineForUnderline(headlinePrimary);
  const prefixWordCount = prefix ? prefix.split(/\s+/).filter(Boolean).length : 0;
  const underlinedWordCount = underlined ? underlined.split(/\s+/).filter(Boolean).length : 0;
  const underlineWordsStart = headlineStart + prefixWordCount * wordStagger;
  const suffixWordsStart = underlineWordsStart + underlinedWordCount * wordStagger;

  const underlineStart = Math.round(0.84 * safeFps);
  const underlineDuration = Math.max(10, Math.round(0.46 * safeFps));
  const subtitleStart = Math.round(0.7 * safeFps);
  const subtitleDuration = Math.max(8, Math.round(0.42 * safeFps));

  // Beat 2 (0.85..3.2s, 51..192f): Centered 3D SuperApp KineticWindow (rotateX 11deg -> 3deg)
  const windowEnterFrame = Math.round(0.85 * safeFps);
  const windowEnterDuration = Math.max(12, Math.round(0.95 * safeFps));
  const windowProgress = interpolate(
    frame,
    [windowEnterFrame, windowEnterFrame + windowEnterDuration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );
  const windowOpacity = interpolate(
    frame,
    [windowEnterFrame, windowEnterFrame + Math.max(6, Math.round(0.22 * safeFps))],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const windowRotateX = interpolate(windowProgress, [0, 1], [11, 3]);
  const windowTranslateY = interpolate(windowProgress, [0, 1], [72, 0]);
  const windowScale = interpolate(windowProgress, [0, 1], [0.94, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    output: 'perceptual-scale',
  });
  const sheenStartFrame = Math.round(1.95 * safeFps);
  const typewriterStartFrame = Math.round(1.25 * safeFps);
  const nextClassEnterFrame = Math.round(1.12 * safeFps);

  // 8-squircle grid staggered 3f apart @ 60fps
  const gridBaseEnterFrame = Math.round(1.3 * safeFps);
  const gridStaggerFrames = Math.max(2, Math.round(0.05 * safeFps));

  // Active status pulse inside NextClassBentoCard
  const activeDotScale = 0.88 + Math.sin(timeSec * 5.2) * 0.16;
  const activeHaloScale = 1 + ((timeSec * 0.9) % 1) * 0.95;
  const activeHaloOpacity = Math.max(0, 0.45 * (1 - ((timeSec * 0.9) % 1)));

  // Beat 3 (3.1..5.1s, 186..306f): GhostCursor clicks PolyMaps squircle -> Terracotta ignition -> morph momentum
  const cursorAppearFrame = Math.round(3.1 * safeFps);
  const clickFrame = Math.round(3.75 * safeFps);
  const cursorHoldEnd = clickFrame + Math.max(6, Math.round(0.28 * safeFps));
  const cursorDisappearFrame = Math.min(safeDuration - 16, clickFrame + Math.max(10, Math.round(0.55 * safeFps)));

  const cursorKeyframes: readonly GhostCursorKeyframe[] = [
    { frame: cursorAppearFrame, x: 1020, y: 840 },
    {
      frame: Math.max(cursorAppearFrame + 4, clickFrame - Math.max(3, Math.round(0.07 * safeFps))),
      x: POLYMAPS_CENTER_X,
      y: POLYMAPS_CENTER_Y,
    },
    {
      frame: clickFrame,
      x: POLYMAPS_CENTER_X,
      y: POLYMAPS_CENTER_Y,
      click: true,
    },
    {
      frame: cursorHoldEnd,
      x: POLYMAPS_CENTER_X,
      y: POLYMAPS_CENTER_Y,
    },
  ];

  // Ignition color + 3D lift on PolyMaps squircle
  const igniteT = interpolate(
    frame,
    [clickFrame, clickFrame + Math.max(4, Math.round(0.14 * safeFps))],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: CLICK_LIFT_EASE,
    },
  );
  const pressDip = interpolate(
    frame,
    [clickFrame - 2, clickFrame + 2, clickFrame + 8],
    [1, 0.94, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const liftProgress =
    frame >= clickFrame
      ? spring({
          frame: frame - clickFrame,
          fps: safeFps,
          config: { damping: 145, stiffness: 230, mass: 0.85 },
        })
      : 0;

  // Gentle final-24-frame expansion carrying momentum into portalZoomMorph (270..306f)
  const finalRampStart = Math.max(clickFrame + 8, safeDuration - 24);
  const finalRampProgress = interpolate(frame, [finalRampStart, safeDuration - 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: MORPH_RAMP_EASE,
  });

  const polymapsScale = (1 + liftProgress * 0.18 + finalRampProgress * 0.2) * pressDip;
  const polymapsZ = liftProgress * 36 + finalRampProgress * 22;

  // Expanding terracotta ripple halo centered on PolyMaps squircle
  const rippleDuration = Math.max(14, Math.round(0.56 * safeFps));
  const rippleElapsed = frame - clickFrame;
  const rippleVisible = rippleElapsed >= 0 && rippleElapsed <= rippleDuration;
  const rippleT = rippleVisible
    ? interpolate(rippleElapsed, [0, rippleDuration], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: EXPO_OUT,
      })
    : 0;
  const rippleScale = interpolate(rippleT, [0, 1], [0.96, 1.34]);
  const rippleOpacity = interpolate(rippleT, [0, 0.16, 0.72, 1], [0, 0.85, 0.3, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const secondaryRippleT = rippleVisible
    ? interpolate(rippleElapsed, [3, rippleDuration], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: EXPO_OUT,
      })
    : 0;
  const secondaryRippleScale = interpolate(secondaryRippleT, [0, 1], [0.98, 1.2]);
  const secondaryRippleOpacity = interpolate(
    secondaryRippleT,
    [0, 0.2, 0.8, 1],
    [0, 0.58, 0.18, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  return (
    <>
      <EditorialBackdrop />

      <CameraStage
        zoomFrom={0.99}
        zoomTo={1.03}
        panXFrom={-8}
        panXTo={0}
        panYFrom={5}
        panYTo={0}
        tiltXFrom={0.55}
        tiltXTo={0}
        tiltYFrom={-0.85}
        tiltYTo={0}
        breathingAmplitude={0.35}
        exitZoomDelta={0.05}
        exitFrames={Math.round(0.35 * safeFps)}
        transformOrigin={`${PORTAL_POLYMAPS_ORIGIN.xPercent}% ${PORTAL_POLYMAPS_ORIGIN.yPercent}%`}
        clip
      >
        {/* Beat 1: Architectural Hairline Rules -> Institution Pill -> KineticWords + Underline + Subtitle */}
        <div
          style={{
            position: 'absolute',
            top: 76,
            left: 96,
            right: 96,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontFamily: LAUNCH_FONTS.DISPLAY,
            zIndex: 4,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 1560,
              height: 46,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <EvolvingPath
                d="M 24 23 L 780 23"
                width={1560}
                height={46}
                startFrame={0}
                durationFrames={ruleDuration}
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={2}
                headDotColor={LAUNCH_PALETTE.ACCENT}
                headDotRadius={4}
                hideDotWhenComplete
                style={{ position: 'absolute', inset: 0 }}
              />
              <EvolvingPath
                d="M 1536 23 L 780 23"
                width={1560}
                height={46}
                startFrame={0}
                durationFrames={ruleDuration}
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={2}
                headDotColor={LAUNCH_PALETTE.ACCENT}
                headDotRadius={4}
                hideDotWhenComplete
                style={{ position: 'absolute', inset: 0 }}
              />
            </div>

            <Interactive.Div
              name="Institution Pill"
              premountFor={safeFps}
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                padding: '7px 22px',
                borderRadius: 999,
                backgroundColor: LAUNCH_PALETTE.CARD_BG,
                border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                boxShadow: '0 10px 24px rgba(46, 58, 47, 0.06)',
                opacity: pillOpacity,
                transform: `scale(${pillScaleX.toFixed(4)}, ${pillScaleY.toFixed(4)})`,
              }}
            >
              <CanvasImage
                name="JPP Emblem"
                src={staticFile('jpp-logo.png')}
                premountFor={safeFps}
                style={{ width: 26, height: 26, objectFit: 'contain' }}
              />
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                  color: LAUNCH_PALETTE.PRIMARY,
                  whiteSpace: 'nowrap',
                }}
              >
                {institutionName}
              </span>
              <span style={{ color: LAUNCH_PALETTE.ACCENT, fontWeight: 800 }}>•</span>
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: LAUNCH_PALETTE.ACCENT,
                  whiteSpace: 'nowrap',
                }}
              >
                {sessionLabel}
              </span>
            </Interactive.Div>
          </div>

          <Interactive.Div
            name="Hero Headline"
            premountFor={safeFps}
            style={{
              marginTop: 12,
              textAlign: 'center',
              maxWidth: 1620,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              overflow: 'visible',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 54,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'baseline',
                columnGap: '0.26em',
                rowGap: '0.06em',
                overflow: 'visible',
              }}
            >
              {prefix ? (
                <KineticWords
                  as="span"
                  text={prefix}
                  startFrame={headlineStart}
                  staggerFrames={wordStagger}
                  wordDurationFrames={wordDuration}
                  align="center"
                  style={{
                    fontSize: 54,
                    fontWeight: 900,
                    letterSpacing: '-0.035em',
                    lineHeight: 1.06,
                    color: LAUNCH_PALETTE.PRIMARY,
                  }}
                />
              ) : null}

              {underlined ? (
                <span style={{ display: 'inline-block', overflow: 'visible' }}>
                  <EditorialAnnotation
                    type="underline"
                    startFrame={underlineStart}
                    durationFrames={underlineDuration}
                    color={LAUNCH_PALETTE.ACCENT}
                    strokeWidth={3.8}
                    padding={4}
                    style={{ display: 'inline-block', overflow: 'visible' }}
                  >
                    <KineticWords
                      as="span"
                      text={underlined}
                      startFrame={underlineWordsStart}
                      staggerFrames={wordStagger}
                      wordDurationFrames={wordDuration}
                      align="center"
                      style={{
                        fontFamily: LAUNCH_FONTS.SERIF_ITALIC,
                        fontStyle: 'italic',
                        fontSize: 60,
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        lineHeight: 1.04,
                        color: LAUNCH_PALETTE.PRIMARY_DARK,
                      }}
                    />
                  </EditorialAnnotation>
                </span>
              ) : null}

              {suffix ? (
                <KineticWords
                  as="span"
                  text={suffix}
                  startFrame={suffixWordsStart}
                  staggerFrames={wordStagger}
                  wordDurationFrames={wordDuration}
                  align="center"
                  style={{
                    fontSize: 54,
                    fontWeight: 900,
                    letterSpacing: '-0.035em',
                    lineHeight: 1.06,
                    color: LAUNCH_PALETTE.PRIMARY,
                  }}
                />
              ) : null}
            </h1>

            <KineticReveal
              startFrame={subtitleStart}
              durationFrames={subtitleDuration}
              style={{ marginTop: 10 }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 18.5,
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  color: LAUNCH_PALETTE.MUTED_OLIVE,
                }}
              >
                Platform rasmi Jawatankuasa Perwakilan Pelajar — menghubungkan mobiliti kampus, ekonomi siswa &amp; kebajikan.
              </p>
            </KineticReveal>
          </Interactive.Div>
        </div>

        {/* Beat 2 & Beat 3: Centered Exploded 3D SuperApp KineticWindow Stage */}
        <Interactive.Div
          name="Live SuperApp Portal Stage"
          premountFor={safeFps}
          style={{
            position: 'absolute',
            left: WINDOW_LEFT,
            top: WINDOW_TOP,
            width: WINDOW_WIDTH,
            height: WINDOW_HEIGHT,
            perspective: '1800px',
            zIndex: 8,
          }}
        >
          <div
            style={{
              width: WINDOW_WIDTH,
              height: WINDOW_HEIGHT,
              transformStyle: 'preserve-3d',
              transformOrigin: '50% 50%',
              opacity: windowOpacity,
              willChange: 'transform, opacity',
              transform: `translate3d(0px, ${windowTranslateY.toFixed(2)}px, 0px) scale(${windowScale.toFixed(5)}) rotateX(${windowRotateX.toFixed(3)}deg)`,
            }}
          >
            <KineticWindow
              surface="light"
              routeLabel="jpp.polisas.edu.my/portal"
              statusPill="AKTIF • 24/7"
              width={WINDOW_WIDTH}
              height={WINDOW_HEIGHT}
              borderRadius={26}
              sheenStartFrame={sheenStartFrame}
              sheenDuration={46}
              style={{
                boxShadow:
                  '0 32px 68px rgba(31, 39, 32, 0.16), 0 8px 20px rgba(31, 39, 32, 0.08)',
              }}
            >
              {/* 1. Live SuperAppHeader Band (Deep Forest #2E3A2F rounded arch header) */}
              <div
                style={{
                  position: 'relative',
                  height: HEADER_BAND_H,
                  boxSizing: 'border-box',
                  padding: '16px 32px 18px',
                  background:
                    'linear-gradient(135deg, #2E3A2F 0%, #243025 58%, #1F2720 100%)',
                  borderBottomLeftRadius: 32,
                  borderBottomRightRadius: 32,
                  borderBottom: '1px solid rgba(217, 201, 178, 0.24)',
                  boxShadow: '0 12px 28px rgba(31, 39, 32, 0.16)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {/* Subtle radial dot texture */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage:
                      'radial-gradient(rgba(248, 246, 238, 0.14) 1px, transparent 1px)',
                    backgroundSize: '22px 22px',
                    opacity: 0.45,
                    pointerEvents: 'none',
                  }}
                />

                {/* Top row: Brand Crest + Location Pill + Minimal Avatar */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(217, 201, 178, 0.32)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 4,
                          boxSizing: 'border-box',
                          flexShrink: 0,
                        }}
                      >
                        <CanvasImage
                          name="Header Crest"
                          src={staticFile('jpp-logo.png')}
                          premountFor={safeFps}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 900,
                            letterSpacing: '0.02em',
                            color: LAUNCH_PALETTE.CARD_BG,
                            lineHeight: 1.1,
                          }}
                        >
                          JPP POLISAS
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: LAUNCH_PALETTE.TERTIARY,
                            opacity: 0.9,
                            lineHeight: 1.1,
                          }}
                        >
                          Portal Rasmi Pelajar
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(248, 246, 238, 0.1)',
                        border: '1px solid rgba(217, 201, 178, 0.24)',
                        color: LAUNCH_PALETTE.BACKGROUND,
                        fontSize: 11.5,
                        fontWeight: 600,
                      }}
                    >
                      <MapPin size={12} color={LAUNCH_PALETTE.TERTIARY} strokeWidth={2.3} />
                      <span>POLISAS, Semambu</span>
                    </div>
                  </div>

                  {/* Discrete status & student initial pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        padding: '5px 12px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(107, 127, 91, 0.26)',
                        border: '1px solid rgba(217, 201, 178, 0.28)',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        color: LAUNCH_PALETTE.BACKGROUND,
                      }}
                    >
                      PENTADBIR / MAHASISWA
                    </div>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.SECONDARY,
                        border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: LAUNCH_PALETTE.CARD_BG,
                        fontSize: 13,
                        fontWeight: 900,
                      }}
                    >
                      H
                    </div>
                  </div>
                </div>

                {/* Greeting Row */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <span
                      style={{
                        fontSize: 25,
                        fontWeight: 900,
                        letterSpacing: '-0.025em',
                        color: LAUNCH_PALETTE.CARD_BG,
                        lineHeight: 1.15,
                      }}
                    >
                      Selamat Petang, Haziq
                    </span>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: 'rgba(248, 246, 238, 0.76)',
                      }}
                    >
                      Pusat sehenti digital kampus POLISAS.
                    </span>
                  </div>
                </div>

                {/* Stadium Capsule Search Input with LiveTypewriterText */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    height: 44,
                    padding: '0 14px',
                    borderRadius: 999,
                    backgroundColor: LAUNCH_PALETTE.CARD_BG,
                    border: '1.5px solid rgba(217, 201, 178, 0.72)',
                    boxShadow: '0 8px 22px rgba(0, 0, 0, 0.16)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        backgroundColor: 'rgba(107, 127, 91, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Search size={14} color={LAUNCH_PALETTE.PRIMARY} strokeWidth={2.4} />
                    </div>
                    <LiveTypewriterText
                      text="Cari PolyMaps, PolyMart, jadual..."
                      startFrame={typewriterStartFrame}
                      charsPerSecond={24}
                      cursorColor={LAUNCH_PALETTE.ACCENT}
                      style={{
                        fontFamily: LAUNCH_FONTS.DISPLAY,
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: LAUNCH_PALETTE.PRIMARY,
                        whiteSpace: 'nowrap',
                      }}
                    />
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 10px',
                      borderRadius: 999,
                      backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                      border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: LAUNCH_PALETTE.MUTED_OLIVE,
                      flexShrink: 0,
                    }}
                  >
                    Ctrl + K
                  </span>
                </div>
              </div>

              {/* Portal Body (NextClassBentoCard Bar + 8-Squircle CampusServicesGrid) */}
              <div
                style={{
                  flex: 1,
                  boxSizing: 'border-box',
                  padding: `${BODY_PAD_TOP}px ${BODY_PAD_X}px 20px`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: BODY_GAP,
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* 2. Live NextClassBentoCard Bar (<ExplodedLayer zDepth={24}>) */}
                <ExplodedLayer
                  zDepth={24}
                  enterFrame={nextClassEnterFrame}
                  enterOffsetY={18}
                  floatAmplitude={1.4}
                  style={{ height: NEXT_CLASS_BAR_H, flexShrink: 0 }}
                >
                  <div
                    style={{
                      height: NEXT_CLASS_BAR_H,
                      boxSizing: 'border-box',
                      padding: '12px 20px',
                      borderRadius: 20,
                      backgroundColor: LAUNCH_PALETTE.CARD_BG,
                      border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                      boxShadow: '0 10px 26px rgba(46, 58, 47, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                      <div
                        style={{
                          position: 'relative',
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: 'rgba(107, 127, 91, 0.14)',
                          border: '1px solid rgba(107, 127, 91, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.SECONDARY,
                            opacity: activeHaloOpacity,
                            transform: `scale(${activeHaloScale.toFixed(3)})`,
                          }}
                        />
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.SECONDARY,
                            transform: `scale(${activeDotScale.toFixed(3)})`,
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: '0.1em',
                              color: LAUNCH_PALETTE.ACCENT,
                            }}
                          >
                            KELAS SETERUSNYA · 14 MIN LAGI
                          </span>
                          <span
                            style={{
                              padding: '1.5px 8px',
                              borderRadius: 999,
                              backgroundColor: 'rgba(107, 127, 91, 0.14)',
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 9.5,
                              fontWeight: 800,
                              color: LAUNCH_PALETTE.SECONDARY,
                            }}
                          >
                            AMALI
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 17.5,
                            fontWeight: 800,
                            letterSpacing: '-0.015em',
                            color: LAUNCH_PALETTE.PRIMARY,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          DIT3013 · Pembangunan Aplikasi Web
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 14px',
                          borderRadius: 999,
                          backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                          border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 12,
                          fontWeight: 800,
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        <MapPin size={13} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
                        <span>MK3 · JTMK</span>
                      </div>
                      <div
                        style={{
                          padding: '7px 14px',
                          borderRadius: 999,
                          backgroundColor: LAUNCH_PALETTE.PRIMARY,
                          color: LAUNCH_PALETTE.BACKGROUND,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                        }}
                      >
                        10:00 AM
                      </div>
                    </div>
                  </div>
                </ExplodedLayer>

                {/* 3. Live 8-Squircle CampusServicesGrid (4 columns x 2 rows in 05 Earthy Minimal) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: GRID_GAP,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {CAMPUS_SERVICE_TILES.map((tile, idx) => {
                    const isPolyMaps = tile.id === 'polymaps';
                    const enterStart = gridBaseEnterFrame + idx * gridStaggerFrames;
                    const localFrame = frame - enterStart;
                    const popSpring =
                      localFrame >= 0
                        ? spring({
                            frame: localFrame,
                            fps: safeFps,
                            config: { damping: 145, stiffness: 235, mass: 0.8 },
                          })
                        : 0;
                    const tileOpacity =
                      localFrame >= 0
                        ? interpolate(localFrame, [0, 8], [0, 1], {
                            extrapolateLeft: 'clamp',
                            extrapolateRight: 'clamp',
                          })
                        : 0;
                    const baseScale = 0.76 + 0.24 * popSpring;
                    const baseLiftY = (1 - popSpring) * 18;

                    const tileBg = isPolyMaps
                      ? interpolateColors(
                          igniteT,
                          [0, 1],
                          [LAUNCH_PALETTE.CARD_BG, LAUNCH_PALETTE.ACCENT],
                        )
                      : LAUNCH_PALETTE.CARD_BG;
                    const tileBorder = isPolyMaps
                      ? interpolateColors(
                          igniteT,
                          [0, 1],
                          [LAUNCH_PALETTE.TERTIARY, LAUNCH_PALETTE.ACCENT],
                        )
                      : LAUNCH_PALETTE.TERTIARY;
                    const wellBg = isPolyMaps
                      ? interpolateColors(
                          igniteT,
                          [0, 1],
                          [LAUNCH_PALETTE.SURFACE_MUTED, 'rgba(255, 255, 255, 0.22)'],
                        )
                      : LAUNCH_PALETTE.SURFACE_MUTED;
                    const wellBorder = isPolyMaps
                      ? interpolateColors(
                          igniteT,
                          [0, 1],
                          [LAUNCH_PALETTE.TERTIARY, 'rgba(255, 255, 255, 0.45)'],
                        )
                      : LAUNCH_PALETTE.TERTIARY;
                    const iconColor = isPolyMaps
                      ? interpolateColors(
                          igniteT,
                          [0, 1],
                          [LAUNCH_PALETTE.PRIMARY, LAUNCH_PALETTE.CARD_BG],
                        )
                      : idx % 2 === 0
                        ? LAUNCH_PALETTE.PRIMARY
                        : LAUNCH_PALETTE.SECONDARY;
                    const titleColor = isPolyMaps
                      ? interpolateColors(
                          igniteT,
                          [0, 1],
                          [LAUNCH_PALETTE.PRIMARY, LAUNCH_PALETTE.CARD_BG],
                        )
                      : LAUNCH_PALETTE.PRIMARY;
                    const subColor = isPolyMaps
                      ? interpolateColors(
                          igniteT,
                          [0, 1],
                          [LAUNCH_PALETTE.MUTED_OLIVE, LAUNCH_PALETTE.BACKGROUND],
                        )
                      : LAUNCH_PALETTE.MUTED_OLIVE;

                    const combinedScale = isPolyMaps ? baseScale * polymapsScale : baseScale;
                    const combinedZ = isPolyMaps ? polymapsZ : 0;

                    return (
                      <div
                        key={tile.id}
                        style={{
                          position: 'relative',
                          height: TILE_HEIGHT,
                          boxSizing: 'border-box',
                          padding: '20px 14px 14px',
                          borderRadius: 24,
                          backgroundColor: tileBg,
                          border: `1.5px solid ${tileBorder}`,
                          boxShadow: isPolyMaps && igniteT > 0.05
                            ? '0 26px 54px rgba(201, 111, 79, 0.36), 0 8px 20px rgba(31, 39, 32, 0.14)'
                            : '0 8px 20px rgba(46, 58, 47, 0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          textAlign: 'center',
                          opacity: tileOpacity,
                          zIndex: isPolyMaps && igniteT > 0.01 ? 25 : 1,
                          transformStyle: 'preserve-3d',
                          willChange: 'transform, opacity',
                          transform: `translate3d(0px, ${baseLiftY.toFixed(2)}px, ${combinedZ.toFixed(2)}px) scale(${combinedScale.toFixed(4)})`,
                        }}
                      >
                        {/* Expanding Terracotta Ripple Halo on PolyMaps Click */}
                        {isPolyMaps && rippleVisible && rippleOpacity > 0.002 ? (
                          <>
                            <div
                              style={{
                                position: 'absolute',
                                inset: -4,
                                borderRadius: 28,
                                border: `2.5px solid ${LAUNCH_PALETTE.ACCENT}`,
                                opacity: rippleOpacity,
                                transform: `scale(${rippleScale.toFixed(4)})`,
                                pointerEvents: 'none',
                              }}
                            />
                            {secondaryRippleOpacity > 0.002 ? (
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: -4,
                                  borderRadius: 28,
                                  border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
                                  opacity: secondaryRippleOpacity,
                                  transform: `scale(${secondaryRippleScale.toFixed(4)})`,
                                  pointerEvents: 'none',
                                }}
                              />
                            ) : null}
                          </>
                        ) : null}

                        <div
                          style={{
                            position: 'relative',
                            width: 70,
                            height: 70,
                            borderRadius: 21,
                            backgroundColor: wellBg,
                            border: `1.5px solid ${wellBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 18,
                            flexShrink: 0,
                          }}
                        >
                          {renderServiceIcon(tile.iconKind, iconColor)}

                          {tile.badge ? (
                            <span
                              style={{
                                position: 'absolute',
                                top: -6,
                                right: -10,
                                padding: '2px 7px',
                                borderRadius: 999,
                                backgroundColor: LAUNCH_PALETTE.PRIMARY,
                                border: `1.5px solid ${LAUNCH_PALETTE.CARD_BG}`,
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 9,
                                fontWeight: 800,
                                letterSpacing: '0.08em',
                                color: LAUNCH_PALETTE.BACKGROUND,
                                lineHeight: 1.2,
                              }}
                            >
                              {tile.badge}
                            </span>
                          ) : null}
                        </div>

                        <div
                          style={{
                            fontSize: 15.5,
                            fontWeight: 800,
                            letterSpacing: '-0.015em',
                            color: titleColor,
                            lineHeight: 1.2,
                          }}
                        >
                          {tile.label}
                        </div>
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 12,
                            fontWeight: 600,
                            color: subColor,
                            lineHeight: 1.2,
                          }}
                        >
                          {tile.sublabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </KineticWindow>
          </div>
        </Interactive.Div>

        {/* Beat 3: GhostCursor glides onto PolyMaps squircle center and clicks */}
        <GhostCursor
          keyframes={cursorKeyframes}
          appearFrame={cursorAppearFrame}
          disappearFrame={cursorDisappearFrame}
          color={LAUNCH_PALETTE.PRIMARY}
          rippleColor={LAUNCH_PALETTE.ACCENT}
          scale={1.1}
          style={{ zIndex: 30 }}
        />
      </CameraStage>

      <EditorialFrameMarks chapterCode="01" chapterLabel="Pembukaan Rasmi" />
    </>
  );
};

export const openingHeroSchema = {
  institutionName: {
    type: 'string',
    default: 'POLITEKNIK SULTAN HAJI AHMAD SHAH',
    description: 'Institution Name',
  },
  sessionLabel: {
    type: 'string',
    default: 'SESI AKADEMIK 2026/2027',
    description: 'Academic Session',
  },
  headlinePrimary: {
    type: 'string',
    default: 'Satu Kampus. Satu Ekosistem Pintar.',
    description: 'Hero Headline',
  },
} as const satisfies InteractivitySchema;

export const OpeningHeroScene = Interactive.withSchema({
  Component: OpeningHeroInner,
  componentName: 'OpeningHeroScene',
  schema: openingHeroSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
