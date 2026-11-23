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
  Plus,
  Receipt,
  Share2,
  ShieldCheck,
  ShoppingBag,
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

  // Beat 1 (0..1.5s): Top-Left Compact Editorial Header + Tabular KPIs
  const pillStart = 0;
  const pillDuration = Math.max(8, Math.round(0.35 * safeFps));
  const headlineStart = Math.round(0.1 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.06 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.34 * safeFps));
  const subtitleStart = Math.round(0.4 * safeFps);
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

  // Beat 1–2 (0.4..3.5s, 24..210f): Upper-Left/Center Foreground Plane — PolyMart Storefront
  const martEnterFrame = Math.round(0.4 * safeFps);
  const martEnterDuration = Math.max(12, Math.round(0.62 * safeFps));
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

  // Live interactive product additions inside PolyMart
  const item1AddFrame = Math.round(1.18 * safeFps); // ~71f
  const item2AddFrame = Math.round(1.62 * safeFps); // ~97f
  const item1Added = frame >= item1AddFrame;
  const item2Added = frame >= item2AddFrame;
  const cartCount = (item1Added ? 1 : 0) + (item2Added ? 1 : 0);
  const cartTotalRm = (item1Added ? 9 : 0) + (item2Added ? 6 : 0);

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

  const cartBadgePulse =
    cartCount === 2
      ? interpolate(frame, [item2AddFrame, item2AddFrame + 5, item2AddFrame + 18], [1, 1.12, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : cartCount === 1
        ? interpolate(frame, [item1AddFrame, item1AddFrame + 5, item1AddFrame + 18], [1, 1.12, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        : 1;

  // Floating JPP PAY DISAHKAN ✓ receipt badge (Beat 2 slam @ 1.98s / ~119f + Highlight across JPP Pay)
  const receiptSlamFrame = Math.round(1.98 * safeFps);
  const receiptSpring =
    frame >= receiptSlamFrame
      ? spring({
          frame: frame - receiptSlamFrame,
          fps: safeFps,
          config: { damping: 15, stiffness: 230, mass: 0.85 },
        })
      : 0;
  const receiptScale = 1.24 + (1 - 1.24) * receiptSpring;
  const receiptHighlightStart = receiptSlamFrame + Math.round(0.14 * safeFps);
  const receiptHighlightDur = Math.max(10, Math.round(0.48 * safeFps));

  // Beat 2–3 (2.9..6.6s, 174..396f): Stage Manager Depth Rack-Focus into Lower-Right PolyRent Deck
  const rentDockEnterStart = Math.round(1.35 * safeFps); // 81f (enters secondary plane softly)
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
  const martFloatY = Math.sin(timeSec * 1.35) * 3.5 * martEnterProgress;
  const martTx =
    interpolate(rackFocus, [0, 1], [0, -56]) +
    interpolate(martEnterProgress, [0, 1], [-20, 0]);
  const martTy =
    interpolate(rackFocus, [0, 1], [0, -22]) +
    interpolate(martEnterProgress, [0, 1], [38, 0]) +
    martFloatY;
  const martScale =
    interpolate(martEnterProgress, [0, 1], [0.94, 1]) *
    interpolate(rackFocus, [0, 1], [1, 0.9]);
  const martRotateY = interpolate(rackFocus, [0, 1], [3, 6]);
  const martOpacity = martOpacityEnter * interpolate(rackFocus, [0, 1], [1, 0.86]);

  // Receipt gently softens alongside PolyMart during Beat 3
  const receiptRackOpacity = interpolate(rackFocus, [0, 1], [1, 0.86]);
  const receiptRackScale = interpolate(rackFocus, [0, 1], [1, 0.94]);

  // PolyRent surges forward into hero plane (scale: 0.88 -> 1.02)
  const rentFloatY = Math.cos(timeSec * 1.25 + 1.1) * 3.5 * rentDockEnter;
  const rentDockOpacity = interpolate(rentDockEnter, [0, 0.35, 1], [0, 0.66, 0.66], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rentOpacity = interpolate(rackFocus, [0, 1], [rentDockOpacity, 1]);
  const rentScale =
    interpolate(rentDockEnter, [0, 1], [0.83, 0.88]) +
    interpolate(rackFocus, [0, 1], [0, 0.14]); // settles at 1.02
  const rentRotateY = interpolate(rackFocus, [0, 1], [-7, -1.8]);
  const rentTx =
    interpolate(rentDockEnter, [0, 1], [36, 0]) +
    interpolate(rackFocus, [0, 1], [0, -10]);
  const rentTy =
    interpolate(rentDockEnter, [0, 1], [34, 0]) +
    interpolate(rackFocus, [0, 1], [0, -12]) +
    rentFloatY;

  // Live Kalkulator Bahagi Sewa inside PolyRent: 2 -> 3 -> 4 Pelajar
  const step3Frame = Math.round(3.5 * safeFps); // 210f
  const step4Frame = Math.round(4.15 * safeFps); // 249f
  const roommates = frame >= step4Frame ? 4 : frame >= step3Frame ? 3 : 2;
  const monthlyRent = 720;
  const perPersonRent = Math.round(monthlyRent / roommates);

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

  const payButtonBg = item2Added
    ? LAUNCH_PALETTE.ACCENT
    : interpolateColors(item1BtnSpring, [0, 1], [LAUNCH_PALETTE.PRIMARY, LAUNCH_PALETTE.SECONDARY]);

  return (
    <>
      <EditorialBackdrop />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.03}
        panXFrom={-10}
        panXTo={10}
        panYFrom={4}
        panYTo={-4}
        tiltXFrom={0.4}
        tiltXTo={-0.25}
        tiltYFrom={-0.8}
        tiltYTo={0.8}
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
          {/* Top-Left Compact Editorial Header (x=72..952, y=82..288) */}
          <Interactive.Div
            name="PolyMart & PolyRent Editorial Header"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: 72,
              top: 82,
              width: 880,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
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
                  padding: '6px 15px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(201, 111, 79, 0.12)',
                  border: `1px solid ${LAUNCH_PALETTE.ACCENT}`,
                  color: LAUNCH_PALETTE.ACCENT,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                <ShoppingBag size={14} strokeWidth={2.4} />
                <span>EKONOMI &amp; KEDIAMAN SISWA</span>
              </div>
            </KineticReveal>

            <KineticWords
              as="h2"
              text={headline}
              startFrame={headlineStart}
              staggerFrames={wordStagger}
              wordDurationFrames={wordDuration}
              accentWords={['Dalam', 'Genggaman.']}
              accentColor={LAUNCH_PALETTE.ACCENT}
              style={{
                margin: 0,
                fontSize: 44,
                fontWeight: 900,
                lineHeight: 1.07,
                letterSpacing: '-0.03em',
                color: LAUNCH_PALETTE.PRIMARY,
                maxWidth: 820,
              }}
            />

            <KineticReveal startFrame={subtitleStart} durationFrames={subtitleDuration}>
              <p
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 500,
                  lineHeight: 1.4,
                  color: LAUNCH_PALETTE.MUTED_OLIVE,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Usahawan siswa &amp; bilik sewa disahkan JPP POLISAS — transaksi tanpa tunai.
              </p>
            </KineticReveal>

            {/* Compact Live Tabular KPI Strip */}
            <KineticReveal startFrame={kpiStart} durationFrames={kpiDuration}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 14px',
                    borderRadius: 999,
                    backgroundColor: LAUNCH_PALETTE.CARD_BG,
                    border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    boxShadow: '0 8px 18px rgba(46, 58, 47, 0.06)',
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 13,
                    fontWeight: 800,
                    color: LAUNCH_PALETTE.PRIMARY,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <ShoppingBag size={14} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
                  <span>{animatedProducts}+ Produk</span>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 14px',
                    borderRadius: 999,
                    backgroundColor: LAUNCH_PALETTE.PRIMARY,
                    border: '1.5px solid rgba(217, 201, 178, 0.28)',
                    boxShadow: '0 10px 22px rgba(31, 39, 32, 0.14)',
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 13,
                    fontWeight: 800,
                    color: LAUNCH_PALETTE.BACKGROUND,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <Receipt size={14} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
                  <span>{animatedOrders}+ Pesanan</span>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '7px 14px',
                    borderRadius: 999,
                    backgroundColor: 'rgba(107, 127, 91, 0.14)',
                    border: '1.5px solid rgba(107, 127, 91, 0.42)',
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: LAUNCH_PALETTE.PRIMARY,
                  }}
                >
                  <ShieldCheck size={14} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.5} />
                  <span>Verified JPP</span>
                </div>
              </div>
            </KineticReveal>
          </Interactive.Div>

          {/* Beat 1–2 Upper-Left/Center Foreground Plane: Live Code-Driven PolyMart Storefront Deck */}
          <Interactive.Div
            name="PolyMart Storefront Deck"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: 148,
              top: 314,
              width: 794,
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
              width={794}
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
                  padding: '20px 26px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16,
                  boxSizing: 'border-box',
                }}
              >
                {/* Live Vendor Header + Animated Cart Pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    paddingBottom: 14,
                    borderBottom: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: LAUNCH_PALETTE.PRIMARY,
                        border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <UtensilsCrossed size={20} color={LAUNCH_PALETTE.BACKGROUND} strokeWidth={2.2} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 900,
                            letterSpacing: '-0.01em',
                            color: LAUNCH_PALETTE.PRIMARY,
                          }}
                        >
                          QUADRA H · PENIAGA SAH POLISAS
                        </span>
                        <CheckCircle2 size={15} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.6} />
                      </div>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          color: LAUNCH_PALETTE.MUTED_OLIVE,
                        }}
                      >
                        DATARAN SISWA • AMBIL SENDIRI / HANTAR KOLEJ
                      </span>
                    </div>
                  </div>

                  {/* Animated Cart Pill (0 -> 1 -> 2 ITEM) */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 15px',
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
                    <span>{cartCount} ITEM</span>
                  </div>
                </div>

                {/* 2 Live Product Tiles */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                    flex: 1,
                  }}
                >
                  {/* Tile 1: Chicken Popcorn */}
                  <div
                    style={{
                      borderRadius: 20,
                      padding: '16px 18px',
                      backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                      border: `1.5px solid ${
                        item1Added ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.TERTIARY
                      }`,
                      boxShadow: item1Added
                        ? '0 10px 24px rgba(201, 111, 79, 0.14)'
                        : '0 6px 14px rgba(46, 58, 47, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 12,
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 16,
                          backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                          border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                        }}
                      >
                        <UtensilsCrossed size={24} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.2} />
                      </div>

                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          backgroundColor: 'rgba(107, 127, 91, 0.15)',
                          border: '1px solid rgba(107, 127, 91, 0.35)',
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        Stok: 18
                      </span>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 19,
                          fontWeight: 900,
                          letterSpacing: '-0.02em',
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        Chicken Popcorn
                      </div>
                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: LAUNCH_PALETTE.MUTED_OLIVE,
                        }}
                      >
                        Sos Keju &amp; Lada Hitam • Rangup
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        paddingTop: 6,
                      }}
                    >
                      <span
                        style={{
                          padding: '6px 12px',
                          borderRadius: 999,
                          backgroundColor: 'rgba(201, 111, 79, 0.14)',
                          border: '1px solid rgba(201, 111, 79, 0.38)',
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 14,
                          fontWeight: 900,
                          color: LAUNCH_PALETTE.ACCENT,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        RM 9.00
                      </span>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 14px',
                          borderRadius: 999,
                          backgroundColor: item1Added
                            ? LAUNCH_PALETTE.PRIMARY
                            : LAUNCH_PALETTE.ACCENT,
                          color: LAUNCH_PALETTE.CARD_BG,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          transform: `scale(${(item1Scale * (1 + 0.04 * (1 - item1BtnSpring) * (item1Added ? 1 : 0))).toFixed(4)})`,
                        }}
                      >
                        {item1Added ? (
                          <>
                            <Check size={13} strokeWidth={3} />
                            <span>Ditambah</span>
                          </>
                        ) : (
                          <>
                            <Plus size={13} strokeWidth={2.8} />
                            <span>Tambah</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tile 2: Loaded Fries Original */}
                  <div
                    style={{
                      borderRadius: 20,
                      padding: '16px 18px',
                      backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                      border: `1.5px solid ${
                        item2Added ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.TERTIARY
                      }`,
                      boxShadow: item2Added
                        ? '0 10px 24px rgba(201, 111, 79, 0.14)'
                        : '0 6px 14px rgba(46, 58, 47, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 12,
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 16,
                          backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                          border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ShoppingBag size={23} color={LAUNCH_PALETTE.PRIMARY} strokeWidth={2.2} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 9px',
                            borderRadius: 999,
                            backgroundColor: 'rgba(201, 111, 79, 0.14)',
                            border: '1px solid rgba(201, 111, 79, 0.35)',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 800,
                            color: LAUNCH_PALETTE.ACCENT,
                          }}
                        >
                          <Flame size={11} strokeWidth={2.6} />
                          <span>Terhangat</span>
                        </span>
                        <span
                          style={{
                            padding: '4px 9px',
                            borderRadius: 999,
                            backgroundColor: 'rgba(107, 127, 91, 0.15)',
                            border: '1px solid rgba(107, 127, 91, 0.35)',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 800,
                            color: LAUNCH_PALETTE.PRIMARY,
                          }}
                        >
                          Stok: 20
                        </span>
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 19,
                          fontWeight: 900,
                          letterSpacing: '-0.02em',
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        Loaded Fries Original
                      </div>
                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: LAUNCH_PALETTE.MUTED_OLIVE,
                        }}
                      >
                        Kentang Rangup • Sos Istimewa
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        paddingTop: 6,
                      }}
                    >
                      <span
                        style={{
                          padding: '6px 12px',
                          borderRadius: 999,
                          backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                          border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 14,
                          fontWeight: 900,
                          color: LAUNCH_PALETTE.PRIMARY,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        RM 6.00
                      </span>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 14px',
                          borderRadius: 999,
                          backgroundColor: item2Added
                            ? LAUNCH_PALETTE.PRIMARY
                            : LAUNCH_PALETTE.ACCENT,
                          color: LAUNCH_PALETTE.CARD_BG,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          transform: `scale(${(item2Scale * (1 + 0.04 * (1 - item2BtnSpring) * (item2Added ? 1 : 0))).toFixed(4)})`,
                        }}
                      >
                        {item2Added ? (
                          <>
                            <Check size={13} strokeWidth={3} />
                            <span>Ditambah</span>
                          </>
                        ) : (
                          <>
                            <Plus size={13} strokeWidth={2.8} />
                            <span>Tambah</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Checkout Footer Bar */}
                <div
                  style={{
                    height: 54,
                    padding: '0 18px',
                    borderRadius: 16,
                    backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                    border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={17} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.5} />
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12,
                        fontWeight: 800,
                        color: LAUNCH_PALETTE.PRIMARY,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      JUMLAH TROLI: RM {cartTotalRm.toFixed(2)}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '7px 15px',
                      borderRadius: 999,
                      backgroundColor: payButtonBg,
                      color: LAUNCH_PALETTE.CARD_BG,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11.5,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {frame >= receiptSlamFrame ? 'PESANAN #344 DISAHKAN ✓' : 'BAYAR TANPA TUNAI'}
                  </div>
                </div>
              </div>
            </KineticWindow>
          </Interactive.Div>

          {/* Floating ExplodedLayer zDepth={28}: JPP PAY DISAHKAN ✓ Receipt Badge + Rough-Notation Highlight */}
          <GeometricSparkBurst
            triggerFrame={receiptSlamFrame + 2}
            x={1680}
            y={140}
            durationFrames={Math.max(16, Math.round(0.6 * safeFps))}
            radius={82}
            count={10}
            seed="polymart-jpp-pay-receipt"
            style={{ zIndex: 20 }}
          />

          <Interactive.Div
            name="JPP Pay Verification Receipt"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: 1180,
              top: 108,
              width: 528,
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
                  padding: '18px 22px',
                  backgroundColor: LAUNCH_PALETTE.CARD_BG,
                  border: `2px solid ${LAUNCH_PALETTE.ACCENT}`,
                  boxShadow:
                    '0 24px 52px rgba(31, 39, 32, 0.2), inset 0 0 0 1.5px rgba(217, 201, 178, 0.5)',
                  transform: `scale(${receiptScale.toFixed(4)})`,
                  transformOrigin: '50% 50%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.ACCENT,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={16} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={3} />
                    </span>
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 15,
                        fontWeight: 900,
                        letterSpacing: '0.08em',
                        color: LAUNCH_PALETTE.PRIMARY_DARK,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      JPP PAY DISAHKAN ✓
                    </span>
                  </div>

                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                      border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: LAUNCH_PALETTE.SECONDARY,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    RESIT DIGITAL
                  </span>
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 14,
                    backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                    border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12.5,
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: LAUNCH_PALETTE.PRIMARY,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  PESANAN #344 • RM 15.00 • TANPA TUNAI
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    color: LAUNCH_PALETTE.MUTED_OLIVE,
                    overflow: 'visible',
                  }}
                >
                  <ShieldCheck size={16} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.5} />
                  <span>Transaksi pantas melalui</span>
                  <span style={{ display: 'inline-block', marginLeft: 4, overflow: 'visible' }}>
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

          {/* Beat 2–3 Lower-Right Hero Plane: Live Code-Driven PolyRent Housing Deck */}
          <Interactive.Div
            name="PolyRent Housing Deck"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: 956,
              top: 416,
              width: 836,
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
              statusPill="DISAHKAN JPP ✓"
              statusAccent
              width={836}
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
                  padding: '22px 26px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16,
                  boxSizing: 'border-box',
                }}
              >
                {/* Verified Listing Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    paddingBottom: 14,
                    borderBottom: '1px solid rgba(217, 201, 178, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 15,
                        backgroundColor: 'rgba(201, 111, 79, 0.2)',
                        border: '1.5px solid rgba(201, 111, 79, 0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Home size={22} color={LAUNCH_PALETTE.BACKGROUND} strokeWidth={2.2} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 900,
                          letterSpacing: '-0.02em',
                          color: LAUNCH_PALETTE.BACKGROUND,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Taman Pertama · Bilik Master
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: LAUNCH_PALETTE.TERTIARY,
                          }}
                        >
                          <MapPin size={13} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
                          <span>4 Min ke POLISAS</span>
                        </span>
                        <span
                          style={{
                            padding: '2px 9px',
                            borderRadius: 999,
                            backgroundColor: 'rgba(248, 246, 238, 0.09)',
                            border: '1px solid rgba(217, 201, 178, 0.28)',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: LAUNCH_PALETTE.BACKGROUND,
                          }}
                        >
                          Lelaki
                        </span>
                        <span
                          style={{
                            padding: '2px 9px',
                            borderRadius: 999,
                            backgroundColor: 'rgba(107, 127, 91, 0.25)',
                            border: '1px solid rgba(107, 127, 91, 0.5)',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: LAUNCH_PALETTE.BACKGROUND,
                          }}
                        >
                          Perempuan
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(107, 127, 91, 0.26)',
                      border: '1px solid rgba(217, 201, 178, 0.36)',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      color: LAUNCH_PALETTE.BACKGROUND,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={14} color={LAUNCH_PALETTE.TERTIARY} strokeWidth={2.4} />
                    <span>PILIHAN BERBALOI</span>
                  </div>
                </div>

                {/* Live Code-Driven Kalkulator Bahagi Sewa Panel */}
                <div
                  style={{
                    flex: 1,
                    borderRadius: 20,
                    padding: '18px 20px',
                    backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                    border: '1.5px solid rgba(217, 201, 178, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
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
                            fontSize: 16.5,
                            fontWeight: 800,
                            color: LAUNCH_PALETTE.BACKGROUND,
                            lineHeight: 1.15,
                          }}
                        >
                          Kalkulator Bahagi Sewa
                        </div>
                        <div
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            color: LAUNCH_PALETTE.TERTIARY,
                            marginTop: 2,
                          }}
                        >
                          KIRA PECAHAN AHLI RUMAH
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
                      gap: 16,
                      alignItems: 'stretch',
                    }}
                  >
                    {/* Left: Animated Roommate Selector (2 -> 3 -> 4 Pelajar) */}
                    <div
                      style={{
                        borderRadius: 16,
                        padding: '14px 16px',
                        backgroundColor: 'rgba(248, 246, 238, 0.05)',
                        border: '1px solid rgba(217, 201, 178, 0.16)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 12,
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
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            color: LAUNCH_PALETTE.TERTIARY,
                          }}
                        >
                          <Users size={13} color={LAUNCH_PALETTE.ACCENT} />
                          <span>JUMLAH AHLI RUMAH</span>
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

                      <div style={{ display: 'flex', gap: 10 }}>
                        {[2, 3, 4].map((count) => {
                          const isSelected = roommates === count;
                          const pop = count === 4 && isSelected ? 1 + 0.05 * (1 - activePillSpring4) : 1;
                          return (
                            <div
                              key={count}
                              style={{
                                flex: 1,
                                height: 46,
                                borderRadius: 13,
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
                                fontSize: 14,
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

                    {/* Right: Live Result Card (RM 180 / bln) */}
                    <div
                      style={{
                        borderRadius: 16,
                        padding: '14px 18px',
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
                            letterSpacing: '0.1em',
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
                          gap: 8,
                          transform: `scale(${calcResultPop.toFixed(4)})`,
                          transformOrigin: '0% 50%',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 40,
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
                            fontSize: 15,
                            fontWeight: 800,
                            color: LAUNCH_PALETTE.ACCENT,
                          }}
                        >
                          / bln
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
                            width: `${((perPersonRent / monthlyRent) * 100).toFixed(2)}%`,
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
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: LAUNCH_PALETTE.TERTIARY,
                    }}
                  >
                    Utiliti TNB / Air / WiFi boleh ditambah terus dalam bil berkongsi
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

      <EditorialFrameMarks chapterCode="03" chapterLabel="PolyMart & PolyRent • Ekonomi Siswa" />
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
    default: 'Niaga & Kediaman Dalam Genggaman.',
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
