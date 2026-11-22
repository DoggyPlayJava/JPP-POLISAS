import React from 'react';
import {
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import { Circle } from '@remotion/shapes';
import { Check, Clock, Compass, MapPin, Navigation } from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import {
  CampusMapLibrePlate,
  computeCampusRouteProgress,
} from '../components/CampusMapLibrePlate';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { GhostCursor, type GhostCursorKeyframe } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_PALETTE, POLISAS_COORDS } from '../tokens';

type PolyMapsSceneProps = {
  readonly classCode: string;
  readonly classTitle: string;
  readonly roomName: string;
  readonly scheduleTime: string;
};

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

const formatArrivalLabel = (roomName: string): string => {
  const primaryRoom = roomName.split('•')[0]?.trim();
  const label = primaryRoom ? primaryRoom.toUpperCase() : 'MAKMAL KOMPUTER 3';
  return `TIBA • ${label} ✓`;
};

const PolyMapsCampusInner: React.FC<PolyMapsSceneProps> = ({
  classCode,
  classTitle,
  roomName,
  scheduleTime,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Beat 1 (0..1.8s): Editorial entrance + KineticWords + Rough-Notation Circle around DIT3013
  const sidebarEnterDuration = Math.max(10, Math.round(0.55 * fps));
  const sidebarProgress = interpolate(frame, [0, sidebarEnterDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const sidebarTranslateX = interpolate(sidebarProgress, [0, 1], [-42, 0]);
  const sidebarOpacity = interpolate(sidebarProgress, [0, 0.4, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const mapEnterStart = Math.round(0.1 * fps);
  const mapEnterEnd = Math.max(mapEnterStart + 10, Math.round(0.7 * fps));
  const mapScale = interpolate(frame, [mapEnterStart, mapEnterEnd], [0.955, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
    output: 'perceptual-scale',
  });
  const mapOpacity = interpolate(frame, [mapEnterStart, mapEnterStart + Math.max(6, Math.round(0.32 * fps))], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pillStart = Math.round(0.05 * fps);
  const pillDuration = Math.max(8, Math.round(0.38 * fps));
  const headlineStart = Math.round(0.18 * fps);
  const wordStagger = Math.max(2, Math.round(0.065 * fps));
  const wordDuration = Math.max(8, Math.round(0.38 * fps));
  const subtitleStart = Math.round(0.55 * fps);
  const subtitleDuration = Math.max(8, Math.round(0.45 * fps));

  const circleStart = Math.round(0.95 * fps);
  const circleDuration = Math.max(12, Math.round(0.68 * fps));

  // Beat 2 (1.5..5.8s): GhostCursor glides onto DIT3013 card, clicks, and drives MapLibre route + ETA
  const cursorAppearFrame = Math.round(1.5 * fps);
  const clickFrame = Math.round(2.1 * fps);
  const cursorHoldEnd = clickFrame + Math.round(0.28 * fps);
  const cursorLeaveFrame = Math.round(2.65 * fps);
  const cursorDisappearFrame = Math.round(2.95 * fps);
  const arrivalFrame = Math.round(5.8 * fps);

  // Exact target coordinates on the right-side action pill inside the DIT3013 schedule card:
  // Sidebar x=84..704, Card height=462 bottom-aligned at y=1002 (top y=540), Row 3 center y=695, Button center x=591
  const cursorKeyframes: readonly GhostCursorKeyframe[] = [
    { frame: cursorAppearFrame, x: 960, y: 810 },
    { frame: Math.max(cursorAppearFrame + 2, clickFrame - Math.round(0.08 * fps)), x: 591, y: 695, label: classCode },
    { frame: clickFrame, x: 591, y: 695, click: true, label: 'Mula Laluan' },
    { frame: cursorHoldEnd, x: 591, y: 695, label: 'Laluan Aktif' },
    { frame: cursorLeaveFrame, x: 785, y: 745 },
  ];

  const isNavigating = frame >= clickFrame;
  const cardClickScale = interpolate(
    frame,
    [clickFrame - 2, clickFrame + Math.max(2, Math.round(0.06 * fps)), clickFrame + Math.max(6, Math.round(0.24 * fps))],
    [1, 0.978, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const buttonClickScale = interpolate(
    frame,
    [clickFrame - 2, clickFrame + Math.max(2, Math.round(0.05 * fps)), clickFrame + Math.max(6, Math.round(0.22 * fps))],
    [1, 0.93, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const clickFlash = interpolate(
    frame,
    [clickFrame, clickFrame + Math.max(2, Math.round(0.08 * fps)), clickFrame + Math.max(8, Math.round(0.45 * fps))],
    [0, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  const routeProgress = computeCampusRouteProgress(frame, clickFrame, arrivalFrame);
  const remainingMeters = Math.round(310 * (1 - routeProgress));
  const hasArrived = frame >= arrivalFrame || remainingMeters === 0;
  const etaMinutes = Math.max(1, Math.ceil(4 * (1 - routeProgress)));
  const etaDisplay = hasArrived ? 'Tiba!' : `${etaMinutes} Min`;

  // Beat 3 (5.8..8.0s): Destination arrival pill + pulsing @remotion/shapes <Circle> radar rings
  const arrivalPillEnter = interpolate(
    frame,
    [arrivalFrame, arrivalFrame + Math.max(10, Math.round(0.42 * fps))],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );
  const timeSec = frame / Math.max(1, fps);
  const arrivalFloatY = Math.sin(timeSec * 2.4) * 4 * arrivalPillEnter;
  const arrivalPillY = interpolate(arrivalPillEnter, [0, 1], [18, 0]) + arrivalFloatY;
  const arrivalPillScale = interpolate(arrivalPillEnter, [0, 0.72, 1], [0.84, 1.04, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const radarCycleFrames = Math.max(24, Math.round(1.25 * fps));
  const radarStaggerFrames = Math.max(8, Math.round(0.36 * fps));

  const statusText = hasArrived
    ? 'SELESAI'
    : isNavigating
      ? 'BERJALAN'
      : 'SIAP SEDIA';
  const statusDotColor = hasArrived
    ? LAUNCH_PALETTE.SECONDARY
    : isNavigating
      ? LAUNCH_PALETTE.ACCENT
      : LAUNCH_PALETTE.TERTIARY;

  return (
    <>
      <EditorialBackdrop showContours contourSpeed={1.25} seed={24} />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.04}
        panXFrom={8}
        panXTo={-6}
        panYFrom={4}
        panYTo={-4}
        tiltXFrom={0}
        tiltXTo={0}
        tiltYFrom={0}
        tiltYTo={0}
        breathingAmplitude={0.3}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: '86px 84px 78px',
            display: 'flex',
            gap: 40,
            alignItems: 'stretch',
            fontFamily: LAUNCH_FONTS.DISPLAY,
          }}
        >
          {/* Left Editorial Sidebar (x=84..704, y=86..1002) */}
          <Interactive.Div
            name="PolyMaps Editorial Sidebar"
            premountFor={fps}
            style={{
              width: 620,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              opacity: sidebarOpacity,
              transform: `translate3d(${sidebarTranslateX.toFixed(2)}px, 0px, 0px)`,
            }}
          >
            <div>
              <KineticReveal startFrame={pillStart} durationFrames={pillDuration}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 18px',
                    borderRadius: 999,
                    backgroundColor: 'rgba(107, 127, 91, 0.14)',
                    border: `1px solid ${LAUNCH_PALETTE.SECONDARY}`,
                    color: LAUNCH_PALETTE.PRIMARY,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                  }}
                >
                  <Compass size={16} color={LAUNCH_PALETTE.SECONDARY} />
                  POLYMAPS • NAVIGASI SEMAMBU
                </div>
              </KineticReveal>

              <KineticWords
                as="h2"
                text="Dari Jadual Terus Ke Pintu Kelas."
                startFrame={headlineStart}
                staggerFrames={wordStagger}
                wordDurationFrames={wordDuration}
                accentWords={['Ke', 'Pintu', 'Kelas.']}
                accentColor={LAUNCH_PALETTE.PRIMARY_DARK}
                style={{
                  margin: '18px 0 14px',
                  fontSize: 54,
                  fontWeight: 900,
                  lineHeight: 1.08,
                  letterSpacing: '-0.03em',
                  color: LAUNCH_PALETTE.PRIMARY,
                }}
              />

              <KineticReveal startFrame={subtitleStart} durationFrames={subtitleDuration}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 20,
                    lineHeight: 1.45,
                    color: LAUNCH_PALETTE.SECONDARY,
                  }}
                >
                  Laluan berjalan kaki masa nyata merentasi kampus POLISAS Semambu disepadukan terus dengan jadual e-Akademik.
                </p>
              </KineticReveal>
            </div>

            {/* DIT3013 Schedule Card (x=84..704, y=540..1002, fixed height=462px for exact GhostCursor lock) */}
            <div
              style={{
                height: 462,
                boxSizing: 'border-box',
                backgroundColor: LAUNCH_PALETTE.CARD_BG,
                borderRadius: 24,
                border: `1.5px solid ${
                  clickFlash > 0.05 || hasArrived ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.TERTIARY
                }`,
                padding: '24px 28px',
                boxShadow:
                  clickFlash > 0.05
                    ? '0 24px 52px rgba(201, 111, 79, 0.2)'
                    : '0 20px 44px rgba(46, 58, 47, 0.09)',
                display: 'flex',
                flexDirection: 'column',
                transformOrigin: '50% 45%',
                transform: `scale(${cardClickScale.toFixed(4)})`,
              }}
            >
              {/* Row 1: height 48px */}
              <div
                style={{
                  height: 48,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ display: 'inline-block' }}>
                  <EditorialAnnotation
                    type="circle"
                    startFrame={circleStart}
                    durationFrames={circleDuration}
                    color={LAUNCH_PALETTE.ACCENT}
                    strokeWidth={3}
                    padding={{ top: 4, right: 12, bottom: 4, left: 12 }}
                  >
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 32,
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
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 13,
                    fontWeight: 700,
                    color: LAUNCH_PALETTE.SECONDARY,
                  }}
                >
                  {POLISAS_COORDS.LABEL_COORDS}
                </span>
              </div>

              {/* Row 2: marginTop 10px, height 32px */}
              <div
                style={{
                  marginTop: 10,
                  height: 32,
                  lineHeight: '32px',
                  fontSize: 24,
                  fontWeight: 800,
                  color: LAUNCH_PALETTE.PRIMARY,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flexShrink: 0,
                }}
              >
                {classTitle}
              </div>

              {/* Row 3: marginTop 14px, height 54px -> center at y=695, CTA button center at x=591 */}
              <div
                style={{
                  marginTop: 14,
                  height: 54,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    fontSize: 15.5,
                    color: LAUNCH_PALETTE.MUTED_OLIVE,
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                    <Clock size={16} color={LAUNCH_PALETTE.ACCENT} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{scheduleTime}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                    <MapPin size={16} color={LAUNCH_PALETTE.SECONDARY} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{roomName}</span>
                  </div>
                </div>

                <div
                  style={{
                    width: 170,
                    height: 42,
                    borderRadius: 999,
                    backgroundColor: isNavigating ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.SURFACE_MUTED,
                    border: `1.5px solid ${
                      isNavigating ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.TERTIARY
                    }`,
                    color: isNavigating ? LAUNCH_PALETTE.CARD_BG : LAUNCH_PALETTE.PRIMARY,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    flexShrink: 0,
                    transform: `scale(${buttonClickScale.toFixed(4)})`,
                  }}
                >
                  <Navigation size={14} strokeWidth={2.4} />
                  <span>{hasArrived ? 'TIBA DI KELAS' : isNavigating ? 'NAVIGASI AKTIF' : 'PANDU ARAH →'}</span>
                </div>
              </div>

              {/* Row 4: e-Akademik Schedule Preview */}
              <div
                style={{
                  marginTop: 16,
                  flex: 1,
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                }}
              >
                <CanvasImage
                  name="e-Akademik Schedule Preview"
                  src={staticFile('GAMBAR/Automated E-akademik integration view.png')}
                  premountFor={fps}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left' }}
                />
              </div>
            </div>
          </Interactive.Div>

          {/* Right MapLibre Container (1092 x 916) */}
          <Interactive.Div
            name="POLISAS MapLibre Container"
            premountFor={fps}
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
              width={1092}
              height={916}
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
                  <span style={{ fontSize: 22, fontWeight: 700, color: LAUNCH_PALETTE.TERTIARY }}>•</span>
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
                  {Math.round(routeProgress * 100)}%
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
                      premountFor={fps}
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
                  premountFor={fps}
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

      <EditorialFrameMarks chapterCode="02" chapterLabel="PolyMaps & Jadual Kuliah" />
    </>
  );
};

const polyMapsSchema = {
  classCode: { type: 'string', default: 'DIT3013', description: 'Course Code' },
  classTitle: { type: 'string', default: 'Pembangunan Aplikasi Web', description: 'Course Title' },
  roomName: { type: 'string', default: 'Makmal Komputer 3 • Blok JTMK', description: 'Destination Room' },
  scheduleTime: { type: 'string', default: '10:00 AM – 12:00 PM • 4 Min Berjalan', description: 'Schedule & ETA' },
} as const satisfies InteractivitySchema;

export const PolyMapsCampusScene = Interactive.withSchema({
  Component: PolyMapsCampusInner,
  componentName: 'PolyMapsCampusScene',
  schema: polyMapsSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
