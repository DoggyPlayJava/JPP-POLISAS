import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Easing,
  Solid,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { lightLeak } from '@remotion/effects/light-leak';
import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from '@remotion/transitions';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

const clampUnit = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const EXPO_IN_OUT = Easing.inOut(Easing.exp);
const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const CUBIC_IN_OUT = Easing.inOut(Easing.cubic);

export type KineticCameraPushProps = {
  readonly direction?: 'from-right' | 'from-left';
  readonly accentColor?: string;
};

const KineticCameraPushPresentation: React.FC<
  TransitionPresentationComponentProps<KineticCameraPushProps>
> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps: {
    direction = 'from-right',
    accentColor = LAUNCH_PALETTE.ACCENT,
  },
}) => {
  const p = clampUnit(presentationProgress);
  const sign = direction === 'from-right' ? 1 : -1;

  const isEntering = presentationDirection === 'entering';
  const isSettled = isEntering && p >= 0.9999;
  const isUntouched = !isEntering && p <= 0.0001;
  const isDecorVisible = isEntering && p > 0.0005 && p < 0.9995;

  const outerStyle = useMemo<React.CSSProperties>(() => {
    if (isEntering) {
      if (isSettled) {
        return { width: '100%', height: '100%' };
      }
      const translateX = interpolate(p, [0, 1], [100 * sign, 0]);
      const shadowOpacity = interpolate(p, [0, 0.06, 0.88, 1], [0, 0.24, 0.24, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      const shadowX = direction === 'from-right' ? -36 : 36;
      return {
        width: '100%',
        height: '100%',
        zIndex: 2,
        willChange: 'transform',
        transform: `translate3d(${translateX.toFixed(3)}%, 0px, 0px)`,
        boxShadow:
          shadowOpacity > 0.005
            ? `${shadowX}px 0px 72px rgba(46, 58, 47, ${shadowOpacity.toFixed(3)})`
            : undefined,
      };
    }

    if (isUntouched) {
      return { width: '100%', height: '100%' };
    }

    return {
      width: '100%',
      height: '100%',
      zIndex: 1,
      perspective: '1800px',
      perspectiveOrigin: '50% 50%',
      backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
      overflow: 'hidden',
    };
  }, [direction, isEntering, isSettled, isUntouched, p, sign]);

  const innerStyle = useMemo<React.CSSProperties>(() => {
    if (isEntering) {
      if (isSettled) {
        return { width: '100%', height: '100%' };
      }
      const settleScale = interpolate(p, [0, 1], [1.05, 1]);
      return {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        willChange: 'transform',
        transformOrigin: '50% 50%',
        transform: `scale(${settleScale.toFixed(5)})`,
      };
    }

    if (isUntouched) {
      return { width: '100%', height: '100%' };
    }

    const exitX = interpolate(p, [0, 1], [0, -22 * sign]);
    const exitScale = interpolate(p, [0, 1], [1, 0.91]);
    const exitRotateY = interpolate(p, [0, 1], [0, -6 * sign]);
    return {
      width: '100%',
      height: '100%',
      transformStyle: 'preserve-3d',
      willChange: 'transform',
      transformOrigin: '50% 50%',
      transform: `translate3d(${exitX.toFixed(3)}%, 0px, 0px) scale(${exitScale.toFixed(5)}) rotateY(${exitRotateY.toFixed(3)}deg)`,
    };
  }, [isEntering, isSettled, isUntouched, p, sign]);

  const edgeOpacity = isDecorVisible
    ? interpolate(p, [0, 0.06, 0.88, 1], [0, 1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const exitDimOpacity =
    !isEntering && !isUntouched
      ? interpolate(p, [0, 1], [0, 0.28], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  return (
    <AbsoluteFill showInTimeline={false} style={outerStyle}>
      <AbsoluteFill showInTimeline={false} style={innerStyle}>
        {children}
      </AbsoluteFill>

      {!isEntering && exitDimOpacity > 0.001 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
            opacity: exitDimOpacity,
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {isDecorVisible && edgeOpacity > 0.005 ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            ...(direction === 'from-right' ? { left: 0 } : { right: 0 }),
            width: 6,
            display: 'flex',
            flexDirection: direction === 'from-right' ? 'row' : 'row-reverse',
            opacity: edgeOpacity,
            pointerEvents: 'none',
          }}
        >
          <div style={{ width: 4, height: '100%', backgroundColor: accentColor }} />
          <div style={{ width: 2, height: '100%', backgroundColor: LAUNCH_PALETTE.PRIMARY }} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * 3D architectural camera push: outgoing scene recedes in 1800px perspective
 * (`translateX`, `scale`, `rotateY`, subtle dim) while incoming glides across
 * with a crisp vertical terracotta/forest edge accent and elevation shadow.
 */
export const kineticCameraPush = (
  props: KineticCameraPushProps = {},
): TransitionPresentation<KineticCameraPushProps> => {
  return {
    component: KineticCameraPushPresentation,
    props: {
      direction: props.direction ?? 'from-right',
      accentColor: props.accentColor ?? LAUNCH_PALETTE.ACCENT,
    },
  };
};

export type EditorialSplitCurtainProps = {
  readonly accentColor?: string;
  readonly secondaryColor?: string;
};

const EditorialSplitCurtainPresentation: React.FC<
  TransitionPresentationComponentProps<EditorialSplitCurtainProps>
> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps: {
    accentColor = LAUNCH_PALETTE.ACCENT,
    secondaryColor = LAUNCH_PALETTE.PRIMARY,
  },
}) => {
  const p = clampUnit(presentationProgress);
  const isEntering = presentationDirection === 'entering';
  const isSettled = isEntering && p >= 0.9999;
  const isUntouched = !isEntering && p <= 0.0001;
  const isDecorVisible = isEntering && p > 0.0005 && p < 0.9995;

  const half = interpolate(p, [0, 1], [50, 0]);
  const span = 50 - half;

  const outerStyle = useMemo<React.CSSProperties>(() => {
    if (isEntering) {
      return isSettled
        ? { width: '100%', height: '100%' }
        : { width: '100%', height: '100%', zIndex: 2 };
    }
    if (isUntouched) {
      return { width: '100%', height: '100%' };
    }
    return {
      width: '100%',
      height: '100%',
      zIndex: 1,
      overflow: 'hidden',
      backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
    };
  }, [isEntering, isSettled, isUntouched]);

  const clipStyle = useMemo<React.CSSProperties>(() => {
    if (!isEntering || isSettled) {
      return { width: '100%', height: '100%' };
    }
    const insetStr = `${half.toFixed(3)}%`;
    return {
      width: '100%',
      height: '100%',
      clipPath: `inset(0% ${insetStr} 0% ${insetStr})`,
    };
  }, [half, isEntering, isSettled]);

  const innerStyle = useMemo<React.CSSProperties>(() => {
    if (isEntering) {
      if (isSettled) {
        return { width: '100%', height: '100%' };
      }
      const scale = interpolate(p, [0, 1], [1.06, 1]);
      return {
        width: '100%',
        height: '100%',
        willChange: 'transform',
        transformOrigin: '50% 50%',
        transform: `scale(${scale.toFixed(5)})`,
      };
    }

    if (isUntouched) {
      return { width: '100%', height: '100%' };
    }

    const exitScale = interpolate(p, [0, 1], [1, 0.94]);
    return {
      width: '100%',
      height: '100%',
      willChange: 'transform',
      transformOrigin: '50% 50%',
      transform: `scale(${exitScale.toFixed(5)})`,
    };
  }, [isEntering, isSettled, isUntouched, p]);

  const bladeOpacity = isDecorVisible
    ? interpolate(p, [0, 0.08, 0.86, 1], [0, 1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const exitDimOpacity =
    !isEntering && !isUntouched
      ? interpolate(p, [0, 1], [0, 0.25], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  return (
    <AbsoluteFill showInTimeline={false} style={outerStyle}>
      <AbsoluteFill showInTimeline={false} style={clipStyle}>
        <AbsoluteFill showInTimeline={false} style={innerStyle}>
          {children}
        </AbsoluteFill>
      </AbsoluteFill>

      {!isEntering && exitDimOpacity > 0.001 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
            opacity: exitDimOpacity,
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {isDecorVisible && bladeOpacity > 0.005 ? (
        <>
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${(50 - span).toFixed(3)}%`,
              width: 4,
              transform: 'translate3d(-50%, 0px, 0px)',
              display: 'flex',
              opacity: bladeOpacity,
              boxShadow: '0 0 20px rgba(46, 58, 47, 0.24)',
              pointerEvents: 'none',
            }}
          >
            <div style={{ width: 3, height: '100%', backgroundColor: accentColor }} />
            <div style={{ width: 1, height: '100%', backgroundColor: secondaryColor }} />
          </div>
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${(50 + span).toFixed(3)}%`,
              width: 4,
              transform: 'translate3d(-50%, 0px, 0px)',
              display: 'flex',
              opacity: bladeOpacity,
              boxShadow: '0 0 20px rgba(46, 58, 47, 0.24)',
              pointerEvents: 'none',
            }}
          >
            <div style={{ width: 1, height: '100%', backgroundColor: secondaryColor }} />
            <div style={{ width: 3, height: '100%', backgroundColor: accentColor }} />
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Center-outward editorial split curtain reveal with twin vertical hairline
 * accent blades tracking the expanding clip seam over a softly receding exit.
 */
export const editorialSplitCurtain = (
  props: EditorialSplitCurtainProps = {},
): TransitionPresentation<EditorialSplitCurtainProps> => {
  return {
    component: EditorialSplitCurtainPresentation,
    props: {
      accentColor: props.accentColor ?? LAUNCH_PALETTE.ACCENT,
      secondaryColor: props.secondaryColor ?? LAUNCH_PALETTE.PRIMARY,
    },
  };
};

export type DepthLiftMatchProps = {
  readonly borderColor?: string;
  readonly maxRadius?: number;
};

const DepthLiftMatchPresentation: React.FC<
  TransitionPresentationComponentProps<DepthLiftMatchProps>
> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps: {
    borderColor = LAUNCH_PALETTE.TERTIARY,
    maxRadius = 48,
  },
}) => {
  const p = clampUnit(presentationProgress);
  const isEntering = presentationDirection === 'entering';
  const isSettled = isEntering && p >= 0.9999;
  const isUntouched = !isEntering && p <= 0.0001;
  const isDecorVisible = isEntering && p > 0.0005 && p < 0.9995;

  const cardStyle = useMemo<React.CSSProperties>(() => {
    if (isEntering) {
      if (isSettled) {
        return { width: '100%', height: '100%' };
      }
      const translateY = interpolate(p, [0, 1], [100, 0]);
      const scale = interpolate(p, [0, 1], [0.96, 1]);
      const radius = interpolate(p, [0, 0.85, 1], [maxRadius, maxRadius * 0.35, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      const shadowOpacity = interpolate(p, [0, 0.08, 0.88, 1], [0, 0.28, 0.28, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });

      return {
        width: '100%',
        height: '100%',
        zIndex: 2,
        overflow: 'hidden',
        transformOrigin: '50% 0%',
        willChange: 'transform',
        transform: `translate3d(0px, ${translateY.toFixed(3)}%, 0px) scale(${scale.toFixed(5)})`,
        borderRadius: radius > 0.1 ? `${radius.toFixed(2)}px` : undefined,
        boxShadow:
          shadowOpacity > 0.005
            ? `0px -28px 68px rgba(31, 39, 32, ${shadowOpacity.toFixed(3)})`
            : undefined,
      };
    }

    if (isUntouched) {
      return { width: '100%', height: '100%' };
    }

    const exitY = interpolate(p, [0, 1], [0, -16]);
    const exitScale = interpolate(p, [0, 1], [1, 0.93]);
    return {
      width: '100%',
      height: '100%',
      zIndex: 1,
      willChange: 'transform',
      transformOrigin: '50% 50%',
      transform: `translate3d(0px, ${exitY.toFixed(3)}%, 0px) scale(${exitScale.toFixed(5)})`,
    };
  }, [isEntering, isSettled, isUntouched, maxRadius, p]);

  const topEdgeOpacity = isDecorVisible
    ? interpolate(p, [0, 0.08, 0.86, 1], [0, 0.95, 0.85, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const exitDimOpacity =
    !isEntering && !isUntouched
      ? interpolate(p, [0, 1], [0, 0.26], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  return (
    <AbsoluteFill showInTimeline={false} style={cardStyle}>
      {children}

      {!isEntering && exitDimOpacity > 0.001 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
            opacity: exitDimOpacity,
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {isDecorVisible && topEdgeOpacity > 0.005 ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: borderColor,
            opacity: topEdgeOpacity,
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Physical architectural card rising cleanly from bottom (`translateY 100% -> 0%`,
 * `borderRadius 48px -> 0px`, `scale 0.96 -> 1`, warm sand `#D9C9B2` bevel)
 * while the outgoing frame glides gently upward and recedes.
 */
export const depthLiftMatch = (
  props: DepthLiftMatchProps = {},
): TransitionPresentation<DepthLiftMatchProps> => {
  return {
    component: DepthLiftMatchPresentation,
    props: {
      borderColor: props.borderColor ?? LAUNCH_PALETTE.TERTIARY,
      maxRadius: props.maxRadius ?? 48,
    },
  };
};

export type OrbitalIrisMatchProps = {
  readonly ringColor?: string;
  readonly accentRingColor?: string;
};

const OrbitalIrisMatchPresentation: React.FC<
  TransitionPresentationComponentProps<OrbitalIrisMatchProps>
> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps: {
    ringColor = LAUNCH_PALETTE.ACCENT,
    accentRingColor = LAUNCH_PALETTE.TERTIARY,
  },
}) => {
  const { width, height } = useVideoConfig();
  const safeWidth = Math.max(1, Math.round(Number.isFinite(width) ? width : 1920));
  const safeHeight = Math.max(1, Math.round(Number.isFinite(height) ? height : 1080));

  const p = clampUnit(presentationProgress);
  const isEntering = presentationDirection === 'entering';
  const isSettled = isEntering && p >= 0.9999;
  const isUntouched = !isEntering && p <= 0.0001;
  const isDecorVisible = isEntering && p > 0.0005 && p < 0.9995;

  const radiusPercent = interpolate(p, [0, 1], [0, 82]);
  const refLength = Math.hypot(safeWidth, safeHeight) / Math.SQRT2;
  const ringRadiusPx = (radiusPercent / 100) * refLength;

  const ringOpacity = isDecorVisible
    ? interpolate(radiusPercent, [0, 4, 72, 82], [0, 0.95, 0.9, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  const outerStyle = useMemo<React.CSSProperties>(() => {
    if (isEntering) {
      return isSettled
        ? { width: '100%', height: '100%' }
        : { width: '100%', height: '100%', zIndex: 2 };
    }
    if (isUntouched) {
      return { width: '100%', height: '100%' };
    }
    return {
      width: '100%',
      height: '100%',
      zIndex: 1,
      overflow: 'hidden',
      backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
    };
  }, [isEntering, isSettled, isUntouched]);

  const clipStyle = useMemo<React.CSSProperties>(() => {
    if (!isEntering || isSettled) {
      return { width: '100%', height: '100%' };
    }
    return {
      width: '100%',
      height: '100%',
      clipPath: `circle(${radiusPercent.toFixed(3)}% at 50% 50%)`,
    };
  }, [isEntering, isSettled, radiusPercent]);

  const innerStyle = useMemo<React.CSSProperties>(() => {
    if (isEntering) {
      if (isSettled) {
        return { width: '100%', height: '100%' };
      }
      const scale = interpolate(p, [0, 1], [1.08, 1]);
      return {
        width: '100%',
        height: '100%',
        willChange: 'transform',
        transformOrigin: '50% 50%',
        transform: `scale(${scale.toFixed(5)})`,
      };
    }

    if (isUntouched) {
      return { width: '100%', height: '100%' };
    }

    const exitScale = interpolate(p, [0, 1], [1, 0.96]);
    return {
      width: '100%',
      height: '100%',
      willChange: 'transform',
      transformOrigin: '50% 50%',
      transform: `scale(${exitScale.toFixed(5)})`,
    };
  }, [isEntering, isSettled, isUntouched, p]);

  const exitDimOpacity =
    !isEntering && !isUntouched
      ? interpolate(p, [0, 1], [0, 0.22], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  return (
    <AbsoluteFill showInTimeline={false} style={outerStyle}>
      <AbsoluteFill showInTimeline={false} style={clipStyle}>
        <AbsoluteFill showInTimeline={false} style={innerStyle}>
          {children}
        </AbsoluteFill>
      </AbsoluteFill>

      {!isEntering && exitDimOpacity > 0.001 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
            opacity: exitDimOpacity,
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {isDecorVisible && ringOpacity > 0.005 && ringRadiusPx > 1 ? (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${safeWidth} ${safeHeight}`}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <circle
            cx={safeWidth / 2}
            cy={safeHeight / 2}
            r={ringRadiusPx + 12}
            fill="none"
            stroke={accentRingColor}
            strokeWidth={1.2}
            strokeDasharray="6 8"
            opacity={ringOpacity * 0.45}
          />
          <circle
            cx={safeWidth / 2}
            cy={safeHeight / 2}
            r={ringRadiusPx}
            fill="none"
            stroke={ringColor}
            strokeWidth={2.5}
            opacity={ringOpacity}
          />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Circular iris reveal (`clipPath: circle(0%..82% at 50% 50%)`) with inner
 * zoom settle (`scale 1.08 -> 1.0`) and a crisp SVG terracotta perimeter ring
 * that dissolves smoothly past 72% radius.
 */
export const orbitalIrisMatch = (
  props: OrbitalIrisMatchProps = {},
): TransitionPresentation<OrbitalIrisMatchProps> => {
  return {
    component: OrbitalIrisMatchPresentation,
    props: {
      ringColor: props.ringColor ?? LAUNCH_PALETTE.ACCENT,
      accentRingColor: props.accentRingColor ?? LAUNCH_PALETTE.TERTIARY,
    },
  };
};

export type EditorialShutterOverlayProps = {
  readonly chapterCode?: string;
  readonly chapterLabel?: string;
};

const SHUTTER_BLADE_BASE_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: '-10%',
  left: '-16%',
  width: '132%',
  height: '120%',
  willChange: 'transform',
  transformOrigin: '50% 50%',
  pointerEvents: 'none',
};

/**
 * 48-frame (0.8s @ 60fps) architectural shutter overlay featuring 3 staggered
 * diagonal blades (`#C96F4F`, `#6B7F5B`, `#2E3A2F`) sweeping across 1920x1080
 * with an expo in-out curve and a crisp masked chapter flash at peak cover.
 */
export const EditorialShutterOverlay: React.FC<EditorialShutterOverlayProps> = ({
  chapterCode = '03',
  chapterLabel = 'POLYMART',
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const totalSpan = Math.max(1, durationInFrames - 1);
  // Normalize to the canonical 48-frame (0..47) shutter choreography
  const u = (frame / totalSpan) * 47;

  const bladeProgress = (inStart: number, inEnd: number, outStart: number, outEnd: number): number => {
    if (u <= inEnd) {
      return interpolate(u, [inStart, inEnd], [-100, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: EXPO_IN_OUT,
      });
    }
    if (u < outStart) return 0;
    return interpolate(u, [outStart, outEnd], [0, 100], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_IN_OUT,
    });
  };

  // Lead Terracotta -> Mid Sage -> Primary Deep Forest (reverse exit order)
  const terracottaX = bladeProgress(0, 13, 35, 47);
  const sageX = bladeProgress(1.5, 14.5, 33.5, 45.5);
  const forestX = bladeProgress(3, 16, 32, 44);

  // Typography masked flash strictly inside peak cover (frames 16..32)
  const labelVisible = u >= 15.5 && u <= 32.5;
  const enterProgress = interpolate(u, [16, 21.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const exitProgress = interpolate(u, [27, 32], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: CUBIC_IN_OUT,
  });

  const textTranslateY =
    u < 24
      ? interpolate(enterProgress, [0, 1], [108, 0])
      : interpolate(exitProgress, [0, 1], [0, -108]);
  const textOpacity =
    u < 24
      ? interpolate(enterProgress, [0, 0.3, 1], [0, 1, 1])
      : interpolate(exitProgress, [0, 0.72, 1], [1, 1, 0]);
  const accentRuleScaleX =
    u < 24
      ? interpolate(enterProgress, [0, 1], [0, 1])
      : interpolate(exitProgress, [0, 1], [1, 0]);

  return (
    <AbsoluteFill
      showInTimeline={false}
      style={{ overflow: 'hidden', pointerEvents: 'none' }}
    >
      <div
        style={{
          ...SHUTTER_BLADE_BASE_STYLE,
          backgroundColor: LAUNCH_PALETTE.ACCENT,
          transform: `translate3d(${terracottaX.toFixed(3)}%, 0px, 0px) skewX(-16deg)`,
        }}
      />

      <div
        style={{
          ...SHUTTER_BLADE_BASE_STYLE,
          backgroundColor: LAUNCH_PALETTE.SECONDARY,
          transform: `translate3d(${sageX.toFixed(3)}%, 0px, 0px) skewX(-16deg)`,
        }}
      />

      <div
        style={{
          ...SHUTTER_BLADE_BASE_STYLE,
          backgroundColor: LAUNCH_PALETTE.PRIMARY,
          transform: `translate3d(${forestX.toFixed(3)}%, 0px, 0px) skewX(-16deg)`,
        }}
      />

      {labelVisible ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 72,
              height: 3,
              marginBottom: 20,
              backgroundColor: LAUNCH_PALETTE.ACCENT,
              transform: `scaleX(${accentRuleScaleX.toFixed(4)})`,
              opacity: textOpacity,
            }}
          />

          <div style={{ overflow: 'hidden', padding: '6px 16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                willChange: 'transform, opacity',
                opacity: textOpacity,
                transform: `translate3d(0px, ${textTranslateY.toFixed(2)}%, 0px)`,
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: LAUNCH_PALETTE.BACKGROUND,
              }}
            >
              <span style={{ color: LAUNCH_PALETTE.ACCENT }}>BAB {chapterCode}</span>
              <span style={{ color: LAUNCH_PALETTE.TERTIARY, fontWeight: 400 }}>—</span>
              <span>{chapterLabel}</span>
            </div>
          </div>

          <div style={{ overflow: 'hidden', marginTop: 14 }}>
            <div
              style={{
                opacity: textOpacity * 0.72,
                transform: `translate3d(0px, ${(textTranslateY * 0.85).toFixed(2)}%, 0px)`,
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 13,
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
                color: LAUNCH_PALETTE.TERTIARY,
              }}
            >
              POLISAS • EKOSISTEM DIGITAL SISWA
            </div>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export type WarmLightSweepOverlayProps = {
  readonly seed?: number;
  readonly hueShift?: number;
};

/**
 * 48-frame (0.8s @ 60fps) warm terracotta/porcelain light sweep overlay combining
 * GPU WebGL2 `lightLeak()` on `<Solid premountFor={fps}>` with an angled warm
 * sheen sweeping diagonally across the cut into dark forest scenes.
 */
export const WarmLightSweepOverlay: React.FC<WarmLightSweepOverlayProps> = ({
  seed = 4,
  hueShift = 18,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();

  const safeWidth = Math.max(1, Math.round(Number.isFinite(width) ? width : 1920));
  const safeHeight = Math.max(1, Math.round(Number.isFinite(height) ? height : 1080));
  const safeSeed = Number.isFinite(seed) ? seed : 4;
  const safeHueShift = Number.isFinite(hueShift) ? Math.min(360, Math.max(0, hueShift)) : 18;

  const progress = clampUnit(
    interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  const leakOpacity = interpolate(progress, [0, 0.14, 0.86, 1], [0, 0.92, 0.92, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const beamProgress = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: CUBIC_IN_OUT,
  });
  const beamX = interpolate(beamProgress, [0, 1], [-115, 115]);
  const beamOpacity = interpolate(progress, [0, 0.25, 0.5, 0.78, 1], [0, 0.72, 0.92, 0.68, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const warmBridgeOpacity = interpolate(progress, [0, 0.42, 0.52, 1], [0, 0.28, 0.28, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      showInTimeline={false}
      style={{ overflow: 'hidden', pointerEvents: 'none' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: warmBridgeOpacity,
          background:
            'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(201, 111, 79, 0.55) 0%, rgba(248, 246, 238, 0.28) 45%, rgba(46, 58, 47, 0) 100%)',
          pointerEvents: 'none',
        }}
      />

      <Solid
        width={safeWidth}
        height={safeHeight}
        premountFor={fps}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: leakOpacity,
          pointerEvents: 'none',
        }}
        effects={[
          lightLeak({
            seed: safeSeed,
            hueShift: safeHueShift,
            progress,
          }),
        ]}
      />

      <div
        style={{
          position: 'absolute',
          top: '-15%',
          bottom: '-15%',
          left: '15%',
          width: '70%',
          opacity: beamOpacity,
          willChange: 'transform, opacity',
          transform: `translate3d(${beamX.toFixed(3)}%, 0px, 0px) skewX(-18deg)`,
          background:
            'linear-gradient(90deg, rgba(201, 111, 79, 0) 0%, rgba(201, 111, 79, 0.26) 26%, rgba(217, 201, 178, 0.42) 42%, rgba(248, 246, 238, 0.72) 50%, rgba(217, 201, 178, 0.36) 58%, rgba(201, 111, 79, 0.18) 76%, rgba(201, 111, 79, 0) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
