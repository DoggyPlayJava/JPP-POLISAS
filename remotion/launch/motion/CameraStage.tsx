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
  readonly transformOrigin?: string;
  readonly clip?: boolean;
  readonly style?: React.CSSProperties;
  readonly children: React.ReactNode;
};

const CAMERA_EASING = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * Continuous 3D perspective camera rig driven strictly by Remotion frame timing.
 * Pairs smooth cubic-out camera dolly/pan/tilt with a subtle Steadicam breathing drift
 * so compositions remain alive on every frame without layout reflow.
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
  transformOrigin = '50% 50%',
  clip = false,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const resolvedEnd = Math.max(startFrame + 1, endFrame ?? Math.max(startFrame + 1, durationInFrames - 1));
  const inputRange: readonly [number, number] = [startFrame, resolvedEnd];
  const interpOptions = {
    extrapolateLeft: 'clamp' as const,
    extrapolateRight: 'clamp' as const,
    easing: CAMERA_EASING,
  };

  const timeSec = frame / Math.max(1, fps);
  const breathePanX = Math.sin(timeSec * 0.85) * 3 * breathingAmplitude;
  const breathePanY = Math.cos(timeSec * 0.7) * 2.5 * breathingAmplitude;
  const breatheTiltX = Math.sin(timeSec * 0.65) * 0.25 * breathingAmplitude;
  const breatheTiltY = Math.cos(timeSec * 0.55) * 0.35 * breathingAmplitude;
  const breatheZoom = Math.sin(timeSec * 0.6) * 0.0025 * breathingAmplitude;

  const zoom = interpolate(frame, inputRange, [zoomFrom, zoomTo], interpOptions) + breatheZoom;
  const panX = interpolate(frame, inputRange, [panXFrom, panXTo], interpOptions) + breathePanX;
  const panY = interpolate(frame, inputRange, [panYFrom, panYTo], interpOptions) + breathePanY;
  const tiltX = interpolate(frame, inputRange, [tiltXFrom, tiltXTo], interpOptions) + breatheTiltX;
  const tiltY = interpolate(frame, inputRange, [tiltYFrom, tiltYTo], interpOptions) + breatheTiltY;

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
