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
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Compass,
  HeartHandshake,
  Home,
  Megaphone,
  Package,
  ShoppingBag,
  Smartphone,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticWords } from '../motion/KineticTypography';
import { EvolvingPath, GeometricSparkBurst } from '../motion/MotionActors';
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
  { label: 'PolyMaps', color: LAUNCH_MODULE_THEMES.polymaps.primary, dark: LAUNCH_MODULE_THEMES.polymaps.dark, iconKind: 'polymaps' as const },
  { label: 'Takwim', color: LAUNCH_MODULE_THEMES.takwim.primary, dark: LAUNCH_MODULE_THEMES.takwim.dark, iconKind: 'takwim' as const },
  { label: 'PolyMart', color: LAUNCH_MODULE_THEMES.polymart.primary, dark: LAUNCH_MODULE_THEMES.polymart.dark, iconKind: 'polymart' as const },
  { label: 'PolyRent', color: LAUNCH_MODULE_THEMES.polyrent.primary, dark: LAUNCH_MODULE_THEMES.polyrent.dark, iconKind: 'polyrent' as const },
  { label: 'PolySuara', color: LAUNCH_MODULE_THEMES.polysuara.primary, dark: LAUNCH_MODULE_THEMES.polysuara.dark, iconKind: 'polysuara' as const },
  { label: 'E-Kebajikan', color: LAUNCH_MODULE_THEMES.kebajikan.primary, dark: LAUNCH_MODULE_THEMES.kebajikan.dark, iconKind: 'kebajikan' as const },
  { label: 'Food Bank', color: LAUNCH_MODULE_THEMES.foodbank.primary, dark: LAUNCH_MODULE_THEMES.foodbank.dark, iconKind: 'foodbank' as const },
  { label: '21 e-Kelab', color: LAUNCH_MODULE_THEMES.kelab.primary, dark: LAUNCH_MODULE_THEMES.kelab.dark, iconKind: 'kelab' as const },
] as const;

const renderOrbitIcon = (kind: (typeof MODULE_SPECTRUM_LIST)[number]['iconKind']) => {
  switch (kind) {
    case 'polymaps':
      return <Compass size={22} color="#FFFFFF" strokeWidth={2.2} />;
    case 'takwim':
      return <CalendarDays size={22} color="#FFFFFF" strokeWidth={2.2} />;
    case 'polymart':
      return <ShoppingBag size={22} color="#FFFFFF" strokeWidth={2.2} />;
    case 'polyrent':
      return <Home size={22} color="#FFFFFF" strokeWidth={2.2} />;
    case 'polysuara':
      return <Megaphone size={22} color="#FFFFFF" strokeWidth={2.2} />;
    case 'kebajikan':
      return <HeartHandshake size={22} color="#FFFFFF" strokeWidth={2.2} />;
    case 'foodbank':
      return <Package size={22} color="#FFFFFF" strokeWidth={2.2} />;
    case 'kelab':
      return <Award size={22} color="#FFFFFF" strokeWidth={2.2} />;
  }
};

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
    posStyle: { left: 96, top: 88 },
    slideXSign: -1,
    slideYSign: -1,
    dotPosStyle: { left: 9, top: 9 },
  },
  {
    id: 'tr',
    d: 'M 84 84 L 84 12 L 12 12',
    posStyle: { right: 96, top: 88 },
    slideXSign: 1,
    slideYSign: -1,
    dotPosStyle: { right: 9, top: 9 },
  },
  {
    id: 'bl',
    d: 'M 12 12 L 12 84 L 84 84',
    posStyle: { left: 96, bottom: 88 },
    slideXSign: -1,
    slideYSign: 1,
    dotPosStyle: { left: 9, bottom: 9 },
  },
  {
    id: 'br',
    d: 'M 84 12 L 84 84 L 12 84',
    posStyle: { right: 96, bottom: 88 },
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
  studentsCount = 2841,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeWidth = Math.max(1, Math.round(Number.isFinite(width) ? width : 1920));
  const safeHeight = Math.max(1, Math.round(Number.isFinite(height) ? height : 1080));
  const safeStudents =
    typeof studentsCount === 'number' && Number.isFinite(studentsCount)
      ? Math.max(1, Math.round(studentsCount))
      : 2841;
  const safeHeadlinePrimary = resolveClosingPrimary(headlinePrimary);
  const safeHeadlineItalic = resolveClosingItalic(headlineItalic);
  const safePortalUrl = portalUrl.trim() || 'https://jpp.polisas.edu.my';
  const displayDomain = safePortalUrl.replace(/^https?:\/\//, '');

  const timeSec = frame / safeFps;

  const vignetteEffects = useMemo(
    () => [vignette({ amount: 0.28, color: '#020A08' })],
    [],
  );

  // Beat 1 (0..1.5s): Brackets & Crest Pill
  const bracketStart = Math.round(0.08 * safeFps);
  const bracketDuration = Math.max(18, Math.round(1.15 * safeFps));
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
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const pillSpring = spring({
    frame,
    fps: safeFps,
    config: { damping: 24, stiffness: 150, mass: 1.05 },
  });
  const pillScaleX = 0.86 + 0.14 * pillSpring;
  const pillScaleY = 0.94 + 0.06 * pillSpring;
  const pillOpacity = interpolate(frame, [0, Math.max(4, Math.round(0.22 * safeFps))], [0.45, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Beat 2 (0.2..2.0s): Headlines
  const headlineStart = Math.round(0.2 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.065 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.38 * safeFps));

  const italicStart = Math.round(0.68 * safeFps);
  const italicEnd = Math.max(italicStart + 10, Math.round(1.36 * safeFps));
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

  const underlineStart = Math.round(1.3 * safeFps);
  const underlineDuration = Math.max(12, Math.round(0.76 * safeFps));

  // Hero QR Monolith: Dramatic 3D Rise -> STRICT 0.00deg Orthogonal Lock (2.40s..17.00s)
  const qrEntryStart = Math.round(0.75 * safeFps); // 45f
  const qrLockFrame = Math.round(2.4 * safeFps); // 144f -> 14.6s pure 0.00deg lock (covers f_5550!)
  const qrOpacity = interpolate(
    frame,
    [qrEntryStart, qrEntryStart + Math.max(6, Math.round(0.3 * safeFps))],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const qrEntryProgress = interpolate(frame, [qrEntryStart, qrLockFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const isQrOrthogonalLocked = frame >= qrLockFrame;
  const qrRotateX = isQrOrthogonalLocked ? 0 : interpolate(qrEntryProgress, [0, 1], [28, 0]);
  const qrRotateY = isQrOrthogonalLocked ? 0 : interpolate(qrEntryProgress, [0, 1], [-18, 0]);
  const qrTranslateY = isQrOrthogonalLocked ? 0 : interpolate(qrEntryProgress, [0, 1], [62, 0]);
  const qrScale = isQrOrthogonalLocked ? 1 : interpolate(qrEntryProgress, [0, 1], [0.76, 1]);

  const bracketPulseScale = 1 + Math.sin(timeSec * 2.6) * 0.018;
  const bracketPulseOpacity = 0.78 + Math.sin(timeSec * 2.6) * 0.2;

  // Flanking Side Cockpit Cards (+7deg / -7deg)
  const satStart = Math.round(1.45 * safeFps);
  const satSpring =
    frame >= satStart
      ? spring({
          frame: frame - satStart,
          fps: safeFps,
          config: { damping: 24, stiffness: 155, mass: 1.05 },
        })
      : 0;
  const satOpacity =
    frame >= satStart
      ? interpolate(frame, [satStart, satStart + Math.round(0.28 * safeFps)], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;
  const satRiseY = (1 - satSpring) * 28;
  const satScale = 0.94 + 0.06 * satSpring;

  const stepBaseStart = satStart + Math.round(0.32 * safeFps);
  const stepStagger = Math.max(4, Math.round(0.24 * safeFps));

  // Orbiting 8-Module 3D Constellation enters cleanly with Triad
  const orbitOpacity = interpolate(frame, [Math.round(1.6 * safeFps), Math.round(2.3 * safeFps)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 3D Floor Radar Waves
  const radarStart = Math.round(1.0 * safeFps);
  const radarPeriod = Math.max(36, Math.round(2.8 * safeFps));
  const liveDotScale = 0.84 + Math.sin(timeSec * 4.6) * 0.16;

  return (
    <>
      <EditorialBackdrop dark ambientTint={LAUNCH_MODULE_THEMES.closing.tint} />

      <Solid
        width={safeWidth}
        height={safeHeight}
        color="rgba(6, 23, 20, 0)"
        premountFor={safeFps}
        effects={vignetteEffects}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* Luminous Midnight-Teal Aurora Radial Spotlight Beams behind QR Stage */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 58%, rgba(20, 184, 166, 0.28) 0%, rgba(16, 185, 129, 0.14) 32%, rgba(6, 23, 20, 0) 68%)',
          pointerEvents: 'none',
        }}
      />

      {/* LAYER A: Dark 3D Perspective Floor Grid, Holographic Radar Waves & Brackets */}
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
            dark
            accentColor={LAUNCH_PALETTE.ACCENT}
            secondaryColor={EMERALD}
            gridOpacity={0.28}
            scrollSpeed={12}
          />

          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              top: '68%',
              width: 960,
              height: 960,
              transform: 'translate(-50%, -50%) translateZ(-80px) rotateX(62deg)',
              transformStyle: 'preserve-3d',
              pointerEvents: 'none',
            }}
          >
            <Circle
              radius={380}
              fill="none"
              stroke="rgba(20, 184, 166, 0.28)"
              strokeWidth={1.8}
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
                interpolate(cycleT, [0, 0.14, 0.72, 1], [0, 0.78, 0.3, 0], {
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
                stroke={LAUNCH_PALETTE.ACCENT}
                strokeWidth={2.5}
                strokeLinecap="square"
                strokeLinejoin="miter"
                headDotColor="#FFFFFF"
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

      {/* LAYER B: Orbiting 8-Module 3D Constellation Halo (zIndex 2 — cleanly behind foreground QR Monolith!) */}
      {orbitOpacity > 0.01 ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            perspective: '1400px',
            transformStyle: 'preserve-3d',
            opacity: orbitOpacity,
          }}
        >
          {MODULE_SPECTRUM_LIST.map((mod, idx) => {
            const angle = (idx / MODULE_SPECTRUM_LIST.length) * Math.PI * 2 + timeSec * 0.42;
            const cx = 960 + Math.cos(angle) * 760;
            const cy = 605 + Math.sin(angle) * 290;
            const depthNorm = (Math.sin(angle) + 1) * 0.5; // 0 (back) .. 1 (front edge)
            const tileScale = 0.78 + depthNorm * 0.28;
            const tileZ = -80 + depthNorm * 110;
            const tileOpacity = 0.62 + depthNorm * 0.36;

            return (
              <div
                key={`orbit-${mod.label}`}
                style={{
                  position: 'absolute',
                  left: cx,
                  top: cy,
                  width: 56,
                  height: 56,
                  marginLeft: -28,
                  marginTop: -28,
                  borderRadius: 17,
                  background: `linear-gradient(145deg, ${mod.color} 0%, ${mod.dark} 100%)`,
                  border: '1.5px solid rgba(255, 255, 255, 0.48)',
                  boxShadow: `0 16px 34px rgba(0, 0, 0, 0.48), 0 0 22px ${mod.color}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: tileOpacity,
                  transform: `translate3d(0px, 0px, ${tileZ.toFixed(1)}px) scale(${tileScale.toFixed(4)})`,
                }}
              >
                {renderOrbitIcon(mod.iconKind)}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* LAYER C: Foreground LED Showstopper Hero Stage (zIndex 10) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          pointerEvents: 'none',
          fontFamily: LAUNCH_FONTS.DISPLAY,
        }}
      >
        {/* Top Crest Pill & Luminous Title Lockup */}
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
              backgroundColor: 'rgba(11, 36, 32, 0.92)',
              border: '1.5px solid rgba(94, 234, 212, 0.36)',
              boxShadow: '0 14px 32px rgba(0, 0, 0, 0.42)',
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
                color: LAUNCH_PALETTE.BACKGROUND,
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
                color: '#FFFFFF',
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
                      color: '#5EEAD4',
                    }}
                  >
                    {safeHeadlineItalic}
                  </p>
                </EditorialAnnotation>
              </div>
            </div>
          </Interactive.Div>
        </div>

        <GeometricSparkBurst
          triggerFrame={qrLockFrame + 4}
          x={960}
          y={580}
          durationFrames={38}
          radius={320}
          count={16}
          seed="closing-aurora-qr-lock"
          colors={[LAUNCH_PALETTE.ACCENT, EMERALD, LAUNCH_MODULE_THEMES.polymart.primary, '#FFFFFF']}
        />

        {/* 3-Piece Symmetrical Dark-Teal Glass Cockpit Triad around 352px Pure White QR Beacon */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 256,
            height: 716,
            zIndex: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 48,
            perspective: '1650px',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* LEFT COCKPIT CARD (+7deg inward): Frosted Dark-Teal Glass */}
          <Interactive.Div
            name="Left Upright Onboarding Card"
            premountFor={safeFps}
            style={{
              width: 378,
              padding: '22px 24px',
              borderRadius: 26,
              backgroundColor: 'rgba(11, 36, 32, 0.94)',
              border: '1.5px solid rgba(20, 184, 166, 0.36)',
              borderBottom: `6px solid ${LAUNCH_PALETTE.ACCENT}`,
              boxShadow: '0 28px 60px rgba(0, 0, 0, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              gap: 13,
              opacity: satOpacity,
              transform: `translate3d(0px, ${satRiseY.toFixed(2)}px, 45px) rotateY(7deg) scale(${satScale.toFixed(4)})`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  color: '#5EEAD4',
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
              <Smartphone size={16} color="#5EEAD4" strokeWidth={2.4} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {ONBOARDING_STEPS.map((step, idx) => {
                const stepStart = stepBaseStart + idx * stepStagger;
                const stepElapsed = frame - stepStart;
                const stepSpring =
                  stepElapsed >= 0
                    ? spring({
                        frame: stepElapsed,
                        fps: safeFps,
                        config: { damping: 24, stiffness: 165, mass: 1.0 },
                      })
                    : 0;
                const stepOpacity =
                  stepElapsed >= 0
                    ? interpolate(stepElapsed, [0, Math.max(4, Math.round(0.22 * safeFps))], [0, 1], {
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
                      gap: 11,
                      padding: '10px 13px',
                      borderRadius: 14,
                      backgroundColor: 'rgba(246, 251, 249, 0.06)',
                      border: `1.5px solid ${
                        isFinalStep ? 'rgba(20, 184, 166, 0.55)' : 'rgba(184, 228, 220, 0.18)'
                      }`,
                      opacity: stepOpacity,
                      transform: `translate3d(${((1 - stepSpring) * -16).toFixed(2)}px, 0px, 0px)`,
                    }}
                  >
                    <span
                      style={{
                        minWidth: 28,
                        height: 24,
                        padding: '0 7px',
                        borderRadius: 999,
                        backgroundColor: isFinalStep
                          ? LAUNCH_PALETTE.ACCENT
                          : LAUNCH_PALETTE.SECONDARY,
                        color: '#FFFFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {step.code}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: '#FFFFFF' }}>
                        {step.label}
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: LAUNCH_PALETTE.TERTIARY }}>
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
                backgroundColor: 'rgba(16, 185, 129, 0.18)',
                border: `1.5px solid ${EMERALD}`,
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 10.5,
                fontWeight: 900,
                letterSpacing: '0.08em',
                color: EMERALD_BORDER,
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

          {/* CENTER HERO QR MONOLITH: Pure White Luminous Optical Beacon (`352x352px` QR, 0.00deg Lock) */}
          <Interactive.Div
            name="LED Wall Hero QR Monolith"
            premountFor={safeFps}
            style={{
              position: 'relative',
              width: 472,
              borderRadius: 30,
              backgroundColor: '#FFFFFF',
              border: '2.5px solid rgba(255, 255, 255, 0.92)',
              boxShadow:
                '0 44px 96px rgba(0, 0, 0, 0.56), 0 0 88px rgba(20, 184, 166, 0.36)',
              padding: '22px 26px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              opacity: qrOpacity,
              boxSizing: 'border-box',
              overflow: 'hidden',
              transform: isQrOrthogonalLocked
                ? 'none'
                : `translate3d(0px, ${qrTranslateY.toFixed(2)}px, 0px) rotateX(${qrRotateX.toFixed(2)}deg) rotateY(${qrRotateY.toFixed(2)}deg) scale(${qrScale.toFixed(4)})`,
            }}
          >
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
                fontSize: 11.5,
                fontWeight: 900,
                letterSpacing: '0.13em',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: LAUNCH_PALETTE.ACCENT,
                  transform: `scale(${liveDotScale.toFixed(3)})`,
                }}
              />
              <span>IMBAS QR DI SKRIN LED SEKARANG</span>
            </div>

            {/* Pure White 28px Quiet Zone Frame + 352x352px Contrast QR */}
            <div
              style={{
                position: 'relative',
                width: 408,
                height: 408,
                padding: 28,
                borderRadius: 22,
                backgroundColor: '#FFFFFF',
                border: '1.5px solid rgba(11, 36, 32, 0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              <QRCode
                value={safePortalUrl}
                size={352}
                fgColor="#061714"
                bgColor="#FFFFFF"
                level="M"
              />

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
                    borderTop: `4.5px solid ${LAUNCH_PALETTE.SECONDARY}`,
                    borderLeft: `4.5px solid ${LAUNCH_PALETTE.SECONDARY}`,
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
                    borderBottom: `4.5px solid ${LAUNCH_PALETTE.SECONDARY}`,
                    borderRight: `4.5px solid ${LAUNCH_PALETTE.SECONDARY}`,
                    borderBottomRightRadius: 12,
                  }}
                />
              </div>
            </div>

            <div
              style={{
                width: '100%',
                padding: '9px 18px',
                borderRadius: 15,
                backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                textAlign: 'center',
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  color: '#061714',
                }}
              >
                {displayDomain}
              </span>
            </div>

            <div
              style={{
                padding: '5px 14px',
                borderRadius: 999,
                backgroundColor: 'rgba(13, 148, 136, 0.14)',
                border: '1px solid rgba(13, 148, 136, 0.35)',
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 10.5,
                fontWeight: 900,
                color: '#0B2420',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {safeStudents.toLocaleString('en-US')}+ MAHASISWA TELAH MENDAFTAR
            </div>
          </Interactive.Div>

          {/* RIGHT COCKPIT CARD (-7deg inward): Dark-Teal 8-Module Checklist + Live Counter */}
          <Interactive.Div
            name="Right Upright Modules Card"
            premountFor={safeFps}
            style={{
              width: 378,
              padding: '22px 24px',
              borderRadius: 26,
              backgroundColor: 'rgba(11, 36, 32, 0.94)',
              border: '1.5px solid rgba(20, 184, 166, 0.36)',
              borderBottom: `6px solid ${EMERALD}`,
              boxShadow: '0 28px 60px rgba(0, 0, 0, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              gap: 13,
              opacity: satOpacity,
              transform: `translate3d(0px, ${satRiseY.toFixed(2)}px, 45px) rotateY(-7deg) scale(${satScale.toFixed(4)})`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11,
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {MODULE_SPECTRUM_LIST.map((mod) => (
                <div
                  key={mod.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 12,
                    backgroundColor: 'rgba(246, 251, 249, 0.08)',
                    border: '1px solid rgba(184, 228, 220, 0.22)',
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
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
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
                backgroundColor: '#0D9488',
                border: '1px solid rgba(184, 228, 220, 0.48)',
                color: '#FFFFFF',
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 12,
                fontWeight: 900,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <CheckCircle2 size={15} color="#A7F3D0" strokeWidth={2.5} />
                <span>{safeStudents.toLocaleString('en-US')}+ Pelajar Dah Mendaftar</span>
              </span>
              <span>✓</span>
            </div>
          </Interactive.Div>
        </div>
      </div>

      <EditorialFrameMarks
        dark
        chapterCode="09"
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
    default: 2841,
    min: 1,
    max: 50000,
    integer: true,
    hiddenFromList: false,
    description: 'Registered Students Count',
  },
} as const satisfies InteractivitySchema;

export const ClosingVaultScene = Interactive.withSchema({
  Component: ClosingVaultInner,
  componentName: 'ClosingVaultScene',
  schema: closingVaultSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
