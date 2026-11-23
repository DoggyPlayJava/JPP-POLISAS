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
import { Circle } from '@remotion/shapes';
import {
  ArrowRight,
  Check,
  Clock,
  Compass,
  MapPin,
  Navigation,
  QrCode,
} from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import {
  CampusMapLibrePlate,
  computeCampusRouteProgress,
} from '../components/CampusMapLibrePlate';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { GhostCursor, type GhostCursorKeyframe } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_PALETTE, POLISAS_COORDS } from '../tokens';
import { ExplodedLayer, KineticWindow } from '../ui/KineticCard';

export type PolyMapsProps = {
  readonly classCode: string;
  readonly classTitle: string;
  readonly roomName: string;
  readonly scheduleTime: string;
};

// Exact 1920x1080 left-workbench geometry for mathematical GhostCursor lock onto CTA button
const STAGE_PAD_TOP = 82;
const STAGE_PAD_X = 58;
const STAGE_PAD_BOTTOM = 74;
const STAGE_CONTENT_H = 1080 - STAGE_PAD_TOP - STAGE_PAD_BOTTOM; // 924
const LEFT_COL_W = 680;
const RIGHT_MAP_W = 1092;
const RIGHT_MAP_H = 916;
const LOWER_STACK_H = 676;
const CARD_H = 596;
const ARRIVAL_CHIP_H = 66;
const WINDOW_BORDER = 1.5;
const WINDOW_TOPBAR_H = 40;
const CARD_BODY_PAD_TOP = 16;
const CARD_BODY_PAD_X = 24;
const TABS_H = 34;
const ROW1_GAP = 12;
const ROW1_H = 30;
const ROW2_GAP = 10;
const ROW2_H = 42;
const ROW3_GAP = 6;
const ROW3_H = 30;
const ROW4_GAP = 10;
const ROW4_H = 52;
const CTA_WIDTH = 214;

const LOWER_STACK_TOP = STAGE_PAD_TOP + (STAGE_CONTENT_H - LOWER_STACK_H); // 330
const ROW4_TOP =
  LOWER_STACK_TOP +
  WINDOW_BORDER +
  WINDOW_TOPBAR_H +
  CARD_BODY_PAD_TOP +
  TABS_H +
  ROW1_GAP +
  ROW1_H +
  ROW2_GAP +
  ROW2_H +
  ROW3_GAP +
  ROW3_H +
  ROW4_GAP; // 561.5
const CTA_CENTER_X = STAGE_PAD_X + LEFT_COL_W - WINDOW_BORDER - CARD_BODY_PAD_X - CTA_WIDTH / 2; // 605.5
const CTA_CENTER_Y = ROW4_TOP + ROW4_H / 2; // 587.5

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

const WEEKLY_DAY_TABS = ['ISNIN', 'SELASA', 'RABU', 'KHAMIS'] as const;

const extractPrimaryRoom = (roomName: string): string =>
  roomName.split('•')[0]?.trim() || 'Makmal Komputer 3';

const formatArrivalLabel = (roomName: string): string => {
  const upperRoom = roomName.toUpperCase();
  if (upperRoom.includes('MAKMAL KOMPUTER 3') || upperRoom.includes('MAKMAL 3')) {
    return 'TIBA DI MAKMAL 3 • TEPAT MASA ✓';
  }
  const primaryRoom = extractPrimaryRoom(roomName).toUpperCase();
  return `TIBA DI ${primaryRoom} • TEPAT MASA ✓`;
};

const PolyMapsCampusInner: React.FC<PolyMapsProps> = ({
  classCode,
  classTitle,
  roomName,
  scheduleTime,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const timeSec = frame / safeFps;

  // Beat 1 (0..1.8s): Editorial entrance + KineticWords + Rough-Notation Circle around DIT3013
  const sidebarEnterDuration = Math.max(10, Math.round(0.55 * safeFps));
  const sidebarProgress = interpolate(frame, [0, sidebarEnterDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const sidebarTranslateX = interpolate(sidebarProgress, [0, 1], [-38, 0]);
  const sidebarOpacity = interpolate(sidebarProgress, [0, 0.38, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const mapEnterStart = Math.round(0.08 * safeFps);
  const mapEnterEnd = Math.max(mapEnterStart + 10, Math.round(0.68 * safeFps));
  const mapScale = interpolate(frame, [mapEnterStart, mapEnterEnd], [0.955, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
    output: 'perceptual-scale',
  });
  const mapOpacity = interpolate(
    frame,
    [mapEnterStart, mapEnterStart + Math.max(6, Math.round(0.32 * safeFps))],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  const pillStart = Math.round(0.05 * safeFps);
  const pillDuration = Math.max(8, Math.round(0.36 * safeFps));
  const headlineStart = Math.round(0.16 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.06 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.36 * safeFps));
  const subtitleStart = Math.round(0.52 * safeFps);
  const subtitleDuration = Math.max(8, Math.round(0.42 * safeFps));

  const circleStart = Math.round(0.9 * safeFps);
  const circleDuration = Math.max(12, Math.round(0.64 * safeFps));

  // Beat 2 (1.5..5.8s): GhostCursor glides onto 'Buka di PolyMaps ->', clicks, and drives route + ETA
  const cursorAppearFrame = Math.round(1.5 * safeFps);
  const clickFrame = Math.round(2.1 * safeFps); // 126f
  const cursorHoldEnd = clickFrame + Math.round(0.28 * safeFps);
  const cursorLeaveFrame = Math.round(2.65 * safeFps);
  const cursorDisappearFrame = Math.round(2.95 * safeFps);
  const arrivalFrame = Math.round(5.8 * safeFps); // 348f

  const cursorKeyframes: readonly GhostCursorKeyframe[] = [
    { frame: cursorAppearFrame, x: 960, y: 780 },
    {
      frame: Math.max(cursorAppearFrame + 2, clickFrame - Math.round(0.08 * safeFps)),
      x: CTA_CENTER_X,
      y: CTA_CENTER_Y,
      label: classCode,
    },
    { frame: clickFrame, x: CTA_CENTER_X, y: CTA_CENTER_Y, click: true, label: 'Pandu Arah' },
    { frame: cursorHoldEnd, x: CTA_CENTER_X, y: CTA_CENTER_Y, label: 'Navigasi Aktif' },
    { frame: cursorLeaveFrame, x: 785, y: 690 },
  ];

  const isNavigating = frame >= clickFrame;
  const hasArrived = frame >= arrivalFrame;

  // Beat 1 active ISNIN weekly tab illumination (lights up #2E3A2F smoothly on Beat 1)
  const isninActiveT = interpolate(
    frame,
    [Math.round(0.12 * safeFps), Math.round(0.48 * safeFps)],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );
  const isninTabBg = interpolateColors(
    isninActiveT,
    [0, 1],
    [LAUNCH_PALETTE.SURFACE_MUTED, LAUNCH_PALETTE.PRIMARY],
  );
  const isninTabColor = interpolateColors(
    isninActiveT,
    [0, 1],
    [LAUNCH_PALETTE.PRIMARY, LAUNCH_PALETTE.CARD_BG],
  );

  const cardClickScale = interpolate(
    frame,
    [
      clickFrame - 2,
      clickFrame + Math.max(2, Math.round(0.06 * safeFps)),
      clickFrame + Math.max(6, Math.round(0.24 * safeFps)),
    ],
    [1, 0.982, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const buttonClickScale = interpolate(
    frame,
    [
      clickFrame - 2,
      clickFrame + Math.max(2, Math.round(0.05 * safeFps)),
      clickFrame + Math.max(6, Math.round(0.22 * safeFps)),
    ],
    [1, 0.92, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const clickFlash = interpolate(
    frame,
    [
      clickFrame,
      clickFrame + Math.max(2, Math.round(0.08 * safeFps)),
      clickFrame + Math.max(8, Math.round(0.45 * safeFps)),
    ],
    [0, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  // Live ticking countdown chip (14m -> 4m Berjalan synchronized smoothly across Beat 1-2)
  const routeProgress = computeCampusRouteProgress(frame, clickFrame, arrivalFrame);
  const walkingCountdownMins = Math.max(
    4,
    Math.round(interpolate(routeProgress, [0, 1], [14, 4])),
  );
  const countdownLabel = isNavigating ? `${walkingCountdownMins}m Berjalan` : '14m';

  // Smooth CTA state color transitions
  const navTransition = interpolate(frame, [clickFrame, clickFrame + 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const arrivalTransition = interpolate(frame, [arrivalFrame, arrivalFrame + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ctaBackground =
    frame >= arrivalFrame
      ? interpolateColors(arrivalTransition, [0, 1], [LAUNCH_PALETTE.ACCENT, LAUNCH_PALETTE.SECONDARY])
      : interpolateColors(navTransition, [0, 1], [LAUNCH_PALETTE.PRIMARY, LAUNCH_PALETTE.ACCENT]);
  const ctaBorderColor =
    frame >= arrivalFrame
      ? interpolateColors(arrivalTransition, [0, 1], [LAUNCH_PALETTE.ACCENT, LAUNCH_PALETTE.SECONDARY])
      : interpolateColors(navTransition, [0, 1], [LAUNCH_PALETTE.PRIMARY, LAUNCH_PALETTE.ACCENT]);

  const remainingMeters = hasArrived ? 0 : Math.max(1, Math.round(310 * (1 - routeProgress)));
  const etaMinutes = Math.max(1, Math.ceil(4 * (1 - routeProgress)));
  const etaDisplay = hasArrived ? 'Tiba!' : `${etaMinutes} Min`;

  // Animated progress bar inside active DIT3013 timetable row
  const timetableBarProgress = interpolate(
    frame,
    [Math.round(0.5 * safeFps), arrivalFrame],
    [0.24, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  // Beat 3 (5.8..8.0s): Destination arrival pill + radar rings + QR arrival chip
  const arrivalSpring =
    frame >= arrivalFrame
      ? spring({
          frame: frame - arrivalFrame,
          fps: safeFps,
          config: { damping: 145, stiffness: 225, mass: 0.85 },
        })
      : 0;
  const arrivalPillEnter = interpolate(
    frame,
    [arrivalFrame, arrivalFrame + Math.max(10, Math.round(0.42 * safeFps))],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );
  const arrivalFloatY = Math.sin(timeSec * 2.4) * 4 * arrivalPillEnter;
  const arrivalPillY = interpolate(arrivalPillEnter, [0, 1], [18, 0]) + arrivalFloatY;
  const arrivalPillScale = interpolate(arrivalPillEnter, [0, 0.72, 1], [0.84, 1.04, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Left-column QR chip spring + pulse ring
  const qrChipTranslateY = (1 - arrivalSpring) * 20;
  const qrChipScale = 0.9 + 0.1 * arrivalSpring;
  const qrChipOpacity =
    frame >= arrivalFrame
      ? interpolate(frame - arrivalFrame, [0, 10], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;
  const qrPulseCycleFrames = Math.max(24, Math.round(1.1 * safeFps));
  const qrPulseT =
    frame >= arrivalFrame ? ((frame - arrivalFrame) % qrPulseCycleFrames) / qrPulseCycleFrames : 0;
  const qrPulseScale = interpolate(qrPulseT, [0, 1], [0.78, 1.48]);
  const qrPulseOpacity = interpolate(qrPulseT, [0, 0.2, 0.8, 1], [0, 0.85, 0.25, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const radarCycleFrames = Math.max(24, Math.round(1.25 * safeFps));
  const radarStaggerFrames = Math.max(8, Math.round(0.36 * safeFps));

  const statusText = hasArrived ? 'SELESAI' : isNavigating ? 'BERJALAN' : 'SIAP SEDIA';
  const statusDotColor = hasArrived
    ? LAUNCH_PALETTE.SECONDARY
    : isNavigating
      ? LAUNCH_PALETTE.ACCENT
      : LAUNCH_PALETTE.TERTIARY;

  const scheduleRows = [
    {
      id: 'dfc2012',
      time: '08:00',
      code: 'DFC2012 · Asas Pengaturcaraan',
      location: 'BK2',
      status: 'Selesai ✓',
      state: 'done' as const,
    },
    {
      id: 'dit3013',
      time: '10:00',
      code: `${classCode} · ${classTitle}`,
      location: 'MK3 · JTMK',
      status: hasArrived ? 'TIBA ✓' : 'AKTIF',
      state: 'active' as const,
    },
    {
      id: 'mpu21032',
      time: '14:00',
      code: 'MPU21032 · Penghayatan Etika',
      location: 'DK1',
      status: 'Akan Datang',
      state: 'upcoming' as const,
    },
  ] as const;

  const primaryRoom = extractPrimaryRoom(roomName);

  return (
    <>
      <EditorialBackdrop showContours contourSpeed={1.25} seed={24} />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.035}
        panXFrom={6}
        panXTo={-6}
        panYFrom={4}
        panYTo={-4}
        tiltXFrom={0}
        tiltXTo={0}
        tiltYFrom={0}
        tiltYTo={0}
        breathingAmplitude={0.3}
        entryPanXOffset={28}
        entryZoomOffset={-0.06}
        entryTiltYOffset={1.0}
        exitPanXDelta={34}
        exitZoomDelta={0.022}
        exitFrames={Math.round(0.35 * safeFps)}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: `${STAGE_PAD_TOP}px ${STAGE_PAD_X}px ${STAGE_PAD_BOTTOM}px`,
            display: 'flex',
            gap: 32,
            alignItems: 'stretch',
            fontFamily: LAUNCH_FONTS.DISPLAY,
          }}
        >
          {/* Left Column (width=680px): Exploded 3D NextClassBentoCard + Live Day Schedule */}
          <Interactive.Div
            name="PolyMaps Editorial Sidebar"
            premountFor={safeFps}
            style={{
              position: 'relative',
              width: LEFT_COL_W,
              height: STAGE_CONTENT_H,
              flexShrink: 0,
              opacity: sidebarOpacity,
              transformStyle: 'preserve-3d',
              transform: `translate3d(${sidebarTranslateX.toFixed(2)}px, 0px, 0px)`,
            }}
          >
            {/* Header Block */}
            <div>
              <KineticReveal startFrame={pillStart} durationFrames={pillDuration}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 16px',
                    borderRadius: 999,
                    backgroundColor: 'rgba(107, 127, 91, 0.14)',
                    border: `1px solid ${LAUNCH_PALETTE.SECONDARY}`,
                    color: LAUNCH_PALETTE.PRIMARY,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12.5,
                    fontWeight: 800,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                  }}
                >
                  <Compass size={15} color={LAUNCH_PALETTE.SECONDARY} />
                  08:00 PAGI • POLYMAPS &amp; JADUAL
                </div>
              </KineticReveal>

              <KineticWords
                as="h2"
                text="Hari Pertama? Tak Sesat Cari Makmal."
                startFrame={headlineStart}
                staggerFrames={wordStagger}
                wordDurationFrames={wordDuration}
                accentWords={['Tak', 'Sesat']}
                accentColor={LAUNCH_PALETTE.ACCENT}
                style={{
                  margin: '10px 0 8px',
                  fontSize: 44,
                  fontWeight: 900,
                  lineHeight: 1.07,
                  letterSpacing: '-0.03em',
                  color: LAUNCH_PALETTE.PRIMARY,
                }}
              />

              <KineticReveal startFrame={subtitleStart} durationFrames={subtitleDuration}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 17,
                    lineHeight: 1.38,
                    color: LAUNCH_PALETTE.MUTED_OLIVE,
                    fontWeight: 500,
                  }}
                >
                  Jadual mingguan e-Akademik terus bersambung dengan laluan berjalan kaki masa nyata di kampus POLISAS Semambu.
                </p>
              </KineticReveal>
            </div>

            {/* Lower Exploded Workbench Stack (height=670, bottom-aligned at y=1006) */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: LOWER_STACK_H,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transformStyle: 'preserve-3d',
              }}
            >
              <ExplodedLayer
                zDepth={22}
                enterFrame={Math.round(0.16 * safeFps)}
                enterOffsetY={24}
                floatAmplitude={0}
                style={{
                  height: CARD_H,
                  flexShrink: 0,
                  transformStyle: 'preserve-3d',
                }}
              >
                <div
                  style={{
                    width: LEFT_COL_W,
                    height: CARD_H,
                    transformOrigin: '50% 42%',
                    transform: `scale(${cardClickScale.toFixed(4)})`,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <KineticWindow
                    surface="light"
                    routeLabel="e-akademik · jadual siswa"
                    statusPill={
                      hasArrived ? 'TIBA • SELESAI' : isNavigating ? 'NAVIGASI AKTIF' : 'KELAS HARI INI'
                    }
                    statusAccent={isNavigating && !hasArrived}
                    width={LEFT_COL_W}
                    height={CARD_H}
                    borderRadius={24}
                    sheenStartFrame={Math.round(0.95 * safeFps)}
                    sheenDuration={44}
                    style={{
                      borderColor:
                        clickFlash > 0.05 || hasArrived
                          ? LAUNCH_PALETTE.ACCENT
                          : LAUNCH_PALETTE.TERTIARY,
                      boxShadow:
                        clickFlash > 0.05
                          ? '0 26px 56px rgba(201, 111, 79, 0.22)'
                          : '0 22px 48px rgba(31, 39, 32, 0.12)',
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        padding: `${CARD_BODY_PAD_TOP}px ${CARD_BODY_PAD_X}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        boxSizing: 'border-box',
                        overflow: 'visible',
                      }}
                    >
                      {/* Row 0 (height=34): Weekly Student Day Tabs (ISNIN active #2E3A2F on Beat 1) */}
                      <div
                        style={{
                          height: TABS_H,
                          boxSizing: 'border-box',
                          padding: 3,
                          borderRadius: 999,
                          backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                          border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          flexShrink: 0,
                        }}
                      >
                        {WEEKLY_DAY_TABS.map((day) => {
                          const isIsnin = day === 'ISNIN';
                          return (
                            <div
                              key={day}
                              style={{
                                flex: 1,
                                height: '100%',
                                borderRadius: 999,
                                backgroundColor: isIsnin ? isninTabBg : 'transparent',
                                color: isIsnin ? isninTabColor : LAUNCH_PALETTE.MUTED_OLIVE,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 11,
                                fontWeight: 800,
                                letterSpacing: '0.1em',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isIsnin ? (
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: 999,
                                    backgroundColor: LAUNCH_PALETTE.ACCENT,
                                    opacity: isninActiveT,
                                    display: 'inline-block',
                                  }}
                                />
                              ) : null}
                              <span>{day}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Row 1 (height=30): KELAS SETERUSNYA + Live Ticking Countdown + Coords */}
                      <div
                        style={{
                          marginTop: ROW1_GAP,
                          height: ROW1_H,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '5px 11px',
                              borderRadius: 999,
                              backgroundColor: 'rgba(201, 111, 79, 0.12)',
                              border: '1px solid rgba(201, 111, 79, 0.36)',
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 10.5,
                              fontWeight: 800,
                              letterSpacing: '0.09em',
                              color: LAUNCH_PALETTE.ACCENT,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 999,
                                backgroundColor: LAUNCH_PALETTE.ACCENT,
                              }}
                            />
                            KELAS SETERUSNYA
                          </span>

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '5px 10px',
                              borderRadius: 999,
                              backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                              border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11.5,
                              fontWeight: 800,
                              color: LAUNCH_PALETTE.PRIMARY,
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Clock size={12} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.5} />
                            <span>{countdownLabel}</span>
                          </span>
                        </div>

                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: LAUNCH_PALETTE.SECONDARY,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {POLISAS_COORDS.LABEL_COORDS}
                        </span>
                      </div>

                      {/* Row 2 (height=46): DIT3013 with Terracotta Rough-Notation Circle */}
                      <div
                        style={{
                          marginTop: ROW2_GAP,
                          height: ROW2_H,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexShrink: 0,
                          overflow: 'visible',
                        }}
                      >
                        <span style={{ display: 'inline-block', overflow: 'visible' }}>
                          <EditorialAnnotation
                            type="circle"
                            startFrame={circleStart}
                            durationFrames={circleDuration}
                            color={LAUNCH_PALETTE.ACCENT}
                            strokeWidth={3}
                            padding={{ top: 4, right: 12, bottom: 4, left: 12 }}
                            style={{ display: 'inline-block', overflow: 'visible' }}
                          >
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 30,
                                fontWeight: 900,
                                lineHeight: 1,
                                color: LAUNCH_PALETTE.ACCENT,
                              }}
                            >
                              {classCode}
                            </span>
                          </EditorialAnnotation>
                        </span>

                        <span
                          style={{
                            padding: '5px 12px',
                            borderRadius: 999,
                            backgroundColor: 'rgba(107, 127, 91, 0.12)',
                            border: '1px solid rgba(107, 127, 91, 0.34)',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            color: LAUNCH_PALETTE.PRIMARY,
                          }}
                        >
                          AMALI • MAKMAL 3
                        </span>
                      </div>

                      {/* Row 3 (height=32): Course Title */}
                      <div
                        style={{
                          marginTop: ROW3_GAP,
                          height: ROW3_H,
                          lineHeight: `${ROW3_H}px`,
                          fontSize: 23.5,
                          fontWeight: 900,
                          letterSpacing: '-0.02em',
                          color: LAUNCH_PALETTE.PRIMARY,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flexShrink: 0,
                        }}
                      >
                        {classTitle}
                      </div>

                      {/* Row 4 (height=54): Meta Details + Interactive CTA Button */}
                      <div
                        style={{
                          marginTop: ROW4_GAP,
                          height: ROW4_H,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            fontSize: 14.5,
                            fontWeight: 600,
                            color: LAUNCH_PALETTE.MUTED_OLIVE,
                            minWidth: 0,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                            <Clock size={15} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.3} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {scheduleTime}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                            <MapPin size={15} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.3} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {roomName}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            width: CTA_WIDTH,
                            height: 44,
                            boxSizing: 'border-box',
                            borderRadius: 999,
                            backgroundColor: ctaBackground,
                            border: `1.5px solid ${ctaBorderColor}`,
                            color: LAUNCH_PALETTE.CARD_BG,
                            boxShadow: isNavigating
                              ? '0 10px 24px rgba(201, 111, 79, 0.28)'
                              : '0 8px 20px rgba(46, 58, 47, 0.16)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 12,
                            fontWeight: 800,
                            letterSpacing: '0.07em',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            transform: `scale(${buttonClickScale.toFixed(4)})`,
                          }}
                        >
                          {hasArrived ? (
                            <>
                              <Check size={15} strokeWidth={2.8} />
                              <span>TIBA TEPAT MASA</span>
                            </>
                          ) : isNavigating ? (
                            <>
                              <Navigation size={14} strokeWidth={2.5} />
                              <span>NAVIGASI AKTIF</span>
                            </>
                          ) : (
                            <>
                              <span>PANDU ARAH</span>
                              <ArrowRight size={14} strokeWidth={2.5} />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Row 5: Live Code-Driven Mini Timetable Strip (3 sleek timeline rows) */}
                      <div
                        style={{
                          marginTop: 14,
                          flex: 1,
                          padding: '13px 15px',
                          borderRadius: 18,
                          backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                          border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-start',
                          gap: 10,
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 800,
                            letterSpacing: '0.12em',
                            color: LAUNCH_PALETTE.MUTED_OLIVE,
                            flexShrink: 0,
                          }}
                        >
                          <span>GARIS MASA KULIAH • ISNIN</span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              backgroundColor: LAUNCH_PALETTE.CARD_BG,
                              border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                              color: LAUNCH_PALETTE.PRIMARY,
                            }}
                          >
                            3 SESI AKTIF
                          </span>
                        </div>

                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          {scheduleRows.map((row) => {
                            const isActive = row.state === 'active';
                            const isDone = row.state === 'done';

                            return (
                              <div
                                key={row.id}
                                style={{
                                  position: 'relative',
                                  overflow: 'hidden',
                                  flex: 1,
                                  padding: isActive ? '10px 14px 12px' : '9px 14px',
                                  borderRadius: 13,
                                  backgroundColor: isActive
                                    ? LAUNCH_PALETTE.CARD_BG
                                    : 'rgba(255, 255, 255, 0.62)',
                                  border: isActive
                                    ? `1.5px solid ${hasArrived ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.ACCENT}`
                                    : `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                                  boxShadow: isActive
                                    ? '0 8px 18px rgba(46, 58, 47, 0.08)'
                                    : 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 10,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                                  <span
                                    style={{
                                      fontFamily: LAUNCH_FONTS.MONO,
                                      fontSize: 12.5,
                                      fontWeight: 800,
                                      fontVariantNumeric: 'tabular-nums',
                                      color: isActive
                                        ? LAUNCH_PALETTE.ACCENT
                                        : LAUNCH_PALETTE.MUTED_OLIVE,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {row.time}
                                  </span>

                                  <div
                                    style={{
                                      width: 2,
                                      height: 22,
                                      borderRadius: 999,
                                      backgroundColor: isActive
                                        ? hasArrived
                                          ? LAUNCH_PALETTE.SECONDARY
                                          : LAUNCH_PALETTE.ACCENT
                                        : LAUNCH_PALETTE.TERTIARY,
                                      flexShrink: 0,
                                    }}
                                  />

                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <span
                                      style={{
                                        fontSize: 13.5,
                                        fontWeight: isActive ? 800 : 700,
                                        color: isDone
                                          ? LAUNCH_PALETTE.MUTED_OLIVE
                                          : LAUNCH_PALETTE.PRIMARY,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {row.code}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: LAUNCH_PALETTE.MUTED_OLIVE,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {row.location}
                                    </span>
                                  </div>
                                </div>

                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    backgroundColor: isActive
                                      ? hasArrived
                                        ? LAUNCH_PALETTE.SECONDARY
                                        : LAUNCH_PALETTE.ACCENT
                                      : isDone
                                        ? 'rgba(107, 127, 91, 0.14)'
                                        : LAUNCH_PALETTE.BACKGROUND,
                                    border: isActive
                                      ? 'none'
                                      : `1px solid ${
                                          isDone ? 'rgba(107, 127, 91, 0.3)' : LAUNCH_PALETTE.TERTIARY
                                        }`,
                                    fontFamily: LAUNCH_FONTS.MONO,
                                    fontSize: 10,
                                    fontWeight: 800,
                                    letterSpacing: '0.07em',
                                    color: isActive
                                      ? LAUNCH_PALETTE.CARD_BG
                                      : isDone
                                        ? LAUNCH_PALETTE.SECONDARY
                                        : LAUNCH_PALETTE.MUTED_OLIVE,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                  }}
                                >
                                  <span>{row.status}</span>
                                </span>

                                {/* Animated active progress indicator bar along bottom edge */}
                                {isActive ? (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: 0,
                                      right: 0,
                                      bottom: 0,
                                      height: 3,
                                      backgroundColor: 'rgba(217, 201, 178, 0.45)',
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        backgroundColor: hasArrived
                                          ? LAUNCH_PALETTE.SECONDARY
                                          : LAUNCH_PALETTE.ACCENT,
                                        transformOrigin: 'left center',
                                        transform: `scaleX(${timetableBarProgress.toFixed(4)})`,
                                      }}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </KineticWindow>
                </div>
              </ExplodedLayer>

              {/* Beat 3 Arrival Chip (frame >= arrivalFrame): IMBAS KEHADIRAN QR • SEDIA */}
              <div style={{ height: ARRIVAL_CHIP_H, flexShrink: 0 }}>
                {frame >= arrivalFrame && qrChipOpacity > 0.001 ? (
                  <div
                    style={{
                      height: ARRIVAL_CHIP_H,
                      boxSizing: 'border-box',
                      padding: '0 20px',
                      borderRadius: 18,
                      backgroundColor: LAUNCH_PALETTE.PRIMARY,
                      border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                      boxShadow: '0 18px 40px rgba(31, 39, 32, 0.24)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 14,
                      opacity: qrChipOpacity,
                      willChange: 'transform, opacity',
                      transform: `translate3d(0px, ${qrChipTranslateY.toFixed(2)}px, 16px) scale(${qrChipScale.toFixed(4)})`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          position: 'relative',
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: LAUNCH_PALETTE.ACCENT,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Circle
                          radius={24}
                          fill="none"
                          stroke={LAUNCH_PALETTE.ACCENT}
                          strokeWidth={2}
                          premountFor={safeFps}
                          showInTimeline={false}
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            opacity: qrPulseOpacity,
                            transform: `translate(-50%, -50%) scale(${qrPulseScale.toFixed(3)})`,
                            pointerEvents: 'none',
                          }}
                        />
                        <QrCode size={20} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={2.3} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 13.5,
                            fontWeight: 800,
                            letterSpacing: '0.09em',
                            color: LAUNCH_PALETTE.BACKGROUND,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          IMBAS KEHADIRAN QR · SEDIA
                        </span>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: LAUNCH_PALETTE.TERTIARY,
                          }}
                        >
                          Sahkan kehadiran terus di {primaryRoom}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '5px 12px',
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.SECONDARY,
                        color: LAUNCH_PALETTE.CARD_BG,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      SAH • +MERIT
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </Interactive.Div>

          {/* Right Column (1092 x 916): Live CampusMapLibrePlate Vector Map */}
          <Interactive.Div
            name="POLISAS MapLibre Container"
            premountFor={safeFps}
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: mapOpacity,
              scale: mapScale,
            }}
          >
            <CampusMapLibrePlate
              width={RIGHT_MAP_W}
              height={RIGHT_MAP_H}
              routeStartFrame={clickFrame}
              routeEndFrame={arrivalFrame}
            />

            {/* Beat 2 Live Ticking Distance / ETA Readout HUD (310m -> 0m • 4 Min -> Tiba!) */}
            <div
              style={{
                position: 'absolute',
                left: 24,
                bottom: 24,
                width: 420,
                padding: '18px 22px',
                borderRadius: 20,
                backgroundColor: 'rgba(248, 246, 238, 0.96)',
                border: `1.5px solid ${
                  hasArrived
                    ? LAUNCH_PALETTE.SECONDARY
                    : isNavigating
                      ? LAUNCH_PALETTE.ACCENT
                      : LAUNCH_PALETTE.TERTIARY
                }`,
                boxShadow: '0 18px 40px rgba(31, 39, 32, 0.16)',
                zIndex: 6,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: LAUNCH_PALETTE.MUTED_OLIVE,
                }}
              >
                <span>DATARAN SISWA → BLOK JTMK</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 10px',
                    borderRadius: 999,
                    backgroundColor: LAUNCH_PALETTE.CARD_BG,
                    border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    color: LAUNCH_PALETTE.PRIMARY,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      backgroundColor: statusDotColor,
                      display: 'inline-block',
                    }}
                  />
                  {statusText}
                </span>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 10,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <span
                    style={{
                      fontSize: 34,
                      fontWeight: 900,
                      letterSpacing: '-0.03em',
                      color: LAUNCH_PALETTE.PRIMARY,
                    }}
                  >
                    {remainingMeters}m
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: LAUNCH_PALETTE.TERTIARY }}>
                    •
                  </span>
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: hasArrived ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.ACCENT,
                    }}
                  >
                    {etaDisplay}
                  </span>
                </div>

                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12,
                    fontWeight: 700,
                    color: LAUNCH_PALETTE.MUTED_OLIVE,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {hasArrived ? 100 : Math.min(99, Math.round(routeProgress * 100))}%
                </span>
              </div>

              <div
                style={{
                  marginTop: 12,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 999,
                    backgroundColor: hasArrived ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.ACCENT,
                    transformOrigin: 'left center',
                    transform: `scaleX(${Math.max(0.02, routeProgress).toFixed(4)})`,
                  }}
                />
              </div>
            </div>

            {/* Beat 3: Expanding Radar Rings (@remotion/shapes <Circle>) at Blok JTMK Destination Pin */}
            {frame >= arrivalFrame ? (
              <div
                style={{
                  position: 'absolute',
                  left: '59%',
                  top: '41.8%',
                  width: 0,
                  height: 0,
                  pointerEvents: 'none',
                  zIndex: 7,
                }}
              >
                {[0, 1, 2].map((ringIdx) => {
                  const localElapsed = frame - arrivalFrame - ringIdx * radarStaggerFrames;
                  if (localElapsed < 0) return null;
                  const cycleT = (localElapsed % radarCycleFrames) / radarCycleFrames;
                  const ringScale = interpolate(cycleT, [0, 1], [0.16, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  });
                  const ringOpacity = interpolate(cycleT, [0, 0.14, 0.72, 1], [0, 0.85, 0.28, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  });

                  return (
                    <Circle
                      key={`radar-ring-${ringIdx}`}
                      radius={115}
                      fill="none"
                      stroke={ringIdx % 2 === 0 ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.SECONDARY}
                      strokeWidth={2.5}
                      vectorEffect="non-scaling-stroke"
                      premountFor={safeFps}
                      showInTimeline={false}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        opacity: ringOpacity,
                        transform: `translate(-50%, -50%) scale(${ringScale.toFixed(4)})`,
                      }}
                    />
                  );
                })}

                <Circle
                  radius={12}
                  fill={LAUNCH_PALETTE.ACCENT}
                  stroke={LAUNCH_PALETTE.CARD_BG}
                  strokeWidth={3.5}
                  premountFor={safeFps}
                  showInTimeline={false}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    opacity: arrivalPillEnter,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
            ) : null}

            {/* Beat 3: Destination Arrival Pill ("TIBA • MAKMAL KOMPUTER 3 ✓") */}
            {arrivalPillEnter > 0.001 ? (
              <div
                style={{
                  position: 'absolute',
                  left: '59%',
                  top: '23%',
                  zIndex: 8,
                  pointerEvents: 'none',
                  opacity: arrivalPillEnter,
                  transform: `translate3d(-50%, ${arrivalPillY.toFixed(2)}px, 0px) scale(${arrivalPillScale.toFixed(4)})`,
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 22px',
                    borderRadius: 999,
                    backgroundColor: LAUNCH_PALETTE.PRIMARY,
                    border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    boxShadow: '0 22px 48px rgba(31, 39, 32, 0.28)',
                    color: LAUNCH_PALETTE.BACKGROUND,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 15,
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      backgroundColor: LAUNCH_PALETTE.ACCENT,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={14} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={3} />
                  </span>
                  <span>{formatArrivalLabel(roomName)}</span>
                </div>
              </div>
            ) : null}
          </Interactive.Div>
        </div>

        {/* Beat 2: GhostCursor synchronized inside CameraStage coordinate space */}
        <GhostCursor
          keyframes={cursorKeyframes}
          appearFrame={cursorAppearFrame}
          disappearFrame={cursorDisappearFrame}
          color={LAUNCH_PALETTE.PRIMARY}
          rippleColor={LAUNCH_PALETTE.ACCENT}
          scale={1.08}
          style={{ zIndex: 20 }}
        />
      </CameraStage>

      <EditorialFrameMarks chapterCode="02" chapterLabel="08:00 PAGI • TAK SESAT CARI KELAS" />
    </>
  );
};

export const polyMapsSchema = {
  classCode: { type: 'string', default: 'DIT3013', description: 'Course Code' },
  classTitle: {
    type: 'string',
    default: 'Pembangunan Aplikasi Web',
    description: 'Course Title',
  },
  roomName: {
    type: 'string',
    default: 'Makmal Komputer 3 • Blok JTMK',
    description: 'Destination Room',
  },
  scheduleTime: {
    type: 'string',
    default: '10:00 AM – 12:00 PM • 4 Min Berjalan',
    description: 'Schedule & ETA',
  },
} as const satisfies InteractivitySchema;

export const PolyMapsCampusScene = Interactive.withSchema({
  Component: PolyMapsCampusInner,
  componentName: 'PolyMapsCampusScene',
  schema: polyMapsSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
