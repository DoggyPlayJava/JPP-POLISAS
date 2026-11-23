import React, { useMemo } from 'react';
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

export type KineticWindowSurface = 'light' | 'dark' | 'sand';

export type KineticWindowProps = {
  readonly surface?: KineticWindowSurface;
  readonly routeLabel?: string;
  readonly statusPill?: string;
  readonly statusAccent?: boolean;
  readonly width?: number | string;
  readonly height?: number | string;
  readonly borderRadius?: number;
  readonly sheenStartFrame?: number;
  readonly sheenDuration?: number;
  readonly style?: React.CSSProperties;
  readonly children: React.ReactNode;
};

type SurfaceTheme = {
  readonly backgroundColor: string;
  readonly border: string;
  readonly topBarBackground: string;
  readonly topBarBorder: string;
  readonly routeBackground: string;
  readonly routeBorder: string;
  readonly routeColor: string;
  readonly statusBackground: string;
  readonly statusBorder: string;
  readonly statusColor: string;
  readonly inkColor: string;
  readonly sheenGradient: string;
};

const SURFACE_THEMES: Record<KineticWindowSurface, SurfaceTheme> = {
  light: {
    backgroundColor: LAUNCH_PALETTE.CARD_BG,
    border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
    topBarBackground: LAUNCH_PALETTE.BACKGROUND,
    topBarBorder: 'rgba(217, 201, 178, 0.72)',
    routeBackground: LAUNCH_PALETTE.SURFACE_MUTED,
    routeBorder: LAUNCH_PALETTE.TERTIARY,
    routeColor: LAUNCH_PALETTE.MUTED_OLIVE,
    statusBackground: LAUNCH_PALETTE.CARD_BG,
    statusBorder: LAUNCH_PALETTE.TERTIARY,
    statusColor: LAUNCH_PALETTE.PRIMARY,
    inkColor: LAUNCH_PALETTE.PRIMARY,
    sheenGradient:
      'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(248, 246, 238, 0.56) 46%, rgba(255, 255, 255, 0.74) 52%, rgba(248, 246, 238, 0) 100%)',
  },
  sand: {
    backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
    border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
    topBarBackground: LAUNCH_PALETTE.BACKGROUND,
    topBarBorder: 'rgba(217, 201, 178, 0.85)',
    routeBackground: LAUNCH_PALETTE.CARD_BG,
    routeBorder: LAUNCH_PALETTE.TERTIARY,
    routeColor: LAUNCH_PALETTE.PRIMARY,
    statusBackground: LAUNCH_PALETTE.CARD_BG,
    statusBorder: LAUNCH_PALETTE.TERTIARY,
    statusColor: LAUNCH_PALETTE.PRIMARY,
    inkColor: LAUNCH_PALETTE.PRIMARY,
    sheenGradient:
      'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.48) 46%, rgba(248, 246, 238, 0.66) 52%, rgba(255, 255, 255, 0) 100%)',
  },
  dark: {
    backgroundColor: LAUNCH_PALETTE.PRIMARY,
    border: '1.5px solid rgba(217, 201, 178, 0.22)',
    topBarBackground: LAUNCH_PALETTE.PRIMARY_DARK,
    topBarBorder: 'rgba(217, 201, 178, 0.14)',
    routeBackground: 'rgba(248, 246, 238, 0.08)',
    routeBorder: 'rgba(217, 201, 178, 0.22)',
    routeColor: LAUNCH_PALETTE.TERTIARY,
    statusBackground: 'rgba(248, 246, 238, 0.08)',
    statusBorder: 'rgba(217, 201, 178, 0.24)',
    statusColor: LAUNCH_PALETTE.BACKGROUND,
    inkColor: LAUNCH_PALETTE.BACKGROUND,
    sheenGradient:
      'linear-gradient(90deg, rgba(217, 201, 178, 0) 0%, rgba(217, 201, 178, 0.16) 46%, rgba(248, 246, 238, 0.22) 52%, rgba(217, 201, 178, 0) 100%)',
  },
};

const SHEEN_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

/**
 * Clean architectural Swiss window card with optional 3-dot register top bar,
 * monospace route pill, status pill, and frame-driven diagonal specular sheen.
 */
export const KineticWindow: React.FC<KineticWindowProps> = ({
  surface = 'light',
  routeLabel,
  statusPill,
  statusAccent = false,
  width,
  height,
  borderRadius = 26,
  sheenStartFrame,
  sheenDuration = 42,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const theme = SURFACE_THEMES[surface];
  const hasTopBar = Boolean(routeLabel || statusPill);

  let sheenLeftPct = -45;
  let sheenOpacity = 0;
  if (sheenStartFrame !== undefined && Number.isFinite(sheenStartFrame)) {
    const safeDuration = Math.max(1, Number.isFinite(sheenDuration) ? sheenDuration : 42);
    const sheenProgress = interpolate(
      frame,
      [sheenStartFrame, sheenStartFrame + safeDuration],
      [0, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: SHEEN_EASING,
      },
    );
    sheenLeftPct = interpolate(sheenProgress, [0, 1], [-45, 135]);
    sheenOpacity = interpolate(sheenProgress, [0, 0.18, 0.78, 1], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  const innerRadius = Math.max(0, borderRadius - 1.5);
  const statusPillBg = statusAccent
    ? surface === 'dark'
      ? 'rgba(201, 111, 79, 0.24)'
      : 'rgba(201, 111, 79, 0.12)'
    : theme.statusBackground;
  const statusPillBorder = statusAccent
    ? 'rgba(201, 111, 79, 0.5)'
    : theme.statusBorder;
  const statusPillColor = statusAccent
    ? surface === 'dark'
      ? LAUNCH_PALETTE.BACKGROUND
      : LAUNCH_PALETTE.ACCENT
    : theme.statusColor;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        width,
        height,
        borderRadius,
        backgroundColor: theme.backgroundColor,
        border: theme.border,
        color: theme.inkColor,
        fontFamily: LAUNCH_FONTS.DISPLAY,
        boxShadow:
          '0 24px 56px rgba(31, 39, 32, 0.12), 0 4px 14px rgba(31, 39, 32, 0.06)',
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      {hasTopBar ? (
        <div
          style={{
            height: 40,
            padding: '0 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            backgroundColor: theme.topBarBackground,
            borderBottom: `1px solid ${theme.topBarBorder}`,
            borderTopLeftRadius: innerRadius,
            borderTopRightRadius: innerRadius,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: LAUNCH_PALETTE.ACCENT,
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: LAUNCH_PALETTE.TERTIARY,
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: LAUNCH_PALETTE.SECONDARY,
                  display: 'inline-block',
                }}
              />
            </div>

            {routeLabel ? (
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  backgroundColor: theme.routeBackground,
                  border: `1px solid ${theme.routeBorder}`,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: theme.routeColor,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {routeLabel}
              </span>
            ) : null}
          </div>

          {statusPill ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                borderRadius: 999,
                backgroundColor: statusPillBg,
                border: `1px solid ${statusPillBorder}`,
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: '0.1em',
                color: statusPillColor,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: statusAccent
                    ? LAUNCH_PALETTE.ACCENT
                    : LAUNCH_PALETTE.SECONDARY,
                  display: 'inline-block',
                }}
              />
              <span>{statusPill}</span>
            </span>
          ) : null}
        </div>
      ) : null}

      {children}

      {sheenOpacity > 0.002 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: innerRadius,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 6,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-50%',
              left: `${sheenLeftPct.toFixed(2)}%`,
              width: '32%',
              height: '200%',
              opacity: sheenOpacity,
              background: theme.sheenGradient,
              transform: 'rotate(24deg)',
              willChange: 'left, opacity',
              pointerEvents: 'none',
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

export type ExplodedLayerProps = {
  readonly zDepth?: number;
  readonly enterFrame?: number;
  readonly enterOffsetY?: number;
  readonly enterOffsetX?: number;
  readonly floatAmplitude?: number;
  readonly floatPhase?: number;
  readonly style?: React.CSSProperties;
  readonly children: React.ReactNode;
};

/**
 * 3D-lifted UI sub-layer with deterministic Remotion spring entry and gentle
 * sinusoidal micro-float in true CSS Z-space (`preserve-3d`).
 */
export const ExplodedLayer: React.FC<ExplodedLayerProps> = ({
  zDepth = 0,
  enterFrame = 0,
  enterOffsetY = 24,
  enterOffsetX = 0,
  floatAmplitude = 3,
  floatPhase = 0,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const localFrame = frame - enterFrame;

  const enterSpring =
    localFrame >= 0
      ? spring({
          frame: localFrame,
          fps: safeFps,
          config: { damping: 180, stiffness: 220, mass: 0.9 },
        })
      : 0;

  const fadeFrames = Math.max(4, Math.round(safeFps * 0.16));
  const opacity =
    localFrame >= 0
      ? interpolate(localFrame, [0, fadeFrames], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

  const floatY =
    Math.sin((frame / safeFps) * 1.45 + floatPhase) * floatAmplitude * enterSpring;
  const tx = (1 - enterSpring) * enterOffsetX;
  const ty = (1 - enterSpring) * enterOffsetY + floatY;

  return (
    <div
      style={{
        ...style,
        transformStyle: 'preserve-3d',
        opacity,
        willChange: 'transform, opacity',
        transform: `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, ${zDepth.toFixed(2)}px)`,
      }}
    >
      {children}
    </div>
  );
};

export type LiveTypewriterTextProps = {
  readonly text: string;
  readonly startFrame: number;
  readonly charsPerSecond?: number;
  readonly showCursor?: boolean;
  readonly cursorColor?: string;
  readonly style?: React.CSSProperties;
};

/**
 * Frame-driven deterministic typewriter slice with step-blinking 2px caret.
 */
export const LiveTypewriterText: React.FC<LiveTypewriterTextProps> = ({
  text,
  startFrame,
  charsPerSecond = 24,
  showCursor = true,
  cursorColor = LAUNCH_PALETTE.ACCENT,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeCps = Math.max(1, Number.isFinite(charsPerSecond) ? charsPerSecond : 24);
  const elapsedFrames = Math.max(0, frame - startFrame);

  const visibleCount =
    frame >= startFrame
      ? Math.min(text.length, Math.floor((elapsedFrames / safeFps) * safeCps))
      : 0;

  const blinkPeriod = Math.max(1, Math.round(safeFps * 0.45));
  const isCaretOn = Math.floor(frame / blinkPeriod) % 2 === 0;

  return (
    <span style={style}>
      {text.slice(0, visibleCount)}
      {showCursor ? (
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 2,
            height: '1.05em',
            backgroundColor: cursorColor,
            marginLeft: 2,
            verticalAlign: '-0.14em',
            opacity: isCaretOn ? 1 : 0,
          }}
        />
      ) : null}
    </span>
  );
};

export type PersonaMonogramProps = {
  readonly size?: number;
  readonly style?: React.CSSProperties;
};

/**
 * Custom Swiss architectural origami Fox Monogram SVG representing "Rubah Semambu"
 * strictly in the 05 Earthy Minimal palette.
 */
export const PersonaMonogram: React.FC<PersonaMonogramProps> = ({
  size = 44,
  style,
}) => {
  const safeSize = Math.max(16, Number.isFinite(size) ? size : 44);

  return (
    <svg
      width={safeSize}
      height={safeSize}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Rubah Semambu Monogram"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <rect
        x={2}
        y={2}
        width={60}
        height={60}
        rx={16}
        fill={LAUNCH_PALETTE.SURFACE_MUTED}
        stroke={LAUNCH_PALETTE.TERTIARY}
        strokeWidth={2}
      />

      {/* Base folded-origami fox head silhouette */}
      <polygon
        points="15,13 26,22 38,22 49,13 51,33 32,51 13,33"
        fill={LAUNCH_PALETTE.ACCENT}
      />

      {/* Inner ear origami facets */}
      <polygon points="17.5,18 24,23.5 17.5,29" fill={LAUNCH_PALETTE.SURFACE_MUTED} />
      <polygon points="46.5,18 40,23.5 46.5,29" fill={LAUNCH_PALETTE.SURFACE_MUTED} />

      {/* Lower cheek muzzle blazes */}
      <polygon points="13,33 26,37 32,51" fill={LAUNCH_PALETTE.BACKGROUND} />
      <polygon points="51,33 38,37 32,51" fill={LAUNCH_PALETTE.BACKGROUND} />

      {/* Subtle architectural forehead fold facet */}
      <polygon
        points="26,22 38,22 32,39"
        fill={LAUNCH_PALETTE.PRIMARY_DARK}
        fillOpacity={0.12}
      />
      <line
        x1={32}
        y1={22}
        x2={32}
        y2={45}
        stroke={LAUNCH_PALETTE.BACKGROUND}
        strokeOpacity={0.28}
        strokeWidth={1.1}
      />

      {/* Crisp Swiss eyes & snout apex nose */}
      <polygon points="20.5,30 26.5,32.2 25.2,34.8 19.8,32.6" fill={LAUNCH_PALETTE.PRIMARY} />
      <polygon points="43.5,30 37.5,32.2 38.8,34.8 44.2,32.6" fill={LAUNCH_PALETTE.PRIMARY} />
      <polygon points="28.5,46 35.5,46 32,51" fill={LAUNCH_PALETTE.PRIMARY} />
    </svg>
  );
};

export type DeterministicQrMatrixProps = {
  readonly seed: number;
  readonly size?: number;
  readonly fgColor?: string;
  readonly bgColor?: string;
  readonly style?: React.CSSProperties;
};

const QR_DIMENSION = 21;

const isQrFinderDark = (r: number, c: number, top: number, left: number): boolean => {
  const dr = r - top;
  const dc = c - left;
  if (dr < 0 || dr > 6 || dc < 0 || dc > 6) return false;
  if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
  if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
  return false;
};

const buildDeterministicQrPath = (seed: number): string => {
  const safeSeed = Number.isFinite(seed) ? Math.floor(seed) : 1;
  const segments: string[] = [];

  for (let r = 0; r < QR_DIMENSION; r++) {
    for (let c = 0; c < QR_DIMENSION; c++) {
      let isDark = false;

      if (r <= 6 && c <= 6) {
        isDark = isQrFinderDark(r, c, 0, 0);
      } else if (r <= 6 && c >= 14) {
        isDark = isQrFinderDark(r, c, 0, 14);
      } else if (r >= 14 && c <= 6) {
        isDark = isQrFinderDark(r, c, 14, 0);
      } else if ((r <= 7 && c <= 7) || (r <= 7 && c >= 13) || (r >= 13 && c <= 7)) {
        // 1-module white separator border surrounding the 3 finder patterns
        isDark = false;
      } else if (r === 6 && c >= 8 && c <= 12) {
        isDark = c % 2 === 0;
      } else if (c === 6 && r >= 8 && r <= 12) {
        isDark = r % 2 === 0;
      } else if (r === 13 && c === 8) {
        // Mandatory QR dark alignment module
        isDark = true;
      } else {
        let hash =
          (Math.imul(safeSeed ^ 0x9e3779b9, 0x85ebca6b) +
            Math.imul(r + 1, 0xc2b2ae35) +
            Math.imul(c + 1, 0x27d4eb2f)) >>>
          0;
        hash ^= hash >>> 15;
        hash = Math.imul(hash, 0x85ebca6b) >>> 0;
        hash ^= hash >>> 13;
        isDark = (hash & 1) === 1;
      }

      if (isDark) {
        segments.push(`M${c} ${r}h1v1h-1z`);
      }
    }
  }

  return segments.join('');
};

/**
 * Deterministic 21x21 Version-1 SVG QR matrix with authentic 7x7 finder patterns,
 * timing strips, and deterministic data modules for passes and portal badges.
 */
export const DeterministicQrMatrix: React.FC<DeterministicQrMatrixProps> = ({
  seed,
  size = 128,
  fgColor = LAUNCH_PALETTE.PRIMARY,
  bgColor = LAUNCH_PALETTE.BACKGROUND,
  style,
}) => {
  const safeSize = Math.max(42, Number.isFinite(size) ? size : 128);
  const pathData = useMemo(() => buildDeterministicQrPath(seed), [seed]);

  return (
    <svg
      width={safeSize}
      height={safeSize}
      viewBox={`0 0 ${QR_DIMENSION} ${QR_DIMENSION}`}
      role="img"
      aria-label="Kod QR Digital POLISAS"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <rect x={0} y={0} width={QR_DIMENSION} height={QR_DIMENSION} fill={bgColor} />
      <path d={pathData} fill={fgColor} shapeRendering="crispEdges" />
    </svg>
  );
};
