import React, { useId } from 'react';
import { Solid, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { contourLines } from '@remotion/effects/contour-lines';
import { lightLeak } from '@remotion/effects/light-leak';
import { noise } from '@remotion/effects/noise';
import { paper } from '@remotion/effects/paper';
import { LAUNCH_FONTS, LAUNCH_PALETTE, POLISAS_COORDS } from '../tokens';

export type EditorialBackdropProps = {
  readonly dark?: boolean;
  readonly showContours?: boolean;
  readonly contourSpeed?: number;
  readonly showGrid?: boolean;
  readonly paperAmount?: number;
  readonly seed?: number;
};

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

export const EditorialBackdrop: React.FC<EditorialBackdropProps> = ({
  dark = false,
  showContours = false,
  contourSpeed = 1,
  showGrid = true,
  paperAmount,
  seed = 12,
}) => {
  const uid = useId();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const safeWidth = Math.max(1, Math.round(Number.isFinite(width) ? width : 1920));
  const safeHeight = Math.max(1, Math.round(Number.isFinite(height) ? height : 1080));
  const safeSeed = Math.min(1000, Math.max(0, Number.isFinite(seed) ? seed : 12));
  const safeContourSpeed = Number.isFinite(contourSpeed) ? contourSpeed : 1;
  const timeSec = frame / Math.max(1, fps);

  const baseColor = dark ? LAUNCH_PALETTE.PRIMARY : LAUNCH_PALETTE.BACKGROUND;
  const defaultPaperAmount = dark ? 0.16 : 0.22;
  const resolvedPaperAmount = clampUnit(
    paperAmount !== undefined && Number.isFinite(paperAmount) ? paperAmount : defaultPaperAmount,
  );

  const strokeColor = dark ? 'rgba(217, 201, 178, 0.08)' : 'rgba(46, 58, 47, 0.045)';
  const dotColor = dark ? 'rgba(217, 201, 178, 0.15)' : 'rgba(46, 58, 47, 0.095)';
  const patternId = `editorial-grid-${dark ? 'dark' : 'light'}-${uid.replace(/:/g, '')}`;

  const backdropEffects = [
    paper({
      amount: resolvedPaperAmount,
      colorFront: dark ? LAUNCH_PALETTE.MUTED_OLIVE : LAUNCH_PALETTE.CARD_BG,
      colorBack: dark ? LAUNCH_PALETTE.PRIMARY_DARK : LAUNCH_PALETTE.SURFACE_MUTED,
      contrast: dark ? 0.16 : 0.2,
      roughness: dark ? 0.06 : 0.24,
      fiber: dark ? 0.28 : 0.28,
      fiberSize: dark ? 0.32 : 0.26,
      crumples: 0,
      crumpleSize: 0.45,
      folds: 0,
      foldCount: 0,
      drops: 0.04,
      scale: dark ? 1.15 : 0.9,
      seed: safeSeed,
    }),
    noise({
      amount: dark ? 0.038 : 0.024,
      seed: safeSeed,
      premultiply: false,
    }),
    ...(showContours
      ? [
          contourLines({
            lineColor: dark ? LAUNCH_PALETTE.TERTIARY : LAUNCH_PALETTE.SECONDARY,
            lineWidth: 1.15,
            spacing: 42,
            scale: 280,
            complexity: 0.55,
            smoothness: 0.72,
            seed: safeSeed,
            offsetX: timeSec * 14 * safeContourSpeed,
            offsetY: timeSec * 8 * safeContourSpeed,
            opacity: dark ? 0.11 : 0.08,
          }),
        ]
      : []),
  ];

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
