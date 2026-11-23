import React from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export type CameraStageProps = {
  readonly zoomFrom?: number;
  readonly zoomTo?: number;
  readonly panXFrom?: number;
  readonly panXTo?: number;
  readonly panYFrom?: number;
  readonly panYTo?: number;
  readonly tiltXFrom?: number;
  readonly tiltXTo?: number;
  readonly tiltYFrom?: number;
  readonly tiltYTo?: number;
  readonly perspective?: number;
  readonly startFrame?: number;
  readonly endFrame?: number;
  readonly breathingAmplitude?: number;
  readonly entryZoomOffset?: number;
  readonly entryPanXOffset?: number;
  readonly entryPanYOffset?: number;
  readonly entryTiltYOffset?: number;
  readonly entryFrames?: number;
  readonly exitZoomDelta?: number;
  readonly exitPanXDelta?: number;
  readonly exitPanYDelta?: number;
  readonly exitTiltYDelta?: number;
  readonly exitFrames?: number;
  readonly transformOrigin?: string;
  readonly clip?: boolean;
  readonly style?: React.CSSProperties;
  readonly children: React.ReactNode;
};

const CAMERA_EASING = Easing.bezier(0.33, 0.08, 0.67, 0.92);
const ENTRY_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const EXIT_EASING = Easing.bezier(0.55, 0, 1, 0.45);

/**
 * Continuous 3-phase 3D perspective camera rig driven strictly by Remotion frame timing.
 * Pairs an expo-out entry momentum catch and cubic-in exit momentum launch with
 * an S-balanced continuous dolly/pan/tilt drift and subtle Steadicam breathing.
 */
export const CameraStage: React.FC<CameraStageProps> = ({
  zoomFrom = 1,
  zoomTo = 1.03,
  panXFrom = 0,
  panXTo = 0,
  panYFrom = 0,
  panYTo = 0,
  tiltXFrom = 0,
  tiltXTo = 0,
  tiltYFrom = 0,
  tiltYTo = 0,
  perspective = 1800,
  startFrame = 0,
  endFrame,
  breathingAmplitude = 1,
  entryZoomOffset = 0,
  entryPanXOffset = 0,
  entryPanYOffset = 0,
  entryTiltYOffset = 0,
  entryFrames,
  exitZoomDelta = 0,
  exitPanXDelta = 0,
  exitPanYDelta = 0,
  exitTiltYDelta = 0,
  exitFrames,
  transformOrigin = '50% 50%',
  clip = false,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeDuration = Math.max(2, Number.isFinite(durationInFrames) ? durationInFrames : 2);
  const resolvedEnd = Math.max(
    startFrame + 1,
    endFrame ?? Math.max(startFrame + 1, safeDuration - 1),
  );
  const inputRange: readonly [number, number] = [startFrame, resolvedEnd];
  const interpOptions = {
    extrapolateLeft: 'clamp' as const,
    extrapolateRight: 'clamp' as const,
    easing: CAMERA_EASING,
  };

  // Phase 1: Entry momentum catch (expo-out settle from transition impulse to 0)
  const resolvedEntryInput =
    entryFrames !== undefined && Number.isFinite(entryFrames)
      ? entryFrames
      : Math.round(0.4 * safeFps);
  const hasEntryMotion =
    resolvedEntryInput > 0 &&
    (entryZoomOffset !== 0 ||
      entryPanXOffset !== 0 ||
      entryPanYOffset !== 0 ||
      entryTiltYOffset !== 0);
  const safeEntryFrames = Math.max(1, Math.round(resolvedEntryInput));
  const entryRange: readonly [number, number] = [startFrame, startFrame + safeEntryFrames];
  const entryFactor = hasEntryMotion
    ? interpolate(frame, entryRange, [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: ENTRY_EASING,
      })
    : 0;

  // Phase 3: Exit momentum launch (accelerates smoothly into outgoing transition)
  const resolvedExitInput =
    exitFrames !== undefined && Number.isFinite(exitFrames)
      ? exitFrames
      : Math.round(0.32 * safeFps);
  const hasExitMotion =
    resolvedExitInput > 0 &&
    (exitZoomDelta !== 0 ||
      exitPanXDelta !== 0 ||
      exitPanYDelta !== 0 ||
      exitTiltYDelta !== 0);
  const safeExitFrames = Math.max(1, Math.round(resolvedExitInput));
  const exitEnd = resolvedEnd;
  const exitStart = Math.min(exitEnd - 1, Math.max(startFrame, exitEnd + 1 - safeExitFrames));
  const exitRange: readonly [number, number] = [exitStart, exitEnd];
  const exitFactor = hasExitMotion
    ? interpolate(frame, exitRange, [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: EXIT_EASING,
      })
    : 0;

  const timeSec = frame / safeFps;
  const breathePanX = Math.sin(timeSec * 0.85) * 3 * breathingAmplitude;
  const breathePanY = Math.cos(timeSec * 0.7) * 2.5 * breathingAmplitude;
  const breatheTiltX = Math.sin(timeSec * 0.65) * 0.25 * breathingAmplitude;
  const breatheTiltY = Math.cos(timeSec * 0.55) * 0.35 * breathingAmplitude;
  const breatheZoom = Math.sin(timeSec * 0.6) * 0.0025 * breathingAmplitude;

  const zoom =
    interpolate(frame, inputRange, [zoomFrom, zoomTo], interpOptions) +
    entryFactor * entryZoomOffset +
    exitFactor * exitZoomDelta +
    breatheZoom;
  const panX =
    interpolate(frame, inputRange, [panXFrom, panXTo], interpOptions) +
    entryFactor * entryPanXOffset +
    exitFactor * exitPanXDelta +
    breathePanX;
  const panY =
    interpolate(frame, inputRange, [panYFrom, panYTo], interpOptions) +
    entryFactor * entryPanYOffset +
    exitFactor * exitPanYDelta +
    breathePanY;
  const tiltX = interpolate(frame, inputRange, [tiltXFrom, tiltXTo], interpOptions) + breatheTiltX;
  const tiltY =
    interpolate(frame, inputRange, [tiltYFrom, tiltYTo], interpOptions) +
    entryFactor * entryTiltYOffset +
    exitFactor * exitTiltYDelta +
    breatheTiltY;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        perspective: `${perspective}px`,
        perspectiveOrigin: '50% 50%',
        overflow: clip ? 'hidden' : 'visible',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          transformOrigin,
          willChange: 'transform',
          transform: `translate3d(${panX.toFixed(3)}px, ${panY.toFixed(3)}px, 0px) scale(${zoom.toFixed(5)}) rotateX(${tiltX.toFixed(3)}deg) rotateY(${tiltY.toFixed(3)}deg)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
