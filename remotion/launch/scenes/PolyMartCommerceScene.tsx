import React from 'react';
import {
  Easing,
  Interactive,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import { Trail } from '@remotion/motion-blur';
import { Check, Receipt, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { Device3DRig } from '../motion/Device3DRig';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { GeometricSparkBurst } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

type PolyMartProps = {
  readonly productsCount: number;
  readonly ordersCount: number;
  readonly headline: string;
};

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const COUNTER_EASE = Easing.bezier(0.22, 1, 0.36, 1);

type CommerceCalloutSpec = {
  readonly id: string;
  readonly tag: string;
  readonly title: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly originOffsetX: number;
  readonly originOffsetY: number;
  readonly dark: boolean;
  readonly phase: number;
  readonly kind: 'product' | 'order';
};

const COMMERCE_CALLOUTS: readonly CommerceCalloutSpec[] = [
  {
    id: 'chicken-popcorn',
    tag: 'QUADRA H • MENU LARIS',
    title: 'CHICKEN POPCORN • RM 9.00',
    left: 912,
    top: 146,
    width: 392,
    originOffsetX: 168,
    originOffsetY: 164,
    dark: false,
    phase: 0.4,
    kind: 'product',
  },
  {
    id: 'order-confirmed',
    tag: 'RESIT DIGITAL KAMPUS',
    title: 'PESANAN #344 DISAHKAN ✓',
    left: 944,
    top: 798,
    width: 386,
    originOffsetX: 280,
    originOffsetY: -170,
    dark: true,
    phase: 2.1,
    kind: 'order',
  },
];

const CommerceCalloutTrailLayer: React.FC<{
  readonly firstStartFrame: number;
  readonly staggerFrames: number;
  readonly burstDurationFrames: number;
}> = ({ firstStartFrame, staggerFrames, burstDurationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timeSec = frame / Math.max(1, fps);
  const safeDuration = Math.max(1, burstDurationFrames);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {COMMERCE_CALLOUTS.map((card, idx) => {
        const cardStart = firstStartFrame + idx * staggerFrames;
        const progress = interpolate(frame, [cardStart, cardStart + safeDuration], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EXPO_OUT,
        });

        const opacity = interpolate(progress, [0, 0.2, 1], [0, 1, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        if (opacity <= 0.001) return null;

        const bobY = Math.sin(timeSec * 2.0 + card.phase) * 6 * progress;
        const bobZ = Math.cos(timeSec * 1.65 + card.phase) * 18 * progress;
        const tx = interpolate(progress, [0, 1], [card.originOffsetX, 0]);
        const ty = interpolate(progress, [0, 1], [card.originOffsetY, 0]) + bobY;
        const tz = interpolate(progress, [0, 1], [-200, 72]) + bobZ;
        const scale = interpolate(progress, [0, 0.74, 1], [0.62, 1.05, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const bg = card.dark ? LAUNCH_PALETTE.PRIMARY : LAUNCH_PALETTE.CARD_BG;
        const border = card.dark ? 'rgba(217, 201, 178, 0.58)' : LAUNCH_PALETTE.TERTIARY;
        const tagColor = card.dark ? LAUNCH_PALETTE.TERTIARY : LAUNCH_PALETTE.ACCENT;
        const titleColor = card.dark ? LAUNCH_PALETTE.BACKGROUND : LAUNCH_PALETTE.PRIMARY;
        const iconBg = card.dark ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.SECONDARY;

        return (
          <div
            key={card.id}
            style={{
              position: 'absolute',
              left: card.left,
              top: card.top,
              width: card.width,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 18px',
              borderRadius: 20,
              backgroundColor: bg,
              border: `1.5px solid ${border}`,
              boxShadow: '0 20px 44px rgba(31, 39, 32, 0.2)',
              opacity,
              willChange: 'transform, opacity',
              transform: `perspective(1400px) translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, ${tz.toFixed(2)}px) scale(${scale.toFixed(4)})`,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {card.kind === 'product' ? (
                <Sparkles size={20} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={2.2} />
              ) : (
                <Receipt size={20} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={2.2} />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: tagColor,
                  whiteSpace: 'nowrap',
                }}
              >
                {card.tag}
              </span>
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 15.5,
                  fontWeight: 800,
                  letterSpacing: '0.03em',
                  color: titleColor,
                  whiteSpace: 'nowrap',
                }}
              >
                {card.title}
              </span>
            </div>
          </div>
        );
      })}
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

  const safeProductsCount = Number.isFinite(productsCount) ? Math.max(0, Math.round(productsCount)) : 277;
  const safeOrdersCount = Number.isFinite(ordersCount) ? Math.max(0, Math.round(ordersCount)) : 344;

  // Beat 1 (0..1.6s): KineticWords headline + dual Device3DRig phones with staggered rack-focus & shine
  const pillStart = 0;
  const pillDuration = Math.max(8, Math.round(0.38 * fps));
  const headlineStart = Math.round(0.12 * fps);
  const wordStagger = Math.max(2, Math.round(0.065 * fps));
  const wordDuration = Math.max(8, Math.round(0.38 * fps));
  const descStart = Math.round(0.55 * fps);
  const descDuration = Math.max(8, Math.round(0.42 * fps));

  const phone1Enter = Math.round(0.24 * fps);
  const phone1Duration = Math.max(12, Math.round(0.85 * fps));
  const phone1ShineStart = Math.round(1.02 * fps);
  const phone1ShineDuration = Math.max(10, Math.round(0.62 * fps));

  const phone2Enter = Math.round(0.44 * fps);
  const phone2Duration = Math.max(12, Math.round(0.85 * fps));
  const phone2ShineStart = Math.round(1.16 * fps);
  const phone2ShineDuration = Math.max(10, Math.round(0.62 * fps));

  // Tabular counters start in Beat 1 and finish climbing cleanly in Beat 3
  const cardsRevealStart = Math.round(0.76 * fps);
  const cardsRevealDuration = Math.max(10, Math.round(0.45 * fps));
  const productsCounterStart = Math.round(0.85 * fps);
  const productsCounterEnd = Math.round(4.55 * fps);
  const ordersCounterStart = Math.round(1.0 * fps);
  const ordersCounterEnd = Math.round(4.75 * fps);

  const animatedProducts = Math.round(
    interpolate(frame, [productsCounterStart, productsCounterEnd], [0, safeProductsCount], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: COUNTER_EASE,
    }),
  );
  const animatedOrders = Math.round(
    interpolate(frame, [ordersCounterStart, ordersCounterEnd], [0, safeOrdersCount], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: COUNTER_EASE,
    }),
  );

  // Beat 2 (1.6..4.0s): Two floating callout cards burst from phones with <Trail layers={4} lagInFrames={2}>
  const beat2Start = Math.round(1.6 * fps);
  const calloutStagger = Math.max(6, Math.round(0.55 * fps));
  const calloutBurstDuration = Math.max(12, Math.round(0.75 * fps));

  // Beat 3 (3.8..6.5s): Architectural "JPP PAY DISAHKAN ✓" stamp + 8-frame chromaticAberration pulse + <Highlight>
  const stampStart = Math.round(3.8 * fps);
  const pulseStart = stampStart + Math.max(1, Math.round((4 / 60) * fps));
  const pulseDuration = Math.max(4, Math.round((8 / 60) * fps));
  const pulseEnd = pulseStart + pulseDuration;
  const pulsePeakFrame = pulseStart + Math.max(1, Math.round(pulseDuration * 0.35));
  const inPulseWindow = frame >= pulseStart && frame < pulseEnd;

  const pulseProgress = inPulseWindow
    ? interpolate(frame, [pulseStart - 1, pulsePeakFrame, pulseEnd], [0, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const pulseAberrationAmount = inPulseWindow ? Number((pulseProgress * 9.5).toFixed(2)) : 0;

  const stampSpring =
    frame >= stampStart
      ? spring({
          frame: frame - stampStart,
          fps,
          config: { damping: 14, stiffness: 220, mass: 0.88 },
        })
      : 0;
  const stampScale = 1.35 + (1 - 1.35) * stampSpring;
  const stampOpacity =
    frame >= stampStart
      ? interpolate(frame, [stampStart, stampStart + Math.max(3, Math.round(0.08 * fps))], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;
  const timeSec = frame / Math.max(1, fps);
  const stampHoverY = stampOpacity > 0.001 ? Math.sin(timeSec * 2.2) * 3.5 * Math.min(1, stampSpring) : 0;

  const footerStart = Math.round(1.08 * fps);
  const footerDuration = Math.max(8, Math.round(0.42 * fps));
  const highlightStart = Math.round(4.15 * fps);
  const highlightDuration = Math.max(10, Math.round(0.55 * fps));

  return (
    <>
      <EditorialBackdrop />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.04}
        panXFrom={-14}
        panXTo={14}
        panYFrom={4}
        panYTo={-4}
        tiltXFrom={0.5}
        tiltXTo={-0.3}
        tiltYFrom={-1.2}
        tiltYTo={1.2}
        breathingAmplitude={0.55}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: '96px 88px 88px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 56,
            fontFamily: LAUNCH_FONTS.DISPLAY,
          }}
        >
          {/* Left Editorial Column (x=88..848) */}
          <Interactive.Div
            name="PolyMart Copy Block"
            premountFor={fps}
            style={{
              width: 760,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            <KineticReveal startFrame={pillStart} durationFrames={pillDuration}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  alignSelf: 'flex-start',
                  padding: '8px 18px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(201, 111, 79, 0.12)',
                  border: `1px solid ${LAUNCH_PALETTE.ACCENT}`,
                  color: LAUNCH_PALETTE.ACCENT,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}
              >
                <ShoppingBag size={16} />
                PASAR DIGITAL MAHASISWA
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
                fontSize: 64,
                fontWeight: 900,
                lineHeight: 1.06,
                letterSpacing: '-0.03em',
                color: LAUNCH_PALETTE.PRIMARY,
              }}
            />

            <KineticReveal startFrame={descStart} durationFrames={descDuration}>
              <p
                style={{
                  margin: 0,
                  fontSize: 21,
                  lineHeight: 1.48,
                  color: LAUNCH_PALETTE.SECONDARY,
                  maxWidth: 700,
                }}
              >
                Usahawan siswa POLISAS berniaga dengan katalog tersahkan JPP, pengurusan pesanan digital, dan transaksi pantas tanpa tunai.
              </p>
            </KineticReveal>

            <KineticReveal startFrame={cardsRevealStart} durationFrames={cardsRevealDuration}>
              <div style={{ display: 'flex', gap: 22, marginTop: 4 }}>
                <div
                  style={{
                    flex: 1,
                    backgroundColor: LAUNCH_PALETTE.CARD_BG,
                    borderRadius: 22,
                    padding: '24px 28px',
                    border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    boxShadow: '0 14px 32px rgba(46, 58, 47, 0.06)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 54,
                      fontWeight: 900,
                      lineHeight: 1.05,
                      color: LAUNCH_PALETTE.PRIMARY,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {animatedProducts}+
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: LAUNCH_PALETTE.SECONDARY,
                    }}
                  >
                    Produk &amp; Menu Siswa
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    backgroundColor: LAUNCH_PALETTE.PRIMARY,
                    borderRadius: 22,
                    padding: '24px 28px',
                    border: '1.5px solid rgba(217, 201, 178, 0.25)',
                    boxShadow: '0 16px 36px rgba(31, 39, 32, 0.16)',
                    color: LAUNCH_PALETTE.BACKGROUND,
                  }}
                >
                  <div
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 54,
                      fontWeight: 900,
                      lineHeight: 1.05,
                      color: LAUNCH_PALETTE.ACCENT,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {animatedOrders}+
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: LAUNCH_PALETTE.TERTIARY,
                    }}
                  >
                    Pesanan Kampus Selesai
                  </div>
                </div>
              </div>
            </KineticReveal>

            <KineticReveal startFrame={footerStart} durationFrames={footerDuration}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  color: LAUNCH_PALETTE.PRIMARY,
                  fontSize: 17.5,
                  fontWeight: 700,
                  paddingTop: 4,
                  paddingBottom: 4,
                }}
              >
                <ShieldCheck size={20} color={LAUNCH_PALETTE.SECONDARY} />
                <span>Disahkan JPP POLISAS • Bayaran Tanpa Tunai</span>
                <span style={{ display: 'inline-block', marginLeft: 4 }}>
                  <EditorialAnnotation
                    type="highlight"
                    startFrame={highlightStart}
                    durationFrames={highlightDuration}
                    color="rgba(217, 201, 178, 0.78)"
                    padding={{ top: 3, right: 8, bottom: 3, left: 8 }}
                    iterations={1}
                    seed={14}
                  >
                    <span style={{ color: LAUNCH_PALETTE.PRIMARY_DARK, fontWeight: 800 }}>JPP Pay</span>
                  </EditorialAnnotation>
                </span>
              </div>
            </KineticReveal>
          </Interactive.Div>

          {/* Right 3D Device Stage (x=904..1832) */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              height: 820,
              perspective: '1800px',
              transformStyle: 'preserve-3d',
            }}
          >
            <Device3DRig
              variant="phone"
              name="PolyMart Primary Phone"
              src={staticFile('GAMBAR/Polymart View Phone.png')}
              width={326}
              height={668}
              enterFrame={phone1Enter}
              enterDuration={phone1Duration}
              initialBlur={16}
              initialAberration={3.4}
              shineStartFrame={phone1ShineStart}
              shineDuration={phone1ShineDuration}
              baseRotateX={2}
              baseRotateY={10}
              baseRotateZ={-4.5}
              entryRotateX={12}
              entryRotateY={-18}
              entryTranslateY={90}
              floatAmplitude={0.9}
              floatPhase={0}
              objectPosition="top center"
              style={{
                position: 'absolute',
                left: 112,
                top: 48,
                zIndex: 4,
              }}
            />

            <Device3DRig
              variant="phone"
              name="PolyMart Checkout Phone"
              src={staticFile('GAMBAR/Inside Polymart View Phone.png')}
              width={326}
              height={668}
              enterFrame={phone2Enter}
              enterDuration={phone2Duration}
              initialBlur={18}
              initialAberration={3.8}
              extraAberration={pulseAberrationAmount}
              shineStartFrame={phone2ShineStart}
              shineDuration={phone2ShineDuration}
              baseRotateX={1.5}
              baseRotateY={-11}
              baseRotateZ={4.5}
              entryRotateX={10}
              entryRotateY={18}
              entryTranslateY={112}
              floatAmplitude={0.9}
              floatPhase={1.5}
              objectPosition="top center"
              style={{
                position: 'absolute',
                left: 468,
                top: 112,
                zIndex: 6,
              }}
            />
          </div>
        </div>

        {/* Beat 2: Floating Commerce Callouts with @remotion/motion-blur <Trail> */}
        <Interactive.Div
          name="PolyMart Floating Callouts"
          premountFor={fps}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 12,
          }}
        >
          <Trail layers={4} lagInFrames={2} trailOpacity={0.35}>
            <CommerceCalloutTrailLayer
              firstStartFrame={beat2Start}
              staggerFrames={calloutStagger}
              burstDurationFrames={calloutBurstDuration}
            />
          </Trail>
        </Interactive.Div>

        {/* Beat 3: Architectural "JPP PAY DISAHKAN ✓" Stamp + Radial Spark Burst */}
        <GeometricSparkBurst
          triggerFrame={pulseStart}
          x={1568}
          y={179}
          durationFrames={Math.max(16, Math.round(0.65 * fps))}
          radius={96}
          count={10}
          seed="polymart-jpp-pay-stamp"
          style={{ zIndex: 14 }}
        />

        <Interactive.Div
          name="JPP Pay Verification Stamp"
          premountFor={fps}
          style={{
            position: 'absolute',
            left: 1404,
            top: 142,
            zIndex: 16,
            pointerEvents: 'none',
            opacity: stampOpacity,
            visibility: stampOpacity <= 0.001 ? 'hidden' : 'visible',
            transform: `translate3d(0px, ${stampHoverY.toFixed(2)}px, 90px) rotate(-3deg) scale(${stampScale.toFixed(4)})`,
            transformOrigin: '50% 50%',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '13px 22px',
              borderRadius: 18,
              backgroundColor: LAUNCH_PALETTE.CARD_BG,
              border: `2.5px solid ${LAUNCH_PALETTE.ACCENT}`,
              boxShadow:
                '0 22px 48px rgba(31, 39, 32, 0.24), inset 0 0 0 2px rgba(217, 201, 178, 0.45)',
            }}
          >
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
              <Check size={16} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={3} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  color: LAUNCH_PALETTE.SECONDARY,
                  whiteSpace: 'nowrap',
                }}
              >
                TRANSAKSI TANPA TUNAI
              </span>
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 16,
                  fontWeight: 900,
                  letterSpacing: '0.1em',
                  color: LAUNCH_PALETTE.PRIMARY_DARK,
                  whiteSpace: 'nowrap',
                }}
              >
                JPP PAY DISAHKAN ✓
              </span>
            </div>
          </div>
        </Interactive.Div>
      </CameraStage>

      <EditorialFrameMarks chapterCode="03" chapterLabel="PolyMart • Ekonomi Siswa" />
    </>
  );
};

const polyMartSchema = {
  productsCount: { type: 'number', default: 277, min: 0, max: 9999, integer: true, hiddenFromList: false, description: 'Products Count' },
  ordersCount: { type: 'number', default: 344, min: 0, max: 99999, integer: true, hiddenFromList: false, description: 'Orders Count' },
  headline: { type: 'string', default: 'Niaga Kampus Dalam Genggaman.', description: 'Section Headline' },
} as const satisfies InteractivitySchema;

export const PolyMartCommerceScene = Interactive.withSchema({
  Component: PolyMartCommerceInner,
  componentName: 'PolyMartCommerceScene',
  schema: polyMartSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
