import React, { useId } from 'react';
import { Solid, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { lightLeak } from '@remotion/effects/light-leak';
import { LAUNCH_FONTS, LAUNCH_PALETTE, POLISAS_COORDS } from '../tokens';

export const EditorialBackdrop: React.FC<{ readonly dark?: boolean }> = ({ dark = false }) => {
  const uid = useId();
  const strokeColor = dark ? 'rgba(217, 201, 178, 0.08)' : 'rgba(46, 58, 47, 0.05)';
  const dotColor = dark ? 'rgba(217, 201, 178, 0.14)' : 'rgba(46, 58, 47, 0.1)';
  const patternId = `editorial-grid-${dark ? 'dark' : 'light'}-${uid.replace(/:/g, '')}`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: dark ? LAUNCH_PALETTE.PRIMARY : LAUNCH_PALETTE.BACKGROUND,
        pointerEvents: 'none',
      }}
    >
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id={patternId} width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke={strokeColor} strokeWidth="1" />
            <circle cx="0" cy="0" r="1.2" fill={dotColor} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
};

export const EditorialFrameMarks: React.FC<{
  readonly chapterCode: string;
  readonly chapterLabel: string;
  readonly dark?: boolean;
}> = ({ chapterCode, chapterLabel, dark = false }) => {
  const ink = dark ? 'rgba(248, 246, 238, 0.55)' : 'rgba(46, 58, 47, 0.52)';
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>+ POLISAS SEMAMBU • {POLISAS_COORDS.LABEL_COORDS}</span>
        <span>BAB {chapterCode} — {chapterLabel}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>JPP POLISAS • EKOSISTEM DIGITAL MAHASISWA</span>
        <span>SESI 2026/2027 +</span>
      </div>
    </div>
  );
};

export const LightLeakOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();

  return (
    <Solid
      width={width}
      height={height}
      premountFor={fps}
      effects={[
        lightLeak({
          progress: interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }),
      ]}
    />
  );
};
