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
  Clock,
  Flame,
  Home,
  MapPin,
  MessageCircle,
  Plus,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Users,
  UtensilsCrossed,
  Wifi,
} from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { GeometricSparkBurst, GhostCursor, type GhostCursorKeyframe } from '../motion/MotionActors';
import { WHIP_S_CURVE } from '../motion/transitions';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE } from '../tokens';
import { DeterministicQrMatrix, KineticWindow } from '../ui/KineticCard';

const AMBER = LAUNCH_MODULE_THEMES.polymart.primary; // #F59E0B
const AMBER_DARK = LAUNCH_MODULE_THEMES.polymart.dark; // #D97706
const AMBER_INK = '#B45309'; // WCAG AA+ Amber-700
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

type MenuProductSpec = {
  readonly id: string;
  readonly title: string;
  readonly desc: string;
  readonly priceRm: number;
  readonly tag: string;
  readonly icon: 'food' | 'bag' | 'tag';
  readonly clickFrame: number;
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

const MENU_PRODUCTS: readonly MenuProductSpec[] = [
  {
    id: 'chicken-popcorn',
    title: 'Chicken Popcorn',
    desc: 'Sos Keju & Lada Hitam · Panas',
    priceRm: 9,
    tag: 'Makanan',
    icon: 'food',
    clickFrame: 46,
  },
  {
    id: 'loaded-fries',
    title: 'Loaded Fries',
    desc: 'Kentang Rangup Istimewa',
    priceRm: 6,
    tag: 'Terhangat',
    icon: 'bag',
    clickFrame: 72,
  },
  {
    id: 'lanyard-jpp',
    title: 'Lanyard Rasmi JPP',
    desc: 'Edisi Mahasiswa 2026',
    priceRm: 12,
    tag: 'Merch Kelab',
    icon: 'tag',
    clickFrame: 96,
  },
];

const RENT_AMENITIES = [
  { label: 'WiFi Unifi 300Mbps', icon: 'wifi' as const },
  { label: 'Mesin Basuh & Peti Sejuk', icon: 'home' as const },
  { label: 'Katil & Meja Belajar Lengkap', icon: 'users' as const },
  { label: '3 Min Jalan Kaki Ke Kampus', icon: 'map' as const },
] as const;

const ROOMMATE_OPTIONS = [2, 3, 4] as const;

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

const renderProductIcon = (icon: MenuProductSpec['icon'], isAdded: boolean) => {
  const color = isAdded ? AMBER_INK : LAUNCH_PALETTE.PRIMARY;
  switch (icon) {
    case 'food':
      return <UtensilsCrossed size={22} color={color} strokeWidth={2.2} />;
    case 'bag':
      return <ShoppingBag size={22} color={color} strokeWidth={2.2} />;
    case 'tag':
      return <Tag size={22} color={EMERALD_INK} strokeWidth={2.2} />;
  }
};

const renderAmenityIcon = (icon: (typeof RENT_AMENITIES)[number]['icon']) => {
  switch (icon) {
    case 'wifi':
      return <Wifi size={15} color={CYAN} strokeWidth={2.3} />;
    case 'home':
      return <Home size={15} color={CYAN} strokeWidth={2.3} />;
    case 'users':
      return <Users size={15} color={CYAN} strokeWidth={2.3} />;
    case 'map':
      return <MapPin size={15} color={EMERALD} strokeWidth={2.3} />;
  }
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

  // Beat timings scaled proportionally to fps
  const s = (secs: number) => Math.round(secs * safeFps);

  const pillStart = 0;
  const pillDuration = Math.max(8, s(0.35));
  const headlineStart = s(0.08);
  const wordStagger = Math.max(2, s(0.05));
  const wordDuration = Math.max(8, s(0.32));
  const subtitleStart = s(0.32);
  const subtitleDuration = Math.max(8, s(0.34));

  // Act 1 (0..3.1s): Upright PolyMart Tap-to-Pickup Workbench
  const workbenchEnter = interpolate(frame, [s(0.18), s(0.68)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  const c1 = Math.round((46 / 60) * safeFps);
  const c2 = Math.round((72 / 60) * safeFps);
  const c3 = Math.round((96 / 60) * safeFps);
  const passReadyFrame = Math.round((104 / 60) * safeFps);
  const sparkFrame = Math.round((106 / 60) * safeFps);

  const clickFrames = [c1, c2, c3] as const;
  const addedStates = clickFrames.map((cf) => frame >= cf);
  const cartCount = addedStates.filter(Boolean).length;
  const cartTotalRm = MENU_PRODUCTS.reduce(
    (sum, item, i) => sum + (addedStates[i] ? item.priceRm : 0),
    0,
  );
  const allOrdered = frame >= passReadyFrame;

  const passLockSpring = allOrdered
    ? spring({
        frame: frame - passReadyFrame,
        fps: safeFps,
        config: { damping: 16, stiffness: 225, mass: 0.82 },
      })
    : 0;

  const act1CursorKeyframes: readonly GhostCursorKeyframe[] = [
    { frame: Math.round((20 / 60) * safeFps), x: 180, y: 240 },
    { frame: c1, x: 308, y: 584, click: true, label: 'Tambah' },
    { frame: c2, x: 690, y: 584, click: true, label: 'Tambah' },
    { frame: c3, x: 1072, y: 584, click: true, label: 'Di Bakul ✓' },
    { frame: Math.round((112 / 60) * safeFps), x: 1185, y: 615 },
  ];

  // Motivated Time-Shift Morph (2.85s..3.45s): WHIP_S_CURVE horizontal slide (zero overlap)
  const morphStart = Math.round((171 / 60) * safeFps); // 2.85s
  const morphEnd = Math.round((207 / 60) * safeFps); // 3.45s
  const morphT = interpolate(frame, [morphStart, morphEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  const isRentAct = morphT >= 0.5;

  // Act 2 (3.25s..6.6s): Upright PolyRent Verified Housing & Live Roommate Split Calculator
  const rent2Frame = Math.round((200 / 60) * safeFps);
  const rent3Frame = Math.round((240 / 60) * safeFps);
  const rent4Frame = Math.round((272 / 60) * safeFps);
  const activeRoommates = frame >= rent4Frame ? 4 : frame >= rent3Frame ? 3 : 2;
  const totalHouseRent = 680;
  const perPersonRent = Math.round(totalHouseRent / activeRoommates);
  const monthlySavings = totalHouseRent - perPersonRent;

  const calcSplitProgress = interpolate(
    frame,
    [rent2Frame, rent4Frame + Math.round((14 / 60) * safeFps)],
    [0.5, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );

  const rent4LockSpring =
    frame >= rent4Frame
      ? spring({
          frame: frame - rent4Frame,
          fps: safeFps,
          config: { damping: 16, stiffness: 220, mass: 0.85 },
        })
      : 0;

  const act2CursorKeyframes: readonly GhostCursorKeyframe[] = [
    { frame: Math.round((212 / 60) * safeFps), x: 1090, y: 210 },
    { frame: rent3Frame, x: 1300, y: 242, click: true, label: '3 Pelajar' },
    { frame: rent4Frame, x: 1580, y: 242, click: true, label: '4 Pelajar ✓' },
    { frame: Math.round((300 / 60) * safeFps), x: 1460, y: 585 },
  ];

  // Top Header Reactive Color Shift (Amber -> Cyan)
  const pillBg = interpolateColors(morphT, [0, 1], [AMBER_SOFT, CYAN_SOFT]);
  const pillBorder = interpolateColors(morphT, [0, 1], [AMBER, CYAN]);
  const pillColor = interpolateColors(morphT, [0, 1], [AMBER_INK, CYAN_INK]);
  const headlineAccent = interpolateColors(morphT, [0, 1], [AMBER_DARK, CYAN_DARK]);
  const thumbBg = interpolateColors(morphT, [0, 1], [AMBER_INK, CYAN_DARK]);

  return (
    <>
      <EditorialBackdrop
        ambientTint={
          isRentAct ? LAUNCH_MODULE_THEMES.polyrent.tint : LAUNCH_MODULE_THEMES.polymart.tint
        }
      />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.016}
        panXFrom={3}
        panXTo={-3}
        panYFrom={2}
        panYTo={-2}
        tiltXFrom={0}
        tiltXTo={0}
        tiltYFrom={0}
        tiltYTo={0}
        breathingAmplitude={0.22}
        entryPanXOffset={20}
        entryZoomOffset={-0.018}
        exitPanXDelta={-18}
        exitZoomDelta={0.024}
        exitFrames={Math.round(0.32 * safeFps)}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            fontFamily: LAUNCH_FONTS.DISPLAY,
          }}
        >
          {/* Editorial Top Row: Left Headline + Right Segmented Time-Shift Switcher */}
          <div
            style={{
              position: 'absolute',
              left: 76,
              right: 76,
              top: 56,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 32,
              zIndex: 8,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 1040 }}>
              <KineticReveal startFrame={pillStart} durationFrames={pillDuration}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    alignSelf: 'flex-start',
                    padding: '6px 16px',
                    borderRadius: 999,
                    backgroundColor: pillBg,
                    border: `1.5px solid ${pillBorder}`,
                    color: pillColor,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12.5,
                    fontWeight: 800,
                    letterSpacing: '0.15em',
                  }}
                >
                  <Clock size={14} color={pillColor} strokeWidth={2.5} />
                  <span>12:30 – 18:00 • EKONOMI &amp; KEDIAMAN SISWA</span>
                </div>
              </KineticReveal>

              <KineticWords
                as="h2"
                text={resolvedHeadline}
                startFrame={headlineStart}
                staggerFrames={wordStagger}
                wordDurationFrames={wordDuration}
                accentWords={['Semua', 'Di', 'Sini.']}
                accentColor={headlineAccent}
                style={{
                  margin: 0,
                  fontSize: 45,
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.07,
                  color: LAUNCH_PALETTE.PRIMARY,
                }}
              />

              <KineticReveal startFrame={subtitleStart} durationFrames={subtitleDuration}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16.5,
                    fontWeight: 500,
                    lineHeight: 1.4,
                    color: LAUNCH_PALETTE.INK_SOFT,
                  }}
                >
                  {isRentAct
                    ? 'Bandingkan bilik sewa disahkan JPP & bahagi sewa roommate secara automatik di PolyRent.'
                    : 'Pesan makanan terus antara kuliah tanpa beratur di PolyMart, imbas pas JPP Pay dalam 5 minit.'}
                </p>
              </KineticReveal>
            </div>

            {/* Segmented Time-Shift Switcher (Embeds completed 12:30 order pill inside header cleanly) */}
            <div
              style={{
                position: 'relative',
                width: 604,
                height: 62,
                padding: 6,
                borderRadius: 999,
                backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                boxShadow: '0 14px 32px rgba(31, 39, 32, 0.08)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                boxSizing: 'border-box',
                flexShrink: 0,
              }}
            >
              {/* Sliding Physical Thumb */}
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 6,
                  top: 6,
                  bottom: 6,
                  width: 'calc(50% - 6px)',
                  borderRadius: 999,
                  backgroundColor: thumbBg,
                  boxShadow: isRentAct
                    ? '0 8px 20px rgba(8, 145, 178, 0.28)'
                    : '0 8px 20px rgba(180, 83, 9, 0.28)',
                  transform: `translate3d(${(morphT * 100).toFixed(2)}%, 0px, 0px)`,
                }}
              />

              {/* Segment 1: 12:30 POLYMART */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 12.5,
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  color: morphT < 0.5 ? '#FFFFFF' : LAUNCH_PALETTE.PRIMARY,
                }}
              >
                {allOrdered ? (
                  <CheckCircle2
                    size={15}
                    color={morphT < 0.5 ? EMERALD_BORDER : EMERALD_INK}
                    strokeWidth={2.6}
                  />
                ) : (
                  <ShoppingBag
                    size={15}
                    color={morphT < 0.5 ? '#FFFFFF' : AMBER_INK}
                    strokeWidth={2.4}
                  />
                )}
                <span>
                  {allOrdered ? `12:30 POLYMART (#${safeOrdersCount} ✓)` : '12:30 POLYMART'}
                </span>
              </div>

              {/* Segment 2: 18:00 POLYRENT */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 12.5,
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  color: morphT >= 0.5 ? '#FFFFFF' : LAUNCH_PALETTE.MUTED_OLIVE,
                }}
              >
                <Home
                  size={15}
                  color={morphT >= 0.5 ? '#FFFFFF' : CYAN_INK}
                  strokeWidth={2.4}
                />
                <span>18:00 POLYRENT</span>
              </div>
            </div>
          </div>

          {/* SINGLE UPRIGHT SWISS CENTER WORKBENCH (0 deg resting angle, left: 76, width: 1768, height: 700) */}
          <div
            style={{
              position: 'absolute',
              left: 76,
              top: 244,
              width: 1768,
              height: 700,
              borderRadius: 28,
              overflow: 'hidden',
              opacity: workbenchEnter,
              transform: `translate3d(0px, ${((1 - workbenchEnter) * 26).toFixed(2)}px, 0px)`,
            }}
          >
            {/* ACT 1 WORKBENCH: Upright Amber PolyMart Tap-to-Pickup */}
            {morphT < 0.995 ? (
              <Interactive.Div
                name="PolyMart Upright Workbench"
                premountFor={safeFps}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 1 - morphT,
                  transform: `translate3d(${(-morphT * 104).toFixed(2)}%, 0px, 0px)`,
                }}
              >
                <KineticWindow
                  surface="light"
                  routeLabel="jpp.polisas.edu.my/polymart"
                  statusPill={
                    allOrdered ? `PESANAN #${safeOrdersCount} SIAP ✓` : 'PESAN ANTARA KULIAH'
                  }
                  statusAccent
                  accentColor={allOrdered ? EMERALD_INK : AMBER_INK}
                  accentSoftBg={allOrdered ? EMERALD_SOFT : AMBER_SOFT}
                  accentBorderColor={allOrdered ? EMERALD_BORDER : AMBER}
                  width="100%"
                  height="100%"
                  borderRadius={28}
                  sheenStartFrame={Math.round(0.65 * safeFps)}
                  sheenDuration={38}
                  style={{
                    borderColor: AMBER_BORDER,
                    boxShadow: '0 24px 56px rgba(31, 39, 32, 0.1)',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      padding: '22px 28px',
                      display: 'flex',
                      gap: 28,
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Left Side: Upright Storefront Catalog & 3 Product Cards */}
                    <div
                      style={{
                        flex: 1.55,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      {/* Storefront Identity Row */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '14px 18px',
                          borderRadius: 18,
                          backgroundColor: AMBER_SOFT,
                          border: `1.5px solid ${AMBER_BORDER}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 14,
                              backgroundColor: AMBER_INK,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <UtensilsCrossed size={24} color="#FFFFFF" strokeWidth={2.2} />
                          </div>
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 20,
                                fontWeight: 900,
                                color: LAUNCH_PALETTE.PRIMARY,
                              }}
                            >
                              <span>QUADRA H • KAFE &amp; MERCH SISWA</span>
                              <CheckCircle2 size={17} color={EMERALD_INK} strokeWidth={2.5} />
                            </div>
                            <div
                              style={{
                                marginTop: 2,
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 11.5,
                                fontWeight: 800,
                                color: AMBER_INK,
                                letterSpacing: '0.06em',
                              }}
                            >
                              DATARAN SISWA • {safeProductsCount}+ MENU &amp; KEPERLUAN MAHASISWA
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            padding: '8px 14px',
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                            color: '#FFFFFF',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 12,
                            fontWeight: 900,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          SIAP 5–8 MIN
                        </div>
                      </div>

                      {/* Category Strip */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                                  backgroundColor: isActive ? AMBER_INK : LAUNCH_PALETTE.SURFACE_MUTED,
                                  border: `1px solid ${isActive ? AMBER_INK : AMBER_BORDER}`,
                                  fontSize: 12.5,
                                  fontWeight: 800,
                                  color: isActive ? '#FFFFFF' : LAUNCH_PALETTE.PRIMARY,
                                }}
                              >
                                {isActive ? <Flame size={13} color="#FFFFFF" strokeWidth={2.4} /> : null}
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
                            color: LAUNCH_PALETTE.INK_SOFT,
                          }}
                        >
                          KLIK ITEM UNTUK MASUK BAKUL JPP PAY
                        </span>
                      </div>

                      {/* 3 Upright Tactile Product Cards */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 18,
                          flex: 1,
                        }}
                      >
                        {MENU_PRODUCTS.map((item, idx) => {
                          const cf = clickFrames[idx] ?? c1;
                          const isAdded = frame >= cf;
                          const itemSpring = isAdded
                            ? spring({
                                frame: frame - cf,
                                fps: safeFps,
                                config: { damping: 16, stiffness: 250, mass: 0.78 },
                              })
                            : 0;
                          const tapPressScale = interpolate(
                            frame,
                            [cf - 2, cf + 3, cf + 11],
                            [1, 0.94, 1],
                            {
                              extrapolateLeft: 'clamp',
                              extrapolateRight: 'clamp',
                            },
                          );

                          return (
                            <div
                              key={item.id}
                              style={{
                                borderRadius: 22,
                                padding: '20px 20px 18px',
                                backgroundColor: isAdded ? '#FFFFFF' : LAUNCH_PALETTE.BACKGROUND,
                                border: `2px solid ${isAdded ? AMBER_DARK : LAUNCH_PALETTE.TERTIARY}`,
                                borderBottom: `5px solid ${isAdded ? AMBER_INK : LAUNCH_PALETTE.TERTIARY}`,
                                boxShadow: isAdded
                                  ? '0 20px 38px rgba(180, 83, 9, 0.14), 0 6px 14px rgba(31, 39, 32, 0.06)'
                                  : '0 6px 14px rgba(31, 39, 32, 0.04)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                boxSizing: 'border-box',
                                transform: `translate3d(0px, ${(-4 * itemSpring).toFixed(2)}px, 0px)`,
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div
                                  style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 15,
                                    backgroundColor: isAdded ? AMBER_SOFT : '#FFFFFF',
                                    border: `1.5px solid ${isAdded ? AMBER : LAUNCH_PALETTE.TERTIARY}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {renderProductIcon(item.icon, isAdded)}
                                </div>
                                <span
                                  style={{
                                    padding: '4px 11px',
                                    borderRadius: 999,
                                    backgroundColor:
                                      item.id === 'lanyard-jpp' ? EMERALD_SOFT : AMBER_SOFT,
                                    border: `1px solid ${
                                      item.id === 'lanyard-jpp' ? EMERALD_BORDER : AMBER_BORDER
                                    }`,
                                    fontFamily: LAUNCH_FONTS.MONO,
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    color: item.id === 'lanyard-jpp' ? EMERALD_INK : AMBER_INK,
                                  }}
                                >
                                  {item.tag}
                                </span>
                              </div>

                              <div style={{ marginTop: 14 }}>
                                <div
                                  style={{
                                    fontSize: 22,
                                    fontWeight: 900,
                                    letterSpacing: '-0.02em',
                                    color: LAUNCH_PALETTE.PRIMARY,
                                  }}
                                >
                                  {item.title}
                                </div>
                                <div
                                  style={{
                                    marginTop: 5,
                                    fontSize: 13.5,
                                    fontWeight: 600,
                                    color: LAUNCH_PALETTE.INK_SOFT,
                                  }}
                                >
                                  {item.desc}
                                </div>
                              </div>

                              <div
                                style={{
                                  marginTop: 18,
                                  paddingTop: 14,
                                  borderTop: `1px solid ${LAUNCH_PALETTE.SURFACE_MUTED}`,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: 8,
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: LAUNCH_FONTS.MONO,
                                    fontSize: 19,
                                    fontWeight: 900,
                                    color: AMBER_INK,
                                    fontVariantNumeric: 'tabular-nums',
                                  }}
                                >
                                  RM {item.priceRm}.00
                                </span>

                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '8px 14px',
                                    borderRadius: 999,
                                    backgroundColor: isAdded
                                      ? EMERALD_INK
                                      : LAUNCH_PALETTE.PRIMARY_DARK,
                                    color: '#FFFFFF',
                                    fontFamily: LAUNCH_FONTS.MONO,
                                    fontSize: 11.5,
                                    fontWeight: 900,
                                    whiteSpace: 'nowrap',
                                    transform: `scale(${tapPressScale.toFixed(4)})`,
                                  }}
                                >
                                  {isAdded ? (
                                    <>
                                      <Check size={13} strokeWidth={3} />
                                      <span>Di Bakul</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus size={13} strokeWidth={2.8} />
                                      <span>Bakul</span>
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom Reassurance Line */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 16px',
                          borderRadius: 14,
                          backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 12,
                          fontWeight: 800,
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        <span>TANPA BERATUR DI KAFETERIA • BAYAR &amp; TERUS AMBIL</span>
                        <span style={{ color: EMERALD_INK }}>TERSEDIA UNTUK SEMUA SISWA POLISAS</span>
                      </div>
                    </div>

                    {/* Right Side: Live Digital Order Pass (JPP PAY • PESANAN #344) */}
                    <div
                      style={{
                        position: 'relative',
                        width: 556,
                        borderRadius: 24,
                        padding: '22px 24px',
                        backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                        border: `2px solid ${allOrdered ? EMERALD : AMBER_BORDER}`,
                        boxShadow: allOrdered
                          ? '0 22px 46px rgba(16, 185, 129, 0.16)'
                          : '0 10px 24px rgba(31, 39, 32, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: '0.12em',
                              color: AMBER_INK,
                            }}
                          >
                            PAS DIGITAL EKSPRES
                          </div>
                          <div
                            style={{
                              marginTop: 2,
                              fontSize: 23,
                              fontWeight: 900,
                              color: LAUNCH_PALETTE.PRIMARY,
                              letterSpacing: '-0.02em',
                            }}
                          >
                            JPP PAY • #{safeOrdersCount}
                          </div>
                        </div>

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 13px',
                            borderRadius: 999,
                            backgroundColor: allOrdered ? EMERALD_INK : AMBER_INK,
                            color: '#FFFFFF',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11.5,
                            fontWeight: 900,
                          }}
                        >
                          <Receipt size={13} strokeWidth={2.5} />
                          <span>{cartCount} ITEM</span>
                        </span>
                      </div>

                      {/* Itemized Receipt Rows */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                        {MENU_PRODUCTS.map((item, idx) => {
                          const cf = clickFrames[idx] ?? c1;
                          const rowVisible = frame >= cf;
                          const rowSpring = rowVisible
                            ? spring({
                                frame: frame - cf,
                                fps: safeFps,
                                config: { damping: 17, stiffness: 240, mass: 0.8 },
                              })
                            : 0;

                          return (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 14px',
                                borderRadius: 14,
                                backgroundColor: rowVisible ? '#FFFFFF' : 'rgba(242, 237, 228, 0.5)',
                                border: `1.5px solid ${rowVisible ? AMBER_BORDER : 'transparent'}`,
                                opacity: rowVisible ? 0.35 + 0.65 * rowSpring : 0.45,
                                transform: `translate3d(${((1 - rowSpring) * 14).toFixed(2)}px, 0px, 0px)`,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 999,
                                    backgroundColor: rowVisible
                                      ? EMERALD_INK
                                      : LAUNCH_PALETTE.TERTIARY,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {rowVisible ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                                </span>
                                <span
                                  style={{
                                    fontSize: 15,
                                    fontWeight: 800,
                                    color: LAUNCH_PALETTE.PRIMARY,
                                  }}
                                >
                                  {item.title}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 14,
                                  fontWeight: 900,
                                  color: rowVisible ? AMBER_INK : LAUNCH_PALETTE.MUTED_OLIVE,
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                RM {item.priceRm}.00
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Rolling Total Row */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          padding: '12px 4px',
                          borderTop: `1.5px dashed ${LAUNCH_PALETTE.TERTIARY}`,
                          borderBottom: `1.5px dashed ${LAUNCH_PALETTE.TERTIARY}`,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 12.5,
                            fontWeight: 800,
                            color: LAUNCH_PALETTE.INK_SOFT,
                          }}
                        >
                          JUMLAH PESANAN JPP PAY
                        </span>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 28,
                            fontWeight: 900,
                            color: LAUNCH_PALETTE.PRIMARY_DARK,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          RM {cartTotalRm}.00
                        </span>
                      </div>

                      {/* Express Pickup QR & Verified Stamp */}
                      <div
                        style={{
                          padding: '14px 16px',
                          borderRadius: 18,
                          backgroundColor: allOrdered ? EMERALD_SOFT : '#FFFFFF',
                          border: `2px solid ${allOrdered ? EMERALD : LAUNCH_PALETTE.TERTIARY}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          transform: `scale(${(0.97 + 0.03 * passLockSpring).toFixed(4)})`,
                        }}
                      >
                        <div
                          style={{
                            padding: 8,
                            borderRadius: 12,
                            backgroundColor: '#FFFFFF',
                            border: `1.5px solid ${allOrdered ? EMERALD_BORDER : LAUNCH_PALETTE.TERTIARY}`,
                            flexShrink: 0,
                          }}
                        >
                          <DeterministicQrMatrix
                            seed={20260344}
                            size={104}
                            fgColor={LAUNCH_PALETTE.PRIMARY_DARK}
                            bgColor="#FFFFFF"
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              alignSelf: 'flex-start',
                              padding: '4px 10px',
                              borderRadius: 999,
                              backgroundColor: allOrdered
                                ? EMERALD_INK
                                : LAUNCH_PALETTE.SURFACE_MUTED,
                              color: allOrdered ? '#FFFFFF' : LAUNCH_PALETTE.MUTED_OLIVE,
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 10.5,
                              fontWeight: 900,
                            }}
                          >
                            <Sparkles size={11} strokeWidth={2.5} />
                            <span>{allOrdered ? 'KAUNTER EKSPRES • 5 MIN' : 'MENUNGGU ITEM'}</span>
                          </span>

                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 900,
                              lineHeight: 1.25,
                              color: LAUNCH_PALETTE.PRIMARY_DARK,
                            }}
                          >
                            {allOrdered
                              ? 'SIAP DIAMBIL DI DATARAN SISWA ✓'
                              : 'Pilih 3 item untuk jana pas ekspres'}
                          </div>

                          <div style={{ fontSize: 13, fontWeight: 600, color: LAUNCH_PALETTE.INK_SOFT }}>
                            Imbas pantas melalui{' '}
                            <EditorialAnnotation
                              type="highlight"
                              startFrame={passReadyFrame + 4}
                              durationFrames={16}
                              color="rgba(245, 158, 11, 0.34)"
                              strokeWidth={10}
                              padding={3}
                              iterations={1}
                              seed={44}
                            >
                              <span style={{ fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY_DARK }}>
                                JPP Pay
                              </span>
                            </EditorialAnnotation>
                          </div>
                        </div>
                      </div>

                      <GeometricSparkBurst
                        triggerFrame={sparkFrame}
                        x={522}
                        y={28}
                        durationFrames={36}
                        radius={46}
                        count={8}
                        seed="polymart-v6-pass-burst"
                        colors={[AMBER_DARK, EMERALD, AMBER]}
                      />
                    </div>
                  </div>
                </KineticWindow>

                <GhostCursor
                  keyframes={act1CursorKeyframes}
                  appearFrame={Math.round((20 / 60) * safeFps)}
                  disappearFrame={Math.round((102 / 60) * safeFps)}
                  color={LAUNCH_PALETTE.PRIMARY}
                  rippleColor={AMBER_DARK}
                />
              </Interactive.Div>
            ) : null}

            {/* ACT 2 WORKBENCH: Upright Cyan PolyRent Verified Housing & Split Calculator */}
            {morphT > 0.005 ? (
              <Interactive.Div
                name="PolyRent Upright Workbench"
                premountFor={safeFps}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: morphT,
                  transform: `translate3d(${((1 - morphT) * 104).toFixed(2)}%, 0px, 0px)`,
                }}
              >
                <KineticWindow
                  surface="dark"
                  routeLabel="jpp.polisas.edu.my/polyrent"
                  statusPill="VERIFIED JPP ✓"
                  statusAccent
                  accentColor={CYAN}
                  accentSoftBg="rgba(6, 182, 212, 0.22)"
                  accentBorderColor={CYAN}
                  width="100%"
                  height="100%"
                  borderRadius={28}
                  sheenStartFrame={Math.round(3.65 * safeFps)}
                  sheenDuration={38}
                  style={{
                    borderColor: CYAN,
                    boxShadow: '0 26px 60px rgba(8, 145, 178, 0.2)',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      padding: '24px 28px',
                      display: 'flex',
                      gap: 28,
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Left Side: Verified Student Housing Card */}
                    <div
                      style={{
                        width: 790,
                        borderRadius: 24,
                        padding: '24px 26px',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        border: `1.5px solid rgba(165, 243, 252, 0.36)`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: '6px 14px',
                            borderRadius: 999,
                            backgroundColor: CYAN_INK,
                            border: `1px solid ${CYAN_BORDER}`,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11.5,
                            fontWeight: 900,
                            color: '#FFFFFF',
                          }}
                        >
                          <ShieldCheck size={14} color={CYAN_BORDER} strokeWidth={2.5} />
                          <span>DISAHKAN JPP • BEBAS SCAM</span>
                        </span>

                        <span
                          style={{
                            padding: '7px 14px',
                            borderRadius: 999,
                            backgroundColor: EMERALD_INK,
                            border: `1px solid ${EMERALD_BORDER}`,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 12.5,
                            fontWeight: 900,
                            color: '#FFFFFF',
                          }}
                        >
                          RM {totalHouseRent} / BLN RUMAH
                        </span>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 31,
                            fontWeight: 900,
                            letterSpacing: '-0.025em',
                            lineHeight: 1.15,
                            color: '#FFFFFF',
                          }}
                        >
                          Taman Pertama Semambu • 3 Min dari POLISAS
                        </div>
                        <p
                          style={{
                            margin: '10px 0 0',
                            fontSize: 16,
                            fontWeight: 600,
                            lineHeight: 1.45,
                            color: CYAN_BORDER,
                          }}
                        >
                          Bilik Master &amp; Ruang Tamu Lengkap · Kuota Siswa Semester 1–6 (Lelaki / Perempuan)
                        </p>
                      </div>

                      {/* 2x2 Amenity Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                        {RENT_AMENITIES.map((item) => (
                          <div
                            key={item.label}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '12px 14px',
                              borderRadius: 14,
                              backgroundColor: 'rgba(18, 25, 21, 0.72)',
                              border: '1px solid rgba(165, 243, 252, 0.24)',
                              fontSize: 14,
                              fontWeight: 700,
                              color: LAUNCH_PALETTE.BACKGROUND,
                            }}
                          >
                            {renderAmenityIcon(item.icon)}
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Walking Distance Meter to POLISAS */}
                      <div
                        style={{
                          padding: '14px 18px',
                          borderRadius: 16,
                          backgroundColor: 'rgba(18, 25, 21, 0.85)',
                          border: '1px solid rgba(165, 243, 252, 0.26)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: CYAN_BORDER,
                          }}
                        >
                          <span>TAMAN PERTAMA SEMAMBU</span>
                          <span style={{ color: EMERALD }}>3 MIN KE PINTU UTAMA POLISAS ✓</span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: 'rgba(248, 246, 238, 0.14)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: '88%',
                              height: '100%',
                              borderRadius: 999,
                              backgroundColor: CYAN,
                            }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 12,
                          fontWeight: 800,
                          color: EMERALD_BORDER,
                        }}
                      >
                        <span>✓ DEPOSIT TELUS &amp; PERJANJIAN SEWA RASMI</span>
                        <span>WHATSAPP TUAN RUMAH TERUS</span>
                      </div>
                    </div>

                    {/* Right Side: Interactive Roommate Rent-Split Calculator */}
                    <div
                      style={{
                        flex: 1,
                        borderRadius: 24,
                        padding: '24px 26px',
                        backgroundColor: 'rgba(18, 25, 21, 0.94)',
                        border: `2px solid ${CYAN}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              backgroundColor: 'rgba(6, 182, 212, 0.22)',
                              border: `1.5px solid ${CYAN}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Calculator size={20} color={CYAN} strokeWidth={2.4} />
                          </span>
                          <div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF' }}>
                              Kalkulator Bahagi Sewa Roommate
                            </div>
                            <div
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 11.5,
                                fontWeight: 800,
                                color: CYAN_BORDER,
                              }}
                            >
                              PILIH BILANGAN PENGHUNI UNTUK KONGSI SEWA RM {totalHouseRent}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Roommate Selector Pills (2 Pelajar -> 3 Pelajar -> 4 Pelajar) */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                        {ROOMMATE_OPTIONS.map((count) => {
                          const isSelected = count === activeRoommates;
                          const unitRent = Math.round(totalHouseRent / count);
                          const pillScale =
                            isSelected && count === 4 ? 1 + (1 - rent4LockSpring) * -0.04 : 1;

                          return (
                            <div
                              key={count}
                              style={{
                                padding: '14px 16px',
                                borderRadius: 18,
                                backgroundColor: isSelected
                                  ? CYAN_DARK
                                  : 'rgba(248, 246, 238, 0.08)',
                                border: `2px solid ${isSelected ? CYAN_BORDER : 'rgba(165, 243, 252, 0.24)'}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                                alignItems: 'center',
                                transform: `scale(${pillScale.toFixed(4)})`,
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 14,
                                  fontWeight: 900,
                                  color: '#FFFFFF',
                                }}
                              >
                                {count} Pelajar {isSelected ? '✓' : ''}
                              </span>
                              <span
                                style={{
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 12,
                                  fontWeight: 800,
                                  color: isSelected ? CYAN_SOFT : CYAN_BORDER,
                                }}
                              >
                                RM {unitRent} / org
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* 4-Segment Dynamic Roommate Split Bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: CYAN_BORDER,
                          }}
                        >
                          <span>PEMBAHAGIAN BIL &amp; SEWA BULANAN</span>
                          <span>
                            {activeRoommates} ORANG SERUMAH • RM {totalHouseRent} ÷ {activeRoommates}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                          {[1, 2, 3, 4].map((slot) => {
                            const isActiveSlot = slot <= activeRoommates;
                            return (
                              <div
                                key={slot}
                                style={{
                                  height: 12,
                                  borderRadius: 999,
                                  backgroundColor: isActiveSlot
                                    ? slot % 2 === 0
                                      ? EMERALD
                                      : CYAN
                                    : 'rgba(248, 246, 238, 0.12)',
                                  opacity: isActiveSlot ? 0.5 + 0.5 * calcSplitProgress : 0.45,
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* High-Contrast Upright Per-Student Cost Readout */}
                      <div
                        style={{
                          padding: '20px 24px',
                          borderRadius: 20,
                          backgroundColor: '#FFFFFF',
                          border: `2px solid ${CYAN}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 16,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11.5,
                              fontWeight: 900,
                              letterSpacing: '0.1em',
                              color: CYAN_INK,
                            }}
                          >
                            SEORANG PERLU BAYAR SEBULAN
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                            <span
                              style={{
                                fontSize: 52,
                                fontWeight: 900,
                                letterSpacing: '-0.03em',
                                lineHeight: 1,
                                color: LAUNCH_PALETTE.PRIMARY_DARK,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              RM {perPersonRent}
                            </span>
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 16,
                                fontWeight: 800,
                                color: LAUNCH_PALETTE.INK_SOFT,
                              }}
                            >
                              / bln seorang
                            </span>
                          </div>
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 13.5,
                              fontWeight: 800,
                              color: EMERALD_INK,
                            }}
                          >
                            Jimat RM {monthlySavings}/bln seorang • Termasuk WiFi &amp; bil kongsi
                          </div>
                        </div>

                        <div
                          style={{
                            padding: '12px 18px',
                            borderRadius: 16,
                            backgroundColor: CYAN_INK,
                            color: '#FFFFFF',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 14,
                            fontWeight: 900,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <MessageCircle size={17} strokeWidth={2.5} />
                          <span>WhatsApp Tuan Rumah ✓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </KineticWindow>

                <GhostCursor
                  keyframes={act2CursorKeyframes}
                  appearFrame={Math.round((212 / 60) * safeFps)}
                  disappearFrame={Math.round((288 / 60) * safeFps)}
                  color={LAUNCH_PALETTE.PRIMARY}
                  rippleColor={CYAN}
                />
              </Interactive.Div>
            ) : null}
          </div>
        </div>
      </CameraStage>

      <EditorialFrameMarks chapterCode="03" chapterLabel="12:30 – 18:00 • POLYMART & POLYRENT" />
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
