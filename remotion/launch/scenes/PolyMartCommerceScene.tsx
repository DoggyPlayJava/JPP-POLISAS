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
  Share2,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { GeometricSparkBurst } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';
import { ExplodedLayer, KineticWindow } from '../ui/KineticCard';

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
  const { fps, durationInFrames } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeDuration = Math.max(30, Number.isFinite(durationInFrames) ? durationInFrames : 396);
  const timeSec = frame / safeFps;

  const safeProductsCount = Number.isFinite(productsCount)
    ? Math.max(0, Math.round(productsCount))
    : 277;
  const safeOrdersCount = Number.isFinite(ordersCount)
    ? Math.max(0, Math.round(ordersCount))
    : 344;

  const resolvedHeadline = resolveStudentHeadline(headline);

  // Beat 1 (0..1.5s): Top-Left Compact Student Editorial Header + Tabular KPIs
  const pillStart = 0;
  const pillDuration = Math.max(8, Math.round(0.35 * safeFps));
  const headlineStart = Math.round(0.1 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.055 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.34 * safeFps));
  const subtitleStart = Math.round(0.42 * safeFps);
  const subtitleDuration = Math.max(8, Math.round(0.38 * safeFps));
  const kpiStart = Math.round(0.55 * safeFps);
  const kpiDuration = Math.max(8, Math.round(0.4 * safeFps));

  const productsEnd = Math.round(2.4 * safeFps);
  const ordersEnd = Math.round(2.6 * safeFps);
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

  // Beat 1–2 (0.35..3.2s): Upper-Left/Center Foreground Plane — PolyMart Storefront
  const martEnterFrame = Math.round(0.35 * safeFps);
  const martEnterDuration = Math.max(12, Math.round(0.6 * safeFps));
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
    [martEnterFrame, martEnterFrame + Math.max(6, Math.round(0.22 * safeFps))],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  // Animated Category Pills Strip: Terhangat lights cleanly into #C96F4F
  const categoryHighlightT = interpolate(
    frame,
    [Math.round(0.5 * safeFps), Math.round(0.85 * safeFps)],
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
    [LAUNCH_PALETTE.SURFACE_MUTED, LAUNCH_PALETTE.ACCENT],
  );
  const activeCategoryBorder = interpolateColors(
    categoryHighlightT,
    [0, 1],
    [LAUNCH_PALETTE.TERTIARY, LAUNCH_PALETTE.ACCENT],
  );
  const activeCategoryInk = interpolateColors(
    categoryHighlightT,
    [0, 1],
    [LAUNCH_PALETTE.PRIMARY, LAUNCH_PALETTE.CARD_BG],
  );

  // Live interactive product additions inside PolyMart (0 -> 1 -> 2 -> 3 ITEM, RM 27.00)
  const item1AddFrame = Math.round(0.95 * safeFps); // ~57f
  const item2AddFrame = Math.round(1.38 * safeFps); // ~83f
  const item3AddFrame = Math.round(1.8 * safeFps); // ~108f
  const item1Added = frame >= item1AddFrame;
  const item2Added = frame >= item2AddFrame;
  const item3Added = frame >= item3AddFrame;
  const cartCount = (item1Added ? 1 : 0) + (item2Added ? 1 : 0) + (item3Added ? 1 : 0);
  const cartTotalRm = (item1Added ? 9 : 0) + (item2Added ? 6 : 0) + (item3Added ? 12 : 0);

  const item1BtnSpring =
    frame >= item1AddFrame
      ? spring({
          frame: frame - item1AddFrame,
          fps: safeFps,
          config: { damping: 14, stiffness: 260, mass: 0.75 },
        })
      : 0;
  const item2BtnSpring =
    frame >= item2AddFrame
      ? spring({
          frame: frame - item2AddFrame,
          fps: safeFps,
          config: { damping: 14, stiffness: 260, mass: 0.75 },
        })
      : 0;
  const item3BtnSpring =
    frame >= item3AddFrame
      ? spring({
          frame: frame - item3AddFrame,
          fps: safeFps,
          config: { damping: 14, stiffness: 260, mass: 0.75 },
        })
      : 0;

  const item1Scale =
    frame >= item1AddFrame && frame < item1AddFrame + 16
      ? interpolate(frame, [item1AddFrame, item1AddFrame + 4, item1AddFrame + 16], [1, 0.92, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;
  const item2Scale =
    frame >= item2AddFrame && frame < item2AddFrame + 16
      ? interpolate(frame, [item2AddFrame, item2AddFrame + 4, item2AddFrame + 16], [1, 0.92, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;
  const item3Scale =
    frame >= item3AddFrame && frame < item3AddFrame + 16
      ? interpolate(frame, [item3AddFrame, item3AddFrame + 4, item3AddFrame + 16], [1, 0.92, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;

  const latestCartEventFrame = item3Added
    ? item3AddFrame
    : item2Added
      ? item2AddFrame
      : item1Added
        ? item1AddFrame
        : -1;
  const cartBadgePulse =
    latestCartEventFrame >= 0
      ? interpolate(
          frame,
          [latestCartEventFrame, latestCartEventFrame + 5, latestCartEventFrame + 18],
          [1, 1.12, 1],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          },
        )
      : 1;

  // Floating JPP PAY • PESANAN #${safeOrdersCount} SIAP DIAMBIL ✓ pickup pass (Beat 2 slam ~2.18s / ~131f)
  const receiptSlamFrame = Math.round(2.18 * safeFps);
  const receiptSpring =
    frame >= receiptSlamFrame
      ? spring({
          frame: frame - receiptSlamFrame,
          fps: safeFps,
          config: { damping: 15, stiffness: 230, mass: 0.85 },
        })
      : 0;
  const receiptScale = 1.2 + (1 - 1.2) * receiptSpring;
  const receiptHighlightStart = receiptSlamFrame + Math.round(0.14 * safeFps);
  const receiptHighlightDur = Math.max(10, Math.round(0.48 * safeFps));

  // Beat 2–3 (2.9..6.6s, 174..396f): Stage Manager Depth Rack-Focus into Lower-Right PolyRent Deck
  const rentDockEnterStart = Math.round(1.35 * safeFps); // 81f
  const rentDockEnterEnd = Math.round(1.95 * safeFps); // 117f
  const rentDockEnter = interpolate(frame, [rentDockEnterStart, rentDockEnterEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  const rackFocusStart = Math.round(2.9 * safeFps); // 174f
  const rackFocusEnd = Math.round(3.85 * safeFps); // 231f
  const rackFocus = interpolate(frame, [rackFocusStart, rackFocusEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: STAGE_MANAGER_EASE,
  });

  // PolyMart smoothly glides upper-left into secondary Stage Manager plane
  const martFloatY = Math.sin(timeSec * 1.35) * 3.0 * martEnterProgress;
  const martTx =
    interpolate(rackFocus, [0, 1], [0, -34]) +
    interpolate(martEnterProgress, [0, 1], [-18, 0]);
  const martTy =
    interpolate(rackFocus, [0, 1], [0, -14]) +
    interpolate(martEnterProgress, [0, 1], [34, 0]) +
    martFloatY;
  const martScale =
    interpolate(martEnterProgress, [0, 1], [0.94, 1]) *
    interpolate(rackFocus, [0, 1], [1, 0.9]);
  const martRotateY = interpolate(rackFocus, [0, 1], [2.5, 5.5]);
  const martOpacity = martOpacityEnter * interpolate(rackFocus, [0, 1], [1, 0.88]);

  // Pickup pass softly steps back slightly during Beat 3 while remaining crisp
  const receiptRackOpacity = interpolate(rackFocus, [0, 1], [1, 0.94]);
  const receiptRackScale = interpolate(rackFocus, [0, 1], [1, 0.96]);

  // PolyRent surges forward into hero plane (scale: 0.88 -> 1.02)
  const rentFloatY = Math.cos(timeSec * 1.25 + 1.1) * 3.0 * rentDockEnter;
  const rentDockOpacity = interpolate(rentDockEnter, [0, 0.35, 1], [0, 0.68, 0.68], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rentOpacity = interpolate(rackFocus, [0, 1], [rentDockOpacity, 1]);
  const rentScale =
    interpolate(rentDockEnter, [0, 1], [0.83, 0.88]) +
    interpolate(rackFocus, [0, 1], [0, 0.14]); // settles at 1.02
  const rentRotateY = interpolate(rackFocus, [0, 1], [-6.5, -1.8]);
  const rentTx =
    interpolate(rentDockEnter, [0, 1], [34, 0]) +
    interpolate(rackFocus, [0, 1], [0, -10]);
  const rentTy =
    interpolate(rentDockEnter, [0, 1], [30, 0]) +
    interpolate(rackFocus, [0, 1], [0, -10]) +
    rentFloatY;

  // Student Mode Toggle inside PolyRent: switches & lights cleanly into "Cari Bilik Sewa" (#C96F4F) on Beat 2
  const rentModeSwitchStart = Math.round(2.75 * safeFps); // 165f
  const rentModeSwitchEnd = Math.round(3.3 * safeFps); // 198f
  const bilikModeActiveT = interpolate(frame, [rentModeSwitchStart, rentModeSwitchEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const bilikPillBg = interpolateColors(
    bilikModeActiveT,
    [0, 1],
    ['rgba(248, 246, 238, 0.08)', LAUNCH_PALETTE.ACCENT],
  );
  const bilikPillBorder = interpolateColors(
    bilikModeActiveT,
    [0, 1],
    ['rgba(217, 201, 178, 0.25)', LAUNCH_PALETTE.ACCENT],
  );
  const bilikPillInk = interpolateColors(
    bilikModeActiveT,
    [0, 1],
    [LAUNCH_PALETTE.TERTIARY, LAUNCH_PALETTE.CARD_BG],
  );
  const roommatePillBg = interpolateColors(
    bilikModeActiveT,
    [0, 1],
    ['rgba(107, 127, 91, 0.34)', 'rgba(248, 246, 238, 0.08)'],
  );
  const roommatePillBorder = interpolateColors(
    bilikModeActiveT,
    [0, 1],
    ['rgba(217, 201, 178, 0.48)', 'rgba(217, 201, 178, 0.24)'],
  );
  const roommatePillInk = interpolateColors(
    bilikModeActiveT,
    [0, 1],
    [LAUNCH_PALETTE.BACKGROUND, LAUNCH_PALETTE.TERTIARY],
  );

  // Live Kalkulator Sewa inside PolyRent: RM 680 / bln divided by 2 -> 3 -> 4 Pelajar (RM 170 / bln seorang)
  const step3Frame = Math.round(3.45 * safeFps); // 207f
  const step4Frame = Math.round(4.15 * safeFps); // 249f
  const roommates = frame >= step4Frame ? 4 : frame >= step3Frame ? 3 : 2;
  const monthlyRent = 680;
  const perPersonRent = Math.round(monthlyRent / roommates);

  const smoothShareRatio =
    frame < step3Frame
      ? 0.5
      : frame < step4Frame
        ? interpolate(frame, [step3Frame, step3Frame + 18], [0.5, 1 / 3], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: EXPO_OUT,
          })
        : interpolate(frame, [step4Frame, step4Frame + 18], [1 / 3, 0.25], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: EXPO_OUT,
          });

  const calcResultPop =
    frame >= step4Frame
      ? interpolate(frame, [step4Frame, step4Frame + 6, step4Frame + 20], [0.94, 1.06, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : frame >= step3Frame
        ? interpolate(frame, [step3Frame, step3Frame + 6, step3Frame + 20], [0.94, 1.05, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        : 1;

  const activePillSpring4 =
    frame >= step4Frame
      ? spring({
          frame: frame - step4Frame,
          fps: safeFps,
          config: { damping: 14, stiffness: 240, mass: 0.8 },
        })
      : 0;

  const splitExitFrames = Math.max(2, Math.round(0.32 * safeFps));
  const sceneEnd = Math.max(1, safeDuration - 1);
  const splitExitStart = Math.max(0, Math.min(sceneEnd - 1, safeDuration - splitExitFrames));
  const exitLead = interpolate(frame, [splitExitStart, sceneEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.55, 0, 1, 0.45),
  });
  const headerExitX = -10 * exitLead;

  const payButtonBg = item3Added
    ? LAUNCH_PALETTE.ACCENT
    : interpolateColors(item1BtnSpring, [0, 1], [LAUNCH_PALETTE.PRIMARY, LAUNCH_PALETTE.SECONDARY]);

  const studentItems = [
    {
      id: 'chicken-popcorn',
      title: 'Chicken Popcorn',
      subtitle: 'Sos Keju & Lada Hitam',
      priceLabel: 'RM 9.00',
      badge: 'Makanan',
      badgeAccent: false,
      added: item1Added,
      btnSpring: item1BtnSpring,
      btnScale: item1Scale,
      iconKind: 'food' as const,
    },
    {
      id: 'loaded-fries',
      title: 'Loaded Fries',
      subtitle: 'Kentang Rangup Istimewa',
      priceLabel: 'RM 6.00',
      badge: 'Terhangat',
      badgeAccent: true,
      added: item2Added,
      btnSpring: item2BtnSpring,
      btnScale: item2Scale,
      iconKind: 'bag' as const,
    },
    {
      id: 'lanyard-jpp',
      title: 'Lanyard Rasmi JPP',
      subtitle: 'Edisi Mahasiswa 2026',
      priceLabel: 'RM 12.00',
      badge: 'Merch Kelab',
      badgeAccent: false,
      added: item3Added,
      btnSpring: item3BtnSpring,
      btnScale: item3Scale,
      iconKind: 'merch' as const,
    },
  ] as const;

  return (
    <>
      <EditorialBackdrop />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.028}
        panXFrom={-8}
        panXTo={8}
        panYFrom={4}
        panYTo={-4}
        tiltXFrom={0.4}
        tiltXTo={-0.25}
        tiltYFrom={-0.75}
        tiltYTo={0.75}
        breathingAmplitude={0.45}
        entryZoomOffset={0.032}
        entryPanXOffset={-24}
        exitZoomDelta={0.032}
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
          {/* Top-Left Compact Student Editorial Header (x=72..1040, y=72..282) */}
          <Interactive.Div
            name="PolyMart & PolyRent Student Header"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: 72,
              top: 72,
              width: 968,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              zIndex: 18,
              transform: `translate3d(${headerExitX.toFixed(2)}px, 0px, 0px)`,
            }}
          >
            <KineticReveal startFrame={pillStart} durationFrames={pillDuration}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  alignSelf: 'flex-start',
                  padding: '5px 14px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(201, 111, 79, 0.12)',
                  border: `1px solid ${LAUNCH_PALETTE.ACCENT}`,
                  color: LAUNCH_PALETTE.ACCENT,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                <ShoppingBag size={13.5} strokeWidth={2.4} />
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
              accentColor={LAUNCH_PALETTE.ACCENT}
              style={{
                margin: 0,
                fontSize: 48,
                fontWeight: 900,
                lineHeight: 1.06,
                letterSpacing: '-0.03em',
                color: LAUNCH_PALETTE.PRIMARY,
                maxWidth: 850,
              }}
            />

            <KineticReveal startFrame={subtitleStart} durationFrames={subtitleDuration}>
              <p
                style={{
                  margin: 0,
                  fontSize: 15.5,
                  fontWeight: 600,
                  lineHeight: 1.38,
                  color: LAUNCH_PALETTE.MUTED_OLIVE,
                  maxWidth: 940,
                }}
              >
                Pesan makanan tanpa beratur di PolyMart &amp; bandingkan bilik sewa disahkan sekitar POLISAS di PolyRent.
              </p>
            </KineticReveal>

            {/* Compact Live Tabular KPI Strip */}
            <KineticReveal startFrame={kpiStart} durationFrames={kpiDuration}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '6px 13px',
                    borderRadius: 999,
                    backgroundColor: LAUNCH_PALETTE.CARD_BG,
                    border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    boxShadow: '0 8px 18px rgba(46, 58, 47, 0.06)',
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: LAUNCH_PALETTE.PRIMARY,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <ShoppingBag size={13.5} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
                  <span>{animatedProducts}+ Menu &amp; Merch</span>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '6px 13px',
                    borderRadius: 999,
                    backgroundColor: LAUNCH_PALETTE.PRIMARY,
                    border: '1.5px solid rgba(217, 201, 178, 0.28)',
                    boxShadow: '0 10px 22px rgba(31, 39, 32, 0.14)',
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: LAUNCH_PALETTE.BACKGROUND,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <Receipt size={13.5} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
                  <span>{animatedOrders}+ Pesanan Siswa</span>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 13px',
                    borderRadius: 999,
                    backgroundColor: 'rgba(107, 127, 91, 0.14)',
                    border: '1.5px solid rgba(107, 127, 91, 0.42)',
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12,
                    fontWeight: 800,
                    color: LAUNCH_PALETTE.PRIMARY,
                  }}
                >
                  <ShieldCheck size={13.5} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.5} />
                  <span>Tanpa Beratur</span>
                </div>
              </div>
            </KineticReveal>
          </Interactive.Div>

          {/* Beat 1–2 Upper-Left/Center Foreground Plane: Live Student PolyMart Storefront Deck */}
          <Interactive.Div
            name="PolyMart Storefront Deck"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: 84,
              top: 322,
              width: 888,
              height: 468,
              zIndex: frame >= rackFocusStart + 18 ? 10 : 16,
              opacity: martOpacity,
              transformOrigin: '50% 50%',
              transformStyle: 'preserve-3d',
              willChange: 'transform, opacity',
              transform: `translate3d(${martTx.toFixed(2)}px, ${martTy.toFixed(2)}px, 0px) scale(${martScale.toFixed(4)}) rotateY(${martRotateY.toFixed(2)}deg)`,
            }}
          >
            <KineticWindow
              surface="light"
              routeLabel="jpp.polisas.edu.my/polymart"
              statusPill="JPP PAY AKTIF"
              statusAccent
              width={888}
              height={468}
              borderRadius={26}
              sheenStartFrame={Math.round(0.9 * safeFps)}
              sheenDuration={44}
              style={{
                boxShadow:
                  rackFocus > 0.5
                    ? '0 20px 44px rgba(31, 39, 32, 0.12)'
                    : '0 32px 68px rgba(31, 39, 32, 0.16), 0 8px 20px rgba(31, 39, 32, 0.08)',
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: '16px 24px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  boxSizing: 'border-box',
                }}
              >
                {/* Live Vendor Header + Animated Cart Pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    paddingBottom: 11,
                    borderBottom: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 13,
                        backgroundColor: LAUNCH_PALETTE.PRIMARY,
                        border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <UtensilsCrossed size={19} color={LAUNCH_PALETTE.BACKGROUND} strokeWidth={2.2} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 900,
                            letterSpacing: '-0.015em',
                            color: LAUNCH_PALETTE.PRIMARY,
                          }}
                        >
                          QUADRA H · KAFE &amp; MERCH SISWA
                        </span>
                        <CheckCircle2 size={15} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.6} />
                      </div>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          color: LAUNCH_PALETTE.MUTED_OLIVE,
                        }}
                      >
                        DATARAN SISWA • PESAN ANTARA KULIAH &amp; TERUS AMBIL
                      </span>
                    </div>
                  </div>

                  {/* Animated + Bakul Counter Pill (0 -> 1 -> 2 -> 3 ITEM) */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 14px',
                      borderRadius: 999,
                      backgroundColor:
                        cartCount > 0 ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.SURFACE_MUTED,
                      border: `1.5px solid ${
                        cartCount > 0 ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.TERTIARY
                      }`,
                      color: cartCount > 0 ? LAUNCH_PALETTE.CARD_BG : LAUNCH_PALETTE.PRIMARY,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      fontVariantNumeric: 'tabular-nums',
                      transform: `scale(${cartBadgePulse.toFixed(4)})`,
                      flexShrink: 0,
                    }}
                  >
                    <ShoppingBag size={14} strokeWidth={2.5} />
                    <span>+ BAKUL · {cartCount} ITEM</span>
                  </div>
                </div>

                {/* Animated Category Pills Strip */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {CATEGORY_PILLS.map((cat, idx) => {
                      const isActive = idx === 0;
                      return (
                        <div
                          key={cat.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 13px',
                            borderRadius: 999,
                            backgroundColor: isActive
                              ? activeCategoryBg
                              : LAUNCH_PALETTE.SURFACE_MUTED,
                            border: `1px solid ${
                              isActive ? activeCategoryBorder : LAUNCH_PALETTE.TERTIARY
                            }`,
                            color: isActive ? activeCategoryInk : LAUNCH_PALETTE.PRIMARY,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {isActive ? <Flame size={11.5} strokeWidth={2.6} /> : null}
                          <span>{cat.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: LAUNCH_PALETTE.MUTED_OLIVE,
                    }}
                  >
                    SIAP 5–8 MIN
                  </span>
                </div>

                {/* 3 Sleek Compact Student Product Cards Side-by-Side */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12,
                    flex: 1,
                  }}
                >
                  {studentItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: 18,
                        padding: '13px 14px',
                        backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                        border: `1.5px solid ${
                          item.added ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.TERTIARY
                        }`,
                        boxShadow: item.added
                          ? '0 10px 22px rgba(201, 111, 79, 0.14)'
                          : '0 6px 14px rgba(46, 58, 47, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 10,
                        boxSizing: 'border-box',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                            border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {item.iconKind === 'food' ? (
                            <UtensilsCrossed size={19} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.2} />
                          ) : item.iconKind === 'bag' ? (
                            <ShoppingBag size={19} color={LAUNCH_PALETTE.PRIMARY} strokeWidth={2.2} />
                          ) : (
                            <Tag size={19} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.2} />
                          )}
                        </div>

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 9px',
                            borderRadius: 999,
                            backgroundColor: item.badgeAccent
                              ? 'rgba(201, 111, 79, 0.14)'
                              : 'rgba(107, 127, 91, 0.14)',
                            border: `1px solid ${
                              item.badgeAccent
                                ? 'rgba(201, 111, 79, 0.36)'
                                : 'rgba(107, 127, 91, 0.34)'
                            }`,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10,
                            fontWeight: 800,
                            color: item.badgeAccent ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.PRIMARY,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.badgeAccent ? <Flame size={10} strokeWidth={2.6} /> : null}
                          <span>{item.badge}</span>
                        </span>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 17.5,
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            lineHeight: 1.18,
                            color: LAUNCH_PALETTE.PRIMARY,
                          }}
                        >
                          {item.title}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: LAUNCH_PALETTE.MUTED_OLIVE,
                          }}
                        >
                          {item.subtitle}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6,
                          paddingTop: 4,
                        }}
                      >
                        <span
                          style={{
                            padding: '5px 10px',
                            borderRadius: 999,
                            backgroundColor: 'rgba(201, 111, 79, 0.12)',
                            border: '1px solid rgba(201, 111, 79, 0.34)',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 12.5,
                            fontWeight: 900,
                            color: LAUNCH_PALETTE.ACCENT,
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.priceLabel}
                        </span>

                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 11px',
                            borderRadius: 999,
                            backgroundColor: item.added
                              ? LAUNCH_PALETTE.PRIMARY
                              : LAUNCH_PALETTE.ACCENT,
                            color: LAUNCH_PALETTE.CARD_BG,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 800,
                            letterSpacing: '0.03em',
                            whiteSpace: 'nowrap',
                            transform: `scale(${(item.btnScale * (1 + 0.04 * (1 - item.btnSpring) * (item.added ? 1 : 0))).toFixed(4)})`,
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
                              <span>Bakul</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Checkout Footer Bar */}
                <div
                  style={{
                    height: 48,
                    padding: '0 16px',
                    borderRadius: 15,
                    backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                    border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <ShieldCheck size={16} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.5} />
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12,
                        fontWeight: 800,
                        color: LAUNCH_PALETTE.PRIMARY,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      JUMLAH BAKUL ({cartCount} ITEM): RM {cartTotalRm.toFixed(2)}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '6px 14px',
                      borderRadius: 999,
                      backgroundColor: payButtonBg,
                      color: LAUNCH_PALETTE.CARD_BG,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.07em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {frame >= receiptSlamFrame
                      ? `PESANAN #${safeOrdersCount} SIAP DIAMBIL ✓`
                      : 'BAYAR GUNA JPP PAY'}
                  </div>
                </div>
              </div>
            </KineticWindow>
          </Interactive.Div>

          {/* Floating ExplodedLayer zDepth={28}: JPP PAY • PESANAN #${safeOrdersCount} SIAP DIAMBIL ✓ */}
          <GeometricSparkBurst
            triggerFrame={receiptSlamFrame + 2}
            x={1750}
            y={135}
            durationFrames={Math.max(16, Math.round(0.6 * safeFps))}
            radius={82}
            count={10}
            seed="polymart-jpp-pay-receipt"
            style={{ zIndex: 20 }}
          />

          <Interactive.Div
            name="JPP Pay Digital Pickup Pass"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: 1110,
              top: 94,
              width: 688,
              zIndex: 22,
              opacity: receiptRackOpacity,
              transform: `scale(${receiptRackScale.toFixed(4)})`,
              transformOrigin: '50% 50%',
              transformStyle: 'preserve-3d',
            }}
          >
            <ExplodedLayer
              zDepth={28}
              enterFrame={receiptSlamFrame}
              enterOffsetY={20}
              enterOffsetX={16}
              floatAmplitude={2.4}
              floatPhase={0.6}
            >
              <div
                style={{
                  borderRadius: 22,
                  padding: '16px 20px',
                  backgroundColor: LAUNCH_PALETTE.CARD_BG,
                  border: `2px solid ${LAUNCH_PALETTE.ACCENT}`,
                  boxShadow:
                    '0 24px 52px rgba(31, 39, 32, 0.2), inset 0 0 0 1.5px rgba(217, 201, 178, 0.5)',
                  transform: `scale(${receiptScale.toFixed(4)})`,
                  transformOrigin: '50% 50%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 9,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.ACCENT,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={15} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={3} />
                    </span>
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 13.5,
                        fontWeight: 900,
                        letterSpacing: '0.05em',
                        color: LAUNCH_PALETTE.PRIMARY_DARK,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {`JPP PAY • PESANAN #${safeOrdersCount} SIAP DIAMBIL ✓`}
                    </span>
                  </div>

                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                      border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10,
                      fontWeight: 800,
                      color: LAUNCH_PALETTE.SECONDARY,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    RESIT AMBILAN SISWA • TANPA BERATUR
                  </span>
                </div>

                <div
                  style={{
                    padding: '9px 14px',
                    borderRadius: 13,
                    backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                    border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    color: LAUNCH_PALETTE.PRIMARY,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {`3 ITEM • RM 27.00 • KAUNTER DATARAN SISWA`}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: LAUNCH_PALETTE.MUTED_OLIVE,
                    overflow: 'visible',
                  }}
                >
                  <ShieldCheck size={15} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.5} />
                  <span>Terus tunjuk pas digital di kaunter melalui</span>
                  <span style={{ display: 'inline-block', marginLeft: 3, overflow: 'visible' }}>
                    <EditorialAnnotation
                      type="highlight"
                      startFrame={receiptHighlightStart}
                      durationFrames={receiptHighlightDur}
                      color="rgba(217, 201, 178, 0.85)"
                      padding={{ top: 2, right: 8, bottom: 2, left: 8 }}
                      iterations={1}
                      seed={14}
                      style={{ display: 'inline-block', overflow: 'visible' }}
                    >
                      <span
                        style={{
                          fontWeight: 900,
                          color: LAUNCH_PALETTE.PRIMARY_DARK,
                        }}
                      >
                        JPP Pay
                      </span>
                    </EditorialAnnotation>
                  </span>
                </div>
              </div>
            </ExplodedLayer>
          </Interactive.Div>

          {/* Beat 2–3 Lower-Right Hero Plane: Live Student PolyRent Housing Deck */}
          <Interactive.Div
            name="PolyRent Housing Deck"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: 942,
              top: 416,
              width: 874,
              height: 498,
              zIndex: frame >= rackFocusStart + 18 ? 19 : 8,
              opacity: rentOpacity,
              transformOrigin: '50% 50%',
              transformStyle: 'preserve-3d',
              willChange: 'transform, opacity',
              transform: `translate3d(${rentTx.toFixed(2)}px, ${rentTy.toFixed(2)}px, 0px) scale(${rentScale.toFixed(4)}) rotateY(${rentRotateY.toFixed(2)}deg)`,
            }}
          >
            <KineticWindow
              surface="dark"
              routeLabel="jpp.polisas.edu.my/polyrent"
              statusPill="VERIFIED SISWA ✓"
              statusAccent
              width={874}
              height={498}
              borderRadius={26}
              sheenStartFrame={Math.round(3.25 * safeFps)}
              sheenDuration={46}
              style={{
                boxShadow:
                  rackFocus > 0.35
                    ? '0 36px 76px rgba(31, 39, 32, 0.34), 0 10px 24px rgba(31, 39, 32, 0.18)'
                    : '0 20px 44px rgba(31, 39, 32, 0.2)',
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: '18px 24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 13,
                  boxSizing: 'border-box',
                }}
              >
                {/* Animated Student Mode Toggle: Cari Bilik Sewa / Cari Roommate */}
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
                      padding: 4,
                      borderRadius: 999,
                      backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                      border: '1px solid rgba(217, 201, 178, 0.22)',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 999,
                        backgroundColor: bilikPillBg,
                        border: `1px solid ${bilikPillBorder}`,
                        color: bilikPillInk,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Home size={12.5} strokeWidth={2.5} />
                      <span>Cari Bilik Sewa</span>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 999,
                        backgroundColor: roommatePillBg,
                        border: `1px solid ${roommatePillBorder}`,
                        color: roommatePillInk,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Users size={12.5} strokeWidth={2.5} />
                      <span>Cari Roommate</span>
                    </div>
                  </div>

                  {/* Verified Siswa • WhatsApp Terus ✓ Badge */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '6px 13px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(107, 127, 91, 0.3)',
                      border: '1px solid rgba(217, 201, 178, 0.42)',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.03em',
                      color: LAUNCH_PALETTE.BACKGROUND,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <MessageCircle size={13.5} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.5} />
                    <span>Verified Siswa • WhatsApp Terus ✓</span>
                  </div>
                </div>

                {/* Verified Student Listing Card */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    padding: '13px 16px',
                    borderRadius: 18,
                    backgroundColor: 'rgba(248, 246, 238, 0.06)',
                    border: '1px solid rgba(217, 201, 178, 0.24)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        backgroundColor: 'rgba(201, 111, 79, 0.22)',
                        border: '1.5px solid rgba(201, 111, 79, 0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <MapPin size={21} color={LAUNCH_PALETTE.BACKGROUND} strokeWidth={2.2} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 19.5,
                          fontWeight: 900,
                          letterSpacing: '-0.02em',
                          color: LAUNCH_PALETTE.BACKGROUND,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Taman Pertama Semambu • 3 Min dari POLISAS
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: LAUNCH_PALETTE.TERTIARY,
                          }}
                        >
                          Bilik Master · Lengkap WiFi &amp; Katil
                        </span>
                        <span
                          style={{
                            padding: '2px 9px',
                            borderRadius: 999,
                            backgroundColor: 'rgba(248, 246, 238, 0.09)',
                            border: '1px solid rgba(217, 201, 178, 0.28)',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10,
                            fontWeight: 700,
                            color: LAUNCH_PALETTE.BACKGROUND,
                          }}
                        >
                          Lelaki / Perempuan
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 11px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(201, 111, 79, 0.2)',
                      border: '1px solid rgba(201, 111, 79, 0.45)',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: LAUNCH_PALETTE.BACKGROUND,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={13} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.5} />
                    <span>PILIHAN JIMAT</span>
                  </div>
                </div>

                {/* Live Code-Driven Kalkulator Sewa Panel */}
                <div
                  style={{
                    flex: 1,
                    borderRadius: 20,
                    padding: '16px 18px',
                    backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                    border: '1.5px solid rgba(217, 201, 178, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          backgroundColor: 'rgba(201, 111, 79, 0.2)',
                          border: '1px solid rgba(201, 111, 79, 0.48)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Calculator size={17} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.3} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: LAUNCH_PALETTE.BACKGROUND,
                            lineHeight: 1.15,
                          }}
                        >
                          Kalkulator Sewa
                        </div>
                        <div
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: '0.09em',
                            color: LAUNCH_PALETTE.TERTIARY,
                            marginTop: 2,
                          }}
                        >
                          BANDING &amp; BAHAGI SEWA ROOMMATE
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(248, 246, 238, 0.08)',
                        border: '1px solid rgba(217, 201, 178, 0.24)',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12,
                        fontWeight: 800,
                        color: LAUNCH_PALETTE.TERTIARY,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      Sewa Rumah: RM {monthlyRent} / bln
                    </div>
                  </div>

                  {/* Selector + Live Tabular Output */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.08fr 1fr',
                      gap: 14,
                      alignItems: 'stretch',
                    }}
                  >
                    {/* Left: Animated Roommate Selector (2 -> 3 -> 4 Pelajar) */}
                    <div
                      style={{
                        borderRadius: 15,
                        padding: '12px 14px',
                        backgroundColor: 'rgba(248, 246, 238, 0.05)',
                        border: '1px solid rgba(217, 201, 178, 0.16)',
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
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            color: LAUNCH_PALETTE.TERTIARY,
                          }}
                        >
                          <Users size={13} color={LAUNCH_PALETTE.ACCENT} />
                          <span>BILANGAN ROOMMATE</span>
                        </span>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 12,
                            fontWeight: 800,
                            color: LAUNCH_PALETTE.BACKGROUND,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {roommates} Pelajar
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 9 }}>
                        {[2, 3, 4].map((count) => {
                          const isSelected = roommates === count;
                          const pop = count === 4 && isSelected ? 1 + 0.05 * (1 - activePillSpring4) : 1;
                          return (
                            <div
                              key={count}
                              style={{
                                flex: 1,
                                height: 42,
                                borderRadius: 12,
                                backgroundColor: isSelected
                                  ? LAUNCH_PALETTE.ACCENT
                                  : 'rgba(248, 246, 238, 0.06)',
                                border: `1.5px solid ${
                                  isSelected
                                    ? LAUNCH_PALETTE.ACCENT
                                    : 'rgba(217, 201, 178, 0.22)'
                                }`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 13.5,
                                fontWeight: 900,
                                color: isSelected
                                  ? LAUNCH_PALETTE.CARD_BG
                                  : LAUNCH_PALETTE.TERTIARY,
                                fontVariantNumeric: 'tabular-nums',
                                transform: `scale(${pop.toFixed(4)})`,
                              }}
                            >
                              {count} Pelajar
                            </div>
                          );
                        })}
                      </div>

                      {/* 4-segment visual split bar */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[1, 2, 3, 4].map((slot) => {
                          const active = slot <= roommates;
                          return (
                            <div
                              key={slot}
                              style={{
                                flex: 1,
                                height: 8,
                                borderRadius: 999,
                                backgroundColor: active
                                  ? slot === roommates
                                    ? LAUNCH_PALETTE.ACCENT
                                    : LAUNCH_PALETTE.SECONDARY
                                  : 'rgba(217, 201, 178, 0.16)',
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Live Result Card (RM 170 / bln seorang) */}
                    <div
                      style={{
                        borderRadius: 15,
                        padding: '12px 16px',
                        backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                        border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 8,
                        color: LAUNCH_PALETTE.PRIMARY,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 800,
                            letterSpacing: '0.09em',
                            color: LAUNCH_PALETTE.MUTED_OLIVE,
                          }}
                        >
                          SEORANG PERLU BAYAR
                        </span>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11,
                            fontWeight: 800,
                            color: LAUNCH_PALETTE.ACCENT,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          RM {monthlyRent} ÷ {roommates}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 7,
                          transform: `scale(${calcResultPop.toFixed(4)})`,
                          transformOrigin: '0% 50%',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 38,
                            fontWeight: 900,
                            letterSpacing: '-0.03em',
                            color: LAUNCH_PALETTE.PRIMARY,
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: 1,
                          }}
                        >
                          RM {perPersonRent}
                        </span>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 14,
                            fontWeight: 800,
                            color: LAUNCH_PALETTE.ACCENT,
                          }}
                        >
                          / bln seorang
                        </span>
                      </div>

                      {/* Proportional bar */}
                      <div
                        style={{
                          height: 10,
                          borderRadius: 999,
                          backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                          overflow: 'hidden',
                          border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                        }}
                      >
                        <div
                          style={{
                            width: `${(smoothShareRatio * 100).toFixed(2)}%`,
                            height: '100%',
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.ACCENT,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Strip */}
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
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 700,
                      color: LAUNCH_PALETTE.TERTIARY,
                    }}
                  >
                    Termasuk WiFi &amp; bil kongsi — terus WhatsApp tuan rumah atau cari roommate
                  </span>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '7px 14px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(248, 246, 238, 0.1)',
                      border: '1px solid rgba(217, 201, 178, 0.28)',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 800,
                      color: LAUNCH_PALETTE.BACKGROUND,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Share2 size={13} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
                    <span>Kongsi Pecahan</span>
                  </div>
                </div>
              </div>
            </KineticWindow>
          </Interactive.Div>
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
