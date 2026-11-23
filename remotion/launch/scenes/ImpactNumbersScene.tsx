import React from 'react';
import {
  Easing,
  Interactive,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import { Circle, Pie } from '@remotion/shapes';
import { Building2, CalendarCheck, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { KineticReveal, KineticWords } from '../motion/KineticTypography';
import { EvolvingPath } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE } from '../tokens';

type ImpactNumbersProps = {
  readonly clubsCount: number;
  readonly studentsCount: number;
  readonly activitiesCount: number;
  readonly productsCount: number;
  readonly ordersCount: number;
};

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const COUNTER_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const SHEEN_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

const TICKER_MODULES: readonly string[] = [
  'POLYMAPS',
  'POLYMART',
  'POLYRENT',
  'POLYSUARA',
  'E-KEBAJIKAN',
  'FOOD BANK',
  'SCAN QR MERIT',
  '21 KELAB POLISAS',
];

const TICKER_DOT_COLORS: Record<string, string> = {
  POLYMAPS: LAUNCH_MODULE_THEMES.polymaps.primary,
  POLYMART: LAUNCH_MODULE_THEMES.polymart.primary,
  POLYRENT: LAUNCH_MODULE_THEMES.polyrent.primary,
  POLYSUARA: LAUNCH_MODULE_THEMES.polysuara.primary,
  'E-KEBAJIKAN': LAUNCH_MODULE_THEMES.kebajikan.primary,
  'FOOD BANK': LAUNCH_MODULE_THEMES.foodbank.primary,
  'SCAN QR MERIT': LAUNCH_MODULE_THEMES.meritQr.primary,
  '21 KELAB POLISAS': LAUNCH_MODULE_THEMES.kelab.primary,
};

const TICKER_REPEATED_HALF: readonly string[] = [...TICKER_MODULES, ...TICKER_MODULES];

type MonthlyTrendSpec = {
  readonly month: string;
  readonly pct: number;
  readonly barColor: string;
  readonly isPeak?: boolean;
};

const COMMUNITY_GROWTH_6M_TREND: readonly MonthlyTrendSpec[] = [
  { month: 'OKT', pct: 34, barColor: LAUNCH_MODULE_THEMES.kelab.primary },
  { month: 'NOV', pct: 48, barColor: LAUNCH_MODULE_THEMES.polyrent.primary },
  { month: 'DIS', pct: 62, barColor: LAUNCH_MODULE_THEMES.kebajikan.primary },
  { month: 'JAN', pct: 74, barColor: LAUNCH_MODULE_THEMES.polymaps.primary },
  { month: 'FEB', pct: 88, barColor: LAUNCH_MODULE_THEMES.polymart.primary },
  { month: 'MAC', pct: 100, barColor: LAUNCH_MODULE_THEMES.polysuara.primary, isPeak: true },
];

const BAR_TRACK_HEIGHT_PX = 72;

type MetricCardSpec = {
  readonly code: string;
  readonly tag: string;
  readonly label: string;
  readonly sub: string;
  readonly target: number;
  readonly suffix: string;
  readonly targetArc: number;
  readonly ringColor: string;
  readonly iconKind: 'clubs' | 'students' | 'activities' | 'products';
};

const renderMetricIcon = (iconKind: MetricCardSpec['iconKind'], color: string) => {
  switch (iconKind) {
    case 'clubs':
      return <Building2 size={26} color={color} strokeWidth={2.2} />;
    case 'students':
      return <Users size={26} color={color} strokeWidth={2.2} />;
    case 'activities':
      return <CalendarCheck size={26} color={color} strokeWidth={2.2} />;
    case 'products':
      return <ShoppingBag size={26} color={color} strokeWidth={2.2} />;
  }
};

const ImpactNumbersInner: React.FC<ImpactNumbersProps> = ({
  clubsCount,
  studentsCount,
  activitiesCount,
  productsCount,
  ordersCount,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeClubs = Number.isFinite(clubsCount) ? Math.max(0, Math.round(clubsCount)) : 21;
  const safeStudents = Number.isFinite(studentsCount) ? Math.max(0, Math.round(studentsCount)) : 1083;
  const safeActivities = Number.isFinite(activitiesCount) ? Math.max(0, Math.round(activitiesCount)) : 41;
  const safeProducts = Number.isFinite(productsCount) ? Math.max(0, Math.round(productsCount)) : 277;
  const safeOrders = Number.isFinite(ordersCount) ? Math.max(0, Math.round(ordersCount)) : 344;

  const timeSec = frame / safeFps;

  // Beat 1 (0..1.4s): Community badge + KineticWords headline + 4 student proof bento cards cascade
  const pillDuration = Math.max(8, Math.round(0.38 * safeFps));
  const headlineStart = Math.round(0.10 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.065 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.38 * safeFps));
  const ruleStart = Math.round(0.28 * safeFps);
  const ruleDuration = Math.max(10, Math.round(0.65 * safeFps));

  const cardBaseStart = Math.round(0.34 * safeFps);
  const cardStagger = Math.max(3, Math.round((6 / 60) * safeFps));
  const cardFadeFrames = Math.max(4, Math.round(0.22 * safeFps));

  // Beat 2 (1.2..4.2s): @remotion/shapes <Pie> progress rings + tabular counters + seamless kinetic ticker strip
  const arcBaseStart = Math.round(1.20 * safeFps);
  const arcStagger = Math.max(2, Math.round((4 / 60) * safeFps));
  const arcSpanFrames = Math.max(24, Math.round(2.65 * safeFps));
  const countSpanFrames = Math.max(24, Math.round(2.75 * safeFps));

  const tickerFadeStart = Math.round(0.95 * safeFps);
  const tickerFadeEnd = Math.max(tickerFadeStart + 8, Math.round(1.38 * safeFps));
  const tickerOpacity = interpolate(frame, [tickerFadeStart, tickerFadeEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tickerCycleSec = 18;
  const tickerPhase = (timeSec / tickerCycleSec) % 1;
  const tickerShiftPercent = -(tickerPhase * 50);

  // Beat 2b (1.55..3.2s): Live animated 6-month student community participation bar chart
  const chartStart = Math.round(1.55 * safeFps);
  const chartElapsed = frame - chartStart;
  const chartSpring =
    chartElapsed >= 0
      ? spring({
          frame: chartElapsed,
          fps: safeFps,
          config: { damping: 180, stiffness: 210, mass: 0.9 },
        })
      : 0;
  const chartOpacity =
    chartElapsed >= 0
      ? interpolate(chartElapsed, [0, Math.max(6, Math.round(0.24 * safeFps))], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;
  const chartTranslateY = (1 - chartSpring) * 24;
  const barBaseStart = Math.round(1.85 * safeFps);
  const barStagger = Math.max(2, Math.round((4 / 60) * safeFps));

  // Beat 3 (4.0..6.0s): Terracotta (#C96F4F) student action pill lifts with sweeping translucent sheen
  const beat3Start = Math.round(4.00 * safeFps);
  const pillElapsed = frame - beat3Start;
  const beat3Spring =
    pillElapsed >= 0
      ? spring({
          frame: pillElapsed,
          fps: safeFps,
          config: { damping: 180, stiffness: 220, mass: 0.9 },
        })
      : 0;
  const beat3Opacity =
    pillElapsed >= 0
      ? interpolate(pillElapsed, [0, Math.max(4, Math.round(0.18 * safeFps))], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;
  const beat3HoverY = beat3Opacity > 0.001 ? Math.sin(timeSec * 2.2) * 2.5 * beat3Spring : 0;
  const beat3TranslateY = (1 - beat3Spring) * 34 + beat3HoverY;
  const beat3Scale = 0.92 + 0.08 * beat3Spring;

  const ordersCountStart = beat3Start;
  const ordersCountEnd = Math.max(ordersCountStart + 8, Math.round(4.65 * safeFps));
  const liveOrders = Math.round(
    interpolate(
      frame,
      [ordersCountStart, ordersCountEnd],
      [Math.round(safeOrders * 0.68), safeOrders],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: COUNTER_EASE,
      },
    ),
  );

  const sheenStart = beat3Start + Math.max(4, Math.round(0.28 * safeFps));
  const sheenEnd = Math.max(sheenStart + 10, Math.round(5.38 * safeFps));
  const sheenProgress = interpolate(frame, [sheenStart, sheenEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SHEEN_EASE,
  });
  const sheenActive = sheenProgress > 0.001 && sheenProgress < 0.999;
  const sheenX = interpolate(sheenProgress, [0, 1], [-220, 960]);
  const liveDotScale = 0.84 + Math.sin(timeSec * 5.8) * 0.18;

  const metrics: readonly MetricCardSpec[] = [
    {
      code: '01 · KOMUNITI',
      tag: '5 JABATAN',
      label: 'MAHASISWA DAH AKSES',
      sub: 'Komuniti Aktif 5 Jabatan',
      target: safeStudents,
      suffix: '+',
      targetArc: 0.95,
      ringColor: LAUNCH_MODULE_THEMES.polymaps.primary,
      iconKind: 'students',
    },
    {
      code: '02 · KELAB',
      tag: 'TERBUKA',
      label: 'KELAB & PERSATUAN',
      sub: 'Sedia Untuk Anda Sertai',
      target: safeClubs,
      suffix: '',
      targetArc: 0.88,
      ringColor: LAUNCH_MODULE_THEMES.kelab.primary,
      iconKind: 'clubs',
    },
    {
      code: '03 · NIAGA',
      tag: 'POLYMART',
      label: 'MENU & BARANG SISWA',
      sub: 'Pesanan Tanpa Beratur',
      target: safeProducts,
      suffix: '+',
      targetArc: 0.92,
      ringColor: LAUNCH_MODULE_THEMES.polymart.primary,
      iconKind: 'products',
    },
    {
      code: '04 · ACARA',
      tag: 'MERIT QR',
      label: 'ACARA & PROGRAM KAMPUS',
      sub: 'Imbas QR & Kumpul Merit',
      target: safeActivities,
      suffix: '',
      targetArc: 0.86,
      ringColor: LAUNCH_MODULE_THEMES.meritQr.primary,
      iconKind: 'activities',
    },
  ];

  return (
    <>
      <EditorialBackdrop dark ambientTint={LAUNCH_MODULE_THEMES.impact.tint} />

      <CameraStage
        zoomFrom={0.98}
        zoomTo={1.045}
        panXFrom={-8}
        panXTo={8}
        panYFrom={6}
        panYTo={-6}
        tiltXFrom={0.45}
        tiltXTo={-0.3}
        tiltYFrom={-0.9}
        tiltYTo={0.9}
        breathingAmplitude={0.45}
        entryZoomOffset={0.036}
        exitZoomDelta={0.042}
        exitFrames={Math.round(0.35 * safeFps)}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: '74px 88px 72px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: LAUNCH_FONTS.DISPLAY,
            color: LAUNCH_PALETTE.BACKGROUND,
          }}
        >
          {/* Beat 1: Student Community Proof Pill + KineticWords Headline + Architectural Rule */}
          <Interactive.Div
            name="Impact Headline"
            premountFor={safeFps}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              flexShrink: 0,
            }}
          >
            <KineticReveal startFrame={0} durationFrames={pillDuration}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 20px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(217, 201, 178, 0.14)',
                  border: '1px solid rgba(217, 201, 178, 0.36)',
                  color: LAUNCH_PALETTE.TERTIARY,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: LAUNCH_MODULE_THEMES.polymaps.primary,
                    transform: `scale(${liveDotScale.toFixed(3)})`,
                    display: 'inline-block',
                  }}
                />
                <span>KOMUNITI HIDUP • 5 JABATAN POLISAS</span>
              </div>
            </KineticReveal>

            <KineticWords
              as="h2"
              text={`${safeStudents.toLocaleString('en-US')}+ Siswa POLISAS Sudah Aktif. Giliran Anda.`}
              startFrame={headlineStart}
              staggerFrames={wordStagger}
              wordDurationFrames={wordDuration}
              accentWords={['Giliran', 'Anda.']}
              accentColor={LAUNCH_MODULE_THEMES.polymaps.primary}
              align="center"
              style={{
                margin: '14px 0 0',
                fontSize: 54,
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.06,
                color: LAUNCH_PALETTE.BACKGROUND,
              }}
            />

            <div style={{ marginTop: 10, width: 380, height: 10 }}>
              <EvolvingPath
                d="M 10 5 L 370 5"
                width={380}
                height={10}
                startFrame={ruleStart}
                durationFrames={ruleDuration}
                stroke={LAUNCH_MODULE_THEMES.polymaps.primary}
                trackStroke="rgba(217, 201, 178, 0.18)"
                strokeWidth={2.5}
                headDotColor={LAUNCH_MODULE_THEMES.polymart.primary}
                headDotRadius={4}
                hideDotWhenComplete
              />
            </div>
          </Interactive.Div>

          {/* Beat 1 & Beat 2: 4 Student Community Proof Bento Cards with @remotion/shapes <Pie> Rings */}
          <Interactive.Div
            name="Metrics Grid"
            premountFor={safeFps}
            style={{
              marginTop: 22,
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 24,
              flexShrink: 0,
            }}
          >
            {metrics.map((m, idx) => {
              const cardStart = cardBaseStart + idx * cardStagger;
              const cardElapsed = frame - cardStart;
              const cardSpring =
                cardElapsed >= 0
                  ? spring({
                      frame: cardElapsed,
                      fps: safeFps,
                      config: { damping: 180, stiffness: 220, mass: 0.9 },
                    })
                  : 0;
              const cardOpacity =
                cardElapsed >= 0
                  ? interpolate(cardElapsed, [0, cardFadeFrames], [0, 1], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    })
                  : 0;
              const floatY = Math.sin(timeSec * 1.55 + idx * 1.35) * 3 * cardSpring;
              const cardTranslateY = (1 - cardSpring) * 44 + floatY;
              const cardScale = 0.9 + 0.1 * cardSpring;

              const cardArcStart = arcBaseStart + idx * arcStagger;
              const cardArcEnd = cardArcStart + arcSpanFrames;
              const rawArc = interpolate(frame, [cardArcStart, cardArcEnd], [0, m.targetArc], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: EXPO_OUT,
              });
              const clampedArc = Number.isFinite(rawArc) ? Math.min(1, Math.max(0, rawArc)) : 0;

              const cardCountEnd = cardArcStart + countSpanFrames;
              const countProgress = interpolate(frame, [cardArcStart, cardCountEnd], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: COUNTER_EASE,
              });
              const displayValue = `${Math.round(m.target * countProgress).toLocaleString('en-US')}${m.suffix}`;
              const ringSettled = frame >= cardArcEnd;

              return (
                <div
                  key={m.label}
                  style={{
                    backgroundColor: 'rgba(31, 39, 32, 0.80)',
                    border: `1.5px solid ${
                      ringSettled ? `${m.ringColor}88` : 'rgba(217, 201, 178, 0.26)'
                    }`,
                    borderRadius: 26,
                    padding: '22px 24px 24px',
                    boxShadow: '0 24px 52px rgba(31, 39, 32, 0.34)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    opacity: cardOpacity,
                    willChange: 'transform, opacity',
                    transform: `translate3d(0px, ${cardTranslateY.toFixed(2)}px, 0px) scale(${cardScale.toFixed(4)})`,
                  }}
                >
                  {/* Card Top Meta Row */}
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11.5,
                      fontWeight: 800,
                      letterSpacing: '0.16em',
                      color: LAUNCH_PALETTE.TERTIARY,
                    }}
                  >
                    <span>{m.code}</span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(217, 201, 178, 0.12)',
                        border: `1px solid ${m.ringColor}66`,
                        color: LAUNCH_PALETTE.BACKGROUND,
                      }}
                    >
                      {m.tag}
                    </span>
                  </div>

                  {/* Live @remotion/shapes <Pie> Progress Ring around Icon Badge */}
                  <div
                    style={{
                      position: 'relative',
                      width: 110,
                      height: 110,
                      marginTop: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Circle
                      radius={47}
                      fill="none"
                      stroke="rgba(217, 201, 178, 0.16)"
                      strokeWidth={6.5}
                      premountFor={safeFps}
                      showInTimeline={false}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    />

                    {clampedArc > 0.001 ? (
                      <Pie
                        radius={47}
                        progress={clampedArc}
                        closePath={false}
                        fill="none"
                        stroke={m.ringColor}
                        strokeWidth={6.5}
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

                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.PRIMARY,
                        border: `2px solid ${m.ringColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'inset 0 0 18px rgba(31, 39, 32, 0.45)',
                      }}
                    >
                      {renderMetricIcon(m.iconKind, LAUNCH_PALETTE.BACKGROUND)}
                    </div>
                  </div>

                  {/* Tabular Value Counter */}
                  <div
                    style={{
                      marginTop: 12,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 58,
                      fontWeight: 900,
                      lineHeight: 1,
                      color: LAUNCH_PALETTE.BACKGROUND,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {displayValue}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 15.5,
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      lineHeight: 1.2,
                      textTransform: 'uppercase',
                      color: LAUNCH_PALETTE.CARD_BG,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.label}
                  </div>

                  {/* High-contrast Warm Sand (#D9C9B2) sublabel for crisp projector readability */}
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 15,
                      fontWeight: 600,
                      color: LAUNCH_PALETTE.TERTIARY,
                    }}
                  >
                    {m.sub}
                  </div>
                </div>
              );
            })}
          </Interactive.Div>

          {/* Beat 2b & Beat 3: Live 6-Month Student Participation Bar Chart + Terracotta Student Action Pill */}
          <div
            style={{
              marginTop: 22,
              width: '100%',
              display: 'grid',
              gridTemplateColumns: '0.96fr 1.04fr',
              gap: 24,
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            {/* Left Half: Dark-Surface 6-Month Student Community Participation Strip */}
            <Interactive.Div
              name="Student Community Trend Chart"
              premountFor={safeFps}
              style={{
                backgroundColor: 'rgba(31, 39, 32, 0.55)',
                border: '1px solid rgba(217, 201, 178, 0.16)',
                borderRadius: 20,
                padding: '15px 26px 14px',
                opacity: chartOpacity,
                visibility: chartOpacity <= 0.001 ? 'hidden' : 'visible',
                willChange: 'transform, opacity',
                transform: `translate3d(0px, ${chartTranslateY.toFixed(2)}px, 0px)`,
              }}
            >
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
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    color: LAUNCH_PALETTE.TERTIARY,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 2,
                      backgroundColor: LAUNCH_MODULE_THEMES.polymaps.primary,
                      display: 'inline-block',
                    }}
                  />
                  <span>PENYERTAAN SISWA • 6 BULAN</span>
                </div>

                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: LAUNCH_MODULE_THEMES.polymaps.primary,
                    whiteSpace: 'nowrap',
                  }}
                >
                  MOMENTUM KOMUNITI KAMPUS
                </span>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 14,
                  alignItems: 'end',
                }}
              >
                {COMMUNITY_GROWTH_6M_TREND.map((item, idx) => {
                  const barStart = barBaseStart + idx * barStagger;
                  const barElapsed = frame - barStart;
                  const barSpring =
                    barElapsed >= 0
                      ? spring({
                          frame: barElapsed,
                          fps: safeFps,
                          config: { damping: 165, stiffness: 215, mass: 0.85 },
                        })
                      : 0;
                  const barOpacity =
                    barElapsed >= 0
                      ? interpolate(barElapsed, [0, 4], [0, 1], {
                          extrapolateLeft: 'clamp',
                          extrapolateRight: 'clamp',
                        })
                      : 0;
                  const barTargetPx = Math.round((item.pct / 100) * BAR_TRACK_HEIGHT_PX);
                  const barScaleY = Math.max(0.001, barSpring);
                  const isPeak = Boolean(item.isPeak);

                  return (
                    <div
                      key={item.month}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          height: 22,
                          marginBottom: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: barOpacity,
                        }}
                      >
                        {isPeak ? (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              backgroundColor: 'rgba(244, 63, 94, 0.24)',
                              border: '1px solid rgba(244, 63, 94, 0.72)',
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11,
                              fontWeight: 900,
                              color: LAUNCH_PALETTE.BACKGROUND,
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {liveOrders.toLocaleString('en-US')}+
                          </span>
                        ) : (
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: 'rgba(217, 201, 178, 0.70)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {item.pct}%
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          width: '100%',
                          height: BAR_TRACK_HEIGHT_PX,
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          borderBottom: '1px solid rgba(217, 201, 178, 0.16)',
                          paddingBottom: 2,
                        }}
                      >
                        <div
                          style={{
                            width: '70%',
                            maxWidth: 66,
                            height: BAR_TRACK_HEIGHT_PX,
                            borderRadius: 8,
                            backgroundColor: 'rgba(217, 201, 178, 0.06)',
                            display: 'flex',
                            alignItems: 'flex-end',
                          }}
                        >
                          <div
                            style={{
                              width: '100%',
                              height: barTargetPx,
                              borderRadius: 7,
                              backgroundColor: item.barColor,
                              border: isPeak
                                ? '1px solid rgba(248, 246, 238, 0.48)'
                                : '1px solid rgba(248, 246, 238, 0.20)',
                              boxShadow: isPeak
                                ? '0 0 22px rgba(244, 63, 94, 0.48), 0 4px 12px rgba(244, 63, 94, 0.30)'
                                : 'none',
                              opacity: barOpacity,
                              transformOrigin: '50% 100%',
                              willChange: 'transform, opacity',
                              transform: `scaleY(${barScaleY.toFixed(4)})`,
                            }}
                          />
                        </div>
                      </div>

                      <span
                        style={{
                          marginTop: 7,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: isPeak ? 900 : 700,
                          letterSpacing: '0.12em',
                          color: isPeak ? LAUNCH_PALETTE.BACKGROUND : LAUNCH_PALETTE.TERTIARY,
                        }}
                      >
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Interactive.Div>

            {/* Right Half: Beat 3 Terracotta (#C96F4F) Student Proof Pill Lifting with Diagonal Sheen Sweep */}
            <Interactive.Div
              name="Student Proof Action Pill"
              premountFor={safeFps}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: beat3Opacity,
                visibility: beat3Opacity <= 0.001 ? 'hidden' : 'visible',
                willChange: 'transform, opacity',
                transform: `translate3d(0px, ${beat3TranslateY.toFixed(2)}px, 0px) scale(${beat3Scale.toFixed(4)})`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  boxSizing: 'border-box',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: '22px 24px',
                  borderRadius: 999,
                  backgroundColor: LAUNCH_PALETTE.ACCENT,
                  border: `1.5px solid ${LAUNCH_MODULE_THEMES.polymart.border}`,
                  boxShadow: '0 22px 48px rgba(31, 39, 32, 0.36)',
                  overflow: 'hidden',
                }}
              >
                {sheenActive ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-50%',
                      left: 0,
                      width: 170,
                      height: '200%',
                      background:
                        'linear-gradient(90deg, rgba(248, 246, 238, 0) 0%, rgba(248, 246, 238, 0.38) 50%, rgba(248, 246, 238, 0) 100%)',
                      transform: `translate3d(${sheenX.toFixed(2)}px, 0px, 0px) rotate(22deg)`,
                      pointerEvents: 'none',
                      zIndex: 2,
                    }}
                  />
                ) : null}

                <span
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <TrendingUp size={16} color={LAUNCH_MODULE_THEMES.polymaps.primary} strokeWidth={2.4} />
                </span>

                <span
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 14.5,
                    fontWeight: 800,
                    letterSpacing: '0.03em',
                    color: LAUNCH_PALETTE.CARD_BG,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {liveOrders.toLocaleString('en-US')}+ PESANAN &amp; ADUAN PELAJAR DISELESAIKAN • SERTAI SEKARANG
                </span>
              </div>
            </Interactive.Div>
          </div>

          {/* Beat 2: Seamless Frame-Driven Infinite Kinetic Ticker Strip */}
          <div
            style={{
              position: 'relative',
              marginTop: 22,
              width: '100%',
              height: 54,
              borderRadius: 999,
              backgroundColor: 'rgba(31, 39, 32, 0.78)',
              border: '1.5px solid rgba(217, 201, 178, 0.28)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              opacity: tickerOpacity,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                width: 'max-content',
                willChange: 'transform',
                transform: `translate3d(${tickerShiftPercent.toFixed(4)}%, 0px, 0px)`,
              }}
            >
              {[0, 1].map((halfIdx) => (
                <div
                  key={`ticker-half-${halfIdx}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {TICKER_REPEATED_HALF.map((item, itemIdx) => (
                    <div
                      key={`ticker-${halfIdx}-${itemIdx}-${item}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span
                        style={{
                          padding: '0 26px',
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 14.5,
                          fontWeight: 800,
                          letterSpacing: '0.18em',
                          color:
                            itemIdx % 2 === 0
                              ? LAUNCH_PALETTE.BACKGROUND
                              : LAUNCH_PALETTE.TERTIARY,
                        }}
                      >
                        {item}
                      </span>
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          backgroundColor: TICKER_DOT_COLORS[item] ?? LAUNCH_PALETTE.ACCENT,
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Soft Edge Vignette Masks on Ticker */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 72,
                background: 'linear-gradient(90deg, #1F2720 0%, rgba(31, 39, 32, 0) 100%)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: 72,
                background: 'linear-gradient(270deg, #1F2720 0%, rgba(31, 39, 32, 0) 100%)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      </CameraStage>

      <EditorialFrameMarks chapterCode="08" chapterLabel="KOMUNITI HIDUP • 1,083+ SISWA AKTIF" dark />
    </>
  );
};

const impactNumbersSchema = {
  clubsCount: { type: 'number', default: 21, min: 0, max: 500, integer: true, hiddenFromList: false, description: 'Clubs Count' },
  studentsCount: { type: 'number', default: 1083, min: 0, max: 50000, integer: true, hiddenFromList: false, description: 'Students Count' },
  activitiesCount: { type: 'number', default: 41, min: 0, max: 5000, integer: true, hiddenFromList: false, description: 'Activities Count' },
  productsCount: { type: 'number', default: 277, min: 0, max: 9999, integer: true, hiddenFromList: false, description: 'Products Count' },
  ordersCount: { type: 'number', default: 344, min: 0, max: 99999, integer: true, hiddenFromList: false, description: 'Orders Count' },
} as const satisfies InteractivitySchema;

export const ImpactNumbersScene = Interactive.withSchema({
  Component: ImpactNumbersInner,
  componentName: 'ImpactNumbersScene',
  schema: impactNumbersSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
