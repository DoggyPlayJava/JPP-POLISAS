import React, { useId, useMemo } from 'react';
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
  readonly accentColor?: string;
  readonly accentSoftBg?: string;
  readonly accentBorderColor?: string;
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
    topBarBorder: 'rgba(184, 228, 220, 0.72)',
    routeBackground: LAUNCH_PALETTE.SURFACE_MUTED,
    routeBorder: LAUNCH_PALETTE.TERTIARY,
    routeColor: LAUNCH_PALETTE.MUTED_OLIVE,
    statusBackground: LAUNCH_PALETTE.CARD_BG,
    statusBorder: LAUNCH_PALETTE.TERTIARY,
    statusColor: LAUNCH_PALETTE.PRIMARY,
    inkColor: LAUNCH_PALETTE.PRIMARY,
    sheenGradient:
      'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(246, 251, 249, 0.58) 46%, rgba(255, 255, 255, 0.76) 52%, rgba(246, 251, 249, 0) 100%)',
  },
  sand: {
    backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
    border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
    topBarBackground: LAUNCH_PALETTE.BACKGROUND,
    topBarBorder: 'rgba(184, 228, 220, 0.85)',
    routeBackground: LAUNCH_PALETTE.CARD_BG,
    routeBorder: LAUNCH_PALETTE.TERTIARY,
    routeColor: LAUNCH_PALETTE.PRIMARY,
    statusBackground: LAUNCH_PALETTE.CARD_BG,
    statusBorder: LAUNCH_PALETTE.TERTIARY,
    statusColor: LAUNCH_PALETTE.PRIMARY,
    inkColor: LAUNCH_PALETTE.PRIMARY,
    sheenGradient:
      'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.5) 46%, rgba(246, 251, 249, 0.68) 52%, rgba(255, 255, 255, 0) 100%)',
  },
  dark: {
    backgroundColor: LAUNCH_PALETTE.PRIMARY,
    border: '1.5px solid rgba(184, 228, 220, 0.24)',
    topBarBackground: LAUNCH_PALETTE.PRIMARY_DARK,
    topBarBorder: 'rgba(184, 228, 220, 0.16)',
    routeBackground: 'rgba(246, 251, 249, 0.08)',
    routeBorder: 'rgba(184, 228, 220, 0.24)',
    routeColor: LAUNCH_PALETTE.TERTIARY,
    statusBackground: 'rgba(246, 251, 249, 0.08)',
    statusBorder: 'rgba(184, 228, 220, 0.26)',
    statusColor: LAUNCH_PALETTE.BACKGROUND,
    inkColor: LAUNCH_PALETTE.BACKGROUND,
    sheenGradient:
      'linear-gradient(90deg, rgba(184, 228, 220, 0) 0%, rgba(184, 228, 220, 0.18) 46%, rgba(246, 251, 249, 0.24) 52%, rgba(184, 228, 220, 0) 100%)',
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
  accentColor = LAUNCH_PALETTE.ACCENT,
  accentSoftBg,
  accentBorderColor,
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
    ? accentSoftBg ??
      (surface === 'dark' ? 'rgba(20, 184, 166, 0.24)' : 'rgba(20, 184, 166, 0.12)')
    : theme.statusBackground;
  const statusPillBorder = statusAccent
    ? accentBorderColor ?? accentColor
    : theme.statusBorder;
  const statusPillColor = statusAccent
    ? surface === 'dark'
      ? LAUNCH_PALETTE.BACKGROUND
      : accentColor
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
          '0 24px 56px rgba(6, 23, 20, 0.12), 0 4px 14px rgba(6, 23, 20, 0.06)',
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
                  backgroundColor: accentColor,
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
                    ? accentColor
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
  readonly rotateX?: number;
  readonly rotateY?: number;
  readonly rotateZ?: number;
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
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
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
  const rotSuffix =
    rotateX !== 0 || rotateY !== 0 || rotateZ !== 0
      ? ` rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) rotateZ(${rotateZ.toFixed(2)}deg)`
      : '';

  return (
    <div
      style={{
        ...style,
        transformStyle: 'preserve-3d',
        opacity,
        willChange: 'transform, opacity',
        transform: `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, ${zDepth.toFixed(2)}px)${rotSuffix}`,
      }}
    >
      {children}
    </div>
  );
};

export type SpatialFloorGridProps = {
  readonly accentColor: string;
  readonly secondaryColor?: string;
  readonly gridOpacity?: number;
  readonly scrollSpeed?: number;
  readonly dark?: boolean;
};

/**
 * Deterministic 3D architectural perspective floor plane tilted at rotateX(62deg)
 * with smooth frame-driven grid drift, horizon fadeout, and subtle module floor glow.
 */
export const SpatialFloorGrid: React.FC<SpatialFloorGridProps> = ({
  accentColor,
  secondaryColor,
  gridOpacity = 0.24,
  scrollSpeed = 16,
  dark = false,
}) => {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeSpeed = Number.isFinite(scrollSpeed) ? scrollSpeed : 16;
  const safeOpacity = Math.min(1, Math.max(0, Number.isFinite(gridOpacity) ? gridOpacity : 0.24));
  const timeSec = frame / safeFps;
  const tileSize = 68;
  const driftY = ((timeSec * safeSpeed) % tileSize + tileSize) % tileSize;
  const secondary = secondaryColor ?? accentColor;

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: -180,
        right: -180,
        bottom: -120,
        height: 640,
        pointerEvents: 'none',
        transformOrigin: '50% 100%',
        transformStyle: 'preserve-3d',
        transform: 'translate3d(0px, 60px, -160px) rotateX(62deg)',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 2280 640"
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <defs>
          <pattern
            id={`floor-grid-${uid}`}
            width={tileSize}
            height={tileSize}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(0 ${driftY.toFixed(2)})`}
          >
            <path
              d={`M ${tileSize} 0 L 0 0 0 ${tileSize}`}
              fill="none"
              stroke={dark ? LAUNCH_PALETTE.TERTIARY : accentColor}
              strokeOpacity={safeOpacity}
              strokeWidth={1.35}
            />
          </pattern>
          <radialGradient id={`floor-glow-a-${uid}`} cx="34%" cy="56%" r="48%">
            <stop offset="0%" stopColor={accentColor} stopOpacity={dark ? 0.26 : 0.18} />
            <stop offset="68%" stopColor={accentColor} stopOpacity={0.04} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`floor-glow-b-${uid}`} cx="68%" cy="54%" r="46%">
            <stop offset="0%" stopColor={secondary} stopOpacity={dark ? 0.2 : 0.15} />
            <stop offset="70%" stopColor={secondary} stopOpacity={0.03} />
            <stop offset="100%" stopColor={secondary} stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`floor-fade-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0} />
            <stop offset="28%" stopColor="#FFFFFF" stopOpacity={0.78} />
            <stop offset="86%" stopColor="#FFFFFF" stopOpacity={1} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.18} />
          </linearGradient>
          <mask id={`floor-mask-${uid}`}>
            <rect x={0} y={0} width={2280} height={640} fill={`url(#floor-fade-${uid})`} />
          </mask>
        </defs>

        <g mask={`url(#floor-mask-${uid})`}>
          <rect x={0} y={0} width={2280} height={640} fill={`url(#floor-glow-a-${uid})`} />
          <rect x={0} y={0} width={2280} height={640} fill={`url(#floor-glow-b-${uid})`} />
          <rect x={0} y={0} width={2280} height={640} fill={`url(#floor-grid-${uid})`} />
        </g>
      </svg>
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
  readonly species?: 'fox' | 'owl' | 'cat';
  readonly accentColor?: string;
  readonly softBgColor?: string;
  readonly borderColor?: string;
  readonly style?: React.CSSProperties;
};

/**
 * Custom Swiss architectural origami Animal Persona Monogram SVG
 * supporting Rubah Semambu ('fox'), Burung Hantu Semambu ('owl'), and Kucing Kamsis ('cat').
 */
export const PersonaMonogram: React.FC<PersonaMonogramProps> = ({
  size = 44,
  species = 'fox',
  accentColor = LAUNCH_PALETTE.ACCENT,
  softBgColor = LAUNCH_PALETTE.SURFACE_MUTED,
  borderColor = LAUNCH_PALETTE.TERTIARY,
  style,
}) => {
  const safeSize = Math.max(16, Number.isFinite(size) ? size : 44);
  const ariaLabel =
    species === 'owl'
      ? 'Burung Hantu Semambu Monogram'
      : species === 'cat'
        ? 'Kucing Kamsis Monogram'
        : 'Rubah Semambu Monogram';

  return (
    <svg
      width={safeSize}
      height={safeSize}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label={ariaLabel}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <rect
        x={2}
        y={2}
        width={60}
        height={60}
        rx={16}
        fill={softBgColor}
        stroke={borderColor}
        strokeWidth={2}
      />

      {species === 'owl' ? (
        <>
          {/* Feathered origami owl silhouette & brow tufts */}
          <polygon points="15,14 26,20 38,20 49,14 51,38 32,51 13,38" fill={accentColor} />
          <polygon points="15,14 23,19 16,25" fill={LAUNCH_PALETTE.PRIMARY_DARK} fillOpacity={0.18} />
          <polygon points="49,14 41,19 48,25" fill={LAUNCH_PALETTE.PRIMARY_DARK} fillOpacity={0.18} />
          {/* Large architectural owl eye discs */}
          <circle cx={24} cy={31} r={7.2} fill={LAUNCH_PALETTE.BACKGROUND} />
          <circle cx={40} cy={31} r={7.2} fill={LAUNCH_PALETTE.BACKGROUND} />
          <circle cx={24} cy={31} r={3.1} fill={LAUNCH_PALETTE.PRIMARY_DARK} />
          <circle cx={40} cy={31} r={3.1} fill={LAUNCH_PALETTE.PRIMARY_DARK} />
          {/* Origami diamond beak */}
          <polygon points="29,34 35,34 32,42" fill="#F59E0B" />
          <polygon points="22,44 32,48 42,44 32,51" fill={LAUNCH_PALETTE.BACKGROUND} fillOpacity={0.78} />
        </>
      ) : species === 'cat' ? (
        <>
          {/* Sleek Swiss origami cat head & tall pointed ears */}
          <polygon points="16,12 27,23 37,23 48,12 50,36 32,51 14,36" fill={accentColor} />
          <polygon points="18,17 24,23.5 17.5,27.5" fill={softBgColor} />
          <polygon points="46,17 40,23.5 46.5,27.5" fill={softBgColor} />
          {/* Cream lower muzzle + sleek folded cheeks */}
          <polygon points="14,36 32,38 32,51" fill={LAUNCH_PALETTE.BACKGROUND} fillOpacity={0.85} />
          <polygon points="50,36 32,38 32,51" fill={LAUNCH_PALETTE.BACKGROUND} fillOpacity={0.92} />
          {/* Crisp almond eyes & nose */}
          <polygon points="20,30.5 26,31.5 24.8,34.5 20.5,33" fill={LAUNCH_PALETTE.PRIMARY_DARK} />
          <polygon points="44,30.5 38,31.5 39.2,34.5 43.5,33" fill={LAUNCH_PALETTE.PRIMARY_DARK} />
          <polygon points="29.5,38 34.5,38 32,42" fill={LAUNCH_PALETTE.PRIMARY_DARK} />
          <line x1={12} y1={37} x2={22} y2={39} stroke={LAUNCH_PALETTE.PRIMARY} strokeWidth={1.3} strokeOpacity={0.5} />
          <line x1={52} y1={37} x2={42} y2={39} stroke={LAUNCH_PALETTE.PRIMARY} strokeWidth={1.3} strokeOpacity={0.5} />
        </>
      ) : (
        <>
          {/* Base folded-origami fox head silhouette */}
          <polygon
            points="15,13 26,22 38,22 49,13 51,33 32,51 13,33"
            fill={accentColor}
          />

          {/* Inner ear origami facets */}
          <polygon points="17.5,18 24,23.5 17.5,29" fill={softBgColor} />
          <polygon points="46.5,18 40,23.5 46.5,29" fill={softBgColor} />

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
        </>
      )}
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
