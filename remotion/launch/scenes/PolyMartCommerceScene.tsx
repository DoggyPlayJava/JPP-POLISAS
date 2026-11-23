import React from 'react';
import {
  Easing,
  Interactive,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import {
  Calculator,
  Check,
  CheckCircle2,
  Flame,
  Home,
  MapPin,
  MessageCircle,
  Plus,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Tag,
  UtensilsCrossed,
} from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { GeometricSparkBurst } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE } from '../tokens';
import { KineticWindow, SpatialFloorGrid } from '../ui/KineticCard';

const AMBER = LAUNCH_MODULE_THEMES.polymart.primary; // #F59E0B
const AMBER_DARK = LAUNCH_MODULE_THEMES.polymart.dark; // #D97706
const AMBER_INK = '#B45309'; // WCAG AA+ Amber-700 for crisp legibility on #FFFBEB / #FFFFFF
const AMBER_SOFT = LAUNCH_MODULE_THEMES.polymart.soft; // #FFFBEB
const AMBER_BORDER = LAUNCH_MODULE_THEMES.polymart.border; // #FDE68A

const CYAN = LAUNCH_MODULE_THEMES.polyrent.primary; // #06B6D4
const CYAN_DARK = LAUNCH_MODULE_THEMES.polyrent.dark; // #0891B2
const CYAN_INK = '#0E7490'; // WCAG AA+ Cyan-700
const CYAN_SOFT = LAUNCH_MODULE_THEMES.polyrent.soft; // #ECFEFF
const CYAN_BORDER = LAUNCH_MODULE_THEMES.polyrent.border; // #A5F3FC

const EMERALD = LAUNCH_MODULE_THEMES.polymaps.primary; // #10B981
const EMERALD_INK = '#047857';
const EMERALD_SOFT = LAUNCH_MODULE_THEMES.polymaps.soft; // #ECFDF5
const EMERALD_BORDER = LAUNCH_MODULE_THEMES.polymaps.border; // #A7F3D0

export type PolyMartProps = {
  readonly productsCount: number;
  readonly ordersCount: number;
  readonly headline: string;
};

const STUDENT_HEADLINE_DEFAULT = 'Lapar Lepas Kelas? Cari Bilik Sewa? Semua Di Sini.';
const LEGACY_HEADLINE = 'niaga & kediaman dalam genggaman.';

const resolveStudentHeadline = (headline: string): string => {
  const trimmed = headline.trim();
  if (!trimmed || trimmed.toLowerCase() === LEGACY_HEADLINE) {
    return STUDENT_HEADLINE_DEFAULT;
  }
  return trimmed;
};

const CATEGORY_PILLS = [
  { id: 'terhangat', label: 'Terhangat' },
  { id: 'makanan', label: 'Makanan' },
  { id: 'minuman', label: 'Minuman' },
  { id: 'merch', label: 'Merch Kelab' },
] as const;

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const COUNTER_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const STAGE_MANAGER_EASE = Easing.bezier(0.22, 1, 0.36, 1);

const PolyMartCommerceInner: React.FC<PolyMartProps> = ({
  productsCount,
  ordersCount,
  headline,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const timeSec = frame / safeFps;

  const safeProductsCount = Number.isFinite(productsCount)
    ? Math.max(0, Math.round(productsCount))
    : 277;
  const safeOrdersCount = Number.isFinite(ordersCount)
    ? Math.max(0, Math.round(ordersCount))
    : 344;

  const resolvedHeadline = resolveStudentHeadline(headline);

  // Beat 1 (0..1.4s): Top Editorial Header + KPIs
  const pillStart = 0;
  const pillDuration = Math.max(8, Math.round(0.35 * safeFps));
  const headlineStart = Math.round(0.08 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.05 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.34 * safeFps));
  const subtitleStart = Math.round(0.35 * safeFps);
  const subtitleDuration = Math.max(8, Math.round(0.35 * safeFps));
  const kpiStart = Math.round(0.45 * safeFps);

  const productsEnd = Math.round(2.1 * safeFps);
  const ordersEnd = Math.round(2.3 * safeFps);
  const animatedProducts = Math.round(
    interpolate(frame, [kpiStart, productsEnd], [0, safeProductsCount], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: COUNTER_EASE,
    }),
  );
  const animatedOrders = Math.round(
    interpolate(frame, [kpiStart + 4, ordersEnd], [0, safeOrdersCount], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: COUNTER_EASE,
    }),
  );

  // Act 1 (0..3.1s / frame 0..186): Amber PolyMart 3D Isometric Deck Front & Center
  const martEnterFrame = Math.round(0.28 * safeFps);
  const martEnterDuration = Math.max(10, Math.round(0.55 * safeFps));
  const martEnterProgress = interpolate(
    frame,
    [martEnterFrame, martEnterFrame + martEnterDuration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );
  const martOpacityEnter = interpolate(
    frame,
    [martEnterFrame, martEnterFrame + Math.max(6, Math.round(0.2 * safeFps))],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  const categoryHighlightT = interpolate(
    frame,
    [Math.round(0.45 * safeFps), Math.round(0.8 * safeFps)],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );
  const activeCategoryBg = interpolateColors(
    categoryHighlightT,
    [0, 1],
    [AMBER_SOFT, AMBER_INK],
  );
  const activeCategoryBorder = interpolateColors(
    categoryHighlightT,
    [0, 1],
    [AMBER_BORDER, AMBER_DARK],
  );
  const activeCategoryInk = interpolateColors(
    categoryHighlightT,
    [0, 1],
    [AMBER_INK, LAUNCH_PALETTE.CARD_BG],
  );

  // Staggered physical 3D product lifts cleanly completed by Global f=920 (Local f=170)
  const item1AddFrame = Math.round(0.68 * safeFps); // 41f
  const item2AddFrame = Math.round(1.06 * safeFps); // 64f
  const item3AddFrame = Math.round(1.44 * safeFps); // 86f
  const item1Added = frame >= item1AddFrame;
  const item2Added = frame >= item2AddFrame;
  const item3Added = frame >= item3AddFrame;
  const cartCount = (item1Added ? 1 : 0) + (item2Added ? 1 : 0) + (item3Added ? 1 : 0);
  const cartTotalRm = (item1Added ? 9 : 0) + (item2Added ? 6 : 0) + (item3Added ? 12 : 0);

  const makeLiftSpring = (start: number) =>
    frame >= start
      ? spring({
          frame: frame - start,
          fps: safeFps,
          config: { damping: 14, stiffness: 250, mass: 0.78 },
        })
      : 0;

  const item1LiftSpring = makeLiftSpring(item1AddFrame);
  const item2LiftSpring = makeLiftSpring(item2AddFrame);
  const item3LiftSpring = makeLiftSpring(item3AddFrame);

  // Cart Badge floats above deck at +60px relative Z
  const cartBadgePop =
    frame >= item1AddFrame
      ? spring({
          frame: frame - item1AddFrame,
          fps: safeFps,
          config: { damping: 14, stiffness: 230, mass: 0.85 },
        })
      : 0;

  // JPP PAY Holographic Pickup Pass stamps strictly in front at +112px Z (f=108..148)
  const payStampStart = Math.round(1.8 * safeFps); // 108f
  const payStampSpring =
    frame >= payStampStart
      ? spring({
          frame: frame - payStampStart,
          fps: safeFps,
          config: { damping: 15, stiffness: 220, mass: 0.88 },
        })
      : 0;
  const payStampOpacity =
    frame >= payStampStart
      ? interpolate(frame, [payStampStart, payStampStart + Math.round(0.2 * safeFps)], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  // Act 2 (3.10s..6.60s / frame 186..396): 3D Revolving Turntable Orbit to Cyan PolyRent
  const orbitStart = Math.round(3.1 * safeFps); // 186f
  const orbitEnd = Math.round(4.15 * safeFps); // 249f
  const orbitProgress = interpolate(frame, [orbitStart, orbitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: STAGE_MANAGER_EASE,
  });

  // PolyMart deck orbits smoothly back-left in Z-space while tilting inward +18deg Y
  const martX =
    interpolate(martEnterProgress, [0, 1], [-85, -18]) +
    interpolate(orbitProgress, [0, 1], [0, -296]);
  const martY =
    interpolate(martEnterProgress, [0, 1], [44, 24]) +
    interpolate(orbitProgress, [0, 1], [0, 62]) +
    Math.sin(timeSec * 1.3) * 3;
  const martZ = interpolate(orbitProgress, [0, 1], [28, -72]);
  const martRotX =
    interpolate(martEnterProgress, [0, 1], [16, 10]) +
    interpolate(orbitProgress, [0, 1], [0, -2]);
  const martRotY =
    interpolate(martEnterProgress, [0, 1], [-22, -13]) +
    interpolate(orbitProgress, [0, 1], [0, 31]); // -13deg -> +18deg
  const martScale =
    interpolate(martEnterProgress, [0, 1], [0.92, 0.96]) *
    interpolate(orbitProgress, [0, 1], [1, 0.78]);

  // JPP Pay stamp sits safely below HUD chips & strictly in front of Deck A in Act 1, then tucks above PolyMart in Act 2
  const passX = interpolate(orbitProgress, [0, 1], [890, 148]);
  const passY =
    interpolate(orbitProgress, [0, 1], [72, 22]) +
    (1 - payStampSpring) * -20 +
    Math.sin(timeSec * 1.65 + 0.8) * 2.5;
  const passZ = interpolate(orbitProgress, [0, 1], [112, 22]);
  const passRotY = interpolate(orbitProgress, [0, 1], [-8, 14]);
  const passRotX = interpolate(orbitProgress, [0, 1], [6, 7]);
  const passScale =
    (0.84 + 0.16 * payStampSpring) * interpolate(orbitProgress, [0, 1], [0.96, 0.78]);

  // Cyan PolyRent 3D Housing Diorama enters back-right and orbits inside safe [700..1760px] right bounds
  const rentEnterStart = Math.round(2.65 * safeFps); // 159f
  const rentEnterT = interpolate(
    frame,
    [rentEnterStart, rentEnterStart + Math.round(0.45 * safeFps)],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );
  const rentOpacity = Math.max(rentEnterT, orbitProgress > 0.02 ? 1 : 0);
  const rentX = interpolate(orbitProgress, [0, 1], [410, 212]);
  const rentY =
    interpolate(orbitProgress, [0, 1], [48, 34]) +
    Math.cos(timeSec * 1.25 + 1.1) * 3;
  const rentZ = interpolate(orbitProgress, [0, 1], [-125, 42]);
  const rentRotX = interpolate(orbitProgress, [0, 1], [7, 9]);
  const rentRotY = interpolate(orbitProgress, [0, 1], [-30, -14]);
  const rentScale = interpolate(orbitProgress, [0, 1], [0.76, 0.91]);

  // Inside PolyRent: staggered 3D Z-elevation of Room Card (+42px), Calculator (+78px), Verified Badge (+128px)
  const roomZProgress = interpolate(frame, [Math.round(3.6 * safeFps), Math.round(4.3 * safeFps)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const calcZProgress = interpolate(frame, [Math.round(3.85 * safeFps), Math.round(4.5 * safeFps)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const verifiedPillSpring =
    frame >= Math.round(4.45 * safeFps)
      ? spring({
          frame: frame - Math.round(4.45 * safeFps),
          fps: safeFps,
          config: { damping: 14, stiffness: 230, mass: 0.8 },
        })
      : 0;

  // Live Kalkulator Sewa: RM 680 / bln divided by 2 -> 3 -> 4 Pelajar (RM 170) ready cleanly before Global f=1060 (Local 310)
  const step3Frame = Math.round(4.15 * safeFps); // 249f
  const step4Frame = Math.round(4.65 * safeFps); // 279f
  const roommates = frame >= step4Frame ? 4 : frame >= step3Frame ? 3 : 2;
  const monthlyRent = 680;
  const perPersonRent = Math.round(monthlyRent / roommates);

  const smoothShareRatio =
    frame < step3Frame
      ? 0.5
      : frame < step4Frame
        ? interpolate(frame, [step3Frame, step3Frame + 16], [0.5, 1 / 3], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: EXPO_OUT,
          })
        : interpolate(frame, [step4Frame, step4Frame + 16], [1 / 3, 0.25], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: EXPO_OUT,
          });

  const calcResultPop =
    frame >= step4Frame
      ? interpolate(frame, [step4Frame, step4Frame + 6, step4Frame + 18], [0.94, 1.06, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : frame >= step3Frame
        ? interpolate(frame, [step3Frame, step3Frame + 6, step3Frame + 18], [0.94, 1.05, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        : 1;

  const bilikModeActiveT = interpolate(frame, [orbitStart + 10, orbitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bilikPillBg = interpolateColors(
    bilikModeActiveT,
    [0, 1],
    ['rgba(6, 182, 212, 0.14)', CYAN_INK],
  );
  const bilikPillBorder = interpolateColors(
    bilikModeActiveT,
    [0, 1],
    ['rgba(165, 243, 252, 0.3)', CYAN],
  );
  const bilikPillInk = interpolateColors(
    bilikModeActiveT,
    [0, 1],
    [CYAN_SOFT, LAUNCH_PALETTE.CARD_BG],
  );

  const payButtonBg = item3Added
    ? AMBER_INK
    : interpolateColors(item1LiftSpring, [0, 1], [LAUNCH_PALETTE.PRIMARY, EMERALD_INK]);

  const studentItems = [
    {
      id: 'chicken-popcorn',
      title: 'Chicken Popcorn',
      subtitle: 'Sos Keju & Lada Hitam',
      priceLabel: 'RM 9.00',
      badge: 'Makanan',
      tierZ: 52,
      added: item1Added,
      liftSpring: item1LiftSpring,
      iconKind: 'food' as const,
    },
    {
      id: 'loaded-fries',
      title: 'Loaded Fries',
      subtitle: 'Kentang Rangup Istimewa',
      priceLabel: 'RM 6.00',
      badge: 'Terhangat',
      tierZ: 88,
      added: item2Added,
      liftSpring: item2LiftSpring,
      iconKind: 'hot' as const,
    },
    {
      id: 'lanyard-jpp',
      title: 'Lanyard Rasmi JPP',
      subtitle: 'Edisi Mahasiswa 2026',
      priceLabel: 'RM 12.00',
      badge: 'Merch Kelab',
      tierZ: 124,
      added: item3Added,
      liftSpring: item3LiftSpring,
      iconKind: 'merch' as const,
    },
  ] as const;

  const renderItemIcon = (kind: (typeof studentItems)[number]['iconKind']) => {
    switch (kind) {
      case 'food':
        return <UtensilsCrossed size={20} color={AMBER_INK} strokeWidth={2.2} />;
      case 'hot':
        return <ShoppingBag size={20} color={AMBER_INK} strokeWidth={2.2} />;
      case 'merch':
        return <Tag size={20} color={LAUNCH_PALETTE.PRIMARY} strokeWidth={2.2} />;
    }
  };

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.polymart.tint} />

      <CameraStage
        perspective={1500}
        zoomFrom={0.99}
        zoomTo={1.03}
        panXFrom={-10}
        panXTo={10}
        panYFrom={4}
        panYTo={-4}
        tiltXFrom={5.5}
        tiltXTo={2.5}
        tiltYFrom={-6.5}
        tiltYTo={6.5}
        breathingAmplitude={0.45}
        entryPanXOffset={-36}
        entryZoomOffset={-0.024}
        exitPanXDelta={24}
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
          {/* 3D Perspective Architectural Floor Grid with Amber & Cyan Radial Glows */}
          <SpatialFloorGrid accentColor={AMBER} secondaryColor={CYAN} gridOpacity={0.22} scrollSpeed={16} />

          {/* Beat 1: Compact Student Header Row + Right Tabular KPI Pills */}
          <div
            style={{
              position: 'absolute',
              left: 72,
              right: 72,
              top: 66,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 28,
              zIndex: 8,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1020 }}>
              <KineticReveal startFrame={pillStart} durationFrames={pillDuration}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    alignSelf: 'flex-start',
                    padding: '6px 16px',
                    borderRadius: 999,
                    backgroundColor: AMBER_SOFT,
                    border: `1.5px solid ${AMBER_DARK}`,
                    color: AMBER_INK,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12.5,
                    fontWeight: 800,
                    letterSpacing: '0.16em',
                  }}
                >
                  <ShoppingBag size={14} color={AMBER_INK} strokeWidth={2.4} />
                  <span>12:30 TGH HARI • MAKAN &amp; BILIK SEWA</span>
                </div>
              </KineticReveal>

              <KineticWords
                as="h2"
                text={resolvedHeadline}
                startFrame={headlineStart}
                staggerFrames={wordStagger}
                wordDurationFrames={wordDuration}
                accentWords={['Semua', 'Di', 'Sini.']}
                accentColor={AMBER_INK}
                style={{
                  margin: '10px 0 0',
                  fontSize: 46,
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.07,
                  color: LAUNCH_PALETTE.PRIMARY,
                }}
              />

              <KineticReveal startFrame={subtitleStart} durationFrames={subtitleDuration}>
                <p
                  style={{
                    margin: '7px 0 0',
                    fontSize: 16.5,
                    fontWeight: 500,
                    lineHeight: 1.4,
                    color: LAUNCH_PALETTE.INK_SOFT,
                  }}
                >
                  Pesan makanan tanpa beratur di PolyMart &amp; bandingkan bilik sewa disahkan sekitar POLISAS di PolyRent.
                </p>
              </KineticReveal>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, paddingBottom: 6 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 15px',
                  borderRadius: 999,
                  backgroundColor: AMBER_SOFT,
                  border: `1.5px solid ${AMBER}`,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 13,
                  fontWeight: 800,
                  color: AMBER_INK,
                  fontVariantNumeric: 'tabular-nums',
                  boxShadow: '0 8px 20px rgba(217, 119, 6, 0.1)',
                }}
              >
                <UtensilsCrossed size={14} color={AMBER_INK} strokeWidth={2.4} />
                <span>{animatedProducts}+ Menu &amp; Merch</span>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 15px',
                  borderRadius: 999,
                  backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                  border: `1.5px solid ${AMBER}`,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 13,
                  fontWeight: 800,
                  color: LAUNCH_PALETTE.CARD_BG,
                  fontVariantNumeric: 'tabular-nums',
                  boxShadow: '0 8px 20px rgba(31, 39, 32, 0.14)',
                }}
              >
                <Receipt size={14} color={AMBER} strokeWidth={2.4} />
                <span>{animatedOrders}+ Pesanan Siswa</span>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 15px',
                  borderRadius: 999,
                  backgroundColor: EMERALD_SOFT,
                  border: `1.5px solid ${EMERALD_BORDER}`,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 13,
                  fontWeight: 800,
                  color: EMERALD_INK,
                }}
              >
                <ShieldCheck size={14} color={EMERALD_INK} strokeWidth={2.5} />
                <span>Tanpa Beratur</span>
              </div>
            </div>
          </div>

          {/* 3D Revolving Dual-Stage Turntable (y: 274..986, safely below editorial header & HUD pills) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 274,
              height: 712,
              perspective: '1450px',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* DECK A: Amber PolyMart 3D Isometric Deck (Center-Front in Act 1 -> Back-Left in Act 2) */}
            <Interactive.Div
              name="PolyMart 3D Isometric Turntable Deck"
              premountFor={safeFps}
              style={{
                position: 'absolute',
                left: 520,
                top: 78,
                width: 860,
                height: 516,
                opacity: martOpacityEnter,
                transformOrigin: '50% 50%',
                transformStyle: 'preserve-3d',
                willChange: 'transform, opacity',
                transform: `translate3d(${martX.toFixed(2)}px, ${martY.toFixed(2)}px, ${martZ.toFixed(2)}px) rotateX(${martRotX.toFixed(2)}deg) rotateY(${martRotY.toFixed(2)}deg) scale(${martScale.toFixed(4)})`,
              }}
            >
              <KineticWindow
                surface="light"
                routeLabel="jpp.polisas.edu.my/polymart"
                statusPill={item3Added ? 'JPP PAY AKTIF' : 'PESAN SEKARANG'}
                statusAccent
                accentColor={item3Added ? AMBER_INK : LAUNCH_PALETTE.PRIMARY}
                accentSoftBg={AMBER_SOFT}
                accentBorderColor={AMBER}
                width="100%"
                height="100%"
                borderRadius={26}
                sheenStartFrame={Math.round(0.95 * safeFps)}
                sheenDuration={42}
                style={{
                  borderColor: AMBER_BORDER,
                  boxShadow:
                    '0 42px 92px rgba(217, 119, 6, 0.18), 0 18px 36px rgba(31, 39, 32, 0.14)',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: '22px 28px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                    boxSizing: 'border-box',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Deck Top Storefront Header + Elevated 3D Cart Badge (+148px Z) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 15,
                          backgroundColor: AMBER_INK,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 10px 22px rgba(180, 83, 9, 0.28)',
                        }}
                      >
                        <UtensilsCrossed size={22} color="#FFFFFF" strokeWidth={2.2} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              fontSize: 20,
                              fontWeight: 900,
                              letterSpacing: '-0.02em',
                              color: LAUNCH_PALETTE.PRIMARY,
                            }}
                          >
                            QUADRA H • KAFE &amp; MERCH SISWA
                          </span>
                          <CheckCircle2 size={16} color={EMERALD_INK} strokeWidth={2.6} />
                        </div>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11.5,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            color: LAUNCH_PALETTE.INK_SOFT,
                          }}
                        >
                          DATARAN SISWA • PESAN ANTARA KULIAH &amp; TERUS AMBIL
                        </span>
                      </div>
                    </div>

                    {/* Floating 3D Cart Pill (+60px relative Z above storefront deck) */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 9,
                        padding: '11px 18px',
                        borderRadius: 999,
                        backgroundColor: item3Added ? AMBER_INK : LAUNCH_PALETTE.PRIMARY_DARK,
                        border: `1.5px solid ${AMBER}`,
                        color: '#FFFFFF',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12.5,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        boxShadow:
                          '0 22px 44px rgba(180, 83, 9, 0.34), 0 8px 18px rgba(31, 39, 32, 0.24)',
                        transform: `translate3d(0px, ${(-6 * cartBadgePop).toFixed(2)}px, ${(26 + 34 * cartBadgePop).toFixed(2)}px) scale(${(0.95 + 0.05 * cartBadgePop).toFixed(4)})`,
                      }}
                    >
                      <ShoppingBag size={15} strokeWidth={2.4} />
                      <span>+ BAKUL • {cartCount} ITEM</span>
                    </div>
                  </div>

                  {/* Category Filter Pills Strip */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      {CATEGORY_PILLS.map((cat) => {
                        const isActive = cat.id === 'terhangat';
                        return (
                          <span
                            key={cat.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 14px',
                              borderRadius: 999,
                              backgroundColor: isActive ? activeCategoryBg : AMBER_SOFT,
                              border: `1px solid ${isActive ? activeCategoryBorder : AMBER_BORDER}`,
                              fontSize: 12.5,
                              fontWeight: 800,
                              color: isActive ? activeCategoryInk : LAUNCH_PALETTE.PRIMARY,
                            }}
                          >
                            {isActive ? <Flame size={13} color={activeCategoryInk} strokeWidth={2.4} /> : null}
                            {cat.label}
                          </span>
                        );
                      })}
                    </div>

                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 800,
                        letterSpacing: '0.09em',
                        color: AMBER_INK,
                      }}
                    >
                      SIAP 5–8 MIN
                    </span>
                  </div>

                  {/* 3 Stepped Z-Tier Product Cards physically lifting off the 3D deck (+52px / +88px / +124px) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 18,
                      flex: 1,
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {studentItems.map((item, idx) => {
                      const zLift = item.tierZ * item.liftSpring;
                      const tiltPitch = -3 * item.liftSpring;
                      const shadowBlur = 14 + 28 * item.liftSpring;

                      return (
                        <div
                          key={item.id}
                          style={{
                            position: 'relative',
                            transformStyle: 'preserve-3d',
                          }}
                        >
                          {/* Dynamic Ground-Plane Shadow Slab anchored on Deck (z=-2px) */}
                          <div
                            aria-hidden
                            style={{
                              position: 'absolute',
                              inset: 8,
                              borderRadius: 20,
                              backgroundColor: `rgba(180, 83, 9, ${(0.08 + 0.2 * item.liftSpring).toFixed(3)})`,
                              transform: `translate3d(6px, ${(8 + idx * 4).toFixed(1)}px, -2px) scale(${(0.96 - 0.04 * item.liftSpring).toFixed(3)})`,
                              pointerEvents: 'none',
                            }}
                          />

                          {/* Stepped Elevated Product Card */}
                          <div
                            style={{
                              position: 'relative',
                              height: '100%',
                              borderRadius: 20,
                              padding: '16px 18px',
                              backgroundColor: item.added ? '#FFFFFF' : AMBER_SOFT,
                              border: `1.8px solid ${item.added ? AMBER_DARK : AMBER_BORDER}`,
                              boxShadow: item.added
                                ? `0 ${shadowBlur.toFixed(0)}px 46px rgba(180, 83, 9, 0.24), 0 10px 22px rgba(31, 39, 32, 0.14)`
                                : '0 8px 18px rgba(31, 39, 32, 0.06)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              boxSizing: 'border-box',
                              transformStyle: 'preserve-3d',
                              transform: `translate3d(0px, ${(-8 * item.liftSpring).toFixed(2)}px, ${zLift.toFixed(2)}px) rotateX(${tiltPitch.toFixed(2)}deg)`,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 12,
                                  backgroundColor: item.added ? AMBER_SOFT : LAUNCH_PALETTE.CARD_BG,
                                  border: `1.5px solid ${item.added ? AMBER : AMBER_BORDER}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {renderItemIcon(item.iconKind)}
                              </span>

                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 999,
                                  backgroundColor: item.iconKind === 'merch' ? EMERALD_SOFT : AMBER_SOFT,
                                  border: `1px solid ${item.iconKind === 'merch' ? EMERALD_BORDER : AMBER_BORDER}`,
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  color: item.iconKind === 'merch' ? EMERALD_INK : AMBER_INK,
                                }}
                              >
                                {item.badge}
                              </span>
                            </div>

                            <div style={{ marginTop: 10 }}>
                              <div
                                style={{
                                  fontSize: 17.5,
                                  fontWeight: 900,
                                  letterSpacing: '-0.02em',
                                  color: LAUNCH_PALETTE.PRIMARY,
                                  lineHeight: 1.15,
                                }}
                              >
                                {item.title}
                              </div>
                              <div
                                style={{
                                  marginTop: 4,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: LAUNCH_PALETTE.INK_SOFT,
                                }}
                              >
                                {item.subtitle}
                              </div>
                            </div>

                            <div
                              style={{
                                marginTop: 14,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 15,
                                  fontWeight: 900,
                                  color: AMBER_INK,
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {item.priceLabel}
                              </span>

                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '6px 11px',
                                  borderRadius: 999,
                                  backgroundColor: item.added ? EMERALD_INK : LAUNCH_PALETTE.PRIMARY_DARK,
                                  color: '#FFFFFF',
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 11,
                                  fontWeight: 800,
                                }}
                              >
                                {item.added ? (
                                  <>
                                    <Check size={12} strokeWidth={3} />
                                    <span>Di Bakul</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus size={12} strokeWidth={2.8} />
                                    <span>Tambah</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Deck Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 12,
                      borderTop: `1.5px solid ${AMBER_BORDER}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 13,
                        fontWeight: 800,
                        color: LAUNCH_PALETTE.PRIMARY,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      JUMLAH BAKUL ({cartCount} ITEM) : RM {cartTotalRm.toFixed(2)}
                    </span>
                    <span
                      style={{
                        padding: '8px 18px',
                        borderRadius: 999,
                        backgroundColor: payButtonBg,
                        color: '#FFFFFF',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                      }}
                    >
                      {item3Added ? `PESANAN #${safeOrdersCount} SIAP DIAMBIL ✓` : 'JPP PAY • SEGERA'}
                    </span>
                  </div>
                </div>
              </KineticWindow>
            </Interactive.Div>

            {/* Floating Foreground 3D Pickup Stamp: JPP PAY • PESANAN #344 SIAP DIAMBIL (+112px Z) */}
            {payStampOpacity > 0.005 ? (
              <Interactive.Div
                name="JPP Pay 3D Pickup Stamp"
                premountFor={safeFps}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 476,
                  opacity: payStampOpacity,
                  transformOrigin: '50% 50%',
                  transformStyle: 'preserve-3d',
                  willChange: 'transform, opacity',
                  transform: `translate3d(${passX.toFixed(2)}px, ${passY.toFixed(2)}px, ${passZ.toFixed(2)}px) rotateX(${passRotX.toFixed(2)}deg) rotateY(${passRotY.toFixed(2)}deg) scale(${passScale.toFixed(4)})`,
                  zIndex: 12,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    padding: '14px 18px',
                    borderRadius: 20,
                    backgroundColor: '#FFFFFF',
                    border: `2px solid ${AMBER_DARK}`,
                    boxShadow:
                      '0 34px 72px rgba(180, 83, 9, 0.28), 0 12px 26px rgba(31, 39, 32, 0.18)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          backgroundColor: EMERALD_INK,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={13} color="#FFFFFF" strokeWidth={3} />
                      </span>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 900,
                          letterSpacing: '0.05em',
                          color: LAUNCH_PALETTE.PRIMARY,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        JPP PAY • PESANAN #{safeOrdersCount} SIAP DIAMBIL ✓
                      </span>
                    </div>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 999,
                        backgroundColor: AMBER_SOFT,
                        border: `1px solid ${AMBER}`,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 9.5,
                        fontWeight: 800,
                        color: AMBER_INK,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      KAUNTER EKSPRES
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 12,
                      backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 12,
                      fontWeight: 800,
                      color: LAUNCH_PALETTE.PRIMARY,
                    }}
                  >
                    <span>3 ITEM • RM 27.00</span>
                    <span style={{ color: EMERALD_INK }}>DATARAN SISWA</span>
                  </div>

                  <div style={{ fontSize: 13.5, fontWeight: 700, color: LAUNCH_PALETTE.INK_SOFT }}>
                    Imbas terus pas digital melalui{' '}
                    <EditorialAnnotation
                      type="highlight"
                      startFrame={payStampStart + 10}
                      durationFrames={18}
                      color="rgba(245, 158, 11, 0.34)"
                      strokeWidth={10}
                      padding={3}
                      iterations={1}
                      seed={44}
                    >
                      <span style={{ fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY_DARK }}>JPP Pay</span>
                    </EditorialAnnotation>
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      right: 18,
                      top: 6,
                      pointerEvents: 'none',
                    }}
                  >
                    <GeometricSparkBurst
                      triggerFrame={payStampStart + 26}
                      x={0}
                      y={0}
                      durationFrames={44}
                      radius={48}
                      count={8}
                      seed="polymart-jpp-pay-burst"
                      colors={[AMBER_DARK, EMERALD, AMBER]}
                    />
                  </div>
                </div>
              </Interactive.Div>
            ) : null}

            {/* DECK B: Cyan PolyRent 3D Housing Diorama (Swings from Back-Right -> Center-Right Hero Focus in Act 2) */}
            {rentOpacity > 0.005 ? (
              <Interactive.Div
                name="PolyRent 3D Isometric Housing Diorama"
                premountFor={safeFps}
                style={{
                  position: 'absolute',
                  left: 520,
                  top: 72,
                  width: 860,
                  height: 516,
                  opacity: rentOpacity,
                  transformOrigin: '50% 50%',
                  transformStyle: 'preserve-3d',
                  willChange: 'transform, opacity',
                  transform: `translate3d(${rentX.toFixed(2)}px, ${rentY.toFixed(2)}px, ${rentZ.toFixed(2)}px) rotateX(${rentRotX.toFixed(2)}deg) rotateY(${rentRotY.toFixed(2)}deg) scale(${rentScale.toFixed(4)})`,
                  zIndex: orbitProgress >= 0.42 ? 14 : 4,
                }}
              >
                <KineticWindow
                  surface="dark"
                  routeLabel="jpp.polisas.edu.my/polyrent"
                  statusPill="VERIFIED SISWA ✓"
                  statusAccent
                  accentColor={CYAN}
                  accentSoftBg="rgba(6, 182, 212, 0.24)"
                  accentBorderColor={CYAN}
                  width="100%"
                  height="100%"
                  borderRadius={26}
                  sheenStartFrame={Math.round(3.9 * safeFps)}
                  sheenDuration={44}
                  style={{
                    borderColor: CYAN,
                    boxShadow:
                      '0 46px 96px rgba(8, 145, 178, 0.26), 0 18px 42px rgba(31, 39, 32, 0.34)',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      padding: '22px 28px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 16,
                      boxSizing: 'border-box',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* Top Row + Verified Siswa 3D Floating Pill (+128px Z) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        transformStyle: 'preserve-3d',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: '8px 16px',
                            borderRadius: 999,
                            backgroundColor: bilikPillBg,
                            border: `1.5px solid ${bilikPillBorder}`,
                            fontSize: 13,
                            fontWeight: 800,
                            color: bilikPillInk,
                          }}
                        >
                          <Home size={14} strokeWidth={2.5} />
                          <span>Cari Bilik Sewa</span>
                        </span>

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: '8px 15px',
                            borderRadius: 999,
                            backgroundColor: 'rgba(248, 246, 238, 0.08)',
                            border: '1px solid rgba(217, 201, 178, 0.24)',
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: LAUNCH_PALETTE.TERTIARY,
                          }}
                        >
                          <span>Cari Roommate</span>
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '9px 16px',
                          borderRadius: 999,
                          backgroundColor: CYAN_INK,
                          border: `1.5px solid ${CYAN_BORDER}`,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 800,
                          color: '#FFFFFF',
                          boxShadow: '0 20px 42px rgba(6, 182, 212, 0.34)',
                          transform: `translate3d(0px, ${(-4 * verifiedPillSpring).toFixed(2)}px, ${(30 + 98 * verifiedPillSpring).toFixed(2)}px) scale(${(0.92 + 0.08 * verifiedPillSpring).toFixed(4)})`,
                        }}
                      >
                        <ShieldCheck size={14} color={CYAN_BORDER} strokeWidth={2.6} />
                        <span>VERIFIED SISWA • WHATSAPP TUAN RUMAH ✓</span>
                      </div>
                    </div>

                    {/* Floating 3D Isometric Room Card (+42px Z) */}
                    <div
                      style={{
                        borderRadius: 20,
                        padding: '16px 20px',
                        backgroundColor: 'rgba(6, 182, 212, 0.14)',
                        border: '1.5px solid rgba(165, 243, 252, 0.42)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        boxShadow: '0 22px 44px rgba(15, 23, 20, 0.3)',
                        transform: `translate3d(0px, 0px, ${(42 * roomZProgress).toFixed(2)}px)`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            backgroundColor: CYAN_INK,
                            border: `1.5px solid ${CYAN_BORDER}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <MapPin size={22} color="#FFFFFF" strokeWidth={2.4} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 19, fontWeight: 900, color: LAUNCH_PALETTE.BACKGROUND }}>
                            Taman Pertama Semambu • 3 Min dari POLISAS
                          </span>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: CYAN_BORDER }}>
                            Bilik Master • Lengkap WiFi, Mesin Basuh &amp; Katil • Lelaki / Perempuan
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '8px 14px',
                          borderRadius: 999,
                          backgroundColor: EMERALD_INK,
                          border: `1px solid ${EMERALD_BORDER}`,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 12,
                          fontWeight: 900,
                          color: '#FFFFFF',
                          flexShrink: 0,
                        }}
                      >
                        RM 170 / BLN
                      </div>
                    </div>

                    {/* Floating 3D Split-Rent Calculator (+78px Z) */}
                    <div
                      style={{
                        flex: 1,
                        borderRadius: 22,
                        padding: '18px 22px',
                        backgroundColor: 'rgba(18, 25, 21, 0.94)',
                        border: `1.5px solid ${CYAN}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 14,
                        boxShadow: '0 28px 56px rgba(6, 182, 212, 0.24)',
                        transform: `translate3d(0px, ${(-6 * calcZProgress).toFixed(2)}px, ${(78 * calcZProgress).toFixed(2)}px)`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              backgroundColor: 'rgba(6, 182, 212, 0.22)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Calculator size={17} color={CYAN_BORDER} strokeWidth={2.3} />
                          </span>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: LAUNCH_PALETTE.BACKGROUND }}>
                              Kalkulator Sewa &amp; Deposit Siswa
                            </div>
                            <div
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 10.5,
                                fontWeight: 700,
                                color: CYAN_BORDER,
                                letterSpacing: '0.1em',
                              }}
                            >
                              BAHAGI BIL &amp; SEWA BULANAN ROOMMATE
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            padding: '6px 12px',
                            borderRadius: 999,
                            backgroundColor: 'rgba(248, 246, 238, 0.08)',
                            border: '1px solid rgba(217, 201, 178, 0.24)',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 12,
                            fontWeight: 800,
                            color: LAUNCH_PALETTE.BACKGROUND,
                          }}
                        >
                          Sewa Rumah: RM {monthlyRent} / bln
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.15fr 0.85fr',
                          gap: 16,
                          alignItems: 'stretch',
                        }}
                      >
                        <div
                          style={{
                            borderRadius: 16,
                            padding: '14px 16px',
                            backgroundColor: 'rgba(248, 246, 238, 0.05)',
                            border: '1px solid rgba(217, 201, 178, 0.18)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 11,
                                fontWeight: 800,
                                color: LAUNCH_PALETTE.TERTIARY,
                              }}
                            >
                              BILANGAN ROOMMATE
                            </span>
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 13,
                                fontWeight: 900,
                                color: CYAN_BORDER,
                              }}
                            >
                              {roommates} Pelajar
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {[2, 3, 4].map((n) => {
                              const isSelected = roommates === n;
                              return (
                                <span
                                  key={n}
                                  style={{
                                    padding: '9px 0',
                                    borderRadius: 12,
                                    textAlign: 'center',
                                    backgroundColor: isSelected ? CYAN_INK : 'rgba(248, 246, 238, 0.07)',
                                    border: `1.5px solid ${isSelected ? CYAN_BORDER : 'rgba(217, 201, 178, 0.22)'}`,
                                    fontFamily: LAUNCH_FONTS.MONO,
                                    fontSize: 13,
                                    fontWeight: 900,
                                    color: '#FFFFFF',
                                  }}
                                >
                                  {n} Pelajar
                                </span>
                              );
                            })}
                          </div>

                          <div style={{ display: 'flex', gap: 6 }}>
                            {Array.from({ length: roommates }).map((_, segIdx) => (
                              <div
                                key={segIdx}
                                style={{
                                  flex: 1,
                                  height: 6,
                                  borderRadius: 999,
                                  backgroundColor: segIdx === 0 ? CYAN : EMERALD,
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        <div
                          style={{
                            borderRadius: 16,
                            padding: '14px 18px',
                            backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                            border: `2px solid ${CYAN}`,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transform: `scale(${calcResultPop.toFixed(4)})`,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 10.5,
                                fontWeight: 800,
                                color: LAUNCH_PALETTE.INK_SOFT,
                              }}
                            >
                              SEORANG PERLU BAYAR
                            </span>
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 11,
                                fontWeight: 900,
                                color: CYAN_INK,
                              }}
                            >
                              RM {monthlyRent} ÷ {roommates}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 38,
                                fontWeight: 900,
                                color: LAUNCH_PALETTE.PRIMARY,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              RM {perPersonRent}
                            </span>
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 12.5,
                                fontWeight: 800,
                                color: CYAN_INK,
                              }}
                            >
                              / bln seorang
                            </span>
                          </div>

                          <div
                            style={{
                              height: 7,
                              width: '100%',
                              borderRadius: 999,
                              backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: CYAN_INK,
                                transformOrigin: 'left center',
                                transform: `scaleX(${smoothShareRatio.toFixed(4)})`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Action Strip */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: CYAN_BORDER,
                      }}
                    >
                      <span>Termasuk WiFi &amp; bil kongsi — terus WhatsApp tuan rumah</span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 12px',
                          borderRadius: 999,
                          backgroundColor: CYAN_INK,
                          border: `1px solid ${CYAN_BORDER}`,
                          color: '#FFFFFF',
                        }}
                      >
                        <MessageCircle size={12} strokeWidth={2.5} />
                        <span>Hubungi Sekarang</span>
                      </span>
                    </div>
                  </div>
                </KineticWindow>
              </Interactive.Div>
            ) : null}
          </div>
        </div>
      </CameraStage>

      <EditorialFrameMarks chapterCode="03" chapterLabel="12:30 TGH HARI • MAKAN & BILIK SEWA" />
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
    description: 'Products Count',
  },
  ordersCount: {
    type: 'number',
    default: 344,
    min: 0,
    max: 99999,
    integer: true,
    hiddenFromList: false,
    description: 'Orders Count',
  },
  headline: {
    type: 'string',
    default: STUDENT_HEADLINE_DEFAULT,
    description: 'Section Headline',
  },
} as const satisfies InteractivitySchema;

export const PolyMartCommerceScene = Interactive.withSchema({
  Component: PolyMartCommerceInner,
  componentName: 'PolyMartCommerceScene',
  schema: polyMartSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
