import React, { useId, useMemo } from 'react';
import {
  Easing,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { evolvePath, getLength, getPointAtLength } from '@remotion/paths';
import { Circle, Star } from '@remotion/shapes';
import { LAUNCH_FONTS, LAUNCH_PALETTE, MOTION_CURVES } from '../tokens';

const CURSOR_MOVE_EASING = MOTION_CURVES.EASE_IN_OUT_STRONG;
const PATH_EVOLVE_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const SPARK_BURST_EASING = MOTION_CURVES.EASE_OUT_EXPO;

export type GhostCursorKeyframe = {
  readonly frame: number;
  readonly x: number;
  readonly y: number;
  readonly click?: boolean;
  readonly label?: string;
};

export type GhostCursorProps = {
  readonly keyframes: readonly GhostCursorKeyframe[];
  readonly appearFrame?: number;
  readonly disappearFrame?: number;
  readonly color?: string;
  readonly rippleColor?: string;
  readonly scale?: number;
  readonly showMotionDots?: boolean;
  readonly style?: React.CSSProperties;
};

type CursorSample = {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly label?: string;
};

const sampleCursorAtFrame = (
  sorted: readonly GhostCursorKeyframe[],
  targetFrame: number,
): CursorSample => {
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (targetFrame <= first.frame) {
    return { x: first.x, y: first.y, vx: 0, label: first.label };
  }
  if (targetFrame >= last.frame) {
    return { x: last.x, y: last.y, vx: 0, label: last.label };
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (targetFrame >= a.frame && targetFrame <= b.frame) {
      const span = Math.max(1, b.frame - a.frame);
      const t = interpolate(targetFrame, [a.frame, a.frame + span], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: CURSOR_MOVE_EASING,
      });
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      let arcOffsetX = 0;
      let arcOffsetY = 0;
      if (dist > 24) {
        const arcHeight = Math.min(18, (dist - 24) * 0.068);
        const nx = -dy / dist;
        const ny = dx / dist;
        const bowSign = ny <= 0 ? 1 : -1;
        const arcBell = 4 * t * (1 - t);
        arcOffsetX = nx * arcHeight * bowSign * arcBell;
        arcOffsetY = ny * arcHeight * bowSign * arcBell;
      }
      const x = a.x + dx * t + arcOffsetX;
      const y = a.y + dy * t + arcOffsetY;
      const vx = (dx / span) * (1 - Math.abs(t - 0.5) * 1.4);
      const label = t > 0.72 ? b.label ?? a.label : a.label;
      return { x, y, vx, label };
    }
  }

  return { x: last.x, y: last.y, vx: 0, label: last.label };
};

/**
 * Cubic-eased vector pointer with tactile press rebound, double expanding SVG click ripples,
 * and subtle frame-sampled velocity lean.
 */
export const GhostCursor: React.FC<GhostCursorProps> = ({
  keyframes,
  appearFrame,
  disappearFrame,
  color = LAUNCH_PALETTE.PRIMARY,
  rippleColor = LAUNCH_PALETTE.ACCENT,
  scale = 1,
  showMotionDots = true,
  style,
}) => {
  const uid = useId();
  const frame = useCurrentFrame();

  const sorted = useMemo(
    () => [...keyframes].sort((a, b) => a.frame - b.frame),
    [keyframes],
  );
  if (sorted.length === 0) return null;

  const entryFrame = appearFrame ?? sorted[0].frame;
  if (frame < entryFrame) return null;
  if (disappearFrame !== undefined && frame > disappearFrame + 12) return null;

  const enterOpacity = interpolate(frame, [entryFrame, entryFrame + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: MOTION_CURVES.EASE_OUT_UI,
  });
  const enterScale = interpolate(frame, [entryFrame, entryFrame + 10], [0.92, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: MOTION_CURVES.EASE_OUT_UI,
  });
  const exitOpacity =
    disappearFrame !== undefined
      ? interpolate(frame, [disappearFrame, disappearFrame + 10], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: MOTION_CURVES.EASE_EXIT_ACCEL,
        })
      : 1;
  const exitScale =
    disappearFrame !== undefined
      ? interpolate(frame, [disappearFrame, disappearFrame + 10], [1, 0.9], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: MOTION_CURVES.EASE_EXIT_ACCEL,
        })
      : 1;
  const opacity = enterOpacity * exitOpacity;
  if (opacity <= 0.001) return null;

  const current = sampleCursorAtFrame(sorted, frame);
  const trail1 = showMotionDots ? sampleCursorAtFrame(sorted, frame - 2) : null;
  const trail2 = showMotionDots ? sampleCursorAtFrame(sorted, frame - 4) : null;

  const leanDeg = Math.max(-5, Math.min(5, current.vx * 0.45));

  // Asymmetric tactile click press: fast EASE_OUT_UI compression -> crisp 1.05 overshoot rebound -> settle
  let clickScale = 1;
  for (const kf of sorted) {
    if (!kf.click) continue;
    if (frame >= kf.frame - 3 && frame <= kf.frame + 16) {
      let localScale = 1;
      if (frame <= kf.frame + 2) {
        localScale = interpolate(frame, [kf.frame - 3, kf.frame + 2], [1, 0.86], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: MOTION_CURVES.EASE_OUT_UI,
        });
      } else if (frame <= kf.frame + 9) {
        localScale = interpolate(frame, [kf.frame + 2, kf.frame + 9], [0.86, 1.05], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: MOTION_CURVES.EASE_OUT_UI,
        });
      } else {
        localScale = interpolate(frame, [kf.frame + 9, kf.frame + 16], [1.05, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: MOTION_CURVES.EASE_OUT_EXPO,
        });
      }
      clickScale *= localScale;
    }
  }
  const combinedCursorScale = scale * enterScale * exitScale * clickScale;

  const filterId = `ghost-cursor-shadow-${uid.replace(/:/g, '')}`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity,
        ...style,
      }}
    >
      {trail2 && Math.hypot(current.x - trail2.x, current.y - trail2.y) > 4 ? (
        <div
          style={{
            position: 'absolute',
            left: trail2.x,
            top: trail2.y,
            width: 8 * scale,
            height: 8 * scale,
            borderRadius: 999,
            backgroundColor: rippleColor,
            opacity: 0.22,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ) : null}
      {trail1 && Math.hypot(current.x - trail1.x, current.y - trail1.y) > 3 ? (
        <div
          style={{
            position: 'absolute',
            left: trail1.x,
            top: trail1.y,
            width: 10 * scale,
            height: 10 * scale,
            borderRadius: 999,
            backgroundColor: rippleColor,
            opacity: 0.36,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ) : null}

      {sorted.map((kf, idx) => {
        if (!kf.click) return null;
        const dt = frame - kf.frame;
        if (dt < 0 || dt > 30) return null;

        const r1 = interpolate(dt, [0, 24], [4, 34], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: SPARK_BURST_EASING,
        });
        const op1 = interpolate(dt, [0, 5, 24], [0.9, 0.72, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const sw1 = interpolate(dt, [0, 24], [2.6, 0.6], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const r2 = interpolate(dt, [4, 30], [2, 24], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: SPARK_BURST_EASING,
        });
        const op2 = interpolate(dt, [4, 9, 30], [0, 0.65, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const sw2 = interpolate(dt, [4, 30], [2.0, 0.5], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <svg
            key={`ripple-${idx}-${kf.frame}`}
            width={88}
            height={88}
            viewBox="-44 -44 88 88"
            style={{
              position: 'absolute',
              left: kf.x,
              top: kf.y,
              overflow: 'visible',
              transform: `translate(-50%, -50%) scale(${scale})`,
            }}
          >
            <circle cx={0} cy={0} r={r1} fill="none" stroke={rippleColor} strokeWidth={sw1} opacity={op1} />
            <circle
              cx={0}
              cy={0}
              r={r2}
              fill="none"
              stroke={LAUNCH_PALETTE.SECONDARY}
              strokeWidth={sw2}
              opacity={op2}
            />
          </svg>
        );
      })}

      <div
        style={{
          position: 'absolute',
          left: current.x,
          top: current.y,
          transformOrigin: '4px 3px',
          willChange: 'transform',
          transform: `translate3d(-4px, -3px, 0px) scale(${combinedCursorScale.toFixed(3)}) rotate(${leanDeg.toFixed(2)}deg)`,
        }}
      >
        <svg width={34} height={38} viewBox="0 0 34 38" style={{ overflow: 'visible', display: 'block' }}>
          <defs>
            <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor={LAUNCH_PALETTE.PRIMARY_DARK} floodOpacity="0.28" />
            </filter>
          </defs>
          <path
            d="M 4 3 L 4 29 L 11.4 22.6 L 16.4 33 L 20.6 31 L 15.6 20.8 L 25.5 20.4 Z"
            fill={color}
            stroke={LAUNCH_PALETTE.CARD_BG}
            strokeWidth={2.2}
            strokeLinejoin="round"
            filter={`url(#${filterId})`}
          />
        </svg>

        {current.label ? (
          <div
            style={{
              marginTop: 4,
              marginLeft: 18,
              padding: '4px 10px',
              borderRadius: 999,
              backgroundColor: LAUNCH_PALETTE.PRIMARY,
              border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
              color: LAUNCH_PALETTE.BACKGROUND,
              fontFamily: LAUNCH_FONTS.MONO,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}
          >
            {current.label}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export type EvolvingPathProps = {
  readonly d: string;
  readonly width?: number;
  readonly height?: number;
  readonly viewBox?: string;
  readonly startFrame?: number;
  readonly durationFrames?: number;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly strokeLinecap?: 'round' | 'butt' | 'square';
  readonly strokeLinejoin?: 'round' | 'miter' | 'bevel';
  readonly trackStroke?: string;
  readonly showHeadDot?: boolean;
  readonly headDotRadius?: number;
  readonly headDotColor?: string;
  readonly hideDotWhenComplete?: boolean;
  readonly easing?: (t: number) => number;
  readonly style?: React.CSSProperties;
};

/**
 * Draws any SVG path smoothly via @remotion/paths `evolvePath` and optionally
 * tracks a glowing leading dot via `getPointAtLength`.
 */
export const EvolvingPath: React.FC<EvolvingPathProps> = ({
  d,
  width = 800,
  height = 400,
  viewBox,
  startFrame = 0,
  durationFrames = 45,
  stroke = LAUNCH_PALETTE.ACCENT,
  strokeWidth = 3.5,
  strokeLinecap = 'round',
  strokeLinejoin = 'round',
  trackStroke,
  showHeadDot = true,
  headDotRadius = 5.5,
  headDotColor,
  hideDotWhenComplete = false,
  easing = PATH_EVOLVE_EASING,
  style,
}) => {
  const uid = useId();
  const frame = useCurrentFrame();

  const totalLength = useMemo(() => {
    if (!d || !d.trim()) return 0;
    try {
      const len = getLength(d);
      return Number.isFinite(len) ? Math.max(0, len) : 0;
    } catch {
      return 0;
    }
  }, [d]);

  if (!d || !d.trim() || totalLength <= 0.5) return null;

  const safeDuration = Math.max(1, durationFrames);
  const rawProgress = interpolate(frame, [startFrame, startFrame + safeDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });
  const progress = Math.min(1, Math.max(0, rawProgress));
  const resolvedDotColor = headDotColor ?? stroke;
  const glowId = `evolving-dot-glow-${uid.replace(/:/g, '')}`;

  const isStarted = progress > 0.0001;
  const isComplete = progress >= 0.9999;
  const evolved = isStarted && !isComplete ? evolvePath(progress, d) : null;

  let headPoint: { readonly x: number; readonly y: number } | null = null;
  if (
    showHeadDot &&
    progress > 0.002 &&
    (!hideDotWhenComplete || progress < 0.998)
  ) {
    const targetDistance = Math.min(totalLength, Math.max(0, progress * totalLength));
    const sampled = getPointAtLength(d, targetDistance);
    if (sampled && Number.isFinite(sampled.x) && Number.isFinite(sampled.y)) {
      headPoint = sampled;
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox ?? `0 0 ${width} ${height}`}
      style={{ overflow: 'visible', display: 'block', ...style }}
    >
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={resolvedDotColor} stopOpacity="0.65" />
          <stop offset="60%" stopColor={resolvedDotColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={resolvedDotColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {trackStroke && trackStroke !== 'none' ? (
        <path
          d={d}
          fill="none"
          stroke={trackStroke}
          strokeWidth={strokeWidth}
          strokeLinecap={strokeLinecap}
          strokeLinejoin={strokeLinejoin}
        />
      ) : null}

      {isStarted ? (
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap={strokeLinecap}
          strokeLinejoin={strokeLinejoin}
          {...(evolved
            ? {
                strokeDasharray: evolved.strokeDasharray,
                strokeDashoffset: evolved.strokeDashoffset,
              }
            : undefined)}
        />
      ) : null}

      {headPoint ? (
        <g transform={`translate(${headPoint.x}, ${headPoint.y})`}>
          <circle cx={0} cy={0} r={headDotRadius * 3.1} fill={`url(#${glowId})`} />
          <circle cx={0} cy={0} r={headDotRadius} fill={resolvedDotColor} />
          <circle cx={0} cy={0} r={Math.max(1.5, headDotRadius * 0.42)} fill={LAUNCH_PALETTE.CARD_BG} />
        </g>
      ) : null}
    </svg>
  );
};

export type GeometricSparkBurstProps = {
  readonly triggerFrame: number;
  readonly x: number;
  readonly y: number;
  readonly durationFrames?: number;
  readonly radius?: number;
  readonly count?: number;
  readonly seed?: string;
  readonly colors?: readonly string[];
  readonly style?: React.CSSProperties;
};

const BURST_PALETTE = [
  LAUNCH_PALETTE.ACCENT,
  LAUNCH_PALETTE.SECONDARY,
  LAUNCH_PALETTE.TERTIARY,
] as const;

/**
 * Editorial radial burst of crisp 4-point @remotion/shapes <Star> diamonds and <Circle> vectors
 * in Earthy Minimal palette tones, triggered cleanly at `triggerFrame`.
 */
export const GeometricSparkBurst: React.FC<GeometricSparkBurstProps> = ({
  triggerFrame,
  x,
  y,
  durationFrames = 34,
  radius = 86,
  count = 12,
  seed = 'polisas-spark',
  colors = BURST_PALETTE,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeCount = Number.isFinite(count) ? Math.floor(count) : 0;

  const particles = useMemo(() => {
    if (safeCount <= 0) return [];
    return Array.from({ length: safeCount }, (_, i) => {
      const baseAngle = (i / safeCount) * Math.PI * 2;
      const jitterAngle = (random(`${seed}-angle-${i}`) - 0.5) * 0.28;
      const angle = baseAngle + jitterAngle;
      const distScale = 0.68 + random(`${seed}-dist-${i}`) * 0.44;
      const size = 5 + random(`${seed}-size-${i}`) * 6.5;
      const isStar = i % 2 === 0;
      const color = colors[i % colors.length] ?? LAUNCH_PALETTE.ACCENT;
      const spinDir = i % 2 === 0 ? 1 : -1;
      const spinDeg = spinDir * (45 + random(`${seed}-spin-${i}`) * 70);
      return { angle, distScale, size, isStar, color, spinDeg };
    });
  }, [safeCount, seed, colors]);

  const safeDuration = Math.max(4, durationFrames);
  const localFrame = frame - triggerFrame;
  if (safeCount <= 0 || localFrame < 0 || localFrame > safeDuration) return null;

  const progress = interpolate(localFrame, [0, safeDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SPARK_BURST_EASING,
  });

  const ringRadius = interpolate(progress, [0, 1], [8, radius * 0.85]);
  const ringOpacity = interpolate(progress, [0, 0.18, 0.85, 1], [0, 0.55, 0.14, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 0,
        height: 0,
        pointerEvents: 'none',
        overflow: 'visible',
        ...style,
      }}
    >
      <svg
        width={radius * 2.4}
        height={radius * 2.4}
        viewBox={`${-radius * 1.2} ${-radius * 1.2} ${radius * 2.4} ${radius * 2.4}`}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: 'translate(-50%, -50%)',
          overflow: 'visible',
        }}
      >
        <circle
          cx={0}
          cy={0}
          r={ringRadius}
          fill="none"
          stroke={colors[0] ?? LAUNCH_PALETTE.ACCENT}
          strokeWidth={1.5}
          strokeDasharray="4 6"
          opacity={ringOpacity}
        />
      </svg>

      {particles.map((p, i) => {
        const dotDelay = p.isStar ? 0 : 2;
        const particleProgress = interpolate(
          localFrame - dotDelay,
          [0, Math.max(4, safeDuration - dotDelay)],
          [0, 1],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: SPARK_BURST_EASING,
          },
        );
        const travel = particleProgress * radius * p.distScale;
        const px = Math.cos(p.angle) * travel;
        const py = Math.sin(p.angle) * travel;
        const itemScale = interpolate(particleProgress, [0, 0.22, 0.72, 1], [0.25, 1.08, 0.82, 0.2], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const itemOpacity = interpolate(particleProgress, [0, 0.14, 0.7, 1], [0, 1, 0.88, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const rotation = particleProgress * p.spinDeg;

        return (
          <div
            key={`${seed}-${i}`}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: itemOpacity,
              willChange: 'transform, opacity',
              transform: `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0px) translate(-50%, -50%) rotate(${rotation.toFixed(1)}deg) scale(${itemScale.toFixed(3)})`,
            }}
          >
            {p.isStar ? (
              <Star
                points={4}
                innerRadius={Math.max(1.5, p.size * 0.3)}
                outerRadius={p.size}
                cornerRadius={1}
                fill={p.color}
                premountFor={fps}
                showInTimeline={false}
              />
            ) : (
              <Circle
                radius={Math.max(2, p.size * 0.42)}
                fill={p.color}
                premountFor={fps}
                showInTimeline={false}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
