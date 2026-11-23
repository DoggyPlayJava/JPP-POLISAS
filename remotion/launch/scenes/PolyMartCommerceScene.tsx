import React from 'react';
import {
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import { Circle, Pie } from '@remotion/shapes';
import {
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Flame,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { GeometricSparkBurst, GhostCursor, type GhostCursorKeyframe } from '../motion/MotionActors';
import {
  MODULE_CONTENT_ENTER_OFFSET,
  Module3DIntroBumper,
} from '../motion/Module3DIntroBumper';
import { WHIP_S_CURVE } from '../motion/transitions';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE, LUXURY_SPRING } from '../tokens';
import { DeterministicQrMatrix, KineticWindow, SpatialFloorGrid } from '../ui/KineticCard';

const AMBER = LAUNCH_MODULE_THEMES.polymart.primary; // #F59E0B
const AMBER_DARK = LAUNCH_MODULE_THEMES.polymart.dark; // #D97706
const AMBER_INK = '#B45309'; // WCAG AA+ Amber-700
const AMBER_SOFT = LAUNCH_MODULE_THEMES.polymart.soft; // #FFFBEB
const AMBER_BORDER = LAUNCH_MODULE_THEMES.polymart.border; // #FDE68A

const EMERALD = LAUNCH_MODULE_THEMES.polymaps.primary; // #10B981
const EMERALD_INK = '#047857';
const EMERALD_SOFT = LAUNCH_MODULE_THEMES.polymaps.soft; // #ECFDF5
const EMERALD_BORDER = LAUNCH_MODULE_THEMES.polymaps.border; // #A7F3D0

export type PolyMartProps = {
  readonly productsCount: number;
  readonly ordersCount: number;
  readonly headline: string;
};

type MenuProductSpec = {
  readonly id: string;
  readonly title: string;
  readonly desc: string;
  readonly priceRm: number;
  readonly tag: string;
  readonly vendor: string;
  readonly prepMins: number;
  readonly rating: string;
  readonly reviews: number;
  readonly clickFrame: number;
  readonly flyStartFrame: number;
  readonly baseX: number;
  readonly baseY: number;
  readonly baseZ: number;
  readonly baseScale: number;
  readonly baseOpacity: number;
  readonly width: number;
  readonly height: number;
};

const STUDENT_HEADLINE_DEFAULT = 'Lapar Lepas Kelas? Pesan Terus Tanpa Beratur.';
const LEGACY_HEADLINE = 'niaga & kediaman dalam genggaman.';

const resolveStudentHeadline = (headline: string): string => {
  const trimmed = headline.trim();
  if (!trimmed || trimmed.toLowerCase() === LEGACY_HEADLINE) {
    return STUDENT_HEADLINE_DEFAULT;
  }
  return trimmed;
};

const O = MODULE_CONTENT_ENTER_OFFSET; // 132f bumper handoff

const MENU_PRODUCTS: readonly MenuProductSpec[] = [
  {
    id: 'chicken-popcorn',
    title: 'Chicken Popcorn Cheese',
    desc: 'Popcorn rangup & lelehan sos keju pedas',
    priceRm: 9,
    tag: 'PALING LARIS',
    vendor: 'Quadra H Bistro',
    prepMins: 5,
    rating: '4.9',
    reviews: 142,
    clickFrame: O + 56,
    flyStartFrame: O + 58,
    baseX: 16,
    baseY: 78,
    baseZ: 72,
    baseScale: 1,
    baseOpacity: 1,
    width: 428,
    height: 544,
  },
  {
    id: 'loaded-fries',
    title: 'Loaded Crinkle Fries',
    desc: 'Kentang keju nacho, herba & serbuk cili',
    priceRm: 6,
    tag: 'SIAP 4 MIN',
    vendor: 'Kafeteria Blok D',
    prepMins: 4,
    rating: '4.8',
    reviews: 96,
    clickFrame: O + 92,
    flyStartFrame: O + 94,
    baseX: 462,
    baseY: 102,
    baseZ: -45,
    baseScale: 0.94,
    baseOpacity: 0.9,
    width: 384,
    height: 496,
  },
  {
    id: 'lanyard-jpp',
    title: 'Set Lanyard Rasmi JPP',
    desc: 'Tenun Teal-Emas POLISAS + pemegang ID',
    priceRm: 12,
    tag: 'EDISI 2026/2027',
    vendor: 'Kiosk Kelab EKPP',
    prepMins: 2,
    rating: '5.0',
    reviews: 210,
    clickFrame: O + 128,
    flyStartFrame: O + 130,
    baseX: 826,
    baseY: 128,
    baseZ: -100,
    baseScale: 0.88,
    baseOpacity: 0.78,
    width: 356,
    height: 460,
  },
];

const PREP_STAGES = [
  { label: 'Bayaran JPP Pay Lunas', time: '12:31 PM' },
  { label: 'Pesanan Sedang Disiapkan', time: '12:34 PM' },
  { label: 'Sedia Di Kaunter Ekspres', time: '12:36 PM' },
] as const;

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

// Cursor moves across the Right 3D Stage (relative to right-stage container 0..1188 x 0..736)
// Shifted cleanly after the 132f 3D Module Bumper handoff and exits well before Shot 2 flip.
const MENU_CURSOR_KEYFRAMES: readonly GhostCursorKeyframe[] = [
  { frame: O + 22, x: 180, y: 260, label: 'PILIH MENU' },
  { frame: O + 56, x: 342, y: 572, click: true, label: '+ BAKUL (RM 9)' },
  { frame: O + 92, x: 738, y: 550, click: true, label: '+ BAKUL (RM 6)' },
  { frame: O + 128, x: 1080, y: 536, click: true, label: '+ BAKUL (RM 12)' },
  { frame: O + 146, x: 1080, y: 536 },
];

const POLYMART_PHOTO_SRC: Record<string, string> = {
  'chicken-popcorn': staticFile('launch-photos/polymart/chicken-popcorn.jpg'),
  'loaded-fries': staticFile('launch-photos/polymart/loaded-fries.jpg'),
  'lanyard-jpp': staticFile('launch-photos/polymart/lanyard-jpp.jpg'),
};

const renderMenuIllustration = (
  id: string,
  vendor: string,
  isHero: boolean,
  rating: string,
  reviews: number,
  frame: number,
  fps: number,
) => {
  const artHeight = isHero ? 214 : 172;
  const photoSrc = POLYMART_PHOTO_SRC[id] ?? POLYMART_PHOTO_SRC['chicken-popcorn'];
  const kenBurnsProgress = interpolate(frame, [O, O + 240], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const kenBurnsScale = 1.02 + kenBurnsProgress * 0.06;

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        minHeight: artHeight,
        height: artHeight,
        borderRadius: 20,
        overflow: 'hidden',
        border: `1.5px solid ${isHero ? AMBER_BORDER : LAUNCH_PALETTE.TERTIARY}`,
        backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
        transformStyle: 'preserve-3d',
      }}
    >
      <CanvasImage
        name={`polymart-photo-${id}`}
        src={photoSrc}
        premountFor={fps}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          transform: `scale(${kenBurnsScale.toFixed(4)})`,
        }}
      />

      {/* Warm Culinary Bottom Vignette for Crisp Vendor Label Contrast */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(6, 23, 20, 0.06) 0%, rgba(6, 23, 20, 0) 44%, rgba(6, 23, 20, 0.72) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating Top-Right Star Rating Pill */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          padding: '4px 10px',
          borderRadius: 999,
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          border: '1px solid rgba(217, 119, 6, 0.34)',
          boxShadow: '0 8px 18px rgba(6, 23, 20, 0.22)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          transform: 'translateZ(26px)',
        }}
      >
        <Star size={11} fill="#F59E0B" color="#F59E0B" strokeWidth={2.2} />
        <span
          style={{
            fontFamily: LAUNCH_FONTS.MONO,
            fontSize: 10.5,
            fontWeight: 900,
            color: LAUNCH_PALETTE.PRIMARY,
          }}
        >
          {rating} ({reviews})
        </span>
      </div>

      {/* Floating Bottom-Left Vendor Name Pill */}
      <div
        style={{
          position: 'absolute',
          left: 10,
          bottom: 10,
          padding: '5px 11px',
          borderRadius: 999,
          backgroundColor: 'rgba(6, 23, 20, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          boxShadow: '0 8px 18px rgba(6, 23, 20, 0.24)',
          color: '#FFFFFF',
          fontFamily: LAUNCH_FONTS.MONO,
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: '0.09em',
          transform: 'translateZ(22px)',
        }}
      >
        {vendor.toUpperCase()}
      </div>
    </div>
  );
};

const PolyMartCommerceInner: React.FC<PolyMartProps> = ({
  productsCount,
  ordersCount,
  headline,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeProductsCount = Number.isFinite(productsCount)
    ? Math.max(0, Math.round(productsCount))
    : 277;
  const safeOrdersCount = Number.isFinite(ordersCount)
    ? Math.max(0, Math.round(ordersCount))
    : 344;
  const resolvedHeadline = resolveStudentHeadline(headline);
  const timeSec = frame / safeFps;

  // Seamless zero-flash bumper handoff (132..168f)
  const contentRevealT = interpolate(frame, [O, O + 36], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  // Header timing (shifted +132f for slow-paced luxury rhythm)
  const wordStagger = Math.max(2, Math.round(0.05 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.32 * safeFps));

  // Left Cart HUD entrance
  const cartHudSpring = spring({
    frame: Math.max(0, frame - (O + 6)),
    fps: safeFps,
    config: LUXURY_SPRING,
  });
  const cartHudOpacity = interpolate(frame, [O + 4, O + 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cartHudX = (1 - cartHudSpring) * -32;

  // Shot 1 cart state (items click at +56f, +92f, +128f -> settled by O+146 / local 278f)
  const addedStates = MENU_PRODUCTS.map((item) => frame >= item.clickFrame);
  const cartCount = addedStates.filter(Boolean).length;
  const cartTotalRm = MENU_PRODUCTS.reduce(
    (sum, item, idx) => sum + (addedStates[idx] ? item.priceRm : 0),
    0,
  );
  const allAdded = cartCount === MENU_PRODUCTS.length;

  // Shot 1 -> Shot 2 Convergence & 180-deg Y-Axis Card Flip (O+236f .. O+308f = 368f .. 440f)
  const carouselConvergeT = interpolate(frame, [O + 236, O + 266], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  const flipEntryT = interpolate(frame, [O + 244, O + 264], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const flipPhaseT = interpolate(frame, [O + 258, O + 308], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  const flipDeg = interpolate(flipPhaseT, [0, 1], [0, 180]);
  const showFlipAssembly = frame >= O + 244;
  const showCarousel = frame < O + 268;

  // Live Kitchen Prep Progress Pie inside JPP PAY #344 Express Pass (432f .. 486f -> locked cleanly before f_1560 / local 522f!)
  const kitchenProgress = interpolate(frame, [O + 300, O + 354], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const isPassReady = frame >= O + 352;
  const readyStampSpring = isPassReady
    ? spring({
        frame: frame - (O + 352),
        fps: safeFps,
        config: LUXURY_SPRING,
      })
    : 0;

  // Live vertical QR laser sweep inside Express Pass
  const laserCycle = ((frame - (O + 306)) % 72 + 72) % 72;
  const laserY = interpolate(laserCycle, [0, 36, 72], [12, 160, 12]);
  const liveDotScale = 0.86 + Math.sin(timeSec * 4.8) * 0.16;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.polymart.tint} />

      <Module3DIntroBumper
        moduleIndex="MODUL 03"
        moduleCategory="KAFETERIA & JPP PAY"
        moduleName="PolyMart"
        tagline="Pesan Makanan Kafeteria Tanpa Beratur"
        morphMode="unbox-carousel-fan"
        accentColor={LAUNCH_MODULE_THEMES.polymart.primary}
        darkColor={LAUNCH_MODULE_THEMES.polymart.dark}
        softColor={LAUNCH_MODULE_THEMES.polymart.soft}
        borderColor={LAUNCH_MODULE_THEMES.polymart.border}
        icon={<ShoppingBag size={96} color="#FFFFFF" strokeWidth={2.1} />}
        features={[
          { icon: <UtensilsCrossed size={15} strokeWidth={2.4} />, label: '277+ Menu Siswa' },
          { icon: <Zap size={15} strokeWidth={2.4} />, label: 'Pesan Ekspres' },
          { icon: <CreditCard size={15} strokeWidth={2.4} />, label: 'JPP Pay QR' },
        ]}
      />

      <CameraStage
        zoomFrom={0.995}
        zoomTo={1.018}
        panXFrom={0}
        panXTo={0}
        panYFrom={3}
        panYTo={-3}
        tiltXFrom={0}
        tiltXTo={0}
        tiltYFrom={-0.35}
        tiltYTo={0.35}
        breathingAmplitude={0.35}
        entryZoomOffset={0.025}
        entryPanXOffset={24}
        entryFrames={Math.round(0.45 * safeFps)}
        exitZoomDelta={0.015}
        exitFrames={Math.round(0.35 * safeFps)}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: contentRevealT,
            transform: `translate3d(0px, ${((1 - contentRevealT) * 22).toFixed(2)}px, 0px) scale(${interpolate(contentRevealT, [0, 1], [0.96, 1]).toFixed(4)})`,
          }}
        >
        {/* 3D Amber/Emerald Horizon Perspective Floor Grid */}
        <SpatialFloorGrid
          accentColor={AMBER}
          secondaryColor={EMERALD}
          gridOpacity={0.22}
          scrollSpeed={16}
        />

        {/* Top Editorial Header Lockup */}
        <div
          style={{
            position: 'absolute',
            left: 88,
            right: 88,
            top: 74,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 28,
            fontFamily: LAUNCH_FONTS.DISPLAY,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 1240 }}>
            <KineticReveal startFrame={O + 4} durationFrames={18}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 14px',
                  borderRadius: 999,
                  backgroundColor: AMBER_SOFT,
                  border: `1.5px solid ${AMBER_BORDER}`,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: AMBER,
                    transform: `scale(${liveDotScale.toFixed(3)})`,
                  }}
                />
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: '0.14em',
                    color: AMBER_INK,
                  }}
                >
                  BAB 03 • POLYMART &amp; JPP PAY • {safeProductsCount}+ MENU KAMPUS
                </span>
              </div>
            </KineticReveal>

            <KineticWords
              as="h1"
              text={resolvedHeadline}
              startFrame={O + 8}
              staggerFrames={wordStagger}
              wordDurationFrames={wordDuration}
              accentWords={['Pesan', 'Terus']}
              accentColor={AMBER_INK}
              style={{
                margin: 0,
                fontSize: 45,
                fontWeight: 900,
                letterSpacing: '-0.032em',
                lineHeight: 1.07,
                color: LAUNCH_PALETTE.PRIMARY,
              }}
            />
          </div>

          <KineticReveal startFrame={O + 18} durationFrames={22}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 18px',
                borderRadius: 16,
                backgroundColor: isPassReady ? EMERALD_SOFT : LAUNCH_PALETTE.CARD_BG,
                border: `1.5px solid ${isPassReady ? EMERALD_BORDER : LAUNCH_PALETTE.TERTIARY}`,
                boxShadow: '0 12px 26px rgba(6, 23, 20, 0.08)',
              }}
            >
              <CreditCard
                size={18}
                color={isPassReady ? EMERALD_INK : AMBER_INK}
                strokeWidth={2.4}
              />
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: '0.07em',
                  color: isPassReady ? EMERALD_INK : LAUNCH_PALETTE.PRIMARY,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                {isPassReady
                  ? `PESANAN #${safeOrdersCount} • SIAP DIAMBIL ✓`
                  : `${cartCount} ITEM DI BAKUL • RM ${cartTotalRm.toFixed(2)}`}
              </span>
            </div>
          </KineticReveal>
        </div>

        {/* Main 2-Zone Stage: Left Upright 0-deg Cart HUD + Right Spacious 3D Perspective Stage */}
        <div
          style={{
            position: 'absolute',
            left: 88,
            right: 88,
            top: 212,
            height: 736,
            display: 'flex',
            alignItems: 'center',
            gap: 36,
            fontFamily: LAUNCH_FONTS.DISPLAY,
            zIndex: 8,
          }}
        >
          {/* LEFT UPRIGHT FOCAL JPP PAY CART HUD (0-deg Orthogonal) */}
          <div
            style={{
              width: 520,
              height: 736,
              flexShrink: 0,
              opacity: cartHudOpacity,
              transform: `translate3d(${cartHudX.toFixed(2)}px, 0px, 0px)`,
            }}
          >
            <KineticWindow
              surface="light"
              routeLabel="/portal/polymart/bakul"
              statusPill={isPassReady ? `PAS #${safeOrdersCount} SAH` : `${cartCount}/3 ITEM`}
              statusAccent
              accentColor={isPassReady ? EMERALD : AMBER}
              accentSoftBg={isPassReady ? EMERALD_SOFT : AMBER_SOFT}
              accentBorderColor={isPassReady ? EMERALD_BORDER : AMBER_BORDER}
              width={520}
              height={736}
              sheenStartFrame={isPassReady ? O + 352 : O + 130}
              sheenDuration={36}
              style={{
                borderBottom: `6px solid ${isPassReady ? EMERALD : AMBER}`,
                boxShadow: '0 28px 60px rgba(217, 119, 6, 0.14)',
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: '22px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                }}
              >
                {/* Cart Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 12,
                    borderBottom: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: isPassReady ? EMERALD_SOFT : AMBER_SOFT,
                        border: `1.5px solid ${isPassReady ? EMERALD_BORDER : AMBER_BORDER}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Receipt
                        size={22}
                        color={isPassReady ? EMERALD_INK : AMBER_INK}
                        strokeWidth={2.3}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                        Bakul JPP Pay Siswa
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: LAUNCH_PALETTE.INK_SOFT }}>
                        Ambil di Kaunter Ekspres Kafeteria
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      backgroundColor: allAdded ? EMERALD_INK : AMBER_DARK,
                      color: '#FFFFFF',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 13,
                      fontWeight: 900,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {cartCount} ITEM
                  </div>
                </div>

                {/* Live Cart Line Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {MENU_PRODUCTS.map((item, idx) => {
                    const isAdded = addedStates[idx];
                    const itemSpring = isAdded
                      ? spring({
                          frame: frame - item.clickFrame,
                          fps: safeFps,
                          config: { damping: 16, stiffness: 220, mass: 0.85 },
                        })
                      : 0;
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 16,
                          backgroundColor: isAdded ? '#FFFFFF' : LAUNCH_PALETTE.SURFACE_MUTED,
                          border: `1.5px solid ${
                            isAdded
                              ? isPassReady
                                ? EMERALD_BORDER
                                : AMBER
                              : LAUNCH_PALETTE.TERTIARY
                          }`,
                          opacity: isAdded ? 1 : 0.54,
                          transform: `translate3d(${((1 - itemSpring) * -8).toFixed(1)}px, 0px, 0px)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 12,
                              backgroundColor: isAdded
                                ? isPassReady
                                  ? EMERALD_SOFT
                                  : AMBER_SOFT
                                : LAUNCH_PALETTE.CARD_BG,
                              border: `1px solid ${
                                isAdded ? (isPassReady ? EMERALD_BORDER : AMBER_BORDER) : LAUNCH_PALETTE.TERTIARY
                              }`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {item.id === 'chicken-popcorn' ? (
                              <Flame
                                size={18}
                                color={
                                  isAdded ? (isPassReady ? EMERALD_INK : AMBER_INK) : LAUNCH_PALETTE.INK_SOFT
                                }
                                strokeWidth={2.3}
                              />
                            ) : item.id === 'loaded-fries' ? (
                              <UtensilsCrossed
                                size={18}
                                color={
                                  isAdded ? (isPassReady ? EMERALD_INK : AMBER_INK) : LAUNCH_PALETTE.INK_SOFT
                                }
                                strokeWidth={2.3}
                              />
                            ) : (
                              <ShoppingBag
                                size={18}
                                color={
                                  isAdded ? (isPassReady ? EMERALD_INK : AMBER_INK) : LAUNCH_PALETTE.INK_SOFT
                                }
                                strokeWidth={2.3}
                              />
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span
                              style={{
                                fontSize: 15,
                                fontWeight: 900,
                                color: LAUNCH_PALETTE.PRIMARY,
                              }}
                            >
                              {item.title}
                            </span>
                            <span
                              style={{
                                fontSize: 11.5,
                                fontWeight: 600,
                                color: LAUNCH_PALETTE.INK_SOFT,
                              }}
                            >
                              {item.vendor} • {item.prepMins} min
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 15,
                              fontWeight: 900,
                              color: isAdded ? LAUNCH_PALETTE.PRIMARY : LAUNCH_PALETTE.INK_SOFT,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            RM {item.priceRm}.00
                          </span>
                          {isAdded ? (
                            <span
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 999,
                                backgroundColor: EMERALD_INK,
                                color: '#FFFFFF',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Check size={13} strokeWidth={3} />
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotal Breakdown Card */}
                <div
                  style={{
                    padding: '16px 18px',
                    borderRadius: 18,
                    backgroundColor: isPassReady ? EMERALD_SOFT : AMBER_SOFT,
                    border: `2px solid ${isPassReady ? EMERALD : AMBER_BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: '0.1em',
                        color: isPassReady ? EMERALD_INK : AMBER_INK,
                      }}
                    >
                      {isPassReady ? `JPP PAY • PESANAN #${safeOrdersCount}` : 'JUMLAH BAYARAN JPP PAY'}
                    </span>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: LAUNCH_PALETTE.MUTED_OLIVE,
                      }}
                    >
                      {isPassReady ? 'Lunas Tanpa Tunai • Resit Digital' : '0% Caj Tambahan Pelajar'}
                    </span>
                  </div>

                  <EditorialAnnotation
                    type="highlight"
                    startFrame={O + 132}
                    durationFrames={24}
                    color="rgba(245, 158, 11, 0.28)"
                    padding={{ top: 2, right: 6, bottom: 2, left: 6 }}
                  >
                    <span
                      style={{
                        fontSize: 38,
                        fontWeight: 900,
                        letterSpacing: '-0.03em',
                        color: isPassReady ? EMERALD_INK : LAUNCH_PALETTE.PRIMARY,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      RM {cartTotalRm.toFixed(2)}
                    </span>
                  </EditorialAnnotation>
                </div>

                {/* Express Checkout Action Status Pill */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 16,
                    backgroundColor: isPassReady
                      ? EMERALD_INK
                      : allAdded
                        ? LAUNCH_PALETTE.PRIMARY_DARK
                        : LAUNCH_PALETTE.PRIMARY,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: isPassReady
                      ? '0 14px 30px rgba(4, 120, 87, 0.28)'
                      : '0 10px 22px rgba(6, 23, 20, 0.14)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    {isPassReady ? (
                      <CheckCircle2 size={18} color={EMERALD_BORDER} strokeWidth={2.5} />
                    ) : (
                      <Sparkles size={18} color={AMBER} strokeWidth={2.5} />
                    )}
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12,
                        fontWeight: 900,
                        letterSpacing: '0.07em',
                      }}
                    >
                      {isPassReady
                        ? 'DIBAYAR • KAUNTER EKSPRES SIAP ✓'
                        : allAdded
                          ? '3 ITEM MASUK • SEDIA JPP PAY'
                          : 'PILIH MENU UNTUK JPP PAY'}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(255, 255, 255, 0.16)',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    {safeOrdersCount} PAS
                  </span>
                </div>
              </div>
            </KineticWindow>
          </div>

          {/* RIGHT SPACIOUS 3D PERSPECTIVE STAGE (Width ~1188px) */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              height: 736,
              perspective: '1650px',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Concentric Subtle Amber/Emerald Floor Rings Beneath Stage */}
            <svg
              aria-hidden
              width={1180}
              height={340}
              viewBox="0 0 1180 340"
              style={{
                position: 'absolute',
                left: 0,
                bottom: -14,
                pointerEvents: 'none',
                transform: 'translate3d(0px, 0px, -135px) rotateX(66deg)',
                opacity: 0.72,
              }}
            >
              <circle cx={590} cy={170} r={140} fill="none" stroke={AMBER} strokeOpacity={0.28} strokeWidth={2} />
              <circle cx={590} cy={170} r={240} fill="none" stroke={EMERALD} strokeOpacity={0.2} strokeWidth={1.8} strokeDasharray="8 10" />
              <circle cx={590} cy={170} r={340} fill="none" stroke={AMBER} strokeOpacity={0.14} strokeWidth={1.5} />
            </svg>

            {/* SHOT 1: 3D Z-DEPTH MENU CAROUSEL */}
            {showCarousel ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  transformStyle: 'preserve-3d',
                  pointerEvents: 'none',
                }}
              >
                {MENU_PRODUCTS.map((item, idx) => {
                  const enterSpring = spring({
                    frame: Math.max(0, frame - (O + 12 + idx * 9)),
                    fps: safeFps,
                    config: LUXURY_SPRING,
                  });
                  const isAdded = addedStates[idx];
                  const isHero = idx === 0;

                  // Smoothly converge cards into center before 180-deg flip morph
                  const currX = interpolate(carouselConvergeT, [0, 1], [item.baseX, 340]);
                  const currY =
                    interpolate(carouselConvergeT, [0, 1], [item.baseY, 92]) +
                    (1 - enterSpring) * 34;
                  const currZ = interpolate(carouselConvergeT, [0, 1], [item.baseZ, isHero ? 74 : -140]);
                  const currOpacity =
                    enterSpring *
                    (isHero
                      ? interpolate(carouselConvergeT, [0.75, 1], [1, 0], {
                          extrapolateLeft: 'clamp',
                          extrapolateRight: 'clamp',
                        })
                      : item.baseOpacity *
                        interpolate(carouselConvergeT, [0, 0.75], [1, 0], {
                          extrapolateLeft: 'clamp',
                          extrapolateRight: 'clamp',
                        }));
                  const currScale = interpolate(
                    carouselConvergeT,
                    [0, 1],
                    [item.baseScale, isHero ? 0.96 : 0.8],
                  );
                  const rotY = isHero ? -5 : -6;
                  const rotX = 3;

                  // Parabolic flying +1 orb toward Cart HUD right after tap
                  const flyT = interpolate(
                    frame,
                    [item.flyStartFrame, item.flyStartFrame + 24],
                    [0, 1],
                    {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                      easing: EXPO_OUT,
                    },
                  );
                  const showOrb = flyT > 0.02 && flyT < 0.98;
                  const orbX = interpolate(flyT, [0, 1], [currX + item.width * 0.5, -140]);
                  const orbY =
                    interpolate(flyT, [0, 1], [currY + item.height * 0.68, 280]) -
                    Math.sin(flyT * Math.PI) * 90;

                  return (
                    <React.Fragment key={item.id}>
                      <div
                        style={{
                          position: 'absolute',
                          left: currX,
                          top: currY,
                          width: item.width,
                          height: item.height,
                          borderRadius: 28,
                          backgroundColor: isHero ? '#FFFFFF' : LAUNCH_PALETTE.BACKGROUND,
                          border: `2px solid ${
                            isAdded
                              ? EMERALD
                              : isHero
                                ? AMBER
                                : LAUNCH_PALETTE.TERTIARY
                          }`,
                          borderBottom: `7px solid ${
                            isAdded ? EMERALD_INK : isHero ? AMBER_DARK : LAUNCH_PALETTE.SECONDARY
                          }`,
                          boxShadow: isHero
                            ? '0 34px 72px rgba(6, 23, 20, 0.18), 0 0 0 1px rgba(245, 158, 11, 0.2)'
                            : '0 22px 48px rgba(6, 23, 20, 0.14)',
                          opacity: currOpacity,
                          transformOrigin: '50% 50%',
                          transform: `translate3d(0px, 0px, ${currZ.toFixed(1)}px) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${currScale.toFixed(4)})`,
                          padding: isHero ? '24px 26px' : '20px 22px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 14,
                        }}
                      >
                        {/* Top Tag + Prep Time */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '5px 11px',
                              borderRadius: 999,
                              backgroundColor: isHero ? AMBER_SOFT : LAUNCH_PALETTE.SURFACE_MUTED,
                              border: `1.5px solid ${isHero ? AMBER_BORDER : LAUNCH_PALETTE.TERTIARY}`,
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11,
                              fontWeight: 900,
                              letterSpacing: '0.09em',
                              color: isHero ? AMBER_INK : LAUNCH_PALETTE.PRIMARY,
                            }}
                          >
                            <Flame size={12} color={AMBER_INK} strokeWidth={2.5} />
                            {item.tag}
                          </span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11.5,
                              fontWeight: 800,
                              color: EMERALD_INK,
                            }}
                          >
                            <Clock size={12} color={EMERALD_INK} strokeWidth={2.5} />
                            {item.prepMins} MIN SIAP
                          </span>
                        </div>

                        {/* Full-Bleed Real Culinary & Merch Photography Plate */}
                        {renderMenuIllustration(
                          item.id,
                          item.vendor,
                          isHero,
                          item.rating,
                          item.reviews,
                          frame,
                          safeFps,
                        )}

                        {/* Product Title & Price */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span
                            style={{
                              fontSize: isHero ? 26 : 22,
                              fontWeight: 900,
                              letterSpacing: '-0.02em',
                              color: LAUNCH_PALETTE.PRIMARY,
                            }}
                          >
                            {item.title}
                          </span>
                          <span
                            style={{
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: LAUNCH_PALETTE.INK_SOFT,
                            }}
                          >
                            {item.desc}
                          </span>
                        </div>

                        {/* Price + Add-to-Cart Button Pill */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <span
                            style={{
                              fontSize: isHero ? 30 : 25,
                              fontWeight: 900,
                              color: LAUNCH_PALETTE.PRIMARY,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            RM {item.priceRm}.00
                          </span>

                          <div
                            style={{
                              padding: isHero ? '11px 16px' : '9px 13px',
                              borderRadius: 14,
                              backgroundColor: isAdded ? EMERALD_INK : AMBER_DARK,
                              color: '#FFFFFF',
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: isHero ? 12 : 11,
                              fontWeight: 900,
                              letterSpacing: '0.07em',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              boxShadow: isAdded
                                ? '0 10px 20px rgba(4, 120, 87, 0.26)'
                                : '0 10px 20px rgba(217, 119, 6, 0.25)',
                            }}
                          >
                            {isAdded ? (
                              <>
                                <Check size={14} strokeWidth={3} />
                                <span>DI BAKUL JPP PAY</span>
                              </>
                            ) : (
                              <span>+ MASUK BAKUL</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {showOrb ? (
                        <div
                          style={{
                            position: 'absolute',
                            left: orbX,
                            top: orbY,
                            width: 44,
                            height: 44,
                            borderRadius: 999,
                            backgroundColor: AMBER,
                            border: '2px solid #FFFFFF',
                            color: '#FFFFFF',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 14,
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 12px 24px rgba(217, 119, 6, 0.36)',
                            transform: 'translate(-50%, -50%) translateZ(120px)',
                            zIndex: 25,
                          }}
                        >
                          +1
                        </div>
                      ) : null}
                    </React.Fragment>
                  );
                })}

                {/* Spark burst when 3rd item drops in */}
                <GeometricSparkBurst
                  triggerFrame={O + 130}
                  x={1080}
                  y={536}
                  durationFrames={30}
                  radius={72}
                  count={10}
                  seed="polymart-cart-complete"
                  colors={[AMBER, EMERALD, '#FFFFFF']}
                />

                {/* Animated Cursor confined to Shot 1 (exits cleanly before Shot 2 flip) */}
                <GhostCursor
                  keyframes={MENU_CURSOR_KEYFRAMES}
                  appearFrame={O + 22}
                  disappearFrame={O + 146}
                  color={LAUNCH_PALETTE.PRIMARY_DARK}
                  rippleColor={AMBER}
                />
              </div>
            ) : null}

            {/* SHOT 2: TRUE 2-FACE 180° 3D Y-AXIS FLIP -> GIANT HERO JPP PAY #344 EXPRESS PASS */}
            {showFlipAssembly ? (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: 840,
                  height: 560,
                  opacity: flipEntryT,
                  transformStyle: 'preserve-3d',
                  transform: `translate(-50%, -50%) translateZ(72px) rotateX(3.5deg) rotateY(-4deg) scale(${(0.84 + 0.16 * flipEntryT).toFixed(4)})`,
                }}
              >
                {/* FRONT FACE (0deg -> 180deg) */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 30,
                    backgroundColor: '#FFFFFF',
                    border: `2.5px solid ${AMBER}`,
                    boxShadow: '0 34px 76px rgba(6, 23, 20, 0.2)',
                    backfaceVisibility: 'hidden',
                    transform: `rotateY(${flipDeg.toFixed(2)}deg)`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    padding: 36,
                  }}
                >
                  <div
                    style={{
                      width: 82,
                      height: 82,
                      borderRadius: 24,
                      backgroundColor: AMBER_SOFT,
                      border: `2px solid ${AMBER}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CreditCard size={40} color={AMBER_INK} strokeWidth={2.3} />
                  </div>
                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 13,
                      fontWeight: 900,
                      letterSpacing: '0.16em',
                      color: AMBER_INK,
                    }}
                  >
                    MEMPROSES JPP PAY TANPA TUNAI...
                  </span>
                  <span style={{ fontSize: 38, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                    3 Item · RM {cartTotalRm.toFixed(2)}
                  </span>
                </div>

                {/* BACK FACE (-180deg -> 0deg, guaranteed upright & un-mirrored!) */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 30,
                    backgroundColor: '#FFFFFF',
                    border: `2.5px solid ${EMERALD}`,
                    borderBottom: `8px solid ${EMERALD_INK}`,
                    boxShadow: '0 38px 86px rgba(4, 120, 87, 0.24)',
                    backfaceVisibility: 'hidden',
                    transform: `rotateY(${(flipDeg - 180).toFixed(2)}deg)`,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Pass Header Bar */}
                  <div
                    style={{
                      padding: '16px 26px',
                      backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          backgroundColor: EMERALD,
                          transform: `scale(${liveDotScale.toFixed(3)})`,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 14,
                          fontWeight: 900,
                          letterSpacing: '0.14em',
                        }}
                      >
                        JPP PAY • PESANAN #{safeOrdersCount}
                      </span>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 12px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(16, 185, 129, 0.22)',
                        border: `1.5px solid ${EMERALD}`,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 900,
                        color: EMERALD_BORDER,
                      }}
                    >
                      <ShieldCheck size={13} color={EMERALD_BORDER} strokeWidth={2.5} />
                      LUNAS RM {cartTotalRm.toFixed(2)}
                    </span>
                  </div>

                  {/* Pass Content Grid: Left Live Pie Kitchen Progress + Right Scannable QR Gate */}
                  <div
                    style={{
                      flex: 1,
                      padding: '24px 28px',
                      display: 'grid',
                      gridTemplateColumns: '1.15fr 0.85fr',
                      gap: 26,
                      alignItems: 'center',
                    }}
                  >
                    {/* Left Kitchen Prep Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                        {/* Live @remotion/shapes <Pie> Prep Progress Meter */}
                        <div
                          style={{
                            position: 'relative',
                            width: 112,
                            height: 112,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Circle
                            radius={48}
                            fill="none"
                            stroke="rgba(16, 185, 129, 0.16)"
                            strokeWidth={8}
                            premountFor={safeFps}
                            showInTimeline={false}
                            style={{
                              position: 'absolute',
                              left: '50%',
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                            }}
                          />
                          {kitchenProgress > 0.002 ? (
                            <Pie
                              radius={48}
                              progress={kitchenProgress}
                              closePath={false}
                              fill="none"
                              stroke={EMERALD}
                              strokeWidth={8}
                              strokeLinecap="round"
                              premountFor={safeFps}
                              showInTimeline={false}
                              style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                              }}
                            />
                          ) : null}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span
                              style={{
                                fontSize: 22,
                                fontWeight: 900,
                                color: EMERALD_INK,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {Math.round(kitchenProgress * 100)}%
                            </span>
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 9.5,
                                fontWeight: 900,
                                color: LAUNCH_PALETTE.INK_SOFT,
                              }}
                            >
                              SIAP
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11,
                              fontWeight: 900,
                              letterSpacing: '0.1em',
                              color: AMBER_INK,
                            }}
                          >
                            KAUNTER EKSPRES POLYMART
                          </span>
                          <span
                            style={{
                              fontSize: 25,
                              fontWeight: 900,
                              letterSpacing: '-0.02em',
                              color: LAUNCH_PALETTE.PRIMARY,
                              lineHeight: 1.15,
                            }}
                          >
                            Chicken Popcorn, Loaded Fries &amp; Lanyard
                          </span>
                        </div>
                      </div>

                      {/* 3-Step Prep Timeline */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {PREP_STAGES.map((stage, sIdx) => {
                          const stageThreshold = (sIdx + 1) / PREP_STAGES.length;
                          const done = kitchenProgress >= stageThreshold - 0.04;
                          return (
                            <div
                              key={stage.label}
                              style={{
                                padding: '9px 12px',
                                borderRadius: 12,
                                backgroundColor: done ? EMERALD_SOFT : LAUNCH_PALETTE.BACKGROUND,
                                border: `1.5px solid ${done ? EMERALD_BORDER : LAUNCH_PALETTE.TERTIARY}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle2
                                  size={15}
                                  color={done ? EMERALD_INK : LAUNCH_PALETTE.INK_SOFT}
                                  strokeWidth={2.6}
                                />
                                <span
                                  style={{
                                    fontSize: 13.5,
                                    fontWeight: 800,
                                    color: LAUNCH_PALETTE.PRIMARY,
                                  }}
                                >
                                  {stage.label}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: done ? EMERALD_INK : LAUNCH_PALETTE.INK_SOFT,
                                }}
                              >
                                {stage.time}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Scannable Pickup QR Card */}
                    <div
                      style={{
                        padding: '18px 18px 16px',
                        borderRadius: 22,
                        backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                        border: `2px solid ${EMERALD_BORDER}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          padding: 14,
                          borderRadius: 18,
                          backgroundColor: '#FFFFFF',
                          border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                          overflow: 'hidden',
                        }}
                      >
                        <DeterministicQrMatrix
                          seed={safeOrdersCount}
                          size={172}
                          fgColor={LAUNCH_PALETTE.PRIMARY_DARK}
                          bgColor="#FFFFFF"
                        />
                        {/* Live Emerald Scan Laser */}
                        <div
                          aria-hidden
                          style={{
                            position: 'absolute',
                            left: 8,
                            right: 8,
                            top: laserY,
                            height: 3.5,
                            borderRadius: 999,
                            backgroundColor: EMERALD,
                            boxShadow: '0 0 12px rgba(16, 185, 129, 0.8)',
                          }}
                        />
                      </div>

                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 12,
                          fontWeight: 900,
                          letterSpacing: '0.1em',
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        JPP-PAY-{safeOrdersCount} • IMBAS AMBIL
                      </span>
                    </div>
                  </div>

                  {/* Bottom Hero Confirmed Banner */}
                  <div
                    style={{
                      padding: '14px 26px',
                      backgroundColor: isPassReady ? EMERALD_INK : AMBER_DARK,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      transform: `scale(${(0.96 + 0.04 * readyStampSpring).toFixed(4)})`,
                    }}
                  >
                    <CheckCircle2 size={19} color="#FFFFFF" strokeWidth={2.6} />
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 13.5,
                        fontWeight: 900,
                        letterSpacing: '0.12em',
                      }}
                    >
                      SIAP DIAMBIL DI KAUNTER EKSPRES • TANPA BERATUR
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Celebratory Burst when Express Pass completes prep */}
            <GeometricSparkBurst
              triggerFrame={O + 354}
              x={594}
              y={260}
              durationFrames={34}
              radius={116}
              count={14}
              seed="polymart-express-ready"
              colors={[EMERALD, AMBER, '#FFFFFF']}
            />
          </div>
        </div>
        </div>
      </CameraStage>

      <EditorialFrameMarks chapterCode="03" chapterLabel="12:30 TGH HARI • KAFETERIA & JPP PAY" />
    </>
  );
};

const polyMartSchema = {
  productsCount: {
    type: 'number',
    default: 277,
    min: 0,
    max: 9999,
    integer: true,
    hiddenFromList: false,
    description: 'Products Listed Count',
  },
  ordersCount: {
    type: 'number',
    default: 344,
    min: 0,
    max: 99999,
    integer: true,
    hiddenFromList: false,
    description: 'Completed Orders Count',
  },
  headline: {
    type: 'string',
    default: STUDENT_HEADLINE_DEFAULT,
    description: 'Headline',
  },
} as const satisfies InteractivitySchema;

export const PolyMartCommerceScene = Interactive.withSchema({
  Component: PolyMartCommerceInner,
  componentName: 'PolyMartCommerceScene',
  schema: polyMartSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
