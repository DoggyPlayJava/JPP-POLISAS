import React, { useContext, useId, useMemo } from 'react';
import {
  AbsoluteFill,
  Easing,
  Solid,
  interpolate,
  interpolateColors,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { contourLines } from '@remotion/effects/contour-lines';
import { lightLeak } from '@remotion/effects/light-leak';
import { noise } from '@remotion/effects/noise';
import { paper } from '@remotion/effects/paper';
import { LAUNCH_CHAPTERS, LAUNCH_TOTAL_FRAMES } from '../schema';
import {
  CHAPTER_MODULE_THEMES,
  LAUNCH_FONTS,
  LAUNCH_PALETTE,
  POLISAS_COORDS,
} from '../tokens';

export const CinemaChromeContext = React.createContext<{
  readonly suppressLocalFrameMarks: boolean;
}>({ suppressLocalFrameMarks: false });

export type EditorialBackdropProps = {
  readonly dark?: boolean;
  readonly showContours?: boolean;
  readonly contourSpeed?: number;
  readonly showGrid?: boolean;
  readonly paperAmount?: number;
  readonly seed?: number;
  readonly ambientTint?: string;
};

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

const ContourSolidOverlay: React.FC<{
  readonly dark: boolean;
  readonly contourSpeed: number;
  readonly seed: number;
}> = ({ dark, contourSpeed, seed }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const safeWidth = Math.max(1, Math.round(Number.isFinite(width) ? width : 1920));
  const safeHeight = Math.max(1, Math.round(Number.isFinite(height) ? height : 1080));
  const safeContourSpeed = Number.isFinite(contourSpeed) ? contourSpeed : 1;
  const timeSec = frame / Math.max(1, fps);

  const contourEffects = useMemo(
    () => [
      contourLines({
        lineColor: dark ? LAUNCH_PALETTE.TERTIARY : LAUNCH_PALETTE.SECONDARY,
        lineWidth: 1.15,
        spacing: 42,
        scale: 280,
        complexity: 0.55,
        smoothness: 0.72,
        seed,
        offsetX: timeSec * 14 * safeContourSpeed,
        offsetY: timeSec * 8 * safeContourSpeed,
        opacity: dark ? 0.11 : 0.08,
      }),
    ],
    [dark, safeContourSpeed, seed, timeSec],
  );

  return (
    <Solid
      width={safeWidth}
      height={safeHeight}
      color="rgba(46, 58, 47, 0)"
      premountFor={fps}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      effects={contourEffects}
    />
  );
};

export const EditorialBackdrop: React.FC<EditorialBackdropProps> = ({
  dark = false,
  showContours = false,
  contourSpeed = 1,
  showGrid = true,
  paperAmount,
  seed = 12,
  ambientTint,
}) => {
  const uid = useId();
  const { fps, width, height } = useVideoConfig();

  const isDark = Boolean(dark);
  const safeWidth = Math.max(1, Math.round(Number.isFinite(width) ? width : 1920));
  const safeHeight = Math.max(1, Math.round(Number.isFinite(height) ? height : 1080));
  const safeSeed = Math.min(1000, Math.max(0, Number.isFinite(seed) ? seed : 12));

  const baseColor = isDark ? LAUNCH_PALETTE.PRIMARY : LAUNCH_PALETTE.BACKGROUND;
  const defaultPaperAmount = isDark ? 0.16 : 0.22;
  const resolvedPaperAmount = clampUnit(
    paperAmount !== undefined && Number.isFinite(paperAmount) ? paperAmount : defaultPaperAmount,
  );

  const strokeColor = isDark ? 'rgba(217, 201, 178, 0.08)' : 'rgba(46, 58, 47, 0.045)';
  const dotColor = isDark ? 'rgba(217, 201, 178, 0.15)' : 'rgba(46, 58, 47, 0.095)';
  const patternId = `editorial-grid-${isDark ? 'dark' : 'light'}-${uid.replace(/:/g, '')}`;

  const backdropEffects = useMemo(
    () => [
      paper({
        amount: resolvedPaperAmount,
        colorFront: isDark ? LAUNCH_PALETTE.MUTED_OLIVE : LAUNCH_PALETTE.CARD_BG,
        colorBack: isDark ? LAUNCH_PALETTE.PRIMARY_DARK : LAUNCH_PALETTE.SURFACE_MUTED,
        contrast: isDark ? 0.16 : 0.2,
        roughness: isDark ? 0.06 : 0.24,
        fiber: 0.28,
        fiberSize: isDark ? 0.32 : 0.26,
        crumples: 0,
        crumpleSize: 0.45,
        folds: 0,
        foldCount: 0,
        drops: 0.04,
        scale: isDark ? 1.15 : 0.9,
        seed: safeSeed,
      }),
      noise({
        amount: isDark ? 0.038 : 0.024,
        seed: safeSeed,
        premultiply: false,
      }),
    ],
    [isDark, resolvedPaperAmount, safeSeed],
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: baseColor,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <Solid
        width={safeWidth}
        height={safeHeight}
        color={baseColor}
        premountFor={fps}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        effects={backdropEffects}
      />

      {showContours ? (
        <ContourSolidOverlay dark={isDark} contourSpeed={contourSpeed} seed={safeSeed} />
      ) : null}

      {ambientTint ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 86% 14%, ${ambientTint} 0%, transparent 48%), radial-gradient(circle at 12% 88%, ${ambientTint} 0%, transparent 44%)`,
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {showGrid ? (
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <pattern id={patternId} width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke={strokeColor} strokeWidth="1" />
              <circle cx="0" cy="0" r="1.15" fill={dotColor} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      ) : null}
    </div>
  );
};

export const EditorialFrameMarks: React.FC<{
  readonly chapterCode: string;
  readonly chapterLabel: string;
  readonly dark?: boolean;
  readonly rightFooter?: string;
}> = ({ chapterCode, chapterLabel, dark = false, rightFooter = 'SESI 2026/2027 +' }) => {
  const { suppressLocalFrameMarks } = useContext(CinemaChromeContext);
  if (suppressLocalFrameMarks) {
    return null;
  }

  const ink = dark ? 'rgba(248, 246, 238, 0.58)' : 'rgba(46, 58, 47, 0.54)';
  const rule = dark ? 'rgba(217, 201, 178, 0.2)' : 'rgba(46, 58, 47, 0.14)';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: '34px 56px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        pointerEvents: 'none',
        fontFamily: LAUNCH_FONTS.MONO,
        fontSize: 13,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: ink,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 12,
          borderBottom: `1px solid ${rule}`,
        }}
      >
        <span>+ POLISAS SEMAMBU • {POLISAS_COORDS.LABEL_COORDS}</span>
        <span>
          BAB {chapterCode} — {chapterLabel}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 12,
          borderTop: `1px solid ${rule}`,
        }}
      >
        <span>JPP POLISAS • EKOSISTEM DIGITAL MAHASISWA</span>
        <span>{rightFooter}</span>
      </div>
    </div>
  );
};

const ODOMETER_ROW_HEIGHT = 20;
const ODOMETER_EASING = Easing.bezier(0.83, 0, 0.17, 1);
const DARK_MIX_EASING = Easing.inOut(Easing.cubic);

export type GlobalCinemaGateProps = {
  readonly sessionLabel?: string;
};

/**
 * Persistent top-level Swiss editorial cinema gate owning the 1920x1080 frame
 * across all 9 chapters in `JppLaunchCinema` without cut slicing or duplication.
 */
export const GlobalCinemaGate: React.FC<GlobalCinemaGateProps> = ({
  sessionLabel = 'SESI 2026/2027',
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const impactChapter = LAUNCH_CHAPTERS.find((chapter) => chapter.id === 'ImpactNumbers');
  const impactStart = impactChapter?.startFrame ?? 3450;
  const impactEnd = impactStart + (impactChapter?.durationInFrames ?? 426);

  const shutterDarkMix = interpolate(frame, [734, 744, 756, 766], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: DARK_MIX_EASING,
  });
  const impactDarkMix = interpolate(
    frame,
    [impactStart - 8, impactStart + 4, impactEnd - 30, impactEnd - 14],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: DARK_MIX_EASING,
    },
  );
  const darkMix = clampUnit(Math.max(shutterDarkMix, impactDarkMix));

  const mutedInk = interpolateColors(
    darkMix,
    [0, 1],
    [LAUNCH_PALETTE.MUTED_OLIVE, LAUNCH_PALETTE.TERTIARY],
  );
  const primaryInk = interpolateColors(
    darkMix,
    [0, 1],
    [LAUNCH_PALETTE.PRIMARY, LAUNCH_PALETTE.BACKGROUND],
  );
  const hairlineColor = interpolateColors(
    darkMix,
    [0, 1],
    ['rgba(46, 58, 47, 0.14)', 'rgba(217, 201, 178, 0.20)'],
  );
  const tickInactiveColor = interpolateColors(
    darkMix,
    [0, 1],
    ['rgba(46, 58, 47, 0.24)', 'rgba(217, 201, 178, 0.34)'],
  );

  // Slot-machine odometer index & active chapter signature color across [chapter.startFrame + 6 .. chapter.startFrame + 24]
  let slotIndex = 0;
  let activeThemeColor: string = CHAPTER_MODULE_THEMES[0]?.accent ?? LAUNCH_PALETTE.ACCENT;
  for (let i = 1; i < LAUNCH_CHAPTERS.length; i++) {
    const windowStart = LAUNCH_CHAPTERS[i].startFrame + 6;
    const windowEnd = LAUNCH_CHAPTERS[i].startFrame + 24;
    const prevAccent = CHAPTER_MODULE_THEMES[i - 1]?.accent ?? LAUNCH_PALETTE.ACCENT;
    const currAccent = CHAPTER_MODULE_THEMES[i]?.accent ?? LAUNCH_PALETTE.ACCENT;
    if (frame >= windowEnd) {
      slotIndex = i;
      activeThemeColor = currAccent;
    } else if (frame > windowStart) {
      const t = interpolate(frame, [windowStart, windowEnd], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: ODOMETER_EASING,
      });
      slotIndex = i - 1 + t;
      activeThemeColor = interpolateColors(t, [0, 1], [prevAccent, currAccent]);
      break;
    } else {
      break;
    }
  }

  const maxSlot = Math.max(0, LAUNCH_CHAPTERS.length - 1);
  const clampedSlot = Math.min(maxSlot, Math.max(0, slotIndex));
  const nearestSlot = Math.round(clampedSlot);
  const isSettled = Math.abs(clampedSlot - nearestSlot) < 1e-6;
  const odometerTranslateY = isSettled
    ? -(nearestSlot * ODOMETER_ROW_HEIGHT)
    : -(clampedSlot * ODOMETER_ROW_HEIGHT);
  const translateYCss = `${odometerTranslateY.toFixed(isSettled ? 0 : 3)}px`;

  const railProgress = clampUnit(frame / Math.max(1, durationInFrames - 1));
  const trimmedSession = sessionLabel.trim() || 'SESI 2026/2027';
  const footerRightText = trimmedSession.endsWith('+') ? trimmedSession : `${trimmedSession} +`;

  return (
    <AbsoluteFill
      showInTimeline={false}
      style={{
        pointerEvents: 'none',
        zIndex: 30,
        fontFamily: LAUNCH_FONTS.MONO,
        fontSize: 13,
        lineHeight: `${ODOMETER_ROW_HEIGHT}px`,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
      }}
    >
      {/* Top-Left HUD: pixel-locked at exact fixed coordinates */}
      <div
        style={{
          position: 'absolute',
          top: 26,
          left: 48,
          height: ODOMETER_ROW_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          color: mutedInk,
          whiteSpace: 'nowrap',
        }}
      >
        + POLISAS SEMAMBU • {POLISAS_COORDS.LABEL_COORDS}
      </div>

      {/* Top-Right HUD: color-reactive chapter dot + vertical slot-machine odometer */}
      <div
        style={{
          position: 'absolute',
          top: 26,
          right: 48,
          height: ODOMETER_ROW_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            backgroundColor: activeThemeColor,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ color: mutedInk }}>BAB</span>
        <div
          style={{
            height: ODOMETER_ROW_HEIGHT,
            overflow: 'hidden',
            position: 'relative',
            color: primaryInk,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              transform: `translate3d(0px, ${translateYCss}, 0px)`,
              willChange: 'transform',
            }}
          >
            {LAUNCH_CHAPTERS.map((ch) => (
              <div
                key={`gate-code-${ch.id}`}
                style={{
                  height: ODOMETER_ROW_HEIGHT,
                  lineHeight: `${ODOMETER_ROW_HEIGHT}px`,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {ch.code}
              </div>
            ))}
          </div>
        </div>
        <span style={{ color: mutedInk }}>—</span>
        <div
          style={{
            height: ODOMETER_ROW_HEIGHT,
            overflow: 'hidden',
            position: 'relative',
            color: primaryInk,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              transform: `translate3d(0px, ${translateYCss}, 0px)`,
              willChange: 'transform',
            }}
          >
            {LAUNCH_CHAPTERS.map((ch) => (
              <div
                key={`gate-label-${ch.id}`}
                style={{
                  height: ODOMETER_ROW_HEIGHT,
                  lineHeight: `${ODOMETER_ROW_HEIGHT}px`,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {ch.gateLabel}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Swiss Hairline */}
      <div
        style={{
          position: 'absolute',
          top: 54,
          left: 48,
          right: 48,
          height: 1,
          backgroundColor: hairlineColor,
        }}
      />

      {/* Bottom Hairline + 2px Color-Reactive Cinema Progress Rail + 8 Module-Colored Chapter Ticks */}
      <div
        style={{
          position: 'absolute',
          bottom: 54,
          left: 48,
          right: 48,
          height: 1,
          backgroundColor: hairlineColor,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: -0.5,
            height: 2,
            backgroundColor: activeThemeColor,
            transformOrigin: '0% 50%',
            transform: `scaleX(${railProgress.toFixed(5)})`,
            willChange: 'transform',
          }}
        />
        {LAUNCH_CHAPTERS.map((ch, idx) => {
          const pct = (ch.startFrame / LAUNCH_TOTAL_FRAMES) * 100;
          const reached = frame >= ch.startFrame;
          const tickAccent = CHAPTER_MODULE_THEMES[idx]?.accent ?? LAUNCH_PALETTE.ACCENT;
          return (
            <div
              key={`gate-tick-${ch.id}`}
              style={{
                position: 'absolute',
                left: `${pct.toFixed(4)}%`,
                top: '50%',
                width: reached ? 2.5 : 2,
                height: reached ? 7 : 6,
                backgroundColor: reached ? tickAccent : tickInactiveColor,
                transform: 'translate3d(-50%, -50%, 0px)',
              }}
            />
          );
        })}
      </div>

      {/* Bottom-Left & Bottom-Right HUD */}
      <div
        style={{
          position: 'absolute',
          bottom: 26,
          left: 48,
          height: ODOMETER_ROW_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          color: mutedInk,
          whiteSpace: 'nowrap',
        }}
      >
        JPP POLISAS • EKOSISTEM DIGITAL MAHASISWA
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 26,
          right: 48,
          height: ODOMETER_ROW_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          color: mutedInk,
          whiteSpace: 'nowrap',
        }}
      >
        {footerRightText}
      </div>
    </AbsoluteFill>
  );
};

export const LightLeakOverlay: React.FC<{
  readonly seed?: number;
  readonly hueShift?: number;
}> = ({ seed = 0, hueShift = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();

  const progress = clampUnit(
    interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  const safeSeed = Number.isFinite(seed) ? seed : 0;
  const safeHueShift = Number.isFinite(hueShift) ? Math.min(360, Math.max(0, hueShift)) : 0;

  return (
    <Solid
      width={Math.max(1, Math.round(Number.isFinite(width) ? width : 1920))}
      height={Math.max(1, Math.round(Number.isFinite(height) ? height : 1080))}
      premountFor={fps}
      effects={[
        lightLeak({
          seed: safeSeed,
          hueShift: safeHueShift,
          progress,
        }),
      ]}
    />
  );
};
