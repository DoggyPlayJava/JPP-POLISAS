import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Easing,
  Solid,
  interpolate,
  interpolateColors,
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

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const CUBIC_IN_OUT = Easing.inOut(Easing.cubic);

/**
 * After Effects Speed-Graph S-Curve easing: zero boundary slope at t=0 and t=1
 * with a crisp high-velocity whip peak centered cleanly at t=0.5.
 */
export const WHIP_S_CURVE = Easing.bezier(0.83, 0, 0.17, 1);

const WHIP_VELOCITY_EPS = 0.005;

const rawWhipSlope = (p: number): number => {
  const lo = Math.max(0, p - WHIP_VELOCITY_EPS);
  const hi = Math.min(1, p + WHIP_VELOCITY_EPS);
  const span = hi - lo;
  if (span <= 0) return 0;
  return (WHIP_S_CURVE(hi) - WHIP_S_CURVE(lo)) / span;
};

const WHIP_PEAK_SLOPE = Math.max(1e-6, rawWhipSlope(0.5));

/**
 * Computes exact finite-difference normalized instantaneous speed of `WHIP_S_CURVE`
 * in `[0, 1]`, peaking at `1` when `p = 0.5` and settling strictly to `0` at boundaries.
 */
export const computeWhipVelocity = (p: number): number => {
  const clamped = clampUnit(p);
  if (clamped <= 0.001 || clamped >= 0.999) return 0;
  return clampUnit(rawWhipSlope(clamped) / WHIP_PEAK_SLOPE);
};

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
  const s = WHIP_S_CURVE(p);
  const v = computeWhipVelocity(p);
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
      const translateX = interpolate(s, [0, 1], [100 * sign, 0]);
      const shadowOpacity = clampUnit(v * 0.34);
      const shadowX = (direction === 'from-right' ? -1 : 1) * (18 + 30 * v);
      const shadowBlur = 32 + 64 * v;
      const shadowSpread = 4 + 22 * v;
      return {
        width: '100%',
        height: '100%',
        zIndex: 2,
        willChange: 'transform',
        transform: `translate3d(${translateX.toFixed(3)}%, 0px, 0px)`,
        boxShadow:
          shadowOpacity > 0.002
            ? `${shadowX.toFixed(1)}px 0px ${shadowBlur.toFixed(1)}px ${shadowSpread.toFixed(1)}px rgba(31, 39, 32, ${shadowOpacity.toFixed(3)})`
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
  }, [direction, isEntering, isSettled, isUntouched, s, sign, v]);

  const innerStyle = useMemo<React.CSSProperties>(() => {
    if (isEntering) {
      if (isSettled) {
        return { width: '100%', height: '100%' };
      }
      const settleScale = interpolate(s, [0, 1], [1.07, 1]);
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

    const exitX = interpolate(s, [0, 1], [0, -26 * sign]);
    const exitScale = interpolate(s, [0, 1], [1, 0.89]);
    const exitRotateY = interpolate(s, [0, 1], [0, -7.5 * sign]);
    return {
      width: '100%',
      height: '100%',
      transformStyle: 'preserve-3d',
      willChange: 'transform',
      transformOrigin: '50% 50%',
      transform: `translate3d(${exitX.toFixed(3)}%, 0px, 0px) scale(${exitScale.toFixed(5)}) rotateY(${exitRotateY.toFixed(3)}deg)`,
    };
  }, [isEntering, isSettled, isUntouched, s, sign]);

  const edgeEnvelope = isDecorVisible
    ? interpolate(p, [0, 0.06, 0.94, 1], [0, 1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const edgeOpacity = edgeEnvelope * (0.45 + 0.55 * v);
  const streakVisible = isDecorVisible && v > 0.002;
  const streakDirection = direction === 'from-right' ? 'to right' : 'to left';

  const bandTerracottaWidth = 16 + 22 * v;
  const bandSandWidth = 16 + 30 * v;
  const bandForestWidth = 16 + 38 * v;

  const exitDimOpacity =
    !isEntering && !isUntouched
      ? interpolate(s, [0, 1], [0, 0.3], {
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

      {streakVisible ? (
        <>
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              ...(direction === 'from-right'
                ? { left: Math.round(24 + 28 * v) }
                : { right: Math.round(24 + 28 * v) }),
              width: bandForestWidth,
              opacity: clampUnit(v * 0.34),
              background: `linear-gradient(${streakDirection}, rgba(46, 58, 47, 0.55) 0%, rgba(46, 58, 47, 0) 100%)`,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              ...(direction === 'from-right'
                ? { left: Math.round(12 + 16 * v) }
                : { right: Math.round(12 + 16 * v) }),
              width: bandSandWidth,
              opacity: clampUnit(v * 0.48),
              background: `linear-gradient(${streakDirection}, rgba(217, 201, 178, 0.68) 0%, rgba(217, 201, 178, 0) 100%)`,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              ...(direction === 'from-right' ? { left: 6 } : { right: 6 }),
              width: bandTerracottaWidth,
              opacity: clampUnit(v * 0.62),
              background: `linear-gradient(${streakDirection}, rgba(201, 111, 79, 0.72) 0%, rgba(201, 111, 79, 0) 100%)`,
              pointerEvents: 'none',
            }}
          />
        </>
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
 * Speed-graph 3D architectural camera whip: outgoing scene recedes in 1800px perspective
 * (`translateX`, `scale`, `rotateY`, dim) while incoming sweeps across `WHIP_S_CURVE`
 * with velocity-coupled directional motion streaks and elevation shadow spread.
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
  const s = WHIP_S_CURVE(p);
  const v = computeWhipVelocity(p);
  const sLead = WHIP_S_CURVE(clampUnit(p * 1.12));

  const isEntering = presentationDirection === 'entering';
  const isSettled = isEntering && p >= 0.9999;
  const isUntouched = !isEntering && p <= 0.0001;
  const isDecorVisible = isEntering && p > 0.0005 && p < 0.9995;

  const half = interpolate(s, [0, 1], [50, 0]);
  const span = 50 - half;
  const spanLead = 50 * sLead;

  const outerStyle = useMemo<React.CSSProperties>(() => {
    if (isEntering) {
      return isSettled
        ? { width: '100%', height: '100%' }
        : { width: '100%', height: '100%', zIndex: 2, overflow: 'hidden' };
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
      const scale = interpolate(s, [0, 1], [1.07, 1]);
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

    const exitScale = interpolate(s, [0, 1], [1, 0.93]);
    return {
      width: '100%',
      height: '100%',
      willChange: 'transform',
      transformOrigin: '50% 50%',
      transform: `scale(${exitScale.toFixed(5)})`,
    };
  }, [isEntering, isSettled, isUntouched, s]);

  const bladeOpacity = isDecorVisible
    ? interpolate(p, [0, 0.06, 0.9, 1], [0, 1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const echoOpacity = isDecorVisible ? clampUnit(v * 0.9) : 0;
  const echoRibbonWidth = Math.round(12 + 16 * v);

  const exitDimOpacity =
    !isEntering && !isUntouched
      ? interpolate(s, [0, 1], [0, 0.28], {
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

      {isDecorVisible && echoOpacity > 0.005 ? (
        <>
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${(50 - spanLead).toFixed(3)}%`,
              width: echoRibbonWidth + 2,
              transform: 'translate3d(-50%, 0px, 0px)',
              display: 'flex',
              opacity: echoOpacity,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: 2,
                height: '100%',
                backgroundColor: LAUNCH_PALETTE.SECONDARY,
              }}
            />
            <div
              style={{
                width: echoRibbonWidth,
                height: '100%',
                backgroundColor: LAUNCH_PALETTE.TERTIARY,
                opacity: 0.78,
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${(50 + spanLead).toFixed(3)}%`,
              width: echoRibbonWidth + 2,
              transform: 'translate3d(-50%, 0px, 0px)',
              display: 'flex',
              opacity: echoOpacity,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: echoRibbonWidth,
                height: '100%',
                backgroundColor: LAUNCH_PALETTE.TERTIARY,
                opacity: 0.78,
              }}
            />
            <div
              style={{
                width: 2,
                height: '100%',
                backgroundColor: LAUNCH_PALETTE.SECONDARY,
              }}
            />
          </div>
        </>
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
              boxShadow: `0 0 ${(16 + 32 * v).toFixed(1)}px rgba(46, 58, 47, ${(0.22 + 0.18 * v).toFixed(3)})`,
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
              boxShadow: `0 0 ${(16 + 32 * v).toFixed(1)}px rgba(46, 58, 47, ${(0.22 + 0.18 * v).toFixed(3)})`,
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
 * Center-outward editorial split curtain reveal with twin primary blades tracking
 * the expanding clip seam and velocity-coupled Warm Sand / Sage echo matte ribbons.
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

export type SwissLouversWipeProps = {
  readonly slatCount?: number;
  readonly angleDeg?: number;
};

const LOUVER_PALETTE = [
  LAUNCH_PALETTE.ACCENT,
  LAUNCH_PALETTE.TERTIARY,
  LAUNCH_PALETTE.SECONDARY,
  LAUNCH_PALETTE.PRIMARY,
  LAUNCH_PALETTE.SURFACE_MUTED,
] as const;

const SwissLouversWipePresentation: React.FC<
  TransitionPresentationComponentProps<SwissLouversWipeProps>
> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps: { slatCount = 5, angleDeg = 14 },
}) => {
  const { width, height } = useVideoConfig();
  const safeWidth = Math.max(1, Number.isFinite(width) ? width : 1920);
  const safeHeight = Math.max(1, Number.isFinite(height) ? height : 1080);
  const safeSlatCount = Math.max(1, Math.min(12, Math.round(Number.isFinite(slatCount) ? slatCount : 5)));
  const safeAngle = Number.isFinite(angleDeg) ? Math.min(45, Math.max(-45, angleDeg)) : 14;

  const p = clampUnit(presentationProgress);
  const s = WHIP_S_CURVE(p);
  const v = computeWhipVelocity(p);

  const isEntering = presentationDirection === 'entering';
  const isSettled = isEntering && p >= 0.9999;
  const isUntouched = !isEntering && p <= 0.0001;
  const isDecorVisible = isEntering && p > 0.005 && p < 0.995;

  const halfSkewPct =
    0.5 * (safeHeight / safeWidth) * Math.tan((safeAngle * Math.PI) / 180) * 100;
  const sweepMargin = Math.max(18, Math.ceil(Math.abs(halfSkewPct)) + 6);
  const edgeCenter = interpolate(s, [0, 1], [-sweepMargin, 100 + sweepMargin]);
  const topX = edgeCenter + halfSkewPct;
  const bottomX = edgeCenter - halfSkewPct;
  const leftAnchor = -(sweepMargin + Math.abs(halfSkewPct) + 6);

  const outerStyle = useMemo<React.CSSProperties>(() => {
    if (isEntering) {
      return isSettled
        ? { width: '100%', height: '100%' }
        : { width: '100%', height: '100%', zIndex: 2, overflow: 'hidden' };
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
    if (p <= 0.0001) {
      return {
        width: '100%',
        height: '100%',
        clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
      };
    }
    return {
      width: '100%',
      height: '100%',
      clipPath: `polygon(${leftAnchor.toFixed(2)}% 0%, ${topX.toFixed(3)}% 0%, ${bottomX.toFixed(3)}% 100%, ${leftAnchor.toFixed(2)}% 100%)`,
    };
  }, [bottomX, isEntering, isSettled, leftAnchor, p, topX]);

  const innerStyle = useMemo<React.CSSProperties>(() => {
    if (isEntering) {
      if (isSettled) {
        return { width: '100%', height: '100%' };
      }
      const scale = interpolate(s, [0, 1], [1.055, 1]);
      const translateX = interpolate(s, [0, 1], [-2.5, 0]);
      return {
        width: '100%',
        height: '100%',
        willChange: 'transform',
        transformOrigin: '50% 50%',
        transform: `translate3d(${translateX.toFixed(3)}%, 0px, 0px) scale(${scale.toFixed(5)})`,
      };
    }

    if (isUntouched) {
      return { width: '100%', height: '100%' };
    }

    const exitX = interpolate(s, [0, 1], [0, 4]);
    const exitScale = interpolate(s, [0, 1], [1, 0.94]);
    return {
      width: '100%',
      height: '100%',
      willChange: 'transform',
      transformOrigin: '50% 50%',
      transform: `translate3d(${exitX.toFixed(3)}%, 0px, 0px) scale(${exitScale.toFixed(5)})`,
    };
  }, [isEntering, isSettled, isUntouched, s]);

  const exitDimOpacity =
    !isEntering && !isUntouched
      ? interpolate(s, [0, 1], [0, 0.26], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  const bladeBoundaryFade = isDecorVisible
    ? interpolate(p, [0.005, 0.06, 0.94, 0.995], [0, 1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  const staggerStep = safeSlatCount > 1 ? Math.min(0.032, 0.45 / (safeSlatCount - 1)) : 0;
  const bladeDenom = Math.max(0.1, 1 - (safeSlatCount - 1) * staggerStep);
  const bladeWidthPx = 22 + 42 * v;

  const blades = isDecorVisible && bladeBoundaryFade > 0.002
    ? Array.from({ length: safeSlatCount }, (_, i) => {
        const pBlade = clampUnit((p - i * staggerStep) / bladeDenom);
        const sBlade = WHIP_S_CURVE(pBlade);
        const vBlade = computeWhipVelocity(pBlade);
        const bladeLeftPct = interpolate(sBlade, [0, 1], [-sweepMargin, 100 + sweepMargin]);
        const bladeOpacity = bladeBoundaryFade * clampUnit(0.32 + 0.64 * Math.max(v, vBlade));
        const bladeColor = LOUVER_PALETTE[i % LOUVER_PALETTE.length];
        return {
          key: i,
          leftPct: bladeLeftPct,
          opacity: bladeOpacity,
          color: bladeColor,
        };
      })
    : [];

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

      {blades.map((blade) => (
        <div
          key={blade.key}
          style={{
            position: 'absolute',
            top: '-12%',
            height: '124%',
            left: `${blade.leftPct.toFixed(3)}%`,
            width: bladeWidthPx,
            backgroundColor: blade.color,
            opacity: blade.opacity,
            transformOrigin: '50% 50%',
            willChange: 'transform, opacity',
            transform: `translate3d(-50%, 0px, 0px) skewX(${(-safeAngle).toFixed(2)}deg)`,
            boxShadow: '0 0 24px rgba(31, 39, 32, 0.22)',
            pointerEvents: 'none',
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/**
 * Swiss architectural diagonal louver shutter wipe: 5 staggered skewed strips in
 * Earthy Minimal tones glide across an angled polygon clip seam driven by `WHIP_S_CURVE`.
 */
export const swissLouversWipe = (
  props: SwissLouversWipeProps = {},
): TransitionPresentation<SwissLouversWipeProps> => {
  return {
    component: SwissLouversWipePresentation,
    props: {
      slatCount: props.slatCount ?? 5,
      angleDeg: props.angleDeg ?? 14,
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
    maxRadius = 52,
  },
}) => {
  const p = clampUnit(presentationProgress);
  const s = WHIP_S_CURVE(p);
  const v = computeWhipVelocity(p);

  const isEntering = presentationDirection === 'entering';
  const isSettled = isEntering && p >= 0.9999;
  const isUntouched = !isEntering && p <= 0.0001;
  const isDecorVisible = isEntering && p > 0.0005 && p < 0.9995;

  const outerStyle = useMemo<React.CSSProperties>(() => {
    if (isEntering) {
      return isSettled
        ? { width: '100%', height: '100%' }
        : {
            width: '100%',
            height: '100%',
            zIndex: 2,
            perspective: '1800px',
            perspectiveOrigin: '50% 50%',
          };
    }
    if (isUntouched) {
      return { width: '100%', height: '100%' };
    }
    return {
      width: '100%',
      height: '100%',
      zIndex: 1,
      overflow: 'hidden',
      perspective: '1800px',
      perspectiveOrigin: '50% 50%',
      backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
    };
  }, [isEntering, isSettled, isUntouched]);

  const cardStyle = useMemo<React.CSSProperties>(() => {
    if (isEntering) {
      if (isSettled) {
        return { width: '100%', height: '100%' };
      }
      const translateY = interpolate(s, [0, 1], [100, 0]);
      const scale = interpolate(s, [0, 1], [0.95, 1]);
      const rotateX = interpolate(s, [0, 1], [7, 0]);
      const radius = interpolate(s, [0, 0.85, 1], [maxRadius, maxRadius * 0.35, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      const shadowEnvelope = interpolate(p, [0, 0.08, 0.88, 1], [0, 0.22, 0.22, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      const shadowOpacity = clampUnit(shadowEnvelope + v * 0.16);

      return {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        transformOrigin: '50% 0%',
        willChange: 'transform',
        transform: `translate3d(0px, ${translateY.toFixed(3)}%, 0px) scale(${scale.toFixed(5)}) rotateX(${rotateX.toFixed(3)}deg)`,
        borderRadius: radius > 0.1 ? `${radius.toFixed(2)}px` : undefined,
        boxShadow:
          shadowOpacity > 0.005
            ? `0px -28px ${(56 + 32 * v).toFixed(1)}px rgba(31, 39, 32, ${shadowOpacity.toFixed(3)})`
            : undefined,
      };
    }

    if (isUntouched) {
      return { width: '100%', height: '100%' };
    }

    const exitY = interpolate(s, [0, 1], [0, -18]);
    const exitScale = interpolate(s, [0, 1], [1, 0.91]);
    const exitRotateX = interpolate(s, [0, 1], [0, -5]);
    return {
      width: '100%',
      height: '100%',
      willChange: 'transform',
      transformOrigin: '50% 50%',
      transform: `translate3d(0px, ${exitY.toFixed(3)}%, 0px) scale(${exitScale.toFixed(5)}) rotateX(${exitRotateX.toFixed(3)}deg)`,
    };
  }, [isEntering, isSettled, isUntouched, maxRadius, p, s, v]);

  const topEdgeOpacity = isDecorVisible
    ? interpolate(p, [0, 0.08, 0.86, 1], [0, 0.95, 0.85, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const topSheenOpacity = isDecorVisible ? clampUnit(v * 0.85) : 0;

  const exitDimOpacity =
    !isEntering && !isUntouched
      ? interpolate(s, [0, 1], [0, 0.28], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  return (
    <AbsoluteFill showInTimeline={false} style={outerStyle}>
      <AbsoluteFill showInTimeline={false} style={cardStyle}>
        {children}

        {topSheenOpacity > 0.002 ? (
          <div
            style={{
              position: 'absolute',
              top: 4,
              left: 0,
              right: 0,
              height: 112,
              opacity: topSheenOpacity,
              background:
                'linear-gradient(180deg, rgba(248, 246, 238, 0.44) 0%, rgba(217, 201, 178, 0.18) 42%, rgba(248, 246, 238, 0) 100%)',
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
              height: 4,
              display: 'flex',
              flexDirection: 'column',
              opacity: topEdgeOpacity,
              pointerEvents: 'none',
            }}
          >
            <div style={{ height: 2, width: '100%', backgroundColor: LAUNCH_PALETTE.ACCENT }} />
            <div style={{ height: 2, width: '100%', backgroundColor: borderColor }} />
          </div>
        ) : null}
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
    </AbsoluteFill>
  );
};

/**
 * Physical architectural sheet rising cleanly in 1800px perspective (`translateY 100% -> 0%`,
 * `scale 0.95 -> 1`, `rotateX 7deg -> 0deg`, `borderRadius 52px -> 0px`, double bevel +
 * velocity-coupled upward light sheen) while the outgoing scene tilts and glides up.
 */
export const depthLiftMatch = (
  props: DepthLiftMatchProps = {},
): TransitionPresentation<DepthLiftMatchProps> => {
  return {
    component: DepthLiftMatchPresentation,
    props: {
      borderColor: props.borderColor ?? LAUNCH_PALETTE.TERTIARY,
      maxRadius: props.maxRadius ?? 52,
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
  const s = WHIP_S_CURVE(p);
  const v = computeWhipVelocity(p);

  const isEntering = presentationDirection === 'entering';
  const isSettled = isEntering && p >= 0.9999;
  const isUntouched = !isEntering && p <= 0.0001;
  const isDecorVisible = isEntering && p > 0.0005 && p < 0.9995;

  const radiusPercent = interpolate(s, [0, 1], [0, 82]);
  const refLength = Math.hypot(safeWidth, safeHeight) / Math.SQRT2;
  const ringRadiusPx = (radiusPercent / 100) * refLength;
  const ringRotationDeg = interpolate(s, [0, 1], [0, 68]);

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
      const scale = interpolate(s, [0, 1], [1.09, 1]);
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

    const exitScale = interpolate(s, [0, 1], [1, 0.95]);
    return {
      width: '100%',
      height: '100%',
      willChange: 'transform',
      transformOrigin: '50% 50%',
      transform: `scale(${exitScale.toFixed(5)})`,
    };
  }, [isEntering, isSettled, isUntouched, s]);

  const exitDimOpacity =
    !isEntering && !isUntouched
      ? interpolate(s, [0, 1], [0, 0.24], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  const cx = safeWidth / 2;
  const cy = safeHeight / 2;

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
          {v > 0.005 ? (
            <circle
              cx={cx}
              cy={cy}
              r={ringRadiusPx + 28 + v * 16}
              fill="none"
              stroke={LAUNCH_PALETTE.SECONDARY}
              strokeWidth={1.2}
              opacity={ringOpacity * 0.42 * v}
            />
          ) : null}
          <circle
            cx={cx}
            cy={cy}
            r={ringRadiusPx + 14}
            fill="none"
            stroke={accentRingColor}
            strokeWidth={1.4}
            strokeDasharray="7 9"
            transform={`rotate(${ringRotationDeg.toFixed(3)} ${cx} ${cy})`}
            opacity={ringOpacity * 0.65}
          />
          <circle
            cx={cx}
            cy={cy}
            r={ringRadiusPx}
            fill="none"
            stroke={ringColor}
            strokeWidth={2.5 + v * 1.5}
            opacity={ringOpacity}
          />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Speed-graph circular iris reveal (`clipPath: circle(0%..82% at 50% 50%)`) with inner
 * zoom settle (`scale 1.09 -> 1.0`) and triple concentric orbital SVG rings.
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

export type PortalZoomMorphProps = {
  readonly originXPercent?: number;
  readonly originYPercent?: number;
  readonly accentColor?: string;
};

const PortalZoomMorphPresentation: React.FC<
  TransitionPresentationComponentProps<PortalZoomMorphProps>
> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps: {
    originXPercent = 56,
    originYPercent = 58,
    accentColor = LAUNCH_PALETTE.ACCENT,
  },
}) => {
  const { width, height } = useVideoConfig();
  const safeWidth = Math.max(1, Math.round(Number.isFinite(width) ? width : 1920));
  const safeHeight = Math.max(1, Math.round(Number.isFinite(height) ? height : 1080));
  const safeOriginX = Number.isFinite(originXPercent)
    ? Math.min(100, Math.max(0, originXPercent))
    : 56;
  const safeOriginY = Number.isFinite(originYPercent)
    ? Math.min(100, Math.max(0, originYPercent))
    : 58;

  const p = clampUnit(presentationProgress);
  const s = WHIP_S_CURVE(p);
  const v = computeWhipVelocity(p);

  const isEntering = presentationDirection === 'entering';
  const isSettled = isEntering && p >= 0.9999;
  const isUntouched = !isEntering && p <= 0.0001;
  const isDecorVisible = isEntering && p > 0.005 && p < 0.995;

  const originCss = `${safeOriginX}% ${safeOriginY}%`;
  const radiusPercent = interpolate(s, [0, 1], [0, 125]);
  const refLength = Math.hypot(safeWidth, safeHeight) / Math.SQRT2;
  const ringRadiusPx = (radiusPercent / 100) * refLength;
  const trailingRingRadiusPx = Math.max(
    0.5,
    ringRadiusPx - Math.min(ringRadiusPx * 0.42, 12 + v * 18),
  );

  const ringOpacity = isDecorVisible
    ? interpolate(p, [0.005, 0.07, 0.88, 0.995], [0, 0.96, 0.9, 0], {
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
      clipPath: `circle(${radiusPercent.toFixed(3)}% at ${originCss})`,
    };
  }, [isEntering, isSettled, originCss, radiusPercent]);

  const innerStyle = useMemo<React.CSSProperties>(() => {
    if (isEntering) {
      if (isSettled) {
        return { width: '100%', height: '100%' };
      }
      const enterScale = interpolate(s, [0, 1], [1.14, 1]);
      return {
        width: '100%',
        height: '100%',
        willChange: 'transform',
        transformOrigin: originCss,
        transform: `scale(${enterScale.toFixed(5)})`,
      };
    }

    if (isUntouched) {
      return { width: '100%', height: '100%' };
    }

    const exitScale = interpolate(s, [0, 1], [1, 2.35]);
    const exitOpacity = interpolate(s, [0.35, 0.85], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return {
      width: '100%',
      height: '100%',
      willChange: 'transform, opacity',
      transformOrigin: originCss,
      opacity: exitOpacity,
      transform: `scale(${exitScale.toFixed(5)})`,
    };
  }, [isEntering, isSettled, isUntouched, originCss, s]);

  const cx = (safeOriginX / 100) * safeWidth;
  const cy = (safeOriginY / 100) * safeHeight;

  return (
    <AbsoluteFill showInTimeline={false} style={outerStyle}>
      <AbsoluteFill showInTimeline={false} style={clipStyle}>
        <AbsoluteFill showInTimeline={false} style={innerStyle}>
          {children}
        </AbsoluteFill>
      </AbsoluteFill>

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
          {v > 0.005 && trailingRingRadiusPx > 1 ? (
            <circle
              cx={cx}
              cy={cy}
              r={trailingRingRadiusPx}
              fill="none"
              stroke={LAUNCH_PALETTE.TERTIARY}
              strokeWidth={1.6 + v * 1.4}
              strokeDasharray="8 8"
              opacity={ringOpacity * clampUnit(0.45 + 0.55 * v)}
            />
          ) : null}
          <circle
            cx={cx}
            cy={cy}
            r={ringRadiusPx}
            fill="none"
            stroke={accentColor}
            strokeWidth={2.8 + v * 1.8}
            opacity={ringOpacity}
          />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Portal zoom-morph cut where the outgoing scene zooms forward directly into the clicked
 * focal squircle while incoming expands out of the exact same `(originXPercent%, originYPercent%)`
 * coordinate via concentric SVG aperture rings.
 */
export const portalZoomMorph = (
  props: PortalZoomMorphProps = {},
): TransitionPresentation<PortalZoomMorphProps> => {
  return {
    component: PortalZoomMorphPresentation,
    props: {
      originXPercent: props.originXPercent ?? 56,
      originYPercent: props.originYPercent ?? 58,
      accentColor: props.accentColor ?? LAUNCH_PALETTE.ACCENT,
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
 * on `WHIP_S_CURVE` with a `3px` warm porcelain leading specular edge and masked chapter reveal.
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
        easing: WHIP_S_CURVE,
      });
    }
    if (u < outStart) return 0;
    return interpolate(u, [outStart, outEnd], [0, 100], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: WHIP_S_CURVE,
    });
  };

  // Lead Terracotta -> Mid Sage -> Primary Deep Forest (reverse exit order)
  const terracottaX = bladeProgress(0, 13, 35, 47);
  const sageX = bladeProgress(1.5, 14.5, 33.5, 45.5);
  const forestX = bladeProgress(3, 16, 32, 44);

  const forestSpecularIn = u < 24;
  const forestSpecularOpacity = interpolate(
    u,
    [3, 5.5, 14, 16.5, 31.5, 34, 41.5, 44],
    [0, 0.94, 0.94, 0, 0, 0.94, 0.94, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

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
      >
        {forestSpecularOpacity > 0.005 ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              ...(forestSpecularIn ? { right: 0 } : { left: 0 }),
              width: 3,
              backgroundColor: LAUNCH_PALETTE.BACKGROUND,
              opacity: forestSpecularOpacity,
              pointerEvents: 'none',
            }}
          />
        ) : null}
      </div>

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
              JPP POLISAS • EKOSISTEM DIGITAL MAHASISWA
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
 * 48-frame (0.8s @ 60fps) warm optical light-sweep bridge sealing the bright-to-dark
 * scene cut with a full-bleed `1.0`-opaque chromatic veil across `[0.40, 0.60]`
 * beneath GPU WebGL2 `lightLeak()` on `<Solid premountFor={fps}>` and a warm diagonal beam.
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

  // Full-bleed optical veil holds solid 1.0 opacity through [0.40, 0.60] to eliminate corner hard-cut cliffs
  let veilOpacity = 0;
  if (progress > 0.08 && progress < 0.4) {
    veilOpacity = interpolate(progress, [0.08, 0.4], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: WHIP_S_CURVE,
    });
  } else if (progress >= 0.4 && progress <= 0.6) {
    veilOpacity = 1;
  } else if (progress > 0.6 && progress < 0.92) {
    veilOpacity = interpolate(progress, [0.6, 0.92], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: WHIP_S_CURVE,
    });
  }

  const veilColor = interpolateColors(
    progress,
    [0.08, 0.23, 0.35, 0.66, 0.8],
    [
      LAUNCH_PALETTE.BACKGROUND,
      LAUNCH_PALETTE.SURFACE_MUTED,
      LAUNCH_PALETTE.TERTIARY,
      LAUNCH_PALETTE.MUTED_OLIVE,
      LAUNCH_PALETTE.PRIMARY,
    ],
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
  const warmBridgeOpacity = interpolate(progress, [0, 0.42, 0.52, 1], [0, 0.26, 0.26, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      showInTimeline={false}
      style={{ overflow: 'hidden', pointerEvents: 'none' }}
    >
      {veilOpacity > 0.001 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            backgroundColor: veilColor,
            opacity: veilOpacity,
            pointerEvents: 'none',
          }}
        />
      ) : null}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
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
          zIndex: 2,
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
            disabled: leakOpacity <= 0.001,
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
          zIndex: 3,
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
